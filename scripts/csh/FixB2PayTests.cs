// ★ fixb2 item 4 (n-20261117-win-confirm-enter-payment-miniapp, #1633) — EXECUTED: the pure half of "on Windows Enter alone never
// confirms a payment or a mini-app action": FixB2Rules.flagsLine (the one new [FLAGS] line), FixB2Rules.useSafeDialog (a call site
// shows the safe-default dialog only with its OWN switch on AND the alert drop on), the answer rule the dialog uses
// (FixB1Rules.confirmIsOk: only ContentDialogResult.Primary is yes), the REAL SpixiFlags.init over the stubbed Preferences for the
// two new switches (absent = ON, a stored 0 acts only in dev mode, each key its own switch, the line right after the fixb1 line, followed
// by the photo1a line and then the photo1b line (the photo1b line is the LAST of init)), and the REAL ConfirmGate through the steps SConfirm.askPlainSafeWinAsync takes (tryEnter … exit: while it holds the gate
// every other Spixi alert is dropped; it is refused while a confirm or another alert is up). The MAUI-bound sites (the entry, the
// four call sites) are `#if WINDOWS` code the harness cannot compile: scripts/pins-fixb2/d-pay-confirm.mjs holds them (source).
// DELIBERATE BREAKS (fixb2 builder-d report): ① useSafeDialog → `ownSwitch || alertDropOn` → use_safe_dialog_needs_both_switches
// fails; ② `appconfirmdefault=` → `appconfirm=` → pay_flags_line_text + pay_flags_defaults_and_dev_mode fail; ③ the read's absent
// value of flagPayConfirmSafeDefault 1 → 0 → pay_flags_defaults_and_dev_mode (dev on, absent) fails; ④ MiniAppConfirmSafeDefault
// computed from `fp` → pay_flags_defaults_and_dev_mode (each switch its own key) fails.
using System;
using System.Linq;
using Microsoft.Maui.Storage;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class FixB2PayTests
{
    private static readonly string[] Keys = { "flagPayConfirmSafeDefault", "flagMiniAppConfirmSafeDefault" };

    private static string state() => (SpixiFlags.PayConfirmSafeDefault ? "1" : "0") + (SpixiFlags.MiniAppConfirmSafeDefault ? "1" : "0");

    /** Run init with the two item-4 keys set to `stored` (null = absent) and dev mode `dev`; restore everything after `check`. */
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

    /** The item-4 [FLAGS] line of the last init: exactly one, it says `want`, right after the fixb1 line, followed by the photo1a line, the defaultsb line and then the photo1b line (the very last). */
    private static void oneLine(string want, string why)
    {
        var L = IXICore.Meta.Logging.lines;
        var mine = L.Where(l => l.StartsWith("[FLAGS] payconfirmdefault=", StringComparison.Ordinal)).ToList();
        Assert.AreEqual(1, mine.Count, why + ": the line is logged exactly once — " + string.Join("|", L));
        Assert.AreEqual(want, mine[0], why + ": the line matches the state");
        int fix = L.FindIndex(l => l.StartsWith("[FLAGS] confirmdefault=", StringComparison.Ordinal));
        Assert.IsTrue(fix >= 0 && L.IndexOf(mine[0]) == fix + 1, why + ": right after the fixb1 line — " + string.Join("|", L));
        // ★ merge photo1a + photo1b (re-based after a look): after this line init writes the photo1a line, (defaultsb line, see below) and the photo1b line
        // (the last call of init, SpixiFlags.readPhoto1b) is the very last.
        int at = L.IndexOf(mine[0]);
        // ★ defaultsb re-base (2026-11-18, after a look at init's diff: + the three defaultsb computes and its ONE [FLAGS] line, after the photo1a line).
        // ★ merge defaultsb x photo1b (2026-11-22): init now ends photo1a line, defaultsb line, photo1b line (readPhoto1b, the very last call) — so this
        // line is FOURTH from the end: exactly those three lines follow it, in that order, and nothing else.
        // ★ fixb4 re-base (2026-11-22, after a look at init's diff: + `readFixb4();` after `readPhoto1b();`, its ONE [FLAGS] fixb4 line) — FIFTH from the end.
        Assert.AreEqual(L.Count - 5, at, why + ": the last line of init but the photo1a, the defaultsb, the photo1b and the fixb4 ones — " + string.Join("|", L));
        Assert.IsTrue(L[L.Count - 4].StartsWith("[FLAGS] photo1a ", StringComparison.Ordinal), why + ": the photo1a line right after this one");
        Assert.IsTrue(L[L.Count - 3].StartsWith("[FLAGS] defaultsb ", StringComparison.Ordinal), why + ": then the defaultsb line");
        Assert.IsTrue(L[L.Count - 2].StartsWith("[FLAGS] photo1b ", StringComparison.Ordinal), why + ": then the photo1b line");
        Assert.IsTrue(L[L.Count - 1].StartsWith("[FLAGS] fixb4 ", StringComparison.Ordinal), why + ": the fixb4 line is the very last line");
    }

    [TestMethod]
    public void pay_flags_line_text()
    {
        Assert.AreEqual("[FLAGS] payconfirmdefault=0 appconfirmdefault=0", FixB2Rules.flagsLine(false, false));
        Assert.AreEqual("[FLAGS] payconfirmdefault=0 appconfirmdefault=1", FixB2Rules.flagsLine(false, true));
        Assert.AreEqual("[FLAGS] payconfirmdefault=1 appconfirmdefault=0", FixB2Rules.flagsLine(true, false));
        Assert.AreEqual("[FLAGS] payconfirmdefault=1 appconfirmdefault=1", FixB2Rules.flagsLine(true, true));
    }

    [TestMethod]
    public void use_safe_dialog_needs_both_switches()
    {
        Assert.IsTrue(FixB2Rules.useSafeDialog(true, true), "the call site's own switch ON and the alert drop ON → the safe dialog");
        Assert.IsFalse(FixB2Rules.useSafeDialog(false, true), "the own switch OFF → the old path");
        Assert.IsFalse(FixB2Rules.useSafeDialog(true, false), "the alert drop OFF → the old path (nothing keeps a MAUI alert away from the dialog)");
        Assert.IsFalse(FixB2Rules.useSafeDialog(false, false), "both OFF → the old path");
    }

    [TestMethod]
    public void only_the_confirm_button_is_yes()
    {
        // the dialog's answer rule (SConfirm.showSafeDefaultConfirm → FixB1Rules.confirmIsOk((int)ContentDialogResult)):
        // None = 0 is Esc, Enter on the default Cancel (Close) button, the Close button by click, a dialog closed any other way
        Assert.IsFalse(FixB1Rules.confirmIsOk(0), "Esc / Enter on Cancel / Cancel by click / closed → no payment, no action");
        Assert.IsTrue(FixB1Rules.confirmIsOk(1), "the confirm (Primary) button — by click or by Tab + Enter → yes");
        Assert.IsFalse(FixB1Rules.confirmIsOk(2), "a Secondary result (the dialog has no such button) → no");
        foreach (int r in new[] { -1, 3, 4, 100, int.MinValue, int.MaxValue })
        {
            Assert.IsFalse(FixB1Rules.confirmIsOk(r), "a value out of range (" + r + ") → no");
        }
    }

    [TestMethod]
    public void pay_flags_defaults_and_dev_mode()
    {
        withFlags(false, new int?[] { null, null }, () => { Assert.AreEqual("11", state(), "absent, dev off → ON"); oneLine("[FLAGS] payconfirmdefault=1 appconfirmdefault=1", "absent, dev off"); });
        withFlags(true, new int?[] { null, null }, () => { Assert.AreEqual("11", state(), "absent, dev on → ON"); oneLine("[FLAGS] payconfirmdefault=1 appconfirmdefault=1", "absent, dev on"); });
        withFlags(true, new int?[] { 0, 0 }, () => { Assert.AreEqual("00", state(), "dev on + stored 0 → OFF"); oneLine("[FLAGS] payconfirmdefault=0 appconfirmdefault=0", "dev on, 0"); });
        withFlags(false, new int?[] { 0, 0 }, () => { Assert.AreEqual("11", state(), "dev off + stored 0 → ON (a stored 0 acts only in dev mode)"); oneLine("[FLAGS] payconfirmdefault=1 appconfirmdefault=1", "dev off, 0"); });
        withFlags(true, new int?[] { 0, 1 }, () => { Assert.AreEqual("01", state(), "each switch its own key: the payment confirm off alone"); oneLine("[FLAGS] payconfirmdefault=0 appconfirmdefault=1", "pay off"); });
        withFlags(true, new int?[] { 1, 0 }, () => { Assert.AreEqual("10", state(), "each switch its own key: the mini-app confirms off alone"); oneLine("[FLAGS] payconfirmdefault=1 appconfirmdefault=0", "app off"); });
        withFlags(true, new int?[] { 7, -1 }, () => Assert.AreEqual("11", state(), "a stray value → ON"));
    }

    [TestMethod]
    public void pay_flags_leave_the_older_lines_alone()
    {
        // the adb walk parses the perfb1 line; the fixb1 line is a BUILD row: both keep their text with the new keys stored
        Preferences P = Preferences.Default;
        withFlags(true, new int?[] { 0, 0 }, () =>
        {
            var L = IXICore.Meta.Logging.lines;
            Assert.IsTrue(L.Contains("[FLAGS] confirmdefault=1 dividerline=1"), "the fixb1 line is unchanged — " + string.Join("|", L));
            Assert.AreEqual(1, L.Count(l => l.StartsWith("[FLAGS] warmidle=", StringComparison.Ordinal)), "the perfb1 line is logged once");
            Assert.IsTrue(SpixiFlags.ConfirmSafeDefault && SpixiFlags.NativeConfirm, "the item-4 keys switch nothing else");
        });
        Assert.IsFalse(P.d.ContainsKey(Keys[0]) || P.d.ContainsKey(Keys[1]), "the test left no key behind");
    }

    [TestMethod]
    public void plain_confirm_holds_the_gate_like_a_confirm()
    {
        // the steps of SConfirm.askPlainSafeWinAsync on the REAL gate: tryEnter → (dialog) → exit in finally
        var gate = new ConfirmGate();
        long mine = gate.tryEnter();
        Assert.IsTrue(mine > 0, "nothing up → the payment / mini-app confirm takes the gate");
        Assert.AreEqual(0L, gate.tryAlertOpened(), "while it is up every other Spixi alert is DROPPED (no MAUI alert over the dialog)");
        Assert.AreEqual(0L, gate.tryEnter(), "a second confirm (a destructive one, a second mini-app action) is refused → false");
        gate.exit(mine + 1);
        Assert.IsTrue(gate.isOpen, "another token never releases it");
        gate.exit(mine);
        Assert.IsFalse(gate.isOpen, "its own exit (finally) releases it");
        long alert = gate.tryAlertOpened();
        Assert.IsTrue(alert > 0, "after it closed an alert opens again");
        Assert.AreEqual(0L, gate.tryEnter(), "a confirm asked while another Spixi alert is up is refused → false (no second ContentDialog)");
        gate.alertClosed(alert);
        long again = gate.tryEnter();
        Assert.IsTrue(again > 0, "the alert closed → the confirm may open");
        gate.exit(again);
    }
}
