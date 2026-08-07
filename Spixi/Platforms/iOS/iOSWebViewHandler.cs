using System;
using System.Runtime.InteropServices;
using Foundation;                        // #310: NSObject + [Export] for the explicit UIDelegate adopter
using Microsoft.Maui.ApplicationModel;   // MainThread + Browser (iOS-10 handoff)
using Microsoft.Maui.Handlers;
using Microsoft.Maui.Platform;
using UIKit;
using WebKit;

namespace Spixi.Platforms.iOS
{
    class SecureNavigationDelegate : MauiWebViewNavigationDelegate
    {
        readonly iOSWebViewHandler? _owner;   // #311: reach the handler's UIDelegate root for the runtime probe/re-assert
        bool _udProbed;                       // one-shot per WebView
        int _reassertLogged;                  // #312: log the first heals only, never spam

        public SecureNavigationDelegate(WebViewHandler handler) : base(handler)
        {
            _owner = handler as iOSWebViewHandler;
        }

        public override void DecidePolicy(WKWebView webView, WKNavigationAction navigationAction, Action<WKNavigationActionPolicy> decisionHandler)
        {
            // iOS bring-up 2026-07-22 (sim crash, 20:37 report): a managed exception escaping this
            // WebKit callback is an uncaught NSException -> abort. Guard + log; fail closed (Cancel).
            // #273-#281 review C1: WebKit raises a NATIVE NSException when a decision handler
            // runs twice, and the managed catch cannot intercept that — track whether a
            // decision was already delivered so the fail-closed Cancel never double-fires
            // (base.DecidePolicy may have decided before throwing).
            bool decided = false;
            Action<WKNavigationActionPolicy> decide = policy => { if (decided) return; decided = true; decisionHandler(policy); };
            try
            {
                var url = navigationAction.Request.Url?.AbsoluteString ?? "";

                /* #312 (device round 4, 2026-08-07): fork (a) CONFIRMED — the mic probe logged
                 * `[cam-perm] invoked` on the SAME WebView whose boot camera request had just
                 * prompted, so the delegate works once re-asserted; something in MAUI's
                 * post-connect property sync swaps UIDelegate, and the #311 first-ixian heal
                 * RACES the scan shell's boot getUserMedia (auto-enter fires in the same JS
                 * task that emits ixian:onload — two IPCs, warm entries lose, cold launches
                 * win — exactly the observed fresh-OK / re-entry-prompts split). The heal now
                 * runs on EVERY navigation, which includes the MAIN-FRAME file:// load: that
                 * one fires before the page even parses, so it deterministically precedes any
                 * page JS. Cost: one native property read per bridge nav. The log vocabulary
                 * is FIXED ("load"/"ixian:*") — never interpolate a raw URL into an eval. */
                if (_owner != null && !(webView.UIDelegate is MediaCaptureUIDelegate))
                {
                    webView.UIDelegate = _owner.EnsureUiDelegate();
                    if (_reassertLogged < 2)
                    {
                        _reassertLogged++;
                        var rm = "[cam-perm] reasserted at nav " + (url.StartsWith("ixian:", StringComparison.OrdinalIgnoreCase) ? "ixian:*" : "load");
                        try { webView.EvaluateJavaScript("try{console.error('" + rm + "')}catch(e){}", null); } catch { }
                        try { IXICore.Meta.Logging.info(rm); } catch { }
                    }
                }

                /* #311 (device round 3, 2026-08-07): the [cam-perm] delegate has provably never
                 * been consulted (a FRESH mic getUserMedia prompted WebKit's own dialog with no
                 * [cam-perm] line) — with the delegate strong-rooted AND explicitly exported.
                 * Remaining forks: (a) something re-assigns UIDelegate after ConnectHandler
                 * (MAUI internals), (b) the selector never registered, (c) WebKit stopped
                 * consulting this API. This one-shot runs at the page's FIRST bridge navigation
                 * — the page is alive and it lands right BEFORE the scan shell's auto-enter
                 * getUserMedia — logs the RUNTIME UIDelegate identity + respondsToSelector,
                 * and if the delegate is not ours RE-ASSERTS it (= the fix, if fork (a)). */
                if (!_udProbed && url.StartsWith("ixian:", StringComparison.OrdinalIgnoreCase))
                {
                    _udProbed = true;
                    try
                    {
                        var ud = webView.UIDelegate;
                        var udName = ud == null ? "NULL" : ud.GetType().Name;
                        bool responds = false;
                        try { responds = (ud as NSObject)?.RespondsToSelector(new ObjCRuntime.Selector("webView:requestMediaCapturePermissionForOrigin:initiatedByFrame:type:decisionHandler:")) ?? false; } catch { }
                        bool reasserted = false;
                        if (!(ud is MediaCaptureUIDelegate) && _owner != null)
                        {
                            webView.UIDelegate = _owner.EnsureUiDelegate();
                            reasserted = true;
                        }
                        var msg = "[cam-perm] probe uiDelegate=" + udName + " respondsToSelector=" + responds + (reasserted ? " REASSERTED" : "");
                        try { webView.EvaluateJavaScript("try{console.error('" + msg + "')}catch(e){}", null); } catch { }
                        try { IXICore.Meta.Logging.info(msg); } catch { }
                    }
                    catch { /* diagnostics must never break navigation */ }
                }

                if (url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                    url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                {
                    // iOS-10 (#283): http/https NEVER loads in-WebView (unchanged invariant),
                    // but a REAL link tap now hands off to the OS browser — parity with
                    // Windows/redesigned flows, which route external links through
                    // Browser.OpenAsync (ixian:openLink / HomePage guide-about links).
                    // Gated on LinkActivated: only a user-gesture anchor tap qualifies —
                    // programmatic redirects, scripted location changes and subframe loads
                    // stay Cancel-blocked with no handoff (no silent IP-leak vector).
                    if (navigationAction.NavigationType == WKNavigationType.LinkActivated)
                    {
                        var external = url;
                        MainThread.BeginInvokeOnMainThread(async () =>
                        {
                            try { await Browser.Default.OpenAsync(new Uri(external)); }
                            catch (Exception oex) { IXICore.Meta.Logging.error("Browser handoff failed for '{0}': {1}", external, oex); }
                        });
                    }
                    decide(WKNavigationActionPolicy.Cancel);
                    return;
                }

                base.DecidePolicy(webView, navigationAction, decide);
            }
            catch (Exception ex)
            {
                try { IXICore.Meta.Logging.error("Exception occured in DecidePolicy for '{0}': {1}", navigationAction?.Request?.Url?.AbsoluteString, ex); } catch { }
                if (!decided) { try { decide(WKNavigationActionPolicy.Cancel); } catch { } }   // C1 (re-review R3): route through the one-shot — a deferred base continuation can no longer double-fire
            }
        }
    }

