/* ★ S11 G (#1258 + #1263 a / c) — the PURE half of the photo preview IN THE OFFER, the album's size argument and the
 * viewer's Save verb (scripts/csh: S11MediaTests.cs). No MAUI, no Core type, no disk — the harness executes every rule.
 * The call sites (SingleChatPage: prepareBatch → the sender's preview, sendPreparedFile → the FileTransfer `preview`,
 * insertMessage → addFile arg 20 + the offer-preview push, `ixian:savePhoto:`; StreamProcessor.handleFileHeader → the
 * received preview into OfferPreviewCache) are MAUI-bound — scripts/pins-s11/g-cs.mjs.
 *
 * SECURITY (CLAUDE.md ★; docs/security-handover-gate.md "S11 G"):
 *   · SENDER: the preview is re-encoded from DECODED PIXELS of C#'s own prepared photo (Spixi.SThumbnail.makeViewerJpeg —
 *     no metadata on any of the 4 encoders, the S9 pin), ≤ OfferPreviewMaxBytes, long edge ≤ OfferPreviewEdges[0]; a photo
 *     whose preview does not fit at any rung of the ladder gets NONE (never a bigger one); never for a non-photo.
 *   · RECEIVER: the peer's bytes are length-checked (≤ OfferPreviewMaxBytes — the wire reader's own cap is 64 KB,
 *     PhotoRules.previewLengthOk), must be a JPEG by their first bytes AND by a parsed frame header with a sane size
 *     (offerPreviewAccept) before they are kept (in memory only, bounded: OfferPreviewCache); before the shell sees one
 *     they are RE-ENCODED through the bounded platform decoder (the same makeViewerJpeg) — the WebView never decodes the
 *     peer's bytes — and pushed only while "Load pictures and GIFs" (the SAutoDownload mirror) AND photo previews are on
 *     (offerPreviewPushOk). The push carries the message id + a data: JPEG — never a path, a name or an address.
 *   · ixian:savePhoto:<hex> carries a message id only (parseSavePhoto — the viewImage grammar); C# resolves its own file.
 *   · ★ S11 G3 (#1263 round-3): the push also needs the auto-download CONTACT rule (MINOR-4) · the re-encodes run on ONE
 *     serial worker over a bounded queue (SerialQueue, MINOR-5) · setEncoded keeps the 2 MB bound (NIT-5) · the worker's
 *     start-up sweep deletes only C#'s own temp leaves (isOfferTempName) · Android Save names the image MIME (imageMimeOf,
 *     MINOR-8). */
using System;
using System.Collections.Generic;

namespace SPIXI
{
    public static class S11MediaRules
    {
        // —— the preview in the offer (#1258) ——

        /** The preview's byte cap — sender AND receiver (Damir #1258: "≤ 8 KB"). */
        public const int OfferPreviewMaxBytes = 8 * 1024;

        /** The sender's ladder: the long edge tried first (~96 px, #1258), then smaller ones until the JPEG fits the cap. */
        public static readonly int[] OfferPreviewEdges = { 96, 72, 56 };

        /** A received preview larger than this on either side is refused before any decode (the ladder's largest rung is
         *  96 — a peer's "preview" of 4000 × 4000 in 8 KB is not one). */
        public const int OfferPreviewMaxPx = 256;

        /** A JPEG of at most OfferPreviewMaxBytes whose frame header names a size of 1…maxPx on both sides. */
        public static bool previewShapeOk(byte[]? jpeg, int maxPx)
        {
            if (jpeg == null || jpeg.Length < 4 || jpeg.Length > OfferPreviewMaxBytes)
            {
                return false;
            }
            if (!PhotoRules.jpegSize(jpeg, out int w, out int h))
            {
                return false;
            }
            return w > 0 && h > 0 && w <= maxPx && h <= maxPx;
        }

