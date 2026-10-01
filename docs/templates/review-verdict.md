# Review verdict — <batch name> (#<rows>)

Shape of §5 of the review brief (or `docs/review-verdict-<batch>.md`, linked from the brief). Model:
`docs/opus-review-brief-overnight-1028.md`.

**Verdict: <CLEAN at round N | CLEAN not claimed at round N (its findings fixed, no further reader) (= the batch is NOT done; the owed round goes into the next prompt — docs/process.md loop step 7) | NOT CLEAN>**
Protocol: <n> disjoint read-only auditors → verify against the tree → fixes → a FRESH break-my-verdict reviewer per round.

| Round | Reader | MAJOR | MINOR | NIT | DECISIONS row |
|---|---|---|---|---|---|
| r1 | <auditors and scopes> | | | | |
| r2 | fresh reader over the r1 fixes | | | | |

## The MAJORs
For each: **mechanism** (what goes wrong and why) · **evidence** (`file:line`, pin, measurement) · **fix** ·
**lesson** (a line for `docs/lessons.md`, if any). Say when an auditor's or a fixer's first answer was wrong.

## Deliberate breaks (mutations)
<n> one-token breaks across the rounds (per item). Survivors: <n>, each turned into a stronger pin, a narrowed pin, or a
withdrawn claim. Survivors at close: <n>.

## Recorded, not fixed
- <dial / residual — owner — DECISIONS row>

## Final numbers
Suite (<environment>): **BASELINE OK — <n> / the 2 KNOWN** (#136 · B3), <+n vs m>. Checks: <list ✓>.
⚠ C# UNCOMPILED: <files>.
