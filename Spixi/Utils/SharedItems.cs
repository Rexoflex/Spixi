using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;

namespace SPIXI
{
    /* ★★ #1106 — SHARED MEDIA / FILES / LINKS for chat info (be-cutover CI6; session 1 part 5).
     *
     * WHAT: one off-UI-thread scan of a conversation's history, NEWEST FIRST, stopping at ItemCap items
     * (Damir: "disk, capped"). 1:1 + groups; bots are excluded in v1 (the caller gates).
     *   media = a FILE message whose name has an image extension (no MIME exists — the peer picks the name);
     *   file  = any other file message;
     *   link  = each URL in a text message, found by LinkRule (a port of the shell's message-bubble.js URL_RE —
     *           in LinkRule.cs; the smoke parity pin derives both and compares them). Image / GIF URLs are links here: chat info
     *           never fetches anything remote (#82 / C14 — a fetch would leak the IP).
     * Deleted rows (#907: an empty `message`) and every non-text/non-file type are skipped.
     *
     * SECURITY (CLAUDE.md ★ "C# touches no risky parts"; docs/security-handover-gate.md §"#1106"):
     *   · the WebView gets ids, kinds, labels, sizes, times and small data: thumbnails — NEVER a path;
     *   · the WebView sends back ONLY "<message id>:<link index>" — C# resolves the target from ITS OWN last scan
     *     (resolve), so no WebView string reaches a file op or a URL open;
     *   · a file is opened only from a C#-recorded path that passes localPathOf (received → the vetted
     *     SContacts Downloads-root rule; sent → an absolute path that exists);
     *   · logs carry counts and milliseconds only — no URL, name, address or path. */
    public sealed class SharedItem
    {
        public string id = "";        // message id (hex)
        public int n = 0;             // link index inside the message (0 for media/file)
        public int channel = 0;
        public string kind = "";      // media | file | link
        public string label = "";     // file name, or the URL as typed
        public ulong size = 0;        // file size in bytes (0 = unknown)
        public long ts = 0;           // message timestamp (sender's, seconds)
        public bool local = false;    // a local copy exists (C# resolved it)
        public int depth = 0;         // how many messages in its channel are NEWER (for the jump)
        [JsonIgnore] public string? path = null;   // C# ONLY — never serialized
        [JsonIgnore] public string? url = null;    // C# ONLY — the click target (https:// added to a scheme-less link)
        public string? thumb = null;  // data: URI (small local images only) or null
        /* ★ #1166 V-3 (#1154): a RECEIVED file (not sent by me) — the 9th tuple field (append-only; an older shell reads 8
         * and ignores it). The shell offers "Delete from this device" / "Show in Downloads" only for received + local. */
        public bool received = false;
        [JsonIgnore] public FriendMessage? message = null;   // C# ONLY — re-checked at delete time (the path can be reused, #46 r5 R5-3)
    }

    public static class SharedItems
    {
        public const int ItemCap = 200;           // Damir (#1106): ~200, newest first
        public const int ScanCap = 4000;          // messages read per channel at most (the disk bound)
        public const long ThumbMaxBytes = 64 * 1024;      // ★ G-6b: a file this small rides AS IS (no decode); a bigger one gets a real thumbnail
        public const long ThumbSourceMax = 20L * 1024 * 1024;   // ★ G-6b (#46 r1 A2): never decode a file above this (the tile keeps its glyph)
        public const int ThumbPx = 160;                   // ★ G-6b: the thumbnail's side (a 3-col tile is ~130 dp; ~10–15 KB at q60)
        public const int ThumbMaxCount = 60;      // ★ G-6b: the previews made per scan; the rest show the glyph. ★ #1195: the shell shows 9 in place (SHARED_INLINE_MAX) and the "Show all" grid uses up to these 60 — a lazy rest is a later verb (BE)
        public const long ThumbTotalMax = 1536 * 1024;   // (#46 r1 A7) the whole push stays a few MB at most after escaping
        public const int JumpCap = 1000;          // Damir (#1106): the chat jump widens the window at most this far

        private static readonly object cacheLock = new object();
        private static readonly Dictionary<string, List<SharedItem>> lastScan = new Dictionary<string, List<SharedItem>>();


        private static readonly string[] imageExts = { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".heic", ".avif" };

