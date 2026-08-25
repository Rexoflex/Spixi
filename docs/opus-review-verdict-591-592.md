# #46 loop verdict — #591 / #592 (the details redesign), 2026-08-26

One auditor round, then a FRESH break-my-verdict reviewer over the fixes. **The reviewer
broke three of them**, and two were the same cascade mistake, four rules apart, in a file
that had just gained the comment explaining it.

## Round 1 — one MAJOR

**Call was offered on contacts that cannot receive it.** The shell has no notion of
relation state, so the button shipped unconditionally. Send a contact request → open Chat
info → tap Call: `initiateCall` runs the permission prompt, writes a call bubble into
history, presents CallPage, plays a dial tone, takes power locks and rings for 45 seconds
while the peer receives nothing. Same class as the ⑪ delivery lie the composer lock
(#275) exists to prevent, one tap away on the same contact.
→ revealed by `showCallButton` on the chat header's own gate (`!isGroup && codecs > 0 &&
FriendState.Approved`), with the verb re-gated as the belt.

Also round 1: the peer sheet's **QR aria-label still said "your"** · **~123 lines of dead
CSS** left behind together with **five pins still asserting its styling** while a new pin
asserted the markup absent · the new row had **no press feedback** at all · a fourth
action pushed two Russian labels into ellipsis, and the project's i18n-overflow audit has
no control class for `.c-chat-info__qa`, so it reported NO BREAKERS while carrying it.

## Round 2 — three fixes broken

| # | What |
|---|---|
| **R2-M1** | **The label-wrap fix was a NO-OP.** I declared a second `.c-chat-info__qa-label` block EARLIER in the file than the one already setting `white-space: nowrap`; at equal specificity the later rule wins. `overflow-wrap` is inert under `nowrap`, so the whole block was decoration. |
| **R2-M2** | **The new row's press wash never painted.** The card rule is `.c-chat-info__body > :not(…):not(…):not(…)` — `:not()` carries its argument's specificity, so (0,4,0) — and a bare `.c-chat-info__addr-row:active` is (0,2,0). The row still did nothing visible on tap, with the native highlight suppressed. |
| **R2-M3** | **`peerQrLabel` reached no dictionary.** The shipped bundle asked for a key the shipped strings file did not carry; all 13 locales got hard-coded English. A pipeline-order slip: extraction ran, then the key was added, and nothing re-ran. |

★ R2-M1 and R2-M2 are **the same mistake** — and the file's own new comment for the
address row explains it in the sentence above the rule that repeated it.

Plus, measured: **the tip going green lost AA in light** (7.04:1 → 4.28:1; `.c-badge` is
12px bold, i.e. normal text, so the bar is 4.5). Damir's green stays; the ink moved one
ramp step at the TOKEN, which also closes the same pre-existing failure on the three other
surfaces already using that pair. The **cover did not bleed** (`100vw` + `max-width: 100%`
cancel — the hero is the containing block) and did not reach the chrome (`top: 0` is the
hero's top, leaving a hard-edged strip of screen above it).

## ★★ Four more pins could not fail

- an **8-character fixture** fed to a 9…6 truncator: it returns the string unchanged, so
  the pin asserted "a short address is not truncated" and would have stayed green if the
  row shipped the full base58 — the one thing it exists to forbid.
- an **`ok(true, …)`** asserting a geometric guarantee about a card this batch deleted.
- a **tautology**: `querySelectorAll(sel)[0] === querySelector(sel)`.
- "no Share on a peer address" — **guaranteed by the fixture**, which passed no handler.
  The component now fences it, and the pin passes one in.

And one comment corrected: I recorded that the smoke harness "boots a non-English
dictionary". It boots en-us. Counting the controls is still the better pin than matching a
label, but the recorded reason was wrong and it was written as precedent.

## Stated residuals

- **The Call reveal is one-shot in both directions.** A contact leaving `Approved` while
  the page is open leaves the button on screen — the C# re-gate makes that a silent no-op,
  not a lie. A contact who is accepted while you look at their details gets no Call button
  until re-entry. Parity with `SingleChatPage:889`, which is also one-shot.
- **A tap while a call is already live is silent.** This document has no call state to
  test — #270 moved the call surface into its own WebView and nothing pushes "a call is
  up" here — so a toast would have been invented data. The in-call strip is on screen
  saying it.
- **The moved N86 geometry docblock** describes a fixed 185px card and now annotates a
  fluid one (`min(216px, 40dvh, 62vw, 100%)`). The safety conclusion survives; the table's
  numbers want a re-measure against the fluid size.

## Numbers

bundle **296 exports** · shells **18** · smoke **3208 / the 3 KNOWN** (#136 · M5 · B3) ·
cs-syntax **144 + 1** · locales **ALL CLEAN, 771 keys** · i18n-lint ✓ · pseudo 9/9 ·
Ixian-Core `097341a` untouched.
