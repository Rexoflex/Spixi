/* ★ S15 (#1293) — the PURE half of the native security rows O-19 · O-29 · O-30 (docs/security-handover-gate.md). No MAUI, no
 * Core type, no disk — the harness executes every rule (scripts/csh/S15SecTests.cs). The call sites are MAUI- or
 * platform-bound and are pinned by scripts/pins-s15/b-native.mjs:
 *   · O-29 — App.xaml.cs consumeOwnIntentSuppression / ownIntentFresh ask ownIntentWithinWindow;
 *   · O-30 — Platforms/Windows/SDesktopIdle.idleFor asks idleFromTicks (and returns IdleUnknown from its catch); its loop
 *            asks idleLockDue (★ S15 #46 r1 MINOR-3: one lock per unknown streak);
 *   · O-19 — Pages/Dev/DevPage.onSendLog asks devLogExportAllowed with the "devMode" preference. */
using System;

namespace SPIXI
{
    public static class S15SecRules
    {
        /* ★ S15 (O-29, #1293): the own-intent lock suppression window — 5 minutes before. The window exists only for the
         * round trip of the app's OWN picker / save intent (AND-21: "unlock before selecting a file"), and a pick or a save
         * takes seconds; every second past that is a phone left in the picker that reopens lock-free. ~60 s covers a slow
         * pick (a cloud provider, a folder walk) and closes the rest. One-shot and consumed on every resume, as before. */
        public const int OwnIntentWindowSeconds = 60;

        /** O-29: the stamp's age suppresses the resume lock only inside the window. A NEGATIVE age (the clock moved
         *  backwards) never does — the guard the 5-minute version already carried. */
        public static bool ownIntentWithinWindow(TimeSpan age)
        {
            return age.TotalSeconds >= 0 && age.TotalSeconds < OwnIntentWindowSeconds;
        }

        /* ★ S15 (O-30, #1293): the idle value when the session's last input cannot be read. It is the LARGEST span, so it
         * satisfies every clamped idle window (SDesktopIdle: 1 min … 24 h) — an unknown idle FAILS CLOSED for the lock. */
        public static readonly TimeSpan IdleUnknown = TimeSpan.MaxValue;

        /** O-30: idle time from GetLastInputInfo's result. Both ticks are 32-bit counters that wrap at ~49.7 days; the
         *  UNCHECKED subtraction keeps the difference right on either side of the wrap (#505). A failed call → IdleUnknown. */
        public static TimeSpan idleFromTicks(bool callSucceeded, uint nowTick, uint lastInputTick)
        {
            if (!callSucceeded)
            {
                return IdleUnknown;
            }
            uint delta = unchecked(nowTick - lastInputTick);
            return TimeSpan.FromMilliseconds(delta);
        }

        /* ★ S15 #46 r1 MINOR-3 (O-30): fail-closed must not become "relock every poll". When GetLastInputInfo keeps
         * failing, every poll reads IdleUnknown — and the watcher re-locked 30 s after each unlock. The unknown leg now locks
         * ONCE per unknown streak: once an unknown read has caused a lock, or has been seen while the lock is up (the user
         * then unlocks), further unknown reads count as NOT idle until a read SUCCEEDS (which ends the streak). The
         * wall-clock gap leg (sleep / hibernate) is untouched and still locks on its own. `unknownSpent` is the watcher's
         * one piece of state; this rule is the whole decision (SDesktopIdle only reads the inputs and acts). */
        public static bool idleLockDue(TimeSpan idle, TimeSpan gap, TimeSpan window, bool lockEnabled, bool lockActive,
            ref bool unknownSpent)
        {
            bool unknown = idle == IdleUnknown;
            if (!unknown)
            {
                unknownSpent = false;                    // a successful read ends the streak
            }
            else if (lockActive)
            {
                unknownSpent = true;                     // the streak's lock is (already) up; after the unlock it does not return
            }
            bool slept = sleptLeg(gap, window);
            bool untouched = unknown ? !unknownSpent : idle >= window;
            bool due = lockEnabled && !lockActive && (slept || untouched);
            if (due && unknown)
            {
                unknownSpent = true;                     // this lock is the streak's one lock
            }
            return due;
        }

        /** O-30: the wall-clock leg — far more real time between two polls than the window means the process was frozen
         *  (sleep, hibernate). A clock moved BACKWARDS (negative gap) never satisfies it. */
        public static bool sleptLeg(TimeSpan gap, TimeSpan window)
        {
            return gap >= TimeSpan.Zero && gap >= window;
        }

        /** O-19: the application log leaves the device only from dev mode. The ten-tap gate lives in the home shell; its
         *  C# record is the "devMode" preference (HomePage ixian:enableDevMode / ixian:disableDevMode), read by the caller. */
        public static bool devLogExportAllowed(bool devMode)
        {
            return devMode;
        }
    }
}
