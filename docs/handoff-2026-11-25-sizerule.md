# Handoff 2026-11-25 sizerule — the code counter and the CI size checks (STOPPED before delivery: #46 NOT CLEAN at r3, question Q-1)

Read this FIRST, then DECISIONS #1980–#1989. Number block of this session: #1980–#1989 (all used) · lessons L299–L302
(all used) · no packet. Prompt: project doc `claude/session-sizerule-prompt.md` (Ready by ruling #1964 (3)).
Contract: `docs/contract-sizerule.md`. Review: `docs/review-brief-sizerule.md` (§ 5 holds every round and the verdict).
The main chat gives the next block and writes the next prompt.

## 0 · State
- Branch: `work/sizerule` in the session's cloud clone, on `redesign/frontend` @ "Merge pull request #28 from
  Rexoflex/work/walktools2" (`0eda93f5`; the base did not move during the session). **NOT pushed** (#46 not CLEAN,
  `docs/orchestration.md` § 5): five commits — the counter and the checks · the CI step and the pins · the templates
  and the npm sentences · the r1 fixes · the r2 fixes — and the export commit with this file. Author and committer =
  Damir's identity (#1501), unsigned. Saved on Damir's PC: `Claude outputs\_transfer\sizerule-<date>.patch` (git
  format-patch of every commit) + `.sha256` (the status doc names the files).
