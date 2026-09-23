using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using Microsoft.Maui.ApplicationModel;   // the ONE external-open sink lives in this file (openExternal)
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
            // request. (the img/flags/<code>.png files are real shipped files the language picker loads,
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

            /* ★ Session AD: the `HomePage.getDetailContent()` branch that used to sit here was
             * DEAD — `HomePage.detailContent` is only ever assigned null (the #288 finding, the
             * #284 branch). The open desktop conversation is an OVERLAY (#225) and is found by
             * the overlay walk below. Deleted here and in getChatPages() so a reader cannot
             * take the branch for coverage it never gave. */
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

        /* ★ Session P (prewarm-chat-spec §3, last row): a SingleChatPage with NO friend is
         * the blank pre-warm spare. It is in none of the collections below by construction,
         * and this filter is the BELT: every consumer of this list dereferences
         * `p.friend` (Node.onLowMemory's exclude list, the language reload sweep, the
         * delete-all re-render), so a spare that reached one anyway would NRE the whole
         * sweep. The spare is dropped on flips instead (SpixiContentPage.dropSpareChat). */
        public static List<SingleChatPage> getChatPages()
        {
            List<SingleChatPage> chatPages = new();
            foreach (var item in App.Current.MainPage.Navigation.NavigationStack)
            {
                if (item is SingleChatPage stackChat && stackChat.friend != null)
                {
                    chatPages.Add(stackChat);
                }
            }
            // (the #284 "detail content" branch that lived here was dead code — see getChatPage)
            foreach (var overlay in SpixiContentPage.getOverlayPages())   // #225
            {
                if (overlay is SingleChatPage overlayChat && overlayChat.friend != null && !chatPages.Contains(overlayChat))
                {
                    chatPages.Add(overlayChat);
                }
            }
            if (SpixiContentPage.getStagingPage() is SingleChatPage stagingChat
                && stagingChat.friend != null
                && !chatPages.Contains(stagingChat))
            {
                chatPages.Add(stagingChat);
            }
            return chatPages;
        }

        /* ★ m8 AND item 6 (#46 loop, ROUND 2) · handover sweep O-25 — ONE SANITISER FOR
         * EVERY WIRE-DERIVED VALUE THAT REACHES THE LOG.
         *
         * `Logging.log` writes the message verbatim and adds the line prefix itself. Nothing
         * escapes it. So any value that came off the wire can carry a newline and write forged
         * LINES into `ixian.log` — the address inside an `IXICore.Address` exception message,
         * the OneSignal notification id, the message of a failed JSON read. That file is
         * shareable from DevPage and `maxLogCount` is 5, so it is the artifact this project
         * uses as evidence.
         *
         * ★ O-25 MOVED IT HERE, AND THE MOVE IS THE POINT. It was `internal static` inside
         * `Platforms/Android/SPushService.cs`, so it compiled into the Android build only and
         * no shared-code site could call it. Every shared site that logs a wire-derived value
         * had no sanitiser available, even where the author wanted one. `Spixi/Utils/Utils.cs`
         * compiles on every platform, so the rule is now available everywhere it is needed.
         *
         * ★ O-24 / O-26 STRENGTHENED IT, BECAUSE THE OLD RULE WAS TOO WEAK FOR ITS CALLERS.
         * Flattening and a 160-character clamp close LINE FORGERY. They do not remove a wallet
         * address: an Ixian address is about 45 base58 characters (Utils/SPayments.cs states
         * the same figure), so an address fits inside the clamp intact. The push-path catches
         * this now guards wrap code that handles the sender address `fa`, and
         * `SNotificationPrefs.isContactMuted` reads a `Preferences` key that EMBEDS the peer
         * address. The sanitiser therefore also redacts address-shaped tokens.
         *
         * The detection rule is the tree's own, and it is deliberately blunt: a run of
         * LOG_SAFE_TOKEN_MIN or more ASCII letters and digits with no separator inside it.
         * `SNotificationPrefs.truncateMiddle` already treats "longer than 24 and no space" as
         * address-shaped. No ordinary word in an exception message is that long. A type name
         * carries dots, a GUID carries dashes and a path carries separators, so none of them
         * is redacted. FAIL CLOSED: a run is redacted for its SHAPE, so a token this code
         * cannot identify is removed and not admitted. The length is kept, so the line still
         * says that something was there.
         *
         * ⚠ SCOPE, STATED HONESTLY. This closes CR and LF. It does not close U+2028 or
         * U+2029, because the log writer is a .NET StreamWriter and does not treat them as
         * line breaks. It does not make the value safe for a viewer that does. And it is not a
         * privacy classifier: it removes long opaque tokens, not a nickname or a file name. */
        private const int LOG_SAFE_MAX = 160;
        private const int LOG_SAFE_TOKEN_MIN = 26;

        public static string logSafe(string? value)
        {
            return logSafe(value, LOG_SAFE_MAX);
        }

        /// <summary>The same rule with a caller-chosen clamp. `max` of 0 or less means no
        /// clamp; the flattening and the redaction always run.</summary>
        public static string logSafe(string? value, int max)
        {
            string safe = (value ?? string.Empty).Replace('\r', ' ').Replace('\n', ' ');
            safe = redactLongTokens(safe);
            if (max > 0 && safe.Length > max)
            {
                safe = safe.Substring(0, max);
            }
            return safe;
        }

        // The redaction itself. Hand-written rather than a Regex, because this runs on a log
        // path that a hostile push can drive: a linear scan cannot backtrack.
        private static string redactLongTokens(string value)
        {
            StringBuilder sb = new StringBuilder(value.Length);
            int start = 0;                       // where the current letters-and-digits run began
            for (int i = 0; i <= value.Length; i++)
            {
                if (i < value.Length && isLogTokenChar(value[i]))
                {
                    continue;                    // still inside the run
                }
                int run = i - start;
                if (run >= LOG_SAFE_TOKEN_MIN)
                {
                    sb.Append("<redacted:").Append(run).Append('>');
                }
                else if (run > 0)
                {
                    sb.Append(value, start, run);
                }
                if (i < value.Length)
                {
                    sb.Append(value[i]);
                }
                start = i + 1;
            }
            return sb.ToString();
        }

        // ASCII only, on purpose: base58, base64 and hex are ASCII, and a non-ASCII word is
        // not address-shaped.
        private static bool isLogTokenChar(char c)
        {
            return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9');
        }

        /* ★ handover sweep O-14 — THE TAIL OF A SCANNED QR PAYLOAD, BOUNDED.
         *
         * A scanned QR is decoded by the WebView and handed back to C#, which validates only
         * the part BEFORE the first ':' with `ExtendedAddress.Validate` and then pushes the
         * WHOLE string to the wallet document as `quickScanResult`. The shell parses it into
         * the send compose, so the tail pre-fills an AMOUNT. The grammar the shell accepts is
         * small and closed: `addr` · `addr:ixi` · `addr:send:<amount>`.
         *
         * This method bounds what is FORWARDED. It changes nothing that is parsed, signed or
         * broadcast: the native confirm still re-reads recipient, amount and fee, and it is
         * still the only thing that signs (SECURITY.md, Utils/SPayments.confirmAndAuth).
         *
         * FAIL CLOSED, and the direction is stated: a tail this method does not recognise is
         * DROPPED and the validated address alone is forwarded. Nothing unrecognised crosses
         * the bridge, and a scan of a well-formed address still fills in the recipient. The
         * amount is accepted only as digits with at most one decimal point, so no sign, no
         * exponent, no separator and no culture-dependent parse can reach the compose; it is
         * forwarded verbatim, so this method can never change a number.
         *
         * ⚠ THE ADDRESS IS NOT VALIDATED HERE. `ExtendedAddress.Validate` at the call site is
         * that gate, and the leading substring this method returns is character-for-character
         * the substring the caller validated.
         *
         * CALLERS: `quickScanForSend` and `processQRResult` in
         * `Spixi/Pages/Home/HomePage.xaml.cs`. Both wrap their `quickScanResult` argument in
         * this call. A smoke pin WALKS every `quickScanResult` push and refuses one that does
         * not, so a third site cannot be added without the guard. */
        private const int SCAN_AMOUNT_MAX = 32;

        /* ★★ Session T, walk A7 — THE ADDRESS HALF OF A SCANNED PAYLOAD, and the ONE place
         * that knows where it ends. Damir scanned a contact QR from the shell's add-contact
         * screen and got the address back with ":ixi" still attached, which
         * `ExtendedAddress.Validate` then refuses — so the scan appeared to work and the
         * contact could not be added. The branch that answered him split on ":send" only,
         * so the OTHER tail in the very same grammar rode straight through.
         *
         * The grammar is closed and documented at `quickScanForSend`:
         *     addr · addr:ixi · addr:send:<amount>
         * The address is the part before the FIRST colon, whatever the tail says. Splitting
         * on one literal tail is what created the defect: it answers "is this THE tail I
         * thought of", and the caller needs "where does the address end".
         *
         * ⚠ NOT FOR APP LINKS. A mini-app URL contains "://", so the address-of rule would
         * cut it to "https". The two add-app branches (`AppNewPage.processQRResult` and the
         * `appScanToShell` arm of `HomePage.processQRResult`) split on ":ixi" for that
         * reason and MUST keep doing so — GATE 55 pins both halves, so a later tidy-up that
         * unifies them fails rather than silently truncating every app link.
         * ⚠ AND `safeScanPayload` DOES NOT CALL THIS, deliberately — GATE 30 executes that
         * method in isolation after slicing it out of this file, so it has to stand alone.
         * The three scan-ANSWERING sites are this helper's callers; the payload-BOUNDING
         * one keeps its own copy of the first-colon rule and says why. */
        public static string scanAddressOf(string payload)
        {
            if (string.IsNullOrEmpty(payload))
            {
                return "";
            }
            int sep = payload.IndexOf(':');
            return sep > 0 ? payload.Substring(0, sep) : payload;
        }

        public static string safeScanPayload(string payload)
        {
            if (string.IsNullOrEmpty(payload))
            {
                return "";
            }
            /* ⚠ SELF-CONTAINED ON PURPOSE — and this is a constraint, not a style note.
             * GATE 30 slices THIS METHOD (and isPlainAmount) out of this file by brace match,
             * mechanically rewrites it to JS and EXECUTES it, so the grammar matrix runs the
             * shipped code rather than a copy of it. A call to any helper outside that sliced
             * pair is not in scope there. Session T learned it the expensive way: routing
             * these three lines through `scanAddressOf` — which is correct, and tidier — made
             * the eval throw `ReferenceError` mid-run and killed Damir's whole suite from
             * GATE 30 onward. The duplication below is the price of the method being
             * executable in isolation, GATE 55 (a) pins it, and the gate now fails a row
             * instead of the run if this is broken again. */
            int sep = payload.IndexOf(':');
            if (sep < 0)
            {
                return payload;                                  // a bare address: no tail to bound
            }
            string addr = payload.Substring(0, sep);
            string tail = payload.Substring(sep + 1);
            if (tail.Equals("ixi", StringComparison.Ordinal))
            {
                return addr + ":ixi";
            }
            if (tail.StartsWith("send:", StringComparison.Ordinal))
            {
                string amount = tail.Substring("send:".Length);
                if (isPlainAmount(amount))
                {
                    return addr + ":send:" + amount;
                }
            }
            return addr;                                         // unrecognised tail: dropped
        }

        // An amount is a number. Digits, at most one decimal point, at least one digit, and
        // short. Everything else — a sign, an exponent, a separator, a second colon, an empty
        // string — is refused, so the refusal is the default branch.
        private static bool isPlainAmount(string amount)
        {
            if (string.IsNullOrEmpty(amount) || amount.Length > SCAN_AMOUNT_MAX)
            {
                return false;
            }
            bool digit = false;
            bool point = false;
            foreach (char c in amount)
            {
                if (c >= '0' && c <= '9')
                {
                    digit = true;
                    continue;
                }
                if (c == '.' && !point)
                {
                    point = true;
                    continue;
                }
                return false;
            }
            return digit;
        }

        /* ★★ THE ONE EXTERNAL-OPEN SINK, and the claim is narrowed to what is PROVEN.
         * Every link the two `ixian:openLink:` branches and the iOS http(s) hand-off give
         * to the OS goes through this method - that much is proven positively, per branch
         * (gate 16 ①). Across the rest of the tree what is proven is narrower: no other
         * file in the shipped C# projects calls an `OpenAsync` sink, and four named
         * platform primitives appear only in the local-file and exec homes gate 16 names.
         * Gate 16's walk reads the METHOD NAME, so how the receiver was obtained - a local,
         * a private helper, a `using static`, a fully-qualified name - changes nothing.
         *
         * ⚠ AN EARLIER VERSION OF THIS PARAGRAPH SAID "Every link this app hands to the OS
         * goes through this method" (#772). That was false, and a reviewer proved it twice
         * with the whole suite green: `UIApplication.SharedApplication.OpenUrl(...)` in the
         * iOS branch re-opened security MAJOR #6(a), and `SFileOperations.open(link)` in the
         * chat branch re-opened MAJOR #3 - on Windows that helper is
         * `Process.Start(UseShellExecute = true)`, i.e. the browser, and SingleChatPage
         * already calls it twice in the same file. Neither is spelled `OpenAsync`.
         *
         * ⚠ WHAT THE WALK CANNOT SEE, said plainly (#798), because a text walk has edges:
         *   · ANY OS-OPEN API THAT IS NOT SPELLED `OpenAsync`. This is the ordinary case and
         *     the list above used to miss it while naming the two exotic ones. Gate 16
         *     sweeps four such primitives by name, and that sweep is a list too, so it can
         *     only refuse the spellings on it;
         *   · a call reached through REFLECTION. `typeof(IBrowser).GetMethod("OpenAsync")`
         *     never writes the call, so no text pin can find it;
         *   · a helper compiled from ANOTHER ASSEMBLY, outside the walked projects.
         * None of the three is closed by the walk. What closes them INSIDE the three sink
         * branches is gate 16 ①, which enumerates every invocation in each branch and
         * refuses anything that is not this gate - so an unlisted spelling, and reflection,
         * fail there by being a call. Outside those branches the edges above stand, and they
         * are recorded so the next reader does not read the walk as more than it is.
         * (`Ixian-Core` is a sibling repo whose sources compile into this assembly; it IS
         * walked when the checkout has it, and it has no sink today.)
         *
         * ⚠ WHY IT IS ONE METHOD AND NOT A GUARD PER PAGE. The rule below was written twice,
         * once in SingleChatPage and once in SettingsPage, and a #46 loop defeated the pin
         * that proved it THREE ROUNDS RUNNING: a character window was satisfied by a
         * neighbouring `return;`, a position test was satisfied by a hand-off moved INSIDE
         * the guard's own body, and the walk that found the guards could not see a branch
         * written `if(` with no space. The property was true and it was not provable,
         * because it was a control-flow property of duplicated code. It is now a property
         * of the CALL GRAPH: there is one sink, in one method, and a walk with one permitted
         * home cannot be beaten by formatting, by a preprocessor directive, or by where a
         * `return` sits (#46 loop r2 MAJOR-1 · r3 MAJOR-1/-2/-3).
         *
         * ★ WHAT IT ENFORCES, and nothing more is claimed.
         * The string is parsed ONCE. The Uri object that passes the test is the SAME object
         * that is handed off, so no re-parse at the sink can disagree with the parse that
         * passed it.
         * For ExternalTarget.Web the scheme must be http or https, and `Uri.UserInfo` must
         * be EMPTY. Userinfo is the construct that puts the real host AFTER text the reader
         * takes for the destination: "https://paypal.com@evil.example/login" reads as
         * paypal.com and resolves to evil.example. The property being protected is THE
         * DESTINATION HOST IS THE HOST THE USER READ.
         * For ExternalTarget.MailCompose the scheme must be mailto. The userinfo test is
         * deliberately NOT applied there: .NET parses "mailto:support@spixi.io" with
         * UserInfo "support", so the Web test would refuse every mail link. A mailto has no
         * host the user reads, so the property above does not apply to it.
         *
         * ★ FAIL CLOSED. `admit` is false unless a named kind matched a named scheme, so a
         * kind this method does not know is refused, and so is an unparsable string.
         *
         * ⚠ WHAT IS NOT ESTABLISHED (#772 / #798). This method does not prove that the text
         * reaching it is the text a user approved. The chat sink decodes its first line, so
         * a peer-typed %XX arrives in a form the confirm modal never displayed; the userinfo
         * refusal is what makes the AUTHORITY safe under that decode, and the path and the
         * query may still differ by one decode. It is also not proven here that no character
         * can move the host THROUGH the parser's own normalisation - IDNA mapping, backslash
         * folding and dot-segment removal all run inside Uri and this method sees only the
         * result. Two candidates are on record and unanswered: a fullwidth U+FF20 that may
         * map to '@' during host determination, and the '+' that HttpUtility.UrlDecode turns
         * into a SPACE on the way in (security review MAJOR #8). Both need a device run.
         *
         * ⚠ Utils.IsAllowedURL is NOT used here and must not be. It is a SUBRESOURCE gate
         * and it returns TRUE for every non-http scheme, which is the exact inverse of what
         * a browser sink needs.
         *
         * ⚠ The refusal and the failure line name the SCHEME and the KIND only. Uri.Scheme is
         * produced by the parser and its grammar is a letter followed by letters, digits and
         * "+-.", and the kind is an enum, so no caller text can ride either line. `ex.Message`
         * is never logged: an exception message repeats the value that caused it, and
         * ixian.log is rendered by DevPage and shared to the OS share sheet in one tap. */
        public enum ExternalTarget
        {
            Web,           // http and https, and the host must be the host the user read
            MailCompose    // mailto only
        }

        /// <summary>Opens a web link with the STRICT kind. Returns false for every refusal.
        /// Read the two-argument overload for what a true return does and does not mean.</summary>
        public static bool openExternal(string? url)
        {
            return openExternal(url, ExternalTarget.Web);
        }

        /// <summary>Opens an external link of the named kind. Returns false for every refusal
        /// and for a synchronous failure. A TRUE return means the link passed the gate and the
        /// hand-off was ACCEPTED. It does NOT mean a browser opened. Browser.OpenAsync completes
        /// asynchronously and this method is synchronous, so a failure raised inside that Task
        /// is LOGGED by the continuation below. It cannot be returned.</summary>
        public static bool openExternal(string? url, ExternalTarget kind)
        {
            Uri? target = null;
            if (string.IsNullOrEmpty(url) || !Uri.TryCreate(url, UriKind.Absolute, out target) || target == null)
            {
                Logging.warn("openExternal refused a link: unparsable, kind=" + kind);
                return false;
            }

            bool admit = kind == ExternalTarget.Web
                ? (target.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.Ordinal)
                    || target.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.Ordinal))
                  && target.UserInfo.Length == 0
                : kind == ExternalTarget.MailCompose
                  && target.Scheme.Equals(Uri.UriSchemeMailto, StringComparison.Ordinal);

            if (!admit)
            {
                Logging.warn("openExternal refused a link: kind=" + kind + " scheme=" + target.Scheme);
                return false;
            }

            try
            {
                /* ⚠ THE HAND-OFF IS NOT AWAITED, AND THE TASK IS OBSERVED INSTEAD.
                 * This method returns bool to synchronous callers: the ixian: navigation
                 * handlers that call it are void event handlers, so an await here would turn
                 * them async void and the signature change would reach every call site. The
                 * one caller that is already async is the iOS dispatched lambda, and it is not
                 * a reason to change the other ten (eleven call sites, five files). The catch below therefore sees only a
                 * SYNCHRONOUS throw. The ordinary failure - no browser installed, no activity
                 * to receive the intent - is raised INSIDE the Task, and a discarded Task
                 * makes it an unobserved exception that no log line can see. The continuation
                 * reads the outcome, so the failure line below is reachable for the fault, for
                 * a cancellation and for a plain false result. */
                Browser.Default.OpenAsync(target).ContinueWith(t =>
                {
                    if (t.IsFaulted || t.IsCanceled || !t.Result)
                    {
                        Logging.error("openExternal handoff failed: kind=" + kind + " scheme=" + target.Scheme + " " + (t.Exception?.GetBaseException().GetType().Name ?? (t.IsCanceled ? "canceled" : "refused")));
                    }
                });
                return true;
            }
            catch (Exception ex)
            {
                Logging.error("openExternal handoff failed: kind=" + kind + " scheme=" + target.Scheme + " " + ex.GetType().Name);
                return false;
            }
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
