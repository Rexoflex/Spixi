# Spixi Design System

**Status:** Draft — token architecture decided, component inventory for review; token values populate after Figma cleanup + full extraction
**Pairs with:** `ARCHITECTURE.md` (shells, data contracts) · `docs/tokens-analysis.md` (extraction findings)

## 1. Token architecture (decided 2026-07-02)

Three tiers, maintained in Figma (source of truth), exported to code. Figma collections: `Spixi - primitives`, `keys`, `tokens` (+ `typography`, `keys-responsive`).

```
primitives            →  keys                →  tokens (semantic)
raw ramps, mode-less     mode-less aliases      LIGHT + DARK modes;
grey/brand/blue/red/     naming layer:          each token maps to a
orange/green/purple,     neutral→grey,          different KEY per mode:
type, scale              primary→brand,         surface/neutral/01 =
                         accent/info/success/     light: neutral/10
                         warning/error             dark:  neutral/900
```

- **Primitives**: raw values only. Adding a scale or swapping which ramp feeds a key happens here/at keys.
- **Keys**: zero raw values, no modes — a stable vocabulary over the ramps (swap `primary` from brand to another ramp in one place).
- **Tokens**: what components consume. Light/dark modes live *here*, per token — giving per-token control of the dark mapping (a bubble can flip differently than a card).

**CSS mapping:** primitives + keys → static custom properties; tokens tier → `:root` (light values) and `[data-theme="dark"]` override block. Semantic region aliases (topbar/bubble/etc.) are tokens like any other, with both modes defined.

**Naming convention:** numeric, value-derived — `spacing/16` = 16px, `radius/12`, `duration/200`, `z/40`. No t-shirt sizes. Color primitives keep ramp numbering (`neutral/100–900`).

**Roles:** single `action` (interactive) role — no separate accent. Status: `success / error / warning / info`. `destructive` derives from `error` keys.

**CSS pipeline (maintainability):** Figma variables → dumped to `src/styles/tokens.json` (repeatable read-only extraction via Figma plugin API) → Vite build generates `tokens.css`:
primitives → `:root`, keys → `:root` + `[data-theme="dark"]` overrides, semantic → static aliases. Re-syncing after any Figma change = re-run extraction + commit the diff; components/shells never change. Same pipeline covers fonts (family/size/weight tokens) and the Tabler sprite (icon list is data, sprite regenerates).

## 2. Missing token groups — Figma-side items WRITTEN 2026-07-02 ✅

Applied via connector (Damir to review in Figma):

- **primitives**: `scale/44, 48, 56, 96, 700, 840` added.
- **keys-responsive**: all `spacing/*` renamed to numeric (`spacing/16` = 16px; negatives `spacing/-40`); `spacing/48` added; `layout/bar-top(56), bar-bottom(64), composer-min(56), breakpoint-split(700), content-max(840)` added (both modes same value, responsive-ready).
- **keys**: `size/icon/16·20·24·32`, `size/avatar/24·32·40·56·96`, `size/target-min(44)` added; `outline-width/lg` → `outline-width/4`.
- **tokens** (light+dark): new `region` namespace — `colors/surface/region/{screen, topbar, bottombar, composer, card, card-raised, bubble-sent, bubble-received, input, qr, presence-online, progress-track, progress-fill}`, `colors/text/region/{bubble-sent, bubble-sent-meta, bubble-received, bubble-received-meta}`, `colors/outline/region/{input, focus}`. QR surface stays near-white in both modes (scan readability). Renames: `outline/neutral/inverse 2` → `inverse-02`, `inverse` → `inverse-01`.
- Naming rule applied: numeric names for *scales*; role names for *semantic* tokens (a bubble token's value can change; its role can't).
- Scrim: no Figma variable (keys have no alpha) — code-side `neutral/1000 @ 60%`.
- **Flagged, not changed** (Damir to confirm in Figma): `outline/semantic/info` dark → `primary/300` (likely `info/300`); `icon/neutral/on-action` dark → `primary/950` (text twin uses `neutral/950`); `surface/semantic/accent-hover` dark identical to default.

