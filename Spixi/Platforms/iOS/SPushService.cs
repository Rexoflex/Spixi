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

            /* ★★ P2 (#708): SKIP THE SDK ENTIRELY when the user has switched the push provider
             * off. Nothing below runs — no Initialize, no token, no permission prompt from
             * OneSignal. On iOS this means no remote wake-up at all (UIBackgroundModes
             * remote-notification IS the wake-up), which the settings row says in words.
             * Not latched: initialize() is re-callable, so switching the provider back on
             * (applyPushProviderPreference) initialises normally. */
            if (!SPIXI.Meta.SNotificationPrefs.pushProviderEnabled)
            {
                Logging.info("[NOTIFDIAG] push provider OFF by user choice (P2) — OneSignal not initialised");
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

            /* * APNS-1 (2026-08-21) - LOG ONLY. Ships with the entitlement, fixes nothing.
             *
             * iOS push has never registered on a device build: the app carried NO
             * entitlements file, so it never asked iOS for an APNs token and OneSignal had
             * no subscription to address. With aps-environment now present, ONE open
             * question remains and only the device can answer it.
             *
             * The bundle id was renamed in 10e621f7 (2024-07-12):
             *     io.ixian.spixi  ->  com.ixilabs.spixi
             * Legacy Spixi (the OLD id) still receives push, which proves the OneSignal
             * account and its APNs credential are healthy - for that id. On APNs the bundle
             * id IS the apns-topic, so if the dashboard's iOS platform still names the old
             * one, every push aimed at THIS build is rejected however correctly it is signed.
             *
             * * A SUBSCRIPTION ID + A TOKEN + NO ARRIVING PUSH IS THAT ANSWER, and it is a
             * dashboard fix (BE dev), not a code fix. A token that never appears at all is a
             * different fault and points back here. Read-only: subscribes and logs. */
            try
            {
                logPushSubscription("post-init");
                OneSignal.User.PushSubscription.Changed += (s, e) => logPushSubscription("changed");
            }
            catch (Exception ex)
            {
                Logging.warn("[APNSDIAG] probe could not attach: " + ex.Message);
            }

            /* ★ #494 (#489) — THE LATCH THAT SWALLOWED ITS OWN RETRY. Mirrored from Android,
             * byte-for-byte in intent, so the two platforms cannot drift.
             *
             * `isInitializing` was set above and NEVER reset, while `isInitialized` is set
             * only on the success path. One fault or cancellation therefore disabled push
             * initialization for the entire process: every later call returned at the guard.
             * On iOS this is the more likely of the two to bite, because the permission
             * dialog has a "Don't Allow" button and the whole path has never once run on a
             * device (#486 — the app carried no entitlement until yesterday).
             *
             * ⚠ Reset FIRST in the continuation, before any branch returns — the faulted and
             * cancelled branches both return early and were the exact paths that stuck. */
            try
            {
                OneSignal.Notifications.RequestPermissionAsync(true).ContinueWith(task =>
                {
                    isInitializing = false;

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
            catch (Exception e)
            {
                // Same synchronous guard as Android: RequestPermissionAsync can throw before
                // it ever hands back a task, and that path stuck the latch too.
                isInitializing = false;
                Logging.error("RequestPermissionAsync threw: {0}", e);
            }
        }

        /* * APNS-1 probe. LOG ONLY - see initialize(). Never throws into a caller. */
        private static void logPushSubscription(string when)
        {
            try
            {
                var sub = OneSignal.User.PushSubscription;
                string tok = sub.Token;
                Logging.info("[APNSDIAG] " + when
                    + " bundle=" + NSBundle.MainBundle.BundleIdentifier
                    + " subId=" + (string.IsNullOrEmpty(sub.Id) ? "(none)" : sub.Id)
                    + " token=" + (string.IsNullOrEmpty(tok)
                        ? "(NONE - not registered with APNs)"
                        : tok.Length + " chars")
                    + " optedIn=" + sub.OptedIn);
            }
            catch (Exception ex)
            {
                Logging.warn("[APNSDIAG] " + when + " read failed: " + ex.Message);
            }
        }

        /* ★★ P2 (#708) — THE RUNTIME HALF OF THE OPT-OUT (see the Android twin for the
         * full note). iOS has no consent gate (Initialize already runs post-onboarding), so
         * OFF is an OptOut on a live SDK, and ON is an OptIn — or a fresh initialize() when
         * this session never initialised the SDK. ⚠ Not compile-verified (no NuGet egress). */
        /* ★ P2 (#708): does this platform have a push provider at all? Decides whether the
         * settings row exists (SettingsPage withholds the cap when false). */
        public static bool pushProviderSupported() { return true; }

        public static void applyPushProviderPreference()
        {
            bool enabled = SPIXI.Meta.SNotificationPrefs.pushProviderEnabled;
            try
            {
                if (enabled)
                {
                    if (!isInitialized)
                    {
                        initialize();
                    }
                    else
                    {
                        OneSignal.User.PushSubscription.OptIn();
                    }
                    Logging.info("[NOTIFDIAG] push provider ON (P2)");
                }
                else if (isInitialized)
                {
                    OneSignal.User.PushSubscription.OptOut();
                    Logging.info("[NOTIFDIAG] push provider OFF (P2) — subscription opted out");
                }
            }
            catch (Exception e)
            {
                Logging.error("applyPushProviderPreference({0}) failed: {1}", enabled, e);
            }
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
        /* ★ D1 (#549): the iOS twin of the Android tag — a call row's request identifier
         * is "call-<id>", so the message sweep below can spare it and this cancel can
         * reach it. Local rows only; the OneSignal push rows keep their own ids. */
        public const string CALL_PREFIX = "call-";
        public static void cancelNotification(int messageId)
        {
            try
            {
                UNUserNotificationCenter.Current.RemoveDeliveredNotifications(new string[] { messageId.ToString(), CALL_PREFIX + messageId.ToString() });
                UNUserNotificationCenter.Current.RemovePendingNotificationRequests(new string[] { messageId.ToString(), CALL_PREFIX + messageId.ToString() });
            }
            catch (Exception e)
            {
                Logging.warn("cancelNotification failed: " + e.Message);
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
                    /* ★ D1 loop r1 MAJOR-4: OneSignalNative.Notifications.ClearAll() is the
                     * SDK's app-wide removeAllDeliveredNotifications — it would erase the
                     * `call-` rows one line before the sparing sweep below. DROPPED: the
                     * enumerated removal covers the SDK's rows too (they are delivered
                     * notifications like any other and carry no call- prefix). */
                    // D1 (#549): remove the delivered rows EXCEPT the call rows (the missed call stays)
                    UNUserNotificationCenter.Current.GetDeliveredNotifications((delivered) =>
                    {
                        try
                        {
                            var ids = new System.Collections.Generic.List<string>();
                            if (delivered != null)
                            {
                                foreach (var n in delivered)
                                {
                                    string id = n?.Request?.Identifier ?? "";
                                    if (id.Length > 0 && !id.StartsWith(CALL_PREFIX, StringComparison.Ordinal))
                                    {
                                        ids.Add(id);
                                    }
                                }
                            }
                            if (ids.Count > 0)
                            {
                                UNUserNotificationCenter.Current.RemoveDeliveredNotifications(ids.ToArray());
                            }
                        }
                        catch (Exception ex)
                        {
                            Logging.warn("clearNotifications sweep failed: " + ex.Message);
                        }
                    });
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
                string identifier = (kind == "call" ? CALL_PREFIX : "") + messageId.ToString();   // D1 (#549): call rows are spared by the sweep
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
