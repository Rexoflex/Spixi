
namespace SPIXI.Interfaces
{
    public interface IPushService
    {
        void initialize();
        void setTag(string tag);
        void clearNotifications(int unreadCount);
        void clearRemoteNotifications(int unreadCount);
        // #334 AND-15: trailing kind hint ("message" | "call") — Android routes
        // "call" to the Incoming-calls channel; other platforms ignore it.
        void showLocalNotification(int messageId, string title, string message, string data, bool alert, int unreadCount, string kind = "message", int chatUnread = 0);
    }
}
