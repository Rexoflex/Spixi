# Work-session prompt — template

The main chat writes one prompt doc per work session: the project doc `claude/session-<name>-prompt.md`. The work
session starts with this text as its only message (pasted by Damir into a new chat, or as a scheduled task that runs
once — `docs/orchestration.md` § 7), so it must stand alone: a work session knows nothing of the main chat. Keep the
work items concrete (file:line, measured numbers, DECISIONS rows). Everything Damir decided in the interview goes
under "Already decided". The numbered prompts `docs/prompts/session-N.md` are history.

```
You are the lead of work session "<name>" for the Spixi frontend redesign (Claude Fable 5.2). You run unattended:
Damir is not in this session. Chat replies, if any, in ASD-STE100 (#931). Mission Control session id: `<id>`.
Batch name: <batch> → branch work/<batch>, from base <redesign/frontend | work/<other batch>>.
Read CLAUDE.md, docs/orchestration.md, docs/handoff-<latest>.md, then DECISIONS <rows>.
Your number blocks: DECISIONS #<a>–#<b> · lessons L<a>–L<b> · review packets P<a>–P<b> (if any). Never write
outside them (#1494).
Already decided (do not re-open): <rulings and dials with their DECISIONS rows>.
If a ★ rule or a ✅ DECISIONS row would have to change: do not change it; write the question; stop that item.

## 0 · Precondition (stop if one fails — docs/orchestration.md § 5; write the reason in the status doc)
- You have an Agent tool with a model choice and an effort.
- Mission Control (claude/mission-control-howto.md) is reachable and your session doc `<id>` has status "Ready" —
  only Damir sets it ("Running" = another run has this batch: stop). If this check fails: change NOTHING in
  Mission Control, do not write claude/session-<name>-status.md, report in claude/session-<name>-notstarted-<date>.md.
  If it holds: set the session doc to "Running".
- Push: you can clone Rexoflex/Spixi, push a branch and create a pull request (check before any build), and the
  commit author is: <name + e-mail Damir ruled | not
  ruled>. If you cannot push, cannot create a pull request, or no author is ruled → fallback allowed: <yes / no>. "no" = stop before any build.
  "yes" = deliver by the fallback of docs/orchestration.md § 6 (Damir's PC tree + docs/commit-message-<batch>.txt +
  the PowerShell lines), one delivery at a time.
- Base: origin/<base> = "<commit message>" (find commits by message, not by hash); no uncommitted work of another
  session in the tree you use. Use `git --no-optional-locks` on the mounted repo.
- Walk debt (★ #1472; count it in Mission Control and CLAUDE.md "Where we are now"): at most one batch is unwalked
  — or this session is exempt: <not exempt (a build session) | exempt by the ★ text: cloud-only research / tooling |
  exempt by Damir's word: "<quote, date>">.
- Baseline in YOUR environment (cloud twin with ../Ixian-Core @097341a): first the ONE npm line, versions pinned
  (L160): `npm i --no-save jsdom@29.1.1 eslint@10.14.0 globals@17.14.0 tree-sitter@0.25.1 tree-sitter-c-sharp@0.23.5`
  → the --check gates green → smoke `BASELINE OK <n> / the 2 KNOWN (#136 · B3)` → `CSH pass=<n> fail=0`. A different
  number: check the tool versions, say so, stop (#681). ONE full smoke at a time, nothing that executes beside it
  (L75, L153); start it detached and poll.
Rules: lead = Fable 5.2; sub-agents at high effort (Haiku mechanical · Sonnet standard build · Opus hard build ·
fresh read-only Fable 5.2 for every #46 reviewer, #1471 — no fallback to another model). After #46 CLEAN: commit on
work/<batch>, push to origin, open the pull request ONLY inside the fork (base repository Rexoflex/Spixi, base
branch redesign/frontend; NEVER ixian-platform/Spixi; never the link that git push prints; read it back with
`gh pr view <n> --repo Rexoflex/Spixi --json url,baseRefName,headRefName`; a wrong base → close it, report, stop).
Never push redesign/frontend, never force-push, never merge a pull request, never tag, no push to upstream. ★ No
attribution lines or session links in any commit message, commit-message file or pull request. Verify every claim
below in the tree before building (#215).

## Outcome (O)
For: <Spixi user | Damir | BE engineer | a future session>
After this session: <one sentence>
We know it worked when (each = a walk row, a pin, a measurement or a sign-off; name the DoD row IDs it closes):
  - <criterion → check>  (DoD <ID>)
  - <criterion → check>  (DoD <ID>)

## Scope
In: <items>  ·  File areas you may touch: <folders>  ·  Out (do not touch): <items>
Constraints: the bridge protocol is frozen unless BE approves a new command (a new push or verb = a 🟡 DECISIONS
row + a BE ask + a T1 row in docs/release-readiness.md; an older shell must ignore it) · #1312: a change in OUR code
that BE reviews at handover ships behind a flag with the old path as the fallback + a security-only #46 at high
effort + one review packet in docs/be-review-pack/ + its gate row · #1478: every such change keeps its OWN switch,
never one switch per area · the security handover gate (a new verb, spixi.* key, WebView setting, HTML sink, network
fetch or log line → its section in docs/security-handover-gate.md in this batch) · C# touches no risky parts (a risky
need → STOP that item, log it in docs/security-review-for-be-engineer.md) · the PARAMOUNT isolation invariant ·
Ixian-Core is BE-only at the pin.
Budget: one walk for this batch · <n> CI runs (every push to the open pull request starts one redesign-ci run).

## Work items
<numbered items; for each: the finding, the measured mechanism or "measure first", what to build, the pins, the
deliberate break, the render, a model hint if any>

## Questions (R)
The interview is done in the main chat. Do not interview. If a new question blocks an item: write the question with
its options in the status doc and in Mission Control (status "Waiting on someone", owner "Damir + AI", the question
in `check`), stop that item, go on with independent items. An undecided design choice with real alternatives:
prepare three graded options (docs/process.md §G1; renders on the BUILT shell, both themes, for a visual dial) and
stop that item.

## Generate, then grade (G) — the order is fixed (docs/orchestration.md § 4)
Contract first: docs/contract-<batch>.md (docs/templates/agent-contract.md) — disjoint file ownership, one agent per
item, own scratch folders; agents run only their own pin modules, never the full smoke, never commit.
Code: every gate in docs/process.md §G2 — mechanism first, the FULL pipeline with the bundle BEFORE the shells, pins
that pass the deliberate-break test (#802), pin-sweep --working, smoke BASELINE OK <n> / the 2 KNOWN (#136 · B3) with
the delta = the new pins, CSH. List changed C# as "⚠ C# UNCOMPILED".
Review: write docs/review-brief-<batch>.md; the #46 loop until CLEAN (every reviewer a fresh read-only Claude Fable
5.2 instance, #1471; the builder's context never reviews; no fallback to another model — stop), BEFORE the batch
leaves the machine = before the first push; full smoke between fix and review rounds and after the last fix (the
Hard rule; 🟡 #1474 is not in force); not CLEAN at round 5 → stop; verdict into the brief.

## Export (E), push, then stop
Into the tree, before the push: DECISIONS rows (own block) · the docs/release-readiness.md rows this session changed
· walk sheet (docs/templates/walk-sheet.md), also published as an Artifact · handoff (docs/templates/handoff.md,
with the PowerShell repo commands for Damir) · one status-log entry · CLAUDE.md "Where we are now" replaced (in this
branch) · lessons (own block).
Then ONE push of work/<batch> → the pull request inside the fork (what, why, criteria with evidence, verdict, walk
sheet link, what is owed; the CI result is added to its text after the run; no attribution lines) → wait for
redesign-ci: green = walk-ready; red = read the failing step and its annotation, fix, full smoke, a fresh #46 reader
over the fix, the next push (inside the CI budget; that commit also updates the verdict in the brief and in the
DECISIONS row, the handoff, the status-log and CLAUDE.md "Where we are now").
Fallback (only with "fallback allowed: yes"): no push — the files into Damir's PC tree, docs/commit-message-<batch>.txt
(no attribution lines), the PowerShell lines that make the branch, the commits and the pull request.
Last: the status doc claude/session-<name>-status.md (shape: claude/mission-control-howto.md; with the CI result) ·
skill proposals for any procedure repeated. No next prompt, no next session: the main chat does that. You never
merge a pull request and never walk.

## Update Mission Control (mandatory, last step)
<paste the block from claude/mission-control-howto.md>
```
