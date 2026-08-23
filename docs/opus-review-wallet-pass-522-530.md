# Opus #46 loop — the wallet pass (#522–#530) → CLEAN after 2 rounds

**Batch:** the wallet money pass (send compose live, W5/W6/PA1, receive inversion,
request cancel). **Author:** fable (this session). **Loop:** 3 disjoint round-1
auditors → fixes → a FRESH break-my-verdict reviewer → 1 fix → mutation-proven.
★ The author never reviews own work; every auditor ran on the real tree.

## Round 1 — 3 disjoint auditors (C# money path · shell state machines · components + i18n)

**12 MAJOR-class + a long MINOR/NIT tail. The two headline ones were invisible to
every gate** (cs-syntax checks braces, not identifier resolution; smoke reads source):

| # | MAJOR | Fix |
|---|---|---|
| 1 | `estimateFee` CALLED, never DEFINED → CS0103, the whole batch will not compile | Added `estimateFee` + `estimateMaxAmount` (fee ladder + the two-iteration Max solve) |
| 2 | the native confirm was `page.DisplayAlert` — LOST on overlay-presented pages (every conversation), so in-chat Pay could never confirm and the latch then wedged every later money action | root-routed `page.displaySpixiAlert` (the SpixiContentPage:2536 rule) |
| 3 | a real failure with an empty message rendered as a SILENT cancel (both shells) | `'' fail → null → the component's default error copy`; only `'cancel'` is silent |
| 4 | in-chat send used `AddressPaymentFlag.Primary` → no sent-funds bubble, no P2P notify | a bare CONTACT address rides `OfflineTag` (legacy parity, SingleChatPage:480) |
| 5 | a mistyped 12+ char address wedged the compose forever on "Calculating network fee…" | every `feeQuery` ANSWERS (`error:'address'` → inline error + gate) |
| 6 | in-chat Request reported success over 5 silent C# rejections (the ⑪ delivery lie) | every rejection `displaySpixiAlert`s; amount normalization mirrored from HomePage |
| 7 | hardware back popped the WHOLE conversation instead of the money compose | `.chat-send-takeover` joined `chatOverlayLive`; `chatBack` closes it (the AND-29 class) |
| 8 | no no-answer backstop → a dropped push stranded a locked review sheet forever | the 30s `tipWait` grammar on both shells (copy does NOT claim failure — the tx may be out) |
| 9 | a STALE fee (recipient A) could display + commit for recipient B | the review re-gates on a per-pair quote ECHO (`quotedKey`/`currentKey`); `feeAtOpen` freezes one fee |
| 10 | "Confirm payments" OFF cost NO auth (weakening a security setting free) | OFF routes a `LockPage` auth (`HandlePaymentAuthOffAuth`); echo re-reads the stored value |
| 11 | request-in/out cards lost the native Details link (Pay went in-place) | `onDetails` link on both request arms |
| 12 | money verbs sat below `Contains()` branches (the #393 hijack class) | moved above; `StartsWith`+`Ordinal`+colon |

Plus: the `pendingContact` draft translations were shadowed by a legacy-reuse value
match (the #288 class) → distinct English "Request pending"; the pending tag could
never ellipsize (receive parity); the QR card overflowed the desktop dialog; the
desktop-demo CTA hug selector followed the deleted reveal; `openAddressSheet` lacked
the empty-address guard + an open latch; a11y `role=status` on the fee line; a
vacuous PIN-C(2) after the deleted reveal rule; two exact-string caps pins that
re-introduced the staleness class the same batch fixed.

## Round 2 — fresh break-my-verdict reviewer (over the FIXES)

**1 MAJOR — a fix ate its own tail, exactly the round's mandate.** The freshness gate
(#9) made the Max onClick fallback and the Max-disabled predicate DISAGREE in
static-fee mode (no `onQuote`): Max rendered enabled but did nothing. Invisible to
every gate — the demos use a static fee, every behavioural pin wired `onQuote`.
**Fixed** (one predicate, shared) + a NEW static-fee-Max behavioural pin,
**mutation-proven** (reverting the fix trips the pin). MINOR: `onChatScreenReady`
now tears down an open send cover. Everything else HELD (17 fixes re-verified).

★ Round 2 also confirmed clean by reading: the confirm-before-sign order is index
arithmetic not a windowed regex, the friend-send flag logic, the PA1-off auth
mirror, the freshness gate in every mode, the backstop teardown, the focus
containment (exempts the real `.c-sheet`/`.c-modal` it spawns), the arg-order of the
6-arg quote push, `quickScanResult`'s shared-slot handoff.

## 🟡 Flagged, NOT fixed (verify-first / BE)

- **NIT-2 (#294): the root-routed money confirm is a platform dialog above the page
  tree.** The #272 pop-the-lock mechanism is ABSENT (a `DisplayAlert` is not on
  MAUI's ModalStack), and it is legacy-parity (every `displaySpixiAlert` shares the
  class). In a narrow resume-lock race the confirm could paint over an in-place lock.
  Low severity; the belt, if wanted, is to gate `handleSignSend`/`handlePayRequest`
  on the lock-active field. → `docs/security-review-for-be-engineer.md`.
- **feeQuery signs two throwaway (discarded) transactions per call** — inherited from
  `WalletSend2Page:52`, but the frequency (debounced per keystroke) is introduced.
  Nothing broadcast; the 350ms debounce is FE-only. → security-handover-gate row.

## Final state

bundle **277** · shells **18** · smoke **BASELINE OK 2823 / the 3 KNOWN
(#136 · M5 · B3)** (+57 over the pre-batch baseline; the new money + behavioural pins
mutation-proven) · cs-syntax **143 + 1** · i18n-lint ✓ · pseudo 9/9 · locales CLEAN.
