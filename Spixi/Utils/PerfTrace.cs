using IXICore.Meta;
using System;
using System.Diagnostics;

namespace SPIXI
{
    /// <summary>
    /// ★ TEMPORARY MEASUREMENT SCAFFOLD (#344). DELETE WHEN THE NUMBER IS KNOWN.
    ///
    /// WHY THIS EXISTS. Damir, on a Galaxy A52 5G: entering a chat and chat info is
    /// "really noticeable, laggy, far from any other chat app". A DevTools Navigation
    /// Timing reading on the live chat WebView gave domContentLoadedEventEnd = 185 ms,
    /// so parsing the shell and executing the ~870 KB inlined bundle is NOT the
    /// dominant cost. But that clock starts at NAVIGATION START, so it excludes
    /// everything that happens before the WebView is handed the document:
    ///
    ///   · reading the 1.4 MB shell out of the APK,
    ///   · SpixiLocalization.localizeHtml doing string substitution across all of it,
    ///   · on ANDROID ONLY, MAUI turning HtmlWebViewSource into a
    ///     `data:text/html;charset=utf-8;base64,…` URL — 1.4 MB becomes ~1.9 MB, and
    ///     the engine must base64-decode it before parsing can begin
    ///     (SpixiContentPage.generatePage:1744 — every OTHER platform takes the
    ///     `else` branch, writes ll_&lt;file&gt;.html once and loads it by URL),
    ///   · the native page push and its transition,
    ///
    /// and everything that happens after: ~25 messages arriving as ONE
    /// EvaluateJavaScriptAsync each, then the shell's 250 ms burst settle.
    ///
    /// This class times that whole chain so the fix is aimed at a measured cost
    /// rather than an inferred one. Rule #294.
    ///
    /// ★ NO `#if DEBUG` GUARD, DELIBERATELY. The first cut had one and printed nothing
    /// on Damir's device — DEBUG was evidently not defined for that build, so every
    /// method body compiled away and the scaffold looked broken when it was merely
    /// absent. This is a THROWAWAY measurement file, deleted the moment the number is
    /// known, so an unconditional log is the right trade against another lost cycle.
    /// ⚠ DELETE THIS FILE AND ITS 5 CALL SITES BEFORE ANY RELEASE BUILD.
    ///
    /// HOW TO READ IT. Open one chat, then:
    ///   adb logcat | findstr PERF          (Windows)
    ///   adb logcat | grep PERF             (macOS)
    ///
    /// ★ Every line is emitted TWICE, on purpose. Logging.info goes to Ixian-Core's
    /// own sink (ixian.log, readable in-app at Account -> Developer log), which does
    /// NOT reach logcat on Android — the first run of this scaffold printed nothing
    /// for exactly that reason. Console.WriteLine is the .NET-for-Android stdout
    /// bridge and DOES surface in logcat. Whichever one you can read, read it.
    ///
    /// Every line is milliseconds SINCE THE TAP, so the numbers are cumulative and
    /// the gaps between them are what matter:
    ///
    ///   PERF ---- chat open (tap) ----
    ///   PERF generatePage            = N ms      asset read + localize + base64
    ///   PERF loadPage returned       +N ms
    ///   PERF webView Navigated       +N ms       the whole document trip
    ///   PERF shell onLoad            +N ms       gap from Navigated ~= the 185 ms parse
    ///   PERF loadMessages start      +N ms
    ///   PERF loadMessages pushed 25  = N ms      the per-message marshal cost
    ///   PERF loadMessages done       +N ms
    ///
    /// WHAT EACH GAP ACCUSES:
    ///   tap → generatePage done      the asset read, the localize pass, the base64.
    ///                                If this is large, fix generatePage: make Android
    ///                                take the same file-based path as every other
    ///                                platform. Contained C# change, no new design.
    ///   generatePage → Navigated     the native push, the transition, the data: URL
    ///                                handover.
    ///   Navigated → shell onLoad     document parse + bundle execute (~185 ms).
    ///                                If THIS dominates, per-shell bundle slimming is
    ///                                the lever — a build change with no runtime risk.
    ///   loadMessages span            the per-message EvaluateJavaScriptAsync loop.
    ///                                If THIS dominates, build the addMessages batch
    ///                                verb (docs/chat-transport-spec.md, #298).
    ///
    /// The same trace covers chat INFO and every other screen, because loadPage and
    /// generatePage are shared — open ContactDetails and read the same three lines.
    /// </summary>
    public static class PerfTrace
    {
        private static readonly Stopwatch clock = Stopwatch.StartNew();
        private static long tapMs = 0;

        /// <summary>Write to both sinks — see the class header for why.</summary>
        private static void emit(string line)
        {
            try { Console.WriteLine(line); } catch { }        // -> logcat (DOTNET / mono-stdout)
            try { Logging.info(line); } catch { }             // -> logcat as `app_process64 …|info|`, and ixian.log
        }

        /// <summary>Milliseconds on the shared monotonic clock. Pass to span().</summary>
        public static long now()
        {
            return clock.ElapsedMilliseconds;
        }

        /// <summary>Zero the timeline. Call where the user's intent enters C#.</summary>
        public static void tap(string what)
        {
            tapMs = clock.ElapsedMilliseconds;
            emit("PERF ---- " + what + " (tap) ----");
        }

        /// <summary>A point on the timeline, in ms since the last tap().</summary>
        public static void mark(string label)
        {
            emit("PERF " + label + " +" + (clock.ElapsedMilliseconds - tapMs) + " ms");
        }

        /// <summary>A duration: pass the value now() returned before the work.</summary>
        public static void span(string label, long startMs)
        {
            emit("PERF " + label + " = " + (clock.ElapsedMilliseconds - startMs) + " ms");
        }
    }
}
