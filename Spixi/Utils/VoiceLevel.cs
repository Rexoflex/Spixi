/* ★ S8 picks (#1239) — THE LIVE MIC LEVEL of a VOICE MESSAGE recording (the rec bar's live wave). PURE.
 *
 * fromPcm16: one buffer of 16-bit PCM (mono, the recorder's own capture buffer, read only) → an integer 0–100.
 *   RMS of the samples → dBFS (20·log10(rms / 32768)) → the range −50 dB … 0 dB mapped linearly to 0 … 100, rounded,
 *   clamped. Silence (or no sample) = 0; full scale (and clipping at −32768) = 100; speech at a normal distance reads
 *   about −35 … −12 dBFS = 30 … 75. dB, not the raw RMS, because loudness is heard on a log scale: a linear map would
 *   leave quiet speech as a flat line and saturate on every syllable.
 *   The byte[] overload reads little-endian sample pairs; an odd byte count drops the last byte (never a half sample).
 *   Out-of-range offset / count are clamped to the array, a null array = 0 — it never throws (it runs on the audio
 *   thread of every platform recorder, voice mode only).
 * Gate: the push throttle (#46 r1 A MINOR-1) — ONE rate on every platform. The capture buffer differs per platform
 *   (iOS / Mac 100 ms, Windows 80 ms, Android device-dependent), so a push per buffer would give the shell a different
 *   wave speed on each. Instead the levels are released on a FIXED GridMs (100 ms) grid of the recording clock: at most
 *   ONE push per grid cell (floor(nowMs / 100)), at the first buffer that lands in a cell after the last push's cell, and
 *   never two pushes closer than MinGapMs (50 ms — a buffer at 99 then one at 101 sends once; the held cell goes at the
 *   next buffer). The value sent is the PEAK level since the last push (a short syllable between two pushes is not lost),
 *   then it starts again. A buffer longer than 100 ms (or a stall) = ONE push, never a catch-up burst. Result: ≤ 10 pushes
 *   a second, 10/s on average whenever buffers are ≤ 100 ms; pushes are 50 … 100 + one buffer ms apart on the recording
 *   clock (+ the main-thread post).
 * SECURITY (docs/security-handover-gate.md §S8 picks): the only thing that leaves is ONE integer 0–100 — no sample, no
 *   spectrum. No logging here (and the callers log nothing of it). No MAUI, no Core type — scripts/csh executes every
 *   rule (S8PicksTests.cs). */
#nullable enable
using System;

namespace SPIXI
{
    public static class VoiceLevel
    {
        public const double FloorDb = -50.0;   // 0 at and below this
        public const int GridMs = 100;         // the release grid: one push per 100 ms cell of the recording clock = 10/s
        public const int MinGapMs = 50;        // and never two pushes closer than this (contract: ≥ 50 ms apart)

        /** 16-bit samples (Android: AudioRecord.Read into short[]). */
        public static int fromPcm16(short[]? pcm, int offset, int count)
        {
            if (pcm == null)
            {
                return 0;
            }
            int from = Math.Max(0, Math.Min(offset, pcm.Length));
            int n = Math.Max(0, Math.Min(count, pcm.Length - from));
            if (n == 0)
            {
                return 0;
            }
            double sum = 0;
            for (int i = from; i < from + n; i++)
            {
                double s = pcm[i];
                sum += s * s;
            }
            return fromRms(Math.Sqrt(sum / n));
        }

        /** 16-bit little-endian sample pairs (iOS / Mac: the converter's Int16 buffer; Windows: WaveIn 16-bit). */
        public static int fromPcm16Bytes(byte[]? pcm, int offset, int byteCount)
        {
            if (pcm == null)
            {
                return 0;
            }
            int from = Math.Max(0, Math.Min(offset, pcm.Length));
            int bytes = Math.Max(0, Math.Min(byteCount, pcm.Length - from));
            int n = bytes / 2;   // an odd count: the last byte is dropped
            if (n == 0)
            {
                return 0;
            }
            double sum = 0;
            for (int i = 0; i < n; i++)
            {
                int o = from + i * 2;
                double s = unchecked((short)(pcm[o] | (pcm[o + 1] << 8)));
                sum += s * s;
            }
            return fromRms(Math.Sqrt(sum / n));
        }

        /** RMS (0 … 32768) → 0 … 100 on the −50 … 0 dBFS scale. */
        public static int fromRms(double rms)
        {
            if (double.IsNaN(rms) || rms <= 0)
            {
                return 0;
            }
            double db = 20.0 * Math.Log10(rms / 32768.0);
            double level = (db - FloorDb) * (100.0 / -FloorDb);
            if (double.IsNaN(level) || level <= 0)
            {
                return 0;
            }
            if (level >= 100)
            {
                return 100;
            }
            return (int)Math.Round(level, MidpointRounding.AwayFromZero);
        }

        /** The push throttle of ONE recording (VoiceClips holds one under its gate; not thread-safe by itself). */
        public sealed class Gate
        {
            private long lastMs = long.MinValue;
            private long lastCell = long.MinValue;
            private int peak = -1;

            /** A buffer's level at `nowMs` (the recording clock, monotonic, ≥ 0). true → push `send` now (the peak since
             *  the last push): `nowMs` is in a later GridMs cell than the last push AND ≥ MinGapMs after it. */
            public bool offer(long nowMs, int level, out int send)
            {
                int l = level < 0 ? 0 : (level > 100 ? 100 : level);
                if (l > peak)
                {
                    peak = l;
                }
                long cell = nowMs < 0 ? -1 : nowMs / GridMs;
                if (lastMs != long.MinValue && (cell <= lastCell || nowMs - lastMs < MinGapMs))
                {
                    send = 0;
                    return false;
                }
                lastMs = nowMs;
                lastCell = cell;
                send = peak;
                peak = -1;
                return true;
            }
        }
    }
}
