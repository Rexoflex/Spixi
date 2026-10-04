// ★★ P0 #1155 (session 5) — ArrivalGuard (Spixi/Utils/ArrivalGuard.cs), EXECUTED against CoreModel: a model of the three
// Core behaviours the loss needs, each cited to Ixian-Core @097341a —
//   (a) the channel cache: getMessages(ch, n) re-reads disk and REPLACES the list when uncached or n != 100 (Friend.cs:908-913)
//   (b) an arrival: getMessages(ch) → lock(list) + Add → requestWriteMessages (FriendList.cs:325-348)
//   (c) the delayed writer: copies friend.getMessages(ch) = the CURRENT list, writes it, then REMOVES the request — a request
//       made during the write is removed with it (LocalStorage.cs:191-245)
// The call sequence is the one SingleChatPage.loadMessages / Node / SPushService make (pinned in scripts/pins-s5/p0.mjs).
// `useGuard = false` is the deliberate break: the same sequences without the guard must LOSE the message.
using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

public sealed class GMsg
{
    public byte[] id; public long ts; public string text;
    public GMsg(int n, long ts) { id = BitConverter.GetBytes(n); this.ts = ts; text = "m" + n; }
    public int n => BitConverter.ToInt32(id, 0);
    public GMsg Clone() => new GMsg(n, ts) { text = text };   // disk holds COPIES, as a file does
}

/** Core's cache + disk + delayed writer for ONE contact, many channels. */
public sealed class CoreModel : IMessageWriter
{
    public const string A = "ADDR";
    public readonly Dictionary<int, List<GMsg>> cache = new Dictionary<int, List<GMsg>>();
    public readonly Dictionary<int, List<GMsg>> disk = new Dictionary<int, List<GMsg>>();
    public readonly HashSet<int> requests = new HashSet<int>();
    public Action<int>? duringWrite;      // fires between the writer's copy and its Remove (c)
    public Action? duringRead;            // fires inside a replacing read, after the disk read, before the swap (a)
    public int flushes, writes;

    List<GMsg> diskOf(int ch) { if (!disk.TryGetValue(ch, out var d)) { d = new List<GMsg>(); disk[ch] = d; } return d; }
    public List<GMsg> getMessages(int ch, int n = 100)
    {
        if (!cache.ContainsKey(ch) || n != 100)
        {
            var read = diskOf(ch).OrderBy(m => m.ts).Select(m => m.Clone()).ToList();
            if (read.Count > n) read = read.Skip(read.Count - n).ToList();
            duringRead?.Invoke();
            cache[ch] = read;
        }
        return cache[ch];
    }
    public void arrive(GMsg m, int ch, ArrivalGuard<GMsg>? g, long now)
    {
        var list = getMessages(ch);
        lock (list) { list.Add(m); }
        requests.Add(ch);
        g?.note(A, ch, m, now);
    }
    /** FriendList's stream-update path: the message object is changed IN PLACE in whatever list holds it (updated=true). */
    public void update(int ch, int n, string text, ArrivalGuard<GMsg>? g, long now)
    {
        var m = getMessages(ch).FirstOrDefault(x => x.n == n);
        if (m == null) return;
        m.text = text; requests.Add(ch);
        g?.note(A, ch, m, now, isUpdate: true);
    }
    public string diskText(int ch, int n) => diskOf(ch).FirstOrDefault(m => m.n == n)?.text ?? "";
    // flushLock (c): the writer holds it for the whole write of a channel, so a flush() called WHILE a write runs first
    // waits for that write to finish — including its Remove(channel) of every request made meanwhile.
    Action? finishRunning;
    public void writerPass()
    {
        foreach (int ch in requests.ToList())
        {
            if (!requests.Contains(ch)) continue;
            var copy = getMessages(ch).OrderBy(m => m.ts).ToList();
            bool done = false;
            finishRunning = () =>
            {
                if (done) return; done = true;
                var d = diskOf(ch);
                if (copy.Count > 0) { long first = copy[0].ts; d.RemoveAll(x => x.ts >= first); d.AddRange(copy.Select(m => m.Clone())); }   // LocalStorage.cs:694-695
                writes++;
                requests.Remove(ch);
            };
            duringWrite?.Invoke(ch);
            var f = finishRunning; finishRunning = null; f?.Invoke();
        }
    }
    public void freeMemory() { cache.Clear(); }
    public bool onDisk(int ch, int n) => diskOf(ch).Any(m => m.n == n);
    public bool inCache(int ch, int n) => cache.TryGetValue(ch, out var l) && l.Any(m => m.n == n);
    public void deleteMessage(int ch, int n) { getMessages(ch).RemoveAll(m => m.n == n); requests.Add(ch); }
    // IMessageWriter
    public void requestWrite(string address, int channel) { requests.Add(channel); }
    public void flush() { var f = finishRunning; finishRunning = null; f?.Invoke(); flushes++; writerPass(); }
}

