# Opus audit brief — Desktop split-view batch (Phase 2) + same-day polish rounds

Point Opus at this file — it is SELF-CONTAINED. Run the **#46 audit loop**:
read-only adversarial audit (findings with file:line) → fixer pass → fresh
adversarial reviewer → loop fix↔review until CLEAN. Damir reviews the diff in
GitHub Desktop after. Adversarial = Opus, not fable (Damir standing order).

## Boot ritual

`CLAUDE.md` → `DECISIONS.md` (latest rows — this batch's rows land at commit:
desktop #0 decisions · terms §3.3 · periodic backup nudge · bot members
legacy parity · markdown-parity batch opened · reactions-first phasing ·
desktop dialog/dropdown padding grammar) → `docs/desktop-split-spec.md`
(**§0 interview picks + §6b/§6c/§6d order logs — the spec grew mid-build,
read ALL of it**) → `docs/handoff-desktop-split-build.md` (session states) →
this file. Bridge truth barely moves — this batch is COMPOSITION — but the
frozen-bridge rule still binds every mock.

## Scope (built by fable in ONE session, 2026-07-06, four Damir rounds live)

| File | What it is |
|---|---|
| `src/demo/desktop.html` | THE batch. Grew ~560→~1600 lines: per-shell `.dt-shell` containers in both panes · rail dispatch + lazy shell init · pane routers `dtOpenSettings` / `dtOpenWalletDetail` / `dtOpenAppDetail` (spec §3) · chat-info RIGHT PANEL (⋮→ⓘ toggles) · sheets PRESENT as centered dialogs; anchored variants (`data-dt-anchor`: channel "top" · context "menu" · attach "up") · context menus at the source row + highlight (MutationObserver tags the mounted sheet) · chat rows got `attachChatRowMenu` · GHOST-LIFT pattern ×3 (openTxSheet → inline tx pane · settingsThemeSheet · settingsOptionSheet → pane pickers) · capture-intercepts (wallet tx rows · settings Theme/Language rows) · `decorateAppRows` (⋮→ⓘ) · rail restyle (4 rounds — final: whole-item pill radius-12, crossfade OFF, badge snug) · `--dt-list-w` var drives hero type · call dialog + neutral re-ink · backup-nudge & incoming-call toolbar buttons · App lock omitted (no onLock) · demo CSS ~200 lines, ALL scoped `.dt-*`/`.dt-frame` |
| `src/components/chat-info.js` | ONE flagged change: members gate `kind === 'group'` → `'group' \|\| 'bot'` (LEGACY PARITY — the legacy channel-bar people icon; Damir screenshots). Rationale inline. NOTHING else in the file may have moved |
| `src/demo/chat.html` | Mobile trims: ⋮ removed from BOTH chat topbars; group topbar Call removed (calls = 1:1 only). actions array edits only |
| `scripts/smoke-test.mjs` | +`desktop.html — split-view shells` runtime block (~70 assertions) + static-guard blocks (no `@container`/≥700px in component CSS · stylesheet-link completeness · dialog CSS stays demo-side · tx-detail lift is unforked · 06c/06d order guards). One import widened (`readdirSync`) |
| `docs/desktop-split-spec.md` · `docs/handoff-desktop-split-build.md` | Spec §6b–§6d order logs + handoff session states — check code↔spec drift BOTH ways; §6c/§6d claim "landed" per item, verify each claim |

## HARD CONSTRAINTS for fixers

1. **Components stay FROZEN.** The chat-info gate is the batch's ONLY
   sanctioned component edit. Any fix wanting a component change = 🟡
   DECISIONS row + flag, exactly like the build did.
2. **Composition emits NO new bridge verbs.** Every mock maps to an audited
   verb or a logged §8/§9 ask (spec §6c/§6d list them).
