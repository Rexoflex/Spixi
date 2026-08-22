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
    /// ⚠ THE DECISION ITSELF IS NOT HERE. It lives in `SPushService.decidePush`, shared with
    /// the foreground listener, so the mute, the global master and the one-row-per-chat id
    /// can never disagree between foreground and background — and it is keyed on the
    /// notification id, so if both surfaces ever fire for one notification the second is a
    /// no-op rather than a second fetch and a second row. Whether they can both fire is not
    /// settled by the bytecode; rather than depend on being right about that ordering — the
    /// exact error #503 records — the design is made not to care.
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
                 * a push we cannot read is not one we may drop. */
                Logging.warn("SpixiNotificationServiceExtension: could not read the push: " + ex.Message);
            }

            try
            {
                SPushService.PushAction action = SPushService.decidePush(notificationId, fa, "service-extension");
                if (action == SPushService.PushAction.ShowRaw)
                {
                    return;   // no PreventDefault → the SDK posts its own row, as before
                }

                // Suppress or PostOurs: the SDK's row must not appear either way.
                notificationEvent?.PreventDefault(true);

                if (action == SPushService.PushAction.PostOurs && !string.IsNullOrEmpty(fa))
                {
                    if (!SPushService.postOurPushRow(fa!))
                    {
                        /* Our own row failed to post and we have already discarded the SDK's,
                         * so nothing would reach the user. Post the plainest row we can
                         * rather than lose the message entirely. */
                        try
                        {
                            SPushService.showLocalNotification(
                                fa!.GetHashCode(), "Spixi",
                                SPIXI.Lang.SpixiLocalization._SL("notification-new-message") ?? "New Message",
                                fa!, true, 0, "message", 0);
                        }
                        catch (Exception ex2)
                        {
                            Logging.error("SpixiNotificationServiceExtension: fallback row failed: {0}", ex2);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Logging.error("SpixiNotificationServiceExtension failed: {0}", ex);
            }
        }
    }
}
