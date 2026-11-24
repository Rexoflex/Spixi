/* Session voicefix, item 2 — THE PROBE. It decodes voice clips the way the chat page makes a waveform and runs itself as a
 * child process once per switch set. Every line it prints holds counts, switch names and exit codes only: no file name, no
 * path, no message text, no key (the operator rule of the session prompt).
 *
 *   dotnet VoiceFixProbe.dll [--runs N] [--sets a,b,…] [--own] [--disasm SET] [--out FILE]
 *     parent (default): for each switch set, N child runs → one table row: the set, the runs, the exit codes counted.
 *     --own   : the clips = the voice files of THIS account's Spixi folder (Documents\Spixi\Voice and …\Downloads, the
 *               names VoiceCodec.isVoiceFileName accepts), read only. Default: the seed clips only (the dev seed's clips,
 *               made in code, and the encoder clips in clips/ beside the program).
 *     --disasm SET : ONE child run of SET with the JIT's disassembly written to disasm-<SET>.txt beside the program
 *               (DOTNET_JitDisasm=*, DOTNET_JitDisasmWithCodeBytes=1, DOTNET_JitStdOutFile). Machine code only.
 *   dotnet VoiceFixProbe.dll child [--own] [--repeat K]   (started by the parent; the env is the switch set)
 *   dotnet VoiceFixProbe.dll make-clip FILE SECONDS BITRATE  (the cloud twin made clips/*.txt with it: the encoder of
 *               OpusEncoder.cs's settings — 16 kHz mono, VOIP, 20 ms frames — over a synthetic signal; no recording)
 *
 * The child's decode = VoiceClips.peaksCsvOf (Spixi/VoIP/VoiceClips.cs:953–986): ONE OpusDecoder(16000, 1, shorts) per clip,
 * decode(framesOf(packets, ref i, (i + 1) × 20 ms)) per packet — the frame format [int16 little-endian length][packet].
 * VoiceClips.cs itself is not linked (Logging, threads, the platform players); the loop below is its decode loop line
 * for line, with the peaks step (VoiceCodec.peaks / peaksCsv, linked) at the end.
 *
 * WRITES only: the result file (beside the program, or --out FILE), disasm-<set>.txt beside it (--disasm), and the file
 * that make-clip names. ★ #46 r1 (S-1): Concentus 2.2.2 would first look for a native opus library and COPY
 * <current directory>/runtimes/<rid>/native/opus.* into the current directory (NativePlatformUtils.cs:251, :278-283):
 * the child and make-clip switch that off (OpusCodecFactory.AttemptToUseNativeLibrary = false), so the probe always
 * measures the MANAGED decoder — the one the app runs — and writes nothing into the current directory. */
#nullable enable
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using SPIXI;
using SPIXI.VoIP;

namespace VoiceFixProbe
{
    public static class Program
    {
        /* The switch sets. "none" = no runtime knob at all (the child's env is cleaned of every DOTNET_ (but DOTNET_ROOT*),
         * COMPlus_ and CORECLR_ variable first, also for the other sets). The names are the .NET 10 runtime's knob names (libcoreclr's config
         * list, 10.0.15). */
        private static readonly (string name, string[] vars)[] Sets =
        {
            ("none", new string[0]),
            ("hwintrinsic0", new[] { "DOTNET_EnableHWIntrinsic=0" }),
            ("avx2_0", new[] { "DOTNET_EnableAVX2=0" }),
            ("avx0", new[] { "DOTNET_EnableAVX=0" }),
            ("vectort128", new[] { "DOTNET_MaxVectorTBitWidth=128" }),
            ("tiered0", new[] { "DOTNET_TieredCompilation=0" }),
            ("pgo0", new[] { "DOTNET_TieredPGO=0" }),
            ("osr0", new[] { "DOTNET_TC_OnStackReplacement=0" }),
            ("r2r0", new[] { "DOTNET_ReadyToRun=0" }),
            ("wx0", new[] { "DOTNET_EnableWriteXorExecute=0" }),
            ("minopts", new[] { "DOTNET_JITMinOpts=1" }),
        };

