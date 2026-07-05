# Finalization roadmap — everything left to finish the app (2026-07-05)

Figma is no longer available → **everything below is code-first**: spec doc →
build on mock bridge → smoke assertions → Damir's local build+smoke run →
Damir's demo pass. (figma-sweep.md already recommended code-first for utility
screens; this extends it to all remaining surfaces.)

## Where we are

Built, audited, Damir-approved through #142: chat surface v1 (frozen) · chat
info + contact page · chats shell · wallet shell (hero/send/receive/tx) · apps
shell · overlays (banner/toast/callbar/sheet/modal) · payments-in-chat
machinery · full component kit + tokens + icon pipeline · demos (chat, chats,
wallet, apps, app-frame, components, desktop).

## Phase 0 — Opus cleanup round

`docs/opus-review-brief.md`: adversarial review + fix loop until CLEAN.
Stabilize and simplify the base before new surfaces land on it. Includes the
shared money module (`canonicalAmount`/`toUnits`) dedupe.

## Phase 1 — remaining screens (order = dependency + value)

| # | Surface | Views | Notes |
|---|---------|-------|-------|
| 1 | **Account/Settings shell** | hub · backup · downloads · dev/log · contributors | `backup-ux-spec.md` is READY (incl. nudge state machine + onboarding tail). Hub = settings rows (theme, language, lock, backup, about). Downloads/dev/contributors are 90% list/toolbar — cheap. |
| 2 | **Contacts** | add-contact · contact profile | Profile EXISTS (`createChatInfo` `context:'contact'`, #142③) — the shell just opens it. Add-contact = field + QR/scan entry + request send (`ixian:` inventory in bridge-audit-A). |
| 3 | **Scan shell** | camera view | Isolated by design (html5-qrcode payload). Mock camera in demo; frame/torch/permission-denied states. |
| 4 | **Lock shell** | unlock · confirm-action · set-lock · change-encryption-password | PIN/biometric area; small, but security-adjacent — SECURITY.md checklist pass mandatory. |
| 5 | **Launch/onboarding** | welcome (lang/theme/terms) · create · restore · retry · onboarding tail | Brand-heavy; was Damir-led in Figma — now: code-first structural draft, Damir art-directs in demo. `illustrations-plan.md` + backup onboarding tail (§3.3) fold in. |

## Phase 2 — cross-cutting passes

| Pass | Content |
|------|---------|
| Desktop | Split-view passes for wallet/apps/settings (chats/chat exist in desktop.html); ≥700px layouts per shell. |
| Wallet safe-area | #22 (carried). |
| Dark mode | Verification pass on 2–3 screens per shell — token swap should just work; log deviations. |
| Copy & polish | Copy-morph honesty sweep · media/card rows in multi-select · B2 glyph exports (incl. `shield-lock`, `user-circle-filled`). |
| A11y | Focus order + SR labels sweep across new shells (components already carry labels). |

## Phase 3 — integration (turns demos into the app)

1. **ARCHITECTURE §9 sync** — compile ALL standing BE asks into one table for
   the BE review: self-destruct window command + both-peer expiry · 1:1 mute ·
   shared-media inventory · presence · group name/avatar edit · room-wide
   request · tip fee · share command · sendrequest payload · backup timestamp ·
   Discover transport · history paging · tx fee in payload · plus the §8
   proposals already listed there.
2. **`src/bridge/native.js`** — thin real-bridge adapter (mock.js is the
   contract); capability handshake wiring.
3. **i18n** — per-shell `window.SL` dictionaries; extract hardcoded strings
   (copy drafts exist in specs).
4. **Build pipeline** — Vite build → `Spixi/Resources/Raw/html`; each shell
   double-checked against the command inventory of its absorbed legacy pages
   (ARCHITECTURE §5 table).
5. **C# repoint** — one-line `loadPage` change per page class, single reviewed
   PR (BE does this; we deliver the mapping table).
6. **Device testing** — `maui-integration-test-plan.md` +
   `android-test-quickstart.md` already drafted; run per shell on device.

## Phase 4 — final freeze

Full-app #46 audit loop (adversarial agents → fix → review until CLEAN) ·
final smoke count locked · DECISIONS.md freeze row · handoff doc for BE.

## Working agreements (unchanged)

- Loop per surface: spec (interview Damir on unknowns) → build + smoke
  assertions → Damir runs `node scripts/build-demo-bundle.mjs` then
  `node scripts/smoke-test.mjs` locally → demo pass → DECISIONS row → commit.
- Bridge frozen; new needs = §8/§9 proposals.
- No sandbox builds/e2e (#142 workflow decision).
