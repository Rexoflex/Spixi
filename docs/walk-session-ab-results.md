# Walk AB — results (2026-09-22, Windows F5 + Android dev-coexist Debug build)

**15 pass · 0 fail · 2 n/a** — pasted from the sheet by Damir. **AB.5 confirmed P the same day (16 · 0 · 1).**

| row | result | reads as |
|---|---|---|
| AB.1 ★ · AB.2 · AB.3 · AB.4 | P | #903 holds on the device: B opens MASKED after A was revealed, a pending A keeps its reveal while its status updates, 8–10 fast clicks give no mixed card, the explorer opens the transaction on screen |
| AB.10 | P | the pushed (phone) path kept its soft reveal — `paneHosted` only skips the fade on the pane |
| AB.5 ★ | **P** (confirmed 2026-09-22, after the paste: "it always defaults to the empty pane") | the #902 helper holds on the device: after Message-from-Contacts, a tx tap + back lands on the empty pane, never the chat |
| AB.6 · AB.7 · AB.8 | P | Details from a payment card returns to the chat (`fromConversation`); the race tap leaves no chat on the wallet tab; no "rate the app" over the wallet |
| AB.9 | P | **the draft SURVIVES the tab-sweep close inside the 400 ms debounce** — `webView.Source = null` does deliver `pagehide`. The #902 HYPOTHESIS is closed as "no draft loss"; no flush needed |
| AB.11 ★ | P, no note | **7×11 stays** — the shipped tail is the pick; 6×10 stays on the sheet as the other dial |
| AB.12 · AB.13 | P | 2 px gap reads, the tail is whole both sides; stickers and media keep no tail, the selection tick still lines up |
| AB.14 | P | the two privacy wordings read — Damir's rulings on each are still to be said out loud (→ counsel) |
| AB.15 ★ · AB.16 | P | **#907 holds on the device: the chat from the screenshot opens with a full window**; a short chat and a handful-of-messages chat show no pill |
| AB.17 | **N** — "can't delete a call card, can't select it" | ★ A FINDING, not a gap: call rows are excluded from the long-press menu AND from select mode BY DESIGN — `isMenuableRec` in `chat.html` returns false for `kind === 'call'` ("reacting/tipping a call record is nonsensical and they carry their own call-back affordance"), and the same predicate feeds `selectable`. So the "deleted call card returns as No answer" consequence (CORE-9) is UNREACHABLE from Spixi's own UI; only a counterpart's modified client could send that delete (CORE-10). Row retired; CORE-9's note re-scoped |

## What this settles

* Session AB's four C# files **compiled** (Windows F5 and the Android build — the first compile the code had).
* #903's two-thread and reveal fixes, #902's tab sweep, #904's bubbles and #907's window are all walked green.
* The draft-loss hypothesis is closed (AB.9). The tail is 7×11 (AB.11).
* Nothing open from this walk. Nothing failed.
