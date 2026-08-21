using Android;
using Android.App;
using Android.Content;
using Android.Content.PM;
using Android.OS;
using Android.Views;
using AndroidX.Core.Content;
using AndroidX.Core.View;
using IXICore.Meta;
using Microsoft.Maui;
using Microsoft.Maui.ApplicationModel;
using Plugin.Fingerprint;
using SPIXI;
using SPIXI.Interfaces;
using SPIXI.Lang;
using System;
using System.IO;
using System.Threading.Tasks;
using View = Android.Views.View;

namespace Spixi;

[Activity(Label = "Spixi",
    Icon = "@mipmap/ic_launcher",
    RoundIcon = "@mipmap/ic_round_launcher",
    Theme = "@style/MainTheme",
    MainLauncher = true,
    SupportsPictureInPicture = true,
    ResizeableActivity = true,
    LaunchMode = LaunchMode.SingleInstance,
    ConfigurationChanges = ConfigChanges.ScreenSize |
                        ConfigChanges.Orientation |
                        ConfigChanges.UiMode |
                        ConfigChanges.ScreenLayout |
                        ConfigChanges.SmallestScreenSize |
                        ConfigChanges.Density,
    WindowSoftInputMode = SoftInput.AdjustResize)]
public class MainActivity : MauiAppCompatActivity
{
    public const int PickImageId = 1000;
    public const int SaveFileId = 1001;
    public string SaveFilePath { get; set; }

    public TaskCompletionSource<SpixiImageData?> PickImageTaskCompletionSource { set; get; }
    internal static MainActivity Instance { get; private set; }
    public static Thickness? Insets = null;

    /* ★ AND-7 (#396/#401) FULL BLEED. The top system-bar inset, in CSS pixels
     * (device-independent), for the WebView shells to pad THEMSELVES with.
     *
     * Why this exists: the window already draws edge-to-edge
     * (SetDecorFitsSystemWindows(false), below) and both bars are transparent, but the
     * InsetsListener then padded the ROOT CONTENT VIEW down by the status-bar height —
     * so every page, WebView included, started BELOW the status bar and the visible
     * strip was the root background. #391 made that strip MATCH each screen; Damir's
     * ask is for it not to EXIST ("full bleed to the top", named for the wallet hero
     * and the launch gradient). So the top padding is gone and the inset travels into
     * the shells instead, where the iOS-#282 chrome already knows what to do with it.
     * Android's env(safe-area-inset-top) cannot carry it — it reports the display
     * CUTOUT only, which is why the #282 chrome reads 0 here.
     *
     * Physical px ÷ density: Android insets are physical pixels, CSS px are DIPs. (The
     * old Android-15 modal branch in SpixiContentPage divided by a hardcoded 3 for the
     * same reason — that hack goes with this change.) */
    public static double TopInsetDip = 0;

