# Agent contract — macfixa

File name: `docs/contract-macfixa.md`. The lead wrote it BEFORE any agent started (`docs/orchestration.md` § 4).
Prompt: project doc `claude/session-macfixa-prompt.md` (Ready by Damir 2026-11-26 23:51, #1970). Lead: Claude Opus.
Every agent gets this file plus its own row. An agent that needs a file outside its row stops and asks the lead.

## 1 · Base
- Tree: `work/macfixa` @ `ae7b8303` "Merge pull request #29 from Rexoflex/work/fixb5" · baseline: measured by the lead in
  the cloud twin before any change (`BASELINE OK <n> / the 2 KNOWN`, expected 7094) · CSH 919 · tools by `npm ci`
  (jsdom 29.1.1 · eslint 10.14.0 · globals 17.14.0 · tree-sitter 0.25.1 · tree-sitter-c-sharp 0.23.5) · .NET SDK 10.0.115 ·
  Ixian-Core @ `097341a` beside the tree · `TZ=America/Los_Angeles` · Chromium = `/usr/bin/google-chrome` through
  Playwright at `PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs`.
- Must hold for everyone: the PARAMOUNT isolation invariant · C# touches no risky parts (no WebView path or file name into a
  file op; C# names its own files) · the frozen bridge (#1312, #1478: own switch, old path = the fallback; no new verb, no new
  push name unless this contract names it) · the security handover gate triggers (a new verb, `spixi.*` key, WebView
  setting, HTML sink, network fetch or log line → tell the lead) · edit `src/`, never `Spixi/Resources/Raw/html` by hand
  (rebuild it in your copy for your own checks) · no commit, no push, no full smoke, nothing in Ixian-Core, nothing in
  `Spixi/Meta/**`, wallet, keys, payments (a need = STOP and tell the lead).
- The size rule #1963 (8): the WHOLE batch has R1 app C# at most **+300 code lines** and hand-written `src/**` at most
  **+150 code lines**. Shares (soft): A ≤ 120 C#, B ≤ 150 C#, C ≤ 40 src, D ≤ 40 src (+ C# only if the mechanism needs it),
  E ≤ 40 src (CSS). R2 no history comments (a comment says what or why, never "was / used to / ★ session X changed").
  R5 no probe outside `#if SPIXI_DEV_COEXIST`. R6 no file over 1,500 lines grows (HomePage.xaml.cs is 7,323 lines: edit
  a line in place or put new members in a NEW partial file).
- Files outside this batch that are owned by sessions running tonight (DO NOT EDIT): `imgurl` (the Android / Windows
  WebView handlers, the iOS / Mac scheme handler, chat.html and the chat media scripts, `SingleChatPage.xaml.cs`),
  `quotebox2` (`SingleChatPage.xaml.cs`, `ContactNewPage.xaml.cs`, `SpixiContentPage.cs`), `qtools` (`.github/**`,
  `scripts/quality/**`), `docsb3` (docs other than the ones this contract names).
