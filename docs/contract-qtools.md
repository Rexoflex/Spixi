# Agent contract — qtools (quality tooling: CI and scripts only, NO app code)

The lead wrote this file BEFORE any agent started (`docs/orchestration.md` § 4). Every agent gets this file plus its own
row. An agent that needs a file outside its row stops and asks the lead. Prompt: project doc `claude/session-qtools-prompt.md`.
Mission Control: session `qtools`, items `m078`, `m169`, `m170`. Number blocks: DECISIONS #2070–#2079 · lessons L329–L330.

## 1 · Base
- Tree: `work/qtools` @ `ae7b8303` "Merge pull request #29 from Rexoflex/work/fixb5" (contains `c211d7de`) · expected
  baseline `BASELINE OK 7094 / the 2 KNOWN (#136 · B3)` · CSH 919 · tools by `npm ci` (jsdom 29.1.1 · eslint 10.14.0 ·
  globals 17.14.0 · tree-sitter 0.25.1 · tree-sitter-c-sharp 0.23.5) · `TZ=America/Los_Angeles` · .NET SDK 10.0.115 ·
  `../Ixian-Core` @ `097341a`.
- Must hold for everyone: NO change in `Spixi/**`, `src/**`, `scripts/device/**`, Ixian-Core, the files of `quotebox2`,
  `imgurl`, `docsb3`, `macfix` · size rule #1963 (8): R1 app C# +0, hand-written `src/**` +0; R2 no history comments in
  scripts (a comment says what the code does and what it cannot see, never "was X, changed in #n"); R6 no script file
  past 1,500 lines · no commit, no push, no full smoke · while `/home/claude/logs/SMOKE-DONE` does not exist, read and
  edit only: run nothing heavier than a `node --check` (L153, L308).
- Every new check names the defect class it catches (quality plan C4) and states in its head what it CANNOT see.

## 2 · Items and ownership (file scopes are disjoint)
| Item | Agent | Model (effort high) | Owns | Owes | Scratch |
|---|---|---|---|---|---|
| 1 CodeQL | builder-a | opus | `.github/workflows/codeql.yml`, `.github/codeql/codeql-config.yml`, `docs/codeql-baseline.md` | a local CodeQL CLI run (same languages, build mode `none`, suite `security-extended`, same paths config) as the first-run baseline; each finding: rule, file:line, read (real / false / needs BE) | `/home/claude/scratch/a/` |
| 2 SBOM + Scorecard | builder-b | sonnet | `.github/workflows/sbom.yml`, `.github/workflows/scorecard.yml`, `docs/scorecard-baseline.md` | a local Scorecard run if the CLI can reach the API, else the checks read from the tree by hand (say which); `npm sbom` + CycloneDX .NET dry run where possible | `/home/claude/scratch/b/` |
| 3 isolation · 4 contract | builder-c | opus | `scripts/quality/isolation-check.mjs`, `scripts/quality/bridge-contract.mjs`, `scripts/quality/lib-csharp.mjs` (if needed), `docs/bridge-contract.json`, `scripts/pins-qtools/c-isolation.mjs`, `scripts/pins-qtools/c-contract.mjs` | pins + a deliberate break per rule, run inside the pin (self-test) | `/home/claude/scratch/c/` |
| 5 property tests | builder-e | sonnet | `scripts/pins-qtools/e-props.mjs`, `scripts/quality/parsers.md` (the parser list) | fast-check tests with a FIXED seed; a real defect = a held row (§ 3 I5) + a note to the lead | `/home/claude/scratch/e/` |
| 6 gate diff | builder-d | opus | `scripts/quality/gate-diff.mjs`, `scripts/quality/gate-diff.md` (its calibration), `scripts/pins-qtools/d-gatediff.mjs` | pins + a deliberate break per rule (self-test); the calibration on the last 30 merges of `redesign/frontend` | `/home/claude/scratch/d/` |
| 7 a11y scan | builder-f | sonnet | `scripts/quality/a11y-scan.mjs`, `docs/a11y-baseline.md` | the report over the built shells: light + dark × 390 × 844 + 1280 × 800 | `/home/claude/scratch/f/` |
| lead | lead | opus | `package.json`, `package-lock.json`, the ONE smoke registration line, the ONE `redesign-ci.yml` step, `scripts/quality/run-ci-checks.mjs`, `scripts/quality/README.md`, `docs/quality-plan.md`, this file, the review brief, the export docs | merge, gates, the full smoke once, the #46 loop, the export | `/home/claude/scratch/lead/` |

