using IXICore.Meta;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using Microsoft.Maui.Storage;     // #341 audit MAJOR-2: Preferences["walletpass"] must follow the wallet
using SPIXI.Lang;
using System;
using System.Web;

namespace SPIXI
{
    [XamlCompilation(XamlCompilationOptions.Compile)]
	public partial class EncryptionPassword : SpixiContentPage
    {
		public EncryptionPassword ()
		{
			InitializeComponent ();
            NavigationPage.SetHasNavigationBar(this, false);

            loadPage(webView, "settings_encryption.html");
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
                displaySpixiAlert(SpixiLocalization._SL("settings-encryption-invalidpassword-title"), SpixiLocalization._SL("settings-encryption-invalidpassword-text"), SpixiLocalization._SL("global-dialog-ok"));
            }
            else if (current_url.StartsWith("ixian:changepass:", StringComparison.Ordinal))
            {
                // #341 audit: this is the MOBILE route. The desktop pane runs the same
                // verb inside SettingsPage. Both legs carry the same two defects, fixed
                // here in the same shape — keep them in step if you touch either.
                //  · ★ MAJOR-1: an unguarded throw escapes onNavigating, so e.Cancel is
                //    never set, and iOSWebViewHandler.cs:116 then logs the WHOLE URL into
                //    ixian.log — a shareable file with both passwords in cleartext.
                //  · ★ MAJOR-2: Node.loadWallet reads the cached "walletpass" preference
                //    at every cold start (Node.cs:248-256), and BackupPage.xaml.cs:144
                //    encrypts the backup archive with it. Re-encrypting the wallet without
                //    updating it means the next launch cannot open the wallet, and a
                //    backup taken in between cannot be restored.
                //  · The Length test is EXACT: a longer split means a password contained
                //    the delimiter, and writing split_url[2] would re-encrypt the wallet
                //    with a truncated password the user can never reproduce.
                // #341 review NIT-11: decide FIRST, speak SECOND. The alert and the pop
                // sit outside the try, so a throw after a successful write can no longer
                // show "wrong password" over a change that completed.
                bool pass_changed = false;
                try
                {
                    string[] split_url = current_url.Split(new string[] { "--1ec4ce59e0535704d4--" }, StringSplitOptions.None);
                    if (split_url.Length == 3 && split_url[2].Length >= 10
                        && IxianHandler.getWalletStorage().isValidPassword(split_url[1]))
                    {
                        IxianHandler.getWalletStorage().writeWallet(split_url[2]);
                        // ★ #341 review MAJOR-1: confirm the write took effect before the
                        // cached password follows it. See the SettingsPage twin for why.
                        if (IxianHandler.getWalletStorage().isValidPassword(split_url[2]))
                        {
                            Preferences.Default.Set("walletpass", split_url[2]);
                            pass_changed = true;
                        }
                        else
                        {
                            Logging.error("Wallet password change did not take effect; the cached password was left unchanged.");
                        }
                    }
                }
                catch (Exception ex)
                {
                    // NEVER log the URL or either password — only the exception.
                    Logging.error("Exception occured while changing the wallet password: {0}", ex);
                }
                if (pass_changed)
                {
                    displaySpixiAlert(SpixiLocalization._SL("settings-encryption-passwordchanged-title"), SpixiLocalization._SL("settings-encryption-passwordchanged-text"), SpixiLocalization._SL("global-dialog-ok"));
                    popPageAsync();
                }
                else
                {
                    displaySpixiAlert(SpixiLocalization._SL("settings-encryption-invalidpassword-title"), SpixiLocalization._SL("settings-encryption-invalidpassword-current-text"), SpixiLocalization._SL("global-dialog-ok"));
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

        protected override bool OnBackButtonPressed()
        {
            popPageAsync();

            return true;
        }
    }
}