        public static int Main(string[] args)
        {
            try
            {
                if (args.Length > 0 && args[0] == "child")
                {
                    return child(args);
                }
                if (args.Length > 0 && args[0] == "make-clip")
                {
                    return makeClip(args);
                }
                return parent(args);
            }
            catch (Exception e)
            {
                Console.Error.WriteLine("probe: " + e.GetType().Name);   // the type only (no message: it could hold a path)
                return 90;
            }
        }

        // ———————————————————————————— parent ————————————————————————————

        private static int parent(string[] args)
        {
            int runs = intArg(args, "--runs", 3);
            bool own = args.Contains("--own");
            string? only = strArg(args, "--sets");
            string? disasm = strArg(args, "--disasm");
            string dir = AppContext.BaseDirectory;
            string outFile = strArg(args, "--out") ?? Path.Combine(dir, "probe-result.txt");
            var chosen = Sets.Where(s => only == null || only.Split(',').Contains(s.name)).ToList();
            if (disasm != null)
            {
                chosen = Sets.Where(s => s.name == disasm).ToList();
                runs = 1;
            }
            if (chosen.Count == 0)
            {
                Console.WriteLine("probe: no such switch set");
                return 2;
            }
            StringBuilder report = new StringBuilder();
            void line(string s)
            {
                Console.WriteLine(s);
                report.AppendLine(s);
            }
            line("voicefix probe · runtime " + Environment.Version + " · " + System.Runtime.InteropServices.RuntimeInformation.OSArchitecture
                + " · " + (OperatingSystem.IsWindows() ? "windows" : OperatingSystem.IsLinux() ? "linux" : "other")
                + " · source " + (own ? "own" : "seed") + " · runs " + runs + " · DOTNET_ vars in the parent " + dotnetVarCount());
            line("cpu: " + cpuLine());
            foreach (var set in chosen)
            {
                Dictionary<string, int> codes = new Dictionary<string, int>();
                string clipsLine = "", tocLine = "";
                for (int r = 0; r < runs; r++)
                {
                    string? disasmFile = disasm != null ? Path.Combine(dir, "disasm-" + set.name + ".txt") : null;
                    (int code, string stdout) = runChild(set.vars, own, disasmFile);
                    string key = codeText(code);
                    codes[key] = codes.TryGetValue(key, out int n) ? n + 1 : 1;
                    string last = stdout.Split('\n').Select(x => x.Trim()).LastOrDefault(x => x.StartsWith("clips ", StringComparison.Ordinal)) ?? "";
                    string toc = stdout.Split('\n').Select(x => x.Trim()).LastOrDefault(x => x.StartsWith("toc ", StringComparison.Ordinal)) ?? "";
                    if (toc.Length > 0)
                    {
                        tocLine = toc;
                    }
                    if (last.Length > 0)
                    {
                        clipsLine = last;   // counts only: "clips n · decoded n · refused n · stage …"
                    }
                }
                line(set.name.PadRight(13) + " runs " + runs + " · exit " + string.Join(", ", codes.Select(kv => kv.Key + " ×" + kv.Value))
                    + (clipsLine.Length > 0 ? " · last " + clipsLine : ""));
                if (tocLine.Length > 0 && set.name == chosen[0].name)
                {
                    line("  " + tocLine);
                }
            }
            try
            {
                File.WriteAllText(outFile, report.ToString());
            }
            catch (Exception)
            {
                Console.WriteLine("probe: the result file was not written");
            }
            return 0;
        }

