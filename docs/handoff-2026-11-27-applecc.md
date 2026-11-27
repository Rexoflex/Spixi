# Handoff 2026-11-27 — `applecc`: the Apple compile check in CI; both Apple targets compile with 0 errors

File name: `docs/handoff-2026-11-27-applecc.md`. Read this FIRST, then DECISIONS #2100–#2107. Number block of this
session: #2100–#2109 (used: #2100–#2107; #2108–#2109 stay empty) · lessons L337–L338 (both used) · no packet. The main
chat gives the next block; it writes the next prompt.

## 0 · State
- Branch: `work/applecc` @ the commit "Session applecc: the record …" · base: `redesign/frontend` @ `ae7b8303`
  ("Merge pull request #29 from Rexoflex/work/fixb5"; it did not move during the session) · push: made after this
  commit, each commit read back through the GitHub API (#1546 (3)) · pull request: Damir opens it with the compare link
  `https://github.com/Rexoflex/Spixi/compare/redesign/frontend...work/applecc?expand=1` (title and description in
  `claude/session-applecc-status.md`) · merge = Damir (a merge commit, #1505).
- CI: `apple-compile` runs 1–5 on `work/applecc` (5 of the 8 permitted); run 4 (45915584350) and run 5 (45917920666,
  the delivered workflow) green on both targets. `redesign-ci` runs on the pull request (this batch changes nothing it
  checks). The last commit removes the `push` trigger, so its push starts no `apple-compile` run; the pull request
  starts one.
- Smoke: not run — no shell, no `src/**`, no C# (delta +0 by construction). CSH: not run (no C#).
- Review: CLEAN at r4 · brief `docs/review-brief-applecc.md` · models: lead Claude Opus; readers fresh Claude Fable 5.2
  (security, 4 rounds) and fresh Claude Opus (baseline doc, 2 rounds).
- ⚠ C# UNCOMPILED: none in this batch. The base's Apple targets are compiled now (Debug, simulator / arm64 Mac).
- New files: `.github/workflows/apple-compile.yml`, `docs/apple-compile-baseline.md`, `docs/review-brief-applecc.md`,
  this file.
- Still owed: the recorded r4 findings and the Release leg (#2105, #2107); Damir's branch rule stays as it is (#2104).

## 1 · What this session did
| Item | Result | Evidence |
|---|---|---|
| O1 workflow | `apple-compile`: iOS simulator + Mac Catalyst, compile only, macos-26, toolchain pinned to Damir's Mac | `.github/workflows/apple-compile.yml`, #2100, #2101 |
| O2 annotations | one `::error` per unique file:line:code (≤ 10), full list in the step log, summary ≤ 500 rows, hardened against forged commands | the same file, #2102 |
| O3 baseline | **both compile, 0 errors** at `ae7b8303`; SThumbnail.cs:80 fix is on the base | `docs/apple-compile-baseline.md`, #2103 |
| O4 fallback | not needed (the runner builds); the local one-line command for the Mac is in the baseline § 6 | — |

## 2 · Walk
None (CI only).

## 3 · Proposed next steps (the main chat decides)
1. Damir opens the pull request; read `apple-compile` and `redesign-ci` on it.
2. The Apple walk can start from a tree that compiles; `macfix` and `smooth` pull requests now get an Apple compile.
3. One small batch: the Release leg (#2105) and the r4 findings (#2107).

## 4 · Open questions
| For | Question | Blocks |
|---|---|---|
| Damir | Require approval for workflow runs of outside contributors (Settings → Actions)? (#2104) | nothing |

## 5 · Recorded, not changed
- The r4 findings (#2107) — the last permitted round.
- `redesign-ci.yml` — two other batches change it (prompt).

## 6 · Lessons
- L337 (#2101), L338 (#2102).

## 7 · Repo commands for Damir
Normal path (#1546): open the compare link of § 0, check "base repository: Rexoflex/Spixi · base: redesign/frontend",
paste the title and description from the status doc, click "Create pull request". Nothing to build.
