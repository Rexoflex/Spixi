# Walk tools (`walktools`) — the mechanisms (#294), written before the fixes

Prompt: project doc `claude/session-walktools-prompt.md`. Contract: `docs/contract-walktools.md`. Tree: `redesign/frontend` @ `338d30f4`.
Every `file:line` below was re-found in that tree. "Executed on pwsh 7.4.6" = PowerShell 7.4.6 on Linux in the cloud twin; Damir's
walk runs Windows PowerShell 5.1 (`powershell -ExecutionPolicy Bypass -File …`), so a script is "proven" only by the operator block.

## 1 · The two flaky smoke modules

### 1a · `GATE 54 (a4)` — a wall-clock wait raced against a two-frame chain
- **The row** (`scripts/smoke-test.mjs`, the `(a4)` clause of GATE 54, about `:34413`–`:34422`): form Back → `sleep 30` → tap Add
  contact (opens chooser S1) → Esc (dismisses S1 at once, `overlay.js` `dismissOverlay`: the stack entry goes, the node lingers until
  the 400 ms fallback) → `sleep 50` ("still sliding out") → tap again (opens S2) → `sleep 30` ("data-open lands two frames after open")
  → count `.c-sheet--add-contact[data-open]`, expect 1.
- **The CI miss** (run 38, attempt 1, pull request 18, `545e6eb`; read from the job log with `gh`): the count was **0**.
- **Mechanism:** `openOverlay` sets `data-open` inside TWO nested `requestAnimationFrame` calls (`src/components/overlay.js`, the
  `requestAnimationFrame(() => requestAnimationFrame(…))` after `stack.push`); the gate stubs `requestAnimationFrame` as
  `setTimeout(cb, 0)` (GATE 54 setup). After the second tap the event loop holds: timer F1 (frame 1, due +1 ms) and timer W (the
  row's `sleep 30`, due +30 ms). When the loop is busy for 30 ms or more (GC, a CPU-loaded CI runner), F1 and W are BOTH due in the
  same timers pass: F1 runs and only then QUEUES F2 (frame 2, due "now + 1 ms", not due in this pass); W runs and its promise
  continuation — the assertion — runs as a microtask right after W, BEFORE F2. So the row reads the DOM between the two frames:
  `data-open` is not set yet → 0. Under no load the 30 ms wait is far longer than two frames and the row passes: a flake by
  construction. The same race sits in every `sleep(n)` that stands in for "two frames have passed".
- **Fix direction (the state, never a time):** wait for the frames themselves, through the same frame clock the page uses (two
  `requestAnimationFrame` calls of the gate's own stub, queued AFTER the open: FIFO timer order puts the open's frame 2 before the
  row's frame 2, whatever the load); keep the "re-tap during the exit transition" premise as a checked STATE (S1 still in the DOM,
  without `data-open`, and not on the overlay stack), not as "50 ms later". No retry loop, no wider timeout.

### 1b · `pins-fixb1/e-header` — a fixed boot wait raced against the page's load
- **The rows** (`scripts/pins-fixb1/e-header.mjs`, per form): `boot('settings.html', { query, wait: 900 })` (`scripts/pins-s9/b2-kit.mjs`
  `boot`: `new JSDOM(… resources: 'usable' …)` then `await sleep(wait)`), then `push('setNickname', 'Ana')` = `W.executeUiCommand(…)`.
- **The miss** (session `defaultsb`, 2 of 3 full local runs; one form per miss, 6 rows): "W.executeUiCommand is not a function".
- **Mechanism:** `settings.html` loads `spixi.icons.js`, `spixi.strings.js` and `spixi.bundle.js` as external `<script src>` files;
  with `resources: 'usable'` jsdom reads them asynchronously (file I/O callbacks) and runs them in order. `executeUiCommand` exists
  only after the bundle ran. The pin waits a FIXED 900 ms. In a full smoke the event loop carries the timers and leaked windows of
  every earlier module, so the I/O callbacks can be served after the 900 ms timer: the first `push` then calls `undefined`. Alone, the
  page loads in far less than 900 ms. The real contract is different: C# pushes only after the page sent `ixian:onload`
  (`src/shells/settings.html` `signalReady` on the window `load` event → `bridge.ready()` → `ixian:onload`, `src/bridge/native.js`
  `ready()`; #177).
- **Fix direction:** boot with no fixed wait and wait for the page's own `ixian:onload` (b2Kit's `onSend` hook, which sees every
  `ixian:` navigation) — the moment C# would start to push. A page that never sends it fails the row with that reason after a bound
  that is not the measured quantity (a hang guard, not a retry). `b2-kit.mjs` is shared by many pins and is not changed. (Built and
  reviewed: where b2Kit cannot capture — jsdom 31 — the window `load` is the state instead; § 1d.)

### 1c · The proof rule (prompt)
Before: the miss rate of each module by a stated method (the module alone under a stated CPU load, or inside a full run); after:
0 misses by the SAME method with at least as many runs; each deliberate break still red. Builder-a records the method and the
counts in § 1d (filled after the build).

### 1d · Measured (builder-a, 2026-11-22 21:21–21:48, after the baseline smoke ended; nothing else executed)
**Runner:** a stand-alone module per tree (the smoke's helper head, lines 1–334, + the GATE 54 block cut from that tree's smoke by its
markers, or an import of that tree's `e-header.mjs`); base = the untouched tree, new = the fixed tree; one module per process,
INTERLEAVED base, new, base, new …; jsdom 29.1.1, 2 cores. **Load A** = N busy `node -e 'for(;;){}'` processes. **Load B** = a loaded
event loop inside the process: `setInterval(busy-wait 40 ms, every 5 ms)` on both sides — the stand-in for a full smoke, whose loop
also serves the timers and leaked windows of earlier modules (L153 forbids a measurement beside a full smoke).

| Module | Method | Runs per side | Base misses | New misses |
|---|---|---|---|---|
| GATE 54 (a4) | Load A, N = 8 | 10 | 1 (`(0)`) | 0 |
| GATE 54 (a4) | Load A, N = 16 | 20 | 1 (`(0)`) | 0 |
| GATE 54 (a4) | **Load B** | **20** | **20** (all `(0)`, the CI text) | **0** |
| e-header (6 rows) | Load A, N = 16 | 3 | 0 (CPU load alone does not reproduce it) | 0 |
| e-header (6 rows) | **Load B** | **20** | **20** (every run "W.executeUiCommand is not a function") | **0** (21 / 21 each) |
No load: GATE 54 11 / 11 on both; e-header 21 / 21 on both. The row counts are unchanged (GATE 54 11, e-header 21).

**The fixes:** (a4) — the premise "a re-tap during its exit transition" is CHECKED as state (the first chooser was opened, and at the
re-tap it is still in the DOM, without `data-open`, off the overlay stack — `Spixi.isOverlayOpen`); the re-tap follows Esc at once (the
400 ms window holds by construction); then two frames of the gate's own rAF stub (FIFO: the open's frame 2 runs first). The `sleep 30`
after the form's Back stays (Back is a synchronous remove, it stands for no state). e-header — `bootLoaded`: boot with `wait: 0` and
await the page's own `ixian:onload` (b2Kit `onSend`); a hang guard of 20 s fails the rows with the reason. The other sleeps of e-header
stay: each waits for a jsdom frame (`setInterval(1000/60)`) or a microtask chain that the sleep's timer cannot overtake. (Round 0
text; superseded by rounds 1–2 below: no sleep is left in the module.)

