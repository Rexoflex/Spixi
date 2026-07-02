# Chat full audit r2 — 2026-07-03 (Damir-ordered, 3 adversarial agents)

Scope: **everything chat** — message-bubble, typed-bubbles, composer, chat topbar,
avatar, timestamp, chatlist-item coupling, canvas/pattern/tokens, chat.html demo,
spixi.iife.js bundle. Three parallel agents with disjoint lenses:
**A** JS correctness/robustness/bundle · **B** CSS/tokens/contrast (ratios computed
from the actual ramps) · **C** a11y/bridge-contracts/design-fidelity.

Result: 7 unique MAJORs (all FIXED this session), ~20 MINOR/NIT (quick wins fixed,
rest = backlog below), plus a bridge coverage table with real planning gaps.

---

## Fixed this session (source + bundle in lockstep)

### Crash classes (A1, A2 — one bad input killed whole-component rendering)
- `new Date(ts).toISOString()` threw on any malformed bridge timestamp →
  guarded (`isNaN` check) in message-bubble, typed-bubbles ×3, timestamp.js.
  Invalid ts now renders no `<time>` (bubbles/cards) or `''` (list), never throws.
- Invalid BCP-47 `lang` attr (e.g. `en_US`) made every `toLocale*` call throw →
  new shared `docLocale()` in timestamp.js (validates via `Intl.getCanonicalLocales`),
  adopted everywhere.

