using Foundation;
using IXICore.Meta;
using IXICore.Streaming;
using Microsoft.Maui.ApplicationModel;
using OneSignalSDK.DotNet;
using OneSignalSDK.DotNet.Core.Debug;
using SPIXI;
using System;
using System.Threading.Tasks;
using UIKit;
using UserNotifications;
using OneSignalNative = Com.OneSignal.iOS.OneSignal;

namespace Spixi
{
    public class SPushService
    {
        private static bool isInitializing = false;
        private static bool isInitialized = false;

        private static bool clearNotificationsAfterInit = false;
        private static bool clearRemoteNotificationsAfterInit = false;
        /* iOS-27 (device crash on receiving a contact request) — ROOT CAUSE + FIX, 2026-07-29.
         *
         * The custom UNUserNotificationCenterDelegate that used to live here is DELETED.
         * It was the whole crash family (iOS-5/7/9 on sim, iOS-27 on device):
         *
         *  · OneSignal swizzles the notification delegate by class_addMethod-ing
         *    "onesignal"-prefixed selectors and exchanging implementations.
         *    class_addMethod FAILS when the class ALREADY defines the selector — which is
         *    exactly what this class did — so OneSignal's forwarder landed on selectors the
         *    managed runtime had no marshalling info for, and the process aborted at selector
         *    lookup BEFORE any managed body ran (which is why the #280 try/catch could never
         *    log it).
         *  · #281 tried to fix that by hand-exporting the prefixed selectors. That could not
         *    work: a hand-written [Export] carrying an Action<UNNotificationPresentationOptions>
         *    block parameter has no [BlockProxy], so the registrar cannot build the block
         *    trampoline. The device build says so out loud —
         *      MT4174: Unable to locate the block to delegate conversion method for
         *              OneSignalWillPresentNotification(...)'s parameter #3
         *    Debug's dynamic registrar downgrades it to a warning; the static registrar
         *    (Release/device) makes it fatal. It only ever "passed" on the simulator.
         *
         * The fix is to stop owning the delegate at all. Every piece of logic that lived here
         * already has a home in OneSignal's own managed events, which are wired in initialize()
         * below and involve no hand-written selectors:
         *   · the "fa" deep link  → handleNotificationOpened (Notifications.Clicked)
         *   · foreground display  → handleNotificationReceived (Notifications.WillDisplay),
         *                           which now also honours the "alert" flag this class read.
         *
         * Leaving OneSignal to install its own delegate means class_addMethod succeeds, so this
         * ALSO closes B1 (delegate starvation — our selectors were the thing starving it) and
         * B2 (double tap-handling: DidReceiveNotificationResponse and the Clicked handler were
         * two live owners of the same tap, with divergent navigation).
         */

        public static void initialize()
        {
            if (isInitializing
                || isInitialized)
            {
                return;
            }

            isInitializing = true;
            OneSignal.Debug.LogLevel = LogLevel.WARN;
            OneSignal.Debug.AlertLevel = LogLevel.NONE;

            // iOS-27: deliberately NOT setting UNUserNotificationCenter.Current.Delegate —
            // owning it is what broke OneSignal's swizzle (see the note above).

            OneSignal.Notifications.Clicked += handleNotificationOpened;
            OneSignal.Notifications.WillDisplay += handleNotificationReceived;

            OneSignal.Initialize(SPIXI.Meta.Config.oneSignalAppId);

            OneSignal.Notifications.RequestPermissionAsync(true).ContinueWith(task =>
            {
                if (task.IsFaulted)
                {
                    Logging.error("RequestPermissionAsync failed: {0}", task.Exception?.Flatten().InnerException?.Message);
                    return Task.CompletedTask;
                }
                else if (task.IsCanceled)
                {
                    Logging.warn("RequestPermissionAsync was canceled.");
                    return Task.CompletedTask;
                }
                else
                {
                    Logging.info("RequestPermissionAsync succeeded.");
                }

                isInitialized = true;

                if (clearNotificationsAfterInit)
                {
                    clearNotificationsAfterInit = false;
                    clearNotifications(0);
                }
                else if (clearRemoteNotificationsAfterInit)
                {
                    clearRemoteNotificationsAfterInit = false;
                    clearRemoteNotifications(0);
                }
                return Task.CompletedTask;
            });
        }

