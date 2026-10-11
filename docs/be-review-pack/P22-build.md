# P22 · BUILD · Build config, store gates, platform manifests, supply chain

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| MED | no direct — but the native RocksDB code it pins runs inside the wallet process | no | shipped | 6 min |

**Look here first:** `nuget.config:35` — the repo-local feed may serve only `RocksDB`. But NuGet does not check the SHA-512 at `nuget.config:26` (a comment), and the repo has no `packages.lock.json`. Only smoke gate 22 recomputes the hash of the committed `local-nuget/RocksDB.0.0.42.nupkg`.

**DECISIONS:** #732 · #734 · #792 · #805 · #806 · #807 · #912 · #915 · #919 · #920 · #1084 · #1244 · #1245 · #1254 · #1281 · #1293 · #1300 · #1303

## What changed and why
- A dev build installs beside Play-signed legacy on Android (`com.ixilabs.spixi.dev`) and defines `SPIXI_DEV_COEXIST` (#732, #734). A STORE build (`-p:SpixiStoreRelease=true`) is refused if it is not Release or carries that symbol (O-35 (#1303)).
- iOS push works now: APNs entitlements + App Group, and the Notification Service Extension is part of the app (#915, #919). `production` APNs only for a store build (O-31 (#1303), #807).
- Release builds run `node scripts/strip-release.mjs`. It removes CSS comments from `spixi.tokens.css` only (#792).
- Supply chain: `nuget.config` got `<clear/>`, source mapping and a recorded hash (F-21, the NuGet source finding (#805, #806)). Mac Catalyst compiles a vendored rocksdb-sharp with a hash manifest (#920).
- Android: backup excludes chats, logs, WebView data and sharedpref (#912, #1281, #1300). Added: VIBRATE (#1254) and the IMAGE_CAPTURE query (#1244). Captures are out of git (O-27 (#1303)).

## Files (verified at 387ca78b)
- `Spixi/Spixi.csproj:40` / `:41` / `:43` — dev symbol ON by default in Debug; `.dev` app id on Android only; `SPIXI_DEV_COEXIST` (#732).
- `Spixi/Spixi.csproj:428` — `SpixiStoreReleaseGate` (BeforeTargets PrepareForBuild). It runs ONLY when the flag is passed (#1303).
- `Spixi/Spixi.csproj:142` — `Entitlements.Release.plist` (aps `production`) only for Release + store flag; `:132` default `development` (#1303).
- `Spixi/Spixi.csproj:464` — Release build runs `node` (Exec) on a repo script (#792). `:145` `UseInterpreter` on iOS is INHERITED (base `:68`).
- `Spixi/Spixi.csproj:408` — the iOS push extension is now a ProjectReference (commented out at base). `Spixi-PushService/Spixi-PushService.csproj`: OneSignal 5.2.2 → 6.1.9, version 0.9.22 (#919).
- `Spixi/Platforms/Android/AndroidManifest.xml:6` — `allowBackup` kept (legacy) + backup rules; `:11` provider authority `${applicationId}.provider`, `exported=false` (#734, #912). No new exported component (MainActivity attribute unchanged).
- `Spixi/Platforms/MacCatalyst/RocksDbSharp/MANIFEST.sha256` — 43 file hashes of rocksdb-sharp @ `f1cf0ba`, one patched file (`AutoNativeImport.cs`). `NativeLibraries/README.md`: the Catalyst `librocksdb.dylib` is hand-made per Mac from the PUBLIC package (curl + `vtool`), gitignored, no recorded hash (#920).
- `Spixi/MauiProgram.cs:50` — Mac now gets the iOS WebView handler (D25 "Mac has no handler" fixed, #1245). ATS `NSAllowsArbitraryLoads` stays on iOS + Mac (D24, legacy, unchanged).
- `.gitignore:484`–`:491` — captures + `/Claude outputs/`; at HEAD none are tracked; history still holds the 64 MB logcat (#1303).

## Bridge surface
None — C#-only change (build and platform configuration; no verb or push).

## Threat → rule → proof
| A hostile … could try… | What stops it (`file:line`) | Proof |
|---|---|---|
| contributor PR: drop a `.nupkg` that shadows a public id | `<clear/>` + mapping `local` → `RocksDB` only, `nuget.config:21`, `:35` | smoke gate 22 (mapping + SHA-512 recomputed) |
| contributor PR: swap the committed RocksDB nupkg | smoke recomputes SHA-512 — NOT NuGet restore | smoke gate 22; no restore-time check |
| PR edits a vendored rocksdb-sharp file | `MANIFEST.sha256` body hashes | smoke "★ #920 ③b … MANIFEST.sha256 matches" |
| ship a store build with the seed harness / console mirror | `Spixi.csproj:428` | `pins-s15/d-build.mjs` O-35 (evaluated matrix) |
| TestFlight build signed with `development` APNs | `Spixi.csproj:142` | `pins-s15/d-build.mjs` O-31 |
| device captures pushed to GitHub | `.gitignore:484` | `pins-s15/d-build.mjs` O-27 (`git check-ignore`) |

## Given up / left open
- The store gate needs `-p:SpixiStoreRelease=true` on every store build. A plain Release build is still clean, because the dev symbol defaults only in Debug (#732, freeze checklist O-35 line, #1303).
- The Mac Catalyst dylib has no hash and no reproducible build. Mac does not ship yet (#920).
- `android:allowBackup="true"` and iOS/Mac ATS `NSAllowsArbitraryLoads` are legacy and left in place. `wallet.ixi` stays in the backup on purpose (#1281, #1300).
- The 64 MB logcat stays in git history. Removing it needs a history rewrite (Damir's call, #1303).

## Question for BE
Is the committed `RocksDB.0.0.42.nupkg` (SHA-512 `96e2839f…`) byte-identical to the package you built?
