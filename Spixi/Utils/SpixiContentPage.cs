using IXICore;
using IXICore.Meta;
using SPIXI.MiniApps;
using SPIXI.Lang;
using SPIXI.Meta;
using SPIXI.VoIP;
using Spixi;
using IXICore.Streaming;
using Page = Microsoft.Maui.Controls.Page;
using Application = Microsoft.Maui.Controls.Application;
using NavigationPage = Microsoft.Maui.Controls.NavigationPage;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Graphics;
using Microsoft.Maui.ApplicationModel;
using System.IO;
using System;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Maui;

#if IOS || MACCATALYST
using Microsoft.Maui.Controls.PlatformConfiguration;
using Microsoft.Maui.Controls.PlatformConfiguration.iOSSpecific;
#endif

#if IOS
using UIKit;        // iOS-29 r2 (#303): native keyboard-frame observer
using Foundation;
#endif

#if WINDOWS
using Microsoft.Web.WebView2.Core;
using Microsoft.Maui.Platform;
#endif

namespace SPIXI
{
    public class SpixiContentPage : ContentPage, IDisposable
    {
        public bool CancelsTouchesInView = true;
        public bool pageLoaded = false;
        /* ★ V-10 (#46 loop 2026-08-29): written from the loader thread (loadMessages runs
         * on a Task.Run and pushes through sendMessage) and drained on the main thread,
         * with no lock. PRE-EXISTING — #619 added no new thread pair — but a plain Queue
         * has no defined behaviour under that pattern, and the fix is one word with no
         * behaviour delta. */
        private ConcurrentQueue<string> messageQueue = new ConcurrentQueue<string>();
        protected WebView? _webView = null;
        public WebView WebView
        {
            get
            {
                return _webView!;
            }
        }

        private string? loadedHtmlFileName = null;

        // #340 audit (A-MAJOR-1/2): may Utils.sendUiCommand hand this page a "data:…;base64,…"
        // argument VERBATIM instead of base64-encoding it for transport? True only for the
        // redesigned shells, which decode through src/bridge/native.js and pass a leading
        // "data:" straight through. FAILS CLOSED, deliberately, in both directions:
        //   · the remaining legacy Raw/html pages (hasLegacyPageChrome) decode with
        //     js/spixi.js's unguarded atob and would THROW on the ':' — see Utils.cs.
        //   · MiniAppPage never calls loadPage (it points the WebView at the mini-app's own
        //     entry point), so loadedHtmlFileName stays null here and the frozen
        //     base64-per-argument SDK contract is preserved without MiniAppPage having to
        //     know this rule exists. A page that is pushed to before loadPage runs is also
        //     null → encoded, which is the pre-#339 behaviour.
        // Keep in sync with hasLegacyPageChrome (same list, same reason: those files were
        // never regenerated onto the new bridge).
        public bool supportsRawDataUriArgs
        {
            get
            {
                return loadedHtmlFileName != null && !hasLegacyPageChrome(loadedHtmlFileName);
            }
        }

        /* ★ N71 (#421): does this page re-theme from a `setTheme` PUSH, or only from a
         * regenerate? The redesigned shells swap one data-theme attribute and every
         * token follows. The 7 remaining legacy pages have no setTheme global at all —
         * they carry the theme in a `<link href="css/*SL{SpixiThemeMode}">` BAKED at
         * generatePage time, so the only thing that re-themes them is reload().
         *
         * The expression is identical to supportsRawDataUriArgs above, and that is not
         * an accident — it is the same "was this file regenerated onto the new bridge"
         * question. It gets its own name because the REASON differs, and a reader who
         * finds a theme sweep branching on a data-URI transport flag would rightly
         * distrust it. Keep all three in sync with hasLegacyPageChrome. */
        public bool rethemesByPush
        {
            get
            {
                return loadedHtmlFileName != null && !hasLegacyPageChrome(loadedHtmlFileName);
            }
        }

        /* ★ N66 (#385, review MAJOR-1): does this page hold content WE generated?
         * reload() can only help such a page — it re-runs generatePage, which is where
         * the *SL{SpixiThemeName} / *SL{} substitution happens. For a page with no
         * generated content reload() falls through to a raw _webView.Reload(), which
         * re-serves the SAME document and restarts it for nothing.
         * MiniAppPage is the one page in the tree that assigns _webView directly instead
         * of calling loadPage, so this is false exactly there — third-party content stays
         * structurally excluded from our sweeps, the same rule stated at the iOS keyboard
         * observers below. Without this an OS auto-dark flip would restart a running
         * mini-app from its entry point and destroy its state, for zero theme gain. */
        public bool hasGeneratedContent
        {
            get
            {
                return loadedHtmlFileName != null;
            }
        }

        // The native surface painted behind (and on) this page's WebView — chosen per
        // shell so the pre-paint frame matches what the shell will render (N1/N3).
        protected Color pageSurfaceColor = ThemeManager.getSurfaceColor();
        // ★ N73: the same value as a hex string, for the Android system-bar strip.
        private string pageSurfaceColorString = ThemeManager.getSurfaceColorString();

        // Redesigned shells sit on --surface-screen; the REMAINING legacy blue-themed
        // pages keep the legacy colour (don't trade one mismatch for another — audit m3);
        // the lock shell is always-dark by design.
        private static Color surfaceColorFor(string html_file_name)
        {
            return Color.FromArgb(surfaceColorStringFor(html_file_name));
        }

        /* ★ AND-7b (#407, Damir F5 2026-08-19): which colour decides the SYSTEM BAR GLYPHS.
         *
         * Before full bleed the strip was the activity root background, so one colour per
         * PAGE was the whole truth. Now the WebView paints under the status bar, so the
         * pixels behind the clock are whatever the SHELL draws there — and on the home
         * shell that changes per TAB: a light topbar on Chats and Apps, the dark hero on
         * Wallet. One page-level answer cannot be right for both, which is why the glyphs
         * went dark over the wallet hero.
         *
         * HomePage overrides this. Every other page has one surface all the way across,
         * so the default is the page surface it already paints behind its WebView. */
        /* ★ AND-7e (#410, Damir F5 2026-08-19): the BOTTOM colour, resolved LIVE.
         *
         * #408 made the TOP live and left the bottom reading the cached
         * `pageSurfaceColorString` — which is refreshed only by applyPlatformPageChrome.
         * The repaint paths that do NOT go through it (a tab switch, a theme change)
         * therefore painted the navigation bar with whatever the theme was at the last
         * page LOAD. Damir's two screenshots are the proof and they invert cleanly: a
         * LIGHT app reported `bottom=#13171b` and a DARK app reported `bottom=#f9fafb`.
         * Exactly one theme behind, in both directions — a cache, not a race. */
        protected string liveSurfaceColorString()
        {
            return surfaceColorStringFor(loadedHtmlFileName ?? "");
        }

        protected virtual string systemBarSurfaceColorString()
        {
            /* ★ AND-7c (#408, Damir F5 2026-08-19): resolve LIVE, never from the cached
             * field. `pageSurfaceColorString` is baked once in applyPageSurfaceColor at
             * loadPage time, so it drifts from the theme the shell is actually rendering —
             * which is what put LIGHT glyphs over the light Chats and Apps tabs. The
             * device proved it in one frame: the wallet override (which asks ThemeManager
             * live) reported the LIGHT hero #3050bd while this default reported the DARK
             * surface #13171b, in the same session. Both branch on the same resolved
             * appearance, so they can only disagree if one of them is stale. */
            return liveSurfaceColorString();
        }

        // ★ N73 (#391): the same answer as a hex string — Android's bar-strip painter
        // takes one (SPlatformUtils.setEdgeToEdge), and round-tripping a Color back to
        // hex for it would be a second source of truth.
        private static string surfaceColorStringFor(string html_file_name)
        {
            switch (html_file_name)
            {
                case "lock.html":
                    return "#13171b";
                /* ★ N73 (#391): the LAUNCH flow is fixed dark in both themes (the shell
                 * pins data-theme="dark" and paints --gradient-launch), but this returned
                 * the THEMED surface — so in light mode the native ground behind and
                 * around a dark screen was light. That is the wrong status-bar strip
                 * Damir reported on welcome and on the account-creation screen. The value
                 * is the TOP of --gradient-launch (linear 200deg, first stop), and the
                 * shell's own html/body background + instant-bg use the same one, so the
                 * strip, the pre-paint frame and the first painted pixels all agree.
                 * The lock keeps its own #13171b until Damir converges the two gradients
                 * (tokens.css --gradient-lock note). */
                case "intro.html":
                    return "#1b163c";
                // ★★ L1 (#640): wallet_request.html and wallet_send_2.html left this list
                // with the pages that loaded them (WalletReceivePage / WalletSend2Page,
                // both deleted). wallet_recipient.html STAYS — WalletRecipientPage is
                // still pushed by AppDetailsPage and HomePage and is not a money screen.
                case "wallet_recipient.html":
                case "address.html":
                    return ThemeManager.getBackgroundColorString();
                // wallet_sent.html left this list at #259 (B3 redesigned shell,
                // instant-bg = --surface-screen) — stale legacy-blue entry fixed with
                // the edge-to-edge batch (pre-paint frame now matches the shell).
                default:
                    return ThemeManager.getSurfaceColorString();
            }
        }

        public void loadPage(WebView web_view, string html_file_name)
        {
            pageLoaded = false;
            _webView = web_view;
            loadedHtmlFileName = html_file_name;

            // N1/N3 flicker: paint the surface this page's shell renders, in the CURRENT
            // theme, behind (and on) the WebView so any pre-paint native frame matches the
            // shell about to load — in BOTH themes (theme-aware by requirement; a hardcoded
            // dark bg breaks light mode — that was the reported light-mode dark flash).
            applyPageSurfaceColor();

            _webView.Source = generatePage(html_file_name);
            _webView.Navigated += webViewNavigated;
            _webView.Navigating += webViewNavigating;
        }

        /* ★ N71 (#421, break-my-verdict MAJOR-1): INTERNAL, so the theme sweep can
         * refresh a page's native backing WITHOUT the rest of the chrome pass.
         * applyPlatformPageChrome() looks page-local and is not: on Android it calls
         * SPlatformUtils.setEdgeToEdge, which paints the ACTIVITY root view and the
         * window insets controller — one process-wide pair of bars. Calling it once
         * per enumerated page made the LAST page in the list decide the status-bar
         * glyph colour, overwriting the repaintSystemBarsFor(null) both callers run
         * two lines earlier from the VISIBLE page. That is the AND-7b/c/d/e defect
         * (#407–#410) reintroduced, on the wallet hero and the lock screen.
         * This method has no global side effect: page background, content background,
         * WebView background, and the two cached surface fields. */
        internal void applyPageSurfaceColor()
        {
            pageSurfaceColorString = surfaceColorStringFor(loadedHtmlFileName ?? "");
            pageSurfaceColor = Color.FromArgb(pageSurfaceColorString);
            this.BackgroundColor = pageSurfaceColor;
            if (Content != null)
            {
                Content.BackgroundColor = pageSurfaceColor;
            }
            if (_webView != null)
            {
                _webView.BackgroundColor = pageSurfaceColor;
#if ANDROID
                /* ★ F1 (2026-08-22, Damir on device: a WHITE flash before the lock).
                 *
                 * The 2026-08-21 log ruled out every layer we had been guessing at. The MAUI
                 * page and the MAUI WebView both read back #13171B, and the window ground is
                 * #144576 — measured, splash BLUE, not light. Nothing we control is white.
                 *
                 * What is left is the ANDROID WEBVIEW'S OWN RENDERER, which paints its
                 * default white until the document commits its first frame. `BackgroundColor`
                 * above sets the MAUI cross-platform view; it does NOT reliably reach the
                 * native android.webkit.WebView underneath, so the renderer keeps its
                 * default. Setting it on the platform view is the only thing that does.
                 *
                 * ★ This matches the device result exactly, which is why it is worth doing
                 * rather than probing again: RESUME now PASSES (1.2) because the lock's
                 * WebView is already loaded and painted, while COLD START still fails (1.5)
                 * — and cold start is precisely the path with a 461 ms gap between the push
                 * and `lock/webview-onload`, i.e. 461 ms of un-painted renderer.
                 *
                 * Handler may be null when this runs from the constructor, before the view is
                 * realised; the later calls (webViewNavigated, OnAppearing, theme sweeps) each
                 * re-apply it, so the value lands as soon as there is something to land on. */
                try
                {
                    if (_webView.Handler?.PlatformView is Android.Webkit.WebView nativeWebView)
                    {
                        nativeWebView.SetBackgroundColor(Android.Graphics.Color.ParseColor(pageSurfaceColorString));
                    }
                }
                catch (Exception ex)
                {
                    // Cosmetic. A flash is better than a crash on the lock surface.
                    Logging.warn("applyPageSurfaceColor: native WebView background not applied: " + ex.Message);
                }
#endif
            }

            /* ★ F1 INSTRUMENTATION (log only), gated to the LOCK so the log is not flooded
             * — this runs on every page load and every theme sweep.
             *
             * ★ SOURCE FINDING worth recording, because it CORRECTS the verdict's
             * candidate order for the white flash. The verdict's first candidate was "the
             * Android window background (MainTheme) is light and shows between the modal
             * push and the lock's first paint". It is not light: styles.xml:37 sets
             * android:windowBackground to @layout/splash_screen, whose base layer is
             * #144576 — splash BLUE. And the page itself is not light either: this method
             * runs from loadPage inside the LockPage CONSTRUCTOR, before the modal push,
             * and paints page, content AND WebView #13171b (surfaceColorStringFor's
             * "lock.html" case).
             *
             * So neither native layer can produce a WHITE frame, which leaves the Android
             * WebView's own renderer painting white before lock.html's instant-bg (#203)
             * commits. This line prints the three colours actually applied; the phase
             * timeline (pause/push-requested → lock/webview-onload) measures the window it
             * happens in. Together they decide it — measurement, not a third guess. */
            if ((loadedHtmlFileName ?? "") == "lock.html")
            {
                /* ⚠ AUDIT MINOR: READ BACK the properties, do not echo the value we just
                 * assigned. The single surviving F1 suspect is "the WebView renderer paints
                 * white before lock.html's instant-bg commits" — precisely the case where
                 * what we set is not what is on screen — and a probe that reprints its own
                 * input cannot tell "set and stuck" from "set and overridden". */
                /* ★ F1/F2 PROBE (2026-08-22): the real view stack, not what we believe it to
                 * be. Two hypotheses for F2 are dead — the bars ARE repainted dark, and
                 * painting the window did not fix it either. This prints what each layer's
                 * background actually IS at the moment the lock is up, so the next round has
                 * a measurement instead of a third guess. Lock-gated, so it cannot flood. */
#if ANDROID
                SPIXI.Meta.SLockDiag.mark("lock/bar-surfaces", Spixi.SPlatformUtils.describeBarSurfaces());
#endif
                SPIXI.Meta.SLockDiag.mark("lock/surface-applied",
                    "asked=" + pageSurfaceColorString
                    + " page=" + (BackgroundColor != null ? BackgroundColor.ToHex() : "null")
                    + " webViewBg=" + (_webView != null && _webView.BackgroundColor != null ? _webView.BackgroundColor.ToHex() : "null")
                    + " windowBg=#144576(styles.xml:37→splash_screen)");
            }
        }

        protected void webViewNavigating(object? sender, WebNavigatingEventArgs e)
        {
            // "Load then move" (N1/N3): the shells signal ixian:onload once booted; if this
            // page is currently being preloaded off-screen, that signal presents it (pages
            // that reveal later — the conversation — set deferPreloadReady and call
            // signalPreloadReady() themselves at their reveal point). This handler runs
            // AFTER the page's own onNavigating (multicast subscription order), so the
            // page has already processed its onload data pushes when we present.
            // StartsWith (not Equals) on purpose: AppDetailsPage's own handler matches
            // "ixian:onload" by prefix too; presenting is only ever the page's own signal.
            if (!deferPreloadReady
                && e.Url != null
                && e.Url.StartsWith("ixian:onload", StringComparison.Ordinal))
            {
                signalPreloadReady();
            }
#if WINDOWS
            if (_webView == null) return;
            var mauiWebView = _webView.Handler?.PlatformView as Microsoft.Maui.Platform.MauiWebView;
            if (mauiWebView == null) return;
            // WebView2 paints its DefaultBackgroundColor (WHITE out of the box) until the
            // document's first paint — the white flash on every push in dark mode. Match
            // it to this page's themed surface so the pre-paint frame is invisible.
            // ToWindowsColor, NOT ToPlatform: on WinUI ToPlatform(Color) yields a Brush,
            // but WebView2.DefaultBackgroundColor takes a Windows.UI.Color (CS0029).
            mauiWebView.DefaultBackgroundColor = pageSurfaceColor.ToWindowsColor();
            CoreWebView2 coreWebView2 = mauiWebView.CoreWebView2;
            if (coreWebView2 == null) return;
            coreWebView2.Settings.IsStatusBarEnabled = false;
            coreWebView2.Settings.AreDevToolsEnabled = true;

#endif
        }

        protected async void webViewNavigated(object? sender, WebNavigatedEventArgs e)
        {
            if (pageLoaded = await checkIfPageLoaded())
            {
                processMessageQueue();
            }
        }

        private void evaluateJavascript(string script)
        {
            if (_webView == null)
                return;

            MainThread.BeginInvokeOnMainThread(() => {
                try
                {
                    if (_webView == null)
                        return;
                    _webView.EvaluateJavaScriptAsync("try{ " + script + " }catch(e){  }");
                }
                catch { }
            });
        }

        private void processMessageQueue()
        {
            if (_webView == null)
                return;

            // ★ V-10: TryDequeue, not Count-then-Dequeue. A concurrent queue makes the
            // check-then-take pair a race of its own — the loader thread can drain a
            // slot between the two on any queue implementation that allows it.
            while (messageQueue.TryDequeue(out string message))
            {
                evaluateJavascript(message);
            }
        }

        public void sendMessage(string msg)
        {
            if (pageLoaded && _webView != null)
            {
                evaluateJavascript(msg);
            }
            else
            {
                messageQueue.Enqueue(msg);
            }
        }

        // The REMAINING legacy pages (Raw/html files with NO viewport-fit=cover meta and
        // no env(safe-area-inset-*) CSS). These keep the historical native inset padding
        // on iOS — dropping it would slide their content under the notch. Every
        // redesigned shell handles the insets itself (edge-to-edge, iOS-1/3/4).
        // Keep this list in sync with the viewport-fit=cover detector:
        //   for f in Spixi/Resources/Raw/html/*.html; do grep -L 'viewport-fit=cover' $f; done
        private static bool hasLegacyPageChrome(string html_file_name)
        {
            switch (html_file_name)
            {
                // ★★ L1 (#640): the three wallet_send*/wallet_request entries left this
                // list with their pages. wallet_recipient.html STAYS.
                case "address.html":
                case "apps.html":
                case "settings_lock.html":
                case "wallet_recipient.html":
                    return true;
                default:
                    return false;
            }
        }

