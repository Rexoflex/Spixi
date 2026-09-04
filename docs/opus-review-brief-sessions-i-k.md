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

## Verdict (appended — Session L, 2026-09-04)

# ★★ CLEAN — after FIVE rounds. Closing suite 4067 / the 3 known.

**Protocol run as ordered.** 3 disjoint read-only auditors (C# · JS · CSS+pins) → 2 verifiers
(which REFUTED four findings and ELEVATED one nobody had) → 3 fix agents on disjoint files →
a central pin pass → **four** fresh break-my-verdict reviewers, each over the *previous round's
fixes*, never over the delta. Verdicts in order: **r1 NOT CLEAN** (2) · **r2 NOT CLEAN** (5) ·
**r3 NOT CLEAN** (4) · **r4 NOT CLEAN** (1, prose) · **r5 CLEAN**.

Numbers: smoke **4040 → 4067** (+27 pins) / the 3 known (#136 · M5 · B3), WITH the Ixian-Core
sibling present · bundle 321 · shells 18 · cs-syntax 141 + 1 known gap · locales ALL CLEAN 786 ·
i18n-lint ✓ · pseudo 9/9 · extract-strings / build-shells / build-legal-docs `--check` ✓
(terms baked · privacy HELD 🟡) · Ixian-Core **097341a untouched** (`git status` empty).
Mutation: every pin added or repaired was killed by its own mutation in a full `cp -r` copy
(bundle + shells rebuilt inside the copy where a component or shell moved). The final reviewer
ran 15 mutations across all four rounds and all four owners; none passed.

## The three MAJORs (DECISIONS #768 · #769 · #770)

1. **The Windows freshness map certified a previous build's document as fresh.** Not reasoned —
   MEASURED on Damir's machine the same morning, from two reports that turned out to be one
   cause: Add app 404, and a light Account pane under a dark system theme. `localizeHtml`
   returned void; `generatePage` gated freshness on `File.Exists` and handed back the URL
   regardless. Session K's version map cut the only diagnostic from once-per-open to
   once-per-process — it quieted the failure that fails *silently*. And `copyResources()`,
   uncaught in the `App()` constructor, would have hard-crashed the app on the same folder.
2. **Damir's white-on-blue ruling was applied to a token ten surfaces read** — mute label
   **1.14:1**, six more between 1.87 and 2.63. The existing pin checked the token's value and
   never asked who consumed it. No fill changed; only the ink, by role.
3. **A rotation persisted a keyboard height that fills the screen**, and latched `kbUp` so ⊕
   waited out the 450 ms backstop. Two gestures on a stock phone.

## What the loop proved about itself

★ **Two of the three MAJOR fixes were broken by the next reviewer.** The round-2 shape guard
suppressed the `kbUp` CLEAR as collateral; round 3's width/orientation discriminator could not
see a portrait split-screen, whose divider is horizontal. Geometry cannot separate a keyboard
from a window resize under `adjustResize` — the discriminator had to become semantic (a soft
keyboard cannot exist without a focused editable). **#512 is not a formality.** A self-reviewed
batch would have shipped every one of those five rounds.

★ **The governing defect (#771): a sweep over raw text is satisfied — or defeated — by the
comment that explains it.** Found four times, starting with a `[SCROLL]` set pin that a
**docblock** satisfied: green when the emit was renamed away, red on the sanctioned retirement.
Wrong in both directions, one pin below the `stripCode` docblock naming that exact hazard.

★ **Nine false invariants (#772)** — four in the delta, **three introduced by the fixes**, one
inside a pin, and one inside the paragraph that retired rotted citations, which shipped a fifth
rotted citation and whose correction then rotted again when the next round's insertions moved
the target. `file:line` in a comment is now a searchable quoted anchor.

## Answers to the brief's questions

**Auditor A (C#):** present machinery **HOLDS** — every path funnels through `PreloadOp.tryFinish`
(`Interlocked.Exchange`); five call sites enumerated, every escape probed and closed.
`revealDelayMs: 0` **HOLDS** on content (none of the three form pages pushes after onload).
The cache **BREAKS** on Windows → #768. Log lines hold except `[WEBVIEW]`, which forwards
page-authored text (dev builds only; the mini-app `ClassId` test cannot be spoofed, but fails
**open** on a disposed renderer — unreachable because `Control.Destroy()` precedes the client's
dispose). Security lens **HOLDS**: no new payload verb, no new sink, no new fetch; money, the
lock/call exclusion (#272) and the #221 pane boundary untouched by all 37 files.

**Auditor B (JS):** K1 hold **BREAKS** → a 32 px lurch of the composer and the log on every
notched iPhone (Android +2 px, no defect). `ixian:painted` **HOLDS** — and by causality, not
FIFO: C# queues every push until `ixian:onload`, so `onChatScreenLoaded` cannot precede
`ready()`. Apps ⋯ / `clearScrimFor` **HOLDS** — three callers, exhaustively; no mobile sheet
loses its wash. `--bubble-avatar-size` **HOLDS** (one declaration, bare `:root`, nothing writes
it at runtime). The destructure gate covers 17/18 shells; `empty_detail.html` is deliberately
bundle-less and passes anyway when included.

**Auditor C (pins):** `[SCROLL]` **VACUOUS** → #771. The other three set pins forbid a
half-removal, proven by mutation. Cascade **HOLDS** (§0 helper over `.c-bubble-row`: 14 rules,
4 files, one deliberate specificity override). The received-sticker index pin **HOLDS** (the
reorder mutation reddens it). `build-shells --check` catches a same-length substitution in a
built shell; the NUL gate fires. On-action ink **BREAKS** → #769.

## Ledger for whoever runs the next loop

- A behavioural pin that **stubs the function under test proves nothing.** `kbEditableFocused`
  had a source pin and a stubbed harness; a one-token mutation reverted two MAJOR fixes with
  the suite fully green. It now compiles the shipped function and calls it against 13 states.
- **Never let the fixer raise a limit his own prose crossed** without saying so. The `#345`
  ceiling moved 640 → 660 KB in this loop; it was priced (0.08 ms/KB, three measured in-tree
  points) and stated. Headroom is now **1 663 B** — residual #773 ④.
- Recorded residuals live in **DECISIONS #773**, not in an agent's tail message.

_(Loop closed 2026-09-04. Next: the Session L build queue, which this verdict unblocks.)_
