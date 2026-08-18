using IXICore;
using IXICore.Meta;
using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using Microsoft.Maui.Storage;
using Spixi;
using SPIXI.Interfaces;
using SPIXI.Lang;
using SPIXI.Meta;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Web;

namespace SPIXI
{
    [XamlCompilation(XamlCompilationOptions.Compile)]
	public partial class LaunchCreatePage : SpixiContentPage
	{
		public LaunchCreatePage ()
		{
            InitializeComponent();
            NavigationPage.SetHasNavigationBar(this, false);

            loadPage(webView, "intro_new.html");
        }

        private void onLoad()
        {
            Utils.sendUiCommand(this, "setVersion", Config.version);
        }

        private void onNavigated(object sender, WebNavigatedEventArgs e)
        {

        }

        private void onNavigating(object sender, WebNavigatingEventArgs e)
        {
            string current_url = HttpUtility.UrlDecode(e.Url);

            if (current_url.Equals("ixian:onload", StringComparison.Ordinal))
            {
                onLoad();
            }else if (current_url.Equals("ixian:back", StringComparison.Ordinal))
            {
                popPageAsync();
            }
            else if (current_url.Contains("ixian:create:"))
            {
                // #334 L2: single IndexOf slice. The old parse rebuilt the password via
                // split[1].Replace(nick + ":", "") — Replace removes ALL occurrences, so a
                // password containing "<nick>:" (nick "bob", pass "xbob:y") was silently
                // corrupted to "xy" at CREATE time, while unlock/restore use the raw
                // remainder → the wallet was encrypted under a password the user can never
                // re-enter (silent lockout). Slice on the FIRST ':' only: nick = the text
                // before it, password = the raw remainder, separator chars and all —
                // matching the unlock (ixian:proceed:, LaunchRetryPage) and restore
                // (ixian:restore:) remainder semantics. Behavior-identical for every
                // payload the redesigned shell can emit (it gates colon-nicks and
                // "<nick>:"-containing passwords, launch-shell.js).
                // ⚠ GUARDRAIL: do NOT change the HttpUtility.UrlDecode above and do NOT
                // "harmonize" the unlock/restore parse paths — existing wallets were
                // encrypted under passwords produced by TODAY'S decode+parse behavior;
                // a unilateral decode/parse change there is a lockout vector.
                string payload = current_url.Substring(current_url.IndexOf("ixian:create:", StringComparison.Ordinal) + "ixian:create:".Length);
                int sep = payload.IndexOf(':');
                string nick = sep >= 0 ? payload.Substring(0, sep) : payload;
                string pass = sep >= 0 ? payload.Substring(sep + 1) : "";

                // Create the account
                onCreateAccount(nick, pass);
            }
            else if (current_url.Equals("ixian:error", StringComparison.Ordinal))
            {
                // #334 L5: "global -dialog-ok" (stray space) resolved to null → fixed key.
                displaySpixiAlert(SpixiLocalization._SL("intro-new-emptynick-title") ?? "Nickname required", SpixiLocalization._SL("intro-new-emptynick-text") ?? "Please enter a nickname to continue.", SpixiLocalization._SL("global-dialog-ok") ?? "OK");   // loop: hidden-locale fallback
            }
            else if (current_url.Equals("ixian:avatar", StringComparison.Ordinal))
            {
                _ = onChangeAvatarAsync(sender, e);
            }
            else if (current_url.Equals("ixian:restore", StringComparison.Ordinal))
            {
                Navigation.PushAsync(new LaunchRestorePage(), Config.defaultXamarinAnimations);
            }
            else
            {
                // Otherwise it's just normal navigation
                e.Cancel = false;
                return;
            }
            e.Cancel = true;

        }