        // Platform page chrome (safe-area padding + themed page background). Called at
        // the historical point (webViewNavigated → checkIfPageLoaded) AND re-applied
        // after a load-then-move present: for a preloaded page the historical call runs
        // while the page is staged off-screen, where iOS SafeAreaInsets() reads ZERO —
        // without the re-apply every preloaded page would render under the notch (audit M2).
        internal void applyPlatformPageChrome()
        {
            /* ★ AND-7c (#408, Damir F5 2026-08-19): re-derive the page surface from the
             * LIVE theme before anything is painted with it. `pageSurfaceColorString` and
             * `pageSurfaceColor` are baked once at loadPage time, so after a theme change
             * they sit one theme behind the shell — the pre-paint frame goes light behind
             * a dark shell, and on Android the bar glyphs are chosen from the wrong
             * luminance. Every chrome pass refreshes them now: page load, re-present, and
             * OnAppearing. Idempotent, cross-platform, and it costs one switch. */
            applyPageSurfaceColor();
#if IOS || MACCATALYST
            // iOS-1/3/4 edge-to-edge: redesigned shells draw under the status bar + home
            // indicator (viewport-fit=cover is in every shell; fixed chrome pads itself
            // via env(safe-area-inset-*), which WKWebView populates live per WebView —
            // including after a load-then-move present, with no M2-style re-read race).
            // The themed page background stays: it is the pre-paint frame (N1/N3) and
            // the transition/keyboard backing. Legacy pages keep the native inset.
            /* ★ AND-7 sibling (#401), and the fix security-review MAJOR #6(b) asks for:
             * `!hasGeneratedContent` is TRUE exactly for MiniAppPage, which never calls
             * loadPage (it points its WebView at the publisher's own entry point). That
             * page carries THIRD-PARTY HTML, which cannot be assumed inset-aware — #282
             * dropped the blanket padding on the premise that every non-legacy page is a
             * viewport-fit shell we wrote, and mini-app UIs have been rendering under the
             * notch and the home indicator since. Same one-token classification the
             * Android branch below uses; MAJOR #6(a), the link-handoff trust tier, is a
             * separate and still-open ask. */
            if (hasLegacyPageChrome(loadedHtmlFileName ?? "") || !hasGeneratedContent)
            {
                var insets = this.On<iOS>().SafeAreaInsets();
                this.Padding = new Thickness(0, insets.Top, 0, 10);
            }
            else
            {
                this.Padding = new Thickness(0);
            }

            this.BackgroundColor = pageSurfaceColor;
#endif
#if ANDROID
            /* ★ N73 (#391): repaint the system-bar strip for THIS page. On Android the
             * visible status/nav strip is the activity root background (both bars are
             * transparent, MainActivity + AND-6), and it was painted from the APP THEME
             * — so a fixed-dark screen (launch, lock) in light mode got a light strip
             * above it, and dark bar icons on top of that dark screen. The colour is the
             * one this page already paints behind its WebView, so the two can never
             * disagree; every other page passes the themed surface, i.e. exactly the old
             * value. Also re-run on OnAppearing, so walking BACK to a page repaints. */
            /* ★ AND-7d (#409): the BOTTOM keeps the page surface — the root-view background is
             * still visible behind the OS navigation controls — and only the TOP takes the
             * per-tab answer. One colour for both painted the nav bar blue on Wallet. */
            /* ★ F2 INSTRUMENTATION (log only) — AUDIT MAJOR. `repaintSystemBars` is NOT the
             * only way the system-bar strip gets painted, and it is not even the one that
             * runs for the pause lock: applyPlatformPageChrome reaches setEdgeToEdge from
             * webViewNavigated→checkIfPageLoaded AND from OnAppearing, both of which the
             * lock takes. Instrumenting only the other path would have printed `bars/skip`
             * with no `bars/repaint` while setEdgeToEdge had in fact already run twice —
             * a FALSE "never repainted" verdict, pointing the next round at a fix that
             * cannot work. That is exactly how F3 got two wrong fixes; this batch exists
             * so F2 does not repeat it. Source-tagged so the two paths are told apart. */
            SPIXI.Meta.SLockDiag.barsRepainted("pageChrome:" + GetType().Name,
                liveSurfaceColorString(), systemBarSurfaceColorString());
            SPlatformUtils.setEdgeToEdge(liveSurfaceColorString(), systemBarSurfaceColorString());

            /* ★ AND-7 (#396/#401) FULL BLEED — the Android half of the iOS-#282 rule.
             * MainActivity no longer pads the root content view at the top, so the page
             * tree reaches y=0 and a redesigned shell paints its own chrome under the
             * status bar (the launch gradient and the wallet hero bleed; every topbar
             * grows by the inset and keeps its surface). The inset reaches the shells as
             * the *SL{AndroidInsetTop} carrier, in CSS px, on the first frame.
             *
             * Two kinds of page CANNOT do that and keep the native padding instead —
             * both were already enumerated for the same reason on iOS:
             *   · the 8 remaining LEGACY Raw/html pages (no viewport-fit=cover, no
             *     env() chrome) — hasLegacyPageChrome;
             *   · MINI-APP pages, which never call loadPage, so loadedHtmlFileName is
             *     null. That is third-party content: it must never be asked to handle
             *     an inset it was not told about (the standing rule that our sweeps
             *     structurally exclude mini-app WebViews).
             *
             * This REPLACES the Android-15 modal branch that padded every modal by
             * `MainActivity.Insets.Value.Top / 3` — a hardcoded density divide that only
             * existed because the root padding did not reach a modal container. With no
             * root top padding, every page is unpadded the same way and the lock, the
             * call surface and scan pad themselves in CSS like every other shell. */
            if (hasLegacyPageChrome(loadedHtmlFileName ?? "") || !hasGeneratedContent)
            {
                this.Padding = new Thickness(0, MainActivity.TopInsetDip, 0, 0);
            }
            else
            {
                this.Padding = new Thickness(0);
                /* ★ AND-7 (audit MINOR): the carrier is baked at generatePage time, so a
                 * document that is ALREADY OPEN when the inset changes keeps the old value.
                 * The activity handles Orientation/ScreenSize itself (MainActivity's
                 * ConfigurationChanges), so nothing re-generates. Re-push the current value
                 * on every page-chrome pass — page load, re-present, and OnAppearing — which
                 * heals a stale inset on the next visit to any screen.
                 * Gated to REDESIGNED shells: they define window.setInsetTop in their head
                 * script; the 7 legacy pages and mini-app WebViews do not, and they keep
                 * native padding anyway (the branch above).
                 * ⚠ RESIDUAL, logged not hidden: a rotation while a page is on screen is
                 * not covered — see docs/android-findings.md. */
                Utils.sendUiCommand(this, "setInsetTop",
                    MainActivity.TopInsetDip.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture));
            }
            this.BackgroundColor = pageSurfaceColor;
#endif
        }

        private async Task<bool> checkIfPageLoaded()
        {
            if (_webView == null)
                return false;

            applyPlatformPageChrome();

            var tcs = new TaskCompletionSource<string>();
            MainThread.BeginInvokeOnMainThread(async () =>
            {
                try
                {
                    if (_webView == null)
                        return;
                    var result = await _webView.EvaluateJavaScriptAsync("document.readyState");
                    tcs.TrySetResult(result);
                }
                catch (Exception ex)
                {
                    tcs.TrySetException(ex);
                }
            });
            return (await tcs.Task)?.Trim('\"') == "complete";
        }

        /* ————— "Load then move" (N1/N3 flicker, Damir 2026-07-09) ————————————————
         *
         * pushPageLoaded() keeps the user on the CURRENT screen while the incoming
         * page's WebView loads invisibly (staged inside the current page's Grid at
         * Opacity 0 / InputTransparent so it gets a handler and boots), and presents
         * the page only once its shell signals ixian:onload — so no blank, wrong-theme
         * or half-booted frame is ever shown. Timeout + any staging failure fall back
         * to a plain PushAsync (pre-fix behaviour, now behind the theme-matched
         * surface colour from loadPage, so the worst case is a themed frame).
         *
         * SECURITY (SECURITY.md §1): the staged page keeps its OWN WebView, its own
         * JS context and its own bridge handlers — nothing is merged into the host's
         * WebView and no JS bridge is shared; only the NATIVE view tree hosts it
         * temporarily (same containment as the desktop rightContent pattern, #177).
         * Coordination is C#-only. If staging is abandoned (user navigated away /
         * page cancelled itself), the staged page is Dispose()d — the hidden WebView
         * is torn down, never left alive in the background.
         */

        private class PreloadOp
        {
            public SpixiContentPage host;
            public SpixiContentPage target;
            public ContentView stage;
            public View targetContent;
            public Grid hostGrid;
            // Set when the staged page bails out (popPageAsync) AFTER the present was
            // already claimed (e.g. by the timeout): the present path honours it and
            // drops the page instead of showing a dead screen (audit M1).
            public volatile bool abandoned = false;
            // Round 3 (DECISIONS #225): overlay presentation. When true, present =
            // make the staged view VISIBLE in the host's Grid (no PushAsync, no
            // re-parent — nothing left that can repaint a WebView2 surface). tag
            // lets a new overlay REPLACE a same-tag one after it is shown (chat
            // switching); column pins the overlay to one grid column (desktop pane).
            public bool overlayMode = false;
            // #229: present as a MODAL push (the lock screen) instead of PushAsync/
            // overlay — staged the same way, presented via PushModalAsync on the root
            // nav so it covers everything (incl. overlays + pushed pages).
            public bool modalMode = false;
            public string? tag = null;
            public int column = -1;
            // Chained navigation (AppNew → AppDetails): the page to close/remove only
            // AFTER this one is visible — never a gap, never an orphaned overlay.
            public SpixiContentPage? replaces = null;
            // iOS-46 route (a) (#315): close PARKS this overlay (hidden, WebView kept
            // warm in the host grid) instead of disposing it — re-presented instantly
            // by representParkedOverlay. Set ONLY by HomePage's narrow-mode Account
            // push. Presentation-lifecycle only: the page keeps its own WebView/JS
            // context (§1/#221 unchanged) — parking changes WHEN it is torn down,
            // never what it can reach.
            public bool parkOnClose = false;
            /* ★ Batch C (#546) C3 — #533 ②: WARM AFTER FIRST PAINT. The op stages exactly
             * like any load-then-present push, but on load it is PARKED (hidden, WebView
             * alive, data pushed) instead of presented — the same slot parkOnClose fills,
             * so the next Account tap is representParkedOverlay's instant path from the
             * FIRST open on. Presentation-lifecycle only, like parkOnClose. */
            public bool parkOnLoad = false;
            /* ★★ V-19: what navigation this op IS, for the supersede dedupe. A second tap
             * on the SAME row must let the load finish rather than restart it; a tap on a
             * DIFFERENT row must win. null never matches null. */
            public string? navKey = null;
            /* ★★ Item 6 (Damir 2026-08-29) — PRESENT-FIRST.
             * `presentPreload` holds EVERY load-then-present navigation for a flat 120 ms
             * so the shell can paint the data its onload handler just pushed. That hold is
             * why nobody has ever seen the chat-info boot skeleton: the shell coalesces its
             * own pushes on a 120 ms timer too, so the panel finishes at ~120 ms and the
             * present fires at ~120 ms, and the page appears already filled.
             * A page that WANTS its skeleton seen asks for 0. Every other screen keeps the
             * 120 ms it has today — one report does not re-time the whole app. */
            public int revealDelayMs = 120;
            /* ★★ Item 6: slide in from the trailing edge instead of appearing. The overlay
             * present is an opacity flip today; Damir asked for the slide, and it is also
             * the thing most likely to mask the skeleton-to-content change on its own. */
            public bool slideIn = false;
            public volatile bool closing = false;   // ★ L8: set at the top of closeOverlay
            // W7: the inset this stage was staged with (#245 rail strip for the Account
            // peer pane; zero for every other op). Remembered so a page opened FROM this
            // overlay can inherit the SAME geometry and cover its opener exactly —
            // getOverlayStageMargin(). Read under preloadLock, never off the stage's
            // Margin property (that would be a UI read from a background thread).
            public Thickness stageMargin = default;
            private int done = 0;

            public PreloadOp(SpixiContentPage host, SpixiContentPage target, ContentView stage, View targetContent, Grid hostGrid)
            {
                this.host = host;
                this.target = target;
                this.stage = stage;
                this.targetContent = targetContent;
                this.hostGrid = hostGrid;
            }

            public bool tryFinish()
            {
                return Interlocked.Exchange(ref done, 1) == 0;
            }
        }

        private static readonly object preloadLock = new object();
        private static PreloadOp? activePreload = null;
        private static bool preloadPending = false;   // reserved between the tap and staging

        /* ★★ #46 loop MAJOR-3 on #507 — THE LOCK STAGING WINDOW OPENS BEFORE `activePreload`.
         * `pushModalLoaded` sets `preloadPending` and THEN marshals the staging block. That
         * block runs on the NEXT dispatcher turn. For that whole turn `isLockStaging()` read
         * `activePreload` only and answered FALSE, `modalOverlayOp` was null, and
         * `ModalStack.Count` was 0. So `App.lockOnIdle` and `CallPage.lockUp()` both saw "no
         * lock anywhere" and were free to present OVER a lock that was already on its way up.
         * On the idle path that put a settings authorise lock — Cancel and all — above the
         * app lock. This stamp closes the turn.
         * ⚠ THE STAMP IS BOUNDED BY TIME AS WELL AS BY THE CLEARS. `preloadPending` is a
         * field the ordinary page preload shares, and a marshalled block that never ran
         * would otherwise latch `isLockStaging()` TRUE for the rest of the session — which
         * kills the idle lock and the call surface together. Every exit from
         * `pushModalLoaded` clears the flag; the age check is the belt behind that. */
        private static bool lockPreloadPending = false;
        private static DateTime lockPreloadPendingAt = DateTime.MinValue;
        private const double LOCK_PRELOAD_PENDING_MAX_SECONDS = 5;

        /* ————— Overlay navigation (round 3, DECISIONS #225) ——————————————————
         * WinUI repaints a WebView2's composition surface whenever the view is
         * (re)attached to the tree — a pushed page presenting, a pop re-attaching
         * the page below, a pane re-host — painting a transient blank frame even
         * when the document inside is fully rendered. Push/pop navigation
         * therefore flickers STRUCTURALLY. Fix: redesigned screens are not pushed
         * at all. They load invisibly inside the HOST page's Grid (the round-1
         * staging) and are then simply made VISIBLE — attached once, shown once —
         * and on close they are removed + Disposed while the screen below was
         * never detached. HomePage registers itself as the host; when the host is
         * NOT the top of the native stack (a legacy page is pushed above it), the
         * machinery falls back to the round-1 load-then-PushAsync presentation.
         *
         * SECURITY (SECURITY.md §1 / DECISIONS #221): each overlay keeps its OWN
         * WebView, JS context and bridge — the native Grid hosts N isolated
         * WebViews; nothing is merged into a shared document, coordination stays
         * C#-only. This is the sanctioned #221 model, NOT the rejected #220
         * single-host-WebView. Legacy/native flows (wallet money pages, scan,
         * lock, mini-apps) keep their NavigationPage pushes — untouched. */

        private static SpixiContentPage? overlayHost = null;
        private static readonly List<PreloadOp> overlayStack = new List<PreloadOp>();

        // #230: a modal-mode op (the LOCK) that was SHOWN IN PLACE instead of pushed —
        // kept out of overlayStack on purpose (closeTopOverlay/back must never close a
        // lock; it closes ONLY via closeModalOverlay from the lock's own auth paths).
        private static PreloadOp? modalOverlayOp = null;

        // iOS-46 route (a) (#315): the ONE parked (closed-but-warm) overlay. Kept out
        // of overlayStack on purpose — a parked page is CLOSED for every consumer
        // (getOverlayPages, closeTopOverlay, back handling, exit sweeps); only
        // representParkedOverlay resurrects it. Single slot: only the narrow-mode
        // Account uses parking today, and one warm ~settings WebView is the costed
        // memory dial (iOS-46 (a): "hold one warm instance").
        private static PreloadOp? parkedOverlay = null;

        /* ————— #438 PRIVACY SHIELD ————————————————————————————————————————————
         * ★ THE DEFECT IT CLOSES. With the app lock ON, returning to Spixi painted the
         * FULL CHATS LIST for about a second before the lock appeared. It is not the
         * cold-start path (App.xaml.cs makes LockPage the NavigationPage root there) —
         * it is the RESUME path, and it is the COST of #229's load-then-present: the
         * lock's WebView is staged HIDDEN on the current page and the modal is pushed
         * only once lock.html signals ready, so for that whole window the page
         * underneath is what is on screen. #229 removed the lock's own boot flicker and
         * silently bought this with it.
         *
         * ⚠ DO NOT "fix" this by reverting to a plain modal push — that re-opens the
         * flicker and trades one defect for the other (#423). The shape that gets both
         * is a synchronous opaque cover: shield first, stage behind it, present.
         *
         * The colour is the lock's own ground (#13171b, fixed dark in BOTH themes per
         * N73/#203), so the cover reads as the lock arriving rather than as a glitch.
         *
         * INPUT: the shield is NOT input-transparent — it swallows taps for its whole
         * lifetime, which is a superset of the staging freeze pushModalLoaded already
         * applies.
         *
         * Z-ORDER: above the native call surface (Z_CALL_SURFACE) and below the lock's
         * own stage (Z_CALL_SURFACE * 2). A ring showing the caller's name and photo is
         * content too — #272 ruled the lock outranks the call surface, and the shield
         * inherits that ruling. */
        private const string PRIVACY_SHIELD_COLOR = "#13171b";
        private static readonly List<(Grid grid, ContentView view)> privacyShields = new List<(Grid, ContentView)>();

        // Generation guard. OnSleep arms the safety release and a delayed continuation
        // does not run while the app is backgrounded — so a long background can land its
        // callback JUST AFTER OnResume re-armed the shield and tear down the live one.
        // Every arm bumps the generation; a callback that does not match is stale.
        private static int privacyShieldGeneration = 0;
        // true when the shield was raised for a RESUME lock (a lock is expected to
        // present); false for the OnSleep cover, which is meant to sit for the whole
        // background and whose safety release is not a diagnosis.
        private static bool privacyShieldForeground = false;
        /* ★ #46 loop MINOR m5 on #507: how many times the drop below has PUT AN ENTRY BACK
         * and armed a fresh belt for it. A cover that refuses to leave the tree must be
         * retried, but the retry must not run for the life of the process — a Remove that
         * throws every time would log and re-arm every 8 s for ever. Reset when a new cover
         * is raised, so the budget is per cover cycle, not per process. */
        private static int privacyShieldPutBacks = 0;
        private const int PRIVACY_SHIELD_MAX_PUT_BACKS = 3;

