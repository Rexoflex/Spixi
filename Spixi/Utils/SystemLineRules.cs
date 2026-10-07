/* ★ #46 r1 (A-MINOR-2 / B-MINOR-2, S8 #1231) — PEERS CANNOT WRITE A SYSTEM LINE.
 *
 * Spixi's own lines (the "connected" line {1}, the {4}/{5} carriers, the "added you to this group" line {7} —
 * UnreadRule.isSystemLineId) are rows with a ONE-byte id. Core stores an incoming chat under the wire id unchecked
 * (StreamProcessor `case SpixiMessageCode.chat` → Node.addMessageWithType(message.id, …)), so a modified client could
 * send a chat with id {7} and the chat shell would draw it as a system chip — no unread, no notification, no reply.
 * A real Spixi message id is never one byte (Core's StreamMessage ids are GUID-sized; a chatStream's MessageId is the
 * sender's StreamMessage id). So StreamProcessor DROPS an incoming chat, or a chatStream at ANY sequence (★ S8 #46 r2
 * M1: a bot room's replace with sequence ≥ 1 is stored as a NEW row), whose id is one byte long, before
 * Node.addMessageWithType — and with that the shell may match the line by its id ALONE.
 * PURE: scripts/csh executes it (S8RulesTests.cs). */
namespace SPIXI
{
    public static class SystemLineRules
    {
        /** A one-byte message id is reserved for this device's own system lines. */
        public static bool isReservedId(byte[]? id)
        {
            return id != null && id.Length == 1;
        }
    }
}
