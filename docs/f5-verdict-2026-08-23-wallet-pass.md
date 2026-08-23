# F5 verdict — the wallet pass (#522–#531), Damir, 2026-08-23 night

**PASS.** Windows **19/20** · Android **20/21** · 2 fails, BOTH already scheduled:

- **#9 (Android) FAIL** — wallet-hero scan of an `addr:ixi` QR offers ADD CONTACT
  instead of composing a payment. Root cause verified (`processQRResult` routes only
  `:send` payloads to the compose). Fix = overnight **W-e** (+ **W-f**: a known
  address auto-picks the contact).
- **#19 (Windows) FAIL** — "Confirm payments" ON changes nothing on Windows (no
  biometric backend; the confirm shows regardless). Damir's call: HIDE the toggle on
  Windows. Fix = overnight **W-g** (platform-gate the cap push; amends #525).

n/a as designed: #8/#9 Windows (no hardware back / Android-first scan), #21 Android
(browser demos). Everything else green on both platforms, including the full money
chain (#5), the freshness re-gate (#3), the request lifecycle (#13–#17) and the PA1
auth round-trip ON Android (#19-A, #20 both).

Additional screenshot findings from the same walk (CSS/routing polish) →
`docs/f5-findings-2026-08-23-wallet-pass.md` (Batch W, runs FIRST overnight).

**Consequence: the batch is COMMIT-READY.** The two fails block nothing (one is a
polish routing, one is a hide) and both land tonight.
