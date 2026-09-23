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
