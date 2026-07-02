# Spixi Frontend — Security Model & Invariants

**Status:** Draft for backend review
**Why this doc:** Spixi is a self-custodial wallet. The redesign must not weaken the boundary that keeps chat messages and mini-apps from moving funds without explicit, native user authorization. This records the invariants every new shell must preserve.

## 1. Core invariant

**The wallet private key never crosses the JS↔C# bridge, and no WebView content can sign or broadcast a transaction on its own.** Transaction signing and broadcast happen only in C# (`IxianHandler.addTransaction`, `Node.prepareTransactionFrom` / `sendTransactionFrom`). The WebView can *request* a payment; only native C# code can *authorize and send* one.

This holds today. The redesign keeps it by rule: shells emit intent, C# decides.

## 2. Where money actually moves (verified in source)

Every transaction broadcast in the app funnels through C#:

| Origin | C# entry point | User authorization |
|---|---|---|
| Wallet send flow | `WalletSend2Page.cs:112–123` (`prepareTransactionFrom` → `addTransaction`) | Dedicated payment screen; amount entry is the explicit confirm step |
| Incoming payment request | `WalletContactRequestPage.cs:145` (`sendTransactionFrom`) | Explicit accept/decline screen with amount + fee shown |
| Chat tip | `SingleChatPage.cs:957–983` (`prepareTransactionFrom` → `addTransaction`) | Balance-checked; **see gap 4.1** |
| Mini-app `SEND_PAYMENT` | `MiniAppPage.cs:246–266` (`addTransaction`) | Native OK/Cancel alert showing recipient + amount before broadcast |

The chat and mini-app layers hand C# a request; C# independently rebuilds and validates the transaction (recipient, amount, balance, fee) before broadcasting. No signed transaction is accepted from the WebView as-is.

## 3. Isolation rules the new shells must preserve

1. **No key material in the WebView.** Shells never receive, request, or store private keys, seed phrases, or the wallet password. (Existing password-over-URL flows are a known issue — see ARCHITECTURE.md §9.1 — and must not be extended.)
2. **Payment intent is validated C#-side, always.** A shell may emit `ixian:send:*`, a payment request, a tip, or a mini-app `SEND_PAYMENT`, but C# re-derives and re-validates the transaction. Never trust an amount, recipient, or fee computed in JS.
3. **Payment confirmation is native.** The final "send" authorization is a native MAUI alert or a dedicated payment view — not an in-page HTML button that directly triggers broadcast. Chat and mini-apps must route through the same native confirmation the wallet flow uses.
4. **Mini-app sandbox stays closed.** `MiniAppPage` blocks all navigation except `file:` URLs and exposes only the `SpixiAppSdk` action surface. Mini-apps cannot call wallet/chat bridge commands directly; payments go through `SEND_PAYMENT` → native confirm.
5. **Chat cannot silently spend.** Payments initiated from a conversation (send, request, tip) are subject to the same balance checks and native confirmation as the wallet screens. A message, reaction, or link can never move funds.
6. **Capability-gated events.** Transaction events to mini-apps (`onTransactionReceived`, `onPaymentSent`) remain gated on the app's `TransactionSigning` capability.

## 4. Gaps to confirm with BE (not introduced by redesign)

### 4.1 Chat tip authorization
The chat `tip` path (`SingleChatPage.cs:979–985`) adds the reaction and calls `addTransaction` **before** showing the confirmation alert — the alert is a post-hoc "tip confirmed" notice, not a pre-authorization prompt. Compare mini-app `SEND_PAYMENT`, which shows OK/Cancel *before* broadcasting. **Recommendation:** align chat tips to the same pre-broadcast native confirmation. Flag for BE; the redesigned chat shell should assume a confirm-before-send contract.

### 4.2 Plaintext wallet password
Stored in `Preferences["walletpass"]` and, per ARCHITECTURE.md §9.1, never actually cleared (removal sites use the misspelled key `"waletpass"`). Out of frontend scope but relevant to the wallet's threat model.

## 5. Redesign checklist (apply per shell)

- [ ] Shell emits payment *intent* only; no JS-side signing or key access.
- [ ] Every broadcast path lands in an existing C# entry point from §2 (no new unvalidated path).
- [ ] Final send authorized by a native confirmation, reachable identically from wallet, chat, and mini-app contexts.
- [ ] Mini-app content confined to the `file:`/`SpixiAppSdk` sandbox; no wallet/chat command access.
- [ ] No password, seed, or key value passes through the shell.

---

*Pairs with ARCHITECTURE.md. Source line references are against `redesign/frontend` at time of writing; re-verify if the C# payment paths change.*
