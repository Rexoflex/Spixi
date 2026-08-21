using IXICore;
using IXICore.Meta;   // #457: Logging
using Microsoft.Maui.ApplicationModel;   // ★ F-4: MainThread
using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using Plugin.Fingerprint.Abstractions;
using SPIXI.Lang;
using SPIXI.Meta;
using System;
using System.IO;
using System.Linq;   // #229: ModalStack (IReadOnlyList<Page>).Contains
using System.Threading;
using System.Threading.Tasks;
using System.Web;

namespace SPIXI
{
    [XamlCompilation(XamlCompilationOptions.Compile)]
    public partial class LockPage : SpixiContentPage
    {
        private CancellationTokenSource _cancel;
        private bool justConfirmAction = false;
        /* ★ #234 (closed 2026-08-20, Damir): App's OWN locks — the cold-start one is not
         * one of these, see below. They are justConfirm pages so that they pop a modal
         * instead of rewriting the navigation stack, and confirm mode renders Cancel,
         * which fires authSucceeded(false) → App.onUnlock → UNLOCKED, with no password.
         * appLockMode suppresses both exits. The COLD-START lock deliberately keeps its
         * "use a different wallet" hatch: that route leads to setup, never into the app,
         * and it is the only way back for someone who has forgotten the password. */
        private bool appLockMode = false;
        public event EventHandler<SPIXI.EventArgs<bool>> authSucceeded;
        public event EventHandler<SPIXI.EventArgs<bool>> authWithPassword;

        /* ★ C4.1 (#457, Damir on device): "cold start flashes the password screen before
         * the OS prompt takes over". maybeAuthenticate fires Plugin.Fingerprint as soon
         * as the page is loaded AND visible, so the form painted and the system sheet
         * landed on top of it — two screens for one action.
         *
         * A push would arrive a navigation round-trip after the first paint, i.e. it
         * would BE the flash. So the shell is told in the FIRST FRAME, through the same
         * generatePage carrier grammar as *SL{LaunchBootView} (#213: every C# datum
         * reaches a redesigned shell as a push OR a carrier — never addCustomString for
         * a live value, but this one is read once at parse time, which is what carriers
         * are for). While it is pending lock.html holds its boot spinner.
         *
         * ⚠ The carrier is a PLATFORM CONSTANT; maybeAuthenticate's gate is stateful
         * (uiReady, pageVisible, authAttempted, foreground). They are allowed to
         * disagree — a WebView reload of a live lock re-arms the hold for an attempt
         * that already happened — and onLoad releases the hold explicitly in that case.
         * The 3 s belt in the shell is what makes any residual disagreement harmless.
         * Set on EVERY construction, so the value can never go stale for a later load. */
        private static void markAuthPending()
        {
            SpixiLocalization.addCustomString("LockAuthPending",
                Device.RuntimePlatform == Device.WinUI ? "0" : "1");
        }

        public LockPage()
        {
            InitializeComponent();
            NavigationPage.SetHasNavigationBar(this, false);

            markAuthPending();
            loadPage(webView, "lock.html");
        }

        public LockPage(bool justConfirm) : this(justConfirm, false)
        {
        }

        public LockPage(bool justConfirm, bool appLock)
        {
            justConfirmAction = justConfirm;
            appLockMode = appLock;
            InitializeComponent();
            NavigationPage.SetHasNavigationBar(this, false);

            markAuthPending();
            loadPage(webView, "lock.html");
        }

        private void onNavigated(object sender, WebNavigatedEventArgs e)
        {
            // Deprecated due to WPF, use onLoad
        }

