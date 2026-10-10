/* ★ S9 (#1244 · #1245 A-6 / A-9 · CONTRACT §1b–§1f) — THE MEDIA FAMILY, the PURE half (scripts/csh: S9MediaTests.cs).
 *
 * What C# decides about a picked / pasted / captured photo, a "Send file" copy, a photo GROUP on the wire and a received
 * file's name — with no MAUI, no Core type and no disk access (except isUnderDir's GetFullPath, a text operation), so the
 * harness EXECUTES every rule. The call sites (SingleChatPage's media region, TransferManager, StreamProcessor.handleFileHeader,
 * the platform pickers / encoders) are MAUI-bound and pinned by scripts/pins-s9/a1-*.mjs.
 *
 * SECURITY (CLAUDE.md ★): every FILE NAME C# writes is made here from C#'s own values (a batch id it generated, a transfer
 * uid it generated, an allow-listed extension) — never a WebView value, never a peer value (a peer's name only ever passes
 * SafeFileName, which yields a plain leaf). The verbs' arguments are validated here (format, range, length) before any use. */
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;

namespace SPIXI
{
    public static class PhotoRules
    {
        // —— limits (#1244 / #1245) ——
        public const int MaxBatch = 10;                         // photos per batch / per group (★ S10: every batch counts 10 slots — keys 0–9)
        public const int MaxEdge = 2048;                        // the sent photo's long edge, px (#1158)
        public const int JpegQuality = 82;                      // the sent photo's JPEG quality (#1158)
        public const int ThumbEdge = 320;                       // the preview-sheet thumbnail's long edge, px
        public const int ThumbMaxBytes = 64 * 1024;             // a bigger thumbnail is not pushed ("" — the shell shows a glyph)
        public const long SourceMax = 20L * 1024 * 1024;        // the decode cap (A-11 / G-6b): a bigger source → mediaError tooBig
        /* ★ S10 P2 (#1253 / #1254): the SEND cap is per tier (free 50 MiB, premium 100 MiB — no tier UI yet, every send site
         * uses Free); the RECEIVE cap is the largest tier, so a premium sender's file is still accepted. */
        public enum FileTier { Free, Premium }
        public const long MaxReceiveBytes = 100L * 1024 * 1024;   // A-9 receive: = maxFileBytes(Premium)

        public static long maxFileBytes(FileTier t)
        {
            return t == FileTier.Premium ? 100L * 1024 * 1024 : 50L * 1024 * 1024;
        }
        public const int MaxCaptionChars = 4096;
        public const int SafeNameMax = 120;

        // —— mediaError codes (CONTRACT §1c) ——
        public const string ErrTooBig = "tooBig";
        public const string ErrDecode = "decode";
        public const string ErrClipboardEmpty = "clipboardEmpty";
        public const string ErrCameraDenied = "cameraDenied";
        public const string ErrTooMany = "tooMany";
        public const string ErrFileTooBig = "fileTooBig";       // 🟡 NOT in the contract list (A1 report): a "Send file" above maxFileBytes(Free)
        public const string ErrStorageDenied = "storageDenied";   // 🟡 #46 r2 n2: Android ≤ 12 storage permission refused for the camera (B1 has its own text)
        public const string StorageDeniedMarker = "storage";      // the PermissionException message Android SFilePicker throws for it
        public const string ErrFileTooBigIn = "fileTooBigIn";   // 🟡 #46 r1 (shell auditor): a RECEIVED offer above MaxReceiveBytes (B1 has its own text)
        public const long MaxPixels = 100L * 1000 * 1000;       // #46 r1 m-10: a source above ~100 MP is never decoded (iOS / Mac read the size first)
        public const int MaxPreviewBytes = 64 * 1024;           // #46 r1 NIT: a header's preview above this is skipped unread (no sender sets one)

        // —— routes + probe cases (#1200 dev probe) ——
        public const string RoutePhoto = "photo";
        public const string RouteFile = "file";
        public const string RouteCamera = "camera";
        public const string RoutePaste = "paste";
        public const string CaseCopy = "copy";
        public const string CaseMissingStorage = "missing-storage";
        public const string CaseMissingData = "missing-data";
        public const string CaseMissingOther = "missing-other";

        public const string SentFolderName = "Sent";
        public const string PendingPrefix = "pending-";

