using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.Controls;
using System;
using System.Collections.Generic;
using System.Linq;

namespace SPIXI
{
    public static class UIHelpers
    {
        public static bool shouldRefreshContacts = false;
        public static bool shouldRefreshTransactions = false;
        public static bool shouldRefreshApps = false;
        public static bool refreshAppRequests = true;

        /* ═══ ★★ #647 ROUND 4 — "DOES ANY OTHER MEMBER HAVE THIS MESSAGE?" ════════
         *
         * ★ THE RULE, AS DAMIR RULED IT (2026-08-27):
         *   Any reaction on a message, from any address that is NOT the local user, is
         *   evidence that this member has the message.
         *
         * The rule names NO reaction key, and that is the point. You cannot read a
         * message that you do not have. You cannot download it. You cannot like it. You
         * cannot tip it. Every reaction is evidence. Nothing can be added to the rule,
         * so the rule can never need a fourth patch.
         *
         * ★ WHY A RULE REPLACED A LIST. The old answer was an enumerated list of
         * reaction keys. Each review round added one more key, and each round found one
         * more surface that still held the old list:
         *     session A   `received`
         *     round 1     `received` or `seen`
         *     round 2     `received` or `seen` or `fileReceived`
         *     round 3     `like` and `tip` are receipts too, and the shell then counted
         *                 three keys while C# counted two.
         * The list is open-ended. THAT is the defect, not any one missing key.
         *
         * ★★ THE ANSWER IS A BOOLEAN, AND THE WALK STOPS AT THE FIRST PROOF.
         * (Round 4, `_review/review4.md` MAJOR-2.) One reaction record from an address
         * that is not ours proves that at least one other member has the message. The
         * walk returns TRUE there. It reads no more records. The answer is exact.
         *
         * ⚠ THERE IS NO MEMBER COUNT HERE ANY MORE. DO NOT ADD ONE BACK.
         * The old body also counted DISTINCT senders. A distinct count must
         * de-duplicate ACROSS the reaction keys, because one member can hold a `seen`
         * AND a `like`, and Ixian-Core de-duplicates by sender inside ONE key only.
         * That test was pairwise: n(n-1)/2 `SequenceEqual` calls for n reaction
         * records. It ran inside `lock (message.reactions)`, on the OnUpdateUI tick,
         * about every one to two seconds, for every group row whose last message is
         * ours and is not yet `confirmed`. `confirmed` latches only at the FULL member
         * count, so a large private group stays on that branch permanently.
         * NO C# caller read the count. It is DELETED, not kept behind a flag: dead code
         * with a guarantee attached is worse than the gap, and this project deleted two
         * `deliveryTicks` call sites for exactly that reason.
         *
         * ⚠ A LATER CALLER THAT NEEDS "HOW MANY" MUST WRITE ITS OWN METHOD, with its
         * own name and a live caller in the same batch. A count question costs more
         * than this boolean question. Do not make every caller pay for one caller.
         *
         * ★ IT EXCLUDES THE LOCAL USER. The `like` case and the tip leg in
         * `SingleChatPage.onContextAction` store OUR OWN reaction on the message. Our
         * own like is not evidence that another member has the message. See
         * `ownReactionAddresses` below: a blind group stores our like under a DERIVED
         * address, so both of our addresses are excluded. The early return makes this
         * exclusion MORE important, not less. It is the only test between a reaction
         * record and a TRUE answer.
         *
         * ★ IT IS READ-ONLY AND IT TAKES THE INNERMOST LOCK. `lock (message.reactions)`
         * is the lock the three former readers took. It is also the lock the reaction
         * push takes. The wallet read and the address derivation run BEFORE the lock, so
         * nothing calls out while the lock is held.
         *
         * ★★ IT FAILS SOFT, AND THE SAFE ANSWER BELONGS TO THE CALLER.
         * `answerWhenUnreadable` carries that asymmetry. Do not remove it. Do not give
         * it a default value.
         *   · The bubble tick and the chats row pass FALSE. An unreadable set must not
         *     claim a delivery that we cannot see.
         *   · `markGroupCopyFailed` passes TRUE. A false red FAILED is UNRECOVERABLE,
         *     because `errorSending` is written in one place in Ixian-Core and is
         *     cleared NOWHERE.
         * One method, two directions, stated once. Do not flatten them.
         *
         * ⚠ GROUPS ONLY. All three call sites test the room type before they call. A 1:1
         * chat and a BOT room never reach this method, so their behaviour does not
         * change. Keep that gate at the call site. */
        public static bool anyOtherMemberHasMessage(Friend? friend, FriendMessage? message, bool answerWhenUnreadable)
        {
            if (message == null)
            {
                return answerWhenUnreadable;
            }
            // The wallet read and the derivation run OUTSIDE the lock. See the header.
            List<Address> ownAddresses = ownReactionAddresses(friend);
            try
            {
                lock (message.reactions)
                {
                    // The walk reads EVERY reaction key. It names none of them.
                    var senders = message.reactions
                        .SelectMany(entry => entry.Value)
                        .Where(reaction => reaction != null && reaction.sender != null)
                        .Select(reaction => reaction.sender);
                    foreach (Address sender in senders)
                    {
                        bool isOwn = false;
                        foreach (Address mine in ownAddresses)
                        {
                            if (mine != null && sender.SequenceEqual(mine))
                            {
                                isOwn = true;
                                break;
                            }
                        }
                        if (isOwn)
                        {
                            continue;
                        }
                        /* ★ THE EARLY ANSWER. This sender is not us. That is proof that
                         * one other member has the message. The caller asked a boolean
                         * question, so stop here. Do not read the remaining records, and
                         * do not compare this sender with any other sender. */
                        return true;
                    }
                }
            }
            catch (Exception ex)
            {
                Logging.warn("anyOtherMemberHasMessage: the reaction set is unreadable. " + ex.Message);
                return answerWhenUnreadable;
            }
            // Every reaction is ours, or there is no reaction. There is no evidence.
            return false;
        }

