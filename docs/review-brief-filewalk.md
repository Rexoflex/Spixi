# Review brief — filewalk: the file seed (Seed 54–56) and five new adb walk steps (#1665–#1679)

File name: `docs/review-brief-filewalk.md`. Work order for the #46 loop of Session "File chats and walk steps 3"
(2026-11-16). Written BEFORE round 1. Readers by Damir's standing rule **#1606**: the security-only pass and the
reader of the riskiest file (`scripts/device/adb-walk.ps1`) are fresh read-only **Claude Fable 5.2** instances; every
other reader is a fresh read-only **Claude Opus** instance; all at high effort; no fallback below the named model —
stop and report. Round 1: three auditors with disjoint scopes + one break-my-verdict reader. Every later round: one
fresh break-my-verdict reader (Fable 5.2, security) over the fixes. Not CLEAN at round 5 → stop. Verdict: § 5.

## 1 · What the batch is
Rulings #1601 and #1607 (Damir, 2026-11-16): "we need to test everything and optimize"; the seed kinds "Documents,
Many photos, Voice messages"; video is not in the scope; walk steps for the file chat, the large photo chat, a sent
message, a live message, the image viewer and the Downloads screen. Rule #1534: measured first — nothing is tuned.

| Item | What landed | Files |
|---|---|---|
| S · the file seed (P55) | Developer builds only (`#if SPIXI_DEV_COEXIST`): seed index 53 "Seed 54" (documents, received + sent), 54 "Seed 55" (inline voice rows + voice files), 55 "Seed 56" (100 messages, 96 photos). The image seed's disk rules: C# names every file from the seed index; a temp leaf in `Sent/`, then a move; keep / refuse / delete only by the SHA-256 of our deterministic bytes; the unseed removes the contacts and then their files | `Spixi/Utils/SDevSeed.cs`, `Spixi/Utils/SDevSeedPlan.cs`, `scripts/csh/FileWalkSeedTests.cs`, `scripts/pins-filewalk/a-file-seed.mjs`, the re-based keys of `scripts/pins-perfb1/e-image-seed.mjs` |
| W · the walk driver | Five opt-in steps `scroll-files`, `scroll-voice`, `scroll-photos`, `viewer`, `downloads`; local keys `fileChatAddress`, `voiceChatAddress`, `photoChatAddress`; new count-poll gates; the new `a52s.json` keys stay absent until a calibrate run | `scripts/device/adb-walk.ps1` (`a52s.json` unchanged) |
| P · the walk parser | The rows of contract § 3.4; a step not in the run adds no row (byte-identical `summary.csv` on the run of 2026-11-16 14:10) | `scripts/device/adb-walk-parse.ps1` |
| T · pins | `scripts/pins-filewalk/b-walk-steps.mjs`; the re-based script hashes of `scripts/pins-perfb1toggle/b-walk.mjs` (#1596); one registration block in `scripts/smoke-test.mjs` | as named |

Not built, and why (DECISIONS rows of this batch): `send` (typing needs `input text`, forbidden by ✅ #1522 ②; no
log line marks the bubble; a seed chat is not network-silent) · `live` (no existing input delivers a live row without
a real network peer) · the viewer's "time to the full view" (no log line) · video rows (not in the scope).

## 2 · How to run
- Tree: `/home/claude/spixi`, branch `work/filewalk`, the WORKING TREE (uncommitted). Base `redesign/frontend` @
  `efcde241` ("Merge pull request #9 from Rexoflex/work/perfb1toggle"). The diff: `git -C /home/claude/spixi diff
  efcde241 -- Spixi scripts` plus the untracked files (`git status --short`). The contract `docs/contract-filewalk.md`
  is the claim to attack (§ 3 interfaces, § 6 mechanism facts).
- Baseline on the untouched base in this cloud twin (2026-11-16): `BASELINE OK — 6463 pass / the 2 KNOWN` · CSH
  `pass=600 fail=0` · gates ✓ · tools jsdom 29.1.1, .NET SDK 10.0.115, PowerShell 7.4.6. Ixian-Core @ `097341a` at
  `/home/claude/Ixian-Core` (read-only).
- A reader READS. It may run the pin modules, the C# harness and `pwsh` dry runs with a fake adb (the test hook
  `ADBWALK_ADB`) in a COPY of the tree under `/home/claude/_review/<its name>/`, and only while `pgrep -f
  smoke-test.mjs` prints nothing. It never contacts a phone or a real adb, installs nothing, changes no file of the
  tree. The real run folder `/home/claude/scratch/run-20261116-1410` is read-only. ⚠ `SDevSeed.cs` is compiled by no
  machine in the cloud: read it as a compiler would (the pure half compiles in the harness).