[TestClass]
public class ArrivalGuardTests
{
    static ArrivalGuard<GMsg> G() => new ArrivalGuard<GMsg>(m => m.id, m => m.ts);
    const int CH = 0;

    // The repro of Damir's case (#1155): history on disk → 2 push messages → the chat opens before Core's delayed write.
    static (CoreModel core, bool shown2, bool disk2) damirCase(bool useGuard)
    {
        var core = new CoreModel(); var g = useGuard ? G() : null;
        long t = 1000;
        for (int i = 1; i <= 3; i++) core.arrive(new GMsg(i, t++), CH, g, t);
        core.writerPass();
        core.arrive(new GMsg(4, t++), CH, g, t);   // msg 1
        core.arrive(new GMsg(5, t++), CH, g, t);   // msg 2
        // tap the notification → loadMessages
        if (g != null) g.beforeReread(CoreModel.A, CH, core);
        var shown = core.getMessages(CH, 51);
        if (g != null) g.afterReread(CoreModel.A, CH, shown, t, core);
        bool s2 = shown.Any(m => m.n == 5);
        core.writerPass();                           // Core's delayed write runs
        core.freeMemory();                           // reopen later from disk
        return (core, s2, core.onDisk(CH, 5));
    }

    [TestMethod]
    public void BREAK_without_the_guard_the_open_loses_the_unwritten_message()
    {
        var (_, shown2, disk2) = damirCase(false);
        Assert.IsFalse(shown2, "the replacing read drops the unwritten arrival from the shown list");
        Assert.IsFalse(disk2, "…and the writer then writes the NEW list → never on disk (the #1155 symptom)");
    }

    [TestMethod]
    public void with_the_guard_the_open_shows_and_keeps_both_messages()
    {
        var (core, shown2, disk2) = damirCase(true);
        Assert.IsTrue(shown2, "shown on open");
        Assert.IsTrue(disk2, "on disk after reopen");
        Assert.IsTrue(core.onDisk(CH, 4), "msg 1 too");
    }

    [TestMethod]
    public void a_write_request_core_dropped_during_a_write_is_still_covered_long_after()
    {
        foreach (bool useGuard in new[] { false, true })
        {
            var core = new CoreModel(); var g = useGuard ? G() : null;
            core.arrive(new GMsg(1, 1), CH, g, 1);
            bool once = false;
            core.duringWrite = ch => { if (!once) { once = true; core.arrive(new GMsg(2, 2), CH, g, 2); } };   // (c)
            core.writerPass();
            core.duringWrite = null;
            Assert.IsFalse(core.requests.Contains(CH), "Core removed msg 2's request with the old one (the model is faithful)");
            long later = 2 + 60_000;   // a minute later: far outside RECENT_MS
            if (g != null) g.beforeReread(CoreModel.A, CH, core);
            var shown = core.getMessages(CH, 51);
            if (g != null) g.afterReread(CoreModel.A, CH, shown, later, core);
            core.writerPass(); core.freeMemory();
            Assert.AreEqual(useGuard, core.onDisk(CH, 2), useGuard ? "guard: the DIRTY mark has no expiry → written before the read" : "BREAK: lost without the guard");
        }
    }