- Executing: one full smoke at a time is the lead's. **Run nothing (node, chrome, dotnet) before the file
  `/home/claude/scratch/smoke-base.done` exists** (the lead's baseline smoke runs until then, L153). Reading and writing
  files is fine.

## 2 · Items and ownership (file scopes are disjoint)
| Item | Agent | Model (effort high) | Owns (files / folders) | Owes (pins + one deliberate break each) | Copy / scratch |
|---|---|---|---|---|---|
| 1 Mac save (LAUNCH BLOCKER) | builder-a | Opus | `Spixi/Platforms/MacCatalyst/SFileOperations.cs` · new `Spixi/Utils/MacSaveRules.cs` (pure rules, CSH-compiled) · new `scripts/csh/MacSaveTests.cs` · new `scripts/pins-macfixa/a-mac-save.mjs` · new `docs/be-review-pack/P121-mac-save.md` · the mechanism text (returned to the lead) | a-mac-save (a source pin, limits first) + csh MacSaveTests; breaks | `/home/claude/agents/a/spixi` |
| 2 Icon re-encode | builder-b | **Fable 5.2** | new `Spixi/Utils/AppIconReencode.cs` (+ its pure rules in the same or a second new Utils file) · the ONE icon line in `HomePage.loadApps` (edit in place; no other HomePage line) · new `scripts/csh/AppIconTests.cs` · new `scripts/pins-macfixa/b-icon.mjs` · by-hand harness `scripts/pins-macfixa/b-icon-popin.mjs` · new `docs/be-review-pack/P122-app-icon-reencode.md` | b-icon + csh AppIconTests + the pop-in harness numbers; breaks | `/home/claude/agents/b/spixi` |
| 3 Swipe first tap | builder-c | Opus | `src/components/chats-swipe.js` · `src/styles/components/chats-swipe.css` · new `scripts/pins-macfixa/c-swipe.mjs` · by-hand Chromium harness `scripts/pins-macfixa/c-swipe-touch.mjs` · the mechanism text | c-swipe (jsdom) + the touch harness; breaks | `/home/claude/agents/c/spixi` |
| 4 Mac rail at start | builder-d | Opus | the rail-state code of `src/shells/home.html` (NOT the chats list, swipe or apps code) · `src/shells/settings.html` ONLY its `spixi.pane.account` writes, if the mechanism needs it · new `scripts/pins-macfixa/d-rail.mjs` · the mechanism text. A C# need → tell the lead first (HomePage is shared with builder-b) | d-rail (jsdom on the BUILT home shell; Mac + Windows desktop); breaks | `/home/claude/agents/d/spixi` |
| 5 Address card fit | builder-e | Opus | the address sheet CSS (`src/styles/components/wallet-receive.css` or the file that holds `.c-addr-sheet`) · `openAddressSheet` in `src/components/wallet-receive.js` only if CSS cannot do it · new `scripts/pins-macfixa/e-addr-fit.mjs` (+ a by-hand Chromium render) | e-addr-fit; breaks | `/home/claude/agents/e/spixi` |
| 6 Chip overflow DIAL | builder-f | Opus | NO repo file. Renders into `/home/claude/agents/f/out/` (one self-contained `index.html` with the PNGs inlined or beside it) | the renders (2–3 options × sl, de, ru × phone 360 + Mac list widths × light, dark); build NOTHING in src | `/home/claude/agents/f` |
| lead | lead | Opus | `Spixi/Utils/SpixiFlags.cs` (the `MacfixaFlags` block — written, in every copy) · `HomePage.xaml.cs` line of `setCaps` (the cap word `swipeTouchLock`, lead adds it) · `scripts/csh/csh.csproj` (agents return their `<Compile Include>` lines) · `scripts/smoke-test.mjs` (ONE registration line) · re-bases of hashed pins · DECISIONS, docs, packets index, gate rows | — | `/home/claude/spixi` |

## 3 · Interfaces between items (the only way two items meet)
| Name | Shape | Provider | Consumer |
|---|---|---|---|
| `MacfixaFlags.MacSaveToFolder` | `bool`, absent pref = true; key `flagMacSaveToFolder`; read lazily once | lead (SpixiFlags.cs) | builder-a |
| `MacfixaFlags.AppIconReencode` | `bool`, key `flagAppIconReencode` | lead | builder-b |
| `MacfixaFlags.SwipeTouchLock` → cap `swipeTouchLock` | home `setCaps` gets `,swipeTouchLock` when the switch is on (lead edits the setCaps line in place); the page reads `bridge.cap('swipeTouchLock')` at GESTURE time (caps arrive after the first render). Absent cap = exactly today's gesture code | lead | builder-c |
| The flag log line | `[FLAGS] macfixa macsave=<0|1> iconreencode=<0|1> swipelock=<0|1>` (fixed words, 0|1) | lead | the walk |
| `AppIconReencode` entry | one static call (as built: `homeIcon`, plus the icons-only signal `takeReady` / `tookReady` read by two more lines of `loadApps`) that HomePage.loadApps uses in place of `Utils.imageToDataUri(icon)` for the icon of `app.id`; returns the data URI of the small copy, or `""` (the shell's default icon) for a missing / broken / oversized icon; never throws | builder-b | HomePage (as built: three lines of `loadApps`, edited in place) |
| Mac `SFileOperations.share(path, title)` | signature unchanged; with the switch on, the returned Task completes when the user's choice is finished (so BackupPage's existing "Did you save the backup?" question opens after it, not on top) | builder-a | BackupPage, SingleChatPage, HomePage (all unchanged) |

A change to this table goes through the lead; both sides get the new text.

## 4 · What each agent returns
- The list of files it CHANGED or CREATED (the lead copies back only these) + any `<Compile Include>` line for csh.csproj.
- The mechanism (items 1, 3, 4): what the source does, with `file:line`, and what the harness showed — BEFORE the fix text.
- Per pin: the command (`node scripts/run-pins.mjs pins-macfixa/<mod>` in its copy), the green line, the break (one-token
  mutation in a full copy, #802: `node scripts/run-pins.mjs --root <copy> pins-macfixa/<mod>`), the red line with the key.
- CSH: `node scripts/run-csh.mjs` in its copy (`CSH pass=<n> fail=0`), and the break of each new test class.
- What it could not prove (⚠ C# UNCOMPILED: Mac / iOS / Android files; not rendered; not on a device).
- The size of its change (code lines added, comment lines added) and what stage 2 deletes (R4: the old path behind the switch).
- A packet text (items 1, 2; ≤ 1 page: what + why · the diff in short · the threat and its rules · the pins).
- Anything it saw outside its scope: a note, not a fix.

## 5 · Integration order and checks (the lead)
1. Copy back per agent, changed files only → the FULL pipeline (extract-strings → build-locales → build-strings-iife →
   build-demo-bundle → build-shells) → the `--check` gates → `cs-syntax-check` → CSH.
2. ONE registration line in `scripts/smoke-test.mjs` for `pins-macfixa/<a-mac-save|b-icon|c-swipe|d-rail|e-addr-fit>`;
   grep the smoke for the tokens of every edited line (the INLINE pins, L84); re-base hashed pins the batch breaks (name each).
3. The full smoke (one at a time, L153) + CSH → the #46 loop until CLEAN (a security-only Fable 5.2 reader every round +
   Opus readers; between rounds the pins the fix touches; the full smoke ONCE after the last fix, #1503) → the export docs
   → commit, ONE push of `work/macfixa`, read each commit back, the compare link (#1546).

## 6 · What stage 2 deletes (R4)
- Item 1: the old Mac `share()` body (the share-menu-only path) when the BE engineer accepts the switch; `MacSaveToFolder`.
- Item 2: the `Utils.imageToDataUri(icon)` call for app icons in `loadApps` and the switch `AppIconReencode`.
- Item 3: the no-cap branch of the swipe and the switch `SwipeTouchLock` / cap word.
- Items 4, 5: nothing (no switch).

## 7 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
| all | 1 | as § 2 | every item delivered on the first attempt; no escalation | — |
| size | — | lead + builder-b | the integrated tree read +312 app C# code lines (cap +300): the lead's flags block −4, the Mac file's usings −5, builder-b −13 (no behaviour change) → +290; after the #46 fixes +296 (cap +300) | — |
