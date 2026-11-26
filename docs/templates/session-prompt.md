# Work-session prompt — template

The main chat writes one prompt doc per work session: the project doc `claude/session-<name>-prompt.md`. The work
session starts with this text as its only message (pasted by Damir into a new chat, or as a scheduled task that runs
once — `docs/orchestration.md` § 7), so it must stand alone: a work session knows nothing of the main chat. Keep the
work items concrete (file:line, measured numbers, DECISIONS rows). Everything Damir decided in the interview goes
under "Already decided". The numbered prompts `docs/prompts/session-N.md` are history. The delivery mode of #1546 is
in the "Rules:" line of the block and its full text stands below the block ("Delivery mode"): a prompt does not have
to carry it again. A prompt names the lead model and the riskiest file (#1612, #1606); the rest of the model rules is
in `CLAUDE.md` ★ AGENTS AND MODELS.

```
You are the lead of work session "<name>" for the Spixi frontend redesign (Claude <Opus | Fable 5.2>: the main chat
proposes the lead model and Damir confirms it with "Ready", #1612 — Opus for small fixes, developer code, scripts and
research; Fable 5.2 for a batch that changes wallet, payment, key or bridge code). You run unattended:
Damir is not in this session. Chat replies, if any, in ASD-STE100 (#931). Mission Control session id: `<id>`.
Batch name: <batch> → branch work/<batch>, from base <redesign/frontend | work/<other batch>>.
Read CLAUDE.md, docs/orchestration.md, docs/handoff-<latest>.md, then DECISIONS <rows>.
Your number blocks: DECISIONS #<a>–#<b> · lessons L<a>–L<b> · review packets P<a>–P<b> (if any). Never write
outside them (#1494).
Operator steps: <none — you ask Damir NO question and take no ruling in this chat; a question goes into your status
doc with its options, that item stops, the other items go on | yes (#1510) — Damir runs the PowerShell lines of these
steps and pastes the output or types "done", nothing else happens in the chat: <the steps: what Damir does, for how
long>; a step that fails twice stops that item>.
Already decided (do not re-open): <rulings and dials with their DECISIONS rows>.
If a ★ rule or a ✅ DECISIONS row would have to change: do not change it; write the question; stop that item.

## 0 · Precondition (stop if one fails — docs/orchestration.md § 5; write the reason in the status doc)
- You have an Agent tool with a model choice and an effort.
- Mission Control (claude/mission-control-howto.md) is reachable and your session doc `<id>` has status "Ready" —
  only Damir sets it ("Running" = another run has this batch: stop). If this check fails: change NOTHING in
  Mission Control, do not write claude/session-<name>-status.md, report in claude/session-<name>-notstarted-<date>.md.
  If it holds: set the session doc to "Running".
- Push (the delivery mode of #1546): you can clone Rexoflex/Spixi and push a branch (check before any build), and the
  commit identity (#1501) is: <the name and e-mail of Damir's commit "<message>", read with `git log -1
  --format="%an <%ae>" <commit>`, set as `user.name` / `user.email` in your clone, `commit.gpgsign` false | not
  ruled>. You do not create the pull request. If you cannot push, or no identity is ruled → fallback allowed: <yes / no>. "no" = stop before any build.
  "yes" = deliver by the fallback of docs/orchestration.md § 6 (Damir's PC tree + docs/commit-message-<batch>.txt +
  the PowerShell lines), one delivery at a time.
- Base: origin/<base> = "<commit message>" (find commits by message, not by hash); no uncommitted work of another
  session in the tree you use. Use `git --no-optional-locks` on the mounted repo.
- Walk debt (★ #1472; count it in Mission Control and CLAUDE.md "Where we are now"): at most one batch is unwalked
  — or this session is exempt: <not exempt (a build session) | exempt by the ★ text: cloud-only research / cloud-only
  tooling | exempt by Damir's word: "<quote, date>" (#1508: a docs batch, a tracker change or a tooling session that
  needs Damir's PC or a device is not exempt by itself — the main chat asks Damir each time)>.
- Baseline in YOUR environment (cloud twin with ../Ixian-Core @097341a): first `npm ci` (the lockfile pins every
  tool, L160, #1831; never `npm audit fix`)
  → the --check gates green → smoke `BASELINE OK <n> / the 2 KNOWN (#136 · B3)` → `CSH pass=<n> fail=0`. A different
  number: check the tool versions, say so, stop (#681). ONE full smoke at a time, nothing that executes beside it
  (L75, L153); start it detached and poll.
Rules: lead = <Opus | Fable 5.2> (#1612); sub-agents at high effort (Haiku mechanical · Sonnet standard build · Opus
hard build; <no Fable builder | a Fable 5.2 builder for <part>, by Damir's ruling #<n>>). #46 readers are fresh and
read-only (#1471), by #1606: Fable 5.2 for the security-only pass and for <the file where an error costs most: name it
here>, Opus for every other reader — no fallback below the named model: stop and report. After #46 CLEAN, the delivery
mode of #1546: (1) commit on work/<batch>, author AND committer = Damir's identity (#1501), unsigned (`git -c
commit.gpgsign=false commit`, #1543); (2) push ONLY work/<batch> to origin of Rexoflex/Spixi (a 503 answer of the
credential service: wait and try again, a few times); (3) read each commit back through the GitHub API: author and
committer are Damir's login, `verified = false` with reason "unsigned" — any other result = stop and tell Damir;
(4) do NOT open the pull request: give Damir the compare link
https://github.com/Rexoflex/Spixi/compare/redesign/frontend...work/<batch>?expand=1 and the title and the
description as text to paste (no # before a number, #1512; no link to a session) — Damir checks the base
(Rexoflex/Spixi · redesign/frontend) and clicks "Create pull request"; (5) the session or the main chat reads
redesign-ci; Damir merges with a merge commit (#1505). NEVER ixian-platform/Spixi, never the link that git push
prints. Never push redesign/frontend, never force-push, never merge, never tag, no push to upstream. ★ No
attribution lines or session links in any commit message, commit-message file or pull request text. Verify every claim
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
Size budget (R1, #1963 (8)): <n> app C# code lines for the batch (and <n> in src/ beside it), counted by `node
scripts/size-count.mjs --base <base> --head HEAD` (the delta of app C# code lines). Going over it needs one line of
reason in the status doc.

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
the delta = the new pins, CSH. List changed C# as "⚠ C# UNCOMPILED". A source-text pin states its limits in its first
version; a gap of the stated class that a reader finds later is a NIT, not a MAJOR (#1735, #1746). Every gate that the
batch claims runs on the tree that the last reader reads: the full smoke and every packaged or built run on the final
tree BEFORE that reader starts (#1753 (2), session leanfollow). A miss on a timing pin: run the module alone and
re-run it before anything else (#1827 (4); L153, #1457 ⑥, #1463).
Size rule (#1963 (8)): R2 (no history in a comment), R5 (no probe outside the dev fence) and R6 (no app C# file grows past
1,500 lines; a file already over it must not grow) are checked by the size step of redesign-ci (session sizerule) and by hand with `node
scripts/size-check.mjs --base <base> --head HEAD` before the push (exit 1 = a check fails; exit 2 = a usage, git or classifier error or a diff path that is not UTF-8, never a pass).
An edited probe line outside the fence counts as new for R5: fence it in the same change. A batch name must not be
an ordinary English word (its pins folder and handoff name become history markers for R2), or the same pull request
adds it to `BATCH_NAME_STOPLIST` in `scripts/size-check.mjs`. R4: the contract names
what stage 2 deletes of the batch (docs/templates/agent-contract.md, "Stage 2 (R4)").
Review: write docs/review-brief-<batch>.md; the #46 loop until CLEAN (every reader a fresh read-only instance, #1471:
Claude Fable 5.2 for the security-only pass and for the file where an error costs most, Claude Opus for every other
reader, #1606; the builder's context never reviews; no fallback below the named model — stop), BEFORE the batch
leaves the machine = before the first push; between rounds the pins the fix touches (first grep the smoke for the
tokens of every edited line, L84; an INLINE smoke pin touched = the full smoke at once) and the full smoke ONCE after
the last fix (#1503); not CLEAN at round 5 → stop; verdict into the brief.

## Export (E), the delivery by #1546, then stop
Into the tree, before the push: DECISIONS rows (own block) · the docs/release-readiness.md rows this session changed
· walk sheet (docs/templates/walk-sheet.md), also published as an Artifact — its page shows every set-up command of
the sheet in full, and a row that needs a new account says how: a second data folder (WALK #1828; the Defaults walk)
· handoff (docs/templates/handoff.md,
with the PowerShell repo commands for Damir) · one status-log entry · CLAUDE.md "Where we are now" replaced (in this
branch) · lessons (own block).
Then: the commits on work/<batch> (one logical unit each) → when the base moved, merge the newest base into the branch
right before the push (`git -c commit.gpgsign=false merge --no-ff`, a merge commit, no rebase; allowed by #1490) →
on the merged tree, the gates the batch claims again (the full smoke, the pins, its own checks; #1753 (2)), and a
fresh reader over a code conflict resolved by hand, as #1801 did → check author,
committer and "no signature" of EVERY commit to be pushed, the merge commit included → ONE push of
work/<batch> → read each commit back (#1546 (3)) → the compare link with the title and the description to paste
(what, why, criteria with evidence, verdict, walk sheet link, what is owed; no # before a number, no link to a
session, no attribution lines). You do NOT create the pull request. Damir opens it; redesign-ci runs on it and the
session or the main chat reads it: walk-ready = CLEAN + the branch pushed and read back + the compare link given +
the export in the branch, and CI green on that pull request is read before the walk (#1490, #1546 (5)); a red run =
read the failing step and its annotation, fix, the full smoke on the fixed tree, a fresh #46 reader over that tree,
the next push (inside the CI
budget; that commit also updates the verdict in the brief and in the DECISIONS row, the handoff, the status-log and
CLAUDE.md "Where we are now").
Fallback (only with "fallback allowed: yes", and only when a push fails — #1546): no push — the files into Damir's PC
tree, docs/commit-message-<batch>.txt (no attribution lines), the PowerShell lines that make the branch, the commits
and the pull request.
Last: the status doc claude/session-<name>-status.md (shape: claude/mission-control-howto.md; with the compare link,
the title and the description to paste, and the CI result when it is read; and the size lines of R3: the size table
of the final tree and the delta against the base, from `node scripts/size-count.mjs --base <base> --head HEAD` — app
C# code lines, comment lines, switches, files over 1,500 lines, #1963 (8)) ·
skill proposals for any procedure repeated. No next prompt, no next session: the main chat does that. You never
merge a pull request and never walk.

## Update Mission Control (mandatory, last step)
<paste the block from claude/mission-control-howto.md>
```

## Delivery mode — DECISIONS #1546 in full (#215)

The text of row #1546 as `DECISIONS.md` holds it (the decision, its rationale, its status; only the line breaks
differ). The "Rules:" line of the block above carries the same mode in short, so a prompt made from this template
need not quote the row again. Its sentences on the docs batch and on "until then each prompt quotes this row" are
done since session `docsb` (#1892).

> **THE DELIVERY MODE OF A WORK SESSION: THE SESSION PUSHES ITS BRANCH; DAMIR OPENS THE PULL REQUEST WITH ONE
> LINK.** Damir, main chat 15:20: "a" (option A of three: A the session pushes the branch and Damir opens the pull
> request · B the session also opens the pull request and Damir removes the footer each time · C no change, the
> fallback). The mode, as the proof ran it (#1544): (1) the session commits on `work/<batch>` in its cloud clone,
> author AND committer = Damir's identity (#1501), read from `git log` of one of his commits; the commits are
> unsigned, made the way the proof made its commit (`git -c commit.gpgsign=false commit`, #1543); no attribution
> line; no `#` before a number (#1512). (2) It pushes ONLY `work/<batch>` to `origin` of `Rexoflex/Spixi` (a 503
> answer of the credential service: wait and try again, a few times). Never `redesign/frontend`, never a force-push,
> a merge or a tag. (3) It reads the commit back through the GitHub API: author and committer are Damir's login,
> `verified = false` with reason "unsigned"; any other result = stop and tell Damir. (4) It does NOT open the pull
> request. It gives Damir the compare link
> `https://github.com/Rexoflex/Spixi/compare/redesign/frontend...work/<batch>?expand=1` and the title and the
> description as text to paste (no `#` before a number, no link to a session). Damir checks that the base is
> `Rexoflex/Spixi` · `redesign/frontend` and clicks "Create pull request". (5) The session or the main chat reads
> `redesign-ci`; Damir merges with a merge commit (#1505). The fallback (the files in Damir's PC tree and guided git
> steps) stays allowed when a push fails. This replaces "fallback only" of #1500 / #1511 ⑤ for new prompts and
> answers the open point of #1545. The rule texts (`CLAUDE.md` ★ COMMIT AND PUSH RULE, `docs/orchestration.md` § 7 /
> § 9, the session-prompt template) change with the docs batch; until then each prompt quotes this row. The nightly
> task of #1504 is possible in this mode (it would push a branch; Damir opens the pull request in the morning) — it
> is NOT set up; Damir says when.
>
> Rationale: Main chat 2026-11-13 15:20: Damir ("a"); the proof of #1544 showed that a pushed branch is clean and a
> pull request opened by a session is not
>
> Status: ✅ decided (Damir)
