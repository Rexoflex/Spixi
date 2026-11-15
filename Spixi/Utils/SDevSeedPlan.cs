/* ★ perfb1 seed (Speed batch 1a, item 4) — THE PURE HALF OF THE DEV SEED. No MAUI, no Core, no disk, no network:
 * scripts/csh compiles this file and PerfB1SeedTests.cs executes it.
 *
 *   1. A COPY of SDevSeed's Seed 01–50 rules (salt, address bytes, message ids, counts, times, direction, unread tail),
 *      statement for statement. SDevSeed.cs keeps its own lines (the smoke pins them there); the source pin
 *      scripts/pins-perfb1/e-image-seed.mjs holds the two texts equal, and the harness freezes their VALUES as the base
 *      code made them — a change to a Seed 01–50 id, count or time goes red in one of the two.
 *   2. THE IMAGE CHATS: seed index 50, 51, 52 (addressFor(i), nick "Seed 51" … "Seed 53"). The message plan, the photo
 *      bytes, the file names (built from the seed index only), the FIXED times (ImageAnchor — the same on every seed run), the
 *      temp leaf (in Sent/, the app's own pending-name shape), and the file rule and the delete rule, which are decided by the
 *      CONTENT of what is on disk (SHA-256 against the deterministic PNG) — a name is never a proof.
 *      The photo is a PNG MADE IN CODE: 8-bit palette (color type 3), the image data in STORED deflate blocks, CRC-32 per
 *      chunk and the zlib Adler-32 — no encoder, no bundled picture, no fetch. Deterministic: the same (i, j) gives the
 *      same bytes. Why PNG and why a palette: every platform decoder Spixi calls (SThumbnail, ViewerImage) reads PNG and
 *      ImageSniff passes it; a palette pixel is ONE byte, so a 1024×768 photo is ~0.8 MB on disk (a sent Spixi photo is
 *      a ≤ 2048 px JPEG of the same order) while the decoder still builds the full bitmap of the stated size.
 * Compiled only under SPIXI_DEV_COEXIST, like SDevSeed.cs. */
