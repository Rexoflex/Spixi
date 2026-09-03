# OPUS REVIEW BRIEF — THE #46 ADVERSARIAL LOOP OVER SESSIONS I · J · K (work order for Session L)

**Why this is Session L's FIRST item, before any build.** The last adversarial loop ran in
Session H (#729, `docs/opus-review-verdict-session-h.md`). Since then three sessions shipped on
self-review + mutation only — Session I (#736–#747), J (#748–#758), K (#759–#766) — and Session K
touched the two places the Session H verdict named as the ones to fear: the **present machinery**
(`presentPreload` / `signalPreloadReady` / a new verb, `ixian:painted`, a backstop that fired once
before the paint) and **a cache on the localization path** (`generatePage`, keyed on a version
counter that two mutation sites must bump). The author is the wrong person to adjudicate those
(#512). The loop runs FIRST; the build queue (handoff §2) follows on a CLEAN verdict.

**Scope:** the whole delta `f325d651^` (Session I's parent) → the Session K tip. Get the exact
range from `git log --oneline` on the mount: Session I `f325d651` · Session J `f07a8e5f` ·
Session K = the commit(s) after it.

## Protocol (the #46 shape, as Session H ran it)

Three READ-ONLY Opus auditors with DISJOINT scopes, file:line findings, MAJOR / MINOR / NIT →
verify each finding against the tree (a finding that does not reproduce is recorded as such,
not dropped) → fix agents with disjoint file scopes and explicit cross-file contracts → a FRESH
break-my-verdict Opus reviewer over the FIXES (not the original delta) → round 2 over the
fixes-for-fixes → CLEAN. Every fix lands with a pin; every pin is MUTATED before it is believed
(two full-tar copies, rebuild bundle + shells inside the copy when a component moved). The
verdict is appended to THIS file (#660: a verdict not written into the brief that ordered it is
a verdict nobody can find). Baseline before touching anything: handoff §0's numbers in a clean
clone, sibling present.

## Auditor A — C#: the present machinery, the cache, the stamps

Files: `Spixi/Utils/SpixiContentPage.cs` · `Spixi/Pages/Chat/SingleChatPage.xaml.cs` ·
`Spixi/Pages/Home/HomePage.xaml.cs` · `Spixi/Pages/MiniApps/AppNewPage.xaml.cs` ·
`Spixi/Lang/SpixiLocalization.cs` · `Spixi/App.xaml.cs` · `Spixi/Platforms/Android/WebViewRenderer.cs`
· `Spixi/Utils/SDevSeed.cs` · `Spixi/Pages/Settings/SettingsPage.xaml.cs`.

Questions to break:
1. **`armPresentOnPainted` / `onPainted` / the 400 ms backstop** — every ordering: painted before
   arm · arm before painted · painted never (stale shell) · two `onChatScreenLoaded`s (channel
   switch) · the page abandoned mid-stage (`op.abandoned`) · the page parked · the 4000 ms
   preload timeout racing the backstop. Can any order present TWICE, present a DEAD page, or
   leave a page INVISIBLE? Is `signalPreloadReady` truly idempotent through `tryFinish` on every
   path (park · modal · overlay · fallback push)?
2. **`revealDelayMs: 0` on chat + the three form pages (#766)** — is there any push AFTER onload
   on those pages on ANY platform (iOS keyboard inset? `setCaps`? theme?) that now paints late?
3. **The localized-document cache** — every mutation of `localizedStrings` bumps
   `dictionaryVersion`? (grep for every write: `loadLanguage`, `addCustomString`, and anything
   that assigns the dictionary directly.) A page whose carrier is written AFTER its
   `generatePage` (find one) would serve a stale value — was that true before the cache too?
   Windows: `File.Exists` after a failed write; the `ll_*.html` under `Documents\Spixi\html`
   surviving a wipe (#663) — is the version map's "fresh" claim ever true for a file the
   PREVIOUS process wrote? (It should not be: the map is per-process.)
4. **`[WV2]` / `[CDPERF] appnew` / `ctor tap=`** — fixed words + integers only? A page file name
   is logged — is `loadedHtmlFileName` ever user-influenced? `pendingTapTicks` is a static
   shared by every chat open — two taps in flight?
5. **The Session I/J C#** never reviewed: the L14 cover handshake (`popOnCoverPainted`,
   `coverPainted`, the 400 ms backstop, `coverWaitSeq`), the console mirror (`#if` scope), the
   `OnConsoleMessage` forwarding (400-char cap, mini-app WebView excluded — prove the `ClassId`
   test cannot be spoofed by a page), `SDevSeed` v2 (compiled out of store builds — prove it),
   `hourCycle`, the `kbtray` native lever sites.
6. Security-gate lens on all of it (`docs/security-handover-gate.md`, Sessions I–K rows): any
   new verb with a payload? any new sink? any log line carrying a name, an address, a text?

## Auditor B — JS: shells and components

Files: `src/shells/chat.html` · `src/shells/home.html` · `src/shells/settings.html` ·
`src/components/attach-sheet.js` · `composer.js` · `message-bubble.js` · `apps-menu.js` ·
`apps-shell.js` · `desktop-anchors.js` · `chat-info.js` · `settings-shell.js` · `reactions` ·
`src/bridge/native.js`.

Questions to break:
1. **K1 hold** (`openAttachTray({ hold })` + `handKeyboardToTray` + `revealAttachTray`): a back
   press inside the 450 ms · a second ⊕ tap inside it · the field re-focused inside it · a
   resize that is NOT the keyboard leaving (rotation, split-screen) · `kbUp` stale (iOS path
   sets it from the native inset; Android from the shrink) — can the tray be revealed under a
   keyboard that is still up, or never revealed with the composer stuck on `data-tray-open`?
2. **The tray re-pin** in the `--composer-h` ResizeObserver: `nearBottom()` judged before the
   padding lands — is that ordering guaranteed on every engine (the observer runs before the
   style write in the same callback, yes; but the NEXT observer tick reads the new geometry)?
   Does the re-pin fight `stickDuring` / the AND-16 re-pin / `bootRepin`? A reply strip or the
   cost line growing the slot mid-scroll now re-pins a reader at the bottom — intended?
3. **`ixian:painted`** on every `onChatScreenLoaded` (channel switch, re-flush) — harmless by
   C#'s latch; prove the shell cannot send it BEFORE `bridge.ready()` and that the outbox
   serialization (#N75) cannot drop it behind `ixian:back`.
4. **Apps ⋯ anchored + clear scrim**: `anchorSheetToRow` with an app row (no `data-address`
   → the detached-row fallback is dead; fine) · the `[data-dt-clear]` rule now applies on mobile
   — grep every OTHER caller of `clearScrimFor` and every sheet that could carry the tag: does
   any mobile sheet lose its wash unintentionally? The apps menu's outside-tap dismissal on a
   transparent scrim — still a scrim element, still dismisses?
5. **`--bubble-avatar-size` read once and cached** (`bubbleAvatarSize`) — a theme/preference
   change that alters the token at runtime (chat text scale?) is not re-read; is the token ever
   runtime-mutable? The `data-gutter` row re-homes `--bubble-row-inset` — chat-select's tick,
   the swipe/lift ghost, the RTL mirror: measure them on a gutter row.
6. **The Session I/J JS** never reviewed: `kbUp` + `--kb-slot-h` persistence (`spixi.kb.slot`,
   #254-clean?), the `focusComposer` arm (no blur-then-focus), the mention picker, the
   emoji-only sticker flag detector, `CARET_WITHOUT_KEYBOARD` machinery left in place, the
   `[SCROLL]` probe (a rAF loop per scroll burst — can it leak? it self-terminates at 250 ms
   quiet; prove a scroll that never goes quiet does not keep two loops).
7. `#758/#750` dark/light canvas + the pattern-ink alpha ladder in CSS (N81's structural half).

## Auditor C — CSS/tokens + the gates and pins

Files: `src/styles/tokens.css` · `src/styles/components/*.css` (message-bubble, reactions,
overlay, avatar, composer, attach-sheet, settings-*) · `scripts/smoke-test.mjs` (the Session I/J/K
blocks) · `scripts/build-shells.mjs --check` · `scripts/build-demo-bundle.mjs`.

Questions to break:
1. **Dark on-action white + surface 600** — every consumer of `--text/--icon-neutral-on-action`
   (13 sheets): which of them sit on a surface that is NOT `--surface-action-default` (chips?
   the bottomnav badge? the callbar? chat-select?) and now read white on a light fill? Contrast
   table for each, both themes.
2. **`[data-gutter]` + `--bubble-avatar-inset`**: the cascade pin family in message-menu.css
   asserts one value per property across matching rules — does the new rule violate it? The
   #46-§0 cascade helper: run it on `.c-bubble-row`.
3. **The received-sticker pill rule**: same specificity, later in source — pinned by index; a
   future reorder breaks it silently. Is there a computed-style leg possible?
4. **Every Session I/J/K pin**: is it VACUOUS? (Five were, on the first pass, in Session H's
   predecessor.) Mutate each one whose regex could match a comment, a docblock, or an unrelated
   line. The two set-pins ([SCROLL] · [WV2] · appnew) and the "all present or all gone" shape —
   can a HALF-removal pass?
5. `build-shells --check` and the bundle's NUL gate — still fail-loud after Session K's edits?
   Run mutation C-1 from Session H again (strip a feature from the built shell only).

## Non-negotiables (do not re-litigate; verify they HOLD)

- ★ chat = its own WebView; no JS between panes; coordination C#-only (#221).
- Money: nothing in this delta touches signing or the wallet (assert by grep, then by read).
- The lock and the call surface stay mutually exclusive; the lock wins (#272).
- Damir's rulings stand as written: T1 32 · dark 600 · apps no-dim · form pages present at
  onload · the light/dark canvases · #766.

## Accepted dials (logged, not findings)

- The chats-list flush is ~60 evals (A1) — gets a `[CDPERF] chats` pair, not a fix, this loop.
- The data pages keep their 120 ms hold until the painted signal generalizes (Session L build).
- `[SCROLL]` drop threshold 32 ms is 4 frames at 120 Hz — harsh on purpose.
- RAM: 3–4 WebViews + the runtime; the FE lever (release the parked Account under pressure) is
  a Session L+ build, not a review finding.

## Verdict (append here)

_(pending — Session L)_
