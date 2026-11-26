# P103 · THE OPUS CODEC IS THE MANAGED ONE ONLY — NO NATIVE OPUS LIBRARY IS PROBED OR LOADED (batch fixb5, item 6)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| LOW (closes a route; the managed codec is the one Spixi already runs wherever no opus library is found) | none | none | `SmallFixFlags.OpusManagedOnly` (`flagOpusManagedOnly`, absent = ON; a stored 0 acts only in dev mode); OFF = the base: the factory probes for a native library first | 4 min |

**Look here first:** `Spixi/VoIP/OpusDecoder.cs` `useManagedOnly()` (:106) — `if (SmallFixFlags.OpusManagedOnly)
OpusCodecFactory.AttemptToUseNativeLibrary = false;` — called as the statement right before each of the app's TWO factory calls:
`OpusDecoder.start()` (:100 → `CreateDecoder` :101) and `OpusEncoder.start()` (:93 → `CreateEncoder` :94). The switch block:
`Spixi/Utils/SpixiFlags.cs` `SmallFixFlags` (read lazily once per process; the line `[FLAGS] fixb5 opusmanaged=<0|1> declineclears=<0|1>`).

**DECISIONS:** #1905 (the inherited sink, its trigger widened by our voice messages #1208) · #1844 (3) (Damir: "one line now") ·
#1321 (packet + gate row) · #1478 (its own switch).

## What and why
Concentus 2.2.2 (`Spixi/Spixi.csproj`, the fork point's version) tries a native opus library before its managed codec on every
`Create` while `AttemptToUseNativeLibrary` is true (upstream `CSharp/Concentus/OpusCodecFactory.cs`: `if (_userAllowNativeLib &&
NativeLibraryAvailable(...))`). Windows loads `opus.dll` from the default dirs; after a failed probe upstream deletes a loose library in the
current directory and copies one from `runtimes/<rid>/native/` there (Windows, Linux and macOS); Mac / iPhone / Android `dlopen` by leaf name — on Android API 23 that may resolve the system's own libopus, so a
peer's voice packets (the waveform decode at chat open, `VoiceClips.peaksCsvOf`) could reach C code in the wallet process. With the
property false, upstream never calls the probe and returns `Concentus.Structs.OpusDecoder` / `OpusEncoder`.

**The place, and why there:** the two wrappers' `start()` are the only factory calls in `Spixi/**` (pin f4: two `Create` calls, no
`Concentus.Structs` / `Native` name; the ten `new OpusDecoder(` / `new OpusEncoder(` sites in nine files — the four platform players and
recorders and `VoiceClips` — are the Spixi wrappers). A setter in front of each call holds "before the first decoder or encoder" on
every platform whatever comes first (a call, a recording, a waveform) and on every thread: each Create reads a `false` its own
thread wrote just before. A once-at-start line would need `App.xaml.cs` (held by other pins) and a cross-thread publication.
`VoiceCodec.cs` cannot hold it: it is compiled in the harness without Concentus (pin `pins-s7/core`). The write is idempotent (a
static bool). Stage 2 keeps the one setter line, unconditional, and removes the switch (contract § 8).

## The diff (app C#: +6 code lines here, +36 in the switch block shared with P104)
```csharp
// OpusDecoder.start()                              // OpusEncoder.start()
running = true;                                     OpusDecoder.useManagedOnly();
useManagedOnly();                                   encoder = OpusCodecFactory.CreateEncoder(samples, channels, opusApplication);
decoder = OpusCodecFactory.CreateDecoder(samples, channels);
internal static void useManagedOnly()
{
    if (SmallFixFlags.OpusManagedOnly) OpusCodecFactory.AttemptToUseNativeLibrary = false;
}
```

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| Peer voice bytes reach a native opus decoder (a placed `opus.dll`, a copied `runtimes/` file, the system libopus) | the property is false before every Create → no probe, the managed codec | csh `OpusManagedTests` on_decoder / on_encoder / on_first_create_of_a_process_either_order (the REAL wrappers over a model of upstream's check); pin `f-opus-managed` f1–f4; the scratch proof below |
| A factory call that skips the setter | the two calls are the only ones; each is preceded by the setter | pin f2 / f3 (the statement right before), f4 (exactly two `Create` calls, no direct codec type) |
| The switch OFF changes something else | OFF never writes the property; `start()` minus the call = the base body | csh `off_is_the_old_path`; pin f5 (SHA-256 of the base bodies) |
| A log line leaks | one `[FLAGS]` line, fixed words and 0/1; the factory gets no logger | csh `flags_line_text_all_4`, `flags_read_lazily_one_line_per_process` |
| A store that throws turns the switch off | the read keeps both ON on a throw | csh `flags_a_throwing_store_keeps_both_on` (a throw at the FIRST read only: the stub cannot throw per key, so a throw after a devMode read of true — the catch resets dev — is unproven) |

**Scratch proof (not committed; Linux x64, .NET SDK 10; the upstream source `lostromb/concentus` @ `9edc8dc` (upstream HEAD, 7 commits
after `6c2328d`, the commit that sets `Version` 2.2.2; between the two, `CSharp/Concentus/OpusCodecFactory.cs` and `CSharp/Concentus/Native/`
are byte-identical by `git diff` — the only change under `CSharp/Concentus/` is 6 lines in `Celt/CeltCommon.cs`, a downsampling fix)
compiled into a console program; `CreateDecoder(48000, 1, Console.Out)` / `CreateEncoder`, one
packet encoded and decoded):**
| Run | Output |
|---|---|
| default (no library on the leaf name) | `Attempting to load libopus.so as a linux .so` · `libopus.so could not be loaded.` · `Is native opus available? False` · `decoder=Concentus.Structs.OpusDecoder` · `encoder=Concentus.Structs.OpusEncoder` · `roundtrip packetBytes=158 decodedSamples=960` |
| `true`, a `libopus.so` link to the system `/lib/x86_64-linux-gnu/libopus.so.0` on `LD_LIBRARY_PATH` | `Native library libopus.so found!` · `Is native opus available? True` · `decoder=Concentus.Native.NativeOpusDecoder` · `encoder=Concentus.Native.NativeOpusEncoder` · `roundtrip packetBytes=198 decodedSamples=960` |
| `false`, the same link present | `AttemptToUseNativeLibrary=False` · NO probe line · `decoder=Concentus.Structs.OpusDecoder` · `encoder=Concentus.Structs.OpusEncoder` · `roundtrip packetBytes=158 decodedSamples=960` |

So the route is real when a library is findable by its leaf name (row 2), and the property closes it (row 3). LIMITS: Linux, not
the app's platforms; the system file has only the `.so.0` name, so the default run did not load it (an Android API 23 device may
resolve `libopus.so` itself — not checked here); the package's compiled build was not used (no NuGet), its source was.

Platforms: all (Windows, Android, iPhone, Mac). The managed decoder is the one every platform already ran when no library was
found; voice quality and speed are unchanged there. ⚠ C# UNCOMPILED in the app: `OpusDecoder.cs`, `OpusEncoder.cs`, `SpixiFlags.cs`
(the two wrappers and the block DO compile and run in csh over the model; the app build is the Windows job of `redesign-ci`).
