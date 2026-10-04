/* ★★ P0 #1155 — the Core side of ArrivalGuard (Spixi/Utils/ArrivalGuard.cs): the ONE guard instance and the adapter to
 * Core's LocalStorage. Kept out of the pure file so scripts/csh can execute the guard against a model of Core.
 * Both calls are Core's own public API (LocalStorage.cs:638 requestWriteMessages, :177 flush); no Core change. */
using System;
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
