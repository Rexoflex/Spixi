using IXICore.Streaming;
using System.Collections.Generic;
using System.Linq;

namespace SPIXI
{
    /* ★★ #1102 — IMPLIED READ (1:1 only; session 1 part 1, DECISIONS #1101/#1102).
     *
     * Damir's screenshot (a chat with a legacy peer): read ticks on some of his messages and
     * "delivered" on the ones between them. The receiver sends ONE msgRead per message (queued with
     * retry, SingleChatPage.updateMessageReadStatus — #1101 corrected the prompt's "fire-and-forget"),
     * and the sender marks ONLY that one message (Core Friend.setMessageRead). The cause of the gaps
     * is not known; the rule below fixes the symptom for any cause: a peer who has read message X in
     * a 1:1 chat has opened the chat past every earlier message.
     *
     * THE RULE (pure, no I/O — Spixi-UnitTests/ImpliedReadTests.cs executes it): given the channel's
     * LOADED list (Core's cache — never a disk read here, Damir: "loaded window") and the id of an
     * OWN message X that a msgRead named, mark X and every message BEFORE it in the list that
     *   · is ours (localSender),
     *   · is not read yet,
     *   · did not fail to send (errorSending — it may never have arrived; honest),
     *   · has LEFT this device (sent or confirmed — #46 r1 A1: Core can send a later X while an earlier row waits in the
     *     pending queue; marking that row read would hide its later expiry, the delivery-lie class),
     *   · is a text or a file (the two kinds that show a tick) and is not a deleted tombstone (#907).
     * Returns the messages it changed, in list order (oldest first). X not in the list, or X not
     * ours → nothing changes. A message with no later receipt stays as it was ("delivered").
     *
     * GROUPS AND BOTS NEVER COME HERE: "seen" there is per member (#658,
     * UIHelpers.anyOtherMemberHasMessage) — the caller gates on appliesTo(friend). */
    public static class ImpliedRead
    {
        public static bool appliesTo(Friend friend)
        {
            return friend != null && friend.type == FriendType.Normal && !friend.bot;
        }

        public static bool qualifies(FriendMessage m)
        {
            return m != null
                && m.localSender
                && !m.read
                && !m.errorSending
                && (m.sent || m.confirmed)   // (#46 r1 A1) it LEFT this device — a row still in the pending queue may never have arrived
                && (m.type == FriendMessageType.standard || m.type == FriendMessageType.fileHeader)
                && !string.IsNullOrEmpty(m.message);
        }

        public static List<FriendMessage> markThrough(List<FriendMessage>? messages, byte[]? readId)
        {
            List<FriendMessage> changed = new List<FriendMessage>();
            if (messages == null || readId == null)
            {
                return changed;
            }
            lock (messages)
            {
                int idx = messages.FindIndex(m => m != null && m.id != null && m.id.SequenceEqual(readId));
                if (idx < 0 || !messages[idx].localSender)
                {
                    return changed;
                }
                for (int i = 0; i <= idx; i++)
                {
                    FriendMessage m = messages[i];
                    if (!qualifies(m))
                    {
                        continue;
                    }
                    m.sent = true;
                    m.confirmed = true;
                    m.read = true;
                    changed.Add(m);
                }
            }
            return changed;
        }
    }
}
