/* ★ perfb1 P-11 switch 2 (SpixiFlags.SpareKeepShortSleep, opt-in, Android only) — keep the chat spare over a short sleep.
 *
 * Why the app drops the spare at sleep, and why a kept one must be PROVEN before use: docs/perfb1-spare-drop-reason.md.
 * The states of a kept spare: None (not kept: a normal spare) → Kept (sleep; unproven) → Proving (the return; unproven)
 * → Proven (the proof answered in time: a normal READY spare again) | Dropped (every other way out). Only Proven (or None)
 * may be handed to a chat open; only the proof's ANSWER leads to Proven (a timer can only drop, L157).
 *
 * Pure: no MAUI type, no Core type, no `using`. The state lives in SpixiContentPage (under its preload lock);
 * scripts/csh executes these rules (PerfB1SpareKeepTests.cs).
 */
namespace SPIXI
{
    internal static class SpareKeepRules
    {
        internal const int None = 0;
        internal const int Kept = 1;
        internal const int Proving = 2;
        internal const int Proven = 3;
        internal const int Dropped = 4;

        /** DIAL: the longest background a kept spare survives (3 minutes). */
        internal const long LimitMs = 3 * 60 * 1000;

        /** DIAL: the proof's deadline after the return — no answer by then = not proven = dropped. */
        internal const long ProofDeadlineMs = 1000;

        /** At sleep: Kept only with the switch ON, a READY spare, no chat staging and no app lock (enabled, up or staging);
         *  every other case → Dropped (today's drop). */
        internal static int atSleep(bool flagOn, bool spareReady, bool chatStaging, bool lockEnabledOrUp)
        {
            if (!flagOn || !spareReady || chatStaging || lockEnabledOrUp)
            {
                return Dropped;
            }
            return Kept;
        }

        /** The limit. Elapsed = the larger of the monotonic clock (may not count deep sleep) and the wall clock (counts it);
         *  either one negative (a clock went back) → over the limit. At the limit = over. */
        internal static bool withinLimit(long tickElapsedMs, long wallElapsedMs)
        {
            if (tickElapsedMs < 0 || wallElapsedMs < 0)
            {
                return false;
            }
            long elapsed = tickElapsedMs > wallElapsedMs ? tickElapsedMs : wallElapsedMs;
            return elapsed < LimitMs;
        }

        /** The return: a Kept spare inside the limit → Proving (the proof starts); over the limit → Dropped.
         *  Any other state is left as it is (no keep this cycle, or already settled). */
        internal static int atResume(int state, long tickElapsedMs, long wallElapsedMs)
        {
            if (state != Kept)
            {
                return state;
            }
            return withinLimit(tickElapsedMs, wallElapsedMs) ? Proving : Dropped;
        }

        /** The best-effort background timer: a still-Kept spare over the limit → Dropped. It never moves a spare forward. */
        internal static int atLimitTimer(int state, long tickElapsedMs, long wallElapsedMs)
        {
            if (state == Kept && !withinLimit(tickElapsedMs, wallElapsedMs))
            {
                return Dropped;
            }
            return state;
        }

        /** The proof's start (posted after the return): a lock up → Dropped. */
        internal static int atProofStart(int state, bool lockUp)
        {
            if (state != Proving)
            {
                return state;
            }
            return lockUp ? Dropped : Proving;
        }

        /** The answer of `document.readyState` on the spare's own WebView: the blank shell answers "complete". */
        internal static bool answerProves(string? answer)
        {
            return answer != null && answer.Trim('"') == "complete";
        }

        /** The proof settles: Proven ONLY for a proving answer inside the deadline with no lock up; the deadline itself
         *  passes `answer` null → Dropped. A state that is not Proving is left as it is (settled already). */
        internal static int afterProof(int state, string? answer, long elapsedMs, bool lockUp)
        {
            if (state != Proving)
            {
                return state;
            }
            if (answerProves(answer) && elapsedMs >= 0 && elapsedMs <= ProofDeadlineMs && !lockUp)
            {
                return Proven;
            }
            return Dropped;
        }

        /** The claim path: a spare may be handed to a chat open only when it is not a kept spare, or a kept one that is
         *  Proven. Kept · Proving · Dropped (or any unknown state) → not usable: drop it and open cold. */
        internal static bool claimable(bool isKeptSpare, int state)
        {
            return !isKeptSpare || state == Proven;
        }
    }
}
