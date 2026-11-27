# Review brief — macfixa, Mac blockers part A (DECISIONS #2080–#2099)

Work order for the #46 adversarial loop (`docs/process.md`). Written BEFORE round 1. The verdict goes into § 5 when the
loop closes (#660). Prompt: project doc `claude/session-macfixa-prompt.md`; contract: `docs/contract-macfixa.md`;
mechanisms: `docs/macfixa-mechanisms.md`.

## 1 · What the batch is
| Item | What landed | Where (files) | Switch / packet |
|---|---|---|---|
| 1 Mac save (LAUNCH BLOCKER) | On Mac Catalyst `SFileOperations.share(path, title)` shows a native choice (every presentation through `show()`: a 2-poll close check; the save panel is not polled: it ends only by its delegate): Save File (the system save panel, `UIDocumentPickerViewController(NSUrl[], asCopy: true)`), Add to Photos (photo types by the leaf of C#'s path — for a received photo the peer's name after `SafeFileName`; `PHAccessLevel.AddOnly`; `PHAssetChangeRequest.FromImage(fileUrl)`), Share File (the old menu; a photo as the URL alone), Cancel; the Task ends when the choice is finished. OFF = the base body (`shareMenu`). Two new C# string keys in the 14 tables | `Spixi/Platforms/MacCatalyst/SFileOperations.cs`, `Spixi/Utils/MacSaveRules.cs`, `Spixi/Resources/Raw/lang/*.txt` (+2 keys each); pin `pins-macfixa/a-mac-save`; csh `MacSaveTests` | `MacSaveToFolder` · P121 |
| 2 Icon re-encode | `HomePage.loadApps` pushes `AppIconReencode.homeIcon(app.id, iconPath)`: a PNG copy (≤ 192 px, ≤ 22,482 bytes = ≤ 30,000 characters of data URI; steps 192 → 144 → 120 → 96 → 72 → 48) made ONCE per source (size + mtime in the name) under `<spixiUserFolder>/html/Apps/_icons/<40 hex>.png`; source ≤ 1 MB, PNG / JPEG by magic, declared size ≤ 2048 px read first, sampled decode; iOS / Mac redrawn into a fresh sRGB bitmap; a mark (empty file) written before the decode = one try ever; the copy written to `.tmp` and moved; `loadApps` never decodes (any thread): a missing copy → `""` now + one pool decode outside its locks, then an icons-only signal (`takeReady` in the early return, `tookReady() ||` in the reload test: no chat-page reload). OFF = the base `Utils.imageToDataUri(icon)` | `Spixi/Utils/AppIconRules.cs`, `Spixi/Utils/AppIconReencode.cs`, `Spixi/Pages/Home/HomePage.xaml.cs` (three lines of `loadApps` in place); pin `pins-macfixa/b-icon`; csh `AppIconTests`; harness `b-icon-popin.mjs` (by hand) | `AppIconReencode` · P122 |
| 3 Swipe first tap | With the cap `swipeTouchLock`, a `{ passive: false }` touchmove listener on the row content cancels the touchmoves of a drag that is locked sideways (no browser scroll gesture → no invisible fling → the next tap clicks); with the cap the direction is decided by the straight-line distance (8 px, the Android touch slop). No cap = no listener | `src/components/chats-swipe.js`, `src/shells/home.html` (the caps object of the chats list), `HomePage.xaml.cs` (the setCaps line, in place); pin `pins-macfixa/c-swipe`; harness `c-swipe-touch.mjs` (by hand; `--slop 8`) | `SwipeTouchLock` (cap `swipeTouchLock`) · gate rows (no packet: no C# behaviour beyond the cap word) |
| 4 Mac rail at start | The first home document of a WebView (sessionStorage mark `spixi.home.booted` absent, no pane sighting) clears a `spixi.pane.account` flag it did not see open (left by a quit / crash with Account open). A re-bake keeps sessionStorage (#589) | `src/shells/home.html` (8 lines); pin `pins-macfixa/d-rail` | none (a hole fix) |
| 5 Address card fit | Desktop only: the address dialog may use the window minus 16 px on each side; the QR shrinks with the window height (these rules never under 185 px, #509; the base `40dvh` term still does below about 463 px) before the foot leaves the dialog | `src/styles/components/wallet-receive.css` (3 rules); pin `pins-macfixa/e-addr-fit`; render `e-addr-fit-render.mjs` (by hand) | none |
| 6 Chip overflow DIAL | NOTHING built; renders of 3 options in an Artifact; a question for Damir | Artifact "Spixi — Chats filter chips in long languages (dial)" | — |
| lead | `MacfixaFlags` (3 switches, lazy read, one `[FLAGS] macfixa …` line) | `Spixi/Utils/SpixiFlags.cs` (one block); csh `MacfixaFlagsTests` | — |
Re-based pins: `pins-fixb1/g-sparekeep` (the SpixiFlags.cs hash), `pins-s11/a-cs` and `pins-s12/a-cs` (the setCaps regex: + the optional swipeTouchLock group), `pins-v1am/c-csharp` (the setCaps expression evaluated in 32 flag states), `pins-fixb2/e-sheet-height` (the address dialog's cap held exactly), the INLINE smoke row at `scripts/smoke-test.mjs` ~16084 (CH4: the caps object may carry the swipeTouchLock getter).

## 2 · How to run
- Tree: the snapshot copy named in your task (= cloud twin of `work/macfixa`, base `ae7b8303` "Merge pull request #29 from
  Rexoflex/work/fixb5"; the diff against the base is in the file named in your task) · `../Ixian-Core` @ `097341a` ·
  tools by `npm ci` (jsdom 29.1.1) · `TZ=America/Los_Angeles` · .NET SDK 10.0.115.
- Pipeline: FULL (bundle before shells) · smoke before: `BASELINE OK 7094 / the 2 KNOWN` · CSH 919.
- Pins: `node scripts/run-pins.mjs pins-macfixa/<a-mac-save|b-icon|c-swipe|d-rail|e-addr-fit>`; `node scripts/run-csh.mjs`;
  `node scripts/cs-syntax-check.mjs`. Chromium by hand (`PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs`,
  `/usr/bin/google-chrome`): `scripts/pins-macfixa/c-swipe-touch.mjs`, `e-addr-fit-render.mjs`, `b-icon-popin.mjs`.
  Never run `scripts/smoke-test.mjs` (the lead's).
- Known failures: the 2 KNOWN (#136 · B3). C# outside the harness is ⚠ UNCOMPILED (Mac / iOS / Android; Windows in
  `redesign-ci`).

## 3 · Auditor scopes (round 1; disjoint)
| Reader | Model | Scope | Focus |
|---|---|---|---|
| S | Fable 5.2 | the whole diff, security only | the ★ rules (isolation, C# touches no risky parts, frozen bridge), the gate triggers (keys, prefs, sinks, fetches, log lines, files written), what a peer, a page or a mini-app package can reach: the Mac save path (what is written where, by whom; can a WebView value reach the path or the name), the icon decode (third-party package bytes into a native decoder in the wallet's process: caps, order, the mark, the folder `_icons` and the app-id rules, a package that ships `_icons` or a hostile `icon.png`, threads), the cap word, the new sessionStorage key |
| A | Opus | items 1 and 2 + the lead's block: `SFileOperations.cs` (Mac), `MacSaveRules.cs`, `AppIconRules.cs`, `AppIconReencode.cs`, the HomePage lines, `MacfixaFlags`, csh tests, pins a and b, P121, P122 | correctness against the real API names (Mac Catalyst / Android / Windows bindings), every exit of every TaskCompletionSource, threads and locks, the Windows branch compiling on net10.0-windows, the callers unchanged, the pins' breaks |
| B | Opus | items 3, 4, 5: `chats-swipe.js`, `home.html`, `wallet-receive.css`, pins c, d, e + the three by-hand harnesses, the re-based pins | behaviour (vertical scroll kept, desktop unchanged, #589 / L6 / S20F W-1 rail rules kept, the phone sheet unchanged), each pin fails for the right reason, the mechanism claims in `docs/macfixa-mechanisms.md` |
| C | Opus | the record: DECISIONS #2080…, the lessons, `docs/walk-macfixa.md`, the handoff, the gate rows, the packets index, `docs/release-readiness.md`, the 28 new lang lines (meaning, the 14 tables), `CLAUDE.md` "Where we are now", the size numbers | facts true in the tree; walk rows observable; no claim beyond the evidence |
A source-text pin states its limits in its first version; a gap of the stated class is a NIT, not a MAJOR (#1735).

## 4 · Non-negotiables and accepted dials
- Must hold: the PARAMOUNT isolation invariant · WebView composes, C# signs · no WebView path or name into a file op ·
  no URL, address, name or path in logs · bundle BEFORE shells · no new verb or push name · one switch per change with the
  old path (#1478) · the size rule #1963 (8): app C# ≤ +300 code lines, hand-written `src/**` ≤ +150, no history comment,
  no probe outside the dev fence, no file over 1,500 lines grows.
- Accepted (do not re-open): #1970 (walk debt waived until 2026-11-28 evening) · the Mac ships in the launch build (Damir
  2026-10-16) · #1480 (the icon re-encode before the launch, in this batch) · #1312 / #1478 · the chip overflow is a dial
  (no build).

## 5 · Verdict
**CLEAN at r5** — MAJOR per round: **3 → 0 → 0 → 0 → 0**. Readers (all fresh, read-only; none saw a builder's context): r1 S (Claude
Fable 5.2, security-only, whole diff) · A (Claude Opus, items 1, 2, the switch block) · B (Opus, items 3, 4, 5) · C (Opus, the record);
r2 S2 (Fable 5.2, security-only) · X (Opus, the fixes + the record); r3 S3 (Fable 5.2) · Y (Opus); r4 S4 (Fable 5.2) · Z (Opus); r5 S5
(Fable 5.2) · W (Opus). Their texts: `/home/claude/review/r<n>/<reader>.md` (the cloud twin; the counts and the findings are
summarised here).

| Round | MAJOR | MINOR | NIT | Fixed in the next fix round / recorded |
|---|---|---|---|---|
| r1 | 3 (A-1 the Mac share menu's Task could never end when its handler is skipped · B-1 the swipe lock missed slow angled drags at an 8 px slop · C-1 the icon walk rows promised a removed pop-in) | 18 | 18 | all MAJOR fixed (`show()` with a 2-poll close check; the direction decided by distance; the walk rows reworded); MINOR fixed (decode outside `loadApps`' locks, an icons-only signal, the sRGB redraw, 192 px steps, the atomic copy, the pin keys, the texts, the lang tables) or recorded (B-2 the peer card's QR, #2084) |
| r2 | 0 | 6 | 13 | S2-MINOR-1 → the save panel ends only by its delegate; S2-NIT-3 → `ClearRect`; texts fixed; the rest recorded (#2087 ⑨–⑲) |
| r3 | 0 | 3 | 10 | S3-MINOR-1 → no poll for the panel + `openPanel`; Y-MINOR-2 → the delegate order pinned; texts fixed; ⑳ recorded |
| r4 | 0 | 3 | 7 | the `openPanel` field pinned; the texts; S4-NIT-1 recorded in ⑬ |
| r5 | 0 | 1 | 4 | the last round: code and pins NOT changed after it; W-MINOR-1, the a5 message and the parameter name recorded (#2087 ㉑–㉓); S5-NIT-2 (a doc line number in P122) corrected |

The code and pin files are committed exactly as the round-5 readers read them (SHA-256, first 12): `SFileOperations.cs` 6a93e9c1c2da ·
`AppIconReencode.cs` 84f5756739e2 · `AppIconRules.cs` 11ea5ccc557b · `MacSaveRules.cs` b3701ee17956 · `HomePage.xaml.cs` 720c9c853656 · `SpixiFlags.cs` 2200a95a669d ·
`chats-swipe.js` 026aa9aee4a3 · `home.html` 651d6982146e · `wallet-receive.css` fbf72c443f14.
