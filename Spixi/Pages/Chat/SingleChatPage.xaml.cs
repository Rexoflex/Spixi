using IXICore;
using IXICore.Meta;
using IXICore.Network;
using IXICore.SpixiBot;
using Spixi;
using SPIXI.Interfaces;
using SPIXI.Lang;
using SPIXI.Meta;
using SPIXI.MiniApps;
using SPIXI.VoIP;
using System;
using System.Collections.Concurrent;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using IXICore.Streaming;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using System.Net;
using Microsoft.Maui.Storage;
using Microsoft.Maui.ApplicationModel;
using System.Text;
using System.Web;

namespace SPIXI
{
    [XamlCompilation(XamlCompilationOptions.Compile)]
    public partial class SingleChatPage : SpixiContentPage
    {
        public Friend friend;

        private uint messagesToShow = Config.messagesToLoad;

        private int selectedChannel = 0;

        // N51: the shell's overlay-stack state (ixian:chatoverlay mirror) — an
        // overlay.js sheet, the hand-rolled channel selector or select mode is
        // open in the chat WebView. Volatile like ContactDetails.shellOverlayOpen
        // (N50 #370): nav thread writes, back path reads.
        public volatile bool shellOverlayOpen = false;

        private bool _waitingForContactConfirmation = false;

        private HomePage? homePage;

        private bool warningDisplayed = false;
        private int connectivityWarningDelayCounter = 0;
        private bool unreadIndicatorDisplayed = false;
        private string setNickname = "";
        private bool setOnlineStatus = false;
        private string lastGroupCountPushed = null;   // N22: group member-count sub, pushed on change only

        public SingleChatPage(Friend fr) : this(fr, null)
        {
        }

        public SingleChatPage(Friend fr, HomePage? home)
        {
            InitializeComponent();
            NavigationPage.SetHasNavigationBar(this, false);
            webView.Opacity = 0;
            // Theme-aware surface (N1): the old getBackgroundColor() here was the LEGACY
            // launch-blue — #223766 even in LIGHT mode — which was exactly the reported
            // "dark flash in light mode" behind the opacity-0 WebView. The themed surface
            // is now applied for every page by loadPage() (base class).

            // Load-then-move: the conversation reveals its WebView only after messages
            // are loaded + painted (FadeTo in onLoad's finally) — present the preloaded
            // page at THAT point, not at ixian:onload (signalPreloadReady() below).
            deferPreloadReady = true;

            friend = fr;
            Title = friend.nickname;
            selectedChannel = friend.metaData.lastMessageChannel;

            loadPage(webView, "chat.html");

            homePage = home;

            StreamProcessor.fetchFriendsPresence(friend, true);
        }

        public override void recalculateLayout()
        {
            ForceLayout();
        }

        protected override void OnAppearing()
        {
            base.OnAppearing();
            if (presentedFromPreload)
            {
                // First appearance after a load-then-move present: the staged load
                // already ran loadApps/loadMessages — re-rendering now would flash
                // the just-painted log. Subsequent appearances (returning from a
                // pushed page) reload as before.
                presentedFromPreload = false;
                return;
            }
            reloadScreen();
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

            if (current_url.Equals("ixian:onload", StringComparison.Ordinal))
            {
                onLoad();
            }
            else if (current_url.Equals("ixian:back", StringComparison.Ordinal))
            {
                // #225: no stack-count guard — an overlay conversation has an empty
                // Navigation proxy; popToRootAsync itself handles both modes (closes
                // all overlays, or pops the native stack) and no-ops at the root.
                {
                    try
                    {
                        popToRootAsync();
                    }
                    catch (Exception ex)
                    {
                        Logging.error($"Error during navigation: {ex.Message}");
                        return;
                    }
                }

            }
            else if (current_url.StartsWith("ixian:chatoverlay:", StringComparison.Ordinal))
            {
                // N51 (the N50/#370 grammar applied to chat): the shell mirrors its
                // overlay-stack state (sheets/menus, the hand-rolled channel selector,
                // select mode) so hardware back can be routed INTO the shell instead
                // of popping the conversation. Display-state only, no payload.
                shellOverlayOpen = current_url.EndsWith(":1", StringComparison.Ordinal);
            }
            else if (current_url.Equals("ixian:request", StringComparison.Ordinal))
            {
                onRequestIxi();
            }
            else if (current_url.Equals("ixian:details", StringComparison.Ordinal))
            {
                onContactDetails();
            }
            else if (current_url.Equals("ixian:send", StringComparison.Ordinal))
            {
                onSendIxi();
            }
            else if (current_url.Equals("ixian:accept", StringComparison.Ordinal))
            {
                onAcceptFriendRequest();
            }
            else if (current_url.Equals("ixian:loadmore", StringComparison.Ordinal))
            {
                onLoadMore();
            }
            else if (current_url.Equals("ixian:call", StringComparison.Ordinal))
            {
                if (VoIPManager.isInitiated())
                {
                    VoIPManager.hangupCall(null);
                }
                else
                {
                    VoIPManager.initiateCall(friend);
                }

            }
            else if (current_url.Equals("ixian:sendmedia", StringComparison.Ordinal))
            {
#pragma warning disable CS4014 // Because this call is not awaited, execution of the current method continues before the call is completed
                onSendFile(true);
#pragma warning restore CS4014 // Because this call is not awaited, execution of the current method continues before the call is completed
            }
            else if (current_url.Equals("ixian:sendfile", StringComparison.Ordinal))
            {
#pragma warning disable CS4014 // Because this call is not awaited, execution of the current method continues before the call is completed
                onSendFile(false);
#pragma warning restore CS4014 // Because this call is not awaited, execution of the current method continues before the call is completed
            }
            else if (current_url.StartsWith("ixian:acceptfile:"))
            {
                string id = current_url.Substring("ixian:acceptfile:".Length);

                FriendMessage fm = friend.getMessages(selectedChannel).Find(x => x.transferId == id);
                if (fm != null)
                {
                    onAcceptFile(selectedChannel, fm);
                }
                else
                {
                    Logging.error("Cannot find message with transfer id: {0}", id);
                }

            }
            else if (current_url.StartsWith("ixian:openfile:"))
            {
                string id = current_url.Substring("ixian:openfile:".Length);

                FriendMessage fm = friend.getMessages(selectedChannel).Find(x => x.transferId == id);

                if (File.Exists(fm.filePath))
                {
                    SFileOperations.open(fm.filePath);
                }
                else
                {
                    // Handle special case for iOS
                    string filename = Path.GetFileName(fm.filePath);
                    string path = Path.Combine(TransferManager.downloadsPath, filename);
                    if (File.Exists(path))
                    {
                        SFileOperations.open(path);
                    }
                }
            }
            else if (current_url.StartsWith("ixian:chatreply:", StringComparison.Ordinal))
            {
                // M1 reply-to. Grammar: ixian:chatreply:<reply-id-hex>:<url-encoded text>.
                // ★ No prefix collision with "ixian:chat:" — the character after "chat"
                // is 'r', not ':'. The shell only ever emits this behind the `reply`
                // capability, which is OFF until a 2-device test passes.
                string payload = current_url.Substring("ixian:chatreply:".Length);
                int sep = payload.IndexOf(':');
                if (sep > 0)
                {
                    onSend(payload.Substring(sep + 1), payload.Substring(0, sep));
                }
                else
                {
                    // Malformed → treat it as a plain message rather than dropping it.
                    // Audit NIT-12: an EMPTY id ("ixian:chatreply::text") gives sep == 0,
                    // so the separator must still be removed or the body keeps a leading ':'.
                    onSend(sep == 0 ? payload.Substring(1) : payload);
                }
            }
            else if (current_url.StartsWith("ixian:chat:"))
            {
                string msg = current_url.Substring("ixian:chat:".Length);
                onSend(msg);
            }
            else if (current_url.StartsWith("ixian:viewPayment:"))
            {
                string tx_id = current_url.Substring("ixian:viewPayment:".Length);
                onViewPayment(tx_id);
            }
            else if (current_url.StartsWith("ixian:app:"))
            {
                string app_id = current_url.Substring("ixian:app:".Length);
                onApp(app_id);
            }
            else if (current_url.StartsWith("ixian:installApp:"))
            {
                string app_url = current_url.Substring("ixian:installApp:".Length);
                onInstallApp(app_url);
            }
            else if (current_url.StartsWith("ixian:joinApp:"))
            {
                string app_id = current_url.Substring("ixian:joinApp:".Length);
                onJoinApp(app_id);
            }
            else if (current_url.StartsWith("ixian:loadContacts"))
            {
                loadContacts();
            }
            else if (current_url.StartsWith("ixian:populateChannelSelector"))
            {
                populateChannelSelector();
            }
            else if (current_url.StartsWith("ixian:selectChannel:"))
            {
                int sel_channel = Int32.Parse(current_url.Substring("ixian:selectChannel:".Length));
                BotChannel channel = friend.channels.getChannel(sel_channel);
                if (channel != null)
                {
                    Utils.sendUiCommand(this, "setSelectedChannel", channel.index.ToString(), "fa-globe-africa", channel.channelName);
                    selectedChannel = sel_channel;
                    loadMessages();
                    /* W1 (#348, Damir F5: "worst in the Spixi bot group"). The shell holds
                     * the log back during a load BURST and paints on whichever comes first:
                     * this push, or a 250 ms fallback timer that every insert re-arms
                     * (chat.html:2443-2462). `onChatScreenLoaded` was pushed from exactly
                     * ONE place — onLoad (:733) — so a bot channel switch never sent it and
                     * ALWAYS paid the full fallback, every single time.
                     * This is the whole 250 ms, not a guess: on the normal open the push
                     * lands on the dispatch queue right behind the last message, so the
                     * timer never expires there. Measure-first (#294) is satisfied because
                     * nothing is being optimised — a missing signal is being sent.
                     * The other two silent callers (onLoadMore :415, reloadScreen :1959)
                     * are deliberately NOT touched: load-more PREPENDS into a live log and
                     * reloadScreen re-enters on OnAppearing, so `endLoadPhase()` there needs
                     * its own reasoning and its own F5. 🟡 Candidates, not this batch. */
                    Utils.sendUiCommand(this, "onChatScreenLoaded");
                }
            }
            else if (current_url.StartsWith("ixian:contextAction:"))
            {
                string action = current_url.Substring("ixian:contextAction:".Length);
                action = action.Substring(0, action.IndexOf(':'));

                string msg_id = current_url.Substring("ixian:contextAction:".Length + action.Length + 1);
                onContextAction(action, msg_id);
            }
            /* ⚠ AUDIT MINOR: the THIRD mute entry point, brought in line with the other two.
             * It dereferenced `friend.metaData.botInfo.sendNotification` with NO null check and
             * NO 1:1 branch — so reaching it for a 1:1, or for a group/bot whose BotInfo has
             * not arrived, threw an NRE inside onNavigating, which is destructive. Same shape
             * as ContactDetails now: synced botInfo for groups and bots, local preference for a
             * 1:1, and the chat list told either way. */
            else if (current_url.StartsWith("ixian:enableNotifications"))
            {
                setChatNotifications(true);
            }
            else if (current_url.StartsWith("ixian:disableNotifications"))
            {
                setChatNotifications(false);
            }
            else if (current_url.StartsWith("ixian:sendContactRequest:"))
            {
                // N26 (#366): body moved VERBATIM to SpixiContentPage.sendContactRequestGuarded
                // (#334 AND-17 guards intact) — ContactDetails' member sheet shares it now.
                // The helper also hardened the address parse (try/catch, A-4 rule).
                sendContactRequestGuarded(current_url.Substring("ixian:sendContactRequest:".Length));
            }
            else if (current_url.StartsWith("ixian:kick:"))
            {
                string str_address = current_url.Substring("ixian:kick:".Length);
                Address address = new Address(str_address);
                onKickUser(address);
            }
            else if (current_url.StartsWith("ixian:ban:"))
            {
                string str_address = current_url.Substring("ixian:ban:".Length);
                Address address = new Address(current_url.Substring("ixian:ban:".Length));
                onBanUser(address);
            }
            else if (current_url.StartsWith("ixian:typing"))
            {
                StreamProcessor.sendTyping(friend);
            }
            else if(current_url.StartsWith("ixian:leave"))
            {
                if(friend.bot
                   || friend.type == FriendType.Group)
                {
                    if (!friend.bot)
                    {
                        StreamProcessor.sendLeave(friend, null);
                        FriendList.removeFriend(friend);
                    }
                    else
                    {
                        friend.pendingDeletion = true;
                        friend.save();
                        StreamProcessor.sendLeave(friend, null);
                    }
                    UIHelpers.shouldRefreshContacts = true;
                    displaySpixiAlert(SpixiLocalization._SL("contact-details-removedcontact-title"), SpixiLocalization._SL("contact-details-removedcontact-text"), SpixiLocalization._SL("global-dialog-ok"));
                    popPageAsync();
                    homePage?.removeDetailContent();
                }
            }
            else if (current_url.StartsWith("ixian:openLink:", StringComparison.Ordinal))
            {
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
                }catch(Exception ex)
                {
                    Logging.error("Exception occured while trying to open URL '{0}': {1}",  link, ex);
                }
            }
            else if (current_url.StartsWith("ixian:undorequest"))
            {
                // Remove friend from list and go back to the main screen
                FriendList.removeFriend(friend);

                UIHelpers.shouldRefreshContacts = true;
                popPageAsync();
                homePage?.removeDetailContent();

                // TODO: send a notification to the other party
            }
            else if (current_url.Trim().StartsWith("file:", StringComparison.OrdinalIgnoreCase))
            {
                // allow normal navigation only for local files
                e.Cancel = false;
                return;
            }
            e.Cancel = true;
        }

