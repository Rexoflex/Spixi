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

        /* ★★★ #46 loop, W-4.6 ON #507 — A LOCK THAT PRESENTS WITH NO UI.
         *
         * THE EVIDENCE. Damir's failing Windows session, 2026-08-22. Three idle locks
         * fired. Two logged `lock/webview-onload` at 129 ms and 169 ms. The third logged
         * `lock/surface-applied`, then `lock/onPresentedInPlace` at +1347 ms, and then
         * NOTHING for two hours. `uiReady` stayed false, so every `maybeAuthenticate` said
         * "SKIP: gate not ready". The dark surface #13171B painted. The HTML never
         * arrived. That is the black window the user could not unlock.
         *
         * WHY NOBODY SAW IT. The evidence was the ABSENCE of a line. #503 taught the same
         * lesson twice: a state that logs nothing cannot be diagnosed. So a lock that
         * presents blank now SAYS SO, at the moment it happens.
         *
         * WHY IT MUST REPAIR ITSELF. `presentPreload(op, "timeout")` presents the lock
         * whatever the WebView did, and there was no retry. ⚠ REFUSING TO PRESENT IS NOT
         * THE ANSWER — that fails OPEN and leaves the app unlocked, which is worse than a
         * blank lock. The lock stays up; the UI is repaired underneath it.
         *
         * THE BOUNDS, and why each number is that number:
         *   · BLANK_LOCK_REPAIR_DELAY_MS = 2500. The healthy locks signalled in 129 ms and
         *     169 ms; the slowest COLD start in the restart log took 1036 ms. 2500 ms is
         *     more than twice the worst load ever measured, so a slow load is never
         *     mistaken for a dead one, and it is above pushModalLoaded's own 1200 ms
         *     timeout, so the timeout present cannot race the first check.
         *   · BLANK_LOCK_MAX_REPAIRS = 3. Three reloads and the watchdog stops, so the
         *     automatic recovery lives inside about 10 s and cannot loop for the session.
         *     A WebView that ignores three fresh sources in ten seconds is not going to
         *     answer a fourth ten seconds later.
         *   · BLANK_LOCK_MAX_SWEEP_REPAIRS = 3, AND IT IS A SEPARATE BUDGET. This is the
         *     one bound that took a second pass to get right. The escape hatch runs on a
         *     window activation, which in Damir's log came HOURS after the present — and
         *     with one shared budget the watchdog had already spent every attempt, so the
         *     eight clicks he made would each have logged "budget spent" and reloaded
         *     nothing. Three automatic retries against one bad second are not the same
         *     sample as one retry an hour later after the user acted. Total over the page's
         *     whole life: at most six reloads.
         *   · BLANK_LOCK_MIN_AGE_SECONDS = 3. What the ESCAPE HATCH uses before it calls a
         *     lock blank. It has to be longer than one watchdog wait, so a window
         *     activation during a normal load can never report a healthy lock as broken.
         *   · The SWEEP arms no timer. The next window activation is the next check, and the
         *     user clicking a black window is what produces it. That keeps the whole (c) leg
         *     free of anything that could outlive the page.
         *
         * ⚠ NOT WINDOWS-ONLY, DELIBERATELY. Damir hit this on Windows, but nothing in the
         * mechanism is WinUI's: the `ixian:onload` handshake, the load-then-present staging
         * and the timeout present are the same code on Android and iOS. A WebView that does
         * not load is not a Windows defect. The repair is inert when `uiReady` is true, so
         * the platforms that never hit it pay nothing.
         *
         * ⚠ FAIL CLOSED, EVERY PATH. Nothing here pops a page, clears a latch or calls
         * authSucceeded. The worst outcome is the outcome we already have — a lock with no
         * UI — and now the log names it. */
        private DateTime presentedAt = DateTime.MinValue;   // the present, then each reload
        private int blankRepairs = 0;        // the watchdog's budget (b)
        private int sweepRepairs = 0;        // the escape hatch's own budget (c)
        private int repairGeneration = 0;
        private bool lockClosing = false;
        private const int BLANK_LOCK_REPAIR_DELAY_MS = 2500;
        private const int BLANK_LOCK_MAX_REPAIRS = 3;
        private const int BLANK_LOCK_MAX_SWEEP_REPAIRS = 3;
        private const double BLANK_LOCK_MIN_AGE_SECONDS = 3;

        /** ★★ (a) — the question `App` could not ask. TRUE once lock.html has signalled
         *  `ixian:onload`. FALSE means the page on screen is a coloured rectangle. */
        public bool hasWebUi()
        {
            return uiReady;
        }

        /** ★★ (c) — "a USABLE lock is on screen", the test `sweepStrandedCover.lockReachable`
         *  did not make. TRUE only when this lock has been PRESENTED, has had at least
         *  BLANK_LOCK_MIN_AGE_SECONDS since its last load attempt, and still has no UI. A
         *  negative age (the clock moved backwards) reads as "not yet", the same guard
         *  `ownIntentFresh()` carries. */
        public bool isBlankLock()
        {
            if (uiReady || lockClosing || presentedAt == DateTime.MinValue)
            {
                return false;
            }
            double age = (DateTime.Now - presentedAt).TotalSeconds;
            return age >= BLANK_LOCK_MIN_AGE_SECONDS;
        }

        /** ★★ (c) — THE ESCAPE HATCH'S REPAIR. Re-generate lock.html into the same
         *  WebView. `reload()` is used rather than `loadPage()` on purpose: `loadPage`
         *  re-subscribes `Navigating`/`Navigated`, so a second call would deliver every
         *  `ixian:` verb twice, including `ixian:unlock`. `reload()` re-generates the source
         *  only, and it is a no-op once `Dispose` has nulled the WebView — which is what
         *  keeps a late watchdog from touching a dead page.
         *
         *  ⚠ A RELOAD OF A LIVE LOCK IS AN ALREADY-HANDLED CASE, not a new one: `onLoad`
         *  calls `revealPasswordForm()` when `authAttempted` is set, exactly so a re-armed
         *  boot hold is released at once (#457 audit MINOR-7).
         *
         *  Returns TRUE when a reload was issued, FALSE when the budget is spent. FALSE
         *  never means "the lock came down" — the lock stays up either way. */
        public bool repairBlankUi(string why)
        {
            if (lockClosing || uiReady)
            {
                return false;
            }
            if (sweepRepairs >= BLANK_LOCK_MAX_SWEEP_REPAIRS)
            {
                SPIXI.Meta.SLockDiag.mark("lock/blank-repair-spent",
                    "sweep reloads=" + sweepRepairs + " reason=" + why + " — the lock STAYS UP with no UI");
                Logging.error("LockPage: lock.html never loaded after " + sweepRepairs
                    + " sweep reloads. The lock stays up; the app is not unlocked.");
                return false;
            }
            sweepRepairs++;
            issueReload("sweep " + sweepRepairs + "/" + BLANK_LOCK_MAX_SWEEP_REPAIRS + " reason=" + why);
            /* ⚠ NO TIMER IS ARMED HERE, deliberately. The next window activation is the next
             * check, and a user staring at a black window supplies those — Damir made eight
             * in three minutes. It also keeps the (c) leg free of anything that can outlive
             * the page. */
            return true;
        }

        /** ★★ (b) — the watchdog's own reload, on its own budget. See the field block for
         *  why the two budgets are separate. Returns TRUE when a reload was issued. */
        private bool watchdogRepair(string why)
        {
            if (lockClosing || uiReady)
            {
                return false;
            }
            if (blankRepairs >= BLANK_LOCK_MAX_REPAIRS)
            {
                SPIXI.Meta.SLockDiag.mark("lock/blank-repair-spent",
                    "watchdog reloads=" + blankRepairs + " reason=" + why
                    + " — the lock STAYS UP with no UI, waiting for a window activation");
                Logging.error("LockPage: lock.html never loaded after " + blankRepairs
                    + " watchdog reloads. The lock stays up; the app is not unlocked.");
                return false;
            }
            blankRepairs++;
            issueReload("watchdog " + blankRepairs + "/" + BLANK_LOCK_MAX_REPAIRS + " reason=" + why);
            armBlankUiWatchdog(why);
            return true;
        }

        /** The reload itself. It says what it is doing BEFORE it does it, so a reload that
         *  kills the process still leaves the reason in the log.
         *
         *  ⚠ IT RESTARTS THE BLANK CLOCK. `isBlankLock()` measures from `presentedAt`, and
         *  a reload is a new attempt that deserves the same window a present gets. Without
         *  this line a user clicking a black window fast — Damir made eight activations in
         *  three minutes — would spend all three sweep reloads in a few seconds, each one
         *  cancelling the load the one before it started. */
        private void issueReload(string detail)
        {
            presentedAt = DateTime.Now;
            SPIXI.Meta.SLockDiag.mark("lock/blank-repair", detail + " — reloading lock.html");
            try
            {
                reload();
            }
            catch (Exception e)
            {
                Logging.error("LockPage: the blank-lock reload threw: " + e);
            }
        }

        /** ★★ (b) — one bounded wait, then one check. Re-armed only by `watchdogRepair`, so
         *  the chain is at most BLANK_LOCK_MAX_REPAIRS + 1 waits long. The generation guard
         *  makes a superseded timer inert, and `lockClosing` plus `reload()`'s own null
         *  check make a timer that outlives the page harmless. */
        private void armBlankUiWatchdog(string why)
        {
            if (lockClosing)
            {
                return;
            }
            int gen = ++repairGeneration;
            Task.Delay(BLANK_LOCK_REPAIR_DELAY_MS).ContinueWith(_ =>
            {
                MainThread.BeginInvokeOnMainThread(() =>
                {
                    try
                    {
                        if (gen != repairGeneration || lockClosing || uiReady)
                        {
                            return;
                        }
                        watchdogRepair(why);
                    }
                    catch (Exception e)
                    {
                        Logging.error("LockPage: the blank-lock watchdog threw: " + e);
                    }
                });
            });
        }

        /** ★★ (a) — the lock is REALLY on screen now. Called from both present paths:
         *  OnAppearing (the modal push) and onPresentedInPlace (#230, the in-place stage).
         *  Damir's failing lock took the in-place path. */
        private void notePresented(string where)
        {
            presentedAt = DateTime.Now;
            if (uiReady)
            {
                return;
            }
            /* ★ THE LINE THE FAILING LOG DID NOT HAVE. Absence of `lock/webview-onload` is
             * not a diagnostic — #503 taught that twice. This states the fault. */
            SPIXI.Meta.SLockDiag.mark("lock/presented-blank",
                where + " — presented with NO UI (ixian:onload has not arrived) · appLockMode=" + appLockMode);
            armBlankUiWatchdog(where);
        }

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
            /* ★★ #46 loop W-4.6 on #507: the UI arrived. Bump the generation so any armed
             * watchdog is inert — the guard also re-checks `uiReady`, so this is a belt. */
            repairGeneration++;
            if (blankRepairs > 0 || sweepRepairs > 0)
            {
                SPIXI.Meta.SLockDiag.mark("lock/blank-repaired",
                    "the UI arrived after " + blankRepairs + " watchdog and " + sweepRepairs + " sweep reload(s)");
            }
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
            notePresented("OnAppearing");   // ★★ #46 loop W-4.6 on #507
            maybeAuthenticate();
        }

        // #230: in-place presents don't fire OnAppearing — same "really visible" signal.
        public override void onPresentedInPlace()
        {
            pageVisible = true;
            SPIXI.Meta.SLockDiag.mark("lock/onPresentedInPlace");
            notePresented("onPresentedInPlace");   // ★★ #46 loop W-4.6 on #507
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
                /* ★★ #46 loop W-4.6 on #507: both legs below end this page. Stop the
                 * blank-UI watchdog first. */
                lockClosing = true;
                repairGeneration++;
                if (justConfirmAction)
                {
                    if (authSucceeded != null)
                    {
                        authSucceeded(this, new SPIXI.EventArgs<bool>(false));
                    }
                    // #230: shown-in-place lock closes via the overlay path.
                    if (!closeModalOverlay(this))
                    {
                        popOwnModal("cancel");
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
            /* ★★ #46 loop W-4.6 on #507: this lock is finished. Stop the blank-UI watchdog
             * so no armed timer can reload a page that is on its way out. */
            lockClosing = true;
            repairGeneration++;
            if (authSucceeded != null)
            {
                authSucceeded(this, new SPIXI.EventArgs<bool>(true));
            }

            if (justConfirmAction)
            {
                // #230: shown-in-place lock closes via the overlay path; else pop the
                // modal — but never pop a stack this page is not on (#229 guard).
                if (!closeModalOverlay(this))
                {
                    popOwnModal("unlock");
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

        /** ★★ #46 loop MAJOR on #507 — POP THIS PAGE, NEVER "THE TOP ONE".
         *
         *  THE DEFECT. Both legs used to read
         *  `Navigation.ModalStack.Contains(this)` and then call `Navigation.PopModalAsync()`.
         *  `Contains` proves only that this page is SOMEWHERE on the stack. `PopModalAsync`
         *  pops the TOP. Round 1's MAJOR-1 fix is what first puts two LockPages on the stack
         *  at once: the idle app lock now presents ABOVE a settings authorise lock. If that
         *  covered authorise lock can still take input, its Cancel pops the APP LOCK —
         *  dismissed with no password, and `isLockScreenActive` stays latched true, so
         *  SDesktopIdle never locks again for the rest of the session.
         *
         *  ★ THIS GUARD IS CallPage.hideSurface's, copied verbatim in intent. That method
         *  carries the same hazard and its comment explains it: "never pop a modal we don't
         *  own". Copying it makes the open platform question — whether a WebView2 under a
         *  WinUI modal can take input — IRRELEVANT. The guard is correct whatever the
         *  answer, which is why it ships without waiting for one.
         *
         *  ⚠ FAIL CLOSED. When this page is covered we pop NOTHING and log. The result is a
         *  spent authorise lock left under the app lock, which is reachable only after the
         *  app password is entered. That is strictly better than dismissing the app lock. */
        private void popOwnModal(string leg)
        {
            try
            {
                if (Navigation.ModalStack.LastOrDefault() == this)
                {
                    Navigation.PopModalAsync();
                    // ★ F-4 (#399, audit): the MODAL-FALLBACK leg needs the repaint too.
                    // It is taken whenever the lock could not be shown in place — which
                    // is ALWAYS for the SettingsPage delete flows, because the lock is
                    // staged on SettingsPage while the overlay host is HomePage. Popping
                    // a modal is not a navigation, so nothing else gives the strip back.
                    MainThread.BeginInvokeOnMainThread(() => repaintSystemBarsFor(null));
                    return;
                }
                if (Navigation.ModalStack.Contains(this))
                {
                    Logging.error("LockPage (" + leg + "): another modal is on top — refusing to pop it. "
                        + "This lock stays on the stack under the one above it.");
                }
            }
            catch (Exception e)
            {
                Logging.error("LockPage (" + leg + "): the modal pop failed: " + e);
            }
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