# Review brief — qtools (quality tooling: CodeQL, SBOM + Scorecard, isolation check, bridge contract, property tests, gate diff, a11y scan; #2070–#2079)

Work order for the #46 adversarial loop (docs/process.md). Written BEFORE round 1. The verdict goes into § 5 when the loop
closes (#660). Contract: `docs/contract-qtools.md`. Prompt: project doc `claude/session-qtools-prompt.md`.

## 1 · What the batch is
| Item | What landed | Where (files) |
|---|---|---|
| 1 CodeQL | a new workflow, C# + JS/TS, build mode `none`, `security-extended`, paths config; the first run's findings as a baseline doc (no code fixes) | `.github/workflows/codeql.yml`, `.github/codeql/codeql-config.yml`, `docs/codeql-baseline.md` |
| 2 SBOM + Scorecard | a CycloneDX SBOM of the npm tree and of the .NET projects as a build artifact; Scorecard results as SARIF; the failing checks as a baseline doc | `.github/workflows/sbom.yml`, `.github/workflows/scorecard.yml`, `docs/scorecard-baseline.md` |
| 3 isolation check | a static check of the PARAMOUNT invariant (SECURITY.md § 1, #220) | `scripts/quality/isolation-check.mjs`, `scripts/pins-qtools/c-isolation.mjs` |
| 4 bridge contract | every `ixian:` verb (senders, handler file, payload, marks) generated from the code + a `--check` gate | `scripts/quality/bridge-contract.mjs`, `docs/bridge-contract.json`, `scripts/pins-qtools/c-contract.mjs` |
| 5 property tests | fast-check over the JS parsers of untrusted input, in the smoke | `scripts/pins-qtools/e-props.mjs`, `scripts/quality/parsers.md` |
| 6 gate diff | the changes of a commit range that need a row in `docs/security-handover-gate.md`; fails a pull request without the row; calibrated on 30 merges | `scripts/quality/gate-diff.mjs`, `scripts/quality/gate-diff.md`, `scripts/pins-qtools/d-gatediff.mjs` |
| 7 a11y scan | axe-core over the built shells (light / dark × phone / desktop) through Chrome's DevTools protocol, a REPORT | `scripts/quality/a11y-scan.mjs`, `docs/a11y-baseline.md` |
| CI | ONE step in `redesign-ci.yml` that runs 3, 4, 6 (fail) and 7 (report) | `.github/workflows/redesign-ci.yml`, `scripts/quality/run-ci-checks.mjs`; re-based pin `scripts/pins-leanfollow/d-ci.mjs` (rows 13, 18) |
| deps | `fast-check` 4.11.0, `axe-core` 4.14.1 (exact; `npm audit`: no finding for them) | `package.json`, `package-lock.json` |

Not built, and why: #16 fuzzing of C# parsers ("after freeze") · #20 reviewer calibration ("once per milestone").

## 2 · How to run
- Tree: the cloud clone `/home/claude/spixi`, branch `work/qtools`; range `ae7b8303..HEAD` (`git diff ae7b8303 HEAD`). Read only: do not edit, commit or check out anything; scratch only under your own `/home/claude/scratch/review-<round>-<you>/`.
- Pins: `node scripts/run-pins.mjs pins-qtools/c-isolation pins-qtools/c-contract pins-qtools/d-gatediff pins-qtools/e-props pins-leanfollow/d-ci`.
- Checks: `node scripts/quality/isolation-check.mjs` · `node scripts/quality/bridge-contract.mjs --check` ·
  `node scripts/quality/gate-diff.mjs --base ae7b8303 --head HEAD` · `BASE_SHA=… HEAD_SHA=… node scripts/quality/run-ci-checks.mjs`
  · `/home/claude/tools/actionlint .github/workflows/*.yml`.
- Known failures: the 2 KNOWN (#136 · B3).

## 3 · Auditor scopes (disjoint)
| Auditor | Model | Scope | Focus |
|---|---|---|---|
| S (security, every round) | Claude Fable 5.2 | the four workflows, `run-ci-checks.mjs`, `package.json` + lock | token permissions (read-only top level; write only where a job needs it), every action pinned by full SHA (resolve the tag yourself if you can), no `pull_request_target`, no secret, no `${{ }}` in a `run:`, script injection through event values, the supply chain of the two new dependencies (versions, integrity, install scripts, transitive packages), whether a pull request AUTHOR can skip or weaken a check (the base-copy rule of the gate diff, the limits the files state) |
| A | Claude Opus | `isolation-check.mjs`, `bridge-contract.mjs`, `docs/bridge-contract.json`, their pins | is each rule TRUE on the tree and does it catch its class; false negatives a mistake (not a hider) would make; does each deliberate break fail for exactly its reason; is the contract deterministic and complete (sample verbs by hand) |
| B | Claude Opus | `gate-diff.mjs`, its doc, its pin, the re-based `d-ci.mjs` | the six kinds (+ the two added); "a row that names it"; the calibration numbers re-derived on 3 merges by hand; exit 2 paths; no skip token |
| C | Claude Opus | `e-props.mjs`, `parsers.md`, `a11y-scan.mjs`, the three baseline docs | are the properties true for correct code and do they fail on a mutated parser; fixed seed; does the a11y scan always kill Chrome; are the baseline reads (real / false / needs BE) honest |

## 4 · Non-negotiables
- No app file changed (`Spixi/**`, `src/**`: `git diff --stat ae7b8303 -- Spixi src` is empty) · R2 no history comments in the new
  scripts · R6 no script past 1,500 lines · the PARAMOUNT invariant is read, never changed.
- Accepted (do not re-open): #1970 (no walk), the timing of `docs/quality-plan.md` (fuzzing and calibration planned only).

## 5 · Verdict
(open)
