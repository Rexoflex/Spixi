using IXICore.Meta;
using IXICore.Streaming;
using Microsoft.Maui.Storage;
using System;
using System.Collections.Generic;

namespace SPIXI.Meta
{
    /// <summary>
    /// ★ CH4 (Session AD): per-chat APP preferences that Ixian-Core has no field for.
    /// Today that is FAVORITES. The shape is SNotificationPrefs' 1:1 mute, deliberately:
    /// one bool per address under a fixed prefix, stored only when true (the key set stays
    /// bounded by the chats the user marked, not by every chat ever opened), and every
    /// failure logged by TYPE with a sanitised message — the key EMBEDS the peer address,
    /// and ixian.log is rendered by DevPage and offered through the share sheet.
    ///
    /// Read by HomePage (the `setChatFavorite` echo beside the roster push and after the
    /// `ixian:favchat:` verb). Nothing else reads it: a favorite changes what the chats
    /// list SHOWS, never what the node does.
    /// </summary>
    public static class SChatPrefs
    {
        private const string KEY_FAV_PREFIX = "fav.";

        private static string favKey(string address)
        {
            return KEY_FAV_PREFIX + address;
        }

        /* ★★ A5 #1124 (Damir #1133 (3)): "Show photo previews in chats" (Account → Privacy, `ixian:photoPreviews:on|off`).
         * ONE app preference, a plain bool, default TRUE. ON: SingleChatPage makes a small preview of a LOCAL image file
         * (sent, or downloaded by the user's tap) and pushes it to the chat (`setFileThumb`); OFF: no decode at chat
         * render, and every image stays a file card. A FIXED key — no address, no content (the standing gate rule).
         * The shape of SNotificationPrefs.getBool/setBool: a Preferences failure is logged by TYPE and falls back to
         * the default, it never throws into the chat load. */
        private const string KEY_PHOTO_PREVIEWS = "chatPhotoPreviews";

        public static bool photoPreviews
        {
            get
            {
                try
                {
                    return Preferences.Default.Get(KEY_PHOTO_PREVIEWS, true);
                }
                catch (Exception e)
                {
                    Logging.error("SChatPrefs.photoPreviews get failed: " + e.GetType().Name);
                    return true;
                }
            }
            set
            {
                try
                {
                    Preferences.Default.Set(KEY_PHOTO_PREVIEWS, value);
                }
                catch (Exception e)
                {
                    Logging.error("SChatPrefs.photoPreviews set failed: " + e.GetType().Name);
                }
            }
        }

        public static bool isFavorite(string? address)
        {
            if (string.IsNullOrEmpty(address))
            {
                return false;
            }
            try
            {
                return Preferences.Default.Get(favKey(address), false);
            }
            catch (Exception e)
            {
                Logging.error("SChatPrefs.isFavorite failed: " + e.GetType().Name + ": " + SPIXI.Utils.logSafe(e.Message));
                return false;
            }
        }

        public static void setFavorite(string? address, bool favorite)
        {
            if (string.IsNullOrEmpty(address))
            {
                return;
            }
            try
            {
                if (favorite)
                {
                    Preferences.Default.Set(favKey(address), true);
                }
                else
                {
                    Preferences.Default.Remove(favKey(address));
                }
            }
            catch (Exception e)
            {
                Logging.error("SChatPrefs.setFavorite failed: " + e.GetType().Name + ": " + SPIXI.Utils.logSafe(e.Message));
            }
        }

        /// <summary>
        /// ★ CH4 (Session AD): the unread total the CHATS BADGE shows — the sum over every
        /// friend that is NOT muted. ONE predicate (SNotificationPrefs.isChatMuted: the
        /// synced botInfo flag for rooms, the device preference for a 1:1) for the three
        /// C# sites that used to sum FriendList.getUnreadMessageCount() blind, so the
        /// Account tab's badge and the home shell's badge (chats-shell.js chatsUnreadTotal,
        /// which skips `c.muted`) can no longer disagree. A pendingDeletion friend is not a
        /// chat row and is skipped like the roster skips it.
        /// </summary>
        public static int unreadTotalForBadge()
        {
            int total = 0;
            List<Friend> friends;
            lock (FriendList.friends)
            {
                friends = new List<Friend>(FriendList.friends);
            }
            foreach (Friend friend in friends)
            {
                if (friend == null || friend.pendingDeletion)
                {
                    continue;
                }
                var lm = friend.metaData.lastMessage;
                if (UnreadRule.isPendingIncomingRequest(friend.approved, lm != null, lm != null ? lm.type : FriendMessageType.standard, lm != null && lm.localSender))
                {
                    total += 1;   // ★ #1150: a pending request = 1 until Accept / Decline (the Chats tab rule); its row count is not added
                    continue;
                }
                if (SNotificationPrefs.isChatMuted(friend))
                {
                    continue;
                }
                int umc = friend.getUnreadMessageCount();
                if (umc > 0)
                {
                    total += umc;
                }
            }
            return total;
        }
    }
}
