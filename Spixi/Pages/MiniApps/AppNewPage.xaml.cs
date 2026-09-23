using IXICore.Meta;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using Spixi;
using SPIXI.Interfaces;
using SPIXI.Meta;
using SPIXI.MiniApps;
using System;
using System.IO;
using System.Linq;
using System.Web;

namespace SPIXI
{
    [XamlCompilation(XamlCompilationOptions.Compile)]
    public partial class AppNewPage : SpixiContentPage
    {
        public AppNewPage()
        {
            InitializeComponent();

            NavigationPage.SetHasNavigationBar(this, false);

            loadPage(webView, "app_new.html");
        }

        /* ★ Session K [CDPERF] — TEMPORARY, the Add-app OPEN instrument (#757 ②, Damir: "the
         * Add-app screen stutters on open, as the messages used to", after adding 7 apps).
         * #757's guess — the Discover feed + recents strip mounting in one frame — is not in
         * the tree: app_new.html builds with `discover: false` and C#'s onLoad pushes nothing,
         * so the shell paints one form. MEASURE before any fix (#215): the same three stamps
         * the chat carries — constructor → onload → present — plus the Android Choreographer
         * frame probe for the 600 ms after present. Fixed words + integers; retire with the set. */
        private readonly System.Diagnostics.Stopwatch openClock = System.Diagnostics.Stopwatch.StartNew();
        private static void cdperf(string what, string detail = "")
        {
            IXICore.Meta.Logging.info("[CDPERF] appnew " + what + (detail.Length > 0 ? " " + detail : ""));
        }
        protected internal override void onPreloadPresented()
        {
            cdperf("present", "t=" + openClock.ElapsedMilliseconds);
#if ANDROID
            try { SingleChatPage.CdperfFrameProbe.start(openClock, "appnew"); }
            catch (Exception ex) { Logging.warn("[CDPERF] appnew frame probe failed to start: " + ex.Message); }
#endif
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
                cdperf("onload", "t=" + openClock.ElapsedMilliseconds);   // ★ Session K [CDPERF]
                onLoad();
            }
            else if (current_url.Equals("ixian:back", StringComparison.Ordinal))
            {
                onBack();
            }
            else if (current_url.Equals("ixian:quickscan", StringComparison.Ordinal))
            {
                quickScan();
            }
            else if (current_url.Contains("ixian:qrresult:"))
            {
                string[] split = current_url.Split(new string[] { "ixian:qrresult:" }, StringSplitOptions.None);
                string result = split[1];
                processQRResult(result);
                e.Cancel = true;
                return;
            }
            else if (current_url.StartsWith("ixian:fetch:"))
            {
                string url = current_url.Substring("ixian:fetch:".Length);
                onFetch(url);
            }
            else if (current_url.StartsWith("ixian:selectAppFile"))
            {
                onSelectAppFile();
            }
            else if (current_url.Trim().StartsWith("file:", StringComparison.OrdinalIgnoreCase))
            {
                // allow normal navigation only for local files
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
            // Execute timer-related functionality immediately
            updateScreen();
        }

        // Executed every second
        public override void updateScreen()
        {

        }

        public async void quickScan()
        {
            var scanPage = new ScanPage();
            scanPage.scanSucceeded += HandleScanSucceeded;
            await hostNav.PushAsync(scanPage, Config.defaultXamarinAnimations);   // #225: root nav
        }

        private void HandleScanSucceeded(object sender, SPIXI.EventArgs<string> e)
        {
            string mini_app_install_url = e.Value;
            processQRResult(mini_app_install_url);
        }

        public void processQRResult(string result)
        {
            if (result.Contains(":ixi"))
            {
                string[] split = result.Split(new string[] { ":ixi" }, StringSplitOptions.None);
                if (split.Count() < 1)
                    return;
                string appUrl = split[0];
                Utils.sendUiCommand(this, "setScannedData", appUrl);
            }
            else
            {
                string appUrl = result;
                // TODO: enter exact Ixian address length
                if (appUrl.Length > 20 && appUrl.Length < 128)
                    Utils.sendUiCommand(this, "setScannedData", appUrl);
            }

        }

        private async void onSelectAppFile()
        {
            var (outcome, picked) = await pickAppFileCore();
            if (outcome == PickAppOutcome.Cancelled)
            {
                // walk A12: dismissing the picker changes nothing. It is not an answer about
                // the link, so the screen must not give one.
                return;
            }
            if (picked == null)
            {
                Utils.sendUiCommand(this, "showUrlError");
                return;
            }
            // #225: replaces=this — the machinery closes THIS page only after the details
            // screen is visible (no gap, no orphaned overlay stage).
            pushPageLoaded(new AppDetailsPage(picked.app, picked.filepath, true), replaces: this);
        }

