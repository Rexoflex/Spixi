/* ★★ P0 #1155 (session 5) — NO MESSAGE IS LOST WHEN A CHAT OPENS DURING CORE'S DELAYED WRITE.
 *
 * THE MECHANISM (verified in the tree, Ixian-Core @097341a):
 *  1. An arrival lands in Core's IN-MEMORY channel list and the excerpt at once (FriendList.addMessageWithType:
 *     `messages.Add` + `metaData.setLastMessage` + `saveMetaData`, FriendList.cs:325-345), but the list reaches disk
 *     LATER: `requestWriteMessages` only queues a request (LocalStorage.cs:638) and the storage thread writes it on its
 *     1 s tick once the request is ≥ 1 s old or idle ≥ 200 ms (LocalStorage.cs:168, :218-226) — up to ~2 s.
 *  2. Opening a chat calls `friend.getMessages(channel, window)` with window ≠ 100 (SingleChatPage.loadMessages, D-18
 *     #354), and that REPLACES the in-memory list with a disk read (Friend.cs:908-913, CORE-8). The unwritten arrival
 *     is dropped from the list; the writer later writes `friend.getMessages(channel)` = the NEW list → never on disk.
 *     Symptom (Damir 2026-10-03): 2 push messages → the chat shows msg 1, the excerpt shows msg 2, gone after reopen.
 *  3. A second Core path with the same end: a write request that arrives WHILE the writer writes that channel is
 *     removed with the old one (writePendingMessages copies the list, then `Remove(channel)` after the write,
 *     LocalStorage.cs:229-240) → the arrival stays memory-only until the next write of that channel, with no time
 *     bound. A time window alone cannot cover it — hence the DIRTY set below (no expiry). The writer holds `flushLock`
 *     for the whole write, so a request + flush issued during it is ALSO removed: every write below first DRAINS the
 *     running write (flush), then requests, then flushes (#46 r1 M1).
 *  4. (Core, same-second boundary, #46 r1 M-2) `receivedTimestamp` is whole SECONDS and `writeMessages` drops every
 *     on-disk row with ts >= the written list's first ts (LocalStorage.cs:694-695). A window whose first row shares a
 *     second with older rows (a push burst) deletes those older rows on its next write → trimSameSecondHead().
 *
 * THE GUARD (Spixi C# only, no Core change):
 *  - note()             — every message Spixi adds or updates (Node.addMessageWithType) marks (address, channel) DIRTY
 *                         (a generation number, so a note during a write keeps it dirty) and keeps it in a short
 *                         ledger (RECENT_MS).
 *  - beforeReread()     — before the replacing read, a DIRTY channel is drained + requested + flushed → the arrival is
 *                         ON DISK before the read. A clean channel costs nothing (no flush on the open path).
 *  - afterReread()      — the read REPLACED the list; any ledger message missing from it (landed in the orphaned list
 *                         DURING the read — CORE-8's race) is put back in receivedTimestamp order; an UPDATE noted in
 *                         the window replaces the stale disk copy by id. The channel is marked dirty + requested.
 *  - trimSameSecondHead() — (4): drop the head rows of a window that has older history so the first kept row is
 *                         strictly newer than every older row on disk.
 *  - afterPushBatch()   — after each push fetch and on low memory: every dirty channel, drained + requested + flushed.
 *  - recentAddresses()  — Node.onLowMemory does not free a chat with an arrival in the last RECENT_MS.
 *  - forgetMessage() / forgetAddress() / clear() — a local delete, a cleared history, a removed contact, a wipe.
 * Remaining (stated, only CORE-8 closes it): an arrival that fetched the OLD list before the read and adds to it AFTER
 * afterReread ran (µs); a low-memory free between Core's add and note() (µs, before the address is "recent"); a crash
 * within ~2 s of an arrival before any write; Core's own default reads (n = 100) at the same-second boundary (4); a head
 * run that growth cannot fit within 4 × want (a huge same-second push backlog — the trim then leaves the window as it
 * is); Core-only in-memory changes (remote reactions, read / received flags, Friend.cs:705/741/772/1038) undone by a
 * re-open within ~2 s (CORE-8; the Spixi-side ones — deletes, my reactions, "sent" — call markDirty).
 *
 * PURE: generic over the message type; Core is reached only through IMessageWriter (adapter: CoreMessageWriter.cs).
 * scripts/csh executes it (ArrivalGuardTests.cs) against a model of Core's cache + delayed writer + flushLock.
 */
using System;
using System.Collections.Generic;

namespace SPIXI
{
    /** The two Core calls the guard needs (LocalStorage.requestWriteMessages + LocalStorage.flush). */
    public interface IMessageWriter
    {
        void requestWrite(string address, int channel);
        void flush();
    }

    public sealed class ArrivalGuard<TMsg> where TMsg : class
    {
        /** Longer than Core's worst delayed write (~2 s) with margin; also the ledger's retention. */
        public const long RECENT_MS = 5000;
        /** Ledger cap per channel (a burst larger than this inside RECENT_MS keeps the newest). */
        public const int MAX_PER_CHANNEL = 64;

