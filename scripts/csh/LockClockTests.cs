// ★ lockb (the lock batch, Damir's ruling #1825 (3); contract docs/contract-lockb.md § 3 "The clock rule") — EXECUTED: the REAL
// Spixi/Utils/LockClockRules.cs (built on the REAL DefaultsRules.withinGrace):
//   · withinGrace with BOTH clocks: away 30 s on both (inside 60, outside 5), the wall clock set BACK (wall small, second clock
//     600 s → outside), set FORWARD (wall 3630 s → outside), a negative wall value, a negative second-clock difference (a stamp
//     from "after now": the reboot case), no second clock on the platform (nowMono null → the wall rule alone, equal to
//     DefaultsRules.withinGrace over a grid), a clock but no twin stamp (→ outside), the bounds to the millisecond, NaN / ±infinity,
//     long.MinValue / long.MaxValue (no overflow to "inside"), a failed read (FailedRead, below 0 → outside);
//   · the property the batch rests on: over a grid, the rule is never "inside" where the wall rule is "outside" (only MORE locks);
//   · keepTwin (the twin goes with its wall stamp), diagSuffix (the tail of the `resume/pauseLock-held` line), nowMs() (null here).
// NOT executed here (MAUI-bound, the harness cannot compile App.xaml.cs): the twin stamps, the ONE reading of the second clock and
// the statement `if (secondClock && withinGrace) { withinGrace = LockClockRules.withinGrace(…); }` of App.OnResume, and the Android
// side of nowMs() (`#if ANDROID`). "The switch OFF = the base" is App's choice (it then never calls this rule): a source pin holds
// that text (scripts/pins-lockb/b-csharp.mjs, builder-d). These tests read no preference and no clock: no state to put back.
// DELIBERATE BREAKS (#802, builder-c; each ONE mutation in Spixi/Utils/LockClockRules.cs of a full copy of the tree, run from the
// copy with `node scripts/run-csh.mjs`, then restored and green again; the red tests in brackets):
//   m1  step 1 `if (!DefaultsRules.withinGrace(wallSecondsAway, oneMinute))` → `if (false)` [wall_clock_set_forward_is_outside,
//       wall_negative_is_outside, no_second_clock_is_the_wall_rule_alone, bounds_exact, wall_nan_and_infinity_are_outside,
//       never_inside_where_the_wall_rule_is_outside, now_ms_is_null_in_the_harness];
//   m2  step 2 `return true;` → `return false;` [no_second_clock_is_the_wall_rule_alone, now_ms_is_null_in_the_harness];
//   m3  step 3 `return false;` → `return true;` [no_twin_stamp_is_outside];
//   m4  step 4 `now < 0 || stamp < 0` → `&&` [failed_read_is_outside, mono_extremes_do_not_overflow];
//   m5  step 5 `(now - stamp) / 1000.0` → `/ 100.0` [both_clocks_inside, wall_clock_set_back_is_outside, bounds_exact,
//       mono_extremes_do_not_overflow];
//   m6  step 5 `/ 1000.0` → `/ 10000.0` [wall_clock_set_back_is_outside: "wall 0 s, second clock 600 s → outside", bounds_exact,
//       mono_extremes_do_not_overflow];
//   m7  step 5 `(now - stamp)` → `(stamp - now)` [both_clocks_inside, wall_clock_set_back_is_outside,
//       mono_negative_difference_is_outside, bounds_exact, mono_extremes_do_not_overflow];
//   m8  step 5 `…, oneMinute)` → `…, true)` [wall_clock_set_back_is_outside: "the second clock uses the bound of the switch",
//       bounds_exact];
//   m9  keepTwin `? twin : null` → `? null : twin` [keep_twin_follows_the_wall_stamp];
//   m10 diagSuffix `if (!on || nowMono == null)` → `if (nowMono == null)` [diag_suffix_text: "the switch off → nothing"];
//   m11 diagSuffix `(now - stamp) / 1000)` → `/ 100)` [diag_suffix_text: "30 s away"];
//   m12 nowMs (the non-Android side) `return null;` → `return 0;` [now_ms_is_null_in_the_harness];
//   m13 `FailedRead = -1` → `= 0` [failed_read_is_outside, diag_suffix_text];
//   m14 diagSuffix `" mono=-2s"` → `" mono=-1s"` [diag_suffix_text: "no twin → the fixed value −2"];
//   m15 diagSuffix `now < 0 || stamp < 0 || now < stamp` → `now < 0 || stamp < 0` [diag_suffix_text: "CLAMPED to −1"].
using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class LockClockTests
{
    private const bool Old = false;   // the 5 s bound (SpixiFlags.LockDelayOneMinute off)
    private const bool Min = true;    // the 60 s bound

    /** A stamp of the second clock somewhere in an ordinary uptime (about 2 days). */
    private const long T0 = 172_800_000;

    private static bool rule(double wall, long? now, long? stamp, bool oneMinute) => LockClockRules.withinGrace(wall, now, stamp, oneMinute);

    /* ===================== both clocks agree ===================== */

    [TestMethod]
    public void both_clocks_inside()
    {
        Assert.IsTrue(rule(30, T0 + 30_000, T0, Min), "away 30 s on both clocks, the 60 s bound → inside (no auth, as the base)");
        Assert.IsFalse(rule(30, T0 + 30_000, T0, Old), "away 30 s on both clocks, the 5 s bound → outside (as the base)");
        Assert.IsTrue(rule(3, T0 + 3_000, T0, Old), "away 3 s on both clocks, the 5 s bound → inside");
        Assert.IsTrue(rule(3, T0 + 3_000, T0, Min), "away 3 s on both clocks, the 60 s bound → inside");
        Assert.IsTrue(rule(0, T0, T0, Old), "away 0 s on both clocks → inside");
        Assert.IsTrue(rule(30, 30_000, 0, Min), "a stamp of 0 (taken at the boot instant) is a real reading → inside");
        Assert.IsFalse(rule(600, T0 + 600_000, T0, Min), "away 10 minutes on both clocks → outside (the lock asks, as the base)");
    }

    /* ===================== the wall clock moved (R1-1) ===================== */

    [TestMethod]
    public void wall_clock_set_back_is_outside()
    {
        // away 10 minutes by the second clock; the wall clock was set back to 0–60 s after the stamp
        foreach (double wall in new double[] { 0, 0.5, 1, 4.9, 5, 30, 59.9, 60 })
        {
            Assert.IsFalse(rule(wall, T0 + 600_000, T0, Min), "the 60 s bound: wall " + wall + " s, second clock 600 s → outside (the base said inside: R1-1)");
            Assert.IsFalse(rule(wall, T0 + 600_000, T0, Old), "the 5 s bound: wall " + wall + " s, second clock 600 s → outside");
        }
        Assert.IsFalse(rule(0, T0 + 86_400_000, T0, Min), "away a day, wall 0 s → outside");
        Assert.IsFalse(rule(1, T0 + 61_000, T0, Min), "away 61 s, wall 1 s → outside");
        // each clock is held to the SAME bound as the wall rule: 30 s away is outside the 5 s bound even when the wall says 3 s
        Assert.IsFalse(rule(3, T0 + 30_000, T0, Old), "the 5 s bound: wall 3 s, second clock 30 s → outside (the second clock uses the bound of the switch, not 60 s)");
        Assert.IsTrue(rule(3, T0 + 30_000, T0, Min), "the 60 s bound: wall 3 s, second clock 30 s → inside (both inside)");
    }

    [TestMethod]
    public void wall_clock_set_forward_is_outside()
    {
        Assert.IsFalse(rule(3630, T0 + 30_000, T0, Min), "away 30 s, the wall clock set FORWARD 1 h (3630 s) → outside (as the base: the safe side)");
        Assert.IsFalse(rule(3630, T0 + 30_000, T0, Old), "the same on the 5 s bound → outside");
        Assert.IsFalse(rule(60.001, T0 + 30_000, T0, Min), "wall 60.001 s, second clock 30 s → outside (the wall rule is never skipped)");
        Assert.IsFalse(rule(5.001, T0 + 1_000, T0, Old), "the 5 s bound: wall 5.001 s, second clock 1 s → outside");
    }

    [TestMethod]
    public void wall_negative_is_outside()
    {
        Assert.IsFalse(rule(-1, T0 + 30_000, T0, Min), "the wall clock set back to BEFORE the stamp (−1 s), second clock 30 s → outside (the base's negative guard)");
        Assert.IsFalse(rule(-0.001, T0 + 1_000, T0, Min), "wall −0.001 s → outside");
        Assert.IsFalse(rule(-3600, T0, T0, Old), "wall −1 h, second clock 0 s → outside");
        Assert.IsFalse(rule(-1, null, null, Min), "wall −1 s with no second clock → outside");
    }

    /* ===================== the second clock itself ===================== */

    [TestMethod]
    public void mono_negative_difference_is_outside()
    {
        // a stamp from "after now": the clock started again from 0 (a reboot) and the twin is larger than the reading
        Assert.IsFalse(rule(30, 30_000, T0, Min), "the twin is 2 days, now is 30 s after a boot → the difference is negative → outside");
        Assert.IsFalse(rule(1, T0 - 1, T0, Min), "the difference is −1 ms → outside");
        Assert.IsFalse(rule(1, T0 - 1, T0, Old), "the difference is −1 ms, the 5 s bound → outside");
        Assert.IsFalse(rule(0, 0, T0, Min), "now = 0 (the boot instant), a twin from before → outside");
        Assert.IsFalse(rule(0, 0, 1, Min), "now 0, twin 1 → outside");
    }

    [TestMethod]
    public void no_second_clock_is_the_wall_rule_alone()
    {
        double[] grid = { double.NegativeInfinity, -3600, -1, -0.001, 0, 0.001, 1, 4.999, 5, 5.001, 30, 59.999, 60, 60.001, 61, 600, 3630, 86400,
            double.MaxValue, double.PositiveInfinity, double.NaN };
        long?[] twins = { null, 0, T0, -1, long.MaxValue, long.MinValue };
        foreach (double wall in grid)
        {
            foreach (bool oneMinute in new[] { Old, Min })
            {
                bool wallRule = DefaultsRules.withinGrace(wall, oneMinute);
                foreach (long? twin in twins)
                {
                    // nowMono == null = the platform has no second clock (iPhone, Mac, Windows, the harness): the twin is not read
                    Assert.AreEqual(wallRule, rule(wall, null, twin, oneMinute),
                        "no second clock: the rule equals DefaultsRules.withinGrace — wall " + wall + ", oneMinute " + oneMinute + ", twin " + (twin == null ? "null" : twin.ToString()));
                }
            }
        }
        Assert.IsTrue(rule(30, null, null, Min), "no second clock, away 30 s, the 60 s bound → inside (the base)");
        Assert.IsTrue(rule(5, null, null, Old), "no second clock, away 5 s, the 5 s bound → inside (the base)");
    }

    [TestMethod]
    public void no_twin_stamp_is_outside()
    {
        // the platform HAS the clock (a reading), but the wall stamp has no twin: a path wrote only the wall stamp → fail closed
        Assert.IsFalse(rule(30, T0, null, Min), "a reading, no twin, wall 30 s → outside");
        Assert.IsFalse(rule(0, T0, null, Min), "a reading, no twin, wall 0 s → outside");
        Assert.IsFalse(rule(3, 0, null, Old), "a reading of 0, no twin → outside");
        Assert.IsFalse(rule(3, long.MaxValue, null, Min), "the largest reading, no twin → outside");
    }

    [TestMethod]
    public void failed_read_is_outside()
    {
        Assert.IsTrue(LockClockRules.FailedRead < 0, "the failed-read value is below 0 (no reading of a clock that counts up from 0)");
        long bad = LockClockRules.FailedRead;
        Assert.IsFalse(rule(30, T0 + 30_000, bad, Min), "the twin is a failed read, now is real → outside (not 'two days away' and not 'inside')");
        Assert.IsFalse(rule(30, 30_000, bad, Min), "the twin is a failed read, now 30 s after a boot (the difference would read 30.001 s) → outside");
        Assert.IsFalse(rule(30, bad, T0, Min), "now is a failed read, the twin is real → outside");
        Assert.IsFalse(rule(0, bad, bad, Min), "both are failed reads (the difference would read 0) → outside");
        Assert.IsFalse(rule(1, -5, -10, Min), "two readings below 0 (the difference would read 5 ms) → outside");
        Assert.IsFalse(rule(1, 10, -10, Old), "a twin below 0 → outside");
    }

    /* ===================== the bounds, NaN, the extremes ===================== */

    [TestMethod]
    public void bounds_exact()
    {
        //                       ms away  5 s   60 s
        var mono = new (long ms, bool o, bool n)[]
        {
            (0,      true,  true),
            (1,      true,  true),
            (4_999,  true,  true),
            (5_000,  true,  true),
            (5_001,  false, true),
            (59_999, false, true),
            (60_000, false, true),
            (60_001, false, false),
            (61_000, false, false),
        };
        foreach (var r in mono)
        {
            // the wall value is inside both bounds (1 s): the second clock alone decides
            Assert.AreEqual(r.o, rule(1, T0 + r.ms, T0, Old), "the 5 s bound, second clock " + r.ms + " ms");
            Assert.AreEqual(r.n, rule(1, T0 + r.ms, T0, Min), "the 60 s bound, second clock " + r.ms + " ms");
        }
        //                         s away  5 s   60 s
        var wall = new (double s, bool o, bool n)[]
        {
            (0,      true,  true),
            (5,      true,  true),
            (5.001,  false, true),
            (60,     false, true),
            (60.001, false, false),
        };
        foreach (var r in wall)
        {
            // the second clock is inside both bounds (1 s): the wall clock alone decides
            Assert.AreEqual(r.o, rule(r.s, T0 + 1_000, T0, Old), "the 5 s bound, wall " + r.s + " s");
            Assert.AreEqual(r.n, rule(r.s, T0 + 1_000, T0, Min), "the 60 s bound, wall " + r.s + " s");
        }
        Assert.IsTrue(rule(60, T0 + 60_000, T0, Min), "60 s on both clocks, the 60 s bound → inside (the last value inside)");
        Assert.IsFalse(rule(60, T0 + 60_001, T0, Min), "60 s on the wall, 60 001 ms on the second clock → outside");
        Assert.IsFalse(rule(60.001, T0 + 60_000, T0, Min), "60.001 s on the wall, 60 000 ms on the second clock → outside");
        Assert.IsTrue(rule(5, T0 + 5_000, T0, Old), "5 s on both clocks, the 5 s bound → inside");
        Assert.IsFalse(rule(5, T0 + 5_001, T0, Old), "5 s on the wall, 5 001 ms on the second clock → outside");
    }

    [TestMethod]
    public void wall_nan_and_infinity_are_outside()
    {
        foreach (double wall in new[] { double.NaN, double.PositiveInfinity, double.NegativeInfinity, double.MaxValue, double.MinValue })
        {
            foreach (bool oneMinute in new[] { Old, Min })
            {
                Assert.IsFalse(rule(wall, T0 + 1_000, T0, oneMinute), "wall " + wall + ", second clock 1 s → outside");
                Assert.IsFalse(rule(wall, T0, T0, oneMinute), "wall " + wall + ", second clock 0 s → outside");
                Assert.IsFalse(rule(wall, null, null, oneMinute), "wall " + wall + ", no second clock → outside");
                Assert.IsFalse(rule(wall, T0, null, oneMinute), "wall " + wall + ", no twin → outside");
            }
        }
    }

    [TestMethod]
    public void mono_extremes_do_not_overflow()
    {
        long max = long.MaxValue, min = long.MinValue;
        // in unchecked arithmetic min − max = 1 and (max − 1) − min = −2: a subtraction that wraps must not read as "1 ms away"
        Assert.IsFalse(rule(1, min, max, Min), "now long.MinValue, twin long.MaxValue (a wrapped difference of 1 ms) → outside");
        Assert.IsFalse(rule(1, min + 30_000, max, Min), "now long.MinValue + 30 000, twin long.MaxValue (a wrapped difference of 30 001 ms) → outside");
        Assert.IsFalse(rule(1, max, min, Min), "now long.MaxValue, twin long.MinValue → outside");
        Assert.IsFalse(rule(1, 30_000, min, Min), "twin long.MinValue → outside");
        Assert.IsFalse(rule(1, min, 0, Min), "now long.MinValue → outside");
        Assert.IsFalse(rule(1, min, min, Min), "both long.MinValue (a difference of 0) → outside (not readings)");
        Assert.IsFalse(rule(1, max, 0, Min), "now long.MaxValue, twin 0 → outside (the largest difference, no wrap)");
        Assert.IsFalse(rule(1, 0, max, Min), "now 0, twin long.MaxValue → outside (the most negative difference, no wrap)");
        Assert.IsFalse(rule(1, max, max - 60_001, Min), "60 001 ms away at the top of the range → outside");
        Assert.IsTrue(rule(1, max, max - 60_000, Min), "60 000 ms away at the top of the range → inside (exact: no rounding to the bound)");
        Assert.IsTrue(rule(1, max, max, Min), "0 ms away at the top of the range → inside");
    }

    /* ===================== the property: only MORE locks than the wall rule ===================== */

    [TestMethod]
    public void never_inside_where_the_wall_rule_is_outside()
    {
        double[] walls = { double.NegativeInfinity, -3600, -1, -0.001, 0, 1, 5, 5.001, 30, 60, 60.001, 600, 3630, double.PositiveInfinity, double.NaN };
        long?[] monos = { null, long.MinValue, -1, 0, 1, 5_000, 5_001, 60_000, 60_001, T0, T0 + 1, T0 + 30_000, T0 + 60_000, T0 + 60_001, long.MaxValue };
        int inside = 0, outsideByTheSecondClock = 0;
        foreach (double wall in walls)
        {
            foreach (long? now in monos)
            {
                foreach (long? stamp in monos)
                {
                    foreach (bool oneMinute in new[] { Old, Min })
                    {
                        bool wallRule = DefaultsRules.withinGrace(wall, oneMinute);
                        bool both = rule(wall, now, stamp, oneMinute);
                        Assert.IsTrue(!both || wallRule, "the rule is inside where the wall rule is outside: wall " + wall + ", now " + now + ", twin " + stamp + ", oneMinute " + oneMinute);
                        if (both) inside++;
                        if (wallRule && !both) outsideByTheSecondClock++;
                    }
                }
            }
        }
        Assert.IsTrue(inside > 0, "the grid has rows that are inside (the rule is not 'always outside')");
        Assert.IsTrue(outsideByTheSecondClock > 0, "the grid has rows where the second clock alone says outside");
    }

    /* ===================== the twin, the diag tail, the harness build ===================== */

    [TestMethod]
    public void keep_twin_follows_the_wall_stamp()
    {
        DateTime wall = new DateTime(2026, 11, 23, 10, 0, 0);
        Assert.AreEqual((long?)T0, LockClockRules.keepTwin(wall, T0), "the wall stamp stays (LockDelayOneMinute off: the old path) → the twin stays");
        Assert.AreEqual((long?)null, LockClockRules.keepTwin(null, T0), "the wall stamp was cleared (a verified unlock) → the twin is cleared with it");
        Assert.AreEqual((long?)null, LockClockRules.keepTwin(wall, null), "a wall stamp with no twin stays with no twin (nothing is invented)");
        Assert.AreEqual((long?)null, LockClockRules.keepTwin(null, null), "nothing → nothing");
        Assert.AreEqual((long?)LockClockRules.FailedRead, LockClockRules.keepTwin(wall, LockClockRules.FailedRead), "a failed-read twin stays as it is (it still says outside)");
        // with the two rules of App.onUnlock in a row: DefaultsRules.stampAfterUnlock, then keepTwin
        DateTime? on = DefaultsRules.stampAfterUnlock(wall, true);
        DateTime? off = DefaultsRules.stampAfterUnlock(wall, false);
        Assert.AreEqual((long?)null, LockClockRules.keepTwin(on, T0), "LockDelayOneMinute on: the stamp and its twin are both gone after a verified unlock");
        Assert.AreEqual((long?)T0, LockClockRules.keepTwin(off, T0), "LockDelayOneMinute off: the stamp and its twin are both kept");
    }

    [TestMethod]
    public void diag_suffix_text()
    {
        Assert.AreEqual("", LockClockRules.diagSuffix(false, T0 + 30_000, T0), "the switch off → nothing (the line is byte-identical to the base)");
        Assert.AreEqual("", LockClockRules.diagSuffix(false, null, null), "the switch off, no clock → nothing");
        Assert.AreEqual("", LockClockRules.diagSuffix(false, T0, null), "the switch off, no twin → nothing");
        Assert.AreEqual("", LockClockRules.diagSuffix(true, null, T0), "the switch on, no second clock on the platform → nothing");
        Assert.AreEqual("", LockClockRules.diagSuffix(true, null, null), "the switch on, no second clock, no twin → nothing");
        Assert.AreEqual(" mono=30s", LockClockRules.diagSuffix(true, T0 + 30_000, T0), "30 s away");
        Assert.AreEqual(" mono=0s", LockClockRules.diagSuffix(true, T0, T0), "0 s away");
        Assert.AreEqual(" mono=0s", LockClockRules.diagSuffix(true, T0 + 999, T0), "999 ms → whole seconds, rounded down");
        Assert.AreEqual(" mono=1s", LockClockRules.diagSuffix(true, T0 + 1_000, T0), "1000 ms → 1 s");
        Assert.AreEqual(" mono=600s", LockClockRules.diagSuffix(true, T0 + 600_000, T0), "10 minutes away");
        Assert.AreEqual(" mono=-2s", LockClockRules.diagSuffix(true, T0, null), "no twin → the fixed value −2");
        Assert.AreEqual(" mono=-1s", LockClockRules.diagSuffix(true, 30_000, T0), "a negative difference (the reboot case) is CLAMPED to −1: the real number is not printed");
        Assert.AreEqual(" mono=-1s", LockClockRules.diagSuffix(true, LockClockRules.FailedRead, T0), "a failed read (now) → −1");
        Assert.AreEqual(" mono=-1s", LockClockRules.diagSuffix(true, T0, LockClockRules.FailedRead), "a failed read (the twin) → −1");
        Assert.AreEqual(" mono=-1s", LockClockRules.diagSuffix(true, long.MinValue, long.MaxValue), "the extremes: no wrapped number is printed");
        Assert.AreEqual(" mono=-1s", LockClockRules.diagSuffix(true, long.MaxValue, long.MinValue), "the extremes, the other way");
        Assert.AreEqual(" mono=9223372036854775s", LockClockRules.diagSuffix(true, long.MaxValue, 0), "the largest difference prints as digits");
        // fixed words and digits: over a grid, the text is "" or ` mono=` + an optional '-' + digits + `s`
        long?[] vals = { null, long.MinValue, -1, 0, 1, 999, 1000, T0, T0 + 61_000, long.MaxValue };
        foreach (long? now in vals)
        {
            foreach (long? stamp in vals)
            {
                string s = LockClockRules.diagSuffix(true, now, stamp);
                bool shape = s == "";
                if (!shape && s.StartsWith(" mono=", StringComparison.Ordinal) && s.EndsWith("s", StringComparison.Ordinal))
                {
                    string n = s.Substring(6, s.Length - 7);
                    string digits = n.StartsWith("-", StringComparison.Ordinal) ? n.Substring(1) : n;
                    shape = digits.Length > 0 && digits.Length <= 19;
                    foreach (char c in digits) shape = shape && c >= '0' && c <= '9';
                    shape = shape && (n == digits || n == "-1" || n == "-2");
                }
                Assert.IsTrue(shape, "the diag tail is fixed words and digits: [" + s + "] for now " + now + ", twin " + stamp);
                Assert.AreEqual(now == null, s == "", "a tail exactly when the platform has the clock: now " + now + ", twin " + stamp);
            }
        }
    }

    [TestMethod]
    public void now_ms_is_null_in_the_harness()
    {
        // the harness compiles the non-Android side of nowMs(): no second clock. (Android's side is `#if ANDROID`, not built here.)
        Assert.AreEqual((long?)null, LockClockRules.nowMs(), "nowMs() is null in the harness build (no second clock off Android)");
        Assert.AreEqual((long?)null, LockClockRules.nowMs(), "…and stays null on a second call (no state)");
        // so in the harness build, and on iPhone / Mac / Windows, the rule fed by nowMs() is the wall rule alone
        Assert.IsTrue(rule(30, LockClockRules.nowMs(), LockClockRules.nowMs(), Min), "fed by nowMs() here: away 30 s → inside, as the base");
        Assert.IsFalse(rule(61, LockClockRules.nowMs(), LockClockRules.nowMs(), Min), "fed by nowMs() here: away 61 s → outside, as the base");
    }
}
