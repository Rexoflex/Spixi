/* ★ S20 F (#1378): the C# half of the message-formatting grammar — the STRIP only (marks and fences dropped, the text
 * kept). The JS half (src/components/msg-format.js, builder F) parses and renders; both pass the same vectors
 * (scripts/pins-s20/f-vectors.json — csh S20FormatTests reads the file and carries its own copy of every vector).
 * This file mirrors msg-format.js step by step, on UTF-16 code units like JS strings:
 *   0. (#46 r1 MINOR-1) when the text is ≤ LinkRule.LinkifyMax (4096), every URL LinkRule.spans finds (the #1106 twin of
 *      src/components/link-rule.js urlSpans), minus its trailing run of * _ ~, is OPAQUE to step 3: no mark inside it
 *      opens or closes (`…/main/__init__.py`, `site.com/*promo*` stay as typed); marks AROUND it still apply;
 *   1. a code block opens with ``` at the text start or right after '\n' and closes at the NEXT ``` anywhere after it;
 *      one leading and one trailing '\n' of the body are dropped; an EMPTY body is no block (the scan moves on);
 *   2. inline code: a '`' pairs with the next '`' before the line end, the content non-empty, else it is literal;
 *   3. * _ ~ in each run between code: opens at the run start or after a non letter/digit, followed by a non-space;
 *      closes at the FIRST valid closer (preceded by a non-space, followed by the end or a non letter/digit) after
 *      i + 1 and before the line end / the run end; nested by recursion (depth ≤ 4: a mark cannot nest in itself,
 *      because its own first valid closer would end the outer one).
 * Letter / digit = JS /[\p{L}\p{N}]/u on ONE code unit (a surrogate half is neither); whitespace = JS /\s/ (\uFEFF is a
 * space, \u0085 is not) — NOT char.IsLetterOrDigit / char.IsWhiteSpace, which differ on No / Nl digits and those two.
 * Cost O(n log n): closer positions are pre-computed per mark, each search is a binary search (the JS DoS guard).
 * Pure: no MAUI, no I/O. No caller in the app today: no OS notification carries message text (Node.cs — the per-type
 * line, AND-15 #334 / NOTIF-2), so there is nothing to strip there (S20 S report). */
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace SPIXI
{
    public static class S20FormatRules
    {
        private static readonly char[] Marks = { '*', '_', '~' };
        private static readonly char[] Specials = { '*', '_', '~', '`' };
        private const string Fence = "```";

        /** JS /[\p{L}\p{N}]/u.test(ch) for one UTF-16 code unit. */
        public static bool isLetterOrDigit(char ch)
        {
            switch (CharUnicodeInfo.GetUnicodeCategory(ch))
            {
                case UnicodeCategory.UppercaseLetter:
                case UnicodeCategory.LowercaseLetter:
                case UnicodeCategory.TitlecaseLetter:
                case UnicodeCategory.ModifierLetter:
                case UnicodeCategory.OtherLetter:
                case UnicodeCategory.DecimalDigitNumber:
                case UnicodeCategory.LetterNumber:
                case UnicodeCategory.OtherNumber:
                    return true;
                default:
                    return false;
            }
        }

        /** JS /\s/.test(ch): TAB VT FF SP NBSP ZWNBSP + every Zs + LF CR LS PS. */
        public static bool isSpace(char ch)
        {
            if (ch == '\t' || ch == '\n' || ch == '\v' || ch == '\f' || ch == '\r' || ch == '\uFEFF' || ch == '\u2028' || ch == '\u2029')
            {
                return true;
            }
            return CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.SpaceSeparator;
        }

        private sealed class Ctx
        {
            public readonly string s;
            public readonly int n;
            public readonly int[] nl;                 // nl[i] = the first '\n' at or after i (n when none)
            public readonly List<int>[] closers;      // per mark (Marks order): the valid closer positions, ascending
            public readonly bool[] inUrl;             // step 0: positions inside a URL the chat would link (no mark there)

            public Ctx(string text)
            {
                s = text;
                n = text.Length;
                nl = new int[n + 1];
                nl[n] = n;
                for (int i = n - 1; i >= 0; i--)
                {
                    nl[i] = s[i] == '\n' ? i : nl[i + 1];
                }
                inUrl = new bool[n];
                if (n <= LinkRule.LinkifyMax && s.IndexOfAny(Marks) >= 0)
                {
                    foreach (LinkRule.Span sp in LinkRule.spans(s))
                    {
                        int e = sp.end;
                        while (e > sp.start && Array.IndexOf(Marks, s[e - 1]) >= 0) e--;   // a URL's trailing marks are marks
                        for (int k = sp.start; k < e; k++) inUrl[k] = true;
                    }
                }
                closers = new[] { new List<int>(), new List<int>(), new List<int>() };
                for (int j = 1; j < n; j++)
                {
                    int m = Array.IndexOf(Marks, s[j]);
                    if (m < 0 || inUrl[j] || isSpace(s[j - 1]) || (j + 1 < n && isLetterOrDigit(s[j + 1])))
                    {
                        continue;
                    }
                    closers[m].Add(j);
                }
            }
        }

        /** The plain text: matched marks and fences dropped, code kept as typed; null → "". */
        public static string Strip(string? text)
        {
            if (string.IsNullOrEmpty(text))
            {
                return "";
            }
            if (text.IndexOfAny(Specials) < 0)
            {
                return text;   // the common case: nothing to parse
            }
            Ctx ctx = new Ctx(text);
            string s = ctx.s;
            StringBuilder sb = new StringBuilder(s.Length);
            int segStart = 0;
            int p = 0;
            while (p <= s.Length - 3)
            {
                int f = s.IndexOf(Fence, p, StringComparison.Ordinal);
                if (f < 0)
                {
                    break;
                }
                if (f != 0 && s[f - 1] != '\n')
                {
                    p = f + 1;
                    continue;
                }
                int close = s.IndexOf(Fence, f + 3, StringComparison.Ordinal);
                if (close < 0)
                {
                    break;   // no later ``` at all → no later block can close either
                }
                string body = s.Substring(f + 3, close - f - 3);
                if (body.StartsWith("\n", StringComparison.Ordinal))
                {
                    body = body.Substring(1);
                }
                if (body.EndsWith("\n", StringComparison.Ordinal))
                {
                    body = body.Substring(0, body.Length - 1);
                }
                if (body.Length == 0)
                {
                    p = f + 1;
                    continue;
                }
                inline(ctx, segStart, f, sb);
                sb.Append(body);
                segStart = p = close + 3;
            }
            inline(ctx, segStart, s.Length, sb);
            return sb.ToString();
        }

        /* step 2: inline code in [a, b), emphasis in the runs between */
        private static void inline(Ctx ctx, int a, int b, StringBuilder sb)
        {
            string s = ctx.s;
            int runStart = a;
            int k = a < ctx.n ? s.IndexOf('`', a) : -1;
            while (k != -1 && k < b)
            {
                int m = k + 1 < ctx.n ? s.IndexOf('`', k + 1) : -1;
                if (m != -1 && m < b && m < ctx.nl[k] && m > k + 1)
                {
                    emph(ctx, runStart, k, sb);
                    sb.Append(s, k + 1, m - k - 1);
                    runStart = m + 1;
                    k = m + 1 < ctx.n ? s.IndexOf('`', m + 1) : -1;
                }
                else
                {
                    k = m;   // a literal backtick; the next candidate is the next backtick
                }
            }
            emph(ctx, runStart, b, sb);
        }

        /* the first index in the ascending list whose value is >= x */
        private static int lowerBound(List<int> list, int x)
        {
            int lo = 0, hi = list.Count;
            while (lo < hi)
            {
                int mid = (lo + hi) >> 1;
                if (list[mid] < x) lo = mid + 1; else hi = mid;
            }
            return lo;
        }

        /* step 3: emphasis in the run [a, b) — appends the stripped text */
        private static void emph(Ctx ctx, int a, int b, StringBuilder sb)
        {
            string s = ctx.s;
            int i = a, textStart = a;
            while (i < b)
            {
                int mark = Array.IndexOf(Marks, s[i]);
                if (mark >= 0 && !ctx.inUrl[i] && (i == a || !isLetterOrDigit(s[i - 1])) && i + 1 < b && !isSpace(s[i + 1]))
                {
                    List<int> list = ctx.closers[mark];
                    int k = lowerBound(list, i + 2);
                    int j = k < list.Count ? list[k] : -1;
                    int limit = Math.Min(b, ctx.nl[i + 1]);   // no newline inside, never past the run
                    if (j != -1 && j < limit)
                    {
                        sb.Append(s, textStart, i - textStart);
                        emph(ctx, i + 1, j, sb);
                        i = j + 1;
                        textStart = i;
                        continue;
                    }
                }
                i++;
            }
            sb.Append(s, textStart, b - textStart);
        }
    }
}
