
using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using System;
using System.Collections.Generic;
using System.Linq;

namespace SPIXI.Network
{
    internal class SpixiPendingMessageProcessor : PendingMessageProcessor
    {
        public SpixiPendingMessageProcessor(string root_storage_path, bool enable_push_notification_server) : base(root_storage_path, enable_push_notification_server)
        {
        }

        /* ═══ ★★★ #650 — THE SINGLE CHECK, AND THIS TIME IT IS TRUE ═══════════════
         *
         * Damir, on device: *"i create a group, all group members go offline, i send a
         * message and it reads as clock instead of 1 check as i am online."*
         *
         * ★★ HE IS RIGHT, AND #649 WAS TOO PESSIMISTIC. That row concluded there is no
         * truthful "it left the device" signal, and removed the invented one. The first
         * half stands — but the conclusion was wrong, and this is the case that shows it:
         * `onMessageSent` is reached ONLY after `OfflinePushMessages.sendPushMessage`
         * RETURNS TRUE (PendingMessageProcessor). The push server has taken the message.
         * That is not a guess about the future, it is a fact about the past — the message
         * has left this device. It is exactly one check, honestly earned.
         *
         * ⚠ ONE EXCEPTION, found by the Session H review (auditor B MINOR-1) and it is
         * CORE's, not ours: `OfflinePushMessages.sendPushMessage` ALSO returns true on
         * its skip path — `FriendList.getFriend(msg.recipient) == null` returns true to
         * drop the queue entry WITHOUT posting (OfflinePushMessages.cs:59-61). Reachable
         * only after removeFriend left a message in the pending queue, i.e. a chat whose
         * row and history were just deleted, so nobody can see the false check — but the
         * sentence above is an invariant with one hole, and Core is frozen (BE row
         * CORE-7 in be-cutover). Do not build anything new on "returned true ⇒ posted".
         *
         * ⚠ It fires for the OFFLINE-recipient path only. When the peer is online the
         * direct relay reports nothing, so that case still walks clock → double check —
         * and it does not matter there, because the receipt is milliseconds behind.
         * Offline is the case where the clock used to sit visibly, which is Damir's report.
         *
         * ⚠ AND IN A GROUP THE PLAIN CALL WRITES NOWHERE. `sendGroupSpixiMessage` fans the
         * send out per MEMBER, so `friend` here is a member and its message list does not
         * hold the group message — `setMessageSent` silently finds nothing. Same defect
         * `markGroupCopyFailed` works around for expiry, same resolution. */
        protected override void onMessageSent(Friend friend, int channel, StreamMessage msg)
        {
            friend.setMessageSent(channel, msg.id);
            UIHelpers.shouldRefreshContacts = true;
            var fm = friend.getMessage(channel, msg.id);
            if (fm != null)
            {
                UIHelpers.updateMessage(friend, channel, fm);
            }
            markGroupCopySent(msg.id, channel);
        }

        /* ★★★ #650: land the flag on the GROUP's copy as well. One member's hand-off to the
         * push server is enough — the message is off this device either way, and that is
         * the whole claim a single check makes. Idempotent: `setMessageSent` no-ops when
         * `sent` is already true, so the later members' hand-offs cost nothing. */
        private static void markGroupCopySent(byte[] msgId, int channel)
        {
            forEachGroupHolding(msgId, channel, (f, ch, gm) =>
            {
                if (gm.sent)
                {
                    /* ⚠ NO LOG LINE HERE, and that is deliberate. Core fans the send out
                     * per MEMBER, so this arm runs once per member of the group after the
                     * first hand-off. A log line would print twenty times for one message.
                     * ★ ROUND 2 (review-cs MINOR-2): the old last sentence claimed the
                     * EXPIRY hook logs "because it runs once". That contradicted this
                     * file's own premise at the resolver header — Core keys the pending
                     * queue by RECIPIENT, so every hook in this class is handed a member
                     * and the expiry hook fans out per member too. Its two decline lines
                     * are now deduplicated by message id instead. */
                    return;
                }
                f.setMessageSent(ch, msgId);
                UIHelpers.shouldRefreshContacts = true;
                var fresh = f.getMessage(ch, msgId) ?? gm;
                UIHelpers.updateMessage(f, ch, fresh);
            });
        }

