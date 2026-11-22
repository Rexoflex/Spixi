# Handoff 2026-11-18 — Defaults batch (`defaultsb`): App lock + Confirm payments On for new accounts, the lock delay of 1 minute; the lock flash stopped with a question

Read this FIRST, then DECISIONS #1790–#1800. Number block of this session: #1790–#1809 (used: #1790–#1800; #1801–#1809
stay empty) · lessons L251–L256 (used: L251–L254; L255–L256 stay empty) · packets P79–P83 (used: P79–P81; P82–P83 stay
empty). The main chat writes the next prompt.

## 0 · State
- Branch: `work/defaultsb` · base: `redesign/frontend` @ `14ae57f2` "Merge pull request #16 from Rexoflex/work/photo1a" ·
  delivery by #1546: the session pushes the branch; **Damir opens the pull request** (the compare link and the texts are in
  the status doc `claude/session-defaultsb-status.md`) · merge = Damir.
- CI (`redesign-ci`): runs on the pull request (not run at the time of this commit).
- Smoke: `BASELINE OK 6674 / the 2 KNOWN (#136 · B3)` = 6660 + 14 (the full run after the last fix, 2026-11-21; cloud twin, Ixian-Core @ `097341a`, jsdom 29.1.1,
  `TZ=America/Los_Angeles`) · CSH `pass=781 fail=0` (= 766 + 15) · gates `build-shells --check`, `build-locales --check` ✓ ·
  `cs-syntax-check` 286 ✓.
- Review: #46 **CLEAN at r3** (#1799; 0 MAJOR in code; the r3 pin gap graded NIT by #1735 / rule 9) — `docs/review-brief-defaultsb.md` § 5 · models: lead Claude Opus; builder Claude Fable 5.2 (items 1–3 and
  the round-1 fix); Sonnet (the round-2 pin fix); Haiku (the doc line check); readers fresh Claude Fable 5.2, one at a time
  (an Opus reader for the pins was refused by the session's safety check twice and replaced by a Fable reader).
- ⚠ C# UNCOMPILED: `Spixi/App.xaml.cs`, `Spixi/Pages/Launch/LaunchPage.xaml.cs` (`DefaultsRules.cs` and `SpixiFlags.cs`
  compile in the harness). CI compiles Windows; Android in Damir's build; iOS / Mac in the Apple phase.
- New files: `Spixi/Utils/DefaultsRules.cs` · `scripts/csh/DefaultsTests.cs` · `scripts/pins-defaultsb/a-defaults.mjs` ·
  `docs/defaultsb-mechanisms.md` · `docs/contract-defaultsb.md` · `docs/review-brief-defaultsb.md` · `docs/walk-defaultsb.md` ·
  `docs/be-review-pack/P79…P81` · this handoff · `docs/commit-message-defaultsb.txt`.
- Definition of done: no row of `docs/release-readiness.md` names these defaults; none changed.
- Still owed: the walk on Windows + Android (`docs/walk-defaultsb.md`); the first compiles; the answers to the questions of § 4.

