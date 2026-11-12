# Review brief — Session HK1, the housekeeping patch (#1471–#1487)

Work order and record of the #46 adversarial loop for HK1 (docs/process.md). **Stated deviations:** ① this brief was written AFTER round 1 — the build session has no Agent tool, so the orchestrator ran the rounds and sent the findings; the session wrote them down here with its fixes. ② Round 1 started before a green full smoke (the one full run before it had a flake row, § 2). ③ After the final full smoke only STATUS TEXT changed in documents — `CLAUDE.md`, `DECISIONS.md` (row #1481), `docs/handoff-2026-11-11-hk1.md`, `docs/status-log.md`, this brief and the three commit messages (the "owed" lines closed, the observed smoke line written in) — and of the pins only the #797 DECISIONS row check was re-run, alone: true. No full smoke ran after that text change.

## 1 · What the batch is
| Item | What landed | Where (files) | DECISIONS |
|---|---|---|---|
| iOS / Mac compile fix | line 80: `CoreGraphics.CGImageProperties? props` | `Spixi/Platforms/iOS/SThumbnail.cs`, `Spixi/Platforms/MacCatalyst/SThumbnail.cs` | #1481 |
| Pin | 3 checks, a source pin with its own comment mask | `scripts/pins-hk1/a-thumb-type.mjs`; registration + install hints in `scripts/smoke-test.mjs` | #1481 |
| CI workflow | smoke + CSH + gates (ubuntu), a Windows compile | `.github/workflows/redesign-ci.yml` | #1481 |
| Rulings of 2026-11-11 | reviewer model · working rule · speed plan · smoke per loop (proposal) · own switch · launch target · security items | `DECISIONS.md` #1471–#1474, #1478–#1480; #352 marked; `CLAUDE.md`; `docs/lessons.md`; `docs/process.md`; `docs/decisions-index.md`; `docs/templates/session-prompt.md`; `docs/release-readiness.md` | as named |
| Perf-R rows | six verdict rows + three bookkeeping rows, all "proposed" | `DECISIONS.md` #1482–#1487, #1475–#1477 | as named |
| Session docs | handoff, status-log entry, three commit messages, this brief | `docs/` | — |

Not built, and why: no app behaviour change by scope. No macOS CI job (Mission Control `n-20261111-ci-macos-compile-job`). The 6 smoke rows that fail on jsdom 31 are not re-based (`n-20261111-jsdom31-smoke-rows`). The File tile's photo location notice is not built (`n-20261111-file-photo-location-notice`).

