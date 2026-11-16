/* ★ perfb1toggle (#1595) — DEV-ONLY: the adb walk sets the four switches of batch 1a (PerfB1Rules.DevSwitchNames) by ONE
 * string extra on the launch intent. The PURE half: the extra's name, the one stored line and the grammar
 * (docs/contract-perfb1toggle.md § 3). CANON = exactly `warmidle=<0|1>,sparerearm=<0|1>,sparekeep=<0|1>,noemptydetail=<0|1>`
 * (51 characters, the names in this order, built from DevSwitchNames); anything else is refused WHOLE — all four or nothing.
 * Dev mode off = refused. A length check and an ordinal compare per position; no Regex.
 * No MAUI, no Android, no Core type: the harness runs it (scripts/csh/PerfB1ExtraTests.cs). SpixiFlags.storePerfB1Extra
 * stores; MainActivity reads the extra. A STORE build compiles nothing of this file (the O-35 gate refuses the symbol). */
#if SPIXI_DEV_COEXIST
namespace SPIXI
{
    internal static class PerfB1ExtraRules
    {
        /** The string extra on the launch intent of the dev build's launcher activity (ordinal). */
        internal const string ExtraName = "perfb1flags";

        /** The one line of a successful store: fixed words, no value, no length, no name from the extra. */
        internal const string StoredLine = "[FLAGS] perfb1 extra stored";

        /** CANON → the four values (0 or 1) in DevSwitchNames order; dev mode off, null or any other text → null. */
        internal static int[]? parse(bool devMode, string? value)
        {
            if (!devMode || value == null)
            {
                return null;
            }
            string[] names = PerfB1Rules.DevSwitchNames;
            int want = names.Length - 1;   // the separators
            for (int i = 0; i < names.Length; i++)
            {
                want += names[i].Length + 2;   // name, '=', one digit
            }
            if (value.Length != want)
            {
                return null;
            }
            int[] values = new int[names.Length];
            int p = 0;
            for (int i = 0; i < names.Length; i++)
            {
                if (i > 0)
                {
                    if (value[p] != ',')
                    {
                        return null;
                    }
                    p++;
                }
                string name = names[i];
                for (int k = 0; k < name.Length; k++)
                {
                    if (value[p + k] != name[k])
                    {
                        return null;
                    }
                }
                p += name.Length;
                if (value[p] != '=')
                {
                    return null;
                }
                p++;
                char c = value[p];
                if (c == '0')
                {
                    values[i] = 0;
                }
                else if (c == '1')
                {
                    values[i] = 1;
                }
                else
                {
                    return null;
                }
                p++;
            }
            return values;
        }
    }
}
#endif
