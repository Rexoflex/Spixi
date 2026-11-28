# Handoff 2026-11-27 qtools — quality tooling (delivered after round 6; CLEAN; no walk)

Read this FIRST, then DECISIONS #2070–#2079. Number block: #2070–#2079 (all used) · lessons L329–L330 (both used) · no packet.
Prompt: project doc `claude/session-qtools-prompt.md` (Ready by Damir, 2026-11-26 17:05–17:08, #1970); round 6 by ruling #1972
(project doc `claude/session-qtools-round6.md`). Contract: `docs/contract-qtools.md`. Review: `docs/review-brief-qtools.md` (§ 5).

## 0 · State
- Branch `work/qtools` from `redesign/frontend` @ `ae7b8303` (it did not move during the session; read again before the push).
  Commits by Damir's identity, unsigned; ONE push after round 6 (#2078). Damir opens the pull request with the compare link of
  the status doc.
- #46: NOT CLEAN at round 5, CLEAN at round 6 (MAJOR 10 · 5 · 2 · 3 · 1 · 0), #2078.
- Smoke on the final tree, ONCE, cloud twin (`npm ci`: jsdom 29.1.1; Ixian-Core @ `097341a`; .NET SDK 10.0.115;
  `TZ=America/Los_Angeles`): **`BASELINE OK — 7329 pass / the 2 KNOWN`** = 7094 + 235 (the base's count, derived, L329) ·
  CSH `pass=919 fail=0` (+0) · `build-shells --check` ✓ · `build-locales --check` ✓. The 7 `QTOOLS-KNOWN` rows PASS (they hold
  the defects: L1-parse, B2-64, H1-case-fold, M3-zeros, N1-upper, S1-inf, M1-mangle).
- No app file: app C# +0, `src/**` +0 (the size counter of `work/sizerule`: PASS).
- CI: first run owed on the pull request (redesign-ci with the new quality step; CodeQL and the SBOM on the pull request;
  Scorecard only on `master`).
- ⚠ A merge with the train is owed: `work/sizerule` (in `work/train1`) also changes `.github/workflows/redesign-ci.yml` and
  `scripts/pins-leanfollow/d-ci.mjs`. The second of the two to merge keeps both steps and re-bases d-ci (rows 12, 13, 17, 18
  and the frozen lists).

## 1 · What this session did
| Item | Result | Where | MC |
|---|---|---|---|
| 1 CodeQL | built; baseline C# 0, JS 134 (all false) | `.github/workflows/codeql.yml`, `.github/codeql/codeql-config.yml`, `docs/codeql-baseline.md` (#2071) | m170 |
| 2 SBOM + Scorecard | built; Scorecard inert until the file is on `master`; baseline by the CLI + by hand | `sbom.yml`, `scorecard.yml`, `docs/scorecard-baseline.md` (#2072) | m169 |
| 3 isolation | built, a REPORT in CI (#2077) | `scripts/quality/isolation-check.mjs`, `lib-csharp.mjs`, `pins-qtools/c-isolation`, the census in the gate doc (#2073) | m078 |
| 4 contract | built, `--check` a REPORT in CI (#2077) | `docs/bridge-contract.json`, `scripts/quality/bridge-contract.mjs`, `pins-qtools/c-contract` (#2074) | m078 |
| 5 properties | built, 7 defects held | `pins-qtools/e-props`, `scripts/quality/parsers.md` (#2075) | m170 + 7 new items |
| 6 gate diff | built, a REPORT in CI (#2077); calibrated | `scripts/quality/gate-diff.mjs`, `gate-diff.md`, `pins-qtools/d-gatediff` (#2076) | m170 |
| 7 a11y | built, a report | `scripts/quality/a11y-scan.mjs`, `docs/a11y-baseline.md` (#2076) | m078 + 1 new item |
| CI step | ONE step after `npm ci`; the runner + its pin | `redesign-ci.yml`, `scripts/quality/run-ci-checks.mjs`, `pins-qtools/f-runner`, re-based `pins-leanfollow/d-ci` (#2077) | — |
Planned, not built: #16 fuzzing (after freeze), #20 reviewer calibration (once per milestone).

## 2 · To continue
1. Damir: open the pull request with the compare link; merge when CI is green (no walk).
2. The merge with the train (above), and read the first CI run (the quality step's log: `quality checks: ran (gate-diff,
   isolation, bridge-contract) · enforced: none`; the a11y report in the step summary).
3. Before a ruling fills `ENFORCED`: the open rows of `docs/contract-qtools.md` § 8 (the Roslyn rebuild is a later batch).

## 3 · Open questions
None open for this batch: ruling #1972 answered Q-1 (round 6, done), Q-2 (the scanners stay reports; the Roslyn rebuild is a
later batch) and Q-3 (the 8 Mission Control items stay "Check": record only).

## 4 · Recorded, not changed
- `docs/contract-qtools.md` § 8: every round-2 / round-4 finding on the scanners and the step, with directions.
- Owed outside this batch: SHA pins and `permissions:` in `redesign-ci.yml` / `dotnet.yml`; `.github/dependabot.yml`; Damir's repo settings (branch rule of `master`, code review) — `docs/scorecard-baseline.md`.
- The default branch of the fork is `master`: every `schedule:` and `workflow_dispatch` of the new workflows is inert until they reach it.

## 5 · Lessons
L329, L330 (`docs/lessons.md`).
