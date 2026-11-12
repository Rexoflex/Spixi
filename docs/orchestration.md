# Orchestration — who runs what (Spixi)

Goal: Damir talks in ONE session. Everything else runs in its own session, without him, up to the point where only he
can act (a ruling, a look, a walk, a merge). Rulings: DECISIONS #1488 (one talk session) · #1489 (lead and agents) ·
#1490 (commit and push) · #1491 (Mission Control) · #1492 ("go" = Ready) · #1493 (pull requests stay in the fork) ·
#1494 (number blocks). Written 2026-11-12 by Session ORCH from the generic project kit; where Spixi's own rules are
stricter, they win. The ★ rules are in `CLAUDE.md`; the gates are in `docs/process.md`.

Words: **main chat** = the talk session · **tracker** = Mission Control (`claude/mission-control-howto.md`) ·
**review loop** = the #46 loop (`docs/process.md`) · **base branch** = `redesign/frontend` (this repo has no `main`
for our work) · **the fork** = `Rexoflex/Spixi` (remote `origin`) · **upstream** = `ixian-platform/Spixi` (never ours
to write to) · **the three folders** = the folders Damir attaches to a chat: the project folder
`Spixi Rework Of Frontend` (it holds the clone `Spixi/` and `Claude outputs/`), its `Ixian-Core`, and `QuIXI` ·
**integrate** = the lead copies the agents' changed files into one tree (not a git merge).

## 1 · Three kinds of session

| Session | How many | Model | Talks to Damir | Does |
|---|---|---|---|---|
| **Main chat** (talk session) | ONE | Fable 5.2 | Yes — the only one | Interview, rulings, the Ready queue, starts work sessions, reads their results, records walks. Changes docs and Mission Control only; no app code. Starter prompt: `claude/talk-session-prompt.md` (it replaces the planning chat) |
| **Work session** | one per batch | Fable 5.2 (the lead) | No — through files | Runs FORGE on one Ready batch up to "walk-ready" (§ 4): branch, agents, gates, the #46 loop, export, push, pull request, CI |
| **Sub-agent** | several per work session | Haiku → Opus; Fable 5.2 for review | No | One item of the agent contract |

Sessions share no memory. State moves only through the repo (branch, pull request, docs), Mission Control and the
status docs (`claude/session-<name>-status.md`). A fact that is only in a chat is lost.

## 2 · Models (all at high effort) — ★ AGENTS AND MODELS, #1489