        // ═══ ids + verb arguments ═══

        private static bool isLowerHex(char c)
        {
            return (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f');
        }

        private static bool isHexChar(char c)
        {
            return isLowerHex(c) || (c >= 'A' && c <= 'F');
        }

        /** A C#-generated batch id / group id: exactly 16 lowercase hex characters. */
        public static bool isId16(string? s)
        {
            if (s == null || s.Length != 16)
            {
                return false;
            }
            foreach (char c in s)
            {
                if (!isLowerHex(c))
                {
                    return false;
                }
            }
            return true;
        }

        /** 8 random bytes → the 16-hex id (the caller supplies the bytes — RandomNumberGenerator in the app). */
        public static string idFromBytes(byte[] b)
        {
            if (b == null || b.Length != 8)
            {
                throw new ArgumentException("8 bytes");
            }
            StringBuilder sb = new StringBuilder(16);
            foreach (byte x in b)
            {
                sb.Append(x.ToString("x2", CultureInfo.InvariantCulture));
            }
            return sb.ToString();
        }

        /** A transfer uid C# made (Guid "N"): 32 lowercase hex. */
        public static bool isTransferUid(string? s)
        {
            if (s == null || s.Length != 32)
            {
                return false;
            }
            foreach (char c in s)
            {
                if (!isLowerHex(c))
                {
                    return false;
                }
            }
            return true;
        }

        /** A caption message id as it travels: "" (none) or 1–64 hex characters (case-insensitive; stored lowercase). */
        public static bool isCaptionId(string? s)
        {
            if (s == null)
            {
                return false;
            }
            if (s.Length == 0)
            {
                return true;
            }
            if (s.Length > 64)
            {
                return false;
            }
            foreach (char c in s)
            {
                if (!isHexChar(c))
                {
                    return false;
                }
            }
            return true;
        }

        /** `<keys>` of mediaSend: a comma list of single digits "0".."9", distinct, each < batchCount, 1..MaxBatch of them.
         *  Returns the indexes IN THE GIVEN ORDER, or null when anything is off (the whole verb is refused). */
        public static List<int>? parseKeys(string? keys, int batchCount)
        {
            if (string.IsNullOrEmpty(keys) || keys.Length > 2 * MaxBatch)
            {
                return null;
            }
            string[] parts = keys.Split(',');
            if (parts.Length < 1 || parts.Length > MaxBatch)
            {
                return null;
            }
            List<int> l = new List<int>(parts.Length);
            foreach (string p in parts)
            {
                if (p.Length != 1 || p[0] < '0' || p[0] > '9')
                {
                    return null;
                }
                int k = p[0] - '0';
                if (k >= batchCount || l.Contains(k))
                {
                    return null;
                }
                l.Add(k);
            }
            return l;
        }

        /** The caption of mediaSend: base64url (no padding needed) of UTF-8 text. "" → "". Invalid characters, invalid
         *  UTF-8 or more than MaxCaptionChars characters after the decode → null (the verb is refused). Trimmed like onSend. */
        public static string? decodeCaption(string? b64url)
        {
            if (b64url == null)
            {
                return null;
            }
            if (b64url.Length == 0)
            {
                return "";
            }
            // 4096 UTF-16 units are at most 4096 × 3 UTF-8 bytes (a surrogate pair = 2 units → 4 bytes) → ≤ 16 388 base64 chars
            if (b64url.Length > ((MaxCaptionChars * 3 + 2) / 3) * 4 + 4)
            {
                return null;
            }
            // ★ lead merge: the chat shell keeps the '=' padding (B1) — accept at most 2 trailing '=' and drop them here
            string body = b64url.EndsWith("==", StringComparison.Ordinal) ? b64url.Substring(0, b64url.Length - 2)
                : b64url.EndsWith("=", StringComparison.Ordinal) ? b64url.Substring(0, b64url.Length - 1) : b64url;
            if (body.Length == 0)
            {
                return null;   // ★ S9 A1 r1: padding alone is not a caption
            }
            StringBuilder sb = new StringBuilder(body.Length + 3);
            foreach (char c in body)
            {
                if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9'))
                {
                    sb.Append(c);
                }
                else if (c == '-')
                {
                    sb.Append('+');
                }
                else if (c == '_')
                {
                    sb.Append('/');
                }
                else
                {
                    return null;
                }
            }
            if (sb.Length % 4 == 1)
            {
                return null;
            }
            while (sb.Length % 4 != 0)
            {
                sb.Append('=');
            }
            try
            {
                byte[] raw = Convert.FromBase64String(sb.ToString());
                string text = new UTF8Encoding(false, true).GetString(raw);
                text = text.Trim(new char[] { ' ', '\t', '\r', '\n' });
                return text.Length <= MaxCaptionChars ? text : null;
            }
            catch (Exception)
            {
                return null;
            }
        }

        /** `ixian:mediaSend:<batchId>:<keys>:<captionB64url>` after the prefix → its three parts, validated (keys against
         *  the batch's own item count). False = refuse. */
        public static bool parseMediaSend(string? payload, int batchCount, out string batchId, out List<int> keys, out string caption)
        {
            batchId = "";
            keys = new List<int>();
            caption = "";
            if (payload == null || payload.Length > 22000)
            {
                return false;
            }
            string[] parts = payload.Split(':');
            if (parts.Length != 3 || !isId16(parts[0]))
            {
                return false;
            }
            List<int>? k = parseKeys(parts[1], batchCount);
            string? c = decodeCaption(parts[2]);
            if (k == null || c == null)
            {
                return false;
            }
            batchId = parts[0];
            keys = k;
            caption = c;
            return true;
        }

        /** The batch id inside a mediaSend payload (to find the batch before its count is known); null when malformed. */
        public static string? batchIdOfSend(string? payload)
        {
            if (payload == null)
            {
                return null;
            }
            int sep = payload.IndexOf(':');
            string id = sep >= 0 ? payload.Substring(0, sep) : payload;
            return isId16(id) ? id : null;
        }

        // ═══ the group (the FileTransfer trailer · addFile arg 18 · SPhotoGroups) ═══

        /** The trailer / group values a receiver accepts: gid 16 hex, 0 ≤ index < count ≤ MaxBatch, captionId "" or ≤ 64 hex. */
        public static bool trailerOk(string? gid, int index, int count, string? captionId)
        {
            return isId16(gid) && index >= 0 && count >= 1 && index < count && count <= MaxBatch && isCaptionId(captionId);
        }

        /** addFile arg 18: "<gid>|<index>|<count>|<captionIdHex>", or "" when the values are not a valid group. */
        public static string groupArg(string? gid, int index, int count, string? captionId)
        {
            if (!trailerOk(gid, index, count, captionId))
            {
                return "";
            }
            return gid + "|" + index.ToString(CultureInfo.InvariantCulture) + "|" + count.ToString(CultureInfo.InvariantCulture)
                + "|" + captionId!.ToLowerInvariant();
        }

        /** Parse a groupArg string back; false when it is not exactly a valid one. */
        public static bool parseGroupArg(string? s, out string gid, out int index, out int count, out string captionId)
        {
            gid = "";
            index = 0;
            count = 0;
            captionId = "";
            if (string.IsNullOrEmpty(s))
            {
                return false;
            }
            string[] p = s.Split('|');
            if (p.Length != 4
                || !int.TryParse(p[1], NumberStyles.None, CultureInfo.InvariantCulture, out int i)
                || !int.TryParse(p[2], NumberStyles.None, CultureInfo.InvariantCulture, out int n)
                || !trailerOk(p[0], i, n, p[3])
                || p[1] != i.ToString(CultureInfo.InvariantCulture) || p[2] != n.ToString(CultureInfo.InvariantCulture))
            {
                return false;
            }
            gid = p[0];
            index = i;
            count = n;
            captionId = p[3].ToLowerInvariant();
            return true;
        }

        // ═══ file names ═══

        private static readonly HashSet<string> sentExtensions = new HashSet<string>(StringComparer.Ordinal)
        {
            ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".bmp",
            ".mp4", ".mov", ".m4v", ".webm", ".3gp", ".mkv", ".avi", ".wmv",
            ".mp3", ".m4a", ".aac", ".ogg", ".opus", ".wav", ".flac",
            ".pdf", ".txt", ".csv", ".json", ".rtf", ".epub",
            ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".ods", ".odp",
            ".zip", ".7z", ".rar",
        };

        private static readonly HashSet<string> videoExtensions = new HashSet<string>(StringComparer.Ordinal)
        {
            ".mp4", ".mov", ".m4v", ".webm", ".3gp", ".mkv", ".avi", ".wmv",
        };

        /** The extension of a name, lowercase with the dot ("" when none). Text only — never a path operation. */
        public static string extensionOf(string? name)
        {
            if (string.IsNullOrEmpty(name))
            {
                return "";
            }
            int slash = Math.Max(name.LastIndexOf('/'), name.LastIndexOf('\\'));
            int dot = name.LastIndexOf('.');
            if (dot <= slash + 1 || dot == name.Length - 1)
            {
                return "";
            }
            return name.Substring(dot).ToLowerInvariant();
        }

        /** The extension C# gives its durable "Send file" copy: an allow-listed one, else "" (no extension). */
        public static string sentExtension(string? pickedName)
        {
            string ext = extensionOf(pickedName);
            return sentExtensions.Contains(ext) ? ext : "";
        }

        /** Is this file (by its name) a video — the #1138 (16) location notice after "Send file". */
        public static bool isVideoName(string? name)
        {
            return videoExtensions.Contains(extensionOf(name));
        }

        /** The durable copy's leaf name: "<transferUid><ext>" (ext from sentExtension or ".jpg"); null when the uid is not C#'s. */
        public static string? sentFileName(string? transferUid, string? ext)
        {
            if (!isTransferUid(transferUid) || ext == null || (ext.Length > 0 && !sentExtensions.Contains(ext)))
            {
                return null;
            }
            return transferUid + ext;
        }

        /** A prepared (not yet sent) photo's leaf name: "pending-<batchId>-<k><ext>", ext ".jpg" (the photo) or ".src" (the
         *  bounded source copy); null when the values are not C#'s. */
        public static string? pendingFileName(string? batchId, int k, string ext)
        {
            if (!isId16(batchId) || k < 0 || k >= MaxBatch || (ext != ".jpg" && ext != ".src"))
            {
                return null;
            }
            return PendingPrefix + batchId + "-" + k.ToString(CultureInfo.InvariantCulture) + ext;
        }

        /** Is a leaf name one of OUR pending files (the startup sweep deletes exactly these)? */
        public static bool isPendingName(string? name)
        {
            if (name == null || name.Length != PendingPrefix.Length + 16 + 2 + 4 || !name.StartsWith(PendingPrefix, StringComparison.Ordinal))
            {
                return false;
            }
            string id = name.Substring(PendingPrefix.Length, 16);
            int at = PendingPrefix.Length + 16;
            string ext = name.Substring(at + 2);
            return isId16(id) && name[at] == '-' && name[at + 1] >= '0' && name[at + 1] <= '9' && (ext == ".jpg" || ext == ".src");
        }

        /** ★ #46 r2 n2: the mediaError code of a camera failure — a permission refusal whose message is the storage marker
         *  (Android ≤ 12) → storageDenied; any other refusal / no camera → cameraDenied. */
        public static string cameraErrorCode(bool isPermissionRefusal, string? message)
        {
            return isPermissionRefusal && message == StorageDeniedMarker ? ErrStorageDenied : ErrCameraDenied;
        }

        /** ★ #46 r2 m2: which Sent/ leaves an orphan sweep deletes. NOTHING unless every history was read COMPLETELY (a read
         *  failure or a partial file makes "not named" meaningless); then only sent-copy names no history names, at least
         *  minAgeSeconds old. */
        public static List<string> sentSweepVictims(IEnumerable<KeyValuePair<string, double>> leavesWithAgeSeconds, ICollection<string> named,
            bool historiesComplete, double minAgeSeconds)
        {
            List<string> l = new List<string>();
            if (!historiesComplete)
            {
                return l;
            }
            foreach (KeyValuePair<string, double> it in leavesWithAgeSeconds)
            {
                if (isSentCopyName(it.Key) && !named.Contains(it.Key) && it.Value >= minAgeSeconds)
                {
                    l.Add(it.Key);
                }
            }
            return l;
        }

        /** ★ #46 r3 MAJOR: the leaf of a recorded SENT-copy path — its leaf is a sent-copy name AND its parent folder is named
         *  "Sent" — whatever root it was recorded under (iOS moves the app container on an update, so an absolute path from
         *  send time can name an old root). Text only, both separators; null for anything else (a picker path, a bare name). */
        public static string? sentLeafOf(string? recordedPath)
        {
            if (string.IsNullOrEmpty(recordedPath))
            {
                return null;
            }
            string[] seg = recordedPath.Split(new[] { '/', '\\' });
            if (seg.Length < 2)
            {
                return null;
            }
            string leaf = seg[seg.Length - 1];
            string parent = seg[seg.Length - 2];
            return parent == SentFolderName && isSentCopyName(leaf) ? leaf : null;
        }

        /** ★ #46 r3 MAJOR: a recorded sent-copy path re-rooted into TODAY's Sent folder (null when it is not one). */
        public static string? rerootSent(string? recordedPath, string sentDir)
        {
            string? leaf = sentLeafOf(recordedPath);
            return leaf == null || string.IsNullOrEmpty(sentDir) ? null : Path.Combine(sentDir, leaf);
        }

        /** ★ #46 r1 m-3: is a leaf name one of C#'s durable SENT copies ("<32 lowercase hex>" + "" or an allow-listed ext)? The
         *  orphan sweep deletes only these (and only direct children of Sent/). */
        public static bool isSentCopyName(string? name)
        {
            if (name == null || name.Length < 32 || !isTransferUid(name.Substring(0, 32)))
            {
                return false;
            }
            string ext = name.Substring(32);
            return ext.Length == 0 || (sentExtensions.Contains(ext) && ext == ext.ToLowerInvariant());
        }

        /** ★ #46 r1 (tests auditor): the prepared files a batch leaves behind — every item path whose key is not kept, in item
         *  order (mediaSend: the removed ones; a drop / cancel / teardown: keep = none → all). */
        public static List<string> pathsToDelete(IList<KeyValuePair<int, string>> items, ICollection<int>? keep)
        {
            List<string> l = new List<string>();
            foreach (KeyValuePair<int, string> it in items)
            {
                if ((keep == null || !keep.Contains(it.Key)) && !string.IsNullOrEmpty(it.Value))
                {
                    l.Add(it.Value);
                }
            }
            return l;
        }

        /** ★ #46 r1 m-10: decode only a source of ≤ MaxPixels (unknown dims → true: the bounded decoder decides). */
        public static bool pixelsOk(long width, long height)
        {
            return width <= 0 || height <= 0 || width * height <= MaxPixels;
        }

        /** ★ #46 r1 NIT: may the header reader allocate a preview of this length? (0 / negative = none.) */
        public static bool previewLengthOk(int length)
        {
            return length > 0 && length <= MaxPreviewBytes;
        }

        /** ★ #46 r1 m-4: the group of the photos that SURVIVED the move — index = position among the survivors, count = their
         *  number; grouped when more than one survived or a caption goes with them. */
        public static bool groupedAfter(int survivors, bool hasCaption)
        {
            return survivors > 1 || (survivors == 1 && hasCaption);
        }

        /** ★ #46 r1 (tests auditor C1–C5, C12): copy at most cap bytes of `src` into a NEW file `dest`. Returns the length, or
         *  -1 when the source is longer than cap. On -1 and on ANY exception the partial file is deleted (never kept);
         *  `readFailed` says which side threw (the #1200 probe). Moved here from SingleChatPage so csh executes it. */
        public static long copyBounded(Stream src, string dest, long cap, out bool readFailed)
        {
            readFailed = false;
            long total = 0;
            bool keep = false;
            bool created = false;   // a dest that already existed (CreateNew threw) is never deleted here
            try
            {
                using (FileStream fs = new FileStream(dest, FileMode.CreateNew, FileAccess.Write, FileShare.None))
                {
                    created = true;
                    byte[] buf = new byte[81920];
                    while (true)
                    {
                        int n;
                        try
                        {
                            n = src.Read(buf, 0, buf.Length);
                        }
                        catch (Exception)
                        {
                            readFailed = true;
                            throw;
                        }
                        if (n <= 0)
                        {
                            break;
                        }
                        total += n;
                        if (total > cap)
                        {
                            break;
                        }
                        fs.Write(buf, 0, n);
                    }
                }
                keep = total <= cap;
            }
            finally
            {
                if (created && !keep)
                {
                    try { File.Delete(dest); } catch (Exception) { }
                }
            }
            return total > cap ? -1 : total;
        }

        /** The name the PEER sees for a sent photo: "photo-<yyyyMMdd-HHmmss>[-<n>].jpg" (n = index + 1 in a group of > 1). */
        public static string photoName(DateTime utc, int index, int count)
        {
            string stamp = utc.ToString("yyyyMMdd-HHmmss", CultureInfo.InvariantCulture);
            return "photo-" + stamp + (count > 1 ? "-" + (index + 1).ToString(CultureInfo.InvariantCulture) : "") + ".jpg";
        }

        /** A received file's part file (C#'s own name, never the peer's name or uid). */
        public static string partFileName(string guidN)
        {
            return "incoming-" + guidN + ".ixipart";
        }

        private static readonly string[] reservedWindowsNames =
        {
            "CON", "PRN", "AUX", "NUL", "CONIN$", "CONOUT$",
            "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "COM\u00B9", "COM\u00B2", "COM\u00B3",
            "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9", "LPT\u00B9", "LPT\u00B2", "LPT\u00B3",
        };

        private static bool isDroppedChar(char c)
        {
            return c < 0x20 || c == 0x7F
                || (c >= '\u0080' && c <= '\u009F')                 // C1 controls
                || (c >= '\u200B' && c <= '\u200F')                 // zero-width + LRM / RLM
                || (c >= '\u202A' && c <= '\u202E')                 // bidi embeddings / overrides ("gpj.exe" spoofing)
                || (c >= '\u2066' && c <= '\u2069')                 // bidi isolates
                || c == '\uFEFF';
        }

        /** A-6: the stored name of a RECEIVED file — a plain leaf on every OS. Path separators and Windows-invalid characters
         *  → '_'; control / bidi / zero-width characters dropped; ".." removed; leading and trailing dots / spaces trimmed;
         *  a reserved Windows device name gets a leading '_'; ≤ SafeNameMax characters (the extension kept when it is short;
         *  a surrogate pair never split); empty → "file". */
        public static string SafeFileName(string? name)
        {
            if (string.IsNullOrEmpty(name))
            {
                return "file";
            }
            StringBuilder sb = new StringBuilder(Math.Min(name.Length, 512));
            int n = 0;
            foreach (char c in name)
            {
                if (++n > 4096)
                {
                    break;   // a hostile name is not walked forever
                }
                if (isDroppedChar(c))
                {
                    continue;
                }
                if (c == '/' || c == '\\' || c == ':' || c == '*' || c == '?' || c == '"' || c == '<' || c == '>' || c == '|')
                {
                    sb.Append('_');
                    continue;
                }
                sb.Append(c);
            }
            string s = sb.ToString();
            while (s.Contains(".."))
            {
                s = s.Replace("..", ".");
            }
            s = s.Trim(' ', '.');
            if (s.Length == 0)
            {
                return "file";
            }
            int firstDot = s.IndexOf('.');
            string stem = firstDot >= 0 ? s.Substring(0, firstDot) : s;
            foreach (string r in reservedWindowsNames)
            {
                if (string.Equals(stem.TrimEnd(' '), r, StringComparison.OrdinalIgnoreCase))
                {
                    s = "_" + s;
                    break;
                }
            }
            if (s.Length > SafeNameMax)
            {
                string ext = extensionOf(s);
                if (ext.Length == 0 || ext.Length > 16)
                {
                    ext = "";
                }
                int keep = SafeNameMax - ext.Length;
                if (char.IsHighSurrogate(s[keep - 1]))
                {
                    keep--;
                }
                s = s.Substring(0, keep).TrimEnd(' ', '.') + ext;
                if (s.Length == 0 || s == ext)
                {
                    s = "file" + ext;
                }
            }
            return s;
        }

        /** The n-th collision name: "name (n).ext" (n ≥ 1). */
        public static string collisionName(string safeName, int n)
        {
            string ext = extensionOf(safeName);
            string stem = ext.Length > 0 ? safeName.Substring(0, safeName.Length - ext.Length) : safeName;
            return stem + " (" + n.ToString(CultureInfo.InvariantCulture) + ")" + ext;
        }

        /** Is `path` a file strictly INSIDE `dir` (both made absolute; text compare after GetFullPath)? Fail-closed. */
        public static bool isUnderDir(string? path, string? dir)
        {
            if (string.IsNullOrEmpty(path) || string.IsNullOrEmpty(dir) || !Path.IsPathRooted(path) || !Path.IsPathRooted(dir))
            {
                return false;
            }
            try
            {
                string root = Path.TrimEndingDirectorySeparator(Path.GetFullPath(dir));
                string full = Path.GetFullPath(path);
                return full.Length > root.Length + 1 && full.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.Ordinal)
                    && full.IndexOf(Path.DirectorySeparatorChar, root.Length + 1) < 0;
            }
            catch (Exception)
            {
                return false;
            }
        }

