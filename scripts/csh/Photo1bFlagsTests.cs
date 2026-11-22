// ★ photo1b (Chat shell batch, #1641 / #1742, contract-photo1b § 4 "Switch → cap" / "The five switches" / "The flags line") — the C# flag
// plumbing, EXECUTED: the five int preferences (flagPhotoTileLite · flagVoiceWaveLite · flagHistoryInsertOnly ·
// flagHistoryAnchorOneTask · flagFadeFromBand) over the REAL SpixiFlags.init and the stubbed Preferences — absent = ON; a stored 0
// acts ONLY while dev mode is on (S16PassRules.effectiveFlag: `!(dev && stored == 0)`, so ANY other stored value — 1, 2, -1, 7 — is ON
// in either mode); each key is its own switch; the one `[FLAGS] photo1b …` line (exactly once, the LAST [FLAGS] line of init, fixed
// words + 0|1); the chat page's caps text (SpixiFlags.Photo1bChatCaps) = exactly the ON caps, comma-led, in the fixed order; a read
// that throws keeps all five ON and adds NO warn of its own (init's own warn is the only one).
// LIMITS: the `= false` start values (before init has run = the old path) cannot be observed here — init has already run by the time
// any test body does; and `caps += SpixiFlags.Photo1bChatCaps;` in SingleChatPage.xaml.cs is MAUI-bound (not compiled by this harness).
// DELIBERATE BREAKS (the photo1b `flags` builder; each made in a full temp copy of the tree, ONE edit, `node scripts/run-csh.mjs`, restored):
//   ① caps order: "olderInsert" ↔ "olderAnchor1" swapped in Photo1bCapWords → keys_and_words, caps_text_order_and_each_switch, init_defaults_all_on,
//     init_stored_zero…, init_each_key…, init_throwing_read…, init_logs_nothing_else red (7; "got …,olderAnchor1,olderInsert,fadeBand")
//   ② a cap word dropped ("fadeBand" → "")                                  → the same set minus init_logs_nothing_else red (6)
//   ③ flags line "olderanchor=" → "olderanchr="                              → flags_line_text, init_defaults_all_on, init_stored_zero…, init_each_key…, init_throwing_read… red (5)
//   ④ the dev rule bypassed (FadeFromBand = fb != 0)                         → init_stored_zero_acts_only_in_dev_mode + init_each_key_is_its_own_switch red ("dev mode off + stored 0 → ON": got 11110)
//   ⑤ the read's absent value of flagHistoryInsertOnly 1 → 0                 → init_defaults_all_on (dev on, absent: got 11011) + init_each_key… red
//   ⑥ HistoryAnchorOneTask read from FadeFromBandKey                         → init_each_key_is_its_own_switch (expected 11101, got 11111) + init_logs_nothing_else red
//   ⑦ catch (Exception) → catch (InvalidOperationException) (a throw escapes) → init_throwing_read_keeps_defaults red (here and in PerfB1FlagsTests)
//   ⑧ a Logging.warn added to the catch                                       → init_throwing_read_keeps_defaults red ("adds no warn of its own"; PerfB1FlagsTests red too)
//   M1 merge with photo1a (2026-11-18): `readPhoto1b();` moved before the photo1a group in init → FixB2PayTests.pay_flags_defaults_and_dev_mode + the Photo1bFlagsTests position checks red (csh 6 red, measured); the four re-based source pins + the SpixiFlags.cs hash (pins-fixb1/g-sparekeep, hash f9e1abe4… → a580a17e…) go red too
//   ⑨ fix round 1 (O3-2): the devMode read's default false → true in readPhoto1b → init_dev_mode_absent_is_off red (the other tests set devMode explicitly)
using System;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.Maui.Storage;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class Photo1bFlagsTests
{
    private static readonly string[] Keys = { "flagPhotoTileLite", "flagVoiceWaveLite", "flagHistoryInsertOnly", "flagHistoryAnchorOneTask", "flagFadeFromBand" };
    private static readonly string[] Words = { "photoTileLite", "voiceWaveLite", "olderInsert", "olderAnchor1", "fadeBand" };
    private const string AllCaps = ",photoTileLite,voiceWaveLite,olderInsert,olderAnchor1,fadeBand";

    private static string state() =>
        (SpixiFlags.PhotoTileLite ? "1" : "0") + (SpixiFlags.VoiceWaveLite ? "1" : "0") + (SpixiFlags.HistoryInsertOnly ? "1" : "0")
        + (SpixiFlags.HistoryAnchorOneTask ? "1" : "0") + (SpixiFlags.FadeFromBand ? "1" : "0");

    /** The caps text the chat page would append for a 5-char state like "10110" (a 1 = ON), written by hand from the fixed order. */
    private static string capsFor(string st)
    {
        string t = "";
        for (int i = 0; i < 5; i++)
        {
            if (st[i] == '1') t += "," + Words[i];
        }
        return t;
    }

    private static string lineFor(string st)
    {
        string[] n = { "tilelite", "voicelite", "olderinsert", "olderanchor", "fadeband" };
        string t = "[FLAGS] photo1b";
        for (int i = 0; i < 5; i++) t += " " + n[i] + "=" + st[i];
        return t;
    }

    /** The photo1b [FLAGS] lines of the last init: exactly one, it says `want`, and it is the LAST [FLAGS] line (init's last call). */
    private static void oneLine(string want, string why)
    {
        var L = IXICore.Meta.Logging.lines;
        var mine = L.Where(l => l.StartsWith("[FLAGS] photo1b ", StringComparison.Ordinal)).ToList();
        Assert.AreEqual(1, mine.Count, why + ": the photo1b line is logged exactly once — " + string.Join("|", L));
        Assert.AreEqual(want, mine[0], why + ": the line matches the state");
        int lastFlags = L.FindLastIndex(l => l.StartsWith("[FLAGS] ", StringComparison.Ordinal));
        Assert.IsTrue(lastFlags == L.IndexOf(mine[0]), why + ": it is the last [FLAGS] line of init — " + string.Join("|", L));
        // ★ merge with photo1a: the order of init is …fixb2 line, photo1a line, photo1b line (readPhoto1b is the last call)
        // ★ merge defaultsb x photo1b (2026-11-22): …fixb2 line, photo1a line, defaultsb line, photo1b line — the defaultsb line sits EXACTLY between the photo1a and the photo1b line
        int fixb2 = L.FindIndex(l => l.StartsWith("[FLAGS] payconfirmdefault=", StringComparison.Ordinal));
        int p1a = L.FindIndex(l => l.StartsWith("[FLAGS] photo1a ", StringComparison.Ordinal));
        int dfb = L.FindIndex(l => l.StartsWith("[FLAGS] defaultsb ", StringComparison.Ordinal));
        Assert.IsTrue(fixb2 >= 0 && p1a == fixb2 + 1 && dfb == p1a + 1 && L.IndexOf(mine[0]) == dfb + 1, why + ": right after the defaultsb line, which follows the photo1a line, which follows the fixb2 line — " + string.Join("|", L));
        Assert.IsTrue(Regex.IsMatch(mine[0], "^\\[FLAGS\\] photo1b tilelite=[01] voicelite=[01] olderinsert=[01] olderanchor=[01] fadeband=[01]$"),
            why + ": fixed words and 0|1 only");
    }

    /** Run init with the five keys set to `stored` (null = absent) and dev mode `dev`; restore everything after `check`. */
    private static void withPrefs(bool? dev, int?[] stored, Action check)
    {
        Preferences P = Preferences.Default;
        string? devBefore = P.d.TryGetValue("devMode", out var dv) ? dv : null;
        try
        {
            if (dev == null) P.Remove("devMode"); else P.Set("devMode", dev.Value);   // null = the preference is ABSENT (a fresh install)
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
    public void keys_and_words()
    {
        Assert.AreEqual(string.Join(",", Keys),
            string.Join(",", new[] { SpixiFlags.PhotoTileLiteKey, SpixiFlags.VoiceWaveLiteKey, SpixiFlags.HistoryInsertOnlyKey, SpixiFlags.HistoryAnchorOneTaskKey, SpixiFlags.FadeFromBandKey }),
            "the five int preference keys of the contract, in the contract's order");
        Assert.AreEqual(AllCaps, SpixiFlags.photo1bChatCaps(true, true, true, true, true), "the five cap words, in the contract's order (the words themselves are private)");
    }

    [TestMethod]
    public void flags_line_text()
    {
        Assert.AreEqual("[FLAGS] photo1b tilelite=1 voicelite=1 olderinsert=1 olderanchor=1 fadeband=1", SpixiFlags.photo1bFlagsLine(true, true, true, true, true));
        Assert.AreEqual("[FLAGS] photo1b tilelite=0 voicelite=0 olderinsert=0 olderanchor=0 fadeband=0", SpixiFlags.photo1bFlagsLine(false, false, false, false, false));
        Assert.AreEqual("[FLAGS] photo1b tilelite=0 voicelite=1 olderinsert=1 olderanchor=1 fadeband=1", SpixiFlags.photo1bFlagsLine(false, true, true, true, true));
        Assert.AreEqual("[FLAGS] photo1b tilelite=1 voicelite=0 olderinsert=1 olderanchor=0 fadeband=1", SpixiFlags.photo1bFlagsLine(true, false, true, false, true));
        Assert.AreEqual("[FLAGS] photo1b tilelite=1 voicelite=1 olderinsert=1 olderanchor=1 fadeband=0", SpixiFlags.photo1bFlagsLine(true, true, true, true, false));
        Assert.AreEqual("[FLAGS] photo1b tilelite=0 voicelite=0 olderinsert=1 olderanchor=1 fadeband=0", SpixiFlags.photo1bFlagsLine(false, false, true, true, false));
        // all 32 combinations: the hand-written line of the state string equals the rule's
        for (int m = 0; m < 32; m++)
        {
            string st = "";
            for (int b = 0; b < 5; b++) st += ((m >> b) & 1) == 1 ? "1" : "0";
            Assert.AreEqual(lineFor(st), SpixiFlags.photo1bFlagsLine(st[0] == '1', st[1] == '1', st[2] == '1', st[3] == '1', st[4] == '1'), "line for " + st);
        }
    }

    [TestMethod]
    public void caps_text_order_and_each_switch()
    {
        Assert.AreEqual(",photoTileLite,voiceWaveLite,olderInsert,olderAnchor1,fadeBand", SpixiFlags.photo1bChatCaps(true, true, true, true, true), "all ON — the contract's text");
        Assert.AreEqual("", SpixiFlags.photo1bChatCaps(false, false, false, false, false), "all OFF = \"\"");
        // each single OFF drops only its own word
        Assert.AreEqual(",voiceWaveLite,olderInsert,olderAnchor1,fadeBand", SpixiFlags.photo1bChatCaps(false, true, true, true, true), "tile OFF");
        Assert.AreEqual(",photoTileLite,olderInsert,olderAnchor1,fadeBand", SpixiFlags.photo1bChatCaps(true, false, true, true, true), "voice OFF");
        Assert.AreEqual(",photoTileLite,voiceWaveLite,olderAnchor1,fadeBand", SpixiFlags.photo1bChatCaps(true, true, false, true, true), "insert OFF");
        Assert.AreEqual(",photoTileLite,voiceWaveLite,olderInsert,fadeBand", SpixiFlags.photo1bChatCaps(true, true, true, false, true), "anchor OFF");
        Assert.AreEqual(",photoTileLite,voiceWaveLite,olderInsert,olderAnchor1", SpixiFlags.photo1bChatCaps(true, true, true, true, false), "fade OFF");
        // each single ON alone
        Assert.AreEqual(",photoTileLite", SpixiFlags.photo1bChatCaps(true, false, false, false, false), "only tile");
        Assert.AreEqual(",fadeBand", SpixiFlags.photo1bChatCaps(false, false, false, false, true), "only fade");
        // all 32 combinations: comma-led, in the fixed order, one word per ON switch
        for (int m = 0; m < 32; m++)
        {
            string st = "";
            for (int b = 0; b < 5; b++) st += ((m >> b) & 1) == 1 ? "1" : "0";
            string got = SpixiFlags.photo1bChatCaps(st[0] == '1', st[1] == '1', st[2] == '1', st[3] == '1', st[4] == '1');
            Assert.AreEqual(capsFor(st), got, "caps for " + st);
            Assert.IsTrue(got == "" || got[0] == ',', "comma-led (or empty) for " + st);
        }
    }

    [TestMethod]
    public void init_defaults_all_on()
    {
        foreach (bool dev in new[] { false, true })
        {
            withPrefs(dev, new int?[] { null, null, null, null, null }, () =>
            {
                Assert.AreEqual("11111", state(), "no preference (dev " + dev + ") → all five ON");
                Assert.AreEqual(AllCaps, SpixiFlags.Photo1bChatCaps, "the caps text of the five ON switches (dev " + dev + ")");
                oneLine("[FLAGS] photo1b tilelite=1 voicelite=1 olderinsert=1 olderanchor=1 fadeband=1", "defaults, dev " + dev);
            });
        }
    }

    [TestMethod]
    public void init_stored_zero_acts_only_in_dev_mode()
    {
        // dev mode OFF: a stored 0 is ignored for every key
        withPrefs(false, new int?[] { 0, 0, 0, 0, 0 }, () =>
        {
            Assert.AreEqual("11111", state(), "dev mode off + stored 0 → all five stay ON");
            Assert.AreEqual(AllCaps, SpixiFlags.Photo1bChatCaps, "…and all five caps are sent");
            oneLine("[FLAGS] photo1b tilelite=1 voicelite=1 olderinsert=1 olderanchor=1 fadeband=1", "dev off, stored 0");
        });
        // dev mode ON: a stored 0 turns the switch OFF
        withPrefs(true, new int?[] { 0, 0, 0, 0, 0 }, () =>
        {
            Assert.AreEqual("00000", state(), "dev mode on + stored 0 → all five OFF");
            Assert.AreEqual("", SpixiFlags.Photo1bChatCaps, "…and no cap is sent");
            oneLine("[FLAGS] photo1b tilelite=0 voicelite=0 olderinsert=0 olderanchor=0 fadeband=0", "dev on, stored 0");
        });
        // the rule as it really is (S16PassRules.effectiveFlag = !(dev && stored == 0)): any other stored value is ON, dev on or off
        foreach (bool dev in new[] { false, true })
        {
            foreach (int v in new[] { 1, 2, -1, 7, int.MaxValue, int.MinValue })
            {
                withPrefs(dev, new int?[] { v, v, v, v, v }, () => Assert.AreEqual("11111", state(), "stored " + v + " (dev " + dev + ") → ON: only a 0 turns a switch off"));
            }
        }
    }

    [TestMethod]
    public void init_dev_mode_absent_is_off()
    {
        // ★ photo1b fix round 1 (O3-2): the store state of a fresh install — "devMode" is not stored at all. The read's default must be
        // false (dev mode off), so a stored 0 does NOT act; every other test sets devMode explicitly and could not see a wrong default.
        withPrefs(null, new int?[] { 0, 0, 0, 0, 0 }, () =>
        {
            Assert.IsFalse(Preferences.Default.d.ContainsKey("devMode"), "control: devMode is absent");
            Assert.AreEqual("11111", state(), "devMode absent + all five stored 0 → all five ON (a stored 0 acts only while dev mode is ON)");
            Assert.AreEqual(AllCaps, SpixiFlags.Photo1bChatCaps, "…and all five caps are sent");
            oneLine("[FLAGS] photo1b tilelite=1 voicelite=1 olderinsert=1 olderanchor=1 fadeband=1", "devMode absent, stored 0");
        });
        withPrefs(null, new int?[] { null, null, null, null, null }, () => Assert.AreEqual("11111", state(), "devMode absent, no key → all five ON"));
    }

    [TestMethod]
    public void init_each_key_is_its_own_switch()
    {
        for (int i = 0; i < Keys.Length; i++)
        {
            int?[] st = { 1, 1, 1, 1, 1 };
            st[i] = 0;
            int k = i;
            string want = "";
            for (int j = 0; j < 5; j++) want += j == k ? "0" : "1";
            withPrefs(true, st, () =>
            {
                Assert.AreEqual(want, state(), "dev mode on: only " + Keys[k] + " at 0 acts");
                Assert.AreEqual(capsFor(want), SpixiFlags.Photo1bChatCaps, "only the word " + Words[k] + " is dropped");
                oneLine(lineFor(want), "only " + Keys[k] + " at 0");
            });
            // the same single 0 with dev mode off changes nothing
            withPrefs(false, st, () => Assert.AreEqual("11111", state(), "dev mode off: " + Keys[k] + " at 0 is ignored"));
            // a single key ABSENT while the others hold 0 (dev on): only that one stays ON
            int?[] z = { 0, 0, 0, 0, 0 };
            z[i] = null;
            string wantZ = "";
            for (int j = 0; j < 5; j++) wantZ += j == k ? "1" : "0";
            withPrefs(true, z, () => Assert.AreEqual(wantZ, state(), "dev mode on: only " + Keys[k] + " absent stays ON, the others at 0 are OFF"));
        }
    }

    [TestMethod]
    public void init_throwing_read_keeps_defaults()
    {
        Preferences P = Preferences.Default;
        withPrefs(true, new int?[] { 0, 0, 0, 0, 0 }, () =>
        {
            Assert.AreEqual("00000", state(), "control: the stored values act in dev mode");
            var d = P.d;
            int w0 = IXICore.Meta.Logging.warns.Count;
            int e0 = IXICore.Meta.Logging.errors.Count;
            try
            {
                P.d = null!;   // every stub Get now throws (NullReferenceException) — devMode included
                IXICore.Meta.Logging.lines.Clear();
                SpixiFlags.init();
            }
            finally
            {
                P.d = d;
            }
            Assert.AreEqual("11111", state(), "a read that throws keeps the defaults: all five ON");
            Assert.AreEqual(AllCaps, SpixiFlags.Photo1bChatCaps, "…and all five caps are sent");
            var w = IXICore.Meta.Logging.warns.Skip(w0).ToList();
            Assert.IsTrue(w.Count == 1 && w[0] == "[FLAGS] read failed (NullReferenceException)", "the photo1b block adds no warn of its own: only init's one type-only warn — " + string.Join("|", w));
            Assert.AreEqual(e0, IXICore.Meta.Logging.errors.Count, "no error line either");
            oneLine("[FLAGS] photo1b tilelite=1 voicelite=1 olderinsert=1 olderanchor=1 fadeband=1", "throwing read");
        });
    }

    [TestMethod]
    public void init_logs_nothing_else()
    {
        withPrefs(true, new int?[] { 0, 1, 0, 1, 0 }, () =>
        {
            // the only line this block writes is the [FLAGS] photo1b line: nothing else in the log mentions a photo1b word, a key or a cap
            var L = IXICore.Meta.Logging.lines;
            foreach (string l in L)
            {
                foreach (string w in Words.Concat(Keys))
                {
                    Assert.IsFalse(l.Contains(w), "no log line carries a cap word or a key: '" + l + "'");
                }
            }
            Assert.AreEqual(1, L.Count(l => l.Contains("photo1b")), "ONE photo1b line");
            Assert.AreEqual("01010", state(), "control: the mixed state");
            Assert.AreEqual(",voiceWaveLite,olderAnchor1", SpixiFlags.Photo1bChatCaps, "the mixed caps text, in the fixed order");
        });
    }
}
