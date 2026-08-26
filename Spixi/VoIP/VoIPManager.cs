using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using Microsoft.Maui.Controls;
using Spixi;
using SPIXI.Interfaces;
using SPIXI.Lang;
using SPIXI.Meta;
using System;
using System.Linq;
using System.Text;
using System.Threading;

namespace SPIXI.VoIP
{

    public class VoIPManager
    {
        public static byte[]? currentCallSessionId { get; private set; }
        public static Friend currentCallContact { get; private set; }
        public static bool currentCallAccepted { get; private set; }
        public static bool currentCallCalleeAccepted { get; private set; }
        public static string? currentCallCodec { get; private set; }
        public static long currentCallStartedTime { get; private set; }

        static IAudioPlayer? audioPlayer = null;
        static IAudioRecorder? audioRecorder = null;

        static long lastPacketReceivedTime = 0;
        static Thread? lastPacketReceivedCheckThread = null;
        private static readonly object lastPacketReceivedLock = new object();

        static bool currentCallInitiator = false;
        static bool currentCallDeclinedLocally = false;   // F5-1 r3 (R-2): THIS device rejected the call (user decline, or the codec auto-reject where no row/message ever existed) — cancel the row, never "Missed call"

        /* ★★ #572 ④ — A CALL THE USER DECLINED IS NOT A MISSED CALL, AND THE BUBBLE
         * MUST SAY SO AFTER A RESTART TOO.
         *
         * #554's R-2 fixed the NOTIFICATION with the latch above. The chat bubble and
         * the chats-list row were still wrong, because both read the stored message:
         * an ended call with an EMPTY message body means "never connected", and for an
         * incoming call that reads as "Missed call" (SingleChatPage:2387-2396,
         * HomePage:2200-2206). A live latch cannot help them — history is re-read on
         * every chat open, long after the latch reset.
         *
         * So the decline is written INTO the message body, which is what persists.
         *
         * ⚠ WHY "-1" AND NOT A WORD. The body of an ENDED call is parsed as the call
         * duration by a BARE `Int32.Parse` (SingleChatPage, inside insertMessage — there
         * is no try/catch on that path, in this build or an older one). The marker never
         * reaches it, because the declined branch short-circuits first. But the value
         * still has to be safe if it ever did, and a DOWNGRADE to an older binary has no
         * short circuit at all: a word there throws inside the message render, while "-1"
         * parses, fails the `seconds > 0` test and degrades to a harmless "(0:00)".
         * A wrong label is a bug; a throw is a broken chat screen.
         * ⚠ No real duration can collide: `callDuration` is a non-negative difference of
         * timestamps, and it is only written when the call was ACCEPTED. */
        public const string declinedLocallyMarker = "-1";

        /// <summary>True when THIS device declined the call this message records.</summary>
        public static bool isDeclinedLocally(FriendMessage? msg)
        {
            return msg != null
                && msg.type == FriendMessageType.voiceCallEnd
                && msg.message == declinedLocallyMarker;
        }
        public static long currentCallInitiated { get; private set; } = 0;

        public static bool isInitiated()
        {
            if(currentCallSessionId != null)
            {
                return true;
            }
            return false;
        }

        public static void initiateCall(Friend friend)
        {
            if (currentCallSessionId != null)
            {
                return;
            }

            SSpixiPermissions.requestAudioRecordingPermissions();

            currentCallSessionId = Guid.NewGuid().ToByteArray();
            currentCallContact = friend;
            currentCallCalleeAccepted = false;
            currentCallAccepted = true;
            currentCallCodec = null;
            currentCallInitiator = true;
            currentCallInitiated = Clock.getTimestamp();

            string codecs = String.Join("|", SSpixiCodecInfo.getSupportedAudioCodecs());

            var sm = StreamProcessor.sendAppRequest(friend, "spixi.voip", currentCallSessionId, Encoding.UTF8.GetBytes(codecs), "spixi.voip");
            Node.addMessageWithType(currentCallSessionId, FriendMessageType.voiceCall, friend.walletAddress, 0, "", true, null, 0, false);
            // C18/C19 (#265): BROADCAST — stack-last is HomePage under the #225 overlay
            // model, so an outgoing call started FROM A CHAT showed no bar at all.
            SpixiContentPage.broadcastCallBar(currentCallSessionId, SpixiLocalization._SL("global-call-dialing") + " " + friend.nickname + "...", 0);
            
            aquirePowerLocks();
            // ★ the sound BELT (#518, extended by #46 r1 auditor D): every audio
            // trigger names itself at info level — the platform helpers log only
            // exceptions, so a stale tone was undiagnosable from the log.
            Logging.info("SND call-tone: dialing");
            SPlatformUtils.startDialtone(DialtoneType.dialing);
            startRingTimeout();   // #265: an unanswered call must not ring forever
        }

