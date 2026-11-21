# P80 · A NEW OR RESTORED ACCOUNT STARTS WITH CONFIRM PAYMENTS ON — ANDROID, IPHONE, MAC (batch defaultsb, item 3)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| LOW (a stronger default; the send path is not changed) | no signing change; `SPayments.cs` and `SConfirm.cs` are byte-identical to the base | none: +1 int pref `flagDefaultPayConfirmOn`; the log line of P79 | `SpixiFlags.DefaultPayConfirmOn` (absent = ON; a stored 0 acts only in dev mode); OFF = today: nothing written | 3 min |

**Look here first:** the same two call sites as P79; the payment arm of `DefaultsRules.writeNewAccount` writes
`SPayments.PAYMENT_AUTH_PREF` (`paymentauth`) = `true` only when the switch is on AND `SPayments.paymentAuthSupported()`
(not WinUI: Windows has no Confirm payments row and does not change).

**DECISIONS:** #1750 · #1312 · #1478 · #1640 · this batch #1790, #1792, #1794.

## What the user gets, and what does not change
- After the NATIVE confirm of a send (Fix batch 2, unchanged), the phone asks for the PIN, pattern or fingerprint
  (`SPayments.confirmAndAuth`: `paymentAuthEnabled()` → Plugin.Fingerprint with device-credential fallback).
- **No screen lock and no fingerprint on the device:** `IsAvailableAsync(true)` is false → `return true` after the
  native confirm (`SPayments.cs:631–633`): a send is never sent without the native confirm and never blocked for ever.
- **With a credential:** a cancel stops this send only; an exception → `false` (fail closed for this send). Turning the
  setting Off costs a `LockPage(true)` auth, which falls back to the Spixi password.
- An existing account without a stored value still reads Off (`paymentAuthEnabled` = `Get(…, false)`, unchanged).

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| The send path changes | `SPayments.cs` / `SConfirm.cs` not edited | pin `d8` (byte-identical to `14ae57f2`) + the Fix batch 2 pins (unchanged) |
| Windows gets a key that no row shows | `paySupported` is `paymentAuthSupported()` | csh `pay_not_supported_writes_no_paymentauth` |
| An existing account changes | no new reader or writer of `paymentauth` but the two sites | pin `d3` |

**Side effect (fact):** on Android a PIN / pattern prompt is `ConfirmDeviceCredential`, a separate activity: the send
pauses the app and the pause lock goes up under it; with the 1-minute delay (P81) a return within a minute pops it
without a second ask (with 5 s it asked again after a slow PIN).