    [TestMethod]
    public void an_arrival_during_the_read_lands_in_the_orphaned_list_and_is_put_back_in_order()
    {
        foreach (bool useGuard in new[] { false, true })
        {
            var core = new CoreModel(); var g = useGuard ? G() : null;
            core.arrive(new GMsg(1, 10), CH, g, 10); core.writerPass();
            core.arrive(new GMsg(2, 20), CH, g, 20);
            if (g != null) g.beforeReread(CoreModel.A, CH, core);
            core.duringRead = () => { core.duringRead = null; core.arrive(new GMsg(3, 30), CH, g, 30); };   // CORE-8's race
            var shown = core.getMessages(CH, 51);
            int back = g != null ? g.afterReread(CoreModel.A, CH, shown, 31, core) : 0;
            core.writerPass(); core.freeMemory();
            if (useGuard)
            {
                Assert.AreEqual(1, back, "one message put back");
                Assert.IsTrue(core.onDisk(CH, 3) && core.onDisk(CH, 2), "both on disk");
                Assert.IsTrue(string.Join(",", shown.Select(m => m.n)) == "1,2,3", "in receivedTimestamp order: " + string.Join(",", shown.Select(m => m.n)));
            }
            else
            {
                Assert.IsFalse(core.onDisk(CH, 3), "BREAK: lost without the guard");
            }
        }
    }

    [TestMethod]
    public void a_put_back_message_goes_BEFORE_a_newer_one_that_reached_the_new_list()
    {
        var core = new CoreModel(); var g = G();
        core.arrive(new GMsg(1, 10), CH, g, 10); core.writerPass();
        g.beforeReread(CoreModel.A, CH, core);
        core.duringRead = () => { core.duringRead = null; core.arrive(new GMsg(2, 20), CH, g, 20); };   // lands in the orphan
        var shown = core.getMessages(CH, 51);
        core.arrive(new GMsg(3, 30), CH, g, 30);                                                         // lands in the new list
        Assert.AreEqual(1, g.afterReread(CoreModel.A, CH, shown, 31, core), "one put back");
        Assert.IsTrue(string.Join(",", shown.Select(m => m.n)) == "1,2,3", "receivedTimestamp order, not appended: " + string.Join(",", shown.Select(m => m.n)));
    }

    [TestMethod]
    public void a_message_already_in_the_new_list_is_never_duplicated()
    {
        var core = new CoreModel(); var g = G();
        core.arrive(new GMsg(1, 10), CH, g, 10);
        g.beforeReread(CoreModel.A, CH, core);
        var shown = core.getMessages(CH, 51);
        Assert.AreEqual(0, g.afterReread(CoreModel.A, CH, shown, 11, core), "nothing put back");
        Assert.AreEqual(1, shown.Count(m => m.n == 1), "one copy");
    }

    [TestMethod]
    public void a_deleted_or_cleared_message_is_never_put_back()
    {
        var core = new CoreModel(); var g = G();
        core.arrive(new GMsg(1, 10), CH, g, 10);
        core.arrive(new GMsg(2, 11), CH, g, 11);
        g.forgetMessage(CoreModel.A, BitConverter.GetBytes(2)); core.deleteMessage(CH, 2);
        g.beforeReread(CoreModel.A, CH, core);
        var shown = core.getMessages(CH, 51);
        Assert.AreEqual(0, g.afterReread(CoreModel.A, CH, shown, 12, core), "the deleted message stays deleted");
        Assert.IsFalse(shown.Any(m => m.n == 2), "not shown");
        core.arrive(new GMsg(3, 13), CH, g, 13);
        g.forgetAddress(CoreModel.A);
        Assert.IsFalse(g.isDirty(CoreModel.A, CH) || g.isRecent(CoreModel.A, 13), "forgetAddress clears the dirty mark and the recent stamp");
        core.cache[CH] = new List<GMsg>();   // a cleared history
        Assert.AreEqual(0, g.afterReread(CoreModel.A, CH, core.cache[CH], 14, core), "a cleared chat gets nothing put back");
        core.arrive(new GMsg(4, 15), CH, g, 15); g.clear();
        Assert.IsFalse(g.isDirty(CoreModel.A, CH) || g.isRecent(CoreModel.A, 15), "clear() drops everything");
    }

    [TestMethod]
    public void an_update_marks_the_channel_dirty_but_keeps_no_ledger_entry()
    {
        var g = G(); var core = new CoreModel();
        g.note(CoreModel.A, CH, new GMsg(9, 5), 5, isUpdate: true);
        Assert.IsTrue(g.isDirty(CoreModel.A, CH), "dirty");
        var empty = new List<GMsg>();
        Assert.AreEqual(0, g.afterReread(CoreModel.A, CH, empty, 6, core), "an update is never inserted (it exists by id)");
    }

