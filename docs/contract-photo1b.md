# Agent contract — photo1b ("Chat shell batch")

Written by the lead (Claude Opus, #1612 / #1640) BEFORE any agent starts (`docs/orchestration.md` § 4). Every agent
gets this file plus its own row. An agent that needs a file outside its row stops and asks the lead.
Sources of the scope: rulings #1641 / #1643 (photo, page half), #1742 (History 1, page half), #1644 (chat
backgrounds); the reports `claude/photo-open-research-2026-11-17.md`, `claude/history-research-2026-11-18.md`, the
proposal `claude/chat-backgrounds-proposal-2026-11-17.md`. Mechanisms re-read in this tree: `docs/photo1b-mechanisms.md`.

## 1 · Base
- Tree: `work/photo1b` @ `55feaddc` "Merge pull request #15 from Rexoflex/work/fixb2" · baseline: `BASELINE OK 6617 /
  the 2 KNOWN (#136 · B3)` (to be observed in this environment) · CSH 643 (observed 2026-11-18 14:2x, .NET SDK
  10.0.115) · tools: jsdom 29.1.1 · eslint 10.14.0 · globals 17.14.0 · tree-sitter 0.25.1 · tree-sitter-c-sharp 0.23.5
  (L160) · Playwright `/opt/npm-tools/node_modules/playwright/index.mjs` for the Chromium sweeps.
- Must hold for everyone: the PARAMOUNT isolation invariant · C# touches no risky parts · the frozen bridge (#1312,
  #1478: own switch, old path = the fallback) · the security handover gate (no new `innerHTML` path, no new HTML sink,
  no message text used as markup, no new verb / argument / storage key / fetch; new log lines = fixed words +
  integers, developer builds only — `<html data-p1>`) · edit `src/`, never `Spixi/Resources/Raw/html` by hand (run
  `node scripts/build-shells.mjs` in YOUR copy after an edit) · no commit, no push, no full smoke, nothing in
  Ixian-Core · never touch the files of session `photo1a` (§ 7).
- #1735: a source-text pin states its limits in its FIRST version (a header line "LIMITS: …"); prefer behaviour
  pins (jsdom on the BUILT shell, the Chromium sweeps) over scanners. #802: every new pin key gets a deliberate
  one-token break in a full copy of the tree; it must fail for exactly that reason.

## 2 · Items and ownership (file scopes are disjoint, except the named REGIONS of `src/shells/chat.html`)
| Item | Agent | Model (effort high) | Owns | Owes (pins + one deliberate break each) | Copy / scratch |
|---|---|---|---|---|---|
| HV-1 insert only the new rows · HV-3 anchor in one task · HV-4 fade from the band · the shell lines of HV-0 and PO-0 | `log` | Opus | `src/shells/chat.html` REGIONS L1–L4 (§ 3) · `src/components/p1.js` · `scripts/pins-photo1b/a-*.mjs`, `b-*.mjs`, `c-*.mjs`, `d-lines.mjs`, `harness-history.mjs` | a-insert (byte-equal insert vs full rebuild; seed-like text / photo / voice / payment / album-across-seam / day-across-seam / hostile strings; switch OFF = old path) · b-anchor (no frame between insert and the position fix; the first visible row keeps its y ±1 px) · c-fade (the band pass gives the same masks as the full walk at ≥ 6 scroll positions; switch OFF = old walk) · d-lines (dev-only, fixed words + integers; absent without `data-p1`) | `/home/claude/wt/log` |
| PO-4 lighter photo tile · the shell half of PO-6 | `tile` | Sonnet | `src/components/typed-bubbles.js` · `src/components/media-bubble.js` · `src/components/message-bubble.js` · `src/styles/components/media-bubble.css`, `message-bubble.css` (only if needed) · `src/shells/chat.html` REGION T1 (§ 3) · `scripts/pins-photo1b/e-*.mjs`, `f-*.mjs`, `harness-photos.mjs` | e-tile (a complete local photo builds no hidden file face / overlay icon / spinner until needed; the fallback to the file card when the picture fails; the aria name byte-equal to the old path; the 600 ms quiet fade; no size read for a fixed tile; no re-pin of the log on load for a fixed tile; switch OFF = old tile byte-equal) · f-voice (no bar writes for a flat placeholder; a played progress still marks the bars; switch OFF = old path) | `/home/claude/wt/tile` |
| #1644 the chat-background tokens · the ring of light Aurora · the three dark Mist versions (render data) | `tokens` | Sonnet | `src/styles/tokens.css` · the re-bases in `scripts/pins-s17/`, `pins-s18/`, `pins-s19/`, `pins-s20/`, `pins-s20f/`, `pins-s20g/`, `pins-s4/`, `pins-s8p/`, `pins-s9/`, `pins-fixb2/g-aurora-ring.mjs` and the INLINE rows of `scripts/smoke-test.mjs` that hold today's values (name each re-base; one break per changed clause) · `scripts/pins-photo1b/g-tokens.mjs` | g-tokens (every picked string of § 5 in the built shell; the floors F1–F7 of the proposal on every changed cell; dark Mist bubble : ground = 1.35 : 1 ± 0.01 and quote : bubble 1.25 ± 0.01; the light Aurora ring ≥ 3 : 1 on the Calmer 2 select-row gap, re-set if under) | `/home/claude/wt/tokens` |
| The C# flag plumbing | `flags` | Sonnet | ONE block in `Spixi/Utils/SpixiFlags.cs` (+ one call line inside `init()`) · ONE line in `Spixi/Pages/Chat/SingleChatPage.xaml.cs` just before `Utils.sendUiCommand(this, "setCaps", caps);` (the only cap push to the chat shell, `:1648` at the base) · `scripts/csh/Photo1bFlagsTests.cs` (+ its registration in `scripts/csh/Run.cs` if the harness needs it) | csh: the five keys absent = ON; a stored 0 acts only in dev mode; the caps text = exactly the ON caps in the fixed order; the `[FLAGS] photo1b …` line; a break per key | `/home/claude/wt/flags` |