    /* iOS scan: the camera never turned on (Damir F5 2026-07-29).
     * getUserMedia() in a WKWebView does NOT reach the OS permission sheet by itself —
     * WebKit asks the WKUIDelegate via requestMediaCapturePermissionForOrigin:…, and
     * with NO UIDelegate installed that request is auto-DENIED. The shell then correctly
     * showed its "camera denied" state, so it looked like a permission refusal when in
     * fact nothing was ever asked. Info.plist already carries NSCameraUsageDescription.
     * We ask AVFoundation for the real OS permission first and mirror the user's answer
     * back to WebKit — the WebView never gets capture the user hasn't granted. */
    /* #310 (device round 2, 2026-08-07): the [Model]-subclass override was NEVER invoked on
     * device — WebKit kept showing its OWN per-origin camera prompt on every scan visit, a
     * UI that is unreachable while this delegate decides, and the r2 strong-rooting (#309)
     * changed nothing → GC was not the (sole) cause; the override simply wasn't being
     * consulted. Rebuilt as an explicit NSObject + IWKUIDelegate adopter with a
     * hand-written [Export] of WebKit's exact selector — the registrar-proof shape (this
     * app already hit two registrar bug families, #280/#281; SPushService's hand-written
     * exports with block params run fine on this same device/Debug registrar today).
     * Every invocation is OBSERVABLE (#215): entry + AVFoundation status forward into the
     * page console as [cam-perm] lines, so the #304 Inspector workflow can PROVE whether
     * WebKit consulted us — if the prompt shows and no [cam-perm] line ever logs, the
     * selector is not being called at all (next suspect: a newer WebKit delegate API
     * superseding this one on current iOS). */
    class MediaCaptureUIDelegate : NSObject, IWKUIDelegate
    {
        static void forward(WKWebView webView, string msg)
        {
            // Diagnostics into the page console (Inspector-visible) + the app log.
            try { webView?.EvaluateJavaScript("try{console.error('[cam-perm] " + msg + "')}catch(e){}", null); } catch { }
            try { IXICore.Meta.Logging.info("[cam-perm] " + msg); } catch { }
        }

