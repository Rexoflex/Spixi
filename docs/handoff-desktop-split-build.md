# Handoff → next session: BUILD the desktop split-view batch (Phase 2)

**Read first:** `docs/desktop-split-spec.md` — interview DONE 2026-07-06, all
#0 decisions locked (settings master-detail · wallet hero+list left / detail
right · apps list left / details right · scope = extend `src/demo/desktop.html`
composition, NO component CSS/JS edits, no container queries). Build straight
from it: pane routers (spec §3) → per-shell panes (§2) → smoke block (§5).
Component changes = flags, never silent edits.

## State left by the 2026-07-06 session (this handoff's session)

Landed on the REAL files (Windows side), NOT yet committed or bundle-built:
- Launch finalize task 3 (spec↔code alignment) — `docs/launch-spec.md` fully
  synced to #165 code (§0②/§2.1/§2.2–2.5/§4/§6①⑦⑧⑨/§7-terms/§8).
- Terms minimum-age clause — `src/demo/launch.html` termsBody §3.3 (16 / higher
  local minimum) + one-liner in `TERMS_DEFAULT` (`launch-shell.js`) + spec note.
  Counsel confirms wording; canonical legal doc needs the same clause.
- **Periodic backup nudge (legacy parity, Damir order)** — NEW
  `src/components/backup-nudge.js` + `src/styles/components/backup-nudge.css`;
  registered in `build-demo-bundle.mjs` FILES; chats.html demo toolbar button;
  smoke block "chats.html — periodic backup nudge"; `backup-ux-spec.md` §4.1
  (amends §2.2 "not periodic"). C# keeps the 30-day cadence + Preferences —
  FE has no timer/storage (smoke-guarded). jsdom-verified in-session.
- `docs/desktop-split-spec.md` — NEW (the build target).

## Damir's pre-build checklist (PC, real files)
1. `node scripts/build-demo-bundle.mjs` → `node scripts/smoke-test.mjs`
   (bundle NOT regenerated in-session: the PC sandbox mount served a
   TRUNCATED `launch-shell.js` — real file verified intact; do not build
   bundles from a sandbox on this machine, #142 stands).
2. Demo pass: chats.html "Backup nudge" button (sheet look, copy, both paths).
3. Commit via GitHub Desktop (sandbox git index shows phantom staged
   deletions — never commit from a sandbox).
4. DECISIONS rows to add at commit: launch-spec alignment (mechanical) ·
   Terms §3.3 min-age · periodic backup nudge (supersedes the #131 "not
   periodic" stance) · desktop-split-spec #0 decisions.

## Still parked (unchanged)
- Launch finalize task 1 (real illustrations — prompts in
  `docs/onboarding-illustration-prompts.md`; backup-nudge inline placeholder
  swap updates the one-placeholder smoke guard) and task 2 (launch SL
  dictionary extraction).
- [L2] unlock scrub: CONFIRMED landed (lock-shell.js:162–171 + smoke 2401) —
  the scan-lock handoff note was stale, don't re-flag.
- Consent = sign-in wrap, finalized; do NOT rename the create CTA.
- After the desktop batch: Opus audit loop over it (adversarial = Opus, not
  fable — Damir standing order), then the rest of Phase 2 (dark verification
  rides the desktop pass per spec §4 · a11y/copy sweeps · B2 icon exports).
