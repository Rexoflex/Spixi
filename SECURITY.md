# Spixi Frontend — Security Model & Invariants

**Status:** Draft for backend review
**Why this doc:** Spixi is a self-custodial wallet. The redesign must not weaken the boundaries that keep chat messages and mini-apps from (a) moving funds without explicit, native user authorization, or (b) reading data that belongs to another part of the app. This records the invariants every new shell must preserve.

## 1. ⭐ THE most important invariant — surface isolation (each untrusted surface in its OWN WebView)

**Chat — and anything else that renders untrusted, remotely-sourced content — ALWAYS lives in its own dedicated WebView, isolated from the wallet and every other surface. It is NEVER composed into a shared WebView / DOM / JS context with other panes.**

Chat renders content an attacker controls: message text, links, embedded or loaded media, contact-supplied names, and mini-app-adjacent payloads. If a hostile message ever achieves script execution (an XSS/exploit in the chat surface), that code must be confined to the chat WebView and unable to read or drive any other surface — the wallet balance/address, transaction history, settings, private keys, or another conversation. Separate WebViews give each surface its own document, JS context, and origin, so a compromise in one cannot reach the DOM or state of another. Collapse them into one WebView and that guarantee is gone.

Concretely:

- On **desktop split-view**, each pane (chat list · conversation · wallet · settings · apps) is its **own native WebView** with its **own bridge**. Panes never share a WebView or a JS context.
- **Cross-pane coordination goes through C#**, never a shared JS context. Selecting a chat in the list opens it in the conversation pane via the C# `selectChat`/`selectTx` mirrors — not by both panes living in one document.
- **Layout chrome may share a WebView; untrusted content may not.** The frame (rail, draggable dividers, panel show/hide) can be one WebView, but the chat *content* is always a separate embedded WebView.
- **❌ REJECTED — ARCHITECTURE.md §8 "Hosted panes (desktop)"**: routing embedded panes through the host page's single WebView (`executeUiCommandInPane` / `ixian:pane:*`) collapses this boundary and must not be built. It was only ever a proposal — the real app already uses the separate-WebView model (#177 kept the two-WebView contract), and it stays that way. Trade-off ACCEPTED: multi-pane desktop layout is MAUI-side work hosting N WebViews in a splitter, NOT "pure frontend" — isolation is worth the cost. The single-page `desktop.html` demo stays valid for art-direction ONLY, not as production architecture (DECISIONS #220).

Every new shell/surface inherits this rule: **if it can render content another user or a remote source supplies, it gets its own WebView.**

## 2. Core invariant — no key crosses the bridge

**The wallet private key never crosses the JS↔C# bridge, and no WebView content can sign or broadcast a transaction on its own.** Transaction signing and broadcast happen only in C# (`IxianHandler.addTransaction`, `Node.prepareTransactionFrom` / `sendTransactionFrom`). The WebView can *request* a payment; only native C# code can *authorize and send* one.

This holds today. The redesign keeps it by rule: shells emit intent, C# decides.

## 3. Where money actually moves (verified in source)

Every transaction broadcast in the app funnels through C#:

| Origin | C# entry point | User authorization |
|---|---|---|
| Wallet send flow | `WalletSend2Page.cs:112–123` (`prepareTransactionFrom` → `addTransaction`) | Dedicated payment screen; amount entry is the explicit confirm step |
| Incoming payment request | `WalletContactRequestPage.cs:145` (`sendTransactionFrom`) | Explicit accept/decline screen with amount + fee shown |
| Chat tip | `SingleChatPage.cs:957–983` (`prepareTransactionFrom` → `addTransaction`) | Balance-checked; **see gap 5.1** |
| Mini-app `SEND_PAYMENT` | `MiniAppPage.cs:246–266` (`addTransaction`) | Native OK/Cancel alert showing recipient + amount before broadcast |

The chat and mini-app layers hand C# a request; C# independently rebuilds and validates the transaction (recipient, amount, balance, fee) before broadcasting. No signed transaction is accepted from the WebView as-is.

## 4. Isolation rules the new shells must preserve

1. **No key material in the WebView.** Shells never receive, request, or store private keys, seed phrases, or the wallet password. (Existing password-over-URL flows are a known issue — see ARCHITECTURE.md §9.1 — and must not be extended.)
2. **Payment intent is validated C#-side, always.** A shell may emit `ixian:send:*`, a payment request, a tip, or a mini-app `SEND_PAYMENT`, but C# re-derives and re-validates the transaction. Never trust an amount, recipient, or fee computed in JS.
3. **Payment confirmation is native.** The final "send" authorization is a native MAUI alert or a dedicated payment view — not an in-page HTML button that directly triggers broadcast. Chat and mini-apps must route through the same native confirmation the wallet flow uses.
4. **Mini-app sandbox stays closed.** `MiniAppPage` blocks all navigation except `file:` URLs and exposes only the `SpixiAppSdk` action surface. Mini-apps cannot call wallet/chat bridge commands directly; payments go through `SEND_PAYMENT` → native confirm.
5. **Chat cannot silently spend.** Payments initiated from a conversation (send, request, tip) are subject to the same balance checks and native confirmation as the wallet screens. A message, reaction, or link can never move funds.
6. **Capability-gated events.** Transaction events to mini-apps (`onTransactionReceived`, `onPaymentSent`) remain gated on the app's `TransactionSigning` capability.
7. **Surface isolation (see §1 — the paramount rule).** Chat and every other untrusted surface stay in their own WebView — never merged into a shared WebView/DOM/JS context with the wallet or other panes. Cross-surface coordination is C#-mediated only.

## 5. Gaps to confirm with BE (not introduced by redesign)

### 5.1 Chat tip authorization
The chat `tip` path (`SingleChatPage.cs:979–985`) adds the reaction and calls `addTransaction` **before** showing the confirmation alert — the alert is a post-hoc "tip confirmed" notice, not a pre-authorization prompt. Compare mini-app `SEND_PAYMENT`, which shows OK/Cancel *before* broadcasting. **Recommendation:** align chat tips to the same pre-broadcast native confirmation. Flag for BE; the redesigned chat shell should assume a confirm-before-send contract.

### 5.2 Plaintext wallet password
Stored in `Preferences["walletpass"]` and, per ARCHITECTURE.md §9.1, never actually cleared (removal sites use the misspelled key `"waletpass"`). Out of frontend scope but relevant to the wallet's threat model.

## 6. Redesign checklist (apply per shell)

- [ ] **Surface isolation: the shell renders untrusted/remote content ONLY in its own WebView — never merged with the wallet or another pane (§1).**
- [ ] Shell emits payment *intent* only; no JS-side signing or key access.
- [ ] Every broadcast path lands in an existing C# entry point from §3 (no new unvalidated path).
- [ ] Final send authorized by a native confirmation, reachable identically from wallet, chat, and mini-app contexts.
- [ ] Mini-app content confined to the `file:`/`SpixiAppSdk` sandbox; no wallet/chat command access.
- [ ] No password, seed, or key value passes through the shell.

---

*Pairs with ARCHITECTURE.md. Source line references are against `redesign/frontend` at time of writing; re-verify if the C# payment paths change.*