The lead owns: the integration, `scripts/smoke-test.mjs` (ONE registration block for `pins-photo1b`), the renders,
the harness runs, every full smoke, the export docs. Reviewers (#1606): fresh read-only Fable 5.2 for the
security-only pass (the insert path, the new lines, the caps) and for `src/shells/chat.html`; Opus for the rest.

## 3 · The regions of `src/shells/chat.html` (two agents edit this file — each ONLY inside its regions)
| Region | Owner | Where (base line numbers, 55feaddc) |
|---|---|---|
| L1 the log render | `log` | `renderLogNow()` and the helpers it calls for a prepend (`:5809`–`:5990`), the render scheduling (`:5992`–`:6200`) |
| L2 older history | `log` | `showOlder` … `orderInsert` (`:6202`–`:6405`: `firstVisibleAnchor`, `restorePrependAnchor`, `requestOlder`, `attachLazyHistory`) and the handlers `addMessages` / `messagesDone` (`:6929`–`:7027`) |
| L3 the fade pass | `log` | `composerFadeStops` … `composerFadeTrack` (`:8876`–`:8933`) |
| L4 the open stamp | `log` | the `[CDPERF]` / present block of `onChatScreenLoaded` (`:7417`–`:7472`) — the PO-0 lines; the present signal itself is NOT changed |
| T1 photo tile + voice call sites | `tile` | `buildFileRow` (`:3169`–`:3230`), `paintVoiceRow` (`:2738` ± 40), the `setFileThumb` handler (`:7842`–`:7860`), `voiceInfo` (`:7316`–`:7331`) |
The cap reads (`bridge.cap('<name>')`) are written inside the owner's own region. Integration: the lead applies both
diffs with a 3-way merge on the base file; a hunk outside the owner's regions is refused and sent back.

## 4 · Interfaces between items (the only way two items meet)
| Name | Shape | Provider | Consumer |
|---|---|---|---|
| Switch → cap | C# int pref, absent = ON, a stored 0 acts only in dev mode (`S16PassRules.effectiveFlag`), read once in `SpixiFlags.init()`; each ON switch adds its cap word to the chat page's `setCaps` text; the shell reads `bridge.cap('<word>')` at the moment it decides (a cap absent = the OLD path) | `flags` | `log`, `tile` |
| The five switches | `PhotoTileLite` (key `flagPhotoTileLite`, cap `photoTileLite`, PO-4) · `VoiceWaveLite` (`flagVoiceWaveLite`, cap `voiceWaveLite`, PO-6 shell) · `HistoryInsertOnly` (`flagHistoryInsertOnly`, cap `olderInsert`, HV-1) · `HistoryAnchorOneTask` (`flagHistoryAnchorOneTask`, cap `olderAnchor1`, HV-3) · `FadeFromBand` (`flagFadeFromBand`, cap `fadeBand`, HV-4) — caps text appended in exactly this order, comma-led (`,photoTileLite,voiceWaveLite,olderInsert,olderAnchor1,fadeBand` when all ON) | `flags` | `log`, `tile` |
| The flags line | ONE line at init: `[FLAGS] photo1b tilelite=<0|1> voicelite=<0|1> olderinsert=<0|1> olderanchor=<0|1> fadeband=<0|1>` (every build; it is the BUILD row of the walk) | `flags` | the walk |
| Row builders | HV-1 builds every new row through the SAME builders a full render uses (`buildRow`, `buildGridRow`, `createDateSeparator`, `createUnreadDivider`, `labelRow`, `applyRowReactions`, `wireMenu`, `positionsFor`, `planPhotoGroups`) — no new `innerHTML`, no new sink. The insert result is byte-equal, row for row, to a full render of the same model; when the seam is not provably local (a photo group or a payment dedup that crosses or reaches the seam, the unread divider in the new slice, select mode, a jump pulse, a rise / slide in flight, the pill / notice change at the top), it runs the full render (the old path) | `log` | — |
| Bubble API | `createImageFileBubble` / `createMediaBubble` / `buildVoiceBody` keep their signatures; a new optional option `lite: boolean` (default false = the old path byte-equal) is the only change of the API; the shell passes `lite: bridge.cap('photoTileLite')` / `bridge.cap('voiceWaveLite')` | `tile` | chat.html T1 |
| HV-0 / PO-0 shell lines (dev builds only, `data-p1`; fixed words + integers) | `[P1] shell older insert rows=<n> mode=<insert|full> build=<ms> swap=<ms> fix=<ms> fade=<ms> ms=<ms>` at the end of a prepend's render · `[P1] shell older frames n=<frames> max=<ms>` 600 ms after it (the per-page frames line; reuse `p1.js` `p1Shown` if it fits) · `[CDPERF] chat-shell late thumbs=<n> voice=<n> js=<ms>` (media pushes between `messagesDone` and `ixian:painted`) · `[CDPERF] chat-shell build=<ms> layout=<ms> fade=<ms> nodes=<n> photo=<n> voice=<n>` (the split of the open's render). The two `[CDPERF]` lines are written ONLY with `data-p1` (unlike the older `[CDPERF]` lines) | `log` | the later C# batch, the parser |