        /* The shared group resolver. Core keys the pending queue by RECIPIENT, and a group
         * send is fanned out per member, so every hook in this class is handed a member's
         * Friend. This finds the group that actually holds the id. Fail-soft; it only runs
         * on a hand-off or an expiry, never per message.
         *
         * ★★ IT NO LONGER TRUSTS THE CHANNEL ARGUMENT. The old walk tried ONE channel — the
         * one the hook was handed — and returned in silence when no group answered. Two
         * reasons that is not safe:
         *
         *  · CORE-4. `PendingMessageProcessor.cs:326` calls `onMessageExpired(friend, 0,
         *    pm.streamMessage)` with a HARDCODED 0, while the same class passes the real
         *    `channel` field to `onMessageSent` at `:504`. So the expiry hook is handed a
         *    zero that means nothing. Ixian-Core is frozen, so this is a BE row, and the
         *    work-around lives here.
         *  · A room on another channel. A private group is always channel 0 today
         *    (`GroupChat.CreateGroup` and `JoinGroup` both build the group with
         *    `default_channel = 0`), so the red retry state and the single check are NOT
         *    dead code today. A group that ever carries a non-zero `defaultChannel` — a
         *    BotInfo off the wire can — would lose both, in silence.
         *
         * ★★ AND THE NO-MATCH EXIT IS LOGGED. "The guard correctly declined" and "the
         * lookup never matched" used to look the same on a device: nothing at all. The
         * declines now log in markGroupCopyFailed, and the no-match logs here. The caller
         * also gets the channel the message was FOUND on, not the one it asked for.
         * ⚠ The log line carries no message content and no address. */
        private static void forEachGroupHolding(byte[] msgId, int channel, Action<Friend, int, FriendMessage> act)
        {
            if (msgId == null)
            {
                return;
            }
            try
            {
                List<Friend> snapshot;
                lock (FriendList.friends)
                {
                    snapshot = new List<Friend>(FriendList.friends);
                }
                int groups = 0;
                bool held_by_other = false;
                foreach (var f in snapshot)
                {
                    if (f == null || f.type != FriendType.Group)
                    {
                        continue;
                    }
                    groups++;
                    int ch = channel;
                    var gm = f.getMessage(ch, msgId);
                    if (gm == null)
                    {
                        // ONE HOME for this walk: StreamProcessor owns the resolver.
                        // Fully qualified: this file is in SPIXI.Network, the resolver is in SPIXI.
                        ch = SPIXI.StreamProcessor.resolveChannelForMessage(f, msgId, channel);
                        if (ch != channel)
                        {
                            gm = f.getMessage(ch, msgId);
                        }
                    }
                    if (gm == null)
                    {
                        continue;
                    }
                    if (!gm.localSender)
                    {
                        // A group holds this id, but somebody else sent it. Neither the
                        // single check nor the red state applies to a message we received.
                        held_by_other = true;
                        continue;
                    }
                    act(f, ch, gm);
                    return;
                }
                /* ⚠ READ THIS LINE WITH `groups`. Both hooks run for EVERY send, so a 1:1
                 * message reaches here as well and no group holds it. That is normal. In a
                 * group send it is the failure signal: the id was not found on any channel
                 * of any group, so neither the single check nor the red state can land.
                 * ★ ROUND 2 (review-cs MINOR-3): the line is GATED on `groups > 0`. It used
                 * to print for every 1:1 send and every bot-room hand-off, where by
                 * construction no group can hold the id — a signal that fires on the normal
                 * case as loudly as on the failure case is not a signal. An account with no
                 * group is now silent here.
                 * ⚠ RESIDUAL: an account that HAS a group still prints this line for a 1:1
                 * send. `friend` is a MEMBER on a group fan-out, so the hook cannot gate on
                 * `friend.type == FriendType.Group` — that would kill the group case, which
                 * is the only case the line exists for. Read the line with `groups`. */
                if (groups > 0)
                {
                    Logging.info("forEachGroupHolding: no group copy. channel={0} groups={1} heldByOther={2}",
                        channel, groups, held_by_other);
                }
            }
            catch (Exception ex)
            {
                Logging.warn("forEachGroupHolding: " + ex.Message);
            }
        }

