// ★ histcs (History C#: P-28 off the UI thread, HV-5 first older page 50, the HV-0 C# lines; contract-histcs § 2 / § 4) — EXECUTED over the
// REAL Spixi/Utils/SpixiFlags.cs (csh already compiles it): HistcsFlags, OlderDrop, HistoryOlderRules, OlderBusy, OlderPushGate, and
// the REAL SpixiFlags.init over the stubbed Preferences (Stubs.cs / StubsS16.cs) and the stubbed Logging. REAL threads for the gate and
// the busy guard (ManualResetEventSlim / Barrier; every wait for "it happens" is 5 s, every wait for "it still has not happened" is
// 150 ms — a blocked thread must still be blocked after 150 ms and must finish within 5 s once released; nothing relies on a tight time).
// Groups (43 tests): flags (10) · rules: nextShow / usesNewPath (3) · the busy guard (3) · schedule (7) · decide (2) · the push gate (11) ·
// the line builders (5) · "both switches OFF = the base" (2). (★ histcs #46 r1: the header said 39 / flags 9 — the merge's lazy-read test
// was not counted; r1 adds busy_guard_stale_leave_keeps_a_newer_owner, schedule_leaves_with_its_owner_only (the OWNER-aware guard, S-3)
// and gate_enter_twice_same_flag_one_exit_frees (O2 NIT-3); flags_line_taken_once now races the FIRST take on a reset flag.)
// NOT executed here (MAUI-bound, the harness cannot compile SingleChatPage.xaml.cs): loadMoreIn, the OlderJob members, olderClosedEarly,
// the insertions of loadMessages / insertMessage / UiBatch, pushPendingJump — scripts/pins-histcs/a-path.mjs (a3-a7, a11) and b-lines.mjs
// read their TEXT (source pins, their limits are their first lines).
// What this file cannot show: that a pool thread of the app really reads Core's list while the UI thread draws (no WebView here), the
// order of a live arrival against a prepend (Core's network thread), and the device timing — the walk rows of docs/walk-histcs.md.
// P1Perf.isValidBody is PRIVATE (P1Perf.cs:282): the grammar is reached through the internal P1Perf.isValidLine("[P1] " + body) (it calls
// isValidBody on the rest) and through P1Perf.line (a dropped body logs nothing), and the token regex ^[a-z0-9_.=-]{1,40}$ is checked here as well.
// Every test starts from an EMPTY preference dictionary and puts the dictionary it found back (fresh()).
// DELIBERATE BREAKS (#802; each ONE mutation in a COPY of the tree, then `node scripts/run-csh.mjs` from the copy; the red tests in brackets):
//  flags   m1 HistcsFlags.read: the absent value of flagLoadMoreOffUi 1 → 0 [flags_absent_is_on, flags_stored_zero…, flags_each_key…, both_off_end_to_end_real_flags]
//          m2 read: the dev rule bypassed (`FirstOlderPage50 = p != 0`) [flags_stored_zero_acts_only_in_dev_mode, flags_each_key…]
//          m3 read: FirstOlderPage50 read from LoadMoreOffUiKey [flags_each_key_is_its_own_switch]
//          m4 read: the catch removed / narrowed (a throw escapes) [flags_throwing_read_keeps_on]
//          m5 read: a Logging.info(…) added [flags_read_writes_no_log_line (+ Photo1bFlagsTests / DefaultsTests position checks)]
//          m6 (lead, the lazy read) ensureRead: `!= 0` → `== 0` (the first use never reads) [flags_read_lazily_once_not_by_init]; m6b read(): the
//          `Volatile.Write(ref readDone, 1)` deleted (every use re-reads) [flags_read_lazily_once_not_by_init]
//          m7 flagsLine "firstpage50=" → "firstpage5=" [flags_line_text]; m8 takeFlagsLine → `return true` [flags_line_taken_once];
//          m9 SpixiFlags.init also calls takeFlagsLine() (init consumes the once) [flags_line_taken_once]; m9b takeFlagsLine →
//          `if (flagsLineTaken == 0) { flagsLineTaken = 1; return true; } return false;` (not Interlocked) [flags_line_taken_once — the
//          raced FIRST take, a probabilistic break: run it 3 times]
//  rules   m10 nextShow: the step over 100 also when firstPage50 is true [next_show_sequences]; m11 the step over 100 dropped when false
//          [next_show_sequences, next_show_false_equals_the_base_formula, both_off_is_the_base]; m12 `== 100` → `>= 100`
//          [next_show_false_equals_the_base_formula]; m13 `show + step` → `show + step + 1` [next_show_*]; m14 usesNewPath `||` → `&&`
//          [uses_new_path_table, both_off_end_to_end_real_flags]; m15 usesNewPath → `return true` [uses_new_path_table, both_off_is_the_base]
//  busy    m16 OlderBusy.tryEnter always true [busy_guard_single_thread, busy_guard_race, busy_guard_stale_leave…]; m17 leave a no-op
//          [busy_guard_single_thread, busy_guard_stale_leave…, schedule_*]; m17b leave not by owner (`Interlocked.Exchange(ref this.owner, null)`)
//          [busy_guard_single_thread, busy_guard_stale_leave_keeps_a_newer_owner, schedule_leaves_with_its_owner_only]
//          m18 tryEnter `if (this.owner == null) { this.owner = owner; return true; }` (not Interlocked): HELD BY SOURCE — pins-histcs/a-path a9
//          (`busyIsAtomicAndOwnerAware`: both transitions are `Interlocked.CompareExchange(ref …)`); busy_guard_race may catch it too, but
//          a 12-thread race on a two-instruction window is too rare to count on, so the race test is not this break's proof
//  sched   m19 schedule: busy.leave() BEFORE after() [schedule_normal_inline]; m20 the body's catch removed [schedule_body_throws]; m21 after()'s
//          try / catch removed [schedule_after_throws]; m22 the scheduler-throw path does not leave [schedule_throws_itself, schedule_leaves…]; m23 it
//          returns true there [schedule_throws_itself]; m24 leave outside the finally (skipped by a throw) [schedule_body_throws, schedule_after_throws];
//          m24b schedule's leaves ignore `owner` (`busy.leave(new object())`) [schedule_normal_inline, schedule_body_throws, schedule_leaves…]
//  decide  m25 the Channel check before the Closed check [decide_order_and_all_128_combinations]; m26 the `!sameChat` test dropped [decide_each_field_alone];
//          m27 noneInFlight ignored [decide_each_field_alone]; m28 Anchor before Load [decide_order_and_all_128_combinations]
//  gate    m29 beginOther: started++ outside the gate [gate_held_makes_begin_other_wait]; m30 Dispose: finished++ every call
//          [gate_double_dispose_counts_once]; m31 beginOther(false) counts a load [gate_switch_off_counts_nothing, both_off_is_the_base]
//          m32 counters: noLoadSince compares `finished` [gate_load_begun_after_ticket]; m33 exit(ref held) with held == false calls Monitor.Exit
//          [gate_exit_twice_safe]; m34 enter does not set held [gate_exit_twice_safe, gate_enter_blocks…]; m35 Dispose without the gate
//          [gate_held_makes_dispose_wait]; m36 beginOther(false) takes the gate first [gate_switch_off_counts_nothing]; m36b enter's
//          `if (held) { return; }` removed (a second enter re-enters the monitor) [gate_enter_twice_same_flag_one_exit_frees]
//  lines   m37 readBody: ms not clamped at 0 [lines_extreme_values_stay_in_the_grammar]; m38 pushBody `json=` → `len=` [lines_exact_texts];
//          m39 dropBody Busy → `why=Busy` [lines_exact_texts, lines_drop_words, lines_through_p1perf_line]; m40 readBody: window and passes swapped
//          [lines_exact_texts]; m41 readBody gets a string parameter (a message could reach it) [lines_by_type_only]
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Maui.Storage;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class HistcsTests
{
    private const string DevKey = "devMode";

    private static Preferences P => Preferences.Default;
    private static List<string> Lines => IXICore.Meta.Logging.lines;
    private static List<string> Warns => IXICore.Meta.Logging.warns;
    private static List<string> Errors => IXICore.Meta.Logging.errors;

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
            SpixiFlags.init(); HistcsFlags.read();
            Lines.Clear();
            Warns.Clear();
        }
    }

    /** Run the REAL init with dev mode `dev` (null = absent) and the two keys `offUi` / `page50` (null = absent). */
    private static void initWith(bool? dev, int? offUi, int? page50)
    {
        P.d.Clear();
        if (dev != null) P.Set(DevKey, dev.Value);
        if (offUi != null) P.Set(HistcsFlags.LoadMoreOffUiKey, offUi.Value);
        if (page50 != null) P.Set(HistcsFlags.FirstOlderPage50Key, page50.Value);
        Lines.Clear();
        Warns.Clear();
        SpixiFlags.init(); HistcsFlags.read();
    }

    private static string st() => (HistcsFlags.LoadMoreOffUi ? "1" : "0") + (HistcsFlags.FirstOlderPage50 ? "1" : "0");

    /** A thread that runs `a`, keeps a throw, and is joined with a 5 s bound. */
    private sealed class Worker
    {
        private readonly Thread t;
        public Exception? error;

        public Worker(Action a)
        {
            t = new Thread(() =>
            {
                try { a(); }
                catch (Exception e) { error = e; }
            });
            t.IsBackground = true;
            t.Start();
        }

        public void join(string why)
        {
            Assert.IsTrue(t.Join(5000), why + ": the thread finished within 5 s");
            Assert.IsTrue(error == null, why + ": the thread did not throw — " + (error == null ? "" : error.GetType().Name + " " + error.Message));
        }
    }

    private static bool until(Func<bool> c, int ms)
    {
        var sw = Stopwatch.StartNew();
        while (!c())
        {
            if (sw.ElapsedMilliseconds > ms) return false;
            Thread.Sleep(2);
        }
        return true;
    }

    /** The two counters, read under the gate (counters() is only valid while entered). */
    private static (bool noLoadSince, bool noneInFlight) look(OlderPushGate g, OlderPushGate.Ticket t)
    {
        bool held = false;
        g.enter(ref held);
        try
        {
            return g.counters(t);
        }
        finally
        {
            g.exit(ref held);
        }
    }

    private static string pair((bool noLoadSince, bool noneInFlight) c) => "noLoadSince=" + c.noLoadSince + " noneInFlight=" + c.noneInFlight;

    /* ===================== the flags ===================== */

    [TestMethod]
    public void flags_keys_and_words()
    {
        Assert.AreEqual("flagLoadMoreOffUi", HistcsFlags.LoadMoreOffUiKey, "P-28's int preference key");
        Assert.AreEqual("flagFirstOlderPage50", HistcsFlags.FirstOlderPage50Key, "HV-5's int preference key");
        Assert.AreEqual("chat loadmore in", HistoryOlderRules.LoadMoreInBody, "the first [P1] line's body");
    }

    [TestMethod]
    public void flags_absent_is_on()
    {
        fresh(() =>
        {
            foreach (bool? dev in new bool?[] { null, false, true })
            {
                initWith(dev, null, null);
                Assert.AreEqual("11", st(), "no key (dev " + dev + ") → both switches ON (the default of the store build)");
            }
            // any stored value that is not 0 is ON, dev mode on or off (S16PassRules.effectiveFlag = !(dev && stored == 0))
            foreach (bool dev in new[] { false, true })
            {
                foreach (int v in new[] { 1, 2, -1, 7, int.MaxValue, int.MinValue })
                {
                    initWith(dev, v, v);
                    Assert.AreEqual("11", st(), "stored " + v + " (dev " + dev + ") → ON: only a 0 turns a switch off");
                }
            }
            // read() directly, from the state init left
            initWith(true, 0, 0);
            Assert.AreEqual("00", st(), "control: dev on + stored 0 → OFF");
            P.d.Remove(HistcsFlags.LoadMoreOffUiKey);
            P.d.Remove(HistcsFlags.FirstOlderPage50Key);
            HistcsFlags.read();
            Assert.AreEqual("11", st(), "read() on its own: absent keys → ON again");
        });
    }

    [TestMethod]
    public void flags_stored_zero_acts_only_in_dev_mode()
    {
        fresh(() =>
        {
            initWith(false, 0, 0);
            Assert.AreEqual("11", st(), "dev off + stored 0 → ON (a stored 0 acts only while dev mode is on)");
            initWith(true, 0, 0);
            Assert.AreEqual("00", st(), "dev on + stored 0 → OFF (the old path)");
            // read() on its own sees the same state
            P.Set(DevKey, false);
            HistcsFlags.read();
            Assert.AreEqual("11", st(), "read(), dev switched off meanwhile → ON");
            P.Set(DevKey, true);
            HistcsFlags.read();
            Assert.AreEqual("00", st(), "read(), dev on again → OFF");
        });
    }

    [TestMethod]
    public void flags_devmode_absent_is_off()
    {
        fresh(() =>
        {
            initWith(null, 0, 0);
            Assert.IsFalse(P.d.ContainsKey(DevKey), "control: devMode is absent (a fresh install)");
            Assert.AreEqual("11", st(), "devMode absent + both keys stored 0 → both ON: the read's default for devMode is false");
        });
    }

    [TestMethod]
    public void flags_each_key_is_its_own_switch()
    {
        fresh(() =>
        {
            initWith(true, 0, 1);
            Assert.AreEqual("01", st(), "only flagLoadMoreOffUi at 0 → P-28 OFF, HV-5 ON");
            initWith(true, 1, 0);
            Assert.AreEqual("10", st(), "only flagFirstOlderPage50 at 0 → HV-5 OFF, P-28 ON");
            initWith(true, 0, null);
            Assert.AreEqual("01", st(), "P-28 at 0, HV-5 key absent → HV-5 stays ON");
            initWith(true, null, 0);
            Assert.AreEqual("10", st(), "HV-5 at 0, P-28 key absent → P-28 stays ON");
            // the same single 0 with dev off changes nothing
            initWith(false, 0, 1);
            Assert.AreEqual("11", st(), "dev off: a single 0 is ignored");
            // no other batch's key moves these two (and these two move no other batch's key)
            initWith(true, null, null);
            P.Set("flagHistoryInsertOnly", 0);
            P.Set("flagFadeFromBand", 0);
            P.Set("flagDefaultAppLockOn", 0);
            P.Set("flagPhotoMediaAfterPaint", 0);
            Lines.Clear();
            SpixiFlags.init(); HistcsFlags.read();
            Assert.AreEqual("11", st(), "another batch's stored 0 changes neither of the two");
            initWith(true, 0, 0);
            Assert.IsFalse(SpixiFlags.HistoryInsertOnly == false || SpixiFlags.FadeFromBand == false || SpixiFlags.DefaultAppLockOn == false,
                "the two histcs keys at 0 turn no other batch's switch off");
        });
    }

    [TestMethod]
    public void flags_throwing_read_keeps_on()
    {
        fresh(() =>
        {
            initWith(true, 0, 0);
            Assert.AreEqual("00", st(), "control: the stored zeros act in dev mode");
            var d = P.d;
            int w0 = Warns.Count, e0 = Errors.Count, l0 = Lines.Count;
            try
            {
                P.d = null!;   // every stub Get throws now (NullReferenceException) — devMode included
                HistcsFlags.read();
            }
            finally
            {
                P.d = d;
            }
            Assert.AreEqual("11", st(), "read() whose preference read throws keeps both ON (the switches only turn OFF on purpose)");
            Assert.AreEqual(w0, Warns.Count, "…and logs no warning of its own");
            Assert.AreEqual(e0, Errors.Count, "…and no error");
            Assert.AreEqual(l0, Lines.Count, "…and no line");

            // through the REAL init: the one type-only warn of init itself, nothing from histcs
            initWith(true, 0, 0);
            Assert.AreEqual("00", st(), "control again");
            Lines.Clear();
            Warns.Clear();
            try
            {
                P.d = null!;
                SpixiFlags.init(); HistcsFlags.read();
            }
            finally
            {
                P.d = d;
            }
            Assert.AreEqual("11", st(), "init with a throwing read: both ON");
            Assert.IsTrue(Warns.Count == 1 && Warns[0] == "[FLAGS] read failed (NullReferenceException)", "init's own single type-only warn is the only one — " + string.Join("|", Warns));
            Assert.IsTrue(Lines.All(l => !l.Contains("histcs")), "no histcs line");
        });
    }

    /* ★ histcs (lead, merge): the switches are read LAZILY, once per process, at the first use — SpixiFlags.init() does not
     * touch them (init's last statements are pinned by other batches). After the first read a changed store changes
     * nothing until an explicit read() (the next start in the app). */
    [TestMethod]
    public void flags_read_lazily_once_not_by_init()
    {
        fresh(() =>
        {
            P.d.Clear();
            HistcsFlags.read();
            Assert.AreEqual("11", st(), "control: absent = ON");
            P.Set(DevKey, true);
            P.Set(HistcsFlags.LoadMoreOffUiKey, 0);
            P.Set(HistcsFlags.FirstOlderPage50Key, 0);
            Assert.AreEqual("11", st(), "a use after the first read does not read again (the value of the process stays)");
            SpixiFlags.init();
            Assert.AreEqual("11", st(), "SpixiFlags.init() does not read the histcs switches");
            HistcsFlags.read();
            Assert.AreEqual("00", st(), "an explicit read() (the next start) takes the stored zeros in dev mode");
            // a fresh process: the first USE reads (reset the once-flag through reflection, as a new process would have it)
            var f = typeof(HistcsFlags).GetField("readDone", BindingFlags.NonPublic | BindingFlags.Static);
            Assert.IsTrue(f != null, "the once-flag exists");
            P.d.Clear();
            f!.SetValue(null, 0);
            Assert.AreEqual("11", st(), "the first use of a new process reads the store (absent = ON)");
            P.Set(DevKey, true);
            P.Set(HistcsFlags.LoadMoreOffUiKey, 0);
            Assert.AreEqual("11", st(), "…once");
        });
    }

    [TestMethod]
    public void flags_read_writes_no_log_line()
    {
        fresh(() =>
        {
            foreach (bool? dev in new bool?[] { null, false, true })
            {
                foreach (int? a in new int?[] { null, 0, 1 })
                {
                    foreach (int? b in new int?[] { null, 0, 1 })
                    {
                        initWith(dev, a, b);
                        Lines.Clear();
                        Warns.Clear();
                        int e0 = Errors.Count;
                        HistcsFlags.read();
                        Assert.AreEqual(0, Lines.Count, "read() logs no line (dev " + dev + ", " + a + ", " + b + ") — " + string.Join("|", Lines));
                        Assert.AreEqual(0, Warns.Count, "read() logs no warning");
                        Assert.AreEqual(e0, Errors.Count, "read() logs no error");
                    }
                }
            }
            // init: no histcs line at all; the order of the merged tree (work/fixb4 @ 8ce1215d, ruling 1834) stays: defaultsb, then photo1b, then fixb4 last (re-based 2026-11-23 from "photo1b last": fixb4 added readFixb4() after readPhoto1b())
            initWith(false, null, null);
            Assert.IsTrue(Lines.All(l => !l.Contains("histcs") && !l.Contains("loadmoreoffui") && !l.Contains("firstpage50")), "init writes no histcs line — " + string.Join("|", Lines));
            Assert.IsTrue(Lines.Count >= 1 && Lines[Lines.Count - 1].StartsWith("[FLAGS] fixb4 ", StringComparison.Ordinal), "the very last line of init is still the fixb4 line — " + (Lines.Count > 0 ? Lines[Lines.Count - 1] : "(none)"));
            Assert.IsTrue(Lines.Count >= 2 && Lines[Lines.Count - 2].StartsWith("[FLAGS] photo1b ", StringComparison.Ordinal), "…the photo1b line directly before it");
            Assert.IsTrue(Lines.Count >= 3 && Lines[Lines.Count - 3].StartsWith("[FLAGS] defaultsb ", StringComparison.Ordinal), "…and the defaultsb line directly before that");
            // init stores nothing and removes nothing of its own keys
            initWith(true, 1, 1);
            Assert.IsTrue(P.d.ContainsKey(HistcsFlags.LoadMoreOffUiKey) && P.d.ContainsKey(HistcsFlags.FirstOlderPage50Key), "init does not remove the two keys");
            initWith(true, null, null);
            Assert.IsFalse(P.d.ContainsKey(HistcsFlags.LoadMoreOffUiKey) || P.d.ContainsKey(HistcsFlags.FirstOlderPage50Key), "init does not store the two keys (an existing account is not touched)");
        });
    }

    [TestMethod]
    public void flags_line_text()
    {
        Assert.AreEqual("[FLAGS] histcs loadmoreoffui=1 firstpage50=1", HistcsFlags.flagsLine(true, true));
        Assert.AreEqual("[FLAGS] histcs loadmoreoffui=0 firstpage50=0", HistcsFlags.flagsLine(false, false));
        Assert.AreEqual("[FLAGS] histcs loadmoreoffui=1 firstpage50=0", HistcsFlags.flagsLine(true, false));
        Assert.AreEqual("[FLAGS] histcs loadmoreoffui=0 firstpage50=1", HistcsFlags.flagsLine(false, true));
        foreach (bool a in new[] { false, true })
        {
            foreach (bool b in new[] { false, true })
            {
                Assert.IsTrue(Regex.IsMatch(HistcsFlags.flagsLine(a, b), "^\\[FLAGS\\] histcs loadmoreoffui=[01] firstpage50=[01]$"), "fixed words and 0|1 only");
            }
        }
    }

    [TestMethod]
    public void flags_line_taken_once()
    {
        /* ★ histcs #46 r1 (O2): the once-flag is reset through reflection (a new process), so the FIRST take is raced — not a take
         * that an earlier test may already have used up. */
        var f = typeof(HistcsFlags).GetField("flagsLineTaken", BindingFlags.NonPublic | BindingFlags.Static);
        Assert.IsTrue(f != null, "the once-flag exists");
        FieldInfo once = f!;
        object? was = once.GetValue(null);
        fresh(() =>
        {
            try
            {
                once.SetValue(null, 0);
                // init (called by every other test class, here three more times) must NOT use the once up: its line is written at the first load-more
                initWith(false, null, null);
                initWith(true, 0, 0);
                initWith(false, null, null);
                Assert.IsTrue(HistcsFlags.takeFlagsLine(), "the first ask of a fresh process is true (nothing before it — init included — used it up)");
                Assert.IsFalse(HistcsFlags.takeFlagsLine(), "the second ask is false");
                Assert.IsFalse(HistcsFlags.takeFlagsLine(), "and every later one");
                // the FIRST take raced: 8 threads x 200 asks on a fresh flag → exactly ONE true, no throw
                for (int round = 0; round < 20; round++)
                {
                    once.SetValue(null, 0);
                    int trues = 0;
                    var gate = new Barrier(8);
                    var ws = new List<Worker>();
                    for (int i = 0; i < 8; i++)
                    {
                        ws.Add(new Worker(() =>
                        {
                            gate.SignalAndWait(5000);
                            for (int k = 0; k < 200; k++)
                            {
                                if (HistcsFlags.takeFlagsLine()) Interlocked.Increment(ref trues);
                            }
                        }));
                    }
                    foreach (var w in ws) w.join("takeFlagsLine race round " + round);
                    Assert.AreEqual(1, trues, "round " + round + ": 8 threads x 200 asks racing the FIRST take → exactly one true");
                }
            }
            finally
            {
                once.SetValue(null, was);   // the process's own state back (another test class may rely on it)
            }
        });
    }

    /* ===================== nextShow / usesNewPath ===================== */

    /** The base onLoadMore's arithmetic, written out (SingleChatPage.xaml.cs:1180-1195 at 338d30f4): messagesToShow += step; if (== 100) += step. */
    private static uint baseNext(uint s, uint step)
    {
        unchecked
        {
            s += step;
            if (s == 100)
            {
                s += step;
            }
        }
        return s;
    }

    [TestMethod]
    public void next_show_sequences()
    {
        // false = the old path: 50 → 150 (the step over 100) → 200 → 250
        uint s = 50;
        s = HistoryOlderRules.nextShow(s, 50, false);
        Assert.AreEqual(150u, s, "false: 50 → 150 (the first older page holds 100 rows)");
        s = HistoryOlderRules.nextShow(s, 50, false);
        Assert.AreEqual(200u, s, "false: 150 → 200");
        s = HistoryOlderRules.nextShow(s, 50, false);
        Assert.AreEqual(250u, s, "false: 200 → 250");
        // true = HV-5: 50 → 100 → 150 (the first older page holds 50 rows; the read never asks Core for 100)
        s = 50;
        s = HistoryOlderRules.nextShow(s, 50, true);
        Assert.AreEqual(100u, s, "true: 50 → 100 (no step over 100)");
        s = HistoryOlderRules.nextShow(s, 50, true);
        Assert.AreEqual(150u, s, "true: 100 → 150");
        s = HistoryOlderRules.nextShow(s, 50, true);
        Assert.AreEqual(200u, s, "true: 150 → 200");
        // other steps that land on exactly 100
        Assert.AreEqual(175u, HistoryOlderRules.nextShow(25, 75, false), "false: 25 + 75 = 100 → one step more");
        Assert.AreEqual(100u, HistoryOlderRules.nextShow(25, 75, true), "true: 25 + 75 = 100 stays");
        Assert.AreEqual(200u, HistoryOlderRules.nextShow(0, 100, false), "false: 0 + 100 = 100 → 200");
        Assert.AreEqual(150u, HistoryOlderRules.nextShow(100, 50, false), "false: the step is only over a RESULT of 100 (100 + 50 = 150)");
        Assert.AreEqual(150u, HistoryOlderRules.nextShow(100, 50, true), "true: 100 + 50");
        // the step is exactly once: the false path never answers 100 for a step >= 1, the true path may
        for (uint a = 0; a <= 400; a++)
        {
            for (uint step = 1; step <= 60; step++)
            {
                Assert.IsTrue(HistoryOlderRules.nextShow(a, step, false) != 100u, "false never answers 100 (show " + a + " step " + step + ")");
            }
        }
        Assert.AreEqual(100u, HistoryOlderRules.nextShow(50, 50, true), "true answers 100 where the sum is 100");
    }

    [TestMethod]
    public void next_show_false_equals_the_base_formula()
    {
        for (uint a = 0; a <= 400; a++)
        {
            for (uint step = 1; step <= 60; step++)
            {
                Assert.AreEqual(baseNext(a, step), HistoryOlderRules.nextShow(a, step, false), "false = the base formula for show " + a + " step " + step);
                Assert.AreEqual(unchecked(a + step), HistoryOlderRules.nextShow(a, step, true), "true = show + step for show " + a + " step " + step);
            }
        }
        // the edge of the type: both wrap as the base `messagesToShow += …` does (an unchecked uint)
        Assert.AreEqual(baseNext(uint.MaxValue, 1), HistoryOlderRules.nextShow(uint.MaxValue, 1, false), "false: uint.MaxValue + 1 wraps as the base does");
        Assert.AreEqual(baseNext(uint.MaxValue - 10, 60), HistoryOlderRules.nextShow(uint.MaxValue - 10, 60, false), "false: a wrapping sum");
        Assert.AreEqual(unchecked(uint.MaxValue + 1u), HistoryOlderRules.nextShow(uint.MaxValue, 1, true), "true: the same wrap");
    }

    [TestMethod]
    public void uses_new_path_table()
    {
        Assert.IsFalse(HistoryOlderRules.usesNewPath(false, false), "both OFF → onLoadMore, the old path");
        Assert.IsTrue(HistoryOlderRules.usesNewPath(true, false), "P-28 only → the new path");
        Assert.IsTrue(HistoryOlderRules.usesNewPath(false, true), "HV-5 only → the new path");
        Assert.IsTrue(HistoryOlderRules.usesNewPath(true, true), "both ON → the new path");
    }

    /* ===================== the busy guard (★ histcs #46 r1 (S-3): OWNER-aware) ===================== */

    [TestMethod]
    public void busy_guard_single_thread()
    {
        var b = new OlderBusy();
        object p1 = new object(), p2 = new object();
        Assert.IsFalse(b.held, "a new guard is free");
        Assert.IsTrue(b.tryEnter(p1), "free → entered by page 1");
        Assert.IsTrue(b.held, "held");
        Assert.IsFalse(b.tryEnter(p2), "held → refused for another page (a second ixian:loadmore does nothing)");
        Assert.IsFalse(b.tryEnter(p1), "and refused for the same owner too (no re-entry)");
        Assert.IsTrue(b.held, "a refused ask leaves it held");
        b.leave(p2);
        Assert.IsTrue(b.held, "a leave by a token that does not hold it changes nothing");
        b.leave(p1);
        Assert.IsFalse(b.held, "leave by the owner → free");
        b.leave(p1);
        Assert.IsFalse(b.held, "leave twice is safe");
        Assert.IsTrue(b.tryEnter(p2), "free again → entered");
        var other = new OlderBusy();
        Assert.IsTrue(other.tryEnter(p1), "a guard is per page: another instance is not affected (no shared state)");
        b.leave(p2);
        Assert.IsTrue(other.held, "…and leaving one does not free the other");
    }

    /* ★ histcs #46 r1 (S-3): page 1 frees the guard at its pushes (olderPushed); page 2 enters; page 1's task then ends and its
     * schedule does the final leave — with page 1's token, which must NOT free page 2. */
    [TestMethod]
    public void busy_guard_stale_leave_keeps_a_newer_owner()
    {
        var b = new OlderBusy();
        object p1 = new object(), p2 = new object();
        Assert.IsTrue(b.tryEnter(p1), "page 1 enters");
        b.leave(p1);                                   // page 1's pushes are out (olderPushed)
        Assert.IsTrue(b.tryEnter(p2), "page 2 (the shell's next request) enters at once — no 8 s wait");
        b.leave(p1);                                   // page 1's task ends: the final leave of its schedule
        Assert.IsTrue(b.held, "page 1's stale final leave does NOT free page 2");
        Assert.IsFalse(b.tryEnter(new object()), "…so a third page is still refused while page 2 runs");
        b.leave(p2);
        Assert.IsFalse(b.held, "page 2's own leave frees it");
        // the same with real threads: a stale leave racing a newer owner never frees it
        for (int round = 0; round < 40; round++)
        {
            var g = new OlderBusy();
            object a = new object(), c = new object();
            Assert.IsTrue(g.tryEnter(a));
            g.leave(a);
            Assert.IsTrue(g.tryEnter(c), "round " + round + ": the newer owner enters");
            var bar = new Barrier(6);
            var ws = new List<Worker>();
            for (int i = 0; i < 6; i++)
            {
                ws.Add(new Worker(() =>
                {
                    bar.SignalAndWait(5000);
                    for (int k = 0; k < 50; k++) g.leave(a);   // the stale owner leaves again and again
                }));
            }
            foreach (var w in ws) w.join("stale leave round " + round);
            Assert.IsTrue(g.held, "round " + round + ": 300 stale leaves did not free the newer owner");
        }
    }

    [TestMethod]
    public void busy_guard_race()
    {
        for (int round = 0; round < 40; round++)
        {
            var b = new OlderBusy();
            var bar = new Barrier(12);
            int winners = 0;
            var ws = new List<Worker>();
            for (int i = 0; i < 12; i++)
            {
                ws.Add(new Worker(() =>
                {
                    bar.SignalAndWait(5000);
                    if (b.tryEnter(new object())) Interlocked.Increment(ref winners);
                }));
            }
            foreach (var w in ws) w.join("busy race round " + round);
            Assert.AreEqual(1, winners, "round " + round + ": exactly ONE of 12 simultaneous asks enters");
            Assert.IsTrue(b.held, "round " + round + ": held after the race");
        }
    }

    /* ===================== schedule ===================== */

    [TestMethod]
    public void schedule_normal_inline()
    {
        var busy = new OlderBusy();
        object me = new object();
        Assert.IsTrue(busy.tryEnter(me), "control: the caller enters the guard first");
        var ev = new List<string>();
        bool r = HistoryOlderRules.schedule(busy, me,
            a => { ev.Add("sched"); a(); },
            () => ev.Add("body:" + (busy.held ? "held" : "free")),
            e => ev.Add("fail"),
            () => ev.Add("after:" + (busy.held ? "held" : "free")));
        Assert.IsTrue(r, "scheduled → true");
        Assert.AreEqual("sched,body:held,after:held", string.Join(",", ev), "the order; the guard is still held in the body AND in after()");
        Assert.IsFalse(busy.held, "the guard is free when everything has run");
        Assert.IsTrue(busy.tryEnter(new object()), "and can be entered again");
    }

    /* ★ histcs #46 r1 (S-3): schedule leaves with ITS owner — on the normal path, after a throw of the body and after a throw of
     * the scheduler. A body that frees the guard early (olderPushed) and a newer page that enters before the final leave: the
     * newer page keeps it. */
    [TestMethod]
    public void schedule_leaves_with_its_owner_only()
    {
        var busy = new OlderBusy();
        object p1 = new object(), p2 = new object();
        Assert.IsTrue(busy.tryEnter(p1));
        bool r = HistoryOlderRules.schedule(busy, p1, a => a(), () =>
        {
            busy.leave(p1);                               // the page's pushes are out (olderPushed)
            Assert.IsTrue(busy.tryEnter(p2), "the next page enters while page 1's task still runs");
        }, e => Assert.IsTrue(false, "no failure: " + e.GetType().Name), () => { });
        Assert.IsTrue(r, "scheduled");
        Assert.IsTrue(busy.held, "page 1's final leave (its owner) did not free page 2");
        // page 2 throws: its schedule still frees it (its own owner)
        bool failed = false;
        HistoryOlderRules.schedule(busy, p2, a => a(), () => { throw new InvalidOperationException("x"); }, e => failed = true, () => { });
        Assert.IsTrue(failed && !busy.held, "page 2's throw: onFail, and its own leave frees the guard");
        // a schedule with the WRONG owner frees nothing (the caller's token is the one that counts)
        object p3 = new object();
        Assert.IsTrue(busy.tryEnter(p3));
        HistoryOlderRules.schedule(busy, new object(), a => a(), () => { }, e => { }, () => { });
        Assert.IsTrue(busy.held, "a schedule given another token leaves the holder alone");
        // the scheduler throws: its leave is by owner too
        HistoryOlderRules.schedule(busy, p1, a => { throw new InvalidOperationException("no thread"); }, () => { }, e => { }, () => { });
        Assert.IsTrue(busy.held, "a stale owner's scheduler throw does not free page 3");
        HistoryOlderRules.schedule(busy, p3, a => { throw new InvalidOperationException("no thread"); }, () => { }, e => { }, () => { });
        Assert.IsFalse(busy.held, "page 3's own scheduler throw frees it");
    }

    [TestMethod]
    public void schedule_body_throws()
    {
        var busy = new OlderBusy();
        object me = new object();
        Assert.IsTrue(busy.tryEnter(me));
        var ev = new List<string>();
        Exception? got = null;
        var boom = new ArgumentException("boom");
        bool r = HistoryOlderRules.schedule(busy, me,
            a => a(),
            () => { ev.Add("body"); throw boom; },
            e => { ev.Add("fail"); got = e; },
            () => ev.Add("after:" + (busy.held ? "held" : "free")));
        Assert.IsTrue(r, "scheduled → true even though the body threw");
        Assert.AreEqual("body,fail,after:held", string.Join(",", ev), "body, then onFail, then after() (guard still held), nothing escapes");
        Assert.IsTrue(ReferenceEquals(got, boom), "onFail gets the very exception");
        Assert.IsFalse(busy.held, "the guard is freed after a throw");
    }

    [TestMethod]
    public void schedule_after_throws()
    {
        var busy = new OlderBusy();
        object me = new object();
        Assert.IsTrue(busy.tryEnter(me));
        var ev = new List<string>();
        bool escaped = false;
        bool r = false;
        try
        {
            r = HistoryOlderRules.schedule(busy, me, a => a(), () => ev.Add("body"), e => ev.Add("fail"), () => { ev.Add("after"); throw new InvalidOperationException("late"); });
        }
        catch (Exception)
        {
            escaped = true;
        }
        Assert.IsFalse(escaped, "a throw of after() is swallowed");
        Assert.IsTrue(r, "→ true");
        Assert.AreEqual("body,after", string.Join(",", ev), "onFail is not called for after()'s throw");
        Assert.IsFalse(busy.held, "the guard is freed after after() threw");
        // body AND after throw: onFail once, no escape, guard free
        Assert.IsTrue(busy.tryEnter(me));
        ev.Clear();
        escaped = false;
        try
        {
            HistoryOlderRules.schedule(busy, me, a => a(), () => { ev.Add("body"); throw new Exception("b"); }, e => ev.Add("fail"), () => { ev.Add("after"); throw new Exception("a"); });
        }
        catch (Exception)
        {
            escaped = true;
        }
        Assert.IsFalse(escaped, "both throw: nothing escapes");
        Assert.AreEqual("body,fail,after", string.Join(",", ev), "onFail once, after() still runs");
        Assert.IsFalse(busy.held, "guard free");
    }

    [TestMethod]
    public void schedule_throws_itself()
    {
        var busy = new OlderBusy();
        object me = new object();
        Assert.IsTrue(busy.tryEnter(me));
        var ev = new List<string>();
        Exception? got = null;
        var boom = new InvalidOperationException("no thread");
        bool escaped = false;
        bool r = true;
        try
        {
            r = HistoryOlderRules.schedule(busy, me, a => { throw boom; }, () => ev.Add("body"), e => { ev.Add("fail"); got = e; }, () => ev.Add("after"));
        }
        catch (Exception)
        {
            escaped = true;
        }
        Assert.IsFalse(escaped, "a throw of the scheduler does not escape");
        Assert.IsFalse(r, "…and the answer is false (not scheduled)");
        Assert.AreEqual("fail", string.Join(",", ev), "onFail only: the body and after() never ran");
        Assert.IsTrue(ReferenceEquals(got, boom), "onFail gets the scheduler's exception");
        Assert.IsFalse(busy.held, "the guard is freed (the caller entered it, nobody else will leave)");
        Assert.IsTrue(busy.tryEnter(new object()), "and can be entered again");
    }

    [TestMethod]
    public void schedule_deferred_scheduler()
    {
        var busy = new OlderBusy();
        object me = new object();
        Assert.IsTrue(busy.tryEnter(me));
        var ev = new List<string>();
        Action? captured = null;
        bool r = HistoryOlderRules.schedule(busy, me, a => captured = a, () => ev.Add("body"), e => ev.Add("fail"), () => ev.Add("after"));
        Assert.IsTrue(r, "scheduled → true");
        Assert.IsTrue(captured != null, "the scheduler got the work");
        Assert.AreEqual(0, ev.Count, "nothing ran yet: schedule itself never runs the body");
        Assert.IsTrue(busy.held, "the guard stays held until the work has run");
        Assert.IsFalse(busy.tryEnter(new object()), "a second page cannot enter meanwhile");
        captured!();
        Assert.AreEqual("body,after", string.Join(",", ev), "the work runs when the scheduler runs it");
        Assert.IsFalse(busy.held, "…and the guard is free then");
    }

    [TestMethod]
    public void schedule_real_task_run()
    {
        // a normal page on a real pool thread: the body is off the caller's thread, the guard stays held while it runs
        var busy = new OlderBusy();
        object me = new object();
        Assert.IsTrue(busy.tryEnter(me));
        int caller = Environment.CurrentManagedThreadId;
        int bodyThread = -1;
        var entered = new ManualResetEventSlim(false);
        var release = new ManualResetEventSlim(false);
        bool r = HistoryOlderRules.schedule(busy, me, a => Task.Run(a),
            () => { bodyThread = Environment.CurrentManagedThreadId; entered.Set(); release.Wait(5000); },
            e => { },
            () => { });
        Assert.IsTrue(r, "scheduled → true");
        Assert.IsTrue(entered.Wait(5000), "the body started within 5 s");
        Thread.Sleep(150);
        Assert.IsTrue(busy.held, "after 150 ms, with the body still running, the guard is held");
        Assert.IsFalse(busy.tryEnter(new object()), "a second ask is refused while the body runs");
        Assert.IsTrue(bodyThread != -1 && bodyThread != caller, "the body ran on another thread than the caller's");
        release.Set();
        Assert.IsTrue(until(() => !busy.held, 5000), "the guard is free within 5 s after the body ended");

        // a throwing body on a real thread: onFail on that thread, the guard freed, nothing lost
        object me2 = new object();
        Assert.IsTrue(busy.tryEnter(me2));
        var failed = new ManualResetEventSlim(false);
        Exception? got = null;
        var boom = new FormatException("x");
        HistoryOlderRules.schedule(busy, me2, a => Task.Run(a), () => { throw boom; }, e => { got = e; failed.Set(); }, () => { });
        Assert.IsTrue(failed.Wait(5000), "onFail ran within 5 s");
        Assert.IsTrue(ReferenceEquals(got, boom), "with the exception");
        Assert.IsTrue(until(() => !busy.held, 5000), "the guard is free within 5 s after a throw");
    }

    /* ===================== decide ===================== */

    /** The contract's rule, written again by hand, in its order. */
    private static OlderDrop refDecide(bool disposed, bool sameDoc, bool sameChat, bool sameChannel, bool noLoadSince, bool noneInFlight, bool sameAnchor)
    {
        if (disposed || !sameDoc || !sameChat) return OlderDrop.Closed;
        if (!sameChannel) return OlderDrop.Channel;
        if (!noLoadSince || !noneInFlight) return OlderDrop.Load;
        if (!sameAnchor) return OlderDrop.Anchor;
        return OlderDrop.None;
    }

    [TestMethod]
    public void decide_each_field_alone()
    {
        //                                                                   disposed sameDoc sameChat sameChannel noLoad noFlight sameAnchor
        Assert.AreEqual(OlderDrop.None, HistoryOlderRules.decide(false, true, true, true, true, true, true), "everything as at the request → keep");
        Assert.AreEqual(OlderDrop.Closed, HistoryOlderRules.decide(true, true, true, true, true, true, true), "disposed → Closed");
        Assert.AreEqual(OlderDrop.Closed, HistoryOlderRules.decide(false, false, true, true, true, true, true), "a new document → Closed");
        Assert.AreEqual(OlderDrop.Closed, HistoryOlderRules.decide(false, true, false, true, true, true, true), "another chat → Closed");
        Assert.AreEqual(OlderDrop.Channel, HistoryOlderRules.decide(false, true, true, false, true, true, true), "another channel → Channel");
        Assert.AreEqual(OlderDrop.Load, HistoryOlderRules.decide(false, true, true, true, false, true, true), "a load began since the ticket → Load");
        Assert.AreEqual(OlderDrop.Load, HistoryOlderRules.decide(false, true, true, true, true, false, true), "a load is in flight → Load");
        Assert.AreEqual(OlderDrop.Anchor, HistoryOlderRules.decide(false, true, true, true, true, true, false), "another anchor → Anchor");
    }

    [TestMethod]
    public void decide_order_and_all_128_combinations()
    {
        // the order, in words
        Assert.AreEqual(OlderDrop.Closed, HistoryOlderRules.decide(true, true, true, false, false, false, false), "Closed before Channel / Load / Anchor");
        Assert.AreEqual(OlderDrop.Closed, HistoryOlderRules.decide(false, false, false, false, false, false, false), "a closed page that also changed everything else is Closed");
        Assert.AreEqual(OlderDrop.Channel, HistoryOlderRules.decide(false, true, true, false, false, false, false), "Channel before Load / Anchor");
        Assert.AreEqual(OlderDrop.Load, HistoryOlderRules.decide(false, true, true, true, false, false, false), "Load before Anchor");
        Assert.AreEqual(OlderDrop.Load, HistoryOlderRules.decide(false, true, true, true, false, true, false), "Load (noLoadSince) before Anchor");
        // all 2^7 inputs against the hand-written rule
        for (int m = 0; m < 128; m++)
        {
            bool b0 = (m & 1) != 0, b1 = (m & 2) != 0, b2 = (m & 4) != 0, b3 = (m & 8) != 0, b4 = (m & 16) != 0, b5 = (m & 32) != 0, b6 = (m & 64) != 0;
            Assert.AreEqual(refDecide(b0, b1, b2, b3, b4, b5, b6), HistoryOlderRules.decide(b0, b1, b2, b3, b4, b5, b6), "decide for input " + Convert.ToString(m, 2).PadLeft(7, '0'));
        }
    }

    /* ===================== the push gate (real threads) ===================== */

    [TestMethod]
    public void gate_load_begun_after_ticket()
    {
        var g = new OlderPushGate();
        var t = g.ticket();
        var up = new ManualResetEventSlim(false);
        var rel = new ManualResetEventSlim(false);
        var w = new Worker(() =>
        {
            IDisposable? x = g.beginOther(true);
            up.Set();
            rel.Wait(5000);
            x!.Dispose();
        });
        Assert.IsTrue(up.Wait(5000), "the other load began within 5 s");
        var c = look(g, t);
        Assert.IsFalse(c.noLoadSince, "a load began after the ticket → noLoadSince false — " + pair(c));
        Assert.IsFalse(c.noneInFlight, "…and it is in flight → noneInFlight false — " + pair(c));
        rel.Set();
        w.join("the other load");
        c = look(g, t);
        Assert.IsFalse(c.noLoadSince, "the load has ended, but it began after the ticket → noLoadSince stays false — " + pair(c));
        Assert.IsTrue(c.noneInFlight, "none in flight now — " + pair(c));
        // a load begun after the ticket on the SAME thread counts too
        var g2 = new OlderPushGate();
        var t2 = g2.ticket();
        using (g2.beginOther(true))
        {
            Assert.IsFalse(look(g2, t2).noLoadSince, "same thread: begun after the ticket");
        }
    }

    [TestMethod]
    public void gate_load_in_flight()
    {
        var g = new OlderPushGate();
        var up = new ManualResetEventSlim(false);
        var rel = new ManualResetEventSlim(false);
        var w = new Worker(() =>
        {
            IDisposable? x = g.beginOther(true);
            up.Set();
            rel.Wait(5000);
            x!.Dispose();
        });
        Assert.IsTrue(up.Wait(5000), "the other load began within 5 s");
        var t = g.ticket();   // taken while that load is in flight
        var c = look(g, t);
        Assert.IsTrue(c.noLoadSince, "it began BEFORE the ticket → noLoadSince true — " + pair(c));
        Assert.IsFalse(c.noneInFlight, "but it is still in flight → noneInFlight false — " + pair(c));
        Thread.Sleep(150);
        c = look(g, t);
        Assert.IsFalse(c.noneInFlight, "still in flight after 150 ms — " + pair(c));
        rel.Set();
        w.join("the in-flight load");
        c = look(g, t);
        Assert.IsTrue(c.noLoadSince && c.noneInFlight, "it ended (begun before the ticket): both true — " + pair(c));
    }

    [TestMethod]
    public void gate_load_begun_and_ended_before_ticket()
    {
        var g = new OlderPushGate();
        var w = new Worker(() =>
        {
            using (g.beginOther(true))
            {
                Thread.Yield();
            }
        });
        w.join("the earlier load");
        var t = g.ticket();
        var c = look(g, t);
        Assert.IsTrue(c.noLoadSince, "a load that began and ended before the ticket → noLoadSince true — " + pair(c));
        Assert.IsTrue(c.noneInFlight, "→ noneInFlight true — " + pair(c));
        // several earlier loads, in flight at the same time and all ended
        var g2 = new OlderPushGate();
        IDisposable? a = g2.beginOther(true);
        IDisposable? b = g2.beginOther(true);
        a!.Dispose();
        b!.Dispose();
        var c2 = look(g2, g2.ticket());
        Assert.IsTrue(c2.noLoadSince && c2.noneInFlight, "two earlier loads, both ended: both true — " + pair(c2));
    }

    [TestMethod]
    public void gate_held_makes_begin_other_wait()
    {
        var g = new OlderPushGate();
        var t = g.ticket();
        bool held = false;
        g.enter(ref held);
        Assert.IsTrue(held, "enter sets held");
        var started = new ManualResetEventSlim(false);
        var done = new ManualResetEventSlim(false);
        IDisposable? got = null;
        var w = new Worker(() =>
        {
            started.Set();
            got = g.beginOther(true);
            done.Set();
        });
        Assert.IsTrue(started.Wait(5000), "the other thread reached beginOther");
        Assert.IsFalse(done.Wait(150), "the page holds the gate: beginOther (a load starting) is still blocked after 150 ms");
        var c = g.counters(t);
        Assert.IsTrue(c.noLoadSince && c.noneInFlight, "…and the page's check does not see that load yet — " + pair(c));
        g.exit(ref held);
        Assert.IsFalse(held, "exit clears held");
        Assert.IsTrue(done.Wait(5000), "after exit the load starts within 5 s");
        w.join("the load that waited");
        Assert.IsTrue(got != null, "it got its scope");
        var c2 = look(g, t);
        Assert.IsFalse(c2.noLoadSince, "now that load counts as begun after the ticket — " + pair(c2));
        Assert.IsFalse(c2.noneInFlight, "…and it is in flight — " + pair(c2));
        got!.Dispose();
        Assert.IsTrue(look(g, t).noneInFlight, "disposed → none in flight");
    }

    [TestMethod]
    public void gate_held_makes_dispose_wait()
    {
        var g = new OlderPushGate();
        IDisposable? scope = g.beginOther(true);   // a load in flight before the ticket
        Assert.IsTrue(scope != null, "control: on = true gives a scope");
        var t = g.ticket();
        bool held = false;
        g.enter(ref held);
        var started = new ManualResetEventSlim(false);
        var done = new ManualResetEventSlim(false);
        var w = new Worker(() =>
        {
            started.Set();
            scope!.Dispose();
            done.Set();
        });
        Assert.IsTrue(started.Wait(5000), "the other thread reached Dispose");
        Assert.IsFalse(done.Wait(150), "the page holds the gate: the load's end (finished++) is still blocked after 150 ms");
        var c = g.counters(t);
        Assert.IsFalse(c.noneInFlight, "…so the page still sees that load in flight — " + pair(c));
        g.exit(ref held);
        Assert.IsTrue(done.Wait(5000), "after exit the end completes within 5 s");
        w.join("the load that ended");
        var c2 = look(g, t);
        Assert.IsTrue(c2.noLoadSince && c2.noneInFlight, "ended: both true — " + pair(c2));
    }

    [TestMethod]
    public void gate_double_dispose_counts_once()
    {
        var g = new OlderPushGate();
        var t = g.ticket();
        IDisposable? a = g.beginOther(true);
        IDisposable? b = g.beginOther(true);
        Assert.IsTrue(look(g, t).noneInFlight == false, "two loads in flight");
        a!.Dispose();
        a.Dispose();
        a.Dispose();
        var c = look(g, t);
        Assert.IsFalse(c.noneInFlight, "A disposed three times counts ONCE: B is still in flight — " + pair(c));
        Assert.IsFalse(c.noLoadSince, "…and both began after the ticket — " + pair(c));
        b!.Dispose();
        Assert.IsTrue(look(g, t).noneInFlight, "B disposed → none in flight");
        b.Dispose();
        // a later load must see a correct in-flight state after the double dispose
        IDisposable? n = g.beginOther(true);
        Assert.IsFalse(look(g, t).noneInFlight, "a later load is seen in flight (no counter went the wrong way)");
        n!.Dispose();
        Assert.IsTrue(look(g, t).noneInFlight, "and gone");
    }

    [TestMethod]
    public void gate_switch_off_counts_nothing()
    {
        var g = new OlderPushGate();
        var t = g.ticket();
        for (int i = 0; i < 100; i++)
        {
            IDisposable? x = g.beginOther(false);
            Assert.IsTrue(x == null, "beginOther(false) = null (the switch-OFF path: no scope)");
        }
        var c = look(g, t);
        Assert.IsTrue(c.noLoadSince && c.noneInFlight, "nothing was counted — " + pair(c));
        // a load that is counted is still seen beside the uncounted ones
        IDisposable? counted = g.beginOther(true);
        Assert.IsTrue(g.beginOther(false) == null, "off → null again");
        Assert.IsFalse(look(g, t).noneInFlight, "the counted load is in flight");
        counted!.Dispose();
        Assert.IsTrue(look(g, t).noneInFlight, "…and ended");
        // the OFF path takes no part in the gate: a load with the switch OFF never waits for a page that holds it
        bool held = false;
        g.enter(ref held);
        var done = new ManualResetEventSlim(false);
        IDisposable? off = null;
        var w = new Worker(() =>
        {
            off = g.beginOther(false);
            done.Set();
        });
        bool returned = done.Wait(5000);
        g.exit(ref held);
        Assert.IsTrue(returned, "beginOther(false) returned within 5 s while another thread held the gate (OFF = the base: no new waiting)");
        w.join("the OFF load");
        Assert.IsTrue(off == null, "and it is null");
    }

    [TestMethod]
    public void gate_exit_twice_safe()
    {
        var g = new OlderPushGate();
        bool held = false;
        g.exit(ref held);   // never entered
        Assert.IsFalse(held, "exit without enter: no throw, held stays false");
        g.enter(ref held);
        Assert.IsTrue(held, "enter → held");
        g.exit(ref held);
        Assert.IsFalse(held, "exit → not held");
        g.exit(ref held);
        Assert.IsFalse(held, "a second exit is safe");
        g.exit(ref held);
        Assert.IsFalse(held, "and a third");
        // the gate is really free: another thread takes it within 5 s
        bool got = false;
        var w = new Worker(() =>
        {
            bool h = false;
            g.enter(ref h);
            got = h;
            g.exit(ref h);
        });
        w.join("another thread entering");
        Assert.IsTrue(got, "another thread entered and saw held = true");
        // an exit(ref false) from ANOTHER thread does not release the holder's lock
        bool mine = false;
        g.enter(ref mine);
        var other = new Worker(() =>
        {
            bool h = false;
            g.exit(ref h);
        });
        other.join("a stray exit");
        var started = new ManualResetEventSlim(false);
        var done = new ManualResetEventSlim(false);
        var probe = new Worker(() =>
        {
            started.Set();
            using (g.beginOther(true)) { }
            done.Set();
        });
        Assert.IsTrue(started.Wait(5000), "the probe started");
        Assert.IsFalse(done.Wait(150), "the holder still holds the gate after a stray exit(ref false) of another thread");
        g.exit(ref mine);
        Assert.IsTrue(done.Wait(5000), "released by the holder's own exit");
        probe.join("the probe");
    }

    /* ★ histcs #46 r1 (O2 NIT-3): enter twice through the SAME flag takes the monitor ONCE (the second enter returns at once), so
     * ONE exit frees it — another thread then gets in. */
    [TestMethod]
    public void gate_enter_twice_same_flag_one_exit_frees()
    {
        var g = new OlderPushGate();
        bool held = false;
        g.enter(ref held);
        g.enter(ref held);   // olderMayPush after a keep on the same job: no second Monitor.Enter
        Assert.IsTrue(held, "held after two enters");
        g.exit(ref held);
        Assert.IsFalse(held, "one exit → not held");
        bool got = false;
        var w = new Worker(() =>
        {
            bool h = false;
            g.enter(ref h);
            got = h;
            g.exit(ref h);
        });
        w.join("another thread entering after ONE exit (it would block for ever on a monitor taken twice)");
        Assert.IsTrue(got, "another thread entered: the gate was really free after one exit");
    }

    [TestMethod]
    public void gate_enter_blocks_while_another_thread_holds()
    {
        var g = new OlderPushGate();
        var holding = new ManualResetEventSlim(false);
        var letGo = new ManualResetEventSlim(false);
        var first = new Worker(() =>
        {
            bool h = false;
            g.enter(ref h);
            holding.Set();
            letGo.Wait(5000);
            g.exit(ref h);
        });
        Assert.IsTrue(holding.Wait(5000), "the first thread holds the gate");
        var asking = new ManualResetEventSlim(false);
        var got = new ManualResetEventSlim(false);
        bool heldAfter = false;
        var second = new Worker(() =>
        {
            bool h = false;
            asking.Set();
            g.enter(ref h);
            heldAfter = h;
            got.Set();
            g.exit(ref h);
        });
        Assert.IsTrue(asking.Wait(5000), "the second thread is asking");
        Assert.IsFalse(got.Wait(150), "enter blocks while another thread holds the gate (150 ms)");
        letGo.Set();
        Assert.IsTrue(got.Wait(5000), "…and gets in within 5 s after the holder's exit");
        Assert.IsTrue(heldAfter, "enter set held = true");
        first.join("the first holder");
        second.join("the second holder");
    }

    [TestMethod]
    public void gate_many_threads_end_state()
    {
        var g = new OlderPushGate();
        var before = g.ticket();
        var bar = new Barrier(6);
        var ws = new List<Worker>();
        for (int i = 0; i < 6; i++)
        {
            ws.Add(new Worker(() =>
            {
                bar.SignalAndWait(5000);
                for (int k = 0; k < 300; k++)
                {
                    using (g.beginOther(true))
                    {
                        if ((k & 7) == 0) Thread.Yield();
                    }
                }
            }));
        }
        foreach (var w in ws) w.join("the load threads");
        var c = look(g, before);
        Assert.IsFalse(c.noLoadSince, "1800 loads began after the ticket — " + pair(c));
        Assert.IsTrue(c.noneInFlight, "all 1800 ended: the counters balance (no lost increment) — " + pair(c));
        var c2 = look(g, g.ticket());
        Assert.IsTrue(c2.noLoadSince && c2.noneInFlight, "a ticket taken after the storm sees a quiet gate — " + pair(c2));
        // loads racing the page: the check under the gate sees a state that matches one of the two orders (before or after the load's start)
        var g3 = new OlderPushGate();
        for (int round = 0; round < 30; round++)
        {
            var t = g3.ticket();
            var start = new ManualResetEventSlim(false);
            var w = new Worker(() =>
            {
                start.Wait(5000);
                using (g3.beginOther(true)) { }
            });
            start.Set();
            bool h = false;
            g3.enter(ref h);
            var cc = g3.counters(t);
            g3.exit(ref h);
            w.join("racing load " + round);
            var after = look(g3, t);
            // either the load started after the page's check (the page saw nothing) or before it (the page saw a start) — never a half state
            Assert.IsTrue(cc.noLoadSince == cc.noneInFlight || (!cc.noLoadSince && cc.noneInFlight), "round " + round + ": a consistent view — " + pair(cc));
            Assert.IsFalse(after.noLoadSince, "round " + round + ": afterwards the load counts as begun since the ticket — " + pair(after));
            Assert.IsTrue(after.noneInFlight, "round " + round + ": and it ended — " + pair(after));
        }
    }

    /* ===================== the line builders ===================== */

    private static string n(long v) => (v < 0 ? 0 : v).ToString(CultureInfo.InvariantCulture);

    private static readonly Regex Token = new Regex("^[a-z0-9_.=-]{1,40}$");

    /** The whole grammar for one body: tokens match the regex, ≤ 16 tokens, and the REAL P1Perf grammar accepts it. */
    private static void grammar(string body, string why)
    {
        string[] tokens = body.Split(' ');
        Assert.IsTrue(tokens.Length >= 1 && tokens.Length <= 16, why + ": 1..16 tokens — " + tokens.Length);
        foreach (string tk in tokens)
        {
            Assert.IsTrue(Token.IsMatch(tk), why + ": token `" + tk + "` matches ^[a-z0-9_.=-]{1,40}$");
        }
        Assert.IsTrue(P1Perf.isValidLine("[P1] " + body), why + ": P1Perf accepts the body (isValidLine → isValidBody) — " + body);
    }

    [TestMethod]
    public void lines_exact_texts()
    {
        Assert.AreEqual("chat older read passes=3 window=151 ms=42 flush=7", HistoryOlderRules.olderReadBody(3, 151, 42, 7), "readBody: the keys in order");
        Assert.AreEqual("chat older read passes=1 window=101 ms=0 flush=0", HistoryOlderRules.olderReadBody(1, 101, 0, 0), "readBody: a first page of HV-5");
        Assert.AreEqual("chat older read passes=0 window=0 ms=0 flush=0", HistoryOlderRules.olderReadBody(0, 0, 0, 0), "readBody: zeros");
        Assert.AreEqual("chat older read passes=8 window=201 ms=12345 flush=987", HistoryOlderRules.olderReadBody(8, 201, 12345, 987), "readBody: bigger numbers, no grouping");
        Assert.AreEqual("chat older push n=50 json=12345 build=9", HistoryOlderRules.olderPushBody(50, 12345, 9), "pushBody: the keys in order");
        Assert.AreEqual("chat older push n=0 json=0 build=0", HistoryOlderRules.olderPushBody(0, 0, 0), "pushBody: zeros (an empty slice)");
        Assert.AreEqual("chat older push n=1 json=2 build=3", HistoryOlderRules.olderPushBody(1, 2, 3), "pushBody: small numbers");
        Assert.AreEqual("chat loadmore in", HistoryOlderRules.LoadMoreInBody, "the first line");
        foreach (string body in new[] { HistoryOlderRules.olderReadBody(3, 151, 42, 7), HistoryOlderRules.olderPushBody(50, 12345, 9), HistoryOlderRules.LoadMoreInBody })
        {
            grammar(body, "normal");
        }
    }

    [TestMethod]
    public void lines_extreme_values_stay_in_the_grammar()
    {
        int[] ints = { int.MinValue, -1, 0, 1, 99, 100, int.MaxValue };
        long[] longs = { long.MinValue, -1L, 0L, 1L, 4294967296L, long.MaxValue };
        foreach (int p in ints)
        {
            foreach (int w in ints)
            {
                foreach (long ms in longs)
                {
                    foreach (long fl in longs)
                    {
                        string body = HistoryOlderRules.olderReadBody(p, w, ms, fl);
                        Assert.AreEqual("chat older read passes=" + n(p) + " window=" + n(w) + " ms=" + n(ms) + " flush=" + n(fl), body, "readBody(" + p + "," + w + "," + ms + "," + fl + "): a negative number is written as 0");
                        grammar(body, "readBody(" + p + "," + w + "," + ms + "," + fl + ")");
                    }
                }
            }
        }
        foreach (int r in ints)
        {
            foreach (int j in ints)
            {
                foreach (long b in longs)
                {
                    string body = HistoryOlderRules.olderPushBody(r, j, b);
                    Assert.AreEqual("chat older push n=" + n(r) + " json=" + n(j) + " build=" + n(b), body, "pushBody(" + r + "," + j + "," + b + "): a negative number is written as 0");
                    grammar(body, "pushBody(" + r + "," + j + "," + b + ")");
                }
            }
        }
        // the longest possible token: build=<19 digits> = 25 chars, inside the 40-char limit
        Assert.IsTrue(HistoryOlderRules.olderPushBody(int.MaxValue, int.MaxValue, long.MaxValue).Split(' ').Max(x => x.Length) <= 40, "the longest token is within 40 characters");
        Assert.AreEqual("chat older read passes=0 window=0 ms=0 flush=0", HistoryOlderRules.olderReadBody(-5, -1, -9L, -7L), "all negative → all 0");
        Assert.AreEqual("chat older push n=0 json=0 build=0", HistoryOlderRules.olderPushBody(int.MinValue, -1, long.MinValue), "all negative → all 0 (pushBody)");
        Assert.AreEqual("chat older push n=2147483647 json=2147483647 build=9223372036854775807", HistoryOlderRules.olderPushBody(int.MaxValue, int.MaxValue, long.MaxValue), "the maxima, written whole");
        // a culture with its own minus sign or digits changes nothing (the digits are invariant)
        CultureInfo saved = CultureInfo.CurrentCulture;
        try
        {
            foreach (string name in new[] { "sv-SE", "ar-SA", "fa-IR", "de-DE" })
            {
                CultureInfo? ci = null;
                try { ci = new CultureInfo(name); } catch (Exception) { ci = null; }   // an invariant-globalization box has no such culture: skip it
                if (ci == null) continue;
                CultureInfo.CurrentCulture = ci;
                Assert.AreEqual("chat older read passes=0 window=151 ms=1234567 flush=0", HistoryOlderRules.olderReadBody(-1, 151, 1234567, -2), "readBody under " + name);
                Assert.AreEqual("chat older push n=50 json=1234567 build=0", HistoryOlderRules.olderPushBody(50, 1234567, long.MinValue), "pushBody under " + name);
            }
        }
        finally
        {
            CultureInfo.CurrentCulture = saved;
        }
        // control: the grammar check is live (an uppercase letter, a 17th token, a 41-char token are refused)
        Assert.IsFalse(P1Perf.isValidLine("[P1] chat older Drop why=busy"), "control: uppercase refused");
        Assert.IsFalse(P1Perf.isValidLine("[P1] " + string.Join(" ", Enumerable.Repeat("x", 17))), "control: 17 tokens refused");
        Assert.IsFalse(Token.IsMatch(new string('a', 41)), "control: the token regex refuses 41 characters");
    }

    [TestMethod]
    public void lines_drop_words()
    {
        Assert.AreEqual("chat older drop why=busy", HistoryOlderRules.olderDropBody(OlderDrop.Busy));
        Assert.AreEqual("chat older drop why=closed", HistoryOlderRules.olderDropBody(OlderDrop.Closed));
        Assert.AreEqual("chat older drop why=channel", HistoryOlderRules.olderDropBody(OlderDrop.Channel));
        Assert.AreEqual("chat older drop why=load", HistoryOlderRules.olderDropBody(OlderDrop.Load));
        Assert.AreEqual("chat older drop why=anchor", HistoryOlderRules.olderDropBody(OlderDrop.Anchor));
        // the enum itself: None is 0 (the default), then the five words in the contract's order
        Assert.AreEqual("None,Busy,Closed,Channel,Load,Anchor", string.Join(",", Enum.GetNames(typeof(OlderDrop))), "the six members, in order");
        Assert.AreEqual(0, (int)OlderDrop.None, "None = 0");
        Assert.AreEqual(OlderDrop.None, default(OlderDrop), "default = None (keep)");
        foreach (OlderDrop why in Enum.GetValues(typeof(OlderDrop)))
        {
            if (why == OlderDrop.None) continue;
            string body = HistoryOlderRules.olderDropBody(why);
            Assert.AreEqual("chat older drop why=" + why.ToString().ToLowerInvariant(), body, "the word is the member's name, lower case");
            grammar(body, "dropBody(" + why + ")");
        }
    }

    [TestMethod]
    public void lines_by_type_only()
    {
        // no message text, address, name or file name can reach a line: every parameter of every builder is an int, a long or the OlderDrop enum
        Type t = typeof(HistoryOlderRules);
        var bodies = t.GetMethods(BindingFlags.Public | BindingFlags.Static).Where(m => m.Name.EndsWith("Body", StringComparison.Ordinal)).OrderBy(m => m.Name).ToList();
        Assert.AreEqual("olderDropBody,olderPushBody,olderReadBody", string.Join(",", bodies.Select(m => m.Name)), "exactly the three builders (the fourth line is the constant)");
        foreach (MethodInfo m in bodies)
        {
            Assert.AreEqual(typeof(string), m.ReturnType, m.Name + " returns string");
            foreach (ParameterInfo p in m.GetParameters())
            {
                Assert.IsTrue(p.ParameterType == typeof(int) || p.ParameterType == typeof(long) || p.ParameterType == typeof(OlderDrop), m.Name + "(" + p.Name + "): " + p.ParameterType.Name + " is not an int / long / OlderDrop");
            }
        }
        Assert.AreEqual("Int32,Int32,Int64,Int64", string.Join(",", t.GetMethod("olderReadBody")!.GetParameters().Select(p => p.ParameterType.Name)), "readBody(int passes, int window, long ms, long flushMs)");
        Assert.AreEqual("Int32,Int32,Int64", string.Join(",", t.GetMethod("olderPushBody")!.GetParameters().Select(p => p.ParameterType.Name)), "pushBody(int rows, int jsonLength, long buildMs)");
        Assert.AreEqual("OlderDrop", string.Join(",", t.GetMethod("olderDropBody")!.GetParameters().Select(p => p.ParameterType.Name)), "dropBody(OlderDrop why)");
        Assert.IsTrue(t.GetField("LoadMoreInBody", BindingFlags.Public | BindingFlags.Static)!.IsLiteral, "LoadMoreInBody is a const");
    }

    [TestMethod]
    public void lines_through_p1perf_line()
    {
        Assert.IsTrue(P1Perf.enabled, "control: the harness compiles the dev bodies (SPIXI_DEV_COEXIST)");
        fresh(() =>
        {
            var bodies = new List<string>
            {
                HistoryOlderRules.LoadMoreInBody,
                HistoryOlderRules.olderReadBody(3, 151, 42, 7),
                HistoryOlderRules.olderReadBody(int.MinValue, int.MaxValue, long.MinValue, long.MaxValue),
                HistoryOlderRules.olderPushBody(50, 12345, 9),
                HistoryOlderRules.olderPushBody(int.MaxValue, -1, long.MaxValue),
            };
            foreach (OlderDrop why in new[] { OlderDrop.Busy, OlderDrop.Closed, OlderDrop.Channel, OlderDrop.Load, OlderDrop.Anchor })
            {
                bodies.Add(HistoryOlderRules.olderDropBody(why));
            }
            foreach (string body in bodies)
            {
                Lines.Clear();
                P1Perf.line(body);
                Assert.AreEqual(1, Lines.Count, "P1Perf.line logs the body (a dropped body would log nothing): " + body);
                Assert.AreEqual("[P1] " + body, Lines[0], "the line is the prefix + the body");
            }
            // control (no call of P1Perf.line with an invalid body here: its ONE dropped warn per process belongs to Run.cs's p1
            // check, which runs after this class): the grammar refuses a changed word
            Assert.IsFalse(P1Perf.isValidLine("[P1] chat older Drop why=busy"), "control: an invalid body fails the grammar");
        });
    }

    /* ===================== both switches OFF = the base ===================== */

    [TestMethod]
    public void both_off_is_the_base()
    {
        Assert.IsFalse(HistoryOlderRules.usesNewPath(false, false), "usesNewPath(false, false) = false: loadMoreIn calls onLoadMore() and returns");
        var g = new OlderPushGate();
        var t = g.ticket();
        for (int i = 0; i < 50; i++)
        {
            Assert.IsTrue(g.beginOther(false) == null, "beginOther(false) = null: loadMessages makes no scope");
        }
        var c = look(g, t);
        Assert.IsTrue(c.noLoadSince && c.noneInFlight, "…and counts nothing — " + pair(c));
        // nextShow(false) = the base formula for every show 0..400 and step 1..60
        for (uint s = 0; s <= 400; s++)
        {
            for (uint step = 1; step <= 60; step++)
            {
                uint want = s;
                want += step;
                if (want == 100)
                {
                    want += step;
                }
                Assert.AreEqual(want, HistoryOlderRules.nextShow(s, step, false), "nextShow(" + s + ", " + step + ", false) = `s += st; if (s == 100) s += st;`");
            }
        }
    }

    [TestMethod]
    public void both_off_end_to_end_real_flags()
    {
        fresh(() =>
        {
            // dev mode with both keys stored 0: the old path in every part
            initWith(true, 0, 0);
            Assert.IsFalse(HistoryOlderRules.usesNewPath(HistcsFlags.LoadMoreOffUi, HistcsFlags.FirstOlderPage50), "both real switches OFF → the old path");
            Assert.IsTrue(new OlderPushGate().beginOther(HistcsFlags.LoadMoreOffUi) == null, "…no gate scope");
            Assert.AreEqual(150u, HistoryOlderRules.nextShow(50, 50, HistcsFlags.FirstOlderPage50), "…and the first older page holds 100 rows (50 → 150)");
            // the store build: both ON
            initWith(false, null, null);
            Assert.IsTrue(HistoryOlderRules.usesNewPath(HistcsFlags.LoadMoreOffUi, HistcsFlags.FirstOlderPage50), "both real switches ON → the new path");
            Assert.AreEqual(100u, HistoryOlderRules.nextShow(50, 50, HistcsFlags.FirstOlderPage50), "…and the first older page holds 50 rows (50 → 100)");
            IDisposable? scope = new OlderPushGate().beginOther(HistcsFlags.LoadMoreOffUi);
            Assert.IsTrue(scope != null, "…and a load makes a gate scope");
            scope!.Dispose();
            // HV-5 only (P-28 stored 0): the new path without the gate and without a task
            initWith(true, 0, null);
            Assert.IsTrue(HistoryOlderRules.usesNewPath(HistcsFlags.LoadMoreOffUi, HistcsFlags.FirstOlderPage50), "HV-5 only → loadMoreIn takes the new path");
            Assert.IsTrue(new OlderPushGate().beginOther(HistcsFlags.LoadMoreOffUi) == null, "…with no gate scope");
            Assert.AreEqual(100u, HistoryOlderRules.nextShow(50, 50, HistcsFlags.FirstOlderPage50), "…and the 50-row first page");
            // P-28 only (HV-5 stored 0): the gate, and the old window arithmetic
            initWith(true, null, 0);
            Assert.IsTrue(HistoryOlderRules.usesNewPath(HistcsFlags.LoadMoreOffUi, HistcsFlags.FirstOlderPage50), "P-28 only → the new path");
            Assert.IsTrue(new OlderPushGate().beginOther(HistcsFlags.LoadMoreOffUi) != null, "…with a gate scope");
            Assert.AreEqual(150u, HistoryOlderRules.nextShow(50, 50, HistcsFlags.FirstOlderPage50), "…and the old 100-row first page");
        });
    }
}
