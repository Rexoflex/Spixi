/* ★★ #1198 (session 6b, #1137 (3)) — THE REPLY QUOTE LINE: a reply travels as ordinary TEXT, no Core change.
 *
 * A reply is sent as `"> " + NAME_PART + EXCERPT + "\n" + BODY` (NAME_PART = name + ": " when there is a name, else "").
 * An old Spixi shows exactly that text — a readable quote line above the answer. This app MATCHES the line against the
 * messages it holds in the same chat + channel: a match renders the body with a quote box (addMe / addThem args 13–16,
 * updateMessage args 9–11); no match on a VALID quote line → the box is drawn from the line itself, with no jump (Damir
 * P2, #46 r1: `fallbackOf`); a first line that is not the shape → the text is shown unchanged. The target id never
 * travels — both devices compute the SAME excerpt from the SAME message, so the line is the key.
 *
 * EXCERPT (language-NEUTRAL, deterministic, both devices run this code):
 *   · standard text: the BODY (a text that is itself a reply drops its own quote line first — a reply to a reply quotes
 *     the answer, not the quote), every control (C0 / C1, \r \n \t) and U+2028 / U+2029 → a space, whitespace runs → one
 *     space, trimmed; capped at 60 TEXT ELEMENTS (StringInfo: an emoji ZWJ sequence or a flag is one element, never cut)
 *     → the first 60 + "…". Nothing left → "…". An EMPTY stored text (a deleted row) is not quotable.
 *     ★ #46 r1 A MAJOR-1 (cost): the normalise + cap is BOUNDED — it reads a growing prefix (128, 256, … chars) and stops
 *     as soon as the prefix holds ≥ 62 text elements (the first 60 are then final: a grapheme boundary never depends on
 *     more than the next character), so a 64 000-char text costs ~128 chars of work, with a result identical to the full
 *     normalise + cap (ReplyQuoteTests checks the two against each other).
 *   · fileHeader: "📷 " + name for a photo (SharedItems.isImageName — the caller passes the answer), else "📎 " + name;
 *     the name normalised + capped the same way. An unparseable header (or a blanked one) is not quotable.
 *   · sentFunds / requestFunds → "💸 Payment" · voiceCall / voiceCallEnd → "📞 Call" · appSession → "🚀 App".
 *   · any other type → not quotable (null).
 * THE SHAPE: the first line starts with "> ", a "\n" follows within MaxLineChars (a longer first line is not a quote
 * line — bounded, and the same rule on every device), and the body after it is non-empty.
 * NAME: the target's sender as THIS device shows it (the caller decides WHICH name — #46 r1 A MAJOR-2: never a private
 * alias), through the #1178 member-name rule (FileRowRules — unchanged): controls, separators, Cf and bidi stripped;
 * address-like or empty → ""; capped at 32 + "…". A parsed name is put through the SAME rule again (peer-written text).
 * MATCH (#46 r1 C M-1 / m-1, A MINOR-3 — one ranking across ALL candidates):
 *   1. the sender's own remembered target (the compose-time id, kept in memory on the SENDING device) when it matches;
 *   2. an EXACT line — "> " + E, or "> " + the candidate's expected name (this device's view of its sender) + ": " + E —
 *      before a ": "-suffix match with any other name;
 *   3. the LONGEST excerpt;
 *   4. the NEWEST candidate whose time is ≤ the reply's time; only if none, the +300 s clock skew as a fallback (then
 *      the one closest to the reply's time); a later list position breaks an exact tie.
 *   Times are Core's `timestamp` — an edit keeps it (every replace passes the existing time back, #46 r2 MAJOR-1).
 *   🟡 RESIDUAL AMBIGUITY (for the lead): on the PEER's device two messages with the same excerpt, the same tier and the
 *   same time can still be confused (e.g. two "ok" answers by the same sender in the same second): the line carries no
 *   id, so the peer picks the later one. The sender's own device always picks the exact target (1.). A real fix needs
 *   an id on the wire (the v1.1 Core carrier, docs/be-cutover-ixian-core-reply-carrier.md).
 * PURE: no MAUI, no Friend, no FriendMessage — scripts/csh executes every case (ReplyQuoteTests.cs). */
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using IXICore.Streaming;

