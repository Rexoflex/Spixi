# Review brief — tooling: the adb walk (#1520–#1523)

File name: `docs/review-brief-tooling.md`. Work order for the #46 loop of Session Tooling (2026-11-12). Written
BEFORE round 1. The prompt (`claude/session-tooling-prompt.md`, Gates) asks for ONE short security-only reader: a
fresh read-only Claude Fable 5.2 instance at high effort (#1471; no fallback model). The verdict is in § 5.

## 1 · What the batch is
| Item | What landed | Where (files) | DECISIONS |
|---|---|---|---|
| The adb walk | A Windows PowerShell 5.1 script drives the Galaxy A52s (SM-A528B) over adb: cold start ×5, chat open by the notification intent ×5 and by a list tap ×5, scroll ×5, background / resume ×5 (60 s) + one 5-minute case, Wi-Fi off / on, memory of the app and of its WebView renderer in three phases. One screenshot and one filtered log pull per repeat; `run.json` after every repeat | `scripts/device/adb-walk.ps1` | #1520, #1522 |
| The parser | Reads `run.json` + the pulled files, writes `summary.md` / `summary.csv`. A missing required line = "no data" and exit code 2; never a guessed number | `scripts/device/adb-walk-parse.ps1` | #1520 |
| The device map | Package id, timing, one tap, two swipes, pixel probes for the two expected screens | `scripts/device/a52s.json` | #1521 |
| Local input (NOT in git) | `<repo>\Claude outputs\adbwalk\walk.local.json`: the dev-seed contact addresses for the `fa` intent | shape: `local-example/walk.local.json` | #1521 |
| Task Scheduler | NOT registered. The line that would register it is in the status doc | `local-example/task-scheduler-line-NOT-REGISTERED.txt` | #1511 ③ |

Not built, and why: the QuIXI delivery probe and the `-PeerBurst` peer (cut by Damir, #1509) · the bridge trace
(app code; rides Speed B1a) · a dev "go to" verb (#1521: never) · `uiautomator` tap targets (tried once on the phone:
the dump holds no WebView text node) · the DevTools route for `-KillRenderer` (Debug builds only) · iPhone · a build
step · the Task Scheduler registration.

## 2 · How to run
- Tree for the reader: the three files under `scripts/device/` (a copy of the working tree of Damir's PC clone;
  branch `redesign/frontend` @ "Merge pull request #2 from Rexoflex/work/docs-2026-11-12" + the three new files) and
  the two files under `local-example/`. No app file is in the diff.
- Pipeline: none (no shell, no C#). Smoke: not run — no app file changed.
- The reader READS. It runs nothing against a phone. It may run the scripts' parse check and the parser on a
  synthetic folder with `/home/claude/tools/pwsh/pwsh` (PowerShell 7.4.6, Linux) — in a scratch copy, never in place.

## 3 · Auditor scope (ONE reader, security only)
| Auditor | Scope (files) | Focus |
|---|---|---|
| S | `scripts/device/adb-walk.ps1`, `adb-walk-parse.ps1`, `a52s.json`, the SHAPE of `walk.local.json`, the Task Scheduler line | (1) **what the outputs can leak** — `run.json`, `walk.log`, the pulled logs, screenshots, meminfo files, `summary.*`, the console; where they are written; whether they can reach git (`.gitignore:491` `/Claude outputs/`) · (2) **what the script can do to the phone** — every adb command shape it can send (the allowlist `Assert-AdbCommand` / `Test-ShellAllowed`), injection through `a52s.json`, `walk.local.json`, `-Serial`, `-Apk`, `-Steps`, through device output that is parsed and re-used in a later command (the resolved activity, pids, the WebView provider package), state that is not restored (Wi-Fi, `stay_on_while_plugged_in`, files under `/data/local/tmp`), the store app (`com.ixilabs.spixi`, a real account) versus the dev app (`.dev`, the TEST account) · (3) **what the script can do to the PC** — file writes outside the output folder, path handling from `run.json` in the parser, the `ADBWALK_ADB` test hook, the lock file, native process start, `-ExecutionPolicy Bypass` · (4) **the Task Scheduler line** — what runs, as whom, from where, what an unattended nightly run with an unlocked phone exposes · (5) **the security handover gate of the app** (`docs/security-handover-gate.md` triggers): does the batch add a verb, a log line, a `spixi.*` key, a WebView setting or a fetch to the APP? (It must add none.) |

Finding classes: **MAJOR** = a real leak of a secret / address / account datum into a place that can leave the PC, a
command path that can damage the phone, the test account, the store app or the PC, or a broken restore; **MINOR** = a
hardening gap with a concrete mechanism; **NIT** = wording. Every finding carries `file:line` and the mechanism.

## 4 · Non-negotiables and accepted dials
- Must hold: no app file changed · no password, PIN, seed phrase or wallet datum is read, typed or stored · never
  `adb uninstall`, `pm clear`, `adb root`; install only `install -r` of an APK whose name starts with the `.dev`
  package id · the package id must end in `.dev` · no address and no serial in any output file or console line ·
  the pulled log holds timing lines only (filtered on the phone) · Wi-Fi and `stay_on_while_plugged_in` are restored
  in a `finally` · a number is never guessed.
- Accepted (do not re-open): the scripts live in the repo, `scripts/device/` (#1511 ②) · taps by coordinates from a
  per-device map + the `fa` notification intent, no new verb (spec § 3, #1521) · `-ExecutionPolicy Bypass` on the
  command line Damir types (his PC policy is not changed) · USB debugging is authorised for this PC on the TEST phone
  (standing exposure, accepted in the spec § 3 "Security lens") · the "Network client connected to <ip:port>" line
  stays in the pulled log (a public node address, needed for the network step; the parser never prints it) · the
  screenshots show the dev-seed chats (fixed fake names and texts, `Spixi/Utils/SDevSeed.cs`) and stay in the
  git-ignored folder · the nightly task is NOT registered (#1511 ③) · a heads-up notification of another app can be in a screenshot when Do not disturb is off, and a window or overlay that appears between the focus check and the next adb call can receive one tap or BACK or be in one screenshot (the run records `dnd`; a screenshot whose probes fail is kept as calibration evidence; TEST phone only).
- Facts measured on the phone (2026-11-12): toybox `date +%N` works · `grep -w` with several `-e` works · the
  renderer of the app is found through `dumpsys activity services <package>` (the external isolated service is filed
  under the CLIENT package) · `svc wifi`, `svc power stayon usb`, `am send-trim-memory` are allowed from the shell.

## 5 · Verdict
**CLEAN at round 6 (2026-11-13, by Damir's ruling #1519).** The final verdict is at the end of this section. The round
tables and the verdict of 2026-11-12 below are kept as they were written.

### Round 1 (2026-11-12) - reader S1, fresh read-only Claude Fable 5.2, high effort: 0 MAJOR - 14 MINOR - 9 NIT
All 23 were fixed by the builders (driver: Opus; parser: Sonnet). The claims below are the builders' - round 2 attacks them.
| Id | Finding (mechanism) | Fix claimed |
|---|---|---|
| M1 | A renderer that was not confirmed (one sandboxed process, no service block) still gave "renderer PSS" as data | `rendererPid` / `rendererFile` only when confirmed through `dumpsys activity services`; exit code and timeout of each dumpsys checked |
| M2 | `Protect-Text` replaced the serial / a seed INSIDE numbers of machine-read files (serial `45` cut `187345` to `1873`) | meminfo written unmasked (`Write-RawFile`); only base58 seeds of 30-60 chars and serials of 6+ chars are masked; a shorter serial is refused |
| M3 | Cut before mask: a 60-char cut inside a seed left a seed prefix in `run.json` / `walk.log` / the summaries | `Get-Cut` masks first, then cuts |
| M4 | The pull filter matched the WORD `P1` anywhere (a console line with content could ride out); parser patterns unanchored; no pid filter | The pull is `logcat -d --pid=<app pid> ... \| grep -E '<LogRe>'` (emitter shape + the app token grammar, anchored after `\|sev\|thread: `); the parser anchors every pattern at the message start and applies the same grammar |
| M5 | The screenshot was taken BEFORE the focus check and kept; the focus line named the foreign app | Focus first; a foreign window = no screenshot, note "foreign window in front", the focus line never leaves `Test-AppFront` |
| M6 | Taps and swipes went out without a fresh focus check; `no-screen` reset the halt counter | Focus is read before every `input tap` / `input swipe`; after the recovery start too; `no-screen` counts toward the 3-in-a-row halt |
| M7 | Over a TCP adb transport `svc wifi disable` cuts the link and nothing can be restored; Wi-Fi state before the run not read | The network step is skipped on a TCP serial and when Wi-Fi is not enabled at its start |
| M8 | After a hard stop the old `stay_on_while_plugged_in` value was lost | `restore-pending.json` is written before the first change and applied at the next start |
| M9 | Phone files stayed after an abort | `Restore-Phone` removes both |
| M10 | `a52s.json` under-bounded: swipe = long-press, 41-day waits, `x.dev` passes | Package pinned to `com.ixilabs.spixi.dev`; swipe >= 200 px and 100-2000 ms; coordinates inside the screen; `*Sec` <= 900, `*Ms` <= 60000 |
| M11 | The `ADBWALK_ADB` test hook made folders that look like device runs | Hook runs: folder prefix `hook-`, `"adbHook": true`, banner; the parser prints `TEST HOOK` in the header and the RESULT line |
| M12 | Free text from `run.json` reached `summary.md` as live Markdown (links, instructions to an AI reader) | Driver: `refresh` = `renderFrameRate=<n>`, version fields and notes reduced; parser: every manifest string reduced to `[A-Za-z0-9 _.,:=/()%+-]`, capped, in code spans; URL schemes and instruction words -> `(removed)`; CSV formula guard |
| M13 | The Task Scheduler line would run whatever is in the working tree at 03:17, picks the phone by model only, needs a phone without a secure lock | NOT a code fix: the task stays unregistered (#1511 (3)); the note under the line now carries these three warnings (run a fixed copy outside the working tree, pass `-Serial`, the phone exposure) |
| M14 | Lock: PID reuse blocks, check-then-write race, refusal leaves no trace | Atomic `CreateNew`; pid + process start time; a refusal is appended to `adb-walk-refused.log` |
| N1-N9 | Unicode digits in `\d`; `-match` / `$`; install and pull rules only at the call sites; `Test-SafeName` `$`; unbounded `repeats`; PNG decoded before the size check; absolute paths and raw `dumpsys display` / other packages' lines in outputs; lasting `logcat -G` / `-c` not documented; relative `-Apk` path | `[0-9]`; `-cmatch` + `\z`; both rules inside `Assert-AdbCommand`; `\z` + reserved device names; `repeats` 1-50 and `-ceq` step names; size first; file names only in `walk.log`, no raw display lines, only our package's service lines; header text; `-Apk` resolved against the PowerShell location |

Facts from the real phone after round 1 (2026-11-12, Windows PowerShell 5.1): the first full walk gave `RESULT: OK` with every row filled (run `20261112-1823`, round-1 scripts); the round-2 parser gives a byte-identical `summary.csv` on that run; a copied log with one `open singlechatpage present` line removed gives `no data` for exactly that row and exit code 2.

### Round 2 (2026-11-12) - reader S2, a fresh read-only Claude Fable 5.2 instance, high effort: 0 MAJOR - 7 MINOR - 14 NIT
S2 confirmed 20 of the 23 round-1 findings closed and found M4, M5 and M12 not fully closed. All round-2 findings were fixed by the same builders, except MINOR 7 (recorded, see below). The claims are the builders' - round 3 attacks them.
| Id | Finding (mechanism) | Fix claimed |
|---|---|---|
| r2-1 (M4) | `LogRe` had no line-start anchor, three alternatives had no tail grammar, and the `[P1]` tail was wider than the app's token grammar: a line that CONTAINED a timing shape rode out whole | `LogRe` starts `^[^|]*\|sev\|thread: `; the `[P1]` / `[CDPERF]` tail is 1-16 tokens of `[a-z0-9_.=-]{1,40}`; `Starting Spixi`, the connect line and the Hello line have bounded tails and `$`. Checked by the lead with `grep -E` on 2122 real pulled lines: 2116 kept, the 6 dropped are `[NOTIFDIAG] ... (#493 + P1)` |
| r2-2 | BACK (`input keyevent 4`) went out with no focus check, also right after a "foreign" result | One helper `Invoke-Back`: BACK only when the app has the focus at that moment; a foreign window gets no key; recovery sends only the single `am start -W -n` |
| r2-3 (M5) | On a non-zero exit `Invoke-Adb` wrote the first STDOUT line (a focus line, a `ps` line) to `walk.log` | Only stderr (reduced) is logged; stdout is logged as a length |
| r2-4 (M12) | File names from `run.json` were a free-text channel into `summary.md` / `summary.csv`, outside code spans | Only the driver's name shapes are accepted (`^(shot|android-walk|meminfo|cal)-[a-z0-9-]{1,40}\.(png|txt)\z`, `run.json`); a refused name is not printed; every name is in a code span |
| r2-5 | Hook runs and device runs shared `restore-pending.json` and `.lock` | Hook runs use `.lock.hook`, `restore-pending.hook.json`, `adb-walk-refused.hook.log` |
| r2-6 | The pending restore ran after the battery gate | It runs right after the model check |
| r2-7 | A heads-up notification of another app does not take focus and can be in a screenshot | **Recorded, not removed:** pre-flight reads `zen_mode`; `device.dnd` = on / off goes into `run.json` and the summary header; when off the script warns. Residual exposure accepted for the TEST phone (section 4); the handoff tells the operator to turn Do not disturb on for unattended runs |
| NIT a-n | culture-sensitive `-ceq`; JSON masked after serialization; `stayOld` 0-999; lock blocks on any live pid; first `RESULT:` line; no magnitude cap; write through a planted link; narrow scheme filter; stale commit-message line; `<` `>` in notes; `Wi-Fi is enabled` matched anywhere; package matched anywhere in the focus line; no cap on probes / seeds; the fixed-copy note | ordinal compares + printable-ASCII rule; string values masked before `ConvertTo-Json`, all-digit serial < 10 refused; `stayOld` 0-15; process name `powershell` / `pwsh` required, log capped; `^RESULT: `; values above 1e9 unreadable; reparse point refused, old file deleted first; any `scheme:/`, `www.`, `data:`; line corrected; notes without `<` `>`; `(?m)^`; the full `mCurrentFocus=Window{...}` shape; 16 probes / 64 seeds / 64 KB; the note says the output root of a fixed copy is outside the repo |

Facts from the real phone after round 2 (Windows PowerShell 5.1): the round-2 scripts gave `RESULT: OK` in a short run and in two full runs back to back (`20261112-1903`, `20261112-1919`); the parser proof on Damir's PC (a copied real log, one `open singlechatpage present` line removed) gave `RESULT: NO DATA in 1 rows` for exactly that row. The round-3 parser gives a byte-identical `summary.csv` on the first real run.

### Round 3 (2026-11-12) - reader S3, a fresh read-only Claude Fable 5.2 instance, high effort: 0 MAJOR - 3 MINOR - 14 NIT
S3 confirmed r2-2 to r2-7 and the round-2 NIT group closed and found r2-1 only partly closed. All round-3 findings were fixed by the same builders except where "recorded" stands. The claims are the builders' - round 4 attacks them.
| Id | Finding (mechanism) | Fix claimed |
|---|---|---|
| r3-1 (r2-1, M4) | `LogRe` began `^[^|]*`: free text in front of the first `|` (a line without the Core stamp, a continuation line) rode out when the line ended in a timing shape | `LogRe` now begins with the full logcat threadtime prefix and the Core stamp (`^MM-dd HH:mm:ss.SSS pid tid L DOTNET : MM-dd HH:mm:ss.ffff|sev|thread: `); the asset path, `Starting Spixi` and the connect line (`host:port` with labels of at most 24 characters) are bounded. Checked by the lead with `grep -E` on 3263 real pulled lines: 3257 kept, the 6 dropped are `[NOTIFDIAG] ... (#493 + P1)` |
| r3-2 | The `am` `Status:` token reached `walk.log` and the console unreduced (ESC bytes, a link) | Strict captures for every `am` field; every progress line is built from the reduced note; `Say` prints printable ASCII only |
| r3-3 | The pending restore had no device identity: a file left by phone A was applied to phone B of the same model | The file holds a fingerprint (16 hex characters of SHA-256 of the serial); a mismatch or a missing field stops the run before any phone change |
| r3 NIT 1-5 (parser) | culture-sensitive compares printed tag characters; the parser grammar was wider than the phone filter; quadratic regex time on a very long line; file-name shape wider than the driver's names (and `run.json` accepted as a data file); `RESULT: OK` with no data row | ordinal compares and the table's own key is printed; the filter's grammar; lines over 1000 characters skipped, files over 4 MB refused; a name must equal the name derived from its own step / rep / phase; an unknown requested step = `no data`, and OK needs one data row |
| r3 NIT 6-14 (driver) | a serial equal to an output word; an absolute path in a `driver:` note; check-then-act gap for the screenshot; `dnd` wording and no warning when unreadable; header lines that overclaimed; allowlist wider than the use (`logcat -d` alone, any `grep -e`); lock failed open; invalid pending file deleted silently; narrow scheme filter in notes | the serial is refused; `driver:` notes hold the exception type and line only; the focus is read again after `screencap` and a foreign result deletes the PNG; a warning for an unknown state; the header states exactly which commands go out without a focus check, what the filter is, and which files are stored as the phone returns them; every piped command is one of 9 whole constants; lock identity = pid + start time, an unreadable start time refuses; an invalid pending file stops the run and is kept (Wi-Fi is re-enabled first when the flag is set), written through a temp file; the parser's scheme rule |
| r3 NIT 8 (rest), NIT 9 | **Recorded, not removed:** the gap between the focus check and a tap / BACK (two adb calls) cannot be closed over adb; a touchable overlay without focus could take a tap; `dnd: on` is no guarantee in priority mode; a screenshot whose probes FAIL is kept on purpose (it is the evidence for a re-calibration). All of this is the accepted exposure "TEST phone only" of section 4; the header of the script says it |

Facts from the real phone after round 3: none new (the round-4 scripts are verified by a short run before delivery; the verdict below names it).

### Round 4 (2026-11-12) - reader S4, a fresh read-only Claude Fable 5.2 instance, high effort: 0 MAJOR - 2 MINOR - 9 NIT
S4 confirmed r3-1, r3-2, r3-3 and both round-3 NIT groups closed (28 hostile log lines dropped by `LogRe`, the pending-restore fingerprint, the name rules, the 9 piped constants). The parser got NO finding and is unchanged since round 3's fixes. The two MINORs and five NITs were fixed in the driver with the smallest change; three NITs are recorded. Round 5 attacks these fixes.
| Id | Finding (mechanism) | Fix claimed / recorded |
|---|---|---|
| r4-1 | adb's own error text names LOCAL absolute paths (a failed `install -r` of an APK outside the repo; a failed pull): the Windows user name and folder reached `walk.log`, the `run.json` note and the console | `Get-AdbWhy` is the choke point: for `pull` it returns the fixed words `pull failed`, for `install` only `install failed` + a strict capture of `Failure [CODE]`; `Protect-Text` (the first step of every sink) replaces the run folder, the output root, the repo path, the APK folder, the profile / local-app-data / temp folders and the user name on the raw text before masking |
| r4-2 | The state token of an `adb devices` row was printed raw (a second USB device with a blank in its serial puts a free token on the console) | Rows are split at the TAB; the state is mapped to a fixed set, anything else prints `other`; a row without exactly one TAB is never selected |
| r4 NIT 2, 3, 6 | a local file left by a failed pull; no length cap on the provider package / the resolved activity; a failed final restore kept exit code 0 | the local file is deleted before the throw; caps of 100 / 120 characters; a failed restore prints `RESTORE FAILED` and exits 1 |
| r4 NIT 1, 5, 8 | header wording (the fingerprint is an unsalted truncated hash; the list of lasting changes was incomplete; the "without a focus check" list was incomplete; three wording slips) | the header says only: input events and screencap need the focus, all other commands do not depend on it; the full list of what a run leaves changed on the phone; "an unsalted, truncated SHA-256 of the serial, not the serial itself"; the slips are fixed |
| r4 NIT 4 | **Recorded:** a serial that is a sub-word of an output name (for example `o-home`) rewrites file names in `run.json` | The effect is "no data" rows only; real serials do not look like that; the single-word collision rule of round 3 stays |
| r4 NIT 7 | **Recorded:** the stale-lock takeover is a plain overwrite (two starts in the same instant on a stale lock can both go on) | Needs two starts by the PC user in the same instant; the effect is two walks on one phone = wrong numbers, visible in `walk.log` |
| r4 NIT 9 | **Recorded:** no size cap on what the phone returns (stdout, a pulled file, a meminfo file) | The effect is a slow or failed run and large files in the git-ignored folder; the phone is the owner's TEST phone |

Facts from the real phone after round 3's fixes (Windows PowerShell 5.1, the round-4 scripts): a check run with every step except the 5-minute resume (`20261112-2012`, 2 repeats) gave `RESULT: OK`, exit code 0; all 393 pulled lines match the timing shapes; the lock and the pending file were removed; the parser proof on the copied log again gave `RESULT: NO DATA in 1 rows`, exit code 2.

### Round 5 (2026-11-12) - reader S5, a fresh read-only Claude Fable 5.2 instance, high effort: 0 MAJOR - 1 MINOR - 6 NIT
S5 confirmed r4-1 and r4-2 closed, the NIT 2 / 3 / 6 group closed and the header group closed. It found one MINOR that the round-4 fix opened.
| Id | Finding (mechanism) | State |
|---|---|---|
| r5-1 (MINOR) | `Protect-Text` replaced the bare Windows user name (3+ characters, any case) BEFORE it masked the serial and the seed addresses. A user name that occurs inside a seed address or the serial breaks the ordinal mask: with `USERNAME=Max` 45 of 48 seed characters stayed in `walk.log`. Not triggered on the owner's PC (the lead checked: the user name is in no seed address) | **Fixed after the round, NOT read by a fresh reader:** the bare user-name replacement is removed (3 lines); the order is folders, serial, seeds |
| r5 NIT 2 | a user name that is part of an output word rewrote `run.json` values (`Home` -> `mem-<user>`) | closed by the same removal |
| r5 NIT 3 | the folder-length test ran before the trim: a drive root or a separator-only value became a pattern | fixed after the round: the trimmed value needs 4 characters |
| r5 NIT 5 | unguarded `Remove-Item` of a local file | fixed after the round: `Remove-LocalFile` (try, one retry, the note `local file not deleted`) |
| r5 NIT 6 | `Exit-Usage` printed without the printable-ASCII reduction | fixed after the round: it goes through `Say` |
| r5 NIT 7 | three header sentences not exactly true | fixed after the round |
| r5 NIT 4 | **Recorded:** the parser prints the absolute path of `summary.md` on the console (no file holds it) | the PowerShell prompt shows the same folder; the parser is unchanged since round 4 passed it |

### VERDICT OF 2026-11-12 (the lead of Session Tooling; superseded by the final verdict below): CLEAN NOT CLAIMED AT ROUND 5 - the batch is NOT done and is NOT delivered
Protocol: one security-only reader per round (the session prompt asks for ONE short security reader), each a FRESH
read-only Claude Fable 5.2 instance at high effort (#1471); the lead verified the findings it acted on against the
tree; fixes by the builders (the driver: Opus; the parser: Sonnet); a fresh reader over the fixes each round.

| Round | Reader | MAJOR | MINOR | NIT | Result |
|---|---|---|---|---|---|
| r1 | S1 over the first build | 0 | 14 | 9 | all 23 fixed |
| r2 | S2 over the r1 fixes | 0 | 7 | 14 | 20 of the 23 confirmed closed; all round-2 findings fixed, one recorded (the heads-up exposure) |
| r3 | S3 over the r2 fixes | 0 | 3 | 14 | fixed; the check-then-act gap and the `dnd` limits recorded |
| r4 | S4 over the r3 fixes | 0 | 2 | 9 | fixed; three NITs recorded; no finding in the parser |
| r5 | S5 over the r4 fixes | 0 | 1 | 6 | **fixed AFTER the round - no further reader** |

No reader found a MAJOR in any round. Round 5 is the limit of `docs/orchestration.md` section 5, so the loop stops
here: by `docs/process.md` loop step 7 a batch whose last fixes no fresh reader has read is "CLEAN not claimed" and
NOT done. **Owed: one fresh read-only Fable 5.2 reader over the round-5 fixes** (the diff between
`reviewed-at-round-5/adb-walk.ps1`, SHA256 `6c93e650...`, and `scripts/device/adb-walk.ps1`, SHA256 `88288e4d...`:
26 lines added, 18 removed, in `Protect-Text`, `Remove-LocalFile`, `Exit-Usage` and the header). That needs Damir's
ruling, because it is a sixth round.

Recorded, not fixed (each with its reason in the round tables above): the heads-up notification exposure (r2-7) -
the check-then-act gap of taps / BACK and the limits of `dnd` (r3 NIT 8 / 9) - a serial that is a sub-word of an
output name (r4 NIT 4) - the stale-lock takeover race (r4 NIT 7) - no size cap on what the phone returns (r4 NIT 9)
- the parser's console line with the absolute path (r5 NIT 4) - the Task Scheduler line is not registered (M13).

Proven on the real phone (Windows PowerShell 5.1): three full walks (`20261112-1823`, `-1903`, `-1919`) and two
check runs with later script versions (`20261112-2012`, `20261112-2121`), all `RESULT: OK`. The run `20261112-2121`
used exactly the final files (driver SHA256 `88288e4d...`, parser `e2c5fcca...`, map `0a9e647e...`). Not proven on
the phone: `-KillRenderer`, `-Apk`, the Ctrl+C restore on a Windows console, the pending-restore path, the TCP
refusal, the lock.

Final numbers: no smoke run (no app file changed). C# uncompiled: none (no C# touched).

### Round 6 (2026-11-13) - reader S6, a fresh read-only Claude Fable 5.2 instance, high effort: 0 MAJOR - 1 MINOR - 2 NIT
Permitted by Damir's ruling #1519 of 2026-11-13 (a row of the main chat; full text in the project doc
`claude/talk-rulings-2026-11-13.md`, not in `DECISIONS.md` yet): ONE more round for this batch only; 0 MAJOR = CLEAN;
a MINOR or NIT of round 6 is recorded and NOT fixed in this batch (a fix would need another reader); no round 7.
Run by the follow-up session Tooling R6. No script file was changed in this round or after it.

What S6 got: this brief (rounds 1-5), the three files as they are in Damir's PC tree, the driver as S5 read it, and
the diff between the two drivers (8 hunks, 26 lines added, 18 removed). What S6 read, SHA256 (S6 hashed the files at
its start and again as its last step; the lead compared the pack and the PC tree after the round: unchanged):

| File | SHA256 |
|---|---|
| `scripts/device/adb-walk.ps1` (delivered) | `88288e4d8a91a9765fda691a54f458c9c0cdbdd1a94a6ba865a0ce81bb399f5c` |
| `scripts/device/adb-walk-parse.ps1` (delivered) | `e2c5fcca925d14f418a5f98b6cd05cd364d0b8865cd0fc3538b42d3c83fe5405` |
| `scripts/device/a52s.json` (delivered) | `0a9e647e98746c0edfa39f967f3c2dda8413223f7bfd4d97583fc49769e098d5` |
| the driver as S5 read it (not delivered) | `6c93e65046d42ac36f098ed8e162bc8acbc0a7a86369e5822a5882b4bc1c29ba` |

How S6 worked: it read the brief, the whole driver, the diff, the device map and the parser's header, entry, write
and exit sections (the parser's middle part it searched, not read line by line); it ran the round-5 and the tree
functions side by side on PowerShell 7.4.6 (Linux, a scratch copy) and five hook runs against a fake adb. Nothing
ran on Windows PowerShell 5.1 and no phone was used.

| Question | Answer of S6 |
|---|---|
| 1 - is r5-1 closed? | **PARTLY.** The stated mechanism is closed: the bare user-name replacement is gone (the driver no longer reads `USERNAME`); the order is folders, serial, seeds. With `USERNAME=Max` and a seed and a serial that hold that word, the round-5 functions print cut values and the tree functions print `<seed 0>` and `<serial>` through `Protect-Text`, `Get-SafeNote`, `Get-Cut` and `Say`. A ROOTED folder value cannot break a mask (it holds `:`, `\` or `/`, which no base58 seed holds). Every script-built string goes through `Protect-Text`; the sinks outside it are constants, the lock and pending files, the raw meminfo files (M2), the files adb pulls and the parser's console line (r5 NIT 4). In five hook runs with the seed, the serial and local paths in adb's own text: 0 hits in the outputs. r4-1 stays closed and no longer depends on the user-name replacement. **The same mechanism stays reachable through a folder value that is NOT rooted: r6-1** |
| 2 - did the fix open anything new? | **No.** `Remove-LocalFile`: every call site passes a direct child of the run folder; a symlink is removed and its target stays; no `$false` result is ignored; the function cannot throw, so the calibration path always clears the path (stricter than round 5). `Exit-Usage` through `Say` masks and reduces to printable ASCII. No hunk touches an adb command, the allowlist or the restore. Two wording NITs (r6-2, r6-3) |
| 3 - is anything else changed? | **No.** S6's own `diff -u` equals the diff it was given: 8 hunks, 26 added, 18 removed, all inside the four claimed places (the header, `Protect-Text`, `Remove-LocalFile` with its four call sites, `Exit-Usage`). The parser and the device map: S6 had no round-5 copy, so it could not confirm "unchanged" itself; their hashes are the ones of the final files that run `20261112-2121` used, and the lead's record says the parser has no change after the round-3 fixes |

| Id | Finding (mechanism) | State |
|---|---|---|
| r6-1 (MINOR) | `adb-walk.ps1:142-150` (second trigger `:1869-1871`): `Protect-Text` replaces each folder string of 4 or more characters, case-insensitive, BEFORE the ordinal serial and seed masks, and does not require the value to be rooted. A value without `:` or a separator acts as a bare word, exactly as the user name did in r5-1. Trigger a: `TEMP`, `USERPROFILE` or `LOCALAPPDATA` set to a relative alphanumeric value. Trigger b: a provider-qualified `-Apk` (for example `-Apk 'FileSystem::<word>\com.ixilabs.spixi.dev.apk'`), which makes the APK folder a bare word. Proven end to end in hook runs on PowerShell 7: 44 of 48 seed characters stayed in `walk.log`, 5 in a `run.json` note, the same on the console; a word such as `home` rewrites an output file name (the r5 NIT 2 effect). Not verified on Windows PowerShell 5.1. This path existed in round 5 too (the same folder list, the same replace); the round-5 fix did not open it | **Recorded, NOT fixed (#1519).** Low edge of MINOR by S6's own words: Windows never sets these three variables to a value that is not rooted, the `-Apk` form must be typed on purpose, and the word must also occur in a seed address or the serial; the leak lands in the git-ignored output folder and on the console; the seed addresses are hashes of a fixed text of the dev seed (#1521), not account data. Operator rule until a fix: do not run the walk with a non-rooted `TEMP` / `USERPROFILE` / `LOCALAPPDATA`, and pass `-Apk` as a plain path. Proposed fix for a later batch with its own reader: accept a folder value for the replacement only when it is rooted |
| r6-2 (NIT) | `adb-walk.ps1:1090+1093` and `:1578`: when the delete of a local file fails, the texts still say "deleted" (the walk note reads "local file not deleted, foreign window during the screenshot (PNG deleted)"; the calibrate console line says "deleted" while `calibrate.json` says "local file not deleted"); header line 24 has the same limit | **Recorded, not fixed.** Wording only; the correct state is in `run.json` / `calibrate.json` |
| r6-3 (NIT) | `adb-walk.ps1:45-46` and `:38`: two header sentences are stronger than the code. "replaced by <path> in everything the script writes or prints" is true for the driver's own sinks, but the parser's console line shows the absolute run-folder path (r5 NIT 4), and a folder shorter than 4 characters is not replaced by design. "the dev app was force-stopped and cold-started" is true only when the coldstart step or `-Calibrate` runs | **Recorded, not fixed.** Wording only |

Recorded items of rounds 2-5 that S6 found still as recorded: r2-7, r3 NIT 8 / 9, r4 NIT 4, r4 NIT 7, r4 NIT 9,
r5 NIT 4 (the parser lines 774, 796 and 1080 are of the same class as line 1070), M13.

What S6 did NOT verify: anything on Windows PowerShell 5.1 (this covers the provider-qualified `-Apk` resolution of
r6-1 trigger b, and `Remove-Item` on a directory or junction) - the `$false` branch of `Remove-LocalFile` by
execution (checked from the source only) - the parser and the device map against a round-5 copy - real adb client
error texts (whether a first stderr line of `shell`, `devices` or `start-server` can name a local path outside the
seven folders; S6 knows none) - whether `dumpsys meminfo` can hold an address (stored raw by design since M2) - the
owner's real values of `TEMP`, `USERPROFILE` and `LOCALAPPDATA`, and a real phone. One more observation of S6, not
counted and unchanged since round 5: with a provider-qualified `-Apk`, adb gets a relative path that it resolves
against the process directory (the name guard still applies).

### FINAL VERDICT (2026-11-13, the lead of Tooling R6): CLEAN AT ROUND 6 (#1519) - the batch is delivered
| Round | Reader | MAJOR | MINOR | NIT | Result |
|---|---|---|---|---|---|
| r1-r5 | S1-S5 (2026-11-12) | 0 in every round | 14, 7, 3, 2, 1 | 9, 14, 14, 9, 6 | see the table of 2026-11-12 above |
| r6 | S6 over the round-5 fixes (2026-11-13) | 0 | 1 | 2 | **CLEAN at r6 by #1519**; all three findings recorded, none fixed |

- Protocol: as in rounds 1-5 - one security-only reader, a FRESH read-only Claude Fable 5.2 instance at high effort
  (#1471; the Agent tool call named the model `fable` and the effort `high`; the reader named its own model as Claude
  Fable 5.2). The reader got the brief and the files, never the lead's chat. Read-only is by instruction; the lead
  proved it by the hashes before and after.
- The delivered files are byte-identical to what S6 read: the three SHA256 values of the table above are the values
  of Damir's PC tree before the round, after the round and at the export (2026-11-13). Tooling R6 changed no file
  under `scripts/`.
- The rule that makes this CLEAN is Damir's exception for this batch (#1519): 0 MAJOR in round 6 = CLEAN, with the
  round-6 findings recorded. Without that ruling an open MINOR whose fix no reader has read would be "CLEAN not
  claimed" (`docs/process.md` loop step 7). The limit of 5 rounds stays the rule for every other batch.
- Recorded, not fixed - the full list: r6-1, r6-2, r6-3 (above) - the heads-up notification exposure (r2-7) - the
  check-then-act gap of taps / BACK and the limits of `dnd` (r3 NIT 8 / 9) - a serial that is a sub-word of an output
  name (r4 NIT 4) - the stale-lock takeover race (r4 NIT 7) - no size cap on what the phone returns (r4 NIT 9) - the
  parser's console line with the absolute path (r5 NIT 4) - the Task Scheduler line is not registered (M13).
- Not proven on the phone (unchanged since 2026-11-12): `-KillRenderer`, `-Apk`, the Ctrl+C restore on a Windows
  console, the pending-restore path, the TCP refusal, the lock.
- Gates on the final files (2026-11-13): no seed address of `walk.local.json`, no base58 word of 30-60 characters
  and no serial-shaped word in any file of the commit (the new files whole; the added lines of the changed docs);
  the words `addApiUser`, `walletPassword` and `Authorization` occur in the commit only here, as the names of this
  gate; no app file in the commit; the repeatability rule of #1530 is met by runs A and B in 25 of 25 rows. No smoke run (no app
  file changed). C# uncompiled: none.
- Note on § 1 and § 2 of this brief: the two files under `local-example/` were in the readers' tree only. They are
  not in the repo. The Task Scheduler note is in `docs/handoff-2026-11-13-tooling.md` § 5.
