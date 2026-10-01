# Review brief — <batch name> (#<rows>)

File name: `docs/review-brief-<batch>.md`. Work order for the #46 adversarial loop (docs/process.md). Written BEFORE
round 1. The VERDICT is written back into §5 of this file when the loop closes (#660) — use
`docs/templates/review-verdict.md` for its shape.

## 1 · What the batch is
| Item | What landed | Where (files) | DECISIONS |
|---|---|---|---|

Not built, and why: <list>

## 2 · How to run
- Tree: <PC tree | container twin of "<commit message>"> · range `<base>..<head>` (or the working-tree diff)
- Pipeline: <FULL | build-shells only | none> · smoke before: `BASELINE OK <n>` · Ixian-Core @097341a <present / absent>
- Known failures: the 2 KNOWN (#136 · B3)

## 3 · Auditor scopes (disjoint)
| Auditor | Scope (files) | Focus |
|---|---|---|
| A | C# | correctness, threading, the "C# touches no risky parts" fence |
| B | shells + components | behaviour, both themes, the frozen bridge grammar, the security-gate triggers |
| C | pins | does each new pin fail when the behaviour breaks? deliberate break per pin; derived, not author-listed cases |

## 4 · Non-negotiables and accepted dials
- Must hold: the PARAMOUNT isolation invariant (#220/#221) · WebView composes, C# signs · no WebView path into a file op ·
  no URL/address/name/text in logs · bundle BEFORE shells · <batch-specific>
- Accepted (do not re-open): <dial — DECISIONS row>

## 5 · Verdict
<CLEAN at rN | CLEAN not claimed at rN (= the batch is NOT done; the owed round goes into the next prompt — docs/process.md loop step 7) | NOT CLEAN> — paste the review-verdict here when the loop closes.
