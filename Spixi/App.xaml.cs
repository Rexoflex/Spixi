using IXICore;
using IXICore.Meta;
using IXICore.Network;
using IXICore.Streaming;
using Microsoft.Maui;
using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Storage;
using SPIXI;
using SPIXI.Lang;
using SPIXI.Meta;
using System;
using System.Globalization;
using System.IO;
using System.Linq;   // #454: ModalStack (IReadOnlyList<Page>).Contains
using System.Threading;
using System.Threading.Tasks;

namespace Spixi;

public partial class App : Application
{
    public static bool isInForeground { get; set; } = false;

    public static Window appWindow { get; private set; } = null;

    public static string startingScreen = ""; // Which screen to start on

    /* ★ F3 (2026-08-22): the pause lock whose biometric/pattern prompt is waiting for the
     * ANDROID ACTIVITY to actually reach RESUMED. Set by OnResume, consumed by
     * MainActivity.OnResume via releaseDeferredAuth(). Null on every other platform and
     * whenever no lock is held. */
    private LockPage? pendingForegroundAuth = null;

    /// <summary>
    /// ★ F3 — called by MainActivity once the activity is genuinely RESUMED (posted, so it
    /// runs after handleResumeActivity has finished, not from inside base.OnResume()).
    /// Idempotent and null-safe: a lock dismissed inside the 5-second window, or a resume
    /// with no lock at all, simply finds nothing to release.
    /// </summary>
    public void releaseDeferredAuth()
    {
        try
        {
            LockPage? held = pendingForegroundAuth;
            pendingForegroundAuth = null;
            if (held == null)
            {
                return;
            }
            SLockDiag.mark("resume/deferred-auth-released", "activity is resumed");
            held.onForegroundReturned();
        }
        catch (Exception e)
        {
            // A failure here must not take down the resume. The password field is always
            // available, so the worst case is the pre-fix behaviour.
            Logging.error("releaseDeferredAuth failed: " + e);
        }
    }

    private bool isLockScreenActive = false;
    private DateTime unlockedDate = DateTime.Now; // Store the last time when the app was unlocked via lockscreen