        private sealed class Entry
        {
            public TMsg msg = null!;
            public byte[] id = null!;
            public long atMs;
            public bool added;    // added in the window (may be missing from a re-read → put back)
            public bool edited;   // its content changed after it was written (a stale disk copy → replace by id)
        }

        private readonly object gate = new object();
        private readonly Func<TMsg, byte[]?> idOf;
        private readonly Func<TMsg, long> orderOf;
        private readonly Dictionary<string, Dictionary<int, List<Entry>>> ledger = new Dictionary<string, Dictionary<int, List<Entry>>>();
        private readonly Dictionary<string, long> lastArrivalMs = new Dictionary<string, long>();
        private readonly Dictionary<(string, int), long> dirty = new Dictionary<(string, int), long>();
        private long generation = 0;

        public ArrivalGuard(Func<TMsg, byte[]?> idOf, Func<TMsg, long> orderOf)
        {
            this.idOf = idOf;
            this.orderOf = orderOf;
        }

        /** A message was added (or updated, `isUpdate`) in Core's list for (address, channel). */
        public void note(string address, int channel, TMsg msg, long nowMs, bool isUpdate = false)
        {
            lock (gate)
            {
                dirty[(address, channel)] = ++generation;
                lastArrivalMs[address] = nowMs;
                byte[]? id = idOf(msg);
                if (id == null || id.Length == 0)
                {
                    return;
                }
                if (!ledger.TryGetValue(address, out var chans))
                {
                    chans = new Dictionary<int, List<Entry>>();
                    ledger[address] = chans;
                }
                if (!chans.TryGetValue(channel, out var list))
                {
                    list = new List<Entry>();
                    chans[channel] = list;
                }
                pruneLocked(list, nowMs);
                // An update of a message ADDED in the window keeps `added`: it may be missing from a re-read too.
                int idx = list.FindIndex(e => sameId(e.id, id));
                bool wasAdded = idx >= 0 && list[idx].added;
                if (idx >= 0)
                {
                    list.RemoveAt(idx);
                }
                list.Add(new Entry { msg = msg, id = id, atMs = nowMs, added = wasAdded || !isUpdate, edited = isUpdate });
                if (list.Count > MAX_PER_CHANNEL)
                {
                    list.RemoveRange(0, list.Count - MAX_PER_CHANNEL);
                }
            }
        }

        /** A local delete: never put this message back. */
        public void forgetMessage(string address, byte[] id)
        {
            lock (gate)
            {
                if (ledger.TryGetValue(address, out var chans))
                {
                    foreach (var list in chans.Values)
                    {
                        list.RemoveAll(e => sameId(e.id, id));
                    }
                }
            }
        }

        /** A cleared history / a removed contact: drop everything kept for this address. */
        public void forgetAddress(string address)
        {
            lock (gate)
            {
                ledger.Remove(address);
                lastArrivalMs.Remove(address);
                var keys = new List<(string, int)>();
                foreach (var k in dirty.Keys)
                {
                    if (k.Item1 == address)
                    {
                        keys.Add(k);
                    }
                }
                foreach (var k in keys)
                {
                    dirty.Remove(k);
                }
            }
        }

        /** The whole history wiped (Settings): drop everything. */
        public void clear()
        {
            lock (gate)
            {
                ledger.Clear();
                lastArrivalMs.Clear();
                dirty.Clear();
            }
        }

        public bool isRecent(string address, long nowMs)
        {
            lock (gate)
            {
                return lastArrivalMs.TryGetValue(address, out long at) && nowMs - at < RECENT_MS && nowMs >= at;
            }
        }

        /** Addresses with an arrival in the last RECENT_MS; older stamps are dropped here (bounded memory). */
        public List<string> recentAddresses(long nowMs)
        {
            lock (gate)
            {
                var r = new List<string>();
                var old = new List<string>();
                foreach (var kv in lastArrivalMs)
                {
                    if (nowMs - kv.Value < RECENT_MS && nowMs >= kv.Value)
                    {
                        r.Add(kv.Key);
                    }
                    else
                    {
                        old.Add(kv.Key);
                    }
                }
                foreach (var a in old)
                {
                    lastArrivalMs.Remove(a);
                }
                return r;
            }
        }

        public bool isDirty(string address, int channel)
        {
            lock (gate)
            {
                return dirty.ContainsKey((address, channel));
            }
        }

        /** Before a read that REPLACES the channel list: a DIRTY channel is written first, synchronously. */
        public void beforeReread(string address, int channel, IMessageWriter writer)
        {
            long gen;
            lock (gate)
            {
                if (!dirty.TryGetValue((address, channel), out gen))
                {
                    return;
                }
            }
            writeNow(new List<((string, int), long)> { ((address, channel), gen) }, writer);
        }

