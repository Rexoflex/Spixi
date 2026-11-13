# Handoff 2026-11-13 (Tooling) — the adb walk for the Galaxy A52s is delivered; scripts only, no app file changed

File name: `docs/handoff-2026-11-13-tooling.md`. Read this FIRST, then DECISIONS #1520–#1523. It covers Session
Tooling (2026-11-12, stopped at the review limit) and its restart Tooling R6 (2026-11-13: one review round, the
gates again, the export, the delivery). Number block: #1520–#1529 (used: #1520–#1523; #1524–#1529 stay empty) ·
lessons L170–L174 (used: all five) · no review packets. The main chat gives the next block; it writes the next prompt.

## 0 · State
- Branch: `work/tooling` (Damir makes it at delivery) · base: `redesign/frontend` @ "Merge pull request #2 from
  Rexoflex/work/docs-2026-11-12" (`30e7f24a`) · push and pull request: made by Damir AFTER this commit, with the
  guided steps of Tooling R6 — the link and the read-back of its base (`Rexoflex/Spixi` → `redesign/frontend`) are in
  the status doc `claude/session-tooling-r6-status.md` and in Mission Control · merge = Damir (a merge commit, #1505),
  after the main chat has read `redesign-ci`.
- Delivery without push access (fallback, #1511 ⑤, #1519): the PC tree, in place · commit message file:
  `docs/commit-message-tooling.txt` · ONE commit.
- CI (`redesign-ci`): not run at the time of this commit — Damir's pull request starts the first run (budget: 2 runs).
- Smoke: **not run: no app file changed** (no shell, no C#, no file under `Spixi/`, `src/`, `.github/`). CSH: not run.
- Checks: none of the `--check` gates apply (no generator input changed). Run on the scripts by Session Tooling:
  a PowerShell parse check (0 errors) and an ASCII check for both scripts; the parser's own test set in the cloud
  (PowerShell 7.4.6); the driver's dry runs against a fake adb; the real runs on the phone under Windows
  PowerShell 5.1. Tooling R6 ran no script and no phone job; it checked again: the SHA256 of the three files
  against the transfer file, the secrets grep on every file of the commit, "no app change", and the repeatability
  rule #1530 from the two `summary.csv` files of runs A and B (25 of 25 rows).
- Review: **CLEAN at r6** (#1519) — six security-only rounds, each by ONE fresh read-only Claude Fable 5.2 reader at
  high effort; 0 MAJOR in every round; MINOR 14 → 7 → 3 → 2 → 1 → 1. Round 6: 0 MAJOR · 1 MINOR · 2 NIT; its findings are
  recorded and NOT fixed (§ 5). The three script files are delivered exactly as the round-6 reader read them
  (SHA256 `88288e4d…` driver, `e2c5fcca…` parser, `0a9e647e…` map; the full hashes are in the brief § 5) · brief
  `docs/review-brief-tooling.md` · models: lead Claude Fable 5.2 · builders (2026-11-12 only): Opus (the driver),
  Sonnet (the parser), high effort · reviewers: six fresh read-only Claude Fable 5.2 instances (#1471).
- ⚠ C# UNCOMPILED: none (no C# touched).
- New files to `git add`: `scripts/device/adb-walk.ps1`, `scripts/device/adb-walk-parse.ps1`,
  `scripts/device/a52s.json`, `docs/handoff-2026-11-13-tooling.md`, `docs/review-brief-tooling.md`,
  `docs/commit-message-tooling.txt` · changed: `CLAUDE.md`, `DECISIONS.md`, `docs/decisions-index.md`,
  `docs/lessons.md`, `docs/status-log.md` (11 files) · Uncommitted work from other sessions: none. Untracked and NOT
  ours (never add): `docs/handoff-2026-09-30e.md`, `docs/ixian-agent-strategy-reference.md`.
- Definition of done: no `docs/release-readiness.md` row changed (no row names this tool).
- The main chat's rulings #1512–#1519 and #1530 are NOT in `DECISIONS.md` yet. They are in the project docs
  `claude/talk-rulings-2026-11-12.md` and `claude/talk-rulings-2026-11-13.md`; the main chat writes them in its own
  docs commit. This batch names #1519 and #1530 and does not write them.
- Still owed: `-KillRenderer` and `-Apk` were never run on the phone · the Ctrl+C restore on a Windows console, the
  `restore-pending.json` path, the TCP refusal and the lock are proven only in the dry run with a fake adb · the
  Task Scheduler entry is NOT registered (#1511 ③) · the recorded review items of § 5.

## 1 · What the two sessions did
| Item | Result | Evidence | DoD row |
|---|---|---|---|
| The adb walk (driver + parser + device map) | Built on 2026-11-12; three full runs and three check runs on the A52s gave `RESULT: OK` | `Claude outputs/adbwalk/20261112-1823`, `-1903`, `-1919` (full), `-1902`, `-2012`, `-2121` (check runs; `-2121` used the delivered files); #1520, #1523 | — |
| The first Android device numbers | Written | project doc `claude/device-numbers-2026-11-12.md` | — |
| Unverified steps of the spec | `uiautomator` cut · `am send-trim-memory` kept · `svc wifi` kept | #1523; `Claude outputs/adbwalk/calibrate-20261112-1809/tries.txt` | — |
| Parser proof (deliberate break) | A copied log with one line removed → "no data", exit code 2 | `Claude outputs/adbwalk/_scratch/break-20261112-1823/summary.md`; #1523 ③ | — |
| Repeatability | Met by the rule of #1530: runs A and B agree in 25 of 25 rows (the old rule of the spec: 20 of 25) | `claude/device-numbers-2026-11-12.md` § 3; the two `summary.csv` files, computed again on 2026-11-13 | — |
| Safety rules + the #46 loop | CLEAN at r6 (#1519); see § 0 Review | #1522; `docs/review-brief-tooling.md` § 5 | — |
| Tooling R6 (2026-11-13) | One reader round, the gates again, the export, the guided delivery. No script file changed, no phone job | this handoff; `claude/session-tooling-r6-status.md` | — |

How to use it (Damir's PC, PowerShell; the phone on USB, unlocked, the screen on; one line each):
```
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\scripts\device\adb-walk.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\scripts\device\adb-walk.ps1" -Steps coldstart,chat-tap -Repeats 2
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\scripts\device\adb-walk.ps1" -Calibrate
```
- The first line is the full walk (about 16 minutes; it turns Wi-Fi off once for 30 s and sends the app to the
  background six times; do not touch the phone). The result is `Claude outputs\adbwalk\<yyyyMMdd-HHmm>\summary.md`;
  the last console line is `RESULT: OK` or `RESULT: NO DATA in <k> rows` (exit code 0 / 2).
- Needs on the phone: the Release dev build (`-p:SpixiDevCoexist=true`), the TEST account, app lock OFF, the dev seed
  "heavy" (Account → About), light theme (the screen checks are calibrated for it), battery above 50 %, and for an
  unattended run "Do not disturb" ON (a notification of another app can otherwise be in a screenshot).
- Needs on the PC: adb on the PATH; `Claude outputs\adbwalk\walk.local.json` (local, git-ignored — Session Tooling
  wrote it; it holds the dev-seed contact addresses for the notification intent; without it the notification step is
  "no data"). Never copy that file, a pulled log or a screenshot into a project doc or the repo (#1522).
- After a layout or theme change: run `-Calibrate`, read the `cal-*.png` files, re-fill `scripts/device/a52s.json`.
- Comparing two runs (two builds, or a switch off and on): the same day, the same phone state; two runs agree when,
  for every row, the medians differ by less than 20 %, or by at most 17 ms, or by at most 1 for a count (#1530). One
  run pair shows a change of about 20 % or more. It does not show a change of 5 %.
- A session that reads the numbers: attach the folder `Spixi Rework Of Frontend`; read `summary.md` / `summary.csv`.

## 2 · Walk
No walk sheet: this batch changes no app file and adds no walk row (★ #1472: exempt by Damir's word, #1511 ①).

## 3 · Proposed next steps (the main chat decides)
Outcome: a build session can prove a speed change on the phone the same day, without a walk sitting.
1. The main chat reads `redesign-ci` on the pull request; Damir merges (a merge commit, #1505).
2. Speed B1a: measure each switch off / on as two runs. Today's device case for P-11: a chat open after 60 s in the
   background takes 286–296 ms with no spare page, against 97–114 ms with one.
3. More steps for the walk — proposals, NOT built (#1521): chat info open, the tabs (new tap points only) · a chat
   with images and a group chat (needs dev-seed data with images = a dev-only app change) · a message that arrives
   (needs a scripted peer — the cut QuIXI probe, #1509) · a longer scroll that reaches a history load · the chat
   order changed so that "first open after a start" and "Seed 01" are separated.
4. One phone sitting for the two options that never ran on the phone: `-Apk` (with the next dev build) and
   `-KillRenderer`. Each is one command; the session that needs it asks for it in its prompt.
5. The nightly run: Damir decides after two good runs (#1511 ③); the line and its warnings are in § 5.

## 4 · Open questions and dials
| For | Question (with its options) | Blocks |
|---|---|---|
| — | None from this batch. Both questions of Session Tooling are ruled: the review limit (#1519) and the repeatability rule (#1530) | — |
| Damir + BE (recorded for the main chat on 2026-11-12, no ruling taken) | Damir asked how to make the app much snappier: the research's structural ideas (history window D1, append path P-29, kept-warm pages, per-shell CSS) and, as the only radical option, a native chat list in place of the chat WebView (changes the architecture and the isolation rule for chat content) | — |

## 5 · Recorded, not changed
- **Round 6 (2026-11-13), recorded and NOT fixed by #1519** (a fix would need another reader):
  - **r6-1 (MINOR).** `Protect-Text` replaces every folder value of 4 or more characters before it masks the serial and
    the seed addresses, and it does not require the value to be rooted. A bare word there (`TEMP`, `USERPROFILE` or
    `LOCALAPPDATA` set to a relative value, or a provider-qualified `-Apk` such as `FileSystem::<word>\…`) cuts the
    mask the same way the user name did in r5-1: the reader left 44 of 48 seed characters in `walk.log` in a run with
    a fake adb on PowerShell 7 (not verified on Windows PowerShell 5.1). Windows sets no such value, the `-Apk` form
    must be typed on purpose, the word must also occur in a seed address or the serial, and the output folder is
    git-ignored. **Operator rule until it is fixed: pass `-Apk` as a plain path; do not run the walk with a
    non-rooted `TEMP` / `USERPROFILE` / `LOCALAPPDATA`.** Proposed fix for a later batch with its own reader: use a
    folder value for the replacement only when it is rooted.
  - **r6-2 (NIT).** When the delete of a local file fails, two texts still say "deleted" (the correct state is in
    `run.json` / `calibrate.json`).
  - **r6-3 (NIT).** Two header sentences of the driver are stronger than the code ("replaced by <path> in everything
    the script writes or prints": the parser's console line shows the run folder, r5 NIT 4; "force-stopped and
    cold-started": only when the coldstart step or `-Calibrate` runs).
  - The reader did not verify: Windows PowerShell 5.1, the failing branch of `Remove-LocalFile` by execution, the
    parser and the map against a round-5 copy, real adb error texts. The list is in the brief § 5.
- Recorded in rounds 2–5, with the reason in the brief § 5: the heads-up notification exposure when "Do not disturb"
  is off (r2-7) · the gap between the focus check and a tap / BACK, and the limits of `dnd` (r3 NIT 8 / 9) · a serial
  that is a sub-word of an output name (r4 NIT 4) · the stale-lock takeover race (r4 NIT 7) · no size cap on what the
  phone returns (r4 NIT 9) · the parser prints the absolute path of `summary.md` on the console (r5 NIT 4).
- The Task Scheduler line — NOT registered (#1511 ③; Damir decides after two good runs):
  `schtasks /Create /TN "Spixi adb walk (nightly)" /SC DAILY /ST 03:17 /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"<fixed copy>\adb-walk.ps1\" -Serial <serial of the A52s>"`
  Read before anyone registers it: (1) `<fixed copy>` = a folder OUTSIDE the git working tree with the three files —
  a task that points into the working tree runs the branch that is checked out at 03:17; (2) the output folder of a
  fixed copy is outside the repo and its `.gitignore`: no synced or shared folder; (3) pass `-Serial`; (4) the phone
  stays on the charger without a secure lock screen, with USB debugging authorised — the TEST phone only, with "Do
  not disturb" on; (5) "End task" or a logoff skips the restore; the next run applies `restore-pending.json`.
  Remove it with `schtasks /Delete /TN "Spixi adb walk (nightly)" /F`.
- The spec said `shell boot index`; the real line is `shell boot shell` on Android (L170). The spec text is a project
  doc and was not edited. The spec's repeatability sentence is replaced by #1530 (the main chat's row).
- `CLAUDE.md` "Conventions" still names `src/bridge/mock.js`, which does not exist (the spec § 1 found it) — not this
  batch's file area beyond "Where we are now".
- `logcat -G 16M` and `logcat -c` are lasting changes on the phone (buffer size until a reboot; the log is cleared).
- The brief § 1 names two files under `local-example/` (the shape of `walk.local.json`, the Task Scheduler note).
  They were in the readers' tree only and are not in the repo; the Task Scheduler note is the text above.

## 6 · Lessons (also appended to docs/lessons.md)
- L170: verify the shape of every log line in a real pull before writing a parser (#1520).
- L171: a device log is not "timing lines" — filter on the phone by the emitter's shape (#1522).
- L172: the WebView renderer of one app is found through `dumpsys activity services <package>` (#1520).
- L173: PowerShell 5.1 rules for device tools (#1522).
- L174: compare SHA256 after every file copy into the PC tree; operator steps read results from the folder (#1523).

## 7 · Repo commands for Damir (PowerShell, one line at a time, no `&&`)
The fallback — Damir makes the branch and the pull request (Tooling R6 guides these steps one at a time):
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git status -sb
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch -c work/tooling
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git add scripts/device/adb-walk.ps1 scripts/device/adb-walk-parse.ps1 scripts/device/a52s.json docs/handoff-2026-11-13-tooling.md docs/review-brief-tooling.md docs/commit-message-tooling.txt CLAUDE.md DECISIONS.md docs/decisions-index.md docs/lessons.md docs/status-log.md
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git diff --cached --stat
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git commit -F docs\commit-message-tooling.txt
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git push -u origin work/tooling
```
`git diff --cached --stat` must show 11 files. Then open
`https://github.com/Rexoflex/Spixi/compare/redesign/frontend...work/tooling?expand=1` and check that the page shows
only "base: redesign/frontend" and "compare: work/tooling" (inside the fork) before "Create pull request". If the
page names `ixian-platform/Spixi`: stop. Do NOT use the link that `git push` prints: on a fork it opens the pull
request against `ixian-platform/Spixi`. No number with a hash sign in the pull request text (GitHub links it to the
upstream repository, #1512). After that:
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch redesign/frontend
```
The main chat reads `redesign-ci` (about 42 minutes) and tells Damir when to merge (a merge commit, #1505). Nothing
to build and nothing to walk for this batch.
