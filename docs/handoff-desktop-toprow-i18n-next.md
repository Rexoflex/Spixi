# Handoff → next session: close the desktop top-row fix, then the i18n extraction batch

> **HOW TO USE THIS HANDOFF**
> 1. **Damir, on the PC first (not the AI — sandbox can't build/commit, #142):**
>    close out §A + §A2 — run `generate-icons.mjs` → `build-demo-bundle.mjs` →
>    `smoke-test.mjs`, eyeball, and **commit the desktop top-row + icon work via
>    GitHub Desktop.** Do this BEFORE the fresh chat so i18n doesn't pile onto an
>    uncommitted working tree.
> 2. **Fresh chat:** run the boot ritual below, confirm §A/§A2 are committed
>    (`git log`), then **start the i18n extraction batch = §B.** That is the task.
>    §A/§A2 and the audit outcome are context/history, already done.

Boot ritual for the fresh chat: `CLAUDE.md` → `DECISIONS.md` (latest rows) →
`docs/desktop-split-spec.md` → this file. The desktop batch is DONE + audited;
this handoff carries (A) the top-row + icon work to commit, and (B) the next real
task — **i18n extraction** (queued pre-Phase-3, Damir standing order).

## Sandbox reality on THIS machine (important — re-confirmed this session)

`#142` stands, with a nuance worth recording: on this PC session the **bash /
sandbox mount serves STALE files** (working-tree `desktop.html` read as the old
530-line pre-batch copy), BUT the **file tools (Read/Edit/Write) see FRESH
content** (the real 1717-line batch). So:
- Trust the **file tools** for reading/editing the working tree.
- Trust **`git show HEAD:<path>`** for the committed truth (git object store is
  never stale).
- Do NOT trust plain `wc`/`cat`/`sed` on working-tree paths in bash — stale.
- Do NOT build the bundle or commit from the sandbox (phantom staged deletions).
- Full `build-demo-bundle` + `smoke-test` = **DAMIR on the PC** (PowerShell, in
  the `Spixi` subfolder, no `&&`); the suite also exceeds the sandbox's 45s
  single-call ceiling. Syntax was verified in-session via `node --check` on
  git-object-store copies with the edits replayed.

## A. Desktop top-row fix — APPLIED, uncommitted, needs eyeball + commit

**Symptom (Damir screenshots):** the detail-pane top row (back + title) was not
full width on Account + Wallet screens — it inherited the content cap
(`#detail-account .dt-cap` 640px / `#detail-wallet .dt-cap` 560px).

**Root cause:** `dtDetailView` (desktop.html) appended the router topbar INSIDE
`.dt-cap`, so the header was capped with the content.

**Fix (demo layer only — components frozen, no bridge verbs):**
- `src/demo/desktop.html` `dtDetailView`: the router header is now a
  full-width sibling ABOVE the cap (`head.classList.add('dt-detailhead')`;
  `host.replaceChildren(...parts)`). Covers theme/language (Account) +
  tx-detail/send/receive (Wallet) + apps details/add/discover (rides along,
  consistent).
- `src/demo/desktop.html` `<style>` tail (placed LAST to win the source-order
  tie vs `#detail-account .dt-cap { 640px }`):
  - `.dt-detail .dt-detailhead { flex: none; }`
  - `#detail-account .dt-cap--fill { max-width: none; }`
  - `#detail-account .dt-cap--fill > * > :not(.c-topbar) { max-width: 640px; margin-inline: auto; width: 100%; }`
    — Account **component** screens (backup/downloads/dev/contributors/encpass/
    chat-appearance/privacy/notifications/security) ship their OWN topbar as the
    first child of a root that also holds `.c-*__body`; freeing the root to full
    width + capping the non-header children spans the header without touching the
    component. Structure verified consistent across settings-backup / settings-app
    / settings-screens / lock-shell (encpass).
- `scripts/smoke-test.mjs`: two static guards added (`.dt-detailhead` + the
  fill-cap rule) so the fix can't silently regress.

**EYEBALL (jsdom is layout-blind — Damir must look in a real browser):**
- Account: Theme, Language (router headers) · Backup, Downloads, **Change
  password**, Contributors, Dev, Chat appearance, Privacy, Notifications,
  Security (component headers — the `:not(.c-topbar)` cap is the one to sanity-
  check; if any screen's body looks wrong, dropping just that CSS line keeps the
  router-header win intact).
- Wallet: tap a tx (detail), Send, Receive — headers should span the pane, forms
  stay centered (560).
- Apps (rides along): details/add/Discover headers full width.

**To close A:** `node scripts/build-demo-bundle.mjs` → `node scripts/smoke-test.mjs`
on the PC (bundle rebuild still mandatory from the desktop batch — chat-info.js
changed), eyeball the list above, commit via GitHub Desktop. Suggested DECISIONS
row: *"Desktop detail-pane top row spans full pane width (router header above the
cap; Account component screens freed + body-capped). Demo layer only; +2 smoke
guards."*

