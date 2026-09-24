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
                SpixiPushGate.trace(store, fa, verdict);
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
            /* ★ #975 (office fix round, iO.5) — THE THREAD SURVIVES ONESIGNAL. The walk showed no
             * grouping while the name, applied in the SAME apply() call, did show — so the thread id
             * is set here and lost downstream (OneSignal builds the content it finally delivers).
             * The handler OneSignal receives is a WRAPPER: it compares the thread on the content that
             * actually reaches the system with the one the gate applied, re-applies it on a mutable
             * copy when it is missing or different, logs the comparison as one fixed word (never
             * the thread value — it IS the sender's address), and delivers exactly ONCE (the
             * TimeWillExpire belt calls the same wrapper; the first delivery wins). */
            Action<UNNotificationContent> wrapped = threadKeeper(verdict.thread, contentHandler);
            ContentHandler = wrapped;
            NotificationServiceExtension.DidReceiveNotificationExtensionRequest(request, BestAttemptContent, wrapped);
        }

        /// <summary>★ #975: the final-content wrapper (see the call site). Never throws into iOS:
        /// a failed re-apply delivers the content as it arrived.</summary>
        static Action<UNNotificationContent> threadKeeper(string? want, Action<UNNotificationContent> final)
        {
            int delivered = 0;
            return (content) =>
            {
                if (System.Threading.Interlocked.Exchange(ref delivered, 1) == 1)
                {
                    SpixiPushGate.write("[SPUSH] final repeat=dropped");
                    return;
                }
                UNNotificationContent outContent = content;
                string state = "none";
                try
                {
                    string? had = content?.ThreadIdentifier;
                    state = SpixiPushGate.threadState(want, had);
                    if ((state == "lost" || state == "changed") && content != null)
                    {
                        UNMutableNotificationContent copy = (UNMutableNotificationContent)content.MutableCopy();
                        copy.ThreadIdentifier = want!;
                        outContent = copy;
                    }
                }
                catch (Exception)
                {
                    state = "error";
                }
                SpixiPushGate.write("[SPUSH] final thread=" + state);
                final(outContent);
            };
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
