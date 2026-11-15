// ★ perfb1 P-11 switch 2 (SpareKeepShortSleep) — the keep-over-a-short-sleep rule (Spixi/Utils/SpareKeepRules.cs), EXECUTED.
// The call sites are MAUI-bound (App.OnSleep / App.OnResume, SpixiContentPage.keepSpareAtSleep / spareKeepOnResume /
// pushSpareChat's dropSpareIfKeptUnproven / the proof) and compile nowhere here; scripts/pins-perfb1/c-spare-keep.mjs pins
// that each site calls this rule. Why: docs/perfb1-spare-drop-reason.md.
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class PerfB1SpareKeepTests
{
    private const long Limit = SpareKeepRules.LimitMs;
    private const long Deadline = SpareKeepRules.ProofDeadlineMs;

    [TestMethod]
    public void the_dials()
    {
        Assert.AreEqual(180000L, Limit, "the limit is 3 minutes");
        Assert.AreEqual(1000L, Deadline, "the proof deadline is 1000 ms");
    }

    [TestMethod]
    public void switch_off_drops_at_sleep()
    {
        Assert.AreEqual(SpareKeepRules.Dropped, SpareKeepRules.atSleep(false, true, false, false), "OFF + a READY spare → today's drop");
        Assert.AreEqual(SpareKeepRules.Kept, SpareKeepRules.atSleep(true, true, false, false), "ON + READY + no lock + nothing staging → kept");
    }

    [TestMethod]
    public void only_a_ready_spare_with_nothing_staging_is_kept()
    {
        Assert.AreEqual(SpareKeepRules.Dropped, SpareKeepRules.atSleep(true, false, false, false), "a WARMING (or no) spare → drop");
        Assert.AreEqual(SpareKeepRules.Dropped, SpareKeepRules.atSleep(true, true, true, false), "a chat staging → drop");
    }

    [TestMethod]
    public void a_lock_drops()
    {
        Assert.AreEqual(SpareKeepRules.Dropped, SpareKeepRules.atSleep(true, true, false, true), "lock enabled / up at sleep → drop");
        Assert.AreEqual(SpareKeepRules.Dropped, SpareKeepRules.atProofStart(SpareKeepRules.Proving, true), "a lock up at the return → drop");
        Assert.AreEqual(SpareKeepRules.Dropped, SpareKeepRules.afterProof(SpareKeepRules.Proving, "\"complete\"", 20, true), "a lock up at the answer → drop");
        Assert.AreEqual(SpareKeepRules.Proving, SpareKeepRules.atProofStart(SpareKeepRules.Proving, false), "no lock → the proof runs");
    }

    [TestMethod]
    public void the_limit_just_under_at_over_and_a_clock_that_went_back()
    {
        Assert.IsTrue(SpareKeepRules.withinLimit(Limit - 1, Limit - 1), "just under → within");
        Assert.IsFalse(SpareKeepRules.withinLimit(Limit, 0), "at the limit (monotonic) → over");
        Assert.IsFalse(SpareKeepRules.withinLimit(0, Limit), "at the limit (wall) → over");
        Assert.IsFalse(SpareKeepRules.withinLimit(Limit + 1, 5), "over (monotonic) → over");
        Assert.IsFalse(SpareKeepRules.withinLimit(5, Limit * 10), "the device slept (only the wall clock counted it) → over");
        Assert.IsFalse(SpareKeepRules.withinLimit(-1, 5), "the monotonic clock went back → over");
        Assert.IsFalse(SpareKeepRules.withinLimit(5, -1), "the wall clock went back → over");
        Assert.AreEqual(SpareKeepRules.Proving, SpareKeepRules.atResume(SpareKeepRules.Kept, Limit - 1, Limit - 1), "return just under → proving");
        Assert.AreEqual(SpareKeepRules.Dropped, SpareKeepRules.atResume(SpareKeepRules.Kept, Limit, Limit), "return at the limit → drop");
        Assert.AreEqual(SpareKeepRules.Dropped, SpareKeepRules.atResume(SpareKeepRules.Kept, 10, -60000), "return after the clock went back → drop");
    }

    [TestMethod]
    public void the_background_timer_only_drops()
    {
        Assert.AreEqual(SpareKeepRules.Dropped, SpareKeepRules.atLimitTimer(SpareKeepRules.Kept, Limit, Limit), "still kept at the limit → drop");
        Assert.AreEqual(SpareKeepRules.Kept, SpareKeepRules.atLimitTimer(SpareKeepRules.Kept, 1000, 1000), "re-kept by a newer sleep → left alone");
        foreach (int s in new[] { SpareKeepRules.None, SpareKeepRules.Proving, SpareKeepRules.Proven, SpareKeepRules.Dropped })
        {
            Assert.AreEqual(s, SpareKeepRules.atLimitTimer(s, Limit * 2, Limit * 2), "state " + s + " is not moved by the timer");
        }
    }

    [TestMethod]
    public void unproven_is_not_usable()
    {
        Assert.IsFalse(SpareKeepRules.claimable(true, SpareKeepRules.Kept), "kept (sleeping) → not usable");
        Assert.IsFalse(SpareKeepRules.claimable(true, SpareKeepRules.Proving), "proving → not usable");
        Assert.IsFalse(SpareKeepRules.claimable(true, SpareKeepRules.Dropped), "dropped → not usable");
        Assert.IsFalse(SpareKeepRules.claimable(true, SpareKeepRules.None), "a kept spare with no state → not usable (fail closed)");
        Assert.IsFalse(SpareKeepRules.claimable(true, 99), "an unknown state → not usable");
        Assert.IsTrue(SpareKeepRules.claimable(false, SpareKeepRules.None), "not a kept spare → today's path");
    }

    [TestMethod]
    public void proof_late_or_wrong_is_not_usable()
    {
        Assert.AreEqual(SpareKeepRules.Dropped, SpareKeepRules.afterProof(SpareKeepRules.Proving, "\"complete\"", Deadline + 1, false), "late answer → drop");
        Assert.AreEqual(SpareKeepRules.Dropped, SpareKeepRules.afterProof(SpareKeepRules.Proving, null, Deadline, false), "the deadline (no answer) → drop");
        Assert.AreEqual(SpareKeepRules.Dropped, SpareKeepRules.afterProof(SpareKeepRules.Proving, "\"loading\"", 10, false), "not complete → drop");
        Assert.AreEqual(SpareKeepRules.Dropped, SpareKeepRules.afterProof(SpareKeepRules.Proving, "null", 10, false), "null answer → drop");
        Assert.AreEqual(SpareKeepRules.Dropped, SpareKeepRules.afterProof(SpareKeepRules.Proving, "\"complete\"", -5, false), "a clock that went back → drop");
        Assert.AreEqual(SpareKeepRules.Kept, SpareKeepRules.afterProof(SpareKeepRules.Kept, "\"complete\"", 10, false), "an answer with no proof running moves nothing");
        Assert.AreEqual(SpareKeepRules.Dropped, SpareKeepRules.afterProof(SpareKeepRules.Dropped, "\"complete\"", 10, false), "settled (deadline first) → stays dropped");
    }

    [TestMethod]
    public void proven_is_usable()
    {
        Assert.AreEqual(SpareKeepRules.Proven, SpareKeepRules.afterProof(SpareKeepRules.Proving, "\"complete\"", 30, false), "quoted answer in time");
        Assert.AreEqual(SpareKeepRules.Proven, SpareKeepRules.afterProof(SpareKeepRules.Proving, "complete", Deadline, false), "unquoted answer at the deadline");
        Assert.IsTrue(SpareKeepRules.claimable(true, SpareKeepRules.Proven), "proven → usable");
    }

    /* A model of the call sites: the slot, the state, the tap. */
    private sealed class Model
    {
        public bool slot = true;   // a READY spare sits in spareChatOp
        public int state = SpareKeepRules.None;
        public string lastOpen = "";
        public void sleep(bool flag) { state = SpareKeepRules.atSleep(flag, slot, false, false); if (state == SpareKeepRules.Dropped) drop(); }
        public void resume(long tick, long wall) { int n = SpareKeepRules.atResume(state, tick, wall); if (n == SpareKeepRules.Dropped) drop(); else state = n; }
        public void proofStart(bool lockUp) { int n = SpareKeepRules.atProofStart(state, lockUp); if (n == SpareKeepRules.Dropped) drop(); else state = n; }
        public void answer(string? a, long ms) { if (!slot || state != SpareKeepRules.Proving) return; int n = SpareKeepRules.afterProof(state, a, ms, false); if (n == SpareKeepRules.Dropped) drop(); else state = n; }
        public void tap()
        {
            bool kept = slot && state != SpareKeepRules.None;
            if (slot && !SpareKeepRules.claimable(kept, state)) { drop(); }
            lastOpen = slot ? "spare" : "cold";
            slot = false;
            state = SpareKeepRules.None;
        }
        private void drop() { slot = false; state = SpareKeepRules.None; }
    }

    [TestMethod]
    public void model_sleep_return_tap_at_once_is_cold_and_drops_the_spare()
    {
        Model m = new Model();
        m.sleep(true);
        Assert.AreEqual(SpareKeepRules.Kept, m.state, "kept at sleep");
        m.resume(30000, 30000);
        m.proofStart(false);
        Assert.AreEqual(SpareKeepRules.Proving, m.state, "the proof runs");
        m.tap();   // before the answer
        Assert.AreEqual("cold", m.lastOpen, "a tap before the answer opens cold");
        Assert.IsFalse(m.slot, "the unproven spare was dropped");
        m.answer("\"complete\"", 40);   // the late answer finds nothing to prove
        Assert.AreEqual(SpareKeepRules.None, m.state, "a late answer proves nothing");
    }

    [TestMethod]
    public void model_sleep_return_tap_after_the_answer_uses_the_spare()
    {
        Model m = new Model();
        m.sleep(true);
        m.resume(30000, 30000);
        m.proofStart(false);
        m.answer("\"complete\"", 40);
        Assert.AreEqual(SpareKeepRules.Proven, m.state, "proven");
        m.tap();
        Assert.AreEqual("spare", m.lastOpen, "the tap after the answer opens on the spare");
    }

    [TestMethod]
    public void model_switch_off_and_over_the_limit_are_cold()
    {
        Model off = new Model();
        off.sleep(false);
        Assert.IsFalse(off.slot, "switch OFF: dropped at sleep");
        off.tap();
        Assert.AreEqual("cold", off.lastOpen, "switch OFF: cold");

        Model late = new Model();
        late.sleep(true);
        late.resume(Limit + 1, Limit + 1);
        Assert.IsFalse(late.slot, "over the limit: dropped at the return");
        late.tap();
        Assert.AreEqual("cold", late.lastOpen, "over the limit: cold");
    }
}