### Code-only token groups (never in Figma — defined in tokens.css)

| Group | Proposed tokens | Notes |
|---|---|---|
| **z-index** | `z/0` base · `z/10` sticky (date headers) · `z/20` bars (top/bottom/composer) · `z/30` dropdown/context-menu · `z/40` sheet/scrim · `z/50` modal · `z/60` call-bar · `z/70` toast/alert | call-bar above modal: an active call must stay visible |
| **elevation** | `elevation/0–3` as shadow values; dark mode maps the same tokens to surface-tint instead of shadow. Figma side: effect *styles*, not variables | |
| **motion** | `duration/100` (micro: hover, toggle) · `duration/200` (standard: sheets, dropdowns) · `duration/300` (view transitions) · `easing/standard` cubic-bezier(0.2,0,0,1) · `easing/decelerate` · `easing/accelerate` · all → 0 under `prefers-reduced-motion` | keep small; expand only when a component demands it |
| **opacity** | `opacity/40` disabled · `opacity/60` scrim | |

## 3. Component inventory

Derived from the 9 shells' data contracts (ARCHITECTURE.md §3–5) cross-referenced with the Figma Components page (node 9275:74). **Figma col:** ✅ exists · 🟡 partial (missing variants/states) · ❌ missing.

### 3.1 Foundations & primitives

| Component | Variants × states | Figma | Used by |
|---|---|---|---|
| Button | fill/tonal/outline/text × **3 heights named by value: `32` / `44` / `56`** × default/destructive × 6 states — ✅ done 2026-07-02: `button/56/*`+`button/32/*` renamed from large/small (instances preserved), `button/44/*` built (24 variants each, token-bound, label/sm + spacing/10·20 padding). Width axis = instance-level auto-layout (hug default / fill container), NOT variants. Code-side button.css pending. | ✅ | all |
| Vertical button (icon+label) | fill/outline × 5 states | ✅ | home quick-actions |
| Link | large/small × 5 states | ✅ | all |
| Text field | large × filled/empty × 6 states | 🟡 needs: small size, textarea/multiline (chat composer base), password variant with visibility toggle, amount/numeric variant | forms, payments, launch |
| Switch | checked × 5 states | ✅ | settings |
| Tab / tab-group | text/icon × selected × 4 states | ✅ | home |
| Segmented control | 2 variants | 🟡 states missing | payments filter (all/sent/received) |
| Badge | 5 types × tonal/solid | ✅ | status everywhere |
| Chip | small/large × 4 states | 🟡 needs: dismissible (recipient chips in payments) | payments |
| Slider | + handle × 3 states | ✅ | (usage TBD) |
| Avatar | 5 states + no-photo | 🟡 needs: size row (24–96), group avatar, online-dot compound | lists, chat, contacts |
| Divider | line / or-divider | ✅ | all |
| Indicator (unread) | count/count-muted/muted | ✅ | home, chat |
| Status icon | delivered/sent/read/sending/failed | ✅ | chat, lists |
| Icons | ~70 Tabler symbols | ✅ | sprite source |

### 3.2 Navigation & app frame

| Component | Variants × states | Figma | Used by |
|---|---|---|---|
| Top bar | title/back · contact-identity (avatar+nick+online) · actions | ✅ (`title bar`, `top`) | all shells |
| Bottom nav | nav-icon/nav-item × selected/super-selected | ✅ | home (mobile) |
| Sidebar nav (desktop split) | rail with same items | ❌ | home ≥700px |
| Warning banner | connectivity/update (`showWarning`) | ❌ | home, chat |
| Call bar | active call, timer (`displayCallBar`) | ❌ | global overlay |
| App-request prompt | mini-app/call accept-reject (`addAppRequest`, `addCallAppRequest`) | ❌ | global overlay |
| Modal dialog | title/body/2 actions (replaces `showModalDialog`) | 🟡 (filters modal looks legacy) | all |
| Bottom sheet | action lists (replaces `toggleAnimatedSlider` menus) | ❌ | home, chat, payments |
| Toast | success/error feedback | ❌ | copy address, errors |
| Empty state | illustration+text+CTA | ❌ | lists, empty_detail pane |
| Loading overlay / spinner | blocking (restore, sending) + inline | ❌ | launch, payments |

