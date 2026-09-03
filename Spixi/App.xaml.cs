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

    /* ★★ #496 (#484) — DAMIR'S CALL, 2026-08-21: THE APP-LOCK GRACE WINDOW MEASURES FROM
     * BACKGROUNDING, NOT FROM THE LAST UNLOCK. This is the security dial, so it is written
     * out in full.
     *
     * WHAT HE SAW: "sketchy, sometimes yes sometimes no". That is #454's design seen from
     * outside — the window ran from the last real authentication, so a quick app-switch
     * after a minute of ordinary use still asked for the pattern, while the same switch ten
     * seconds after unlocking did not. The user cannot see either clock, so the behaviour
     * reads as random.
     *
     * WHAT CHANGES: the question becomes "how long was the app away?", which is what every
     * mainstream messenger asks and the only version a user can predict.
     *
     * ⚠ WHAT IS GIVEN UP, stated plainly because dismissPauseLock's own comment used to
     * promise the opposite: the window can no longer be "used up". Under the old measure,
     * five seconds after authenticating you were asked on every background, forever. Under
     * this one, an app kept in constant use — never away for more than the window — is
     * never re-asked. That is the intended behaviour and not a weakening of the threat
     * model: the guard exists for a phone that LEAVES the user's hands, and an app that was
     * away for two seconds did not leave them. What it is NOT is a substitute for the lock
     * itself, which still fires on every cold start and on every background longer than the
     * window.
     *
     * ⚠ The stamp is taken at the FIRST edge of a background cycle and cleared on resume,
     * so re-entrant pause hooks cannot push it forward and make an old absence look fresh.
     * When there is no stamp at all — a cold start, or a resume with no pause before it —
     * the OLD measure is used, which is exactly today's behaviour and the conservative
     * direction. */
    private DateTime? backgroundedDate = null;

    /* ONE constant for both grace tests below. They were two separately-written `5`s, and
     * the second one had already been wrong once (#229: `ts.Seconds` is the 0-59 component,
     * so 63 seconds away read as 3 and never locked). Two dials that must agree should not
     * be two literals. */
    private const double LOCK_GRACE_SECONDS = 5;

    /* ★★ #505 — THE DESKTOP LOCK MODEL. Damir, W-4.6/W-4.7: the app locked him out
     * mid-sentence while he was typing in another window, and an unlock could leave a
     * black window with no way back in.
     *
     * He asked whether desktop needs a longer grace — "5 minutes?". THE GRACE PERIOD IS
     * THE WRONG DIAL, because the SIGNAL is wrong. On a phone "backgrounded" means the
     * phone left the user's hand. On a desktop MAUI raises OnSleep on window
     * DEACTIVATION — clicking a browser — and the window stays fully visible while it
     * happens. No length of grace makes "you clicked something else" mean "you walked
     * away", so the desktop stops locking on that edge entirely and locks on the one
     * signal that does mean it: the machine has been untouched.
     *
     * ⚠ WHY IDLE COVERS THE SYSTEM LOCK TOO, which was the other half of the ask. While
     * Windows is locked there is no input to the session, so the idle clock runs — and
     * Spixi is unreachable during that time anyway, because the Windows lock screen IS
     * the protection. The only moment a Spixi lock adds anything is after the unlock, and
     * "idle >= the threshold" is exactly that test. Sleep and hibernate are caught by the
     * wall-clock check in SDesktopIdle, because a tick counter does not advance while a
     * machine is asleep.
     *
     * ⚠ MOBILE IS UNTOUCHED (Damir: "only on desktops"). Every branch below is gated on
     * this one predicate rather than sprinkling #if WINDOWS through the lock logic.
     *
     * ⚠ `static readonly`, NOT `const`. A compile-time constant would make
     * `if (locksOnBackground && …)` a constant-false condition on Windows and
     * `if (!locksOnBackground) return;` a constant-false one everywhere else — both
     * raise CS0162 "unreachable code detected", and a warning is one project setting
     * away from being the build error that lands on Damir instead of on me. A readonly
     * field reads identically at every call site and is not folded. */
#if WINDOWS
    private static readonly bool locksOnBackground = false;
