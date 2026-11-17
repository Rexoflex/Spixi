# P60 · WINDOWS: ENTER ALONE NO LONGER SENDS A PAYMENT — THE SEND CONFIRM USES THE SAFE-DEFAULT DIALOG (batch fixb2, item 4a)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (the NATIVE send confirm answers yes in fewer cases; nothing signed, sent, shown or bridged changes) | touches the confirm before a send; no key, no signing change | none: no verb, push, cap, `spixi.*` key; +1 int pref (`flagPayConfirmSafeDefault`); +1 fixed log line (shared with P61); +2 fixed `[CONFIRM]` lines of the entry | built, switch ON · ⚠ C# UNCOMPILED (Windows arm; CI compiles Windows) | 10 min |

**Look here first:** `SPayments.confirmAndAuth` (`Spixi/Utils/SPayments.cs`, the one `#if WINDOWS` statement inside
the existing `try`) and `SConfirm.askPlainSafeWinAsync` (`Spixi/Utils/SConfirm.cs`).

**DECISIONS:** #1312 · #1478 · #1633 (Damir) · #1640 (built by a Claude Fable 5.2 sub-agent; read by other fresh
Fable 5.2 readers) · this batch: #1697, #1698.

## What changed and why
- **Why.** #1652 / #1633: on Windows the send confirm was MAUI `DisplayAlert` (the send text on the PRIMARY button, no
  default button: the dialog focuses the primary and Enter presses it), and WinUI skips the auth step after it
  (`SPayments.cs` WinUI rule, the app-lock rule `LockPage:382`). So one Enter that stayed from the screen before sent IXI.
- **The change.** Windows only, switch `SpixiFlags.PayConfirmSafeDefault` ON and `SpixiFlags.NativeConfirm` ON
  (`FixB2Rules.useSafeDialog`): the SAME four arguments (title, body with the amount, the recipient and the fee from
  C#'s own parse, the send text, the cancel text) go to `SConfirm.askPlainSafeWinAsync` in place of
  `page.displaySpixiAlert`. The entry holds the ConfirmGate (one native confirm app-wide; refused → false, logged
  `[CONFIRM] plain busy`), shows P50's dialog with P59's focus step (Cancel = the default Close button; only Primary is
  yes) and answers false on every fault. `ok = alertTask != null && await alertTask;`, the auth step, its WinUI rule,
  the order confirm → auth → send, the latch, the callers (`handleSignSend`, `handlePayRequest`, `confirmTip`): all
  byte-identical (pin PAY-REST hashes the rest of the method and of the file against the base).
- **Switch.** Int pref `flagPayConfirmSafeDefault` (absent = ON; a stored 0 acts only in dev mode,
  `S16PassRules.effectiveFlag`). OFF (or `NativeConfirm` OFF) = today's `displaySpixiAlert` call. Logged once at start:
  `[FLAGS] payconfirmdefault=<0|1> appconfirmdefault=<0|1>` (every platform; the switch acts only on Windows; read it
  together with the Safety line, which shows `NativeConfirm`). No Developer-screen control (#1635 (3)).
- **D-1 (lead decision, #1697): the entry HOLDS the gate.** Our dialog is outside MAUI's alert queue; a MAUI alert that
  opens over it would throw in MAUI's `async void` handler and stop the app (P50's known limit). Holding the gate makes
  `displaySpixiAlert` DROP other Spixi alerts while the confirm is up, as P35 / P50 do for the destructive confirms.

## Recorded, not changed (#46 r1; every one moves an outcome only toward Cancel)
- R MINOR-1: an alert that is up (or counted between the Send tap and the confirm, e.g. the peer-timed "bot not ready"
  alert) makes the send answer `cancel` at once; at the base the MAUI alert queued and then showed. The shell reads
  `cancel` as "the user backed out". Walk row: Send again works.
- R MINOR-2 / S MINOR-1: the gate has no time bound (L157, P35): a dialog task or a counted alert that never completes
  refuses every later payment confirm on Windows until a restart (`SPayments`' 120 s latch self-heal no longer bounds
  this arm). After a latch steal (> 120 s) a second payment answers `cancel`, not `fail`.
- R NIT-1: the catch of `confirmAndAuth` is dead on the ON arm; a dialog error logs `[CONFIRM] the dialog failed
  (<type>)` instead of `SPayments confirm failed: <message>`.
- R NIT-2: dev mode only — with this switch 0 and the mini-app switch on, a mini-app confirm holding the gate drops the
  payment's alert → `cancel`.
- R NIT-3 / P50: a direct MAUI alert outside `displaySpixiAlert` (`BackupPage.xaml.cs:231`) while the confirm is up
  would stop the app (nothing sent); the same class as P50.
- Inherited (not ours): no 600 ms rule and no app-lock check on the payment confirm; Tab to Send + Enter confirms.

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| Enter / Space / Esc / a closed dialog sends | Cancel is the default (Close) button with the keyboard focus; only Primary is yes | P59 · csh `FixB2PayTests.only_the_confirm_button_is_yes` · walk |
| The text, the amount or the recipient changes | the same four argument expressions in both arms | pin `d-pay-confirm` PAY-ON |
| Anything else in the payment path changes | one statement; the rest of the method and file hash to the base | pin `d-pay-confirm` PAY-OFF, PAY-REST (22 deliberate breaks by reader R) |
| A second dialog or an error says yes | the gate refuses; every fault → false | pin `d-pay-confirm` ENTRY · csh `plain_confirm_holds_the_gate_like_a_confirm` |
| Other platforms change | `#else` = the base call; the non-Windows view equals the base bytes | pin PAY-OFF |
| A fifth caller uses the entry unseen | an exact per-file count of the bare names | pin `d-pay-confirm` WINDOWS-ONLY (#46 r1 S MAJOR-1) |

## Files
`Spixi/Utils/SPayments.cs` · `Spixi/Utils/SConfirm.cs` (the entry) · `Spixi/Utils/SpixiFlags.cs` ·
`Spixi/Utils/FixB2Rules.cs` (item-4 span) · csh `scripts/csh/FixB2PayTests.cs` · pin
`scripts/pins-fixb2/d-pay-confirm.mjs` · re-based `pins-fixb1/a-confirm.mjs`, `pins-fixb1/g-sparekeep.mjs`,
`pins-perfb1/f-flags.mjs`, `pins-s16/b-l8.mjs`, `pins-v1am/c-csharp.mjs`, `pins-safety/c-confirm.mjs`.
