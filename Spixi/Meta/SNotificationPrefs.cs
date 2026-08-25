using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using Microsoft.Maui.Storage;
using System;

namespace SPIXI.Meta
{
    /// <summary>
    /// ★ NOTIF-2 / SND (Damir's 2026-08-21 block) — the ONE home for the global
    /// notification and in-app-sound preferences, plus the per-chat mute for a 1:1
    /// contact.
    ///
    /// Why this file exists at all: before it there was NO global notification setting
    /// anywhere in the app. `createNotificationsScreen` has been built since #147 but
    /// gated on `capabilities.globalNotifications`, which the production shell never
    /// set — a screen that has shipped dark for months. The same gate hid the
    /// "In-app sounds" switch, which is why the notifications block and the
    /// sound-effects block share one wiring job.
    ///
    /// ★ WHERE MUTE LIVES, and why it is split:
    ///   · GROUPS and BOTS already have a mute — `friend.metaData.botInfo.sendNotification`
    ///     — which is SYNCED to the other side by a bot action (SingleChatPage
    ///     ixian:enableNotifications). That stays exactly where it is; NOTIF-1 fixed the
    ///     gate that was ignoring it for private groups.
    ///   · A 1:1 CONTACT has no botInfo at all (it is created only by GroupChat.CreateGroup
    ///     / JoinGroup / CoreStreamProcessor for bots), so there is nowhere in Core to put
    ///     the flag. Adding one would be an Ixian-Core change, and this session is
    ///     explicitly no-BE. So a 1:1 mute is a LOCAL, device-side preference: it changes
    ///     what this device does with an incoming message and tells the sender nothing.
    ///     That is also the honest privacy answer — muting someone should not notify them.
    ///
    /// ⚠ The 1:1 mute deliberately does NOT touch the unread badge. Ixian-Core's
    /// `Friend.getUnreadMessageCount()` (:513-520) zeroes the badge whenever
    /// `botInfo.sendNotification` is false, so muting a GROUP already hides its badge
    /// today — a behaviour this session did not introduce and did not change, but did
    /// raise as a product question (see the DECISIONS row). The 1:1 path has no such
    /// coupling, so a muted contact still shows its unread count. If Damir wants the two
    /// to agree, that is one decision and a small change — in Core for groups, or here
    /// for 1:1.
    ///
    /// Every value is a plain bool or a per-address bool. NO message content and no user
    /// data enters preferences (the standing security gate).
    /// </summary>
    public static class SNotificationPrefs
    {
        // Global master. Default TRUE — the app has always notified.
        private const string KEY_ENABLED = "notif_enabled";
        // Include the SENDER'S NAME in the notification. Default FALSE, which is
        // byte-identical to what ships today: AND-15 (#334) deliberately writes a
        // per-TYPE line ("New Message", "Payment received", …) with no sender name and
        // no message text at all.
        //
        // ⚠ VERIFY-FIRST CORRECTION: the built settings row is labelled "Show message
        // previews" with the sub "Off = sender and text hidden on the lock screen", but
        // there is nothing to hide today — a preview toggle wired to the current
        // notification would have been a switch that does nothing, which is exactly the
        // dead-control class this project keeps shipping. So it is wired to the one
        // thing it CAN control, the sender name, and the copy is corrected to say so.
        // Message TEXT is still never included, on any setting.
        private const string KEY_SENDER_NAME = "notif_sender_name";
        // In-app sound effects. Default TRUE, but note that with no assets shipped yet
        // every effect is a fail-soft no-op, so the default cannot change behaviour.
        private const string KEY_SOUNDS = "notif_sounds";
        // Per-1:1 mute: KEY_MUTE_PREFIX + the address string.
        private const string KEY_MUTE_PREFIX = "notif_mute_";