- CI (`redesign-ci`): not run (no pull request).
- Smoke: baseline `BASELINE OK — 7054 pass / the 2 KNOWN` (untouched base) · the r1-fix tree `BASELINE OK — 7296 pass /
  the 2 KNOWN` (= 7054 + 242) · the r2-fix tree 7331 pass and one timing miss in `pins-fixb1/f-scrollbar` row 1c ("W.
  executeUiCommand is not a function"; green alone twice, #1827 (4)) = 7054 + 278 · environment: cloud twin + Ixian-Core
  @ `097341a`, `npm ci` on the lock (jsdom 29.1.1), `TZ=America/Los_Angeles` · CSH `pass=908 fail=0` (unchanged).
- Checks: `build-shells --check` ✓ · `build-locales --check` ✓ · `cs-syntax-check` ✓ (291 files) · `pin-sweep --working`
  read (one site, `scripts/cs-syntax-check.mjs` at smoke :36719, unaffected) · no `src/**`, so no pipeline.
- Size of this batch (R3, `node scripts/size-count.mjs --base 0eda93f5 --head HEAD`): app C# 243 files · 64,368 code ·
  21,723 comment · 6,106 blank · 61,932 store · 42 switches · 10 files over 1,500 — delta ±0 everywhere; src ±0.
- Review: NOT CLEAN at r3 (MAJOR 7 → 1 → 3) · models: lead Claude Opus · builders Claude Opus (the counter, the checks),
  Claude Sonnet (the CI wiring and the pins; the docs) · readers r1 S Fable 5.2 + A, B, C Opus · r2 S2 Fable 5.2 + X Opus
  · r3 S3 Fable 5.2 + Y Opus.
- ⚠ C# UNCOMPILED: none (no app file changed).
- Definition of done: no `docs/release-readiness.md` row changed.
- Still owed: Damir's answer to Q-1; then the push and the pull request (or the follow-up batch).

## 1 · What this session did
| Item | Result | Evidence | MC |
|---|---|---|---|
| 1 counter | built: `scripts/size-count.mjs` + `scripts/size-lib.mjs`; 63,925 / 20,155 exact per line vs Pygments; the delta | #1980; `pins-sizerule/a-counter` | `n-20261125-size-rule-ci-checks` |
| 2 R2 | built: max 5 marker lines; measured fixb4 23 · histcs 96 · voicefix 0 · lockb 84 · walktools2 14 | #1981; `pins-sizerule/b-checks` | same |
| 3 R5 | built: one line fails; histcs 15, lockb 1; P1Perf calls count | #1982, #1987; `b-checks` | same |
| 4 R6 | built, failing (histcs and lockb would have failed, as meant) | #1983; `b-checks` | same |
| 5 wiring | the size step of `redesign-ci`, `fetch-depth: 2`, the job summary; `d-ci` re-based | #1984; `pins-sizerule/c-ci`, `pins-leanfollow/d-ci` | same |
| 6 self-tests | +278 smoke rows, each case red for exactly its reason | #1985 | same |
| 7 docs | the templates (R1 budget line, R2 / R5 / R6, R3 lines, R4 section), the gate lists, every npm ci sentence | #1986 | `n-20261124-docs-npm-ci-sentences` |

## 2 · Walk
None (cloud-only tooling, #1964 (3)).

## 3 · Proposed next steps (the main chat decides)
Outcome: CI measures every pull request and refuses new history comments, new shipped probes and big-file growth.
1. Damir answers Q-1 (§ 4). The lead recommends (1) now + (2) as the next tooling batch.
2. On (1): apply the patches (§ 7), add the open shapes to ITS LIMITS of `scripts/size-check.mjs` and set #1988 /
   #1981 / #1982 to the ruled state (a docs-only change; the code stays as the r3 readers read it), push, Damir opens
   the pull request. Note for `quotebox` (the next queued batch): R2 counts the word `quotebox` in any letter case
   (`quoteBox` in a comment) — add `quotebox` and `imgurl` to `BATCH_NAME_STOPLIST` in the same change (r3 Y-1).
3. On (2): one tooling session: a small C# tool on Roslyn (the SDK is already in CI) that prints per line the kind and
   the `#if` state the compiler sees; size-lib uses it for app C# and keeps tree-sitter only for the parity report.

## 4 · Open questions and dials
| For | Question (with its options) | Blocks |
|---|---|---|
| Damir | **Q-1 (#1988):** the size checks R2 / R5 catch every ordinary mistake, but three r3 shapes let a DELIBERATELY hidden probe pass (tree-sitter reads them differently from the compiler). (1) ship now as a guard against mistakes, the shapes written as limits · (2) a Roslyn-based classifier in its own batch first · (3) park R2 / R5 (CI prints, does not fail) until (2) · (4) stop the batch | the push of `work/sizerule`; the CI checks for `fixb5` and later |

## 5 · Recorded, not changed
- The r3 MINORs and NITs (`docs/review-brief-sizerule.md` § 5): the checker can be changed by any script of the pull
  request that runs before it (on a pull request the workflow runs the pull request's own code) · batch names that are
  identifiers (`quotebox`, `imgurl`) · the r2 tag widening (`[THEMES]`, `[diagnostics]`; 0 lines today) · two rules
  without a failing pin row · the JS fallback, `#line` text, bare URLs in the summary, literal invisible characters in
  two pins.
- `pins-leanfollow/d-ci`: a break whose anchor text is gone throws instead of turning a row red (the existing pattern).
- The R1 budget is not a CI failure (the budget number is in the prompt; the status doc reports it).

## 6 · Lessons
L299–L302 (`docs/lessons.md`).

## 7 · Repo commands for Damir (PowerShell, one line at a time) — only after the answer to Q-1
The patches are made with `git format-patch 0eda93f5..work/sizerule`; `git am` keeps the authors and messages.
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git status -sb
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch -c work/sizerule origin/redesign/frontend
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; Get-FileHash "..\Claude outputs\_transfer\sizerule-2026-11-26.patch" -Algorithm SHA256
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git am "..\Claude outputs\_transfer\sizerule-2026-11-26.patch"
```
The hash must equal the `.sha256` file. A follow-up session (or the main chat) normally does these steps for Damir in
the cloud with the same patch file; then it pushes `work/sizerule` and gives the compare link
`https://github.com/Rexoflex/Spixi/compare/redesign/frontend...work/sizerule?expand=1` (#1546).