        /// <param name="agedSeconds">#574 ① (round-2 MAJOR-4): how much of the caller's ring
        /// budget this request already spent in transit. 0 for every live call.</param>
        public static bool onReceivedCall(Friend friend, byte[] session_id, byte[] data, long agedSeconds = 0)
        {
            if (currentCallSessionId != null)
            {
                if (!currentCallSessionId.SequenceEqual(session_id))
                {
                    StreamProcessor.sendAppRequestReject(friend, session_id);
                }
                return false;
            }

            currentCallSessionId = session_id;
            currentCallContact = friend;
            currentCallCalleeAccepted = true;
            currentCallAccepted = false;
            currentCallCodec = null;
            currentCallInitiator = false;
            // #574 ①: backdate the budget by what the request already burned in transit.
            currentCallInitiated = Clock.getTimestamp() - (agedSeconds > 0 ? agedSeconds : 0);

            string codecs_str = Encoding.UTF8.GetString(data);

            string[] codecs = codecs_str.Split(new string[] { "|" }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var codec in codecs)
            {
                if (SSpixiCodecInfo.isCodecSupported(codec))
                {
                    currentCallCodec = codec;
                    break;
                }
            }
            if (currentCallCodec == null)
            {
                Logging.error("Unsupported audio codecs: " + codecs_str);
                rejectCall(session_id);
                return false;
            }
            aquirePowerLocks();
            // #334 AND-11: pre-request the mic at RING time (messenger practice) so
            // the grant dialog resolves while the phone is still ringing instead of
            // inside the answer tap (see the acceptCall gate). Loop MINOR-6: this
            // runs on the STREAM thread — Android's RequestPermissions must launch
            // from the main thread or it's OEM-flaky/unsupported.
            if (!SSpixiPermissions.hasAudioRecordingPermissions())
            {
                Microsoft.Maui.ApplicationModel.MainThread.BeginInvokeOnMainThread(() =>
                {
                    SSpixiPermissions.requestAudioRecordingPermissions();
                });
            }
            /* ★★ #586 item 33 — THE MUTE HAS TO REACH THE RING, not only the tray.
             * Damir's walk: a muted contact raised no notification (the push gate works)
             * and the phone rang anyway, with nothing on screen to explain it. Only
             * SPushService consulted SNotificationPrefs; this call did not.
             *
             * ★★ AND NOT WHILE OUR OWN LOCK IS UP (Damir, this round — he re-dialled the
             * #272 rule himself: "fix it up so it doesn't ring"). #272 made the lock and
             * the call surface mutually exclusive with the lock winning, so a call that
             * arrives behind the lock rang for the full 45 s budget with NO UI and no way
             * to stop it. The notification lane still fires and IS actionable, so the
             * user is told; they are simply not rung at by a screen they cannot answer.
             * ⚠ This SUPERSEDES #272's "rings audibly but shows no UI" clause, on his say.
             *
             * ⚠ The session is still created either way. Only the SOUND is gated — the
             * call must remain answerable from the notification, and the #265 timeout
             * must still run so an unanswered call still becomes a missed call. */
            bool ringAllowed = true;
            try
            {
                if (!SPIXI.Meta.SNotificationPrefs.shouldRingForCall(friend))
                {
                    ringAllowed = false;
                    Logging.info("SND call-tone: SUPPRESSED, the contact is muted");
                }
                else if (Microsoft.Maui.Controls.Application.Current is App app && app.isAppLockActive)
                {
                    ringAllowed = false;
                    Logging.info("SND call-tone: SUPPRESSED, the app lock is up and no call UI can be shown (#272)");
                }
            }
            catch (Exception rex)
            {
                // A gate that throws must not silence a real call.
                Logging.warn("SND call-tone: the ring gate threw, ringing anyway: " + rex.Message);
                ringAllowed = true;
            }
            if (ringAllowed)
            {
                Logging.info("SND call-tone: ringing");   // sound belt (#518)
                SPlatformUtils.startRinging();
            }
            startRingTimeout();   // #265: the incoming overlay auto-clears on the SAME budget
            return true;
        }

