/* ★ perfb1 (Speed batch 1a, #1312 rule 1, P38–P41) — the PURE half of the four runtime switches: the one [FLAGS] line,
 * the dev switch names and the dev verb map (★ fixb1 item 7: the opt-in rule (a stored 1 in dev mode) is gone — SpareKeepShortSleep
 * takes S16PassRules.effectiveFlag like the other three). No MAUI, no Core type: the harness runs it
 * (scripts/csh/PerfB1FlagsTests.cs). SpixiFlags.init reads the preferences; DevPage stores them (the safety switches' rules). */
using System;

namespace SPIXI
{
    public static class PerfB1Rules
    {
        /** The one start line of this batch: fixed words and 0|1 only. */
        public static string flagsLine(bool warmIdle, bool spareRearm, bool spareKeep, bool noEmptyDetail)
        {
            return "[FLAGS] warmidle=" + b(warmIdle) + " sparerearm=" + b(spareRearm) + " sparekeep=" + b(spareKeep)
                + " noemptydetail=" + b(noEmptyDetail);
        }

        /** The dev switch names (`ixian:devflash:<name>:<0|1>`, DevPage), in the SpixiFlags.PerfB1DevKeys order. */
        public static readonly string[] DevSwitchNames = { "warmidle", "sparerearm", "sparekeep", "noemptydetail" };

        public const string DevFlashPrefix = "ixian:devflash:";

        /** `ixian:devflash:<name>:<tail>` for a name in DevSwitchNames → its index and the tail after "<name>:" (the caller
         *  checks the tail with S16PassRules.parseFlagTail). Any other verb (another name, no ':' after the name, null) →
         *  false, index -1, tail "". Ordinal: case counts. */
        public static bool devSwitchVerb(string? url, out int index, out string tail)
        {
            index = -1;
            tail = "";
            if (url == null)
            {
                return false;
            }
            for (int i = 0; i < DevSwitchNames.Length; i++)
            {
                string prefix = DevFlashPrefix + DevSwitchNames[i] + ":";
                if (url.StartsWith(prefix, StringComparison.Ordinal))
                {
                    index = i;
                    tail = url.Substring(prefix.Length);
                    return true;
                }
            }
            return false;
        }

        private static string b(bool v) => v ? "1" : "0";
    }
}
