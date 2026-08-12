using Android.App;
using Android.Content;
using Android.Graphics;
using Android.OS;
using AndroidX.Core.App;
using IXICore.Meta;
using IXICore.Streaming;
using OneSignalSDK.DotNet;
using OneSignalSDK.DotNet.Core.Debug;
using System;
using OneSignalNative = Com.OneSignal.Android.OneSignal;

namespace Spixi
{
    public class SPushService
    {
        const string channelId = "f26a515e-a46b-45c5-9f29-57abc841e54e";
        const string channelName = "New Messages";
        const string channelDescription = "Spixi local notifications channel.";
        // AND-15 (#334): separate high-importance channel for incoming calls so the
        // user can tune call alerts independently and calls heads-up over messages.
        // Channel display names stay hardcoded English like the existing channel —
        // [i18n-C#] residual (channels are user-visible in system settings).
        const string callChannelId = "spixi-incoming-calls";
        const string callChannelName = "Incoming calls";
        const string callChannelDescription = "Spixi incoming call notifications channel.";
        // AND-13 (#334): brand accent for notification chrome = the logomark fill
        // (src/assets/icons/logo.svg #3050BD = tokens.css --brand-600, the app's
        // action blue). The csproj MauiIcon color is #000000 and colors.xml carries
        // stale template values — the logomark fill is the one true brand source.
        const int accentColor = unchecked((int)0xFF3050BD);
        const int pendingIntentId = 0;

        static bool channelInitialized = false;
        static NotificationManager manager;
        public const string TitleKey = "title";
        public const string MessageKey = "message";

        private static bool isInitializing = false;
        private static bool isInitialized = false;

        private static bool clearRemoteNotificationsAfterInit = false;

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

            OneSignal.Notifications.Clicked += handleNotificationOpened;
            OneSignal.Notifications.WillDisplay += handleNotificationReceived;

            OneSignal.Initialize(SPIXI.Meta.Config.oneSignalAppId);

            // RequestPermissionAsync will show the notification permission prompt.
            OneSignal.Notifications.RequestPermissionAsync(true).ContinueWith(task =>
            {
                if (task.IsCompletedSuccessfully)
                {
                    isInitialized = true;

                    if (clearRemoteNotificationsAfterInit)
                    {
                        clearRemoteNotificationsAfterInit = false;
                        clearRemoteNotifications(0);
                    }
                }
                else
                {
                    Logging.warn("Notification permission request failed or was cancelled.");
                }
            });
        }

        public static void setTag(string tag)
        {
            OneSignal.User.AddTag("ixi", tag);
        }

        public static void clearRemoteNotifications(int unreadCount)
        {
            try
            {
                if (isInitialized)
                {
                    OneSignalNative.Notifications.ClearAllNotifications();
                }
                else
                {
                    clearRemoteNotificationsAfterInit = true;
                    Logging.warn("Cannot clear notifications, OneSignal is not initialized yet.");
                    return;
                }
            }
            catch (Exception e)
            {
                Logging.error("Exception while clearing all notifications: {0}.", e);
                clearRemoteNotificationsAfterInit = true;
            }
        }

        public static void clearNotifications(int unreadCount)
        {
            if (manager != null)
            {
                manager.CancelAll();
            }
            else
            {
                var notificationManager = NotificationManagerCompat.From(Android.App.Application.Context);
                notificationManager?.CancelAll();
            }

            clearRemoteNotifications(unreadCount);
        }

        public static void showLocalNotification(int messageId, string title, string message, string data, bool alert, int unreadCount, string kind = "message")
        {
            if (!channelInitialized)
            {
                CreateNotificationChannel();
            }

            Intent intent = new Intent(Android.App.Application.Context, typeof(MainActivity));
            intent.SetAction(data);
            intent.PutExtra(TitleKey, title);
            intent.PutExtra(MessageKey, message);
            intent.PutExtra("fa", data);

            PendingIntent pendingIntent = PendingIntent.GetActivity(Android.App.Application.Context, pendingIntentId, intent, PendingIntentFlags.Immutable);

            // AND-15 (#334): calls ride their own high-importance channel + heads-up
            // priority (pre-O fallback). No CallStyle/full-screen intent — logged
            // follow-up (API/permission complexity).
            bool isCall = kind == "call";

            // AND-13 (#334): small icon = fresh 5-density white silhouette from the
            // logomark (ic_stat_spixi; the old statusicon was already a white
            // silhouette but capped at xxhdpi) + the brand accent. The LargeIcon
            // line is DROPPED: the only bitmap available is the same white
            // silhouette — invisible on a light shade; large icons are meant for
            // contact/content imagery, not a copy of the app mark.
            NotificationCompat.Builder builder = new NotificationCompat.Builder(Android.App.Application.Context, isCall ? callChannelId : channelId)
                .SetContentIntent(pendingIntent)
                .SetContentTitle(title)
                .SetContentText(message)
                .SetPriority(isCall ? NotificationCompat.PriorityMax : NotificationCompat.PriorityHigh)
                .SetSmallIcon(Resource.Drawable.ic_stat_spixi)
                .SetColor(accentColor)
                .SetAutoCancel(true);

            if (isCall)
            {
                builder.SetCategory(NotificationCompat.CategoryCall);
            }

            if (alert)
            {
                builder.SetDefaults((int)NotificationDefaults.Sound | (int)NotificationDefaults.Vibrate);
            }
            else
            {
                builder.SetSilent(true);
            }

            if (Android.OS.Build.VERSION.SdkInt >= Android.OS.BuildVersionCodes.O)
            {
                builder.SetGroup(data);
            }

            var notification = builder.Build();
            manager.Notify(messageId, notification);
        }

        static void CreateNotificationChannel()
        {
            manager = (NotificationManager)Android.App.Application.Context.GetSystemService("notification");

            if (Build.VERSION.SdkInt >= BuildVersionCodes.O)
            {
                NotificationChannelGroup group = new("Social", "Social");
                manager.CreateNotificationChannelGroup(group);

                var channelNameJava = new Java.Lang.String(channelName);
                var channel = new NotificationChannel(channelId, channelNameJava, NotificationImportance.High)
                {
                    Description = channelDescription,
                    Group = "Social"
                };
                manager.CreateNotificationChannel(channel);

                // AND-15 (#334): "Incoming calls" channel — High importance (heads-up)
                // with sound + vibration; kind == "call" notifications route here.
                var callChannel = new NotificationChannel(callChannelId, new Java.Lang.String(callChannelName), NotificationImportance.High)
                {
                    Description = callChannelDescription,
                    Group = "Social"
                };
                callChannel.EnableVibration(true);
                manager.CreateNotificationChannel(callChannel);
            }

            channelInitialized = true;
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
                    if (!string.IsNullOrEmpty("fa"))
                    {
                        Intent intent = new Intent(Android.App.Application.Context, typeof(MainActivity));
                        intent.PutExtra("fa", Convert.ToString(fa));
                        intent.SetFlags(ActivityFlags.NewTask | ActivityFlags.ClearTop | ActivityFlags.SingleTop);
                        Android.App.Application.Context.StartActivity(intent);
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
