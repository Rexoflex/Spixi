/* ★★ P0 #1155 — the Core side of ArrivalGuard (Spixi/Utils/ArrivalGuard.cs): the ONE guard instance and the adapter to
 * Core's LocalStorage. Kept out of the pure file so scripts/csh can execute the guard against a model of Core.
 * Both calls are Core's own public API (LocalStorage.cs:638 requestWriteMessages, :177 flush); no Core change. */
using System;
using System.Collections.Generic;
using IXICore;
using IXICore.Meta;
using IXICore.Streaming;

namespace SPIXI
{
    public sealed class CoreMessageWriter : IMessageWriter
    {
        public static readonly CoreMessageWriter instance = new CoreMessageWriter();

        /** Every message Spixi adds goes through Node.addMessageWithType → note() here. */
        public static readonly ArrivalGuard<FriendMessage> arrivals =
            new ArrivalGuard<FriendMessage>(m => m.id, m => m.receivedTimestamp);

        /** ★ 7b (#1223 (a)): the app goes to the BACKGROUND (Android OnPause, App.OnSleep) — every dirty channel (an arrival
         *  or a change ArrivalGuard knows is not on disk yet) is drained + requested + flushed (afterPushBatch → writeNow)
         *  BEFORE the caller's plain flush, which writes only requests that still exist. Never throws. */
        public static void writeArrivalsNow()
        {
            try
            {
                arrivals.afterPushBatch(instance);
            }
            catch (Exception e)
            {
                Logging.warn("[P0] background write skipped: " + e.GetType().Name);
            }
        }

        /** ★ 7b (#1223) F9 heal (ChatHeal.cs): put the saved last message's COPY back into the re-read `list` when
         *  ChatHeal.healAt allows it — in Core's storage order (receivedTimestamp, the guard's own order). Returns the
         *  position, or -1 (nothing changed). The caller writes the channel. */
        public static int healLast(List<FriendMessage> list, FriendMessage last, int lastChannel, int readChannel, bool bot)
        {
            lock (list)
            {
                // ★ 7b #46 r1 (C09): the whole predicate is ChatHeal.eligible (executed in scripts/csh)
                bool eligible = ChatHeal.eligible(last.localSender, last.type == FriendMessageType.reaction, last.message, bot, lastChannel, readChannel);
                int at = ChatHeal.healAt(list, last, eligible, m => m.id, m => m.receivedTimestamp);
                if (at >= 0)
                {
                    list.Insert(at, new FriendMessage(last.getBytes()));   // a copy: the metadata object stays its own
                }
                return at;
            }
        }

        /** ★ 7b #46 r1 (A-MINOR-1): call after EVERY friend.deleteMessage. Core's delete recomputes metaData.lastMessage only
         *  when it finds the row (Friend.cs:958-975); in the F9 state the row exists only as that saved excerpt, so the excerpt
         *  kept the deleted text and the next loadMessages healed it back. → replace it with the newest live row of its
         *  channel (Core's own predicate, Friend.cs:966-967), or clear it, and save. Returns true when it changed. Never throws. */
        public static bool clearDeletedLast(Friend friend, byte[] msgId)
        {
            try
            {
                FriendMessage? last = friend.metaData.lastMessage;
                if (last == null || !ChatHeal.deleteLeftLast(last.id, last.message, msgId))
                {
                    return false;
                }
                int ch = friend.metaData.lastMessageChannel;
                FriendMessage? next = null;
                List<FriendMessage>? list = friend.getMessages(ch);
                if (list != null)
                {
                    lock (list)
                    {
                        int at = ChatHeal.newestLive(list, m => m.type != FriendMessageType.standard || !string.IsNullOrEmpty(m.message), m => m.id, msgId);
                        next = at >= 0 ? list[at] : null;
                    }
                }
                friend.metaData.setLastMessage(next, ch);
                friend.saveMetaData();
                P1Perf.line("chat heal cleared-last=1");
                return true;
            }
            catch (Exception e)
            {
                Logging.warn("clear deleted last skipped (" + e.GetType().Name + ")");
                return false;
            }
        }

        public static long nowMs()
        {
            return Environment.TickCount64;
        }

        public void requestWrite(string address, int channel)
        {
            try
            {
                IxianHandler.localStorage?.requestWriteMessages(new Address(address), channel);
            }
            catch (Exception e)
            {
                // Core throws when storage is not running (stopping / wiped) — nothing to keep then.
                Logging.warn("[P0] write request skipped: " + e.GetType().Name);
            }
        }

        public void flush()
        {
            IxianHandler.localStorage?.flush();
        }
    }
}