namespace SPIXI
{
    public static class ReplyQuote
    {
        public const string LinePrefix = "> ";
        public const int ExcerptMaxElements = 60;
        public const string Ellipsis = "…";
        /** ★ #1198: the one deeper history read per chat open (+ channel) when a loaded row is reply-shaped. */
        public const int DeepSearchMax = 1000;
        /** ★ #1198: a candidate may be at most this many seconds NEWER than the reply (sender clocks differ) — a fallback. */
        public const long SkewSeconds = 300;
        /** ★ #46 r1 A MAJOR-1: the longest first line that can be a quote line (a "\n" must follow within it). */
        public const int MaxLineChars = 4096;
        /** ★ #46 r1 A MAJOR-1: a name part is at most this many chars (32 + "…" from nameFor, with room) — bounds the probes. */
        public const int MaxNameProbeChars = 64;
        /** Damir P2: the longest name part (text elements) a fallback box shows as a name. */
        public const int FallbackNameMaxElements = 32;

        public const string PhotoGlyph = "📷 ";
        public const string FileGlyph = "📎 ";
        public const string PaymentExcerpt = "💸 Payment";
        public const string CallExcerpt = "📞 Call";
        public const string AppExcerpt = "🚀 App";

        private static readonly object NotQuotable = new object();

        /** One message a reply may quote, adapted from Core's FriendMessage by the caller. Fields are not changed after
         *  the candidate is built (the caller memoises it by id + sequence). */
        public sealed class Candidate
        {
            public string idHex = "";
            public FriendMessageType type;
            public string? text;
            public string? fileName;   // fileHeader only: the header's file name (SharedItems.parseFileHeader)
            public bool isImage;       // fileHeader only: SharedItems.isImageName(fileName)
            public long timestamp;     // Core's `timestamp` (an edit keeps it)
            public int sequence;       // the memo key with idHex
            public string expectedName = "";   // nameFor(this device's name for the sender) — the exact-line tier + a matched quote's name
            public string nameKey = "";        // the raw name expectedName was made from (the caller re-checks it: a roster nick can change)
            // the excerpt, computed once (ONE reference field: a string, or NotQuotable — a reader sees a whole answer)
            internal object? excerptMemo;
        }

        /** A matched reply (or, `matched` false, Damir P2's fallback box drawn from the line). */
        public sealed class Match
        {
            public string targetIdHex = "";
            public string quoteName = "";
            public string quoteText = "";
            public string body = "";
            public bool matched = true;
        }

        /** ★ #46 r1 A MAJOR-1: candidates indexed by their excerpt — a reply row costs a few dictionary probes, not a walk. */
        public sealed class Index
        {
            internal readonly Dictionary<string, List<Candidate>> byExcerpt = new Dictionary<string, List<Candidate>>(StringComparer.Ordinal);
            public int Count { get; private set; }

            public Index(IEnumerable<Candidate>? candidates)
            {
                if (candidates == null)
                {
                    return;
                }
                foreach (Candidate c in candidates)
                {
                    if (c == null)
                    {
                        continue;
                    }
                    string? e = excerptOf(c);
                    if (e == null)
                    {
                        continue;
                    }
                    if (!byExcerpt.TryGetValue(e, out List<Candidate>? list))
                    {
                        list = new List<Candidate>();
                        byExcerpt[e] = list;
                    }
                    list.Add(c);
                    Count++;
                }
            }
        }

        /** The quote-line SHAPE (no match): the first line starts with "> ", a "\n" follows within MaxLineChars, the body
         *  after it is non-empty. Never scans past MaxLineChars + 1 chars. */
        public static bool splitShape(string? text, out string line, out string body)
        {
            line = "";
            body = "";
            int nl = shapeNewline(text);
            if (nl < 0)
            {
                return false;
            }
            line = text!.Substring(0, nl);
            body = text.Substring(nl + 1);
            return true;
        }

