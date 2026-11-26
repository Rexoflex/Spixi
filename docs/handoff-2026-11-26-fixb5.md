# Handoff 2026-11-26 fixb5 — the page batch (WALK-READY; two questions for Damir)

Read this FIRST, then DECISIONS #1990–#2001. Number block of this session: #1990–#2009 (used: #1990–#2001; #2002–#2009 stay
empty) · lessons L303–L308 (all used) · packets P103–P105 (P106–P108 free). Prompt: project doc `claude/session-fixb5-prompt.md`
(Ready by Damir, 2026-11-25 22:41 / 22:46). Contract: `docs/contract-fixb5.md`. Review: `docs/review-brief-fixb5.md`. The main
chat gives the next block and writes the next prompt.

## 0 · State
- Branch: `work/fixb5` · base: `redesign/frontend` @ `0eda93f5` ("Merge pull request #28 from Rexoflex/work/walktools2"; it did not
  move while the session ran — checked again before the push) · push: made AFTER this commit, each commit read back through the
  GitHub API (#1546 (3)) · pull request: Damir opens it with the compare link
  `https://github.com/Rexoflex/Spixi/compare/redesign/frontend...work/fixb5?expand=1` (title and description in the status doc) ·
  merge = Damir (a merge commit, #1505).
- CI (`redesign-ci`): not run at the time of this commit — it runs on the pull request that Damir opens.
- Smoke: `BASELINE OK — 7094 / the 2 KNOWN (#136 · B3)` · environment: cloud twin + `../Ixian-Core` @ `097341a`, `npm ci` (jsdom
  29.1.1), `TZ=America/Los_Angeles`, .NET SDK 10.0.115 (Ubuntu `dotnet-sdk-10.0`) · delta +40 = `pins-fixb5/<a-chooser 5 | b-lock 5 |
  b-lock-keys 4 | c-slide4 6 | d-protect-keyboard 11 | e-small-fixes 4 | f-opus-managed 5>` · CSH `pass=919 fail=0` (= 908 + 11,
  `OpusManagedTests`). The base read `BASELINE OK 7054` and CSH 908 in this environment before any change.
- Checks: `build-shells --check` ✓ · `build-locales --check` ✓ · `cs-syntax-check` ✓ (291 files) · `pin-sweep --working` read · the FULL
  pipeline (extract-strings → build-locales → build-strings-iife → build-demo-bundle → build-shells) · Chromium by hand:
  `d-protect-keyboard-render.mjs` 72 rows 0 red, `pins-fixb4/c-keyboard-render.mjs` 106 rows 0 red.
- Review: CLEAN at r3 (MAJOR 3 → 0 → 0; #2000; brief § 5). The code files are committed exactly as the last readers (r3) read them (SHA-256, first 12: `HomePage.xaml.cs` dee508f25f91 · `SpixiContentPage.cs` a4c32ae3719a · `SpixiFlags.cs` 689e3eee8e19 · `OpusDecoder.cs` e8d32734d223 · `OpusEncoder.cs` eea018a179b5 · `launch.html` 65f4fc2c0158 · `lock.html` 8ed8aee210a2 · `contacts-page.js` 2ae042de0684 · `launch-form.css` febe00529baf · `launch-shell.js` 45adde35973b).
- ⚠ C# UNCOMPILED: `Spixi/Pages/Home/HomePage.xaml.cs`, `Spixi/Utils/SpixiContentPage.cs`, `Spixi/Utils/SpixiFlags.cs`,
  `Spixi/VoIP/OpusDecoder.cs`, `Spixi/VoIP/OpusEncoder.cs` (the Windows job of `redesign-ci` compiles them first; the two wrappers and
  the switch block run in CSH over a model of Concentus).
- Definition of done: `docs/release-readiness.md` WK-FIXB5 (new, OPEN: the walk is owed).
- Size (R1, R3; the inventory's counter, Pygments): app C# code lines 64,368 → 64,412 (**+44**, budget +80) · comment lines 21,723 →
  21,730 (+7) · switches 39 → 41 · files over 1,500 lines 10 → 10 (`HomePage.xaml.cs` +2 lines, the decline's two calls) ·
  hand-written `src/**` (the five changed files, Pygments web lexers) 2,310 → 2,363 code lines (**+53**, budget +300; comment lines +19) · locale tables: `slide4Title3` added, `slide4Title2` removed (14).
- Still owed: the walk (Windows + Android); the first compile; the two questions (§ 4); the items of § 5.

## 1 · What this session did
| Item | Result | Evidence | MC |
|---|---|---|---|
| 1 password step + keyboard | built: compact step while the keyboard is up (picture and progress bar hidden, title 20 px, fields 52 px, the nav-bar pad kept), both fields + the button above the keyboard, the state holds while a button / eye is tapped, Next / Enter → the second field | #1990; `pins-fixb5/d-protect-keyboard` + the render | `n-20261123-protect-account-both-fields-visible` |
| 2 slide 4 title | built: `slide4Title3` "Play together." in 14 tables | #1991; `c-slide4` | `n-20261123-slide4-title-play-plan` |
| 3 first notice | STOPPED before any build (a question) | #1992; contract § 7 | `n-20261123-first-notice-lock-pay-on` |
| 4 chooser | built (#1877) | #1993; `a-chooser` | (#1877) |
| 5 lock guard | built; P105 | #1994; `b-lock` | `n-20261123-lock-preboot-guard` |
| 6 Opus line | built; switch `OpusManagedOnly`; P103 | #1995; `f-opus-managed`, CSH `OpusManagedTests`, the scratch proof (P103) | `n-20261123-concentus-native-opus-check` |
| 7 three small fixes | two built (the decline, the log line; switch `DeclineClears`; P104); three sites owed (a question) | #1996; `e-small-fixes` | `n-20261125-three-small-fixes` |
| 8 lock text key | built: the key was the comment's `*SL{…}` | #1997; `b-lock-keys` | `n-20261125-lock-page-unknown-l10n-key` |
| 9 docs | the main chat's rows #1839–#1844, #1960–#1964 word for word; index lines; `walk-launch.md` | #1998 | — |
Re-based pins (each read after the change): `pins-fixb1/g-sparekeep` (the SpixiFlags.cs hash), `pins-lockb/b-csharp` (b7 cuts the new
block), `pins-lockb/a-shell` (header text of break b11 only), `pins-photo1a/b-store` (b1: the decline calls `deleteChat`),
`pins-s20f/l-slides` (the slide-4 key), `pins-on1/ring-geometry.json` (hashed inputs; the geometry equal),
`pins-fixb4/c-keyboard-render.mjs` (by hand; the keyboard top = innerHeight − 48; the compact rows).

## 2 · Walk
Sheet `docs/walk-fixb5.md` = the Artifact "Spixi fixb5 — walk rows" (https://claude.ai/artifact/35DrKKNoVhqFhXQ3Nn7xTF). Windows W-BUILD, W-1 … W-4, W-9;
Android A-BUILD, A-1 … A-6 (A-3 / A-4 on an emulator or a spare phone; A-6 optional); I-1 owed to the Apple phase. Result: owed.

## 3 · Proposed next steps (the main chat decides)
1. Damir opens the pull request; the main chat reads `redesign-ci` (the Windows compile is the first compile of the five C# files).
2. The walk of `docs/walk-fixb5.md`.
3. The two questions of § 4; the owed docs lines (#1839 (2), the head of `docs/orchestration.md`) in the next docs batch.

## 4 · Open questions and dials
| For | Question (with its options) | Blocks |
|---|---|---|
| Damir | **Q-1 (#1992) the first notice:** (a) recommended — its own small batch that owns the home page and `SMoments` (a new moment id on the existing `ixian:moment` verb and pushes; once per account; its own switch; the look of the `pay` sheet) · (b) in the welcome page before Create / Restore is sent (no C#; before the account exists; again after a failed restore) · (c) no sheet | the item |
| Damir | **Q-2 (#1996) the three owed sites of #1963 (5):** (a) recommended — a follow-up item after `quotebox` merges: one line `SContacts.scheduleSentSweep()` after `SPeerLocalStores.forget` at `SingleChatPage.xaml.cs:1076` (the undo), `ContactNewPage.xaml.cs:229` and `SpixiContentPage.cs:7702` (the re-adds), behind one new switch, + the `LEGACY_G3` entry removed · (b) record only | the item |
| Damir | 🟡 #1990: item 1 also hides the progress bar and makes the fields 52 px while the keyboard is up (needed at 360 × 640 with a 3-button bar); overrule if not wanted | nothing |

## 5 · Recorded, not changed
- Gate 18's `LEGACY_G3` still lists `SpixiContentPage.cs :: sendContactRequest: invalid address payload:` (`scripts/smoke-test.mjs` ~32033;
  outside the one registration block); pin e3 holds the fixed line. Owed: remove the entry.
- `docs/security-review-for-be-engineer.md` (Voice fix addendum, ~:1009) still calls the Opus line "not made by us" (outside the file
  areas). Owed: a short fixb5 addendum (P103, P104).
- `scripts/voicefix/VoiceFixProbe.csproj` (dev tool, not in CI) no longer compiles: it links `Spixi/VoIP/OpusDecoder.cs`, which now
  names `SmallFixFlags`. Direction: a probe-only stub `namespace SPIXI { internal static class SmallFixFlags { public static bool
  OpusManagedOnly => true; } }` and its `<Compile Include>`.
- The GATE 54 (a4) comment of `scripts/smoke-test.mjs` (~34499–34505) still says `contacts-page.js:295` has no identity check (stale
  since #1993).
- NIT W-n2: a held hardware Enter on the first password field moves to the confirm field, whose existing Enter submits what the user
  typed twice (direction: `&& !e.repeat` at `launch-shell.js:1482` / `:1419`). NIT Z-n1: no pin row for the `!resizeModel` guard of
  the iPhone reveal.
- `docs/walk-launch.md` LW-DEF-W3 is marked from WALK #1840 sitting 3 (Damir's word; no log line read).
- The 13 translations of slide 4 were not read by a native speaker.

## 6 · Lessons
L303–L308 (`docs/lessons.md`).

## 7 · Repo commands for Damir (PowerShell, one line at a time)
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git status -sb
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/fixb5
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull --ff-only
```
- Windows: wipe `Spixi\obj` + `Spixi\bin` (C# and html changed), then **Ctrl+F5** in Visual Studio (#1844 (1)), never `dotnet build`.
- Android: wipe `Spixi\obj` + `Spixi\bin`, then the dev Release build and `adb -d install -r …` (the lines in the walk sheet).
- Normal path (#1546): the session pushed `work/fixb5`; Damir opens the compare link of § 0, checks "base repository:
  Rexoflex/Spixi · base: redesign/frontend" and clicks "Create pull request" with the pasted title and description.
