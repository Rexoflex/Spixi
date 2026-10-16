using Microsoft.Maui.Handlers;
using Microsoft.UI.Xaml.Controls;
using Microsoft.Web.WebView2.Core;
using SPIXI;
using System.Text.RegularExpressions;

namespace Spixi.Platforms.Windows
{
    public class WindowsWebViewHandler : WebViewHandler
    {
        protected override void ConnectHandler(WebView2 platformView)
        {
            base.ConnectHandler(platformView);

            void AttachWebResourceRequested(CoreWebView2 core)
            {
                // Add filter for all resources
                core.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All, CoreWebView2WebResourceRequestSourceKinds.All);

                // Prevent multiple subscriptions
                core.WebResourceRequested -= CoreWebView2_WebResourceRequested;
                core.WebResourceRequested += CoreWebView2_WebResourceRequested;

                dropMiniAppPrivileges(core);   // ★ Session Safety (O-02, P37)
            }

            if (platformView.CoreWebView2 != null)
            {
                AttachWebResourceRequested(platformView.CoreWebView2);
            }
            else
            {
                platformView.CoreWebView2Initialized += (s, e) =>
                {
                    if (platformView.CoreWebView2 != null)
                        AttachWebResourceRequested(platformView.CoreWebView2);
                };
            }
        }

        /* ★ Session Safety (O-02, P37): the ClassId="miniapp" marker (Pages/MiniApps/MiniAppPage.xaml — third-party
         * publisher code) is read on Android (WebViewRenderer) and iOS / Mac (iOSWebViewHandler), and Windows read it
         * nowhere: a mini app got DevTools, every permission prompt (mic / camera / clipboard / location) and window.open
         * like a shell. Flag ON + the marker: DevTools off (SpixiContentPage.webViewNavigating, which sets the switch on
         * every navigation, keeps it off for this WebView), host objects refused, every PermissionRequested denied, every
         * NewWindowRequested handled with no window. DROPS only — nothing is granted.
         * NOT dropped, on purpose: scripts and IsWebMessageEnabled. The mini-app bridge is `location.href = "ixian:…"`
         * (MiniAppPage.onNavigating, the MAUI Navigating event) one way and EvaluateJavaScriptAsync
         * (SpixiContentPage → ExecuteScriptAsync) the other; it never uses host objects or web messages, and turning
         * scripts off would end every mini app.
         * The marker is read off the VIRTUAL view (ClassId is a MAUI concept; set by XAML in InitializeComponent, before
         * the handler exists), at the moment the CoreWebView2 exists. No VirtualView → no drop: that is today's
         * behaviour for every WebView, so this can only remove an exposure. Flag OFF / every other WebView = today. */
        private void dropMiniAppPrivileges(CoreWebView2 core)
        {
            if (!SpixiFlags.WinAppMarker)
            {
                return;
            }
            var element = VirtualView as global::Microsoft.Maui.Controls.WebView;
            if (element == null || !SafetyRules.isMiniAppMarker(element.ClassId))
            {
                return;
            }
            core.Settings.AreDevToolsEnabled = false;
            core.Settings.AreHostObjectsAllowed = false;
            core.PermissionRequested -= MiniApp_PermissionRequested;
            core.PermissionRequested += MiniApp_PermissionRequested;
            core.NewWindowRequested -= MiniApp_NewWindowRequested;
            core.NewWindowRequested += MiniApp_NewWindowRequested;
            core.DownloadStarting -= MiniApp_DownloadStarting;   // ★ #46 r1 (R2 MINOR-5): Android / iOS parity — a mini app saves nothing
            core.DownloadStarting += MiniApp_DownloadStarting;
        }

        // ★ Session Safety (O-02, #46 r1): a mini-app download is cancelled — no silent file in the user's Downloads folder.
        private void MiniApp_DownloadStarting(object? sender, CoreWebView2DownloadStartingEventArgs args)
        {
            args.Cancel = true;
        }

        // ★ Session Safety (O-02): a mini app never gets a device permission on Windows (no prompt, no grant).
        private void MiniApp_PermissionRequested(object? sender, CoreWebView2PermissionRequestedEventArgs args)
        {
            args.State = CoreWebView2PermissionState.Deny;
        }

        // ★ Session Safety (O-02): window.open / target=_blank from a mini app opens nothing (Handled, no NewWindow).
        private void MiniApp_NewWindowRequested(object? sender, CoreWebView2NewWindowRequestedEventArgs args)
        {
            args.Handled = true;
        }

        private void CoreWebView2_WebResourceRequested(object? sender, CoreWebView2WebResourceRequestedEventArgs args)
        {
            var uri = args.Request.Uri;
            if (!Utils.IsAllowedURL(uri))
            {
                // Block by providing an empty response
                var env = (sender as CoreWebView2)?.Environment;
                if (env != null)
                    args.Response = env.CreateWebResourceResponse(null, 403, "Blocked", "");
            }
        }
    }
}