        /* ★ THE LOCAL USER CAN HOLD TWO ADDRESSES ON ONE MESSAGE.
         *
         * The `like` case in `SingleChatPage.onContextAction` stores our reaction under a
         * DERIVED address when the room is blind and we are not the owner. The tip leg
         * stores its reaction under the primary address. Exclude both addresses.
         *
         * ⚠ THE CONDITION IS COPIED FROM THE WRITER, TERM FOR TERM. Read
         * `SingleChatPage.updateReactions(FriendMessage)` for why the `botInfo` term
         * stays beside `Utils.hidesParticipants`. That predicate fails CLOSED, and
         * `GroupChat.DeriveGroupAddress` needs `botInfo.randomId`. A reader that derives
         * on a condition the writer does not use reads the wrong address.
         *
         * ⚠ IT FAILS TO THE PRIMARY ADDRESS ALONE, and that is a known small risk. If
         * the derivation throws in a blind group, our own `like` is then counted as a
         * member. The bubble can show a double check that one member does not support.
         * The opposite failure — returning no address at all — counts our own like in
         * EVERY room, so this direction is the smaller error. */
        private static List<Address> ownReactionAddresses(Friend? friend)
        {
            List<Address> addresses = new List<Address>();
            try
            {
                Address? primary = IxianHandler.getWalletStorage().getPrimaryAddress();
                if (primary == null)
                {
                    return addresses;
                }
                addresses.Add(primary);
                // Every term below is copied from the WRITER. Keep the two equal.
                if (friend == null || !Utils.hidesParticipants(friend))
                {
                    return addresses;
                }
                var botInfo = friend.metaData?.botInfo;
                if (botInfo == null)
                {
                    return addresses;
                }
                Address? owner = friend.users?.getOwner();
                if (owner == null || owner.SequenceEqual(primary))
                {
                    return addresses;
                }
                addresses.Add(GroupChat.DeriveGroupAddress(primary, botInfo.randomId));
            }
            catch (Exception ex)
            {
                Logging.warn("ownReactionAddresses: the own address is not resolved. " + ex.Message);
            }
            return addresses;
        }

