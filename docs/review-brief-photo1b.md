# Review brief — photo1b ("Chat shell batch") (#1755–#1774)

Work order for the #46 adversarial loop (`docs/process.md`). Written BEFORE round 1 by the lead (Claude Opus,
#1612 / #1640). The verdict is written back into § 5 when the loop closes (#660). Readers by #1606: the security-only
pass (the insert path, the new lines, the caps) and the riskiest file `src/shells/chat.html` (the log render) → fresh
read-only **Claude Fable 5.2**; every other reader → fresh read-only **Claude Opus**. No builder reviews its own part.
No fallback model: a declined round is a stop. #1735: a source-text pin states its limits; a gap of the stated class
is a NIT, not a MAJOR. Prefer behaviour findings (a concrete input that gives a wrong DOM / a wrong value).

## 1 · What the batch is
| Item | What landed | Where | Switch (cap) · packet |
|---|---|---|---|
| HV-1 | an older page (`addMessages(json,"prepend")` + `messagesDone(show_more)`) builds ONLY its rows and inserts them before the old first row (`renderOlderInsert`); every seam case that is not provably local (a photo group or a payment txid across the seam, a quote across it, the unread divider in the new part, select mode, a rise / slide / jump pulse, a changed render context, focus in a replaced node, …) runs the full `renderLogNow()` | `src/shells/chat.html` L1 / L2 | `HistoryInsertOnly` (`olderInsert`) · P71 |
| HV-3 | the reader's anchor is taken in `messagesDone` (just before the render), not at `addMessages`; the fix stays in the same task | `chat.html` L2 | `HistoryAnchorOneTask` (`olderAnchor1`) · P72 |
| HV-4 | the composer fade pass starts at the band (`fadeBandStart`, a binary search over `box.children`) instead of at the newest child; old walk while a transform is in flight | `chat.html` L3 | `FadeFromBand` (`fadeBand`) · P73 |
| HV-0 / PO-0 lines | dev builds only (`data-p1`): `[P1] shell older insert rows= mode= build= swap= fix= fade= ms=`, `[P1] shell older frames n= max=`, `[CDPERF] chat-shell late thumbs= voice= js=` (wraps `window.setFileThumb` / `window.voiceInfo` between `messagesDone` and `ixian:painted`), `[CDPERF] chat-shell build= layout= fade= nodes= photo= voice=` | `chat.html` L1 / L4 | none (dev lines) · in P71 |
| PO-4 | a complete local photo tile builds no hidden file face (until the picture fails or the quiet wait ends with no picture), no overlay icon / spinner, no JPEG head decode, no re-pin on load | `src/components/typed-bubbles.js`, `media-bubble.js`, `chat.html` T1 | `PhotoTileLite` (`photoTileLite`) · P74 |
| PO-6 shell | a flat placeholder wave writes no bar; a repaint writes only the bars that changed; the 40 bars STAY (one element cannot paint the per-bar heights, tips, gaps and the played split the same; pins hold 40 bars) | `src/components/message-bubble.js`, `chat.html` T1 | `VoiceWaveLite` (`voiceWaveLite`) · P75 |
| #1644 tokens | Damir's picks per appearance and theme; dark Mist ground `#0C0E10`, bubble `#272B2D` (1.353 : 1), quote `#151819` (1.249 : 1); the pattern alpha per canvas; the light Aurora ring 3.024 : 1 on the Calmer 2 gap (not re-set) | `src/styles/tokens.css` (`docs/photo1b-tokens.md`) | none (values) |
| flags | five int prefs (absent = ON, a stored 0 acts only in dev mode), one `[FLAGS] photo1b …` line, the cap words added at the ONE cap push of the chat page | `Spixi/Utils/SpixiFlags.cs` (one block + one call), `SingleChatPage.xaml.cs:1648` (one line) | — · P76 (the plumbing, the prefs, the line) |
Not built: HV-5 (the first page of 50 rows) is C# (`SingleChatPage.xaml.cs:1084-1103`, the file of `photo1a`) → the later
C# batch (contract § 8). The one-element waveform (PO-6) is not built (reason above).

## 2 · How to run
- Tree: your read-only copy (the lead gives its path); range = `git diff 55feaddc` in the copy. Pipeline: FULL (done) ·
  smoke on the base: `BASELINE OK 6617 / the 2 KNOWN` · CSH 643 → 652 · Ixian-Core @097341a beside the copy.
