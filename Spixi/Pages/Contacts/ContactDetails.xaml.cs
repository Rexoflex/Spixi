using IXICore;
using IXICore.Meta;
using IXICore.SpixiBot;
using IXICore.Streaming;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using SPIXI.Lang;
using SPIXI.Meta;
using System;
using System.Collections.Generic;
using System.Web;

namespace SPIXI
{
    [XamlCompilation(XamlCompilationOptions.Compile)]
	public partial class ContactDetails : SpixiContentPage
	{
        private Friend friend = null;
        private bool customChatBtn = false;
        // Unit 6 (#247): desktop pane hosting — "2" = the column beside the open
        // conversation, "1" = the detail slot, null = the mobile/full-span takeover.
        // Pushed to the shell BEFORE any content (SettingsPage setPaneMode pattern).
        private string paneCol = null;
        // #248 (Damir F5 item 1): entry-dependent surface — a chat header / chats
        // row-menu entry renders "Chat info"/"Group info" (context 'chat'); ONLY the
        // contacts directory keeps "Contact details" + the Message action.
        private bool chatContext = false;
        private bool isGroup = false;
        // N50 (#370): the shell's overlay-stack state (ixian:cdoverlay mirror) —
        // volatile like homeShellOverlayOpen (nav thread writes, back path reads).
        public volatile bool shellOverlayOpen = false;

		public ContactDetails (Friend lfriend, bool customChatButton = false, string paneColumn = null, bool chat_context = false)
		{
			InitializeComponent ();
            NavigationPage.SetHasNavigationBar(this, false);

            friend = lfriend;
            customChatBtn = customChatButton;
            paneCol = paneColumn;
            chatContext = chat_context;
            // #249 (Damir F5 r3): BOTS get the group surface too (members/notifications/
            // owner as a desktop pane) — the in-chat takeover overtook the conversation.
            isGroup = friend.type == FriendType.Group || friend.bot;

            loadPage(webView, "contact_details.html");
        }

        // #247: HomePage's toggle/close routing compares by address, never by instance.
        public string friendAddressString()
        {
            return friend.walletAddress.ToString();
        }

        private void onNavigated(object sender, WebNavigatedEventArgs e)
        {
            // Deprecated due to WPF, use onLoad
        }

        private void onLoad()
        {
            // N50 (#370 loop A-3/B-4): a shell RELOAD (reloadAllPages on a theme or
            // language flip) builds a fresh document with no overlay open, and the
            // MutationObserver mirror only reports CHANGES — reset here or a stale
            // true swallows hardware back (the #337 homeShellOverlayOpen lesson).
            shellOverlayOpen = false;

            // #247: pane layout FIRST — coalesces ahead of the present, so the shell
            // never paints a takeover layout that reflows into the pane grammar.
            if (paneCol != null)
            {
                Utils.sendUiCommand(this, "setPaneMode", paneCol);
            }

            // #248: entry-dependent context (chat header/row-menu = 'chat' → "Chat
            // info"/"Group info", no Message action; contacts directory = 'contact').
            Utils.sendUiCommand(this, "setContext", chatContext ? "chat" : "contact");

            if (isGroup)
            {
                // #248 GROUP INFO shell-side (Damir F5 item 2): this page now carries
                // the group surface too, so group info gets the same desktop pane /
                // takeover behavior as 1:1. Meta + full roster (masking mirrors
                // SingleChatPage.loadContacts for blind groups).
                bool blind = friend.metaData.botInfo != null && friend.metaData.botInfo.hideParticipantAddresses;
                bool amAdmin = friend.metaData.botInfo != null && friend.metaData.botInfo.admin;
                bool notifications = friend.metaData.botInfo == null || friend.metaData.botInfo.sendNotification;
                // Owner address: identity-revealing → NEVER sent for a blind group.
                string owner = "";
                if (!blind)
                {
                    try { owner = friend.users.getOwner()?.ToString() ?? ""; } catch { }
                }
                // N48 (#370, Damir dial #369): MY OWN owner status, pushed for blind
                // groups too — it reveals only my own identity to my own UI, never
                // another member's ("If I am owner, I should know even in blind
                // groups"). Computed from the raw owner address, NOT the masked
                // `owner` string above, so the blind suppression stays intact.
                bool amOwner = false;
                // Loop A-5 (#370): GROUPS only. For a BOT room getOwner() degrades to
                // "the first roster entry we happened to learn" (BotUsers.First(), and
                // the 500-cap eviction reshuffles it) — a bot-room member could read a
                // false "You are the owner". A private group's roster is small and
                // creator-first, so the claim is reliable exactly where N48 aims.
                if (friend.type == FriendType.Group)
                {
                    try
                    {
                        var ownerAddress = friend.users.getOwner();
                        var selfAddress = IxianHandler.getWalletStorage().getPrimaryAddress();
                        amOwner = ownerAddress != null && selfAddress != null && ownerAddress.SequenceEqual(selfAddress);
                    }
                    catch { }
                }
                Utils.sendUiCommand(this, "setGroupInfo",
                    friend.users.contacts.Count.ToString(),
                    blind ? "1" : "0",
                    amAdmin ? "1" : "0",
                    notifications ? "1" : "0",
                    owner,
                    friend.type == FriendType.Group ? "group" : "bot",   // #249: surface kind
                    amOwner ? "1" : "0");                                // N48 (#370): additive — old shells ignore it
                loadMembers(blind);
            }

            Utils.sendUiCommand(this, "setAddress", friend.walletAddress.ToString());

            updateScreen();
        }