        /* ★★ #46 loop ROUND 2 (review-cs MAJOR-3) — SIX MORE `Last()` SITES.
         *
         * Round 1 replaced `Last()` with `LastOrDefault()` at HomePage.xaml.cs:3326 and
         * stopped there. The same statement stood SIX more times in this file, at the exit
         * of every method below. `Last()` THROWS "Sequence contains no elements" on an
         * empty NavigationStack, and the stack is empty during a teardown window — a
         * language change, an account switch, a shutdown.
         *
         * ★ THE COST IS NOT THE SAME AT EVERY CALLER, WHICH IS WHY ALL SIX ARE FIXED:
         *   · `StreamProcessor.receiveData` wraps its switch in a try/catch, so a throw
         *     there costs the rest of one message.
         *   · `SpixiPendingMessageProcessor.onMessageSent` and `onMessageExpired` have NO
         *     try/catch on the Spixi side, so a throw leaves our code and enters Core's
         *     pending-message loop, on the NETWORK thread.
         *   · `setContactStatus` threw BEFORE its own `else { shouldRefreshContacts =
         *     true; }` fallback, so the fallback could never run.
         *
         * ★ NO REAL UI PUSH IS DROPPED BY THIS. Every site already tests `page != null &&
         * page is HomePage`, so a null answer takes the path the code always took when the
         * top page was not HomePage. In `setContactStatus` that path is the refresh flag,
         * which is the correct recovery. The chat-page push above each site is a separate
         * statement through `Utils.getChatPage`, and it is untouched.
         *
         * ★ The `?.` chain covers `MainPage` as well. It is null before CreateWindow
         * assigns it and during teardown, and these hooks run on the network thread, which
         * does not wait for either. A NullReferenceException there is the same crash class
         * as the throw this fix removes. */
        public static void setContactStatus(Address address, bool online, int unread, string excerpt, long timestamp)
        {
            Page? page = Application.Current?.MainPage?.Navigation?.NavigationStack?.LastOrDefault();
            if (page != null && page is HomePage)
            {
                ((HomePage)page).setContactStatus(address, online, unread, excerpt, timestamp);
            }
            else
            {
                shouldRefreshContacts = true;
            }
        }

        /* ★ N71 (#421) — THE ONE PLACE THAT LISTS THE LIVE SHELL SURFACES.
         *
         * Every "re-theme them all" helper this project has written has missed a
         * collection, and each miss cost a Damir F5: #251 (the EmptyDetail resting
         * pane), #284 (getChatPages), #288 MAJOR-1 (the open tx-detail pane kept the
         * old hide flag). The pattern is always the same — a new live surface is added
         * somewhere, and the enumerations that should have grown do not, because there
         * is no single one to grow. So there is one now, and both sweeps below run on
         * it. A new live surface is added HERE, once.
         *
         * Skipped by design: a page whose content we did NOT generate (MiniAppPage —
         * ★ N66 review MAJOR-1). We cannot re-theme third-party content, and reload()
         * would only restart it.
         *
         * `includeModal` is the ONE real difference between the two callers, and it is
         * not a wart — it is the reason MINOR-2 was left open in #385. The MODAL stack
         * (ContributorsPage, DevPage, the call-surface fallback) must never be
         * RELOADED on a theme flip: reloading a page during a live call is exactly the
         * risk that kept it out. A setTheme PUSH carries none of that risk — it swaps
         * a CSS attribute on a document that keeps running — so the push path sweeps
         * the modal stack and the reload path still does not. */
        private static List<SpixiContentPage> getLiveShellPages(bool includeModal)
        {
            List<SpixiContentPage> pages = new List<SpixiContentPage>();

            void add(Page? p)
            {
                if (p is SpixiContentPage sp && sp.hasGeneratedContent && !pages.Contains(sp))
                {
                    pages.Add(sp);
                }
            }

            var nav = Application.Current?.MainPage?.Navigation;
            if (nav?.NavigationStack != null)
            {
                foreach (Page p in nav.NavigationStack)
                {
                    add(p);
                }
            }
            if (includeModal && nav?.ModalStack != null)
            {
                foreach (Page p in nav.ModalStack)
                {
                    // A modal is often wrapped in a NavigationPage — reach the page inside.
                    add(p);
                    if (p is NavigationPage np && np.Navigation?.NavigationStack != null)
                    {
                        foreach (Page inner in np.Navigation.NavigationStack)
                        {
                            add(inner);
                        }
                    }
                }
            }
            // #225: overlay pages are live surfaces OUTSIDE the NavigationStack.
            foreach (SpixiContentPage overlay in SpixiContentPage.getOverlayPages())
            {
                add(overlay);
            }
            // #251: the default detail (EmptyDetail in HomePage.rightContent) is in
            // none of the collections above.
            // AND-1 (#329): read-only — must NEVER construct (pre-login theme reload).
            add(HomePage.InstanceOrNull()?.getDefaultDetailContent());
            /* ★ #46 audit: the STAGING slot, and PUSH-ONLY. pushPageLoaded is
             * load-then-present, so for the whole boot window the incoming page lives in
             * activePreload and is in no other collection — a theme flip landing there
             * reached nothing, and the page presented in the old theme and stayed there
             * (its document was generated with the old baked *SL{SpixiThemeName}).
             * It must NOT join the reload path: a reload mid-stage destroys the
             * ixian:onload signal the present is waiting for, and the page never appears.
             * Same reasoning, and the same slot, as #340's B-MAJOR-1 close-audit. */
            if (includeModal)
            {
                add(SpixiContentPage.getStagingPage());
                /* ★ #46 audit: the in-place CALL surface. CallPage normally stages itself
                 * as a ContentView inside the overlay host's grid and is held in a private
                 * static — no NavigationStack, no ModalStack, no overlayStack — so only its
                 * modal FALLBACK path was ever reachable here. Pre-existing (the old
                 * reloadAllPages missed it too), but this method now CLAIMS to be the one
                 * complete list, and a claim like that has to be true or it is worse than
                 * no claim. Push-only, like the staging slot: reloading a page during a
                 * live call is precisely the risk that kept the modal stack out of the
                 * reload sweep in the first place (#385 MINOR-2). */
                add(CallPage.getLiveSurface());
            }

            return pages;
        }

