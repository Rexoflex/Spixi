using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using Spixi;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

namespace SPIXI
{
    public class Utils
    {
        /// <summary>
        /// ★★ #613 (Damir, 2026-08-27) — DOES THIS ROOM HIDE ITS PARTICIPANTS?
        ///
        /// One truth, and it is the LEGACY rule, restored. `hideParticipantAddresses` is a
        /// GROUP privacy mode: legacy qualifies every single mask it applies on
        /// `friend.type == FriendType.Group` (SingleChatPage at the fork point `0e85a4b8`),
        /// so a bot room could not be masked no matter what the flag on the wire said.
        ///
        /// The redesign lost that qualifier in two places — #348 (2026-08-15) passed the raw
        /// flag to the chat shell, and #248 (2026-07-10) read it unqualified in
        /// ContactDetails — and a bot room then inherited it. That is the regression behind
        /// "the Spixi bot group has hidden members": a PUBLIC channel rendering
        /// "Hidden member" and `[Unknown]` rows, with kick, ban and send-contact-request
        /// structurally dead because there was no address left to act on.
        ///
        /// ⚠ THE HANDOVER GATE'S QUESTION, asked and answered: does this introduce an
        /// exposure that is not at the baseline? No — the opposite. The baseline shows a bot
        /// room's addresses; our build hid them. Returning to legacy parity removes a
        /// divergence we introduced. A bot server that genuinely wants private participants
        /// is a NEW capability and needs its own decision, not a silent inheritance.
        ///
        /// ⚠ NOT applied to the money path. `SingleChatPage`'s tip refusal still reads the
        /// raw flag, deliberately: a blind group pays a DERIVED address, and whether a
        /// flagged bot room's roster addresses are real or derived is not answerable from
        /// this tree. Identity display is restored; spending waits for an answer (#215).
        ///
        /// ★★ #46 loop (2026-08-29) — THIS PREDICATE NOW FAILS CLOSED, AND IT DID NOT.
        /// The first cut returned FALSE when `metaData` or `botInfo` was missing, so a
        /// group whose room info had not arrived rendered its roster UNMASKED. Legacy
        /// dereferenced the same chain and THREW, so nothing rendered at all — the failure
        /// direction of a privacy control was reversed by accident, in the one change of
        /// the batch that removes a mask.
        ///
        /// ⚠ It was not fixed blind. #215 says the money path waits for a device answer,
        /// and the same caution applied here: masking on UNKNOWN would show `[Unknown]`
        /// rows in a normal private group if that window were real and common — which is
        /// the regression #613 had just fixed. Damir checked it on Android, 2026-08-29,
        /// cold start into a private group as the first action: *"private group is quite
        /// smooth, member list shows correct straight away."* The window is not observable
        /// in practice, so masking on unknown costs nothing and closes the direction.
        ///
        /// UNKNOWN now means MASK, for a GROUP only. That is stricter than legacy rather
        /// than looser, so it cannot introduce an exposure. A bot or a 1:1 is unchanged.
        /// </summary>
        /* ★ Session I (Damir's premium walk, measured): THE DEVICE'S 12/24-HOUR SETTING.
         * The shells formatted every time from the document LOCALE alone, so a phone set to
         * 24-hour with the app in en-us printed "04:42 PM" beside Telegram's "16:42". The
         * three apps' time digits measure the same height (21 px on the Motorola); the " PM"
         * is the width that read as "bigger". Registered as the `hourCycle` custom string at
         * HomePage boot; the shells copy it onto <html data-hour-cycle> and Intl takes it as
         * `hourCycle`. Answers: "h23" (24-hour) · "h12" · "" (unknown → the locale's default,
         * byte-identical to before). Fail-soft: any exception answers "". */
        public static string deviceHourCycle()
        {
            try
            {
#if ANDROID
                return Android.Text.Format.DateFormat.Is24HourFormat(Android.App.Application.Context) ? "h23" : "h12";
#elif IOS || MACCATALYST
                string fmt = Foundation.NSDateFormatter.GetDateFormatFromTemplate("j", (nuint)0, Foundation.NSLocale.CurrentLocale) ?? "";
                return fmt.Contains("a") ? "h12" : "h23";
#else
                string pattern = System.Globalization.CultureInfo.CurrentCulture.DateTimeFormat.ShortTimePattern ?? "";
                return pattern.Contains("h") ? "h12" : (pattern.Contains("H") ? "h23" : "");
#endif
            }
            catch (Exception)
            {
                return "";
            }
        }