        /** SENDER: the first rung of the ladder whose encode (encode(edge) → a JPEG of the prepared photo with that long
         *  edge, or null) fits the cap with a valid header ≤ that edge; else null (the offer carries no preview). An encoder
         *  that throws counts as a miss. */
        public static byte[]? pickOfferPreview(Func<int, byte[]?> encode)
        {
            if (encode == null)
            {
                return null;
            }
            foreach (int edge in OfferPreviewEdges)
            {
                byte[]? b;
                try
                {
                    b = encode(edge);
                }
                catch (Exception)
                {
                    b = null;
                }
                if (previewShapeOk(b, edge))
                {
                    return b;
                }
            }
            return null;
        }

        /** RECEIVER: a peer's offer preview is kept only when it is a JPEG by its first bytes (ImageSniff — the 16-byte head
         *  every decoder entry of this app checks) AND by its frame header, within the byte cap and OfferPreviewMaxPx. */
        public static bool offerPreviewAccept(byte[]? peerBytes)
        {
            if (peerBytes == null || peerBytes.Length < 16 || peerBytes.Length > OfferPreviewMaxBytes)
            {
                return false;
            }
            byte[] head = new byte[16];
            Array.Copy(peerBytes, head, 16);
            if (!ImageSniff.looksLikeImage(head))
            {
                return false;
            }
            return previewShapeOk(peerBytes, OfferPreviewMaxPx);
        }

        /** The shell gets an offer's preview only while BOTH switches are on ("Load pictures and GIFs" — the C# mirror —
         *  and "Show photo previews"), for a RECEIVED file not on this device yet that has an image name.
         *  ★ S11 G3 (#1263 MINOR-4, the lead's decision 🟡): AND only when the CONTACT half of the auto-download rule passes
         *  (`contactOk` = S11ChatRules.contactOkForAuto: an approved 1:1 contact, not pending / being deleted; a group only
         *  with visible participants and an approved sender contact; never a bot room) — a stranger's picture is never drawn
         *  without a tap; that tile keeps today's file face. */
        public static bool offerPreviewPushOk(bool loadPictures, bool photoPreviews, bool localSender, bool completed, bool isImageName, bool contactOk)
        {
            return loadPictures && photoPreviews && !localSender && !completed && isImageName && contactOk;
        }

        // —— ★ S11 G3 (#1263 MINOR-5 / NIT-5): the re-encode worker's pure parts ——

        /** At most this many re-encodes wait for the one serial worker (a burst beyond it is NOT queued — its sent-key is
         *  forgotten, so a later document asks again). */
        public const int OfferPreviewQueueMax = 64;

        /** The worker waits at most this long for the process's one decode gate (awaited — no pool thread parks). */
        public const int OfferPreviewGateMs = 10000;

        public const string OfferTempPrefix = "spixi-offer-";

        /** C#'s own temp leaf for one re-encode: the prefix + a Guid "N" (32 lower-case hex) + ".jpg". */
        public static string offerTempName(string guidN)
        {
            return OfferTempPrefix + guidN + ".jpg";
        }

        /** The worker's start-up sweep deletes ONLY leaves of exactly offerTempName's shape (never another file of the
         *  cache folder that merely starts with the prefix). */
        public static bool isOfferTempName(string? leaf)
        {
            if (leaf == null || leaf.Length != OfferTempPrefix.Length + 32 + 4
                || !leaf.StartsWith(OfferTempPrefix, StringComparison.Ordinal) || !leaf.EndsWith(".jpg", StringComparison.Ordinal))
            {
                return false;
            }
            for (int i = OfferTempPrefix.Length; i < OfferTempPrefix.Length + 32; i++)
            {
                char c = leaf[i];
                if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f')))
                {
                    return false;
                }
            }
            return true;
        }

