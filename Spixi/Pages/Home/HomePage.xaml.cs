using IXICore;
using IXICore.Activity;
using IXICore.Meta;
using IXICore.Network;
using IXICore.Streaming;
using IXICore.Streaming.Models;
using IXICore.Utils;
using Microsoft.Maui;
using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.ApplicationModel.DataTransfer;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using Microsoft.Maui.Devices;
using Microsoft.Maui.Storage;
using Spixi;
using SPIXI.Interfaces;   // #265: SpixiImageData (the in-shell group-avatar pick)
using SPIXI.Lang;
using SPIXI.Meta;
using SPIXI.MiniApps;
using SPIXI.VoIP;   // #265: the missed-call excerpt derivation uses VoIPManager.hasSession
using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

namespace SPIXI
{
    [XamlCompilation(XamlCompilationOptions.Compile)]
    public partial class HomePage : SpixiContentPage
    {
        private static HomePage? _singletonInstance;

        private SpixiContentPage? detailContent = null;
        private SpixiContentPage defaultDetailContent = new EmptyDetail();

        private object refreshLock = new object();

        public static HomePage Instance(bool force_new = false)
        {
            if (force_new)
            {
                if (_singletonInstance != null)
                {
                    _singletonInstance.stop();
                    _singletonInstance = null;
                }
            }
            if (_singletonInstance == null
                || !_singletonInstance.running)
            {
                _singletonInstance = new HomePage();
            }
            return _singletonInstance;
        }

        private ushort transactionFilter = 0; // 0-All 1-Sent 2-Received

        private string currentTab = "tab1";
        // #285 one-shot: set by reloadShell() so the reloaded shell's boot-time
        // ixian:tab:tab1 (shell Fix #8) does not run the #240 overlay-exit sweep
        // and tear down the settings pane the language pick lives in.
        private bool suppressNextTabOverlayExit = false;
        // #288 review (break-my-verdict): epochs reloadShell so a belt started by an
        // EARLIER reload cannot clear a suppression flag armed by a LATER one.
        private int reloadShellGen = 0;
        private bool hideBalance = false;

        private bool running = false;

        private bool fromSettings = false;
        private bool fromChat = false;

        // D1 (#240): native resizable left pane. The boundary sits between two
        // ISOLATED WebViews (#221 model), so the divider must be native — a thin
        // pan-grip at the right edge of column 0 resizes the chats/list pane
        // against the detail pane. Demo grammar (desktop-split-spec §1): 280–520,
        // double-click resets; width persisted across restarts.
        private const double leftPaneMinWidth = 280;
        private const double leftPaneMaxWidth = 624;   // #243: 520 + 20% (Damir)
        private const double leftPaneDefaultWidth = 400;
        // #245: the home shell's desktop nav rail is 72 CSS px (#237 r2 dial); CSS px
        // == DIPs in the WebView at default zoom, so the Account peer-pane insets by
        // this much to keep the rail visible. Single source C#-side; if the rail is
        // ever re-dialed in bottomnav.css, update BOTH (flagged in the spec).
        private const double railWidthDip = 72;
        private double leftPaneWidth = leftPaneDefaultWidth;
        private double panStartPaneWidth = leftPaneDefaultWidth;

        /* Unit 6 (#247): chat-info as an integrated desktop PANE — a ContactDetails
         * overlay (its OWN WebView, shell side of the #221 wall) pinned to mainGrid
         * col 2 BESIDE the open conversation. Coordination is C#-only: the
         * conversation emits ixian:details, this page hosts/closes the pane. */
        private const double infoPaneWidth = 360;      // Damir dial
        private const double infoPaneMinWidth = 280;   // below this the pane closes/degrades
        private const double detailMinWidth = 320;     // conversation keeps at least this
        private bool infoPaneCol2Pending = false;      // set at push, consumed at present
        private bool infoPaneCol2Open = false;         // col 2 currently expanded
        private bool paneDividerPanning = false;

        public bool devMode = false;

        private bool warningDisplayed = false;
        private int connectivityWarningDelayCounter = 0;

        // Interal cache object to store contact status items
        private struct contactStatusCacheItem
        {
            public Address address;
            public bool online;
            public int unread;
            public string excerpt;
            public long timestamp;
        }
        private static List<contactStatusCacheItem> contactStatusCache = new List<contactStatusCacheItem>();
        private HomePage()
        {
            Node.preStart();

            InitializeComponent();
            NavigationPage.SetHasBackButton(this, false);
            NavigationPage.SetHasNavigationBar(this, false);
            this.Title = "Spixi";
            webView.Opacity = 0;

            // #225: HomePage hosts the redesigned screens as flicker-free OVERLAYS
            // (own WebView each — SECURITY.md §1 intact) instead of pushed pages.
            setOverlayHost(this);

            devMode = Preferences.Default.Get("devMode", false);

            hideBalance = (bool)Preferences.Default.Get("hidebalance", false);
            SpixiLocalization.addCustomString("miniAppsStartNoteHidden", Preferences.Default.Get("miniAppsStartNoteHidden", false) ? "true" : "false");
            SpixiLocalization.addCustomString("devMode", devMode ? "true" : "false");
            SpixiLocalization.addCustomString("apps-not-sure-text", string.Format(SpixiLocalization.getLocalizedString("apps-not-sure-text"), Config.spixiAppsUrl));

            loadPage(webView, "index.html");

            rightContent.Content = defaultDetailContent.Content;

            // D1 (#240): divider gestures + persisted pane width. The grip is a
            // native BoxView pinned to column 0's trailing edge (HomePage.xaml) —
            // it never overlaps the column-1 overlays (chat/Account panes), and a
            // full-span overlay/lock stage is added AFTER it, so a takeover or an
            // in-place lock always covers the grip (#230 ordering intact).
            leftPaneWidth = clampLeftPaneWidth(Preferences.Default.Get("leftPaneWidth", leftPaneDefaultWidth));
            var dividerPan = new PanGestureRecognizer();
            dividerPan.PanUpdated += onPaneDividerPan;
            paneDivider.GestureRecognizers.Add(dividerPan);
            var dividerReset = new TapGestureRecognizer { NumberOfTapsRequired = 2 };
            dividerReset.Tapped += (s, ev) =>
            {
                leftPaneWidth = leftPaneDefaultWidth;
                applyLeftPaneWidth();
                Preferences.Default.Set("leftPaneWidth", leftPaneWidth);
            };
            paneDivider.GestureRecognizers.Add(dividerReset);

#if WINDOWS
            // #242 (Damir F5: "no cursor change, hard to catch"): give the grip the
            // ↔ resize cursor. MAUI has no cross-platform cursor API; on WinUI the
            // cursor lives on UIElement.ProtectedCursor (protected → reflection, the
            // established WinUI-3 workaround). Presentation-only; try/catch so a
            // WinAppSDK rename can never take the app down.
            paneDivider.HandlerChanged += (s, ev) =>
            {
                try
                {
                    if (paneDivider.Handler?.PlatformView is Microsoft.UI.Xaml.UIElement el)
                    {
                        var prop = typeof(Microsoft.UI.Xaml.UIElement).GetProperty(
                            "ProtectedCursor",
                            System.Reflection.BindingFlags.Instance
                            | System.Reflection.BindingFlags.NonPublic
                            | System.Reflection.BindingFlags.Public);
                        prop?.SetValue(el, Microsoft.UI.Input.InputSystemCursor.Create(
                            Microsoft.UI.Input.InputSystemCursorShape.SizeWestEast));
                    }
                }
                catch (Exception ex)
                {
                    Logging.warn("paneDivider cursor: " + ex.Message);
                }
            };
#endif

            SizeChanged += OnPageSizeChanged;

            if (!running)
            {
                running = true;

                Task.Run(async () =>
                {
                    try
                    {
                        if (!Node.start())
                        {
                            await displaySpixiAlert("Fatal exception", "Fatal exception has occurred, please send the log files to the developers.", "OK");
                            return;
                        }
                        Node.connectToNetwork();
                    }
                    catch (IOException e)
                    {
                        Logging.error("Fatal IO error has occurred: " + e);
                        string ioErrorMessage = "Fatal error has occurred. This may be due to insufficient disk space. Please check your device storage and send the log files to the developers.\n\nError: " + e.Message;
                        await displaySpixiAlert("Fatal Exception", ioErrorMessage, "OK");
                    }
                    catch (Exception e)
                    {
                        Logging.error("Fatal error has occurred: " + e);
                        await displaySpixiAlert("Fatal Exception", "Fatal error has occurred. Please send the log files to the developers.\n\nError: " + e.Message, "OK");
                    }
                });
            }
        }

        private void OnPageSizeChanged(object? sender, EventArgs? e)
        {
            if (Width < 700)
            {
                // Show only main pane
                mainGrid.ColumnDefinitions[0].Width = GridLength.Star;
                //mainGrid.ColumnDefinitions[1].Width = new GridLength(0);
                mainGrid.ColumnDefinitions[1].Width = new GridLength(0);
                mainGrid.ColumnDefinitions[2].Width = new GridLength(0);   // #247 info pane
                rightContent.IsVisible = false;
                paneDivider.IsVisible = false;   // D1: no divider in single-pane
                removeDetailContent(false);
                // #225-M2: column-pinned overlays (chat col 1, info col 2) would strand
                // invisible-but-open in a zero-width column — re-home them full-span
                // (the mobile takeover presentation). Property flips only, no re-attach;
                // infoPaneCol2Open stays set so re-widening restores the pane.
                SpixiContentPage.relayoutPinnedOverlays(false);
            }
            else
            {
                // Show both panes — D1 (#240): column 0 uses the persisted,
                // user-resizable width (was a fixed 400).
                applyLeftPaneWidth();
                //mainGrid.ColumnDefinitions[1].Width = new GridLength(2);
                mainGrid.ColumnDefinitions[1].Width = GridLength.Star;
                rightContent.IsVisible = true;
                paneDivider.IsVisible = true;
                // #247: restore/adjust the info-pane column while its overlay is open;
                // a wide-but-squeezed window closes the pane (honest degrade — the
                // surface is read-only, one tap re-opens it).
                updateInfoPaneWidth();
                // #225-M2: re-pin re-homed overlays back to their columns.
                SpixiContentPage.relayoutPinnedOverlays(true);
            }
        }

        // #247: size (or close) the info-pane column against the current window +
        // left-pane widths. The conversation keeps >= detailMinWidth; the pane gets
        // min(infoPaneWidth, what's left) and closes below infoPaneMinWidth.
        private void updateInfoPaneWidth()
        {
            if (!infoPaneCol2Open)
            {
                return;
            }
            double avail = Width - mainGrid.ColumnDefinitions[0].Width.Value - detailMinWidth;
            if (avail >= infoPaneMinWidth)
            {
                mainGrid.ColumnDefinitions[2].Width = new GridLength(Math.Min(infoPaneWidth, avail));
            }
            else
            {
                closeContactDetailsOverlays();   // collapses col 2 via onOverlayClosed
            }
        }

        /* ————— D1 (#240): native left-pane divider ————————————————————————————
         * Pure presentation: resizes mainGrid column 0 between the two isolated
         * WebViews. No bridge, no page content, no signing paths touched. */

        private double clampLeftPaneWidth(double w)
        {
            if (double.IsNaN(w) || double.IsInfinity(w))
            {
                return leftPaneDefaultWidth;
            }
            double max = leftPaneMaxWidth;
            // #243: the raised max (624) must never starve the detail pane on a
            // just-wide-enough window (at 700px it would leave 76px) — reserve a
            // usable detail width; the ceiling grows with the window.
            if (Width > 0)
            {
                max = Math.Max(leftPaneMinWidth, Math.Min(max, Width - 320));
            }
            return Math.Clamp(w, leftPaneMinWidth, max);
        }

        private void applyLeftPaneWidth()
        {
            // Clamp the APPLIED width only — the user's chosen width (field +
            // preference) survives a temporary window shrink and comes back.
            mainGrid.ColumnDefinitions[0].Width = new GridLength(clampLeftPaneWidth(leftPaneWidth));
        }

        private void onPaneDividerPan(object? sender, PanUpdatedEventArgs e)
        {
            switch (e.StatusType)
            {
                case GestureStatus.Started:
                    panStartPaneWidth = leftPaneWidth;
                    paneDividerPanning = true;
                    break;
                case GestureStatus.Running:
                    // Defensive: WinUI has been seen skipping Started — seed the
                    // anchor from the first Running tick instead of drifting.
                    if (!paneDividerPanning)
                    {
                        panStartPaneWidth = leftPaneWidth;
                        paneDividerPanning = true;
                    }
                    leftPaneWidth = clampLeftPaneWidth(panStartPaneWidth + e.TotalX);
                    applyLeftPaneWidth();
                    updateInfoPaneWidth();   // #247: keep the conversation >= detailMinWidth
                    break;
                case GestureStatus.Completed:
                case GestureStatus.Canceled:
                    paneDividerPanning = false;
                    Preferences.Default.Set("leftPaneWidth", leftPaneWidth);
                    break;
            }
        }

        public void stop()
        {
            running = false;
            _singletonInstance = null;
            removeDetailContent(false);
        }

