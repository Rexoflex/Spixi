// ★ fixb1 (Fix batch 1, P50 / P51, item 7) — EXECUTED: FixB1Rules.flagsLine (the one new [FLAGS] line), confirmIsOk (the
// Windows safe-default confirm: only ContentDialogResult.Primary = 1 is OK), the DividerLine hover / drag state, and the REAL
// SpixiFlags.init over the stubbed Preferences for the two new switches (absent = ON, a stored 0 acts only in dev mode) and for
// SpareKeepShortSleep (item 7: ON by default — S16PassRules.effectiveFlag, no more opt-in). The MAUI-bound sites (SConfirm's
// Windows dialog, HomePage's divider wiring) are pinned by scripts/pins-fixb1/a-confirm.mjs and d-divider.mjs.
// DELIBERATE BREAKS (fixb1 builder-a report): ① confirmIsOk → `>= 0` → confirm_is_ok_only_for_primary fails; ② dragEnd without
// `hover = false` → divider_line_drag_end_clears_the_hover fails; ③ the sparekeep read's absent value 0 → spare_keep_matrix
// (dev on, absent) + PerfB1FlagsTests.init_defaults fail (a fresh start has dev mode off, where an absent 0 still reads ON);
// ④ ConfirmSafeDefault = `fc == 1 && !dev` → new_flags_defaults_and_dev_mode fails.
using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Maui.Storage;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class FixB1Tests
{
    private static readonly string[] Keys = { "flagConfirmSafeDefault", "flagDividerHoverLine" };

    private static string state() => (SpixiFlags.ConfirmSafeDefault ? "1" : "0") + (SpixiFlags.DividerHoverLine ? "1" : "0");

    /** Run init with the two fixb1 keys set to `stored` (null = absent) and dev mode `dev`; restore everything after `check`. */
    private static void withFlags(bool dev, int?[] stored, Action check)
    {
        Preferences P = Preferences.Default;
        string? devBefore = P.d.TryGetValue("devMode", out var dv) ? dv : null;
        try
        {
            P.Set("devMode", dev);
            for (int i = 0; i < Keys.Length; i++)
            {
                if (stored[i] == null) P.Remove(Keys[i]); else P.Set(Keys[i], stored[i]!.Value);
            }
            IXICore.Meta.Logging.lines.Clear();
            SpixiFlags.init();
            check();
        }
        finally
        {
            foreach (string k in Keys) P.Remove(k);
            if (devBefore == null) P.Remove("devMode"); else P.d["devMode"] = devBefore;
            SpixiFlags.init();
            IXICore.Meta.Logging.lines.Clear();
        }
    }

    /** The fixb1 [FLAGS] line of the last init: exactly one, it says `want`, and it sits right after the perfb1 line. */
    private static void oneLine(string want, string why)
    {
        var L = IXICore.Meta.Logging.lines;
        var mine = L.Where(l => l.StartsWith("[FLAGS] confirmdefault=", StringComparison.Ordinal)).ToList();
        Assert.AreEqual(1, mine.Count, why + ": the line is logged exactly once — " + string.Join("|", L));
        Assert.AreEqual(want, mine[0], why + ": the line matches the state");
        int perf = L.FindIndex(l => l.StartsWith("[FLAGS] warmidle=", StringComparison.Ordinal));
        Assert.IsTrue(perf >= 0 && L.IndexOf(mine[0]) == perf + 1, why + ": right after the perfb1 line — " + string.Join("|", L));
    }

    [TestMethod]
    public void flags_line_text()
    {
        Assert.AreEqual("[FLAGS] confirmdefault=0 dividerline=0", FixB1Rules.flagsLine(false, false));
        Assert.AreEqual("[FLAGS] confirmdefault=0 dividerline=1", FixB1Rules.flagsLine(false, true));
        Assert.AreEqual("[FLAGS] confirmdefault=1 dividerline=0", FixB1Rules.flagsLine(true, false));
        Assert.AreEqual("[FLAGS] confirmdefault=1 dividerline=1", FixB1Rules.flagsLine(true, true));
    }

    [TestMethod]
    public void confirm_is_ok_only_for_primary()
    {
        // ContentDialogResult: None = 0 (Esc, the Close button = Cancel, closed any other way), Primary = 1, Secondary = 2
        Assert.IsFalse(FixB1Rules.confirmIsOk(0), "None (Esc / Close = Cancel) → not OK");
        Assert.IsTrue(FixB1Rules.confirmIsOk(1), "Primary (the OK text) → OK");
        Assert.IsFalse(FixB1Rules.confirmIsOk(2), "Secondary → not OK");
        Assert.IsFalse(FixB1Rules.confirmIsOk(-1), "a value out of range → not OK");
        Assert.IsFalse(FixB1Rules.confirmIsOk(3), "a value out of range → not OK");
    }

    [TestMethod]
    public void divider_line_hover()
    {
        var d = new FixB1Rules.DividerLine();
        Assert.IsFalse(d.visible, "idle → hidden");
        d.hoverEnter();
        Assert.IsTrue(d.visible, "pointer on the grip → shown");
        d.hoverExit();
        Assert.IsFalse(d.visible, "pointer left → hidden");
    }

    [TestMethod]
    public void divider_line_stays_for_the_whole_drag()
    {
        var d = new FixB1Rules.DividerLine();
        d.hoverEnter();
        d.dragStart();
        d.hoverExit();
        Assert.IsTrue(d.visible, "enter + drag start + exit (the pointer ran ahead of the grip) → still shown: the drag runs");
        d.dragEnd();
        Assert.IsFalse(d.visible, "the drag ended off the grip → hidden");
        var a = new FixB1Rules.DividerLine();
        a.dragStart();
        Assert.IsTrue(a.visible, "a drag start alone (no enter seen) → shown");
    }

    [TestMethod]
    public void divider_line_drag_end_clears_the_hover()
    {
        var d = new FixB1Rules.DividerLine();
        d.hoverEnter();
        d.dragStart();
        d.dragEnd();
        Assert.IsFalse(d.visible, "drag end → hidden even when the pointer had not left (no exit seen)");
        d.hoverEnter();
        Assert.IsTrue(d.visible, "drag end then a pointer move / enter → shown again");
        d.dragEnd();
        d.dragEnd();
        Assert.IsFalse(d.visible, "a second drag end changes nothing");
    }

    [TestMethod]
    public void new_flags_defaults_and_dev_mode()
    {
        withFlags(false, new int?[] { null, null }, () => { Assert.AreEqual("11", state(), "absent, dev off → ON"); oneLine("[FLAGS] confirmdefault=1 dividerline=1", "absent, dev off"); });
        withFlags(true, new int?[] { null, null }, () => { Assert.AreEqual("11", state(), "absent, dev on → ON"); oneLine("[FLAGS] confirmdefault=1 dividerline=1", "absent, dev on"); });
        withFlags(true, new int?[] { 0, 0 }, () => { Assert.AreEqual("00", state(), "dev on + stored 0 → OFF"); oneLine("[FLAGS] confirmdefault=0 dividerline=0", "dev on, 0"); });
        withFlags(false, new int?[] { 0, 0 }, () => { Assert.AreEqual("11", state(), "dev off + stored 0 → ON (a stored 0 acts only in dev mode)"); oneLine("[FLAGS] confirmdefault=1 dividerline=1", "dev off, 0"); });
        withFlags(true, new int?[] { 0, 1 }, () => { Assert.AreEqual("01", state(), "each switch its own key: confirm off alone"); oneLine("[FLAGS] confirmdefault=0 dividerline=1", "confirm off"); });
        withFlags(true, new int?[] { 1, 0 }, () => { Assert.AreEqual("10", state(), "each switch its own key: line off alone"); oneLine("[FLAGS] confirmdefault=1 dividerline=0", "line off"); });
        withFlags(true, new int?[] { 7, -1 }, () => Assert.AreEqual("11", state(), "a stray value → ON"));
    }

    [TestMethod]
    public void spare_keep_matrix()
    {
        foreach (bool dev in new[] { false, true })
        {
            foreach (int? s in new int?[] { null, 0, 1, 7 })
            {
                bool want = !(dev && s == 0);
                PerfB1FlagsTests.withPrefs(dev, new int?[] { null, null, s, null }, () =>
                    Assert.AreEqual(want, SpixiFlags.SpareKeepShortSleep, "sparekeep: dev " + dev + ", stored " + (s?.ToString() ?? "absent")
                        + " → " + (want ? "ON" : "OFF") + " (ON except dev on AND stored 0)"));
            }
        }
    }

    [TestMethod]
    public void spare_keep_fresh_start_line()
    {
        Preferences P = Preferences.Default;
        var snapshot = new Dictionary<string, string>(P.d);
        try
        {
            P.d.Clear();   // a fresh start: no preference at all
            IXICore.Meta.Logging.lines.Clear();
            SpixiFlags.init();
            Assert.IsTrue(SpixiFlags.SpareKeepShortSleep, "fresh start → sparekeep ON");
            Assert.IsTrue(IXICore.Meta.Logging.lines.Contains("[FLAGS] warmidle=1 sparerearm=1 sparekeep=1 noemptydetail=1"),
                "the perfb1 line says sparekeep=1 — " + string.Join("|", IXICore.Meta.Logging.lines));
            oneLine("[FLAGS] confirmdefault=1 dividerline=1", "fresh start");
        }
        finally
        {
            P.d.Clear();
            foreach (var kv in snapshot) P.d[kv.Key] = kv.Value;
            SpixiFlags.init();
            IXICore.Meta.Logging.lines.Clear();
        }
    }
}
