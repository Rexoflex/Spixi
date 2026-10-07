/* ★ S8 (#1234) — THE THREE PRIVACY SWITCHES, as rules (the prefs: SPrivacyPrefs; Account → Privacy).
 *
 * Damir's call (#1234): RECIPROCAL for read receipts and online status; typing follows the same rule (our call).
 *   · readReceipts OFF → no msgRead is sent (SingleChatPage.updateMessageReadStatus), AND every status this device SHOWS
 *     that would say `read` says `confirmed` (delivered) instead — chat bubbles (SingleChatPage.deliveryTicks) and the
 *     chats-list row (HomePage.getFriendMessageHelper) — and a room's `seen:` count is not pushed (the long-press detail).
 *   · typingIndicators OFF → no typing is sent (SingleChatPage `ixian:typing`), and an incoming typing is not shown
 *     (StreamProcessor msgTyping).
 *   · hideOnline ON → SpixiProtocols.ids() adds `spixi.presence-hidden.1`; PresenceDisplay hides EVERY contact's online
 *     dot and last seen; a contact whose stored answer (Core Friend.supportedProtocols) names the id is hidden ALWAYS.
 *     `friend.online` (Core routing) is never touched.
 * PURE: booleans and strings in, one answer out — scripts/csh executes every case (S8RulesTests.cs). */
using System;

namespace SPIXI
{
    public static class PrivacyRules
    {
        /** The capability id a device announces while "Hide my online status" is ON. */
        public const string PresenceHiddenId = "spixi.presence-hidden.1";

        /** Send a msgRead for a row this device just read? Never for a bot room, never while receipts are off, never for
         *  a line this device wrote itself (`localOnlyLine`: the added-to-group line, UnreadRule.isAddedToGroupLineId). */
        public static bool sendsReadReceipt(bool readReceiptsOn, bool isBot, bool localOnlyLine)
        {
            return readReceiptsOn && !isBot && !localOnlyLine;
        }

        /** The chat-bubble ticks this device SHOWS: receipts off → a `read` reads as delivered (confirmed, and so sent). */
        public static void shownStatus(bool readReceiptsOn, ref bool sent, ref bool confirmed, ref bool read)
        {
            if (readReceiptsOn || !read)
            {
                return;
            }
            read = false;
            confirmed = true;
            sent = true;
        }

        /** The chats-list status type this device SHOWS: receipts off → "read" becomes "confirmed"; every other type as is. */
        public static string shownStatus(bool readReceiptsOn, string? type)
        {
            if (!readReceiptsOn && string.Equals(type, "read", StringComparison.Ordinal))
            {
                return "confirmed";
            }
            return type ?? "";
        }

        /** ★ S8 (#1234): the ONE read-receipt key — Core turns a group msgRead into the reaction "seen:" itself
         *  (Ixian-Core CoreStreamProcessor.cs:631), so Spixi has to name it once to hide it. The ROUND 4 PART 2
         *  "no key list" pin exempts exactly this declaration by site; nothing else may name the key.
         *  ★ #46 r1 (C-MAJOR-1): PRIVATE — another file cannot name the key through this constant either (the smoke pin
         *  counts its uses: exactly one, in showsReactionKey below). */
        private const string ReadReceiptKey = "seen";

        /** Push this reaction key (`received`, `seen`, `like`, `tip`, `fileReceived`, …)? Receipts off → no `seen`. */
        public static bool showsReactionKey(bool readReceiptsOn, string? key)
        {
            return readReceiptsOn || !string.Equals(key, ReadReceiptKey, StringComparison.Ordinal);
        }

        /** Send my typing? / show theirs? — the same switch, both ways. */
        public static bool sendsTyping(bool typingOn)
        {
            return typingOn;
        }

        public static bool showsTyping(bool typingOn)
        {
            return typingOn;
        }

        /** Hide this contact's online dot and last seen? Mine hidden (reciprocal) or the contact announced it hides. */
        public static bool hidesPresence(bool hideOnlineOn, bool contactAnnouncesHidden)
        {
            return hideOnlineOn || contactAnnouncesHidden;
        }
    }
}
