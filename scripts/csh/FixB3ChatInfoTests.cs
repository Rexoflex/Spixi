// ★ fixb3 item 2 (#1744 (3), P85) — EXECUTED: SharedScanGate (Spixi/Utils/FixB3ChatInfoRules.cs), the generation of one
// chat-info page's shared-items scans: only the LATEST scan pushes setSharedItems, so a late boot scan cannot paint a deleted
// history again after the re-scan. The call sites (ContactDetails.pushSharedItems, HomePage.onRemoveHistoryFor) are MAUI-bound:
// scripts/pins-fixb3/b-delete-history.mjs. DELIBERATE BREAK (#802, a full temp copy, then deleted): isLatest's `==` → `>=` →
// CSH pass=767 fail=6: 6 of the 7 red (only_the_last_begin_is_latest, an_older_token_is_not_latest_after_a_newer_begin, a_token_never_handed_out_is_not_latest,
// two_pages_have_their_own_gates, a_late_boot_scan_cannot_land_after_the_rescan, many_threads_… "expected 1, got 80000").
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class FixB3ChatInfoTests
{
    [TestMethod]
    public void tokens_strictly_increase()
    {
        SharedScanGate g = new SharedScanGate();
        int last = int.MinValue;
        for (int i = 0; i < 1000; i++)
        {
            int t = g.begin();
            Assert.IsTrue(t > last, "token " + t + " after " + last);
            last = t;
        }
    }

    [TestMethod]
    public void only_the_last_begin_is_latest()
    {
        SharedScanGate g = new SharedScanGate();
        int a = g.begin();
        Assert.IsTrue(g.isLatest(a), "the only scan is the latest");
        int b = g.begin();
        int c = g.begin();
        Assert.IsTrue(g.isLatest(c));
        Assert.IsFalse(g.isLatest(a));
        Assert.IsFalse(g.isLatest(b));
    }

    [TestMethod]
    public void an_older_token_is_not_latest_after_a_newer_begin()
    {
        SharedScanGate g = new SharedScanGate();
        int boot = g.begin();
        int rescan = g.begin();
        Assert.IsFalse(g.isLatest(boot), "the older scan pushes nothing once a newer one began");
        Assert.IsTrue(g.isLatest(rescan));
        Assert.IsFalse(g.isLatest(boot), "asking again changes nothing");
        Assert.IsTrue(g.isLatest(rescan), "isLatest does not move the gate");
    }

    [TestMethod]
    public void a_token_never_handed_out_is_not_latest()
    {
        SharedScanGate g = new SharedScanGate();
        Assert.IsFalse(g.isLatest(0), "a fresh gate has no latest scan");
        int t = g.begin();
        Assert.IsFalse(g.isLatest(0));
        Assert.IsFalse(g.isLatest(-1));
        Assert.IsFalse(g.isLatest(t + 1), "a future token");
        Assert.IsFalse(g.isLatest(int.MaxValue));
    }

    [TestMethod]
    public void two_pages_have_their_own_gates()
    {
        SharedScanGate one = new SharedScanGate();
        SharedScanGate two = new SharedScanGate();
        int a = one.begin();
        int b = two.begin();
        two.begin();
        Assert.IsTrue(one.isLatest(a), "a scan of another page does not move this page's gate");
        Assert.IsFalse(two.isLatest(b));
    }

    /** The race of the fix: the boot scan began first and its answer arrives AFTER the re-scan's — only the re-scan's lands. */
    [TestMethod]
    public void a_late_boot_scan_cannot_land_after_the_rescan()
    {
        SharedScanGate g = new SharedScanGate();
        List<string> pushed = new List<string>();
        int boot = g.begin();       // ixian:sharedItems at open
        int rescan = g.begin();     // onRemoveHistory → pushSharedItems
        if (g.isLatest(rescan)) pushed.Add("[]");             // the re-scan of the emptied history finishes first
        if (g.isLatest(boot)) pushed.Add("[old media]");      // the slow boot scan finishes later
        Assert.AreEqual("[]", string.Join("|", pushed), "only the re-scan pushes");
    }

    [TestMethod]
    public void many_threads_give_unique_tokens_and_exactly_one_latest_at_rest()
    {
        const int Threads = 8, Each = 10000;
        SharedScanGate g = new SharedScanGate();
        ConcurrentBag<int> all = new ConcurrentBag<int>();
        int outOfOrder = 0;   // no Assert on a worker thread: a throw there would end the harness
        using (Barrier start = new Barrier(Threads))
        {
            Thread[] ts = Enumerable.Range(0, Threads).Select(_ => new Thread(() =>
            {
                start.SignalAndWait();
                int prev = int.MinValue;
                for (int i = 0; i < Each; i++)
                {
                    int t = g.begin();
                    if (t <= prev) Interlocked.Increment(ref outOfOrder);
                    prev = t;
                    all.Add(t);
                }
            })).ToArray();
            foreach (Thread t in ts) t.Start();
            foreach (Thread t in ts) Assert.IsTrue(t.Join(60000), "a begin() thread did not finish");
        }
        Assert.AreEqual(0, Volatile.Read(ref outOfOrder), "per thread, tokens increase");
        int[] tokens = all.ToArray();
        Assert.AreEqual(Threads * Each, tokens.Length);
        Assert.AreEqual(Threads * Each, tokens.Distinct().Count(), "every begin() gave its own token");
        Assert.AreEqual(1, tokens.Count(g.isLatest), "exactly one token is latest at rest");
        Assert.IsTrue(g.isLatest(tokens.Max()), "the latest is the largest");
    }
}
