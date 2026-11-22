/* ★ defaultsb (Defaults batch, Damir's ruling 1750; #1478: one switch per change, the old path is the fallback; contract
 * docs/contract-defaultsb.md § 3) — the small rules behind three switches of SpixiFlags:
 *   DefaultAppLockOn    — a NEW account (create / restore) starts with App lock On;
 *   DefaultPayConfirmOn — a NEW account starts with Confirm payments On, where the platform has that row;
 *   LockDelayOneMinute  — the no-auth window after leaving the app is 60 s (the old path: 5 s).
 * An EXISTING account keeps its behaviour: no reader changes; an absent key still reads Off; only the two new-account sites of
 * LaunchPage (the create body, applyRestorePrefs) call writeNewAccount, and it writes the two FIXED values below — no value
 * from a WebView, no password, no other key. Nothing here unlocks: the bound only says whether a lock that is already on
 * screen needs an authentication (L157, fail closed). No MAUI type but Preferences, no Core type but Logging: the harness
 * runs this file (scripts/csh/DefaultsTests.cs). Log text: fixed words and digits only. */
using IXICore.Meta;
using Microsoft.Maui.Storage;
using System;

namespace SPIXI
{
    public static class DefaultsRules
    {
        /** The App lock preference (bool). Absent = Off. */
        public const string LockKey = "lockenabled";

        /** The no-auth window in seconds: the old path, and the one of LockDelayOneMinute. */
        public const double GraceSecondsOld = 5;
        public const double GraceSecondsNew = 60;

        /** The stored App lock setting — the body App.isLockEnabled() had, moved here unchanged: absent = false. */
        public static bool lockEnabledStored()
        {
            bool locked = false;
            if (Preferences.Default.ContainsKey(LockKey))
            {
                locked = (bool)Preferences.Default.Get(LockKey, false);
            }
            return locked;
        }

        /** The bound of the no-auth window: 60 s with the switch on, 5 s with it off. */
        public static double graceSeconds(bool oneMinute)
        {
            return oneMinute ? GraceSecondsNew : GraceSecondsOld;
        }

        /** App.OnResume's test, with the bound as the only variable. `secondsAway` = the time since the app left the screen.
         *  A negative value (a clock set back) is never inside. With the switch off this is the old expression:
         *  `>= 0 && <= 5`. */
        public static bool withinGrace(double secondsAway, bool oneMinute)
        {
            return secondsAway >= 0 && secondsAway <= graceSeconds(oneMinute);
        }

        /** ★ defaultsb (#1750, #46 round 1 R1-2): the leaving stamp after App.onUnlock. A VERIFIED unlock resolves the absence
         *  the stamp measured, so the stamp goes and the next leaving edge lays a new one. The #500 rule keeps the stamp only
         *  while the lock is unresolved (App.OnResume puts it back). Switch off = the old path: the stamp is kept. This
         *  changes the measure only; it unlocks nothing and reads no clock. */
        public static DateTime? stampAfterUnlock(DateTime? stamp, bool oneMinute)
        {
            return oneMinute ? null : stamp;
        }

        /** The two defaults of a NEW account. Called from the create body and from applyRestorePrefs, right after their
         *  `Remove("lockenabled")`. Writes `lockenabled = true` when `appLockOn`; writes `payKey = true` when `payConfirmOn`
         *  and `paySupported` (Windows has no Confirm payments row: nothing is written there). Writes nothing else and
         *  removes nothing. Each write has its own try: a throw is logged by its exception TYPE only and the other write
         *  still runs. A switch that is off leaves its key as the caller left it (absent = Off, the old path). */
        public static void writeNewAccount(bool appLockOn, bool payConfirmOn, bool paySupported, string payKey)
        {
            bool lockWritten = false;
            bool payWritten = false;
            if (appLockOn)
            {
                try
                {
                    Preferences.Default.Set(LockKey, true);
                    lockWritten = true;
                }
                catch (Exception ex)
                {
                    Logging.warn("[DEFAULTS] applock write failed (" + ex.GetType().Name + ")");
                }
            }
            if (payConfirmOn && paySupported)
            {
                try
                {
                    Preferences.Default.Set(payKey, true);
                    payWritten = true;
                }
                catch (Exception ex)
                {
                    Logging.warn("[DEFAULTS] pay write failed (" + ex.GetType().Name + ")");
                }
            }
            Logging.info("[DEFAULTS] new account: applock=" + (lockWritten ? "1" : "0") + " pay=" + (payWritten ? "1" : "0"));
        }

        /** The one start line of this batch (SpixiFlags.init, all builds): fixed words, 0|1 and 60|5 only. */
        public static string flagsLine(bool appLock, bool pay, bool delay)
        {
            return "[FLAGS] defaultsb applock=" + (appLock ? "1" : "0") + " paydefault=" + (pay ? "1" : "0")
                + " lockdelay=" + (delay ? "60" : "5");
        }
    }
}
