// ★ imgurl item 2 (DECISIONS #1738 (3); contract docs/contract-imgurl.md § 2 row "2") — EXECUTED: the REAL Spixi/Utils/TrimRules.cs:
//   · TrimRules.drops: every level the system sends (5 10 15 20 40 60 80) with the switch on and off and the spare kept or not;
//     the dev line (fixed words, the level, the real drops); the drop word.
// NOT executed here (MAUI-bound): MainApplication.OnTrimMemory, SpixiContentPage.Life.cs — the source pin
// scripts/pins-imgurl/d-life.mjs holds their order and gates.
// DELIBERATE BREAKS (#802; each ONE mutation of a full copy, `node scripts/run-csh.mjs`, the red tests in brackets):
//   t1  TrimRules.drops `level < Background` → `level < 20 - 20` [trim_below_background_drops_nothing: "expected 0, got 3"];
//   t2  TrimRules.drops `|| !spareKept ?` → `|| true ?` [trim_background_keeps_a_kept_spare: "expected 2, got 3"];
//   t3  TrimRules.line `spare=" + (dropped & DropSpare)` → `spare=" + 1` [trim_line_and_word].
// (Items 3 and 4 — the renderer-death rules and the Windows page store id — left this batch by #1972.)
using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class LifeTests
{
    /* ===================== TrimRules ===================== */

    [TestMethod]
    public void trim_below_background_drops_nothing()
    {
        foreach (int level in new[] { 5, 10, 15, 20 })
        {
            Assert.AreEqual(0, TrimRules.drops(true, level, false), "level " + level + " (UI_HIDDEN / RUNNING_*): nothing — App.OnSleep owns the spare");
            Assert.AreEqual(0, TrimRules.drops(true, level, true), "level " + level + ", spare kept: nothing");
        }
    }

    [TestMethod]
    public void trim_background_drops_parked_and_a_free_spare()
    {
        Assert.AreEqual(TrimRules.DropSpare | TrimRules.DropParked, TrimRules.drops(true, 40, false), "BACKGROUND: the parked page and the spare");
        Assert.AreEqual(TrimRules.DropSpare | TrimRules.DropParked, TrimRules.drops(true, 50, false), "between BACKGROUND and MODERATE: as BACKGROUND");
    }

    [TestMethod]
    public void trim_background_keeps_a_kept_spare()
    {
        Assert.AreEqual(TrimRules.DropParked, TrimRules.drops(true, 40, true), "BACKGROUND with a spare kept for a short sleep: the parked page only");
    }

    [TestMethod]
    public void trim_moderate_and_complete_drop_both()
    {
        foreach (int level in new[] { 60, 80 })
        {
            Assert.AreEqual(3, TrimRules.drops(true, level, false), "level " + level + ": both");
            Assert.AreEqual(3, TrimRules.drops(true, level, true), "level " + level + ": both, a kept spare too");
        }
    }

    [TestMethod]
    public void trim_switch_off_drops_nothing()
    {
        foreach (int level in new[] { 5, 10, 15, 20, 40, 60, 80 })
        {
            Assert.AreEqual(0, TrimRules.drops(false, level, false), "switch off, level " + level);
            Assert.AreEqual(0, TrimRules.drops(false, level, true), "switch off, level " + level + ", kept");
        }
    }

    [TestMethod]
    public void trim_line_and_word()
    {
        Assert.AreEqual("[TRIM] level=40 spare=1 parked=0", TrimRules.line(40, 1));
        Assert.AreEqual("[TRIM] level=40 spare=0 parked=1", TrimRules.line(40, 2));
        Assert.AreEqual("[TRIM] level=80 spare=1 parked=1", TrimRules.line(80, 3));
        Assert.AreEqual("[TRIM] level=20 spare=0 parked=0", TrimRules.line(20, 0));
        Assert.AreEqual("trim", TrimRules.Why, "the drop word");
    }
}