        /** Win32 GetOpenFileNameW with OFN_ALLOWMULTISELECT | OFN_EXPLORER: the buffer is "path\0\0" (one file) or
         *  "dir\0name1\0name2\0\0". Returns the full paths (≤ max; a name with a separator is skipped). */
        public static List<string> parseMultiSelect(string? buffer, int max)
        {
            List<string> l = new List<string>();
            if (string.IsNullOrEmpty(buffer))
            {
                return l;
            }
            List<string> parts = new List<string>();
            foreach (string part in buffer.Split('\0'))
            {
                if (part.Length == 0)
                {
                    break;   // the (double) NUL that ends the list
                }
                parts.Add(part);
            }
            if (parts.Count == 0)
            {
                return l;
            }
            if (parts.Count == 1)
            {
                l.Add(parts[0]);
                return l;
            }
            for (int i = 1; i < parts.Count && l.Count < max; i++)
            {
                string name = parts[i];
                if (name.IndexOf('/') >= 0 || name.IndexOf('\\') >= 0 || name == ".." || name == ".")
                {
                    continue;
                }
                l.Add(Path.Combine(parts[0], name));
            }
            return l;
        }

        // ═══ the decode / encode helpers ═══

        /** Android BitmapFactory InSampleSize (#1244 fix): the largest power of two that keeps the decoded LONG side ≥ maxEdge,
         *  stopping early once the decoded long side is ≤ cap (= max(maxEdge, min(2 × maxEdge, 2048))). So a 2048 output is
         *  never scaled UP from a smaller decode, and the decode stays < 2 × maxEdge on the long side. */
        public static int decodeSample(int longSide, int maxEdge)
        {
            if (longSide <= 0 || maxEdge <= 0)
            {
                return 1;
            }
            int cap = Math.Max(maxEdge, Math.Min(maxEdge * 2, MaxEdge));
            int s = 1;
            while (longSide / (s * 2) >= maxEdge && longSide / s > cap && s < (1 << 20))
            {
                s *= 2;
            }
            return s;
        }

