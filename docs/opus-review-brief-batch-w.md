# Opus #46 loop — BRIEF for Batch W (the wallet F5 follow-ups, 2026-08-24 overnight)

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** Write short sentences. One
idea per sentence. Use the same word for the same thing.

You are an AUDITOR. You did not build this. Your job is to BREAK it. A pass is not a proof.
Read the code, execute what you can (jsdom is installed: `node scripts/smoke-test.mjs`
runs in ~40 s; you can also write a throwaway node script that loads
`src/demo/wallet.html` the way the smoke harness does), and report what is WRONG with
file:line evidence. Invent mutations the work order does not list. Rank: MAJOR
(user-visible break, money-path risk, a11y block, a gate that cannot fail) · MINOR ·
NIT. Do NOT fix anything. Do NOT touch the tree. Write your findings to the file named
in your task, in the table grammar of `docs/opus-review-wallet-pass-522-530.md`.

## What was built (uncommitted, on top of `42e72109`)

The work order: `docs/handoff-2026-08-24-overnight.md` §1 Batch W. The evidence:
`docs/f5-findings-2026-08-23-wallet-pass.md`. The decision rows: DECISIONS #535–#537.

| Item | Where |
|---|---|
| W-a `wallet-send.css` + `contact-row.css` linked in `src/shells/chat.html` | chat.html head |
| W-b picked row = name over truncated address; desktop 560px column cap | `wallet-send.js pick()`, `wallet-send.css`, `wallet-receive.css` (tail) |
| W-c address sheet: internal scroll, viewport caps, premium pass | `wallet-receive.js openAddressSheet`, `wallet-receive.css` (the `.c-addr-sheet` block) |
| W-d request-in Pay → review sheet BEFORE the native confirm | `wallet-send.js openPaymentReview` (NEW export), `chat.html` (`openPayRequestReview`, `buildPaymentRow`, `setSendQuote`, `payRequestResult`) |
| W-e hero scan → `ixian:sendScan` | `home.html` hero `onScan` |
| W-f scanned KNOWN address → `setSendRecipient` | `wallet-send.js setSendRecipient` (NEW export), `home.html quickScanResult` |
| W-g "Confirm payments" hidden on WinUI | `Spixi/Pages/Settings/SettingsPage.xaml.cs:132-155` |
| W-h the shell↔stylesheet GATE | `scripts/smoke-test.mjs`, the "Batch W" block near the end |
| W-i amount on top | `wallet-send.js` (section order) |
| W-j ONE row grammar | `src/components/contact-row.js` (NEW), `src/styles/components/contact-row.css` (NEW), `pressable.js`, `base.css`, `wallet-send.js`, `wallet-receive.js` |
| W-k `enterkeyhint` + Enter → blur | `wallet-send.js attachAmountKeyboardDismiss`, used by both screens |
| #535 sounds | `Spixi/Resources/Raw/sounds/message_*.mp3`, `docs/sound-placeholders.md` |

Pipeline state: bundle 285 exports · shells 18 · smoke BASELINE OK 2867 / 3 KNOWN ·
cs-syntax 143+1 · locales CLEAN. `git --no-optional-locks diff` shows the whole delta.

## Standing rules the build must respect

- SECURITY.md: no keys, no signing, no money math beyond validation/Max/total in the
  WebView. The compose and the review sheet PROPOSE; C# re-parses, shows the NATIVE
  confirm, signs. Verify the W-d sheet cannot bypass that.
- No invented fee (W6, #523): `fee: null` gates until a quote answers THIS pair.
- #72④: one send in flight; latches; no double fire.
- #205 a11y: roles, labels, focus, `role=alert` unhide-before-text.
- #211: a chat/list surface never shows a full address; the review sheet does (#99).
- Ixian-Core is frozen at `097341a` — a core need is a BE row, not a change.
- A pin that cannot fail is a defect. Mutate the source in your head (or in a scratch
  copy under /tmp) and ask whether the pin would notice.