        private void onNavigating(object sender, WebNavigatingEventArgs e)
        {
            string current_url = HttpUtility.UrlDecode(e.Url);
            e.Cancel = true;

            if (onNavigatingGlobal(current_url))
            {
                e.Cancel = true;
                return;
            }

            if (current_url.Equals("ixian:onload", StringComparison.Ordinal))
            {
                onLoaded();
            }
            else if (current_url.Equals("ixian:wallet", StringComparison.Ordinal))
            {
                // Deprecated
            }
            else if (current_url.Equals("ixian:quickscan", StringComparison.Ordinal))
            {
                quickScan();
                e.Cancel = true;
                return;
            }
            else if (current_url.Contains("ixian:qrresult:"))
            {
                string[] split = current_url.Split(new string[] { "ixian:qrresult:" }, StringSplitOptions.None);
                string result = split[1];
                processQRResult(result);
                e.Cancel = true;
                return;
            }
            else if (current_url.Contains("ixian:filter:"))
            {
                string[] split = current_url.Split(new string[] { "ixian:filter:" }, StringSplitOptions.None);
                string result = split[1];
                filterTransactions(result);
                e.Cancel = true;
                return;
            }
            else if (current_url.Contains("ixian:balance:"))
            {
                string[] split = current_url.Split(new string[] { "ixian:balance:" }, StringSplitOptions.None);
                if (split.Length > 1)
                {
                    hideBalance = split[1] == "hide";
                }
                Preferences.Default.Set("hidebalance", hideBalance);
                // #288 (Opus #46 review of #284–#287) — MAJOR: the flag was persisted and
                // pushed to NOBODY. On desktop the tx detail is a LIVE overlay pinned to
                // col 1 BESIDE the wallet list (#263, onTransaction), so toggling the eye
                // masked the list while the pane kept rendering amount / fiat / fee /
                // counterparty and the FULL base58 address + copy button, indefinitely.
                // #285 closed hide-THEN-open; this closes open-THEN-hide. Idempotent by
                // construction: the shell's setHideBalance early-returns on an unchanged
                // value, so a redundant push cannot clobber a deliberate per-view reveal.
                foreach (SpixiContentPage p in SpixiContentPage.getOverlayPages())
                {
                    if (p is WalletSentPage)
                    {
                        Utils.sendUiCommand(p, "setHideBalance", hideBalance.ToString());
                    }
                }
                e.Cancel = true;
                return;
            }
            else if (current_url.Equals("ixian:newchat", StringComparison.Ordinal))
            {
                newChat();
            }
            else if (current_url.Equals("ixian:groupreset", StringComparison.Ordinal))
            {
                // #265 (Opus MAJOR-3): the in-shell group SETUP opened — drop any
                // abandoned temp photo from a previous, cancelled attempt so it can
                // never be promoted onto this group (and shipped to its members).
                // Mirrors the legacy picker's delete-on-load (WalletRecipientPage:47).
                clearGroupAvatarTemp();
            }
            else if (current_url.Equals("ixian:groupavatar", StringComparison.Ordinal))
            {
                // #265 (Damir ⑤): the IN-SHELL group setup's avatar picker. Writes the
                // SAME temp file HandlePickSucceeded promotes onto the new group
                // (WalletRecipientPage.temporaryImagePath) — one convention, no new
                // filesystem surface (C# names the path; the WebView never does).
#pragma warning disable CS4014
                onGroupAvatarAsync();
#pragma warning restore CS4014
            }
            else if (current_url.StartsWith("ixian:creategroup:", StringComparison.Ordinal))
            {
                // #265 (Damir ⑤): create the group from the REDESIGNED in-shell flow
                // (contacts picker multi-select → setup sheet). Payload mirrors the
                // legacy WalletRecipientPage `ixian:select:` grammar 1:1 —
                //   ixian:creategroup:<'1'|'0' blind><name>:|<addr>|<addr>…
                // — and feeds the SAME HandlePickSucceeded core (GroupChat.CreateGroup
                // + avatar promotion + createGroup message). No money picker involved.
                string payload = current_url.Substring("ixian:creategroup:".Length);
                string[] parts = payload.Split(new string[] { ":|" }, StringSplitOptions.None);
                if (parts.Length > 1 && parts[0].Length > 1)
                {
                    bool blindMode = parts[0][0] == '1';
                    string groupName = parts[0].Substring(1);
                    List<ExtendedAddress> addresses = new();
                    foreach (string a in parts[1].Split('|'))
                    {
                        if (string.IsNullOrWhiteSpace(a))
                        {
                            continue;
                        }
                        try { addresses.Add(new ExtendedAddress(a)); }
                        catch (Exception ex) { Logging.error("creategroup: bad address: " + ex); }
                    }
                    if (addresses.Count > 1)
                    {
                        HandlePickSucceeded(this, addresses, groupName, blindMode, false);   // in-shell: nothing to pop
                    }
                    else
                    {
                        Logging.error("creategroup: fewer than 2 valid members.");
                    }
                }
            }
            else if (current_url.Equals("ixian:newcontact", StringComparison.Ordinal))
            {
                // Batch C (#256 M8): WIDE → the add-contact form pins to the detail
                // column (the #247 pinned-overlay machinery; presentation-only routing,
                // the page's own verbs/contract untouched). Narrow keeps the full
                // takeover. The shared "formpane" tag makes newcontact ↔ newapp
                // replace each other seamlessly (same-tag swap, like "chat").
                closeContactDetailsOverlays();   // loop B-MINOR-1: the form takes the detail region — no col-1 stacking
                pushPageLoaded(new ContactNewPage(), 4000, "formpane", rightContent.IsVisible ? 1 : -1);   // load-then-move (N3)
            }
            else if (current_url.Equals("ixian:newapp", StringComparison.Ordinal))
            {
                // Batch C (#256 M7): same routing as newcontact above.
                closeContactDetailsOverlays();   // loop B-MINOR-1 (symmetry)
                pushPageLoaded(new AppNewPage(), 4000, "formpane", rightContent.IsVisible ? 1 : -1);   // load-then-move (N3, round 2)
            }
            else if (current_url.Equals("ixian:sendixi", StringComparison.Ordinal))
            {
                onSendIxi(null);
            }
            else if (current_url.Equals("ixian:receiveixi", StringComparison.Ordinal))
            {
                onReceiveIxi(null);
            }
            else if (current_url.StartsWith("ixian:sendrequest:", StringComparison.Ordinal))
            {
                // Q2-⑥ (#268, W8 LANDED): the Receive takeover's "request from a
                // contact" strip. Lifted from WalletReceivePage:93-155 (parse +
                // validate) + onRequest:185-196 — the sanctioned "same page, new
                // host" pattern, minus its popPageAsync (this page must NOT pop).
                // ★ A REQUEST is a chat message (requestFunds), not a payment —
                // nothing is signed here (SECURITY.md).
                //
                // DELIBERATE DEVIATION from the verbatim lift (#268 audit, FIX 4):
                // legacy used Contains(). That was safe only on WalletReceivePage,
                // which carries no other data-carrying verbs. On HomePage this
                // branch sits AHEAD of ixian:chat:/details:/chatinfo:/txdetails:/
                // startApp:/appDetails:/uninstall:/acceptRequest: …, so a Contains()
                // match could hijack any payload that ever embedded the literal
                // substring into the money-adjacent handler. Every verb added since
                // #216 uses StartsWith(..., Ordinal); this one now does too. The
                // handler's payload grammar (Split on the prefix, then the legacy
                // '|'-separated addr:amount list) is UNCHANGED.
                onSendRequest(current_url);
            }
            else if (current_url.Equals("ixian:avatar", StringComparison.Ordinal))
            {
                //onChangeAvatarAsync(sender, e);
            }
            else if (current_url.Equals("ixian:settings", StringComparison.Ordinal))
            {
                onSettings(sender, e);
            }
            else if (current_url.Equals("ixian:lock", StringComparison.Ordinal))
            {
                //   prepBackground();
                Navigation.PushAsync(new SetLockPage(), Config.defaultXamarinAnimations);
            }
            else if (current_url.Equals("ixian:activity", StringComparison.Ordinal))
            {
                // TODO show wallet activity screen
            }
            else if (current_url.Equals("ixian:about", StringComparison.Ordinal))
            {
                Browser.Default.OpenAsync(new Uri(Config.aboutUrl));
            }
            else if (current_url.Equals("ixian:guide", StringComparison.Ordinal))
            {
                Browser.Default.OpenAsync(new Uri(Config.guideUrl));
            }
            else if (current_url.Equals("ixian:backup", StringComparison.Ordinal))
            {
                pushPageLoaded(new BackupPage());   // load-then-move (N3, round 2)
            }
            else if (current_url.Equals("ixian:encpass", StringComparison.Ordinal))
            {
                pushPageLoaded(new EncryptionPassword());   // load-then-move (N3, round 2)
            }
            else if (current_url.Contains("ixian:chat:"))
            {
                string[] split = current_url.Split(new string[] { "ixian:chat:" }, StringSplitOptions.None);
                string id = split[1];
                onChat(new Address(id), e);
            }
            else if (current_url.Contains("ixian:details:"))
            {
                string[] split = current_url.Split(new string[] { "ixian:details:" }, StringSplitOptions.None);
                string id = split[1];
                // TODO: handle exceptions

                Friend? friend = FriendList.getFriend(new Address(id));

                if (friend == null)
                {
                    e.Cancel = true;
                    return;
                }

                // #247/#248: contacts DIRECTORY entry → context 'contact' ("Contact
                // details" + Message). wide = pane, narrow = takeover.
                openContactDetails(friend, false, false);
            }
            else if (current_url.Contains("ixian:chatinfo:"))
            {
                // #248 (Damir F5 items 1/5): chats row-menu entry → context 'chat'
                // ("Chat info"/"Group info", no Message action) — same pane routing.
                string id = current_url.Split(new string[] { "ixian:chatinfo:" }, StringSplitOptions.None)[1];
                Friend? friend = FriendList.getFriend(new Address(id));
                if (friend == null)
                {
                    e.Cancel = true;
                    return;
                }
                openContactDetails(friend, false, true);
            }
            else if (current_url.Contains("ixian:txdetails:"))
            {
                string[] split = current_url.Split(new string[] { "ixian:txdetails:" }, StringSplitOptions.None);
                string id = split[1];
                byte[] b_txid = Transaction.txIdLegacyToV8(id);

                onTransaction(b_txid, e);
            }
            else if (current_url.Contains("ixian:tab:"))
            {
                currentTab = current_url.Split(new string[] { "ixian:tab:" }, StringSplitOptions.None)[1];
                if (suppressNextTabOverlayExit && currentTab == "tab1")
                {
                    // #285: this is the reloaded shell's own boot-time tab1 echo
                    // (Fix #8), not a user tab switch — skip the exit sweep ONCE.
                    // #288 review: keyed on tab1, because a REAL tab tap inside the reload
                    // window used to EAT the flag — and then the boot echo, arriving with
                    // the flag already clear, ran the sweep and tore down the very Account
                    // pane this exists to protect. reloadShell's belt also clears it
                    // unconditionally, so a shell that never boots cannot latch it into the
                    // next genuine switch (which would silently skip the Account pane's
                    // save-if-dirty exit and drop a held nickname / avatar / lock edit).
                    suppressNextTabOverlayExit = false;
                }
                else
                {
                    // Unit 2 (#240): switching home tab closes an open Account pane —
                    // routed THROUGH the shell so held edits are saved (never a silent
                    // teardown around a dirty nickname/avatar/lock).
                    requestSettingsOverlayExit();
                    // #247: the chat-info pane belongs to the chats context — leaving it
                    // closes the pane (direct close is safe: its edits commit per-action).
                    closeContactDetailsOverlays();
                    closeFormPaneOverlays();   // Batch C: add-contact/add-app pane too
                    closeTxDetailOverlays();   // #263: the tx detail belongs to the wallet tab
                }
                if (currentTab == "tab2")
                {
                    loadTransactions(true);
                }
                else if (currentTab == "tab3")
                {
                    loadApps(true);
                }
            }
            else if (current_url.Equals("ixian:downloads", StringComparison.Ordinal))
            {
                // #264 (S8): dead legacy branch (no shell emits ixian:downloads at
                // HomePage — the live entry is the Account hub → SettingsPage), but
                // aligned to the overlay presenter so DownloadsPage.onBack's
                // popPageAsync (no longer PopModalAsync) works from EVERY presenter.
                pushPageLoaded(new DownloadsPage());
            }
            else if (current_url.Equals("ixian:contributors", StringComparison.Ordinal))
            {
                Navigation.PushModalAsync(new ContributorsPage());
            }
            else if (current_url.Equals("ixian:share", StringComparison.Ordinal))
            {
                Share.RequestAsync(new ShareTextRequest
                {
                    Text = IxianHandler.getWalletStorage().getPrimaryAddress().ToString(),
                });
            }
            else if (current_url.Contains("ixian:rating:"))
            {
                string result = current_url.Split(new string[] { "ixian:rating:" }, StringSplitOptions.None)[1];
                string? action_url = null;

                if (result.Equals("yes", StringComparison.Ordinal))
                {
                    if (DeviceInfo.Platform == DevicePlatform.Android)
                    {
                        action_url = Config.ratingAndroidUrl;
                    }
                    else if (DeviceInfo.Platform == DevicePlatform.iOS)
                    {
                        action_url = Config.ratingiOSUrl;
                    }
                }
                else if (result.Equals("no", StringComparison.Ordinal))
                {
                    action_url = Config.supportEmailUrl;
                }

                if (action_url != null)
                {
                    Preferences.Default.Set("rating_action", "done");
                    Browser.Default.OpenAsync(new Uri(action_url));
                }

                e.Cancel = true;
                return;
            }
            else if (current_url.Equals("ixian:copy", StringComparison.Ordinal))
            {
            }
            else if (current_url.StartsWith("ixian:sendLog"))
            {
                // TODO perhaps move this whole functionality to Logging class and delete spixi.log.zip on start if exists

                if (File.Exists(Path.Combine(Config.spixiUserFolder, "spixi.log.zip")))
                {
                    File.Delete(Path.Combine(Config.spixiUserFolder, "spixi.log.zip"));
                }

                if (File.Exists(Path.Combine(Config.spixiUserFolder, "ixian.log.tmp")))
                {
                    File.Delete(Path.Combine(Config.spixiUserFolder, "ixian.log.tmp"));
                }

                File.Copy(Path.Combine(Config.spixiUserFolder, "ixian.log"), Path.Combine(Config.spixiUserFolder, "ixian.log.tmp"));

                using (ZipArchive archive = ZipFile.Open(Path.Combine(Config.spixiUserFolder, "spixi.log.zip"), ZipArchiveMode.Create))
                {
                    archive.CreateEntryFromFile(Path.Combine(Config.spixiUserFolder, "ixian.log.tmp"), "ixian.log");
                    if (File.Exists(Path.Combine(Config.spixiUserFolder, "ixian.0.log")))
                    {
                        archive.CreateEntryFromFile(Path.Combine(Config.spixiUserFolder, "ixian.0.log"), "ixian.0.log");
                    }
                }

                if (File.Exists(Path.Combine(Config.spixiUserFolder, "ixian.log.tmp")))
                {
                    File.Delete(Path.Combine(Config.spixiUserFolder, "ixian.log.tmp"));
                }

                SFileOperations.share(Path.Combine(Config.spixiUserFolder, "spixi.log.zip"), "Share Spixi Log File");
            }
            else if (current_url.StartsWith("ixian:onboardingComplete"))
            {
                completeOnboard();
            }
            else if (current_url.StartsWith("ixian:joinBot"))
            {
                joinBot();
            }
            else if (current_url.StartsWith("ixian:startApp:", StringComparison.Ordinal))
            {
                string appId = current_url.Substring("ixian:startApp:".Length);
                onStartApp(appId);
            }
            else if (current_url.StartsWith("ixian:startAppMulti", StringComparison.Ordinal))
            {
                string appId = current_url.Substring("ixian:startAppMulti:".Length);
                onStartAppMulti(appId);
            }
            else if (current_url.StartsWith("ixian:appDetails:"))   // Q1 review (#266/#267 loop): the colon was missing — a colon-less "ixian:appDetails" threw ArgumentOutOfRangeException on the Substring below
            {
                string appId = current_url.Substring("ixian:appDetails:".Length);
                onAppDetails(appId);
            }
            else if (current_url.StartsWith("ixian:uninstall:", StringComparison.Ordinal))
            {
                // A1: uninstall from the apps-tab ⋮ menu (list-scoped; AppDetailsPage
                // owns the same MiniAppManager.remove for its details-scoped uninstall).
                string appId = current_url.Substring("ixian:uninstall:".Length);
                onUninstallApp(appId);
            }
            else if (current_url.StartsWith("ixian:acceptRequest:", StringComparison.Ordinal))
            {
                // CH2: accept an incoming contact request from the chats-list request card.
                onAcceptRequest(current_url.Substring("ixian:acceptRequest:".Length));
            }
            else if (current_url.StartsWith("ixian:declineRequest:", StringComparison.Ordinal))
            {
                // CH2: decline an incoming contact request from the chats-list request card.
                onDeclineRequest(current_url.Substring("ixian:declineRequest:".Length));
            }
            else if (current_url.StartsWith("ixian:explorer"))
            {
                Browser.Default.OpenAsync(new Uri(Config.explorerUrl + "index.php?p=address&id=" + IxianHandler.primaryWalletAddress));
            }
            else if (current_url.StartsWith("ixian:miniAppsStartNoteHidden", StringComparison.Ordinal))
            {
                Preferences.Default.Set("miniAppsStartNoteHidden", true);
                SpixiLocalization.addCustomString("miniAppsStartNoteHidden", "true");
            }
            else if (current_url.StartsWith("ixian:enableDevMode", StringComparison.Ordinal))
            {
                Preferences.Default.Set("devMode", true);
                devMode = true;
                SpixiLocalization.addCustomString("devMode", "true");
            }
            else if (current_url.StartsWith("ixian:disableDevMode", StringComparison.Ordinal))
            {
                Preferences.Default.Set("devMode", false);
                devMode = false;
                SpixiLocalization.addCustomString("devMode", "false");
            }
            else if (current_url.StartsWith("ixian:dev", StringComparison.Ordinal))
            {
                Navigation.PushModalAsync(new DevPage());
            }
            else if (current_url.StartsWith("ixian:spixiAppsLink", StringComparison.Ordinal))
            {
                Browser.Default.OpenAsync(new Uri(Config.spixiAppsUrl));
            }
            else if (current_url.Trim().StartsWith("file:", StringComparison.OrdinalIgnoreCase))
            {
                // allow normal navigation only for local files
                e.Cancel = false;
                return;
            }
            e.Cancel = true;
        }