    [TestMethod]
    public void recent_window_ledger_prune_and_cap()
    {
        var g = G(); var core = new CoreModel();
        g.note(CoreModel.A, CH, new GMsg(1, 1), 1000);
        Assert.IsTrue(g.isRecent(CoreModel.A, 1000 + ArrivalGuard<GMsg>.RECENT_MS - 1), "recent just inside the window");
        Assert.IsFalse(g.isRecent(CoreModel.A, 1000 + ArrivalGuard<GMsg>.RECENT_MS), "not recent at the window edge");
        Assert.IsTrue(g.recentAddresses(1001).SequenceEqual(new[] { CoreModel.A }) && g.recentAddresses(1000 + ArrivalGuard<GMsg>.RECENT_MS).Count == 0, "recentAddresses follows the same window");
        Assert.AreEqual(0, g.afterReread(CoreModel.A, CH, new List<GMsg>(), 1000 + ArrivalGuard<GMsg>.RECENT_MS, core), "an entry older than the window is pruned, not put back");
        for (int i = 0; i < ArrivalGuard<GMsg>.MAX_PER_CHANNEL + 10; i++) g.note(CoreModel.A, CH, new GMsg(100 + i, 100 + i), 2000);
        var l = new List<GMsg>();
        Assert.AreEqual(ArrivalGuard<GMsg>.MAX_PER_CHANNEL, g.afterReread(CoreModel.A, CH, l, 2001, core), "the ledger keeps at most MAX_PER_CHANNEL");
        Assert.IsTrue(l[0].n == 110 && l[l.Count - 1].n == 100 + ArrivalGuard<GMsg>.MAX_PER_CHANNEL + 9, "…the NEWEST ones");
    }

    [TestMethod]
    public void push_batch_writes_every_dirty_channel_and_skips_when_clean()
    {
        var g = G(); var core = new CoreModel();
        g.afterPushBatch(core);
        Assert.AreEqual(0, core.flushes, "nothing dirty → no flush");
        core.arrive(new GMsg(1, 1), 0, g, 1); core.arrive(new GMsg(2, 2), 7, g, 2);
        core.requests.Clear();   // as if Core dropped both requests (c)
        g.afterPushBatch(core);
        Assert.IsTrue(core.onDisk(0, 1) && core.onDisk(7, 2), "both channels written");
        Assert.IsFalse(g.isDirty(CoreModel.A, 0) || g.isDirty(CoreModel.A, 7), "dirty cleared");
    }

    [TestMethod]
    public void beforeReread_costs_nothing_on_a_clean_channel_and_writes_a_dirty_one()
    {
        var g = G(); var core = new CoreModel();
        g.beforeReread(CoreModel.A, CH, core);
        Assert.IsTrue(core.flushes == 0 && core.writes == 0, "clean: no flush on the open path (#46 r1 m1)");
        core.arrive(new GMsg(1, 1), CH, g, 1); core.requests.Clear();
        g.beforeReread(CoreModel.A, CH, core);
        Assert.IsTrue(core.onDisk(CH, 1) && !g.isDirty(CoreModel.A, CH), "dirty: requested, written, cleared");
    }

    // #46 r1 M1 (auditors A + B): the push batch's write lands WHILE Core's writer is mid-write of that channel. The writer
    // holds flushLock, so the batch's flush waits; the writer then removes the batch's request with its own. Then the user
    // opens the chat AFTER the ledger expired.
    [TestMethod]
    public void M1_push_batch_during_a_running_write_then_a_late_open_keeps_the_message()
    {
        var core = new CoreModel(); var g = G();
        core.arrive(new GMsg(1, 10), CH, g, 10);
        bool once = false;
        core.duringWrite = ch =>
        {
            if (once) return; once = true;
            core.arrive(new GMsg(2, 11), CH, g, 11);   // msg 2 lands after the writer's copy
            g.afterPushBatch(core);                   // the node loop / push service, blocked behind flushLock in reality
        };
        core.writerPass();
        core.duringWrite = null;
        long late = 11 + ArrivalGuard<GMsg>.RECENT_MS + 1000;
        g.beforeReread(CoreModel.A, CH, core);
        var shown = core.getMessages(CH, 51);
        g.afterReread(CoreModel.A, CH, shown, late, core);
        core.writerPass(); core.freeMemory();
        Assert.IsTrue(core.onDisk(CH, 2), "msg 2 on disk (drain → request → flush)");
    }