    public App()
    {        
        InitializeComponent();

        Config.init();

        if (IXICore.Platform.onWindows())
        {
            // Add prepare storage (copy/overwrite html folder with embedded one)
            copyResources();
        }

        // Check if already started
        if (Node.Instance == null)
        {
            // Prepare the personal folder
            if (!Directory.Exists(Config.spixiUserFolder))
            {
                Directory.CreateDirectory(Config.spixiUserFolder);
            }

            // Init logging
            Logging.setOptions(Config.maxLogSize, Config.maxLogCount, false);
            if (!Logging.start(Config.spixiUserFolder, Config.logVerbosity))
            {
                Environment.Exit(1);
                return;
            }
            Logging.info("Starting Spixi {0} ({1})", Config.version, CoreConfig.version);
            Logging.info("Operating System is {0}", IXICore.Platform.getOSNameAndVersion());

            // Init fatal exception handlers
            AppDomain.CurrentDomain.UnhandledException += CurrentDomainOnUnhandledException;
            TaskScheduler.UnobservedTaskException += TaskSchedulerOnUnobservedTaskException;

            // Generate or load a device ID.
            bool generate_uid = true;

            if (Preferences.Default.ContainsKey("uid"))
            {
                try
                {
                    string uid = Preferences.Default.Get("uid", string.Empty);
                    if (!string.IsNullOrEmpty(uid))
                    {
                        // Use the stored device id
                        CoreConfig.device_id = Convert.FromBase64String(uid);
                        generate_uid = false;
                    }
                }
                catch {
                    Logging.warn("Corrupted uid value in preferences.");
                }
            }

            if(generate_uid)
            {
                // Generate and save the device ID
                Preferences.Default.Set("uid", Convert.ToBase64String(CoreConfig.device_id));
            }

            if (Preferences.Default.ContainsKey("language"))
            {
                if (!SpixiLocalization.loadLanguage(Preferences.Default.Get("language", "en") as string))
                {
                    Preferences.Default.Set("language", SpixiLocalization.getCurrentLanguage());
                }
            }
            else
            {
                string lang = CultureInfo.CurrentCulture.Name.ToLower();
                if (SpixiLocalization.loadLanguage(lang))
                {
                    Preferences.Default.Set("language", SpixiLocalization.getCurrentLanguage());
                }
            }

            movePersonalFiles();

            // Load theme and appearance
            // ★ N66 (#385) — DO NOT pin UserAppTheme to a concrete value here.
            // Application.RequestedTheme returns UserAppTheme whenever it is not
            // Unspecified, and MAUI drops the RequestedThemeChanged event when
            // RequestedTheme does not change (dotnet/maui Application.cs
            // TriggerThemeChangedActual: `if (_themeChangedFiring || newTheme ==
            // _lastAppTheme) return;`). The old two lines therefore made every
            // later OS theme flip invisible to the app: the handler below (re-bake
            // of *SL{SpixiThemeName} + reloadAllPages + the parked-Account dispose)
            // was UNREACHABLE code, which is why only the OS-follow path was broken
            // while explicit Light/Dark picks themed everything correctly.
            // Unspecified = follow the platform, which is what "System" means.
            Current.UserAppTheme = AppTheme.Unspecified;
            ThemeAppearance themeAppearance = ThemeAppearance.automatic;
            if (Preferences.Default.ContainsKey("appearance"))
            {
                themeAppearance = (ThemeAppearance)Preferences.Default.Get("appearance", (int)ThemeAppearance.automatic);
            }
            ThemeManager.loadTheme("spixiui", themeAppearance);
            Current.RequestedThemeChanged += (s, a) =>
            {
                // Respond to the theme change.
                // ★ N66 (#385). Two changes, both deliberate:
                //  1. The old first line — `Current.UserAppTheme = a.RequestedTheme;`
                //     — permanently disabled THIS handler (see the boot comment
                //     above). It is gone. UserAppTheme stays Unspecified for the whole
                //     session; the appearance PICK is carried by ThemeManager
                //     (Preferences + *SL{SpixiThemeName}), not by MAUI.
                //  2. The body is gated on "System". Everything below is newly
                //     REACHABLE, and under an explicit Light/Dark pick an OS flip
                //     changes nothing the user should see — a full reloadAllPages
                //     there would be pure flicker (the #242 round-2 lesson). Explicit
                //     picks keep owning their own live re-theme in SettingsPage.
                if (ThemeManager.getActiveAppearance() != ThemeAppearance.automatic)
                    return;
                ThemeManager.changeAppearance(ThemeAppearance.automatic);

                // AND-6 (#334): re-run the edge-to-edge pass on an OS auto-theme flip —
                // it repaints the Android bar strip + bar icon appearance for the new
                // theme (the explicit-pick path SettingsPage:392 already re-runs it;
                // this path only ever reloaded pages). No-op on the other platforms
                // (every SPlatformUtils defines it; iOS/Windows/MacCatalyst are empty).
                /* ★ AND-7c (#408): repaint from the PAGE THAT IS VISIBLE, not from the raw
                 * theme. setEdgeToEdge() with no argument always answers with the themed
                 * screen surface — which is the wrong colour whenever the visible surface
                 * is not the themed one: the wallet hero, the launch flow, the lock. Since
                 * full bleed those are exactly the screens whose glyphs must stay light. */
                SpixiContentPage.repaintSystemBarsFor(null);

                /* ★ N71 (#421): PUSH the theme, do not reload. This line used to be
                 * UIHelpers.reloadAllPages(), and once #385/N66 made this handler
                 * reachable that reload became N78 — an evening OS auto-switch built a
                 * fresh document, home.html's Fix #8 sent ixian:tab:tab1 on the new
                 * boot, and the user was thrown from wherever they were back to Chats
                 * with every empty-state gate re-armed. It also discarded unsaved
                 * input (#385 MINOR-3).
                 *
                 * The explicit Light/Dark pick has always PUSHED setTheme and has
                 * always been correct; this path simply does the same thing now. A
                 * push creates no document, so there is no Fix #8 and nothing to
                 * re-arm — which is why one change closes both halves of the report,
                 * and why Fix #8 itself must stay exactly as it is (it is correct for
                 * the reload it was written for, #8). */
                UIHelpers.pushThemeToAllPages();
            };

            // Start Ixian code
            _ = new Node();

            // Attempt to load a pre-existing wallet
            bool wallet_found = Node.checkForExistingWallet();

            if (!wallet_found)
            {
                // Wallet not found, go to initial launch page
                MainPage = new NavigationPage(new LaunchPage());
            }
            else
            {
                // Wallet found, see if it can be decrypted
                bool wallet_decrypted = IxianHandler.getWalletList().Count > 0 ? IxianHandler.getWalletStorage().isLoaded() : false;
                if (!wallet_decrypted)
                {
                    wallet_decrypted = Node.loadWallet();
                }

                if (wallet_decrypted == false)
                {
                    // ★ N75 (#391): the retry screen is a VIEW of LaunchPage now, not its
                    // own page — same cold-start root, one WebView. The boot view rides a
                    // generatePage carrier, so retry paints on the first frame.
                    MainPage = new NavigationPage(new LaunchPage("retry"));
                }
                else
                {
                    // Wallet found
                    if (isLockEnabled())
                    {
                        // Show the lock screen
                        // ★ F1 (audit MAJOR): name the cycle here too. F1 is reported on
                        // LAUNCH as well as on every background, and only the pause path
                        // declared one — so the launch leg had no timing at all.
                        SLockDiag.startCycle("cold-start");
                        isLockScreenActive = true;
                        var lockPage = new LockPage();
                        lockPage.authSucceeded += onUnlock;
                        MainPage = new NavigationPage(lockPage);
                    }
                    else
                    {
                        // Show the home screen
                        MainPage = new NavigationPage(HomePage.Instance());
                    }

                }
            }
            NavigationPage.SetHasNavigationBar(MainPage, false);
        }
        else if (IxianHandler.status == NodeStatus.stopped
                || IxianHandler.status == NodeStatus.stopping)
        {
            // Already started before
            Logging.info("App: Node exists but is stopped");
            while (IxianHandler.status == NodeStatus.stopping)
            {
                Thread.Sleep(50);
            }
            if (IxianHandler.status == NodeStatus.stopped)
            {
                Logging.info("App: Restarting Node");
                Node.preStart();
                if (!Node.start())
                {
                    // ★ D-9② sibling (audit 2026-08-15): the SAME failure as the HomePage
                    // start path, on the resume branch — and it threw with no log line and
                    // no alert, straight out of the App lifecycle. That is Damir's black
                    // screen, reached a different way. Log before it goes up, so the
                    // failure is at least explicable from ixian.log.
                    Logging.error("App: Node.start() returned false on resume — the node did not restart.");
                    throw new Exception("Error starting Node");
                }
                Node.connectToNetwork();
            }
        }
    }