        /* ★ N71 (#421) — the OS-theme-flip path PUSHES, it no longer reloads.
         *
         * The explicit Light/Dark pick has always pushed `setTheme` (SettingsPage's
         * ixian:appearance branch) and it works. The OS-follow path called
         * reloadAllPages instead, and once #385/N66 made that path REACHABLE the cost
         * arrived with it — N78: an evening OS auto-switch builds a fresh document,
         * home.html's Fix #8 unconditionally sends ixian:tab:tab1 on every boot, and
         * the user is yanked from wherever they were to Chats with every empty-state
         * gate re-armed. A reload also discards unsaved input (#385 MINOR-3: a typed
         * nickname, a picked avatar, a half-typed password).
         *
         * A PUSH creates no new document, so Fix #8 never fires and there is nothing
         * to re-arm. That is why N71 closes BOTH halves of the report, and why Fix #8
         * must NOT be patched on its own — it is correct for the case it was written
         * for (the Save-from-Account reload echo, #8).
         *
         * ★ #410: the name is READ here, per push, never remembered.
         * getResolvedAppearanceName resolves through isPlatformDark() live, so it is
         * the current OS answer and not the boot one. */
        /* ★ N71(a) — DAMIR F5 2026-08-19, and the sharpest lesson in this batch.
         *
         * There is NO exclusion here, and there must not be one. The #46 review round
         * asked for an `except = this` on the pick path, reasoning that the picker had
         * already applied the theme locally and that a self-push would poison its cached
         * "what does System resolve to" answer. The reasoning about the poisoning was
         * right. The remedy was wrong, and shipping it ALONGSIDE the shell-side guard
         * re-opened the exact defect this batch was written to close:
         *
         *   OS dark - appearance Light - the Account is open, so its document booted
         *   LIGHT and cached autoTheme='light'. The user picks SYSTEM. The shell paints
         *   from its cache, so light. C# resolves automatic to dark and pushes it to
         *   every surface EXCEPT this one. The whole app goes dark and the Account stays
         *   light: Damir's report, and the R5 N71(a) repro verbatim.
         *
         * The shell-side guard alone is correct AND complete, because it keys on the
         * SELECTED appearance rather than on who sent the push:
         *   - pick Light/Dark -> state.theme != 0 -> the pushed name is the PICK, so the
         *     cache is left alone. No poisoning. That is the review's concern, handled.
         *   - pick System     -> state.theme == 0 -> the pushed name IS the OS answer, so
         *     the cache refreshes and the Account follows. That is N71(a), handled.
         * One rule, both cases, and the page that owns the picker is never left out of
         * the sweep it is supposed to be part of.
         *
         * The parameter is GONE rather than left unused: an unused exclusion hook on a
         * sweep is an invitation to re-add exactly this bug. */
        public static void pushThemeToAllPages()
        {
            string themeName = ThemeManager.getResolvedAppearanceName();
            foreach (SpixiContentPage page in getLiveShellPages(true))
            {
                try
                {
                    /* ★ #46 audit MAJOR: not every live page re-themes from a push, and
                     * the first cut of this method quietly assumed they all do. The
                     * remaining LEGACY pages (hasLegacyPageChrome below is the authoritative
                     * list — a count here drifted twice, review N-2; L1 deleted the wallet
                     * send/receive trio after this was written) have no setTheme
                     * global: their theme is a <link href="css/*SL{SpixiThemeMode}"> baked
                     * at generatePage time, so only a regenerate moves it. Pushing at them
                     * did two wrong things at once — it threw an uncaught ReferenceError
                     * into the WebView (bare identifier, evaluated before the dispatcher
                     * is entered, #258) and it left the page in yesterday's theme, ON THE
                     * MONEY PATH.
                     *
                     * So they keep reload(), which is EXACTLY what they got before this
                     * batch. That is the deliberate choice: the security handover gate
                     * says the redesign must INTRODUCE nothing, and "a theme flip reloads
                     * the legacy send screen" is inherited behaviour, not ours. It does
                     * carry the #385 MINOR-3 cost (a half-typed amount is discarded) — but
                     * that cost exists at the baseline too, and quietly changing money-path
                     * behaviour inside a theming batch is how a regression gets attributed
                     * to the wrong change. Logged for Damir instead. */
                    if (!page.rethemesByPush)
                    {
                        /* break-my-verdict NIT (forward guard, not a live bug): a page in
                         * the STAGING slot must never be reloaded — that destroys the
                         * ixian:onload the present is waiting for and the page never
                         * appears. Unreachable today because every staged page loads a
                         * redesigned shell, so this can only fire if a legacy page is
                         * ever staged. Skip it rather than break the present. */
                        if (page == SpixiContentPage.getStagingPage())
                        {
                            continue;
                        }
                        page.reload();
                        continue;
                    }
                    Utils.sendUiCommand(page, "setTheme", themeName);
                    /* ★ #46 audit: the NATIVE backing has to move with the shell. reload()
                     * ran applyPageSurfaceColor on the way through; a push does not, and
                     * pageSurfaceColor is baked at loadPage time. Left stale it is visible
                     * exactly where it was introduced to help — the pre-paint frame (N1/N3)
                     * and the keyboard/transition backing — as a light band behind a dark
                     * shell. Marshalled because it touches BackgroundColor.
                     *
                     * ★ break-my-verdict MAJOR-1: this is applyPageSurfaceColor and NOT
                     * applyPlatformPageChrome, which was the first cut. That method looks
                     * page-local and is not — on Android it calls setEdgeToEdge, which
                     * paints the ONE activity root view and the ONE window insets
                     * controller, so running it per page made the LAST page enumerated
                     * decide the system-bar glyph colour and silently overwrote the
                     * repaintSystemBarsFor(null) that both callers run from the VISIBLE
                     * page just before the sweep. On the Wallet tab that is dark glyphs
                     * over the dark hero: the #407–#410 bar round, undone. */
                    MainThread.BeginInvokeOnMainThread(() =>
                    {
                        try { page.applyPageSurfaceColor(); }
                        catch (Exception ex) { Logging.warn("pushThemeToAllPages (surface): " + ex.Message); }
                    });
                }
                catch (Exception ex) { Logging.warn("pushThemeToAllPages: " + ex.Message); }
            }
            /* #315: the PARKED overlay (the warm Account, iOS-46) is deliberately in
             * none of the collections. It stays DISPOSED rather than pushed, and that
             * is a deliberate choice, not an oversight: a parked page is closed, so
             * dropping it costs the user nothing visible and the next open rebuilds it
             * correct — whereas pushing into a WebView that is parented but never
             * presented is an unverified claim, and the failure mode is the #315 one
             * (Account re-presents in yesterday's theme, forever). */
            SpixiContentPage.disposeParkedOverlay();
            /* ★ break-my-verdict MAJOR-1, belt: give the VISIBLE page the last word on
             * the system bars. The legacy branch above calls reload(), whose own chrome
             * pass lands ASYNCHRONOUSLY once the page finishes loading — and that pass
             * does repaint the global bars from whichever page it belongs to. Re-asserting
             * here is cheap, idempotent, and it encodes the ★ #410 rule directly: the
             * bars are read from the surface that is actually on screen, never from
             * whatever happened to be last in a list. */
            MainThread.BeginInvokeOnMainThread(() =>
            {
                try { SpixiContentPage.repaintSystemBarsFor(null); }
                catch (Exception ex) { Logging.warn("pushThemeToAllPages (bars): " + ex.Message); }
            });
        }

