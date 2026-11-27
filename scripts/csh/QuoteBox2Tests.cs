// ★ quotebox2 (contract-quotebox2 § 3a / § 3c / § 4; docs/quotebox2-mechanism.md § 3) — EXECUTED: the REAL QuoteBox2Flags and
// ReplyMatchLog of Spixi/Utils/SpixiFlags.cs (ReplyMatchLog compiled because csh.csproj defines SPIXI_DEV_COEXIST), the REAL
// ReplyQuote.tryMatch / Index of Spixi/Utils/ReplyQuote.cs and the REAL Seed 57 plan of Spixi/Utils/SDevSeedPlan.cs, over the
// stubbed Preferences / Logging of Stubs.cs + StubsS16.cs.
// Shown here: the switch (absent = ON, a stored 0 acts only in dev mode, its own key, a throwing store = ON, the [FLAGS] line text,
// read lazily with ONE line per process); ReplyMatchLog.body (the grammar, the id sanitising, the bounds) and
// ReplyMatchLog.candidates (the probe keys of tryMatch, no time or self filter); and the evidence table E1–E5 of the mechanism doc
// over the seed's own rows, each reply matched by the real tryMatch with its own time and id; the four reply ids of Seed 57 (first 16
// bytes of messageIdFor(56, j), lowercase hex); and the property "tryMatch true → candidates ≥ 1" over the seed replies × the E1–E5 indexes,
// "X: "-prefixed lines and the probe-edge shapes (a rest of 64–68 chars, ": " at 61–65). It is a sampled property, not a proof for every text.
// NOT shown: SingleChatPage (MAUI- and Core-bound, not compiled here): the call of the [QB2] line in tryReplyMatch, the window and the
// deeper read of a real open (the index below is built the way buildReplyIndex builds it: the deeper rows not in the window, then
// the window rows), and the three sweep sites (pins-quotebox2/a-sweep and b-matchlog read those as text).
// DELIBERATE BREAKS (one mutation each in a copy, then node scripts/run-csh.mjs; the red tests in brackets, observed 2026-11-27):
//   q1 QuoteBox2Flags.read `Get(SweepOnForgetKey, 1)` → `, 0)` [flags_absent_is_on, flags_own_switch]
//   q2 flagsLine `"[FLAGS] quotebox2 sweeponforget="` → `"[FLAGS] quotebox2 sweeponforget ="` [flags_line_text, flags_read_lazily_one_line]
//   q3 ReplyMatchLog.candidates `p < Math.Min(rest.Length, ReplyQuote.MaxNameProbeChars)` → `p <= …` [candidates_use_the_probe_keys_of_tryMatch]
//   q4 ReplyMatchLog.body `Math.Max(deep, -1)` → `Math.Max(deep, 0)` [body_grammar, body_bounds]
//   q5 ReplyMatchLog.body `"^[0-9a-f]{1,64}\\z"` → `"^[0-9a-fA-F]{1,64}\\z"` [body_sanitises_the_id]
//   q6 ReplyQuote.tryMatch `replyTimestamp + SkewSeconds)` → `replyTimestamp + SkewSeconds + 1)` [e5_…, and ReplyQuoteTests.the_300s_skew_edge]
//   (round 1, O1 NIT-4 / NIT-3, observed 2026-11-27)
//   q7 SDevSeedPlan.quoteRowIdFor `Array.Copy(qFull, 0, qId, 0, …)` → `Array.Copy(qFull, 1, qId, 0, …)` [seed57_reply_ids_are_the_pinned_16_bytes, WalkTools2SeedTests.no_id_collides_with_seed_01_56]
//   q8 ReplyMatchLog.candidates `Math.Min(rest.Length, ReplyQuote.MaxNameProbeChars)` → `… MaxNameProbeChars - 1)` [candidates_use_the_probe_keys_of_tryMatch, candidates_cover_tryMatch_over_mutated_probe_edges]
//   q9 ReplyMatchLog.candidates the name-probe skip `if (p >= 0 && (… != ' ')) continue;` → `if (p >= 0) continue;` [candidates_use_the_probe_keys_of_tryMatch, candidates_cover_tryMatch_over_the_seed_replies_and_E1_to_E5 (the "X: " lines), candidates_cover_tryMatch_over_mutated_probe_edges]
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;
using IXICore.Streaming;
using Microsoft.Maui.Storage;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class QuoteBox2Tests
{
    private static Preferences P => Preferences.Default;
    private static List<string> Lines => IXICore.Meta.Logging.lines;

    private static void freshProcess()
    {
        typeof(QuoteBox2Flags).GetField("state", BindingFlags.NonPublic | BindingFlags.Static)!.SetValue(null, -1);
        Lines.Clear();
    }

    /** One body over its own preference dictionary; the dictionary found is put back. */
    private static void store(Action body)
    {
        var before = new Dictionary<string, string>(P.d);
        try { P.d.Clear(); freshProcess(); body(); }
        finally { P.d.Clear(); foreach (var kv in before) P.d[kv.Key] = kv.Value; freshProcess(); }
    }

    private static int readWith(bool? dev, int? sweep)
    {
        P.d.Clear();
        if (dev != null) P.Set("devMode", dev.Value);
        if (sweep != null) P.Set(QuoteBox2Flags.SweepOnForgetKey, sweep.Value);
        Lines.Clear();
        int b = QuoteBox2Flags.read();
        Assert.AreEqual(0, Lines.Count, "read() logs nothing");
        return b;
    }

    /* ===================== the switch (§ 3a) ===================== */

    [TestMethod]
    public void flags_key()
    {
        Assert.AreEqual("flagSweepOnForget", QuoteBox2Flags.SweepOnForgetKey);
    }

    [TestMethod]
    public void flags_absent_is_on()
    {
        store(() =>
        {
            foreach (bool? dev in new bool?[] { null, false, true })
            {
                Assert.AreEqual(1, readWith(dev, null), "no key (dev " + dev + ") → ON");
            }
            foreach (int v in new[] { 1, 2, -1, int.MaxValue, int.MinValue })
            {
                Assert.AreEqual(1, readWith(true, v), "stored " + v + " in dev mode → ON: only a 0 turns it off");
            }
        });
    }

    [TestMethod]
    public void flags_stored_zero_acts_only_in_dev_mode()
    {
        store(() =>
        {
            Assert.AreEqual(0, readWith(true, 0), "dev on + 0 → OFF");
            Assert.AreEqual(1, readWith(false, 0), "dev off + 0 → ON");
            Assert.AreEqual(1, readWith(null, 0), "dev absent + 0 → ON");
        });
    }

    [TestMethod]
    public void flags_own_switch()
    {
        store(() =>
        {
            P.d.Clear();
            P.Set("devMode", true);
            P.Set(SmallFixFlags.DeclineClearsKey, 0);
            P.Set(SmallFixFlags.OpusManagedOnlyKey, 0);
            P.Set("flagLockSecondClock", 0);
            Assert.AreEqual(1, QuoteBox2Flags.read(), "another switch's stored 0 leaves it ON");
            P.d.Clear();
            P.Set("devMode", true);
            P.Set(QuoteBox2Flags.SweepOnForgetKey, 0);
            Assert.AreEqual(0, QuoteBox2Flags.read(), "its own 0 turns it off");
            Assert.AreEqual(3, SmallFixFlags.read(), "…and changes no fixb5 switch");
        });
    }

    /** The stub throws by a null dictionary, so the FIRST read (devMode) throws. */
    [TestMethod]
    public void flags_a_throwing_store_is_on()
    {
        Preferences was = Preferences.Default;
        try
        {
            Preferences.Default = new Preferences { d = null! };
            freshProcess();
            Assert.AreEqual(1, QuoteBox2Flags.read(), "a throwing store: ON");
            Assert.AreEqual(0, Lines.Count, "read() logs nothing on a throw");
            Assert.IsTrue(QuoteBox2Flags.SweepOnForget, "the property: ON");
        }
        finally
        {
            Preferences.Default = was;
            freshProcess();
        }
    }

    [TestMethod]
    public void flags_line_text()
    {
        Assert.AreEqual("[FLAGS] quotebox2 sweeponforget=0", QuoteBox2Flags.flagsLine(0));
        Assert.AreEqual("[FLAGS] quotebox2 sweeponforget=1", QuoteBox2Flags.flagsLine(1));
    }

    [TestMethod]
    public void flags_read_lazily_one_line()
    {
        store(() =>
        {
            P.Set("devMode", true);
            P.Set(QuoteBox2Flags.SweepOnForgetKey, 0);
            Assert.AreEqual(0, Lines.Count, "nothing read or logged before the first use");
            Assert.IsFalse(QuoteBox2Flags.SweepOnForget);
            P.Set(QuoteBox2Flags.SweepOnForgetKey, 1);
            Assert.IsFalse(QuoteBox2Flags.SweepOnForget, "a store change after the first read acts at the next start");
            Assert.AreEqual("[FLAGS] quotebox2 sweeponforget=0", string.Join("|", Lines), "ONE line, at the first read");
        });
        store(() =>
        {
            Assert.IsTrue(QuoteBox2Flags.SweepOnForget, "absent: ON");
            Assert.AreEqual("[FLAGS] quotebox2 sweeponforget=1", string.Join("|", Lines));
        });
    }

    /* ===================== ReplyMatchLog.body (§ 3c) ===================== */

    private static readonly Regex Grammar = new Regex(@"^reply match reply=(-|[0-9a-f]{1,64}) found=[01] cand=[0-9]+ deep=(-1|[0-9]+) idx=[0-9]+ via=(load|live) ui=[01]\z");

    [TestMethod]
    public void body_grammar()
    {
        Assert.AreEqual("reply match reply=ab12 found=1 cand=1 deep=1000 idx=1051 via=load ui=0", ReplyMatchLog.body("ab12", true, 1, 1000, 1051, true, false));
        Assert.AreEqual("reply match reply=- found=0 cand=0 deep=-1 idx=51 via=live ui=1", ReplyMatchLog.body(null, false, 0, -1, 51, false, true));
        foreach (bool f in new[] { false, true })
            foreach (bool v in new[] { false, true })
                foreach (bool u in new[] { false, true })
                {
                    string s = ReplyMatchLog.body("0f", f, 3, 7, 9, v, u);
                    Assert.IsTrue(Grammar.IsMatch(s), "the grammar: " + s);
                }
    }

    [TestMethod]
    public void body_sanitises_the_id()
    {
        string h64 = new string('a', 64);
        Assert.IsTrue(ReplyMatchLog.body(h64, true, 1, 1, 1, true, true).StartsWith("reply match reply=" + h64 + " "), "64 hex chars are kept");
        Assert.IsTrue(ReplyMatchLog.body("7", true, 1, 1, 1, true, true).StartsWith("reply match reply=7 "), "one hex char is kept");
        foreach (string? bad in new[] { null, "", h64 + "a", "AB", "abX", "ab cd", "ab\n", "ab\r\ncd", "Mojca", "> QUOTE", "ab٣" })
        {
            string s = ReplyMatchLog.body(bad, true, 1, 1, 1, true, true);
            Assert.IsTrue(s.StartsWith("reply match reply=- found=1 "), "not 1 … 64 lowercase hex → \"-\": [" + bad + "] → " + s);
            Assert.IsTrue(Grammar.IsMatch(s), "the grammar holds: " + s);
        }
    }

    [TestMethod]
    public void body_bounds()
    {
        Assert.AreEqual("reply match reply=a found=0 cand=0 deep=-1 idx=0 via=live ui=0", ReplyMatchLog.body("a", false, -5, -7, -1, false, false), "cand, idx < 0 → 0; deep < -1 → -1");
        Assert.AreEqual("reply match reply=a found=0 cand=0 deep=0 idx=0 via=live ui=0", ReplyMatchLog.body("a", false, 0, 0, 0, false, false), "deep 0 stays 0 (an empty read)");
        Assert.AreEqual("reply match reply=a found=0 cand=0 deep=-1 idx=0 via=live ui=0", ReplyMatchLog.body("a", false, int.MinValue, int.MinValue, int.MinValue, false, false));
        Assert.AreEqual("reply match reply=a found=0 cand=" + int.MaxValue + " deep=" + int.MaxValue + " idx=" + int.MaxValue + " via=live ui=0",
            ReplyMatchLog.body("a", false, int.MaxValue, int.MaxValue, int.MaxValue, false, false));
    }

    /* ===================== ReplyMatchLog.candidates (§ 3c) ===================== */

    private static ReplyQuote.Candidate cand(string id, string text, long ts) => new ReplyQuote.Candidate
    {
        idHex = id, type = FriendMessageType.standard, text = text, timestamp = ts, nameKey = "", expectedName = "",
    };

    private static bool found(string text, long ts, string self, ReplyQuote.Index idx, out ReplyQuote.Match? m) =>
        ReplyQuote.tryMatch(text, ts, self, idx, null, out m) && m != null;

    [TestMethod]
    public void candidates_no_shape_or_no_index_is_zero()
    {
        var idx = new ReplyQuote.Index(new[] { cand("01", "x", 0) });
        Assert.AreEqual(0, ReplyMatchLog.candidates(null, idx), "null text");
        Assert.AreEqual(0, ReplyMatchLog.candidates("x", idx), "not the shape");
        Assert.AreEqual(0, ReplyMatchLog.candidates("> x", idx), "no newline: not the shape");
        Assert.AreEqual(0, ReplyMatchLog.candidates("> x\n", idx), "an empty body: not the shape");
        Assert.AreEqual(0, ReplyMatchLog.candidates("> x\nbody", null), "no index");
        Assert.AreEqual(1, ReplyMatchLog.candidates("> x\nbody", idx), "the shape over the index");
        Assert.AreEqual(0, ReplyMatchLog.candidates("> x\nbody", new ReplyQuote.Index(null)), "an empty index");
    }

    [TestMethod]
    public void candidates_use_the_probe_keys_of_tryMatch()
    {
        // "> Ana: x: y": the keys "Ana: x: y" (p = -1), "x: y" (p = 3), "y" (p = 6); "Ana" and "x" are not keys
        var idx = new ReplyQuote.Index(new[] { cand("01", "Ana: x: y", 0), cand("02", "x: y", 0), cand("03", "y", 0), cand("04", "y", 0), cand("05", "Ana", 0), cand("06", "x", 0) });
        Assert.AreEqual(4, ReplyMatchLog.candidates("> Ana: x: y\nbody", idx), "the three keys, two rows under \"y\"");
        // the name probe stops at MaxNameProbeChars: a ": " at p = 63 is a probe, at p = 64 it is not — as in tryMatch
        string n63 = new string('n', ReplyQuote.MaxNameProbeChars - 1), n64 = new string('n', ReplyQuote.MaxNameProbeChars);
        var z = new ReplyQuote.Index(new[] { cand("0a", "z", 0) });
        Assert.AreEqual(1, ReplyMatchLog.candidates("> " + n63 + ": z\nbody", z), "p = 63: probed");
        Assert.IsTrue(found("> " + n63 + ": z\nbody", 0, "ff", z, out _), "…and tryMatch probes it too");
        Assert.AreEqual(0, ReplyMatchLog.candidates("> " + n64 + ": z\nbody", z), "p = 64: not probed");
        Assert.IsFalse(found("> " + n64 + ": z\nbody", 0, "ff", z, out _), "…and tryMatch does not either");
    }

    [TestMethod]
    public void candidates_have_no_time_or_self_filter()
    {
        var idx = new ReplyQuote.Index(new[] { cand("aa", "t", 10_000), cand("bb", "t", 0) });
        Assert.AreEqual(2, ReplyMatchLog.candidates("> t\nbody", idx), "a row long after the reply and the reply's own id both count");
        Assert.IsFalse(found("> t\nbody", 0, "bb", idx, out _), "tryMatch refuses both (time, self) — cand=2 found=0");
    }

    /* ===================== the evidence table (docs/quotebox2-mechanism.md § 3) ===================== */

    private const int Q = SDevSeedPlan.QuoteChat;
    private const int Window = 51;   // the open's window: want + 1 rows (Config.messagesToLoad = 50)

    private static string hex(byte[] b) => string.Concat(b.Select(x => x.ToString("x2")));   // = Crypto.hashToString

    /** As WalkTools2SeedTests.candidates (= SingleChatPage.replyCandidateOf over a 1:1 text row). */
    private static ReplyQuote.Candidate candOf(SDevSeedPlan.QuoteMsg m) => new ReplyQuote.Candidate
    {
        idHex = hex(SDevSeedPlan.quoteRowIdFor(Q, m.j)), type = FriendMessageType.standard, text = m.text, sequence = 0,
        timestamp = m.ts, localSender = m.local, nameKey = "", expectedName = ReplyQuote.nameFor(""),
    };

    /** As SingleChatPage.buildReplyIndex: the deeper rows the window does not hold, then the window rows (the live copy wins). */
    private static ReplyQuote.Index indexOf(IEnumerable<SDevSeedPlan.QuoteMsg> window, IEnumerable<SDevSeedPlan.QuoteMsg>? deep)
    {
        var all = new List<ReplyQuote.Candidate>();
        var live = new HashSet<string>(window.Select(m => hex(SDevSeedPlan.quoteRowIdFor(Q, m.j))));
        if (deep != null) all.AddRange(deep.Select(candOf).Where(c => !live.Contains(c.idHex)));
        all.AddRange(window.Select(candOf));
        return new ReplyQuote.Index(all);
    }

    /** The four replies A, B, C, D by their depth 0, 1, 170, 230. */
    private static Dictionary<char, SDevSeedPlan.QuoteMsg> repliesOf(List<SDevSeedPlan.QuoteMsg> plan)
    {
        var r = plan.Where(m => m.targetJ >= 0).OrderByDescending(m => m.j).ToList();
        Assert.AreEqual("999,998,829,769", string.Join(",", r.Select(m => m.j)), "A, B, C, D = rows 1000, 999, 830, 770");
        Assert.AreEqual("679,584,514,359", string.Join(",", r.Select(m => m.targetJ)), "their targets = rows 680, 585, 515, 360");
        return new Dictionary<char, SDevSeedPlan.QuoteMsg> { ['A'] = r[0], ['B'] = r[1], ['C'] = r[2], ['D'] = r[3] };
    }

    /** found / cand of one reply over one index, by the real tryMatch with the reply's own time and id. */
    private static (bool found, int cand) run(SDevSeedPlan.QuoteMsg reply, ReplyQuote.Index idx)
    {
        string self = hex(SDevSeedPlan.quoteRowIdFor(Q, reply.j));
        bool f = found(reply.text, reply.ts, self, idx, out ReplyQuote.Match? m);
        if (f) Assert.AreEqual(hex(SDevSeedPlan.quoteRowIdFor(Q, reply.targetJ)), m!.targetIdHex, "row " + (reply.j + 1) + ": found = EXACTLY its planned target");
        return (f, ReplyMatchLog.candidates(reply.text, idx));
    }

    private static void expect(string kase, Dictionary<char, SDevSeedPlan.QuoteMsg> r, ReplyQuote.Index idx, string want)
    {
        // want: per reply "A1/1" = found 1, cand 1; '-' = not checked
        foreach (string part in want.Split(' '))
        {
            char k = part[0];
            var (f, c) = run(r[k], idx);
            string got = k + (f ? "1" : "0") + "/" + c;
            Assert.AreEqual(part, got, kase + " reply " + k + " (found/cand)");
        }
    }

    [TestMethod]
    public void e1_the_whole_chat_finds_all_four()
    {
        var plan = SDevSeedPlan.quotePlan(Q);
        var r = repliesOf(plan);
        expect("E1", r, indexOf(plan.Skip(plan.Count - Window), plan), "A1/1 B1/1 C1/1 D1/1");
        expect("E1 (read only)", r, indexOf(new List<SDevSeedPlan.QuoteMsg>(), plan), "A1/1 B1/1 C1/1 D1/1");
    }

    [TestMethod]
    public void e2_without_row_515_only_C_misses_with_cand_0()
    {
        var plan = SDevSeedPlan.quotePlan(Q);
        var r = repliesOf(plan);
        var read = plan.Where(m => m.j != 514).ToList();
        Assert.AreEqual(999, read.Count, "row 515 left out");
        expect("E2", r, indexOf(plan.Skip(plan.Count - Window), read), "A1/1 B1/1 C0/0 D1/1");
    }

    [TestMethod]
    public void e3_the_window_alone_cannot_match_A_or_B()
    {
        var plan = SDevSeedPlan.quotePlan(Q);
        var r = repliesOf(plan);
        var window = plan.Skip(plan.Count - Window).ToList();
        Assert.IsTrue(window.Contains(r['A']) && window.Contains(r['B']), "A and B are in the open's window");
        Assert.AreEqual(Window, indexOf(window, null).Count, "the index = the 51 rows");
        expect("E3", r, indexOf(window, null), "A0/0 B0/0");
    }

    [TestMethod]
    public void e4_a_short_read_of_the_oldest_500_misses_A_B_and_C()
    {
        var plan = SDevSeedPlan.quotePlan(Q);
        var r = repliesOf(plan);
        var read = plan.Take(500).ToList();
        Assert.AreEqual("0,499", read.First().j + "," + read.Last().j, "the read keeps rows 1 … 500 (j 0 … 499)");
        var idx = indexOf(plan.Skip(plan.Count - Window), read);
        Assert.AreEqual(551, idx.Count, "51 window rows + 500 read rows (none shared)");
        expect("E4", r, idx, "A0/0 B0/0 C0/0 D1/1");
    }

    [TestMethod]
    public void e5_row_515_after_the_reply_plus_300s_C_misses_with_cand_1()
    {
        var plan = SDevSeedPlan.quotePlan(Q);
        var r = repliesOf(plan);
        long cTs = r['C'].ts;
        var t = plan[514];
        Assert.IsTrue(t.isTarget && t.ts < cTs, "row 515 is C's target and older than C in the plan");
        var window = plan.Skip(plan.Count - Window).ToList();
        SDevSeedPlan.QuoteMsg moved(long ts) => new SDevSeedPlan.QuoteMsg { j = t.j, local = t.local, text = t.text, ts = ts, targetJ = t.targetJ, isTarget = t.isTarget };
        var late = plan.Select(m => m.j == 514 ? moved(cTs + ReplyQuote.SkewSeconds + 1) : m).ToList();
        expect("E5", r, indexOf(window, late), "A1/1 B1/1 C0/1 D1/1");
        var edge = plan.Select(m => m.j == 514 ? moved(cTs + ReplyQuote.SkewSeconds) : m).ToList();
        expect("E5 edge (+300 s is still in the skew)", r, indexOf(window, edge), "C1/1");
    }

    /* ===================== the Seed 57 reply ids (O1 NIT-4) and candidates ⊇ tryMatch (O1 NIT-3) ===================== */

    [TestMethod]
    public void seed57_reply_ids_are_the_pinned_16_bytes()
    {
        var r = repliesOf(SDevSeedPlan.quotePlan(Q));
        string[] want = { "aad44f7b9711a1188892ba8482508f62", "93522be02a634dc9799ab7fdcbad48a6", "5a68a0b3fbf20abcb919b3554f8f2a3e", "d1d600aeb1c540b1fdf1abc7c3af2649" };
        int i = 0;
        foreach (char k in "ABCD")
        {
            string id = hex(SDevSeedPlan.quoteRowIdFor(Q, r[k].j));
            Assert.AreEqual(want[i++], id, "reply " + k + " (row " + (r[k].j + 1) + "): the first 16 bytes of messageIdFor(56, j), lowercase hex");
            Assert.AreEqual(hex(SDevSeedPlan.messageIdFor(Q, r[k].j)).Substring(0, 32), id, "reply " + k + " = the head of the 32-byte id");
        }
    }

    /** The indexes of E1 – E5, built as the five tests above build them. */
    private static List<(string kase, ReplyQuote.Index idx)> e1to5(List<SDevSeedPlan.QuoteMsg> plan, Dictionary<char, SDevSeedPlan.QuoteMsg> r)
    {
        var window = plan.Skip(plan.Count - Window).ToList();
        var t = plan[514];
        SDevSeedPlan.QuoteMsg moved(long ts) => new SDevSeedPlan.QuoteMsg { j = t.j, local = t.local, text = t.text, ts = ts, targetJ = t.targetJ, isTarget = t.isTarget };
        return new List<(string, ReplyQuote.Index)>
        {
            ("E1", indexOf(window, plan)),
            ("E1 read only", indexOf(new List<SDevSeedPlan.QuoteMsg>(), plan)),
            ("E2", indexOf(window, plan.Where(m => m.j != 514).ToList())),
            ("E3", indexOf(window, null)),
            ("E4", indexOf(window, plan.Take(500).ToList())),
            ("E5", indexOf(window, plan.Select(m => m.j == 514 ? moved(r['C'].ts + ReplyQuote.SkewSeconds + 1) : m).ToList())),
            ("E5 edge", indexOf(window, plan.Select(m => m.j == 514 ? moved(r['C'].ts + ReplyQuote.SkewSeconds) : m).ToList())),
        };
    }

    [TestMethod]
    public void candidates_cover_tryMatch_over_the_seed_replies_and_E1_to_E5()
    {
        var plan = SDevSeedPlan.quotePlan(Q);
        var r = repliesOf(plan);
        int matched = 0, checkedN = 0;
        foreach (var (kase, idx) in e1to5(plan, r))
        {
            foreach (char k in "ABCD")
            {
                string self = hex(SDevSeedPlan.quoteRowIdFor(Q, r[k].j));
                string line = r[k].text.Substring(0, r[k].text.IndexOf('\n'));
                string body = r[k].text.Substring(line.Length);
                // the seed's own line, and a name part "X: " prefixed to its quote line (the name probe at p = 1)
                foreach (string text in new[] { r[k].text, "> X: " + line.Substring(ReplyQuote.LinePrefix.Length) + body })
                {
                    checkedN++;
                    if (found(text, r[k].ts, self, idx, out _))
                    {
                        matched++;
                        Assert.IsTrue(ReplyMatchLog.candidates(text, idx) >= 1, kase + " reply " + k + ": tryMatch true → candidates ≥ 1 (" + (text == r[k].text ? "seed line" : "X: prefixed") + ")");
                    }
                }
            }
        }
        Assert.AreEqual(7 * 4 * 2, checkedN);
        Assert.IsTrue(matched >= 30, "the property is not vacuous: " + matched + " of " + checkedN + " lines matched");
    }

    [TestMethod]
    public void candidates_cover_tryMatch_over_mutated_probe_edges()
    {
        // a name part of `pos` chars + ": " + a tail, the whole rest `len` chars: the ": " at positions 62 / 63 of a rest of 64 / 65 chars (the asked
        // shapes) and their neighbours (len 66 … 68, pos 61, 64, 65: the probe window ends at p = 63, so pos 64 and 65 are no probe)
        int matched = 0, checkedN = 0;
        foreach (int len in new[] { 64, 65, 66, 67, 68 })
            foreach (int pos in new[] { 61, 62, 63, 64, 65 })
            {
                int tailLen = len - pos - 2;
                if (tailLen < 1) continue;   // no room for ": " + a tail — an empty excerpt (see below)
                string tail = new string('z', tailLen), name = new string('n', pos);
                var idx = new ReplyQuote.Index(new[] { cand("0a", tail, 0), cand("0b", name + ": " + tail, 0) });
                string text = "> " + name + ": " + tail + "\nbody";
                Assert.AreEqual(len, (name + ": " + tail).Length, "the rest is " + len + " chars");
                checkedN++;
                bool f = found(text, 0, "ff", idx, out _);
                Assert.AreEqual(pos <= ReplyQuote.MaxNameProbeChars - 1, f, "rest " + len + ", \": \" at " + pos + ": probed up to p = 63 only");
                if (f)
                {
                    matched++;
                    Assert.IsTrue(ReplyMatchLog.candidates(text, idx) >= 1, "rest " + len + ", \": \" at " + pos + ": tryMatch true → candidates ≥ 1");
                }
            }
        Assert.IsTrue(checkedN >= 7 && matched >= 5, "the property is not vacuous (" + matched + " matched of " + checkedN + ")");
        Assert.IsTrue(matched < checkedN, "…and the shapes beyond the probe window are in the set");
        // len 64 with the ": " at 62 leaves an EMPTY tail: no candidate has an empty excerpt, so tryMatch is false and nothing is claimed
        string e = new string('n', 62) + ": ";
        var one = new ReplyQuote.Index(new[] { cand("0a", "z", 0) });
        Assert.IsFalse(found("> " + e + "\nbody", 0, "ff", one, out _), "an empty tail matches nothing");
        Assert.AreEqual(0, ReplyMatchLog.candidates("> " + e + "\nbody", one), "…and candidates is 0 for it, as tryMatch is false");
    }
}
