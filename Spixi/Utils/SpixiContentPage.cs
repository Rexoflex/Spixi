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
                case "wallet_sent.html":
                case "wallet_contact_request.html":
                case "address.html":
                    return ThemeManager.getBackgroundColor();
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

        // Platform page chrome (safe-area padding + themed page background). Called at
        // the historical point (webViewNavigated → checkIfPageLoaded) AND re-applied
        // after a load-then-move present: for a preloaded page the historical call runs
        // while the page is staged off-screen, where iOS SafeAreaInsets() reads ZERO —
        // without the re-apply every preloaded page would render under the notch (audit M2).
        internal void applyPlatformPageChrome()
        {
#if IOS || MACCATALYST
            var insets = this.On<iOS>().SafeAreaInsets();

            // Apply padding to the page itself
            this.Padding = new Thickness(0, insets.Top, 0, 10);

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
            public string? tag = null;
            public int column = -1;
            // Chained navigation (AppNew → AppDetails): the page to close/remove only
            // AFTER this one is visible — never a gap, never an orphaned overlay.
            public SpixiContentPage? replaces = null;
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

        public static void setOverlayHost(SpixiContentPage host)
        {
            List<PreloadOp> stale;
            lock (preloadLock)
            {
                stale = new List<PreloadOp>(overlayStack);
                overlayStack.Clear();
                overlayHost = host;
            }
            // A re-created host (HomePage singleton reset) orphans previous overlays —
            // tear their WebViews down defensively.
            foreach (PreloadOp op in stale)
            {
                try { op.target.Dispose(); } catch { }
            }
        }

        public static SpixiContentPage? getTopOverlay()
        {
            lock (preloadLock)
            {
                return overlayStack.Count > 0 ? overlayStack[overlayStack.Count - 1].target : null;
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
            lock (preloadLock)
            {
                overlayStack.Remove(op);
                host = overlayHost;
            }
            MainThread.BeginInvokeOnMainThread(() =>
            {
                try
                {
                    op.hostGrid.Children.Remove(op.stage);
                    op.stage.Content = null;
                    op.target.Content = op.targetContent;   // reattach for a clean Dispose
                    op.target.Dispose();                    // tear the WebView down
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
        public void pushPageLoaded(SpixiContentPage target, int timeoutMs = 4000, string? tag = null, int column = -1, SpixiContentPage? replaces = null)
        {
            lock (preloadLock)
            {
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
                };

                PreloadOp op = new PreloadOp(hostPage, target, stage, targetContent, hostGrid);
                op.overlayMode = overlayMode;
                op.tag = tag;
                op.column = column;
                op.replaces = replaces;

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

                        // Same-tag replacement (chat switching): close the previous
                        // overlay of this tag only AFTER the new one is visible —
                        // a seamless swap with no intermediate frame.
                        if (op.tag != null)
                        {
                            List<PreloadOp> stale;
                            lock (preloadLock)
                            {
                                stale = overlayStack.FindAll(o => o != op && o.tag == op.tag);
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
                    try { op.target.Dispose(); } catch { }
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

        public void displayCallBar(byte[] session_id, string text, long call_started_time)
        {
            if (_webView == null)
            {
                return;
            }
            MainThread.BeginInvokeOnMainThread(() =>
            {
                Utils.sendUiCommand(this, "displayCallBar", Crypto.hashToString(session_id), text, call_started_time.ToString());
            });
        }

        public void hideCallBar()
        {
            if (_webView == null)
            {
                return;
            }
            MainThread.BeginInvokeOnMainThread(() =>
            {
                Utils.sendUiCommand(this, "hideCallBar");
            });
        }

        public void displayAppRequests()
        {
            if (_webView == null)
            {
                return;
            }
            Utils.sendUiCommand(this, "clearAppRequests");
            var app_pages = Node.MiniAppManager.getAppPages();
            lock (app_pages)
            {
                foreach (MiniAppPage page in app_pages.Values)
                {
                    if (page.accepted)
                    {
                        continue;
                    }
                    Friend f = page.friendOrGroup;
                    MiniApp app = Node.MiniAppManager.getApp(page.appId);
                    string text = string.Format(SpixiLocalization._SL("global-app-wants-to-use"), f.nickname, app.name);
                    Utils.sendUiCommand(this, "addAppRequest", Crypto.hashToString(page.sessionId), text, SpixiLocalization._SL("global-app-accept"), SpixiLocalization._SL("global-app-reject"));
                }
                if (VoIPManager.isInitiated())
                {
                    if (VoIPManager.currentCallAccepted)
                    {
                        if (VoIPManager.currentCallCalleeAccepted)
                        {
                            displayCallBar(VoIPManager.currentCallSessionId, SpixiLocalization._SL("global-call-in-call") + " - " + VoIPManager.currentCallContact.nickname, VoIPManager.currentCallStartedTime);
                        }
                        else
                        {
                            displayCallBar(VoIPManager.currentCallSessionId, SpixiLocalization._SL("global-call-dialing") + " " + VoIPManager.currentCallContact.nickname + "...", 0);
                        }
                    }
                    else
                    {
                        Friend f = VoIPManager.currentCallContact;
                        string text = SpixiLocalization._SL("global-call-incoming") + " - " + f.nickname;
                        Utils.sendUiCommand(this, "addCallAppRequest", f.walletAddress.ToString(), Crypto.hashToString(VoIPManager.currentCallSessionId), text);
                    }
                }
            }
        }

        public void onAppAccept(Address sender_address, string session_id)
        {
            byte[] b_session_id = Crypto.stringToHash(session_id);
            if (VoIPManager.hasSession(b_session_id))
            {
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
                VoIPManager.rejectCall(b_session_id);
                return;
            }
            Node.MiniAppManager.rejectAppRequest(sender_address, b_session_id);
        }

        public virtual void updateScreen()
        {
            if (UIHelpers.refreshAppRequests)
            {
                displayAppRequests();
                UIHelpers.refreshAppRequests = false;
            }
        }

        public virtual void onResume()
        {

        }

        protected override void OnAppearing()
        {
            base.OnAppearing();
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
                string session_id = url.Substring("ixian:hangUp:".Length);
                VoIPManager.hangupCall(Crypto.stringToHash(session_id));
            }
            else
            {
                return false;
            }
            return true;
        }

        public void Dispose()
        {
            try
            {
                if (!Navigation.NavigationStack.Contains(this))
                {
                    pageLoaded = false;
                    messageQueue.Clear();

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