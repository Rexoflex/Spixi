# Opus #46 loop — BATCH W (the wallet F5 follow-ups, 2026-08-24 overnight) → CLEAN after 3 rounds

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.**

**Batch:** W-a … W-k + #535 sounds (`docs/handoff-2026-08-24-overnight.md` §1, DECISIONS
#535–#538). **Author:** fable (this session). **Loop:** 3 disjoint round-1 Opus auditors
(components+CSS · shells+C# · gates+i18n+a11y) → fixes → a FRESH round-2 break-my-verdict
reviewer → fixes → a FRESH round-3 verifier over the round-2 fixes + pin mutations.
★ The author never reviews own work; every auditor ran on the real tree (scratch copies
for mutations). Reports: `opus-review-batch-w-r1-components.md`, `-r1-shells-cs.md`,
`-r1-gates-i18n-a11y.md`, `-r2.md`, `-r3.md`.

## Round 1 — 3 disjoint auditors: 13 MAJOR-class, all reproduced on the live tree

| # | MAJOR | Fix |
|---|---|---|
| 1 | a quote landing AFTER Confirm rewrote fee/total under the spinner and re-enabled a loading button | `render()`/`setQuote` inert while `sending \|\| sent` |
| 2 | the review sheet never RETRACTED its insufficient error (Confirm armed beside "Not enough"); an address error froze "Calculating…" | retracted on a clearing quote; the address error leaves the fee row "—" |
| 3 | a throwing bridge call bricked the sheet with EVERY exit locked (Esc, scrim, back, `close()`) | `try/catch` → `fail()` on the sheet AND on the compose hand-off |
| 4 | a double tap on Review stacked two sheets; the survivor could fire a second identical send | ONE open sheet per compose + `_closeReview()` teardown hooks in both shells |
| 5 | `done()` neither idempotent nor terminal (two `onDone`; a `fail()` then `done()` reported "Sent") | terminal `sent`; `fail()` retires its attempt |
| 6 | C# answered "cancel" for SIX reasons — five UNPAYABLE cases rendered as a silent, permanent no-op on Confirm | new `payRequestResult` status **`gone`** (3× SPayments + SingleChatPage); "cancel" only for the user backing out; the shell says "This request can no longer be paid." |
| 7 | the request-in sheet had NO 1:1 guard — a requestFunds CAN land in a group/bot (StreamProcessor has no group gate); the sheet quoted a fee against the GROUP address and armed Confirm | gated at the card arm AND the opener (`mode.type === 0`) |
| 8 | W-f could NEVER match a real receive QR: `ExtendedAddress.ToString()` is `<base58>_<ext>` for OfflineTag (verified Ixian-Core `ExtendedAddress.cs:199-208`) while the roster is bare | compare the payment address before `_`; closes be-cutover W7 (the pushed form IS extended, by design) |
| 9 | a zero-amount request hung the sheet on "Calculating…" forever (C# answers an EMPTY fee for amount 0) | no sheet for zero; an echo-matched empty fee AND a 15 s quote timeout both surface an honest error |
| 10 | the hero scan forwarded ANY QR (a URL, a Wi-Fi code) into the money compose | `quickScanForSend` validates with `ExtendedAddress.Validate` first, alerts on failure |
| 11 | the W-h gate's hand-written COMPANIONS map could be deleted GREEN, and its self-test was a tautology (`['x'].concat(undefined).length === 2`) | rebuilt: companions DERIVED from the import graph per export; the self-test RUNS the gate on a synthetic shell |
| 12 | (found BY the gate) `settings.html` mounted a search field with no `search-field.css` — the W-a class, live, outside the wallet | linked |
| 13 | the W-i focus hand-off was a no-op on the quote flow (Review disabled → `focus()` ignored, focus fell to `<body>`) | the named picked GROUP takes focus + a live announcement |

Plus ~20 MINOR/NIT fixed: the directory F2/C9 rule carried into select rows · the receive
roster cap re-tuned for the 64px row · IME + desktop exemption for W-k · `lockedRecipient`
refuses a scan redirect · the address sheet singleton resets when torn down · the sheet
region is keyboard-reachable · the desktop inner cap derived from the dialog · the pay
backstop above C#'s 120 s self-heal · the sheet resolves for its own card id only · the
address row shares the contacts card · the cascade-aware drift fence · `pendingContact`
orphans removed from the drafts · the full-address tooltip dropped from a #211 surface.

## Round 2 — fresh reviewer over the fixes: 2 MAJOR, 5 MINOR, 8 NIT

| # | Finding | Fix |
|---|---|---|
| R2-1 MAJOR | B-2 was applied to ONE of two callers: both compose paths still had the 30 s backstop under C#'s 120 s latch — a slow user's real "ok" landed on nobody, shown as failed | 125 s on all three paths (pay sheet, in-chat compose, wallet compose) |
| R2-2 MAJOR | the m2/m7 guard COERCED instead of gating: `fee:'abc'` → "0 IXI", Confirm enabled; `'1e3'` → 13 | `safeUnits` accepts ONLY a raw canonical decimal; anything else is "no estimate" |
| R2-3 | "one sheet" made Review a dead tap for ~400 ms after Cancel (the slot cleared on removal) | one OPEN sheet — `isOpen()` reads presentation state |
| R2-4 | address-less contacts still pickable on Send (`feeQuery:undefined`, a blank-address review) | blocked in BOTH row forms; `pick()` refuses; string-exact echo compare |
| R2-5 | `GATE_PURE` exempted 17 DOM-building exports by name | the direct rule has NO name heuristic: every destructured export of a CSS-owning module requires its stylesheet; one documented ALLOW (chat.html ↔ settings-screens pref readers) |
| R2-6 | companion derivation was ONE module hop | cross-module closure per export (found + linked `downloads.html` ↔ avatar.css) |
| R2-7 | the M1 pin cannot fail on a single mutation (two doors) | ruled: the second door is a belt on a money path; the pin exercises the outer door (recorded here, not "fixed") |

Verified clean by round 2 (executed): `ExtendedAddress.Validate` ACCEPTS the extended
`X_Y` form (the B-4 gate does not undo W-e) · fail→retry→done runs the second attempt and
fires `onDone` once · the `payRequestResult` id round-trips byte-exactly · the 1:1 fence
covers bots · the gate + drift fence are mutation-honest (4 planted, 4 caught) · every
built shell byte-identical to a fresh rebuild.

## Round 3 — fresh verifier over the round-2 fixes: 1 MAJOR (a pin), 2 MINOR, 5 NIT

| # | Finding | Fix |
|---|---|---|
| R3-1 MAJOR (pin) | the R2-3 pin was vacuous both ways and timing-fragile: it counted `[data-open]` sheets 30 ms after the tap, and a DISMISSED sheet could re-acquire `data-open` from openOverlay's deferred rAF setter | the pin asserts NODE IDENTITY (a second, different sheet node beside the dying one); `overlay.js` guards the enter setter with a still-on-the-stack check; `isOpen()` now reads the overlay STACK (`isOverlayOpen`, removed synchronously at dismissal) — not the DOM node, not the attribute |
| R3-2 | R2-2 landed on one of two symmetrical consumers — the compose's `_applySendQuote` still called raw `toUnits` (throws) | the same strict parse (`strictUnits`) |
| R3-3 | the string-exact echo compare landed only in the sheet | the compose compares `String(...)` too |
| n1–n3 | gate docblock still named the deleted PURE list · the handover doc's header contradicted its own table · a blocked address-less row had an empty sub-line | fixed ("No address yet", new key `noAddressYet`) |

Verified clean by round 3: all three backstops 125 s and `tipWait` (12 s) is correct — the
tip path takes no confirm latch · `IxiNumber.ToString()` is never exponent/grouped, so no
legitimate amount fails the strict regex · the gate + fence caught 3 of 3 planted defects ·
the C# diff compiles by eye (usings in scope, the un-awaited `displaySpixiAlert` matches
HomePage:1133) · real-tree baseline unchanged.

**The pattern of this loop, named three times by three reviewers: a fix applied to ONE
of two symmetrical callers.** The next builder greps for the twin before closing a row.

## Pipeline after the loop

bundle **287** exports (+`contact-row.js`, `openPaymentReview`, `setSendRecipient`,
`attachAmountKeyboardDismiss`, `closeAddressSheet`, `isOverlayOpen`, `contactDisplayName`,
`contactSubLine`, `setContactRowChecked`, `createContactRow`, `createGlyphRow`) · shells
**18** · smoke **BASELINE OK 2902 / the 3 KNOWN** · cs-syntax **143 + 1** · locales CLEAN.
