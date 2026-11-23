# Agent contract — walktools

File name: `docs/contract-walktools.md`. The lead wrote it BEFORE any agent started (`docs/orchestration.md` § 4).
Every agent gets this file plus its own row. An agent that needs a file outside its row stops and asks the lead.
Prompt: project doc `claude/session-walktools-prompt.md` (prompt v1, 2026-11-22). Mechanisms: `docs/walktools-mechanisms.md`.

## 1 · Base
- Tree: `work/walktools` from `redesign/frontend` @ `338d30f4` ("Merge pull request #18 from Rexoflex/work/defaultsb") ·
  baseline (this twin, 2026-11-22, `TZ=America/Los_Angeles`): the two `--check` gates ✓ · CSH `pass=806 fail=0` · smoke: see the
  status doc · tools: jsdom 29.1.1 · eslint 10.14.0 · globals 17.14.0 · tree-sitter 0.25.1 · tree-sitter-c-sharp 0.23.5 (L160) ·
  .NET SDK 10.0.115 · Ixian-Core @ `097341a` (sibling) · PowerShell 7.4.6 (`/usr/local/bin/pwsh`, Linux; Damir runs Windows
  PowerShell 5.1 — a script run here is "executed on pwsh 7.4.6", never "proven on the phone").
- Must hold for everyone: the PARAMOUNT isolation invariant · C# touches no risky parts · the frozen bridge · no app
  behaviour change (this batch changes test code, the walk scripts and dev-only seed data) · edit only your row's files ·
  no commit, no push, no full smoke (L153), nothing in Ixian-Core · NO typed input into the app (#1522 ②), no new verb, no
  new entry into the app, the adb allowlist does not grow · no tool that makes or changes a scheduled task.
- Each agent works in its OWN git worktree (`/home/claude/wt/<agent>`, branch `wt/<agent>` from `work/walktools`); the lead
  copies back only the files the agent names.

## 2 · Items and ownership (file scopes are disjoint)
| Item | Agent | Model (effort high) | Owns (files / folders) | Reads only | Owes | Scratch folder |
|---|---|---|---|---|---|---|
| 1 flakes (MC `n-20261122-smoke-timing-flakes`) | builder-a | Opus | `scripts/smoke-test.mjs` — ONLY the body of the `GATE 54` block (from the line `/* ══ GATE 54 — ADD CONTACT AND ADD APP` to the end of that block); `scripts/pins-fixb1/e-header.mjs` | `src/**`, the built html, `scripts/pins-s9/b2-kit.mjs` | per module: the mechanism (§ 1 of the mechanisms doc, confirmed or corrected), the miss rate BEFORE and AFTER by the SAME stated method (≥ the same number of runs; 0 misses after), each deliberate break still red | `/home/claude/scratch/a/` |
| 2 chat / viewer screen probes (MC `n-20261122-device-map-chat-probe`) | builder-b | Sonnet | `scripts/device/adb-walk.ps1` (the screen map reader / validator / check and the calibrate notes for chat and viewer only); `scripts/pins-walktools/b-screens.mjs` (new) | `scripts/device/a52s.json` (its VALUES are not changed before the operator block, prompt: "leave the map as it is"), the mechanisms doc § 2 | the `sets` form of a screen (§ 3 interface I-2), executed on pwsh 7.4.6 where System.Drawing is not needed (the validator; the set logic through a stub), a pin with deliberate breaks | `/home/claude/scratch/b/` |
| 3 parser (MC `n-20261122-walk-parser-history-rows`) | builder-c | Sonnet | `scripts/device/adb-walk-parse.ps1`; `scripts/pins-walktools/c-parser.mjs` (new, in the smoke); `scripts/pins-walktools/c-parser-run.mjs` (new, BY HAND, needs pwsh) + `scripts/pins-walktools/fixtures/**` (synthetic run folders, no real log line of Damir's phone) | the run folders the lead staged (scratch only), the mechanisms doc § 3 | (a) the row "first swipe -> 1st page" of history-seed-kNN has a number on the fixture of the 2026-11-22 shape; (b) the per-page rows (I-3); the old rows byte-identical (a fixture without the new lines gives the old summary plus only the appended `n/a` page rows) — executed on pwsh 7.4.6; pins with breaks | `/home/claude/scratch/c/` |
| 4 seed voice ids (MC `n-20261122-devseed-voice-clips-not-playable`) | builder-e | Sonnet | `Spixi/Utils/SDevSeed.cs`, `Spixi/Utils/SDevSeedPlan.cs` (the voice rows' ids only); `scripts/csh/WalkToolsSeedTests.cs` (new) + its ONE Compile line in `scripts/csh/csh.csproj`; the re-base of `scripts/pins-filewalk/a-file-seed.mjs` (named keys only) | `Spixi/Pages/Chat/SingleChatPage.xaml.cs` (READ only: `isVoiceIdHex` ~`:8743`, `onVoicePlay` ~`:9195`), Ixian-Core `CoreConfig.maxMessageIdSize` | the mechanism with `file:line`; CSH tests with deliberate breaks; the security lens of #1312 (no new verb, no Release path) | `/home/claude/scratch/e/` |
| 5 jsdom rows (MC `n-20261111-jsdom31-smoke-rows`, #1749 (1)) | builder-f | Sonnet | `scripts/smoke-test.mjs` — ONLY the six rows (the five `#346` press-transition rows and the `N19 harness self-check`, about `:8783`–`:8960`) and the helper lines they use inside that block | jsdom 29.1.1 and 31.0.1 installed side by side in scratch | the mechanism per row; the six rows green on BOTH 29.1.1 and 31.0.1, each still red on its deliberate break on both; no npm lock file (#1749 (1) names none) | `/home/claude/scratch/f/` |
| — re-base pass | builder-r | Sonnet | the hashed walk pins that items 2 + 3 break: `scripts/pins-perfb1toggle/b-walk.mjs`, `scripts/pins-photo1a/c-walk.mjs`, `scripts/pins-filewalk/b-walk-steps.mjs`, `scripts/pins-fixb3/c-walk.mjs` (only the hash constants / held blocks named in its report, after a look at the diff, #1596 / #1634) | the merged tree | per re-based key: old hash → new hash, the diff it looked at, the key red on a one-token break | `/home/claude/scratch/r/` |
| — registration | lead | — | ONE registration block in `scripts/smoke-test.mjs` (`pins-walktools/<b-screens|c-parser>`) | — | — | — |

## 3 · Interfaces between items
| Name | Shape | Provider | Consumer |
|---|---|---|---|
| I-2 screen sets | `screens.<name>` is EITHER `{ probes: [...], minMatch: n }` (today, unchanged) OR `{ sets: [ { name: "light"\|"dark", probes: [...], minMatch: n }, … ] }` (1 or 2 sets, names unique, each set validated by the same rules as today; a key with both forms, or a `sets` that is not a list, = invalid). A screen passes when at least ONE set passes. The rep notes do NOT name the passing set (calibrate.json does); when none passes the note gives every set's count in a compact form (`light 2/4 (4), dark 0/4 (4)`, "(n)" = minMatch) — #46 r1 M3, r2. Only `chat` and `viewer` may use `sets` (any other screen with `sets` = a usage error before any adb command); `accountScrolled` keeps its own rule. | builder-b | the operator block (map values), the lead (`a52s.json` after the calibrate) |
| I-3 per-page rows | Rows added to the step `history` (pages 1..3) and to `history-seed-kNN` (page 1), all OPTIONAL (no value = `n/a` with the reason "no \"<line>\" line …", never a required "no data"): from `[P1] shell older insert rows= mode= build= swap= fix= fade= ms=` · `[P1] shell older frames n= max=` · `[P1] chat loadmore in` · `[P1] chat older read passes= window= ms= flush=` · `[P1] chat older push n= json= build=` (the EXACT words of `claude/session-histcs-prompt.md`; histcs may not change them). Page k = the k-th line of that kind in the rep's window, and ONLY when the count of that kind's lines equals the count of page requests (`shell send loadmore` lines; for the C# read / push rows also the count of `chat loadmore in` lines when that line exists), else `n/a` "cannot pair"; `C# loadmore in -> push` also needs push k ≥ loadmore k and, when a loadmore k+1 exists, push k < loadmore k+1 (#46 r1 M2). The row names start with `page <k> ` and keep the old row order: every old row first, byte-identical, then the new rows. | builder-c | Damir's numbers docs |
| I-3a first page | `first swipe -> 1st page` of history-seed-kNN = the stamp of the first `[P1] chat load` line AFTER the first `[P1] chat loadmore in` line when that C# line exists in the window; else the first `[P1] chat load` line of the window when the window holds at least one `[P1] shell send loadmore` line AND exactly as many `chat load` lines as send lines (the send line is the proof of the request; its stamp is NOT an order, mechanism § 3; unequal counts = "no data, cannot pair", #46 r1 M1); else "no data" with the reason. | builder-c | the numbers doc of the operator block |
| I-4 seed voice id | `SDevSeedPlan.rowIdFor(int i, FileMsg m)`: for `KindVoiceInline` and `KindVoiceFile` the first 16 bytes of today's SHA-256 id (16 = Ixian-Core `CoreConfig.maxMessageIdSize`, the length of a real message id, `Guid.ToByteArray()`); every other row = today's 32-byte id, unchanged. `chatComplete` / `topUpAction` and the writer use the SAME function. | builder-e | the operator block (a fresh seed: "Remove the seed, then Seed") |

A change to this table goes through the lead; both sides get the new text.

## 4 · What each agent returns
- The list of files it CHANGED (the lead copies back only these), as paths in its worktree.
- Per pin / test: the command, the green output line, the break it made (a one-token mutation in a full copy, #802), the red
  line with the failing key.
- What it could not prove (⚠ C# UNCOMPILED for the app build, "never executed on Windows PowerShell 5.1", not on the phone).
- Anything it saw outside its scope: a note, not a fix.

## 5 · Integration order and checks (the lead)
1. Copy back per agent (changed files only; `smoke-test.mjs` by patch: the hunks of a and f are disjoint) → no shell rebuild
   is needed (no `src/**` change) → the two `--check` gates → `node scripts/cs-syntax-check.mjs`.
2. The re-base pass (builder-r) on the merged tree; the registration block; grep the smoke for every edited line.
3. The affected pins, CSH, then ONE full smoke (nothing that executes beside it) → the #46 loop (Opus readers; ONE Fable 5.2
   security-only pass on `scripts/device/**` + `SDevSeed*.cs`, on the final tree, before the push) → export → commits → ONE push.

## 6 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