        private void onLoadMore()
        {
            messagesToShow += Config.messagesToLoad;
            // D-18 (#354): Ixian-Core Friend.getMessages(channel, msg_count) reads
            // storage only when the channel is uncached or msg_count != 100
            // (Friend.cs:910; 0.9.8k = commit 097341a — no git tag exists).
            // A request of exactly 100 returns the stale cache from the PREVIOUS
            // window; loadMessages() then counts it short and hides the load-more
            // pill with more history still on disk. Step over the poisoned value.
            // N52 re-walk (messagesToLoad 25 → 50): the sequence is 50 → 100 → 150…,
            // so the FIRST press lands exactly on 100 — the guard fires once and
            // the walk continues 50 → 150 → 200…. Keep this guard until Core
            // replaces the magic-number cache test (BE question 9).
            if (messagesToShow == 100)
            {
                messagesToShow += Config.messagesToLoad;
            }
            loadMessages();
        }

        private void onContactDetails()
        {
            if (homePage != null)
            {
                homePage.onContactDetails(friend);
                return;
            }

            // #248: chat-header entry → context 'chat' ("Chat info"/"Group info").
            pushPageLoaded(new ContactDetails(friend, true, null, true));   // load-then-move (N3)
        }

        private void onSendIxi()
        {
            if (friend.bot
                || friend.type == FriendType.Group)
            {
                Logging.error("Send IXI is not supported in this chat.");
                return;
            }
            if (homePage != null)
            {
                homePage.onSendIxi(friend.walletAddress);
                return;
            }

            hostNav.PushAsync(new WalletSendPage(new ExtendedAddress(friend.walletAddress, AddressPaymentFlag.OfflineTag, null)), Config.defaultXamarinAnimations);   // #225: root nav (this page may be an overlay)
        }

        private void onRequestIxi()
        {
            if (friend.bot
                || friend.type == FriendType.Group)
            {
                Logging.error("Request IXI is not supported in this chat.");
                return;
            }
            if (homePage != null)
            {
                homePage.onReceiveIxi(friend);
                return;
            }

            hostNav.PushAsync(new WalletReceivePage(friend), Config.defaultXamarinAnimations);   // #225: root nav
        }

        private void populateChannelSelector()
        {
            var channels = friend.channels.channels;
            lock(channels)
            {
                foreach(var channel in channels.Values)
                {
                    string icon = "fa-globe-africa";
                    bool unread = false;
                    var messages = friend.getMessages(channel.index);
                    if (messages != null && messages.Count() > 0 && !messages.Last().localSender && !messages.Last().read)
                    {
                        unread = true;
                    }
                    Utils.sendUiCommand(this, "addChannelToSelector", channel.index.ToString(), channel.channelName, icon, unread.ToString());
                }
            }
        }

        private void setChannelSelectorUnread()
        {
            if(!friend.bot)
            {
                return;
            }

            var channels = friend.channels.channels;
            lock (channels)
            {
                foreach (var channel in channels.Values)
                {
                    bool unread = false;
                    var messages = friend.getMessages(channel.index);
                    if (messages != null && messages.Count() > 0 && !messages.Last().localSender && !messages.Last().read)
                    {
                        unread = true;
                    }
                    if(unread)
                    {
                        Utils.sendUiCommand(this, "setChannelSelectorStatus", "");
                    }
                }
            }
        }

