using IXICore;
using IXICore.Meta;
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
            else
            {
                // Otherwise it's just normal navigation
                e.Cancel = false;
                return;
            }
            e.Cancel = true;

        }

        private void onBackupWallet()
        {
            _ = backupWallet();
        }

        private void onBackupAccount()
        {
            _ = backupAccount();
        }

        /* #243: the two backup operations are SELF-CONTAINED (no page state; C#
         * names every path, the WebView only sends the bare trigger verb) — static
         * so SettingsPage can forward ixian:backupAccount/backupWallet and render
         * the backup screen as a SUBLEVEL inside the Account pane (be-cutover S15).
         * Bodies unchanged from the instance handlers they replace. */

        public static async Task backupWallet()
        {
            try
            {
                // TODO add file header
                string docpath = Config.spixiUserFolder;
                string filepath = Path.Combine(docpath, Config.walletFile);
                await SFileOperations.share(filepath, "Backup Spixi Wallet");
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
                    if (File.Exists(Path.Combine(Config.spixiUserFolder, "avatar.jpg")))
                    {
                        archive.CreateEntryFromFile(Path.Combine(Config.spixiUserFolder, "avatar.jpg"), "avatar.jpg");
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
                await SFileOperations.share(backup_file_name, "Share Spixi Account Backup File");
            }
            catch (Exception ex)
            {
                Logging.error("Exception backing up account: " + ex.ToString());
            }
        }

        protected override bool OnBackButtonPressed()
        {
            popPageAsync();

            return true;
        }
    }
}