        /** Width × height of a JPEG from its SOF segment; false when the bytes are not a readable JPEG header. */
        public static bool jpegSize(byte[]? b, out int width, out int height)
        {
            width = 0;
            height = 0;
            if (b == null || b.Length < 4 || b[0] != 0xFF || b[1] != 0xD8)
            {
                return false;
            }
            int i = 2;
            while (i + 3 < b.Length)
            {
                if (b[i] != 0xFF)
                {
                    return false;
                }
                byte m = b[i + 1];
                if (m == 0xFF)
                {
                    i++;   // fill byte
                    continue;
                }
                if (m == 0x01 || (m >= 0xD0 && m <= 0xD7))
                {
                    i += 2;   // no length
                    continue;
                }
                if (m == 0xD9 || m == 0xDA)
                {
                    return false;   // end / scan before a frame header
                }
                int len = (b[i + 2] << 8) | b[i + 3];
                if (len < 2)
                {
                    return false;
                }
                bool sof = m >= 0xC0 && m <= 0xCF && m != 0xC4 && m != 0xC8 && m != 0xCC;
                if (sof)
                {
                    if (i + 8 >= b.Length)
                    {
                        return false;
                    }
                    height = (b[i + 5] << 8) | b[i + 6];
                    width = (b[i + 7] << 8) | b[i + 8];
                    return width > 0 && height > 0;
                }
                i += 2 + len;
            }
            return false;
        }

