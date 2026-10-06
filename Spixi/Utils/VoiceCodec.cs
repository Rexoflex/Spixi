/* ★★ #1208 (session 7, #1136 (b)) — VOICE MESSAGES: the wire text, the Ogg Opus file, the waveform, the route. PURE.
 *
 * INLINE (a plain SpixiMessageCode.chat text, sent only to a CONFIRMED new app in a normal 1:1 — #1207):
 *   line 1 = humanLine(durMs) = "🎤 M:SS (voice message — update Spixi to play)" (fixed English, readable on an old app;
 *            ★ #46 r1 §7: the parser requires it EXACTLY, for line 2's duration)
 *   "\n" (exactly one, no "\r")
 *   line 2 = "spixi.voice.1:<durMs>:<base64>" — the payload = repeated [u16 big-endian length][raw Opus packet],
 *            16 kHz mono, 20 ms per packet, no container; durMs = packets × 20.
 *   The parser is BOUNDED and never throws (peer data): text ≤ 64 000 chars · durMs ≤ 31 000 (1..5 digits) · base64
 *   ≤ 64 000 chars (→ payload ≤ 48 000 bytes) · ≤ 1 550 packets · every length 1..1275 · no trailing byte · the base64
 *   decodes · every packet ONE 20 ms frame (TOC code 0, a 20 ms config — #46 r1 §7) · |durMs − packets × 20| ≤ 20.
 *   tryPeekInline checks the SHAPE + the bounds with no decode (rows, excerpts).
 * FILE (an old / unknown app, every private group): `voice-yyyyMMdd-HHmmss.ogg` (UTC), Ogg Opus per RFC 7845 / RFC 3533:
 *   page 0 = OpusHead alone (BOS) · page 1 = OpusTags alone (vendor "Spixi", no comments) · audio pages (a packet never
 *   spans two pages; ≤ 255 lacing values a page; a packet of 255·k bytes ends with a 0 lacing value) · granule = 48 kHz
 *   samples incl. pre-skip at the end of the page's last packet (20 ms = 960) · EOS on the last page · CRC-32 (poly
 *   0x04C11DB7, init 0, no reflection, no final xor) over the page with its CRC field zeroed.
 *   The demux is BOUNDED and never throws: ≤ 262 144 bytes · one logical stream · every page's CRC · OpusHead (channels
 *   1 or 2, mapping family 0) then OpusTags · 1..1 550 audio packets of 1..1275 bytes, each ONE 20 ms frame (§7) →
 *   durMs = packets × 20 ≤ 31 000. Every public parser returns false on ANY exception (a belt behind the bounds).
 * A receiver treats a file as voice when isVoiceFileName(name) (ordinal, ASCII digits) and (size unknown or ≤ MaxOggBytes).
 * NO MAUI, no Core type, no Concentus — scripts/csh executes every rule (VoiceCodecTests.cs). No logging here. */
