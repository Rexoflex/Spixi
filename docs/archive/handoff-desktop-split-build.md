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
- **Rating nudge (Damir order, same day)** — NEW `src/components/rating-nudge.js`
  + `rating-nudge.css`; the `showRatingPrompt` mirror (legacy #ratingModal →
  sheet). Yes→`ixian:rating:yes` (store) · Not so much→`ixian:rating:no`
  (support email, deflection kept) · one latch · light-dismiss = not-now
  (C# re-prompts). Registered in bundle FILES; chats.html toolbar button;
  smoke assertions; spec = overlays-spec.md **Batch D** (+ flags ⑥⑦).
- **Backup nudge upgraded**: `illustration` opt (launch img grammar, error →
  shield-disc fallback); demo points at `images/onboarding/backup.svg`
  (illustrations-plan #6, shared with the launch tail) — art lands by FILE
  DROP. Both nudges jsdom-verified in-session (all paths).
- NOTE: if final onboarding art arrives as PNG (not SVG), the pipeline needs
  a one-time rename+wiring+smoke-guard switch — the step1–4 guard asserts
  real `<svg` markup, which is what failed Damir's renamed-bitmap test.

## BUILT — 2026-07-06b session (this batch landed on the real files)

- `src/demo/desktop.html` reworked per spec: per-shell `.dt-shell` containers in
  both panes, rail dispatch + lazy init, routers `dtOpenSettings` /
  `dtOpenWalletDetail` / `dtOpenAppDetail` (spec §3), empty states + aria-current
  (+ demo tint via `--surface-interactive-selected`, #33), compact wallet hero
  (`.dt-wallet-hero` demo wrapper), apps list forced `layout:'list'` (toggle
  hidden by demo CSS), backup nudge button on the FRAME host (§4). Tx detail =
  openTxSheet builder LIFTED from a detached host (no sheet on the frame stack);
  tx row taps capture-intercepted — NO component edits anywhere.
- Damir live orders folded in (spec §6b): ① chat-info RIGHT PANEL (⋮ toggles) ·
  ② call icon 1:1-only · ③ sheets present as centered DIALOGS inside the frame
  (scoped demo CSS) · ④ bot channel selector anchors BELOW the topbar.
- `scripts/smoke-test.mjs`: new "desktop.html — split-view shells" block (spec §5
  + orders ①–④) + static guards (no @container / ≥700px in component CSS ·
  stylesheet links · dialog CSS stays demo-side · no forked tx markup).
- NOT verified by execution: the sandbox mount served STALE files again (#142 —
  smoke-test.mjs 2418 vs real 2533 lines; desktop.html pre-rework). Run
  `node scripts/build-demo-bundle.mjs && node scripts/smoke-test.mjs` on the PC.
- Flags for the demo pass: sheet-dialog width (480) / channel-selector width
  (420) / `.dt-info` width (340) are dials; explorer button inside the lifted tx
  detail keeps its one-shot sheet latch (re-render re-arms) — component flag if
  it bothers; Discover grid-vs-list default still open (spec flag ④).

## POLISH ROUND — 2026-07-06c (Damir screenshot pass, 17 items — spec §6c)

- `desktop.html`: rail restyle (icon-pill selected state, quieter ink) · wallet
  hero type tracks the pane (`--dt-list-w` var, no container queries) + misstx
  wraps · label-lg pane titles · conversations grow up from the composer ·
  help-center link · chat topbar ⓘ (⋮ retired) + bot chevron-down channels
  trigger · channel dropdown anchors to the identity · right-click on bubbles
  AND chat rows = anchored dropdowns + source highlight (MutationObserver tags
  the component sheet — #56 untouched) · chat rows got attachChatRowMenu
  (pin/mute/mark-read/info/delete) · theme = settingsThemeSheet tiles LIFTED
  into the right pane (hub row value follows) · App lock hidden (C#-less PIN
  = theater; Phase 3) · encpass CTA hugs below the inputs · settings cap 640 ·
  backup CTAs resized · avatar → rail Account item (SVG-data-URI mock,
  jsdom-safe; component ask: setNavAvatar free fn) · apps rows: ⋮ → ⓘ opens
  details (decorate-after-render, component untouched).
- `chat.html` (mobile): ⋮ removed from both chat topbars; group Call removed.
- Smoke: chats/settings/apps sections updated + 06c static guards (help link,
  upward flow, label-lg, --dt-list-w, misstx wrap, mobile ⋮/Call gone).
- STILL NOT executed in-session (#142 stale mount) — run bundle + smoke on PC.
- BE/component asks logged in spec §6c: bot member list + paging, add-member
  affordance, group rename verb (⑨ — no legacy command known), desktop launch
  composition pass (⑮), setNavAvatar.

## REFINEMENT — 2026-07-06d (round 2; smoke failure diagnosed)

- The one smoke FAIL was test-side: the ⑩ assertion right-clicked the row
  wrapper but attachMessageMenu listens on the INNER bubble — fixed in the
  test. Anchored dropdowns landed only in 06c; Damir re-verifies in-browser.
- desktop.html: attach grid = composer-⊕ popover (anchor "up") · context
  dropdowns drop from the source row's bottom edge · rail spacing/pill
  refinement (52×38 radius-12) · incoming call = centered dialog card +
  "Incoming call" toolbar button.
- **chat-info.js COMPONENT CHANGE (flagged, legacy parity):** members gate
  widened to bots — the legacy channel-bar people icon shows exactly this
  list (Damir screenshots). Demo feeds 8 members + the 12,4k count.
  ⚠ REBUILD `spixi.iife.js` BEFORE smoke — the bot-members assertion reads
  the bundle.
- Answers on record (spec §6d): reactions shippable now (FE done + legacy
  contextAction verb); replies = §8 BE work, later version. Markdown = NOT in
  the rework yet; mirror of legacy PR #50 logged as its own FE batch.
- Round 2 (same session): payment forms — wallet cap 560, amount inputs →
  heading-sm, CTAs hug left · downloads rows = cards (multiselect/bulk =
  component + §9 ask, NOT cheap — flagged) · language picker lifted into the
  pane (pick rebuilds → check mark moves) · translated dialogs pad 24 top
  (the 8px was the handle's seat), anchored dropdowns stay 12/16.
- DECISIONS rows to add at commit: bot members legacy parity (chat-info gate) ·
  markdown-parity batch opened · reactions-first/replies-later phasing ·
  desktop dialog/dropdown padding grammar.

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

## NEXT after the Opus audit (Damir order, 2026-07-06 close)

1. **Opus audit loop** over the desktop batch — brief ready:
   `docs/opus-desktop-audit-brief.md` (self-contained; verification stays
   PC-side per #142; bundle rebuild mandatory — chat-info.js changed).
2. **i18n extraction batch (pre-Phase-3, Damir: "multilingual from the get
   go").** The architecture is already right: EVERY component reads
   `strings.*` with en-us defaults, and the legacy side has SL dictionaries +
   `ixian:language:<code>` + live-swap plumbing. The batch:
   ① sweep all components for `strings.X || 'fallback'` → generate the
   canonical en-us dictionary (script it — greppable pattern, keep it in
   `scripts/`) ② every key gets a CONTEXT note (where it renders, tone,
   length constraints — "contextual translations") ③ map keys to legacy SL
   ids where a legacy string exists (reuse shipped translations; diff = new
   keys needing translation, incl. plural/format cases like the members
   count) ④ wire a strings provider into the demo compositions + a
   PSEUDO-LOCALE smoke pass (marker dictionary — any English leaking through
   = a hardcoded string bug; also catches the known theme/language row
   TEXT-MATCH intercepts in desktop.html, which must move to a structural
   hook before translation) ⑤ absorbs the parked "launch SL dictionary
   extraction" task. Deliverable: dictionary + context sheet Damir can hand
   to translators, and shells that boot in any dictionary from day one.
3. Then the rest of Phase 2 tail (a11y/copy sweeps · B2 icons), contacts-on-
   desktop batch, then **Phase 3** (bridge wiring: selectChat/selectTx
   mirrors, real language switch via ixian:language).

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