        // Reload the webview contents on all pages in the navigation stack
        // On iOS it will also pop the current page in the navigation stack
        //
        /* ★ N71 (#421): the THEME no longer comes here — see pushThemeToAllPages.
         *
         * ⚠ HONEST NOTE (#46 audit): that leaves this method with NO callers at all.
         * The first draft of this comment claimed it was "now the LANGUAGE path"; it is
         * not. SettingsPage's language pick hand-rolls its own sweep (reloadShell +
         * reloadDefaultDetail + getChatPages) and says at its own call site that
         * reloadAllPages is deliberately not used there. So the "one enumerator" goal
         * is only half delivered: the theme paths share it, the language path still
         * does not, and the includeModal=false branch is currently unexercised.
         * It is left in place rather than deleted or repointed, because pointing the
         * language sweep here would change which surfaces a language pick reloads —
         * a real behaviour change that wants its own batch and its own F5, not a
         * ride-along in a theming round. Logged for Damir; do not read this method as
         * live code. */
        public static void reloadAllPages()
        {
            // ★ N66 (#385): until that batch the OS-theme-flip caller could never
            // reach this method (App.xaml.cs pinned UserAppTheme, so MAUI never
            // raised RequestedThemeChanged again after boot). It is reachable at any
            // moment now, on any navigation stack — so it must not throw on a page it
            // did not expect, and it must not strand the LATER pages when one reload
            // fails.
            foreach (SpixiContentPage page in getLiveShellPages(false))
            {
                try { page.reload(); }
                catch (Exception ex) { Logging.warn("reloadAllPages: " + ex.Message); }
            }
            // #315 (#46 r1 MAJOR-3): a PARKED overlay (warm Account, iOS-46) is
            // deliberately in none of the collections above — a language change would
            // re-present it in yesterday's strings, forever (the #251 class, new
            // instance). Drop the warm instance; the next open rebuilds it correct.
            SpixiContentPage.disposeParkedOverlay();
        }