        // #229 (reviewer MINOR-1/-3): the lock may load while STAGED INVISIBLE
        // (pushModalLoaded). Biometrics must only fire once the page is actually
        // on screen — firing during staging popped the OS auth sheet over the
        // PREVIOUS screen's content, and a fast auth could PopModalAsync an empty
        // modal stack (the modal push had not happened yet).
        private bool uiReady = false;        // ixian:onload received
        private bool pageVisible = false;    // OnAppearing fired (really presented)
        private bool authAttempted = false;
        /* ★ #460 (Damir on device, first leg): the #454 audit fix for MAJOR-2 DID NOT
         * WORK, and the reason is a lifecycle detail worth writing down. It guarded on
         * `App.isInForeground` — but that flag is cleared in `App.OnSleep`, which MAUI
         * raises from Android's **OnStop**. The pause lock is created at **OnPause**,
         * one step earlier, so the flag was still TRUE when this ran: the prompt fired
         * into the pausing activity exactly as before, androidx.biometric cancelled it,
         * `authAttempted` latched, and the user came back to a password field with no
         * fingerprint offered. A lifecycle flag that turns over at the wrong moment is
         * worse than none — this is an EXPLICIT latch that App sets and clears itself. */
        private bool authDeferred = false;

        private void onLoad()
        {
            if(justConfirmAction)
                Utils.sendUiCommand(this, "setJustConfirm", "True");
            // #234: AFTER setJustConfirm — this mode supersedes it, and last push wins.
            if (appLockMode)
                Utils.sendUiCommand(this, "setAppLock", "True");

            /* #457 (audit MINOR-7): a WebView reload of a LIVE lock re-arms the shell's
             * hold from the carrier, but the attempt has already happened and no further
             * push is coming — so say so at once instead of making the user wait out the
             * 3 s belt. The carrier is a platform constant; this gate is stateful, and
             * they are allowed to disagree exactly here. */
            if (authAttempted)
                revealPasswordForm();

            uiReady = true;
            // ★ F1 INSTRUMENTATION (log only): the WebView has parsed and signalled. The
            // gap between the push and THIS line is the window showing through — the
            // leading candidate for the white flash.
            SPIXI.Meta.SLockDiag.mark("lock/webview-onload", "appLockMode=" + appLockMode);
            maybeAuthenticate();
        }

        protected override void OnAppearing()
        {
            base.OnAppearing();
            pageVisible = true;
            SPIXI.Meta.SLockDiag.mark("lock/OnAppearing");
            maybeAuthenticate();
        }

        // #230: in-place presents don't fire OnAppearing — same "really visible" signal.
        public override void onPresentedInPlace()
        {
            pageVisible = true;
            SPIXI.Meta.SLockDiag.mark("lock/onPresentedInPlace");
            maybeAuthenticate();
        }

        private async void maybeAuthenticate()
        {
            /* ★ F3 INSTRUMENTATION (log only — NO behaviour change here, deliberately).
             * Two failed fixes have already been made on this method. Every entry now
             * prints all four gates and the branch taken, so the next F5 says which one
             * is closing rather than leaving it to be guessed a third time. */
            if (!uiReady || !pageVisible || authAttempted)
            {
                SPIXI.Meta.SLockDiag.authGates("maybeAuthenticate", uiReady, pageVisible,
                    authAttempted, authDeferred, "SKIP: gate not ready");
                return;
            }

            if (Device.RuntimePlatform == Device.WinUI)
            {
                SPIXI.Meta.SLockDiag.authGates("maybeAuthenticate", uiReady, pageVisible,
                    authAttempted, authDeferred, "SKIP: WinUI");
                return;
            }

            /* ★ #454 AUDIT MAJOR-2, corrected by #460: never prompt into a BACKGROUNDED
             * app. The pause lock is pushed while the activity is pausing, so OnAppearing
             * fires there and the WebView keeps running — this reached Plugin.Fingerprint
             * against a paused activity. androidx.biometric cancels on pause, which meant
             * `authAttempted` latched and the real lock the user then looked at offered NO
             * fingerprint at all. Deferred, and deliberately NOT latched — App sets this
             * when it creates a pause lock and clears it from OnResume. */
            if (authDeferred)
            {
                SPIXI.Meta.SLockDiag.authGates("maybeAuthenticate", uiReady, pageVisible,
                    authAttempted, authDeferred, "SKIP: deferred (waiting for OnResume)");
                return;
            }

            SPIXI.Meta.SLockDiag.authGates("maybeAuthenticate", uiReady, pageVisible,
                authAttempted, authDeferred, "PROMPT");
            authAttempted = true;
            // Show biometric and alternative authentication methods
            try
            {
                await AuthenticateAsync(SpixiLocalization._SL("global-lock-auth-text"));
                // ★ F3: the prompt RESOLVED. If this line appears but no prompt was seen,
                // the plugin returned without showing anything — which moves the fault out
                // of our gating and into Plugin.Fingerprint's device-credential path
                // (Damir uses a PATTERN, i.e. AllowAlternativeAuthentication).
                SPIXI.Meta.SLockDiag.mark("lock/auth-returned");
            }
            catch (Exception e)
            {
                /* #457: the prompt never happened. The shell is holding its spinner for
                 * us, so a throw here would strand the user behind it until the 3 s
                 * belt. Say so at once and let the password field take over. */
                Logging.error("LockPage: biometric authentication threw: " + e);
                revealPasswordForm();
            }
        }