        private static (int, string) runChild(string[] vars, bool own, string? disasmFile)
        {
            string self = typeof(Program).Assembly.Location;
            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = Environment.ProcessPath ?? throw new InvalidOperationException(),   // ★ #46 r1 (S-NIT): never a bare "dotnet" resolved through the current directory
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true,
            };
            if (Path.GetFileNameWithoutExtension(psi.FileName).Equals("dotnet", StringComparison.OrdinalIgnoreCase))
            {
                psi.ArgumentList.Add(self);
            }
            psi.ArgumentList.Add("child");
            if (own)
            {
                psi.ArgumentList.Add("--own");
            }
            foreach (string k in psi.Environment.Keys.ToList())
            {
                if ((k.StartsWith("DOTNET_", StringComparison.OrdinalIgnoreCase) && !k.StartsWith("DOTNET_ROOT", StringComparison.OrdinalIgnoreCase))
                    || k.StartsWith("COMPlus_", StringComparison.OrdinalIgnoreCase)
                    || k.StartsWith("CORECLR_", StringComparison.OrdinalIgnoreCase))   // DOTNET_ROOT* stays: it only tells an apphost where the runtime is (#46 r2)
                {
                    psi.Environment.Remove(k);   // "no DOTNET_ variable" unless the set names one (and no profiler: CORECLR_*, #46 r1 S-NIT)
                }
            }
            foreach (string v in vars)
            {
                int eq = v.IndexOf('=');
                psi.Environment[v.Substring(0, eq)] = v.Substring(eq + 1);
            }
            if (disasmFile != null)
            {
                psi.Environment["DOTNET_JitDisasm"] = "*";
                psi.Environment["DOTNET_JitDisasmWithCodeBytes"] = "1";
                psi.Environment["DOTNET_JitDisasmSummary"] = "1";
                psi.Environment["DOTNET_JitStdOutFile"] = disasmFile;
            }
            using Process p = Process.Start(psi)!;
            var so = p.StandardOutput.ReadToEndAsync();
            var se = p.StandardError.ReadToEndAsync();
            if (!p.WaitForExit(180_000))
            {
                try { p.Kill(true); } catch (Exception) { }
                return (int.MinValue, "");
            }
            p.WaitForExit();
            return (p.ExitCode, so.Result);
        }

        private static string codeText(int code)
        {
            if (code == int.MinValue)
            {
                return "timeout";
            }
            if (code == 0)
            {
                return "0";
            }
            return "0x" + ((uint)code).ToString("x8", CultureInfo.InvariantCulture);   // 0xc000001d = Illegal Instruction (Windows); 0x00000084 = 128 + SIGILL 4 (Linux)
        }

        private static int dotnetVarCount()
        {
            int n = 0;
            foreach (System.Collections.DictionaryEntry e in Environment.GetEnvironmentVariables())
            {
                string k = (string)e.Key;
                if ((k.StartsWith("DOTNET_", StringComparison.OrdinalIgnoreCase) && !k.StartsWith("DOTNET_ROOT", StringComparison.OrdinalIgnoreCase))
                    || k.StartsWith("COMPlus_", StringComparison.OrdinalIgnoreCase) || k.StartsWith("CORECLR_", StringComparison.OrdinalIgnoreCase))
                {
                    n++;   // the same set that runChild removes
                }
            }
            return n;
        }

        /** The instruction sets the runtime reports (System.Runtime.Intrinsics.X86.*.IsSupported) — names only. */
        private static string cpuLine()
        {
            var l = new List<string>();
            void add(string n, bool b) { if (b) l.Add(n); }
            add("sse4.2", System.Runtime.Intrinsics.X86.Sse42.IsSupported);
            add("avx", System.Runtime.Intrinsics.X86.Avx.IsSupported);
            add("avx2", System.Runtime.Intrinsics.X86.Avx2.IsSupported);
            add("fma", System.Runtime.Intrinsics.X86.Fma.IsSupported);
            add("bmi1", System.Runtime.Intrinsics.X86.Bmi1.IsSupported);
            add("bmi2", System.Runtime.Intrinsics.X86.Bmi2.IsSupported);
            add("lzcnt", System.Runtime.Intrinsics.X86.Lzcnt.IsSupported);
            add("popcnt", System.Runtime.Intrinsics.X86.Popcnt.IsSupported);
            add("avxvnni", System.Runtime.Intrinsics.X86.AvxVnni.IsSupported);
            add("avx512", System.Runtime.Intrinsics.X86.Avx512F.IsSupported);
            add("avx10v1", System.Runtime.Intrinsics.X86.Avx10v1.IsSupported);
            add("gfni", System.Runtime.Intrinsics.X86.Gfni.IsSupported);
            return string.Join(" ", l) + " · Vector<T> " + System.Numerics.Vector<byte>.Count * 8 + " bit, accelerated " + System.Numerics.Vector.IsHardwareAccelerated;
        }

        // ———————————————————————————— child ————————————————————————————