    // Check if the lock is enabled
    public bool isLockEnabled()
    {
        bool locked = false;
        if (Preferences.Default.ContainsKey("lockenabled"))
        {
            locked = (bool)Preferences.Default.Get("lockenabled", false);
        }
        return locked;
    }


    private void movePersonalFiles()
    {
        string path = System.Environment.GetFolderPath(Environment.SpecialFolder.Personal);
        if (File.Exists(Path.Combine(path, "spixi.wal")) && !File.Exists(Path.Combine(Config.spixiUserFolder, Config.walletFile)))
        {
            File.Move(Path.Combine(path, "spixi.wal"), Path.Combine(Config.spixiUserFolder, Config.walletFile));
        }
    }

    public void onUnlock(object sender, EventArgs e)
    {
        isLockScreenActive = false;
        unlockedDate = DateTime.Now;
        /* ★ #438 break-my-verdict MAJOR-2: AUTH IS THE DEFINITIVE RELEASE. Background
         * while the lock is on screen and OnSleep raised a shield that nothing else
         * would ever take down: the resume skips the lock branch (a lock is already up)
         * and skips the guarded uncover, so the unlock removed the lock stage and
         * revealed an opaque, input-swallowing cover for up to 8 seconds. */
        SpixiContentPage.hidePrivacyShield();
        /* ★ #454: AUTH also retires the PAUSE lock. The handle is what stops the next
         * pause from presenting a second one, so a stale one would disable the whole
         * feature for the rest of the session. LockPage.performUnlock pops the modal
         * itself (justConfirm leg) — only the handle is ours to clear. */
        // ★ F3 (audit MINOR): the deferred-auth handoff dies with the lock. Now that the
        // release genuinely POSTS, a lock dismissed inside that window would otherwise get
        // onForegroundReturned() on a popped page — and LockPage.pageVisible is only ever set
        // to true, so all four gates would pass and a pattern prompt would appear over the
        // UNLOCKED app with no lock behind it.
        pauseLock = null;
        pendingForegroundAuth = null;
        // Q4-③ review (MAJOR-1): the call surface is suppressed while locked. Re-assert
        // the current VoIP state on the next UI tick — a call that survived the lock
        // (still ringing, or still connected) gets its ring/bar back; no call = no-op.
        // If the lock page has not finished popping yet, ensureSurface re-arms the flag
        // and the following tick retries.
        UIHelpers.refreshAppRequests = true;
    }

    // #229 fail-closed (reviewer MINOR-5): a LOCK that failed to PRESENT must clear
    // the active-lock latch, else every later resume would skip locking until restart.
    public void onLockPresentFailed()
    {
        isLockScreenActive = false;
    }

    // #334 AND-21: the app's OWN outbound intents (file/image picker, save-as)
    // background the app — returning from them tripped the resume lock ("unlock
    // before selecting a file", Damir's Android walk). A picker round-trip is a
    // continuous in-app flow: the NEXT resume within a bounded window skips the
    // lock. One-shot (consumed on EVERY resume, matched or not — a stranded
    // stamp can never suppress a later real background) + time-bounded 5 min
    // (loop MINOR-4 tightened from 10: a phone left sitting in the picker is
    // grabbable lock-free for the window; privacy posture #232). Launch sites
    // clear the stamp when the intent THROWS (the stranded-stamp path). Known
    // benign residual: an OS permission dialog between stamp and picker can
    // consume the stamp early → that round-trip locks like before.
    static DateTime ownIntentStamp = DateTime.MinValue;
    public static void noteOwnIntentRoundTrip()
    {
        ownIntentStamp = DateTime.Now;
    }
    public static void clearOwnIntentStamp()
    {
        ownIntentStamp = DateTime.MinValue;
    }
    private static bool consumeOwnIntentSuppression()
    {
        TimeSpan age = DateTime.Now - ownIntentStamp;
        ownIntentStamp = DateTime.MinValue;
        return age.TotalSeconds >= 0 && age.TotalMinutes < 5;
    }

