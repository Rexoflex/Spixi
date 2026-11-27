# Handoff 2026-11-27 macfixa — Mac blockers part A (WALK-READY; one dial for Damir)

Read this FIRST, then DECISIONS #2080–#2088. Number block of this session: #2080–#2099 (used: #2080–#2088; #2089–#2099 stay
empty) · lessons L331–L336 (used: L331–L334) · packets P121–P126 (used: P121, P122). Prompt: project doc
`claude/session-macfixa-prompt.md` (Ready by Damir, 2026-11-26 23:51, #1970). Contract: `docs/contract-macfixa.md`. Mechanisms:
`docs/macfixa-mechanisms.md`. Review: `docs/review-brief-macfixa.md`. By #1971 the branch rides the merge train `train1` (one
combined pull request); the main chat writes the next prompt.

## 0 · State
- Branch: `work/macfixa` · base: `redesign/frontend` @ `ae7b8303` ("Merge pull request #29 from Rexoflex/work/fixb5"; it did not
  move while the session ran — checked again before the push) · push: made AFTER this commit, each commit read back through the
  GitHub API (#1546 (3)) · pull request: by #1971 the train `train1` merges this branch into `work/train1`; its own compare link
  `https://github.com/Rexoflex/Spixi/compare/redesign/frontend...work/macfixa?expand=1` stays valid if Damir wants it alone.
- CI (`redesign-ci`): not run at the time of this commit (it runs on the train's pull request).
- Smoke: `BASELINE OK — 7133 / the 2 KNOWN (#136 · B3)` · environment: cloud twin + `../Ixian-Core` @ `097341a`, `npm ci`
  (jsdom 29.1.1), `TZ=America/Los_Angeles`, .NET SDK 10.0.115 · delta 39 = `pins-macfixa/<a-mac-save 9 | b-icon 8 | c-swipe 6 |
  d-rail 12 | e-addr-fit 4>` · CSH `pass=946 fail=0` (= 919 + 27: `MacfixaFlagsTests` 7, `MacSaveTests` 7, `AppIconTests` 13). The base
  read `BASELINE OK 7094` and CSH 919 in this environment before any change.
- Checks: `build-shells --check` ✓ · `build-locales --check` ✓ · `cs-syntax-check` ✓ (294 files) · the size counter and checks of
  `work/sizerule` (scripts not on the base; run from a scratch copy): R2 0 markers · R5 0 · R6 0 → PASS · Chromium by hand:
  `c-swipe-touch.mjs` (default slop and `--slop 8`), `e-addr-fit-render.mjs` (55 rows green), `b-icon-popin.mjs`.
- Review: CLEAN at r5 (MAJOR 3 → 0 → 0 → 0 → 0; `docs/review-brief-macfixa.md` § 5; a Claude Fable 5.2 security-only reader and a Claude Opus reader every round, all fresh and read-only). The code and pin files are committed exactly as the round-5 readers read them (SHA-256 in the brief § 5).
- ⚠ C# UNCOMPILED: `Spixi/Platforms/MacCatalyst/SFileOperations.cs` (Mac only; the Apple compile job of `applecc` is the first
  compile), `Spixi/Utils/AppIconReencode.cs` (Android, iOS / Mac branches; Windows in `redesign-ci`), `Spixi/Pages/Home/HomePage.xaml.cs`,
  `Spixi/Utils/SpixiFlags.cs`, `Spixi/Utils/AppIconRules.cs`, `Spixi/Utils/MacSaveRules.cs` (the last two and the flag block run in CSH).
- Definition of done: `docs/release-readiness.md` WK-MACFIXA (new, OPEN: the walk is owed).
- Size (R1, R3; the sizerule counter, base `ae7b8303`): app C# code lines 64,412 → 64,704 (**+292**, cap +300) · comment lines +62 ·
  switches 44 → 47 (+3) · files over 1,500 lines 10 → 10 (`HomePage.xaml.cs` 7,323 → 7,323: three lines edited in place) ·
  hand-written `src/**` **+19** code lines (cap +150), +13 comment lines · locale tables: 2 C# keys × 14.
- Still owed: the walk (Windows + Android in the train walk; the Mac rows and I-1 / I-2 in the Apple walk); the first compile;
  the dial #2085; the items of #2087.

## 1 · What this session did
| Item | Result | Evidence | MC |
|---|---|---|---|
| 1 Mac save (LAUNCH BLOCKER) | built: a native "Choose Action" (Save File = the system save panel, a copy · Add to Photos for photo types, add-only · Share File · Cancel); every presentation ends (a 2-poll close check); switch `MacSaveToFolder`; P121 | #2080; `a-mac-save`, csh `MacSaveTests` | `n-20261015-mac-save` |
| 2 Icon re-encode | built: ≤ 192 px PNG copies under `html/Apps/_icons`, made once on the pool, never inside `loadApps`; an icons-only re-push; switch `AppIconReencode`; P122. The pop-in is shortened, NOT removed (`loading = 'lazy'`, owed) | #2081; `b-icon`, csh `AppIconTests`, `b-icon-popin.mjs` | `n-20261016-miniapp-icon-reencode` |
| 3 Swipe first tap | built: the mechanism (an invisible fling) shown in Chromium; a sideways-locked swipe cancels its touchmoves, decided by distance; switch `SwipeTouchLock` (cap) | #2082; `c-swipe`, `c-swipe-touch.mjs` | `n-20261015-swipe-first-tap-lost` |
| 4 Mac rail at start | built: a pane flag stranded by a quit is cleared by the first home document of a new WebView (no switch) | #2083; `d-rail` | `n-20261015-mac-rail-start` |
| 5 Address card | built: the desktop dialog fits or scrolls with its foot reachable (CSS; no switch); no Share on the desktop by design | #2084; `e-addr-fit`, `e-addr-fit-render.mjs` | `n-20261015-mac-address-card-fit` |
| 6 Chip overflow | STOPPED with the dial (nothing built): the Artifact "Spixi — Chats filter chips in long languages (dial)" | #2085 | `n-20261016-chip-overflow` |
Re-based pins (each read after the change): `pins-fixb1/g-sparekeep` (the SpixiFlags.cs hash), `pins-s11/a-cs` and `pins-s12/a-cs`
(the setCaps regex), `pins-v1am/c-csharp` (the setCaps expression, 32 states), `pins-s11/f-wiring` (the reload test may read
`AppIconReencode.tookReady() ||`), `pins-fixb2/e-sheet-height` (the address dialog's cap held exactly), the INLINE CH4 row of
`scripts/smoke-test.mjs` (~16084), `INDEX_KB_CEIL` 670 → 672.

## 2 · Walk
Sheet `docs/walk-macfixa.md` = the Artifact "Spixi macfixa — walk rows" (https://claude.ai/artifact/CobspydbSctYkPnFm3xWwH). Windows W-BUILD, W-1 … W-3, W-9 (Ctrl+F5);
Android A-BUILD, A-1 … A-5; the Apple walk: M-BUILD, M-1 … M-7, I-1, I-2. By #1971 the train `train1` copies these rows into
`docs/walk-train1.md`. Result: owed.

## 3 · Proposed next steps (the main chat decides)
1. The train `train1` takes `work/macfixa`; `redesign-ci` on the train is the first Windows compile of the icon code.
2. The Apple compile (`applecc`) is the first compile of `SFileOperations.cs` and the Apple branch of `AppIconReencode.cs`.
3. Damir's dial #2085 (the chips); then a small build batch for the chosen option.
4. #2087 ①: `loading = 'eager'` for the Apps grid (one src line) — the measured rest of the Apps pop-in.

## 4 · Open questions and dials
| For | Question (with its options) | Blocks |
|---|---|---|
| Damir | **Dial (#2085) the Chats filter chips in long languages:** A edge fade + sideways scroll (recommended) · B wrap to two lines · C a "More" chip with a menu · D something else; rider for A: a "›" button on desktop hover. Renders: https://claude.ai/artifact/JjDhZf6Qc2Vz4jMtWmvsJQ | the item |
| Damir | 🟡 #2080: one chooser for Back up / Save / the log (Save first) instead of the save panel at once for the backup; overrule if not wanted | nothing |
| Damir | 🟡 #2084: the 16 px margin and a 185 px QR in windows about 640–700 px tall | nothing |

## 5 · Recorded, not changed
All in DECISIONS #2087 (each with its direction): ① `loading = 'lazy'` of the Apps icons (the rest of the pop-in) · ② the other
raw-icon users (`AppDetailsPage.xaml.cs:196`, `SingleChatPage.xaml.cs:5438`, `:7115`) · ③ the Mac backup's outcome (`share` returns
none: BackupPage still asks) · ④ the Mac Store entitlements · ⑤ the stale "STATED RESIDUAL" comment of `settings.html:316-322` · ⑥ the
S17-AD-CARD walk text promising Share on the Mac · ⑦ the desktop scrollbar thumb on Catalyst · ⑧ the F5-5/C-1 inline row reads
`width` only · ⑨–⑳ the #46 rounds' recorded MINOR / NIT findings (the Photos failure text, EXIF orientation on Apple only, the
first-start pool tasks on one lock, a mark written after the wipe, stacked Mac choosers and one held panel, the log words, the static
`taken`, the diagonal tap drift ⑯, a second icons-only re-push, Android's colour profile, the peer card's QR, ColorSync / ToImage) ·
㉑–㉓ round 5 (a local can hide `openPanel` from pin a5, the a5 message, the name `waitWhenShown`). Also: the peer (contact) address
card's QR shrinks earlier than needed (#2084); a swipe-lock WebView slop under 8 CSS px is not covered (#2082).

## 6 · Lessons
L331–L334 (`docs/lessons.md`).

## 7 · Repo commands for Damir (PowerShell, one line at a time)
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git status -sb
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/macfixa
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull --ff-only
```
- Windows: wipe `Spixi\obj` + `Spixi\bin` (C# and html changed), then **Ctrl+F5** in Visual Studio (#1844 (1)), never `dotnet build`.
- Android: wipe `Spixi\obj` + `Spixi\bin`, then the dev Release build and `adb -d install -r …` (the lines in the walk sheet).
- By #1971 the normal path is the train's ONE pull request (`work/train1`); this branch alone: the compare link of § 0.
