# Opus #46 loop — BATCHES B + C + D (2026-08-24 overnight) → CLEAN after 2 rounds

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.**

**Batches:** B1/B2 (requests lifecycle, #543–#544) · C1–C5 (account lifecycle + splash,
#545–#548) · D1 (the missed-call notification, #549). **Loop:** 2 disjoint round-1 Opus
auditors (C# · shells/components/pins) → fixes → a FRESH round-2 verifier (with headless
Chrome for real layout measurement) → fixes. Reports: `opus-review-batch-bcd-r1-cs.md`,
`opus-review-batch-bcd-r1-shells.md`, `opus-review-batch-bcd-r2.md`.

## Round 1 — 5 MAJOR

| # | MAJOR | Fix |
|---|---|---|
| 1 | `NetworkUtils.isolate()` (the wipe) PAUSES the three static network managers and NOTHING ever resumed them — an in-process create/restore after a wipe spun on `paused` forever. F-3's THIRD mechanism, and the old delete-account never even isolated | `Node.connectToNetwork` heals the latch first (`resumeNetworkOperations()` — a pure flag clear, no-op when nothing was paused); verified all three callers want the network |
| 2 | B2's "the recipient's invite is removed" was false past one reload: `Friend.deleteMessage` BLANKS a row (message = ""), and the reload then pushed a nameless "Missing" invite with live Join/Decline | the blanked-invite GHOST GUARD in SingleChatPage's appSession branch (the #529 pattern: a blanked row renders NOTHING) |
| 3 | the D1 call-row cancel sat in `SingleChatPage.onResume` — which an OVERLAY conversation (#225) never receives (App.OnResume dispatches to the NavigationPage's CurrentPage only). With the sweep now sparing call rows, nothing would EVER clear them | moved to the LOAD path (runs on every open; a conversation is never parked) |
| 4 | iOS: `OneSignalNative.Notifications.ClearAll()` (app-wide) ran one line before the sparing sweep — it would erase the `call-` rows the sweep spares | dropped; the enumerated removal covers the SDK's rows too |
| 5 | the B1 guard `!f.approved` was DEAD — `approved` defaults TRUE and outgoing requests never clear it (#399, caught AGAIN) — every revoke would have answered "fail" | `f.state == FriendState.RequestSent`, the state the outgoing sites set and the row is built from |

Plus (r1): the localized confirm labels overflow (→ r2), the revoke sheds the pin, the
wipe got per-call tries + explicit `stopStorage` + the localStorage push queued FIRST, the
warm-load Account tap is claimed instead of swallowed (`claimWarmingOverlay`), the retired
`deleteWallet*` keys left all 12 drafts, demo tidy-ups.

## Round 2 — 2 MAJOR (both in the r1 fixes), 5 MINOR, 6 NIT — all addressed

| # | Finding | Fix |
|---|---|---|
| R2-1 | the M-1 wrap fix was INERT: `min-width: 0` beside `flex-basis: 0` makes the hypothetical size 0, so `flex-wrap` can never fire — measured in Chrome: the fr-fr delete-account label spilled 43px past its button | the one token deleted; measured wrapping confirmed by the reviewer |
| R2-2 | only the (non-shipping) DRAFTS were shortened; the shipped locales keep the long legacy translations | with the wrap real, the long labels are correct — they drop to their own row; drafts noted |
| R2-3 | the m-2 flush emit (`ixian:tab:tab1`) was decorative (tab1 runs no loader) AND ran the #240 overlay-exit sweep as a side effect | all three handlers set `shouldRefreshContacts` on EVERY outcome; the emit is gone |
| R2-4 | `warmPending` had no clear on non-park staging outcomes — a stuck flag made a later Account tap claim a present that never came | cleared on EVERY staging outcome + the drop paths |
| R2-5 | the optimistic "Invite canceled" toast broke the codebase's own #376 B-2 rule (the verb HAS an ack; a fail painted green then red) | the success toast waits for `cancelInviteResult ok` |

Verified clean by round 2 (executed, incl. Chrome layout): `resumeNetworkOperations`
resolves and every caller wants the network · the wipe order + 20 per-call tries ·
the ghost guard's `return` cannot skip a sibling message · the three claim/park
interleavings (no double-present, no dropped tap) · no modal pin measures geometry ·
the C5 icon bounds re-derived (39.8% × 48.0% ink, inside the safe circle with margin).

## Known residuals (recorded, not defects)

- the overflow harvester cannot see `s.KEY` aliases or `confirmAction(buildOpts())`
  indirection (r2 R2-6) — a harness improvement for a future batch;
- the 5 non-draft locales carry English for the new B/C keys (the N4 recipe — by design);
- MAJOR-4's SDK behaviour is a reading, not a device test — the F5 checklist carries it;
- `wipeAccountData()` is now dead code kept for the pin's slice bound (r2 n-2).

## Pipeline after the loop

bundle 291 · shells 18 · smoke **BASELINE OK 2996 / the 3 KNOWN** · cs-syntax **144 + 1**
(SContacts.cs is NEW + UNTRACKED — `git add` it) · locales CLEAN · overflow NO BREAKERS.