## 3 · Auditor scopes (disjoint)
| Auditor | Model | Scope | Focus |
|---|---|---|---|
| S-walk (security-only, the riskiest file) | Fable 5.2 | `scripts/device/adb-walk.ps1` (the diff first, then every function it touches), `a52s.json` | #1522 holds: every NEW adb command shape against the allowlist (exact strings; can a key value, a coordinate or a step name reach a command?); the gates on the Account screen (a wrong tap must get NO second input; `Reset-AppToChats`); no screenshot on Account or Wallet; which PNG is kept and what it can show (viewer, Downloads, calibrate); the masks cover the three new local keys in every file and console line; a foreign window (the OS chooser) gets no input; no new line passes the phone filter (`$script:LogRe` unchanged); old steps byte-identical in behaviour |
| S-seed (security-only) | Fable 5.2 | `Spixi/Utils/SDevSeed.cs`, `Spixi/Utils/SDevSeedPlan.cs` (the new code), `scripts/pins-filewalk/a-file-seed.mjs` | where the seed writes files and what it deletes: every path from the app's roots + plan names (no WebView value, no peer name); the content proof before every keep / delete; a foreign file never overwritten, adopted or deleted; the sweeps of `Sent/`, `Voice/`, `Downloads/` against our rows; log lines carry types only; dev builds only (a store build holds none of it); no network call |
| C-seed (correctness) | Opus | the same two C# files + `scripts/csh/FileWalkSeedTests.cs` + the re-based keys of `e-image-seed.mjs` | the rows are the app's own shapes (a received file is "complete, on this device"; a sent row has `completed` before `filePath`; inline voice passes `tryParseInline`; the ogg passes `tryDemuxOgg`); ≤ `MaxPlan`; fixed times older than every Seed 01–50 message; Seed 01–53 values byte-identical; idempotent re-seed in one process; the unseed leaves nothing of ours |
| C-parse (correctness) | Opus | `scripts/device/adb-walk-parse.ps1`, `scripts/pins-filewalk/b-walk-steps.mjs`, the re-base of `scripts/pins-perfb1toggle/b-walk.mjs` | old rows byte-identical (rerun on a copy of the real folder); the windowed rows (`stamp2`); "no data" + exit 2 per removed line; no raw line copied; PS 5.1 syntax; the pins hold what they claim (mutate one token) |
| B (break-my-verdict) | Fable 5.2 | the whole diff, no knowledge of the auditors' findings | break § 1 end to end: one way a new step damages the phone, the TEST account, the store app or the PC; a new step's file holding Wallet / Account data or an unmasked address; a seed write or delete outside our files; a number written from a line that is not the step's own |

Finding classes: **MAJOR** = a path that can damage the phone, the account, the store app or the PC · a second input
on the Account screen after an unproven tap · a kept file with Wallet / Account data or an unmasked address · a seed
file call that can touch a file that is not ours · new code in a store build · a changed old row or a changed Seed
01–53 value · a number from a foreign line. **MINOR** = a real defect without these effects. **NIT** = wording, style.
CLEAN = 0 MAJOR, and every MINOR fixed or recorded with its reason.

## 4 · Round log
### Round 1 (2026-11-16; the first working version; five readers by #1606)
| Reader | Model | Verdict |
|---|---|---|
| S-walk (security, the riskiest file) | Fable 5.2 | 1 MAJOR · 3 MINOR · 4 NIT |
| S-seed (security) | Fable 5.2 | 0 MAJOR · 4 MINOR · 2 NIT |
| C-seed (correctness) | Opus | 1 MAJOR · 1 MINOR · 3 NIT |
| C-parse (correctness) | Opus | 2 MAJOR · 1 MINOR · 1 NIT |
| B1 (break-my-verdict) | Fable 5.2 | 2 MAJOR · 2 MINOR · 3 NIT |

