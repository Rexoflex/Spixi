# Wallet pass — build spec (#522–#529, 2026-08-23)

> Damir's calls: DECISIONS #522–#529. Security model: SECURITY.md §1 + the CLAUDE.md
> "C# TOUCHES NO RISKY PARTS" block. The handover-gate lens runs WHILE building —
> every new verb, push, storage key and log line gets a row in
> `docs/security-handover-gate.md` as it lands.

## 0. The wall (unchanged, restated once)

The WebView composes and PROPOSES. C# re-parses, shows a NATIVE confirm built from
ITS OWN parse, optionally runs biometric auth (PA1), then signs and broadcasts.
No key, no password, no signature ever crosses the bridge. The chat WebView stays
isolated (#221). No fee is invented: no quote → Confirm stays disabled.

## 1. New bridge surface (all of it)

| Verb (WebView → C#) | Page(s) | Action |
|---|---|---|
| `ixian:feeQuery:<addr>:<amount>` | HomePage · SingleChatPage | compute `Node.calculateTransactionFee(primary, to, amount)` + available balance → push `setSendQuote`. Nothing signed, nothing stored. |
| `ixian:signSend:<addr>:<amount>` | HomePage · SingleChatPage | re-parse + validate → fee + balance guard → NATIVE confirm (address + amount + fee from C#'s parse) → PA1 biometric if enabled → `Node.sendTransactionFrom` (null-guarded) → push `signSendResult`. |
| `ixian:payRequest:<msgIdHex>` | SingleChatPage | locate the requestFunds message → guards (not paid `:`, not declined `::`, amount > 0) → same confirm + auth + send chain → `requestFundsResponse` + `updateRequestFundsStatus` (the extracted WalletContactRequestPage.onSend body). |
| `ixian:sendrequest:<addr>:<amount>` | SingleChatPage (NEW here; exists on HomePage since W8) | peer-scoped: `<addr>` must equal the open friend; approved/Normal/!bot guard; `Node.addMessageWithType(requestFunds)` + `StreamProcessor.transactionRequest`. A request is a chat message — nothing signed. |
| `ixian:paymentAuth:on\|off` | SettingsPage | `Preferences.Set("paymentauth", …)` on the SAME persist path as the lock toggle (dirty + save). |

| Push (C# → WebView) | Args | Consumer |
|---|---|---|
| `setSendQuote` | `addrEcho, amountEcho, fee, balance` (raw decimal strings) | home.html + chat.html — routed into the open compose; stale echoes dropped. |
| `signSendResult` | `status ('ok'\|'cancel'\|'fail'), txidOrErrKey` | home.html + chat.html — review sheet `ctrl.done()` / silent re-enable / `ctrl.fail(msg)`. |
| `setPaymentAuth` | `enabled` | settings.html — toggle state. |
| `quickScanResult` | `data` | home.html — `setSendAddress` into the open compose (cap era only). |
| `setCaps` | adds `composeSend,sendQuote,payRequest,composeRequest` (chat+home) · `paymentAuth` (settings) | home.html gains its FIRST `setCaps` handler. |

★ #258 rule: every new push gets a handler (or explicit no-op) in every shell its
page can reach. ★ Verb matching: `StartsWith(..., Ordinal)` WITH the trailing
colon, placed ABOVE any legacy `Contains`/`Equals` branch that could hijack
(`ixian:send` vs `ixian:sendrequest:`/`ixian:signSend:` — the #393 MAJOR class).

## 2. FE units

1. **wallet-send.js** — `fee: null` = unknown: fee/total show pending, Max and
   Continue gate on a fresh quote; new opt `onQuote(address, amount)` (debounced by
   the component) + free fn `setSendQuote(el, { fee, balance })`; `ctrl.fail('')` =
   silent re-enable (native-confirm cancel). Pending contacts show a "request
   pending" sub-line (#255 badge). Static numeric `fee` keeps demo behavior.
2. **wallet-receive.js INVERTED (#527)** — request-first: amount + W9 multi-select
   always visible (reveal machinery removed); QR + full address + copy + Share move
   into the address sheet behind a small "Show my address" button.
3. **address-sheet.js (NEW FILE — `git add`)** — `openAddressSheet({ address,
   strings, host, onShare })`: full-size QR (N86 ≥185px), address chip + honest
   copy morph, Share, the "What is this address?" explainer folded in (ONE surface —
   menu-batch call d; Account reuses this later).
4. **home.html** — `setCaps` handler (first on this shell) · compose: quote wiring,
   `signSendResult`, no optimistic done · receive: inverted opts + address sheet ·
   `quickScanResult` → `setSendAddress`.
5. **chat.html** — attach **Pay**: `cap('composeSend')` → send takeover with
   `lockedRecipient` (1:1) else legacy `ixian:send` · attach **Request**:
   `cap('composeRequest')` → `openRequestSheet` → `ixian:sendrequest:` else legacy
   `ixian:request` · request-in Pay: `cap('payRequest')` → `ixian:payRequest:` else
   legacy `ixian:viewPayment` (card flips ONLY on the status push — no optimism) ·
   request-out card: role `request-out` + **Cancel request** → confirm modal →
   existing `ixian:contextAction:deleteMessage:<id>` (#529) · empty-amount
   requestFunds rows are skipped (post-delete ghost guard).
6. **settings.html / settings-shell** — wire `onPaymentAuth` + `setPaymentAuth`;
   row un-gates when the cap arrives.

## 3. C# units

1. **`Spixi/Utils/SPayments.cs` (NEW FILE — `git add`)** — the ONE confirm + auth +
   send helper both pages call: parse/validate → fee+balance guard →
   `DisplayAlert` confirm (nickname, middle-truncated address, amount, fee, total)
   → PA1 (`CrossFingerprint`, availability-checked; WinUI skip) →
   `Node.sendTransactionFrom` with the WalletSend2Page:114 null guard → result
   push. Re-entry latch: one in-flight confirm per app.
2. **HomePage** — `feeQuery`/`signSend` branches + caps push in `onLoaded` + scan
   result → `quickScanResult` push when the compose era is on.
3. **SingleChatPage** — `feeQuery`/`signSend`/`payRequest`/`sendrequest:` branches
   (payRequest = extracted WalletContactRequestPage.onSend/onDecline-shape logic,
   minus decline) + caps push beside the existing `tipResult`.
4. **SettingsPage** — `paymentAuth` verb + pref + cap + state push.
5. **NOT touched**: Ixian-Core (frozen `097341a`) · the legacy money pages (retire
   at the §5 repoint, NOT this pass) · `WalletContactRequestPage` stays as the
   fallback path while caps are absent.

## 4. Known legacy defects this pass FIXES on the new path (log, do not backport)

- Legacy confirm never shows the destination (`wallet_send_2.html:133` unwritten).
- `WalletContactRequestPage:148` NRE when broadcast fails (no null guard).
- Fee display = stale dust-limit estimate pushed once (`WalletSend2Page:52`).
- `wallet_contact_request.html:110` renders the FEE in the date slot (5 args → 4).

## 5. Out of scope (queued, unchanged)

Decline on request-in (#526 v1 = none) · receiver-side "Canceled" label (BE verb) ·
retiring the four legacy money pages (§5 repoint batch) · the menu batch · Damir's
non-wallet list (group info, remove-contact wipe, account lifecycle, skeletons,
timestamp alpha).

## 6. AS BUILT (#530) — deltas from the plan above

1. W6 shipped as a QUERY (`ixian:feeQuery` → `setSendQuote`), not a broadcast push —
   the fee is size/recipient-dependent (relay payouts), so one pushed number would be
   wrong by construction. Amount 0 = balance-only quote (the chat compose prefetch).
2. A second scan verb exists: `ixian:sendScan` (compose-scoped). The generic
   `ixian:quickscan` keeps its add-contact branch; a `:send` QR from EITHER path now
   lands in the shell compose via `quickScanResult`.
3. `openAddressSheet` lives in `wallet-receive.js` (exported) — no new FE file. The
   ONE new file overall is `Spixi/Utils/SPayments.cs`.
4. PA1 = the LockPage biometric recipe verbatim (availability-checked; no hardware →
   the explicit native confirm stands; errors fail closed; WinUI skipped).
5. payRequest answers `payRequestResult(msgIdHex, status, msg)` so the card's Pay
   latch releases on a canceled confirm — the card itself flips only on the normal
   `updatePaymentRequestStatus` push.