        private static void aquirePowerLocks()
        {
            SPowerManager.AquireLock("screenDim");
            SPowerManager.AquireLock("partial");
            SPowerManager.AquireLock("wifi");
            SPowerManager.AquireLock("proximityScreenOff");
        }

        private static void releasePowerLocks()
        {
            SPowerManager.ReleaseLock("screenDim");
            SPowerManager.ReleaseLock("partial");
            SPowerManager.ReleaseLock("wifi");
            SPowerManager.ReleaseLock("proximityScreenOff");
        }

        private static void startVoIPSession()
        {
            if (currentCallCodec == null)
            {
                Logging.error("No current call codec!");
                return;
            }

            SPlatformUtils.stopDialtone();
            SPlatformUtils.stopRinging();
            try
            {
                audioPlayer = SAudioPlayer.Instance();
                audioPlayer.start(currentCallCodec);

                audioRecorder = SAudioRecorder.Instance();
                audioRecorder.start(currentCallCodec);
                audioRecorder.setOnSoundDataReceived((data) =>
                {
                    StreamProcessor.sendAppData(currentCallContact, currentCallSessionId, data);
                });
                currentCallStartedTime = Clock.getTimestamp();
                startLastPacketReceivedCheck();
            }
            catch(Exception e)
            {
                Logging.error("Exception occured while starting VoIP session: " + e);
                hangupCall(currentCallSessionId, true);
            }
        }