        public void onSendIxi(Address? wallet)
        {
            if (wallet == null)
            {
                Navigation.PushAsync(new WalletSendPage(), Config.defaultXamarinAnimations);
                return;
            }
            Navigation.PushAsync(new WalletSendPage(new ExtendedAddress(wallet, AddressPaymentFlag.OfflineTag, null)), Config.defaultXamarinAnimations);
        }

        public void onReceiveIxi(Friend? friend)
        {
            if (friend == null)
            {
                Navigation.PushAsync(new WalletReceivePage(), Config.defaultXamarinAnimations);
                return;
            }

            Navigation.PushAsync(new WalletReceivePage(friend), Config.defaultXamarinAnimations);
        }

        // Q2-⑥ (#268, W8 LANDED): `ixian:sendrequest:` on the home shell — the
        // Receive takeover's "request from a contact" strip. Parse + validate +
        // dispatch lifted VERBATIM from WalletReceivePage.onNavigating:93-155 and
        // onRequest:185-196; the ONLY deltas are (a) no popPageAsync (HomePage
        // stays), (b) no e.Cancel plumbing (the caller cancels unconditionally).
        // ★ SECURITY.md: requestFunds is a CHAT MESSAGE (an ask) — nothing is
        // signed or broadcast here; the payer later reviews in the native flow.
        private void onSendRequest(string current_url)
        {
            try
            {
                string[] split = current_url.Split(new string[] { "ixian:sendrequest:" }, StringSplitOptions.None);

                // Extract all addresses and amounts
                string[] addresses_split = split[1].Split(new string[] { "|" }, StringSplitOptions.None);

                foreach (var address_amount in addresses_split)
                {
                    if (address_amount == "")
                    {
                        continue;
                    }

                    string[] split_address_amount = address_amount.Split(':');
                    if (split_address_amount.Count() < 2)
                        continue;

                    string recipient = split_address_amount[0];
                    string amount = split_address_amount[1];
                    if (!ExtendedAddress.Validate(recipient))
                    {
                        displaySpixiAlert(SpixiLocalization._SL("global-invalid-address-title"), SpixiLocalization._SL("global-invalid-address-text"), SpixiLocalization._SL("global-dialog-ok"));
                        return;
                    }
                    string[] amount_split = amount.Split(new string[] { "." }, StringSplitOptions.None);
                    if (amount_split.Length > 2)
                    {
                        displaySpixiAlert(SpixiLocalization._SL("wallet-error-amount-title"), SpixiLocalization._SL("wallet-error-amountdecimal-text"), SpixiLocalization._SL("global-dialog-ok"));
                        return;
                    }

                    // Add decimals if none found
                    if (amount_split.Length == 1)
                        amount = String.Format("{0}.0", amount);

                    IxiNumber _amount = amount;

                    if (_amount == 0 || _amount < (long)0)
                    {
                        displaySpixiAlert(SpixiLocalization._SL("wallet-error-amount-title"), SpixiLocalization._SL("wallet-error-amount-text"), SpixiLocalization._SL("global-dialog-ok"));
                        return;
                    }

                    Address recipient_address = new Address(recipient);
                    Friend? request_friend = FriendList.getFriend(recipient_address);

                    // #268 audit FIX 1/2/3 — RECIPIENT GUARD. A deliberate,
                    // documented DEVIATION from the verbatim lift: legacy
                    // WalletReceivePage.onRequest:185-196 guarded only
                    // `friend != null && amount > 0` and silently did nothing
                    // otherwise (its own `// else error?` at :196 flags the hole).
                    //
                    // The frontend recipient list is NOT a security boundary, and
                    // it cannot even see every bad case:
                    //  · an INCOMING, not-yet-accepted request is routed out of the
                    //    chats list into the Requests feed (loadChats), so that
                    //    contact has no chat row, is never flagged "pending" in the
                    //    shell, and DOES render in the money strip;
                    //  · a group/bot with a custom avatar and no chat row slips past
                    //    the shell's avatar-sentinel + CH1 "kind" heuristics.
                    // Composing a requestFunds toward a peer who has not accepted us
                    // (or toward a group/bot) is the ⑪ "delivery lie" class on a
                    // money surface: the shell latches "Request sent ✓" for a message
                    // that cannot arrive. So: FAIL CLOSED here, and always surface
                    // the rejection (FIX 3 — no more silent no-op).
                    //
                    // FAIL-CLOSED on type: only FriendType.Normal is a 1:1 person;
                    // anything else (Group / Payment / Temporary / any future member
                    // added in Ixian-Core) is rejected rather than allowed.
                    //
                    // ★ BOTH handshake flags are checked, deliberately (Q2 re-review):
                    // `approved` means "I approved THEM" (its only writes are the two
                    // accept handlers — HomePage.onAcceptRequest and
                    // SingleChatPage.onAcceptFriendRequest), so a contact *I* added who
                    // has NOT accepted me yet can still be `approved` — the exact
                    // outgoing-pending recipient this guard exists to reject. The app's
                    // canonical "we are connected" test is `state == Approved`: a friend
                    // that is not Approved has its chat-list excerpt forced to
                    // "waiting for response" (getFriendMessageHelper) and gets NO call
                    // button (SingleChatPage:667). Checking both covers both directions
                    // and cannot reject a contact that shows a normal chat row today.
                    if (request_friend == null
                        || !request_friend.approved
                        || request_friend.state != FriendState.Approved
                        || request_friend.type != FriendType.Normal
                        || request_friend.bot)
                    {
                        Logging.warn("sendrequest: rejected recipient " + recipient
                            + " (known: " + (request_friend != null)
                            + ", approved: " + (request_friend != null ? request_friend.approved.ToString() : "n/a")
                            + ", state: " + (request_friend != null ? request_friend.state.ToString() : "n/a")
                            + ", type: " + (request_friend != null ? request_friend.type.ToString() : "n/a")
                            + ", bot: " + (request_friend != null ? request_friend.bot.ToString() : "n/a") + ")");
                        displaySpixiAlert(SpixiLocalization._SL("global-invalid-address-title"), SpixiLocalization._SL("global-invalid-address-text"), SpixiLocalization._SL("global-dialog-ok"));
                        return;
                    }

                    if (_amount > 0)
                    {
                        FriendMessage? friend_message = Node.addMessageWithType(null, FriendMessageType.requestFunds, request_friend.walletAddress, 0, amount, true);

                        StreamProcessor.transactionRequest(friend_message.id, request_friend, _amount, null, null);
                    }
                }
            }
            catch (Exception ex)
            {
                Logging.error("Exception occurent for sendrequest action: " + ex);
                displaySpixiAlert(SpixiLocalization._SL("wallet-request-error-title"), SpixiLocalization._SL("wallet-request-error-text"), SpixiLocalization._SL("global-dialog-ok"));
            }
        }

        public void onContactDetails(Friend friend)
        {
            // Chat header entry (via SingleChatPage) → context 'chat' (#248).
            openContactDetails(friend, true, true);
        }

