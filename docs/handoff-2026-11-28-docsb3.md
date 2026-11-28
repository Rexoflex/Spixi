# Handoff 2026-11-28 docsb3 — Docs batch 3: the main chat's rows #1965–#1978, the owed rule texts, the walk rules up to 2026-11-28

Session `docsb3` (MC `docsb3`; prompt `claude/session-docsb3-prompt.md` with `claude/session-docsb3-addendum.md`, the
addendum wins). Number blocks: DECISIONS #2060–#2069 (all used) · lessons L327–L328 (both used) · no packet.
Lead Claude Opus; no builder agent; readers fresh, read-only Claude Opus at high effort (`docs/review-brief-docsb3.md`).

## 0 · State
- Branch `work/docsb3` from `redesign/frontend` @ `e3d69266` ("Merge pull request #32 from Rexoflex/work/train2"; it
  holds pull requests 29–32). Documents only: no app file, no `src/**`, no built html, no test; one table entry in
  `scripts/docs/compare-main-chat-rows.mjs` and one new manifest (#2060).
- Baseline on the base (cloud twin, `npm ci` → jsdom 29.1.1, `../Ixian-Core` @ `097341a`, Node 22.23.5,
  `TZ=America/Los_Angeles`): `BASELINE OK 7657 / the 2 KNOWN` (= the train 2 number) · `build-shells --check` ✓ ·
  `build-locales --check` ✓. No CSH here (no .NET SDK in this twin; no C# changed).
- Delivery by #1546: ONE push of `work/docsb3`, each commit read back; Damir opens the pull request with the compare link
  `https://github.com/Rexoflex/Spixi/compare/redesign/frontend...work/docsb3?expand=1` (title and description in
  `claude/session-docsb3-status.md`). No walk.
- The record files this batch changes (they conflict with `imgurlfix` and `fixb6` at the next merge train — keep both
  sides in number order): `DECISIONS.md` (the run #1965–#1978 after #1964; the own rows #2060–#2069 between #2031 and
  #2070; 19 cells), `docs/decisions-index.md`, `docs/lessons.md` (L327–L328 between L318 and L329), `docs/status-log.md`
  (one entry at the end), `CLAUDE.md` ("Where we are now", step 5, step 8).

## 1 · What this session did
| Item | What | Row |
|---|---|---|
| O1 | The main chat's rows #1965–#1978 word for word (14 heading blocks, after #1964); the manifest; the index section | #2060 |
| O1 | 19 status cells (#190, #206, #1507, #1798 for #1825 (4), #1868, #1891, #1892, #1893, #1904, #1952, #1954, #1992, #1996, #2011, #2025, #2031, #2111, #2118, #2119) | #2061 |
| O2 | #1839 (2) branch protection "set" (`docs/process.md`, `docs/orchestration.md` § 6); #1839 (3) the head of `docs/orchestration.md`; `docsb` Q-3 | #2062 |
| O3 | The eight `docsb` answers (Q-4 `docs/walk-fixb3.md`, Q-5 `docs/walk-launch.md`, Q-7 E-W / E-A); the S12w States of the walks up to 2026-11-28; the LW-DEF rows of `docs/walk-launch.md` marked walked (#1840) | #2063 |
| O4 | `docs/process.md` a)–m): a)–l) already done by `docsb2`; m) done, its status applied; three stale sentences fixed | #2064 |
| O5 | The Voice fix addendum of `docs/security-review-for-be-engineer.md` (the Opus line is ours, #1995); gate 18 `LEGACY_G3` checked | #2065 |
| A3, A4 | `docs/quotebox2-mechanism.md` § 6 (the device answer); the walk rules up to 2026-11-28 in `docs/templates/walk-sheet.md` (+ handoff, session-prompt templates, `CLAUDE.md` step 8, `docs/process.md` "Windows build") | #2066 |
| O6 | `CLAUDE.md` "Where we are now" (the size rule, the walk debt, the merges up to train 2) | #2067 |
| — | The review loop | #2068 |
| — | The record | #2069 |

How to check O1 (any tree that holds this batch; the folder = the project docs, `claude_` prefix allowed):
```
node scripts/docs/compare-main-chat-rows.mjs <folder> --manifest scripts/docs/main-chat-rows-2026-11-28.json
node scripts/docs/compare-main-chat-rows.mjs <folder> --manifest scripts/docs/main-chat-rows-2026-11-23.json
node scripts/docs/compare-main-chat-rows.mjs <folder>
```
→ `ALL EQUAL: 14 rows, 19 cells` · `ALL EQUAL: 8 rows, 13 cells` · `ALL EQUAL: 30 rows, 26 cells`. With `--base e3d69266`
on the first commit of the branch (the rows and cells only) the first one adds `the rest = e3d69266`.

## 2 · Walk
None (no screen change, no app file).

## 3 · Proposed next steps (the main chat decides)
- The skill `spixi-build-and-walk`: the Ctrl+F5 rule and the four walk rules of #2066 (the main chat's, by a review card).
- The three project-doc sentences of #1502 / #1506 (`claude/session-docsb-status.md` "Project-doc proposals") — the main chat's.
- S12w: MG rows for the pull requests 25–32, if the main chat wants them (#2063).
- The next merge train: this branch's record files beside `imgurlfix` and `fixb6` (§ 0).

## 4 · Open questions and dials
None. One reading to confirm: the prompt's "no script" is read as "no new script and no pin"; the one table entry of the
checker is the cost of the proof the prompt asks for (#2060).

## 5 · Recorded, not changed
- `fixb6`'s: `scripts/voicefix/VoiceFixProbe.csproj` (no longer compiles), the stale GATE 54 (a4) comment, the NITs
  W-n2 and Z-n1 (#2065).
- Gate 18's `LEGACY_G3` entry of the fixed log line is gone at `e3d69266` (`quotebox2`, #2027) — nothing owed.
- Q-5: where the Blitz Chess package comes from and which of its actions opens a mini-app confirm are not in the repo; LW-APPCONFIRM says so and names the confirm-type commands of P61 (#2063). The main chat gives the install step before that row is walked.
- `docs/process.md` Appendix B keeps its old texts word for word (F5, "not adopted"): history, not rules.

## 6 · Lessons (also appended to docs/lessons.md)
- L327 — a docs prompt written days before its start: read each owed item against the current tree (#2064).
- L328 — a row held byte for byte by an earlier manifest takes a later change in the cell of its table row (#2061).

## 7 · Repo commands for Damir (PowerShell, one line at a time, no `&&`)
None needed: no build and no walk. To read the branch on the PC:
```powershell
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git log --oneline redesign/frontend..origin/work/docsb3
```
