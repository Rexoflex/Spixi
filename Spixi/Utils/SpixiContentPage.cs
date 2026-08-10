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
        private Queue<string> messageQueue = new Queue<string>();
        protected WebView? _webView = null;
        public WebView WebView
        {
            get
            {
                return _webView!;
            }
        }

        private string? loadedHtmlFileName = null;

        // The native surface painted behind (and on) this page's WebView — chosen per
        // shell so the pre-paint frame matches what the shell will render (N1/N3).
        protected Color pageSurfaceColor = ThemeManager.getSurfaceColor();

        // Redesigned shells sit on --surface-screen; the REMAINING legacy blue-themed
        // pages keep the legacy colour (don't trade one mismatch for another — audit m3);
        // the lock shell is always-dark by design.
        private static Color surfaceColorFor(string html_file_name)
        {
            switch (html_file_name)
            {
                case "lock.html":
                    return Color.FromArgb("#13171b");
                case "wallet_recipient.html":
                case "wallet_request.html":
                case "wallet_send_2.html":
                case "wallet_contact_request.html":
                case "address.html":
                    return ThemeManager.getBackgroundColor();
                // wallet_sent.html left this list at #259 (B3 redesigned shell,
                // instant-bg = --surface-screen) — stale legacy-blue entry fixed with
                // the edge-to-edge batch (pre-paint frame now matches the shell).
                default:
                    return ThemeManager.getSurfaceColor();
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

        private void applyPageSurfaceColor()
        {
            pageSurfaceColor = surfaceColorFor(loadedHtmlFileName ?? "");
            this.BackgroundColor = pageSurfaceColor;
            if (Content != null)
            {
                Content.BackgroundColor = pageSurfaceColor;
            }
            if (_webView != null)
            {
                _webView.BackgroundColor = pageSurfaceColor;
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

            while (messageQueue.Count > 0)
            {
                var message = messageQueue.Dequeue();
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
                case "address.html":
                case "apps.html":
                case "settings_lock.html":
                case "wallet_contact_request.html":
                case "wallet_recipient.html":
                case "wallet_request.html":
                case "wallet_send.html":
                case "wallet_send_2.html":
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
#if IOS || MACCATALYST
            // iOS-1/3/4 edge-to-edge: redesigned shells draw under the status bar + home
            // indicator (viewport-fit=cover is in every shell; fixed chrome pads itself
            // via env(safe-area-inset-*), which WKWebView populates live per WebView —
            // including after a load-then-move present, with no M2-style re-read race).
            // The themed page background stays: it is the pre-paint frame (N1/N3) and
            // the transition/keyboard backing. Legacy pages keep the native inset.
            if (hasLegacyPageChrome(loadedHtmlFileName ?? ""))
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
            // Fix edge-to-edge on Android 15 for modals
            if (OperatingSystem.IsAndroidVersionAtLeast(35))
            {
                bool isModal = Navigation.ModalStack.Contains(this);
                if (isModal)
                {
                    if (MainActivity.Insets != null)
                    {
                        this.Padding = new Thickness(0, MainActivity.Insets.Value.Top / 3, 0, 0);
                    }
                }
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
                return op != null && op.modalMode && op.target is LockPage;
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

        // Hardware/host back: close the top overlay if one is open. Returns true when handled.
        public static bool closeTopOverlay()
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
            closeOverlay(top);
            return true;
        }

        private static void closeOverlay(PreloadOp op)
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
                        }
                    }
                    else
                    {
                        // #229b (Damir F5: chat-info → conversation flashed): HIDE first —
                        // an Opacity flip is the #225-proven no-repaint operation — let the
                        // frame commit, and only THEN detach + dispose. Removing/tearing
                        // down a WebView2's composition surface in the same frame it is
                        // still visible briefly flashes the reveal on WinUI.
                        op.stage.Opacity = 0;
                        op.stage.InputTransparent = true;
                        await Task.Delay(100);
                        op.hostGrid.Children.Remove(op.stage);
                        op.stage.Content = null;
                        op.target.Content = op.targetContent;   // reattach for a clean Dispose
                        op.target.Dispose();                    // tear the WebView down
                    }
                }
                catch (Exception ex)
                {
                    Logging.error("Overlay close failed: " + ex);
                }
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
        public void pushPageLoaded(SpixiContentPage target, int timeoutMs = 4000, string? tag = null, int column = -1, SpixiContentPage? replaces = null, Thickness stageMargin = default, bool parkOnClose = false)
        {
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
                    try { target.Dispose(); } catch { }
                    return;
                }
                if (preloadPending || activePreload != null)
                {
                    // A page is already staging (double-tap / competing nav) — drop this
                    // one. The call sites construct the target inline, so dispose it to
                    // release its WebView events/queue rather than leaving an orphan (m4).
                    try { target.Dispose(); } catch { }
                    return;
                }
                preloadPending = true;
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
                    lock (preloadLock) { preloadPending = false; }
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
                // #315: parking only makes sense for the in-place overlay presentation —
                // a push-fallback page leaves the host grid at present time.
                op.parkOnClose = parkOnClose && overlayMode;

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
                    lock (preloadLock) { preloadPending = false; }
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
                    }
                }
            });
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
                    await Task.Delay(120);

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

                            // Reviewer MINOR-2: re-apply platform page chrome now the page is
                            // really attached (iOS insets read 0 while staged; the Android-15
                            // modal branch needs ModalStack membership) — mirrors the push path.
                            await Task.Delay(250);
                            op.target.applyPlatformPageChrome();
                        }
                    }
                    else if (op.overlayMode)
                    {
                        // OVERLAY present (#225): the view is already attached + painted —
                        // showing it is a property flip, nothing re-attaches, nothing can
                        // repaint blank. Content stays hosted in the stage until close.
                        op.stage.InputTransparent = false;
                        op.stage.Opacity = 1;
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
                            // and tear the hidden WebView down.
                            op.target.Dispose();
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

        private void attachKeyboardInsetObserver()
        {
            if (loadedHtmlFileName != "chat.html" || kbChangeObserver != null)
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
                    sendMessage("window.__setKbInset && window.__setKbInset(" + (int)overlap + ")");
                }
                catch { }
            });
            kbHideObserver = UIKeyboard.Notifications.ObserveWillHide((sender, e) =>
            {
                try { sendMessage("window.__setKbInset && window.__setKbInset(0)"); } catch { }
            });
        }

        private void detachKeyboardInsetObserver()
        {
            try { kbChangeObserver?.Dispose(); } catch { }
            try { kbHideObserver?.Dispose(); } catch { }
            kbChangeObserver = null;
            kbHideObserver = null;
        }
#endif

        public void Dispose()
        {
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
                closeOverlay(overlayOp);
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

            MainThread.BeginInvokeOnMainThread(async () =>
            {
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
                for (int i = overlays.Count - 1; i >= 0; i--)
                {
                    closeOverlay(overlays[i]);
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
    }
}