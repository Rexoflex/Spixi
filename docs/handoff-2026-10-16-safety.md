# Handoff 2026-10-16 — Session Safety (mini-app paths · Android share roots · native confirms · the history lock · the Windows mini-app marker)

Read this FIRST, then DECISIONS #1464–#1470 (end of DECISIONS.md). Next free number for ANY line: **#1471** (Perf-R reserved #1314–#1319 stays reserved). Lessons next **L160**. Review packets next **P38**. Mission Control session `safety`; next in order `perfm`.

## 0 · State
- Base: `redesign/frontend` @ "Session 20I Drop D" (`562366e4`) = origin. This session = ONE patch `session-safety.patch` on top of it (message `docs/commit-message-session-safety.txt`; no attribution lines). Damir applies, commits and pushes.
- Smoke (cloud twin): **BASELINE OK 6295 / the 2 KNOWN (#136 · B3)** · CSH **506** (+31: SafetyRulesTests, SafetyAppTests, ConfirmGateTests). Pins `scripts/pins-safety/a-miniapp.mjs`, `b-share.mjs`, `c-confirm.mjs`, `d-lock-win.mjs` (loaded by smoke after s20i). Gates green (`build-locales --check`, `verify-locales` — the id-id `groundBlueGradient:Spixi` token failure is pre-existing at the base).
- C# (⚠ uncompiled for MAUI until the walk build — csh compiles SafetyRules, ConfirmGate, MiniApp, MiniAppManager, MiniAppStorage over stubs): SafetyRules (new) · ConfirmGate (new) · SConfirm (new) · SpixiFlags · SpixiContentPage (displaySpixiAlert) · MiniApp · MiniAppManager · MiniAppStorage · MiniAppActionHandler · AppNewPage · Android SFilePicker · Android SFileOperations · MainActivity · provider_paths.xml · SingleChatPage · ContactDetails · SettingsPage · Windows WindowsWebViewHandler · DevPage. Shells: contact_details.html (`cancelled`), dev.html (six switches), settings.html / settings-shell.js (comments only).
- Six flags (absent = ON; a stored 0 acts only in dev mode): `SafeAppId` · `SafeStorage` · `SafePick` · `NativeConfirm` · `HistoryLock` · `WinAppMarker`; one `[FLAGS] safeappid=… winappmarker=…` line; dev switches on the Developer page. S-4 has no flag (an XML resource).

## 1 · What this session did
| Item | Result | Row |
|---|---|---|
| Owed by S20I | the Mac ships in v0.9.30 → Mac save + Mac camera = launch blockers | #1464 |
| Mechanism pass + dials | `docs/safety-mechanisms.md` (9 / 9 C# proofs, 14 / 14 verb slices); worst: the install catch deleted the whole Spixi folder for id `../..`. Dials: q1 A (chat + chat info native confirm, flag ON; home keeps its sheet = D5) · q2 park nickname prompt · q3 A roots · q4 A O-02, park C-12 + D24 | #1465 |
| S-1 / S-2 / S-3 | mini-app paths (P33) | #1466 |
| S-4 | Android share roots + staging (P34) | #1467 |
| S-5 | native confirms (P35, m168) | #1468 |
| S-6 + O-02 | the history lock (P36) + the Windows mini-app marker (P37) | #1469 |
| S-7 + #46 | MAJOR states; #46 security-only r1 → r6 **CLEAN** (5 MAJORs found and fixed in r1–r3) | #1470 |

## 2 · Walk
- **Windows + Android:** `docs/walk-safety.md` = the Artifact **"Spixi Safety Walk"** (https://claude.ai/artifact/8J4SwZoKdGEqrA5ctEtaeg; results in its db collection `results`). Part A flags OFF, Part B flags ON. Test mini app sources in `docs/walk-safety-app/` (the PowerShell lines in Set-up (5) build `safety-walk-good/badid/case.zip` on the Desktop). ★ L149: copy the data first; TEST contact / group only.
- **iPhone + Mac:** `docs/office-walk-sheet-v1.md` § 15 (OW-S-*; incl. the MAJOR #4 Mac device check, OW-S-MAJOR4).

## 3 · Next
1. Damir: apply + commit + push the patch; walk the Artifact (W + A); the office § 15 rows at the office.
2. Record `WALK #n (Session Safety …)`; F rows mechanism first. Mission Control: `n-20261015-miniapp-trust`, `m168`, `n-20261015-deleteh-lock` → Done after the commit + walk.
3. Next session: `perfm` (Mission Control "Next").
4. Parked (after launch / v1.1): the nickname native prompt (`n-20261016-nick-prompt`), C-12 (`n-20261016-win-miniapp-partition`), D24 (`n-20261016-ats-arbitrary-loads`), mini-app signatures (m167 → v1.1), MAJOR #8 (m166).

## 4 · Open questions for Damir
- SW-S5-ENTER / OW-S5-KEY-M: which button does Enter / Return pick in the system dialog? (MAUI DisplayAlert cannot change it; recorded #46 r1 MINOR-4.)
- The steady-rhythm tap (#46 r5 MINOR): a page can time a second tap ≥ 600 ms later onto OK. A later option is "confirm only from the top page / no recent WebView tap" — after launch?

## 5 · Lessons
L156 (an install catch deletes only what this call created) · L157 (a UI gate never frees itself on a timer; fail closed) · L158 (pin paths against the runtime layout — .NET 10 Android Personal = files/Documents) · L159 (ids that become folders: compare ignoring case too; mutation runners read the whole output).