        private static void endVoIPSession()
        {
            SPlatformUtils.stopRinging();

            /* ★ 3.14 (Damir on device 2026-08-21): "despite being a missed call the
             * notification says 'Incoming call'."
             *
             * It is not wrong copy — it is STALE copy. The row is posted while the call is
             * genuinely incoming and then outlives the call, because nothing ever took it
             * down. NOTIF-4 made that more visible: the call keeps its own id instead of
             * being overwritten by the next message, so the lie persists until tapped.
             *
             * ⚠ MY FIRST FIX WAS WRONG, and Damir caught it on device: I CANCELLED the row.
             * That deleted the missed call instead of correcting it — "the missed call row
             * doesn't remain in the notification tray, it disappears". A missed call is
             * exactly the kind of thing a notification tray exists to hold on to; the
             * verdict said to REWORD it and I over-simplified to a cancel.
             *
             * So it is RE-POSTED under the same id with missed-call copy. Same id means it
             * REPLACES the stale row rather than stacking beside it, and it is call-flavoured
             * so it can never take down a message row. Silent (`alert: false`) — the ringtone
             * already happened, and a second buzz for a call you just missed is noise.
             *
             * ⚠ Only when the call was NOT answered. `acceptCall` cancels instead: once you
             * are talking, there is nothing left to tell you. */
            try
            {
                var endedWith = currentCallContact;
                if (endedWith != null && endedWith.walletAddress != null)
                {
                    int callNotifId = SPIXI.Meta.SNotificationPrefs.notificationIdFor(endedWith.walletAddress, true);
                    /* ★★ F5-1 r2 (#554, loop A-1) — THE REAL EATER, one predicate. The old
                     * test was `currentCallAccepted || currentCallCalleeAccepted ||
                     * currentCallInitiator` — but onReceivedCall sets
                     * currentCallCalleeAccepted = true AT RING TIME for EVERY incoming
                     * call (:92), so the OR was always true, the cancel branch always ran
                     * (and cancelNotification takes the TAGGED row too), and the
                     * "Missed call" re-post below was UNREACHABLE code. That is the row
                     * Damir watched vanish. ANSWERED means BOTH ends accepted — the same
                     * `callAccepted` this file already computes for the chat card (:266).
                     * A call we PLACED still cancels (nothing was missed). */
                    bool answeredCall = currentCallAccepted && currentCallCalleeAccepted;
                    /* r3 (verdict R-2): + declined-locally — the user SAW the call and
                     * dismissed it; posting "Missed call" at the decline would be a lie. */
                    if (answeredCall || currentCallInitiator || currentCallDeclinedLocally)
                    {
                        // Answered, or we placed it — nothing was missed, so take the row down.
                        SPushService.cancelNotification(callNotifId);
                    }
                    else if (!SNotificationPrefs.shouldNotify(endedWith))
                    {
                        /* ★★ #611 (device row 33, 2026-08-27): A MUTED CONTACT DOES NOT GET A
                         * MISSED-CALL ROW EITHER.
                         *
                         * #586 made the MUTE reach the RING, and its own comment records that
                         * only the SOUND was gated on purpose — "a suppressed ring still
                         * becomes a missed call". That is still true and this does not change
                         * it: the session, the #265 timeout and the call's place in the chat
                         * history are all untouched. What changes is the BANNER.
                         *
                         * There were three producers of a missed-call notification and only
                         * two asked. `Node.cs` asks, `StreamProcessor.cs` asks, and this one
                         * — the only one that fires for a genuinely missed LIVE call — did
                         * not, because `showLocalNotification` is the raw poster and applies
                         * no policy of its own. So a muted contact rang silently, exactly as
                         * designed, and then posted a banner 45 seconds later anyway.
                         *
                         * `shouldNotify`, not `shouldRingForCall`: this IS a banner, so it
                         * inherits the global notifications master. #586's separate predicate
                         * exists so that silencing banners does not silence a live call — the
                         * opposite direction, and it still holds. */
                        SPushService.cancelNotification(callNotifId);
                    }
                    else
                    {
                        // ★ A genuinely MISSED incoming call. Correct the row; do not delete it.
                        SPushService.showLocalNotification(
                            callNotifId,
                            "Spixi",
                            SpixiLocalization._SL("notification-missed-call") ?? "Missed call",
                            endedWith.walletAddress.ToString(),
                            false,      // alert: silent — the ring already happened
                            FriendList.getUnreadMessageCount(),
                            "call");
                    }
                }
            }
            catch (Exception e)
            {
                Logging.warn("endVoIPSession: could not update the call notification: " + e.Message);
            }

            try
            {
                if (audioPlayer != null)
                {
                    audioPlayer.Dispose();
                    audioPlayer = null;
                }
            }
            catch (Exception e)
            {
                audioPlayer = null;
                Logging.error("Exception occured in endVoIPSession 1: " + e);
            }

            try
            {
                if (audioRecorder != null)
                {
                    audioRecorder.Dispose();
                    audioRecorder = null;
                }
            }
            catch (Exception e)
            {
                audioRecorder = null;
                Logging.error("Exception occured in endVoIPSession 2: " + e);
            }

            if (currentCallContact != null)
            {
                bool callAccepted = currentCallAccepted && currentCallCalleeAccepted;
                long callDuration = currentCallStartedTime > 0 ? Clock.getTimestamp() - currentCallStartedTime : 0;
                var fm = currentCallContact.endCall(currentCallSessionId, currentCallAccepted && currentCallCalleeAccepted, callDuration, currentCallInitiator);
                if (fm == null)
                {
                    Logging.warn("Cannot end call, no message with session ID exists.");
                } else
                {
                    var tmp_messages = currentCallContact.getMessages(0);
                    if (callAccepted == true && tmp_messages.Last() != fm)
                    {
                        fm.message = callDuration.ToString();
                        Node.addMessageWithType(currentCallSessionId, FriendMessageType.voiceCallEnd, currentCallContact.walletAddress, 0, fm.message, currentCallInitiator, null, 0);
                    }
                    else
                    {
                        fm.type = FriendMessageType.voiceCallEnd;
                        if (callAccepted)
                        {
                            fm.message = callDuration.ToString();
                        }
                        else if (currentCallDeclinedLocally)
                        {
                            // #572 ④: the ONE writer of the durable decline marker. The
                            // latch is true only when this device rejected the call, so
                            // a call that simply rang out keeps its empty body and stays
                            // a genuine "Missed call".
                            fm.message = declinedLocallyMarker;
                        }
                        /* ★★ #572 ④, review MAJOR-1: THE CHATS ROW READS A DEEP COPY.
                         * `metaData.setLastMessage` stores `new FriendMessage(msg.getBytes())`
                         * (Ixian-Core Friend.cs:126-129), so mutating `fm` here reaches the
                         * message list and NOT the row. Without this refresh the bubble said
                         * "Call declined" and the chats row said "Missed call" — the exact
                         * two-surface disagreement this row exists to remove — and the stale
                         * copy is what gets persisted, so a restart kept the wrong label
                         * forever. The same refresh carries an ANSWERED call's duration and
                         * its voiceCallEnd type across, which never reached the row either. */
                        var callMeta = currentCallContact.metaData;
                        if (callMeta.lastMessage != null && fm.id != null
                            && callMeta.lastMessage.id != null && callMeta.lastMessage.id.SequenceEqual(fm.id))
                        {
                            callMeta.setLastMessage(fm, 0);
                            currentCallContact.saveMetaData();
                        }
                        IxianHandler.localStorage.requestWriteMessages(currentCallContact.walletAddress, 0);
                        UIHelpers.insertMessage(currentCallContact, 0, fm);
                    }
                }

            }

            currentCallSessionId = null;
            currentCallContact = null;
            currentCallCalleeAccepted = false;
            currentCallAccepted = false;
            currentCallInitiator = false;   // F5-1 r2 (loop A-8): every other call field resets here — a latched initiator would poison the A-1 predicate on the NEXT call
            currentCallDeclinedLocally = false;   // r3 (R-2): same rule — a latched decline would eat the NEXT call's missed row
            currentCallCodec = null;
            currentCallStartedTime = 0;
            currentCallInitiated = 0;
            lock (lastPacketReceivedLock)
            {
                lastPacketReceivedTime = 0;
                if (lastPacketReceivedCheckThread != null)
                {
                    try
                    {
                        lastPacketReceivedCheckThread.Interrupt();
                    }
                    catch (Exception)
                    {
                    }
                    lastPacketReceivedCheckThread = null;
                }
            }
            try
            {
                releasePowerLocks();
            }
            catch (Exception e)
            {
                Logging.error("Exception occured in endVoIPSession 3: " + e);
            }
            SpixiContentPage.broadcastHideCallBar();   // C18 (#265): every surface drops bar + ring
        }

