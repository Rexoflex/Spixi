# Handoff — Session "Docs batch" (`docsb`), 2026-11-22

## 0 · State
- Branch `work/docsb` from `redesign/frontend` @ `338d30f4` (merged with the newest base before the push: see the
  status doc). Documents only: no app file, no `src/**`, no built html, no test; two scripts in `scripts/docs/`.
- Delivery by #1546: the session pushes `work/docsb`; Damir opens the pull request with the compare link
  `https://github.com/Rexoflex/Spixi/compare/redesign/frontend...work/docsb?expand=1` (title and description in
  `claude/session-docsb-status.md`); `redesign-ci` runs the two `--check` gates, the full smoke, CSH and the Windows
  compile on it (a docs batch changes none of them). No walk.
- Rows #1890–#1895, lessons L277–L278, no packet. Review: `docs/review-brief-docsb.md` § 5.

## 1 · What landed
| Item | What | Row |
|---|---|---|
| 1 | The main chat's rows #1641–#1644, #1735–#1754, #1825–#1830 in `DECISIONS.md` word for word (heading blocks, one empty line around each run); the index section | #1890 |
| 2 | 26 status cells extended; #1705, #1727, #1815 already said it; Q-1 (#82), Q-2 (#1513) | #1891 |
| 3 | `CLAUDE.md`, `docs/orchestration.md`, `docs/templates/**` follow #1546, #1606, #1612, #1735, #1500–#1511 and four walk lessons; "Where we are now" | #1892 |
| 4 | The walk kit (icon, the load signal, `config.js`, a geotagged test photo), the #1542 rows of `docs/walk-safety.md`, the new `docs/walk-launch.md` | #1893 |
| 5 | `docs/release-readiness.md` section S12w (the walks #1743, #1751, #1828, #1829, the half-walk of `defaultsb`, the three merges) | #1893 |

## 2 · How to check
```
node scripts/docs/compare-main-chat-rows.mjs <folder with the project docs claude/talk-rulings-*.md> --base origin/redesign/frontend --own 1890-1899
```
→ `equal` per row, the three places, the 26 cells, `the rest = …`, `ALL EQUAL`. Without the folder it checks the
SHA-256 of the manifest. On a later tree whose base holds the rows, compare against the merge base of `work/docsb`.

## 3 · Owed (not in this batch's file areas)
- `docs/process.md`: the sentences of #1503, #1606, #1735, #1546, #1507 (old → new in the status doc).
- Project docs `claude/mission-control-howto.md`, `claude/talk-session-prompt.md` (#1502, #1506).
- The skills `lead-work-session` (rule 9 by #1735; models; delivery), `spixi-build-and-walk`, `session-handoff`,
  `adversarial-review-loop`: proposals in the status doc.
- The Artifacts "Spixi Safety Walk" and "Spixi Walk Chunks": the new pack line and the #1542 rows.
- `docs/walk-fixb3.md`: a pointer to set-up (5b) of `docs/walk-safety.md` (its app must not send the load signal).
- The kit is not run on a device: the next Safety walk checks it (the status doc lists what).

## 4 · Questions (for the main chat; each blocks only its own cell or row)
Q-1 #82 / #190 / #206 · Q-2 #1642 on #1513 · Q-3 #1546 for the main chat's own pull requests · Q-4 … Q-8 the kit and
the launch sheet — the options are in `claude/session-docsb-status.md`.
