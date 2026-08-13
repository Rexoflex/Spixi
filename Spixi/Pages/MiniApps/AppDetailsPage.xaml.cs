using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using SPIXI.Lang;
using SPIXI.Meta;
using SPIXI.MiniApps;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

namespace SPIXI
{
    [XamlCompilation(XamlCompilationOptions.Compile)]
    public partial class AppDetailsPage : SpixiContentPage
    {
        string appId = null;

        MiniApp fetchedApp = null;

        Friend? friendOrGroup = null;

        private bool shouldReloadDetailView = false;

        private string? path = null;

        private bool installing = false;

        public AppDetailsPage(string app_id, string? path = null, bool installing = false)
        {
            InitializeComponent();

            appId = app_id;
            this.path = path;
            this.installing = installing;

            NavigationPage.SetHasNavigationBar(this, false);

            loadPage(webView, "app_details.html");
        }

        public AppDetailsPage(MiniApp app, string? path = null, bool installing = false, Friend? friendOrGroup = null, bool shouldReloadDetailView = false)
        {
            InitializeComponent();

            this.friendOrGroup = friendOrGroup;
            this.shouldReloadDetailView = shouldReloadDetailView;
            fetchedApp = app;
            this.path = path;
            this.installing = installing;

            NavigationPage.SetHasNavigationBar(this, false);

            loadPage(webView, "app_details.html");
        }

        public override void recalculateLayout()
        {
            ForceLayout();
        }

        protected override void OnAppearing()
        {
            base.OnAppearing();
        }


        protected override void OnDisappearing()
        {
            webView = null;
            base.OnDisappearing();
        }

        private void onNavigating(object sender, WebNavigatingEventArgs e)
        {
            string current_url = HttpUtility.UrlDecode(e.Url);
            e.Cancel = true;

            if (onNavigatingGlobal(current_url))
            {
                return;
            }

            if (current_url.StartsWith("ixian:onload", StringComparison.Ordinal))
            {
                onLoad();
            }
            else if (current_url.Equals("ixian:back", StringComparison.Ordinal))
            {
                onBack();
            }
            else if (current_url.StartsWith("ixian:install", StringComparison.Ordinal))
            {
                onInstall();
            }
            else if (current_url.StartsWith("ixian:uninstall", StringComparison.Ordinal))
            {
                onUninstall();
            }
            else if (current_url.StartsWith("ixian:details", StringComparison.Ordinal))
            {
                onDetails();
            }
            else if (current_url.StartsWith("ixian:startApp:", StringComparison.Ordinal))
            {
                string appId = current_url.Substring("ixian:startApp:".Length);
                onStartApp(appId);
            }
            else if (current_url.StartsWith("ixian:startAppMulti:", StringComparison.Ordinal))
            {
                string appId = current_url.Substring("ixian:startAppMulti:".Length);
                onStartAppMulti(appId);
            }
            else
            {
                // Otherwise it's just normal navigation
                e.Cancel = false;
                return;
            }
            e.Cancel = true;
        }

        private void onNavigated(object sender, WebNavigatedEventArgs e)
        {
            // Deprecated due to WPF, use onLoad
        }

        private void onLoad()
        {
            MiniApp app = fetchedApp;
            string icon = null;
            if (app == null)
            {
                app = Node.MiniAppManager.getApp(appId);
                icon = Node.MiniAppManager.getAppIconPath(appId);
            }
            else
            {
                appId = app.id;
                icon = app.image;
            }


            if(icon == null)
            {
                icon = "";
            }
            icon = Utils.imageToDataUri(icon);   // X1 (local icon path → data-URI; http remote-icon URL passes through)

            var app_list = Node.MiniAppManager.getInstalledApps();
            bool app_installed = app_list.ContainsKey(appId);
            bool app_verified = false;

            Utils.sendUiCommand(this, "init", 
                app.name, 
                icon, app.publisher, 
                app.description, 
                app.version, 
                app.url, 
                Utils.bytesToHumanFormatString(app.contentSize), 
                app.getCapabilitiesAsString(), 
                appId,
                app.hasCapability(MiniAppCapabilities.SingleUser).ToString(),
                app.hasCapability(MiniAppCapabilities.MultiUser).ToString(), 
                installing ? "false" : app_installed.ToString(),
                app_verified.ToString(),
                (true).ToString());

            // Execute timer-related functionality immediately
            updateScreen();
        }

        private void onInstall()
        {
            if(fetchedApp == null)
            {
                return;
            }

            Utils.sendUiCommand(this, "showInstalling");
            Task.Run(() =>
            {
                if (path == null)
                {
                    string app_name = Node.MiniAppManager.installFromUrl(fetchedApp);
                    if (app_name != null)
                    {
                        UIHelpers.shouldRefreshApps = true;
                        Utils.sendUiCommand(this, "showInstallSuccess");
                    }
                    else
                    {
                        Utils.sendUiCommand(this, "showInstallFailed");
                    }
                }
                else
                {
                    string app_name = Node.MiniAppManager.installFromPath(path);
                    if (app_name != null)
                    {
                        UIHelpers.shouldRefreshApps = true;
                        Utils.sendUiCommand(this, "showInstallSuccess");
                    }
                    else
                    {
                        Utils.sendUiCommand(this, "showInstallFailed");
                    }

                    if (File.Exists(path))
                    {
                        File.Delete(path);
                    }
                }
            });
        }

