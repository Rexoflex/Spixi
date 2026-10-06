/* ★★ #1199 (session 6b, #1137 (4)) — MAY THIS MESSAGE BE EDITED? An edit travels as a chatStream REPLACE (Core 0.9.8k:
 * the same id, sequence + 1, IsStream false — FriendList.addMessageWithType overwrites text, sequence AND timestamp),
 * so every condition below guards a way the edit could go wrong on one of the two devices:
 *   · own (localSender) · type standard and not an inline voice text (★ #1208 VoiceCodec.tryPeekInline — and the new
 *     text may not be voice-shaped either: the receiver drops such a replace, StreamProcessor) · not a fixed-id system line (UnreadRule.isSystemLineId) · the stored text is not
 *     empty (a deleted row) · not a bot room (the bot server re-serves its own history; Core takes no stream update of a
 *     bot message from us);
 *   · now − `timestamp` < 24 h (Damir P1): every replace passes the message's EXISTING time back to Core
 *     (SingleChatPage.onEditMessage, StreamProcessor's chatStream case — #46 r2 MAJOR-1), so `timestamp` stays the
 *     original send time and the window is a true 24 h from send;
 *   · sequence < 20 — a bound on the edit chain;
 *   · among the newest 25 of its channel (#46 r1 A MINOR-1) — Core looks an edit's id up in the IN-MEMORY list only and
 *     ADDS one it does not hold as a NEW message (this app drops it, StreamProcessor; a legacy app cannot). A legacy
 *     receiver holds its last 100, but a NEW-app receiver holds only ~51 after an open (SingleChatPage.loadMessages'
 *     getMessages(channel, window) REPLACES the list with the load window: want 50 + 1), and tombstones count there too;
 *   · the new body, trimmed (onSend's set), is non-empty, the full new text fits CoreConfig.maxChatMessageSize (Core's
 *     own check, on string length) and differs from the current body.
 * PURE: booleans and numbers in, a verdict out — scripts/csh executes every edge (EditRulesTests.cs). The caller is
 * SingleChatPage's `ixian:chatedit:` verb, which re-checks here whatever the shell decided. */
using IXICore.Streaming;

namespace SPIXI
{
    public enum EditVerdict
    {
        ok,
        notOwn,
        notText,
        systemLine,
        deleted,
        botRoom,
        tooOld,
        tooManyEdits,
        notRecent,
        bodyEmpty,
        tooLong,
        unchanged
    }

    public static class EditRules
    {
        public const long WindowSeconds = 24 * 60 * 60;
        public const int MaxSequence = 20;
        public const int NewestWindow = 25;

        private static readonly char[] trimSet = new char[] { ' ', '\t', '\r', '\n' };   // SingleChatPage.onSend's own set

        /** The body as the composer would send it. */
        public static string trimBody(string? body)
        {
            return (body ?? "").Trim(trimSet);
        }

        /** The text an edit sends: the original quote line (when the original was a matched reply) + "\n" + the body. */
        public static string fullText(string? quoteLine, string trimmedBody)
        {
            return string.IsNullOrEmpty(quoteLine) ? trimmedBody : quoteLine + "\n" + trimmedBody;
        }

        /** ★ #1199: `newerCount` = how many messages of the channel are newer than this one (0 = the newest);
         *  `currentBody` = what the bubble shows (the body of a matched reply, else the text); `quoteLine` = the original
         *  quote line of a quote-shaped text, else null; `nowSec` / `originalTimeSec` = seconds (Clock.getTimestamp;
         *  originalTimeSec = the message's `timestamp`, which an edit keeps — Damir P1, #46 r2 MAJOR-1). */
        public static EditVerdict canEdit(bool localSender, FriendMessageType type, bool isSystemLine, string? storedText,
                                          bool isBotRoom, long nowSec, long originalTimeSec, int sequence, int newerCount,
                                          string? newBody, string? currentBody, string? quoteLine, int maxSize)
        {
            if (!localSender)
            {
                return EditVerdict.notOwn;
            }
            if (type != FriendMessageType.standard || VoiceCodec.tryPeekInline(storedText, out _))
            {
                return EditVerdict.notText;   // ★ #1208: an inline voice text is not text either
            }
            if (isSystemLine)
            {
                return EditVerdict.systemLine;
            }
            if (string.IsNullOrEmpty(storedText))
            {
                return EditVerdict.deleted;
            }
            if (isBotRoom)
            {
                return EditVerdict.botRoom;
            }
            if (nowSec - originalTimeSec >= WindowSeconds)
            {
                return EditVerdict.tooOld;
            }
            if (sequence >= MaxSequence)
            {
                return EditVerdict.tooManyEdits;
            }
            if (newerCount < 0 || newerCount >= NewestWindow)
            {
                return EditVerdict.notRecent;
            }
            string body = trimBody(newBody);
            if (body.Length == 0)
            {
                return EditVerdict.bodyEmpty;
            }
            string full = fullText(quoteLine, body);
            if (full.Length > maxSize)
            {
                return EditVerdict.tooLong;
            }
            if (VoiceCodec.tryPeekInline(full, out _))
            {
                return EditVerdict.notText;   // ★ #1208: an edit never turns a text row into a voice row (the receiver drops it)
            }
            if (string.Equals(body, currentBody ?? "", System.StringComparison.Ordinal))
            {
                return EditVerdict.unchanged;
            }
            return EditVerdict.ok;
        }

        /** ★ #1199: "edited" = a standard message of a NON-bot chat whose sequence moved (on disk, Core
         *  FriendMessage.sequence). #46 r1 A MINOR-5: a bot room raises the sequence for its own streams — never "edited". */
        public static bool isEdited(FriendMessageType type, int sequence, bool isBot)
        {
            return !isBot && type == FriendMessageType.standard && sequence > 0;
        }
    }
}