#nullable enable
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace SPIXI
{
    public static class VoiceCodec
    {
        public const string ProtocolId = "spixi.voice.1";
        public const string MarkerPrefix = "spixi.voice.1:";
        public const int SampleRate = 16000, FrameMs = 20, MaxDurationMs = 30000, ParseMaxDurationMs = 31000;
        public const int MaxPackets = 1550, MaxPacketBytes = 1275, MaxPayloadBytes = 48000, MaxTextChars = 64000;
        public const int MaxOggBytes = 262144, PeakCount = 40, BitrateBps = 10000, DefaultPreSkip = 312;

        private const string HumanTail = " (voice message — update Spixi to play)";
        private const string Mic = "🎤 ";
        private const int MaxBase64Chars = MaxPayloadBytes / 3 * 4;   // 64 000
        private const int SamplesPerFrame48k = 48 * FrameMs;          // 960

        // ———————————————————————————— text ————————————————————————————

        /** M:SS — round to the nearest second (half up); at least 0:01 when durMs > 0; 0:00 for 0 (or less). */
        public static string formatDuration(int durMs)
        {
            if (durMs <= 0)
            {
                return "0:00";
            }
            long secs = Math.Max(1, ((long)durMs + 500) / 1000);
            return (secs / 60).ToString(CultureInfo.InvariantCulture) + ":" + (secs % 60).ToString("00", CultureInfo.InvariantCulture);
        }

        /** The readable first line (fixed English — an old app shows exactly this). */
        public static string humanLine(int durMs)
        {
            return Mic + formatDuration(durMs) + HumanTail;
        }

        /** The English template for lengthLabel (the shell's `voiceMessageLength`). */
        public const string LengthLabelFallback = "Voice message ({0})";

        /** ★ #46 r2: "Voice message (0:12)" from the lang key `chat-voice-message-length` (the shell's `voiceMessageLength`:
         *  "{0}" = M:SS; cn / ja use full-width parentheses). A missing template, one without "{0}", or one string.Format
         *  refuses (a bad translation: "{1}", a stray "{") → the English fallback. Never throws. */
        public static string lengthLabel(string? template, int durMs)
        {
            string dur = formatDuration(durMs);
            if (!string.IsNullOrEmpty(template) && template.Contains("{0}"))
            {
                try
                {
                    return string.Format(CultureInfo.InvariantCulture, template, dur);
                }
                catch (FormatException)
                {
                    // a bad translation → the fallback below
                }
            }
            return string.Format(CultureInfo.InvariantCulture, LengthLabelFallback, dur);
        }

        /** Line 2 ("spixi.voice.1:<durMs>:<base64>") for these packets; null when a packet or the whole is out of bounds. */
        public static string? encodeInline(IReadOnlyList<byte[]> packets)
        {
            if (packets == null || packets.Count == 0 || packets.Count > MaxPackets)
            {
                return null;
            }
            int total = 0;
            foreach (byte[] p in packets)
            {
                if (p == null || p.Length < 1 || p.Length > MaxPacketBytes)
                {
                    return null;
                }
                total += 2 + p.Length;
                if (total > MaxPayloadBytes)
                {
                    return null;
                }
            }
            byte[] payload = new byte[total];
            int at = 0;
            foreach (byte[] p in packets)
            {
                payload[at] = (byte)(p.Length >> 8);
                payload[at + 1] = (byte)p.Length;
                Buffer.BlockCopy(p, 0, payload, at + 2, p.Length);
                at += 2 + p.Length;
            }
            int durMs = packets.Count * FrameMs;
            return MarkerPrefix + durMs.ToString(CultureInfo.InvariantCulture) + ":" + Convert.ToBase64String(payload);
        }

        /** The shape (no decode): line 1 = humanLine(durMs) exactly, one "\n", line 2 = prefix + 1..5 digits ≤ 31 000 + ":" + base64
         *  (charset, length % 4 == 0, ≤ 64 000 chars, "=" only as 0..2 trailing pads). b64Start = line 2's base64 index. */
        private static bool shape(string? text, out int durMs, out int b64Start)
        {
            durMs = 0;
            b64Start = -1;
            if (string.IsNullOrEmpty(text) || text.Length > MaxTextChars)
            {
                return false;
            }
            int nl = text.IndexOf('\n');
            if (nl < 0)
            {
                return false;
            }
            int i = nl + 1;
            if (string.CompareOrdinal(text, i, MarkerPrefix, 0, MarkerPrefix.Length) != 0)
            {
                return false;
            }
            i += MarkerPrefix.Length;
            int digits = 0, d = 0;
            while (i < text.Length && text[i] >= '0' && text[i] <= '9' && digits < 6)
            {
                d = d * 10 + (text[i] - '0');
                digits++;
                i++;
            }
            if (digits < 1 || digits > 5 || d > ParseMaxDurationMs || i >= text.Length || text[i] != ':')
            {
                return false;
            }
            i++;
            int len = text.Length - i;
            if (len < 4 || len > MaxBase64Chars || len % 4 != 0)
            {
                return false;
            }
            int pads = 0;
            for (int k = i; k < text.Length; k++)
            {
                char c = text[k];
                bool b64 = (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '+' || c == '/';
                if (c == '=')
                {
                    pads++;
                }
                else if (!b64 || pads > 0)
                {
                    return false;   // a foreign char (a 2nd "\n", "\r", a space …) or a char after a pad
                }
            }
            if (pads > 2)
            {
                return false;
            }
            string h = humanLine(d);   // ★ #46 r1 (§7): line 1 is EXACTLY the readable line for line 2's duration
            if (nl != h.Length || string.CompareOrdinal(text, 0, h, 0, h.Length) != 0)
            {
                return false;
            }
            durMs = d;
            b64Start = i;
            return true;
        }

        /** The full bounded parse. false (packets null) on anything out of shape or bounds; never throws. */
        public static bool tryParseInline(string? text, out int durMs, out List<byte[]>? packets)
        {
            try
            {
                if (parseInline(text, out durMs, out packets))
                {
                    return true;
                }
            }
            catch (Exception)
            {
                // belt (#46 r1): every index is bounds-checked; no input may throw
            }
            durMs = 0;
            packets = null;
            return false;
        }

        private static bool parseInline(string? text, out int durMs, out List<byte[]>? packets)
        {
            packets = null;
            if (!shape(text, out durMs, out int b64Start))
            {
                durMs = 0;
                return false;
            }
            int b64Len = text!.Length - b64Start;
            byte[] payload = new byte[b64Len / 4 * 3];
            if (!Convert.TryFromBase64Chars(text.AsSpan(b64Start, b64Len), payload, out int n) || n > MaxPayloadBytes)
            {
                durMs = 0;
                return false;
            }
            List<byte[]> list = new List<byte[]>();
            int at = 0;
            while (at < n)
            {
                if (n - at < 2 || list.Count >= MaxPackets)
                {
                    durMs = 0;
                    return false;   // a trailing byte / too many packets
                }
                int len = (payload[at] << 8) | payload[at + 1];
                at += 2;
                if (len < 1 || len > MaxPacketBytes || len > n - at || !isOne20msFrame(payload[at]))
                {
                    durMs = 0;
                    return false;
                }
                byte[] p = new byte[len];
                Buffer.BlockCopy(payload, at, p, 0, len);
                list.Add(p);
                at += len;
            }
            if (list.Count == 0 || Math.Abs(durMs - list.Count * FrameMs) > FrameMs)
            {
                durMs = 0;
                return false;
            }
            packets = list;
            return true;
        }

        /** The shape + bounds WITHOUT a base64 decode (chat rows, the chats-list excerpt, the edit guard). Every text
         *  tryParseInline accepts is accepted here (the reverse is not promised: the payload is not walked). */
        public static bool tryPeekInline(string? text, out int durMs)
        {
            try
            {
                if (shape(text, out durMs, out _))
                {
                    return true;
                }
            }
            catch (Exception)
            {
                // belt (#46 r1): no input may throw
            }
            durMs = 0;
            return false;
        }

        /** The text up to the first "\n" (the whole text when there is none). Rows push only this — never the base64. */
        public static string firstLine(string text)
        {
            if (text == null)
            {
                return "";
            }
            int nl = text.IndexOf('\n');
            return nl < 0 ? text : text.Substring(0, nl);
        }

        // ———————————————————————————— file name ————————————————————————————

        /* ★ 7b (#1224 (8), #1210 (8)) — THE VOICE-FOLDER SWEEP RULE. <spixiUserFolder>/Voice holds the voice FILES this
         * device SENT (SingleChatPage.sendVoiceFile): a complete .ogg is referenced by its own row (the sender plays it) and
         * serves a peer's later download, so it ALWAYS stays (VoiceClips' kept clips are memory-only — nothing of them is on
         * disk). The sweep deletes only C#'s own names that are ≥ SweepMinAgeSeconds old AND not a playable Ogg (empty, or the
         * first 4 bytes are not "OggS") — a send that died between the create and the write. */
        public const long SweepMinAgeSeconds = 24 * 3600;
        public const int SweepMaxFiles = 2000;

        public static bool isSweepable(string? name, long length, byte[]? head, long ageSeconds)
        {
            if (!isVoiceFileName(name) || ageSeconds < SweepMinAgeSeconds || length < 0)
            {
                return false;
            }
            if (length == 0)
            {
                return true;
            }
            return head == null || head.Length < 4 || head[0] != (byte)'O' || head[1] != (byte)'g' || head[2] != (byte)'g' || head[3] != (byte)'S';
        }

        /** ^voice-\d{8}-\d{6}\.ogg$ — ordinal, ASCII digits only (so no path separator, no case variant, no suffix). */
        public static bool isVoiceFileName(string? name)
        {
            const string head = "voice-", tail = ".ogg";
            if (name == null || name.Length != head.Length + 8 + 1 + 6 + tail.Length
                || !name.StartsWith(head, StringComparison.Ordinal) || !name.EndsWith(tail, StringComparison.Ordinal))
            {
                return false;
            }
            for (int i = head.Length; i < head.Length + 15; i++)
            {
                char c = name[i];
                bool ok = i == head.Length + 8 ? c == '-' : (c >= '0' && c <= '9');
                if (!ok)
                {
                    return false;
                }
            }
            return true;
        }

        /** voice-yyyyMMdd-HHmmss.ogg in UTC (a Local time is converted first). */
        public static string voiceFileName(DateTime utc)
        {
            if (utc.Kind == DateTimeKind.Local)
            {
                utc = utc.ToUniversalTime();
            }
            return "voice-" + utc.ToString("yyyyMMdd-HHmmss", CultureInfo.InvariantCulture) + ".ogg";
        }

        // ———————————————————————————— Ogg Opus ————————————————————————————

        private static readonly uint[] crcTable = makeCrcTable();

        private static uint[] makeCrcTable()
        {
            uint[] t = new uint[256];
            for (uint i = 0; i < 256; i++)
            {
                uint r = i << 24;
                for (int k = 0; k < 8; k++)
                {
                    r = (r & 0x80000000u) != 0 ? (r << 1) ^ 0x04C11DB7u : r << 1;
                }
                t[i] = r;
            }
            return t;
        }

        /** The Ogg CRC-32 (RFC 3533: poly 0x04C11DB7, init 0, no reflection, no final xor). */
        internal static uint oggCrc(byte[] data, int offset, int count)
        {
            uint crc = 0;
            for (int i = offset; i < offset + count; i++)
            {
                crc = (crc << 8) ^ crcTable[((crc >> 24) ^ data[i]) & 0xFF];
            }
            return crc;
        }

        /** One page: 27-byte header + the lacing values + the packets' bytes, CRC filled in. */
        private static void writePage(List<byte> outBuf, List<byte[]> pagePackets, byte flags, long granule, uint serial, uint seq)
        {
            List<byte> lacing = new List<byte>();
            foreach (byte[] p in pagePackets)
            {
                int left = p.Length;
                while (left >= 255)
                {
                    lacing.Add(255);
                    left -= 255;
                }
                lacing.Add((byte)left);   // < 255 ends the packet (0 after a 255·k packet)
            }
            int start = outBuf.Count;
            outBuf.AddRange(Encoding.ASCII.GetBytes("OggS"));
            outBuf.Add(0);   // version
            outBuf.Add(flags);
            for (int i = 0; i < 8; i++) outBuf.Add((byte)(granule >> (8 * i)));
            for (int i = 0; i < 4; i++) outBuf.Add((byte)(serial >> (8 * i)));
            for (int i = 0; i < 4; i++) outBuf.Add((byte)(seq >> (8 * i)));
            for (int i = 0; i < 4; i++) outBuf.Add(0);   // CRC, filled below
            outBuf.Add((byte)lacing.Count);
            outBuf.AddRange(lacing);
            foreach (byte[] p in pagePackets) outBuf.AddRange(p);
            byte[] page = outBuf.GetRange(start, outBuf.Count - start).ToArray();
            uint crc = oggCrc(page, 0, page.Length);
            for (int i = 0; i < 4; i++) outBuf[start + 22 + i] = (byte)(crc >> (8 * i));
        }

        private static int lacingCount(int len) => len / 255 + 1;

        /** RFC 7845 Ogg Opus from 1..1550 20 ms packets (local data — an empty list or an invalid packet is the caller's bug:
         *  ArgumentException). */
        public static byte[] muxOgg(IReadOnlyList<byte[]> packets, int preSkip, uint serial)
        {
            if (packets == null || packets.Count < 1 || packets.Count > MaxPackets || preSkip < 0 || preSkip > 0xFFFF)
            {
                throw new ArgumentException("voice mux: bad input");
            }
            foreach (byte[] p in packets)
            {
                if (p == null || p.Length < 1 || p.Length > MaxPacketBytes)
                {
                    throw new ArgumentException("voice mux: bad packet");
                }
            }
            List<byte> o = new List<byte>(packets.Count * 64 + 256);
            byte[] head = new byte[19];
            Encoding.ASCII.GetBytes("OpusHead").CopyTo(head, 0);
            head[8] = 1;                      // version
            head[9] = 1;                      // channels
            head[10] = (byte)preSkip;
            head[11] = (byte)(preSkip >> 8);
            head[12] = (byte)(SampleRate & 0xFF);
            head[13] = (byte)((SampleRate >> 8) & 0xFF);
            head[14] = (byte)((SampleRate >> 16) & 0xFF);
            head[15] = (byte)((SampleRate >> 24) & 0xFF);
            // [16..17] output gain 0, [18] mapping family 0
            byte[] vendor = Encoding.ASCII.GetBytes("Spixi");
            byte[] tags = new byte[8 + 4 + vendor.Length + 4];
            Encoding.ASCII.GetBytes("OpusTags").CopyTo(tags, 0);
            tags[8] = (byte)vendor.Length;
            vendor.CopyTo(tags, 12);          // the comment count (last 4 bytes) stays 0
            uint seq = 0;
            writePage(o, new List<byte[]> { head }, 0x02, 0, serial, seq++);
            writePage(o, new List<byte[]> { tags }, 0, 0, serial, seq++);
            List<byte[]> page = new List<byte[]>();
            int segs = 0;
            long granule = preSkip;
            for (int i = 0; i < packets.Count; i++)
            {
                int need = lacingCount(packets[i].Length);
                if (segs + need > 255)
                {
                    writePage(o, page, 0, granule, serial, seq++);
                    page = new List<byte[]>();
                    segs = 0;
                }
                page.Add(packets[i]);
                segs += need;
                granule += SamplesPerFrame48k;
            }
            writePage(o, page, 0x04, granule, serial, seq++);   // ≥ 1 packet → the last page is never empty
            return o.ToArray();
        }

        /** ★ #46 r1 (§7): a TOC byte (RFC 6716 §3.1) for ONE 20 ms frame — code 0 and a 20 ms config (either stereo bit): SILK 1 / 5 / 9,
         *  Hybrid 13 / 15, CELT 19 / 23 / 27 / 31. Every packet, inline and in a file, must be one (durMs = packets × 20). */
        internal static bool isOne20msFrame(byte toc)
        {
            int config = toc >> 3;
            bool twenty = config < 12 ? (config & 3) == 1 : config < 16 ? (config & 1) == 1 : (config & 3) == 3;
            return (toc & 3) == 0 && twenty;
        }

        /** The bounded demux (see the header). false on anything else; never throws. */
        public static bool tryDemuxOgg(byte[]? data, out List<byte[]>? packets, out int durMs)
        {
            packets = null;
            durMs = 0;
            try
            {
                return demux(data, out packets, out durMs);
            }
            catch (Exception)
            {
                packets = null;   // belt: every index is bounds-checked above; nothing from the file escapes
                durMs = 0;
                return false;
            }
        }

        private static uint le32(byte[] b, int at) => (uint)(b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24));

        private static bool demux(byte[]? data, out List<byte[]>? packets, out int durMs)
        {
            packets = null;
            durMs = 0;
            if (data == null || data.Length < 27 || data.Length > MaxOggBytes)
            {
                return false;
            }
            List<byte[]> all = new List<byte[]>();   // OpusHead, OpusTags, then audio
            List<byte> building = new List<byte>();
            bool pending = false;
            uint serial = 0;
            int pos = 0, pageNo = 0, packetsAfterPage0 = -1;
            while (pos < data.Length)
            {
                if (data.Length - pos < 27 || data[pos] != 'O' || data[pos + 1] != 'g' || data[pos + 2] != 'g' || data[pos + 3] != 'S' || data[pos + 4] != 0)
                {
                    return false;
                }
                byte flags = data[pos + 5];
                uint s = le32(data, pos + 14);
                int nsegs = data[pos + 26];
                int hdr = 27 + nsegs;
                if (data.Length - pos < hdr)
                {
                    return false;
                }
                int body = 0;
                for (int k = 0; k < nsegs; k++) body += data[pos + 27 + k];
                if (data.Length - pos - hdr < body)
                {
                    return false;
                }
                uint stored = le32(data, pos + 22);
                byte[] page = new byte[hdr + body];
                Buffer.BlockCopy(data, pos, page, 0, page.Length);
                page[22] = page[23] = page[24] = page[25] = 0;
                if (oggCrc(page, 0, page.Length) != stored)
                {
                    return false;
                }
                bool bos = (flags & 0x02) != 0, cont = (flags & 0x01) != 0;
                if (pageNo == 0)
                {
                    if (!bos || cont)
                    {
                        return false;
                    }
                    serial = s;
                }
                else if (s != serial || bos)
                {
                    return false;   // a second logical stream
                }
                if (cont != pending)
                {
                    return false;   // a continuation flag that does not match the previous page
                }
                int at = hdr;
                for (int k = 0; k < nsegs; k++)
                {
                    int seg = page[27 + k];
                    building.AddRange(new ArraySegment<byte>(page, at, seg));
                    at += seg;
                    if (building.Count > MaxOggBytes)
                    {
                        return false;
                    }
                    if (seg != 255)   // a lacing value below 255 ends the packet
                    {
                        all.Add(building.ToArray());
                        building.Clear();
                        if (all.Count > MaxPackets + 2)
                        {
                            return false;
                        }
                    }
                }
                if (nsegs > 0)
                {
                    pending = page[27 + nsegs - 1] == 255;   // a last lacing value of 255 = the packet goes on
                }
                if (pageNo == 0)
                {
                    packetsAfterPage0 = all.Count;
                }
                pos += page.Length;
                pageNo++;
            }
            if (pending || packetsAfterPage0 != 1 || all.Count < 3)
            {
                return false;   // a cut packet · OpusHead not alone on page 0 · no audio
            }
            byte[] head = all[0];
            if (head.Length < 19 || Encoding.ASCII.GetString(head, 0, 8) != "OpusHead" || (head[8] & 0xF0) != 0
                || (head[9] != 1 && head[9] != 2) || head[18] != 0)
            {
                return false;
            }
            if (all[1].Length < 8 || Encoding.ASCII.GetString(all[1], 0, 8) != "OpusTags")
            {
                return false;
            }
            List<byte[]> audio = all.GetRange(2, all.Count - 2);   // ≤ MaxPackets: the page walk stops at MaxPackets + 2
            foreach (byte[] p in audio)
            {
                if (p.Length < 1 || p.Length > MaxPacketBytes || !isOne20msFrame(p[0]))
                {
                    return false;
                }
            }
            packets = audio;
            durMs = audio.Count * FrameMs;   // ≤ 1 550 × 20 = ParseMaxDurationMs
            return true;
        }

        // ———————————————————————————— waveform + route ————————————————————————————

        /** `count` bars, each 0..100: max |sample| per slice, scaled to the clip's loudest slice; silence → zeros. */
        public static int[] peaks(short[] pcm, int count)
        {
            if (count <= 0)
            {
                return new int[0];
            }
            int[] raw = new int[count];
            int len = pcm == null ? 0 : pcm.Length;
            int max = 0;
            for (int i = 0; i < count; i++)
            {
                int from = (int)((long)len * i / count), to = (int)((long)len * (i + 1) / count);
                int m = 0;
                for (int k = from; k < to; k++)
                {
                    int a = Math.Abs((int)pcm![k]);   // |-32768| = 32768 as int
                    if (a > m) m = a;
                }
                raw[i] = m;
                if (m > max) max = m;
            }
            int[] bars = new int[count];
            if (max == 0)
            {
                return bars;
            }
            for (int i = 0; i < count; i++)
            {
                bars[i] = (int)(((long)raw[i] * 100 + max / 2) / max);
            }
            return bars;
        }

        /** "12,40,…" (invariant digits). */
        public static string peaksCsv(int[] peaks)
        {
            if (peaks == null || peaks.Length == 0)
            {
                return "";
            }
            StringBuilder sb = new StringBuilder(peaks.Length * 4);
            for (int i = 0; i < peaks.Length; i++)
            {
                if (i > 0) sb.Append(',');
                sb.Append(peaks[i].ToString(CultureInfo.InvariantCulture));
            }
            return sb.ToString();
        }

        public enum Route { Inline, File }

        /** ★ #1208 (2)/(3): inline only to a confirmed new app in an approved normal 1:1 (not a bot) when the text fits. */
        public static Route chooseRoute(bool isNormal1to1, bool isBot, bool isApproved, bool peerSupportsVoice, int inlineTextLength, int maxChatMessageSize)
        {
            return isNormal1to1 && !isBot && isApproved && peerSupportsVoice && inlineTextLength > 0 && inlineTextLength <= maxChatMessageSize
                ? Route.Inline : Route.File;
        }

        /** Receive side: a bot room never decodes a stranger's clip (public rooms) → its rows show the plain first line. */
        public static bool rendersAsVoice(bool isBot)
        {
            return !isBot;
        }
    }
}
