using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using SPIXI.Lang;
using System;
using System.Collections.Generic;

namespace SPIXI
{
    /// <summary>
    /// ★ Batch A (2026-08-24 overnight, #539–#541): the contact-removal helpers the
    /// HomePage chats list needed and never had.
    ///
    /// A6 — THE DATA BUG. The redesigned chats-row menu ("Delete chat" → "Delete
    /// contact too?") emitted NO verb: home.html onPersist tombstoned the row locally
    /// ("no HomePage dispatch yet — intent only") and the contact + history stayed on
    /// disk. Only ContactDetails (ixian:remove / ixian:removehistory, page-scoped, no
    /// address argument) ever reached C#. These helpers give HomePage per-ADDRESS
    /// verbs with the SAME bodies ContactDetails uses, so the two entry points cannot
    /// disagree.
    ///
    /// A4/A5 — SHARED GROUPS. FriendList.removeFriend REFUSES a contact who is in any
    /// group (Core isFriendInGroup, computed and discarded there — the N27 class). The
    /// enumeration below is the SAME predicate with the result KEPT, so the shell can
    /// list the blocking groups (the remove-contact sheet) and, on the user's explicit
    /// choice, leave them FIRST and then remove — one verb, one order, no race between
    /// two location.href sends.
    /// </summary>
    public static class SContacts
    {
        /// <summary>The groups this contact is a member of — (nickname, address) pairs, flat.</summary>
        public static List<string> sharedGroups(Friend friend)
        {
            List<string> pairs = new List<string>();
            if (friend == null || friend.walletAddress == null)
            {
                return pairs;
            }
            try
            {
                // snapshot the reference ONCE — sortFriends() reassigns the field without
                // a lock, so lock + iterate must use one object (ContactDetails loop n4)
                var friendsRef = FriendList.friends;
                lock (friendsRef)   // Core locks this same object in isFriendInGroup
                {
                    foreach (Friend f in friendsRef)
                    {
                        if (f.type == FriendType.Group && f.users != null && f.users.hasUser(friend.walletAddress))
                        {
                            pairs.Add(f.nickname ?? "");
                            pairs.Add(f.walletAddress.ToString());
                        }
                    }
                }
            }
            catch (Exception)
            {
                Logging.warn("sharedGroups enumeration failed");   // no ex.Message — a friend's nickname/address must not reach the log
                pairs.Clear();
            }
            return pairs;
        }

        /// <summary>
        /// Leave ONE group or bot — one grammar since #567: sendLeave, then
        /// immediate removeFriend. Returns false when the friend is not a group/bot.
        /// </summary>
        public static bool leaveGroup(Friend group)
        {
            if (group == null || (!group.bot && group.type != FriendType.Group))
            {
                return false;
            }
            /* ★ #567 (Damir: "mitigate"): bots take the GROUP grammar — sendLeave,
             * then IMMEDIATE removeFriend. The old pendingDeletion-until-confirmed
             * wait fed the server's `leaveConfirmed` into the frozen core's
             * self-recursive `StreamClientManager.getClient` (BE §1e-6) = a
             * deterministic StackOverflow crash. With the friend gone, core drops
             * the confirm on its unknown-sender path — no crash, and the row
             * disappears at once (the perception Damir wants). The core one-line
             * fix may restore the acknowledged grammar later (BE row). */
            /* ★★ #797 (Damir, Android walk N): a group whose members are NOT in contacts
             * could never be left. Core's sendGroupSpixiMessage THROWS when the notice
             * has no route — "primary contact missing" when the owner is not a contact
             * (CoreStreamProcessor.cs:349/402 at 097341a), BotUsers.getOwner on an empty
             * roster (contacts.First()), a null botInfo. The throw left this method BEFORE
             * removeFriend ran, so the record stayed; on ContactDetails it also left
             * onNavigating before e.Cancel was set, and Android loaded `ixian:leave` as a
             * page — "Webpage not available". Delete every contact, and the group you
             * shared with them becomes undeletable; a restore brings it back the same way.
             * These are STRUCTURAL states of this record (sendMessage itself is async and
             * never throws here), so nobody can be told and the local removal is the whole
             * of what "leave" can still mean — the half that never ran. No address in the
             * log line (the handover-gate log rule). */
            try
            {
                CoreStreamProcessor.sendLeave(group, null);
            }
            catch (Exception ex)
            {
                // The exception TYPE only. Core formats the group address into the message.
                Logging.warn("leaveGroup: the leave notice could not be sent (" + ex.GetType().Name + ") — removing the group locally");
            }
            // Report the LOCAL removal. removeContact maps false to "fail", so a refused
            // removal must not read as a completed leave.
            bool removed = FriendList.removeFriend(group);
            if (!removed)
            {
                Logging.warn("leaveGroup: the local removal was refused");
            }
            UIHelpers.shouldRefreshContacts = true;
            return removed;
        }

        /// <summary>
        /// Remove a contact (the ContactDetails.onRemove body, address-scoped). Bots and
        /// groups take the leave path. `leaveSharedGroups` = the user chose, on the
        /// remove-contact sheet, to leave every group both are in FIRST — otherwise
        /// Core refuses and the result is "blocked" with the group pairs.
        /// Result: "ok" (person removed) | "left" (group/bot leave sent) | "blocked" (+ pairs) | "fail".
        /// </summary>
        public static string removeContact(Friend friend, bool leaveSharedGroups, out List<string> blockers)
        {
            blockers = new List<string>();
            if (friend == null)
            {
                return "fail";
            }
            if (friend.bot || friend.type == FriendType.Group)
            {
                // loop r1: a group/bot LEAVES — a bot stays listed (pendingDeletion) until the
                // server acknowledges, so the shell must not toast "Contact removed" for it
                return leaveGroup(friend) ? "left" : "fail";
            }
            if (leaveSharedGroups)
            {
                // leave each shared group first — the same removeFriend order Core wants
                List<string> pairs = sharedGroups(friend);
                for (int i = 1; i < pairs.Count; i += 2)
                {
                    try
                    {
                        Friend? g = FriendList.getFriend(new Address(pairs[i]));
                        if (g != null)
                        {
                            leaveGroup(g);
                        }
                    }
                    catch (Exception)
                    {
                        Logging.warn("removeContact: leave group failed");   // no ex.Message — an Address ctor error carries the token
                    }
                }
            }
            if (FriendList.removeFriend(friend))
            {
                UIHelpers.shouldRefreshContacts = true;
                return "ok";
            }
            blockers = sharedGroups(friend);
            return blockers.Count > 0 ? "blocked" : "fail";
        }

        /// <summary>Delete the chat history of one contact (the ContactDetails.onRemoveHistory body, address-scoped).</summary>
        public static bool removeHistory(Friend friend)
        {
            if (friend == null)
            {
                return false;
            }
            if (!friend.deleteHistory())
            {
                return false;
            }
            UIHelpers.shouldRefreshContacts = true;
            // iOS-24 (#283): an OPEN conversation must repaint the emptied history now
            var chat_page = Utils.getChatPage(friend);
            if (chat_page != null)
            {
                chat_page.loadMessages();
            }
            return true;
        }
    }
}
