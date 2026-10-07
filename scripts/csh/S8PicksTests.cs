// ★ S8 picks (#1239) — the live mic level of a VOICE MESSAGE recording, EXECUTED:
//   · VoiceLevel.fromPcm16 / fromPcm16Bytes / fromRms (RMS → dBFS → −50…0 dB mapped to 0…100)
//   · VoiceLevel.Gate (the `voiceRecLevel` push throttle: one push per 100 ms cell of the recording clock = 10/s on
//     every platform, never two closer than 50 ms, the PEAK since the last push; #46 r1 A MINOR-1)
// The call sites are MAUI-bound (the 4 platform SAudioRecorder.tapVoiceLevel, VoiceClips.onRecLevel, SingleChatPage) —
// scripts/pins-s8p/c-wiring.mjs pins them.
using System;
using System.Linq;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class S8PicksTests
{
    static short[] Fill(int n, short v) => Enumerable.Repeat(v, n).ToArray();
    static byte[] Le(params short[] v) { var b = new byte[v.Length * 2]; for (int i = 0; i < v.Length; i++) { b[2 * i] = (byte)(v[i] & 0xFF); b[2 * i + 1] = (byte)((v[i] >> 8) & 0xFF); } return b; }

    [TestMethod]
    public void level_silence_and_nothing_are_zero()
    {
        Assert.AreEqual(0, VoiceLevel.fromPcm16(Fill(640, 0), 0, 640), "silence");
        Assert.AreEqual(0, VoiceLevel.fromPcm16Bytes(new byte[1280], 0, 1280), "silence (bytes)");
        Assert.AreEqual(0, VoiceLevel.fromPcm16(null, 0, 10), "null");
        Assert.AreEqual(0, VoiceLevel.fromPcm16Bytes(null, 0, 10), "null (bytes)");
        Assert.AreEqual(0, VoiceLevel.fromPcm16(new short[0], 0, 0), "empty");
        Assert.AreEqual(0, VoiceLevel.fromPcm16(Fill(10, 1), 0, 10), "1 LSB = −90 dBFS → 0");
        Assert.AreEqual(0, VoiceLevel.fromPcm16(Fill(10, 103), 0, 10), "−50.05 dBFS (just under the floor) → 0");
        Assert.AreEqual(0, VoiceLevel.fromRms(double.NaN), "NaN → 0");
        Assert.AreEqual(0, VoiceLevel.fromRms(-1), "negative → 0");
    }

    [TestMethod]
    public void level_full_scale_and_clipping_are_100()
    {
        Assert.AreEqual(100, VoiceLevel.fromPcm16(Fill(640, short.MaxValue), 0, 640), "+full scale");
        Assert.AreEqual(100, VoiceLevel.fromPcm16(Fill(640, short.MinValue), 0, 640), "clipping at −32768 (0 dBFS exactly)");
        short[] sq = Enumerable.Range(0, 640).Select(i => i % 2 == 0 ? short.MinValue : short.MaxValue).ToArray();
        Assert.AreEqual(100, VoiceLevel.fromPcm16(sq, 0, sq.Length), "a clipped square wave");
        Assert.AreEqual(100, VoiceLevel.fromPcm16Bytes(Le(sq), 0, sq.Length * 2), "the same, as bytes");
        Assert.AreEqual(100, VoiceLevel.fromRms(1e9), "above full scale clamps to 100");
    }

    [TestMethod]
    public void level_is_perceptual_db_mapped_minus50_to_0()
    {
        Assert.AreEqual(88, VoiceLevel.fromPcm16(Fill(320, 16384), 0, 320), "−6.02 dBFS → 88");
        Assert.AreEqual(60, VoiceLevel.fromPcm16(Fill(320, 3277), 0, 320), "−20 dBFS → 60");
        Assert.AreEqual(20, VoiceLevel.fromPcm16(Fill(320, 328), 0, 320), "−40 dBFS → 20");
        short[] sine = Enumerable.Range(0, 1600).Select(i => (short)Math.Round(32767 * Math.Sin(2 * Math.PI * 400 * i / 16000.0))).ToArray();
        Assert.AreEqual(94, VoiceLevel.fromPcm16(sine, 0, sine.Length), "a full-scale sine = −3.01 dBFS → 94");
        short[] quiet = sine.Select(v => (short)(v / 100)).ToArray();
        Assert.AreEqual(14, VoiceLevel.fromPcm16(quiet, 0, quiet.Length), "the same sine 40 dB quieter = −43.01 dBFS → (−43.01 + 50) × 2 = 14");
    }

    [TestMethod]
    public void level_bytes_are_little_endian_and_an_odd_tail_is_dropped()
    {
        Assert.AreEqual(88, VoiceLevel.fromPcm16Bytes(new byte[] { 0x00, 0x40, 0x00, 0x40 }, 0, 4), "0x4000 little-endian = 16384 → 88 (big-endian would read 64 → 0)");
        Assert.AreEqual(100, VoiceLevel.fromPcm16Bytes(new byte[] { 0x00, 0x80 }, 0, 2), "0x8000 = −32768 → 100");
        Assert.AreEqual(100, VoiceLevel.fromPcm16Bytes(new byte[] { 0xFF, 0x7F, 0x00 }, 0, 3), "an odd count: the last byte is dropped (one sample 32767)");
        Assert.AreEqual(0, VoiceLevel.fromPcm16Bytes(new byte[] { 0xFF }, 0, 1), "one byte = no sample = 0");
        var rnd = new Random(7);
        short[] s = Enumerable.Range(0, 999).Select(_ => (short)rnd.Next(-20000, 20000)).ToArray();
        Assert.AreEqual(VoiceLevel.fromPcm16(s, 0, s.Length), VoiceLevel.fromPcm16Bytes(Le(s), 0, s.Length * 2), "shorts and bytes agree");
        Assert.AreEqual(VoiceLevel.fromPcm16(s, 0, s.Length), VoiceLevel.fromPcm16Bytes(Le(s), 0, s.Length * 2 + 1), "…an odd byte count past the end is clamped");
    }

    [TestMethod]
    public void level_offset_and_count_are_clamped_never_throw()
    {
        short[] s = Fill(10, 0).Concat(Fill(10, 16384)).ToArray();
        Assert.AreEqual(88, VoiceLevel.fromPcm16(s, 10, 10), "offset reads only its window");
        Assert.AreEqual(0, VoiceLevel.fromPcm16(s, 0, 10), "count reads only its window");
        Assert.AreEqual(88, VoiceLevel.fromPcm16(s, 10, 1000), "count past the end is clamped");
        Assert.AreEqual(0, VoiceLevel.fromPcm16(s, 50, 10), "offset past the end = 0");
        Assert.AreEqual(0, VoiceLevel.fromPcm16(s, 0, -5), "negative count = 0");
        Assert.AreEqual(VoiceLevel.fromPcm16(s, 0, 20), VoiceLevel.fromPcm16(s, -3, 20), "negative offset = 0");
        byte[] b = Le(s);
        Assert.AreEqual(88, VoiceLevel.fromPcm16Bytes(b, 20, 20), "bytes: offset window");
        Assert.AreEqual(0, VoiceLevel.fromPcm16Bytes(b, 100, 4), "bytes: offset past the end = 0");
        Assert.AreEqual(0, VoiceLevel.fromPcm16Bytes(b, 0, -1), "bytes: negative count = 0");
        int prev = -1;
        foreach (short a in new short[] { 0, 50, 104, 300, 1000, 3000, 10000, 20000, 32767 })
        {
            int l = VoiceLevel.fromPcm16(Fill(16, a), 0, 16);
            Assert.IsTrue(l >= prev && l >= 0 && l <= 100, "monotonic in 0…100 at " + a + " (" + l + ")");
            prev = l;
        }
    }

    [TestMethod]
    public void gate_releases_on_a_fixed_100ms_grid_with_the_peak_since_the_last_push()
    {
        // #46 r1 A MINOR-1: one rate on every platform — one push per 100 ms cell of the recording clock, the PEAK kept
        var g = new VoiceLevel.Gate();
        Assert.IsTrue(g.offer(0, 30, out int a) && a == 30, "the first level goes at once (clock 0)");
        Assert.IsFalse(g.offer(49, 80, out _), "49 ms: same cell — held");
        Assert.IsFalse(g.offer(99, 10, out _), "99 ms: still the first cell — held");
        Assert.IsTrue(g.offer(100, 5, out int b), "100 ms: the next grid cell — sent");
        Assert.AreEqual(80, b, "…the PEAK since the last push (80 at 49 ms), not the newest (5)");
        Assert.IsFalse(g.offer(101, 90, out _), "101 ms: the same cell as the last push — held");
        Assert.IsTrue(g.offer(200, 7, out int c) && c == 90, "200 ms: sent, the held 90 kept across the cell (" + c + ")");
        Assert.IsTrue(g.offer(300, 7, out int c2) && c2 == 7, "the peak starts again after a push (" + c2 + ")");
        Assert.AreEqual(100, VoiceLevel.GridMs, "the grid = 100 ms = 10 pushes a second");
        Assert.AreEqual(50, VoiceLevel.MinGapMs, "the contract's ≥ 50 ms");
        Assert.IsTrue(g.offer(450, 150, out int d) && d == 100, "above 100 → 100");
        Assert.IsTrue(g.offer(550, -9, out int e) && e == 0, "below 0 → 0");
        var h = new VoiceLevel.Gate();
        Assert.IsTrue(h.offer(0, 0, out int z) && z == 0, "a fresh gate sends at clock 0 too");
    }

    [TestMethod]
    public void gate_never_sends_two_pushes_closer_than_50ms_across_a_cell_edge()
    {
        var g = new VoiceLevel.Gate();
        Assert.IsTrue(g.offer(99, 20, out _), "a first push late in cell 0");
        Assert.IsFalse(g.offer(101, 60, out _), "101 ms: a new cell but only 2 ms later — held (≥ 50 ms)");
        Assert.IsFalse(g.offer(148, 30, out _), "148 ms: 49 ms later — held");
        Assert.IsTrue(g.offer(149, 10, out int a) && a == 60, "149 ms: 50 ms later, cell 1 — sent with the peak 60 (" + a + ")");
        Assert.IsFalse(g.offer(199, 10, out _), "199 ms: cell 1 again — held");
    }

    [TestMethod]
    public void gate_gives_the_same_10_per_second_for_every_platform_buffer()
    {
        // iOS / Mac 100 ms, Windows 80 ms, Android e.g. 20 / 40 / 64 ms, and a 250 ms stall buffer: over 10 s of recording
        foreach (int buf in new[] { 20, 40, 64, 80, 100 })
        {
            var g = new VoiceLevel.Gate();
            int n = 0;
            long prev = -1, minGap = long.MaxValue, maxGap = 0;
            for (long t = buf; t <= 10000; t += buf)
            {
                if (g.offer(t, 50, out _))
                {
                    n++;
                    if (prev >= 0) { minGap = Math.Min(minGap, t - prev); maxGap = Math.Max(maxGap, t - prev); }
                    prev = t;
                }
            }
            Assert.IsTrue(n >= 99 && n <= 101, buf + " ms buffers: " + n + " pushes in 10 s (≈ 100 = 10/s)");
            Assert.IsTrue(minGap >= VoiceLevel.MinGapMs, buf + " ms buffers: min gap " + minGap);
            Assert.IsTrue(maxGap <= VoiceLevel.GridMs + buf, buf + " ms buffers: max gap " + maxGap);
        }
        var s = new VoiceLevel.Gate();
        Assert.IsTrue(s.offer(0, 10, out _), "start");
        Assert.IsTrue(s.offer(250, 70, out int a) && a == 70, "a 250 ms buffer = ONE push");
        Assert.IsFalse(s.offer(260, 10, out _), "…no catch-up burst for the skipped cells");
        Assert.IsTrue(s.offer(300, 10, out int b) && b == 10, "the next cell as usual (" + b + ")");
    }
}
