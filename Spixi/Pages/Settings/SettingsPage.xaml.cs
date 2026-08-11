using IXICore;
using IXICore.Meta;
using IXICore.Network;
using IXICore.Streaming;
using Microsoft.Maui.ApplicationModel;    // iOS-21: Browser.Default (SingleChatPage:21 precedent)
using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using Microsoft.Maui.Storage;
using Spixi;
using SPIXI.Interfaces;
using SPIXI.Lang;
using SPIXI.Meta;
using System;
using System.IO;
using System.Net;                 // iOS-21: WebUtility.HtmlDecode for ixian:openLink
using System.Threading.Tasks;
using System.Web;

namespace SPIXI
{
    [XamlCompilation(XamlCompilationOptions.Compile)]
    public partial class SettingsPage : SpixiContentPage
    {
        string selectedLanguage = null;
        ThemeAppearance selectedAppearance = ThemeAppearance.automatic;

        bool lockEnabled = false;

        // Unit 2 (#240, reshaped #245): true when HomePage hosts this page as the
        // Account PEER PANE (wide window, spans the grid minus the rail strip)
        // instead of a full-window takeover. Display-only: the shell hides its own
        // rail, renders the hub in the LIST-column slot (masterWidth, pushed as
        // setPaneMetrics so it aligns with the native chats column) and opens
        // sublevels in the detail region. Fields (not one-shots) so the
        // language-change reload's re-onLoad re-pushes them.
        bool paneMode = false;
        double masterWidth = 0;

        // #315: HomePage's park/re-present guard reads the hosting mode — a parked
        // NON-pane page must never be re-presented into a WIDE window (and vice versa).
        public bool isPaneMode { get { return paneMode; } }

        public SettingsPage(bool pane_mode = false, double master_width = 0)
        {
            paneMode = pane_mode;
            masterWidth = master_width;

            InitializeComponent();

            NavigationPage.SetHasNavigationBar(this, false);

            loadPage(webView, "settings.html");
        }

        private void onNavigated(object sender, WebNavigatedEventArgs e)
        {
            // Deprecated due to WPF, use onLoad
        }

        private void onLoad()
        {
            // Unit 2 (#240): tell the shell it is pane-hosted BEFORE the data burst —
            // all onLoad pushes coalesce ahead of the overlay present, so the pane
            // lays out master-detail before it ever becomes visible.
            if (paneMode)
            {
                Utils.sendUiCommand(this, "setPaneMode", "1");
                if (masterWidth > 0)
                {
                    // #245: hub column width = native list column − rail (invariant digits)
                    Utils.sendUiCommand(this, "setPaneMetrics", masterWidth.ToString("0", System.Globalization.CultureInfo.InvariantCulture));
                }
            }

            // #242 (S14): this build dispatches ixian:apply (save WITHOUT popping) —
            // declare it so the shell's Save stays on the page + toasts instead of
            // falling back to the frozen persist-and-pop.
            // #243: + backupInline — ixian:backupAccount/backupWallet are forwarded
            // below, so the pane renders Backup as a SUBLEVEL instead of pushing
            // BackupPage over itself.
            // Q1-② (#267, S16a): + downloadsInline — the downloads list/open/delete
            // verbs are dispatched HERE (loadDownloads/openDownload/deleteDownload),
            // so the pane renders Downloads as a true hub SUBLEVEL instead of the
            // #265 full-window DownloadsPage takeover. Mobile keeps the takeover.
            // iOS-20 (#283, S7 LANDED): + encpass — ixian:encpass is dispatched below
            // (→ EncryptionPassword, the redesigned settings_encryption.html lock
            // shell), so the hub shows the Change-wallet-password row. An old exe
            // never pushes the cap → the row stays hidden (no dead tap).
            Utils.sendUiCommand(this, "setCaps", "settingsApply,backupInline,downloadsInline,encpass");

            Utils.sendUiCommand(this, "setNickname", IxianHandler.localStorage.nickname);
            selectedAppearance = ThemeManager.getActiveAppearance();
            int activeAppearanceIdx = (int)selectedAppearance;
            Utils.sendUiCommand(this, "setAppearance", activeAppearanceIdx.ToString());

            if (Preferences.Default.ContainsKey("lockenabled"))
            {
                lockEnabled = (bool)Preferences.Default.Get("lockenabled",false);
            }
            Utils.sendUiCommand(this, "setLockEnabled", lockEnabled.ToString());

            // S4: app version for the About row (mirrors LaunchPage:33)
            Utils.sendUiCommand(this, "setVersion", Config.version);

            // S1: own IDENTITY address for the add-me QR/address block — PLAIN form, like
            // the legacy share verb (HomePage:322), NOT the ExtendedAddress payment form
            // (its _suffix encodes the OfflineTag payment flag; wallet-receive only)
            Utils.sendUiCommand(this, "setAddress", IxianHandler.getWalletStorage().getPrimaryAddress().ToString());

            // S3: current language for the Language row (source: resetLanguage:229)
            string lang = "en-us";
            if (Preferences.Default.ContainsKey("language"))
            {
                lang = Preferences.Default.Get("language", "") as string;
            }
            Utils.sendUiCommand(this, "setLanguage", lang);

            var filePath = IxianHandler.localStorage.getOwnAvatarPath();
            if (filePath.Equals("img/spixiavatar.png", StringComparison.Ordinal))
            {
                // No custom avatar has been chosen
            }
            else
            {
                // A custom avatar has been chosen previously
                Utils.sendUiCommand(this, "showRemoveAvatar", "1");
            }

            Utils.sendUiCommand(this, "loadAvatar", Utils.imageToDataUri(filePath));   // X1

        }

