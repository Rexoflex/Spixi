# F5 checklist — Session AC (2026-09-22): the startup lever · the landscape round · the iOS extension written · route B prepared

Walked 2026-09-23: **17 P · 2 F · 1 N/A** (#924) → re-walked 19 P; AC.1/AC.2/AC.3 numbers recorded in **#925** (⚠ Release logcat tag is `DOTNET`, not `mono-stdout`: `adb logcat | Select-String STARTDIAG`) — the two fails (AC.7/AC.8, one cause: the top inset was not pushed on rotation) are fixed; **re-walk AC.7 and AC.8 on Android after a redeploy**, then commit.

Rows: DECISIONS **#916** (Damir's addendum, folded in — BSD-2-Clause, not MIT) · **#917** (the flag probe
off the phone's boot path, measured twice) · **#918** (AND-31/32/33/34, rendered first) · **#919** (the iOS
push extension, uncompiled, the by-sender mute stated as a dial) · **#920** (route B: the vendored Catalyst
wrapper + README) · **#921** (the loop: three Opus reviewers, ten findings, all fixed; the r2 over the fixes ran CLEAN, 0 MAJOR / 5 MINOR fixed) · **#923** (a PHONE IS ONE PANE in every posture — `HomePage.xaml.cs` `isPhoneDisplay()`; before, a landscape phone split into two panes) · **#922** (the Android LANDSCAPE RAIL — Damir's "yes": bar → 72 px left rail on rotation, driven by a DEVICE flag because a landscape phone is two-pane and the home shell's viewport reads portrait; side insets published; rendered `docs/sheets/session-ac/rail-*`).
**Walk sheet: `docs/walk-artifact-session-ac.html`** — 23 rows, P/F/N + notes, Copy results at the top.
**Office sheet: `docs/walk-artifact-ios-office.html`** — 31 rows for the iPhone day (read it BEFORE the office).
Renders + numbers: `docs/sheets/session-ac/` (`perf-ab-load.txt` is the honest startup number).

★ **C# CHANGED, AND NOTHING HERE COMPILES ANY OF IT.**
`SNotificationPrefs.cs` · `App.xaml.cs` · `SettingsPage.xaml.cs` (`#if IOS` blocks — no-ops on Windows/Android) ·
`Platforms/iOS/SPushPrefsShare.cs` (NEW, iOS only) · `Spixi.csproj` (extension reference LIVE for ios; the
maccatalyst RocksDB exclusion, `AllowUnsafeBlocks`, `Compile Remove` of `Platforms/MacCatalyst/**` on every other
TFM) · `Spixi-PushService/` (NEW project: `NotificationService.cs`, `SpixiPushGate.cs`, csproj, Info.plist,
Entitlements.plist) · `Platforms/iOS/Info.plist` + `Entitlements.plist` (App Group + OneSignal key) ·
`Platforms/MacCatalyst/RocksDbSharp/**` (43 vendored files, maccatalyst only) · **#922 (ANDROID paths — YOUR Android build is their first compile):** `Lang/SpixiLocalization.cs` (three seeded carriers + `PLATFORM_NAME`), `Platforms/Android/MainActivity.cs` (`publishSideInsets` from the insets listener), `Utils/UIHelpers.cs` (`pushSideInsetsToAllPages`) · **#924 (Android; the walk's AC.7/AC.8 fix):** `Platforms/Android/MainActivity.cs` + `MainApplication.cs` (the top inset pushed LIVE on change), `Utils/UIHelpers.cs` (`pushTopInsetToAllPages`, inside the Android fence), `Utils/SpixiContentPage.cs` (a comment) · **#923 (ALL platforms — Windows F5 AND Android compile it):** `Pages/Home/HomePage.xaml.cs` (`isPhoneDisplay()` in the pane branch — a desktop window must still split at 700 dp; a phone must not split at any width). **Windows F5 (never `dotnet
build`, #663) and Android compile NONE of the iOS/Catalyst code** — a green build here proves the fences hold, nothing
more. The first iOS build at the office is the first compile of #919; the first Catalyst build (optional, last)
is the first compile of #920. A build error there is this session's bug — paste it whole.

Everything below RAN in the container: bundle · 18 shells · the four `--check` gates · `cs-syntax-check` **183
clean + 3 known grammar gaps** (roots derived from every `*.csproj` folder) · the FULL suite on snapshot copies.

**Suite, controlled BEFORE/AFTER in one environment** (container, WITH the `Ixian-Core` sibling):

| | result |
|---|---|
| BEFORE (pristine snapshot of `bef1be21` + `020ba24a`) | `BASELINE OK — 4774 pass / the 2 KNOWN` |
| AFTER (this batch) | `BASELINE OK — 4811 pass / the 2 KNOWN (+37)` |

Compare the DELTA in your environment, never the absolute (#895).

## 1 · Build

```
node scripts/build-demo-bundle.mjs && node scripts/build-shells.mjs && node scripts/smoke-test.mjs
```
then wipe `obj`/`bin` (csproj changed) → F5 Windows → Android Debug deploy. Expect the local suite at
4774 + the AFTER delta. `git add` the NEW files (handoff §7 lists them; `git add src/components/landscape-runtime.js Spixi-PushService
Spixi/Platforms/MacCatalyst Spixi/Platforms/iOS/SPushPrefsShare.cs docs/sheets/session-ac docs/handoff-2026-09-22b.md
docs/f5-checklist-session-ac.md docs/walk-artifact-session-ac.html docs/walk-artifact-ios-office.html
docs/commit-message-session-ac.txt .gitattributes` — never `git add -A`).

## 2 · The walk — `docs/walk-artifact-session-ac.html`

§0 build · §1 startup (AC.1–AC.5: the three numbers, and the flag deferral changed nothing visible) ·
§2 landscape (AC.6–AC.13 + AC.16–AC.18; ★ AC.11 and AC.18 are dials; ★ AC.19–AC.22 = the landscape RAIL: rotate on Chats (★ AC.19 = ONE pane in landscape, #923), tabs + a sublevel on the rail, portrait-with-keyboard keeps the bar, a 3-button/cutout device clears its edges) · §3 records (AC.14–AC.15).

## 3 · Then

The four portal steps (#915) → the office iPhone day with the office sheet → the endgame (#916).