        /** The index of the quote line's "\n", or -1 when `text` is not the shape (bounded scan). */
        private static int shapeNewline(string? text)
        {
            if (string.IsNullOrEmpty(text) || !text.StartsWith(LinePrefix, StringComparison.Ordinal))
            {
                return -1;
            }
            int nl = text.IndexOf('\n', 0, Math.Min(text.Length, MaxLineChars + 1));
            if (nl < 0 || nl + 1 >= text.Length)
            {
                return -1;
            }
            return nl;
        }

        /** Cheap: could `text` be a reply at all (the shape)? */
        public static bool looksLikeReply(string? text)
        {
            return shapeNewline(text) >= 0;
        }

        /** ★ #1198: the chats-list excerpt, the link scan and every other "show the text" site: a quote-line shape → the
         *  body; anything else unchanged. Shape only — the row needs no match. */
        public static string stripForExcerpt(string? text)
        {
            if (text == null)
            {
                return "";
            }
            int nl = shapeNewline(text);
            return nl >= 0 ? text.Substring(nl + 1) : text;
        }

        private static bool isSpaceLike(char c)
        {
            return char.IsControl(c) || c == '\u2028' || c == '\u2029' || char.IsWhiteSpace(c);
        }

        /** Controls (C0 / C1 incl. \r \n \t) and U+2028 / U+2029 → a space; whitespace runs → one space; trimmed.
         *  (The reference form — the excerpt uses the bounded `excerptOfRange`.) */
        public static string normalize(string? s)
        {
            if (string.IsNullOrEmpty(s))
            {
                return "";
            }
            return normalizeRange(s, 0, s.Length, int.MaxValue, out _);
        }

        /** ★ #46 r2 MINOR-7: characters READ by normalisation on this thread (tests prove the excerpt is bounded). */
        [ThreadStatic] public static long charsRead;

        /** Normalise s[start..end) until the output reaches `maxOut` chars; `consumed` = the input index reached. */
        private static string normalizeRange(string s, int start, int end, int maxOut, out int consumed)
        {
            StringBuilder sb = new StringBuilder(Math.Min(end - start, maxOut == int.MaxValue ? end - start : maxOut + 1));
            bool pendingSpace = false;
            int i = start;
            for (; i < end && sb.Length < maxOut; i++)
            {
                char c = s[i];
                if (isSpaceLike(c))
                {
                    pendingSpace = sb.Length > 0;   // a leading run is trimmed
                    continue;
                }
                if (pendingSpace)
                {
                    sb.Append(' ');
                    pendingSpace = false;
                }
                sb.Append(c);
            }
            // a trailing run (pending) is never appended; `i` stops right after the last char that was read
            consumed = i;
            charsRead += i - start;
            return sb.ToString();
        }

        /** The 60-text-element cap on a NORMALISED string; empty → "…". */
        public static string cap(string normalized)
        {
            if (normalized.Length == 0)
            {
                return Ellipsis;
            }
            StringInfo si = new StringInfo(normalized);
            if (si.LengthInTextElements <= ExcerptMaxElements)
            {
                return normalized;
            }
            return si.SubstringByTextElements(0, ExcerptMaxElements) + Ellipsis;
        }

        /** ★ #46 r1 A MAJOR-1: cap(normalize(s[start..end))) without walking the whole range — a doubling prefix, stopped
         *  once it holds ≥ 62 text elements (the first 60 are then final). */
        public static string excerptOfRange(string s, int start, int end)
        {
            int target = 128;
            while (true)
            {
                string cur = normalizeRange(s, start, end, target, out int consumed);
                bool exhausted = true;
                for (int k = consumed; k < end; k++)
                {
                    if (!isSpaceLike(s[k]))
                    {
                        exhausted = false;   // more text follows (only spaces / controls left = nothing follows)
                        break;
                    }
                    if (k - consumed > 64)
                    {
                        exhausted = false;   // a long space run: read on (bounded look)
                        break;
                    }
                }
                if (exhausted)
                {
                    return cap(cur);
                }
                StringInfo si = new StringInfo(cur);
                if (si.LengthInTextElements >= ExcerptMaxElements + 2)
                {
                    return si.SubstringByTextElements(0, ExcerptMaxElements) + Ellipsis;
                }
                if (target >= end - start)
                {
                    return cap(normalizeRange(s, start, end, int.MaxValue, out _));
                }
                target = target > (end - start) / 2 ? end - start : target * 2;
            }
        }

