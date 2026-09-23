# Mac Catalyst — RocksDB native library (route B, #920)

This folder is **gitignored** except for this README. It holds the machine-local
`librocksdb.dylib` that the maccatalyst build links (`Spixi.csproj`, the `NativeReference`
gated on `Exists(...)`). Nothing in the repo ships a Catalyst-stamped RocksDB; you make it
once per machine from the public package's macOS build.

## Why

The public `RocksDB` NuGet ships `runtimes/osx-arm64/native/librocksdb.dylib` stamped for
**macOS**. A Mac Catalyst process may only load a **Catalyst**-stamped library (dyld refuses
the platform mismatch). The dev's custom `RocksDB.0.0.42.nupkg` carries a 52-byte STUB for
every osx slice ("stub, to be replaced during Azure Devops compilation"), so it cannot help
here. `vtool` re-stamps the platform on a copy — the July 2026 session STAMPED one this way
(`docs/mac-bringup-log.md`, step 1) but the process never reached `dlopen`: the managed loader
mis-detected Catalyst as Windows and died probing `kernel32` first. So the stamp is
**untested at load time** — the first run below is that test. The loader half is what
`Platforms/MacCatalyst/RocksDbSharp/` (the vendored wrapper with the Catalyst patch) is for.

## Make the dylib (once per Mac, ~1 minute)

```sh
# 1. the public package's macOS arm64 dylib. ⚠ Since #920 the maccatalyst TFM no longer
#    restores the public package, so a fresh Mac has NO ~/.nuget copy of it — fetch the
#    nupkg once by hand (it is a zip):
#      curl -L -o /tmp/rocksdb.nupkg https://www.nuget.org/api/v2/package/RocksDB/10.4.2.64152
#      unzip -o /tmp/rocksdb.nupkg 'runtimes/osx-*/native/librocksdb.dylib' -d /tmp/rocksdb
#    (a Mac that restored RocksDB 10.4.2.64152 for any other project still has it under
#    ~/.nuget/packages/rocksdb/10.4.2.64152/ — either source is the same file)
SRC=/tmp/rocksdb/runtimes/osx-arm64/native/librocksdb.dylib
ls -la "$SRC"
# 2. re-stamp a COPY for Catalyst (minimum + SDK 15.0 — the app's SupportedOSPlatformVersion)
cp "$SRC" Spixi/Platforms/MacCatalyst/NativeLibraries/librocksdb.dylib
xcrun vtool -set-build-version maccatalyst 15.0 15.0 -replace -output \
  Spixi/Platforms/MacCatalyst/NativeLibraries/librocksdb.dylib \
  Spixi/Platforms/MacCatalyst/NativeLibraries/librocksdb.dylib
# 3. verify the stamp
xcrun vtool -show-build Spixi/Platforms/MacCatalyst/NativeLibraries/librocksdb.dylib | grep -A3 LC_BUILD_VERSION
#    expect: platform MACCATALYST · minos 15.0 · sdk 15.0
```

On an Intel Mac use the `osx-x64` slice. The RID the build uses is in `Spixi.csproj` (the
`RuntimeIdentifier` block at the top). ⚠ A **Release** Catalyst build is UNIVERSAL
(`maccatalyst-x64` + `maccatalyst-arm64`), so it needs BOTH slices stamped and joined:
stamp `osx-x64` and `osx-arm64` separately (steps 2–3 on each), then
`lipo -create -output librocksdb.dylib librocksdb-x64.dylib librocksdb-arm64.dylib`.
Debug on one architecture needs only its own slice.

## Build and verify

```sh
dotnet build Spixi/Spixi.csproj -f net10.0-maccatalyst -c Debug
```

1. It must **compile** — the first compile of the vendored wrapper on this TFM. A compile
   error inside `Platforms/MacCatalyst/RocksDbSharp/` is a vendoring problem (re-vendor from
   the pinned commit, see below); one anywhere else is the app's.
2. Run it. The boot must get **past `RocksDBStorage.prepareStorageInternal`** — the July
   crash was `TypeInitializer for 'RocksDbSharp.Native'` there. The wrapper records the
   library it loaded in `NativeImport.Auto.LoadedPath`; a `DllNotFoundException: kernel32`
   means the Catalyst patch did not take (the source compiled is not the vendored one);
   a `dlopen:` error names the path it tried — the dylib is not beside the assemblies or
   its stamp is wrong (step 3 above).
3. ⚠ **UNVERIFIED until it runs**: that MAUI copies a `Kind=Dynamic` NativeReference into
   `Contents/MonoBundle/` beside `Spixi.dll`, which is where the loader's `basePaths`
   look. If `LoadedPath` stays empty and every candidate fails, copy the dylib into the
   built app's `Contents/MonoBundle/` by hand once to split "search path" from "stamp".
4. Then the same three checks on a **Release** build (`-c Release`, the universal dylib
   from the lipo note above) — the trimmer and the two-arch bundle are a different path,
   and TestFlight ships Release.

## Re-vendor (only if upstream must move)

The vendored source is `csharp/src/**` of
`https://github.com/curiosity-ai/rocksdb-sharp` at commit
`f1cf0ba0306fa01b55efa2292c1cc44ee3192b88` — the exact commit the dev's
`RocksDB.0.0.42.nupkg` names in its nuspec, binding native RocksDB **10.4.2**, the same
version the public package the other desktop TFMs use — the dev's shipped DLL is a
MODIFIED build of that commit (a static `__Internal` binding for iOS/Android); this is the
public source. Licence BSD-2-Clause — the upstream `LICENSE` is vendored beside the source
(`RocksDbSharp/LICENSE`, also listed in `NOTICES.md`); `AutoNativeImport.cs` carries its own
MIT notice from warrenfalk. `RocksDbSharp/MANIFEST.sha256` records the sha256 of every file's
body below its header; the smoke suite recomputes it, so an accidental edit to a vendored
file fails the suite instead of hiding.

Every vendored file carries a `//` banner ending in a `#nullable disable` line (the app builds
with `Nullable=enable`; the wrapper is unannotated) and is otherwise identical to upstream
(modulo BOM, CRLF and the final newline) — **except `AutoNativeImport.cs`**, which carries the two `#920` edits:
`Auto.Import` routes `OperatingSystem.IsMacCatalyst()` to the Posix importer, and
`GetRuntimeId` names the `osx` search folder for it. The smoke suite pins the header on
every file, both patch lines, the csproj's unsafe flag and the package exclusion for this
TFM, and that no other TFM compiles the folder.
