using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Security.Cryptography;

namespace SPIXI
{
    public enum MediaKind { Thumb = 1, Viewer = 2 }

    /* THE MEDIA ORIGIN'S GRANT TABLE (#1642). A chat picture reaches its WebView as a local URL instead of a base64 value on the
     * bridge. The page hands C#'s OWN re-encoded JPEG bytes to grant() and pushes the URL it gets; the WebView's request handler
     * (Android ShouldInterceptRequest, Windows WebResourceRequested, iOS / Mac MediaSchemeHandler) asks tryServe() and answers
     * the bytes or a 404 — never the network, never a file.
     *   · The URL is this platform's Prefix + 32 lower-case hex of 16 random bytes. It names no path and no message.
     *   · A grant lives in the table of ONE owner (the page's MAUI WebView). The table is keyed by reference, so the WebView of
     *     another pane, of another chat or of a mini app finds nothing under the same token (the isolation invariant).
     *   · A grant dies with its document (beginDocument), its owner's page (revokeOwner) or its owner's handler (serverDown).
     *   · A URL names ONE byte sequence for its whole life: the same key with other bytes gets a new URL.
     *   · Caps per owner: ThumbMaxCount thumbnails and ThumbMaxBytes of them, ONE viewer picture (a new one revokes the old).
     *     Over a cap = null, and the caller pushes the data: value as before.
     *   · No log line: a token, an id or a byte count never leaves this class except in the URL that grant() returns.
     * OWNER LIFETIME: a ConditionalWeakTable — weak keys compared by reference. A WebView whose handler is never disconnected is
     * still collected, and its grants (the bytes) go with it; serverDown / revokeOwner free them at once.
     * THREADS: every member takes the one lock (Android serves on a WebView IO thread, pages grant from pool threads).
     * The switch ImgurlFlags.MediaOrigin OFF: no server is made, grant() is null, tryServe() is false. */
    public static class MediaGrants
    {
        public const int TokenHex = 32;
        public const string Host = "https://spixi-media.invalid/";   // .invalid never resolves (RFC 6761)
        public const string HttpsPrefix = Host + "m/";               // Android, Windows
        public const string Scheme = "spixi-media";
        public const string SchemePrefix = Scheme + "://m/";         // iOS, Mac
        public const string ContentType = "image/jpeg";
        public const int ThumbMaxCount = 512;
        public const long ThumbMaxBytes = 16L * 1024 * 1024;
        public const int ThumbJpegMax = 64 * 1024;       // = SingleChatPage.ChatThumbMaxBytes
        public const int ViewerJpegMax = 1_200_000;      // = ViewerImage.MaxJpegBytes
        public const int IdHexMax = 128;
        public const int PxMax = 4096;

#if IOS || MACCATALYST
        public static string Prefix => SchemePrefix;
#else
        public static string Prefix => HttpsPrefix;
#endif

        /** The response headers of every answer, hit or miss (Content-Type goes beside them). */
        public static IReadOnlyList<KeyValuePair<string, string>> Headers { get; } = Array.AsReadOnly(new[]
        {
            new KeyValuePair<string, string>("Cache-Control", "no-store"),
            new KeyValuePair<string, string>("X-Content-Type-Options", "nosniff"),
        });

        /** The same headers as one CRLF-joined block (WebView2's form). */
        public static readonly string HeaderLines = string.Join("\r\n", Headers.Select(h => h.Key + ": " + h.Value));

        private sealed class Grant
        {
            public string token = "", key = "";
            public byte[] bytes = Array.Empty<byte>();
        }

        /** One WebView's server: its current document (null = none), its grants by token and by key, its viewer grant. */
        private sealed class Owner
        {
            public int? doc;
            public Grant? viewer;
            public long thumbBytes;
            public readonly Dictionary<string, Grant> byToken = new Dictionary<string, Grant>(StringComparer.Ordinal);
            public readonly Dictionary<string, Grant> byKey = new Dictionary<string, Grant>(StringComparer.Ordinal);
        }

        private static readonly object gate = new object();
        private static readonly ConditionalWeakTable<object, Owner> owners = new ConditionalWeakTable<object, Owner>();

        private static Owner? find(object? owner) => owner != null && owners.TryGetValue(owner, out Owner? o) ? o : null;

        /** May the WebView with this ClassId get a server? Never a mini app, never with the switch OFF. */
        internal static bool hostOk(string? classId) => ImgurlFlags.MediaOrigin && !SafetyRules.isMiniAppMarker(classId);

        /** The platform side: this WebView's handler is installed and answers the media URLs. A second call keeps the grants. */
        public static void serverUp(object owner)
        {
            if (owner == null || !ImgurlFlags.MediaOrigin) return;
            lock (gate) { owners.GetValue(owner, _ => new Owner()); }
        }

        /** The platform side: the handler is gone. Every grant of the owner is revoked and its server is forgotten. */
        public static void serverDown(object owner)
        {
            if (owner != null) lock (gate) { owners.Remove(owner); }
        }

