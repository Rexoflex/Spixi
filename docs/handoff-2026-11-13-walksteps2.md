# Handoff 2026-11-13 (Walk steps 2) — the adb walk has seven new steps; scripts only, no app file changed

File name: `docs/handoff-2026-11-13-walksteps2.md`. Read this FIRST, then DECISIONS #1550–#1553. Number block of this
session: #1550–#1559 (used: #1550–#1553; #1554–#1559 stay empty) · lessons L179–L183 (used: all five) · no review
packets. The main chat gives the next block; it writes the next prompt.

## 0 · State
- Branch: `work/walksteps2` @ "Session Walk steps 2: seven new steps for the adb walk (scripts only)" · base:
  `redesign/frontend` @ "Merge pull request #4 from Rexoflex/work/docs-2026-11-13" (`7c195242`) · delivery by #1546:
  the session pushed the branch; Damir opens the pull request with the compare link (status doc
  `claude/session-walksteps2-status.md`) · merge = Damir (a merge commit, #1505), after the main chat has read `redesign-ci`.
- CI (`redesign-ci`): not run at the time of this commit — Damir's pull request starts the first run (budget: 2 runs).
- Smoke: **not run: no app file changed** (no shell, no C#, no file under `Spixi/`, `src/`, `.github/`). CSH: not run.
- Checks (Windows PowerShell 5.1.26100 on Damir's PC; the cloud container had no PowerShell — the install was refused
  by the session's permission policy): parse check 0 errors and 0 bytes above 127 in both scripts · the new and the
  base parser give the same `summary.csv` on a copy of the old run `20261112-1919` · the parser proofs (§ 1) · the
  secrets grep on every file of the commit · "no app change" (`git diff --stat` = `scripts/device/**` + docs).
- Review: **CLEAN at r4** — four security-only rounds, each by ONE fresh read-only Claude Opus reader at high effort
  (#1533); MAJOR 1 → 1 → 1 → 0; the round-4 MINOR and three NITs are recorded, not fixed (§ 5) · brief
  `docs/review-brief-walksteps2.md` (verdict + SHA256 in § 5) · models: lead Claude Opus · driver build: the lead
  (Opus) · parser build and the three fix rounds: Sonnet · reviewers: four fresh Opus instances.
- ⚠ C# UNCOMPILED: none (no C# touched).
- Files of the commit: `scripts/device/adb-walk.ps1`, `scripts/device/adb-walk-parse.ps1`, `scripts/device/a52s.json`,
  `DECISIONS.md`, `docs/decisions-index.md`, `docs/lessons.md`, `docs/status-log.md`, `CLAUDE.md`,
  `docs/handoff-2026-11-13-walksteps2.md`, `docs/review-brief-walksteps2.md`, `docs/commit-message-walksteps2.txt`.
- Definition of done: no `docs/release-readiness.md` row changed.
- Still owed: **operator block 2** (the two full runs of #1530 on the final files, about 80 minutes; the line is in the
  status doc) and the 5-repeat numbers · `-Apk` and `-KillRenderer` never ran on the phone (no new build was needed: the phone still had the
  Release dev build installed on 2026-11-12 16:24) · the image-chat step waits for the image seed of `perfb1` · the
  cold start moved from 2.2 s to 3.6 s on the same install (§ 4) · the recorded items of § 5.

## 1 · What the session did
| Item | Result | Evidence |
|---|---|---|
| Phone state (operator block 1) | The installed build = the Release dev build of 2026-11-12 (`lastUpdateTime` 2026-11-12 16:24, 0.9.22 / 160009220; `pkgFlags` shows DEBUGGABLE — not read on 2026-11-12, so not a difference); app lock off; light theme; dev seed "heavy" loaded again; Do not disturb on; chat appearance put back to "Meadow" / bubble "Auto" (the home walk had changed it; the chat probes need it); the rating sheet answered "Not so much" (it blocked every cold start) | `calibrate-20261113-1726`, `-1730`; L179 |
| Lines first (L170) | Every line the new rows read exists today; none had to be invented | `calibrate-20261113-1730/cal-log.txt`; #1550 |
| Seven new steps + `scroll-image` | Built, tried on the phone (`20261113-1814`, `RESULT: NO DATA in 3 rows` = only `scroll-image`, as designed) | #1550, #1551 |
| Parser proofs | One line removed from a copied log → "no data" in exactly the rows that read it, exit 2, for each of the 7 new steps; the old run gives a byte-identical `summary.csv` | `_scratch/ws2/checks-out.txt`; #1551 |
| r6-1 / r6-2 / r6-3 of batch `tooling` | Fixed, read in all four rounds | #1552 |
| Full walk, two runs back to back (block 2) | **OWED.** The first try (18:27, 18:28) halted at coldstart 3/5 on the rating sheet (L179); after the sheet was answered and the review was CLEAN, Damir was away and block 2 did not run in this session. The reviewed files stay in Damir's PC tree, so the line of the status doc runs as it is | `20261113-1827`, `-1828` (halted); #1553 |

How to run (Damir's PC, PowerShell; phone on USB, unlocked, screen on; one line each):
```
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\scripts\device\adb-walk.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\scripts\device\adb-walk.ps1" -Steps resume-now,resume-3s -Repeats 5
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\scripts\device\adb-walk.ps1" -Steps chatinfo,tab-apps,tab-wallet,tab-account,history
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\scripts\device\adb-walk.ps1" -Steps scroll-image
```
- The full walk now takes about 36 minutes (the old steps about 16, the new ones about 20).
- `scroll-image` needs the key `"imageChatAddress": "<address>"` in `Claude outputs\adbwalk\walk.local.json` — the
  address of the image seed chat that session `perfb1` builds (its handoff names the seed index; the address comes from
  `addressFor(i)` in `Spixi/Utils/SDevSeed.cs` like the other seed addresses). It must be a dev-seed chat, never a real
  contact. Without the key the step is "no data", exit 2. It keeps no screenshot.
- `history` uses seeds 5..9 (Seed 06–10, 1000 messages each): with `-Repeats` above 5 it runs out of seeds ("no data").
- **Operator rule (r4-1):** after a walk that stopped during a tab step (Ctrl+C, a closed window, an adb error), start
  the next run with the default step list or with `coldstart` first (a cold start lands on Chats).
- Before a full walk after any by-hand use of the phone: one `-Calibrate` run and a look at `cal-01-home.png` (L179).
- The operator rule of the tooling handoff for r6-1 (no non-rooted TEMP / `-Apk`) is no longer needed (#1552).
- Fallback lines if `-Apk` fails: `adb install -r <the signed APK>`; never `adb uninstall`, never `pm clear`.

## 2 · Walk
No walk sheet: this batch changes no app file and adds no walk row (★ #1472: exempt by Damir's word, #1538).

## 3 · Proposed next steps (the main chat decides)
Outcome: speed batches 1a, 1b and 1c can judge chat info, the tabs, history to the top and the resume tap on the
phone the same day, without a walk sitting.
1. The main chat reads `redesign-ci` on the pull request; Damir merges (a merge commit, #1505).
2. Budgets of #1517 that this batch makes measurable: "chat info open" (a main-chat row sets it from the numbers in
   `claude/device-numbers-2026-11-13.md`) and "history to the top" (today it fails its pass bar: see the numbers).
3. Speed batch 1a: P-11 picks its switch by `resume-now` / `resume-3s` (#1536); the image seed of `perfb1` switches on
   `scroll-image` (one local key).
4. A proposal for the session that owns the chat shell: a dev-only `[P1]` line for the scroll position kept across a
   history page (the "visible jump" of the history budget has no line today; a new line is an app change and a gate row).
5. A later small tooling batch (with its own reader): r4-1 (the tab tap inside the `try`; a `TabUp` flag answered by
   `Restore-Phone`), r4-2..r4-4.

## 4 · Open questions and dials
| For | Question (with its options) | Blocks |
|---|---|---|
| Main chat / Damir | The cold start of the same install moved from 2.2 s (2026-11-12) to 3.6 s (2026-11-13), most of it before the first managed log line (`am start` → `Starting Spixi`: 0.6 s → 1.65 s); power saving off; the home walk had changed the TEST account. Options: (a) take today's runs as the new before-numbers for every budget and record why the old ones moved as unknown; (b) one check by hand (a phone restart, then one `-Steps coldstart` run) before batch 1a measures; (c) let batch 1a find the mechanism (#294) as its first device job | The cold-start budget of #1517 (its before-number) |

## 5 · Recorded, not changed
- Round 4 (recorded, NOT fixed: a fix would need a fifth reader): r4-1 (MINOR: a tab tap whose own adb call fails, or
  Ctrl+C during a tab step, can leave Wallet in front for a later run that starts without coldstart — the operator rule
  of § 1) · r4-2 (after a failed cal-11 the restart gives a new pid, so `cal-log.txt` loses the earlier lines) · r4-3
  (two header sentences) · r4-4 (cal-11 restarts the app also when no tab tap went out).
- Everything recorded in `docs/review-brief-tooling.md` § 5 holds, except r6-1 / r6-2 / r6-3 (fixed, #1552).
- `-Apk` and `-KillRenderer` were not run: no install was needed and #1538 does not hold a `-KillRenderer` try.
- The pre-check screenshots (`shot-<step>-NN-pre.png`) are not listed in `summary.md`; they stay in the run folder.

## 6 · Lessons (also appended to docs/lessons.md)
- L179: look at `cal-01-home.png` of a fresh `-Calibrate` run before a full walk; one-time sheets of the TEST account
  halt the run (#1550).
- L180: a screenshot kept as calibration evidence is a leak path near wallet and account views; gate on the app's own
  log lines, delete failed PNGs, restart into a known screen (#1550).
- L181: a new staged file name for every copy into the PC tree (L174 again).
- L182: a device number of another day is no baseline (#1553).
- L183: without a PowerShell interpreter in the cloud, prove the scripts on the target with one check-script line (#1551).

## 7 · Repo commands for Damir (PowerShell, one line at a time, no `&&`)
The pull request (#1546): open the compare link of the status doc, check that the page shows "base repository:
Rexoflex/Spixi", "base: redesign/frontend" and "compare: work/walksteps2", paste the title and the description, then
"Create pull request". After the merge:
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git status -sb
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull
```
Nothing to build and nothing to walk for this batch.
