/* ★ fixb4 (Fix batch 4, items 3 + 4; Damir's ruling 1750; #1478: one switch per default, the old path is the fallback; contract
 * docs/contract-fixb4.md § 3) — the small rules behind two switches of SpixiFlags:
 *   DefaultMediaTapToLoad — a NEW account (create / restore) starts with P1 "Load pictures and GIFs" Off: the launch shell
 *                           writes `spixi.media.autoload = 'off'` (the value the Privacy screen writes for Off);
 *   DefaultListCompact    — a NEW account on the DESKTOP (Windows, Mac) starts with A9 "List density" Compact: the launch shell
 *                           writes `spixi.chat.listdensity = 'compact'`. The phone has no density control: nothing is written there.
 * Both keys live in the ONE WebView store every shell shares, so C# cannot write them itself: it sends ONE push,
 * setNewAccountDefaults("1"|"0", "1"|"0"), to the launch shell, only from the three new-account sites of LaunchPage (the create
 * body after DefaultsRules.writeNewAccount, and both restore paths after applyRestorePrefs). An EXISTING account keeps its
 * behaviour, also when it never stored a choice: no reader changes, no start / update / migration path sends the push.
 * Fixed values only: the two arguments are "1" or "0" made HERE from two switches and one platform test — no value from a
 * WebView, no name, no path, no password. Both effective values 0 = null = no push at all (the old path, byte-equal).
 * ★ review round 1: when the push turns P1 Off, the caller also writes C#'s own mirror of P1 Off (mirrorLoadPicturesOff).
 * Pure: no MAUI type, no Core type (the caller logs the line); the harness runs this file (scripts/csh/PageDefaultsTests.cs).
 * Log text: fixed words and digits only. */
namespace SPIXI
{
    public static class PageDefaultsRules
    {
        /** The launch shell's handler (src/shells/launch.html, the pushes object). The ONE new push of fixb4; no new `ixian:` verb. */
        public const string PushName = "setNewAccountDefaults";

        /** The two arguments of the push: { media, density }, each exactly "1" or "0". media = "1" when `mediaTap`; density = "1"
         *  when `listCompact` AND `desktop`. Null when both would be "0": nothing to write, the caller sends nothing. */
        public static string[]? newAccountArgs(bool mediaTap, bool listCompact, bool desktop)
        {
            bool compact = listCompact && desktop;
            if (!mediaTap && !compact)
            {
                return null;
            }
            return new string[] { mediaTap ? "1" : "0", compact ? "1" : "0" };
        }

        /** The one line at a write site: `[DEFAULTS] new account page: mediatap=<0|1> compact=<0|1>` — the arguments that were
         *  sent; 0 / 0 when nothing was sent (null, or anything that is not the two-argument shape). */
        public static string logLine(string[]? args)
        {
            bool shaped = args != null && args.Length == 2;
            string media = shaped && args![0] == "1" ? "1" : "0";
            string density = shaped && args![1] == "1" ? "1" : "0";
            return "[DEFAULTS] new account page: mediatap=" + media + " compact=" + density;
        }

        /** ★ fixb4 review round 1 (reader S MINOR-1): C# keeps its OWN mirror of "Load pictures and GIFs"
         *  (SAutoDownload.loadPictures, pref `photoAutoDlLoadPictures`, absent = On), read by the photo auto-download decision
         *  (S11ChatRules.shouldAutoDownload) and the offer preview. The WebView key alone would leave the mirror On. True ONLY when
         *  the push turns P1 Off (the two-argument shape, media "1"): the caller then writes the mirror Off — the fixed value
         *  `false`, no WebView input. Null, a wrong shape or media "0" (the switch off = the old path) = false = nothing written. */
        public static bool mirrorLoadPicturesOff(string[]? args)
        {
            return args != null && args.Length == 2 && args[0] == "1";
        }

        /** The one start line of this batch (SpixiFlags.readFixb4, all builds): fixed words and 0|1 only. */
        public static string flagsLine(bool mediaTap, bool listCompact)
        {
            return "[FLAGS] fixb4 mediatap=" + (mediaTap ? "1" : "0") + " listcompact=" + (listCompact ? "1" : "0");
        }
    }
}