### 3.3 Lists

| Component | Variants × states | Figma | Used by |
|---|---|---|---|
| Chat list item | excerpt (14 types ✅) × unread × online × timestamp | ✅ (`chat-item`, `excerpt`, `timestamp-chatlist`) | home |
| Contact list item | default · picker (single/multi-select checkbox) · participant (kick/ban actions) | 🟡 picker/participant variants missing | home, payments picker, chat |
| Activity/transaction item | sent/received/pending/failed × fiat row | ✅ (`list-chat` payment types) | home wallet tab, contact details |
| File item | downloads (open/delete) | ❌ | settings/downloads |
| App item | list row + card (icon, publisher) | ❌ | home apps tab, apps shell |
| Settings row | label · label+value · label+switch · destructive · chevron | ❌ | settings |

### 3.4 Chat specifics

| Component | Variants × states | Figma | Used by |
|---|---|---|---|
| Message bubble (text) | sent/received × group (nickname+avatar on received) × delivery status × reactions | ✅ `message-bubble` 7 variants (Chat & Composite) — verify group variant | chat |
| Payment bubble | request (pending/paid/declined) · sent-funds × view action (14-arg contract) | ✅ `payment-request` 11 variants + `payment-card` 5 | chat |
| File bubble | image preview/generic × progress 0–100 × accept/open (13-arg contract) | 🟡 `file-bubble` incoming/outgoing-sent — needs progress/failed/accept states | chat |
| App-session bubble | invite × accept/reject × missing-app state (13-arg contract) | ✅ `app-card` 5 + `app-image` 2 | chat |
| Call event bubble | incoming/outgoing × answered/declined + duration | ✅ `call-card` 2 | chat |
| Reactions row | emoji+count, `tip:` amount | 🟡 `reaction` standalone — needs count/tip variants | chat |
| Composer | input (multiline) · attach · send · typing-emit | 🟡 `input` + `send` (2) exist — needs attach + compound assembly | chat |
| Channel selector | bot channels dropdown × unread | ❌ | chat (bots) |
| Context menu | per message type (tip/like/delete/report/kick/ban) | 🟡 (`Dropdown menu` base) | chat |
| Typing indicator · date separator · contact-request banner (accept/undo) | | ❌ | chat |

### 3.5 Payments & wallet

| Component | Variants × states | Figma | Used by |
|---|---|---|---|
| Balance display | visible/hidden × fiat × per-contact | ❌ | home, payments |
| Amount input | numeric, MAX action, fiat echo, validation (`setAmount`/`getMaxAmount` contract) | ❌ | payments |
| QR display | address × request-with-amount (`:ixi` payload) | ❌ | receive, contact details, home |
| QR scanner frame | camera viewport + torch (scan shell) | ❌ | scan |
| Fee row / tx summary | fee, total, txid, explorer link (`setData` 5-arg) | ❌ | payments confirm/result |
| Tx status hero | pending/confirmed/failed animation | ❌ | wallet_sent replacement |
| Recipient row | avatar+nick+address (masked) | ❌ | payments |

### 3.6 Launch & onboarding

| Component | Variants × states | Figma | Used by |
|---|---|---|---|
| Step wizard | dots + next/prev (replaces triplicated `nextStep/prevStep`) | ❌ | launch |
| Password field + strength/match | visibility toggle, error (`showPasswordError`) | ❌ | launch, lock, settings |
| Language selector | 13 languages + flags | ❌ | launch, settings |
| Theme selector | system/light/dark | ❌ | launch, settings |
| File pick row | backup file name + remove (`setUploadedFileName`) | ❌ | restore |
| PIN/biometric prompt area | lock shell | ❌ | lock |

