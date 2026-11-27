# Apple compile baseline — iOS and Mac Catalyst at `redesign/frontend` @ `ae7b8303` (session `applecc`, 2026-11-27)

**Both targets compile: 0 errors on the iOS simulator target, 0 errors on the Mac Catalyst target.**
The app tree that compiled is the base `ae7b8303` ("Merge pull request #29 from Rexoflex/work/fixb5"): the commits of
`work/applecc` change no app file (`git diff --stat ae7b8303 <head>` lists only `.github/workflows/apple-compile.yml`
and files under `docs/` plus the record files `DECISIONS.md`, `CLAUDE.md`).

Evidence: workflow `apple-compile`, run 45915584350 on `work/applecc` @ `3bb9f49c` (2026-11-27),
https://github.com/Rexoflex/Spixi/actions/runs/45915584350 — job "iOS simulator (compile only)" 140233875518 and job
"Mac Catalyst (compile only)" 140233875774, both green; the step "Publish the compile errors" printed an empty list
for both; no error annotation (per job: 10 warning annotations from the C# problem matcher of `setup-dotnet` and one
notice of GitHub about macOS arm64 queue times). Run 4 ran the workflow of `3bb9f49c`; the delivered workflow (two
fix rounds of the security review later) has its own run on the same app tree: run 5, § 7.

## 1 · Per target
| Target | Compiles | Errors | Warnings | Build output | MSBuild "Time Elapsed" |
|---|---|---|---|---|---|
| iOS, `net10.0-ios`, `iossimulator-arm64`, Debug | **yes** | 0 | 1692 | `Spixi.dll` and `Spixi-PushService.dll` | 2 min 34 s |
| Mac Catalyst, `net10.0-maccatalyst`, `maccatalyst-arm64`, Debug | **yes** | 0 | 1665 | `Spixi.dll` | 1 min 11 s |

The warnings are mostly nullability (CS8602, CS8625, CS8604, CS8600, CS8618, CS8603), then CS0618 (obsolete) and
CS4014; Ixian-Core is a shared project and is counted in them. The office build of 2026-08-24 had 1693 warnings / 0
errors (`docs/ios-push-findings-2026-08-24-office.md:211`) — an iPhone device build of a much older tree, so the near
match is not a comparison. This batch does not list or judge the warnings.

## 2 · Errors by batch
None. There is no error row, so no `git blame` and no fix line.

