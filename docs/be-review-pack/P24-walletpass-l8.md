# P24 · WALLETPASS-L8 · The wallet password moves from plaintext Preferences to SecureStorage

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH | yes — the wallet password at rest | yes — 1 dev verb + 1 dev push; no user verb changed | shipped behind flag `SpixiFlags.SecureWalletPass` (default ON) · Mac not walked | 7 min |

**Look here first:** `Spixi/Utils/S16PassRules.cs:150` — `coldStart`, the one decision. Flag ON reads the plaintext only to migrate it (`:158`). The secure leg (`:188`) returns null on a miss, timeout or error → `Node.loadWallet` false (`Spixi/Meta/Node.cs:412`) → the retry view (`Spixi/App.xaml.cs:412`). There is no plaintext fallback.

**DECISIONS:** #909 · #1165 · #1300 · #1312 · #1321 · #1323 · #1325 (L8 replaces the "planned" lines of P03)

## What changed and why
- Same key `walletpass`, now in MAUI SecureStorage (its own container). Flag read ONCE in App() (`App.xaml.cs:248`), before `new Node()`.
- Flag OFF = legacy plaintext. A cold start with no plaintext copies a secure value back and removes the secure copy only after the plaintext reads back equal (`S16PassRules.cs:199`).
- Dev toggle `ixian:devflash:securepass:<0|1>`: DevPage only, stored only with dev mode on, acts at the next start. A stored 0 acts only while dev mode is on (`S16PassRules.cs:35`); `ixian:disableDevMode` removes it (`HomePage.xaml.cs:1816`).
- Migration = verify then remove: secure write → read back → ordinal compare → only then the plaintext goes. Any failure keeps the plaintext and opens with it.
- Flag ON never writes plaintext (`S16PassRules.cs:232`). A failed write removes only a plaintext that DIFFERS from the verified new password (`:262`).
- Every write stores a password that opened the wallet: create, restore, the retry `proceed` (verify FIRST; legacy cached it before the check), both changepass legs.
- Clear: the wipe (`Preferences.Clear` does not reach the secure container) and a start with no wallet file (the iOS Keychain survives an uninstall; no wait on the UI thread).
- Backup reads through the store and refuses unless the password opens the wallet; both callers show a native "Backup not made" alert. No new push.

| Platform (MAUI 10.0.71) | Store | What we do about it |
|---|---|---|
| Windows (unpackaged) | `securestorage.dat`, DPAPI scope LOCAL=user; Get / Set await on the caller's SynchronizationContext; the save is not atomic | every call in `Task.Run` + `ConfigureAwait(false)`, every wait bounded (`S16PassRules.cs:19`: cold 3000 · set 2000 · read-back 1000 · remove 1000 ms) |
| Android | EncryptedSharedPreferences; `Remove` is synchronous | one gate for all calls (`WalletPassStore.cs:28`); the read-back catches a silent Set |
| iOS / Mac | Keychain; default AfterFirstUnlock rides iCloud / encrypted backups; survives an uninstall | `AfterFirstUnlockThisDeviceOnly` (`WalletPassStore.cs:272`); no-wallet start clears |

## Files (verified at the S16 tree)
- `Spixi/Meta/WalletPassStore.cs:45` prefetch (flag ON + wallet file + no plaintext) · `:67` readForColdStart · `:105` write · `:139` clear.
- `Spixi/Utils/SpixiFlags.cs:23` — `init`: a read that throws keeps both flags ON.
- `Spixi/Pages/Launch/LaunchPage.xaml.cs:605` create · `:721` applyRestorePrefs · `:1005` / `:1082` restores open with the verified pass · `:1092` proceed verifies → `:1116` stores.
- `Spixi/Pages/Settings/SettingsPage.xaml.cs:615` and `Spixi/Pages/Settings/EncryptionPassword.xaml.cs:90` — changepass, after `isValidPassword(new)`; a store failure still answers "1" (the wallet IS re-encrypted).
- `Spixi/Pages/Settings/SettingsPage.xaml.cs:1729` wipe clear · `Spixi/App.xaml.cs:394` no-wallet clear (no wait).
- `Spixi/Pages/Settings/BackupPage.xaml.cs:357` read + refuse · `:104` alert; `SettingsPage.xaml.cs:804` second caller.
- Log lines: `[FLAGS] securepass=<0|1> mediagate=<0|1>` · `[L8] store=<secure|legacy> read=<hit|miss|timeout|error> ms=<int> migrated=<0|1>` · `[L8] migrate kept plaintext (<word>)` · `[L8] write failed (<word>)` · `[L8] … failed / threw (<Type>)` · `Backup refused: …`. Never the value or its length (`S16PassRules.cs:107` safeWord).

