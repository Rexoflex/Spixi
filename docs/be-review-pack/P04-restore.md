# P04 · RESTORE · Restore, backup, create, account wipe

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH | yes — wallet file moves/deletes, the wallet password over the bridge, plaintext `walletpass` | yes | shipped | 8 min |

**Look here first:** `Spixi/Pages/Launch/LaunchPage.xaml.cs:922` — the #565 rehome loop turns names from the backup ARCHIVE into real paths BEFORE `verifyWallet` (`:938`); this fence plus `isPlainRelativeEntry` (`:1041`) is all that stops a zip-slip out of `tmp_zip` (a folder planted at `wallet.ixi` is caught later by `RestoreMoves`).

**DECISIONS:** #243 · #334 · #348 · #391 · #399 · #545 · #565 · #614 · #805 · #928 · #1245 · #1246 · #1281 · #1293 · #1297 · #1300 · #1303 · #1307 · #1311

## What changed and why
- Launch Create / Restore / Retry are one LaunchPage + `intro.html`; dispatch is anchored on the verb, the three password parses are kept byte for byte (#334, #391).
- Restore is all-or-nothing: `RestoreMoves` preflights, treats an existing `wallet.ixi` as a conflict, parks stale targets in `tmp_restore_prev`, rolls back on any throw; the real own avatar travels as `own_avatar.jpg` (#1297, #1307).
- Hardening: zip-slip fence on the rehome loop, password verbs fenced so a throw never logs the URL, prefs written only after the wallet verifies, restore refused while a wallet is loaded (#348, #565, #805, #1245).
- Delete account = one ordered full wipe behind LockPage auth (node down first, wallet + balances, `Preferences.Clear`, `wipeLocalState`); O-04 also clears `spixi.*` at launch with no wallet file and after create (#545, #1297, #1303).
- Android backup and device transfer no longer carry `sharedpref` (plaintext `walletpass`) or `tmp_restore_prev` (#1281, #1300).

## Files (verified at 387ca78b)
- `Spixi/Pages/Launch/LaunchPage.xaml.cs:302` — `ixian:restore:` branch: refused while a wallet is loaded (W14) `:321`, legacy `Split` parse `:336`, `runFencedVerb` `:340` (#348, #805).
- `Spixi/Pages/Launch/LaunchPage.xaml.cs:905` — rehome loop; refuses non-plain names `:913`, both paths under `fenceRoot` `:922`, only then `CreateDirectory`/`Move` `:929` (#805).
- `Spixi/Pages/Launch/LaunchPage.xaml.cs:970` — `RestoreMoves.plan/apply`; `applyRestorePrefs` `:1000` + `Node.loadWallet` `:1001` run after `Done`, not rolled back (#1245, #1307).
- `Spixi/Utils/RestoreMoves.cs:87` — existing wallet = `WalletConflict`, nothing touched; `:93` drops a leftover stash; `:125` `RollbackIncomplete` keeps the stash (#1297, #1307).
- `Spixi/Pages/Launch/LaunchPage.xaml.cs:133` — O-04 `wipeLocalState` when no wallet file; `:577` after `generateWallet` (#1303).
- `Spixi/Pages/Settings/SettingsPage.xaml.cs:437` — `ixian:deletea`/`ixian:delete` → LockPage auth; `:1546` bails on `e.Value` false; `:1634` `wipeEverything`, restore leftovers `:1666` (#545, #1297).
- `Spixi/Pages/Settings/BackupPage.xaml.cs:381` — account backup encrypted with `Preferences["walletpass"]` (legacy); `:376` `own_avatar.jpg`; `:309` `setLastBackup` (#928, #1297).
- `Spixi/Platforms/Android/Resources/xml/backup_rules.xml:47` + `data_extraction_rules.xml:33`/`:61` — `sharedpref "."` excluded; `AndroidManifest.xml:7-8` wires both (#1281, #1300).

## Bridge surface
| Verb / push | Args (shape) | Who can send it | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `ixian:restore:<pass>` | `<password, URL-decoded>` | `src/shells/launch.html` → `Raw/html/intro.html`, LaunchPage; no peer content | `LaunchPage.xaml.cs:302` | reshaped: moved from LaunchRestorePage, anchored + fenced + W14; parse legacy (L2) |
| `ixian:create:<nick>:<pass>` · `ixian:proceed:<pass>` | `<nick>:<password>` · `<password>` | intro.html → LaunchPage | `:268` · `:349` | create: first-`:` slice (#334); proceed moved from LaunchRetryPage; both fenced, L2 |
| `ixian:view:<v>` · `ixian:launchoverlay:<0\|1>` | view word clamped to 4 · `<int 0\|1>` | intro.html → LaunchPage | `:216` · `:210` | ours (#399, #614) |
| `ixian:reportTranslation:<code>` | `<lang code>`, checked against shipped codes | intro.html → LaunchPage (also settings.html) | `:231` → `S9FixRules.cs:205` | ours (#1246) |
| `ixian:backupAccount` · `ixian:backupWallet` | none | settings_backup.html → BackupPage; NEW host settings.html → SettingsPage `:786`/`:793` | `BackupPage.xaml.cs:67`/`:71` | reshaped: second host (#243) |
| `ixian:deletea` · `ixian:delete` | none | settings.html → SettingsPage (renders peer download names) | `SettingsPage.xaml.cs:437` | reshaped: both = full wipe behind auth (#545) |
| push `setLaunchView` · `launchBack` | C#-fixed view word · none | C# → intro.html | `LaunchPage.xaml.cs:121` · `:457` | ours (#391, #614) |
| push `wipeLocalState` | none | C# → intro.html (`:135`, `:577`), settings.html (`SettingsPage.xaml.cs:1640`) | `src/shells/launch.html:347` removes `spixi.*` + `HTML5_QRCODE_DATA` only | ours (#545, #1303) |
| push `setLastBackup` | `<unix seconds \| "">` | C# → settings_backup.html / settings.html | `BackupPage.xaml.cs:309` | ours (#928) |
Relocated unchanged: `introload` `accept` `avatar` `error` `selectfile` `language:` (whitelisted file). No restore/backup/wipe verb in `MiniAppPage.xaml.cs`. No WebView string reaches a file path: C# names `wallet.ixi.tmp`, `tmp_zip`, `tmp_restore_prev`.

## Threat → rule → proof
| Attacker could try… | What stops it | Proof |
|---|---|---|
| A crafted backup (attacker chose its password) plants `..\wallet.ixi\x` to escape `tmp_zip` or make `wallet.ixi` a folder | `isPlainRelativeEntry` + `fenceRoot` before any FS op (`LaunchPage.xaml.cs:913`, `:922`) | smoke "★★ gate 14 THE WALK" + "★★ gate 14 WHITELIST" |
| A crafted backup overwrites the live wallet | wallet-loaded refusal (`:321`) + `WalletConflict` (`RestoreMoves.cs:87`) | csh `S15RestoreTests.an_existing_wallet_is_a_conflict_and_nothing_moves`, `a_wallet_folder_from_a_crafted_backup_is_a_conflict_too` |
| A disk fault mid-restore leaves a half account | preflight, park, reverse rollback (`RestoreMoves.cs:110`) | csh `a_failure_in_the_middle_rolls_everything_back`, `an_incomplete_rollback_keeps_the_stash_and_says_so` |
| A throw in a password verb writes the URL (the password) into the shared `ixian.log` | `runFencedVerb` logs verb name + exception type (`LaunchPage.xaml.cs:400`) | smoke "★★ gate 15 THE WALK" |
| A compromised settings.html wipes the account | wipe runs only after LockPage auth, `e.Value` (`SettingsPage.xaml.cs:1546`) | no pin found — walk only |
| A new account inherits the old `spixi.*` store | O-04 push (`LaunchPage.xaml.cs:135`, `:577`) | `pins-s15/a-restore.mjs` "★ S15 O-04" |

## Given up / left open
- L2: create / restore / proceed / unlock carry the password in the URL, form-decoded; kept, because a parse change locks out existing wallets (#391, #805).
- L8: `walletpass` is plaintext in Preferences and is the account-backup key; iOS NSUserDefaults still reach iCloud; SecureStorage move = Session 16 (#1300).
- The decrypted zip (`wallet.ixi.tmp.zip`) and `tmp_zip` exist before verify, swept by the next restore and the wipe; the next restore deletes a `RollbackIncomplete` stash (#1297, #1307).
- The "account already on this device" path offers "use a different wallet", which leads to a restore that refuses while a wallet exists — a dead option, Session 16 (#1311).

## Question for BE
Is `Node.loadWallet()` safe in-process right after a wipe and a restore (`LaunchPage.xaml.cs:1001`), or should the restore restart the node first?
