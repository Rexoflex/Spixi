// ★ fixb4 (Fix batch 4, items 3 + 4; Damir's ruling 1750; contract docs/contract-fixb4.md § 3 / § 4b) — EXECUTED: the REAL
// Spixi/Utils/PageDefaultsRules.cs, the REAL Spixi/Utils/UiCommandText.cs and the REAL SpixiFlags.init over the stubbed Preferences:
//   · newAccountArgs: all 8 combinations of (mediaTap, listCompact, desktop) — media "1" with its switch; density "1" only with its
//     switch AND the desktop (the phone gets nothing); both "0" = null = no push (the old path);
//   · the push text C# sends (UiCommandText.build) for each non-null pair — the exact strings pins-fixb4/b-defaults evaluates in the
//     BUILT launch shell, so the two halves meet on one text;
//   · logLine / flagsLine: fixed words and 0|1 only; 0 / 0 when nothing was sent;
//   · the two switches: absent = ON, a stored 0 acts only in dev mode, each key its own switch, a throwing read keeps both ON and adds
//     no warn, ONE [FLAGS] fixb4 line, the LAST line of init, directly after the photo1b line.
// NOT executed here (MAUI-bound, the harness cannot compile it): LaunchPage.xaml.cs (the helper pushNewAccountPageDefaults and its
// three call lines, and the platform test) — scripts/pins-fixb4/b-defaults.mjs holds their text (a source pin, its limits first).
// DELIBERATE BREAKS (#802; the fixb4 defaults builder, each ONE mutation in a full scratch copy of the tree, `node scripts/run-csh.mjs`
// there, restored; the red tests in brackets): m1 `listCompact && desktop` → `||` [args_all_eight_combinations, both_off_is_no_push,
// push_text_is_the_pinned_text]; m2 logLine's density read from `args![0]` [log_line_text]; m3 flagsLine "listcompact=" →
// "listcompakt=" [flags_line_text + the four init_*]; m4 SpixiFlags `DefaultListCompact = …effectiveFlag(dev, mt)` (the wrong key)
// [init_each_key_is_its_own_switch]; m5 the read `Get(DefaultMediaTapKey, 1)` → `, 0)` [init_absent_is_on,
// init_each_key_is_its_own_switch]; m6 newAccountArgs' `return null;` → `return new string[] { "0", "0" };` [args_all_eight_combinations,
// both_off_is_no_push]. ★ review round 1: m7 mirrorLoadPicturesOff reads `args[1]` [mirror_load_pictures_off: "media 1, density 0"];
// m8 its shape test `args.Length == 2` → `>= 1` [mirror_load_pictures_off: "a wrong shape (one argument)"].
using System;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.Maui.Storage;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class PageDefaultsTests
{
    private static readonly string[] Keys = { "flagDefaultMediaTap", "flagDefaultListCompact" };

    private static string state() => (SpixiFlags.DefaultMediaTapToLoad ? "1" : "0") + (SpixiFlags.DefaultListCompact ? "1" : "0");

    private static string show(string[]? a) => a == null ? "null" : "[" + string.Join(",", a) + "]";

    /** Run init with dev mode `dev` (null = absent) and the two keys `stored` (null = absent); put everything back after `check`. */
    private static void withPrefs(bool? dev, int?[] stored, Action check)
    {
        Preferences P = Preferences.Default;
        string? devBefore = P.d.TryGetValue("devMode", out var dv) ? dv : null;
        try
        {
            if (dev == null) P.Remove("devMode"); else P.Set("devMode", dev.Value);
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

    /** The fixb4 [FLAGS] line of the last init: exactly one, it says `want`, the LAST line of init, right after the photo1b line. */
    private static void oneLine(string want, string why)
    {
        var L = IXICore.Meta.Logging.lines;
        var mine = L.Where(l => l.StartsWith("[FLAGS] fixb4 ", StringComparison.Ordinal)).ToList();
        Assert.AreEqual(1, mine.Count, why + ": the fixb4 line is logged exactly once — " + string.Join("|", L));
        Assert.AreEqual(want, mine[0], why + ": the line matches the state");
        Assert.AreEqual(L.Count - 1, L.IndexOf(mine[0]), why + ": the very last line of init — " + string.Join("|", L));
        Assert.IsTrue(L.Count >= 2 && L[L.Count - 2].StartsWith("[FLAGS] photo1b ", StringComparison.Ordinal), why + ": directly after the photo1b line — " + string.Join("|", L));
        Assert.IsTrue(Regex.IsMatch(mine[0], "^\\[FLAGS\\] fixb4 mediatap=[01] listcompact=[01]$"), why + ": fixed words and 0|1 only");
    }

    [TestMethod]
    public void push_name_and_keys()
    {
        Assert.AreEqual("setNewAccountDefaults", PageDefaultsRules.PushName, "the launch shell's handler name (contract § 3)");
        Assert.AreEqual("flagDefaultMediaTap", SpixiFlags.DefaultMediaTapKey, "item 3's key");
        Assert.AreEqual("flagDefaultListCompact", SpixiFlags.DefaultListCompactKey, "item 4's key");
    }

    [TestMethod]
    public void args_all_eight_combinations()
    {
        // (mediaTap, listCompact, desktop) → the expected args; null = no push
        var table = new (bool m, bool c, bool d, string want)[]
        {
            (false, false, false, "null"),
            (false, false, true,  "null"),
            (false, true,  false, "null"),     // the phone: compact is never written, and nothing else is either → no push
            (false, true,  true,  "[0,1]"),
            (true,  false, false, "[1,0]"),
            (true,  false, true,  "[1,0]"),
            (true,  true,  false, "[1,0]"),    // the phone: media only
            (true,  true,  true,  "[1,1]"),
        };
        foreach (var t in table)
        {
            string[]? a = PageDefaultsRules.newAccountArgs(t.m, t.c, t.d);
            Assert.AreEqual(t.want, show(a), "newAccountArgs(" + t.m + ", " + t.c + ", " + t.d + ")");
            if (a != null)
            {
                Assert.AreEqual(2, a.Length, "two arguments");
                Assert.IsTrue(a.All(x => x == "0" || x == "1"), "each argument is exactly \"0\" or \"1\"");
                Assert.IsTrue(a.Contains("1"), "a non-null pair always writes something (\"0\",\"0\" is never sent)");
            }
        }
    }

    [TestMethod]
    public void both_off_is_no_push()
    {
        Assert.IsTrue(PageDefaultsRules.newAccountArgs(false, false, true) == null, "both switches off, desktop: null (the old path)");
        Assert.IsTrue(PageDefaultsRules.newAccountArgs(false, false, false) == null, "both switches off, phone: null");
        Assert.IsTrue(PageDefaultsRules.newAccountArgs(false, true, false) == null, "media off + compact on a phone: null");
    }

    [TestMethod]
    public void push_text_is_the_pinned_text()
    {
        // the exact text Utils.sendUiCommand hands to sendMessage; pins-fixb4/b-defaults evaluates these three strings in intro.html
        string build(string[] a) => UiCommandText.build(PageDefaultsRules.PushName, a[0], a[1]);
        Assert.AreEqual("executeUiCommand(setNewAccountDefaults,'MQ==','MQ==');", build(PageDefaultsRules.newAccountArgs(true, true, true)!), "both");
        Assert.AreEqual("executeUiCommand(setNewAccountDefaults,'MQ==','MA==');", build(PageDefaultsRules.newAccountArgs(true, true, false)!), "media only (a phone)");
        Assert.AreEqual("executeUiCommand(setNewAccountDefaults,'MA==','MQ==');", build(PageDefaultsRules.newAccountArgs(false, true, true)!), "density only");
    }

    /** ★ fixb4 review round 1 (reader S MINOR-1): the C# mirror of P1 (SAutoDownload.loadPictures) is written Off ONLY when the
     *  push turns P1 Off — every argument shape, and the switch off (media "0" / null) writes nothing. */
    [TestMethod]
    public void mirror_load_pictures_off()
    {
        Assert.IsTrue(PageDefaultsRules.mirrorLoadPicturesOff(new[] { "1", "1" }), "media 1, density 1: the mirror goes Off");
        Assert.IsTrue(PageDefaultsRules.mirrorLoadPicturesOff(new[] { "1", "0" }), "media 1, density 0: the mirror goes Off");
        Assert.IsFalse(PageDefaultsRules.mirrorLoadPicturesOff(new[] { "0", "1" }), "media 0 (the media switch off): nothing");
        Assert.IsFalse(PageDefaultsRules.mirrorLoadPicturesOff(new[] { "0", "0" }), "0 / 0: nothing");
        Assert.IsFalse(PageDefaultsRules.mirrorLoadPicturesOff(null), "no push: nothing");
        Assert.IsFalse(PageDefaultsRules.mirrorLoadPicturesOff(new[] { "1" }), "a wrong shape (one argument): nothing");
        Assert.IsFalse(PageDefaultsRules.mirrorLoadPicturesOff(new[] { "1", "1", "1" }), "a wrong shape (three): nothing");
        Assert.IsFalse(PageDefaultsRules.mirrorLoadPicturesOff(new[] { "true", "1" }), "not exactly \"1\": nothing");
        Assert.IsFalse(PageDefaultsRules.mirrorLoadPicturesOff(new[] { " 1", "1" }), "not exactly \"1\" (a space): nothing");
        // through the real args rule: exactly the combinations whose media switch is ON
        foreach (bool m in new[] { false, true })
            foreach (bool c in new[] { false, true })
                foreach (bool d in new[] { false, true })
                    Assert.AreEqual(m, PageDefaultsRules.mirrorLoadPicturesOff(PageDefaultsRules.newAccountArgs(m, c, d)),
                        "mirror Off exactly when the media switch is on: (" + m + ", " + c + ", " + d + ")");
    }

    [TestMethod]
    public void log_line_text()
    {
        Assert.AreEqual("[DEFAULTS] new account page: mediatap=0 compact=0", PageDefaultsRules.logLine(null), "nothing sent: 0 / 0");
        Assert.AreEqual("[DEFAULTS] new account page: mediatap=1 compact=1", PageDefaultsRules.logLine(new[] { "1", "1" }));
        Assert.AreEqual("[DEFAULTS] new account page: mediatap=1 compact=0", PageDefaultsRules.logLine(new[] { "1", "0" }));
        Assert.AreEqual("[DEFAULTS] new account page: mediatap=0 compact=1", PageDefaultsRules.logLine(new[] { "0", "1" }));
        Assert.AreEqual("[DEFAULTS] new account page: mediatap=0 compact=0", PageDefaultsRules.logLine(new[] { "true", "x" }), "a value that is not \"1\" logs 0");
        Assert.AreEqual("[DEFAULTS] new account page: mediatap=0 compact=0", PageDefaultsRules.logLine(new[] { "1" }), "a wrong shape logs 0 / 0");
        foreach (var a in new[] { PageDefaultsRules.newAccountArgs(true, true, true), PageDefaultsRules.newAccountArgs(true, false, true), PageDefaultsRules.newAccountArgs(false, true, true), PageDefaultsRules.newAccountArgs(false, false, true) })
        {
            Assert.IsTrue(Regex.IsMatch(PageDefaultsRules.logLine(a), "^\\[DEFAULTS\\] new account page: mediatap=[01] compact=[01]$"), "fixed words and 0|1 only: " + show(a));
        }
    }

    [TestMethod]
    public void flags_line_text()
    {
        Assert.AreEqual("[FLAGS] fixb4 mediatap=1 listcompact=1", PageDefaultsRules.flagsLine(true, true));
        Assert.AreEqual("[FLAGS] fixb4 mediatap=1 listcompact=0", PageDefaultsRules.flagsLine(true, false));
        Assert.AreEqual("[FLAGS] fixb4 mediatap=0 listcompact=1", PageDefaultsRules.flagsLine(false, true));
        Assert.AreEqual("[FLAGS] fixb4 mediatap=0 listcompact=0", PageDefaultsRules.flagsLine(false, false));
    }

    [TestMethod]
    public void init_absent_is_on()
    {
        withPrefs(null, new int?[] { null, null }, () => { Assert.AreEqual("11", state(), "a fresh install: both ON"); oneLine("[FLAGS] fixb4 mediatap=1 listcompact=1", "absent, no dev mode"); });
        withPrefs(true, new int?[] { null, null }, () => { Assert.AreEqual("11", state(), "dev mode, absent: both ON"); oneLine("[FLAGS] fixb4 mediatap=1 listcompact=1", "absent, dev mode"); });
    }

    [TestMethod]
    public void init_stored_zero_acts_only_in_dev_mode()
    {
        withPrefs(false, new int?[] { 0, 0 }, () => { Assert.AreEqual("11", state(), "dev mode off: a stored 0 does not act"); oneLine("[FLAGS] fixb4 mediatap=1 listcompact=1", "dev off"); });
        withPrefs(null, new int?[] { 0, 0 }, () => { Assert.AreEqual("11", state(), "dev mode absent: a stored 0 does not act"); });
        withPrefs(true, new int?[] { 0, 0 }, () => { Assert.AreEqual("00", state(), "dev mode on: a stored 0 turns each off"); oneLine("[FLAGS] fixb4 mediatap=0 listcompact=0", "dev on"); });
        withPrefs(true, new int?[] { 1, 2 }, () => { Assert.AreEqual("11", state(), "any other stored value is ON"); });
    }

    [TestMethod]
    public void init_each_key_is_its_own_switch()
    {
        withPrefs(true, new int?[] { 0, null }, () => { Assert.AreEqual("01", state(), "only the media key"); oneLine("[FLAGS] fixb4 mediatap=0 listcompact=1", "media off"); });
        withPrefs(true, new int?[] { null, 0 }, () => { Assert.AreEqual("10", state(), "only the density key"); oneLine("[FLAGS] fixb4 mediatap=1 listcompact=0", "density off"); });
    }

    [TestMethod]
    public void init_throwing_read_keeps_defaults()
    {
        Preferences P = Preferences.Default;
        withPrefs(true, new int?[] { 0, 0 }, () =>
        {
            Assert.AreEqual("00", state(), "control: the stored values act in dev mode");
            var d = P.d;
            int w0 = IXICore.Meta.Logging.warns.Count;
            int e0 = IXICore.Meta.Logging.errors.Count;
            try
            {
                P.d = null!;   // every stub Get now throws (NullReferenceException)
                IXICore.Meta.Logging.lines.Clear();
                SpixiFlags.init();
            }
            finally
            {
                P.d = d;
            }
            Assert.AreEqual("11", state(), "a read that throws keeps the defaults: both ON");
            var w = IXICore.Meta.Logging.warns.Skip(w0).ToList();
            Assert.IsTrue(w.Count == 1 && w[0] == "[FLAGS] read failed (NullReferenceException)", "the fixb4 block adds no warn of its own — " + string.Join("|", w));
            Assert.AreEqual(e0, IXICore.Meta.Logging.errors.Count, "no error line either");
            oneLine("[FLAGS] fixb4 mediatap=1 listcompact=1", "throwing read");
        });
    }
}
