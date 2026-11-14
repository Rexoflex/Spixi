# Review brief — walksteps2: more steps for the adb walk (#1550–#1553)

File name: `docs/review-brief-walksteps2.md`. Work order for the #46 loop of Session "Walk steps 2" (2026-11-13).
Written BEFORE round 1. The prompt (`claude/session-walksteps2-prompt.md`, Gates) asks for ONE security-only reader per
round: a fresh, read-only **Claude Opus** instance at high effort (#1533: a batch that changes no app file has Opus
reviewers; no fallback to a lower model). A MAJOR → fix → a fresh reader. Not CLEAN at round 5 → stop. The verdict
with the SHA256 of the files the reader read is in § 5.

## 1 · What the batch is
| Item | What landed | Where (files) | DECISIONS |
|---|---|---|---|
| New steps | `resume-now`, `resume-3s` (60 s in the background, then the chat tap at once / after 3 s; the old `resume` = after 2 s, unchanged) · `chatinfo` (seed chat by the `fa` intent, then a tap on the chat header: Chat info opens; BACK twice) · `tab-apps`, `tab-wallet`, `tab-account` (a tap on one bottom tab, then a tap on Chats; the screenshot only on Chats) · `history` (a 1000-message seed chat by `fa`, swipes to older until the chat shell asked for 3 older pages or 40 swipes; BACK) · `scroll-image` (NOT in the default list: like `scroll`, in the chat named by the optional local key `imageChatAddress`) | `scripts/device/adb-walk.ps1` | #1550, #1551 |
| A screen check before the input | Every new step takes a screenshot before its input (`shot-<step>-NN-pre.png`) and checks the pixel probes; a failed check = `no-screen`, no input | `adb-walk.ps1` `Invoke-PreCheck` | #1550 |
| One new piped command | `logcat -d -v threadtime -s DOTNET:I \| grep -c -e P1..shell.send.loadmore` — a COUNT only (the same class as the existing boot poll), compared as a whole string | `adb-walk.ps1` `$script:LoadPollCmd`, `Initialize-Allowlist` | #1550 |
| -Calibrate tries the new taps | `cal-08..13`: chat info, the three tabs (no screenshot on Apps / Wallet / Account), the history swipes | `adb-walk.ps1` `Invoke-CalNewTaps` | #1550 |
| Parser rows | The rows of the new steps; the old rows unchanged (byte-identical `summary.csv` on an old run is checked) | `scripts/device/adb-walk-parse.ps1` | #1551 |
| Device map | Five tap points (`chatHeader`, `tabChats`, `tabApps`, `tabWallet`, `tabAccount`), one swipe (`historyOlder`), the screen `chatinfo` (four probes), four timing keys (`tabSettleMs`, `historySwipeMs`, `historyMaxSwipes`, `resumeLateTapMs`) | `scripts/device/a52s.json` | #1550 |
| r6-1 of batch `tooling` (MINOR) | `Protect-Text` uses a folder value for `<path>` only when it is absolute (drive letter, UNC or a POSIX root) | `adb-walk.ps1` `Test-RootedDir`, `Protect-Text` | #1552 |
| r6-2, r6-3 (NIT) | "deleted" only when the delete worked; two header sentences made exact | `adb-walk.ps1` | #1552 |

