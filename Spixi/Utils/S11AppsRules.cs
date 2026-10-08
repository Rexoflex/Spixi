/* ★ S11 F (#1262) — the pure half of the Apps tab pre-push (scripts/csh executes it: S11AppsTests.cs).
 * The call site is MAUI-bound (HomePage.scheduleAppsPrePush, next to the S10 F6 wallet one).
 *
 * Damir: "I have a feeling it loads when I open mini apps." It did: nothing pushed the installed list at boot
 * (UIHelpers.shouldRefreshApps starts false, so the tick's loadApps(false) returns), and the FIRST tab3 entry of every
 * document ran loadApps(true) ON THE UI THREAD — per app a file check, a file read + base64 of icon.png on a cache miss
 * (Utils.imageToDataUri), one EvaluateJavaScript per row carrying that data URI, then reloadScreen() on every chat page.
 * The pre-push does the same forced push earlier, on the pool, while the user is still on another tab.
 *
 *   · AppsPrePushDelayMs — after bootDropped AND onload (S10FixRules.PrePushGate, a second instance), LATER than the
 *     wallet's S10FixRules.PrePushDelayMs so the two bursts never share the WebView's script queue
 *   · appsPrePush        — only a never-fed document, only while Apps is not the current tab (its entry pushes then)
 *   · reloadChatPages    — the pre-push of an unchanged list does not reload the chat pages (loadMessages)
 *   · prePushLine / firstVisitLine — the TEMPORARY [P1] bodies (fixed words + integers: the P1Perf grammar;
 *     ★ S11 A2 (#1263, R1-n1): every integer formatted with the INVARIANT culture — a culture's own minus sign or digits
 *     must never reach a log line the probes parse)
 *   · appsLatchAfterBurst — ★ S11 A2 (#1263, R1-m2): the latch a finished burst may set (the wallet's A-N5 rule) */
using System;
using System.Globalization;

namespace SPIXI
{
    public static class S11AppsRules
    {
        /** ms after the second of ixian:bootDropped / ixian:onload. > S10FixRules.PrePushDelayMs (1200): the wallet burst first. */
        public const int AppsPrePushDelayMs = 2000;

        /** Pre-push the installed apps? Once per document (the caller latches), only while the document was never fed and
         *  the Apps tab (tab3) is not the current tab. */
        public static bool appsPrePush(bool fed, string? currentTab)
        {
            return !fed && !string.Equals(currentTab, "tab3", StringComparison.Ordinal);
        }

        /** Reload every chat page after an apps push? Yes, unless this push is the pre-push of an UNCHANGED list (a fresh
         *  home document's first feed: the chat pages hold nothing stale, and their reload re-flushes the messages of a chat
         *  the user may be reading). A changed list (shouldRefreshApps was raised) always reloads them. */
        public static bool reloadChatPages(bool listChanged, bool prePush)
        {
            return listChanged || !prePush;
        }

        /** ★ S11 A2 (#1263, R1-m2): appsPushedToShell after a loadApps burst — true only if the document could receive the
         *  rows (pageLoaded, the #340 rule) AND it is still the document the burst was for: the generation read BEFORE
         *  clearApps equals the one now. A reload during the burst resets the latch and bumps the generation; without this
         *  the OLD burst finishing afterwards re-latched it, and the fresh document was never fed (OpenPerfRules
         *  walletLatchAfterBurst is the wallet twin). */
        public static bool appsLatchAfterBurst(bool pageLoaded, int genAtBurst, int genNow)
        {
            return pageLoaded && genAtBurst == genNow;
        }

        private static string inv(long v) => v.ToString(CultureInfo.InvariantCulture);

        /** [P1] `apps prepush n=<apps> ms=<push ms>` — TEMPORARY, retire with the [P1] set. */
        public static string prePushLine(int apps, long ms)
        {
            return "apps prepush n=" + inv(Math.Max(0, apps)) + " ms=" + inv(Math.Max(0, ms));
        }

        /** [P1] `apps tab first prepushed=<0|1> n=<apps> ms=<since bootDropped, -1 = none> entry=<tab entry ms>` — the FIRST
         *  tab3 entry of a document. entry = what the entry itself cost on the UI thread (≈0 when pre-pushed). TEMPORARY. */
        public static string firstVisitLine(bool prepushed, int apps, long msSinceDrop, long entryMs)
        {
            return "apps tab first prepushed=" + (prepushed ? "1" : "0") + " n=" + inv(Math.Max(0, apps))
                + " ms=" + inv(msSinceDrop < 0 ? -1 : msSinceDrop) + " entry=" + inv(Math.Max(0, entryMs));
        }
    }
}