        public static void updateMessage(Friend friend, int channel, FriendMessage msg)
        {
            Utils.getChatPage(friend)?.updateMessage(msg, channel);
            Page? page = Application.Current?.MainPage?.Navigation?.NavigationStack?.LastOrDefault();
            if (page != null && page is HomePage)
            {
                ((HomePage)page).updateChat(friend);
            }
        }

        public static void insertMessage(Friend friend, int channel, FriendMessage msg)
        {
            Utils.getChatPage(friend)?.insertMessage(msg, channel);
            Page? page = Application.Current?.MainPage?.Navigation?.NavigationStack?.LastOrDefault();
            if (page != null && page is HomePage)
            {
                ((HomePage)page).updateChat(friend);
            }
        }

        public static void deleteMessage(Friend friend, int channel, byte[] msgId)
        {
            Utils.getChatPage(friend)?.deleteMessage(msgId, channel);
            Page? page = Application.Current?.MainPage?.Navigation?.NavigationStack?.LastOrDefault();
            if (page != null && page is HomePage)
            {
                ((HomePage)page).updateChat(friend);
            }
        }

        public static void updateReactions(Friend friend, int channel, byte[] msgId)
        {
            Utils.getChatPage(friend)?.updateReactions(msgId, channel);
            Page? page = Application.Current?.MainPage?.Navigation?.NavigationStack?.LastOrDefault();
            if (page != null && page is HomePage)
            {
                ((HomePage)page).updateChat(friend);
            }
        }

        // CH8: reaction excerpt for the chats list (mirrors updateReactions' HomePage dispatch)
        public static void updateChatReaction(Friend friend, Address reactor_address, string reaction)
        {
            Page? page = Application.Current?.MainPage?.Navigation?.NavigationStack?.LastOrDefault();
            if (page != null && page is HomePage)
            {
                ((HomePage)page).updateChatReaction(friend, reactor_address, reaction);
            }
        }

        public static void updateGroupChatNicks(Friend friend, Address realSenderAddress, string nick)
        {
            Utils.getChatPage(friend)?.updateGroupChatNicks(realSenderAddress, nick);
        }

        public static bool isChatScreenDisplayed(Friend friend)
        {
            return Utils.getChatPage(friend) != null ? true : false;
        }
    }
}
