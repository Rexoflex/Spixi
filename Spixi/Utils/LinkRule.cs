using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace SPIXI
{
    /** ★★ #1106: the chat bubble's link rule in C# (pure — Spixi-UnitTests/LinkRuleTests.cs executes it). */
    public static class LinkRule
    {
        /* —— the link rule: a PORT of src/components/message-bubble.js URL_RE + linkifyPlain (pattern, flags, the
         * glued-token guard, the trailing-punctuation and unbalanced-paren trims, the 4096 cap). The mention split
         * that runs before linkify in the shell is not ported: a URL-shaped word INSIDE a multi-word @mention lists
         * as a link here (stated in #1106). The smoke pin compares BARE_TLDS and the three alternatives. —— */
        public const string BareTlds = "com|org|net|io|ai|app|dev|co|me|xyz|info|news|link|site|online|network|finance|exchange|market|money|cash|gg|tv|sh|so|to|us|uk|de|fr|es|it|nl|pl|cz|sk|ch|at|se|no|fi|dk|be|pt|gr|hr|rs|ba|si|hu|ro|bg|eu|ca|au|nz|jp|kr|in|br|mx|ar|za|tr|il|ae|sg|hk|tw|id|th|vn|ph|my";
        public const string UrlPattern =
            "https?:\\/\\/[^\\s<>\"']+" +
            "|www\\.[^\\s<>\"']+" +
            "|[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\\.(?:" + BareTlds + ")(?:\\/[^\\s<>\"']*)?";
        private static readonly Regex UrlRe = new Regex(UrlPattern, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant, TimeSpan.FromMilliseconds(200));
        private static readonly Regex GluedPrev = new Regex("[A-Za-z0-9_@.\\-\\/]", RegexOptions.CultureInvariant);   // JS \w is ASCII
        public const int LinkifyMax = 4096;

        /** The links in one text, in order, exactly as the chat bubble would linkify them (display form). */
        public static List<string> extract(string? text)
        {
            List<string> links = new List<string>();
            if (string.IsNullOrEmpty(text) || text.Length > LinkifyMax)
            {
                return links;
            }
            MatchCollection ms;
            try
            {
                ms = UrlRe.Matches(text);
                foreach (Match m in ms)
                {
                    if (m.Index > 0 && GluedPrev.IsMatch(text[m.Index - 1].ToString()))
                    {
                        continue;
                    }
                    string url = m.Value.TrimEnd('.', ',', '!', '?', ';', ':');
                    while (url.EndsWith(")") && url.Split('(').Length < url.Split(')').Length)
                    {
                        url = url.Substring(0, url.Length - 1);
                    }
                    if (url.Length > 0)
                    {
                        links.Add(url);
                    }
                }
            }
            catch (RegexMatchTimeoutException)
            {
                // the shell's own cap keeps real text far below this; a pathological text lists no links
            }
            return links;
        }

    }
}
