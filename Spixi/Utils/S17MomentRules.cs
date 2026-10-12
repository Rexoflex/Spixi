/* ★ S17 F (#1340) — THE MOMENT SHEETS: the PURE rules of the bridge, executed by scripts/csh (S17MomentTests.cs). The
 * store and the MAUI glue (SMoments, the four pages' caps / push, the verb branch in SpixiContentPage.onNavigatingGlobal)
 * only call these. Review packet: docs/be-review-pack/P28-moments.md. Flag: SpixiFlags.S17Moments (OFF = no cap, no push,
 * every verb below ignored).
 *
 *   · the ASK  `ixian:moment:<id>` · `ixian:moment:lang:<xx-yy>` · `ixian:moment:app:<app id>` — EXACT grammar: a fixed id
 *     set, a lower-case locale code, an app id of [A-Za-z0-9._-]{1,128}; anything else is refused before it is read further.
 *   · the CARD `ixian:moment:card` (home only) — a hint / update / backup / rating card went on screen: no moment sheet in
 *     this session (MOMENTS.md), the first IXI excepted.
 *   · the ANSWER momentAnswer(id, arg, "1"|"0", caps) — caps = MiniAppCapabilities NAMES (constants), app moment only.
 *   · the PUSH setMoments {"seen":[ids],"apps":[app ids],"lang":"<code>"|"","session":true|false}.
 * Seen flags: SLocalOnlyStore (device only, never in a backup, wiped with the account) — "moments.seen" (ids, csv),
 * "moments.langs" (codes, csv), "moments.apps" (app ids, csv, the newest MaxApps kept).
 */
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace SPIXI
{
    public static class S17MomentRules
    {
        public const string VerbPrefix = "ixian:moment:";
        public const string CardVerb = "ixian:moment:card";
        public const string KeySeen = "moments.seen";
        public const string KeyLangs = "moments.langs";
        public const string KeyApps = "moments.apps";
        public const int MaxApps = 200;
        public const int MaxLangs = 40;
        public const long MaxSessionMs = 6L * 60 * 60 * 1000;   // a session ends 6 h after its first moment / card

        /** The seven ids (MOMENTS.md). `lang` and `app` carry an argument; the other five never do. */
        public static readonly string[] Ids = { "lang", "autodl", "offline", "firstixi", "mic", "app", "pay" };
        /** The only names the app moment's answer may carry (MiniAppCapabilities minus SingleUser). */
        public static readonly string[] CapNames = { "MultiUser", "Authentication", "TransactionSigning", "RegisteredNamesManagement", "Storage" };

        private static readonly Regex LangRe = new Regex("^[a-z]{2}-[a-z]{2}$", RegexOptions.CultureInvariant);
        private static readonly Regex AppRe = new Regex("^[A-Za-z0-9._-]{1,128}$", RegexOptions.CultureInvariant);

        public static bool isLangCode(string? code) => code != null && LangRe.IsMatch(code);
        public static bool isAppId(string? id) => id != null && AppRe.IsMatch(id);
        public static bool isEnglish(string code) => code.StartsWith("en-", StringComparison.Ordinal);

        public static bool isCardVerb(string? url) => string.Equals(url, CardVerb, StringComparison.Ordinal);

        /** The ask, exactly: true + id (+ arg for lang / app); anything else = false. */
        public static bool parseAsk(string? url, out string id, out string arg)
        {
            id = "";
            arg = "";
            if (url == null || !url.StartsWith(VerbPrefix, StringComparison.Ordinal)) return false;
            string rest = url.Substring(VerbPrefix.Length);
            int colon = rest.IndexOf(':');
            string head = colon < 0 ? rest : rest.Substring(0, colon);
            string tail = colon < 0 ? "" : rest.Substring(colon + 1);
            if (Array.IndexOf(Ids, head) < 0) return false;
            if (head == "lang")
            {
                if (!isLangCode(tail)) return false;
            }
            else if (head == "app")
            {
                if (!isAppId(tail)) return false;
            }
            else if (colon >= 0)
            {
                return false;
            }
            id = head;
            arg = tail;
            return true;
        }

        /** Eligibility of one ask, from the id's own condition: Yes, Wait (not now; ask again on the next trigger) or
         *  Consume (never needed: store seen, show nothing — e.g. the mic is already granted, a backup exists). */
        public enum Eligible { Yes, Wait, Consume }
        /** The decision: Grant (store seen + session, answer 1) · Refuse (nothing changes, answer 0) · Consume (store seen, answer 0). */
        public enum Decision { Grant, Refuse, Consume }

        /** MOMENTS.md: once per id (per language / per app); at most ONE per session and never in a session with a card —
         *  except firstixi (safety). Seen wins over everything; Consume wins over the session rule (it shows nothing). */
        public static Decision decide(string id, bool seen, bool sessionMoment, bool sessionCard, Eligible eligible)
        {
            if (seen) return Decision.Refuse;
            if (eligible == Eligible.Consume) return Decision.Consume;
            if (eligible == Eligible.Wait) return Decision.Refuse;
            if (id != "firstixi" && (sessionMoment || sessionCard)) return Decision.Refuse;
            return Decision.Grant;
        }

        /** Does this grant take the session (firstixi does not: it is the exception to the one-per-session rule)? */
        public static bool takesSession(string id) => id != "firstixi";

        /* —— ★ S18 D3: the decision log line (the S17 walk could not tell "refused by the session rule" from "never asked") —— */
        /** WHY decide() answered as it did, in its own order: seen · consume (= ok: the id's own check says it is never
         *  needed) · wait · session (a moment this session) · card (a card this session) · ok (granted). */
        public enum Why { Seen, Wait, Session, Card, Ok }
        private static readonly string[] WhyWords = { "seen", "wait", "session", "card", "ok" };

        public static Why why(string id, bool seen, bool sessionMoment, bool sessionCard, Eligible eligible)
        {
            if (seen) return Why.Seen;
            if (eligible == Eligible.Consume) return Why.Ok;
            if (eligible == Eligible.Wait) return Why.Wait;
            if (id != "firstixi")
            {
                if (sessionMoment) return Why.Session;
                if (sessionCard) return Why.Card;
            }
            return Why.Ok;
        }

        /** At most this many ask lines per process (a page that spams asks cannot flood ixian.log; a walk asks ~20). */
        public const int MaxAskLines = 100;

        public static string decisionWord(Decision d) => d == Decision.Grant ? "grant" : d == Decision.Consume ? "consume" : "refuse";

        /** `[MO] ask id=<id> d=<grant|refuse|consume> why=<seen|wait|session|card|ok>` — fixed words only: the id is re-read
         *  from the FIXED set (Ids), never the caller's string; no language code, no app id, no page. "" for an id outside the
         *  set (unreachable: parseAsk admits the set only) — the caller then logs nothing. */
        public static string askLine(string id, Decision d, Why w)
        {
            int i = Array.IndexOf(Ids, id);
            int k = (int)w;
            if (i < 0 || k < 0 || k >= WhyWords.Length) return "";
            return "[MO] ask id=" + Ids[i] + " d=" + decisionWord(d) + " why=" + WhyWords[k];
        }

        /** The one line of the Developer › Reset moment sheets action (DevPage, `ixian:devmoments:reset`). */
        public const string DevResetVerb = "ixian:devmoments:reset";
        public const string DevResetLine = "[MO] dev reset: moment sheets cleared";

        /* —— the csv lists (validated on the way in AND out: a hand-edited file cannot inject a value) —— */
        public static List<string> parseList(string? csv, Func<string, bool> valid)
        {
            List<string> list = new List<string>();
            if (string.IsNullOrEmpty(csv)) return list;
            foreach (string raw in csv.Split(','))
            {
                string v = raw.Trim();
                if (v.Length > 0 && valid(v) && !list.Contains(v)) list.Add(v);
            }
            return list;
        }
        public static bool isSeenId(string v) => Array.IndexOf(Ids, v) >= 0 && v != "lang" && v != "app";
        public static string addToList(string? csv, string item, Func<string, bool> valid, int cap)
        {
            List<string> list = parseList(csv, valid);
            if (!valid(item)) return string.Join(",", list);
            list.Remove(item);
            list.Add(item);
            while (list.Count > cap) list.RemoveAt(0);   // the oldest goes first
            return string.Join(",", list);
        }

        /** The caps of the app answer: known names only, in the fixed order. */
        public static string capsCsv(IEnumerable<string> names)
        {
            HashSet<string> have = new HashSet<string>(names ?? Enumerable.Empty<string>(), StringComparer.Ordinal);
            return string.Join(",", CapNames.Where(have.Contains));
        }

        /** setMoments — built from validated values only (ids, codes and app ids need no escaping: [A-Za-z0-9._-]).
         *  sessionMs = the time left in a taken session (0 when none; clamped 0 … 6 h) — the shell ends it there too. */
        public static string pushJson(IEnumerable<string> seen, IEnumerable<string> apps, string pendingLang, bool session, long sessionMs = 0)
        {
            StringBuilder sb = new StringBuilder();
            sb.Append("{\"seen\":[");
            sb.Append(string.Join(",", seen.Where(isSeenId).Select(x => "\"" + x + "\"")));
            sb.Append("],\"apps\":[");
            sb.Append(string.Join(",", apps.Where(isAppId).Select(x => "\"" + x + "\"")));
            sb.Append("],\"lang\":\"");
            sb.Append(isLangCode(pendingLang) ? pendingLang : "");
            sb.Append("\",\"session\":");
            sb.Append(session ? "true" : "false");
            sb.Append(",\"sessionMs\":");
            sb.Append(session ? Math.Max(0, Math.Min(sessionMs, MaxSessionMs)).ToString(System.Globalization.CultureInfo.InvariantCulture) : "0");
            sb.Append('}');
            return sb.ToString();
        }

        public static string flagLine(bool on) => "[FLAGS] s17moments=" + (on ? "1" : "0");
    }
}
