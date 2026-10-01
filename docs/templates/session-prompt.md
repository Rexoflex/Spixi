# Session prompt — template

Copy to `docs/prompts/session-<N>.md` (N = the last number + 1), fill in, paste as the first message of the session.
Keep the work items concrete (file:line, measured numbers, DECISIONS rows) — a later session builds from this text.

```
Read CLAUDE.md, then docs/handoff-<latest>.md, then DECISIONS <rows>. Next free DECISIONS number: #<n>.
Already decided (do not re-open): <rulings with their DECISIONS rows>.

## 0 · Rules and precondition
Use `git --no-optional-locks` on the mounted repo. Chat replies in ASD-STE100 (#931). Give the PowerShell repo
commands with every delivery. ★ COMMIT RULE: no attribution lines / session links in any commit message or
commit-message file. Verify every claim below in the tree before building (#215).
Precondition (stop if it fails): `git --no-optional-locks status` → <expected>; HEAD = origin/redesign/frontend =
"<commit message>" (find commits by message, not by hash).

## Outcome (O)
For: <Spixi user | Damir | BE engineer | a future session>
After this session: <one sentence>
We know it worked when (each = a walk row, a pin, a measurement or a sign-off; name the DoD row IDs it closes):
  - <criterion → check>  (DoD <ID>)
  - <criterion → check>  (DoD <ID>)

## Scope
In: <items>  ·  Out (do not touch): <items>  ·  Constraints: the bridge protocol is frozen unless BE approves a new command (a new push or verb = a 🟡 DECISIONS
row + a BE ask + a T1 row in docs/release-readiness.md; an older shell must ignore it), the security handover gate,
C# touches no risky parts

## Work items
<numbered items; for each: the finding, the measured mechanism or "measure first", what to build, the pins, the render>

## Reverse interview (R)
Before any build: read the code the scope touches. Ask "is this worth doing at all?" for every item that is not in
"Already decided" and for each sub-choice inside the decided ones. Then ask the
questions you need, as clickable options, a few per round. Point out anything vague or contradictory.
Do not start until I say "go".

## Generate, then grade (G)
Design choices with real alternatives: three options (renders on the BUILT shell, both themes, for visual dials),
graded (docs/process.md §G1), Damir picks, a DECISIONS row. Code: every gate in docs/process.md §G2 — mechanism first,
bundle BEFORE shells, pins that pass the deliberate-break test, smoke BASELINE OK <n> / the 2 KNOWN (#136 · B3).
Review: write docs/review-brief-<batch>.md; in-session Opus #46 loop until CLEAN, BEFORE delivery; verdict into the brief.

## Export (E)
DECISIONS rows · the docs/release-readiness.md rows this session changed · walk sheet (docs/templates/walk-sheet.md) · handoff (docs/templates/handoff.md) · one status-log entry ·
CLAUDE.md "Where we are now" replaced · lessons · docs/commit-message-<batch>.txt (no attribution) ·
docs/prompts/session-<N+1>.md · skill proposals for any procedure we repeated.
```