        public static void acceptCall(byte[] session_id)
        {
            /* ⚠ AUDIT MINOR (3.14): clear the "Incoming call" row on ANSWER too. Cancelling
             * only at end-of-call left it standing for the whole conversation — the user
             * answers from the in-app overlay and never taps the notification, so SetAutoCancel
             * never fires. Stale copy for the length of every answered call. */
            try
            {
                var acceptedWith = currentCallContact;
                if (acceptedWith != null && acceptedWith.walletAddress != null)
                {
                    SPushService.cancelNotification(
                        SPIXI.Meta.SNotificationPrefs.notificationIdFor(acceptedWith.walletAddress, true));
                }
            }
            catch (Exception e)
            {
                Logging.warn("acceptCall: could not clear the call notification: " + e.Message);
            }
            if (!hasSession(session_id))
            {
                return;
            }

            if (currentCallAccepted)
            {
                return;
            }

            // #334 AND-11: the permission request is ASYNC — execution used to fall
            // straight into sendAppRequestAccept + startVoIPSession with the OS
            // dialog still up; without RECORD_AUDIO the AudioRecord ctor throws →
            // the session catch hangs up → the peer saw accept-then-instant-hangup
            // (≈ decline) and the user's "Allow" landed on a dead call. GATE the
            // accept instead: no permission → fire the request and DON'T accept —
            // the call keeps ringing (45s budget), a second Accept lands after the
            // grant (the ring-time pre-request in onReceivedCall makes this rare).
            if (!SSpixiPermissions.hasAudioRecordingPermissions())
            {
                Microsoft.Maui.ApplicationModel.MainThread.BeginInvokeOnMainThread(() =>
                {
                    SSpixiPermissions.requestAudioRecordingPermissions();
                });
                // ★ Loop MAJOR-1: the FE ring overlay one-shots + dismisses itself on
                // the Accept tap — without a re-render the user faces a BLANK,
                // back-swallowing, still-ringing cover whenever no OS dialog appears
                // (permanently-denied mic). Re-arm the app-request refresh so the next
                // UI tick (~2s cadence, Node.updateUILoop) re-presents the ring on
                // EVERY path — dialog or no dialog. A denied user still can't accept
                // (correct — no mic) but can always Decline; an explain-affordance
                // (copy + settings deep-link) = Damir dial, DECISIONS #335.
                UIHelpers.refreshAppRequests = true;
                return;
            }

            currentCallAccepted = true;
            StreamProcessor.sendAppRequestAccept(currentCallContact, session_id, Encoding.UTF8.GetBytes(currentCallCodec));
            startVoIPSession();
            if (currentCallContact != null)
            {
                // C18 (#265): broadcast — every surface that rang swaps its ring for the
                // bar (the FE drops the local ring on displayCallBar), so no stale
                // Decline survives to kill the live call (C18b(a)).
                SpixiContentPage.broadcastCallBar(currentCallSessionId, SpixiLocalization._SL("global-call-in-call") + " - " + currentCallContact.nickname, currentCallStartedTime);
            }
        }

