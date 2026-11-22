// ★ defaultsb (Defaults batch, Damir's ruling 1750; contract docs/contract-defaultsb.md § 5) — EXECUTED: the REAL
// Spixi/Utils/DefaultsRules.cs and the REAL SpixiFlags.init over the stubbed Preferences (Stubs.cs / StubsS16.cs):
//   · the App lock reader (the body App.isLockEnabled() had): absent = Off — an EXISTING account keeps its behaviour;
//   · writeNewAccount: the two FIXED defaults of a new account, each behind its switch, `paymentauth` only where the platform has
//     the row, no other key touched, nothing removed, a throw of one write does not escape;
//   · withinGrace: the old expression (`>= 0 && <= 5`) with the bound as the only variable (60 with the switch on);
//   · the three switches: absent = ON, a stored 0 acts only in dev mode, each key its own switch, ONE [FLAGS] line, the LAST of init.
// NOT executed here (MAUI-bound, the harness cannot compile them): the two call sites in LaunchPage.xaml.cs and the two statements
// in App.xaml.cs — scripts/pins-defaultsb/a-defaults.mjs holds their text (a source pin, its limits in its first lines).
// Every test starts from an EMPTY preference dictionary and puts the dictionary it found back (fresh()).
// DELIBERATE BREAKS (#802, builder B1; each ONE mutation in a copy of the tree, run from the copy, then restored; the red tests in
// brackets): m1 lockEnabledStored `bool locked = false` → `true` [lock_absent_reads_off, lock_stored_reads_back, +3]; m2 LockKey
// "lockenabled" → "lockenable" [lock_stored_reads_back, new_account_writes_both, +3]; m3 `if (appLockOn)` → `if (!appLockOn)`
// [new_account_writes_both, switch_off_…, pay_not_supported_…, writes_touch_no_other_key, a_failed_write_…, create_after_a_wipe_…,
// call_site_…]; m4 `payConfirmOn && paySupported` → `||` [switch_off_…, pay_not_supported_…, writes_touch_no_other_key, call_site_…];
// m5 `Set(payKey, true)` → `false` [new_account_writes_both, +4]; m6 the pay warning's `ex.GetType().Name` → `ex.Message`
// [a_failed_write_does_not_escape]; m7 `secondsAway >= 0` → `> 0` [within_grace_bounds]; m8 GraceSecondsNew 60 → 61
// [within_grace_bounds, call_site_…]; m13 GraceSecondsOld 5 → 6 [within_grace_bounds]; m9 flagsLine `"60" : "5"` swapped
// [flags_line_text, the three init_*]; m10 SpixiFlags `LockDelayOneMinute = …effectiveFlag(dev, dl)` → `dp`
// [init_each_switch_its_own_key]; m11 the read `Get(DefaultAppLockOnKey, 1)` → `, 0)` [init_absent_is_on, init_each_switch_…];
// m12 `DefaultPayConfirmOn = …effectiveFlag(dev, dp)` → `(true, dp)` [init_stored_zero_acts_only_in_dev_mode]; an extra
// `Logging.info(…)` after the defaultsb line [the three init_*: the second to last line; + FixB2PayTests.pay_flags_defaults_and_dev_mode]; ★ merge defaultsb x photo1b (2026-11-22): `readPhoto1b();` swapped with the defaultsb group, or an extra statement between them [the three init_*, FixB2PayTests, Photo1bFlagsTests].
// ★ #46 round 1 (R1-2, fix builder): m14 stampAfterUnlock `oneMinute ? null : stamp` → `oneMinute ? stamp : null`
// [stamp_after_unlock: "switch on: the stamp is cleared"]; m15 `: stamp` → `: null` [stamp_after_unlock: "switch off: the stamp is
// kept"]; m16 the body → `return stamp;` [stamp_after_unlock: "switch on: the stamp is cleared"].
using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Maui.Storage;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class DefaultsTests
{
    private const string Lock = "lockenabled";
    private const string Pay = "paymentauth";
    private static readonly string[] FlagKeys = { "flagDefaultAppLockOn", "flagDefaultPayConfirmOn", "flagLockDelayOneMinute" };

    private static Preferences P => Preferences.Default;
    private static List<string> Lines => IXICore.Meta.Logging.lines;
    private static List<string> Warns => IXICore.Meta.Logging.warns;

    /** One test body over an EMPTY preference dictionary and empty logs; the dictionary found is put back and the flags are
     *  computed again from it (init), so no other test class sees a key or a switch of this one. */
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
            SpixiFlags.init();
            Lines.Clear();
            Warns.Clear();
        }
    }

    private static string state() => (SpixiFlags.DefaultAppLockOn ? "1" : "0") + (SpixiFlags.DefaultPayConfirmOn ? "1" : "0") + (SpixiFlags.LockDelayOneMinute ? "1" : "0");

    /** Run the REAL init with dev mode `dev` and the three keys `stored` (null = absent). */
    private static void init(bool dev, int?[] stored)
    {
        P.d.Clear();
        if (dev) P.Set("devMode", true);
        for (int i = 0; i < FlagKeys.Length; i++)
        {
            if (stored[i] != null) P.Set(FlagKeys[i], stored[i]!.Value);
        }
        Lines.Clear();
        SpixiFlags.init();
    }

    /** The defaultsb [FLAGS] line of the last init: exactly one, it says `want`, directly after the photo1a line, and ONLY the photo1b line follows it (the very last).
     *  ★ merge defaultsb x photo1b (2026-11-22): init now ends photo1a line, defaultsb line, photo1b line (SpixiFlags.readPhoto1b, the last call) — so this line is the SECOND to last. */
    private static void oneLine(string want, string why)
    {
        var mine = Lines.Where(l => l.StartsWith("[FLAGS] defaultsb ", StringComparison.Ordinal)).ToList();
        Assert.AreEqual(1, mine.Count, why + ": the line is logged exactly once — " + string.Join("|", Lines));
        Assert.AreEqual(want, mine[0], why + ": the line matches the state");
        Assert.AreEqual(Lines.Count - 2, Lines.IndexOf(mine[0]), why + ": the second to last line of init (only the photo1b line follows)");
        Assert.IsTrue(Lines.Count >= 3 && Lines[Lines.Count - 3].StartsWith("[FLAGS] photo1a ", StringComparison.Ordinal), why + ": directly after the photo1a line");
        Assert.IsTrue(Lines[Lines.Count - 1].StartsWith("[FLAGS] photo1b ", StringComparison.Ordinal), why + ": the photo1b line is the very last line");
    }

    /* ===================== the App lock reader (an existing account) ===================== */

    [TestMethod]
    public void lock_absent_reads_off()
    {
        fresh(() =>
        {
            Assert.IsFalse(DefaultsRules.lockEnabledStored(), "no `lockenabled` key (an existing account that never turned the lock on) → Off");
            Assert.AreEqual(0, P.d.Count, "the reader writes nothing");
            P.Set(Pay, true);
            P.Set("walletpass", "x");
            Assert.IsFalse(DefaultsRules.lockEnabledStored(), "other keys do not turn the lock on");
        });
    }

    [TestMethod]
    public void lock_stored_reads_back()
    {
        fresh(() =>
        {
            P.Set(Lock, true);
            Assert.IsTrue(DefaultsRules.lockEnabledStored(), "stored true → On");
            P.Set(Lock, false);
            Assert.IsFalse(DefaultsRules.lockEnabledStored(), "stored false (the user turned it off after an auth) → Off");
            P.Remove(Lock);
            Assert.IsFalse(DefaultsRules.lockEnabledStored(), "removed → Off");
            Assert.AreEqual("lockenabled", DefaultsRules.LockKey, "the key name");
        });
    }

    /* ===================== the two defaults of a new account ===================== */

    [TestMethod]
    public void new_account_writes_both()
    {
        fresh(() =>
        {
            DefaultsRules.writeNewAccount(true, true, true, Pay);
            Assert.IsTrue(P.d.TryGetValue(Lock, out var l) && l == "True", "lockenabled = True");
            Assert.IsTrue(P.d.TryGetValue(Pay, out var p) && p == "True", "paymentauth = True");
            Assert.AreEqual(2, P.d.Count, "exactly the two keys");
            Assert.IsTrue(DefaultsRules.lockEnabledStored(), "the reader sees the lock On");
            Assert.IsTrue(P.Get(Pay, false), "SPayments.paymentAuthEnabled's read (Get(…, false)) sees On");
            Assert.AreEqual(1, Lines.Count, "ONE info line");
            Assert.AreEqual("[DEFAULTS] new account: applock=1 pay=1", Lines[0], "the fixed line");
            Assert.AreEqual(0, Warns.Count, "no warning");
        });
    }

    [TestMethod]
    public void switch_off_leaves_the_key_absent()
    {
        fresh(() =>
        {
            DefaultsRules.writeNewAccount(false, false, true, Pay);
            Assert.AreEqual(0, P.d.Count, "both switches off → nothing written (the old path)");
            Assert.IsFalse(DefaultsRules.lockEnabledStored(), "the lock reads Off");
            Assert.AreEqual("[DEFAULTS] new account: applock=0 pay=0", Lines[Lines.Count - 1], "the line says nothing was written");
        });
        fresh(() =>
        {
            DefaultsRules.writeNewAccount(false, true, true, Pay);
            Assert.IsFalse(P.d.ContainsKey(Lock), "App lock switch off → `lockenabled` stays absent");
            Assert.IsTrue(P.d.ContainsKey(Pay) && P.d[Pay] == "True", "its own switch: Confirm payments is still written");
            Assert.AreEqual("[DEFAULTS] new account: applock=0 pay=1", Lines[Lines.Count - 1], "the line");
        });
        fresh(() =>
        {
            DefaultsRules.writeNewAccount(true, false, true, Pay);
            Assert.IsTrue(P.d.ContainsKey(Lock) && P.d[Lock] == "True", "its own switch: App lock is still written");
            Assert.IsFalse(P.d.ContainsKey(Pay), "Confirm payments switch off → `paymentauth` stays absent");
            Assert.AreEqual("[DEFAULTS] new account: applock=1 pay=0", Lines[Lines.Count - 1], "the line");
        });
    }

    [TestMethod]
    public void pay_not_supported_writes_no_paymentauth()
    {
        fresh(() =>
        {
            DefaultsRules.writeNewAccount(true, true, false, Pay);   // Windows: SPayments.paymentAuthSupported() is false
            Assert.IsFalse(P.d.ContainsKey(Pay), "no Confirm payments row on this platform → no `paymentauth`");
            Assert.IsTrue(DefaultsRules.lockEnabledStored(), "App lock is written all the same");
            Assert.AreEqual(1, P.d.Count, "one key");
            Assert.AreEqual("[DEFAULTS] new account: applock=1 pay=0", Lines[Lines.Count - 1], "the line");
        });
        fresh(() =>
        {
            DefaultsRules.writeNewAccount(false, false, false, Pay);
            Assert.AreEqual(0, P.d.Count, "nothing at all");
        });
    }

    [TestMethod]
    public void writes_touch_no_other_key()
    {
        var other = new Dictionary<string, string>
        {
            { "walletpass", "secret" }, { "devMode", "True" }, { "backupReminderTimestamp", "123" }, { "walletCreatedHere", "1" },
            { "lockIdleMinutes", "10" }, { "flagDefaultAppLockOn", "0" }, { "last_sightings", "Abc:9000" },
        };
        foreach (bool a in new[] { false, true })
        foreach (bool b in new[] { false, true })
        foreach (bool s in new[] { false, true })
        {
            fresh(() =>
            {
                foreach (var kv in other) P.d[kv.Key] = kv.Value;
                DefaultsRules.writeNewAccount(a, b, s, Pay);
                var want = new Dictionary<string, string>(other);
                if (a) want[Lock] = "True";
                if (b && s) want[Pay] = "True";
                string why = "appLock=" + a + " pay=" + b + " supported=" + s;
                Assert.AreEqual(want.Count, P.d.Count, why + ": no key more, no key less — " + string.Join(",", P.d.Keys));
                foreach (var kv in want)
                {
                    Assert.IsTrue(P.d.TryGetValue(kv.Key, out var v) && v == kv.Value, why + ": `" + kv.Key + "` is as expected");
                }
            });
        }
        // it removes nothing: a switch that is off leaves a key that is already there as it is
        fresh(() =>
        {
            P.Set(Lock, true);
            P.Set(Pay, true);
            DefaultsRules.writeNewAccount(false, false, true, Pay);
            Assert.IsTrue(P.d[Lock] == "True" && P.d[Pay] == "True" && P.d.Count == 2, "both switches off: the two keys are not removed and not changed");
            DefaultsRules.writeNewAccount(true, true, false, Pay);
            Assert.IsTrue(P.d[Pay] == "True", "not supported: an existing `paymentauth` is not removed");
        });
        // the log lines hold fixed words and 0|1 only — never a key value
        fresh(() =>
        {
            P.Set("walletpass", "secret-pass");
            DefaultsRules.writeNewAccount(true, true, true, Pay);
            Assert.IsTrue(Lines.All(l => System.Text.RegularExpressions.Regex.IsMatch(l, "^\\[DEFAULTS\\] new account: applock=[01] pay=[01]$")), "fixed words — " + string.Join("|", Lines));
        });
    }

    [TestMethod]
    public void a_failed_write_does_not_escape()
    {
        fresh(() =>
        {
            // the stub's Set throws for a null key (ArgumentNullException): the pay write fails, nothing escapes, the lock write stands
            DefaultsRules.writeNewAccount(true, true, true, null!);
            Assert.IsTrue(DefaultsRules.lockEnabledStored(), "the App lock write ran");
            Assert.AreEqual(1, P.d.Count, "no other key");
            Assert.AreEqual(1, Warns.Count, "one warning");
            Assert.AreEqual("[DEFAULTS] pay write failed (ArgumentNullException)", Warns[0], "the exception TYPE only");
            Assert.AreEqual("[DEFAULTS] new account: applock=1 pay=0", Lines[Lines.Count - 1], "the line says what was WRITTEN");
        });
    }

    [TestMethod]
    public void create_after_a_wipe_writes_again()
    {
        fresh(() =>
        {
            DefaultsRules.writeNewAccount(true, true, true, Pay);
            Assert.IsTrue(DefaultsRules.lockEnabledStored() && P.Get(Pay, false), "the first account: both On");
            P.Set(Lock, false);   // the user turns App lock off (Settings, after an auth)
            Assert.IsFalse(DefaultsRules.lockEnabledStored(), "Off stays Off: no reader turns it on again");
            P.d.Clear();          // Delete account: Preferences.Default.Clear()
            Assert.IsFalse(DefaultsRules.lockEnabledStored(), "after the wipe: absent = Off");
            Assert.IsFalse(P.Get(Pay, false), "after the wipe: Confirm payments reads Off");
            DefaultsRules.writeNewAccount(true, true, true, Pay);   // the next create is a create
            Assert.IsTrue(DefaultsRules.lockEnabledStored() && P.Get(Pay, false), "the next account: both On again");
            Assert.AreEqual(2, P.d.Count, "exactly the two keys");
        });
    }

    /* ===================== the lock delay ===================== */

    [TestMethod]
    public void within_grace_bounds()
    {
        Assert.AreEqual(5.0, DefaultsRules.GraceSecondsOld, "the old bound");
        Assert.AreEqual(60.0, DefaultsRules.GraceSecondsNew, "the new bound");
        Assert.AreEqual(5.0, DefaultsRules.graceSeconds(false), "switch off → 5 s");
        Assert.AreEqual(60.0, DefaultsRules.graceSeconds(true), "switch on → 60 s");
        //                 away      old    new
        var rows = new (double s, bool o, bool n)[]
        {
            (-1,     false, false),   // a clock set back: never inside
            (-0.001, false, false),
            (0,      true,  true),
            (5,      true,  true),
            (5.001,  false, true),
            (59.9,   false, true),
            (60,     false, true),
            (60.001, false, false),
            (3600,   false, false),
            (double.MaxValue, false, false),
            (double.PositiveInfinity, false, false),
            (double.NegativeInfinity, false, false),
            (double.NaN, false, false),   // not a number: fail closed (the lock asks)
        };
        foreach (var r in rows)
        {
            Assert.AreEqual(r.o, DefaultsRules.withinGrace(r.s, false), "old path (5 s), away " + r.s);
            Assert.AreEqual(r.n, DefaultsRules.withinGrace(r.s, true), "one minute (60 s), away " + r.s);
            // switch OFF is EXACTLY the old expression of App.OnResume
            Assert.AreEqual(r.s >= 0 && r.s <= 5, DefaultsRules.withinGrace(r.s, false), "the old expression, away " + r.s);
        }
    }

    /** ★ #46 round 1 (R1-2): App.onUnlock's one statement. A verified unlock clears the leaving stamp (switch on), so the next
     *  return is measured from the next leaving edge; switch off keeps the stamp — the old path. It never makes a stamp. */
    [TestMethod]
    public void stamp_after_unlock()
    {
        DateTime? none = null;
        foreach (bool sw in new[] { false, true })
        {
            Assert.IsFalse(DefaultsRules.stampAfterUnlock(none, sw).HasValue, "no stamp stays no stamp (switch " + sw + "): the rule never lays one");
        }
        var stamps = new[] { new DateTime(2026, 11, 18, 9, 30, 0), DateTime.MinValue, DateTime.MaxValue, new DateTime(2026, 11, 18, 9, 30, 0, DateTimeKind.Utc) };
        foreach (DateTime s in stamps)
        {
            Assert.IsFalse(DefaultsRules.stampAfterUnlock(s, true).HasValue, "switch on: the stamp is cleared — " + s.Ticks);
            DateTime? kept = DefaultsRules.stampAfterUnlock(s, false);
            Assert.IsTrue(kept.HasValue, "switch off: the stamp is kept — " + s.Ticks);
            Assert.AreEqual(s.Ticks, kept!.Value.Ticks, "switch off: the SAME stamp, not a new one — " + s.Ticks);
            Assert.AreEqual(s.Kind, kept.Value.Kind, "switch off: the same kind");
        }
        // with the real switch: the store build clears; dev mode with a stored 0 keeps (the old path)
        fresh(() =>
        {
            var s = new DateTime(2026, 11, 18, 9, 30, 0);
            init(false, new int?[] { null, null, null });
            Assert.IsFalse(DefaultsRules.stampAfterUnlock(s, SpixiFlags.LockDelayOneMinute).HasValue, "switch ON (absent): cleared");
            init(true, new int?[] { 1, 1, 0 });
            Assert.AreEqual((DateTime?)s, DefaultsRules.stampAfterUnlock(s, SpixiFlags.LockDelayOneMinute), "switch OFF (dev, stored 0): kept");
        });
    }

    /* ===================== the switches ===================== */

    [TestMethod]
    public void flags_line_text()
    {
        Assert.AreEqual("[FLAGS] defaultsb applock=0 paydefault=0 lockdelay=5", DefaultsRules.flagsLine(false, false, false));
        Assert.AreEqual("[FLAGS] defaultsb applock=1 paydefault=0 lockdelay=5", DefaultsRules.flagsLine(true, false, false));
        Assert.AreEqual("[FLAGS] defaultsb applock=0 paydefault=1 lockdelay=5", DefaultsRules.flagsLine(false, true, false));
        Assert.AreEqual("[FLAGS] defaultsb applock=0 paydefault=0 lockdelay=60", DefaultsRules.flagsLine(false, false, true));
        Assert.AreEqual("[FLAGS] defaultsb applock=1 paydefault=1 lockdelay=60", DefaultsRules.flagsLine(true, true, true));
    }

    [TestMethod]
    public void init_absent_is_on()
    {
        fresh(() =>
        {
            init(false, new int?[] { null, null, null });
            Assert.AreEqual("111", state(), "no keys, dev off → the three switches ON");
            oneLine("[FLAGS] defaultsb applock=1 paydefault=1 lockdelay=60", "absent, dev off");
            init(true, new int?[] { null, null, null });
            Assert.AreEqual("111", state(), "no keys, dev on → ON");
            oneLine("[FLAGS] defaultsb applock=1 paydefault=1 lockdelay=60", "absent, dev on");
            init(true, new int?[] { 1, 1, 1 });
            Assert.AreEqual("111", state(), "stored 1 → ON");
            foreach (string k in FlagKeys) Assert.IsTrue(P.d.ContainsKey(k), "init stores nothing and removes nothing");
            Assert.IsFalse(P.d.ContainsKey(Lock) || P.d.ContainsKey(Pay), "init — a START — writes neither default (an existing account is not touched)");
        });
    }

    [TestMethod]
    public void init_stored_zero_acts_only_in_dev_mode()
    {
        fresh(() =>
        {
            init(true, new int?[] { 0, 0, 0 });
            Assert.AreEqual("000", state(), "dev on + stored 0 → OFF (the old path)");
            oneLine("[FLAGS] defaultsb applock=0 paydefault=0 lockdelay=5", "dev on, 0");
            init(false, new int?[] { 0, 0, 0 });
            Assert.AreEqual("111", state(), "dev off + stored 0 → ON (a stored 0 acts only in dev mode)");
            oneLine("[FLAGS] defaultsb applock=1 paydefault=1 lockdelay=60", "dev off, 0");
        });
    }

    [TestMethod]
    public void init_each_switch_its_own_key()
    {
        fresh(() =>
        {
            init(true, new int?[] { 0, 1, 1 });
            Assert.AreEqual("011", state(), "only App lock off");
            oneLine("[FLAGS] defaultsb applock=0 paydefault=1 lockdelay=60", "applock off");
            init(true, new int?[] { 1, 0, 1 });
            Assert.AreEqual("101", state(), "only Confirm payments off");
            oneLine("[FLAGS] defaultsb applock=1 paydefault=0 lockdelay=60", "pay off");
            init(true, new int?[] { 1, 1, 0 });
            Assert.AreEqual("110", state(), "only the lock delay off");
            oneLine("[FLAGS] defaultsb applock=1 paydefault=1 lockdelay=5", "delay off");
            // no other batch's key moves these three, and these three move no other batch's line
            init(true, new int?[] { null, null, null });
            P.Set("flagPhotoMediaAfterPaint", 0);
            P.Set("flagPayConfirmSafeDefault", 0);
            Lines.Clear();
            SpixiFlags.init();
            Assert.AreEqual("111", state(), "another batch's stored 0 changes none of the three");
        });
    }

    /* ===================== end to end: the switches as the call sites read them ===================== */

    [TestMethod]
    public void call_site_arguments_end_to_end()
    {
        fresh(() =>
        {
            // a store build, a new account on a phone: the call of LaunchPage with the real switches
            init(false, new int?[] { null, null, null });
            P.d.Clear();
            DefaultsRules.writeNewAccount(SpixiFlags.DefaultAppLockOn, SpixiFlags.DefaultPayConfirmOn, true, Pay);
            Assert.IsTrue(DefaultsRules.lockEnabledStored() && P.Get(Pay, false), "switches ON → the new account has both On");
            Assert.IsTrue(DefaultsRules.withinGrace(30, SpixiFlags.LockDelayOneMinute), "30 s away is inside the minute");
            Assert.IsFalse(DefaultsRules.withinGrace(61, SpixiFlags.LockDelayOneMinute), "61 s away is outside: the lock asks");
            // dev mode, the three switches stored 0: the old path, byte for byte in behaviour
            init(true, new int?[] { 0, 0, 0 });
            P.d.Clear();
            DefaultsRules.writeNewAccount(SpixiFlags.DefaultAppLockOn, SpixiFlags.DefaultPayConfirmOn, true, Pay);
            Assert.AreEqual(0, P.d.Count, "switches OFF → nothing written");
            Assert.IsFalse(DefaultsRules.lockEnabledStored(), "the lock reads Off");
            Assert.IsFalse(DefaultsRules.withinGrace(30, SpixiFlags.LockDelayOneMinute), "30 s away is outside the old 5 s");
            Assert.IsTrue(DefaultsRules.withinGrace(5, SpixiFlags.LockDelayOneMinute), "5 s away is inside the old 5 s");
        });
    }
}