- **2026-11-22 merges (#1801):** `redesign/frontend` @ `c9d6bf64` (photo1b; ONE hand merge: the tail of `SpixiFlags.init`, the defaultsb group before `readPhoto1b();`; eight pins re-based; a fresh Fable 5.2 reader on the merged code: CLEAN; smoke BASELINE OK 6741) and then @ `1ad3a44e` (fixb3; no hand merge, no re-base). Final tree: CSH 806 · smoke 6774 rows = 6768 pass + 6 flake rows of `pins-fixb1/e-header` (green alone 3 / 3) + the 2 KNOWN.

## 1 · What this session did
| Item | Result | Evidence | Switch |
|---|---|---|---|
| 1 `n-20261118-default-applock-on` (the write) | built: create and restore write `lockenabled = true`; readers unchanged | #1791 · csh `DefaultsTests` · pin `d1`–`d4`, `d14` · P79 | `DefaultAppLockOn` |
| 2 `n-20261118-default-applock-on` (the delay) | built: 60 s on the phone and the Mac (5 s off); Windows unchanged; round-1 fix: a verified unlock clears the leaving stamp | #1793 · csh `within_grace_bounds`, `stamp_after_unlock` · pin `d5`–`d7`, `d13` · P81 | `LockDelayOneMinute` |
| 3 `n-20261118-default-confirm-payments-on` | built: `paymentauth = true` where the row exists; the send path byte-identical; no-credential case stated | #1792, #1794 · pin `d8` · P80 | `DefaultPayConfirmOn` |
| 4 `n-20261117-android-applock-screen-cascade` | STOPPED with a question: the mechanism is the shell's 3 s belt + an animated pop; the fix needs `src/shells/lock.html` | #1795 · `docs/defaultsb-mechanisms.md` § 5 | — |

## 2 · Walk
Sheet: `docs/walk-defaultsb.md` = the Artifact "Spixi Defaults batch — walk rows" (https://claude.ai/artifact/MMKhKreHViXk2MeTZPQFRe; Windows 6 rows, Android 8 rows). Result:
owed. Windows makes a new account in a second folder through `ixian.cfg` (`spixiUserFolder = …`); the native preferences
are shared, so W-9 returns the test account's App lock and password. **The test phone has no safe way to make a new
account** (L149): rows A-2 / A-3 run on an emulator or a spare phone, else N/A and they go to the launch walk.

## 3 · Proposed next steps (the main chat decides)
1. Damir opens the pull request, reads `redesign-ci`, walks the sheet, merges.
2. The answers to § 4 (the flash, D-1, R1-1) go into a lock batch with the shell (`lock.html`) after `photo1b`.

## 4 · Open questions and dials
| For | Question (with its options) | Blocks |
|---|---|---|
| Damir | **Q1 the Android lock flash (#1795):** (A, recommended) a lock batch with the shell — `lock.html` holds its spinner while C# says a deferred prompt is pending (the 3 s belt counts from the prompt's start) + an un-animated pop of the app lock, one switch · (B) a C#-only native cover over the lock for the prompt window (needs #438 MAJOR-2 "never cover a lock" lifted for it) · (C) accept the flash for v1 | item 4 |
| Damir | **Q2 D-1 (#1794):** a device with no screen lock and no fingerprint shows "Authentication Failed" before the password form at each lock. (A, recommended) skip that alert when the status is `NotAvailable` / `Denied`, no new text, in the lock batch of Q1 · (B) keep it | nothing now; UX of new users on such devices |
| Damir | **Q3 R1-1 (#1796):** the absence is measured on the wall clock; a clock set back inside the window opens a pause lock without an auth (inherited; 60 s makes it cheaper). (A) a second, sleep-counting clock (Android `SystemClock.ElapsedRealtime`) required inside the bound too, its own batch · (B) accept and record for the BE engineer (done) | nothing now |
| Damir | **Q4 (#1798):** a first notice "App lock is on" for a new user? Proposal: none for v1 (the first lock comes after a minute away and asks the password set a minute before); if wanted, a Moment sheet | nothing |

## 5 · Recorded, not changed
- Mac: Plugin.Fingerprint on Mac Catalyst is unproven for Confirm payments (R1-3); the privacy shield covers the window on
  each click away with App lock On (F-4) — Apple-phase walk notes.
- Settings: `saveSettingsCore` writes the `lockEnabled` field; a throw in `onLoad` before the read would turn a default
  Off (F-3, inherited; no such throw found).
- An unlock that completes while the app is in the background leaves no stamp; a return within 60 s of that verified
  unlock opens without an auth (F-1, the accepted dial).
- Stale "5 s" comments in `App.xaml.cs` and the `LockDelayOneMinute` docblock (names only the bound) — left so that the
  code files stay exactly as the readers read them.
- Older docs name `LOCK_GRACE_SECONDS` (`docs/be-review-pack/P01-lock.md:23`, the #496 row of the gate doc): they now mean
  `DefaultsRules.withinGrace` (said in the gate section of this batch).
