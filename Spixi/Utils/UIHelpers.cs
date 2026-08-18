using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using Microsoft.Maui.Controls;
using System;
using System.Linq;

namespace SPIXI
{
    public static class UIHelpers
    {
        public static bool shouldRefreshContacts = false;
        public static bool shouldRefreshTransactions = false;
        public static bool shouldRefreshApps = false;
        public static bool refreshAppRequests = true;

        public static void setContactStatus(Address address, bool online, int unread, string excerpt, long timestamp)
        {
            Page? page = Application.Current.MainPage.Navigation.NavigationStack.Last();
            if (page != null && page is HomePage)
            {
                ((HomePage)page).setContactStatus(address, online, unread, excerpt, timestamp);
            }
            else
            {
                shouldRefreshContacts = true;
            }
        }

        // Reload the webview contents on all pages in the navigation stack
        // On iOS it will also pop the current page in the navigation stack
        public static void reloadAllPages()
        {
            // ★ N66 (#385): until this batch the OS-theme-flip caller could never
            // reach this method (App.xaml.cs pinned UserAppTheme, so MAUI never
            // raised RequestedThemeChanged again after boot). It is now REACHABLE at
            // any moment, on any navigation stack — so it must not throw on a page
            // it did not expect, and it must not strand the LATER pages when one
            // reload fails. Every Spixi page derives from SpixiContentPage today;
            // the pattern match keeps a future one from turning an OS theme change
            // into an InvalidCastException.
            var stack = Application.Current?.MainPage?.Navigation?.NavigationStack;
            if (stack != null)
            {
                foreach (Page p in stack)
                {
                    // ★ N66 (#385, review MAJOR-1): skip a page whose content we did not
                    // generate. reload() cannot re-theme it — it can only restart it. That
                    // is MiniAppPage: a running mini-app would lose all of its state on an
                    // OS auto-dark flip, and gain nothing (third-party content carries no
                    // Spixi theme).
                    if (p is not SpixiContentPage page || !page.hasGeneratedContent)
                    {
                        continue;
                    }
                    try { page.reload(); }
                    catch (Exception ex) { Logging.warn("reloadAllPages (stack page): " + ex.Message); }
                }
            }
            // #225: overlay pages are live surfaces outside the NavigationStack
            // (reload() regenerates the page, picking up the current theme/language).
            foreach (SpixiContentPage overlay in SpixiContentPage.getOverlayPages())
            {
                if (!overlay.hasGeneratedContent)
                {
                    continue;   // ★ N66 (#385, review MAJOR-1) — same rule as the stack above
                }
                try { overlay.reload(); }
                catch (Exception ex) { Logging.warn("reloadAllPages (overlay): " + ex.Message); }
            }
            // #251: the default detail (EmptyDetail in HomePage.rightContent) is in
            // neither collection — regenerate it too (theme/language), or it keeps
            // the boot-time substitution forever.
            HomePage.InstanceOrNull()?.reloadDefaultDetail();   // AND-1 (#329): read-only — must NEVER construct (pre-login theme/language reload)
            // #315 (#46 r1 MAJOR-3): a PARKED overlay (warm Account, iOS-46) is
            // deliberately in NONE of the collections above — an OS auto-theme flip
            // or language change would re-present it in yesterday's theme, forever
            // (the #251 EmptyDetail class, new instance). Theme/language flips are
            // rare: drop the warm instance; the next open rebuilds fresh + correct.
            SpixiContentPage.disposeParkedOverlay();
        }

        public static void updateMessage(Friend friend, int channel, FriendMessage msg)
        {
            Utils.getChatPage(friend)?.updateMessage(msg, channel);
            Page? page = Application.Current.MainPage.Navigation.NavigationStack.Last();
            if (page != null && page is HomePage)
            {
                ((HomePage)page).updateChat(friend);
            }
        }

        public static void insertMessage(Friend friend, int channel, FriendMessage msg)
        {
            Utils.getChatPage(friend)?.insertMessage(msg, channel);
            Page? page = Application.Current.MainPage.Navigation.NavigationStack.Last();
            if (page != null && page is HomePage)
            {
                ((HomePage)page).updateChat(friend);
            }
        }

        public static void deleteMessage(Friend friend, int channel, byte[] msgId)
        {
            Utils.getChatPage(friend)?.deleteMessage(msgId, channel);
            Page? page = Application.Current.MainPage.Navigation.NavigationStack.Last();
            if (page != null && page is HomePage)
            {
                ((HomePage)page).updateChat(friend);
            }
        }

        public static void updateReactions(Friend friend, int channel, byte[] msgId)
        {
            Utils.getChatPage(friend)?.updateReactions(msgId, channel);
            Page? page = Application.Current.MainPage.Navigation.NavigationStack.Last();
            if (page != null && page is HomePage)
            {
                ((HomePage)page).updateChat(friend);
            }
        }

        // CH8: reaction excerpt for the chats list (mirrors updateReactions' HomePage dispatch)
        public static void updateChatReaction(Friend friend, Address reactor_address, string reaction)
        {
            Page? page = Application.Current.MainPage.Navigation.NavigationStack.Last();
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
