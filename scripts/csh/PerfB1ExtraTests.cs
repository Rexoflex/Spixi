// ★ perfb1toggle (#1595) — the launch intent extra of the adb walk, EXECUTED: PerfB1ExtraRules.parse (the CANON grammar of
// docs/contract-perfb1toggle.md § 3: the 16 legal values; dev mode off refuses; every refusal class refuses WHOLE) and the
// REAL SpixiFlags.storePerfB1Extra over the stubbed Preferences (stores the four keys and logs ONE fixed line only on
// success; a refusal stores and logs nothing; a throwing read fails closed; the running flags do not move — the next init
// reads the store). MainActivity's read is Android-bound: scripts/pins-perfb1toggle/a-extra.mjs pins it.
using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Maui.Storage;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class PerfB1ExtraTests
{
    private const string Canon = "warmidle=1,sparerearm=1,sparekeep=0,noemptydetail=1";
    private static readonly string[] Names = { "warmidle", "sparerearm", "sparekeep", "noemptydetail" };
    private static readonly string[] Keys = { "flagWarmOnIdle", "flagSpareRearm", "flagSpareKeepShortSleep", "flagPhoneNoEmptyDetail" };

    /** The CANON text of four digits, built here from the literal names (not from the rule's own source). */
    private static string canon(int a, int b, int c, int d) =>
        Names[0] + "=" + a + "," + Names[1] + "=" + b + "," + Names[2] + "=" + c + "," + Names[3] + "=" + d;

    private static void refused(string? v, string why)
    {
        Assert.IsTrue(PerfB1ExtraRules.parse(true, v) == null, why + ": refused whole — '" + (v == null ? "null" : v.Length > 80 ? v.Substring(0, 80) + "…(" + v.Length + ")" : v) + "'");
    }

    private static string state() =>
        (SpixiFlags.WarmOnIdle ? "1" : "0") + (SpixiFlags.SpareRearm ? "1" : "0") + (SpixiFlags.SpareKeepShortSleep ? "1" : "0")
        + (SpixiFlags.PhoneNoEmptyDetail ? "1" : "0");

    private static string stored() => string.Join(",", Keys.Select(k => Preferences.Default.d.TryGetValue(k, out var v) ? v : "-"));

    /** Run `check` with dev mode `dev` (null = absent) and the four keys `before` (null = absent); restore everything after. */
    private static void withPrefs(bool? dev, int?[] before, Action check)
    {
        Preferences P = Preferences.Default;
        var snapshot = new Dictionary<string, string>(P.d);
        try
        {
            if (dev == null) P.Remove("devMode"); else P.Set("devMode", dev.Value);
            for (int i = 0; i < Keys.Length; i++)
            {
                if (before[i] == null) P.Remove(Keys[i]); else P.Set(Keys[i], before[i]!.Value);
            }
            IXICore.Meta.Logging.lines.Clear();
            IXICore.Meta.Logging.warns.Clear();
            check();
        }
        finally
        {
            P.d.Clear();
            foreach (var kv in snapshot) P.d[kv.Key] = kv.Value;
            SpixiFlags.init();
            IXICore.Meta.Logging.lines.Clear();
            IXICore.Meta.Logging.warns.Clear();
        }
    }

    /* ── the pure rule ── */

    [TestMethod]
    public void extra_name_and_stored_line()
    {
        Assert.AreEqual("perfb1flags", PerfB1ExtraRules.ExtraName, "the extra's name (the walk sends exactly this)");
        Assert.AreEqual("[FLAGS] perfb1 extra stored", PerfB1ExtraRules.StoredLine, "the stored line (the walk counts exactly this)");
        // the contract's fixed text holds ONE digit, the '1' of the batch word "perfb1"; apart from that word: none
        Assert.AreEqual(1, PerfB1ExtraRules.StoredLine.Count(char.IsDigit), "one digit only (the batch word)");
        Assert.IsFalse(PerfB1ExtraRules.StoredLine.Replace("perfb1", "").Any(char.IsDigit), "no digit outside the word perfb1 (no value, no length)");
        Assert.IsFalse(Names.Any(n => PerfB1ExtraRules.StoredLine.Contains(n)), "the stored line names no switch");
    }

    [TestMethod]
    public void canon_example_is_51_characters_and_parses()
    {
        Assert.AreEqual(51, Canon.Length, "the CANON example of the contract");
        Assert.AreEqual(Canon, canon(1, 1, 0, 1), "the test's own builder gives the example");
        Assert.AreEqual(string.Join(",", Names), string.Join(",", PerfB1Rules.DevSwitchNames), "the rule's names are the contract's, in its order");
        int[]? v = PerfB1ExtraRules.parse(true, Canon);
        Assert.IsTrue(v != null && v.Length == 4, "the example parses to four values");
        Assert.AreEqual("1,1,0,1", string.Join(",", v!), "warmidle=1 sparerearm=1 sparekeep=0 noemptydetail=1");
    }

    [TestMethod]
    public void all_sixteen_legal_values()
    {
        for (int m = 0; m < 16; m++)
        {
            int a = (m >> 3) & 1, b = (m >> 2) & 1, c = (m >> 1) & 1, d = m & 1;
            string s = canon(a, b, c, d);
            int[]? v = PerfB1ExtraRules.parse(true, s);
            Assert.IsTrue(v != null, "legal: " + s);
            Assert.AreEqual(a + "," + b + "," + c + "," + d, string.Join(",", v!), "the values in DevSwitchNames order: " + s);
        }
    }

    [TestMethod]
    public void dev_mode_off_refuses_every_legal_value()
    {
        for (int m = 0; m < 16; m++)
        {
            string s = canon((m >> 3) & 1, (m >> 2) & 1, (m >> 1) & 1, m & 1);
            Assert.IsTrue(PerfB1ExtraRules.parse(false, s) == null, "dev mode off: refused — " + s);
        }
        Assert.IsTrue(PerfB1ExtraRules.parse(false, null) == null, "dev mode off + null");
    }

    [TestMethod]
    public void refuses_null_and_empty()
    {
        refused(null, "null");
        refused("", "empty");
    }

    [TestMethod]
    public void refuses_a_wrong_set_of_names()
    {
        refused(Canon + ",extra=1", "a fifth name");
        refused("warmidle=1,sparerearm=1,sparekeep=0,noemptydetail=1,warmidle=1", "a second copy at the end");
        refused("warmidle=1,sparerearm=1,sparekeep=0", "a missing name");
        refused("sparerearm=1,sparekeep=0,noemptydetail=1", "the first name missing");
        refused("sparerearm=1,warmidle=1,sparekeep=0,noemptydetail=1", "another order");
        refused("warmidle=1,sparerearm=1,noemptydetail=1,sparekeep=0", "another order (the last two)");
        refused("warmidle=1,warmidle=1,sparekeep=0,noemptydetail=1", "a second copy of a name in the place of another");
        refused("sparekeep=0,sparerearm=1,warmidle=1,noemptydetail=1", "warmidle and sparekeep swapped (same length)");
        refused(Canon.ToUpperInvariant(), "upper case");
        refused("warmidle=1,sparerearm=1,sparekeep=0,noemptydetaiL=1", "one upper-case letter in the last name");
        refused("Warmidle=1,sparerearm=1,sparekeep=0,noemptydetail=1", "one upper-case letter");
        refused("warmidlx=1,sparerearm=1,sparekeep=0,noemptydetail=1", "a name with one letter off");
    }

    [TestMethod]
    public void refuses_values_other_than_0_or_1()
    {
        refused("warmidle=2,sparerearm=1,sparekeep=0,noemptydetail=1", "2");
        refused("warmidle=2,sparerearm=0,sparekeep=0,noemptydetail=0", "2 beside three zeros");
        refused("warmidle=0,sparerearm=0,sparekeep=0,noemptydetail=9", "9 in the last place");
        refused("warmidle=1,sparerearm=1,sparekeep=0,noemptydetail=2", "2 in the last place");
        refused("warmidle=01,sparerearm=1,sparekeep=0,noemptydetail=1", "01");
        refused("warmidle=true,sparerearm=1,sparekeep=0,noemptydetail=1", "true");
        refused("warmidle= ,sparerearm=1,sparekeep=0,noemptydetail=1", "a space as the value");
        refused("warmidle=,sparerearm=1,sparekeep=0,noemptydetail=1", "an empty value");
        refused("warmidle=1,sparerearm=1,sparekeep=0,noemptydetail=", "an empty last value");
        refused("warmidle=-,sparerearm=1,sparekeep=0,noemptydetail=1", "a sign");
        refused("warmidle=1,sparerearm=1,sparekeep=0,noemptydetail=١", "a non-ASCII digit (Arabic-Indic one)");
    }

    [TestMethod]
    public void refuses_spaces_and_newlines()
    {
        refused(" " + Canon, "a leading space");
        refused(Canon + " ", "a trailing space");
        refused(Canon + "\n", "a trailing newline");
        refused(Canon + "\r\n", "a trailing CRLF");
        refused("\n" + Canon, "a leading newline");
        refused("warmidle=1, sparerearm=1,sparekeep=0,noemptydetail=1", "a space after a separator");
        refused("warmidle = 1,sparerearm=1,sparekeep=0,noemptydetail=1", "spaces around '='");
        refused(Canon.Substring(0, 50) + "\n", "51 characters with a newline in the last place");
    }

    [TestMethod]
    public void refuses_other_separators()
    {
        refused(Canon.Replace(",", ";"), "';' between the entries");
        refused(Canon.Replace(",", " "), "a space between the entries");
        refused(Canon.Replace(",", "&"), "'&' between the entries");
        refused("warmidle=1;sparerearm=1,sparekeep=0,noemptydetail=1", "one ';'");
        refused("warmidle:1,sparerearm=1,sparekeep=0,noemptydetail=1", "':' in the place of '='");
        refused(Canon.Replace("=", ":"), "':' everywhere");
    }

    [TestMethod]
    public void refuses_longer_and_shorter()
    {
        refused(Canon + Canon, "the example twice");
        refused(Canon + ",", "a trailing separator");
        refused(Canon + "1", "one more digit");
        refused(Canon.Substring(0, 50), "50 characters");
        refused(Canon + new string('x', 100000 - Canon.Length), "100 000 characters");
        refused(new string('x', 100000), "100 000 characters of junk");
    }

    [TestMethod]
    public void a_51_character_text_one_character_off_is_refused()
    {
        int checkedCount = 0;
        for (int i = 0; i < Canon.Length; i++)
        {
            foreach (char r in new[] { 'x', '0', '1', ',', '=', ' ', 'W', '\n' })
            {
                if (r == Canon[i]) continue;
                string s = Canon.Substring(0, i) + r + Canon.Substring(i + 1);
                bool digitPlace = Canon[i] == '0' || Canon[i] == '1';
                if (digitPlace && (r == '0' || r == '1'))
                {
                    Assert.IsTrue(PerfB1ExtraRules.parse(true, s) != null, "the other digit stays legal at " + i);
                    continue;
                }
                refused(s, "position " + i + " changed to '" + (r == '\n' ? "\\n" : r.ToString()) + "'");
                checkedCount++;
            }
        }
        Assert.IsTrue(checkedCount > 300, "every position was changed (" + checkedCount + ")");
    }

    /* ── the REAL store (SpixiFlags.storePerfB1Extra) over the stubbed Preferences ── */

    [TestMethod]
    public void store_with_dev_mode_on_stores_the_four_and_logs_one_line()
    {
        withPrefs(true, new int?[] { null, 1, null, 0 }, () =>
        {
            Assert.IsTrue(SpixiFlags.storePerfB1Extra("warmidle=0,sparerearm=1,sparekeep=1,noemptydetail=0"), "a legal value is stored");
            Assert.AreEqual("0,1,1,0", stored(), "the four keys, in DevSwitchNames order");
            var L = IXICore.Meta.Logging.lines;
            Assert.IsTrue(L.Count == 1 && L[0] == PerfB1ExtraRules.StoredLine, "exactly ONE line, the constant — " + string.Join("|", L));
            Assert.AreEqual(0, IXICore.Meta.Logging.warns.Count, "no warn");
        });
    }

    [TestMethod]
    public void store_with_dev_mode_off_or_absent_stores_and_logs_nothing()
    {
        foreach (bool? dev in new bool?[] { false, null })
        {
            withPrefs(dev, new int?[] { null, null, null, null }, () =>
            {
                Assert.IsFalse(SpixiFlags.storePerfB1Extra(Canon), "dev mode " + (dev == null ? "absent" : "off") + ": refused");
                Assert.AreEqual("-,-,-,-", stored(), "nothing stored");
                Assert.IsTrue(IXICore.Meta.Logging.lines.Count == 0 && IXICore.Meta.Logging.warns.Count == 0, "nothing logged");
            });
        }
    }

    [TestMethod]
    public void store_of_a_refused_value_stores_and_logs_nothing()
    {
        withPrefs(true, new int?[] { 1, 0, 1, 0 }, () =>
        {
            foreach (string? bad in new[] { null, "", Canon + "\n", "warmidle=0,sparerearm=0", "warmidle=0,sparerearm=0,sparekeep=0,noemptydetail=2", Canon.ToUpperInvariant() })
            {
                Assert.IsFalse(SpixiFlags.storePerfB1Extra(bad), "refused: " + (bad ?? "null"));
            }
            Assert.AreEqual("1,0,1,0", stored(), "the keys keep their values — never a part");
            Assert.IsTrue(IXICore.Meta.Logging.lines.Count == 0 && IXICore.Meta.Logging.warns.Count == 0, "nothing logged — " + string.Join("|", IXICore.Meta.Logging.lines));
        });
    }

    [TestMethod]
    public void store_with_a_throwing_preference_fails_closed()
    {
        withPrefs(true, new int?[] { null, null, null, null }, () =>
        {
            Preferences P = Preferences.Default;
            Dictionary<string, string> d = P.d;
            bool result = true, threw = false;
            int e0 = IXICore.Meta.Logging.errors.Count;
            try
            {
                P.d = null!;   // every stub Get / Set now throws (NullReferenceException) — the devMode read included
                result = SpixiFlags.storePerfB1Extra(Canon);
            }
            catch (Exception)
            {
                threw = true;
            }
            finally
            {
                P.d = d;
            }
            Assert.IsFalse(threw, "nothing escapes the store (the activity is never taken down)");
            Assert.IsFalse(result, "a throwing read = refused");
            Assert.AreEqual("-,-,-,-", stored(), "nothing stored");
            Assert.IsTrue(IXICore.Meta.Logging.lines.Count == 0 && IXICore.Meta.Logging.warns.Count == 0 && IXICore.Meta.Logging.errors.Count == e0,
                "nothing logged from the value — " + string.Join("|", IXICore.Meta.Logging.lines.Concat(IXICore.Meta.Logging.warns)));
        });
    }

    /** A key comparer that throws when it meets `trap` (armed after the copy): the stub's Set of that key throws. */
    private sealed class ThrowAt : IEqualityComparer<string>
    {
        public string trap = ""; public bool armed;
        public bool Equals(string? a, string? b) => string.Equals(a, b, StringComparison.Ordinal);
        public int GetHashCode(string k) { if (armed && k == trap) throw new InvalidOperationException("stub write failed"); return k.GetHashCode(); }
    }

    /* #46 r1 S-app-4: a throw in the MIDDLE of the four writes. The documented limit: a refused VALUE never stores a part;
     * a throw at the 3rd Set leaves the first two written (legal 0 / 1 values) — nothing escapes and NO stored line is
     * logged, so the walk's read-back of the next start's [FLAGS] line sees the mismatch and stops. */
    [TestMethod]
    public void store_with_a_throw_at_the_third_write_logs_nothing()
    {
        withPrefs(true, new int?[] { null, null, null, null }, () =>
        {
            Preferences P = Preferences.Default;
            Dictionary<string, string> d = P.d;
            var cmp = new ThrowAt { trap = Keys[2] };
            bool result = true, threw = false;
            try
            {
                P.d = new Dictionary<string, string>(d, cmp);
                cmp.armed = true;
                result = SpixiFlags.storePerfB1Extra("warmidle=0,sparerearm=1,sparekeep=1,noemptydetail=0");
            }
            catch (Exception)
            {
                threw = true;
            }
            finally
            {
                cmp.armed = false;
                foreach (string k in Keys) { if (P.d.TryGetValue(k, out var v)) d[k] = v; else d.Remove(k); }
                P.d = d;
            }
            Assert.IsFalse(threw, "nothing escapes the store");
            Assert.IsFalse(result, "a throw in the writes = refused");
            Assert.AreEqual("0,1,-,-", stored(), "what is left: the first two writes (legal 0 / 1 values), never the 3rd or the 4th");
            Assert.IsTrue(IXICore.Meta.Logging.lines.Count == 0 && IXICore.Meta.Logging.warns.Count == 0,
                "NO stored line, nothing logged — " + string.Join("|", IXICore.Meta.Logging.lines));
        });
    }

    [TestMethod]
    public void store_acts_at_the_next_start_only()
    {
        withPrefs(true, new int?[] { null, null, null, null }, () =>
        {
            SpixiFlags.init();
            // ★ fixb1 item 7 re-base: SpareKeepShortSleep is ON by default — the defaults are 1111 (were 1101)
            Assert.AreEqual("1111", state(), "control: the defaults (fixb1 item 7: sparekeep ON by default)");
            IXICore.Meta.Logging.lines.Clear();
            Assert.IsTrue(SpixiFlags.storePerfB1Extra("warmidle=0,sparerearm=0,sparekeep=1,noemptydetail=0"), "stored");
            Assert.AreEqual("1111", state(), "the running process keeps its flags (read once at start)");
            Assert.IsFalse(IXICore.Meta.Logging.lines.Any(l => l.StartsWith("[FLAGS] warmidle=", StringComparison.Ordinal)), "no state line: init did not run again");
            SpixiFlags.init();   // the next start
            Assert.AreEqual("0010", state(), "the next start reads the stored state (dev mode on)");
        });
    }
}
