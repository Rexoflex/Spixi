/* ★ S9 A3 (#1243 / #1245 / #1246 / #1247) — the pure halves of the S8 fix rows, the desktop rows and the language link
 * (scripts/csh executes them: S9FixTests.cs). The call sites are MAUI-bound (HomePage, SingleChatPage, SpixiContentPage,
 * SettingsPage, LaunchPage, DownloadsPage).
 *
 *   · 8-GRP-ADD  createdLine / writesCreatedLine — the OWNER's {7} "You created this group" line (the #1231 member line's twin)
 *   · 8-APP      appState — Declined > Minimized > Joined > (invite); a MISSING app shows Missing (Open again could not run it)
 *                marksJoin — which invite row a Join marks (an INCOMING invite row of that app)
 *   · 8-FACE     playedArg — the `played` push arg of a voice clip I RECEIVED ("1" / "0"; "" for every other row)
 *   · #1179 (a)  infoPaneFollowsChat — a desktop info pane BESIDE the chat follows a chat switch
 *   · #1173 (8)  downloadsDialog / dialogSize — the desktop Downloads dialog (≤ 600 × ≤ 640, centred over a scrim)
 *   · D-04       hapticKind — `ixian:haptic:<click|long|success>` (unknown = None)
 *   · #1246      translationReportMailto — the ONE mail link the language note may open, built by C# from a language code */
using System;
using System.Collections.Generic;

namespace SPIXI
{
    public static class S9FixRules
    {
        // —— 8-GRP-ADD ——
        public const string CreatedKey = "chat-group-you-created";
        public const string CreatedFallback = "You created this group";

        /** The owner writes the line only into the group it JUST created that holds no message yet (an unknown count, -1,
         *  writes nothing) — the same rule as the member's added line (GroupAvatarRule.writesAddedLine). */
        public static bool writesCreatedLine(bool groupCreated, int storedMessages, bool hasLastMessage)
        {
            return GroupAvatarRule.writesAddedLine(groupCreated, storedMessages, hasLastMessage);
        }

        /* ★ S10 P3 (#1254): the owner's line is TWO lines — "You created this group" + "\n" + "Members can see the group now."
         * (the chat shell renders the "\n" as a line break). Each half: the localized string, else its English fallback. */
        public const string MembersSeeKey = "chat-group-members-see";
        public const string MembersSeeFallback = "Members can see the group now.";

        /** The line's text: line1 + "\n" + line2, each the localized string, else the English fallback. Never a format. */
        public static string createdLine(string? localizedCreated, string? localizedSecond)
        {
            string a = string.IsNullOrWhiteSpace(localizedCreated) ? CreatedFallback : localizedCreated;
            string b = string.IsNullOrWhiteSpace(localizedSecond) ? MembersSeeFallback : localizedSecond;
            return a + "\n" + b;
        }

        // —— 8-APP ——
        public const string StateDeclined = "Declined";
        public const string StateMinimized = "Minimized";
        public const string StateJoined = "Joined";
        public const string StateMissing = "Missing";

        /** The app_state word of an invite row. Declined wins; a missing app reads Missing (there is nothing to open);
         *  a live page reads Minimized; a joined row reads Joined; else "" (the invite). */
        public static string appState(bool appMissing, bool pageLive, bool joined, bool declined)
        {
            if (declined)
            {
                return StateDeclined;
            }
            if (appMissing)
            {
                return StateMissing;
            }
            if (pageLive)
            {
                return StateMinimized;
            }
            return joined ? StateJoined : "";
        }

        /** Does a Join of `appId` mark this row joined? An INCOMING (not my own), non-blank appSession row of that app, not
         *  the call app (the call has its own card). The caller marks the NEWEST such row. */
        public static bool marksJoin(bool isAppSessionRow, bool localSender, string? rowAppId, string? appId)
        {
            return isAppSessionRow && !localSender && !string.IsNullOrEmpty(appId) && appId != AppInviteRules.VoipAppId
                && string.Equals(rowAppId, appId, StringComparison.Ordinal);
        }

        /** ★ #46 r1 (MINOR-2): a Join whose invite row is ALREADY joined is "Open again" — it reopens the app (the same
         *  session: MiniAppPage.sessionIdFor(appId)) and sends no second appRequestAccept and marks nothing. A Join with no
         *  incoming invite row, or an unjoined one (a newer invite), is a real Join. */
        public static bool joinIsReopen(bool rowFound, bool rowJoined)
        {
            return rowFound && rowJoined;
        }

        // —— 8-FACE ——
        /** `played` (addMe / addThem arg 18, updateMessage arg 13): for a voice clip I RECEIVED, "1" when this device
         *  stored it as played, else "0" — #1247: no stored flag = not played (clips from before the update show BLUE until
         *  played). "" for my own clips and every other row. */
        public static string playedArg(bool isVoice, bool localSender, bool stored)
        {
            if (!isVoice || localSender)
            {
                return "";
            }
            return stored ? "1" : "0";
        }

        // —— #1179 (a) ——
        /** On a chat switch, does the open info pane stay (and reload for the new peer in place)? Desktop, a wide window,
         *  and the pane is the one pinned BESIDE the conversation (column 2). Everything else closes as before. */
        public static bool infoPaneFollowsChat(bool desktop, bool wide, bool paneBesideChat)
        {
            return desktop && wide && paneBesideChat;
        }

