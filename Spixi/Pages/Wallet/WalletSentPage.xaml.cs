using IXICore;
using IXICore.Activity;
using IXICore.Meta;
using IXICore.Streaming;
using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.Storage;               // Preferences (hidebalance, #285)
using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using SPIXI.Lang;
using SPIXI.Meta;
using System;
using System.Linq;
using System.Web;

namespace SPIXI
{
    [XamlCompilation(XamlCompilationOptions.Compile)]
    public partial class WalletSentPage : SpixiContentPage
    {
        private Transaction transaction;
        private ActivityStatus lastActivityStatus = 0;

        private bool viewOnly = true;

        private HomePage? homePage;

        private bool isConfirmedDisplayed = false;

        // #334 W9(b): true only after a FULL burst (through setData) reached the
        // shell. lastActivityStatus used to latch BEFORE the pushes, so any
        // mid-method exception left the 1 Hz updateScreen poll early-returning
        // forever on an empty view; it also neutralizes the `= 0` initial-value
        // sentinel (a first activity whose status equals the default no longer
        // skips the first burst). Enum-agnostic — no ActivityStatus members named.
        private bool burstPushed = false;
        // #334 W9(a/b): whether the last committed burst was the activity == null
        // fallback — dedupes the null-case 1 Hz re-burst (pre-fix that case NRE'd,
        // so there is no legacy behavior to preserve) and blocks a false
        // unchanged-status skip when the activity appears later (lastActivityStatus
        // is stale across a null gap).
        private bool lastActivityMissing = false;

        public WalletSentPage(Transaction tx, bool view_only = true, HomePage? home = null)
        {
            viewOnly = view_only;

            InitializeComponent();
            NavigationPage.SetHasNavigationBar(this, false);
            webView.Opacity = 0;
            // #259 redesigned shell (instant-bg = --surface-screen): the pre-paint
            // backing must match it, not the legacy launch-blue (N1/N3 class; fixed
            // with the edge-to-edge batch alongside the stale surfaceColorFor entry).
            Content.BackgroundColor = ThemeManager.getSurfaceColor();

            transaction = tx;

            loadPage(webView, "wallet_sent.html");

            homePage = home;
        }

        private void onNavigated(object sender, WebNavigatedEventArgs e)
        {
            // Deprecated due to WPF, use onLoad
        }

        private void onLoad()
        {
            if (transaction == null)
            {
                onDismiss();
                return;
            }

            // #334 loop MINOR-2: every ixian:onload = a FRESH shell document (an OS
            // theme flip reloadAllPages reboots it with an empty staging buffer) —
            // an armed burstPushed would early-return the re-burst and leave a
            // PENDING tx's card permanently blank. Reset with the document.
            burstPushed = false;
            lastActivityMissing = false;

            // #334 W9(c): hideBackButton FIRST — it rebuilds the shell's topbar, so
            // pushing it after setHideBalance + the data burst re-shaped chrome under
            // an already-populated view (defense per the be-cutover W9 row: settle the
            // page shape before any data lands).
            if (homePage != null)
            {
                Utils.sendUiCommand(this, "hideBackButton");
            }

            // #285 (#263/#276 hide leg, F5 2026-07-29): the detail page previously
            // stayed unmasked ("explicit reveal" dial — designed for the mobile
            // sheet→Details flow). On desktop a row tap opens THIS page directly in
            // the pane, leaking amount/fiat/name/address next to a masked list.
            // Push the persisted flag BEFORE the burst so the first render is
            // already masked; the shell offers a per-view reveal eye.
            /* ★ F7 INSTRUMENTATION (log only — Damir: "Show amounts" is not displayed on
             * Android). The shell offers the eye only when `hideKnown && walletHidden`
             * (wallet_sent.html:258), and which of the two is false cannot be decided from
             * source: `hideKnown` is set by the ARRIVAL of this push, `walletHidden` by its
             * VALUE. Logging the value here splits them — a `false` value means the wallet
             * is simply not hidden (and the eye is correctly absent), while a `true` value
             * with no eye on screen means the push did not reach the shell and `hideKnown`
             * is the one that stayed false. Adjacent to the known pre-exister B3. */
            bool hideBalancePref = Preferences.Default.Get("hidebalance", false);
            Logging.info("[WALLETDIAG] setHideBalance push · hidebalance=" + hideBalancePref);
            Utils.sendUiCommand(this, "setHideBalance", hideBalancePref.ToString());
            checkTransaction();

            try
            {
                webView.FadeTo(1, 150);
            }
            catch (Exception e)
            {
                Logging.warn("Exception: " + e);
            }
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
            else if (current_url.Equals("ixian:dismiss", StringComparison.Ordinal))
            {
                onDismiss();
            }
            else if (current_url.Equals("ixian:viewexplorer", StringComparison.Ordinal))
            {
                Browser.Default.OpenAsync(new Uri(String.Format("{0}?p=transaction&id={1}", Config.explorerUrl, transaction.getTxIdString())));
            }
            else if (current_url.Trim().StartsWith("file:", StringComparison.OrdinalIgnoreCase))
            {
                // allow normal navigation only for local files
                e.Cancel = false;
                return;
            }
            e.Cancel = true;

        }