        // #248: full participant roster for the group surface — same push contract
        // as SingleChatPage.loadContacts (CI1), incl. the blind-group masking.
        private void loadMembers(bool blind)
        {
            Utils.sendUiCommand(this, "clearMembers");
            // #249 (Damir F5 r3): the LOCAL user is a participant too, but has no
            // participant nick / stored contact avatar — resolve self from localStorage.
            Address selfAddress = IxianHandler.getWalletStorage().getPrimaryAddress();
            var contacts = friend.users.contacts;
            foreach (var contact in contacts)
            {
                var contactAddress = contact.Key;
                bool isSelf = selfAddress != null && contactAddress.SequenceEqual(selfAddress);
                string address = contactAddress.ToString();
                string? avatar = IxianHandler.localStorage.getAvatarPath(address);
                if (avatar == null && isSelf)
                {
                    avatar = IxianHandler.localStorage.getOwnAvatarPath();
                }
                if (avatar == null)
                {
                    avatar = "img/spixiavatar.png";
                }
                avatar = Utils.imageToDataUri(avatar);   // X1
                // nick resolution mirrors SingleChatPage.resolveNick's fallback chain
                // (participant nick → the local friend's nickname if we know them),
                // + the self row falls back to MY OWN nickname (#249).
                string nick = contact.Value.getNick();
                if (string.IsNullOrEmpty(nick))
                {
                    if (isSelf)
                    {
                        nick = IxianHandler.localStorage.nickname;
                    }
                    else
                    {
                        var local_fr = FriendList.getFriend(contactAddress);
                        if (local_fr != null)
                        {
                            nick = local_fr.nickname;
                        }
                    }
                }
                if (blind)
                {
                    if (string.IsNullOrEmpty(nick))
                    {
                        nick = "x" + contactAddress.ToString();
                    }
                    address = "[Unknown]";
                }
                // D-5/N26 (#366): trailing relation ("" on blind rows — no identity hints).
                Utils.sendUiCommand(this, "addMember", address, nick, avatar, contact.Value.getPrimaryRole().ToString(), blind ? "" : contactRelationFor(contactAddress));
            }
        }

