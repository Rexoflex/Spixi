# Review brief — Session ORCH: the orchestration adopted in Spixi (#1488–#1498)

Work order for the #46 adversarial loop (`docs/process.md`). Written BEFORE round 1; the dials in § 4 were
completed after rounds 1 and 2, and § 5 when the loop closed. Docs + tracker only; no file
under `src/`, `Spixi/`, `scripts/` or `.github/workflows/` is changed. The verdict is in § 5.

## 1 · What the batch is
| Item | What landed | Where | DECISIONS |
|---|---|---|---|
| A | Who runs what, made true for Spixi (base branch, the fork, CI, cloud twin, stop conditions, what the account allows, the probe) | `docs/orchestration.md` (new) | #1488–#1494, #1498 |
| B | ★ ONE TALK SESSION · ★ AGENTS AND MODELS · ★ COMMIT AND PUSH RULE (replaces ★ COMMIT RULE) · FORGE "go" = Ready · loop steps 6–8 · doc index · "Where we are now" | `CLAUDE.md` | #1488–#1494 |
| C | § R, the #46 "When", § E, ready / walk-ready / done, working rules, the Spixi-vs-Bot rows, Appendix B (the replaced texts, word for word) | `docs/process.md` | #1488–#1494 |
| D | The unattended work-session prompt · the agent contract (new) · the handoff (branch / pull request / CI, § 7) | `docs/templates/session-prompt.md`, `agent-contract.md`, `handoff.md` | #1489, #1490, #1493 |
| E | Rows #1488–#1498 (7 ✅ rulings, 1 record row, 3 🟡 proposals); #1097 and #1100 marked; the index; L161, L162; one status-log entry; the handoff | `DECISIONS.md`, `docs/decisions-index.md`, `docs/lessons.md`, `docs/status-log.md`, `docs/handoff-2026-11-12-orch.md` | all |
| F | Mission Control page: item statuses Ready / Walk owed; session statuses Ready / Running / Walk owed / Waiting on someone; session fields `branch`, `pull_request`, `file_areas`, `decisions_block`; a "Needs you" list. Data: `hk1` → Done, the CI item's note, a session doc `orch` | the Artifact "Spixi Mission Control" (reviewed as a candidate file against the live page, in the session's cloud workspace, before it was published) | #1491 |
| G | The main chat's starter prompt; the howto (statuses, the work-session block, the status-doc shape, "main chat"); the planning-chat prompt marked superseded | project docs `claude/talk-session-prompt.md`, `claude/mission-control-howto.md`, `claude/planning-chat-prompt.md` (reviewed as candidate files before they were written to the project) | #1488, #1491 |
| H | The probe: one scheduled task that ran once, report only | project doc `claude/orch-probe-status.md`; `docs/orchestration.md` § 7, § 9 | #1498 |
| I | Skill review cards: `session-handoff`, `forge-engineering-session`, `spixi-build-and-walk`, `adversarial-review-loop` (proposed; Damir saved them during the session) | review cards in the chat | #1498 |

Not built, and why: no push and no pull request by the session (no push access — § 0 fact 2 of the prompt = no; the
fallback delivery is used) · the kit's `docs/testing.md`, `docs/release-process.md`, `ci/self-test.sh`, hotfix
branches and branch protection (no ruling asked for them; listed in `docs/orchestration.md` § 9) · no change to the
scheduled tasks "Mission Control daily sync" and "Spixi CI watch" (not in the work items).

## 2 · How to run
- Tree: a cloud clone of `Rexoflex/Spixi` `redesign/frontend` @ "Session HK1 (c): documents - the 2026-11-11
  rulings, the Perf-R rows, handoff" (`4617e487`) in the session's cloud workspace; the batch = its working-tree diff
  (`git status --short`, `git diff`, plus the untracked new files).
- Source texts (the generic kit): on Damir's PC, `Claude outputs/project-kit/`; the session prompt = the project doc
  `claude/session-orch-prompt.md`.
