using IXICore;
using IXICore.Meta;
using Microsoft.Maui.ApplicationModel;   // ★ H-13 (#1245): MainThread for the native "Did you save the backup?" alert
using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using Microsoft.Maui.Storage;
using Spixi;
using SPIXI.Lang;
using SPIXI.Meta;
using System;
using System.IO;
using System.IO.Compression;
using System.Text;
using System.Threading;   // ★ H-13 r1: the one pending question (CancellationTokenSource)
using System.Threading.Tasks;
using System.Web;

namespace SPIXI
{
    [XamlCompilation(XamlCompilationOptions.Compile)]
	public partial class BackupPage : SpixiContentPage
	{
		public BackupPage ()
		{
			InitializeComponent ();
            NavigationPage.SetHasNavigationBar(this, false);
            loadPage(webView, "settings_backup.html");
        }

        private void onNavigated(object sender, WebNavigatedEventArgs e)
        {
            // Deprecated due to WPF, use onLoad
        }

        private void onLoad()
        {
            // ★ S2 (loop m3): the standalone Backup page (the home nudge, the mobile takeover)
            // must open with the recorded stamp, not "not backed up yet"
            pushBackupStatus(this);
        }


        private void onNavigating(object sender, WebNavigatingEventArgs e)
        {
            string current_url = HttpUtility.UrlDecode(e.Url);
            // #797: cancel first. A throw in a branch must not leave an ixian: navigation for the WebView to load.
            e.Cancel = true;

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
                popPageAsync();
            }
            else if (current_url.Equals("ixian:error", StringComparison.Ordinal))
            {
                displaySpixiAlert(SpixiLocalization._SL("settings-backup-invalidpassword-title"), SpixiLocalization._SL("settings-backup-invalidpassword-text"), SpixiLocalization._SL("global-dialog-ok"));
            }
            else if (current_url.Equals("ixian:backupAccount", StringComparison.Ordinal))
            {
                onBackupAccount();
            }
            else if (current_url.Equals("ixian:backupWallet", StringComparison.Ordinal))
            {
                onBackupWallet();
            }
            else if (current_url.Trim().StartsWith("file:", StringComparison.OrdinalIgnoreCase))
            {
                // allow normal navigation only for local files
                e.Cancel = false;
                return;
            }
            e.Cancel = true;

        }

        private async void onBackupWallet()
        {
            await backupWallet();
            pushBackupStatus(this);   // ★ S2: the standalone page's own row
        }

        private async void onBackupAccount()
        {
            await backupAccount();
            pushBackupStatus(this);   // ★ S2
        }

        /* #243: the two backup operations are SELF-CONTAINED (no page state; C#
         * names every path, the WebView only sends the bare trigger verb) — static
         * so SettingsPage can forward ixian:backupAccount/backupWallet and render
         * the backup screen as a SUBLEVEL inside the Account pane (be-cutover S15).
         * Bodies unchanged from the instance handlers they replace. */

        /* ★ S2 (Session AD): the LAST-BACKUP stamp is C#-OWNED now. Three shells used to
         * keep it in localStorage (`spixi.backup.last`) — written at the share-sheet launch,
         * read by the Account hub's Backup row, the standalone backup page and the home
         * shell's 30-day nudge gate, synced across WebViews by a storage event, a focus
         * fallback and a 2 s poll. The preference below records the moment the OS
         * share/save sheet RETURNED without throwing for a produced backup file (#46 loop
         * m4 moved it after the await: a throw records nothing). ⚠ A user CANCEL is still
         * recorded — the shared `share` signature returns no outcome (Windows' FileSaver
         * result never reaches the caller: `Task<Task<bool>>`, true even on !IsSuccessful),
         * so "confirmed written" is NOT claimed; the old shell stamp had the same blind spot.
         * The stamp reaches the shells as ONE push, `setLastBackup(<unix seconds>)`, while the
         * home nudge reads the preference directly (HomePage.displayBackupReminder). */
        private const string LAST_BACKUP_PREF = "lastBackupTimestamp";

        public static long lastBackupTimestamp()
        {
            try
            {
                return long.Parse(Preferences.Default.Get(LAST_BACKUP_PREF, "0"));
            }
            catch (Exception)
            {
                return 0;
            }
        }

        private static void recordBackup()
        {
            try
            {
                Preferences.Default.Set(LAST_BACKUP_PREF, Clock.getTimestamp().ToString());
            }
            catch (Exception ex)
            {
                Logging.warn("recordBackup failed: " + ex.GetType().Name);
            }
        }

        /* ★ H-13 (#1245, Damir): a CANCELLED share used to count as a backup. Now the outcome decides where a platform
         * reports one, and a NATIVE alert asks where it does not:
         *   · Windows — FileSaver's own result: saved = stamp (no question), cancelled / failed = nothing;
         *   · Android — the Share / Save action sheet: Cancel = nothing (no question); Share or Save = ask (the chooser
         *     that follows reports nothing);
         *   · iOS / Mac — share() returns while the sheet is still open: wait for it to close, then ask.
         * "Yes" stamps, "No" (or a failed alert) does not. No verb, no WebView text: the strings are C#'s own
         * (Resources/Raw/lang, with ?? fallbacks). The root page hosts it (the displaySpixiAlert rule), main thread.
         * ★ #46 r1 (R1-B): ONE pending question at a time — a new backup cancels the previous wait / question, and
         * BackupPage leaving the screen cancels it (cancelPendingAsk); a cancelled question asks nothing and stamps
         * nothing. */
        private static readonly object askGate = new object();
        private static CancellationTokenSource? askCts;

