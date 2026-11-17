# P61 · WINDOWS: ENTER ALONE NO LONGER APPROVES A MINI-APP ACTION — THE THREE CONFIRMS USE THE SAFE-DEFAULT DIALOG (batch fixb2, item 4b)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (the confirm answers yes in fewer cases; what each yes approves is unchanged) | the confirms gate a signed answer that leaves the device | none: no verb, push, cap, `spixi.*` key; +1 int pref (`flagMiniAppConfirmSafeDefault`); the log line is shared with P60 | built, switch ON · ⚠ C# UNCOMPILED (Windows arm) | 10 min |

**Look here first:** the three `#if WINDOWS` conditions in `MiniAppPage.handleAction`
(`Spixi/Pages/MiniApps/MiniAppPage.xaml.cs`); the entry `SConfirm.askPlainSafeWinAsync` (P60).

**DECISIONS:** #1633 · #1640 · this batch: #1697, #1699.

## What changed and why
- **The change.** Windows only, switch `SpixiFlags.MiniAppConfirmSafeDefault` ON and `NativeConfirm` ON: each of the
  three `if (!await displaySpixiAlert(<same args>))` conditions becomes `if (!await (useSafeDialog(…) ?
  SConfirm.askPlainSafeWinAsync(<same args>) : displaySpixiAlert(<same args>)))` with the OLD block under it (each
  preprocessor arm is a whole statement for the syntax check); `#else` = the base lines byte for byte. OFF = the old
  call.

## What each confirm approves (unchanged — traced by the builder; for the reviewer)
| Site | Commands | Done BEFORE the dialog (legacy) | YES approves | NO |
|---|---|---|---|---|
| 1 | `extendName`, `registerName`, `updateCapacity`, `updateName` (`transferName` / `allowSubnames` never reach it: `processAction` returns null → "Unknown action") | a RegName tx built AND SIGNED; update / capacity also sign a checksum with the private key (`MiniAppActionHandler.cs`) | the HTTP POST of `{tx, txid, id}` to the mini-app-supplied `responseUrl` | `return` |
| 2 | `sendPayment` | a Normal tx to the mini app's recipients (+ relay fee entries) built and signed | `responseUrl` empty → `IxianHandler.addTransaction` (broadcast) + `SpixiAppSdk.ar`; else the HTTP POST of the signed tx | `sendActionRejected(c, id, "rejected")` |
| 3 | every other command that reaches it (in practice `auth`) | the service challenge signed with the primary private key | the HTTP POST of `{challenge, publicKey, signature, id}` | `return` |
No confirm: `ds` (network data send), `getStorage` / `setStorage`.

## Recorded, not changed
- D-1 costs (#46 r1 S MINOR-2): while a mini-app confirm holds the gate, every other Spixi alert is DROPPED (an
  OK-only alert for good; a two-button alert answers false — every one in the tree is safe on false). A dialog error
  now goes to the no-branch (`return` / `"rejected"`) instead of the outer catch's `sendActionRejected(…, e.Message)` +
  the error alert. A second action asked while one is up is refused at once (was queued).
- The text sits in a scroll viewer (P59 Q-1): a long `nick` or JSON answer stays reachable.
- #46 r2 S2 m-3: a mini app times its own confirm, and the 600 ms rule is not on this path (nor at the base). With the
  focus step the keys now reach the dialog for certain: a user who is pressing keys in the mini app could move the focus
  from Cancel to OK (Tab, or arrow keys if the command row has XY navigation) and press it — the same class as "Tab to
  OK + Enter", and not worse than the base (there Enter alone said yes). Walk row W-4 tries the arrow keys; the 600 ms
  rule for these sites is a candidate for a later batch.
- **Legacy risks seen on these paths (NOT ours, NOT changed; for `docs/be-review-pack/legacy-not-ours.md`):** (1) mini-app
  actions SIGN before the confirm; the dialog only gates what leaves; (2) sites 1 / 3 show raw JSON; name actions carry
  a mini-app-supplied fee recipient and amount that the dialog does not show; (3) `sendPayment` shows only the FIRST
  recipient and amount, no fee, an unsanitised nickname, no latch and no auth step on any platform; (4) `responseUrl` has
  no scheme / host check; (5) `addTransaction(tx, tx.toList.Keys.Skip(1).ToList(), …)`; (6) the catch logs the raw
  action and shows it in an alert; (7) `handleAction` is `async void` with no in-flight latch.

## Proof
pin `scripts/pins-fixb2/d-pay-confirm.mjs` APP-OFF (the non-Windows view = the base bytes), APP-ON (three sites, same
arguments, exact shape), APP-AFTER (the rest of `handleAction` and the file hash to the base), WINDOWS-ONLY · csh
`FixB2PayTests` · walk rows W-4 (cancel keys only; no action is approved in the walk).