        [Export("webView:requestMediaCapturePermissionForOrigin:initiatedByFrame:type:decisionHandler:")]
        public void RequestMediaCapturePermission(
            WKWebView webView,
            WKSecurityOrigin origin,
            WKFrameInfo frame,
            WKMediaCaptureType type,
            Action<WKPermissionDecision> decisionHandler)
        {
            var mediaType = type == WKMediaCaptureType.Microphone
                ? AVFoundation.AVAuthorizationMediaType.Audio
                : AVFoundation.AVAuthorizationMediaType.Video;

            var status = AVFoundation.AVCaptureDevice.GetAuthorizationStatus(mediaType);
            forward(webView, "invoked type=" + type + " avf=" + status);
            if (status == AVFoundation.AVAuthorizationStatus.Authorized)
            {
                decisionHandler(WKPermissionDecision.Grant);
                return;
            }
            if (status == AVFoundation.AVAuthorizationStatus.Denied
                || status == AVFoundation.AVAuthorizationStatus.Restricted)
            {
                decisionHandler(WKPermissionDecision.Deny);   // shell renders its denied state + Settings hint
                return;
            }

            // NotDetermined → this is the call that actually shows the OS sheet (once, ever).
            AVFoundation.AVCaptureDevice.RequestAccessForMediaType(mediaType, granted =>
            {
                MainThread.BeginInvokeOnMainThread(() =>
                {
                    forward(webView, "avf sheet answered granted=" + granted);
                    try { decisionHandler(granted ? WKPermissionDecision.Grant : WKPermissionDecision.Deny); }
                    catch (Exception ex) { IXICore.Meta.Logging.error("Media capture decision failed: {0}", ex); }
                });
            });
        }
    }

    public class iOSWebViewHandler : WebViewHandler
    {
        static bool _swizzled;

        /* #309 (device-measured 2026-08-07): WKWebView's NavigationDelegate and UIDelegate
         * are WEAK ObjC references. Assigning fresh managed objects without a strong root
         * leaves them collectable — and once the GC reaps them, WebKit silently reverts to
         * its DEFAULT behavior. Observed on the iPhone: WebKit's own per-origin camera
         * prompt ("Allow "Spixi" to use your camera?") on EVERY scan visit — impossible
         * while MediaCaptureUIDelegate lives, since it auto-grants when AVFoundation is
         * already authorized (file:// origins get no persisted WebKit grant, hence every
         * visit). The same hazard on SecureNavigationDelegate is SECURITY-relevant: a
         * collected navigation delegate removes the http/https Cancel + browser handoff
         * (remote content could then load in-WebView) — logged in
         * docs/security-review-for-be-engineer.md. These fields are the strong roots;
         * the handler lives exactly as long as its WebView. */
        SecureNavigationDelegate? _navigationDelegate;
        MediaCaptureUIDelegate? _uiDelegate;

        /* #311: the runtime probe re-asserts the UIDelegate through this (keeps the
         * strong root on the handler — never hand out an unrooted fresh instance). */
        internal IWKUIDelegate EnsureUiDelegate()
        {
            if (_uiDelegate == null) _uiDelegate = new MediaCaptureUIDelegate();
            return _uiDelegate;
        }

        protected override void ConnectHandler(WKWebView platformView)
        {
            base.ConnectHandler(platformView);

            //var previousDelegate = platformView.NavigationDelegate;
            _navigationDelegate = new SecureNavigationDelegate(this);
            _uiDelegate = new MediaCaptureUIDelegate();
            platformView.NavigationDelegate = _navigationDelegate;
            platformView.UIDelegate = _uiDelegate;   // iOS scan: without this getUserMedia is auto-denied

            platformView.ScrollView.ContentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentBehavior.Never;
            platformView.ScrollView.ScrollEnabled = false;
            platformView.ScrollView.Bounces = false;

            // F2 (#301): pinch is a CHAT-ONLY gesture (message text size). The redesigned
            // shells all clamp the viewport (minimum/maximum-scale=1, user-scalable=no),
            // which WKWebView honors — this pin is the belt for the still-legacy pages
            // (wallet_send.html, apps.html, …) that ship no clamp. The shells scroll inner
            // containers (ScrollEnabled=false above), so pinning the WebView's own zoom
            // costs nothing there. Note WebKit may re-derive zoom scales from a page's
            // viewport meta on navigation, so the meta clamp stays the primary fix; this
            // is best-effort coverage for pages without one. ⚠ Like everything in this
            // handler it is GLOBAL (MauiProgram.cs registers it for typeof(WebView)), so
            // it also pins pinch-zoom for third-party MINI-APP content — logged on
            // security-review MAJOR #6 (the trust-tier split of this handler).
            platformView.ScrollView.MinimumZoomScale = 1;
            platformView.ScrollView.MaximumZoomScale = 1;

            // Safari Web Inspector. From iOS 16.4 a WKWebView is INVISIBLE to the
            // Develop menu unless this is set — which is why the sim/device passes had
            // no console: every shell is a WebView, so without it nothing is
            // inspectable on either the simulator or hardware. DEBUG-only: a shippable
            // build must never expose its WebViews to an attached machine.
#if DEBUG
            if (OperatingSystem.IsIOSVersionAtLeast(16, 4) || OperatingSystem.IsMacCatalystVersionAtLeast(16, 4))
            {
                platformView.Inspectable = true;
            }
#endif

            // Remove the iOS keyboard accessory bar (up/down arrows and checkmark)
            var assistantItem = platformView.InputAssistantItem;
            if (assistantItem != null)
            {
                assistantItem.LeadingBarButtonGroups = Array.Empty<UIBarButtonItemGroup>();
                assistantItem.TrailingBarButtonGroups = Array.Empty<UIBarButtonItemGroup>();
            }

            // Try swizzling WKContentView's inputAccessoryView to return nil
            TrySwizzleInputAccessoryView();
        }

