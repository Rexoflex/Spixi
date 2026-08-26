using IXICore;
using IXICore.Meta;
using IXICore.SpixiBot;
using IXICore.Streaming;
using Spixi;                             // ★ #591: SSpixiCodecInfo (per-platform, namespace Spixi)
using Microsoft.Maui.ApplicationModel;   // F5-2 r2 (loop A-4): the posted drained-marker breadcrumb
using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using SPIXI.Lang;
using SPIXI.Meta;
using SPIXI.VoIP;                        // ★ #591: the Call action delegates to VoIPManager
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

            /* ★★ [CDPERF] PROBE (item 6, 2026-08-29) — TEMPORARY, remove when the number
             * is read. Damir reports chat info is slow to appear. `presentPreload`'s
             * 120 ms hold is 0 for this page now, but that hold was only PART of the
             * wait: page construction (generatePage re-localizes and rewrites a 168 KB
             * shell to disk on every open) and the WebView boot are the rest, and
             * nobody has ever measured which is which. One log line per open, so the
             * next device run answers it instead of the next guess. */
            perfOpenedAt = DateTime.Now;
            loadPage(webView, "contact_details.html");
            Logging.info("[CDPERF] " + (isGroup ? "group" : "contact") + " constructed +" + perfSince() + "ms (ctor + generatePage)");
        }

        // ★★ [CDPERF] PROBE — temporary, see the ctor.
        private DateTime perfOpenedAt = DateTime.Now;
        private int perfSince()
        {
            return (int)(DateTime.Now - perfOpenedAt).TotalMilliseconds;
        }

        // ★★ [CDPERF] PROBE — temporary. The moment the stage becomes visible.
        protected internal override void onPreloadPresented()
        {
            Logging.info("[CDPERF] presented +" + perfSince() + "ms");
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
            Logging.info("[CDPERF] document loaded +" + perfSince() + "ms");   // ★★ probe, temporary

            // #247: pane layout FIRST — coalesces ahead of the present, so the shell
            // never paints a takeover layout that reflows into the pane grammar.
            if (paneCol != null)
            {
                Utils.sendUiCommand(this, "setPaneMode", paneCol);
            }

            // #248: entry-dependent context (chat header/row-menu = 'chat' → "Chat
            // info"/"Group info", no Message action; contacts directory = 'contact').
            Utils.sendUiCommand(this, "setContext", chatContext ? "chat" : "contact");

            /* ★★ #591 (audit MAJOR): the Call action is REVEALED, never assumed.
             * The shell has no notion of relation state, so an unconditional button
             * would ring on a contact who cannot receive it — send a request, open Chat
             * info, tap Call, and `initiateCall` runs the whole path: the permission
             * prompt, a call bubble written into history, CallPage presented, a dial
             * tone, power locks, 45 seconds of ringing, and the peer gets nothing. That
             * is the ⑪ delivery-lie class the composer lock (#275) exists to prevent,
             * one tap away on the same contact.
             * Same gate and the SAME VERB as the chat header (SingleChatPage:889) —
             * one rule for "can this person be called", not two that can drift. */
            if (!isGroup
                && SSpixiCodecInfo.getSupportedAudioCodecs().Count > 0
                && friend.state == FriendState.Approved)
            {
                Utils.sendUiCommand(this, "showCallButton", "");
            }

            if (isGroup)
            {
                // #248 GROUP INFO shell-side (Damir F5 item 2): this page now carries
                // the group surface too, so group info gets the same desktop pane /
                // takeover behavior as 1:1. Meta + full roster (masking mirrors
                // SingleChatPage.loadContacts for blind groups).
                // ★★ #613: this line claimed to mirror SingleChatPage.loadContacts and did
                // not — that one qualifies on FriendType.Group, exactly as legacy does, and
                // this one did not. THIS is the live surface (#249 routes all group and bot
                // info here), so a public bot channel's whole roster rendered as [Unknown].
                bool blind = Utils.hidesParticipants(friend);
                bool amAdmin = friend.metaData.botInfo != null && friend.metaData.botInfo.admin;
                bool notifications = friend.metaData.botInfo == null || friend.metaData.botInfo.sendNotification;
                /* Owner address: identity-revealing → NEVER sent for a blind group.
                 *
                 * ★★ V-8 (#46 loop 2026-08-29): this gated on `!blind` ALONE, and three
                 * lines below `amOwner` is correctly gated on FriendType.Group with the
                 * reason written out — in a BOT room getOwner() degrades to "the first
                 * roster entry we happened to learn", reshuffled by the 500-cap eviction,
                 * so an arbitrary participant of a public channel was branded its owner.
                 * #616 fixed exactly this in SingleChatPage:721 — the surface #249 records
                 * as unreachable — and left the live one. #613 then WIDENED it: before
                 * #613 the read here was the raw flag, so a FLAGGED bot room suppressed
                 * the owner and afterwards pushed one.
                 * Same predicate as SingleChatPage:726, verbatim. */
                bool blindGroup = friend.type != FriendType.Group || blind;
                string owner = "";
                if (!blindGroup)
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

            /* ★ NOTIF-2 (Damir's 2026-08-21 block) — the per-1:1 mute, the one surface in
             * his notifications ask that had no bridge verb at all (the shell carried
             * `notifications: OFF — no bridge verb (§9)` since #142).
             *
             * A 1:1 contact has NO botInfo — that object exists only for groups and bots
             * (GroupChat.cs:56/:103, CoreStreamProcessor.cs:2680) — so there is nowhere in
             * Ixian-Core to put the flag, and adding one would be a Core change this
             * session may not make. It is therefore a LOCAL, device-side preference:
             * muting someone changes what THIS device does and tells the sender nothing,
             * which is also the right privacy answer.
             *
             * Pushed for the 1:1 case only; the group surface already carries its own
             * value as setGroupInfo's fourth argument, and that one IS synced. */
            /* ⚠ AUDIT MINOR: the READ gate must match the WRITE gate. The writes below branch
             * on `friend.metaData.botInfo != null`, not on `isGroup` — so a group or bot whose
             * BotInfo has not arrived yet takes the LOCAL-mute write branch while this push
             * was skipped, and the shell then showed the default-ON group value over a mute
             * that was really in force. The toggle appeared to reset itself on reopen. Both
             * sides now ask the same question. */
            if (friend.metaData == null || friend.metaData.botInfo == null)
            {
                Utils.sendUiCommand(this, "setContactNotifications",
                    SNotificationPrefs.isContactMuted(friend.walletAddress.ToString()) ? "0" : "1");
            }

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
            else if (current_url.Equals("ixian:cdpainted", StringComparison.Ordinal))
            {
                // ★★ [CDPERF] PROBE — temporary. The shell says its first real content
                // frame is up. Remove this branch with the rest of the probe.
                Logging.info("[CDPERF] content painted +" + perfSince() + "ms");
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
            else if (current_url.StartsWith("ixian:removecontact:", StringComparison.Ordinal))
            {
                /* ★★ REMOVE-CONTACT SPEC §4 (Damir, screenshots 2026-08-28): ONE FLOW.
                 * This page used to answer a refusal with a dead end — "Cannot remove
                 * contact — this contact is a member of these groups: • seengroup" and a
                 * single OK. It named the obstacle and offered no way past it, while the
                 * chats row already had the actionable answer: tick the groups, leave
                 * them, remove the contact, in one gesture.
                 * The shell opens the SAME sheet now, so this page speaks the SAME verb
                 * and the SAME helper as HomePage.onRemoveContactFor — one implementation
                 * of "remove this contact", not two that can drift. The payload is the
                 * leave flag alone: this page IS one contact.
                 * `ixian:remove` and the removeBlocked push are RETIRED with it. */
                string leaveArg = current_url.Substring("ixian:removecontact:".Length).Trim();
                bool leaveShared = leaveArg == "1";
                List<string> removeBlockers = new List<string>();
                string removeStatus = "fail";
                try
                {
                    removeStatus = SContacts.removeContact(friend, leaveShared, out removeBlockers);
                }
                catch (Exception ex)
                {
                    Logging.error("ixian:removecontact failed: " + ex.Message);
                }
                try
                {
                    List<string> args = new List<string> { friend.walletAddress.ToString(), removeStatus };
                    args.AddRange(removeBlockers);   // name/address pairs on "blocked" — each arg transport-escaped
                    Utils.sendUiCommand(this, "removeContactResult", args.ToArray());
                }
                catch (Exception) { }
                if (removeStatus == "ok" || removeStatus == "left")
                {
                    UIHelpers.shouldRefreshContacts = true;
                    popToRootAsync();
                    var homePage = HomePage.Instance();
                    homePage?.removeDetailContent();
                    // iOS-28: the refresh flag is only consumed by the 2s tick, but that is
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
            else if (current_url.StartsWith("ixian:openChat:", StringComparison.Ordinal))
            {
                // ★ A4: a shared-group row → that group's conversation. Close this
                // details overlay first, then the host's onChat (wide/narrow aware) —
                // the ixian:chat grammar, address-scoped. Peer-supplied token: parsed
                // defensively (the A-4 rule), unknown address = no-op.
                try
                {
                    string target = current_url.Substring("ixian:openChat:".Length).Trim();
                    Address targetAddr = new Address(target);
                    if (FriendList.getFriend(targetAddr) != null)
                    {
                        popPageAsync();
                        HomePage.Instance()?.onChat(targetAddr, null);
                    }
                }
                catch (Exception)
                {
                    Logging.warn("ixian:openChat: malformed address");   // no ex.Message — carries the token
                }
            }
            else if (current_url.Equals("ixian:sharedGroups", StringComparison.Ordinal))
            {
                // ★ Batch A (#540) A4: the 1:1 info strip "groups you are both in" —
                // read-only, name/address pairs (each arg transport-escaped; the shell
                // renders via textContent). The same enumeration the remove-contact
                // refusal names (N27), now also asked up front.
                try
                {
                    List<string> args = new List<string> { friend.walletAddress.ToString() };
                    args.AddRange(SContacts.sharedGroups(friend));
                    Utils.sendUiCommand(this, "setSharedGroups", args.ToArray());
                }
                catch (Exception ex)
                {
                    Logging.warn("ixian:sharedGroups: " + ex.Message);
                }
            }
            else if (current_url.Equals("ixian:request", StringComparison.Ordinal))
            {
                hostNav.PushAsync(new WalletReceivePage(friend), Config.defaultXamarinAnimations);   // #225: root nav
            }
            else if (current_url.Equals("ixian:send", StringComparison.Ordinal))
            {
                hostNav.PushAsync(new WalletSendPage(new ExtendedAddress(friend.walletAddress, AddressPaymentFlag.OfflineTag, null)), Config.defaultXamarinAnimations);   // #225: root nav
            }
            else if (current_url.Equals("ixian:call", StringComparison.Ordinal))
            {
                /* ★ #591 (Damir's details mockup): the action row gained CALL, and this
                 * page had no such verb — SingleChatPage was the only handler, so the
                 * button would have been dead the day it shipped (#215).
                 *
                 * Delegates to the SAME VoIPManager entry the chat header uses, so the
                 * call surface, its ring, its timeout and its lock interaction are all
                 * unchanged (#270/#272). 1:1 ONLY, and the guard is here as well as in
                 * the shell: a group has no call target, and `friend` on a group page
                 * would hand VoIPManager a room address.
                 *
                 * ⚠ NO hangup branch, deliberately. The chat header is a TOGGLE because
                 * it lives inside the conversation the call belongs to; this row says
                 * "Call" and nothing else, so making it silently hang up an unrelated
                 * live call would be a destructive action behind a non-destructive
                 * label. An in-progress call is ended from the call surface itself. */
                /* ⚠ The state clause is the belt for the reveal above: a contact can be
                 * removed or fall out of Approved between the push and the tap. Without
                 * it this is the ⑪ delivery lie (audit MAJOR). Bots and groups are
                 * covered by `isGroup` (:46 = Group || bot). */
                if (friend != null && !isGroup && friend.state == FriendState.Approved
                    && !VoIPManager.isInitiated())
                {
                    VoIPManager.initiateCall(friend);
                }
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
                // (group AND bot: sendLeave + immediate removeFriend, #567).
                if (friend.bot || friend.type == FriendType.Group)
                {
                    /* ★ F5-2 (#555, r2 per loop A-4/A-5) — BREADCRUMBS. The bot-group
                     * removal crash reached no log. Each step logs BEFORE it runs, so
                     * the last line in ixian.log brackets the crash site on the next
                     * repro. No address in any line (the handover-gate log rule).
                     * ⚠ ONE flush before the navigation work + one in the posted
                     * drained-marker (A-5: Logging.flush is an unbounded spin on the
                     * UI thread — the writer thread drains continuously anyway, the
                     * flush is the belt, and four of them was ANR-shaped).
                     * ⚠ "dispatched", not "done": popToRootAsync and the alert are
                     * fire-and-forget — the async teardown runs on LATER main-thread
                     * turns (A-4). The posted marker below is queued AFTER the nav
                     * lambda, so it brackets that first async turn too; a crash after
                     * it is in still-later navigation work. */
                    IXICore.Meta.Logging.info("[CRASHDIAG] leave: start (bot=" + friend.bot + ")");
                    // ★ #567: ONE grammar for group AND bot — sendLeave + immediate
                    // removeFriend (the pendingDeletion wait fed the BE §1e-6 core
                    // crash; see SContacts.leaveGroup for the whole mechanism).
                    CoreStreamProcessor.sendLeave(friend, null);
                    FriendList.removeFriend(friend);
                    UIHelpers.shouldRefreshContacts = true;
                    IXICore.Meta.Logging.info("[CRASHDIAG] leave: sent, presenting the alert");
                    displaySpixiAlert(SpixiLocalization._SL("contact-details-removedcontact-title"), SpixiLocalization._SL("contact-details-removedcontact-text"), SpixiLocalization._SL("global-dialog-ok"));
                    IXICore.Meta.Logging.info("[CRASHDIAG] leave: popping to root");
                    IXICore.Meta.Logging.flush();
                    popToRootAsync();
                    HomePage.Instance()?.removeDetailContent();
                    IXICore.Meta.Logging.info("[CRASHDIAG] leave: teardown dispatched");
                    MainThread.BeginInvokeOnMainThread(() =>
                    {
                        IXICore.Meta.Logging.info("[CRASHDIAG] leave: first async nav turn drained");
                        IXICore.Meta.Logging.flush();
                    });
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
                else
                {
                    // ★ NOTIF-2: the 1:1 case. The SAME verb rather than a new one — the
                    // shell is asking the identical question and only the storage differs,
                    // so an old shell that already sends this verb starts working the day
                    // the capability is enabled. Local only: nothing is sent to the peer.
                    SNotificationPrefs.setContactMuted(friend.walletAddress.ToString(), false);
                }
                /* ⚠ AUDIT MINOR: tell the CHAT LIST. Muting from here agreed with the row menu
                 * about STORAGE but never told the list, so on a wide layout the row kept
                 * showing un-muted (and its full badge) until some unrelated event happened to
                 * refresh contacts. Two surfaces, one truth. */
                UIHelpers.shouldRefreshContacts = true;
            }
            else if (current_url.StartsWith("ixian:disableNotifications"))
            {
                if (friend.metaData.botInfo != null)
                {
                    friend.metaData.botInfo.sendNotification = false;
                    friend.saveMetaData();
                    StreamProcessor.sendBotAction(friend, SpixiBotActionCode.enableNotifications, new byte[1] { 0 }, 0, true);
                }
                else
                {
                    // ★ NOTIF-2: the 1:1 case — see the enable branch above.
                    SNotificationPrefs.setContactMuted(friend.walletAddress.ToString(), true);
                }
                /* ⚠ AUDIT MINOR: tell the CHAT LIST. Muting from here agreed with the row menu
                 * about STORAGE but never told the list, so on a wide layout the row kept
                 * showing un-muted (and its full badge) until some unrelated event happened to
                 * refresh contacts. Two surfaces, one truth. */
                UIHelpers.shouldRefreshContacts = true;
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

        /* ★★ REMOVE-CONTACT SPEC §4: `onRemove()` and its `removeBlocked` push are GONE.
         * That method was the dead end — it re-ran Core's isFriendInGroup predicate only
         * to NAME the blocking groups in a modal with a single OK, and it was a second,
         * drifting implementation of "remove this contact" beside SContacts.removeContact.
         * The verb above uses the shared helper, which also knows how to LEAVE the
         * blocking groups first, which is the whole point of the sheet. */

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