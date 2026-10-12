/* ★ S17 (#1338 What's new · #1339 the About / Contributors bar ink) — the PURE rules behind the S17 bridge, executed by
 * scripts/csh (S17Tests.cs). The MAUI glue (HomePage / SettingsPage push + verb, the flag, the system-bar repaint) only
 * calls these. Review packet: docs/be-review-pack/P26-whats-new.md.
 *
 *   · setWhatsNew {"version":"<digits>","show":true|false} — version = Config.version with its "spixi-" prefix taken off,
 *     digits and dots only (^[0-9.]{1,16}$), else NOTHING is pushed; show = the stored seen version differs. The FE owns
 *     the per-release table: a release with no table answers ixian:whatsnew:done at once (a silent bump, #1143).
 *   · ixian:whatsnew:done — EXACT (no argument): store seen = this version (SLocalOnlyStore "whatsnew.seen"; local only,
 *     never in a backup, cleared with the account). Damir 20:43: a fresh install (create OR restore) has no seen value, so
 *     it gets the card once — LaunchPage writes nothing.
 *   · ixian:topsurface:<plain|about|contrib> — EXACT tails; the colour behind the Android status bar while the settings
 *     WebView shows a full-bleed header (About / Contributors) under it, so the glyphs are chosen against the band, not
 *     the light page surface. Presentation only: a colour constant per tail and theme, nothing from the page reaches it.
 */
using System;
using System.Text.RegularExpressions;

namespace SPIXI
{
    public static class S17Rules
    {
        public const string SeenKey = "whatsnew.seen";
        public const string DoneVerb = "ixian:whatsnew:done";
        public const string TopSurfacePrefix = "ixian:topsurface:";

        private static readonly Regex Digits = new Regex("^[0-9.]{1,16}$", RegexOptions.CultureInvariant);

        /** "spixi-0.9.22" → "0.9.22"; anything that is not digits and dots (≤ 16) → "" (= push nothing). */
        public static string versionDigits(string? configVersion)
        {
            string v = (configVersion ?? "").Trim();
            if (v.StartsWith("spixi-", StringComparison.Ordinal)) v = v.Substring("spixi-".Length);
            return Digits.IsMatch(v) ? v : "";
        }

        /** Show once per version: a missing / empty / older / other seen value shows it. */
        public static bool shouldShow(string? seen, string version)
        {
            if (version.Length == 0) return false;
            return !string.Equals(seen ?? "", version, StringComparison.Ordinal);
        }

        /** The push body — built from the validated digits only (no escaping is needed: digits and dots). */
        public static string pushJson(string version, bool show)
        {
            if (!Digits.IsMatch(version)) return "";
            return "{\"version\":\"" + version + "\",\"show\":" + (show ? "true" : "false") + "}";
        }

        public static bool isDoneVerb(string? url)
        {
            return string.Equals(url, DoneVerb, StringComparison.Ordinal);
        }

        /** The top-surface tails: plain = 0 (the page surface), about = 1, contrib = 2; anything else = false. */
        public static bool parseTopSurface(string? url, out int kind)
        {
            kind = 0;
            if (url == null || !url.StartsWith(TopSurfacePrefix, StringComparison.Ordinal)) return false;
            switch (url.Substring(TopSurfacePrefix.Length))
            {
                case "plain": kind = 0; return true;
                case "about": kind = 1; return true;
                case "contrib": kind = 2; return true;
                default: return false;
            }
        }

        /** The band colour under the status bar (the headers' darker end — the white bar ink sits on it): null = the page
         *  surface (plain). Constants only. */
        public static string? topSurfaceColor(int kind, bool light)
        {
            switch (kind)
            {
                case 1: return light ? "#2a74e6" : "#173a7c";   // About: --ab-band-to (tokens.css)
                case 2: return light ? "#7a5cf0" : "#3b2a9c";   // Contributors: the heart band's middle (--dc-a → --dc-b)
                default: return null;
            }
        }

        public static string flagLine(bool on)
        {
            return "[FLAGS] s17bridge=" + (on ? "1" : "0");
        }
    }
}