        public static bool isImageName(string name)
        {
            string ext = "";
            try { ext = Path.GetExtension(name ?? "").ToLowerInvariant(); } catch (Exception) { }
            return imageExts.Contains(ext);
        }


        /** (#46 r5 R5-2) the two pure rules live in FileMatch.cs (MSTest executes them); kept here as the callers' names. */
        public static bool fileMatches(FriendMessage fm, string full) => FileMatch.matches(fm, full);
        public static bool parseFileHeader(string? msg, out string name, out ulong size) => FileMatch.parseFileHeader(msg, out name, out size);

        /** The local file of a file message, resolved by C# only; null = none. */
        public static string? localPathOf(FriendMessage fm)
        {
            if (fm == null || fm.type != FriendMessageType.fileHeader || string.IsNullOrEmpty(fm.filePath))
            {
                return null;
            }
            try
            {
                if (!fm.localSender)
                {
                    string? full = SContacts.receivedMediaPathOfPublic(fm);
                    return full != null && File.Exists(full) && fileMatches(fm, full) ? full : null;   // (#46 r4 R4-4) not another sender's later file
                }
                // our own sent file: the absolute path the picker gave C# (a bare name is the legacy rebuild of a
                // header — never resolved relative to anything)
                return Path.IsPathRooted(fm.filePath) && File.Exists(fm.filePath) ? fm.filePath : null;
            }
            catch (Exception)
            {
                return null;
            }
        }

        /* ★ #1190 (#1173 (3) + (4)): addFile's 16th argument for a file row — "1" / "0" / "" (FileRowRules.localArg on
         * FileRowRules.localPathCase). The disk test is localPathOf's own (received → the Downloads-root rule + fileMatches;
         * sent → an absolute path that exists). `pathCase` = the case word (the dev [P1] filelocal line) — never the path.
         * FileSystem.CacheDirectory = Microsoft.Maui.Storage.FileSystem.CacheDirectory (MAUI Essentials, a static string). */
        /* ★ #1190 (#46 r4 m1): localArgOf runs per file row on the UI thread (loadMessages: open, channel switch, load-more,
         * a jump widening up to JumpCap rows, the previews toggle). The cache dir is a fixed string for the process — read
         * ONCE (System.Lazy<T>, thread-safe by default; a throw → null = "unknown", FileRowRules' own null case). */
        private static readonly Lazy<string?> cacheDirOnce = new Lazy<string?>(() =>
        {
            try { return Microsoft.Maui.Storage.FileSystem.CacheDirectory; } catch (Exception) { return null; }
        });

        public static string localArgOf(FriendMessage fm, out string pathCase)
        {
            pathCase = FileRowRules.CaseNone;
            try
            {
                if (fm == null || fm.type != FriendMessageType.fileHeader)
                {
                    return "";
                }
                if (!fm.completed)
                {
                    /* ★ #1190 (#46 r4 m1): an offer / a transfer in flight (either direction) — the shell draws "0" only on a
                     * COMPLETE row, so no disk check (FileRowRules.localArg answers "" for it too). */
                    pathCase = FileRowRules.CasePending;
                    return "";
                }
                /* The remaining cost, COMPLETE rows only: localPathOf = one File.Exists (sent) or SContacts.receivedMediaPathOfPublic
                 * + File.Exists + fileMatches (received; a stat, and a size read) — a few stats per complete file row, the
                 * same check the chat-info scan already makes per item. */
                pathCase = FileRowRules.localPathCase(fm.filePath, localPathOf(fm) != null, cacheDirOnce.Value);
                return FileRowRules.localArg(fm.localSender, fm.completed, pathCase);
            }
            catch (Exception)
            {
                return "";   // unknown → the shell keeps today's row
            }
        }

        /* ★ G-6b (#1121): thumbnails made once per file version (path + size + write time), kept in memory for the
         * process (bounded) — reopening chat info does not decode again. */
        private static readonly object thumbLock = new object();
        private static readonly Dictionary<string, string?> thumbCache = new Dictionary<string, string?>(StringComparer.Ordinal);
        private const int ThumbCacheMax = 200;   // (#46 r1 A5) ≤ 200 × ≤ 64 KB