        /* Unit 6 (#247): ONE router for every chat-info entry (conversation header
         * tap via SingleChatPage, chats row-menu / contacts directory ixian:details:).
         * ★ #221: ContactDetails keeps its OWN WebView; the conversation WebView is
         * never touched — all coordination is right here in C#.
         *  - wide + conversation open + room  → pane pinned BESIDE the chat (col 2).
         *    Staged full-span with a leading margin so the shell loads at its REAL
         *    width (a zero-width column would lay the WebView out at 0), then pinned
         *    to col 2 in the same frame it becomes visible (onOverlayPresented) —
         *    the column expands exactly when there is painted content to show.
         *  - wide + no conversation OR wide-but-squeezed → the detail slot (col 1):
         *    the info overtakes ONLY the conversation region, the list stays (#248,
         *    Damir F5 item 4 — full-window was wrong on wide windows).
         *  - narrow (single-pane)             → the full-span takeover (= the
         *    conversation region, which spans the window there).
         * chatContext (#248): 'chat' entries (header/row-menu) title "Chat info"/
         * "Group info"; only the contacts directory keeps "Contact details".
         * Re-tapping for the SAME contact toggles the surface closed (Telegram
         * grammar); a different contact rides the "chatinfo" tag-replace (seamless). */
        private void openContactDetails(Friend friend, bool customChatBtn, bool chatContext)
        {
            MainThread.BeginInvokeOnMainThread(() =>
            {
                foreach (SpixiContentPage p in SpixiContentPage.getOverlayPages())
                {
                    if (p is ContactDetails open)
                    {
                        if (open.friendAddressString() == friend.walletAddress.ToString())
                        {
                            removePage(open);   // toggle close
                            return;
                        }
                        break;   // different contact — the tag swap closes it after present
                    }
                }

                infoPaneCol2Pending = false;
                // Batch C loop B-MINOR-1: a lingering add-contact/add-app pane would sit
                // STACKED under a col-1 info pane and resurface when it closes — the
                // detail region navigates to the info surface, so the form yields
                // (same close-audit rule as tab/chat/tx navigation).
                closeFormPaneOverlays();
                closeTxDetailOverlays();   // #263 review NIT-1: same stacking class, defense-in-depth
                bool wide = rightContent.IsVisible;
                // #249 (Damir F5 r3): the BESIDE-the-conversation column is ONLY for the
                // OPEN conversation's own info — any other target (a contact from the
                // directory, another chat's row menu) pinned there reads as if it
                // belonged to the visible conversation. Everything else → col 1.
                bool chatOpenIsTarget = SpixiContentPage.getOverlayPages()
                    .Exists(p => p is SingleChatPage scp && scp.friend == friend);
                // Loop fix A-3/B-3: col 0's Width.Value is the star MULTIPLIER when
                // narrow — only meaningful under the wide guard.
                double avail = wide ? (Width - mainGrid.ColumnDefinitions[0].Width.Value - detailMinWidth) : 0;

                if (wide && chatOpenIsTarget && avail >= infoPaneMinWidth)
                {
                    double paneW = Math.Min(infoPaneWidth, avail);
                    infoPaneCol2Pending = true;
                    pushPageLoaded(new ContactDetails(friend, customChatBtn, "2", chatContext), 4000, "chatinfo", -1,
                        null, new Thickness(Math.Max(0, Width - paneW), 0, 0, 0));
                }
                else if (wide)
                {
                    // No conversation open, or no room beside it → the detail slot
                    // (stacks OVER an open conversation, covering only its region).
                    pushPageLoaded(new ContactDetails(friend, customChatBtn, "1", chatContext), 4000, "chatinfo", 1);
                }
                else
                {
                    pushPageLoaded(new ContactDetails(friend, customChatBtn, null, chatContext), 4000, "chatinfo");
                }
            });
        }

        // #251 (Damir F5: the EmptyDetail resting pane stayed DARK after a dark→light
        // pick): it is neither in the NavigationStack nor an overlay nor detailContent,
        // so every re-theme path missed it. Expose it for the SettingsPage setTheme
        // push + the reloadAllPages regenerate.
        public SpixiContentPage? getDefaultDetailContent()
        {
            return defaultDetailContent;
        }

        public void reloadDefaultDetail()
        {
            try
            {
                defaultDetailContent?.reload();
            }
            catch (Exception ex)
            {
                Logging.warn("reloadDefaultDetail: " + ex.Message);
            }
        }

        // #247: close any open chat-info surface. DIRECT close is safe here — unlike
        // the Account pane there is no held dirty state (nickname override / QR / money
        // actions all commit per-action through their own verbs).
        private void closeContactDetailsOverlays()
        {
            foreach (SpixiContentPage p in SpixiContentPage.getOverlayPages())
            {
                if (p is ContactDetails)
                {
                    removePage(p);   // #225: removing an open overlay = closeOverlay
                }
            }
        }

        // Batch C (#256 M7/M8): close an open add-contact/add-app form pane when the
        // user navigates the detail region elsewhere (tab switch / chat open / tx
        // open) — same close-audit the chat-info pane gets. ⚠ DIRECT close discards
        // typed-but-unsubmitted form input (an address / app URL) — accepted: the
        // user chose to navigate away, and the forms are one-field short. Damir dial.
        private void closeFormPaneOverlays()
        {
            foreach (SpixiContentPage p in SpixiContentPage.getOverlayPages())
            {
                // Q1-① (#267): AppDetailsPage now rides the same "formpane" slot
                // (Get-app / apps-tab ⋮ → App details) → same close-audit.
                if (p is ContactNewPage || p is AppNewPage || p is AppDetailsPage)
                {
                    removePage(p);   // #225: removing an open overlay = closeOverlay
                }
            }
        }

        // #263: same close-audit for the tx-detail overlay ("txdetail", pinned col 1
        // on wide) — leaving the wallet context closes it. View-only, no held state.
        private void closeTxDetailOverlays()
        {
            foreach (SpixiContentPage p in SpixiContentPage.getOverlayPages())
            {
                if (p is WalletSentPage)
                {
                    removePage(p);   // #225: removing an open overlay = closeOverlay
                }
            }
        }

        public void onConfirmPaymentRequest(FriendMessage msg, Friend friend, string amount, string date_text)
        {
            Navigation.PushAsync(new WalletContactRequestPage(msg, friend, amount, date_text), Config.defaultXamarinAnimations);
        }

        public async void quickScan()
        {
            var scanPage = new ScanPage();
            scanPage.scanSucceeded += HandleScanSucceeded;
            await Navigation.PushAsync(scanPage, Config.defaultXamarinAnimations);
        }
        private void HandleScanSucceeded(object sender, SPIXI.EventArgs<string> e)
        {
            processQRResult(e.Value);
        }

        public void processQRResult(string result)
        {
            popPageAsync();

            // Check for add contact
            string[] split = result.Split(new string[] { ":send" }, StringSplitOptions.None);
            if (split.Count() > 1)
            {

                try
                {
                    ExtendedAddress wallet_to_send = new ExtendedAddress(split[0]);
                    Navigation.PushAsync(new WalletSendPage(wallet_to_send), Config.defaultXamarinAnimations);
                }
                catch (Exception ex)
                {
                    Logging.error("Invalid address format: " + ex.Message);
                }
                return;
            }

            string id_to_add = split[0];
            var contactNewPage = new ContactNewPage(id_to_add);
            contactNewPage.pickSucceeded += (sender, e) =>
            {
                HandlePickSucceeded(sender, new() { new ExtendedAddress(e.Value) }, null, false);
            };
            Navigation.PushAsync(contactNewPage, Config.defaultXamarinAnimations);
            return;
        }

        // Show the recipient page
        public void newChat()
        {
            var recipientPage = new WalletRecipientPage(true, false);
            recipientPage.pickSucceeded += (sender, e) =>
            {
                HandlePickSucceeded(sender, e);
            };
            Navigation.PushAsync(recipientPage, Config.defaultXamarinAnimations);
        }

        // #265 (Damir ⑤): the in-shell group setup's avatar pick — same temp-file
        // convention the legacy picker used, so HandlePickSucceeded promotes it onto
        // the created group unchanged. C# owns the path; the WebView only says "pick".
        // ★ Opus review MAJOR-2: WalletRecipientPage.temporaryImagePath is only made
        // ABSOLUTE inside that page's ctor (it initializes to the bare relative
        // "avatar-tmp.jpg"). The in-shell flow never constructs that page, so writing
        // to it would hit the process CWD — silently failing on a packaged build (and
        // "working" only on an unpackaged dev run). Resolve the real path ourselves,
        // through the same storage root, every time.
        private static string groupAvatarTempPath()
        {
            return Path.Combine(IxianHandler.localStorage.avatarsPath, "avatar-tmp.jpg");
        }

        // MAJOR-3: an ABANDONED pick (photo chosen, then the user backs out) would be
        // promoted onto the NEXT group created — and shipped to its members. The legacy
        // picker deleted the temp file when it opened; do the same at every entry to the
        // in-shell group flow.
        private void clearGroupAvatarTemp()
        {
            try
            {
                string p = groupAvatarTempPath();
                if (File.Exists(p))
                {
                    File.Delete(p);
                }
            }
            catch (Exception ex)
            {
                Logging.warn("clearGroupAvatarTemp: " + ex);
            }
        }

        private async Task onGroupAvatarAsync()
        {
            SpixiImageData? spixi_img_data = await SFilePicker.PickImageAsync();
            if (spixi_img_data == null || spixi_img_data.stream == null)
            {
                // MINOR-6: a CANCELLED pick must release the shell's one-shot latch,
                // else the avatar button stays dead for the panel's life.
                Utils.sendUiCommand(this, "loadGroupAvatar", "");
                return;
            }
            try
            {
                byte[]? image_bytes;
                using (MemoryStream ms = new MemoryStream())
                {
                    spixi_img_data.stream.CopyTo(ms);
                    spixi_img_data.stream.Close();
                    image_bytes = SFilePicker.ResizeImage(ms.ToArray(), 960, 960, 80);
                    if (image_bytes == null)
                    {
                        Utils.sendUiCommand(this, "loadGroupAvatar", "");
                        return;
                    }
                }
                string path = groupAvatarTempPath();
                File.WriteAllBytes(path, image_bytes);
                // keep the legacy static in sync — HandlePickSucceeded promotes from it
                WalletRecipientPage.temporaryImagePath = path;
                Utils.sendUiCommand(this, "loadGroupAvatar", Utils.imageToDataUri(path));   // X1
            }
            catch (Exception ex)
            {
                Logging.error("onGroupAvatarAsync: " + ex);
                Utils.sendUiCommand(this, "loadGroupAvatar", "");   // release the latch
            }
        }

        private async void HandlePickSucceeded(object? sender, EventArgs<(List<ExtendedAddress>, string?, bool)> e)
        {
            HandlePickSucceeded(sender, e.Value.Item1, e.Value.Item2, e.Value.Item3);
        }

        // popFirst=false: the in-shell create-group flow (#265) has NO pushed page to
        // pop — popPageAsync() there would pop HomePage itself off the nav stack.
        private async void HandlePickSucceeded(object? sender, List<ExtendedAddress> addresses, string? groupName, bool blindMode, bool popFirst = true)
        {
            if (addresses.Count == 0)
            {
                await displaySpixiAlert("No recipient selected", "Please select a recipient to start the chat.", "OK");
                return;
            }

            bool hideParticipantAddresses = blindMode;
            Address address = addresses.First().RoutingAddress;

            if (addresses.Count > 1)
            {
                // group
                if (string.IsNullOrEmpty(groupName))
                {
                    Logging.error("Group name is null for group chat creation.");
                    return;
                }

                var contacts = addresses.ToOrderedDictionary(x => x.RoutingAddress, x => FriendList.getFriend(x.RoutingAddress)?.nickname, new AddressComparer());
                var g = GroupChat.CreateGroup(new Address(IxianHandler.getWalletStorage().getPrimaryPublicKey()), contacts, groupName, hideParticipantAddresses);
                if (g != null)
                {
                    // MAJOR-2: never trust the legacy static's default (a RELATIVE
                    // "avatar-tmp.jpg" until WalletRecipientPage's ctor runs) — resolve
                    // the real storage path when it isn't absolute.
                    string avatarPath = WalletRecipientPage.temporaryImagePath;
                    if (!Path.IsPathRooted(avatarPath))
                    {
                        avatarPath = groupAvatarTempPath();
                    }
                    if (File.Exists(avatarPath))
                    {
                        var avatar = File.ReadAllBytes(avatarPath);
                        byte[] resized_avatar = SFilePicker.ResizeImage(avatar, 128, 128, 100);
                        FriendList.setAvatar(g.walletAddress, avatar, resized_avatar, null);
                        File.Delete(avatarPath);
                    }
                    var cgm = new SpixiMessage(SpixiMessageCode.createGroup, new CreateGroupMessage(g.metaData.botInfo.randomId, groupName, contacts, new(), hideParticipantAddresses).getBytes());
                    CoreStreamProcessor.sendSpixiMessage(g, cgm);
                }
                else
                {
                    // pre-existing (review housekeeping): `address = g.walletAddress` sat
                    // OUTSIDE this guard → NRE in an async void if CreateGroup returned
                    // null. The in-shell flow is a new caller — fail loud, don't crash.
                    Logging.error("Group creation failed (CreateGroup returned null).");
                    return;
                }
                address = g.walletAddress;
            }
            else
            {
                Friend? friend = FriendList.getFriend(address);

                if (friend == null)
                {
                    return;
                }
            }

            try
            {
                if (popFirst)
                {
                    popPageAsync();
                }
                onChat(address, null);
            }
            catch (Exception ex)
            {
                Logging.error("Navigation failed: " + ex.Message);
            }
        }

        private void joinBot()
        {
            Friend? friend = FriendList.addFriend(FriendType.Normal, FriendState.RequestSent, new Address("419jmKRKVFcsjmwpDF1XSZ7j1fez6KWaekpiawHvrpyZ8TPVmH1v6bhT2wFc1uddV"), null, "Spixi Group Chat", null, null, 0);
            if (friend != null)
            {
                friend.save();

                UIHelpers.shouldRefreshContacts = true;

                CoreStreamProcessor.sendContactRequest(friend);

                if (friend.approved)
                {
                    CoreProtocolMessage.resubscribeEvents();
                }
            }
        }

