# Review brief — perfb1toggle: the adb walk sets the four speed switches by a launch intent extra (#1615–#1618)

File name: `docs/review-brief-perfb1toggle.md`. Work order for the #46 loop of Session "Speed 1a toggle" (2026-11-15).
Written BEFORE round 1. The loop is **security-only** (#1312, #1595): fresh read-only **Claude Fable 5.2** readers at
high effort (#1471, #1533 — the batch changes app code; no fallback to another model). Round 1: two auditors with
disjoint scopes and one break-my-verdict reader. Every later round: one fresh break-my-verdict reader over the fixes.
Not CLEAN at round 5 → stop. The verdict is in § 5.

## 1 · What the batch is
Ruling #1595 (Damir, option B of #1569): "The adb walk sets the four switches by a launch intent extra. Only the
developer build reads it, only with Developer mode on, only the four names with 0 or 1."

| Item | What landed | Where (files) | DECISIONS |
|---|---|---|---|
| 1 · the app side | The dev build (`#if SPIXI_DEV_COEXIST`) reads ONE string extra, `perfb1flags`, from the launch intent (`OnCreate`) and from a new intent of a running app (`OnNewIntent`). Grammar: exactly `warmidle=<0\|1>,sparerearm=<0\|1>,sparekeep=<0\|1>,noemptydetail=<0\|1>` (51 characters; all four or nothing). With the "devMode" preference on at that moment it stores the four int preferences of #1560 (`SpixiFlags.PerfB1DevKeys`) and writes one fixed line `[FLAGS] perfb1 extra stored`. A refusal stores nothing and logs nothing. The state acts at the NEXT start (`SpixiFlags.init` runs in the `App()` constructor, before the activity sees an intent) | `Spixi/Utils/PerfB1ExtraRules.cs` (new, pure) · `Spixi/Utils/SpixiFlags.cs` · `Spixi/Platforms/Android/MainActivity.cs` · csh `scripts/csh/PerfB1ExtraTests.cs` · pin `scripts/pins-perfb1toggle/a-extra.mjs` | #1615, #1616 |
| 2 · the walk side | `-Flags <the same string>`: one start with the extra → a count poll of the stored line → `am force-stop` → a cold start → the state line `[FLAGS] warmidle=… sparerearm=… sparekeep=… noemptydetail=…` of that start, pulled through the phone-side filter → compared with the asked state; not equal = the run stops, no number. `run.json` and the head of `summary.md` name the state. Without `-Flags`: no extra, no extra start; `summary.csv` byte-identical on an old run folder | `scripts/device/adb-walk.ps1` · `scripts/device/adb-walk-parse.ps1` · pin `scripts/pins-perfb1toggle/b-walk.mjs` | #1617 |

Not built, and why: no row on the Developer screen and no push (the bridge is frozen; options A, C, D of #1569 are
not taken) · no fix of the seed code (#1597 ④) · nothing for Windows, iPhone, Mac (the input is Android-only) ·
no device number (the sitting is the main chat's).

## 2 · How to run
- Tree for the readers: `/home/claude/spixi` (the session's cloud clone, branch `work/perfb1toggle`, the working
  tree; base `redesign/frontend` @ "Merge pull request #7 from Rexoflex/work/docs-2026-11-15", `a964790`). The diff:
  `git -C /home/claude/spixi diff a964790 -- Spixi scripts` plus the untracked new files (`git status --short`).
  The contract: `docs/contract-perfb1toggle.md` (the interface table of § 3 is the claim to attack).
- Pipeline: none (C# and scripts only) · smoke on the untouched base in this cloud twin, observed 2026-11-15:
  `BASELINE OK — 6341 pass / the 2 KNOWN` · CSH 583 · Ixian-Core @ `097341a` present (`/home/claude/Ixian-Core`,
  read-only).
- A reader READS. It may run the pin modules and the harness in a COPY of the tree under `/home/claude/_review/<its
  name>/` (never in `/home/claude/spixi`), and only while `pgrep -f smoke-test.mjs` prints nothing. It runs nothing
  against a phone, installs nothing, and changes no file of the tree. ⚠ The Android arm (`MainActivity.cs`) is
  compiled by no machine in the cloud: read it as a compiler would.

## 3 · Auditor scopes (disjoint; security only)
| Auditor | Scope (files) | Focus |
|---|---|---|
| S-app | `Spixi/Utils/PerfB1ExtraRules.cs`, `Spixi/Utils/SpixiFlags.cs`, `Spixi/Platforms/Android/MainActivity.cs`, `scripts/csh/PerfB1ExtraTests.cs`, `scripts/pins-perfb1toggle/a-extra.mjs`, the re-based pins if any; read around them: `App.xaml.cs` (the start order), `Spixi.csproj` (the symbol and the store-release gate O-35), `HomePage.xaml.cs` (`ixian:disableDevMode`), `SettingsPage.xaml.cs` (the wipe), every reader of the four flags | **The new input.** (1) Who can send it (the launcher activity is exported: any app on the phone, adb, a shortcut) and what it can change — is the worst effect really "four developer preferences of a dev build in Developer mode", and does it stop there? Follow each of the four flags to what it switches (the opt-in `sparekeep` keeps a blank spare chat WebView over a short sleep, P40). (2) Is a STORE build free of it — every new line inside `#if SPIXI_DEV_COEXIST`, the extra name and the parser absent from a store build, no path around the symbol? (3) Is "Developer mode on at the moment of the store" true on every path (`OnCreate`, `OnNewIntent`, a re-delivered intent, an activity re-creation, a launch from Recents, before login / under the app lock)? (4) The grammar: can any value other than the 16 legal ones store anything, store a part, throw, or cost time or memory (a huge string, a non-string extra, a hostile Parcelable in the same Bundle)? (5) What is logged: is the stored line the only new line, with no value, length or name from the extra; can an exception text carry the value? (6) Is "read once at start" still true: no flag changes in the running process; `leaveDevMode()` and the removal of the four keys are not weakened; can the extra turn the opt-in ON outside Developer mode, even until the next start? (7) The `fa` path: byte-identical, and no new interaction with it (an intent that carries both). (8) The PARAMOUNT isolation invariant and "C# touches no risky parts": untouched? |
| S-walk | `scripts/device/adb-walk.ps1`, `scripts/device/adb-walk-parse.ps1`, `scripts/device/a52s.json` (if changed), `scripts/pins-perfb1toggle/b-walk.mjs` — the diff first, then the whole functions the diff touches | **The walk (#1522 holds).** (1) The new command shapes against the allowlist: is `--es perfb1flags …` ONE exact shape (the fixed name, the 16 values, anchored), can `-Flags` text reach an adb command, a file name or a log line before it is validated; is the usage error really before ANY adb command? (2) The phone-side filter: does the new alternative pass ONLY the exact state line of the app's own pid (fixed words and 0 / 1, anchored at the end) and not the rest of the `[FLAGS]` family or a line that another app shapes; did the change make any OLD alternative wider (the pattern is one string — check quoting and the alternation)? (3) The two new count polls: exact strings, a count only. (4) What the outputs can leak: `run.json`, `summary.md`, `walk.log`, the new pulled log — does the parser re-build the state from digits and copy no raw line; are the masks still on every write? (5) Can the walk measure under a state that it did not prove (a stale stored line, a spoofed `DOTNET` line of another app, a state line of an OLD process, a restart in the middle of a run, a pid change); does a mismatch stop the run with no number and a non-zero exit code? (6) Without `-Flags`: no extra, no extra start, the old sequence unchanged; an old run folder parses to a byte-identical `summary.csv`. (7) What stays changed on the phone, and is it said (the four preferences; the extra start)? |
| B (break-my-verdict) | the whole diff and both auditors' scopes, with no knowledge of their findings | Break the claim of § 1 and of the contract § 3 end to end: find ONE way in which a store build reads the extra, a value outside the grammar stores something, the store happens with Developer mode off, a raw value reaches a log line or a file, the walk writes a number under an unproven state, or a pin of the batch stays green when its rule is broken (mutate in a copy). |

Finding classes: **MAJOR** = a way around one of the three limits of #1595 (developer build only · Developer mode
only · the four names with 0 or 1), a value from the extra in a log line or a file, an effect beyond the four
preferences, a change of the `fa` path, a command path of the walk that can damage the phone, the TEST account, the
store app or the PC, a leak into a file that can leave the PC, or a number written under an unproven state;
**MINOR** = a hardening gap with a concrete mechanism, or a pin that does not fail when its rule breaks; **NIT** =
wording. Every finding carries `file:line` and the mechanism. A finding needs a mechanism in THIS tree, not a
general worry.

## 4 · Non-negotiables and accepted dials
- Must hold: the PARAMOUNT isolation invariant · C# touches no risky parts · the frozen bridge (no new verb, no new
  push) · #1312 / #1478 · everything of #1522 (one pinned package; the allowlist; the log filtered on the phone; the
  masks; the focus checks; the restore) · no value from the extra in any log line or file · the `fa` path unchanged ·
  "read once at start" · a number is never guessed ("no data", exit 2).
- Accepted (do not re-open): option B itself and its three limits (#1595) · the launcher activity is exported and
  `LaunchMode.SingleInstance` (legacy) · the dev build mirrors `ixian.log` to logcat (`DevLogTail`, #1222) · the four
  switches, their preferences, the opt-in rule and the state line (#1560, reviewed in `docs/review-brief-perfb1.md`) ·
  the store acts at the next start · all four or nothing (the contract § 3) · everything accepted in
  `docs/review-brief-tooling.md` § 4 and `docs/review-brief-walksteps2.md` § 4 · the Android arm is UNCOMPILED until
  Damir's build in the operator block · no walk of its own (#1597 ①) · the seed code is not touched (#1597 ④).

## 5 · Verdict
**CLEAN at r5** (five rounds; the rounds follow, the verdict paragraph is at the end of this section).

### Round 1 (2026-11-15) — auditors S-app and S-walk and reader B, three fresh read-only Claude Fable 5.2 instances, high effort: 1 MAJOR · 6 MINOR · 7 NIT (after merging the doubles; B-6 does not apply)
Files read (SHA256, first 16): `adb-walk.ps1` `787f15a2473e8181` · `adb-walk-parse.ps1` `e06864cc1f40879a` ·
`PerfB1ExtraRules.cs` `ac1aa7003646ff63` · `SpixiFlags.cs` `a11ec57cc18b28b8` · `MainActivity.cs` `1e0136e5659c2b47` ·
`a-extra.mjs` `75445da439ee95ff` · `b-walk.mjs` `24c2e44f85886e15` · `PerfB1ExtraTests.cs` `8615d69aff43e08d`.
Smoke before the round: `BASELINE OK — 6358 pass / the 2 KNOWN` (= 6341 + 17) · CSH 599. The server process of the
session restarted during the round; the SAME three readers were resumed from their transcripts (L188) and each
checked its copy first. Each reader ran the pins, the harness and its own mutations in its own copy; reader B and
S-walk also ran the driver against their own fake adb. **The three limits of #1595 held against every attack** (no
store build read, no illegal value stored, no store with Developer mode off, no raw value in a log or a file).
| Id | Finding (mechanism) | Fix claimed |
|---|---|---|
| B-1 = S-walk-2 (MAJOR by the letter of § 3; B: "the real chance on the test phone is low") | In a `-Flags` run the state was proven once, for the process of the set-up cold start. A later NEW process was not proven: a coldstart rep whose log held no state line passed silently, and `Reset-AppToChats` / the recover start could start a process whose state line the next `logcat -c` removed. The numbers differ only if the four preferences changed in between (another app's extra, or the replay of S-app-1) | The pid guard: the pid of the proven process is kept; a coldstart rep must show the state line; every other pull and the memory phases need the proven pid; a restart inside the run stops it (`unproven-process`); the parser withholds the numbers when a coldstart log of an asked run has no state line |
| S-app-1 = B-4 (MINOR) | The `OnCreate` read was not one-shot: Android gives a re-created activity (a config change outside the handled list, a restore after a background kill, Recents) the same launch intent, so the old four values were stored again with no sender — also after Developer mode was left (the keys removed on purpose) and turned on again, and over a later `ixian:devflash:` choice. Inside the three limits | The read in `OnCreate` only on a fresh creation (`bundle == null`), and never for an intent launched from history; `OnNewIntent` unchanged |
| S-walk-1 = B-2 (MINOR) | Pin `b-walk` did not hold the comparisons that decide "no number": eight one-token mutations stayed green (the usage error without its exit; the set-up without its compare; the parser's compare inverted; a missing flags pull accepted; the raw line into `run.json`; `flags.ok` true before the proof) | Exact-text checks for each of these lines; every listed mutation is run again and must be red |
| S-app-2 (MINOR) | Pin `a-extra` looked only at the three new bodies: three mutations stayed green (`Intent?.ToUri(…)` logged in `OnCreate`; another file reads the extra through the constant; a new writer of `PerfB1DevKeys` with no Developer mode check) | Tree-wide counts (`GetStringExtra(`, the constant, the literal, `PerfB1DevKeys[`, `ToUri(`) |
| B-3 (MINOR) | The guard regexes of `a-extra` needed `#if` / `#endif` with no space after `#`; with `# endif` / `# if true` the rule file compiled WITHOUT the symbol and the pin stayed green; no pin forbade a file-level `#define SPIXI_DEV_COEXIST` (O-35 reads only the csproj) | Spaced directives are seen; no `.cs` under `Spixi/` may `#define` / `#undef` the symbol |
| S-walk-3 (MINOR) | In an asked run a rep log that was unreadable or over 4 MiB gave zero state lines and was skipped (numbers written, "proven") | The parser withholds; the driver stops |
| B-5 = S-walk-5 (MINOR / NIT) | Without `-Flags` the head named only the last coldstart state; two states in one run were not said | All rep logs are read; more than one state = the fixed line "mixed" (a warning; exit code and csv unchanged) |
| S-walk-4 (NIT) | A `flags.stop` value outside the known codes counted as "no stop" | Any non-null stop = stopped, fixed words |
| S-walk-6 (NIT) | The legend of `summary.md` listed the filter's five old shapes | The state line added |
| S-walk-7 (NIT) + the lead | The set-up start could meet a running app ("task brought to the front (intent not delivered)") and then waited 30 s and named the wrong cause; "the app stored" was said on a count that is not pid-scoped; the app writes its preferences to disk asynchronously, so a force-stop right after the stored line could lose the write (fail closed, but a flake) | The set-up force-stops first (the extra always arrives at a cold start), waits 2 s after the stored line, stops at once on an am note or error, and says "a stored line was seen" |
| S-app-3 (NIT) | The docs called the `OnNewIntent` call of the `fa` handler a "post": it runs inline on the main thread (`MainActivity.cs`, the docblock of `BeginInvokeOnMainThread`), so the legacy unguarded `fa` read runs BEFORE the new read on both paths, and the new catch protects only the new read. (B-6, the opposite order, does not apply for this reason) | Wording in P48, the gate section and the pin header |
| S-app-4 (NIT) | "All four or nothing" is true for the grammar; a throw or a kill between two of the four writes can leave a part (two legal values, no stored line). The fail-closed test threw at the first read only | One more harness test (a throw at the third write); wording "a refused VALUE never stores a part" |
| S-app-5 (NIT) | "A non-string extra gives null" and "+1 log line" are about the app's log; Android's own Bundle code may write a type warning (key and type, no value) | One clause in P48 |
| Docs (S-app § 5, S-walk § 5) | P48 and the gate section named pin rows for rules that the pins did not hold; "the parser writes NO number" had two exceptions (S-walk-3, S-walk-4); `docs/walk-perfb1.md`: a stopped run has no `summary.md` | Corrected with the fixes |
Verified by the lead against the tree: every finding (the mutation lists and the reproductions are in the readers'
reports; the mechanisms are as said). Fix round 1: Claude Opus (the app side), Claude Sonnet (the walk side, the docs).

### Round 2 (2026-11-15) — reader R2, one fresh read-only Claude Fable 5.2 instance ("break-my-verdict"), high effort: 0 MAJOR · 6 MINOR · 2 NIT
Files read (SHA256, first 16): `adb-walk.ps1` `fc2e34aa85ff03b0` · `adb-walk-parse.ps1` `76278314cd50dc33` ·
`PerfB1ExtraRules.cs` `ac1aa7003646ff63` · `SpixiFlags.cs` `a11ec57cc18b28b8` · `MainActivity.cs` `f7ea40696e8dd02d` ·
`a-extra.mjs` `59effc84f9bfbd7b` · `b-walk.mjs` `83140654f7442458` · `PerfB1ExtraTests.cs` `c2d70884ecb8d40d`.
Pins before the round: `a-extra` 8 + `b-walk` 11 = 19 green · CSH 600. The reader checked every row of round 1:
**every fix holds in the code** (B-1: the pid guard stopped each of its six fake-adb scenarios with exit 1 and no
`summary.md`; S-app-1: the one-shot read; S-walk-3, -4, -5, -6, -7; S-app-3, -4, -5; the docs). It found nothing
that the first Android compile would reject. **All six MINOR are pins that stay green when their rule is broken**
in a place they did not read — the class of round 1 S-walk-1 / B-2, still open:
| Id | Finding (mechanism) | Fix claimed |
|---|---|---|
| R2-1 (MINOR) | The pid guard needs the reset of `LastPullPid` at the start of `Save-Log`; the pin held only the assignment. With the reset deleted, a pull with no pid kept the old pid and the rep stayed `ok` (shown with a fake adb) | Whole-body freeze of `Save-Log` |
| R2-2 (MINOR) | Parser: COMPARE / PROCESS held the `if` lines, not the bodies, the loop headers or the key reads — seven one-token changes made the parser write numbers on a folder that it must withhold | Whole-body freeze (SHA-256) of `Get-FlagsStatus` and `Read-FlagStates`, and the frozen text of the `$withheld` lines and of the RESULT / exit-code block |
| R2-3 (MINOR) | "Usage error before any adb command": the pin held that `Exit-Usage` is called, not that it exits; and the three assignments of the `-Flags` block were not in the `else` of the check, so without the exit the unchecked text was adopted (it reached `walk.log` and `run.json`; the allowlist still refused the start) | `Exit-Usage` frozen; the assignments moved into the `else` of the check |
| R2-4 (MINOR, low) | The same class in the driver: the loop headers of the two compares, `flags.ok` / `flags.stop` of `Save-RunJson`, the memory-phase stop | Whole-body freeze of `Invoke-FlagsSetup`, `Update-FlagsLogged`, `Assert-FlagsPid`, `Get-FlagStates`, `Stop-Flags`, `Invoke-LogPull`, `Reset-AppToChats`; frozen text of the `flags` lines of `Save-RunJson`, of the memory-phase guard and of the `-Flags` block |
| R2-5 (MINOR, low) | Round 1 B-3 was closed for space and tab only: C# also accepts vertical tab, form feed and Unicode spaces after `#` (Roslyn honours `#<VT>endif`), and one `#<VT>else` flips a guard | The whitespace class of every directive regex is "any whitespace but a line end"; the three files of the batch may hold no spaced directive |
| R2-6 (MINOR, low) | Round 1 S-app-2 was closed for the indexed form only: a new writer of the four keys in the `foreach` form or through a key constant stayed green | Per-file counts of the bare word `PerfB1DevKeys`, of the four key constants and of the four key literals |
| R2-7 (NIT) | Parser, a hand-edited folder: a coldstart rep with status `ok` and no `log` key was skipped, not counted as "no state line" | Counted as not proven (withheld) |
| R2-8 (NIT) | Line numbers `adb-walk-parse.ps1:1198-1211` (are `:1200-1212`) in P48 and the gate section; "five stop codes" in the header of `b-walk.mjs` (six); "as C# accepts them" in the header of `a-extra.mjs` | Corrected. (A note, no fix: `flags.asked` as a one-element JSON array with a valid state is read as asked; the state is still re-built from digits) |
Verified by the lead: the mutations are listed in the reader's report with their runs. Fix round 2: Claude Sonnet
(the walk pins, the `else`, R2-7), Claude Opus (the resumed app builder: the `a-extra` pins only; no C# change).

### Round 3 (2026-11-15) — reader R3, one fresh read-only Claude Fable 5.2 instance ("break-my-verdict"), high effort: 0 MAJOR · 1 MINOR (low) · 4 NIT
Files read (SHA256, first 16): `adb-walk.ps1` `4d116517c97cbfbe` · `adb-walk-parse.ps1` `7219e58b47b7e2a4` ·
`a-extra.mjs` `3e06ca8dedb8272b` · `b-walk.mjs` `dbd2719c7e0ae0de` · the four C# files as in round 2 (unchanged).
Pins before the round: 8 + 12 = 20 green · CSH 600. The reader got one more rule from the lead for the WEIGHT of a
pin gap: this tool runs on the developer's PC against a TEST phone, and a pin exists to stop a later careless edit,
not someone who can edit the repo (who can also edit the pins) — a pin gap is MINOR only when ONE plausible careless
edit breaks a rule of this brief and stays green; a contrived multi-step change of the repository is at most a NIT.
**No code finding: every round 2 fix holds**, all 11 frozen function hashes equal the body that PowerShell's own
parser gives, the driver stopped in each fake-adb scenario, the parser withheld on 15 edited folders, the old run
folders gave the same two `summary.csv` hashes, and nothing was found that the first Android compile would reject.
| Id | Finding (mechanism) | Fix claimed |
|---|---|---|
| R3-1 (MINOR, low; "plausible as a merge accident, not a one-token slip") | Row FROZEN hashed the FIRST `function <name>`; PowerShell runs the LAST definition in scope. One added line `function Assert-FlagsPid($Rec) { }` (or an alias, a nested definition, a second `Get-FlagsStatus` in the parser) replaced a frozen body, the pins stayed green and a fake-adb run wrote numbers after a restart | FROZEN: exactly one definition of each frozen name in its file (any indentation, any letter case), and no alias or `function:` line that names it |
| R3-2 (NIT) | The pid guard of a non-coldstart rep lives in `Invoke-LogPull`; its nine call sites were not held (a deleted call in `Invoke-ResumeRep` stayed green) | The count of the call sites is frozen in row PROCESS |
| R3-3 (NIT) | The rest of the R2-5 class: C# also ends a line at U+0085, U+2028 and U+2029; a directive or code after such a character is real for the compiler and unseen by the pin (needs an invisible character and a crafted line) | One key: the raw text of the three files holds none of these characters, nor VT or FF |
| R3-4 (NIT) | The name counts of `a-extra` see names, not built names: a writer through `"flag" + "…"`, `nameof` or reflection, or a read through `"perfb1" + "flags"`, stays green | **Recorded, not fixed:** a deliberate dodge that no count can hold; the BE engineer's review of the diff is the control |
| R3-5 (NIT) | P48 said "five text blocks" for the FROZEN row; there are six | Corrected |
Not findings, noted by the reader: the parser never reads `flags.ok` (no driver path writes `ok = false` with reps
and without a stop) · `RxFlagAsked` is not frozen, and each one-token change of it fails closed · a moved
`Invoke-FlagsSetup` call, a renamed `Stop-Walk` prefix, a second `FlagLineRe` and a re-bound `FlagsAskedState` stay
green in the pins and FAIL CLOSED at run time (`flags.stop` is kept and the parser's frozen rules decide last).
Fix round 3 (pins only; no script and no C# change): Claude Sonnet (`b-walk`), Claude Opus (the resumed app builder: one key in `a-extra`).

### Round 4 (2026-11-15) — reader R4, one fresh read-only Claude Fable 5.2 instance ("break-my-verdict"), high effort: 0 MAJOR · 2 MINOR (both low, both pins) · 2 NIT
Files read (SHA256, first 16): `a-extra.mjs` `0fc44fa0a11f5ff9` · `b-walk.mjs` `8abc271900e32721` · the two scripts and
the four C# files as in round 3 (unchanged since round 2 / round 3). Pins before the round: 20 green · CSH 600.
**No code finding** (the third round in a row): the reader's own fuzz of the rule (more than 50 000 texts) accepted
only the 16 values; 24 driver runs against its own fake adb stopped in every unproven case and sent 0 adb calls for
12 bad `-Flags` values; the parser withheld on 20 edited folders; about 75 `file:line` citations of P48 and the gate
section were correct; nothing was found that the first Android compile would reject. The fixes of round 3 hold as
claimed. Both MINOR are the same class once more — a pin that reads less than what runs:
| Id | Finding (mechanism) | Fix claimed |
|---|---|---|
| R4-1 (MINOR, low) | The "no `ToUri`" count saw `ToUri(` only; the binding also has the obsolete `Intent.ToURI()`, which writes every String extra as text. One debug line in `OnCreate` would put the raw value into `ixian.log` and stay green — the third time that "one line in `OnCreate` that prints the intent" stayed green (r1 S-app-2, r4) | The count is case-insensitive; and the CLASS is closed: the whole bodies of `OnCreate` and `OnNewIntent` are frozen by SHA-256 (a later batch that edits them re-bases the hash, #1596) |
| R4-2 (MINOR, low; the weight of R3-1) | The R3-1 fix held for the 11 frozen names, not for the functions that only HOLD a frozen block (`Invoke-MemPhase`, `Save-RunJson`, the parser's `Invoke-Main`, `Invoke-Walk`, `Invoke-Step`): a stale second copy after the new one left every hash green and ran (shown with a fake adb: a memory row and parser rows written under an unproven state) | The CLASS is closed: both scripts are frozen WHOLE by SHA-256 (any edit, a comment too, needs a re-base after a look at the diff — the scripts are held as the last reader read them, the practice of #1523); beside it, no function name may be defined twice in a script |
| R4-3 (NIT, contrived) | Forms that replaced a frozen body and stayed green: `function script:Name`, `Set-Item alias:Name`, an old body kept in a `<# #>` block above an edited one, `workflow`, a dot-sourced file | Closed by the whole-file hash; the scope prefix and `alias:` are also read |
| R4-4 (NIT) | C# also ends a line at a LONE carriage return; `plainLineEnds` did not list it and scanned only the three files of the batch | The lone CR is in the class, and the key reads every `.cs` file under `Spixi/` |
Not findings, noted by the reader: in a coldstart rep, an app that crashes and is restarted by Android before the
pull gives `am TotalTime` of the first process and the proof of the second (a different state needs two preference
changes inside one rep) · `flags.ok = false` with no `flags.stop` gives numbers (no driver path writes that).
Fix round 4 (pins only; no script and no C# change): Claude Sonnet (`b-walk`), Claude Opus (the resumed app builder: `a-extra`).

**Recorded limits of the source pins (the lead, for the main chat and the BE engineer — not fixed, with the
reason):** the pins of this batch exist to stop ONE later careless edit; they are not a control against someone who
edits the repository on purpose (who can also edit a pin). After round 4 the two walk scripts are held whole, and on
the C# side the rule file, the store, the reader, `OnCreate`, `OnNewIntent` and `handleNotificationIntent` are held
by frozen bodies, guards and tree-wide name counts. Left open on purpose: a writer or a reader of the four keys or of
the extra through a BUILT name (`"flag" + "…"`, `nameof`, reflection — R3-4), and new code in OTHER C# files that
reaches `MainActivity.Instance.Intent` by a road the counts do not name. The controls for these are the review of
the diff by the BE engineer (packet P48) and the #46 loop of the batch that would add such code.

### Round 5 (2026-11-15 / 16) — reader R5, one fresh read-only Claude Fable 5.2 instance ("break-my-verdict"), high effort: 0 MAJOR · 0 MINOR · 3 NIT — **CLEAN**
Files read (SHA256, first 16): `adb-walk.ps1` `4d116517c97cbfbe` · `adb-walk-parse.ps1` `7219e58b47b7e2a4` ·
`a-extra.mjs` `6505588e385ba40f` · `b-walk.mjs` `170fc99e8a5cdb39` · `MainActivity.cs` `f7ea40696e8dd02d` ·
`SpixiFlags.cs` `a11ec57cc18b28b8` · `PerfB1ExtraRules.cs` `ac1aa7003646ff63` · `PerfB1ExtraTests.cs` `c2d70884ecb8d40d` ·
`csh.csproj` `280afd6e7a32b44a` · `smoke-test.mjs` `426033f58bb731dc`. Pins 20 green · CSH 600, before and after.
**Every fix of round 4 holds** (the whole file is hashed — a BOM, a trailing space, a missing final newline, a lone
CR, a NUL byte are red; a whole-file CRLF conversion is green by design; all round 4 mutations and 19 older ones
are red). **No code finding** (the fourth round in a row). Own attacks: 57 confusable and odd-Unicode values under
six cultures, all 256 transitions between legal values and a 40-million-character value through the real store in
the harness; about 30 driver runs against its own fake adb (every unproven case: stop, exit 1, no `summary.md`;
every bad `-Flags` form: 0 adb calls); the parser on edited folders; about 70 `file:line` citations. Outside the two
hashed scripts the `-Flags` path newly trusts nothing. Nothing was found that the first Android compile would reject.
| Id | Finding | What was done |
|---|---|---|
| R5-1 (NIT; "a deliberate one-line behaviour change in a file the batch does not own, not a careless slip") | "Read once at start" rests on `SpixiFlags.init()` having one caller (`App.xaml.cs`); a second caller in ANOTHER file (shown: the `ixian:enableDevMode` branch of `HomePage.xaml.cs`) is seen by no pin of any batch. It breaks no limit of #1595; the careless variants (a second call in `App.xaml.cs`, `init()` in `leaveDevMode`) are red | **Recorded, not fixed** (a fix after the last permitted round would have no reader). Proposal for the next batch that touches the flags: one key `inTree('SpixiFlags.init(')` = `App.xaml.cs` × 1 |
| R5-2 (NIT, docs) | P48, the gate section and row R4-4 above said that `plainLineEnds` reads "every C# file"; it reads every `.cs` under `Spixi/` (the set of the tree-wide counts) | The three texts corrected (wording only; no code, script or pin file changed after the round) |
| R5-3 (NIT, contrived; the PC, not the repository) | `-NoProfile` is in the documented call, not enforced by the script: an alias in the operator's own PowerShell profile that is named like a function of the script would outrank it | **Recorded, not fixed.** The documented lines carry `-NoProfile`; the class exists since batch `tooling` |
Noted by the reader, not findings: a print of `Intent` itself (not its extras) in `OnResume` stays green and is
harmless · a Core log line with an embedded newline could appear as a state line of the app's own pid; the real
state line is always in the same pull and every state line must equal the asked state, so it can only cause a stop.

**VERDICT (the lead, 2026-11-16): CLEAN at r5.** MAJOR 1 → 0 → 0 → 0 → 0 · MINOR 6 → 6 → 1 → 2 → 0. The files of the
batch are delivered exactly as the round 5 reader read them (the hashes above); after round 5 only doc wording
changed (R5-2) and the export docs were written. The full smoke ran once after the last fix:
`BASELINE OK — 6361 pass / the 2 KNOWN` (= 6341 + 20) · CSH 600. Recorded and not fixed: R3-4, R5-1, R5-3, and the
"Recorded limits of the source pins" above. Owed outside this loop: the first Android compile of `MainActivity.cs`
and the phone proof (the operator block; the status doc `claude/session-perfb1toggle-status.md`).
