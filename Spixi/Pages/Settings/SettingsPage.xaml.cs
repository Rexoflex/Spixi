using IXICore;
using IXICore.Meta;
using IXICore.Network;
using IXICore.Streaming;
using Microsoft.Maui.ApplicationModel;    // iOS-21: Browser.Default (SingleChatPage:21 precedent)
using Microsoft.Maui.ApplicationModel.DataTransfer;   // #455 G5: Share.RequestAsync (HomePage:10 precedent)
using System.Collections.Generic;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using Microsoft.Maui.Storage;
using Spixi;
using SPIXI.Interfaces;
using SPIXI.Lang;
using SPIXI.Meta;
using System;
using System.IO;
using System.Linq;                 // ★ #593: NavigationStack is IReadOnlyList<Page>, whose Contains is Enumerable's — and this project sets <ImplicitUsings>disable</ImplicitUsings>, so it must be imported by hand (47 other files already do)
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

        // #334 iOS-61: the Account peer tab draws its OWN bottom-nav replica
        // (settings.html) — it was blind to unread because the count was only
        // ever pushed to the home WebView. This override rides the EXISTING tick
        // plumbing for free: presented → HomePage.OnUpdateUI ticks the top
        // overlay; parked → no ticks (hidden, fine); warm re-present →
        // representParkedOverlay calls updateScreen() = instant refresh, no
        // staleness window. VALUE-latched deliberately — NOT the SingleChatPage
        // edge-latch, whose number is documented-dishonest (chat.html:2745).
        // Known dial (DECISIONS #334): getUnreadMessageCount is mute-BLIND while
        // the home badge is mute-aware (CH4 FE-interim) → the two can differ
        // while a muted chat holds unread; accepted until CH4 lands C#-side.
        int lastPushedUnread = -1;
        public override void updateScreen()
        {
            base.updateScreen();

            int unread = FriendList.getUnreadMessageCount();
            if (unread != lastPushedUnread)
            {
                Utils.sendUiCommand(this, "setUnreadIndicator", unread.ToString());
                lastPushedUnread = unread;
            }
        }

#if SPIXI_DEV_COEXIST
        /// <summary>★ Session I ②: `ixian:devseed` / `ixian:devunseed` — no payload; the
        /// status pushed back is a fixed English sentence (dev-only, #301 precedent).</summary>
        private bool handleDevSeedVerb(string current_url)
        {
            bool seed = current_url.Equals("ixian:devseed", StringComparison.Ordinal);
            // ★ Session J: the count dial — `ixian:devseed:heavy` (10 × 1000 + 40 × 40); the bare verb stays light
            bool heavy = current_url.Equals("ixian:devseed:heavy", StringComparison.Ordinal);
            bool unseed = current_url.Equals("ixian:devunseed", StringComparison.Ordinal);
            if (!seed && !heavy && !unseed)
            {
                return false;
            }
            Task.Run(() =>
            {
                string status;
                try { status = unseed ? SDevSeed.unseed() : SDevSeed.seed(heavy ? "heavy" : "light"); }
                catch (Exception ex) { status = (seed ? "Seed" : "Remove") + " failed: " + ex.Message; Logging.error("[DEVSEED] " + ex); }
                Utils.sendUiCommand(this, "setDevSeed", status);
            });
            return true;
        }