        /** Cover every visible surface, synchronously. ADDITIVE — safe to call again. */
        public static void showPrivacyShield(bool expectingLock = false)
        {
            if (expectingLock) privacyShieldForeground = true;
            privacyShieldPutBacks = 0;   // ★ #46 loop MINOR m5 on #507: a new cover cycle
            try
            {
                /* ★ Audit MAJOR-3: this used to EARLY-RETURN once anything was shielded,
                 * so it never covered a surface created AFTER the first call. The real
                 * case: OnSleep shields, a call RINGS while the app is backgrounded and
                 * takes CallPage's modal fallback (which lands on the ModalStack, above
                 * the page-tree grids the shield lives in), and OnResume's lock branch
                 * then added nothing — the caller's nickname and photo were on screen on
                 * an unauthenticated device. It is additive now: re-scan every time and
                 * shield any grid that is not already covered. */
                NavigationPage? nav = Application.Current?.MainPage as NavigationPage;
                if (nav == null)
                {
                    armPrivacyShieldSafety();   // keep any live shield's belt fresh
                    return;
                }

                // Every resume shape, not just Chats: the page on top of the navigation
                // stack (an open conversation is an OVERLAY inside it, so its host grid
                // is the same grid), the registered overlay host, and — because the
                // ModalStack sits ABOVE the page tree and a page-grid cover can never
                // reach it — the top modal page as well.
                List<Page> targets = new List<Page>();
                Page? top = nav.Navigation.NavigationStack.LastOrDefault();
                if (top != null) targets.Add(top);
                SpixiContentPage? oh;
                lock (preloadLock) { oh = overlayHost; }
                if (oh != null && !targets.Contains(oh)) targets.Add(oh);
                foreach (Page m in nav.Navigation.ModalStack)
                {
                    if (!targets.Contains(m)) targets.Add(m);
                }

                foreach (Page page in targets)
                {
                    /* ★ break-my-verdict MAJOR-2: NEVER cover a lock. The ModalStack walk
                     * above reaches a modally-presented LockPage, whose Content is a Grid
                     * like any other — so the shield landed ON TOP of the password field
                     * and the user saw a blank screen with no way in. */
                    if (page is LockPage) continue;
                    Grid? grid = (page as ContentPage)?.Content as Grid;
                    if (grid == null) continue;
                    if (privacyShields.Exists(sh => sh.grid == grid)) continue;   // already covered
                    ContentView view = new ContentView
                    {
                        BackgroundColor = Color.FromArgb(PRIVACY_SHIELD_COLOR),
                        Opacity = 1,
                        InputTransparent = false,
                        CascadeInputTransparent = false,   // audit NIT-16: same contract as the lock stage
                        ZIndex = (CallPage.Z_CALL_SURFACE * 2) - 1,
                    };
                    if (grid.ColumnDefinitions.Count > 1) Grid.SetColumnSpan(view, grid.ColumnDefinitions.Count);
                    if (grid.RowDefinitions.Count > 1) Grid.SetRowSpan(view, grid.RowDefinitions.Count);
                    grid.Children.Add(view);
                    privacyShields.Add((grid, view));
                }

                armPrivacyShieldSafety();
            }
            catch (Exception ex)
            {
                Logging.error("showPrivacyShield failed: " + ex);
                try { hidePrivacyShield(); } catch { }
            }
        }

        /* Belt: a shield can never outlive a failed lock present and strand the app
         * behind an opaque view with no way in. onLockPresentFailed leaves the user
         * UNLOCKED, so failing closed here would be failing dead. */
        private static void armPrivacyShieldSafety()
        {
            int gen = ++privacyShieldGeneration;
            Task.Delay(8000).ContinueWith(_ =>
            {
                MainThread.BeginInvokeOnMainThread(() =>
                {
                    if (gen != privacyShieldGeneration)
                    {
                        return;   // stale arm — the live shield is not ours to drop
                    }
                    if (privacyShields.Count == 0)
                    {
                        return;
                    }
                    /* The OnSleep shield sits there for the whole background, so this
                     * fires on every ordinary app switch longer than 8 s. Only the
                     * FOREGROUND case means "the lock never presented" — say so honestly
                     * rather than logging a false diagnosis on the common path (audit
                     * MINOR-7: a log line that lies is worse than no log line). */
                    if (privacyShieldForeground)
                    {
                        Logging.warn("Privacy shield safety release — the lock never presented.");
                    }
                    hidePrivacyShield();
                });
            });
        }

        /** ★ #505: is anything covered right now? Read by App.sweepStrandedCover, the
         *  escape hatch for W-4.6 — an opaque, input-swallowing cover left over an
         *  UNLOCKED app is a black window with no way in, and it is exactly what this
         *  object looks like from the outside.
         *
         *  ★ #46 loop MINOR m2 on #507, CORRECTED IN ROUND 2. This walks the VIEW TREE for
         *  every entry the bookkeeping list holds. It used to return `privacyShields.Count
         *  > 0`.
         *
         *  ⚠ READ THE LIMIT, BECAUSE ROUND 1'S DOCBLOCK OVERCLAIMED. The walk can only see
         *  covers the LIST still knows about. `hidePrivacyShield` clears the list BEFORE the
         *  removal runs, so a cover that survives that removal is invisible here unless the
         *  drop puts its entry back. The drop does exactly that, and it now checks the TREE
         *  rather than trusting a thrown exception — see `hidePrivacyShield`. The two halves
         *  together are what make this method true; this half alone is not enough.
         *
         *  ⚠ The Clear() was deliberately NOT moved into the drop. `showPrivacyShield` skips
         *  any grid the list already reports as covered, so an entry that is still listed
         *  while the drop is queued to remove it would make a re-cover a no-op — the app
         *  would end up UNCOVERED at the moment it asked to be covered. Trading a diagnostic
         *  gap for a real exposure is the wrong direction.
         *
         *  ★ The reverse error is a defect too: a list entry whose view has already left the
         *  tree is not a cover, and reporting one made the hatch log a stranded-cover
         *  diagnosis that was false. The walk fixes that half outright. */
        public static bool hasPrivacyShield()
        {
            try
            {
                foreach ((Grid grid, ContentView view) in privacyShields)
                {
                    if (grid.Children.Contains(view))
                    {
                        return true;
                    }
                }
                return false;
            }
            catch (Exception ex)
            {
                /* A read must never throw into the escape hatch. Fall back to the old
                 * bookkeeping answer, which is the best information left. */
                Logging.warn("hasPrivacyShield: " + ex);
                return privacyShields.Count > 0;
            }
        }

        /** Uncover. Safe to call when nothing is covered. */
        public static void hidePrivacyShield()
        {
            privacyShieldGeneration++;   // invalidate any armed safety release
            privacyShieldForeground = false;
            if (privacyShields.Count == 0)
            {
                return;
            }
            List<(Grid grid, ContentView view)> shields = new List<(Grid, ContentView)>(privacyShields);
            privacyShields.Clear();
            /* Removing a child is a UI operation. Every caller today is already on the
             * main thread (the App lifecycle, onUnlock, and the two present paths, which
             * run inside BeginInvokeOnMainThread) — but a biometric callback is the kind
             * of thing that arrives on a platform thread, and a throw here would strand
             * the cover until the safety release. Marshal only when we have to: an
             * unconditional BeginInvoke defers to the next loop turn even when already on
             * the main thread, which could reorder a hide/show pair. */
            Action drop = () =>
            {
                bool putBack = false;
                foreach ((Grid grid, ContentView view) in shields)
                {
                    try { grid.Children.Remove(view); }
                    catch (Exception ex)
                    {
                        Logging.error("hidePrivacyShield: the cover removal threw: " + ex);
                    }
                    /* ★ #46 loop MINOR m2 on #507, ROUND 2: ASK THE TREE, DO NOT TRUST THE
                     * THROW. Round 1 put the entry back only when Remove threw. Remove can
                     * also return quietly and leave the child in place, and that case left
                     * the app covered while the escape hatch was told nothing covers it —
                     * the one state the hatch exists to repair, made invisible to it. */
                    bool stillThere;
                    try { stillThere = grid.Children.Contains(view); }
                    catch (Exception ex)
                    {
                        Logging.warn("hidePrivacyShield: the tree check threw: " + ex);
                        stillThere = true;   // fail toward "still covered": that is the reportable state
                    }
                    if (!stillThere)
                    {
                        continue;
                    }
                    if (!privacyShields.Exists(sh => sh.view == view))
                    {
                        privacyShields.Add((grid, view));
                    }
                    putBack = true;
                }
                /* ★ #46 loop MINOR m5 on #507: ARM A BELT FOR THE PUT-BACK. hidePrivacyShield
                 * bumped privacyShieldGeneration on entry, which killed the 8 s release that
                 * was watching this cover. Without a fresh arm the re-added entry sits in the
                 * list with nothing scheduled to try again. The budget bounds the retry: a
                 * Remove that fails for ever must not log and re-arm for ever. */
                if (!putBack)
                {
                    return;
                }
                if (privacyShieldPutBacks < PRIVACY_SHIELD_MAX_PUT_BACKS)
                {
                    privacyShieldPutBacks++;
                    Logging.error("hidePrivacyShield: the cover did not leave the tree. Retry "
                        + privacyShieldPutBacks + " of " + PRIVACY_SHIELD_MAX_PUT_BACKS + " armed.");
                    armPrivacyShieldSafety();
                }
                else
                {
                    Logging.error("hidePrivacyShield: the cover will not leave the tree and the retry budget is spent.");
                }
            };
            if (MainThread.IsMainThread) drop();
            else MainThread.BeginInvokeOnMainThread(drop);
        }

        /** The parked page (or null) — HomePage checks the type + mode before re-presenting. */
        public static SpixiContentPage? getParkedOverlay()
        {
            lock (preloadLock)
            {
                return parkedOverlay?.target;
            }
        }

        /** Dispose the parked overlay (mode mismatch / teardown paths). Safe when none. */
        public static void disposeParkedOverlay()
        {
            PreloadOp? op;
            lock (preloadLock)
            {
                op = parkedOverlay;
                parkedOverlay = null;
            }
            if (op == null)
            {
                return;
            }
            MainThread.BeginInvokeOnMainThread(() =>
            {
                try
                {
                    op.hostGrid.Children.Remove(op.stage);
                    op.stage.Content = null;
                    op.target.Content = op.targetContent;   // reattach for a clean Dispose
                    op.target.Dispose();
                }
                catch (Exception ex)
                {
                    Logging.warn("disposeParkedOverlay: " + ex);
                }
            });
        }

        /** iOS-46 (a) (#315): re-present the parked overlay in place — the warm-instance
         *  fast path (no construction, no WebView boot, no data re-flush). Fail-closed
         *  guards, in order:
         *    · #230: NEVER present anything while a lock is shown in place;
         *    · overlay mode must hold (host registered AND top of the native stack);
         *    · no other overlay may be open — the parked stage kept its old position
         *      in the host grid's children, so presenting it under a newer stage would
         *      layer it INVISIBLY (mobile Account taps always come from the bare home
         *      shell, so this guard is theoretical there — but it makes the fallback
         *      the fresh-construct path, never a broken present).
         *  Returns false when any guard fails; the caller then builds a fresh page
         *  (and should disposeParkedOverlay() first to avoid two live instances). */
        public static bool representParkedOverlay(SpixiContentPage target)
        {
            PreloadOp? op;
            lock (preloadLock)
            {
                op = parkedOverlay;
                if (op == null || op.target != target)
                {
                    return false;
                }
                if (modalOverlayOp != null)
                {
                    return false;   // #230 fail-closed: lock is up
                }
                bool overlayModeHolds = overlayHost != null
                    && (Application.Current?.MainPage as NavigationPage)?.Navigation.NavigationStack.LastOrDefault() == overlayHost
                    && op.host == overlayHost;
                if (!overlayModeHolds || overlayStack.Count > 0)
                {
                    return false;
                }
                parkedOverlay = null;
                /* ★ L8: a resurrected op is NOT closing any more. Left set, its next
                 * slide-in would permanently skip the TranslationX reset in its `finally`.
                 * Unreachable today (only the Account pane parks, and it never slides), but
                 * this row's own selling point is that a future surface opting into the
                 * slide gets the mirror for free — it must get the reset for free too. */
                op.closing = false;
                overlayStack.Add(op);
            }
            MainThread.BeginInvokeOnMainThread(() =>
            {
                try
                {
                    // #46 r1 MAJOR-1: the shell's single-fire exit latch (#199) was
                    // designed for a page that DIES on pop — a re-presented document
                    // still has `exiting = true` and would suppress every render AND
                    // every exit verb (a frozen Account with no back arrow left).
                    // The reopen push resets the latch + repaints; it lands in the
                    // WebView's queue BEFORE the stage becomes visible/interactive.
                    Utils.sendUiCommand(op.target, "onRepresented");
                    op.stage.InputTransparent = false;
                    op.stage.Opacity = 1;
                    try
                    {
                        op.host.onOverlayPresented(op.target);
                    }
                    catch (Exception ex)
                    {
                        Logging.warn("representParkedOverlay onOverlayPresented: " + ex);
                    }
                    // Mirror the overlay-present refresh (#225 present path): overlays
                    // never get OnAppearing, and this page skipped onLoad entirely.
                    try
                    {
                        UIHelpers.refreshAppRequests = true;
#if IOS
                        op.target.attachKeyboardInsetObserver();   // idempotent (#303)
#endif
                        op.target.updateScreen();
                    }
                    catch (Exception ex)
                    {
                        Logging.warn("representParkedOverlay updateScreen: " + ex);
                    }
                }
                catch (Exception ex)
                {
                    // Present failed structurally — tear the warm page down so the NEXT
                    // Account tap takes the fresh-construct path instead of wedging.
                    // #46 r1 NIT-1: full teardown convention (stage out of the grid,
                    // content reattached) — a bare Dispose leaked the stage child.
                    Logging.error("representParkedOverlay failed: " + ex);
                    lock (preloadLock)
                    {
                        overlayStack.RemoveAll(o => o == op);
                    }
                    try
                    {
                        op.hostGrid.Children.Remove(op.stage);
                        op.stage.Content = null;
                        op.target.Content = op.targetContent;
                    }
                    catch { }
                    try { op.target.Dispose(); } catch { }
                }
            });
            return true;
        }

        /** In-place present hook (#230): fired instead of OnAppearing when a modal-mode
         *  page is shown in place. Default no-op; LockPage arms biometrics off it. */
        public virtual void onPresentedInPlace()
        {
        }

        /** ★ N71 1.5: the LIVE lock page, or null. The lock is the visible surface
         *  whenever it is up, and it is fixed dark in both themes — so anything that
         *  paints from "the current surface" (the system bars) has to find it. The
         *  in-place case is the one that needs the modalOverlayOp lookup: such a lock is
         *  in no navigation collection at all. Read-only, never constructs.
         *
         *  ★★ #46 loop W-4.6 on #507: PUBLIC now, because `App.sweepStrandedCover` has to
         *  ask the lock a question — "did your WebView load?" — that no navigation
         *  collection can answer. The IN-PLACE case is the one the hatch needs most:
         *  Damir's failing session presented the app lock in place and it never loaded.
         *  ⚠ The lookup order puts the in-place op FIRST, which is right for a system-bar
         *  repaint and WRONG for "which lock is the user looking at" once two locks can
         *  stack. The hatch therefore checks the top of the ModalStack itself and falls
         *  back to this. */
        public static SpixiContentPage? liveLockPage()
        {
            try
            {
                lock (preloadLock)
                {
                    if (modalOverlayOp != null && modalOverlayOp.target is LockPage inPlace)
                    {
                        return inPlace;
                    }
                }
                INavigation? nav = Application.Current?.MainPage?.Navigation;
                if (nav == null)
                {
                    return null;
                }
                foreach (Page p in nav.ModalStack)
                {
                    if (p is LockPage modal)
                    {
                        return modal;
                    }
                }
                if (nav.NavigationStack.LastOrDefault() is LockPage top)
                {
                    return top;
                }
            }
            catch (Exception ex)
            {
                Logging.warn("liveLockPage: " + ex);
            }
            return null;
        }

        /** True while a lock is shown in place — hosts must swallow back-button
         *  presses (the lock page is not the CurrentPage, so its own
         *  OnBackButtonPressed guard never runs). */
        public static bool hasModalOverlay()
        {
            lock (preloadLock)
            {
                return modalOverlayOp != null;
            }
        }

        /** ★ Q4-③ re-review (#270 loop r2): TRUE while a LOCK is STAGING via
         *  pushModalLoaded — loaded invisibly, not presented yet (≤ timeout + 120ms).
         *  hasModalOverlay()/ModalStack/NavigationStack are all still BLIND in that
         *  window, so CallPage.lockUp() would have let a ring present: with a legacy
         *  page on top that ring takes the MODAL fallback, the lock is then pushed
         *  ABOVE it, and hideSurface (which may only ever pop the TOP modal) can no
         *  longer remove the call modal — a dead, back-swallowing page is left on the
         *  ModalStack under the lock and surfaces when the lock pops. Derived state
         *  only (activePreload is always cleared by presentPreload/cancelPreload), so
         *  this can never latch on and suppress the call UI. */
        public static bool isLockStaging()
        {
            lock (preloadLock)
            {
                PreloadOp? op = activePreload;
                if (op != null && op.modalMode && op.target is LockPage)
                {
                    return true;
                }
                /* ★★ #46 loop MAJOR-3 on #507 — the RESERVED turn, before the stage exists.
                 * See the lockPreloadPending field for the defect this closes. A negative age
                 * (the clock moved backwards) must not read as "just now" — the same guard
                 * ownIntentFresh() carries. */
                if (lockPreloadPending)
                {
                    double age = (DateTime.Now - lockPreloadPendingAt).TotalSeconds;
                    return age >= 0 && age <= LOCK_PRELOAD_PENDING_MAX_SECONDS;
                }
                return false;
            }
        }

