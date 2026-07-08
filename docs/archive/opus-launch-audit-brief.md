# Opus audit brief — Launch/onboarding shell (#163) + premium welcome rework (#164), ONE loop

Point Opus at this file — it is SELF-CONTAINED. Run the **#46 audit loop**:
read-only adversarial audit (findings with file:line) → fixer pass → fresh
adversarial reviewer → loop fix↔review until CLEAN. Damir reviews the diff in
GitHub Desktop after. Adversarial loops are Opus's job, not fable's (Damir
standing order).

## Boot ritual

`CLAUDE.md` → `DECISIONS.md` rows **#158–#164** (#162 = the scan/lock audit
outcome; #163 = launch build; #164 = premium welcome rework) →
`docs/launch-spec.md` (esp. §0 interview decisions, §1 parse hazards, §2.1
premium round, §3 ctrl contract, §5 SECURITY, §6 flags ①–⑩) →
`docs/lock-spec.md` §5 (the [L2] widening) → `docs/backup-ux-spec.md` §3.3 →
`docs/illustrations-plan.md` §2/§4 → this file.
Bridge truth: `bridge-audit-A.md` §6 (OnboardPage) + §7–§10 (the four
intro pages). Legacy visual reference: `Spixi/Resources/Raw/html/intro.html`
(the shipped two-stage flow the rework must beat).

## Scope (built by fable 2026-07-06; Damir smoked the FIRST build green after
one fix; the #164 rework block has NOT yet run end-to-end — see caveat below)