Dependencies (the lead installs them, exact versions; `npm audit` names neither — the tree's 2 moderate findings, `eslint` / `minimatch`, are older than this batch): `fast-check` 4.11.0, `axe-core` 4.14.1. The npm
SBOM uses `npm sbom` (built into npm ≥ 9.5): no CycloneDX npm package. The .NET SBOM uses the CycloneDX .NET tool at a
pinned version, installed inside the workflow job only (not in the repo).

## 3 · Interfaces between items (the only way two items meet)
| Name | Shape | Provider | Consumer |
|---|---|---|---|
| I1 isolation check | `export async function check(root) → { ok, findings: [{ rule, file, line, text }], seen }`; CLI `node scripts/quality/isolation-check.mjs [--root <dir>] [--json]` → exit 0 clean / 1 a finding / 2 a check that could not read its input (fail closed). Rule ids `ISO-1` … | builder-c | lead (CI step), pins |
| I2 bridge contract | `export async function generate(root) → object` (deterministic: keys sorted, no line numbers); CLI `node scripts/quality/bridge-contract.mjs [--root <dir>] --write \| --check` → `--check` exit 1 with the verbs added / removed / moved (handler file or sender shell changed) | builder-c | lead, builder-d |
| I3 `docs/bridge-contract.json` | `{ "schema": 1, "generator": "scripts/quality/bridge-contract.mjs", "verbs": { "<verb>": { "senders": [shell file names], "emitFiles": [src paths], "handlers": [{ "file", "member" }], "payload": "<text>", "marks": ["money" \| "keys" \| "path"] } }, "parsers": [ … from builder-e's list, by the lead ] }` | builder-c | builder-d (reads it at base and head with `git show`) |
| I4 gate diff | `export function gateDiff({ root, base, head }) → { items: [{ kind, file, line, token }], rows: [ … ], missing: [ … ] }`; CLI `node scripts/quality/gate-diff.mjs --base <sha> --head <sha> [--root <dir>]` → exit 1 when `missing` is not empty, 2 when a commit cannot be read. Kinds: `webview-setting`, `resource-path`, `verb`, `file-write`, `network-call`, `check-changed` (+ `storage-key`, `html-sink`, added by the calibration) (a change to `scripts/quality/**`, `.github/**`, `docs/bridge-contract.json`). NO skip token: nothing in a commit message, a pull request text or a file disables a kind | builder-d | lead (CI step) |
| I5 held defect | a pin row named `QTOOLS-KNOWN <id>: <defect>` that PASSES while the defect still reproduces (fixed seed + the shrunk counterexample stored in the module) and goes red when it is fixed; the lead adds a Mission Control item "Check" per row | builder-e | lead |
| I6 the CI step | one step `Quality checks (isolation, bridge contract, gate diff; a11y report)` in `redesign-ci.yml`, right after `npm ci`: `BASE_SHA` from the event through `env:` (never `${{ }}` inside `run:`), checked as 40 hex; the step starts the BASE commit's copy of `run-ci-checks.mjs` when the base has one; the runner requires each check's exit 0 AND its OK line, fails the step only for a check named in `ENFORCED` (empty: all reports, § 8; a name outside the three, or a NON-EMPTY list without `gate-diff`, is exit 2; the runner's own input errors — a bad sha, no merge base inside the depth-50 fetch — fail the step even while `ENFORCED` is empty), runs the gate diff FIRST from the BASE's copy of `scripts/quality/*.mjs`; the a11y scan runs as a report (its exit code does not fail the step) | lead | — |

A change to this table goes through the lead; both sides get the new text.

## 4 · What each agent returns
- The list of files it CHANGED (the lead copies back nothing: agents edit the clone; scopes are disjoint).
- Per pin: the command (`node scripts/run-pins.mjs pins-qtools/<mod>`), the green line, each break and its red line.
- What it could not prove (unrun, not reachable from the cloud, an API that refused).
- Anything it saw outside its scope: a note, not a fix.

## 5 · Integration order and checks (the lead)
1. `npm install --save-dev --save-exact` of the two dependencies, `npm audit` → the registration line → `node scripts/run-pins.mjs pins-qtools/…`.
2. The `--check` gates, `actionlint` on the workflows, `node scripts/quality/run-ci-checks.mjs` on the tree.
3. The #46 loop (Fable 5.2 security reader every round; Opus readers for the rest) until CLEAN; between rounds the pins the
   fix touches; the full smoke ONCE after the last fix + CSH → export → commit → ONE push → read back → compare link.

## 6 · What each check catches / cannot see / its false-positive plan
| Check | Catches | Cannot see | False positives |
|---|---|---|---|
| CodeQL | taint paths into sinks (XSS, path, command), weak crypto, unsafe deserialisation, in Spixi C# (no build) and our JS | code reached through MAUI handlers it cannot resolve without a build; Ixian-Core (not in the repo) | the baseline doc reads each; a false one is dismissed in GitHub with the reason from the doc |
| SBOM | (an inventory, not a check) what we ship from npm (test tools only) and NuGet | packages pulled by MSBuild workloads | — |
| Scorecard | repo hygiene: pinned actions, token permissions, dangerous workflows, branch rules | the app's own code | checks that need repo settings are Damir's; the doc says which |
| isolation | a trusted shell loaded into the chat WebView (or chat into another), a chat-only verb handled outside the chat page, a WebView setting the gate doc does not list | runtime navigation the C# builds from data; settings set through reflection or a helper it does not know | a new rule hit is read against SECURITY.md § 1; a real exception goes into the gate doc first, never into the script |
| contract | a verb added, removed or moved without the file changing | a verb composed at run time from a variable | regenerate with `--write` and review the diff |
| properties | crashes, hangs, unescaped output, round-trip loss in the parsers that take untrusted input | parsers in C# (FsCheck is not in this batch) | fixed seed; a counterexample is kept and read |
| gate diff | a change of the six kinds with no row in `docs/security-handover-gate.md` | a kind written in a shape its patterns do not know (the calibration lists the misses) | the calibration on 30 merges sets the patterns; a row is always the answer, never a skip |
| a11y | axe-core violations on the built shells (report only) | anything after a user action the scan does not perform | report only in this batch |

## 7 · Planned, not built (the timing of `docs/quality-plan.md`)
- #16 fuzzing of the C# parsers (SharpFuzz): "after freeze, parsers stable".
- #20 reviewer calibration: "once per milestone, from the refactor".

## 8 · The three scanners are REPORTS until Damir rules (#46 rule 9; DECISIONS #2077)
The isolation check (with `lib-csharp.mjs`), the bridge contract check and the gate diff are hand-written scanners. Round 1
and round 2 of the review each found a NEW class of silent fault in them, so no third fix round ran on their code (the
lead-work-session rule 9: the choice goes to Damir). They run in CI as REPORTS (`ENFORCED = []` in `run-ci-checks.mjs`;
a `::warning`, the step stays green) and their pins run in the smoke. The code is as round 2 read it. Recorded, not fixed
(the direction of a fix in brackets):
| Check | Round-2 finding | Direction |
|---|---|---|
| isolation | MA-r2-1 a constructor wrapper (`: this("chat.html")`, a default parameter) or a wrapper with no resolved call site drops its load: ISO-1 / ISO-2 / ISO-3 fail open (a new class made by the round-1 wrapper fix; the head's "fails closed as ISO-3" is false for these shapes) | a wrapper with no resolved literal call → ISO-3 at the `loadPage` site; resolve `this(…)` / `base(…)` / `new`; or no constructor wrappers |
| isolation | MA-r2-2 ISO-8 allows a money verb by (verb, class, mark), not by its sink: a new `addTransaction` in `SingleChatPage.onSend` passes, because `chat` is listed for its balance-compare `new Transaction` | each entry names its allowed sinks; `reach` collects every sink |
| isolation, contract | MA-r2-3 a target-typed `new(…)` is not read (`Transaction t = new(…)`, `WebView w = new()`; 42 uses in the tree) | read `implicit_object_creation_expression` with the declared type |
| isolation | the XAML reader reads only double-quoted attributes and a plain `TargetType` (not `{x:Type WebView}`) | accept `'…'`, unwrap `{x:Type}` |
| contract | code in a bridge handler outside every verb branch is not marked | read the handler minus its branches as "every verb" |
| isolation | the wall-clock row of `c-isolation.mjs` could go red under load (61 s with three parallel runs); it is a SMOKE row (enforced), so its limit was loosened in round 3 to 180 s (the CI smoke runs alone; 26–35 s measured) | CPU time |
| gate diff | B2-M1 a file git detects as a rename (≥ 50 % similar: a `git mv`, or a delete and an add in one range) from an unscanned path (`src/demo/`, a test, `*.iife.js`, `scripts/`) into a scanned or packaged one is read as unchanged; an edited rename reads only its changed lines (a new class: a rename across the scan boundary) | read every head line of such a rename as added, or `--no-renames` |
| gate diff | the string form `@import "https://…";` is not held by the pin; static ESM `import … from 'https://…'`, `@import` in an HTML `<style>`, `xlink:href`, a meta refresh, `image-set(`, XAML `Source="https://…"`, `ContentResolver.OpenOutputStream`, `NSFileManager` are not kinds | add the patterns and pin rows (before `macfix` for the two file APIs) |
| gate diff | a scanned file whose name has a space reads as "no diff section" → exit 2 (fail closed: once `gate-diff` is enforced, such a pull request cannot pass; today a warning) | cut the header path at its tab |
| gate diff | `scripts/build-shells.mjs` (the SHELLS table) and `scripts/build-demo-bundle.mjs` (the FILES list) are inputs of the checks but not check paths; a second pull request that appends rows to the batch's own earlier section gets MISSING (a new sub-heading is needed) | add the two paths; say "add a new sub-heading" in the output |

Also recorded in round 4 (the runner and the step; no fix, or a fix that waits for the ruling):
| Where | Finding | Direction |
|---|---|---|
| the step / the runner | `pull_request.base.sha` may stay at the value of the day the pull request opened (community reports; not checked on the fork): a pull request opened before `ENFORCED` is filled may keep the base copy with the older list, and its gate-diff range then also holds other merged changes | before the ruling that fills `ENFORCED`: test it on the fork, or take the base of a pull request run as the first parent of the merge commit (`GITHUB_SHA^1`) |
| the step | `npm ci` also runs the root `package.json` lifecycle scripts of the tree under test (none today) and reads a project `.npmrc` (its `script-shell` can start a tree file); `.npmrc` is not a check path | add `.npmrc` to the check paths when the gate-diff code is next opened |
| the step (round 6, S6-m1) | a root `npm-shrinkwrap.json` (preferred by `npm ci` over the lock; `d-lockfile` hashes only the lock) or a tracked `node_modules` folder under `scripts/` (Node resolves it before the root one) changes what is installed or loaded, with no `check-changed` item | add both, with `.npmrc`, to the check paths when the gate-diff code next opens, or let the runner refuse those path shapes; a `d-lockfile` key "no npm-shrinkwrap.json" |
| the runner (round 6, S6-m2) | a scanned file named with `##[stop-commands]` (or a newline + `::stop-commands::`) printed by the gate diff can stop the runner's own `::warning` / `::error` annotations after it; the exit code and the log stay | wrap the forwarded child output in `::stop-commands::<random token>` … `::<token>::`, or neutralise `##[` and a leading `::` |

## 9 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
