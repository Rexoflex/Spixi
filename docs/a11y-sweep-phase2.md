# A11y focus/SR sweep — Phase 2 tail (2026-07-08)

Keyboard + screen-reader sweep across `src/components/*.js` and `src/shells/*.html`.
Method = static audit (read-only agent, file:line) against the clean working tree;
no sandbox render (#142). Verdict below, one code fix landed, minors documented.

## Verdict: the component library is clean; one shell overlay was the gap

The shared overlay layer (`overlay.js`) is the gold standard — role/`aria-modal`,
focus-move-in, Tab-trap + `focusin` containment, Escape, focus-restore, scroll-lock.
**Every component-level overlay routes through it and inherits all five for free**
(`sheet.js`, `modal.js`, `message-menu.js`, `chats-row-menu.js`, `attach-sheet.js`,
`channel-sheet.js`, `member-sheet.js`, `tip-sheet.js`, `media-viewer.js`,
`call-overlay.js`, reactions inspect sheet). Icon-only controls, decorative images,
form labels, and live regions are all handled correctly and consistently — see the
"Verified good" list. The real gap was **one** overlay hand-rolled inside the chat
shell that bypassed the shared stack.

## FIXED (mechanical) — chat shell channel selector

`src/shells/chat.html` · `openChannelSelector` / `closeChannelSelector` /
`makeChannelRow`. This is Damir's top-anchored channel dropdown (Option A, F5
2026-07-08) — a bottom-sheet replacement built by hand, so it did not go through
`overlay.js`. It already had a `role="menu"` panel + label + Escape + scrim-click;
it was **missing** focus-move-in, Tab-trap, `focusin` containment, focus-restore,
and modal semantics.

Added, mirroring the `overlay.js` house style (kept the top-anchored visual — did
NOT reroute through the bottom-sheet stack):

| Behavior | How |
|---|---|
| Focus moves into the panel on open | `panel.setAttribute('tabindex','-1')` + `panel.focus()` after open (rows load async, so the panel itself takes focus first) |
| Tab is trapped | keydown handler cycles `channelFocusables()` (first↔last wrap), matching `overlay.js:44-71` |
| Focus can't escape | document `focusin` handler bounces anything outside `channelDropdown` back in |
| Modal semantics | panel is `role="dialog"` + `aria-modal="true"` (review fix — `aria-modal` is invalid on `role="menu"`, and a Tab-trapped labeled list IS a dialog, not an APG menu; rows stay plain `<button>`s, Tab-navigable) |
| Focus restored to the title trigger on close | `channelReturnFocus = document.activeElement` at open → restored in `closeChannelSelector`, guarded to only move focus that's ours (inside the closing overlay or on body), like `overlay.js:140-150`. |
| Focus after a channel is picked | row-select coalesces a topbar rebuild that detaches the old trigger; a `focusTitleAfterRender` flag lands focus on the NEW channel-title button in `renderTopbarNow` (review MINOR-2 — restore raced the rAF rebuild and dropped focus to `<body>`). |
| Exiting-overlay hardening | `pointerEvents:none` on the closing overlay so its stale scrim can't catch a click during the ≤260ms teardown (review NIT). |

The demo (`src/demo/chat.html`) uses the `channel-sheet.js` **component** (already
correct via `createSheet`), so this divergence was shell-only and untouched there.

## DEFERRED — 🟡 needs Damir's call (DECISIONS #205)

**Idiomatic ARIA radio-group keyboard pattern.** `segGroup`/theme cards/option
sheets render `role="radiogroup"` + `role="radio"` on native `<button>`s with
`aria-checked` maintained — **fully operable today** (Tab to each, Enter/Space to
select). They do NOT implement roving-tabindex + Arrow-key navigation (each radio
is its own tab stop). Sites: `settings-screens.js:60,323` · `settings-shell.js:104,177`
· `chat-info.js:404`. Reference to copy: the correct tablist in `launch-shell.js:293-322`.
Recommendation: a shared `rovingRadioGroup(container)` helper applied to all five.
Deferred because it's a **keyboard-behavior change across 5 sites**, priority minor,
pre-freeze — Damir's sign-off first (audit-loop rule: architectural findings → 🟡
row, not a silent sweep).

## Verified acceptable — no change (would be churn)

- **Failed-message caption** (`message-bubble.js:320,344`) — the "Not delivered ·
  Tap to retry" `<span>` has a redundant pointer click handler but no
  role/tabindex/keydown. Left as-is: an adjacent keyboard-accessible `<button>`
  (`:333-338`, `aria-label` "Retry") provides the identical action, and the caption
  text stays readable to SR users. Touching Damir's tuned failed-bubble layout
  (2026-07-03) for a redundant pointer target is not worth the regression risk.
- **`role="switch"` / `role="checkbox"` on native buttons** (`chat-info.js:352`,
  `settings-screens.js:116`, `settings-shell.js:606`, `contacts-shell.js:135,618`)
  — focusable + Enter/Space operable, `aria-checked` maintained. Correct as-is.
- **`callbar.js`** appears silently (per-second timer deliberately not announced).
  Optional `role="status"` on the appearing label was considered and left out — the
  bar is a persistent control, not a transient announcement. Not a blocker.

## Verified good (the house style — do not re-touch)

- **`overlay.js`** — the focus manager every overlay should route through.
- **`icon()` (`icons.js:101-102`)** — decorative-by-default (`aria-hidden`);
  interactive controls carry their own `aria-label`. This is why no icon-only
  control lacks a name (topbar/composer/media-viewer/callbar/scroll-latest/…).
- **`launch-shell.js:293-322`** — correct tablist (roving tabindex + Arrow keys).
- **Live regions** — `toast.js:41` (`role="status"`), `typing-indicator.js:24`,
  `banner.js:15` (covers `showWarning`/connectivity), `topbar.js:59` sub-line
  (`aria-live="polite"`), `chat.html:170` log (`role="log"`), `apps-add.js:53`
  (`role="alert"`), `scroll-latest.js` (count folded into the button `aria-label`).
- **Images** — every generated `<img>` is `alt=""` with the name carried by context
  (`avatar.js:66`, `apps-icon.js:48`, `media-bubble.js`, `bottomnav.js:34`).
- **Form controls** — every input/textarea is labeled (`aria-label` or `<label for>`).
- **No positive tabindex, no inline `outline:none`** anywhere in `src`.

## Regression guard

`scripts/smoke-test.mjs` gained a static-read block asserting the shell channel
selector carries `role="dialog"` + `aria-modal`, `channelFocusables`, the Tab trap,
the `focusin` containment, and `channelReturnFocus` restore (the shell isn't
jsdom-loaded, so this is a source-marker guard, consistent with the existing
static-read assertions).

## Post-fix review

An adversarial #46 pass (7 focus-management failure modes) found **no MAJORs** —
listener lifecycle, focusin loop guard, empty-list trap, null-safety, and
re-entrancy all sound. Two MINORs + one NIT it raised were fixed in-session (the
row-select focus race, the `menu`/`aria-modal` semantic mismatch → `dialog`, and
the exiting-scrim window). Clean.