        private void onNavigating(object sender, WebNavigatingEventArgs e)
        {
            string current_url = HttpUtility.UrlDecode(e.Url);

            if (onNavigatingGlobal(current_url))
            {
                e.Cancel = true;
                return;
            }

            if (current_url.Equals("ixian:onload", StringComparison.Ordinal))
            {
                onLoad();
            }
            else if (current_url.StartsWith("ixian:cdoverlay:", StringComparison.Ordinal))
            {
                // N50 (#370): the shell mirrors its overlay-stack state (sheets, the
                // remove-blocked modal) so hardware back can be routed INTO the shell
                // — the homeoverlay grammar (#336). Display-state only, no payload.
                shellOverlayOpen = current_url.EndsWith(":1", StringComparison.Ordinal);
            }
            else if (current_url.Equals("ixian:back", StringComparison.Ordinal))
            {
                popPageAsync();
            }
            else if (current_url.Equals("ixian:remove", StringComparison.Ordinal))
            {
                if (onRemove())
                {
                    popToRootAsync();
                    var homePage = HomePage.Instance();
                    homePage?.removeDetailContent();
                    // iOS-28: onRemove() sets UIHelpers.shouldRefreshContacts, but that is
                    // only consumed by the 2s updateUILoop tick (Node.cs:388 →
                    // HomePage.updateScreen:2128) — so the deleted contact's chat row stayed
                    // on screen for up to two seconds after the user popped back, reading as
                    // "the delete did nothing". Flush NOW, exactly like onRemoveHistory
                    // re-renders the live chat instead of trusting the tick (iOS-24, #283).
                    // updateScreen() self-guards on the flag, so this is idempotent.
                    homePage?.updateScreen();
                }
            }
            else if (current_url.Equals("ixian:removehistory", StringComparison.Ordinal))
            {
                onRemoveHistory();
            }
            else if (current_url.Equals("ixian:request", StringComparison.Ordinal))
            {
                hostNav.PushAsync(new WalletReceivePage(friend), Config.defaultXamarinAnimations);   // #225: root nav
            }
            else if (current_url.Equals("ixian:send", StringComparison.Ordinal))
            {
                hostNav.PushAsync(new WalletSendPage(new ExtendedAddress(friend.walletAddress, AddressPaymentFlag.OfflineTag, null)), Config.defaultXamarinAnimations);   // #225: root nav
            }
            else if (current_url.Equals("ixian:chat", StringComparison.Ordinal))
            {
                if (customChatBtn)
                {
                    popPageAsync();
                    e.Cancel = true;
                    return;
                }
                else
                {
                    // #225: close this details overlay, then open the conversation via
                    // the host's onChat (tagged chat overlay, wide/narrow aware).
                    popPageAsync();
                    HomePage.Instance()?.onChat(friend.walletAddress, null);
                }
            }
            else if (current_url.StartsWith("ixian:leave"))
            {
                // #248 group surface: leave — mirrors SingleChatPage's ixian:leave
                // (group → sendLeave + removeFriend · bot → pendingDeletion + sendLeave).
                if (friend.bot || friend.type == FriendType.Group)
                {
                    if (!friend.bot)
                    {
                        CoreStreamProcessor.sendLeave(friend, null);
                        FriendList.removeFriend(friend);
                    }
                    else
                    {
                        friend.pendingDeletion = true;
                        friend.save();
                        CoreStreamProcessor.sendLeave(friend, null);
                    }
                    UIHelpers.shouldRefreshContacts = true;
                    displaySpixiAlert(SpixiLocalization._SL("contact-details-removedcontact-title"), SpixiLocalization._SL("contact-details-removedcontact-text"), SpixiLocalization._SL("global-dialog-ok"));
                    popToRootAsync();
                    HomePage.Instance()?.removeDetailContent();
                }
            }
            else if (current_url.StartsWith("ixian:enableNotifications"))
            {
                // #248: mirrors SingleChatPage — persist + bot action. Loop fix A-2:
                // onLoad tolerates a null botInfo (defaults the toggle ON), so the
                // forward must too — never NPE inside the navigating callback.
                if (friend.metaData.botInfo != null)
                {
                    friend.metaData.botInfo.sendNotification = true;
                    friend.saveMetaData();
                    StreamProcessor.sendBotAction(friend, SpixiBotActionCode.enableNotifications, new byte[1] { 1 }, 0, true);
                }
            }
            else if (current_url.StartsWith("ixian:disableNotifications"))
            {
                if (friend.metaData.botInfo != null)
                {
                    friend.metaData.botInfo.sendNotification = false;
                    friend.saveMetaData();
                    StreamProcessor.sendBotAction(friend, SpixiBotActionCode.enableNotifications, new byte[1] { 0 }, 0, true);
                }
            }
            else if (current_url.StartsWith("ixian:sendContactRequest:"))
            {
                // N26 (#366): the group-info member sheet's Add-contact — the SAME
                // guarded path SingleChatPage uses (SpixiContentPage helper: self
                // guard · pendingDeletion heal · exists alert · requestAddSent marker).
                sendContactRequestGuarded(current_url.Substring("ixian:sendContactRequest:".Length));
            }
            else if (current_url.StartsWith("ixian:kick:"))
            {
                // #248: admin kick/ban — mirrors SingleChatPage.onKickUser/onBanUser.
                // Loop fix A-4: the payload rides the WebView URL — parse defensively
                // (a malformed/masked address must never throw in onNavigating).
                string str_address = current_url.Substring("ixian:kick:".Length);
                try
                {
                    StreamProcessor.sendBotAction(friend, SpixiBotActionCode.kickUser, new Address(str_address).addressWithChecksum, 0, true);
                    displaySpixiAlert(String.Format(SpixiLocalization._SL("chat-modal-kicked-title"), str_address), String.Format(SpixiLocalization._SL("chat-modal-kicked-body"), str_address), SpixiLocalization._SL("global-dialog-ok"));
                }
                catch (Exception ex)
                {
                    Logging.warn("kick: invalid address payload: " + ex.Message);
                }
            }
            else if (current_url.StartsWith("ixian:ban:"))
            {
                string str_address = current_url.Substring("ixian:ban:".Length);
                try
                {
                    StreamProcessor.sendBotAction(friend, SpixiBotActionCode.banUser, new Address(str_address).addressWithChecksum, 0, true);
                    displaySpixiAlert(String.Format(SpixiLocalization._SL("chat-modal-banned-title"), str_address), String.Format(SpixiLocalization._SL("chat-modal-banned-body"), str_address), SpixiLocalization._SL("global-dialog-ok"));
                }
                catch (Exception ex)
                {
                    Logging.warn("ban: invalid address payload: " + ex.Message);
                }
            }
            else if (current_url.Contains("ixian:txdetails:"))
            {
                string[] split = current_url.Split(new string[] { "ixian:txdetails:" }, StringSplitOptions.None);
                byte[] id = Transaction.txIdLegacyToV8(split[1]);

                var activity = Node.activityStorage.getActivityById(id, null, true);
                if (activity == null)
                {
                    e.Cancel = true;
                    return;
                }

                hostNav.PushAsync(new WalletSentPage(activity.transaction), Config.defaultXamarinAnimations);   // #225: root nav
            }else if(current_url.Contains("ixian:userdefinednick:"))
            {
                string[] split = current_url.Split(new string[] { "ixian:userdefinednick:" }, StringSplitOptions.None);
                string nick = split[1];
                friend.setUserDefinedNick(nick);
            }
            else
            {
                // Otherwise it's just normal navigation
                e.Cancel = false;
                return;
            }
            e.Cancel = true;

        }