    // Publish the inset as a generatePage carrier (*SL{AndroidInsetTop}). Same grammar
    // as *SL{SpixiThemeName} and *SL{LaunchBootView}: it lands in the FIRST FRAME of
    // every document, so no shell ever paints one frame under the status bar.
    internal static void publishTopInset(double dip)
    {
        if (dip < 0 || double.IsNaN(dip) || double.IsInfinity(dip))
        {
            return;
        }
        TopInsetDip = dip;
        SpixiLocalization.addCustomString("AndroidInsetTop",
            dip.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture));
    }
    protected override void OnCreate(Bundle? bundle)
    {
        Instance = this;

        base.OnCreate(bundle);

#if DEBUG
        // #334: make the app's WebViews visible to chrome://inspect (Debug builds
        // only) — the AND-16/20 keyboard measurement + AND-18/19 inspection need
        // console access; nothing in the tree enabled this before.
        Android.Webkit.WebView.SetWebContentsDebuggingEnabled(true);
#endif

        CrossFingerprint.SetCurrentActivityResolver(() => this);

        SpixiLocalization.addCustomString("Platform", "Xamarin-Droid");

        // Opt into edge-to-edge drawing
        WindowCompat.SetDecorFitsSystemWindows(Window, false);

        Window?.SetStatusBarColor(Android.Graphics.Color.Transparent);
        Window?.SetNavigationBarColor(Android.Graphics.Color.Transparent);

        // AND-6 (#334): bar icon appearance (light/dark) now lives in
        // SPlatformUtils.setEdgeToEdge() below, theme-driven — the hardcoded
        // white icons here were unreadable over the light surface.

        var rootView = FindViewById(Android.Resource.Id.Content);

        if (rootView != null)
        {
            ViewCompat.SetOnApplyWindowInsetsListener(rootView, new InsetsListener());
            SPlatformUtils.setEdgeToEdge();
        }
        // End of edge-to-edge setup

        if (ContextCompat.CheckSelfPermission(Instance, Manifest.Permission.Camera) != Permission.Granted)
        {           
            Permissions.RequestAsync<Permissions.Camera>();
            //Permissions.RequestAsync<Permissions.Microphone>();
            //Permissions.RequestAsync<Permissions.Media>();
        }
        Permissions.RequestAsync<Permissions.StorageWrite>();

        handleNotificationIntent(Intent);
    }

    /* ★ #454 — the pause hook for the app lock. See App.lockOnPause for the whole
     * reasoning; in one line: the lock has to be the last frame the app DRAWS, because
     * the frame Android restores on the way back is on screen before any managed code
     * runs, and no resume-time cover can get in front of it.
     *
     * OnPause, not OnStop. MAUI's Application.OnSleep is raised from OnStop, by which
     * point the window is already going away — that is exactly why #442's cover was
     * added to the view tree and never painted. OnPause still has a live, drawing
     * window.
     *
     * Before base.OnPause() so the swap is queued as early as the platform allows.
     * Guarded and self-contained: with the app lock disabled it does nothing at all. */
    /* ★ #461 (Damir on device): the residual flash IS the task snapshot.
     *
     * #454 made the LIVE view tree show the lock at pause, and that helped — "faster and
     * smoother" — but the chat list still appeared for a moment on the way back. The
     * discriminator was one look at the task switcher: its thumbnail showed the CHAT
     * LIST. That thumbnail and the flash are the SAME PICTURE. Android captures the
     * window when the task goes to the background and draws that capture during the
     * app-open animation, before the app draws anything at all. No managed code runs
     * early enough to get in front of it — the same wall #442 hit from the other side.
     *
     * ⚠ The question was framed badly when it was asked: "blank the recents thumbnail"
     * was offered as a SEPARATE cosmetic item to the resume flash, and Damir reasonably
     * declined it to keep screenshots. They are ONE item. Declining the thumbnail keeps
     * the flash.
     *
     * `setRecentsScreenshotEnabled(false)` is API 33+ and stops the system taking that
     * capture at all — WITHOUT blocking screenshots, which is what FLAG_SECURE would
     * have cost. Damir's phone is Android 14. Below 33 nothing is applied: FLAG_SECURE is
     * the only lever there, and it is not a trade he chose.
     *
     * Only while the app lock is ON, and applied symmetrically so turning the lock off
     * gives the thumbnail back. Called from OnResume and on the way into OnPause, so it
     * stays in step with the preference — including when the user enables the lock in
     * Settings and backgrounds the app with no resume in between. */
    private void applyRecentsPrivacy()
    {
        if (!OperatingSystem.IsAndroidVersionAtLeast(33))
        {
            return;
        }
        try
        {
            bool locked = (Microsoft.Maui.Controls.Application.Current as App)?.isLockEnabled() == true;
            SetRecentsScreenshotEnabled(!locked);
        }
        catch (Exception e)
        {
            Logging.error("applyRecentsPrivacy failed: " + e);
        }
    }

    protected override void OnResume()
    {
        base.OnResume();
        applyRecentsPrivacy();   // #461: keep it in step with the lock preference
    }

    protected override void OnPause()
    {
        // #461: before the capture the system is about to take.
        applyRecentsPrivacy();
        try
        {
            /* ★ AUDIT MINOR-4: OnPause is not the same event as "the user left the app".
             * ResizeableActivity and SupportsPictureInPicture are both on, and in either
             * of those a pause means the user tapped the OTHER pane — Spixi is still
             * visible, so presenting a lock there would put one on screen while they
             * are looking at it, on every tap. Rotation and theme changes are already
             * safe: ConfigurationChanges above absorbs them without a pause. */
            if (Build.VERSION.SdkInt >= BuildVersionCodes.N
                && (IsInMultiWindowMode || IsInPictureInPictureMode))
            {
                base.OnPause();
                return;
            }
            (Microsoft.Maui.Controls.Application.Current as App)?.lockOnPause();
        }
        catch (Exception e)
        {
            Logging.error("OnPause: lockOnPause failed: " + e);
        }
        base.OnPause();
    }

    protected override void OnActivityResult(int requestCode, Result resultCode, Intent? intent)
    {
        base.OnActivityResult(requestCode, resultCode, intent);

        if (requestCode == PickImageId)
        {
            if ((resultCode == Result.Ok) && (intent != null))
            {
                Android.Net.Uri uri = intent.Data;

                SpixiImageData spixi_img_data = new SpixiImageData() { name = Path.GetFileName(uri.Path), path = uri.Path, stream = ContentResolver.OpenInputStream(uri) };

                // Set the Stream as the completion of the Task
                PickImageTaskCompletionSource.SetResult(spixi_img_data);
            }
            else
            {
                PickImageTaskCompletionSource.SetResult(null);
            }
        }
        else if (requestCode == SaveFileId && resultCode == Result.Ok && intent != null)
        {
            Android.Net.Uri? uri = intent.Data;
            if (uri != null)
            {
                SaveFileToUri(uri, SaveFilePath);
            }
        }
    }

    private void SaveFileToUri(Android.Net.Uri uri, string filePath)
    {
        try
        {
            using (var inputStream = File.OpenRead(filePath))
            using (var outputStream = ContentResolver.OpenOutputStream(uri))
            {
                inputStream.CopyTo(outputStream);
            }
        }
        catch (Exception ex)
        {
            Logging.error($"Error saving file: {ex.Message}");
        }
    }

    protected override void OnNewIntent(Intent? intent)
    {
        base.OnNewIntent(intent);

        /* ★ NOTIF-3 (Damir: tapping a notification is slow and shows the chat list first).
         * The old body was `await Task.Delay(500)` and then the handler — a blind, fixed
         * wait chosen for the worst case, paid on EVERY tap. It is replaced by a bounded
         * retry that fires as soon as the app can actually take the navigation, so the
         * common case (the app is warm and HomePage exists) costs one UI tick instead of
         * half a second. */
        MainThread.BeginInvokeOnMainThread(() => handleNotificationIntent(intent));
    }

    /* ★ NOTIF-3: how long to keep trying, and how often. The retry exists for the cold
     * case only — HomePage is not constructed yet because the user is still on the lock or
     * the launch flow. `App.startingScreen` remains the backstop for anything longer than
     * this window, exactly as before, so the ceiling is a giving-up point for the FAST
     * path and never a deadline for the navigation itself. */
    private const int NOTIF_NAV_RETRY_MS = 100;
    private const int NOTIF_NAV_MAX_MS = 5000;

    void handleNotificationIntent(Intent? intent)
    {
        if (intent?.Extras != null && intent.Extras.ContainsKey("fa"))
        {
            string? chatId = intent.Extras.GetString("fa");
            if (!string.IsNullOrEmpty(chatId))
            {
                /* ★ NOTIF-3 — the real finding, and it is not a routing bug.
                 *
                 * `App.startingScreen` is a POLLED GLOBAL: it was read by
                 * `HomePage.updateScreen()`, which runs on a 1 Hz timer. So a tap could
                 * sit for up to a full second after the 500 ms delay above with the chat
                 * list on screen, doing nothing, before the tick noticed. That is the
                 * "slow, and it shows the chat list first" Damir reported.
                 *
                 * The global STAYS — it is the pre-login backstop (AND-1 #329: a tap
                 * before the user has unlocked must not construct HomePage, and the
                 * post-login construction consumes it) and iOS sets it too. What changes
                 * is that the app no longer WAITS for a poll to notice: it drives the
                 * navigation the moment a HomePage exists. Setting the global first keeps
                 * the two paths idempotent — whichever gets there first clears it, and
                 * `updateScreen` re-reads "" and does nothing. */
                App.startingScreen = chatId;
                tryNavigateToChat(0);
            }
        }
    }

    private void tryNavigateToChat(int elapsedMs)
    {
        try
        {
            // Nothing left to do: the poll, a previous retry, or the post-login
            // construction already consumed it.
            if (App.startingScreen == "")
            {
                return;
            }

            /* ⚠ AUDIT MINOR: do NOT drive the navigation while a lock is on screen.
             * `updateScreen()` CONSUMES App.startingScreen before it navigates
             * (HomePage:2490), and `pushPageLoaded` fails closed while a modal overlay is up
             * — so firing here would clear the deep link and drop the chat, leaving the user
             * on the chat list after unlocking. Returning without consuming keeps the
             * address for the next tick, which is the behaviour the user expects. This is
             * cheaper than it looks: the retry below re-checks every 100 ms.
             * ⚠ Presentation-only, and it does NOT touch the lock: it reads two existing
             * predicates and decides whether to navigate. The lock is log-only this batch. */
            if (SpixiContentPage.hasModalOverlay() || SpixiContentPage.isLockStaging())
            {
                if (elapsedMs < NOTIF_NAV_MAX_MS)
                {
                    MainThread.BeginInvokeOnMainThread(async () =>
                    {
                        await Task.Delay(NOTIF_NAV_RETRY_MS);
                        tryNavigateToChat(elapsedMs + NOTIF_NAV_RETRY_MS);
                    });
                }
                return;
            }

            HomePage? home = HomePage.InstanceOrNull();
            if (home != null)
            {
                // updateScreen() consumes App.startingScreen and performs the navigation.
                // Called directly rather than waited for: same code path, no 1 Hz wait.
                home.updateScreen();
                return;
            }

            if (elapsedMs >= NOTIF_NAV_MAX_MS)
            {
                // Give up on the fast path only. App.startingScreen is still set, so the
                // page consumes it whenever it is finally built — the pre-#NOTIF-3
                // behaviour, unchanged.
                return;
            }

            MainThread.BeginInvokeOnMainThread(async () =>
            {
                await Task.Delay(NOTIF_NAV_RETRY_MS);
                tryNavigateToChat(elapsedMs + NOTIF_NAV_RETRY_MS);
            });
        }
        catch (Exception e)
        {
            // A failure here must never take down the activity: the backstop still holds.
            Logging.error("tryNavigateToChat failed: " + e);
        }
    }

    // Fix Edge to Edge
    private class InsetsListener : Java.Lang.Object, AndroidX.Core.View.IOnApplyWindowInsetsListener
    {
        public WindowInsetsCompat? OnApplyWindowInsets(View? v, WindowInsetsCompat? insets)
        {
            if (insets == null)
            {
                return null;
            }

            // Get system bars (status + navigation) and IME (keyboard) insets
            var sysInsets = insets.GetInsets(WindowInsetsCompat.Type.SystemBars());
            var imeInsets = insets.GetInsets(WindowInsetsCompat.Type.Ime());

            if (sysInsets != null && imeInsets != null)
            {
                if (v is ViewGroup vg)
                {
                    /* ★ AND-7 (#401): NO TOP PADDING. The page tree — and therefore every
                     * WebView — now reaches y=0, so the launch gradient, the wallet hero
                     * and each shell's own topbar surface paint under the status bar.
                     * The inset is published below and consumed in CSS.
                     *
                     * ⚠ The BOTTOM padding is deliberately UNCHANGED. It carries the IME
                     * inset, and the Android keyboard behaviour was measured and settled
                     * in #334/AND-16 on exactly this mechanism (adjustResize shrinks
                     * innerHeight because this padding shrinks the content view). Moving
                     * the bottom into CSS as well would either double-pad the bottom nav
                     * or re-open the keyboard round; neither is what "full bleed to the
                     * top" asked for. */
                    vg?.SetPadding(0, 0, 0, Math.Max(imeInsets.Bottom, sysInsets.Bottom));
                }

                Insets = new Thickness(sysInsets.Left, sysInsets.Top, sysInsets.Right, Math.Max(imeInsets.Bottom, sysInsets.Bottom));

                // ★ AND-7: the AUTHORITATIVE value — it replaces the bootstrap estimate
                // MainApplication registered before the MAUI app existed.
                float density = 1f;
                try { density = v?.Resources?.DisplayMetrics?.Density ?? 1f; }
                catch (Exception) { density = 1f; }
                if (density <= 0f) density = 1f;
                publishTopInset(sysInsets.Top / density);
            }

            return WindowInsetsCompat.Consumed; // We've handled insets manually
        }

        // Optional override for older Android versions
        public WindowInsets? OnApplyWindowInsets(View? v, WindowInsets? insets)
        {
            return v?.OnApplyWindowInsets(insets);
        }
    }

    // Picture in picture
    /*protected override void OnUserLeaveHint()
    {
        base.OnUserLeaveHint();

        if (Build.VERSION.SdkInt >= BuildVersionCodes.O)
        {
            //App.isInForeground = false;
            //Node.pause();
            var aspectRatio = new Android.Util.Rational(16, 9);
            var pipParams = new PictureInPictureParams.Builder()
                .SetAspectRatio(aspectRatio)
                .Build();

            EnterPictureInPictureMode(pipParams);
        }
    }*/
}