| File | What it is |
|---|---|
| `src/components/launch-shell.js` | NEW — `createLaunchShell` (welcome/create/restore/retry/tail router) + free fns `setLaunchView/Version/Terms/Avatar/File`. Premium welcome: language pill + appearance → the settings sheets, 4-slide autoplay carousel with the legacy step1–4 art, fine-print terms (first CTA tap = one-shot `ixian:accept`), pinned CTAs. Create/restore/retry forms share lock's `passwordField`; shell-wide window-pagehide scrub (self-cleaning listener) |
| `src/styles/components/launch-shell.css` | NEW — welcome brand layout (glass pills, carousel, dots, fine print), themed form views (#136① scroll-column), tail steps |
| `src/styles/tokens.css` | +`--gradient-launch` (#164 aurora recipe, 5 dial layers, fixed-dark like `--gradient-lock` which the lock KEEPS — flag §6⑧) |
| `src/components/lock-shell.js` | 3 sanctioned edits ONLY: `export` on `passwordField` + `ENC_MIN` (shared truth) and the **[L2, Damir-approved]** window-pagehide scrub on `createLockScreen` (self-cleaning listener). Everything else was audited CLEAN in #162 — do NOT re-open |
| `src/components/settings-shell.js` | 2 sanctioned edits ONLY: `export` on `settingsOptionSheet` + `settingsThemeSheet` (launch reuses them — one picker grammar) |
| `src/demo/launch.html` | NEW demo — full-bleed `.demo-launch`, toolbar view jumps, mock bridge wiring (restore/retry password `hunter2`), condensed legacy terms text |
| `src/demo/images/onboarding/step1–4.svg` | COPIED verbatim from `Resources/Raw/html/img/dark/onboarding/` (dark set only — welcome is pinned dark) |
| `scripts/build-demo-bundle.mjs` | +FILES entry `launch-shell.js` (LAST — imports from lock-shell AND settings-shell) |
| `scripts/smoke-test.mjs` | +`launch.html` block (~35 asserts) + static guards + the [L2] lock assert |
| `docs/launch-spec.md` | The spec — check code ↔ spec drift BOTH ways (the spec was updated for #164; §2.2–2.5 describe the untouched form views) |

## ⚠ Known caveat (be the first to actually run it)

The #164 rework's smoke assertions were written blind (sandbox couldn't
execute; Damir's standing "don't waste tokens" order). **Pass 0 = run
build+smoke and expect assertion drift in the `launch.html` block** —
sheet-open timing (`dismissTopOverlay` + 400ms sleeps), `.c-launch__pill`
selector order (language pill must precede the theme pill in DOM), autoplay
interference (first tick at +5s; `load()` settles at +3s — verify no race
into the dot asserts). Distinguish TEST bugs from COMPONENT bugs; fix both,
but a component bug found by a blind assert is a real finding.

## HARD CONSTRAINTS for fixers

1. **Bridge FROZEN.** Launch emits ONLY (via host callbacks):
   `ixian:introload`/`onload` · `accept` · `language:<code>` ·
   `appearance:<int>` · `create:<nick>:<password>` · `avatar` · `selectfile` ·
   `restore:<password>` · `proceed:<password>` · `joinbot` · `finish` ·
   `back`. Missing capability = §8/§9 proposal, never a new verb.
2. **SECURITY.md checklist is part of this audit** (launch-spec §5): scrub
   coverage on create/restore/retry × back/done/pagehide (find the path that
   DOESN'T scrub — reveal re-mask included) · passwords NEVER trimmed, NEVER
   logged, no DOM echo · BOTH `create:<nick>:<password>` parse hazards gated
   (nick `:` + password containing `<nick>:` — and check the TRIMMED-nick vs
   sent-nick consistency of that gate) · autocomplete stance (new-password on
   create, off on restore/retry).
3. Frozen/clean surfaces stay shut: chat v1; scan + lock #162-clean scope
   (the two lock/settings edit sets above are the ONLY sanctioned re-entries —
   verify they didn't disturb anything, e.g. bundle export count/order,
   encpass behavior, the #148② stay-open theme-sheet contract).
4. Mechanical fixes land directly; architectural findings = 🟡 DECISIONS rows.
5. **Verification per pass: Damir runs `node scripts/build-demo-bundle.mjs`
   then `node scripts/smoke-test.mjs` (PowerShell, `Spixi` subfolder, no
   `&&`) and pastes output between passes.**

## Where to look hard

- **Autoplay lifecycle** (`launch-shell.js` buildWelcome): the 5s interval
  never stops while the shell stays mounted — it only no-ops off-welcome and
  self-clears on a tick after DOM removal. Real-app lifetime = the page's
  lifetime: acceptable idle timer, or stop on view-leave / `pagehide`? Also:
  multiple demo shells (`entry`, `api` in smoke) each own an interval until
  removed — check jsdom teardown can't fire a tick against a half-built state.
- **One-shot latches** (the #162 `used`-latch parity sweep): `acceptOnce`
  (re-armed by `setLaunchTerms` — can C#'s queued `showTerms` arrive AFTER the
  user already left welcome, so accept never fires? legacy emitted accept from
  its modal), the tail `finished` latch (joinbot rides it — Damir's smoke
  caught the unlatched Join double-fire; look for siblings of that bug class:
  `onBackupNow`, avatar pick, file pick, pill sheets while one is open),
  `launchCtrl` across create/restore/retry incl. the sync-throw #141-m4 paths.
- **Ctrl ↔ scrub interplay mid-flight**: pagehide scrub fires while create is
  inFlight (fields disabled, morph pending) — verify restore paths can't
  resurrect a scrubbed value or wedge the disabled state; retry `fail('')`
  keeps the typed value BY DESIGN (spec §2.4) — confirm that's the only
  value-keeping path.
- **Sheet reuse on the pinned-dark welcome**: the settings sheets mount on the
  host OUTSIDE the `data-theme="dark"` pin (lock hatch-modal precedent) —
  verify both themes render the sheets themed (not dark-pinned), focus
  returns to the pill, Esc/scrim behave, and `settingsOptionSheet`'s
  commit-latch survives the fire-and-forget `ctrl.done()` wiring (no spinner
  flash / stuck aria-busy).
- **Internal routing vs C# navigation** (spec §2.2): create `done()` morphs,
  scrubs, advances to tail at +900ms while real C# is ALSO navigating to
  Home — sanity-check the demo/real divergence is documented and harmless;
  entry `view:'tail'` (HomePage modal repoint) is the real tail path.
- **Legacy art on the new gradient**: step1–4 dark SVGs were drawn for a flat
  dark surface — check contrast/halo clash against `--gradient-launch` (esp.
  the violet crown behind slide art), `<img>` decorative semantics (`alt=""`),
  the `onerror` hide path, and that NO legacy SVG ids collide (they ride as
  `<img>`, so this should be moot — confirm).
- **A11y sweep of the new welcome**: pill touch targets are 36px (house
  minimum?), dots roving tabindex + `aria-selected`, carousel keyboard access
  when focus is NOT on the dots, fine-print link contrast (body-xs on
  gradient), `aria-hidden` slides still containing the live language pill's
  DOM? (top controls are OUTSIDE the track — verify), sheet focus traps.
- **CSS**: glass raw-rgba values all comment-sanctioned; `--radius-full` pill
  vs house radius language; `min(58vw, 232px)` art measure on desktop widths
  (Phase-2 split-view will hit this); `.c-launch__terms-body` 60vh inside the
  sheet's own max-height (double-scroll?).
- **Bash-repaired files**: `lock-shell.js` and `build-demo-bundle.mjs` had
  their tails re-appended after a sandbox sync fault — diff them against git
  HEAD intent (no duplicated/lost lines; `lock-shell.js` should show ONLY the
  3 sanctioned edits).
- **Spec ↔ code drift**: launch-spec §8 still lists a few pre-rework smoke
  phrasings; §2.2–2.5 must match the built forms (e.g. ENC_MIN import, the
  restore honesty line, tail button order).

## Parked — do NOT re-flag (Damir-scoped or already logged)

§6 flags ①–⑩ (ENC_MIN, create wedge stance, tail no-back, copy, backup
placeholder, ThemeAppearance ints, condensed terms, gradient convergence,
join-step image, autoplay cadence) · §9 asks (C# create-parse guard,
backup-tail routing, create-failure verb) · #162 backlog L1 (unlock morph
window) + S1 (scan decode timer) · emoji flags = #148⑥ stance (SVG swaps
later) · i18n/native.js/Vite = Phase 3.

## Definition of CLEAN

Fresh reviewer finds zero non-parked issues across: the two smoke commands
green on Damir's PC · SECURITY §5 sweep · latch parity sweep · both themes
demo pass (welcome pinned dark, sheets themed) · spec ↔ code aligned ·
DECISIONS row for the audit outcome appended (next free number), listing
fixed vs 🟡-logged findings.
