/* ★ lockb (the lock batch, Damir's ruling #1825 (3); #1478: its OWN switch, the old path is the fallback; contract
 * docs/contract-lockb.md § 3 "The clock rule"; the mechanism: docs/lockb-mechanisms.md § 5) — the SECOND CLOCK of the lock delay.
 *
 * WHAT. App.OnResume takes a pause lock down WITHOUT an authentication when the app was away for at most 5 / 60 s
 * (DefaultsRules.withinGrace). The base measures that absence with DateTime.Now alone. That is local wall time, and the person
 * who holds the unlocked phone can set it: the clock or the time zone moved back to 0–60 s after the leaving stamp (or a
 * daylight-saving fall-back) makes an absence of any length read as "inside", and the lock comes down with no authentication
 * (R1-1). The negative guard of DefaultsRules.withinGrace stops only a clock set back to BEFORE the stamp.
 *
 * THE RULE (withinGrace below). The lock comes down without an authentication only when BOTH clocks say "inside the bound":
 *   1. the wall rule, unchanged: DefaultsRules.withinGrace(wallSecondsAway, oneMinute)                 — false → OUTSIDE;
 *   2. the platform has no second clock (nowMono == null)                                              — the wall rule alone;
 *   3. a second clock, but the stamp has no twin (stampMono == null)                                   — OUTSIDE (fail closed);
 *   4. a reading the clock cannot give (below 0: nowMs()'s failed read, or a damaged value)             — OUTSIDE (fail closed);
 *   5. DefaultsRules.withinGrace((nowMono − stampMono) / 1000.0, oneMinute): the SAME bound and the SAME negative guard, so
 *      a negative difference is OUTSIDE.
 * Step 1 comes first and is never skipped: the result can only be MORE locks than the base, never fewer (the wall test stays
 * as a belt). This file unlocks nothing: the rule only says whether a lock that is already on the screen needs an
 * authentication (L157, fail closed).
 *
 * THE CLOCK. Android `SystemClock.elapsedRealtime()`: milliseconds since boot, it counts deep sleep, and neither the user nor
 * an app can set it. NOT Environment.TickCount64 and NOT Stopwatch: on Linux / Android they read CLOCK_MONOTONIC, which STOPS
 * while the device is suspended — a phone asleep for ten minutes would read as seconds, the unsafe direction.
 *
 * THE SWITCH. LockbFlags.SecondClock (`flagLockSecondClock`, an int preference, absent = 1; a stored 0 acts only in dev mode).
 * OFF = the base: App.OnResume keeps its one base statement and never calls withinGrace of this file; the twin stamps are
 * still written (one clock read each, no decision reads them) and the `resume/pauseLock-held` line is byte-identical.
 *
 * A REBOOT. The stamps live in memory only, so no stamp survives a reboot: the process is gone, the next start is a cold
 * start, and a cold start always locks (App makes LockPage the root). The rule does not rest on that alone: the clock starts
 * again from 0 at a boot, so a twin from before a boot is LARGER than a reading soon after it — the difference is negative →
 * OUTSIDE → the lock asks. (Once the new uptime passes the old twin the difference is positive again; then the wall rule of
 * step 1 must also say "inside" — the base's whole test. The second clock never adds an "inside".)
 *
 * THE PLATFORMS. Android only. iPhone, Mac, Windows and the harness have no second clock here (nowMs() == null): the wall
 * rule alone = the base. (Apple: a question for the Apple phase, the status doc; Windows does not lock on background.)
 *
 * No MAUI type, no Core type, no Preferences, no log call: the harness runs this file (scripts/csh/LockClockTests.cs). The one
 * text it builds (diagSuffix) is fixed words and digits only. */
using System;
using System.Globalization;

namespace SPIXI
{
    public static class LockClockRules
    {
        /** What nowMs() gives on a platform that HAS the clock when the read threw. Below 0, so step 4 of the rule reads it as
         *  OUTSIDE at either end (as the stamp's twin or as "now"). NOT null: null means "this platform has no second clock"
         *  and would hand the decision to the wall clock alone. */
        public const long FailedRead = -1;

        /** The second clock, in milliseconds. Android: SystemClock.elapsedRealtime() (since boot, sleep counted, not settable).
         *  Every other platform and the harness: null. It never throws — App calls it from a field initialiser, from the pause
         *  hook (markBackgrounded, outside lockOnPause's try) and from onUnlock; a throw there would cost more than the read. */
        public static long? nowMs()
        {
#if ANDROID
            try
            {
                return global::Android.OS.SystemClock.ElapsedRealtime();
            }
            catch (Exception)
            {
                return FailedRead;   // the platform has the clock, this read has no value: the rule says OUTSIDE (fail closed)
            }
#else
            return null;
#endif
        }

        /** App.OnResume's test with BOTH clocks (the header's five steps). `wallSecondsAway` = the base's value
         *  (sinceBackground.TotalSeconds); `nowMono` = ONE reading of nowMs() in OnResume; `stampMono` = the twin of the wall
         *  stamp that `wallSecondsAway` was measured from. A NaN or an infinite wall value is OUTSIDE by step 1 (every
         *  comparison with NaN is false). Step 4 also makes the subtraction safe: with both values >= 0 it cannot overflow. */
        public static bool withinGrace(double wallSecondsAway, long? nowMono, long? stampMono, bool oneMinute)
        {
            if (!DefaultsRules.withinGrace(wallSecondsAway, oneMinute))
            {
                return false;   // step 1: the wall rule, first and always
            }
            if (nowMono == null)
            {
                return true;    // step 2: no second clock on this platform — the wall rule alone (the base)
            }
            if (stampMono == null)
            {
                return false;   // step 3: a clock but no twin — a path wrote only the wall stamp; fail closed
            }
            long now = nowMono.Value;
            long stamp = stampMono.Value;
            if (now < 0 || stamp < 0)
            {
                return false;   // step 4: not a reading of this clock (it counts up from 0 at boot); fail closed
            }
            return DefaultsRules.withinGrace((now - stamp) / 1000.0, oneMinute);   // step 5: a negative difference is OUTSIDE
        }

        /** The twin after its wall stamp was decided: it stays only while the wall stamp stays. App.onUnlock calls it right
         *  after DefaultsRules.stampAfterUnlock, so a cleared leaving stamp takes its twin with it and a kept one (the switch
         *  LockDelayOneMinute off) keeps it. A twin never outlives its wall stamp. Reads no clock. */
        public static long? keepTwin(DateTime? wallStamp, long? twin)
        {
            return wallStamp.HasValue ? twin : null;
        }

        /** The tail of the `resume/pauseLock-held` diag line: "" with the switch off or with no second clock (the line is then
         *  byte-identical to the base), else ` mono=<n>s` — n = the whole seconds away by the second clock. Two fixed values
         *  stand for "no measure": `-2` = the stamp has no twin (step 3), `-1` = a negative difference or a reading below 0
         *  (steps 4 / 5; the real negative number is CLAMPED, never printed). Fixed words and digits only, culture-free. */
        public static string diagSuffix(bool on, long? nowMono, long? stampMono)
        {
            if (!on || nowMono == null)
            {
                return "";
            }
            if (stampMono == null)
            {
                return " mono=-2s";
            }
            long now = nowMono.Value;
            long stamp = stampMono.Value;
            if (now < 0 || stamp < 0 || now < stamp)
            {
                return " mono=-1s";
            }
            return " mono=" + ((now - stamp) / 1000).ToString(CultureInfo.InvariantCulture) + "s";
        }
    }
}
