# Mac bring-up log — Phase B

Running findings log. Companion to `mac-bringup-checklist.md`. Newest at the bottom.

## 2026-07-20 — session 1 (MacCatalyst attempt)

**Toolchain:** .NET 10.0.302 (Arm64) + `maui` workload pinned to set **10.0.300.3**
(newest set demands Xcode 26.6; App Store ships 26.5 — pin required, see
dotnet/macios releases for the pairing). Xcode 26.5 with macOS+iOS platforms.
Node NOT yet installed on the Mac (pipeline sanity run still owed). Disk was the
first blocker — freed caches + Trash to make room for the workload set.

**Repo changes (committed under this phase):**
- `Spixi.csproj`: Windows TFM now conditional on `IsOSPlatform('windows')` —
  fixes NETSDK1100 on Mac; zero effect on Windows builds.
- `Spixi.csproj`: maccatalyst-only `NativeReference` to
  `Platforms/MacCatalyst/NativeLibraries/librocksdb.dylib` (folder gitignored,
  machine-local shim — see below).
- `.gitignore`: + `Spixi/Platforms/MacCatalyst/NativeLibraries/`.
- Second repo required as sibling clone: **`../Ixian-Core`** (shared project
  import). Same branch on PC and Mac.

**Results:**
- ★ **First-ever non-Windows build + launch of the redesign.** `net10.0-maccatalyst`
  compiles (1,623 warnings, mostly CA1416 platform-API notes in Ixian-Core console
  helpers — cosmetic for now) and the app launches. **WKWebView loads the launch
  shell correctly** — fonts, icons, layout, "Connecting to Ixian platform" status
  all render. No file:// sandbox issue at the launch-shell stage.
- ✗ **BLOCKED: RocksDB on MacCatalyst.** Fatal on boot:
  `TypeInitializer for 'RocksDbSharp.Native'` from `Node.start →
  RocksDBStorage.prepareStorageInternal` (storage backend is RocksDB-only —
  `Spixi/Meta/Node.cs:81`, no alternative IStorage impl).
  Root cause chain, both required and only the second one is fatal:
  1. The NuGet `runtimes/osx-arm64` dylib is platform-stamped **macOS**; Catalyst
     processes may only load Catalyst-stamped libs. Workaround applied: `xcrun
     vtool -set-build-version maccatalyst 15.0 15.0` re-stamp into the gitignored
     shim folder. Works, but was not sufficient because —
  2. The public managed wrapper (`RocksDbSharp` / warrenfalk `AutoNativeImport`)
     detects platform via `RuntimeInformation.IsOSPlatform(Windows|OSX|Linux)`.
     **MacCatalyst matches none → falls through to the WINDOWS importer** →
     probes `rocksdb.dll` via `kernel32` → `DllNotFoundException: kernel32.dll`
     per candidate path. No override hook exists in the wrapper. Verified against
     upstream source (AutoNativeImport.cs) and the app log stack trace.

**Conclusion:** MacCatalyst needs the SAME fix Android/iOS already have — the
dev's custom RocksDB-Sharp. The `RocksDB 0.0.42` custom nupkg exists only on the
dev's machine (not on nuget.org; csproj comment "use custom built RocksDB-Sharp").

**Dev asks (sent to BE dev):**
1. `RocksDB.0.0.42.nupkg` → unblocks Android (PC) **and iOS Simulator on the Mac**
   (RocksDB.xcframework already ships an `ios-arm64_x86_64-simulator` slice).
   Plan: commit a repo-local NuGet feed (`local-nuget/` + `nuget.config`) so every
   clone restores it.
2. *(optional)* MacCatalyst arm64 slice in RocksDB.xcframework + wrapper support,
   if a native Mac desktop app is wanted (else Mac testing = iOS Simulator).

**Next on the Mac (not dev-blocked):** install Node LTS → pipeline sanity run
(full generator sequence must leave a clean git tree) → Safari pass over
`src/demo/*.html` (Safari = WebKit = same engine family as WKWebView; cheap
early warning for iOS-class CSS/JS quirks).