        /// <summary>★ H-13 r1: drops the pending "Did you save the backup?" wait / question (no stamp).</summary>
        public static void cancelPendingAsk()
        {
            lock (askGate)
            {
                askCts?.Cancel();
                askCts = null;
            }
        }

        /// <summary>★ H-13 r1: runs the share sheet; true = saved / chosen, false = cancelled, null = no outcome known.</summary>
        private static async Task<bool?> shareBackup(string path, string title)
        {
#if WINDOWS
            return await (await SFileOperations.share(path, title));
#elif ANDROID
            return await SFileOperations.share(path, title);
#else
            await SFileOperations.share(path, title);
            return null;
#endif
        }

        private static async Task recordBackupIfSaved(bool? outcome)
        {
            if (outcome == false)
            {
                Logging.info("backup: the share was cancelled - no stamp");
                return;
            }
#if WINDOWS
            if (outcome == true)
            {
                recordBackup();   // FileSaver wrote the file — that IS the confirmation
                return;
            }
#endif
            CancellationTokenSource mine = new CancellationTokenSource();
            lock (askGate)
            {
                askCts?.Cancel();
                askCts = mine;
            }
            CancellationToken ct = mine.Token;
            bool saved = false;
            try
            {
                string title = SpixiLocalization._SL("settings-backup-saved-title") ?? "Did you save the backup?";
                string text = SpixiLocalization._SL("settings-backup-saved-text") ?? "Choose Yes only if the backup file is now saved or sent somewhere safe.";
                string yes = SpixiLocalization._SL("settings-backup-saved-yes") ?? "Yes";
                string no = SpixiLocalization._SL("settings-backup-saved-no") ?? "No";
#if IOS || MACCATALYST
                await waitForAppleShareSheet(ct);
#endif
                ct.ThrowIfCancellationRequested();
                saved = await MainThread.InvokeOnMainThreadAsync(async () =>
                {
                    Page? host = Application.Current?.MainPage;
                    if (host == null || ct.IsCancellationRequested)
                    {
                        return false;
                    }
                    return await host.DisplayAlert(title, text, yes, no);
                });
            }
            catch (OperationCanceledException)
            {
                Logging.info("backup: the saved question was dropped - no stamp");
                saved = false;
            }
            catch (Exception ex)
            {
                Logging.warn("backup: the saved question failed (" + ex.GetType().Name + ")");
            }
            finally
            {
                lock (askGate)
                {
                    if (ReferenceEquals(askCts, mine))
                    {
                        askCts = null;
                    }
                }
                mine.Dispose();
            }
            if (saved)
            {
                recordBackup();
            }
            else
            {
                Logging.info("backup: not confirmed as saved - no stamp");
            }
        }

#if IOS || MACCATALYST
        /* ★ H-13: on iOS / Mac `SFileOperations.share` returns as soon as it PRESENTS the activity sheet (it does not
         * await its dismissal), so the question would open on top of the sheet before the user acted. Wait until no
         * UIActivityViewController is presented any more: polled on the main thread every 300 ms, bounded at 15 min
         * (after that the question is asked anyway). The better fix is a completion-awaiting share (reported). */
        private static async Task waitForAppleShareSheet(CancellationToken ct)
        {
            await Task.Delay(500, ct);   // the sheet's present animation was not awaited by share()
            for (int i = 0; i < 3000; i++)
            {
                bool open = await MainThread.InvokeOnMainThreadAsync(() => appleShareSheetOpen());
                if (!open)
                {
                    return;
                }
                await Task.Delay(300, ct);   // ★ H-13 r1: a newer backup / the page leaving cancels the wait
            }
        }