**After #46 round 1 (auditor A):** (a4) now follows the user's path — the choosers of earlier clauses are first closed (`data-open`
gone after two frames) and then gone from the DOM (a MutationObserver, 10 s hang guard), S1 is PRESENTED (two frames, `data-open`),
then Esc, the premise, the re-tap, exactly ONE chooser on the stack at once and it is not S1 (the stack oracle, no wait), then two
frames and exactly one `[data-open]` chooser — the fresh one. e-header: the state is the page's own window `load` (jsdom 31 cannot
capture `ixian:` sends through b2Kit — the Location impl symbol is gone — so the 21 rows were all red there on the round-0 fix); where the
capture works (29.1.1, CI) the #177 contract is ALSO required (`ixian:onload` sent, with `executeUiCommand` already present); every wait
after a push is one frame of the page's own `requestAnimationFrame`, and the Copy check awaits the `data-state` attribute itself — no
sleep is left in the module. Load B re-check (10 runs per side and load, 40 / 80 / 100 / 120 ms busy every 5 ms): (a4) 0 misses; (a5)
base 10 / 10 at 80–120 ms, new 0 / 10; e-header 21 / 21 in 10 / 10. Both modules green on jsdom 29.1.1 and 31.0.1.

**After #46 round 2 (reader X):** (a4) waits for `data-open` itself (a MutationObserver that checks the state first, then observes;
10 s wall-clock hang guard that can only fail the row) — no frame count is assumed (three nested frames, a valid timing, stay green);
step (0) watches the earlier choosers with one observer until they leave the DOM. e-header: where b2Kit can capture (29.1.1, CI) the
boot awaits the page's own `ixian:onload` WHENEVER it is sent (a page that sends it one frame after load, as `home.html` does, is green)
and checks that `executeUiCommand` existed at that moment; where it cannot (31) the window `load` is the state. Load B re-check (5 runs
each, 40 and 120 ms busy every 5 ms, jsdom 29.1.1 and 31.0.1): (a4), (a5) and e-header 0 misses.