        /** ★ #1198: the excerpt of a quotable message; null = not quotable (see the header). */
        public static string? excerptOf(FriendMessageType type, string? text, string? fileName, bool isImage)
        {
            switch (type)
            {
                case FriendMessageType.standard:
                    if (string.IsNullOrEmpty(text))
                    {
                        return null;   // a deleted row
                    }
                    int nl = shapeNewline(text);
                    return excerptOfRange(text, nl >= 0 ? nl + 1 : 0, text.Length);
                case FriendMessageType.fileHeader:
                    if (string.IsNullOrEmpty(fileName))
                    {
                        return null;   // an unparseable / blanked header
                    }
                    return (isImage ? PhotoGlyph : FileGlyph) + excerptOfRange(fileName, 0, fileName.Length);
                case FriendMessageType.sentFunds:
                case FriendMessageType.requestFunds:
                    return PaymentExcerpt;
                case FriendMessageType.voiceCall:
                case FriendMessageType.voiceCallEnd:
                    return CallExcerpt;
                case FriendMessageType.appSession:
                    return AppExcerpt;
                default:
                    return null;
            }
        }

        /** The candidate's excerpt, memoised on the candidate. */
        public static string? excerptOf(Candidate c)
        {
            object? memo = c.excerptMemo;
            if (memo == null)
            {
                memo = (object?)excerptOf(c.type, c.text, c.fileName, c.isImage) ?? NotQuotable;
                c.excerptMemo = memo;
            }
            return memo as string;
        }

        /** ★ #1198: the quote NAME from a display name — the #1178 member rule (FileRowRules, unchanged). "" = no name. */
        public static string nameFor(string? displayName)
        {
            if (!FileRowRules.usableMemberName(displayName))
            {
                return "";
            }
            return FileRowRules.memberNameForNotification(displayName);
        }

        /** ★ #1198: the quote line (no "\n"): "> " + NAME_PART + excerpt. `name` is passed through nameFor. */
        public static string quoteLine(string? name, string excerpt)
        {
            string n = nameFor(name);
            return LinePrefix + (n.Length > 0 ? n + ": " : "") + excerpt;
        }

        /** ★ #1198: the text a reply sends. */
        public static string compose(string? name, string excerpt, string body)
        {
            return quoteLine(name, excerpt) + "\n" + body;
        }

        /** ★ #1198: is `text` a reply to one of `candidates`? (builds an Index — the page reuses one per load) */
        public static bool tryMatch(string? text, long replyTimestamp, string? replyIdHex, IEnumerable<Candidate>? candidates, out Match? match)
        {
            match = null;
            if (candidates == null || !looksLikeReply(text))
            {
                return false;
            }
            return tryMatch(text, replyTimestamp, replyIdHex, new Index(candidates), null, out match);
        }