    /* ★ #454 — PRESENT THE LOCK ON THE WAY OUT, NOT ON THE WAY BACK.
     *
     * #438/#442 covered the resume with a synchronous opaque shield and it did not
     * work, for a reason no amount of tuning on the resume path can reach: the cover
     * is added while Android is already backgrounding the app, so it lands in the view
     * tree and is NEVER DRAWN. The last real frame stays — and that frame is what the
     * OS restores on the way back, before a single line of managed code runs. Damir saw
     * the content on every resume shape: chats, a conversation, wallet, account, a
     * sheet, a call.
     *
     * The only mechanism that removes it is to make the last drawn frame BE the lock.
     * So the lock is presented at PAUSE, while the app is still on screen and can still
     * draw. On the way back there is nothing to flash: the lock is already the page.
     * This is what Signal and WhatsApp do.
     *
     * ⚠ THIS IS NOT THE #423 REVERT. #423 forbids trading the lock's own boot flicker
     * back in by plain-pushing on the RESUME path, where the user watches the WebView
     * come up. Here nobody is watching — the app is leaving — and by the time they
     * return lock.html has long finished loading. The #229 load-then-present is the
     * wrong shape at pause for the opposite reason: it stages the lock INVISIBLE for up
     * to 1.2 s, and a resume inside that window would show the old content again, which
     * is the exact defect being fixed. Animation is off for the same reason.
     *
     * COOLDOWN (Damir's call): the 5-second no-auth window is kept EXACTLY as it was.
     * Today it is measured from the last successful UNLOCK — not from the background —
     * so any background longer than that already asks for the password. The only change
     * is WHEN the lock is drawn, never WHETHER it is required. A resume inside the
     * window pops it without asking, same friction as before.
     *
     * The RECENTS THUMBNAIL is deliberately NOT addressed (Damir's call): blanking it
     * needs FLAG_SECURE, which also stops the user taking screenshots of their own app.
     * The task switcher keeps showing the last real frame. */
    /* Instance, deliberately — it is written and read in lockstep with the instance
     * field isLockScreenActive, and a static beside an instance is how two halves of
     * one state machine drift apart (audit NIT-3). */
    private LockPage? pauseLock = null;

    /* AND-21 peek. consumeOwnIntentSuppression() CONSUMES, and OnResume owns the
     * consume — spending the stamp here would let the picker round-trip lock after
     * all, one resume later. */
    private static bool ownIntentFresh()
    {
        TimeSpan age = DateTime.Now - ownIntentStamp;
        return age.TotalSeconds >= 0 && age.TotalMinutes < 5;
    }

