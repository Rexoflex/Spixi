// ★ perfb1 P-12 (WarmOnIdle) — the input-idle gate (Spixi/Utils/WarmIdleRules.cs), EXECUTED. The call sites are MAUI-bound
// (SpixiContentPage.inputIdleWaitMs / spareWaitsForInputIdle, HomePage.warmAccountAfterFirstPaint, MainActivity's touch
// stamp) and compile nowhere here; scripts/pins-perfb1/a-warm-idle.mjs pins that each site calls this rule.
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class PerfB1WarmIdleTests
{
    [TestMethod]
    public void quiet_time_is_1200_ms()
    {
        Assert.AreEqual(1200L, WarmIdleRules.QuietMs, "the quiet time the walk sheet measures");
    }

    [TestMethod]
    public void gates_only_with_the_switch_on_and_a_gated_platform()
    {
        Assert.IsTrue(WarmIdleRules.gates(true, true), "Android, switch ON");
        Assert.IsFalse(WarmIdleRules.gates(false, true), "switch OFF");
        Assert.IsFalse(WarmIdleRules.gates(true, false), "Windows / iPhone / Mac");
        Assert.IsFalse(WarmIdleRules.gates(false, false), "both off");
    }

    [TestMethod]
    public void switch_off_or_ungated_platform_waits_zero_the_old_delays()
    {
        foreach (long last in new long[] { 0, 1, 99_000, 100_000, 100_500, 200_000 })
        {
            Assert.AreEqual(0L, WarmIdleRules.waitMs(false, true, 100_000, last), "switch OFF, last=" + last);
            Assert.AreEqual(0L, WarmIdleRules.waitMs(true, false, 100_000, last), "ungated platform, last=" + last);
        }
    }

    [TestMethod]
    public void no_touch_since_the_start_warms_now()
    {
        Assert.AreEqual(0L, WarmIdleRules.waitMs(true, true, 5_000, 0), "stamp 0 = never touched");
        Assert.AreEqual(0L, WarmIdleRules.waitMs(true, true, 5_000, -3), "a negative stamp reads as never touched");
    }

    [TestMethod]
    public void waits_until_1200_ms_without_a_touch()
    {
        const long t = 1_000_000;
        Assert.AreEqual(1200L, WarmIdleRules.waitMs(true, true, t, t), "a touch just now → the whole quiet time");
        Assert.AreEqual(700L, WarmIdleRules.waitMs(true, true, t + 500, t), "500 ms after the touch → 700 left");
        Assert.AreEqual(1L, WarmIdleRules.waitMs(true, true, t + 1199, t), "1199 ms → 1 left");
        Assert.AreEqual(0L, WarmIdleRules.waitMs(true, true, t + 1200, t), "1200 ms exactly → warm now");
        Assert.AreEqual(0L, WarmIdleRules.waitMs(true, true, t + 60_000, t), "a minute later → warm now");
    }

    [TestMethod]
    public void a_clock_that_went_back_waits_the_whole_quiet_time()
    {
        Assert.AreEqual(WarmIdleRules.QuietMs, WarmIdleRules.waitMs(true, true, 10_000, 10_001), "now 1 ms before the stamp");
        Assert.AreEqual(WarmIdleRules.QuietMs, WarmIdleRules.waitMs(true, true, 10_000, 900_000), "now far before the stamp");
    }

    [TestMethod]
    public void the_wait_is_never_negative_and_never_above_the_quiet_time()
    {
        const long last = 50_000;
        for (long now = last - 3000; now <= last + 3000; now += 7)
        {
            long w = WarmIdleRules.waitMs(true, true, now, last);
            Assert.IsTrue(w >= 0 && w <= WarmIdleRules.QuietMs, "now=" + now + " wait=" + w);
            if (w > 0)
            {
                Assert.IsTrue(now < last || w == WarmIdleRules.QuietMs - (now - last), "a wait is the REMAINING quiet time (now=" + now + ")");
            }
        }
    }

    /* The gate's loop (SpixiContentPage.spareWaitsForInputIdle, HomePage's Account loop) modelled on a fake clock: wait the
     * answer, ask again. It must end, every wait must be >= 1 ms, and the warm must start at max(start, last touch + 1200). */
    private static long fireAt(long start, long[] touches, out int checks)
    {
        long now = start;
        long last = 0;
        int ti = 0;
        checks = 0;
        while (true)
        {
            while (ti < touches.Length && touches[ti] <= now)
            {
                last = touches[ti++];
            }
            checks++;
            Assert.IsTrue(checks < 1000, "the loop is bounded");
            long w = WarmIdleRules.waitMs(true, true, now, last);
            if (w == 0)
            {
                return now;
            }
            Assert.IsTrue(w >= 1, "every wait is at least 1 ms");
            now += w;
        }
    }

    [TestMethod]
    public void the_loop_warms_at_the_first_quiet_moment_and_ends()
    {
        Assert.AreEqual(10_000L, fireAt(10_000, new long[0], out int c0), "no touch → at the fixed delay");
        Assert.AreEqual(1, c0, "one check");
        Assert.AreEqual(10_000L, fireAt(10_000, new long[] { 8_000 }, out _), "last touch 2 s before → at the fixed delay");
        Assert.AreEqual(10_700L, fireAt(10_000, new long[] { 9_500 }, out int c1), "touch 500 ms before → 700 ms later");
        Assert.AreEqual(2, c1, "two checks");
        // a scroll: touches every 100 ms until 12 000 → the warm starts 1200 ms after the LAST one
        long[] scroll = new long[31];
        for (int i = 0; i < scroll.Length; i++)
        {
            scroll[i] = 9_000 + i * 100;
        }
        Assert.AreEqual(13_200L, fireAt(10_000, scroll, out int c2), "a scroll pushes the warm to last touch + 1200");
        Assert.IsTrue(c2 <= 4, "each wait is the remaining quiet time, so a scroll costs few checks (" + c2 + ")");
    }

    [TestMethod]
    public void trigger_a_after_a_close_tap_waits_1200_from_the_tap()
    {
        // The close tap at T is the last touch; the close posts the warm at once (CHAT_SPARE_WARM_AFTER_CLOSE_MS = 0).
        const long tap = 500_000;
        Assert.AreEqual(tap + 1200, fireAt(tap + 40, new long[] { tap }, out _), "warm 1200 ms after the close tap");
        // A re-open tap at T + 600 restarts the quiet time — the warm (then refused `chat`) moves to T + 1800.
        Assert.AreEqual(tap + 1800, fireAt(tap + 40, new long[] { tap, tap + 600 }, out _), "a re-open inside the window is cold");
    }

    /* ── #46 r1 A-1: the gate SERIALISES the hidden boots. Both waiters (the Account warm, the chat spare) count "last touch +
     * QuietMs" from the SAME stamp, so without a second input one touch in about (F+600, F+1800] made both due at the same
     * instant — two hidden WebViews booting together on the one shared renderer thread. The rule's fifth input is the time of
     * the last hidden boot that passed the gate (SpixiContentPage.lastHiddenBootMs, ONE main-thread static that both waiters
     * stamp in the turn their wait ends with 0). ── */

    [TestMethod]
    public void stagger_is_900_ms_the_old_gap_between_the_two_boots()
    {
        Assert.AreEqual(900L, WarmIdleRules.StaggerMs, "the old gap: Account at F+900, the spare at F+1800");
    }

    [TestMethod]
    public void the_stagger_rule()
    {
        const long t = 2_000_000;
        Assert.AreEqual(0L, WarmIdleRules.waitMs(true, true, t, 0, 0), "no touch, no boot yet → now");
        Assert.AreEqual(900L, WarmIdleRules.waitMs(true, true, t, 0, t), "a boot just now → the whole stagger");
        Assert.AreEqual(600L, WarmIdleRules.waitMs(true, true, t + 300, 0, t), "300 ms after a boot → 600 left");
        Assert.AreEqual(0L, WarmIdleRules.waitMs(true, true, t + 900, 0, t), "900 ms after a boot → now");
        Assert.AreEqual(WarmIdleRules.StaggerMs, WarmIdleRules.waitMs(true, true, t, 0, t + 5), "a clock that went back → the whole stagger");
        Assert.AreEqual(1100L, WarmIdleRules.waitMs(true, true, t + 100, t, t - 500), "the larger wait counts: quiet 1100 > stagger 300");
        Assert.AreEqual(800L, WarmIdleRules.waitMs(true, true, t + 100, t - 1000, t), "the larger wait counts: stagger 800 > quiet 100");
        Assert.AreEqual(WarmIdleRules.waitMs(true, true, t + 50, t), WarmIdleRules.waitMs(true, true, t + 50, t, 0), "no boot yet = the quiet wait alone");
        for (long now = t - 2000; now <= t + 2000; now += 13)
        {
            long w = WarmIdleRules.waitMs(true, true, now, t - 300, t);
            Assert.IsTrue(w >= 0 && w <= WarmIdleRules.QuietMs, "never negative, never above the quiet time (now=" + now + " wait=" + w + ")");
        }
    }

    [TestMethod]
    public void switch_off_or_ungated_runs_no_stagger_logic()
    {
        foreach (long boot in new long[] { 0, 99_000, 100_000, 100_500 })
        {
            Assert.AreEqual(0L, WarmIdleRules.waitMs(false, true, 100_000, 99_900, boot), "switch OFF, boot=" + boot);
            Assert.AreEqual(0L, WarmIdleRules.waitMs(true, false, 100_000, 99_900, boot), "ungated platform, boot=" + boot);
        }
    }

    /* The two waiters on ONE fake main thread with ONE shared stamp, exactly as the call sites run them: the Account loop
     * checks first at F+900 (its fixed delay), the spare at F+1800 (trigger B's fixed delay). A check asks the rule; 0 → the
     * hidden boot starts AND the stamp is written in the same turn (only when the gate applies — markHiddenBoot); else the
     * next check is `wait` later. Two checks due at the same instant run one after the other (`accountFirst` picks which). */
    private static long[] twoBoots(long f, long[] touches, bool accountFirst, bool flagOn = true)
    {
        long[] next = { f + 900, f + 1800 };
        long[] boot = { -1, -1 };
        long lastBoot = 0;
        for (int steps = 0; boot[0] < 0 || boot[1] < 0; steps++)
        {
            Assert.IsTrue(steps < 1000, "the two loops are bounded");
            int i;
            if (boot[0] >= 0) i = 1;
            else if (boot[1] >= 0) i = 0;
            else if (next[0] != next[1]) i = next[0] < next[1] ? 0 : 1;
            else i = accountFirst ? 0 : 1;
            long now = next[i];
            long last = 0;
            foreach (long x in touches) { if (x <= now && x > last) last = x; }
            long w = WarmIdleRules.waitMs(flagOn, true, now, last, lastBoot);
            if (w == 0)
            {
                boot[i] = now;
                if (WarmIdleRules.gates(flagOn, true)) lastBoot = now;
            }
            else
            {
                Assert.IsTrue(w >= 1, "every wait is at least 1 ms");
                next[i] = now + w;
            }
        }
        return boot;
    }

    [TestMethod]
    public void cold_start_no_touch_keeps_the_old_900_and_1800()
    {
        const long f = 30_000;
        foreach (bool first in new[] { true, false })
        {
            long[] b = twoBoots(f, new long[0], first);
            Assert.AreEqual(f + 900, b[0], "Account at F+900");
            Assert.AreEqual(f + 1800, b[1], "spare at F+1800");
        }
    }

    [TestMethod]
    public void one_touch_at_f_plus_700_keeps_the_two_boots_900_apart()
    {
        const long f = 30_000;
        foreach (bool first in new[] { true, false })
        {
            long[] b = twoBoots(f, new long[] { f + 700 }, first);
            long gap = System.Math.Abs(b[0] - b[1]);
            Assert.IsTrue(gap >= WarmIdleRules.StaggerMs, "the two hidden boots start >= 900 ms apart (Account " + (b[0] - f) + ", spare " + (b[1] - f) + ", account first on a tie: " + first + ")");
            Assert.AreEqual(f + 1900, System.Math.Min(b[0], b[1]), "the first boots at the touch + 1200");
            Assert.AreEqual(f + 2800, System.Math.Max(b[0], b[1]), "the second 900 ms after it");
        }
        for (long touch = f + 601; touch <= f + 1800; touch += 37)
        {
            long[] b = twoBoots(f, new long[] { touch }, true);
            Assert.IsTrue(System.Math.Abs(b[0] - b[1]) >= WarmIdleRules.StaggerMs, "touch at F+" + (touch - f) + ": Account " + (b[0] - f) + ", spare " + (b[1] - f));
        }
    }

    [TestMethod]
    public void a_scroll_moves_both_and_keeps_them_apart()
    {
        const long f = 30_000;
        long[] scroll = new long[40];
        for (int i = 0; i < scroll.Length; i++) scroll[i] = f + 100 + i * 100;   // until F+4000
        long[] b = twoBoots(f, scroll, true);
        Assert.AreEqual(f + 5200, System.Math.Min(b[0], b[1]), "the first boot: the last touch + 1200");
        Assert.AreEqual(f + 6100, System.Math.Max(b[0], b[1]), "the second: 900 ms later");
    }

    [TestMethod]
    public void switch_off_two_boots_are_the_old_timers_whatever_the_touches()
    {
        const long f = 30_000;
        long[] b = twoBoots(f, new long[] { f + 700, f + 1700 }, true, flagOn: false);
        Assert.AreEqual(f + 900, b[0], "OFF: Account at F+900");
        Assert.AreEqual(f + 1800, b[1], "OFF: spare at F+1800");
    }

    /* ── #46 r1 A-6: "no touch for 1200 ms" is also true when the user LEFT the app — the Account loop then booted a WebView
     * in a stopped activity. After the wait the boot needs a running page in the foreground, with the gate ON only. ── */
    [TestMethod]
    public void a_boot_after_the_wait_needs_the_foreground_only_with_the_gate_on()
    {
        Assert.IsFalse(WarmIdleRules.bootsAfterWait(true, true, false), "gate on, the user left the app → no boot (the next flush asks again)");
        Assert.IsFalse(WarmIdleRules.bootsAfterWait(true, false, true), "gate on, the page stopped → no boot");
        Assert.IsFalse(WarmIdleRules.bootsAfterWait(true, false, false), "gate on, both → no boot");
        Assert.IsTrue(WarmIdleRules.bootsAfterWait(true, true, true), "gate on, running in the foreground → boot");
        foreach (bool running in new[] { true, false })
        {
            foreach (bool fg in new[] { true, false })
            {
                Assert.IsTrue(WarmIdleRules.bootsAfterWait(false, running, fg), "gate off: the old path has no such test (running=" + running + " fg=" + fg + ")");
            }
        }
    }

    /* ── #46 r2 R2-4: after the foreground refusal (A-6) a QUIET resume has no chats flush, so nothing asked the Account
     * warm again. HomePage's call sites, modelled: the flush and onResume call warm(); warm() is the one-shot latch, then
     * (after its 900 ms and the gate) bootsAfterWait; the refusal releases the latch and sets ONE retry bool that onResume
     * consumes. `retry: false` is the call site before the fix. ── */
    private sealed class AccountModel
    {
        public bool gated = true, running = true, fg = true, latched, retryOnResume, retry = true;
        public int boots;
        public void warm()   // warmAccountAfterFirstPaint (its wait is not modelled: the checks run at its end)
        {
            if (latched) return;
            latched = true;
            if (!WarmIdleRules.bootsAfterWait(gated, running, fg)) { latched = false; if (retry) retryOnResume = true; return; }
            boots++;
        }
        public void flush() => warm();   // loadChats → warmAccountAfterFirstPaint
        public void quietResume()        // App.OnResume (isInForeground = true first) → HomePage.onResume
        {
            fg = true;
            if (retryOnResume) { retryOnResume = false; warm(); }
        }
    }

    [TestMethod]
    public void model_a_background_refusal_is_asked_again_at_a_quiet_resume()
    {
        var m = new AccountModel();
        m.fg = false;
        m.flush();   // the first flush, but the user left the app before the warm was due
        Assert.AreEqual(0, m.boots, "no boot in the background");
        m.quietResume();
        Assert.AreEqual(1, m.boots, "the quiet resume asks the Account warm again: it boots once");
        m.quietResume(); m.flush();
        Assert.AreEqual(1, m.boots, "never a second SettingsPage (the latch)");
    }

    [TestMethod]
    public void model_a_flush_that_warmed_first_leaves_the_resume_nothing_to_do()
    {
        var m = new AccountModel();
        m.fg = false;
        m.flush();
        m.fg = true;
        m.flush();   // a natural flush in the foreground warms it
        Assert.AreEqual(1, m.boots, "the flush warmed it");
        m.quietResume();
        Assert.AreEqual(1, m.boots, "the resume's retry meets the latch: no second boot");
        var off = new AccountModel { gated = false, fg = false };
        off.flush(); off.quietResume();
        Assert.AreEqual(1, off.boots, "gate off: the old path boots at the flush, the resume adds nothing");
        Assert.IsFalse(off.retryOnResume, "gate off: the retry bool is never set");
    }
}
