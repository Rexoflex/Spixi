/* ★ V1A-M (Drop 2, #1312 rule 1) — the PURE rules of the first-minute moments, executed by scripts/csh (V1AMTests.cs).
 * Review packet: docs/be-review-pack/P31-v1am-moments-and-tips.md. Two flags, each read ONCE at start (SpixiFlags.init),
 * absent = ON, a stored 0 acts only in dev mode (S16PassRules.effectiveFlag), one fixed [FLAGS] line each:
 *
 *   · M1 — the "What is IXI?" moment (flag SpixiFlags.V1IxiHelp, pref flagV1IxiHelp): the id `ixihelp` in the S17 moment
 *     set (S17MomentRules.Ids; no argument). Home only; once per id, refused after a moment or a card this session (NOT
 *     exempt) — but it never TAKES the session (#46 r1: S17MomentRules.takesSession), so it never holds back `pay`.
 *     OFF = no `ixihelp` cap, the ask `ixian:moment:ixihelp` ignored before anything is read further (SMoments.handleVerb).
 *   · M2 — the word tips (flag SpixiFlags.V1Hints, pref flagV1Hints): the ids S11HintRules.WordIds on the S11 hint verb
 *     `ixian:hint:done:<word id>` → the S11 done list (SHints.markDone). A word tip NEVER touches lastShown (the weekly tip
 *     rotation must not move): `shown` for a word id is dropped ALWAYS. OFF = no `wordtips` cap, every word-id hint verb
 *     dropped. The S11 branch of the hint verb never sees a word id (HomePage dispatches the word verb first).
 *
 * SECURITY (CLAUDE.md ★): no new WebView / spixi.* key and no new store key (the S17 / S11 local-only keys carry the new
 * ids); 2 int prefs (the flags); 1 dev push (setFlagsDevV1). The verbs carry ids from fixed sets only, validated here before
 * anything is written; nothing from the WebView is logged. */
using System;

namespace SPIXI
{
    public static class V1AMRules
    {
        /** M1: the moment id (S17MomentRules.Ids holds the same literal — the one set parseAsk / askLine / isSeenId read). */
        public const string IxiHelpId = "ixihelp";

        public static string flagLineIxiHelp(bool on) => "[FLAGS] v1ixihelp=" + (on ? "1" : "0");
        public static string flagLineHints(bool on) => "[FLAGS] v1hints=" + (on ? "1" : "0");

        /** M1: the moment's own check (SMoments.answerAsync) — the home page only, and only with the flag on; anything else
         *  waits (nothing is stored: Wait never marks seen). */
        public static S17MomentRules.Eligible ixiHelpEligible(bool flagOn, bool onHome) =>
            flagOn && onHome ? S17MomentRules.Eligible.Yes : S17MomentRules.Eligible.Wait;

        /** M2: `ixian:hint:<action>:<word id>` (the FULL url) — the S11 grammar exactly (S11HintRules.parseVerb: one action of
         *  the pair, one whitelisted id) AND the id is a word id. Anything else = false (then the S11 branch decides). */
        public const string HintPrefix = "ixian:hint:";
        public static bool parseWordTipVerb(string? url, out string action, out string id)
        {
            action = "";
            id = "";
            if (url == null || !url.StartsWith(HintPrefix, StringComparison.Ordinal)) return false;
            if (!S11HintRules.parseVerb(url.Substring(HintPrefix.Length), out string a, out string i)) return false;
            if (!S11HintRules.isWordId(i)) return false;
            action = a;
            id = i;
            return true;
        }

        /** M2: does a word-tip verb write? Only `done`, only with the flag on. `shown` never writes (lastShown stays). */
        public static bool wordTipMarksDone(bool flagOn, string? action) =>
            flagOn && string.Equals(action, S11HintRules.ActionDone, StringComparison.Ordinal);

        /** The dev push `window.setFlagsDevV1` — "<ixihelp 0|1>,<hints 0|1>" from the STORED prefs (absent = 1; only a
         *  stored 0 reads 0, the S16 rule of pushFlagsDev). Fixed digits only, no JSON. */
        public static string devFlagsArg(int ixiHelp, int hints) => (ixiHelp == 0 ? "0" : "1") + "," + (hints == 0 ? "0" : "1");
    }
}