        private static int child(string[] args)
        {
            Concentus.OpusCodecFactory.AttemptToUseNativeLibrary = false;   // ★ #46 r1 (S-1): the managed decoder only; no copy into the current directory
            bool own = args.Contains("--own");
            int repeat = intArg(args, "--repeat", 4);   // 4 × every clip: the decode methods reach tier 1 (30 calls) and OSR
            List<List<byte[]>> clips = own ? ownClips(out int refused) : seedClips(out refused);
            int decoded = 0, nulls = 0;
            Console.WriteLine("clips " + clips.Count + " · refused " + refused + " · stage start");
            Console.WriteLine("toc " + tocSummary(clips));   // the codec mode of every packet, counted (RFC 6716 §3.1 config + the stereo bit): no content
            Console.Out.Flush();
            for (int r = 0; r < repeat; r++)
            {
                for (int c = 0; c < clips.Count; c++)
                {
                    string? csv = peaksCsvOf(clips[c]);
                    if (csv == null) nulls++; else decoded++;
                }
                Console.WriteLine("clips " + clips.Count + " · refused " + refused + " · decoded " + decoded + " · null " + nulls + " · stage repeat " + (r + 1));
                Console.Out.Flush();
            }
            return 0;
        }

        /** "cfg9×300 cfg1×600 · stereo 0 · clips by mode: silk 2 celt 20" — counts of the TOC byte's config (0–11 SILK,
         *  12–15 Hybrid, 16–31 CELT) and of the stereo bit, over every packet of every clip. */
        private static string tocSummary(List<List<byte[]>> clips)
        {
            var cfg = new SortedDictionary<int, int>();
            int stereo = 0, silk = 0, hybrid = 0, celt = 0;
            foreach (var c in clips)
            {
                int c0 = c.Count > 0 ? c[0][0] >> 3 : -1;
                if (c0 >= 0 && c0 < 12) silk++; else if (c0 >= 12 && c0 < 16) hybrid++; else if (c0 >= 16) celt++;
                foreach (byte[] p in c)
                {
                    int k = p[0] >> 3;
                    cfg[k] = cfg.TryGetValue(k, out int n) ? n + 1 : 1;
                    if ((p[0] & 4) != 0) stereo++;
                }
            }
            return string.Join(" ", cfg.Select(kv => "cfg" + kv.Key + "×" + kv.Value)) + " · stereo " + stereo
                + " · clips by first mode: silk " + silk + " hybrid " + hybrid + " celt " + celt;
        }

        /** The seed clips: the dev seed's 16 inline + 4 file clips (SDevSeedPlan.voicePackets: F8 FF FE, CELT fullband
         *  20 ms; the file ones through VoiceCodec.muxOgg → tryDemuxOgg, as a received file is read), then every
         *  clips/*.txt beside the program (an inline voice text each: VoiceCodec.tryParseInline). */
        private static List<List<byte[]>> seedClips(out int refused)
        {
            refused = 0;
            var l = new List<List<byte[]>>();
            int[] inline = { 1, 4, 9, 2, 15, 25, 6, 12, 3, 20, 8, 27, 5, 11, 30, 17 };   // SDevSeedPlan.InlineSeconds
            int[] files = { 7, 14, 22, 29 };                                              // SDevSeedPlan.VoiceFileSeconds
            foreach (int s in inline)
            {
                string? line2 = VoiceCodec.encodeInline(SDevSeedPlan.voicePackets(s));
                string text = VoiceCodec.humanLine(s * 1000) + "\n" + line2;
                if (VoiceCodec.tryParseInline(text, out _, out List<byte[]>? p) && p != null) l.Add(p); else refused++;
            }
            foreach (int s in files)
            {
                byte[] ogg = VoiceCodec.muxOgg(SDevSeedPlan.voicePackets(s), SDevSeedPlan.VoicePreSkip, 0x5EED0000u + (uint)s);
                if (VoiceCodec.tryDemuxOgg(ogg, out List<byte[]>? p, out _) && p != null) l.Add(p); else refused++;
            }
            string clipDir = Path.Combine(AppContext.BaseDirectory, "clips");
            if (Directory.Exists(clipDir))
            {
                foreach (string f in Directory.GetFiles(clipDir, "*.txt").OrderBy(x => x, StringComparer.Ordinal))
                {
                    string text = File.ReadAllText(f).Replace("\r\n", "\n").TrimEnd('\n');
                    if (VoiceCodec.tryParseInline(text, out _, out List<byte[]>? p) && p != null) l.Add(p); else refused++;
                }
            }
            return l;
        }

