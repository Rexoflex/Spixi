# F5 checklist — the details redesign (#591 / #592), 2026-08-26

**Build:** C# changed in **1** file (`ContactDetails.xaml.cs` — a new verb + a new push) →
**wipe `obj`/`bin`** (#387). Components + strings changed → FULL pipeline, in this order:

```
node scripts/extract-strings.mjs && node scripts/build-locales.mjs \
  && node scripts/build-strings-iife.mjs && node scripts/build-demo-bundle.mjs \
  && node scripts/build-shells.mjs && node scripts/smoke-test.mjs
```
Expect: bundle **296** · shells **18** · smoke **3208 / the 3 known** · locales **771 keys**.

---

## 1 · The details screen (1:1 — open a contact from the directory)

| # | Do | Expect |
|---|---|---|
| 1.1 | Look at the top | a soft **cover** behind the avatar, bleeding to both screen edges and up to the chrome, fading out at the bottom |
| 1.2 | A contact **with a photo** vs **without** | with: a blurred wash of their own photo. Without: their identity colour — the same hue their gradient avatar wears |
| 1.3 | The action row | **four**: Message · Call · Pay · Request |
| 1.4 | The address row | disc + "Spixi address" + the **truncated** address + chevron. The full base58 is nowhere on this screen |
| 1.5 | Tap it | the shared address sheet opens — QR, full address, Copy, and the explainer |
| 1.6 | Read the sheet's copy | it talks about **their** address. No "your" anywhere, and **no Share button** (Share would send *your* address, not theirs) |
| 1.7 | Tap and hold the address row | it visibly presses |

## 2 · ★ CALL — the one the audit caught

| # | Do | Expect |
|---|---|---|
| 2.1 | An **approved** contact → details | Call is there and starts a call |
| 2.2 | A contact you sent a request to and who has **not accepted** → details | **NO Call button at all** |

★ 2.2 is the MAJOR. Unwired, tapping Call on that contact ran the whole path — permission
prompt, a call bubble written into your history, the call screen, a dial tone, 45 seconds
of ringing — while the peer received nothing. Same class as the composer lock (#275).

⚠ Known and accepted: if the peer accepts **while you are looking at their details**, the
Call button appears only on re-entry. Same one-shot as the chat header.

## 3 · Groups

| # | Do | Expect |
|---|---|---|
| 3.1 | Open a group's info | Message alone — **no** Call, no Pay, no Request, no address row |

## 4 · The skeleton

| # | Do | Expect |
|---|---|---|
| 4.1 | Open a group with many members (watch the roster land) | the placeholder rows are **clearly visible** now, and when the real rows arrive **nothing shifts** |

⚠ It was drawn in `--surface-neutral-02`, which resolves to the **card's own colour** in
both themes — so it was not merely faint, it was the same colour as what it sat on. Two
ramp steps up now. "A notch or 2" is your eyeball.

## 5 · Your two extras (in a conversation)

| # | Do | Expect |
|---|---|---|
| 5.1 | A short call card ("Missed call") and a short payment card | they **hug** their content instead of being drawn at the full rail with empty space beside them |
| 5.2 | A long call/payment line | it **wraps** instead of being clipped |
| 5.3 | A tipped message | the chip is **green**, not orange |

⚠ **5.4 — a token change to eyeball.** The green tonal badge missed AA in light (4.28:1 at
12px bold), so `--text-success` moved one ramp step darker **in light mode only**. That
also affects received tx amounts, tx-sheet amounts and payment-card amounts — all of which
gain contrast, none of which change hue. Say the word and it reverts, with the tip scoped
on its own instead.

⚠ **5.5 — eyeball.** A hugging call card that also carries a tip badge and reactions may
show its reaction row extending past the card's edge. Not a clip; a layout-quality call.

## 6 · Desktop

| # | Do | Expect |
|---|---|---|
| 6.1 | Open contact details as a pane | the cover spans the **pane**, not a 640px band floating in it |
| 6.2 | Right-click a chat → Chat info | unchanged behaviour, the new look |

## 7 · The demos (the review surface)

`src/demo/chat.html`, `chats.html`, `desktop.html` — the address row opens the sheet there
too, so what you review matches what ships.

---

## What I did NOT do, and why

- **A toast when Call is tapped during another call.** The tap is silent. This document has
  no call state to test — #270 moved the call surface into its own WebView and nothing
  pushes "a call is up" here — so a toast would have been invented data. The in-call strip
  is already on screen saying it.
- **Group rename / re-avatar.** Verified again: **no verb exists** (CI7).