        public static void setTag(string tag)
        {
            OneSignal.User.AddTag("ixi", tag);
        }

        public static void clearRemoteNotifications(int unreadCount)
        {
            return;
            if (!isInitialized)
            {
                clearRemoteNotificationsAfterInit = true;
                Logging.warn("Cannot clear notifications, OneSignal is not initialized yet.");
                return;
            }

            try
            {
                OneSignalNative.Notifications.ClearAll();

                if (UIDevice.CurrentDevice.CheckSystemVersion(16, 0))
                {
                    // For iOS 16+, use UNUserNotificationCenter
                    UNUserNotificationCenter.Current.SetBadgeCount(unreadCount, (err) =>
                    {
                        if (err != null)
                        {
                            Logging.warn("Set badge count failed");
                            Logging.warn(err.ToString());
                        }
                    });
                }
                else
                {
                    // For older versions, use UIApplication
                    UIApplication.SharedApplication.ApplicationIconBadgeNumber = unreadCount;
                }
            }
            catch (Exception e)
            {
                Logging.error("Exception while clearing all notifications: {0}.", e);
            }
        }


        // ★ 3.14: signature parity — see the Android implementation. Not wired on this
        // platform (no per-id local notification surface here), but present so the shared
        // call site compiles and behaves identically everywhere.
        public static void cancelNotification(int messageId)
        {
        }

        public static void clearNotifications(int unreadCount)
        {
            if (!isInitialized)
            {
                clearRemoteNotificationsAfterInit = true;
                clearNotificationsAfterInit = true;
                Logging.warn("Cannot clear notifications, OneSignal is not initialized yet.");
                return;
            }

            MainThread.BeginInvokeOnMainThread(() =>
            {
                try
                {
                    OneSignalNative.Notifications.ClearAll();
                    UNUserNotificationCenter.Current.RemoveAllDeliveredNotifications();
                }
                catch (Exception e)
                {
                    Logging.error("Exception while clearing all notifications: {0}.", e);
                }
                if (UIDevice.CurrentDevice.CheckSystemVersion(16, 0))
                {
                    // For iOS 16+, use UNUserNotificationCenter
                    UNUserNotificationCenter.Current.SetBadgeCount(unreadCount, (err) =>
                    {
                        if (err != null)
                        {
                            Logging.warn("Set badge count failed");
                            Logging.warn(err.ToString());
                        }
                    });
                }
                else
                {
                    // For older versions, use UIApplication
                    UIApplication.SharedApplication.ApplicationIconBadgeNumber = unreadCount;
                }
            });
        }

        // #334 AND-15: optional kind hint ("message" | "call") — copy-only on this
        // platform (the localized per-type text arrives via the message arg; no
        // per-kind presentation work here by scope).
        public static void showLocalNotification(int messageId, string title, string message, string data, bool alert, int unreadCount, string kind = "message", int chatUnread = 0)
        {
            MainThread.BeginInvokeOnMainThread(() =>
            {
                /* ⚠ AUDIT MINOR: NOTIF-4's replace-instead-of-stack applies here too — the
                 * identifier is now stable per chat — but iOS rendered no count, so where
                 * the user used to see five rows they would see ONE with no sign that a
                 * backlog existed. Android puts the count in SubText; iOS has no equivalent
                 * slot on a plain notification, so it rides the Subtitle. Same information,
                 * and the Body keeps AND-15's per-type line and the opt-in sender prefix. */
                var content = new UNMutableNotificationContent
                {
                    Title = title,
                    Body = message,
                    Badge = unreadCount,
                    ThreadIdentifier = data
                };

                if (kind != "call" && chatUnread > 1)
                {
                    content.Subtitle = string.Format(SPIXI.Lang.SpixiLocalization._SL("notification-new-messages") ?? "{0} new messages", chatUnread);
                }

                if (alert)
                {
                    content.Sound = UNNotificationSound.Default;
                }

                content.UserInfo = new NSMutableDictionary
                {
                    { (NSString) "fa", (NSString) data },
                    { (NSString) "alert", (NSString) alert.ToString() }
                };

                var trigger = UNTimeIntervalNotificationTrigger.CreateTrigger(0.25, false);
                string identifier = messageId.ToString();
                var request = UNNotificationRequest.FromIdentifier(identifier, content, trigger);

                UNUserNotificationCenter.Current.AddNotificationRequest(request, (err) =>
                {
                    if (err != null)
                    {
                        Logging.warn("Local notification add request failed");
                        Logging.warn(err.ToString());
                    }
                });

                if (UIDevice.CurrentDevice.CheckSystemVersion(16, 0))
                {
                    // For iOS 16+, use UNUserNotificationCenter
                    UNUserNotificationCenter.Current.SetBadgeCount(unreadCount, (err) =>
                    {
                        if (err != null)
                        {
                            Logging.warn("Set badge count failed");
                            Logging.warn(err.ToString());
                        }
                    });
                }
                else
                {
                    // For older versions, use UIApplication
                    UIApplication.SharedApplication.ApplicationIconBadgeNumber = unreadCount;
                }
            });
        }