## Bridge surface
| Verb / push | Args (shape) | Who can send it | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `ixian:devflash:securepass:` | `<0\|1>` exact | `dev.html` → DevPage only; stored only with `devMode` on | `DevPage.xaml.cs:71` | ours (#1323) |
| push `window.setFlagsDev` | `<0\|1>,<0\|1>` (stored values) | C# → dev.html | `DevPage.xaml.cs:232` | ours |
| `ixian:backupAccount` | none (unchanged); a refusal now alerts natively | settings.html · BackupPage | `SettingsPage.xaml.cs:793` · `BackupPage.xaml.cs:67` | reshaped (no new push) |
No password is pushed into a WebView. `ixian:changepass:` is unchanged (P03).

## Threat → rule → proof
| A hostile … / a failure could … | What stops it | Proof |
|---|---|---|
| read the plaintext from a backup or the prefs file | secure store; ThisDeviceOnly; plaintext removed after a verified copy | pins `scripts/pins-s16/b-l8.mjs` L8-a, L8-h · csh `S16PassTests.migrate_success_removes_plaintext_after_the_verified_copy` · `S16StoreTests.store_migrates_then_removes_the_plaintext` |
| make a failing secure store fall back to plaintext | the secure leg has no plaintext read | csh `S16PassTests.secure_leg_never_falls_back_to_plaintext` |
| a failed migration loses the only copy (lockout) | plaintext kept on ANY failure | csh `S16PassTests.migrate_failures_keep_the_plaintext_and_still_open` · `S16StoreTests.store_failed_migration_keeps_the_plaintext` |
| deadlock the UI thread on Windows DPAPI | `Task.Run` + bounds | b-l8 L8-f, L8-g · csh `S16StoreTests.store_cold_bound_only_for_the_prefetch` |
| store a wrong password from the retry view | verify first | b-l8 L8-b, L8-c |
| a backup encrypted with "" or a stale password | refuse + alert | b-l8 L8-e |
| a home.html script turns the flag OFF | DevPage-only verb + dev mode; a 0 is inert without dev mode | b-l8 FLAGS-i, FLAGS-j · csh `S16PassTests.flag_zero_acts_only_in_dev_mode` |

## Given up / left open
- A lost or unreadable key, or a timeout = the retry view asks the password once and stores it again. A store that always fails = the retry view at every cold start.
- Mac: no MacCatalyst entitlements file; if the Keychain needs one, every secure write fails. Measured on the walk (rows: migrated=1, a fresh create, a backup after a change).
- Windows unpackaged: DPAPI LOCAL=user means any process of that user can decrypt; a crash during the non-atomic save = a read error → the retry view.
- Flag OFF reverse copy: its plaintext re-read proves the in-memory Preferences copy, not the disk (dev-only path).
- `BackupPage.backupAccount` still returns true after a later exception (pre-existing) → "Backed up" with no alert.
- MAJOR #8 form-decode (`+` → space) unchanged (P03).

## Question for BE
On a SecureStorage read failure at cold start, is "show the retry view, ask the password, store it again" acceptable (the P03 question) — and after your yes, do we keep or delete the flag-OFF path (legacy plaintext + reverse copy)?
