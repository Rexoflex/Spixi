/* ★ S11 A (#1262) — the PURE half of the Chats-list hint cards (scripts/csh: S11HintTests.cs). No MAUI, no Core type,
 * no disk — the harness executes every rule. The store is Spixi/Meta/SHints.cs (over SLocalOnlyStore); the call sites
 * (HomePage `ixian:hint:` + the `setHints` push, SettingsPage `ixian:hintsoff:`) are pinned by scripts/pins-s11/a-cs.mjs.
 *
 * THE SPLIT (Damir, #1262): C# only STORES — firstSeen, lastShown, the done ids, the off switch. The home SHELL decides
 * which tip (if any) shows (glass-card.js pickHint). So nothing here chooses a tip.
 *
 * SECURITY (CLAUDE.md ★): the verbs carry only an action word from a fixed pair and a tip id from a fixed whitelist —
 * both validated here before anything is written, and nothing from the WebView is ever logged or stored verbatim
 * (the stored ids are this file's own constants). The push carries numbers, those constants and a bool. */
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace SPIXI
{
    public static class S11HintRules
    {
        /** The tip ids the home shell may report (glass-card.js HINT_IDS, tips 5–9). Tips 1–4 join when Damir's web
         *  pages exist — add the id HERE and in HINT_TIPS together; an id this list does not know is ignored. */
        public static readonly string[] TipIds = { "backup", "wallet", "apps", "addcontact", "tip" };

        public const string ActionShown = "shown";
        public const string ActionDone = "done";

        public static bool isTipId(string? id)
        {
            if (string.IsNullOrEmpty(id)) return false;
            foreach (string t in TipIds)
            {
                if (string.Equals(t, id, StringComparison.Ordinal)) return true;
            }
            return false;
        }

        /** `ixian:hint:<action>:<id>` → the payload after "ixian:hint:". Exact: one action of the pair, one colon,
         *  one whitelisted id — anything else (a case change, a space, a second colon, a path) is refused. */
        public static bool parseVerb(string? payload, out string action, out string id)
        {
            action = "";
            id = "";
            if (string.IsNullOrEmpty(payload) || payload.Length > 32) return false;
            int c = payload.IndexOf(':');
            if (c <= 0 || payload.IndexOf(':', c + 1) >= 0) return false;
            string a = payload.Substring(0, c);
            string i = payload.Substring(c + 1);
            if (!string.Equals(a, ActionShown, StringComparison.Ordinal) && !string.Equals(a, ActionDone, StringComparison.Ordinal)) return false;
            if (!isTipId(i)) return false;
            action = a;
            id = i;
            return true;
        }

        /** `ixian:hintsoff:<0|1>` → the payload after "ixian:hintsoff:". "1" = hints OFF, "0" = hints on; nothing else. */
        public static bool parseOff(string? payload, out bool off)
        {
            off = false;
            if (string.Equals(payload, "1", StringComparison.Ordinal)) { off = true; return true; }
            if (string.Equals(payload, "0", StringComparison.Ordinal)) { off = false; return true; }
            return false;
        }

        /** A stored millisecond value ("" / garbage / negative → 0). */
        public static long parseMs(string? raw)
        {
            if (string.IsNullOrEmpty(raw) || raw.Length > 16) return 0;
            foreach (char ch in raw)
            {
                if (ch < '0' || ch > '9') return 0;
            }
            return long.TryParse(raw, NumberStyles.None, CultureInfo.InvariantCulture, out long v) && v > 0 ? v : 0;
        }

        public static string formatMs(long v) => v > 0 ? v.ToString(CultureInfo.InvariantCulture) : "";

        /** firstSeen = the first HomePage load on this install. Missing → now. In the FUTURE (the clock moved back) →
         *  now as well, so a clock change can delay the hints by one grace period but never freeze them forever. */
        public static long firstSeenFix(long stored, long now) => (stored <= 0 || stored > now) ? now : stored;

        /** lastShown in the future (the clock moved back) → now: at most one more gap, never a frozen card. */
        public static long lastShownFix(long stored, long now) => stored <= 0 ? 0 : (stored > now ? now : stored);

        /** The stored done list ("backup,wallet") → the whitelisted ids, in list order, each once. */
        public static List<string> parseDone(string? raw)
        {
            List<string> l = new List<string>();
            if (string.IsNullOrEmpty(raw)) return l;
            foreach (string part in raw.Split(','))
            {
                if (isTipId(part) && !l.Contains(part)) l.Add(part);
            }
            return l;
        }

        /** The done list with `id` added (a non-whitelisted id changes nothing). */
        public static string addDone(string? raw, string? id)
        {
            List<string> l = parseDone(raw);
            if (isTipId(id) && !l.Contains(id!)) l.Add(id!);
            return string.Join(",", l);
        }

        /** The `setHints` push: {"firstSeen":ms,"lastShown":ms,"done":["id",…],"off":bool,"now":ms}. Every value is a
         *  number, a bool or one of TipIds — built by hand on purpose (no escaping question can arise). */
        public static string pushJson(long firstSeen, long lastShown, IEnumerable<string> done, bool off, long now)
        {
            StringBuilder sb = new StringBuilder(128);
            sb.Append("{\"firstSeen\":").Append(Math.Max(0, firstSeen).ToString(CultureInfo.InvariantCulture));
            sb.Append(",\"lastShown\":").Append(Math.Max(0, lastShown).ToString(CultureInfo.InvariantCulture));
            sb.Append(",\"done\":[");
            bool first = true;
            foreach (string d in done)
            {
                if (!isTipId(d)) continue;
                if (!first) sb.Append(',');
                sb.Append('"').Append(d).Append('"');
                first = false;
            }
            sb.Append("],\"off\":").Append(off ? "true" : "false");
            sb.Append(",\"now\":").Append(Math.Max(0, now).ToString(CultureInfo.InvariantCulture)).Append('}');
            return sb.ToString();
        }
    }
}
