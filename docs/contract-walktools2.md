# Agent contract — walktools2

The lead (Claude Opus) wrote this BEFORE any agent started (`docs/orchestration.md` § 4). Every agent gets this file plus its own
row. An agent that needs a file outside its row stops and asks the lead. Prompt: project doc `claude/session-walktools2-prompt.md`
(Ready by ruling #1838). Number blocks: DECISIONS #1935–#1949 · lessons L289–L292 · packet P102 — ONLY the lead writes them.

## 1 · Base
- Tree: `work/walktools2` @ "Merge pull request #24 from Rexoflex/work/histcs" (`462ba3e4`) · baseline: the full smoke of the
  untouched tree runs in the lead's tree (expected `BASELINE OK 7000 / the 2 KNOWN`) · CSH expected 866.
- Environment: the cloud twin · Node 22.23.5 · npm 10.9.9 · .NET SDK 10.0.115 · Ixian-Core @ `097341a` (sibling) · PowerShell
  7.4.6 (`/usr/local/bin/pwsh`, Linux; Damir runs Windows PowerShell 5.1 — a script run here is "executed on pwsh 7.4.6", never
  "proven on the phone") · Chromium: `/usr/bin/google-chrome`, Playwright `PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs`.
- Tools: jsdom 29.1.1 · eslint 10.14.0 · globals 17.14.0 · tree-sitter 0.25.1 · tree-sitter-c-sharp 0.23.5 (L160; ruling #1831: jsdom
  stays 29.1.1).
- Each agent works in ITS OWN git worktree `/home/claude/scratch/<x>/Spixi` (detached at the base; `../Ixian-Core` and
  `node_modules` are symlinks there — never delete them). Notes and temp files go to `/home/claude/scratch/<x>/work/`.
- **Wait rule:** the lead's baseline smoke runs now. Until the file `/home/claude/logs/SMOKE-DONE` exists, an agent READS and
  WRITES files only — it executes nothing (no node, dotnet, pwsh, chrome). Poll with `test -f /home/claude/logs/SMOKE-DONE ||
  sleep 60` (one check per minute).
- Must hold for everyone: the PARAMOUNT isolation invariant · C# touches no risky parts · the frozen bridge · the handover-gate
  triggers (a new verb, `spixi.*` key, WebView setting, HTML sink, network fetch or app log line = STOP and tell the lead) · no
  edit under `src/` or `Spixi/Resources/Raw/html` · no commit, no push, no full smoke, nothing in Ixian-Core · no edit of
  `DECISIONS.md`, `docs/lessons.md`, `CLAUDE.md`, `docs/templates/**`, `docs/process.md`, `scripts/smoke-test.mjs` (the lead).
- The walk's safety rules (#1520–#1522, #1550–#1553, #1615–#1618) hold: one pinned package; the allowlist (`Assert-AdbCommand` /
  `Test-ShellAllowed`); the log filtered ON THE PHONE; the masks; "no data" = exit code 2; old parser rows keep their names and
  bytes; NEVER `uninstall`, `pm clear`, `input text`; no new entry into the app (#1521).
- The seed contract (#1567, #1571): new seed rows after the last index (55), FIXED times, the unseed removes them; Seed 01–56 stay
  byte-identical in behaviour (their ids, counts, times, files) and their pins; `#if SPIXI_DEV_COEXIST` only.

## 2 · Items and ownership (file scopes are disjoint)
| Item | Agent | Model (effort high) | Owns (files / folders) | Reads only | Owes | Scratch |
|---|---|---|---|---|---|---|
| 1 seed quote chat (MC `n-20261123-devseed-no-quote-reply`) | builder-a | Opus | `Spixi/Utils/SDevSeed.cs`, `Spixi/Utils/SDevSeedPlan.cs` (the pure half of the same seed — the lead reads the prompt's "SDevSeed.cs" as the seed's two files; recorded in a DECISIONS row), `scripts/csh/WalkTools2SeedTests.cs` (new), the seed pins that hold the hooked statements (`scripts/pins-perfb1/e-image-seed.mjs`, `scripts/pins-filewalk/a-file-seed.mjs`, `scripts/csh/FileWalkSeedTests.cs`, `scripts/csh/WalkToolsSeedTests.cs`, `scripts/csh/PerfB1SeedTests.cs` — re-based ONLY where a hook statement changed), `scripts/pins-walktools2/a-quote-seed.mjs` (new), `docs/walk-histcs.md` (rows W-5 and A-5 ONLY) | `Spixi/Utils/ReplyQuote.cs`, `SingleChatPage.xaml.cs` (the reply, match and `ixian:quotejump` paths), `SharedItems.cs`, `Config.cs`, `HistoryOlderRules` | interface I-1; CSH tests that EXECUTE the plan (shape = `ReplyQuote.compose`, the match finds the target through `ReplyQuote.tryMatch`, every id passes the page's `parseMessageIdHex` rule, depth ≥ 3 older pages in BOTH switch states of `FirstOlderPage50`, ids / counts / times of Seed 01–56 unchanged); the smoke pin a-quote-seed (source); each with a one-token break (#802) | `/home/claude/scratch/a/` |
| 2 cold-start step that keeps its log (MC `n-20261123-android-cold-start-process-death`) + 3 the home `sets` form in the SCRIPT | builder-b | Opus | `scripts/device/adb-walk.ps1`, `scripts/device/adb-walk-parse.ps1`, `scripts/pins-walktools2/b-coldwatch.mjs` (new, smoke, source), `scripts/pins-walktools2/b-coldwatch-run.mjs` (new, BY HAND, needs pwsh), `scripts/pins-walktools2/fixtures/b/**` (synthetic run folders; no real log line of Damir's phone) | the device-numbers docs (the lead pasted the facts below), `scripts/pins-walktools/**` (as the model), `a52s.json` | interfaces I-2, I-3 (script side); executed on pwsh 7.4.6: the allowlist accepts exactly the new shapes and refuses near misses; the parser on fixtures (a death rep, a kill rep, a front rep, an event BEFORE the start that must not count, an evidence pull that failed); the old rows of every other step byte-identical (a fixture of an old run gives the same `summary.csv`); breaks | `/home/claude/scratch/b/` |
| 3 dark home values in the MAP | builder-c | Sonnet | `scripts/device/a52s.json` (ONLY `screens.home`), `scripts/pins-walktools2/c-home-sets.mjs` (new, smoke, source), `scripts/pins-walktools2/c-home-render.mjs` (new, BY HAND: Chromium) | the built home shell `Spixi/Resources/Raw/html/*`, `src/styles/tokens.css`, `adb-walk.ps1` | `screens.home` = `{ "sets": [ light (the three probes of today, byte-equal values, minMatch 3), dark (computed) ] }`; the render tool reads the three points in light AND dark on the BUILT shell at the phone's viewport (1080 × 2400 px, density 420 → dpr 2.625); its light reading must reproduce today's light values within their tol, else the dark values come from the token map (say which); breaks | `/home/claude/scratch/c/` |
| 4 the lockfile (#1831) | builder-d | Sonnet | `package.json` (new, repo root), `package-lock.json` (new), `.github/workflows/redesign-ci.yml` (ONLY the install step and its comment), `scripts/pins-walktools2/d-lockfile.mjs` (new, smoke) | `.gitignore`, `scripts/pins-perflean/x-parser-crosscheck.mjs` | interface I-4; proof that `npm ci` on the lockfile installs EXACTLY the tree the old npm line installs (every name@version of `node_modules/.package-lock.json` equal); a pin: the five devDependencies exact, jsdom 29.1.1 in the lock, the CI step = `npm ci` and no `npm i`, the installed versions = the lock; breaks | `/home/claude/scratch/d/` |
| 5 re-bases of the hashed walk pins (#1596, #1634) | builder-r | Sonnet | `scripts/pins-perfb1toggle/b-walk.mjs`, `scripts/pins-photo1a/c-walk.mjs`, `scripts/pins-filewalk/b-walk-steps.mjs`, `scripts/pins-fixb3/c-walk.mjs`, `scripts/pins-walktools/b-screens.mjs` (+ any other pin that holds `adb-walk*.ps1` or `a52s.json` by hash or tripwire) | the merged b + c tree, the base | starts AFTER b and c are merged by the lead: per re-based key the old and new value, a look at the diff, red on a one-token break; no key hides a change outside items 2–3 | `/home/claude/scratch/r/` |

Model by the cost of a wrong result (`docs/orchestration.md` § 2). No Fable builder (prompt).

## 3 · Interfaces
| Name | Shape | Provider | Consumer |
|---|---|---|---|
| I-1 quote chat | seed index **56** = "Seed 57 <one fixed name>" (`addressFor(56)`), EXACTLY 1000 messages in BOTH profiles; EVERY row id = the first 16 bytes of `messageIdFor(56, j)` (#1882: `parseMessageIdHex` takes ≤ 32 hex — reply, edit and the quote jump must work on any row); FIXED times below the file chats (the newest = `ImageAnchor` − 6 h; `GapSeconds` apart; none unread); texts from fixed words; several REPLY rows written in the app's own shape `ReplyQuote.compose("", ReplyQuote.excerptOf(standard, target text, null, false), body)` (a 1:1 carries no name, `replyNameOf`); each target has a UNIQUE excerpt; at least one reply in the newest page (row 1 or 2 of the open chat) and at least one reply that is reached after three older pages, each quoting a target that is ≥ 3 older pages ABOVE the reply in both states of `FirstOlderPage50` and < `SharedItems.JumpCap` / `ReplyQuote.DeepSearchMax` deep; both directions (a reply I sent, a reply I received); the top-up rule of the file chats (empty → write, the newest row present → skip, else "partial: Remove the seed, then Seed"); unseed removes the contact (the ONE removal loop's bound) and nothing else; `status()` gets ", n of 1 quote chat (Seed 57)" before its full stop (the filewalk precedent) — the hooks are ONE statement each in seed(profile), unseed() and status(); the `[DEVSEED]` lines carry an index and an exception TYPE only | builder-a | walk rows W-5 / A-5; the phone block |
| I-2 `coldstart-watch` step | opt-in (never in the default list), `-Steps coldstart-watch -Repeats N`; refused with `-Flags` and with `-Calibrate` (a usage error before any adb command). Per rep: `am force-stop` → idle `coldStartIdleSec` → `logcat -c` → the stamp + `am start -W` → `pidof` at once (pid P, the digits checked) → a FIXED wait (a script constant, printed in `run.json`) → the stamp → the proof: ONE pid = P AND `Test-AppFront`. Not proven → BEFORE any later command that clears a buffer: (1) the system events: ONE new whole-string allowlist shape `logcat -d -b events -v threadtime \| grep -o -E '<fixed pattern>' > /data/local/tmp/adbwalk-log.txt` (the existing phone file), pulled to `android-walk-coldstart-watch-NN-events.txt`, then `rm -f`; the pattern lets through ONLY the line's time + pid / tid columns + the tag + the leading NUMERIC fields + the pinned package (tags `am_proc_start`, `am_proc_died`, `am_kill`, `am_crash`, `am_anr`, `am_wtf` with the package; `killinfo` numeric fields only) — no free text (an `am_crash` message or an `am_kill` reason never leaves the phone); (2) the app log of pid P by the EXISTING filtered pull (`Get-LogPullCmd P`, the emitter shapes of #1522 ③) to `android-walk-coldstart-watch-NN.txt`. No screenshot, no tap, no key. The parser counts an event only when its own time ≥ that rep's start stamp (the F-1 re-check counted a record of an earlier run) and its pid = P (or, P not read, the package) | builder-b | the phone block (50 starts) |
| I-2 parser rows | step `coldstart-watch`: `starts` · `in front after <n> s` · `ends with no kill` (P gone, no `am_kill` of P after the start) · `ends with a kill` · `not in front, process alive`; per not-proven rep ONE facts line in `summary.md` (rep, the tags seen after the start with their offset in s from the start stamp, oom_adj / procstate of `am_proc_died`, the count of app-log lines and the LAST line's emitter shape word only — never a raw line); a not-proven rep whose evidence pull failed = "no data", exit 2 | builder-b | the phone block, the numbers doc |
| I-3 home sets | `screens.home` may take the `sets` form of #1878 (1 or 2 sets, names light / dark, each validated by the old rules); everything that reads `screens.home` takes both forms; the old form keeps its behaviour and its notes byte-equal | builder-b (script) · builder-c (values) | the calibrate of the phone block |
| I-4 lockfile | `package.json`: `"private": true`, no `"type"`, `devDependencies` = the five tools at EXACT versions; `package-lock.json` (lockfileVersion 3, npm 10); CI install step = `npm ci` (nothing else changed in the workflow); the documented local line = `npm ci` (the docs that give the old line are NOT edited — `docsb2` owns them; the lead lists the old → new sentences) | builder-d | CI, the lead |

A change to this table goes through the lead; both sides get the new text.

## 4 · What each agent returns
- The list of files it CHANGED (the lead copies back only these).
- Per pin: the command (`node scripts/run-pins.mjs pins-walktools2/<mod>`), the green line, the break it made (one-token mutation in a
  full copy, #802), the red line with the failing key. By-hand runners: the command and the output tail.
- What it could not prove (⚠ C# UNCOMPILED, not run on the phone, not rendered).
- Anything it saw outside its scope: a note, not a fix.

## 5 · Integration order and checks (the lead)
1. Copy back per agent (changed files only); no `src/**` change → no pipeline; the `--check` gates.
2. One smoke line for `pins-walktools2/<a-quote-seed|b-coldwatch|c-home-sets|d-lockfile>` after the histcs line.
3. builder-r on the merged b + c tree; then the full smoke (one at a time) + CSH + `cs-syntax-check` → the #46 loop (Opus readers;
   ONE fresh Fable 5.2 security pass on the final tree, riskiest file `scripts/device/adb-walk.ps1`) → export → push → read back.

## 6 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
| — | — | — | no escalation: every item passed on its first model; the r1 fixes stayed on the builder's model (Opus for items 2–3, Sonnet for 1 and 4) | — |
