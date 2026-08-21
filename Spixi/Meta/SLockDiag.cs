using IXICore.Meta;
using System;
using System.Diagnostics;

namespace SPIXI.Meta
{
    /// <summary>
    /// ★ LOCK INSTRUMENTATION — F1 / F2 / F3, and NOTHING ELSE.
    ///
    /// Damir's explicit call for this batch: the lock surface has only just started
    /// working, F3 has had TWO wrong fixes in one day, and a third guess is worse than
    /// no change at all. So this batch ships the MEASUREMENT and changes no lock
    /// behaviour whatsoever. Every method here writes a log line and returns.
    ///
    /// HOW DAMIR READS IT: dev mode is 10 taps on the "Chats" title → the Dev screen
    /// renders `ixian.log` and can share it. Every line below is tagged `[LOCKDIAG]`,
    /// so one search finds the whole story of a lock cycle.
    ///
    /// WHAT EACH FINDING NEEDS FROM IT:
    ///   F3 — the biometric/pattern prompt never fires on RESUME. The four gates
    ///        (uiReady · pageVisible · authAttempted · authDeferred) are printed on every
    ///        entry to maybeAuthenticate together with the branch it took, and the resume
    ///        path prints whether `onForegroundReturned()` was reached at all. That is
    ///        exactly the question the verdict asks, and the log answers it without a
    ///        single behavioural change.
    ///        ⚠ Damir authenticates with a PATTERN — the device-credential fallback
    ///        (AllowAlternativeAuthentication = true), not a fingerprint. If the gates all
    ///        read correctly and the prompt still does not appear, that is the answer:
    ///        the fault is inside the plugin's device-credential path after a pause, not
    ///        in our gating, and the next step is the plugin rather than this file.
    ///   F1 — the WHITE FLASH. Relative milliseconds are stamped on every phase from the
    ///        pause onward, so the gap the flash lives in is visible rather than guessed:
    ///        a long gap between `push-requested` and `webview-onload` points at the
    ///        window background showing through, a long one after `presented` points at
    ///        lock.html's own first paint.
    ///   F2 — the SPLASH-BLUE status bar. `repaintSystemBars` reports every call and the
    ///        colours it resolved, and `barsNotRepainted` records the pause path making no
    ///        such call. The hypothesis is that the pause-presented lock never repaints;
    ///        the log confirms or kills it in one background.
    ///
    /// This class is deliberately allocation-light and exception-proof: it sits on the
    /// pause path, which is time-critical, and a diagnostic that can throw into OnPause
    /// would be far worse than the bug it is chasing.
    /// </summary>
    public static class SLockDiag
    {
        private const string TAG = "[LOCKDIAG]";
        private static readonly Stopwatch clock = new Stopwatch();
        private static readonly object sync = new object();
        private static string cycle = "";

        /// <summary>Begin a new lock cycle and reset the relative clock. Called from the
        /// pause hook and from the resume path.</summary>
        public static void startCycle(string reason)
        {
            try
            {
                lock (sync)
                {
                    cycle = reason ?? "";
                    clock.Restart();
                }
                Logging.info(TAG + " ===== cycle start: " + reason + " =====");
            }
            catch (Exception) { }
        }

        /// <summary>Stamp a phase with the milliseconds since the cycle started.</summary>
        public static void mark(string phase, string detail = "")
        {
            try
            {
                long ms;
                string c;
                lock (sync)
                {
                    /* ★ AUDIT MAJOR: a mark on a clock that was never started printed
                     * "+-1ms []" — and F1 is reported on LAUNCH as well as on every
                     * background, while only the Android pause path calls startCycle. A
                     * whole device round would have produced no timing at all for the leg
                     * Damir was asked to test. So an un-started clock STARTS here, under a
                     * name that says the cycle was inferred rather than declared. */
                    if (!clock.IsRunning)
                    {
                        clock.Restart();
                        cycle = string.IsNullOrEmpty(cycle) ? "auto" : cycle;
                    }
                    ms = clock.ElapsedMilliseconds;
                    c = cycle;
                }
                Logging.info(TAG + " +" + ms + "ms [" + c + "] " + phase
                    + (string.IsNullOrEmpty(detail) ? "" : " · " + detail));
            }
            catch (Exception) { }
        }

        /// <summary>
        /// ★ F3 — the four gates and the branch, printed together. This is the single
        /// most important line in the batch: it says, for every call, whether the prompt
        /// was skipped and which gate did it.
        /// </summary>
        public static void authGates(string where, bool uiReady, bool pageVisible,
            bool authAttempted, bool authDeferred, string branch)
        {
            mark("auth/" + where,
                "uiReady=" + uiReady
                + " pageVisible=" + pageVisible
                + " authAttempted=" + authAttempted
                + " authDeferred=" + authDeferred
                + " → " + branch);
        }

        /// <summary>★ F2 — a system-bar repaint actually happened, and with what.</summary>
        public static void barsRepainted(string pageKind, string bottom, string top)
        {
            /* ⚠ AUDIT MINOR: this fires on EVERY repaint — every home tab switch, every
             * theme sweep, every settings visit — and the class doc promises that one
             * search for [LOCKDIAG] finds the story of a LOCK cycle. Unfiltered it would
             * also find unrelated navigation and bury the evidence. So bar events are
             * reported only when they can bear on F1/F2: a lock page, or a cycle that a
             * pause actually declared. */
            if (!isLockRelated(pageKind))
            {
                return;
            }
            mark("bars/repaint", pageKind + " bottom=" + bottom + " top=" + top);
        }

        private static bool isLockRelated(string pageKind)
        {
            if (!string.IsNullOrEmpty(pageKind) && pageKind.IndexOf("Lock", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return true;
            }
            lock (sync)
            {
                // A pause cycle is running: everything painted during it is evidence.
                return clock.IsRunning && cycle == "pause";
            }
        }

        /// <summary>★ F2 — a point where the bars were NOT repainted, and the code path
        /// that skipped it. The pause-presented lock is the suspect.</summary>
        public static void barsNotRepainted(string where)
        {
            mark("bars/skip", where);
        }
    }
}