        public static bool serving(object owner)
        {
            lock (gate) { return find(owner) != null; }
        }

        /** The page side: document `doc` starts in the owner's WebView. Every grant of another document is revoked. */
        public static void beginDocument(object owner, int doc)
        {
            lock (gate) { if (find(owner) is Owner o && o.doc != doc) owners.AddOrUpdate(owner, new Owner { doc = doc }); }
        }

        /** The page side: the page is torn down. Every grant is revoked and no document is current (the server stays). */
        public static void revokeOwner(object owner)
        {
            lock (gate) { if (find(owner) != null) owners.AddOrUpdate(owner, new Owner()); }
        }

        /** The URL of `jpeg` for this owner and document, or null = push the data: value (no server, the switch OFF, another
         *  document, a cap, bad input). The same key and bytes while granted = the same URL. `jpeg` is kept, not copied:
         *  the caller must not write to it afterwards. */
        public static string? grant(object owner, int doc, MediaKind kind, string idHex, int px, byte[] jpeg)
        {
            try
            {
                if (!ImgurlFlags.MediaOrigin || !inputOk(kind, idHex, px, jpeg)) return null;
                string key = (int)kind + "|" + px + "|" + idHex.ToLowerInvariant();   // an id is a key only: its letter case is not
                lock (gate)
                {
                    Owner? o = find(owner);
                    if (o == null || o.doc != doc) return null;
                    if (o.byKey.TryGetValue(key, out Grant? old))
                    {
                        if (ReferenceEquals(old.bytes, jpeg) || old.bytes.AsSpan().SequenceEqual(jpeg)) return Prefix + old.token;
                        drop(o, old);
                    }
                    bool thumb = kind == MediaKind.Thumb;
                    if (!thumb && o.viewer != null) drop(o, o.viewer);
                    int thumbs = o.byToken.Count - (o.viewer == null ? 0 : 1);
                    if (thumb && (thumbs >= ThumbMaxCount || o.thumbBytes + jpeg.Length > ThumbMaxBytes)) return null;
                    var g = new Grant { key = key, bytes = jpeg };
                    do { g.token = Convert.ToHexString(RandomNumberGenerator.GetBytes(TokenHex / 2)).ToLowerInvariant(); }
                    while (o.byToken.ContainsKey(g.token));
                    o.byToken[g.token] = g;
                    o.byKey[key] = g;
                    if (thumb) o.thumbBytes += jpeg.Length;
                    else o.viewer = g;
                    return Prefix + g.token;
                }
            }
            catch (Exception) { return null; }
        }

        /** The handler side: the bytes granted to THIS owner under `url`, or false = answer 404. The grammar is exact: this
         *  platform's Prefix, then TokenHex lower-case hex, then the end of the string. */
        public static bool tryServe(object owner, string url, out byte[] bytes)
        {
            bytes = Array.Empty<byte>();
            try
            {
                string? token = tokenOf(url, Prefix);
                if (token == null || !ImgurlFlags.MediaOrigin) return false;
                lock (gate)
                {
                    if (!(find(owner) is Owner o) || !o.byToken.TryGetValue(token, out Grant? g)) return false;
                    bytes = g.bytes;
                    return true;
                }
            }
            catch (Exception) { return false; }
        }

        /** The token of a URL of exactly `prefix` + TokenHex lower-case hex, or null. */
        internal static string? tokenOf(string? url, string prefix)
        {
            if (url == null || url.Length != prefix.Length + TokenHex || !url.StartsWith(prefix, StringComparison.Ordinal)) return null;
            for (int i = prefix.Length; i < url.Length; i++)
            {
                char c = url[i];
                if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f'))) return null;
            }
            return url.Substring(prefix.Length);
        }

        /** A known kind, an id of 1 to IdHexMax hex digits (either case), a sane pixel size, and bytes that start as a JPEG and
         *  fit the kind's bound. */
        private static bool inputOk(MediaKind kind, string idHex, int px, byte[] jpeg)
        {
            if (kind != MediaKind.Thumb && kind != MediaKind.Viewer) return false;
            if (string.IsNullOrEmpty(idHex) || idHex.Length > IdHexMax || !idHex.All(Uri.IsHexDigit)) return false;
            if (px < 1 || px > PxMax || jpeg == null || jpeg.Length < 3) return false;
            if (jpeg.Length > (kind == MediaKind.Viewer ? ViewerJpegMax : ThumbJpegMax)) return false;
            return jpeg[0] == 0xFF && jpeg[1] == 0xD8 && jpeg[2] == 0xFF;
        }

        private static void drop(Owner o, Grant g)
        {
            o.byToken.Remove(g.token);
            o.byKey.Remove(g.key);
            if (ReferenceEquals(o.viewer, g)) o.viewer = null;
            else o.thumbBytes -= g.bytes.Length;
        }
    }
}
