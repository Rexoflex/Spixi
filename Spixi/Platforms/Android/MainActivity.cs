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

        MainThread.BeginInvokeOnMainThread(async () =>
        {
            await Task.Delay(500);
            handleNotificationIntent(intent);
        });
    }

    void handleNotificationIntent(Intent? intent)
    {
        if (intent?.Extras != null && intent.Extras.ContainsKey("fa"))
        {
            string? chatId = intent.Extras.GetString("fa");
            if (!string.IsNullOrEmpty(chatId))
            {
                App.startingScreen = chatId;
                // AND-1 (#329): a push-tap intent pre-login must NOT construct HomePage
                // (App.startingScreen stays set; the post-login construction consumes it).
                HomePage.InstanceOrNull()?.updateScreen();
            }
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
