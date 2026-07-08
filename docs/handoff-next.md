# Handoff → next session (after #204 avatar/app-icon resolution)

Paste-in for a fresh session. Track C (scan+lock, #203) and avatar/app-icon path
resolution (#204) are done. This doc = where we are, what's left, what to start next.

## Read order
`CLAUDE.md` status tail → `DECISIONS.md` #204→#195 → this file →
`docs/finalization-roadmap.md` (master plan) → `docs/gap-audit.md` (Phase 3.5
per-surface source of truth) → `docs/be-cutover-brief.md` (the one BE work order).

## State right now
- **Bridge still FROZEN**; zero C# shipped. Every BE-dependent feature is built +
  capability-gated (never shown broken) and queued in `be-cutover-brief.md`.
- **v1 mobile is redesigned + wired on the real bridge** across every surface:
  chat (text/file/app/payment-view/call-view/reactions/typing/channels/context-menu/
  attach/member-sheet/chat-info) · contact details · contacts (FAB picker + directory +
  add-contact) · chats-list (live status, upsert fix) · apps (list/add/details/launch) ·
  wallet (balance/tx/**Receive** live, Send built+gated) · account/settings hub ·
  scan + lock shells · launch/onboarding · systemic first-paint flicker fix ·
  **real avatars + app icons** now thread `src` everywhere (gradient fallback on error).
- **#204 (this session):** Option A (C# data-URI push) chosen for avatar/app-icon
  resolution → `be-cutover-brief` **X1**. FE is ready NOW; consuming X1 = zero further FE.
  Harness `src/demo/avatar-datauri.html` proves the chain (6/6 green).
- **YOU ARE HERE (mid-test):** Damir is F5-testing #204 on a fresh WinUI account. Before F5:
  `node scripts/build-demo-bundle.mjs` → `node scripts/build-shells.mjs`. Check real photos
  show for a contact/app that HAS an image (own avatar · app-tile icon · contact photo in
  chats-list/chat header/contact-details hero · group member rows + member sheet); photo-less
  = gradient is correct; nothing should show a broken-image glyph. Resolves on WinUI (file://);
  iOS waits on X1.
- **Support-session findings (2026-07-08, added to `be-cutover-brief.md`):** while debugging a
  locked-out account we found real bugs in the (frozen, legacy) launch/lock/restore C# flow —
  **L2 amended** (create/unlock/restore all `UrlDecode` the password but parse it differently →
  a `+`/`%xx`/space/`<nick>:` silently locks the user out of their own wallet) · **L5** blank
  create-error dialog (undefined `intro-new-walleterror-*` strings + `"global -dialog-ok"` typo;
  fires when a wallet already exists) · **L6** `onRestore` clears onboarding/lock flags +
  overwrites `walletpass` BEFORE verifying the password (destructive on a wrong guess) · **L7**
  restore shows the internal `wallet.ixi.tmp` instead of the picked filename · **L8** SECURITY:
  `walletpass` stored in PLAINTEXT prefs. All land in the one BE cutover.

## ⚠ Two live environment warnings (READ FIRST)
1. **`.git/index` is CORRUPT** ("bad signature 0x00000000 · index file corrupt") →
   `git diff`/`git stash` fail. Fix: **`rm .git/index && git reset`** (working tree
   intact, no work lost). Do this before any git work.
2. **The PC sandbox mount TRUNCATES large Edit-tool writes** (#175/#165 class). This
   session, chat-info.js / chat.html / contact_details.html / home.html / smoke-test.mjs
   (and CLAUDE.md, from a prior session) were silently truncated by the Edit tool and had
   to be reconstructed from HEAD+edits via **node `fs`** (writeFileSync writes intact).
   **On this mount: apply edits via node/git and verify tails (`tail -1`), NOT the Edit
   tool.** `node --check` + `build-demo-bundle`'s own syntax check catch a truncated file.

## Uncommitted working tree (needs commit)
DECISIONS #195–#204 and the matching source are in the working tree, uncommitted
(the corrupt index blocked GitHub Desktop). After fixing the index: rebuild
(`build-demo-bundle` → `build-shells`), run smoke, F5, then commit.

## Path to launch (phases, in order)

1. **Remaining zero-C# polish (Track G/H tail)** — small:
   - Apps: `menuBtn` creation-guard fix (be-cutover A-note) · Explore-banner `explore-apps.svg` placement.
   - **Cross-cutting sweeps (Phase 2):** dark-mode verification (`dark-mode-deviations.md`) ·
     a11y focus/SR sweep · copy-morph honesty sweep (`copy-sweep-phase2.md`) ·
     empty/error/offline states + toasts · B2 icon exports (`icon-export-gaps.md`:
     shield-lock, user-circle-filled, torch/bulb, user-plus, world, lock).
   - Run any parked Opus audits (contacts #155 / scan #158 / lock #159) + a per-surface #46 loop.

2. **Desktop split-view passes (Phase 2 Desktop)** — wallet/apps/settings ≥700px
   (chats/chat already in desktop.html). Spec: `desktop-split-spec.md`.

3. **The ONE BE cutover** (the big unlock — flips gated features on). `be-cutover-brief.md`
   is the work order, one reviewed C# PR:
   chat **C1–C9** · chats-list **CH1–CH8** · wallet **W1–W8** (incl. `signSend` → the
   redesigned Send) · settings **S1–S13** · apps **A1–A5b** · contacts **CO1–CO5** ·
   chat-info **CI1–CI5** · launch **L1–L4** · cross-cutting **N1–N3** + **X1** (avatar/app-icon
   data-URI push, #204). Every arg-signature change lands JS+C# in the same commit.

4. **Integration**
   - **C# §5 repoint** — page classes → canonical shell filenames + `setRoute`
     (currently Stage-4a drop-in over legacy names). We deliver the mapping table (ARCHITECTURE §5).
   - **Full-app Windows test** (`maui-integration-test-plan.md`) → **Android**
     (`android-test-quickstart.md`). iOS: verify X1 resolves avatars (WKWebView was the suspect).

5. **Phase 4 freeze** — full-app adversarial #46 loop → fix → review until CLEAN ·
   lock smoke count · DECISIONS freeze row · BE handoff.

## Recommended next
The FE surface is essentially complete. Two good options:
- **(a) Wrap the zero-C# tail** — Phase-2 sweeps (dark/a11y/copy) + desktop split-view +
  the small apps/explore polish — so the whole FE is freeze-ready before BE work.
- **(b) Kick off the BE cutover prep** — hand BE `be-cutover-brief.md` as the work order;
  it's now comprehensive (X1 added). Nothing FE blocks it.
Damir's stated strategy: **max out zero-C#, get the whole app working+tested, THEN one
focused BE pass.** So (a) first, then (b).

## Working constraints (unchanged)
- Frozen bridge; new needs → §8/§9 proposals in `be-cutover-brief.md`; BE-gated features
  ship behind capability flags, built + ready.
- Per-surface loop: build → #46 adversarial review → fix → Damir F5 → DECISIONS row → commit.
- Build sequence (components changed → bundle first):
  `node scripts/build-demo-bundle.mjs` → `node scripts/build-shells.mjs` →
  `node scripts/smoke-test.mjs` → F5. Smoke's contacts block has a real-timer tail that
  exceeds the sandbox 45s window — it completes on a local terminal (force-exits 0).
- When a component's DOM/behavior changes, update the matching `scripts/smoke-test.mjs` assertion.