        /** --own: the voice files of this account, read only (File.ReadAllBytes of a name VoiceCodec.isVoiceFileName
         *  accepts, at most VoiceCodec.MaxOggBytes). Nothing is written there; no name is printed. */
        private static List<List<byte[]>> ownClips(out int refused)
        {
            refused = 0;
            var l = new List<List<byte[]>>();
            string root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Personal), "Spixi");
            foreach (string sub in new[] { "Voice", "Downloads" })
            {
                string d = Path.Combine(root, sub);
                if (!Directory.Exists(d))
                {
                    continue;
                }
                foreach (string f in Directory.EnumerateFiles(d))
                {
                    if (!VoiceCodec.isVoiceFileName(Path.GetFileName(f)))
                    {
                        continue;
                    }
                    if (l.Count + refused >= MaxOwnFiles)
                    {
                        refused++;   // ★ #46 r1 (S-NIT): at most MaxOwnFiles files are read
                        continue;
                    }
                    byte[]? data = readCapped(f, VoiceCodec.MaxOggBytes);
                    if (data != null && VoiceCodec.tryDemuxOgg(data, out List<byte[]>? p, out _) && p != null) l.Add(p); else refused++;
                }
            }
            return l;
        }

        private const int MaxOwnFiles = 500;

        /** Reads at most cap + 1 bytes through a stream (a link's FileInfo.Length can say 0); more than cap → null. Read only. */
        private static byte[]? readCapped(string path, int cap)
        {
            try
            {
                using FileStream fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);   // the app may delete or rename the file meanwhile (#46 r2)
                byte[] buf = new byte[cap + 1];
                int n = 0, r;
                while (n < buf.Length && (r = fs.Read(buf, n, buf.Length - n)) > 0)
                {
                    n += r;
                }
                if (n > cap)
                {
                    return null;
                }
                Array.Resize(ref buf, n);
                return buf;
            }
            catch (Exception)
            {
                return null;
            }
        }

        /* ———— VoiceClips.peaksCsvOf (Spixi/VoIP/VoiceClips.cs:953–986) and framesOf (:910–931), line for line ———— */

        private const int MaxPcmSamples = VoiceCodec.ParseMaxDurationMs * (VoiceCodec.SampleRate / 1000) + 1920;   // VoiceClips.MaxPcmSamples (VoiceClips.cs:81)

        private static string? peaksCsvOf(List<byte[]>? packets)
        {
            if (packets == null || packets.Count == 0 || packets.Count > VoiceCodec.MaxPackets)
            {
                return null;
            }
            PcmCollector pcm = new PcmCollector(MaxPcmSamples);
            OpusDecoder decoder = new OpusDecoder(VoiceCodec.SampleRate, 1, pcm, OpusDecoderReturnType.shorts);
            try
            {
                decoder.start();
                int i = 0;
                foreach (byte[] pk in packets)
                {
                    if (pk == null || pk.Length < 1 || pk.Length > VoiceCodec.MaxPacketBytes)
                    {
                        return null;
                    }
                    int one = i;
                    decoder.decode(framesOf(packets, ref one, ((long)i + 1) * VoiceCodec.FrameMs));
                    i++;
                }
                return VoiceCodec.peaksCsv(VoiceCodec.peaks(pcm.toArray(), VoiceCodec.PeakCount));
            }
            catch (Exception)
            {
                return null;
            }
            finally
            {
                try { decoder.stop(); } catch (Exception) { }
            }
        }

        private static byte[] framesOf(List<byte[]> packets, ref int next, long untilMs)
        {
            int end = next;
            int size = 0;
            while (end < packets.Count && (long)end * VoiceCodec.FrameMs < untilMs)
            {
                size += 2 + packets[end].Length;
                end++;
            }
            byte[] buf = new byte[size];
            int o = 0;
            for (int i = next; i < end; i++)
            {
                byte[] pk = packets[i];
                buf[o] = (byte)(pk.Length & 0xFF);
                buf[o + 1] = (byte)((pk.Length >> 8) & 0xFF);
                Buffer.BlockCopy(pk, 0, buf, o + 2, pk.Length);
                o += 2 + pk.Length;
            }
            next = end;
            return buf;
        }

        private sealed class PcmCollector : IAudioDecoderCallback
        {
            private readonly int cap;
            private readonly List<short> samples;
            public PcmCollector(int cap) { this.cap = cap; samples = new List<short>(Math.Min(cap, 64 * 1024)); }
            public void onDecodedData(short[] data)
            {
                int room = cap - samples.Count;
                if (data == null || room <= 0) return;
                if (data.Length <= room) samples.AddRange(data); else samples.AddRange(new ArraySegment<short>(data, 0, room));
            }
            public void onDecodedData(byte[] data) { }
            public void onDecodedData(float[] data) { }
            public short[] toArray() => samples.ToArray();
        }

        // ———————————————————————————— make-clip (the cloud twin) ————————————————————————————

        /** A synthetic voice-like signal (a gliding pitch with its harmonics, a syllable envelope, a little noise from a
         *  fixed seed) encoded with OpusEncoder.cs's settings: 16 kHz mono, OPUS_APPLICATION_VOIP, the bitrate given,
         *  20 ms frames; written as the app's inline voice text (VoiceCodec.humanLine + "\n" + encodeInline). */
        private static int makeClip(string[] args)
        {
            Concentus.OpusCodecFactory.AttemptToUseNativeLibrary = false;   // ★ #46 r1 (S-1)
            string file = args[1];
            int seconds = int.Parse(args[2], CultureInfo.InvariantCulture);
            int bitrate = int.Parse(args[3], CultureInfo.InvariantCulture);
            const int rate = VoiceCodec.SampleRate, frame = rate / 50;
            var enc = Concentus.OpusCodecFactory.CreateEncoder(rate, 1, Concentus.Enums.OpusApplication.OPUS_APPLICATION_VOIP);
            enc.Bitrate = bitrate;
            Random rnd = new Random(1208);
            List<byte[]> packets = new List<byte[]>();
            byte[] outBuf = new byte[1275];
            double phase = 0;
            for (int f = 0; f < seconds * 50; f++)
            {
                short[] pcm = new short[frame];
                for (int k = 0; k < frame; k++)
                {
                    double t = (f * frame + k) / (double)rate;
                    double pitch = 140 + 40 * Math.Sin(2 * Math.PI * 0.7 * t);
                    phase += 2 * Math.PI * pitch / rate;
                    double env = Math.Max(0, Math.Sin(2 * Math.PI * 2.5 * t));   // syllables, with pauses
                    double v = 0;
                    for (int h = 1; h <= 8; h++) v += Math.Sin(phase * h) / h;
                    v = v * env * 0.35 + (rnd.NextDouble() - 0.5) * 0.02;
                    pcm[k] = (short)Math.Clamp(v * 32767, -32768, 32767);
                }
                int n = enc.Encode(pcm.AsSpan(), frame, outBuf.AsSpan(), outBuf.Length);
                packets.Add(outBuf.AsSpan(0, n).ToArray());
            }
            enc.Dispose();
            string? line2 = VoiceCodec.encodeInline(packets);
            if (line2 == null)
            {
                Console.WriteLine("make-clip: out of bounds");
                return 3;
            }
            string text = VoiceCodec.humanLine(packets.Count * VoiceCodec.FrameMs) + "\n" + line2;
            if (!VoiceCodec.tryParseInline(text, out _, out _))
            {
                Console.WriteLine("make-clip: the app's parser refuses it (a packet is not one 20 ms frame)");
                return 4;
            }
            File.WriteAllText(file, text + "\n");
            var tocs = packets.GroupBy(p => p[0]).Select(g => "0x" + g.Key.ToString("x2", CultureInfo.InvariantCulture) + "×" + g.Count());
            Console.WriteLine("make-clip: " + packets.Count + " packets, " + packets.Sum(p => p.Length) + " bytes, TOC " + string.Join(" ", tocs));
            return 0;
        }

        // ———————————————————————————— args ————————————————————————————

        private static int intArg(string[] a, string name, int def)
        {
            int i = Array.IndexOf(a, name);
            return i >= 0 && i + 1 < a.Length && int.TryParse(a[i + 1], NumberStyles.Integer, CultureInfo.InvariantCulture, out int v) ? v : def;
        }

        private static string? strArg(string[] a, string name)
        {
            int i = Array.IndexOf(a, name);
            return i >= 0 && i + 1 < a.Length ? a[i + 1] : null;
        }
    }
}
