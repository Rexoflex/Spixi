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

        // ★ P2 (#708): no push provider on this platform — the settings row is never shown
        // (SettingsPage withholds the cap), so this is signature parity only.
        /* ★ P2 (#708): does this platform have a push provider at all? Decides whether the
         * settings row exists (SettingsPage withholds the cap when false). */
        public static bool pushProviderSupported() { return false; }

        public static void applyPushProviderPreference()
        {

        }

        public static void setTag(string tag)
        {

        }

        public static void clearRemoteNotifications(int unreadCount)
        {

        }


        // ★ 3.14: signature parity — see the Android implementation. Not wired on this
        // platform (no per-id local notification surface here), but present so the shared
        // call site compiles and behaves identically everywhere.
        public static void cancelNotification(int messageId)
        {
        }

        public static void clearNotifications(int unreadCount)
        {

        }

        // #334 AND-15: optional kind hint ("message" | "call") — copy-only on this
        // platform (the localized per-type text arrives via the message arg).
        public static void showLocalNotification(int messageId, string title, string message, string data, bool alert, int unreadCount, string kind = "message", int chatUnread = 0)
        {

        }
    }
}
