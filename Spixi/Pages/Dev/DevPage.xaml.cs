using IXICore.Meta;                                   // #321: Logging (sendlog failure path)
using Microsoft.Maui.ApplicationModel.DataTransfer;   // #321: Share.RequestAsync (log share sheet)
using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using Microsoft.Maui.Storage;                         // ★ S11 C (#1262): Preferences (the flash switches)
using SPIXI.Meta;
using System;
using System.IO;
using System.Web;

namespace SPIXI
{
    [XamlCompilation(XamlCompilationOptions.Compile)]
    public partial class DevPage : SpixiContentPage
    {
        public DevPage()
        {
            InitializeComponent();

            NavigationPage.SetHasNavigationBar(this, false);

            loadPage(webView, "dev.html");
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
            else if (current_url.Equals("ixian:sendlog", StringComparison.Ordinal))
            {
                // #321 (R5 parity, Damir 2026-08-10): legacy dev mode could SEND the
                // log. Mobile/Catalyst = OS share sheet with the file attached;
                // Windows = save to Downloads (Damir's desktop dial). C# names every
                // path itself — nothing WebView-supplied touches the filesystem (§3).
                onSendLog();
            }
            else if (current_url.Equals("ixian:back", StringComparison.Ordinal))
            {
                onBack();
            }
            else if (current_url.StartsWith("ixian:devflash:", StringComparison.Ordinal))
            {
                /* ★ S11 C (#1262, 🟡 new verb, dev surface): `ixian:devflash:<candidate|grounds|input>:<0|1>` — the 10-FLASH
                 * probe switches (1 = that action OFF). Exact grammar (S11ChatRules.applyFlashVerb) and dev mode on, or
                 * nothing is stored; then echo the stored positions. One int preference; fixed words only. */
                try
                {
                    int stored = Preferences.Default.Get(S11ChatRules.FlashPrefKey, 0);
                    if (Preferences.Default.Get("devMode", false)
                        && S11ChatRules.applyFlashVerb(current_url.Substring("ixian:devflash:".Length), stored, out int next))
                    {
                        Preferences.Default.Set(S11ChatRules.FlashPrefKey, next);
                    }
                }
                catch (Exception ex)
                {
                    Logging.warn("DevPage: flash switch failed: " + ex.GetType().Name);
                }
                pushFlashDev();
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
            // #321: declare the sendlog verb BEFORE the log lands (dev.html rebuilds
            // its screen with the Send button when the cap arrives; an old shell
            // ignores the unknown push).
            Utils.sendUiCommand(this, "setCaps", "sendlog");
            pushFlashDev();   // ★ S11 C (#1262): the flash switches' positions

            string srcLogPath = Path.Combine(Config.spixiUserFolder, "ixian.log");
            string destLogPath = Path.Combine(Config.spixiUserFolder, "ixian.log.tmp");
            /* ★ #1153 (#46 r1 C-n3): onLoad runs on EVERY OnAppearing (also the return from a call over this modal). A
             * file error here (the log locked or rotating) was an uncaught exception on the UI thread — a candidate for
             * the Windows UnhandledException break. Log its type only and show no log rather than crash. */
            string logContents = "";
            try
            {
                if (File.Exists(destLogPath))
                {
                    File.Delete(destLogPath);
                }

                File.Copy(srcLogPath, destLogPath);
                logContents = File.ReadAllText(destLogPath);
                File.Delete(destLogPath);
            }
            catch (Exception ex)
            {
                Logging.warn("DevPage: log read failed: " + ex.GetType().Name);
            }

            Utils.sendUiCommand(this, "setLog", logContents);
            // Execute timer-related functionality immediately
            updateScreen();
        }

        /** ★ S11 C (#1262, 🟡 new push): the 10-FLASH switch positions ("1,1,1" = the defaults). `window.setFlashDev` = a
         *  guarded reference: an older dev shell without the handler ignores it (executeUiCommand: not a function). */
        private void pushFlashDev()
        {
            int bits = 0;
            try
            {
                bits = Preferences.Default.Get(S11ChatRules.FlashPrefKey, 0);
            }
            catch (Exception)
            {
            }
            Utils.sendUiCommand(this, "window.setFlashDev", S11ChatRules.flashSwitchesArg(bits));
        }

        // #321 (R5 parity): share/save the CURRENT log. The share copy is a stable
        // C#-named snapshot (spixi-log.txt — .txt so mail/share targets accept it;
        // overwritten per send, never deleted mid-share: the sheet reads it async).
        private async void onSendLog()
        {
            try
            {
                string srcLogPath = Path.Combine(Config.spixiUserFolder, "ixian.log");
                string shareLogPath = Path.Combine(Config.spixiUserFolder, "spixi-log.txt");
                File.Copy(srcLogPath, shareLogPath, true);
#if WINDOWS
                // Desktop dial (Damir 2026-08-10): SAVE, not share — timestamped into
                // the user's Downloads, confirmed with a native alert.
                string downloads = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads");
                Directory.CreateDirectory(downloads);
                string dest = Path.Combine(downloads, "spixi-log-" + DateTime.Now.ToString("yyyyMMdd-HHmmss") + ".txt");
                File.Copy(shareLogPath, dest, true);
                displaySpixiAlert("Log saved", dest, "OK");   // dev surface = English-only (#301 precedent)
#else
                await Share.RequestAsync(new ShareFileRequest
                {
                    Title = "Spixi log",
                    File = new ShareFile(shareLogPath)
                });
#endif
            }
            catch (Exception e)
            {
                Logging.error("Exception in onSendLog: " + e);
            }
        }

        // Executed every second
        public override void updateScreen()
        {

        }

        private void onBack()
        {
            Navigation.PopModalAsync();
        }

        protected override bool OnBackButtonPressed()
        {
            onBack();

            return true;
        }
    }
}