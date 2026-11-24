/* ★ lockb (Lock batch, ruling #1825 (1)/(2); #1478: one switch per change, the old path is the fallback; contract
 * docs/contract-lockb.md § 3, mechanisms docs/lockb-mechanisms.md § 3 / § 4) — the small rules LockPage asks before it sends a
 * hold push, pops the pause lock or shows the "Authentication Failed" alert:
 *   R1 holdPushAtLoad   — item 1: the value of the existing push setAuthPending at onLoad ("True" = the deferred prompt still
 *                         waits: hold, no belt; "1" = the prompt's window is open: hold, the 3 s belt from now; null = no push);
 *   R2 holdPushAtPrompt — item 1: the value at each PROMPT of maybeAuthenticate ("1" or null);
 *   R3 popAnimated      — item 1: the pause lock (built deferred) is popped with no animation (flash 2);
 *   R4 alertAfterPrompt — item 2: no alert when the prompt returned NotAvailable or Denied (no prompt was shown);
 *   R5 releaseHoldWithoutPrompt — item 1 (review r1 M-1 / m-1 / m-2): LockPage.releaseHold reveals the form (the base's own
 *                         "False") when the pause lock is up and no prompt will come (Android's OnPostResume with no hand-off, a
 *                         failed pop, a lock that did not present): R2's condition AND the prompt still deferred (review r2
 *                         X2 MINOR-1: a consumed hand-off is never revealed).
 * Why: the pause lock loads at the PAUSE and prompts at the RETURN, so the shell's 3 s belt drew the password form before the
 * prompt (flash 1); a device with no credential got the alert at every lock (D-1).
 * The switches: LockbFlags.HoldWhileDeferred (R1–R3, R5) and LockbFlags.NoAlertNoCredential (R4), each passed in as `on`.
 * OFF = the base: R1 / R2 null (no push), R3 true (the animated pop), R4 true (the alert after every not-authenticated prompt),
 * R5 false (no extra reveal: with no hold push the base's 3 s belt is the release).
 * A lock that was NOT built deferred (the cold start, the idle lock, a Settings authorise lock, iPhone / Mac / Windows) gets the
 * base from R1–R3 and R5 with the switch on too. Nothing here unlocks: a hold only delays the password form, the form and doUnlock
 * are unchanged; R4 only drops an alert (the form still opens). No MAUI type, no Plugin.Fingerprint type: the harness runs this
 * file (scripts/csh/LockShellTests.cs); R4 takes the enum NAME (`result.Status.ToString()`), compared exactly. Logs nothing. */
namespace SPIXI
{
    public static class LockShellRules
    {
        /** The two "pending" values of the existing push setAuthPending this batch sends (no new value, mechanisms § 3). */
        public const string HoldDeferred = "True";
        public const string HoldWindowOpen = "1";

        /** R1 — onLoad, after the base's `if (authAttempted) revealPasswordForm();`. null unless the switch is on, this lock was
         *  built deferred and no prompt has run yet; then "True" while the prompt is deferred and its window has not opened,
         *  else "1". */
        public static string? holdPushAtLoad(bool on, bool builtDeferred, bool authDeferred, bool windowOpened, bool authAttempted)
        {
            if (!(on && builtDeferred && !authAttempted))
            {
                return null;
            }
            return authDeferred && !windowOpened ? HoldDeferred : HoldWindowOpen;
        }

        /** R2 — maybeAuthenticate, the PROMPT branch, before the prompt: "1" when the switch is on and this lock was built
         *  deferred, else null (no push). */
        public static string? holdPushAtPrompt(bool on, bool builtDeferred)
        {
            return on && builtDeferred ? HoldWindowOpen : null;
        }

        /** R3 — popOwnModal: false (PopModalAsync(false), no animation) only when the switch is on and this lock was built
         *  deferred; true (the base's animated PopModalAsync()) otherwise. */
        public static bool popAnimated(bool on, bool builtDeferred)
        {
            return !(on && builtDeferred);
        }

        /** R4 — SetResultAsync, not authenticated, after revealPasswordForm(): false (no alert) only when the switch is on and
         *  `status` is exactly "NotAvailable" or "Denied" (the enum name, ordinal); true (the base's alert) otherwise — null,
         *  an empty string, another name, another case. */
        public static bool alertAfterPrompt(bool on, string? status)
        {
            if (!on || status == null)
            {
                return true;
            }
            return !(string.Equals(status, "NotAvailable", System.StringComparison.Ordinal)
                || string.Equals(status, "Denied", System.StringComparison.Ordinal));
        }

        /** R5 — LockPage.releaseHold: true (reveal the form with the base's setAuthPending("False")) only when the switch is on,
         *  this lock was built deferred (the only lock R1 can hold with no belt, "True") AND its prompt is still deferred
         *  (`authDeferred`: no hand-off consumed yet); false (a no-op) otherwise. Review r2 X2 MINOR-1: after a consumed hand-off
         *  (onForegroundReturned cleared authDeferred; a PROMPT ran or runs at onLoad) the shell already has "1" (the belt) or gets
         *  it at onLoad, so a later OnPostResume with no restart must not reveal. A reveal only: it never unlocks, never pops and
         *  changes no latch. */
        public static bool releaseHoldWithoutPrompt(bool on, bool builtDeferred, bool authDeferred)
        {
            return on && builtDeferred && authDeferred;
        }
    }
}