        /** Close an in-place-presented modal (the lock, after auth). Returns false if
         *  this page was not presented that way — caller falls back to PopModalAsync. */
        public static bool closeModalOverlay(SpixiContentPage page)
        {
            PreloadOp? op;
            lock (preloadLock)
            {
                op = modalOverlayOp;
                if (op == null || op.target != page)
                {
                    return false;
                }
                modalOverlayOp = null;
            }
            MainThread.BeginInvokeOnMainThread(async () =>
            {
                try
                {
                    // #229b pattern: hide first (no-repaint property flip), let the
                    // frame commit, then detach + dispose the WebView.
                    op.stage.Opacity = 0;
                    op.stage.InputTransparent = true;
                    await Task.Delay(100);
                    op.hostGrid.Children.Remove(op.stage);
                    op.stage.Content = null;
                    op.target.Content = op.targetContent;
                    op.target.Dispose();
                }
                catch (Exception ex)
                {
                    Logging.error("Modal overlay close failed: " + ex);
                }
                /* ★ F-4 (#395/#399): give the strip back to the page that is visible again.
                 * #393 MAJOR-4 put this in closeOverlay and believed it covered the resume
                 * lock — it does not. The lock is a MODAL overlay and closes through THIS
                 * method (LockPage.performUnlock and the ixian:change confirm path), so
                 * unlocking in light mode kept the lock's fixed-dark strip with light icons
                 * over a light Home until the next real navigation. This is the site the
                 * behaviour runs through (#395: pin the path, not the fix's existence). */
                repaintSystemBars(visibleSurfacePage(op.host));
            });
            // Q4-③ review (MAJOR-1): a call surface is never presented while a lock is up
            // — re-assert the VoIP state now the lock is going away (ring/bar returns on
            // the next UI tick; no live call = no-op).
            UIHelpers.refreshAppRequests = true;
            return true;
        }

        public static void setOverlayHost(SpixiContentPage host)
        {
            List<PreloadOp> stale;
            PreloadOp? staleModal;
            lock (preloadLock)
            {
                stale = new List<PreloadOp>(overlayStack);
                overlayStack.Clear();
                overlayHost = host;
                // #230: a lock shown in place on the OLD host would be stranded
                // invisible with back swallowed forever — drop and dispose it, and
                // clear the app's lock latch so the NEXT resume re-locks (fail closed).
                // Practically unreachable: host recreation needs user interaction,
                // which the visible lock blocks.
                staleModal = modalOverlayOp;
                modalOverlayOp = null;
            }
            if (staleModal != null)
            {
                try { staleModal.target.Dispose(); } catch { }
                if (staleModal.target is LockPage)
                {
                    (Application.Current as App)?.onLockPresentFailed();
                }
            }
            // Q4-③ review (MINOR-7): the native call stage is parented to the OLD host's
            // grid — a re-created host would strand it (invisible, and `current` non-null
            // forever ⇒ no ring/bar for this call OR any later one until restart). Tear it
            // down and re-assert: a live call re-stages onto the new host on the next tick.
            try
            {
                CallPage.hideSurface();
                UIHelpers.refreshAppRequests = true;
            }
            catch (Exception ex)
            {
                Logging.warn("setOverlayHost (call surface): " + ex);
            }
            // A re-created host (HomePage singleton reset) orphans previous overlays —
            // tear their WebViews down defensively.
            foreach (PreloadOp op in stale)
            {
                try { op.target.Dispose(); } catch { }
            }
            // #315: a parked overlay is parented to the OLD host's grid — same orphan
            // class as the stale list above; tear it down with them.
            disposeParkedOverlay();
        }

        public static SpixiContentPage? getTopOverlay()
        {
            lock (preloadLock)
            {
                return overlayStack.Count > 0 ? overlayStack[overlayStack.Count - 1].target : null;
            }
        }

        /** Q4-③ (#270): the registered overlay host (HomePage) — the grid the
         *  native call surface stages into. Null until HomePage registers. */
        public static SpixiContentPage? getOverlayHost()
        {
            lock (preloadLock)
            {
                return overlayHost;
            }
        }

        // For Utils.getChatPage / reloadAllPages: overlay pages are live surfaces but
        // are not in the NavigationStack.
        public static List<SpixiContentPage> getOverlayPages()
        {
            lock (preloadLock)
            {
                List<SpixiContentPage> pages = new List<SpixiContentPage>();
                foreach (PreloadOp op in overlayStack)
                {
                    pages.Add(op.target);
                }
                return pages;
            }
        }

        /** W7 (Damir F5, Windows: Account → Change wallet password "hangs"): the stage
         *  INSET of the open overlay presenting `page` — Thickness.Zero when that page
         *  is not an open overlay (mobile takeover / push fallback), which is exactly
         *  the pre-W7 default.
         *
         *  A page opened FROM an overlay-hosted page passes this back as its own
         *  stageMargin (with column = -1) so it covers its OPENER EXACTLY. The #265 ②
         *  class this closes: a col-1 pin covers only the DETAIL region of the full-span
         *  Account pane, so the hub beside it stays visible AND live — every hub row
         *  still opens its sublevel, into a detail region hidden behind the new page.
         *  Nothing happens on screen, and the surface reads as frozen. Covering the
         *  opener makes the sublevel a real takeover: no live-but-blind surface left. */
        public static Thickness getOverlayStageMargin(SpixiContentPage page)
        {
            lock (preloadLock)
            {
                PreloadOp? op = overlayStack.Find(o => o.target == page);
                return op != null ? op.stageMargin : default;
            }
        }

        /* ★ SECURITY GATE (Opus review of #265, MAJOR-1; still load-bearing under Q4).
         * Call state must NEVER reach an UNTRUSTED WebView, and an untrusted WebView must
         * never be able to ACT on a call. MiniAppPage hosts third-party publisher code in
         * a SpixiContentPage — and it IS on the NavigationStack — so the old broadcast
         * would have handed it the caller's wallet address + the live VoIP session id,
         * which `onNavigatingGlobal` would then accept back as appAccept/appReject/hangUp
         * (i.e. a mini-app could answer or kill your calls).
         *
         * Q4-③ (#270) closed the OUTBOUND half structurally: there is no broadcast left at
         * all — call state is pushed to exactly ONE WebView, CallPage's own (see
         * CallPage.pushState). This flag now gates the INBOUND half: onAppAccept /
         * onAppReject / onNavigatingGlobal's hangUp all refuse a surface that returns
         * false. MiniAppPage overrides it to false; keep it that way. (The Q4 review
         * removed the now-dead getLivePages() enumerator this flag used to filter — the
         * gate itself must NOT be removed with it.) */
        public virtual bool acceptsCallPushes => true;

        /* Q4-③ (#270): the C18 per-WebView broadcast is GONE — Damir's F5 showed
         * its endpoint (N rings, N bars, roster-less identities). The three
         * broadcast entry points KEEP their names/callers (VoIPManager +
         * HomePage are untouched) but now present/dismiss the ONE native call
         * surface (CallPage). No shell receives any call push anymore — the
         * call-ui.js wirings were removed with this change (dead code). The
         * ★ #221 wall is intact: CallPage is its own WebView; the inbound
         * appAccept/appReject/hangUp verbs keep their acceptsCallPushes gates
         * (mini-apps still see nothing and can still act on nothing). */

        /** Assert the CURRENT VoIP state onto the native call surface —
         *  ring (incoming, unanswered) / bar (dialing, in-call) / dismissed.
         *  Idempotent; safe from any thread (CallPage marshals). */
        public static void broadcastCallState()
        {
            try
            {
                // Review MINOR-9: snapshot the VoIP state ONCE. endVoIPSession clears
                // currentCallContact on another thread, so re-reading it per branch could
                // NRE mid-teardown — and the catch below would then swallow it and leave a
                // STALE surface up. A torn-down (or half-torn-down) call = hide.
                byte[]? sid = VoIPManager.currentCallSessionId;
                Friend? contact = VoIPManager.currentCallContact;
                if (!VoIPManager.isInitiated() || sid == null || contact == null)
                {
                    CallPage.hideSurface();
                }
                else if (VoIPManager.currentCallAccepted)
                {
                    if (VoIPManager.currentCallCalleeAccepted)
                    {
                        CallPage.showBar(sid, SpixiLocalization._SL("global-call-in-call") + " - " + contact.nickname, VoIPManager.currentCallStartedTime);
                    }
                    else
                    {
                        CallPage.showBar(sid, SpixiLocalization._SL("global-call-dialing") + " " + contact.nickname + "...", 0);
                    }
                }
                else
                {
                    CallPage.showRing(contact, sid);
                }
            }
            catch (Exception e)
            {
                Logging.warn("broadcastCallState: " + e);
            }
        }

        /** Active-call / dialing bar → the native surface's top strip. */
        public static void broadcastCallBar(byte[] session_id, string text, long call_started_time)
        {
            try { CallPage.showBar(session_id, text, call_started_time); }
            catch (Exception e) { Logging.warn("broadcastCallBar: " + e); }
        }

        /** Call over (any path) → dismiss the native surface. */
        public static void broadcastHideCallBar()
        {
            try { CallPage.hideSurface(); }
            catch (Exception e) { Logging.warn("broadcastHideCallBar: " + e); }
        }

        /* ═══ ★★ L8 — A SLIDE-OUT IN FLIGHT SWALLOWS BACK ═════════════════════════════
         *
         * ⚠ THIS EXISTS BECAUSE THE FIRST CUT OF L8 MADE HARDWARE BACK EXIT THE APP.
         * `closeOverlay` removes the op from `overlayStack` synchronously, under the lock,
         * at the top — deliberately, so back handling and the same-tag sweep see it as
         * closed. Before L8 the stage went invisible on the next dispatcher turn, so that
         * window was about one frame. With the slide it is 220 ms of VISIBLE animation, and
         * a second back press in that window found an EMPTY stack, missed every shell route,
         * and fell through to `base.OnBackButtonPressed()` — which backgrounds the app while
         * the panel is still on screen.
         *
         * ⚠ The animation comment says the stage goes INPUT-DEAD first, and it does — but
         * `InputTransparent` governs TOUCH hit-testing on a VisualElement. The Android
         * hardware back button never consults the visual tree, so that guard does not travel
         * to the press this row put on the animated path. A counter does.
         *
         * Read by HomePage.OnBackButtonPressed BEFORE it can reach `base`. */
        private static int slideOutInFlight = 0;
        private static long slideOutStartedAt = 0;
        /* ⚠ THE BELT, and the break-my-verdict pass is why it is here. The counter alone is
         * a LATCH: if `TranslateTo` ever completes-never — the handler torn down mid-flight,
         * the animation ticker stopped because the app suspended inside the 220 ms — the
         * `finally` never runs and hardware back is dead for the rest of the session, with
         * no overlay on screen to explain it. This file already learned that lesson once:
         * `lockPreloadPending` is time-bounded for exactly the same hazard (:689). One
         * animation is 220 ms; a second is four hundred times too long to be real. */
        private const double SLIDE_OUT_MAX_SECONDS = 1;

        public static bool isOverlaySlidingOut()
        {
            if (System.Threading.Volatile.Read(ref slideOutInFlight) <= 0)
            {
                return false;
            }
            long started = System.Threading.Interlocked.Read(ref slideOutStartedAt);
            if (started <= 0)
            {
                return false;
            }
            double age = (Environment.TickCount64 - started) / 1000.0;
            return age >= 0 && age <= SLIDE_OUT_MAX_SECONDS;
        }

        /* Hardware/host back: close the top overlay if one is open. Returns true when handled.
         * ★★ L8 (#630 mirror): `slideOut` is passed by the HARDWARE BACK caller only. The
         * other caller resurfaces a buried Account pane by closing the overlays above it —
         * that is housekeeping, not a back gesture, and it must stay instant. */
        public static bool closeTopOverlay(bool slideOut = false)
        {
            PreloadOp? top;
            lock (preloadLock)
            {
                top = overlayStack.Count > 0 ? overlayStack[overlayStack.Count - 1] : null;
            }
            if (top == null)
            {
                return false;
            }
            closeOverlay(top, slideOut);
            return true;
        }

        private static void closeOverlay(PreloadOp op, bool slideOut = false)
        {
            SpixiContentPage? host;
            PreloadOp? evicted = null;
            bool parked = false;
            lock (preloadLock)
            {
                // Reviewer MINOR-4: two racing closers (closeTopOverlay reads the top
                // outside the lock) must not double-run the teardown + host hook.
                if (!overlayStack.Remove(op))
                {
                    return;
                }
                // ★ L8: a back press within 220 ms of OPENING aborts the slide-in, whose
                // `finally` would then post TranslationX = 0 into the middle of the
                // slide-out and snap the panel back for a frame. The flag suppresses it.
                op.closing = true;
                host = overlayHost;
                // #46 r2 MINOR-1: only a BOOTED shell is worth keeping warm — a page
                // that presented via the 4s timeout with its WebView wedged
                // (pageLoaded false, the removePage never-booted branch) must take
                // the dispose path so the next tap constructs fresh (the pre-#315
                // self-heal); parking it would re-present the same dead page forever.
                if (op.parkOnClose && op.target.pageLoaded)
                {
                    // iOS-46 route (a) (#315): PARK — the stage stays in the host grid
                    // (hidden below), the page and its WebView stay alive and warm.
                    // #46 r1 MINOR-1: the slot is claimed in the SAME lock section
                    // that removes the op from the stack — an ixian:settings landing
                    // inside the hide window finds the parked op and re-presents it
                    // (net effect: the page simply stays open) instead of racing a
                    // duplicate SettingsPage into existence. Single slot: a different
                    // already-parked op (unreachable today — only Account parks) is
                    // evicted + disposed on the main thread below.
                    if (parkedOverlay != null && parkedOverlay != op)
                    {
                        evicted = parkedOverlay;
                    }
                    parkedOverlay = op;
                    parked = true;
                }
            }
            MainThread.BeginInvokeOnMainThread(async () =>
            {
                if (evicted != null)
                {
                    try
                    {
                        evicted.hostGrid.Children.Remove(evicted.stage);
                        evicted.stage.Content = null;
                        evicted.target.Content = evicted.targetContent;
                        evicted.target.Dispose();
                    }
                    catch (Exception ex)
                    {
                        Logging.warn("park eviction: " + ex);
                    }
                }
                try
                {
                    // #46 r2: branch on the CLAIM decision (parked), not the flag —
                    // a parkOnClose op that failed the pageLoaded gate must take the
                    // dispose path below, never fall into a hide-only limbo.
                    if (parked)
                    {
                        // #46 r1 MINOR-1: hide ONLY while still parked — a re-present
                        // that already reclaimed the op (tap-Account-inside-the-window
                        // race) must not have its page hidden out from under it.
                        bool stillParked;
                        lock (preloadLock)
                        {
                            stillParked = parkedOverlay == op;
                        }
                        if (stillParked)
                        {
                            op.stage.Opacity = 0;
                            op.stage.InputTransparent = true;
                            /* ★★ L8 — THE PARKED BRANCH MUST RESET THE TRANSLATION TOO, and a
                             * smoke pin caught that my own fix had broken this. A parked op
                             * REUSES its stage on the next present, so a stuck translation
                             * comes back displaced. The slide-IN's `finally` used to be the
                             * only reset; it now skips a CLOSING stage (so it cannot snap one
                             * back mid-exit), which moved the guarantee onto the exit paths.
                             * The dispose branch below already resets. This is the other one. */
                            op.stage.TranslationX = 0;
                        }
                    }
                    else
                    {
                        // #326 (iOS-56 polish, Damir pick): a BACK-initiated close on iOS
                        // SLIDES the stage right (~250ms CubicOut) before the teardown —
                        // the WebView beneath is live (#225 architecture), so this is a
                        // true previous-screen reveal, the native-pop look. iOS-only:
                        // WinUI keeps the #229b instant flip (flash class), Android keeps
                        // its native transitions; non-back closes (close-audits, tab
                        // switches, removePage) pass slideOut=false and stay instant.
                        // #328 loop fixes: (1) the stage goes INPUT-DEAD before the first
                        // animation frame — the op left overlayStack synchronously, so a
                        // second back-tap during the slide would fall through popPageAsync
                        // onto the native stack (the #272 pop-the-top class, audit MAJOR),
                        // and any button in the closing page could still fire verbs on a
                        // page mid-teardown; (2) COLUMN-PINNED stages (wide/iPad split,
                        // op.column >= 0) never slide — phone pop-grammar across a split
                        // layout dragged the pane over its neighbour (audit MINOR).
                        /* ═══ ★★ L8 (#641 batch) — THE SLIDE-OUT IS THE MIRROR OF THE SLIDE-IN ═══
                         *
                         * Damir, 2026-08-29: *"I like the slide in effect it's great makes it
                         * smoother, we just need a slide out, when closing the chat info on
                         * Android."*
                         *
                         * The rule is now: AN OP THAT SLID IN, SLIDES OUT — on every platform,
                         * `op.slideIn` being the same per-op flag `presentPreload` read. Chat
                         * info is the only caller that sets it today (#630), so nothing else
                         * changes behaviour, and a future surface that opts into the slide-in
                         * gets its mirror for free instead of needing a second decision.
                         * iOS keeps #326 as well: EVERY back-initiated close slides there,
                         * which is the native pop look and is not tied to the slide-in.
                         *
                         * ⚠ The overlay already left `overlayStack` at the TOP of this method,
                         * under the lock — so back handling, the same-tag sweep and
                         * closeTopOverlay all see it as closed for the whole 250 ms. That is
                         * the same rule that made the slide-IN fire-and-forget.
                         * ⚠ COLUMN-PINNED stages (wide/iPad split, op.column >= 0) never
                         * slide — phone pop-grammar across a split layout drags the pane over
                         * its neighbour (#328 audit MINOR).
                         * ⚠ The stage goes INPUT-DEAD before the first animation frame, so a
                         * second back-press during the slide cannot fall through onto the
                         * native stack (#272 pop-the-top class). */
                        bool isIos = Microsoft.Maui.Devices.DeviceInfo.Platform == Microsoft.Maui.Devices.DevicePlatform.iOS;
                        /* ⚠ TWO CORRECTIONS THE AUDIT FORCED, both about the word "mirror".
                         * ① NO COLUMN GUARD ON THE MIRROR. `slideStageIn` has never had one,
                         *    and chat info is pushed with column 1 AND slideIn true — so on a
                         *    wide window the panel slid IN and flipped OUT, which is exactly
                         *    the entry/exit drift this row exists to remove. #328's column
                         *    guard stays on the #326 path, where it was written.
                         * ② WINUI IS IN — Damir closed the dial, 2026-08-29. The earlier cut
                         *    held it back on the #229b WebView2 repaint hazard, but the
                         *    review pointed out that argument was already breached by the
                         *    entry half: `slideStageIn` has NEVER been platform-gated, so
                         *    Windows was already transforming that WebView on the way in.
                         *    Holding only the exit back bought no safety and guaranteed the
                         *    asymmetry this row exists to remove. */
                        bool mirrorSlide = op.slideIn;
                        bool legacyIosSlide = isIos && !op.slideIn && op.column < 0;
                        if (slideOut && (mirrorSlide || legacyIosSlide))
                        {
                            System.Threading.Interlocked.Exchange(ref slideOutStartedAt, Environment.TickCount64);
                            System.Threading.Interlocked.Increment(ref slideOutInFlight);
                            try
                            {
                                op.stage.InputTransparent = true;
                                double w = op.stage.Width > 0
                                    ? op.stage.Width
                                    : (op.host.Width > 0 ? op.host.Width : 500);
                                /* ⚠ TWO timings, deliberately, and this is not drift.
                                 * A slide-IN op gets the EXACT MIRROR of `slideStageIn`
                                 * (220 ms, and CubicIn because the mirror of a decelerating
                                 * entry is an accelerating exit). Everything else on iOS keeps
                                 * #326 BYTE-FOR-BYTE (250 ms CubicOut) — that was Damir's own
                                 * pick for the native pop look, it ships today, and this row
                                 * has no mandate to re-time it. */
                                if (op.slideIn)
                                {
                                    await op.stage.TranslateTo(w, 0, 220, Easing.CubicIn);
                                }
                                else
                                {
                                    await op.stage.TranslateTo(w, 0, 250, Easing.CubicOut);
                                }
                            }
                            catch { }
                            finally
                            {
                                System.Threading.Interlocked.Decrement(ref slideOutInFlight);
                            }
                        }
                        // #229b (Damir F5: chat-info → conversation flashed): HIDE first —
                        // an Opacity flip is the #225-proven no-repaint operation — let the
                        // frame commit, and only THEN detach + dispose. Removing/tearing
                        // down a WebView2's composition surface in the same frame it is
                        // still visible briefly flashes the reveal on WinUI.
                        op.stage.Opacity = 0;
                        op.stage.InputTransparent = true;
                        await Task.Delay(100);
                        op.hostGrid.Children.Remove(op.stage);
                        op.stage.TranslationX = 0;   // #326 belt: never hand a translated stage to any reuse path
                        op.stage.Content = null;
                        op.target.Content = op.targetContent;   // reattach for a clean Dispose
                        op.target.Dispose();                    // tear the WebView down
                    }
                }
                catch (Exception ex)
                {
                    Logging.error("Overlay close failed: " + ex);
                }
                // ★ N73 review MAJOR-4: the overlay took the strip with it — give it back
                // to the page that is visible again, BEFORE the host's own close hook runs
                // (that hook may navigate, and a navigation repaints on its own anyway).
                repaintSystemBars(visibleSurfacePage(host));
                try
                {
                    host?.onOverlayClosed(op.target);
                }
                catch (Exception ex)
                {
                    Logging.error("onOverlayClosed failed: " + ex);
                }
            });
        }