        private void onUninstall()
        {
            if(Node.MiniAppManager.remove(appId))
            {
                Utils.sendUiCommand(this, "showAppRemoved");
                shouldReloadDetailView = true;
            }
            else
            {
                displaySpixiAlert(SpixiLocalization._SL("app-details-dialog-title"), SpixiLocalization._SL("app-details-dialog-removefailed-text"), SpixiLocalization._SL("global-dialog-ok"));
                popPageAsync();
            }
            UIHelpers.shouldRefreshApps = true;
        }

        private void onDetails()
        {
            MiniApp app = Node.MiniAppManager.getApp(appId);
            if (app == null)
            {
                return;
            }

            app.image = Node.MiniAppManager.getAppIconPath(appId);

            // #225: replaces=this — close this details overlay only after the refreshed
            // one is visible (reviewer MAJOR fix).
            pushPageLoaded(new AppDetailsPage(app, null, false, friendOrGroup, true), replaces: this);
}

        // Executed every second
        public override void updateScreen()
        {

        }

        private void onBack()
        {
            popPageAsync();
            if (shouldReloadDetailView)
            {
                reloadDetailView();
            }
        }

        protected override bool OnBackButtonPressed()
        {
            onBack();

            return true;
        }

        public void onStartApp(string appId)
        {
            MiniAppPage miniAppPage = new MiniAppPage(appId, IxianHandler.getWalletStorage().getPrimaryAddress(), null, Node.MiniAppManager.getAppEntryPoint(appId));
            miniAppPage.accepted = true;
            Node.MiniAppManager.addAppPage(miniAppPage);

            MainThread.BeginInvokeOnMainThread(() =>
            {
                hostNav.PushAsync(miniAppPage, Config.defaultXamarinAnimations);   // #225: root nav
            });
        }

        private void onStartAppMulti(string appId)
        {
            if (friendOrGroup != null)
            {
                onJoinApp(appId, friendOrGroup);
                return;
            }

            // Damir 2026-08-13: the multi-user launch must use the REDESIGNED picker
            // (the one group creation uses), not the legacy WalletRecipientPage. This
            // page has no contacts roster of its own, so it hands the pick to the home
            // shell, which owns the roster and answers with
            // ixian:startappwith:<appId>:|<addr>… (HomePage.onStartAppWith).
            //
            // ★ W9-③ (Damir, Windows F5 2026-08-13): "the selection from app details
            // closes the app details pane and returns to chat." HAND OFF FIRST, TEAR
            // DOWN SECOND. The old order called popPageAsync() before the hand-off,
            // and popPageAsync is not a plain call: for an overlay-mode page (#225 —
            // which is how HomePage.onAppDetails presents this one, pinned to the
            // detail column on a wide window) it enters closeOverlay, which queues a
            // main-thread continuation that hides the stage, waits, detaches it and
            // Disposes THIS page. Issuing the pick request after arming that teardown
            // means the request rides the same main-thread queue as our own disposal
            // — and on the iOS branch closeOverlay awaits a 250 ms slide-out first.
            // Nothing about "close this pane" needs to happen before "open that
            // picker", and the visible consequence of the old order is exactly what
            // Damir describes: the pane goes, the detail column falls back to the
            // conversation behind it, and the launch does not visibly continue.
            // Both calls stay in ONE main-thread delegate so the order is fixed.
            HomePage? home = HomePage.InstanceOrNull();
            if (home != null)
            {
                MainThread.BeginInvokeOnMainThread(() =>
                {
                    home.pickAppTargets(appId);   // the picker must exist before this page can go
                    popPageAsync();               // #225-aware: closes this overlay/page
                });
                return;
            }

            // No live home shell (should not happen — this page is opened from it):
            // fall back to the legacy native picker rather than dropping the launch.
            var recipientPage = new WalletRecipientPage(false, false);
            recipientPage.pickSucceeded += (sender, e) =>
            {
                HandlePickAppMultiUserSucceeded(sender, e.Value.Item1, appId);
            };

            MainThread.BeginInvokeOnMainThread(() =>
            {
                hostNav.PushAsync(recipientPage, Config.defaultXamarinAnimations);   // #225: root nav
            });
        }

        private async void HandlePickAppMultiUserSucceeded(object? sender, List<ExtendedAddress> e, string appId)
        {
            Address address = e.First().RoutingAddress;
            Friend? friend = FriendList.getFriend(address);

            if (friend == null)
            {
                return;
            }

            try
            {
                popPageAsync();

                byte[] session_id = onJoinApp(appId, friend);

                var app_info = Node.MiniAppManager.getAppInfo(appId);
                var msg_id = StreamProcessor.sendAppRequest(friend, appId, session_id, null, app_info);
                FriendList.addMessageWithType(msg_id, FriendMessageType.appSession, friend.walletAddress, 0, app_info, true, null, 0, false);
            }
            catch (Exception ex)
            {
                Logging.error("Navigation failed: " + ex.Message);
            }
        }

        public byte[] onJoinApp(string appId, Friend friendOrGroup)
        {
            MiniAppPage miniAppPage = new MiniAppPage(appId, IxianHandler.getWalletStorage().getPrimaryAddress(), friendOrGroup, Node.MiniAppManager.getAppEntryPoint(appId));
            miniAppPage.accepted = true;
            Node.MiniAppManager.addAppPage(miniAppPage);

            MainThread.BeginInvokeOnMainThread(async () =>
            {
                await Task.Delay(200); // WinUI Crash fix
                await hostNav.PushAsync(miniAppPage, Config.defaultXamarinAnimations);   // #225: root nav
            });

            return miniAppPage.sessionId;
        }
        private void reloadDetailView()
        {
            Page page = Application.Current.MainPage.Navigation.NavigationStack.Last();
            if (page != null && page is HomePage)
            {
                ((HomePage)page).removeDetailContent();
            }
        }
    }
}