| Role | Model | Work |
|---|---|---|
| Lead | Fable 5.2 | Context, outcome, the agent contract, the split, the integration, every full smoke, the verdict, the export |
| Reviewers (#46) | Fable 5.2 — fresh, read-only (#1471) | Auditors and each break-my-verdict reader. No fallback to another model: stop |
| Hard build | Opus | Mechanism diagnosis, a new design, C# or bridge code, an item escalated from Sonnet |
| Standard build | Sonnet | An item with a clear contract, fix rounds, pins with their deliberate breaks |
| Mechanical work | Haiku | Searches, log filters, doc consistency, string sweeps, Mission Control sync, walk sheet drafts. A Haiku sweep is never a #46 reviewer |

- **Route by the cost of a wrong result, not by the size of the task.** A one-line change next to a ★ rule is Opus work.
- **Escalation:** an agent that fails twice on an item → the lead moves the item one model up, with both failed
  attempts in the brief. A failure on Opus → the lead stops the item and writes the question for Damir.
- Agent calls: `model` = `haiku` | `sonnet` | `opus` | `fable`, `effort` = `high` (go by the Agent tool's own
  description in the session). An Agent tool without a model choice cannot prove the reviewer model (#1471): stop
  (§ 5). Builders work in their own copy of the tree. Reviewers get the brief and the tree — never the lead's chat
  (the builder's context never reviews). Only the lead starts agents: a sub-agent has no Agent tool (§ 9).
- This section is Damir's standing instruction to start agents. Without an Agent tool the lead stops (§ 5).

## 3 · The Ready queue — #1492

A work session takes only Mission Control items with status **Ready**. Only Damir sets Ready, in the main chat
("go" = Ready). An item is Ready when the main chat has written, in the session's prompt doc
(`claude/session-<name>-prompt.md`, shape `docs/templates/session-prompt.md`):

- the outcome and its criteria (walk rows, pins, measurements; the `docs/release-readiness.md` rows it closes);
- scope: in, out, and the file areas it may touch;
- every dial and design choice already decided, with its DECISIONS row;
- the budget (one walk; n CI runs — every push to an open pull request starts one `redesign-ci` run) and the base branch;
- whether the no-push fallback is allowed (§ 6) and, when the session can push, the commit author Damir ruled;
- the DECISIONS rows the prompt names are on the base branch, or the prompt quotes them in full (#215);
- a number block for this session: DECISIONS `#<a>–#<b>`, lessons `L<a>–L<b>`, review packets `P<a>–P<b>` when the
  batch owes packets (#1494: parallel sessions never share numbers; never write outside the block).

The interview happens in the main chat, before Ready. A work session does not interview. At its start a work session
reads its own session doc in Mission Control: status "Ready" = go; any other status = stop and say so ("Running" =
another run has this batch; for a restart Damir sets it Ready again in the main chat).

## 4 · What a work session does (the order is fixed)

1. **Feed context.** `CLAUDE.md` → this file → the newest `docs/handoff-*.md` → its prompt doc → the rows named.
   Check the precondition (§ 5). Set its own session doc to "Running". Re-measure the baseline in the environment it
   uses (`docs/process.md` § F).
2. **Verify the prompt against the tree** (#215). A wrong premise → write it down and stop that item.
3. **Contract first.** `docs/contract-<batch>.md` from `docs/templates/agent-contract.md`: items, disjoint file
   ownership, interfaces between items, the model per item, the pins each item owes.
4. **Build in parallel.** One agent per item, each in its own copy. Agents run only their own pin modules
   (`node scripts/run-pins.mjs <dir/mod>`). **One full smoke at a time, run by the lead, with nothing that executes
   beside it** (L75, L153).
5. **Integrate + gates.** The lead copies back the changed files, runs the pipeline (bundle BEFORE shells) and every
   gate of `docs/process.md` § G2, the deliberate break of every new pin (#802), the full smoke
   (`BASELINE OK n / the 2 KNOWN`, delta = the new pins) and CSH.
6. **#46 loop** after the green smoke, until CLEAN, **before the batch leaves the machine** (`docs/process.md`). The
   Hard rule of `CLAUDE.md` holds between rounds (full smoke between fix and review rounds) until Damir rules on
   🟡 #1474 / #1496. Not CLEAN at round 5 → stop (§ 5).
7. **Export into the tree:** DECISIONS rows (own block), the `docs/release-readiness.md` rows changed, the walk sheet
   (also published as an Artifact), the handoff, one status-log entry, lessons, `CLAUDE.md` "Where we are now"
   (changed only in this branch), skill proposals — the full list is `docs/process.md` § E.
8. **Commit, push, pull request** (§ 6): one push carries the batch AND its export docs, so that the head CI checks is
   the head Damir walks. `redesign-ci` runs on the pull request: `build-shells --check`, `build-locales --check`, the
   full smoke, CSH, and a Windows compile. The other gates of § G2 run only on the lead's machine. No macOS job:
   iPhone / Mac C# stays "⚠ UNCOMPILED" until Damir builds it (Android too: CI does not compile it).
   CI red → read the failing step and its annotation; a fix is a fix round (fix → full smoke → a fresh #46 reader
   over it → the next push; that fix commit also updates the verdict in the brief, the handoff and the status-log text). The CI result
   goes into the status doc and the pull request text, not into a new commit.
9. **Walk-ready = CLEAN + the pull request open (base read back) + CI green + the export in the branch.** Then the
   status doc `claude/session-<name>-status.md` and Mission Control (own items and own session doc only).
10. **Stop.** The session never merges a pull request, never walks, never writes the next prompt, never starts the
    next batch.

A batch with no walk (docs, tooling, research) stops at the same point; its session status is "Waiting on someone"
(Damir's review and merge), not "Walk owed".

Then, in the main chat: Damir builds from the pull request branch and walks → pastes the results → the main chat
writes the `WALK` row → Damir merges. **Whether the merge waits for the walk is 🟡 #1495 (P-a), not in force:** until
Damir rules, he decides per pull request. ★ #1472 counts the WALK row, never the merge: a merged batch without its
WALK row is still unwalked.

## 5 · Stop conditions (write the reason in the status doc, set Mission Control, stop)

| Condition | Action |
|---|---|
| No Agent tool, or an Agent tool without a model choice | Stop before any build. No solo build, no review on an unknown model |
| The session cannot clone the fork | Stop |
| The session cannot push a branch | The fallback of § 6 **only when its prompt says "fallback allowed: yes"**; otherwise stop before any build |
| Mission Control is not reachable at the start, or the session's own session doc is not "Ready" | Stop: only Damir sets Ready (§ 3), and the check is the gate. **Change nothing in Mission Control and do not write `claude/session-<name>-status.md`** (another run may own them): report in the final message and in the project doc `claude/session-<name>-notstarted-<date>.md` |
| The branch is pushed but the pull request cannot be created or read back, or the CI result cannot be read | First check the URL that the create step returned: a URL outside `https://github.com/Rexoflex/Spixi/pull/` = a wrong base (§ 6: close it at once, report, stop). Else do not retry by other means. The batch is NOT walk-ready: session status "Waiting on someone"; the status doc gives the compare URL of § 6 so that Damir opens the pull request and reads CI |
| The baseline is red on an untouched tree | Check the tool versions first (L160), report, stop (#681) |
| **A task needs a risky C# part** (`CLAUDE.md` ★ C# TOUCHES NO RISKY PARTS) | Do not code it. Log it in `docs/security-review-for-be-engineer.md`. Stop that item |
| **The security handover gate triggers** (a new verb, `spixi.*` key, WebView setting, HTML sink, network fetch or log line) and the prompt does not cover it (this limit to "not covered" is the session's reading, so that #1312 stays usable) | Stop that item. (When the prompt covers it: build it by #1312 / #1478 — own switch, packet, gate section in the same batch) |
| A task would break the PARAMOUNT invariant, break an existing `ixian:` command or `executeUiCommand` call, or needs a change in Ixian-Core | Do not code it. Ixian-Core is BE-only at the pin (`097341a`). Stop that item |
| A ★ rule or a ✅ DECISIONS row would have to change | Do not change it. Write the question; stop that item |
| A design choice with real alternatives is not decided | Prepare three graded options (renders on the BUILT shell, both themes, for a visual dial). Stop that item; go on with independent items |
| A #46 reviewer cannot start on Fable 5.2 or declines a round | Stop. No fallback model (#1471) |
| The #46 loop is not CLEAN at round 5 (a limit set by this file, from the kit; `CLAUDE.md` says "until CLEAN") | Stop: the batch is NOT walk-ready and is not pushed; the status doc names the open findings; the owed rounds go into the next prompt. The unreviewed tree never goes to GitHub: save it as `git diff --binary` + SHA256 into `Claude outputs/_transfer/` on Damir's PC when the PC is linked and name the file in the status doc; with no link the work is lost — say so |
| More than one batch is unwalked (★ #1472) | Do not start a build session. Exempt: cloud-only research and tooling (the ★ text). A session that changes no app file is exempt only when its prompt says so in Damir's name |
| An item fails after escalation to Opus | Stop that item with both mechanisms tried |
| The CI budget of the prompt is used up | Stop and report |
| No tool to write project docs | Put the text of the status doc into the pull request description and into `notes` of the session doc, and keep the LAST line of `notes` for what Damir must do (in the fallback: `docs/session-<name>-status.md` in the PC tree) |

A stopped item gets Mission Control status "Waiting on someone", owner "Damir + AI", with the exact question and its
options in `check`. The main chat shows it to Damir under "Needs you". Independent items go on: the finished items
of a PARTLY session go through steps 6–9 of § 4, and its session status follows them ("Walk owed", or "Waiting on
someone" when they have no walk). A session that stopped wholly sets its session doc to "Waiting on someone".

## 6 · Git rules — ★ COMMIT AND PUSH RULE, #1490, #1493

- Branch `work/<batch>` from the base the prompt names (default `redesign/frontend`; a batch that needs an unmerged
  batch branches from that work branch and says so in the pull request).
- Commit one logical unit at a time. Name the files; never `git add -A`. Never commit stale built output — rebuild first.
- **No attribution lines** in commits or pull requests (★ COMMIT AND PUSH RULE), and never quote the markers.
  **Commit author:** a commit made in a cloud clone is authored "Claude <noreply@anthropic.com>" by default (§ 9) —
  that would show the session on GitHub. A session pushes only commits whose author is the name and e-mail that
  Damir ruled and the prompt states. No author in the prompt → do not push: the fallback when the prompt allows
  it, else stop.
- **No session — the main chat too — ever pushes `redesign/frontend`, force-pushes, merges a pull request, merges
  anything into `redesign/frontend`, or tags.** These hold without exception.
- A session pushes only `work/*`, only to `origin` (`Rexoflex/Spixi`). It changes repo settings, CI secrets or
  `.github/workflows/` only when a Ready item names that change.
- **★ A pull request is opened ONLY inside the fork: base repository `Rexoflex/Spixi`, base branch
  `redesign/frontend`. NEVER a pull request to `ixian-platform/Spixi`.** GitHub's default base for a fork is the
  upstream — also in the link that `git push` prints (`…/pull/new/work/<batch>`): never use that link. Create it with
  `gh pr create --repo Rexoflex/Spixi --base redesign/frontend --head work/<batch>` (or the compare URL
  `https://github.com/Rexoflex/Spixi/compare/redesign/frontend...work/<batch>?expand=1`, where the page must show
  "base repository: Rexoflex/Spixi" before "Create pull request"). Read it back after:
  `gh pr view <n> --repo Rexoflex/Spixi --json url,baseRefName,headRefName` → the url starts with
  `https://github.com/Rexoflex/Spixi/pull/` and `baseRefName` = `redesign/frontend`. A wrong base → close the pull
  request at once, report it in the status doc, stop. **No push to `upstream`, ever.**
- When `redesign/frontend` moved under an open pull request (shared files collide: `CLAUDE.md` "Where we are now",
  `DECISIONS.md`, the status log, lessons, the index): bringing the base into the work branch is allowed (a normal
  merge commit; never a rebase of a pushed branch) and is done by a follow-up work session or by the main chat —
  the stopped session does not wake up. A pull request with conflicts gets no CI run.
- The main chat writes docs-only commits by the same rules, in its own number block: on the batch's work branch
  while its pull request is open (no app file changes, so the walked build stays valid); after the merge on a new
  branch `work/docs-<date>` with its own pull request. A row that records Damir's ruling or a walk needs no #46
  loop; a change of rule text (`CLAUDE.md`, `docs/process.md`, this file) is a docs batch and gets its #46 loop
  before the push.
- **The fallback (no push access — the state on 2026-11-12, § 7), only when the prompt says "fallback allowed:
  yes":** the session delivers the batch into Damir's PC tree through the device shell (or `git format-patch` +
  SHA256 when the PC is off), writes `docs/commit-message-<batch>.txt`, and gives the PowerShell lines that make the
  branch, the commits and the pull request (`docs/templates/handoff.md` § 7). One fallback delivery at a time: the PC
  tree must be clean of other sessions' edits first. The session stops at "delivered": CLEAN + the export + the
  files in place; the pull request and CI are Damir's first steps, and a red CI run after his push becomes a new
  Mission Control item for a follow-up session. Session status: "Walk owed" when the batch has a walk, else "Waiting
  on someone". The fallback is not the normal path.

## 7 · Running the sessions

- **Start (today):** Damir pastes the prompt doc into a NEW chat in the project, with the three folders attached.
  **Start (target):** the main chat starts the work session as a scheduled task that runs once, with the full text of
  the prompt doc as its message (each run is a fresh session; the prompt must stand alone).
- **What the account allows — checked 2026-11-12 (Session ORCH, an attended chat with the desktop app linked):**

  | Fact | Result |
  |---|---|
  | Agent tool with a model and an effort | Yes: `model` = `haiku` / `sonnet` / `opus` / `fable`; `effort` = `low` … `max` |
  | Attach `Rexoflex/Spixi` with push access and push a branch | **No.** The answer was "link your GitHub account to let Claude access repositories". A read-only clone of the public fork works; the GitHub API does not |
  | Start a scheduled task that runs once | Yes (the probe task of § 9 ran; its run had no push access either and no link to Damir's PC) |

  So **push from a cloud session is not available yet.** Until Damir links GitHub for Claude and one session proves
  a push of `work/*`, the main chat writes "fallback allowed: yes" into every prompt it means to run, the session
  delivers by the fallback of § 6, and Damir makes the branch and the pull request.
- **Parallel:** two build sessions run together only when their file areas are disjoint and walk debt allows it
  (★ #1472). Cloud-only research and tooling sessions run freely. Each has its own number block (#1494).
- **Check:** the main chat reads the status doc, the pull request, the CI result and Mission Control — never the work
  session's chat. A missing status doc = the session did not finish (unless `notes` of its session doc hold the
  status text — § 5, last row).
- **CI:** `redesign-ci` runs on a pull request to `redesign/frontend` and on a push to `redesign/frontend` (and by
  hand, `workflow_dispatch`); a push to `work/*` without a pull request starts no run. A new push to an open pull
  request cancels the run in progress and starts a new one (`cancel-in-progress`), and each run counts against the
  CI budget of the prompt. Cost: run #1 (2026-11-12, green) took 42 minutes for the smoke job and 7.5 minutes for
  the Windows job, in parallel (#1498). Results: the run list, the jobs and the `::error` annotations are public —
  read the final state through the GitHub API (`…/actions/runs/<id>/jobs`, from Damir's PC shell or the skill
  `read-github-actions-in-browser`); a cached page fetch can show "In progress" long after the run ended (L162).
  Full job logs need a signed-in browser.
- **Nightly:** 🟡 #1497 (P-c), not in force: a daily task that takes the top Ready item. The daily Mission Control
  sync (06:52 Europe/Ljubljana) stays as it is.
- **Approvals:** an unattended run stops at any action that needs approval. A work session keeps to actions that
  need none, or the task is set to automatic approval where the organisation allows it.
- **Skills:** `lead-work-session` fits this file. The review cards for `session-handoff`,
  `forge-engineering-session`, `spixi-build-and-walk` and `adversarial-review-loop` were proposed on 2026-11-12 and
  Damir saved them the same day. **Where a skill and the repo disagree, the repo text wins.**

## 8 · What stays with Damir

The Ready queue · dials and rulings on 🟡 rows · the walk on real devices · the merge (and its method — open, § 9) ·
session order, release dates and tags (Mission Control rule 8) · the commit author of a session · every pull request
to upstream, if there is ever one.

## 9 · Limits (known)

- A lead that wrote the contract is biased toward it. That is why reviewers are fresh and read the tree, not the chat.
- The cloud twin has 2 cores: one full smoke at a time (42–43 minutes on 2026-11-11), nothing that executes beside it
  (L75, L153). Install the pinned tool line first (L160: `npm i --no-save jsdom@29.1.1 eslint@10.14.0 globals@17.14.0
  tree-sitter@0.25.1 tree-sitter-c-sharp@0.23.5`, ALL in one command).
- The cloud cannot compile C#. CI compiles Windows only; iPhone / Mac / Android C# stays "⚠ UNCOMPILED" until Damir's
  build. CI and release builds use the clean Ixian-Core pin; Damir's PC Core has two modified files (handoff HK1 § 3 ④).
- Fable 5.2 has more safeguards on security topics; a security-only round can be declined → stop condition (#1471).
- Cost: lead + reviewers on Fable 5.2 and builders on Opus is the expensive end. Use Opus for hard items only.
- **Open, for Damir (handoff 2026-11-12 § 4):** the commit author of a session · the merge method (a squash merge of
  commits by another author adds a `Co-authored-by:` trailer — an attribution line; "Create a merge commit" does
  not) · linking GitHub for Claude.
- **The probe (2026-11-12 11:40–11:45 UTC: one scheduled task that ran once, in the cloud, nobody present; full
  report = the project doc `claude/orch-probe-status.md`):**

  | Question | Result in an unattended scheduled run |
  |---|---|
  | Agent tool | Yes. `haiku`, `sonnet`, `opus` and `fable` each started the named model; efforts `low` … `max` were accepted. **A sub-agent has no Agent tool** — only the lead starts agents. A "read-only" reviewer is read-only by its instructions, not by its tools |
  | Push to `Rexoflex/Spixi` | **No.** `git push --dry-run` → "access denied by the git proxy: Rexoflex/Spixi is not in this session's authorized repository set"; the run has no tool to attach a repo; no GitHub account is linked. Clone and read work (public repo) |
  | GitHub Actions results | The GitHub API is refused and the run has no built-in browser; the probe did not read a result |
  | Mission Control | Page and database readable (383 items, 28 sessions). Writes were not tested by the probe; the pinned writes of Session ORCH (an attended chat) worked |
  | Project docs | All 124 readable; `project_write` works. Project memory is not readable — what a session must know goes into project docs or the repo |
  | Damir's PC | **No link** in a scheduled run: no local clone, no `Claude outputs/` folder, no device shell — unless the task is set to require the computer (not tested) |
  | Commit author | A commit made in the cloud is authored "Claude <noreply@anthropic.com>" by default |

  Consequences: (1) a work session started as a scheduled task can build and test in the cloud and write project
  docs, but it cannot push, cannot open a pull request and — unless the task requires the computer and the PC is on
  — cannot put files into the PC tree; so **today a build session is started by Damir pasting the prompt into a new
  chat with the folders attached** (§ 7); (2) the commit author rule of § 6; (3) to unblock: Damir links GitHub for
  Claude, the session gets `Rexoflex/Spixi` with push access (`ixian-platform/Spixi` stays read-only), and the probe
  runs again.
- Not adopted from the kit in this session (no ruling asked for them): `docs/testing.md`, `docs/release-process.md`,
  `ci/self-test.sh` + `tests/breaks/` (Spixi proves pins by a local one-token mutation, #802), `CHANGELOG.md`,
  `hotfix/<version>` branches, branch protection. Spixi's test rules stay in `docs/process.md` § G2 and
  `docs/quality-plan.md`.