A change to this table goes through the lead; both sides get the new text.

## 5 · The token strings (#1644) — `tokens`
Exactly the proposal's strings, by Damir's picks: Mist light **Today** (no change) · Mist dark **Calmer 2** for the
bubbles and ink (`--chat-pattern-ink #C9D0F0`, sent `#2D4D81`, card `#1E2636`, alpha 0.0808 / desktop 0.06464 —
written into the dark Mist rules, NOT the shared defaults) + the ground `--gradient-chat: #0C0E10` + the received
bubble lifted so bubble : ground = 1.35 : 1 (compute it, about `#262A2C`) + its quote re-derived at 1.25 : 1 darker
than the bubble · Iris light C1 / dark C1 · Spixi light C1 / dark C2 · Meadow, Aurora, Dusk, Ocean C2 / C2. The pattern
alpha follows the step per canvas (into each changed canvas's own rule + its desktop line = 0.8 × phone). Names, count
and order of appearances and patterns unchanged; the default appearance unchanged; the sent pick colours unchanged.
The ring of light Aurora: `--outline-select-ring` measured on the Calmer 2 `--surface-select-row-gap` `#6EA2D5`; re-set
(smallest change) if under 3 : 1. The `tokens` agent writes `docs/photo1b-tokens.md`: every changed line (old → new),
the computed dark Mist bubble / quote, the floors per cell, the ring.

## 6 · What each agent returns
- The list of files it CHANGED (the lead copies back only these) and the base line ranges it touched.
- Per pin: the command (`node scripts/run-pins.mjs --root <copy> pins-photo1b/<mod>`), the green line, the break it
  made, the red line with the failing key.
- `log` and `tile`: the harness numbers (headless Chromium, CPU × 4 by CDP `Emulation.setCPUThrottlingRate`, the
  BUILT shell, 5 runs, medians): `log` = the insert of pages 1–3 (100 / 50 / 50 text rows over a 50-row open; and the
  photo chat's one older page) with the switches ON and OFF; `tile` = the build of 48 photo tiles (Seed 56-like: 50
  rows, 48 photos) and 20 voice rows, ON / OFF. A change whose number does not move is reported so (#1534).
- What it could not prove (⚠ C# UNCOMPILED, unrun, not rendered). Anything outside its scope: a note, not a fix.

## 7 · Never touch (session `photo1a` and the frozen areas)
`Spixi/Pages/Chat/SingleChatPage.xaml.cs` (except the ONE cap line of `flags`), `Spixi/Platforms/*/SThumbnail.cs`,
`Spixi/VoIP/**`, `Spixi/Utils/SharedItems.cs`, the photo1a store files, `scripts/device/**`, `scripts/pins-photo1a/**`,
`Spixi/Utils/SConfirm.cs`, `SPayments.cs`, the start path, `Spixi/Utils/SDevSeed*.cs`, `Spixi/Spixi.csproj`,
`Spixi/Meta/**`, Ixian-Core, `.github/**`, the bridge protocol. HV-5 (the first page of 50 rows) is a C# change in
`onLoadMore` (`SingleChatPage.xaml.cs:1084-1103`) — NOT in this batch (§ 8).

## 8 · What the later C# batch (P-28, HV-5, the C# lines of HV-0) may rely on
- The shell accepts an older page of ANY size and inserts it by HV-1 (no assumption of 50 or 100 rows).
- The insert never needs a new verb: the prepend contract stays `addMessages(json, "prepend")` + `messagesDone(show_more)`.
- The anchor (HV-3) is taken in `messagesDone`, so a page posted off the UI thread (P-28: the read and build on a
  background thread, the pushes marshalled back) may land at any time; the shell still keeps the row under the
  reader in place.
- HV-5: the C# side drops the step over 100 in `onLoadMore` only after the D-18 check (Core `Friend.cs:909-913`; the
  read asks for `want + 1`).

## 9 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
