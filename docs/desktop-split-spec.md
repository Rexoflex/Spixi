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

## 6a. Contact-request mapping on desktop (RECOMMENDED — resolves flag #86; lands in the contacts-on-desktop batch, not this pass)

Not built in this batch: the desktop chats list is hand-built (regular chats
only), so incoming contact requests are not wired here. Recommended mapping for
the contacts-on-desktop batch so #86 ("minimal-pane vs list-only") isn't
re-litigated. The accept→handshake state machine is FROZEN in
`chats-shell-spec.md §7` — desktop reuses it verbatim, only the PLACEMENT changes:

- **Request lives in the LEFT (list) pane**, not the detail pane: the shipped
  `c-contact-request` row, interleaved by arrival time (chats-shell §5), Decline
  (c-modal confirm) + Accept. A pending request is **NOT selectable into the
  right pane** — there is no chat to open yet. Clicking it does nothing / could
  surface the request affordances; it never routes `onOpen`.
- **Accept does NOT open a chat window.** Per chats-shell §7: Accept →
  "Accepting…" latch → `acceptContactRequest` swaps the request for a
  **handshaking** chat row (left pane, `aria-busy`, "Establishing a quantum-secure
  handshake…", un-openable → `onHandshakeBlocked`). The **right pane stays on the
  empty/"Select a chat" state** through the handshake — we do NOT mount a
  conversation for an unsecured contact.
- **Only `completeHandshake` unblocks entry.** When the bridge handshake-complete
  signal lands, the row clears to a normal openable chat (bumped to top); *now*
  selecting it mounts the conversation in the right pane like any other chat.
  Decline, or handshake fail/timeout/cancel, removes the row (`failHandshake`).
- **Non-contact composer-off (#86)** rides along: if a not-yet-contact
  conversation is ever shown in the right pane, the composer is disabled
  downstream (shell responsibility, same as mobile).

Net: **you can never select a stranger's chat window until you've accepted AND
the secure handshake completes** — identical guarantee to mobile, the split view
only relocates the request row to the list pane and keeps the detail pane empty
until the chat is real.

## 6b. Damir orders, 2026-07-06 build session (live, mid-build)

① **Chat info = RIGHT PANEL** in the chats detail pane (⋮ toggles it; closes on
chat switch / back inside the panel). Same `createChatInfo`, demo-fed data —
the panel column is demo CSS (`.dt-info`). ② **Call icon is 1:1-only** at this
stage — group/bot topbars omit it. ③ **Sheets PRESENT as centered dialogs**
inside the frame ("bottom sheet sucks on desktop") — demo CSS scoped to
`.dt-frame .c-sheet`; the #56 stack/host/dismissal grammar and component
overlay.css are untouched. ④ **Bot channel selector slides in BELOW the
topbar** — anchored to the topbar rect at open (inline left/top/width +
`data-dt-anchor`), the exception to ③; scrim keeps light-dismiss.

## 6c. Damir demo pass, 2026-07-06c (screenshots round — 17 items, all landed
unless flagged)

**Landed (demo layer only):** ① rail polish — wider, quieter resting ink,
tonal pill hugs the ICON (dials live) ② wallet hero type tracks the pane via a
JS-set `--dt-list-w` var (clamp 22–38px, no container queries) + the misstx
pill wraps under the chips ③ pane topbar titles = label-lg ④ apps rows swap ⋮
for an ⓘ that opens details (uninstall lives there); DESKTOP chat topbar = ⓘ
opens the info panel; MOBILE chat topbars drop ⋮ (identity tap owns info) and
the group Call action ⑤ conversations grow UPWARD from the composer
(first-child margin-auto) ⑥ "How it works" → spixi.io/help-center.html (real
shell routes it through the external-link confirm) ⑦ channel selector drops
STRAIGHT DOWN from the identity + an explicit chevron-down trigger next to ⓘ
⑧ group info: full member list, admin kick/ban, notifications toggle
(capability-fed) ⑩⑰ right-click on bubbles AND chat rows = anchored dropdown
at the pointer + the source row highlights while open (MutationObserver tags
the sheet; #56 grammar untouched); drag-select over bubbles stays native (no
user-select lockout) ⑪ theme picker = PREVIEW TILES lifted into the right
pane (settingsThemeSheet builder, #148② stays-open contract; hub row value
follows) ⑫ App lock HIDDEN on desktop — a C#-less PIN is WebView-storage
security theater for a wallet; returns at Phase 3 with C# LockPage ⑬ encpass
CTA hugs content below the inputs (body no longer pushes it to the pane
bottom) ⑭ settings detail cap 640px; backup CTA centered/narrower, wallet-only
export hugs ⑯ picked avatar replaces the Account rail glyph (c-bottomnav has a
native avatar slot; free-fn `setNavAvatar` flagged as a component ask).

**Flagged / not landed:** ⑧ bot member list (component gates members to
kind='group'; a 12,4k list needs paging anyway) and an ADD-member affordance —
component + BE asks ⑨ group rename for creators/admins — `onNickname` is
1:1-only in chat-info AND no legacy rename verb is known → §9 BE ask before FE
work ⑮ launch/create/restore on desktop — the launch demo is phone-framed;
the desktop launch composition is its own small pass (flag) ⑩ the anchored
menu is the §5b "anchored panel" decided — mobile keeps the sheet presentation.

## 6d. Damir refinement, 2026-07-06d (round 2 + smoke result + follow-ups)

**Smoke failure explained:** the ⑩ bubble assertion dispatched contextmenu on
the ROW wrapper; `attachMessageMenu` listens on the INNER bubble — test-side
bug, fixed. The anchored presentation itself only landed in 06c — re-verify
in the browser before re-flagging.

**Landed:** ① attach/share grid = POPOVER rising from the composer ⊕
(`data-dt-anchor="up"`) ② context dropdowns drop from the SOURCE ROW's bottom
edge at the pointer's x (clear pairing with the highlight) ③ rail: item↔item
24, icon↔label tight, pill = 52×38 radius-12 ④ incoming call = centered
dialog card (+ "Incoming call" toolbar button) ⑤ **bot member list — LEGACY
PARITY confirmed** (channel-bar people icon, screenshots on file): chat-info
members gate widened to `kind === 'bot'` — FLAGGED component change,
rationale inline; real roster feed + paging stays a §9 BE ask. ⚠ chat-info.js
changed ⇒ REBUILD the bundle before smoke. ⑥ payment screens: wallet detail
cap 560, amount inputs step down to heading-sm, Review/Share/Send-request CTAs
hug left (encpass grammar) ⑦ downloads rows = cards (surface-card, air,
timestamp already present) ⑧ language picker = checked options lifted into
the pane (one-shot picker → a successful pick REBUILDS with the new current,
so the check mark moves) ⑨ translated dialogs get real top air — the sheet's
8px top padding was the drag-handle's seat; dialogs now pad 24 all around,
anchored dropdowns stay tighter (12/16) ⑩ rail round 3: item gap 32; the
icon CROSSFADE is off on the rail (the -filled twin anchors to the unpadded
wrap corner and slid against the pill — desktop state = ink + pill, nothing
translates) ⑪ every anchored surface (dropdowns, channels, attach popover)
now FADES IN PLACE — transform: none in both states, so nothing can visually
arrive from top-left regardless of what the first-frame transform resolves to
⑫ app-details Install/Uninstall CTAs hug + center on desktop (min 240px;
mobile keeps its full-width conversion bar) ⑬ call dialog re-inked: the
component's on-scrim tokens (name/sub/labels, Ignore circle, focus ring)
vanish on the light menu-surface card — desktop overrides swap them to the
neutral ink family; the mobile scrim stage keeps its own recipe. This is the
Phase-2 dark/light verification doing its job (spec §4) — token-pair misses
on translated surfaces get logged here, fixed in the demo layer. ⑭ rail round
4: the pill is the WHOLE item again (icon + label inside comfortably, radius-12,
scale 0.9→1) and the iconwrap is unpadded so the unread badge hugs the icon
corner — the icon-zone pill kept fighting component-internal anchors (badge,
filled twin); containing everything beats offset surgery.

**Flagged / asks:** downloads MULTISELECT + bulk actions — not cheap:
selection state + bulk bar are component work, and bulk *download/export* has
no bridge verb (per-file ixian:open only) → component + §9 BE ask. Count
formatting on the bot members header (12400 → 12,4k) — formatCount wiring, a
polish dial.

**Reactions vs replies (answer on record):** reactions are DONE frontend-side
(render/merge on bubbles, quick-react row in the menu) and the legacy verb
exists (`ixian:contextAction:*`) — shippable FIRST. Replies are menu-gated
(#25) but have no compose/quote surface and no bridge payload — §8 BE work,
later version. Phase exactly as proposed.

**Markdown in bubbles (answer on record):** NOT in the rework yet —
message-bubble renders `textContent` (XSS-safe, zero parsing). Legacy PR #50
needs a mirrored FE batch: sanitized markdown-lite renderer inside
message-bubble (escape-before-parse, bold/italic/strike/code/blocks/headers/
quotes/lists/rules/autolink) + dark/light code styles. Logged as its own
batch — no parity today.

## 7. Non-goals

Real window-resize reflow between mobile/desktop compositions (the demo IS
the desktop composition; the real app picks per-platform at integration) ·
container queries (#4 baseline) · touching audited component CSS/JS beyond
flagged needs · Phase 3 bridge wiring (`selectChat`/`selectTx` C# mirrors
land at integration).