        private void onNavigating(object sender, WebNavigatingEventArgs e)
        {
            string current_url = HttpUtility.UrlDecode(e.Url);

            if (current_url.Equals("ixian:onload", StringComparison.Ordinal))
            {
                onLoad();
            }
            else if (current_url.Equals("ixian:back", StringComparison.Ordinal))
            {
                // No back button for this screen
            }
            else if (current_url.Contains("ixian:unlock:"))
            {
                // Retrieve the password and unlock
                string[] split = current_url.Split(new string[] { "ixian:unlock:" }, StringSplitOptions.None);
                string pass = split[1];
                if (pass != null)
                    doUnlock(pass);
            }
            else if (current_url.Equals("ixian:change", StringComparison.Ordinal))
            {
                if (justConfirmAction)
                {
                    if (authSucceeded != null)
                    {
                        authSucceeded(this, new SPIXI.EventArgs<bool>(false));
                    }
                    // #230: shown-in-place lock closes via the overlay path.
                    if (!closeModalOverlay(this) && Navigation.ModalStack.Contains(this))
                    {
                        Navigation.PopModalAsync();
                        // ★ F-4 (#399, audit): the MODAL-FALLBACK leg needs the repaint too.
                        // It is taken whenever the lock could not be shown in place — which
                        // is ALWAYS for the SettingsPage delete flows, because the lock is
                        // staged on SettingsPage while the overlay host is HomePage. Popping
                        // a modal is not a navigation, so nothing else gives the strip back.
                        MainThread.BeginInvokeOnMainThread(() => repaintSystemBarsFor(null));
                    }
                }
                else
                {
                    // Show the launch screen
                    Navigation.PushAsync(new SPIXI.LaunchPage(), Config.defaultXamarinAnimations);
                    removePage(this);
                }
            }
            else
            {
                // Otherwise it's just normal navigation
                e.Cancel = false;
                return;
            }
            e.Cancel = true;

        }

        private void doUnlock(string pass)
        {
            string target_filepath = Path.Combine(Config.spixiUserFolder, Config.walletFile);
            WalletStorage ws = new WalletStorage(target_filepath);
            if (!ws.verifyWallet(target_filepath, pass))
            {
                displaySpixiAlert(SpixiLocalization._SL("intro-restore-file-invalidpassword-title"), SpixiLocalization._SL("intro-restore-file-invalidpassword-text"), SpixiLocalization._SL("global-dialog-ok"));
            }
            else
            {
                if(authWithPassword != null)
                {
                    authWithPassword(this, new SPIXI.EventArgs<bool>(true));
                }
                performUnlock();
            }
        }

