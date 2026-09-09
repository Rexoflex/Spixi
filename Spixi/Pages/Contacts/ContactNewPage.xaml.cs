using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
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
	public partial class ContactNewPage : SpixiContentPage
	{
        private string wallet_to_add = "";

        public event EventHandler<SPIXI.EventArgs<string>>? pickSucceeded = null;

        public ContactNewPage ()
		{
			InitializeComponent ();
            NavigationPage.SetHasNavigationBar(this, false);

            loadPage(webView, "contact_new.html");
        }

        public ContactNewPage(string wal_id)
        {
            InitializeComponent();
            NavigationPage.SetHasNavigationBar(this, false);

            wallet_to_add = wal_id;

            loadPage(webView, "contact_new.html");
        }

        private void onNavigated(object sender, WebNavigatedEventArgs e)
        {
            // Deprecated due to WPF, use onLoad
        }

        private void onLoad()
        {
            if (wallet_to_add != null && wallet_to_add.Length > 0)
            {
                Utils.sendUiCommand(this, "setAddress", wallet_to_add);
            }
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
                onLoad();
            }
            else if (current_url.Equals("ixian:back", StringComparison.Ordinal))
            {
                OnBackButtonPressed();
            }
            else if (current_url.Equals("ixian:error", StringComparison.Ordinal))
            {
                displaySpixiAlert(SpixiLocalization._SL("global-invalid-address-title"), SpixiLocalization._SL("global-invalid-address-text"), SpixiLocalization._SL("global-dialog-ok"));
            }
            else if (current_url.Contains("ixian:request:"))
            {
                try
                {
                    string[] split = current_url.Split(new string[] { "ixian:request:" }, StringSplitOptions.None);
                    onRequest(split[1]);
                }catch(Exception)
                {
                    displaySpixiAlert(SpixiLocalization._SL("global-invalid-address-title"), SpixiLocalization._SL("global-invalid-address-text"), SpixiLocalization._SL("global-dialog-ok"));
                }
            }
            else if (current_url.Equals("ixian:quickscan", StringComparison.Ordinal))
            {
                quickScan();
            }
            else if (current_url.Contains("ixian:qrresult:"))
            {
                string[] split = current_url.Split(new string[] { "ixian:qrresult:" }, StringSplitOptions.None);
                string result = split[1];
                processQRResult(result);
                e.Cancel = true;
                return;
            }
            else if (current_url.StartsWith("ixian:checkAddress:", StringComparison.Ordinal))
            {
                /* ★ Session T: the body moved to `answerCheckAddress` so the shell-hosted
                 * copy of this screen asks the identical question. #435(b)'s reasoning is
                 * preserved there verbatim — report "already a contact" BEFORE the request,
                 * as a line plus a View contact button, because an address you already know
                 * is not a failure. */
                answerCheckAddress(this, current_url.Substring("ixian:checkAddress:".Length));
            }
            else if (current_url.StartsWith("ixian:viewcontact:", StringComparison.Ordinal))
            {
                // #435(b): the "View contact" affordance. Replaces this form with the
                // contact's own page (same slot, same tag) — the SingleChatPage
                // precedent (:442). Nothing is sent and nothing is added.
                string address = current_url.Substring("ixian:viewcontact:".Length);
                try
                {
                    Friend? known = FriendList.getFriend(new Address(address));
                    if (known != null)
                    {
                        // tag/column left at their defaults ON PURPOSE: with `replaces`
                        // set, pushPageLoaded INHERITS the replaced overlay's slot (the Q1
                        // fix) — so on a wide window the contact page lands in the SAME
                        // detail column the form occupied instead of a full-window takeover.
                        pushPageLoaded(new ContactDetails(known, false, null, false), 4000, null, -1, this);
                    }
                }
                catch (Exception ex)
                {
                    Logging.error("viewcontact failed: " + ex.Message);
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

        private void HandleScanSucceeded(object? sender, SPIXI.EventArgs<string> e)
        {
            string wallets_to_add = e.Value;

            processQRResult(wallets_to_add);
        }

        public async void quickScan()
        {
            var scanPage = new ScanPage();
            scanPage.scanSucceeded += HandleScanSucceeded;
            await hostNav.PushAsync(scanPage, Config.defaultXamarinAnimations);   // #225: root nav
        }

        /* ★ Session T walk A7: this used to split on ":ixi" alone, so `addr:send:<amount>`
         * — the third arm of the same closed grammar — reached setAddress with its tail on.
         * Utils.scanAddressOf answers "where does the address end" instead of "is this the
         * one tail I thought of", which is the shape of the defect Damir hit in the shell.
         * The length gate is UNCHANGED and still the only thing that rejects junk here. */
        public void processQRResult(string result)
        {
            string wal = Utils.scanAddressOf(result);
            // TODO: enter exact Ixian address length
            if (wal.Length > 20 && wal.Length < 128)
            {
                Utils.sendUiCommand(this, "setAddress", wal);
            }
        }

        /* ★★ Session T — ONE TRUTH FOR "SEND A CONTACT REQUEST".
         * The body below used to live inside onRequest, on this page. The home shell now
         * hosts the same screen in ITS OWN WebView (no page push, no cold Chromium boot —
         * Damir reported the stutter twice), so two hosts run this logic and it must not
         * be copied. Same pattern as `BackupPage.backupAccount()` forwarding to
         * `SettingsPage` (#243/S15): the core lives with the page that owns the domain,
         * and every host forwards to it.
         *
         * ★ IT RETURNS AN OUTCOME INSTEAD OF ALERTING, and that is the point. This page
         * answers a rejection with a native alert and a pop; the shell-hosted screen has
         * no page to pop and cannot see an alert, so it needs the verdict as data. The
         * old comment in `contact_new.html` says so — it arms a 6-SECOND timer and then
         * guesses ("If nothing happened, that address may already be a contact or
         * invalid"), because C# returns silently on three of four paths. That guess is a
         * wedge, it was logged as a BE fix that never came, and hosting the screen in the
         * shell is what finally forces the honest answer.
         * ⚠ The presentation stays with each host. Nothing here alerts, pops or pushes. */
        public enum AddContactOutcome { Sent, InvalidAddress, SelfAddress, AlreadyContact }

        public static AddContactOutcome addContactCore(string recipient_address_string, out string? contactName)
        {
            contactName = null;
            ExtendedAddress ext_recipient_address;
            try
            {
                ext_recipient_address = new ExtendedAddress(recipient_address_string);
            }
            catch (Exception ex)
            {
                Logging.error("Invalid address format: " + ex.GetType().Name);   // ★ Sweep G-3: NOT ex.Message —
                // Ixian-Core's Address constructor formats the whole base58 token into its
                // exception text, and ixian.log is rendered by DevPage and shared in one tap.
                // Exposed by Session T: an outer try used to hide the second of these two
                // sites from gate 18's brace-match, so the leak was latent rather than absent.
                return AddContactOutcome.InvalidAddress;
            }

            Address recipient_address = ext_recipient_address.RoutingAddress;
            if (recipient_address.SequenceEqual(IxianHandler.getWalletStorage().getPrimaryAddress()))
            {
                return AddContactOutcome.SelfAddress;
            }

            Friend? old_friend = FriendList.getFriend(recipient_address);
            if (old_friend != null)
            {
                if (old_friend.pendingDeletion)
                {
                    FriendList.removeFriend(old_friend);
                    UIHelpers.shouldRefreshContacts = true;
                }
                else
                {
                    return AddContactOutcome.AlreadyContact;
                }
            }

            contactName = recipient_address.ToString();
            Friend? friend = FriendList.addFriend(FriendType.Normal, FriendState.RequestSent, recipient_address, null, contactName, null, null, 0);

            if (friend != null)
            {
                friend.save();

                StreamProcessor.sendContactRequest(friend);

                HomePage.writeRequestSentMarker(recipient_address);   // #572 ①: the marker must not count as unread

                UIHelpers.shouldRefreshContacts = true;
            }

            return AddContactOutcome.Sent;
        }

        /* ★ Session T — the same three checks the request itself makes, as a QUESTION.
         * `ixian:checkAddress:` used to be answered only here. The shell-hosted screen
         * asks the identical question, so the answer comes from one place: this page and
         * the home shell can never disagree about what a request would do. */
        public static void answerCheckAddress(SpixiContentPage page, string address)
        {
            try
            {
                ExtendedAddress ext = new ExtendedAddress(address);
                Address routing = ext.RoutingAddress;
                if (routing.SequenceEqual(IxianHandler.getWalletStorage().getPrimaryAddress()))
                {
                    Utils.sendUiCommand(page, "onKnownAddress", "self", "", "", address);
                    return;
                }
                Friend? known = FriendList.getFriend(routing);
                // pendingDeletion is NOT a duplicate — the request removes and re-adds it.
                if (known != null && !known.pendingDeletion)
                {
                    // The 4th arg is the string we were ASKED about, echoed back: the shell
                    // correlates the async answer with the field's current value, and the
                    // ROUTING address can differ from what was typed.
                    Utils.sendUiCommand(page, "onKnownAddress", "contact",
                        routing.ToString(), known.nickname == null ? "" : known.nickname, address);
                    return;
                }
                Utils.sendUiCommand(page, "onValidAddress");
            }
            catch (Exception ex)
            {
                Logging.error("Invalid address format: " + ex.GetType().Name);   // ★ Sweep G-3: NOT ex.Message —
                // Ixian-Core's Address constructor formats the whole base58 token into its
                // exception text, and ixian.log is rendered by DevPage and shared in one tap.
                // Exposed by Session T: an outer try used to hide the second of these two
                // sites from gate 18's brace-match, so the leak was latent rather than absent.
            }
        }

        public void onRequest(string recipient_address_string)
        {
            string? contactName = null;
            AddContactOutcome outcome;
            try
            {
                outcome = addContactCore(recipient_address_string, out contactName);
            }
            catch (Exception)
            {
                // unchanged: this page has always swallowed an unexpected failure and
                // fallen through to the pick/pop below.
                outcome = AddContactOutcome.Sent;
            }

            if (outcome == AddContactOutcome.InvalidAddress)
            {
                displaySpixiAlert(SpixiLocalization._SL("global-invalid-address-title"), SpixiLocalization._SL("global-invalid-address-text"), SpixiLocalization._SL("global-dialog-ok"));
                return;
            }
            if (outcome == AddContactOutcome.SelfAddress)
            {
                displaySpixiAlert(SpixiLocalization._SL("global-invalid-address-title"), SpixiLocalization._SL("contact-new-invalid-address-self-text"), SpixiLocalization._SL("global-dialog-ok"));
                return;
            }
            if (outcome == AddContactOutcome.AlreadyContact)
            {
                displaySpixiAlert(SpixiLocalization._SL("global-invalid-address-title"), SpixiLocalization._SL("contact-new-invalid-address-exists-text"), SpixiLocalization._SL("global-dialog-ok"));
                return;
            }

            if (pickSucceeded != null)
            {
                pickSucceeded(this, new SPIXI.EventArgs<string>(contactName));
            }
            else
            {
                popPageAsync();
            }
        }

        protected override bool OnBackButtonPressed()
        {
            popPageAsync();
            return true;
        }
    }
}