## A2. Icon exports (B2) — WIRED this session, needs PC regen + eyeball

Damir exported 4 SVGs to `src/assets/icons/` (verified: correct `tabler-icon-*`
names, 24×24, ink `#131415` → currentColor, no rogue colors → both modes covered):
`world`, `lock`, `user-plus`, `user-circle-filled`.

Code wired to consume them (flagged component edits — resolves the #146 icon gaps):
- `settings-shell.js:661` Language glyph `at` → **`world`**.
- `settings-shell.js:699` App-lock glyph `square-asterisk` → **`lock`**.
- `contacts-shell.js:249` Add-contact glyph `user-circle` → **`user-plus`**.
- `desktop.html` rail CSS: the **selected-tab filled crossfade is RE-ENABLED**
  (was `display:none` since 06d). Fades in place (transform:none, so it can't
  slide against the pill — the original reason it was off). `user-circle-filled`
  now exists so Account crossfades too; apps/messages/wallet twins already shipped.

**PC steps to light it all up (sandbox can't regen the registry — #142):**
1. `node scripts/generate-icons.mjs` — picks up the 4 SVGs, regenerates
   `icons.js` + `icons.iife.js` with theming applied.
2. `node scripts/build-demo-bundle.mjs` — folds the new registry + swapped
   components into `spixi.iife.js`.
3. `node scripts/smoke-test.mjs`.
4. Eyeball (both modes): Settings Language = globe · App lock = padlock ·
   Contacts Add = user-plus · **desktop rail: selecting Chats/Apps/Wallet/Account
   shows the FILLED glyph** (fades in, no slide).

Minor known edge (leave or polish later): `setRailAvatar(null)` (after a user
sets THEN removes an avatar) rebuilds the Account rail item without its filled
twin, so it shows outline-on-select only in that rare path — the default state
crossfades correctly.

## Desktop audit outcome (already committed as `Desktop mode review and audit`)

Opus #46 loop = **CLEAN**. Hard constraints all held (components frozen except the
sanctioned chat-info bot gate; no new bridge verbs; static guard blocks
≥700px/container queries; #56 overlay grammar intact). Two mechanical fixes landed
+ committed: delete-of-open-chat collapses the pane; a tautological members smoke
assertion was tightened. Backlog logged, NOT fixed (pick up in the sweeps below):
- **[A1]** chat-info ⓘ toggle lacks `aria-expanded` → the Phase-2 a11y sweep.
- **[D1]** context-menu highlight could leak if two menus co-existed — scrim-
  mitigated (a 2nd right-click hits the scrim, not a row); defensive-only.
- **Dark-log (spec §4):** inline `.c-txsheet` tx-detail renders on the pane
  surface, not `--surface-menu` — sweep with anchored menus / attach popover /
  theme tiles / nudges in the demo dark pass.
- Trivial: the rail Chats badge isn't decremented after a row delete.

## B. NEXT TASK (fresh chat): i18n extraction batch — pre-Phase-3

Damir order ("multilingual from the get-go"). The architecture is already right:
every component reads `strings.X || 'fallback'`, and the legacy side has SL
dictionaries + `ixian:language:<code>` + live-swap. The batch (from
`handoff-desktop-split-build.md` §NEXT, still current):
1. Sweep all components for `strings.X || 'fallback'` → generate the canonical
   en-us dictionary (script it into `scripts/`; it's a greppable pattern).
2. Every key gets a CONTEXT note (where it renders, tone, length) — contextual
   translations.
3. Map keys to legacy SL ids where a legacy string exists (reuse shipped
   translations; the diff = new keys, incl. plural/format cases like the members
   count `12400 → 12,4k`).
4. Wire a strings provider into the demo compositions + a PSEUDO-LOCALE smoke
   pass (marker dictionary — any English leaking through = a hardcoded-string
   bug). **This is also the trigger to replace the desktop.html theme/language
   row TEXT-MATCH intercepts** (`label.textContent.trim() === 'Theme'/'Language'`,
   desktop.html ~1361-1372) with a structural hook — they break the moment the UI
   isn't English, so they MUST move here. This retires the batch's biggest known
   fragility.
5. Absorbs the parked "launch SL dictionary extraction" task.

Deliverable: dictionary + context sheet Damir can hand to translators, and shells
that boot in any dictionary from day one.

BEFORE building, in the fresh chat: read `ARCHITECTURE.md §7` (strings/env) + the
legacy SL mechanism (`docs/audit/assets-audit.md` localization section) so the key
IDs map cleanly to what C# already ships.

## Then (unchanged roadmap)
Phase-2 tail (a11y sweep → clears [A1]; copy sweep; dark-mode deviations log →
clears the `.c-txsheet` item; B2 icon exports incl. `user-circle-filled` so the
Account rail item gets a filled twin) · contacts-on-desktop batch · Phase 3
integration (bridge wiring: `selectChat`/`selectTx` mirrors, real
`ixian:language` switch).
