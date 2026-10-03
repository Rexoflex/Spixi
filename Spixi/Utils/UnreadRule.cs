/* ★★ #1148 (3) (Damir walk, session 4: "an outgoing unanswered call left 2 unread and nothing new in the chat") — THE UNREAD RULE.
 *
 * The unread COUNT (Core `Friend.metaData.unreadMessageCount`) is raised ONLY by Spixi, at three sites, and each one asks
 * this class: Node.addMessageWithType (a new message), VoIPManager.endVoIPSession + StreamProcessor's late-call path (a
 * MISSED incoming call). Before: Node raised it for EVERY new message whose `read` was false — and Core sets `read`
 * false for my OWN messages too (FriendMessage.cs:71,90) — so my call card, my file, an update of a message already
 * shown and every reaction (StreamProcessor msgReaction, = C-05; in a room that included the received:/seen: receipts)
 * each counted against me.
 *
 * Damir's rule: the count is incoming chat messages, MISSED incoming calls, incoming files, payments / payment requests,
 * app invites and contact requests — never my own messages, call cards I made, the "connected" line, reactions or
 * message updates. A reaction to MY message raises a separate indicator instead (SReactionFlags, the chats-list heart).
 *
 * PURE: the Core enum in, booleans in, one answer out — no MAUI, no Friend. scripts/csh executes every case
 * (UnreadRuleTests.cs; the csh stubs mirror Core's FriendMessageType). No Core change; the v1.1 BE row is "Core sets
 * read=true for own messages". Wrong counts already on devices clear when each chat opens (SingleChatPage).
 */
using IXICore.Streaming;

namespace SPIXI
{
    public static class UnreadRule
    {
        /** A NEW message: does it raise the unread count? `isUpdate` = Core reported it as an update of a message it already
         *  had (FriendList's `updated`: a chatStream re-send / edit). `isSystemLine` = one of the fixed-id lines Spixi writes
         *  itself (the "connected" line, see <see cref="isSystemLineId"/>). A voiceCall row NEVER counts at insert: the
         *  call counts only when it ENDS missed (<see cref="missedCallCounts"/>). */
        public static bool countsAsUnread(FriendMessageType type, bool localSender, bool isUpdate, bool isSystemLine = false)
        {
            if (localSender || isUpdate || isSystemLine)
            {
                return false;
            }
            switch (type)
            {
                case FriendMessageType.standard:       // an incoming chat message
                case FriendMessageType.fileHeader:     // an incoming file
                case FriendMessageType.sentFunds:      // a payment to me
                case FriendMessageType.requestFunds:   // a payment request to me
                case FriendMessageType.appSession:     // an app invite
                    return true;
                /* #1150 (Damir): a contact request is NOT an unread — its card already carries Accept / Decline and the
                 * requests nav badge counts the cards (home.html). Superseded #1148 (3) "contact requests count". */
                case FriendMessageType.requestAdd:
                default:                               // voiceCall at insert, voiceCallEnd, appSessionEnd, kicked, banned, requestAddSent, reaction
                    return false;
            }
        }

        /** The fixed one-byte ids Spixi writes for lines that are not a contact's message: {1} = the "connected" line
         *  (StreamProcessor requestAdd/acceptAdd/acceptAddBot, HomePage.writeConnectedLine) · {4} / {5} = the nickname /
         *  avatar ids Node's notification site already skips. */
        public static bool isSystemLineId(byte[]? id)
        {
            return id != null && id.Length == 1 && (id[0] == 1 || id[0] == 4 || id[0] == 5);
        }

        /** #1150 (Damir): the app ICON badge counts a pending incoming contact request as 1 for as long as it is pending
         *  (until Accept / Decline) — the same rule as the Chats tab badge (home.html navUnreadTotal: + each pending card).
         *  The predicate mirrors HomePage.updateChat's routing to the requests feed: not approved, the last message is an
         *  incoming requestAdd. Its own unread count is NOT added (a count left from before #1150 would double it). */
        public static bool isPendingIncomingRequest(bool approved, bool hasLastMessage, FriendMessageType lastType, bool lastLocalSender)
        {
            return !approved && hasLastMessage && lastType == FriendMessageType.requestAdd && !lastLocalSender;
        }

        /** A call ENDED: does it raise the unread count? Only an INCOMING call (`initiator` false) that was not answered
         *  (`answered` = both ends accepted, VoIPManager's `callAccepted`) and not declined on THIS device, and only when its
         *  chat is not open (an open chat shows the missed card itself). The same predicate as the "Missed call"
         *  notification re-post in endVoIPSession. */
        public static bool missedCallCounts(bool initiator, bool answered, bool declinedLocally, bool chatOpen)
        {
            return !initiator && !answered && !declinedLocally && !chatOpen;
        }

        /** A msgReaction arrived: does it set the chats-list heart (SReactionFlags)? Only a USER reaction (`like:` / `tip:`;
         *  `received:` / `seen:` / `fileReceived:` are a room's delivery receipts riding the same message code, Core
         *  Friend.addReaction) to MY message (`targetIsMine`), from someone else (`reactorIsMe` false: my other device), when
         *  that chat is not open. Never a count. */
        public static bool reactionRaisesDot(string? reaction, bool targetIsMine, bool reactorIsMe, bool chatOpen)
        {
            if (reaction == null || !targetIsMine || reactorIsMe || chatOpen)
            {
                return false;
            }
            return reaction.StartsWith("like:", System.StringComparison.Ordinal) || reaction.StartsWith("tip:", System.StringComparison.Ordinal);
        }
    }
}
