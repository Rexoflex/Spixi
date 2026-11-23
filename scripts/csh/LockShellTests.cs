// ★ lockb (Lock batch, ruling #1825 (1)/(2); contract docs/contract-lockb.md § 3, mechanisms docs/lockb-mechanisms.md § 3 / § 4) —
// EXECUTED: the REAL Spixi/Utils/LockShellRules.cs (R1 holdPushAtLoad, R2 holdPushAtPrompt, R3 popAnimated, R4 alertAfterPrompt,
// R5 releaseHoldWithoutPrompt — review r1 M-1 / m-1 / m-2, r2 X2 MINOR-1) and
// the REAL LockbFlags of Spixi/Utils/SpixiFlags.cs (csh already compiles it) over the stubbed Preferences (Stubs.cs / StubsS16.cs)
// and the stubbed Logging.
// Groups (17 tests): R1 (+ the values R1 / R2 may send, + the reload of a released lock) (3) · R2 (1) · R3 (1) · R4 (2) · R5 (2) ·
// "all switches OFF = the base" (1) · LockbFlags (7).
// The expected values are written out per row from the § 3 text, NOT computed by the rule's own expression.
// NOT executed here (MAUI-bound, the harness cannot compile LockPage.xaml.cs): the call sites — onLoad (R1), the PROMPT branch of
// maybeAuthenticate (R2), popOwnModal (R3), SetResultAsync (R4), releaseHold (R5; its callers App.releaseDeferredAuth, the
// pop-failed catch of App.dismissPauseLock and lockOnPause's two failure paths), promptWindowOpens, the builtDeferred latch in
// deferAuthentication —
// held by the source pin scripts/pins-lockb/b-csharp.mjs (builder-d; its limits are its first lines). What this file cannot show: the
// shell's answer to the pushes (scripts/pins-lockb/a-shell.mjs), the real enum names of Plugin.Fingerprint 3.0.0-beta.1 (the package
// is not in the harness: the nine names below are those of the plugin's source, FingerprintAuthenticationResultStatus.cs), the device.
// Every flag test starts from an EMPTY preference dictionary and puts the dictionary it found back (fresh()).
// DELIBERATE BREAKS (#802, builder-a; each ONE mutation in the copy, then `node scripts/run-csh.mjs`, then restored; the red tests in brackets):
//  R1  m1  holdPushAtLoad `!(on && builtDeferred && !authAttempted)` → `!(on || builtDeferred && !authAttempted)` [r1_truth_table_32,
//          all_switches_off_is_the_base, flags_feed_the_rules]; m1b `authDeferred && !windowOpened` → `||` [r1_truth_table_32]
//  R2  m2  holdPushAtPrompt `on && builtDeferred` → `on || builtDeferred` [r2_table, r5_is_r2_while_deferred, all_switches_off_is_the_base,
//          flags_feed_the_rules]
//  R3  m3  popAnimated `!(on && builtDeferred)` → `(on && builtDeferred)` [r3_table, all_switches_off_is_the_base, flags_feed_the_rules]
//  R4  m4  alertAfterPrompt: the `|| … "Denied" …` term dropped [r4_every_status, r4_through_enum_to_string, flags_feed_the_rules];
//      m4b the NotAvailable compare Ordinal → OrdinalIgnoreCase [r4_every_status: "notavailable"]
//  flags m5 LockbFlags.read `Get(NoAlertNoCredentialKey, 1)` → `, 0)` [flags_absent_is_all_on, flags_each_key_is_its_own_switch];
//        m6 flagsLine `" noalert="` → `" noalert ="` [flags_line_text_all_8]; m7 `noAlert = …effectiveFlag(dev, n)` → `(true, n)`
//        [flags_stored_zero_acts_only_in_dev_mode]
//  R1  m9  holdPushAtLoad `authDeferred && !windowOpened` → `authDeferred` [r1_reload_of_a_released_lock_sends_the_belt,
//          r1_truth_table_32] (builder-e)
//  R5  m8  releaseHoldWithoutPrompt `on && builtDeferred && authDeferred` → `on || builtDeferred && authDeferred` [r5_table_8,
//          r5_is_r2_while_deferred, all_switches_off_is_the_base, flags_feed_the_rules]; m8b `&& authDeferred` dropped
//          [r5_table_8, r5_is_r2_while_deferred, flags_feed_the_rules] (review r2 X2 MINOR-1; builder-e, the red lines in its report)
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;
using Microsoft.Maui.Storage;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class LockShellTests
{
    private const string DevKey = "devMode";

    private static Preferences P => Preferences.Default;
    private static List<string> Lines => IXICore.Meta.Logging.lines;
    private static List<string> Warns => IXICore.Meta.Logging.warns;
    private static List<string> Errors => IXICore.Meta.Logging.errors;

    /** The nine names of Plugin.Fingerprint's FingerprintAuthenticationResultStatus (Plugin.Fingerprint.Abstractions). */
    private static readonly string[] StatusNames =
        { "Unknown", "Succeeded", "FallbackRequested", "Failed", "Canceled", "TooManyAttempts", "UnknownError", "NotAvailable", "Denied" };

    /** One test body over an EMPTY preference dictionary and empty logs; the dictionary found is put back and the lockb switches
     *  are read again from it (and SpixiFlags.init, which one test runs over its own store), so no other test class sees a key
     *  or a switch of this one. */
    private static void fresh(Action body)
    {
        var before = new Dictionary<string, string>(P.d);
        try
        {
            P.d.Clear();
            Lines.Clear();
            Warns.Clear();
            body();
        }
        finally
        {
            P.d.Clear();
            foreach (var kv in before) P.d[kv.Key] = kv.Value;
            SpixiFlags.init(); LockbFlags.read();   // flags_line_text_all_8 runs init over its own store: compute every switch again
            Lines.Clear();
            Warns.Clear();
        }
    }

    /** read() over dev mode `dev` (null = absent) and the three keys (null = absent). */
    private static void readWith(bool? dev, int? hold, int? noAlert, int? clock)
    {
        P.d.Clear();
        if (dev != null) P.Set(DevKey, dev.Value);
        if (hold != null) P.Set(LockbFlags.HoldWhileDeferredKey, hold.Value);
        if (noAlert != null) P.Set(LockbFlags.NoAlertNoCredentialKey, noAlert.Value);
        if (clock != null) P.Set(LockbFlags.SecondClockKey, clock.Value);
        Lines.Clear();
        Warns.Clear();
        LockbFlags.read();
    }

    private static string st() => (LockbFlags.HoldWhileDeferred ? "1" : "0") + (LockbFlags.NoAlertNoCredential ? "1" : "0") + (LockbFlags.SecondClock ? "1" : "0");

    private static string show(string? s) => s == null ? "null" : "\"" + s + "\"";

    /* ===================== R1 holdPushAtLoad ===================== */

    /** § 3: `null` unless `on && builtDeferred && !authAttempted`; then `"True"` when `authDeferred && !windowOpened`, else `"1"`.
     *  Columns: on, builtDeferred, authDeferred, windowOpened, authAttempted → the push value. All 32 rows, written out. */
    [TestMethod]
    public void r1_truth_table_32()
    {
        var rows = new (bool on, bool built, bool deferred, bool window, bool attempted, string? want)[]
        {
            (false, false, false, false, false, null),
            (false, false, false, false, true,  null),
            (false, false, false, true,  false, null),
            (false, false, false, true,  true,  null),
            (false, false, true,  false, false, null),
            (false, false, true,  false, true,  null),
            (false, false, true,  true,  false, null),
            (false, false, true,  true,  true,  null),
            (false, true,  false, false, false, null),   // switch off: the base (no push), even for the pause lock
            (false, true,  false, false, true,  null),
            (false, true,  false, true,  false, null),
            (false, true,  false, true,  true,  null),
            (false, true,  true,  false, false, null),   // switch off, the pause lock while away: no push (the base)
            (false, true,  true,  false, true,  null),
            (false, true,  true,  true,  false, null),
            (false, true,  true,  true,  true,  null),
            (true,  false, false, false, false, null),   // a lock not built deferred (the cold start, the idle lock): no push
            (true,  false, false, false, true,  null),
            (true,  false, false, true,  false, null),
            (true,  false, false, true,  true,  null),
            (true,  false, true,  false, false, null),
            (true,  false, true,  false, true,  null),
            (true,  false, true,  true,  false, null),
            (true,  false, true,  true,  true,  null),
            (true,  true,  false, false, false, "1"),    // the pause lock, the deferral over (a load after the return): the belt from now
            (true,  true,  false, false, true,  null),   // a prompt already ran: onLoad's revealPasswordForm stands alone
            (true,  true,  false, true,  false, "1"),    // the deferral over and the window opened
            (true,  true,  false, true,  true,  null),
            (true,  true,  true,  false, false, "True"), // the pause lock, loaded while away: hold, no belt
            (true,  true,  true,  false, true,  null),
            (true,  true,  true,  true,  false, "1"),    // still deferred, but App.OnResume opened the window: the belt from now
            (true,  true,  true,  true,  true,  null),
        };
        Assert.AreEqual(32, rows.Length, "the full truth table of five bools");
        Assert.AreEqual(32, rows.Select(r => (r.on, r.built, r.deferred, r.window, r.attempted)).Distinct().Count(), "every row once");
        foreach (var r in rows)
        {
            string? got = LockShellRules.holdPushAtLoad(r.on, r.built, r.deferred, r.window, r.attempted);
            Assert.AreEqual(show(r.want), show(got), "R1(on " + r.on + ", builtDeferred " + r.built + ", authDeferred " + r.deferred
                + ", windowOpened " + r.window + ", authAttempted " + r.attempted + ")");
        }
    }

    /** The values R1 can give are exactly the two existing "pending" values of setAuthPending, and never "False" (a reveal is
     *  revealPasswordForm's job alone). */
    [TestMethod]
    public void r1_r2_send_only_the_two_existing_pending_values()
    {
        Assert.AreEqual("True", LockShellRules.HoldDeferred, "the deferred hold is the existing value \"True\"");
        Assert.AreEqual("1", LockShellRules.HoldWindowOpen, "the window-open hold is the existing value \"1\"");
        var seen = new HashSet<string>();
        foreach (bool a in new[] { false, true })
            foreach (bool b in new[] { false, true })
                foreach (bool c in new[] { false, true })
                    foreach (bool d in new[] { false, true })
                        foreach (bool e in new[] { false, true })
                        {
                            string? v = LockShellRules.holdPushAtLoad(a, b, c, d, e);
                            if (v != null) seen.Add(v);
                        }
        foreach (bool a in new[] { false, true })
            foreach (bool b in new[] { false, true })
            {
                string? v = LockShellRules.holdPushAtPrompt(a, b);
                if (v != null) seen.Add(v);
            }
        Assert.AreEqual("1|True", string.Join("|", seen.OrderBy(x => x, StringComparer.Ordinal)), "R1 / R2 send \"True\" and \"1\" only (no new value, no \"False\")");
    }

    /** Review r1 M-1, the reload gap: LockPage.onLoad passes `promptWindowOpened || holdReleased` as R1's windowOpened, so a
     *  pause lock whose form releaseHold revealed (still deferred, no prompt yet) re-boots after a reload into "1" (hold + the
     *  base's 3 s belt) and never "True" (hold, no belt). The call site is the pin's (b-csharp); this is the rule's half. */
    [TestMethod]
    public void r1_reload_of_a_released_lock_sends_the_belt()
    {
        foreach (bool windowOpened in new[] { false, true })
            foreach (bool holdReleased in new[] { false, true })
            {
                string want = windowOpened || holdReleased ? "\"1\"" : "\"True\"";
                Assert.AreEqual(want, show(LockShellRules.holdPushAtLoad(true, true, true, windowOpened || holdReleased, false)),
                    "the pause lock, still deferred, windowOpened " + windowOpened + ", holdReleased " + holdReleased);
            }
        Assert.AreEqual("\"1\"", show(LockShellRules.holdPushAtLoad(true, true, true, true, false)), "released, reloaded: \"1\" (the belt), never \"True\"");
        Assert.AreEqual("null", show(LockShellRules.holdPushAtLoad(false, true, true, true, false)), "switch off: no push (the base), released or not");
    }

    /* ===================== R2 holdPushAtPrompt ===================== */

    /** § 3: `"1"` when both, else `null`. */
    [TestMethod]
    public void r2_table()
    {
        Assert.AreEqual("null", show(LockShellRules.holdPushAtPrompt(false, false)), "switch off, not deferred → no push");
        Assert.AreEqual("null", show(LockShellRules.holdPushAtPrompt(false, true)), "switch off, the pause lock → no push (the base)");
        Assert.AreEqual("null", show(LockShellRules.holdPushAtPrompt(true, false)), "switch on, a lock not built deferred → no push");
        Assert.AreEqual("\"1\"", show(LockShellRules.holdPushAtPrompt(true, true)), "switch on, the pause lock → \"1\" (the belt from the prompt)");
    }

    /* ===================== R3 popAnimated ===================== */

    /** § 3: `false` only when both (the pause lock pops with no animation). */
    [TestMethod]
    public void r3_table()
    {
        Assert.IsTrue(LockShellRules.popAnimated(false, false), "switch off, not deferred → the animated pop (the base)");
        Assert.IsTrue(LockShellRules.popAnimated(false, true), "switch off, the pause lock → the animated pop (the base)");
        Assert.IsTrue(LockShellRules.popAnimated(true, false), "switch on, a lock not built deferred (a Settings authorise lock) → animated");
        Assert.IsFalse(LockShellRules.popAnimated(true, true), "switch on, the pause lock → PopModalAsync(false)");
    }

    /* ===================== R4 alertAfterPrompt ===================== */

    /** § 3: `false` only when `on` and `status` is exactly "NotAvailable" or "Denied"; `true` otherwise (null, any other name). */
    [TestMethod]
    public void r4_every_status()
    {
        var onRows = new (string? status, bool want)[]
        {
            ("Unknown", true),
            ("Succeeded", true),
            ("FallbackRequested", true),
            ("Failed", true),
            ("Canceled", true),
            ("TooManyAttempts", true),
            ("UnknownError", true),
            ("NotAvailable", false),   // no screen lock, no biometric: the plugin showed no UI → no alert
            ("Denied", false),         // iOS: Face ID permission refused, no prompt shown → no alert
            (null, true),
            ("", true),
            ("notavailable", true),    // another case is another name → the alert (exact, ordinal)
            ("NOTAVAILABLE", true),
            ("denied", true),
            (" NotAvailable", true),
            ("NotAvailable ", true),
            ("Denied\n", true),
            ("NotAvailableX", true),
            ("7", true),               // the enum's number, not its name
        };
        foreach (var r in onRows)
        {
            Assert.AreEqual(r.want, LockShellRules.alertAfterPrompt(true, r.status), "switch on, status " + show(r.status));
            Assert.IsTrue(LockShellRules.alertAfterPrompt(false, r.status), "switch off, status " + show(r.status) + " → the alert (the base)");
        }
        foreach (string n in StatusNames)
        {
            Assert.IsTrue(onRows.Any(r => r.status == n), "every enum name has a row: " + n);
        }
        Assert.AreEqual(2, StatusNames.Count(n => !LockShellRules.alertAfterPrompt(true, n)), "exactly two of the nine names drop the alert");
    }

    /** The rule takes the enum NAME as `result.Status.ToString()` gives it: a local enum with the plugin's nine names, in order. */
    private enum StatusCopy { Unknown, Succeeded, FallbackRequested, Failed, Canceled, TooManyAttempts, UnknownError, NotAvailable, Denied }

    [TestMethod]
    public void r4_through_enum_to_string()
    {
        Assert.AreEqual(string.Join(",", StatusNames), string.Join(",", Enum.GetNames(typeof(StatusCopy))), "the copy has the nine names");
        foreach (StatusCopy s in Enum.GetValues(typeof(StatusCopy)))
        {
            bool want = !(s == StatusCopy.NotAvailable || s == StatusCopy.Denied);
            Assert.AreEqual(want, LockShellRules.alertAfterPrompt(true, s.ToString()), "switch on, " + s + ".ToString()");
            Assert.IsTrue(LockShellRules.alertAfterPrompt(false, s.ToString()), "switch off, " + s + ".ToString() → the alert");
        }
    }

    /* ===================== R5 releaseHoldWithoutPrompt ===================== */

    /** R5 (review r1 M-1 / m-1 / m-2; r2 X2 MINOR-1): `true` (LockPage.releaseHold reveals the form) only when the switch is on,
     *  the lock was built deferred AND its prompt is still deferred; `false` (a no-op) otherwise. All 8 rows, written out. */
    [TestMethod]
    public void r5_table_8()
    {
        var rows = new (bool on, bool built, bool deferred, bool want, string why)[]
        {
            (false, false, false, false, "switch off, not built deferred → no reveal (the base)"),
            (false, false, true,  false, "switch off → no reveal (the base)"),
            (false, true,  false, false, "switch off, the pause lock, hand-off consumed → no reveal (the base)"),
            (false, true,  true,  false, "switch off, the pause lock still deferred → no reveal (no hold was sent; the base's belt runs)"),
            (true,  false, false, false, "switch on, a lock not built deferred → no reveal (R1 never held it)"),
            (true,  false, true,  false, "switch on, not built deferred → no reveal"),
            (true,  true,  false, false, "switch on, the pause lock, hand-off CONSUMED → no reveal (the shell has \"1\" or gets it at onLoad)"),
            (true,  true,  true,  true,  "switch on, the pause lock, prompt still deferred → reveal (\"False\", the base's reveal)"),
        };
        Assert.AreEqual(8, rows.Select(r => (r.on, r.built, r.deferred)).Distinct().Count(), "every row once");
        foreach (var r in rows)
        {
            Assert.AreEqual(r.want, LockShellRules.releaseHoldWithoutPrompt(r.on, r.built, r.deferred), r.why);
        }
    }

    /** R5 = R2's condition while the prompt is still deferred (`R2 != null && authDeferred`): it reveals only a lock R2 would
     *  hold, and for such a lock exactly when R1 can send "True" (no belt) at a load before the hand-off. */
    [TestMethod]
    public void r5_is_r2_while_deferred()
    {
        foreach (bool on in new[] { false, true })
            foreach (bool built in new[] { false, true })
                foreach (bool deferred in new[] { false, true })
                {
                    bool r5 = LockShellRules.releaseHoldWithoutPrompt(on, built, deferred);
                    Assert.AreEqual(LockShellRules.holdPushAtPrompt(on, built) != null && deferred, r5,
                        "R5(on " + on + ", builtDeferred " + built + ", authDeferred " + deferred + ") = (R2 != null) && authDeferred");
                    Assert.AreEqual(LockShellRules.holdPushAtLoad(on, built, deferred, false, false) == LockShellRules.HoldDeferred, r5,
                        "R5(on " + on + ", builtDeferred " + built + ", authDeferred " + deferred + ") = R1 sends \"True\" at a load before the hand-off");
                }
    }

    /* ===================== all switches OFF = the base ===================== */

    [TestMethod]
    public void all_switches_off_is_the_base()
    {
        foreach (bool built in new[] { false, true })
        {
            foreach (bool deferred in new[] { false, true })
                foreach (bool window in new[] { false, true })
                    foreach (bool attempted in new[] { false, true })
                    {
                        Assert.AreEqual("null", show(LockShellRules.holdPushAtLoad(false, built, deferred, window, attempted)),
                            "switch off: no push at onLoad (built " + built + ", deferred " + deferred + ", window " + window + ", attempted " + attempted + ")");
                    }
            Assert.AreEqual("null", show(LockShellRules.holdPushAtPrompt(false, built)), "switch off: no push at PROMPT (built " + built + ")");
            Assert.IsTrue(LockShellRules.popAnimated(false, built), "switch off: the animated pop (built " + built + ")");
            foreach (bool deferred in new[] { false, true })
                Assert.IsFalse(LockShellRules.releaseHoldWithoutPrompt(false, built, deferred), "switch off: releaseHold reveals nothing extra (built " + built + ", deferred " + deferred + ")");
        }
        var inputs = StatusNames.Cast<string?>().Concat(new string?[] { null, "", "notavailable", "denied", "x" });
        foreach (string? s in inputs)
        {
            Assert.IsTrue(LockShellRules.alertAfterPrompt(false, s), "switch off: the alert after every not-authenticated prompt (" + show(s) + ")");
        }
    }

    /* ===================== LockbFlags (the lead's block; read() is internal for these tests) ===================== */

    [TestMethod]
    public void flags_keys()
    {
        Assert.AreEqual("flagLockHoldWhileDeferred", LockbFlags.HoldWhileDeferredKey);
        Assert.AreEqual("flagLockNoAlertNoCredential", LockbFlags.NoAlertNoCredentialKey);
        Assert.AreEqual("flagLockSecondClock", LockbFlags.SecondClockKey);
    }

    [TestMethod]
    public void flags_absent_is_all_on()
    {
        fresh(() =>
        {
            foreach (bool? dev in new bool?[] { null, false, true })
            {
                readWith(dev, null, null, null);
                Assert.AreEqual("111", st(), "no key (dev " + (dev == null ? "absent" : dev.ToString()) + ") → all three ON");
            }
            foreach (bool dev in new[] { false, true })
            {
                foreach (int v in new[] { 1, 2, -1, int.MaxValue, int.MinValue })
                {
                    readWith(dev, v, v, v);
                    Assert.AreEqual("111", st(), "stored " + v + " (dev " + dev + ") → ON: only a 0 turns a switch off");
                }
            }
        });
    }

    [TestMethod]
    public void flags_stored_zero_acts_only_in_dev_mode()
    {
        fresh(() =>
        {
            readWith(true, 0, 0, 0);
            Assert.AreEqual("000", st(), "dev on + all stored 0 → all OFF (the base)");
            readWith(false, 0, 0, 0);
            Assert.AreEqual("111", st(), "dev off + all stored 0 → all ON (a stored 0 acts only in dev mode)");
            readWith(null, 0, 0, 0);
            Assert.AreEqual("111", st(), "dev absent + all stored 0 → all ON");
        });
    }

    [TestMethod]
    public void flags_each_key_is_its_own_switch()
    {
        fresh(() =>
        {
            readWith(true, 0, null, null);
            Assert.AreEqual("011", st(), "only hold at 0 → only hold OFF");
            readWith(true, null, 0, null);
            Assert.AreEqual("101", st(), "only noalert at 0 → only noalert OFF");
            readWith(true, null, null, 0);
            Assert.AreEqual("110", st(), "only clock at 0 → only clock OFF");
            readWith(true, 1, 0, 1);
            Assert.AreEqual("101", st(), "noalert 0, the others stored 1");
            readWith(false, 0, null, 0);
            Assert.AreEqual("111", st(), "dev off: single zeros are ignored");
            // another batch's stored 0 does not move these three
            readWith(true, null, null, null);
            P.Set("flagLockDelayOneMinute", 0);
            P.Set("flagDefaultAppLockOn", 0);
            P.Set("flagLoadMoreOffUi", 0);
            LockbFlags.read();
            Assert.AreEqual("111", st(), "another batch's stored 0 changes none of the three");
        });
    }

    [TestMethod]
    public void flags_read_logs_nothing_and_a_throwing_store_keeps_on()
    {
        fresh(() =>
        {
            foreach (bool? dev in new bool?[] { null, false, true })
            {
                foreach (int? v in new int?[] { null, 0, 1 })
                {
                    readWith(dev, v, v, v);
                    Assert.AreEqual(0, Lines.Count, "read() logs no line (dev " + dev + ", " + v + ") — " + string.Join("|", Lines));
                    Assert.AreEqual(0, Warns.Count, "read() logs no warning");
                }
            }
            readWith(true, 0, 0, 0);
            Assert.AreEqual("000", st(), "control: the zeros act in dev mode");
            var d = P.d;
            int e0 = Errors.Count;
            try
            {
                P.d = null!;   // every stub Get throws now
                LockbFlags.read();
            }
            finally
            {
                P.d = d;
            }
            Assert.AreEqual("111", st(), "a store that throws keeps all three ON (the flags only turn OFF on purpose)");
            Assert.AreEqual(0, Lines.Count + Warns.Count, "…and logs nothing");
            Assert.AreEqual(e0, Errors.Count, "…and no error");
        });
    }

    /** `[FLAGS] lockb hold=<0|1> noalert=<0|1> clock=<0|1>`, all 8 combinations; the first USE of a process reads once and logs the
     *  line once (reset of the once-flag through reflection, as a new process has it); SpixiFlags.init() neither reads nor logs it. */
    [TestMethod]
    public void flags_line_text_all_8()
    {
        var want = new (bool h, bool n, bool c, string line)[]
        {
            (false, false, false, "[FLAGS] lockb hold=0 noalert=0 clock=0"),
            (false, false, true,  "[FLAGS] lockb hold=0 noalert=0 clock=1"),
            (false, true,  false, "[FLAGS] lockb hold=0 noalert=1 clock=0"),
            (false, true,  true,  "[FLAGS] lockb hold=0 noalert=1 clock=1"),
            (true,  false, false, "[FLAGS] lockb hold=1 noalert=0 clock=0"),
            (true,  false, true,  "[FLAGS] lockb hold=1 noalert=0 clock=1"),
            (true,  true,  false, "[FLAGS] lockb hold=1 noalert=1 clock=0"),
            (true,  true,  true,  "[FLAGS] lockb hold=1 noalert=1 clock=1"),
        };
        foreach (var r in want)
        {
            string got = LockbFlags.flagsLine(r.h, r.n, r.c);
            Assert.AreEqual(r.line, got, "flagsLine(" + r.h + ", " + r.n + ", " + r.c + ")");
            Assert.IsTrue(Regex.IsMatch(got, "^\\[FLAGS\\] lockb hold=[01] noalert=[01] clock=[01]$"), "fixed words and 0|1 only");
        }
        fresh(() =>
        {
            var f = typeof(LockbFlags).GetField("readDone", BindingFlags.NonPublic | BindingFlags.Static);
            Assert.IsTrue(f != null, "the once-flag exists");
            P.Set(DevKey, true);
            P.Set(LockbFlags.NoAlertNoCredentialKey, 0);
            f!.SetValue(null, 0);
            Lines.Clear();
            SpixiFlags.init();
            Assert.IsTrue(Lines.All(l => !l.Contains("lockb")), "SpixiFlags.init() writes no lockb line — " + string.Join("|", Lines));
            Assert.AreEqual(0, (int)f.GetValue(null)!, "…and does not read the lockb switches");
            Lines.Clear();
            Assert.AreEqual("101", st(), "the first use of a new process reads the store");
            Assert.AreEqual("[FLAGS] lockb hold=1 noalert=0 clock=1", string.Join("|", Lines.Where(l => l.Contains("lockb"))), "…and logs the line ONCE with the state");
            P.Set(LockbFlags.HoldWhileDeferredKey, 0);
            Assert.AreEqual("101", st(), "a later use does not read again");
            Assert.AreEqual(1, Lines.Count(l => l.StartsWith("[FLAGS] lockb ", StringComparison.Ordinal)), "…and logs no second line");
        });
    }

    /** The real switches feed the rules: all OFF (dev mode, stored 0) = the base at every site; the store build (absent) = the new
     *  behaviour for the pause lock only. */
    [TestMethod]
    public void flags_feed_the_rules()
    {
        fresh(() =>
        {
            readWith(true, 0, 0, 0);
            Assert.AreEqual("null", show(LockShellRules.holdPushAtLoad(LockbFlags.HoldWhileDeferred, true, true, false, false)), "OFF: the pause lock gets no push at onLoad");
            Assert.AreEqual("null", show(LockShellRules.holdPushAtPrompt(LockbFlags.HoldWhileDeferred, true)), "OFF: no push at PROMPT");
            Assert.IsTrue(LockShellRules.popAnimated(LockbFlags.HoldWhileDeferred, true), "OFF: the animated pop");
            Assert.IsFalse(LockShellRules.releaseHoldWithoutPrompt(LockbFlags.HoldWhileDeferred, true, true), "OFF: releaseHold is a no-op for the pause lock");
            Assert.IsTrue(LockShellRules.alertAfterPrompt(LockbFlags.NoAlertNoCredential, "NotAvailable"), "OFF: the alert on NotAvailable");
            Assert.IsTrue(LockShellRules.alertAfterPrompt(LockbFlags.NoAlertNoCredential, "Denied"), "OFF: the alert on Denied");
            readWith(null, null, null, null);
            Assert.AreEqual("\"True\"", show(LockShellRules.holdPushAtLoad(LockbFlags.HoldWhileDeferred, true, true, false, false)), "ON: the pause lock loaded while away holds");
            Assert.AreEqual("\"1\"", show(LockShellRules.holdPushAtPrompt(LockbFlags.HoldWhileDeferred, true)), "ON: \"1\" at PROMPT");
            Assert.IsFalse(LockShellRules.popAnimated(LockbFlags.HoldWhileDeferred, true), "ON: the pause lock pops with no animation");
            Assert.IsTrue(LockShellRules.popAnimated(LockbFlags.HoldWhileDeferred, false), "ON: another lock keeps the animated pop");
            Assert.IsTrue(LockShellRules.releaseHoldWithoutPrompt(LockbFlags.HoldWhileDeferred, true, true), "ON: releaseHold reveals the pause lock's form while its prompt is deferred");
            Assert.IsFalse(LockShellRules.releaseHoldWithoutPrompt(LockbFlags.HoldWhileDeferred, true, false), "ON: releaseHold is a no-op once the hand-off was consumed");
            Assert.IsFalse(LockShellRules.releaseHoldWithoutPrompt(LockbFlags.HoldWhileDeferred, false, true), "ON: releaseHold is a no-op for another lock");
            Assert.IsFalse(LockShellRules.alertAfterPrompt(LockbFlags.NoAlertNoCredential, "NotAvailable"), "ON: no alert on NotAvailable");
            Assert.IsFalse(LockShellRules.alertAfterPrompt(LockbFlags.NoAlertNoCredential, "Denied"), "ON: no alert on Denied");
            Assert.IsTrue(LockShellRules.alertAfterPrompt(LockbFlags.NoAlertNoCredential, "Failed"), "ON: the alert on Failed");
        });
    }
}
