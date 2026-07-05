# Chat tipping — spec + build notes (#138)

Status: agreed direction (Damir + logged take, DECISIONS #136) · built 2026-07-05.

## 1. Why tipping is NOT the send flow

Send = deliberate money movement: one screen, review sheet, explicit everything (#26).
Tipping = in-context appreciation: tiny amounts, social gesture, speed over ceremony.
Forcing the send flow on a 1-IXI tip kills the gesture. But it is still money leaving
the wallet, so ONE explicit confirm stays non-negotiable — the design is "#26-lite":
**the sheet IS the review** (amount + recipient visible on the same surface as the
confirm), one latched tap, nothing sent before it.

## 2. Entry points

- **Message menu → Tip** (exists: `c-msgmenu`, `heart-handshake`, capability-gated
  `capabilities.tip` — #25). Long-press/right-click → sheet.
- Reaction-row/tip-pill tap as a second entry = later (the pill currently opens the
  reactions inspect sheet; adding "tip more" there is a v2 nicety).
- **Own messages are not tippable** — the shell/caller gates (self-tip guard).

## 3. The tip sheet (`c-tipsheet`, openTipSheet)

- Head: deterministic avatar + "Tip {name}" — the recipient is VISIBLE at the moment
  of confirm (#26-lite requirement). Optional one-line message excerpt anchors WHICH
  message the tip belongs to.
- **Preset chips: 1 / 5 / 10 IXI** (c-chip selected = tonal, #50) + **Custom** →
  reveals a decimal input (shared `sanitizeAmount` rules; canonical form via shared
  `canonicalAmount` — what the bridge gets is what a parser reads, receive-audit M1).
- **One confirm, latched (#72④): label carries the amount — "Tip 5 IXI"** — disabled
  until an amount is chosen/valid. Optional `balance` prop → inline insufficient
  guard (no fee math here — the bridge re-validates; tip fee handling = §9 ask).
- Dismissal: light dismiss ALLOWED before confirm (nothing committed; speed —
  deliberate divergence from the send review's lightDismiss:OFF, rationale: the
  send review is a second step confirming a filled form; here dismissing costs one
  long-press to redo). **In flight = locked** (send-audit C1 lesson): Esc + scrim
  disabled, confirm loading, attempt counter invalidates stale callbacks.
- Success: confirm morphs (setSuccess "Tipped") → sheet closes → the result lands as
  the **#65 tip pill** on the message (bridge re-emits the reaction/tip set) + a
  wallet tx (appears in the wallet shell feed as any payment).
- Failure: inline role=alert error in the sheet, confirm re-enabled — retry stays.

## 4. Bridge (grounded, mostly answered)

Legacy `chat.js:1670` already fires **`ixian:contextAction:tip:MSGID:AMOUNT`** — tip
is a first-class context action WITH the message ref. The shell maps
`onTip({ messageId, amount }, ctrl)` → that command; ctrl.done/fail from the bridge
callback like send.

§9 asks remaining: ① network fee for tips — silently absorbed, shown, or min-amount
floor? ② confirmation push — does the bridge re-emit the reaction list incl. tip
(pill state) or must the shell optimistically paint? ③ group chats: recipient =
message sender — confirm the C# handler resolves MSGID → sender address itself
(the JS payload carries no address). ④ tip on a tip / repeat tips: amounts aggregate
in the pill ("6 IXI") or last-wins?

## 5. API

```
openTipSheet({
  message: { id, excerpt? },            // excerpt: one line of context (optional)
  recipient: { name, address? },        // avatar + name in the head
  balance,                              // optional RAW numeric → inline guard
  presets = ['1', '5', '10'],
  strings, host,
  onTip(payload, ctrl),                 // payload: { messageId, amount } (canonical string)
}) → sheet
```

Wired in the chat demo: menu Tip → sheet → mock bridge (900ms) → #65 pill merge via
the demo's rowRx state + toast. Sent-message rows show the self-tip guard toast.