        public async Task onChangeAvatarAsync(object sender, EventArgs e)
        {
            SpixiImageData? spixi_img_data = await SFilePicker.PickImageAsync();
            Stream? stream = spixi_img_data?.stream;

            if (stream == null)
            {
                return;
            }

            var file_path = IxianHandler.localStorage.getOwnAvatarPath(false);
            try
            {
                byte[] image_bytes = null;
                using (MemoryStream ms = new MemoryStream())
                {
                    stream.CopyTo(ms);
                    stream.Close();
                    image_bytes = SFilePicker.ResizeImage(ms.ToArray(), 960, 960, 80);
                    if(image_bytes == null)
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
                await displaySpixiAlert(SpixiLocalization._SL("intro-new-avatarerror-title") ?? "Could not set the avatar", ex.ToString(), SpixiLocalization._SL("global-dialog-ok") ?? "OK");   // loop: hidden-locale fallback
                return;
            }

            Utils.sendUiCommand(this, "loadAvatar", Utils.imageToDataUri(file_path));   // X1
        }

        // #334 L1: every failure path must ALSO push removeLoadingOverlay — the shell's
        // create submit disables the form + shows an indefinite morph (launch-shell.js
        // submit/launchCtrl) and only ctrl.fail (wired to removeLoadingOverlay in
        // launch.html) re-enables it. A native alert alone left the form dead forever.
        private void showCreateFailed()
        {
            MainThread.BeginInvokeOnMainThread(() => {
                // loop MINOR (hidden locales): _SL returns NULL under the 5 hidden
                // OS-culture locales (cn/id/it/ja/lt, #258) — an English fallback
                // beats an information-free empty dialog (Node.cs #334 posture).
                displaySpixiAlert(SpixiLocalization._SL("intro-new-walleterror-title") ?? "Could not create account",
                    SpixiLocalization._SL("intro-new-walleterror-text") ?? "Something went wrong while creating your account. Please try again.",
                    SpixiLocalization._SL("global-dialog-ok") ?? "OK");
                Utils.sendUiCommand(this, "removeLoadingOverlay");
            });
        }

        public void onCreateAccount(string nick, string pass)
        {
            // #334 L5 (optional leg): Node.generateWallet conflates "a wallet already
            // exists" (getWalletList().Count != 0, Node.cs:273) with real generation
            // failure — distinguish the exists case up front with its own honest alert.
            // Same-thread read Node.generateWallet itself performs; trivially safe here.
            if (IxianHandler.getWalletList().Count > 0)
            {
                displaySpixiAlert(SpixiLocalization._SL("intro-new-walletexists-title") ?? "Account already exists",
                    SpixiLocalization._SL("intro-new-walletexists-text") ?? "An account already exists on this device. Restart Spixi to continue with it.",
                    SpixiLocalization._SL("global-dialog-ok") ?? "OK");
                Utils.sendUiCommand(this, "removeLoadingOverlay");
                return;
            }

            // Generate the account on a different thread
            new Thread(() =>
            {
                // #334 L1: the whole body is fenced — an unhandled exception AFTER
                // generateWallet previously wedged the shell with no alert at all;
                // wake locks now release on every path (finally).
                bool wake_lock_sd = false;
                bool wake_lock_p = false;
                try
                {
                    // Aquire the wake lock
                    wake_lock_sd = SPowerManager.AquireLock("screenDim");
                    wake_lock_p = SPowerManager.AquireLock("partial");

                    if (Node.generateWallet(pass))
                    {
                        IxianHandler.localStorage.nickname = nick;
                        IxianHandler.localStorage.writeAccountFile();

                        Preferences.Default.Remove("onboardingComplete");
                        Preferences.Default.Remove("lockenabled");
                        Preferences.Default.Remove("waletpass");
                        /* ★ N12 (#383): a CREATE is not a restore. Clear BOTH restore marks —
                          * onRestore writes them before the password is verified, so a failed
                          * restore followed by a create would otherwise inherit them and the new
                          * account would lose its first 30-day backup reminder (review MINOR-2). */
                        Preferences.Default.Remove("onboardingFromRestore");
                        Preferences.Default.Remove("backupReminderTimestamp");

                        SpixiLocalization.addCustomString("OnboardingComplete", "false");

                        // TODO: encrypt the password
                        Preferences.Default.Set("walletpass", pass);

                        // Prepare the balances list
                        List<Address> address_list = IxianHandler.getWalletStorage().getMyAddresses();
                        foreach (Address addr in address_list)
                        {
                            IxianHandler.balances.Add(addr, new Balance(addr, 0));
                        }

                        MainThread.BeginInvokeOnMainThread(async() => {
                            await Navigation.PushAsync(HomePage.Instance(true), Config.defaultXamarinAnimations);
                            removePage(this);
                        });
                    }
                    else
                    {
                        showCreateFailed();   // #334 L1: alert + shell release
                    }
                }
                catch (Exception ex)
                {
                    Logging.error("Exception in account creation: " + ex);
                    showCreateFailed();       // #334 L1: no silent wedge
                }
                finally
                {
                    // Release the wake lock
                    if (wake_lock_sd)
                        SPowerManager.ReleaseLock("screenDim");
                    if (wake_lock_p)
                        SPowerManager.ReleaseLock("partial");
                }
            }).Start();
        }

        protected override bool OnBackButtonPressed()
        {
            popPageAsync();

            return true;
        }
    }
}