        /** A thumbnail a mediaPicked item may carry. */
        public static bool thumbOk(int length)
        {
            return length > 0 && length <= ThumbMaxBytes;
        }

        /** Size in KB for the sheet (rounded up; 0 bytes → 0). */
        public static long kbOf(long bytes)
        {
            return bytes <= 0 ? 0 : (bytes + 1023) / 1024;
        }

        // ═══ the pushes ═══

        public sealed class PickedItem
        {
            public string k = "";
            public string thumb = "";   // "data:image/jpeg;base64,…" or ""
            public int w;
            public int h;
            public long kb;
            public string kind = "photo";
            /* ★ S15 F (#1302, Damir 2026-10-10): a PLACEHOLDER tile — the photo is picked but not prepared yet (tiles at once);
               pickedJson writes `"pending":"1"` for it and nothing for a ready photo (a ready list is byte-identical to S14). */
            public bool pending = false;
        }

        private static void appendJsonString(StringBuilder sb, string s)
        {
            sb.Append('"');
            foreach (char c in s)
            {
                switch (c)
                {
                    case '"': sb.Append("\\\""); break;
                    case '\\': sb.Append("\\\\"); break;
                    case '<': sb.Append("\\u003c"); break;
                    case '>': sb.Append("\\u003e"); break;
                    case '&': sb.Append("\\u0026"); break;
                    case '\'': sb.Append("\\u0027"); break;
                    default:
                        if (c < 0x20 || c == '\u2028' || c == '\u2029')
                        {
                            sb.Append("\\u").Append(((int)c).ToString("x4", CultureInfo.InvariantCulture));
                        }
                        else
                        {
                            sb.Append(c);
                        }
                        break;
                }
            }
            sb.Append('"');
        }