**Inventory count:** ~55 components; Figma covers ~vs 18 ✅ + 8 🟡, ~29 ❌ — mostly the chat bubbles, payments set, overlays, and settings rows.

## 4. Token gaps revealed by the inventory

Beyond §2: `surface/composer`, `text/balance` (tabular numerals flag), `surface/scrim`, `outline/focus` (keyboard focus ring — one token app-wide), `surface/bubble-payment` (distinct from text bubbles?), progress-bar tokens (`surface/progress-track`, `surface/progress-fill`), QR quiet-zone surface (always white in dark mode — QR readability), online-dot (`surface/presence-online`).

## 5. Next actions

1. Damir reviews §2 scales + §3 inventory (flag anything unwanted; confirm bubble/QR/focus tokens in §4).
2. Figma cleanup per `docs/tokens-analysis.md` §4 + this doc §2/§4 — in Figma, restructured to primitives→keys→semantic, numeric names.
3. Full two-mode variable dump → `tokens.json` → generated `tokens.css` — then **lock**.
4. Build order for components: foundations (✅ set, verify bindings; buttons rebuilt to 32/44/56 + width axis) → app frame → lists → chat → payments. Each lands in Figma and code together, demoed via mock bridge.

## 5b. Interaction spec: message context menu (decided 2026-07-02)

The menu for message actions (react, reply, copy, delete, report, tip, kick/ban…). One component, two presentations.

**Mobile (long-press)**
- Trigger: long-press ~500ms on the bubble (pointer events; cancel on >10px move = scroll intent). Haptic if available via existing bridge (none today — degrade silently).
- Presentation: conversation dims under `--surface-scrim` at `--z-40`; the **bubble stays undimmed** above it (`--z-50`, `--elevation-2`) — no fill change on the bubble itself, promotion is scrim + elevation. Reactions row appears attached above the bubble; action list in a `--surface-menu` panel (`--radius-16`, `--elevation-3`) anchored below/above the bubble depending on viewport space, never covering it.
- Items: ≥ `--size-target-min` (44px) rows, icon + label, destructive items in `text-error` grouped last.
- Dismiss: tap scrim, hardware back (`onBack` bounce), or action completes. All transitions `--duration-200 --easing-standard`; scrim fade honors reduced-motion.

**Desktop (≥700px)**
- Hover on a message reveals an inline affordance (⋯ + quick-react) at the row edge — row uses `--surface-interactive-hover`, affordance is not present in the DOM for touch-only.
- Menu opens from ⋯ click or right-click at cursor: `--surface-menu` panel, `--z-30`, `--elevation-2`, no scrim (desktop menus are light-dismiss: click-outside or Esc).
- Keyboard: message focusable; `Shift+F10`/Menu key opens at message, arrows navigate items, Enter activates, Esc closes and returns focus to the message. Focus ring = `--outline-focus`, never a fill.

**Actions ↔ bridge reality check** (ARCHITECTURE.md §3): available today via `ixian:contextAction:*` — tip, like/react, deleteMessage, report (bots), kickUser, banUser, sendContactRequest; copy is JS-side. **Reply and edit do NOT exist in the current bridge** — added to §8 as proposed commands; menu renders them only when the capability handshake confirms BE support.

## 6. Component build workflow (decided 2026-07-02)

- **Claude via Figma MCP** builds structure: variant sets, all states, and variable *bindings* to `tokens` (the part manual work gets wrong and Figma's native AI hardcodes instead of binding).
- **Damir** does visual polish and judgment in Figma directly.
- **Figma native AI (Make/First Draft):** throwaway exploration only — output never enters the library (doesn't respect token bindings).
- Code component is generated from the same token names in the same unit of work → Figma and CSS stay in sync by construction.
- Inventory (§3) is additive — new components discovered while building get added, no process cost.
