# Opus audit brief — Contacts batch (Phase 1 #2)

Point Opus at this file. Run the **#46 audit loop** over the Contacts batch:
read-only adversarial audit (findings with file:line) → fixer pass → fresh
adversarial reviewer → loop fix↔review until CLEAN. Damir reviews the diff in
GitHub Desktop after.

## Boot ritual

`CLAUDE.md` → `DECISIONS.md` rows **#146–#153** → `docs/contacts-spec.md`
(the batch spec: locked picks + bridge mapping) → this file.

## Scope (the whole batch — built by fable 2026-07-05, smoke GREEN, unaudited)

| File | What it is |
|---|---|
| `src/components/contacts-shell.js` | NEW — `createContactsPicker` (purpose 'start'/'directory' + mode/selection free fns) · `createAddContact` (+`setAddContactAddress`) · `createGroupSetup` (+`setGroupAvatar`) · `createPendingContact` (minimal non-friend profile) |
| `src/styles/components/contacts-shell.css` | NEW — settings card/row grammar, LOCAL classes; local switch copy; pending hero |
| `src/demo/chats.html` | FAB → start picker · topbar Contacts → directory (tap = details: chat-info contact context / pending profile) · mock roster/bridge · add + group flows (start-sheet code REMOVED) |
| `scripts/smoke-test.mjs` | +40 assertions (`chats.html — contacts flow` block + static guards) |
| `scripts/build-demo-bundle.mjs` | +1 FILES entry (contacts-shell after chat-info) |
| `docs/contacts-spec.md` | Spec — check code ↔ spec drift too |

## HARD CONSTRAINTS for fixers

1. **MERGE-SAFETY (DECISIONS #152):** do NOT touch `settings-shell.js`,
   `settings-screens.js`, `settings-backup.js`, or settings wiring in
   `settings.html` — an uncommitted PC batch merges into those. New/changed
   code stays in the batch's own files (+ shared files only if unavoidable —
   flag loudly if so).
2. Bridge is FROZEN — findings against `bridge-audit-A.md` §3/§14 grammars;
   missing capability = §8/§9 proposal, never a new `ixian:` command.
3. Mechanical fixes land directly; architectural findings = 🟡 DECISIONS rows.
4. **Verification per pass (works IN-SANDBOX on the Mac — verified 2026-07-05,
   jsdom already in gitignored `node_modules/`):**
   `node scripts/build-demo-bundle.mjs` → `node scripts/smoke-test.mjs` → CLEAN.

## Where to look hard (jsdom is layout/paint-blind — CSS passes found the #143/#144 MAJORs)

- **Layout traps:** nowrap flex items without `min-width:0` (the #140③ class);
  shrinkable children of scrolling flex columns (#148③/#150① class — bodies have
  `> * { flex:none }`, check nothing needs to shrink); footer CTA vs `.u-scroll`.
- **Contrast/both-modes:** every token pair used exists in BOTH modes
  (`--switch-track-off/--switch-knob`, `--disc-*`, `--icon-neutral-on-action`
  on the check circle, `--text-error` on cards); disabled-row opacity on
  `--surface-screen` vs card.
- **One-shot/ctrl grammar:** contactsCtrl parity with settingsCtrl; #141-m4
  try/catch on onSendRequest/onCreate/onPickAvatar/onCheckAddress — smoke
  covers throw paths, review DOUBLE-fire and reentry (send latch `inFlight`,
  avatarBusy, Enter-key vs click races, debounce timer leak on panel close).
- **Stale-reply guard:** add-contact `checkAddress` compares input value —
  check the trim mismatch case (`input.value.trim() === v`).
- **Picker re-render churn:** mode switch replaces topbar + rows — focus loss,
  listener leaks, `pickerState` WeakMap on removed panels, search value
  surviving re-render (query kept in state but the field is NOT re-created —
  verify list/query stay in sync after mode flips).
- **Selection semantics:** `setPickerContacts` dropping selections; dedupe of
  addresses; group-setup `onMembersChange` → `setPickerSelection` loop.
- **A11y:** multi rows use `aria-pressed` on a button (vs role=checkbox — call
  it); Pending badge not announced as state; `role="status"` ✓ line; switch
  `aria-labelledby`; focus order into/out of takeovers; toast-only feedback.
- **RTL:** logical properties audit; KNOWN carried: switch knob `translateX(20px)`
  (#151 — shared caveat, deliberately deferred to the whole-app RTL pass; do
  not fix here, just confirm the comment stays).
- **Demo honesty:** mock bridge timings, `openConversation` duplicate-row
  guard (name OR address match — address-less CHATS rows), `onModelChange`
  badge refresh, group rows created without addresses.
- **Directory reuse of chat-info:** the chats demo mounts `createChatInfo`
  with minimal opts (`capabilities:{}`, empty txs/media) — check nothing in
  the audited chat-info path assumes chat-context data it isn't given.
- **Spec drift:** anything the code does that `contacts-spec.md` doesn't say
  (or vice versa) — fix the doc or the code, log which.

## Known/parked (do NOT re-flag)

- `user-plus` icon missing from the registry — `user-circle` stands in
  (Damir export queue, spec §3a note).
- Pending flag absent from roster `addContact` — §9 ask (spec §2).
- #151 RTL knob travel — carried, whole-app pass.
- Scan button stubs to a toast — Scan shell is Phase 1 #3.
- Damir demo-pass flags ①–④ in spec §7 are HIS calls — leave them.

## After CLEAN

Update the batch's DECISIONS row (#153) with the audit outcome + backlog,
rebuild bundle + smoke one last time, and list the eyeball-in-Desktop files.
