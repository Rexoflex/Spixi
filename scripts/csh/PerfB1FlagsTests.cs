// ★ perfb1 (Speed batch 1a, P38–P41) — the four switches' plumbing, EXECUTED: PerfB1Rules.effectiveOptIn (a stored 1 acts only
// in dev mode), the one [FLAGS] line, the dev verb map, and the REAL SpixiFlags.init over the stubbed Preferences (absent =
// 1, 1, 0, 1; a stored 0 acts only in dev mode for the three ON flags; a throwing read keeps the defaults). The DevPage branch
// itself is MAUI-bound: scripts/pins-perfb1/f-flags.mjs pins it.
// DELIBERATE BREAKS (perfb1 builder-d report): ① SpareKeepShortSleep computed with effectiveFlag → init_defaults / init_opt_in
// fail; ② the opt-in read's absent value 1 → init_defaults fails; ③ effectiveOptIn without `devMode &&` → opt_in_truth_table and
// init_opt_in fail. The property default (`= false`) is overwritten by init: the pin holds it.
using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Maui.Storage;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class PerfB1FlagsTests
{
    private static readonly string[] Keys = { "flagWarmOnIdle", "flagSpareRearm", "flagSpareKeepShortSleep", "flagPhoneNoEmptyDetail" };

    private static string state() =>
        (SpixiFlags.WarmOnIdle ? "1" : "0") + (SpixiFlags.SpareRearm ? "1" : "0") + (SpixiFlags.SpareKeepShortSleep ? "1" : "0")
        + (SpixiFlags.PhoneNoEmptyDetail ? "1" : "0");

    /** The perfb1 [FLAGS] lines of the last init: exactly one, and it must say `want`. */
    private static void oneLine(string want, string why)
    {
        var L = IXICore.Meta.Logging.lines;
        var mine = L.Where(l => l.StartsWith("[FLAGS] warmidle=", StringComparison.Ordinal)).ToList();
        Assert.AreEqual(1, mine.Count, why + ": the line is logged exactly once — " + string.Join("|", L));
        Assert.AreEqual(want, mine[0], why + ": the line matches the state");
        int safety = L.FindIndex(l => l.StartsWith("[FLAGS] safeappid=", StringComparison.Ordinal));
        Assert.IsTrue(safety >= 0 && L.IndexOf(mine[0]) == safety + 1, why + ": right after the safety line — " + string.Join("|", L));
    }

    /** Run init with the four keys set to `stored` (null = absent) and dev mode `dev`; restore everything after `check`. */
    private static void withPrefs(bool dev, int?[] stored, Action check)
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

    [TestMethod]
    public void opt_in_truth_table()
    {
        foreach (int s in new[] { -1, 0, 1, 2 })
        {
            Assert.IsFalse(PerfB1Rules.effectiveOptIn(false, s), "dev mode off: stored " + s + " → OFF");
            Assert.AreEqual(s == 1, PerfB1Rules.effectiveOptIn(true, s), "dev mode on: only a stored 1 → ON (stored " + s + ")");
        }
    }

    [TestMethod]
    public void flags_line_text()
    {
        Assert.AreEqual("[FLAGS] warmidle=1 sparerearm=1 sparekeep=0 noemptydetail=1", PerfB1Rules.flagsLine(true, true, false, true));
        Assert.AreEqual("[FLAGS] warmidle=0 sparerearm=0 sparekeep=0 noemptydetail=0", PerfB1Rules.flagsLine(false, false, false, false));
        Assert.AreEqual("[FLAGS] warmidle=1 sparerearm=1 sparekeep=1 noemptydetail=1", PerfB1Rules.flagsLine(true, true, true, true));
        Assert.AreEqual("[FLAGS] warmidle=0 sparerearm=1 sparekeep=1 noemptydetail=0", PerfB1Rules.flagsLine(false, true, true, false));
    }

    [TestMethod]
    public void names_and_keys()
    {
        Assert.AreEqual("warmidle,sparerearm,sparekeep,noemptydetail", string.Join(",", PerfB1Rules.DevSwitchNames));
        Assert.AreEqual(string.Join(",", Keys), string.Join(",", SpixiFlags.PerfB1DevKeys), "the keys, in the names' order");
        Assert.AreEqual(string.Join(",", Keys),
            string.Join(",", new[] { SpixiFlags.WarmOnIdleKey, SpixiFlags.SpareRearmKey, SpixiFlags.SpareKeepShortSleepKey, SpixiFlags.PhoneNoEmptyDetailKey }));
        // no name may collide with a name another devflash branch takes (S16 · S17 · S20 · V1A-M · safety · container · S11 flash)
        string[] taken = { "securepass", "mediagate", "s17", "s17m", "s20size", "s20g", "v1ixihelp", "v1hints", "container",
            "candidate", "grounds", "input" };
        foreach (string n in PerfB1Rules.DevSwitchNames)
        {
            Assert.IsFalse(taken.Contains(n) || SafetyRules.DevSwitchNames.Contains(n), n + " is a name of its own");
        }
    }

    [TestMethod]
    public void dev_verb_map()
    {
        for (int i = 0; i < PerfB1Rules.DevSwitchNames.Length; i++)
        {
            string n = PerfB1Rules.DevSwitchNames[i];
            Assert.IsTrue(PerfB1Rules.devSwitchVerb("ixian:devflash:" + n + ":0", out int idx, out string tail) && idx == i && tail == "0", n + ":0 → index " + i);
            Assert.IsTrue(PerfB1Rules.devSwitchVerb("ixian:devflash:" + n + ":1", out idx, out tail) && idx == i && tail == "1", n + ":1");
        }
        // a name that is no switch, a prefix of one, one with more letters, another family's name, upper case, no colon, null
        foreach (string bad in new[] { "ixian:devflash:warm:0", "ixian:devflash:spare:1", "ixian:devflash:sparerearmx:1",
            "ixian:devflash:warmidle", "ixian:devflash:safeappid:0", "ixian:devflash:candidate:1", "ixian:devflash:WARMIDLE:0",
            "ixian:devflash:Warmidle:0", "IXIAN:DEVFLASH:warmidle:0", "ixian:devflashwarmidle:0", "ixian:warmidle:0", "", "warmidle:0" })
        {
            Assert.IsFalse(PerfB1Rules.devSwitchVerb(bad, out int idx, out string tail), "refused: '" + bad + "'");
            Assert.IsTrue(idx == -1 && tail == "", "refused verb gives index -1, tail '' ('" + bad + "')");
        }
        Assert.IsFalse(PerfB1Rules.devSwitchVerb(null, out int ni, out string nt) || ni != -1 || nt != "", "null → refused");
        // the tail is handed on unchanged; S16PassRules.parseFlagTail (the DevPage test) accepts exactly "0" / "1"
        foreach (string t in new[] { "", "01", "1 ", " 1", "2", "-1", "10", "true", "0:1" })
        {
            Assert.IsTrue(PerfB1Rules.devSwitchVerb("ixian:devflash:sparekeep:" + t, out int idx, out string tail) && idx == 2 && tail == t, "the tail '" + t + "' is passed on");
            Assert.IsFalse(S16PassRules.parseFlagTail(tail, out _), "…and parseFlagTail refuses '" + t + "' (nothing stored)");
        }
        Assert.IsTrue(S16PassRules.parseFlagTail("0", out int v0) && v0 == 0 && S16PassRules.parseFlagTail("1", out int v1) && v1 == 1, "\"0\" / \"1\" pass");
    }

    [TestMethod]
    public void init_defaults()
    {
        withPrefs(false, new int?[] { null, null, null, null }, () =>
        {
            Assert.AreEqual("1101", state(), "no preference, dev mode off → 1,1,0,1");
            oneLine("[FLAGS] warmidle=1 sparerearm=1 sparekeep=0 noemptydetail=1", "defaults");
        });
        withPrefs(true, new int?[] { null, null, null, null }, () =>
        {
            Assert.AreEqual("1101", state(), "no preference, dev mode on → 1,1,0,1");
            oneLine("[FLAGS] warmidle=1 sparerearm=1 sparekeep=0 noemptydetail=1", "defaults in dev mode");
        });
    }

    [TestMethod]
    public void init_stored_zero_acts_only_in_dev_mode()
    {
        withPrefs(false, new int?[] { 0, 0, 0, 0 }, () =>
        {
            Assert.AreEqual("1101", state(), "dev mode off + stored 0 → the three ON flags stay ON");
            oneLine("[FLAGS] warmidle=1 sparerearm=1 sparekeep=0 noemptydetail=1", "dev off, stored 0");
        });
        withPrefs(true, new int?[] { 0, 0, 0, 0 }, () =>
        {
            Assert.AreEqual("0000", state(), "dev mode on + stored 0 → OFF");
            oneLine("[FLAGS] warmidle=0 sparerearm=0 sparekeep=0 noemptydetail=0", "dev on, stored 0");
        });
        string[] want = { "0101", "1001", "1101", "1100" };   // one key at 0 (the opt-in's 0 = its default)
        for (int i = 0; i < Keys.Length; i++)
        {
            int?[] st = { 1, 1, 0, 1 };
            st[i] = 0;
            int k = i;
            withPrefs(true, st, () => Assert.AreEqual(want[k], state(), "dev mode on: only " + Keys[k] + " at 0 acts"));
        }
        withPrefs(true, new int?[] { 2, -1, null, 7 }, () => Assert.AreEqual("1101", state(), "a stray value is the default ON"));
    }

    [TestMethod]
    public void init_opt_in()
    {
        withPrefs(false, new int?[] { 1, 1, 1, 1 }, () =>
        {
            Assert.IsFalse(SpixiFlags.SpareKeepShortSleep, "dev mode off + stored 1 → OFF");
            oneLine("[FLAGS] warmidle=1 sparerearm=1 sparekeep=0 noemptydetail=1", "opt-in, dev off");
        });
        withPrefs(true, new int?[] { 1, 1, 1, 1 }, () =>
        {
            Assert.IsTrue(SpixiFlags.SpareKeepShortSleep, "dev mode on + stored 1 → ON");
            Assert.AreEqual("1111", state(), "the other three stay ON");
            oneLine("[FLAGS] warmidle=1 sparerearm=1 sparekeep=1 noemptydetail=1", "opt-in, dev on");
        });
        foreach (int s in new[] { 0, 2, -1 })
        {
            withPrefs(true, new int?[] { 1, 1, s, 1 }, () => Assert.IsFalse(SpixiFlags.SpareKeepShortSleep, "dev mode on + stored " + s + " → OFF"));
        }
    }

    [TestMethod]
    public void init_throwing_read_keeps_defaults()
    {
        Preferences P = Preferences.Default;
        withPrefs(true, new int?[] { 0, 0, 1, 0 }, () =>
        {
            Assert.AreEqual("0010", state(), "control: the stored values act in dev mode");
            Dictionary<string, string> d = P.d;
            int w0 = IXICore.Meta.Logging.warns.Count;
            try
            {
                P.d = null!;   // every stub Get now throws (NullReferenceException) — the first read, devMode, included
                IXICore.Meta.Logging.lines.Clear();
                SpixiFlags.init();
            }
            finally
            {
                P.d = d;
            }
            Assert.AreEqual("1101", state(), "a read that throws keeps the defaults 1,1,0,1");
            var w = IXICore.Meta.Logging.warns.Skip(w0).ToList();
            Assert.IsTrue(w.Count == 1 && w[0] == "[FLAGS] read failed (NullReferenceException)", "the one type-only warn — " + string.Join("|", w));
            oneLine("[FLAGS] warmidle=1 sparerearm=1 sparekeep=0 noemptydetail=1", "throwing read");
        });
    }

    /* ── #46 r1 B-1 / S-5: the opt-in must not outlive dev mode. SpixiFlags.init runs once; `ixian:disableDevMode` removes the
     * four PerfB1DevKeys and calls SpixiFlags.leaveDevMode BEFORE its dropSpareChat("devmode") (pins-perfb1/f-flags). ── */
    [TestMethod]
    public void leaving_dev_mode_turns_the_opt_in_off_in_process()
    {
        withPrefs(true, new int?[] { 0, 0, 1, 0 }, () =>
        {
            Assert.AreEqual("0010", state(), "dev mode on: the three stored 0 and the opt-in's stored 1 act");
            SpixiFlags.leaveDevMode();
            Assert.IsFalse(SpixiFlags.SpareKeepShortSleep, "leaving dev mode: the opt-in is OFF at once, in this process");
            Assert.AreEqual("0000", state(), "the three ON flags keep this process's state (a switched-off flag = the old path) until the next start");
            SpixiFlags.leaveDevMode();
            Assert.AreEqual("0000", state(), "a second call changes nothing");
        });
        withPrefs(false, new int?[] { null, null, null, null }, () =>
        {
            SpixiFlags.leaveDevMode();
            Assert.AreEqual("1101", state(), "no dev mode: the defaults, nothing else moves");
        });
    }

    [TestMethod]
    public void after_leaving_dev_mode_a_later_dev_mode_on_revives_nothing()
    {
        withPrefs(true, new int?[] { 0, 0, 1, 0 }, () =>
        {
            // the branch: the four keys go (SpixiFlags.PerfB1DevKeys), then the in-process opt-in goes
            foreach (string k in SpixiFlags.PerfB1DevKeys) Preferences.Default.Remove(k);
            SpixiFlags.leaveDevMode();
            Assert.IsFalse(SpixiFlags.SpareKeepShortSleep, "OFF in this process");
            SpixiFlags.init();   // a later start, dev mode switched on again
            Assert.AreEqual("1101", state(), "no stored 1 survives to revive the opt-in, no stored 0 survives either");
            Assert.AreEqual(string.Join(",", Keys), string.Join(",", SpixiFlags.PerfB1DevKeys), "PerfB1DevKeys are exactly the four keys");
        });
    }

    /* ── #46 r2 R2-1: the account wipe is the second way out of dev mode. SettingsPage.wipeEverything runs
     * Preferences.Default.Clear() and the SAME process goes on with a new account — the clear alone does not reach the flag
     * init computed at start, so the wipe calls SpixiFlags.leaveDevMode right after it (pins-perfb1/f-flags). ── */
    [TestMethod]
    public void the_account_wipe_alone_leaves_the_opt_in_on_in_process()
    {
        withPrefs(true, new int?[] { null, null, 1, null }, () =>
        {
            Preferences P = Preferences.Default;
            var snapshot = new Dictionary<string, string>(P.d);
            try
            {
                Assert.IsTrue(SpixiFlags.SpareKeepShortSleep, "dev mode on + a stored 1: the opt-in is ON in this process");
                P.d.Clear();   // the wipe's Preferences.Default.Clear(): dev mode and the key are gone
                Assert.IsTrue(SpixiFlags.SpareKeepShortSleep, "the clear alone leaves the in-process flag ON (init ran once) — the defect");
                SpixiFlags.leaveDevMode();   // the wipe's next statement
                Assert.IsFalse(SpixiFlags.SpareKeepShortSleep, "after the wipe's leaveDevMode: OFF in this process");
                SpixiFlags.init();
                Assert.AreEqual("1101", state(), "and a later start reads the defaults");
            }
            finally
            {
                P.d.Clear();
                foreach (var kv in snapshot) P.d[kv.Key] = kv.Value;
            }
        });
    }
}
