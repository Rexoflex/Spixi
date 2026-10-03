# Process — how a Spixi session runs (FORGE for engineering)

How every session and every batch runs on the Spixi frontend redesign. Adapted from the FORGE method (Feed context ·
Outcome · Reverse interview · Generate then grade · Export the win) as the Spixi Bot repo runs it, plus what this
project learned in ~1 100 DECISIONS rows (`docs/lessons.md`). Written 2026-10-01 (DECISIONS #1097, #1100). Short on
purpose: the rules are in `CLAUDE.md`, the history is in `docs/status-log.md`, the rows are in `DECISIONS.md`
(find them with `docs/decisions-index.md`).

## F · Feed context

A session starts with context, not with a task.

1. Read `CLAUDE.md` → the newest `docs/handoff-*.md` → the DECISIONS rows it names (`grep -n '^| #\?NNN ' DECISIONS.md`).
2. Check the precondition the prompt states (`git --no-optional-locks status`, HEAD = origin, no other session's
   uncommitted work). Stop and tell Damir if it fails.
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

Before building, Claude asks the questions it needs, as clickable options (AskUserQuestion), a few per round, and
points out anything vague or contradictory. **No build before Damir says "go".** Answers that are decisions become
DECISIONS rows at once.

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
| Pipeline order | First `npm i --no-save jsdom eslint globals tree-sitter tree-sitter-c-sharp` — ALL in ONE command (a second `--no-save` install removes the first set; without tree-sitter `cs-syntax-check` skips). FULL: (`generate-icons` if SVGs; `generate-chat-pattern` if the pattern synth changed) → `extract-strings` → `build-locales` → `build-strings-iife` → `build-demo-bundle` → `build-shells`. **Bundle BEFORE shells.** The `build-shells` preflight catches a MISSING export only; a stale bundle with the same exports passes it, so the order itself is the rule. Shell / CSS / token only → `build-shells`; C#-only → none | #258, #257 |
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
| Docs | DECISIONS rows at decision time, the handoff, a status-log entry, the next prompt | CLAUDE.md hard rule |
| Skills | Diagnosis order + probe retire grep: skill `spixi-build-and-walk` (steps 5, 15) · review lenses: `adversarial-review-loop` (step 5) · finalization reports (UI/a11y, polish, motion, copy, delete audit, DECISIONS keep-test, docs pruning, perf experiment log, characterization): `spixi-finalization-checklists` | #1131 |
| Quality plan | The check list and its timing (before / after the freeze) + the controls against bloat (C1 overlap → delete covered pins · C2 keep items light · C3 required export only · C4 each check names its bug type · C5 periodic prune): `docs/quality-plan.md` | #1140 |

### The adversarial review loop (#46)

1. **When:** after the build and a green smoke run, BEFORE delivery to Damir and before the walk (a defect found here
   costs no build and no walk — Bot L22). Rebuild + smoke between fix and review rounds and once more after the last fix.
   Also over any fix round.
2. **Brief:** write `docs/review-brief-<batch>.md` from `docs/templates/review-brief.md` (scope, commit range,
   disjoint auditor scopes, must-hold invariants, accepted dials).
3. **Auditors:** 2–4 read-only Opus sub-agents with **disjoint** scopes (typical: C# · shells/components · pins +
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

At the end of every session:

- **DECISIONS rows** for every decision and walk; each #46 loop's verdict in the batch's row or a row of its own (next
  free number stated in the handoff).
- **Handoff** (`docs/templates/handoff.md`): state, what changed, what is next, open questions.
- **Status log:** ONE entry appended to `docs/status-log.md`. `CLAUDE.md` "Where we are now" is REPLACED (≤ 10 lines),
  never appended.
- **Next prompt:** `docs/prompts/session-<N+1>.md` from `docs/templates/session-prompt.md`. Old prompts stay.
- **Definition of done:** update the State + Evidence cells of every `docs/release-readiness.md` row the session
  changed (closed, opened, moved).
- **Lessons:** anything that would have saved time → `docs/lessons.md` (one line, with the DECISIONS number).
- **Commit message:** `docs/commit-message-<batch>.txt` — no attribution lines (★ COMMIT RULE). Damir commits and pushes.
- **PowerShell repo commands** with every delivery, one line at a time, no `&&`.
- **Skills:** a procedure repeated twice → a skill proposal (or an improvement to an existing skill, never a duplicate).

## Definition of ready (before a batch starts)

- Its outcome and criteria are written (prompt template), with the DoD row IDs it closes.
- "Is this worth doing?" was asked and answered.
- Any design choice it needs has a graded doc or a rendered pick and a DECISIONS row.
- Every handoff claim it relies on was re-read in the tree (#215).
- The plan / spec doc exists and Damir has said "go" (CLAUDE.md "Plan before building": nothing SHIPS without a doc
  reviewed by Damir + the BE engineer + a second AI pass).
- BE approvals it needs are requested: before the build for a new bridge command ("Bridge protocol is frozen"; the ask
  also becomes a T1 row in `docs/release-readiness.md`, so release waits for the answer); before
  release for everything else (#523: review before ship, not before build — `docs/release-readiness.md` T1 B-1 and S10 B-2).

## Definition of done (per batch)

Every G2 gate is green, the review verdict is CLEAN (loop step 7), the walk rows pass
on the platforms walked, every platform the change touches but not yet compiled or walked is listed as owed in the
handoff and in `docs/release-readiness.md`, the DECISIONS rows + handoff + status-log entry + next prompt exist, the
DoD rows it changed are updated, and Damir has committed. The BE review is a release gate (T1), not a batch gate. **Phase done** = every row of `docs/release-readiness.md` is DONE or explicitly OUT.

## Working rules

| Topic | Rule |
|---|---|
| Language | Chat replies to Damir in ASD-STE100 (#931). Docs, comments, commit messages and handoffs are exempt |
| Git on the mounted repo | `git --no-optional-locks` always; plain `git status` can strand `.git/index.lock` and block GitHub Desktop (Bot L17) |
| Commits | One logical unit per commit; Damir reviews the diff in GitHub Desktop, commits and pushes. Never `git add -A` (CRLF-only churn: check with `git diff --ignore-cr-at-eol`). Never commit stale built artifacts — rebuild first. No attribution lines, and never quote the attribution markers (e.g. `Claude-Session`) in a commit message: the Mac re-sync check greps commit messages for them |
| Where to build | Either on Damir's PC tree via the device shell, or on a cloud clone ("container twin") with `../Ixian-Core` @`097341a`; smoke runs in the cloud (~5 min). Say which |
| Delivery when the PC is off | `git format-patch <base>..HEAD` + a tarball + SHA256; Damir runs `git am`, then the FULL pipeline |
| Scratch | `_to_delete/` (gitignored) for session scratch; Damir deletes it. `_deliveries/` is the older landing folder (#513) |
| Mac after the 2026-10-01 rewrite | Give the CLAUDE.md MAC RE-SYNC steps FIRST when Damir says he pulled on the Mac |
| Prompts | `docs/prompts/session-N.md`; session 0 = the workflow reset (2026-10-01); session 1 = presence/read |
| Pushes to a shell | Never feed a redesigned shell via `addCustomString` — always `sendUiCommand` (the shells build `window.SL` from their bundled dictionary; C13 in `docs/status-log.md`) |
| Source vs output | Edit `src/`, never `Spixi/Resources/Raw/html` (the next build overwrites it; #693) |

## Spixi vs Bot — which practices are shared, which differ, and why

| Practice | Bot repo | Spixi | Why |
|---|---|---|---|
| FORGE steps, reverse interview, "go" | ✅ | ✅ shared | Same owner, same method |
| Short CLAUDE.md + `status-log.md` | ✅ one screen | ✅ about two screens | Damir: the ★ rules stay word for word in the file every session loads (#1097) |
| Numbered prompts `docs/prompts/session-N.md` | ✅ | ✅ from session 1 | One obvious "next" file instead of a stacked prompt |
| "Is this worth doing?" before specifying | ✅ (L15) | ✅ adopted | Spixi's #660 class: many open rows were already built |
| #46 adversarial loop, Opus, disjoint scopes | ✅ | ✅ (origin: Spixi #46) | — |
| Review BEFORE the push / delivery | ✅ (L22) | ✅ adopted (before delivery and walk) | Spixi had already moved this way; now written down |
| Deliberate-break self-test | CI job per break (GitHub Actions) | Local one-token mutation of each new pin in a full copy | Spixi has no CI on `redesign/frontend` (`dotnet.yml` runs on master/development only); the gate is the local smoke suite |
| Failure marker proves the setup first (L18/L23) | Marker per case in CI | Pin failure text after the boot/push is proven; BUILD walk row proves the build is new | Spixi's equivalent faults are a stale shell (#663) and a missing Core sibling |
| Characterize before asserting (L24) | Trace the client cascade | Device logs, probe lines, frame-by-frame recordings | Spixi's truth is on four devices |
| CI is the gate | ✅ | ❌ not adopted | No CI on the branch; MAUI on four platforms needs Damir's machines. Gate = smoke + the walk |
| Mutation tool (Stryker), fuzzing (SharpFuzz) | ✅ planned | ❌ not adopted | JS shells + uncompiled C# in the cloud; hand mutation is the proven method here (#802) |
| Batch rubric in the PR | ✅ | ❌ not adopted as a file | Spixi has no PRs on this branch; the DECISIONS row + review verdict carry the same evidence |
| Design rubric weights | correctness, member impact, self-hosting… | security, user impact, maintainability, endgame fit, speed | Different product; Spixi has no self-hosting axis |
| Walk sheets on devices | ❌ (bot is headless) | ✅ Spixi-only | Visual app on four platforms |
| Render both themes before a pin | ❌ | ✅ Spixi-only | Visual app |
| `docs/examples/` folder | ✅ | ❌ not adopted | Spixi's own newest docs are the examples (§F step 5) |
| Branch protection / semantic version tags | ✅ | ❌ not adopted now | Spixi merges once at the end (#916); the store version is a DoD row |
| "Already decided" block in the prompt | ✅ | ✅ adopted (template) | Stops a session re-opening settled rows |
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
