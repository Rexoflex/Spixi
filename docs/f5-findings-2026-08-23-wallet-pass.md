# F5 findings — the wallet pass walk (Damir, 2026-08-23 night, Windows + Android)

Verdict: **mostly green** — the money mechanics hold (compose, quote-gated fee, the
native confirm with full address + fee, request respond, receive sheet). The finds
are POLISH + ROUTING, one root cause carries most of them. All go to the overnight
session as **Batch W** (runs FIRST — see `docs/handoff-2026-08-24-overnight.md`).

## W-a ★ ROOT CAUSE, verified in source: `chat.html` links NO `wallet-send.css`

The in-chat compose (attach → Pay) and its review sheet render UNSTYLED in the chat
shell: default white input on both themes, the picked row's name + full address
run-on, review rows concatenated ("Amount13 IXI"), the address forcing a horizontal
scrollbar in the desktop dialog. `src/shells/chat.html:82-109` links every chat
stylesheet but not `wallet-send.css` (which also carries `.c-sendreview`). The #46
loop missed it — jsdom pins read computed style only where pinned; nothing gates
"every destructured component family has its stylesheet linked" → W-h adds that gate.
Fix: add the link (+ verify `modal.css` for the Max confirm), rebuild, eyeball both
themes. Most screenshot damage collapses with this one line.

## W-b In-chat compose polish (after W-a)

Re-check on device once styled: topbar spacing, dark input tokens, the picked-row
stack (name over muted truncated address), desktop pane width behavior.

## W-c The address sheet ("Show my address") — small viewports + premium pass

Desktop dialog overflows (visible scrollbar, chip + explainer cut). Fix: internal
scroll (`.u-scroll`) with a max-height (`min(90dvh, content)`; desktop dialog cap
~420–480px wide), QR card scales via `min()`. Then the PREMIUM pass (Damir: "more
premium, on brand"): title hierarchy, QR card treatment, the address chip, explainer
typography — the Account screen will reuse this exact surface, so polish once.

## W-d Pay on a request = the NEW review sheet first; retire the legacy details route

Damir: "show the new review dialog/sheet when someone clicks Pay, rather than just
the native dialog." Shape: request-in **Pay → the c-sendreview sheet** (recipient +
amount + fee + total + Confirm & send) → `ixian:payRequest` → the native OS confirm.
And a PENDING request's **Details currently opens the legacy
WalletContactRequestPage** (ugly, and it exposes the legacy Decline that #526 removed
for v1) — route pending-request Details into the same new sheet (or drop Details
while pending; after payment the new tx detail already shows). Needs a fee quote for
the sheet (`ixian:feeQuery` with the request amount).

## W-e Hero scan must compose a payment, not offer add-contact

Android find: wallet-hero scan of a receive QR (`addr:ixi`) lands in ADD CONTACT.
Cause: the hero emits generic `ixian:quickscan`; `processQRResult` only routes
`:send` payloads to the compose — `addr:ixi`/bare fall through to ContactNewPage
(legacy behavior). Fix: the hero (wallet tab = payment intent) emits
`ixian:sendScan` — every decoded payload returns via `quickScanResult` and
`setSendAddress` already parses `addr` / `addr:ixi` / `addr:send:amount`. The
contacts flow keeps its own scan entry unchanged.

## W-f Scanning a KNOWN address → auto-pick the contact

The compose should show nickname + avatar when the scanned address is already a
contact, not the raw-address row. Shell: on `quickScanResult`, look the address up
in `peopleRoster()`; hit → programmatic pick (new free fn `setSendRecipient(el,
contact)` — the component has no public pick API today); miss → `setSendAddress` as
now.

## W-g "Confirm payments" on Windows = a no-op → HIDE it there

Damir confirmed items 18–19: on Windows the toggle changes nothing (no biometric
backend; the native confirm shows regardless). Platform-gate the cap: SettingsPage
skips `paymentAuth` in the caps push (and the seed push) on Windows → the row never
renders there. Android/iOS keep it. Amends #525's WinUI note.

## W-h NEW GATE: shell ↔ stylesheet coverage

A structural smoke pin: for every `create*` component family a shell destructures
AND mounts, the matching component stylesheet is linked in that shell. This find's
whole class dies with it.

## Checklist artifact

Damir: no way to copy the findings out → a **Copy report** button added to the
Wallet Pass F5 artifact (serializes counters + per-item pass/fail to the clipboard).

## W-i Send layout: AMOUNT ON TOP (Damir, screenshots 2026-08-23 late)

Both money screens lead with the amount — you decide how much first, and the number
stays visible while you browse. Send reorders to: **Amount section on top** (input +
Available + fee line + Max), then the recipient section (search → "Send to an
address" → the contact list). A picked recipient replaces the list as today; Review
stays at the bottom. Receive already leads with the amount (#527) — unchanged.

## W-j One contact-row grammar across Send · Receive · Contacts

The Send/Receive rows look smaller than the Contacts directory rows. Unify on the
DIRECTORY anatomy: avatar-48 + name + the #211 truncated address sub-line + the
online dot, same list container/spacing. Receive keeps its trailing multi-select
circle (W9); Send rows stay tap-to-pick. Prefer ONE shared row builder (or exactly
matched CSS) so the three screens cannot drift again.

## W-k Amount inputs dismiss the keyboard on Next/Go

`enterkeyhint` on both amount inputs + Enter/Next/Go → `blur()` — the keyboard
drops so the contact list is browsable right after typing the amount. Both screens.
