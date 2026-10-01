# Handoff YYYY-MM-DD<x> — <one-line state>

File name: `docs/handoff-YYYY-MM-DD<x>.md`. Read this FIRST, then DECISIONS <rows>. Next free DECISIONS number: #<n>.
Next prompt: `docs/prompts/session-<N+1>.md`.

## 0 · State
- Branch / HEAD: `redesign/frontend` @ "<commit message>" · committed: <yes / no — commit = Damir> · delivery: <PC tree / patches + tarball + SHA256>
- Smoke: `BASELINE OK — <n> / the 2 KNOWN (#136 · B3)` · environment: <PC | container + Ixian-Core @097341a> · delta <+n> = <new pins>
- Checks: pin-sweep --working read · build-shells --check · extract-strings --check · generate-icons --check · build-legal-docs --check · i18n-lint · pseudo 9/9 · verify-locales · cs-syntax-check
- Review: <CLEAN at rN | CLEAN not claimed at rN — why (= the batch is NOT done; the owed round goes into the next prompt — docs/process.md loop step 7)> · brief `docs/review-brief-<batch>.md`
- ⚠ C# UNCOMPILED: <files> (the next build is the first compile)
- New files to `git add`: <list> · Uncommitted work from other sessions: <none / list>
- Definition of done: rows changed in `docs/release-readiness.md`: <IDs → new state>

## 1 · What this session did
| Item | Result | Evidence (file:line / pin / DECISIONS / render) | DoD row |
|---|---|---|---|

## 2 · Walk
Sheet: `docs/walk-artifact-<batch>.html` (<n> rows, <platforms>). Result: <n P · n F · n N/A | owed>.

## 3 · Next session
Outcome: <who can do what afterwards, how we know>
1. <first step>
2. <…>

## 4 · Open questions and dials
| For | Question | Blocks |
|---|---|---|
| Damir / BE | | |

## 5 · Recorded, not changed
- <item — why not changed>

## 6 · Lessons (also appended to docs/lessons.md)
- <one line each, with the DECISIONS number>
