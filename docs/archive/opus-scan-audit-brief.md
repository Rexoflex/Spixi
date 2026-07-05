# Opus audit brief — Scan batch (Phase 1 #3)

> **ENTRY POINT MOVED:** the Lock batch (#159) landed in the same session —
> Opus runs ONE combined loop via `docs/opus-scan-lock-audit-brief.md`. Read
> THAT first; this file remains the scan-detail annex (scope table, hard-look
> list, known/parked).

Point Opus at this file. Run the **#46 audit loop** over the Scan batch:
read-only adversarial audit (findings with file:line) → fixer pass → fresh
adversarial reviewer → loop fix↔review until CLEAN. Damir reviews the diff in
GitHub Desktop after.

## Boot ritual

`CLAUDE.md` → `DECISIONS.md` rows **#151–#158** (NOTE: rows were RENUMBERED at
the #157 merge row — contacts build is now #155, its audit loop #156) →
`docs/scan-spec.md` (locked picks + bridge mapping) → this file.

## Scope (built by fable 2026-07-05/06 on the PC, smoke NOT yet run, unaudited)

| File | What it is |
|---|---|
| `src/components/scan-shell.js` | NEW — `createScanView` (prompt/denied/scanning states, torch, permission ctrl) + free fns `setScanState` / `deliverScanResult` (one-shot decode, hazard gates) |
| `src/styles/components/scan-shell.css` | NEW — fixed-dark camera bed (sanctioned raws, --surface-qr fixed-pair precedent), bracket frame + scrim cutout, torch chip, card on bed, success flash |
| `src/demo/chats.html` | add-contact scan stub → real takeover; deterministic permission mock (1st Allow DENIES); `demo-scan-sim` decode button; `openAddContact` restructured to hold the add element |
| `scripts/smoke-test.mjs` | +~22 assertions (`chats.html — scan shell` block + static guards) |
| `scripts/build-demo-bundle.mjs` | +1 FILES entry (scan-shell after contacts-shell, before settings-shell) |
| `docs/scan-spec.md` | Spec — check code ↔ spec drift too |

## HARD CONSTRAINTS for fixers

1. Merge-safety is LIFTED (#157) — settings files MAY be touched if a finding
   genuinely crosses into them, but prefer batch-local fixes.
2. Bridge is FROZEN — the batch emits only `ixian:qrresult:<text>` + `ixian:back`
   (bridge-audit-B.md §5); missing capability = §8/§9 proposal, never a new verb.
3. Mechanical fixes land directly; architectural findings = 🟡 DECISIONS rows.
4. **Verification per pass — THIS IS A PC-SESSION BATCH (#142): the sandbox
   mirror may serve stale reads. DAMIR runs `node scripts/build-demo-bundle.mjs`
   then `node scripts/smoke-test.mjs` (PowerShell, `Spixi` subfolder, no `&&`)
   and pastes output between passes.** If the session verifies the Mac-mirror
   rule applies instead, in-session runs are fine (#155 precedent).

## Where to look hard (jsdom is layout/paint-blind)

- **The one-shot decode latch vs view lifecycle:** `delivered` never resets —
  correct per allowScanning? Check the host-close race: onDecode fires at
  +350ms; a cancel (back) in that window → onDecode still fires into a removed
  panel (`closeScan` then `setAddContactAddress` on a live `add` — but what if
  the ADD panel was closed too?). Wedge/no-op paths with file:line.
- **Permission ctrl races:** double-click on Allow during the in-flight window
  (`st.requesting` latch); ctrl resolving AFTER the view was removed;
  `setLoading` restore vs sync() relabel ordering (label overwritten while the
  spinner is up?).
- **Torch:** optimistic flip + `torchBusy` — rapid taps; ctrl.done arriving
  after a second tap started; aria-pressed truth vs actual mock state.
- **Fixed-dark bed CSS:** contrast of on-camera inks (raw whites) in BOTH
  themes over `--surface-card` edges; the 9999px box-shadow cutout on WebView
  baseline (conservative-CSS rule); `inset-inline`/`margin-inline` support.
- **Hazard gates:** payload trim semantics (leading/trailing only — is an
  inner-whitespace payload legit?); the `ixian:qrresult:` literal check —
  case sensitivity vs C# `Contains`; should the drop be silent or hinted?
- **A11y:** role=status hint updates (scanning → scanned); torch aria-pressed
  + label; card CTA focus after prompt↔denied relabel; focus trap/restore on
  the takeover (demo `openPanel` has no trap — carried backlog from #156, do
  not re-open, but check the scan view itself doesn't make it worse).
- **Entry symmetry:** `setAddContactAddress` unlatch/inflight interplay
  (#156-F5) with a QR result arriving mid-send or post-success.
- **Spec drift:** scan-spec.md §2 table vs code; Damir flags §5①–④ are HIS
  calls — leave them.

## Known/parked (do NOT re-flag)

- Torch glyph = `eye` stand-in; denied disc = `eye-off` (no bulb/flashlight in
  the registry — icon gap, spec §5①, B2 export queue).
- Camera-flip deferred to device testing (Damir pick).
- No OS-settings deep link (no bridge verb — would be a §8 proposal).
- Real camera/permission plumbing = Phase 3 (`native.js`, html5-qrcode mount
  in `.c-scan__feed`).
- Demo first-Allow-denies is a DELIBERATE deterministic mock (spec §4).

## After CLEAN

Update the batch's DECISIONS row (#158) with the audit outcome + backlog,
have Damir rebuild bundle + smoke one last time, and list the
eyeball-in-Desktop files.
