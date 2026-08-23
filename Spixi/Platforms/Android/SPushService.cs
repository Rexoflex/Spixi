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

        /// <summary>
        /// ★★ #503 — WHAT TO DO WITH ONE INCOMING PUSH, decided in ONE place.
        ///
        /// #493 hung this decision off `WillDisplay`, which is a FOREGROUND lifecycle
        /// listener: it registers correctly, logs correctly, and never fires for a killed
        /// app. Every gate was green and the lane did nothing. The gate itself was always
        /// right — it just needed an entry point that background delivery actually reaches,
        /// which is the NotificationServiceExtension (SNotificationServiceExtension.cs).
        ///
        /// Both entry points call THIS, so the mute, the global master and the
        /// one-row-per-chat id can never disagree between foreground and background.
        /// </summary>
        internal enum PushAction
        {
            /// Nothing is posted — the Ixian fetch handled it, or the user muted it.
            Suppress,
            /// Post OUR row, keyed on the chat address (#495).
            PostOurs,
            /// Let OneSignal post its own row: no addressee, so we cannot key or attribute it.
            ShowRaw,
        }

        /* ★ #503: ONE notification must be decided ONCE. The foreground listener and the
         * service extension are different SDK surfaces and the bytecode does not settle
         * whether both can fire for a single notification — so rather than depend on being
         * right about that ordering (the #503 lesson itself), the decision is made
         * idempotent by OneSignal's own notification id. A second entry for the same id
         * returns the same answer without re-running the fetch or re-posting.
         * Bounded: notification ids are short-lived and the cap keeps a long-running
         * process from accumulating them. */
        /* ★★ MAJOR-7 (#46 loop, ROUND 2, 2026-08-22). THE MEMO CARRIES THE ADDRESS BESIDE
         * THE ACTION. ROUND 2 CORRECTS WHAT THAT IS FOR.
         *
         * ⚠ READ AT SOURCE, NOT REASONED. The OneSignal Android SDK is open source and
         * `raw.githubusercontent.com` answers from this container, so
         * `NotificationGenerationProcessor.kt` was read directly. `nuget.org` is still 403;
         * the source is the better artifact anyway. ONE call to `processNotificationData`
         * drives BOTH lanes. The service extension runs first. The foreground listener runs
         * second, and only when the app is in the foreground. But a `PreventDefault(true)`
         * from the extension sets `discard`, and `processHandlerResponse` then returns null,
         * which ENDS the function.
         *
         * ★ SO A MEMO ENTRY WHOSE ACTION IS `Suppress` OR `PostOurs` CAN NEVER BE READ BY THE
         * OTHER LANE. Both of those paths discard, and the discard stops the second lane. The
         * round-1 comment here claimed the memo repaired a `PostOurs` handed to a lane whose
         * own read of `fa` came back empty. That state is unreachable. The claim is withdrawn.
         *
         * ★ THE REACHABLE ASYMMETRY RUNS THE OTHER WAY, AND IT IS REAL. `ShowRaw` is the only
         * action that leaves both lanes alive. The extension reads `fa` with
         * `JSONObject.OptString`; the foreground lane reads it with `Convert.ToString` on a
         * managed dictionary. When the extension's read comes back empty it decides `ShowRaw`,
         * stores `(ShowRaw, null)` and does NOT prevent — so the foreground lane runs, reads
         * the address correctly, hits the memo and shows the raw unformatted OneSignal row for
         * a chat we could have keyed and formatted. `decidePush` now upgrades that one case.
         * See the comment on the hit path below.
         *
         * The fill-in from the memo INTO the caller stays. It is unreachable with the SDK as
         * it ships today. It costs four lines, and it fails safe if the SDK ever stops ending
         * the call on a discard. It is INSURANCE. It is not a guarantee, and this comment no
         * longer states it as one. */
        private readonly struct PushDecision
        {
            internal PushDecision(PushAction action, string? fa) { this.action = action; this.fa = fa; }
            internal readonly PushAction action;
            internal readonly string? fa;
        }

        private static readonly System.Collections.Generic.Dictionary<string, PushDecision> decidedPushes = new();
        private static readonly System.Collections.Generic.Queue<string> decidedOrder = new();
        private const int DECIDED_CAP = 64;

        /* ★ m10 (#46 loop, ROUND 2): the fetch lock now lives in `SPIXI.Meta.Node`, beside
         * the OTHER caller of `fetchPushMessages`. A lock that only this file could take
         * guarded the push lane against itself and left the pair that actually collides — the
         * node loop tick and a push callback — unserialised. See `Node.pushFetchLock`. */

        internal static PushAction decidePush(string? notificationId, ref string? fa, string where)
        {
            PushDecision seen = default;
            bool hit;
            lock (decidedPushes)
            {
                hit = !string.IsNullOrEmpty(notificationId)
                      && decidedPushes.TryGetValue(notificationId!, out seen);
            }
            if (hit)
            {
                /* ★ item 6 (#46 loop, round 2): the notification id comes off the wire too. */
                Logging.info("[NOTIFDIAG] push " + logSafe(notificationId) + " already decided (" + seen.action + ") — " + where + " is a repeat");

                /* ★★ MAJOR-7 (#46 loop, ROUND 2): THE ONE ASYMMETRY THE SDK CAN PRODUCE.
                 *
                 * `ShowRaw` is the only action after which both lanes run — it is the only one
                 * that does not discard, and a discard ends `processNotificationData`. It is
                 * also chosen for exactly one reason: `decideFromAddress` returns it when `fa`
                 * is empty. So a stored `(ShowRaw, null)` means "the first lane could not read
                 * the address". If THIS lane read one, the first lane's answer was made with
                 * less than we have, and the memo must not freeze it.
                 *
                 * ⚠ THE UPGRADE DOES NOT RE-RUN THE FETCH. It re-enters `decideFromAddress`,
                 * which is the address half of the decision and touches no network. A second
                 * fetch for one push is the thing this memo exists to prevent, and the first
                 * lane already ran it.
                 *
                 * ⚠ WHAT THIS TRADES. The upgrade can turn a row the user WOULD have seen into
                 * no row at all, because `shouldDisplayRawPush` now sees the address and can
                 * apply a per-chat mute that the first lane could not. That is the correct
                 * answer — it is NOTIF-5's whole point — but it is a real behaviour change and
                 * it is stated here rather than hidden. It can also turn ONE raw row into ONE
                 * Spixi row. It cannot produce two rows: the extension left `wantsToDisplay`
                 * true, and this lane prevents whenever it posts. */
                if (seen.action == PushAction.ShowRaw
                    && string.IsNullOrEmpty(seen.fa)
                    && !string.IsNullOrEmpty(fa))
                {
                    PushAction upgraded = decideFromAddress(fa, where);
                    Logging.info("[NOTIFDIAG] the memo held ShowRaw with no address and " + where + " has one — upgraded to " + upgraded);
                    return upgraded;
                }

                if (string.IsNullOrEmpty(fa))
                {
                    fa = seen.fa;
                }
                return seen.action;
            }

            PushAction action = decidePushUncached(fa, where);

            if (!string.IsNullOrEmpty(notificationId))
            {
                lock (decidedPushes)
                {
                    if (decidedPushes.TryGetValue(notificationId!, out PushDecision raced))
                    {
                        if (string.IsNullOrEmpty(fa))
                        {
                            fa = raced.fa;
                        }
                        return raced.action;   // raced; first answer wins
                    }
                    decidedPushes[notificationId!] = new PushDecision(action, fa);
                    decidedOrder.Enqueue(notificationId!);
                    while (decidedOrder.Count > DECIDED_CAP)
                    {
                        decidedPushes.Remove(decidedOrder.Dequeue());
                    }
                }
            }
            return action;
        }

        private static PushAction decidePushUncached(string? fa, string where)
        {
            try
            {
                /* ★ #493 — ASK WHETHER THE FETCH CAN EVEN BE ATTEMPTED BEFORE ATTEMPTING IT.
                 *
                 * On a cold push the process has NO node in it. `fetchPushMessages` needs
                 * three things the node owns — `OfflinePushMessages.init` having supplied the
                 * push URL and the stream processor (`Node.cs:112`), and
                 * `IxianHandler.getWalletStorage().getPrimaryAddress()` — so there it cannot
                 * succeed; it can only throw, or burn an HTTP round-trip inside a push
                 * callback. `Node.isRunning` is the honest predicate and it is strictly
                 * narrowing: where the fetch works today the node IS running. */
                /* ★★ m10 (#46 loop, ROUND 2): SERIALISE THE FETCH, AND WAIT FOR NOTHING.
                 *
                 * `decidePushUncached` runs OUTSIDE the memo lock on purpose, because the fetch
                 * does blocking HTTP. The memo cannot help here: two DIFFERENT notifications
                 * carry two different keys, so both reach this line. `fetchPushMessages`
                 * mutates a static nonce in Ixian-Core with no lock of its own, so two
                 * concurrent fetches desynchronise it. The device log of 2026-08-22 carries
                 * three pushes inside 0.5 s, so the burst is real.
                 *
                 * ⚠⚠ ROUND 1 WAITED 5000 ms HERE, AND THAT WAS THE DEFECT, NOT THE FIX. The
                 * OneSignal SDK gives this callback 30 s — `EXTERNAL_CALLBACKS_TIMEOUT`, read
                 * out of `NotificationGenerationProcessor.kt`. It sets `wantsToDisplay = true`
                 * BEFORE it calls us, so when we overrun the SDK posts its OWN row while we go
                 * on to post ours. Two rows for one push is NOTIF-4 and symptom 3.12, the
                 * defect this batch exists to remove. Behind this line sits
                 * `OfflinePushMessages.fetchPushMessages`, which builds `new HttpClient()` with
                 * NO Timeout — so 100 s each — and blocks on `.Result`, once for `fetch.php`
                 * and once more for `remove.php` per message. Adding five seconds in front of
                 * that spends a budget we cannot afford on a call we do not own.
                 *
                 * ★ SO THE WAIT IS ZERO. `Node.PUSH_FETCH_TRY_MS` is 0: take the lock only when
                 * it is free, otherwise skip. Any bound short enough to be safe is far too
                 * short to outlast an HTTP round trip, so a bound would only pretend to help.
                 * A skipped fetch is not a lost message — the holder is fetching the SAME
                 * mailbox for the SAME wallet, and this lane falls through to the mute gate,
                 * which posts a row. That is the fail-open direction this method already takes
                 * for a push it cannot attribute.
                 *
                 * ⚠ THE HTTP TIMEOUT ITSELF IS STILL OPEN. It lives in
                 * `Ixian-Core/Streaming/OfflinePushMessages.cs:118`, and Ixian-Core is frozen
                 * at 097341a. One `client.Timeout` there would close the last of this.
                 *
                 * ⚠ THREE-ARGUMENT TryEnter. The two-argument form takes the lock inside the
                 * call and assigns the flag after it returns; an asynchronous exception in that
                 * window would hold the lock for the life of the process. */
                if (SPIXI.Meta.Node.isRunning)
                {
                    bool fetchTaken = false;
                    try
                    {
                        System.Threading.Monitor.TryEnter(SPIXI.Meta.Node.pushFetchLock, SPIXI.Meta.Node.PUSH_FETCH_TRY_MS, ref fetchTaken);
                        if (!fetchTaken)
                        {
                            Logging.warn("[NOTIFDIAG] offline fetch is busy, skipped (" + where + ")");
                        }
                        else if (OfflinePushMessages.fetchPushMessages(true, true))
                        {
                            return PushAction.Suppress;
                        }
                    }
                    finally
                    {
                        if (fetchTaken)
                        {
                            System.Threading.Monitor.Exit(SPIXI.Meta.Node.pushFetchLock);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Logging.error("Exception occured in decidePush (" + where + "): {0}", ex);
            }

            return decideFromAddress(fa, where);
        }

        /* ★ MAJOR-7 (#46 loop, ROUND 2): THE ADDRESS HALF OF THE DECISION, ON ITS OWN.
         *
         * Everything here depends on `fa` and nothing here touches the network.
         * `decidePushUncached` ends in it, and the memo's `ShowRaw` upgrade re-enters it. That
         * split is the whole reason the upgrade can correct an answer without a SECOND fetch
         * for one push. ⚠ It must stay ONE method: two copies of a mute test is how one of
         * them gets fixed and the other does not, which is m12 in this very file family. */
        private static PushAction decideFromAddress(string? fa, string where)
        {
            /* ★ NOTIF-5 (Damir device round 2026-08-21) — THE SECOND DOOR.
             *
             * Reaching this line means the Ixian fetch did not handle the push, so a raw
             * OneSignal notification is about to be posted. That path never consulted a mute,
             * which is why 3.7 (a muted group still notified), 3.4 ("sometimes works,
             * sometimes doesn't") and 3.12 (a second, unformatted notification beside ours)
             * were all the same defect wearing three faces.
             *
             * ⚠ Scope, stated honestly: a GROUP push carries the SENDER'S address in `fa`,
             * not the group's — which is why tapping one opened a 1:1. So this gate covers
             * the global master and 1:1 chats; the group case needs the payload to carry the
             * group address and is BE. See SNotificationPrefs.shouldDisplayRawPush. */
            if (!SPIXI.Meta.SNotificationPrefs.shouldDisplayRawPush(fa))
            {
                Logging.info("[NOTIFDIAG] raw push suppressed by mute/global master (" + where + ")");
                return PushAction.Suppress;
            }

            if (string.IsNullOrEmpty(fa))
            {
                /* No addressee: there is no id to key on and no chat to open, so the raw row
                 * is still the best available answer. Same fail-open direction as
                 * shouldDisplayRawPush — a push we cannot attribute is not one we may drop. */
                return PushAction.ShowRaw;
            }
            return PushAction.PostOurs;
        }

        /* ★ m8 AND item 6 (#46 loop, ROUND 2): ONE SANITISER FOR EVERY WIRE-DERIVED VALUE
         * THAT REACHES THE LOG.
         *
         * `Logging.log` writes the message verbatim and adds the line prefix itself. Nothing
         * escapes it. So any value that came off the wire can carry a newline and write forged
         * LINES into `ixian.log` — the address inside an `IXICore.Address` exception message,
         * the OneSignal notification id, the message of a failed JSON read. That file is
         * shareable from DevPage and `maxLogCount` is 5, so it is the artifact this project
         * uses as evidence. `docs/security-handover-gate.md` also states that no log line
         * carries an address. Flatten the line breaks and truncate.
         *
         * ⚠ SCOPE, STATED HONESTLY. This closes CR and LF. It does not close U+2028 or U+2029,
         * because the log writer is a .NET StreamWriter and does not treat them as line
         * breaks. It also does not make the value safe for a viewer that does. */
        private const int LOG_SAFE_MAX = 160;

        internal static string logSafe(string? value)
        {
            string safe = (value ?? string.Empty).Replace('\r', ' ').Replace('\n', ' ');
            if (safe.Length > LOG_SAFE_MAX)
            {
                safe = safe.Substring(0, LOG_SAFE_MAX);
            }
            return safe;
        }

        /// <summary>★ #495: post OUR row for a push, keyed on the chat address so a second
        /// message from the same sender REPLACES the first instead of stacking beside it.
        /// Returns false when it could not, so the caller can fall back to the raw row —
        /// a push must never be lost to our own formatting.</summary>
        internal static bool postOurPushRow(string fa)
        {
            try
            {
                int notifId = SPIXI.Meta.SNotificationPrefs.notificationIdFor(new IXICore.Address(fa), false);
                string notifText = SPIXI.Lang.SpixiLocalization._SL("notification-new-message") ?? "New Message";

                // chatUnread 0: with no node there is no unread count to state, and
                // showLocalNotification only adds the "N new messages" sub-text above 1.
                showLocalNotification(notifId, "Spixi", notifText, fa, true, 0, "message", 0);
                Logging.info("[NOTIFDIAG] push posted as a Spixi row, id keyed on the sender (#495)");
                return true;
            }
            catch (Exception ex)
            {
                /* ★ m8 (#46 loop, 2026-08-22): DO NOT LOG THE EXCEPTION OBJECT HERE.
                 *
                 * `fa` comes off the wire, and `IXICore.Address` formats the offending string
                 * INTO its exception message. Log the exception TYPE and a sanitised message.
                 * See `logSafe`. */
                Logging.error("postOurPushRow failed, the raw push is kept: " + ex.GetType().Name + ": " + logSafe(ex.Message));
                return false;
            }
        }

        /// <summary>The FOREGROUND lane. #503: this is a lifecycle listener and only fires
        /// while the app is alive — background and killed-app delivery goes through
        /// SNotificationServiceExtension. Both call decidePush, which is keyed on the
        /// notification id, so if the two ever fire for the SAME notification the second one
        /// is a no-op instead of a second fetch and a second row.</summary>
        static void handleNotificationReceived(object? sender, OneSignalSDK.DotNet.Core.Notifications.NotificationWillDisplayEventArgs e)
        {
            string? notificationId = null;
            string? fa = null;
            try
            {
                try { notificationId = e.Notification.NotificationId; }
                catch (Exception) { /* id is only used to de-duplicate — never fatal */ }
                var extra = e.Notification.AdditionalData;
                if (extra != null && extra.ContainsKey("fa"))
                {
                    fa = Convert.ToString(extra["fa"]);
                }
            }
            catch (Exception ex)
            {
                /* ★ item 6 (#46 loop, round 2): this message comes out of a read of wire data.
                 * Same shape as m8, lower value, closed the same way. */
                Logging.warn("handleNotificationReceived: could not read the push: " + logSafe(ex.Message));
            }

            /* ★ m9 (#46 loop, 2026-08-22): the extension guards this call and this lane did
             * not. An exception that escapes here throws into the SDK's own event dispatch. A
             * push callback must never throw — the extension's docblock states that rule and
             * this lane must follow it too. `ShowRaw` is the fail-open answer: the SDK's row is
             * better than no row. ⚠ Round 2 also moved `PreventDefault()` BELOW this call, so
             * a throw here no longer leaves the push prevented AND never displayed. */
            PushAction action;
            try
            {
                action = decidePush(notificationId, ref fa, "foreground");
            }
            catch (Exception ex)
            {
                Logging.error("handleNotificationReceived: decidePush failed, the raw push is kept: " + ex.GetType().Name);
                action = PushAction.ShowRaw;
            }
            /* ⚠⚠ MAJOR-6 (#46 loop, ROUND 2) — READ AT SOURCE, AND THE ANSWER IS THAT THIS
             * LINE CANNOT BE FIXED. IT CAN ONLY BE MOVED AND EXPLAINED.
             *
             * Round 1 left this open because `nuget.org` answers 403. It still does. But the
             * OneSignal SDKs are open source and `raw.githubusercontent.com` answers, so both
             * missing facts were read out of the shipping source at the pinned version:
             *
             *   1. `OneSignalSDK.DotNet` 6.1.9 →
             *      `OneSignalSDK.DotNet.Android/AndroidNotificationsManager.cs` →
             *      `AndroidNotificationWillDisplayEventArgs.PreventDefault()` calls
             *      `_willDisplayEvent.PreventDefault()`. It IS the native no-argument form.
             *   2. `OneSignalSDK.DotNet.Core/Notifications/NotificationWillDisplayEventArgs.cs`
             *      at tag 6.1.9 declares exactly `public abstract void PreventDefault();`.
             *      THERE IS NO BOOLEAN OVERLOAD ON THE MANAGED SURFACE. `e.PreventDefault(true)`
             *      would not compile. The extension gets the boolean because it implements the
             *      NATIVE `INotificationServiceExtension` and holds the native event object.
             *
             * ★ SO WHAT ACTUALLY HAPPENS, from `NotificationGenerationProcessor.kt`. The
             * foreground callback runs inside `withTimeout(EXTERNAL_CALLBACKS_TIMEOUT)`, and
             * `EXTERNAL_CALLBACKS_TIMEOUT` is 30_000L. On return the SDK sees `isPreventDefault`
             * and `discard == false`, sets `wantsToDisplay = false`, and waits on the display
             * waiter. THE PARK IS BOUNDED AT 30 s, not unbounded. When it expires the
             * assignment never happens, so `wantsToDisplay` STAYS false and the SDK does NOT
             * display. A suppressed push therefore stays correctly suppressed, and a push we
             * posted ourselves does not get a second row beside ours. The cost is one parked
             * coroutine on an IO dispatcher for the remainder of the 30 s, per prevented push.
             * That is the honest size of MAJOR-6: a bounded, correct, wasteful park.
             *
             * ⚠ TWO RETURNS BELOW PREVENT AND NEVER WAKE — `Suppress`, and `PostOurs` after a
             * successful post. Round 1's comment named only the first. There is no way to wake
             * the waiter without displaying: `e.Notification.display()` wakes it with TRUE and
             * posts the SDK's raw row, and calling `PreventDefault()` a second time does
             * nothing, because the native code wakes only when `discard` is true. The only real
             * fix is a boolean overload on `NotificationWillDisplayEventArgs`, which is
             * upstream work in `OneSignal-DotNet-SDK`.
             *
             * ★ WHAT ROUND 2 DID CHANGE: the call MOVED. It ran unconditionally at the top of
             * the read block, BEFORE `NotificationId` and `AdditionalData` were touched, so a
             * throw while reading the payload left the push prevented and never displayed — the
             * push vanished. It now runs only on the two paths that mean it. `ShowRaw` no
             * longer prevents at all, which also removes the prevent-then-undo round trip and
             * makes this lane match the extension's `ShowRaw` return exactly.
             *
             * ⚠ VERIFIED SAFE TO MOVE. `CallbackProducer.fire` invokes the handler
             * synchronously and the SDK reads `isPreventDefault` only AFTER
             * `externalNotificationWillShowInForeground` returns. Calling it at the end of the
             * handler is therefore identical to calling it at the start. */
            try
            {
                if (action == PushAction.Suppress)
                {
                    e.PreventDefault();
                    return;
                }
                /* ★ MAJOR-7 (#46 loop): the address guard. `decidePush` fills `fa` in from the
                 * memo when this lane could not read it, and upgrades a `ShowRaw` that was
                 * decided without an address. If `fa` is STILL empty we cannot post our row, so
                 * fall through to the SDK's row rather than post nothing. */
                if (action == PushAction.PostOurs && !string.IsNullOrEmpty(fa) && postOurPushRow(fa!))
                {
                    e.PreventDefault();
                    return;
                }
            }
            catch (Exception ex)
            {
                /* m9: a push callback must never throw. Falling through leaves the push
                 * un-prevented, so the SDK posts its own row — the fail-open direction. */
                Logging.error("handleNotificationReceived: could not apply the decision, the raw push is kept: " + ex.GetType().Name);
            }

            /* ShowRaw, or our own row did not post. Return WITHOUT PreventDefault. The SDK left
             * `wantsToDisplay` true before it called us, so doing nothing IS the raw row — the
             * same thing the extension does on its own `ShowRaw` return. `display()` is not
             * called and must not be: it only wakes a waiter, and nothing is waiting. */
        }

        static void handleNotificationOpened(object? sender, OneSignalSDK.DotNet.Core.Notifications.NotificationClickedEventArgs e)
        {
            try
            {
                if (e.Notification.AdditionalData.ContainsKey("fa"))
                {
                    /* ★ m11 (#46 loop, 2026-08-22): this tested the LITERAL "fa", not the value,
                     * so the guard was always true and never read the address. It was benign
                     * only because `MainActivity.handleNotificationIntent` checks again. A
                     * guard that reads as if it works is how the next change fails silently.
                     * iOS already has the correct form. */
                    string? fa = Convert.ToString(e.Notification.AdditionalData["fa"]);
                    if (!string.IsNullOrEmpty(fa))
                    {
                        Intent intent = new Intent(Android.App.Application.Context, typeof(MainActivity));
                        intent.PutExtra("fa", fa);
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