        /** ★ #1198 / #46 r1: the ranked match (see the header). `preferredTargetHex` = the sender's remembered target. */
        public static bool tryMatch(string? text, long replyTimestamp, string? replyIdHex, Index? index, string? preferredTargetHex, out Match? match)
        {
            match = null;
            if (index == null || !splitShape(text, out string line, out string body))
            {
                return false;
            }
            string rest = line.Substring(LinePrefix.Length);
            Candidate? best = null;
            string bestExcerpt = "";
            int bestTier = int.MaxValue;
            bool bestInTime = false;
            int probes = Math.Min(rest.Length, MaxNameProbeChars);
            // probe -1 = the whole rest is the excerpt (no name); probe p = rest[..p] + ": " + excerpt
            for (int p = -1; p < probes; p++)
            {
                string name;
                string e;
                if (p < 0)
                {
                    name = "";
                    e = rest;
                }
                else
                {
                    if (p + 1 >= rest.Length || rest[p] != ':' || rest[p + 1] != ' ')
                    {
                        continue;
                    }
                    name = rest.Substring(0, p);
                    e = rest.Substring(p + 2);
                }
                if (!index.byExcerpt.TryGetValue(e, out List<Candidate>? list))
                {
                    continue;
                }
                for (int li = 0; li < list.Count; li++)
                {
                    Candidate c = list[li];
                    if (!string.IsNullOrEmpty(replyIdHex) && string.Equals(c.idHex, replyIdHex, StringComparison.Ordinal))
                    {
                        continue;   // never the reply itself
                    }
                    if (c.timestamp > replyTimestamp + SkewSeconds)
                    {
                        continue;   // a message written (well) after the reply cannot be its target
                    }
                    bool preferred = !string.IsNullOrEmpty(preferredTargetHex) && string.Equals(c.idHex, preferredTargetHex, StringComparison.Ordinal);
                    bool exact = p < 0 || (c.expectedName.Length > 0 && string.Equals(name, c.expectedName, StringComparison.Ordinal));
                    int tier = preferred ? 0 : exact ? 1 : 2;
                    bool inTime = c.timestamp <= replyTimestamp;
                    bool better;
                    if (best == null || tier != bestTier)
                    {
                        better = best == null || tier < bestTier;
                    }
                    else if (e.Length != bestExcerpt.Length)
                    {
                        better = e.Length > bestExcerpt.Length;
                    }
                    else if (inTime != bestInTime)
                    {
                        better = inTime;
                    }
                    else if (c.timestamp != best.timestamp)
                    {
                        better = inTime ? c.timestamp > best.timestamp : c.timestamp < best.timestamp;   // in time: newest · skew: closest
                    }
                    else
                    {
                        better = true;   // a later position in the same excerpt list wins an exact tie (lists keep list order)
                    }
                    if (better)
                    {
                        best = c;
                        bestExcerpt = e;
                        bestTier = tier;
                        bestInTime = inTime;
                    }
                }
            }
            if (best == null)
            {
                return false;
            }
            /* ★ #46 r2 MINOR-2: a MATCHED quote names the sender as THIS device shows it (the candidate's expectedName — "" in
             * a 1:1), never the name written in the peer's line (peer-controlled; it could name anyone). The line's own name
             * is used only by fallbackOf (no match). */
            match = new Match { targetIdHex = best.idHex, quoteName = best.expectedName, quoteText = bestExcerpt, body = body, matched = true };
            return true;
        }

        /** ★ Damir P2 (#46 r1): a VALID quote line that matches nothing → a box drawn from the line itself, no jump:
         *  name = the part before the first ": " when it is ≤ 32 text elements (the #1178 rule; address-like → ""), else no
         *  name; text = the rest (after that ": ", or the whole line when there is no usable name part) capped like an
         *  excerpt; an address-like name part (the #1178 test, any length) is dropped from the box (neither name nor text);
         *  the body is the text. null = not the shape (the text is shown unchanged). */
        public static Match? fallbackOf(string? text)
        {
            if (!splitShape(text, out string line, out string body))
            {
                return null;
            }
            string rest = line.Substring(LinePrefix.Length);
            int sep = rest.IndexOf(": ", StringComparison.Ordinal);
            string name = "";
            int textStart = 0;
            if (sep >= 0)
            {
                string part = rest.Substring(0, sep);
                string clean = FileRowRules.sanitizeMemberName(part);
                if (clean.Length > 24 && clean.IndexOf(' ') < 0)
                {
                    textStart = sep + 2;   // ★ #46 r2 NIT: an ADDRESS-like name part (any length) is dropped entirely — never an address in a box
                }
                else if (new StringInfo(part).LengthInTextElements <= FallbackNameMaxElements)
                {
                    name = nameFor(part);
                    textStart = sep + 2;
                }
            }
            return new Match { targetIdHex = "", quoteName = name, quoteText = excerptOfRange(rest, textStart, rest.Length), body = body, matched = false };
        }
    }
}