        private static bool appleShareSheetOpen()
        {
            try
            {
                foreach (UIKit.UIScene scene in UIKit.UIApplication.SharedApplication.ConnectedScenes)
                {
                    if (scene is not UIKit.UIWindowScene windowScene)
                    {
                        continue;
                    }
                    foreach (UIKit.UIWindow window in windowScene.Windows)
                    {
                        UIKit.UIViewController? vc = window.RootViewController;
                        while (vc != null)
                        {
                            if (vc is UIKit.UIActivityViewController)
                            {
                                return true;
                            }
                            vc = vc.PresentedViewController;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Logging.warn("backup: the share sheet check failed (" + ex.GetType().Name + ")");
            }
            return false;
        }
#endif

        /// <summary>The push every backup surface renders its status from ("" = never).</summary>
        public static void pushBackupStatus(SpixiContentPage page)
        {
            // fenced HERE, once: two of its callers are `async void` handlers (onBackupWallet /
            // onBackupAccount), where a throw is an unobserved crash, not a caught exception
            try
            {
                long ts = lastBackupTimestamp();
                Utils.sendUiCommand(page, "setLastBackup", ts > 0 ? ts.ToString() : "");
            }
            catch (Exception e)
            {
                Logging.warn("pushBackupStatus: " + e.GetType().Name);
            }
        }

        public static async Task backupWallet()
        {
            try
            {
                // TODO add file header
                string docpath = Config.spixiUserFolder;
                string filepath = Path.Combine(docpath, Config.walletFile);
                bool? outcome = await shareBackup(filepath, "Backup Spixi Wallet");
                await recordBackupIfSaved(outcome);   // ★ H-13: AFTER the sheet returned; the outcome or the user's "Yes"
            }
            catch (Exception ex)
            {
                Logging.error("Exception backing up wallet: " + ex.ToString());
            }
        }

        public static async Task backupAccount()
        {
            try
            {
                // TODO add file header
                string backup_file_name = Path.Combine(Config.spixiUserFolder, "spixi.account.backup.ixi");
                if (File.Exists(backup_file_name))
                {
                    File.Delete(backup_file_name);
                }

                using (ZipArchive archive = ZipFile.Open(backup_file_name, ZipArchiveMode.Create))
                {
                    string root_path = Path.Combine(Config.spixiUserFolder, "Acc");
                    var directories = Directory.EnumerateDirectories(root_path);
                    foreach (var dir in directories)
                    {
                        var files = Directory.EnumerateFiles(dir);
                        foreach (var file in files)
                        {
                            /* ★ #565 (Damir, A2 walk 2026-08-25): FORWARD slashes in zip entry names.
                               Path.Combine used the PLATFORM separator, so a backup made on Windows
                               carried entries named "Acc\\xxx\\file" — and extracting that on
                               Android/iOS creates FILES with backslashes in their names instead of
                               the Acc directory tree. The restore then found no Acc folder and
                               silently degraded to a wallet-only restore (no contacts). The zip
                               spec (APPNOTE 4.4.17) mandates "/" — write it explicitly. */
                            archive.CreateEntryFromFile(file, "Acc/" + file.Substring(file.IndexOf(root_path) + root_path.Length + 1).Replace('\\', '/'));
                        }
                    }
                    if (File.Exists(Path.Combine(Config.spixiUserFolder, "account.ixi")))
                    {
                        archive.CreateEntryFromFile(Path.Combine(Config.spixiUserFolder, "account.ixi"), "account.ixi");
                    }
                    /* ★ S15 (#1297, Damir 2026-10-10): the REAL own avatar. The legacy line packed <user>/avatar.jpg (the root),
                     * a path only a restore ever wrote and nothing ever read — so a backup carried a stale avatar or none.
                     * The app's own avatar is Core's getOwnAvatarPath(false) (= html/Avatars/avatar.jpg).
                     * ★ S15 #46 r1 (MINOR-1): under a NEW entry name, RestoreMoves.OwnAvatarEntry ("own_avatar.jpg"), the only
                     * entry the restore puts back there. A legacy backup's "avatar.jpg" entry is the stale root file (a removed
                     * avatar, another account's) — the restore ignores it, as before S15, so it is never served to peers. */
                    string ownAvatar = IxianHandler.localStorage.getOwnAvatarPath(false);
                    if (File.Exists(ownAvatar))
                    {
                        archive.CreateEntryFromFile(ownAvatar, RestoreMoves.OwnAvatarEntry);
                    }
                    archive.CreateEntryFromFile(Path.Combine(Config.spixiUserFolder, Config.walletFile), "wallet.ixi");
                }

                string password = Preferences.Default.Get("walletpass","").ToString();
                byte[] backup_file_bytes = File.ReadAllBytes(backup_file_name);
                byte[] header = UTF8Encoding.UTF8.GetBytes("SPIXIACCB1");
                byte[] bytes_to_encrypt = new byte[header.Length + backup_file_bytes.Length];
                Array.Copy(header, bytes_to_encrypt, header.Length);
                Array.Copy(backup_file_bytes, 0, bytes_to_encrypt, header.Length, backup_file_bytes.Length);

                byte[] encrypted_backup = CryptoManager.lib.encryptWithPassword(bytes_to_encrypt, password, true);
                File.Delete(backup_file_name);
                File.WriteAllBytes(backup_file_name, encrypted_backup);
                bool? outcome = await shareBackup(backup_file_name, "Share Spixi Account Backup File");
                await recordBackupIfSaved(outcome);   // ★ H-13: AFTER the sheet returned; the outcome or the user's "Yes"
            }
            catch (Exception ex)
            {
                Logging.error("Exception backing up account: " + ex.ToString());
            }
        }

        // ★ H-13 r1 (R1-B): the question belongs to this screen — leaving it drops a pending wait / question.
        protected override void OnDisappearing()
        {
            cancelPendingAsk();
            base.OnDisappearing();
        }

        protected override bool OnBackButtonPressed()
        {
            popPageAsync();

            return true;
        }
    }
}