        private void completeOnboard()
        {
            Preferences.Default.Set("onboardingComplete", true);

            SpixiLocalization.addCustomString("OnboardingComplete", "true");
            generatePage("index.html");
        }

        // Workaround for Android - sometimes the order of the screens isn't correct
        private void setAsRoot()
        {
            try
            {
                foreach (var page in Navigation.NavigationStack.ToList())
                {
                    if (page == this)
                    {
                        continue;
                    }
                    removePage(page);
                }
            }
            catch (Exception e)
            {
                Logging.error("Exception occured while setting HomePage as root: {0}", e);
            }
        }
        private void handleOnboardDone(object sender, SPIXI.EventArgs<bool> e)
        {
            // Join official groupchat if specified
            if (e.Value)
                joinBot();

            completeOnboard();
            Navigation.PopModalAsync();
        }
        private void onLoaded()
        {
            if (!Preferences.Default.ContainsKey("onboardingComplete"))
            {
                // Show onboarding screen
                var onboardPage = new OnboardPage();
                onboardPage.onboardDone += handleOnboardDone;
                Navigation.PushModalAsync(onboardPage);
            }

            setAsRoot();

            UIHelpers.shouldRefreshContacts = true;
            UIHelpers.refreshAppRequests = true;

            Utils.sendUiCommand(this, "selectTab", currentTab);

            Utils.sendUiCommand(this, "loadAvatar", Utils.imageToDataUri(IxianHandler.localStorage.getOwnAvatarPath()));   // X1

            Utils.sendUiCommand(this, "setVersion", Config.version + " BETA (" + Node.startCounter + ")");

            string address_string = new ExtendedAddress(IxianHandler.getWalletStorage().getPrimaryAddress(), AddressPaymentFlag.OfflineTag, null).ToString();
            Utils.sendUiCommand(this, "setAddress", address_string);

            Utils.sendUiCommand(this, "setHideBalance", hideBalance.ToString());

            try
            {
                updateScreen();
                webView.FadeTo(1, 150);
            }
            catch (Exception ex)
            {
                Logging.error("Exception occured in updateScreen call from onLoaded: {0}", ex);
            }

            checkForRating();
        }

        private void onNavigated(object sender, WebNavigatedEventArgs e)
        {
        }


        public void onSend(object sender, EventArgs e)
        {
            Navigation.PushAsync(new WalletSendPage(), Config.defaultXamarinAnimations);
        }

        public void onReceive(object sender, EventArgs e)
        {
            Navigation.PushAsync(new WalletReceivePage(), Config.defaultXamarinAnimations);
        }

        public void onSettings(object sender, EventArgs e)
        {
            // Unit 2 (#240): with the Account as a PANE the home rail stays live while
            // it is open — a second Account tap must not stage a duplicate SettingsPage.
            // If one is already open (possibly buried under a chat overlay), close the
            // overlays stacked ABOVE it so it resurfaces, and stop.
            if (SpixiContentPage.getOverlayPages().Exists(p => p is SettingsPage))
            {
                while (!(SpixiContentPage.getTopOverlay() is SettingsPage)
                    && SpixiContentPage.closeTopOverlay())
                {
                }
                return;
            }

            fromSettings = true;
            // Load-then-move (N3): Account opens as a #225 overlay. #245 (Damir: "same
            // peer as wallet/apps/chats, NOT a distant pane"): on a WIDE window the
            // settings WebView spans the WHOLE grid minus the rail strip — the home
            // rail (inside the home WebView, leading railWidthDip) stays visible and
            // live beside it. Inside, the shell renders the hub in the LIST-column
            // slot (width pushed via setPaneMetrics, aligned with the chats column)
            // and sublevels in the detail region — exactly the desktop demo layout.
            // One WebView, one trust domain (settings only); the chat wall (#221) is
            // untouched. Narrow windows keep the full-span takeover.
            bool wide = rightContent.IsVisible;
            if (wide)
            {
                pushPageLoaded(new SettingsPage(true, leftPaneWidth - railWidthDip), 4000, "settings", -1,
                    null, new Thickness(railWidthDip, 0, 0, 0));
            }
            else
            {
                pushPageLoaded(new SettingsPage(), 4000, "settings");
            }
        }

        // #263: no longer async — the old rightContent swap awaited FadeTo; the
        // overlay route stages/presents on its own thread machinery.
        public void onTransaction(byte[] txid, WebNavigatingEventArgs e)
        {
            var activity = Node.activityStorage.getActivityById(txid, null, true);
            if (activity == null)
            {
                e.Cancel = true;
                return;
            }

            // Unit 2 (#240): a tx detail renders in the detail region, UNDER an open
            // Account pane pinned to the same column — dismiss the pane first
            // (save-if-dirty through the shell) so the detail is actually visible.
            requestSettingsOverlayExit();
            closeContactDetailsOverlays();   // #247: same reasoning for the info pane
            closeFormPaneOverlays();         // Batch C: the tx detail takes the column

            if (rightContent.IsVisible)
            {
                // #263 (Damir F5: "multipane tx tap does NOTHING"): the old rightContent
                // SWAP put WalletSentPage UNDER the #225 pinned overlays — an open
                // conversation is a stage pinned OVER col 1, so the detail landed
                // beneath it, invisible. Route through the SAME overlay machinery
                // everything else uses: pinned col 1, tag "txdetail" (a new tx tap
                // tag-replaces the previous detail). Constructed WITHOUT the home ref
                // → hideBackButton is never pushed → the shell keeps its back button,
                // whose ixian:dismiss pops the overlay (popPageAsync is overlay-aware)
                // and reveals whatever sat beneath (conversation / empty detail).
                // Live status holds: OnUpdateUI ticks the TOP overlay every second.
                pushPageLoaded(new WalletSentPage(activity.transaction), 4000, "txdetail", 1);
                Utils.sendUiCommand(this, "selectTx", activity.transaction.getTxIdString());
                return;
            }

            Navigation.PushAsync(new WalletSentPage(activity.transaction), Config.defaultXamarinAnimations);
        }

        public void onChat(Address friend_address, WebNavigatingEventArgs? ev)
        {
            Friend? friend = FriendList.getFriend(friend_address);

            if (friend == null)
            {
                if (ev != null)
                {
                    ev.Cancel = true;
                }
                return;
            }

            fromChat = true;

            MainThread.BeginInvokeOnMainThread(() =>
            {
                if (Utils.getChatPage(friend) != null)
                {
                    // Already open (overlay, pane or pushed) — also swallows double-clicks.
                    Logging.warn("Chat page for {0} already open.", friend.ToString());
                    return;
                }

                // Unit 2 (#240): opening a conversation dismisses an open Account
                // pane (save-if-dirty through the shell) — both pin to the detail
                // column; stacking the chat OVER settings would leave a hidden pane
                // whose dirty edits SingleChatPage's back (popToRootAsync = close
                // ALL overlays) could later discard unsaved.
                requestSettingsOverlayExit();
                // #247: an open info pane belongs to the PREVIOUS conversation —
                // close it before the new chat stages (direct close is safe).
                closeContactDetailsOverlays();
                closeFormPaneOverlays();   // Batch C: the conversation takes the column
                closeTxDetailOverlays();   // #263: same — a new conversation covers col 1

                // #225: conversations open as OVERLAYS — loaded + painted off-screen,
                // then shown in place (wide window: pinned over the detail column,
                // narrow: full-screen). tag "chat" makes a new conversation REPLACE
                // the previous one only after it is visible → seamless switching,
                // nothing detaches, nothing can flicker.
                bool wide = rightContent.IsVisible;
                pushPageLoaded(new SingleChatPage(friend, wide ? this : null), 4000, "chat", wide ? 1 : -1);
                if (wide)
                {
                    Utils.sendUiCommand(this, "selectChat", friend.walletAddress.ToString());
                }
            });
        }

        // Load the contact list
        // TODO: optimize this
        private void loadContacts()
        {
            List<Friend> friends;
            lock (FriendList.friends)
            {
                friends = new List<Friend>(FriendList.friends);
            }

            lock (refreshLock)
            {
                // Clear everything
                Utils.sendUiCommand(this, "clearContacts");

                // Add contacts one-by-one
                foreach (Friend friend in friends)
                {
                    string str_online = "false";
                    if (friend.online)
                        str_online = "true";

                    string avatar = IxianHandler.localStorage.getAvatarPath(friend.walletAddress.ToString());
                    if (avatar == null)
                    {
                        avatar = "img/spixiavatar.png";

                        if (friend.type == FriendType.Group)
                        {
                            avatar = "img/spixi-group-avatar.png";
                        }
                    }
                    avatar = Utils.imageToDataUri(avatar);   // X1

                    Utils.sendUiCommand(this, "addContact", friend.walletAddress.ToString(), friend.nickname, avatar, str_online, friend.getUnreadMessageCount().ToString());
                }
            }
        }

