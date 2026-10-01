# Review brief — session 0, the workflow reset (#1097–#1100)

Work order for the #46 loop over a docs-only batch (docs/process.md). Verdict in §5.

## 1 · What the batch is
| Item | What landed | Where | DECISIONS |
|---|---|---|---|
| Short CLAUDE.md + status log | rules word for word, loop, index, conventions, "where we are now"; history moved byte for byte | `CLAUDE.md`, `docs/status-log.md` | #1097 |
| Process + templates + prompts | FORGE, gates, #46 loop, ready/done, Spixi vs Bot; 5 templates; `docs/prompts/session-1.md` | `docs/process.md`, `docs/templates/`, `docs/prompts/` | #1097, #1100 |
| Lessons + DECISIONS index | L1–L51; live rows by area | `docs/lessons.md`, `docs/decisions-index.md` | #1097 |
| v1 definition of done | stages S1–S12 + T1/T2, every row re-verified | `docs/release-readiness.md` | #1098, #1099 |

Not built: no app code, no C#, no shells, no pipeline change (out of scope by order).

## 2 · How to run
- Tree: a cloud clone of "Mac re-sync reminder after the history rewrite" + the session's working-tree changes.
- No pipeline / smoke run needed (no code); smoke of record unchanged: 5049 / the 2 KNOWN (#136 · B3).

## 3 · Auditor scopes (disjoint)
| Auditor | Scope | Focus |
|---|---|---|
| A | old CLAUDE.md vs new CLAUDE.md + status-log + process; the moved prompt | ONLY: nothing lost, no rule weakened |
| B | release-readiness, DECISIONS #1097–#1100, decisions-index, lessons | lost items, testability, citations, facts |
| C | process, templates, CLAUDE.md loop, handoff, commit message, grading | correctness vs practice, contradictions, the owner's criteria, COMMIT RULE |

## 4 · Non-negotiables
The ★ rules word for word · the history lossless · the presence/read prompt's substance unchanged · no attribution
lines · docs only.

## 5 · Verdict

**Verdict: CLEAN at round 3.** Protocol: 3 disjoint read-only auditors → verify → fixes (one fixer agent for
`release-readiness.md`, the lead for the rest) → a FRESH reader per round.

| Round | Reader | MAJOR | MINOR | NIT | Result |
|---|---|---|---|---|---|
| r1 | A (nothing lost) · B (DoD + rows) · C (process) | 3 · 4 · 6 = 13 | 5 · 16 · 14 | 6 · 8 · 9 | all MAJORs + MINORs fixed |
| r2 | fresh A (nothing lost) · fresh break-my-verdict over the fixes | 0 · 2 | 5 · 8 | 7 · 8 | all fixed |
| r3 | fresh reader over the r2 fixes + an independent nothing-lost script | 0 | 4 (mechanical) | 8 | MINORs fixed; NITs fixed or recorded |

### The MAJORs
- **r1-A:** the iOS rule "incremental builds do not repackage Raw html — wipe, plain build, Run" (#320) existed only in
  the history → now in CLAUDE.md loop step 7, the process gates, the walk-sheet template, the office sheet, lesson L51.
  The Damir + BE review had dropped out of ready/done → DoR names "Plan before building"; BE review = a release gate
  (#523). "CLEAN not claimed" had become an accepted done → removed: a loop that stops early leaves the batch NOT done.
- **r1-B:** U-02 missing from the v1 set and #1098 listing the wrong "before any external build" set → A-19 + the exact
  set (`prelaunch-audit-handoff.md:275`) + P-01. C-02/C-03/C-04 both v1 rows and open decisions → folded into H-22.
  The freeze's BE handoff doc lost → G-7b. Audit citations pointing at the wrong findings → every docs citation re-read.
- **r1-C:** grading totals wrong in 4 of 6 options (winners unchanged) → recomputed. The BUILD walk row "proves" nothing
  when it passes on "builds and starts" → it must name something only the new build shows. The iOS wipe (= r1-A). The
  walk-sheet copy rule left hard-coded batch values → listed. No Export step updated the DoD → added everywhere. The
  next free number would break if this loop took a row → the verdict is summarised in #1100; #1101 stands.
- **r2-B:** the html wipe still said "C# changed" in the template and the office sheet → fixed. Group typing ruled in four
  places → H-8 is the one decision.

### Recorded, not fixed (NITs)
- The commit subject is 66 characters; the CLAUDE.md file is ~13 KB (about two and a half screens with the ★ rules in
  full — Damir accepted ~2 screens).
- F-6 and session-1 part 6 list the steps "loop → pipeline → smoke" (word for word from the old prompt); the frame states
  the process order.
- `process.md` §F still names older docs (`opus-review-brief-overnight-1028.md`) as shape examples — they are the newest
  real examples.

### Final numbers
Lossless check: 0 missing history lines; both blocks byte-identical and in order (author's script + two independent
reviewer scripts). Prompt move: exactly one line differs (the next free number). Smoke: not run (no code); of record
5049 / the 2 KNOWN.