#else
    private static readonly bool locksOnBackground = true;
#endif

    /** ★ #505: is an app lock up, staging or being presented right now? Read by the
     *  desktop idle watcher, which must never stack a second one. */
    public bool isAppLockActive => isLockScreenActive;

    /** ★ #505: when presentAppLock last STARTED a present. See its docblock — the sweep
     *  must not mistake an in-flight present for a lost lock. */
    private DateTime lastLockPresentAt = DateTime.MinValue;
    private const double LOCK_PRESENT_GRACE_SECONDS = 5;

    /** ★ #496: stamp the moment the app went away — first edge of the cycle wins.
     *  ⚠ #505: NOT on desktop. Window deactivation is not a leaving edge there, and a
     *  stamp is what makes the resume path treat it as one. */
    private void markBackgrounded()
    {
        if (!locksOnBackground)
        {
            return;
        }
        if (backgroundedDate == null)
        {
            backgroundedDate = DateTime.Now;
        }
    }


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
            /* ★ Session J (#747 "nothing reached logcat" — the mechanism, found in the tree, not
             * guessed): this `false` is why. Every Logging.info/warn line — the [CDPERF] chat-open
             * stamps, the [L14] handshake lines — goes to files/Spixi/ixian.log ONLY; Console is
             * off, so no findstr, no file capture and no buffering fix could ever have shown them.
             * Under the dev-coexist build (SPIXI_DEV_COEXIST, #740's symbol) ON ANDROID the console
             * mirror is ON, and .NET Android forwards Console.WriteLine to logcat (tag `mono-stdout`).
             * ⚠ ANDROID ONLY: the symbol is defined for EVERY Debug build (#732), so without the
             * platform guard a Windows Debug build would mirror every line to a Console it may not
             * have — Windows never had the logcat problem (its log is the file + Debug output),
             * and Damir's first Windows run after this batch hung with the chats pane on
             * ERR_FILE_NOT_FOUND; the mirror is removed from that suspect list by construction.
             * The store build is byte-for-byte what it was: console off. */
#if SPIXI_DEV_COEXIST && ANDROID
            Logging.setOptions(Config.maxLogSize, Config.maxLogCount, true);
#else
            Logging.setOptions(Config.maxLogSize, Config.maxLogCount, false);