| id | class | what | action |
|---|---|---|---|
| S-W-1 | MAJOR | `Reset-AppToChats` ignores the exit of `am force-stop` / `am start -W`; the failed rep leaves `LastFailed`, so the next rep sends BACK with the Account screen in front (a dry run with a failing force-stop) | fixed: `Invoke-FileReset` proves the restart by a NEW single pid, our focus and a fresh home check; a proven restart clears the recovery flags; not proven → the run halts, no more input |
| S-W-2 | MINOR | the `tabAccount` tap of `downloads` is outside the `try` | fixed: inside the `try` |
| S-W-3 | MINOR | (a) the pre-check / chat checks photograph whatever our app shows (deleted after the probes); (b) a probe read that throws leaves the PNG | fixed: delete in a `finally`; a sweep of the new steps' PNG names at the step end and in the main `finally`; wording "no PNG is kept" |
| S-W-4 | MINOR | the local keys pass only a base58 shape check; `viewer` taps inside that chat | fixed: the script derives the dev-seed addresses itself (`addressFor` = SHA-256 of a fixed text + the SHA-512² checksum, base58; proven against the ten real seed addresses) and refuses a key that is not the expected seed address |
| S-W-5 | NIT | the frozen `Reset-AppToChats` prints "tab step" for the new steps | recorded: the body is hash-pinned (#1596); the new steps print their own line before it |
| S-W-6 | NIT | contract § 3.3 does not name `cal-14` | fixed in the contract |
| S-W-7 | NIT | `cal-17` shows the newest downloads; "the seed's files" holds right after a fresh seed only | fixed: a console and `calibrate.json` note |
| S-W-8 | NIT | calibrate sends BACK after a failed viewer gate | fixed: no BACK; `cal-16` decides |
| S-S-1 | MINOR | `File.Move` on Unix = `newfstatat` + `rename` (no atomic no-replace): a file that lands in that window is replaced | fixed for the new code: the content proof again after the move; a row only for `ours`. The image seed's comment keeps the old claim (recorded) |
| S-S-2 | MINOR | a foreign file under our name on a top-up keeps the old row of an earlier seed | recorded (the image seed has the same shape; bounded by the size check of `FileMatch` and the content proof of the unseed) |
| S-S-3 | MINOR | pins a2 / a11 match token lists; added statements stay green | fixed: key a17 freezes the whole normalised bodies of the seven glue methods |
| S-S-4 / C-S-2 | MINOR | the unseed leaves the per-contact stores (`SVoicePlayed`) | fixed: `SPeerLocalStores.forget` (it clears only `SAppJoins`, `SVoicePlayed`, `SPhotoGroups` of that peer) |
| S-S-5 / C-S-3 / C-S-4 | NIT | out-of-date header and comment texts; pin e message texts | fixed (text only) |
| S-S-6 | NIT | the content proof means "the same bytes", not "we wrote it" | recorded (#1567 has the same property) |
| C-S-1 | MAJOR | a re-seed after the 100-message chat was opened duplicates its rows (Core's list = the ~51-row load window) | fixed: a present chat whose NEWEST plan id is in Core's list is skipped (`SDevSeedPlan.chatComplete`, CSH model test with a 51-row window, pin a18) |
| C-S-5 | NIT | `status()` calls `fileChatsPresent()` twice | recorded (hash-pinned body; harmless) |
| C-P-1 | MAJOR | pin b8 / b9 `SHOT` is anchored at the line start: `$local = Save-Shot …` between the Account tap and the gate stays green | fixed: any call form; a key that new functions take a screenshot only through the check functions; the mutations as deliberate breaks |
| C-P-2 | MAJOR | pin b10 compares rows by (name, unit, required): a swap to the unwindowed definition stays green (the row then counts the open's lines) | fixed: the referenced `…WDef` names and the exact stamp2 statements are pinned |
| C-P-3 | MINOR | "a −1 dt / first is no value" is not pinned | fixed: a b10 key |
| B1-1 | MAJOR | `-Calibrate`: after a failed cal-11 the new `Invoke-CalFileTaps` still taps `tabAccount`, proven "home" only by a STALE cal shot; with a restart that did not take effect the tap lands on Account (fake adb) | fixed: a failed cal-11 stops the new tries (`$skip12`); a fresh home check right before the `tabAccount` tap |
| B1-2 | MAJOR | `downloads`: the `tabAccount` tap is outside the `try` (also S-W-2); a tap delivered while adb reports a failure gets no restart, the next rep sends BACK and takes a pre-check PNG on Account (the old `tab-account` step has the same shape — recorded for it, not changed) | fixed for the new steps: the `tabAccount` and `photoTile` taps inside the `try` |
| B1-3 | MINOR | the log pull comes before the logcat mirror delivers the lines (real run: median 0.69 s, 10 % > 2 s): half sums with `RESULT: OK`; the viewer close rows "no data" in about half the reps | fixed: a bounded count poll (≤ 4 s) of the step's last expected line before the pull (for the chat steps not closed in r1: B2-3) |
| B1-4 | MINOR | the calibrate run cannot give the two new tap points (cal-14 needs `photoTile`; no PNG of Account is ever kept) | partly fixed: cal-14 is taken without a tap when the image key and `screens.chat` exist. `accountDownloads`: recorded — its value needs a method that keeps no Account picture (§ 6 of the handoff; a wrong tap on a toggle row of the hub changes a setting before the gate fails) |
| B1-5 | NIT | calibrate keeps cal-17 (newest downloads) | fixed: a note; the operator block says "Remove the seed, then Seed, then calibrate" |
| B1-6 | NIT | `date …; input keyevent 4` (the stamped BACK) is a new command string of two allowlisted pieces | fixed in the contract |
| B1-7 | NIT | `status()`'s old final `return` is unreachable | recorded (hash-pinned body) |
| C-P-4 | NIT | `stamp2` equal to `t0` is accepted | fixed: `-le` → "stamp2 not readable" |

### Round 2 (2026-11-16; the r1 fixes; one fresh break-my-verdict reader B2, Fable 5.2)
Round-1 MAJOR: S-W-1, C-S-1, C-P-1, C-P-2, B1-1, B1-2 closed in the code (B2's dry runs and mutations). Verdict B2: **1 MAJOR · 4 MINOR · 3 NIT.**

| id | class | what | action |
|---|---|---|---|
| B2-1 | MAJOR (the r1 convention: a pin green under a one-token mutation that re-opens a MAJOR path) | the decisive guards of the S-W-1 / B1-1 fixes are held by no key: dropping `-not $script:Halted` at the two step ends, the `CalSkip12` return or its assignment, or the return after a failed cal-17a keeps 18/18 green (a fake run of one mutation sends BACK on Account) | fixed: pin keys for each guard as an exact statement |
| B2-2 | MINOR | the restart proof photographs Account when the pid BEFORE the restart cannot be read (an adb outage); calibrate's reset PNG is not swept | fixed: the pid is read at the rep start while adb is healthy; unreadable = not proven = halt without a screenshot; the calibrate reset PNG is deleted in a `finally` and swept |
| B2-3 | MINOR | every chat open writes its own `shell scroll … ms=0` line, so the mirror wait for ≥ 2 lines ended at once (B1-3 not closed for the chat steps) | fixed: the count is read before `stamp2` and the wait is for base + 2; `downloads` swipes newer first (the list opens at the top); the parser needs two scroll lines from `stamp2` on |
| B2-4 | MINOR | the post-move proof cannot see a foreign file that `rename(2)` replaced in the stat → rename window | recorded (#1672): the proof stays for the adopt direction; the comment says what it proves |
| B2-5 | MINOR | a present chat without its newest row still tops up through the ~51-row window; a refused middle row is called "complete" | fixed: a present chat with a non-empty list is never topped up — newest present = skipped, newest absent = "partial: Remove the seed, then Seed" (#1571) |
| B2-6 | NIT | stale texts in the contract, the brief and the pin header | fixed |
| B2-7 | NIT | the post-move proof rebuilds the bytes (≈ 2× the file half of the seed) | see the seed fix note |
| B2-8 | NIT | a screenshot through a NEW helper function between the Account tap and the gate stays green | fixed: a whole-file count of `Save-Shot` / `screencap` callers |

Cost before round 3 (lead-work-session § 4.10): MAJOR per round 6 → 1 (the one of round 2 is a pin hole; 0 MAJOR in a code path). One more round = one Fable 5.2 reader over the round-2 fixes (about 20 minutes, about 350 k tokens). The reader models stay as #1606.

### Round 3 (2026-11-16; the r2 fixes; one fresh break-my-verdict reader B3, Fable 5.2)
Round-2 findings: B2-1, B2-2, B2-3 (the reported case), B2-5, B2-7, B2-8 (as reported) closed — B3's dry runs (an adb outage of 1 to 9 commands, the real open line, delivery delays of 2 / 3.5 / 6 s) and mutations; the round-2 fixes broke nothing (old rows byte-identical, no new command shape, no tap without a stored pid). Verdict B3: **1 MAJOR · 2 MINOR · 3 NIT.**

| id | class | what | action |
|---|---|---|---|
| B3-1 | MAJOR (the r1/r2 convention: a pin hole; the code is correct) | the cal-17 gate chain of `Invoke-CalFileTaps` is held by no key: dropping one `-not` keeps 23/23 green, and a failed gate then keeps a PNG of Account and sends BACK there | fixed for the CLASS: key b24 freezes the whole normalised body of every new or changed function of both scripts (and the old helpers that run between the Account tap and the gate) by SHA-256, with exactly one definition each and no other new function |
| B3-2 | MINOR | the same hole for smaller mutations (calibrate and three walk gate statements) | fixed by b24 |
| B3-3 | MINOR (conditional; not seen on the phone) | "two scroll lines from `stamp2` on" counts lines, not swipes: a line the chat writes by itself (a layout shift from late thumbnails) plus swipe 1 passes while swipe 2's line is missing | recorded (#1672): direction — stamp the second swipe and need one line in each window; to be decided with the first real photo-chat log |
| B3-4 | NIT | the long-task rows of a rep pulled too early keep a partial count | fixed: `X-LongW` follows the two-line rule |
| B3-5 | NIT | a call of an old shot function added inside an old helper between the Account tap and the gate stays green | fixed by b24 (those helpers are frozen too) |
| B3-6 | NIT | the re-base note of `pins-perfb1toggle/b-walk` names a round-2 change that did not happen | fixed (text) |

Cost before round 4: MAJOR per round 6 → 1 → 1 (the MAJOR of rounds 2 and 3 are pin holes of one class; 0 MAJOR in a code path since round 1). b24 closes that class by a whole-body freeze instead of statement lists. Round 4 = one Fable 5.2 reader over the round-3 fix; round 5 is the last permitted.

### Round 4 (2026-11-16; the r3 fix; one fresh break-my-verdict reader B4, Fable 5.2)
Rounds 1–3 hold (71 of 74 earlier mutations red; 3 no longer apply; old rows byte-identical; a normal dry run exit 0, no PNG, no address). Verdict B4: **4 MAJOR · 3 MINOR · 1 NIT — all in the hand-written source normaliser of key b24; 0 MAJOR in a code path.**

| id | class | what | action |
|---|---|---|---|
| B4-1 | MAJOR (pin hole) | b24 collapses all white space, so one deleted newline (two statements joined into one command line) hashes the same; a dry run shows the probe check passing on a bad screen | fixed for the class: b24 hashes the RAW BYTES of both whole scripts — no normaliser |
| B4-2 | MAJOR (pin hole) | the comment stripper does not know strings: `'<#' … '#>'` hides code from the hash | fixed by the raw hash |
| B4-3 | MAJOR (pin hole) | old helpers on the path (`Test-CalShotScreen`, `Test-Probes`, `Assert-AdbCommand`, `Test-ShellAllowed`, …) were in no list | fixed by the raw hash |
| B4-4 | MAJOR (pin hole) | script-level code outside functions was not frozen (one added line un-windows the rows, or drops the phone filter) | fixed by the raw hash |
| B4-5 | MINOR | the text between `function Name` and `{` was not hashed | fixed by the raw hash |
| B4-6 | MINOR | `nal`, `[scriptblock]::Create`, a backtick line continuation, `Function` in capitals redefine a frozen function | fixed by the raw hash (any added line is red) |
| B4-7 | MINOR | more one-newline joins | fixed by the raw hash |
| B4-8 | NIT | the b24 message names wrong constants | fixed |

Lead's note (lead-work-session § 4.9): round 3 (statement lists) and round 4 (the normaliser) found two classes of holes in the same thing — a source pin built by hand. The fix does not patch the normaliser; it removes it. A raw-byte hash cannot be fooled by any edit, so the class ends; the semantic keys b1–b23 stay to say WHICH rule a red diff touches. Round 5 is the last permitted round.

### Round 5 (2026-11-16; the r4 fix; one fresh break-my-verdict reader B5, Fable 5.2 — the last permitted round)
b24 holds (raw bytes; CRLF, a trailing space, a BOM, the halt removed: all red; no second copy of a script, no symlink, no wrapper). The code: a single-fault sweep of `downloads` (95 runs) and of the calibrate tries cal-14..18 (87 runs) — 0 real violations; old rows byte-identical. Verdict B5: **0 MAJOR · 0 MINOR · 3 NIT.**

| id | class | what | action (no code change after the last round, lead-work-session § 4.8) |
|---|---|---|---|
| B5-1 | NIT | b24 is red on a CRLF copy (a false red, never a false green); `.gitattributes` sets `eol=lf` | recorded |
| B5-2 | NIT | the usage text says "from the tabAccount tap on, any failure restarts"; a failed log pull on the Downloads screen does not restart (the next inputs are still gated) | recorded; the contract text is corrected: "any failed input, gate or screen check restarts" |
| B5-3 | NIT | `Invoke-FileReset` has a parameter `$Why` and a local `$why` (one variable in PowerShell); correct today | recorded: rename the local at the next re-base |
| — | process | two short executions of B5 ran beside the lead's full smoke (L153); that smoke was green; the merged tree gets its own full smoke | noted |

## 5 · Verdict
**CLEAN at round 5** (MAJOR per round 6 → 1 → 1 → 4 → 0; every MINOR fixed or recorded with its reason in § 4 and DECISIONS #1672). The code files are committed exactly as the last reader read them (SHA-256, first 16 hex, equal to the reader's copy):
`scripts/device/adb-walk.ps1` 3b23056e52362fe8 · `scripts/device/adb-walk-parse.ps1` 41640c74098db71a · `scripts/device/a52s.json` af927945f2ad2d57 (= base) · `Spixi/Utils/SDevSeed.cs` f9e9506bf6a6a28a · `Spixi/Utils/SDevSeedPlan.cs` 9c8f93332d879c5b · `scripts/csh/FileWalkSeedTests.cs` 4217ecb39c271c2b · `scripts/pins-filewalk/a-file-seed.mjs` 643b761458543bd9 · `scripts/pins-filewalk/b-walk-steps.mjs` 79de7d7179426001 · `scripts/pins-perfb1toggle/b-walk.mjs` ae01fb1e9e5322d5 · `scripts/pins-perfb1/e-image-seed.mjs` 767b2f2723a39936 · `scripts/smoke-test.mjs` 1daa658f60e79e14.
Smoke after the last code fix: `BASELINE OK — 6505 pass / the 2 KNOWN` (= 6463 + 42) · CSH `pass=611 fail=0`.

**After the verdict (2026-11-17, the operator block, #1674):** `scripts/device/a52s.json` is no longer the base file: commit `fcc247f` adds `taps.photoTile` and `screens.viewer` from the calibrate runs (SHA `c6947496…`), and pin b6 is re-based to it. A fresh reader (Claude Opus, #1606) read that change: CLEAN, 0 MAJOR (MINOR 2 recorded in #1674). The two walk scripts are unchanged (`3b23056e…`, `41640c74…`).