        /* ★ N73 review MAJOR-4: repaint the Android system-bar strip for a page that is
         * becoming visible again WITHOUT a navigation. applyPlatformPageChrome covers a
         * page that loads, OnAppearing covers a page that is re-attached — an overlay
         * (chat info, Account) and an in-place LOCK are neither: the host was never
         * detached, so nothing fires when they go away. The resume lock is the sharp case,
         * because it paints the strip its own fixed dark and light icons: without this,
         * unlocking in light mode left a dark strip with light icons over a light Home
         * until the next real page navigation. No-op on every other platform. */
        /* ★ F-4: which page owns the strip once the thing on top of it goes away? An
         * overlay may still be open UNDER a closing lock (Account, chat info, the form
         * pane), and it — not the host — is what the user sees. Fall back to the caller's
         * page when the stack is empty. Cheap, and it removes the same approximation from
         * the overlay close path, where a second open overlay had the identical problem. */
        private static SpixiContentPage? visibleSurfacePage(SpixiContentPage? fallback)
        {
            try
            {
                /* ★ N71 1.5 (Damir F5 2026-08-19): A LOCK OUTRANKS EVERYTHING.
                 *
                 * A lock shown IN PLACE (#230) is in no collection this method used to
                 * consult — not overlayStack, not the NavigationStack — so the bars were
                 * painted from whatever sits UNDER it, and flipping the OS theme with the
                 * lock up recoloured the status and navigation bars against a screen that
                 * is fixed dark in both themes.
                 *
                 * The blindness is not new; the SYMPTOM is. reloadAllPages used to reload
                 * every page in turn, and each reload ran its own chrome pass, so the lock
                 * happened to repaint last and accidentally corrected the answer. #421
                 * replaced that sweep with a push, which is right — but it also removed a
                 * piece of last-wins luck the bars had been relying on.
                 *
                 * Same three tests CallPage.lockUp() uses, in the same order and for the
                 * same reason: in-place first (the case that has no page to find), then
                 * the modal stack, then the top of the navigation stack. Cheap, and it
                 * fails safe — if no lock is up, nothing below changes. */
                SpixiContentPage? lockPage = liveLockPage();
                if (lockPage != null)
                {
                    return lockPage;
                }
                lock (preloadLock)
                {
                    if (overlayStack.Count > 0)
                    {
                        return overlayStack[overlayStack.Count - 1].target;
                    }
                }
                /* ★ F-4 (audit r2): with no overlay open and no caller page, the surface
                 * that becomes visible is the root navigation's CURRENT page. Reached when a
                 * modal-fallback lock was staged over a plain PUSHED page with no overlay
                 * open — the legacy money flow, scan, backup. (With the Account pane open
                 * the branch above already answers with that overlay, which is what the
                 * user sees.) Popping a modal is not a navigation, so without this
                 * repaintSystemBarsFor(null) resolved to null and repainted nothing. */
                if (fallback == null)
                {
                    return (Application.Current?.MainPage as NavigationPage)?.CurrentPage as SpixiContentPage;
                }
            }
            catch (Exception ex)
            {
                Logging.warn("visibleSurfacePage: " + ex);
            }
            return fallback;
        }

        /** ★ F-4: the ONE entry point for a page that becomes visible with no navigation
         *  and no overlay teardown behind it — today the COLD-START lock, which unlocks by
         *  rewriting the navigation stack (InsertPageBefore + removePage in LockPage.performUnlock)
         *  rather than by navigating or by closing an overlay. Same defect as the resume
         *  lock, second site. */
        /** ★ AND-7b (#407): repaint the bar for THIS page's own current surface. The home
         *  shell calls it on every tab change, because the surface under the status bar
         *  changes with the tab and nothing navigates. */
        protected void repaintOwnSystemBars()
        {
            repaintSystemBars(this);
        }

        public static void repaintSystemBarsFor(SpixiContentPage? page)
        {
            repaintSystemBars(visibleSurfacePage(page));
        }

        private static void repaintSystemBars(SpixiContentPage? page)
        {
#if ANDROID
            try
            {
                if (page != null)
                {
                    string bottom = page.liveSurfaceColorString();
                    string top = page.systemBarSurfaceColorString();
                    /* ★ F2 INSTRUMENTATION (log only): every repaint that DOES happen, with
                     * the page that asked and the two colours it resolved. Paired with the
                     * `bars/skip` line in App.lockOnPause this says, for one background,
                     * whether the pause-presented lock ever repaints the bars — and if it
                     * does, whether it asks for the wrong colour instead of not asking. */
                    SPIXI.Meta.SLockDiag.barsRepainted(page.GetType().Name, bottom, top);
                    SPlatformUtils.setEdgeToEdge(bottom, top);   // ★ AND-7d/e: bottom, top — BOTH live
                }
                else
                {
                    // ★ F2: resolved to nothing — nothing was repainted, and the bars keep
                    // whatever the previous screen asked for.
                    SPIXI.Meta.SLockDiag.barsNotRepainted("repaintSystemBars: visibleSurfacePage resolved null");
                }
            }
            catch (Exception ex)
            {
                Logging.warn("repaintSystemBars: " + ex);
            }
#endif
        }

        // Host hook: fired on the overlay HOST (HomePage) after an overlay closed —
        // the host was never detached, so OnAppearing does not fire; per-close
        // refreshes (Account exit, rating prompt) live here instead.
        public virtual void onOverlayClosed(SpixiContentPage overlay)
        {
        }

        // Host hook (unit 6, #247): fired on the overlay HOST in the same main-thread
        // frame an overlay-mode page is made VISIBLE. Presentation-only — HomePage
        // pins the chat-info pane to its column + expands the column here, so the
        // pane appears fully painted in one frame (no empty strip while it loads).
        public virtual void onOverlayPresented(SpixiContentPage overlay)
        {
        }

        // Unit 6 (#247): re-home a PRESENTED overlay stage. Presentation-only property
        // flips (attached props + margin) — nothing re-attaches, nothing repaints blank.
        // column >= 0 pins to that grid column (margin cleared); column < 0 = full-span
        // zero-margin takeover. Mutates op.column (this IS the op's placement from now
        // on — relayoutPinnedOverlays returns it here after a resize round-trip).
        // MAIN THREAD ONLY (called from onOverlayPresented / host size handlers).
        public static void rehomeOverlay(SpixiContentPage target, int column)
        {
            PreloadOp? op;
            lock (preloadLock)
            {
                op = overlayStack.Find(o => o.target == target);
            }
            if (op == null)
            {
                return;
            }
            try
            {
                op.stage.Margin = new Thickness(0);
                // #340 audit (B-MINOR-1): stageMargin is the op's MEMORY of the inset its
                // stage carries (a sublevel inherits it to cover its opener exactly — W7).
                // Rehoming rewrites the real margin, so the memory has to move with it.
                // FORWARD GUARD, not a live bug (r2 reviewer): the only pages given a
                // non-default stageMargin today are the Account pane and its encpass
                // sublevel, and rehomeOverlay's only callers pass ContactDetails, whose
                // margin is already default — so the sets are disjoint and this is a no-op
                // on every current path. It stops being a no-op the moment a rehomed
                // overlay opens a sublevel, and the failure then is the W7 one: a live
                // uncovered strip of the opener beside a sublevel that thinks it covers it.
                op.stageMargin = new Thickness(0);
                if (column >= 0 && op.hostGrid.ColumnDefinitions.Count > column)
                {
                    Grid.SetColumnSpan(op.stage, 1);
                    Grid.SetColumn(op.stage, column);
                }
                else
                {
                    Grid.SetColumn(op.stage, 0);
                    Grid.SetColumnSpan(op.stage, Math.Max(1, op.hostGrid.ColumnDefinitions.Count));
                    column = -1;
                }
                op.column = column;
            }
            catch (Exception ex)
            {
                Logging.warn("rehomeOverlay: " + ex);
            }
        }

        // #225-M2 (unit 6 batch): resizing across the pane breakpoint used to strand a
        // column-pinned overlay (chat col 1, info col 2) invisible-but-open in a
        // zero-width column. Re-home every pinned stage on each breakpoint crossing:
        // narrow → col 0 + full column-span (the mobile takeover presentation);
        // wide → back to its pinned column. Includes a still-STAGING overlay-mode op
        // (resize mid-load), so the present can never land in a collapsed column.
        // Does NOT mutate op.column — that is the memory of where to return.
        // Full-span ops (column < 0, incl. the margin-inset Account pane) are untouched.
        public static void relayoutPinnedOverlays(bool wide)
        {
            List<PreloadOp> ops;
            lock (preloadLock)
            {
                ops = new List<PreloadOp>(overlayStack);
                if (activePreload != null && activePreload.overlayMode)
                {
                    ops.Add(activePreload);
                }
            }
            foreach (PreloadOp op in ops)
            {
                if (op.column < 0)
                {
                    continue;
                }
                try
                {
                    if (wide && op.hostGrid.ColumnDefinitions.Count > op.column)
                    {
                        Grid.SetColumnSpan(op.stage, 1);
                        Grid.SetColumn(op.stage, op.column);
                    }
                    else
                    {
                        Grid.SetColumn(op.stage, 0);
                        Grid.SetColumnSpan(op.stage, Math.Max(1, op.hostGrid.ColumnDefinitions.Count));
                    }
                }
                catch (Exception ex)
                {
                    Logging.warn("relayoutPinnedOverlays: " + ex);
                }
            }
        }

        // Native pushes (legacy wallet/scan/mini-app pages, modals) issued FROM an
        // overlay page must ride the ROOT NavigationPage — an overlay page is not in
        // the navigation tree, so its own Navigation proxy is detached.
        protected INavigation hostNav
        {
            get
            {
                return (Application.Current?.MainPage as NavigationPage)?.Navigation ?? Navigation;
            }
        }

        // Pages whose content pops in AFTER ixian:onload (the conversation loads its
        // messages on a background task and reveals with a FadeTo) set this true in
        // their ctor and call signalPreloadReady() themselves at their reveal point.
        protected bool deferPreloadReady = false;

        // Set just before a preloaded page is presented; pages that re-render in
        // OnAppearing (the conversation's reloadScreen) consume it to skip the
        // redundant first re-render — the staged load already did that work.
        protected bool presentedFromPreload = false;

        // Live message routing (Utils.getChatPage) must also see a conversation that is
        // currently STAGING off-screen — its WebView is live and accepts UI pushes — so
        // messages arriving during the load-then-move window aren't dropped (audit m2).
        public static SpixiContentPage? getStagingPage()
        {
            lock (preloadLock)
            {
                return activePreload?.target;
            }
        }

        /// <summary>
        /// Called on the main thread the moment a staged page becomes visible. Empty by
        /// default; pages override it to time their own present (the [CDPERF] probe).
        /// </summary>
        protected internal virtual void onPreloadPresented() { }

        protected void signalPreloadReady()
        {
            PreloadOp? op;
            lock (preloadLock)
            {
                op = activePreload;
            }
            if (op != null && op.target == this)
            {
                presentPreload(op, "ready");
            }
        }

        // Open a redesigned screen without flicker. Overlay mode (host = HomePage at
        // the top of the native stack): the page loads invisibly and is then SHOWN in
        // place — no push, no re-parent. Fallback (no host / a legacy page pushed
        // above the host): round-1 load-then-PushAsync. tag = replace-group (opening
        // a "chat" overlay closes the previous one AFTER the new one is visible —
        // seamless conversation switching); column pins the overlay to a grid column
        // (desktop: 1 = the detail pane; -1 = full span).
        // stageMargin (#245): insets the overlay stage inside the host grid — the
        // Account peer-pane leaves the home rail strip (leading 72dip) visible and
        // interactive. Presentation-only; zero margin = exact previous behavior.
        // parkOnClose (#315, iOS-46 route (a)): close hides + keeps the overlay warm
        // instead of disposing it (see PreloadOp.parkOnClose). Only HomePage's
        // narrow-mode Account push sets it.
        /* ★ Batch C (#546) C3: pre-create an overlay page into the PARKED slot without
         * presenting it. Fail-closed guards (all return false = nothing warmed, the tap
         * path stays the fresh-construct one): a lock up · a preload in flight · a
         * parked page already there · overlay mode not holding · no host grid. The
         * caller decides WHEN (HomePage: after the chats list first paints). */
        public bool warmParkedOverlay(SpixiContentPage target, int timeoutMs = 6000)
        {
            lock (preloadLock)
            {
                if (modalOverlayOp != null || preloadPending || activePreload != null || parkedOverlay != null)
                {
                    try { target.Dispose(); } catch { }
                    return false;
                }
                SpixiContentPage? oh = overlayHost;
                bool overlayModeHolds = oh != null && oh == this
                    && (Application.Current?.MainPage as NavigationPage)?.Navigation.NavigationStack.LastOrDefault() == oh;
                if (!overlayModeHolds || overlayStack.Count > 0)
                {
                    try { target.Dispose(); } catch { }
                    return false;
                }
            }
            lock (preloadLock) { warmPending = true; warmClaimRequested = false; }
            pushPageLoaded(target, timeoutMs, "settings", -1, null, default, true, true);
            return true;
        }
        private static bool warmPending = false;   // the warm push is between the tap and staging

        /* ★ C3 (#546, loop r1): an Account TAP while the warm page is still STAGING must
         * not be silently dropped (pushPageLoaded drops a new target while a preload is
         * active). If the in-flight preload IS the warm-parked page of this type, flip it
         * to PRESENT-on-load — the tap's answer arrives when the load finishes, which is
         * sooner than a fresh construct. True = the caller is done (a present is coming).
         * The flip happens under the preload lock, before presentPreload's park branch
         * reads parkOnLoad; if the park already happened, this returns false and the
         * caller's representParkedOverlay path presents the parked page instantly. */
        private static bool warmClaimRequested = false;   // loop r1 MINOR-4: a claim inside the preloadPending window
        public static bool claimWarmingOverlay<T>() where T : SpixiContentPage
        {
            lock (preloadLock)
            {
                if (activePreload != null && activePreload.parkOnLoad && activePreload.target is T)
                {
                    activePreload.parkOnLoad = false;
                    return true;
                }
                // loop r1 MINOR-4: warmParkedOverlay sets preloadPending one dispatcher turn
                // before activePreload exists — a tap in that window claims by FLAG; the
                // staging turn consumes it (below) and the op presents on load.
                if (preloadPending && warmPending)
                {
                    warmClaimRequested = true;
                    return true;
                }
            }
            return false;
        }