        /// <summary>
        /// ★ S11 G3 (#1263 MINOR-5): a BOUNDED queue drained by ONE worker. `enqueue` says whether the caller must start the
        /// worker (nobody drains it now); `next` hands the worker its next item, or — under the same lock — marks the worker
        /// stopped when the queue is empty, so an item enqueued a moment later starts a new one (never two at once, never
        /// an item left with no worker). Thread-safe.
        /// </summary>
        public sealed class SerialQueue<T>
        {
            private readonly Queue<T> q = new Queue<T>();
            private readonly object gate = new object();
            private readonly int max;
            private bool running = false;

            public SerialQueue(int max)
            {
                this.max = max < 1 ? 1 : max;
            }

            public int Count { get { lock (gate) { return q.Count; } } }
            public bool Running { get { lock (gate) { return running; } } }

            /** false = full (nothing queued). true = queued; startWorker = the caller must start the one worker. */
            public bool enqueue(T item, out bool startWorker)
            {
                lock (gate)
                {
                    startWorker = false;
                    if (q.Count >= max)
                    {
                        return false;
                    }
                    q.Enqueue(item);
                    if (!running)
                    {
                        running = true;
                        startWorker = true;
                    }
                    return true;
                }
            }

            /** The worker's next item; false = empty → the worker is marked stopped and must return. */
            public bool next(out T item)
            {
                lock (gate)
                {
                    if (q.Count == 0)
                    {
                        running = false;
                        item = default!;
                        return false;
                    }
                    item = q.Dequeue();
                    return true;
                }
            }
        }

        /** addFile arg 20 (#1263 a): the size in bytes for a RECEIVED file not on this device yet, "" otherwise. */
        public static string offerSizeArg(bool localSender, bool completed, ulong size)
        {
            if (localSender || completed || size == 0)
            {
                return "";
            }
            return size.ToString(System.Globalization.CultureInfo.InvariantCulture);
        }

        /** The cache key: the peer (the chat) + the message id hex (lower case) — a preview is never shown in another chat. */
        public static string offerKey(string peer, string msgHex)
        {
            return (peer ?? "") + "|" + (msgHex ?? "").ToLowerInvariant();
        }

        /// <summary>
        /// The received previews, IN MEMORY only (no disk, no store — gone at a restart: an offer then shows the file face).
        /// Bounded twice: at most MaxEntries entries AND MaxBytes bytes in all (oldest out first). Thread-safe (the network
        /// thread puts, a pool thread reads). A key already present keeps its FIRST value (a peer cannot swap a preview by
        /// re-sending the header). `encoded` = C#'s own re-encode of it (set once, after the bounded decode).
        /// </summary>
        public sealed class OfferPreviewCache
        {
            public const int MaxEntries = 256;
            public const int MaxBytes = 2 * 1024 * 1024;

            private sealed class Entry
            {
                public byte[] raw = Array.Empty<byte>();
                public string? encoded = null;
            }

            private readonly object gate = new object();
            private readonly Dictionary<string, Entry> map = new Dictionary<string, Entry>();
            private readonly LinkedList<string> order = new LinkedList<string>();
            private long bytes = 0;

            public int Count { get { lock (gate) { return map.Count; } } }
            public long Bytes { get { lock (gate) { return bytes; } } }

            /** true when stored (a new key with an accepted preview). */
            public bool put(string key, byte[]? peerBytes)
            {
                if (string.IsNullOrEmpty(key) || !offerPreviewAccept(peerBytes))
                {
                    return false;
                }
                lock (gate)
                {
                    if (map.ContainsKey(key))
                    {
                        return false;   // first writer wins
                    }
                    byte[] copy = (byte[])peerBytes!.Clone();
                    map[key] = new Entry { raw = copy };
                    order.AddLast(key);
                    bytes += copy.Length;
                    trim();
                    return true;
                }
            }

