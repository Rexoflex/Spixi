// The Concentus 2.2.2 surface that the two REAL Spixi wrappers (Spixi/VoIP/OpusDecoder.cs, OpusEncoder.cs) use, for the
// harness only: Concentus is a NuGet package and the harness has no NuGet access. OpusCodecFactory MODELS the upstream
// factory (lostromb/concentus, CSharp/Concentus/OpusCodecFactory.cs, Version 2.2.2): every Create tests
// `_userAllowNativeLib && NativeLibraryAvailable(...)` — the native probe runs only while the property is true — and makes
// the native codec when both hold, else the managed one. The model's probe answers NativePresent and counts its calls.
// LIMIT: a model, not the package; the real factory's answer on Linux is the scratch proof of packet P103.
using System;
using System.Collections.Generic;
using System.IO;
using Concentus.Enums;

namespace Concentus.Enums
{
    public enum OpusApplication
    {
        OPUS_APPLICATION_VOIP = 2048,
        OPUS_APPLICATION_AUDIO = 2049,
        OPUS_APPLICATION_RESTRICTED_LOWDELAY = 2051,
    }
}

namespace Concentus
{
    public interface IOpusDecoder : IDisposable
    {
        int Decode(ReadOnlySpan<byte> in_data, Span<float> out_pcm, int frame_size, bool decode_fec = false);
        int Decode(ReadOnlySpan<byte> in_data, Span<short> out_pcm, int frame_size, bool decode_fec = false);
    }

    public interface IOpusEncoder : IDisposable
    {
        int Bitrate { get; set; }
        int Encode(ReadOnlySpan<short> in_pcm, int frame_size, Span<byte> out_data, int max_data_bytes);
    }

    /** What a Create returned: Native = the P/Invoke adapter of upstream, else the managed Concentus.Structs codec. */
    public sealed class StubOpusCodec : IOpusDecoder, IOpusEncoder
    {
        public readonly bool Native;
        public StubOpusCodec(bool native) { Native = native; }
        public int Bitrate { get; set; }
        public int Decode(ReadOnlySpan<byte> in_data, Span<float> out_pcm, int frame_size, bool decode_fec = false) => 0;
        public int Decode(ReadOnlySpan<byte> in_data, Span<short> out_pcm, int frame_size, bool decode_fec = false) => 0;
        public int Encode(ReadOnlySpan<short> in_pcm, int frame_size, Span<byte> out_data, int max_data_bytes) => 0;
        public void Dispose() { }
    }

    public static class OpusCodecFactory
    {
        private static bool _userAllowNativeLib = true;
        /** Harness knob: what the native probe finds (a placed opus library, or the system's on Android API 23). */
        public static bool NativePresent = true;
        /** How often a Create reached the native probe. */
        public static int Probes = 0;
        /** The property's value at each Create, in order. */
        public static readonly List<bool> AllowAtCreate = new List<bool>();

        public static bool AttemptToUseNativeLibrary
        {
            get { return _userAllowNativeLib; }
            set { _userAllowNativeLib = value; }
        }

        private static bool NativeLibraryAvailable(TextWriter messageLogger)
        {
            Probes++;
            return NativePresent;
        }

        public static IOpusEncoder CreateEncoder(int sampleRate, int numChannels, OpusApplication application = OpusApplication.OPUS_APPLICATION_AUDIO, TextWriter messageLogger = null)
        {
            AllowAtCreate.Add(_userAllowNativeLib);
            return new StubOpusCodec(_userAllowNativeLib && NativeLibraryAvailable(messageLogger));
        }

        public static IOpusDecoder CreateDecoder(int sampleRate, int numChannels, TextWriter messageLogger = null)
        {
            AllowAtCreate.Add(_userAllowNativeLib);
            return new StubOpusCodec(_userAllowNativeLib && NativeLibraryAvailable(messageLogger));
        }

        /** Harness only: a fresh process (the property at its default, no probe yet). */
        public static void harnessReset()
        {
            _userAllowNativeLib = true;
            NativePresent = true;
            Probes = 0;
            AllowAtCreate.Clear();
        }
    }
}
