# Figma File Sweep — 2026-07-02

**File:** Spixi-App · pages: Thumbnail · 🎨 Foundations · 🧩 Components · 🧬 Chat & Composite · 📱 Screens · 🗄 Archive

## 1. What exists

### 🎨 Foundations
`Typography Styles` frame only. Color/spacing live as variables (dumped 2026-07-02, see tokens.css). No swatch documentation frames — fine, variables are canonical.

### 🧩 Components — 27 component sets + 67 Tabler icons
| Set | Variants | | Set | Variants |
|---|---|---|---|---|
| button/large/default | 24 | | badge | 10 |
| button/large/destructive | 24 | | chip small / large | 4 + 4 |
| button/small/default | 24 | | switch | 10 |
| button/small/destructive | 24 | | tab (+tab-group) | 16 |
| button/vertical | 10 | | segmented-control | 2 |
| link ×2 | 5 + 5 | | divider | 2 |
| text-field/large | 12 | | slider (+handle) | 3 |
| avatar | 5 | | nav-icon / nav-item | 2 + 3 |
| excerpt | 14 | | indicator | 3 |
| list-chat ×2 | 2 + 4 | | timestamp sets ×2 | 2 + 4 |
| status-icon | 5 | | sub-expanded-filters ⚠️ | 6 |

Standalone: statusbar, title bar, top, nav-bot, footer, chat-item, tab-group, slider, timestamp+status, timestamp-bubble, logotype.
⚠️ `sub-expanded-filters` (age/languages/sentiment/article-filters) is from another product — move to Archive.

### 🧬 Chat & Composite — better coverage than inventoried
| Set | Variants | Covers |
|---|---|---|
| message-bubble | 7 | text bubbles incl. states |
| payment-request | 11 | payment bubble states (the "❌" in DESIGN_SYSTEM was wrong — corrected) |
| payment-card | 5 | wallet/tx card |
| app-card | 5 | app-session bubble |
| app-image | 2 | |
| call-card | 2 | call event bubble |
| send | 2 | composer send button |
| file-bubble | 2 (incoming, outgoing-sent) | partial — needs progress/failed/accepted states |
| reaction, input | standalone | reactions row, composer input |

### 📱 Screens — 6 designed (mobile 419px, light mode)
Chats · Wallet · Apps (list) · Apps (grid) · Account · Conversation

### 🗄 Archive
2 superseded screens. Healthy.

## 2. Gap list

**Components still missing** (vs DESIGN_SYSTEM.md §3): text-field small/multiline/password/amount variants · dismissible chip · avatar sizes/group/online-dot compound · sidebar nav (desktop) · warning banner · call bar · app-request prompt · modal dialog (current one is the legacy filters set) · bottom sheet · toast · empty state · loading overlay/spinner · contact list item picker/participant variants · file item · app item card polish · settings rows · file-bubble remaining states · channel selector · context menu (chat) · typing indicator · date separator · contact-request banner · balance display · amount input · QR display/scanner · fee row · tx status hero · recipient row · step wizard · password field compound · language/theme selectors · file pick row · PIN/biometric area · buttons rebuild to 32/44/56 + width axis (current: large/small).

**Screens missing:** launch/onboarding wizard (5 views) · lock · payments flow (send recipient → amount → result; receive/request; incoming-request confirm) · add contact · contact details · app details / add app · settings hub + backup + downloads + dev + contributors · scan · desktop (≥700px) split-view layouts · dark-mode verification passes (tokens should just work — verify on 2–3 screens, don't design per-screen).

## 3. Build split (recommendation)

| Work | Who | Why |
|---|---|---|
| Component structure: variant sets, states, token bindings, renames/moves | Claude via connector | Mechanical, binding-heavy — exactly what manual work gets wrong |
| Component visual polish, proportions, judgment | Damir in Figma | Design judgment |
| Screens composed of existing components (payments, contacts, apps, settings) | Claude assembles first draft in Figma → Damir art-directs | Fast, token-true drafts beat blank frames |
| Brand-heavy screens (launch/onboarding, empty-state illustrations) | Damir leads, Claude assists | Signature visual moments |
| Utility screens (scan, downloads, dev, contributors) | **Code-first, skip Figma** — build in code on mock bridge, screenshot back into Figma for record | Avoids designing twice what is 90% list/toolbar |
| Dark mode | Nobody designs it — token swap + verification pass on 2–3 screens | That's what the token system is for |

## 4. Suggested order

1. Buttons rebuild (32/44/56 × width axis) — validates the whole component workflow end to end, Figma + code + demo.
2. App frame set (top bar, bottom nav, warning banner, call bar, sheet, modal, toast) — unblocks the home shell demo.
3. Payments components + screens (approved UX rework, screens missing entirely).
4. Chat gaps (file-bubble states, context menu, typing, date separator) — screens already exist.
5. Launch/lock (Damir-led visuals, Claude structure).
