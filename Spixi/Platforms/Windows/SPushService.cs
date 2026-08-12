using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Spixi
{
    public class SPushService
    {
        public static void initialize()
        {

        }

        public static void setTag(string tag)
        {

        }

        public static void clearRemoteNotifications(int unreadCount)
        {

        }

        public static void clearNotifications(int unreadCount)
        {

        }

        // #334 AND-15: optional kind hint ("message" | "call") — copy-only on this
        // platform (the localized per-type text arrives via the message arg).
        public static void showLocalNotification(int messageId, string title, string message, string data, bool alert, int unreadCount, string kind = "message")
        {

        }
    }
}