    /** Called from the platform pause hook. Safe to call when nothing should happen. */
    public void lockOnPause()
    {
        try
        {
            if (!isLockEnabled())
            {
                return;                      // C3.1: lock off — nothing happens, ever
            }
            if (isLockScreenActive || pauseLock != null)
            {
                return;                      // a lock is up, staging, or already ours
            }
            /* ★ AUDIT MAJOR-1: the ModalStack and the NavigationStack are BLIND to two of
             * the three lock kinds, and this codebase already knows it —
             * CallPage.lockUp() tests these two FIRST for exactly this reason.
             *   · isLockStaging(): all three SettingsPage authorise locks come up through
             *     pushModalLoaded, which holds the page on NO stack for up to ~1.3 s. A
             *     pause inside that window used to stack a second lock, push the settings
             *     lock onto the modal fallback ABOVE it, and let a delete-wallet complete
             *     with a now-unopenable lock underneath — the wallet file is gone, so its
             *     password can never verify again.
             *   · hasModalOverlay(): an IN-PLACE lock (#230) never touches the ModalStack
             *     at all. */
            if (SpixiContentPage.hasModalOverlay() || SpixiContentPage.isLockStaging())
            {
                return;
            }
            if (MainPage is not NavigationPage nav)
            {
                return;
            }
            if (nav.CurrentPage is LockPage || nav.CurrentPage is LaunchPage)
            {
                /* The cold-start lock owns the stack. LaunchPage (audit MINOR-6) is the
                 * retry screen, which asks for the SAME password — a lock over it would
                 * unlock into another password prompt. */
                return;
            }
            foreach (Page m in nav.Navigation.ModalStack)
            {
                if (m is LockPage)
                {
                    /* An AUTHORISE lock is up — turning the app lock off, deleting the
                     * wallet or the account. Stacking a second lock over it would leave
                     * the user authenticating twice into a flow they already started. */
                    return;
                }
            }
            if (ownIntentFresh())
            {
                // The picker/save-as round trip. Not a real background.
                return;
            }

            /* ★ F1/F2/F3 INSTRUMENTATION (log only, no behaviour change). The cycle clock
             * starts here so every later phase is stamped in milliseconds SINCE THE PAUSE
             * — which is what turns "there is a white flash" into "the flash is the 180 ms
             * between the push and the WebView's first paint". */
            SLockDiag.startCycle("pause");
            SLockDiag.mark("pause/creating-lock");

            isLockScreenActive = true;
            OfflinePushMessages.resetCooldown();
            /* #272: the lock outranks the call surface, and it must not be possible for
             * a ring to sit above it. onUnlock / the grace dismissal both re-arm
             * refreshAppRequests, so a call that survives gets its ring or bar back. */
            CallPage.hideSurface();

            // #234: appLock:true — no Cancel, no hatch. Confirm mode's Cancel fired
            // authSucceeded(false), which onUnlock treats as an unlock: one tap into the
            // app with no password, on every background once #454 landed.
            LockPage lockPage = new LockPage(true, true);
            /* ★ #460: hold the biometric prompt. We are inside OnPause, and the lock's
             * OnAppearing fires from the push below — firing Plugin.Fingerprint there
             * gets it cancelled by the pausing activity and latches the attempt, which
             * takes fingerprint unlock away for this lock entirely. OnResume releases it.
             * ⚠ An explicit latch, NOT App.isInForeground: that flag is cleared in
             * OnSleep, which is raised from Android's OnStop — one step AFTER this. */
            lockPage.deferAuthentication();
            lockPage.authSucceeded += onUnlock;
            pauseLock = lockPage;
            /* ★ F2 INSTRUMENTATION (log only): the verdict's hypothesis, RECORDED rather
             * than acted on. `repaintSystemBarsFor` is called on LockPage's own F-4 paths
             * and in dismissPauseLock, but NOT here — so a pause-presented lock may keep
             * whatever the previous screen (or the splash) last asked the system bars for,
             * which would explain the splash-blue status bar. If the next log shows this
             * `bars/skip` line with no `bars/repaint` before the lock is on screen, the
             * hypothesis is confirmed and the fix is one call. */
            SLockDiag.barsNotRepainted("lockOnPause: no repaintSystemBarsFor on this path");
            SLockDiag.mark("pause/push-requested");
            nav.Navigation.PushModalAsync(lockPage, false).ContinueWith(t =>
            {
                if (!t.IsFaulted && !t.IsCanceled)
                {
                    return;
                }
                /* Fail OPEN, the #229 ruling: a lock that never presented must not leave
                 * the app latched as locked, or every later resume skips locking until
                 * restart.
                 * ★ AUDIT MINOR-1: marshalled, and CANCELLED counts. Without the marshal
                 * these two latches were written from a thread-pool thread and read from
                 * the UI thread with no barrier; without the IsCanceled arm a cancelled
                 * push left pauseLock non-null forever, which made every later resume
                 * return early with NO lock on screen — the app lock silently dead for
                 * the rest of the session. */
                MainThread.BeginInvokeOnMainThread(() =>
                {
                    Logging.error("lockOnPause: the lock did not present: " + t.Exception);
                    // ★ F3 (audit MINOR): the deferred-auth handoff dies with the lock. Now that the
                    // release genuinely POSTS, a lock dismissed inside that window would otherwise get
                    // onForegroundReturned() on a popped page — and LockPage.pageVisible is only ever set
                    // to true, so all four gates would pass and a pattern prompt would appear over the
                    // UNLOCKED app with no lock behind it.
                    pauseLock = null;
                    pendingForegroundAuth = null;
                    isLockScreenActive = false;
                    // AUDIT MINOR-2: hideSurface() already ran. Nothing else re-asserts a
                    // live call's ring or bar on this path.
                    UIHelpers.refreshAppRequests = true;
                });
            });
        }
        catch (Exception e)
        {
            Logging.error("lockOnPause failed: " + e);
            // ★ F3 (audit MINOR): the deferred-auth handoff dies with the lock. Now that the
            // release genuinely POSTS, a lock dismissed inside that window would otherwise get
            // onForegroundReturned() on a popped page — and LockPage.pageVisible is only ever set
            // to true, so all four gates would pass and a pattern prompt would appear over the
            // UNLOCKED app with no lock behind it.
            pauseLock = null;
            pendingForegroundAuth = null;
            isLockScreenActive = false;
            UIHelpers.refreshAppRequests = true;   // AUDIT MINOR-2, the other failure path
        }
    }

