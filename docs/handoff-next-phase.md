# Handoff → next phase (after v1 mobile-completion, #195–#202)

Paste-in for a fresh session. The v1 mobile-completion push + two F5 fix rounds are done and (being) committed. This doc = where we are, what's left to launch, and what to start next.

## State right now
- **Committed:** DECISIONS #195–#202 (the v1 list + Round-2 + Round-3 F5 fixes). One clean diff, smoke green.
- **Bridge still FROZEN**, zero C# changes shipped. Everything BE-dependent is built + capability-gated (never shown broken) and queued in `docs/be-cutover-brief.md`.
- Read order for context: `CLAUDE.md` status tail → `DECISIONS.md` #202→#195 → this file → `docs/be-cutover-brief.md` → `docs/gap-audit.md` + `docs/finalization-roadmap.md`.

## What v1 mobile now covers (redesigned, on the real bridge)
Chat (text/file/app/payment-view/call-view/reactions/typing/channels/context-menu/attach/member-sheet) · chat-info (1:1 + group) · contact details · contacts (FAB picker + topbar directory + add-contact) · apps (list + premium add-app + details + launch/info) · wallet (balance/tx/**Receive** live; Send built, gated) · account/settings (hub + Save + backup + about/how-to + theme propagation) · dark-mode tunings · systemic first-paint flicker fix.

## Known residuals (Damir deferred to a later phase — small)
- **Flicker, native part (`N3`):** the white frame during the C# page *push* + the Account slide. One base-class fix: `SpixiContentPage` (+ WebView) `BackgroundColor` dark + `PushAsync(page, animated:false)`. FE theme-flip/blank-gap already fixed.
- **Account "Save stays on screen":** needs a save-without-pop verb (S-series BE); `ixian:save` pops today (legacy parity).
- **Explore banner art:** show `explore-apps.svg` right-aligned, full-bleed vertical — quick FE follow-up, not yet done.
- **Bot channel selector:** shipped Option A (channel-as-title + chevron + ⓘ). Confirm or swap to B/C.
- NITs: channel dropdown z-index (harmless), named-sender aria-label.

## Path to launch (phases, in order)

1. **Finish the last zero-C# surfaces**
   - **Scan + Lock shells** (Track C) — near drop-ins: `src/shells/scan.html` + `src/shells/lock.html` + encpass entry; adapters (`scan-page.js`/`lock-page.js`) + QR lib already exist; add `build-shells.mjs` entries. `settings_lock.html` → redirect to a lock-shell set-lock view.
   - Explore-banner svg; any remaining polish.

2. **Cross-cutting close-out (Track H)**
   - **Avatars & app icons** — repo-wide gradient fallback; real images don't resolve in self-contained shells. Needs a data-URI or resolvable scheme. Highest-visibility polish.
   - Dark-mode verification sweep · a11y (focus/SR) sweep · copy sweep · empty/error/offline states.
   - Run the parked Opus audits (contacts #155, scan #158, lock #159) + a per-surface #46 loop.

3. **The ONE BE cutover** (the big unlock — turns gated features on)
   - `docs/be-cutover-brief.md` is the work order: chat C1–C9 · chats-list CH1–CH8 · wallet W1–W8 (incl. `signSend` → the redesigned Send) · settings S1–S13 · apps A1–A5b · contacts CO1–CO5 · chat-info CI1–CI5 · launch L1–L4 · cross-cutting N1–N3.
   - Deliver as one reviewed C# PR; flipping capability flags lights up the built-but-hidden features.

4. **Integration**
   - **C# §5 repoint** — move page classes to canonical shell filenames + `setRoute` (currently Stage-4a drop-in over legacy names).
   - **Full-app Windows test** (`docs/maui-integration-test-plan.md`) → **Android** (`docs/android-test-quickstart.md`).

5. **Phase 4 freeze** — full-app adversarial #46 loop → fix → review until CLEAN · lock smoke count · freeze row · BE handoff.

## Recommended next
Start **Track C (Scan + Lock shells)** — last zero-C# surfaces, fast (adapters/lib exist), gets the app feature-complete on the FE side. In parallel or right after, **avatar/app-icon path resolution** is the highest-visibility polish and unblocks a lot of "looks unfinished" perception. Batch every C# ask into the single BE cutover after the FE surface is complete + tested (Damir's strategy).

## Working constraints (unchanged)
- Frozen bridge; new needs → §8/§9 proposals in `be-cutover-brief.md`; BE-gated features ship behind capability flags.
- Per-surface loop: build → #46 adversarial review → fix → Damir F5 → DECISIONS row → commit.
- Build sequence (components changed → bundle first): `node scripts/build-demo-bundle.mjs` → `node scripts/build-shells.mjs` → `node scripts/smoke-test.mjs` → F5.
- Sandbox #175: validate edits with the file tools, not `bash cat`/`node`; builds + F5 are the local step.
- Smoke tests assert component DOM — when a component's DOM/behavior changes, update the matching assertion in `scripts/smoke-test.mjs` (that's what tripped the last three smoke runs).
