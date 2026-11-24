# P98 · NO "AUTHENTICATION FAILED" ALERT WHEN THE PHONE HAS NO SCREEN LOCK (batch lockb, item 2)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| LOW (one alert is not shown; the password form opens as before) | none | none | `LockbFlags.NoAlertNoCredential` (`flagLockNoAlertNoCredential`, absent = ON; a stored 0 acts only in dev mode); OFF = the alert after every not-authenticated prompt | 3 min |

**Look here first:** `LockPage.SetResultAsync` (`Spixi/Pages/Launch/LockPage.xaml.cs`): not authenticated →
`revealPasswordForm()` (unchanged) → the alert only when `LockShellRules.alertAfterPrompt(LockbFlags.NoAlertNoCredential,
result.Status.ToString())` is true. R4 is false ONLY for the exact enum names `NotAvailable` and `Denied` (ordinal).

**DECISIONS:** #1794 (D-1: Plugin.Fingerprint returns `NotAvailable` with no UI when the device has no screen lock and no
biometric) · #1825 (2) (Damir: option A, no new text) · this batch #1917.

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| The lock opens without the password | nothing here unlocks: the form still needs the Spixi password, checked against the wallet file (`doUnlock`) | pin `b-csharp` b4 (the alert call is the only line inside the new `if`), b7 |
| A real failure loses its alert | every other status (Failed, Canceled, TooManyAttempts, UnknownError, FallbackRequested, Unknown, a null, another case) keeps the alert | csh `r4_every_status`, `r4_through_enum_to_string` |

Platforms: Android, iPhone, Mac (the plugin path); Windows never calls the plugin (`SKIP: WinUI`) — no change. ⚠ C#
UNCOMPILED: `LockPage.xaml.cs`. The enum names were checked against the plugin's upstream source, not the 3.0.0-beta.1 package.
