# Agent contract — docsb (Docs batch)

The lead wrote this file BEFORE any agent started (`docs/orchestration.md` § 4). Every agent gets this file plus
its own row. An agent that needs a file outside its row stops and asks the lead.

## 1 · Base
- Tree: `work/docsb` @ "Merge pull request #18 from Rexoflex/work/defaultsb" (`338d30f4`). A docs batch: the two
  `--check` gates and the smoke are not changed by it; `redesign-ci` runs them on the pull request.
- Must hold for everyone: NO app file, NO `src/**`, NO built html, NO script outside `scripts/docs/**`, NO test,
  nothing under `.github/**`, `SECURITY.md`, `docs/security-handover-gate.md`, `docs/walk-defaultsb.md`,
  `docs/walk-photo1b.md`, Ixian-Core. A rule text follows its ruling, never the other way: a ★ rule or the meaning
  of a ✅ row is never changed. A sentence whose ruling cannot be found = a question, not an edit. No commit, no
  push.
- The source of every ruling: the project docs `claude/talk-rulings-*.md` (copies in `/home/claude/briefs/`) and
  the `DECISIONS.md` rows of the base.

## 2 · Items and ownership (file scopes are disjoint)
| Item | Agent | Model (effort high) | Owns (files / folders) | Reads only | Owes | Scratch folder |
|---|---|---|---|---|---|---|
| 1 + 2 (rows, cells, index) | lead | (lead) | `DECISIONS.md`, `docs/decisions-index.md`, `scripts/docs/**` | `/home/claude/briefs/` | the insert script + the compare script ("equal" per row) | `/home/claude/scratch/lead/` |
| 3 (rule texts) | builder-3 | sonnet | `CLAUDE.md` (NOT the section "Where we are now"), `docs/orchestration.md`, `docs/templates/**` | `DECISIONS.md`, `docs/process.md`, the briefs | each changed sentence names its row; a list old → new; the skill proposals; the questions | `/home/claude/wt/b3` (own worktree) |
| 4 + 5 (kit, sheets, readiness) | builder-4 | sonnet | `docs/walk-safety-app/**`, `docs/walk-safety.md`, `docs/walk-launch.md` (new), `docs/release-readiness.md` | the walk sheets of the batches, `DECISIONS.md`, the briefs | the kit defects fixed; the launch sheet rows; the readiness rows; a list of what changed; the questions | `/home/claude/wt/b4` (own worktree) |
| — | sweep (mechanical; NOT a #46 reviewer) | haiku | none | the tree | a findings list with `file:line` | `/home/claude/scratch/sweep/` |
| export | lead | (lead) | `CLAUDE.md` "Where we are now", `docs/lessons.md`, `docs/status-log.md`, `docs/handoff-2026-11-22-docsb.md`, `docs/review-brief-docsb.md`, `docs/commit-message-docsb.txt`, this file | | | |

## 3 · Interfaces between items
| Name | Shape | Provider | Consumer |
|---|---|---|---|
| The row format | A main-chat row is inserted as the heading block of its source doc, byte for byte; one empty line before a run, one between two rows, one after the run; nothing else is added. | lead | readers (scope A), builder-3 (may cite row numbers only) |
| Row numbers | Builders cite rows by number; the text of #1641–#1644, #1735–#1754, #1825–#1830 is in the briefs, the rest in `DECISIONS.md` of the base | lead | builders |

## 4 · What each agent returns
- The list of files it CHANGED (the lead copies back only these).
- For each change: the old sentence, the new sentence, the row that rules it.
- What it could not do and why (a question with options for Damir).
- Anything it saw outside its scope: a note, not a fix.

## 5 · Integration order and checks (the lead)
1. Copy back per agent, changed files only. Check that no file outside the scope of § 2 changed.
2. The compare script on the tree. A grep that no pin reads a changed doc (else: re-base that pin, name it).
3. The #46 loop: fresh read-only Opus readers — scope A (rows, places, cells), scope B (rule sentences against
   their rulings) — until CLEAN; not CLEAN at round 5 → stop.
4. The export docs → commits (one logical unit each) → merge the newest base → the compare script again → ONE push
   → read back (#1546 (3)).

## 6 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
