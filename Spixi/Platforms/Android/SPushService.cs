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

        /* ★ #493 (#483) — THE SDK IS READY LONG BEFORE THE PERMISSION ANSWER IS.
         *
         * `isInitialized` has always meant "RequestPermissionAsync came back successfully",
         * which is a DIFFERENT question from "is the OneSignal SDK up". Everything that
         * actually needs the SDK — the WillDisplay gate, ClearAllNotifications — needs only
         * the latter, and gating them on the former is why Damir's 2026-08-22 log carries
         * `Cannot clear notifications, OneSignal is not initialized yet` twice on a normal
         * launch. Two flags, two questions, and they must not be conflated again. */
        private static bool oneSignalReady = false;

        /* ⚠ AUDIT MINOR on #493: a SECOND flag, and it is not redundant. The handlers are
         * attached BEFORE `OneSignal.Initialize` on purpose — a push must never arrive
         * between the two — but `oneSignalReady` is set AFTER it. So if Initialize threw,
         * the retry in `initialize()` would re-enter registerEarly with the handlers
         * already attached and subscribe BOTH a second time: two `PreventDefault` calls
         * and two posts per push, and two `StartActivity` calls on a tap. Attachment is
         * latched separately from readiness. */
        private static bool handlersAttached = false;

        private static bool clearRemoteNotificationsAfterInit = false;

        /// <summary>
        /// ★★ #493 (#483, root-caused in `docs/f5-verdict-2026-08-22b.md` §3) — EVERYTHING A
        /// PUSH NEEDS IN ORDER TO BE OURS, AND NOTHING ELSE.
        ///
        /// Damir, on device: *"if I close the app the notifications keep coming and they are
        /// not grouped, so like legacy"*, and the global master failed the same way. The cause
        /// was never the gate — it was that the gate did not exist yet. `initialize()` used to
        /// run inside `Node.start()`, which the closed-app log dates at **~4 seconds** after
        /// launch (`19:14:23.73 Starting Spixi` → `19:14:27.66 Node started`). A push delivered
        /// to a KILLED app is displayed by OneSignal's NATIVE SDK long before any .NET handler
        /// exists, so the mute, the global master and NOTIF-4's collapsing all belonged to code
        /// that had not run.
        ///
        /// So the registration half moves to `MainApplication.OnCreate`, which Android runs
        /// before ANY component in the process — receiver, service or activity. A push that
        /// wakes a dead process may never start an activity at all, which is exactly why the
        /// Activity was the wrong home.
        ///
        /// ⚠ WHAT THIS SPLIT DELIBERATELY DOES **NOT** MOVE: the permission prompt and
        /// `setTag`. `RequestPermissionAsync` puts an OS dialog on screen and must stay at a
        /// chosen moment, not fire from a background push; `setTag` reads
        /// `getWalletStorage().getPrimaryAddress()` and has no wallet to read this early.
        /// Both stay in `initialize()`, still called from `Node.start()`.
        ///
        /// ⚠ Fenced, and the flag is set only on success: a throw here would run before the
        /// MAUI app is built, and lifecycle ordering is the class that produced #442, #454
        /// and #460. Idempotent, because `initialize()` also calls it as a belt for any path
        /// that reaches the node without the Application hook having run.
        /// </summary>
        public static void registerEarly()
        {
            if (oneSignalReady)
            {
                return;
            }

            try
            {
                OneSignal.Debug.LogLevel = LogLevel.WARN;
                OneSignal.Debug.AlertLevel = LogLevel.NONE;

                if (!handlersAttached)
                {
                    handlersAttached = true;
                    OneSignal.Notifications.Clicked += handleNotificationOpened;
                    OneSignal.Notifications.WillDisplay += handleNotificationReceived;
                }

                OneSignal.Initialize(SPIXI.Meta.Config.oneSignalAppId);

                oneSignalReady = true;
                Logging.info("[NOTIFDIAG] OneSignal handlers registered in the Application (#493)");
            }
            catch (Exception e)
            {
                // Left FALSE on purpose so the next caller retries. The old latch's whole
                // defect (#489, below) was a flag that survived its own failure.
                oneSignalReady = false;
                Logging.error("registerEarly failed: {0}", e);
            }
        }

        public static void initialize()
        {
            // Belt: normally MainApplication.OnCreate has already done this. A path that
            // reaches node start without it must still end up with handlers.
            registerEarly();

            if (isInitializing
                || isInitialized)
            {
                return;
            }

            isInitializing = true;

            /* ★ #494 (#489) — THE LATCH THAT SWALLOWED ITS OWN RETRY.
             *
             * `isInitializing` was set here and NEVER reset; `isInitialized` was set only in
             * the success branch. So one fault or cancellation — the user tapping "Don't
             * allow", a cancelled task, anything — left both flags in a state where every
             * later call returned at the guard above, permanently disabling push
             * initialization for the whole process. It is reset on EVERY completion path,
             * and synchronously too: RequestPermissionAsync can throw before it ever returns
             * a task, and that path used to leave the latch stuck as well. */
            try
            {
                OneSignal.Notifications.RequestPermissionAsync(true).ContinueWith(task =>
                {
                    isInitializing = false;

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
            catch (Exception e)
            {
                isInitializing = false;
                Logging.error("RequestPermissionAsync threw: {0}", e);
            }
        }

        public static void setTag(string tag)
        {
            OneSignal.User.AddTag("ixi", tag);
        }

        public static void clearRemoteNotifications(int unreadCount)
        {
            try
            {
                /* ★ #493: gated on the SDK being up, NOT on the permission answer. Clearing
                 * the shade needs neither a granted permission nor a subscription — it is a
                 * local call on the native SDK. Damir's 2026-08-22 log shows this warning
                 * firing twice on an ordinary launch, purely because `isInitialized` meant
                 * "the permission task came back" and the clear ran before it did. */
                if (oneSignalReady)
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


        /// <summary>
        /// ★ 3.14 (Damir on device 2026-08-21): cancel ONE chat's notification.
        /// Added because an incoming-call row is true when it posts and becomes a lie the
        /// moment the call is missed — it sat there reading "Incoming call" indefinitely.
        /// `clearNotifications` cancels EVERYTHING, which would also wipe unread message
        /// rows the user has not seen, so a targeted cancel was needed.
        /// </summary>
        public static void cancelNotification(int messageId)
        {
            try
            {
                if (manager != null)
                {
                    manager.Cancel(messageId);
                }
                else
                {
                    NotificationManagerCompat.From(Android.App.Application.Context)?.Cancel(messageId);
                }
            }
            catch (Exception e)
            {
                Logging.warn("cancelNotification failed: " + e.Message);
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

        public static void showLocalNotification(int messageId, string title, string message, string data, bool alert, int unreadCount, string kind = "message", int chatUnread = 0)
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

            /* ★ NOTIF-4 (Damir: "five notifications for one chat"). Two halves, and the
             * id half is the one that matters — Node.cs now passes CRC32 of the CHAT
             * ADDRESS rather than of the message id, so `manager.Notify` UPDATES this
             * chat's existing row instead of posting another one beside it. SetGroup(data)
             * has been set since #334 but grouping needs a summary notification to collapse
             * into, and there was never one; replacing the row is the simpler answer and it
             * needs no summary, no group-alert policy and no extra channel.
             *
             * The count half: `chatUnread` is the per-chat unread total, which was already
             * being computed and thrown away. With more than one waiting, the row says how
             * many rather than showing only the newest — the information the four suppressed
             * rows used to carry.
             *
             * ⚠ NOT applied to a CALL. A call is a single live event, not a backlog, and
             * "2 new messages" on an incoming call would be wrong. SetNumber is also skipped
             * for it so the launcher badge keeps counting messages only. */
            if (!isCall && chatUnread > 1)
            {
                /* ⚠ AUDIT MINOR: the count goes in SubText, NOT over ContentText. Replacing
                 * the body destroyed AND-15's per-TYPE line ("Payment request", "File
                 * received") and NOTIF-2's opt-in sender prefix — so Alice texting and then
                 * sending a payment request collapsed to a bare "2 new messages" and the
                 * user lost both facts the notification carried. SubText keeps the newest
                 * event visible and adds the backlog beside it. SetNumber is kept, but it is
                 * badge-only and most launchers ignore it, so it is not load-bearing. */
                builder.SetSubText(string.Format(SPIXI.Lang.SpixiLocalization._SL("notification-new-messages") ?? "{0} new messages", chatUnread));
                builder.SetNumber(chatUnread);
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

                /* ★ #493 — ASK WHETHER THE FETCH CAN EVEN BE ATTEMPTED BEFORE ATTEMPTING IT.
                 *
                 * Now that this handler is registered from the Application (#493), it runs on
                 * pushes that reach a process with NO node in it. `fetchPushMessages` needs
                 * three things the node owns — `OfflinePushMessages.init` having supplied the
                 * push URL and the stream processor (`Node.cs:112`), and
                 * `IxianHandler.getWalletStorage().getPrimaryAddress()` — so on that path it
                 * cannot succeed; it can only throw, or burn an HTTP registration round-trip
                 * inside a push callback. `Node.isRunning` is the honest predicate and it is
                 * strictly narrowing: where the fetch works today (the app is merely
                 * backgrounded) the node IS running and nothing changes. */
                if (SPIXI.Meta.Node.isRunning && OfflinePushMessages.fetchPushMessages(true, true))
                {
                    return;
                }
            }
            catch (Exception ex)
            {
                Logging.error("Exception occured in handleNotificationReceived: {0}", ex);
            }

            /* ★ NOTIF-5 (Damir device round 2026-08-21) — THE SECOND DOOR.
             *
             * Reaching this line means the Ixian fetch above did not handle the push, so the
             * RAW OneSignal notification is about to be posted. That path has never consulted
             * a mute, which is why 3.7 (a muted group still notified), 3.4 ("sometimes works,
             * sometimes doesn't") and 3.12 (a second, unformatted notification beside ours)
             * were all the same defect wearing three faces. NOTIF-1's fix was in the right
             * place; there was simply another way in.
             *
             * ⚠ Scope, stated honestly: a GROUP push carries the SENDER'S address in `fa`,
             * not the group's — which is why tapping one opened a 1:1. So this gate covers
             * the global master and 1:1 chats; the group case needs the payload to carry the
             * group address and is BE. See SNotificationPrefs.shouldDisplayRawPush. */
            string? fa = null;
            try
            {
                var extra = e.Notification.AdditionalData;
                if (extra != null && extra.ContainsKey("fa"))
                {
                    fa = Convert.ToString(extra["fa"]);
                }
            }
            catch (Exception ex)
            {
                Logging.warn("handleNotificationReceived: could not read 'fa': " + ex.Message);
            }

            if (!SPIXI.Meta.SNotificationPrefs.shouldDisplayRawPush(fa))
            {
                Logging.info("[NOTIFDIAG] raw push suppressed by mute/global master");
                return;
            }

            displayColdPush(fa, e);
        }

        /// <summary>
        /// ★★ #495 (#483, the second half of Damir's complaint) — POST **OUR** ROW, NOT THE
        /// RAW ONE.
        ///
        /// *"the notifications keep coming and they are not grouped, so like legacy"*. Both
        /// halves of that sentence are one fact: `e.Notification.display()` posts OneSignal's
        /// own row, with OneSignal's own id. A unique id per push is what makes five messages
        /// five rows — the exact defect NOTIF-4 fixed for LOCAL notifications by keying the id
        /// on the CHAT ADDRESS, and which the push path never inherited. It is also why the
        /// rows looked unlike ours (3.12's *"legacy type notification"*): different channel,
        /// different icon, no accent, no per-type line.
        ///
        /// So this posts through `showLocalNotification` — the same builder, the same channel,
        /// the same `ic_stat_spixi`, the same brand accent, and above all
        /// `SNotificationPrefs.notificationIdFor(fa)`, so a second push from the same sender
        /// REPLACES the first instead of stacking beside it.
        ///
        /// ★ NO NEW OneSignal API IS READ, deliberately. The body is the app's own
        /// `notification-new-message` string, not the push payload's title/body — which is
        /// both the AND-15 (#334) design (a per-type line, never message text) and strictly
        /// more private than the raw row it replaces. There is nothing to lose by not reading
        /// the payload: the app does not display message text in a notification on any
        /// setting.
        ///
        /// ⚠ HONEST SCOPE, and it is the same BE gap as everywhere else in this family: a
        /// GROUP push carries the SENDER'S address in `fa`, not the group's. So a group
        /// message collapses per SENDER rather than per group, and when the node later starts
        /// and fetches the real message, the group's own row posts under a different id — one
        /// extra row, which is exactly what happens today with the raw push, so no worse. For
        /// a 1:1 the two ids are identical and the real row REPLACES this one. The payload
        /// needs the group address; that is `be-cutover` work.
        ///
        /// ⚠ NOT cancelled when the node comes up. #481's lesson: a row the user has not seen
        /// is the only record the event happened, and cancelling it to tidy up is how the
        /// missed-call row was lost.
        /// </summary>
        static void displayColdPush(string? fa, OneSignalSDK.DotNet.Core.Notifications.NotificationWillDisplayEventArgs e)
        {
            try
            {
                if (string.IsNullOrEmpty(fa))
                {
                    /* No addressee: there is no id to key on and no chat to open, so the raw
                     * row is still the best available answer. Same fail-open direction as
                     * shouldDisplayRawPush — a push we cannot attribute is not one we may
                     * drop. */
                    e.Notification.display();
                    return;
                }

                int notifId = SPIXI.Meta.SNotificationPrefs.notificationIdFor(new IXICore.Address(fa), false);
                string notifText = SPIXI.Lang.SpixiLocalization._SL("notification-new-message") ?? "New Message";

                // chatUnread 0: with no node there is no unread count to state, and
                // showLocalNotification only adds the "N new messages" sub-text above 1.
                showLocalNotification(notifId, "Spixi", notifText, fa, true, 0, "message", 0);
                Logging.info("[NOTIFDIAG] cold push posted as a Spixi row, id keyed on the sender (#495)");
            }
            catch (Exception ex)
            {
                /* A malformed address, a missing resource, anything — fall back to the row we
                 * would have posted before this change. A push must never be lost to our own
                 * formatting. */
                Logging.error("displayColdPush failed, falling back to the raw push: {0}", ex);
                try
                {
                    e.Notification.display();
                }
                catch (Exception ex2)
                {
                    Logging.error("raw push display also failed: {0}", ex2);
                }
            }
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
