# Review brief — sizerule (#1980–#1989)

Work order for the #46 adversarial loop (`docs/process.md`). Written BEFORE round 1 by the lead. The verdict goes into § 5
when the loop closes (#660). Prompt: project doc `claude/session-sizerule-prompt.md`; rulings #1963 (8), #1964 (3);
contract `docs/contract-sizerule.md`.

## 1 · What the batch is
| Item | What landed | Where (files) | DECISIONS |
|---|---|---|---|
| 1 | The counter: app C# code / comment / blank lines, store-compiled code, switches, files over 1,500 lines; `src/**` hand-written code; the delta `base...head` (R1, R3) | `scripts/size-lib.mjs`, `scripts/size-count.mjs` | #1980 |
| 2 | R2: history markers in the ADDED comment lines (app C# + hand-written `src/**`), one threshold constant | `scripts/size-check.mjs` | #1981 |
| 3 | R5: an added app C# line that writes a probe outside the dev fence fails | `scripts/size-check.mjs` | #1982 |
| 4 | R6: an app C# file over 1,500 lines must not grow; a file under it must not cross it | `scripts/size-check.mjs` | #1983 |
| 5 | The CI step (job summary), `fetch-depth: 2`, the annotation and upload lines; `pins-leanfollow/d-ci` re-based | `.github/workflows/redesign-ci.yml`, `scripts/pins-leanfollow/d-ci.mjs` | #1984 |
| 6 | Permanent self-tests: fixture repos red for exactly one reason each; clean and removed-comment fixtures green | `scripts/pins-sizerule/**`, one line in `scripts/smoke-test.mjs` | #1985 |
| 7 | The size rule in the prompt template, R4 in the contract template, the gate lines; the old → new npm sentences | `docs/templates/session-prompt.md`, `docs/templates/agent-contract.md`, `docs/process.md`, `docs/orchestration.md`, `CLAUDE.md`, the npm texts of `scripts/smoke-test.mjs`, `scripts/cs-syntax-check.mjs`, `scripts/pins-perflean/x-parser-crosscheck.mjs` | #1986 |

Not built, and why: no app file changes (the prompt: tooling only). No new package (the lock gives tree-sitter, acorn, parse5).

## 2 · How to run
- Tree: the cloud twin of `work/sizerule` (base "Merge pull request #28 from Rexoflex/work/walktools2", `0eda93f5`); the
  working-tree diff against the base. History back to the fork point `0e85a4b8` is in the clone.
- `npm ci` (the lock) · Ixian-Core @ `097341a` beside the clone · `TZ=America/Los_Angeles`.
- Commands: `node scripts/size-count.mjs --rev 23c9c495` (inventory: 63,925 code lines) · `node scripts/size-count.mjs --rev
  0e85a4b8` (20,155) · `node scripts/size-check.mjs --base <rev> --head <rev>` · `node scripts/run-pins.mjs pins-sizerule/<mod>`
  · `node scripts/run-pins.mjs pins-leanfollow/d-ci`.
- Known failures: the 2 KNOWN (#136 · B3).

## 3 · Auditor scopes (disjoint)
| Reader | Model | Scope (files) | Focus |
|---|---|---|---|
| S (security-only + the riskiest file) | Claude Fable 5.2 | the whole final tree diff; first `.github/workflows/redesign-ci.yml` | Can a check be fooled, so that a history comment or a shipped probe passes, or a file grows past 1,500 unseen? Can the workflow change leak or weaken anything (secrets, tokens, permissions, a workflow command injected through printed text, `fetch-depth`, the job summary, an expression with event text)? Does the new step keep the failure of the old steps visible? |
| A | Claude Opus | `scripts/size-lib.mjs`, `scripts/size-count.mjs` | Are the counts right? Re-derive the two totals (63,925 / 20,155) and some files by your own method; the `#if` evaluator; the border cases (verbatim / raw / interpolated strings, directives, BOM, CRLF, the last line) |
| B | Claude Opus | `scripts/size-check.mjs` | R2 / R5 / R6 logic against the rule text; the five-batch table re-measured; fail-closed paths; precision of the history markers; the probe list |
| C | Claude Opus | `scripts/pins-sizerule/**`, `scripts/pins-leanfollow/d-ci.mjs`, the docs of item 7 | Does each pin fail when the behaviour breaks (a deliberate break per pin, #802)? Do the docs say what the scripts do (names, flags, exit codes)? Are all the old → new npm rows done? |
Round 2+: one fresh break-my-verdict reader (Opus) over the fixes; the Fable reader again if a fix touches the workflow or a
check's fooling surface.

## 4 · Non-negotiables and accepted dials
- Must hold: no app file changes (nothing under `Spixi/**` or `src/**`) · no new package · a CI step reads no secret and posts
  nothing outside the job (the job summary is allowed) · `persist-credentials: false` stays · the old CI steps keep their
  order and their failure behaviour · removed lines never count for R2 · a source-text check states its limits in its first
  lines; a gap of the stated class is a NIT (#1735).
- Accepted (do not re-open): R1–R6 as ruled (#1963 (8)); this session is the tooling session (#1964 (3)); the threshold start
  value 5 unless the data says otherwise (the prompt).

## 5 · Verdict

### Rounds
| Round | Readers (fresh, read-only) | MAJOR | MINOR | NIT | Fixed in |
|---|---|---:|---:|---:|---|
| r1 | S Claude Fable 5.2 · A, B, C Claude Opus | 7 (S 4 · B 2 · C 1 · A 0) | 16 | 25 | `17e4f344` (+ the guard order of GATE 44) |

**r1 MAJOR, and what the fix did:**
- S-1 the parser and the compiler disagree around directive lines (`#region x /*`, a `/*` in a skipped `#if` section, a `\` at the end of a directive line, a verbatim string over a skipped section) → `classifyCs` lists these shapes as `suspect`; a suspect app C# file of the diff fails R5 (fail closed; the real trees hold 0 such shapes at `0e85a4b8`, `23c9c495`, `0eda93f5`).
- S-2 line ends the compiler honours and the classifier did not (lone CR, U+0085, U+2028, U+2029) → suspect `line-separator`, R5 fails.
- S-3 a `#define` name with escapes or format characters opened the fence → suspect `define-name`; the store symbols become unknown from that line.
- S-4 a src file with a NUL byte was skipped → an unreadable src file fails R2 (NUL, UTF-16, invalid UTF-8, symlink, submodule).
- B-1 R5 counts calls into `P1Perf` / `PushFetchProbe`, whose bodies are fenced → NOT changed: inventory § 7a step 4 names "[P1] calls" among the probe lines that ship, and § 6c counts the call lines; the basis is in the header of `size-check.mjs` (recorded, #1982).
- B-2 a comment rewrite that keeps one decision number per member failed R2 → a line whose only marker is one decision number is not counted; marker tokens removed in the same diff are credited (diff-wide, so a split passes; recorded).
- C-1 most marker ids and probe detectors had no pin row → one row per id and per detector, repo cases for every new rule.

**r1 MINOR fixed:** the over-1,500 delta rows (A) · the vendored folder in R2 / R5 · a non-UTF-8 path fails closed · JavaScript MIME types · a new src file under a generated pattern is read · the `checked:` line (push and manual runs check the last commit only) · R5 char literals, holes, `string.Format`, `nameof` (bare tag names) · R6 renames by git · the timing rule · an uncommented block probe · the evaluator operators and the over-1,500 row in the counter pin · case 19 not vacuous · the R6 text and "never npm audit fix" in the docs. **Recorded, not changed:** the token credit is diff-wide (a split must pass) · `d-ci`'s `rep` throws on a missing anchor (the existing pattern).

| r2 | S2 Claude Fable 5.2 · X Claude Opus (break-my-verdict) | 1 (S2: same class as r1 S-1 / S-2) | 8 | 14 | (r2 fix commit) |

**r2 MAJOR:** S2-1 a U+001A (or another control character) before or inside a directive is white space for the compiler, but
the fence evaluator dropped the directive with no suspect → the NET: any line of an app C# file that holds a control
character other than tab (U+0000–U+001F, U+007F) or a U+FEFF after the start of the file is a `suspect`
(`control-character`); a line that the classifier counts as a directive but the evaluator cannot read is a `suspect`
(`unread-directive`). One rule for the whole family instead of one per character.
**r2 MINOR:** S2-m1 bare raw-string parts inside an ERROR node (masked, and a suspect when they span a line) · S2-m3 tag
variants (`[CDPERF2]`, `[PERF-nav]`, `[P1b]`, `.Elapsed.Total…`) · S2-m4 the "review by hand" note also for
`node_modules`, `.npmrc`, `*.csproj`, `Directory.Build.*` · S2-m5 the CSS scanner skips the character after a backslash ·
X-m1 batch names that are ordinary words (the stop-list gets the planned `smooth`; a hyphenated first part counts only
with a digit; the template says a batch name must not be an ordinary word) · X-m2 pin rows for the `#region` free text,
the letter-case path scope, raw and interpolated strings over a directive · X-m3 an edited unfenced probe line counts as
new (stated in the limits and the docs: fence it in the same change) · S2-m2 prose in a never-compiled section (stated).
**Cost note before r3 (lead-work-session rule 10):** MAJOR per round 7 → 1. One more round = one Fable 5.2 + one Opus reader
(about 20 minutes each, in parallel) after the full smoke (about 50 minutes). If r3 finds a MAJOR of a NEW class in the
checks, the loop does not start a fourth fix round on them: the item stops and the choice goes to Damir (rule 9).

| r3 | S3 Claude Fable 5.2 · Y Claude Opus (break-my-verdict) | 3 (S3: two of the r1 S-1 class, one shape class new by the letter) | 4 | 11 | — (not fixed: rule 9) |

**r3 MAJOR (all three let a shipped probe line pass R5 with exit 0; all compile with 0 errors, SDK 10.0.115):**
- S3-1 more shapes where tree-sitter's comment and string ranges differ from the compiler's: `#region x // see /*` (the
  grammar's `preproc_arg` stops before `/*`), `#pragma warning disable 168, @"` (a verbatim string opens on the pragma
  line), a raw string opener after U+00A0 / U+3000, the C# 14 `a?.b = "/*";` (ERROR recovery). Class: r1 S-1.
- S3-2 an interpolation format clause that starts with `/*` (`$"{DateTime.Now:/*}"`) becomes a comment that runs to the
  next `*/`. New by the letter (ordinary compiled code, no directive); the root is the same (one lexer, trusted).
- S3-3 a Unicode format character (U+0600–0605, U+06DD, U+070F, U+0890–0891, U+08E2, U+FFF9–FFFB) inside an
  identifier hides `P1Perf` / `Elapsed` from the probe patterns; the compiler drops it. Class: r1 S-3 / r2 S2-1.
**r3 MINOR:** S3-4 code that runs before the size step (any script of the pull request) can change the checker, and
`binding.gyp`, `*.csproj.user`, `Directory.Build.rsp`, `.gitmodules` are not watched · Y-1 a batch name that is also an
identifier (`quotebox` → `quoteBox`, `imgurl` → `imgUrl`) fails R2 for plain comments; `quotebox` is the next queued
batch · Y-2 the r2 tag widening makes `[nickname]`, `[THEMES]`, `[diagnostics]` probes (0 lines of today's tree) · Y-3
two r2 rules have no failing pin row (`break` → `continue` after an unread directive; the letter-number suffix).
**r3 NIT:** the JS fallback scanner is not reported · `#line` text not read by R2 · bare URLs link in the summary · `.cjs` /
`.svg` out of scope · a size-lib header sentence on ERROR tokens · invisible characters written literally in two pins ·
the docs do not say that a suspect or unreadable file turns R5 red · the stated marker-word cases.
**What held in r3:** the five-batch table (R2 23 / 96 / 0 / 84 / 14 · R5 0 / 15 / 0 / 1 / 0 · R6 pass / FAIL / pass /
FAIL / pass); 0 suspect and 0 unreadable files in every real tree; the counter totals (63,925 / 20,155; HEAD 64,368);
realistic batches pass (a big-page edit that keeps its line count, a split, comments with é and —, `#region` with
non-ASCII text); the `unread-directive` stop (every later line ships); about 300,000 fuzz files against a Roslyn oracle
for the control characters and the `#if` evaluator: 0 hidden lines; R6; the workflow (no leak, no weakening).

### Verdict
**NOT CLEAN at r3 (MAJOR 7 → 1 → 3). The batch is NOT delivered (not pushed).** Rule 9 of the lead skill (and the cost
note above): the checks R2 / R5 rest on a parser that is not the compiler; each round found more shapes where the two
disagree (r1 four, r2 one, r3 three — one of them a shape class not seen before), and per-shape nets do not converge.
No third fix round was started. The choice goes to Damir (question Q-1 in the status doc and in Mission Control):
1. **Ship the checks as a guard against mistakes now** (they catch every ordinary history comment, probe line and
   file growth; no reader found a wrong verdict on a real or a realistic diff), with the open shapes written into
   ITS LIMITS as "a deliberate hiding of code is caught by the review of the diff, not by this check" — the code as the
   readers read it, plus a limits text; then push.
2. **Another design in its own batch:** classify C# lines with Roslyn (the compiler itself; the .NET SDK is already in
   CI) instead of tree-sitter, so the whole class goes away; until then R2 / R5 as in 1 or as in 3.
3. **Park R2 / R5 behind a switch:** CI prints R2 / R5 but does not fail on them (the counter and R6 fail as now); R2 / R5
   by hand as #1963 (8) says, until 2. One small reader round for the switch.
4. **Stop the batch.**
The tree (the four code commits + the export commit) is saved as patches with SHA-256 in `Claude outputs\_transfer\`
on Damir's PC (the status doc names the files).

### Session `sizerule2` (2026-11-26) — the guard commits, by ruling #1966 (1)
Scope: ONLY the commits of `sizerule2` (`825d89f9` the limits text and the two stop-list words; `014ccacb` the fixes of
its r1), not the patch (the patch had its three rounds above). Prompt `claude/session-sizerule2-prompt.md`: one fresh
read-only Claude Opus reader. Round 1 found a MAJOR, so its fix got a fresh break-my-verdict Claude Opus reader (the loop
rule of `CLAUDE.md` step 6 and #46: a fresh reader attacks each fix); recorded as a deviation from the prompt's "ONE reader".

| Round | Readers (fresh, read-only) | MAJOR | MINOR | NIT | Fixed in |
|---|---|---:|---:|---:|---|
| s2-r1 | Claude Opus | 1 | 1 | 6 | `014ccacb` (text only) |
| s2-r2 | Claude Opus (break-my-verdict) | 0 | 1 | 3 | the record commit (docs only) |

**s2-r1 MAJOR:** the limits said the known set is exactly three shapes; § 5 S3-1 lists more of the first kind (the
reader showed that the C# 14 `a?.b = "/*";` passes R5) → the limits, the template and row #2020 say the set is not
complete, name the three MAJOR shapes and point to S3-1. **MINOR:** the handoff named a row that did not exist yet →
rows #2021–#2022 come in the record commit. **NITs fixed:** the handoff read-first line, the extent of the region shape
("up to the next `*/`"), "an identifier of the code" in the R2 batch-name limit, R4 on its own line, the row list in
#2020. **NIT recorded, not changed:** the stop-list row shares the label "case 31" with the watched-path rows (cosmetic).
**s2-r2:** every s2-r1 fix checked against the brief and the code (the region extent tested with `classifyCs`: comment
up to the line with the next `*/`; a directive line inside that range makes the file a suspect); no code line changed
(`git diff 825d89f9 014ccacb -- scripts/size-check.mjs` = comment lines only); `size-check` on `b22fa955..014ccacb`
exit 0; `pins-sizerule/b-checks` 179 / 0; each break of the new row (either word or both out of the stop-list) turns
exactly that row red. **MINOR** (rows #2021–#2022 must exist in the pushed tree): done in the record commit. **NITs:**
R4 split over two raw lines (fixed in the record commit, a doc correction) · row #1987 says "three more shapes" (kept:
#2020 holds the full statement) · "the MAJOR shape" against one MAJOR S3-1 (kept: the "(S3-1)" tag ties them).
**Verdict: CLEAN at s2-r2** (0 MAJOR). The code files are as the s2-r2 reader read them (SHA-256 at `014ccacb` and in
the pushed tree): `scripts/size-check.mjs` `286452f0bcfea9bb40b012409257d08e90587497d0fc2069458c858294372288` · `scripts/pins-sizerule/b-checks.mjs`
`e7f6efc1cd71ff37334a58845aa5306994f3f67b3795fe4c721d81ff58429872`. The checks R2 / R5 remain a guard against mistakes (#1966 (1)); the open class of r3 stays open
until a Roslyn-based check (a later batch).