    /** Take the pause lock down WITHOUT auth — the cooldown / own-intent grace. */
    private bool dismissPauseLock(LockPage lp)
    {
        /* Not an unlock: `unlockedDate` is deliberately left alone, so the 5-second
         * window keeps running from the real authentication and cannot be extended by
         * backgrounding the app over and over.
         * ★ AUDIT MINOR-3: the latches are cleared only once the page is confirmed to be
         * on the stack we are about to pop it from. Clearing first meant that a push
         * which had not committed yet left a lock on screen that the app believed was
         * not there — and nothing repainted the Android strip back. */
        try
        {
            if (MainPage is NavigationPage nav && nav.Navigation.ModalStack.Contains(lp))
            {
                // ★ F3 (audit MINOR): the deferred-auth handoff dies with the lock. Now that the
                // release genuinely POSTS, a lock dismissed inside that window would otherwise get
                // onForegroundReturned() on a popped page — and LockPage.pageVisible is only ever set
                // to true, so all four gates would pass and a pattern prompt would appear over the
                // UNLOCKED app with no lock behind it.
                pauseLock = null;
                pendingForegroundAuth = null;
                isLockScreenActive = false;
                MainThread.BeginInvokeOnMainThread(async () =>
                {
                    try
                    {
                        await nav.Navigation.PopModalAsync(false);
                        // The lock paints the Android strip its own fixed dark with light
                        // icons; popping a modal is not a navigation, so nothing else
                        // gives the strip back (LockPage's F-4 sites, same reason).
                        SpixiContentPage.repaintSystemBarsFor(null);
                    }
                    catch (Exception e)
                    {
                        Logging.error("dismissPauseLock: pop failed: " + e);
                    }
                });
            }
            else
            {
                /* The push has not committed. Leave the latches ALONE and let the lock
                 * present — it is the safe direction: the user authenticates once more
                 * than strictly needed, instead of the app believing it is unlocked
                 * while a lock it has forgotten about sits on screen. */
                Logging.warn("dismissPauseLock: the lock is not on the modal stack yet — leaving it up.");
                return false;
            }
        }
        catch (Exception e)
        {
            Logging.error("dismissPauseLock failed: " + e);
            return false;
        }
        UIHelpers.refreshAppRequests = true;
        return true;
    }