- Known failures: the 2 KNOWN (#136 · B3); L214 (the smoke runs with `TZ=America/Los_Angeles`).
- Single pins: `node scripts/run-pins.mjs --root <copy> pins-photo1b/<mod>`; csh: `node scripts/run-csh.mjs`; the
  harness / render files (`scripts/pins-photo1b/harness-*.mjs`, `render-grounds.mjs`) with
  `PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs`. Never the full smoke. Wait rule: run nothing
  while `/home/claude/runs/HOLD` exists (the lead's full smoke).
- ⚠ `SingleChatPage.xaml.cs` is UNCOMPILED in the cloud (CI compiles Windows); `SpixiFlags.cs` compiles in csh.

## 3 · Auditor scopes (disjoint)
| Reader | Model | Scope (files) | Focus |
|---|---|---|---|
| S (security-only) | Fable 5.2 | the insert path (`renderOlderInsert`, `buildLoopRow`, `finishLoopRow`, the seam checks) · the four dev lines and the `cdLateStart` / `cdLateEnd` wraps · PO-4 `ensureFace` / the lite overlay · `SpixiFlags.cs` photo1b block, the SCP line, `Photo1bFlagsTests.cs` · pins `a-insert` (hostile cases), `d-lines` | can a message (text, name, file name, a payment, a quote, a hostile id) reach markup or a new sink? Does any new line carry user data or appear in a store build? Does the wrap of the two page globals change what those pushes accept or where their values go (the A5 / V4 sinks)? Can a page script use the caps or the wraps? A new verb / key / argument / fetch? The gate lens: does the exposure exist at `0e85a4b8`? |
| R (the log, riskiest file) | Fable 5.2 | `src/shells/chat.html` L1–L4 whole (HV-1, HV-3, HV-4, the lines) · pins `a-insert`, `b-anchor`, `c-fade`, `d-lines`, `a-kit`, `harness-history` · the two re-based Session AE smoke rows | is the insert byte-equal to a full render in EVERY case it accepts (find a model state where it is not: days, groups, positions, reactions, payments, quotes, unread, the top affordance, the reserve, select, mentions, reply hover / focus, the typing row, the pill); does the fallback always run when it must; HV-3 no jump (a scroll between the pushes; an empty page; the timeout); HV-4 same masks (non-monotonic children: the jump pill, typing row, sticky / absolute children, zero-size runs); cap absent = the old path exactly |
| O1 (tile + voice) | Opus | `typed-bubbles.js`, `media-bubble.js`, `message-bubble.js`, `chat.html` T1 · pins `e-tile`, `e-kit`, `e-tile-base`, `e-tile-capture`, `f-voice`, `harness-photos` | the fallback to the file face (error, quiet end, state flip, a re-render, a re-used `instantIfShown` tile); aria names byte-equal; the 600 ms quiet fade; clicks; my sending photo; cap absent byte-equal; the voice played marks after seek / pause / stop / a new clip |
| O2 (tokens) | Opus | `src/styles/tokens.css`, `docs/photo1b-tokens.md`, pin `g-tokens`, `render-grounds.mjs`, every re-based pin of the tokens (`pins-s17/c-appearance`, `pins-s18/e-pattern-desktop`, `pins-s19/r-dark-bubbles`, `pins-s20/r-dark-grounds`, `r-notice-card`, `pins-s20g/c-n1`, `pins-s4/fix4`, `pins-s8p/g-grounds`, `pins-fixb2/g-aurora-ring`) and the token rows of `scripts/smoke-test.mjs` (the `photo1b (#1644)` notes) | every string equals the pick (the proposal's table, `/home/claude/briefs/proposal-1644.md`); the computed dark Mist values; no shared default changed; every floor; is each re-base the smallest honest change, and are the MOVED floors (`docs/photo1b-tokens.md` § 7) the pick's consequence and recorded, not hidden |
| O3 (flags + C# re-bases) | Opus | `SpixiFlags.cs` block, the SCP line, `Photo1bFlagsTests.cs`, `FixB2PayTests.cs`, the re-based `pins-fixb1/g-sparekeep`, `pins-fixb2/d-pay-confirm`, `pins-perfb1/f-flags`, `pins-v1am/c-csharp`, `pins-s6b/cs`, `pins-s7/cs`, `pins-s9/a1-wiring` | the switch rule (absent ON, a stored 0 only in dev mode, start = old path); the caps text order; the line; does each re-base still catch what it was written for (#1596 / #1634: only the moved anchor accepted, at exactly its place) |

## 4 · Non-negotiables and accepted dials
- Must hold: the PARAMOUNT isolation invariant · ★ C# touches no risky parts · no new `innerHTML` path, HTML sink,
  verb, argument, `spixi.*` key or fetch · new lines = fixed words + integers, developer builds only (the `[FLAGS]` line
  excepted: every build, 0 / 1 only) · each behaviour change its own switch, cap absent = the old path (#1478) ·
  bundle BEFORE shells · tokens are the source of truth.
- Accepted (do not re-open): #1641 / #1643 (the photo budget, the split with `photo1a`) · #1742 (History 1) · #1644
  (the picks, dark Mist `#0C0E10`, the pattern follows the step) · #1735 (the pin-limit rule).

## 5 · Verdict
(written by the lead when the loop closes)
