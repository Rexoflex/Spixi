using System;
using System.Runtime.InteropServices;
using Microsoft.Maui.ApplicationModel;   // MainThread + Browser (iOS-10 handoff)
using Microsoft.Maui.Handlers;
using Microsoft.Maui.Platform;
using UIKit;
using WebKit;

namespace Spixi.Platforms.iOS
{
    class SecureNavigationDelegate : MauiWebViewNavigationDelegate
    {
        public SecureNavigationDelegate(WebViewHandler handler) : base(handler)
        {
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

    public class iOSWebViewHandler : WebViewHandler
    {
        static bool _swizzled;

        protected override void ConnectHandler(WKWebView platformView)
        {
            base.ConnectHandler(platformView);

            //var previousDelegate = platformView.NavigationDelegate;
            platformView.NavigationDelegate = new SecureNavigationDelegate(this);

            platformView.ScrollView.ContentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentBehavior.Never;
            platformView.ScrollView.ScrollEnabled = false;
            platformView.ScrollView.Bounces = false;

            // Enable inspection for debugging
            //platformView.Inspectable = true;

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
