# Handoff 2026-11-15 (Speed 1a toggle) — the adb walk sets the four speed switches by a launch intent extra; the measured sitting is next

File name: `docs/handoff-2026-11-15-perfb1toggle.md`. Read this FIRST, then DECISIONS #1615–#1618 (and Damir's rulings
#1595, #1597). Number block of this session: #1615–#1624 (used: #1615–#1618; #1619–#1624 stay empty) · lessons
L202–L205 (used: all four) · review packets P48–P49 (used: P48; P49 stays empty). The main chat gives the next block;
it writes the next prompt.

## 0 · State
- Branch: `work/perfb1toggle` · base: `redesign/frontend` @ "Merge pull request #7 from Rexoflex/work/docs-2026-11-15"
  (`a964790`; it holds "Merge pull request #6 from Rexoflex/work/perfb1") · delivery by #1546: the session pushes the
  branch; Damir opens the pull request with the compare link (status doc `claude/session-perfb1toggle-status.md`) ·
  merge = Damir (a merge commit, #1505), after the main chat has read `redesign-ci`.
- CI (`redesign-ci`): not run at the time of this commit — Damir's pull request starts the first run (budget: 3 runs).
- Smoke: `BASELINE OK — 6361 / the 2 KNOWN (#136 · B3)` · environment: cloud twin + Ixian-Core @ `097341a` · tool
  versions: jsdom 29.1.1 · eslint 10.14.0 · globals 17.14.0 · tree-sitter 0.25.1 · tree-sitter-c-sharp 0.23.5 ·
  .NET SDK 10.0.115 · PowerShell 7.4.6 · delta **+20 rows** = the two modules of `scripts/pins-perfb1toggle/`
  (`a-extra` 8 · `b-walk` 12) · CSH **600** (= 583 + 17 tests of `scripts/csh/PerfB1ExtraTests.cs`). The baseline on
  the untouched base in the same twin, observed 2026-11-15: `6341 / the 2 KNOWN` and CSH 583.
- Checks: `build-shells --check` ✓ · `build-locales --check` ✓ · `cs-syntax-check` 278 files ✓ · both scripts: a
  PowerShell parse check (0 errors) and an ASCII check (0 bytes) — not run, and why: no generator (C# and scripts
  only: no file under `src/` or `Spixi/Resources/Raw/html/` changed), `extract-strings`, `generate-icons`,
  `i18n-lint`, `pseudo`, `verify-locales` (no string, icon or shell changed).
- Review (security-only, #1312 / #1595): **CLEAN at r5 (MAJOR 1 → 0 → 0 → 0 → 0; five rounds)** · brief `docs/review-brief-perfb1toggle.md` (every finding
  of every round in § 5) · models: lead Claude Fable 5.2 · builders Claude Opus (the app side: the C#, its pins, its
  fix rounds) and Claude Sonnet (the walk side: both scripts, their pins, their fix rounds; packet P48, the gate
  section and their corrections) · reviewers: fresh read-only Claude Fable 5.2 at high effort (round 1: two auditors
  with disjoint scopes and one "break-my-verdict" reader; each later round: one fresh "break-my-verdict" reader) ·
  Claude Haiku: one mechanical check of the export docs (every path and `file:line` that the handoff and the rows #1615–#1618 name; the commit-message file for a `#` before a number, an attribution marker or a session link).
- ⚠ C# UNCOMPILED: `Spixi/Platforms/Android/MainActivity.cs` (Android only: the reader, its two call sites). The
  first compile is Damir's Release dev build in the operator block (the result is in the status doc).
  `Spixi/Utils/SpixiFlags.cs` and `Spixi/Utils/PerfB1ExtraRules.cs` compile and run in the C# harness; the Windows
  job of `redesign-ci` compiles them (Debug defines the symbol).
- New files to `git add`: `Spixi/Utils/PerfB1ExtraRules.cs` · `scripts/csh/PerfB1ExtraTests.cs` ·
  `scripts/pins-perfb1toggle/{a-extra,b-walk}.mjs` · `docs/be-review-pack/P48-perfb1-flags-intent-extra.md` ·
  `docs/contract-perfb1toggle.md` · `docs/review-brief-perfb1toggle.md` · this handoff ·
  `docs/commit-message-perfb1toggle.txt`. Uncommitted work from other sessions: none in the cloud clone.
- Definition of done: no `docs/release-readiness.md` row changed. The batch is the tool for **P-1** and **V-1** (the
  measured sitting of batch 1a); their state changes at the sitting.
- Still owed: the measured sitting of batch 1a (the main chat, `docs/walk-perfb1.md` plan A) · the operator block's
  phone proof when it did not run in this session (the status doc says) · Windows PowerShell 5.1 and the phone for
  every stop path of `-Flags` (proven only with a fake adb) · the Apple legs have nothing here (Android-only input).

## 1 · What this session did
| Item | Result | Evidence (file:line / pin / DECISIONS) | DoD row |
|---|---|---|---|
| 1 · the app side | Built, dev builds only: ONE string extra `perfb1flags` on the launch intent; grammar exactly `warmidle=<0\|1>,sparerearm=<0\|1>,sparekeep=<0\|1>,noemptydetail=<0\|1>` (51 characters; all four or nothing); stored through the four preferences of #1560 only with Developer mode on at that moment; acts at the NEXT start; one fixed line `[FLAGS] perfb1 extra stored`; read in `OnCreate` only on a fresh creation and never from an intent launched from history, and in `OnNewIntent`; the `fa` path byte-identical | `Spixi/Utils/PerfB1ExtraRules.cs` · `SpixiFlags.storePerfB1Extra` · `MainActivity.readPerfB1Extra` · pin `a-extra` (8 rows), csh `PerfB1ExtraTests` (17) · #1615, #1616 · packet P48 | — |
| 2 · the walk side | Built: `-Flags <the same string>`; the set-up (force-stop → the extra at a cold start → the stored line → force-stop → a cold start → the state line → ONE pid-filtered pull → compare); a stop with fixed words, exit 1 and no number when the state is not proven; the pid guard (a new app process inside the run stops it); the parser withholds every number of an asked run whose state is not proven (exit 2) or differs (the new exit 4); `run.json` `flags`, the head of `summary.md`; without `-Flags` no extra and a byte-identical `summary.csv` on the old run folders | `scripts/device/adb-walk.ps1`, `adb-walk-parse.ps1` · pin `b-walk` (12 rows) · #1617 | — |
| The sheet | `docs/walk-perfb1.md`: § 1 "How to set a switch", § 2 (1), § 3 plan A — each run names its `-Flags` line. Rows and pass bars unchanged (row A-2 still says "Needs #1569": it is answered by #1595) | #1617 | — |
| Recorded, not changed | § 5 below | | — |

## 2 · Walk
No walk of its own (#1597 ①: exempt by Damir's word; the sitting of batch 1a covers this batch). The operator block
of this session (one Android build, the install, two short `-Flags` runs) is in the status doc
`claude/session-perfb1toggle-status.md` with its result.

The lines for the sitting (one line each; PowerShell on Damir's PC; the phone on USB, unlocked, Developer mode ON):
```
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\scripts\device\adb-walk.ps1" -Flags warmidle=0,sparerearm=0,sparekeep=0,noemptydetail=0
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\scripts\device\adb-walk.ps1" -Flags warmidle=1,sparerearm=1,sparekeep=0,noemptydetail=1
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\scripts\device\adb-walk.ps1" -Steps resume-now,resume-3s -Repeats 5 -Flags warmidle=1,sparerearm=1,sparekeep=1,noemptydetail=1
```
- Exit codes: 0 ok · 1 a driver stop (also every `-Flags` stop; the reason is the `STOP:` line and `flags.stop` in
  `run.json`) · 2 no data · 3 no `run.json` · **4 (new) a pulled log holds a state that differs from the asked one**.
- The six stop codes: `start-failed` · `not-stored` (Developer mode off, or a build without this batch) ·
  `no-state-line` · `pull-failed` · `state-differs` · `unproven-process` (the app restarted inside the run).
- The state STAYS on the phone after a run. One last short run with the line of the defaults puts them back.

## 3 · Proposed next steps (the main chat decides)
Outcome: Damir knows for each of the four switches whether it helps on the Galaxy A52s, from one sitting.
1. Damir opens the pull request (the compare link); the main chat reads `redesign-ci`; Damir merges (#1505).
2. The measured sitting of batch 1a by `docs/walk-perfb1.md` plan A — one build, runs 0 / 1 / 2 by `-Flags`.
3. Then the keep-or-remove decision per switch (#1513 (3)) and the pick between the two switches of P-11 (#1536).

## 4 · Open questions and dials
| For | Question (with its options) | Blocks |
|---|---|---|
| BE (at handover) | P48: is a dev-build-only input on the exported launcher acceptable under the three limits of #1595, or should it move behind a signature-level permission or an adb-only component? | nothing now |
| Main chat | Row A-2 of `docs/walk-perfb1.md` still says "Needs #1569" (rows were out of this session's scope): one word to change in a docs commit | nothing |

## 5 · Recorded, not changed
- The legacy `fa` read of `intent.Extras` in `handleNotificationIntent` has no guard against a Bundle that throws at
  unparcel; it runs before the new read on both paths (#46 r1 S-app-3). Inherited; not touched (the `fa` path is
  frozen by this batch's pin).
- "All four or nothing" is the rule of the GRAMMAR. The store is four separate preference writes: a throw or a
  process kill between two writes can leave a part (legal 0 / 1 values of the four keys only) and no stored line;
  the walk's read-back stops on it (#46 r1 S-app-4; harness test `store_with_a_throw_at_the_third_write_logs_nothing`).
- Android's own Bundle code may write a type warning to logcat for a non-string extra under the name (the key and
  the type, never the value) — from reading, not seen on a phone (#46 r1 S-app-5).
- The two count polls of the set-up are not pid-scoped (the whole `DOTNET` tag): they only end a wait. The proof is
  the pid-filtered pull that is read back and compared (accepted in the brief § 4 by #1522's poll class).
- Core's logger does not strip line ends, and the dev log mirror emits each file line: a multi-line log message
  could shape a whole line of the phone-side filter. True for every old alternative too; no such log call was found
  (#46 r1 S-walk, focus point 2).
- `flags.asked` as a one-element JSON array with a valid state is read as asked by the parser (a hand-edited
  `run.json` only; the state is still re-built from digits) (#46 r2 R2-8).
- A restart of the app inside a `-Flags` run stops the run by design (`unproven-process`): a failed tab rep, which
  restarts the app, costs the run. A re-proof after the restart was not built (the simple rule was wanted).
- The frozen hashes of `b-walk` (row FROZEN) hold the text of eleven function bodies and six blocks, and of BOTH
  scripts whole (`file:adb-walk.ps1`, `file:adb-walk-parse.ps1`): any edit of the two scripts, a comment too, needs a
  re-base of the hashes after a look at the diff (#1596). The same holds for the bodies of `OnCreate`, `OnNewIntent`
  and `handleNotificationIntent` in pin `a-extra`.
- Row A-2 of `docs/walk-perfb1.md` still says "Needs #1569" (rows were out of scope).
- The cloud twin of this session: `apt-get install dotnet-sdk-10.0` (10.0.115; `dot.net` and
  `builds.dotnet.microsoft.com` are not reachable), PowerShell 7.4.6 from the GitHub release tarball, Ixian-Core
  cloned from GitHub at `097341a`. The Linux twin has no System.Drawing: a dry run of the driver with a screen check
  needs a COPY of the scripts with one test-only line in `Test-Probes`.
- The server process of the session restarted twice during the work; the same sub-agents were resumed from their
  transcripts each time (L188), and each checked its copy for a half-made mutation first.
- #46 r5 R5-1: "read once at start" rests on `SpixiFlags.init()` having ONE caller (`App.xaml.cs`); a second caller
  in another file is seen by no pin of any batch. Proposal for the next batch that touches the flags: one key
  `inTree('SpixiFlags.init(')` = `App.xaml.cs` × 1 (not built here: a fix after the last review round has no reader).
- #46 r5 R5-3: `-NoProfile` is in the documented walk lines and is not enforced by the script; an alias in the
  operator's own PowerShell profile named like a function of the script would outrank it (the class exists since
  batch `tooling`). A `-NoProfile` in the script's own Usage line needs a re-base of the file hash.
- #46 r3 R3-4 and the "Recorded limits of the source pins" (the brief § 5): built key names (`"flag" + "…"`,
  `nameof`, reflection) and new code in other C# files that reaches the activity's intent are not held by a pin.
- #46 r4, noted: in a coldstart rep, an app that crashes and is restarted by Android before the pull gives
  `am TotalTime` of the first process and the proof of the second.

## 6 · Lessons (also appended to docs/lessons.md)
- L202: a refusal case is proven by its OUTPUT FILE, not by its exit code (#1617).
- L203: an Android intent input can only STORE for the next start, and its read must be one-shot (#1615, #1616).
- L204: freeze whole bodies by hash and count names tree-wide; `touch` a file restored with `cp -p` (#1618).
- L205: a proof made once for a process does not cover the next process — keep the pid (#1617).

## 7 · Repo commands for Damir (PowerShell, one line at a time, no `&&`)
The pull request (#1546): open the compare link of the status doc, check that the page shows "base repository:
Rexoflex/Spixi", "base: redesign/frontend" and "compare: work/perfb1toggle", paste the title and the description,
then "Create pull request". To build the branch:
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git status -sb
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/perfb1toggle
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull --ff-only
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -p:SpixiDevCoexist=true
```
- Android only. A build error in `MainActivity.cs` near `readPerfB1Extra` is this batch's bug: paste it in the main chat.
- The BUILD row of this batch: a `-Flags` run ends `RESULT: OK` and its `summary.md` says "asked with -Flags; proven
  by the app's own [FLAGS] line".

After the merge: `git switch redesign/frontend`, then `git pull`.

Fallback, only if the pushed branch is not on GitHub: the commit-message file is
`docs/commit-message-perfb1toggle.txt`; the main chat gives the lines.
