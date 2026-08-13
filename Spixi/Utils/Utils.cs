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
        // silently assumed every receiver runs src/bridge/native.js. Two do not:
        //   · the 8 remaining legacy Raw/html pages (hasLegacyPageChrome) still decode with
        //     js/spixi.js `base64ToBytes` → an unguarded atob. A peer-chosen nickname of
        //     "data:;base64,x" passes the whitelist, is emitted verbatim, and atob THROWS on
        //     the ':' — dropping the whole push. wallet_contact_request's setData is that
        //     page's only writer, so a hostile requester blanks the payment-confirm screen.
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

                // #340: receiver gate FIRST — see isTransportSafeDataUri's header. Legacy
                // pages and mini-app WebViews keep the base64 contract unconditionally.
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
