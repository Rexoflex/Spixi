# Handoff — Session "Docs batch 2" (`docsb2`), 2026-11-23

## 0 · State
- Branch `work/docsb2` from `redesign/frontend` @ `462ba3e4` (merged with the newest base before the push: see the
  status doc `claude/session-docsb2-status.md`). Documents only: no app file, no `src/**`, no built html, no test; the
  two scripts of `scripts/docs/` extended and one new manifest.
- Delivery by #1546: the session pushes `work/docsb2`; Damir opens the pull request with the compare link
  `https://github.com/Rexoflex/Spixi/compare/redesign/frontend...work/docsb2?expand=1` (title and description in the
  status doc); `redesign-ci` runs the two `--check` gates, the full smoke, CSH and the Windows compile on it (a docs
  batch changes none of their inputs). No walk.
- Rows #1950–#1956, lessons L293–L294, no packet. Review: `docs/review-brief-docsb2.md` § 5.

## 1 · What landed
| Item | What | Row |
|---|---|---|
| 1 | The main chat's rows #1831–#1838 in `DECISIONS.md` word for word, right after #1830; the scripts take `--manifest`; the index section | #1950 |
| 2 | 13 status cells extended; the not-changed list | #1951 |
| 3 | `docs/process.md`: the proposals a) – m) of `docsb` and three contradicting sentences | #1952 |
| 4, 5 | `docs/release-readiness.md` S12w (the merges and walks of 2026-11-23, the owed rows); the Windows set-up of `docs/walk-fixb4.md`, `docs/walk-defaultsb.md`, the rule in `docs/templates/walk-sheet.md` | #1953 |
| 6 | The doubled numbers #1420–#1423: two sets (ON-1, S20G), a question | #1954 |
| 7 | `CLAUDE.md` "Where we are now": the state of 2026-11-23 in 7 lines (the replaced lines word for word in `docs/status-log.md`); step 5 "Current: 7000 / CSH 866" (review r1) | #1956 |
| — | The #46 loop: CLEAN at r4 (five fresh Opus readers) | #1955 |

## 2 · How to check
```
node scripts/docs/compare-main-chat-rows.mjs <folder with the project docs claude/talk-rulings-*.md> --manifest scripts/docs/main-chat-rows-2026-11-23.json --base <the base the branch merged> --own 1950-1959
node scripts/docs/compare-main-chat-rows.mjs <the same folder>
```
→ the first: `equal` per row, the place, the 13 cells, `the rest = …`, `ALL EQUAL: 8 rows, 13 cells`. The second (the
manifest of `docsb`, no `--base`): `ALL EQUAL: 30 rows, 26 cells`. On a later tree whose base holds the rows, compare
against the merge base of `work/docsb2`.

## 3 · Owed (not in this batch's file areas)
- `docs/walk-launch.md`: its `ixian.cfg` set-up lines and the LW-DEF rows (W-4, A-2, A-3, A-4 third leg were walked on
  2026-11-23) follow the new set-up; `docs/walk-histcs.md` (session `walktools2`); the walk Artifacts ("Spixi Fix batch
  4 — walk rows" and "Spixi Defaults batch — walk rows" are BEHIND their sheets: the search S-3, the old `ixian.cfg` steps, W-3
  "10 minutes"; both sheets say so in their head).
- The head of `docs/orchestration.md` (lines 8–10: "Until a docs batch changes `docs/process.md`, the texts of this file and of
  `CLAUDE.md` … win over the older lines there") is stale now that `docs/process.md` follows the rulings (#1952).
- The skill texts (the main chat proposes them by a review card, #1838 (4)); the eight questions of `docsb`.

## 4 · Questions (for the main chat; each blocks only its own row)
Q-1 #1954 the doubled numbers · Q-2 #1952 is branch protection set (`docs/process.md` "CI is the gate") — the options
are in `claude/session-docsb2-status.md`.
