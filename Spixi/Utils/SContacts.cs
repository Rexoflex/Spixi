using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using SPIXI.Lang;
using SPIXI.Meta;
using System;
using System.Collections.Generic;
using System.IO;

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
            else
            {
                SChatPrefs.setFavorite(group.walletAddress?.ToString(), false);   // CH4: the preference leaves with the record
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
                SChatPrefs.setFavorite(friend.walletAddress?.ToString(), false);   // CH4: the preference leaves with the record
                return "ok";
            }
            blockers = sharedGroups(friend);
            return blockers.Count > 0 ? "blocked" : "fail";
        }

        /* ★ CH3 (Session AD) — "Delete media & files", the chats-row delete modal's second
         * checkbox (#194), which had NO verb since it was built (home.html: "detail.media
         * still has no verb — noted as a BE row, not faked"). The row was filed as BE; it is
         * ours (#927: app storage, an app verb). The files live where C# put them —
         * TransferManager.completeFileTransfer moves a finished INCOMING transfer into the
         * Downloads root and stamps the path onto the message (`fm.filePath`, `fm.completed`).
         *
         * Two halves, so a REFUSED deletion never costs the user a file:
         *   1. collectReceivedMedia — READ-ONLY, and read-only for real: it parses THIS
         *      contact's history files ITSELF (readMessagesRaw) instead of going through Core's
         *      readLastMessages, because Core's reader fires localStorageCallbacks.processMessage
         *      on every row it parses, and SpixiLocalStorageCallbacks re-arms every incomplete
         *      OUTGOING transfer it meets with an OPEN FileStream (#46 loop, auditor A MINOR-3).
         *      The history format is Core's own (LocalStorage.readMessagesFile at 097341a: int32
         *      version · string address · int32 count · [int32 len · FriendMessage bytes]); a
         *      file that does not parse is skipped, never guessed at. It runs on the caller's
         *      thread BEFORE the deletion (the history is gone after it) and costs one
         *      contact's history — the same order as the deletion itself.
         *      It returns the paths of completed, RECEIVED file transfers that sit INSIDE the
         *      Downloads root. A path recorded under an OLD app container (iOS re-roots the
         *      sandbox on every update, auditor A MINOR-5) is re-resolved by its leaf name —
         *      ONLY when the recorded parent directory is itself a Downloads directory (the
         *      leaf is peer-chosen at receive time, S16 is open: a name like `../x/y.jpg`
         *      recorded outside the root must never be re-rooted into it, loop r2).
         *      Outgoing transfers are the user's own source files anywhere on the device and
         *      are never listed; a path that resolves outside the root is skipped, never deleted.
         *   2. purgeFiles — runs only AFTER the history/contact deletion reported success, OFF
         *      the UI thread (the caller wraps it in Task.Run: walking every other contact's
         *      history is not onNavigating work — loop r2 MINOR "ANR-shaped"). It first drops
         *      any path ANOTHER contact's history also names (auditor A MINOR-4: receive-time
         *      names are made unique only against files that exist at that moment, so B's
         *      deleted photo.jpg and A's later photo.jpg share a path), then deletes what is
         *      left, re-checking the root per file. A per-file failure is logged by TYPE and
         *      counted; the purge never throws into its caller.
         * The verb carries the choice as a trailing `:media` token (HomePage); without it
         * nothing here runs and the three delete verbs behave exactly as before.
         * ⚠ Residual, accepted: a transfer completed inside the writer's ~200 ms deferral is
         * still `completed=false` on disk and stays; a file whose only OTHER referrer's history
         * is already gone (an orphan) is not protected; the log line names the counts only. */
        private static List<FriendMessage> readMessagesRaw(string path)
        {
            List<FriendMessage> messages = new List<FriendMessage>();
            try
            {
                // FileShare.Delete too: Core's writer swaps the file with File.Replace, which
                // Windows refuses while a handle without Delete sharing is open — and the
                // refused write request would have been DROPPED (loop r2 MINOR)
                using (BinaryReader reader = new BinaryReader(new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete)))
                {
                    reader.ReadInt32();          // version
                    reader.ReadString();         // address
                    int num_messages = reader.ReadInt32();
                    for (int i = 0; i < num_messages; i++)
                    {
                        int msg_len = reader.ReadInt32();
                        if (msg_len <= 0 || msg_len > 16 * 1024 * 1024)
                        {
                            break;
                        }
                        messages.Add(new FriendMessage(reader.ReadBytes(msg_len)));
                    }
                }
            }
            catch (Exception e)
            {
                // the TYPE only — the path names the peer
                Logging.warn("readMessagesRaw: a history file did not parse (" + e.GetType().Name + ")");
            }
            return messages;
        }

        private static IEnumerable<FriendMessage> allMessagesOnDisk(Address wallet)
        {
            string chats_root = Path.Combine(IxianHandler.localStorage.documentsPath, "Chats", wallet.ToString());
            if (!Directory.Exists(chats_root))
            {
                yield break;
            }
            string[] channel_dirs;
            try
            {
                channel_dirs = Directory.GetDirectories(chats_root);
            }
            catch (Exception)
            {
                yield break;
            }
            foreach (string channel_dir in channel_dirs)
            {
                string[] files;
                try
                {
                    files = Directory.GetFiles(channel_dir, "*.ixi");
                }
                catch (Exception)
                {
                    continue;
                }
                foreach (string f in files)
                {
                    foreach (FriendMessage fm in readMessagesRaw(f))
                    {
                        yield return fm;
                    }
                }
            }
        }

        /// <summary>The Downloads-root path a received file transfer row resolves to, or null.</summary>
        private static string? receivedMediaPathOf(FriendMessage fm)
        {
            if (fm == null || fm.type != FriendMessageType.fileHeader || fm.localSender || !fm.completed || string.IsNullOrEmpty(fm.filePath))
            {
                return null;
            }
            if (TransferManager.isInsideDownloadsRoot(fm.filePath))
            {
                return Path.GetFullPath(fm.filePath);
            }
            // a path recorded under an old container root: same leaf, current root — but ONLY
            // when the recorded parent was a Downloads directory itself (never a peer-shaped path).
            // ★ loop r3 M-1: the recorded path is C#'s, but its LEAF came from the peer (S16 is
            // open: transfer.fileName is not cleaned at receive time), so a name carrying a `..`
            // segment can put a "Downloads" parent in front of a file that is not this peer's —
            // a path with any `.`/`..` segment never re-roots. Paths from an old container never
            // carry one.
            if (hasDotSegment(fm.filePath))
            {
                return null;
            }
            string leaf = Path.GetFileName(fm.filePath);
            string? parent = null;
            try { parent = Path.GetFileName(Path.GetDirectoryName(fm.filePath)); } catch (Exception) { }
            string rootName = Path.GetFileName(Path.TrimEndingDirectorySeparator(TransferManager.downloadsPath));
            if (string.IsNullOrEmpty(leaf) || string.IsNullOrEmpty(parent) || !string.Equals(parent, rootName, StringComparison.Ordinal))
            {
                return null;
            }
            string rerooted = Path.Combine(TransferManager.downloadsPath, leaf);
            return TransferManager.isInsideDownloadsRoot(rerooted) ? Path.GetFullPath(rerooted) : null;
        }

        /* true when any directory-separator-delimited segment of the path is `.` or `..`
         * (both separators, both platforms; the raw recorded string, never a canonicalised one —
         * canonicalising is exactly what would hide the segment). */
        private static bool hasDotSegment(string path)
        {
            if (string.IsNullOrEmpty(path)) return false;
            foreach (string seg in path.Split(new[] { '/', '\\' }))
            {
                if (seg == "." || seg == "..") return true;
            }
            return false;
        }

        public static List<string> collectReceivedMedia(Friend friend)
        {
            List<string> paths = new List<string>();
            if (friend == null || friend.walletAddress == null)
            {
                return paths;
            }
            try
            {
                foreach (FriendMessage fm in allMessagesOnDisk(friend.walletAddress))
                {
                    string? full = receivedMediaPathOf(fm);
                    if (full != null && !paths.Contains(full))
                    {
                        paths.Add(full);
                    }
                }
            }
            catch (Exception e)
            {
                // the TYPE only: a path or an address could ride the message
                Logging.error("collectReceivedMedia failed: " + e.GetType().Name);
            }
            return paths;
        }

        /// <summary>Delete the files collectReceivedMedia listed for `owner`, sparing any path another
        /// contact's history names. Background work (Task.Run at the call sites). Returns the count deleted.</summary>
        public static int purgeFiles(List<string> paths, Address? owner)
        {
            int deleted = 0;
            if (paths == null || paths.Count == 0)
            {
                return 0;
            }
            try
            {
                List<Friend> others;
                lock (FriendList.friends)
                {
                    others = new List<Friend>(FriendList.friends);
                }
                foreach (Friend other in others)
                {
                    if (other == null || other.walletAddress == null || (owner != null && other.walletAddress.SequenceEqual(owner)))
                    {
                        continue;
                    }
                    foreach (FriendMessage fm in allMessagesOnDisk(other.walletAddress))
                    {
                        string? full = receivedMediaPathOf(fm);
                        if (full != null)
                        {
                            paths.Remove(full);
                        }
                    }
                    if (paths.Count == 0)
                    {
                        return 0;
                    }
                }
            }
            catch (Exception e)
            {
                Logging.error("purgeFiles: the other-contact walk failed (" + e.GetType().Name + ") — nothing deleted");
                return 0;
            }
            foreach (string path in paths)
            {
                try
                {
                    // re-checked at delete time — the list is a snapshot, the root is the rule
                    if (!TransferManager.isInsideDownloadsRoot(path))
                    {
                        continue;
                    }
                    if (File.Exists(path))
                    {
                        File.Delete(path);
                        deleted++;
                    }
                }
                catch (Exception e)
                {
                    Logging.warn("purgeFiles: one file could not be deleted (" + e.GetType().Name + ")");
                }
            }
            return deleted;
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