        /* ⚠ AUDIT MINOR: these are read on the MESSAGE-RECEIVE path (Node.cs, stream
         * thread) and again at SettingsPage.onLoad before the rest of the Account state is
         * pushed. A throw in either place is destructive out of all proportion to a
         * preference read, and the sibling mute helpers below already treat this API as
         * throwable — the file must not disagree with itself about that. Same guard, same
         * fail-safe direction: the shipped default. */
        private static bool getBool(string key, bool fallback)
        {
            try
            {
                return Preferences.Default.Get(key, fallback);
            }
            catch (Exception e)
            {
                Logging.error("SNotificationPrefs.getBool(" + key + ") failed: " + e);
                return fallback;
            }
        }

        private static void setBool(string key, bool value)
        {
            try
            {
                Preferences.Default.Set(key, value);
            }
            catch (Exception e)
            {
                Logging.error("SNotificationPrefs.setBool(" + key + ") failed: " + e);
            }
        }

        public static bool notificationsEnabled
        {
            get { return getBool(KEY_ENABLED, true); }
            set { setBool(KEY_ENABLED, value); }
        }

        public static bool showSenderName
        {
            get { return getBool(KEY_SENDER_NAME, false); }
            set { setBool(KEY_SENDER_NAME, value); }
        }

        public static bool inAppSounds
        {
            get { return getBool(KEY_SOUNDS, true); }
            set { setBool(KEY_SOUNDS, value); }
        }

        /// <summary>
        /// ★ The notification display name, with the #211/#212 truncation canon applied.
        /// `friend.nickname` falls back to `_nick`, which two call sites seed with the raw
        /// address — so this can otherwise be 60+ characters of base58 in a notification.
        /// Returns "" when there is no usable name, and the caller then omits the prefix.
        /// </summary>
        public static string displayNameFor(Friend? friend)
        {
            try
            {
                string name = friend?.nickname ?? "";
                if (string.IsNullOrEmpty(name))
                {
                    return "";
                }
                string address = friend?.walletAddress?.ToString() ?? "";
                // The address echoed back as a nick — the pending/no-nick contact case.
                if (!string.IsNullOrEmpty(address) && name == address)
                {
                    return truncateMiddle(name);
                }
                // Any other address-shaped name (long, no spaces) gets the same treatment.
                if (name.Length > 24 && name.IndexOf(' ') < 0)
                {
                    return truncateMiddle(name);
                }
                return name;
            }
            catch (Exception)
            {
                return "";
            }
        }

        private static string truncateMiddle(string value)
        {
            if (string.IsNullOrEmpty(value) || value.Length <= 14)
            {
                return value;
            }
            return value.Substring(0, 6) + "…" + value.Substring(value.Length - 4);
        }

        private static string muteKey(string address)
        {
            return KEY_MUTE_PREFIX + address;
        }

        /// <summary>Per-1:1 mute state. Groups and bots are NOT stored here — they use
        /// botInfo.sendNotification, which is synced. Safe on a null/empty address.</summary>
        public static bool isContactMuted(string? address)
        {
            if (string.IsNullOrEmpty(address))
            {
                return false;
            }
            try
            {
                return Preferences.Default.Get(muteKey(address), false);
            }
            catch (Exception e)
            {
                Logging.error("SNotificationPrefs.isContactMuted failed: " + e);
                return false;
            }
        }

        public static void setContactMuted(string? address, bool muted)
        {
            if (string.IsNullOrEmpty(address))
            {
                return;
            }
            try
            {
                if (muted)
                {
                    Preferences.Default.Set(muteKey(address), true);
                }
                else
                {
                    // Remove rather than store false, so the key set stays bounded by the
                    // number of chats a user has actually muted rather than by every chat
                    // they have ever opened.
                    Preferences.Default.Remove(muteKey(address));
                }
            }
            catch (Exception e)
            {
                Logging.error("SNotificationPrefs.setContactMuted failed: " + e);
            }
        }