    protected override void OnResume()
    {
        base.OnResume();
        isInForeground = true;
        Node.resume();

        NetworkClientManager.wakeReconnectLoop();
        StreamClientManager.wakeReconnectLoop();
        PresenceList.forceSendKeepAlive = true;

        // #334 AND-21: consumed unconditionally — see the field docblock.
        bool ownIntentReturn = consumeOwnIntentSuppression();

        /* ★ #454: the lock is already on screen — it went up at pause. This resume only
         * decides whether it is still REQUIRED. The test is the one that was here
         * before, unchanged: within 5 s of the last real unlock, or a return from the
         * app's own picker, it comes down without asking. */
        // AUDIT NIT-2: ONE reading of the clock, shared with the older branch below —
        // evaluated twice against a moving clock, the 5 s boundary can satisfy both.
        TimeSpan sinceUnlock = DateTime.Now - unlockedDate;
        /* ★ F3 (audit MINOR): log the resume UNCONDITIONALLY. Instrumented only inside the
         * branch, silence was ambiguous between "OnResume never ran" and "no pause lock was
         * held" — and that exact ambiguity, a lifecycle callback not firing where it was
         * assumed to, is what made BOTH previous F3 fixes wrong. */
        SLockDiag.mark("resume/entered", "pauseLock=" + (pauseLock != null ? "held" : "null"));
        if (pauseLock != null)
        {
            LockPage held = pauseLock;
            /* ★ F3 INSTRUMENTATION (log only): the resume decision, printed with the two
             * inputs that drive it. The verdict asks explicitly whether OnResume reaches
             * `held.onForegroundReturned()` at all — this line and the one inside that
             * method answer it together. */
            SLockDiag.mark("resume/pauseLock-held",
                "ownIntentReturn=" + ownIntentReturn
                + " sinceUnlock=" + ((long)sinceUnlock.TotalSeconds) + "s");
            if (!(ownIntentReturn || sinceUnlock.TotalSeconds <= 5) || !dismissPauseLock(held))
            {
                /* Stays up — either it is still required, or the push has not committed
                 * and dismissing it would leave a lock on screen the app has forgotten
                 * about. Return like the lock branch below does, so the page underneath
                 * is not resumed behind a lock; onUnlock is what wakes it.
                 * ★ AUDIT MAJOR-2: the biometric prompt was DEFERRED while the app was
                 * backgrounded. Now it is really in the foreground, so run it. */
                SLockDiag.mark("resume/lock-stays-up", "releasing deferred auth");
#if ANDROID
                /* ★ F3 — THE FIX, and it is a TIMING fix, not a gating one. The 2026-08-21
                 * device log settled three rounds of guessing: all four gates read correctly
                 * and `maybeAuthenticate` reported `→ PROMPT`, so #460's latch works and this
                 * path is reached. What it never produced was `lock/auth-returned`.
                 *
                 * The log shows why, one line later:
                 *     15:37:51.3700  auth/maybeAuthenticate … → PROMPT
                 *     15:37:51.4064  Android OnResume - ensuring Node is running
                 * MAUI raises Application.OnResume from INSIDE `base.OnResume()`, so we were
                 * firing the prompt 36 ms before MainActivity's own OnResume body ran — i.e.
                 * from the middle of the activity's onResume, before it reaches RESUMED.
                 *
                 * ★ Why that kills a PATTERN but would not kill a fingerprint: a fingerprint
                 * prompt is a DialogFragment and tolerates it, while the device-credential
                 * fallback (AllowAlternativeAuthentication) launches ConfirmDeviceCredential
                 * — a separate ACTIVITY. Android does not start an activity on behalf of one
                 * that has not reached RESUMED, so the launch is dropped and the await never
                 * completes. Damir uses a pattern; a fingerprint would have masked this in
                 * every previous round. Cold start works because it prompts at +461 ms, long
                 * after everything settled.
                 *
                 * So the release is HANDED TO MainActivity, which posts it once the activity
                 * is genuinely resumed. Deliberately an explicit, named edge rather than a
                 * delay — #442, #460 and this row are all the same lesson: a lifecycle flag
                 * or callback that turns over at a different edge from the one you are
                 * reasoning about is worse than none. The latch itself is untouched. */
                pendingForegroundAuth = held;
#else
                // Every other platform keeps the original edge. None of them presents the
                // lock at pause, and none has been on a device for eight batches — changing
                // their timing here would be a guess with no way to test it.
                held.onForegroundReturned();
#endif
                return;
            }
        }

        // Popup the lockscreen if necessary
        // Allow a 5 second cooldown after unlock
        TimeSpan ts = sinceUnlock;   // AUDIT NIT-2: the same reading the block above used
        // #229 (reviewer find): ts.Seconds is the SECONDS COMPONENT (0–59) — 63s in the
        // background gave Seconds==3 → no lock. TotalSeconds is the real elapsed time.
        if (isLockEnabled() && ts.TotalSeconds > 5 && !ownIntentReturn && MainPage != null && ((NavigationPage)MainPage).CurrentPage.GetType() != typeof(LockPage) && !isLockScreenActive)
        {
            /* ★ #438 — COVER FIRST, SYNCHRONOUSLY, BEFORE ANYTHING ELSE.
             * #229 stages the lock's WebView hidden on the CURRENT page and presents it
             * only once lock.html signals ready, so without this line the user's chat
             * list stays on screen for that whole window — Damir measured about a
             * second on Android, unauthenticated. The shield is dropped the moment the
             * lock is actually visible (SpixiContentPage.presentPreload /
             * presentPlainModal), and has an 8s safety release so a failed present can
             * never strand the app behind it. */
            SpixiContentPage.showPrivacyShield(true);   // true = a lock IS expected to present
            // Show the lock screen
            isLockScreenActive = true;
            OfflinePushMessages.resetCooldown();
            // ★ Q4-③ review (MAJOR-1/2): the lock ALWAYS wins over the call surface.
            // A RING presented via CallPage's modal fallback (a legacy page was on top)
            // sits on the ModalStack — the lock would then be pushed ABOVE it, and the
            // call's own teardown (PopModalAsync pops the TOP modal) would have popped
            // the LOCK on the next remote hang-up / 45s timeout, un-authing the app.
            // Drop the surface first: nothing can ever be modal-above a lock. The call
            // keeps running + ringing; ensureSurface re-arms refreshAppRequests, so the
            // ring/bar re-presents on the first UI tick after the unlock.
            CallPage.hideSurface();
            SLockDiag.startCycle("resume-lock");   // ★ F1: the third lock creation site
            var lockPage = new LockPage(true, true);   // #234: the app lock offers no way past it
            lockPage.authSucceeded += onUnlock;
            // #229: load-then-present — stage the lock's WebView hidden on the current
            // page and push the modal only once lock.html signals ready (no boot
            // flicker). Fallbacks inside pushModalLoaded guarantee the lock ALWAYS
            // presents (worst case = today's plain modal push).
            if (((NavigationPage)MainPage).CurrentPage is SpixiContentPage cur)
            {
                cur.pushModalLoaded(lockPage);
            }
            else
            {
                MainPage.Navigation.PushModalAsync(lockPage, Config.defaultXamarinAnimations);
            }
            return;
        }

        /* #438: this resume does NOT lock (cooldown, own-intent round trip, lock off) —
         * drop any shield OnSleep put down. Placed after the branch above so a resume
         * that DOES lock never uncovers for a frame.
         * ★ Audit MINOR-9: `isLockScreenActive` is already true while a lock is STAGING
         * (the #229 window) and while one is up, and the branch above skips those. Both
         * fall through to here, where an unguarded uncover would expose exactly the
         * content the shield was raised over. */
        if (!isLockScreenActive)
        {
            SpixiContentPage.hidePrivacyShield();
        }

        if (MainPage != null && ((NavigationPage)MainPage).CurrentPage != null && ((NavigationPage)MainPage).CurrentPage is SpixiContentPage)
        {
            SpixiContentPage p = (SpixiContentPage)((NavigationPage)MainPage).CurrentPage;
            try
            {
                p.onResume();
            }
            catch (Exception e)
            {
                Logging.error("Exception in OnResume: {0}", e);
            }
        }
        OfflinePushMessages.resetCooldown();
    }