        /// <summary>
        /// ★★ V-19 / V-7 (#46 loop 2026-08-29) — A USER NAVIGATION WINS.
        ///
        /// This method used to DROP the target whenever anything was already staging,
        /// silently: the shell had already sent its verb, got no answer, no error and no
        /// result push, so it could not even fall back. ONE silent drop explained three
        /// separate reports — the lost deep link (row C8), "click through the chats list
        /// too fast and it does not register", and "sometimes the first click does not
        /// open the chat". The last one is the worst, because the FIRST click after a
        /// cold start lands inside the Account warm-park's 6000 ms budget.
        ///
        /// Damir's ruling, 2026-08-29: a user click ALWAYS wins a staging page. So:
        ///   · a BACKGROUND warm park (parkOnLoad) never competes — it yields, always;
        ///   · the SAME navigation arriving twice is deduped, not restarted, so hammering
        ///     one row cannot keep cancelling its own load and make it slower;
        ///   · anything else CANCELS what is staging and takes the slot.
        /// The only remaining silent drop is a lock shown in place, which is deliberate
        /// (#230) and where the user cannot act anyway.
        ///
        /// `navKey` identifies the navigation for the dedupe. Two nulls never match — a
        /// caller that does not name its navigation gets the supersede path, never a
        /// wrong dedupe.
        /// `supersedeRetries` covers the one-dispatcher-turn window in which the slot is
        /// RESERVED (`preloadPending`) but no op exists yet to cancel: there is nothing to
        /// supersede, so the call re-enters on the next turn instead of being discarded.
        /// The staging turn always clears `preloadPending`, so the window cannot outlive
        /// a turn and the retries cannot loop.
        /// </summary>
        public void pushPageLoaded(SpixiContentPage target, int timeoutMs = 4000, string? tag = null, int column = -1, SpixiContentPage? replaces = null, Thickness stageMargin = default, bool parkOnClose = false, bool parkOnLoad = false, string? navKey = null, int revealDelayMs = 120, bool slideIn = false, int supersedeRetries = 2)
        {
            PreloadOp? superseded = null;
            lock (preloadLock)
            {
                // #230 SECURITY (Opus review): never stage/present an overlay while a
                // lock is SHOWN IN PLACE. The lock stage was added LAST to the host grid
                // (topmost); a new overlay stage would be added on top of it, covering the
                // lock and exposing the content behind it. User input is already frozen by
                // the opaque lock stage, so this only guards PROGRAMMATIC navigation — the
                // real vector is a push-notification-driven onChat (App.startingScreen →
                // HomePage.onChat → pushPageLoaded) racing the resume-lock. Fail closed:
                // drop the target (the caller re-navigates after unlock; the deep-link is
                // intentionally lost rather than shown under the lock).
                if (modalOverlayOp != null)
                {
                    warmPending = false; warmClaimRequested = false;   // loop r2 R2-4: no stuck warm flags
                    try { target.Dispose(); } catch { }
                    return;
                }
                if (preloadPending || activePreload != null)
                {
                    if (parkOnLoad)
                    {
                        // The background warm park always yields. It exists to make a
                        // LATER tap fast; competing with a live one would be the whole
                        // defect in reverse.
                        warmPending = false; warmClaimRequested = false;
                        try { target.Dispose(); } catch { }
                        return;
                    }
                    if (activePreload != null)
                    {
                        if (navKey != null && activePreload.navKey == navKey)
                        {
                            // The SAME navigation is already staging. Answer it by letting
                            // it finish — cancelling and re-staging would restart the load
                            // and make an impatient second tap SLOWER than one tap.
                            try { target.Dispose(); } catch { }
                            return;
                        }
                        // A different, user-initiated navigation. Take the slot.
                        // ⚠ If the staged page has ALREADY claimed its present, tryFinish
                        // inside cancelPreload returns false and it presents anyway; the
                        // new page then stages and, sharing the tag, replaces it. A brief
                        // wrong screen beats a navigation that never happened.
                        superseded = activePreload;
                        activePreload = null;
                        warmPending = false; warmClaimRequested = false;
                    }
                    else
                    {
                        // The reservation window: the slot is taken but no op exists yet,
                        // so there is nothing to cancel. Re-enter on the next dispatcher
                        // turn, by which time the staging block has run.
                        if (supersedeRetries > 0)
                        {
                            MainThread.BeginInvokeOnMainThread(() =>
                                pushPageLoaded(target, timeoutMs, tag, column, replaces, stageMargin, parkOnClose, parkOnLoad, navKey, revealDelayMs, slideIn, supersedeRetries - 1));
                            return;
                        }
                        Logging.warn("pushPageLoaded: the staging slot never freed; dropping " + target.GetType().Name);
                        try { target.Dispose(); } catch { }
                        return;
                    }
                }
                preloadPending = true;
            }
            if (superseded != null)
            {
                // Queued BEFORE the staging block below, so the outgoing stage is gone
                // from the host grid before the new one is added.
                cancelPreload(superseded);
            }

            MainThread.BeginInvokeOnMainThread(() =>
            {
                // OVERLAY mode when a host is registered AND nothing legacy is pushed
                // above it (else the overlay would render beneath the pushed page) —
                // otherwise fall back to round-1 load-then-PushAsync from this page.
                SpixiContentPage? oh;
                lock (preloadLock) { oh = overlayHost; }
                bool overlayMode = oh != null
                    && (Application.Current?.MainPage as NavigationPage)?.Navigation.NavigationStack.LastOrDefault() == oh;
                SpixiContentPage hostPage = overlayMode ? oh! : this;

                Grid? hostGrid = hostPage.Content as Grid;
                View? targetContent = target.Content;

                if (hostGrid == null || targetContent == null)
                {
                    // Nowhere to stage — plain push (pre-fix behaviour).
                    lock (preloadLock) { preloadPending = false; warmPending = false; warmClaimRequested = false; }   // r2 R2-4
                    presentPlain(target);
                    return;
                }

                ContentView stage = new ContentView
                {
                    Opacity = 0,
                    InputTransparent = true,
                    CascadeInputTransparent = true,
                    Margin = stageMargin,   // #245: zero by default; peer-pane rail inset
                    // #248 (Damir F5: dark slivers on light mode while dragging the
                    // divider): WebView2 composition surfaces LAG a resize — paint the
                    // stage with the page's own themed surface so any exposed strip
                    // matches the shell instead of whatever sits behind the stage.
                    BackgroundColor = target.pageSurfaceColor,
                };

                // Q1 review (#266/#267 loop, ① formpane): a CHAINED push INHERITS the slot of
                // the overlay it replaces when the caller left the defaults. AppNewPage /
                // AppDetailsPage cannot see the host's column state, so their replaces: pushes
                // fell back to column = -1 (full span) — picking a file/URL in the col-1
                // add-app pane blew the details screen up into a full-window takeover, exactly
                // the quirk ① was meant to kill. Presentation-only; a non-overlay caller (no
                // matching op in the stack) keeps the -1 default.
                if (replaces != null && tag == null && column < 0)
                {
                    PreloadOp? prev;
                    lock (preloadLock) { prev = overlayStack.Find(o => o.target == replaces); }
                    if (prev != null)
                    {
                        tag = prev.tag;
                        column = prev.column;
                    }
                }

                PreloadOp op = new PreloadOp(hostPage, target, stage, targetContent, hostGrid);
                op.overlayMode = overlayMode;
                op.tag = tag;
                op.column = column;
                op.replaces = replaces;
                op.stageMargin = stageMargin;   // W7: geometry memory (see PreloadOp.stageMargin)
                // #315: parking only makes sense for the in-place overlay presentation —
                // a push-fallback page leaves the host grid at present time.
                op.parkOnClose = parkOnClose && overlayMode;
                op.parkOnLoad = parkOnLoad && overlayMode;   // C3 (#546): a non-overlay fallback cannot park — it presents
                op.navKey = navKey;                         // ★★ V-19: the supersede dedupe key
                op.revealDelayMs = revealDelayMs < 0 ? 0 : revealDelayMs;   // ★★ item 6
                op.slideIn = slideIn && overlayMode;                        // ★★ item 6: only the in-place present can slide
                // loop r2 R2-4: the warm flags clear on EVERY staging outcome — a stuck
                // warmPending made a later claim return true with no present coming
                lock (preloadLock)
                {
                    warmPending = false;
                    if (warmClaimRequested)
                    {
                        warmClaimRequested = false;            // a tap landed inside the pending window (MINOR-4)
                        if (op.parkOnLoad)
                        {
                            op.parkOnLoad = false;             // present on load instead of parking
                        }
                    }
                }

                try
                {
                    // Detach the content from the unrealized page so restoring it later is
                    // a real property change (Parent must come back to the page pre-push).
                    target.Content = null;
                    stage.Content = targetContent;
                    if (column >= 0 && hostGrid.ColumnDefinitions.Count > column)
                    {
                        // Pinned overlay (desktop detail column); rows still span.
                        Grid.SetColumn(stage, column);
                    }
                    else if (hostGrid.ColumnDefinitions.Count > 1)
                    {
                        Grid.SetColumnSpan(stage, hostGrid.ColumnDefinitions.Count);
                    }
                    if (hostGrid.RowDefinitions.Count > 1)
                    {
                        Grid.SetRowSpan(stage, hostGrid.RowDefinitions.Count);
                    }
                    lock (preloadLock)
                    {
                        activePreload = op;
                        preloadPending = false;
                    }
                    hostGrid.Children.Add(stage);   // WebView gets a handler → starts loading
                }
                catch (Exception ex)
                {
                    Logging.error("Preload staging failed, falling back to plain push: " + ex);
                    lock (preloadLock)
                    {
                        activePreload = null;
                        preloadPending = false;
                    }
                    try
                    {
                        hostGrid.Children.Remove(stage);
                        stage.Content = null;
                    }
                    catch { }
                    try { target.Content = targetContent; } catch { }
                    presentPlain(target);
                    return;
                }

                // Failsafe: never leave the user waiting on a shell that won't signal.
                Task.Delay(timeoutMs).ContinueWith(_ =>
                {
                    presentPreload(op, "timeout");
                });
            });
        }

        /* ————— Modal variant (#229, the LOCK screen) ————————————————————————————
         * Same load-then-present staging as pushPageLoaded, but the target is
         * presented with PushModalAsync on the ROOT nav (covers overlays AND pushed
         * pages — the lock's requirement). Differences, both deliberate:
         *   1. NEVER drops the target. The lock is a security/privacy surface — if
         *      another preload is in flight, staging is impossible (non-Grid host)
         *      or staging throws, fall back to an IMMEDIATE plain modal push
         *      (pre-#229 behaviour: flickers, but always locks).
         *   2. Shorter timeout: the screen the user left stays visible while the
         *      lock stages, so exposure is capped at ~1.2s (lock.html is local and
         *      typically signals in well under 300ms).
         * SECURITY: staging changes presentation TIMING only — auth logic, unlock
         * events and the encpass path are untouched; the staged page keeps its own
         * isolated WebView (SECURITY.md §1). */
        public void pushModalLoaded(SpixiContentPage target, int timeoutMs = 1200)
        {
            lock (preloadLock)
            {
                if (preloadPending || activePreload != null)
                {
                    presentPlainModal(target);
                    return;
                }
                preloadPending = true;
                /* ★★ #46 loop MAJOR-3 on #507: the lock is RESERVED from here, one whole
                 * dispatcher turn before `activePreload` exists. Every exit below clears it. */
                lockPreloadPending = target is LockPage;
                lockPreloadPendingAt = DateTime.Now;
            }

            MainThread.BeginInvokeOnMainThread(() =>
            {
                // Stage in THIS page's grid — but an OVERLAY page's Content is null
                // (it lives in the host's stage, #225), so fall back to the overlay
                // host's grid; else plain modal push (never drop a lock).
                SpixiContentPage hostPage = this;
                Grid? hostGrid = this.Content as Grid;
                if (hostGrid == null)
                {
                    SpixiContentPage? oh;
                    lock (preloadLock) { oh = overlayHost; }
                    if (oh != null)
                    {
                        hostPage = oh;
                        hostGrid = oh.Content as Grid;
                    }
                }
                View? targetContent = target.Content;

                if (hostGrid == null || targetContent == null)
                {
                    lock (preloadLock) { preloadPending = false; lockPreloadPending = false; }
                    presentPlainModal(target);
                    return;
                }

                ContentView stage = new ContentView
                {
                    Opacity = 0,
                    InputTransparent = true,
                    CascadeInputTransparent = true,
                    BackgroundColor = target.pageSurfaceColor,   // #248: themed resize backing (lock = its own dark)
                    // Q4-③ (#270): a LOCK must cover EVERYTHING, including a live
                    // call's native ring/bar stage (Z_CALL_SURFACE = 100).
                    ZIndex = CallPage.Z_CALL_SURFACE * 2,
                };

                PreloadOp op = new PreloadOp(hostPage, target, stage, targetContent, hostGrid);
                op.modalMode = true;

                try
                {
                    target.Content = null;
                    stage.Content = targetContent;
                    if (hostGrid.ColumnDefinitions.Count > 1)
                    {
                        Grid.SetColumnSpan(stage, hostGrid.ColumnDefinitions.Count);
                    }
                    if (hostGrid.RowDefinitions.Count > 1)
                    {
                        Grid.SetRowSpan(stage, hostGrid.RowDefinitions.Count);
                    }
                    lock (preloadLock)
                    {
                        activePreload = op;
                        preloadPending = false;
                        lockPreloadPending = false;   // ★ MAJOR-3: activePreload answers from here
                    }
                    hostGrid.Children.Add(stage);   // WebView gets a handler → starts loading

                    // Reviewer MAJOR-1: the lock's threat model is "someone else resumes
                    // the app" — while the lock stages (≤ timeout+120ms), the old screen
                    // must not accept INPUT either. Do not rely on the invisible stage
                    // hit-testing (iOS skips alpha-0 views); freeze the host outright.
                    // Restored on every path: present/timeout/abandoned/exception (the
                    // presentPreload finally) and the staging-failure catch below.
                    hostGrid.InputTransparent = true;
                    hostGrid.CascadeInputTransparent = true;
                }
                catch (Exception ex)
                {
                    Logging.error("Modal preload staging failed, falling back to plain modal push: " + ex);
                    lock (preloadLock)
                    {
                        activePreload = null;
                        preloadPending = false;
                        lockPreloadPending = false;   // ★ MAJOR-3
                    }
                    try
                    {
                        hostGrid.InputTransparent = false;
                        hostGrid.Children.Remove(stage);
                        stage.Content = null;
                    }
                    catch { }
                    try { target.Content = targetContent; } catch { }
                    presentPlainModal(target);
                    return;
                }

                Task.Delay(timeoutMs).ContinueWith(_ =>
                {
                    presentPreload(op, "timeout");
                });
            });
        }

        private void presentPlainModal(SpixiContentPage target)
        {
            MainThread.BeginInvokeOnMainThread(async () =>
            {
                try
                {
                    await hostNav.PushModalAsync(target, Config.defaultXamarinAnimations);
                    if (target is LockPage)
                    {
                        hidePrivacyShield();   // #438: the lock is on screen — uncover
                    }
                }
                catch (Exception ex)
                {
                    Logging.error("Exception while modally pushing " + target.GetType().Name + ": " + ex);
                    // Reviewer MINOR-5, fail CLOSED: a LOCK that failed to present must
                    // clear the app's active-lock latch, else every later resume skips
                    // locking until restart.
                    if (target is LockPage)
                    {
                        (Application.Current as App)?.onLockPresentFailed();
                        hidePrivacyShield();   // #438: a failed lock leaves the app UNLOCKED
                    }
                }
            });
        }

        // C3 loop r1: the park decision reads parkOnLoad UNDER the lock, so a concurrent
        // claimWarmingOverlay flip (an Account tap mid-load) reliably turns the park into a present
        private static bool parkOnLoadNow(PreloadOp op)
        {
            lock (preloadLock) { return op.parkOnLoad; }
        }