        /** After the replacing read: put back every recent arrival the new list lost. Returns how many changed. */
        public int afterReread(string address, int channel, List<TMsg> list, long nowMs, IMessageWriter writer)
        {
            List<Entry> keep;
            lock (gate)
            {
                if (!ledger.TryGetValue(address, out var chans) || !chans.TryGetValue(channel, out var entries))
                {
                    return 0;
                }
                pruneLocked(entries, nowMs);
                if (entries.Count == 0)
                {
                    chans.Remove(channel);
                    if (chans.Count == 0)
                    {
                        ledger.Remove(address);
                    }
                    return 0;
                }
                keep = new List<Entry>(entries);
            }
            int changed = 0;
            lock (list)
            {
                foreach (var e in keep)
                {
                    int found = -1;
                    for (int i = 0; i < list.Count; i++)
                    {
                        if (sameId(idOf(list[i]), e.id))
                        {
                            found = i;
                            break;
                        }
                    }
                    if (found >= 0)
                    {
                        if (e.edited && !ReferenceEquals(list[found], e.msg))
                        {
                            list[found] = e.msg;   // the live edited object, not the stale disk copy
                            changed++;
                        }
                        continue;
                    }
                    if (!e.added)
                    {
                        continue;   // an update of a message outside this window: nothing to put back
                    }
                    long order = orderOf(e.msg);
                    if (list.Count > 0 && order < orderOf(list[0]))
                    {
                        continue;   // #46 r2 M1: older than the window's head = outside the window, not lost to the race
                                    // (putting it back would undo trimSameSecondHead and let Core's write delete history)
                    }
                    int at = list.Count;
                    while (at > 0 && orderOf(list[at - 1]) > order)
                    {
                        at--;
                    }
                    list.Insert(at, e.msg);
                    changed++;
                }
            }
            if (changed > 0)
            {
                lock (gate)
                {
                    dirty[(address, channel)] = ++generation;
                }
                writer.requestWrite(address, channel);
            }
            return changed;
        }

        /** How many head rows share the first row's second (0 for an empty list). */
        public int sameSecondHeadRun(List<TMsg> list)
        {
            lock (list)
            {
                if (list.Count == 0)
                {
                    return 0;
                }
                long head = orderOf(list[0]);
                int n = 1;
                while (n < list.Count && orderOf(list[n]) == head)
                {
                    n++;
                }
                return n;
            }
        }

        /** A change that is not a new message (a delete blanks the row in place): the channel must be written before the
         *  next replacing read (#46 r3 m2 — a sender's delete followed by a quick open was undone by the read). */
        public void markDirty(string address, int channel)
        {
            lock (gate)
            {
                dirty[(address, channel)] = ++generation;
            }
        }

        /** (4) A window with older history on disk (`hasOlder`): drop the first row and every head row that shares its second,
         *  so the first kept row is strictly newer than every older row on disk. Drops at most `maxDrop` rows (the window's
         *  surplus over what the user asked for — a jump target or a wanted row is never cut); if the run is longer, nothing
         *  is dropped (Core's boundary hazard stays for that window, stated). Returns the rows dropped. */
        public int trimSameSecondHead(List<TMsg> list, bool hasOlder, int maxDrop)
        {
            if (!hasOlder || maxDrop < 1)
            {
                return 0;
            }
            lock (list)
            {
                if (list.Count < 2)
                {
                    return 0;
                }
                long head = orderOf(list[0]);
                int n = 1;
                while (n < list.Count && orderOf(list[n]) == head)
                {
                    n++;
                }
                if (n >= list.Count || n > maxDrop)
                {
                    return 0;
                }
                list.RemoveRange(0, n);
                return n;
            }
        }

        /** After a push fetch / on low memory: write every dirty channel now. */
        public void afterPushBatch(IMessageWriter writer)
        {
            List<((string, int), long)> all;
            lock (gate)
            {
                if (dirty.Count == 0)
                {
                    return;
                }
                all = new List<((string, int), long)>();
                foreach (var kv in dirty)
                {
                    all.Add((kv.Key, kv.Value));
                }
            }
            writeNow(all, writer);
        }

        /** Drain the running write (it may hold a copy WITHOUT the arrival and will remove any request made meanwhile),
         *  then request + flush. A key is cleared only if no note() came after the snapshot. */
        private void writeNow(List<((string, int) key, long gen)> snap, IMessageWriter writer)
        {
            writer.flush();
            foreach (var s in snap)
            {
                writer.requestWrite(s.key.Item1, s.key.Item2);
            }
            writer.flush();
            lock (gate)
            {
                foreach (var s in snap)
                {
                    if (dirty.TryGetValue(s.key, out long g) && g == s.gen)
                    {
                        dirty.Remove(s.key);
                    }
                }
            }
        }

        private static void pruneLocked(List<Entry> list, long nowMs)
        {
            list.RemoveAll(e => nowMs - e.atMs >= RECENT_MS || nowMs < e.atMs);
        }

        private static bool sameId(byte[]? a, byte[]? b)
        {
            if (a == null || b == null || a.Length != b.Length)
            {
                return false;
            }
            for (int i = 0; i < a.Length; i++)
            {
                if (a[i] != b[i])
                {
                    return false;
                }
            }
            return true;
        }
    }
}
