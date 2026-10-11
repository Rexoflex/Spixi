# B · Office — proposal

**For:** Spixi for business — a team that talks to customers, suppliers, drivers and agents, and pays and gets paid in IXI. **One line:** the chat list becomes a shared inbox with an owner and a state per conversation, contacts become a directory, the wallet becomes a ledger, and mini-apps and agents work in a tools dock beside the chat. Render only (v1.1+ track).

It grows from the Spixi for Business concept renders: their "Waiting on you" is the Approvals queue here, their Treasury is the Ledger, their agents and mini-apps live in the tools dock. The Overview dashboard of the concept can sit on a Home tab later; it is not drawn again here.

## What the user gets

| Feature | Where in the renders | Needs |
|---|---|---|
| Team inbox: Mine · Team · Unassigned · Done, owner, state, label, waiting time | main frames | **Core / QuIXI** (shared business identity) — see below |
| Assignment bar; team notes in the customer card | main frames, flow 1 | notes are written and read in the trusted shell only — never inside the customer's chat WebView (a hostile customer page could otherwise read or forge them) |
| Directory: people, organisations, files, agents as tables; key status; owner | states "directory", flow 4 | Spixi only (owner and tags shared across the team = Core / QuIXI) |
| Customer card beside the chat (verified key, tags, open requests, team notes) | main frames | Spixi only for one seat |
| Ledger: columns, running balance, filters, date range, CSV export, requests to pay | states "ledger", flow 2 | Spixi only |
| Tools dock: customer · mini-app · agent session pane · files | flow 3, state "agent" | Spixi only + one new app capability |
| Approvals queue: agent proposals, requests to pay, access requests | states "approve" | **blocked by Core**: the proposal message type (agent connector) |
| Policy: Windows Hello above an amount | flow 2 | Spixi only; a SECOND approver = Core (multisig) or a QuIXI policy service |

## WebView and process layout

| Group | Holds | Note |
|---|---|---|
| **Shell** (trusted, default environment) | rail or sidebar, inbox list, directory, ledger, approvals list, customer card + team notes, tool strip | may show money. Peer, team and agent text only as short plain-text labels (#221 list rule: `textContent`, length cap, no media). Approval rows are built by C# from structured proposal fields (agent, kind, amount, counterparty), titles capped at 80 chars |
| **Chat** (own environment / data store, own processes) | each customer conversation, file preview (scripts off), palette | no new wallet data (O-01 aside, see A); no team notes; the invoice card in the chat only carries a message id |
| **Apps** (one environment per app) | Invoices mini-app, Dispatch agent session pane, the proposal detail | each app its own storage; the manifest says what it may ask for, C# enforces it |
| **Native** | title bar with workspace switcher, native confirms (pay, approve, app request), CSV save dialog | values in every dialog come from C#, never from page text |

## New verbs and pushes (each behind a `#1312` flag)

| Verb / push | From → to | C# guard |
|---|---|---|
| `ixian:assign:<convId>:<memberAddr>` · `ixian:convState:<convId>:<open\|waiting\|done>` | shell → C# | member must be in the team list; state enum |
| `ixian:teamNote:<convId>:<text>` | **shell** (customer card) → C# | sent ONLY to the team group; length cap; never pushed into the customer's chat WebView |
| `ixian:dir:query:<text>` → `dirRows(json)` · `ixian:dir:openChat:<addr>` | shell ↔ C# | rows are friends / team / agents only |
| `ixian:ledger:query:<from>:<to>:<filter>` → `ledgerRows(json)` | shell ↔ C# | C# reads the activity storage; no amounts go to the chat group |
| `ixian:ledger:export:csv` | shell → C# | C# opens the native save dialog and writes the file itself — no path from the page (★ rule); cells that start with `=`, `+`, `-` or `@` are neutralised (CSV formula injection) |
| `ixian:payRequest:<friendAddr>:<msgId>` | **shell** → C# (a NEW sender of an existing money handler: own packet + gate row) | C# checks: an incoming, unanswered request from that friend; then the same `handlePayRequest` → `confirmAndAuth` path (P02) |
| `ixian:tool:open:<appId>:<convId>` | shell → C# | app installed; hosted in the apps group, bound to that conversation's peer |
| `REQUEST_PAYMENT {amount, ref}` (SpixiAppSdk) | mini-app → C# | NEW capability, declared in `appinfo.spixi`; `ref` clamped like the nickname whitelist (#772, 32 chars); one dialog at a time (the `SPayments` latch); native dialog names the app; C# sends a normal request message |
| `ixian:approve:<proposalId>` · `ixian:decline:<proposalId>` | shell → C# | C# builds the dialog from the proposal it stored, not from page text; the agent manifest bounds the action; a proposal that moves money goes through `SPayments` (latch, fee and balance recomputed, `confirmAndAuth`) — no second broadcast path |
| push `inboxRows(json)` · `assignState(json)` · `approvals(json)` | C# → shell | text rendered as text |

## Spixi-only or Core?

| Item | Who | Why |
|---|---|---|
| Directory, ledger, CSV, tools dock, approvals UI, customer card, Hello policy | **Spixi only** | one seat, one wallet |
| **Team inbox** (several people answer for one business identity) | **Core + push server, or QuIXI** — BE-led | today a live message goes to ONE device (Core `IXISocket.cs:149`, `CoreStreamProcessor.cs:3251`) and the offline queue is per address (`OfflinePushMessages.cs:120`). Two models: (1) linked devices with roles on the business identity (option A of the multi-device note); (2) a QuIXI node holds the business identity and relays to the staff group (E2E ends at the business's own node, like a company mail server). Assignment and notes then live there |
| Second approver for large payments | **Core** (multisig) or a QuIXI policy service | a single device cannot enforce "two people" alone |
| Agent proposals as a message type; capability advertisement (`agent:true`) | **Core / connector** | design in `docs/agent-hub-note.md`; streaming itself already works in Core (`FriendList.addMessageWithType`, strategy §6.2) |
| Workspace switcher (several accounts on one PC) | **Core question** | one node per process today; separate app profiles are the Spixi-only fallback |

## Effort

| Work | Sessions |
|---|---|
| Base for all directions (process groups, native keys, palette + index, Hello / Touch ID) | 7–10 |
| Directory (people, organisations, files) | 2 |
| Ledger + requests + CSV export | 2–3 |
| Tools dock + `REQUEST_PAYMENT` (per-app environments are in the base) | 2 |
| Approvals queue + agent session pane hosting + manifest enforcement in C# (blocked by the Core proposal type) | 3 |
| Customer card + team notes + assignment UI (single seat, local state) | 1–2 |
| **Total B, Spixi side** | **17–22** |
| Team inbox for real (Core / QuIXI) | BE program, v2-class; Spixi UI after it: +3–4 |

## Risks
- The team inbox is the heart of B and it needs BE. Without it, B is a strong single-seat business app, not a team app.
- Agent and mini-app text in the shell (inbox excerpts, approval titles) must stay plain text and short; the full output opens in the chat or the apps group.
- The concept render's line "every approval is confirmed with biometrics on this device" is not true on Windows today (`SPayments.cs:608–610`); the Hello step fixes it.