    // A note that lands DURING the guard's own write (after its snapshot) keeps the channel dirty (the generation number).
    [TestMethod]
    public void an_arrival_during_the_guards_own_write_stays_dirty()
    {
        var core = new CoreModel(); var g = G();
        core.arrive(new GMsg(1, 10), CH, g, 10);
        bool once = false;
        core.duringWrite = ch => { if (once) return; once = true; core.arrive(new GMsg(2, 11), CH, g, 11); };
        g.afterPushBatch(core);
        core.duringWrite = null;
        Assert.IsTrue(g.isDirty(CoreModel.A, CH), "msg 2 came after the snapshot → still dirty");
        long late = 11 + ArrivalGuard<GMsg>.RECENT_MS + 1000;
        g.beforeReread(CoreModel.A, CH, core);
        var shown = core.getMessages(CH, 51);
        g.afterReread(CoreModel.A, CH, shown, late, core);
        core.writerPass(); core.freeMemory();
        Assert.IsTrue(core.onDisk(CH, 2), "msg 2 on disk after a late open");
    }

    // #46 r3 M-1: the PRODUCTION numbers. SingleChatPage.loadMessages' loop, mirrored line for line (its C# shape is pinned
    // in pins-s5/p0.mjs): window = want + 1; stop when exhausted or (visible > want AND the head's same-second run fits the
    // visible surplus); a head inside a longer burst grows the window by the run. Then trim with maxDrop = visible - want.
    static List<GMsg> loadWindow(CoreModel core, ArrivalGuard<GMsg> g, int want, bool grow)
    {
        int window = want + 1; bool exhausted = false; List<GMsg> messages = null!;
        for (int pass = 0; pass < 8; pass++)
        {
            if (window == 100) window++;
            messages = core.getMessages(CH, window);
            if (messages.Count == 0) break;
            int visibleNow = messages.Count; exhausted = messages.Count < window;
            int headRun = g.sameSecondHeadRun(messages);
            if (exhausted || (visibleNow > want && (!grow || headRun <= visibleNow - want || window > 4 * want))) break;
            window = visibleNow > want ? window + headRun : Math.Max(window * 2, window + (want + 1 - visibleNow));
        }
        g.trimSameSecondHead(messages, !exhausted, messages.Count - want);
        return messages;
    }

    [TestMethod]
    public void r3_a_burst_across_the_window_boundary_never_loses_history_with_the_real_window()
    {
        foreach (bool grow in new[] { false, true })
        {
            var core = new CoreModel(); var g = G();
            for (int i = 1; i <= 5; i++) core.arrive(new GMsg(i, 100), CH, g, i);   // one push burst = one second
            core.arrive(new GMsg(6, 101), CH, g, 6); core.arrive(new GMsg(7, 102), CH, g, 7);
            core.writerPass();
            var shown = loadWindow(core, g, 4, grow);                                 // want 4 → window 5 = 3,4,5,6,7
            Assert.IsTrue(shown.Count >= 4 && shown.Skip(shown.Count - 4).Select(m => m.n).SequenceEqual(new[] { 4, 5, 6, 7 }) || !grow, "the 4 wanted rows are shown");
            core.arrive(new GMsg(8, 103), CH, g, 8); core.writerPass(); core.freeMemory();   // any later write of the window
            int onDisk = Enumerable.Range(1, 8).Count(n => core.onDisk(CH, n));
            if (grow) Assert.AreEqual(8, onDisk, "growth + trim: every row kept");
            else Assert.IsTrue(onDisk < 8, "BREAK: trim alone (surplus 1) cannot cut a 3-row run → Core deletes older rows (" + onDisk + "/8)");
        }
    }

    [TestMethod]
    public void a_remote_delete_marks_the_channel_dirty_so_a_quick_open_keeps_it()
    {
        var core = new CoreModel(); var g = G();
        core.arrive(new GMsg(1, 10), CH, g, 10); core.writerPass(); g.afterPushBatch(core);
        core.update(CH, 1, "", null, 11); core.requests.Clear();   // Core blanks the row in memory; its write has not run
        g.markDirty(CoreModel.A, CH);                                // UIHelpers.deleteMessage
        g.beforeReread(CoreModel.A, CH, core);
        core.getMessages(CH, 51); core.writerPass(); core.freeMemory();
        Assert.AreEqual("", core.diskText(CH, 1), "the delete reached disk before the read");
    }

