// ★ coldstart1 (#1680, #1596) — the cold-start marks' pure rule, EXECUTED: ColdStartRules (the 33 tokens in the enum's order,
// the line body, the one-shot slot, the store-before-the-logger / write-after rule, the flush that runs once, the `logger`
// anchor with `req=`) and the [P1] grammar of the REAL P1Perf.isValidLine. The Android half (the Stopwatch / process-clock
// reads in P1Perf.cold / coldFlush, the draw listener, the call sites) cannot compile here: scripts/pins-coldstart1/a-lines.mjs
// pins it as source. Every test resets the rule's static state first and last (the rule is process-wide).
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class ColdStartTests
{
    /** The 33 tokens of contract § 3, written out by hand (NOT derived from the enum or the rule). */
    private static readonly string[] Expected = (
        "app_in base_in maui_in maui_build ctor_in config_in logger flags_in lang_in files_in theme_in node_in wallet_in wallet_out " +
        "home_in home_out ctor_out base_out app_out act_in act_base act_hold act_out resume_in resume_out wv_in wv_new wv_out nav_in nav_out " +
        "page page_end draw").Split(' ');

    private const long Freq = 1000;   // one tick = one millisecond: the arithmetic of the tests is easy to read
    private static readonly Regex Grammar = new Regex("^[a-z0-9_.=-]{1,40}$");
    private static readonly Regex BodyShape = new Regex("^cold ([a-z_]+) t=(\\d+)( req=(\\d+))?$");
    private static readonly int Logger = Array.IndexOf(Expected, "logger");

    private static string[] names() => ColdStartRules.Names.ToArray();
    private static long maxMs() => ColdStartRules.MaxMs;

    private static string snake(string pascal)
    {
        var sb = new StringBuilder();
        for (int i = 0; i < pascal.Length; i++)
        {
            char c = pascal[i];
            if (char.IsUpper(c))
            {
                if (i > 0) sb.Append('_');
                sb.Append(char.ToLowerInvariant(c));
            }
            else sb.Append(c);
        }
        return sb.ToString();
    }

    private static void reset() => ColdStartRules.resetForTests();

    /** (name, t, req or -1) of a body that has the fixed shape. */
    private static (string name, long t, long req) parse(string body)
    {
        Match m = BodyShape.Match(body);
        Assert.IsTrue(m.Success, "the body has the fixed shape `cold <token> t=<int>[ req=<int>]` — '" + body + "'");
        return (m.Groups[1].Value, long.Parse(m.Groups[2].Value), m.Groups[4].Success ? long.Parse(m.Groups[4].Value) : -1);
    }

    [TestMethod]
    public void names_are_the_enum_names_in_order()
    {
        string[] enumNames = Enum.GetNames(typeof(ColdMark));
        Assert.AreEqual(33, enumNames.Length, "the enum has 33 members");
        Assert.AreEqual(33, names().Length, "the rule has 33 tokens");
        for (int i = 0; i < 33; i++)
        {
            Assert.AreEqual(snake(enumNames[i]), names()[i], "member " + i + " (" + enumNames[i] + ") → its snake case token");
            Assert.AreEqual(Expected[i], names()[i], "token " + i + " is the contract's");
            Assert.AreEqual(i, (int)Enum.Parse(typeof(ColdMark), enumNames[i]), "the value of " + enumNames[i] + " is its position (implicit 0–32)");
        }
        Assert.AreEqual("ActHold", enumNames[21], "the order of § 3: ActHold sits at 21");
        Assert.AreEqual("Draw", enumNames[32], "…and Draw is last");
        Assert.AreEqual(Logger, (int)Enum.Parse(typeof(ColdMark), "Logger"), "Logger is at the position the rule calls the anchor");
        Assert.AreEqual(33, names().Distinct().Count(), "no token twice");
    }

    [TestMethod]
    public void every_token_passes_the_grammar_and_the_length()
    {
        foreach (string n in names())
        {
            Assert.IsTrue(Grammar.IsMatch(n), "token '" + n + "' passes ^[a-z0-9_.=-]{1,40}$");
            Assert.IsTrue(n.Length >= 1 && n.Length <= 40, "token '" + n + "' is at most 40 characters");
            Assert.IsFalse(n.Any(char.IsDigit), "token '" + n + "' holds no digit (a mark id can never hide in it)");
            Assert.IsTrue(n.Any(char.IsLower) && n[0] != '_' && n[n.Length - 1] != '_' && !n.Contains("__"), "token '" + n + "' is plain snake case");
        }
    }

    [TestMethod]
    public void every_body_passes_the_p1_line_rule_at_the_two_ends()
    {
        Assert.AreEqual(99_999_999L, maxMs(), "MaxMs = 99 999 999");
        Assert.IsTrue(P1Perf.enabled, "the harness compiles the dev bodies");
        for (int id = 0; id < 33; id++)
        {
            foreach (long ms in new long[] { 0, 1, 12345, maxMs() })
            {
                string? b = ColdStartRules.body(id, ms);
                Assert.IsTrue(b != null, "body(" + id + ", " + ms + ") exists");
                Assert.AreEqual("cold " + Expected[id] + " t=" + ms, b!, "the body is `cold <token> t=<ms>`");
                Assert.IsTrue(P1Perf.isValidLine("[P1] " + b), "isValidLine accepts '[P1] " + b + "'");
                Assert.AreEqual(3, b!.Split(' ').Length, "3 tokens: cold, the name, t=");
            }
        }
        string logger = ColdStartRules.body(Logger, maxMs())! + " req=" + maxMs();
        Assert.IsTrue(P1Perf.isValidLine("[P1] " + logger), "the anchor line with req= at MaxMs is a valid line too");
    }

    [TestMethod]
    public void out_of_range_ms_and_a_bad_id_give_null()
    {
        reset();
        try
        {
            Assert.IsTrue(ColdStartRules.body(0, -1) == null, "ms -1 → null");
            Assert.IsTrue(ColdStartRules.body(0, maxMs() + 1) == null, "ms MaxMs+1 → null");
            Assert.IsTrue(ColdStartRules.body(0, long.MinValue) == null && ColdStartRules.body(0, long.MaxValue) == null, "ms at the extremes → null");
            Assert.IsTrue(ColdStartRules.body(0, 0) != null && ColdStartRules.body(0, maxMs()) != null, "0 and MaxMs are inside");
            foreach (int bad in new[] { -1, 33, 34, 1000, int.MinValue, int.MaxValue })
            {
                Assert.IsTrue(ColdStartRules.body(bad, 5) == null, "body: bad id " + bad + " → null");
                Assert.IsTrue(ColdStartRules.mark(bad, 5, Freq) == null, "mark (before the flush): bad id " + bad + " → null");
            }
            ColdStartRules.flush(2000, 100, Freq);
            foreach (int bad in new[] { -1, 33, int.MaxValue })
            {
                Assert.IsTrue(ColdStartRules.mark(bad, 2005, Freq) == null, "mark (after the flush): bad id " + bad + " → null");
            }
            Assert.IsTrue(ColdStartRules.mark(0, 2000 + (99_999_999 + 1 - 100), Freq) == null, "after the flush: a t above MaxMs (100 + the age = MaxMs + 1) → null");
            Assert.IsTrue(ColdStartRules.mark(1, 1000, Freq) == null, "after the flush: a t below 0 (100 − 1000) → null");
        }
        finally { reset(); }
    }

    [TestMethod]
    public void marks_before_the_flush_return_null_and_come_out_in_enum_order_with_the_right_t()
    {
        reset();
        try
        {
            // marks in REVERSE enum order, ts 4000 … 4032 (ms); the flush at ts 5000 with 2000 ms since the process start:
            // t(mark) = 2000 − (5000 − ts)
            for (int id = 32; id >= 0; id--)
            {
                if (id == Logger) continue;   // the logger slot belongs to the flush
                Assert.IsTrue(ColdStartRules.mark(id, 4000 + id, Freq) == null, "before the flush mark " + id + " returns nothing (a store only)");
            }
            Assert.IsTrue(ColdStartRules.anchor(5000, Freq, -1) == null, "the anchor before the flush returns nothing (and leaves the logger slot free)");
            List<string> lines = ColdStartRules.flush(5000, 2000, Freq);
            Assert.AreEqual(32, lines.Count, "32 marks; the logger line is NOT in the flush output (the anchor writes it last)");
            int k = 0;
            for (int i = 0; i < 33; i++)
            {
                if (i == Logger) continue;
                var p = parse(lines[k++]);
                Assert.AreEqual(Expected[i], p.name, "line " + (k - 1) + " is token " + Expected[i] + " (enum order)");
                Assert.AreEqual(2000 - (5000 - (4000 + i)), p.t, "t of " + Expected[i] + " (2000 − the age at the flush)");
                Assert.AreEqual(-1L, p.req, "no req= on a mark line");
            }
            Assert.IsFalse(lines.Any(l => l.Contains("logger")), "the flush output never holds logger");
            Assert.AreEqual("cold logger t=2000", ColdStartRules.anchor(5000, Freq, -1), "the anchor after the flush: the logger line with t = since");
        }
        finally { reset(); }
    }

    [TestMethod]
    public void a_native_stopwatch_frequency_gives_the_same_ms()
    {
        reset();
        try
        {
            const long ns = 1_000_000_000;   // Stopwatch.Frequency on Linux / Android
            Assert.IsTrue(ColdStartRules.mark(0, 4_500_000_000, ns) == null, "a mark before the flush stores");
            List<string> lines = ColdStartRules.flush(5_000_000_000, 2000, ns);
            Assert.AreEqual(1, lines.Count, "one mark (no logger in the flush)");
            Assert.AreEqual("cold app_in t=1500", lines[0], "2000 − (5.000 s − 4.500 s) = 1500 ms");
            Assert.AreEqual("cold logger t=2000", ColdStartRules.anchor(5_000_000_000, ns, -1), "the anchor's t is the since-start value");
            Assert.AreEqual("cold ctor_in t=2250", ColdStartRules.mark((int)ColdMark.CtorIn, 5_250_000_000, ns), "after the flush: since + the age after the flush");
        }
        finally { reset(); }
    }

    [TestMethod]
    public void a_mark_before_the_flush_with_t_out_of_range_is_not_written()
    {
        reset();
        try
        {
            Assert.IsTrue(ColdStartRules.mark(0, 1000, Freq) == null, "stored");
            Assert.IsTrue(ColdStartRules.mark(1, 4900, Freq) == null, "stored");
            List<string> lines = ColdStartRules.flush(5000, 100, Freq);   // 100 − 4000 < 0 for the first
            Assert.AreEqual(1, lines.Count, "the line with t < 0 is dropped (app_in), nothing else: base_in");
            Assert.AreEqual("cold base_in t=0", lines[0], "100 − 100 = 0 stays (0 is inside)");
            Assert.AreEqual("cold logger t=100", ColdStartRules.anchor(5000, Freq, -1), "the anchor");
        }
        finally { reset(); }
    }

    [TestMethod]
    public void a_fractional_stamp_is_rounded_to_the_nearest_ms()
    {
        reset();
        try
        {
            const long f3 = 3;   // one tick = 333.33 ms
            Assert.IsTrue(ColdStartRules.mark((int)ColdMark.AppIn, 1, f3) == null, "stored (333.33 ms)");
            Assert.IsTrue(ColdStartRules.mark((int)ColdMark.BaseIn, 2, f3) == null, "stored (666.67 ms)");
            List<string> lines = ColdStartRules.flush(3, 1000, f3);   // offset 1000 − 1000 = 0
            Assert.AreEqual("cold app_in t=333", lines[0], "333.33 rounds to 333");
            Assert.AreEqual("cold base_in t=667", lines[1], "666.67 rounds to 667 (Math.Floor would give 666)");
            Assert.AreEqual("cold ctor_in t=1000", ColdStartRules.mark((int)ColdMark.CtorIn, 3, f3), "a whole ms stays");
            Assert.AreEqual("cold maui_in t=1333", ColdStartRules.mark((int)ColdMark.MauiIn, 4, f3), "after the flush: 1333.33 → 1333");
            Assert.AreEqual("cold maui_build t=1667", ColdStartRules.mark((int)ColdMark.MauiBuild, 5, f3), "after the flush: 1666.67 → 1667");
        }
        finally { reset(); }
    }

    [TestMethod]
    public void one_shot_before_and_after_the_flush()
    {
        reset();
        try
        {
            Assert.IsTrue(ColdStartRules.mark(3, 4000, Freq) == null, "first store");
            Assert.IsTrue(ColdStartRules.mark(3, 4100, Freq) == null, "the second call before the flush: nothing");
            List<string> lines = ColdStartRules.flush(5000, 2000, Freq);
            Assert.AreEqual(1, lines.Count, "the slot holds the FIRST stamp only: one line");
            Assert.AreEqual("cold maui_build t=1000", lines[0], "2000 − (5000 − 4000): the FIRST stamp (4000), not the second (4100)");
            // after the flush
            string? first = ColdStartRules.mark(4, 5100, Freq);
            Assert.AreEqual("cold ctor_in t=2100", first, "after the flush the first call returns its body at once (2000 + 100)");
            Assert.IsTrue(ColdStartRules.mark(4, 5200, Freq) == null, "the second call after the flush: nothing");
            Assert.IsTrue(ColdStartRules.mark(3, 5300, Freq) == null, "a slot used BEFORE the flush stays used after it");
        }
        finally { reset(); }
    }

    [TestMethod]
    public void the_flush_runs_once_and_the_logger_comes_out_once()
    {
        reset();
        try
        {
            Assert.IsTrue(ColdStartRules.mark(5, 4990, Freq) == null, "stored");
            List<string> first = ColdStartRules.flush(5000, 800, Freq);
            List<string> second = ColdStartRules.flush(9000, 4800, Freq);
            Assert.AreEqual(1, first.Count, "the first flush: ConfigIn");
            Assert.AreEqual(0, second.Count, "a second call returns an empty list");
            string? a1 = ColdStartRules.anchor(5000, Freq, 30);
            string? a2 = ColdStartRules.anchor(5000, Freq, 30);
            Assert.AreEqual("cold logger t=800 req=30", a1, "the logger line comes out once, from the first flush's offset");
            Assert.IsTrue(a2 == null, "the anchor is one-shot: a second call → null");
            // the second flush changed nothing: a later mark still counts from the FIRST anchor
            Assert.AreEqual("cold home_in t=810", ColdStartRules.mark((int)ColdMark.HomeIn, 5010, Freq), "offset of the first flush: 800 + 10");
        }
        finally { reset(); }
    }

    [TestMethod]
    public void after_the_flush_a_mark_returns_its_body_at_once()
    {
        reset();
        try
        {
            Assert.IsTrue(ColdStartRules.mark((int)ColdMark.Logger, 4000, Freq) == null, "before the flush a mark of the logger id writes nothing and stores nothing");
            Assert.IsTrue(ColdStartRules.anchor(5000, Freq, -1) == null, "the anchor before the flush → null");
            ColdStartRules.flush(5000, 800, Freq);
            Assert.AreEqual("cold act_in t=800", ColdStartRules.mark((int)ColdMark.ActIn, 5000, Freq), "at the flush stamp: t = since");
            Assert.AreEqual("cold draw t=4800", ColdStartRules.mark((int)ColdMark.Draw, 9000, Freq), "4 s later");
            Assert.IsTrue(ColdStartRules.mark((int)ColdMark.Logger, 9000, Freq) == null, "after the flush a mark of the logger id still writes nothing (only the anchor writes it)");
            Assert.IsTrue(ColdStartRules.anchor(9000, Freq, -1) != null, "…and the anchor still can (the logger slot was never claimed by mark)");
            Assert.IsTrue(ColdStartRules.mark((int)ColdMark.Logger, 9000, Freq) == null, "…and after the anchor the mark of the logger id is still null");
        }
        finally { reset(); }
    }

    [TestMethod]
    public void req_is_present_only_in_range()
    {
        foreach (long req in new long[] { 0, 1, 250, maxMs() })
        {
            reset();
            ColdStartRules.flush(5000, 800, Freq);
            string line = ColdStartRules.anchor(5000, Freq, req)!;
            Assert.AreEqual("cold logger t=800 req=" + req, line, "req=" + req + " is in range");
            Assert.IsTrue(P1Perf.isValidLine("[P1] " + line), "…and the line is valid");
        }
        foreach (long req in new long[] { -1, -2, long.MinValue, maxMs() + 1, long.MaxValue })
        {
            reset();
            ColdStartRules.flush(5000, 800, Freq);
            string line = ColdStartRules.anchor(5000, Freq, req)!;
            Assert.AreEqual("cold logger t=800", line, "req=" + req + " is out of range: the token is absent");
        }
        reset();
    }

    [TestMethod]
    public void no_body_holds_anything_but_the_fixed_words_and_integers()
    {
        reset();
        try
        {
            for (int id = 0; id < 33; id++)
            {
                string b = ColdStartRules.body(id, 0)!;
                Assert.AreEqual("cold " + Expected[id] + " t=0", b, "ms 0: the only digit of the body is the 0 of t= (the id " + id + " never reaches it)");
                Assert.AreEqual(1, b.Count(char.IsDigit), "exactly one digit at ms 0 (id " + id + ")");
                string b7 = ColdStartRules.body(id, 7)!;
                Assert.AreEqual("cold " + Expected[id] + " t=7", b7, "ms 7");
            }
            // a whole flush: every line has the fixed shape; the digits are the t= (and req=) only
            for (int id = 0; id < 33; id++) { if (id != Logger) ColdStartRules.mark(id, 4000, Freq); }
            var all = ColdStartRules.flush(5000, 1234, Freq);
            all.Add(ColdStartRules.anchor(5000, Freq, 56)!);
            foreach (string l in all)
            {
                var p = parse(l);
                Assert.IsTrue(Expected.Contains(p.name), "'" + p.name + "' is one of the 33 fixed tokens");
                Assert.IsTrue(Regex.Replace(l, "t=\\d+|req=\\d+", "").All(c => !char.IsDigit(c)), "no digit outside t= / req= in '" + l + "'");
            }
            Assert.IsTrue(ColdStartRules.mark(0, 6000, Freq) == null, "(one-shot already used)");
        }
        finally { reset(); }
    }

    [TestMethod]
    public void concurrent_marks_of_one_id_write_exactly_once()
    {
        reset();
        try
        {
            ColdStartRules.flush(5000, 800, Freq);
            int hits = 0;
            Parallel.For(0, 200, i => { if (ColdStartRules.mark((int)ColdMark.WvNew, 5000 + i, Freq) != null) System.Threading.Interlocked.Increment(ref hits); });
            Assert.AreEqual(1, hits, "200 racing calls, one body (the slot claim is one Interlocked.CompareExchange)");
            reset();
            int before = 0;
            Parallel.For(0, 200, i => { if (ColdStartRules.mark((int)ColdMark.Page, 4000 + i, Freq) != null) System.Threading.Interlocked.Increment(ref before); });
            Assert.AreEqual(0, before, "before the flush: nothing is returned by any call");
            Assert.AreEqual(1, ColdStartRules.flush(5000, 2000, Freq).Count, "…and the flush holds the one stored mark");
        }
        finally { reset(); }
    }

    [TestMethod]
    public void reset_for_tests_clears_the_slots_and_the_live_state()
    {
        reset();
        ColdStartRules.mark(0, 4000, Freq);
        ColdStartRules.flush(5000, 800, Freq);
        reset();
        Assert.IsTrue(ColdStartRules.mark(0, 4000, Freq) == null, "after the reset the rule is not live (a store, no body)");
        List<string> again = ColdStartRules.flush(5000, 2000, Freq);
        Assert.AreEqual(1, again.Count, "…and the flush runs again: the mark");
        Assert.IsTrue(ColdStartRules.anchor(5000, Freq, -1) != null, "…and the anchor is free again");
        reset();
    }
}