        private void loadContacts()
        {
            // #249: the LOCAL user is a participant too — resolve self from localStorage
            // (no participant nick / stored contact avatar for one's own address).
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
                int role = contact.Value.getPrimaryRole();
                string nick = resolveNick(contact.Value.getNick(), contactAddress);
                if (string.IsNullOrEmpty(nick) && isSelf)
                {
                    nick = IxianHandler.localStorage.nickname;
                }
                if (friend.type == FriendType.Group
                    && friend.metaData.botInfo.hideParticipantAddresses)
                {
                    if (string.IsNullOrEmpty(nick))
                    {
                        nick = "x" + contactAddress.ToString();
                    }
                    address = "[Unknown]";
                }
                // D-5 (#366): trailing relation. Loop m2: gate on the BROAD blind
                // predicate (botInfo.hideParticipantAddresses), NOT the '[Unknown]'
                // mask — the mask fires for blind GROUPS only, and a blind BOT's
                // roster rows would otherwise carry an is-in-your-contacts hint
                // (the #348 MAJOR-5 masking gap, must not widen under the gate).
                bool relBlind = friend.metaData.botInfo != null && friend.metaData.botInfo.hideParticipantAddresses;
                string relation = relBlind ? "" : contactRelationFor(contactAddress);
                Utils.sendUiCommand(this, "addContact",  address, nick, avatar, role.ToString(), relation);
            }
        }

        private void onNavigated(object sender, WebNavigatedEventArgs e)
        {
            // Deprecated due to WPF, use onLoad
        }

        private void onLoad()
        {
            // N51 (N50 loop A-3/B-4 lesson): a shell reload (reloadAllPages on a theme
            // or language flip) builds a fresh document with no overlay open, and the
            // mirror only reports CHANGES — reset here or a stale true swallows back.
            shellOverlayOpen = false;

            Utils.sendUiCommand(this, "onChatScreenReady", friend.walletAddress.ToString());

            // X1 follow-up: push the peer's (or group's) avatar so the chat TOPBAR shows it
            // even before any message arrives (a newly-accepted contact) and for groups — the
            // shell otherwise scavenges the header avatar from the first 1:1 message only.
            // Converted to a data-URI like every other avatar push; a sentinel → gradient FE-side.
            string? chat_avatar = IxianHandler.localStorage.getAvatarPath(friend.walletAddress.ToString());
            if (chat_avatar == null)
            {
                chat_avatar = friend.type == FriendType.Group ? "img/spixi-group-avatar.png" : "img/spixiavatar.png";
            }
            Utils.sendUiCommand(this, "setAvatar", Utils.imageToDataUri(chat_avatar));

            // C13: push the LOCAL user's nick so the shell can identify "me" (self-mention
            // emphasis + the @ jump-to-mention FAB). The redesigned shells build window.SL from
            // their bundled dictionary, NOT from addCustomString, so this must be a bridge push.
            Utils.sendUiCommand(this, "setSelfNick", IxianHandler.localStorage.nickname);

            // #248 (Damir item 3): group/bot OWNER address → the shell marks the owner
            // in member lists ("Owner" chip). NEVER for a blind group — the owner
            // address would de-anonymize an identity the mode hides.
            if (friend.bot || friend.type == FriendType.Group)
            {
                bool blindGroup = friend.metaData.botInfo != null && friend.metaData.botInfo.hideParticipantAddresses;
                if (!blindGroup)
                {
                    try
                    {
                        var groupOwner = friend.users.getOwner();
                        if (groupOwner != null)
                        {
                            Utils.sendUiCommand(this, "setGroupOwner", groupOwner.ToString());
                        }
                    }
                    catch (Exception ex)
                    {
                        Logging.warn("setGroupOwner: " + ex.Message);
                    }
                }
            }

            if (homePage != null)
            {
                Utils.sendUiCommand(this, "hideBackButton");
            }

            int chat_type = 0;
            if (friend.bot)
            {
                chat_type = 3;
            }
            else if (friend.type == FriendType.Group)
            {
                if (friend.metaData.botInfo.hideParticipantAddresses)
                {
                    chat_type = 2;
                } else
                {
                    chat_type = 1;
                }
            }

            if (chat_type > 0)
            {
                int sleep_cnt = 0;
                while (friend.metaData.botInfo == null || !friend.channels.hasChannel(friend.metaData.botInfo.defaultChannel))
                {
                    if (sleep_cnt >= 50)
                    {
                        popPageAsync();
                        // Show the alert on the page the user is actually LOOKING at: under
                        // load-then-move this page may never have been presented (staged
                        // off-screen and just cancelled by popPageAsync above), and an
                        // alert on an unattached page is silently lost (audit M1).
                        MainThread.BeginInvokeOnMainThread(() =>
                        {
                            try
                            {
                                Microsoft.Maui.Controls.Application.Current?.MainPage?.DisplayAlert(SpixiLocalization._SL("chat-bot-not-ready-title"), SpixiLocalization._SL("chat-bot-not-ready-body"), SpixiLocalization._SL("global-dialog-ok"));
                            }
                            catch (Exception ex)
                            {
                                Logging.warn("Exception showing bot-not-ready alert: " + ex);
                            }
                        });
                        return;
                    }
                    Thread.Sleep(100);
                    sleep_cnt++;
                }

                // ★ I-6 r2 (#360, loop r1 MINOR-8): the bot cost bar was the one C#-composed
                // amount left on raw IxiNumber.ToString() — a 0.005 IXI room rendered
                // "0.00500000 IXI" directly above the alerts #360 fixed.
                string cost_text = String.Format(SpixiLocalization._SL("chat-message-cost-bar"), Utils.amountToLocalizedDisplayString(friend.metaData.botInfo.cost) + " IXI");
                bool send_notification = friend.metaData.botInfo.sendNotification;

                // W8 (#348): 7th arg = blindness, ADDITIVE (same shape as the
                // getAppInfo extension in #214 — the 1:1 push below stays 4-arg and
                // the shell defaults a missing arg to false).
                // It is needed because chat_type CANNOT express a blind bot: a bot is
                // 3 whether or not it hides addresses (:604-608), so "2" means blind
                // GROUP only. Without this the shell would offer a tip on a blind bot
                // and C# would refuse it — a dead button.
                Utils.sendUiCommand(this, "setChatMode", chat_type.ToString(), friend.metaData.botInfo.cost.ToString(), cost_text, friend.metaData.botInfo.admin.ToString(), friend.metaData.botInfo.serverDescription, send_notification.ToString(), friend.metaData.botInfo.hideParticipantAddresses.ToString());
                setChannelSelectorUnread();

                selectedChannel = 0; // TODO: remove this after groupchat UI improvements

                if (selectedChannel == 0 && friend.channels.channels.Count > 0)
                {
                    selectedChannel = friend.metaData.botInfo.defaultChannel;
                }
                if (selectedChannel != 0)
                {
                    BotChannel channel = friend.channels.getChannel(selectedChannel);
                    if (channel != null)
                    {
                        Utils.sendUiCommand(this, "setSelectedChannel", channel.index.ToString(), "fa-globe-africa", channel.channelName);
                    }
                }
                else
                {
                    selectedChannel = 0;
                }
            } else
            {
                Utils.sendUiCommand(this, "setChatMode", "0", "0.00000000", "", "False");
            }
            // ★ audit: declare that THIS build answers a tip with setTipResult. A new shell
            // on an old exe would otherwise wait 12 s after a SUCCESSFUL tip and then say it
            // may have failed; without the cap it keeps the old immediate-confirm behaviour.
            Utils.sendUiCommand(this, "setCaps", "tipResult");
            /* ★ M1 REPLY-TO (#441/#448) — THE SHELL IS BUILT, THE CARRIER IS NOT.
             * The whole FE surface (quote bubble, composer strip, menu action, jump,
             * group @-mention prefill) is in place and the `ixian:chatreply:` verb is
             * wired — but the protocol field lives in Ixian-Core, which is HELD OUT of
             * this batch for the BE cutover. Until that lands, a reply degrades to a
             * plain message.
             * ⚠ So do NOT add ",reply" here yet: it would render a Reply action that
             * silently drops the quote. The order is (1) land the Core patch in
             * docs/be-cutover-ixian-core-reply-carrier.md, (2) restore the two seams
             * marked "THE SEAM" in this file, (3) add ",reply", (4) run the 2-device
             * checklist, and only then ship it un-gated. */

            warningDisplayed = false;
            unreadIndicatorDisplayed = false;
            setNickname = "";
            setOnlineStatus = false;
            lastGroupCountPushed = null;   // N22: a WebView reload resets identity.sub — re-arm the count push
            // #275 re-review R1: reset the pending latch on EVERY load — onLoad re-fires on
            // a WebView reload of a LIVE page (desktop pane re-home #225/#247, WKWebView
            // process reload) and the shell re-arms itself UNLOCKED (onChatScreenReady →
            // setComposerLock(null)); a stale latch would gate the re-push below and leave
            // a pending contact with a live composer. updateScreen() re-pushes + re-latches
            // on this same tick, so the one-shot anti-churn behavior is preserved.
            _waitingForContactConfirmation = false;

            // Execute timer-related functionality immediately
            updateScreen();

            // #275 review A1: groups are FriendType.Group with bot == false — they must
            // never take the outgoing-request lock (the shell strip's Cancel fires
            // ixian:undorequest → removeFriend WITHOUT sendLeave). 1:1 only.
            if (!friend.bot && friend.type != FriendType.Group)
            {
                // #275: lock for ANY non-approved 1:1, not just RequestSent — legacy
                // accounts carry other non-Approved states; the chats list already
                // labels ALL of them "Request sent" (HomePage:1606 keys on
                // state != Approved), so the chat must refuse to compose for the same
                // set (⑪ delivery-lie: a message "sent" here never reaches the peer).
                // RequestReceived stays out: the incoming request pane is its affordance.
                // #275 review A3/A5: updateScreen() (:644 above) already pushed the lock on
                // the pending edge; this stays as a belt, latch-guarded against a double push.
                if (!_waitingForContactConfirmation
                    && friend.state != FriendState.Approved && friend.state != FriendState.RequestReceived)
                {
                    _waitingForContactConfirmation = true;
                    Utils.sendUiCommand(this, "showRequestSentModal", "1");
                }
            }

            // NOTE: the WebView is revealed (FadeTo) only AFTER the conversation is
            // loaded + painted (below, after onChatScreenLoaded) — NOT here. Fading
            // it in before loadMessages showed the empty/boot state first, then the
            // messages popped in (Damir F5: "half a second of full-screen darkness"
            // entering a chat). The Content background is already the themed surface
            // (ctor), so during the brief load the user sees that themed color, then
            // the finished chat fades in in one go — no empty/spinner flash.

            Task.Run(() =>
            {
                try
                {
                    if (SSpixiCodecInfo.getSupportedAudioCodecs().Count > 0 && friend.state == FriendState.Approved)
                    {
                        Utils.sendUiCommand(this, "showCallButton", "");
                    }

                    loadMessages();

                    Utils.sendUiCommand(this, "onChatScreenLoaded");
                }
                finally
                {
                    // ALWAYS reveal the WebView — even if loadMessages / a UI push
                    // threw — so the page is never left permanently invisible with
                    // an unrevealable dead chat (audit M1). The reveal happens after
                    // the conversation is painted so entering a chat goes themed-load
                    // → finished chat, no empty/spinner flash (Damir F5). Marshalled
                    // to the UI thread (we're on a Task.Run threadpool thread).
                    MainThread.BeginInvokeOnMainThread(() =>
                    {
                        try
                        {
                            webView.FadeTo(1, 90);   // Damir F5 2026-07-29: trimmed from 150 — the hold is loadMessages, the fade shouldn't add to it
                            webView.Focus();
                        }
                        catch (Exception ex)
                        {
                            Logging.warn("Exception revealing chat webView: " + ex);
                        }
                        finally
                        {
                            // Load-then-move (deferPreloadReady): the conversation is now
                            // loaded + revealed — if this page was preloaded off-screen,
                            // present it to the user at this exact point. No-op when the
                            // page was pushed normally (no active preload for it).
                            signalPreloadReady();
                        }
                    });
                }

                loadApps();

                if (!Preferences.Default.ContainsKey("rating_action"))
                {
                    Preferences.Default.Set("rating_action", "show");
                }

                int unreadCount = FriendList.getUnreadMessageCount();
                if (unreadCount == 0)
                {
                    SPushService.clearNotifications(unreadCount);
                }

                UIHelpers.refreshAppRequests = true;
                UIHelpers.shouldRefreshContacts = true;

                updateScreen();
            });
        }

        public void onSend(string str, string reply_to_id_hex = "")
        {
            str = str.Trim(new char[] { ' ', '\t', '\r', '\n' });
            if (str.Length < 1)
            {
                return;
            }

            if (friend.bot)
            {
                if (friend.metaData.botInfo.cost > 0)
                {
                    IxiNumber message_cost = friend.getMessagePrice(str.Length);
                    if (message_cost > 0)
                    {
                        Transaction tx = new Transaction((int)Transaction.Type.Normal, message_cost, ConsensusConfig.forceTransactionPrice, friend.walletAddress, IxianHandler.getWalletStorage().getPrimaryAddress(), null, new Address(IxianHandler.getWalletStorage().getPrimaryPublicKey()), IxianHandler.getHighestKnownNetworkBlockHeight());
                        IxiNumber balance = IxianHandler.getWalletBalance(IxianHandler.getWalletStorage().getPrimaryAddress());
                        if (tx.amount + tx.fee > balance)
                        {
                            // ★ I-6 (#360): amounts in composed sentences render in the app language
                            string alert_body = String.Format(SpixiLocalization._SL("wallet-error-balance-text"), Utils.amountToLocalizedDisplayString(tx.amount + tx.fee), Utils.amountToLocalizedDisplayString(balance));
                            displaySpixiAlert(SpixiLocalization._SL("wallet-error-balance-title"), alert_body, SpixiLocalization._SL("global-dialog-ok"));
                            return;
                        }
                    }
                }
            }

            /* ★ M1 REPLY-TO — THE CARRIER IS NOT HERE. Damir, 2026-08-20.
             *
             * The reply reference lives in Ixian-Core (`ChatStreamMessage.ReplyToId` +
             * `FriendMessage.replyToId`), and Core is HELD OUT of this batch to be landed
             * with the BE engineer at cutover — see
             * `docs/be-cutover-ixian-core-reply-carrier.md`, which holds the exact patch.
             *
             * So this send is EXACTLY the pre-batch send: `SpixiMessageCode.chat`, a raw
             * UTF-8 body, through `sendChatMessage`. ⚠ It deliberately does NOT use
             * `sendChatStreamMessage`: stock Core passes a NULL StreamMessage id there
             * (cutover ask 2), so the envelope id and the record id would disagree and
             * every delivery and read tick would be lost.
             *
             * `reply_to_id_hex` is parsed and validated so the SEAM is exercised and the
             * cutover diff is small — but with no field to put it in, a reply degrades to
             * a plain message. Nothing can reach this today: the `reply` capability is
             * declared by no `setCaps` call, so the shell cannot create one. */
            if (!string.IsNullOrEmpty(reply_to_id_hex))
            {
                try
                {
                    byte[] parsed = Crypto.stringToHash(reply_to_id_hex);
                    if (parsed == null || parsed.Length == 0 || parsed.Length > CoreConfig.maxMessageIdSize)
                    {
                        Logging.warn("Reply target id is not usable; sending a plain message.");
                    }
                    else
                    {
                        Logging.warn("Reply target received, but the Ixian-Core carrier is not landed yet; sending a plain message. See docs/be-cutover-ixian-core-reply-carrier.md.");
                    }
                }
                catch (Exception)
                {
                    Logging.warn("Reply target id could not be parsed; sending a plain message.");
                }
            }

            SpixiMessage spixi_message = new SpixiMessage(SpixiMessageCode.chat, Encoding.UTF8.GetBytes(str), selectedChannel);
            byte[] spixi_msg_bytes = spixi_message.getBytes();

            // store the message and display it
            FriendMessage friend_message = Node.addMessageWithType(null, FriendMessageType.standard, friend.walletAddress, selectedChannel, str, true, null, 0, true, true, spixi_msg_bytes.Length);

            // Audit NIT-11: addMessageWithType returns null when the friend is gone or the
            // channel is invalid. Transmitting a message that was never stored or shown
            // would leave the peer with something this device has no record of.
            if (friend_message == null)
            {
                Logging.error("Chat message could not be stored — not sending it.");
                return;
            }

            // Finally, clear the input field
            Utils.sendUiCommand(this, "clearInput");

            CoreStreamProcessor.sendChatMessage(friend, friend_message, selectedChannel);
        }

        public async Task onSendFile(bool media = true)
        {
            if (friend.bot
                || (friend.type == FriendType.Group && friend.metaData.botInfo.hideParticipantAddresses))
            {
                Logging.error("File sending is not supported in this chat.");
                return;
            }
            // Show file picker and send the file
            try
            {
                Stream stream = null;
                string fileName = null;
                string filePath = null;

                SpixiImageData? spixi_img_data;
                if (media)
                {
                    spixi_img_data = await SFilePicker.PickImageAsync();
                }
                else
                {
                    spixi_img_data = await SFilePicker.PickFileAsync();
                }

                if (spixi_img_data == null)
                {
                    return;
                }

                stream = spixi_img_data.stream;

                if (stream == null)
                {
                    return;
                }

                fileName = spixi_img_data.name;
                filePath = spixi_img_data.path;

                Address? sender_address = null;
                FileTransfer transfer = TransferManager.prepareFileTransfer(fileName, stream, filePath);
                transfer.channel = selectedChannel;
                if (friend.bot || friend.type == FriendType.Group)
                {
                    sender_address = IxianHandler.primaryWalletAddress;
                    transfer.groupAddress = friend.walletAddress;
                }
                Logging.info("File Transfer uid: " + transfer.uid);

                string message_data = string.Format("{0}:{1}", transfer.uid, transfer.fileName);

                // store the message and display it
                FriendMessage friend_message = Node.addMessageWithType(null, FriendMessageType.fileHeader, friend.walletAddress, selectedChannel, message_data, true, sender_address);

                SpixiMessage spixi_message = new SpixiMessage(SpixiMessageCode.fileHeader, transfer.getBytes(), selectedChannel);
                StreamProcessor.sendSpixiMessage(friend, spixi_message, null, friend_message.id);

                friend_message.transferId = transfer.uid;
                friend_message.filePath = transfer.filePath;

                IxianHandler.localStorage.requestWriteMessages(friend.walletAddress, selectedChannel);
            }
            catch (Exception ex)
            {
                Logging.error("Exception choosing file: " + ex.ToString());
            }
        }

        public void onAcceptFile(int selected_channel, FriendMessage message)
        {
            if (TransferManager.getIncomingTransfer(message.transferId) != null)
            {
                Logging.warn("Incoming file transfer {0} already prepared.", message.transferId);
                return;
            }

            //displaySpixiAlert("File", uid, "Ok");
            string file_name = System.IO.Path.GetFileName(message.filePath);;

            var senderAddress = friend.walletAddress;
            var senderFriend = friend;
            if (friend.type == FriendType.Group)
            {
                if (friend.metaData.botInfo.hideParticipantAddresses)
                {
                    Logging.error("Cannot accept file transfer in this chat due to hidden participant addresses.");
                    return;
                }
                else
                {
                    senderAddress = message.senderAddress;
                    senderFriend = FriendList.getFriend(senderAddress);
                    if (senderFriend == null)
                    {
                        Logging.error("Cannot find group sender friend for file transfer.");
                        return;
                    }
                }
            }

            var ft = new FileTransfer();
            ft.fileName = file_name;
            ft.fileSize = message.fileSize;
            ft.uid = message.transferId;
            ft.channel = selected_channel;
            ft.incoming = true;
            ft.sender = senderAddress;
            if (message.senderAddress != null)
            {
                ft.groupAddress = friend.walletAddress;
            }
            ft = TransferManager.prepareIncomingFileTransfer(ft);

            if (ft != null)
            {
                TransferManager.acceptFile(senderFriend, ft.uid);
                updateFile(ft.uid, "0", false);
            }
        }

        /* ★ D-10 / I-7 (Damir F5 2026-08-15): THE TIP RESULT CHANNEL.
         * The tip sheet used to morph to a green "Tipped" the instant the verb was
         * emitted, because the shell called ctrl.done() unconditionally — so a failed
         * tip showed SUCCESS with a native error dialog on top of it. On a money
         * surface the UI must not claim a payment happened.
         * The sheet already has a complete inline failure path; it was never told.
         * `setEncPassResult` (#341) is the precedent: an inline flow has no page pop to
         * read as success, so C# has to answer.
         * ★ EVERY exit from the tip case MUST call this exactly once. A missing answer
         * leaves the sheet frozen with money-in-flight dismissal disabled, which is a
         * worse failure than the one being fixed. Damir's ruling (I-7): the body is
         * composed HERE and the shell only renders it — no balance, and no headroom
         * signal, ever crosses into the chat WebView. */
        private string tipMsgIdHex = "";
        private void sendTipResult(bool ok, string body)
        {
            // ★ audit: the id goes back with the answer. Without it a late result could
            // resolve a tip sheet the user had since opened on a DIFFERENT message.
            Utils.sendUiCommand(this, "setTipResult", ok ? "1" : "0", body ?? "", tipMsgIdHex ?? "");
        }

        public void onAcceptFriendRequest()
        {
            friend.approved = true;

            friend.handshakePushed = false;

            UIHelpers.shouldRefreshContacts = true;

            StreamProcessor.sendAcceptAdd(friend, true);

            // #434: the local accept writes the connected line too (see
            // HomePage.writeConnectedLine — ONE implementation, two call sites).
            // Node.addMessageWithType → UIHelpers.insertMessage already pushes the new
            // line into a VISIBLE chat screen, so no extra refresh is needed here (and
            // an updateScreen() would re-run the pending/waiting branches mid-accept).
            HomePage.writeConnectedLine(friend);
        }

        public void onViewPayment(string msg_id)
        {
            FriendMessage msg = friend.getMessages(selectedChannel).Find(x => x.id != null && x.id.SequenceEqual(Crypto.stringToHash(msg_id)));

            if(msg.type == FriendMessageType.sentFunds || msg.message.StartsWith(":"))
            {
                string id = msg.message;
                if(id.StartsWith(":"))
                {
                    id = id.Substring(1);
                }
                byte[] b_id = Transaction.txIdLegacyToV8(id);

                Transaction? transaction = Node.activityStorage.getActivityById(b_id, null, true)?.transaction;
                if (transaction == null)
                {
                    return;
                }

                if (homePage != null)
                {
                    homePage.onTransaction(b_id, null);
                    return;
                }

                hostNav.PushAsync(new WalletSentPage(transaction), Config.defaultXamarinAnimations);   // #225: root nav

                return;
            }

            if(msg.type == FriendMessageType.requestFunds && !msg.localSender)
            {
                onConfirmPaymentRequest(msg, msg.message);
            }
        }

        public void onConfirmPaymentRequest(FriendMessage msg, string amount)
        {
            // TODO: extract the date from the corresponding message
            DateTime dt = DateTime.Now;
            string date_text = String.Format("{0:t}", dt);

            if (homePage != null)
            {
                homePage.onConfirmPaymentRequest(msg, friend, amount, date_text);
                return;
            }

            hostNav.PushAsync(new WalletContactRequestPage(msg, friend, amount, date_text), Config.defaultXamarinAnimations);   // #225: root nav
        }

        public void onApp(string app_id)
        {
            if (friend.bot)
            {
                Logging.error("App Sending is not supported in this chat.");
                return;
            }

            byte[]? session_id = null;
            if (homePage != null)
            {
                session_id = homePage.onJoinApp(app_id, friend);
            }
            else
            {
                MiniAppPage custom_app_page = new MiniAppPage(app_id, IxianHandler.getWalletStorage().getPrimaryAddress(), friend, Node.MiniAppManager.getAppEntryPoint(app_id));
                custom_app_page.accepted = true;
                Node.MiniAppManager.addAppPage(custom_app_page);
                session_id = custom_app_page.sessionId;
                MainThread.BeginInvokeOnMainThread(() =>
                {
                    hostNav.PushAsync(custom_app_page, Config.defaultXamarinAnimations);   // #225: root nav
                });
            }


            if(session_id == null)
            {
                return;
            }

            var app_info = Node.MiniAppManager.getAppInfo(app_id);
            var msg_id = StreamProcessor.sendAppRequest(friend, app_id, session_id, null, app_info);
            Node.addMessageWithType(msg_id, FriendMessageType.appSession, friend.walletAddress, 0, app_info, true, null, 0, false);
        }

        public void onJoinApp(string app_id)
        {
            if (homePage != null)
            {
                homePage.onJoinApp(app_id, friend);
                return;
            }

            MiniAppPage miniAppPage = new MiniAppPage(app_id, IxianHandler.getWalletStorage().getPrimaryAddress(), friend, Node.MiniAppManager.getAppEntryPoint(app_id));
            miniAppPage.accepted = true;
            Node.MiniAppManager.addAppPage(miniAppPage);

            MainThread.BeginInvokeOnMainThread(() =>
            {
                hostNav.PushAsync(miniAppPage, Config.defaultXamarinAnimations);   // #225: root nav
            });

        }

        public async void onInstallApp(string app_url)
        {
            if (homePage != null)
            {
                homePage.onInstallApp(app_url, friend);
                return;
            }

            MiniApp? app = await Node.MiniAppManager.fetch(app_url);
            if (app == null)
            {
                return;
            }

            app.url = app_url;

            MainThread.BeginInvokeOnMainThread(() =>
            {
                pushPageLoaded(new AppDetailsPage(app, null, true, friend));   // load-then-move (N3)
            });
        }

        private void onKickUser(Address address)
        {
            string str_address = address.ToString();
            StreamProcessor.sendBotAction(friend, SpixiBotActionCode.kickUser, address.addressWithChecksum, 0, true);
            string modal_title = String.Format(SpixiLocalization._SL("chat-modal-kicked-title"), str_address);
            string modal_body = String.Format(SpixiLocalization._SL("chat-modal-kicked-body"), str_address);
            displaySpixiAlert(modal_title, modal_body, SpixiLocalization._SL("global-dialog-ok"));

        }

        private void onBanUser(Address address)
        {
            string str_address = address.ToString();
            StreamProcessor.sendBotAction(friend, SpixiBotActionCode.banUser, address.addressWithChecksum, 0, true);
            string modal_title = String.Format(SpixiLocalization._SL("chat-modal-banned-title"), str_address);
            string modal_body = String.Format(SpixiLocalization._SL("chat-modal-banned-body"), str_address);
            displaySpixiAlert(modal_title, modal_body, SpixiLocalization._SL("global-dialog-ok"));
        }


        /// <summary>
        /// ⚠ AUDIT MINOR: one place that knows how a chat is muted, so the three entry points
        /// (this page, ContactDetails, and the chat-list row menu) cannot disagree.
        /// </summary>
        private void setChatNotifications(bool enabled)
        {
            try
            {
                if (friend.metaData != null && friend.metaData.botInfo != null)
                {
                    friend.metaData.botInfo.sendNotification = enabled;
                    friend.saveMetaData();
                    StreamProcessor.sendBotAction(friend, SpixiBotActionCode.enableNotifications, new byte[1] { (byte)(enabled ? 1 : 0) }, 0, true);
                }
                else
                {
                    SNotificationPrefs.setContactMuted(friend.walletAddress.ToString(), !enabled);
                }
                UIHelpers.shouldRefreshContacts = true;
            }
            catch (Exception e)
            {
                Logging.error("setChatNotifications failed: " + e);
            }
        }

        private void onContextAction(string action, string msg_id_hex)
        {
            string data = "";
            if (msg_id_hex.Contains(':'))
            {
                int sep_offset = msg_id_hex.IndexOf(':');
                data = msg_id_hex.Substring(sep_offset + 1);
                msg_id_hex = msg_id_hex.Substring(0, sep_offset);
            }
            /* ★ review r2: stringToHash is OUTSIDE the tip fence, and the fence's own
             * comment names it as one of the throws it exists to contain. It is not a
             * theoretical gap: a malformed or truncated id throws here, the tip case is
             * never entered, nothing answers, and BOTH consequences land in full — the
             * sheet frozen with dismissal disabled until the 12 s backstop, and an
             * unhandled exception out of a MAUI Navigating handler, which kills the
             * process on Android and iOS. Fence the prologue too. */
            tipMsgIdHex = msg_id_hex;   // ★ audit: correlate the tip answer with its message
            byte[] msg_id;
            try
            {
                msg_id = Crypto.stringToHash(msg_id_hex);
            }
            catch (Exception idEx)
            {
                Logging.error("Context action received a malformed message id: " + idEx);
                if (action == "tip")
                {
                    sendTipResult(false, SpixiLocalization._SL("chat-modal-tip-error-body"));
                }
                return;
            }
            switch(action)
            {
                case "tip":
                    /* ★ audit 2026-08-15 — EVERY EXIT MUST ANSWER, INCLUDING A THROW.
                     * The sheet disables light-dismiss and Esc while money is in flight, so
                     * an unanswered exit strands the user in a frozen sheet until the 12 s
                     * backstop fires. The early returns below each report; a THROW did not.
                     * The exposed lines are real: Crypto.stringToHash on a malformed id,
                     * new IxiNumber on a malformed amount, prepareTransactionFrom — and,
                     * worst, sendReaction / addTransaction AFTER addReaction has already
                     * committed the local tip pill.
                     * ★ It also prevents a CRASH: onNavigating dispatches this bare, so an
                     * escaping exception leaves a MAUI Navigating handler unhandled, which
                     * takes the process down on Android and iOS.
                     * ⚠ Correction to the older comments in this method: several claim a
                     * throw escapes "before e.Cancel = true (:424)". That is WRONG —
                     * e.Cancel is set at the TOP of onNavigating (:106) and :424 is a
                     * redundant re-set. The real consequence is the crash above, which is
                     * worse than what those comments describe, so every guard still stands. */
                    try
                    {
                    // W8 (#348, Damir F5): tip is now allowed in BOT groups. It was
                    // blocked for every bot, which is why the option was missing there
                    // while a normal group still had it.
                    // BLIND chats stay blocked, and the test had to move to say so
                    // correctly: a bot is chat_type 3 REGARDLESS of
                    // hideParticipantAddresses (onLoad:604-608), so a blind BOT would
                    // have fallen straight through a `friend.type == Group` test and
                    // reached the money path with a hidden sender. The flag is now
                    // read for bots AND groups, and never for a 1:1 — botInfo is null
                    // there, and onLoad only waits for it when chat_type > 0 (:622).
                    // ★ review MAJOR-14/MINOR-16: FAIL CLOSED on missing metadata.
                    // The old `friend.bot || (Group && …botInfo…)` short-circuited for a
                    // bot and never touched botInfo; this predicate reads it for bots too,
                    // and botInfo genuinely can be null here — this file null-guards the
                    // identical expression twice (:596, :2042), and a friend can BECOME a
                    // bot after onLoad computed chat_type (joinBot creates it as Normal,
                    // the metadata lands later, and nothing re-runs onLoad). Without this
                    // the NRE escapes onNavigating before `e.Cancel = true`, so the WebView
                    // navigates to the raw ixian: URL — the documented MAJOR class.
                    // Unknown blindness means we do not pay: refuse.
                    if (friend.bot || friend.type == FriendType.Group)
                    {
                        if (friend.metaData == null || friend.metaData.botInfo == null)
                        {
                            Logging.error("Send IXI: chat metadata is not loaded yet.");
                            sendTipResult(false, SpixiLocalization._SL("chat-modal-tip-error-body"));
                            return;
                        }
                        if (friend.metaData.botInfo.hideParticipantAddresses)
                        {
                            Logging.error("Send IXI is not supported in this chat.");
                            sendTipResult(false, SpixiLocalization._SL("chat-modal-tip-error-body"));
                            return;
                        }
                    }

                    FriendMessage msg = friend.getMessages(selectedChannel).Find(x => x.id != null && x.id.SequenceEqual(msg_id));
                    // The message must exist before anything reads it. Find() returns
                    // null for an id that is not in THIS channel, and every line below
                    // is on the money path.
                    if (msg == null)
                    {
                        Logging.error("Tip target message was not found in this channel.");
                        sendTipResult(false, SpixiLocalization._SL("chat-modal-tip-error-body"));
                        return;
                    }
                    ExtendedAddress sender_address = new ExtendedAddress(friend.walletAddress, AddressPaymentFlag.OfflineTag, null);
                    if (friend.bot
                       || (friend.type == FriendType.Group && !friend.metaData.botInfo.hideParticipantAddresses))
                    {
                        // This bot branch existed already but was DEAD — the guard above
                        // returned for every bot before it could run. It is the author's
                        // own intent for how a bot tip resolves its recipient, and it is
                        // what now carries the bot case.
                        // Guard the address: Ixian-Core 0.9.8k stopped storing
                        // senderAddress on 1:1 messages, and an own or system post in a
                        // channel can carry none either. Paying a null recipient is not
                        // a thing we do.
                        // ★ D-19b (#370): a NAMED address-less row gets one repair try —
                        // the same roster reverse-resolve insertMessage used to offer the
                        // Tip button (exact single match; blind rooms never reach this
                        // branch — the hideParticipantAddresses guard above refused).
                        // Re-resolving AT SPEND TIME is deliberate: if the roster changed
                        // since render (a second member now shares the nick), the match
                        // goes ambiguous and the tip refuses instead of paying the wrong
                        // person.
                        Address? tipTarget = msg.senderAddress;
                        if (tipTarget == null)
                        {
                            tipTarget = reverseResolveSenderByNick(msg.senderNick);
                            // ★ A-2 (#370) RENDER→SPEND BINDING: the resolve must equal
                            // the address this page PUSHED for this row — the address the
                            // user is looking at in the sheet. A roster change between
                            // render and spend (or a row the FE never got an address for)
                            // refuses instead of silently paying somewhere else.
                            if (tipTarget != null
                                && (!resolvedSenderByMsgId.TryGetValue(msg_id_hex, out string shownAddr)
                                    || shownAddr != tipTarget.ToString()))
                            {
                                Logging.error("Tip target resolve does not match the rendered sender.");
                                tipTarget = null;
                            }
                        }
                        if (tipTarget == null)
                        {
                            // ★ review r2 MEDIUM: this must not be silent. Answer honestly
                            // instead of dropping it. (History: before #356 the slot was
                            // seeded with friend.nickname on a null-address message, so the
                            // FE guard saw a non-empty string and offered Tip; #356 sends ""
                            // and the FE guard now suppresses Tip on those rows — this
                            // branch remains as the belt for an old shell on a new exe.)
                            Logging.error("Tip target message carries no sender address.");
                            // ★ review r3: chat-modal-tip-title is "Tip {0}?" — a FORMAT
                            // string. Passed raw it printed a literal {0} in every locale.
                            sendTipResult(false, SpixiLocalization._SL("chat-modal-tip-error-body"));
                            return;
                        }
                        sender_address = new ExtendedAddress(tipTarget, AddressPaymentFlag.OfflineTag, null);
                    }
                    IxiNumber amount = new IxiNumber(data);
                    var prepTx = Node.prepareTransactionFrom(IxianHandler.getWalletStorage().getPrimaryAddress(), sender_address, amount);
                    var tx = prepTx.transaction;
                    // ★ review r2 CRITICAL: prepareTransactionFrom RETURNS NULL — on
                    // insufficient funds (Node.cs:938) and on a foreign from-address
                    // (:883). Every line below dereferences tx, so an over-balance tip
                    // threw an NRE, and the throw escapes onNavigating before
                    // `e.Cancel = true` (:424) — so the WebView then navigated to the raw
                    // ixian: URL and destroyed the conversation document.
                    // The tip sheet cannot catch this for us: the shell opens it with
                    // `balance: null` on purpose (chat.html:2124), because C# owns the real
                    // balance check. This IS that check.
                    // WalletSend2Page:113-118 is the precedent for the shape.
                    if (tx == null)
                    {
                        // ★ review r3: say WHY. prepareTransactionFrom checks the balance
                        // itself (check_balance defaults true, Node.cs:936-946), so this
                        // branch IS the insufficient-funds case in practice — and
                        // "Invalid Amount" told a user with 5 IXI trying to tip 50 that
                        // their amount was malformed. Reuse the balance wording, which
                        // exists for exactly this and names both numbers.
                        // ★ review r4: {0} is "Total cost of the transaction", NOT the
                        // amount. Passing the bare amount produced "cost is 10, balance
                        // is 10" for a user with exactly 10 IXI — two identical numbers
                        // under "Insufficient Balance", and a retry loop, because the
                        // shortfall is the FEE. calculateTransactionFee re-prepares with
                        // check_balance:false and returns exactly that delta (Node.cs:870).
                        IxiNumber tip_total = amount;
                        try
                        {
                            tip_total = amount + Node.calculateTransactionFee(IxianHandler.getWalletStorage().getPrimaryAddress(), sender_address, amount);
                        }
                        catch (Exception fee_ex)
                        {
                            Logging.warn("Could not compute the tip fee for the balance message: " + fee_ex);
                        }
                        // ★ I-6 (#360): amounts in composed sentences render in the app language
                        string short_body = String.Format(SpixiLocalization._SL("wallet-error-balance-text"), Utils.amountToLocalizedDisplayString(tip_total), Utils.amountToLocalizedDisplayString(IxianHandler.getWalletBalance(IxianHandler.getWalletStorage().getPrimaryAddress())));
                        // ★ I-7 (Damir): INLINE. C# composes the sentence — it owns the
                        // numbers — and the shell only renders it.
                        sendTipResult(false, short_body);
                        return;
                    }
                    var relayNodeAddresses = prepTx.relayNodeAddresses;
                    IxiNumber balance = IxianHandler.getWalletBalance(IxianHandler.getWalletStorage().getPrimaryAddress());
                    if(tx.amount <= 0)
                    {
                        sendTipResult(false, SpixiLocalization._SL("wallet-error-amount-text"));
                        return;
                    }
                    // ★ review r3: a BELT, not the live path — the guard above already
                    // returns for an over-balance tip. Kept because `check_balance` is
                    // Ixian-Core's behaviour, not ours, and #215 says do not assume it.
                    if (tx.amount + tx.fee > balance)
                    {
                        // ★ I-6 (#360): amounts in composed sentences render in the app language
                        string alert_body = String.Format(SpixiLocalization._SL("wallet-error-balance-text"), Utils.amountToLocalizedDisplayString(tx.amount + tx.fee), Utils.amountToLocalizedDisplayString(balance));
                        sendTipResult(false, alert_body);
                    }
                    else
                    {
                        /* ★ D-11 RESOLVED BY DELETION (audit 2026-08-15).
                         * Damir's complaint was that the tip ALERT asked "Tip <group name>?"
                         * instead of naming the member. A nick ladder was written here to
                         * fix it — and the audit proved the whole thing was DEAD CODE: both
                         * branches below now answer through sendTipResult, which carries no
                         * title, so `modal_title` was assigned and never read. C# emits no
                         * warning for that, so nothing would have caught it.
                         * The complaint is fixed by D-10 instead: that alert is GONE. The
                         * name the user sees is the tip sheet's own header, which the shell
                         * already resolves correctly (chat.html openTipForMessage — roster
                         * name, then the truncated address, never the group).
                         * Deleting beats keeping a ladder that computes a string nobody
                         * reads. */
                        if (friend.addReaction(IxianHandler.getWalletStorage().getPrimaryAddress(), new ReactionMessage(msg_id, "tip:" + tx.id), selectedChannel))
                        {
                            updateReactions(msg_id, selectedChannel);
                            StreamProcessor.sendReaction(friend, msg_id, "tip:" + tx.id, selectedChannel);
                            IxianHandler.addTransaction(tx, relayNodeAddresses, new() { sender_address }, null, true);
                            // D-10: the SHEET is the confirmation now — it morphs and closes,
                            // and the tip pill lands over the message via addReactions. The
                            // native alert on top of that was a second, redundant channel.
                            sendTipResult(true, "");
                        }
                        else
                        {
                            // 🟡 D-12: this is the "you already tipped this message" case in
                            // practice (Damir proved the one-tip rule by testing, and it holds
                            // in legacy too) — but Friend.addReaction is Ixian-Core and can
                            // refuse for reasons we cannot enumerate, so the copy stays
                            // generic until the BE engineer confirms. It is at least INLINE
                            // and on the sheet now, instead of a native dialog.
                            sendTipResult(false, SpixiLocalization._SL("chat-modal-tip-error-body"));
                        }
                    }
                    }
                    catch (Exception tipEx)
                    {
                        /* The sheet is WAITING. Answer it, then let the log carry the detail.
                         *
                         * 🟡 KNOWN RESIDUAL (review r2 finding 2b, logged in
                         * docs/f5-findings-2026-08-15.md under D-10). This answer is always
                         * "not sent". friend.addReaction above commits the tip pill to the
                         * LOCAL store before sendReaction and addTransaction run, so a throw
                         * in either of those two leaves the sheet saying "failed" over a
                         * message that already carries a tip pill.
                         * It is NOT fixed here, on purpose:
                         *   · an honest third answer ("unsure") needs a new string in 13
                         *     locale files — the same block that holds D-12;
                         *   · rolling the reaction back needs a remove counterpart to
                         *     Friend.addReaction, which is Ixian-Core, and this repository
                         *     holds no evidence that one exists (#215: zero C# without
                         *     evidence). The BE engineer answers this.
                         * Before #348 the same throw escaped into onNavigating and destroyed
                         * the conversation document, so this catch is still the big win. */
                        Logging.error("Tip failed with an exception: " + tipEx);
                        sendTipResult(false, SpixiLocalization._SL("chat-modal-tip-error-body"));
                    }
                    break;

                case "sendContactRequest":
                    if (friend.bot
                        || (friend.type == FriendType.Group && friend.metaData.botInfo.hideParticipantAddresses))
                    {
                        Logging.error("Send IXI is not supported in this chat.");
                        return;
                    }
                    Address new_friend_address = friend.getMessages(selectedChannel).Find(x => x.id != null && x.id.SequenceEqual(msg_id)).senderAddress;
                    Friend new_friend = FriendList.addFriend(FriendType.Normal, FriendState.RequestSent, new_friend_address, null, new_friend_address.ToString(), null, null, 0);
                    if (new_friend != null)
                    {
                        new_friend.save();

                        UIHelpers.shouldRefreshContacts = true;

                        StreamProcessor.sendContactRequest(new_friend);

                        if (new_friend.approved)
                        {
                            CoreProtocolMessage.resubscribeEvents();
                        }
                    }
                    break;

                case "kickUser":
                    onKickUser(friend.getMessages(selectedChannel).Find(x => x.id != null && x.id.SequenceEqual(msg_id)).senderAddress);
                    break;

                case "banUser":
                    onBanUser(friend.getMessages(selectedChannel).Find(x => x.id != null && x.id.SequenceEqual(msg_id)).senderAddress);
                    break;

                case "report":
                    if (friend.bot)
                    {
                        StreamProcessor.sendMsgReport(friend, msg_id, selectedChannel);
                        friend.deleteMessage(msg_id, selectedChannel);
                    }
                    break;

                case "deleteMessage":
                    // #334 (file-send Cancel): deleting an OWN un-completed file OFFER
                    // is the cancel path — ALSO kill the in-memory outgoing transfer,
                    // or the "deleted" offer kept serving a late Accept until an app
                    // restart. Deleting the message keeps it dead across history
                    // reloads (the SpixiLocalStorageCallbacks resurrect re-prepares
                    // only surviving incomplete own fileHeader messages).
                    {
                        FriendMessage del_msg = friend.getMessages(selectedChannel)?.Find(x => x.id != null && x.id.SequenceEqual(msg_id));
                        if (del_msg != null && del_msg.type == FriendMessageType.fileHeader && del_msg.localSender && !del_msg.completed)
                        {
                            TransferManager.removeOutgoingTransfer(del_msg.transferId);
                        }
                    }
                    StreamProcessor.sendMsgDelete(friend, msg_id, selectedChannel);
                    if (!friend.bot)
                    {
                        if (friend.deleteMessage(msg_id, selectedChannel))
                        {
                            deleteMessage(msg_id, selectedChannel);
                        }
                    }
                    break;

                case "like":
                    var address = IxianHandler.getWalletStorage().getPrimaryAddress();
                    if (friend.type == FriendType.Group
                        && friend.metaData.botInfo.hideParticipantAddresses
                        && !friend.users.getOwner().SequenceEqual(address))
                    {
                        // if blind group and not owner, use derived address
                        address = GroupChat.DeriveGroupAddress(address, friend.metaData.botInfo.randomId);
                    }
                    if (friend.addReaction(address, new ReactionMessage(msg_id, "like:"), selectedChannel))
                    {
                        updateReactions(msg_id, selectedChannel);
                        StreamProcessor.sendReaction(friend, msg_id, "like:", selectedChannel);
                    }
                    break;
            }
        }

        private void onEntryCompleted(object sender, EventArgs e)
        {

        }

        public void loadApps()
        {
            Utils.sendUiCommand(this, "clearApps");
            var apps = Node.MiniAppManager.getInstalledApps();
            lock (apps)
            {
                foreach (MiniApp app in apps.Values)
                {
                    try
                    {
                        if (!app.hasCapability(MiniAppCapabilities.MultiUser))
                        {
                            continue;
                        }

                        string icon = Node.MiniAppManager.getAppIconPath(app.id);
                        if (icon == null)
                        {
                            icon = "";
                        }
                        icon = Utils.imageToDataUri(icon);   // X1
                        Utils.sendUiCommand(this, "addApp", app.id, app.name, icon, app.publisher);
                    }
                    catch (Exception e)
                    {
                        Logging.error("Exception while loading app '{0}': {1}", app.id, e);
                    }
                }
            }
        }

        public void loadMessages()
        {
            var messages = friend.getMessages(selectedChannel, (int)messagesToShow);
            if (messages == null
                || messages.Count == 0)
            {
                // iOS-24/25 (#283 review MAJOR-1): a just-wiped history IS this empty state —
                // returning before the clearMessages push left an open conversation rendering
                // deleted messages until re-entered. Tell the WebView to clear first (no
                // load-more); the shell's 250 ms burst fallback paints the emptied log.
                Utils.sendUiCommand(this, "clearMessages", "false");
                return;
            }

            string show_more = "true";
            if (messages.Count < messagesToShow)
                show_more = "false";
            Utils.sendUiCommand(this, "clearMessages", show_more);
            
            lock (messages)
            {
                int skip_messages = 0;
                if(messages.Count > messagesToShow)
                {
                    skip_messages = messages.Count() - (int)messagesToShow;
                }
                if (friend.metaData.unreadMessageCount > 0)
                {
                    friend.metaData.unreadMessageCount = 0;
                    friend.saveMetaData();
                    // iOS-8 (#283): announce the zeroed count to the chats list NOW.
                    // updateMessageReadStatus pushes setContactStatus only when it marks a
                    // markable message read — and it deliberately skips requestAdd — so a chat
                    // whose unread consisted of a requestAdd (the accepted-request row) kept its
                    // stale row/tab badge until the next structural flush (cross-platform, seen
                    // on iOS + suspected on Windows). Display-only push; no message flags touched.
                    // iOS-31 leg A: push a LITERAL 0, not getUnreadMessageCount(). The line
                    // above just set metaData.unreadMessageCount = 0 and saved it — that IS the
                    // truth for this chat. getUnreadMessageCount() re-derives the count from
                    // message flags, and a requestAdd is never markable-read, so for a chat whose
                    // unread was the accepted-request row the recount comes back >= 1 and this
                    // "zeroing" push re-asserted the very badge it was meant to clear.
                    UIHelpers.setContactStatus(friend.walletAddress, friend.online, 0, "", 0);
                }
                foreach (FriendMessage message in messages)
                {
                    if (message.type == FriendMessageType.standard
                       && string.IsNullOrEmpty(message.message))
                    {
                        continue;
                    }

                    if (skip_messages > 0)
                    {
                        skip_messages--;
                        continue;
                    }
                    try
                    {
                        insertMessage(message, selectedChannel);
                    }catch(Exception e)
                    {
                        Logging.error("Error loading message: {0}", e);
                    }
                    updateReactions(message);
                }
            }
        }

        public string resolveNick(string senderNick, Address senderAddress)
        {
            string nick = senderNick;
            if (nick == "")
            {
                if (senderAddress != null)
                {
                    var tmp_nick = friend.users.getUser(senderAddress)?.getNick();
                    if (!string.IsNullOrEmpty(tmp_nick))
                    {
                        nick = tmp_nick;
                    }
                    else
                    {
                        var local_fr = FriendList.getFriend(senderAddress);
                        if (local_fr != null)
                        {
                            nick = local_fr.nickname;
                        }
                        else if (senderAddress.SequenceEqual(IxianHandler.primaryWalletAddress))
                        {
                            nick = IxianHandler.localStorage.nickname;
                        }
                        else
                        {
                            nick = senderAddress.ToString();
                        }
                    }
                }
            }

            return nick;
        }

        // R2 (#371): "1 member", not "1 members" — a whole-phrase singular id so
        // every locale translates the complete line. A lang file without the new
        // id (partial/legacy translation) falls back to the plural format string;
        // the sub can never go null/empty from a dictionary miss.
        private string memberCountText(long count)
        {
            if (count == 1)
            {
                string one = SpixiLocalization._SL("chat-member-count-one");
                if (!string.IsNullOrEmpty(one))
                {
                    return one;
                }
            }
            return String.Format(SpixiLocalization._SL("chat-member-count") ?? "{0} members", count);
        }

        /* ★ D-19b (#370): REVERSE-RESOLVE a sender nick to its roster address.
         * Core 0.9.8k stores bot-room rows address-less (5643e5b; BE q1), so a
         * named row lost its member sheet, copy and tip target. The roster
         * (friend.users) still maps address → nick; this walks it the other way.
         * MONEY SAFETY: an EXACT SINGLE match only — two members can share a
         * nick, and a wrong match here becomes a copyable address and a tip
         * recipient for the wrong person. Ambiguous = null.
         * BLIND: never — a blind room must not hand out any address. Unknown
         * blindness (botInfo not loaded yet) fails closed the same way. */
        /* ★ D-19b loop A-2 (#370): RENDER→SPEND BINDING for reverse-resolved rows.
         * The roster mutates (nick rewrites, leavers, the 500-cap eviction), so a
         * spend-time re-resolve alone could pay an address the user never SAW: the
         * sheet showed the render-time address, the verb carries only msgid:amount.
         * insertMessage records the address it pushed per message id; the tip case
         * requires the spend-time resolve to EQUAL it, else it refuses honestly.
         * ConcurrentDictionary: writes ride loadMessages under lock(messages),
         * reads ride onNavigating. Keyed by id hex — repopulated on every load. */
        private readonly ConcurrentDictionary<string, string> resolvedSenderByMsgId = new ConcurrentDictionary<string, string>();

        private Address? reverseResolveSenderByNick(string nick)
        {
            if (string.IsNullOrEmpty(nick))
            {
                return null;
            }
            if (friend.metaData == null || friend.metaData.botInfo == null
                || friend.metaData.botInfo.hideParticipantAddresses)
            {
                return null;
            }
            Address? match = null;
            try
            {
                // Snapshot + lock one reference: BotUsers reassigns nothing, but its
                // own methods serialize on `contacts` — iterate under the same lock
                // so a concurrent roster write cannot break the enumeration.
                var users = friend.users;
                if (users == null)
                {
                    return null;
                }
                lock (users.contacts)
                {
                    foreach (var contact in users.contacts)
                    {
                        var contactNick = contact.Value?.getNick();
                        if (string.IsNullOrEmpty(contactNick) || contactNick != nick)
                        {
                            continue;
                        }
                        if (match != null)
                        {
                            // Second member with the same nick → ambiguous → no address.
                            return null;
                        }
                        match = contact.Key;
                    }
                }
            }
            catch (Exception ex)
            {
                Logging.warn("reverseResolveSenderByNick: " + ex.Message);
                return null;
            }
            return match;
        }

        public void insertMessage(FriendMessage message, int channel)
        {
            if(channel != selectedChannel)
            {
                return;
            }
            if(friend.state != FriendState.Approved)
            {
                if (message.type == FriendMessageType.requestAdd)
                {

                    // Call webview methods on the main UI thread only
                    friend.state = FriendState.RequestReceived;
                    Utils.sendUiCommand(this, "showContactRequest", "1");
                    return;
                }
            }
            else
            {
                // Don't show if the friend is already approved
                if (message.type == FriendMessageType.requestAdd)
                    return;
            }

            bool paid = false;
            if (message.transactionId != "")
            {
                paid = true;
            }
            string prefix = "addMe";
            string avatar = "";
            string address = friend.nickname;
            if(address == "")
            {
                // ★ Loop r1 MAJOR-5 (#356 rider): senderAddress is Address? and Core
                // 0.9.8k nulls it for FriendType.Normal — with an EMPTY friend
                // nickname (one empty `nick` push persists "") this line NRE'd on
                // every row: history load swallowed it per-row and the chat rendered
                // permanently empty. Null → the slot stays "", the shell's honest
                // fallbacks take over.
                address = message.senderAddress != null ? message.senderAddress.ToString() : "";
            }
            string nick = "";
            // ★ D-19b (#370): the ONE sender identity for this row. Starts as the
            // stored address; a named-but-address-less multi row may repair it below
            // via the roster reverse-resolve. Address, avatar and relation all read
            // THIS variable so the three can never disagree.
            Address? resolvedSender = message.senderAddress;
            if (!message.localSender)
            {
                if (friend.bot
                    || friend.type == FriendType.Group)
                {
                    nick = resolveNick(message.senderNick, message.senderAddress);
                    if (message.senderAddress == null)
                    {
                        // ★ D-19 (#356): a multi-chat row with NO sender address must not
                        // ship the GROUP's nickname in the address slot. The shell renders
                        // that slot middle-truncated with a copy affordance (Damir's dial
                        // 2026-07-07 — written for REAL addresses), so the group's own name
                        // arrived styled as the sender's address ("Spixi …p Chat"), wearing
                        // the group's avatar, and polluted the member sheet as a phantom
                        // member keyed by the group name. Ixian-Core 0.9.8k stores every
                        // bot-room message address-less (5643e5b nulls FriendType.Normal;
                        // BE question 1), so this is now the COMMON case there, not a corner.
                        // ★ D-19b (#370): for a NAMED row the roster can repair the slot —
                        // reverse-resolve the nick (exact single match, never blind). This
                        // restores the member sheet, copy and tip for roster-known senders
                        // in the public Spixi room. No match → the slot stays "" (an
                        // anonymous row renders with no label — legacy parity, #369).
                        resolvedSender = reverseResolveSenderByNick(nick);
                        if (resolvedSender != null && message.id != null)
                        {
                            // A-2 binding: remember what THIS row will display.
                            resolvedSenderByMsgId[Crypto.hashToString(message.id)] = resolvedSender.ToString();
                        }
                    }
                    address = resolvedSender != null ? resolvedSender.ToString() : "";
                }

                prefix = "addThem";
                if(resolvedSender != null)
                {
                    avatar = IxianHandler.localStorage.getAvatarPath(resolvedSender.ToString());
                }
                else if (friend.bot || friend.type == FriendType.Group)
                {
                    // ★ D-19 (#356): same rule for the photo — a sender-less multi-chat row
                    // must not wear the GROUP's avatar; it gets the neutral sentinel (the
                    // shell renders its gradient fallback). Direct assignment, not null —
                    // `string avatar` is non-nullable and this file builds warning-clean
                    // (r2 NIT-8). The 1:1 branch under this keeps the friend's photo:
                    // there the friend IS the sender.
                    avatar = "img/spixiavatar.png";
                }
                else
                {
                    avatar = IxianHandler.localStorage.getAvatarPath(friend.walletAddress.ToString());
                }
                if (avatar == null)
                {
                    avatar = "img/spixiavatar.png";
                }
            }

            // X1: convert the (possibly local) avatar path to a data-URI ONCE here — covers
            // every avatar push below (message/payment/file/app rows). "" (own messages) and
            // "img/..." sentinels pass through unchanged.
            avatar = Utils.imageToDataUri(avatar);

            // D-5/N26 (#366): per-sender RELATION for the member sheet — received
            // multi-chat rows only ("" elsewhere; the shell treats "" as none).
            // Never for a blind chat: a relation on a masked row is an identity
            // hint (the FE gates the member sheet off there anyway — belt both sides).
            // Loop n2: only the STANDARD text push consumes it — gate the FriendList
            // scan on the type so payment/file/app/call rows don't pay for it.
            string relation = "";
            bool relationBlind = friend.metaData.botInfo != null && friend.metaData.botInfo.hideParticipantAddresses;
            if (message.type == FriendMessageType.standard && !message.localSender && !relationBlind && (friend.bot || friend.type == FriendType.Group))
            {
                // D-19b (#370): reads resolvedSender — a reverse-resolved row gets the
                // same relation treatment as an addressed one (blind still excluded).
                relation = contactRelationFor(resolvedSender);
            }

            if (message.type == FriendMessageType.requestFunds)
            {
                string status = SpixiLocalization._SL("chat-payment-status-waiting-confirmation");
                string status_icon = "fa-clock";

                string amount = message.message.Trim(':');

                string txid = "";

                bool enableView = false;

                if(!message.localSender)
                {
                    enableView = true;
                }

                if (message.message.StartsWith("::"))
                {
                    status = SpixiLocalization._SL("chat-payment-status-declined");
                    status_icon = "fa-exclamation-circle";
                    txid = Crypto.hashToString(message.id);
                    enableView = false;
                }else if(message.message.StartsWith(":"))
                {
                    txid = message.message.Substring(1);
                    byte[] b_txid = Transaction.txIdLegacyToV8(txid);

                    var activity = Node.activityStorage.getActivityById(b_txid, null, true);
                    var transaction = activity?.transaction;

                    status = SpixiLocalization._SL("chat-payment-status-declined");
                    status_icon = "fa-exclamation-circle";

                    if (activity != null)
                    {
                        if (activity.status == IXICore.Activity.ActivityStatus.Final)
                        {
                            status = SpixiLocalization._SL("chat-payment-status-confirmed");
                            status_icon = "fa-check-circle";
                        }
                        else if (activity.status == IXICore.Activity.ActivityStatus.Pending)
                        {
                            status = SpixiLocalization._SL("chat-payment-status-pending");
                            status_icon = "fa-clock";
                        }
                    }

                    amount = "?";

                    if (transaction != null)
                    {
                        amount = transaction.amount.ToString();
                    }
                    else
                    {
                        // TODO think about how to make this more private
                        CoreProtocolMessage.broadcastGetTransaction(Transaction.txIdLegacyToV8(txid), 0, null);
                    }
                    enableView = true;
                }


                if (message.localSender)
                {
                    Utils.sendUiCommand(this, "addPaymentRequest", Crypto.hashToString(message.id), txid, address, nick, avatar, SpixiLocalization._SL("chat-payment-request-sent"), amount, status, status_icon, message.timestamp.ToString(), message.localSender.ToString(), message.confirmed.ToString(), message.read.ToString(), enableView.ToString());
                }
                else
                {
                    Utils.sendUiCommand(this, "addPaymentRequest", Crypto.hashToString(message.id), txid, address, nick, avatar, SpixiLocalization._SL("chat-payment-request-received"), amount, status, status_icon, message.timestamp.ToString(), "", message.confirmed.ToString(), message.read.ToString(), enableView.ToString());
                }
            }

            if (message.type == FriendMessageType.sentFunds)
            {
                byte[] b_txid = Transaction.txIdLegacyToV8(message.message);
                var activity = Node.activityStorage.getActivityById(b_txid, null, true);
                var transaction = activity?.transaction;

                string status = SpixiLocalization._SL("chat-payment-status-declined");
                string status_icon = "fa-exclamation-circle";
                if (activity != null)
                {
                    if (activity.status == IXICore.Activity.ActivityStatus.Final)
                    {
                        status = SpixiLocalization._SL("chat-payment-status-confirmed");
                        status_icon = "fa-check-circle";
                    }
                    else if (activity.status == IXICore.Activity.ActivityStatus.Pending)
                    {
                        status = SpixiLocalization._SL("chat-payment-status-pending");
                        status_icon = "fa-clock";
                    }
                }

                string amount = "?";

                if (transaction != null)
                {
                    if(message.localSender)
                    {
                        amount = transaction.amount.ToString();
                    }else
                    {
                        amount = HomePage.calculateReceivedAmount(transaction).ToString();
                    }
                }
                else
                {
                    // TODO think about how to make this more private
                    CoreProtocolMessage.broadcastGetTransaction(Transaction.txIdLegacyToV8(message.message), 0, null);
                }

                // Call webview methods on the main UI thread only
                if (message.localSender)
                {
                    Utils.sendUiCommand(this, "addPaymentRequest", Crypto.hashToString(message.id), message.message, address, nick, avatar, SpixiLocalization._SL("chat-payment-sent"), amount, status, status_icon, message.timestamp.ToString(), message.localSender.ToString(), message.confirmed.ToString(), message.read.ToString(), "True");
                }
                else
                {
                    Utils.sendUiCommand(this, "addPaymentRequest", Crypto.hashToString(message.id), message.message, address, nick, avatar, SpixiLocalization._SL("chat-payment-received"), amount, status, status_icon, message.timestamp.ToString(), "", message.confirmed.ToString(), message.read.ToString(), "True");
                }
            }


            if (message.type == FriendMessageType.fileHeader)
            {
                string[] split = message.message.Split(new string[] { ":" }, StringSplitOptions.None);
                if (split != null && split.Length > 1)
                {
                    string uid = split[0];
                    string name = split[1];
                    if (message.transferId == "")
                    {
                        if (split.Length > 2)
                        {
                            ulong fileSize = ulong.Parse(split[2]);
                            Logging.warn("Transfer id is not set.");
                            // Sometimes transfer data isn't set on restart - rebuild
                            message.transferId = uid;
                            message.filePath = name;
                            message.fileSize = fileSize;
                        }
                        else
                        {
                            // fix for open file not working sometimes
                            Logging.warn("Transfer id is not set.");
                            // Sometimes transfer data isn't set on restart - rebuild
                            message.transferId = uid;
                            message.filePath = name;
                        }
                    }

                    string progress = "0";
                    if (message.completed)
                    {
                        progress = "100";
                    }
                    Utils.sendUiCommand(this, "addFile", Crypto.hashToString(message.id), address, nick, avatar, uid, name, message.timestamp.ToString(), message.localSender.ToString(), message.confirmed.ToString(), message.read.ToString(), progress, message.completed.ToString(), paid.ToString());
                }
            }

            if (message.type == FriendMessageType.appSession)
            {
                MiniAppManager am = Node.MiniAppManager;

                string app_id;
                string app_install_url = "";
                string app_image_url = "";      // C7(b): remote icon URL carried in the invite
                string app_name = "";
                string app_image = "img/app-noicon.jpg";
                if (message.message.Contains("||"))
                {
                    string[] app_id_data = message.message.Split(new[] { "||" }, StringSplitOptions.None);
                    app_id = app_id_data[0];
                    app_install_url = app_id_data.Length > 1 ? app_id_data[1] : "";
                    app_name = app_id_data.Length > 2 ? app_id_data[2] : "";
                    app_image_url = app_id_data.Length > 3 ? app_id_data[3] : "";
                }
                else
                {
                    app_id = message.message;
                }


                MiniApp app = am.getApp(app_id);
                string app_state = "";

                if (app == null)
                {
                    app_state = "Missing";
                    // C7(b): we don't have the app locally, so use the remote icon URL the
                    // invite carries (absolute http(s) only — excludes relative paths) for a
                    // real tile instead of the no-icon placeholder. The shell renders it as
                    // <img> with a rocket fallback on error.
                    if (app_image_url.StartsWith("http", StringComparison.OrdinalIgnoreCase))
                    {
                        app_image = app_image_url;
                    }
                }
                else
                {
                    app_name = app.name;
                    app_image = Node.MiniAppManager.getAppIconPath(app.id);
                    if (app_image == null)
                    {
                        app_image = "img/app-noicon.jpg";
                    }
                    // C7 follow-up: if a session for this app with this friend is already
                    // active (the user joined and minimized back to the chat), report it so
                    // the invite card shows the in-session (Resume) state instead of
                    // re-offering Join/Decline after the user has already joined.
                    if (am.getAppPage(friend.walletAddress, app_id) != null)
                    {
                        app_state = "Minimized";
                    }
                }

                // X1: local app-icon path → data-URI (http remote-icon URL + "img/" sentinel pass through).
                app_image = Utils.imageToDataUri(app_image);


                if (message.localSender)
                {
                    Utils.sendUiCommand(this, "addAppRequest", Crypto.hashToString(message.id), app_id, app_name, app_image, address, nick, avatar, message.timestamp.ToString(), message.localSender.ToString(), message.confirmed.ToString(), message.read.ToString(), app_state, app_install_url);
                }
                else
                {
                    Utils.sendUiCommand(this, "addAppRequest", Crypto.hashToString(message.id), app_id, app_name, app_image, address, nick, avatar, message.timestamp.ToString(), message.localSender.ToString(), message.confirmed.ToString(), message.read.ToString(), app_state, app_install_url);
                }
            }

            if (message.type == FriendMessageType.standard)
            {
                // Normal chat message
                // Call webview methods on the main UI thread only
                // D-5/N26 (#366): trailing `relation` arg — ADDITIVE (an older shell
                // ignores extras; a missing arg reads as undefined → 'none' FE-side).
                /* M1 reply-to: trailing arg, ADDITIVE (an older shell ignores extras; a
                   missing arg reads as undefined → no quote). Hex, never raw bytes; the
                   shell resolves it against its own loaded rows and degrades to a generic
                   quote label when the original is outside the window.
                   ★ THE SEAM. `FriendMessage.replyToId` lives in Ixian-Core, which is held
                   out of this batch for the BE cutover — so this is always empty and no
                   quote ever renders. The arg is pushed anyway so the shell contract, its
                   signature and its pins all stay in place and the cutover is ONE line:
                       message.replyToId != null && message.replyToId.Length > 0
                           ? Crypto.hashToString(message.replyToId) : ""
                   See docs/be-cutover-ixian-core-reply-carrier.md. */
                string reply_to = "";
                Utils.sendUiCommand(this, prefix, Crypto.hashToString(message.id), address, nick, avatar, message.message, message.timestamp.ToString(), message.sent.ToString(), message.confirmed.ToString(), message.read.ToString(), paid.ToString(), message.errorSending.ToString(), relation, reply_to);
            }

            if(message.type == FriendMessageType.voiceCall || message.type == FriendMessageType.voiceCallEnd)
            {
                string text;
                if(message.localSender)
                {
                    text = SpixiLocalization._SL("chat-call-outgoing");
                }else
                {
                    text = SpixiLocalization._SL("chat-call-incoming");
                }
                bool declined = false;
                if(message.message == "")
                {
                    if(message.type == FriendMessageType.voiceCallEnd || !VoIPManager.hasSession(message.id))
                    {
                        declined = true;
                        if (message.localSender)
                        {
                            text = SpixiLocalization._SL("chat-call-no-answer");
                        }
                        else
                        {
                            text = SpixiLocalization._SL("chat-call-missed");
                        }
                    }
                }else if(message.type == FriendMessageType.voiceCallEnd)
                {
                    long seconds = Int32.Parse(message.message);
                    long minutes = seconds > 0 ? seconds / 60 : 0;
                    seconds = seconds > 0 ? seconds % 60 : 0;
                    text = string.Format("{0} ({1}:{2})", text, minutes, seconds < 10 ? "0" + seconds : seconds.ToString());

                }
                // C4: raw call duration in seconds ("" when not answered/ended)
                string duration_secs = "";
                if (message.type == FriendMessageType.voiceCallEnd && !declined)
                {
                    duration_secs = message.message;
                }
                // C4: trailing outgoing/missed/duration. New args go LAST — never reorder.
                Utils.sendUiCommand(this, "addCall", Crypto.hashToString(message.id), text, declined.ToString(), message.timestamp.ToString(), message.localSender.ToString(), (declined && !message.localSender).ToString(), duration_secs);
            }

            updateMessageReadStatus(message, channel);
        }

        private void updateMessageReadStatus(FriendMessage message, int channel)
        {
            if (App.isInForeground && friend.metaData.unreadMessageCount > 0)
            {
                // TODO improve this by reducing the number of unread messages by unread message
                // TODO make sure to handle edge cases like deleted message
                friend.metaData.unreadMessageCount = 0;
                friend.saveMetaData();
            }
            if (!message.read && !message.localSender && App.isInForeground && message.type != FriendMessageType.requestAdd)
            {
                message.sent = true;
                message.confirmed = true;
                message.read = true;

                IxianHandler.localStorage.requestWriteMessages(friend.walletAddress, channel);

                // ★ THE BADGE DIAL (audit MAJOR): the TRUE count — the flush sites and every
                // live push must agree, or a muted chat's badge flickers on each update.
                UIHelpers.setContactStatus(friend.walletAddress, friend.online, friend.metaData.unreadMessageCount, "", 0);

                if (!friend.bot)
                {
                    // Send read confirmation
                    SpixiMessage msg_read = new SpixiMessage(SpixiMessageCode.msgRead, message.id, selectedChannel);
                    
                    StreamProcessor.sendSpixiMessage(friend, msg_read, null, null, true, true, false, false);
                }
            }
        }

        public void updateMessagesReadStatus()
        {
            if(friend == null)
            {
                return;
            }
            if (friend.metaData.lastMessage == null)
            {
                return;
            }
            if(friend.metaData.lastMessageChannel == selectedChannel)
            {
                if (!friend.metaData.lastMessage.read && !friend.metaData.lastMessage.localSender && App.isInForeground)
                {
                    friend.metaData.lastMessage.sent = true;
                    friend.metaData.lastMessage.confirmed = true;
                    friend.metaData.lastMessage.read = true;
                    friend.saveMetaData();
                }
            }
            var messages = friend.getMessages(selectedChannel);
            if (messages == null || messages.Count == 0)
            {
                return;
            }
            if (friend.metaData.unreadMessageCount > 0)
            {
                friend.metaData.unreadMessageCount = 0;
                friend.saveMetaData();
            }
            lock (messages)
            {
                int max_msg_count = 0;
                if (messages.Count > 50)
                {
                    max_msg_count = messages.Count - 50;
                }

                for (int i = messages.Count - 1; i >= max_msg_count; i--)
                {
                    FriendMessage msg = messages[i];
                    updateMessageReadStatus(msg, selectedChannel);
                }
            }
        }

        public void deleteMessage(byte[] msg_id, int channel)
        {
            if (channel == selectedChannel)
            {
                Utils.sendUiCommand(this, "deleteMessage", Crypto.hashToString(msg_id));
            }
        }

        public void showTyping()
        {
            Utils.sendUiCommand(this, "showUserTyping");
        }

        public void updateReactions(byte[] msg_id, int channel)
        {
            if (channel == selectedChannel)
            {
                FriendMessage? fm = friend.getMessages(channel).Find(x => x.id != null && x.id.SequenceEqual(msg_id));
                if (fm != null)
                {
                    updateReactions(fm);
                    // C11: in groups/bots, delivery/read confirmations arrive as received:/seen:
                    // aggregate reactions that flip OUR OWN message's sent/confirmed/read flags
                    // (Friend.addReaction, Ixian-Core) — but only the reaction pills were pushed, so
                    // the open chat's delivery tick stayed on the clock. Re-push the status so the
                    // tick advances. Guarded to localSender: only our own messages carry a delivery
                    // tick, and a received row would force a needless full re-render on every reaction.
                    if (fm.localSender)
                    {
                        updateMessage(fm, channel);
                    }
                }
            }
        }

        private void updateReactions(FriendMessage fm)
        {
            // C5: own reaction address — blind groups react under a derived address (see the like case above)
            var own_address = IxianHandler.getWalletStorage().getPrimaryAddress();
            if (friend.type == FriendType.Group
                && friend.metaData.botInfo.hideParticipantAddresses
                && !friend.users.getOwner().SequenceEqual(own_address))
            {
                own_address = GroupChat.DeriveGroupAddress(own_address, friend.metaData.botInfo.randomId);
            }

            var reactions_str = "";
            var own_reactions_str = "";
            foreach (var reaction in fm.reactions)
            {
                reactions_str += reaction.Key + ":" + reaction.Value.Count() + ";";
                // C5: which reaction keys the local user has added (trailing arg — never reorder)
                if (reaction.Value.Find(x => x.sender.SequenceEqual(own_address)) != null)
                {
                    own_reactions_str += reaction.Key + ";";
                }
            }
            Utils.sendUiCommand(this, "addReactions", Crypto.hashToString(fm.id), reactions_str, own_reactions_str);
        }

        public void updateMessage(FriendMessage message, int channel)
        {
            if (channel != selectedChannel)
            {
                return;
            }

            bool paid = false;
            if(message.transactionId != "")
            {
                paid = true;
            }
            Utils.sendUiCommand(this, "updateMessage", Crypto.hashToString(message.id), message.message, message.sent.ToString(), message.confirmed.ToString(), message.read.ToString(), paid.ToString(), message.errorSending.ToString());
        }

        public void updateFile(string uid, string progress, bool complete)
        {
            Utils.sendUiCommand(this, "updateFile", uid, progress, complete.ToString());
        }

        public void updateGroupChatNicks(Address address, string nick)
        {
            Utils.sendUiCommand(this, "updateGroupChatNicks", address.ToString(), nick);
        }

        public void updateTransactionStatus(string txid, bool verified)
        {
            string status = SpixiLocalization._SL("chat-payment-status-pending");
            string status_icon = "fa-clock";

            if (verified)
            {
                status = SpixiLocalization._SL("chat-payment-status-confirmed");
                status_icon = "fa-check-circle";
            }

            Utils.sendUiCommand(this, "updateTransactionStatus", txid, status, status_icon);
        }

        public void updateRequestFundsStatus(byte[] msg_id, byte[]? txid, string status)
        {
            string status_icon = "fa-clock";
            bool enableView = true;
            if(status == SpixiLocalization._SL("chat-payment-status-declined"))
            {
                status_icon = "fa-exclamation-circle";
                enableView = false;
            }

            string txid_string = "";
            if (txid != null)
                txid_string = Transaction.getTxIdString(txid);

            Utils.sendUiCommand(this, "updatePaymentRequestStatus", Crypto.hashToString(msg_id), txid_string, status, status_icon, enableView.ToString());
        }

        public void convertToBot()
        {
            popToRootAsync();
            if (homePage != null)
            {
                homePage.removeDetailContent(false);
                homePage.onChat(friend.walletAddress, null);
            } else
            {
                HomePage.Instance().onChat(friend.walletAddress, null);
            }
        }

        public void reloadScreen()
        {
            loadApps();
            loadMessages();
        }
        
        // Executed every second
        public override void updateScreen()
        {
            base.updateScreen();

            if (setNickname != friend.nickname)
            {
                Utils.sendUiCommand(this, "setNickname", friend.nickname);
                setNickname = friend.nickname;
            }

            if (friend.bot)
            {
                // #288 review: the unlock edge lives ONLY in the non-bot branch below. A
                // friend that BECOMES a bot while the pending latch is set (joinBot creates
                // the group-chat friend as RequestSent with bot == false; the bot metadata
                // lands later) would never receive showRequestSentModal("0") — a dead
                // composer + "Waiting for response…" + a Cancel-request strip on a chat the
                // user has already joined, until they back out and re-enter (onLoad resets
                // the latch). Bots are never pending-locked by design, so releasing is
                // unconditionally safe here.
                if (_waitingForContactConfirmation)
                {
                    _waitingForContactConfirmation = false;
                    Utils.sendUiCommand(this, "showRequestSentModal", "0");
                }
                long userCount = 0;
                if(friend.metaData != null && friend.metaData.botInfo != null)
                {
                    userCount = friend.metaData.botInfo.userCount;
                }
                Utils.sendUiCommand(this, "setOnlineStatus", memberCountText(userCount));
            }
            else if (friend.type == FriendType.Group)
            {
                // N22 (Damir, bot parity): a private group has no meaningful online or
                // offline state — its presence sub-line is the MEMBER COUNT, the same
                // localized string the bot branch pushes above. The count source is
                // friend.users.contacts.Count — the same one ContactDetails pushes for
                // the group-info surface (setGroupInfo, ContactDetails.xaml.cs:85), so
                // the topbar and the info pane can never disagree. Pushed only when the
                // text CHANGES: updateScreen ticks at 1 Hz and every setOnlineStatus
                // push rebuilds the shell topbar (the #288 churn class); the latch is
                // re-armed in onLoad so a WebView reload gets its count again. Groups
                // never set _waitingForContactConfirmation (both set sites exclude
                // FriendType.Group), so no unlock edge is lost by this hoist — and a
                // group can no longer hit the 1:1 online/offline branch below.
                // Approved groups only: a not-yet-approved group (the joinBot window,
                // legacy pending states) kept an EMPTY sub-line before this change —
                // "0 members" there would be new noise, so silence stays the status quo.
                if (friend.state == FriendState.Approved)
                {
                    int groupMemberCount = 0;
                    if (friend.users != null && friend.users.contacts != null)
                    {
                        groupMemberCount = friend.users.contacts.Count;
                    }
                    string groupCountText = memberCountText(groupMemberCount);
                    if (groupCountText != lastGroupCountPushed)
                    {
                        lastGroupCountPushed = groupCountText;
                        Utils.sendUiCommand(this, "setOnlineStatus", groupCountText);
                    }
                }
            }
            else
            {
                if (friend.state == FriendState.Approved)
                {
                    if (friend.online)
                    {
                        if (setOnlineStatus == false)
                        {
                            Utils.sendUiCommand(this, "setOnlineStatus", SpixiLocalization._SL("chat-online"));
                            setOnlineStatus = true;
                        }
                    }
                    else if (setOnlineStatus == true)
                    {
                        Utils.sendUiCommand(this, "setOnlineStatus", SpixiLocalization._SL("chat-offline"));
                        setOnlineStatus = false;
                    }

                    if (_waitingForContactConfirmation)
                    {
                        _waitingForContactConfirmation = false;
                        Utils.sendUiCommand(this, "showRequestSentModal", "0");
                        // #275 review A4: the sub-line still reads "Waiting for response" and
                        // the OFFLINE accept pushes no presence above (setOnlineStatus is
                        // false) — clear it explicitly. The online case already pushed
                        // chat-online this same tick.
                        if (!friend.online)
                        {
                            Utils.sendUiCommand(this, "setOnlineStatus", SpixiLocalization._SL("chat-offline"));
                        }
                    }
                }
                else if (friend.type != FriendType.Group)
                       // #275: any non-Approved state — legacy states must get the waiting
                       // presence + the accept→unlock edge-detector too, matching the
                       // chats-list pending predicate (HomePage:1606, state != Approved).
                       // #275 review A1: groups excluded — see the onLoad guard.
                {
                    if (!_waitingForContactConfirmation)
                    {
                        // #275 review A5: push ONCE on the pending edge, not at 1 Hz — the
                        // presence push tears down + rebuilds the shell topbar every second
                        // (chat.html renderTopbar), killing keyboard focus on topbar actions
                        // and churning the aria-live sub region.
                        Utils.sendUiCommand(this, "setOnlineStatus", SpixiLocalization._SL("chat-waiting-for-response"));
                        // #275 review A3: symmetric lock edge — a chat that regresses into a
                        // pending state MID-SESSION locks now, not only at onLoad.
                        // RequestReceived keeps the request-pane affordance (its generic
                        // 'incoming' lock derives shell-side from the waiting presence).
                        if (friend.state != FriendState.RequestReceived)
                        {
                            Utils.sendUiCommand(this, "showRequestSentModal", "1");
                        }
                        // Q1 review (#266/#267 loop): latch on EITHER pending state, not just the
                        // outgoing one set at onLoad. This turns the Approved branch above into a
                        // general "was pending → is now Approved" edge detector, so the composer
                        // unlock (showRequestSentModal "0") is pushed exactly once on EVERY accept
                        // path — including an incoming request accepted from the chats-list card
                        // on desktop, and an accept while the freshly-approved peer is OFFLINE.
                        _waitingForContactConfirmation = true;
                        setOnlineStatus = false;   // #275 review A4: re-arm the presence push for the next Approved tick
                    }
                }

            }

            // Show connectivity warning bar
            if (NetworkClientManager.getConnectedClients(true).Count() > 0)
            {
                if (!Config.enablePushNotifications
                    && (friend.relayNode == null || !StreamClientManager.isConnectedTo(friend.relayNode.hostname, true)))
                {
                    if (!warningDisplayed)
                    {
                        Utils.sendUiCommand(this, "showWarning", SpixiLocalization._SL("global-connecting-s2"));
                        warningDisplayed = true;
                    }
                }
                else
                {
                    if (warningDisplayed)
                    {
                        Utils.sendUiCommand(this, "showWarning", "");
                        warningDisplayed = false;
                    }
                    connectivityWarningDelayCounter = 0;
                }
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

            // Show the messages indicator
            int msgCount = FriendList.getUnreadMessageCount();
            if(msgCount > 0)
            {
                if (!unreadIndicatorDisplayed)
                {
                    Utils.sendUiCommand(this, "setUnreadIndicator", string.Format("{0}", msgCount));
                    unreadIndicatorDisplayed = true;
                }
            }
            else if (unreadIndicatorDisplayed)
            {
                Utils.sendUiCommand(this, "setUnreadIndicator", "0");
                unreadIndicatorDisplayed = false;
            }
        }

        protected override bool OnBackButtonPressed()
        {
            // N51: a shell overlay (sheet/menu, the channel selector, select mode)
            // consumes back before the page pops — the N50 ContactDetails order.
            // The shell self-heals a stale flag (chatBack re-syncs when nothing
            // was open), so back can never wedge.
            if (shellOverlayOpen)
            {
                Utils.sendUiCommand(this, "chatBack");
                return true;
            }
            popPageAsync();

            return true;
        }

        public override void onResume()
        {
            base.onResume();

            updateMessagesReadStatus();

            int unreadCount = FriendList.getUnreadMessageCount();
            if (unreadCount == 0)
            {
                SPushService.clearNotifications(unreadCount);
            }
        }
    }
}