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
| 6 gate diff | the changes of a commit range that need a row in `docs/security-handover-gate.md`; calibrated on 30 merges; a REPORT in CI since round 2 (§ 5) | `scripts/quality/gate-diff.mjs`, `scripts/quality/gate-diff.md`, `scripts/pins-qtools/d-gatediff.mjs` |
| 7 a11y scan | axe-core over the built shells (light / dark × phone / desktop) through Chrome's DevTools protocol, a REPORT | `scripts/quality/a11y-scan.mjs`, `docs/a11y-baseline.md` |
| CI | ONE step in `redesign-ci.yml` that runs 6, 3, 4 (each fails the step only when `ENFORCED` names it: none since round 2, § 5) and 7 (always a report) | `.github/workflows/redesign-ci.yml`, `scripts/quality/run-ci-checks.mjs`; re-based pin `scripts/pins-leanfollow/d-ci.mjs` (rows 13, 18) |
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

### Round 1 (readers S Fable 5.2 · A, B, C Opus; tree `8ac57424`) — MAJOR 10 (S 2 · A 6 · B 1 = S-1 · C 2) → fixed in `b3c9d7e2`
- S-1 = B-M1 the gate diff dropped files git prints as binary (`.gitattributes`, a NUL byte; 15 `src` files are `-diff` today) → `--text`, attributes off, `.gitattributes` a check path, binary = exit 2.
- S-2 the pull request's own runner chose the copy and the base came from a writable event file after the tree's code ran → the step now runs right after `npm ci`, takes `BASE_SHA` through `env:`, starts the BASE copy of the runner; the limit (code in the same job) is stated.
- A MA-1…MA-6 → load wrappers resolved, XAML `Source`, HybridWebView and WebView subclasses, `new Transaction` and three more money names (`chat` / `chatreply` now marked money, listed with the reason), the base verbs in the mini-app WebView listed, unparsable C# files fail closed (three listed).
- C M1 a flaky timing break row → a behaviour check + CPU time; C M2 a property false on other seeds → corrected and swept over 33 seeds.
- MINORs fixed or stated in the heads (the lists in the builders' returns): check paths wider, qualified type names, the row rule (own section only; an API token alone names nothing), CSS `url(`, the media gate property, two more held defects (N1-upper), Chrome blocked from the network, Chrome death detected, the OK lines required, `workflow_dispatch` wording, the SBOM on pull requests.

### Round 2 (readers S Fable 5.2 · A, B, C Opus; tree `7208382d`) — MAJOR 5 (S 0 · A 3 · B 1 · C 1)
- A MA-r2-1 (constructor / unresolved load wrappers fail open — a NEW class made by the r1 fix), MA-r2-2 (ISO-8 allows by verb, not by sink — NEW), MA-r2-3 (target-typed `new(…)` — a remainder); B B2-M1 (a `git mv` across the scan boundary is not read — NEW). Rule 9 of the lead-work-session skill: the three hand-written scanners showed a NEW class of silent fault in r1 and again in r2 → no third fix round on their code; they run in CI as REPORTS (`ENFORCED = []` in `run-ci-checks.mjs`) and the choice goes to Damir (DECISIONS #2077). Every r2 finding on them is recorded with its direction in `docs/contract-qtools.md` § 8; two false statements corrected as text (the `appAccept` / `appReject` reasons; `gate-diff.md` § 2 on moved files).
- C C2-M1 (property M3 false on 3 of 1,500 seeds) → held as `QTOOLS-KNOWN M3-zeros` (`money.js:335`); 701 seeds swept green.
- MINORs fixed in round 3: the workflow comment on what a failure skips, the census instruction (a row also in the batch's own section), the scorecard line references, 540 s, the B3 clock clause dropped, parsers.md references. S MINOR-1 (a path with a space → exit 2) recorded (§ 8).