        /** A conversation closed: does its info pane close with it (#247)? Yes — unless the pane is following a switch
         *  (`following`) to a chat that is OPEN now (`followChatOpen`): then the new pane's own swap closes the old one. */
        public static bool closesInfoPaneOnChatClose(bool following, bool followChatOpen)
        {
            return !(following && followChatOpen);
        }

        /* ★ #46 r1 (MAJOR-1): THE FOLLOW IS A SEQUENCE, and r0 cleared it one step too early. The real order (SpixiContentPage's
         * same-tag sweep): (1) chat B PRESENTS → the pane for B is staged; (2) the sweep CLOSES chat A → onOverlayClosed(A);
         * (3) pane B PRESENTS → its own "chatinfo" tag-replace closes pane A. r0 dropped the follow at (1), so (2) saw no
         * follow and closed pane A while pane B was still loading — the column collapsed, then pane B snapped in. The follow
         * now lives until (3) (or ends when a step cannot happen). One instance per HomePage, UI thread. Executed in csh. */
        public sealed class InfoPaneFollow
        {
            public string? target { get; private set; }
            public bool staged { get; private set; }
            public bool active { get { return target != null; } }

            /** onChat kept the pane for a switch to `addr`. */
            public void begin(string addr) { target = addr; staged = false; }

            /** A conversation presented: true ONCE, for the followed chat — stage its pane now. */
            public bool onChatPresented(string? addr)
            {
                if (target == null || staged || addr == null || addr != target) return false;
                staged = true;
                return true;
            }

            /** A conversation closed: does its info pane close with it (#247)? Not while following a switch to a chat that
             *  is OPEN now — pane B's own swap closes the old pane. */
            public bool closesPanesOnChatClose(bool followedChatOpen)
            {
                return closesInfoPaneOnChatClose(active, followedChatOpen);
            }

            /** An info pane presented: the follow is DONE when it is the followed peer's staged pane. */
            public bool onPanePresented(string? paneAddr)
            {
                if (target != null && staged && paneAddr == target) { end(); return true; }
                return false;
            }

            public void end() { target = null; staged = false; }
        }

        // —— #1173 (8) ——
        public const double DialogMaxWidth = 600;
        public const double DialogMaxHeight = 640;
        public const double DialogGutter = 24;     // per side
        public const double DialogMinWidth = 280;
        public const double DialogMinHeight = 240;

        /** Desktop opens Downloads as a dialog; phones keep the full screen. */
        public static bool downloadsDialog(bool desktop)
        {
            return desktop;
        }

        /** The dialog card inside a host of w × h: ≤ 600 × ≤ 640, a 24 px gutter per side, never below the minimum (the
         *  host clips then). A host size that is not known yet (≤ 0, NaN) gets the maximum. */
        public static void dialogSize(double hostW, double hostH, out double w, out double h)
        {
            w = fit(hostW, DialogMaxWidth, DialogMinWidth);
            h = fit(hostH, DialogMaxHeight, DialogMinHeight);
        }

        private static double fit(double host, double max, double min)
        {
            if (double.IsNaN(host) || double.IsInfinity(host) || host <= 0)
            {
                return max;
            }
            return Math.Max(min, Math.Min(max, host - 2 * DialogGutter));
        }

        // —— D-04 ——
        public enum Haptic { None, Click, LongPress }

        /** `ixian:haptic:<kind>` → the feedback; success = a click (Android / iOS have no success haptic in MAUI). Exact,
         *  case-sensitive words; anything else = None (ignored). */
        public static Haptic hapticKind(string? kind)
        {
            switch (kind)
            {
                case "click": return Haptic.Click;
                case "success": return Haptic.Click;
                case "long": return Haptic.LongPress;
                default: return Haptic.None;
            }
        }

        // —— #1246 the language note's report link ——
        public const string SupportMail = "support@spixi.io";

        /** The ONE link `ixian:reportTranslation:<code>` may open: mailto:support@spixi.io with the fixed subject
         *  "Spixi translation problem (<code>)", built HERE. The code must be one of the app's languages (`known`) and
         *  look like one (2–3 lowercase letters, '-', 2–3 lowercase letters); else null (refused). The WebView never
         *  supplies the URL, the address or the subject. */
        public static string? translationReportMailto(string? code, IEnumerable<string> known)
        {
            if (!isLangCodeShape(code))
            {
                return null;
            }
            bool found = false;
            foreach (string k in known)
            {
                if (string.Equals(k, code, StringComparison.Ordinal))
                {
                    found = true;
                    break;
                }
            }
            if (!found)
            {
                return null;
            }
            return "mailto:" + SupportMail + "?subject=" + Uri.EscapeDataString("Spixi translation problem (" + code + ")");
        }

        public static bool isLangCodeShape(string? code)
        {
            if (code == null || code.Length < 5 || code.Length > 7)
            {
                return false;
            }
            int dash = code.IndexOf('-');
            if (dash < 2 || dash > 3 || code.Length - dash - 1 < 2 || code.Length - dash - 1 > 3)
            {
                return false;
            }
            for (int i = 0; i < code.Length; i++)
            {
                char c = code[i];
                if (i == dash)
                {
                    continue;
                }
                if (c < 'a' || c > 'z')
                {
                    return false;
                }
            }
            return true;
        }
    }
}
