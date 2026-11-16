/* ★ P-1 (#1127) — TEMPORARY, retire with the [P1] set (grep -rn "\[P1\]\|P1Perf\|SpixiP1").
 *
 * The felt-speed stamps for DoD P-1. Every line is `[P1] ` + tokens matching
 * ^[a-z0-9_.=-]{1,40}$, at most 16 tokens: fixed words and integers only, never a name, an
 * address or message text (the handover-gate log rule). A line that fails the rule is DROPPED
 * whole, never logged in part. The shells use the same rule (src/components/p1.js).
 *
 * DEV-ONLY: the bodies compile only under SPIXI_DEV_COEXIST. A store build keeps the same
 * signatures as empty no-ops, so every call site compiles on every TFM and does nothing.
 */
using System;

namespace SPIXI
{
    /** ★ coldstart1 (#1680): the cold-start marks, in start order. Declared on every target (the call sites compile
     *  everywhere); index = ColdStartRules.Names. Only an Android dev build writes a line. */
    internal enum ColdMark
    {
        AppIn, BaseIn, MauiIn, MauiBuild, CtorIn, ConfigIn, Logger, FlagsIn, LangIn, FilesIn, ThemeIn, NodeIn,
        WalletIn, WalletOut, HomeIn, HomeOut, CtorOut, BaseOut, AppOut, ActIn, ActBase, ActHold, ActOut, ResumeIn,
        ResumeOut, WvIn, WvNew, WvOut, NavIn, NavOut, Page, PageEnd, Draw
    }

    internal static class P1Perf
    {
#if SPIXI_DEV_COEXIST
        private const int MaxTokens = 16;
        private const int MaxTokenLength = 40;
        private const int MaxKindLength = 30;   // `close-` + 30 = 36 and `page=` + 30 = 35, inside the 40-char token
        private const long FrameWindowMs = 600;
        private const double DroppedGapMs = 24;
        private const string Prefix = "[P1] ";
        private static int droppedWarned = 0;
#if ANDROID
        private static int coldDrawn = 0;   // ★ coldstart1 (#1680): 1 once coldDraw ran (one-shot per process)
#endif
#endif

        /** True in a dev build (the [P1] set is live), false in a store build. */
#if SPIXI_DEV_COEXIST
        internal static bool enabled { get { return true; } }
#else
        internal static bool enabled { get { return false; } }
#endif

        /** Log `[P1] ` + body when body passes the grammar; drop it whole otherwise. */
        internal static void line(string body)
        {
#if SPIXI_DEV_COEXIST
            try
            {
                if (!isValidBody(body))
                {
                    warnDropped();
                    return;
                }
                IXICore.Meta.Logging.info(Prefix + body);
            }
            catch (Exception)
            {
            }
#endif
        }

        /** The Windows console hook's gate: the WHOLE text starts with `[P1] ` and the rest passes the grammar. */
        internal static bool isValidLine(string full)
        {
#if SPIXI_DEV_COEXIST
            return full != null
                && full.StartsWith(Prefix, StringComparison.Ordinal)
                && isValidBody(full.Substring(Prefix.Length));
#else
            return false;
#endif
        }

        /** The Windows console hook's accept rule: null unless `s` starts with `[P1] shell ` (the shells emit nothing
         *  else); else `safe(s)` (Utils.logSafe in the app) and that OUTPUT must pass the grammar — a redacted token fails it. */
        internal static string? acceptShellConsole(string? s, Func<string, string> safe)
        {
#if SPIXI_DEV_COEXIST
            if (s == null || !s.StartsWith(Prefix + "shell ", StringComparison.Ordinal))
            {
                return null;
            }
            string t = safe(s);
            return isValidLine(t) ? t : null;
#else
            return null;
#endif
        }

        internal static long now()
        {
#if SPIXI_DEV_COEXIST
            return System.Diagnostics.Stopwatch.GetTimestamp();
#else
            return 0;
#endif
        }

