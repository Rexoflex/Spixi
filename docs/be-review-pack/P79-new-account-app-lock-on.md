# P79 · A NEW OR RESTORED ACCOUNT STARTS WITH APP LOCK ON (batch defaultsb, item 1)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| LOW (a stronger default; an existing account is not touched) | no key, no password; the stored wallet password (L8, `WalletPassStore`) is not changed | none: no verb, push, argument, cap, `spixi.*` key; +1 int pref `flagDefaultAppLockOn`; +1 fixed log line `[DEFAULTS] new account: applock=<0\|1> pay=<0\|1>` (shared with P80) | `SpixiFlags.DefaultAppLockOn` (absent = ON; a stored 0 acts only in dev mode); OFF = today: the key is removed | 4 min |

**Look here first:** `DefaultsRules.writeNewAccount` (`Spixi/Utils/DefaultsRules.cs`) and its two callers in
`Spixi/Pages/Launch/LaunchPage.xaml.cs`: the create body (directly after `Preferences.Default.Remove("lockenabled");`,
inside `if (Node.generateWallet(pass))`) and `applyRestorePrefs` (directly after its `Remove("lockenabled")`).
`App.isLockEnabled()` now returns `DefaultsRules.lockEnabledStored()` — the same body, moved.

**DECISIONS:** #1750 (Damir, main chat) · #1312 · #1478 · #1640 (built by a Claude Fable 5.2 sub-agent; read by fresh
Fable 5.2 readers) · this batch #1790, #1791, #1794.

## What changed and why
- **Why.** Ruling #1750: a wallet app opened with no password by default. New and restored accounts get App lock On; an
  EXISTING account keeps today's behaviour, also when it never stored a choice — no update turns the lock on (a user who
  forgot the account password would be locked out).
- **The change.** Two inserted statements, one per path where an account becomes real (create; restore — the account
  zip and the bare wallet file both run `applyRestorePrefs` after the wallet VERIFIED, the A-13 boundary). The value is
  the FIXED `true`; no WebView value reaches the call. A wrong restore password returns before `applyRestorePrefs`: it
  writes nothing. "Delete account" clears every preference, so the next create writes On again.
- **Readers unchanged.** Every reader of `lockenabled` (`App.isLockEnabled` and its callers, `SettingsPage.onLoad`) still
  reads an absent key as Off. No start, update or migration path writes it (pin `d3`).
- **Unlock fallback.** A device with no screen lock and no fingerprint: Plugin.Fingerprint returns `NotAvailable`, the
  lock shows the Spixi password form; `doUnlock` verifies against the wallet FILE (`LockPage.xaml.cs:485`). Windows: the
  form only (WinUI skips the prompt). ⚠ D-1 (inherited): such a device also shows an "Authentication Failed" alert before
  the form at each lock; reported, not changed (#1794).

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| An existing account is locked by an update | no reader changed; only the create and restore sites write | csh `lock_absent_reads_off`; pin `d3` (no new writer of `lockenabled`) |
| A WebView sets the default | the call takes only switch values, a platform predicate and a C# constant | pin `d1` (exact call text), `d9` (no bridge word in the rules file) |
| A failed restore changes the lock | the write sits inside `applyRestorePrefs`, which runs only after the verify | `docs/defaultsb-mechanisms.md` § 1; pin `d2` (LaunchPage = the base + two lines) |
| A write throws and the create stops | each write has its own `try`; the type name only is logged | csh `a_failed_write_does_not_escape` |
| Switch OFF is not the old path | `writeNewAccount(false, …)` writes nothing; the caller's `Remove` stays | csh `switch_off_*`; pin `d11` (start value `false`) |

**Side effects (facts):** Android 13+ hides the recents screenshot while App lock is On (#461, legacy). The spare chat
page is not kept over a short sleep with the lock on (`keepSpareAtSleep`, perfb1 P-11, legacy rule). ⚠ C# UNCOMPILED:
`LaunchPage.xaml.cs`, `App.xaml.cs` (Windows compiles in `redesign-ci`; Android in Damir's build).
