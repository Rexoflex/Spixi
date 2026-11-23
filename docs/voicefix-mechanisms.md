# Voice fix — mechanisms (session `voicefix`, 2026-11-23)

Item 1 of `claude/session-voicefix-prompt.md` (mechanism first, #294). Base `redesign/frontend` @ `462ba3e4`. Every
claim cites `file:line` of that tree or a measured run. The operator steps ran on Damir's PC (#1510); they printed
counts, switch names, exit codes and code names only.

## 0 · Verdict (short)

**The cause, as far as it was read:** the one end whose native stack was read (step 8, read in step 9) is a
call through a stale or invalid queued-callback target inside the WinUI dispatcher
(`CoreMessagingXP.dll!Microsoft::UI::Dispatching::DispatcherQueue::DeferInvokeCallback`) on the main thread (consistent with a use-after-free of the callback; inferred, not shown); steps 12
and 14 share its exception and its address offset (`…086F`); the walk's ends (15:15, 15:25, 15:36) and step 6 share
the debugger and the fatal exception (`0xC000001D`, or `ExecutionEngineException` with the managed engine), but their
stacks were not read (at 15:25 the current thread was an unnamed native
thread, at 15:36 the address ends `…095B`). The end is **shown only under the Visual Studio debugger**: with very frequent collections (`DOTNET_GCgen0size=80000`) F5
ended **3 of 3** runs (steps 8, 12, 14; XAML Diagnostics on (8, the default) and off (12, 14); Hot Reload off (14)) and the same
build with no debugger ended **0 of 3** (step 10 with the variable set in the shell; step 13 = Ctrl+F5 with the same profile, 5 minutes, the variable expected from the profile, not observed; step 11 = a start without the debugger, the variable not known). Without
the frequent collections F5 ended in step 6 and not in steps 4, 7 and Damir's own run; with no debugger step 3 did
not end. A random fault: "no end" in 3 runs is not proof that a run with no debugger can never end. A garbage collection plausibly frees the managed side (the rate follows `GCgen0size`; the freeing party is not shown, § 5); frequent collections
(`DOTNET_GCgen0size=80000`) bring the end in seconds. The "Illegal Instruction" comes from data bytes near the
stale target, not from a missing instruction set. **No run without a debugger ended**; an installed app runs with no
debugger.

| Question of the prompt | Answer | Evidence |
|---|---|---|
| Does the app end when it decodes a voice message? | **No — the premise does not hold.** Of the recorded ends, 15:15 (a photo chat open: `Concentus.dll` not seen in its log) and 15:25 (the close of the "Save as" dialog) show no decode, and step 8 came with no chat open; for step 12 (scrolling, which can enqueue decodes, `SingleChatPage.xaml.cs:6114`) the decode is not known. The decode runs 0 ends in 45 probe runs on Damir's PC | § 2, § 3, § 4 |
| Which instruction set, runtime or codec? | **None.** The faulting call goes from the dispatcher to an address in the runtime's data area; the bytes there are data. The codec's JIT output (the methods the probe ran) holds nothing above AVX2 (cloud, Coffee Lake set) | § 3, § 4a |
| `DOTNET_EnableHWIntrinsic=0` fixes it? | **No.** Its 3 quiet runs were chance: 5 opens without it had no end either (steps 3, 4), and the fault is random under the debugger | § 4 |
| Why now? | Not proven. The fault is random under the debugger and its rate follows the garbage collector; walks on Windows run with F5 (#663). The empty page store after the wipe of 2026-11-23 ended one of two empty-store runs (6 yes, 7 no). The batches merged that day add pool-thread work that posts to the UI thread (History C#, `LoadMoreOffUi`), which raises the number of queued callbacks and collections — a plausible reason for a higher rate, not shown | § 4, § 5 |

## 1 · The path from a chat open to the decode (a)

| Step | Where | What decides |
|---|---|---|
| A row is pushed | `Spixi/Pages/Chat/SingleChatPage.xaml.cs:7180-7191` (an inline voice row: `voiceRowArg` → arg 17) · `:7025-7028` (a voice FILE row: `fVoice == "1"` and the file is complete or mine) | the row's push comes FIRST, then `noteVoiceInfo` |
| The job | `noteVoiceInfo` `:9942` → a load burst defers it to `batch.voices` (`:6114`, after the batch) → `enqueueVoiceInfo` `:9963` (bounded: `VoiceInfoQueueMax` 128, `:9016`) → ONE drainer per page on the pool (`Task.Run(drainVoiceInfo)`, `:9973`) | a full queue drops the job (the row keeps plain bars) |
| The answer | `processVoiceInfo` `:10005` → `voiceInfoFor` `:10181` / `:10199`: `SpixiFlags.VoicePeaksStore` is false on Windows (`ChatMediaStore.platformOn` = false off Android, `Spixi/Utils/ChatMediaStore.cs:45-47`; `SpixiFlags.cs:386`; the flags line `voicestore=0`) → `voiceInfoOld` `:10299` → `voiceInfoOf` `:10092` | a per-PROCESS memory cache (`voiceInfoCache`, static, 256 entries, `:9017-9020`); nothing on disk on Windows |
| The decode | `voiceInfoOf` → `VoiceCodec.tryParseInline` / `readVoiceFile` (`SingleChatPage.xaml.cs:9839`) + `VoiceCodec.tryDemuxOgg` (bounded parsers, `Spixi/Utils/VoiceCodec.cs`) → `VoiceClips.peaksCsvOf` (`Spixi/VoIP/VoiceClips.cs:953-986`) → `OpusDecoder` (`Spixi/VoIP/OpusDecoder.cs`) → `Concentus.OpusCodecFactory.CreateDecoder` | a managed throw → `null` → the push `voiceState … error` (`:10049`, `:10081`) |

**Where a waveform is stored, what empties it:** on Windows nowhere but the process's memory: every app start decodes
each voice row of a chat again at its first open. The WebView store does not hold it. So "the waveform was decoded
again on 2026-11-23" is the normal path, not a change. The `voicestate` push of the log of 2026-11-22 is the `error`
answer of `:10049` / `:10081` (a clip that did not parse or decode) or a play state (`pushVoiceState`, `:9081`) — the
log line does not say which; it is not evidence for or against this fault.

## 2 · The four recorded ends

| When | Debugger | What ran just before | Concentus loaded? | Record |
|---|---|---|---|---|
| 2026-11-23 15:15:07 | managed (`System.ExecutionEngineException` in Unknown Module) | open of a chat with 7 sent photos from the warm spare page, after 16 older pages and two theme pushes | not in the log | the main chat, MC item `n-20261123-win-engine-exception-after-appearance-change` |
| 15:25:14 | managed (`System.ExecutionEngineException` in Unknown Module) | the second "Save as" dialog of the viewer closed (`resume/entered`) | no | the same; the Threads window: every managed thread idle, the current thread native with no name (id 29268) |
| 15:36:01 | mixed | the photo chat with one voice message opened | yes, then `Exception thrown at 0x0000020E9729095B … 0xC000001D: Illegal Instruction`, exit `0xc000001d` | the same |
| 17:47:03 (this session, step 6) | managed | an EMPTY WebView store (renamed aside), the first open of that photo chat | yes (17:47:03.81), the end after `chat painted` (≈ 100 ms later) | Damir's Output lines |

## 3 · What the codec and the JIT can produce (b, c)

**Concentus 2.2.2** (the package's `Concentus.dll` = the one in the Windows build output, SHA-256 `3a1dcfcf…de1c9`;
its source: `lostromb/concentus` @ `6c2328d`, the commit that sets `<Version>2.2.2</Version>`):
- No `System.Runtime.Intrinsics` anywhere. `Vector<T>` in two places: the kernel `Kernels.xcorr_kernel_vector`
  (`Celt/Kernels.cs:311`), behind `Vector.IsHardwareAccelerated` in `CeltPitchXCorr.pitch_xcorr` (`:61`), and the
  resampler (`Common/SpeexResampler.cs:323-331`, `:462-464`; not on the 16 kHz decode path). `pitch_xcorr`'s callers are the
  encoder (pitch search, Burg, SILK pitch analysis) and the CELT packet-loss concealment (`_celt_autocorr`;
  `CELTDecoder.cs:282` → `celt_plc_pitch_search`). A complete CELT packet does not reach it; a packet of 1–2 bytes does (its payload is decoded as lost:
  `Opus/Structs/OpusDecoder.cs:243-246`), and the app's parsers accept a 1-byte packet (`VoiceCodec.cs:96`, `:230`).
  The null frame at a mode switch decodes in the PREVIOUS mode (`:258`, `:315-318`) and does not reach it. The probe's
  clips hold no packet that short. Either way `Vector<int>`
  at 256 bits needs AVX2 only, which the i9-9900K has.
- No unsafe pointer code in the managed codec; every `stackalloc` is a bounds-checked `Span<T>` (e.g. `Silk/NLSF.cs`,
  `Silk/Filters.cs`, `Celt/CeltLPC.cs`, `Celt/Structs/CELTDecoder.cs:291`, `Common/SpeexResampler.cs:362-363`). Unsafe code lives only in `Native/`.
- `OpusCodecFactory.CreateDecoder` first asks `NativeOpus.Initialize` for a native `opus` library
  (`NativePlatformUtils.PrepareNativeLibrary`; § 7 has the routes per platform). Spixi does not reference
  `Concentus.Native`; on Windows the managed decoder runs unless an opus library (the folders and names of § 7) sits in
  the folder of the process's executable, System32, an `AddDllDirectory` folder or a `runtimes\<rid>\native\` below the current directory (`win-x64`, `win10-x64`, `win10`, … `win7`,
  then the inherited `win` and `any`; `NativePlatformUtils.cs:688-706`, `:1083`; § 7).
- `VoiceCodec.cs` has no Concentus, no intrinsics, no unsafe code (`:22`, read whole).

**The JIT of .NET 10.0.15** (the cloud twin: the same runtime 10.0.15, a Xeon with AVX-512; the knobs of
libcoreclr 10.0.15 turn off every set the i9-9900K lacks: `EnableAVX512`, `…v2`, `…v3`, `EnableAVX10v1/v2`,
`EnableAVXVNNI`, `EnableAVXVNNIINT`, `EnableAVXIFMA`, `EnableGFNI`, `EnableVAES`, `EnableSHA`, `EnableAPX`,
`EnableWAITPKG`, `EnableX86Serialize`, `EnableAVX512VP2INTERSECT` = 0; the probe's `cpu:` line then reads like
Damir's): `DOTNET_JitDisasm=*` with code bytes over the whole probe child (1 002 methods, 695 of Concentus):
**0** instructions with an EVEX prefix, a `zmm` or mask register, an APX prefix, or a mnemonic above AVX2
(the full mnemonic list: `mov … vmovdqu vxorps vpbroadcastd vzeroupper shlx sarx rorx lzcnt blsr …`); without the
knobs the same run holds 320 such lines. The listing covers the methods the probe RAN (the seed and SILK clips, one
mode each), not every method of the codec. What the cloud could NOT show: the fault itself, the Windows ABI, the code
paths of the app process (WinUI, WebView2, the debugger).

**The probe on Damir's PC** (`scripts/voicefix/`, operator steps 1 and 2; runtime 10.0.15, `cpu: sse4.2 avx avx2
fma bmi1 bmi2 lzcnt popcnt · Vector<T> 256 bit` — the runtime sees no AVX-512):

| Source | Switch set | Runs | Exit codes | Clips decoded |
|---|---|---|---|---|
| seed (16 inline + 4 file clips of the dev seed, CELT; 2 SILK clips made by the encoder) | none · `EnableHWIntrinsic=0` · `EnableAVX2=0` · `EnableAVX=0` · `MaxVectorTBitWidth=128` · `TieredCompilation=0` · `TieredPGO=0` · `TC_OnStackReplacement=0` · `ReadyToRun=0` · `EnableWriteXorExecute=0` · `JITMinOpts=1` | 3 each | `0` × 33 | 22 per run × 4 passes, 0 null |
| own (the 4 voice files of the account's `Voice` and `Downloads` folders, read only) | none · `EnableHWIntrinsic=0` · `TieredCompilation=0` · `JITMinOpts=1` | 3 each | `0` × 12 | 4 per run × 4 passes, 0 null |

The probe runs on Damir's PC came before the #46 r1 change that switches Concentus's native route off in the
child (`OpusCodecFactory.AttemptToUseNativeLibrary = false`). Then, Concentus would have loaded a native `opus` only
from the folder of the process's executable (the runs started `dotnet VoiceFixProbe.dll`, so that is
`C:\Program Files\dotnet`), System32, or a library in `runtimes\<rid>\native\` below the current directory (the folders and names of § 7)
(`C:\Users\Damir`, the PowerShell prompt of the runs; the copy would land in `C:\Users\Damir`). Damir's check of
2026-11-23 (`Test-Path` of `$HOME\opus.dll`, `$HOME\runtimes`, `System32\opus.dll`,
`$env:ProgramFiles\dotnet\opus.dll`): asked at the end of the session, not answered when the batch was pushed —
owed (the status doc carries it).

## 4 · The app runs of this session (operator steps 3–14)

| Step | How Spixi ran | Page store | Chat opens | Result |
|---|---|---|---|---|
| 3 | `Spixi.exe` from PowerShell, no debugger, no `DOTNET_` variable | filled (the copy of 15:46) | the voice photo chat, 2× | exit `0x00000000` (closed by Damir) |
| 4 | F5, managed, the variable removed | filled | 3× | no end |
| 5 | the Windows event log (Application: `.NET Runtime`, `Application Error`, `Windows Error Reporting`) since 2026-11-11, lines with `Spixi` | — | — | **nothing**: Windows writes no crash record while a debugger is attached |
| 6 | F5, managed | **empty** (renamed aside) | 1st open | **end: `ExecutionEngineException` in Unknown Module** |
| 7 | F5, mixed (native on) | empty again (the store of step 6 renamed aside) | several | no end |
| (Damir) | F5, after scrolling a long chat first | — | several | no end |
| 8 | F5, mixed, `DOTNET_GCgen0size=80000` (a gen-0 budget of 512 KB: the garbage collector runs very often) | the store of step 7 | **none** (Damir did not open a chat; the chat list was shown) | **end within seconds** (18:07:13): `Exception thrown at 0x00000241CC4B086F in Spixi.exe: 0xC000001D: Illegal Instruction` · `The Common Language Runtime cannot stop at this exception. Common causes include: incorrect COM interop marshalling and memory corruption` · then `ExecutionEngineException`. The modules loaded just before: `StructuredQuery.dll`, `Windows.StateRepositoryPS.dll`, `Windows.Storage.Search.dll`, `PhotoMetadataHandler.dll` |
| 9 | the break of step 8, read with symbols | — | — | see § 4a |
| 10 | `Spixi.exe` from PowerShell, **no debugger**, `DOTNET_GCgen0size=80000` | the store of step 7 | as in step 8 | **no end** |
| 11 | meant: F5 with XAML Diagnostics OFF — Damir found that Spixi ran WITHOUT the debugger then (VS did not stop with Shift+F5): the same as step 10 | the same | a few minutes | no end (= no debugger) |
| 12 | F5, mixed, `DOTNET_GCgen0size=80000`, **XAML Diagnostics OFF** (Tools › Options › Debugging › XAML Diagnostics › "Enable XAML Diagnostics" cleared — Damir's picture of 19:53) | the same | scrolling in 2 chats | **end**: `Exception thrown at 0x0000021B5EBD086F … 0xC000001D` — the same page offset `…086F` as step 8 (`0x…241CC4B086F`) |
| 13 | **Ctrl+F5** (Visual Studio starts Spixi WITHOUT the debugger; the same profile, whose variables Visual Studio is expected to apply with Ctrl+F5 too — `DOTNET_GCgen0size=80000` was not observed in the process) | the same | 5 minutes of scrolling, the photo chat, chat changes | **no end** (closed by Damir) |
| 14 | F5, mixed, `DOTNET_GCgen0size=80000`, XAML Diagnostics off, **Hot Reload off** (Output: the Hot Reload agent and the XAML Diagnostics component do NOT load; `Microsoft.VisualStudio.Debugger.Runtime.*` does) | the same | 2 chats scrolled with 5 older pages, then a photo chat with 24 sent pictures | **end** (21:19:57): `virtdisk.dll`, `StructuredQuery.dll`, `Windows.StateRepositoryPS.dll` load → the chat paints → `Windows.Storage.Search.dll` loads → `Exception thrown at 0x000001E38C46086F … 0xC000001D` → `The program … has exited with code 3221225501 (0xc000001d) 'Illegal Instruction'` |

## 4a · The fault, named (step 9)

The faulting thread is the **main (UI) thread** (Threads window: `30196 · Main Thread · CoreMessagingXP.dll`). Its
stack, symbols from the Microsoft symbol server:

```
ntdll / KernelBase / ntdll …                  (the exception dispatch)
CoreMessagingXP.dll!Microsoft::UI::Dispatching::DispatcherQueue::DeferInvokeCallback(void *)   ← called 0x00000241CC4B086F
CoreMessagingXP.dll!CFlat::SehSafe::Execute<…>
CoreMessagingXP.dll!Microsoft::CoreUI::ActionCallback::ImportAdapter$(…)
CoreMessagingXP.dll!Microsoft::CoreUI::Messaging::MessageSession::Callback_InvokeDeferInvoke(…)
CoreMessagingXP.dll!Microsoft::CoreUI::Dispatch::DeferredCall::Callback_Dispatch()
…  Dispatcher::Callback_DispatchNextItem / Callback_DispatchLoop / EventLoop::Callback_RunCoreLoop / UserAdapter …
user32 / win32u
Microsoft.ui.xaml.dll!DirectUI::FrameworkApplication::RunDesktopWindowMessageLoop() Line 1319
Microsoft.ui.xaml.dll!DirectUI::FrameworkApplication::StartDesktop() Line 240
Microsoft.WinUI.dll!Microsoft.UI.Xaml.Application.Start(…)
Spixi.dll!Spixi.WinUI.Program.Main(string[] args) Line 26
```

The bytes around the target (the Disassembly window's decode around `0x00000241CC4B086F`): `int 3 · add al,[r8] ·
add [rax+1],dl · int 3 · add al,[r8] · add bh,bh · ?? · inc dword ptr [rax] · add [rax],al …` — **data, not code**
(zero runs, `CC` bytes, an undecodable `??`). The window decodes around the address, so which byte raised the #UD is
not read (an `int 3` would raise a breakpoint, not `0xC000001D`). The address lies near the .NET runtime's own
allocation area of this process: the static fields that `Program.Main` reads sit at `0x241CC801130` /
`0x241CC801128` (the Disassembly of `Main`, step 9), about 3.5 MB away.

**What it means.** `DispatcherQueue::DeferInvokeCallback` runs a callback queued with `DispatcherQueue.TryEnqueue` —
the road of every `MainThread.BeginInvokeOnMainThread`, every `await` that resumes on the UI thread
(`DispatcherQueueSynchronizationContext`) and the app's own `TryEnqueue` (`Spixi/Utils/SConfirm.cs:224`). Such a
callback is a COM object (`IDispatcherQueueHandler`); for a .NET delegate it is a COM callable wrapper that the WinRT
interop layer (C#/WinRT on `ComWrappers`) makes, and the dispatcher holds a reference to it until it runs. The
dispatcher called through the callback and landed on an address that holds data: **a call through a stale or invalid
callback target — consistent with a use-after-free of the wrapper or its function table; inferred, not shown.** The
`0xC000001D` (not an access violation) says the target page was executable, and the same low bits in three processes
fit a fixed target (e.g. a stale or not-yet-written stub in the runtime's executable memory) at least as well as a
freed wrapper. The processor raises
`0xC000001D` because the bytes it reached there do not decode as a valid instruction; on another machine or another heap layout
the same fault shows as `0xC0000005` (access violation) or runs garbage further. A garbage collection plausibly frees
the managed side: frequent collections bring the fault in seconds (step 8), the decode's allocations (§ 5) and the
first run with an empty page store (step 6) bring it sometimes.

**What it is not:** not an instruction-set gap of the processor, not a JIT code-generation fault, not Concentus, not
the voice data. `DOTNET_EnableHWIntrinsic=0` changes nothing in this chain; the runs "with the variable" were a
quiet period (§ 4).

## 5 · Reading

- **Shown:** under very frequent collections the end came in every F5 run (3 / 3: steps 8, 12, 14) and in no run
  without the debugger (0 / 3: step 10 with the variable set; 13 with it expected from the profile; 11 not known); XAML Diagnostics and Hot Reload do not decide it (12, 14). The
  engines "managed" (6) and "managed with native" (8, 12, 14) both show it. Without frequent collections F5 ended once
  in 4 runs (step 6; not 4, 7, Damir's own run).
- **The same spot, three times:** the fault addresses of steps 8, 12 and 14 (`0x00000241CC4B086F`,
  `0x0000021B5EBD086F`, `0x000001E38C46086F`) end in the same 16 bits (`086F`) in three processes — consistent with a fixed
  offset inside one 64 KB-aligned allocation, not a random pointer (only step 8's address was placed near the
  runtime's statics). The 15:36 end of the walk faulted at
  `0x0000020E9729095B` (`…095B`): the address alone is not the signature; the stack (`DispatcherQueue::
  DeferInvokeCallback` on the main thread) is — it was read only for step 8 (in step 9).
- **The same moment twice:** in steps 8 and 14 the end comes right after Windows loads its search and property
  modules (`StructuredQuery.dll`, `Windows.StateRepositoryPS.dll`, `Windows.Storage.Search.dll`). In step 14 a photo
  chat with 24 sent pictures had just opened: those modules come with `StorageFile.GetFileFromPathAsync`
  (`Spixi/Platforms/Windows/SThumbnail.cs:33`, `:99` — the tile thumbnail and the viewer image, called on the pool). In step 8 Damir had opened no chat: what loaded them there is not
  identified (the warm spare page and the chat list run at start). A module load stops the process for a debugger
  event; the dispatcher then runs a stale callback. Which party leaves it stale (the debugger's in-process helper
  `Microsoft.VisualStudio.Debugger.Runtime`, the runtime's debugger support, or the WinRT layer) is not shown.
- **Not proven:** whether a callback object was freed (or a stub left stale), whose, and which part of the debugging session does it. Nothing in
  Spixi's own code holds a raw COM pointer or a native callback: the Windows code calls `DispatcherQueue.TryEnqueue`
  once (`Spixi/Utils/SConfirm.cs:224`, a lambda through the C#/WinRT projection), and no
  `Marshal.GetFunctionPointerForDelegate`, `ReleaseComObject`, native or WinRT timer (`DispatcherQueueTimer`,
  `CreateTimer`) or hook of ours exists on Windows (searched: `Spixi/**/*.cs`; managed `System.Threading.Timer`s exist,
  e.g. `VoiceClips.cs:258`, and run on the pool). The native imports of the Windows code are exactly
  `GetLastInputInfo`, `GetOpenFileNameW` (no hook), `CommDlgExtendedError`, `GetDpiForWindow` and `FlashWindowEx`.
- **The voice decode is a bystander.** It allocates a `short[]` per packet and a `List<short>` per clip
  (`VoiceClips.cs:953-986` and its `PcmCollector`, `:989-1031`, the list at `:997`; `OpusDecoder.cs:68-75`): a garbage-collection trigger, which is why the end could follow
  `Concentus.dll` closely (15:36; step 6: about 100 ms) without being in it.

## 6 · Other platforms (item 4, from the code)

| Platform | Same decode code? | Can the same end happen? | What a walk looks at |
|---|---|---|---|
| Windows, installed / no debugger | yes (`VoiceClips.peaksCsvOf` → `OpusDecoder` → Concentus, managed) | **not shown**: no end with no debugger (steps 3, 10, 13) | the voice chat opens 20 times with no debugger, the waveform shows, the clip plays |
| Windows, F5 (the Visual Studio debugger) | yes | **yes**, at random (a fault of the debugging session): a walk that must not be cut short runs with Ctrl+F5 | — |
| Android | yes (`Platforms/Android/SAudioPlayer.cs:212` plays through the same `OpusDecoder`) | no: no WinUI dispatcher. Concentus tries ONE `dlopen("libopus.so")` by its leaf name (the code calls it probing the apk; `Native/NativePlatformUtils.cs:218-232`, `:744`, `:895-905`); Spixi ships none in the apk; on API 23 (Spixi's minimum) the linker may resolve the SYSTEM's libopus — then the native decoder runs; not verified (§ 7) | nothing new (the voice rows were walked in `photo1b` / `walktools`) |
| iPhone, Mac | yes (`Platforms/iOS`, `Platforms/MacCatalyst/SAudioPlayer.cs:163`, floats) | no: no WinUI dispatcher. Concentus first tries `dlopen("libopus.dylib")` by its leaf name (`:756-758`, `:945-951`); on the Mac that searches `$DYLD_LIBRARY_PATH`, the binary's `LC_RPATH` folders and — in an unrestricted process only — the current directory and the old fallback folders (dlopen(3)); whether a Spixi Mac build could load a foreign `libopus.dylib` is not verified (§ 7) | nothing new for this fault |

## 7 · Legacy note for the BE engineer (inherited sink, trigger widened by ours)

`Concentus` 2.2.2 and `NAudio` 2.3.0 are the versions of the fork point `0e85a4b8` (`Spixi/Spixi.csproj` there:
lines 122 and 138; its `OpusDecoder.cs:100` / `OpusEncoder.cs:93` call the factory, as today). Before the managed
decoder, `OpusCodecFactory` tries a native opus library (`Native/NativePlatformUtils.cs`, source
`lostromb/concentus` @ `6c2328d`):
- **Windows:** `LoadLibraryExW("opus.dll", LOAD_LIBRARY_SEARCH_DEFAULT_DIRS)` — the folder of the process's
  executable, System32 and `AddDllDirectory` folders, not PATH and not the current directory (`:854`); then it copies
  a library from `<current directory>/runtimes/<rid>/native/` (rids `win-x64`, `win10-x64`, … `win7`, `win`, `any`:
  `:688-706`, `:1083`; names such as `opus.dll`, `libopus.dll`, `opus_x64.dll`, `opus64.dll`: `:776-806`) INTO the
  current directory (an older copy there is deleted first; `:248`, `:251`, `:278-283`) and loads it
  (`Native/NativeOpus.cs:19`).
- **Mac / iPhone:** `dlopen("libopus.dylib")` by leaf name (`:756-758`, `:945-951`). On the Mac dlopen(3) searches
  `$DYLD_LIBRARY_PATH`, the binary's `LC_RPATH` folders and, in an unrestricted process only, the current directory
  and the old fallback folders (e.g. `/usr/local/lib`); a hardened, library-validated build refuses a foreign
  library. The `runtimes/…` copy does not run for a Mac Catalyst build (`:274-276`; `:296` throws, caught at
  `OpusCodecFactory.cs:200`), but the delete of `:248` does. Whether a Spixi Mac build could load a foreign
  `libopus.dylib` is not verified — a check for the Mac session (`macfix`).
- **Android:** ONE `dlopen("libopus.so")` by leaf name (`:218-232`, the name `:744`, the `dlopen` `:895-905`); it
  returns before the delete and the copy (`:228`). Spixi's minimum is API 23 (`Spixi/Spixi.csproj:53`); the linker's
  refusal of non-NDK platform libraries applies from API 24, and AOSP builds `libopus` as a platform library. So on an
  Android 6 device the `dlopen` may resolve the SYSTEM's native libopus with no file placed by anyone, and a peer's
  voice packets would then reach that device's native decoder instead of the managed one. **Not verified** (a check:
  on an API 23 emulator, the type that `OpusCodecFactory.CreateDecoder` returns).

Spixi ships no native opus. Windows: the managed decoder runs unless an opus library sits in one of those places.
Mac: not verified. Android API 23: possibly the system's native library, not verified. Inherited behaviour of the
package (the sink); its trigger is widened by our voice messages (#1208: the waveform decode of a peer's voice
message at chat open, in addition to a call or a recording at the baseline). `OpusCodecFactory.AttemptToUseNativeLibrary
= false` once at start would close every route (a one-line choice, not made here: Q-3 for the main chat, #1905).
