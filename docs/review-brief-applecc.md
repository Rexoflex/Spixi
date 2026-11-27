# Review brief — applecc (#2100–#2109)

Work order for the #46 adversarial loop (docs/process.md). Written BEFORE round 1. The verdict goes into § 5 when the
loop closes (#660).

## 1 · What the batch is
| Item | What landed | Where (files) | DECISIONS |
|---|---|---|---|
| O1 | A NEW workflow: the iOS target (simulator) and the Mac Catalyst target, compile only, on a GitHub-hosted macOS runner | `.github/workflows/apple-compile.yml` | #2100, #2101 |
| O2 | Each compile error becomes one `::error` annotation; the full list goes to the job summary | the same file, step "Publish the compile errors" | #2102 |
| O3 | The error list at the base, per target, by file, line and batch | `docs/apple-compile-baseline.md` | #2103 |

Not built, and why: no app file changes (a compile fix is app code and gets its own batch, prompt O3). `redesign-ci.yml`
is not changed (two other batches change it).

## 2 · How to run
- Tree: the clone of `work/applecc`; base `redesign/frontend` @ `ae7b8303` ("Merge pull request #29 from Rexoflex/work/fixb5").
- Pipeline: none (no shell, no C#). The workflow's own runs on `work/applecc` are the evidence (run ids in § 5).
- Known failures: not relevant (no smoke change).

## 3 · Reader scopes (disjoint)
| Reader | Model | Scope | Focus |
|---|---|---|---|
| S | Claude Fable 5.2, fresh, read-only | `.github/workflows/apple-compile.yml` only | security only: `permissions`, pinned actions (full commit SHA, the version comment true), what a pull request author can make it run, no secret, no write token, no `pull_request_target`, no expression from the event inside a `run:` script, the annotation escaping (a compile message is text an author controls: can it forge a workflow command?), the `GITHUB_STEP_SUMMARY` write, the global.json written outside the checkout, `sudo xcode-select` |
| B | Claude Opus, fresh, read-only | `docs/apple-compile-baseline.md` against the last run's annotations and logs | every error row is in the run (file:line, code, message), none is missing, the batch named by `git blame` is right, the SThumbnail.cs:80 statement is true, the fix line is plausible and changes no ★ rule |

## 4 · Non-negotiables
- `redesign-ci.yml` unchanged; no app file (`Spixi/**`, `src/**`) changed; no secret; `permissions: contents: read`.
- The job is not a required check (Damir's branch rule).
- The last commit removes the `push` trigger of `work/applecc`.

## 5 · Verdict
**CLEAN at r4 (the last permitted round).** MAJOR per round, reader S (Claude Fable 5.2, fresh, read-only, security
only): r1 0 · r2 0 · r3 0 · r4 0; MINOR: 2 · 2 · 1 · 1. Reader B (Claude Opus, fresh, read-only, the baseline doc):
r1 0 MAJOR · 5 MINOR · 10 NIT (all fixed in the doc), r2 0 MAJOR · 1 MINOR · 6 NIT (all fixed in the doc; doc corrections are permitted after the last round).

| Round | Reader | Tree | MAJOR | MINOR | What happened |
|---|---|---|---|---|---|
| r1 | S | working tree after `895153b0` | 0 | 2 | full-list `::` forgery; raw markdown / HTML in the summary → fixed in `3bb9f49c` with 6 NITs (python3 -I, SDK check, workload outside the checkout, summary caps, line cut, stop-commands around the build) |
| r2 | S | `3bb9f49c` | 0 | 2 | legacy `##[` form in the list; incomplete build-input list in the LIMIT → fixed in `fb27f478` with NITs (summary byte budget, entity escaping, tree global.json refused) |
| r3 | S | `fb27f478` | 0 | 1 | global.json check case-sensitive → fixed in `0b8bc68a` with NITs (csc matcher removed, Cc/Cf in the log rows, "not built", subcategory errors, BOM, tab, ellipsis) |
| r4 | S | `0b8bc68a` read with the push trigger removed | 0 | 1 | two file-only errors with the same code merge; 5 NITs — recorded in DECISIONS #2107, NOT fixed (rule 8) |
| r1 | B | `docs/apple-compile-baseline.md` (first draft) | 0 | 5 | error-code source, "iPhone build" wording, workflow_dispatch needs the default branch `master`, the Mac RocksDB dylib, evidence from the delivered workflow → all fixed (§ 7 = run 5) |
| r2 | B | the revised doc | 0 | 1 | the image label floats (run 5 ran on 20261123.0526.1) → stated; NITs: 13 not 14 files, the store-build part, the office 1693 is a device build, "iOS simulator + Mac Catalyst", the SDK check for the local command, "up to the app bundle" not shown → all fixed in the doc |

The code file is committed exactly as reader S r4 read it, minus the two lines of the `push` trigger (the reader read
it that way): SHA-256 of `.github/workflows/apple-compile.yml` at `0b8bc68a` = `aeee767d4e9b1a4acbecc8cb00e91f63d4118f975546ce4724213f31b2d3429f`;
in the last commit = `f1a10d22758b23994d0b4199df9c940e50d2ab4ac96860e354988f29c37e74b4` (the only diff: the
`push:` key and its `branches` line). Run 5 (45917920666) ran the workflow of `0b8bc68a`: green on both targets.