- Pipeline: none (no source, shell or C# file changed). Smoke: not run — no file that the smoke reads is changed
  except `DECISIONS.md`, whose one check (`scripts/smoke-test.mjs` "Session O ⑮", the #797 row) was run alone: true.
  `pin-sweep --working`: `pin-sweep: 2 changed file(s), 1 read by the suite, 1 read site(s) to review` — `DECISIONS.md` at `scripts/smoke-test.mjs:28589` (the #797 row check; run alone: true). `CLAUDE.md` is changed and unpinned; the other changed docs are read by no pin.
- Known failures: the 2 KNOWN (#136 · B3) — not touched.

## 3 · Auditor scopes (disjoint) — fresh read-only Claude Fable 5.2 instances, effort high (#1471)
| Auditor | Scope | Focus |
|---|---|---|
| A — cold start | `CLAUDE.md`, `docs/orchestration.md`, `docs/process.md`, the three templates — read as a NEW work session and as a NEW main chat that saw nothing else | Can a work session run from the repo files alone? Is any ★ rule lost, weakened or contradicted (compare with `git show HEAD:CLAUDE.md` and `HEAD:docs/process.md`)? Does any text let a session push `redesign/frontend`, open a pull request to upstream, merge, interview, skip #46, skip the walk-debt rule, or treat a 🟡 row as in force? |
| B — consistency | every changed or new repo file + the project-doc candidates + the session prompt | Status names, paths, row numbers, branch names, counts, quotes and dates agree across `CLAUDE.md`, `docs/`, the templates, the howto, the talk-session prompt and DECISIONS; each DECISIONS row says what Damir decided (prompt § 2) and no more; the superseded texts are marked and kept word for word |
| C — Mission Control | the live page → the candidate page, the builder's test harness and fixtures, the howto's data model | No item, session, release or view is lost or changed in meaning; old documents render as before; an edit never drops a field; Undo works; the "Needs you" rules equal the howto; phone width |

## 4 · Non-negotiables and accepted dials
- Must hold: every ★ rule of `CLAUDE.md` at HEAD keeps its meaning (the three security ★ rules and ★ LANGUAGE RULE
  byte for byte; the attribution sentences and ★ MAC RE-SYNC REMINDER word for word) · #1471 · #1472 · #1478 · #1312
  · a superseded text is marked, never deleted · rows only in #1488–#1499, lessons only in L161–L165 · no app file,
  script, workflow, walk sheet or Ixian-Core file is touched · Mission Control: never delete, session order unchanged.
- Accepted (do not re-open; Damir, prompt § 2): one talk session · the lead and the model routing · push of
  `work/<batch>` + pull request, Damir merges · Mission Control stays the source of truth · "go" = Ready · #1472 and
  #1478 unchanged · P-a / P-b / P-c are 🟡 proposals only.
- Dials taken by this session (re-open if wrong): the #46 loop stays before the first push of the work branch (the
  old "before the batch leaves the machine"; the kit pushes first) · `CLAUDE.md` loop steps: 6 = #46, 7 = commit ·
  push · pull request, 8 = walk · merge · "not CLEAN at round 5 → stop" (from the kit) · the no-push fallback only
  with "fallback allowed: yes" in the prompt · session status "Waiting on someone" added (#1491) · a dial = a `check`
  text that starts with "Dial:" · Board: the columns "Walk owed" and "Ready" show only when they hold an item;
  "Walk owed" items are not in the top five · one commit for the batch (`docs/commit-message-orch.txt`) · the main
  chat's docs-only commits follow the push rules too, and a row that only records a ruling or a walk needs no #46
  loop · bringing the base into a work branch by a merge commit is not "merging" in the sense of the ★ rule · the
  stop condition "the security handover gate triggers" applies when the prompt does not cover the trigger (#1312).

## 5 · Verdict
**CLEAN at r3** — docs and Mission Control page. Every reviewer was a fresh read-only Claude Fable 5.2 instance at
high effort (Agent tool `model: "fable"`, #1471), with the brief and the tree, never the lead's chat. The lead
(Fable 5.2) wrote the docs; an Opus builder wrote the page delta; neither reviewed. No round was declined.

### Rounds
| Round | Reader | Scope | MAJOR | MINOR | NIT |
|---|---|---|---|---|---|
| r1 | auditor A | cold start: `CLAUDE.md`, `docs/orchestration.md`, `docs/process.md`, the templates | 4 | 21 | 7 |
| r1 | auditor B | consistency: every repo file of the batch + the project-doc candidates | 5 | 19 | 14 |
| r1 | auditor C | the Mission Control page (candidate against live) | 0 | 7 | 8 |
| r2 | fresh reader | the docs: the r1 fixes first, then what they broke | 1 | 10 | 12 |
| r2 | fresh reader | the page: the r1 fixes first, then what they broke | 1 | 2 | 6 |
| r3 | fresh reader | the docs: the r2 fixes first | 0 | 13 | 12 |
| r3 | fresh reader | the page: the r2 fixes first | 0 | 3 | 3 |

Every finding was verified against the tree before a fix; none was rejected as wrong.

### The MAJORs (all fixed)
| # | Mechanism | Fix |
|---|---|---|
| A1 / B1 | Four different answers to "what if the session cannot push" — and no session can push today | ONE rule: the fallback only when the prompt says "fallback allowed: yes", else stop before any build |
| A2 | The review had moved AFTER the push ("the branch may be pushed first") with no ruling; a pushed commit cannot be taken back | The old order is kept: #46 until CLEAN before the first push; `CLAUDE.md` loop 6 = #46, 7 = commit · push · pull request, 8 = walk · merge |
| A3 | "Done" had lost "gates green + CLEAN" | Done = walk-ready, and walked, and merged |
| A4 / B5 | "Appendix B = every replaced text" was false | Appendix B generated from `git show` (29 rows, each verbatim); its intro lists what is not copied |
| B2 | The fallback and no-walk end states had no definition and two session statuses | Defined once in `docs/process.md` (walk-ready · by the fallback · no walk · stopped) and mirrored in the howto |
| B3 | A merge was treated as the end of walk debt (🟡 #1495 by the back door) | Done = merged AND walked; #1472 counts WALK rows; howto rule 11; the talk prompt |
| B4 | "A task touches the frozen bridge → do not code it" contradicted #1312 | The stop rows now say: gate triggers not covered by the prompt → stop; breaking an existing command or needing Ixian-Core → do not code |
| r2 N1 (docs) | The status-doc draft still asked Damir to approve "Done only with the merge" for the daily sync | The ten questions of the status doc = the ten of the handoff § 4 |
| r2 N1 (page) | A merged batch that waits for its walk was listed under "Pull requests to merge" | Listed only while `commit` is empty; the main chat empties `pull_request` at the merge |

Lesson from the loop: a rule that is written in six files needs one owner text and pointers — five of the nine
MAJORs were the same rule stated differently in different places (the same class as HK1's scope-B MAJORs).

### Page: what the readers proved on the final candidate
Same data → same page: the DOM of every old view is identical to the live page on the real sessions, 70 real items,
a 383-item fixture of the real ids and statuses and hostile fixtures, at 1280 / 390 / 320 px, except the planned
additions and the width cap of one select. Writes and Undo for the old statuses and fields are byte-identical to the
live page; an untouched Save writes nothing; the "Needs you" list writes nothing. Only a whitespace-free `https:`
URL with a host becomes a link; no injected element with hostile values in every field. The served file after the
publish equals the reviewed file (sha256).

### Recorded, not fixed (with the reason)
- Docs: the old `docs/process.md` rows "CI-push budget" and "Spixi merges once at the end (#916)" now stand beside a
  CI budget and per-pull-request merges (unchanged rows; a later docs batch) · a restart of a session whose branch is
  already pushed is not described (no such case yet) · the main chat's "Plan X" row does not repeat "read the code the
  scope touches first" · `CLAUDE.md` "Where we are now" is longer than two screens want.
- Page (accepted): the "Next session" tile ignores Ready / Running · a session can show under "Walks owed" and under
  "Pull requests to merge" (the merge timing is Damir's, 🟡 #1495) · Undo of a first edit of a new field leaves `""`
  instead of removing the key · the status select is 33 px wider than before · a link's text is the raw value.
- Page (already in the live page, not regressions → Mission Control item `n-20261112-mc-page-old-defects`): a session
  form that stays open saves its old values over a newer write · session notes stop at 2 000 characters · no Undo for
  a release move. Also seen, not booked: a non-string `title` / `depends_on` blanks the page; sessions past 200 are
  not loaded.
- Not proven by any reader: the page inside the real claude.ai frame against the live database (all runs used a stub
  of the database written from its contract); Safari / iOS; how GitHub renders the compare URL for this fork.

### Stated deviations
- No smoke was run: no file that the smoke reads changed except `DECISIONS.md` (its one check, the #797 row, run
  alone: true), so "full smoke between fix and review rounds" had nothing to run on.
- The MINOR and NIT fixes after r3 (docs wording; three page tokens: the Walks-owed text for a merged batch, a guard
  against object values, the howto wording) were checked by the lead with the builder's harness, not by a further reader.
- The page and the project docs were published after CLEAN and before Damir's commit of the repo docs: they are not in
  the repo and cannot wait for a pull request.
