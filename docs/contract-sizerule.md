# Agent contract — sizerule

File name: `docs/contract-sizerule.md`. The lead wrote it BEFORE any agent started (`docs/orchestration.md` § 4).
Every agent gets this file plus its own row. An agent that needs a file outside its row stops and asks the lead.
Prompt: project doc `claude/session-sizerule-prompt.md` (Ready by ruling #1964 (3)); rulings #1963 (8), #1964 (3).
The rule: inventory § 8 (R1–R6), the counter § 13.1, the history regex § 13.3 (project doc `claude/code-inventory-2026-11-24.md`).

## 1 · Base
- Tree: `work/sizerule` @ "Merge pull request #28 from Rexoflex/work/walktools2" (`0eda93f5`) · baseline (lead, cloud twin,
  Ixian-Core @ `097341a`, `npm ci` on the committed lock, `TZ=America/Los_Angeles`): `BASELINE OK 7054 / the 2 KNOWN (#136 · B3)`
  (expected; observed number in the status doc) · CSH `pass=908 fail=0` (observed) · `build-shells --check` ✓ ·
  `build-locales --check` ✓ · `cs-syntax-check` ✓ (291 files) · tools from the lock: jsdom 29.1.1 · eslint 10.14.0 · globals
  17.14.0 · tree-sitter 0.25.1 · tree-sitter-c-sharp 0.23.5 (also acorn and parse5 come with the lock).
- Must hold for everyone: **no app file changes** (nothing under `Spixi/**`, nothing under `src/**`, no built html) ·
  nothing in `scripts/device/**`, Ixian-Core, `package.json` / `package-lock.json` (a new package = STOP and tell the lead:
  it needs Damir's word) · the bridge protocol untouched · a CI step that reads secrets or posts outside the job is NOT allowed
  (the job summary is allowed) · no commit, no push, no full smoke · comments in new code say WHAT or WHY, never history
  (no decision numbers, batch names, rounds, dates) — R2 applies to us too, even though it checks only app C# and `src/**`.
- **Execution window:** the lead runs ONE full smoke at a time and nothing may execute beside it (L75, L153). An agent may
  read and write files at any time, but runs NO `node` / `python` / `git fetch` / `dotnet` command while the file
  `/home/claude/logs/SMOKE_RUNNING` exists. Poll with `sleep 60; ls /home/claude/logs/` (a sleep is fine).
- History: the lead deepens the clone (`/home/claude/spixi`, shared object store) so that `0e85a4b8` (the fork point),
  `23c9c495` and the five merges below are readable. The file `/home/claude/logs/FETCH_DONE` exists when that is done.
  Agents do not fetch (the proxy allows 2 git transfers at a time).
- Each agent works in its OWN git worktree (made by the lead, detached at the base): `/home/claude/wt/<a|b|c|d>`.
  `node_modules` is a symlink to the lead's install (read-only use). Scratch outside the worktree: `/home/claude/scratch/<a|b|c|d>/`.

## 2 · Items and ownership (file scopes are disjoint)
| Item | Agent | Model (effort high) | Owns (files / folders) | Reads only | Owes (pins + one deliberate break each) | Worktree · scratch |
|---|---|---|---|---|---|---|
| 1 the counter (R1, R3) + the `#if` fence evaluator (used by R5) | builder-a | Opus | `scripts/size-lib.mjs` (new), `scripts/size-count.mjs` (new) | the whole tree, git history | the two totals reproduced (63,925 at `23c9c495`, 20,155 at `0e85a4b8`; ± 0.5 %, a difference explained), store-compiled lines vs 61,613, the switch count (39 at `23c9c495`), files over 1,500 lines (10 at `23c9c495`), the `src/**` method stated; a report `/home/claude/scratch/a/report.md` | `wt/a` · `scratch/a` |
| 2–4 the checks R2, R5, R6 + the measured table of the five batches | builder-b | Opus | `scripts/size-check.mjs` (new) | `scripts/size-lib.mjs` (API of § 3, read-only), the tree, git history | the five-batch table (R2 marker lines, R5 new probe lines, R6 results per batch), the proposed R2 threshold with its reason, R6 failing vs report-only with its reason, the derived probe list with its command; report `/home/claude/scratch/b/report.md` | `wt/b` · `scratch/b` |
| 5–6 the CI wiring + the permanent self-tests | builder-c | Sonnet | `.github/workflows/redesign-ci.yml`, `scripts/pins-leanfollow/d-ci.mjs` (the re-base), `scripts/pins-sizerule/**` (new) | `scripts/size-*.mjs`, `scripts/run-pins.mjs`, `scripts/smoke-test.mjs` (lines 1–334, the helpers) | `pins-sizerule/a-counter` (line kinds and the fence on fixtures), `pins-sizerule/b-checks` (temp git repos: one history comment → R2 red only · one probe outside the fence → R5 red only · one file crossing 1,500 → R6 red only · a file over 1,500 that grows → R6 red only · clean → green · a removed history comment → green · a probe inside the fence → green), `pins-sizerule/c-ci` (the size step of the workflow, as text, with its limits), `pins-leanfollow/d-ci` green on the new workflow; each pin with its one-token deliberate break (#802) | `wt/c` · `scratch/c` |
| 7 the docs + the npm sentences | builder-d | Sonnet | `docs/templates/session-prompt.md`, `docs/templates/agent-contract.md`, `docs/process.md`, `docs/orchestration.md` (the npm line only), `CLAUDE.md` (the gate lines and step 5's npm sentence only — NOT "Where we are now"), `scripts/smoke-test.mjs` (the npm texts at :3, :30, :13856, :13861 only — find them by text), `scripts/cs-syntax-check.mjs` (the npm texts only), `scripts/pins-perflean/x-parser-crosscheck.mjs` (the npm text only) | the old → new table (§ 3.4), this contract | none (text only); a list of every edited line with its old and new text | `wt/d` · `scratch/d` |
| — | the lead | Opus | `docs/contract-sizerule.md`, `docs/review-brief-sizerule.md`, the export docs, the ONE registration line in `scripts/smoke-test.mjs` (after the `pins-walktools2` line) | everything | integration, the full smoke, the #46 loop | `/home/claude/spixi` |

Model by the cost of a wrong result (`docs/orchestration.md` § 2): the counter and the fence logic = Opus (every check is built
on them); the fixtures, the workflow text, the docs = Sonnet (a clear contract; the workflow gets the Fable 5.2 reader).

## 3 · Interfaces between items (the only way two items meet)

### 3.1 `scripts/size-lib.mjs` (provider: builder-a; consumers: builder-b, builder-c)
ES module, Node 22, no new package (tree-sitter + tree-sitter-c-sharp for C#; acorn for JS; parse5 for HTML; CSS by a small
scanner that knows strings and comments). Every function is pure on its inputs except the `git*` ones.

| Name | Shape |
|---|---|
| `classifyCs(text)` | → `{ kinds: string[], store: boolean[], directives: number[], parseErrors: number }`. `text` = the file as a string (a BOM is dropped; CRLF and LF both work). `kinds[i]` is the kind of line `i + 1`: `'code'` (holds a token that is not a comment; a preprocessor directive line counts as code), `'comment'` (comment text and no code token), `'blank'`. A line inside a multi-line string is code when it holds non-white-space string text. `store[i]` = false when the line is compiled out of a store build: inside a branch of `#if` / `#elif` / `#else` that is false when `DEBUG`, `SPIXI_DEV_COEXIST` and `SPIXI_CSH` are false and every other symbol is UNKNOWN (three-valued logic: `!`, `&&`, `\|\|`, `==`, `!=`, `( )`, `true`, `false`; an `#else` is false when an earlier branch of its chain is definitely true). The directive lines themselves are `store = true`. `directives` = the 1-based lines that are real directives (a `#` that tree-sitter does not put inside a string or a comment). |
| `classifyWeb(text, ext)` | `ext` ∈ `.js` `.mjs` `.css` `.html` → `{ kinds: string[] }` with the same three kinds (HTML: `<!-- -->` = comment; `<script>` bodies by the JS rule, `<style>` bodies by the CSS rule; a script acorn cannot read falls back to a scanner and the result says `fallback: true`). |
| `isAppCs(path)` | `true` for `Spixi/**/*.cs` (case as git stores it; the extension test ignores letter case) except `Spixi/Platforms/MacCatalyst/RocksDbSharp/**`. |
| `isSrcHandWritten(path, generatedSet)` | `true` for `src/**` with extension `.js` `.mjs` `.css` `.html` that is not in `generatedSet` (the paths whose `linguist-generated` or `linguist-vendored` attribute is set; `gitGenerated` below gives it). |
| `gitFiles(repo, rev)` | → `[{ path, text }]` of every blob in the tree of `rev` (`git ls-tree -r -z` + `git cat-file --batch`; no work-tree read). |
| `gitGenerated(repo, rev, paths)` | → `Set` of paths whose `linguist-generated` / `linguist-vendored` is set, by the `.gitattributes` of `rev` (`git check-attr --source <rev>`, or the attributes file of that tree read by the lib when `--source` is not possible; state which). |
| `gitDiffAdded(repo, base, head, paths)` | → `Map<path, { status, added: number[] (1-based head lines), removed: number }>` from `git diff -U0 --no-renames --text --no-ext-diff --no-textconv <base> <head> -- <paths>`. |
| `countTree(repo, rev)` | → `{ rev, app: { files, code, comment, blank, store, switches, over1500: [{ path, lines }] }, src: { files, code, comment, blank } }`. `switches` = the number of code lines in app C# that match `Key = "flag<Name>"` (state the exact regex). `over1500` = app C# files with more than 1,500 physical lines. |
| `countDelta(a, b)` | two `countTree` results → the same shape with b − a for the numbers. |

### 3.2 `scripts/size-count.mjs` (builder-a) — the counter, the R1 / R3 command
- `node scripts/size-count.mjs [--repo <dir>] [--rev <rev>]` → the size table of one tree (default `HEAD`).
- `node scripts/size-count.mjs [--repo <dir>] --base <rev> --head <rev>` → both tables and the delta (the R1 budget number =
  the delta of app C# code lines; the `src/**` delta beside it).
- `--json` prints the same as one JSON object. Exit 0; exit 2 on a usage or git error.

### 3.3 `scripts/size-check.mjs` (builder-b) — the R2, R5, R6 checks (CI and by hand)
- `node scripts/size-check.mjs [--repo <dir>] --base <rev> --head <rev> [--summary <file>]` → prints the size table of the head
  (through size-lib), the delta, and one block per check (R2, R5, R6) with every offending `path:line`; appends the same as
  Markdown to `<file>` when `--summary` is given (CI passes `$GITHUB_STEP_SUMMARY`). Exit 0 = every check passes, exit 1 = one
  or more checks fail (each failing check prints one line that starts with `FAIL R2`, `FAIL R5` or `FAIL R6`), exit 2 = usage
  or git error (fail closed: a base that cannot be read is exit 2, never a pass).
- `--ci`: base = the first parent of `HEAD` (`HEAD^1`). On a `pull_request` event the checkout is GitHub's merge commit, so
  `HEAD^1` is the base branch and the diff is exactly what the pull request brings. `--ci` with no parent = exit 2. The script
  reads NO `github.event` text and NO environment value except `GITHUB_STEP_SUMMARY`.
- Text from the tree that the script prints (a comment line, a path) is printed with a fixed prefix (never at the start of a
  line), with control characters and `\r` removed, cut at 200 characters, and `::` broken up, so that no line of the tree can
  become a workflow command; in the Markdown summary `|`, backticks and `<` are escaped.
- **R2:** count the ADDED lines of app C# and of hand-written `src/**` whose comment part matches the history regex (one
  exported constant `HISTORY_MARKERS`, the categories of inventory § 13.3: decision numbers, `DECISIONS`, ★, batch and session
  names, `#46`, rounds, readers, findings, packets, walks, lessons, dates, handoff, review). Only comment text counts (a code
  token never does); a line counts once. Removed lines never count. Fail when the count is above `R2_MAX_MARKER_LINES` (ONE
  exported constant; start value 5 unless the measured table says otherwise).
- **R5:** an ADDED code line of app C# that writes a probe (the exported list `PROBE_TAGS` + `PROBE_CALLS`, derived from the
  inventory § 7a step 4 and the tree: state the command) and whose `store` flag is true (outside an active `#if
  SPIXI_DEV_COEXIST` / `DEBUG` / `SPIXI_CSH` branch) → fail on one line.
- **R6:** an app C# file with more than 1,500 physical lines at the base must not have more lines at the head; a file with at
  most 1,500 lines at the base (or a new file) must not have more than 1,500 at the head. Exported `R6_MODE` = `'fail'` or
  `'report'` (builder-b proposes; failing unless a merged batch of the last five would have failed for a reason the rule does
  not mean). A deleted file never fails.
- Exports for the pins: `HISTORY_MARKERS`, `R2_MAX_MARKER_LINES`, `PROBE_TAGS`, `PROBE_CALLS`, `R6_MODE`, `R6_LIMIT` (1500),
  and `runChecks({ repo, base, head })` → `{ r2: { count, max, pass, lines: [{ path, line, text }] }, r5: { pass, lines }, r6: { pass, mode, files: [{ path, base, head }] }, pass }`.

### 3.4 The CI step (builder-c writes it; the lead and the Fable 5.2 reader check it)
- Checkout Spixi of the `smoke` job gets `fetch-depth: 2` (the merge commit and its parents; nothing else changes in that step,
  `persist-credentials: false` stays).
- One new step, after "MSBuild harness (the lean packaging targets)" and before "Publish failure details as annotations":
  ```
  - name: Size (the counter and the R2 / R5 / R6 checks)
    id: size
    if: ${{ !cancelled() }}
    timeout-minutes: 10
    run: |
      set -eo pipefail
      node scripts/size-check.mjs --ci --summary "$GITHUB_STEP_SUMMARY" 2>&1 | tee ../size.log
  ```
  with a comment block above it (what it does, what it reads, that it needs no network and reads no secret).
  The annotation step gets `O_SIZE: ${{ steps.size.outcome }}` and `publish size "$O_SIZE"`; the upload step lists `size.log`.
- The npm sentences of the header (line 3) and of the parser cross-check comment (line 94) change per the walktools2 table
  (line 94 must NOT hold the literal "npm ci": row 11 of `pins-leanfollow/d-ci` allows exactly one live npm line, and a comment
  inside a leanfollow step must not name `npm ci`).
- `pins-leanfollow/d-ci` is re-based (#1596 / #1634, after a look at the diff): rows 4, 12, 13 and 17 learn the new pieces
  exactly (each found once; row 17 puts each new piece back to its base text before it hashes, as the walktools2 re-base did);
  every break of the pin stays and still turns exactly its row red.

### 3.5 The old → new npm sentences (builder-d, and builder-c for the workflow lines)
The table of `claude/session-walktools2-status.md` § "The old → new sentences of the npm line", every row, with "never run
`npm audit fix`" where the install is named. The lead gives the table to both agents word for word.

## 4 · What each agent returns
- The list of files it CHANGED (the lead copies back only these).
- Per pin: the command (`node scripts/run-pins.mjs <dir/mod>`), the green output line, the break it made (one-token mutation in
  a full copy, #802), the red line with the failing key.
- The measured numbers with the command that gave each (builder-a, builder-b).
- What it could not prove (unrun, a limit of a source-text check: stated in the module's first lines, #1735).
- Anything it saw outside its scope: a note, not a fix.

## 5 · Integration order and checks (the lead)
1. builder-a first (the checks use its classifier); builder-d in parallel (text only); builder-b after builder-a's API is
   green; builder-c after builder-b.
2. Copy back per agent, changed files only → the `--check` gates → `cs-syntax-check` (no C# changes: 291 files as before) →
   the registration line in `scripts/smoke-test.mjs` (grep the smoke for the tokens of every edited line, L84) →
   `node scripts/pin-sweep.mjs --working`.
3. The full smoke (one at a time, nothing beside it, L153) + CSH (unchanged, 908) → the #46 loop until CLEAN (Fable 5.2: the
   security-only pass over the final tree + `.github/workflows/redesign-ci.yml`; Opus for every other reader; between rounds the
   pins the fix touches; the full smoke ONCE after the last fix, #1503) → the export docs → the commits, ONE push of
   `work/sizerule`, read each commit back, the compare link for Damir's pull request (#1546).
4. R3 for this batch: the size table of the final tree against the base (app C# must be unchanged: delta 0 code lines).

## 6 · Stage 2 (R4)
This batch adds no switch and no app code: stage 2 deletes nothing of it. The checks stay after the launch.

## 7 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
