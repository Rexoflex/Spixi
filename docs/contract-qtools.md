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

Dependencies (the lead installs them, exact versions, `npm audit` clean): `fast-check` 4.11.0, `axe-core` 4.14.1. The npm
SBOM uses `npm sbom` (built into npm ≥ 9.5): no CycloneDX npm package. The .NET SBOM uses the CycloneDX .NET tool at a
pinned version, installed inside the workflow job only (not in the repo).

## 3 · Interfaces between items (the only way two items meet)
| Name | Shape | Provider | Consumer |
|---|---|---|---|
| I1 isolation check | `export async function check(root) → { ok, findings: [{ rule, file, line, text }], seen }`; CLI `node scripts/quality/isolation-check.mjs [--root <dir>] [--json]` → exit 0 clean / 1 a finding / 2 a check that could not read its input (fail closed). Rule ids `ISO-1` … | builder-c | lead (CI step), pins |
| I2 bridge contract | `export async function generate(root) → object` (deterministic: keys sorted, no line numbers); CLI `node scripts/quality/bridge-contract.mjs [--root <dir>] --write \| --check` → `--check` exit 1 with the verbs added / removed / moved (handler file or sender shell changed) | builder-c | lead, builder-d |
| I3 `docs/bridge-contract.json` | `{ "schema": 1, "generator": "scripts/quality/bridge-contract.mjs", "verbs": { "<verb>": { "senders": [shell file names], "emitFiles": [src paths], "handlers": [{ "file", "member" }], "payload": "<text>", "marks": ["money" \| "keys" \| "path"] } }, "parsers": [ … from builder-e's list, by the lead ] }` | builder-c | builder-d (reads it at base and head with `git show`) |
| I4 gate diff | `export function gateDiff({ root, base, head }) → { items: [{ kind, file, line, token }], rows: [ … ], missing: [ … ] }`; CLI `node scripts/quality/gate-diff.mjs --base <sha> --head <sha> [--root <dir>]` → exit 1 when `missing` is not empty, 2 when a commit cannot be read. Kinds: `webview-setting`, `resource-path`, `verb`, `file-write`, `network-call`, `check-changed` (a change to `scripts/quality/**`, `.github/**`, `docs/bridge-contract.json`). NO skip token: nothing in a commit message, a pull request text or a file disables a kind | builder-d | lead (CI step) |
| I5 held defect | a pin row named `QTOOLS-KNOWN <id>: <defect>` that PASSES while the defect still reproduces (fixed seed + the shrunk counterexample stored in the module) and goes red when it is fixed; the lead adds a Mission Control item "Check" per row | builder-e | lead |
| I6 the CI step | one step `Quality checks (isolation, bridge contract, gate diff; a11y report)` in `redesign-ci.yml`: `node scripts/quality/run-ci-checks.mjs` with `BASE_SHA` / `HEAD_SHA` from the event through `env:` (never `${{ }}` inside `run:`); the runner validates both as 40-hex, runs the gate diff from the BASE's copy of `gate-diff.mjs` when the base has one; the a11y scan runs as a report (its exit code does not fail the step) | lead | — |

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

## 8 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