        internal static long msSince(long t0)
        {
#if SPIXI_DEV_COEXIST
            return (long)((System.Diagnostics.Stopwatch.GetTimestamp() - t0) * 1000.0 / System.Diagnostics.Stopwatch.Frequency);
#else
            return 0;
#endif
        }

        /** The page's class name, lowercased — a fixed framework/app word, never user data. `page` if it is not [a-z0-9]{1,30}. */
        internal static string kind(object? page)
        {
#if SPIXI_DEV_COEXIST
            try
            {
                if (page == null)
                {
                    return "page";
                }
                string name = page.GetType().Name.ToLowerInvariant();
                if (name.Length < 1 || name.Length > MaxKindLength)
                {
                    return "page";
                }
                foreach (char c in name)
                {
                    if (!((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')))
                    {
                        return "page";
                    }
                }
                return name;
            }
            catch (Exception)
            {
                return "page";
            }
#else
            return "page";
#endif
        }

        /** Count frames for 600 ms from now: `[P1] frames <what> n= drop= max=` (Android Choreographer,
         *  Windows CompositionTarget.Rendering; Apple: nothing). `what` must itself be a valid token. */
        internal static void framesAfter(string what)
        {
#if SPIXI_DEV_COEXIST
            try
            {
                if (!isValidToken(what))
                {
                    warnDropped();   // the line could never pass — drop it now, with the one warn
                    return;
                }
                if (Microsoft.Maui.ApplicationModel.MainThread.IsMainThread)
                {
                    startFrames(what);
                }
                else
                {
                    Microsoft.Maui.ApplicationModel.MainThread.BeginInvokeOnMainThread(() =>
                    {
                        try { startFrames(what); } catch (Exception) { }
                    });
                }
            }
            catch (Exception)
            {
            }
#endif
        }

        /** ★ coldstart1 (#1680): one cold-start mark, `[P1] cold <token> t=<ms>` (ms since the process start). One-shot per
         *  mark; before coldFlush it only stores a Stopwatch stamp (the logger is not up yet). Android dev builds only.
         *  [Conditional]: a build without SPIXI_DEV_COEXIST has no call at any site and evaluates no argument. Holds no
         *  value of the caller: only "this point was reached". Every call site is on the main thread; a cross-thread mark
         *  during the flush may be lost or written twice, never with a wrong value. `t=` is valid only in a COLD launch
         *  (Stopwatch stops while the phone sleeps: ColdStartRules.msAt). */
        [System.Diagnostics.Conditional("SPIXI_DEV_COEXIST")]
        internal static void cold(ColdMark m)
        {
#if SPIXI_DEV_COEXIST && ANDROID
            try
            {
                string? body = ColdStartRules.mark((int)m, System.Diagnostics.Stopwatch.GetTimestamp(), System.Diagnostics.Stopwatch.Frequency);
                if (body != null)
                {
                    line(body);
                }
            }
            catch (Exception)
            {
            }
#endif
        }

        /** ★ coldstart1 (#1680): called ONCE, in App() right after the logger start. Reads the Android clocks (the managed
         *  stamp at once after the Java clock), writes every stored mark in enum order, and LAST the anchor line
         *  `[P1] cold logger t=<ms> req=<ms>`, its stamp read right before its line() call (so its own log stamp is the
         *  phone clock at `t`); from then on a mark is written at once. Android dev builds only; [Conditional] as `cold`. */
        [System.Diagnostics.Conditional("SPIXI_DEV_COEXIST")]
        internal static void coldFlush()
        {
#if SPIXI_DEV_COEXIST && ANDROID
            try
            {
                if (!OperatingSystem.IsAndroidVersionAtLeast(24))
                {
                    return;   // Process.StartElapsedRealtime is API 24; below it no cold line is written
                }
                long start = global::Android.OS.Process.StartElapsedRealtime;
                long now = global::Android.OS.SystemClock.ElapsedRealtime();
                long ts = System.Diagnostics.Stopwatch.GetTimestamp();
                long since = now - start;
                long req = -1;
                if (OperatingSystem.IsAndroidVersionAtLeast(33))
                {
                    req = start - global::Android.OS.Process.StartRequestedElapsedRealtime;
                }
                long freq = System.Diagnostics.Stopwatch.Frequency;
                foreach (string body in ColdStartRules.flush(ts, since, freq))
                {
                    line(body);
                }
                string? a = ColdStartRules.anchor(System.Diagnostics.Stopwatch.GetTimestamp(), freq, req);
                if (a != null)
                {
                    line(a);
                }
            }
            catch (Exception)
            {
            }
#endif
        }

#if ANDROID
        /** ★ coldstart1 (#1680): the Draw mark = the first draw of the activity window's view tree after this call. One
         *  draw listener on the decor view's ViewTreeObserver; OnDraw returns void (it cannot cancel a draw) and never asks
         *  for a frame, so it cannot hold one. One-shot per process: a second call adds no listener. A null activity,
         *  window or decor → nothing. The body exists only in a dev build; [Conditional] as `cold` (a store build has no
         *  call and does not evaluate the argument; the decor is read inside the dev body). */
        [System.Diagnostics.Conditional("SPIXI_DEV_COEXIST")]
        internal static void coldDraw(global::Android.App.Activity? activity)
        {
#if SPIXI_DEV_COEXIST
            try
            {
                if (System.Threading.Interlocked.CompareExchange(ref coldDrawn, 1, 0) != 0)
                {
                    return;
                }
                global::Android.Views.View? decor = activity?.Window?.DecorView;
                if (decor == null)
                {
                    return;
                }
                global::Android.Views.ViewTreeObserver? vto = decor.ViewTreeObserver;
                if (vto == null || !vto.IsAlive)
                {
                    return;
                }
                vto.AddOnDrawListener(new ColdDrawL(decor));
            }
            catch (Exception)
            {
            }
#endif
        }
#endif

#if SPIXI_DEV_COEXIST
        private static void warnDropped()
        {
            if (System.Threading.Interlocked.Exchange(ref droppedWarned, 1) == 0)
            {
                IXICore.Meta.Logging.warn("[P1] dropped");
            }
        }

        private static bool isValidBody(string body)
        {
            if (string.IsNullOrEmpty(body))
            {
                return false;
            }
            string[] tokens = body.Split(' ');
            if (tokens.Length > MaxTokens)
            {
                return false;
            }
            foreach (string token in tokens)
            {
                if (!isValidToken(token))
                {
                    return false;
                }
            }
            return true;
        }

        private static bool isValidToken(string token)
        {
            if (token == null || token.Length < 1 || token.Length > MaxTokenLength)
            {
                return false;
            }
            foreach (char c in token)
            {
                bool ok = (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')
                    || c == '_' || c == '.' || c == '=' || c == '-';
                if (!ok)
                {
                    return false;
                }
            }
            return true;
        }

        private static void reportFrames(string what, int frames, int dropped, double longestMs)
        {
            line("frames " + what + " n=" + frames + " drop=" + dropped + " max=" + (long)Math.Round(longestMs));
        }

        // Main thread only (framesAfter marshals).
        private static void startFrames(string what)
        {
#if ANDROID
            Android.Views.Choreographer.Instance?.PostFrameCallback(new FrameProbe(what));
#elif WINDOWS
            startRenderingProbe(what);
#endif
        }
#endif

#if SPIXI_DEV_COEXIST && ANDROID
        /* The shape of SingleChatPage.CdperfFrameProbe: one vsync callback per frame for the window, gaps between
         * frame times; removes itself by not re-posting. */
        private sealed class FrameProbe : Java.Lang.Object, Android.Views.Choreographer.IFrameCallback
        {
            private readonly string what;
            private readonly long t0;
            private long lastNs = 0;
            private int frames = 0;
            private int dropped = 0;
            private double longestMs = 0;

            public FrameProbe(string w) { what = w; t0 = now(); }

            public void DoFrame(long frameTimeNanos)
            {
                try
                {
                    if (lastNs != 0)
                    {
                        double gapMs = (frameTimeNanos - lastNs) / 1_000_000.0;
                        frames++;
                        if (gapMs > DroppedGapMs) dropped++;
                        if (gapMs > longestMs) longestMs = gapMs;
                    }
                    lastNs = frameTimeNanos;
                    if (msSince(t0) < FrameWindowMs)
                    {
                        Android.Views.Choreographer.Instance?.PostFrameCallback(this);
                    }
                    else
                    {
                        reportFrames(what, frames, dropped, longestMs);
                    }
                }
                catch (Exception)
                {
                }
            }
        }
#endif

#if SPIXI_DEV_COEXIST && ANDROID
        /* ★ coldstart1 (#1680): the shape of SpixiContentPage.S11DrawL. The first OnDraw writes the Draw mark and posts ONE
         * removal (a listener cannot be removed inside OnDraw) from the decor's CURRENT observer when it is alive; every
         * later OnDraw returns at once. Main thread only (the view tree draws there). */
        private sealed class ColdDrawL : Java.Lang.Object, global::Android.Views.ViewTreeObserver.IOnDrawListener
        {
            private readonly global::Android.Views.View decor;
            private bool fired = false;

            public ColdDrawL(global::Android.Views.View d) { decor = d; }

            public void OnDraw()
            {
                if (fired)
                {
                    return;
                }
                fired = true;
                try
                {
                    cold(ColdMark.Draw);
                    decor.Post(() => remove());
                }
                catch (Exception)
                {
                }
            }

            private void remove()
            {
                try
                {
                    global::Android.Views.ViewTreeObserver? now = decor.ViewTreeObserver;
                    if (now != null && now.IsAlive)
                    {
                        now.RemoveOnDrawListener(this);
                    }
                }
                catch (Exception)
                {
                }
            }
        }
#endif

#if SPIXI_DEV_COEXIST && WINDOWS
        /* WinUI: CompositionTarget.Rendering (static, EventHandler<object>, args = RenderingEventArgs) fires once per
         * composed frame while subscribed. Gaps between RenderingTime values; unsubscribed at the end of the window. */
        private static void startRenderingProbe(string what)
        {
            long t0 = now();
            long fallbackT0 = System.Diagnostics.Stopwatch.GetTimestamp();
            TimeSpan last = TimeSpan.Zero;
            bool hasLast = false;
            bool finished = false;
            int frames = 0;
            int dropped = 0;
            double longestMs = 0;
            EventHandler<object>? handler = null;
            handler = (sender, e) =>
            {
                if (finished)
                {
                    return;
                }
                try
                {
                    TimeSpan t = e is Microsoft.UI.Xaml.Media.RenderingEventArgs re
                        ? re.RenderingTime
                        : TimeSpan.FromMilliseconds((double)msSince(fallbackT0));
                    if (hasLast)
                    {
                        double gapMs = (t - last).TotalMilliseconds;
                        if (gapMs > 0)   // a repeated RenderingTime is the same frame, not a new one
                        {
                            frames++;
                            if (gapMs > DroppedGapMs) dropped++;
                            if (gapMs > longestMs) longestMs = gapMs;
                            last = t;
                        }
                    }
                    else
                    {
                        last = t;
                        hasLast = true;
                    }
                    if (msSince(t0) >= FrameWindowMs)
                    {
                        finished = true;
                        Microsoft.UI.Xaml.Media.CompositionTarget.Rendering -= handler!;
                        reportFrames(what, frames, dropped, longestMs);
                    }
                }
                catch (Exception)
                {
                    finished = true;
                    try { Microsoft.UI.Xaml.Media.CompositionTarget.Rendering -= handler!; } catch (Exception) { }
                }
            };
            Microsoft.UI.Xaml.Media.CompositionTarget.Rendering += handler;
        }
#endif
    }
}
