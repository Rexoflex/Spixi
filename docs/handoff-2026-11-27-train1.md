# Handoff 2026-11-27 train1 — merge train 1: `sizerule`, `applecc`, `macfixa` in one branch; `quotebox2` out (R6)

File name: `docs/handoff-2026-11-27-train1.md`. Read this FIRST, then DECISIONS #2110–#2114 and #1971. Number block of
this session: #2110–#2114 (all used) · lessons L339 (used) · no packet. The main chat gives the next block; it writes
the next prompt.

## 0 · State
- Branch: `work/train1` (from `redesign/frontend` @ `ae7b8303`, "Merge pull request 29 from Rexoflex/work/fixb5") ·
  merge commits, first parent = the train: `2101c623` Merge work/sizerule (`b5588580`) · `66f7f99e` Merge work/applecc
  (`f1b39e5b`) · `78d96bc2` Merge work/macfixa (`d5ca9893`) · `064e0e1b` the resolution fix of review round 1 · then the
  record commit (this file). Push: ONE push of `work/train1` after the record commit, each commit read back through the
  GitHub API (#1546 (3)) · pull request: Damir opens it with the compare link
  `https://github.com/Rexoflex/Spixi/compare/redesign/frontend...work/train1?expand=1` (title and description in
  `claude/session-train1-status.md`) · merge = Damir (a merge commit, #1505).
- Out: `work/quotebox2` (`34e481c1`): the size check R6 fails on it (#2111; options a / b / c there). The resolved merge
  with it is in the cloud clone only (`keep-local/train1-with-quotebox2` @ `33ff4e2a`, not pushed). `qtools`, `imgurl`:
  out by the start line.
- CI (`redesign-ci` + `apple-compile` of `applecc`, both on the pull request): not run at the time of this commit.
  This pull request is the first run of the Size step (from `sizerule`) and the first Apple compile of `macfixa`'s
  `SFileOperations.cs` / `MacSaveRules.cs` / the Apple branch of `AppIconReencode.cs`.
- Smoke: `BASELINE OK 7412 / the 2 KNOWN` = 7094 + 279 + 0 + 39 (the full run: 7411 pass + `fixb4 1 (d)` red as a
  timing miss; the module alone 6 / 6, #1827 (4)) · cloud twin, Ixian-Core @ `097341a`, `npm ci` (jsdom 29.1.1), .NET SDK
  10.0.115, Node 22.23.5, `TZ=America/Los_Angeles` · CSH `pass=946 fail=0` (= 919 + 27).
- Checks: `build-shells --check` ✓ · `build-locales --check` ✓ · `cs-syntax-check` 294 files ✓ · `size-check` PASS
  (R2 0, R5 0, R6 0; app C# +296, `src/**` +19; switches 44 → 47; files over 1,500 lines 10 → 10).
- Review: r1 — Claude Fable 5.2 security-only (CLEAN: 0 MAJOR, 1 MINOR, 2 NIT, record text) + Claude Opus records
  reader (NOT CLEAN: 1 MAJOR, 2 MINOR; fixed in `064e0e1b` and the record commit) · r2: the verdict line in
  `claude/session-train1-status.md` · models: lead Claude Opus; readers fresh, read-only.
- ⚠ C# UNCOMPILED: none written here. The batches' own lists stand: `macfixa` — `SFileOperations.cs` (Mac) and the
  Android and Apple branches of `AppIconReencode.cs`; Windows compiles in `redesign-ci`.
- Still owed: the walk `docs/walk-train1.md` on Windows + Android (the Mac and iPhone rows in the Apple walk) · Damir's
  choice for `quotebox2` (#2111) · the `imgurl` memory A / B (with `imgurl`, in a later train).

## 1 · What this session did
| Item | Result | Evidence |
|---|---|---|
| Precondition | 4 branches named in; heads = their status docs; `quotebox2` later out by the gate | #2110, #2111 |
| Merges | 3 merge commits, the prompt's order; conflicts in record files + smoke registration only | #2112; `git show --cc 66f7f99e 78d96bc2` |
| Gates | smoke 7412 / the 2 KNOWN, CSH 946, size PASS, both `--check`, cs-syntax | #2113 |
| Walk | `docs/walk-train1.md` = Artifact "Spixi walk — train 1" | #2114 |

## 2 · For the next train
- Before the order is set, run `node scripts/size-check.mjs --base <base> --head origin/work/<name>` on each branch
  alone (L339). `quotebox2` fails R6 today.
- The `quotebox2` merge on this train needs: `SpixiFlags.cs` = the base + quotebox2's 58 lines + macfixa's 45 lines
  (both pure insertions after the same line; quotebox2's first), the FLAGSFILE pin re-based and named; the
  `be-review-pack/README.md` total line gets both appended sentences; the gate doc and `release-readiness.md` get both
  blocks; the record files as above.