    // #46 r2 M1: a burst larger than the window — the ledger holds rows OLDER than the window's head. They are not lost
    // (they are on disk); putting them back would move the head into an older same-second run → Core's write deletes it.
    [TestMethod]
    public void r2_rows_older_than_the_window_head_are_never_put_back()
    {
        var core = new CoreModel(); var g = G();
        int n = 0;
        void burst(int count, long sec) { for (int i = 0; i < count; i++) core.arrive(new GMsg(++n, sec), CH, g, 100 + n); }
        burst(12, 2000); burst(7, 2001); burst(1, 2002); burst(50, 2003);   // 70 rows in ~3 s
        core.writerPass();
        g.beforeReread(CoreModel.A, CH, core);
        var shown = core.getMessages(CH, 51);
        int dropped = g.trimSameSecondHead(shown, true, 1);
        int back = g.afterReread(CoreModel.A, CH, shown, 171, core);
        core.requests.Add(CH); core.writerPass(); core.freeMemory();
        Assert.AreEqual(0, back, "nothing put back (dropped " + dropped + ")");
        Assert.AreEqual(70, Enumerable.Range(1, 70).Count(k => core.onDisk(CH, k)), "all 70 rows still on disk");
    }

    // An EDIT, inside the window, of a message that itself arrived inside the window and then lost the read race:
    // it stays "added" (put back), with its edited content.
    [TestMethod]
    public void an_edit_of_a_recent_arrival_keeps_it_eligible_for_put_back()
    {
        var core = new CoreModel(); var g = G();
        core.arrive(new GMsg(1, 10), CH, g, 10); core.writerPass(); g.afterPushBatch(core);
        core.duringRead = () => { core.duringRead = null; core.arrive(new GMsg(2, 20), CH, g, 20); core.update(CH, 2, "edited", g, 21); };
        var shown = core.getMessages(CH, 51);
        Assert.AreEqual(1, g.afterReread(CoreModel.A, CH, shown, 22, core), "put back");
        core.writerPass(); core.freeMemory();
        Assert.AreEqual("edited", core.diskText(CH, 2), "with its edit");
    }

    // #46 r1 minor 2: the put-back write itself must be requested — here the arrival's own request is dropped by a running write.
    [TestMethod]
    public void the_put_back_requests_its_own_write()
    {
        var core = new CoreModel(); var g = G();
        core.arrive(new GMsg(1, 10), CH, g, 10); core.writerPass();
        g.beforeReread(CoreModel.A, CH, core);
        core.duringRead = () => { core.duringRead = null; core.arrive(new GMsg(2, 20), CH, g, 20); core.requests.Clear(); };
        var shown = core.getMessages(CH, 51);
        Assert.AreEqual(1, g.afterReread(CoreModel.A, CH, shown, 21, core), "put back");
        core.writerPass(); core.freeMemory();
        Assert.IsTrue(core.onDisk(CH, 2), "written by the put-back's own request");
    }

    // #46 r1 minor 1: an EDIT that lands on the orphaned list during the read — the new list has the stale disk copy by id.
    [TestMethod]
    public void an_edit_during_the_read_replaces_the_stale_disk_copy()
    {
        foreach (bool useGuard in new[] { false, true })
        {
            var core = new CoreModel(); var g = useGuard ? G() : null;
            core.arrive(new GMsg(1, 10), CH, g, 10); core.writerPass();
            g?.afterPushBatch(core);
            core.arrive(new GMsg(2, 20), CH, g, 20); core.writerPass(); g?.afterPushBatch(core);
            core.duringRead = () => { core.duringRead = null; core.update(CH, 2, "edited", g, 30); };
            var shown = core.getMessages(CH, 51);
            g?.afterReread(CoreModel.A, CH, shown, 31, core);
            core.writerPass(); core.freeMemory();
            Assert.AreEqual(useGuard ? "edited" : "m2", core.diskText(CH, 2), useGuard ? "the edit survives" : "BREAK: the edit is lost without the guard");
        }
    }

