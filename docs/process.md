# Process — how a Spixi session runs (FORGE for engineering)

How every session and every batch runs on the Spixi frontend redesign. Adapted from the FORGE method (Feed context ·
Outcome · Reverse interview · Generate then grade · Export the win) as the Spixi Bot repo runs it, plus what this
project learned in ~1 100 DECISIONS rows (`docs/lessons.md`). Written 2026-10-01 (DECISIONS #1097, #1100). Short on
purpose: the rules are in `CLAUDE.md`, the history is in `docs/status-log.md`, the rows are in `DECISIONS.md`
(find them with `docs/decisions-index.md`). **Who runs what** — the main chat, work sessions, agents and models, the
Ready queue, the git and pull-request rules — is in `docs/orchestration.md` (2026-11-12, #1488–#1494).

## F · Feed context

A session starts with context, not with a task.

1. Read `CLAUDE.md` → `docs/orchestration.md` → the newest `docs/handoff-*.md` → the session's prompt doc → the
   DECISIONS rows they name (`grep -n '^| #\?NNN ' DECISIONS.md`).
2. Check the precondition the prompt states (`git --no-optional-locks status`, HEAD = origin, no other session's
   uncommitted work). Stop and tell Damir if it fails (a work session: write the reason in its status doc, set Mission
   Control, stop — `docs/orchestration.md` § 5).
3. **Verify the handoff's claims in the tree before relying on them** (#215, L1). A status row records what a session
   found, not what the tree is (#905). A row "owed" by a handoff may already be closed — check DECISIONS first (#660).
4. Re-measure the baseline in the environment you will use (smoke count with or without the Ixian-Core sibling). If a
   recorded number differs, say so and stop (#681).
5. Examples beat adjectives: copy the shape of `docs/opus-review-brief-overnight-1028.md` (verdict),
   `docs/handoff-2026-10-01.md` (handoff), `docs/walk-artifact-1094-win-android.html` (walk sheet).

## O · Outcome, not task

Every session prompt (`docs/templates/session-prompt.md`) answers before any work:

1. **Who is it for?** (a Spixi user · Damir · the BE engineer · a future session)
2. **What can they do afterwards?**
3. **How do we know?** → criteria that are walk rows, pins, measurements or a sign-off. Not "fix the call card" but
   "Android full ⇄ card ×3 shows no shadow-only phase; `[CALLSWAP]` reads via=painted in < N ms; walk row A1 PASS".

Phase-level outcome: `docs/release-readiness.md` (the v1 definition of done). A session's criteria should name the
DoD row IDs they close.

## R · Reverse interview

The interview happens in the **main chat** (the ONE talk session, #1488), before an item is Ready. Claude asks the
questions it needs, as clickable options (AskUserQuestion), a few per round, and points out anything vague or
contradictory. Answers that are decisions become DECISIONS rows at once and go into the prompt doc under "Already
decided". **No build before Damir sets the item Ready — "go" = Ready (#1492).** A work session does not interview; at
its start it checks that its session doc in Mission Control is "Ready" (`docs/orchestration.md` § 3). A new question
that blocks an item is written in the status doc and in Mission Control (status "Waiting on someone", owner
"Damir + AI", the question and its options in `check`), and that item stops; independent items go on.

**The first question for any item: is this worth doing at all?** Ask it BEFORE the item is specified (Bot L15: it cut
a 3–4 day batch to a 10-minute check). Typical answers: already built (the #660/#905 class — 11 of the 19 rows the old
readiness §3 had carried were, when someone checked: `git show e7c8f6e0:docs/release-readiness.md` §3), retired by a later decision, cheaper as a walk row than as code, or v1.1.

## G · Generate, then grade

### G1 · Design choices: three options, graded

For a choice with real alternatives (architecture, a bridge contract, a visual dial, a C# shape): three genuinely
different options, scored, the winner's weaknesses fixed, a DECISIONS row that links the grading. Visual dials:
**render all three on the BUILT shell in both themes** and let Damir pick (L32). Code is not written three times; code
is graded by G2. Example: `docs/workflow-reset-grading.md`.

| Criterion (weight) | Question |
|---|---|
| Security (×3) | Holds the PARAMOUNT invariant, "C# touches no risky parts", and introduces nothing (handover gate)? |
| User impact (×2) | Does a user see it work, on all four platforms, in both themes? |
| Maintainability (×2) | Fewer places for the same bug, less state, fits the frozen bridge? |
| Endgame fit (×2) | Fits the freeze → sweep → strip → TestFlight path (#971, #933, #916) without new debt? |
| Speed (×1) | Fits the session without cutting a gate? |

### G2 · The gates (every batch)

| Gate | Rule | Evidence |
|---|---|---|
| Mechanism first | Measure / read the log / read the recording before a fix. Two wrong guesses → ship a probe, not a third fix | #294, L3 |
| Security lens WHILE building | Check the change against the command inventory (ARCHITECTURE.md) and the SECURITY.md checklist; note `file:line` for any source claim. A new verb, `spixi.*` key, WebView setting, HTML sink, network fetch or log line → a section in `docs/security-handover-gate.md` in the same batch. A risky C# need → STOP, log it in `docs/security-review-for-be-engineer.md` | CLAUDE.md ★, #775 |
| Render first | Any visual change: render both themes on the BUILT shell before the pin and before Damir spends a rebuild | L32 |
| Pipeline order | First `npm i --no-save jsdom@29.1.1 eslint@10.14.0 globals@17.14.0 tree-sitter@0.25.1 tree-sitter-c-sharp@0.23.5` (versions pinned, #1481 / L160: the newest jsdom fails 6 smoke rows) — ALL in ONE command (a second `--no-save` install removes the first set; without tree-sitter `cs-syntax-check` skips). FULL: (`generate-icons` if SVGs; `generate-chat-pattern` if the pattern synth changed) → `extract-strings` → `build-locales` → `build-strings-iife` → `build-demo-bundle` → `build-shells`. **Bundle BEFORE shells.** The `build-shells` preflight catches a MISSING export only; a stale bundle with the same exports passes it, so the order itself is the rule. Shell / CSS / token only → `build-shells`; C#-only → none | #258, #257 |
| Pipeline checks | `node scripts/pin-sweep.mjs --working` (lists the pins that READ the changed files — read them) · `build-shells --check` · `extract-strings --check` · `build-legal-docs --check` · `generate-icons --check` · `i18n-lint` · `pseudo-locale-smoke` · `verify-locales` · `cs-syntax-check` (parses, does not compile) | #593 |
| Smoke baseline | `node scripts/smoke-test.mjs` → `BASELINE OK n / the 2 KNOWN (#136 · B3)`. Current: **5095** with the Ixian-Core sibling @`097341a` (#1129). Delta = the new pins; any other change: look first. Compare only within one environment | #895, #681 |
| C# harness | `node scripts/run-csh.mjs` → `CSH pass=N fail=0` (needs the .NET 8+ SDK; exit 3 = no SDK = NOT passed). Compiles the REAL pure C# files listed in `scripts/csh/csh.csproj` against stubs and runs their MSTest classes + integration checks — the MSTest project itself never runs on this branch's CI. A new pure C# rule → add the file + its tests to the csproj | #1122 |
| Pins are behaviour | Executed pins on the BUILT shell first; a source-text pin declares `stripCode` or raw; derive lists from the code, never from your own list | #771, #798, L12/L15 (Bot L3/L4) |
| **Deliberate break** | Every new or rebased pin: break the code on purpose (one-token mutation in a full copy, green baseline first), the pin must fail **for exactly that reason**, restore. Record kills and survivors in the DECISIONS row | #802, Bot L5/L18; skill `ci-deliberate-break-self-test` |
| Failure message proves its cause | A pin's / probe's failure text is attached only after the steps before it are proven (the shell booted, the push arrived, the build is the new one — BUILD walk row). Otherwise it blames the code for a setup fault | Bot L18/L23; #663 |
| Characterize before asserting | Record the real behaviour (device log, `[CDPERF]`/`[CALLSWAP]` lines, a frame-by-frame recording) before a pin or a DECISIONS row asserts it | Bot L24; #1092, #1095 |
| #46 loop | Below. CLEAN before the batch leaves the machine | #46, Bot L22 |
| C# compile | The cloud cannot compile. List changed C# as "⚠ C# UNCOMPILED"; the first build on the PC is the first compile, and a build error is this batch's bug | #593 |
| Windows build | **F5 in Visual Studio, never `dotnet build`** (it serves the previous build's shells). Wipe `Spixi\obj` + `Spixi\bin` when C# changed | #663 |
| iOS / Mac / Android build | **Incremental builds do NOT repackage `Resources/Raw` html: wipe `Spixi/obj` + `Spixi/bin`, then a plain build, then Run** — whenever the html changed, not only when C# changed (iOS #320; Android #449; apply the same on the Mac). A device running an old shell against new C# looks like a regression | #320, #449 |
| Walk | A walk sheet with a BUILD row first (it must name something only THIS build shows — "it starts" is not proof, #663); Damir's pasted results → `WALK #N: n P · n F · n N/A` DECISIONS row; each fail = mechanism first | #1092, #1096 |
| Docs | DECISIONS rows at decision time (own number block, #1494), the handoff, a status-log entry, the status doc | CLAUDE.md hard rule |
| Skills | Diagnosis order + probe retire grep: skill `spixi-build-and-walk` (steps 5, 15) · review lenses: `adversarial-review-loop` (step 5) · finalization reports (UI/a11y, polish, motion, copy, delete audit, DECISIONS keep-test, docs pruning, perf experiment log, characterization): `spixi-finalization-checklists` | #1131 |
| Quality plan | The check list and its timing (before / after the freeze) + the controls against bloat (C1 overlap → delete covered pins · C2 keep items light · C3 required export only · C4 each check names its bug type · C5 periodic prune): `docs/quality-plan.md` | #1140 |

### The adversarial review loop (#46)

1. **When:** after the build and a green smoke run, BEFORE delivery to Damir and before the walk (a defect found here
   costs no build and no walk — Bot L22). Rebuild + smoke between fix and review rounds and once more after the last fix.
   Also over any fix round. For a work session "before delivery" = before the first push of `work/<batch>`: the
   branch on GitHub holds only reviewed work, because a pushed commit cannot be taken back (no force-push). A fix after
   a red CI run or after a walk fail is a fix round: a fresh reader over it before the next push. (🟡 #1474 / #1496
   propose a lighter smoke between rounds; not in force. The main chat's record rows are the one exception to
   "only reviewed work on the branch" — `docs/orchestration.md` § 6.)
2. **Brief:** write `docs/review-brief-<batch>.md` from `docs/templates/review-brief.md` (scope, commit range,
   disjoint auditor scopes, must-hold invariants, accepted dials).
3. **Auditors:** 2–4 read-only Claude Fable 5.2 sub-agents (#1471, which supersedes #352 for the model: every #46 reviewer is a fresh read-only Fable 5.2 instance; no fallback to another model — stop and tell Damir, in a work session through the status doc; the skill `adversarial-review-loop` still says Opus until Damir saves the skill change — #1471 wins) with **disjoint** scopes (typical: C# · shells/components · pins +
   mutation), findings with `file:line`. The builder never reviews its own work (#542).
4. **Verify** each finding against the tree before fixing (reviewers are wrong sometimes).
5. **Fix:** mechanical fixes land; architectural findings become 🟡 DECISIONS rows, never silent changes. Rebuild the
   generators and run smoke between fix and review.
6. **Break-my-verdict:** a FRESH reviewer attacks the fixes, not the original work, each round.
7. **Stop = CLEAN:** a FRESH reader over the last fixes finds 0 MAJOR, and every MINOR is fixed or recorded (with its
   reason) in the verdict. The #46 hard rule is "until CLEAN": a loop that stops earlier ("CLEAN not claimed at rN",
   #1075) leaves the batch NOT done — the next session's prompt carries the owed round.
8. **Verdict** (`docs/templates/review-verdict.md`) written into §5 of the brief that ordered it (#660) and summarised
   in the DECISIONS row. Since #1075 several loops had no brief — that gap is closed from session 1 on.
9. Same class twice → question the design, not the patch (#658, #953).

## E · Export the win

At the end of every session (a work session: BEFORE its first push, so that one push carries the batch and its docs):

- **DECISIONS rows** for every decision and walk; each #46 loop's verdict in the batch's row or a row of its own. A
  session writes only inside the number block of its prompt (#1494); the handoff names the numbers it left empty.
- **Handoff** (`docs/templates/handoff.md`): state, what changed, proposed next steps, open questions.
- **Status log:** ONE entry appended to `docs/status-log.md`. `CLAUDE.md` "Where we are now" is REPLACED (≤ 10 lines),
  never appended — in the session's own branch.
- **Next steps:** proposed in the handoff ("Proposed next steps"). **A work session writes no next prompt and starts
  no other session:** the main chat writes `claude/session-<name>-prompt.md` from
  `docs/templates/session-prompt.md`. Old prompts stay.
- **Definition of done:** update the State + Evidence cells of every `docs/release-readiness.md` row the session
  changed (closed, opened, moved).
- **Lessons:** anything that would have saved time → `docs/lessons.md` (one line, with the DECISIONS number; own block).
- **Walk sheet** (`docs/templates/walk-sheet.md`), also published as an Artifact, when the batch changes app behaviour.
- **Skills:** a procedure repeated twice → a skill proposal (or an improvement to an existing skill, never a duplicate).

Then, after #46 CLEAN:

- **Commit · push · pull request** `work/<batch>` → `redesign/frontend`, inside the fork only (`Rexoflex/Spixi`; never
  `ixian-platform/Spixi`; the base repository read back — #1493; `docs/orchestration.md` § 6): what, why, the
  criteria with their evidence, the review verdict, the walk sheet link, what is owed; the CI result is added to
  its text after the run. No attribution lines
  (★ COMMIT AND PUSH RULE). The session never merges a pull request.
- **No push access** (the state on 2026-11-12) — only when the prompt says "fallback allowed: yes": the edits go into
  Damir's PC tree, `docs/commit-message-<batch>.txt` (no attribution lines) is written, and the PowerShell lines make
  the branch, the commits and the pull request. Without that line the session stops before any build.
- **PowerShell repo commands** with every delivery, one line at a time, no `&&`: how to check out and build the branch.
- **Status doc** `claude/session-<name>-status.md` (shape: `claude/mission-control-howto.md`) with the CI result.
  The main chat reads a work session only through this doc, the pull request, CI and Mission Control — never
  through its chat. It is written also when the session stopped early.
- **Mission Control:** the "Update Mission Control" block of the howto — own items and own session doc only.

## Definition of ready (before a batch starts)

- Its outcome and criteria are written (prompt template), with the DoD row IDs it closes.
- "Is this worth doing?" was asked and answered.
- Any design choice it needs has a graded doc or a rendered pick and a DECISIONS row.
- Every handoff claim it relies on was re-read in the tree (#215).
- The plan / spec doc exists (CLAUDE.md "Plan before building": nothing SHIPS without a doc reviewed by Damir + the
  BE engineer + a second AI pass), the prompt doc exists (outcome, scope with file areas, decided dials, budget,
  number block, "fallback allowed: yes / no") and Damir has set the item **Ready** in the main chat — that is "go"
  (#1492).
- Walk debt is at most one batch (★ #1472; cloud-only research and tooling are exempt), and no other running session
  owns the same file areas.
- The DECISIONS rows the prompt names are on the base branch — or the prompt quotes them in full (a row that sits
  on an unmerged docs branch or uncommitted in the PC tree cannot be verified by the work session, #215).
- BE approvals it needs are requested: before the build for a new bridge command ("Bridge protocol is frozen"; the ask
  also becomes a T1 row in `docs/release-readiness.md`, so release waits for the answer); before
  release for everything else (#523: review before ship, not before build — `docs/release-readiness.md` T1 B-1 and S10 B-2).

## Definition of walk-ready and of done (per batch)

**Walk-ready** (where a work session stops): every G2 gate is green, the smoke is `BASELINE OK` with the delta = the
new pins, the review verdict is CLEAN (loop step 7), the DECISIONS rows + handoff + status-log entry + walk sheet
exist in the branch, the pull request is open inside the fork with its base read back, `redesign-ci` is green on it,
and the status doc + the Mission Control update are written. Every platform the change touches but that is not yet
compiled is listed as "⚠ UNCOMPILED". Session status in Mission Control: "Walk owed".
- **By the fallback** (no push access, "fallback allowed: yes"): the same, but in place of the pull request and CI
  the files are in Damir's PC tree with the commit-message file and the PowerShell lines; the status doc says
  "fallback" and "CI not run". The pull request and CI are Damir's first steps; a red run becomes a new item.
- **A batch with no walk** (docs, tooling, research): it stops at the same point; session status "Waiting on someone".
- **A session that stopped early.** STOPPED (wholly): NOT walk-ready; session status "Waiting on someone"; the
  status doc names the question. PARTLY: the finished items go through the #46 loop, the push and the pull request
  (CI green) and are walk-ready; the stopped items are "Waiting on someone" with their questions; the status doc lists both.

**Done** = walk-ready, and: the walk rows pass and the `WALK` row is written for every platform the batch ships on
(a batch with no walk: none is owed), every platform the change touches but that is not yet compiled is listed as
owed in the handoff and in `docs/release-readiness.md`, the DoD rows it changed are updated, and Damir has merged the pull request
(before 2026-11-12: "Damir has committed"). A merged batch whose WALK row is missing is NOT done and still counts as
unwalked (★ #1472). The BE review is a release gate (T1), not a batch gate. **Phase done** = every row of
`docs/release-readiness.md` is DONE or explicitly OUT.

## Working rules

| Topic | Rule |
|---|---|
| Language | Chat replies to Damir in ASD-STE100 (#931). Docs, comments, commit messages and handoffs are exempt |
| Who talks | Damir talks in the ONE main chat (#1488). Work sessions report through files: the repo, Mission Control, the status doc. A fact that is only in a chat is lost |
| Who decides | Scope, the Ready queue, session order, merges and release dates are Damir's. A session proposes; a 🟡 row is not in force |
| Git on the mounted repo | `git --no-optional-locks` always; plain `git status` can strand `.git/index.lock` and block GitHub Desktop (Bot L17) |
| Commits and pushes | A work session commits on `work/<batch>`, pushes it to `origin` and opens a pull request inside the fork (`Rexoflex/Spixi` → `redesign/frontend`; never upstream, #1493). No session ever pushes `redesign/frontend`, force-pushes, merges a pull request or tags; Damir reviews and merges (#1490, `docs/orchestration.md` § 6). One logical unit per commit. Never `git add -A` (CRLF-only churn: check with `git diff --ignore-cr-at-eol`). Never commit stale built artifacts — rebuild first. No attribution lines, and never quote the attribution markers (e.g. `Claude-Session`) in a commit message: the Mac re-sync check greps commit messages for them. The commit author of a pushed commit is the one Damir ruled, never the cloud default |
| Where to build | On a cloud clone of the fork ("cloud twin"; older docs say "container twin") with `../Ixian-Core` @`097341a`: branch `work/<batch>`, the pinned npm line (L160), ONE full smoke at a time with nothing that executes beside it (L75, L153; 42–43 minutes on 2026-11-11). Damir's PC tree is for his builds and walks; a session changes it only when its prompt says so or as the no-push fallback. Say which |
| Delivery without push access, or when the PC is off | A FALLBACK, not the normal path, and only when the prompt says "fallback allowed: yes" (`docs/orchestration.md` § 6): the edits into Damir's PC tree through the device shell + `docs/commit-message-<batch>.txt` + the PowerShell lines; PC off → `git format-patch <base>..HEAD` + a tarball + SHA256; Damir runs `git am`, then the FULL pipeline. One fallback delivery at a time |
| Numbers | Each session gets a DECISIONS and a lessons number block (and a packet block when it owes packets) from the main chat, in its prompt. Never write outside it; unused numbers stay empty and the handoff names them (#1494) |
| Scratch | `_to_delete/` (gitignored) for session scratch; Damir deletes it. `_deliveries/` is the older landing folder (#513) |
| Mac after the 2026-10-01 rewrite | Give the CLAUDE.md MAC RE-SYNC steps FIRST when Damir says he pulled on the Mac |
| Prompts | One prompt doc per work session: the project doc `claude/session-<name>-prompt.md`, written by the main chat from `docs/templates/session-prompt.md`. It must stand alone: a work session knows nothing of the chat. `docs/prompts/session-N.md` are the numbered prompts of 2026-10 (history; session 0 = the workflow reset, session 1 = presence/read) |
| Pushes to a shell | Never feed a redesigned shell via `addCustomString` — always `sendUiCommand` (the shells build `window.SL` from their bundled dictionary; C13 in `docs/status-log.md`) |
| Source vs output | Edit `src/`, never `Spixi/Resources/Raw/html` (the next build overwrites it; #693) |

## Spixi vs Bot — which practices are shared, which differ, and why

| Practice | Bot repo | Spixi | Why |
|---|---|---|---|
| FORGE steps, reverse interview, "go" | ✅ | ✅ shared; since 2026-11-12 the interview runs in the main chat and "go" = Ready (#1488, #1492) | Same owner, same method |
| Short CLAUDE.md + `status-log.md` | ✅ one screen | ✅ about two screens | Damir: the ★ rules stay word for word in the file every session loads (#1097) |
| Numbered prompts `docs/prompts/session-N.md` | ✅ | ➖ the numbered prompts of 2026-10; now one prompt doc per work session in the project (`claude/session-<name>-prompt.md`), written by the main chat | A work session starts from a stand-alone prompt; Mission Control holds the order |
| "Is this worth doing?" before specifying | ✅ (L15) | ✅ adopted | Spixi's #660 class: many open rows were already built |
| #46 adversarial loop, disjoint scopes (Spixi reviewers: Claude Fable 5.2, #1471) | ✅ | ✅ (origin: Spixi #46) | — |
| Review BEFORE the push / delivery | ✅ (L22) | ✅ adopted (before delivery and walk) | Spixi had already moved this way; now written down |
| Deliberate-break self-test | CI job per break (GitHub Actions) | Local one-token mutation of each new pin in a full copy | Spixi: a CI workflow for `redesign/frontend` is added (`.github/workflows/redesign-ci.yml`, #1481); first run: 2026-11-12, green (#1498) (`dotnet.yml` runs on master/development only); the gate is the local smoke suite |
| Failure marker proves the setup first (L18/L23) | Marker per case in CI | Pin failure text after the boot/push is proven; BUILD walk row proves the build is new | Spixi's equivalent faults are a stale shell (#663) and a missing Core sibling |
| Characterize before asserting (L24) | Trace the client cascade | Device logs, probe lines, frame-by-frame recordings | Spixi's truth is on four devices |
| CI is the gate | ✅ | ➖ partly: `redesign-ci` runs on every pull request to `redesign/frontend` (#1481: two `--check` gates + smoke + CSH + a Windows compile; first run: 2026-11-12, green (#1498)). No macOS job; MAUI on four platforms needs Damir's machines. Gate = the lead's smoke + CI on the pull request + the walk | Branch protection is not set; Damir merges |
| Mutation tool (Stryker), fuzzing (SharpFuzz) | ✅ planned | ❌ not adopted | JS shells + uncompiled C# in the cloud; hand mutation is the proven method here (#802) |
| Batch rubric in the PR | ✅ | ➖ since 2026-11-12 a work session opens a pull request inside the fork (#1490, #1493); its text carries the criteria with evidence, the CI link and the verdict | The DECISIONS row + review verdict stay the record |
| Design rubric weights | correctness, member impact, self-hosting… | security, user impact, maintainability, endgame fit, speed | Different product; Spixi has no self-hosting axis |
| Walk sheets on devices | ❌ (bot is headless) | ✅ Spixi-only | Visual app on four platforms |
| Render both themes before a pin | ❌ | ✅ Spixi-only | Visual app |
| `docs/examples/` folder | ✅ | ❌ not adopted | Spixi's own newest docs are the examples (§F step 5) |
| Branch protection / semantic version tags | ✅ | ❌ not adopted now | Spixi merges once at the end (#916); the store version is a DoD row. Work branches `work/<batch>` and pull requests inside the fork are adopted (#1490) |
| "Already decided" block in the prompt | ✅ | ✅ adopted (template) | Stops a session re-opening settled rows |
| One talk session · Ready queue · lead + agents by model · number blocks | (kit) | ✅ adopted 2026-11-12 (#1488–#1494; `docs/orchestration.md`) | Damir: one chat to talk in; everything else runs alone up to walk-ready |
| CI-push budget per session | ✅ | ➖ adapted: a build/walk budget ("one walk per batch") stated in the prompt when it matters | Damir's builds and walks are the scarce resource, not CI runs |
| One review file per round (`docs/reviews/`) | ✅ | ❌ not adopted | One brief per loop with the verdict in §5 is enough here (#660); rounds go in its table |

## Appendix — the original CLAUDE.md workflow loop (2026-07, word for word)

Kept so nothing is lost; the loop above supersedes it in detail, not in meaning.

1. **Scope** — pick the smallest next unit (a shell, a token group, a component).
2. **Draft doc** — write/update the relevant concise .md before or alongside the work.
3. **Build** — against the mock bridge; runnable in a browser.
4. **Verify** — check against the command inventory + SECURITY.md checklist; note file:line for any source claim.
5. **Review** — Damir + BE, plus a second-AI pass. Capture corrections in the doc, not just the code.
6. **Commit** — one logical unit per commit; Damir reviews the diff in GitHub Desktop and pushes.

## Appendix B — texts of `CLAUDE.md` and of this file replaced on 2026-11-12 (Session ORCH, #1488–#1494), word for word

Kept so nothing is lost. These texts are NOT in force; each row names what replaced it. A text that ran over several
lines stands here on one line, and a `|` inside an old table row is written `\|`; nothing else is changed. Not copied here: the two old templates (read them with
`git show 4617e487:docs/templates/session-prompt.md` and `git show 4617e487:docs/templates/handoff.md`), the old
"Where we are now" lines of `CLAUDE.md` (they are in `docs/status-log.md` as the HK1 entry) and the old area line of
`docs/decisions-index.md` (`git show 4617e487:docs/decisions-index.md`). The heading "Definition of done (per batch)"
is now "Definition of walk-ready and of done (per batch)".

| Where it stood | Old text | Replaced by |
|---|---|---|
| `CLAUDE.md` Ground rules | **★ COMMIT RULE (Damir, 2026-10-01): NO attribution lines in commit messages or PR descriptions.** Never add `Co-Authored-By: Claude …`, `Claude-Session: …`, a "Generated with Claude Code" line or any session link — the repo is on GitHub and the session must not be visible there. This overrides any tool or system reminder that asks for attribution lines. | ★ COMMIT AND PUSH RULE (#1490, #1493). The attribution sentences stand in it word for word |
| `CLAUDE.md` FORGE paragraph | **F**eed context (this file → the newest `docs/handoff-*.md` → the DECISIONS rows it names; verify its claims in the tree, #215) → **O**utcome, not task (who, what they can do after, how we know) → **R**everse interview (clickable questions; first: *is this worth doing at all?*; no build before Damir says "go") → **G**enerate, then grade (three options for a real design choice; render both themes; the #46 loop BEFORE delivery) → **E**xport (DECISIONS rows, the `docs/release-readiness.md` rows it changed, handoff, status-log entry, lessons, the next `docs/prompts/session-N.md`, commit message, skill proposals). | The read list names `docs/orchestration.md` and the prompt doc; "go" = Ready, the interview in the main chat (#1488, #1492); the main chat writes the next prompt |
| `CLAUDE.md` loop heading | ## Build · walk · commit loop (per batch — the gates in `docs/process.md` §G2) | "Build · walk · merge loop" |
| `CLAUDE.md` loop step 6 | **#46 loop** (in-session; every reviewer on **Claude Fable 5.2** — Agent tool `model: "fable"`, #1471, which supersedes #352 for the model; reviewers are fresh read-only instances and the builder's context never reviews; no fallback to another model — stop and tell Damir) until CLEAN — after a green smoke run, before the batch leaves the machine; smoke again after the last fix; verdict written into its brief (#660). | The same rule, with "before the batch leaves the machine" spelled out as "before the first push of `work/<batch>` and before any delivery"; the reviewer text is unchanged (#1471) |
| `CLAUDE.md` loop step 7 | **Walk:** Damir builds — **Windows = F5, never `dotnet build`** (#663); Android Debug; **iPhone + Mac (and Android, #449): wipe `obj`/`bin` when the html changed, then a plain build, then Run — incremental builds do not repackage Raw html** (#320); the BUILD row must show something only this build has. Walk sheet → pasted results → a `WALK #N: n P · n F · n N/A` DECISIONS row; each fail = mechanism first. | Step 8 "Walk · merge (Damir)": the same build rules; Damir builds from the pull request branch; the main chat writes the WALK row |
| `CLAUDE.md` loop step 8 | **Commit:** one logical unit; `docs/commit-message-<batch>.txt` (no attribution lines — ★ COMMIT RULE); Damir reviews the diff, commits and pushes; never `git add -A`. Use `git --no-optional-locks` on the mounted repo; give the PowerShell repo commands with every delivery. | Step 7 "Commit · push · pull request (the work session, after CLEAN)" (#1490). The old flow stays as the no-push fallback |
| `CLAUDE.md` Hard rule (first) | **Hard rule: every significant decision gets a row in `DECISIONS.md` when it's made** — architecture, naming, conventions, scope. Reviews check 🟡 (provisional) rows first. Superseded decisions are marked, never deleted. | The same text + one sentence: number blocks (#1494) |
| `CLAUDE.md` Doc index | `docs/process.md` \| **How we work:** FORGE steps, the #46 loop, the gates, definition of ready / done, Spixi vs Bot | "ready / walk-ready / done"; a new row for `docs/orchestration.md` |
| `CLAUDE.md` Doc index | `docs/templates/` \| Session prompt · handoff · review brief · review verdict · walk sheet | + the agent contract |
| `CLAUDE.md` Doc index | `docs/prompts/session-N.md` \| Numbered session prompts; the highest number is the next one to paste | History; a session's prompt is the project doc `claude/session-<name>-prompt.md` |
| this file § F step 1 | 1. Read `CLAUDE.md` → the newest `docs/handoff-*.md` → the DECISIONS rows it names (`grep -n '^\| #\?NNN ' DECISIONS.md`). | The read list names `docs/orchestration.md` and the prompt doc |
| this file § R | Before building, Claude asks the questions it needs, as clickable options (AskUserQuestion), a few per round, and points out anything vague or contradictory. **No build before Damir says "go".** Answers that are decisions become DECISIONS rows at once. | § R above (#1488, #1492) |
| this file § G2 "Docs" | Docs \| DECISIONS rows at decision time, the handoff, a status-log entry, the next prompt \| CLAUDE.md hard rule | "… the status doc" in place of "the next prompt" |
| this file § E | - **DECISIONS rows** for every decision and walk; each #46 loop's verdict in the batch's row or a row of its own (next free number stated in the handoff). | § E above: the number block (#1494) |
| this file § E | - **Handoff** (`docs/templates/handoff.md`): state, what changed, what is next, open questions. | "proposed next steps" in place of "what is next" |
| this file § E | - **Next prompt:** `docs/prompts/session-<N+1>.md` from `docs/templates/session-prompt.md`. Old prompts stay. | § E above: the main chat writes the next prompt (#1488) |
| this file § E | - **Commit message:** `docs/commit-message-<batch>.txt` — no attribution lines (★ COMMIT RULE). Damir commits and pushes. | § E above: commit · push · pull request (#1490); the file stays for the fallback |
| this file, Definition of ready | - The plan / spec doc exists and Damir has said "go" (CLAUDE.md "Plan before building": nothing SHIPS without a doc reviewed by Damir + the BE engineer + a second AI pass). | "go" = Ready (#1492) + the walk-debt and file-area line |
| this file, Definition of done | Every G2 gate is green, the review verdict is CLEAN (loop step 7), the walk rows pass on the platforms walked, every platform the change touches but not yet compiled or walked is listed as owed in the handoff and in `docs/release-readiness.md`, the DECISIONS rows + handoff + status-log entry + next prompt exist, the DoD rows it changed are updated, and Damir has committed. | Walk-ready + Done above |
| this file, Working rules | Commits \| One logical unit per commit; Damir reviews the diff in GitHub Desktop, commits and pushes. Never `git add -A` (CRLF-only churn: check with `git diff --ignore-cr-at-eol`). Never commit stale built artifacts — rebuild first. No attribution lines, and never quote the attribution markers (e.g. `Claude-Session`) in a commit message: the Mac re-sync check greps commit messages for them | The row of the same topic above |
| this file, Working rules | Where to build \| Either on Damir's PC tree via the device shell, or on a cloud clone ("container twin") with `../Ixian-Core` @`097341a`; smoke runs in the cloud (~5 min). Say which | The row of the same topic above |
| this file, Working rules | Delivery when the PC is off \| `git format-patch <base>..HEAD` + a tarball + SHA256; Damir runs `git am`, then the FULL pipeline | The row of the same topic above |
| this file, Working rules | Prompts \| `docs/prompts/session-N.md`; session 0 = the workflow reset (2026-10-01); session 1 = presence/read | The row of the same topic above |
| this file, Spixi vs Bot | FORGE steps, reverse interview, "go" \| ✅ \| ✅ shared \| Same owner, same method | The row of the same practice above |
| this file, Spixi vs Bot | Numbered prompts `docs/prompts/session-N.md` \| ✅ \| ✅ from session 1 \| One obvious "next" file instead of a stacked prompt | The row of the same practice above |
| this file, Spixi vs Bot | CI is the gate \| ✅ \| ❌ not adopted \| Workflow added (#1481: smoke + CSH + gates + a Windows compile); first run not proven. MAUI on four platforms needs Damir's machines. Gate = smoke + the walk | The row of the same practice above |
| this file, Spixi vs Bot | Batch rubric in the PR \| ✅ \| ❌ not adopted as a file \| Spixi has no PRs on this branch; the DECISIONS row + review verdict carry the same evidence | The row of the same practice above |
| this file, Spixi vs Bot | Branch protection / semantic version tags \| ✅ \| ❌ not adopted now \| Spixi merges once at the end (#916); the store version is a DoD row | The row of the same practice above |
| this file, Spixi vs Bot | Deliberate-break self-test \| CI job per break (GitHub Actions) \| Local one-token mutation of each new pin in a full copy \| Spixi: a CI workflow for `redesign/frontend` is added (`.github/workflows/redesign-ci.yml`, #1481); its first run is not proven (`dotnet.yml` runs on master/development only); the gate is the local smoke suite | The row of the same practice above |

Also superseded, outside these two files (marked there or history, not rewritten): "never commit / push from the
cloud" and "Damir commits and pushes" in the session rules of the prompts before 2026-11-12 (e.g.
`docs/prompts/session-21.md`); DECISIONS #1097 and #1100 (marked 2026-11-12); step 6 of the 2026-07 loop in the
appendix above; `docs/lessons.md` L25 says "before the batch leaves the machine" and is unchanged — it holds as written.
