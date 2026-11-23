# Handoff 2026-11-23 (Lock batch) — the Android lock flash, no alert with no screen lock, the second clock of the lock delay; #46 CLEAN at round 3 (MAJOR 2 · 0 · 0); delivered by #1546

Read this FIRST, then DECISIONS #1915–#1925. Number block of this session: #1915–#1934 (used: #1915–#1925; #1926–#1934 stay
empty) · lessons L283–L288 (used: L283–L287; L288 stays empty) · packets P97–P101 (used: P97–P99; P100–P101 stay empty).
Rulings used: Damir's #1825 (1)–(3) and #1838. Lead Claude Opus (#1612). The main chat writes the next prompt.

## 0 · State
- Branch: `work/lockb` · base `redesign/frontend` @ `23c9c495` ("Merge pull request #25 from Rexoflex/work/docsb2"; the session
  started on `462ba3e4` and merged the moved base with a merge commit, no rebase) · delivery by #1546: the session pushed the
  branch; Damir opens the pull request from the compare link in the status doc; merge = Damir (a merge commit, #1505).
- CI (`redesign-ci`): runs on the pull request that Damir opens; the main chat or the session reads it.
- Smoke: `BASELINE OK — 7019 / the 2 KNOWN (#136 · B3)` on the merged tree (cloud twin + Ixian-Core @097341a, jsdom 29.1.1,
  `TZ=America/Los_Angeles`) · delta +19 = `pins-lockb/a-shell` 9 + `pins-lockb/b-csharp` 10 · CSH `pass=898 fail=0` (= 866 + 32).
- Checks: `build-shells --check` ✓ · `build-locales --check` ✓ · `cs-syntax-check` 291 ✓ (3 known grammar skips) · the FULL
  pipeline ran (only `lock.html` of the built html changed).
- Review: CLEAN at round 3 (MAJOR 2 · 0 · 0) · brief `docs/review-brief-lockb.md` § 5 · models: lead Claude Opus 5.5; builders Opus (items 1 + 2, the
  fixes), Sonnet (the shell, the pins, the re-bases), Claude Fable 5.2 (item 3); readers a fresh Fable 5.2 security-only reader
  every round + fresh Opus readers.
- ⚠ C# UNCOMPILED: `Spixi/App.xaml.cs`, `Spixi/Pages/Launch/LockPage.xaml.cs` (the next build is the first compile; CI compiles
  Windows; Android at the walk; iPhone / Mac not yet). `LockShellRules.cs`, `LockClockRules.cs`, the `LockbFlags` block compile
  and run in csh.
- Definition of done: `docs/release-readiness.md` row WK-LOCKB added (OPEN: the walk).
- Still owed: the walk (Windows + Android) · the first compiles · the questions #1920, #1921.

## 1 · What this session did
| Item | Result | Switch | Evidence | MC item |
|---|---|---|---|---|
| 1 the Android lock flash (#1795) | the pause lock holds its form while the deferred prompt waits (`setAuthPending` `"True"` / `"1"`, two values every shell already ignores) and is released by `"1"` at a return after a stop, by `releaseHold` at a return with no stop / a failed pop / a lock that did not present; an un-animated pop | `HoldWhileDeferred` | #1916, P97, csh `LockShellTests`, pins `pins-lockb/a-shell`, `b-csharp`, the Chromium render | `n-20261117-android-applock-screen-cascade` |
| 2 D-1 (#1794) | no "Authentication Failed" alert for `NotAvailable` / `Denied` | `NoAlertNoCredential` | #1917, P98, csh R4 | `n-20261121-lock-nocred-alert` |
| 3 R1-1 (#1796) | the lock delay also on Android `ElapsedRealtime`; only more locks | `SecondClock` | #1918, P99, csh `LockClockTests`, pin b1 / b2 | `n-20261121-lock-wallclock` |
Mechanisms (written before the code): `docs/lockb-mechanisms.md`. Contract: `docs/contract-lockb.md`.

## 2 · Walk
Sheet `docs/walk-lockb.md` = the Artifact "Spixi Lock batch — walk rows" (https://claude.ai/artifact/SK86JZ3oEPx8NaKtP6bcmw):
Windows W-BUILD, W-1, W-2, W-END; Android A-BUILD, A-1 … A-7, A-END (A-6 on an emulator or a spare phone only). The BUILD rows
read `[FLAGS] lockb hold=1 noalert=1 clock=1`, which only this build writes. The Android rows end with App lock Off and the
phone's time automatic.

## 3 · Open
| For | Point | Blocks |
|---|---|---|
| Damir | 🟡 #1921: the Apple twin of the second clock — (A) `clock_gettime_nsec_np(CLOCK_MONOTONIC)` by P/Invoke · (B) keep the wall clock on Apple for v1 · (C) `systemUptime` (ruled out: it stops in sleep) | the Apple phase |
| Damir | 🟡 #1920: the own-intent return is measured on the wall clock (inherited) — a twin in a later lock batch? | nothing |
| a later batch | the first-notice Moment sheet of #1825 (4) (the page batch, #1838) | nothing |
| the next batch that owns `lock.html` | 🟡 #1924: the one-line shell guard for the inherited pre-`boot()` `"False"` edge | nothing |
| a later batch | the round-3 NITs recorded in `docs/review-brief-lockb.md` § 5 (an early reveal on a late post after a NEW pause lock; two App comments; the b10 message text; a1 / a7 and `setInterval`; the #454 slice comment) | nothing |

## 4 · Lessons (also in docs/lessons.md)
L283 (stage files outside the tree while the baseline smoke reads it) · L284 (a new page state in values an older page already
ignores; per instance, not a global carrier) · L285 (an override that may only add a lock, by its shape) · L286 (a negative-reading
guard also stops a wrapped subtraction; a failed read must read "outside") · L287 (list every `DateTime.Now` on the lock paths).

## 5 · Repo commands for Damir (PowerShell, one line at a time, no `&&`)
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/lockb
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull --ff-only
```
- Windows: wipe `Spixi\obj` + `Spixi\bin`, then **F5**, never `dotnet build` (#663). Android: wipe both, then the Release dev build
  (`docs/walk-lockb.md`). After the walk: paste the results in the main chat. Merge on GitHub (base `Rexoflex/Spixi` → `redesign/frontend`).
