/* ★ fixb2 (Fix batch 2, #1312 rule 1 / #1478) — the PURE half of the batch's C# items. No MAUI, no Core type: the harness
 * runs it (scripts/csh/FixB2ConfirmTests.cs). Item 3 (the Windows safe-default confirm, inside SpixiFlags.ConfirmSafeDefault,
 * no new switch): which template button the focus step may move to and when the default-button accent state is applied.
 * SConfirm.cs (`#if WINDOWS`) calls these rules. Each item keeps its members between its own markers. */
namespace SPIXI
{
    public static class FixB2Rules
    {
        // ── item 3 ──
        /** The WinUI template part of the Close button of a ContentDialog: in SConfirm it carries the CANCEL text. */
        public const string CancelPart = "CloseButton";

        /** The accent state of the ContentDialog template for a Close default button. */
        public const string CancelAccentState = "CloseAsDefaultButton";

        /** Item 3: the template part the focus step looks for, from the WinUI ContentDialogButton as an int — None = 0,
         *  Primary = 1, Secondary = 2, Close = 3. ONLY a Close default button (the Cancel text) is a target; every other value
         *  answers null = no focus step (the dialog stays as WinUI opened it). Never the Primary (OK) or the Secondary part. */
        public static string? focusPart(int defaultButton)
        {
            return defaultButton == 3 ? CancelPart : null;
        }

        /** Item 3: the button found in the dialog's visual tree may take the keyboard focus ONLY if it is the Close part AND it
         *  shows the Cancel text AND that text is not the OK text (a button that reads like OK never gets the focus). An empty
         *  or missing text answers false. */
        public static bool mayTakeFocus(string? partName, string? shownText, string? cancelText, string? okText)
        {
            if (partName != CancelPart || string.IsNullOrEmpty(shownText) || string.IsNullOrEmpty(cancelText))
            {
                return false;
            }
            return string.Equals(shownText, cancelText, System.StringComparison.Ordinal)
                && !string.Equals(shownText, okText, System.StringComparison.Ordinal);
        }

        /** Item 3: the visual state to go to after the focus step — the Close accent ONLY when Close is the default button AND
         *  it holds the keyboard focus (the WinUI rule for a focused command area, ContentDialog_Partial.cpp DefaultButtonStates);
         *  else null = leave the states to WinUI. */
        public static string? accentState(int defaultButton, bool cancelHasKeyboardFocus)
        {
            return defaultButton == 3 && cancelHasKeyboardFocus ? CancelAccentState : null;
        }
        // ── end item 3 ──

        // ── item 4 ──
        /* Item 4 (n-20261117-win-confirm-enter-payment-miniapp, #1633; tests: scripts/csh/FixB2PayTests.cs) — Windows: the
         * payment send confirm and the three mini-app confirms through the safe-default dialog of SConfirm
         * (SConfirm.askPlainSafeWinAsync). Two switches, one per call-site family; the answer rule stays
         * FixB1Rules.confirmIsOk (only ContentDialogResult.Primary is yes). */

        /** The one start line of the two item-4 switches: fixed words and 0|1 only. */
        public static string flagsLine(bool payConfirmDefault, bool appConfirmDefault)
        {
            return "[FLAGS] payconfirmdefault=" + (payConfirmDefault ? "1" : "0") + " appconfirmdefault=" + (appConfirmDefault ? "1" : "0");
        }

        /** A call site shows the safe-default dialog ONLY when its OWN switch is on AND the alert drop of Session Safety is on
         *  (the NativeConfirm switch: every other Spixi alert is dropped while a confirm holds the gate). WHY the second term:
         *  the safe dialog is outside MAUI's alert queue and WinUI allows ONE ContentDialog at a time — a MAUI alert that opens
         *  over it throws inside MAUI's own handler and the app stops. With the drop off, nothing keeps other alerts away, so the
         *  call site keeps the old path (MAUI's queued alert). Anything else — the switch off — is the old path too. */
        public static bool useSafeDialog(bool ownSwitch, bool alertDropOn)
        {
            return ownSwitch && alertDropOn;
        }
        // ── end item 4 ──
    }
}
