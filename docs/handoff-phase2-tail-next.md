# Handoff → next session: Phase 2 tail is DONE (a11y · copy · dark-log · contacts-on-desktop). Next = Phase 3 integration.

> **Damir, on the PC FIRST (sandbox can't build — #142 bit hard this session):**
> run the build + smoke chain below and eyeball, then **commit via GitHub
> Desktop.** Then a fresh chat starts Phase 3. See DECISIONS **#171** for the full
> batch record.

Boot ritual for the fresh chat: `CLAUDE.md` → `DECISIONS.md` (latest rows, esp.
**#171**) → this file.

## What this session did (Phase 2 tail — all five items)

- **[A1] cleared (a11y).** The desktop chat-info ⓘ toggle now exposes
  `aria-expanded` (synced open/close) + `aria-controls="chat-info-panel"`, wired
  in the composition layer — the frozen topbar/button components are untouched.
  Broader sweep found the shells already sound (`role=switch`, `aria-pressed`,
  `aria-live`, focus management, `aria-hidden` glyphs). Two demo-composition
  a11y notes logged, not fixed (divider is drag-only; launch pills use
  `aria-haspopup` without `aria-expanded`).
- **Copy sweep.** Only real drift = two ASCII apostrophes (`Sender's` /
  `Recipient's`) vs the dictionary-wide curly `’` — fixed at source
  (`wallet-shell.js`) + the generated `en-us.{js,json}`. Copy-morph honesty is
  clean. Three brand/technical **honesty flags await your call** (see below +
  `docs/copy-sweep-phase2.md`).
- **Dark-mode deviations log** → `docs/dark-mode-deviations.md`. Verdict:
  token-driven, swaps cleanly, no rogue raw colors. The `.c-txsheet` inline
  tx-detail sits on `--surface-screen` (not `--surface-menu`) — token-correct,
  an eyeball item for your dark pass.
- **B2 icons — verified DONE** (you'd already exported + swapped them): world /
  lock / user-plus / user-circle-filled / shield-lock all registered at HEAD.
  (An earlier "world missing" reading was a stale-mount artifact.) Scan torch
  `eye` stand-in still parked (no bulb/flashlight glyph).
- **Contacts-on-desktop §6a.** Incoming contact requests now live in the left
  (list) pane of `desktop.html`, reusing the frozen `createContactRequest` + the
  #109 staged-handshake semantics. **Guarantee preserved structurally:** a
  pending/handshaking row is never added to `rowEls`, so it can't be opened;
  the detail pane stays on "Select a chat" until handshake-complete. +`leia`
  CONVOS/CONVOS_INFO entries. Smoke +~10.
  - **Post-demo fix (Damir spotted):** `desktop.html` was missing the
    `contact-request.css` link, so the request row rendered unstyled (name + sub
    collapsed). Added the link + added `contact-request.css` to the smoke
    CSS-link guard (the "chip.css lesson") so a missing link now fails the suite.

## Audit outcome

Fresh-eyes adversarial review (subagent, read via file tools to dodge the stale
mount) = **no MAJOR issues**; the §6a guarantee holds, no new bridge verbs, the
only frozen-component edit is the wallet-shell apostrophe copy. One MINOR fixed
(added `CONVOS_INFO.leia` so Leia's ⓘ doesn't toast "not wired"). NITs left as-is
(cosmetic).

## Damir PC steps (PowerShell, `Spixi` subfolder, no `&&`)

```
node scripts/extract-strings.mjs        # apostrophe fix — should regen en-us with NO diff (idempotent)
node scripts/build-strings-iife.mjs     # propagates the curly ’ into the demo strings.iife.js
node scripts/build-demo-bundle.mjs      # wallet-shell.js changed → rebuild spixi.iife.js
node scripts/smoke-test.mjs             # expect ALL green (incl. new [A1] + §6a assertions)
node scripts/verify-locales.mjs         # unaffected — expect ALL LOCALES CLEAN
```
Eyeball `src/demo/desktop.html`: open a chat → the ⓘ toggles the right info
panel (aria-expanded flips). In the chat list, the **Leia Organa contact
request** at the top → **Accept** → row goes "Accepting…" → a handshaking row
("Establishing…", busy, un-clickable into the pane) → after ~2.6s it becomes a
normal openable chat; **Decline** confirms then removes it. Confirm you canNOT
open the chat window during the handshake. Also check both light/dark (see
`docs/dark-mode-deviations.md` eyeball list). Then commit via GitHub Desktop.

## Honesty flags — RESOLVED (Damir, 2026-07-06): no copy changes

1. "**quantum-secure handshake**" → KEEP (crypto is genuinely post-quantum;
   consistent with the secure-notice copy).
2. "**No servers, no middlemen**" → KEEP (intended brand framing).
3. "**your PIN**" vs "**PIN or biometrics**" → LEAVE for now. The distinction
   comes from the security-level tiers, isn't wired, and isn't in the launch
   version. **Deferred follow-up:** when tiers/biometrics land, align
   `deleteAccountBody` / `deleteWalletBody` to "PIN or biometrics".

See `docs/copy-sweep-phase2.md` for the full record.

## Next task (fresh chat) — Phase 3 integration

Per `finalization-roadmap.md` Phase 3: this is where the demos become the app —
`ARCHITECTURE §9` BE-ask sync table · `src/bridge/native.js` real-bridge adapter
· **i18n goes live** (SL token channel / `getStrings` bridge, real
`ixian:language:<code>` switch — the 607-key dictionary + 7 locales are ready) ·
Vite build → `Resources/Raw/html` · C# `loadPage` repoint table · device tests →
Phase 4 freeze audit.

## Key files touched this batch
`src/demo/desktop.html` (A1 + §6a) · `src/components/wallet-shell.js` (apostrophes,
#171 flag) · `src/strings/en-us.{js,json}` · `scripts/smoke-test.mjs` (+~10) ·
`docs/dark-mode-deviations.md` · `docs/copy-sweep-phase2.md` · `DECISIONS.md` #171.