        /// <summary>
        /// ★ THE ONE PREDICATE the fire site asks. True = show a notification for this
        /// friend. Order: the global master, then the shared group/bot mute, then the
        /// local 1:1 mute.
        ///
        /// The group/bot clause is NOTIF-1's fix, kept here so there is a single place
        /// that answers the question: `botInfo` is non-null for groups and bots ONLY, so
        /// a 1:1 contact falls through it untouched. It deliberately does NOT consult
        /// `friend.bot`, which has a private setter turned on only by setBotMode()
        /// (Ixian-Core Friend.cs:250-253) — a private group is built by setGroupMode()
        /// and never sets it, which is why the old `friend.bot == false ||` short-circuit
        /// ignored the toggle for every private group.
        /// </summary>
        public static bool shouldNotify(Friend? friend)
        {
            if (!notificationsEnabled)
            {
                return false;
            }
            if (friend == null)
            {
                return true;
            }
            if (friend.metaData != null && friend.metaData.botInfo != null)
            {
                return friend.metaData.botInfo.sendNotification;
            }
            /* ⚠ AUDIT MINOR — a deliberate BEHAVIOUR-PRESERVING exception, and the one place
             * `friend.bot` is still the right question. The OLD predicate returned FALSE for a
             * bot whose BotInfo had not arrived yet (`bot == false || (botInfo != null && …)`
             * — both clauses false). Falling through to the 1:1 default would flip that window
             * from silent to notifying. NOTIF-1's finding was that `friend.bot` is the wrong
             * gate for GROUPS, which never set it; it remains a correct test for "is this a
             * bot", which is all it is used for here. */
            if (friend.bot)
            {
                return false;
            }
            return !isContactMuted(friend.walletAddress?.ToString());
        }

        /* ★★ #586 round-2 MINOR-5 — RINGING IS NOT NOTIFYING, so it gets its own predicate.
         *
         * `shouldNotify` returns false the moment the GLOBAL notifications master is off,
         * and that master is a tray setting: a user who turned off message banners has not
         * asked to stop receiving calls. Gating the ring on it made an incoming call
         * completely invisible — no ring, no notification, no UI — surfacing 45 s later as
         * a missed call.
         *
         * The evidence Damir supplied was a MUTED CONTACT, and that is what this answers:
         * the per-contact mute and the bot's own sendNotification flag silence the ring;
         * the global master does not. A muted contact still cannot ring, which is the
         * defect that was reported. */
        public static bool shouldRingForCall(Friend? friend)
        {
            if (friend == null)
            {
                return true;
            }
            if (friend.metaData != null && friend.metaData.botInfo != null)
            {
                return friend.metaData.botInfo.sendNotification;
            }
            if (friend.bot)
            {
                return false;
            }
            return !isContactMuted(friend.walletAddress?.ToString());
        }

        /// <summary>
        /// ★ NOTIF-4 / 3.14 — the notification id for a chat, in ONE place so the poster and
        /// the canceller cannot drift apart.
        ///
        /// Messages use CRC32 of the CHAT ADDRESS, so a new message REPLACES that chat's row
        /// instead of stacking (Damir's "five notifications for one chat"). Calls take the
        /// same id XORed, because they route to a DIFFERENT channel and must not overwrite —
        /// or be overwritten by — the message row: a text arriving after a missed call was
        /// silently replacing the missed-call notification.
        ///
        /// ⚠ addressNoChecksum, NOT getInputBytes(): the latter returns the PUBLIC KEY when
        /// one is populated (Ixian-Core Address.cs:426-437), so the same chat would hash two
        /// different ways and the one-row-per-chat property would flap.
        /// </summary>
        public static int notificationIdFor(Address? address, bool isCall)
        {
            if (address == null)
            {
                return 0;
            }
            int id = (int)Force.Crc32.Crc32Algorithm.Compute(address.addressNoChecksum);
            return isCall ? (id ^ 0x5A5A5A5A) : id;
        }