        public static bool hidesParticipants(Friend? friend)
        {
            if (friend == null) { return false; }
            if (friend.type != FriendType.Group) { return false; }
            // fail CLOSED: a group whose room info has not arrived is treated as blind
            if (friend.metaData == null || friend.metaData.botInfo == null) { return true; }
            return friend.metaData.botInfo.hideParticipantAddresses;
        }

        public static DateTime unixTimeStampToDateTime(double unixTimeStamp)
        {
            // Unix timestamp is seconds past epoch
            DateTime dtDateTime = new(1970, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc);
            dtDateTime = dtDateTime.AddSeconds(unixTimeStamp).ToLocalTime();
            return dtDateTime;
        }

        public static string unixTimeStampToString(double unixTimeStamp)
        {
            DateTime datetime = unixTimeStampToDateTime(unixTimeStamp);
            return datetime.ToString("MM/dd/yyyy HH:mm:ss");
        }

        public static string unixTimeStampToHumanFormatString(double unixTimeStamp)
        {
            DateTime datetime = unixTimeStampToDateTime(unixTimeStamp);
            return datetime.ToString("dd MMM, yyyy, h:mm tt");
        }

        public static string escapeHtmlParameter(string str)
        {
            return Convert.ToBase64String(Encoding.UTF8.GetBytes(str));
        }

        public static string escapeHtmlParameter(byte[] str)
        {
            return Convert.ToBase64String(str);
        }

        // X1: convert a local avatar / app-icon FILE PATH into a data:image/...;base64 URI so
        // every platform's WebView renders it uniformly. iOS/WKWebView blocks a raw file:// path
        // from the Raw-assets html origin (the avatar dir differs from the html dir), so a pushed
        // PATH shows nothing there; a data-URI is origin-independent and works everywhere.
        // Passes through UNCHANGED anything that is NOT a readable local file — null/empty,
        // WebView-relative sentinels ("img/..."), http(s) URLs, or a missing path — which the
        // redesigned shells already degrade to the deterministic gradient / rocket. Cached by
        // (path, last-write-time) so repeated pushes (chat list, group rosters) don't re-read+encode.
        private static readonly ConcurrentDictionary<string, (DateTime mtime, string uri)> imageUriCache = new();