        private static void presentPreload(PreloadOp op, string reason)
        {
            if (!op.tryFinish())
            {
                return;
            }
            if (reason == "timeout")
            {
                Logging.warn("Preload of " + op.target.GetType().Name + " timed out — presenting anyway.");
            }

            MainThread.BeginInvokeOnMainThread(async () =>
            {
                try
                {
                    // Let the shell paint the data its onload handler just pushed before
                    // the page becomes visible (queued EvaluateJavaScriptAsync work).
                    // ★★ Item 6: per-op now. A page that paints a SKELETON at boot asks
                    // for 0 and shows it; holding it would present a finished panel and
                    // the skeleton would never be seen (which is exactly what happened).
                    if (op.revealDelayMs > 0)
                    {
                        await Task.Delay(op.revealDelayMs);
                    }

                    if (op.abandoned)
                    {
                        // The staged page bailed out while the present was queued (the
                        // conversation's bot-not-ready path blocks the main thread past
                        // the timeout) — honour the bail: never show a dead page (M1).
                        op.hostGrid.Children.Remove(op.stage);
                        op.stage.Content = null;
                        op.target.Content = op.targetContent;
                        op.target.Dispose();
                    }
                    else if (op.modalMode)
                    {
                        // MODAL present (#229/#230, the lock screen). Damir F5 proved the
                        // PushModalAsync present STILL flashes on WinUI — the modal push
                        // re-attaches the WebView, the structural #225 repaint. So, like
                        // #225 screens, the lock is SHOWN IN PLACE (opacity flip, zero
                        // re-attach) whenever its host is the top-of-stack page with no
                        // modal above — the stage was added LAST, so it covers Home AND
                        // every open overlay. Only when something native is pushed/modal
                        // above (money flow, mini-app) fall back to the real modal push.
                        INavigation? rootNav = (Application.Current?.MainPage as NavigationPage)?.Navigation;
                        bool canShowInPlace;
                        lock (preloadLock)
                        {
                            // #230 SECURITY (Opus re-audit): in-place present is only SAFE
                            // over the registered overlay host (HomePage) — that page's
                            // OnBackButtonPressed swallows back while a lock is up AND
                            // pushPageLoaded's guard blocks overlays covering the lock.
                            // App.OnResume stages the resume lock on the CURRENT page,
                            // which may be a pushed LEGACY page (Wallet Send / Scan / Backup
                            // / mini-app / …). Those pages pop themselves on back with NO
                            // hasModalOverlay guard, so an in-place lock hosted by them is
                            // dismissable via hardware back → content exposed without auth.
                            // When the host is NOT the overlay host, fall through to the
                            // real PushModalAsync (ModalStack sits above the page tree and
                            // the LOCK page's own OnBackButtonPressed swallows back).
                            canShowInPlace = rootNav != null
                                && op.host == overlayHost
                                && rootNav.NavigationStack.LastOrDefault() == op.host
                                && rootNav.ModalStack.Count == 0
                                && modalOverlayOp == null;
                        }

                        if (canShowInPlace)
                        {
                            op.stage.InputTransparent = false;
                            op.stage.Opacity = 1;
                            lock (preloadLock)
                            {
                                modalOverlayOp = op;   // closed via closeModalOverlay (LockPage)
                            }
                            // #438: the lock's stage is now visible ABOVE the privacy
                            // shield — uncover, the lock is the cover from here.
                            hidePrivacyShield();
                            // OnAppearing never fires for an in-place present — give the
                            // page its "really visible now" signal (LockPage arms
                            // biometrics off it; default is a no-op).
                            try { op.target.onPresentedInPlace(); }
                            catch (Exception ex) { Logging.warn("onPresentedInPlace failed: " + ex); }
                        }
                        else
                        {
                            // Detach the stage, restore the page's Content and push it
                            // modally on the ROOT nav — fully painted, no boot frame.
                            op.hostGrid.Children.Remove(op.stage);
                            op.stage.Content = null;
                            op.target.Content = op.targetContent;

                            op.target.presentedFromPreload = true;
                            // A lock must never be silently dropped — root nav, else the host's.
                            await (rootNav ?? op.host.Navigation).PushModalAsync(op.target, Config.defaultXamarinAnimations);
                            hidePrivacyShield();   // #438: the modal is on screen — uncover

                            // Reviewer MINOR-2: re-apply platform page chrome now the page is
                            // really attached (iOS insets read 0 while staged) —
                            // mirrors the push path. ★ AND-7 (#401) deleted the Android-15
                            // modal branch this used to also serve.
                            await Task.Delay(250);
                            op.target.applyPlatformPageChrome();
                        }
                    }
                    else if (op.overlayMode && parkOnLoadNow(op))
                    {
                        // ★ C3 (#546): WARM PARK — loaded, data pushed, never shown. The stage
                        // stays hidden in the host grid exactly as a parked-on-close page does;
                        // representParkedOverlay presents it on the first Account tap. A page
                        // that only PRESENTED via the timeout (WebView wedged, pageLoaded false)
                        // is not worth keeping — dispose it, the tap constructs fresh (#46 r2
                        // MINOR-1, the same rule parkOnClose applies). A parked slot claimed
                        // meanwhile (a manual open that closed while we loaded) wins: never two.
                        bool parkedNow = false;
                        lock (preloadLock)
                        {
                            if (reason != "timeout" && op.target.pageLoaded && parkedOverlay == null && modalOverlayOp == null)
                            {
                                parkedOverlay = op;
                                parkedNow = true;
                            }
                        }
                        if (!parkedNow)
                        {
                            op.hostGrid.Children.Remove(op.stage);
                            op.stage.Content = null;
                            op.target.Content = op.targetContent;
                            op.target.Dispose();
                            Logging.info("warm park skipped (" + reason + ")");
                        }
                        else
                        {
                            Logging.info("warm park ready: " + op.target.GetType().Name);
                        }
                    }
                    else if (op.overlayMode)
                    {
                        // OVERLAY present (#225): the view is already attached + painted —
                        // showing it is a property flip, nothing re-attaches, nothing can
                        // repaint blank. Content stays hosted in the stage until close.
                        op.stage.InputTransparent = false;
                        /* ★★ Item 6 (Damir): SLIDE IN from the trailing edge. Presentation
                         * only — the view is already attached and painted, so this animates
                         * a transform on a stage that is finished, never a re-attach.
                         * Fail-soft: an unmeasured stage falls back to the host width, and
                         * a host with no width falls back to the opacity flip. The
                         * translation is always reset, so a stage that is reused (the
                         * parked overlay) can never come back displaced. */
                        double slideFrom = 0;
                        if (op.slideIn)
                        {
                            slideFrom = op.stage.Width > 0 ? op.stage.Width
                                : (op.host.Width > 0 ? op.host.Width : 0);
                        }
                        if (slideFrom > 0)
                        {
                            op.stage.TranslationX = slideFrom;
                            op.stage.Opacity = 1;
                            // NOT awaited: everything below registers the overlay in the
                            // stack and lays the host out, and back handling, the same-tag
                            // sweep and closeTopOverlay all read that stack. Waiting 220 ms
                            // for an animation before registering would leave the overlay
                            // invisible to every one of them while it was on screen.
                            _ = slideStageIn(op);
                        }
                        else
                        {
                            op.stage.Opacity = 1;
                        }
                        lock (preloadLock)
                        {
                            overlayStack.Add(op);
                        }

                        // Unit 6 (#247): presentation-time layout on the HOST in the
                        // same frame the overlay becomes visible (chat-info pane pin +
                        // column expand). Runs BEFORE the same-tag close below, so a
                        // replaced pane's onOverlayClosed sees the new one already open.
                        try
                        {
                            op.target.onPreloadPresented();
                        }
                        catch (Exception ex)
                        {
                            Logging.warn("onPreloadPresented failed: " + ex);
                        }
                        try
                        {
                            op.host.onOverlayPresented(op.target);
                        }
                        catch (Exception ex)
                        {
                            Logging.warn("onOverlayPresented failed: " + ex);
                        }

                        // Same-tag replacement (chat switching): close the previous
                        // overlay of this tag only AFTER the new one is visible —
                        // a seamless swap with no intermediate frame.
                        // Q1 re-review (#267 loop): the op REPLACES is excluded from the
                        // tag sweep — since a chained push now INHERITS the replaced
                        // overlay's tag, it would otherwise match here, be removed from
                        // overlayStack, and then miss the `replaces` lookup below → the
                        // fallback `removePage` would fire on a page that is no longer an
                        // overlay (spurious exception log + a Dispose racing the fade).
                        // The `replaces` branch is the ONE owner of that teardown.
                        if (op.tag != null)
                        {
                            List<PreloadOp> stale;
                            lock (preloadLock)
                            {
                                stale = overlayStack.FindAll(o => o != op && o.target != op.replaces && o.tag == op.tag);
                            }
                            foreach (PreloadOp s in stale)
                            {
                                closeOverlay(s);
                            }
                        }

                        // Chained navigation: close/remove the page this one replaces —
                        // also only now that the replacement is visible (reviewer MAJOR:
                        // the old removePage(this)-at-stage-time orphaned the caller's
                        // overlay stage and left a dead frame under the new screen).
                        if (op.replaces != null)
                        {
                            PreloadOp? replacedOverlay;
                            lock (preloadLock)
                            {
                                replacedOverlay = overlayStack.Find(o => o.target == op.replaces);
                            }
                            if (replacedOverlay != null)
                            {
                                closeOverlay(replacedOverlay);
                            }
                            else
                            {
                                op.host.removePage(op.replaces);   // legacy pushed caller
                            }
                        }

                        // Overlays never get OnAppearing — run the once-visible refresh
                        // (app requests / call bar / per-page data) explicitly.
                        try
                        {
                            UIHelpers.refreshAppRequests = true;
#if IOS
                            // iOS-29 r2 (#303) review MAJOR-1: chat is presented through THIS
                            // machinery on iOS too, so OnAppearing never fires for it — attach
                            // the keyboard observer here as well (idempotent; chat.html-gated).
                            op.target.attachKeyboardInsetObserver();
#endif
                            op.target.updateScreen();
                        }
                        catch (Exception ex)
                        {
                            Logging.warn("Overlay updateScreen failed: " + ex);
                        }
                    }
                    else
                    {
                        // PUSH fallback (no overlay host / a legacy page pushed above it):
                        // detach the stage, give the Content back to the page, and present
                        // it the round-1 way.
                        op.hostGrid.Children.Remove(op.stage);
                        op.stage.Content = null;
                        op.target.Content = op.targetContent;

                        if (op.host.Navigation.NavigationStack.Contains(op.host))
                        {
                            op.target.presentedFromPreload = true;
                            await op.host.Navigation.PushAsync(op.target, Config.defaultXamarinAnimations);

                            // Chained navigation (legacy parity: push new, then remove the
                            // caller from beneath it).
                            if (op.replaces != null)
                            {
                                op.target.removePage(op.replaces);
                            }

                            // Re-apply platform page chrome now the page is really attached:
                            // iOS SafeAreaInsets() read ZERO while it loaded off-screen (M2).
                            await Task.Delay(250);
                            op.target.applyPlatformPageChrome();
                        }
                        else
                        {
                            // The user navigated away while the page was staging — drop it
                            // and tear the hidden WebView down. ★ N73 review MAJOR-4: the
                            // staged page's own load already repainted the strip (its
                            // WebView navigated), so hand it back to the host.
                            op.target.Dispose();
                            repaintSystemBars(overlayHost);
                        }
                    }
                }
                catch (Exception ex)
                {
                    Logging.error("Preload present failed: " + ex);
                    // Fail CLOSED (reviewer MINOR-5): see presentPlainModal.
                    if (op.modalMode && op.target is LockPage)
                    {
                        (Application.Current as App)?.onLockPresentFailed();
                        // #438: onLockPresentFailed leaves the user UNLOCKED, so a shield
                        // left up here would strand the app opaque with no way in.
                        hidePrivacyShield();
                    }
                    try { op.target.Dispose(); } catch { }
                }
                finally
                {
                    // Reviewer MAJOR-1: unfreeze the host that pushModalLoaded froze —
                    // on EVERY outcome (ready/timeout/abandoned/exception). No-op if it
                    // was never frozen; never touches non-modal ops.
                    if (op.modalMode)
                    {
                        try { op.hostGrid.InputTransparent = false; } catch { }
                    }
                    lock (preloadLock)
                    {
                        if (activePreload == op)
                        {
                            activePreload = null;
                        }
                    }
                }
            });
        }

        /// <summary>
        /// ★★ Item 6: the slide itself. Always resets the translation, so a stage that is
        /// reused (the parked overlay) can never come back displaced — a failed or
        /// interrupted animation must not leave a screen half off the edge.
        /// </summary>
        /* ★★ #685 (Damir 2026-08-28): "the speed of chat info (and any subsequent screen
         * that will have the slide in effect) should be a little bit slower, more smooth."
         *
         * ★★ AND THE CURVE IS NOT A NEW INVENTION — IT IS THE HOUSE ONE, WHICH THIS
         * ANIMATION WAS NOT USING. `tokens.css` declares
         *     --easing-standard: cubic-bezier(0.2, 0, 0, 1)
         * and every in-document transition rides it. This stage rode `Easing.CubicOut`,
         * which starts at MAXIMUM velocity — the panel appears to be already moving on
         * frame one, and that abruptness is what reads as "not smooth". The house curve
         * eases out of rest and decelerates harder into place. So the fix for Damir's ask
         * and the fix for a real disagreement between the two motion systems are the same
         * edit, and a smoke pin now holds the C# curve equal to the token's numbers.
         *
         * ⚠ THE EXIT IS DELIBERATELY NOT CHANGED. The mirror slide-out stays 220 ms
         * (`Easing.CubicIn`, the #326 pairing): an exit that matches the entry feels slow,
         * because the user has already decided to leave. Enter 300 / exit 220 is the
         * asymmetry, and it is a choice, not an oversight. Damir asked about the slide IN.
         *
         * ⚠ Today `slideIn: true` has exactly ONE caller — chat info, from the chat header
         * (`SingleChatPage.xaml.cs:563`). Every other screen presents with an opacity flip
         * and no transition, so nothing else moves with this. When another screen opts in,
         * it inherits this curve and this duration, which is the point. */
        private const uint ScreenSlideInMs = 300;          // was 220

        /// <summary>The `--easing-standard` cubic-bezier(0.2, 0, 0, 1), solved for MAUI.</summary>
        private static readonly Easing ScreenSlideEasing = new Easing(x =>
        {
            // control points: P0 (0,0) · P1 (0.2, 0) · P2 (0, 1) · P3 (1,1)
            const double x1 = 0.2, y1 = 0.0, x2 = 0.0, y2 = 1.0;
            static double curve(double t, double a, double b) =>
                3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
            if (x <= 0) return 0;
            if (x >= 1) return 1;
            // bisection: monotone in t, 30 halvings is ~1e-9 and cannot diverge the way a
            // Newton step can on a curve whose derivative reaches zero at the ends
            double lo = 0, hi = 1, t = x;
            for (int i = 0; i < 30; i++)
            {
                t = (lo + hi) / 2;
                if (curve(t, x1, x2) < x) { lo = t; } else { hi = t; }
            }
            return curve(t, y1, y2);
        });

        private static async Task slideStageIn(PreloadOp op)
        {
            var stage = op.stage;
            try
            {
                await stage.TranslateTo(0, 0, ScreenSlideInMs, ScreenSlideEasing);
            }
            catch (Exception ex)
            {
                Logging.warn("Overlay slide-in failed: " + ex);
            }
            finally
            {
                /* ★ L8: do NOT reset a stage that is already sliding OUT. A back press
                 * inside the 220 ms open window aborts this animation, and MAUI completes
                 * the aborted task — so this `finally` would post TranslationX = 0 into the
                 * middle of the exit and snap the panel fully back for one frame. The exit
                 * path resets the translation itself once the teardown completes. */
                if (!op.closing)
                {
                    try { stage.TranslationX = 0; } catch (Exception) { }
                }
            }
        }

        private static void cancelPreload(PreloadOp op)
        {
            if (!op.tryFinish())
            {
                return;
            }
            MainThread.BeginInvokeOnMainThread(() =>
            {
                try
                {
                    op.hostGrid.Children.Remove(op.stage);
                    op.stage.Content = null;
                    op.target.Content = op.targetContent;
                    op.target.Dispose();   // tear down the hidden WebView
                }
                catch (Exception ex)
                {
                    Logging.error("Preload cancel failed: " + ex);
                }
                finally
                {
                    lock (preloadLock)
                    {
                        if (activePreload == op)
                        {
                            activePreload = null;
                        }
                    }
                }
            });
        }

        private void presentPlain(SpixiContentPage target)
        {
            MainThread.BeginInvokeOnMainThread(async () =>
            {
                try
                {
                    await Navigation.PushAsync(target, Config.defaultXamarinAnimations);
                }
                catch (Exception ex)
                {
                    Logging.error("Exception while pushing " + target.GetType().Name + ": " + ex);
                }
            });
        }

        public virtual void reload()
        {
            if (_webView != null)
            {
                pageLoaded = false;
                MainThread.BeginInvokeOnMainThread(() =>
                {
                    if (_webView == null)
                    {
                        return;
                    }
                    if (loadedHtmlFileName != null)
                    {
                        // Re-GENERATE (re-localize) instead of Reload(): the boot theme is
                        // substituted into the generated page (*SL{SpixiThemeName}), so a
                        // raw Reload after an appearance/OS-theme change would resurrect
                        // the stale theme (audit m1). Also refresh the native surface —
                        // reloadAllPages fires exactly on such theme changes.
                        applyPageSurfaceColor();
                        _webView.Source = generatePage(loadedHtmlFileName);
                    }
                    else
                    {
                        _webView.Reload();
                    }
                });
            }
        }

        public WebViewSource generatePage(string html_file_name)
        {
            if (OperatingSystem.IsAndroid())
            {
                var source = new HtmlWebViewSource();
                Stream stream = SPlatformUtils.getAsset(Path.Combine("html", html_file_name));
                source.BaseUrl = SPlatformUtils.getAssetsBaseUrl() + "html/";
                source.Html = SpixiLocalization.localizeHtml(stream);
                stream.Close();
                stream.Dispose();
                return source;
            }
            else
            {
                string assets_file_path = Path.Combine(SPlatformUtils.getAssetsPath(), "html", html_file_name);
                string localized_file_path = Path.Combine(SPlatformUtils.getHtmlPath(), "ll_" + html_file_name);
                SpixiLocalization.localizeHtml(assets_file_path, localized_file_path);
                return new UrlWebViewSource
                {
                    Url = SPlatformUtils.getHtmlBaseUrl() + "ll_" + html_file_name
                };
            }
        }


        public virtual void recalculateLayout()
        {

        }

        public Task<bool> displaySpixiAlert(string title, string message, string ok, string cancel)
        {
            try
            {
                var tcs = new TaskCompletionSource<bool>();
                MainThread.BeginInvokeOnMainThread(async () =>
                {
                    try
                    {
                        // Route via the ROOT page: overlay pages (#225) are not in the
                        // navigation tree, and DisplayAlert on an unattached page is lost.
                        Page alertHost = (Application.Current?.MainPage) ?? (Page)this;
                        var result = await alertHost.DisplayAlert(title, message, ok, cancel);
                        tcs.TrySetResult(result);
                    }
                    catch (Exception ex)
                    {
                        Logging.error("Exception occured in displaySpixiAlert: " + ex);
                        tcs.TrySetException(ex);
                    }
                });
                return tcs.Task;
            }
            catch (Exception e)
            {
                Logging.error("Exception occured in displaySpixiAlert: " + e);
            }
            return null;
        }

        public Task displaySpixiAlert(string title, string message, string cancel)
        {
            try
            {
                var tcs = new TaskCompletionSource<Task>();
                MainThread.BeginInvokeOnMainThread(() =>
                {
                    try
                    {
                        // Route via the ROOT page (see 4-arg overload — overlay pages).
                        Page alertHost = (Application.Current?.MainPage) ?? (Page)this;
                        var result = alertHost.DisplayAlert(title, message, cancel);
                        tcs.TrySetResult(result);
                    }
                    catch (Exception ex)
                    {
                        Logging.error("Exception occured in displaySpixiAlert: " + ex);
                        tcs.TrySetException(ex);
                    }
                });
                return tcs.Task;
            }
            catch (Exception e)
            {
                Logging.error("Exception occured in displaySpixiAlert: " + e);
            }
            return null;
        }

        /* Q4-③ (#270): the per-page displayCallBar / hideCallBar / displayAppRequests
         * pushes are GONE — call state presents on the ONE native CallPage surface
         * (see broadcastCallState above), and the 4-arg MINI-APP session-request
         * card was dead traffic: legacy never rendered it (spixi.js:247 is a
         * commented-out TODO) and every redesigned shell no-op'd it — the push
         * existed only to not throw. Mini-app session-request UX is a pre-existing
         * gap either way, now logged in the audit inventory instead of shipping
         * as invisible pushes into 13 WebViews per updateScreen tick. */

        public void onAppAccept(Address sender_address, string session_id)
        {
            byte[] b_session_id = Crypto.stringToHash(session_id);
            if (VoIPManager.hasSession(b_session_id))
            {
                // ★ review MINOR-1: a surface that receives no call state cannot ANSWER
                // a call either (the mini-app WebView must never touch the call surface).
                if (!acceptsCallPushes)
                {
                    Logging.warn("Ignoring a call-accept verb from a surface that receives no call state.");
                    return;
                }
                VoIPManager.acceptCall(b_session_id);
                return;
            }
            MiniAppPage app_page = Node.MiniAppManager.acceptAppRequest(sender_address, b_session_id);
            if (app_page != null)
            {
                hostNav.PushAsync(app_page, Config.defaultXamarinAnimations);   // #225: works from overlay pages too
            }// TODO else error?
        }

        public void onAppReject(Address sender_address, string session_id)
        {
            byte[] b_session_id = Crypto.stringToHash(session_id);
            if (VoIPManager.hasSession(b_session_id))
            {
                // ★ review MINOR-1 (defense-in-depth, MAJOR-1's inbound twin): a surface
                // that never RECEIVES call state must not be able to ACT on it either —
                // a mini-app WebView can't see a session id, but it must not be able to
                // spam call teardown verbs at all.
                if (!acceptsCallPushes)
                {
                    Logging.warn("Ignoring a call-reject verb from a surface that receives no call state.");
                    return;
                }
                VoIPManager.rejectCall(b_session_id);
                return;
            }
            Node.MiniAppManager.rejectAppRequest(sender_address, b_session_id);
        }

        public virtual void updateScreen()
        {
            if (UIHelpers.refreshAppRequests)
            {
                // C18 (#265): `refreshAppRequests` is a GLOBAL one-shot flag and the
                // FIRST page ticked (HomePage, stack-last under #225) used to consume
                // it — so an incoming ring never reached the conversation the user was
                // actually looking at. Clear the flag FIRST (re-entrancy: the broadcast
                // ticks other pages), then push the state to EVERY live WebView.
                UIHelpers.refreshAppRequests = false;
                broadcastCallState();
            }
        }