        static void handleNotificationReceived(object? sender, OneSignalSDK.DotNet.Core.Notifications.NotificationWillDisplayEventArgs e)
        {
            try
            {
                e.PreventDefault();

                if (OfflinePushMessages.fetchPushMessages(true, true))
                {
                    return;
                }

                // iOS-27: the foreground-presentation decision the deleted
                // WillPresentNotification override used to make. Payload "alert" false (or
                // absent) = deliver silently; true = let it surface. Same semantics, minus the
                // hand-exported selector that was aborting the process.
                var additional = e.Notification.AdditionalData;
                if (additional != null && additional.ContainsKey("alert"))
                {
                    var alertValue = additional["alert"];
                    if (alertValue != null
                        && bool.TryParse(Convert.ToString(alertValue), out bool showAlert)
                        && !showAlert)
                    {
                        return;   // silent: no banner/sound in the foreground
                    }
                }
            }
            catch (Exception ex)
            {
                Logging.error("Exception occured in handleNotificationReceived: {0}", ex);
            }

            /* ★ NOTIF-5 — the same second door as Android. Reaching this line means the
             * Ixian fetch did not handle the push, so the RAW OneSignal notification is about
             * to post with no mute applied. ⚠ Scope: the global master and 1:1 chats; a GROUP
             * push carries the SENDER'S address in `fa`, so the group's own mute cannot be
             * resolved here (BE — the payload needs the group address).
             * ⚠ iOS has not been on a device for eight batches; this mirrors the Android
             * change exactly so the two cannot drift, and it fails OPEN. */
            string? faPush = null;
            try
            {
                var extra = e.Notification.AdditionalData;
                if (extra != null && extra.ContainsKey("fa"))
                {
                    faPush = Convert.ToString(extra["fa"]);
                }
            }
            catch (Exception ex)
            {
                Logging.warn("handleNotificationReceived: could not read 'fa': " + ex.Message);
            }

            if (!SPIXI.Meta.SNotificationPrefs.shouldDisplayRawPush(faPush))
            {
                Logging.info("[NOTIFDIAG] raw push suppressed by mute/global master");
                return;
            }

            e.Notification.display();
        }

        static void handleNotificationOpened(object? sender, OneSignalSDK.DotNet.Core.Notifications.NotificationClickedEventArgs e)
        {
            try
            {
                if (e.Notification.AdditionalData.ContainsKey("fa"))
                {
                    var fa = e.Notification.AdditionalData["fa"];
                    if (fa != null)
                    {
                        MainThread.BeginInvokeOnMainThread(() =>
                        {
                            App.startingScreen = Convert.ToString(fa);
                            HomePage.InstanceOrNull()?.popToRootAsync();   // AND-1 (#329): push tap pre-login must not construct
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                Logging.error("Exception occured in handleNotificationOpened: {0}", ex);
            }
        }
    }
}
