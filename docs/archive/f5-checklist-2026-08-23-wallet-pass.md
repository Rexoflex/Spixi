# F5 checklist — the wallet pass (#522–#531, 2026-08-23)

★ Money surface. Build order: `node scripts/build-demo-bundle.mjs` →
`node scripts/build-shells.mjs` → `node scripts/smoke-test.mjs` → **wipe obj/bin**
(C# changed) → build net10.0-windows → F5. ⚠ `git add Spixi/Utils/SPayments.cs`
(new, untracked).

Expect: bundle **277** · shells **18** · smoke **BASELINE OK 2823 / the 3 KNOWN
(#136 · M5 · B3)** · cs-syntax **143 + 1** · locales CLEAN.

## SEND (the wallet tab)

1. Wallet tab → Send. The compose opens IN-PAGE (not the legacy WalletSendPage).
2. Pick a contact → type an amount → the fee line shows "Calculating network fee…"
   briefly, then the real fee + total. Review enables only after the fee lands.
3. Change the recipient after a quote → Review re-gates (fee line goes pending
   again) until the new quote answers. It must NEVER show recipient A's fee for B.
4. Max (with a recipient picked) → the confirm modal → fills the send-everything
   amount. Review → the sheet shows the SAME amount + fee you approve.
5. Confirm & send → a NATIVE dialog appears showing the recipient (nickname + FULL
   address), amount and fee — from C#'s own parse. Approve → the tx broadcasts, the
   sheet morphs "Sent", the takeover closes, the pending row arrives in the activity.
6. Back out of the native confirm (Cancel) → the sheet re-enables silently, no error.
7. A bad address ("Use this address" with a typo 12+ chars) → an inline error, the
   fee never spins forever.
8. Hardware back (Android) with the compose open → closes the COMPOSE, not the
   whole conversation / not the wallet.
9. Scan (the compose scan button, and a wallet-tab QR scan of a `:send` code) →
   fills the recipient into the compose. Nothing auto-sends.

## RECEIVE (inverted, #527)

10. Wallet tab → Receive. The screen is REQUEST-FIRST: the amount input + the
    contact multi-select are visible by default. NO QR on the main screen.
11. "Show my address" → a bottom sheet with the QR, the full address + copy, Share,
    and the "What is this address?" explainer — ONE surface.
12. Request an amount → tick contacts → Send request → the request messages go out,
    a toast confirms, the screen closes.

## IN CHAT

13. Attach (⊕) → Pay → the send compose opens with the PEER locked (no picker, no
    ✕). Same native confirm chain. A sent-funds bubble appears in the chat after.
14. Attach → Request → the amount sheet (peer known) → a request-out card appears.
15. The request-out card carries **Cancel request** → confirm → the bubble is
    removed on BOTH ends (the receiver's copy goes too). It does not come back on
    reopen.
16. An INCOMING payment request → **Pay** acts in place (native confirm) + a
    **Details** link (the native payment view). NO Decline button (v1).
17. Group / bot chats: no Pay/Request in the attach sheet (C# rejects them there).

## ACCOUNT

18. Account → Security & privacy → "Confirm payments" toggle exists.
19. Turn it ON → next Send/Pay asks for biometrics (Android/iOS) after the native
    confirm, before signing. On Windows: plain native confirm, no biometric (matches
    the app lock).
20. Turn it OFF → a LockPage auth appears FIRST (weakening a security setting costs
    an auth). Cancel the auth → the switch snaps back ON.

## Regression watch

- Old-behavior sanity (`?mobile=1` browser preview is fine for layout): the compose,
  receive, request, cancel all render.
- The three demos (`wallet.html`, `desktop.html`, `chat.html`) still work — Max in
  the demo (static fee) fills; Request CTA hugs on desktop.

## Commit

`git add Spixi/Utils/SPayments.cs` + the tree. Commit as ONE batch (#522–#531).
The money-path delta must go to the BE engineer (security-review §1c/§1d) before
this ships to users (#232).