        private bool onRemove()
        {
            if (friend.bot && friend.metaData.botInfo != null)
            {
                friend.pendingDeletion = true;
                friend.save();
                UIHelpers.shouldRefreshContacts = true;
                CoreStreamProcessor.sendLeave(friend, null);
                displaySpixiAlert(SpixiLocalization._SL("contact-details-removedcontact-title"), SpixiLocalization._SL("contact-details-removedcontact-text"), SpixiLocalization._SL("global-dialog-ok"));
                return true;
            }
            else
            {
                if (FriendList.removeFriend(friend) == true)
                {
                    UIHelpers.shouldRefreshContacts = true;
                    displaySpixiAlert(SpixiLocalization._SL("contact-details-removedcontact-title"), SpixiLocalization._SL("contact-details-removedcontact-text"), SpixiLocalization._SL("global-dialog-ok"));
                    return true;
                }
                else
                {
                    // N27 (#367): removeFriend refuses when the contact is in a group
                    // (Core isFriendInGroup — computed and DISCARDED there). Re-run the
                    // same predicate with the result KEPT and NAME the blocking groups
                    // in the shell (removeBlocked push, name/address pairs — each arg
                    // transport-escaped; the shell renders via textContent). The legacy
                    // alert stays as the fallback for the empty-enumeration edge (a
                    // refusal this enumeration cannot explain must still say something).
                    List<string> blockers = new List<string>();
                    try
                    {
                        // Loop n4: snapshot the reference ONCE — sortFriends() reassigns
                        // the field without a lock, so lock+iterate must use one object.
                        var friendsRef = FriendList.friends;
                        lock (friendsRef)   // Core locks this same object in isFriendInGroup
                        {
                            foreach (Friend f in friendsRef)
                            {
                                if (f.type == FriendType.Group && f.users != null && f.users.hasUser(friend.walletAddress))
                                {
                                    blockers.Add(f.nickname ?? "");
                                    blockers.Add(f.walletAddress.ToString());
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Logging.warn("removeBlocked enumeration: " + ex.Message);
                        blockers.Clear();
                    }
                    if (blockers.Count > 0)
                    {
                        Utils.sendUiCommand(this, "removeBlocked", blockers.ToArray());
                    }
                    else
                    {
                        displaySpixiAlert(SpixiLocalization._SL("contact-details-cannotremovecontact-title"), SpixiLocalization._SL("contact-details-cannotremovecontact-text"), SpixiLocalization._SL("global-dialog-ok"));
                    }
                }
            }
            return false;
        }

        private void onRemoveHistory()
        {
            // Remove history file
            if(friend.deleteHistory())
            {
                UIHelpers.shouldRefreshContacts = true;
                // iOS-24 (#283): the OPEN conversation kept rendering the wiped history —
                // deleteHistory() clears storage + the in-memory list but the chat WebView's
                // DOM was never told, so the messages only disappeared on the next chat
                // entry (loadMessages). Re-render the live chat page now: clearMessages +
                // the (empty) reload paints the emptied conversation immediately.
                var chat_page = Utils.getChatPage(friend);
                if (chat_page != null)
                {
                    chat_page.loadMessages();
                }
                displaySpixiAlert(SpixiLocalization._SL("contact-details-deletedhistory-title"), SpixiLocalization._SL("contact-details-deletedhistory-text"), SpixiLocalization._SL("global-dialog-ok"));
            }
        }

        public void loadTransactions()
        {
            Utils.sendUiCommand(this, "clearRecentActivity");
            foreach (var activity in Node.activityStorage.getActivitiesByAddress(friend.walletAddress, null, null, 0, true))
            {
                Transaction transaction = Node.activityStorage.getActivityById(activity.id, null, true).transaction;
                
                string tx_type = SpixiLocalization._SL("global-received");
                if (activity.type == IXICore.Activity.ActivityType.TransactionSent
                    || activity.type == IXICore.Activity.ActivityType.IxiName)
                {
                    tx_type = SpixiLocalization._SL("global-sent");
                }
                // iOS-55/#328 (W1 class): raw epoch seconds — the shell numeric-detects
                // and formats via formatTxTimestamp/docLocale (translated month names);
                // the old unixTimeStampToString was a hard-coded US "MM/dd/yyyy HH:mm:ss".
                string time = activity.timestamp.ToString();

                string confirmed = "true";
                if (activity.status != IXICore.Activity.ActivityStatus.Final)
                {
                    confirmed = "error";
                }

                Utils.sendUiCommand(this, "addPaymentActivity", transaction.getTxIdString(), tx_type, time, transaction.amount.ToString(), confirmed);
            }
        }

        // Executed every second
        public override void updateScreen()
        {
            Utils.sendUiCommand(this, "setNickname", friend.nickname);

            string avatar = IxianHandler.localStorage.getAvatarPath(friend.walletAddress.ToString(), false);
            if (avatar == null)
            {
                avatar = "";
            }
            avatar = Utils.imageToDataUri(avatar);   // X1

            Utils.sendUiCommand(this, "setAvatar", avatar);

            // #248 group surface: no presence line, no 1:1 payment activity — the
            // per-second tick only refreshes the group name/photo.
            if (isGroup)
            {
                return;
            }

            if (friend.online)
            {
                Utils.sendUiCommand(this, "showIndicator", "true");
            }
            else
            {
                Utils.sendUiCommand(this, "showIndicator", "false");
            }

            loadTransactions();
        }

        protected override bool OnBackButtonPressed()
        {
            // N50 (#370, #369 F5): a shell overlay (remove-blocked modal, member
            // sheet) consumes back before the page pops — the same order every
            // native surface keeps. The shell self-heals a stale flag (cdBack
            // re-syncs when nothing was open), so back can never wedge.
            if (shellOverlayOpen)
            {
                Utils.sendUiCommand(this, "cdBack");
                return true;
            }
            popPageAsync();

            return true;
        }
    }
}