## 2 · How to run
- Tree: Damir's PC tree = the cloud twin of "Session Safety: mini-app paths, …" (`9521f487`) + the uncommitted HK1 edits (working-tree diff; record copy `Claude outputs/_transfer/hk1.patch`).
- Pipeline: none (C# + scripts + documents). Smoke before (Safety, #1470): `BASELINE OK 6295`. Expected after: **6298** (+3 = the new pins). Ixian-Core @097341a present. Install line: `npm i --no-save jsdom@29.1.1 eslint@10.14.0 globals@17.14.0 tree-sitter@0.25.1 tree-sitter-c-sharp@0.23.5` (jsdom 31 fails 6 more rows, L160).
- Full runs on jsdom 29.1.1: ① the first delivery — 6297 pass + the 2 KNOWN + one flake row (`S20G #46 r1 (A-4)`, green alone 3 / 3), 2559 s; ② after the round-1 fixes — `BASELINE OK — 6298 pass / the 2 KNOWN`, 2538 s; ③ after the round-2 fixes — § 5 "Final numbers".
- Known failures: the 2 KNOWN (#136 · B3).

## 3 · Auditor scopes (disjoint)
| Auditor | Model | Scope (files) | Focus |
|---|---|---|---|
| A (r1) | Claude Fable 5.2, fresh, read-only | the two `SThumbnail.cs` · `scripts/pins-hk1/a-thumb-type.mjs` · `scripts/smoke-test.mjs` (the registration) · `.github/workflows/redesign-ci.yml` | does the pin really fail on the break? will the workflow run? |
| B (r1) | Claude Fable 5.2, fresh, read-only | `CLAUDE.md` · `DECISIONS.md` · `docs/lessons.md` · `docs/process.md` · `docs/status-log.md` · the handoff · the commit message | was anything lost or any rule weakened? |
| r2 | Claude Fable 5.2, fresh, read-only | the round-1 fixes (all 18 files) | break my verdict: do the eight fix groups hold? |

All three were started by the orchestrator with the Agent tool, `model: "fable"`. The build session reviewed nothing.

## 4 · Non-negotiables and accepted dials
- Must hold: no app behaviour change · no rule of `CLAUDE.md` weakened or lost · superseded DECISIONS rows are marked, never deleted · no attribution lines in commit messages · the claims rules (four banned phrases) · a pin fails for exactly its break · never claim a gate that did not run.
- Accepted (do not re-open): the reviewer model = Claude Fable 5.2, no fallback to another model — stop and tell Damir (#1471) · the pin is a source pin (no Apple SDK in the twin or on ubuntu CI) · the Perf-R rows stay "proposed" until Damir's picks are recorded.

## 5 · Verdict
**Verdict: CLEAN at round 2 (reviewers: Claude Fable 5.2).** Round 1 found 3 MAJORs in the documents (scope B) and none in the C#, the pin or the CI workflow (scope A); all were fixed; the fresh round-2 reader found 0 MAJOR, and every MINOR and NIT it listed is fixed or recorded below with its reason. The final full smoke after the last fix is green ("Final numbers"). Still owed outside this loop: the first Apple compile of line 80 (Damir's next Mac / iPhone build) · the first run of the workflow on GitHub (Actions must be on for the fork; the push needs the `workflow` scope) · the Windows + Android walk of the earlier drops (page "Spixi Walk Chunks", https://claude.ai/artifact/FfuSyPK1tYxLULHyYUiT23) · Damir's yes or no on 🟡 #1474.
Protocol: 2 disjoint read-only auditors → findings verified against the tree by the session → fixes → a FRESH break-my-verdict reader over the fixes. Every reader: Claude Fable 5.2, run by the orchestrator.

| Round | Reader (model) | MAJOR | MINOR | NIT | Result | DECISIONS row |
|---|---|---|---|---|---|---|
| r1 | A — C# + pin + CI (Claude Fable 5.2) | 0 | 10 | 8 | CLEAN | #1481 |
| r1 | B — documents (Claude Fable 5.2) | 3 | 11 | 8 | NOT CLEAN → fix round 1 | #1481 |
| r2 | fresh reader over the r1 fixes (Claude Fable 5.2) | 0 | 6 | 7 | **CLEAN** | #1481 |

Source of the findings below: the orchestrator's two fix-round messages of 2026-11-11 (the readers' own reports are not in the tree). The counts are the orchestrator's. Only the findings those messages list are recorded here.

### The MAJORs (round 1, scope B)
- **M1 — the Perf-R rows sat in reserved numbers.** Mechanism: `claude/perf-r-decisions-proposal.md` says "#1314–#1319 are the rows #1310 reserved for this research" (the committed `docs/handoff-2026-10-16-safety.md:3` repeats it), and the session followed it. In the tree, row #1320 reserves #1314–#1319 for the six proposals of the SESSION-16 perf research ("its #1313–#1318 move to #1314–#1319"), and the committed BE pack cites them with those meanings. Evidence: `DECISIONS.md` row #1320; `docs/be-review-pack/P17-perf-planned.md:9`, `:35`, `:52`; `core-asks.md:8`, `:10`; `00-refresh-list.md:30`, `:56`, `:528`. Verified: true. Fix: the six rows are removed from the gap and written as #1482–#1487; #1473, #1475–#1477, the handoff, the status-log entry and `CLAUDE.md` point to the new numbers. Lesson: a project doc that names a reserved number is a claim — check the reserving row in the tree first (#215).
- **M2 — #352 contradicted #1471 and was not marked.** Mechanism: #352 (✅, Damir 2026-08-16) says adversarial review runs on Opus, always, never on fable tokens; #1471 named Fable 5.2 without touching #352 or its live copies. Evidence: `DECISIONS.md` #352; `docs/decisions-index.md:45`, `:62`; `docs/templates/session-prompt.md:42`; `docs/release-readiness.md:68` (F-6). Verified: true. Fix: #352 is marked superseded by #1471 for the model (kept); #1471 says that reviewer and builder may now be the same model and that independence rests on fresh read-only instances — the builder's context never reviews; the live copies and L23 are corrected; `docs/process.md` says the skill still names Opus until Damir saves the change and that #1471 wins; one wording everywhere: "no fallback to another model — stop and tell Damir". Lesson: a new ruling names the row it replaces and its live copies in the same patch (grep the old word).
- **M3 — 🟡 #1474 let a session weaken the Hard rule before Damir's yes.** Mechanism: the row said "a session that works this way says so in its verdict", which reads as leave; `CLAUDE.md` put it on one line with ★ rules. Evidence: the first #1474 text; `CLAUDE.md` "Where we are now". Verified: true. Fix: #1474 says "Until Damir's explicit yes the Hard rule wins: full smoke between fix and review rounds" with the three places of that rule; the leave sentence is gone; 55 minutes → 43 (measured); in `CLAUDE.md` the 🟡 row has its own line. Lesson: a provisional row states what holds UNTIL it locks.

### Round 1 — fix table (finding · verdict after the check against the tree · fix)
| # | Finding | Verdict | Fix |
|---|---|---|---|
| M1 | Perf-R rows in #1314–#1319 | confirmed | moved to #1482–#1487; pointers corrected (above) |
| M2 | #352 unmarked; live copies say Opus | confirmed | #352 marked; #1471 rewritten; index, template, F-6, L23, process.md corrected |
| M3 | #1474 weakens the Hard rule | confirmed | rewritten; own line in `CLAUDE.md` |
| B-1 | ★ #1472 and ★ #1478 only in "Where we are now" (a block that is replaced every session) | confirmed | #1472 in "How a session runs"; #1478 as an amendment of the Bridge-protocol ground rule |
| B-2 | #1478: scope too wide; whose words | confirmed (#1321: "F1 F2 F5 F8 MAJOR #9 close holes → no flag"; #1467: "NO runtime flag") | "every change that ships behind a switch keeps its OWN switch …"; #1312 (1), #1321, #1467 unchanged; "as agreed" = Damir's words; the one-page list = the orchestrator's consequence |
| B-3 | #1480's pre-launch condition is in no gate list | confirmed | `docs/release-readiness.md` row G-10 (S10; G-8 and G-9 were taken); the handoff names it |
| B-4 | "6298" and "green" stated before a clean run | confirmed | "expected 6298 (not yet observed in one run)" until the run existed; L160 / #1481: "those 6 rows pass on jsdom 29.1.1" |
| B-5 | #1481 silent on the loop starting before a green smoke | confirmed | one clause in #1481; this brief, top |
| B-6 | no review brief | confirmed | this file |
| B-7 | `docs/process.md:167`, `:170` say "no CI" | confirmed | "workflow added (#1481); first run not proven" |
| B-8 | NITs: #1472 (HK1 = the approved exception; "unwalked" defined) · `CLAUDE.md` "NOT walked" (iPhone + Mac legs of B, C, D and Safety) · handoff cites `a1-wiring.mjs:323–338` | confirmed (the guard is at 324–339) | all three corrected |
| B-9 | one commit for three units | confirmed | three message files -a (C# + pin), -b (CI), -c (documents); the single file is out of the plan (moved out of the repo on the PC) |
| P-1 | sweep root only `Spixi/Platforms` — a new `Spixi-PushService` file passed | confirmed | sweep = `Spixi/` + `Spixi-PushService/` (bin / obj skipped) |
| P-2 | `global using` not counted | confirmed | scope per project: file using · `global using` · implicit usings (CoreGraphics) |
| P-3 | reported line was the stripped text's line (:65 for line 80) | confirmed | own mask keeps newlines; lines are raw-file lines (B1 reports `Spixi/Platforms/iOS/SThumbnail.cs:80`) |
| P-4 | `var props` and `global::CoreGraphics.…` went red though they compile | confirmed | both accepted |
| P-5 | a second read typed `ImageIO.CGImageProperties` passed | confirmed | any declaration typed `ImageIO.CGImageProperties` is flagged, in the two files and in the sweep; the file must have ONE read |
| P-6 | no word on the comment stripper's limit inside interpolation holes | confirmed | holes are read as code; the header names the remaining limits |
| CI-1 | annotations published KNOWN rows / lines of passing steps | confirmed | only a step whose own outcome is failure or cancelled: the `FAILED:` / `ABSENT` block + the last 5 lines; runs on `failure() || cancelled()` |
| CI-2 | no cap | confirmed | 10 per step |
| CI-3 | actions on Node 20 majors | confirmed that newer majors exist (tags + `using: node24` + inputs read in the action repos); the runner date itself was not checked | checkout v7 · setup-node v7 · setup-dotnet v6 · upload-artifact v7 |
| CI-4 | only jsdom pinned | confirmed (versions read from the twin's node_modules) | all five pinned |
| CI-5 | SDK not shown | confirmed | `dotnet --list-sdks` in both jobs |
| CI-9 | runs in any repository | confirmed | `if: github.repository == 'Rexoflex/Spixi'` on both jobs |
| CI-10 | checkout keeps credentials | confirmed | `persist-credentials: false` ×4 |
| CI-11 | 150 minutes is loose | confirmed | 120 |
| CI-12 | the Windows job's claim; no logs kept | confirmed | comment "compile only"; the smoke job's logs uploaded on failure |
| hint | `scripts/smoke-test.mjs:30` names the unpinned line | confirmed | the pinned line |

Not applied in round 1: none. Findings of round 1 that the orchestrator's message does not list are not known to the session.

### Round 2 — the MINORs and NITs (finding · verdict · fixed or recorded)
| # | Finding | Verdict | Fixed / recorded |
|---|---|---|---|
| m1 | pin: `raw()` kept a UTF-8 BOM, so a line-1 `using` behind a BOM was not counted (128 of the 268 swept files have a BOM) — R1 false red, R2 survivor | confirmed (128 / 268 counted) | **fixed** — `raw` drops `^﻿` |
| m2 | pin: `using global::ImageIO;` survived (R11); a project-file `<Using Include="ImageIO" />` survived (R3) | confirmed | **fixed** — `(?:global::)?` in the using tests; the two project files are READ for `<Using Include>` (the session's choice between "read" and "name the limit") |
| m3 | `docs/process.md:69` (the §G2 gate table) and the hints at `scripts/smoke-test.mjs:3`, `:13812`, `:13817` gave the unpinned npm line | confirmed | **fixed** — the pinned line (five versions); text only, no line added |
| m4 | commit messages a and b do not say what arrives with c | confirmed | **fixed** — the sentence is in both |
| m5 | #1483, #1484, #1485, #1487 claimed "list order ✅ by #1473" though #1473 has no clause for them | confirmed | **fixed** — status "🟡 proposed (picks not recorded)" only; the pointer stays in #1482 and #1486 |
| m6 | only the five top-level packages are pinned; transitive ones float | confirmed (`css-tree`, `@asamuzakjp/css-color`, `@asamuzakjp/dom-selector` are in node_modules, unpinned) | **recorded** — L160, the handoff § 3a, #1481, Mission Control `n-20261111-jsdom31-smoke-rows`. Why not fixed: a committed lockfile + `npm ci` changes how every session and CI install the tools — its own change, not housekeeping |
| n1 | pin: `CoreGraphics.CGImageProperties props` without `?` compiles but went red (R4); the name inside a string literal goes red (R5) | confirmed | `?` optional: **fixed**. The string literal: **recorded** in the header as a known FALSE RED. Why not fixed: masking strings would hide real code wherever the mask mis-reads a raw string literal — a false red is the safe side |
| n2 | pin: `UPPER.CS` survived; a dangling symlink crashes the read (ENOENT, exit 1) | confirmed | extension case: **fixed**. The symlink: **recorded** in the header (the smoke stops loudly; it does not pass) |
| n3 | workflow: a hung smoke would end the JOB, so the annotation + upload steps would not run; "never the 2 KNOWN rows" is not strictly true after a cut log | confirmed | **fixed** — `timeout-minutes: 100` on the Smoke step (job 120); the comment softened |
| n4 | #1481 and commit message b: "logs uploaded on failure" | confirmed | **fixed** — "the smoke job only" |
| n5 | reviewer wording differs in `docs/templates/session-prompt.md:42`, `docs/release-readiness.md:68`; index notation | confirmed | **fixed** — the same wording; `docs/decisions-index.md:45` `(#352→#1471)` |
| n6 | the stale sentence that fed M1 is not named | confirmed (`docs/handoff-2026-10-16-safety.md:3`) | **recorded** in the handoff § 9 (a committed handoff is history; not rewritten) |
| n7 | the sweep row's NAME embedded live counts (`"files":266`) | confirmed | **fixed** — a green row's name holds no count (R-name: unchanged after a new `.cs` file); a red row carries the counts and the file list. Still 3 checks |
| fact | the Agent tool accepts `model: "fable"` | orchestrator's fact | written into #1471 |

Round-2 NITs that the orchestrator's message does not list are not known to the session.

### Deliberate breaks (mutations) — all re-run on the FINAL pin
In a separate copy of the tree, green first (3 / 3), one change each, restored after each (`copy = tree` and "the copy ran the final pin file" checked at the end). Runner: `node scripts/run-pins.mjs --root <copy> pins-hk1/a-thumb-type`. Checks: iOS = "HK1 SThumbnail (iOS)", Mac = "HK1 SThumbnail (Mac)", sweep = "HK1 sweep".

| # | Break | Result | Failing checks | As it must be |
|---|---|---|---|---|
| B1 | iOS file, line 80: the `CoreGraphics.` qualifier removed (the code before the fix) | pass=1 fail=2 | iOS + sweep | caught |
| B2 | Mac file, line 80: the qualifier removed | pass=1 fail=2 | Mac + sweep | caught |
| B3 | a third file under `Spixi/Platforms/iOS` with both usings and a bare use | pass=2 fail=1 | sweep | caught |
| B4 | iOS file: `ImageIO.CGImageProperties? props` (the wrong namespace) | pass=1 fail=2 | iOS + sweep | caught |
| B5 | Mac file: the bare name only inside a comment | pass=3 fail=0 | — | green is right |
| M1 | iOS file: a SECOND read typed `ImageIO.CGImageProperties`, after the guard block | pass=1 fail=2 | iOS + sweep | caught (round-1 survivor) |
| M2 | a file in `Spixi-PushService` with both usings and a bare use | pass=2 fail=1 | sweep | caught (round-1 survivor) |
| M2b | a file in `Spixi-PushService` with ONLY `using ImageIO;` and a bare use (implicit usings carry CoreGraphics) | pass=2 fail=1 | sweep | caught |
| M3 | `global using ImageIO;` in the project + a file with only `using CoreGraphics;` and a bare use | pass=2 fail=1 | sweep | caught (round-1 survivor) |
| M3b | both as `global using` + a file with no using and a bare use | pass=2 fail=1 | sweep | caught |
| M4a | iOS file: a bare use inside an interpolation hole | pass=1 fail=2 | iOS + sweep | caught |
| M4b | iOS file: a bare use after an interpolated string whose hole holds a quoted `//` | pass=1 fail=2 | iOS + sweep | caught |
| M4c | iOS file: a bare use after an ordinary string that holds `//` | pass=1 fail=2 | iOS + sweep | caught |
| M4d | iOS file: a bare use after a RAW string literal (`"""…"""`) with an odd quote and `//` | pass=3 fail=0 | — | **survivor, documented** (the mask's stated limit) |
| M4e | iOS file: the bare name inside a `/* */` comment inside an interpolation hole | pass=3 fail=0 | — | green is right |
| M5a | iOS file: the guard no longer reads `PixelHeight` | pass=2 fail=1 | iOS | caught |
| M5b | Mac file: the guard's null test dropped | pass=2 fail=1 | Mac | caught |
| M5c | iOS file: an unrelated statement between the read and the guard | pass=2 fail=1 | iOS | caught (strict: the guard must FOLLOW the read) |
| M6 | iOS file: `var props = src.GetProperties(0);` | pass=3 fail=0 | — | green is right (it compiles) |
| M6b | Mac file: `global::CoreGraphics.CGImageProperties? props` | pass=3 fail=0 | — | green is right (it compiles) |
| X1 | iOS file: `using ImageIO;` removed | pass=1 fail=2 | iOS + sweep | caught (the context the pin describes is gone) |
| R1 | iOS `SThumbnail.cs`: ONLY a UTF-8 BOM added | pass=3 fail=0 | — | green is right (round 2: a false red) |
| R2 | a new iOS file WITH a BOM, both usings, a bare use | pass=2 fail=1 | sweep | caught (round-2 survivor) |
| R2b | a `Spixi-PushService` file WITH a BOM, only `using ImageIO;`, a bare use — the session's reading of "R2b" | pass=2 fail=1 | sweep | caught |
| R3 | `Spixi.csproj`: `<Using Include="ImageIO" />` + a file with only `using CoreGraphics;` and a bare use | pass=2 fail=1 | sweep | caught (round-2 survivor) |
| R4 | iOS file: `CoreGraphics.CGImageProperties props` without `?` | pass=3 fail=0 | — | green is right (round 2: red) |
| R5 | iOS file: the name only inside a string literal | pass=1 fail=2 | iOS + sweep | **false red, documented** |
| R11 | a file with `using global::ImageIO;` + `using CoreGraphics;` and a bare use | pass=2 fail=1 | sweep | caught (round-2 survivor) |
| R-case | `UPPER.CS` under `Spixi/Platforms/iOS`, both usings, a bare use | pass=2 fail=1 | sweep | caught (round-2 survivor) |
| R-symlink | a dangling symlink `HkLink.cs` under `Spixi/Utils` | no RESULT line: `ENOENT`, exit 1 | — | **loud stop, documented** (not a pass) |
| R-name | an unrelated new `.cs` file is added | pass=3 fail=0; the three green row names are identical before and after | — | names stable (n7) |

31 changes, each against a green baseline. At close: 1 survivor (M4d), 1 false red (R5), 1 loud stop (R-symlink) — each named in the pin's header. The reviewers' exact texts of M4 and of R2b, R6, R9, R10 and R12 are not known to the session: M4a–M4e, R2b, R-case, R-symlink and R-name are the session's readings of the mechanisms the orchestrator's messages name; R6, R9, R10 and R12 were not run under those ids.

### Recorded, not fixed
- The flake row `S20G #46 r1 (A-4)`: mechanism read from the code, not reproduced — the bridge's outbox (`src/bridge/native.js:76-88`) sends the first command at once and each later one on its own macrotask; the pin (`scripts/pins-s20g/h-csharp.mjs:213-224`) waits a fixed 900 ms and checks the sent list in the same tick as its click, so a boot-time send that is still draining defers the click's verb by one macrotask (`verb:false`, the switch already flipped). It passed in the later full runs. Owner: us — #1481; handoff § 3b.
- 6 smoke rows fail on jsdom 31.0.0; transitive packages are not pinned (m6) — us / Damir — #1481, L160, Mission Control `n-20261111-jsdom31-smoke-rows`.
- No macOS compile in CI — `n-20261111-ci-macos-compile-job`.
- The pin's three stated limits (M4d, R5, R-symlink).
- `scripts/cs-syntax-check.mjs:43`, `:71` print an install line without versions — not in the review's list; not changed.
- The skill `adversarial-review-loop` still says Opus — Damir saves the change; #1471 wins.
- The first run of the workflow on GitHub and the first Apple compile of line 80 are not proven.

### Final numbers
Suite (cloud twin, Ixian-Core @097341a, jsdom 29.1.1 · eslint 10.14.0 · globals 17.14.0 · tree-sitter 0.25.1 · tree-sitter-c-sharp 0.23.5, Node 22.23.4): **BASELINE OK — 6298 pass / the 2 KNOWN** (#136 · B3), +3 vs 6295 — the full smoke after the last fix, 2548 s (42 minutes), the tree frozen, nothing beside it. CSH **506** (.NET SDK 10.0.115; re-run on the final tree after the final full smoke, 2026-11-11; no file that CSH compiles was changed by HK1). Checks on the final tree before that run: `pins-hk1/a-thumb-type` 3 / 3 · with `pins-s9/a1-wiring`, `pins-s11/g-cs`, `pins-s15/f-strip`: 32 / 32 · `cs-syntax-check` 271 files ✓ · `build-shells --check` ✓ · `build-locales --check` ✓ · the #797 row check true · `actionlint` 1.7.7 clean. Not run: an Apple compile, the workflow on GitHub, `pin-sweep`, `verify-locales`, the other `--check` gates, the Chromium sweeps.
⚠ C# UNCOMPILED: `Spixi/Platforms/iOS/SThumbnail.cs`, `Spixi/Platforms/MacCatalyst/SThumbnail.cs`.