        private void onNavigating(object sender, WebNavigatingEventArgs e)
        {
            string current_url = HttpUtility.UrlDecode(e.Url);

            if (onNavigatingGlobal(current_url))
            {
                e.Cancel = true;
                return;
            }

            if (current_url.Equals("ixian:onload", StringComparison.Ordinal))
            {
                onLoad();
            }
            else if (current_url.Equals("ixian:back", StringComparison.Ordinal))
            {
                var source_file_path = Path.Combine(IxianHandler.localStorage.avatarsPath, "avatar-tmp.jpg");
                // Delete the temporary avatar image
                if (File.Exists(source_file_path))
                {
                    File.Delete(source_file_path);
                }
                resetLanguage();
                popPageAsync();
            }
            else if (current_url.Equals("ixian:error", StringComparison.Ordinal))
            {
                displaySpixiAlert(SpixiLocalization._SL("settings-emptynick-title"), SpixiLocalization._SL("settings-emptynick-text"), SpixiLocalization._SL("global-dialog-ok"));
            }
            else if (current_url.Equals("ixian:delete", StringComparison.Ordinal))
            {
                var lockPage = new LockPage(true);
                lockPage.authSucceeded += onDeleteWallet;
                pushModalLoaded(lockPage);   // #229 load-then-present; presents on root nav
            }
            else if (current_url.Equals("ixian:deletea", StringComparison.Ordinal))
            {
                var lockPage = new LockPage(true);
                lockPage.authSucceeded += onDeleteAccount;
                pushModalLoaded(lockPage);   // #229 load-then-present; presents on root nav
            }
            else if (current_url.Equals("ixian:deleteh", StringComparison.Ordinal))
            {
                onDeleteHistory();
            }
            else if (current_url.Equals("ixian:deleted", StringComparison.Ordinal))
            {
                onDeleteDownloads();
            }
            else if (current_url.StartsWith("ixian:openLink:", StringComparison.Ordinal))
            {
                // iOS-21/iOS-23: About + How-to link rows. Mirror of the SingleChatPage
                // handler (SingleChatPage.xaml.cs:334) so external links behave the same
                // on every surface: the WebView NEVER navigates to http(s) itself (iOS
                // Cancel-blocks it in iOSWebViewHandler.DecidePolicy) — the OS browser
                // opens it. URLs are curated in-code by settings-app.js, not user input.
                // Terms/Privacy do NOT come through here: they open as in-app doc sheets.
                string link = current_url.Substring("ixian:openLink:".Length);
                if (!link.Contains("://"))
                {
                    link = "http://" + link;
                }

                try
                {
                    string decoded_link = WebUtility.HtmlDecode(link);
#pragma warning disable CS0618 // Type or member is obsolete
                    Browser.Default.OpenAsync(new Uri(decoded_link));
#pragma warning restore CS0618 // Type or member is obsolete
                }
                catch (Exception ex)
                {
                    Logging.error("Exception occured while trying to open URL '{0}': {1}", link, ex);
                }
            }
            else if (current_url.Equals("ixian:encpass", StringComparison.Ordinal))
            {
                // iOS-20 (#283, S7 LANDED): Change wallet password from the Account hub —
                // the redesigned settings_encryption.html shell on EncryptionPassword
                // (HomePage:517 precedent). Backup's presentation grammar: pinned to the
                // detail column while the Account is a pane, full takeover on mobile.
                pushPageLoaded(new EncryptionPassword(), 4000, null, paneMode ? 1 : -1);   // load-then-move (N3)
            }
            else if (current_url.Equals("ixian:backup", StringComparison.Ordinal))
            {
                // #242 (Damir F5 issue 4): while the Account is a detail-column PANE,
                // Backup opens PINNED to the same column (covers the pane; its back
                // reveals the Account again) instead of a full-window takeover. A
                // true in-detail backup needs the BackupPage verbs routed through
                // SettingsPage — logged as be-cutover S15.
                pushPageLoaded(new BackupPage(), 4000, null, paneMode ? 1 : -1);   // load-then-move (N3)
            }
            else if (current_url.Equals("ixian:downloads", StringComparison.Ordinal))
            {
                // S8 LANDED (#264) · #265 Damir F5 fix: the col-1 pin covered only the
                // DETAIL region — the hub stayed tappable and its sublevels rendered
                // UNDERNEATH the downloads pane ("account unresponsive"). Downloads is
                // a SEPARATE page (own WebView, data pushed by DownloadsPage), so it
                // presents as a FULL-WINDOW takeover in both modes — its back reveals
                // the Account exactly where it was. A true in-pane sublevel needs the
                // list/open/delete verbs routed through SettingsPage (be-cutover S16,
                // WITH the traversal guard — the filesystem side stays a BE item).
                pushPageLoaded(new DownloadsPage());
            }
            else if (current_url.Equals("ixian:loadDownloads", StringComparison.Ordinal))
            {
                // Q1-② (#267, S16a): the pane's Downloads SUBLEVEL requests the list
                // into THIS WebView (clearFiles + addFile per file, DownloadsPage
                // parity). Re-pushed after every deleteDownload so the shell list
                // converges on the filesystem truth.
                loadDownloads();
            }
            else if (current_url.StartsWith("ixian:openDownload:", StringComparison.Ordinal))
            {
                // Named openDownload/deleteDownload (NOT DownloadsPage's open:/delete:)
                // so a prefix match can never collide with this page's delete-account
                // family. resolveDownloadPath = the ..-traversal guard (security-review
                // MAJOR): WebView supplies a NAME; C# resolves + rejects escapes.
                string file_name = downloadNameFromUrl(e.Url, current_url, "ixian:openDownload:");
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
            else if (current_url.StartsWith("ixian:deleteDownload:", StringComparison.Ordinal))
            {
                string file_name = downloadNameFromUrl(e.Url, current_url, "ixian:deleteDownload:");
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
                // failed delete previously left the shell list stale and silent.
                loadDownloads();
            }
            else if (current_url.StartsWith("ixian:save:", StringComparison.Ordinal))
            {
                // Q1 review (#266/#267 loop): StartsWith, not Contains. Contains matched the
                // literal anywhere in the url — it only failed to swallow a peer-supplied
                // download name because the download branches happen to sit above it, and a
                // NICKNAME containing "ixian:save:" sent via ixian:apply: hit this branch
                // first (self-injection → an unexpected page pop).
                string nick = current_url.Substring("ixian:save:".Length);
                onSaveSettings(nick);
            }
            else if (current_url.StartsWith("ixian:apply:", StringComparison.Ordinal))
            {
                // #242 (S14): persist WITHOUT popping — the Save button stays on the
                // Account pane; the shell shows the "Saved" morph + toast.
                // Q1 review (#266/#267 loop): StartsWith, not Contains (see above).
                onApplySettings(current_url.Substring("ixian:apply:".Length));
            }
            else if (current_url.Equals("ixian:backupAccount", StringComparison.Ordinal))
            {
                // #243 (S15): the Backup SUBLEVEL inside the Account pane — same
                // self-contained operation BackupPage runs (static; C# names all
                // paths, the verb is a bare trigger).
                _ = BackupPage.backupAccount();
            }
            else if (current_url.Equals("ixian:backupWallet", StringComparison.Ordinal))
            {
                _ = BackupPage.backupWallet();
            }
            else if (current_url.Equals("ixian:avatar", StringComparison.Ordinal))
            {
#pragma warning disable CS4014 // Because this call is not awaited, execution of the current method continues before the call is completed
                onChangeAvatarAsync(sender, e);
#pragma warning restore CS4014 // Because this call is not awaited, execution of the current method continues before the call is completed
            }
            else if (current_url.Equals("ixian:remove", StringComparison.Ordinal))
            {
                onRemoveAvatar();
            }
            else if (current_url.StartsWith("ixian:language:", StringComparison.Ordinal))
            {
                string lang = current_url.Substring("ixian:language:".Length);
                if (SpixiLocalization.loadLanguage(lang))
                {
                    selectedLanguage = lang;
                    Preferences.Default.Set("language", selectedLanguage);
                    loadPage(webView, "settings.html");
                    // #285 (F5 2026-07-29): strings are BAKED into generated pages; the
                    // deferred save/exit Home reload (#242) never fires on DESKTOP — the
                    // Account pane is tabbed away from, not exited — so the rest of the
                    // app kept the old language until an app restart. Re-localize the
                    // LIVE surfaces at pick time: the home shell (shell-only —
                    // HomePage.reload() would removeDetailContent(), tearing down the
                    // very pane this settings page is hosted in and clobbering the #274
                    // picker restore) and every live conversation WebView (same
                    // enumeration as the #284 delete-all leg). Other detail pages
                    // (tx details, downloads) regenerate localized on next open.
                    HomePage.Instance()?.reloadShell();
                    // #288 review: the resting desktop welcome pane (EmptyDetail) is in
                    // NEITHER collection — reloadShell deliberately skips removeDetailContent
                    // and getChatPages only yields conversations — so it kept the OLD language
                    // for the rest of the session. Exactly the gap #251 closed for THEME, and
                    // the same idiom. (reloadAllPages is deliberately NOT used here: it would
                    // reload this settings page a second time and eat the one-shot #274
                    // picker-restore stash.)
                    HomePage.Instance()?.reloadDefaultDetail();
                    // #288 review: one throwing page must not strand every LATER page in the
                    // old language, nor propagate out of a WebView Navigating handler. This is
                    // the first sweep that calls the WebView-touching reload() — OnDisappearing
                    // nulls that field, and the staging page is in the enumeration too.
                    foreach (var chat_page in Utils.getChatPages())
                    {
                        try { chat_page.reload(); }
                        catch (Exception ex) { Logging.warn("language reload (chat page): " + ex.Message); }
                    }
                }
                else
                {
                    selectedLanguage = null;
                }
            }
            else if (current_url.StartsWith("ixian:lock:", StringComparison.Ordinal))
            {
                string status = current_url.Substring("ixian:lock:".Length);
                if (status.Equals("on", StringComparison.Ordinal))
                {
                    // Turn on lock
                    lockEnabled = true;
                }
                else
                {
                    // Turn off lock
                    // Show authentication screen
                    var lockPage = new LockPage(true);
                    lockPage.authSucceeded += HandleAuthSucceeded;
                    pushModalLoaded(lockPage);   // #229 load-then-present; presents on root nav
                }
            }
            else if (current_url.StartsWith("ixian:appearance:", StringComparison.Ordinal))
            {
                string appearanceString = current_url.Substring("ixian:appearance:".Length);
                selectedAppearance = (ThemeAppearance)Convert.ToInt32(appearanceString);

                if (ThemeManager.changeAppearance(selectedAppearance))
                {
                    SPlatformUtils.setEdgeToEdge();
                    // Round 2 (Damir F5 "changing theme still flickers"): NO settings.html
                    // reload — the redesigned shell already applied the new theme LIVE
                    // (applyTheme on the pick) and persisted it; the full reload here was
                    // the visible flicker, and the regenerated boot theme comes along on
                    // the next natural open. Re-theme the OTHER live WebViews (Home and,
                    // on desktop, its detail pane) with a lightweight setTheme push —
                    // C#-resolved, so "auto" follows the app, not the WebView's own
                    // prefers-color-scheme (which disagreed on WinUI).
                    string themeName = ThemeManager.getResolvedAppearanceName();
                    HomePage? home = HomePage.Instance();
                    if (home != null)
                    {
                        Utils.sendUiCommand(home, "setTheme", themeName);
                        if (home.getDetailContent() is SpixiContentPage detail)
                        {
                            Utils.sendUiCommand(detail, "setTheme", themeName);
                        }
                        // #251 (Damir F5): the EmptyDetail resting pane is neither an
                        // overlay nor detailContent — without this it kept the old
                        // theme (dark welcome pane on a light app).
                        if (home.getDefaultDetailContent() is SpixiContentPage emptyDetail)
                        {
                            Utils.sendUiCommand(emptyDetail, "setTheme", themeName);
                        }
                    }
                    // #225: other live overlays (an open conversation under this Account
                    // overlay) re-theme too; this page itself already applied the pick.
                    foreach (SpixiContentPage overlay in getOverlayPages())
                    {
                        if (overlay != this)
                        {
                            Utils.sendUiCommand(overlay, "setTheme", themeName);
                        }
                    }
                }
            }
            else
            {
                // Otherwise it's just normal navigation
                e.Cancel = false;
                return;
            }
            e.Cancel = true;
        }



        public void onSaveSettings(string nick)
        {
            saveSettingsCore(nick);

            // Pop the current page from the stack
            popPageAsync();
        }

        // #242 (S14): explicit Save on the Account pane — persist, DON'T pop. The
        // shell confirms with the "Saved" morph + toast and stays on the page.
        public void onApplySettings(string nick)
        {
            saveSettingsCore(nick);
        }

        private void saveSettingsCore(string nick)
        {
            if (selectedLanguage != null)
            {
                Preferences.Default.Set("language", selectedLanguage);
                // #285: live surfaces re-localize at PICK time now (ixian:language
                // handler) — no deferred Home reload on save/exit. #242 stays honored:
                // nothing re-reloads on later saves of this page instance either.
                selectedLanguage = null;
            }
            else
            {
                resetLanguage();
            }

            Preferences.Default.Set("lockenabled", lockEnabled);

            if (IxianHandler.localStorage.nickname != nick)
            {
                IxianHandler.localStorage.nickname = nick;
                FriendList.broadcastNicknameChange();
            }
            IxianHandler.localStorage.writeAccountFile();
            Node.changedSettings = true;
            applyAvatar();

            // Round 2 (Damir F5 "saving flickers + moves home"): the old block here —
            // if (ThemeManager.changeAppearance(selectedAppearance)) reload Home — ran on
            // EVERY save, because changeAppearance/loadTheme returns true unconditionally.
            // Combined with HomePage.OnAppearing's (also removed) fromSettings reload,
            // every Account exit double-booted Home in front of the user. Appearance is
            // applied LIVE at pick time (ixian:appearance above); nothing to do on save.
            // (#285: the language reload moved to pick time too — see ixian:language.)
        }

        private void resetLanguage()
        {
            string lang = "en-us";
            if (Preferences.Default.ContainsKey("language"))
            {
                lang = Preferences.Default.Get("language", "") as string;
            }
            SpixiLocalization.loadLanguage(lang);
        }

        private void HandleAuthSucceeded(object sender, EventArgs<bool> e)
        {
            bool succeeded = e.Value;

            if(succeeded)
            {
                lockEnabled = false;
                Utils.sendUiCommand(this, "setLockEnabled", lockEnabled.ToString());
            }

        }

        public void onDeleteWallet(object sender, EventArgs<bool> e)
        {
            bool succeeded = e.Value;
            if (!succeeded)
            {
                return;
            }

            if (IxianHandler.getWalletStorage().deleteWallet())
            {
                // Also delete the account
                onDeleteAccount(sender, e);

                // Stop network activity
                NetworkUtils.isolate();

                Preferences.Default.Remove("onboardingComplete");
                Preferences.Default.Remove("lockenabled");
                Preferences.Default.Remove("waletpass");

                SpixiLocalization.addCustomString("OnboardingComplete", "false");

                PendingTransactions.clear();
                Node.storage.deleteData();
                Node.activityStorage.deleteData();
                Node.tiv.clearCache();

                IxianHandler.wallets.Clear();

                IxianHandler.shutdown();

                // Remove the settings page
                popToRootAsync();

                // Show the launch page
                hostNav.PushAsync(new LaunchPage(), Config.defaultXamarinAnimations);   // #225: root nav

                // Todo: also remove the parent page without causing memory leaks
            }
            else
            {
                displaySpixiAlert(SpixiLocalization._SL("settings-deletew-error-title"), SpixiLocalization._SL("settings-deletew-error-text"), SpixiLocalization._SL("global-dialog-ok"));
            }

        }

        public void onDeleteAccount(object sender, EventArgs<bool> e)
        {
            bool succeeded = e.Value;
            if (!succeeded)
            {
                return;
            }

            IxianHandler.localStorage.deleteAllAvatars();
            IxianHandler.localStorage.deleteAccountFile();
            IxianHandler.localStorage.deleteAllDownloads();
            CoreStreamProcessor.deletePendingMessages();
            FriendList.deleteEntireHistory();
            FriendList.deleteAccounts();
            FriendList.clear();

            onLoad();

            displaySpixiAlert(SpixiLocalization._SL("settings-deleteda-title"), SpixiLocalization._SL("settings-deleteda-text"), SpixiLocalization._SL("global-dialog-ok"));
        }

        public void onDeleteHistory()
        {
            FriendList.deleteEntireHistory();
            // iOS-25 (#283): nothing flagged the chats list dirty — the wiped rows stayed
            // painted until some OTHER event set shouldRefreshContacts, so returning to
            // Chats briefly (sometimes longer) showed dead conversations. Flag it now:
            // the first HomePage updateScreen tick after this re-flushes, and rows whose
            // history is gone drop out (getFriendMessageHelper returns null on empty).
            UIHelpers.shouldRefreshContacts = true;
            // #283 review MINOR (desktop split-pane): flagging the LIST dirty never told an
            // OPEN conversation — the wiped pane kept rendering its messages until re-entered.
            // Re-render every live chat surface now (loadMessages pushes clearMessages first
            // even on an emptied history).
            foreach (var chat_page in Utils.getChatPages())
            {
                chat_page.loadMessages();
            }
            displaySpixiAlert(SpixiLocalization._SL("settings-deletedh-title"), SpixiLocalization._SL("settings-deletedh-text"), SpixiLocalization._SL("global-dialog-ok"));
        }

        // Q1 review (#266/#267 loop): the download file name is PEER-SUPPLIED (TransferManager
        // composes downloadsPath + transfer.fileName). onNavigating decodes the url with
        // HttpUtility.UrlDecode, which is FORM decoding: a literal '+' becomes a space, and a
        // percent-escaped decoy ("report%2Epdf") decodes onto a DIFFERENT real file
        // ("report.pdf") — Open/Delete would then act on a file the confirm dialog never
        // named. Take the name off the RAW url with Uri.UnescapeDataString (%xx only). Fall
        // back to the decoded url if a platform hands back an already-normalized url without
        // the raw prefix. The traversal guard (TransferManager.resolveDownloadPath) still runs
        // on the result, so "..%2f" stays rejected (fail-closed).
        // ★ CONTRACT (Q1 re-review): the shell percent-encodes the name
        // (settings.html / downloads.html: encodeURIComponent) — that is the OTHER half of
        // this fix. UnescapeDataString alone only kills the '+' case; the decoy case is
        // closed only because a literal '%' arrives as '%25' and round-trips exactly.
        // If the shell ever stops encoding, the decoy is back. Decode EXACTLY ONCE here.
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

        // Q1-② (#267, S16a): push the downloads list into THIS page's WebView —
        // DownloadsPage.loadFiles parity (name + locale-opaque creation time).
        // Directory.Exists guard: a fresh install has no Downloads folder yet
        // (EnumerateFiles would throw) — the shell just shows the empty state.
        private void loadDownloads()
        {
            Utils.sendUiCommand(this, "clearFiles");

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

        public void onDeleteDownloads()
        {
            try
            {
                TransferManager.resetIncomingTransfers();
                int file_count = 0;
                foreach (var file in Directory.EnumerateFiles(Path.Combine(Config.spixiUserFolder, "Downloads")))
                {
                    File.Delete(file);
                    file_count++;
                }
                displaySpixiAlert(SpixiLocalization._SL("settings-deletedd-title"), string.Format(SpixiLocalization._SL("settings-deletedd-text"), file_count), SpixiLocalization._SL("global-dialog-ok"));
            }
            catch (Exception e)
            {
                Logging.error("Exception while deleting downloads: " + e);
                displaySpixiAlert(SpixiLocalization._SL("settings-deleted-error-title"), SpixiLocalization._SL("settings-deleted-error-text"), SpixiLocalization._SL("global-dialog-ok"));
            }
        }

        public async Task onChangeAvatarAsync(object sender, EventArgs e)
        {
            SpixiImageData? spixi_img_data = await SFilePicker.PickImageAsync();
            if (spixi_img_data == null)
                return;

            Stream? stream = spixi_img_data.stream;
            if (stream == null)
                return;          

            var file_path = Path.Combine(IxianHandler.localStorage.avatarsPath, "avatar-tmp.jpg");
            try
            {
                byte[] image_bytes = null;
                using (MemoryStream ms = new MemoryStream())
                {
                    stream.CopyTo(ms);
                    stream.Close();
                    image_bytes = SFilePicker.ResizeImage(ms.ToArray(), 960, 960, 80);
                    if (image_bytes == null)
                    {
                        return;
                    }
                }

                FileStream fs = new FileStream(file_path, FileMode.OpenOrCreate, FileAccess.Write);
                fs.Write(image_bytes, 0, image_bytes.Length);
                fs.Close();
            }
            catch (Exception ex)
            {
                await displaySpixiAlert(SpixiLocalization._SL("intro-new-avatarerror-title"), ex.ToString(), SpixiLocalization._SL("global-dialog-ok"));
                return;
            }

            Utils.sendUiCommand(this, "loadAvatar", Utils.imageToDataUri(file_path));   // X1
            Node.changedSettings = true;
        }

        // Applies the avatar image once the user chooses to Save changes
        public void applyAvatar()
        {
            var file_path = IxianHandler.localStorage.getOwnAvatarPath(false);
            var source_file_path = Path.Combine(IxianHandler.localStorage.avatarsPath, "avatar-tmp.jpg");

            // Check if the source file exists before proceeding
            if (!File.Exists(source_file_path))
            {
                return;
            }

            // Remove the avatar image first
            if (File.Exists(file_path))
            {
                File.Delete(file_path);
            }

            File.Copy(source_file_path, file_path);

            // Delete the temporary avatar image if the copy was successfull
            if (File.Exists(file_path))
            {
                File.Delete(source_file_path);
            }

            FriendList.broadcastAvatarChange();
        }

        public void onRemoveAvatar()
        {
            if (IxianHandler.localStorage.deleteOwnAvatar())
            {
                Utils.sendUiCommand(this, "showRemoveAvatar", "0");
                Utils.sendUiCommand(this, "loadAvatar", Utils.imageToDataUri(IxianHandler.localStorage.getOwnAvatarPath()));   // X1
                Node.changedSettings = true;
            }
        }

        protected override bool OnBackButtonPressed()
        {
            Utils.sendUiCommand(this, "onBack");
            return true;
        }
    }
}