using Foundation;
using OneSignalSDK.DotNet;
using OneSignalSDK.DotNet.iOS;
using System;
using UIKit;
using UserNotifications;

namespace OneSignalNotificationServiceExtension
{
    /// <summary>
    /// ★ #919/#915 (Session AC) — the iOS Notification Service Extension, brought to parity
    /// with Android's SNotificationServiceExtension (#510) as far as iOS allows
    /// (docs/ios-nse-spec.md §2): the Spixi gate runs BEFORE OneSignal sees the content.
    ///
    ///   Suppress → the content is emptied and delivered by THIS class, without OneSignal
    ///              (a muted push earns no delivery receipt, and OneSignal must not re-add
    ///              media or buttons to a row that is meant to be blank);
    ///   Show     → the thread id and (opt-in) the name are applied, then OneSignal's own
    ///              handler runs — it adds attachments, action buttons and the confirmed-
    ///              delivery receipt (office findings §11: without this extension "Delivered"
    ///              only ever meant "APNs accepted"), and it calls contentHandler itself.
    ///
    /// ⚠ UNCOMPILED here — the first compile is the iPhone build at the office. The API names
    /// are the ones the shipped OneSignalSDK.DotNet 6.x binding exposes
    /// (NotificationServiceExtension.DidReceiveNotificationExtensionRequest /
    /// ServiceExtensionTimeWillExpireRequest, docs/ios-nse-spec.md §3).
    /// </summary>
    [Register("NotificationService")]
    public class NotificationService : UNNotificationServiceExtension
    {
        Action<UNNotificationContent>? ContentHandler { get; set; }
        UNMutableNotificationContent? BestAttemptContent { get; set; }
        UNNotificationRequest? ReceivedRequest { get; set; }

        protected NotificationService(IntPtr handle) : base(handle)
        {
            // Note: this .ctor should not contain any initialization logic.
        }

        public override void DidReceiveNotificationRequest(UNNotificationRequest request, Action<UNNotificationContent> contentHandler)
        {
            ReceivedRequest = request;
            ContentHandler = contentHandler;
            BestAttemptContent = (UNMutableNotificationContent)request.Content.MutableCopy();

            SpixiPushGate.Verdict verdict;
            try
            {
                string? fa = SpixiPushGate.readFa(request.Content.UserInfo);
                SpixiPushGate.Store? store = SpixiPushGate.load();
                verdict = SpixiPushGate.decide(store, fa);
                SpixiPushGate.trace(store != null, fa, verdict);
            }
            catch (Exception)
            {
                verdict = new SpixiPushGate.Verdict(SpixiPushGate.Action.Show, null, null);   // fail open
            }

            if (verdict.action == SpixiPushGate.Action.Suppress)
            {
                SpixiPushGate.empty(BestAttemptContent);
                ContentHandler = null;   // delivered here and only here — TimeWillExpire must not deliver it again
                contentHandler(BestAttemptContent);
                return;
            }

            SpixiPushGate.apply(BestAttemptContent, verdict);
            NotificationServiceExtension.DidReceiveNotificationExtensionRequest(request, BestAttemptContent, contentHandler);
        }

        public override void TimeWillExpire()
        {
            // Called just before the extension will be terminated by the system.
            // Use this as an opportunity to deliver your "best attempt" at modified content, otherwise the original push payload will be used.
            if (ContentHandler == null || ReceivedRequest == null) return;   // a null request cannot be forwarded (CS8604 under TreatWarningsAsErrors)   // a Suppress already delivered — nothing left to hand over

            NotificationServiceExtension.ServiceExtensionTimeWillExpireRequest(ReceivedRequest, BestAttemptContent);

            if (BestAttemptContent != null) ContentHandler?.Invoke(BestAttemptContent);
        }
    }
}