            /** Under `gate`: the oldest entries go until BOTH bounds hold (entries AND bytes, a re-encode counted). */
            private void trim()
            {
                while ((map.Count > MaxEntries || bytes > MaxBytes) && order.First != null)
                {
                    string old = order.First.Value;
                    order.RemoveFirst();
                    if (map.TryGetValue(old, out Entry? e))
                    {
                        bytes -= e.raw.Length + (e.encoded != null ? e.encoded.Length : 0);
                        map.Remove(old);
                    }
                }
            }

            public byte[]? raw(string key)
            {
                lock (gate)
                {
                    return map.TryGetValue(key, out Entry? e) ? e.raw : null;
                }
            }

            public string? encoded(string key)
            {
                lock (gate)
                {
                    return map.TryGetValue(key, out Entry? e) ? e.encoded : null;
                }
            }

            /** Records C#'s re-encode (a data: URI) for a key still held; counts toward the byte bound — ★ S11 G3 (#1263
             *  NIT-5): and EVICTS (oldest first) so the total stays within MaxBytes after it, as put does. */
            public void setEncoded(string key, string uri)
            {
                if (string.IsNullOrEmpty(uri))
                {
                    return;
                }
                lock (gate)
                {
                    if (map.TryGetValue(key, out Entry? e) && e.encoded == null)
                    {
                        e.encoded = uri;
                        bytes += uri.Length;
                        trim();
                    }
                }
            }

            public void remove(string key)
            {
                lock (gate)
                {
                    if (map.TryGetValue(key, out Entry? e))
                    {
                        bytes -= e.raw.Length + (e.encoded != null ? e.encoded.Length : 0);
                        map.Remove(key);
                        order.Remove(key);
                    }
                }
            }

            public void clear()
            {
                lock (gate)
                {
                    map.Clear();
                    order.Clear();
                    bytes = 0;
                }
            }
        }

        /** The one process-wide cache (Spixi's received offers). */
        public static readonly OfferPreviewCache offerPreviews = new OfferPreviewCache();

        /** A data: URI is pushed only for C#'s own re-encode within the cap (base64 of ≤ OfferPreviewMaxBytes). */
        public static string? offerPreviewUri(byte[]? reencoded)
        {
            if (!previewShapeOk(reencoded, OfferPreviewMaxPx))
            {
                return null;
            }
            return "data:image/jpeg;base64," + Convert.ToBase64String(reencoded!);
        }

        // —— the viewer's Save (#1263 a) ——

        /** ★ S11 G3 (#1263 MINOR-8): the MIME the Android "Save as" picker is given for a photo — from C#'s own file NAME's
         *  extension (the SharedItems.isImageName list); anything else → application/octet-stream (today's value). */
        public static string imageMimeOf(string? name)
        {
            string ext = "";
            int dot = name == null ? -1 : name.LastIndexOf('.');
            if (dot >= 0 && dot < name!.Length - 1)
            {
                ext = name.Substring(dot + 1).ToLowerInvariant();
            }
            switch (ext)
            {
                case "jpg":
                case "jpeg":
                    return "image/jpeg";
                case "png":
                    return "image/png";
                case "gif":
                    return "image/gif";
                case "webp":
                    return "image/webp";
                case "bmp":
                    return "image/bmp";
                case "heic":
                    return "image/heic";
                case "avif":
                    return "image/avif";
                default:
                    return "application/octet-stream";
            }
        }

        public const int SaveIdMaxHex = 128;   // the viewImage bound (64 bytes of id)

        /** ixian:savePhoto:<hexMsgId> — an even-length, non-empty run of ASCII hex ≤ SaveIdMaxHex; anything else refused. */
        public static bool parseSavePhoto(string? tail, out string hexId)
        {
            hexId = "";
            if (string.IsNullOrEmpty(tail) || tail.Length > SaveIdMaxHex || (tail.Length & 1) != 0)
            {
                return false;
            }
            foreach (char c in tail)
            {
                bool hex = (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
                if (!hex)
                {
                    return false;
                }
            }
            hexId = tail;
            return true;
        }
    }
}