3. **#4 conservative baseline:** no container queries, no ≥700px rules in
   component CSS (a static guard enforces it — don't weaken the guard).
4. **#56 overlay grammar:** one stack, frame host, dismissal semantics
   untouched. The dialog/anchored looks are PRESENTATION-ONLY demo CSS.
5. Mechanical fixes land directly; architectural findings = 🟡 DECISIONS rows.
6. **Verification per pass (#142 — the sandbox mount serves STALE files, twice
   confirmed): DAMIR runs `node scripts/build-demo-bundle.mjs` then
   `node scripts/smoke-test.mjs` on the PC and pastes output between passes.
   chat-info.js changed ⇒ the bundle REBUILD is mandatory before smoke.**
7. Static guards pin exact demo-CSS text — a fixer touching that CSS must
   update the paired guard in the same pass (they're regexes, they WILL bite).

## Where to look hard

- **The ghost-lift pattern (×3)** — `buildInlineTxDetail`, theme, language:
  `openTxSheet({host: ghost})` → `openOverlay` pushes the stack, binds
  document keydown/focusin, focuses a DETACHED node → `closeSheet` pops it
  synchronously. Audit: focus side effects at open/dismiss (opener capture =
  `document.activeElement` mid-click); the 400ms `pendingRemoval` timer firing
  after the content was re-parented into the pane; re-entry — opening the same
  tx twice fast; the lifted explorer button's one-shot `latched()` closing a
  sheet that's no longer in the stack (should be a harmless `false` — verify);
  Esc during the ghost's 1-frame stack membership.
- **Theme/Language pane pickers:** the language picker is ONE-SHOT (`inFlight`
  latches after a pick; the demo REBUILDS the pane in `onPicked` to re-arm) —
  race a second click before the 600ms commit lands; fail path (`ctrl.fail`)
  leaves the pane un-rebuilt with a spinner row — is the recovery honest?
  Theme keeps `#148②` stays-open semantics — verify `current` tracking inside
  the lifted tiles vs `stgs.theme` after mixed picks. **The row intercepts
  match `label.textContent.trim() === 'Theme'/'Language'** — brittle by
  design until the i18n pass (KNOWN, flag only if there's a cheaper hook).
- **MutationObserver menu anchoring:** open a SECOND context menu before the
  first sheet's 400ms removal completes — `dtCtxOpen` is reassigned and the
  FIRST row's `data-dt-ctx-source` highlight may leak (removedNodes cleanup
  only matches the CURRENT `dtCtxOpen.sheet`). Also: the 600ms freshness
  guard vs slow opens; a sheet containing `.c-msgmenu` opened by OTHER means
  within 600ms of a right-click (mis-anchored dialog); long-press path on a
  touch-enabled desktop (contextmenu fires ≈ long-press — double-tag?).
- **Capture-intercepts:** wallet `wscroll` click capture `stopPropagation` —
  keyboard activation (Enter on a focused tx row) must still route inline;
  anything else in the pane relying on that click bubbling (search field?
  chips? they're OUTSIDE the rows — verify). Settings capture listener records
  `settingsRowPick` for EVERY row incl. switches — confirm no nav path
  consumes a stale pick (dtOpenSettings nulls it — check every entry).
- **decorateAppRows:** index alignment `orderedApps(ast)[i]` ↔ rendered rows
  under query + after install/uninstall; render paths that DODGE decoration
  (`applyAppAction`'s internal `renderAppsList` — reachable on desktop? the
  ⋮ menu is replaced, but `aopts` still wires it); the cloned button dropping
  component listeners (intended) but also any component-set ARIA.
- **Per-shell routers:** empty-state + aria-current invariants after every
  path (send onDone → empty + flash; uninstall → empty; details via Discover
  card while a row is selected); `dtDetailView` scroll:false (`dt-cap--fill`)
  vs screens' `height:100%` at short frames; wallet send `onDone` mutating
  `wst.txs` then `flashWalletTx` on a re-rendered list.
- **Chat-info panel:** no focus management on open/close (aside appears,
  focus stays on ⓘ — acceptable? aria-expanded missing on the toggle);
  `closeChatInfo` on chat switch vs an in-flight ctrl inside the panel
  (member kick at 900ms after panel torn down); crew `onLeave` closes the
  chat but the ROW stays; row-menu 'delete' removes the row while its chat
  is OPEN in the detail pane (stale conversation — wedge or acceptable?).
- **Sheet-as-dialog CSS:** `max-height: 76%` + `overflow-y: auto` on
  `.c-sheet` — nested scroll vs member-sheet/language internal `u-scroll`
  regions; anchored dropdowns near frame edges (clamps use 1e4 fallbacks —
  real-browser values); fade-only transition (`transform: none`) — confirm
  `transitionend` still fires for dismissOverlay removal (opacity transitions)
  or the 400ms fallback carries it; `[data-dt-anchor]` padding override vs
  the handle-hidden top spacing in EVERY dialog (Damir hit one — sweep sheet
  consumers: avatar sheet, misstx, channel, menus, nudges, attach).
- **Light/dark sweep of TRANSLATED surfaces (spec §4 duty):** call dialog was
  re-inked (06d ⑬) — sweep the rest: anchored menus, channel dropdown, attach
  popover, backup/rating nudges, theme tiles in pane, txsheet inline (it left
  its sheet context — `.c-txsheet` on pane background instead of
  `--surface-menu`: check both themes), `.dt-info` panel surfaces.
- **Rail (4 rounds of churn):** the final state is whole-item pill +
  crossfade OFF + unpadded iconwrap — verify no leftover rule from rounds 1–3
  contradicts (the demo CSS now has TWO rail blocks that cascade); badge
  position; avatar swap (`setRailAvatar`) drops `[data-dual]` and rebuilds
  children — setNavBadge still finds the badge after the swap? (it re-appends
  the ORIGINAL badge node — verify by reading setNavBadge).
- **`--dt-list-w` hero scaling:** clamp math at 280/520; the var is set on
  drag/dblclick/init but NOT on a programmatic pane resize (none exists —
  confirm); `white-space: nowrap` on the amount vs very long balances at
  280px.
- **chat.html trims blast radius:** group topbar `actions: []` — does
  createTopbar render an empty actions wrap (cosmetic gap?); older smoke
  blocks that counted topbar buttons in chat.html.
- **Smoke block quality:** the desktop block mixes runtime + static guards —
  verify assertions actually FAIL when reverted (spot-check 3–4 by mental
  reversion); the bubble-menu test now targets the inner bubble (06d) — the
  row-menu test still targets the row (correct — attachChatRowMenu binds the
  row); sleep budgets vs mock timings (700/900/1400ms mocks vs 80–1400ms
  sleeps).
- **Spec §6c/§6d "landed" claims:** audit each ①–⑰ / d① –⑭ claim against
  code — the spec was written mid-flight; any claim without code = drift.

## Known/parked (do NOT re-flag)

- Bot roster feed + paging, ADD-member affordance, group RENAME (no legacy
  verb known) — §8/§9 BE asks, logged (spec §6c/§6d).
- Markdown-in-bubbles parity batch (legacy PR #50 mirror) — OPENED, not built.
- Replies = §8 proposal (reactions ship first — decided).
- Downloads multiselect/bulk — component + §9 ask, "not cheap" verdict stands.
- Desktop LAUNCH composition (create/restore) — its own pass (flag ⑮).
- `setNavAvatar` free fn — component ask; demo decorates directly meanwhile.
- Contacts-on-desktop (picker replaces chat list in the pane, directory mode,
  add/group-setup as detail swaps) — NEXT batch, spec'd in the handoff.
- **Chat multi-select/copy on desktop** (Damir asked mid-session): message
  menu Copy works (Clipboard API); the mobile `enterChatSelect` multi-select
  pattern is NOT wired on desktop — rides the contacts/next batch. Assess
  wiring cost, don't build in the audit.
- Theme/Language row TEXT-MATCH brittleness — dies at the i18n pass (below);
  flag only a cheaper structural hook if one exists.
- Discover grid-vs-list default (flag ④) · scan/lock takeovers on desktop
  (flag ③, Phase-3 surfaces) · wallet safe-area #22 (device item) ·
  members-count formatting (12400 → 12,4k) — Damir dials.
- App lock hidden on desktop = DECISION (C#-less PIN is theater), not a gap.
- The demo IS the desktop composition — no responsive reflow (spec §7).

## After CLEAN

Update the batch DECISIONS rows with the audit outcome + backlog · Damir
rebuilds bundle + runs smoke one last time and eyeballs: rail selected state ·
anchored dropdowns (fade-in-place) · dialogs' top padding · light-mode call
dialog · payment/app-details/downloads sizing · theme/language pane pickers ·
bot members in chat info. Then the batch merges and Phase 2 continues
(a11y/copy sweeps · B2 icon exports · dark-mode deviations log), with the
**i18n extraction batch queued before Phase 3** (see handoff).
