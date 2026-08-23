# Handoff — READ FIRST. State after the WALLET PASS (#522–#531, 2026-08-23).

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.**

## 0. Where things stand in one paragraph

The wallet money pass is BUILT, the #46 Opus loop ran CLEAN over 2 rounds, and it is
delivered to Damir's disk **UNCOMMITTED** with a full green pipeline: bundle **277** ·
shells **18** · smoke **BASELINE OK 2823 / the 3 KNOWN (#136 · M5 · B3)** · cs-syntax
**143 + 1** · locales **CLEAN**. The send compose is LIVE (C#-pushed caps), the fee is
a real query, the native confirm is root-routed with an optional biometric gate, the
receive screen is inverted, and request cancel rides the existing delete path.

## 1. ★ FIRST: F5, then commit

Order (the #306 rule): Damir builds + F5s per
`docs/f5-checklist-2026-08-23-wallet-pass.md` → HE commits. ⚠ **`git add
Spixi/Utils/SPayments.cs`** (new, untracked) with the batch. Build sequence:
`build-demo-bundle` → `build-shells` → `smoke-test` → wipe `obj`/`bin` (C# changed) →
build net10.0-windows → F5. Commit #522–#531 as ONE batch.

## 2. What shipped (the interview answers #522–#529, executed)

- **Send** — in-page compose→review→native-confirm→sign, replacing legacy wallet-send
  (caps-gated; old exe keeps native). W6 fee = `ixian:feeQuery` → `setSendQuote`
  (no invented fee; the review gates on a fresh per-pair quote). PA1 = a "Confirm
  payments" toggle → biometric before signing (Android/iOS; WinUI plain confirm).
- **Receive** — INVERTED (#527): request-first; QR + address + Share + explainer in
  ONE "Show my address" bottom sheet (`openAddressSheet`, the Account-reusable one).
- **In chat** — attach Pay (peer locked) · attach Request (amount sheet) · request-in
  Pay in place (no Decline, v1) · request-out Cancel → the existing delete path.
- **The ONE new C# file: `Spixi/Utils/SPayments.cs`** — the confirm+auth+sign helper.

## 3. The loop (read `docs/opus-review-wallet-pass-522-530.md`)

13 MAJOR-class fixed across 2 rounds. The two invisible-to-every-gate ones: a helper
called but never defined (compile break), and the native confirm lost on
overlay-presented pages. A round-2 fix ate its own tail (the freshness gate broke the
static-fee Max) — caught by the fresh reviewer, fixed, mutation-proven.

## 4. 🟡 Owed / carried

- **The BE money review (#232):** the delta must reach the BE engineer BEFORE this
  ships to users — `docs/security-review-for-be-engineer.md` §1c (the contract) + §1d
  (the lock-over-confirm flag, verify on device first).
- **Legacy money pages retire at the §5 repoint** (be-cutover W10) — until then they
  are the old-exe fallback and carry no PA1 gate + the WalletContactRequestPage:148
  NRE (inherited).
- **RC1** (a real cancel/withdraw protocol verb for request/invite/contact-request —
  all three, one design), **W11** (`requestFundsResponse` dropped when the chat is
  closed) — be-cutover, BE.
- **Damir's non-wallet list** stays QUEUED behind this pass: bot-group hidden members
  + Leave + add · info actions-on-top + shared groups + skeletons · delete-chat
  checkbox restyle + the remove-contact-does-not-remove data bug · missed-call
  notification persistence · delete-account full wipe (pairs with the F-3 restore
  crash) · Account-as-preloaded-peer trade-off · contacts IA move · outgoing
  timestamp/status alpha 0.7. The menu batch + request-cancel-verb question also
  queue (`docs/handoff-2026-08-25-menu-requests.md`).

## 5. Delivery rules (unchanged)

Windows + PowerShell, Galaxy on adb, Mac for iOS. Land UNCOMMITTED, full green
pipeline, ONE step at a time and WAIT, expectations OUTSIDE the pasted block with the
NUMBER to expect. Wipe `obj`/`bin` on any C# change. Bundle BEFORE shells. Tarballs
into `_deliveries/` only, `tar --overwrite`, VERIFY THE EXTRACT LANDED. `git
--no-optional-locks`; never `git add -A`; `git push` does not work from the bridge.