        internal static byte[] readHead(string path)   // ★ #1166 V-3: ViewerImage reads the same 16 bytes
        {
            byte[] head = new byte[16];
            using (FileStream fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            {
                int n = fs.Read(head, 0, head.Length);
                if (n < head.Length)
                {
                    Array.Resize(ref head, Math.Max(n, 0));
                }
            }
            return head;
        }

        private static string? thumbOf(string path)
        {
            try
            {
                FileInfo fi = new FileInfo(path);
                if (!fi.Exists || fi.Length <= 0)
                {
                    return null;
                }
                string ext = fi.Extension.ToLowerInvariant();
                string? mime = ext == ".jpg" || ext == ".jpeg" ? "image/jpeg"
                    : ext == ".png" ? "image/png"
                    : ext == ".gif" ? "image/gif"
                    : ext == ".webp" ? "image/webp"
                    : null;
                if (mime != null && fi.Length <= ThumbMaxBytes)
                {
                    return "data:" + mime + ";base64," + Convert.ToBase64String(File.ReadAllBytes(path));   // small: as is
                }
                /* ★ G-6b: a bigger photo (or HEIC / BMP / AVIF, which the WebView may not draw) → a real thumbnail, decoded
                 * at a small size by the platform (Platforms/<os>/SThumbnail.cs) — never the whole file into the push.
                 * (#46 r1 A2) The file is a CONTACT's and the decode runs in the app process, unasked: only a file whose
                 * FIRST BYTES are one of the expected image formats reaches a platform decoder (the extension alone does
                 * not), and never above ThumbSourceMax. */
                if (fi.Length > ThumbSourceMax || Array.IndexOf(imageExts, ext) < 0 || !ImageSniff.looksLikeImage(readHead(fi.FullName)))
                {
                    return null;
                }
                string key = fi.FullName + "|" + fi.Length.ToString(System.Globalization.CultureInfo.InvariantCulture)
                    + "|" + fi.LastWriteTimeUtc.Ticks.ToString(System.Globalization.CultureInfo.InvariantCulture);
                lock (thumbLock)
                {
                    if (thumbCache.TryGetValue(key, out string? hit))
                    {
                        return hit;
                    }
                }
                byte[]? jpeg = Spixi.SThumbnail.makeJpeg(fi.FullName, ThumbPx);
                string? uri = jpeg != null && jpeg.Length > 0 && jpeg.Length <= ThumbMaxBytes
                    ? "data:image/jpeg;base64," + Convert.ToBase64String(jpeg)
                    : null;
                lock (thumbLock)
                {
                    if (thumbCache.Count >= ThumbCacheMax)
                    {
                        thumbCache.Clear();   // bounded: a rare full reset beats an LRU here
                    }
                    thumbCache[key] = uri;
                }
                return uri;
            }
            catch (Exception)
            {
                return null;
            }
        }

        /** The channels a conversation's history lives in (1:1 → its channel dirs; a group → every channel dir). */
        private static List<int> channelsOf(Friend friend)
        {
            List<int> chans = new List<int>();
            try
            {
                string root = Path.Combine(IxianHandler.localStorage.documentsPath, "Chats", friend.walletAddress.ToString());
                if (Directory.Exists(root))
                {
                    foreach (string d in Directory.GetDirectories(root))
                    {
                        if (int.TryParse(Path.GetFileName(d), System.Globalization.NumberStyles.Integer, System.Globalization.CultureInfo.InvariantCulture, out int c))
                        {
                            chans.Add(c);
                        }
                    }
                }
            }
            catch (Exception)
            {
            }
            if (chans.Count == 0)
            {
                chans.Add(0);
            }
            return chans;
        }

        /** One channel's newest ScanCap messages: disk (oldest → newest) merged with Core's in-memory list, so a row
         *  written in the last debounce window (and a just-completed download) is current. Never REPLACES Core's
         *  cache (localStorage is read directly — the CORE-8 hazard of getMessages(ch, n != 100)). */
        private static List<FriendMessage> historyOf(Friend friend, int channel)
        {
            List<FriendMessage> disk;
            try
            {
                disk = IxianHandler.localStorage.readLastMessages(friend, channel, 0, ScanCap);
            }
            catch (Exception)
            {
                disk = new List<FriendMessage>();
            }
            List<FriendMessage>? mem = null;
            try
            {
                if (friend.channels == null || friend.channels.hasChannel(channel))
                {
                    mem = friend.getMessages(channel);
                }
            }
            catch (Exception)
            {
                mem = null;
            }
            if (mem == null || mem.Count == 0)
            {
                return disk;
            }
            List<FriendMessage> memCopy;
            lock (mem)
            {
                memCopy = new List<FriendMessage>(mem);
            }
            Dictionary<string, int> at = new Dictionary<string, int>();
            for (int i = 0; i < disk.Count; i++)
            {
                if (disk[i].id != null)
                {
                    at[Crypto.hashToString(disk[i].id)] = i;
                }
            }
            foreach (FriendMessage m in memCopy)
            {
                if (m.id == null)
                {
                    continue;
                }
                string key = Crypto.hashToString(m.id);
                if (at.TryGetValue(key, out int idx))
                {
                    disk[idx] = m;
                }
                else
                {
                    disk.Add(m);
                }
            }
            return disk;
        }

        /** Off the UI thread. Newest first, at most ItemCap; remembered per conversation for resolve(). */
        public static List<SharedItem> scan(Friend friend)
        {
            System.Diagnostics.Stopwatch sw = System.Diagnostics.Stopwatch.StartNew();
            List<SharedItem> all = new List<SharedItem>();
            int read = 0;
            foreach (int ch in channelsOf(friend))
            {
                List<FriendMessage> hist = historyOf(friend, ch);
                read += hist.Count;
                int depth = 0;
                for (int i = hist.Count - 1; i >= 0; i--, depth++)
                {
                    FriendMessage fm = hist[i];
                    if (fm == null || fm.id == null || string.IsNullOrEmpty(fm.message))
                    {
                        continue;   // a deleted row (#907) shows nothing
                    }
                    string id = Crypto.hashToString(fm.id);
                    if (fm.type == FriendMessageType.fileHeader)
                    {
                        if (!parseFileHeader(fm.message, out string name, out ulong size))
                        {
                            continue;
                        }
                        string? local = localPathOf(fm);
                        /* ★ #1190 (#1173 (3), #1188 b): a RECEIVED file that was downloaded and is no longer on this device
                         * (deleted from this device — #1154's own "Delete from this device", the Downloads page, the OS) is
                         * DROPPED from Media / Files — not a dead glyph tile. The chat row says "… deleted from this device". */
                        if (local == null && !fm.localSender && fm.completed
                            && FileRowRules.isDeletedReceived(fm.localSender, fm.completed, localArgOf(fm, out _)))
                        {
                            continue;
                        }
                        all.Add(new SharedItem
                        {
                            id = id, channel = ch, kind = isImageName(name) ? "media" : "file", label = name,
                            size = size != 0 ? size : fm.fileSize, ts = fm.timestamp, local = local != null, path = local, depth = depth,
                            received = !fm.localSender, message = fm,   // ★ #1166 V-3 (#1154)
                        });
                    }
                    else if (fm.type == FriendMessageType.standard)
                    {
                        if (VoiceCodec.tryPeekInline(fm.message, out _))
                        {
                            continue;   // ★ #1208: an inline voice text yields no link (its base64 is not text)
                        }
                        /* ★ #46 r1 C m-2 (#1198): links from the BODY — a reply's quote line holds the quoted text (a URL
                         * there is the TARGET's link again, or one cut with "…"). (An edit keeps `timestamp`, #46 r2 MAJOR-1.) */
                        List<string> links = LinkRule.extract(ReplyQuote.stripForExcerpt(fm.message));
                        for (int k = 0; k < links.Count; k++)
                        {
                            string u = links[k];
                            all.Add(new SharedItem
                            {
                                id = id, n = k, channel = ch, kind = "link", label = u, ts = fm.timestamp, depth = depth,
                                url = Regex.IsMatch(u, "^https?://", RegexOptions.IgnoreCase) ? u : "https://" + u,
                            });
                        }
                    }
                }
            }
            List<SharedItem> items = all.OrderByDescending(x => x.ts).ThenBy(x => x.n).Take(ItemCap).ToList();
            int thumbs = 0;
            int tries = 0;   // (#46 r1 A5) a failed decode counts too — never 200 decodes before the push
            long thumbBytes = 0;
            foreach (SharedItem it in items)
            {
                if (thumbs >= ThumbMaxCount || tries >= ThumbMaxCount || thumbBytes >= ThumbTotalMax)
                {
                    break;
                }
                if (it.kind == "media" && it.path != null)
                {
                    tries++;
                    it.thumb = thumbOf(it.path);
                    if (it.thumb != null)
                    {
                        thumbs++;
                        thumbBytes += it.thumb.Length;
                    }
                }
            }
            lock (cacheLock)
            {
                lastScan[friend.walletAddress.ToString()] = items;
            }
            Logging.info("[SHARED] n={0} read={1} thumbs={2} ms={3}", items.Count, read, thumbs, sw.ElapsedMilliseconds);   // counts only
            return items;
        }

        public static string toJson(List<SharedItem> items)
        {
            // ★ #1166 V-3 (#1154): field 9 = received (1/0), APPENDED — an older shell reads the first 8
            return JsonConvert.SerializeObject(items.Select(x => new object?[] { x.id, x.n, x.kind, x.label, x.size, x.ts, x.local ? 1 : 0, x.thumb, x.received ? 1 : 0 }));
        }

        /* ★ #1166 V-3 (#1154) "Delete from this device": the local copy of a RECEIVED file, resolved by C# from its OWN
         * last scan (the item), re-checked NOW: the ViewerRules rule (received + a local path inside the Downloads root —
         * TransferManager.isInsideDownloadsRoot, the purge rule) AND the file at that path is STILL this message's
         * (fileMatches — a delete + a same-named download reuses the path). A SENT file — the picker's original — is never
         * deleted. No WebView string reaches this method. Off the UI thread (the caller). true = deleted, false = refused;
         * an IO failure THROWS (the caller logs the exception TYPE — this file logs counts only, the #1106 rule). */
        public static bool deleteLocal(SharedItem? item)
        {
            if (item == null || item.message == null || item.message.localSender)
            {
                return false;
            }
            string? p = item.path;
            bool inside = p != null && TransferManager.isInsideDownloadsRoot(p);
            if (!ViewerRules.mayDeleteLocal(item.kind, item.received, p != null, inside) || p == null)
            {
                return false;
            }
            if (!File.Exists(p) || !fileMatches(item.message, p))
            {
                return false;
            }
            File.Delete(p);
            return true;
        }

        /* ★ #1166 V-3 (#1154) "Show in Downloads": the Downloads list's own row key (the stored file NAME — the list is
         * built from Directory.EnumerateFiles(downloadsPath) and keyed by Path.GetFileName) of a RECEIVED file whose local
         * copy sits in the Downloads root; null = not shown there. Never a path. */
        public static string? downloadsNameOf(SharedItem? item)
        {
            try
            {
                if (item == null || item.message == null || item.message.localSender)
                {
                    return null;
                }
                string? p = item.path;
                bool inside = p != null && TransferManager.isInsideDownloadsRoot(p);
                if (!ViewerRules.mayShowInDownloads(item.kind, item.received, p != null, inside) || p == null || !File.Exists(p))
                {
                    return null;
                }
                string name = Path.GetFileName(p);
                return string.IsNullOrEmpty(name) ? null : name;
            }
            catch (Exception)
            {
                return null;
            }
        }

        /** The item the WebView named ("<hex id>:<n>"), from C#'s OWN last scan of this conversation; null = unknown. */
        public static SharedItem? resolve(Friend friend, string token)
        {
            if (friend == null || string.IsNullOrEmpty(token) || token.Length > 200)
            {
                return null;
            }
            int sep = token.LastIndexOf(':');
            string id = sep > 0 ? token.Substring(0, sep) : token;
            int n = 0;
            if (sep > 0 && !int.TryParse(token.Substring(sep + 1), System.Globalization.NumberStyles.None, System.Globalization.CultureInfo.InvariantCulture, out n))
            {
                return null;
            }
            if (id.Length == 0 || !id.All(Uri.IsHexDigit))
            {
                return null;
            }
            lock (cacheLock)
            {
                if (!lastScan.TryGetValue(friend.walletAddress.ToString(), out List<SharedItem>? items))
                {
                    return null;
                }
                return items.FirstOrDefault(x => x.id.Equals(id, StringComparison.OrdinalIgnoreCase) && x.n == n);
            }
        }
    }
}
