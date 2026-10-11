# P02 · MONEY · Every payment the WebViews can ask for, and how C# confirms and signs it

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH | yes — send, pay a request, tip (sign + broadcast) | yes | shipped | 8 min |

**Look here first:** `Spixi/Utils/SPayments.cs:577` — `confirmAndAuth`, the one native dialog in front of all three spends (send :349→:357, pay :428→:443, tip :555→`SingleChatPage.xaml.cs:4617`). It returns true with no biometric step when nothing is enrolled or on WinUI.

**DECISIONS:** #139 · #443 · #527 · #508 · #522 · #523 · #524 · #525 · #529 · #530 · #536 · #626 · #635 · #640 · #729 · #772 · #805 · #928 · #929 · #1286 · #1293 · #1310

## What changed and why
- The native wallet pages (WalletSend/Send2/Recipient/Receive/ContactRequest) are deleted. Shells compose in-page and only PROPOSE; C# re-parses, shows a native dialog from its own values, then signs (#523, #524, #635, #640). Removed verbs: `send` → `signSend`, `getMaxAmount` → `feeQuery` amount 0, `pick`/`addrecipient` → the in-shell picker, `sendixi`/`receiveixi` → in-shell compose / receive sheet (#527).
- Tip: the baseline broadcast first and showed an alert afterwards (SECURITY.md §5.1). Now the native confirm runs BEFORE `addReaction` and the broadcast. **Gap 5.1 is closed** (#626).
- "Confirm payments" toggle: when on, a fingerprint/face check runs after the dialog. An error fails closed. Turning it OFF needs the lock (#525, #530, #536).
- `requestFundsResponse` (a peer's "request paid" answer) is now stored even when the chat is closed. The row lookup is limited to my own unanswered request, and the txid must parse before anything is written (#928, #929).

## Files (verified at 387ca78b)
- `Spixi/Utils/SPayments.cs:38` — app-wide latch: one money dialog at a time, frees itself after 120 s (#530).
- `Spixi/Utils/SPayments.cs:295` — peer lock: chat and contact details pass the peer, and any other address is refused. HomePage passes null, because any recipient is valid there (#729).
- `Spixi/Utils/SPayments.cs:334` — fee + balance computed in C#. The over-balance answer to the WebView carries no number (#1286).
- `Spixi/Utils/SPayments.cs:349` — the dialog shows `to.PaymentAddress`, the value that is signed, also after the End2End resolve (:323) (#805).
- `Spixi/Pages/Chat/SingleChatPage.xaml.cs:4507` — tip: C# picks the recipient from the message sender, prepares the tx (no broadcast yet) → :4594 confirm → :4617 broadcast (#626).
- `Spixi/Network/StreamProcessor.cs:485` — "request paid" row predicate: requestFunds · localSender · not yet answered (#929).

## Bridge surface
| Verb / push | Args (shape) | Who can send it | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `ixian:signSend:` | `<addr b58>:<amount dec>` | home.html (HomePage, untrusted chat-list text) · chat.html (SingleChatPage, untrusted) · contact_details.html (ContactDetails, untrusted) | `HomePage.xaml.cs:975` · `SingleChatPage.xaml.cs:474` · `ContactDetails.xaml.cs:880` → `SPayments.cs:277` | ours |
| `ixian:feeQuery:` | `<addr b58>:<amount dec \| 0>` | same three shells | `HomePage:979` · `SingleChatPage:478` · `ContactDetails:884` → `SPayments.cs:178` | ours |
| `ixian:payRequest:` | `<msgId hex>` | chat.html | `SingleChatPage.xaml.cs:482` → `SPayments.cs:388` | ours |
| `ixian:contextAction:tip:` | `<msgId hex>:<amount dec>` | chat.html | `SingleChatPage.xaml.cs:764` → tip case `:4374` | reshaped (confirm added, answered by push) |
| `ixian:paymentAuth:` | `on \| off` | settings.html (SettingsPage; renders peer file names) | `SettingsPage.xaml.cs:1055` | ours |
| `ixian:txexplorer:` | `<txid [0-9A-Za-z-]{1,128}>` | home.html | `HomePage.xaml.cs:1757` → `Utils.openExternal` | ours (#443) |
| `signSendResult` | `ok\|cancel\|fail, <txid \| text>` | → the page that asked | `SPayments.cs` (11 sites) | ours |
| `setSendQuote` | `addr, amount, fee, balance, max, '' \| address` | → the page that asked | `SPayments.cs:196,212` | ours |
| `payRequestResult` | `<msgId>, ok\|cancel\|fail\|gone, text` | → chat.html | `SPayments.cs`, `SingleChatPage:1213,1232` | ours |
| `setTipResult` | `1\|0\|pending\|cancel, text, <msgId>` | → chat.html | `SingleChatPage.xaml.cs:3929` | ours |
| `setPaymentAuth` | `True\|False` | → settings.html | `SettingsPage.xaml.cs:267,1065,1419` | ours |
| `clearPaymentActivityDone` | none (end of the wallet list flush) | → home.html | `HomePage.xaml.cs:4798` | ours (#508) |
| `addPaymentActivity` (contact details) | +`in\|out`, status enum, net amount | → contact_details.html | `ContactDetails.xaml.cs:1222` | reshaped (#928) |
Mini-app WebViews cannot send any of these: `MiniAppPage` has its own verb list, and `SEND_PAYMENT` there is unchanged legacy.

## Threat → rule → proof
| A hostile … could try… | What stops it (`file:line`) | Proof |
|---|---|---|
| compromised chat WebView: `signSend` to its own address | peer lock `SPayments.cs:295` + native dialog showing the full address | smoke "★★ Session H (B MINOR-4): the scope guard lives ONCE in SPayments…" |
| any shell: spend with no user step | `confirmAndAuth` before `sendTransactionFrom` (`:349`/`:357`, `:428`/`:443`) | smoke "★★ W5: signSend runs the NATIVE confirm BEFORE Node.sendTransactionFrom…" |
| chat WebView: tip with no dialog | `confirmTip` `SPayments.cs:547` before `addReaction`/`addTransaction` | smoke "★★ V-2: confirmTip is the SAME wall as Send and Pay…" |
| End2End resolve, or a peer nickname with line breaks / bidi: the dialog shows one address, another is paid | dialog built from `to` `SPayments.cs:349`; nickname whitelist + 32-char clamp `SPayments.cs:690` (#772, #805) | smoke "★★ gate 17 (I-3): the two signing paths show `to.PaymentAddress`…" |
| peer `requestFundsResponse` rewrites any of my rows | `StreamProcessor.cs:485` predicate | smoke "★ W11 (the predicate, loop r2 M2 · r3 canonical)…" |

## Given up / left open
- O-01 accepted for v1: the chat WebView can read the balance and the Max amount through `feeQuery` (`SPayments.cs:212`), which has no peer lock (#1286).
- Open race (`docs/security-review-for-be-engineer.md` §1d): a money dialog could paint over a resume lock in a narrow race. Not reproduced, not gated, needs a device test (#530).
- `ixian:txdetails:` in ContactDetails (`:1107`, legacy) has no peer lock: it opens `WalletSentPage` for ANY txid in activity storage. It is legacy; the perf research §2b proposes C# accept only this contact's txids (#1310).
- Confirm payments ON, but no biometric enrolled (`SPayments.cs:614`) or WinUI: the dialog alone guards the spend (#536).
- ⚠ Contradiction: SECURITY.md §3 still lists the deleted pages and §5.1 still calls the tip gap open; the code closed it (#626) and `docs/security-sweep-s13.md` agrees.

## Question for BE
Should `handleSignSend` / `handlePayRequest` / `confirmTip` refuse while `App.isAppLockActive` (`App.xaml.cs:142`) is true, or is a native dialog above the lock acceptable?