Not built, and why: live message arrival and album arrival (need a scripted peer; #1538) · a "go to" verb, a new log
line, dev-seed data (gate triggers / app changes; #1521) · the image seed (session `perfb1`) · the Task Scheduler entry.

## 2 · How to run
- Tree for the reader: the three files under `scripts/device/` of the session's clone (branch `work/walksteps2`, base
  `redesign/frontend` @ "Merge pull request #4 from Rexoflex/work/docs-2026-11-13") and `git diff` against the base.
  No app file is in the diff.
- No PowerShell interpreter is in the cloud container (the install was refused by the session's permission policy).
  The checks ran on Damir's PC under Windows PowerShell 5.1: the parse check, an ASCII check, the old-run regression,
  the parser proofs, the try run. Their result file is quoted in § 5 by the lead.
- The reader READS. It runs nothing against a phone and installs nothing.

## 3 · Auditor scope (ONE reader per round, security only)
| Auditor | Scope (files) | Focus |
|---|---|---|
| S | `scripts/device/adb-walk.ps1`, `adb-walk-parse.ps1`, `a52s.json` — the diff against the base first, then the whole files where the diff touches shared code | (1) **what the outputs can leak** — the new screenshots (`-pre`, `chatinfo`, the tab steps), the new `run.json` fields (`shotPre`, `swipes`), the new `walk.local.json` key `imageChatAddress` (is it masked everywhere a seed is?), the pulled logs of the new steps · (2) **what the script can do to the phone** — every new command shape against the allowlist of #1522 (the new piped count, the new taps and swipe, the `fa` intent with the image address), the new tap paths (which screen can a tap at a tab or header point hit when the screen is not the expected one; BACK twice; the Wallet and Account tabs; the store app), state left behind · (3) **what the script can do to the PC** — new file names, the parser's new `run.json` field, path handling · (4) **the r6-1 fix** — does `Test-RootedDir` close the mask cut for TEMP / USERPROFILE / LOCALAPPDATA / `-Apk`, on Windows PowerShell 5.1 and PowerShell 7, and does it open anything (a rooted value that still cuts a mask, a value that is no longer replaced) · (5) **the app's security handover gate** — the batch must add no verb, log line, `spixi.*` key, WebView setting or fetch to the APP |

Finding classes: **MAJOR** = a real leak of a secret / address / account datum into a place that can leave the PC, a
command path that can damage the phone, the TEST account, the store app or the PC, or a broken restore; **MINOR** = a
hardening gap with a concrete mechanism; **NIT** = wording. Every finding carries `file:line` and the mechanism.

## 4 · Non-negotiables and accepted dials
- Must hold: everything of #1522 (one pinned package; the allowlist; the log filtered on the phone and NOT made wider;
  the masks; the focus check before every tap, swipe, BACK and screenshot; the restore) · no app file changed · no
  address, serial or credential in the repo · a number is never guessed ("no data", exit 2).
- Accepted (do not re-open): everything accepted in `docs/review-brief-tooling.md` § 4 · the recorded items of that
  brief § 5 (r2-7, r3 NIT 8 / 9, r4 NIT 4 / 7 / 9, r5 NIT 4, M13) · the Chat info screenshot shows a dev-seed contact
  (fixed fake name, a middle-cut address of a dev-seed contact — a hash of a fixed text, `Spixi/Utils/SDevSeed.cs`) and
  stays in the git-ignored folder · the tab steps open Wallet and Account (TEST account data on screen, never in a
  screenshot) · the new steps run after the old ones (#1550).

## 5 · Verdict
(the final verdict is written at the end of this section when the loop closes)

### Round 1 (2026-11-13) - reader S1, a fresh read-only Claude Opus instance, high effort: 1 MAJOR - 3 MINOR - 3 NIT
Files read: `a52s.json` `af927945…`, `adb-walk-parse.ps1` `d36deaba…`, `adb-walk.ps1` `9c3f8678…`. All seven were
fixed in the driver by a Sonnet builder (fix round, #1533); the parser and the map did not change. Round 2 attacks the fixes.
| Id | Finding (mechanism) | Fix claimed |
|---|---|---|
| r1-1 (MAJOR) | The rule "Wallet / Account never in a screenshot" rested on the 1500 ms timer only: a lost or early Chats tap (Account = a pushed SettingsPage with the account address and QR) left Wallet or Account in front, the focus check passed (same activity), and `Invoke-ShotCheck 'home'` KEPT the PNG whose probes failed (kept on purpose as calibration evidence); a recovery could leave Wallet up and `Invoke-PreCheck` kept that PNG too; the same gap in cal-11 | Count-poll gates on the app's own frames lines (five whole constant strings in `PipedCmds`, a count only): the Chats tap goes out only after `shell frames-tab-<x>` (and for Account `frames open-settingspage`), the screenshot only after `shell frames-tab-chats`; a timeout = no tap back, no screenshot. A tab-step screenshot that fails its home check is deleted (`-DropOnFail`); every failed pre-check PNG is deleted; cal-11 uses the same gates and is deleted when it is not home |
| r1-2 (MINOR) | The Chats tap on a SettingsPage whose nav is not built yet hits Settings content | The `frames open-settingspage` gate before the Chats tap |
| r1-3 (MINOR) | -Calibrate: the cal-11 tab taps and the cal-12 swipes were not gated on a screen check (a chat left open after cal-10 → taps into the composer) | cal-11 only after the last screenshot passed its home check; cal-12 only after `cal-12a-history-before.png` passed its chat check (deleted when it is neither chat nor home) |
| r1-4 (MINOR) | `imageChatAddress` accepts any address: before the image seed exists, `scroll-image` could photograph a real chat | `scroll-image` keeps no PNG; the header says the address must be a dev-seed chat |
| N1 | "New steps take a screenshot before the input" was not true for resume-now / resume-3s | Header made exact |
| N2 | -Calibrate used `Get-Seed 0 / 5` without `Get-SeedGap` (the image address could stand in) | `Get-SeedGap` decides |
| N3 | `Test-RootedDir` no longer replaced a root-relative Windows value | `^[\\/][^\\/]` |

### Facts from the PC and the phone before round 1 (2026-11-13, Windows PowerShell 5.1.26100, the files of round 1)
- Try run `Claude outputs/adbwalk/20261113-1814` (`-Steps resume-now,resume-3s,chatinfo,tab-apps,tab-wallet,tab-account,history,scroll-image -Repeats 1`): every new step `ok`; `scroll-image` without `imageChatAddress` = `skipped` → "no data" in its 3 required rows, `RESULT: NO DATA in 3 rows`, exit 2.
- `-Calibrate` runs `calibrate-20261113-1726` (old script) and `-1730` (with `Invoke-CalNewTaps`): every probe check `ok`; history: 3 page requests after 8 swipes.
- Parse check 0 errors and 0 bytes above 127 in both scripts; the new parser and the base parser give the same `summary.csv` (SHA256 `4be7c826…`) on a copy of the old run `20261112-1919`; summary.md differs only in the parse time and the five added legend lines.
- Parser proofs (a copy of the try run, `stepsRequested` = the one step, one line removed): exit 2 in each of the 7 new steps, "no data" exactly in the rows that read the removed line; the unbroken copy without `scroll-image`: exit 0.

### Round 2 (2026-11-13) - reader S2, a fresh read-only Claude Opus instance, high effort: 1 MAJOR - 3 MINOR - 1 NIT
Files read: `a52s.json` `af927945…`, `adb-walk-parse.ps1` `d36deaba…`, `adb-walk.ps1` `24d661e1…`. S2 found r1-2 and N3
closed; r1-1, r1-3, r1-4, N1 and N2 closed in the walk but partly open in -Calibrate or in wording. All five new
findings were fixed in the driver by a Sonnet builder (fix round 2). Round 3 attacks the fixes.
| Id | Finding (mechanism) | Fix claimed |
|---|---|---|
| r2-1 (MAJOR) | -Calibrate: after a cal-11 gate timed out (Wallet or the SettingsPage still in front), cal-12 still ran (fa opens chat 5 over it, the chat check passes), BACK closed the chat, and `cal-13-home-after-history.png` was saved with no check and KEPT | cal-12..13 are skipped when cal-11 failed or was skipped; cal-13 and cal-12 are checked at once and deleted when they are not the expected screen (cal-12: neither chat nor home) |
| r2-2 (MINOR) | tab-account: the settings page's own nav writes `shell frames-tab-chats` for the Chats tap, so the gate proved the tap, not the close; the screenshot could catch the sliding SettingsPage (only the probe check then saved it from being kept) | A sixth count poll on the C# line `[P1] close settingspage done`; for tab-account the screenshot waits for it and for the Chats line (timeout = no screenshot); the same in cal-11 |
| r2-3 (MINOR) | `Test-CalShotScreen` passed any PNG of the right size on a map whose screen is not calibrated (0 probes → 0 ≥ 0) | It returns false when `Get-ScreenGap` names a gap |
| r2-4 (MINOR) | `Invoke-Calibrate` cal-02..04 used `Get-Seed 0` without `Get-SeedGap` (the image address could stand in) | `Get-SeedGap 0` decides |
| r2-5 (NIT) | Header: scroll-image takes no screenshot before its input; the gate sentence was not exact | Header made exact |

### Round 3 (2026-11-13) - reader S3, a fresh read-only Claude Opus instance, high effort: 1 MAJOR - 0 MINOR - 0 NIT
Files read: `a52s.json` `af927945…`, `adb-walk-parse.ps1` `d36deaba…`, `adb-walk.ps1` `ec6219e5…`. S3 found r2-1 to r2-5
closed and every round-1 fix still in place. The one new finding was fixed in the driver by a Sonnet builder (fix
round 3). Round 4 attacks the fix.
| Id | Finding (mechanism) | Fix claimed |
|---|---|---|
| r3-1 (MAJOR) | A tab rep that failed AFTER its tab tap (a gate timeout, a failed Chats tap, a stamp error) left the tab in front: the recovery's one BACK is `MoveTaskToBack` on the Wallet tab and `am start -W` resumes the same Wallet view (`HomePage.xaml.cs:5942-5952`); the next run's resume / chat-tap then taps `chatRow1` on Wallet and keeps the failed PNG (Wallet or a tx detail of the TEST account). The same after a cal-11 failure | `Reset-AppToChats` (`am force-stop` + `am start -W`, the allowlisted coldstart pair; a cold start lands on Chats) after any failure of a tab rep once its tab tap went out, after a tab screenshot that failed its home check, and after a failed cal-11; resume-now / resume-3s delete a failed screenshot (`-DropOnFail`); the old steps are unchanged |

### Round 4 (2026-11-13) - reader S4, a fresh read-only Claude Opus instance, high effort: 0 MAJOR - 1 MINOR - 3 NIT
Files read: `a52s.json` `af927945…`, `adb-walk-parse.ps1` `d36deaba…`, `adb-walk.ps1` `94979c23…`. S4 found r3-1 closed
for every failure that raises inside the tab rep (walk and -Calibrate; the bare `throw` keeps the status; no restart
loop; old steps unchanged) and every round-1 and round-2 fix still in place. **Its findings are recorded and NOT fixed:
a fix would need a reader in round 5, the last round of the limit, and none of them is a MAJOR.**
| Id | Finding (mechanism) | State |
|---|---|---|
| r4-1 (MINOR) | Two paths still leave a tab in front: (a) the tab tap's own `Invoke-ShellReq` throws (a 60 s timeout or an adb transport error) — it is outside the `try`, so no restart; (b) Ctrl+C or a closed console between the tab tap and the Chats line (the `finally` runs only Restore-Phone). A LATER run that starts without coldstart (`-Steps resume` or `chat-tap`) would then tap `chatRow1` on Wallet, and those old steps keep a failed PNG | **Recorded.** Needs an adb fault or an operator interrupt during a tab step AND a later run with a custom step list that has no coldstart. The default list starts with coldstart (`am force-stop`, a cold start lands on Chats). **Operator rule (handoff § 1): after a walk that stopped during a tab step, start the next run with the default step list or with `coldstart` first.** Proposed fix for a later batch with its own reader: the tab tap inside the `try`, and a `TabUp` flag that `Restore-Phone` answers with `am force-stop` |
| r4-2 (NIT) | In -Calibrate the restart after a failed cal-11 gives a new pid, so `cal-log.txt` (filtered by pid) loses the earlier lines | Recorded (evidence quality only, no leak) |
| r4-3 (NIT) | The header says the app is force-stopped only by coldstart or -Calibrate (a failed tab rep now does it too); the restart's console text says "tab rep" also in -Calibrate | Recorded (wording) |
| r4-4 (NIT) | cal-11 restarts the app also when it failed before any tab tap (a count poll or a foreign window at the first tap) | Recorded (harmless: the recovery sends the same `am start` over a foreign window today) |

### VERDICT (2026-11-13, the lead of Session "Walk steps 2"): CLEAN at round 4
Protocol: one security-only reader per round, each a FRESH read-only Claude Opus instance at high effort (#1533; no
fallback model); the lead verified the findings it acted on against the tree; fixes by Sonnet builders (fix rounds,
#1533); a fresh reader over the fixes each round.
| Round | Reader | MAJOR | MINOR | NIT | Result |
|---|---|---|---|---|---|
| r1 | S1 over the first build | 1 | 3 | 3 | all fixed |
| r2 | S2 over the r1 fixes | 1 | 3 | 1 | all fixed |
| r3 | S3 over the r2 fixes | 1 | 0 | 0 | fixed |
| r4 | S4 over the r3 fix | 0 | 1 | 3 | recorded, not fixed (reason above) |

CLEAN = 0 MAJOR in the last round and every MINOR fixed or recorded with its reason. The three files are committed
exactly as S4 read them: `scripts/device/adb-walk.ps1` SHA256
`94979c23cd3e1e15ee0856f69b1127e6d02650d865f370c674f081fd15b86b04` · `scripts/device/adb-walk-parse.ps1`
`d36deaba44c3c5eeb4ed3129a3a5b264dae33a4a71adecb57d5feb8bcda77e23` · `scripts/device/a52s.json`
`af927945f2ad2d57332126ee07bec1262ef7c50887cd59d9baa7632d6f494e9c`. The repeatability runs of operator block 2 ran
on exactly these files (the status doc names the run folders).
Recorded, not fixed: r4-1 (with the operator rule above), r4-2, r4-3, r4-4; and everything recorded in
`docs/review-brief-tooling.md` § 5.