**Deliberate breaks (#802), each in a copied root:** g54-handle (the guard `if (addSheet && isOverlayOpen(addSheet))` → `if (addSheet)`)
→ (a4) red `(0)` · g54-r31 (the rAF stack guard of overlay.js removed) → (a4) red `(3)` · g54-escinstant (Esc dismisses `instant`) →
(a4) red "PREMISE NOT MET" (the base row stays GREEN here: it lost its premise silently) · eh-addr (an address div in the hero) → 9 rows
red on new and base · eh-noonload (`signalReady` without `bridge.ready()`) → 21 / 21 red "never sent ixian:onload", no hang (base: green).

### 1e · A finding outside the scope: an app defect behind a third timing miss, `GATE 54 (a5)`
Under Load A, N = 16, `(a5)` failed 1 / 20 on BOTH trees. Mechanism: `src/bridge/contacts-page.js:295`
`onDismiss: () => { addSheet = null; }` has no identity check: after a re-tap during the exit transition, the OLD chooser's removal
(the 400 ms fallback in jsdom; `transitionend` on a device) clears the handle of the NEW chooser, so a later tap opens a SECOND chooser
and a programmatic close leaves one open over nothing (a probe that taps again 450 ms after (a4) shows 2 open choosers every time). A second trigger of the same defect (#46 r1,
auditor A): the 400 ms fallback of the (a3) SCAN chooser, which shares the same `onDismiss` closure, clears the handle too (at
80–120 ms busy every 5 ms, (a5) red 8 / 8 on the new tree). The row is right; the page is wrong. `src/**` is not this batch's (session `fixb4` owns it): recorded, not changed (DECISIONS #1877).
Fix direction: `onDismiss: () => { if (addSheet === sheet) addSheet = null; }` with a pin and its break.

## 2 · The chat-screen probe of the device map

- **Today** (`scripts/device/a52s.json`): `screens.chat` = two probes `#0E7A55 ± 28` at (954, 2278) and (1030, 2278) — the mic button;
  `screens.viewer` = four probes, `minMatch 4`: (540, 2240) `#646565` (the viewer's close button), (20, 1000) `#434A3C` and (20, 1900)
  `#424A3B` (the chat ground under the scrim), (954, 2278) `#102D24` (the mic button under the scrim).
- **Mechanism of the miss:** the mic button is painted with the chat appearance's sent colour (`--surface-bubble-sent`,
  `src/styles/tokens.css` — one value per ground; the picks of #1644 moved Meadow's to `#316366`), and the chat ground is the
  appearance itself. So three of the four viewer probes and both chat probes read an appearance colour: a new appearance, a token
  change or a dark theme makes a right screen fail (`no-screen`).
- **Which parts of the chat screen are chrome only** — measured on the BUILT `chat.html` in Chromium (Playwright, 384 × 853 css px,
  device scale 2.8125 = the A52s, all 7 grounds `flat gradient green blue aurora dusk ocean`, light and dark; scratch
  `render-chat.mjs`):

  | Point (render) | light, all 7 grounds | dark, all 7 grounds |
  |---|---|---|
  | the top bar | `#F9FAFB` | `#0F1113` |
  | the composer pill (inside, away from its text) | `#FFFFFF` | `#1E2023` |
  | the mic / send button | `#2160C2 #604DC5 #3A755B #3653AE #316366 #B74C7A #3E7897` | 7 other values |
  | the ground beside the pill | 7 values | 7 values |

  The pill and the top bar do not move with the appearance; the button and the ground do. On the phone (pictures of 2026-11-22,
  light): the pill reads `#FFFFFF` in the chat and the image chat, `#F9FAFB` at the same points on the home screen and on chat info.
  So the pill is the chat's own chrome feature; the top bar is the same colour on home and does not tell the screens apart.
- **The viewer** draws two scrims over the chat (`.c-scrim` = `--surface-scrim-deep`, rgba(17,18,19,0.35) light / 0.7 dark on the
  phone; `.c-mviewer` = `--surface-scrim` rgba(17,18,19,0.6)) and the close button (`--surface-wash-on-hero`, white 0.12). Computed
  over the chrome colours: light pill `#4F5050` (phone: `#4F5050`), light top bar `#4D4E4F` (phone: `#4C4E4F`), close button
  `#646565` (phone: `#646565`) — the computation matches the phone to ±1. Dark: pill `#131415`, top bar `#111213`, close button
  `#2F3031`.
- **Fix:** a screen may hold one probe SET per theme (contract I-2, `sets`), and the chat and viewer sets read ONLY chrome points:
  chat = three points inside the pill, away from the placeholder text and from "Aa"; viewer = the close button + two pill points +
  one top-bar point (all under the scrims). Proposed values (light from the phone pictures, dark computed — the calibrate of the
  operator block confirms the points and the light values; the dark run confirms the dark set):

  | Screen · set | Probes (x, y, rgb, tol) | minMatch |
  |---|---|---|
  | chat · light | (380, 2278, `#FFFFFF`, 2) · (560, 2278, `#FFFFFF`, 2) · (760, 2278, `#FFFFFF`, 2) · (834, 2286, `#4F5664`, 4) | 4 |
  | chat · dark | the same points: `#1E2023` × 3, `#BBBEC4`, the same tolerances | 4 |
  | viewer · light | (540, 2240, `#646565`, 3) · (380, 2278, `#4F5050`, 3) · (760, 2278, `#4F5050`, 3) · (600, 230, `#4C4E4F`, 3) | 4 |
  | viewer · dark | the same points: `#2F3031` · `#131415` · `#131415` · `#111213`, 3 | 4 |

  The fourth chat probe sits on the stroke of the "A" of the message field's "Aa" button (light `#4F5664` on the phone pictures of
  2026-11-17 and -22 and in the render, all 7 grounds; dark `#BBBEC4` in the render, the same glyph coverage): the pill alone is a
  white strip that a settings or Downloads card could also show (#46 r1, auditor B M5). The tolerance is small on purpose: the light
  pill `#FFFFFF` and the light home background `#F9FAFB` differ by 6. A wrong screen still fails: home and chat info read `#F9FAFB` at
  the pill points (light); a white card has no "Aa" ink at that point; the viewer needs the close button.
- **The calibrate and the viewer (#46 r1, auditor B M4):** `-Calibrate` takes the image chat (cal-14) only when the chat check passes,
  and the viewer (cal-15) only after it: with the OLD chat probes on the phone's appearance (Meadow) neither picture is taken. So the
  operator block puts the proposed `sets` into the map FIRST (a commit of the lead, light values from the phone's own pictures), then
  runs the ONE calibrate, which confirms the chat set and gives cal-15 for the viewer set; a value the pictures do not confirm is
  corrected in a second commit before the runs.
- **The prompt's rule for the map:** the VALUES go into `a52s.json` only through the operator block (ONE `-Calibrate` run, then the
  lead reads the pictures). Without the block the map stays as it is; the code that reads `sets` is in the branch either way.

## 3 · The parser

### 3a · "first swipe -> 1st page" of `history-seed-kNN` gives no data (#1818, #1827 (3))
- **The rule today** (`scripts/device/adb-walk-parse.ps1` `X-SeedFirstPage`): the first `[P1] chat load` line AFTER the first
  `[P1] shell send loadmore` line of the window.
- **What the log holds** (run `20261122-1350`, rep 1, read on Damir's PC): t0 = 13:51:20.787 (the first swipe); the open's
  `[P1] chat load` at 13:51:15.7536 — BEFORE t0, outside the window; in the window `[P1] chat load …` at 13:51:31.7693 (C#, thread 1)
  and `[WEBVIEW] … [P1] shell send loadmore dt=73` at 13:51:31.8216, 52 ms LATER.
- **Mechanism:** both stamps are C#'s log time. The page's request reaches C# as a navigation (`ixian:loadmore` → `onLoadMore`, which
  logs `chat load`) and the shell's console line reaches C# on another path (the WebView console callback) — later. So the stamp of
  the send line is not the time of the request, and "after the send line" excludes the very load it should find.
- **Fix:** I-3a. The chat open's own `chat load` is before t0: `SingleChatPage` runs `loadMessages()` (which logs `chat load`) before
  the WebView reveal, and the driver's chat pre-check cannot pass before the reveal (the driver itself waits a fixed `chatSettleMs` +
  the screen check, not a log line — #46 r1, auditor B). The old `history` row "first swipe -> 3rd page" makes the same assumption
  (`X-NthDelta` on `chat load`). Branch 2 (no C# line) takes the first `chat load` of the window only when the window holds exactly as
  many `chat load` lines as page requests; a stray reload (`reloadScreen`, a jump widening) gives "no data" (#46 r1 M1). Equal counts are NECESSARY, not enough: one stray load AND one lost load
  would pair wrongly — in this tree a load is never lost alone (`onLoadMore` always calls `loadMessages`; the line is missing only
  when `lastMessage` is null, and then for every load), so that case cannot occur today (#46 r2, reader Y). When
  histcs's C# line `[P1] chat loadmore in` is in the log, the pair is exact (both C# lines, one thread).

### 3b · The per-page rows
The shell lines of photo1b exist (`[P1] shell older insert …`, `[P1] shell older frames …`, `src/**`); histcs adds the three C#
lines now. Rows per contract I-3; all optional, so a build without a line reads `n/a` with the reason and the run's RESULT does not
change; the old rows stay byte-identical (a fixture summary before / after = the old summary plus only the appended `n/a` page rows).

## 4 · The seed voice clips

- **The refusal** (`Spixi/Pages/Chat/SingleChatPage.xaml.cs`): `onVoicePlay` (~`:9195`) refuses an id that fails `isVoiceIdHex`
  (~`:8743`): even length, hex only, at most `2 * CoreConfig.maxMessageIdSize` characters.
- **The id the seed writes:** `SDevSeed.messageIdFor(i, j)` (`Spixi/Utils/SDevSeed.cs:129`) = SHA-256 → **32 bytes = 64 hex
  characters**; the file-chat writer uses it for every row (`seedFileChats`, `byte[] id = messageIdFor(i, m.j)`).
- **The id a real message has:** 16 bytes — `FriendMessage` / `StreamMessage` make `Guid.NewGuid().ToByteArray()`
  (Ixian-Core `Streaming/Friends/FriendMessage.cs:252`, `Streaming/StreamMessage.cs:146`), and Core caps an id at
  `CoreConfig.maxMessageIdSize = 16` (`Meta/CoreConfig.cs:240`; `Streaming/Models/ChatStreamMessage.cs:39` refuses a longer one).
- **Mechanism:** 64 > 2 × 16 = 32, so every seed voice row is refused at the first check. After the check nothing uses the id's
  length: the page sends the hex of `fm.id` (`src/shells/chat.html` `playVoice`, `QUOTE_ID_RE` up to 256 hex), C# finds the row by
  the whole byte array, and the clip is found by the row's own data (inline) or file fields (#46 r1, auditor C) — so a 16-byte seed
  voice row plays. Opening photos and files is not checked this way (`onViewImage` ≤ 128 hex; `openfile` by transfer id).
- **A known gap, NOT fixed here (outside item 4):** `parseMessageIdHex` (≤ 32 hex, `SingleChatPage.xaml.cs` ~`:2235`) also refuses
  reply (~`:2311`), edit (~`:2378`) and the quote jump (~`:2459`) on every 32-byte seed row (Seeds 01–56: text, photo and document
  rows). A walk row that replies to, edits or quotes a SEED message fails for this reason, not for the feature (#1882).
- **Fix (seed side only, developer builds only):** the voice rows (inline and file) of the seed get 16-byte ids — the first 16 bytes
  of today's hash (contract I-4); the play check is unchanged. The top-up test of a present chat reads the same id function, so a
  phone that holds the old seed gets "partial: Remove the seed, then Seed" (the existing fail-closed path), and a fresh seed writes
  the new ids.

## 5 · The jsdom rows (#1749 (1)) — builder-f, measured on jsdom 29.1.1 and 31.0.1 (the newest, 2026-11-13)
- **The six rows** (all in the `#343` block of `scripts/smoke-test.mjs`, about `:8799`–`:8945` after the fix): `#346` `.c-button[data-morphing]`
  keeps width + transform · `#346` `.c-bottomnav__item` keeps its color ink-fade · `#346` `.c-chip` and the list rows keep 100 ms ·
  `#346` `.c-button` keeps color / border-color · `#346 review r2` `.c-settings__row` / `.c-txlist-item` keep their own transition ·
  `N19 harness self-check`. On the base: red on 31.0.1 (32 pass / 6 fail in the block), green on 29.1.1.
- **Mechanism:** the rows' probe document loads `base.css` and the component sheets but NO token sheet, so every `var(--duration-*)`,
  `var(--easing-*)` and `var(--outline-neutral-02)` is undefined there. jsdom 29.1.1 hands back the cascade-winning declaration AS
  WRITTEN (`transition` = `background-color var(--duration-200) var(--easing-standard), …`). jsdom 31.0.1 resolves `var()` at
  computed-value time like a browser: an undefined token makes the whole shorthand invalid → `transition` = the initial `all`,
  `border-bottom-color` = `rgb(0, 0, 0)`. A `var()` with a fallback resolves on both (why the `.fab` / contacts rows were green on 31).
  The cascade picks the same winner on both versions; the rows relied on 29 returning raw text.
- **Fix (test code only; final form after #46 rounds 1–2):** the probe loads the REAL token sheet (`src/styles/tokens.css`, like
  the other source sheets of this probe) as its first stylesheet, and `sub()` resolves a `var(--name[, fallback])` that jsdom 29 still
  returns as text through the probe's OWN computed custom properties at the reading element (recursive, depth 16; the fallback only
  when the property is empty; an undefined name without a fallback, an unbalanced `var(` or a too-deep chain = the bare marker
  `INVALID-VAR`, which holds no token name); two reference elements give each version's own serialization of `--duration-100` and
  `--outline-neutral-02` to compare with. The first form (a hand-kept token subset, #46 r1) gave false reds for a real token outside the
  subset and for a component custom property (#46 r2, reader X): removed. Stated limit: a custom property is resolved at the element
  that reads it, not where it is declared (no rule of this tree depends on that); jsdom applies no `@media` rule here. Row 2 is tightened: the old `/color/` also matched inside
  `background-color`, so a break that dropped the `color` ink-fade stayed GREEN (#802 found it); now `color` must be its own list item.
- **Proof:** the block 38 / 38 on both versions; each row red on its own CSS break (B1–B6, a copy of the css) on both versions.
- **Not in this batch:** the CI pin `jsdom@29.1.1` (`.github/workflows/redesign-ci.yml`, session `leanfollow`'s file), the smoke's
  install-hint lines, `CLAUDE.md` / L160's text. A full smoke on 31.0.1 in the cloud twin: § 5a.

### 5a · The full smoke on jsdom 31.0.1 (2026-11-23 02:19–03:15, the final tree, only jsdom changed)
6589 pass · **200 unexpected red** · the 2 KNOWN · exit 1 (jsdom 29.1.1: `BASELINE OK 6791`). The six rows of this item are green.
Classes (from the row texts): (a) the largest — every pin that captures `ixian:` sends through the Location impl symbol
(`scripts/pins-s9/b2-kit.mjs`, the `pins-s8/ui-kit.mjs` model) sees nothing ("got []"); (b) computed-style rows of other blocks whose
probe has no token sheet (the class of § 5); (c) built-chat-shell rows that read frames / fades (not traced). So the done-when of the
item (a full smoke on the newest jsdom = BASELINE OK) is out of this batch's reach: a question for Damir (#1886).