        public static void onAcceptedCall(byte[] session_id, byte[] data)
        {
            if (!hasSession(session_id))
            {
                return;
            }

            if(currentCallCalleeAccepted)
            {
                return;
            }

            currentCallCodec = Encoding.UTF8.GetString(data);
            currentCallCalleeAccepted = true;
            startVoIPSession();
            if (currentCallContact == null)
                return;
            SpixiContentPage.broadcastCallBar(currentCallSessionId, SpixiLocalization._SL("global-call-in-call") + " - " + currentCallContact.nickname, currentCallStartedTime);   // C18
        }

        public static void rejectCall(byte[] session_id)
        {
            if (!hasSession(session_id))
            {
                return;
            }
            // C18b(a) (#265): NEVER reject an ALREADY-ACCEPTED call. A surface that rang
            // and missed the answer (pre-C18 delivery gap, or a page presented mid-ring)
            // could still fire ixian:appReject → this method tore down the LIVE call.
            // Now a decline on an accepted session is ignored; the FE also drops its ring
            // on displayCallBar, so both halves of the hazard are closed.
            if (currentCallAccepted && currentCallCalleeAccepted)
            {
                Logging.warn("rejectCall ignored: the call is already accepted (stale UI).");
                return;
            }
            /* ★ F5-1 r3 (#554, verdict R-2): a call the USER declined is not a missed
             * call — they saw it and answered it with a decline. Without this flag the
             * corrected A-1 predicate (answered || initiator) would fall to the re-post
             * branch and put a "Missed call" row up AT the decline. */
            currentCallDeclinedLocally = true;
            StreamProcessor.sendAppRequestReject(currentCallContact, session_id);
            endVoIPSession();
        }

        public static void onRejectedCall(byte[] session_id)
        {
            if (!hasSession(session_id))
            {
                return;
            }
            Logging.info("SND call-tone: busy");   // sound belt (#518)
            SPlatformUtils.startDialtone(DialtoneType.busy);
            SpixiContentPage.broadcastHideCallBar();   // C18
            endVoIPSession();
        }

        public static void hangupCall(byte[] session_id, bool error = false)
        {
            if (session_id == null)
            {
                session_id = currentCallSessionId;
            }
            // C18b(b) (#265): a STALE call bar's Hang-up used to run with no session —
            // sendAppEndSession(currentCallContact = null, …) on a dead call. Guard it:
            // no live session → just make sure every surface drops its bar.
            if (session_id == null || !hasSession(session_id))
            {
                Logging.warn("hangupCall ignored: no live session (stale UI) — clearing the bars.");
                SpixiContentPage.broadcastHideCallBar();
                return;
            }
            if (error)
            {
                Logging.info("SND call-tone: error");   // sound belt (#518)
                SPlatformUtils.startDialtone(DialtoneType.error);
            }
            else
            {
                SPlatformUtils.stopDialtone();
            }
            StreamProcessor.sendAppEndSession(currentCallContact, session_id);
            SpixiContentPage.broadcastHideCallBar();   // C18
            endVoIPSession();
        }

        public static void onHangupCall(byte[] session_id)
        {
            if (!hasSession(session_id))
            {
                return;
            }
            SPlatformUtils.stopDialtone();
            SpixiContentPage.broadcastHideCallBar();   // C18
            endVoIPSession();
        }

        public static void onData(byte[] session_id, byte[] data)
        {
            if (!hasSession(session_id))
            {
                return;
            }
            if (audioPlayer != null)
            {
                audioPlayer.write(data);
                lastPacketReceivedTime = Clock.getTimestamp();
            }
        }

        public static bool hasSession(byte[] session_id)
        {
            if(currentCallSessionId != null && session_id != null && currentCallSessionId.SequenceEqual(session_id))
            {
                return true;
            }
            return false;
        }

