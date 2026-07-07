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
| 1 | **Account/Settings shell** | hub · backup · downloads · dev/log · contributors | **Slice 1 (hub+backup+danger) BUILT #146, Opus round CLEAN #151, verified green.** **Slice 2 (downloads/dev/contributors) BUILT #152** — spec §9b; pending Damir build+smoke + demo pass + its Opus round. Shell COMPLETE after that. |
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

## Phase 3.5 — DEPTH: finish each single-pane surface on the real bridge

*Added 2026-07-07 after the `docs/gap-audit.md` sweep. Phase 3's wiring (#177–#185)
was **breadth** — one shallow pass per surface, often "emit a verb → open the legacy
page." This phase closes the depth to **full redesign coverage.** Rule (Damir): **no legacy
design remains — the redesign replaces every legacy page.** Wire the redesign wherever
the FROZEN bridge already supports it; a feature BE can't yet drive (e.g. reply/edit) is
**omitted — hidden behind a capability flag, but fully built and ready** to switch on
when C# lands (never left on legacy, never shown broken). **Build FE now, batch every
C# ask** into the one BE cutover pass. **Priority = a working 1:1 app.** Ordering =
value + dependency; the zero-C# wins come first so the app works end-to-end fast.*

Per-track loop (unchanged working agreement): decide open items → build on the real
bridge → #46 audit → Damir F5 → DECISIONS row → commit. `[0C]` = zero-C# (do now);
`[BE]` = needs C# (flag → cutover); `[DEC]` = decision (most are pre-resolved in the
gap-audit, 4 residuals listed there).

| # | Track | Scope (do now = [0C]; flag = [BE]) | Gate |
|---|-------|-----|------|
| A | **Chat depth** ← **START HERE** | [0C] context menu (delete/copy/react/tip) · payment+call **view-only** cards (best-effort status map now, upgrade later — Damir) · member sheet + group admin · chat-info takeover · in-text link confirm · unread divider · lazy history · attach-sheet takeover · contact-request pane · connectivity banner · start-call button · media tiles+viewer (behind a cap flag; media-vs-file signaling = the one open BE flag). [BE] `resend` case (retry is a dead no-op) · inline Pay/Decline (C1–C3) · enriched call (C4) · reaction own-flag (C5). | biggest value; mostly [0C] |
| B | **Chats-list depth** | [0C] wire live `setContactStatus`/`loadContacts` (today no-op'd) · fix delete/mark-read revert. [BE] contact-request feed + accept/decline/handshake verbs (built UI unfed) · pin/mute/favorites/swipe persistence · group-type flag · mention flag. | core messaging polish |
| C | **Scan + Lock shells** | [0C near-drop-in] `src/shells/scan.html` + SHELLS entry (adapter+lib present) · `src/shells/lock.html` + encpass entry + `SPIXI_ENV.biometrics` · `settings_lock.html` → **redirect to a lock-shell set-lock view** (Damir). [BE] `unlockFailed`/`changePassFailed` · QR split guard. Icons: `shield-lock`, torch/bulb. | fast — adapters exist |
| D | **Contacts shell** | **Embed the picker in the home shell for v1** (Damir; reuses HomePage roster + FAB), built as a self-contained `src/bridge/contacts-page.js` module so it ports to a standalone `src/shells/contacts.html` later → start-picker/add-contact/group-create takeover, replacing the FAB dead-end. [BE] group-create verb host · dual-nick · `checkAddress` invalid-state. Run the parked #155 Opus audit. | biggest new build |
| E | **Wallet money flows** | [0C] wire redesigned **Send** (compose/review → native sign) + **Receive**/QR/request-amount (built, unwired — realizes "WebView composes, C# signs"). [BE] tx-detail address/fee/status/tx-explorer/epoch (W1–W4). | SECURITY.md: sign stays C# |
| F | **Settings auto-save** | [BE] save-without-pop verb + immediate lock persistence + stop reload-on-change (fixes the "not saving" bugs) · QR/address (S1) · version (S4) · backup status (S2) · current-lang (S3) · notifications/privacy/security/confirm-payments (§9) · change-password route · downloads/dev/contributors (§5 repoint). [0C] auto-save UX + selective toast on the FE. | mostly [BE]-gated |
| G | **Apps depth** | [0C] `menuBtn` creation-guard fix. [BE] Discover feed source (A2) · in-tab uninstall verb (A1) · launch single/multi + recents [0C once decided] · real icons (avatar/icon resolution, cross-cutting). | standalone apps-shell repoint |
| H | **Cross-cutting close-out** | icons · avatar/app-icon path resolution (data-URI scheme) · empty/error/offline states + toasts · media-vs-file · run the parked Opus audits (contacts #155 / scan #158 / lock #159) + a per-track #46 loop. | before freeze |

The `[BE]` items across all tracks land in **one** cutover PR — see `docs/be-cutover-brief.md`
(existing C/W/S/A/L rows + the NEW asks flagged in the gap audit). Full source of truth
per surface: `docs/gap-audit.md`.

## Phase 4 — final freeze

Full-app #46 audit loop (adversarial agents → fix → review until CLEAN) ·
final smoke count locked · DECISIONS.md freeze row · handoff doc for BE.

## Working agreements (unchanged)

- Loop per surface: spec (interview Damir on unknowns) → build + smoke
  assertions → Damir runs `node scripts/build-demo-bundle.mjs` then
  `node scripts/smoke-test.mjs` locally → demo pass → DECISIONS row → commit.
- Bridge frozen; new needs = §8/§9 proposals.
- No sandbox builds/e2e (#142 workflow decision).