        /// <summary>
        /// ★ NOTIF-5 (Damir device round 2026-08-21) — the gate for the RAW OneSignal push,
        /// which is a SECOND notification path that no mute has ever touched.
        ///
        /// `SPushService.handleNotificationReceived` first tries to pull the real message
        /// over Ixian (`OfflinePushMessages.fetchPushMessages`); when that succeeds the
        /// message goes through `Node.addMessageWithType` and NOTIF-1's mute applies, which is
        /// why muting appeared to work sometimes. When the fetch FAILS — push server
        /// unreachable, registration failed, a parse error, an HTTP throw — the code fell
        /// through to `e.Notification.display()` and posted the raw push with no gate at all.
        ///
        /// That one fall-through produced three separate device failures:
        ///   · 3.7 — a muted private group still notified
        ///   · 3.4 — the global master "sometimes works, sometimes doesn't"
        ///   · 3.12 — a second, unformatted "legacy-looking" notification beside ours
        ///
        /// ⚠ WHAT THIS CANNOT FIX, and it must not be claimed: for a GROUP message the push
        /// payload's `fa` is the SENDER'S address, not the group's — which is why tapping one
        /// opened a 1:1 instead of the group. So the recipient cannot identify the group and
        /// cannot apply the group's mute. That needs the payload to carry the group address
        /// and is a push-server/protocol change — BE. Until then a muted group can still leak
        /// a notification through this path whenever the fetch fails, and the honest scope of
        /// this fix is: the global master, and 1:1 chats.
        /// </summary>
        public static bool shouldDisplayRawPush(string? fa)
        {
            try
            {
                if (!notificationsEnabled)
                {
                    return false;
                }
                if (string.IsNullOrEmpty(fa))
                {
                    // No addressee at all — show it. A push we cannot attribute is not a push
                    // we can prove the user muted, and silently dropping it would lose mail.
                    return true;
                }
                Friend? friend = null;
                try
                {
                    friend = FriendList.getFriend(new Address(fa));
                }
                catch (Exception)
                {
                    // A malformed address must never throw inside a push callback.
                    return true;
                }
                if (friend == null)
                {
                    return true;   // unknown sender — err toward showing
                }

                /* ⚠ AUDIT MAJOR — this gate must not apply a 1:1 mute to a GROUP message.
                 * `fa` on a group push is the SENDER'S address (that mis-attribution is the
                 * BE gap this whole finding rests on), so `getFriend(fa)` resolves to that
                 * person's 1:1 record. Consulting the per-chat mute there would mean: mute
                 * your 1:1 with Alice, and Alice's messages to a group you are in get
                 * silently dropped whenever the fetch fails. That is a LOST MESSAGE, and it
                 * contradicts the fail-open rule every other path in this method follows —
                 * while being the MOST likely path to hit, because it is exactly the case
                 * the payload cannot describe.
                 *
                 * So the per-chat mute is consulted only when the resolved friend is a
                 * genuine 1:1. Anything else (a group, a bot, a friend whose kind we cannot
                 * establish) falls through to the global master alone, which was already
                 * checked above. The honest scope stays what the docblock claims. */
                bool isOneToOne = friend.type != FriendType.Group
                    && !friend.bot
                    && (friend.metaData == null || friend.metaData.botInfo == null);
                if (!isOneToOne)
                {
                    return true;
                }
                return shouldNotify(friend);
            }
            catch (Exception e)
            {
                Logging.error("shouldDisplayRawPush failed: " + e);
                return true;   // fail OPEN: a lost message is worse than an unwanted buzz
            }
        }

        /// <summary>Muted state for the UI, for either kind of chat. The inverse of the
        /// per-chat half of shouldNotify — it does NOT consult the global master, because
        /// the global master is a separate switch on its own screen and folding it in
        /// would show every chat as muted the moment notifications are turned off.</summary>
        public static bool isChatMuted(Friend? friend)
        {
            if (friend == null)
            {
                return false;
            }
            if (friend.metaData != null && friend.metaData.botInfo != null)
            {
                return !friend.metaData.botInfo.sendNotification;
            }
            return isContactMuted(friend.walletAddress?.ToString());
        }
    }
}