        // CH5: does this chat carry an unread @-mention of my nick? No mention protocol
        // exists, so this is a TEXT HEURISTIC: scan the tail of the current channel for
        // unread incoming standard messages containing "@<nick>" (case-insensitive,
        // capped at 50). Groups/bots only — a 1:1 mention indicator would be noise.
        private bool hasUnreadMention(Friend friend)
        {
            if (!friend.bot && friend.type != FriendType.Group)
            {
                return false;
            }
            if (friend.getUnreadMessageCount() <= 0)
            {
                return false;
            }
            string nick = IxianHandler.localStorage.nickname;
            if (nick == null || nick == "")
            {
                return false;
            }
            var messages = friend.getMessages(friend.metaData.lastMessageChannel);
            if (messages == null)
            {
                return false;
            }
            int scanned = 0;
            for (int i = messages.Count - 1; i >= 0 && scanned < 50; i--, scanned++)
            {
                FriendMessage msg = messages[i];
                if (msg.localSender || msg.read)
                {
                    continue;
                }
                if (msg.type == FriendMessageType.standard
                    && msg.message.Contains("@" + nick, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
            return false;
        }

        private FriendMessageHelper? getFriendMessageHelper(Friend friend)
        {
            FriendMessage? lastmsg = friend.metaData.lastMessage;

            if (lastmsg == null)
            {
                return null;
            }

            string str_online = "false";
            if (friend.online)
                str_online = "true";

            if (lastmsg.localSender
                && !lastmsg.sent
                && !lastmsg.confirmed)
            {
                var msgs = friend.getMessages(friend.metaData.lastMessageChannel);
                var msg = friend.getMessage(friend.metaData.lastMessageChannel, lastmsg.id);
                if (msg != null)
                {
                    if (msg.sent != lastmsg.sent
                        || msg.confirmed)
                    {
                        lastmsg = msg;
                        friend.metaData.setLastMessage(msg, friend.metaData.lastMessageChannel);
                        friend.saveMetaData();
                    }
                }
                else if (msgs == null
                            || msgs.Count == 0)
                {
                    if (friend.metaData.unreadMessageCount != 0)
                    {
                        lastmsg.sent = true;
                        friend.metaData.unreadMessageCount = 0;
                        friend.saveMetaData();
                    }
                    return null;
                }
            }

            // Generate the excerpt depending on message type
            string excerpt = lastmsg.message;
            bool skipSelfPrefix = false;   // #265: "You: No answer" reads wrong (see below)

            if (friend.state != FriendState.Approved)
            {
                if (friend.bot == false)
                {
                    excerpt = SpixiLocalization._SL("chat-waiting-for-response");
                }
            }
            else
            {
                if (lastmsg.type == FriendMessageType.requestFunds)
                {
                    if (lastmsg.localSender)
                    {
                        excerpt = SpixiLocalization._SL("index-excerpt-payment-request-sent");
                    }
                    else
                    {
                        excerpt = SpixiLocalization._SL("index-excerpt-payment-request-received");
                    }
                }
                else if (lastmsg.type == FriendMessageType.sentFunds)
                {
                    if (lastmsg.localSender)
                    {
                        excerpt = SpixiLocalization._SL("index-excerpt-payment-sent");
                    }
                    else
                    {
                        excerpt = SpixiLocalization._SL("index-excerpt-payment-received");
                    }
                }
                else if (lastmsg.type == FriendMessageType.appSession)
                {
                    if (lastmsg.localSender)
                    {
                        excerpt = SpixiLocalization._SL("chat-app-invite-sent");
                    }
                    else
                    {
                        excerpt = SpixiLocalization._SL("chat-app-invite-received");
                    }
                }
                else if (lastmsg.type == FriendMessageType.requestAdd)
                {
                    if (friend.approved)
                    {
                        excerpt = SpixiLocalization._SL("index-excerpt-contact-accepted");
                    }
                    else
                    {
                        excerpt = SpixiLocalization._SL("index-excerpt-contact-request");
                    }
                }
                else if (lastmsg.type == FriendMessageType.fileHeader)
                {
                    excerpt = SpixiLocalization._SL("index-excerpt-file");
                }
                else if (lastmsg.type == FriendMessageType.voiceCall || lastmsg.type == FriendMessageType.voiceCallEnd)
                {
                    // #265 (Damir): the row said "Voice Call" for EVERY call — a missed
                    // call is the one you most need to see in the list. Derive the same
                    // way the chat bubble does (SingleChatPage:1616-1630): an EMPTY
                    // message on an ended/session-less call = never connected →
                    // "Missed call" (incoming) / "No answer" (outgoing). A duration
                    // means it connected → the plain call label.
                    excerpt = SpixiLocalization._SL("index-excerpt-voice-call");
                    if (lastmsg.message == ""
                        && (lastmsg.type == FriendMessageType.voiceCallEnd || !VoIPManager.hasSession(lastmsg.id)))
                    {
                        excerpt = lastmsg.localSender
                            ? SpixiLocalization._SL("chat-call-no-answer")
                            : SpixiLocalization._SL("chat-call-missed");
                        // review NIT: "You: No answer" reads wrong — the label already
                        // says whose side it was. Skip the self-prefix for this one.
                        skipSelfPrefix = true;
                    }
                }

                if (lastmsg.localSender && !skipSelfPrefix)
                {
                    excerpt = SpixiLocalization._SL("index-excerpt-self") + " " + excerpt;
                }
            }

            string? avatar = IxianHandler.localStorage.getAvatarPath(friend.walletAddress.ToString());
            if (avatar == null)
            {
                avatar = "img/spixiavatar.png";

                if (friend.type == FriendType.Group)
                {
                    avatar = "img/spixi-group-avatar.png";
                }
            }
            avatar = Utils.imageToDataUri(avatar);   // X1 (feeds both addChat pushes via the helper)

            string type = "";

            if (friend.isTyping)
            {
                excerpt = SpixiLocalization._SL("index-excerpt-typing");
                type = "typing";
            }
            else if (lastmsg.localSender && lastmsg.type != FriendMessageType.voiceCallEnd)
            {
                if (lastmsg.read)
                {
                    type = "read";
                }
                else if (lastmsg.confirmed)
                {
                    type = "confirmed";
                }
                else if (lastmsg.sent)
                {
                    type = "pending";
                }
                else
                {
                    type = "default";
                }
            }

            FriendMessageHelper helper_msg = new(friend.walletAddress.ToString(), friend.nickname, lastmsg.timestamp, avatar, str_online, excerpt, type, friend.getUnreadMessageCount());
            return helper_msg;
        }

        public void updateChat(Friend friend)
        {
            lock (refreshLock)
            {
                var fmh = getFriendMessageHelper(friend);
                if (fmh == null)
                {
                    return;
                }

                // CH2: an incoming contact request goes to the REQUESTS feed, not a chat row —
                // mirror loadChats here so a LONE updateChat (a message event, e.g. the arriving
                // requestAdd) doesn't briefly render the request as a normal, button-less,
                // tappable chat row (Damir F5: a half-second window where tapping the row acted
                // on the request). addRequest is a lone push — the FE upserts + re-renders.
                var lm = friend.metaData.lastMessage;
                if (!friend.approved && lm != null && lm.type == FriendMessageType.requestAdd && !lm.localSender)
                {
                    Utils.sendUiCommand(this, "addRequest", fmh.walletAddress, fmh.nickname, fmh.avatar, fmh.timestamp.ToString());
                    return;
                }

                // CH1: trailing chat kind (group/bot/1:1) · CH5: unread @-mention flag.
                // New args go LAST — never reorder.
                Utils.sendUiCommand(this, "addChat", fmh.walletAddress, fmh.nickname, fmh.timestamp.ToString(), fmh.avatar, fmh.onlineString, fmh.excerpt, fmh.type, fmh.unreadCount.ToString(), friend.bot ? "bot" : (friend.type == FriendType.Group ? "group" : ""), hasUnreadMention(friend).ToString());
            }
        }

        // CH8: a counterpart reacted — push a structured reaction excerpt to the chats
        // list (reactions never become lastMessage, so addChat can't carry this).
        public void updateChatReaction(Friend friend, Address reactor_address, string reaction)
        {
            if (reactor_address == null
                || IxianHandler.getWalletStorage().isMyAddress(reactor_address))
            {
                return;
            }

            lock (refreshLock)
            {
                string nick = friend.nickname;
                if (friend.bot || friend.type == FriendType.Group)
                {
                    nick = "";
                    if (friend.users.hasUser(reactor_address) && friend.users.getUser(reactor_address).getNick() != "")
                    {
                        nick = friend.users.getUser(reactor_address).getNick();
                    }
                }

                Utils.sendUiCommand(this, "addChatReaction", friend.walletAddress.ToString(), nick, reaction, Clock.getTimestamp().ToString());
            }
        }

        private void loadChats()
        {
            List<Friend> friends;
            lock (FriendList.friends)
            {
                friends = new List<Friend>(FriendList.friends);
            }

            lock (refreshLock)
            {
                // Check if there are any changes from last time first
                int unread = 0;
                foreach (Friend friend in friends)
                {
                    int umc = friend.getUnreadMessageCount();
                    if (umc > 0)
                    {
                        unread += umc;
                    }
                }

                if (unread > 0)
                {
                    Utils.sendUiCommand(this, "setUnreadIndicator", unread.ToString());
                }
                else
                {
                    Utils.sendUiCommand(this, "setUnreadIndicator", "0");
                }

                Utils.sendUiCommand(this, "clearChats");
                // CH2: incoming contact requests are their OWN feed (not chat rows) — clear it
                // within the same flush so clearChatsDone renders chats + requests together.
                Utils.sendUiCommand(this, "clearRequests");

                // Prepare a list of message helpers, to facilitate sorting and communication with the UI
                List<FriendMessageHelper> helper_msgs = new List<FriendMessageHelper>();
                // CH2: incoming contact requests (their requestAdd, not yet approved) → requests feed
                List<FriendMessageHelper> request_msgs = new List<FriendMessageHelper>();
                // CH1: chat kind per wallet address (FriendMessageHelper lives in Ixian-Core — no new field)
                Dictionary<string, string> chat_kinds = new Dictionary<string, string>();
                // CH5: unread @-mention flag per wallet address
                Dictionary<string, bool> mention_flags = new Dictionary<string, bool>();

                foreach (Friend friend in friends)
                {
                    if (friend.pendingDeletion)
                    {
                        continue;
                    }

                    var helper_msg = getFriendMessageHelper(friend);
                    if (helper_msg == null)
                    {
                        continue;
                    }

                    // CH2: an INCOMING contact request (they sent a requestAdd, I haven't approved)
                    // goes to the requests feed with Accept/Decline — NOT the chat list. Detected
                    // from the last message (their requestAdd, !localSender); an OUTGOING request I
                    // sent (localSender) stays a normal "waiting for response" chat row.
                    // NOTE (graceful degrade): this keys on the LAST message being the requestAdd —
                    // if an unapproved friend sends a follow-up before I accept, they fall through to
                    // the chat list; opening that row still offers the legacy in-chat Accept/Decline.
                    var lm = friend.metaData.lastMessage;
                    if (!friend.approved && lm != null && lm.type == FriendMessageType.requestAdd && !lm.localSender)
                    {
                        request_msgs.Add(helper_msg);
                        continue;
                    }

                    helper_msgs.Add(helper_msg);
                    chat_kinds[helper_msg.walletAddress] = friend.bot ? "bot" : (friend.type == FriendType.Group ? "group" : "");
                    mention_flags[helper_msg.walletAddress] = hasUnreadMention(friend);
                }

                // Sort the helper messages
                List<FriendMessageHelper> sorted_msgs = helper_msgs.OrderByDescending(x => x.timestamp).ToList();

                // Add the messages visually
                foreach (FriendMessageHelper helper_msg in sorted_msgs)
                {
                    // CH1: trailing chat kind · CH5: mention flag. New args go LAST — never reorder.
                    Utils.sendUiCommand(this, "addChat", helper_msg.walletAddress, helper_msg.nickname, helper_msg.timestamp.ToString(), helper_msg.avatar, helper_msg.onlineString, helper_msg.excerpt, helper_msg.type, helper_msg.unreadCount.ToString(), chat_kinds[helper_msg.walletAddress], mention_flags[helper_msg.walletAddress].ToString());
                }

                // CH2: incoming contact requests (newest first) — the FE renders these as
                // Accept/Decline request cards + drives the Requests filter chip.
                foreach (FriendMessageHelper rm in request_msgs.OrderByDescending(x => x.timestamp))
                {
                    Utils.sendUiCommand(this, "addRequest", rm.walletAddress, rm.nickname, rm.avatar, rm.timestamp.ToString());
                }

                // Clear the lists so they will be collected by the GC
                helper_msgs = null;
                request_msgs = null;
                sorted_msgs = null;
                chat_kinds = null;
                mention_flags = null;

                Utils.sendUiCommand(this, "clearChatsDone");
            }
        }

        public static IxiNumber calculateReceivedAmount(Transaction tx)
        {
            IxiNumber amount = 0;
            foreach (var entry in tx.toList)
            {
                if (IxianHandler.getWalletStorage().isMyAddress(entry.Key))
                {
                    amount += entry.Value.amount;
                }
            }
            return amount;
        }

        public void filterTransactions(string filter)
        {
            switch (filter)
            {

                case "sent":
                    {
                        transactionFilter = 1;
                        break;
                    }
                case "received":
                    {
                        transactionFilter = 2;
                        break;
                    }
                default:
                case "all":
                    {
                        transactionFilter = 0;
                        break;
                    }

            }
            loadTransactions(true);
        }
        public string filterToString(int filter)
        {
            switch (filter)
            {
                case 1:
                    return "sent";
                case 2:
                    return "received";
                case 0:
                default:
                    return "all";
            }
        }

        public void loadTransactions(bool forceRefresh)
        {
            if (!forceRefresh && !UIHelpers.shouldRefreshTransactions)
            {
                return;
            }
            if (detailContent != null)
            {
                detailContent.updateScreen();
            }
            UIHelpers.shouldRefreshTransactions = false;
            Utils.sendUiCommand(this, "clearPaymentActivity", filterToString(transactionFilter));

            void addPaymentActivity(ActivityObject activity)
            {
                Transaction tx = activity.transaction;
                string received = "1";
                string tx_text = tx.pubKey.ToString();
                IxiNumber amount = tx.amount;
                if (IxianHandler.getWalletStorage().isMyAddress(tx.pubKey))
                {
                    tx_text = tx.toList.First().Key.ToString();
                    Friend? friend = FriendList.getFriend(tx.toList.First().Key);
                    if (friend != null)
                    {
                        tx_text = friend.nickname;
                    }

                    received = "0";
                    if (transactionFilter == 2)
                        return;
                }
                else
                {
                    Friend? friend = FriendList.getFriend(tx.pubKey);
                    if (friend != null)
                    {
                        tx_text = friend.nickname;
                    }
                    amount = calculateReceivedAmount(tx);
                    if (transactionFilter == 1)
                        return;
                }
                string amount_string = Utils.amountToHumanFormatString(amount);
                string fiat_amount_string = Utils.amountToHumanFormatString(amount * Node.fiatPrice);

                string confirmed = "error";
                if (activity.status == IXICore.Activity.ActivityStatus.Final)
                {
                    confirmed = "true";
                }
                else if (activity.status == IXICore.Activity.ActivityStatus.Pending)
                {
                    confirmed = "false";
                }
                else if (activity.status == IXICore.Activity.ActivityStatus.Unknown)
                {
                    confirmed = "unknown";
                }
                else
                {
                    confirmed = "error";
                }

                string time = Utils.unixTimeStampToHumanFormatString(Convert.ToDouble(activity.timestamp));
                Utils.sendUiCommand(this, "addPaymentActivity", tx.getTxIdString(), received, tx_text, time, amount_string, fiat_amount_string, confirmed);
            }

            foreach (var activity in Node.activityStorage.getActivitiesByStatus(IXICore.Activity.ActivityStatus.Rejected, true))
            {
                addPaymentActivity(activity);
            }

            foreach (var activity in Node.activityStorage.getActivitiesByStatus(IXICore.Activity.ActivityStatus.Reverted, true))
            {
                addPaymentActivity(activity);
            }

            foreach (var activity in Node.activityStorage.getActivitiesByStatus(IXICore.Activity.ActivityStatus.Pending, true))
            {
                addPaymentActivity(activity);
            }

            foreach (var activity in Node.activityStorage.getActivitiesBySeedHashAndType(IxianHandler.getWalletStorage().getSeedHash(), null, null, 0, true))
            {
                if (activity.status == IXICore.Activity.ActivityStatus.Rejected
                    || activity.status == IXICore.Activity.ActivityStatus.Reverted
                    || activity.status == IXICore.Activity.ActivityStatus.Pending)
                {
                    continue;
                }
                var activityWithTx = Node.activityStorage.getActivityById(activity.id, null, true);
                addPaymentActivity(activityWithTx);
            }
        }

        private void displayBackupReminder()
        {
            if (!Preferences.Default.ContainsKey("backupReminderTimestamp")
                || Clock.getTimestamp() - long.Parse(Preferences.Default.Get("backupReminderTimestamp", "").ToString()) > Config.backupReminder)
            {
                Utils.sendUiCommand(this, "toggleAnimatedSlider", "backup-prompt");
                Preferences.Default.Set("backupReminderTimestamp", Clock.getTimestamp().ToString());
            }
        }

        private void updateDebugOverlay()
        {
            if (!devMode)
            {
                return;
            }

            string info = "";
            info += "<a title='Network Messages (Received/Sent/Error Sending)'><span>NETM:</span>" + RemoteEndpoint.receivedNetworkMessages + "/" + RemoteEndpoint.sentNetworkMessages + "/" + (RemoteEndpoint.toSendNetworkMessages - RemoteEndpoint.sentNetworkMessages) + "</a>";
            info += "<a title='Stream Messages (Received/To Send/Sent)'><span>STRM:</span>" + CoreStreamProcessor.receivedStreamMessages + "/" + PendingMessageProcessor.toSendStreamMessages + "/" + PendingMessageProcessor.sentStreamMessages + "</a>";
            info += "<a title='Offline Messages (Received/Sent)'><span>OFFM:</span>" + OfflinePushMessages.receivedOfflineMessages + "/" + OfflinePushMessages.sentOfflineMessages + "</a>";
            info += "<a title='Pending Stream Messages'><span>PSTRM:</span>" + CoreStreamProcessor.pendingMessageProcessor.countPendingMessages() + "</a>";
            Utils.sendUiCommand(this, "updateDebugInfo", info);
        }

        // Executed every second
        public override void updateScreen()
        {
            try
            {
                base.updateScreen();

                if (App.startingScreen != "")
                {
                    string startingScreen = App.startingScreen;
                    App.startingScreen = "";
                    try
                    {
                        onChat(new Address(startingScreen), null);
                    }
                    catch (Exception e)
                    {
                        Logging.error("Error in selecting start screen: " + e);
                    }
                    return;
                }

                displayBackupReminder();

                loadApps(false);

                if (UIHelpers.shouldRefreshContacts)
                {
                    loadChats();
                    loadContacts();
                    UIHelpers.shouldRefreshContacts = false;
                }

                updateContactStatus();
                loadTransactions(false);

                try
                {
                    string cur_version = Config.version.Substring(Config.version.IndexOf('-') + 1);

                    string new_version = checkForUpdate();
                    new_version = !new_version.StartsWith("(") ? new_version.Substring(new_version.IndexOf('-') + 1) : cur_version;

                    if (UpdateVerify.compareVersionsWithSuffix(new_version, cur_version) > 0)
                    {
                        Utils.sendUiCommand(this, "showWarning", String.Format(SpixiLocalization._SL("global-update-available"), new_version));
                    }
                    else
                    {
                        // Check the ixian dlt
                        if (NetworkClientManager.getConnectedClients(true).Count() > 0)
                        {
                            if (warningDisplayed)
                            {
                                Utils.sendUiCommand(this, "showWarning", "");
                                warningDisplayed = false;
                            }
                            connectivityWarningDelayCounter = 0;
                        }
                        else
                        {
                            // delay warning for one refresh cycle
                            if (connectivityWarningDelayCounter > 0)
                            {
                                if (!warningDisplayed)
                                {
                                    Utils.sendUiCommand(this, "showWarning", SpixiLocalization._SL("global-connecting-dlt"));
                                    warningDisplayed = true;
                                }
                                connectivityWarningDelayCounter = 0;
                            }
                            else
                            {
                                connectivityWarningDelayCounter++;
                            }
                        }

                    }
                }
                catch (Exception e)
                {
                    Logging.error("Exception occurred in HomePage.UpdateScreen: " + e);
                }
                IxiNumber availableBalance = Node.getAvailableBalance();
                string balance = Utils.amountToHumanFormatString(availableBalance);
                string fiatBalance = Utils.amountToHumanFormatString(Node.fiatPrice * availableBalance);
                Utils.sendUiCommand(this, "setBalance", balance, fiatBalance, IxianHandler.localStorage.nickname);

                // Check if we should reload certain elements
                if (Node.changedSettings == true)
                {
                    Utils.sendUiCommand(this, "loadAvatar", Utils.imageToDataUri(IxianHandler.localStorage.getOwnAvatarPath()));   // X1
                    Node.changedSettings = false;
                }

                SPushService.clearNotifications(FriendList.getUnreadMessageCount());

                updateDebugOverlay();
            }
            catch (Exception e)
            {
                Logging.error("Exception occurred in HomePage.UpdateScreen: " + e);
            }
        }

        public void OnUpdateUI()
        {
            try
            {
                if (!App.isInForeground)
                {
                    return;
                }

                // C18 (#265, Opus review MINOR-5): consume the global refresh flag HERE.
                // Nine pages override updateScreen() WITHOUT calling base (MiniApp,
                // ContactDetails, WalletSent, Downloads, Dev, Contributors, Apps,
                // AppNew, AppDetails) — with one of those stack-last AND another as the
                // top overlay, nothing consumed the flag and the ring never rendered
                // anywhere. HomePage always ticks, so this is the reliable consumer;
                // flag cleared FIRST, then a single broadcast to every call-capable
                // WebView (base.updateScreen keeps working for the present-time path).
                if (UIHelpers.refreshAppRequests)
                {
                    UIHelpers.refreshAppRequests = false;
                    SpixiContentPage.broadcastCallState();
                }
                Page page = Navigation.NavigationStack.Last();
                if (page is not null and SpixiContentPage)
                {
                    var scPage = (SpixiContentPage)page;
                    if (scPage.pageLoaded
                        && scPage.WebView != null
                        && scPage.WebView.IsEnabled)
                    {
                        scPage.updateScreen();
                    }
                }

                if (page == this
                    && detailContent is not null)
                {
                    ((SpixiContentPage)detailContent).updateScreen();
                }

                // #225: overlays are live surfaces outside the NavigationStack — tick
                // the TOP one (parity with the old top-of-stack behaviour: the chat
                // overlay gets its online-status/nick updates every second).
                var topOverlay = SpixiContentPage.getTopOverlay();
                if (topOverlay != null && topOverlay.pageLoaded)
                {
                    topOverlay.updateScreen();
                }
                // #247: with a chat-info PANE open, the conversation sits BELOW it in
                // the overlay stack but stays VISIBLE beside it — keep it ticking too
                // (it was the top overlay whenever visible before the pane existed).
                if (topOverlay is ContactDetails)
                {
                    foreach (SpixiContentPage op in SpixiContentPage.getOverlayPages())
                    {
                        if (op is SingleChatPage && op.pageLoaded)
                        {
                            op.updateScreen();
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Logging.error("Exception occured in onUpdateUI: {0}", ex);
            }
        }

        // #225: overlays never fire OnAppearing on this host (it is never detached) —
        // per-close refreshes live here instead.
        public override void onOverlayClosed(SpixiContentPage overlay)
        {
            if (overlay is SettingsPage)
            {
                // Same refresh the (push-era) fromSettings branch below does.
                Utils.sendUiCommand(this, "setTheme", ThemeManager.getResolvedAppearanceName());
                Utils.sendUiCommand(this, "loadAvatar", Utils.imageToDataUri(IxianHandler.localStorage.getOwnAvatarPath()));   // X1
                // #245: drop the rail's Account highlight back to the real in-page tab.
                Utils.sendUiCommand(this, "onSettingsClosed");
                UIHelpers.shouldRefreshContacts = true;
                fromSettings = false;
            }
            else if (overlay is SingleChatPage)
            {
                fromChat = false;
                // #247: a conversation's info pane has no life of its own — closing
                // the chat closes it (no dirty state; commits are per-action).
                closeContactDetailsOverlays();
                checkForRating();
            }
            else if (overlay is ContactDetails)
            {
                infoPaneCol2Pending = false;
                // Collapse the info column only when NO info pane remains open — a
                // "chatinfo" tag-replace closes the OLD pane AFTER the new one
                // presented (and re-expanded the column for itself).
                if (!SpixiContentPage.getOverlayPages().Exists(p => p is ContactDetails))
                {
                    infoPaneCol2Open = false;
                    mainGrid.ColumnDefinitions[2].Width = new GridLength(0);
                }
            }
        }

        // Unit 6 (#247): presentation-time pin of the chat-info pane. The overlay was
        // staged full-span with a leading margin (real width during load); NOW — in the
        // same main-thread frame it became visible — pin it to col 2 and expand the
        // column, so the pane appears fully painted with zero empty-strip frames.
        // Room is re-checked against the CURRENT window (it may have changed during the
        // load); no room anymore → the pane degrades to the full-span takeover.
        public override void onOverlayPresented(SpixiContentPage overlay)
        {
            if (!(overlay is ContactDetails))
            {
                return;
            }
            if (!infoPaneCol2Pending)
            {
                // Loop fix A-1 (MAJOR): a col-1/full-span info pane presented while a
                // PREVIOUS col-2 pane is still expanded (the "chatinfo" tag-replace is
                // about to close it) — the new pane does NOT own col 2, and the old
                // pane's onOverlayClosed will see "a ContactDetails remains" and skip
                // the collapse. Collapse it here, or the empty 360px column stays.
                if (infoPaneCol2Open)
                {
                    infoPaneCol2Open = false;
                    mainGrid.ColumnDefinitions[2].Width = new GridLength(0);
                }
                return;
            }
            infoPaneCol2Pending = false;
            // Loop fix A-3/B-3: read col 0's Width.Value only under the wide guard —
            // when narrow it is GridLength.Star and .Value is the star MULTIPLIER.
            bool wide = rightContent.IsVisible;
            double avail = wide ? (Width - mainGrid.ColumnDefinitions[0].Width.Value - detailMinWidth) : 0;
            // Re-check: the conversation may have closed or SWITCHED during the load —
            // col 2 is only for the open conversation's OWN info (#249).
            ContactDetails cd = (ContactDetails)overlay;
            bool chatOpenIsTarget = SpixiContentPage.getOverlayPages()
                .Exists(p => p is SingleChatPage scp && scp.friend.walletAddress.ToString() == cd.friendAddressString());
            if (wide && chatOpenIsTarget && avail >= infoPaneMinWidth)
            {
                SpixiContentPage.rehomeOverlay(overlay, 2);
                mainGrid.ColumnDefinitions[2].Width = new GridLength(Math.Min(infoPaneWidth, avail));
                infoPaneCol2Open = true;
            }
            else
            {
                // #248 degrade grammar: on a WIDE window the info covers only the
                // conversation region (col 1, the detail slot); narrow = full span.
                SpixiContentPage.rehomeOverlay(overlay, wide ? 1 : -1);
                // A-1 family: this pane no longer owns col 2 — if a replaced col-2
                // pane left the column expanded, collapse it.
                if (infoPaneCol2Open)
                {
                    infoPaneCol2Open = false;
                    mainGrid.ColumnDefinitions[2].Width = new GridLength(0);
                }
            }
        }

        // Unit 2 (#240): ask an open Account overlay to EXIT ITSELF — the shell runs
        // its save-if-dirty path (ixian:save/ixian:back → SettingsPage pops → the
        // overlay closes). Direct closeOverlay would discard held nickname/avatar/lock
        // edits. A shell that never booted has nothing to save → close it directly.
        private void requestSettingsOverlayExit()
        {
            foreach (SpixiContentPage p in SpixiContentPage.getOverlayPages())
            {
                if (p is SettingsPage sp)
                {
                    if (sp.pageLoaded)
                    {
                        Utils.sendUiCommand(sp, "onExitRequest");
                    }
                    else
                    {
                        removePage(sp);   // wedged/never-booted shell: nothing to save
                    }
                    return;
                }
            }
        }

        protected override bool OnBackButtonPressed()
        {
            // #230: while a lock is shown in place, HomePage is still the CurrentPage —
            // swallow back entirely (the lock's own OnBackButtonPressed never runs).
            if (SpixiContentPage.hasModalOverlay())
            {
                return true;
            }
            // Q4-③ (#270): while the native call RING covers the window, back must
            // not navigate the app underneath — Accept/Decline/timeout are the
            // exits (the in-call BAR strip does NOT swallow back; the app is live).
            if (CallPage.isRingPresented())
            {
                return true;
            }
            // Unit 2 (#240) close-audit: an Account overlay holds uncommitted edits —
            // route back THROUGH the shell (takeover→hub, hub→save-if-dirty exit),
            // exactly like SettingsPage.OnBackButtonPressed did when it was pushed.
            // (Pre-existing #225 gap fixed: closeTopOverlay bypassed the save path.)
            if (SpixiContentPage.getTopOverlay() is SettingsPage sp && sp.pageLoaded)
            {
                Utils.sendUiCommand(sp, "onBack");
                return true;
            }
            // #225: hardware/host back closes the top overlay first.
            if (SpixiContentPage.closeTopOverlay())
            {
                return true;
            }
            return base.OnBackButtonPressed();
        }

        protected override void OnAppearing()
        {
            if (fromSettings)
            {
                fromSettings = false;
                // Round 2 (Damir F5 "saving flickers"): do NOT full-reload index.html
                // here — combined with onSaveSettings' own home reload this DOUBLE-
                // booted Home in front of the user on every Account exit. Refresh via
                // pushes instead: theme (idempotent re-assert, covers a pick made
                // while Home was covered/detached), own avatar, and a contacts
                // re-flush. A LANGUAGE change still full-reloads Home — triggered at
                // save time in SettingsPage (strings are baked into the page).
                Utils.sendUiCommand(this, "setTheme", ThemeManager.getResolvedAppearanceName());
                Utils.sendUiCommand(this, "loadAvatar", Utils.imageToDataUri(IxianHandler.localStorage.getOwnAvatarPath()));   // X1
                UIHelpers.shouldRefreshContacts = true;
            }
            else if (fromChat)
            {
                fromChat = false;
                checkForRating();
            }
            base.OnAppearing();
        }

        private string checkForUpdate()
        {
            if (!UpdateVerify.ready && !UpdateVerify.error) return "(checking)";
            if (UpdateVerify.ready)
            {
                if (UpdateVerify.error) return "(error)";
                return UpdateVerify.serverVersion;
            }
            return "(not checked)";
        }

        private void checkForRating()
        {
            if (DeviceInfo.Platform == DevicePlatform.Android || DeviceInfo.Platform == DevicePlatform.iOS)
            {
                if (Preferences.Default.ContainsKey("rating_action"))
                {
                    string resp = Preferences.Default.Get("rating_action", "show");
                    if (resp.Equals("show", StringComparison.Ordinal))
                    {
                        Utils.sendUiCommand(this, "showRatingPrompt");
                    }
                }
            }
        }

        // Adds and filters a new contact status to the cache
        // Can be called from any thread
        public void setContactStatus(Address address, bool online, int unread, string excerpt, long timestamp)
        {
            // Cache and filter contact status changes to reduce cpu usage with many notifications
            lock (contactStatusCache)
            {
                bool _alreadyInCache = false;
                int i = 0;
                for (i = 0; i < contactStatusCache.Count; i++)
                {
                    contactStatusCacheItem cacheItem = contactStatusCache[i];
                    if (cacheItem.address.SequenceEqual(address))
                    {
                        // Update the cached status to the latest message
                        if (timestamp > cacheItem.timestamp)
                        {
                            cacheItem.timestamp = timestamp;
                            cacheItem.unread = unread;
                            cacheItem.online = online;
                            cacheItem.excerpt = excerpt;
                        }
                        else if (timestamp == 0)
                        {
                            // iOS-8/11/31 leg B(ii): timestamp 0 is the DISPLAY-ONLY push
                            // (loadMessages zeroing the unread count, presence ticks) — it
                            // carries no new message, so it can never win a `>` comparison
                            // against an existing entry and was dropped outright. That is why
                            // opening a chat cleared nothing: the zero never reached the list.
                            // Apply the live fields, keep the entry's own excerpt/timestamp.
                            cacheItem.unread = unread;
                            cacheItem.online = online;
                        }
                        // iOS-8/11/31 leg B(i): contactStatusCacheItem is a STRUCT, so the
                        // line above took a COPY — every mutation here was written to that copy
                        // and thrown away, and updateContactStatus went on pushing the ORIGINAL
                        // cached values. Write it back.
                        contactStatusCache[i] = cacheItem;
                        // Already in cache, break to minimize processing
                        _alreadyInCache = true;
                        break;
                    }
                }

                // If not found in cache, add this message
                if (!_alreadyInCache)
                {
                    contactStatusCacheItem cacheItem = new contactStatusCacheItem();
                    cacheItem.address = address;
                    cacheItem.online = online;
                    cacheItem.unread = unread;
                    cacheItem.excerpt = excerpt;
                    cacheItem.timestamp = timestamp;
                    contactStatusCache.Add(cacheItem);
                }
            }

        }
        // Updates the status for all entries in the contact status cache
        // Called from a UI thread
        public void updateContactStatus()
        {
            lock (contactStatusCache)
            {
                // Go through each cache item and perform the status update
                foreach (contactStatusCacheItem cacheItem in contactStatusCache)
                {
                    Utils.sendUiCommand(this, "setContactStatus", cacheItem.address.ToString(),
                        cacheItem.online.ToString(), cacheItem.unread.ToString(), cacheItem.excerpt, cacheItem.timestamp.ToString());
                }
                // Clear the contact status cache
                contactStatusCache.Clear();
            }
        }

        public override void reload()
        {
            base.reload();
            removeDetailContent();
        }

        // #285: language re-bake — regenerate ONLY the home shell. Unlike reload(),
        // the detail pane is left alone: the language pick that calls this is hosted
        // IN the detail pane (Account settings; nuking it would clobber the #274
        // picker restore), and live chat panes re-localize via their own reload().
        public void reloadShell()
        {
            suppressNextTabOverlayExit = true;
            // #288 review (break-my-verdict): two language picks inside the ~5 s belt
            // window are ONE TAP apart — the #274 stash returns the user straight back
            // ONTO the Language picker. Without this epoch, belt #1's clear disarms pick
            // #2's flag, its boot echo runs the exit sweep, and the Account pane is torn
            // down mid-pick: exactly the #285 round-2 bug this flag exists to prevent.
            int gen = ++reloadShellGen;
            base.reload();
            // Belt (F5 2026-07-29): the reload's re-populate burst rides ONE
            // Navigated→readyState flush; on WinUI that can race the fresh document
            // and strand the message queue → an empty (but correctly-localized)
            // shell. If the latch is still down after the boot window, re-drive it
            // (webViewNavigated → readyState poll → queue flush), then re-arm the
            // refresh flags so the 1 Hz updateScreen pass re-pushes chats + avatar
            // (balance re-pushes every tick anyway; tab2/tab3 load on open, Fix #8).
            _ = System.Threading.Tasks.Task.Run(async () =>
            {
                await System.Threading.Tasks.Task.Delay(1500);
                if (!pageLoaded)
                {
                    // must run on the UI thread: webViewNavigated → applyPlatformPageChrome
                    // touches native layout properties.
                    // #288 review: re-check the latch INSIDE the lambda (the page can finish
                    // loading in the marshalling gap → a second webViewNavigated on an
                    // already-booted page) and LOG the failure — a silent catch here means
                    // the empty-shell symptom this belt exists to rescue comes back with no
                    // diagnostic whatsoever.
                    MainThread.BeginInvokeOnMainThread(() =>
                    {
                        try { if (!pageLoaded) { webViewNavigated(this, null); } }
                        catch (Exception ex) { Logging.error("reloadShell belt re-drive failed: " + ex.Message); }
                    });
                    await System.Threading.Tasks.Task.Delay(500);
                }
                UIHelpers.shouldRefreshContacts = true;
                UIHelpers.refreshAppRequests = true;
                Node.changedSettings = true;   // re-push avatar on the next tick
                await System.Threading.Tasks.Task.Delay(3500);
                UIHelpers.shouldRefreshContacts = true;   // second pass if the first raced the boot
                // #288 review: the tab1-echo suppression must never outlive this window. A
                // shell that failed to boot emits no echo, and a latched flag would make the
                // NEXT genuine tab switch skip the whole exit sweep. Epoch-guarded (see the
                // gen capture above) so this clear can only ever disarm ITS OWN reload.
                MainThread.BeginInvokeOnMainThread(() =>
                {
                    if (gen == reloadShellGen) { suppressNextTabOverlayExit = false; }
                });
            });
        }

        public void removeDetailContent(bool setDefault = true)
        {
            if (detailContent != null)
            {
                detailContent.Dispose();
                detailContent = null;
            }

            if (setDefault)
            {
                if (defaultDetailContent != null)
                {
                    defaultDetailContent.Dispose();
                }

                defaultDetailContent = new EmptyDetail();
                rightContent.Content = defaultDetailContent.Content;

                Utils.sendUiCommand(this, "selectChat", "");
            }
        }

        // Spixi Mini Apps logic

        private void loadApps(bool forceRefresh)
        {
            if (!forceRefresh && !UIHelpers.shouldRefreshApps)
            {
                return;
            }
            if (detailContent != null)
            {
                detailContent.updateScreen();
            }
            UIHelpers.shouldRefreshApps = false;

            Utils.sendUiCommand(this, "clearApps");

            var apps = Node.MiniAppManager.getInstalledApps();
            lock (apps)
            {
                foreach (var app_arr in apps)
                {
                    MiniApp app = app_arr.Value;
                    string icon = Node.MiniAppManager.getAppIconPath(app.id);
                    if (icon == null)
                    {
                        icon = "";
                    }
                    icon = Utils.imageToDataUri(icon);   // X1
                    Utils.sendUiCommand(this, "addApp", app.id, app.name, icon, app.publisher, app.hasCapability(MiniAppCapabilities.SingleUser).ToString(), app.hasCapability(MiniAppCapabilities.MultiUser).ToString());
                }
            }

            foreach (var p in Utils.getChatPages())
            {
                p.reloadScreen();
            }
        }

        private void onStartApp(string appId)
        {
            MiniAppPage miniAppPage = new MiniAppPage(appId, IxianHandler.getWalletStorage().getPrimaryAddress(), null, Node.MiniAppManager.getAppEntryPoint(appId));
            miniAppPage.accepted = true;
            Node.MiniAppManager.addAppPage(miniAppPage);

            MainThread.BeginInvokeOnMainThread(() =>
            {
                Navigation.PushAsync(miniAppPage, Config.defaultXamarinAnimations);
            });
        }

        private void onStartAppMulti(string appId)
        {
            var recipientPage = new WalletRecipientPage(false, false);
            recipientPage.pickSucceeded += (sender, e) =>
            {
                HandlePickAppMultiUserSucceeded(sender, e.Value.Item1, appId);
            };

            MainThread.BeginInvokeOnMainThread(() =>
            {
                Navigation.PushAsync(recipientPage, Config.defaultXamarinAnimations);
            });
        }

        private async void HandlePickAppMultiUserSucceeded(object sender, List<ExtendedAddress> addresses, string appId)
        {
            Address address = new Address(addresses.First().RoutingAddress);
            Friend? friend = FriendList.getFriend(address);

            if (friend == null)
            {
                return;
            }

            try
            {
                popPageAsync();

                byte[] session_id = onJoinApp(appId, friend);

                var app_info = Node.MiniAppManager.getAppInfo(appId);
                var msg_id = StreamProcessor.sendAppRequest(friend, appId, session_id, null, app_info);
                Node.addMessageWithType(msg_id, FriendMessageType.appSession, friend.walletAddress, 0, app_info, true, null, 0, false);
            }
            catch (Exception ex)
            {
                Logging.error("Navigation failed: " + ex.Message);
            }
        }

        public byte[] onJoinApp(string appId, Friend friendOrGroup)
        {
            MiniAppPage miniAppPage = new MiniAppPage(appId, IxianHandler.getWalletStorage().getPrimaryAddress(), friendOrGroup, Node.MiniAppManager.getAppEntryPoint(appId));
            miniAppPage.accepted = true;
            Node.MiniAppManager.addAppPage(miniAppPage);

            MainThread.BeginInvokeOnMainThread(async () =>
            {
                await Task.Delay(200); // WinUI Crash fix
                await Navigation.PushAsync(miniAppPage, Config.defaultXamarinAnimations);
            });

            return miniAppPage.sessionId;
        }

        public async void onInstallApp(string appUrl, Friend? friendOrGroup)
        {
            MiniApp? app = await Node.MiniAppManager.fetch(appUrl);
            if (app == null)
            {
                return;
            }

            app.url = appUrl;

            MainThread.BeginInvokeOnMainThread(() =>
            {
                // Q1-① (#267): app details land in the DETAIL column on wide windows
                // (Damir F5: "Get app opened full screen"). Same routing + the same
                // "formpane" tag as newcontact/newapp, so add-app → app-details
                // tag-REPLACES cleanly (the #264-review dial). Narrow keeps the
                // full-span takeover. The install CONFIRM inside AppDetailsPage
                // stays a modal (#256 lock) — only the page presentation changes.
                closeContactDetailsOverlays();   // loop B-MINOR-1: no col-1 stacking
                pushPageLoaded(new AppDetailsPage(app, null, true, friendOrGroup), 4000, "formpane", rightContent.IsVisible ? 1 : -1);   // load-then-move (N3)
            });
        }

        private void onAppDetails(string appId)
        {
            // Q1-① (#267): same detail-column routing as onInstallApp above.
            closeContactDetailsOverlays();   // loop B-MINOR-1 (symmetry)
            pushPageLoaded(new AppDetailsPage(appId), 4000, "formpane", rightContent.IsVisible ? 1 : -1);   // load-then-move (N3)
        }

        private void onAcceptRequest(string address)
        {
            // CH2: mirrors SingleChatPage.onAcceptFriendRequest — approve + send the accept.
            // A full contacts refresh (shouldRefreshContacts) re-flushes loadChats, which
            // drops the friend from the requests feed (now approved) into the chat list.
            Friend friend = FriendList.getFriend(new Address(address));
            if (friend == null)
            {
                return;
            }
            friend.approved = true;
            friend.handshakePushed = false;
            UIHelpers.shouldRefreshContacts = true;
            StreamProcessor.sendAcceptAdd(friend, true);
        }

        private void onDeclineRequest(string address)
        {
            // CH2: decline = remove the friend (mirrors SingleChatPage's undorequest).
            Friend friend = FriendList.getFriend(new Address(address));
            if (friend == null)
            {
                return;
            }
            FriendList.removeFriend(friend);
            UIHelpers.shouldRefreshContacts = true;
        }

        private void onUninstallApp(string appId)
        {
            // A1: same removal AppDetailsPage.onUninstall uses (MiniAppManager.remove).
            // Re-render the tab UNCONDITIONALLY (mirrors AppDetailsPage setting
            // shouldRefreshApps regardless) so the FE's optimistic tile-removal and the
            // authoritative C# list always converge — even if remove() returns false
            // (app already gone), loadApps re-pushes the current truth.
            Node.MiniAppManager.remove(appId);
            UIHelpers.shouldRefreshApps = true;
            loadApps(true);
        }

        public SpixiContentPage? getDetailContent()
        {
            return detailContent;
        }
    }
}