    protected override void OnSleep()
    {
        base.OnSleep();
        /* ★ #438, the OTHER half. Android captures a snapshot of the visible window for
         * the task switcher when the app goes to the background, and that snapshot is
         * what it draws during the app-open animation — BEFORE OnResume runs. No
         * resume-time cover can reach it. Putting the shield down on the way OUT means
         * the recents thumbnail and the open animation both show the lock's ground
         * instead of the conversation the user was reading.
         * ⚠ Only while the lock is enabled: with no lock there is nothing to protect.
         * 🟡 DAMIR'S DIAL (audit MINOR-8): with the lock ON this covers EVERY background,
         * including an app switch shorter than the 5 s cooldown that will not lock on the
         * way back — so those switches show the lock's ground in recents and for the open
         * animation. That is the price of a protected thumbnail, and the alternative
         * (only shielding after the cooldown) cannot work: OnSleep does not know how long
         * the user will be away. Flip the guard to `false` here to trade it back. */
        /* ★ break-my-verdict MAJOR-2: not while a lock is ALREADY up — the lock IS the
         * cover, and shielding over it is how a shield gets stranded (nothing on the
         * resume path would take it down) or, on the modal lock path, painted straight
         * over the password field. */
        if (isLockEnabled() && !isLockScreenActive)
        {
            SpixiContentPage.showPrivacyShield();
        }
        isInForeground = false;
        IxianHandler.localStorage?.flush();
        Node.pause();
    }

    protected override void OnStart()
    {
        base.OnStart();
        isInForeground = true;
        Node.resume();
    }

    protected override Window CreateWindow(IActivationState? activationState)
    {
        var window = base.CreateWindow(activationState);
        if (window != null)
        {
            window.Title = "Spixi IM";
            if (appWindow == null)
            {
                window.Resumed += (s, e) =>
                {
                    if (Config.enablePushNotifications && IxianHandler.wallets.Count > 0)
                        OfflinePushMessages.resetCooldown();
                };

                appWindow = window;
            }
        }
        return window;
    }

    public static async Task Shutdown()
    {
        try
        {
            IxianHandler.shutdown();
        }
        catch (Exception ex)
        {
            Logging.error("Exception during Shutdown: {0}", ex);
        }
    }

    private static void TaskSchedulerOnUnobservedTaskException(object sender, UnobservedTaskExceptionEventArgs unobservedTaskExceptionEventArgs)
    {
        try
        {
            Logging.error(unobservedTaskExceptionEventArgs.Exception.ToString());
            Logging.flush();
        }
        catch
        {

        }
    }

    private static void CurrentDomainOnUnhandledException(object sender, UnhandledExceptionEventArgs unhandledExceptionEventArgs)
    {
        try
        {
            var e = unhandledExceptionEventArgs.ExceptionObject as Exception;
            Logging.error(e.ToString());
            Logging.flush();
        }
        catch
        {

        }
    }

    public static void EnsureNodeRunning()
    {
        try
        {
            if (IxianHandler.status == NodeStatus.stopped
                || IxianHandler.status == NodeStatus.stopping)
            {
                Logging.info("EnsureNodeRunning: Node exists but is stopped");
                while (IxianHandler.status == NodeStatus.stopping)
                {
                    Thread.Sleep(50);
                }
                if (IxianHandler.status == NodeStatus.stopped)
                {
                    Logging.info("EnsureNodeRunning: Restarting Node");
                    Node.preStart();
                    if (!Node.start())
                    {
                        // ★ D-9② sibling (audit 2026-08-15): the SAME failure as the HomePage
                    // start path, on the resume branch — and it threw with no log line and
                    // no alert, straight out of the App lifecycle. That is Damir's black
                    // screen, reached a different way. Log before it goes up, so the
                    // failure is at least explicable from ixian.log.
                    Logging.error("App: Node.start() returned false on resume — the node did not restart.");
                    throw new Exception("Error starting Node");
                    }
                    Node.connectToNetwork();
                }
            }
            else
            {
                Logging.info("EnsureNodeRunning: Node is already running");
            }
        }
        catch (Exception ex)
        {
            Logging.error("EnsureNodeRunning exception: {0}", ex);
        }
    }


    public void copyResources()
    {
        string sourceDirectory = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "html");
        string targetDirectory = Path.Combine(Config.spixiUserFolder, "html");

        copyContents(sourceDirectory, targetDirectory);
    }

    private void copyContents(string sourceDirectory, string targetDirectory)
    {
        Directory.CreateDirectory(targetDirectory);

        foreach (string file in Directory.GetFiles(sourceDirectory))
        {
            string destFile = Path.Combine(targetDirectory, Path.GetFileName(file));
            File.Copy(file, destFile, true); // overwrite existing files
        }

        foreach (string subdir in Directory.GetDirectories(sourceDirectory))
        {
            string destSubdir = Path.Combine(targetDirectory, Path.GetFileName(subdir));
            copyContents(subdir, destSubdir);
        }
    }
}
