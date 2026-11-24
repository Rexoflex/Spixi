/* ★ perfb1 seed (Speed batch 1a, item 4) — THE PURE HALF OF THE DEV SEED. No MAUI, no Core calls, no disk, no network (§ 4 uses ReplyQuote, a pure Spixi file, and names the Core enum IXICore.Streaming.FriendMessageType):
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

        // ═══ 3 · the file chats (filewalk, contract § 3.1) ═══
        /* ★ filewalk seed — seed index 53, 54, 55 ("Seed 54" … "Seed 56", addressFor(i) like every seed contact), after the image chats:
         *   53 = DOCUMENTS: 31 messages — 20 file rows (pdf docx xlsx pptx txt csv zip odt epub mp3, each kind once received and once
         *        sent; 2 048 bytes … 5.9 MB, 24.47 MB in all) + 11 texts. No video row (#1607).
         *   54 = VOICE: 30 messages — 16 INLINE voice rows (the app's standard text: VoiceCodec.humanLine + "\n" + encodeInline; 1–30 s;
         *        8 received, 8 sent), 4 voice FILE rows (Ogg Opus by VoiceCodec.muxOgg; 2 received in Downloads/, 2 sent in Voice/) +
         *        10 texts. Every Opus packet is the 3 bytes F8 FF FE (TOC config 31 = CELT 20 ms, code 0: ONE 20 ms frame, which
         *        VoiceCodec.isOne20msFrame accepts; FF FE = a silent frame body) — 50 packets a second.
         *   55 = PHOTOS: exactly MaxPlan = 100 messages — 96 photos (png(i, j, w, h), the image seed's size cycle; 48 received,
         *        48 sent) + 4 texts.
         * FIXED times like the image chats (the newest message of 53 / 54 / 55 = ImageAnchor − 3 h / − 4 h / − 5 h; GapSeconds before
         * each earlier one). Names from the seed index, j and fixed words only; the bytes from (i, j) only; the temp leaf has its OWN
         * salt ("filetmp:") so it never equals an image-seed temp; the content proof is the image seed's (fileState / fileAction /
         * mayDelete). The folders: Sent/ (sent documents and photos: PhotoRules.sentFileName), Voice/ (sent voice files — the folder
         * SingleChatPage.voiceFolder and Node's VoiceFolderSweep use; the app has no constant for its name, so VoiceFolderName below
         * copies the literal), Downloads/ (every received file). */
        public const int FileChatFirst = ImageChatFirst + ImageChats;   // seed index 53, 54, 55 → "Seed 54" … "Seed 56"
        public const int FileChats = 3;
        public const int DocChat = FileChatFirst;
        public const int VoiceChat = FileChatFirst + 1;
        public const int PhotoChat = FileChatFirst + 2;
        public const string VoiceFolderName = "Voice";                  // SingleChatPage.xaml.cs:8603, Node.cs:379 — the same literal
        public const int VoicePreSkip = VoiceCodec.DefaultPreSkip;      // the pre-skip SingleChatPage.sendVoiceFile passes to muxOgg (:8619)
        public const int VoicePacketsPerSecond = 1000 / VoiceCodec.FrameMs;
        public const long DocTotalMax = 25000000;                       // the documents of seed index 53 together (contract: ≤ 25 MB)

        public const string KindText = "text";
        public const string KindDoc = "doc";
        public const string KindVoiceInline = "voice";
        public const string KindVoiceFile = "voicefile";
        public const string KindPhoto = "photo";
        public const string FolderSent = "sent";
        public const string FolderVoice = "voice";
        public const string FolderDownloads = "downloads";

        private static readonly string[] FileNames = { "Tjaša Kranjc", "Rok Mlinar", "Maja Debeljak" };

        /* the documents of seed index 53: kind f % 10, the planned byte length of file f */
        private static readonly string[] DocExts = { ".pdf", ".docx", ".xlsx", ".pptx", ".txt", ".csv", ".zip", ".odt", ".epub", ".mp3" };
        private static readonly long[] DocSizes = {
            1200000, 48000, 230000, 5900000, 2100, 96000, 3000000, 31000, 760000, 4200000,
            310000, 12500, 1050000, 2600000, 7800, 2048, 640000, 180000, 1900000, 2300000,
        };

        /* the voice durations of seed index 54, in seconds: the 16 inline rows, then the 4 file rows */
        private static readonly int[] InlineSeconds = { 1, 4, 9, 2, 15, 25, 6, 12, 3, 20, 8, 27, 5, 11, 30, 17 };   // the longest = 30 s (VoiceCodec.MaxDurationMs, the recorder's limit)
        private static readonly int[] VoiceFileSeconds = { 7, 14, 22, 29 };

        private static readonly string[] DocLines = {
            "Here are the files for the meeting.",
            "Thanks, I will read them tonight.",
            "The spreadsheet has the new numbers.",
            "Can you send the slides too?",
            "Sent. The last page is still a draft.",
            "Got the archive, it opens fine.",
            "Please check the notes before Friday.",
            "Done. Two small changes on page three.",
            "The audio is from the call.",
            "Great, that helps a lot.",
            "That is everything for now.",
        };

        private static readonly string[] VoiceLines = {
            "Can you hear me now?",
            "Yes, loud and clear.",
            "I will send a longer one.",
            "Easier than typing.",
            "Sorry, I was driving.",
            "No problem.",
            "Listen to the second one.",
            "Got it, thanks.",
            "Call me later?",
            "Sure, after six.",
        };

        private static readonly string[] PhotoLines = {
            "Here are the photos from the weekend.",
            "So many! Sending mine too.",
            "The last ones are from Sunday.",
            "Thanks, these are great.",
        };

        private static readonly byte[] VoicePacket = { 0xF8, 0xFF, 0xFE };

        public sealed class FileMsg
        {
            public int j;                 // the message index: SDevSeed.messageIdFor(i, j)
            public string kind = KindText;
            public bool local;            // true = I sent it
            public string text = "";      // a text row
            public string ext = "";       // a document, photo or voice file: its extension
            public long length;           // a document: its planned byte length
            public int seconds;           // a voice row (inline or file): its duration
            public int width;             // a photo
            public int height;
            public long ts;
        }

        public static bool isFileChat(int i)
        {
            return i >= FileChatFirst && i < FileChatFirst + FileChats;
        }

        /** The contact's name: "Seed 54 Tjaša Kranjc" (the "Seed NN " shape of every seed contact). */
        public static string fileNick(int i)
        {
            if (!isFileChat(i))
            {
                throw new ArgumentOutOfRangeException(nameof(i));
            }
            return "Seed " + (i + 1).ToString("00", CultureInfo.InvariantCulture) + " " + FileNames[i - FileChatFirst];
        }

        /** Does the row carry a file on disk? (a document, a voice file, a photo) */
        public static bool hasFile(FileMsg m)
        {
            return m.kind == KindDoc || m.kind == KindVoiceFile || m.kind == KindPhoto;
        }

        /** The messages of file chat `i`, oldest first, with their FIXED times. Empty for any other i. */
        public static List<FileMsg> filePlan(int i)
        {
            List<FileMsg> l = new List<FileMsg>();
            if (!isFileChat(i))
            {
                return l;
            }
            int k = i - FileChatFirst;
            if (i == DocChat)
            {
                int t = 0;
                for (int f = 0; f < DocSizes.Length; f++)
                {
                    if (f % 2 == 0)
                    {
                        l.Add(new FileMsg { j = l.Count, local = t % 2 == 1, text = DocLines[t] });
                        t++;
                    }
                    l.Add(new FileMsg { j = l.Count, kind = KindDoc, local = f < 10 ? f % 2 == 1 : f % 2 == 0, ext = DocExts[f % DocExts.Length], length = DocSizes[f] });
                }
                l.Add(new FileMsg { j = l.Count, local = t % 2 == 1, text = DocLines[t] });
            }
            else if (i == VoiceChat)
            {
                int q = 0, inlineNo = 0, fileNo = 0;
                for (int x = 0; x < 30; x++)
                {
                    if (x % 3 == 0)
                    {
                        l.Add(new FileMsg { j = x, local = (x / 3) % 2 == 1, text = VoiceLines[x / 3] });
                        continue;
                    }
                    if (q % 5 == 2)
                    {
                        l.Add(new FileMsg { j = x, kind = KindVoiceFile, local = q % 2 == 1, ext = ".ogg", seconds = VoiceFileSeconds[fileNo++] });
                    }
                    else
                    {
                        l.Add(new FileMsg { j = x, kind = KindVoiceInline, local = q % 2 == 1, seconds = InlineSeconds[inlineNo++] });
                    }
                    q++;
                }
            }
            else
            {
                int photoNo = 0, t = 0;
                for (int j = 0; j < MaxPlan; j++)
                {
                    if (j % 25 == 12)
                    {
                        l.Add(new FileMsg { j = j, local = t % 2 == 1, text = PhotoLines[t] });
                        t++;
                        continue;
                    }
                    int s = (photoNo + 3 * (i - ImageChatFirst)) % SizeW.Length;   // the image seed's size cycle
                    l.Add(new FileMsg { j = j, kind = KindPhoto, local = photoNo % 2 == 1, ext = ".png", width = SizeW[s], height = SizeH[s] });
                    photoNo++;
                }
            }
            // times: the newest = ImageAnchor − (3 + k) hours (fixed); each earlier one GapSeconds before — strictly increasing
            long at = ImageAnchor - (3 + k) * 3600L;
            for (int x = l.Count - 1; x >= 0; x--)
            {
                l[x].ts = at;
                at -= GapSeconds;
            }
            return l;
        }

        /** The folder rule of a file row: a sent voice file → Voice/; a sent document or photo → Sent/; every received file →
         *  Downloads/. "" for a row without a file. */
        public static string folderOf(FileMsg m)
        {
            if (!hasFile(m))
            {
                return "";
            }
            if (!m.local)
            {
                return FolderDownloads;
            }
            return m.kind == KindVoiceFile ? FolderVoice : FolderSent;
        }

        /** The file's name in its header row: a document or photo "devseed-54-003.pdf" (seed number, j, the extension); a voice
         *  file the app's own voice name for the row's FIXED time, VoiceCodec.voiceFileName (UTC) — never the clock. */
        public static string fileName(int i, FileMsg m)
        {
            if (m.kind == KindVoiceFile)
            {
                return VoiceCodec.voiceFileName(DateTimeOffset.FromUnixTimeSeconds(m.ts).UtcDateTime);
            }
            return FileTag + "-" + (i + 1).ToString("00", CultureInfo.InvariantCulture) + "-" + m.j.ToString("000", CultureInfo.InvariantCulture) + m.ext;
        }

        /** The leaf C# writes: a SENT document or photo → "<transferUid><ext>" (Sent/, PhotoRules.sentFileName's shape); every other
         *  file → fileName (a received document or photo in Downloads/; a voice file, sent in Voice/ or received in Downloads/). */
        public static string fileLeaf(int i, FileMsg m)
        {
            return m.local && m.kind != KindVoiceFile ? transferUid(i, m.j) + m.ext : fileName(i, m);
        }

        /** Is the leaf the shape the app's OWN rule builds for its folder? Sent/ → PhotoRules.sentFileName (an allow-listed
         *  extension, the 32-hex uid); Voice/ or a received voice file → VoiceCodec.isVoiceFileName; a received document or photo →
         *  the plan's name, unchanged by the receive sanitizer, with an allow-listed extension. Fail closed. */
        public static bool leafShapeOk(int i, FileMsg m, string? leaf)
        {
            if (leaf == null || !hasFile(m) || leaf != fileLeaf(i, m) || PhotoRules.sentExtension(leaf) != m.ext || m.ext.Length == 0)
            {
                return false;
            }
            string folder = folderOf(m);
            if (folder == FolderSent)
            {
                return PhotoRules.sentFileName(transferUid(i, m.j), m.ext) == leaf && PhotoRules.isSentCopyName(leaf);
            }
            if (m.kind == KindVoiceFile)
            {
                return VoiceCodec.isVoiceFileName(leaf);
            }
            return folder == FolderDownloads && PhotoRules.SafeFileName(leaf) == leaf && !PhotoRules.isVideoName(leaf);
        }

        /** The text of a row without a file: a text row its line; an INLINE voice row the app's own standard text
         *  (SingleChatPage: humanLine(durMs) + "\n" + encodeInline(packets)). */
        public static string rowText(FileMsg m)
        {
            if (m.kind == KindVoiceInline)
            {
                List<byte[]> p = voicePackets(m.seconds);
                string? payload = VoiceCodec.encodeInline(p);
                if (payload == null)
                {
                    throw new InvalidOperationException("voice inline");
                }
                return VoiceCodec.humanLine(p.Count * VoiceCodec.FrameMs) + "\n" + payload;
            }
            return m.text;
        }

        /** `seconds` × 50 Opus packets, each the 3 bytes F8 FF FE (one 20 ms frame). 1..30 s (≤ VoiceCodec.MaxDurationMs, the recorder's limit). */
        public static List<byte[]> voicePackets(int seconds)
        {
            if (seconds < 1 || seconds * 1000 > VoiceCodec.MaxDurationMs)
            {
                throw new ArgumentOutOfRangeException(nameof(seconds));
            }
            List<byte[]> l = new List<byte[]>();
            for (int n = 0; n < seconds * VoicePacketsPerSecond; n++)
            {
                l.Add((byte[])VoicePacket.Clone());
            }
            return l;
        }

        /** The Ogg stream serial of a voice file: 4 bytes of a hash of the seed index and j (the app uses a random one). */
        public static uint oggSerial(int i, int j)
        {
            byte[] h = SHA256.HashData(Encoding.UTF8.GetBytes(Salt + "ogg:" + i + ":" + j));
            return (uint)(h[0] | (h[1] << 8) | (h[2] << 16) | (h[3] << 24));
        }

        /** The exact length of VoiceCodec.muxOgg for `packets` packets of 3 bytes: OpusHead page (27 + 1 + 19) + OpusTags page
         *  (27 + 1 + 21) + one page header per 255 packets + one lacing byte and 3 bytes per packet. */
        public static long oggLength(int packets)
        {
            long pages = (packets + 254) / 255;
            return 47 + 49 + 27 * pages + 4L * packets;
        }

        /** The head line of a document: "Spixi developer seed file 54:003\n" (ASCII). */
        public static byte[] docHead(int i, int j)
        {
            return Encoding.ASCII.GetBytes("Spixi developer seed file " + (i + 1).ToString("00", CultureInfo.InvariantCulture) + ":" + j.ToString("000", CultureInfo.InvariantCulture) + "\n");
        }

        /** A document's bytes: the head line, then a SHA-256 counter-mode filler from (i, j) to `length` bytes. */
        public static byte[] docBytes(int i, int j, long length)
        {
            byte[] head = docHead(i, j);
            if (length < head.Length || length > PhotoRules.MaxReceiveBytes)
            {
                throw new ArgumentOutOfRangeException(nameof(length));
            }
            byte[] o = new byte[length];
            Array.Copy(head, 0, o, 0, head.Length);
            byte[] key = Encoding.UTF8.GetBytes(Salt + "doc:" + i + ":" + j + ":");
            byte[] block = new byte[key.Length + 8];
            Array.Copy(key, 0, block, 0, key.Length);
            byte[] h = new byte[32];
            long at = head.Length;
            long c = 0;
            while (at < length)
            {
                for (int b = 0; b < 8; b++)
                {
                    block[key.Length + b] = (byte)(c >> (56 - 8 * b));
                }
                SHA256.HashData(new ReadOnlySpan<byte>(block), new Span<byte>(h));
                int n = (int)Math.Min(32, length - at);
                Array.Copy(h, 0, o, at, n);
                at += n;
                c++;
            }
            return o;
        }

        /** The exact byte length of fileBytes(i, m) — pure, so the content proof skips the read of a file of another length. */
        public static long fileLength(FileMsg m)
        {
            if (m.kind == KindDoc)
            {
                return m.length;
            }
            if (m.kind == KindVoiceFile)
            {
                return oggLength(m.seconds * VoicePacketsPerSecond);
            }
            if (m.kind == KindPhoto)
            {
                return pngLength(m.width, m.height);
            }
            throw new ArgumentOutOfRangeException(nameof(m));
        }

        /** The deterministic bytes of a file row: a document docBytes · a voice file VoiceCodec.muxOgg(F8 FF FE × n, the app's
         *  pre-skip, oggSerial) · a photo png. */
        public static byte[] fileBytes(int i, FileMsg m)
        {
            if (m.kind == KindDoc)
            {
                return docBytes(i, m.j, m.length);
            }
            if (m.kind == KindVoiceFile)
            {
                return VoiceCodec.muxOgg(voicePackets(m.seconds), VoicePreSkip, oggSerial(i, m.j));
            }
            if (m.kind == KindPhoto)
            {
                return png(i, m.j, m.width, m.height);
            }
            throw new ArgumentOutOfRangeException(nameof(m));
        }

        /** The fileHeader text, as the app stores it: a sent row "uid:name", a received row "uid:name:size". */
        public static string fileHeaderText(int i, FileMsg m)
        {
            string head = transferUid(i, m.j) + ":" + fileName(i, m);
            return m.local ? head : head + ":" + fileLength(m).ToString(CultureInfo.InvariantCulture);
        }

        /** The temp leaf of a file-chat file: the app's own pending name in Sent/ (as tmpLeaf) with its OWN salt "filetmp:", so it
         *  never equals an image-seed temp. */
        public static string fileTmpLeaf(int i, int j)
        {
            string? leaf = PhotoRules.pendingFileName(hex(SHA256.HashData(Encoding.UTF8.GetBytes(Salt + "filetmp:" + i + ":" + j)), 8), 0, ".src");
            if (leaf == null)
            {
                throw new InvalidOperationException("tmp leaf");
            }
            return leaf;
        }

        /** ★ walktools item 4 (contract I-4): a REAL message id is 16 bytes (Guid.ToByteArray(); Ixian-Core CoreConfig.maxMessageIdSize = 16),
         *  and the chat page's voice play refuses a longer id (SingleChatPage.isVoiceIdHex: at most 2 × 16 hex characters) — the 32-byte
         *  SHA-256 id every seed row had made every seed voice clip unplayable. */
        public const int RealMessageIdLength = 16;

        /** ★ walktools item 4: the id the seed gives row `m` of chat `i`. A voice row (inline or file) = the FIRST 16 bytes of
         *  messageIdFor(i, m.j), the length of a real message id (the play check accepts it); EVERY other row = messageIdFor(i, m.j),
         *  32 bytes, unchanged. The writer (SDevSeed.seedFileChats) and chatComplete / topUpAction use THIS function and no other. */
        public static byte[] rowIdFor(int i, FileMsg m)
        {
            byte[] full = messageIdFor(i, m.j);
            if (m.kind != KindVoiceInline && m.kind != KindVoiceFile)
            {
                return full;
            }
            byte[] shortId = new byte[RealMessageIdLength];
            Array.Copy(full, 0, shortId, 0, RealMessageIdLength);
            return shortId;
        }

        /** ★ #46 r1 C-S-1: is file chat `i` complete in this list of ids? The seed writes a chat OLDEST first, so its NEWEST planned id
         *  present = every row was written. Core's own refusal of a known id (FriendList.cs:258) sees only the in-memory list, which
         *  after the chat page's loadMessages holds about 51 rows — NOT MaxPlan — so a top-up of a 100-message chat cannot rely on it;
         *  a complete chat is skipped instead. False for any other i and for an empty list. */
        public static bool chatComplete(IEnumerable<byte[]?> presentIds, int i)
        {
            List<FileMsg> l = filePlan(i);
            if (l.Count == 0 || presentIds == null)
            {
                return false;
            }
            byte[] newest = rowIdFor(i, l[l.Count - 1]);   // ★ walktools item 4: the id the writer gives that row (a voice row: 16 bytes)
            foreach (byte[]? id in presentIds)
            {
                if (id != null && id.Length == newest.Length && isOurs(id, newest))
                {
                    return true;
                }
            }
            return false;
        }

        public const string TopUpWrite = "write";      // ★ #46 r2 B2-5: a present file chat with an EMPTY Core list (never written)
        public const string TopUpSkip = "skip";        //   — the plan's newest row is there (a refused middle row is not claimed complete)
        public const string TopUpPartial = "partial";  //   — rows there, the newest absent, or the list unreadable: no write (#1571)

        /** ★ #46 r2 B2-5: what the seed does with a PRESENT file chat, given the ids of Core's in-memory list (null = unreadable). Never a
         *  top-up through Core's ~51-row window (it would store the older rows twice): EMPTY → write; newest present → skip; anything
         *  else → partial (fail closed: "Remove the seed, then Seed"). */
        public static string topUpAction(IReadOnlyCollection<byte[]?>? presentIds, int i)
        {
            if (presentIds == null || filePlan(i).Count == 0)
            {
                return TopUpPartial;
            }
            if (presentIds.Count == 0)
            {
                return TopUpWrite;
            }
            return chatComplete(presentIds, i) ? TopUpSkip : TopUpPartial;
        }

        /** The unseed (and a failed write) deletes a file-chat temp leaf only when it is exactly the one this plan builds for (i, j)
         *  AND has the app's pending-name shape; the caller joins it to the Sent/ folder only. */
        public static bool mayDeleteFileTmp(string? leaf, int i, int j)
        {
            return leaf != null && isFileChat(i) && PhotoRules.isPendingName(leaf) && leaf == fileTmpLeaf(i, j);
        }

        // ═══ 4 · the quote chat (walktools2 item 1, contract-walktools2 I-1) ═══
        /* ★ walktools2 — seed index 56 = "Seed 57 Mojca Vrabec" (addressFor(56) like every seed contact), after the file chats without a gap:
         * EXACTLY QuoteMessages = 1000 TEXT rows (no file, no folder: nothing on disk but Core's own message store), the same in both
         * profiles. Four of them are REPLIES in the app's own stored shape — ReplyQuote.compose("", ReplyQuote.excerptOf(standard, the
         * target's text, null, false), body): a 1:1 carries no name (SingleChatPage.replyNameOf → "") — so the walk can tap a quote whose
         * target the shell has not loaded (W-5 / A-5 of docs/walk-histcs.md, `ixian:quotejump`).
         * DEPTH = how many rows are newer (0 = the newest row; j = QuoteMessages − 1 − depth):
         *   reply depth 0   (the peer's,  row 1 of the open chat) → MY target at depth 320     "QUOTE TARGET A …"
         *   reply depth 1   (mine,        row 2)                  → the PEER's target at 415   "QUOTE TARGET B …"
         *   reply depth 170 (mine)                                → the PEER's target at 485   "QUOTE TARGET C …"
         *   reply depth 230 (the peer's)                          → MY target at 640           "QUOTE TARGET D …"
         * The page math (Config.messagesToLoad = 50, HistoryOlderRules.nextShow): the window after k older pages is
         *   FirstOlderPage50 OFF: 50, 150, 200, 250, 300 …   ON: 50, 100, 150, 200, 250 …
         * so every target lies ≥ 3 older pages above its reply in BOTH states, deeper than the window after three older pages (250 / 200),
         * and below ReplyQuote.DeepSearchMax / SharedItems.JumpCap (1000). Depth 230 is reached after three older pages with the switch
         * OFF, depth 170 after three with it ON. WalkTools2SeedTests executes all of it. Every target text has its OWN excerpt in the chat.
         * Every row id = the FIRST 16 bytes of messageIdFor(56, j) (quoteRowIdFor; #1882: SingleChatPage.parseMessageIdHex takes ≤ 32 hex,
         * so reply, edit and the quote jump work on any row). FIXED times: the newest row = ImageAnchor − 6 h (below the file chats), each
         * earlier one GapSeconds before; all before the contact's addedTimestamp, so none is unread. */
        public const int QuoteChatFirst = FileChatFirst + FileChats;   // seed index 56 → "Seed 57"
        public const int QuoteChats = 1;
        public const int QuoteChat = QuoteChatFirst;
        public const int QuoteMessages = 1000;
        public const long QuoteAnchor = ImageAnchor - 6 * 3600L;       // the newest row of Seed 57 (2026-01-01 06:00 UTC)

        private static readonly string[] QuoteNames = { "Mojca Vrabec" };

        /* the plain rows: a fixed line + its row number from the oldest (1 … 1000), so every plain row is unique and the walk can say where it is */
        private static readonly string[] QuoteLines = {
            "Did you see the forecast for the weekend?",
            "Yes, rain on Saturday and sun on Sunday.",
            "Let us move the hike to Sunday then.",
            "Good idea. Same time, eight in the morning?",
            "Eight is fine. I will bring the map.",
            "Do not forget the water bottles.",
            "Packed already. Who drives?",
            "I can drive, my car has four seats.",
            "Great, see you at the station.",
            "See you there.",
        };

        /* the four replies: their depth, their target's depth, who sent the REPLY (true = I did; the target is always the other side's), the target's text, the reply's body */
        private static readonly int[] ReplyDepths = { 0, 1, 170, 230 };
        private static readonly int[] TargetDepths = { 320, 415, 485, 640 };
        private static readonly bool[] ReplyLocal = { false, true, true, false };
        private static readonly string[] TargetTexts = {
            "QUOTE TARGET A — the blue boat leaves at noon.",
            "QUOTE TARGET B — the red key is under the mat.",
            "QUOTE TARGET C — the green door opens at nine.",
            "QUOTE TARGET D — the yellow bike needs a new chain.",
        };
        private static readonly string[] ReplyBodies = {
            "REPLY A — yes, I will be at the boat by noon.",
            "REPLY B — found the key, thanks.",
            "REPLY C — nine is fine for the green door.",
            "REPLY D — I will buy the chain tomorrow.",
        };

        public sealed class QuoteMsg
        {
            public int j;                 // the message index: quoteRowIdFor(i, j)
            public bool local;            // true = I sent it
            public string text = "";      // the stored text (a reply: the quote line + "\n" + the body)
            public long ts;
            public int targetJ = -1;      // a reply: the j of the row it quotes; -1 = not a reply
            public bool isTarget;         // a row a reply quotes
        }

        public static bool isQuoteChat(int i)
        {
            return i >= QuoteChatFirst && i < QuoteChatFirst + QuoteChats;
        }

        /** The contact's name: "Seed 57 Mojca Vrabec" (the "Seed NN " shape of every seed contact). */
        public static string quoteNick(int i)
        {
            if (!isQuoteChat(i))
            {
                throw new ArgumentOutOfRangeException(nameof(i));
            }
            return "Seed " + (i + 1).ToString("00", CultureInfo.InvariantCulture) + " " + QuoteNames[i - QuoteChatFirst];
        }

        /** The rows of quote chat `i`, oldest first (j = 0 … QuoteMessages − 1), with their FIXED times. Empty for any other i. */
        public static List<QuoteMsg> quotePlan(int i)
        {
            List<QuoteMsg> l = new List<QuoteMsg>();
            if (!isQuoteChat(i))
            {
                return l;
            }
            for (int j = 0; j < QuoteMessages; j++)
            {
                l.Add(new QuoteMsg { j = j, local = j % 2 == 1, text = QuoteLines[j % QuoteLines.Length] + " (row " + (j + 1).ToString(CultureInfo.InvariantCulture) + ")" });
            }
            for (int r = 0; r < ReplyDepths.Length; r++)
            {
                QuoteMsg target = l[QuoteMessages - 1 - TargetDepths[r]];
                target.local = !ReplyLocal[r];
                target.text = TargetTexts[r];
                target.isTarget = true;
            }
            for (int r = 0; r < ReplyDepths.Length; r++)
            {
                QuoteMsg reply = l[QuoteMessages - 1 - ReplyDepths[r]];
                QuoteMsg target = l[QuoteMessages - 1 - TargetDepths[r]];
                // the app's own reply text (SingleChatPage.composeReply): the target's excerpt as the page computes it, no name in a 1:1
                string? excerpt = ReplyQuote.excerptOf(IXICore.Streaming.FriendMessageType.standard, target.text, null, false);
                if (excerpt == null)
                {
                    throw new InvalidOperationException("quote target");
                }
                reply.local = ReplyLocal[r];
                reply.text = ReplyQuote.compose("", excerpt, ReplyBodies[r]);
                reply.targetJ = target.j;
            }
            // times: the newest = QuoteAnchor (fixed); each earlier one GapSeconds before — strictly increasing
            long qAt = QuoteAnchor;
            for (int x = l.Count - 1; x >= 0; x--)
            {
                l[x].ts = qAt;
                qAt -= GapSeconds;
            }
            return l;
        }

        /** The id the seed gives row j of quote chat `i`: the FIRST 16 bytes (RealMessageIdLength) of messageIdFor(i, j) — the length of a
         *  real message id, so SingleChatPage.parseMessageIdHex (≤ 2 × CoreConfig.maxMessageIdSize hex) accepts it (#1882). */
        public static byte[] quoteRowIdFor(int i, int j)
        {
            byte[] qFull = messageIdFor(i, j);
            byte[] qId = new byte[RealMessageIdLength];
            Array.Copy(qFull, 0, qId, 0, RealMessageIdLength);
            return qId;
        }

        /** What the seed does with a PRESENT quote chat, given the ids of Core's in-memory list (null = unreadable) — the file chats'
         *  rule (topUpAction, #46 r2 B2-5): EMPTY → write; the plan's NEWEST row there → skip; anything else → partial (no write,
         *  "Remove the seed, then Seed"; Core sees only its in-memory window, so a top-up would store the older rows twice, #1571). */
        public static string quoteTopUpAction(IReadOnlyCollection<byte[]?>? presentIds, int i)
        {
            List<QuoteMsg> l = quotePlan(i);
            if (presentIds == null || l.Count == 0)
            {
                return TopUpPartial;
            }
            if (presentIds.Count == 0)
            {
                return TopUpWrite;
            }
            byte[] qNewest = quoteRowIdFor(i, l[l.Count - 1].j);
            foreach (byte[]? id in presentIds)
            {
                if (id != null && id.Length == qNewest.Length && isOurs(id, qNewest))
                {
                    return TopUpSkip;
                }
            }
            return TopUpPartial;
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
