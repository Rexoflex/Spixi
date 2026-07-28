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

        public static void sendUiCommand(SpixiContentPage contentPage, string command, params string[] arguments)
        {
            try
            {
                string cmd_str = "executeUiCommand(" + command;
                StringBuilder sb = new StringBuilder(cmd_str);

                foreach (string arg in arguments)
                {
                    if (arg != null)
                    {
                        sb.Append(",");
                        sb.Append("'" + escapeHtmlParameter(arg) + "'");
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

            if (HomePage.Instance() != null
                && HomePage.Instance().getDetailContent() != null)
            {
                var item = HomePage.Instance().getDetailContent();
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
            if (HomePage.Instance() != null
                && HomePage.Instance().getDetailContent() is SingleChatPage detailChat
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
