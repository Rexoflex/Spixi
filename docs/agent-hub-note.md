# Agent hub — discussion note (2026-09-30)

Status: **idea, not scoped, not built.** Damir + Claude, thinking out loud. Input for a one-page spec after Damir
shares the business-concept doc (other folder). v1 comes first.

## The idea

Spixi as the **secure home and control panel for your AI agents** (local or remote) and devices. We do NOT build an
agent. Agents (OpenClaw, Hermes, own bots) connect to Spixi; each agent / device = its own Ixian identity.

- Why Spixi fits: E2E + P2P (no server reads agent traffic, unlike Telegram/WhatsApp gateways) · every agent is a
  verifiable identity · native approval — an agent only PROPOSES, the user approves, C# signs, the agent never holds
  keys · payments built in · local, server and device agents all look the same (one contact).
- OpenClaw / Hermes have their own GUIs (web dashboard, Hermes Desktop), but their main user channel is a
  messenger. Our lever = an Ixian channel connector for them, not a competing agent.
- Audience: ONE open-source Spixi for everyone; business (workspaces, admin, policy) = a later layer. First users are
  individuals who self-host agents.

## Desktop control panel (as envisioned)

Rail groups Agents + Devices with status · chat per agent in its own pane (#221) · **session pane** = the agent's
mini-app dashboard · one approvals list · per-agent permissions (manifest model, revocable) · activity log.
Mobile = reduced version.

## Manifest permissions (starts in the next session, 3b)

A mini-app declares what it needs (sign in as you · sign transactions · local storage · multi-user · device access ·
message scopes). Shown before install/run, **enforced by C#**; undeclared request = fails; signing always native
confirm. Agent scopes ("Can message: drivers", "Reads: telemetry", "Cannot pay") reuse the same model.
A permission that is only displayed is a false security claim.

## Answers already given (Damir)

- **Stream message type exists** (lead added it, probably private) → check it is in our Core (`097341a`) or only his
  branch. FE side is small (in-place bubble update exists).
- **Messages go P2P**; relays are mainly presence + discovery; offline messages wait (≤ 30 days per the privacy
  policy). Relay load scales with users, not messages. Open: NAT-traversal success rate.

## Open questions / risks

| Area | Note |
|---|---|
| Presence | Only the clean-quit case is bad (~2 min stale, `Node.cs:418-455`, #300 F4). Fix: Core "offline" on clean quit · P2P connection state as the agent's live signal · "last seen" in the UI |
| Big output | Short term: file transfer + preview message. Long term: stream type. The 64 000 cap is our composer guard (A7); protocol limit = ask BE |
| Backup | Account + wallet today; contacts likely in account (verify). Agent permissions must be added. Chat history not backed up (by design) |
| Connectors | Nightly CI: install latest OpenClaw/Hermes, run connector vs a test identity, send/receive + stream, alert on failure (e.g. a Spixi bot message). Thin adapters on official plugin APIs |
| Wallet safety | Design is right (WebView walls, native confirm, keys never in WebView); NOT proven — Session R not clean, #232/#523 gate, BE review, one external audit before marketing "secure". New path: proposal → action; the confirm screen shows C# data, never the agent's text |
| Core before launch | Stream, edit, offline presence, groups without the creator, spending limits, enforced permissions. Necessary, not sufficient: connector quality, iOS push (NSE/App Group), app-store review (AI + wallet), security review |
| Capacity | Core items depend on one BE engineer |
| Prompt injection | Every agent message is untrusted; every action behind native approval |

## First 20 users (plausible if)

Hand-recruited in the OpenClaw/Hermes communities · setup < 10 min (one command + one QR) · fast, reliable delivery ·
fixes in days. Growth = their posts + the connector in the projects' official plugin lists.

## Order (step by step)

1. Finish v1 (X.8 + menu fade-out → office walk → freeze → BE review).
2. Session pane + manifest permissions (next session, 3b).
3. Business-concept doc (Damir, tomorrow) → one-page agent-hub spec + open BE questions.
4. After v1: one connector, tested with a small hand-picked group.
