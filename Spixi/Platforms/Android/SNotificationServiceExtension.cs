using Android.Runtime;
using Com.OneSignal.Android.Notifications;
using IXICore.Meta;
using System;

namespace Spixi
{
    /// <summary>
    /// ★★ #503 — THE LANE THAT BACKGROUND AND KILLED-APP PUSHES ACTUALLY TAKE.
    ///
    /// Damir's Android pass failed 2.4, 2.5 and 2.6: the global master OFF still notified,
    /// two chats produced four ungrouped rows, and a muted 1:1 notified. #493 had already
    /// moved the OneSignal handler registration into the Application, and the log proves it
    /// worked — `[NOTIFDIAG] OneSignal handlers registered in the Application (#493)` lands
    /// before `MainActivity created`. But in 3,422 lines there is no `raw push suppressed`
    /// and no `cold push posted as a Spixi row`: the handler registers and never fires.
    ///
    /// ★ `WillDisplay` is a FOREGROUND LIFECYCLE LISTENER. It could not have fired for a
    /// killed app at ANY registration time. Our own manifest has said so since #334 —
    /// `com.onesignal.NotificationAccentColor.DEFAULT`, commented *"accent for OneSignal
    /// SDK-rendered notifications (background…)"* — there is a separate path where the SDK
    /// draws the notification itself, in native code, and this class is the only hook into
    /// it. Every gate was green and the lane did nothing, because it was hooked to the
    /// wrong event.
    ///
    /// ⚠ VERIFIED, NOT ASSUMED (#495: no unverifiable API names). The interface, its one
    /// method and the event's members were read out of the SHIPPING binding for the pinned
    /// version — `OneSignalSDK.DotNet` 6.1.9 → `core-release.aar` →
    /// `com.onesignal.notifications.INotificationServiceExtension`, and the Core binding's
    /// Metadata.xml maps `com.onesignal.notifications` to `Com.OneSignal.Android.Notifications`
    /// while removing only the `.internal` sub-packages. The shape also matches the SDK's own
    /// `examples/android-service-ext` sample.
    ///
    /// ★★ `PreventDefault(true)`, AND THE ARGUMENT IS NOT OPTIONAL POLISH. In the SDK's
    /// generation processor the no-argument `preventDefault()` sets `isPreventDefault` and
    /// then makes the SDK **wait on the notification's display waiter** — the "I will call
    /// display() myself later" contract — so a handler that suppresses and never calls
    /// display leaves a coroutine parked until it times out. `preventDefault(true)` sets
    /// `discard`, which returns immediately. We post our own row (or deliberately post
    /// nothing), so discard is the honest one. This is not in the documentation; it is in
    /// the bytecode.
    ///
    /// ★★ #46 LOOP, ROUND 2 — THE ORDERING IS NO LONGER OPEN. IT WAS READ AT SOURCE.
    /// `nuget.org` is 403, but the OneSignal Android SDK is open source and
    /// `raw.githubusercontent.com` answers, so `NotificationGenerationProcessor.kt` was read
    /// directly. ONE call to `processNotificationData` drives BOTH lanes: this extension
    /// first, then the foreground listener — and the foreground listener only when the app is
    /// in the foreground. **But a `PreventDefault(true)` here makes `processHandlerResponse`
    /// return null, which ENDS the function, so the foreground lane never runs after a
    /// discard.** Both lanes fire only when this one did NOT prevent, which is the `ShowRaw`
    /// return below. The memo's consequences are worked through in `SPushService.decidePush`.
    ///
    /// ⚠ THE DECISION ITSELF IS NOT HERE. It lives in `SPushService.decidePush`, shared with
    /// the foreground listener, so the mute, the global master and the one-row-per-chat id
    /// can never disagree between foreground and background — and it is keyed on the
    /// notification id, so a repeat is a no-op rather than a second fetch and a second row.
    ///
    /// ⚠ THE REGISTERED NAME AND THE MANIFEST MUST MATCH. `[Register]` fixes the Java class
    /// name; `AndroidManifest.xml` names the same class in the
    /// `com.onesignal.NotificationServiceExtension` meta-data. Change one and the SDK simply
    /// never finds the class — silently, with no error anywhere. A smoke pin asserts they
    /// agree.
    /// </summary>
    [Register("com/ixilabs/spixi/SpixiNotificationServiceExtension")]
    [Preserve(AllMembers = true)]
    public sealed class SpixiNotificationServiceExtension : Java.Lang.Object, INotificationServiceExtension
    {
        public void OnNotificationReceived(INotificationReceivedEvent notificationEvent)
        {
            string? notificationId = null;
            string? fa = null;
            try
            {
                var notification = notificationEvent?.Notification;
                if (notification != null)
                {
                    try { notificationId = notification.NotificationId; }
                    catch (Exception) { /* only used to de-duplicate — never fatal */ }
                    var extra = notification.AdditionalData;
                    if (extra != null && extra.Has("fa"))
                    {
                        fa = extra.OptString("fa", null);
                    }
                }
            }
            catch (Exception ex)
            {
                /* A push callback must never throw. Falling through with fa == null reaches
                 * ShowRaw, which is the same fail-open direction shouldDisplayRawPush takes:
                 * a push we cannot read is not one we may drop.
                 *
                 * ★ item 6 (#46 loop, round 2): the message comes out of a `JSONObject` read of
                 * wire data, so it can carry line breaks into `ixian.log`. Same shape as m8,
                 * lower value, closed the same way. See `SPushService.logSafe`. */
                Logging.warn("SpixiNotificationServiceExtension: could not read the push: " + SPushService.logSafe(ex.Message));
            }

            try
            {
                SPushService.PushAction action = SPushService.decidePush(notificationId, ref fa, "service-extension");

                if (action == SPushService.PushAction.ShowRaw)
                {
                    return;   // no PreventDefault → the SDK posts its own row, as before
                }

                /* ★ MAJOR-7 (#46 loop, ROUND 2). AN UNREACHABLE BELT, KEPT ON PURPOSE.
                 *
                 * `decidePush` returns `PostOurs` only when `fa` is not empty, and a memo hit
                 * cannot supply an empty one either. So this branch cannot be taken with the
                 * SDK and the decision as they stand today. It is four lines, it is the last
                 * thing between an empty address and a discard that posts nothing, and it
                 * fails open. It is INSURANCE against a future change, not a live guard, and
                 * this comment says so rather than implying a defect it prevents. */
                if (action == SPushService.PushAction.PostOurs && string.IsNullOrEmpty(fa))
                {
                    Logging.warn("[NOTIFDIAG] PostOurs with no address (service-extension) — the SDK row is kept");
                    return;
                }

                /* ★★ MAJOR-4 AND MAJOR-5 (#46 loop, 2026-08-22). POST OUR ROW BEFORE THE
                 * DISCARD, NOT AFTER IT.
                 *
                 * `PreventDefault(true)` cannot be undone. The old order discarded the SDK's
                 * row first and posted ours second, so a throw inside `showLocalNotification`
                 * — the channel create, the Intent, the PendingIntent or Notify, all of which
                 * run for the first time on a cold push process — left the user with NO row at
                 * all. The old fallback could not rescue that case, because it called the same
                 * method that had just thrown. It also keyed its row on `fa.GetHashCode()`, a
                 * SECOND id scheme: `String.GetHashCode` is randomised for each process, so
                 * the same sender gave a different id in each process life. That stacks rows,
                 * which is the NOTIF-4 defect #495 exists to prevent, and
                 * `cancelNotification` could never reach such a row.
                 *
                 * The new order removes all three defects and needs no fallback. If our row
                 * does not post, we do not discard, and the SDK posts its own row. A push can
                 * no longer be lost to our own formatting.
                 *
                 * ⚠ ROUND 2, ON TIME. `postOurPushRow` runs INSIDE the SDK's 30 s
                 * `EXTERNAL_CALLBACKS_TIMEOUT`, together with the fetch that `decidePush` may
                 * have done. If the whole callback overruns that budget the SDK posts its own
                 * row anyway — it sets `wantsToDisplay = true` before calling us — and our row
                 * lands beside it. That is why the fetch inside
                 * `SPushService.decidePushUncached` now waits for nothing. */
                if (action == SPushService.PushAction.PostOurs && !SPushService.postOurPushRow(fa!))
                {
                    return;   // our row did not post — keep the SDK's row rather than lose the push
                }

                // Suppressed, or our row is up. The SDK's row must not appear either way.
                notificationEvent?.PreventDefault(true);
            }
            catch (Exception ex)
            {
                Logging.error("SpixiNotificationServiceExtension failed: {0}", ex);
            }
        }
    }
}
