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
using System.IO.Compression;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web;

namespace SPIXI
{
    /* ★ N75 (#391): THE LAUNCH FLOW IS ONE PAGE.
     *
     * It used to be four: LaunchPage (welcome) → LaunchCreatePage → LaunchRestorePage,
     * plus LaunchRetryPage as its own cold-start root. Every one of them built its own
     * WebView and loaded its own copy of the SAME generated document (intro.html,
     * intro_new.html, intro_restore.html, intro_retry.html — one source, four outputs),
     * so each step cost a full document parse plus a native page push. That is the
     * flicker Damir reported, and the redesigned shell already held every view.
     *
     * So this page hosts them all and switches IN PLACE:
     *   · the shell switches itself on a CTA and tells us which view it moved to
     *     (ixian:create / ixian:restore / ixian:back) — we only track it, for the
     *     hardware back button;
     *   · we can drive it the other way with the setLaunchView push (the retry
     *     lockout falls back to welcome);
     *   · the FIRST view rides a generatePage carrier (*SL{LaunchBootView}) so a cold
     *     unlock paints the retry view on its first frame instead of flashing welcome.
     *
     * The four verb sets were disjoint and moved here verbatim — in particular the
     * create/restore/proceed password parses are UNCHANGED (see the guardrail comment
     * on ixian:create: below; existing wallets were encrypted under today's parse).
     *
     * ★ N76 (#391): the onboarding tail (OnboardPage) is gone with this batch — create
     * and restore now land straight in the app.
     * ★ N72 (#391): the welcome appearance picker is gone — the whole launch flow is
     * fixed dark in both themes, so the pick changed nothing the user could see.
     */
    [XamlCompilation(XamlCompilationOptions.Compile)]
    public partial class LaunchPage : SpixiContentPage
    {
        private bool acceptedTerms = false;
        private int attempts = 0;               // wrong unlock attempts (retry view)

        // Which view the shell is showing. C# only needs this for the hardware back
        // button; the shell owns the actual switch.
        private string currentView = "welcome";

        public LaunchPage() : this("welcome")
        {
        }

        public LaunchPage(string bootView)
        {
            InitializeComponent();
            NavigationPage.SetHasNavigationBar(this, false);

            currentView = bootView == "retry" ? "retry" : "welcome";

            if (currentView == "welcome")
            {
                // Legacy behaviour, kept: a fresh install starts in English and the
                // welcome language pill changes it from there. NOT applied to the retry
                // entry — that account already has a language, and resetting it to
                // en-us on a cold unlock would be a silent language change.
                string lang = "en-us";
                if (SpixiLocalization.loadLanguage(lang))
                {
                    Preferences.Default.Set("language", lang);
                }
            }

            loadIntro();
        }

        // ONE document, ONE WebView. The boot view rides a generatePage carrier so it
        // is substituted into the very first frame (the devMode carrier grammar, #314).
        private void loadIntro()
        {
            setCurrentView(currentView);
            loadPage(webView, "intro.html");
        }

        /* ★ review MINOR-2: the boot carrier is re-registered on EVERY view change, not
         * only in the constructor. reload() and reloadAllPages() re-run generatePage at any
         * time (an OS theme flip does exactly that since N66), and a stale carrier would
         * re-boot the shell on WELCOME while this field still said "create" — after which
         * setLaunchView early-returns on an unchanged view and one hardware back does
         * nothing. Cheap: it is a dictionary write. */
        private void setCurrentView(string view)
        {
            currentView = view;
            SpixiLocalization.addCustomString("LaunchBootView", currentView);
        }

        // Follow the shell's own switch (it already moved) — nothing is pushed back.
        private void trackView(string view)
        {
            setCurrentView(view);
        }

        // Drive the shell the other way (retry lockout, hardware back).
        private void switchView(string view)
        {
            setCurrentView(view);
            Utils.sendUiCommand(this, "setLaunchView", view);
        }

        private void onLoad()
        {
            Utils.sendUiCommand(this, "setVersion", Config.version);
            if(!acceptedTerms)
            {
                Utils.sendUiCommand(this, "showTerms");
            }
        }

        private void onNavigated(object sender, WebNavigatedEventArgs e)
        {

        }

