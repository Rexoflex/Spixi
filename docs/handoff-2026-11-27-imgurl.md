# Handoff 2026-11-27 imgurl — chat pictures by a local link from C#, the Android trim hook (the core, after #1972)

Read this FIRST, then DECISIONS #2035–#2057. Number block of this session: #2035–#2059 (used: #2035–#2057) · lessons
L319–L326 (all used) · packets P113–P120 (used P113–P115; P116 / P117 were written and REMOVED with items 3 / 4, #1972;
P118–P120 free). Prompt: project doc `claude/session-imgurl-prompt.md`; the permit for round 6: `claude/session-imgurl-round6.md`
(ruling #1972). Contract: `docs/contract-imgurl.md`. Review: `docs/review-brief-imgurl.md` (§ 5 the round-5 stop, § 6 round 6,
§ 7 round 6's verdict, § 8 the permitted passes after it).

## 0 · State
- **WALK-READY (#2057): pushed as `work/imgurl`** after round 6 (code 0 MAJOR; 4 doc MAJOR corrected), the R6 move of #2055
  (`convertToBot()` moved whole to the new partial `SingleChatPage.Bot.cs`; the pins `pins-imgurl/b-page` b8 and
  `pins-histcs/a-path` a7 re-based; its Fable 5.2 reader 0 MAJOR), and two doc-only passes (#2056: 1 MAJOR, corrected; #2057:
  0 MAJOR, 5 MINOR + 5 NIT, all DOC, corrected after the last pass for `docsb3` to check). Earlier saved trees:
  `imgurl-tree.diff` (round 5, items 3 / 4 inside), `imgurl-core-tree.diff` (round 6, before the move), `imgurl-final-tree.diff`
  (after the move) — the branch replaces them.
- Base: `redesign/frontend` @ `ae7b8303` ("Merge pull request #29 from Rexoflex/work/fixb5"); it did not move.
- Smoke (cloud twin, `npm ci`, jsdom 29.1.1, `TZ=America/Los_Angeles`, .NET SDK 10.0.115, `../Ixian-Core` @ `097341a`):
  on the final tree (the commits of `work/imgurl`): `BASELINE OK — 7156 pass / the 2 KNOWN (#136 · B3)` (= 7094 + 62: `pins-imgurl/<a-handler 30 · b-page 11 · c-shell 15 · d-life 6>`) · the base read `BASELINE OK 7094` · CSH `pass=970 fail=0` (= 919 + 51: MediaGrantsTests 33, MediaPushTests 9,
  LifeTests 6, ImgurlFlagsTests 3).
- Checks: `build-shells --check` ✓ · `build-locales --check` ✓ · `cs-syntax-check` ✓ (298 files, with `SingleChatPage.Bot.cs`).
- ⚠ C# UNCOMPILED: the Android, iPhone and Mac files of the batch; Windows: `redesign-ci` on the pull request.
- Size (the size check of `origin/work/train1`, #2055): app C# 64,412 → 64,911 (**+499** after the R6 move; +493 before it; budget +700) · `src/**` +62 (budget +250). R2, R5, R6 pass.

## 1 · What is in the batch
| Item | Result | Evidence |
|---|---|---|
| 1a media handler (P-25) | grants per WebView / document / kind / id / px, 128-bit tokens, `no-store`, a miss = 404 and never the network (Windows: no environment → no response, recorded), no server for a mini app; Android / Windows / iOS / Mac paths | #2035; P113; `pins-imgurl/a-handler` (30); csh `MediaGrantsTests` (33) |
| 1b chat page call sites | the viewer first, then thumbs; cap words `mediaOrigin`, `mediaKeep` | #2036, #2037; `b-page` (11); csh `MediaPushTests` (9) |
| 1c shell + keeper | one grammar, one predicate, `<img src>` only; the keeper (≤ 64 per document) | #2038; P114; `c-shell` (15); the lab #2048 |
| 2 P-14 trim hook | `OnTrimMemory` (base first) drops the spare / the parked page at 40 / ≥ 60 | #2039; P115; `d-life` (6, d6 = nothing of items 3 / 4 is left); csh `LifeTests` (6) |
| switches | `ImgurlFlags`: `MediaOrigin`, `MediaKeep`, `TrimHook` (absent = ON, a stored 0 acts only in dev mode) | #2042; csh `ImgurlFlagsTests` (3) |
| R6 move | `convertToBot()` moved whole to the new partial `Spixi/Pages/Chat/SingleChatPage.Bot.cs` (the page 10,698 → 10,685 lines by `wc -l`); pins `b-page` b8 and `histcs/a-path` a7 re-based | #2055 |
| REMOVED | item 3 (renderer death), item 4 (Windows page store): code, switches, pins, tests, packets, gate and walk rows | #1972; #2051 |
Re-bases of other batches' pins: #2047 (+ #2051 for the values after the removal).

## 2 · Walk
`docs/walk-imgurl.md` and the Artifact "Spixi imgurl — walk rows" (published when the batch is delivered). The before-number is taken on the BASE build
(`ae7b8303`) after the dev seed is made again (no door sets the switches OFF on a Release build; OFF = the base path,
#2052); the after-number on this build; the viewer row by hand (the adb `viewer` step fails on the phone). A number counts
only with `read rows` > 0 and `media thumbs` > 0.

## 3 · For winstore (item 4, its own batch, option (a) of #1972)
What was built here and removed (the diff `imgurl-tree.diff`, SHA-256 `a20bce14…95e3`, holds it whole):
- `WindowsWebViewHandler.CreatePlatformView` → `WebViewStoreFolder.ensure()` BEFORE the base creates the control, once per
  process: `WEBVIEW2_USER_DATA_FOLDER` = `%LOCALAPPDATA%\Spixi\WebView2\<id>`; `[WVSTORE] folder=new|old`, `failed (<Type>)`.
  The variable must be set before the FIRST WebView2 of the process (the environment is fixed then).
- `SFileOperations.open` removed the variable around its `Process.Start` (ShellExecute) and set it back in `finally` — a
  started app must not inherit it (a WebView2-hosting handler would join Spixi's profile or fail).
- Switch `WinStoreFolder` (`flagWinStoreFolder`), pins `d-life` d4 / d5 / d11, csh `WebViewStoreRules` tests, packet P117.
What the reviews found (the batch must answer each):
1. **r5 MAJOR (S5 M1): the id must follow the ACCOUNT, not the data-folder PATH.** Here `<id>` = the first 8 hex of SHA-256
   of the lower-cased full path of `Config.spixiUserFolder` (Documents\Spixi, or `dataFolderPath` of `ixian.cfg`). A user
   whose Documents path changes (OneDrive folder backup, a renamed profile, a redirected Documents, an edited or relative
   `dataFolderPath`) got a new EMPTY store; the old store kept drafts (`spixi.draft.<address>`), pins, likes, hidden
   requests and mention marks, out of reach of "Delete all data" and of the launch sweep. Ruling #1972: option (a) — a
   random id in a C#-named file inside the data folder.
2. **r4 MINOR (S4): "Delete all data" reaches only the store it runs in.** An older store (beside `Spixi.exe` from an
   earlier build, or a run where `ensure()` failed) keeps its keys. Answer in the same batch: delete the old store after the
   first good start (C# names the path: `AppContext.BaseDirectory` + `Spixi.exe.WebView2`; its own switch), or delete both
   in the wipe. The wipe's comment in `SettingsPage.xaml.cs` (~1752, "Windows … no platform file overrides the data store")
   must change in the same commit; `pins-defaultsb` d8 holds that file byte for byte (re-base it with a note).
3. **r1–r3 (S-2, S2-m1, S3-2): an app that Spixi starts may inherit the variable.** Wrapped: `SFileOperations.open` only.
   Not wrapped, not proven: `Utils.openExternal` (MAUI `Browser` / `Launcher`, WinRT activation) and an external-scheme link
   (`mailto:` …) that the WebView2 runtime hands to the shell (`LaunchingExternalUriScheme`). A walk row with Process
   Explorer › Environment proves it; it blocks the handover until it passes. Better: an explicit `CoreWebView2Environment`
   with a user data folder (no process variable at all) — check the MAUI handler's creation path first.
4. **The remote-media gate (S5 m1; Mission Control item, status "Check"):** `mediaAutoloadOn()` (chat.html) reads
   `spixi.media.autoload` from the page store, and an absent key reads as ON; C#'s mirror (`SAutoDownload.loadPictures`)
   never seeds it. Every route that gives an empty store (the first start of winstore, a failed `ensure()`, a moved data
   folder) loads tenor / giphy media without a tap for an account that set it Off. With item 4 removed THIS batch adds no
   such route (the store is beside `Spixi.exe` again; the base's `Spixi\bin` wipe is the legacy route). Answer before
   winstore ships: seed the shell's gate from C# (a cap word on `setCaps`, a BE ask) or carry the key across.
5. Pump window (r2 S2-n1): ShellExecuteEx may pump messages; a WebView2 made then would use the default store.
6. A user's own pre-set `WEBVIEW2_USER_DATA_FOLDER` is overwritten (r2 S2-n3): state it.

## 4 · For the renderer-death design (item 3, a new design later, option (b) of #1972)
What was built and removed: Android `SpixiWebViewClient.OnRenderProcessGone` → `RendererGoneAndroid.handle` (remove and
destroy the dead views, answer `true`, ONE rebuild of the Home root); Windows `CoreWebView2.ProcessFailed` → the page's own
`reload()` or the Home rebuild; iOS / Mac `webViewWebContentProcessDidTerminate:` → the page's reload; a pure
`RendererGoneRules` (decide per kind, a storm bound of 3 admitted actions per 60 s, one pending rebuild); `SpixiContentPage`
`lifeGone` / `lifeRebuild` / `lifeFind` / `lifeReload`; a dev crash door (`am send-trim-memory … RUNNING_MODERATE` →
`chrome://crash`). The diff `imgurl-tree.diff` holds it whole. What rounds 1–3 found — each a new class of silent fault (rule
9 stopped it after r3):
1. r1 P-M1: a second death within the burst of the first, after the rebuild, destroyed the NEW views with no rebuild (a
   blank app). r1 P-m1: a rebuild that throws or runs while the Android activity is stopped (the `kill` kind comes in the
   background) leaves a blank app → rebuild only in the foreground, a throw → end the process. r1 P-m2: Windows
   `RenderProcessUnresponsive` (hang) reloaded at once and lost state → base. r1 P-m3: the rebuild never disposed the old
   root stack (Windows controls never closed).
2. r2 S2-M1: iOS — exporting the selector at all turns WebKit's own reload OFF (WebKit reloads a view by itself only when the
   navigation delegate does not implement the callback); an OFF switch must make the delegate NOT answer it
   (`RespondsToSelector`). r2 PC2-M1: the gates of `lifeGone` (Home root, app lock, foreground) need a behaviour pin, not
   only a source pin. r2 m: every kind was admitted by the storm guard before `decide`; Windows `BrowserProcessExited`
   reaches each control as a separate dispatcher message (a late event of an old control opened a new burst).
3. r3 PC3-M1: the bound was SHARED by every WebView: on iPhone / Mac a fourth death in a minute left a BLANK view where
   WebKit's own reload would have run. Lesson L324: a refusal of the handler must fall back to the platform's BASE
   behaviour, never to "nothing".
Design hints for the new batch: a per-view bound; on Apple keep WebKit's own reload as the base and only add state restore;
behaviour tests of the gates in Chromium / csh, not source pins; a dev door behind Developer mode with its own pin.

## 5 · Open questions
| For | Question | Blocks |
|---|---|---|
| BE | P113 / P114 / P115; the new push values + cap words (B-35) | handover |
| Damir | the walk numbers: is the after-number lower by a margin you accept (the P-25 item's "done when") | the item |

## 6 · Lessons
L319–L326 in `docs/lessons.md` (L323, L324 are lessons for `winstore` and the renderer-death design).
