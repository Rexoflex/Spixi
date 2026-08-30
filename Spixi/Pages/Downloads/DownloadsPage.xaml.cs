using IXICore.Meta;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using Spixi;
using System;
using System.IO;
using System.Web;

namespace SPIXI
{
    [XamlCompilation(XamlCompilationOptions.Compile)]
    public partial class DownloadsPage : SpixiContentPage
    {

        /* ★★ L3 (Session F) — A SHEET OPEN IN THIS SHELL IS NOW A BACK LEVEL.
         * The defect: this page emitted/consumed ixian:back but never asked the shell
         * whether an overlay was up, so hardware back POPPED THE PAGE OUT FROM UNDER an
         * open modal. Identical to N50 (#370) on ContactDetails and #336 on Home; this
         * is that same grammar, not a new one — the shell mirrors its overlay state and
         * back is routed INTO the shell while it is up.
         * ★ Self-heal: the shell's downloadsBack re-syncs when nothing was actually open, so a
         * stale mirror can never wedge back. */
        private bool shellOverlayOpen = false;

        public DownloadsPage()
        {
            InitializeComponent();

            NavigationPage.SetHasNavigationBar(this, false);

            loadPage(webView, "downloads.html");
        }

        public override void recalculateLayout()
        {
            ForceLayout();
        }

        protected override void OnAppearing()
        {
            base.OnAppearing();

            onLoad();
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
            else if (current_url.StartsWith("ixian:downloadsoverlay:", StringComparison.Ordinal))
            {
                // L3: display-state only, no payload — the homeoverlay/cdoverlay grammar.
                shellOverlayOpen = current_url.EndsWith(":1", StringComparison.Ordinal);
            }
            else if (current_url.Equals("ixian:back", StringComparison.Ordinal))
            {
                onBack();
            }
            else if (current_url.StartsWith("ixian:open:"))
            {
                // Q1-② (#267): traversal guard — the WebView supplies a NAME only;
                // resolveDownloadPath rejects anything that escapes the Downloads
                // root (security-review MAJOR, user-reachable since #264/S8).
                string file_name = downloadNameFromUrl(e.Url, current_url, "ixian:open:");
                string path = TransferManager.resolveDownloadPath(file_name);
                if (path != null && File.Exists(path))
                {
                    // Q1 review (#266/#267 loop): an in-use / permission-denied file must not
                    // throw out of the navigation handler.
                    try
                    {
                        SFileOperations.open(path);
                    }
                    catch (Exception ex)
                    {
                        Logging.warn("Exception while opening a download: " + ex);
                    }
                }
            }
            else if (current_url.StartsWith("ixian:delete:"))
            {
                string file_name = downloadNameFromUrl(e.Url, current_url, "ixian:delete:");
                string path = TransferManager.resolveDownloadPath(file_name);
                if (path != null && File.Exists(path))
                {
                    // Q1 review (#266/#267 loop): a locked / read-only file threw out of the
                    // navigation handler.
                    try
                    {
                        File.Delete(path);
                    }
                    catch (Exception ex)
                    {
                        Logging.warn("Exception while deleting a download: " + ex);
                    }
                }
                // Q1 review (#266/#267 loop): refresh UNCONDITIONALLY — a rejected name or a
                // failed delete previously left the list stale and silent.
                onLoad();
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

        // Q1 review (#266/#267 loop): the download file name is PEER-SUPPLIED. onNavigating
        // decodes the url with HttpUtility.UrlDecode, which is FORM decoding: a literal '+'
        // becomes a space, and a percent-escaped decoy ("report%2Epdf") decodes onto a
        // DIFFERENT real file ("report.pdf") — Open/Delete would then act on a file the
        // confirm dialog never named. Take the name off the RAW url with
        // Uri.UnescapeDataString (%xx only). Fall back to the decoded url if a platform hands
        // back an already-normalized url without the raw prefix. The traversal guard
        // (TransferManager.resolveDownloadPath) still runs on the result, so "..%2f" stays
        // rejected (fail-closed). Mirrors SettingsPage.downloadNameFromUrl.
        // ★ CONTRACT (Q1 re-review): the shell percent-encodes the name (downloads.html:
        // encodeURIComponent) — that is the OTHER half of this fix. Decode EXACTLY ONCE.
        private static string downloadNameFromUrl(string raw_url, string decoded_url, string prefix)
        {
            if (raw_url != null && raw_url.StartsWith(prefix, StringComparison.Ordinal))
            {
                try
                {
                    return Uri.UnescapeDataString(raw_url.Substring(prefix.Length));
                }
                catch (Exception ex)
                {
                    Logging.warn("Could not unescape a download file name: " + ex);
                }
            }
            return decoded_url.Substring(prefix.Length);
        }

        private void loadFiles()
        {
            Utils.sendUiCommand(this, "clearFiles");

            // Q1 review (#266/#267 loop): Directory.Exists guard — mirrors
            // SettingsPage.loadDownloads. Nothing in the tree creates the Downloads folder,
            // so on a device that never completed an incoming transfer EnumerateFiles threw
            // DirectoryNotFoundException out of OnAppearing (DownloadsPage is the only
            // downloads path on mobile / an old exe). The shell just shows its empty state.
            if (!Directory.Exists(TransferManager.downloadsPath))
            {
                return;
            }

            foreach (var path in Directory.EnumerateFiles(TransferManager.downloadsPath))
            {
                // iOS-55/#328 (W1 class): raw epoch seconds — the downloads component
                // numeric-detects and formats via formatTxTimestamp/docLocale; the old
                // DateTime.ToString() was the .NET culture, never the app language.
                Utils.sendUiCommand(this, "addFile", Path.GetFileName(path), new DateTimeOffset(File.GetCreationTime(path)).ToUnixTimeSeconds().ToString());
            }
        }

        private void onLoad()
        {
            loadFiles();

            // Execute timer-related functionality immediately
            updateScreen();
        }

        // Executed every second
        public override void updateScreen()
        {

        }

        private void onBack()
        {
            // #264 (S8): DownloadsPage is now presented via pushPageLoaded from the
            // Account hub (overlay/pinned pane) — popPageAsync routes an overlay's
            // back to closeOverlay and a nav-pushed page to PopAsync. (No modal
            // presentation remains — both presenter branches use pushPageLoaded.)
            popPageAsync();
        }

        protected override bool OnBackButtonPressed()
        {
            // L3: a shell overlay (the three settingsConfirm dialogs this screen can open)
            // consumes back before the page pops — the order every native surface keeps.
            if (shellOverlayOpen)
            {
                Utils.sendUiCommand(this, "downloadsBack");
                return true;
            }
            onBack();

            return true;
        }
    }
}