/* ★ 7b (#1223) — F9 HEAL: the chats-list excerpt shows a message the open chat does not.
 *
 * THE MECHANISM (Ixian-Core @097341a, read in the tree): an arrival is added to the in-memory list and its COPY is saved at
 * once as `metaData.lastMessage` (FriendList.cs:325 add, :343-344 setLastMessage + saveMetaData), but the list reaches disk
 * only through a delayed write request (:347). LocalStorage can drop that request while the same chat is being written
 * (LocalStorage.cs:229-240 — ArrivalGuard's case 3); the guard's catch-up runs on a chat re-open, a push batch or low memory
 * only. So the saved excerpt (HomePage reads metaData.lastMessage) can hold a message the next disk read does not.
 *
 * THE HEAL (SingleChatPage.loadMessages, after the re-read): when the saved last message is an INCOMING, non-reaction message
 * of the read channel, its id is NOT in the loaded list, and it is not older than the newest loaded row → the saved copy is
 * inserted in receivedTimestamp order and the channel is written. Never a duplicate id; never older than the window's end
 * (an older row is history outside the window, not a loss); never a reaction (CoreStreamProcessor.cs:1690 saves a SYNTHETIC
 * reaction "last message" whose id is the reacted message's).
 * ★ 7b #46 r1 (A-MINOR-1): a DELETED message is never healed back. Core's tombstone is the blanked text
 * (Friend.deleteMessage, Friend.cs:949-981, sets `message = ""`) → `eligible` refuses an empty excerpt; and a delete that
 * MISSED (the id only in metaData.lastMessage — the F9 state) leaves the full text there → the delete site replaces it
 * (`deleteLeftLast` + `newestLive`, CoreMessageWriter.clearDeletedLast).
 * PURE: generic over the message type; scripts/csh executes it (S7bRulesTests.cs). */
using System;
using System.Collections.Generic;

namespace SPIXI
{
    public static class ChatHeal
    {
        /** ★ 7b #46 r1 (C09): THE heal predicate on the saved last message's own fields — incoming (not localSender), not a
         *  synthetic reaction excerpt, not Core's delete tombstone (empty text), not a bot room (no ArrivalGuard there), the
         *  read channel. ⚠ an EMPTY call row (a missed call) is refused too: it is indistinguishable from a deleted one. */
        public static bool eligible(bool localSender, bool isReaction, string? text, bool bot, int lastChannel, int readChannel)
        {
            return !localSender && !isReaction && !string.IsNullOrEmpty(text) && !bot && lastChannel == readChannel;
        }

        /** The insert position for `last` in `list` (ordered by `orderOf`), or -1 = no heal. `list` is read under the caller's
         *  lock. `isEligible` = eligible(...) for `last`. */
        public static int healAt<T>(IList<T>? list, T? last, bool isEligible, Func<T, byte[]?> idOf, Func<T, long> orderOf) where T : class
        {
            if (list == null || last == null || !isEligible)
            {
                return -1;
            }
            byte[]? id = idOf(last);
            if (id == null || id.Length == 0)
            {
                return -1;
            }
            if (indexOfId(list, id, idOf) >= 0)
            {
                return -1;   // already loaded — never a duplicate
            }
            long order = orderOf(last);
            if (list.Count > 0 && order < orderOf(list[list.Count - 1]))
            {
                return -1;   // older than the newest loaded row: not the lost tail
            }
            int at = list.Count;
            while (at > 0 && orderOf(list[at - 1]) > order)
            {
                at--;
            }
            return at;
        }

        /** ★ 7b #46 r1 (A-MINOR-1): after a delete of `deletedId`, the saved last message still IS that message with its text
         *  (Core's delete missed it — the F9 state — or never looked at it) → the caller must replace it. A tombstone ("" —
         *  Core already blanked it) or another id → false. */
        public static bool deleteLeftLast(byte[]? lastId, string? lastText, byte[]? deletedId)
        {
            return lastId != null && deletedId != null && !string.IsNullOrEmpty(lastText) && sameId(lastId, deletedId);
        }

        /** The newest row (from the end) that `isLive` accepts and whose id is not `skipId`, or -1 (then the excerpt is cleared). */
        public static int newestLive<T>(IList<T>? list, Func<T, bool> isLive, Func<T, byte[]?> idOf, byte[]? skipId) where T : class
        {
            if (list == null)
            {
                return -1;
            }
            for (int i = list.Count - 1; i >= 0; i--)
            {
                T m = list[i];
                byte[]? id = idOf(m);
                if (skipId != null && id != null && sameId(id, skipId))
                {
                    continue;
                }
                if (isLive(m))
                {
                    return i;
                }
            }
            return -1;
        }

        private static bool sameId(byte[] a, byte[] b)
        {
            if (a.Length != b.Length)
            {
                return false;
            }
            for (int k = 0; k < a.Length; k++)
            {
                if (a[k] != b[k])
                {
                    return false;
                }
            }
            return true;
        }

        /** The position of the row with this id, or -1. */
        public static int indexOfId<T>(IList<T>? list, byte[]? id, Func<T, byte[]?> idOf) where T : class
        {
            if (list == null || id == null)
            {
                return -1;
            }
            for (int i = 0; i < list.Count; i++)
            {
                byte[]? x = idOf(list[i]);
                if (x != null && x.Length == id.Length)
                {
                    bool same = true;
                    for (int k = 0; k < x.Length; k++)
                    {
                        if (x[k] != id[k])
                        {
                            same = false;
                            break;
                        }
                    }
                    if (same)
                    {
                        return i;
                    }
                }
            }
            return -1;
        }
    }
}