        /* ⚠ CORE-4: `channel` here is a HARDCODED 0. `PendingMessageProcessor.cs:326`
         * calls `onMessageExpired(friend, 0, pm.streamMessage)`, while `PendingMessage`
         * carries a real `channel` field and `onMessageSent` is given it at `:504`. Core
         * is frozen, so nothing here can fix that at the source. The group work-around is
         * in forEachGroupHolding, which resolves the channel from the message id.
         * ★★ ROUND 2 (review-cs MAJOR-4) — THE PLAIN CALLS NO LONGER USE THE ARGUMENT.
         * A BOT ROOM is `FriendType.Normal`, so it never reaches forEachGroupHolding, and
         * it CAN store its messages on another channel (`botInfo.defaultChannel`, set from
         * a BotInfo off the wire; `SingleChatPage.xaml.cs:786` reads it into
         * `selectedChannel` and `:1033` stores with it). Damir's own bot room has THREE
         * channels. With the hardcoded 0, `setMessageError(0, id)` found no message and
         * wrote nothing, `getMessage(0, id)` returned null so no UI push was made, and the
         * bubble kept its clock for ever — `errorSending` is written in one place in
         * Ixian-Core and cleared NOWHERE, so a later reload cannot heal it either.
         * The resolver built in this same batch answers exactly this question, so it is
         * used here, where it is not inert.
         *
         * ⚠ FAIL-SOFT, BY THE RESOLVER'S OWN CONTRACT. `resolveMessageChannel`
         * (StreamProcessor.cs:1204) returns the fallback when no channel holds the id, so
         * a 1:1 chat — always channel 0 — keeps exactly today's answer. It cannot write to
         * a channel that does not hold the message; it only finds one that does.
         *
         * ⚠ `markGroupCopyFailed` is still handed the ARGUMENT, not `ch`. That walk starts
         * on a GROUP, and `ch` is a BOT ROOM's channel — a different room. The group walk
         * does its own resolve per group (`forEachGroupHolding`). */
        protected override void onMessageExpired(Friend friend, int channel, StreamMessage msg)
        {
            // ONE HOME for this walk: StreamProcessor owns the resolver.
            // Fully qualified: this file is in SPIXI.Network, the resolver is in SPIXI.
            int ch = SPIXI.StreamProcessor.resolveChannelForMessage(friend, msg.id, channel);
            removeMessage(friend, msg.id);
            friend.setMessageError(ch, msg.id);
            UIHelpers.shouldRefreshContacts = true;
            var fm = friend.getMessage(ch, msg.id);
            if (fm != null)
            {
                UIHelpers.updateMessage(friend, ch, fm);
            }
            markGroupCopyFailed(msg.id, channel);
        }

        /* ★ ROUND 2 (review-cs MINOR-2) — ONE DECLINE LINE PER MESSAGE, NOT ONE PER
         * MEMBER. `onMessageExpired` is handed a MEMBER's Friend on a group fan-out, so
         * `markGroupCopyFailed` runs once per member and its two decline lines printed
         * once per member as well. A room near the 500-member cap made 500 info lines for
         * ONE expired message, in the rolling device log this batch relies on.
         *
         * The members of one fan-out arrive together, so remembering the LAST id logged is
         * enough to collapse the burst. It is a log gate and nothing else: a false answer
         * costs one missing or one repeated line, never a state change.
         * ⚠ CLASS LEVEL, both of them. A member declared inside a method body is the
         * defect that broke the build last session. */
        private static byte[]? lastDeclineLogId = null;
        private static readonly object declineLogLock = new object();

        private static bool shouldLogDecline(byte[] msgId)
        {
            if (msgId == null)
            {
                return false;
            }
            lock (declineLogLock)
            {
                if (lastDeclineLogId != null && lastDeclineLogId.SequenceEqual(msgId))
                {
                    return false;
                }
                lastDeclineLogId = msgId;
                return true;
            }
        }

        /* ═══ ★★ L2 (#641/#647) — THE RED RETRY STATE, FOR A GROUP ═════════════════
         * Marked failed ONLY when nothing at all says somebody has the message. */
        private static void markGroupCopyFailed(byte[] msgId, int channel)
        {
            forEachGroupHolding(msgId, channel, (f, ch, gm) =>
            {
                if (gm.confirmed)
                {
                    if (shouldLogDecline(msgId))
                    {
                        Logging.info("markGroupCopyFailed: the group copy is confirmed. It is not failed.");
                    }
                    return;
                }
                /* ★★ #647 round 4 — ONE HOME. This site asks the same method the bubble
                 * tick and the chats row ask: UIHelpers.anyOtherMemberHasMessage. Do not
                 * spell the rule out here. Do not add a reaction key here. Any reaction
                 * from any address that is not the local user is evidence.
                 *
                 * ⚠⚠ THIS SITE PASSES `true` AS THE UNREADABLE ANSWER, AND THE OTHER TWO
                 * PASS `false`. The asymmetry is deliberate; keep it. A false red FAILED
                 * is UNRECOVERABLE, because `errorSending` is written in one place in
                 * Ixian-Core and is cleared NOWHERE. A missed double check on a bubble
                 * corrects itself at the next reaction. Do not "unify" the two
                 * directions.
                 *
                 * ⚠ Only a GROUP reaches this callback. `forEachGroupHolding` skips every
                 * friend whose type is not FriendType.Group, so a 1:1 chat and a bot room
                 * keep exactly the behaviour they had. */
                bool anyEvidence = UIHelpers.anyOtherMemberHasMessage(f, gm, true);
                if (anyEvidence)
                {
                    if (shouldLogDecline(msgId))
                    {
                        Logging.info("markGroupCopyFailed: a member has the message. It is not failed.");
                    }
                    return;
                }
                f.setMessageError(ch, msgId);
                UIHelpers.shouldRefreshContacts = true;
                var fresh = f.getMessage(ch, msgId) ?? gm;
                UIHelpers.updateMessage(f, ch, fresh);
            });
        }
    }
}