### Re-entrancy on the money path (A3, A4)
- `setLoading(el, true)` never disabled the button; `[data-loading]` kills
  pointer-events but **keyboard activation still fired onClick** on a processing
  Pay → now disables (remembering/restoring the caller's own disabled state);
  button.css exempts `[data-loading]` from the disabled grey so loading keeps
  its type surface. `createButton` sets `disabled` BEFORE `setLoading`.
- No action had a double-fire guard → two guards in typed-bubbles:
  - `oneShot(fn)` — **state-changing** actions latch (Pay, Decline, Cancel,
    Join, Get app, End session, file Accept): pressed button disables itself;
    **shell contract: the bridge-driven re-render replaces the card.**
  - `reentryGuard(fn)` — **repeatable** actions (Retry, Open, Launch, Resume,
    Details, Call back): 500 ms re-entry window, stays usable.
  - message-bubble failed retry: shared re-entry guard across circle + caption.
  - Demo re-arms latched buttons after 1.2 s (`demoAct`) so it stays playable.

### Dead completed downloads (A5 ≡ C1)
- A progress-created file bubble bound NO handler; at 100% it became an enabled
  button that did nothing, still announcing "Downloading". → createFileBubble now
  binds ONE persistent dispatcher keyed on live `data-state`; `setFileProgress`
  refreshes aria-label + leading glyph (+ failed caption) on state flip, re-arms
  the accept latch, and accepts `opts.strings`. Demo passes `onOpen` at creation.

### Contrast regressions introduced by the PREVIOUS audit's fixes (B1, B2)
- Dark `--icon-bubble-read`: success-600 on primary-400 was **2.34:1** →
  `success-800` (≈4.8:1). ⚠️ Damir eyeball: dark-green read checks on the
  light-blue dark sent bubble — Figma mirror queue updated.
- Light sender-label `L: 34%` still sub-AA at hues 60–180 on white → **28%**
  (worst case ≈4.84:1). Lesson logged: **remediation-loop token picks need their
  own contrast math, validated against the surface they actually sit on.**

### Quick wins also landed
- Failed-stack width chain: `+32px` on both min() branches (bubble was ~62% of
  row on narrow viewports) (B3).
- Canvas scroll thumb: scoped `-03` override (base `-02` was ≈1.1:1 on the
  tinted gradient) (B5). Dark chat-topbar hairline → `-02` (bar + hairline both
  vanished on primary-900 gradient top) (B7).
- `undefined` rendered as literal text for unknown payment role / app state (A7).
- NaN-safe progress clamp (A6); progressbar accessible name (C13).
- Avatar initials `aria-hidden` — SRs read "HS Han Solo" (C11).
- Demo: `tabindex="0"` on the log (keyboard scroll, C12) · animationend filter +
  reduced-motion timeout fallback (A15) · `margin-inline-end` (B11) · statusbar
  glyphs aria-hidden (C20).
- Stale pattern comment in tokens.css (said #87C0E9; asset is white) (B9).
- typed-bubbles docblock no longer claims `updatePaymentRequestStatus` (C2-doc).
- DECISIONS #65 flipped to 🟡 — reactions placement is PARKED for batch 3
  (row said "locked" while CLAUDE.md said "parked"; parked is correct) (C16).

---

## Bridge coverage gaps (agent C table — planning items, NOT code bugs)

| Bridge call | Status | Where it should land |
|---|---|---|
| `updateMessage` / `updateTransactionStatus` / `updatePaymentRequestStatus` / `deleteMessage` | **UNCOVERED** — no in-place updater APIs | Decide: #44-style free fns (`setMessageStatus`, `setPaymentStatus`, `removeMessage` w/ #63 grouping repair) **or** document shell full-re-render. DECISIONS row needed. |
| `setChatMode(type, cost, costText, admin, desc, notif)` | **UNCOVERED** — bot cost line + admin/desc have no slot | Bot-chat surface batch (needs composer cost slot + topbar) |
| `addChannelToSelector` / `setSelectedChannel` / `setChannelSelectorStatus` | **UNCOVERED** | Same bot/channel batch |
| `showContactRequest` (conversation surface) | **UNCOVERED** — accept/decline pane replacing composer; list-row variant exists | Chat shell assembly |
| `ixian:loadmore` | **UNCOVERED** — no scroll-top history pagination hook | Chat shell assembly (batch 3 adjacent) |
| Pay/Decline/Cancel callbacks | UNVERIFIED — no matching `ixian:` command in §3 inventory (only `viewPayment`) | Verify against C# source next bridge pass; likely §8 addition |
| Topbar post-creation updaters (`setNickname`, `showCallButton`, `hideBackButton`, unread back-badge) | PARTIAL — only `setTopbarSub` exists | Small free-fn batch |
| `showUserTyping` / `addReactions` / context menu / scroll-to-latest | PLANNED — batch 3 | — |
| Offer→progress transition (file accept, then?) | Undocumented — shell re-render presumed | Document in ARCHITECTURE §4 note |

Sync this table into ARCHITECTURE.md §9 next session.

---

## Backlog (MINOR/NIT, not blocking — fold into related batches)

- Typed cards hardcode `position="single"`, no avatar gutter → zig-zag against
  grouped text bubbles in group chats (C8; #66 covers identity, not alignment).
- Read vs delivered differ by color only (same glyph) — WhatsApp-convention risk;
  needs a DECISIONS row if accepted (C9).
- Chat-list status icons stay aria-hidden while bubble ones announce (C10);
  list timestamp is a bare span, not `<time>` (C14).
- Insufficient-balance Pay: native-disabled skips tab order; note lacks
  `aria-describedby` (C15).
- tcard action buttons can overflow at <320px viewports (`flex:1` + nowrap;
  add `min-width:0` + ellipsis) (B4).
- Dark received bubble ≈1.17:1 vs canvas, elevation-1 invisible in dark —
  consider neutral-600 surface or dark-only hairline (B8; taste call for Damir).
- Composer attach button 36px unannotated, below target-min without hit-area
  extension (B6) — annotate or extend like `.c-bubble-retry`.
- `chatlist-item` `time.dataset.ts` assumes epoch-ms; Date/ISO input breaks the
  ticker refresh ("Invalid Date" on first tick) (A11). Empty name+address renders
  silently (A12); `sender: ''` reserves a phantom gutter (A13); empty amount
  renders "` IXI`" (A14).
- Call meta `' · 4:12'` leading separator when directionLabel empty (A17);
  file aria-label concatenation not localizable — template keys (A18/C18);
  voice-flag remount discards composer draft (A21); success-window setLoading
  edge (A22); bundle `BADGES` shadowing rename on Mac rebuild (A23);
  demo delivered-swap hardcodes English aria (A19/C22); unread divider
  role=separator vs role=status debate (C22); "Tap to call back" touch-biased
  copy (C21); ticker singleton takeover warn (A20); demo is a 1:1 chat showing
  group-chat sender labels/avatars — misleads reviewers calibrating #63 (C17).

## Checked clean (high-signal)
Bundle structural integrity (single export map, 56 entries resolve, supersede
semantics sound) · icons registry complete for all used glyphs · timers/listeners/
WeakMaps leak-free · #63/#64 fidelity · #68–#71 fixes all present · i18n threading
complete in the five chat components · RTL logical props · motion tokens +
reduced-motion · role=log semantics · sent-meta/badges/amounts/datesep contrast.

## Verification
- New/changed JS syntax-checked (`node --check` on a verbatim copy of the
  supersede section = every JS change; sandbox mirror still serves truncated
  Edit-modified files, so in-place checks are meaningless on the PC).
- **Mac: `node scripts/build-demo-bundle.mjs` + `node scripts/smoke-test.mjs`**
  normalizes the manually-appended AUDIT r2 supersede section.
