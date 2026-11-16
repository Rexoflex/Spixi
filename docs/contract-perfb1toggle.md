# Agent contract — perfb1toggle (Session "Speed 1a toggle")

File name: `docs/contract-perfb1toggle.md`. Written by the lead BEFORE any agent started (`docs/orchestration.md` § 4).
Rulings: DECISIONS #1595 (option B) and #1597 (the dials). Number block: DECISIONS #1615–#1624 · L202–L205 · P48–P49.

## 1 · Base
- Tree: `work/perfb1toggle` @ "Merge pull request #7 from Rexoflex/work/docs-2026-11-15" (`a964790`; it holds "Merge
  pull request #6 from Rexoflex/work/perfb1") · baseline in the cloud twin, observed 2026-11-15 on the untouched
  tree: `build-shells --check` ✓ · `build-locales --check` ✓ · `CSH pass=583 fail=0` · smoke: see § 5 ·
  tools: jsdom 29.1.1 · eslint 10.14.0 · globals 17.14.0 · tree-sitter 0.25.1 · tree-sitter-c-sharp 0.23.5 (L160) ·
  .NET SDK 10.0.115 · PowerShell 7.4.6 (the scripts must also run on Windows PowerShell 5.1: ASCII only, L173).
- Must hold for everyone: the PARAMOUNT isolation invariant · C# touches no risky parts · the frozen bridge (no new
  verb, no new push) · #1312 / #1478 · the security handover gate (this batch adds ONE input and ONE log line and
  ONE allowed line shape in the walk's log filter — nothing else) · the existing `fa` intent path does not change ·
  no commit, no push, no full smoke, nothing in Ixian-Core · no file under `src/**`, `Spixi/Pages/**`,
  `Spixi/Resources/Raw/html/**`, `.github/**`, no `Spixi/Spixi.csproj`, no `Spixi/Utils/SDevSeed.cs`, no speed code
  of batch 1a · never the files of session `perflean` (`scripts/build-shells.mjs`, `scripts/strip-release.mjs`,
  `scripts/lib/**`, `scripts/smoke-packaged.mjs`).
- ★ L153: while `pgrep -f smoke-test.mjs` prints a pid, an agent runs NOTHING that executes (no `node`, `dotnet`,
  `pwsh`); it only reads and edits files.

