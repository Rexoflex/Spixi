using IXICore;
using IXICore.Streaming;
using Microsoft.Maui.Controls;
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
            var stack = Application.Current.MainPage.Navigation.NavigationStack;
            foreach (Page p in stack)
            {
                ((SpixiContentPage)p).reload();
            }
            // #225: overlay pages are live surfaces outside the NavigationStack
            // (reload() regenerates the page, picking up the current theme/language).
            foreach (SpixiContentPage overlay in SpixiContentPage.getOverlayPages())
            {
                overlay.reload();
            }
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
