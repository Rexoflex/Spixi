# Handoff → next session (after #205 a11y sweep + #206 zero-C# bug batch)

Paste-in for a fresh session. #205 (Phase-2 a11y focus/SR sweep) and #206 (zero-C#
Damir-F5 bug-fix batch) are done + committed. This doc = where we are, what's next.

## Read order
`CLAUDE.md` status tail → `DECISIONS.md` #206 → #205 → this file →
`docs/desktop-split-spec.md` (the next batch) → `docs/gap-audit.md` (per-surface
source of truth) → `docs/be-cutover-brief.md` (the one BE work order).

## State right now
- **Bridge still FROZEN**; zero C# shipped. Every BE-dependent feature is built +
  capability-gated (never shown broken) and queued in `be-cutover-brief.md`.
- **v1 mobile is redesigned + wired on the real bridge** across every surface, and
  the #206 F5 pass closed the last mobile bugs: contact-details title + Message
  (revises #142) · bot member count + **full member roster via `ixian:loadContacts`**
  (corrects CI1 — the roster push already existed) · channel selector slides *below*
  the topbar · **remote GIF/media loads by default** + per-peer persistence + 2px
  sent-tile border (#82 posture, Damir's call) · softened `--gradient-lock` · account
  default avatar → gradient · app-detail icon parity (real image awaits X1) · settings
  **stay+Saved+toast built, gated OFF** behind `bridge.cap('settingsApply')` (new BE
  row **S14**).
- **This session's env note:** the PC sandbox mount BEHAVED (fresh edits + full build
  + smoke all ran in-session; bundle 229 exports, 14 shells, 314 ✓, exit-124 = the
  known contacts real-timer tail, not a failure). If a future session's mount truncates
  large Edit-tool writes again, fall back to node `fs` for files >~500 lines and verify
  tails — see the warning below.

## ⚠ Environment warnings (keep in mind)
1. **`.git/index` was corrupt earlier** ("bad signature 0x00000000"). If `git diff`/
   `stash` fail: `del .git\index.lock` + `del .git\index` + `git reset` (working tree
   is safe). The sandbox mount CANNOT delete files, so this is always a local step.
2. **Large Edit-tool writes can truncate** on the PC mount (#175/#165 class). This
   session was fine, but if it recurs: apply edits to large files via node `fs`
   (writeFileSync writes intact) and verify with `tail`. `node --check` + the build
   scripts' own syntax checks catch a truncated file.
3. **`DECISIONS.md` rows 203+204 share one physical line** (an earlier-session
   truncation merge — cosmetic, untouched). Don't be alarmed; don't need to fix.

## NEXT BATCH — Desktop split-view + desktop chat-bg rule (Damir queued)
Spec: `docs/desktop-split-spec.md`. Per-surface loop unchanged: build → #46 review →
fix → Damir F5 → DECISIONS row → commit.

1. **Desktop split-view passes for wallet / apps / settings** (chats + chat already
   exist in `src/demo/desktop.html`) — ≥700px two-pane layouts per shell.

2. **Desktop-only chat-pattern rule (Damir 2026-07-08, root-caused this session):**
   - The pattern is painted by `.c-chat-canvas::before` (layer geometry in
     `message-bubble.css:17-31`, paint in generated `chat-pattern.css`). The
     `--gradient-chat` overlay is a SEPARATE layer (the `.c-chat-canvas` element
     background, `message-bubble.css:14`), so the pattern can be dropped while the
     gradient stays.
   - **Approach:** new token `--chat-canvas-base` (light = `var(--surface-screen)`,
     dark = `var(--surface-neutral-01)`); change both `--gradient-chat` trailing
     layers to use it. Then, scoped to the desktop wrapper class **`.dt-frame`**
     (NOT a media query — a `min-width:700px` query misfires inside the phone-frame
     demos): `.dt-frame .c-chat-canvas::before { display:none }` (pattern off, both
     modes) + `[data-theme="dark"] .dt-frame .c-chat-canvas { --chat-canvas-base: var(--neutral-1000) }`
     (dark desktop = solid grey-1000 `#111213` under the gradient overlay). Light
     desktop = pattern-off only (satisfied by the `::before` rule); background stays.
   - Darkest primitive already exists: `--grey-1000: #111213` / `--neutral-1000`.
   - The production desktop shell doesn't exist yet (desktop is the `desktop.html`
     demo with `.dt-frame`); when a real desktop shell lands it should add the same
     wrapper/`.is-desktop` class.

## After the desktop batch
- Remaining zero-C# polish: apps `menuBtn` creation-guard · Explore-banner svg ·
  B2 icon exports (`icon-export-gaps.md`).
- Then **the ONE BE cutover** (`be-cutover-brief.md` is the work order — chat C1–C9 ·
  chats CH1–CH8 · wallet W1–W8 · settings S1–**S14** · apps A1–A5b · contacts CO1–CO5 ·
  chat-info CI1(FE-done)–CI5 · launch L1–L8 · cross-cutting N1–N3 · **X1** avatar/app-icon
  data-URI · **#82** media-load posture). Every arg-signature change lands JS+C# together.
- Integration: C# §5 repoint (mapping table = ARCHITECTURE §5) → full-app Windows test
  → Android → iOS (verify X1 resolves avatars). Then Phase 4 freeze audit.

## #206 backlog (fold into related batches, not blockers)
- `refreshChatInfo` doesn't preserve member-list scroll on the async roster refresh
  (roster arrives at open, pre-scroll → minor). Fold into the desktop/chat-info pass.
- Media autoload-by-default = a fetch on every media tile render (accepted, #82); a
  settings toggle wiring to `spixi.media.autoload` is deferred UI.
- Contact-details now revises #142 (keeps delete-history); if BE ever wants the
  contact page to DROP delete-history again, that's a component gate flip.

## Build sequence (components/strings changed → bundle + strings first)
`node scripts/build-demo-bundle.mjs` → `node scripts/build-locales.mjs` →
`node scripts/build-strings-iife.mjs` → `node scripts/build-shells.mjs` →
`node scripts/smoke-test.mjs` → F5. (Smoke's contacts block has a real-timer tail
that exceeds the sandbox 45s window; it force-exits 0 on a local terminal.)