        // Retrieve the transaction from local cache storage
        private void checkTransaction()
        {
            Utils.sendUiCommand(this, "clearEntries");

            string confirmed = "error";

            var activity = Node.activityStorage.getActivityById(transaction.id, null, true);
            Transaction? ctransaction = transaction;
            if (activity != null)
            {
                // #334 W9(b): early-return only when the previous burst actually
                // REACHED the shell (burstPushed) AND wasn't the null-activity
                // fallback (its status latch is stale) — see the field notes. The
                // lone clearEntries pushed above is buffer-reset-only by the shell's
                // #289 staging contract, same as the pre-existing early-return shape.
                if (burstPushed && !lastActivityMissing && lastActivityStatus == activity.status)
                {
                    return;
                }
                // #334 loop MINOR-3: the status latch moved to AFTER setData (with
                // burstPushed) — latching here re-created the exact wedge W9 fixed
                // for the first burst: a mid-burst exception on a LATER status change
                // left burstPushed=true + the NEW status latched → early-return
                // forever with the old card shown.
                // #334 W9(a) class: a null activity.transaction previously NRE'd at
                // the amount read below — fall back to the constructor transaction.
                ctransaction = activity.transaction ?? transaction;
                if (activity.status == IXICore.Activity.ActivityStatus.Final)
                {
                    isConfirmedDisplayed = true;
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
            }
            else
            {
                // #334 W9(a/b): the null-activity fallback burst is pushed ONCE; a
                // repeat tick with activity still null has nothing new → lone
                // clearEntries only (buffer reset, no re-render churn).
                if (burstPushed && lastActivityMissing)
                {
                    return;
                }
                confirmed = "error";
            }

            IxiNumber amount = ctransaction.amount;

            // iOS-55 (#325, W1 LANDED): raw epoch seconds — the shell formats via
            // formatTxTimestamp/docLocale (see HomePage.addPaymentActivity note).
            // #334 W9(a): the activity == null else-branch above fell through to this
            // deref → NRE on every poll tick. Fallback = "" (no-time): a "0" would
            // render VERBATIM — txTimeDisplay's numeric gate is `> 0` so "0" falls to
            // the legacy-text branch and timeText wins when non-empty (wallet_sent
            // .html:293 + txlist-item.js:68); '' marshals fine (sendUiCommand quotes).
            string time = activity != null ? activity.timestamp.ToString() : "";

            string type = "send";

            Address addr = ctransaction.pubKey;
            if (addr.SequenceEqual(IxianHandler.getWalletStorage().getPrimaryAddress()))
            {
                // this is a sent payment

                foreach (var entry in ctransaction.toList)
                {
                    Friend? friend = FriendList.getFriend(entry.Key);
                    IxiNumber entry_amount = entry.Value.amount;
                    IxiNumber fiat_amount = entry_amount * Node.fiatPrice;

                    string username = SpixiLocalization._SL("wallet-unknown-recipient");
                    string user_avatar = "img/spixiavatar.png";
                    if (friend != null)
                    {
                        username = friend.nickname;
                        var tmp_user_avatar = IxianHandler.localStorage.getAvatarPath(friend.walletAddress.ToString());
                        if (tmp_user_avatar != null)
                        {
                            user_avatar = tmp_user_avatar;
                        }
                    }

                    Utils.sendUiCommand(this, "addEntry", entry.Key.ToString(), username, user_avatar, Utils.amountToHumanFormatString(entry_amount), Utils.amountToHumanFormatString(fiat_amount), time, type, confirmed);

                    // TODO Handle multiple recipients
                    break;
                }
            }
            else
            {
                // this is a received payment
                type = "receive";
                amount = 0;

                foreach (var entry in ctransaction.toList)
                {
                    if (IxianHandler.getWalletStorage().isMyAddress(entry.Key))
                    {
                        amount += entry.Value.amount;
                    }
                }
                IxiNumber fiat_amount = amount * Node.fiatPrice;

                Utils.sendUiCommand(this, "setReceivedMode");
                Address sender_address = ctransaction.pubKey;
                Friend friend = FriendList.getFriend(sender_address);

                string username = SpixiLocalization._SL("wallet-unknown-sender");
                string user_avatar = "img/spixiavatar.png";

                if (friend != null)
                {
                    username = friend.nickname;
                    var tmp_user_avatar = IxianHandler.localStorage.getAvatarPath(friend.walletAddress.ToString());
                    if (tmp_user_avatar != null)
                    {
                        user_avatar = tmp_user_avatar;
                    }
                }

                Utils.sendUiCommand(this, "addEntry", sender_address.ToString(), username, user_avatar, Utils.amountToHumanFormatString(amount), Utils.amountToHumanFormatString(fiat_amount), time, type, confirmed);               

            }

            IxiNumber fee = 0;
            foreach (var toEntry in ctransaction.toList.TakeLast(2))
            {
                fee += toEntry.Value.amount;
            }
            fee += ctransaction.fee;

            Utils.sendUiCommand(this, "setData", amount.ToString(), fee.ToString(),
                time, transaction.getTxIdString(), confirmed);
            // #334 W9(b): the burst is only now COMPLETE (setData commits the shell's
            // #289 staging buffer) — arm the unchanged-status early return.
            burstPushed = true;
            lastActivityMissing = (activity == null);
            if (activity != null)
            {
                lastActivityStatus = activity.status;   // loop MINOR-3: latch WITH the arm
            }
            return;
        }

        public override void updateScreen()
        {
            if (!isConfirmedDisplayed)
            {
                checkTransaction();
            }
        }

        private void onDismiss()
        {
            if (!viewOnly)
            {
                removePage(Navigation.NavigationStack[Navigation.NavigationStack.Count - 2]);
                removePage(Navigation.NavigationStack[Navigation.NavigationStack.Count - 2]);
            }
            popPageAsync();
        }

        protected override bool OnBackButtonPressed()
        {
            onDismiss();
            return true;
        }
    }
}