        public virtual void onResume()
        {

        }

        protected override void OnAppearing()
        {
            base.OnAppearing();
#if IOS
            attachKeyboardInsetObserver();   // iOS-29 r2 (#303): chat.html pages only, no-op elsewhere
#endif
#if ANDROID
            // ★ N73 (#391): coming BACK to a page never re-navigates its WebView, so
            // applyPlatformPageChrome does not run — without this the strip would keep
            // the colour of the page that just left (e.g. the fixed-dark lock screen
            // sitting above a light Home).
            // ★ AND-7 (#401, audit): run the WHOLE chrome pass, not just the strip repaint.
            // Since the root view no longer pads the top, the page's own padding and the
            // shell's --android-inset-top are what keep content clear of the status bar,
            // and both can be stale by the time a page is walked back to. This method
            // starts with the same setEdgeToEdge call, so nothing is lost.
            applyPlatformPageChrome();
#endif
            UIHelpers.refreshAppRequests = true;
            updateScreen();
        }

        protected override void OnDisappearing()
        {
            base.OnDisappearing();

            Dispose();
        }

        protected bool onNavigatingGlobal(string url)
        {
            if (url.StartsWith("ixian:appAccept:"))
            {
                var split = url.Split(':');
                onAppAccept(new Address(split[2]), split[3]);
            }
            else if (url.StartsWith("ixian:appReject:"))
            {
                var split = url.Split(':');
                onAppReject(new Address(split[2]), split[3]);
            }
            else if (url.StartsWith("ixian:hangUp:"))
            {
                // ★ review MINOR-1: same inbound gate as onAppReject — a surface that
                // receives no call state (mini-app WebView) cannot end calls either.
                if (!acceptsCallPushes)
                {
                    Logging.warn("Ignoring a hang-up verb from a surface that receives no call state.");
                    return true;
                }
                string session_id = url.Substring("ixian:hangUp:".Length);
                VoIPManager.hangupCall(Crypto.stringToHash(session_id));
            }
            else
            {
                return false;
            }
            return true;
        }

#if IOS
        /* iOS-29 r2 (#303) — the NATIVE keyboard lever. The chat shell lifts its
         * composer above the soft keyboard via a CSS inset (--kb-inset); driving it
         * from visualViewport alone proved racy on-device (the first resize event can
         * fire before the keyboard geometry settles — the composer lifted only after
         * a few keystrokes re-triggered layout). UIKeyboardWillChangeFrame/WillHide
         * always carry the settled END frame, so the exact overlap is pushed into the
         * shell (window.__setKbInset — guarded, a no-op wherever undefined), which
         * latches to native values; its visualViewport machinery stays as the belt.
         * SCOPED to chat.html pages only (the one composer-over-keyboard surface).
         * MiniAppPage never sets loadedHtmlFileName, so third-party content is
         * structurally excluded (the security-review MAJOR #6 accretion class —
         * deliberately NOT added to that tally because it cannot reach mini-apps). */
        private NSObject? kbChangeObserver = null;
        private NSObject? kbHideObserver = null;
        private IDisposable? kbScrollPin = null;   // iOS-53 (#324): contentOffset pin while the keyboard is up

        /* iOS-53 (#324) — THE TOPBAR DIP. kb-probe on-device (2026-08-10, AI15):
         * with the keyboard summoned, WKWebView programmatically PANS its scroll
         * view to "reveal" the focused composer even though the shell's layout
         * keeps everything inside the viewport (trace: transient winScroll/
         * vvScroll events with DOM geometry pinned at 0, rAF starved through the
         * window). No in-page lever can win: a pre-lift applied synchronously at
         * focusin was still panned over (the decision predates DOM focus), and
         * iOS 26 WebKit rejects `interactive-widget` ("not recognized", live
         * console). On this page the pan is wrong BY CONSTRUCTION — fixed flex
         * column, overflow:hidden, inner scrollers only, so document offset 0 is
         * the only correct state (the shell already resets it reactively; this
         * pins it natively, frame-perfect). KVO on contentOffset while the
         * keyboard is up snaps any programmatic pan back to zero the moment it is
         * written; resetting re-fires KVO with (0,0), which passes the check —
         * no recursion. Same attach scope as the inset observer (chat.html only;
         * MiniAppPage never sets loadedHtmlFileName → mini-apps structurally
         * excluded), same docked-keyboard width guard. */
        private void pinKeyboardScroll()
        {
            if (kbScrollPin != null)
                return;
            try
            {
                var wk = _webView?.Handler?.PlatformView as WebKit.WKWebView;
                var sv = wk?.ScrollView;
                if (sv == null)
                    return;
                kbScrollPin = sv.AddObserver("contentOffset", NSKeyValueObservingOptions.New, _ =>
                {
                    try
                    {
                        if (sv.ContentOffset.Y != 0 || sv.ContentOffset.X != 0)
                            sv.SetContentOffset(CoreGraphics.CGPoint.Empty, false);
                    }
                    catch { }
                });
            }
            catch { }
        }

        private void unpinKeyboardScroll()
        {
            try { kbScrollPin?.Dispose(); } catch { }
            kbScrollPin = null;
        }

        /// <summary>
        /// ★★ #608 (device rows 5a / 5b / §2, 2026-08-27): the shells that publish
        /// `--kb-inset`. It used to be chat.html alone, and that is why the wallet Send
        /// screen and the account-create form sat under the keyboard with no way to
        /// reach what it covered — they never received a keyboard signal at all.
        /// ⚠ It is an ALLOW-LIST, not an "every page": a page that does not consume the
        /// inset gains nothing from being told about it, and each entry is one more
        /// document the observer has to be correct for.
        /// </summary>
        private static readonly string[] KEYBOARD_INSET_SHELLS = { "chat.html", "index.html", "intro.html" };

        private void attachKeyboardInsetObserver()
        {
            if (kbChangeObserver != null)
                return;
            if (Array.IndexOf(KEYBOARD_INSET_SHELLS, loadedHtmlFileName) < 0)
                return;
            kbChangeObserver = UIKeyboard.Notifications.ObserveWillChangeFrame((sender, e) =>
            {
                try
                {
                    // End-frame is in screen coordinates; a dismissed keyboard sits at or
                    // below the screen bottom edge -> overlap 0. Points == CSS px in the
                    // WebView, so the value feeds the shell's --kb-inset unconverted.
                    var screen = UIScreen.MainScreen.Bounds;
                    // iPad floating/split keyboards deliver a NARROWER, mid-screen frame —
                    // the bottom-overlap math would compute a bogus inset AND latch the
                    // shell off its visualViewport belt (review MINOR-5). Docked keyboards
                    // span the full width; push only for those, let the belt handle the rest.
                    if (e.FrameEnd.Width < screen.Width)
                        return;
                    double overlap = Math.Max(0, (double)(screen.Height - e.FrameEnd.Y));
                    // iOS-53 (#324): pin BEFORE the inset push — WillChangeFrame precedes
                    // WebKit's reveal pan (probe: push t=59-91, pan t=75-115), so the pin
                    // is live when the first wrong offset is written.
                    // ⚠ #608: the iOS-53 scroll pin stays CHAT-ONLY. It exists for the
                    // message log's reveal pan; the shells joining the allow-list have
                    // never had it, and a page silently gaining a contentOffset clamp is
                    // exactly the kind of side effect that costs a review round.
                    if (loadedHtmlFileName == "chat.html")
                    {
                        if (overlap > 0)
                            pinKeyboardScroll();
                        else
                            unpinKeyboardScroll();
                    }
                    sendMessage("window.__setKbInset && window.__setKbInset(" + (int)overlap + ")");
                }
                catch { }
            });
            kbHideObserver = UIKeyboard.Notifications.ObserveWillHide((sender, e) =>
            {
                unpinKeyboardScroll();   // iOS-53 (#324): keyboard leaving — release the pin
                try { sendMessage("window.__setKbInset && window.__setKbInset(0)"); } catch { }
            });
        }

        private void detachKeyboardInsetObserver()
        {
            unpinKeyboardScroll();   // iOS-53 (#324)
            try { kbChangeObserver?.Dispose(); } catch { }
            try { kbHideObserver?.Dispose(); } catch { }
            kbChangeObserver = null;
            kbHideObserver = null;
        }
#endif

        /* ★★ V-5 (#46 loop 2026-08-29): #619 freed the UI thread while a bot room waits,
         * which made popPageAsync's THIRD branch reachable for the first time — a plain
         * Navigation.PopAsync on a page that was never pushed and has already been
         * Disposed. Before #619 the ceiling blocked the thread, so the user could not
         * act and the page was always staging or presented. This codebase has already
         * ruled the same fall-through a MAJOR once: the #328 comment in closeOverlay
         * describes it as the #272 pop-the-top class — it pops whatever IS on top,
         * which is someone else's screen.
         * Dispose set no flag anyone consulted. Now it does, and the check closes the
         * #328 residual for every caller rather than only this one. */
        private volatile bool disposed = false;

        /* ★ L10 (2026-08-31): read-only for subclasses. A page that defers work to a
         * LATER dispatcher turn has to ask whether it is still alive when that turn
         * arrives — presentPreload's abandoned branch disposes the target from the same
         * main-thread queue, and it was enqueued FIRST, so it can run in between.
         * sendUiCommand only swallows the resulting exception into the log. */
        protected bool isDisposed { get { return disposed; } }

        public void Dispose()
        {
            disposed = true;
            try
            {
                if (!Navigation.NavigationStack.Contains(this))
                {
                    pageLoaded = false;
                    messageQueue.Clear();
#if IOS
                    detachKeyboardInsetObserver();   // iOS-29 r2 (#303)
#endif

                    var webView = _webView;
                    _webView = null;
                    if (webView != null)
                    {
                        webView.Navigated -= webViewNavigated;
                        webView.Navigating -= webViewNavigating;

                        if (webView.Parent is Layout layout)
                            layout.Remove(webView);

                        webView.Source = null;
                        webView.Handler?.DisconnectHandler();
                    }
                }
            }
            catch (Exception ex)
            {
                Logging.error("Exception occured while disposing SpixiContentPage: " + ex);
            }
        }

        public void popPageAsync()
        {
            // If THIS page is an OPEN OVERLAY (#225), "pop" = close the overlay; the
            // screen below was never detached, so nothing repaints.
            PreloadOp? overlayOp;
            lock (preloadLock)
            {
                overlayOp = overlayStack.Find(o => o.target == this);
            }
            if (overlayOp != null)
            {
                closeOverlay(overlayOp, true);   // #326: back-initiated → iOS slide-out
                return;
            }

            // If THIS page is still staging off-screen (load-then-move) and bails out
            // (e.g. the conversation's bot-not-ready path), cancel the preload instead
            // of popping the page the user is actually looking at.
            PreloadOp? op;
            lock (preloadLock)
            {
                op = activePreload;
            }
            if (op != null && op.target == this)
            {
                // Mark BEFORE trying to cancel: if the 4s timeout has already claimed the
                // present (its main-thread continuation is queued behind us), the flag
                // makes that continuation drop the page instead of showing it (M1).
                op.abandoned = true;
                cancelPreload(op);
                return;
            }

            // ★★ V-5: neither an open overlay nor a staging preload. A page that is
            // already DISPOSED was never pushed either, so PopAsync here would take the
            // screen the user is actually looking at. Repro: open a cold bot room, wait
            // for the blank present at ~4s, press back before 5s.
            if (disposed)
            {
                Logging.warn("popPageAsync on a disposed page — ignored (V-5 / #328)");
                return;
            }

            MainThread.BeginInvokeOnMainThread(async () =>
            {
                // Re-check on the main thread: a Dispose can land between the branch
                // above and this continuation.
                if (disposed)
                {
                    Logging.warn("popPageAsync: page disposed while the pop was queued — ignored (V-5)");
                    return;
                }
                Page page = await Navigation.PopAsync(Config.defaultXamarinAnimations);
                if (page != null
                    && page is SpixiContentPage)
                {
                    await Task.Delay(200);
                    ((SpixiContentPage)page).Dispose();
                }
            });
        }

        public void popToRootAsync()
        {
            // Overlay pages "pop to root" by closing every open overlay (#225) — the
            // host (HomePage) is the root and was never covered by the native stack.
            List<PreloadOp> overlays;
            lock (preloadLock)
            {
                overlays = new List<PreloadOp>(overlayStack);
            }
            if (overlays.Find(o => o.target == this) != null)
            {
                /* ★ L8: only the topmost slides — AND only when it is the ONLY one.
                 * With a conversation underneath, sliding the top for 220 ms while the layer
                 * beneath is torn down at t=0 shows the panel gliding across a bare chats
                 * list. Reachable from remove-contact and leave-group, both of which also
                 * raise an alert over the animation. Instant is honest there. */
                bool slideTop = overlays.Count == 1;
                for (int i = overlays.Count - 1; i >= 0; i--)
                {
                    closeOverlay(overlays[i], slideTop && i == overlays.Count - 1);
                }
                return;
            }

            MainThread.BeginInvokeOnMainThread(async () =>
            {
                var mainPage = (Application.Current.MainPage as NavigationPage);
                while (mainPage.Navigation.NavigationStack.Count > 2)
                {
                    var page = mainPage.Navigation.NavigationStack[mainPage.Navigation.NavigationStack.Count - 2];
                    if (page != null)
                    {
                        Navigation.RemovePage(page);
                        if (page is SpixiContentPage)
                        {
                            ((SpixiContentPage)page).Dispose();
                        }
                    }
                }
                if (mainPage.Navigation.NavigationStack.Count > 1)
                {
                    Page page = await Navigation.PopAsync(Config.defaultXamarinAnimations);
                    if (page != null
                        && page is SpixiContentPage)
                    {
                        await Task.Delay(200);
                        ((SpixiContentPage)page).Dispose();
                    }
                }
            });
        }

        public void removePage(Page page)
        {
            // #225: an OPEN OVERLAY is not in the navigation tree — removing it means
            // closing the overlay (detaches its stage + disposes); Navigation.RemovePage
            // on a detached page would no-op/throw and leave a dead frame in the grid.
            if (page is SpixiContentPage overlayCandidate)
            {
                PreloadOp? overlayOp;
                lock (preloadLock)
                {
                    overlayOp = overlayStack.Find(o => o.target == overlayCandidate);
                }
                if (overlayOp != null)
                {
                    closeOverlay(overlayOp);
                    return;
                }
            }

            MainThread.BeginInvokeOnMainThread(() =>
            {
                if (page != null)
                {
                    try
                    {
                        Navigation.RemovePage(page);
                    }
                    catch (Exception ex)
                    {
                        Logging.warn("removePage: " + ex);
                    }
                    if (page is SpixiContentPage)
                    {
                        ((SpixiContentPage)page).Dispose();
                    }
                }
            });
        }

        /* D-5/N26 (#366): ONE relation truth for the member-sheet pushes
           (SingleChatPage addThem/addContact · ContactDetails addMember).
           C# computes it where it builds the push — the shell has no contact
           roster (frozen bridge). Values: contact | pending | none | self;
           "" = unknown (the shell treats "" as none and hides money actions). */
        public static string contactRelationFor(Address address)
        {
            if (address == null) return "";
            try
            {
                var self = IxianHandler.getWalletStorage().getPrimaryAddress();
                if (self != null && address.SequenceEqual(self)) return "self";
                Friend fr = FriendList.getFriend(address);
                if (fr == null || fr.pendingDeletion) return "none";
                if (fr.approved && fr.state == FriendState.Approved) return "contact";
                // R2 (#371, the #366 copy follow-up): RequestReceived gets its own
                // token so the badge can say "Request received" instead of the lie
                // "Request sent". Same safety class as 'pending': no request button,
                // no money actions. An OLD shell treats the unknown token as '' →
                // unknown → it may show a request button; shells and exe ship
                // together, so the skew exists only in stale-artifact dev runs.
                if (fr.state == FriendState.RequestReceived) return "pending-in";
                // RequestSent AND every legacy non-Approved state land here: no
                // request button, no money actions — the honest safe bucket.
                return "pending";
            }
            catch (Exception ex)
            {
                Logging.warn("contactRelationFor: " + ex.Message);
                return "";
            }
        }

        /* N26 (#366): the GUARDED send-contact-request, shared by SingleChatPage and
           ContactDetails (the member sheet opens on both surfaces). Body lifted
           verbatim from SingleChatPage's ixian:sendContactRequest case (#334
           AND-17): self guard · pendingDeletion heal · already-exists alert ·
           addFriend + sendContactRequest + the requestAddSent marker. The address
           payload rides the WebView URL and is peer-influenced → parse inside
           try/catch (the #248 kick/ban A-4 rule: never throw in onNavigating). */
        public void sendContactRequestGuarded(string str_address)
        {
            Address address;
            try
            {
                address = new Address(str_address);
            }
            catch (Exception ex)
            {
                Logging.warn("sendContactRequest: invalid address payload: " + ex.Message);
                return;
            }
            // #334 loop MINOR-5: self guard (mirror ContactNewPage:174-178).
            if (address.SequenceEqual(IxianHandler.getWalletStorage().getPrimaryAddress()))
            {
                // #336/#337: friendly title + ?? fallbacks (hidden-locale _SL null).
                displaySpixiAlert(SpixiLocalization._SL("contact-self-title") ?? "That's your address", SpixiLocalization._SL("contact-new-invalid-address-self-text") ?? "The address you have entered is your own address.", SpixiLocalization._SL("global-dialog-ok") ?? "Ok");
                return;
            }
            // #334 AND-17(a): heal pendingDeletion, surface already-exists.
            Friend existing = FriendList.getFriend(address);
            if (existing != null && existing.pendingDeletion)
            {
                FriendList.removeFriend(existing);
                UIHelpers.shouldRefreshContacts = true;
                existing = null;
            }
            if (existing != null)
            {
                displaySpixiAlert(SpixiLocalization._SL("contact-exists-title") ?? "Already in your contacts", SpixiLocalization._SL("contact-new-invalid-address-exists-text") ?? "This contact is already added.", SpixiLocalization._SL("global-dialog-ok") ?? "Ok");
            }
            else
            {
                Friend new_friend = FriendList.addFriend(FriendType.Normal, FriendState.RequestSent, address, null, address.ToString(), null, null, 0);
                if (new_friend != null)
                {
                    new_friend.save();

                    UIHelpers.shouldRefreshContacts = true;

                    StreamProcessor.sendContactRequest(new_friend);
                    // #334 AND-17(b): stamp the outgoing request (M5 row + Requests chip).
                    HomePage.writeRequestSentMarker(address);   // #572 ①: the marker must not count as unread
                    if (new_friend.approved)
                    {
                        CoreProtocolMessage.resubscribeEvents();
                    }
                }
            }
        }
    }
}