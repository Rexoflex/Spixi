# Wallet shell — build spec

Status: interview-locked (Damir 2026-07-05, DECISIONS #133) · **build starts after the
Figma screens scan** (#31 — Damir authorizing the Figma MCP; frames pulled next session).
Grounded in the legacy-surface research (send/send2/sent pages, recipient picker,
request flow, bridge functions) + existing decisions #20 #21 #26 #55 #77 #98.

## 1. Scope (absorbs legacy pages)

One shell, four surfaces: **Home** · **Send** (+ review) · **Receive/Request** ·
**Tx detail sheet**. Legacy pages absorbed: wallet, wallet_send, wallet_send2,
wallet_sent, wallet_recipient (picker), wallet_request + the contact-request-pay
responder (payment-request responses stay chat-first via createPaymentBubble, #71).

## 2. Home

- **Hero** (#20 tokens: `surface/hero`, `on-hero` inks; scoped topbar override):
  balance in tabular numerals (#21), IXI ticker treatment per hero Figma; Send +
  Receive buttons live IN the hero.
- **Filter chips**: All / Sent / Received (c-chip, selected = tonal per #50).
- **"Missing a transaction?" info pill** (#98, Damir re-confirmed): chip-style trigger at
  the END of the chip row → c-sheet explainer ("Spixi reads history directly from the
  Ixian chain — recent txs can take a moment; very old ones may not list") + refresh +
  **"View on IxiScope" for THIS address** through the external-link confirm. Watch-outs
  from #98: ≤360px → icon-only ⓘ; chips stay neutral-outline unselected so the pill owns
  the wash. IxiScope URL pattern = BE/lang config (§9).
- **Activity list**: c-txlist-item (#55) — bridge pre-formats amounts (#77 mirrored
  C#-side), rebuild-per-tick API today (addPaymentActivity) → render from model, #44
  free-fn updaters. Empty state copy-only (illustrations parked, #132).
- Lazy history if the bridge supports paging — else full list (BE question).

## 3. Send — one screen + review sheet (#26)

Single screen, progressive:
1. **Recipient**: contact rows (avatar + name, reuses chat-list row grammar) + search +
   "to address" input w/ validation + QR scan (`ixian:quickscan`). Legacy multi-recipient
   is commented out C#-side — design single-recipient, leave the model plural-ready.
2. **Amount**: big tnum entry, balance context ("Available: X IXI"), Max action, live fee
   line (setFees), insufficient state inline.
3. **Review = c-sheet** (the #26 deliberateness step): recipient (avatar+name+address) ·
   amount · fee · total — explicit **Confirm** (fill) / Cancel; confirm latches
   (oneShot, #72④) → loading → success morph; failure → inline retry state.
4. **After send**: return to Home with the new pending tx at top (status via #55
   pending presentation); chat context gets its payment bubble from the bridge as today.

## 4. Receive / Request

- **Receive**: QR of own address (--surface-qr tokens exist) + copyable address chip
  (member-sheet address-chip pattern, #99) + share.
- **Request**: optional amount → request QR (`address:send:amount` legacy format) and/or
  send-as-message to a contact (bridge: request payment = chat message, #96 attach sheet
  already has "Request payment").

## 5. Tx detail sheet (Damir: bottom sheet)

Tap row → c-sheet: direction+status badge (c-badge #54) · amount (tnum, #77) · fee ·
counterparty (avatar+name if contact, else address chip w/ copy) · timestamp (absolute,
#55) · confirmations · **View on IxiScope** (external-link confirm). Technical extras
(tx id) behind an "All details" disclosure INSIDE the sheet if needed.

## 6. Bridge contract (research summary — verify at build)

Legacy JS functions the C# side drives: setBalance, setRecipient, setFees, setData,
addEntry/addPaymentActivity (rebuild-per-tick), confirmation enum true/false/error/unknown,
QR formats `address:ixi` and `address:send:amount`, status by polling (no push).
Commands fired: ixian:send/spixi.request flows, quickscan, back, etc. — map 1:1 in the
shell adapter like chats/apps did; NO new C# required for v1 (frozen bridge, #1).

## 7. BE asks (add to §9.5 at build)

1. IxiScope URL pattern + refresh semantics (#98).
2. History paging (loadmore-style) for the activity list — or confirm full-rebuild stays.
3. Dust display floor (#85 backlog: amounts <0.01 render "0").
4. Fiat rate source — NOT in v1 (Damir chose IXI-only home), log for later.

## 8. Slices (each with #46 audit loop)

1. **Home**: hero + chips + #98 pill/sheet + activity from mock feed + tx detail sheet.
2. **Send**: screen + review sheet + success/failure paths (mock bridge).
3. **Receive/Request**: QR surfaces + share/copy.
4. **Polish pass**: on-device check (hero safe-area watch-item #22 applies HERE most).

Prereq for slice 1: **Figma frames scan (#31)** — wallet home, send, receive, tx detail
(Damir authorizing the Figma connector; pull node screenshots + specs first).
