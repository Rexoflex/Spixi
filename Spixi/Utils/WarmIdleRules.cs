/* ★ perfb1 P-12 (SpixiFlags.WarmOnIdle, default ON) — the input-idle gate in front of every hidden-WebView warm.
 *
 * Device fact (Galaxy A52s, adb walk 2026-11-12): on Android ALL WebViews share ONE renderer thread, so a hidden page
 * that boots during a scroll freezes the visible one (the chat spare: 18 dropped frames, worst 117 ms, against 2–3 and
 * 33–50 ms without it). The gate is one more WAIT in front of the existing warm paths: a warm starts its boot only after
 * QuietMs without a touch, and (#46 r1 A-1) StaggerMs after the last hidden boot, so the Account warm and the chat spare
 * never boot together. The fixed delays of today stay as the lower bound; every refusal still runs after the wait.
 *
 * Pure: the call sites pass the switch, the platform, the clock, the last-touch stamp and the last-boot stamp in
 * (SpixiContentPage.inputIdleWaitMs; the touch stamp is MainActivity.lastTouchMs, written by its DispatchTouchEvent; the
 * boot stamp is SpixiContentPage.lastHiddenBootMs, written by markHiddenBoot).
 * No MAUI type, no Core type. Executed by scripts/csh (PerfB1WarmIdleTests.cs).
 */
namespace SPIXI
{
    internal static class WarmIdleRules
    {
        /** No touch for this long = the input is idle. */
        internal const long QuietMs = 1200;

        /** The gate applies only with the switch ON and only on a gated platform (Android: one shared renderer thread).
         *  Windows (own renderer processes), iPhone and Mac (a process per view) are not gated. */
        internal static bool gates(bool flagOn, bool gatedPlatform)
        {
            return flagOn && gatedPlatform;
        }

        /** 0 = warm now. Else the ms to wait before the NEXT check: the remaining quiet time, 1..QuietMs (never negative).
         *  `lastTouchMs` <= 0 = no touch since the start → 0. A clock that went back (now before the stamp) → QuietMs.
         *  Switch off or an ungated platform → 0 (today's timers, unchanged). */
        internal static long waitMs(bool flagOn, bool gatedPlatform, long nowMs, long lastTouchMs)
        {
            if (!gates(flagOn, gatedPlatform))
            {
                return 0;
            }
            if (lastTouchMs <= 0)
            {
                return 0;
            }
            long since = nowMs - lastTouchMs;
            if (since < 0)
            {
                return QuietMs;
            }
            if (since >= QuietMs)
            {
                return 0;
            }
            return QuietMs - since;
        }

        /** ★ #46 r1 A-1: the least time between two hidden boots — the old gap (the Account warm at first flush + 900 ms,
         *  the chat spare at + 1800 ms). Both waiters count the quiet time from the SAME touch stamp, so without this one
         *  touch could make both due at the same instant. */
        internal const long StaggerMs = 900;

        /** The gate with the stagger: the larger of the quiet wait (above) and `StaggerMs` since the last hidden boot that
         *  passed the gate (`lastHiddenBootMs`, the call sites' ONE main-thread stamp; <= 0 = none yet). Never negative;
         *  a clock that went back (now before the boot stamp) → the whole stagger. Switch off or an ungated platform → 0:
         *  no stagger logic runs (today's timers, unchanged). */
        internal static long waitMs(bool flagOn, bool gatedPlatform, long nowMs, long lastTouchMs, long lastHiddenBootMs)
        {
            if (!gates(flagOn, gatedPlatform))
            {
                return 0;
            }
            long quiet = waitMs(flagOn, gatedPlatform, nowMs, lastTouchMs);
            if (lastHiddenBootMs <= 0)
            {
                return quiet;
            }
            long sinceBoot = nowMs - lastHiddenBootMs;
            long stagger;
            if (sinceBoot < 0)
            {
                stagger = StaggerMs;
            }
            else if (sinceBoot >= StaggerMs)
            {
                stagger = 0;
            }
            else
            {
                stagger = StaggerMs - sinceBoot;
            }
            return quiet > stagger ? quiet : stagger;
        }

        /** ★ #46 r1 A-6: after the wait, may the hidden boot start? With the gate on, "no touch for QuietMs" is also true
         *  when the user LEFT the app — so the boot starts only while the page runs AND the app is in the foreground (else
         *  the caller lets the next chats flush ask again). Gate off (switch off, an ungated platform) → true: the old
         *  path, which had no such test. */
        internal static bool bootsAfterWait(bool gated, bool running, bool foreground)
        {
            return !gated || (running && foreground);
        }
    }
}