#if SPIXI_DEV_COEXIST
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace SPIXI
{
    public static class SDevSeedPlan
    {
        // ═══ 1 · the Seed 01–50 rules — a COPY of SDevSeed.cs (e-image-seed.mjs keeps the statements equal) ═══
        public const int Count = 50;
        public const int HeavyContacts = 10;
        public const int HeavyMessages = 1000;
        public const int MediumMessages = 40;
        public const string Salt = "spixi-dev-seed:";

        /** SDevSeed.addressFor's 33 bytes (version 0 + SHA-256); SDevSeed wraps them in Core's Address. */
        public static byte[] addressBytes(int i)
        {
            byte[] h = SHA256.HashData(Encoding.UTF8.GetBytes(Salt + i));
            byte[] raw = new byte[33];
            raw[0] = 0;                       // address version 0
            Array.Copy(h, 0, raw, 1, 32);
            return raw;
        }

        public static byte[] messageIdFor(int i, int j)
        {
            return SHA256.HashData(Encoding.UTF8.GetBytes(Salt + i + ":" + j));
        }

        public static int countFor(string profile, int i)
        {
            if (profile == "heavy")
            {
                return i < HeavyContacts ? HeavyMessages : MediumMessages;
            }
            return 2 + ((i * 7) % 39);            // light: "Seed 12" is the longest (40)
        }

        public static int unreadTailFor(int i)
        {
            int unreadTail = (i % 3 == 0) ? 1 + (i % 3 + i / 3) % 3 : 0;
            return unreadTail;
        }

        /** One Seed 01–50 message: its time and its direction — the statements of SDevSeed.seed's loop. */
        public static long messageTime(long now, int i, int j, int count, out bool isLocal)
        {
            long first = now - 30L * 86400 + (i * 3600L) % 86400;
            long step = Math.Max(1, (now - 3600 - first) / Math.Max(1, count));
            int unreadTail = (i % 3 == 0) ? 1 + (i % 3 + i / 3) % 3 : 0;
            bool local = (i + j) % 2 == 0;
            bool tail = j >= count - unreadTail;
            if (tail) local = false;                         // an unread tail is always incoming
            long ts = tail ? now + 1 + (j - (count - unreadTail)) : first + j * step;
            isLocal = local;
            return ts;
        }

        /** The OLDEST time a Seed 01–50 message of a seed run at `now` can carry: `first` ≥ now − 30 days (its
         *  (i * 3600) % 86400 offset is ≥ 0, `step` ≥ 1, j ≥ 0) and an unread tail is after now. */
        public static long seedFloor(long now)
        {
            return now - 30L * 86400;
        }

        // ═══ 2 · the image chats ═══
        public const int ImageChatFirst = Count;          // seed index 50, 51, 52 → "Seed 51" … "Seed 53"
        public const int ImageChats = 3;
        public const int AlbumChat = ImageChatFirst + 1;  // seed index 51 ("Seed 52") holds the ONE album
        public const int AlbumSize = 6;
        /** ★ #46 r1 B-3: the image chats sit at a FIXED time, never at `now − …`: a top-up on a later day leaves Seed 01–50 with the
         *  stamps of the run that wrote them (SDevSeed's `now` is the current run's), so any time derived from the current run could
         *  lift Seed 51–53 above the fifty. 2026-01-01 12:00:00 UTC (a Unix time; noon, so the messages fall on the SAME calendar day
         *  (2026-01-01) in most time zones — not in UTC+12…+14, where the newest ones are already Jan 2, and not for the oldest Seed 53 message,
         *  about 09:00 UTC, in UTC−10 and beyond, where it is still Dec 31; a day label is cosmetic, and the ORDER rule below does not depend
         *  on it): older than seedFloor of every run made after 2026-01-31 (a Seed 01–50 message is never older than its run's
         *  now − 30 days). The NEWEST image-chat message of Seed 51 = this anchor; Seed 52 one hour before, Seed 53 two hours. */
        public const long ImageAnchor = 1767268800;
        public const long GapSeconds = 120;               // between two messages (an album member: 1 s after the one before)
        public const int MaxPlan = 100;                   // Core's in-memory window (Friend.getMessages, 100): a re-seed sees every id
        public const string FileTag = "devseed";
        public const int MaxEdge = 4096;

        public const string StateAbsent = "absent";    // ★ #46 r1 B-2: what is on disk under a name we built
        public const string StateOurs = "ours";        //   — exactly OUR bytes (SHA-256 of the file = SHA-256 of png(i, j, w, h))
        public const string StateForeign = "foreign";  //   — a file of another length or other bytes: not ours, never touched
        public const string FileKeep = "keep";
        public const string FileWrite = "write";
        public const string FileRefuse = "refuse";

        private static readonly string[] ImageNames = { "Petra Hočevar", "Gregor Zorman", "Alenka Bregar" };

        private static readonly string[] ImageLines = {
            "Look at this one.",
            "Nice light!",
            "From the trip.",
            "Which one is best?",
            "The second one.",
            "Sending you mine too.",
        };

        /* the photo sizes, cycled (640×480 … 1280×960, landscape and portrait) */
        private static readonly int[] SizeW = { 1024, 640, 768, 800, 1280, 480, 960, 600 };
        private static readonly int[] SizeH = { 768, 480, 1024, 600, 960, 640, 720, 800 };

        public sealed class ImageMsg
        {
            public int j;                 // the message index: SDevSeed.messageIdFor(i, j)
            public bool photo;
            public bool local;            // true = I sent it
            public int width;
            public int height;
            public int albumIndex = -1;   // ≥ 0 = a member of the chat's album
            public int albumCount = 0;
            public string text = "";
            public long ts;
        }

        public static bool isImageChat(int i)
        {
            return i >= ImageChatFirst && i < ImageChatFirst + ImageChats;
        }

        /** The contact's name: "Seed 51 Petra Hočevar" (the same "Seed NN " shape as the fifty). */
        public static string imageNick(int i)
        {
            if (!isImageChat(i))
            {
                throw new ArgumentOutOfRangeException(nameof(i));
            }
            return "Seed " + (i + 1).ToString("00", CultureInfo.InvariantCulture) + " " + ImageNames[i - ImageChatFirst];
        }

        private static ImageMsg photoMsg(int j, bool local, int photoNo, int k)
        {
            int s = (photoNo + 3 * k) % SizeW.Length;
            return new ImageMsg { j = j, photo = true, local = local, width = SizeW[s], height = SizeH[s] };
        }

        private static ImageMsg textMsg(int j, bool local, int n)
        {
            return new ImageMsg { j = j, photo = false, local = local, text = ImageLines[n % ImageLines.Length] };
        }

        /** The messages of image chat `i`, oldest first, with their FIXED times (ImageAnchor — the same on every seed run). Empty for any other i.
         *   Seed 51 (i 50): 24 messages — photo, text, photo, … — 12 photos: 6 received, 6 sent.
         *   Seed 52 (i 51): 16 messages — 10 photos: 7 received (6 of them = THE ALBUM, j 5–10), 3 sent.
         *   Seed 53 (i 52): 30 messages — every fifth a text — 24 photos: 12 received, 12 sent. */
        public static List<ImageMsg> imagePlan(int i)
        {
            List<ImageMsg> l = new List<ImageMsg>();
            if (!isImageChat(i))
            {
                return l;
            }
            int k = i - ImageChatFirst;
            int photoNo = 0;
            if (k == 0)
            {
                for (int j = 0; j < 24; j++)
                {
                    if (j % 2 == 0)
                    {
                        l.Add(photoMsg(j, (j / 2) % 2 == 1, photoNo++, k));
                    }
                    else
                    {
                        l.Add(textMsg(j, (j / 2) % 2 == 0, j / 2));
                    }
                }
            }
            else if (k == 1)
            {
                l.Add(new ImageMsg { j = 0, text = "How was the trip?" });
                l.Add(new ImageMsg { j = 1, local = true, text = "Great! Sending a few now." });
                l.Add(photoMsg(2, true, photoNo++, k));
                l.Add(photoMsg(3, true, photoNo++, k));
                l.Add(new ImageMsg { j = 4, text = "Here are mine, all six." });
                for (int a = 0; a < AlbumSize; a++)
                {
                    ImageMsg m = photoMsg(5 + a, false, photoNo++, k);
                    m.albumIndex = a;
                    m.albumCount = AlbumSize;
                    l.Add(m);
                }
                l.Add(new ImageMsg { j = 11, local = true, text = "The fourth one is the best." });
                l.Add(photoMsg(12, false, photoNo++, k));
                l.Add(new ImageMsg { j = 13, local = true, text = "Thanks!" });
                l.Add(photoMsg(14, true, photoNo++, k));
                l.Add(new ImageMsg { j = 15, text = "See you soon." });
            }
            else
            {
                for (int j = 0; j < 30; j++)
                {
                    if (j % 5 == 4)
                    {
                        l.Add(textMsg(j, j % 2 == 1, j / 5));
                    }
                    else
                    {
                        l.Add(photoMsg(j, j % 2 == 1, photoNo++, k));
                    }
                }
            }
            // times: the newest = ImageAnchor − k hours (fixed); each earlier one GapSeconds before (an album member 1 s) — strictly increasing
            long t = ImageAnchor - k * 3600L;
            for (int x = l.Count - 1; x >= 0; x--)
            {
                l[x].ts = t;
                t -= l[x].albumIndex > 0 ? 1 : GapSeconds;
            }
            return l;
        }

        private static string hex(byte[] b, int n)
        {
            StringBuilder sb = new StringBuilder(n * 2);
            for (int x = 0; x < n; x++)
            {
                sb.Append(b[x].ToString("x2", CultureInfo.InvariantCulture));
            }
            return sb.ToString();
        }

        /** The photo's transfer uid: 32 lowercase hex (PhotoRules.isTransferUid), from the seed index and j only. */
        public static string transferUid(int i, int j)
        {
            return hex(SHA256.HashData(Encoding.UTF8.GetBytes(Salt + "file:" + i + ":" + j)), 16);
        }

        /** The album's group id: 16 lowercase hex (PhotoRules.isId16). */
        public static string albumId(int i)
        {
            return hex(SHA256.HashData(Encoding.UTF8.GetBytes(Salt + "album:" + i)), 8);
        }

        /** The photo's name in its header, and the leaf of a RECEIVED copy in Downloads: "devseed-52-007.png". */
        public static string photoName(int i, int j)
        {
            return FileTag + "-" + (i + 1).ToString("00", CultureInfo.InvariantCulture) + "-" + j.ToString("000", CultureInfo.InvariantCulture) + ".png";
        }

        /** The leaf C# writes: a SENT photo → "<transferUid>.png" (Sent/, the #1200 durable-copy shape); a RECEIVED one →
         *  photoName (Downloads/). */
        public static string localLeaf(int i, ImageMsg m)
        {
            return m.local ? transferUid(i, m.j) + ".png" : photoName(i, m.j);
        }

        /** ★ #46 r1 B-2: the temp leaf a photo is written through (then moved into place). It lives in the app's OWN Sent/ folder
         *  — only C# writes there, a peer never names a file in it — for BOTH directions, never in Downloads/ (the leaf of a real
         *  received file is chosen by the peer). The shape is the app's own PENDING name, `pending-<16 hex>-0.src`
         *  (PhotoRules.pendingFileName / isPendingName): the startup sweep (SingleChatPage.sweepPendingPhotos) and the account wipe
         *  (SContacts.deleteAllSentCopies) delete exactly these, so a temp left behind by a kill is cleaned up by the app itself.
         *  The id is a hash of the seed index and j (a real pending id is random: no collision). */
        public static string tmpLeaf(int i, int j)
        {
            string? leaf = PhotoRules.pendingFileName(hex(SHA256.HashData(Encoding.UTF8.GetBytes(Salt + "tmp:" + i + ":" + j)), 8), 0, ".src");
            if (leaf == null)
            {
                throw new InvalidOperationException("tmp leaf");
            }
            return leaf;
        }

                /** The fileHeader message text, as the app stores it: a sent row "uid:name" (SingleChatPage.sendPreparedFile), a
         *  received row "uid:name:size" (StreamProcessor.handleFileHeader). */
        public static string headerText(int i, ImageMsg m, long size)
        {
            string head = transferUid(i, m.j) + ":" + photoName(i, m.j);
            return m.local ? head : head + ":" + size.ToString(CultureInfo.InvariantCulture);
        }

        /** ★ #46 r1 B-2: is what is on disk OUR file? The PNG is deterministic, so the proof is by CONTENT: the SHA-256 of the file =
         *  the SHA-256 of png(i, j, w, h). A file of another length is foreign WITHOUT being read or built (`read` / `expected`
         *  are called only when the length matches). A name is never a proof. */
        public static string fileState(bool exists, long length, long expectedLength, Func<byte[]> read, Func<byte[]> expected)
        {
            if (!exists)
            {
                return StateAbsent;
            }
            if (length != expectedLength)
            {
                return StateForeign;
            }
            return isOurs(read(), expected()) ? StateOurs : StateForeign;
        }

        public static bool isOurs(byte[] have, byte[] want)
        {
            return have.Length == want.Length && hex(SHA256.HashData(have), 32) == hex(SHA256.HashData(want), 32);
        }

        /** The file rule of a (re-)seed: absent → write; ours → keep (no second file); foreign → refuse (never overwritten, never
         *  adopted: no message row names it). */
        public static string fileAction(string state)
        {
            if (state == StateAbsent)
            {
                return FileWrite;
            }
            return state == StateOurs ? FileKeep : FileRefuse;
        }

        /** unseed deletes a photo file only when it is OURS by content. */
        public static bool mayDelete(string state)
        {
            return state == StateOurs;
        }

        /** unseed (and a failed write) deletes a temp leaf only when it is exactly the one this plan builds for (i, j) AND has the
         *  app's own pending-name shape; the caller joins it to the Sent/ folder — never to Downloads/. */
        public static bool mayDeleteTmp(string? leaf, int i, int j)
        {
            return leaf != null && PhotoRules.isPendingName(leaf) && leaf == tmpLeaf(i, j);
        }

        // ═══ the PNG ═══
        private static readonly byte[] Signature = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
        private const int StoredMax = 65535;              // one stored deflate block
        private static uint[]? crcTable;

        /** The exact byte length of png(i, j, w, h): signature + IHDR + PLTE (256 × 3) + IDAT (zlib: 2 + data + 5 per
         *  block + Adler-32) + IEND. */
        public static long pngLength(int w, int h)
        {
            long raw = (long)h * (w + 1);
            long blocks = (raw + StoredMax - 1) / StoredMax;
            long z = 2 + raw + 5 * blocks + 4;
            return 8 + (12 + 13) + (12 + 768) + (12 + z) + 12;
        }

        public static uint crc32(byte[] b, int off, int len)
        {
            uint[]? t = crcTable;
            if (t == null)
            {
                t = new uint[256];
                for (uint n = 0; n < 256; n++)
                {
                    uint c = n;
                    for (int k = 0; k < 8; k++)
                    {
                        c = (c & 1) != 0 ? 0xEDB88320u ^ (c >> 1) : c >> 1;
                    }
                    t[n] = c;
                }
                crcTable = t;
            }
            uint crc = 0xFFFFFFFFu;
            for (int x = off; x < off + len; x++)
            {
                crc = t[(crc ^ b[x]) & 0xFF] ^ (crc >> 8);
            }
            return crc ^ 0xFFFFFFFFu;
        }

        public static uint adler32(byte[] b, int off, int len)
        {
            uint a = 1, s = 0;
            int x = off;
            int end = off + len;
            while (x < end)
            {
                int run = Math.Min(5552, end - x);   // the largest run before s can overflow 32 bits
                for (int r = 0; r < run; r++)
                {
                    a += b[x++];
                    s += a;
                }
                a %= 65521;
                s %= 65521;
            }
            return (s << 16) | a;
        }

        private static void be32(byte[] o, int at, uint v)
        {
            o[at] = (byte)(v >> 24);
            o[at + 1] = (byte)(v >> 16);
            o[at + 2] = (byte)(v >> 8);
            o[at + 3] = (byte)v;
        }

        /* one chunk at `at`: length, type, the data already in place, CRC over type + data; returns the index after it */
        private static int chunk(byte[] o, int at, string type, int dataLen)
        {
            be32(o, at, (uint)dataLen);
            for (int c = 0; c < 4; c++)
            {
                o[at + 4 + c] = (byte)type[c];
            }
            be32(o, at + 8 + dataLen, crc32(o, at + 4, 4 + dataLen));
            return at + 12 + dataLen;
        }

        /** The photo of message j of seed index i: a w × h palette PNG. The palette is a ramp between two colours of the
         *  (i, j) hash; the pixels are a diagonal ramp, inverted on a checker of blocks, so every photo is different and no
         *  row is flat. Same (i, j, w, h) → the same bytes. */
        public static byte[] png(int i, int j, int w, int h)
        {
            if (w < 1 || h < 1 || w > MaxEdge || h > MaxEdge)
            {
                throw new ArgumentOutOfRangeException(nameof(w));
            }
            byte[] seed = SHA256.HashData(Encoding.UTF8.GetBytes(Salt + "png:" + i + ":" + j));
            long total = pngLength(w, h);
            byte[] o = new byte[total];
            Array.Copy(Signature, 0, o, 0, 8);
            int at = 8;
            // IHDR: width, height, bit depth 8, colour type 3 (palette), compression 0, filter 0, interlace 0
            be32(o, at + 8, (uint)w);
            be32(o, at + 12, (uint)h);
            o[at + 16] = 8;
            o[at + 17] = 3;
            at = chunk(o, at, "IHDR", 13);
            // PLTE: 256 entries from colour A to colour B
            int r0 = seed[0], g0 = seed[1], b0 = seed[2];
            int r1 = (seed[3] + 128) & 255, g1 = (seed[4] + 96) & 255, b1 = (seed[5] + 160) & 255;
            for (int p = 0; p < 256; p++)
            {
                int q = at + 8 + p * 3;
                o[q] = (byte)(r0 + (r1 - r0) * p / 255);
                o[q + 1] = (byte)(g0 + (g1 - g0) * p / 255);
                o[q + 2] = (byte)(b0 + (b1 - b0) * p / 255);
            }
            at = chunk(o, at, "PLTE", 768);
            // the image data: each row = filter byte 0 + w palette indexes
            int rawLen = h * (w + 1);
            byte[] raw = new byte[rawLen];
            int blk = 32 + (seed[6] % 4) * 16;
            int[] col = new int[w];
            for (int x = 0; x < w; x++)
            {
                col[x] = w > 1 ? x * 255 / (w - 1) : 0;
            }
            int n = 0;
            for (int y = 0; y < h; y++)
            {
                int row = h > 1 ? y * 255 / (h - 1) : 0;
                int by = y / blk;
                raw[n++] = 0;
                for (int x = 0; x < w; x++)
                {
                    int v = (col[x] + row) >> 1;
                    raw[n++] = (byte)((((x / blk) + by) & 1) == 0 ? v : 255 - v);
                }
            }
            // IDAT: zlib header 0x78 0x01, stored blocks, Adler-32 (big-endian)
            int d = at + 8;
            o[d++] = 0x78;
            o[d++] = 0x01;
            int src = 0;
            while (src < rawLen)
            {
                int len = Math.Min(StoredMax, rawLen - src);
                o[d++] = (byte)(src + len >= rawLen ? 1 : 0);   // BFINAL on the last block, BTYPE 00 (stored)
                o[d++] = (byte)len;
                o[d++] = (byte)(len >> 8);
                o[d++] = (byte)~len;
                o[d++] = (byte)(~len >> 8);
                Array.Copy(raw, src, o, d, len);
                d += len;
                src += len;
            }
            be32(o, d, adler32(raw, 0, rawLen));
            d += 4;
            at = chunk(o, at, "IDAT", d - (at + 8));
            at = chunk(o, at, "IEND", 0);
            if (at != total)
            {
                throw new InvalidOperationException("png length");
            }
            return o;
        }
    }
}
#endif