        protected override void DisconnectHandler(WKWebView platformView)
        {
            // #309: release the strong delegate roots with the WebView they served.
            _navigationDelegate = null;
            _uiDelegate = null;
            base.DisconnectHandler(platformView);
        }

        protected override WKWebView CreatePlatformView()
        {
            var platformView = base.CreatePlatformView();
            WKContentRuleListStore.DefaultStore.CompileContentRuleList("ContentBlockingRules",
                """
                [
                    {
                        "trigger": { "url-filter": ".*" }, 
                        "action": { "type": "block" }
                    },
                    {
                        "trigger": { "url-filter": "file://.*" },
                        "action": { "type": "ignore-previous-rules" }
                    },
                    {
                        "trigger": { "url-filter": "https://[A-Za-z0-9]+\\.tenor\\.com/[A-Za-z0-9_/=%\\?\\-\\.\\&]+" },
                        "action": { "type": "ignore-previous-rules" }
                    },
                    {
                        "trigger": { "url-filter": "https://[A-Za-z0-9]+\\.giphy\\.com/[A-Za-z0-9_/=%\\?\\-\\.\\&]+" },
                        "action": { "type": "ignore-previous-rules" }
                    },
                    {
                        "trigger": { "url-filter": "https://apps\\.spixi\\.io/[A-Za-z0-9_/=%\\?\\-\\.\\&]+" },
                        "action": { "type": "ignore-previous-rules" }
                    }
                ]
                """,
                (compiledRuleList, error) =>
                {
                    if (error == null)
                    {
                        platformView.Configuration.UserContentController.AddContentRuleList(compiledRuleList);
                    }
                });
            return platformView;
        }


        // ObjC runtime imports for method swizzling
        [DllImport("/usr/lib/libobjc.A.dylib")]
        static extern IntPtr objc_getClass(string name);
 
        [DllImport("/usr/lib/libobjc.A.dylib")]
        static extern IntPtr sel_registerName(string name);
 
        [DllImport("/usr/lib/libobjc.A.dylib")]
        static extern IntPtr class_getInstanceMethod(IntPtr cls, IntPtr sel);
 
        [DllImport("/usr/lib/libobjc.A.dylib")]
        static extern IntPtr method_getImplementation(IntPtr method);
 
        [DllImport("/usr/lib/libobjc.A.dylib")]
        static extern IntPtr method_setImplementation(IntPtr method, IntPtr imp);
 
        // Delegates must match Objective-C IMP signature: id (*IMP)(id, SEL, ...)
        // We return nil (IntPtr.Zero) for inputAccessoryView
        delegate IntPtr InputAccessoryViewDelegate(IntPtr self, IntPtr _cmd);
        static InputAccessoryViewDelegate? _returnNilDelegate;
        static IntPtr _originalImp = IntPtr.Zero;
 
        static void TrySwizzleInputAccessoryView()
        {
            if (_swizzled)
                return;
 
            try
            {
                var cls = objc_getClass("WKContentView");
                if (cls == IntPtr.Zero)
                    return;
 
                var selector = sel_registerName("inputAccessoryView");
                var method = class_getInstanceMethod(cls, selector);
                if (method == IntPtr.Zero)
                    return;
 
                _originalImp = method_getImplementation(method);
 
                _returnNilDelegate ??= new InputAccessoryViewDelegate(ReturnNil);
                var imp = Marshal.GetFunctionPointerForDelegate(_returnNilDelegate);
 
               method_setImplementation(method, imp);
                _swizzled = true;
            }
            catch
            {
                // Ignore failures (iOS internals may change)
            }
        }
 
        static IntPtr ReturnNil(IntPtr self, IntPtr _cmd) => IntPtr.Zero;
    }
}
