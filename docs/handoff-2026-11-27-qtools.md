# Handoff 2026-11-27 qtools — quality tooling (STOPPED: #46 not CLEAN at round 5; nothing pushed)

Read this FIRST, then DECISIONS #2070–#2079. Number block: #2070–#2079 (all used) · lessons L329–L330 (both used) · no packet.
Prompt: project doc `claude/session-qtools-prompt.md` (Ready by Damir, 2026-11-26 17:05–17:08, #1970). Contract:
`docs/contract-qtools.md`. Review: `docs/review-brief-qtools.md` (§ 5 holds every round).

## 0 · State
- Branch `work/qtools` from `redesign/frontend` @ `ae7b8303` (did not move; read again at the end). Commits by Damir's identity,
  unsigned. **NOT pushed** (#2078): the #46 loop is not CLEAN at round 5 (one MAJOR: row r10 of `pins-qtools/f-runner` is flaky
  when two runs share the temp folder). The tree lives in the cloud clone and in the transfer patch named in the status doc.
- Smoke: base derived `7094 / the 2 KNOWN` (7096 rows; L329) · the final tree `1ce20cb7` (the one round 5 read), ONCE, cloud twin,
  `npm ci`, `TZ=America/Los_Angeles`: **7324 pass, 5 red** = the 2 KNOWN + 3 owed rows of other batches (GATE 44 (b): the guard
  spelling of `bridge-contract.mjs`, `gate-diff.mjs`, `isolation-check.mjs`; `pins-walktools2/d-lockfile` k1 + k9: the frozen
  devDependency list and lock hash) · 7329 rows = 7096 + 233 · CSH `pass=919 fail=0` · `build-shells --check` ✓ · `build-locales --check` ✓.
- No app file: app C# +0, `src/**` +0 (size counter of `work/sizerule`: PASS).
- CI: not run (no push).

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

## 2 · To continue (needs Damir's word for a round 6 in the main chat)
1. Apply the transfer patch on `ae7b8303` (or use the cloud clone), fix r10 (a private `TMPDIR` per case in `f-runner.mjs`),
   r5 F m1 (`silent` cases for `gate-diff` and `bridge-contract`), the three owed smoke rows (the main-module guard of the three
   scanners in GATE 44's spelling `realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])`; re-base
   `pins-walktools2/d-lockfile` k1 / k9 for `axe-core` and `fast-check` + `pure-rand` after a look at the lock diff), optionally the r5 NITs (#2078).
2. Round 6: one Fable 5.2 security reader + one Opus reader over that delta only.
3. The full smoke ONCE + CSH; merge the newest base if it moved (`sizerule` changes `redesign-ci.yml` and `pins-leanfollow/d-ci`:
   keep both steps; re-base row 17 / 18 / the frozen lists of d-ci for the merged file); push; read back; the compare link.
4. Damir's ruling #2077 (scanners: reports / enforce / drop).

## 3 · Open questions
| For | Question | Blocks |
|---|---|---|
| Damir | Q-1 (#2078) permit a round 6 for the r10 fix? (a) yes (recommended): a short follow-up session, then the push · (b) no: the work stays as the patch | the delivery |
| Damir | Q-2 (#2077) the three scanners: (a) recommended — reports now; a follow-up batch on Roslyn for the C# reader + the gate diff's rename class, then `ENFORCED` · (b) enforce now with the recorded gaps · (c) drop | `ENFORCED` |
| Damir | Q-3 the 7 held parser defects and the a11y serious ones: fix batches or record only (Mission Control items "Check") | nothing |

## 4 · Recorded, not changed
- `docs/contract-qtools.md` § 8: every round-2 / round-4 finding on the scanners and the step, with directions.
- Owed outside this batch: SHA pins and `permissions:` in `redesign-ci.yml` / `dotnet.yml`; `.github/dependabot.yml`; Damir's repo settings (branch rule of `master`, code review) — `docs/scorecard-baseline.md`.
- The default branch of the fork is `master`: every `schedule:` and `workflow_dispatch` of the new workflows is inert until they reach it.

## 5 · Lessons
L329, L330 (`docs/lessons.md`).