#endif
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
        /* ★ #46 loop MINOR m3 on #507: presentAppLock drops the call surface with
         * CallPage.hideSurface() before it presents. Nothing else re-asserts a live
         * call's ring or bar. A lock that fails to present therefore left the user
         * unlocked AND with no ring and no call bar. lockOnPause sets this flag on
         * both of its failure paths for the same reason (AUDIT MINOR-2). #505 adds
         * two new callers on Windows — the idle watcher and the escape hatch — so
         * this path is reachable from three places now. No live call = no-op. */
        UIHelpers.refreshAppRequests = true;
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
        // ★ #496: the TRUE leaving edge on Android. OnSleep is raised from OnStop, one step
        // later (#442) — the fact that has now cost three defects on this surface — so the
        // stamp is taken here and OnSleep only fills in for platforms with no pause hook.
        markBackgrounded();
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
        /* Not an unlock: `unlockedDate` is deliberately left alone.
         * ⚠ #496 (#484) CORRECTS WHAT THIS COMMENT USED TO PROMISE. It said the window
         * "keeps running from the real authentication and cannot be extended by
         * backgrounding the app over and over" — true while the grace was measured from
         * the unlock, and false now that Damir's call moved it to the moment the app went
         * away. Leaving `unlockedDate` alone is still right (this is not an authentication
         * and must not be recorded as one), but the anti-extension property is gone by
         * design and is written up in full on the `backgroundedDate` field.
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

    /* ★ #505 — the lock PRESENTATION, lifted out of OnResume UNCHANGED so the desktop
     * idle watcher and the resume path cannot drift. Every line below was inside the
     * OnResume branch; nothing was added, removed or reordered. The CALLER owns the
     * decision of whether a lock is due — this method only puts one on screen.
     *
     * ★ #46 loop MINOR m1 on #507: it returns TRUE when the present has started, and
     * FALSE when NO LOCK IS COMING. A caller that clears the lock latch must clear it
     * only on TRUE. On FALSE the app is still latched as locked, which is the fail-CLOSED
     * direction, and the next sweep tries again.
     *
     * ★ #46 loop MINOR m6 on #507, ROUND 2 — THE BODY IS GUARDED NOW, AND THE CATCH FAILS
     * CLOSED. Between the state mutation and the push it runs `new LockPage(true, true)`,
     * which is InitializeComponent plus a WebView load. A throw there used to leave
     * `isLockScreenActive` latched true, the call surface dropped, and no lock: the app
     * visible and usable while the code believed it was locked, with SDesktopIdle dead for
     * the session — the exact state the escape hatch exists to repair, created by the
     * repair itself.
     * ⚠ THE CATCH DOES NOT CALL onLockPresentFailed(). That method CLEARS the latch, which
     * is the fail-OPEN direction, and this docblock promises fail closed. The latch stays
     * up, the cover stays up with its own 8 s belt behind it, and FALSE tells the caller no
     * lock is coming. On Windows the next window activation sweeps and tries again. The one
     * thing the catch does re-assert is the call UI (MINOR m3), which unlocks nothing.
     * ⚠ THE GUARDED BODY KEEPS ITS ORIGINAL INDENTATION on purpose. #505's claim that this
     * block is the OnResume branch lifted out VERBATIM was verified line for line by the
     * audit. Re-indenting for the try would rewrite every one of those lines and destroy
     * the only cheap way to check that claim again.
     *
     * ★ #46 loop MINOR m5 on #507: this method no longer STARTS the diagnostic cycle.
     * It marks a phase in the cycle the CALLER started. The old order stamped every
     * line the caller wrote before this point with the cycle that ran last, and with an
     * elapsed time in hours. Each caller starts its own cycle now: "resume-lock",
     * "idle-lock" or "sweep-relock". ⚠ SLockDiag.isLockRelated() gates on the name
     * "pause", so none of these three names changes what a bar repaint reports. */
    private bool presentAppLock(string cycleName)
    {
        /* ⚠ #505 SELF-AUDIT: every ORIGINAL caller of this code guaranteed
         * `MainPage != null` in its own condition, and the body hard-casts it. The sweep
         * does not — it can reach the relock clause with no NavigationPage at all — so the
         * guarantee moves inside, BEFORE any state is touched. Setting isLockScreenActive
         * and then throwing would latch the app as locked with no lock on screen: exactly
         * the state this method is being called to repair. */
        if (MainPage is not NavigationPage)
        {
            Logging.error("presentAppLock(" + cycleName + "): no NavigationPage — nothing to present on.");
            return false;
        }
        /* ⚠ #505 SELF-AUDIT: a present is IN FLIGHT from here until pushModalLoaded's
         * marshalled callback sets activePreload, and inside that window isLockStaging()
         * is false while isLockScreenActive is true — which is precisely the shape the
         * sweep's relock clause looks for. Without this stamp a window activation landing
         * in that gap would clear the latch and stage a SECOND lock. Bounded well past
         * pushModalLoaded's own 1.2s timeout + 120ms present delay. */
        lastLockPresentAt = DateTime.Now;

        try
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
        SLockDiag.mark("present/creating-lock", cycleName);   // ★ F1: the third lock creation site
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
        }
        catch (Exception e)
        {
            /* ★ #46 loop MINOR m6 on #507 — FAIL CLOSED. See the docblock. */
            Logging.error("presentAppLock(" + cycleName + ") threw — NO LOCK IS ON SCREEN: " + e);
            SLockDiag.mark("present/failed", cycleName + " — the latch STAYS UP, the app stays covered");
            // MINOR m3: a live call lost its ring/bar to CallPage.hideSurface() above.
            // Re-asserting the call UI unlocks nothing.
            UIHelpers.refreshAppRequests = true;
            return false;
        }
        return true;
    }

    /** ★ #505 — the DESKTOP lock trigger: the machine has been untouched for the
     *  configured window (default 10 minutes, Damir), or it slept for that long.
     *  Called from SDesktopIdle on the UI thread. Safe to call repeatedly.
     *
     *  ⚠ The guards are lockOnPause's, deliberately duplicated rather than shared: that
     *  method is Android's and is on a time-critical path, and a refactor of it to serve
     *  desktop would put an untested change on the platform that works. Each one is here
     *  for the reason its comment gives in lockOnPause.
     *
     *  ⚠ ONE GUARD NOW DIVERGES, and it is a security fix. This path no longer refuses to
     *  lock over an AUTHORISE lock. lockOnPause keeps that guard, because a pause happens
     *  while the user is at the machine; an idle lock happens only after the machine was
     *  untouched for the whole window. See #46 loop MAJOR-1 on #507 inside the body. */
    public void lockOnIdle()
    {
        try
        {
            if (!isLockEnabled() || isLockScreenActive || pauseLock != null)
            {
                return;
            }
            /* ★★ #46 loop MAJOR-1 on #507 — AN AUTHORISE LOCK IS NOT AN APP LOCK.
             *
             * This method used to return for `hasModalOverlay()`, and again below for any
             * LockPage on the ModalStack. The stated reason was "do not make the user
             * authenticate twice". That reason applies to a lock the user is ACTIVELY
             * using. This method runs only after the machine was untouched for the whole
             * idle window. Nobody is using it.
             *
             * THE DEFECT. The settings delete flows create `new LockPage(true)`. That is a
             * justConfirm lock. It renders a Cancel, and the Cancel closes it with NO
             * password. On Android the resume branch is the backstop. On Windows #505
             * gates that branch on `locksOnBackground`, which is false. So the idle
             * watcher was the only trigger left, and it refused to fire. A user parks the
             * app on an authorise lock and walks away. Any other person then presses
             * Cancel and is inside the account.
             *
             * THE SHAPE. Present the app lock ON TOP of the authorise lock. It is
             * fail-closed and it cancels no page from the outside. Traced through the
             * overlay machinery: `presentPreload` shows a lock IN PLACE only while
             * `modalOverlayOp == null` AND `ModalStack.Count == 0`. A second lock
             * therefore always takes the plain-modal path, and the ModalStack sits above
             * the page tree — so it covers a modal authorise lock and an in-place one.
             * The app lock has no Cancel (#234). The lock below it stays unreachable
             * until the password is entered.
             *
             * ⚠ A STAGING LOCK STILL RETURNS. A staging lock is on no stack. Our push
             * would take pushModalLoaded's immediate plain-modal fallback, and the staging
             * lock would then present ABOVE ours — the Cancel back on top. Staging ends in
             * about 1.3 s and the next poll is 30 s away, so the delay costs nothing.
             *
             * ⚠ WHICH LOCK IS UP IS DECIDED BY THE GUARDS ABOVE, not by a field on the
             * page. Every app lock this class presents sets `isLockScreenActive`, and the
             * pause lock also sets `pauseLock`. Both are tested first and both return. The
             * cold-start lock is tested below as `nav.CurrentPage is LockPage`. A lock that
             * is still visible at this line is a settings authorise lock. */
            if (SpixiContentPage.isLockStaging())
            {
                return;
            }
            if (MainPage is not NavigationPage nav)
            {
                return;
            }
            if (nav.CurrentPage is LockPage || nav.CurrentPage is LaunchPage)
            {
                // The cold-start lock owns the stack; LaunchPage's retry view asks for the
                // SAME password, so a lock over it would unlock into another prompt.
                return;
            }
            /* ★★ #46 loop MAJOR-1 on #507: the ModalStack walk that returned here is
             * GONE. See the block above. An authorise lock on the stack no longer stops
             * the app lock — the app lock goes on top of it. */
            if (ownIntentFresh())
            {
                return;   // the app's own picker / save-as round trip
            }
            /* ★ #46 loop MINOR m5 on #507: the cycle starts HERE. presentAppLock used to
             * start it, so this mark printed under the cycle that ran last, with an
             * elapsed time in hours. The name says which path presented the lock. */
            SLockDiag.startCycle("idle-lock");
            /* `overlayLock` records the MAJOR-1 state: an authorise lock was shown in
             * place and the idle lock went over it. */
            SLockDiag.mark("idle/locking", "the desktop idle window elapsed (#505) · overlayLock="
                + SpixiContentPage.hasModalOverlay());
            presentAppLock("idle-lock");
        }
        catch (Exception e)
        {
            Logging.error("lockOnIdle failed: " + e);
        }
    }

    /** ★★ #505 — THE ESCAPE HATCH. Damir, W-4.6: after an unlock the app could be left
     *  "staring at a black app window, must restart app", intermittently.
     *
     *  ⚠ THIS DOES NOT ASSUME A CAUSE, and that is the point. The privacy shield is an
     *  opaque #13171b ContentView with InputTransparent = false — a black window that
     *  swallows input is literally what that object is — and the lock's in-place stage is
     *  a second candidate. Rather than guess between them (#294), this asks the only
     *  question that matters at the surface: is the app covered by something that has no
     *  business being there any more? Clicking the window is the first thing anyone does
     *  when staring at a black one, so the recovery lands on the reflex.
     *
     *  ⚠ It is also the DIAGNOSTIC. Every sweep that finds something logs what it found,
     *  so a recurrence names its own mechanism in one screenshot instead of another round
     *  of hypotheses. Cheap: two integer reads on window activation. */
    private void sweepStrandedCover()
    {
        try
        {
            bool covered = SpixiContentPage.hasPrivacyShield();
            bool lockUp = isLockScreenActive;
            /* ★★★ #46 loop, W-4.6 ON #507 — CAPTURE THE PAGE, NOT ONLY THE FACT.
             *
             * `lockReachable` asked "is a LockPage on screen?". In Damir's failing session
             * one WAS. It had no UI: `lock/webview-onload` never arrived, `uiReady` stayed
             * false, and `maybeAuthenticate` refused every attempt for two hours. Between
             * 22:46 and 22:49 the log holds EIGHT `resume/entered` lines — him clicking the
             * window — and ZERO sweep lines. The hatch could not see the one failure it was
             * built for, because it never asked whether the lock was USABLE.
             *
             * ⚠ TOPMOST FIRST. Round 1's MAJOR-1 fix lets an app lock present ABOVE a
             * settings authorise lock, so "the lock on screen" is now ambiguous.
             * `liveLockPage()` returns the in-place op first, which is right for a system-bar
             * repaint and wrong here: the page the user is looking at is the top modal. Ask
             * the ModalStack from the top, and fall back to `liveLockPage()` for the IN-PLACE
             * case — which is the case Damir actually hit. */
            LockPage? screenLock = SpixiContentPage.liveLockPage() as LockPage;
            if (MainPage is NavigationPage nav)
            {
                var modals = nav.Navigation.ModalStack;
                for (int i = modals.Count - 1; i >= 0; i--)
                {
                    if (modals[i] is LockPage topLock) { screenLock = topLock; break; }
                }
                if (screenLock == null && nav.CurrentPage is LockPage curLock)
                {
                    screenLock = curLock;
                }
            }
            bool lockReachable = screenLock != null
                || SpixiContentPage.hasModalOverlay()
                || SpixiContentPage.isLockStaging();

            if (covered && !lockUp)
            {
                // The app is UNLOCKED and still covered. Nothing legitimate leaves this
                // state behind; it is the W-4.6 signature.
                /* ★ #46 loop MINOR m5 on #507: start a cycle before the mark. Without one
                 * this line printed under the cycle that ran last — often the pause cycle
                 * from hours earlier — with an elapsed time in hours. The hatch's stated
                 * value is that a recurrence names its own mechanism in one screenshot. */
                SLockDiag.startCycle("sweep-uncover");
                SLockDiag.mark("sweep/uncover", "shield stranded over an unlocked app (#505 W-4.6)");
                SpixiContentPage.hidePrivacyShield();
                return;
            }
            /* ⚠ The in-flight window — see presentAppLock. A negative age (a clock moved
             * backwards) must not be read as "long ago", the same guard ownIntentFresh()
             * carries. */
            double sincePresent = (DateTime.Now - lastLockPresentAt).TotalSeconds;
            bool presentInFlight = sincePresent >= 0 && sincePresent <= LOCK_PRESENT_GRACE_SECONDS;
            if (lockUp && !lockReachable && !presentInFlight)
            {
                /* Latched as locked with no lock anywhere. Fail CLOSED but RECOVERABLE:
                 * re-present, rather than leaving an app that thinks it is locked, shows
                 * nothing, and will never lock again this session (the #229 fail-open
                 * ruling, applied to a state nobody can escape). */
                SLockDiag.startCycle("sweep-relock");   // ★ #46 loop MINOR m5 on #507
                SLockDiag.mark("sweep/relock", "latched locked with no lock on screen — re-presenting (#505)");
                if (!isLockEnabled())
                {
                    /* The lock is OFF. Nothing can re-present it, so the latch and the
                     * cover must both go. Otherwise the app stays covered and latched for
                     * the rest of the session. */
                    isLockScreenActive = false;
                    SpixiContentPage.hidePrivacyShield();
                }
                else if (!presentAppLock("sweep-relock"))
                {
                    /* ★ #46 loop MINOR m1 on #507: the latch is NOT cleared before the
                     * present any more. presentAppLock returns early, and changes no
                     * state, when MainPage is not a NavigationPage. The old order cleared
                     * the latch and dropped the shield first, so that early return left
                     * the app UNLOCKED with nothing on screen to say so — fail OPEN, and
                     * this docblock promises fail closed. A present that STARTS owns the
                     * latch and sets it itself. A present that does not start leaves the
                     * latch up, and the next window activation sweeps again. */
                    SLockDiag.mark("sweep/relock-deferred", "the present did not start — the latch stays up (#507)");
                }
                return;
            }
            /* ★★★ #46 loop, W-4.6 ON #507 — THE THIRD CLAUSE: A LOCK IS UP AND IT IS BLANK.
             *
             * Latched locked · a LockPage really on screen · presented longer than one
             * watchdog wait · still no `ixian:onload`. That is Damir's black window, and it
             * is the state the two clauses above are both blind to: the app is not unlocked
             * (so the uncover clause skips) and a lock IS reachable (so the relock clause
             * skips).
             *
             * ⚠ THE REPAIR IS THE SAME ONE THE WATCHDOG USES, and it is the only thing that
             * happens here: reload the lock's own WebView. Nothing pops, nothing clears the
             * latch, nothing calls authSucceeded. If the reload budget is spent the lock
             * STAYS UP and the log says so. A window activation is the reflex of anyone
             * staring at a black window, and Damir produced eight of them in three minutes —
             * so this is the trigger that was already there, finally able to see the fault.
             *
             * ⚠ The blank test is the PAGE's, not the hatch's: `isBlankLock()` carries the
             * bounded age so a lock caught mid-load is never called broken. */
            if (lockUp && screenLock != null && screenLock.isBlankLock())
            {
                SLockDiag.startCycle("sweep-blank-lock");
                SLockDiag.mark("sweep/blank-lock",
                    "a LockPage is on screen with NO UI — repairing under it (#507 W-4.6) · uiReady="
                    + screenLock.hasWebUi() + " covered=" + covered);
                if (!screenLock.repairBlankUi("sweep"))
                {
                    SLockDiag.mark("sweep/blank-lock-spent",
                        "the reload budget is spent — the lock STAYS UP and the app stays LOCKED (#507)");
                }
            }
        }
        catch (Exception e)
        {
            Logging.error("sweepStrandedCover failed: " + e);
        }
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
        /* ★ #496 (#484): the grace is measured from the moment the app went AWAY. Read
         * ONCE and cleared immediately, so every early return below leaves the next cycle
         * with a clean stamp — this method returns from three places.
         * ⚠ The negative guard is not decoration: a clock moved backwards would otherwise
         * make any absence look like it happened in the future and satisfy the window. The
         * same guard already protects ownIntentFresh() a few lines up. */
        DateTime? wentAway = backgroundedDate;
        backgroundedDate = null;
        TimeSpan sinceBackground = wentAway.HasValue ? (DateTime.Now - wentAway.Value) : sinceUnlock;
        bool withinGrace = sinceBackground.TotalSeconds >= 0
            && sinceBackground.TotalSeconds <= LOCK_GRACE_SECONDS;
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
                + " sinceUnlock=" + ((long)sinceUnlock.TotalSeconds) + "s"
                // ★ #496: both clocks are printed so the next F5 can SEE which one decided,
                // and "stamped=False" names the fallback rather than hiding it in a number.
                + " sinceBackground=" + ((long)sinceBackground.TotalSeconds) + "s"
                + " stamped=" + wentAway.HasValue
                + " withinGrace=" + withinGrace);
            if (!(ownIntentReturn || withinGrace) || !dismissPauseLock(held))
            {
                /* Stays up — either it is still required, or the push has not committed
                 * and dismissing it would leave a lock on screen the app has forgotten
                 * about. Return like the lock branch below does, so the page underneath
                 * is not resumed behind a lock; onUnlock is what wakes it.
                 * ★ AUDIT MAJOR-2: the biometric prompt was DEFERRED while the app was
                 * backgrounded. Now it is really in the foreground, so run it. */
                /* ★★ #500 — AUDIT MAJOR ON #496, AND IT WAS AN APP-LOCK BYPASS.
                 *
                 * The stamp is read and cleared at the top of OnResume, unconditionally.
                 * On THIS path the lock is still up and still unauthenticated — so
                 * clearing it means the NEXT resume measures from the next leaving edge
                 * and knows nothing about the absence that put the lock here. Two
                 * sequences opened the app with no password, both on Damir's own hardware:
                 *
                 *   (a) away two hours → lock stays up → press Home → tap Spixi within
                 *       5 s → sinceBackground≈2s → withinGrace → dismissPauseLock → in.
                 *   (b) worse, because it needs no deliberation: away two hours → the
                 *       pattern prompt appears → ConfirmDeviceCredential is a SEPARATE
                 *       ACTIVITY, so presenting it PAUSES MainActivity and lays a fresh
                 *       stamp → the user presses Back → resume inside 5 s → in.
                 *
                 * `dismissPauseLock` performs no authentication of its own; the grace test
                 * IS the gate. So the absence must keep accumulating until the lock is
                 * actually resolved: the stamp goes back exactly as it was found.
                 * `markBackgrounded()` is a no-op while it is non-null, so every pause
                 * during the prompt leaves the original leaving edge in place.
                 *
                 * ⚠ This is the difference between the dial Damir agreed to and a weaker
                 * one. Under the old measure both sequences read `sinceUnlock` in hours and
                 * the lock stayed up — so shipping #496 without this line would have made
                 * the lock strictly weaker than the design it replaced, which is not what
                 * was offered to him. */
                backgroundedDate = wentAway;
                SLockDiag.mark("resume/lock-stays-up", "releasing deferred auth · stamp restored (#500)");
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
        /* ★ #496 (#484): the SAME grace as the pause-lock branch above — one reading, one
         * constant, one answer. These were two independently written 5-second tests, and a
         * platform whose lock comes up here (iOS, Windows, MacCatalyst) must not disagree
         * with Android about when the app asks.
         * #229 (reviewer find) is preserved inside `withinGrace`: it uses TotalSeconds, not
         * `ts.Seconds`, which is the 0-59 COMPONENT — 63 s in the background read as 3 and
         * never locked at all. */
        /* ⚠ #505: `locksOnBackground` is the ONLY change to this condition. On desktop a
         * resume is a window ACTIVATION — the user clicking back into a window that never
         * left the screen — so it must not lock. The desktop locks from SDesktopIdle
         * instead, which calls presentAppLock() below through lockOnIdle(). */
        if (locksOnBackground && isLockEnabled() && !withinGrace && !ownIntentReturn && MainPage != null && ((NavigationPage)MainPage).CurrentPage.GetType() != typeof(LockPage) && !isLockScreenActive)
        {
            /* ★ #46 loop MINOR m5 on #507: the cycle starts at the DECISION. See
             * presentAppLock, which no longer starts one of its own. */
            SLockDiag.startCycle("resume-lock");
            presentAppLock("resume-lock");
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

        /* ★ #505 escape hatch. On desktop OnResume IS window activation, so this runs on
         * the click a user staring at a black window makes anyway.
         *
         * ⚠ LAST, NOT FIRST, and my own first cut had it at the top — where it would have
         * been WRONG on every single focus change. OnSleep raises the privacy shield on
         * deactivation, so at the top of OnResume "covered and unlocked" is the NORMAL
         * state, and the sweep would have hidden the shield the ordinary path was about to
         * hide anyway while logging a stranded-cover diagnosis that was not true. A log
         * line that lies is worse than no log line — the same finding
         * armPrivacyShieldSafety carries at MINOR-7. Placed here, AFTER the guarded
         * uncover has had its chance, "still covered" means the normal path really did
         * miss it.
         * ⚠ Windows-only. The sweep is corrective and would be safe everywhere, but W-4.6
         * is a desktop report and mobile is not in this batch (Damir: "only on desktops");
         * widening it needs its own device pass. */
#if WINDOWS
        sweepStrandedCover();
#endif
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
        /* ★★ DAMIR'S DIAL, TAKEN 2026-08-22 — NO SHIELD ON WINDOWS DEACTIVATE. #507
         * left this open. His words: a deactivated window is still fully visible, so the
         * shield blacks out a window the user is looking at. MAUI raises OnSleep on
         * window DEACTIVATION on WinUI (#507), so on Windows this line fired every time
         * the user clicked a browser. It is also the leading W-4.6 suspect: the shield is
         * an opaque, input-swallowing ContentView, which is exactly what "a black app
         * window, must restart app" looks like.
         * ⚠ MOBILE KEEPS ITS SHIELD, byte for byte. There the cover protects the recents
         * thumbnail and the app-open animation (#438), and the app really does leave the
         * screen. The guard below is compile-time and adds nothing to any other target.
         * ⚠ The lock's OWN cover is untouched: presentAppLock still calls
         * showPrivacyShield(true) on every platform, so the idle lock on Windows still
         * covers the app while it stages. */
#if !WINDOWS
        if (isLockEnabled() && !isLockScreenActive)
        {
            SpixiContentPage.showPrivacyShield();
        }
#endif
        // ★ #496: no-op on Android when lockOnPause already stamped this cycle; the real
        // stamp for every platform that has no pause hook.
        markBackgrounded();
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
            /* ★ F5-3 (#553) — the restore race. The launch/account flow stops the node
             * and owns its lifecycle until a wallet is loaded. The restore FILE PICKER
             * bounces MainActivity OnResume, and this method then restarted the node
             * with NO wallet: Node.start() latches running=true (Node.cs:169) BEFORE
             * it reads the wallet (Node.cs:230), so the KeyNotFoundException left a
             * half-started zombie. The real restore then got "Cannot start Node, it is
             * already running" and connectToNetwork never ran — "Connecting…" forever
             * (fatalexception.txt, 2026-08-24 12:28:00). The guard: no wallet loaded →
             * this method must not touch the node. IxianHandler.wallets is filled only
             * by Node.loadWallet / generateWallet, so it is the honest "a wallet is
             * loaded" signal (same predicate as CreateWindow's push guard). */
            if (IxianHandler.wallets.Count == 0)
            {
                Logging.info("EnsureNodeRunning: no wallet is loaded - the launch flow owns the node, not restarting");
                return;
            }
            /* ★ F5-3 r2 (#553, loop A-3): the wallet guard's boundary was one step
             * early — the launch flow owns the node until HomePage STARTS it, and the
             * window between Node.loadWallet() (restore/retry) and HomePage's own
             * Node.start() still admitted a double start (HomePage's start then
             * returns false → the fatal-alert branch, F-3's face). This method
             * RESUMES a node; it never boots one. Node.startCounter increments late
             * in start() (Node.cs:225 — past PresenceList.init at :210, the logged
             * zombie's throw site) and nothing resets it — "has started at least
             * once this process-life" is the ownership boundary. A throw AFTER :225
             * would count; that window is two lines and was not the observed
             * mechanism. */
            if (Node.startCounter == 0)
            {
                Logging.info("EnsureNodeRunning: the node has not started yet this run - the boot flow owns the first start");
                return;
            }
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