        /** mediaPicked's json: [{"k":"0","thumb":"…","w":"1600","h":"1200","kb":"412","kind":"photo"}] (all strings, ≤ MaxBatch). */
        public static string pickedJson(IList<PickedItem> items)
        {
            StringBuilder sb = new StringBuilder(256);
            sb.Append('[');
            int n = 0;
            foreach (PickedItem it in items)
            {
                if (n >= MaxBatch)
                {
                    break;
                }
                if (n > 0)
                {
                    sb.Append(',');
                }
                sb.Append("{\"k\":");
                appendJsonString(sb, it.k);
                sb.Append(",\"thumb\":");
                appendJsonString(sb, it.thumb.StartsWith("data:image/jpeg;base64,", StringComparison.Ordinal) ? it.thumb : "");
                sb.Append(",\"w\":");
                appendJsonString(sb, Math.Max(0, it.w).ToString(CultureInfo.InvariantCulture));
                sb.Append(",\"h\":");
                appendJsonString(sb, Math.Max(0, it.h).ToString(CultureInfo.InvariantCulture));
                sb.Append(",\"kb\":");
                appendJsonString(sb, Math.Max(0, it.kb).ToString(CultureInfo.InvariantCulture));
                sb.Append(",\"kind\":");
                appendJsonString(sb, "photo");   // v1: photos only (#1244 — no video in the picker)
                if (it.pending)
                {
                    sb.Append(",\"pending\":\"1\"");   // ★ S15 F (#1302, Damir 2026-10-10): 🟡 the one new item field — a placeholder tile
                }
                sb.Append('}');
                n++;
            }
            sb.Append(']');
            return sb.ToString();
        }

        /** The #1200 dev probe body (P1Perf.line adds "[P1] "): fixed words only; null for an unknown route / case. */
        public static string? probeLine(string route, string caseWord)
        {
            bool r = route == RoutePhoto || route == RouteFile || route == RouteCamera || route == RoutePaste;
            bool c = caseWord == CaseCopy || caseWord == CaseMissingStorage || caseWord == CaseMissingData || caseWord == CaseMissingOther;
            return r && c ? "sendpath route=" + route + " case=" + caseWord : null;
        }

        /** Which probe case an exception in the copy step is: a source read failure → missing-data; a write failure that is
         *  an IOException / UnauthorizedAccessException → missing-storage; anything else → missing-other. */
        public static string copyFailureCase(bool duringRead, Exception? e)
        {
            if (duringRead)
            {
                return CaseMissingData;
            }
            if (e is IOException || e is UnauthorizedAccessException)
            {
                return CaseMissingStorage;
            }
            return CaseMissingOther;
        }
    }
}
