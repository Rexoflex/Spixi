using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using SPIXI.Lang;
using System;
using System.Web;

namespace SPIXI
{
    [XamlCompilation(XamlCompilationOptions.Compile)]
    public partial class OnboardPage : SpixiContentPage
    {
        public event EventHandler<SPIXI.EventArgs<bool>> onboardDone;
        public bool joinBot = false;

        public OnboardPage()
        {
            InitializeComponent();
            NavigationPage.SetHasNavigationBar(this, false);

            loadPage(webView, "onboarding.html");
        }

        private void onNavigated(object sender, WebNavigatedEventArgs e)
        {

        }

        private void onNavigating(object sender, WebNavigatingEventArgs e)
        {
            string current_url = HttpUtility.UrlDecode(e.Url);

            if (current_url.Equals("ixian:back", StringComparison.Ordinal))
            {
                Navigation.PopModalAsync();
            }
            else if (current_url.Contains("ixian:joinbot"))
            {
                joinBot = true;
                finishOnboarding();
            }
            else if (current_url.Equals("ixian:backup", StringComparison.Ordinal))
            {
                // #334 L3/AND-5: the tail's "Back up now" CTA — launch the account-backup
                // share sheet via the #243 static (self-contained: C# names every path;
                // reads Preferences "walletpass", which create sets before this modal).
                // NON-terminal verb: the shell advances to the join step on its own, and
                // the joinbot/finish mutual-exclusion latch is untouched.
                _ = BackupPage.backupAccount();
            }
            else if (current_url.Equals("ixian:error", StringComparison.Ordinal))
            {
                // #334 L5: "global -dialog-ok" (stray space) resolved to null → fixed key.
                displaySpixiAlert(SpixiLocalization._SL("intro-new-emptynick-title") ?? "Nickname required", SpixiLocalization._SL("intro-new-emptynick-text") ?? "Please enter a nickname to continue.", SpixiLocalization._SL("global-dialog-ok") ?? "OK");   // loop: hidden-locale fallback
            }
            else if (current_url.Equals("ixian:finish", StringComparison.Ordinal))
            {
                finishOnboarding();
            }
            else if (current_url.StartsWith("ixian:", StringComparison.Ordinal))
            {
                // #334 loop MINOR-1: an UNKNOWN ixian: verb must never fall through to
                // real navigation — on Android WebView an unknown scheme can replace
                // this page with an ERR_UNKNOWN_URL_SCHEME error page, wedging
                // onboarding (the shell↔exe skew class). Swallow it.
                e.Cancel = true;
                return;
            }
            else
            {
                // Otherwise it's just normal navigation
                e.Cancel = false;
                return;
            }
            e.Cancel = true;

        }

        private void finishOnboarding()
        {
            if (onboardDone != null)
            {
                onboardDone(this, new SPIXI.EventArgs<bool>(joinBot));
            }
            Navigation.PopModalAsync(false);
        }

        protected override bool OnBackButtonPressed()
        {
            Navigation.PopModalAsync(false);

            return true;
        }
    }
}