        public static string imageToDataUri(string path)
        {
            if (string.IsNullOrEmpty(path)) return path;
            if (path.StartsWith("http", StringComparison.OrdinalIgnoreCase)) return path;   // remote URL — leave as-is
            // The three "img/…" SENTINELS (spixiavatar.png · spixi-group-avatar.png ·
            // app-noicon.jpg) are pure MARKERS now — Session N deleted the placeholder files
            // behind them and every shell maps them to its gradient/rocket fallback without a
            // request. (img/flags/*.png are real shipped files the language picker loads,
            // but they never arrive here: this helper only sees avatar/app-icon paths.)
            // A marker must pass through untouched, never be read as a file.
            if (path.StartsWith("img/", StringComparison.OrdinalIgnoreCase)) return path;   // WebView asset sentinel

            try
            {
                if (!File.Exists(path)) return path;                       // not a local file → shell degrades to gradient
                DateTime mtime = File.GetLastWriteTimeUtc(path);
                if (imageUriCache.TryGetValue(path, out var cached) && cached.mtime == mtime)
                {
                    return cached.uri;
                }
                string mime = path.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) || path.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase) ? "image/jpeg"
                    : path.EndsWith(".gif", StringComparison.OrdinalIgnoreCase) ? "image/gif"
                    : "image/png";
                string uri = "data:" + mime + ";base64," + Convert.ToBase64String(File.ReadAllBytes(path));
                imageUriCache[path] = (mtime, uri);
                return uri;
            }
            catch
            {
                return path;   // IO/permission failure → fall back to the raw path (shell gradient-fallbacks)
            }
        }

        public static string amountToHumanFormatString(IxiNumber amount)
        {
            string amount_string = amount.ToString();
            if (amount > 1)
                return amount_string[..^6];
            return amount_string;
        }

        // ★ I-6 (#360): locale-aware DISPLAY formatting for amounts inside
        // C#-COMPOSED sentences (alert / tip-sheet bodies): the integer part
        // grouped and the decimal mark chosen by the APP LANGUAGE
        // (SpixiLocalization), so alerts agree with every FE surface. Damir's
        // repro: "333333333.03000000" in the balance alert was unreadable.
        // ★ Loop r1 MAJOR-3: alerts keep FULL precision (trailing zeros
        // trimmed) — NO 2-dp cap. These sentences exist to expose a SHORTFALL,
        // and the shortfall is usually the fee (0.005 IXI): a 2-dp cap renders
        // "cost is 10, balance is 10" — the exact bug the r4 note above the
        // tip site documents. The ≤2-dp law (#76/#77) is for display
        // SUMMARIES; an alert is an exactness surface, like the review sheet.
        // String-only — an IxiNumber never passes through a float — and DISPLAY
        // only: bridge pushes and payloads keep the canonical format (#77).
        public static string amountToLocalizedDisplayString(IxiNumber amount)
        {
            string s = amount.ToString();
            bool neg = s.StartsWith("-");
            if (neg) s = s.Substring(1);
            string int_part = s;
            string frac_full = "";
            int dot = s.IndexOf('.');
            if (dot >= 0)
            {
                int_part = s.Substring(0, dot);
                frac_full = s.Substring(dot + 1);
            }
            string frac = frac_full.TrimEnd('0');
            string group_sep = ",", dec_sep = ".";
            // ★ r2 MAJOR-2: resolve the culture ONLY for languages the SHELL also
            // localizes (build-strings-iife: a language with no FE dictionary keeps
            // <html lang="en">, so the whole shell groups en-style). Without this
            // gate an it/id/lt user got en-convention amounts on every FE surface
            // and native-convention amounts in the alerts — the exact mixed
            // convention I-6 exists to prevent, introduced BY the batch. When a
            // dictionary ships for one of these, add it here AND there.
            // N4 (#379): it/id/lt/cn/ja dictionaries shipped — the five move in
            // TOGETHER with build-strings-iife LOCALES (the "here AND there" rule).
            // cn-cn is a file code, not a culture tag → resolve as zh-cn (the same
            // mapping setDocLang applies for <html lang>); ja-jp/cn-cn separators
            // equal the en defaults anyway, so the catch arm stays correct.
            string lang = SPIXI.Lang.SpixiLocalization.getCurrentLanguage();
            switch (lang)
            {
                case "de-de": case "es-co": case "fr-fr": case "pt-br":
                case "ru-ru": case "sl-si": case "sr-sp": case "en-us":
                case "it-it": case "id-id": case "lt-lt": case "cn-cn": case "ja-jp":
                    try
                    {
                        var ci = System.Globalization.CultureInfo.GetCultureInfo(lang == "cn-cn" ? "zh-cn" : lang);
                        group_sep = ci.NumberFormat.NumberGroupSeparator;
                        dec_sep = ci.NumberFormat.NumberDecimalSeparator;
                    }
                    catch (Exception)
                    {
                        // unresolvable tag ("sr-sp" on some runtimes) → keep en defaults
                    }
                    break;
                default:
                    // no FE dictionary → the shell renders en — match it
                    break;
            }
            if (int_part.Length > 3)
            {
                var sb = new StringBuilder();
                int lead = int_part.Length % 3;
                if (lead > 0) sb.Append(int_part, 0, lead);
                for (int i = lead; i < int_part.Length; i += 3)
                {
                    if (sb.Length > 0) sb.Append(group_sep);
                    sb.Append(int_part, i, 3);
                }
                int_part = sb.ToString();
            }
            return (neg ? "-" : "") + int_part + (frac != "" ? dec_sep + frac : "");
        }

        public static string bytesToHumanFormatString(long bytes)
        {
            if (bytes < 1024)
                return $"{bytes} B";
            if (bytes < 1024 * 1024)
                return $"{(bytes / 1024.0):0.##} kB";
            return $"{(bytes / 1024.0 / 1024.0):0.##} MB";
        }

        // PERF (Damir F5 2026-08-13, apps tab "always reloads some images"): imageToDataUri
        // already produces a base64 payload ("data:image/png;base64,…"), and escapeHtmlParameter
        // base64-encoded it a SECOND time for transport — a 240 KB app icon / avatar became
        // 320 KB on EVERY push, and the shell paid a full atob to get back to the string C#
        // started from. A data: URI is transport-safe on its own (RFC 2397 alphabet, no quote /
        // backslash / newline), so sendUiCommand emits it verbatim and the shell dispatcher
        // passes it straight through (src/bridge/native.js — ':' can never occur in base64, so
        // "data:" is an unambiguous marker). escapeHtmlParameter itself is UNCHANGED: every
        // other argument, and every other caller, keeps the base64 contract exactly as before.
        //
        // The whitelist below is the SAFETY GATE, not a convenience: the value is dropped into
        // a single-quoted JS literal, so anything that could break out of it (quote, backslash,
        // CR/LF, U+2028/9, backtick, ${) must fall back to the encoded path. Note imageToDataUri
        // passes a RAW PATH through untouched when the file can't be read, and any string
        // argument (a chat message, a nickname) can legitimately begin with "data:" — every one
        // of those either fails the whitelist and gets encoded, or is character-for-character
        // round-trip identical, which is all the contract requires.
        //
        // #340 audit (A-MAJOR-1/2) — THE WHITELIST IS NOT ENOUGH ON ITS OWN. The passthrough
        // is only correct where the RECEIVER was taught it, and "round-trip identical" above
        // silently assumed every receiver runs src/bridge/native.js. One still does not
        // (a second class — the legacy Raw/html pages decoding with js/spixi.js's unguarded
        // atob, where a peer-chosen nickname of "data:;base64,x" THREW on the ':' and
        // dropped the whole push — is gone: Session N deleted the last four of them):
        //   · MiniAppPage points its WebView at the app's own entry point; its SDK decoder
        //     ships inside third-party app packages and can never be re-generated. The
        //     documented contract there is base64-per-argument, frozen.
        // So the fast path is now gated on the TARGET PAGE (contentPage.supportsRawDataUriArgs,
        // which fails CLOSED), not on the shape of the value. The whitelist stays as the
        // second gate: receiver-allowed AND value-safe.
        private static bool isTransportSafeDataUri(string arg)
        {
            if (!arg.StartsWith("data:", StringComparison.Ordinal)
                || arg.IndexOf(";base64,", StringComparison.Ordinal) < 0)
            {
                return false;
            }
            for (int i = 5; i < arg.Length; i++)
            {
                char c = arg[i];
                if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9'))
                {
                    continue;
                }
                if (c != '+' && c != '/' && c != '=' && c != ';' && c != ',' && c != '.' && c != '-')
                {
                    return false;
                }
            }
            return true;
        }

        public static void sendUiCommand(SpixiContentPage contentPage, string command, params string[] arguments)
        {
            try
            {
                string cmd_str = "executeUiCommand(" + command;
                StringBuilder sb = new StringBuilder(cmd_str);

                // #340: receiver gate FIRST — see isTransportSafeDataUri's header. Mini-app
                // WebViews (never loadPage'd) keep the base64 contract unconditionally.
                bool raw_data_uri_ok = contentPage != null && contentPage.supportsRawDataUriArgs;

                foreach (string arg in arguments)
                {
                    if (arg != null)
                    {
                        sb.Append(",");
                        sb.Append("'" + ((raw_data_uri_ok && isTransportSafeDataUri(arg)) ? arg : escapeHtmlParameter(arg)) + "'");
                    }
                    else
                    {
                        sb.Append(",null");
                    }
                }

                sb.Append(");");
                cmd_str = sb.ToString();
                contentPage.sendMessage(cmd_str);

            }
            catch (Exception e)
            {
                Logging.error("Exception occured in sendUiCommand " + e);
            }
        }

        public static SingleChatPage? getChatPage(Friend friend)
        {
            
            foreach (var item in App.Current.MainPage.Navigation.NavigationStack)
            {
                if (item is SingleChatPage)
                {
                    if (((SingleChatPage)item).friend == friend)
                    {
                        return (SingleChatPage)item;
                    }
                }
            }

            var homeDetail = HomePage.InstanceOrNull();   // AND-1 (#329): read-only lookup
            if (homeDetail != null
                && homeDetail.getDetailContent() != null)
            {
                var item = homeDetail.getDetailContent();
                if (item is SingleChatPage)
                {
                    if (((SingleChatPage)item).friend == friend)
                    {
                        return (SingleChatPage)item;
                    }
                }
            }

            // #225: an OPEN conversation overlay is a live surface outside the
            // NavigationStack — message routing must find it.
            foreach (var overlay in SpixiContentPage.getOverlayPages())
            {
                if (overlay is SingleChatPage overlayChat && overlayChat.friend == friend)
                {
                    return overlayChat;
                }
            }

            // A conversation staging off-screen (load-then-move, DECISIONS #222) is not in
            // the NavigationStack yet, but its WebView is live and accepts UI pushes —
            // route messages to it so nothing arriving during the stage window is dropped.
            if (SpixiContentPage.getStagingPage() is SingleChatPage stagingChat
                && stagingChat.friend == friend)
            {
                return stagingChat;
            }

            return null;
        }

        public static List<SingleChatPage> getChatPages()
        {
            List<SingleChatPage> chatPages = new();
            foreach (var item in App.Current.MainPage.Navigation.NavigationStack)
            {
                if (item is SingleChatPage)
                {
                    chatPages.Add((SingleChatPage)item);
                }
            }
            // Desktop split-pane: the open conversation lives as HomePage DETAIL CONTENT,
            // outside the NavigationStack — getChatPage() covers that surface but this
            // enumerator didn't, so page-wide sweeps (onLowMemory eviction exclusion,
            // reloadScreen-all, delete-all history) missed the most-visible desktop chat.
            var homeLive = HomePage.InstanceOrNull();     // AND-1 (#329): read-only sweep
            if (homeLive != null
                && homeLive.getDetailContent() is SingleChatPage detailChat
                && !chatPages.Contains(detailChat))
            {
                chatPages.Add(detailChat);
            }
            foreach (var overlay in SpixiContentPage.getOverlayPages())   // #225
            {
                if (overlay is SingleChatPage overlayChat && !chatPages.Contains(overlayChat))
                {
                    chatPages.Add(overlayChat);
                }
            }
            if (SpixiContentPage.getStagingPage() is SingleChatPage stagingChat
                && !chatPages.Contains(stagingChat))
            {
                chatPages.Add(stagingChat);
            }
            return chatPages;
        }

        public static bool IsAllowedURL(string url)
        {
            if (url.StartsWith("http", StringComparison.OrdinalIgnoreCase)
                || url.StartsWith("https", StringComparison.OrdinalIgnoreCase))
            {
                string rx_pattern = @"^https://[A-Za-z0-9]+\.(tenor|giphy)\.com/[A-Za-z0-9_/=%\?\-\.\&]+$";

                if (Regex.IsMatch(url, rx_pattern)
                    || url.StartsWith("https://apps.spixi.io/", StringComparison.OrdinalIgnoreCase))
                {
                    // Allow tenor and giphy URLs
                    return true;
                }

                return false;
            }

            return true;
        }
    }
}