        private async void performUnlock()
        {
            if (authSucceeded != null)
            {
                authSucceeded(this, new SPIXI.EventArgs<bool>(true));
            }

            if (justConfirmAction)
            {
                // #230: shown-in-place lock closes via the overlay path; else pop the
                // modal — but never pop a stack this page is not on (#229 guard).
                if (!closeModalOverlay(this) && Navigation.ModalStack.Contains(this))
                {
                    Navigation.PopModalAsync();
                    MainThread.BeginInvokeOnMainThread(() => repaintSystemBarsFor(null));   // ★ F-4, same leg
                }
                return;
            }
            var home = HomePage.Instance(true);
            Navigation.InsertPageBefore(home, this);

            removePage(this);

            /* ★ F-4 (#399), SECOND SITE. The COLD-START lock (App.xaml.cs:193, `new
             * LockPage()`) is not an overlay and not a modal — it unlocks by REWRITING the
             * navigation stack, so nothing navigates and no overlay teardown runs. The
             * lock paints the Android strip its own fixed dark with light icons; without
             * this, the first screen after a cold unlock kept that strip over a light Home
             * until the next real page navigation. The resume lock is the sibling case and
             * is fixed in closeModalOverlay. No-op off Android. */
            MainThread.BeginInvokeOnMainThread(() =>
            {
                repaintSystemBarsFor(home);
            });
        }

        /* #460: App creates this lock while the activity is PAUSING. Hold the biometric
         * prompt until it says the app is really back. */
        public void deferAuthentication()
        {
            SPIXI.Meta.SLockDiag.mark("lock/deferAuthentication");
            authDeferred = true;
        }

        /* #454: the app is in the foreground again — run the prompt that was deferred
         * above. No-op when one already ran, when the page is not ready, or on WinUI.
         * ⚠ Clears the latch FIRST: maybeAuthenticate reads it, and the WebView may not
         * be loaded yet, in which case onLoad calls maybeAuthenticate again later and
         * must find the latch already down. */
        public void onForegroundReturned()
        {
            /* ★ F3 INSTRUMENTATION (log only): the verdict asks explicitly whether
             * App.OnResume reached this method at all. If this line is ABSENT from a
             * resume cycle, the fault is upstream in App.OnResume's branching; if it is
             * PRESENT and the following maybeAuthenticate still says SKIP, the gate that
             * closed is named on that line. Either way the next F5 answers it. */
            SPIXI.Meta.SLockDiag.mark("lock/onForegroundReturned", "clearing authDeferred");
            authDeferred = false;
            maybeAuthenticate();
        }

        protected override bool OnBackButtonPressed()
        {
            return true;
        }

        /* #457: release the shell's C4.1 hold. Harmless when nothing is held — a shell
         * built before this change ignores an unknown push, and one built after defines
         * setAuthPending unconditionally (the #258 bare-global rule). */
        private void revealPasswordForm()
        {
            try
            {
                Utils.sendUiCommand(this, "setAuthPending", "False");
            }
            catch (Exception e)
            {
                Logging.error("LockPage: setAuthPending push failed: " + e);
            }
        }

        private async Task AuthenticateAsync(string reason, string cancel = null, string fallback = null, string tooFast = null)
        {
            _cancel = new CancellationTokenSource();

            var dialogConfig = new AuthenticationRequestConfiguration("SPIXI", reason)
            {
                CancelTitle = cancel,
                FallbackTitle = fallback,
                AllowAlternativeAuthentication = true,
                ConfirmationRequired = true
            };

            dialogConfig.HelpTexts.MovedTooFast = tooFast;

            var result = await Plugin.Fingerprint.CrossFingerprint.Current.AuthenticateAsync(dialogConfig, _cancel.Token);

            await SetResultAsync(result);
        }
        
        private Task SetResultAsync(FingerprintAuthenticationResult result)
        {
            if (result.Authenticated)
            {
                performUnlock();
            }
            else
            {
                // #457: the prompt is done and it did not let the user in — the password
                // field is the way forward, so stop holding it behind the boot spinner.
                revealPasswordForm();
                _ = displaySpixiAlert(SpixiLocalization._SL("global-lock-invalidpassword-title"), SpixiLocalization._SL("global-lock-invalidpassword-text"), "Cancel");
            }

            return Task.CompletedTask;
        }

    }
}