        private void onNavigating(object sender, WebNavigatingEventArgs e)
        {
            string current_url = HttpUtility.UrlDecode(e.Url);

            /* ★ review MAJOR-2: DISPATCH on the verb anchored at its start, never on a
             * Contains() over the whole URL. Four pages used to own one verb set each, so
             * no precedence existed between them; in one page a Contains("ixian:create:")
             * test runs BEFORE the restore and unlock branches and matches a PASSWORD that
             * happens to contain that literal — a restore would have generated a brand-new
             * wallet with an EMPTY password instead of restoring. Anchoring kills the whole
             * class, for every current and future launch verb.
             * ⚠ The PARSES below still slice `current_url` exactly as they always did
             * (IndexOf for create, Split for restore and proceed). That is deliberate: the
             * guardrail on this file is that existing wallets were encrypted under TODAY'S
             * decode-and-parse behaviour, so only the branch SELECTION changes here. For
             * every legitimate payload the two agree byte for byte. */
            int verb_start = current_url.IndexOf("ixian:", StringComparison.Ordinal);
            string verb = verb_start >= 0 ? current_url.Substring(verb_start) : current_url;

            // The bare view verbs are matched with Equals, the payload verbs with
            // StartsWith on the anchored verb.
            if (current_url.Equals("ixian:introload", StringComparison.Ordinal))
            {
                onLoad();
            }
            else if (current_url.Equals("ixian:create", StringComparison.Ordinal))
            {
                trackView("create");
            }
            else if (current_url.Equals("ixian:restore", StringComparison.Ordinal))
            {
                trackView("restore");
            }
            else if (current_url.Equals("ixian:back", StringComparison.Ordinal))
            {
                // The shell already switched back to welcome — this only keeps us in step.
                trackView("welcome");
            }
            else if (current_url.Equals("ixian:accept", StringComparison.Ordinal))
            {
                acceptedTerms = true;
            }
            else if (current_url.StartsWith("ixian:language:", StringComparison.Ordinal))
            {
                string lang = current_url.Substring("ixian:language:".Length);
                if(SpixiLocalization.loadLanguage(lang))
                {
                    Preferences.Default.Set("language", lang);
                }
                // the pick only exists on the welcome view, and the reload re-boots there
                currentView = "welcome";
                loadIntro();
                Utils.sendUiCommand(this, "showOnboardingSection");
            }
            else if (current_url.Equals("ixian:avatar", StringComparison.Ordinal))
            {
                _ = onChangeAvatarAsync(sender, e);
            }
            else if (current_url.Equals("ixian:error", StringComparison.Ordinal))
            {
                // #334 L5: "global -dialog-ok" (stray space) resolved to null → fixed key.
                displaySpixiAlert(SpixiLocalization._SL("intro-new-emptynick-title") ?? "Nickname required", SpixiLocalization._SL("intro-new-emptynick-text") ?? "Please enter a nickname to continue.", SpixiLocalization._SL("global-dialog-ok") ?? "OK");   // loop: hidden-locale fallback
            }
            else if (verb.StartsWith("ixian:create:", StringComparison.Ordinal))
            {
                // #334 L2: single IndexOf slice. The old parse rebuilt the password via
                // split[1].Replace(nick + ":", "") — Replace removes ALL occurrences, so a
                // password containing "<nick>:" (nick "bob", pass "xbob:y") was silently
                // corrupted to "xy" at CREATE time, while unlock/restore use the raw
                // remainder → the wallet was encrypted under a password the user can never
                // re-enter (silent lockout). Slice on the FIRST ':' only: nick = the text
                // before it, password = the raw remainder, separator chars and all —
                // matching the unlock (ixian:proceed:) and restore (ixian:restore:)
                // remainder semantics. Behavior-identical for every payload the redesigned
                // shell can emit (it gates colon-nicks and "<nick>:"-containing passwords,
                // launch-shell.js).
                // ⚠ GUARDRAIL: do NOT change the HttpUtility.UrlDecode above and do NOT
                // "harmonize" the unlock/restore parse paths — existing wallets were
                // encrypted under passwords produced by TODAY'S decode+parse behavior;
                // a unilateral decode/parse change there is a lockout vector. N75 moved
                // all three parses into this one file WITHOUT touching them, for exactly
                // that reason.
                string payload = current_url.Substring(current_url.IndexOf("ixian:create:", StringComparison.Ordinal) + "ixian:create:".Length);
                int sep = payload.IndexOf(':');
                string nick = sep >= 0 ? payload.Substring(0, sep) : payload;
                string pass = sep >= 0 ? payload.Substring(sep + 1) : "";

                // Create the account
                onCreateAccount(nick, pass);
            }
            else if (current_url.Equals("ixian:selectfile", StringComparison.Ordinal))
            {
                onSelectFile();
            }
            else if (verb.StartsWith("ixian:restore:", StringComparison.Ordinal))
            {
                string[] split = current_url.Split(new string[] { "ixian:restore:" }, StringSplitOptions.None);
                if (split.Count() < 1)
                {
                    e.Cancel = true;
                    Utils.sendUiCommand(this, "removeLoadingOverlay");
                    Utils.sendUiCommand(this, "showPasswordError");
                    return;
                }

                /* ★ W14 (#348, Damir's call): the SAME guard create already has.
                 * Delete-account now routes to the welcome screen and deliberately KEEPS
                 * the wallet, so a live wallet can sit behind onboarding for the first
                 * time. Create refuses in that state (onCreateAccount below); Restore
                 * had no equivalent check, so it was the one door that would have run
                 * over the wallet the user had just chosen to keep.
                 * Same honest alert, same shape, same strings as Create. */
                if (IxianHandler.getWalletList().Count > 0)
                {
                    /* D-7 (#371): RESTORE gets its OWN copy. The Create message
                     * ("restart to continue with it") answers a question the
                     * restoring user did not ask and names no way forward — one
                     * dangerous door had become zero doors. This one names the
                     * path out (findings §D-7, correct regardless of D-6). */
                    displaySpixiAlert(SpixiLocalization._SL("intro-restore-walletexists-title") ?? "Account already on this device",
                        SpixiLocalization._SL("intro-restore-walletexists-text") ?? "An account already exists on this device. To use it, restart Spixi. To restore a different account: restart Spixi, open Account, tap Delete wallet, then open Restore again.",
                        SpixiLocalization._SL("global-dialog-ok") ?? "OK");
                    e.Cancel = true;
                    Utils.sendUiCommand(this, "removeLoadingOverlay");
                    return;
                }

                string password = split[1]; // Todo: secure this
                if(!onRestore(password))
                {
                    e.Cancel = true;
                    Utils.sendUiCommand(this, "removeLoadingOverlay");
                }
            }
            else if (verb.StartsWith("ixian:proceed:", StringComparison.Ordinal))
            {
                string[] split = current_url.Split(new string[] { "ixian:proceed:" }, StringSplitOptions.None);
                if(split.Count() < 1)
                {
                    e.Cancel = true;
                    return;
                }

                string password = split[1]; // Todo: secure this
                proceed(password);
            }
            else
            {
                // Otherwise it's just normal navigation
                e.Cancel = false;
                return;
            }
            e.Cancel = true;

        }