        private static void startLastPacketReceivedCheck()
        {
            lock (lastPacketReceivedLock)
            {
                lastPacketReceivedTime = Clock.getTimestamp();
                if (lastPacketReceivedCheckThread != null)
                {
                    try
                    {
                        lastPacketReceivedCheckThread.Interrupt();
                        lastPacketReceivedCheckThread.Join();
                    }
                    catch (Exception)
                    {
                    }
                    lastPacketReceivedCheckThread = null;
                }
                lastPacketReceivedCheckThread = new Thread(lastPacketReceivedCheck);
                lastPacketReceivedCheckThread.IsBackground = true;
                lastPacketReceivedCheckThread.Start();
            }
        }

        /* ————— #265 (Damir): RING TIMEOUT ————————————————————————————————————————
         * An unanswered call used to ring FOREVER on both ends (his F5: "the incoming
         * call overlay persists"). Industry practice is ~45s (Telegram/WhatsApp), and
         * BOTH ends must use the SAME budget so the caller's "No answer" and the
         * callee's "Missed call" land together.
         *   caller (initiator) → hangupCall → end-session packet + "No answer" log
         *   callee            → endVoIPSession ONLY (no reject packet — the call was
         *                       MISSED, not declined; the caller's own timeout is what
         *                       tells them) → the ring clears, the message logs missed.
         * The thread self-exits the moment the call connects (currentCallStartedTime),
         * is answered, or the session ends. */
        public const int RING_TIMEOUT_SECONDS = 45;

        /* ★ #574 ①, review MAJOR-2: the margin the staleness gate adds on top of the ring
         * budget. The receiver compares its own clock against the SENDER's stamp, and
         * `Clock.networkTimeDifference` is 0 until a time-synced client connects — which on
         * a cold boot is exactly when the gate runs. A receiver whose clock is fast would
         * otherwise refuse a call that is ringing right now. 120 s covers ordinary device
         * skew and relay latency; past that the gate still fires, and the gated call is
         * announced as missed rather than dropped in silence. */
        public const int STALE_CALL_MARGIN_SECONDS = 120;
        static Thread? ringTimeoutThread = null;

        private static void startRingTimeout()
        {
            byte[]? sid = currentCallSessionId;
            if (sid == null)
            {
                return;
            }
            ringTimeoutThread = new Thread(() =>
            {
                try
                {
                    while (true)
                    {
                        Thread.Sleep(1000);
                        byte[]? live = currentCallSessionId;
                        if (live == null || !live.SequenceEqual(sid))
                        {
                            return;                      // session ended or replaced
                        }
                        if (currentCallStartedTime != 0)
                        {
                            return;                      // connected — the media watchdog owns it now
                        }
                        if (Clock.getTimestamp() - currentCallInitiated < RING_TIMEOUT_SECONDS)
                        {
                            continue;
                        }
                        Logging.info("VoIP ring timeout ({0}s) — ending the unanswered call.", RING_TIMEOUT_SECONDS);
                        if (currentCallInitiator)
                        {
                            hangupCall(sid);             // tells the peer + logs "No answer"
                        }
                        else
                        {
                            // review MINOR-3 (TOCTOU): re-check under the same rule
                            // hangupCall uses — the session could have ended (and a NEW
                            // call been accepted) between the snapshot and here.
                            if (!hasSession(sid))
                            {
                                return;
                            }
                            endVoIPSession();            // missed, NOT declined (no reject packet)
                        }
                        return;
                    }
                }
                catch (ThreadInterruptedException) { }
                catch (Exception e)
                {
                    Logging.error("Exception in ring timeout: " + e);
                }
            });
            ringTimeoutThread.IsBackground = true;
            ringTimeoutThread.Start();
        }

        private static void lastPacketReceivedCheck()
        {
            try
            {
                while (true)
                {
                    lock (lastPacketReceivedLock)
                    {
                        if (currentCallStartedTime == 0 || lastPacketReceivedTime + 10 <= Clock.getTimestamp())
                        {
                            break;
                        }
                    }
                    Thread.Sleep(1000);
                }
            }
            catch (ThreadInterruptedException)
            {

            }
            catch (Exception e)
            {
                Logging.error("Exception occured in lastPacketReceivedCheck: " + e);
            }
            finally
            {
                lock (lastPacketReceivedLock)
                {
                    lastPacketReceivedCheckThread = null;
                }
                hangupCall(currentCallSessionId, true);
            }
        }

        public static void setVolume(float volume)
        {
            if(audioPlayer != null)
            {
                audioPlayer.setVolume(volume);
            }
        }
    }
}
