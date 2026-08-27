
using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using System;
using System.Collections.Generic;

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
            forEachGroupHolding(msgId, channel, (f, gm) =>
            {
                if (gm.sent)
                {
                    return;
                }
                f.setMessageSent(channel, msgId);
                UIHelpers.shouldRefreshContacts = true;
                var fresh = f.getMessage(channel, msgId) ?? gm;
                UIHelpers.updateMessage(f, channel, fresh);
            });
        }

        /* The shared group resolver. Core keys the pending queue by RECIPIENT, and a group
         * send is fanned out per member, so every hook in this class is handed a member's
         * Friend. This finds the group that actually holds the id. Fail-soft; it only runs
         * on a hand-off or an expiry, never per message. */
        private static void forEachGroupHolding(byte[] msgId, int channel, Action<Friend, FriendMessage> act)
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
                foreach (var f in snapshot)
                {
                    if (f == null || f.type != FriendType.Group)
                    {
                        continue;
                    }
                    var gm = f.getMessage(channel, msgId);
                    if (gm == null || !gm.localSender)
                    {
                        continue;
                    }
                    act(f, gm);
                    return;
                }
            }
            catch (Exception ex)
            {
                Logging.warn("forEachGroupHolding: " + ex.Message);
            }
        }

        protected override void onMessageExpired(Friend friend, int channel, StreamMessage msg)
        {
            removeMessage(friend, msg.id);
            friend.setMessageError(channel, msg.id);
            UIHelpers.shouldRefreshContacts = true;
            var fm = friend.getMessage(channel, msg.id);
            if (fm != null)
            {
                UIHelpers.updateMessage(friend, channel, fm);
            }
            markGroupCopyFailed(msg.id, channel);
        }

        /* ═══ ★★ L2 (#641/#647) — THE RED RETRY STATE, FOR A GROUP ═════════════════
         * Marked failed ONLY when nothing at all says somebody has the message. */
        private static void markGroupCopyFailed(byte[] msgId, int channel)
        {
            forEachGroupHolding(msgId, channel, (f, gm) =>
            {
                if (gm.confirmed)
                {
                    return;
                }
                /* ⚠ `received` OR `seen`, and it fails SAFE. Those are two INDEPENDENT
                 * stream messages, so a member can read a message whose delivery receipt
                 * was lost — testing delivery alone would paint a permanent red FAILED on
                 * a message somebody had told us they READ. Permanent, because
                 * `errorSending` is written in one place in Ixian-Core and cleared NOWHERE. */
                bool anyEvidence;
                try
                {
                    lock (gm.reactions)
                    {
                        anyEvidence =
                            (gm.reactions.ContainsKey("received") && gm.reactions["received"].Count > 0)
                            || (gm.reactions.ContainsKey("seen") && gm.reactions["seen"].Count > 0);
                    }
                }
                catch (Exception)
                {
                    anyEvidence = true;   // unreadable reactions → do NOT paint it failed
                }
                if (anyEvidence)
                {
                    return;
                }
                f.setMessageError(channel, msgId);
                UIHelpers.shouldRefreshContacts = true;
                var fresh = f.getMessage(channel, msgId) ?? gm;
                UIHelpers.updateMessage(f, channel, fresh);
            });
        }
    }
}
