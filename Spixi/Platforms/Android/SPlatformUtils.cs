using Android.App;
using Android.Content;
using Android.Media;
using IXICore.Meta;
using Microsoft.Maui.Storage;
using SPIXI;
using SPIXI.Interfaces;
using System;
using System.Threading.Tasks;

namespace Spixi
{
    public class SPlatformUtils
    {
        static object ringtoneLock = new object();

        static MediaPlayer? ringtone = null;
        static MediaPlayer? dialtonePlayer = null;


        public static System.IO.Stream getAsset(string path)
        {
            Task<System.IO.Stream> task = Task.Run<System.IO.Stream>(async () => await FileSystem.Current.OpenAppPackageFileAsync(path));
            return task.Result;
        }

        public static string getAssetsBaseUrl()
        {
            return "file:///android_asset/";
        }

        public static string getAssetsPath()
        {
            throw new System.NotImplementedException();
        }

        public static string getHtmlBaseUrl()
        {
            return SPIXI.Meta.Config.spixiUserFolder + "/html/";
        }

        public static string getHtmlPath()
        {
            return SPIXI.Meta.Config.spixiUserFolder + "/html";
        }

        public static void startRinging()
        {
            lock (ringtoneLock)
            {
                if (ringtone != null)
                {
                    return;
                }

                try
                {
                    bool ring = true;

                    NotificationManager nm = (NotificationManager)MainActivity.Instance.GetSystemService(Context.NotificationService)!;
                    InterruptionFilter int_filter = nm.CurrentInterruptionFilter;
                    if (int_filter != InterruptionFilter.Priority && int_filter != InterruptionFilter.All)
                    {
                        ring = false;
                    }


                    AudioManager am = (AudioManager)MainActivity.Instance.GetSystemService(Context.AudioService)!;
                    if (am.RingerMode != RingerMode.Normal)
                    {
                        ring = false;
                    }

                    MainActivity.Instance.VolumeControlStream = Android.Media.Stream.Ring;

                    if (ring)
                    {
                        ringtone = playSoundFromAssets("sounds/default_ringtone.mp3");
                        ringtone.Looping = true;
                        ringtone.Start();
                    }
                }
                catch (Exception e)
                {
                    Logging.error("Exception occurred in startRinging: " + e);
                    ringtone = null;
                }
            }
        }

        public static void stopRinging()
        {
            lock (ringtoneLock)
            {
                if (ringtone == null)
                {
                    return;
                }

                try
                {
                    if (ringtone.IsPlaying)
                    {
                        ringtone.Stop();
                    }
                    ringtone.Release();
                }
                catch (Exception e)
                {
                    Logging.error("Exception occurred while stopping the ringtone: " + e);
                }
                finally
                {
                    ringtone = null;
                    MainActivity.Instance.VolumeControlStream = Android.Media.Stream.NotificationDefault;
                }
            }
        }

        public static void startDialtone(DialtoneType type)
        {
            try
            {
                stopDialtone();
                string toneFile = string.Empty;
                bool shouldLoop = false;

                switch (type)
                {
                    case DialtoneType.busy:
                        toneFile = "sounds/busy_tone.mp3";
                        break;
                    case DialtoneType.dialing:
                        toneFile = "sounds/dialing_tone.mp3";
                        shouldLoop = true;
                        break;
                    case DialtoneType.error:
                        toneFile = "sounds/error_tone.mp3";
                        break;
                    default:
                        return;
                }

                dialtonePlayer = playSoundFromAssets(toneFile);
                dialtonePlayer.SetVolume(0.1f, 0.1f);
                dialtonePlayer.Looping = shouldLoop;
                dialtonePlayer.Start();
            }
            catch (Exception e)
            {
                Logging.error("Exception occurred in startDialtone: " + e);
                dialtonePlayer = null;
            }
        }

        public static void stopDialtone()
        {
            if (dialtonePlayer != null)
            {
                dialtonePlayer.Stop();
                dialtonePlayer.Release();
                dialtonePlayer = null;
            }
        }

        private static MediaPlayer playSoundFromAssets(string filePath)
        {
            MediaPlayer player = new MediaPlayer();
            try
            {
                var assetDescriptor = MainActivity.Instance.Assets!.OpenFd(filePath);
                player.SetDataSource(assetDescriptor.FileDescriptor, assetDescriptor.StartOffset, assetDescriptor.Length);
                assetDescriptor.Close();
                player.Prepare();
            }
            catch (Exception e)
            {
                Logging.error("Error playing sound: " + e);
            }
            return player;
        }

        /* ★ N73 (#391): `surfaceColor` names the colour the SCREEN ON TOP actually
         * paints. Null (every historical caller) keeps the old meaning — the themed
         * app surface. The launch and lock screens are fixed dark in BOTH themes, so
         * in light mode this strip used to paint light above a dark screen (the wrong
         * status-bar strip Damir reported) and the bar ICONS were drawn dark on that
         * dark screen. Both now follow the painted colour, not the app theme. */
        public static void setEdgeToEdge(string surfaceColor = null)
        {
            string colorString = string.IsNullOrEmpty(surfaceColor) ? ThemeManager.getSurfaceColorString() : surfaceColor;

            Android.Graphics.Color bgColor;
            try
            {
                bgColor = Android.Graphics.Color.ParseColor(colorString);
            }
            catch (Exception)
            {
                // an unparseable override must never cost the user their bar chrome
                bgColor = Android.Graphics.Color.ParseColor(ThemeManager.getSurfaceColorString());
            }

            // Get the root content view that MAUI uses
            var rootView = MainActivity.Instance.FindViewById(Android.Resource.Id.Content);

            if (rootView != null)
            {
                // AND-6 (#334): the visible status/nav strip = THIS root background (both
                // bars are transparent, MainActivity). It painted the LEGACY launch-blue
                // (getBackgroundColorString) under redesigned shells that sit on
                // --surface-screen — repointed to the shell-matched surface color.
                rootView.SetBackgroundColor(bgColor);
            }

            // AND-6 (#334): bar icon appearance is owned HERE so every re-run (boot ·
            // explicit pick SettingsPage:392 · OS auto-flip App.xaml.cs · ★ N73 page
            // chrome) fixes colour + icons together. Light strip -> dark icons (true);
            // dark strip -> light icons (false). Was hardcoded white in MainActivity —
            // unreadable over the light surface.
            // ★ N73: read the LUMINANCE of the colour we just painted instead of the
            // theme name. For the themed surface the answer is identical to before; for
            // a fixed-dark screen in light mode it is the opposite one, which is the
            // point. Rec. 601 weights, the same rule the platform docs use.
            var window = MainActivity.Instance.Window;
            if (window != null)
            {
                var controller = AndroidX.Core.View.WindowCompat.GetInsetsController(window, window.DecorView);
                if (controller != null)
                {
                    double luma = (0.299 * bgColor.R + 0.587 * bgColor.G + 0.114 * bgColor.B) / 255.0;
                    bool lightSurface = luma > 0.5;
                    controller.AppearanceLightStatusBars = lightSurface;
                    controller.AppearanceLightNavigationBars = lightSurface;
                }
            }
        }
    }

}
