# P36 · HISTORY LOCK · Delete all history and delete all downloads ask for the app lock first (Session Safety S-6, CH3)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| MEDIUM (two final, all-data deletes acted on a bare verb from the Settings WebView; `ixian:deletea` already had the lock) | no (history and downloads; the wallet is untouched) | no new verb; 2 existing verbs now present `LockPage(true)` first; fixed log lines; 1 pref; dev: 1 switch name on `ixian:devflash:` | built behind flag `SpixiFlags.HistoryLock` (default ON) · ⚠ UNCOMPILED for MAUI until the Safety build | 3 min |

**Look here first:** `Spixi/Pages/Settings/SettingsPage.xaml.cs:1920` `deleteAllBehindLock(bool history)` and its two callers `:517` (`ixian:deleteh`) · `:545` (`ixian:deleted`); the reference gate `:510-516` (`ixian:deletea`).

**DECISIONS:** #1312 · #1322 (F1: only `EventArgs<bool>(true)` acts) · #1465 (the dials) · **#1469 (this change)** · #1470 (#46, S-7) (Session Safety; Safety Dials, Damir 2026-10-16: S-6 = build, both verbs). Mechanism: `docs/safety-mechanisms.md` row S-6; the BE ask in `docs/security-review-for-be-engineer.md` §2 row CH3 ("`deleteh` is not LockPage-gated like account/wallet deletion").

## What changed and why
- **Before.** `ixian:deleteh` → `onDeleteHistory()` at once; `ixian:deleted` → `onDeleteDownloads()` at once. The only step was the shell's own JS sheet — a script in the Settings WebView (Windows DevTools, before O-02 only the mini app lost them) could send the verb with no sheet.
- **Flag ON: the `deletea` shape.** Each verb calls `deleteAllBehindLock` (`:1920`): `new LockPage(true)`, `authSucceeded` += a handler that acts ONLY on `e.Value == true` (`:1933`), `pushModalLoaded(lockPage)` (`:1962`, #229 load-then-present on the root nav). The Cancel leg raises `false` and changes nothing. The work is posted twice (`:1937-1939`, as `onDeleteAccount` does: the raise runs inside the lock's WebView navigation callback; the alert the work shows must land after the lock closed). A throw in the posted work is caught, type only (`:1953-1956`).
- **Downloads converge.** The Downloads screen's "Delete all" sends `ixian:deleted` THEN `ixian:loadDownloads`, so its list was answered before the lock showed; after a success the page re-pushes the list (`loadDownloads(false)`, `:1950`, no rescan).
- **Double taps.** A second verb while a lock for it is up is ignored, one fixed warn (`:1923-1926`). The latch is a `TickCount64` stamp (`historyLockUp` / `downloadsLockUp`, `:1916-1917`), not a bool (#46 r1 R2 MINOR-3): a latch older than 120 s (`DeleteLockLatchMs`, `:1918`) no longer blocks; it is cleared at the raise (either outcome, `:1932`) and when `pushModalLoaded` throws (`:1964-1968`).
- **The shell after Cancel.** The shell closed its own sheet when it sent the verb (`ctrl.done()`), so a Cancel leaves the Delete data / Downloads screen as it was, nothing pending, no spinner.
- **Flag.** Int pref `flagHistoryLock` (`SpixiFlags.cs:27`, `:81`, `:139`), absent = ON, a stored 0 acts only in dev mode; in the `[FLAGS] … historylock=… …` line. OFF = act at once (today). Dev switch `ixian:devflash:historylock:<0|1>`.

## Files
- `Spixi/Pages/Settings/SettingsPage.xaml.cs:510-516` the reference (`deletea`) · `:517-530` `deleteh` · `:545-556` `deleted` · `:1901-1915` the why · `:1916-1918` the latch · `:1920` `deleteAllBehindLock` · `:1971` `onDeleteHistory` (unchanged).
- `Spixi/Utils/SafetyRules.cs:259` `needsLock`.
- `Spixi/Utils/SpixiFlags.cs:27` · `:81` · `:109` · `:139`.
- Pin `scripts/pins-safety/d-lock-win.mjs` (S-6: s6branches · s6latch · s6gate · the deletea reference); csh `SafetyRulesTests.dialog_name_and_confirm_line` (`needsLock`).

## Bridge surface
| Verb / push / sink | Args (shape) | Who can send it | Handler | Ours / reshaped |
|---|---|---|---|---|
| `ixian:deleteh` · `ixian:deleted` | none (exact match) | settings.html → SettingsPage (trusted shell) | `:517` · `:545` → `deleteAllBehindLock` | reshaped: `LockPage(true)` first, act on success only |
| `ixian:devflash:historylock:<0\|1>` · push `setFlagsDevSafety` | one digit · six digits | dev.html → DevPage (dev mode only) | `DevPage.xaml.cs:141` · `:410` | ours (dev surface) |
| log `SettingsPage: a delete-all lock is already up - the verb is ignored` · `SettingsPage: delete-all after the lock threw (<Type>)` · `SettingsPage: the delete-all lock did not present (<Type>)` | fixed words + a type name | C# | `:1925` · `:1955` · `:1967` | ours |

## Threat → rule → proof
| A script in the Settings WebView could try… | What stops it | Proof |
|---|---|---|
| send `deleteh` / `deleted` with no user step | the lock first; only `true` acts | pin `d-lock-win` (s6branches: the lock before the act, OFF = the direct call; s6gate: the success-only guard) |
| a lock Cancel that still deletes | `if (e == null \|\| !e.Value) return;` | pin `d-lock-win` (s6gate) |
| stack two locks with a double tap | the 120 s latch per verb | pin `d-lock-win` (s6latch) |
| a stuck latch (a lock dropped without a raise) blocks the verb until restart | the latch expires after 120 s; cleared when the present throws | pin `d-lock-win` (s6latch) |
| (flag OFF) | at once, as before | pin `d-lock-win` (s6branches) |
| (worst case) | a user who unlocks still deletes everything — that is the verb's purpose | — |

## Recorded, not fixed (#46 r4)
- **R6 NIT-6** the 2-minute latch can expire while the first lock is still up (a slow unlock or a slow delete); a later verb then opens a second lock. Each lock still acts only on its own success. Walk row.

## Cost
None at runtime beyond the lock page the user already knows from Delete account.

## How to switch it off
Developer mode on → Developer › Release flags → "Delete all history or downloads asks to unlock (Safety S-6)" off → restart.

## Question for BE
Should every other all-data delete (none known today) follow the same rule — lock first, success only (yes / no)?
