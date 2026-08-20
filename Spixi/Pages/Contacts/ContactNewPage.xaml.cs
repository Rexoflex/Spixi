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
                string address = current_url.Substring("ixian:checkAddress:".Length);
                ExtendedAddress ext_recipient_address;
                try
                {
                    ext_recipient_address = new ExtendedAddress(address);

                    /* ★ #435(b): answer WHICH outcome this address has, not just "parses".
                     * The shell used to learn that an address was already a contact only
                     * from onRequest — which shows a native alert reading "it could be
                     * invalid or already in your contacts", i.e. two different outcomes
                     * sharing one failure branch, on a screen that had ALREADY shown a
                     * green tick. Damir's dial: report it BEFORE the request is sent,
                     * as a short line plus a View contact button — not an error, because
                     * an address you already know is not a failure.
                     * ⚠ The dial assumed the shell could detect this locally from a
                     * contacts list. It cannot: production add-contact is this STANDALONE
                     * page (ContactNewPage → contact_new.html), which never receives a
                     * roster. Pushing the whole roster to it would be strictly worse —
                     * more data in a WebView, for one boolean. So the answer rides the
                     * check that was already round-tripping.
                     * The two rejections mirror onRequest exactly, so the screen can
                     * never disagree with what the request would do. */
                    Address routing_address = ext_recipient_address.RoutingAddress;
                    if (routing_address.SequenceEqual(IxianHandler.getWalletStorage().getPrimaryAddress()))
                    {
                        Utils.sendUiCommand(this, "onKnownAddress", "self", "", "", address);
                    }
                    else
                    {
                        Friend? known = FriendList.getFriend(routing_address);
                        // pendingDeletion is NOT a duplicate — onRequest removes and re-adds it.
                        if (known != null && !known.pendingDeletion)
                        {
                            // The 4th arg is the string we were ASKED about, echoed back:
                            // the shell correlates the async answer with the field's current
                            // value, and the ROUTING address can differ from what was typed
                            // (an extended address resolves to it), so it cannot serve.
                            Utils.sendUiCommand(this, "onKnownAddress", "contact",
                                routing_address.ToString(), known.nickname == null ? "" : known.nickname, address);
                        }
                        else
                        {
                            Utils.sendUiCommand(this, "onValidAddress");
                        }
                    }
                }
                catch (Exception ex)
                {
                    Logging.error("Invalid address format: " + ex.Message);
                }
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
            else
            {
                // Otherwise it's just normal navigation
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

        public void processQRResult(string result)
        {
            if (result.Contains(":ixi"))
            {
                string[] split = result.Split(new string[] { ":ixi" }, StringSplitOptions.None);
                if (split.Count() < 1)
                    return;
                string wal = split[0];
                Utils.sendUiCommand(this, "setAddress", wal);

            }
            else
            {
                string wal = result;
                // TODO: enter exact Ixian address length
                if (wal.Length > 20 && wal.Length < 128)
                    Utils.sendUiCommand(this, "setAddress", wal);
            }
        }

        public void onRequest(string recipient_address_string)
        {
            string? contactName = null;
            try
            {
                ExtendedAddress ext_recipient_address;
                try
                {
                    ext_recipient_address = new ExtendedAddress(recipient_address_string);
                }
                catch (Exception ex)
                {
                    Logging.error("Invalid address format: " + ex.Message);
                    displaySpixiAlert(SpixiLocalization._SL("global-invalid-address-title"), SpixiLocalization._SL("global-invalid-address-text"), SpixiLocalization._SL("global-dialog-ok"));
                    return;
                }

                Address recipient_address = ext_recipient_address.RoutingAddress;
                if (recipient_address.SequenceEqual(IxianHandler.getWalletStorage().getPrimaryAddress()))
                {
                    displaySpixiAlert(SpixiLocalization._SL("global-invalid-address-title"), SpixiLocalization._SL("contact-new-invalid-address-self-text"), SpixiLocalization._SL("global-dialog-ok"));
                    return;
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
                        displaySpixiAlert(SpixiLocalization._SL("global-invalid-address-title"), SpixiLocalization._SL("contact-new-invalid-address-exists-text"), SpixiLocalization._SL("global-dialog-ok"));
                        return;
                    }
                }
                contactName = recipient_address.ToString();
                Friend? friend = FriendList.addFriend(FriendType.Normal, FriendState.RequestSent, recipient_address, null, contactName, null, null, 0);

                if (friend != null)
                {
                    friend.save();

                    StreamProcessor.sendContactRequest(friend);

                    Node.addMessageWithType(null, FriendMessageType.requestAddSent, recipient_address, 0, "", true);

                    UIHelpers.shouldRefreshContacts = true;
                }
            }
            catch(Exception)
            {

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