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
using System.Threading;
using System.Threading.Tasks;

namespace Spixi;

public partial class App : Application
{
    public static bool isInForeground { get; set; } = false;

    public static Window appWindow { get; private set; } = null;

    public static string startingScreen = ""; // Which screen to start on

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

                UIHelpers.reloadAllPages();
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

        // Popup the lockscreen if necessary
        // Allow a 5 second cooldown after unlock
        TimeSpan ts = DateTime.Now - unlockedDate;
        // #229 (reviewer find): ts.Seconds is the SECONDS COMPONENT (0–59) — 63s in the
        // background gave Seconds==3 → no lock. TotalSeconds is the real elapsed time.
        if (isLockEnabled() && ts.TotalSeconds > 5 && !ownIntentReturn && MainPage != null && ((NavigationPage)MainPage).CurrentPage.GetType() != typeof(LockPage) && !isLockScreenActive)
        {
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
            var lockPage = new LockPage(true);
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
