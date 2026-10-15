# iOS / Mac Catalyst compile-risk report — 2026-10-15 (Session V1A-M, Drop 1)

Read-only review of every C# / project / plist file changed since the last iOS + Mac compile that worked. **The cloud cannot build iOS or Mac Catalyst** (no Xcode, no ios / maccatalyst workload): this is a review by reading, like a compiler, not a build. The office build (`docs/office-walk-sheet-v1.md` §16, row OW-B1) is the proof.

## 1 · Scope and method

- **Baseline:** the office walk #1114 compiled iOS + Mac at `b9528a91` (2026-10-01). Everything changed since then has never compiled for `net10.0-ios` / `net10.0-maccatalyst`: **144 files** (`git diff --name-status b9528a91..2a469442 -- Spixi Spixi-PushService`, deletions excluded) — 103 shared `.cs`, 10 iOS, 7 Mac, the csproj, 4 plists / entitlements, the rest Android / Windows only.
- **Key fact:** Windows (F5) and Android Debug compile every shared line. So a shared line that compiles there compiles on Apple too. The risk is code ONLY Apple compiles: `Platforms/iOS/**`, `Platforms/MacCatalyst/**`, `#if IOS` / `MACCATALYST` / `__IOS__` regions, `#else` branches only Apple reaches, interface members the Apple classes must implement, and the csproj target that adds `Platforms/iOS/iOSWebViewHandler.cs` to the Mac compile (#1245).
- **Five read-only auditors, disjoint files** (findings files kept in the session, not in the tree): A1 iOS platform + csproj + iOS interface conformance · A2 Mac platform + Mac interface conformance · A3 shared files with `#if` regions (26 files) · A4 `SingleChatPage` + `HomePage` · A5 `LaunchPage`, `SettingsPage`, `RestoreMoves`, `SpixiFlags`, transfer / node / voice files + a grep sweep of the other 64 shared files + `Spixi-PushService`.
- **Build settings checked:** no `TreatWarningsAsErrors` / `WarningsAsErrors` in `Spixi.csproj` (no `Directory.Build.props`, no `.editorconfig`) → nullable (CS86xx) and obsolete-API (CA1422) lines are warnings. `<Nullable>enable</Nullable>`, `<ImplicitUsings>disable</ImplicitUsings>`. No new PackageReference / NativeReference / ProjectReference since `b9528a91`. `Spixi-PushService` (which does treat warnings as errors) is unchanged since `b9528a91` and compiles no shared file.

## 2 · Result

**ERROR 0 · LIKELY 0 · RUNTIME 2 · WATCH 12.** No clear compile error was found, so `session-v1am-drop1.patch` carries no C# change. It carries ONE runtime fix (R-1, two plist keys) that Damir may keep or drop — see §5.

### RUNTIME

| ID | file:line | Pl | What | Fix | Walk row |
|---|---|---|---|---|---|
| R-1 | `Spixi/Platforms/iOS/Info.plist` (no key) ← `SingleChatPage.xaml.cs:7793` → `Platforms/iOS/SFileOperations.cs:41` | I (M harmless) | The viewer Save (`ixian:savePhoto`, S11 G / S12, after `b9528a91`, never run on Apple) opens the share sheet with the image. Its "Save Image" writes to the photo library; without `NSPhotoLibraryAddUsageDescription` iOS ends the app. The `try/catch` in `onSavePhoto` cannot catch it (the write runs inside the system sheet). Found by A1, A2 and A4 independently. | Add `NSPhotoLibraryAddUsageDescription` to the iOS and the Mac `Info.plist` — **in `session-v1am-drop1.patch`** | OW-SAVE |
| R-2 | `Spixi/Meta/WalletPassStore.cs:270-275` · `Spixi.csproj:122-142` (CodesignEntitlements for `-ios` only) | M (and the iOS Simulator) | S16 L8 is the app's first Keychain use. The Mac build has no entitlements file; Mac Catalyst Keychain writes without `keychain-access-groups` fail with -34018 (MissingEntitlement). WalletPassStore catches it (no crash) but the L8 path does not engage: likely the password question on every start and a refused backup. Known gap (#1323). A device iOS build is fine. | Not in this drop. If OW-L8-M fails: `Platforms/MacCatalyst/Entitlements.plist` with `keychain-access-groups` = `$(AppIdentifierPrefix)com.ixilabs.spixi` + `<CodesignEntitlements>` for `-maccatalyst` (a signed Mac build). | OW-L8-M |

### WATCH (compiles; the office walk looks)

| ID | file:line | Pl | What to look for | Walk row |
|---|---|---|---|---|
| W-1 | `Platforms/iOS/iOSWebViewHandler.cs` via `Spixi.csproj:597` | M | First Mac compile of the file (S9 target, after `b9528a91`). The anchor target `_MauiRemovePlatformCompileItems` exists in MAUI 10 (A1, A2 checked the SingleProject targets), so the file is compiled and `MauiProgram.cs:50-54` resolves. All APIs exist on Catalyst 15; `InputAssistantItem` availability not confirmed (at worst a CA1416 warning). New at RUN time on the Mac: the `[Export]` block-parameter delegate and the `WKContentView` swizzle. | OW-WEB-M |
| W-2 | `LaunchPage.xaml.cs:876-894` (S20G `excludeKeptFromBackup`) · `SLocalOnlyStore.cs:286` · `SingleChatPage.xaml.cs:2724-2737` | M | `Foundation.NSUrl.IsExcludedFromBackupKey` + `SetResource` — the same call compiled on iOS at `b9528a91` (`AppDelegate.cs:74`); first Mac use. Believed bound for Catalyst; the Mac ref pack is not in the cloud. **If the Mac build errors here: change the three guards to `#if IOS`** (the Mac only loses the Time Machine exclusion). | OW-B1 |
| W-3 | `Spixi/VoIP/VoiceClips.cs` (new) + iOS / Mac `SAudioRecorder` / `SAudioPlayer` | both | The voice-message lane never ran on Apple. Interface members match exactly on both TFMs (`startVoiceMessage(Action?)`, `startVoiceMessage(int, Action?)`, `setOnVoiceLevel(Action<int>?)`). iOS `UIBackgroundModes` has no `audio`: locking the phone stops a recording / playback (product decision, same as calls). | OW-VOICE |
| W-4 | `Platforms/MacCatalyst/SPlatformUtils.cs:47-79` | M | New Mac ringtone (`startRinging`, `callRings = true` → CallPage shows Silence). The comment at :120-124 ("never made a sound") is now stale. | OW-RING-M |
| W-5 | `Spixi/Utils/ThemeManager.cs:36-41, 65-100` | M | The window appearance override makes `RequestedTheme` report the app's pick; "System" after Light / Dark may first apply the old look. | OW-THEME-M |
| W-6 | `Pages/Home/HomePage.xaml.cs:718-745` | M | #1166 lever 7 (col-2 info-pane width animation) runs on the Mac for the first time. | OW-PANE-M |
| W-7 | `Pages/Chat/SingleChatPage.xaml.cs:3111-3123` | I | The Apple branch decodes each picked photo 3+ times (Android once). Correct, slower. | OW-PHOTOS-I |
| W-8 | `Platforms/iOS/SClipboardImage.cs:31-40` ← `SingleChatPage.xaml.cs:2918` | I | iOS 16+ "Allow Paste" prompt; Don't Allow shows the misleading "clipboard empty". | OW-PASTE |
| W-9 | `Platforms/MacCatalyst/SClipboardImage.cs:30-45` | M | An image FILE copied in Finder is a file URL, not image data → "clipboard empty". A clipboard screenshot works. | OW-PASTE |
| W-10 | `Platforms/MacCatalyst/SFileOperations.cs:35` (`GetVisibleViewController`, obsolete `KeyWindow`) | M | Mac Save may show nothing when no window is key; the log then has `savephoto r=fail`. | OW-SAVE |
| W-11 | `Platforms/iOS/SPushService.cs:429-438` | I | The foreground push fetch (+ the new `PushFetchProbe.begin()` / `afterPushBatch`) runs without `Node.pushFetchLock`; Android takes it with `Monitor.TryEnter` (`Android/SPushService.cs:745-775`). Two fetches can overlap. The unlocked fetch predates `b9528a91`. Code-read only, not walkable; follow-up item. | — |
| W-12 | `Platforms/MacCatalyst/Info.plist:10-11` | M | The camera usage text says "…and to take photos for chats"; the Mac has no camera capture. Copy only. | — |
| W-13 | iOS `SAudioPlayer.cs:20-21`, `SAudioRecorder.cs:20`, `SFilePicker.cs:220-309`, Mac `SSpixiPermissions.cs:191/203`, `SingleChatPage.xaml.cs:2728` (`out NSError err`) | both | Nullable / obsolete-API warnings only. Expected in the build output; not errors. | OW-B1 |

## 3 · Checked and clean (summary)

- **Interface conformance, both Apple TFMs:** `IAudioPlayer`, `IAudioRecorder` (all members added since `b9528a91`), `IAudioEncoderCallback` / `IAudioDecoderCallback`; `Interfaces/*` unchanged.
- **Static platform classes reached from shared code** — `SThumbnail` (`makeJpeg`, `makeViewerJpeg(string,int)`), `SClipboardImage` (`readAsync`, `TooBig`), `SFilePicker` (`PickImagesAsync`, `CapturePhotoAsync`, `PickImageAsync`, `PickFileAsync`, `ResizeImage`), `SPlatformUtils`, `SFileOperations.share`, `SPushService` (8-arg `showLocalNotification`), `SPushPrefsShare`, `SPowerManager`, `SSystemAlert`, `SSpixiPermissions`, `SSpixiCodecInfo`, `SMacCursor`: every member exists on iOS and Mac with matching signatures, or the call sits under a guard Apple does not compile (`CameraAvailable` under `ANDROID || IOS`; the 3-arg `makeViewerJpeg`, `describeBarSurfaces`, `lastBarState`, `appContext` under `ANDROID`; `saveAs` / `saveFile` under `ANDROID` / `WINDOWS`; `SPushPrefsShare` under `IOS`).
- **Apple-only regions in shared code:** every one resolves (usings, branch completeness, returns) — `SpixiContentPage`, `CallPage`, `App.xaml.cs`, `MauiProgram`, `SpixiLocalization`, `SLocalOnlyStore`, `SMoments`, `SNotificationPrefs`, `SRequestIgnore`, `WalletPassStore` (the `SetAsync(…, SecAccessible)` overload exists for `IOS || MACCATALYST`), `ContactNewPage`, `BackupPage`, `ThemeManager`, `Utils`, `P1Perf` (Release stubs present), `DevLogTail`, `DevPage`, `UIHelpers`, `SDevSeed`, `S16FixRules`, `ScanPage`, `SingleChatPage` (1654, 2724, 3097, 7788, 8989), `HomePage` (352, 718, 891), `LaunchPage` (876), `SettingsPage` (the unchanged `#if IOS` `SPushPrefsShare.clear()`).
- **No AppKit types** anywhere in the Mac folder; AppKit is reached through `objc_msgSend` (unchanged since `b9528a91`). No `Android.*` / `Java.*` / `Microsoft.UI.*` under a guard that includes Apple.
- **64 other shared files:** no preprocessor directives, no platform namespaces; the two platform calls (`SharedItems.cs:208`, `ViewerImage.cs:108` → `SThumbnail`) exist on both Apple TFMs. Many Rules files are also compiled by the C# harness (`scripts/csh/csh.csproj`).
- **S20G C# (first compile anywhere today):** `RestoreMoves` (`S20GRules`) and `SpixiFlags` are in the C# harness (CSH 463 green); `LaunchPage` / `SettingsPage` / `HomePage` / `DevPage` S20G lines resolve by reading.
- **Plists / entitlements:** iOS `Entitlements.plist` and `Entitlements.Release.plist` identical except `aps-environment`; camera + microphone usage keys present on both; the App Group key present.

## 4 · Residual risk

Reading is not compiling. The least certain points, in order: W-2 (`IsExcludedFromBackupKey` on Catalyst), W-1 (`InputAssistantItem` on Catalyst, warning at worst), the toolchain itself (the office Mac must have the same .NET 10 + MAUI + Xcode it used on 2026-10-01; run `dotnet workload list` if the build fails before compiling our code). If the build fails, paste the first error with file:line and the auditor note for that file applies.

## 5 · The Drop 1 patch

`session-v1am-drop1.patch` (on `2a469442`): this report · `docs/office-walk-sheet-v1.md` §16 · R-1 (`NSPhotoLibraryAddUsageDescription` in `Platforms/iOS/Info.plist` + `Platforms/MacCatalyst/Info.plist`). R-1 is NOT a compile error: the session prompt said "fix only clear compile errors". It is in the patch because the crash is certain on the first "Save Image" tap and the change is two plist keys with no code. Damir decides: keep it, or drop the two plist hunks (then OW-SAVE expects the crash).