        /* ★★ Session T — ONE TRUTH FOR "ADD AN APP", because two hosts now run it.
         * The home shell hosts the same screen in ITS OWN WebView (no page push, no cold
         * Chromium boot — Damir reported the stutter twice; the [CDPERF] instrument above
         * was added for exactly this complaint). Same pattern as
         * `ContactNewPage.addContactCore` and `BackupPage.backupAccount()` (#243/S15): the
         * core lives with the page that owns the domain, and each host presents it.
         * ⚠ NOTHING NEW HAPPENS HERE. The fetch, the temp file and the parse are the code
         * that already ran on this page — only the caller can differ. Logged in the
         * handover gate as a RELOCATION, not a new capability. */
        public sealed class PickedApp
        {
            public MiniApp app = null!;
            public string? filepath = null;
        }

        public static async System.Threading.Tasks.Task<MiniApp?> fetchAppCore(string url)
        {
            var (app, _) = await fetchAppCoreWithReason(url);
            return app;
        }

        /// <summary>★ A4 (Session AD): the fetch plus WHY it failed, for `showUrlError(reason)`.</summary>
        public static async System.Threading.Tasks.Task<(MiniApp? app, string reason)> fetchAppCoreWithReason(string url)
        {
            var (app, failure) = await Node.MiniAppManager.fetchWithReason(url);
            if (app == null)
            {
                return (null, MiniAppManager.fetchFailureName(failure));
            }
            app.url = url;
            return (app, "");
        }

        /* ★★ Session T walk A12 — CANCEL IS NOT A FAILURE, and it used to be.
         * The old core returned null for both, and the call site said so in as many words:
         * "Cancel and failure are indistinguishable to the core, and always were." That was
         * survivable on this standalone page, where the error landed on a screen the user was
         * leaving anyway. In the shell it is what Damir hit — dismiss the file picker and the
         * Add-app panel accuses you of a bad link you never typed. A comment that documents a
         * defect is still a defect (#772), so the distinction is made here, once, and both
         * hosts answer it on their own terms.
         * ⚠ ONLY a null from the picker is a dismiss. A throw is a real read failure and the
         * user is still told; folding the two back together is the regression GATE 56 exists
         * for. The temp file is cleaned up on the failure paths exactly as before. */
        public enum PickAppOutcome { Picked, Cancelled, Failed }

        public static async System.Threading.Tasks.Task<(PickAppOutcome outcome, PickedApp? picked)> pickAppFileCore()
        {
            string name = "";
            byte[]? _data = null;
            try
            {
                SpixiImageData fileData = await SFilePicker.PickFileAsync();
                if (fileData == null)
                {
                    return (PickAppOutcome.Cancelled, null);   // the picker was dismissed
                }

                var stream = fileData.stream;
                _data = new byte[stream.Length];
                stream.Read(_data, 0, (int)stream.Length);
                name = fileData.name;
            }
            catch (Exception ex)
            {
                // Gate 18: a type name cannot carry a filename or a payload.
                Logging.error("pickAppFileCore: " + ex.GetType().Name);
                return (PickAppOutcome.Failed, null);
            }

            if (_data == null)
            {
                return (PickAppOutcome.Failed, null);
            }

            string filepath = Path.Combine(Node.MiniAppManager.tmpPath, name + ".tmp");
            try
            {
                File.WriteAllBytes(filepath, _data);
                MiniApp app = Node.MiniAppManager.extractAppInfo(filepath);
                if (app != null)
                {
                    return (PickAppOutcome.Picked, new PickedApp { app = app, filepath = filepath });
                }
                if (File.Exists(filepath))
                {
                    File.Delete(filepath);
                }
                return (PickAppOutcome.Failed, null);   // a file was chosen; it is not an app
            }
            catch (Exception ex)
            {
                Logging.error("Exception caught in process: {0}", ex);
                if (File.Exists(filepath))
                {
                    File.Delete(filepath);
                }
                return (PickAppOutcome.Failed, null);
            }
        }

        private async void onFetch(string url)
        {
            var (app, reason) = await fetchAppCoreWithReason(url);
            if (app == null)
            {
                Utils.sendUiCommand(this, "showUrlError", reason);   // ★ A4: the reason, appended
                return;
            }

            // #225: replaces=this (see onSelectAppFile).
            pushPageLoaded(new AppDetailsPage(app, null, true), replaces: this);
        }

        private void onBack()
        {
            popPageAsync();
        }

        protected override bool OnBackButtonPressed()
        {
            onBack();

            return true;
        }
    }
}