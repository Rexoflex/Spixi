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

        public static void showLocalNotification(int messageId, string title, string message, string data, bool alert, int unreadCount)
        {
            MainThread.BeginInvokeOnMainThread(() =>
            {
                var content = new UNMutableNotificationContent
                {
                    Title = title,
                    Body = message,
                    Badge = unreadCount,
                    ThreadIdentifier = data
                };

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
                            HomePage.Instance().popToRootAsync();
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
