# P03 · WALLETPASS · The wallet password: changing it, the cleartext copy, the backup

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH | yes — the wallet password (plaintext in a URL and in Preferences) | yes | shipped (change-password fixes, backup exclusion) · planned (L8 SecureStorage) | 7 min |

**Look here first:** `Spixi/Pages/Settings/SettingsPage.xaml.cs:608` — the plaintext `walletpass` preference is moved to the new password only after `writeWallet` (:579) AND the new password is proven to open the wallet (:591). If this order were wrong, the next cold start would open with the wrong password = locked out.

**DECISIONS:** #341 · #346 · #545 · #804 · #807 · #909 · #1165 · #1245 · #1281 · #1293 · #1300 · #1312

## What changed and why
- Change password moved into the Account pane: `settings.html` sends the legacy `ixian:changepass:` verb to SettingsPage, and C# answers with a new push `setEncPassResult` (#341).
- Baseline bug fixed on both hosts: the change re-encrypted the wallet but left the old `walletpass`, so the next launch failed and backups mixed two passwords. Both hosts now set it after the verify, inside a try that never logs the URL (#341, #804).
- `sharedpref` (which holds the plaintext `walletpass`) is out of Android cloud backup and device transfer, a narrowing of legacy (#1300). The `waletpass` typo is gone (#1245), and the wipe clears all preferences (#545).
- PLANNED, not built: L8 (the plaintext-password fix) moves `walletpass` to SecureStorage in Session 16. Plan: verify-then-remove migration, a lost key → the retry screen, never a plaintext fallback, own #46, BE signs off (#909, #1300).
- Review finding MAJOR #8 (inherited, NOT fixed on purpose): `HttpUtility.UrlDecode` form-decodes `+` → space in every password path. The app is self-consistent, but the real password is not what the user typed. Do not fix the transport without a migration (#346, #807).

## Files (verified at 387ca78b)
- `Spixi/Pages/Settings/SettingsPage.xaml.cs:319` — the whole URL is form-decoded (MAJOR #8); the same at `EncryptionPassword.xaml.cs:34`, `LaunchPage.xaml.cs:150`, `LockPage.xaml.cs:428` (#346).
- `Spixi/Pages/Settings/SettingsPage.xaml.cs:575` — exactly 3 parts and new password ≥ 10 chars, or refuse (#341).
- `Spixi/Pages/Settings/SettingsPage.xaml.cs:629` — `setEncPassResult` 1 / 0 / 2; no native alert, nothing echoed (#341).
- `Spixi/Pages/Settings/EncryptionPassword.xaml.cs:83` — legacy host, same write → verify (:86) → set (:88) (#341).
- `Spixi/Meta/Node.cs:413` — the cold-start read of the plaintext preference (`App.xaml.cs:375`; a failure → `LaunchPage("retry")` :383). Legacy (#909).
- `Spixi/Pages/Launch/LaunchPage.xaml.cs:1087` — retry `proceed` caches the typed password BEFORE it is checked (legacy; a wrong value stays on disk) (#909).
- `Spixi/Platforms/Android/Resources/xml/backup_rules.xml:47` — `<exclude domain="sharedpref" path="." />`; the same at `data_extraction_rules.xml:33,61` (#1300).

## Bridge surface
| Verb / push | Args (shape) | Who can send it | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `ixian:changepass:` | `<DELIM>old<DELIM>new`, plaintext, unencoded, DELIM = `--1ec4ce59e0535704d4--` | settings.html (SettingsPage, Account pane; renders peer download names = partly untrusted) | `SettingsPage.xaml.cs:527` | reshaped: legacy grammar, NEW host (O-40) |
| `ixian:changepass:` | same | settings_encryption.html (EncryptionPassword, own WebView; opened by `ixian:encpass` at `HomePage.xaml.cs:1280` / the `SettingsPage:497` fallback) | `EncryptionPassword.xaml.cs:56` | reshaped: the handler now sets `walletpass` |
| `setEncPassResult` | `<"1" changed \| "0" wrong old \| "2" unusable>` | → settings.html | `SettingsPage.xaml.cs:629` | ours |
Mini-app WebViews cannot send it (MiniAppPage has its own verb list). No push ever carries a password.

## Threat → rule → proof
| A hostile … could try… | What stops it (`file:line`) | Proof |
|---|---|---|
| a throw on the change path puts both passwords in `ixian.log` (iOS handler logs the whole URL; DevPage shares the log) | try opens before the Split, and the catch logs the exception only (`SettingsPage.xaml.cs:568`, `EncryptionPassword.xaml.cs:77`) | smoke "★★ #804: on BOTH changepass legs the try opens BEFORE the password Split…" |
| failed `writeWallet` + moved preference = lockout at the next start | verify the new password first (`SettingsPage.xaml.cs:591`) | smoke "★ #341 review MAJOR-1: the write is CONFIRMED before the cached password follows it…" — device proof owed |
| compromised settings WebView re-encrypts with "" | ≥ 10 chars and the old password checked in C# (`:575`, `:577`) | smoke ENC_MIN mirror assertion (`split_url[2].Length >= 10`) |
| Google backup / device transfer carries `wallet.ixi` + its plaintext password | `sharedpref` excluded (`backup_rules.xml:47`) | pin `scripts/pins-s14/a1-backup-back.mjs` (`dev_preferences` in the sensitive list) |
| password left in the parked Account WebView | the shell scrubs its three fields on leave and park | smoke "back scrubs the fields before leaving (SECURITY §5)" + gate O-40 PIN 5/5b |

## Given up / left open
- L8: `walletpass` is still plaintext in Preferences on every platform today. The iOS plist still rides iCloud backup, which Session 16 closes (#1300).
- O-40 accepted: the password travels in a navigation URL in a second, long-lived WebView (#1293).
- MAJOR #8: `a+b` and `a b` open the same wallet, and `wallet.ixi` shared by `backupWallet` opens only with the decoded form in another Ixian tool (#346).
- After a Google restore, `wallet.ixi` arrives without `walletpass`, so the retry screen asks once. Theme, lock and notification settings start fresh (#1300).
- ⚠ Contradictions: `docs/security-review-for-be-engineer.md` §A1 still calls the `sharedpref` backup "a deliberate keep" and lists old write-site lines, but #1300 excluded it. SECURITY.md §5.2 says `walletpass` is never cleared, but the wipe clears it (#545, #1245). Gate row O-40 says "⛔ OPEN", but #1293 accepted it. #1165 puts cleartext `walletpass` in v1.1; the later #1300 moves it into Session 16. The security review has two different "MAJOR #8" entries (mini-app XHR in §1, form-decode after §A1).

## Question for BE
L8: on a SecureStorage read failure at cold start, is "show the retry screen, ask the password, write it to SecureStorage again" the behaviour you want, or must it never re-ask?
