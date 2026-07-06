# Handoff → fable: Scan (#158) + Lock (#159/#160) audit done, next FE work

**From:** Opus combined audit loop (`docs/opus-scan-lock-audit-brief.md`)
**Date:** 2026-07-06
**Status of the two batches:** ✅ audited + fixed + fresh-reviewed **CLEAN**. Bridge stayed frozen — zero verb changes. See DECISIONS **#162** for the full outcome.

---

## 1. What the audit changed (so you don't re-touch it)

**One real fix — a SECURITY §5 gap in `createEncPassScreen` (`src/components/lock-shell.js`):**
the change-wallet-password fields were meant to scrub when the WebView is backgrounded/closed, but the listener was bound as `el.addEventListener('pagehide', scrub)` on the `<section>`. `pagehide` is a **window-only event** — it never fires on an element — so the scrub never ran and plaintext (current/new/repeat) could persist in a hidden WebView. The smoke test only grepped for the string `pagehide`, so it passed on dead code.

Fixed to `window.addEventListener('pagehide', onPageHide)` plus a `teardown()` that removes the listener on **both** leave paths (topbar back + success) so abandoned screens don't accumulate window listeners scrubbing detached fields. The smoke guard now asserts the **window** binding and a new **functional** assertion dispatches a real `window` `pagehide` and checks the field scrubs and a revealed field re-masks.

**Files touched:** `src/components/lock-shell.js`, `scripts/smoke-test.mjs`, regenerated `src/demo/spixi.iife.js`. Nothing else — scan-shell, all CSS, tokens, settings-shell, and the demo wiring were reviewed and left as-is.

**Verified in-session:** bundle rebuild clean (202 exports); `node --check` green on both edited files; a targeted jsdom run of the scrub + teardown + re-mask passed. **You/Damir should still run the full `node scripts/build-demo-bundle.mjs` then `node scripts/smoke-test.mjs` on the PC** — the full suite exceeds the sandbox's 45s per-call ceiling, so it wasn't run end-to-end here.

## 2. Backlog the audit logged but did NOT fix (🟡 — your call / BE / spec-scope)

- **[L1] Unlock success morph vs page-replace latency.** On `ctrl.done()` the unlock button runs `setSuccess`, which auto-reverts after ~1400ms to an **enabled** "Unlock" while the input stays disabled. It's only safe because C# replaces the page fast. If real page-replace latency exceeds 1400ms the screen reads wedged. Within existing `setSuccess` grammar — flag for BE/Phase-3 timing, don't hack the component.
- **[L2] The unlock screen has no background scrub.** Spec §5 scopes lock scrubbing to success-morph + hatch + cancel, so a backgrounded unlock screen keeps a typed wallet password in the field. Recommend extending the same `window` `pagehide` scrub to `createLockScreen` — left unchanged because it widens spec scope (Damir's call).
- **[S1] Scan decode timer has no teardown.** `deliverScanResult` schedules the ~350ms `onDecode` with no cancel hook; pressing Back inside the success-flash window still delivers (auto-fill + toast) **in the demo**. The real app pops the page on `ixian:back`, so the timer can't fire — low / demo-only.

## 3. Confirmed clean (don't re-flag these)

Delimiter gate transitively covers the repeat field (n===r is enforced before the ENC_DELIM check) · `ixian:qrresult:` case-sensitive match is consistent with C# `Contains`/`Split` · passwords are never trimmed (lock + all three encpass fields) · the escape-hatch modal auto-dismisses on action/Esc, no per-click leak · one-shot `ctrl` `used`-latch parity across scan/lock/settings/contacts · the new encpass hub row is presence-gated and breaks no smoke row-count assertion · the dark-pinned lock subtree's escape-hatch modal mounts on the host outside the pin, so it stays themed in both modes.

Also still parked from the spec (Damir flags, not findings): torch glyph = `eye` stand-in, denied disc = `eye-off` (B2 icon queue) · camera-flip deferred · no OS-settings deep link (no bridge verb) · ENC_MIN=8 (§6①) · autocomplete stance (§6②) · 1600ms auto-release window (§6③) · bio-retry via `ixian:onload` re-emit.

## 4. Your next FE work (from `docs/finalization-roadmap.md`)

Phase 1 is nearly done. Remaining, in dependency/value order:

**Phase 1 #5 — Launch / onboarding shell** (the last Phase-1 surface). Views: welcome (language/theme/terms) · create · restore · retry · onboarding tail. Brand-heavy; was Damir-led in Figma, now code-first structural draft that Damir art-directs in the demo. Two things fold in: `docs/illustrations-plan.md` and the backup onboarding tail (`docs/backup-ux-spec.md` §3.3). **The Launch shell inherits the #160 lock brand direction** — `--gradient-lock`, the bare glowing logo, the fixed-dark treatment (lock-spec §6⑤). Follow the standard loop: interview Damir on unknowns → spec doc → build on the mock bridge → smoke assertions → Damir's local build+smoke → demo pass → DECISIONS row.

**Phase 2 — cross-cutting passes** (after #5): desktop split-view for wallet/apps/settings (≥700px) · wallet safe-area (#22) · dark-mode verification pass · copy/polish + B2 glyph exports (incl. `shield-lock`, `user-circle-filled`, and the scan/lock icon gaps) · a11y focus-order + SR-label sweep across the new shells.

## 5. Working agreements (unchanged)

Bridge is frozen — new needs are §8/§9 proposals, never a new verb. Mechanical fixes land directly; architectural findings become 🟡 DECISIONS rows. Every surface: spec → build + smoke → Damir's PC build+smoke run → demo pass → DECISIONS row → commit. Adversarial audit loops are run by Opus, not fable (Damir standing order).