## 2 · Items and ownership (file scopes are disjoint)
| Item | Agent | Model (effort high) | Owns (files / folders) | Reads only | Owes (pins + one deliberate break each) | Copy of the tree |
|---|---|---|---|---|---|---|
| 1 · the app side | builder-app | opus (C#, a new input next to the exported launcher activity) | `Spixi/Utils/PerfB1ExtraRules.cs` (NEW, pure) · `Spixi/Utils/SpixiFlags.cs` · `Spixi/Platforms/Android/MainActivity.cs` (the read only) · `scripts/csh/PerfB1ExtraTests.cs` (NEW) + its lines in `scripts/csh/csh.csproj` and `scripts/csh/Run.cs` · `scripts/pins-perfb1toggle/a-extra.mjs` (NEW) · in `scripts/smoke-test.mjs`: the ONE registration line for BOTH modules (`a-extra`, `b-walk`) and the smallest re-base of an existing pin that counts what item 1 adds (#1596) · `Spixi/Utils/PerfB1Rules.cs` only if a shared constant must move | everything else | the Outcome criteria 1–3 of the prompt (below, § 3a) | `/home/claude/b1/spixi` |
| 2 · the walk side | builder-walk | sonnet | `scripts/device/adb-walk.ps1` · `scripts/device/adb-walk-parse.ps1` · `scripts/device/a52s.json` (only if needed; prefer constants in the script) · `scripts/pins-perfb1toggle/b-walk.mjs` (NEW) | everything else; the old run folders in `/home/claude/fixtures/oldruns/` (data, never changed) | the Outcome criteria 4–5 (below, § 3b) | `/home/claude/b2/spixi` |
| — | the lead | fable | the docs of the export, `docs/walk-perfb1.md`, the gate section, P48, the integration | | the full smoke, CSH, the #46 loop | `/home/claude/spixi` |

## 3 · Interfaces between items (the only way the two items meet)
| Name | Shape | Provider | Consumer |
|---|---|---|---|
| The extra's NAME | the string extra `perfb1flags` (exactly this, ordinal) on the launch intent of the dev build's launcher activity | item 1 | item 2 |
| The extra's GRAMMAR (the canonical state string, "CANON") | exactly `warmidle=<0\|1>,sparerearm=<0\|1>,sparekeep=<0\|1>,noemptydetail=<0\|1>` — all four names, this order, `,` between entries, no space, nothing before or after; 51 characters; 16 legal values. Regex: `^warmidle=[01],sparerearm=[01],sparekeep=[01],noemptydetail=[01]$` with NO newline tolerance (in C#: a length check + an ordinal compare per position, no `Regex`). Anything else (a fifth name, a missing name, another order, a second copy, a value other than `0` / `1`, empty, longer, shorter, upper case, a space, a trailing newline, null) = the WHOLE extra is refused: nothing is stored. All four or nothing — never a part | item 1 | item 2 (`-Flags` takes the same CANON) |
| When it acts | the app STORES the four int preferences (`SpixiFlags.PerfB1DevKeys`, the order of `PerfB1Rules.DevSwitchNames`); they act at the NEXT start, because `SpixiFlags.init()` runs in the `App()` constructor (`App.xaml.cs:248`), before `MainActivity.OnCreate` sees an intent. "Read once at start" stays true; `init` is not called again and no static flag changes in the running process | item 1 | item 2: one start with the extra → wait for the stored line → `am force-stop` → a cold start → the `[FLAGS]` line of that start |
| The stored line | on a successful store, exactly ONE `Logging.info` line of fixed words: `[FLAGS] perfb1 extra stored`. A refused extra logs NOTHING. No other new log line; no value, length or name from the extra reaches any log line or file | item 1 | item 2 polls it ON THE PHONE as a count only (`grep -c`), like the frames lines; the line itself does not need to leave the phone |
| The state line (exists on the base, #1560; NOT changed) | `[FLAGS] warmidle=<0\|1> sparerearm=<0\|1> sparekeep=<0\|1> noemptydetail=<0\|1>` — written once per start by `SpixiFlags.init` (`PerfB1Rules.flagsLine`); in the dev Android build it reaches logcat through `DevLogTail` (tag `DOTNET`, the same prefix shape as the `Starting Spixi` line) | base | item 2: the phone-side filter passes ONLY this exact shape of the `[FLAGS]` family, of the app's own pid; the parser re-builds the state from four parsed digits and copies no raw line |
| Developer mode | the store happens only when `Preferences.Default.Get("devMode", false)` is true AT THE MOMENT OF THE STORE; off → refused, nothing stored, nothing logged | item 1 | item 2: no stored line within the time limit = stop with the reason "the app did not store the switch state (Developer mode off, or the build on the phone does not have this batch)" |
| A RUNNING app (`OnNewIntent`) | the same rule and the same store as `OnCreate`; never a restart, never a navigation, never a change of a flag in the running process | item 1 | item 2 may send the set-up start to a running or a stopped app |

A change to this table goes through the lead; both sides get the new text.

**Changes after the review rounds (the lead, 2026-11-15; both builders got the text):**
- Round 1 (S-app-1 / B-4): the app reads the extra in `OnCreate` only on a FRESH creation (`bundle == null`) and never
  from an intent that Android marks as launched from history; `OnNewIntent` is unchanged. So the walk force-stops the
  app BEFORE the start with the extra: the extra always arrives at a cold start.
- Round 1 (B-1 / S-walk-2, S-walk-7): the set-up order is force-stop → `logcat -c` → the start with the extra → the
  stored-line poll (30 s) → a 2 s settle → force-stop → `logcat -c` → `am start -W` → the state-line poll (45 s) →
  ONE pid-filtered pull → compare. The pid of the proven process is kept; a coldstart rep must show the state line
  in its own log; every other pull and the memory phases need the proven pid; a restart inside the run stops it.
  Stop codes: `start-failed`, `not-stored`, `no-state-line`, `pull-failed`, `state-differs`, `unproven-process`.
- Round 1 (S-walk-3, -4, -5): the parser withholds every number of an asked run also for a coldstart log without
  the state line, an unreadable or oversized rep log, and ANY `flags.stop`; without `-Flags` more than one state in
  the logs gives the fixed line "mixed".
- Round 2 (R2-1 to R2-6): the pins freeze whole bodies by SHA-256 (`b-walk` row FROZEN) and count the key names
  tree-wide (`a-extra` `keyNames`); the `-Flags` block adopts the text only in the `else` of its check.

### 3a · Item 1 — what to build and prove
- `PerfB1ExtraRules` (pure; the WHOLE file inside `#if SPIXI_DEV_COEXIST`; the harness defines the symbol):
  `ExtraName`, `StoredLine`, and one rule that turns (devMode, value) into exactly four ints in
  `PerfB1Rules.DevSwitchNames` order, or "refuse". Build the expected text from `PerfB1Rules.DevSwitchNames` so the two
  cannot drift (a harness test fixes the 51-character example).
- `SpixiFlags` — one `#if SPIXI_DEV_COEXIST` method that reads "devMode", asks the rule, stores the four ints through
  `PerfB1DevKeys` and writes the stored line. Fail closed: any exception = nothing more stored, nothing logged from
  the value. `leaveDevMode()` and the removal of the four keys are NOT weakened; `init()` is not changed.
- `MainActivity` — inside `#if SPIXI_DEV_COEXIST`: read the ONE string extra from the launch intent in `OnCreate` and
  from the new intent in `OnNewIntent`, inside a `try` / `catch` (a hostile intent can throw at unparcel), hand the
  string to the `SpixiFlags` method. The body of `handleNotificationIntent` and the `fa` path stay byte-identical.
  ⚠ In a file that imports `Android.OS`, the bare name `Environment` does not compile (L184).
- Pins (`node scripts/run-pins.mjs pins-perfb1toggle/a-extra`) and harness tests, each with its deliberate break (#802):
  (1) the read of the extra and the store method sit inside `#if SPIXI_DEV_COEXIST` — a SOURCE pin (the cloud cannot
  compile the Android arm: say so in the pin header); it fails when the guard is taken away; (2) the store needs
  devMode — a harness test of the pure rule, with its break; (3) the grammar: every refusal class of § 3 above, each
  as a harness test, with breaks; (4) no raw value reaches a log line (the one stored line is a constant; a source pin
  that the new code holds exactly one `Logging.` call and that its argument is the constant); (5) the two call sites
  and "the `fa` body is unchanged" (source pins).
- Tell the lead: every EXISTING pin that reads `MainActivity.cs`, `SpixiFlags.cs` or `PerfB1Rules.cs` and counts
  something you add; re-base it by the smallest change (#1596), naming the new site and the new pin module.

### 3b · Item 2 — what to build and prove
- `-Flags <CANON>` (declare it so that both `-File … -Flags a=1,b=1,…` and a call from inside PowerShell, where the
  commas make an array, give the same CANON; anything else = a usage error BEFORE any adb command). `-Flags` with
  `-Calibrate` = a usage error.
- With `-Flags`, after the pre-flight and before the first step: ONE start with the extra → poll the stored line (a
  count on the phone, a time limit) → `am force-stop` → `logcat -c` → a cold start → wait for the state line → ONE
  filtered log pull into the run folder → compare with the asked state. Equal → the steps run. Not equal, no stored
  line, or no state line → the run STOPS: a clear reason on the console and in the files, a non-zero exit code, and
  NO number row is written. Without `-Flags`: no extra is sent and no extra start is made.
- In both cases `run.json` and the head of `summary.md` name the state that the app logged (from the logs that the
  run pulled; "not read" when the run pulled no state line — never a guess). In a run with `-Flags`, every state line
  that the parser finds in any pulled log must equal the asked state; a different one = the run is not OK.
- `summary.csv` keeps its shape: on an old run folder (no `flags` in `run.json`, no state line in the logs) the new
  parser writes a byte-identical `summary.csv` (SHA256 of `20261113-2339/summary.csv`: `8770a86d…`, of
  `20261113-1838/summary.csv`: `bb90ae0f…`; copy the folders before you run the parser on them).
- #1522 holds: the new command goes through `Assert-AdbCommand` as ONE exact shape (the fixed extra name, CANON);
  the two new polls are exact strings; no `input text`; the phone-side filter gains ONE alternative, the exact state
  line (fixed words and `0` / `1`, anchored at the end); the parser copies no raw line into a summary or `run.json`.
- Proofs: the parser's own test set and a dry run with a fake adb (`ADBWALK_ADB`), on PowerShell 7.4.6 here; a parse
  check and an ASCII check of both scripts; the parser proof of the prompt (the state line removed from a COPIED log
  of a `-Flags` run → "no data", exit code 2); pins `b-walk` (pure node, no PowerShell needed in CI): the allowlist
  shape, the filter alternative (run the extracted regex against accept and reject lines), "no extra without
  `-Flags`", each with its break.

## 4 · What each agent returns
- The list of files it CHANGED (the lead copies back only these).
- Per pin: the command, the green output line, the break it made (a one-token mutation in a copy, #802), the red
  line with the failing key.
- What it could not prove (⚠ C# UNCOMPILED, unrun on the phone).
- Anything it saw outside its scope: a note, not a fix.

## 5 · Integration order and checks (the lead)
1. Copy back per agent, changed files only → `node scripts/cs-syntax-check.mjs` → the two `--check` gates (C# and
   scripts only: no generator runs).
2. The registration line in `scripts/smoke-test.mjs`: check its scope; grep the smoke for the tokens of every edited
   line (the INLINE pins, L84).
3. The full smoke (one at a time, nothing beside it, L153) + CSH → the security-only #46 loop until CLEAN (#1503:
   the affected pins between rounds, the full smoke once after the last fix) → the export docs → commit → ONE push
   of `work/perfb1toggle` → the read-back (#1546) → the operator block.

## 6 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
| 2 | the lead's check of the first version | sonnet | the parser wrote the numbers of a run whose state was not proven | fix round by the same builder: numbers withheld; a differing coldstart rep stops the run |
| 1, 2 | #46 round 1 (1 MAJOR · 6 MINOR · 7 NIT) | opus (1), sonnet (2) | fixed: the one-shot read; the pid guard; the pins | round 2 |
| 1, 2 | #46 round 2 (0 MAJOR · 6 MINOR · 2 NIT, all pins) | opus (1, pins only), sonnet (2) | fixed: whole-body freezes; whitespace class; key-name counts | round 3 |
| 1, 2 | #46 round 3 (0 MAJOR · 1 MINOR low · 4 NIT, pins) | opus (1, pin only), sonnet (2, pin only) | fixed: one definition per frozen name; the call sites; the line-end characters | round 4 |
| 1, 2 | #46 round 4 (0 MAJOR · 2 MINOR low · 2 NIT, pins) | opus (1, pin only), sonnet (2, pin only) | fixed: both scripts frozen whole; `OnCreate` and `OnNewIntent` frozen; the lone CR | round 5 (the last) |
