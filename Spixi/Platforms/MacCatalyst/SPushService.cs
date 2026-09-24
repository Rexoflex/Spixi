using IXICore.Meta;
using Microsoft.Maui.ApplicationModel;
using System;
using System.Collections.Generic;
using Foundation;
using UIKit;
using UserNotifications;

namespace Spixi
{
    /// <summary>
    /// ★ #979 (M4, the office Mac 2026-09-24: "no Dock badge and no Dock bounce on a new
    /// message"). This file was an all-empty stub, so the Catalyst leg of the notification lane
    /// did nothing at all. It now does the LOCAL half — the half that needs no push provider:
    ///   · <see cref="initialize"/> asks the user once for Alert + Badge + Sound
    ///     (<c>UNUserNotificationCenter</c> works on Mac Catalyst; there is no OneSignal here);
    ///   · <see cref="showLocalNotification"/> posts the same row the iOS lane posts (title,
    ///     body, a thread per chat, the badge), with NO text beyond what the caller composed
    ///     (the NOTIF-2 rule: the message text is never in a notification);
    ///   · <see cref="clearNotifications"/> / <see cref="clearRemoteNotifications"/> set the Dock
    ///     badge to the unread count the caller passes (0 clears it) and remove the delivered rows.
    /// The Dock BOUNCE is <c>SSystemAlert.flash()</c> (same folder), the Windows taskbar-flash
    /// twin. There is still NO push provider on Mac (<see cref="pushProviderSupported"/> stays
    /// false): a Mac that is not running receives nothing until it is opened.
    /// ⚠ UNCOMPILED here (the container has no Mac toolchain) — the office Mac build is the first
    /// compile. Every method is fail-soft: a notification failure must never reach the node.
    /// </summary>
    public class SPushService
    {
        private static bool authRequested = false;

        public static void initialize()
        {
            if (authRequested)
            {
                return;
            }
            authRequested = true;
            try
            {
                UNUserNotificationCenter.Current.RequestAuthorization(
                    UNAuthorizationOptions.Alert | UNAuthorizationOptions.Badge | UNAuthorizationOptions.Sound,
                    (granted, err) =>
                    {
                        Logging.info("[NOTIFDIAG] mac notification authorization: granted=" + granted + (err != null ? " error" : ""));
                    });
            }
            catch (Exception e)
            {
                Logging.warn("[NOTIFDIAG] mac notification authorization threw: " + e.GetType().Name);
            }
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

        /// <summary>★ #979: the unread count the caller computed IS the Dock badge.</summary>
        public static void clearRemoteNotifications(int unreadCount)
        {
            setBadge(unreadCount);
        }

        // ★ 3.14: signature parity — see the Android implementation.
        public static void cancelNotification(int messageId)
        {
            try
            {
                UNUserNotificationCenter.Current.RemoveDeliveredNotifications(new string[] { messageId.ToString() });
                UNUserNotificationCenter.Current.RemovePendingNotificationRequests(new string[] { messageId.ToString() });
            }
            catch (Exception e)
            {
                Logging.warn("cancelNotification failed: " + e.GetType().Name);
            }
        }

        public static void clearNotifications(int unreadCount)
        {
            MainThread.BeginInvokeOnMainThread(() =>
            {
                try
                {
                    UNUserNotificationCenter.Current.RemoveAllDeliveredNotifications();
                }
                catch (Exception e)
                {
                    Logging.warn("clearNotifications failed: " + e.GetType().Name);
                }
            });
            setBadge(unreadCount);
        }

        // #334 AND-15: optional kind hint ("message" | "call") — copy-only on this
        // platform (the localized per-type text arrives via the message arg).
        public static void showLocalNotification(int messageId, string title, string message, string data, bool alert, int unreadCount, string kind = "message", int chatUnread = 0)
        {
            MainThread.BeginInvokeOnMainThread(() =>
            {
                try
                {
                    var content = new UNMutableNotificationContent
                    {
                        Title = title ?? "",
                        Body = message ?? "",
                        ThreadIdentifier = data ?? "",
                    };
                    if (alert)
                    {
                        content.Sound = UNNotificationSound.Default;
                    }
                    content.UserInfo = new NSMutableDictionary
                    {
                        { (NSString) "fa", (NSString) (data ?? "") },
                    };
                    var trigger = UNTimeIntervalNotificationTrigger.CreateTrigger(0.25, false);
                    var request = UNNotificationRequest.FromIdentifier(messageId.ToString(), content, trigger);
                    UNUserNotificationCenter.Current.AddNotificationRequest(request, (err) =>
                    {
                        if (err != null)
                        {
                            Logging.warn("[NOTIFDIAG] mac local notification add failed");
                        }
                    });
                }
                catch (Exception e)
                {
                    Logging.warn("[NOTIFDIAG] mac local notification threw: " + e.GetType().Name);
                }
            });
            setBadge(unreadCount);
        }

        /// <summary>★ #979: the Dock badge. SetBadgeCount is Mac Catalyst 16+ (macOS 13); older
        /// Macs take the UIApplication property (the same split the iOS lane makes). Fail-soft.</summary>
        private static void setBadge(int unreadCount)
        {
            int n = Math.Max(0, unreadCount);
            MainThread.BeginInvokeOnMainThread(() =>
            {
                try
                {
                    if (OperatingSystem.IsMacCatalystVersionAtLeast(16))
                    {
                        UNUserNotificationCenter.Current.SetBadgeCount(n, (err) =>
                        {
                            if (err != null)
                            {
                                Logging.warn("[NOTIFDIAG] mac badge set failed");
                            }
                        });
                    }
                    else
                    {
#pragma warning disable CA1422 // obsolete on Catalyst 17+, the branch only runs below 16
                        UIApplication.SharedApplication.ApplicationIconBadgeNumber = n;
#pragma warning restore CA1422
                    }
                }
                catch (Exception e)
                {
                    Logging.warn("[NOTIFDIAG] mac badge threw: " + e.GetType().Name);
                }
            });
        }
    }
}
