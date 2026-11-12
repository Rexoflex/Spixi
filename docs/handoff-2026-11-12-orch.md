# Handoff 2026-11-12 — Session ORCH (the orchestration adopted: one main chat, a Fable 5.2 lead with agents by model, work branches + pull requests inside the fork, "go" = Ready; docs + tracker only)

Read this FIRST, then `docs/orchestration.md`, then DECISIONS #1488–#1498 (end of DECISIONS.md). Number block of this
session: DECISIONS #1488–#1499 (used #1488–#1498; **#1499 stays empty**) · lessons L161–L165 (used L161 and L162; L163–L165
stay empty). The main chat gives the next blocks: the next free block starts at **#1500** / **L166**. Review packets
next **P38**. Mission Control session `orch`. No next prompt was written here (the main chat does that, #1488).

## 0 · State
- Base: `redesign/frontend` @ "Session HK1 (c): documents - the 2026-11-11 rulings, the Perf-R rows, handoff"
  (`4617e487`) = origin, verified 2026-11-12 on Damir's PC clone and on a cloud clone. HK1 is committed and pushed
  (`bff30223` · `68585acc` · `4617e487`).
- **Branch / pull request: NOT made by the session — fallback delivery** (the session prompt § 4 allows it). The
  session has no push access (§ 1b). The 13 files below are in Damir's PC tree, in place, NOT committed. Damir makes
  `work/orch`, one commit (`docs/commit-message-orch.txt`) and the pull request INSIDE the fork — § 7.
- Files (13). New (5): `docs/orchestration.md` · `docs/templates/agent-contract.md` ·
  `docs/handoff-2026-11-12-orch.md` · `docs/review-brief-orch.md` · `docs/commit-message-orch.txt`. Changed (8):
  `CLAUDE.md` · `DECISIONS.md` (+11 rows; #1097 and #1100 marked) · `docs/process.md` · `docs/decisions-index.md` ·
  `docs/lessons.md` (+L161, +L162) · `docs/status-log.md` (+1 entry) · `docs/templates/session-prompt.md` ·
  `docs/templates/handoff.md`.
- CI (`redesign-ci`): this batch has no run yet (Damir's pull request starts it). The first run of the workflow
  (#1, on HK1's push of `4617e48`): GREEN (read 2026-11-12 from the GitHub API through Damir's PC shell): job "smoke + CSH + gates" success in 42 min 19 s (both `--check` gates; the Smoke step 41 min 33 s; CSH 20 s) · job "Windows MAUI build (compile only)" success in 7 min 28 s, 10 compiler warnings, 0 errors — https://github.com/Rexoflex/Spixi/actions/runs/43209524064. The `BASELINE OK` line itself was not read (the job log needs a sign-in); the Smoke step succeeds only on it.
- Smoke: not run. No file under `src/`, `Spixi/`, `scripts/` or `.github/` is changed. The only changed file that the
  smoke reads is `DECISIONS.md`; its one check (the #797 row, `scripts/smoke-test.mjs` "Session O ⑮") was run alone:
  true. Baseline unchanged: `BASELINE OK — 6298 pass / the 2 KNOWN (#136 · B3)` (HK1, 2026-11-11, cloud twin,
  jsdom 29.1.1) · CSH 506.
- Checks: `node scripts/pin-sweep.mjs --working` → `pin-sweep: 2 changed file(s), 1 read by the suite, 1 read site(s) to review` — `DECISIONS.md` at `scripts/smoke-test.mjs:28589` (the #797 row check; run alone: true). `CLAUDE.md` is changed and unpinned; the other changed docs are read by no pin. Not run, and why: the `--check` gates, i18n-lint,
  pseudo, verify-locales, cs-syntax-check, CSH (no shell, string, CSS, icon, legal or C# file changed).
- Review: **CLEAN at r3** (every reviewer a fresh read-only Claude Fable 5.2 instance at high effort; the lead and the page builder never reviewed). Docs: r1 two auditors, 4 + 5 MAJOR → fixed; r2 a fresh reader, 1 MAJOR → fixed; r3 a fresh reader, 0 MAJOR · 13 MINOR · 12 NIT, each fixed or recorded. Mission Control page: r1 0 MAJOR · 7 MINOR · 8 NIT; r2 a fresh reader, 1 MAJOR → fixed; r3 a fresh reader, 0 MAJOR · 3 MINOR · 3 NIT, each fixed or recorded. Stated deviation: the MINOR fixes after r3 were checked by the lead only. · brief `docs/review-brief-orch.md` · models: lead Claude Fable 5.2; builder of the Mission
  Control page Opus (high); reviewers fresh read-only Claude Fable 5.2 (high).
- ⚠ C# UNCOMPILED: none in this batch. (Still owed from HK1: the first Apple compile of `SThumbnail.cs:80`.)
- Uncommitted work of other sessions (never touched): `docs/handoff-2026-09-30e.md`,
  `docs/ixian-agent-strategy-reference.md` (untracked).
- Definition of done (`docs/release-readiness.md`): no row changed. V-19 ("CI runs") stays OPEN: it also covers
  CodeQL, the isolation check, the contract file and property tests.
- Still owed: Damir's branch + commit + pull request + merge (§ 7) · his rulings (§ 4) · the walks (`walkchunks` = Next; ★ #1472 unchanged).

## 1 · What this session did
| Item | Result | Evidence | Row |
|---|---|---|---|
| A · `docs/orchestration.md` | New. The kit text made true for Spixi: base branch `redesign/frontend`, work branches `work/<batch>`, the fork `Rexoflex/Spixi`, **pull requests only inside the fork**, `redesign-ci` (two gates + smoke + CSH + a Windows compile; no macOS job), the cloud twin facts (L160, L75, L153), Mission Control, #46 with #1471 **before the first push**, the stop conditions (added: a risky C# part; the security handover gate when the prompt does not cover it; no Ready status; a ★ rule would change), the no-push fallback, what the account allows today (§ 7), the probe (§ 9) | the file | #1488–#1494 |
| B · `CLAUDE.md` | ★ ONE TALK SESSION and ★ AGENTS AND MODELS added; ★ COMMIT RULE → ★ COMMIT AND PUSH RULE (the attribution sentences word for word; ★ MAC RE-SYNC REMINDER untouched); FORGE: the read list, "go" = Ready, the interview in the main chat; loop steps 6–8 (6 = #46, unchanged in meaning; 7 = commit · push · pull request; 8 = walk · merge); Hard rule: number blocks; doc index (+ `docs/orchestration.md`, the project docs); "Where we are now" replaced | `git diff CLAUDE.md` | #1488–#1494 |
| C · `docs/process.md` | § F (read list, the stop wording), § R (main chat), the #46 "When" ("before delivery" = before the first push), § E (export before the push; pull request; status doc; no next prompt by a work session), ready / **walk-ready** / done, Working rules (Who talks, Who decides, Commits and pushes, Where to build, Delivery = fallback, Numbers, Prompts), six Spixi-vs-Bot rows changed + one new row, **Appendix B: the replaced texts of `CLAUDE.md` and `docs/process.md`, word for word** (generated from `git show`) | `git diff docs/process.md` | #1488–#1494 |
| D · templates | `session-prompt.md` = the stand-alone prompt of an unattended work session; the Spixi constraints of the old template are kept (frozen bridge + the BE ask, #1312, #1478, the security handover gate, C# touches no risky parts, pipeline order, the baseline with the pinned npm line, #46 with #1471, #215, the PowerShell commands, the commit-message file for the fallback); the interview line is replaced by "do not interview" (#1492) · `agent-contract.md` new · `handoff.md`: branch / pull request / CI lines, § 7 = how Damir checks out and builds the branch + the no-push fallback | the files | #1489, #1490, #1493 |
| E · DECISIONS | #1488–#1494 ✅ (Damir's words quoted in #1488–#1490; what this session added is labelled in each row) · #1495–#1497 🟡 proposals · #1498 the session record · #1097 and #1100 MARKED (text added, none changed) · `docs/decisions-index.md` (the workflow line, the #1097 line, 8 new rule rows) · L161, L162 · one status-log entry | the files; the #797 row check true | #1488–#1498 |
| F · Mission Control | The page is republished (version `1794489997-4e2b` over `1792056582-4802`; the served file = the reviewed file): item statuses "Ready" and "Walk owed", session statuses "Ready" / "Running" / "Walk owed" / "Waiting on someone", session fields `branch`, `pull_request`, `file_areas`, `decisions_block`, the "Needs you" list; with today's data every old view is unchanged (the two new Board columns show only when they hold an item). Data (pinned writes; 814 → 821 documents, nothing deleted, no order changed): session `hk1` → Done with `bff30223` · `68585acc` · `4617e487` · item `n-20261019-redesign-ci`: a note with the result of run #1 (status not changed) · new session doc `orch` ("Waiting on someone"; order 44.3 is a place only) · new item `n-20261112-mc-page-old-defects` · 5 changelog entries. `walkchunks` untouched. | the page; its changelog | #1491 |
| G · project docs | `claude/talk-session-prompt.md` (new; the board, the "I say → you do" table, #1472, disjoint file areas, number blocks, the claims rules) · `claude/mission-control-howto.md` (statuses, the work-session block, the status-doc shape, "main chat", the Needs-you rules, rule 11: Done = merged AND walked) · `claude/planning-chat-prompt.md` (one line at the top: superseded) | the project | #1488, #1491 |
| H · probe | ONE scheduled task ran once (11:40–11:45 UTC, cloud only, report only) and wrote `claude/orch-probe-status.md` | § 1b; `docs/orchestration.md` § 9 | #1498, L161 |
| I · skills | Four review cards proposed: `session-handoff`, `forge-engineering-session`, `spixi-build-and-walk`, `adversarial-review-loop`. Damir saved them during the session (seen in the session's skill list; the saved text was not re-read) | the cards in the chat | #1498 |

### 1b · The three facts of the prompt's § 0, and the probe
| Fact | In this attended chat (desktop app linked) | In the scheduled probe run (cloud only) |
|---|---|---|
| 1 · Agent tool with a model and an effort | Yes — `haiku` / `sonnet` / `opus` / `fable`; `low` … `max` | Yes — the same; all four models started; a sub-agent has no Agent tool |
| 2 · Attach `Rexoflex/Spixi` with push access, push a branch | **No** — "link your GitHub account to let Claude access repositories". A read-only clone works; the GitHub API is refused | **No** — the git proxy refuses the push; the run has no tool to attach a repo |
| 3 · Start a scheduled task that runs once | Yes | (it was that task) |

The probe also found: Mission Control (383 items, 28 sessions) and all 124 project docs are readable in a scheduled
run; it has no link to the PC (the task was not set to require the computer); a cloud commit is authored
"Claude <noreply@anthropic.com>" by default. So `docs/orchestration.md` § 7 says that push from a cloud session is
not available yet, and that today a work session is started by Damir pasting the prompt into a new chat.

## 2 · Walk
No walk sheet: docs + tracker only, no app behaviour change. Walk debt is unchanged (four batches unwalked + one
half walked; ★ #1472: no new BUILD session before the walks).

## 3 · Proposed next steps (the main chat decides)
Outcome: Damir says "plan X" and "Ready" in one chat; a work session builds X alone and stops at walk-ready.
1. Damir: § 7 (branch, commit, push, pull request inside the fork, review, merge).
2. Damir starts the main chat from `claude/talk-session-prompt.md` and rules § 4 there (the main chat takes a number
   block from #1500 / L166 for the rows).
3. Damir links GitHub for Claude; one session proves a push of `work/*` and a pull request inside the fork; then
   `docs/orchestration.md` § 7 and § 9 are corrected.
4. The walks (`walkchunks`), then `tooling` and `macfix` — each from a prompt doc with its own number block.

## 4 · Open questions for Damir (rule them in the main chat)
| # | Question (options) | Blocks |
|---|---|---|
| 1 | 🟡 #1495 (P-a): merge a pull request only after its walk? (yes, from the first work session on · no: Damir decides per pull request, as now) | whether a batch may build on an unwalked one; ★ #1472 counts WALK rows either way |
| 2 | 🟡 #1496 (P-b): the smoke between #46 rounds — (a) keep the Hard rule · (b) #1474 as written · (c) the affected pins by the lead + CI's run counts (then the branch is pushed before CLEAN) | the cost of every #46 loop |
| 3 | 🟡 #1497 (P-c): a nightly task that takes the top Ready item? (not before a session can push and reach what it needs) | nothing today |
| 4 | Link GitHub for Claude and give sessions `Rexoflex/Spixi` with push access (`ixian-platform/Spixi` read-only)? | the normal path of ★ COMMIT AND PUSH RULE; until then every delivery is the fallback |
| 5 | Which author name and e-mail does a work session use for its commits? (the cloud default is "Claude <noreply@anthropic.com>", which shows the session on GitHub) | the first pushed commit of a work session |
| 6 | Which merge method for a pull request? ("Create a merge commit" keeps the commits and adds nothing; a squash merge of commits by another author adds a `Co-authored-by:` trailer — an attribution line) | the first merge of a session's commits |
| 7 | (answered during the session: Damir saved the four skill cards) | — |
| 8 | The scheduled task "Mission Control daily sync": add to its prompt "WALK-READY → the session Walk owed; Done only by howto rule 11; never set Ready or Running"? The howto says it; the task's own prompt still says "built / committed → Done" | a wrong "Done" on a walk-ready session |
| 9 | Protect `redesign/frontend` on GitHub (green CI + Damir's review), as the kit proposes? | nothing; it would make "never push the base branch" a machine rule |
| 10 | Is a docs-only session exempt from ★ #1472, as this session's prompt assumed ("it changes no app file")? The ★ text names only cloud-only research and tooling | whether the main chat may start a docs session while walks are owed |

## 5 · Recorded, not changed
- The four skill cards are saved; the saved skill text was not re-read by this session. `adversarial-review-loop`
  step 2 still says "dotnet 8" (CSH runs on SDK 10.0.x). Where a skill and the repo disagree, the repo text wins.
- `docs/process.md` § G2 "Smoke baseline" still names **5095** (#1129) as "Current"; `CLAUDE.md` step 5 has the true
  number (6298). Not this session's subject; the next build session corrects it with its own baseline.
- 🟡 #1474 cites `CLAUDE.md:51`, `docs/process.md:89` and `:97`; those lines moved with this batch. #1496 names the
  places without line numbers. The row itself is not edited.
- `CLAUDE.md` "Plan before building" is unchanged, word for word; the kit's shorter text was not taken.
- `docs/lessons.md` L25 ("before the batch leaves the machine") holds as written: the first push comes after CLEAN.
- `docs/templates/review-brief.md` (says "container twin" = the cloud twin), `review-verdict.md` and `walk-sheet.md`
  are unchanged. `docs/prompts/session-N.md` stay as history.
- Not adopted from the kit (no ruling asked): `docs/testing.md`, `docs/release-process.md`, `ci/self-test.sh` +
  `tests/breaks/`, `CHANGELOG.md`, `hotfix/<version>` branches, branch protection.
- `.github/workflows/redesign-ci.yml` is unchanged: it runs on a pull request to `redesign/frontend` and on a push
  to `redesign/frontend`; a push to `work/*` without a pull request starts no run.
- The scheduled tasks "Mission Control daily sync" and "Spixi CI watch" are unchanged. The probe task is spent
  ("ORCH probe (run once)").
- Mission Control page, defects that were there before and are not fixed (found by the page review; one Mission
  Control item holds them): a session form that stays open while a session writes the same doc saves its old values
  over the new ones; the session notes field stops at 2 000 characters; moving a release has no Undo.
- Older rows, handoffs and prompts that say "planning chat", "orchestrator" or "Damir commits" are history and are
  not rewritten.

## 6 · Lessons (also appended to docs/lessons.md)
L161 (#1498): probe what an UNATTENDED run can reach before you design a flow around it (push, CI results, the PC,
the commit author, the Agent tool of a sub-agent). One report-only task that runs once answers it in five minutes.
L162 (#1498): read the final state of a CI run from the GitHub API (from Damir's PC shell), not from a fetched run
page — the page said "In progress" long after both jobs were green.

## 7 · Repo commands for Damir (PowerShell, one line at a time)
The first use of ★ COMMIT AND PUSH RULE, by the fallback: Damir makes the work branch and the pull request.
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git status -sb
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git diff --stat
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch -c work/orch
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git add CLAUDE.md DECISIONS.md docs/process.md docs/decisions-index.md docs/lessons.md docs/status-log.md docs/templates/session-prompt.md docs/templates/handoff.md docs/templates/agent-contract.md docs/orchestration.md docs/handoff-2026-11-12-orch.md docs/review-brief-orch.md docs/commit-message-orch.txt
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git diff --cached --stat
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git commit -F docs\commit-message-orch.txt
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git push -u origin work/orch
```
- `git status -sb` must show `## redesign/frontend...origin/redesign/frontend`, 8 modified files, and 7 untracked
  files: the 5 new ones of § 0 and the two files of other sessions (`docs/handoff-2026-09-30e.md`,
  `docs/ixian-agent-strategy-reference.md` — they go into NO `git add`).
- `git diff --cached --stat` must show 13 files.
- Do NOT use the link that `git push` prints (`…/pull/new/work/orch`): on a fork it opens the pull request against
  `ixian-platform/Spixi`. Open `https://github.com/Rexoflex/Spixi/compare/redesign/frontend...work/orch?expand=1`.
  **Check the line at the top: base repository `Rexoflex/Spixi`, base `redesign/frontend`.** If it names
  `ixian-platform/Spixi`, stop and change the base repository first. Then "Create pull request". `redesign-ci` runs
  on it.
- Wait for the run to be green (a red run: tell the main chat the failing step). Review the diff, then merge the
  pull request on GitHub (a docs-only batch: no walk; "Create a merge commit" adds
  no trailer — § 4 question 6). After the merge:
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch redesign/frontend
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull
```
- Then tell the main chat "merged": it sets Mission Control `orch` → Done with the merge commit.