## 3 · `SThumbnail.cs` line 80 (item `n-20261015-mac-thumbnail-compile`)
The fix of the item IS on the base. Both `Spixi/Platforms/iOS/SThumbnail.cs:80` and
`Spixi/Platforms/MacCatalyst/SThumbnail.cs:80` read `CoreGraphics.CGImageProperties? props = src.GetProperties(0);`
(`git blame`: `bff30223`, "Session HK1 (a): the iOS / Mac SThumbnail compile fix and its pin", 2026-11-12). The run
above compiles both files with no error (the four errors per target of 2026-10-15 — CS0104, CS0019, 2 × CS1061 at
lines 80–81, by the notes of the Mission Control item; DECISIONS #1481 and `docs/handoff-2026-11-11-hk1.md` say "4
compile errors per target" — are gone). The item's "done when" asks for the commit (it is on the base) and a clean
iPhone and Mac build with 0 errors without the local edit: this run is a clean compile of the committed tree for the
iOS SIMULATOR and for Mac Catalyst. For this file the C# source and the TFM are the same on the device, so the compile
result carries over; a device build itself is not covered (§ 4). The main chat decides "Done" (rule 11 of
`claude/mission-control-howto.md`); this session writes only a note.

## 4 · What "compiles" covers here, and what it does not
| Covered | Not covered |
|---|---|
| The C# compile (and XAML) of `Spixi.csproj`, with Ixian-Core @ `097341a`, for both targets; `Spixi-PushService` for iOS | **Release**: the build is Debug, so `DEBUG` and `SPIXI_DEV_COEXIST` are defined; 17 C# files under `Spixi/` have `#if` branches on them, 13 of them with a branch that differs on Apple (3 are Android files, and `App.xaml.cs` tests `SPIXI_DEV_COEXIST && ANDROID`; `Platforms/iOS/SPlatformUtils.cs` and `Platforms/iOS/iOSWebViewHandler.cs` among the 13), and their other branch is not compiled. A store build (`SpixiStoreRelease=true`) is not compiled |
| The other steps of a Debug build that the log shows (the trimmer on the iOS leg: `MtouchLink=SdkOnly`), unsigned (`EnableCodeSigning=false`) | **The iPhone device** (`ios-arm64`): it takes the other RocksDB slice and needs signing; only the simulator target is compiled |
| | `maccatalyst-x64`; the link, trim and AOT steps of a Release build; any run of the app |
| | **The RocksDB library on the Mac**: `librocksdb.dylib` is a local, gitignored shim (`Spixi.csproj`: the `NativeReference` only when the file exists); the CI bundle has none, so only the C# compile is the same as Damir's local build |

A Release compile of the simulator target (no signing) would close the Release part of the first gap (the store build needs `-p:SpixiStoreRelease=true` as well); it is a proposal, not built
(DECISIONS #2105, in this branch).

## 5 · The toolchain (SDK, workload set and Xcode pinned in the workflow; the image label floats)
| Part | Value | Why |
|---|---|---|
| Runner image | `macos-26` (arm64) — a FLOATING label: run 4 ran on image 20261117.0516.1, run 5 already on 20261123.0526.1 | the macOS image with Xcode 26.x; if an image drops `Xcode_26.6.app`, the job fails at once at the Xcode step |
| .NET SDK | 10.0.302, pinned by a `global.json` the job writes ABOVE the checkout (the repository has none, and the job fails if the tree has one) | Damir's Mac (`docs/ios-push-findings-2026-08-24-office.md:211`) |
| Workload | `maui`, workload set 10.0.303.1 (its ios and maccatalyst manifests 26.5.10315; the set also installs the net10 packs 26.0.11017 and the opt-in 27.0.10417) | the same |
| Xcode | `/Applications/Xcode_26.6.app` (26.6, build 17F113), pinned by path | the same; the pack's Xcode check passed |

Runs 1–3 of this session (the same app tree) did not reach the compiler: run 1 took the image's newest SDK 11.0.100,
whose workload has the net10 GA packs 26.0, against the newest `Xcode_26*.app` (26.6; "requires Xcode 26.0"); run 2
took SDK 10.0.404, whose newest workload has net10 packs 27.2 that need an Xcode the image does not have; run 3 chose
the Xcode by the most recently written pack folder and found 27.0. A new SDK, workload set or Xcode is a deliberate change of these
three lines, together with one run.

## 6 · How to use it
- The workflow `.github/workflows/apple-compile.yml` runs on every pull request to `redesign/frontend`. The manual
  run (`workflow_dispatch`) works only when the file is on the fork's DEFAULT branch, which is `master`, not
  `redesign/frontend` (GitHub's rule); until then a pull request is the way to run it. It is **not a required
  check**: Damir, do not add it to the branch rule yet (one or two pull requests first, to see its time and its flakes).
- A pull request run's verdict is evidence only together with the diff of the build inputs (the workflow file, the
  project files, `nuget.config`, `global.json`, `local-nuget/**` and the like — the list is in the workflow header):
  from the first `dotnet` command on, a pull request's own files control the job.
- On Damir's Mac the same compile, without signing, is one line in the clone (zsh):
  `dotnet build Spixi/Spixi.csproj -c Debug -f net10.0-maccatalyst -p:RuntimeIdentifier=maccatalyst-arm64 -p:EnableCodeSigning=false`
  (iOS: `-f net10.0-ios -p:RuntimeIdentifier=iossimulator-arm64`). It is the same compile only on the same SDK:
  check `dotnet --version` first (10.0.302 in CI); a newer SDK on the Mac takes other Apple packs (run 1). Wipe `Spixi/obj` + `Spixi/bin` before the next
  device build after it.
- "⚠ C# UNCOMPILED" in a batch's records can now name the Apple targets as compiled when the pull request's
  `apple-compile` run is green (Debug, iOS simulator + Mac Catalyst arm64, as in § 4).

## 7 · The run of the delivered workflow
Run 5, 45917920666 on `work/applecc` @ `0b8bc68a` (the workflow after review rounds 1–3; the last commit only removes
the `push` trigger), https://github.com/Rexoflex/Spixi/actions/runs/45917920666: both jobs green — iOS simulator
(job 140241500160) 1692 warnings / 0 errors, Mac Catalyst (job 140241499835) 1665 warnings / 0 errors; both error
lists empty; one notice annotation per job and no other (the C# problem matcher is removed before the build). The
same app tree as run 4, so the same result.
