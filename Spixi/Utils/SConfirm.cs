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
#if WINDOWS
                Task<bool>? dialog = SpixiFlags.ConfirmSafeDefault
                    ? showSafeDefaultConfirm(title, text, ok, SpixiLocalization._SL("global-dialog-cancel"))
                    : page.displaySpixiAlert(title, text, ok, SpixiLocalization._SL("global-dialog-cancel"), true);
#else
                Task<bool>? dialog = page.displaySpixiAlert(title, text, ok, SpixiLocalization._SL("global-dialog-cancel"), true);
#endif
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

#if WINDOWS
        /* ★ fixb1 item 1 (P50, #1645, docs/fixb1-mechanisms.md § Item 1) — Windows: Enter must not confirm the destructive verb.
         * WHY: MAUI's DisplayAlert on WinUI is a ContentDialog with OK as the PRIMARY button, Cancel as the SECONDARY button and
         * no DefaultButton (None) — the dialog then focuses its first button, the primary (destructive) one, and Enter presses
         * it (WALK #1540 SW-S5-ENTER = F; only the 600 ms rule stood in the way). This dialog puts the OK text on the PRIMARY
         * button and the Cancel text on the CLOSE button with DefaultButton = Close: Cancel has the focus and the accent at
         * open, Enter on it cancels, Esc closes (= None = Cancel), and only ContentDialogResult.Primary is OK
         * (FixB1Rules.confirmIsOk, executed in csh). A user who tabs to OK and presses Enter still presses OK.
         * REJECTED: swapping the two texts in DisplayAlert (Cancel as the primary) — MAUI answers true only for the primary and
         * false for everything else, so Esc / a closed dialog would read as "not Cancel" = OK: a dismiss turned into a confirm.
         * KNOWN LIMIT: this dialog is outside MAUI's alert queue. WinUI allows ONE ContentDialog at a time: a MAUI alert that
         * opens while it is up throws (every Spixi alert goes through displaySpixiAlert, which DROPS other alerts while a
         * confirm is up); a confirm that opens while a MAUI alert is up throws in ShowAsync — the task faults, askAsync's catch
         * logs its fixed line and answers Cancel (fail closed). No XamlRoot → Cancel. No timer frees anything (L157): the task
         * completes only when the dialog closes or throws. Switch SpixiFlags.ConfirmSafeDefault OFF = the displaySpixiAlert
         * call above, as before. */
        private static Task<bool> showSafeDefaultConfirm(string title, string text, string ok, string cancel)
        {
            var tcs = new TaskCompletionSource<bool>();
            Microsoft.Maui.ApplicationModel.MainThread.BeginInvokeOnMainThread(async () =>
            {
                try
                {
                    Microsoft.UI.Xaml.XamlRoot? root = winXamlRoot();
                    // ★ #46 r1 (S-C-4): an empty OK or Cancel text hides that button (WinUI) — then DefaultButton = Close names a
                    // button that is not there. Cancel, as the OFF arm does (MAUI throws on an empty cancel → askAsync's catch).
                    if (root == null || string.IsNullOrEmpty(ok) || string.IsNullOrEmpty(cancel))
                    {
                        tcs.TrySetResult(false);
                        return;
                    }
                    var dialog = new Microsoft.UI.Xaml.Controls.ContentDialog
                    {
                        Title = title,
                        // ★ fixb2 item 3 (Q-1): the template's ContentScrollViewer has its vertical bar Disabled, so a long text
                        // (a long peer nickname in the pay text) was CLIPPED with no way to scroll; this viewer scrolls it. It can
                        // never take the focus (not a tab stop, no focus on a click): the initial focus and Enter stay with Close.
                        Content = new Microsoft.UI.Xaml.Controls.ScrollViewer
                        {
                            VerticalScrollBarVisibility = Microsoft.UI.Xaml.Controls.ScrollBarVisibility.Auto,
                            HorizontalScrollBarVisibility = Microsoft.UI.Xaml.Controls.ScrollBarVisibility.Disabled,
                            IsTabStop = false,
                            AllowFocusOnInteraction = false,
                            Content = new Microsoft.UI.Xaml.Controls.TextBlock { Text = text, TextWrapping = Microsoft.UI.Xaml.TextWrapping.Wrap }
                        },
                        PrimaryButtonText = ok,
                        CloseButtonText = cancel,
                        DefaultButton = Microsoft.UI.Xaml.Controls.ContentDialogButton.Close,
                        XamlRoot = root
                    };
                    Microsoft.UI.Xaml.Style? style = winDialogStyle();
                    if (style != null)
                    {
                        dialog.Style = style;
                    }
                    dialog.Opened += (s, e) => winFocusCancel(dialog, true);
                    Microsoft.UI.Xaml.Controls.ContentDialogResult result = await dialog.ShowAsync();
                    tcs.TrySetResult(FixB1Rules.confirmIsOk((int)result));
                }
                catch (Exception ex)
                {
                    tcs.TrySetException(ex);   // askAsync's catch: the fixed line, Cancel
                }
            });
            return tcs.Task;
        }

        /** The XamlRoot of the MAUI root page's platform view, else of the first window's content; null = none (Cancel). */
        private static Microsoft.UI.Xaml.XamlRoot? winXamlRoot()
        {
            var app = Application.Current;
            if (app?.MainPage?.Handler?.PlatformView is Microsoft.UI.Xaml.UIElement el && el.XamlRoot != null)
            {
                return el.XamlRoot;
            }
            if (app != null && app.Windows.Count > 0 && app.Windows[0].Handler?.PlatformView is Microsoft.UI.Xaml.Window w
                && w.Content?.XamlRoot != null)
            {
                return w.Content.XamlRoot;
            }
            return null;
        }

        /** The WinUI 3 default ContentDialog style when the app resources hold it (a dialog made in code does not get it);
         *  never throws — no style = the bare control. */
        private static Microsoft.UI.Xaml.Style? winDialogStyle()
        {
            try
            {
                var res = Microsoft.UI.Xaml.Application.Current?.Resources;
                if (res != null && res.TryGetValue("DefaultContentDialogStyle", out object? st))
                {
                    return st as Microsoft.UI.Xaml.Style;
                }
            }
            catch (Exception)
            {
            }
            return null;
        }

        /* ★ fixb2 item 3 (n-20261117-win-confirm-no-default-focus, docs/fixb2-mechanisms.md § Item 3) — W-1 on Windows: the dialog opened
         * with no focus ring, no accent, and Enter did nothing. WinUI gives the default button only PROGRAMMATIC focus at open,
         * which after a mouse click is drawn as Pointer focus = no ring (focusmgr.cpp CoerceFocusState); and the key input may
         * still go to the WebView2. This step, on Opened and once more at Low dispatcher priority (the initial focus runs on
         * LayoutRoot.Loaded, in no fixed order with Opened), moves the KEYBOARD focus to the Close (Cancel) button — an app
         * Focus call is the documented way XAML takes the Win32 focus back to its island — and, when Close holds it, the Close
         * accent state. ONLY the template part FixB2Rules.focusPart names, ONLY when it shows the Cancel text and not the OK text
         * (FixB2Rules.mayTakeFocus); never the Primary (OK) button. It never completes the dialog task, starts no timer and
         * writes no log line; a missing button or a throw does nothing more (the dialog stays as WinUI opened it: Enter cancels
         * or does nothing, never OK). */
        private static void winFocusCancel(Microsoft.UI.Xaml.Controls.ContentDialog dialog, bool again)
        {
            try
            {
                string? part = FixB2Rules.focusPart((int)dialog.DefaultButton);
                Microsoft.UI.Xaml.Controls.Button? cancelButton = part == null ? null : winFindButton(dialog, part);
                if (cancelButton != null && FixB2Rules.mayTakeFocus(cancelButton.Name, cancelButton.Content as string, dialog.CloseButtonText, dialog.PrimaryButtonText))
                {
                    cancelButton.Focus(Microsoft.UI.Xaml.FocusState.Keyboard);
                    string? state = FixB2Rules.accentState((int)dialog.DefaultButton, cancelButton.FocusState == Microsoft.UI.Xaml.FocusState.Keyboard);
                    if (state != null)
                    {
                        Microsoft.UI.Xaml.VisualStateManager.GoToState(dialog, state, false);
                    }
                }
                if (again)
                {
                    dialog.DispatcherQueue?.TryEnqueue(Microsoft.UI.Dispatching.DispatcherQueuePriority.Low, () => winFocusCancel(dialog, false));
                }
            }
            catch (Exception)
            {
            }
        }

        /** The first Button named `name` in the visual tree under `root` (the dialog's own template: the dialog is the popup
         *  child), at most 512 elements; null = not found. */
        private static Microsoft.UI.Xaml.Controls.Button? winFindButton(Microsoft.UI.Xaml.DependencyObject root, string name)
        {
            var todo = new System.Collections.Generic.Stack<Microsoft.UI.Xaml.DependencyObject>();
            todo.Push(root);
            int seen = 0;
            while (todo.Count > 0 && seen < 512)
            {
                Microsoft.UI.Xaml.DependencyObject d = todo.Pop();
                seen++;
                if (d is Microsoft.UI.Xaml.Controls.Button b && b.Name == name)
                {
                    return b;
                }
                int n = Microsoft.UI.Xaml.Media.VisualTreeHelper.GetChildrenCount(d);
                for (int i = 0; i < n; i++)
                {
                    todo.Push(Microsoft.UI.Xaml.Media.VisualTreeHelper.GetChild(d, i));
                }
            }
            return null;
        }

        /* ★ fixb2 item 4 (n-20261117-win-confirm-enter-payment-miniapp, #1633) — Windows: the payment send confirm
         * (SPayments.confirmAndAuth; no auth step follows it on WinUI) and the three mini-app confirms (MiniAppPage.handleAction)
         * through the SAME dialog as the destructive confirm above: Cancel = the default (Close) button, ONLY
         * ContentDialogResult.Primary is yes (FixB1Rules.confirmIsOk), the item-3 focus step. Each call site has its own switch
         * (SpixiFlags.PayConfirmSafeDefault / MiniAppConfirmSafeDefault, with NativeConfirm: FixB2Rules.useSafeDialog); its
         * `#else` / OFF arm is the old displaySpixiAlert call.
         * THE GATE — WHY this entry HOLDS it (tryEnter / exit, as askAsync does) instead of counting as a plain alert: the
         * dialog is outside MAUI's alert queue and WinUI allows ONE ContentDialog at a time. A MAUI alert that opens while it is
         * up throws inside MAUI's `async void` alert handler (AlertManager.Windows.cs: ShowAlert → ContentDialog.ShowAsync, no
         * try) and the app STOPS — and a mini app can time an alert (an unknown action) while its own confirm is open. While
         * this entry holds the gate, displaySpixiAlert DROPS every other Spixi alert (P35), so that path is closed. Refused at
         * once (false, one fixed line) while a confirm or any other Spixi alert is up — ShowAsync would throw there anyway.
         * NOT here, because the old path of these call sites has neither: the 600 ms rule and the app-lock checks of askAsync.
         * FAIL CLOSED: a refused gate, no XamlRoot, an empty button text, Esc, the Close button, a dialog closed any other
         * way, a null task and every throw (a second ContentDialog too) answer false. Never throws; no timer (L157); the two
         * log lines are fixed words and an exception TYPE name — no title, text, name, address or amount. */
        internal static async Task<bool> askPlainSafeWinAsync(string title, string text, string ok, string cancel)
        {
            long token = gate.tryEnter();
            if (token == 0)
            {
                Logging.info("[CONFIRM] plain busy");
                return false;
            }
            try
            {
                Task<bool>? dialog = showSafeDefaultConfirm(title, text, ok, cancel);
                return dialog != null && await dialog;
            }
            catch (Exception ex)
            {
                Logging.warn("[CONFIRM] the dialog failed (" + ex.GetType().Name + ")");
                return false;
            }
            finally
            {
                gate.exit(token);
            }
        }
#endif
        /** The dialog texts per verb: SafetyRules.confirmTexts (pure, executed in csh over a hostile-name corpus) with the
         *  app's localisation lookup. */
        public static (string title, string text, string ok) textsFor(SafetyRules.ConfirmVerb verb, string? name, string? fallback, int alsoLeaveGroups = 0) =>
            SafetyRules.confirmTexts(verb, name, fallback, SpixiLocalization._SL, alsoLeaveGroups);
    }
}
