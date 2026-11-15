// ★ perfb1 P-11 switch 1 (SpareRearm) — the re-arm rule (Spixi/Utils/SpareRearmRules.cs), EXECUTED. The call sites are
// MAUI-bound (SpixiContentPage.dropSpareChat / askSpareRearmFlush / takeSpareRearm, HomePage.rearmChatSpareAfterDrop and
// its 2 s tick) and compile nowhere here; scripts/pins-perfb1/b-spare-rearm.mjs pins that each site calls this rule.
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class PerfB1SpareRearmTests
{
    private static readonly string[] RearmWords = { "sleep", "theme", "language", "reload", "devmode" };
    private static readonly string[] OtherWords = { "stop", "lowmem", "timeout", "host", "warming", "lock", "staging", "order", "attach", "close", "none", "", "Sleep" };

    [TestMethod]
    public void the_drop_words_that_rearm()
    {
        foreach (string w in RearmWords)
        {
            Assert.IsTrue(SpareRearmRules.rearmsAfterDrop(true, w), w + " re-arms");
        }
        foreach (string w in OtherWords)
        {
            Assert.IsFalse(SpareRearmRules.rearmsAfterDrop(true, w), w + " does not re-arm");
        }
        Assert.IsFalse(SpareRearmRules.rearmsAfterDrop(true, null), "null does not re-arm");
    }

    [TestMethod]
    public void switch_off_never_rearms()
    {
        foreach (string w in RearmWords)
        {
            Assert.IsFalse(SpareRearmRules.rearmsAfterDrop(false, w), "OFF: " + w);
        }
        Assert.IsFalse(SpareRearmRules.asksFlush(false, true, false, false, true), "OFF: no flush asked");
        Assert.IsFalse(SpareRearmRules.takesRearm(false, true, false, true), "OFF: nothing taken");
    }

    [TestMethod]
    public void stop_and_lowmem_cancel_a_pending_rearm()
    {
        Assert.IsTrue(SpareRearmRules.clearsOnDrop("stop"), "stop (delete account / shutdown)");
        Assert.IsTrue(SpareRearmRules.clearsOnDrop("lowmem"), "low memory");
        foreach (string w in RearmWords)
        {
            Assert.IsFalse(SpareRearmRules.clearsOnDrop(w), w + " does not clear");
        }
        Assert.IsFalse(SpareRearmRules.clearsOnDrop("timeout") || SpareRearmRules.clearsOnDrop(null), "timeout / null leave it");
    }

    [TestMethod]
    public void never_while_locked()
    {
        Assert.IsFalse(SpareRearmRules.takesRearm(true, true, true, true), "a flush under a lock does not take the re-arm");
        Assert.IsFalse(SpareRearmRules.asksFlush(true, true, false, true, true), "the tick under a lock asks nothing");
        Assert.IsTrue(SpareRearmRules.takesRearm(true, true, false, true), "no lock → taken");
        Assert.IsTrue(SpareRearmRules.asksFlush(true, true, false, false, true), "no lock → one flush asked");
    }

    [TestMethod]
    public void nothing_pending_nothing_happens_and_the_flush_is_asked_once()
    {
        Assert.IsFalse(SpareRearmRules.takesRearm(true, false, false, true), "no re-arm pending");
        Assert.IsFalse(SpareRearmRules.asksFlush(true, false, false, false, true), "no re-arm pending → no flush");
        Assert.IsFalse(SpareRearmRules.asksFlush(true, true, true, false, true), "the flush was asked already");
    }

    /* The call sites' two bools, modelled exactly as SpixiContentPage holds them (dropSpareChat · askSpareRearmFlush ·
     * takeSpareRearm), with HomePage's latch (rearmChatSpareAfterDrop → warmChatSpareAfterFirstPaint) and its three
     * callers: the chats flush (clearChatsDone), the 2 s tick (asks the flush) and onResume (a resume that does not lock). */
    private sealed class Model
    {
        public bool flag = true, pending, asked, latch, locked, fg = true;
        public int warmsScheduled;
        public long lastWarmAt = -1;   // when the scheduled warm starts (+ CHAT_SPARE_WARM_AFTER_FIRST_PAINT_MS)
        public int flushes;
        public void drop(string why)
        {
            if (SpareRearmRules.rearmsAfterDrop(flag, why)) { pending = true; asked = false; }
            else if (SpareRearmRules.clearsOnDrop(why)) { pending = false; }
        }
        private bool rearm()   // rearmChatSpareAfterDrop → takeSpareRearm (a refused take clears the ask: #46 r1 A-4)
        {
            if (SpareRearmRules.takesRearm(flag, pending, locked, fg)) { pending = false; latch = false; return true; }
            asked = false;
            return false;
        }
        private void triggerB(long now)   // warmChatSpareAfterFirstPaint: one-shot → +1800 ms
        {
            if (!latch) { latch = true; warmsScheduled++; lastWarmAt = now + 1800; }
        }
        public int asks;
        /** `between` runs after the tick's ask and before the flush it asked (a lock comes up, OnSleep runs …). */
        public void tick(long now = 0, System.Action? between = null)
        {
            if (SpareRearmRules.asksFlush(flag, pending, asked, locked, fg)) { asked = true; asks++; between?.Invoke(); chatsFlush(now); }
        }
        public void chatsFlush(long now = 0)
        {
            flushes++;
            rearm();
            triggerB(now);
        }
        public bool resume(long now)   // HomePage.onResume — only reached by a resume that does NOT lock (App.OnResume: fg first)
        {
            fg = true;
            if (rearm()) { triggerB(now); return true; }
            return false;
        }
    }

    [TestMethod]
    public void model_sleep_then_resume_warms_again_once()
    {
        var m = new Model();
        m.chatsFlush();
        Assert.AreEqual(1, m.warmsScheduled, "first flush: trigger B");
        m.chatsFlush();
        Assert.AreEqual(1, m.warmsScheduled, "one-shot");
        m.drop("sleep");
        m.tick();
        Assert.AreEqual(2, m.warmsScheduled, "the resume tick asks a flush → trigger B again");
        m.tick(); m.tick(); m.chatsFlush();
        Assert.AreEqual(2, m.warmsScheduled, "once per drop: no loop");
    }

    [TestMethod]
    public void model_a_locked_resume_waits_for_the_unlock()
    {
        var m = new Model();
        m.chatsFlush();
        m.drop("sleep");
        m.locked = true;
        m.tick(); m.chatsFlush();
        Assert.AreEqual(1, m.warmsScheduled, "nothing while the lock is up (a flush under the lock does not take it)");
        Assert.IsTrue(m.pending, "the re-arm waits");
        m.locked = false;
        m.tick();
        Assert.AreEqual(2, m.warmsScheduled, "after the unlock the tick asks the flush → trigger B again");
    }

    [TestMethod]
    public void model_stop_and_switch_off_never_rearm()
    {
        var m = new Model();
        m.chatsFlush();
        m.drop("theme");
        m.drop("stop");
        m.tick(); m.chatsFlush();
        Assert.AreEqual(1, m.warmsScheduled, "stop cancels the pending re-arm");
        var off = new Model { flag = false };
        off.chatsFlush();
        off.drop("sleep");
        off.tick(); off.chatsFlush();
        Assert.AreEqual(1, off.warmsScheduled, "switch OFF: the old one-shot path");
    }

    [TestMethod]
    public void model_a_quiet_resume_warms_at_resume_plus_1800_with_no_flush()
    {
        var m = new Model();
        m.chatsFlush(0);
        m.drop("sleep");
        int flushes = m.flushes;
        m.resume(70_000);
        Assert.AreEqual(2, m.warmsScheduled, "the resume hook schedules trigger B");
        Assert.AreEqual(71_800L, m.lastWarmAt, "at resume + 1800 ms (then the idle gate on Android)");
        Assert.AreEqual(flushes, m.flushes, "no chats flush needed");
        m.tick(71_000); m.chatsFlush(72_000);
        Assert.AreEqual(2, m.warmsScheduled, "the tick and the next flush find nothing pending: no second schedule");
        Assert.AreEqual(flushes + 1, m.flushes, "the tick asked NO forced flush after the hook took it (only the natural one ran)");
    }

    [TestMethod]
    public void model_a_locked_resume_waits_for_the_unlock_then_the_tick()
    {
        var m = new Model();
        m.chatsFlush(0);
        m.drop("sleep");
        m.locked = true;
        m.tick(70_500);
        Assert.AreEqual(1, m.warmsScheduled, "a resume that locks never calls the hook; the tick under the lock asks nothing");
        m.locked = false;
        m.tick(80_000);
        Assert.AreEqual(2, m.warmsScheduled, "after the unlock the tick asks the flush → trigger B");
        Assert.AreEqual(81_800L, m.lastWarmAt, "at that tick + 1800 ms");
        m.resume(90_000);
        Assert.AreEqual(2, m.warmsScheduled, "a later hook finds nothing pending");
    }

    [TestMethod]
    public void model_both_paths_racing_schedule_exactly_once()
    {
        foreach (bool hookFirst in new[] { true, false })
        {
            var m = new Model();
            m.chatsFlush(0);
            m.drop("theme");
            if (hookFirst) { m.resume(5_000); m.tick(5_000); m.chatsFlush(5_000); }
            else { m.tick(5_000); m.resume(5_000); m.chatsFlush(5_000); }
            Assert.AreEqual(2, m.warmsScheduled, "exactly one re-arm schedule (hook first: " + hookFirst + ")");
        }
    }

    /* ── #46 r1 A-3 · A-4 · S-6: no take and no ask while the app is not in the foreground; a refused take lets the tick ask
     * again; a lock that is still staging refuses like a lock that is up (the call sites pass isLockStaging into lockUp). ── */
    [TestMethod]
    public void never_in_the_background()
    {
        Assert.IsFalse(SpareRearmRules.takesRearm(true, true, false, false), "a flush in the background does not take the re-arm");
        Assert.IsFalse(SpareRearmRules.asksFlush(true, true, false, false, false), "the tick in the background asks nothing");
        Assert.IsTrue(SpareRearmRules.takesRearm(true, true, false, true), "foreground, no lock → taken");
        Assert.IsTrue(SpareRearmRules.asksFlush(true, true, false, false, true), "foreground, no lock → one flush asked");
    }

    [TestMethod]
    public void model_a_take_in_the_background_is_refused_and_the_next_resume_still_rearms()
    {
        var m = new Model();
        m.chatsFlush(0);
        // A 2 s tick passed its own foreground test, then App.OnSleep ran (its drop arms the spare, then isInForeground = false)
        // BEFORE the flush it asked: the take must be refused — a warm in the background is refused `why=background` and
        // a taken re-arm would be lost.
        m.drop("sleep");
        m.tick(1_000, () => { m.drop("sleep"); m.fg = false; });
        Assert.IsTrue(m.pending, "the background flush did not take the re-arm");
        Assert.AreEqual(1, m.warmsScheduled, "nothing scheduled in the background");
        Assert.IsTrue(m.resume(60_000), "the next quiet resume still takes the re-arm");
        Assert.AreEqual(2, m.warmsScheduled, "→ trigger B at resume + 1800 ms");
        Assert.AreEqual(61_800L, m.lastWarmAt, "at the resume + 1800 ms");
    }

    [TestMethod]
    public void model_a_lock_between_the_ask_and_the_take_lets_the_tick_ask_again()
    {
        var m = new Model();
        m.chatsFlush(0);
        m.drop("theme");
        m.tick(1_000, () => m.locked = true);   // a lock comes up between the ask and the flush it asked
        Assert.IsTrue(m.pending, "the flush under the lock did not take it");
        Assert.AreEqual(1, m.warmsScheduled, "nothing scheduled under the lock");
        m.tick(3_000);
        Assert.AreEqual(1, m.asks, "while the lock is up the tick asks nothing more");
        m.locked = false;
        m.tick(5_000);
        Assert.AreEqual(2, m.asks, "after the unlock the tick asks again");
        Assert.AreEqual(2, m.warmsScheduled, "→ trigger B");
        m.tick(7_000); m.tick(9_000);
        Assert.AreEqual(2, m.asks, "at most one forced flush per successful take");
    }

    [TestMethod]
    public void model_a_staging_lock_counts_as_a_lock()
    {
        // takeSpareRearm / askSpareRearmFlush pass `appLockUp || modalOverlayOp != null || isLockStaging()` as lockUp.
        var m = new Model();
        m.chatsFlush(0);
        m.drop("sleep");
        m.locked = true;   // the lock is still staging (isLockStaging) at the tick and at the take
        m.tick(1_000); m.chatsFlush(1_500);
        Assert.IsTrue(m.pending, "a staging lock refuses the take: the re-arm waits");
        m.locked = false;
        m.tick(4_000);
        Assert.AreEqual(2, m.warmsScheduled, "after the lock is presented and gone, the tick takes it");
    }
}
