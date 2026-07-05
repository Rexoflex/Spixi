# Handoff — Account/Settings shell Opus round done → next slice (2026-07-05)

For the next conversation (fable). Read `CLAUDE.md`, then `DECISIONS.md` #150 + **#151** (this round), then this file.

## Status: settings shell #146–#150 is audited CLEAN

The Opus adversarial round over the Account/Settings shell (hub · backup · danger
· sub-screens · the #148/#149/#150 chat-info harmonization) ran the full loop —
4 disjoint audit agents → fixes → fresh-reviewer agent → CLEAN. Full write-up =
**DECISIONS #151**. Behavior is unchanged where it was supposed to be; only bugs
and dead code moved.

### What changed (eyeball in GitHub Desktop)
- `settings-shell.js` — the #141-m4 contract (a synchronous throw in a shell
  callback must route to the fail path) was unguarded on almost every async
  control. **9 controls now wrap `try { fn(ctrl) } catch { ctrl.fail() }`**
  (one-shot-safe): app-lock · confirm-payments · nickname · theme sheet ·
  language sheet · avatar sheet · privacy/notifications switch · security-tier ·
  wallet-export. Also **deduped** the two near-identical lock/payment switch
  blocks into one local `authSwitchRow()` helper (net deletion).
- `settings-backup.js` — password modal: **Enter-in-field submits** (guarded
  in-flight); **plaintext scrubbed from the DOM on close** via `onDismiss`
  (SECURITY.md); fail-path restore made explicit; export button got the same
  try/catch guard.
- `settings-screens.js` — switchRow + tier picker try/catch; localStorage
  doc-comment softened (persistence is the HOST's job, must be try/catch'd —
  DomStorageEnabled=false is possible).
- `chat-info.css` — deleted 2 inert rules the disc-harmonization orphaned +
  merged a split `.c-chat-info__txs-list` ruleset (dead-code cleanup).
- `scripts/smoke-test.mjs` — **+12 regression assertions** (sync-throw
  resilience, backup Enter-submit + password-scrub, export-throw). One existing
  #149 guard was order-dependent and I made it order-independent (Damir's first
  smoke run flagged it — now green).

### Verify before moving on
Damir re-runs (assertion-only fix since the last run — no rebuild strictly
needed, but safe to do both):
```
node scripts/build-demo-bundle.mjs
node scripts/smoke-test.mjs
```
Expect green (the one red was the brittle assertion, now fixed). Then a demo
pass on `src/demo/settings.html`.

### Open 🟡 (do NOT block the next slice)
- **RTL switch-knob travel** — `.c-settings__switch-knob` uses `translateX(20px)`
  (not direction-aware); in RTL the "on" knob slides the wrong way (settings +
  chat-info share it). **Damir deferred RTL to a later date** — leave it; fold
  into a whole-app RTL pass.

## Next slice: finish the Account shell (Phase 1 item 1 remainder)

Per `docs/finalization-roadmap.md` §Phase 1: the Account shell's hub rows for
**Downloads · Developer (dev-log) · Contributors** already exist and route to
shell callbacks (`onDownloads` / `onDev` / `onContributors` in
`createSettingsHub`) — the screens themselves are the remaining build. Roadmap
notes them as "90% list/toolbar — cheap." Do these before Contacts.

### Head start for that slice
- **Grammar to reuse (no new component types):** `.c-settings__group` cards,
  `.c-disc` atom, `settingRow`, `u-scroll` body with the `> * { flex:none }`
  guard, `createTopbar({variant:'view', onBack})`, the danger `confirmAction`
  locked-alertdialog pattern for any destructive row (e.g. clear downloads
  reuses `ixian:deleted`).
- **Bridge inventory:** `docs/audit/bridge-audit-B.md` (Settings · Downloads ·
  Dev · Contributors + base class). Bridge is FROZEN — anything missing is a
  §8/§9 proposal, not a new `ixian:` command.
- **Known §9 asks already logged** (settings-shell-spec §8): version string for
  the About row (no bridge push exists), `ixian:deleteh` auth-gate question,
  language-list source.
- **Interview Damir first** on the unknowns (what the dev-log screen shows —
  live log tail vs export; contributors = static list vs fetched; downloads =
  list + clear + open-file affordances) before building.

### After that (roadmap order)
Contacts (add-contact + profile — profile already exists via `createChatInfo`
`context:'contact'`) → Scan → Lock (SECURITY.md checklist mandatory) →
Launch/onboarding (folds in `illustrations-plan.md` + backup onboarding tail).

## Working agreements (unchanged, #142)
Code-first: spec (interview Damir on unknowns) → build on mock bridge + smoke
assertions → Damir runs build+smoke locally → demo pass → DECISIONS row →
commit. **No sandbox builds/e2e** (mount truncates files; wastes budget). Use
file tools (Read/Edit/Write) for all source; bash/node/git read stale/truncated
copies here.