#endif

        private void onLoad()
        {
            // #334 loop MINOR-1: every ixian:onload = a FRESH document (reloadAllPages
            // on the OS theme flip reboots the shell with its badge state gone) — the
            // value latch must reset or the unread badge stays silently absent until
            // the count CHANGES.
            lastPushedUnread = -1;

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
            // #341 (Damir F5 item (a)): + encpassInline — ixian:changepass: is dispatched
            // below, so the PANE renders Change password as a true hub SUBLEVEL instead of
            // the EncryptionPassword page covering the whole Account. Mobile keeps the
            // pushed page (the shell gates the inline route on paneMode too). An old exe
            // never pushes this cap, so a new shell falls back to ixian:encpass.
            // ★ NOTIF-2 (Damir's 2026-08-21 block): + globalNotifications. The
            // Notifications SCREEN and its hub row have been built since #147 and gated on
            // this exact capability, which the production shell has never set — a screen
            // that has shipped DARK for months (createNotificationsScreen,
            // settings-screens.js:551-582; the hub row, settings-shell.js:793-797). The
            // same gate hides the "In-app sounds" switch, which is why the notifications
            // block and the sound-effects block are one wiring job.
            // ★ PA1 (#525): + paymentAuth — the "Confirm payments" toggle. The verb
            // persists immediately; setPaymentAuth below seeds the switch position.
            // ★ W-g (Damir F5 2026-08-23, items 18-19; amends #525): NOT on Windows.
            // SPayments.confirmAndAuth returns before the biometric gate on WinUI
            // (Plugin.Fingerprint is skipped there — the LockPage:382 rule), so the
            // toggle changes nothing on that platform. A no-op switch is a lie; the cap
            // is withheld and the shell never renders the row. Android/iOS keep it.
            string caps = "settingsApply,backupInline,downloadsInline,encpass,encpassInline,globalNotifications";
            if (SPayments.paymentAuthSupported())
            {
                caps += ",paymentAuth";
            }
            // ★★ P2 (#708): + pushProvider — ONLY where a push provider exists. Windows and
            // Mac Catalyst carry a stub SPushService, so a switch there would change nothing
            // (the W-g rule: a no-op switch is a lie). The shell never renders the row
            // without this cap.
            if (SPushService.pushProviderSupported())
            {
                caps += ",pushProvider";
            }
            Utils.sendUiCommand(this, "setCaps", caps);

            // ★ NOTIF-2: the current values, so the switches render in the right position
            // rather than at the component defaults. Three bools, one push each — the
            // house grammar for this page.
            Utils.sendUiCommand(this, "setNotifEnabled", SNotificationPrefs.notificationsEnabled.ToString());
            Utils.sendUiCommand(this, "setNotifSenderName", SNotificationPrefs.showSenderName.ToString());
            Utils.sendUiCommand(this, "setNotifSounds", SNotificationPrefs.inAppSounds.ToString());
            if (SPushService.pushProviderSupported())
            {
                Utils.sendUiCommand(this, "setNotifPushProvider", SNotificationPrefs.pushProviderEnabled.ToString());   // P2 (#708): seed the switch
            }
            if (SPayments.paymentAuthSupported())
            {
                Utils.sendUiCommand(this, "setPaymentAuth", SPayments.paymentAuthEnabled().ToString());   // PA1 (#525) · W-g: no seed where there is no row
            }

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
#if SPIXI_DEV_COEXIST
            // ★ Session I ②: dev builds only — the About screen renders the seed-harness card
            // once this lands (Utils/SDevSeed.cs; store builds have no symbol and no push).
            Utils.sendUiCommand(this, "setDevSeed", SDevSeed.status());
#endif

            // S1: own IDENTITY address for the add-me QR/address block — PLAIN form, like
            // the legacy share verb (HomePage:322), NOT the ExtendedAddress payment form
            // (its _suffix encodes the OfflineTag payment flag; wallet-receive only)
            Utils.sendUiCommand(this, "setAddress", IxianHandler.getWalletStorage().getPrimaryAddress().ToString());

            // S3: current language for the Language row. N4 (#379, loop r1
            // MINOR-3): push the RESOLVED code SpixiLocalization actually loaded,
            // not the raw preference — a persisted variant culture ("it-ch")
            // otherwise puts a raw-code row + false languagePending hint on the
            // picker while the app runs it-it. resetLanguage() has already loaded
            // the preference by the time this pushes.
            Utils.sendUiCommand(this, "setLanguage", SPIXI.Lang.SpixiLocalization.getCurrentLanguage());

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
            // #797: cancel first. A throw in a branch must not leave an ixian: navigation for the WebView to load.
            e.Cancel = true;

            if (onNavigatingGlobal(current_url))
            {
                e.Cancel = true;
                return;
            }

#if SPIXI_DEV_COEXIST
            /* ★ Session I ② — the seed harness verbs (Utils/SDevSeed.cs). Dev builds only: the
             * symbol, this dispatch, the About card and the setDevSeed push exist together or
             * not at all. A separate statement, not a branch of the chain below — tree-sitter
             * (cs-syntax-check) cannot parse a preprocessor block between else-ifs. */
            if (handleDevSeedVerb(current_url))
            {
                e.Cancel = true;
                return;
            }
#endif
            if (current_url.Equals("ixian:onload", StringComparison.Ordinal))
            {
                onLoad();
            }
            else if (current_url.Equals("ixian:back", StringComparison.Ordinal)
                || current_url.Equals("ixian:handoff", StringComparison.Ordinal))
            {
                var source_file_path = Path.Combine(IxianHandler.localStorage.avatarsPath, "avatar-tmp.jpg");
                // Delete the temporary avatar image
                if (File.Exists(source_file_path))
                {
                    File.Delete(source_file_path);
                }
                resetLanguage();
                closeSublevelOverlays();   // W7
                /* ★ Session I — L14 cover handshake: `ixian:handoff` is the Account → Contacts
                 * route (settings.html wrote the spixi.landtab hand-off and is leaving). Same
                 * cleanup as ixian:back, but the pop waits for home.html's painted cover
                 * (SpixiContentPage.popOnCoverPainted — 400 ms backstop), so the chat list
                 * never shows through the gap [PAINTDIAG] measured (#731: 56/88 ms). */
                if (current_url.Equals("ixian:handoff", StringComparison.Ordinal))
                {
                    popOnCoverPainted();
                }
                else
                {
                    popPageAsync();
                }
            }
            else if (current_url.Equals("ixian:error", StringComparison.Ordinal))
            {
                displaySpixiAlert(SpixiLocalization._SL("settings-emptynick-title"), SpixiLocalization._SL("settings-emptynick-text"), SpixiLocalization._SL("global-dialog-ok"));
            }

            else if (current_url.Equals("ixian:share", StringComparison.Ordinal))
            {
                /* ★ #455 (G5, Damir on device: "the share icon copies instead of
                 * sharing"). It was never a regression and never a hit-area problem —
                 * the Account share button HAS NO NATIVE RUNG. Its ladder was
                 * navigator.share → clipboard, and Android's WebView does not implement
                 * the Web Share API, so the FIRST rung is missing on the only platform
                 * that matters and the clipboard was always the answer.
                 *
                 * The sibling shell got this right: home.html's wallet-receive Share
                 * falls back to `ixian:share`, and HomePage:748 dispatches it. Only the
                 * desktop gate was mirrored into settings.html, not the terminal rung.
                 *
                 * Same payload, provably: SettingsPage pushes the Account address with
                 * `setAddress` from getPrimaryAddress().ToString() (:143), which is the
                 * exact expression HomePage shares. There is no second address to get
                 * wrong. */
                Share.RequestAsync(new ShareTextRequest
                {
                    Text = IxianHandler.getWalletStorage().getPrimaryAddress().ToString(),
                });
            }
            // ★ Batch C (#545) C2: `ixian:delete` (delete WALLET) is RETIRED — redundant next
            // to the full wipe below (#532, Damir). An old shell that still emits it gets the
            // same full wipe behind the same auth gate: there is no half-delete any more.
            else if (current_url.Equals("ixian:deletea", StringComparison.Ordinal)
                     || current_url.Equals("ixian:delete", StringComparison.Ordinal))
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
                // (HomePage:517 precedent).
                // W7 (Damir F5, Windows: "hangs when I enter change password screen"):
                // it used to open PINNED TO COLUMN 1 (`paneMode ? 1 : -1`) — the #265 ②
                // Downloads bug exactly. The Account pane is FULL-SPAN minus the rail, so
                // a col-1 pin covered only its DETAIL region: the hub stayed visible and
                // LIVE, and every row the user then tapped opened its sublevel UNDER the
                // password pane. Nothing moved on screen ⇒ "the Account is dead", and only
                // a rail tab switch (HomePage:633 requestSettingsOverlayExit → the shell
                // exits → this page is disposed) ever cleared it. Now it inherits THIS
                // page's own stage inset and spans (column -1), i.e. it covers its opener
                // EXACTLY: a real takeover, no live-but-blind surface left beside it. The
                // rail keeps its #245 strip, so Account/Chats/… stay reachable, and the
                // exit sweep below closes this pane with the Account it belongs to.
                // Mobile (non-pane) is byte-identical: no overlay margin ⇒ Thickness.Zero.
                pushPageLoaded(new EncryptionPassword(), 4000, null, -1, null,
                    getOverlayStageMargin(this), revealDelayMs: 0);   // load-then-move (N3) · ★ Session K #766: a form, nothing pushed after onload → no hold
            }
            else if (current_url.StartsWith("ixian:changepass:", StringComparison.Ordinal))
            {
                // #341 (Damir F5 item (a)): the Account PANE renders Change password as an
                // in-hub SUBLEVEL (cap 'encpassInline'), so the form lives in THIS WebView
                // and there is no EncryptionPassword page to pop. Same frozen verb, same
                // delimiter and the same validation as EncryptionPassword.xaml.cs:53. Only
                // the answer differs: a setEncPassResult push, because inline there is no
                // page pop for the shell to read as success.
                //
                // ★ SECURITY — read before you touch this branch:
                //  · split_url[1] and [2] are PLAINTEXT wallet-password material. Never log
                //    them, never echo them back to the WebView, never widen this verb.
                //  · onNavigating cancels the navigation before any branch runs (#797), so
                //    the URL never becomes a session-history entry.
                //  · The shell scrubs its three fields on every leave path. This document
                //    outlives the screen, so an unscrubbed form keeps the values (#341).
                //  · Length must be EXACTLY 3. The shell already refuses a password that
                //    contains the delimiter, but a longer split would mean the delimiter
                //    got through, and writing split_url[2] then re-encrypts the wallet with
                //    a TRUNCATED password the user can never reproduce. Refuse instead.
                //  · ★ The try/catch is NOT optional (#341 audit MAJOR-1). It keeps a throw
                //    from writeWallet inside this branch, so the user still gets an answer
                //    and the page stays usable. It was also the ONLY thing that stopped a
                //    throw from leaving e.Cancel unset: the iOS handler then logged the
                //    WHOLE URL — iOSWebViewHandler writes navigationAction.Request.Url into
                //    ixian.log, which DevPage renders and offers through the share sheet,
                //    putting both passwords in cleartext in a shareable file. #797 closes
                //    that second leg for every branch by cancelling first.
                string[] split_url = current_url.Split(new string[] { "--1ec4ce59e0535704d4--" }, StringSplitOptions.None);
                // "1" = changed · "0" = wrong current password · "2" = the request itself was
                // not usable. Separating "2" keeps the diagnosis honest: without it a payload
                // the shell should never send is reported as "wrong current password", and no
                // retry can ever succeed (#341 audit MINOR-2).
                string encResult = "2";
                try
                {
                    // ENC_MIN mirror (src/components/lock-shell.js:46). The shell gates this
                    // already, but the inline route removed the separate EncryptionPassword
                    // page, so C# must be able to refuse an empty or short password on its
                    // own. A wallet re-encrypted with "" is a silent security downgrade.
                    if (split_url.Length == 3 && split_url[2].Length >= 10)
                    {
                        if (IxianHandler.getWalletStorage().isValidPassword(split_url[1]))
                        {
                            IxianHandler.getWalletStorage().writeWallet(split_url[2]);
                            // ★ #341 review MAJOR-1 — CONFIRM the write instead of assuming it.
                            // writeWallet is called as a statement here and at every other site
                            // in this repo, so a failure reported by RETURN VALUE (not by an
                            // exception) would pass the try/catch unseen. Before this batch that
                            // was survivable: the wallet and the cached preference both stayed
                            // on the OLD password. Now the preference moves, so an unnoticed
                            // failure would lock the user out at the next cold start. Asking the
                            // storage whether the NEW password opens it is true either way, and
                            // it needs no knowledge of the return type (Ixian-Core is outside
                            // this repo — rule #215). 🟡 Confirm on device that this reports
                            // false after a failed write; the belt is cheap, not proven.
                            if (!IxianHandler.getWalletStorage().isValidPassword(split_url[2]))
                            {
                                Logging.error("Wallet password change did not take effect; the cached password was left unchanged.");
                                encResult = "2";
                            }
                            else
                            {
                            // ★ #341 audit MAJOR-2 — the wallet password is ALSO cached as a
                            // preference, and Node.loadWallet reads it at every cold start
                            // (Node.cs:248-256). Re-encrypting the wallet without updating it
                            // means the next launch opens the wallet with the OLD password,
                            // fails, and drops the user on the retry view — "my account is
                            // gone". BackupPage.xaml.cs:144 encrypts the backup archive with
                            // the same preference, so a backup taken before the next restart
                            // needs one password for the archive and another for the wallet
                            // inside it: unrestorable. Create/restore/retry all set it
                            // (the create/restore/retry paths, all in LaunchPage since N75).
                            Preferences.Default.Set("walletpass", split_url[2]);
                            encResult = "1";
                            }
                        }
                        else
                        {
                            encResult = "0";
                        }
                    }
                }
                catch (Exception ex)
                {
                    // NEVER log the URL or either password — only the exception itself.
                    // Same shape as the create/restore paths in LaunchPage.xaml.cs.
                    Logging.error("Exception occured while changing the wallet password: {0}", ex);
                    encResult = "2";
                }
                // No native alert on any outcome: the inline screen renders its own success
                // morph and its own error, so an alert would be a second, redundant
                // confirmation. EncryptionPassword keeps its alerts, because that page has
                // no inline error surface.
                Utils.sendUiCommand(this, "setEncPassResult", encResult);
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
            /* ★ Item 6 (#397/#400): the permanent door into the Spixi community. The
             * chat-list empty-state CTA disappears the moment the user adds any ordinary
             * contact, so How to use carries the row that never closes. Same SHARED STATIC
             * HomePage's own ixian:joinBot verb calls — no duplicated addFriend, no second
             * verb name (this page simply had no handler for the one that already exists).
             * Opt-in: nothing happens until the row is tapped. The chats list refreshes on
             * its own — joinCommunity sets UIHelpers.shouldRefreshContacts. */
            else if (current_url.Equals("ixian:joinBot", StringComparison.Ordinal))
            {
                HomePage.joinCommunity();
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
                // N65 (#385) triage instrumentation: EVERYTHING below is gated on this
                // one call, so a false return was a total no-op with nothing in the log
                // to say so. loadLanguage now logs its own failure reason; this line
                // states the request and the code that actually ended up active, which
                // is what tells apart "the load failed" from "the load worked and the
                // surfaces disagree" (the four-way split: hub dictionary · row value ·
                // checkmark · home shell).
                bool languageLoaded = SpixiLocalization.loadLanguage(lang);
                // review NIT-3: `lang` arrives on a navigation URL, and ixian.log is
                // rendered by DevPage and offered through the share sheet — so it is
                // clamped and stripped before it is written. No secret is involved; this
                // stops a control character from forging log lines.
                string langForLog = safeForLog(lang);
                Logging.info("Language pick: requested '" + langForLog + "', loaded=" + languageLoaded
                    + ", active now '" + SpixiLocalization.getCurrentLanguage() + "'");
                /* ★★ N65 (#498) — THE CORRECTIVE ECHO, and it is the same defect shape as
                 * iOS-56 two verbs above: a control flipped OPTIMISTICALLY and never
                 * answered.
                 *
                 * `docs/n65-triage-language-pick.md` §3 lists FOUR surfaces that disagreed in
                 * one of Damir's Windows frames — hub copy in French, the row VALUE reading
                 * Deutsch, the CHECKMARK on Português, the app in German. Two of those four
                 * are explained by this one missing push:
                 *   ② the "Language" row value is pushed at `onLoad` ONLY (:166) — a pick
                 *      never re-pushed it, so it kept whatever was true at page load;
                 *   ③ the picker checkmark is moved by the SHELL on the tap, before C#
                 *      answers — and C# can refuse the same pick a moment later.
                 * `setLanguage` writes `state.language` and re-renders, which is exactly the
                 * one value both surfaces read (settings.html:1636).
                 *
                 * ⚠ UNCONDITIONAL, outside the `if`. On success it makes the row agree with
                 * the active code; on REFUSAL it drags the optimistic checkmark back to the
                 * language that is really loaded, which is the case that produced the
                 * screenshot. Pushing only on success is what left the two disagreeing.
                 *
                 * ⚠ `getCurrentLanguage()`, never the requested `lang` — the whole point is
                 * to echo what C# actually holds. Echoing the request would make a refused
                 * pick look accepted, which is the bug wearing a different hat.
                 *
                 * ⚠ Safe beside the `setLocale` push below: sendUiCommand goes out through
                 * `SpixiContentPage.sendMessage` → evaluateJavascript, which queues. The
                 * last-wins coalescing the W2 note warns about is the SHELL→C# direction
                 * (`location.href`), and the onLoad burst already sends five of these in one
                 * task.
                 *
                 * This does NOT close N65: the §2 log line above (shipped in #385) has still
                 * never been read on a Windows device, and surfaces ① and ④ have their own
                 * sources. It removes the two the triage could name from source. */
                Utils.sendUiCommand(this, "setLanguage", SpixiLocalization.getCurrentLanguage());
                if (languageLoaded)
                {
                    selectedLanguage = lang;
                    Preferences.Default.Set("language", selectedLanguage);
                    // #334 iOS-58 (Damir dial: LIVE re-localize): the pick surface no
                    // longer self-reloads — the shell carries ALL bundled dictionaries
                    // (SpixiStrings, #257) and swaps + re-renders in place on this push:
                    // zero flash where the user is looking, the picker stays put, dirty
                    // nick/avatar state survives (the #274 stash machinery remains as
                    // the belt for any residual reload path). The reloads below cover
                    // surfaces whose text is BAKED at generatePage (*SL{} carriers) —
                    // on mobile they sit UNDER this page (invisible); the one visible
                    // desktop-pane flash is a logged v1 residual (DECISIONS #334).
                    Utils.sendUiCommand(this, "setLocale", lang);
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
                    // N65 (#385): keep the previous language, and SAY SO. A silent
                    // return here is the reported "the pick does nothing".
                    Logging.error("Language pick '" + langForLog + "' was refused by loadLanguage; the app language is unchanged.");
                    selectedLanguage = null;
                    // ★ N65 (#385, review MINOR-1): tell the SCREEN, not only the log. The
                    // shell moves the check mark optimistically BEFORE it sends the verb
                    // (settings.html), so a refused pick otherwise leaves the check mark on
                    // a language the app never loaded — which is exactly the reported "the
                    // pick does nothing". setLocale carries the language that IS active, so
                    // the picker snaps back to the truth.
                    Utils.sendUiCommand(this, "setLocale", SpixiLocalization.getCurrentLanguage());
                }
            }
            /* ★ NOTIF-2 (Damir's 2026-08-21 block) — the global notification switches.
             *
             * Each one is a straight write to a preference plus an ECHO of the value that
             * was actually stored. The shell's switchRow is optimistic-with-rollback: it
             * moves at once and waits for ctrl.done()/ctrl.fail(), so a verb that answered
             * nothing would leave the switch spinning. The echo is also what makes a
             * failed write visible instead of silently reverting on the next open.
             *
             * No signing, no money, no keys, no user data — three bools in Preferences. */
            else if (current_url.StartsWith("ixian:notifEnabled:", StringComparison.Ordinal))
            {
                string status = current_url.Substring("ixian:notifEnabled:".Length);
                SNotificationPrefs.notificationsEnabled = status.Equals("on", StringComparison.Ordinal);
                Utils.sendUiCommand(this, "setNotifEnabled", SNotificationPrefs.notificationsEnabled.ToString());
            }
            else if (current_url.StartsWith("ixian:notifSenderName:", StringComparison.Ordinal))
            {
                string status = current_url.Substring("ixian:notifSenderName:".Length);
                SNotificationPrefs.showSenderName = status.Equals("on", StringComparison.Ordinal);
                Utils.sendUiCommand(this, "setNotifSenderName", SNotificationPrefs.showSenderName.ToString());
            }
            else if (current_url.StartsWith("ixian:notifPushProvider:", StringComparison.Ordinal))
            {
                // ★★ P2 (#708): store, APPLY (OptOut/OptIn on the live SDK), then echo the stored
                // value — the shell's switch settles on what was stored, never on what was asked.
                string status = current_url.Substring("ixian:notifPushProvider:".Length);
                SNotificationPrefs.pushProviderEnabled = status.Equals("on", StringComparison.Ordinal);
                SPushService.applyPushProviderPreference();
                Utils.sendUiCommand(this, "setNotifPushProvider", SNotificationPrefs.pushProviderEnabled.ToString());
            }
            else if (current_url.StartsWith("ixian:notifSounds:", StringComparison.Ordinal))
            {
                string status = current_url.Substring("ixian:notifSounds:".Length);
                SNotificationPrefs.inAppSounds = status.Equals("on", StringComparison.Ordinal);
                Utils.sendUiCommand(this, "setNotifSounds", SNotificationPrefs.inAppSounds.ToString());
            }
            else if (current_url.StartsWith("ixian:lock:", StringComparison.Ordinal))
            {
                string status = current_url.Substring("ixian:lock:".Length);
                if (status.Equals("on", StringComparison.Ordinal))
                {
                    // Turn on lock
                    lockEnabled = true;
                    // ★ W2 (#348) review r2 MAJOR: CONFIRM it. The shell persists app-lock
                    // from this push (it is the only value C# actually holds), and the OFF
                    // direction already answers with one from HandleAuthSucceeded. Without
                    // a matching push the ON direction had no save trigger at all — and no
                    // Save control either, because auto-save removes it — so enabling the
                    // lock silently never reached Preferences.
                    Utils.sendUiCommand(this, "setLockEnabled", lockEnabled.ToString());
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
            else if (current_url.StartsWith("ixian:paymentAuth:", StringComparison.Ordinal))
            {
                // ★ PA1 (#525): "Confirm payments". INSTANT-PERSIST (like theme/language)
                // — never the dirty/save path (#288 clobber class). The echo RE-READS the
                // stored value, so a failed write cannot lie (loop fix).
                string status = current_url.Substring("ixian:paymentAuth:".Length);
                if (status.Equals("on", StringComparison.Ordinal))
                {
                    // ON = strengthening — optimistic
                    Preferences.Default.Set(SPayments.PAYMENT_AUTH_PREF, true);
                    Utils.sendUiCommand(this, "setPaymentAuth", SPayments.paymentAuthEnabled().ToString());
                }
                else
                {
                    // ★ Loop MAJOR fix: OFF = WEAKENING a security setting — it costs an
                    // auth, exactly like ixian:lock:off. The echo lands on BOTH outcomes,
                    // so a canceled auth snaps the switch back.
                    var authPage = new LockPage(true);
                    authPage.authSucceeded += HandlePaymentAuthOffAuth;
                    pushModalLoaded(authPage);
                }
            }
            else if (current_url.StartsWith("ixian:appearance:", StringComparison.Ordinal))
            {
                string appearanceString = current_url.Substring("ixian:appearance:".Length);
                // The value comes from the WebView. Parse it, never Convert — a bad value
                // must not throw out of the handler.
                if (!int.TryParse(appearanceString, out var appearanceInt))
                {
                    Logging.warn("SettingsPage: appearance verb carried a non-integer value — ignored");
                    return;
                }
                selectedAppearance = (ThemeAppearance)appearanceInt;

                if (ThemeManager.changeAppearance(selectedAppearance))
                {
                    // ★ AND-7c (#408): the visible page decides, not the raw theme —
                    // see the twin comment on the OS-flip path in App.xaml.cs.
                    SpixiContentPage.repaintSystemBarsFor(null);
                    // Round 2 (Damir F5 "changing theme still flickers"): NO settings.html
                    // reload — the redesigned shell already applied the new theme LIVE
                    // (applyTheme on the pick) and persisted it; the full reload here was
                    // the visible flicker, and the regenerated boot theme comes along on
                    // the next natural open.
                    //
                    /* ★ N71 (#421): the OTHER live WebViews are re-themed by the SHARED
                     * sweep now. This branch used to hand-roll its own enumeration —
                     * Home, Home's detail pane, the EmptyDetail resting pane, then the
                     * open overlays — which is how the two theme paths drifted apart in
                     * the first place: one pushed a hand-written list, the other
                     * reloaded a different hand-written list, and neither covered the
                     * NavigationStack or the modal stack. They are one code path now.
                     *
                     * Three things this fixes on the pick path specifically:
                     *  · getDetailContent() is DEAD (HomePage.detailContent is only ever
                     *    assigned null — HomePage.xaml.cs:3123, the same dead branch #288
                     *    logged in getChatPages). It read like a guard and covered
                     *    nothing, which is exactly the trap #399's F-1 fix called out.
                     *  · pages BEHIND this one in the NavigationStack were never reached.
                     *  · THIS page is INCLUDED. ★ Damir F5 2026-08-19: the #46 round had
                     *    me EXCLUDE it, and that re-opened N71(a) — pick System with the
                     *    OS dark and the whole app went dark while the Account stayed
                     *    light, because the one surface that needed the resolved answer
                     *    was the one surface not told it. The shell's own guard keys on
                     *    the SELECTED appearance, not on who sent the push, and handles
                     *    both cases; see the header on pushThemeToAllPages. */
                    UIHelpers.pushThemeToAllPages();
                }
            }
            else if (current_url.Trim().StartsWith("file:", StringComparison.OrdinalIgnoreCase))
            {
                // allow normal navigation only for local files
                e.Cancel = false;
                return;
            }
            e.Cancel = true;
        }



        public void onSaveSettings(string nick)
        {
            saveSettingsCore(nick);

            // Pop the current page from the stack
            closeSublevelOverlays();   // W7
            popPageAsync();
        }

        /* W7 close-audit (the HomePage close-audit family: closeContactDetailsOverlays /
         * closeFormPaneOverlays / closeTxDetailOverlays — this one belongs HERE because
         * the page it sweeps is a SUBLEVEL of the Account, opened by this page).
         * EncryptionPassword is presented as an overlay COVERING this page (see the
         * ixian:encpass branch), so it must never outlive it: without this, a rail tab
         * switch (which exits the Account through the shell) would leave the password
         * pane parked over the next tab's detail region with its WebView alive. Nothing
         * is lost: the password fields are never persisted (SECURITY.md §5 — they live
         * only in the field) and closeOverlay Disposes the WebView with the page.
         *
         * #340 audit (B-MAJOR-1): the sweep must also cover the STAGING slot. pushPageLoaded
         * is load-then-present, so for the whole boot window (up to the 4s timeout) the
         * EncryptionPassword is NOT in overlayStack — it lives in activePreload with its
         * stage already parented to HomePage's grid, and nothing cancels it when its opener
         * dies. That window is exactly when the user is most likely to leave: the screen
         * deliberately shows the unchanged Account hub while the pane loads, so "I clicked
         * and nothing happened" → tap a rail tab → Account closes → the password pane then
         * presents itself over the NEXT tab with a live WebView and no escape but its own
         * back arrow. Same "nothing moved so I clicked elsewhere" behaviour that produced
         * the original W7 report. popPageAsync() on a staging page cancels the preload
         * (abandoned + cancelPreload), which is the tested path for exactly this.
         *
         * #340 round 2 (both reviewers, independently): the test was `is EncryptionPassword`,
         * but the Account stages THREE sublevels through this same pushPageLoaded path —
         * ixian:encpass, ixian:backup and ixian:downloads. The other two are cap-gated to
         * NON-pane mode (settings.html returns early on paneMode && cap), so on desktop they
         * never fire — but on mobile they are ordinary overlays with the identical
         * load-then-present window, so "tap Downloads, nothing appears to happen, tap back"
         * strands the Downloads page over the home shell exactly like the encpass case.
         * The list stays EXPLICIT and type-scoped rather than sweeping everything staged:
         * pushModalLoaded shares activePreload, so a `!= null` sweep here would cancel the
         * resume LOCK. Add a type when the Account learns to open another sublevel. */
        internal void closeSublevelOverlays()
        {
            foreach (SpixiContentPage p in getOverlayPages())
            {
                if (p is EncryptionPassword || p is BackupPage || p is DownloadsPage)
                {
                    removePage(p);   // #225: removing an OPEN overlay = closeOverlay
                }
            }
            // …and the one that hasn't been presented yet.
            SpixiContentPage? staging = getStagingPage();
            if (staging is EncryptionPassword || staging is BackupPage || staging is DownloadsPage)
            {
                staging.popPageAsync();   // staging slot → cancels the preload
            }
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

        // review NIT-3 — a value that came from a WebView URL, made safe for ixian.log
        // (DevPage renders that file and offers it through the share sheet).
        private static string safeForLog(string value)
        {
            if (value == null)
            {
                return "";
            }
            if (value.Length > 32)
            {
                value = value.Substring(0, 32);
            }
            var sb = new System.Text.StringBuilder(value.Length);
            foreach (char c in value)
            {
                sb.Append(char.IsLetterOrDigit(c) || c == '-' || c == '_' ? c : '?');
            }
            return sb.ToString();
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

        /* ★ iOS-56 (Damir on device 2026-08-21) — and the finding is NOT the one the row
         * predicted. He reported that the "confirm it's you" screen shown when turning the
         * LOCK OFF still carries a Cancel button, though Cancel was removed from the lock's
         * own password prompt (#234), and asked for the second presentation site.
         *
         * ★ VERIFIED AT SOURCE, and Cancel is CORRECT here. #234 removed the exit from the
         * APP LOCK ('locked' mode) because there `authSucceeded(false)` reached App.onUnlock,
         * which ignores the bool — one tap opened the app without the password. This site is
         * different in exactly the way that matters: the handler below reads `e.Value`, so a
         * cancel changes nothing and the lock stays ON. Removing Cancel would instead trap the
         * user on a confirm screen with no way back to Settings, which is a worse answer to a
         * strictly less dangerous question — backing out of DISABLING a lock is safe.
         *
         * ★ THE REAL DEFECT, which the report found by its symptom: the shell flips the
         * switch OPTIMISTICALLY when it sends `ixian:lock:off`, and this handler only pushed
         * `setLockEnabled` on SUCCESS. So a cancelled auth left the switch reading OFF while
         * the lock was still ON — a control that lies about a security setting, until the
         * next load quietly corrected it. settings.html:927-930 documents the missing signal
         * and files it as "BE gap S6"; it is not BE, it is this method.
         *
         * The push is now unconditional, and it carries the value C# actually holds. The
         * shell's setLockEnabled is idempotent on the saved baseline, so a cancel snaps the
         * switch back and writes nothing. */
        private void HandleAuthSucceeded(object sender, EventArgs<bool> e)
        {
            bool succeeded = e.Value;

            if (succeeded)
            {
                lockEnabled = false;
            }

            Utils.sendUiCommand(this, "setLockEnabled", lockEnabled.ToString());
        }

        // ★ PA1 (#525, loop fix): turning "Confirm payments" OFF resolves HERE, after
        // the LockPage auth. Both outcomes push the RE-READ value — a canceled auth
        // snaps the optimistic switch back (the iOS-56 lock grammar).
        private void HandlePaymentAuthOffAuth(object sender, EventArgs<bool> e)
        {
            if (e.Value)
            {
                Preferences.Default.Set(SPayments.PAYMENT_AUTH_PREF, false);
            }
            Utils.sendUiCommand(this, "setPaymentAuth", SPayments.paymentAuthEnabled().ToString());
        }

        /* ★ W14 (#348) — THE FREEZE, and the routing.
         *
         * Damir's Windows F5: "delete account and delete wallet should ALWAYS return to
         * the welcome screen. The app froze."
         *
         * WHY IT FROZE. Both verbs arrive as a WebView navigation. The chain
         *   LockPage.onNavigating → doUnlock → performUnlock → authSucceeded(...)
         * is entirely SYNCHRONOUS, and `e.Cancel = true` is only reached at the END of
         * onNavigating (LockPage:138). So every one of these ran INSIDE the WebView2
         * navigation callback, on the UI thread, with the browser pump blocked:
         * seven storage/history deletes, a full node shutdown that blocks on two
         * GetAwaiter().GetResult() calls (Node.cs:536/:552) and on a Thread.Join() of a
         * worker that sleeps one second (TransferManager:308), then a page pop and a push.
         *
         * WHY IT COULD FREEZE FOR GOOD. onDeleteAccount ended with onLoad(), which reads
         * the very state the lines above it had just deleted — the nickname (onLoad:126),
         * the own-avatar path (:153) and, after a wallet delete, the primary address
         * (:143). One exception there propagated out through authSucceeded, so LockPage
         * never reached its own close (LockPage:167-175) and the lock stayed up with
         * hardware back swallowed (LockPage:182, HomePage:2516). No way out but a kill.
         *
         * THE FIX, in three parts:
         *   1. Both handlers now POST their work and return, so onNavigating completes
         *      immediately and the lock can close before the work starts.
         *   2. The work is wrapped, and the route to welcome runs in a `finally`. An
         *      exception can no longer strand the user behind a lock.
         *   3. onLoad() is gone from the delete path. Nothing re-reads deleted state.
         *
         * WHAT IS DELIBERATELY NOT CHANGED: the teardown still runs on the UI thread, so
         * a long wipe still blocks for its duration. That is a DURATION, not a hang, and
         * per #294 it does not get optimised before it is measured. The #344 PerfTrace
         * scaffold was deleted in #350 (the release rule) with this duration still
         * unread — if the wipe ever needs a number, re-add two Logging.info stamps
         * around IxianHandler.shutdown() below. Moving it to a background thread is not
         * the free win it looks like: it calls HomePage.stop() (Node.cs:595), which
         * touches the visual tree. */
        private bool deleteInFlight = false;

        /* Route to the welcome screen. Damir: BOTH destructive actions end here.
         * Before this, `ixian:deletea` navigated nowhere at all (punch list E1) — the
         * user was left sitting on the Account pane with an emptied account. */
        private void goToWelcome()
        {
            try
            {
                /* ★★ #585: capture the ROOT before popping. `hostNav` is the root nav and
                 * the root is HOMEPAGE — the account's own home screen. Popping to it and
                 * pushing LaunchPage on top leaves it ALIVE underneath, which is the bug
                 * (and the TODO that used to sit at the bottom of this method). */
                /* ⚠ round-2 MINOR-3: capture the WHOLE stack, not index 0. When this page is
                 * presented as an overlay, popToRootAsync takes the overlay branch and never
                 * touches the native stack — so a legacy native page (wallet, scan, a mini
                 * app) can still sit above HomePage, and removing only index 0 would leave
                 * that page of the wiped account directly beneath LaunchPage: the same
                 * defect one level up. */
                var stalePages = new List<Page>(hostNav.NavigationStack);
                popToRootAsync();
                // ★ review r2 MAJOR-2: AFTER the pop, not before. The non-rail Account push
                // carries parkOnClose (#315), so popToRootAsync PARKS this page instead of
                // disposing it — and calling dispose first was a guaranteed no-op, because
                // at that moment the page is still OPEN and nothing is parked yet.
                // Left parked, the wiped account's document stays live and warm: old
                // nickname, old avatar, old wallet address, re-presentable on the next
                // Account tap (representParkedOverlay deliberately does not re-run onLoad).
                // It also strands `deleteInFlight = true` on that instance, which then
                // silently swallowed the NEXT delete the user authenticated for.
                SpixiContentPage.disposeParkedOverlay();
                var launch = new LaunchPage();
                hostNav.PushAsync(launch, Config.defaultXamarinAnimations);   // #225: root nav
                /* ★★ #585 — THE WIPED ACCOUNT'S HOME PAGE IS REMOVED, not left underneath.
                 * Damir: delete account → welcome → Create → hardware back twice → the app
                 * OPENS, connecting forever, on an account that no longer exists. Mechanism:
                 * LaunchPage.OnBackButtonPressed consumes back only for create/restore; at
                 * `welcome` it falls through to base, which POPS LaunchPage and reveals this
                 * page. His log times it — `LaunchPage back: view=welcome` then HomePage's
                 * own `[RESTOREDIAG] loadChats` 10 ms later.
                 * ⚠ RemovePage AFTER the push, never before: removing the only other page
                 * while it is still the displayed root is rejected by MAUI, and the removal
                 * would be silently swallowed (the #391 N75 lesson, same navigation stack).
                 * ⚠ Wrapped on its own: a failure here must not lose the welcome screen the
                 * user is already looking at. */
                int dropped = 0;
                foreach (Page stale in stalePages)
                {
                    /* ⚠ round-2 MINOR-2: REMOVE AND DISPOSE. Every other removal site in this
                     * codebase disposes a SpixiContentPage, and Dispose is what detaches the
                     * WebView (Source = null, DisconnectHandler). Removed but undisposed, the
                     * wiped account's home document stays live and warm — old nickname, old
                     * avatar, old rows — which is the exact hazard the parked-overlay note a
                     * few lines above invokes.
                     * ⚠ Each page under its own try: one failure must not strand the rest. */
                    try
                    {
                        if (stale == null || stale == launch || !hostNav.NavigationStack.Contains(stale))
                        {
                            continue;
                        }
                        hostNav.RemovePage(stale);
                        dropped++;
                        if (stale is SpixiContentPage staleContent)
                        {
                            try { staleContent.Dispose(); } catch (Exception dex) { Logging.warn("W14: stale page dispose threw (#585): " + dex.Message); }
                        }
                    }
                    catch (Exception rex)
                    {
                        Logging.error("W14: could not remove a wiped-account page (#585): " + rex);
                    }
                }
                Logging.info("W14: removed {0} wiped-account page(s) from the stack (#585).", dropped);
            }
            catch (Exception ex)
            {
                Logging.error("W14: could not route to the welcome screen: " + ex);
            }
        }

        /* ★ Batch C (#545) C2: onDeleteWallet / deleteWalletWork are RETIRED with the
         * delete-wallet option (#532 — redundant next to the full wipe). Their body lives
         * on, corrected, in wipeEverything(): shutdown FIRST, then delete; balances cleared. */

        public void onDeleteAccount(object sender, EventArgs<bool> e)
        {
            bool succeeded = e.Value;
            if (!succeeded)
            {
                return;
            }
            if (deleteInFlight)
            {
                return;
            }
            deleteInFlight = true;

            // Leave the WebView navigation callback FIRST, and let the lock hide before the
            // wipe starts (two hops — see the note in onDeleteWallet).
            MainThread.BeginInvokeOnMainThread(() =>
            {
                MainThread.BeginInvokeOnMainThread(() =>
                {
                try
                {
                    wipeEverything();
                }
                catch (Exception ex)
                {
                    Logging.error("W14: account wipe threw: " + ex);
                }
                finally
                {
                    // ★ review MINOR-5: one-shot, see onDeleteWallet.
                    // W14: `ixian:deletea` used to navigate NOWHERE (punch list E1) and
                    // instead called onLoad(), which re-read the account it had just
                    // deleted. Both are gone: the user lands on welcome, and that IS
                    // the confirmation — the same reasoning the save path already uses
                    // ("the page pop IS the confirmation").
                    // The old "Account deleted" alert is dropped with it. It was also
                    // the WRONG alert on the wallet route, which reached this method and
                    // therefore told the user their ACCOUNT was deleted after they asked
                    // to delete the WALLET.
                    goToWelcome();
                }
                });
            });
        }

        /* ★ Batch C (#545) C1 — DELETE ACCOUNT = THE FULL WIPE → welcome. "All data",
         * ENUMERATED (each line is one item on the F5 checklist):
         *   1. the network + the node: IxianHandler.shutdown() (closes RocksDB, stops
         *      localStorage, the stream processor, keepalive) + NetworkUtils.isolate()
         *      ★ FIRST — the old wallet route deleted the storage directories UNDER an
         *      OPEN RocksDB and shut down afterwards. That order is the F-3/N68 suspect
         *      by reading: the next in-process Node.start() (LaunchPage → HomePage ctor)
         *      met a half-torn storage and its fatal-alert branch never reached
         *      connectToNetwork → "fatal exception, no network, empty lists; a restart
         *      recovers". Shut down first, delete second.
         *   2. block storage · activity storage · TIV cache · pending transactions
         *   3. avatars · account file · downloads · pending messages · chat history ·
         *      account folders · the friend list (wipeAccountData — the legacy body)
         *   4. the WALLET file (deleteWallet) + the in-memory wallet list
         *      + ★ IxianHandler.balances — NEVER cleared before: restoring the SAME
         *      wallet then hit `balances.Add(addr)` on a key that was still there
         *      (Node.loadWallet:279 — Dictionary.Add throws on a duplicate) = a fatal
         *      exception on the restore path. F-3's other half, by reading.
         *   5. every native Preference (Preferences.Default.Clear(): lockenabled ·
         *      walletpass · backupReminderTimestamp · walletCreatedHere · paymentauth ·
         *      the notification prefs · appearance · language · the dev/HUD flags — a
         *      fresh-install state, which is what "delete account" means)
         *   6. the WebView's `spixi.*` localStorage keys (pins · mutes · drafts · the
         *      declined/canceled invite sets · pattern/text prefs · mention seen-state):
         *      the `wipeLocalState` push to THIS shell — WebView storage is one store
         *      per app on every platform, so one page can clear it for all
         * Then goToWelcome(). No alert: landing on welcome IS the confirmation (#288). */
        private void wipeEverything()
        {
            // 0. the WebView's own spixi.* keys — FIRST (loop r1 MINOR-1): the push is an
            // async EvaluateJavaScriptAsync into THIS page's WebView; queued here it runs
            // while the heavy filesystem work below is still going, long before goToWelcome
            // parks + disposes the page. (Step 6 in the enumeration; order is for safety.)
            try { Utils.sendUiCommand(this, "wipeLocalState"); } catch (Exception ex) { Logging.error("wipe: local state push threw: " + ex); }

            // 1. stop everything that holds files open
            try { NetworkUtils.isolate(); } catch (Exception ex) { Logging.error("wipe: isolate threw: " + ex); }
            try { IxianHandler.shutdown(); } catch (Exception ex) { Logging.error("wipe: shutdown threw: " + ex); }

            // 2. chain-side caches. Loop r1 MINOR-3: Node.stop() early-returns when the
            // node is not running, so the RocksDB close in step 1 is CONDITIONAL — stop the
            // two storages EXPLICITLY (idempotent) before their directories are deleted.
            try { PendingTransactions.clear(); } catch (Exception ex) { Logging.error("wipe: pending tx threw: " + ex); }
            try { Node.storage.stopStorage(); } catch (Exception ex) { Logging.error("wipe: block storage stop threw: " + ex); }
            try { Node.activityStorage.stopStorage(); } catch (Exception ex) { Logging.error("wipe: activity storage stop threw: " + ex); }
            try { Node.storage.deleteData(); } catch (Exception ex) { Logging.error("wipe: block storage threw: " + ex); }
            try { Node.activityStorage.deleteData(); } catch (Exception ex) { Logging.error("wipe: activity storage threw: " + ex); }
            try { Node.tiv.clearCache(); } catch (Exception ex) { Logging.error("wipe: tiv threw: " + ex); }

            // 3. the account. Loop r1 MINOR-2: EACH call under its own try — a bare
            // Directory.Delete throwing on one open file must not skip the friend list.
            try { IxianHandler.localStorage.deleteAllAvatars(); } catch (Exception ex) { Logging.error("wipe: avatars threw: " + ex); }
            try { IxianHandler.localStorage.deleteAccountFile(); } catch (Exception ex) { Logging.error("wipe: account file threw: " + ex); }
            try { IxianHandler.localStorage.deleteAllDownloads(); } catch (Exception ex) { Logging.error("wipe: downloads threw: " + ex); }
            /* ★ #585 rider (Damir): "wiping the account leaves the mini app installed, and
             * a create or restore inherits it." Step 1 stops the manager (Node.stop calls
             * MiniAppManager.stop) but nothing ever DELETED the installed apps, so they
             * were not part of "all data". They are now, and the removal sits here with the
             * rest of the account data — after the stop, before the wallet. */
            try { Node.MiniAppManager.removeAllApps(); } catch (Exception ex) { Logging.error("wipe: mini apps threw: " + ex); }
            try { CoreStreamProcessor.deletePendingMessages(); } catch (Exception ex) { Logging.error("wipe: pending messages threw: " + ex); }
            try { FriendList.deleteEntireHistory(); } catch (Exception ex) { Logging.error("wipe: history threw: " + ex); }
            try { FriendList.deleteAccounts(); } catch (Exception ex) { Logging.error("wipe: accounts threw: " + ex); }
            try { FriendList.clear(); } catch (Exception ex) { Logging.error("wipe: friend list threw: " + ex); }

            // 4. the wallet — file, list, balances
            try
            {
                var ws = IxianHandler.getWalletStorage();
                if (ws != null && !ws.deleteWallet())
                {
                    Logging.error("wipe: deleteWallet returned false");
                }
            }
            catch (Exception ex) { Logging.error("wipe: deleteWallet threw: " + ex); }
            try { IxianHandler.wallets.Clear(); } catch (Exception ex) { Logging.error("wipe: wallet list threw: " + ex); }
            try { IxianHandler.balances.Clear(); } catch (Exception ex) { Logging.error("wipe: balances threw: " + ex); }
            /* ★ F5-3 r3 (#553, verdict R-3): the wipe hands the node BACK to the launch
             * flow — reset the started-once marker so App.EnsureNodeRunning stays out
             * of the post-wipe restore exactly as it stays out of a first boot. Without
             * this the counter (process-lifetime) left the A-3 window open on the ONE
             * path SettingsPage already names as the F-3 suspect. */
            Node.startCounter = 0;

            // 5. every native preference — a fresh-install state
            try { Preferences.Default.Clear(); } catch (Exception ex) { Logging.error("wipe: preferences threw: " + ex); }

            // (6. the WebView spixi.* wipe ran as step 0 — see above)
        }

        /* The account-data half of the wipe (the legacy delete-account body), kept as
         * its own step so the enumeration above reads one item per line. */
        private void wipeAccountData()
        {
            IxianHandler.localStorage.deleteAllAvatars();
            IxianHandler.localStorage.deleteAccountFile();
            IxianHandler.localStorage.deleteAllDownloads();
            CoreStreamProcessor.deletePendingMessages();
            FriendList.deleteEntireHistory();
            FriendList.deleteAccounts();
            FriendList.clear();
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