        /* Hardware back. The form views used to be separate pages, so back popped one;
         * now it walks the view back to welcome inside the same document. On welcome
         * (and on a cold-unlock retry, which is the root page) we fall through to the
         * default — leaving the app, exactly as before. */
        protected override bool OnBackButtonPressed()
        {
            if (currentView == "create" || currentView == "restore")
            {
                switchView("welcome");
                return true;
            }

            return base.OnBackButtonPressed();
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

                        Preferences.Default.Remove("lockenabled");
                        Preferences.Default.Remove("waletpass");
                        /* ★ N12 (#383), amended by N76 (#391): a CREATE is not a restore.
                         * Clearing the reminder stamp is what ARMS the first-asset backup
                         * nudge (HomePage.displayBackupReminder): absent stamp + no asset =
                         * silence, absent stamp + the first contact/message/incoming balance
                         * = the nudge, once. onRestore SETS the stamp instead, so a failed
                         * restore followed by a create must not inherit it. */
                        Preferences.Default.Remove("backupReminderTimestamp");

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

        // Shows a file picker to select the wallet file
        private async void onSelectFile()
        {
            byte[] _data = null;
            // #334 L7: the shell previously displayed the STAGING filename
            // ("wallet.ixi.tmp") — surface the picked file's real display name
            // (SpixiImageData.name, filled by every platform SFilePicker) instead;
            // the staging path stays the fallback when a platform leaves it null.
            string pickedName = null;
            try
            {
                SpixiImageData fileData = await SFilePicker.PickFileAsync();
                if (fileData == null)
                    return; // User canceled file picking

                pickedName = fileData.name;

                var stream = fileData.stream;
                _data = new byte[stream.Length];
                stream.Read(_data, 0, (int)stream.Length);
            }
            catch (Exception ex)
            {
                Logging.error("Exception choosing file: " + ex.ToString());
#pragma warning disable CS4014 // Because this call is not awaited, execution of the current method continues before the call is completed
                displaySpixiAlert(SpixiLocalization._SL("intro-restore-file-error-title"), SpixiLocalization._SL("intro-restore-file-selecterror-text"), SpixiLocalization._SL("global-dialog-ok"));
#pragma warning restore CS4014 // Because this call is not awaited, execution of the current method continues before the call is completed
                return;
            }

            if (_data == null)
            {
                await displaySpixiAlert(SpixiLocalization._SL("intro-restore-file-error-title"), SpixiLocalization._SL("intro-restore-file-readerror-text"), SpixiLocalization._SL("global-dialog-ok"));
                return;
            }

            string docpath = Config.spixiUserFolder;
            string filepath = Path.Combine(docpath, Config.walletFile + ".tmp");
            try
            {
                File.WriteAllBytes(filepath, _data);
            }
            catch (Exception ex)
            {
                Logging.error("Exception caught in process: {0}", ex);
#pragma warning disable CS4014 // Because this call is not awaited, execution of the current method continues before the call is completed
                displaySpixiAlert(SpixiLocalization._SL("intro-restore-file-error-title"), SpixiLocalization._SL("intro-restore-file-writeerror-text"), SpixiLocalization._SL("global-dialog-ok"));
#pragma warning restore CS4014 // Because this call is not awaited, execution of the current method continues before the call is completed
                return;
            }

            // #334 L7: push the picked display name (shell baseName() handles a bare
            // filename unchanged); the staging path only when no name was available.
            Utils.sendUiCommand(this, "setUploadedFileName", pickedName ?? filepath);
        }

        // Attempt to restore the wallet
        private bool onRestore(string pass)
        {
            Preferences.Default.Remove("lockenabled");
            Preferences.Default.Remove("waletpass");

            /* ★ N12 (#383, Damir 2026-08-18): "when restoring an account, we shouldn't
             * nudge the user to back up immediately, since it's restoring from backup."
             * The onboarding tail carried one of those two nudges and is gone (N76), so
             * only this leg is left: displayBackupReminder fires as soon as
             * backupReminderTimestamp is absent AND the account holds a real asset — and
             * a restored account holds its contacts from the first tick. Seeding the
             * stamp here starts the 30-day period (Config.backupReminder) at the restore,
             * which is exactly "don't ask someone who just restored from a backup".
             * Existing key, existing period — nothing new. */
            Preferences.Default.Set("backupReminderTimestamp", Clock.getTimestamp().ToString());

            Preferences.Default.Set("walletpass", pass);

            string source_path = Path.Combine(Config.spixiUserFolder, Config.walletFile) + ".tmp";
            if(!File.Exists(source_path))
            {
#pragma warning disable CS4014 // Because this call is not awaited, execution of the current method continues before the call is completed
                displaySpixiAlert(SpixiLocalization._SL("intro-restore-file-error-title"), SpixiLocalization._SL("intro-restore-file-selecterror-text"), SpixiLocalization._SL("global-dialog-ok"));
#pragma warning restore CS4014 // Because this call is not awaited, execution of the current method continues before the call is completed
                return false;
            }
            if (restoreAccountFile(source_path, pass))
            {
                return true;
            }
            restoreWalletFile(source_path, pass);
            return true;
        }

        private bool restoreAccountFile(string source_path, string pass)
        {
            // TODO add file header
            string tmpDirectory = Path.Combine(Config.spixiUserFolder, "tmp_zip");
            try
            {
                if(Directory.Exists(tmpDirectory))
                {
                    Directory.Delete(tmpDirectory, true);
                }
                Directory.CreateDirectory(tmpDirectory);
                byte[] decrypted = CryptoManager.lib.decryptWithPassword(File.ReadAllBytes(source_path), pass, true);
                if (decrypted == null)
                {
                    Directory.Delete(tmpDirectory, true);
                    return false;
                }
                byte[] header = UTF8Encoding.UTF8.GetBytes("SPIXIACCB1");
                for(int i = 0; i < header.Length; i++)
                {
                    if(decrypted[i] != header[i])
                    {
                        Directory.Delete(tmpDirectory, true);
                        return false;
                    }
                }
                byte[] zipFileBytes = decrypted.Skip(header.Length).ToArray();
                File.WriteAllBytes(source_path, zipFileBytes);
                ZipFile.ExtractToDirectory(source_path, tmpDirectory);
                string tmpWalletFile = Path.Combine(tmpDirectory, Config.walletFile);
                WalletStorage ws = new WalletStorage(tmpWalletFile);
                if (!ws.verifyWallet(tmpWalletFile, pass))
                {
                    Directory.Delete(tmpDirectory, true);
                    Utils.sendUiCommand(this, "showPasswordError");
                    // Remove overlay
                    Utils.sendUiCommand(this, "removeLoadingOverlay");
                    return false;
                }
                Directory.Delete(Path.Combine(Config.spixiUserFolder, "Acc"), true);
                Directory.Move(Path.Combine(tmpDirectory, "Acc"), Path.Combine(Config.spixiUserFolder, "Acc"));
//                Directory.Delete(Path.Combine(Config.spixiUserFolder, "Chats"), true);
//                Directory.Move(Path.Combine(tmpDirectory, "Chats"), Path.Combine(Config.spixiUserFolder, "Chats"));
                if (File.Exists(Path.Combine(tmpDirectory, "account.ixi")))
                {
                    File.Move(Path.Combine(tmpDirectory, "account.ixi"), Path.Combine(Config.spixiUserFolder, "account.ixi"));
                }
                if (File.Exists(Path.Combine(tmpDirectory, "avatar.jpg")))
                {
                    File.Move(Path.Combine(tmpDirectory, "avatar.jpg"), Path.Combine(Config.spixiUserFolder, "avatar.jpg"));
                }
                File.Move(Path.Combine(tmpDirectory, "wallet.ixi"), Path.Combine(Config.spixiUserFolder, "wallet.ixi"));

                Node.loadWallet();
                Directory.Delete(tmpDirectory, true);
                File.Delete(source_path);
                IxianHandler.localStorage.accountRestored = true;
                goHome();
                return true;
            }catch(Exception e)
            {
                Logging.warn("Exception occured while trying to restore account file: " + e);
                Directory.Delete(tmpDirectory, true);
            }
            return false;
        }

        private bool restoreWalletFile(string source_path, string pass)
        {
            // TODO add file header
            string target_filepath = Path.Combine(Config.spixiUserFolder, Config.walletFile);
            WalletStorage ws = new WalletStorage(source_path);
            if (!ws.verifyWallet(source_path, pass))
            {
                Utils.sendUiCommand(this, "showPasswordError");
                // Remove overlay
                Utils.sendUiCommand(this, "removeLoadingOverlay");
                return false;
            }
            else
            {
                File.Move(source_path, target_filepath);
                Node.loadWallet();
            }
            goHome();
            return true;
        }

        private void proceed(string pass)
        {
            // TODO: encrypt the password
            Preferences.Default.Set("walletpass", pass);

            bool wallet_decrypted = Node.loadWallet();

            if (wallet_decrypted == false)
            {
                displaySpixiAlert(SpixiLocalization._SL("intro-retry-invalidpassword-title"), SpixiLocalization._SL("intro-retry-invalidpassword-text"), SpixiLocalization._SL("global-dialog-ok"));

                // If too many wrong attempts, throw the user to the launch screen, allowing creation or restoration of wallet
                attempts++;
                if(attempts > Config.encryptionRetryPasswordAttempts)
                {
                    // ★ N75: this used to push a SECOND LaunchPage and remove itself.
                    // One page holds every view now, so the lockout is a view switch —
                    // no navigation, no second WebView, and the welcome screen offers
                    // create/restore exactly as before (both refuse while a wallet
                    // exists, LaunchCreatePage/LaunchRestorePage guards moved with them).
                    switchView("welcome");
                }

                // Remove overlay
                Utils.sendUiCommand(this, "removeLoadingOverlay");

                return;
            }

            goHome();
        }

        /* ★ review MINOR-3: hand over to Home and only THEN drop this page. Since N75 this
         * page is the NavigationPage ROOT, and RemovePage on a root that is still the
         * DISPLAYED page is rejected — removePage swallows that and Disposes the page
         * anyway, which would leave a disposed LaunchPage under Home. The create path
         * always awaited its push; restore and unlock did not have to, because they ran in
         * a page that had been pushed on top of one. Now they do. */
        private void goHome()
        {
            MainThread.BeginInvokeOnMainThread(async () =>
            {
                await Navigation.PushAsync(HomePage.Instance(true), Config.defaultXamarinAnimations);
                removePage(this);
            });
        }
    }
}
