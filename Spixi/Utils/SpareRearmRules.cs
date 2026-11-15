/* ★ perfb1 P-11 switch 1 (SpixiFlags.SpareRearm, default ON) — the chat spare is armed again after a drop.
 *
 * Today trigger B (HomePage.warmChatSpareAfterFirstPaint) is one-shot: after a drop (sleep, theme, language, reload,
 * dev mode) no spare comes back until a conversation closes (trigger A). Device: after 60 s in the background no spare
 * existed in 15 of 15 opens (286–296 ms against 97–114 ms on a spare). With the switch ON a drop leaves the spare
 * ARMED: the next chats flush (clearChatsDone) releases trigger B's latch, so the +1800 ms warm runs again through the
 * SAME funnel (scheduleChatSpareWarm → warmChatSpareNow → warmSpareChat, every refusal kept; on Android behind the
 * idle gate, WarmIdleRules). Never while a lock is up or staging, never in the background. `stop` (delete account /
 * shutdown) and `lowmem` cancel it.
 *
 * Pure: no MAUI type, no Core type. The state (two bools under SpixiContentPage's preload lock) lives at the call
 * sites; scripts/csh executes these rules (PerfB1SpareRearmTests.cs).
 */
namespace SPIXI
{
    internal static class SpareRearmRules
    {
        /** The drop words that arm the spare again: the document went stale (`theme` · `language` · `reload` ·
         *  `devmode`) or the app left the screen (`sleep`). Not `lowmem` (the system asked for the memory back), not
         *  `stop`, not `timeout` (a spare that never booted), not `host` (a new host warms from its own first flush),
         *  not the tap-refusal words (`warming` · `lock` · `staging` · `order`: the tap opens the chat cold and its
         *  close warms through trigger A). Switch off → never. */
        internal static bool rearmsAfterDrop(bool flagOn, string? why)
        {
            if (!flagOn)
            {
                return false;
            }
            switch (why)
            {
                case "sleep":
                case "theme":
                case "language":
                case "reload":
                case "devmode":
                    return true;
                default:
                    return false;
            }
        }

        /** The drop words that cancel a pending re-arm: `stop` (delete account / shutdown — nothing may warm after it)
         *  and `lowmem` (memory pressure). */
        internal static bool clearsOnDrop(string? why)
        {
            return why == "stop" || why == "lowmem";
        }

        /** HomePage's 2 s tick: ask for ONE chats flush so a pending re-arm can be taken (a quiet resume has no flush of
         *  its own). Once per re-arm (`flushAsked`; a refused take clears it — SpixiContentPage.takeSpareRearm, #46 r1
         *  A-4), never while a lock is up or staging, never in the background (#46 r1 A-3), never with the switch off. */
        internal static bool asksFlush(bool flagOn, bool pending, bool flushAsked, bool lockUp, bool foreground)
        {
            return flagOn && pending && !flushAsked && !lockUp && foreground;
        }

        /** A chats flush takes the pending re-arm (→ trigger B's latch is released). Never while a lock is up or staging
         *  (the re-arm then waits for a flush with no lock), never in the background (#46 r1 A-3: the warm at +1800 ms
         *  would be refused `why=background` and the taken re-arm lost — it waits for the next resume), never with the
         *  switch off. */
        internal static bool takesRearm(bool flagOn, bool pending, bool lockUp, bool foreground)
        {
            return flagOn && pending && !lockUp && foreground;
        }
    }
}
