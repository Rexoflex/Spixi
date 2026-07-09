# Handoff — BE-cutover batch 4 → next chat (2026-07-09)

**Role.** Continue the Spixi frontend redesign (branch `redesign/frontend`) as the Opus
**BE-cutover + FE-depth** agent. One BE row = one tiny JS+C# co-change, Damir F5-confirms
before the next.

**Read first, in order:** `CLAUDE.md` (status tail) → `DECISIONS.md` (tail, latest = #219) →
`docs/be-cutover-brief.md` (the row list) → `docs/be-conventions.md` (bridge rulebook) +
`docs/fable-be-workorder.md` (the 🟢 do / 🟡 human / 🔴 never fence).

## The fence (non-negotiable)
🟢 do · 🟡 human-only · 🔴 never. **Money / signing / wallet-password / credentials are HUMAN
ONLY (🔴/🟡).** If a 🟢 row turns out to need a signing/wallet change, STOP and flag it.

## Hard rules learned this project
- **Feed the redesigned shells ONLY via `sendUiCommand` pushes — never `addCustomString`**
  (they build `window.SL` from the BUNDLED dictionary; C13 lesson, DECISIONS #213).
- **Ixian-Core is READ-ONLY reference and NOT in the tree** (a referenced dependency). A row
  needing a core change is 🟡 — flag it, don't build. (C8 arbitrary emoji reactions bounced to
  core, DECISIONS #215; lesson: a store holding SYSTEM keys ≠ user reactions are key-agnostic —
  verify the user-write persistence path on-device before building a persistence row.)
- **New `sendUiCommand` args go at the END only; never reorder.** New verbs are additive.
- **#46 audit loop** per unit: self-audit + an INDEPENDENT adversarial reviewer subagent reading
  the REAL files → fix → re-review until CLEAN. Mechanical fixes land; architectural findings
  become DECISIONS rows.

## Just landed this session (batch 3, DECISIONS #214–#219) — all #46-CLEAN
Committed by Damir: **C7** (app-invite decline = local persistent "Declined" · install-URL ·
remote app-icon gated behind media-autoload · in-session card · topbar-avatar push #217b ·
boot-flash guard #217c), **A1** (apps-tab uninstall verb) + **A2** (keep the website-link Explore
banner, drop only the IN-APP Discover feed), **X1** (avatar/app-icon → data-URI push for iOS,
`Utils.imageToDataUri`), **CH2a** (chat filter-chip count NUMBERS + hide-Requests-when-empty).
**Pending Damir's final F5 + commit:** **CH2b** — contact-request FEED + accept/decline verbs
(`HomePage.loadChats`+`updateChat` route incoming `requestAdd` → `addRequest`; `ixian:acceptRequest`/
`declineRequest` mirror SingleChatPage approve/remove; FE `home.html` handlers + `onRequestAccept/
Decline` + `leaveRequestsFilterIfEmpty`; request-card address truncation #211; **≥3s handshake
hold** on the list; auto-accept/button-less-row bug fixed via the `updateChat` routing).

## FIRST next session — discuss before building
**Contact-request UX v2** (Damir design pivot, spec `docs/contact-request-v2-spec.md`): let the
user ENTER a pending request's chat; the SECURITY NOTICE shows the request (full copyable address +
Accept/Decline), a SHORT "Establishing…" state for ≥3s IN the notice, then EXPANDS to the secured
notice. Reuses CH2b's accept/decline verbs; needs a chat-open pending-request flag (tiny C#) + a
3-state `c-sysnotice`. **Resolve the spec's open decisions with Damir first** (cards-stay-vs-
enterable · 3s FE timer vs a real C# handshake-complete signal). The ≥3s handshake hold lives here.

## Next 🟢 work-order (after v2, one row at a time)
1. **CH3 / CH4** — chats-list delete/mark-read persistence (incl. the in-chat message-DELETE gap
   from the C7 F5: a local delete doesn't survive reload + doesn't refresh the chats-list excerpt —
   `SingleChatPage`'s context-menu delete never calls `updateChat`, and `friend.deleteMessage`
   persistence needs a look) · pin/mute/favorites (CH4 likely Ixian-Core metadata → flag).
2. **S14** + the §9 settings family (save-without-pop verb `ixian:apply`, notif/privacy reachability).
3. Backlog rows: CH8 empty-nick · C4 active-call nudge · the app-invite follow-ups (split-view
   install-refresh · post-install Join from AppDetailsPage · a decline-NOTIFY variant for C7).
- 🟡 human: L1–L8 (wallet create/restore, plaintext walletpass), change-password/security-level.
  🔴 never: C1/C2/C3/C6/C9/C10 (payments/tips), W1–W8 (wallet), C8 (arbitrary emoji → Ixian-Core).

## How each 🟢 row goes
1. Read the row in `be-cutover-brief.md` + its cited file:line; confirm it's NOT money/signing.
2. Copy the nearest existing `sendUiCommand` push / `onNavigating` `else if` branch shape. New push
   args at the END only.
3. C#: one push/verb + small handler. JS: the matching shell handler / `bridge.send('ixian:verb…')`.
   Cite the row id in a one-line comment. Tiny diff.
4. Run the #46 loop (self + independent adversarial reviewer over the REAL files) → fix → CLEAN.
5. Update DECISIONS (new row) + mark the be-cutover row + this handoff. Hand build + F5 to Damir.

## Build / verify — Damir's machine only
- Shell-only change → `node scripts/build-shells.mjs`. Component change (`src/components/*`) → also
  `node scripts/build-demo-bundle.mjs` FIRST, then `build-shells`. Then `node scripts/smoke-test.mjs`.
- App: **F5 in Visual Studio**, `net10.0-windows10.0.19041.0` target (NOT "Rebuild All"; a bare
  `-f net10.0-windows` → NETSDK1135). Pre-existing Android break in `ActivityStorage.cs` (RocksDB
  0.0.42 not on the feed) — surfaces only on Rebuild-All; Windows F5 unaffected.

## Environment quirks (this PC)
- **bash/`node` sandbox mount serves STALE / TRUNCATED copies of session-edited files** (#175/#165).
  Use the **file tools (Read/Write/Edit/Grep)** — they hit REAL disk. `node --check` / smoke / build
  are Damir's local step. `rm` on the mount needs the cowork delete tool.
- Corrupt `.git/index` → `rm .git/index && git reset` (working tree intact).
- MCP connectors (Slack/Figma/Linear/…) need interactive auth — n/a here.

## Prior handoffs
Archived: `docs/archive/handoff-be-batch3.md` (this session) · `docs/archive/handoff-be-batch2-mentions.md`.

---
**Start by reading the read-order above, then tell Damir what you propose to tackle and why before
touching code** (likely: discuss the contact-request v2 spec first).
