// ★ #1208 (session 7) — the voice codec (Spixi/Utils/VoiceCodec.cs), EXECUTED: the inline wire text and EVERY parser
// bound (each refused without a throw), the peek (no decode) against the full parse, the duration text, the file name,
// the Ogg Opus mux → demux (RFC 7845 / 3533: CRC checked against an independent bitwise CRC + a page writer written
// here, lacing at 255 · k, > 255 segments), every demux refusal, the waveform peaks, the route and the bot-room rule.
using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class VoiceCodecTests
{
    // —— helpers ——
    const byte SilkWb20 = 0x48;   // TOC: config 9 (SILK WB 20 ms), code 0 → 960 samples at 48 kHz
    const byte SilkNb60 = 0x18;   // TOC: config 3 (SILK NB 60 ms), code 0 — not a 20 ms frame (§7 refuses it)

    static byte[] Pkt(int len, byte toc = SilkWb20, int seed = 1)
    {
        var p = new byte[len];
        p[0] = toc;
        for (int i = 1; i < len; i++) p[i] = (byte)(i * 31 + seed);
        return p;
    }

    static List<byte[]> Pkts(int n, int len = 20, byte toc = SilkWb20)
    {
        var l = new List<byte[]>();
        for (int i = 0; i < n; i++) l.Add(Pkt(len, toc, i));
        return l;
    }

    static byte[] Payload(IEnumerable<byte[]> ps)
    {
        var o = new List<byte>();
        foreach (var p in ps) { o.Add((byte)(p.Length >> 8)); o.Add((byte)p.Length); o.AddRange(p); }
        return o.ToArray();
    }

    static string Text(int durMs, byte[] payload) => VoiceCodec.humanLine(durMs) + "\n" + "spixi.voice.1:" + durMs + ":" + Convert.ToBase64String(payload);

    static bool Same(IReadOnlyList<byte[]> a, IReadOnlyList<byte[]>? b)
    {
        if (b == null || a.Count != b.Count) return false;
        for (int i = 0; i < a.Count; i++)
        {
            if (a[i].Length != b[i].Length) return false;
            for (int k = 0; k < a[i].Length; k++) if (a[i][k] != b[i][k]) return false;
        }
        return true;
    }

    static bool Refused(string? text)
    {
        bool ok = VoiceCodec.tryParseInline(text, out int d, out var ps);
        return !ok && ps == null && d == 0;
    }

    // an independent, bitwise CRC (no table) — RFC 3533: poly 0x04C11DB7, init 0, no reflection, no final xor
    static uint BitCrc(byte[] d, int off, int len)
    {
        uint c = 0;
        for (int i = off; i < off + len; i++)
        {
            c ^= (uint)d[i] << 24;
            for (int k = 0; k < 8; k++) c = (c & 0x80000000u) != 0 ? (c << 1) ^ 0x04C11DB7u : c << 1;
        }
        return c;
    }

    // the pages of an Ogg file: (offset, length, flags, granule, serial, segment table)
    sealed class Page { public int at, len, flags, nsegs; public long granule; public uint serial; public byte[] lacing = new byte[0]; }
    static List<Page> Pages(byte[] f)
    {
        var l = new List<Page>();
        int pos = 0;
        while (pos < f.Length)
        {
            int n = f[pos + 26];
            int body = 0;
            var lac = new byte[n];
            for (int k = 0; k < n; k++) { lac[k] = f[pos + 27 + k]; body += lac[k]; }
            l.Add(new Page { at = pos, len = 27 + n + body, flags = f[pos + 5], nsegs = n, granule = BitConverter.ToInt64(f, pos + 6), serial = BitConverter.ToUInt32(f, pos + 14), lacing = lac });
            pos += 27 + n + body;
        }
        return l;
    }

    // a page writer written HERE (not the codec's) — builds files the muxer refuses to make (too many packets, two streams …)
    static void TestPage(List<byte> o, IList<byte[]> ps, byte flags, long granule, uint serial, uint seq)
    {
        var lac = new List<byte>();
        var body = new List<byte>();
        foreach (var p in ps) { int l = p.Length; while (l >= 255) { lac.Add(255); l -= 255; } lac.Add((byte)l); body.AddRange(p); }
        RawPage(o, lac, body, flags, granule, serial, seq);
    }

    /** One page from explicit lacing values + body bytes (a packet may be cut at the page end), CRC correct. */
    static void RawPage(List<byte> o, IList<byte> lac, IList<byte> body, byte flags, long granule, uint serial, uint seq)
    {
        int start = o.Count;
        o.AddRange(Encoding.ASCII.GetBytes("OggS")); o.Add(0); o.Add(flags);
        o.AddRange(BitConverter.GetBytes(granule)); o.AddRange(BitConverter.GetBytes(serial)); o.AddRange(BitConverter.GetBytes(seq));
        o.AddRange(new byte[4]); o.Add((byte)lac.Count); o.AddRange(lac); o.AddRange(body);
        var page = o.GetRange(start, o.Count - start).ToArray();
        uint c = BitCrc(page, 0, page.Length);
        for (int i = 0; i < 4; i++) o[start + 22 + i] = (byte)(c >> (8 * i));
    }

    static byte[] Head(byte channels = 1, byte family = 0, byte version = 1)
    {
        var h = new byte[19];
        Encoding.ASCII.GetBytes("OpusHead").CopyTo(h, 0);
        h[8] = version; h[9] = channels; h[10] = 0x38; h[11] = 1; h[12] = 0x80; h[13] = 0x3E; h[18] = family;
        return h;
    }
    static byte[] Tags() { var t = new byte[16]; Encoding.ASCII.GetBytes("OpusTags").CopyTo(t, 0); return t; }

    /** A test-made Ogg Opus: head page, tags page, audio pages of `perPage` packets each. */
    static byte[] TestOgg(IList<byte[]> audio, int perPage = 200, uint serial = 7, uint? secondSerial = null, byte channels = 1, byte family = 0)
    {
        var o = new List<byte>();
        uint seq = 0;
        TestPage(o, new[] { Head(channels, family) }, 0x02, 0, serial, seq++);
        TestPage(o, new[] { Tags() }, 0, 0, serial, seq++);
        for (int i = 0; i < audio.Count; i += perPage)
        {
            var chunk = new List<byte[]>();
            for (int k = i; k < Math.Min(audio.Count, i + perPage); k++) chunk.Add(audio[k]);
            bool last = i + perPage >= audio.Count;
            uint s = secondSerial != null && i > 0 ? secondSerial.Value : serial;
            TestPage(o, chunk, last ? (byte)0x04 : (byte)0, 312 + 960L * Math.Min(audio.Count, i + perPage), s, seq++);
        }
        return o.ToArray();
    }

    // —— the inline text ——
    [TestMethod]
    public void inline_round_trip_keeps_every_packet_and_the_duration()
    {
        var ps = new List<byte[]> { Pkt(1), Pkt(2), Pkt(254), Pkt(255), Pkt(256), Pkt(1275) };
        ps.AddRange(Pkts(44, 37));
        string? line2 = VoiceCodec.encodeInline(ps);
        Assert.IsTrue(line2 != null && line2.StartsWith("spixi.voice.1:1000:", StringComparison.Ordinal), "line 2 = the marker + durMs (50 × 20) + base64");
        string text = VoiceCodec.humanLine(1000) + "\n" + line2;
        Assert.IsTrue(VoiceCodec.tryParseInline(text, out int d, out var back), "parses");
        Assert.AreEqual(1000, d, "durMs");
        Assert.IsTrue(Same(ps, back), "the same packets, in order");
        Assert.IsTrue(VoiceCodec.tryPeekInline(text, out int pd) && pd == 1000, "the peek agrees");
        Assert.AreEqual(VoiceCodec.humanLine(1000), VoiceCodec.firstLine(text), "firstLine = the readable line only (never the base64)");
        Assert.AreEqual("plain", VoiceCodec.firstLine("plain"), "no \\n → the whole text");
    }

    [TestMethod]
    public void the_encoder_bounds_and_the_text_limit()
    {
        // encodeInline bounds the PACKETS (count, each length, the payload); the full TEXT bound is the route's job:
        // a payload near 48 000 bytes makes line 2 alone ~64 000 chars, so humanLine + "\n" + line 2 is over MaxTextChars —
        // the parser refuses such a text and chooseRoute (text length > maxChatMessageSize 64 000) sends it as a FILE.
        Assert.IsTrue(VoiceCodec.encodeInline(new List<byte[]>()) == null, "no packets");
        Assert.IsTrue(VoiceCodec.encodeInline(new List<byte[]> { new byte[0] }) == null, "a 0-byte packet");
        Assert.IsTrue(VoiceCodec.encodeInline(new List<byte[]> { new byte[1276] }) == null, "a 1276-byte packet");
        Assert.IsTrue(VoiceCodec.encodeInline(Pkts(1550, 1)) != null, "1550 packets → ok");
        Assert.IsTrue(VoiceCodec.encodeInline(Pkts(1551, 1)) == null, "1551 packets → null");
        // exactly 48 000 payload bytes: 37 × (2 + 1275) + (2 + 749) = 47 249 + 751
        var full = Pkts(37, 1275); full.Add(Pkt(749));
        Assert.AreEqual(48000, Payload(full).Length, "the fixture is exactly at the bound");
        string? line2 = VoiceCodec.encodeInline(full);
        Assert.IsTrue(line2 != null, "48 000 payload bytes → a line 2");
        string text = VoiceCodec.humanLine(760) + "\n" + line2;
        Assert.IsTrue(text.Length > VoiceCodec.MaxTextChars, "…but the full text is over MaxTextChars (" + text.Length + ")");
        Assert.IsTrue(Refused(text), "…so no inline TEXT over MaxTextChars parses");
        Assert.AreEqual(VoiceCodec.Route.File, VoiceCodec.chooseRoute(true, false, true, true, text.Length, 64000), "…and the route is the FILE");
        full.Add(Pkt(1));
        Assert.IsTrue(VoiceCodec.encodeInline(full) == null, "48 003 payload bytes → null");
    }

    [TestMethod]
    public void bound_text_longer_than_64000_is_refused()
    {
        // 37 × 1275 + one packet of `last` bytes (38 packets, 760 ms): find the size that puts the text just over 64 000
        // with the payload still under 48 000 (so ONLY the text bound can refuse it)
        string? over = null, under = null;
        for (int last = 1; last <= 749 && over == null; last++)
        {
            var ps = Pkts(37, 1275); ps.Add(Pkt(last));
            string t = Text(760, Payload(ps));
            if (t.Length > 64000) { over = t; var u = Pkts(37, 1275); u.Add(Pkt(last - 3)); under = Text(760, Payload(u)); }
        }
        Assert.IsTrue(over != null && over.Length <= 64004 && under != null && under.Length <= 64000, "fixtures (" + over?.Length + " / " + under?.Length + ")");
        Assert.IsTrue(Refused(over), "over 64 000 chars → refused");
        Assert.IsFalse(VoiceCodec.tryPeekInline(over, out _), "…by the peek too");
        Assert.IsTrue(VoiceCodec.tryParseInline(under, out _, out _), "≤ 64 000 chars → ok");
    }

    [TestMethod]
    public void bound_durMs_above_31000_is_refused()
    {
        var at = Pkts(1550, 1);
        Assert.IsTrue(VoiceCodec.tryParseInline(Text(31000, Payload(at)), out int d, out _) && d == 31000, "31 000 ms / 1550 packets → ok");
        string over = VoiceCodec.humanLine(31001) + "\nspixi.voice.1:31001:" + Convert.ToBase64String(Payload(at));
        Assert.IsTrue(Refused(over), "31 001 → refused");
        Assert.IsFalse(VoiceCodec.tryPeekInline(over, out _), "…by the peek (a shape bound)");
        Assert.IsTrue(Refused(VoiceCodec.humanLine(123456) + "\nspixi.voice.1:123456:" + Convert.ToBase64String(Payload(at))), "6 digits → refused");
        Assert.IsTrue(Refused(VoiceCodec.humanLine(0) + "\nspixi.voice.1::" + Convert.ToBase64String(Payload(at))), "no digits → refused");
    }

    [TestMethod]
    public void bound_more_than_1550_packets_is_refused()
    {
        var p = Payload(Pkts(1551, 1));
        Assert.IsTrue(Refused(Text(31000, p)), "1551 packets (durMs 31 000, within ±20 of 31 020) → refused");
        Assert.IsTrue(VoiceCodec.tryPeekInline(Text(31000, p), out _), "the peek does not walk the payload (shape only)");
    }

    [TestMethod]
    public void bound_payload_above_48000_bytes_is_refused()
    {
        var full = Pkts(37, 1275); full.Add(Pkt(749)); full.Add(Pkt(1));   // 48 003 bytes → 64 004 base64 chars
        string t = Text(760, Payload(full));
        Assert.IsTrue(Refused(t), "48 003 payload bytes → refused");
        Assert.IsFalse(VoiceCodec.tryPeekInline(t, out _), "…by the peek (the base64 length)");
    }

    [TestMethod]
    public void bound_packet_length_0_or_above_1275_is_refused()
    {
        Assert.IsTrue(Refused(Text(20, new byte[] { 0, 0 })), "length 0");
        Assert.IsTrue(Refused(Text(40, new byte[] { 0, 0, 0, 1, 7 })), "length 0 before a good packet");
        var big = new byte[2 + 1276]; big[0] = 1276 >> 8; big[1] = 1276 & 0xFF; big[2] = SilkWb20;   // a valid TOC: only the length refuses
        Assert.IsTrue(Refused(Text(20, big)), "length 1276");
        var max = new byte[2 + 1275]; max[0] = 1275 >> 8; max[1] = 1275 & 0xFF; max[2] = SilkWb20;
        Assert.IsTrue(VoiceCodec.tryParseInline(Text(20, max), out _, out _), "length 1275 → ok");
        Assert.IsTrue(Refused(Text(20, new byte[] { 0, 9, 1, 2 })), "a length past the end");
    }

    [TestMethod]
    public void bound_a_trailing_byte_is_refused()
    {
        var p = new List<byte>(Payload(Pkts(3)));
        Assert.IsTrue(VoiceCodec.tryParseInline(Text(60, p.ToArray()), out _, out _), "the control parses");
        p.Add(0x41);
        Assert.IsTrue(Refused(Text(60, p.ToArray())), "one trailing byte (a 1-byte remainder) → refused, no throw");
        Assert.IsTrue(Refused(Text(20, new byte[] { 0x00 })), "a payload of ONE byte → refused, no throw");
        Assert.IsTrue(Refused(Text(20, new byte[] { 0x00, 0x01 })), "a length with no packet → refused, no throw");
    }

    [TestMethod]
    public void bound_bad_base64_is_refused()
    {
        string head = VoiceCodec.humanLine(20) + "\nspixi.voice.1:20:";
        foreach (var bad in new[] { "AAE!", "AAEAB", "A===", "AA=A", "AAE A", "AA E", "" })
        {
            Assert.IsTrue(Refused(head + bad), "parse refuses: [" + bad + "]");
            Assert.IsFalse(VoiceCodec.tryPeekInline(head + bad, out _), "the peek (no decode) refuses it too: [" + bad + "]");
        }
        Assert.IsTrue(VoiceCodec.tryParseInline(head + Convert.ToBase64String(new byte[] { 0, 1, SilkWb20 }), out _, out _), "the control parses");
    }

    [TestMethod]
    public void bound_the_newline_shape_is_exact()
    {
        string line2 = "spixi.voice.1:60:" + Convert.ToBase64String(Payload(Pkts(3)));
        string h = VoiceCodec.humanLine(60);
        Assert.IsTrue(VoiceCodec.tryParseInline(h + "\n" + line2, out _, out _), "the control parses");
        Assert.IsTrue(Refused(h + "\n" + line2 + "\n"), "a second \\n after line 2");
        Assert.IsTrue(Refused(h + "\nmore\n" + line2), "a second \\n before line 2");
        Assert.IsTrue(Refused(h + "\r\n" + line2), "\\r\\n");
        Assert.IsTrue(Refused(h + "\n" + line2 + "\r"), "a trailing \\r");
        Assert.IsTrue(Refused(line2), "line 2 alone (no \\n)");
        Assert.IsTrue(Refused(null), "null");
        Assert.IsTrue(Refused(""), "empty");
    }

    [TestMethod]
    public void bound_the_prefix_is_exact()
    {
        string b64 = Convert.ToBase64String(Payload(Pkts(3)));
        string h = VoiceCodec.humanLine(60) + "\n";
        Assert.IsTrue(Refused(h + "spixi.voice.2:60:" + b64), "voice.2");
        Assert.IsTrue(Refused(h + "Spixi.voice.1:60:" + b64), "case");
        Assert.IsTrue(Refused(h + " spixi.voice.1:60:" + b64), "a leading space");
        Assert.IsTrue(Refused(h + "spixi.voice.1-60:" + b64), "no colon");
        Assert.IsTrue(Refused(h + "spixi.voice.1:60" + b64), "no second colon");
        Assert.IsTrue(Refused(h + "spixi.voice.1:6O:" + b64), "a letter in the digits");
    }

    [TestMethod]
    public void bound_durMs_must_match_the_packet_count_within_20()
    {
        var p = Payload(Pkts(10));   // 200 ms
        Assert.IsTrue(VoiceCodec.tryParseInline(Text(180, p), out _, out _), "180 → ok (−20)");
        Assert.IsTrue(VoiceCodec.tryParseInline(Text(220, p), out _, out _), "220 → ok (+20)");
        Assert.IsTrue(Refused(Text(179, p)), "179 → refused");
        Assert.IsTrue(Refused(Text(221, p)), "221 → refused");
    }

    // ★ #46 r1 (§7): line 1 must be EXACTLY humanLine(durMs) of line 2's duration
    [TestMethod]
    public void line_1_must_be_the_exact_human_line()
    {
        string line2 = "spixi.voice.1:1000:" + Convert.ToBase64String(Payload(Pkts(50)));
        Assert.IsTrue(VoiceCodec.tryParseInline(VoiceCodec.humanLine(1000) + "\n" + line2, out _, out _), "the exact line 1 → ok");
        Assert.IsTrue(VoiceCodec.tryPeekInline(VoiceCodec.humanLine(1000) + "\n" + line2, out _), "…the peek too");
        foreach (var l1 in new[] { "hello", "", VoiceCodec.humanLine(2000), VoiceCodec.humanLine(1000) + " ", " " + VoiceCodec.humanLine(1000),
                                   VoiceCodec.humanLine(1000) + "\r", "🎤 0:01 (voice message)", VoiceCodec.humanLine(1000).ToUpperInvariant() })
        {
            Assert.IsTrue(Refused(l1 + "\n" + line2), "parse refuses line 1 [" + l1 + "]");
            Assert.IsFalse(VoiceCodec.tryPeekInline(l1 + "\n" + line2, out _), "peek refuses line 1 [" + l1 + "]");
        }
        Assert.AreEqual("🎤 0:01 (voice message — update Spixi to play)", VoiceCodec.humanLine(1000), "1000 ms reads 0:01");
        Assert.IsTrue(VoiceCodec.tryParseInline(VoiceCodec.humanLine(1001) + "\nspixi.voice.1:1001:" + Convert.ToBase64String(Payload(Pkts(50))), out _, out _),
            "line 1 follows line 2's duration (1001 → 0:01), not the packet count");
    }

    // ★ #46 r1 (§7): every packet is ONE 20 ms frame — an independent RFC 6716 §3.1 table, all 256 TOC bytes
    [TestMethod]
    public void the_20ms_frame_rule_for_every_toc_byte()
    {
        // frame ms per config (RFC 6716 table 2): SILK 0–11 (10,20,40,60 per bandwidth) · Hybrid 12–15 (10,20) · CELT 16–31 (2.5,5,10,20)
        double[] ms = { 10, 20, 40, 60, 10, 20, 40, 60, 10, 20, 40, 60, 10, 20, 10, 20, 2.5, 5, 10, 20, 2.5, 5, 10, 20, 2.5, 5, 10, 20, 2.5, 5, 10, 20 };
        int yes = 0;
        for (int toc = 0; toc < 256; toc++)
        {
            bool want = (toc & 3) == 0 && ms[toc >> 3] == 20;
            if (want) yes++;
            Assert.AreEqual(want, VoiceCodec.isOne20msFrame((byte)toc), "TOC 0x" + toc.ToString("X2"));
        }
        Assert.AreEqual(18, yes, "nine 20 ms configs (SILK 1/5/9, Hybrid 13/15, CELT 19/23/27/31) × the stereo bit");
    }

    [TestMethod]
    public void inline_refuses_a_packet_that_is_not_one_20ms_frame()
    {
        Assert.IsTrue(VoiceCodec.tryParseInline(Text(60, Payload(Pkts(3))), out _, out _), "the control (SILK WB 20 ms)");
        foreach (byte toc in new byte[] { 0x40 /* SILK WB 10 */, 0x50 /* 40 */, 0x58 /* 60 */, 0x60 /* Hybrid 10 */, 0x80 /* CELT 2.5 */, 0x88 /* 5 */, 0x90 /* 10 */,
                                          0x49 /* code 1 */, 0x4A /* code 2 */, 0x4B /* code 3 */ })
        {
            var ps = Pkts(3); ps[1] = Pkt(20, toc);
            Assert.IsTrue(Refused(Text(60, Payload(ps))), "inline refuses TOC 0x" + toc.ToString("X2"));
            Assert.IsFalse(VoiceCodec.tryDemuxOgg(TestOgg(ps), out _, out _), "the demux refuses TOC 0x" + toc.ToString("X2"));
        }
        foreach (byte toc in new byte[] { 0x08, 0x28, 0x48, 0x68, 0x78, 0x98, 0xB8, 0xD8, 0xF8 })
        {
            var ps = Pkts(3, 20, toc);
            Assert.IsTrue(VoiceCodec.tryParseInline(Text(60, Payload(ps)), out _, out _), "inline accepts TOC 0x" + toc.ToString("X2"));
            Assert.IsTrue(VoiceCodec.tryDemuxOgg(TestOgg(ps), out _, out int d) && d == 60, "the demux accepts TOC 0x" + toc.ToString("X2"));
        }
    }

    [TestMethod]
    public void the_peek_agrees_with_the_parse_on_shape()
    {
        var good = Payload(Pkts(4));
        var texts = new List<string?>
        {
            Text(80, good), Text(100, good), Text(80, new byte[] { 0, 0 }), Text(80, new byte[] { 0, 1, 7, 9 }),
            VoiceCodec.humanLine(80) + "\r\nspixi.voice.1:80:" + Convert.ToBase64String(good),
            "x\nspixi.voice.1:80:" + Convert.ToBase64String(good) + "\n", "x\nspixi.voice.1:99999:AAAA", "x\nspixi.voice.1:80:A===",
            "hello", "> quote\nbody", null, "", "🎤 0:01 (voice message — update Spixi to play)",
            "wrong\nspixi.voice.1:80:" + Convert.ToBase64String(good),
        };
        var rnd = new Random(11);
        string seed = Text(80, good);
        for (int i = 0; i < 300; i++)
        {
            var c = seed.ToCharArray();
            c[rnd.Next(c.Length)] = "A+/=\n\r:x9 "[rnd.Next(10)];
            texts.Add(new string(c));
            texts.Add(seed.Substring(0, rnd.Next(seed.Length)));
        }
        foreach (var t in texts)
        {
            bool parse = VoiceCodec.tryParseInline(t, out int d1, out _);
            bool peek = VoiceCodec.tryPeekInline(t, out int d2);
            Assert.IsTrue(!parse || (peek && d1 == d2), "parse ⇒ peek, the same durMs: " + (t == null ? "null" : t.Length.ToString()));
            if (!peek) Assert.AreEqual(0, d2, "a refused peek reports 0");
        }
        Assert.IsTrue(VoiceCodec.tryPeekInline(Text(80, good), out int pd) && pd == 80, "a good text peeks");
        Assert.IsFalse(VoiceCodec.tryPeekInline("hello\nworld", out _), "two plain lines");
    }

    // —— text helpers ——
    [TestMethod]
    public void format_duration_rounds_half_up_with_a_one_second_floor()
    {
        Assert.AreEqual("0:00", VoiceCodec.formatDuration(0), "0");
        Assert.AreEqual("0:00", VoiceCodec.formatDuration(-5), "negative");
        Assert.AreEqual("0:01", VoiceCodec.formatDuration(1), "1 ms → the floor");
        Assert.AreEqual("0:01", VoiceCodec.formatDuration(499), "499 → the floor");
        Assert.AreEqual("0:01", VoiceCodec.formatDuration(500), "500 → half up");
        Assert.AreEqual("0:01", VoiceCodec.formatDuration(1499), "1499");
        Assert.AreEqual("0:02", VoiceCodec.formatDuration(1500), "1500 → half up");
        Assert.AreEqual("0:12", VoiceCodec.formatDuration(12_340), "12 340");
        Assert.AreEqual("0:30", VoiceCodec.formatDuration(29_999), "29 999");
        Assert.AreEqual("0:30", VoiceCodec.formatDuration(30_000), "30 000");
        Assert.AreEqual("1:01", VoiceCodec.formatDuration(61_000), "61 000");
        Assert.AreEqual("35791:24", VoiceCodec.formatDuration(int.MaxValue), "no overflow at int.MaxValue");
    }

    [TestMethod]
    public void human_line_is_the_exact_fixed_english()
    {
        Assert.AreEqual("🎤 0:12 (voice message — update Spixi to play)", VoiceCodec.humanLine(12_340), "12 s");
        Assert.AreEqual("🎤 0:00 (voice message — update Spixi to play)", VoiceCodec.humanLine(0), "0");
    }

    // ★ #46 r2: the localized "Voice message (0:12)" — the shell's voiceMessageLength template, a safe fallback
    [TestMethod]
    public void length_label_uses_the_template_and_falls_back_safely()
    {
        Assert.AreEqual("Voice message (0:12)", VoiceCodec.lengthLabel("Voice message ({0})", 12_340), "English");
        Assert.AreEqual("语音消息（0:12）", VoiceCodec.lengthLabel("语音消息（{0}）", 12_340), "cn: full-width parentheses kept");
        Assert.AreEqual("(0:05) Sprachnachricht", VoiceCodec.lengthLabel("({0}) Sprachnachricht", 5_000), "the placeholder may move");
        foreach (var bad in new string?[] { null, "", "Voice message", "Voice {1} ({0})", "Voice {0} {", "Voice {0} }x{" })
        {
            Assert.AreEqual("Voice message (0:12)", VoiceCodec.lengthLabel(bad, 12_340), "fallback for [" + (bad ?? "null") + "] (no throw)");
        }
        Assert.AreEqual(VoiceCodec.LengthLabelFallback, "Voice message ({0})", "the fallback = the shell's English");
    }

    [TestMethod]
    public void voice_file_names()
    {
        Assert.IsTrue(VoiceCodec.isVoiceFileName("voice-20261005-120000.ogg"), "the pattern");
        Assert.IsTrue(VoiceCodec.isVoiceFileName("voice-00000000-000000.ogg"), "all zeros (the pattern only)");
        foreach (var n in new[] { "Voice-20261005-120000.ogg", "voice-20261005-120000.OGG", "voice-20261005-120000.ogg.exe", "voice-20261005-120000.ogg ",
                                  "x/voice-20261005-120000.ogg", "..\\voice-20261005-120000.ogg", "voice-20261005/120000.ogg", "voice-2026100-1200000.ogg",
                                  "voice-2026100a-120000.ogg", "voice-20261005_120000.ogg", "voice-20261005-12000.ogg", "voice-20261005-120000.opus",
                                  "voice-٢٠٢٦١٠٠٥-120000.ogg", "", "voice-.ogg" })
        {
            Assert.IsFalse(VoiceCodec.isVoiceFileName(n), "refused: " + n);
        }
        Assert.IsFalse(VoiceCodec.isVoiceFileName(null), "null");
    }

    [TestMethod]
    public void voice_file_name_is_utc_and_matches_the_pattern()
    {
        var t = new DateTime(2026, 10, 5, 17, 8, 9, DateTimeKind.Utc);
        Assert.AreEqual("voice-20261005-170809.ogg", VoiceCodec.voiceFileName(t), "yyyyMMdd-HHmmss (24 h)");
        Assert.IsTrue(VoiceCodec.isVoiceFileName(VoiceCodec.voiceFileName(t)), "the receiver recognises it");
        var local = t.ToLocalTime();
        Assert.AreEqual("voice-20261005-170809.ogg", VoiceCodec.voiceFileName(local), "a Local time is converted to UTC (vacuous on a UTC host)");
        Assert.IsTrue(VoiceCodec.isVoiceFileName(VoiceCodec.voiceFileName(DateTime.MaxValue)), "the widest date still fits");
    }

    // —— Ogg Opus ——
    [TestMethod]
    public void ogg_mux_demux_round_trip()
    {
        var ps = new List<byte[]> { Pkt(1), Pkt(254), Pkt(255), Pkt(256), Pkt(510), Pkt(1275) };
        ps.AddRange(Pkts(94, 23));
        byte[] f = VoiceCodec.muxOgg(ps, 312, 0xDEADBEEF);
        Assert.IsTrue(VoiceCodec.tryDemuxOgg(f, out var back, out int d), "demuxes");
        Assert.IsTrue(Same(ps, back), "the same packets, in order");
        Assert.AreEqual(2000, d, "100 × 20 ms");
        var pages = Pages(f);
        Assert.IsTrue(pages.Count >= 3, "head, tags, audio");
        Assert.AreEqual(0x02, pages[0].flags, "page 0 = BOS only");
        Assert.AreEqual(0, pages[1].flags, "page 1 = no flag");
        Assert.AreEqual(0x04, pages[pages.Count - 1].flags, "the last page = EOS");
        Assert.AreEqual(312L + 100 * 960, pages[pages.Count - 1].granule, "the last granule = pre-skip + samples (48 kHz)");
        Assert.AreEqual(0L, pages[0].granule + pages[1].granule, "header pages: granule 0");
        foreach (var p in pages) Assert.AreEqual(0xDEADBEEFu, p.serial, "one serial");
        for (int i = 0; i < pages.Count; i++) Assert.AreEqual((uint)i, BitConverter.ToUInt32(f, pages[i].at + 18), "page sequence " + i);
        // OpusHead (RFC 7845 §5.1)
        int h = pages[0].at + 27 + pages[0].nsegs;
        Assert.AreEqual("OpusHead", Encoding.ASCII.GetString(f, h, 8), "magic");
        Assert.AreEqual(19, (int)pages[0].lacing[0], "19 bytes, one packet");
        Assert.AreEqual(1, (int)f[h + 8], "version 1");
        Assert.AreEqual(1, (int)f[h + 9], "1 channel");
        Assert.AreEqual(312, BitConverter.ToUInt16(f, h + 10), "pre-skip");
        Assert.AreEqual(16000u, BitConverter.ToUInt32(f, h + 12), "input rate");
        Assert.AreEqual(0, BitConverter.ToInt16(f, h + 16), "gain 0");
        Assert.AreEqual(0, (int)f[h + 18], "mapping family 0");
        int t = pages[1].at + 27 + pages[1].nsegs;
        Assert.AreEqual("OpusTags", Encoding.ASCII.GetString(f, t, 8), "tags magic");
        Assert.AreEqual(5u, BitConverter.ToUInt32(f, t + 8), "vendor length");
        Assert.AreEqual("Spixi", Encoding.ASCII.GetString(f, t + 12, 5), "vendor");
        Assert.AreEqual(0u, BitConverter.ToUInt32(f, t + 17), "0 comments");
        Assert.AreEqual(f.Length, pages[pages.Count - 1].at + pages[pages.Count - 1].len, "no trailing byte");
    }

    [TestMethod]
    public void ogg_page_crc_matches_an_independent_crc()
    {
        Assert.AreEqual(0x89A1897Fu, VoiceCodec.oggCrc(Encoding.ASCII.GetBytes("123456789"), 0, 9), "the CRC-32 (init 0, no xorout) check value");
        Assert.AreEqual(0x89A1897Fu, BitCrc(Encoding.ASCII.GetBytes("123456789"), 0, 9), "…and the bitwise one agrees");
        byte[] f = VoiceCodec.muxOgg(Pkts(300, 40), 312, 42);
        foreach (var p in Pages(f))
        {
            var page = new byte[p.len];
            Buffer.BlockCopy(f, p.at, page, 0, p.len);
            uint stored = BitConverter.ToUInt32(page, 22);
            page[22] = page[23] = page[24] = page[25] = 0;
            Assert.AreEqual(BitCrc(page, 0, page.Length), stored, "page at " + p.at);
        }
    }

    [TestMethod]
    public void ogg_lacing_more_than_255_segments_and_255k_byte_packets()
    {
        // 300 packets → 300 lacing values → at least two audio pages, each ≤ 255 segments, no packet split
        byte[] f = VoiceCodec.muxOgg(Pkts(300, 10), 312, 1);
        var pages = Pages(f);
        Assert.IsTrue(pages.Count >= 4, "head + tags + ≥ 2 audio pages (" + pages.Count + ")");
        int total = 0;
        for (int i = 2; i < pages.Count; i++)
        {
            Assert.IsTrue(pages[i].nsegs <= 255, "≤ 255 lacing values");
            Assert.IsTrue(pages[i].lacing[pages[i].nsegs - 1] < 255, "a page ends on a packet end");
            total += pages[i].nsegs;
        }
        Assert.AreEqual(300, total, "one lacing value per small packet");
        Assert.AreEqual(312L + 255 * 960, pages[2].granule, "page 2 holds 255 packets; its granule counts them");
        Assert.IsTrue(VoiceCodec.tryDemuxOgg(f, out var back, out int d) && back!.Count == 300 && d == 6000, "round trip");
        // a packet of exactly 255 · k bytes ends with a 0 lacing value
        byte[] g = VoiceCodec.muxOgg(new List<byte[]> { Pkt(255), Pkt(510), Pkt(1275), Pkt(254) }, 312, 1);
        var a = Pages(g)[2].lacing;
        Assert.AreEqual("255,0,255,255,0,255,255,255,255,255,0,254", string.Join(",", a), "the lacing values");
        Assert.IsTrue(VoiceCodec.tryDemuxOgg(g, out var gb, out _) && gb!.Count == 4 && gb[2].Length == 1275 && gb[0].Length == 255, "round trip");
        // a page that ends on a 255 run (the packet goes on in the next page) is read too (another muxer may split packets)
        var o = new List<byte>();
        TestPage(o, new[] { Head() }, 0x02, 0, 9, 0);
        TestPage(o, new[] { Tags() }, 0, 0, 9, 1);
        byte[] big = Pkt(600);
        var part1 = new byte[510]; Buffer.BlockCopy(big, 0, part1, 0, 510);
        var part2 = new byte[90]; Buffer.BlockCopy(big, 510, part2, 0, 90);
        // page 2: lacing 255,255 (the packet continues); page 3: flag 0x01, lacing 90
        int s2 = o.Count;
        o.AddRange(Encoding.ASCII.GetBytes("OggS")); o.Add(0); o.Add(0); o.AddRange(BitConverter.GetBytes(-1L)); o.AddRange(BitConverter.GetBytes(9u)); o.AddRange(BitConverter.GetBytes(2u));
        o.AddRange(new byte[4]); o.Add(2); o.Add(255); o.Add(255); o.AddRange(part1);
        var pg = o.GetRange(s2, o.Count - s2).ToArray(); uint c = BitCrc(pg, 0, pg.Length); for (int i = 0; i < 4; i++) o[s2 + 22 + i] = (byte)(c >> (8 * i));
        TestPage(o, new[] { part2 }, 0x05, 312 + 960, 9, 3);
        Assert.IsTrue(VoiceCodec.tryDemuxOgg(o.ToArray(), out var cb, out _) && cb!.Count == 1 && Same(new[] { big }, cb), "a packet across two pages");
    }

    [TestMethod]
    public void ogg_a_test_made_file_demuxes()
    {
        var ps = Pkts(450, 30);
        Assert.IsTrue(VoiceCodec.tryDemuxOgg(TestOgg(ps), out var back, out int d) && Same(ps, back) && d == 9000, "an independent writer's file");
        Assert.IsTrue(VoiceCodec.tryDemuxOgg(TestOgg(ps, channels: 2), out _, out _), "2 channels → ok");
    }

    [TestMethod]
    public void ogg_demux_refusals()
    {
        byte[] good = VoiceCodec.muxOgg(Pkts(50), 312, 5);
        Assert.IsTrue(VoiceCodec.tryDemuxOgg(good, out _, out _), "the control");

        byte[] cap = (byte[])good.Clone(); cap[Pages(good)[2].at] = (byte)'o';
        Assert.IsFalse(VoiceCodec.tryDemuxOgg(cap, out var p1, out int d1), "a bad capture pattern");
        Assert.IsTrue(p1 == null && d1 == 0, "nothing out on a refusal");

        byte[] crc = (byte[])good.Clone(); crc[crc.Length - 1] ^= 1;
        Assert.IsFalse(VoiceCodec.tryDemuxOgg(crc, out _, out _), "a bad CRC (one body bit)");

        Assert.IsFalse(VoiceCodec.tryDemuxOgg(new byte[VoiceCodec.MaxOggBytes + 1], out _, out _), "oversized (262 145 bytes)");
        var padded = new List<byte>(good); padded.AddRange(new byte[VoiceCodec.MaxOggBytes + 1 - good.Length]);
        Assert.IsFalse(VoiceCodec.tryDemuxOgg(padded.ToArray(), out _, out _), "oversized (a good file + junk)");

        Assert.IsFalse(VoiceCodec.tryDemuxOgg(TestOgg(Pkts(400), 200, 7, 8), out _, out _), "two logical streams (another serial)");
        Assert.IsTrue(VoiceCodec.tryDemuxOgg(TestOgg(Pkts(400), 200, 7), out _, out _), "…the control with one serial");

        Assert.IsTrue(VoiceCodec.tryDemuxOgg(TestOgg(Pkts(1550, 2)), out _, out int d1550) && d1550 == 31000, "1550 × 20 ms packets → ok (31 000 ms: the time bound IS the count bound)");
        Assert.IsFalse(VoiceCodec.tryDemuxOgg(TestOgg(Pkts(1551, 2)), out _, out _), "1551 packets → too many");
        Assert.IsFalse(VoiceCodec.tryDemuxOgg(TestOgg(Pkts(5, 5, SilkNb60)), out _, out _), "60 ms packets → refused (only 20 ms frames)");

        Assert.IsFalse(VoiceCodec.tryDemuxOgg(TestOgg(Pkts(5), channels: 3), out _, out _), "3 channels");
        Assert.IsFalse(VoiceCodec.tryDemuxOgg(TestOgg(Pkts(5), family: 1), out _, out _), "mapping family 1");
        Assert.IsFalse(VoiceCodec.tryDemuxOgg(TestOgg(new List<byte[]>()), out _, out _), "no audio");
        Assert.IsFalse(VoiceCodec.tryDemuxOgg(TestOgg(new List<byte[]> { Pkt(1276) }), out _, out _), "an audio packet of 1276 bytes");
        Assert.IsFalse(VoiceCodec.tryDemuxOgg(TestOgg(new List<byte[]> { new byte[] { 0x4B } }), out _, out _), "an invalid TOC (code 3, no count byte)");
        Assert.IsFalse(VoiceCodec.tryDemuxOgg(TestOgg(new List<byte[]> { new byte[] { 0x4B, 0x00 } }), out _, out _), "an invalid TOC (code 3, 0 frames)");
        Assert.IsFalse(VoiceCodec.tryDemuxOgg(good[..^1], out _, out _), "a cut file");
        var junk = new List<byte>(good); junk.Add(0);
        Assert.IsFalse(VoiceCodec.tryDemuxOgg(junk.ToArray(), out _, out _), "a trailing byte");
        Assert.IsFalse(VoiceCodec.tryDemuxOgg(Built(headFlags: 0), out _, out _), "page 0 without BOS (CRC correct)");
        Assert.IsFalse(VoiceCodec.tryDemuxOgg(Built(tagsFlags: 0x02), out _, out _), "a later page with BOS (same serial, CRC correct)");
        Assert.IsFalse(VoiceCodec.tryDemuxOgg(Built(tagsFlags: 0x01), out _, out _), "a continuation flag with nothing pending");
        Assert.IsFalse(VoiceCodec.tryDemuxOgg(Built(headWithTags: true), out _, out _), "OpusHead not alone on page 0");
        Assert.IsFalse(VoiceCodec.tryDemuxOgg(Built(version: 0x10), out _, out _), "OpusHead major version 1 (the nibble)");
        Assert.IsTrue(VoiceCodec.tryDemuxOgg(Built(version: 0x0F), out _, out _), "…a minor version 15 is accepted (RFC 7845 §5.1)");
        Assert.IsFalse(VoiceCodec.tryDemuxOgg(Built(badTags: true), out _, out _), "the OpusTags magic");
        Assert.IsTrue(VoiceCodec.tryDemuxOgg(Built(), out _, out _), "…the control for these (the same builder)");
        // a packet left pending: the last page ends on a 255 lacing value and the file ends (a cut last packet at EOF)
        var o = new List<byte>();
        TestPage(o, new[] { Head() }, 0x02, 0, 9, 0);
        TestPage(o, new[] { Tags() }, 0, 0, 9, 1);
        TestPage(o, new[] { Pkt(20) }, 0, 312 + 960, 9, 2);
        var cutBody = new List<byte>(Pkt(255));
        RawPage(o, new byte[] { 255 }, cutBody, 0x04, -1, 9, 3);
        Assert.IsFalse(VoiceCodec.tryDemuxOgg(o.ToArray(), out _, out _), "a cut last packet at EOF");
        // pending but the next page has NO continuation flag
        var q = new List<byte>();
        TestPage(q, new[] { Head() }, 0x02, 0, 9, 0);
        TestPage(q, new[] { Tags() }, 0, 0, 9, 1);
        RawPage(q, new byte[] { 255 }, new List<byte>(Pkt(255)), 0, -1, 9, 2);
        TestPage(q, new[] { Pkt(10) }, 0x04, 312 + 960, 9, 3);
        Assert.IsFalse(VoiceCodec.tryDemuxOgg(q.ToArray(), out _, out _), "a pending packet and a next page without the continuation flag");
        Assert.IsFalse(VoiceCodec.tryDemuxOgg(null, out _, out _), "null");
        Assert.IsFalse(VoiceCodec.tryDemuxOgg(new byte[0], out _, out _), "empty");
        var rnd = new Random(3);
        for (int i = 0; i < 200; i++)
        {
            var b = (byte[])good.Clone();
            b[rnd.Next(b.Length)] = (byte)rnd.Next(256);
            VoiceCodec.tryDemuxOgg(b, out _, out _);   // never throws (the harness fails the test on a throw)
            var cut = new byte[rnd.Next(b.Length)]; Buffer.BlockCopy(b, 0, cut, 0, cut.Length);
            VoiceCodec.tryDemuxOgg(cut, out _, out _);
        }
    }

    /** head + tags + one audio page, each header page variable (every page's CRC correct). */
    static byte[] Built(byte headFlags = 0x02, byte tagsFlags = 0, bool headWithTags = false, byte version = 1, bool badTags = false)
    {
        var o = new List<byte>();
        var tags = Tags();
        if (badTags) tags[4] = (byte)'X';
        if (headWithTags)
        {
            TestPage(o, new[] { Head(version: version), tags }, headFlags, 0, 9, 0);
        }
        else
        {
            TestPage(o, new[] { Head(version: version) }, headFlags, 0, 9, 0);
            TestPage(o, new[] { tags }, tagsFlags, 0, 9, 1);
        }
        TestPage(o, Pkts(5), 0x04, 312 + 5 * 960, 9, 2);
        return o.ToArray();
    }

    [TestMethod]
    public void mux_refuses_bad_local_input()
    {
        bool threw = false;
        try { VoiceCodec.muxOgg(new List<byte[]> { new byte[0] }, 312, 1); } catch (ArgumentException) { threw = true; }
        Assert.IsTrue(threw, "a 0-byte packet → ArgumentException (local data — the caller's bug)");
        threw = false;
        try { VoiceCodec.muxOgg(Pkts(1551, 1), 312, 1); } catch (ArgumentException) { threw = true; }
        Assert.IsTrue(threw, "1551 packets");
        threw = false;
        try { VoiceCodec.muxOgg(new List<byte[]>(), 312, 1); } catch (ArgumentException) { threw = true; }
        Assert.IsTrue(threw, "no packets (an empty clip is never muxed — no header-only file)");
    }

    // —— waveform ——
    [TestMethod]
    public void peaks_count_range_silence_and_scale()
    {
        var pcm = new short[16000];
        for (int i = 0; i < pcm.Length; i++) pcm[i] = (short)((i % 2 == 0 ? 1 : -1) * (i / 400) * 800);   // louder every 400 samples
        int[] p = VoiceCodec.peaks(pcm, 40);
        Assert.AreEqual(40, p.Length, "40 bars");
        for (int i = 0; i < p.Length; i++)
        {
            Assert.IsTrue(p[i] >= 0 && p[i] <= 100, "0..100");
            if (i > 0) Assert.IsTrue(p[i] >= p[i - 1], "a louder slice never gets a lower bar (" + i + ")");
        }
        Assert.AreEqual(100, p[39], "the loudest slice = 100");
        Assert.AreEqual(0, p[0], "the silent first slice = 0");
        int[] z = VoiceCodec.peaks(new short[8000], 40);
        Assert.IsTrue(z.Length == 40 && Array.TrueForAll(z, v => v == 0), "silence → zeros");
        Assert.AreEqual(100, VoiceCodec.peaks(new short[] { 0, short.MinValue, 0, 100 }, 2)[0], "short.MinValue is the loudest (no overflow)");
        Assert.AreEqual(0, VoiceCodec.peaks(new short[] { 5 }, 3)[0], "fewer samples than bars: an empty slice = 0");
        Assert.AreEqual(100, VoiceCodec.peaks(new short[] { 5 }, 3)[2], "…the one sample's slice = 100");
        Assert.AreEqual(50, VoiceCodec.peaks(new short[] { 100, 200 }, 2)[0], "scaled to the clip's max");
        Assert.AreEqual(67, VoiceCodec.peaks(new short[] { 200, 300 }, 2)[0], "rounded half up (66.7 → 67, not truncated)");
        Assert.AreEqual(33, VoiceCodec.peaks(new short[] { 100, 300 }, 2)[0], "rounded (33.3 → 33)");
        Assert.AreEqual(0, VoiceCodec.peaks(pcm, 0).Length, "0 bars");
        Assert.AreEqual(5, VoiceCodec.peaks(new short[0], 5).Length, "no pcm → zeros");
        Assert.AreEqual("0,50,100", VoiceCodec.peaksCsv(new[] { 0, 50, 100 }), "csv");
        Assert.AreEqual("", VoiceCodec.peaksCsv(new int[0]), "empty csv");
    }

    // —— route + receive ——
    [TestMethod]
    public void choose_route_truth_table()
    {
        Assert.AreEqual(VoiceCodec.Route.Inline, VoiceCodec.chooseRoute(true, false, true, true, 54000, 64000), "all yes → inline");
        Assert.AreEqual(VoiceCodec.Route.File, VoiceCodec.chooseRoute(false, false, true, true, 54000, 64000), "a group → file");
        Assert.AreEqual(VoiceCodec.Route.File, VoiceCodec.chooseRoute(true, true, true, true, 54000, 64000), "a bot → file");
        Assert.AreEqual(VoiceCodec.Route.File, VoiceCodec.chooseRoute(true, false, false, true, 54000, 64000), "unapproved → file");
        Assert.AreEqual(VoiceCodec.Route.File, VoiceCodec.chooseRoute(true, false, true, false, 54000, 64000), "an old / unknown app → file");
        Assert.AreEqual(VoiceCodec.Route.File, VoiceCodec.chooseRoute(true, false, true, true, 0, 64000), "no text (encode failed) → file");
        Assert.AreEqual(VoiceCodec.Route.Inline, VoiceCodec.chooseRoute(true, false, true, true, 64000, 64000), "exactly the max → inline");
        Assert.AreEqual(VoiceCodec.Route.File, VoiceCodec.chooseRoute(true, false, true, true, 64001, 64000), "one over → file (never truncate)");
    }

    [TestMethod]
    public void a_bot_room_never_renders_voice()
    {
        Assert.IsTrue(VoiceCodec.rendersAsVoice(false), "a contact / group");
        Assert.IsFalse(VoiceCodec.rendersAsVoice(true), "a bot room → the plain first line");
    }

    [TestMethod]
    public void the_constants_are_the_contract()
    {
        Assert.AreEqual("spixi.voice.1", VoiceCodec.ProtocolId, "id");
        Assert.AreEqual(VoiceCodec.ProtocolId + ":", VoiceCodec.MarkerPrefix, "prefix");
        Assert.AreEqual(SpixiProtocols.VoiceId, VoiceCodec.ProtocolId, "the capability id = the marker id");
        Assert.AreEqual(262144, VoiceCodec.MaxOggBytes, "ogg cap");
        Assert.AreEqual(40, VoiceCodec.PeakCount, "bars");
        Assert.AreEqual(10000, VoiceCodec.BitrateBps, "10 kbit/s");
    }
}
