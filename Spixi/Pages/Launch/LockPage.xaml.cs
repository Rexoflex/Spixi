using IXICore;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using Plugin.Fingerprint.Abstractions;
using SPIXI.Lang;
using SPIXI.Meta;
using System;
using System.IO;
using System.Linq;   // #229: ModalStack (IReadOnlyList<Page>).Contains
using System.Threading;
using System.Threading.Tasks;
using System.Web;

namespace SPIXI
{
    [XamlCompilation(XamlCompilationOptions.Compile)]
    public partial class LockPage : SpixiContentPage
    {
        private CancellationTokenSource _cancel;
        private bool justConfirmAction = false;
        public event EventHandler<SPIXI.EventArgs<bool>> authSucceeded;
        public event EventHandler<SPIXI.EventArgs<bool>> authWithPassword;

        public LockPage()
        {
            InitializeComponent();
            NavigationPage.SetHasNavigationBar(this, false);

            loadPage(webView, "lock.html");
        }

        public LockPage(bool justConfirm)
        {
            justConfirmAction = justConfirm;
            InitializeComponent();
            NavigationPage.SetHasNavigationBar(this, false);

            loadPage(webView, "lock.html");
        }

        private void onNavigated(object sender, WebNavigatedEventArgs e)
        {
            // Deprecated due to WPF, use onLoad
        }

        // #229 (reviewer MINOR-1/-3): the lock may load while STAGED INVISIBLE
        // (pushModalLoaded). Biometrics must only fire once the page is actually
        // on screen — firing during staging popped the OS auth sheet over the
        // PREVIOUS screen's content, and a fast auth could PopModalAsync an empty
        // modal stack (the modal push had not happened yet).
        private bool uiReady = false;        // ixian:onload received
        private bool pageVisible = false;    // OnAppearing fired (really presented)
        private bool authAttempted = false;

        private void onLoad()
        {
            if(justConfirmAction)
                Utils.sendUiCommand(this, "setJustConfirm", "True");

            uiReady = true;
            maybeAuthenticate();
        }

        protected override void OnAppearing()
        {
            base.OnAppearing();
            pageVisible = true;
            maybeAuthenticate();
        }

        // #230: in-place presents don't fire OnAppearing — same "really visible" signal.
        public override void onPresentedInPlace()
        {
            pageVisible = true;
            maybeAuthenticate();
        }

        private async void maybeAuthenticate()
        {
            if (!uiReady || !pageVisible || authAttempted)
                return;

            if (Device.RuntimePlatform == Device.WinUI)
                return;

            authAttempted = true;
            // Show biometric and alternative authentication methods
            await AuthenticateAsync(SpixiLocalization._SL("global-lock-auth-text"));
        }

        private void onNavigating(object sender, WebNavigatingEventArgs e)
        {
            string current_url = HttpUtility.UrlDecode(e.Url);

            if (current_url.Equals("ixian:onload", StringComparison.Ordinal))
            {
                onLoad();
            }
            else if (current_url.Equals("ixian:back", StringComparison.Ordinal))
            {
                // No back button for this screen
            }
            else if (current_url.Contains("ixian:unlock:"))
            {
                // Retrieve the password and unlock
                string[] split = current_url.Split(new string[] { "ixian:unlock:" }, StringSplitOptions.None);
                string pass = split[1];
                if (pass != null)
                    doUnlock(pass);
            }
            else if (current_url.Equals("ixian:change", StringComparison.Ordinal))
            {
                if (justConfirmAction)
                {
                    if (authSucceeded != null)
                    {
                        authSucceeded(this, new SPIXI.EventArgs<bool>(false));
                    }
                    // #230: shown-in-place lock closes via the overlay path.
                    if (!closeModalOverlay(this) && Navigation.ModalStack.Contains(this))
                    {
                        Navigation.PopModalAsync();
                    }
                }
                else
                {
                    // Show the launch screen
                    Navigation.PushAsync(new SPIXI.LaunchPage(), Config.defaultXamarinAnimations);
                    removePage(this);
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

        private void doUnlock(string pass)
        {
            string target_filepath = Path.Combine(Config.spixiUserFolder, Config.walletFile);
            WalletStorage ws = new WalletStorage(target_filepath);
            if (!ws.verifyWallet(target_filepath, pass))
            {
                displaySpixiAlert(SpixiLocalization._SL("intro-restore-file-invalidpassword-title"), SpixiLocalization._SL("intro-restore-file-invalidpassword-text"), SpixiLocalization._SL("global-dialog-ok"));
            }
            else
            {
                if(authWithPassword != null)
                {
                    authWithPassword(this, new SPIXI.EventArgs<bool>(true));
                }
                performUnlock();
            }
        }

        private async void performUnlock()
        {
            if (authSucceeded != null)
            {
                authSucceeded(this, new SPIXI.EventArgs<bool>(true));
            }

            if (justConfirmAction)
            {
                // #230: shown-in-place lock closes via the overlay path; else pop the
                // modal — but never pop a stack this page is not on (#229 guard).
                if (!closeModalOverlay(this) && Navigation.ModalStack.Contains(this))
                {
                    Navigation.PopModalAsync();
                }
                return;
            }
            Navigation.InsertPageBefore(HomePage.Instance(true), this);

            removePage(this);           
        }

        protected override bool OnBackButtonPressed()
        {
            return true;
        }

        private async Task AuthenticateAsync(string reason, string cancel = null, string fallback = null, string tooFast = null)
        {
            _cancel = new CancellationTokenSource();

            var dialogConfig = new AuthenticationRequestConfiguration("SPIXI", reason)
            {
                CancelTitle = cancel,
                FallbackTitle = fallback,
                AllowAlternativeAuthentication = true,
                ConfirmationRequired = true
            };

            dialogConfig.HelpTexts.MovedTooFast = tooFast;

            var result = await Plugin.Fingerprint.CrossFingerprint.Current.AuthenticateAsync(dialogConfig, _cancel.Token);

            await SetResultAsync(result);
        }
        
        private Task SetResultAsync(FingerprintAuthenticationResult result)
        {
            if (result.Authenticated)
            {
                performUnlock();
            }
            else
            {
                _ = displaySpixiAlert(SpixiLocalization._SL("global-lock-invalidpassword-title"), SpixiLocalization._SL("global-lock-invalidpassword-text"), "Cancel");
            }

            return Task.CompletedTask;
        }

    }
}