    // #46 r1 M-2 (Core): ts is whole seconds; a write drops every on-disk row with ts >= the list's first ts.
    [TestMethod]
    public void same_second_head_is_trimmed_so_a_write_never_deletes_older_rows()
    {
        foreach (bool trim in new[] { false, true })
        {
            var core = new CoreModel(); var g = G();
            for (int i = 1; i <= 5; i++) core.arrive(new GMsg(i, 100), CH, g, i);   // a push burst: ONE second
            core.arrive(new GMsg(6, 101), CH, g, 6); core.arrive(new GMsg(7, 102), CH, g, 7);
            core.writerPass();
            var shown = core.getMessages(CH, 4);   // window starts inside the burst: 4,5,6,7
            int dropped = trim ? g.trimSameSecondHead(shown, true, 3) : 0;
            core.requests.Add(CH); core.writerPass(); core.freeMemory();
            int onDisk = Enumerable.Range(1, 7).Count(n => core.onDisk(CH, n));
            if (trim)
            {
                Assert.AreEqual(2, dropped, "4 and 5 dropped (same second as the head)");
                Assert.AreEqual(7, onDisk, "every row kept on disk");
            }
            else
            {
                Assert.IsTrue(onDisk < 7, "BREAK: without the trim the write deletes the older burst rows (" + onDisk + "/7)");
            }
        }
        var g2 = G();
        var one = Enumerable.Range(1, 5).Select(n => new GMsg(n, 100)).ToList();
        Assert.AreEqual(0, g2.trimSameSecondHead(one, true, 9), "a window that is one second is never emptied");
        var l = new List<GMsg> { new GMsg(1, 100), new GMsg(2, 100), new GMsg(3, 100), new GMsg(4, 101) };
        Assert.AreEqual(0, g2.trimSameSecondHead(l, true, 2), "a run longer than the surplus is left (a wanted row is never cut)");
        Assert.AreEqual(0, g2.trimSameSecondHead(l, false, 9), "no older history → nothing to protect");
    }

    // The stress test: random interleavings of arrivals (some during a write, some during a read), opens, writer passes,
    // low-memory frees and deletes. Invariant: every arrived, not-deleted message is on disk after a final flush.
    static int stress(bool useGuard, int seed, int steps)
    {
        var rnd = new Random(seed);
        var core = new CoreModel(); var g = useGuard ? G() : null;
        var live = new HashSet<(int ch, int n)>();
        int next = 1; long t = 1;
        void arrive() { int ch = rnd.Next(2); var m = new GMsg(next++, t); core.arrive(m, ch, g, t); live.Add((ch, m.n)); }
        for (int s = 0; s < steps; s++)
        {
            t += rnd.Next(1, 400);
            int op = rnd.Next(10);
            if (op < 4) arrive();
            else if (op < 6)
            {
                int ch = rnd.Next(2);
                if (rnd.Next(3) == 0) core.duringRead = () => { core.duringRead = null; arrive(); };
                g?.beforeReread(CoreModel.A, ch, core);
                var shown = core.getMessages(ch, 51 + rnd.Next(3) * 50);
                g?.afterReread(CoreModel.A, ch, shown, t, core);
                core.duringRead = null;
            }
            else if (op < 8)
            {
                if (rnd.Next(3) == 0) { bool once = false; core.duringWrite = c => { if (!once) { once = true; arrive(); if (rnd.Next(2) == 0) g?.afterPushBatch(core); } }; }   // #46 r1 M1: a batch blocked behind the running write
                core.writerPass(); core.duringWrite = null;
            }
            else if (op < 9)
            {
                // Node.onLowMemory: write dirty, flush, free (the stress model frees every channel: the open chat is not modelled)
                if (g != null) { g.afterPushBatch(core); }
                core.flush();
                if (g == null || !g.isRecent(CoreModel.A, t)) core.freeMemory();
            }
            else if (live.Count > 0)
            {
                var victim = live.ElementAt(rnd.Next(live.Count));
                g?.forgetMessage(CoreModel.A, BitConverter.GetBytes(victim.n));
                core.deleteMessage(victim.ch, victim.n); live.Remove(victim);
            }
        }
        if (g != null) g.afterPushBatch(core);
        core.flush();
        return live.Count(x => !core.onDisk(x.ch, x.n));
    }

    [TestMethod]
    public void STRESS_200_seeds_no_loss_with_the_guard_and_loss_without_it()
    {
        int lostWith = 0, lostWithout = 0;
        for (int seed = 1; seed <= 200; seed++)
        {
            lostWith += stress(true, seed, 400);
            lostWithout += stress(false, seed, 400);
        }
        Assert.AreEqual(0, lostWith, "with the guard: no message lost over 200 × 400 random steps");
        Assert.IsTrue(lostWithout > 0, "BREAK: the same seeds without the guard lose messages (" + lostWithout + ") — the model reproduces the loss");
    }
}
