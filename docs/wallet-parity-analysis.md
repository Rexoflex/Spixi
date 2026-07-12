# Send / Receive IXI — demo-parity analysis (#264, Damir quirk ②)

> Analysis ONLY (Q3 gate: wallet-send builds LAST, #232, human BE review).
> What separates today's production wallet tab from the desktop/mobile demo.

## Where we are

| Surface | Demo | Production today | Gap class |
|---|---|---|---|
| **Receive** | `createWalletReceive` takeover: QR (`addr:ixi`), copy morph, request-an-amount (client-side QR re-encode), Share, request-to-contact strip | **SAME component, live since #182** — QR/copy/amount all work; falls back to native only if `setAddress` hasn't landed | ~PARITY. Missing: request-to-contact strip (hidden — `ixian:sendrequest` is a WalletReceivePage verb, dead on HomePage → **W8**) |
| **Send** | `createWalletSend` compose→review→confirm morph (recipient picker, amount, fee+total line, insufficient guard) | BUILT + wired but **cap-gated OFF** (`composeSend`); Send button → native `ixian:sendixi` (legacy WalletSendPage) | **BE-gated by design**: the WebView must never sign — the compose needs the §8 signed-handoff verb (**W5**) + a real fee push (**W6**) |
| **Tx detail** | inline detail card | **redesigned `wallet_sent.html` (#259/#263)** — full parity | DONE |
| **Recipient picker** | demo contact picker | native `WalletRecipientPage` (legacy look) | shared with create-group — **deferred to the wallet pass** (#256) |

## What full parity needs (the wallet pass, in order)

1. **W5 — signed hand-off verb** (`ixian:signSend:<addr>:<amount>` → C# signs + native
   confirm + broadcast; ideally an ack push so the review's done/fail is real).
   ★ SECURITY.md: compose in WebView, C# signs — the verb is the wall.
2. **W6 — fee push to the home tab** (the review's fee/total lines are a placeholder 0
   today; money math must not ship on a guessed fee).
3. **#255 backlog prerequisite:** `createWalletSend` consumes the UNFILTERED roster —
   groups would appear as money recipients; filter + pending-badge before un-gating.
4. **W8 — request-to-contact** (`ixian:sendrequest` on HomePage) lights up the Receive
   strip the component already hides gracefully.
5. Scan-result routing into the compose (`ixian:quickscan` → address fill) rides W5.
6. Flip `SPIXI_ENV.capabilities.composeSend` → the demo UX is live; the native
   WalletSendPage/WalletSend2Page retire at the §5 repoint.

**Zero-C# now = nothing left worth doing** — every remaining gap is the signed verb,
the fee push, or verbs on the wrong page. Recommendation: keep the gate, batch
W5+W6+W8 as ONE wallet-pass BE ask, FE lands the roster filter + on-device F5 first.
