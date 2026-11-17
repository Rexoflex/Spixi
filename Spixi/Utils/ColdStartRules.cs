#if SPIXI_DEV_COEXIST
/* ★ coldstart1 (#1680) — TEMPORARY, retire with the [P1] set. The PURE half of the developer-only cold-start marks
 * (`[P1] cold <token> t=<ms>`, Android dev builds only; P1Perf.cold / coldFlush / coldDraw are the platform half).
 *
 * Pure: no MAUI, no Android, no Core type, no I/O, no log sink, no Regex. The slots are claimed with Interlocked, so a
 * mark is one-shot per process. Before the flush a mark only STORES its Stopwatch stamp (the logger drops every line
 * before it starts); the flush turns every stored stamp into ms since the process start, in enum order, and from
 * then on a mark returns its body at once. The `logger` anchor line comes LAST, from `anchor` (one-shot, after the
 * flush), so the caller writes it right after reading its stamp. A body holds the fixed token words and integers only
 * (never a mark id as a number, never a value from the code around a call site). Every call site is on the main
 * thread. The harness runs it (scripts/csh). */
using System;
using System.Collections.Generic;
using System.Threading;

namespace SPIXI;

internal static class ColdStartRules
{
    /** The tokens, index = (int)ColdMark (the enum in P1Perf.cs, same order). */
    internal static readonly string[] Names =
    {
        "app_in", "base_in", "maui_in", "maui_build", "ctor_in", "config_in", "logger", "flags_in", "lang_in",
        "files_in", "theme_in", "node_in", "wallet_in", "wallet_out", "home_in", "home_out", "ctor_out", "base_out",
        "app_out", "act_in", "act_base", "act_hold", "act_out", "resume_in", "resume_out", "wv_in", "wv_new", "wv_out",
        "nav_in", "nav_out", "page", "page_end", "draw",
    };

    internal const long MaxMs = 99_999_999;

    private static readonly int LoggerId = (int)ColdMark.Logger;

    // 0 = the slot is free; any other value = the Stopwatch stamp of the first call (a stamp of 0 is stored as 1).
    private static readonly long[] slots = new long[Names.Length];
    private static int flushed = 0;   // 1 once the first flush began
    private static int live = 0;      // 1 once the flush fixed the offset: a mark returns its body at once
    private static double offsetMs = 0;

    /** `cold <token> t=<ms>`, or null for a bad id or ms outside 0..MaxMs. */
    internal static string? body(int id, long ms)
    {
        if (id < 0 || id >= Names.Length || ms < 0 || ms > MaxMs)
        {
            return null;
        }
        return "cold " + Names[id] + " t=" + ms;
    }

    /** One mark: a bad id, the `logger` id (only `anchor` writes it) or a used slot → null; before the flush → store
     *  the stamp, null; after → its body (or null). Every call site is on the main thread; a cross-thread mark during
     *  the flush may be lost or written twice, never with a wrong value. */
    internal static string? mark(int id, long ts, long freq)
    {
        if (id < 0 || id >= Names.Length || id == LoggerId)
        {
            return null;
        }
        long stamp = ts == 0 ? 1 : ts;
        if (Interlocked.CompareExchange(ref slots[id], stamp, 0) != 0)
        {
            return null;
        }
        if (Volatile.Read(ref live) == 0)
        {
            return null;
        }
        return body(id, msAt(Volatile.Read(ref offsetMs), ts, freq));
    }

    /** The flush (once; a second call returns an empty list): fixes the offset from the two clocks (`ts` = the
     *  Stopwatch stamp read right after the Java clock, `sinceStartMs` = ms since the process start at that clock),
     *  returns the bodies of every STORED mark in enum order (never `logger`: it does not claim the logger slot), then
     *  the rule is live. Every call site is on the main thread; a cross-thread mark between the snapshot and `live`
     *  may be lost or written twice, never with a wrong value. */
    internal static List<string> flush(long ts, long sinceStartMs, long freq)
    {
        List<string> outLines = new List<string>();
        if (Interlocked.CompareExchange(ref flushed, 1, 0) != 0)
        {
            return outLines;
        }
        if (freq <= 0)
        {
            return outLines;
        }
        double offset = sinceStartMs - ts * 1000.0 / freq;
        long[] snap = new long[Names.Length];
        for (int i = 0; i < snap.Length; i++)
        {
            snap[i] = Interlocked.Read(ref slots[i]);
        }
        Volatile.Write(ref offsetMs, offset);
        Volatile.Write(ref live, 1);
        for (int i = 0; i < snap.Length; i++)
        {
            if (i == LoggerId || snap[i] == 0)
            {
                continue;
            }
            string? b = body(i, msAt(offset, snap[i], freq));
            if (b != null)
            {
                outLines.Add(b);
            }
        }
        return outLines;
    }

    /** The anchor line `cold logger t=<ms>` (+ ` req=<reqMs>` when 0 ≤ reqMs ≤ MaxMs), for a Stopwatch stamp `ts` read
     *  right before the caller writes it, so its own log stamp is the phone clock at `t`. One-shot (it claims the
     *  `logger` slot; a second call → null); before the flush → null (and the slot stays free). */
    internal static string? anchor(long ts, long freq, long reqMs)
    {
        if (Volatile.Read(ref live) == 0)
        {
            return null;
        }
        if (Interlocked.CompareExchange(ref slots[LoggerId], ts == 0 ? 1 : ts, 0) != 0)
        {
            return null;
        }
        string? b = body(LoggerId, msAt(Volatile.Read(ref offsetMs), ts, freq));
        if (b == null)
        {
            return null;
        }
        if (reqMs >= 0 && reqMs <= MaxMs)
        {
            b = b + " req=" + reqMs;
        }
        return b;
    }

    /** The harness only: every slot free, not flushed, not live. */
    internal static void resetForTests()
    {
        Volatile.Write(ref live, 0);
        for (int i = 0; i < slots.Length; i++)
        {
            Interlocked.Exchange(ref slots[i], 0);
        }
        Volatile.Write(ref offsetMs, 0);
        Interlocked.Exchange(ref flushed, 0);
    }

    /* ms since the process start for a Stopwatch stamp, rounded (Math.Round); -1 when it is not a number in 0..MaxMs.
     * After the flush `t=` is built from Stopwatch (CLOCK_MONOTONIC: it STOPS while the phone sleeps), anchored to the
     * process start once at the flush. So a mark is valid only in a COLD launch, where the activity follows the process
     * start at once; a process woken earlier by a push (and asleep since) can show a too-small `t=` for the activity and
     * WebView marks. The walk reads COLD reps only. */
    private static long msAt(double offset, long ts, long freq)
    {
        if (freq <= 0)
        {
            return -1;
        }
        double ms = Math.Round(offset + ts * 1000.0 / freq);
        if (double.IsNaN(ms) || ms < 0 || ms > MaxMs)
        {
            return -1;
        }
        return (long)ms;
    }
}
#endif
