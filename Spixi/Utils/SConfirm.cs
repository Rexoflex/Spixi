/* ★ Session Safety (S-5, m168, P35, #1312 rule 1) — the NATIVE confirm before a destructive verb from the chat and chat-info
 * WebViews (Safety Dials q1 = A: removecontact · removehistory · leave · kick · ban on SingleChatPage + ContactDetails; home
 * keeps its page sheet, D5 as told to BE). Flag SpixiFlags.NativeConfirm (SafetyRules.needsConfirm); OFF = the verbs act at once.
 *
 * WHY: those WebViews render peer-controlled content (messages, names, the bot roster, shared media). A page sheet is drawn by
 * the same page — a script there can skip it and send the verb. The system dialog (MAUI DisplayAlert, via the root page in
 * SpixiContentPage.displaySpixiAlert) is outside every WebView: no page script can answer it. The signSend pattern
 * (SPayments.confirmAndAuth: native confirm, one at a time).
 *
 * ONE dialog at a time, app-wide: a second ask while one is up answers false at once (logged `busy`), an ask while any other
 * Spixi alert is up answers false, and every other displaySpixiAlert is DROPPED while a confirm is up (★ #46 r1 R2 MAJOR-2) —
 * a page cannot stack dialogs to make a tap land on the wrong one. (#46 r2: the one peer-timed direct DisplayAlert on the chat
 * page — bot not ready — goes through displaySpixiAlert now; other direct DisplayAlert / DisplayActionSheet calls are not
 * counted — recorded in P35.) Every outcome writes ONE fixed line `[CONFIRM] <verb> ok|cancel|busy|fast`
 * (SafetyRules.confirmLine: no name, no address). The texts show a name or address only through SafetyRules.dialogName (control
 * and bidi characters dropped, 48-character cap). */
using IXICore.Meta;
using Microsoft.Maui.Controls;
using SPIXI.Lang;
using System;
using System.Threading.Tasks;

namespace SPIXI
{
    public static class SConfirm
    {
        /** ★ #46 r2/r3: the state machine lives in the pure ConfirmGate (csh ConfirmGateTests): one confirm at a time, refused
         *  while another Spixi alert is up, released only by the holder's exit — no time bound (fail closed). */
        private static readonly ConfirmGate gate = new ConfirmGate();

        /** True while a native confirm is on screen. */
        public static bool isOpen => gate.isOpen;

        /** SpixiContentPage.displaySpixiAlert: 0 = a confirm is up, DROP this alert (one atomic step with the count — #46 r4
         *  NIT-1); else the alert's token for noteAlertClosed. A page cannot stack an OK-only alert over (or under) the confirm
         *  and make a repeated tap land on the destructive button. */
        public static long tryNoteAlertOpened() => gate.tryAlertOpened();

        public static void noteAlertClosed(long token) => gate.alertClosed(token);

        private static bool lockUp() => (Application.Current as global::Spixi.App)?.isAppLockActive == true;

        /** True only after the user tapped OK in the native dialog AND the app lock is still down. A throw, a null dialog task,
         *  Cancel, a confirm already up, ANOTHER alert already up, or the app lock up before OR after the dialog (★ #46 r1 R2
         *  MINOR-2 / r2 m-3: a bystander at the lock is not the user) → false. The continuation resumes on the caller's context
         *  (the main thread for an onNavigating caller). */
        public static async Task<bool> askAsync(SpixiContentPage page, SafetyRules.ConfirmVerb verb, string title, string text, string ok)
        {
            long token = gate.tryEnter();
            if (token == 0)
            {
                Logging.info(SafetyRules.confirmLine(verb, "busy"));
                return false;
            }
            bool yes = false;
            try
            {
                if (lockUp())
                {
                    Logging.info(SafetyRules.confirmLine(verb, "busy"));
                    return false;
                }
                long asked = Environment.TickCount64;
                Task<bool>? dialog = page.displaySpixiAlert(title, text, ok, SpixiLocalization._SL("global-dialog-cancel"), true);
                yes = dialog != null && await dialog;
                if (yes && lockUp())
                {
                    yes = false;   // the lock came up while the dialog was open
                }
                if (yes && SafetyRules.tooFast(Environment.TickCount64 - asked))
                {
                    // ★ #46 r4 (MINOR-1): an OK this fast is the second tap of a double tap the page timed — Cancel
                    Logging.info(SafetyRules.confirmLine(verb, "fast"));
                    return false;
                }
            }
            catch (Exception ex)
            {
                Logging.warn("[CONFIRM] the dialog failed (" + ex.GetType().Name + ")");
                yes = false;
            }
            finally
            {
                gate.exit(token);
            }
            Logging.info(SafetyRules.confirmLine(verb, yes ? "ok" : "cancel"));
            return yes;
        }

        /** The dialog texts per verb: SafetyRules.confirmTexts (pure, executed in csh over a hostile-name corpus) with the
         *  app's localisation lookup. */
        public static (string title, string text, string ok) textsFor(SafetyRules.ConfirmVerb verb, string? name, string? fallback, int alsoLeaveGroups = 0) =>
            SafetyRules.confirmTexts(verb, name, fallback, SpixiLocalization._SL, alsoLeaveGroups);
    }
}
