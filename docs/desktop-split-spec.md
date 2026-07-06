# Desktop split-view spec — wallet · apps · settings panes (Phase 2)

Phase 2 pass per finalization-roadmap. Chats/chat split-view EXISTS in
`src/demo/desktop.html` (rail 76px · resizable list pane 280–520 (360 default,
double-click divider resets) · detail pane) — this spec extends that SAME frame
to the three remaining shells. Code-first; Damir art-directs in the demo.

**Damir interview 2026-07-06 (this spec's #0 decisions):**
① Settings = **master-detail** — left pane = hub list, right pane = the
selected screen (backup / downloads / dev / contributors); danger flow opens
in the right pane too ② Wallet = **hero+list left, detail right** — compact
hero atop the tx list in the list pane; tx detail / send / receive render in
the detail pane (the `selectTx` mirror) ③ Apps = **list left, details right**
— installed list (list layout) left; app details / add-app / Discover right;
grid stays a right-pane Discover option ④ scope = **extend `desktop.html`**
(composition, #89 chats precedent) — component CSS stays mobile-first; NO
container queries (conservative baseline #4) and no ≥700px rules inside
audited component CSS.

## 1. Frame grammar (exists — reuse verbatim)

`.dt-frame` flex: rail (`.c-bottomnav` verticalized) · list pane · 6px
draggable divider · detail pane (flex:1, content capped at
`--layout-content-max` 840px, centered). Rail tabs Chats/Apps/Wallet/Account
switch which shell owns the two panes (today only Chats is wired; the other
three toast). Tokens already shipped: `--layout-breakpoint-split` 700px ·
`--layout-content-max` 840px.

## 2. Per-shell panes

### 2.1 Settings (Account tab)
- List pane: `createSettingsHub` rows; selected row carries the tinted
  selected state (reserved for desktop per #33) + `aria-current`.
- Detail pane: the picked screen — backup (`createSettingsBackup`) ·
  downloads · dev/log · contributors (`settings-screens.js` / `settings-app.js`)
  · danger (`createSettingsDanger`). Empty state until a row is picked.
- Mobile view-takeovers become right-pane swaps; topbar back in the pane
  returns to the empty/default state, NOT `ixian:back`.

### 2.2 Wallet
- List pane: compact hero (balance + actions, reduced paddings via a demo
  `.dt-wallet-hero` wrapper class — component CSS untouched) above
  `createWalletTxList`.
- Detail pane: tx detail (`openTxSheet` content rendered INLINE as a pane, not
  a sheet — same builder, pane host) · send form · receive/QR. Send/Receive
  hero buttons route the detail pane instead of pushing views.
- Watch-item: wallet-shell.css:60 notes a <360px pane won't trigger its
  viewport query — the list pane min is 280; verify hero degrades cleanly.

### 2.3 Apps
- List pane: `createAppsList` forced `layout:'list'` (grid toggle hidden in
  the pane — grid is a Discover/detail-pane affordance).
- Detail pane: app details (`apps-details.js`) · add-app (`apps-add.js`) ·
  Discover feed (`apps-discover.js`, grid allowed). Empty state default.

## 3. Prerequisite wrappers (the real code work)

Chats has `openChat(id)`/`closeChat()`; the other shells compose free
functions with no selector. Add per shell, IN THE DEMO composition layer
(desktop.html), not in components: `dtOpenSettings(screen)` ·
`dtOpenWalletDetail(kind, payload)` · `dtOpenAppDetail(kind, payload)` —
thin routers that build the right-pane content from existing exports and
manage the empty state + `aria-current`. If a router needs a component
change, it's a flag, not a silent edit (audited components stay frozen).

## 4. Shared rules

- Overlays (sheets/modals/toasts) mount on the FRAME host — one overlay
  stack, never per-pane (#56 grammar).
- Keyboard: list panes are the existing components (their key grammar
  rides along); divider keeps its drag + dblclick-reset.
- Dark mode must just work (token swap) — this pass doubles as the Phase 2
  dark-mode verification for the three shells; log deviations, don't fix
  inline.
- The periodic backup nudge (backup-ux-spec §4.1) mounts on the frame host
  on desktop too — same `showBackupNudge`, no desktop variant.

## 5. Smoke assertions (desktop block, scripts/smoke-test.mjs)

Rail tab switch swaps both panes per shell · settings: hub row click renders
the screen in the detail pane + `aria-current` moves + back returns to empty
state · wallet: tx row click renders detail INLINE (no sheet on the overlay
stack) · send/receive route the detail pane · apps: list forced to
`layout:'list'`, details render right, Discover may grid · divider drag +
dblclick reset still work with every shell mounted · overlays mount on the
frame host (exactly one overlay stack) · empty states present per detail
pane · no component CSS gained ≥700px/container queries (static guard).

## 6. Flags for Damir's demo pass

① compact-hero proportions in the 280–520 list pane (art-direct live)
② settings default: empty state vs auto-select the first row? (spec says
empty; cheap to flip) ③ scan/lock takeovers on desktop — full-frame overlay
or detail-pane swap? (parked: they're security surfaces, propose at their
Phase-3 integration) ④ does Discover default to grid or list in the detail
pane? ⑤ wallet safe-area #22 is a DEVICE item — not covered by this pass.

## 7. Non-goals

Real window-resize reflow between mobile/desktop compositions (the demo IS
the desktop composition; the real app picks per-platform at integration) ·
container queries (#4 baseline) · touching audited component CSS/JS beyond
flagged needs · Phase 3 bridge wiring (`selectChat`/`selectTx` C# mirrors
land at integration).
