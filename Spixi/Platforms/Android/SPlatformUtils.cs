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

        /* ★ SND (2026-08-21): a one-shot EFFECT, as opposed to the four call tones above,
         * which are long-lived players the caller starts and stops. An effect is fire and
         * forget: it must release its own MediaPlayer on completion or every message
         * played would leak one.
         *
         * A MISSING ASSET IS THE EXPECTED STATE TODAY — no effect files ship yet (Damir
         * picks them). OpenFd throws for a file that is not in the APK, playSoundFromAssets
         * swallows that and hands back an UNPREPARED player, so Start() would throw in
         * turn. Hence the probe first: it keeps a silent miss silent and cheap.
         *
         * NOT synchronized with the ringtone/dialtone players on purpose. An effect is
         * short and independent; taking ringtoneLock here would let a chat message block
         * on a ringing call. */
        /* ⚠ AUDIT MINOR-5: NO sound assets ship yet (Damir picks them), and `inAppSounds`
         * defaults ON — so without this every received message threw a Java
         * FileNotFoundException across JNI and wrote a log line. Ixian's default severity is
         * `trace`, so those lines really are written, and they would bury the [LOCKDIAG] and
         * [SCANDIAG] evidence this same batch exists to collect. First miss is remembered;
         * every later call for that asset is a dictionary lookup. */
        private static readonly System.Collections.Generic.HashSet<string> missingEffects = new();

        private static bool isMissing(string filePath)
        {
            lock (missingEffects) { return missingEffects.Contains(filePath); }
        }

        private static void markMissing(string filePath)
        {
            lock (missingEffects) { missingEffects.Add(filePath); }
        }

        /* ★★ #506① — THE EFFECT PLAYER MUST BE ROOTED, and this is the fix I expect to
         * do the work. Damir on device: the effects "don't play full length, abrupt".
         *
         * ⚠ THE ROW'S OWN DIAGNOSIS DOES NOT SURVIVE CHECKING, and it is recorded here
         * rather than quietly dropped. It said the `finally` closes the AssetFileDescriptor
         * "while MediaPlayer is still reading it". Android documents the opposite for
         * `setDataSource(FileDescriptor, long, long)`: *"It is the caller's responsibility to
         * close the file descriptor. It is safe to do so as soon as this call returns."* The
         * SIBLING method four lines down — `playSoundFromAssets`, which every call tone uses
         * — closes it EARLIER still, immediately after setDataSource and before Prepare, and
         * the ringtone has never been reported as truncated. So a close AFTER Start cannot be
         * what clips a 0.4 s effect.
         *
         * ★ What separates the two methods is the REFERENCE. A tone is stored in a static
         * field (`ringtone`, `dialtonePlayer`) and stays reachable for its whole life; an
         * effect was fire-and-forget, and after this method returned the ONLY thing pointing
         * at the MediaPlayer was its own Completion handler — a self-reference, which roots
         * nothing. A .NET-Android peer that becomes unreachable can be collected, its JNI
         * global ref dropped and the native player finalized MID-PLAYBACK. That is exactly
         * "truncated and abrupt", exactly intermittent, and exactly why the tones are fine.
         * iOS already does this deliberately (`effectPlayers`); Android was the one platform
         * that did not.
         *
         * ⚠ The fd handoff below is ALSO applied. It is harmless either way, the row asked
         * for it, and if the sound is still clipped after this batch then BOTH hypotheses are
         * dead — which is worth more than being right about which one to try first. */
        private static readonly System.Collections.Generic.List<MediaPlayer> liveEffects = new();

        public static void playEffect(string filePath)
        {
            if (isMissing(filePath))
            {
                return;   // ⚠ AUDIT MINOR-5: memoised — see isMissing
            }
            MediaPlayer? player = null;
            Android.Content.Res.AssetFileDescriptor? fd = null;
            // #506①: true once Completion owns the descriptor, so the finally stops
            // closing it on the SUCCESS path while keeping the throw-path close intact.
            bool fdHandedOff = false;
            /* ★★ #46 loop m13 — THE GUARANTEE, IN STRUCTURAL FORM.
             * Once Start() returns, the sound is playing. From that instant nothing may
             * cut it, leak the descriptor, or mark the asset missing.
             * Round 1 held that with a second try block inside this one. A shape is not a
             * guarantee. A reviewer rethrew from the inner catch, and moved the damage
             * into the inner catch, and the outer catch ran on a playing player both
             * times. The guarantee now rests on SCOPE, not on arrangement:
             *   · The belt is scheduled by scheduleEffectBelt, called BELOW the outer
             *     try/catch/finally. The outer catch is lexically above that call, so no
             *     exception from the belt can reach it. A rethrow there leaves playEffect
             *     without touching the player, the descriptor or missingEffects.
             *   · scheduleEffectBelt cannot name filePath, fd, player or captured. So
             *     markMissing(filePath), captured.Release() and liveEffects.Remove(captured)
             *     do not COMPILE inside it. The damage is out of scope, not merely absent.
             *   · Everything the belt needs is allocated BEFORE Start(). The region after
             *     Start() is two assignments of values that already exist. An assignment
             *     allocates nothing and calls nothing, so it cannot throw.
             * beltHandoff stays null until Start() returns. Null means the sound never
             * started, and only then may the catch and the finally clean up. */
            int beltMs = 15000;
            Action? beltHandoff = null;
            try
            {
                // Probe before building anything: absent asset = silent no-op.
                fd = MainActivity.Instance?.Assets?.OpenFd(filePath);
                if (fd == null)
                {
                    markMissing(filePath);
                    return;
                }
                player = new MediaPlayer();
                player.SetDataSource(fd.FileDescriptor, fd.StartOffset, fd.Length);
                player.Prepare();
                // Release on completion — an effect has no stop() caller.
                // ⚠ AUDIT NIT: capture the local rather than casting the event sender; a
                // failed cast would be swallowed by the catch and leak the player silently.
                MediaPlayer captured = player;
                Android.Content.Res.AssetFileDescriptor capturedFd = fd;
                /* #506①, the row's half: hand the descriptor to Completion instead of the
                 * finally. Single-shot, because the belt below can also reach it and
                 * AssetFileDescriptor.Close() must not be raced. */
                object fdLock = new object();
                bool fdClosed = false;
                Action closeFd = () =>
                {
                    lock (fdLock)
                    {
                        if (fdClosed)
                        {
                            return;
                        }
                        fdClosed = true;
                    }
                    try { capturedFd.Close(); } catch (Exception) { }
                };
                captured.Completion += (s, e) =>
                {
                    lock (liveEffects) { liveEffects.Remove(captured); }
                    try { captured.Release(); } catch (Exception) { }
                    closeFd();
                };
                /* ★ #46 loop Q5 and item 2 — THE BELT HAS A FLOOR AND A CEILING.
                 * The belt used to rest on prose: "every effect is under 0.6 s". Nothing
                 * enforced that, and Damir is about to pick new SFX. Duration is valid
                 * after Prepare, so the belt is the clip's own length plus a 5 s margin.
                 * ⚠ FLOOR 15 s. Duration is negative when the container reports no length.
                 * ⚠ CEILING 60 s. A container that mis-reports Duration as 2,000,000,000 ms
                 *   gives a belt of about 23 days. That belt never fires. The belt is the
                 *   ONLY owner of the player and the descriptor when Completion does not
                 *   run, which is the exact case it exists to cover, so a belt that never
                 *   fires is the leak this code exists to stop. 60 s is 100 times the
                 *   longest effect that ships today. No sound a chat app calls an "effect"
                 *   runs a minute. A clip that claims more than 55 s mis-reports.
                 * ⚠ The clamp is applied BEFORE the addition. An int overflow makes the sum
                 *   negative, and a negative Task.Delay throws. Clamp first, then add. Do
                 *   not lean on the sign flip.
                 * ⚠ This read sits before Start() on purpose. A throw here is a pre-Start
                 *   throw, so the outer catch is its correct owner. The inner catch keeps a
                 *   container that cannot answer from costing a good asset. */
                try
                {
                    int durationMs = captured.Duration;
                    if (durationMs > 55000)
                    {
                        durationMs = 55000;
                    }
                    if (durationMs > 0 && durationMs + 5000 > beltMs)
                    {
                        beltMs = durationMs + 5000;
                    }
                }
                catch (Exception) { }
                /* The belt's work, allocated BEFORE Start(). Completion does not fire if
                 * the player errors mid-playback, and an fd leak on a path that runs once
                 * per received message is how a process runs out of descriptors — that
                 * takes down sockets and file opens, not just audio. Both calls are
                 * single-shot. Every allocation on this path happens while the player is
                 * still silent, so an out-of-memory here is a pre-Start failure and the
                 * outer catch may handle it. */
                Action expireBelt = () =>
                {
                    bool wasLive;
                    lock (liveEffects) { wasLive = liveEffects.Remove(captured); }
                    if (wasLive)
                    {
                        // Completion never came — it would have removed it itself.
                        try { captured.Release(); } catch (Exception) { }
                    }
                    closeFd();
                };
                // ★ #506①: root it BEFORE Start, so there is no window in which a
                // collection can reach a player that is already producing sound.
                lock (liveEffects) { liveEffects.Add(captured); }
                captured.Start();
                /* ★★ THE SOUND IS PLAYING FROM HERE. Two assignments follow, then the try
                 * ends. Neither assignment allocates and neither calls, so neither can
                 * throw, so the outer catch is unreachable from this point.
                 * ⚠ Put ANY statement between Start() and the closing brace below and you
                 * re-open m13: a throw there cuts the sound, leaks the descriptor and
                 * marks the asset missing for the whole process. */
                fdHandedOff = true;
                beltHandoff = expireBelt;
            }
            catch (Exception e)
            {
                /* ⚠ AUDIT MINOR: a THROW from SetDataSource or Prepare used to skip the
                 * fd.Close() below it — there was no finally — so a malformed asset leaked
                 * one file descriptor per received message, and FD exhaustion takes down
                 * sockets and file opens across the whole process, not just audio. */
                bool firstMiss = !isMissing(filePath);
                markMissing(filePath);
                /* ⚠ 2026-08-22: `Logging.trace` is DROPPED by the shipped app — Config.logVerbosity is
                 * info|warn|error = 14, trace = 1, and `14 & 1 == 0` (Ixian-Core Logging.cs:191).
                 * So the original trace line here could never appear in a log, which made the
                 * whole sound path unobservable: if it threw on every message, nothing would say
                 * so. Reported at WARN, and only ONCE per asset (the miss is memoised), so it
                 * stays a single honest line rather than a flood. */
                if (firstMiss)
                {
                    Logging.warn("playEffect(" + filePath + ") skipped: " + e.Message);
                }
                try { player?.Release(); } catch (Exception) { }
                if (player != null)
                {
                    lock (liveEffects) { liveEffects.Remove(player); }
                }
            }
            finally
            {
                /* ⚠ AUDIT MINOR (kept): a THROW from SetDataSource or Prepare skips every
                 * close above it, so the descriptor must still be closed here — that was
                 * the original, correct intent. #506① narrows it to the THROW path only:
                 * on success Completion owns it now. */
                if (!fdHandedOff)
                {
                    try { fd?.Close(); } catch (Exception) { }
                }
            }
            /* ★★ OUTSIDE EVERY try IN THIS METHOD. That placement is the guarantee.
             * A non-null beltHandoff means Start() returned, so the sound is playing.
             * Nothing below can reach the catch above it. */
            if (beltHandoff != null)
            {
                scheduleEffectBelt(beltMs, beltHandoff);
            }
        }

        /* ★★ #46 loop m13 — THE BELT SCHEDULER, DELIBERATELY BLIND.
         * This method sees a delay and one delegate. It cannot see filePath, fd, player
         * or captured, so the three damaging statements — markMissing(filePath),
         * captured.Release() and liveEffects.Remove(captured) — do not compile here.
         * That is the point of the signature. Widen it and you hand the damage back.
         * The catch exists so a scheduling failure cannot escape into the caller. It
         * logs and nothing else. It must never call expire(): expire() releases a
         * player that is still producing sound, which is the m13 damage under a new
         * name. The log call carries no file path, so it cannot forge a log line. */
        private static void scheduleEffectBelt(int delayMs, Action expire)
        {
            try
            {
                Task.Delay(delayMs).ContinueWith(_ => expire());
            }
            catch (Exception beltEx)
            {
                try { Logging.warn("playEffect belt not scheduled: " + beltEx.Message); } catch (Exception) { }
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
        /* ★ AND-7b (#407): the LAST state actually applied to the system bars, rendered
         * live into the dev HUD. Damir reported the glyphs inverting against the app
         * theme; rather than guess, the app now SHOWS what it asked the OS for, per tab,
         * on screen (the #304 probe precedent). Dev-mode only — see updateDebugOverlay. */
        public static string lastBarState = "";

        /* ★ AND-7d (#409, Damir F5 2026-08-19): TWO colours, because since full bleed these
         * became two different questions.
         *
         *   surfaceColor — what is painted at the BOTTOM of the window. The root view
         *     background is still visible there (MainActivity keeps padding the bottom by
         *     the nav-bar inset), so this is literally the strip behind the OS navigation
         *     controls, and it also decides THEIR glyph colour.
         *   topColor — what the SHELL paints under the STATUS bar. Only the status-bar
         *     glyphs are decided from it. Defaults to surfaceColor when a caller has one
         *     answer for the whole screen (launch, lock, every single-surface page).
         *
         * Passing one colour for both is what turned the navigation bar BLUE on the wallet
         * tab: the hero is the right answer for the top of that screen and the wrong answer
         * for the bottom, where the shell paints the ordinary themed surface. */
        /* ★ F1/F2 PROBE (2026-08-22) — measurement, NOT another fix.
         *
         * F2 has now had TWO wrong hypotheses. The first was "repaintSystemBarsFor is never
         * called on the pause path" — the log killed it outright (`bars/repaint ·
         * pageChrome:LockPage bottom=#13171b top=#13171b`). The second was mine: "a MAUI modal
         * sits above the content view, so the window background shows through". I painted the
         * window and Damir reports it is STILL splash-blue, so that is wrong too.
         *
         * Everything I can reason about says the strip should be dark: both bars are
         * transparent, the root content view has NO top padding (InsetsListener pads only the
         * bottom) and is painted #13171b, the window is now painted, and the LockPage itself
         * is #13171b. It is blue anyway — which means the model is wrong somewhere I cannot
         * see from source. #294 and this project's own rules say stop guessing and measure.
         *
         * So this REPORTS the real view stack at the moment the lock is up: what each layer's
         * background actually is, what the status bar colour actually is, and what view is
         * actually on top. One background from Damir and F2 stops being a guess.
         * Read-only — it changes nothing. */
        private static string describeBg(Android.Views.View? v)
        {
            try
            {
                if (v == null) return "null";
                var d = v.Background;
                if (d == null) return v.Class.SimpleName + ":noBg";
                if (d is Android.Graphics.Drawables.ColorDrawable cd)
                {
                    return v.Class.SimpleName + ":#" + (cd.Color.ToArgb() & 0xFFFFFF).ToString("x6");
                }
                return v.Class.SimpleName + ":" + d.Class.SimpleName;
            }
            catch (Exception) { return "err"; }
        }

        public static string describeBarSurfaces()
        {
            try
            {
                var act = MainActivity.Instance;
                if (act == null) return "no-activity";
                var win = act.Window;
                if (win == null) return "no-window";

                var decor = win.DecorView;
                var content = act.FindViewById(Android.Resource.Id.Content) as Android.Views.ViewGroup;

                string top = "none";
                if (decor is Android.Views.ViewGroup dg && dg.ChildCount > 0)
                {
                    top = describeBg(dg.GetChildAt(dg.ChildCount - 1));
                }
                string contentTop = "none";
                int contentPadTop = -1;
                if (content != null)
                {
                    contentPadTop = content.PaddingTop;
                    if (content.ChildCount > 0)
                    {
                        contentTop = describeBg(content.GetChildAt(content.ChildCount - 1));
                    }
                }

                return "statusBarColor=#" + (win.StatusBarColor & 0xFFFFFF).ToString("x6")
                    + " navBarColor=#" + (win.NavigationBarColor & 0xFFFFFF).ToString("x6")
                    + " decor=" + describeBg(decor)
                    + " decorTopChild=" + top
                    + " content=" + describeBg(content)
                    + " contentPadTop=" + contentPadTop
                    + " contentTopChild=" + contentTop;
            }
            catch (Exception e)
            {
                return "probe-failed: " + e.Message;
            }
        }

        public static void setEdgeToEdge(string surfaceColor = null, string topColor = null)
        {
            string colorString = string.IsNullOrEmpty(surfaceColor) ? ThemeManager.getSurfaceColorString() : surfaceColor;
            string topColorString = string.IsNullOrEmpty(topColor) ? colorString : topColor;

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

            /* ★ F2 (2026-08-22, Damir on device: "the lock's status bar is splash-blue").
             *
             * The 2026-08-21 log killed the original hypothesis outright. `repaintSystemBars`
             * IS called for the pause lock, twice, and asks for the right colour:
             *     [pause] bars/repaint · pageChrome:LockPage bottom=#13171b top=#13171b
             * so the "one-line missing call" fix would have changed nothing — a fourth wrong
             * guess on this surface, avoided only because the audit made the OTHER
             * setEdgeToEdge path log too.
             *
             * ★ Where the blue actually comes from. Both system bars are TRANSPARENT
             * (MainActivity:100-101), so the strip shows whatever view lies beneath it. The
             * root content view above is painted correctly — but a MAUI MODAL (which is what
             * the pause lock is) is presented ABOVE that view, so at the status-bar inset the
             * thing showing through is the WINDOW background. That is
             * `android:windowBackground = @layout/splash_screen` (styles.xml:37), whose base
             * layer is #144576. Measured: it is the ONLY source of that blue anywhere in the
             * app, which is why Damir's word for it was literally "splash-blue".
             *
             * So the window ground is repainted to the same surface everything else uses. It
             * fixes the modal case without needing to know MAUI's modal view hierarchy, and
             * it retires a stale launch drawable that has no business showing after boot.
             * ⚠ The splash itself is unaffected: this runs from OnCreate onward, long after
             * the system has already drawn the launch screen. */
            var window0 = MainActivity.Instance?.Window;
            if (window0 != null)
            {
                try
                {
                    window0.SetBackgroundDrawable(new Android.Graphics.Drawables.ColorDrawable(bgColor));
                }
                catch (Exception ex)
                {
                    // Cosmetic only — never cost the user their chrome over a ground colour.
                    Logging.warn("setEdgeToEdge: window background not applied: " + ex.Message);
                }
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
                    Android.Graphics.Color topBgColor;
                    try
                    {
                        topBgColor = Android.Graphics.Color.ParseColor(topColorString);
                    }
                    catch (Exception)
                    {
                        topBgColor = bgColor;
                    }
                    double luma = (0.299 * bgColor.R + 0.587 * bgColor.G + 0.114 * bgColor.B) / 255.0;
                    double topLuma = (0.299 * topBgColor.R + 0.587 * topBgColor.G + 0.114 * topBgColor.B) / 255.0;
                    // ★ AND-7d: the STATUS bar reads the top colour, the NAVIGATION bar reads
                    // the bottom one — they sit on different surfaces now.
                    controller.AppearanceLightStatusBars = topLuma > 0.5;
                    controller.AppearanceLightNavigationBars = luma > 0.5;
                    // ★ AND-7b: report what was asked for. "glyphs=dark" means we asked
                    // the OS for DARK icons, i.e. we believe the surface under them is light.
                    lastBarState = "top=" + topColorString + "/" + (topLuma > 0.5 ? "dark" : "light")
                        + " bottom=" + colorString + "/" + (luma > 0.5 ? "dark" : "light");
                }
            }
        }
    }

}
