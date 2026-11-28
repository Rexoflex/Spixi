# Review brief — docsb3 (Docs batch 3, #2060–#2069)

Work order for the #46 loop (`docs/process.md`). Written BEFORE round 1. The verdict goes into § 5.

## 1 · What the batch is
| Item | What landed | Where (files) | DECISIONS |
|---|---|---|---|
| O1 | The main chat's rows #1965–#1978 word for word after the block of #1964; 13 status cells (19 after round 1); the manifest; one table entry of the checker | `DECISIONS.md`, `scripts/docs/main-chat-rows-2026-11-28.json`, `scripts/docs/compare-main-chat-rows.mjs`, `docs/decisions-index.md` | #2060, #2061 |
| O2 | #1839 (2) branch protection set; (3) the head of `docs/orchestration.md`; `docsb` Q-3 | `docs/process.md`, `docs/orchestration.md` | #2062 |
| O3 | The eight `docsb` answers; the S12w States | `docs/walk-fixb3.md`, `docs/walk-launch.md`, `docs/release-readiness.md` | #2063 |
| O4 | `docs/process.md` a)–m) | `docs/process.md` | #2064 |
| O5 | The Voice fix addendum; gate 18 checked | `docs/security-review-for-be-engineer.md` | #2065 |
| A3, A4 | The device answer; the walk rules up to 2026-11-28 | `docs/quotebox2-mechanism.md`, `docs/templates/{walk-sheet,handoff,session-prompt}.md`, `CLAUDE.md` step 8, `docs/process.md` "Windows build" | #2066 |
| O6, export | "Where we are now", step 5; the record | `CLAUDE.md`, `docs/status-log.md`, `docs/lessons.md`, `DECISIONS.md` #2060–#2067, `docs/handoff-2026-11-28-docsb3.md`, `docs/contract-docsb3.md`, this file | #2067 |

Not built, and why: the code leftovers of `fixb5` (session `fixb6`, the addendum (5)); the skill `spixi-build-and-walk` and
the project-doc sentences (the main chat's); MG rows for the pull requests 25–32 (not asked).

## 2 · How to run
- Tree: the cloud clone `/home/claude/spixi`, branch `work/docsb3`; range `e3d69266..HEAD` (the commits) plus the working
  tree (the record, not yet committed when round 1 starts). `git -C /home/claude/spixi diff e3d69266` shows all of it.
- Sources: the project docs, `/home/claude/srcdocs/claude_*.md` (a copy of `/mnt/project/`), above all
  `claude_talk-rulings-2026-11-23-night.md` (#1839), `claude_talk-rulings-2026-11-25-c.md` … `-11-28-c.md`,
  `claude_talk-state-2026-11-27-2200.md`; the prompt `/mnt/project/claude_session-docsb3-prompt.md` and its addendum
  `/mnt/project/claude_session-docsb3-addendum.md`; `/mnt/project/claude_session-docsb-status.md` (Q-1 … Q-8, a)–m));
  `/mnt/project/claude_session-fixb5-status.md` ("Owed").
- Proof of O1: `node scripts/docs/compare-main-chat-rows.mjs /home/claude/srcdocs --manifest scripts/docs/main-chat-rows-2026-11-28.json`
  (and `--base e3d69266` on a checkout of the first commit of the branch, `5521836`; it was rebuilt after round 1). Reading is allowed; do NOT edit, commit or run the smoke.
- Smoke before: `BASELINE OK 7657 / the 2 KNOWN` on the base. No pin reads a changed file except `DECISIONS.md` (the
  #797 row check, untouched).

## 3 · Reader scopes (disjoint)
| Reader | Scope (files) | Focus |
|---|---|---|
| A | `DECISIONS.md` (the run #1965–#1978, the 13 cells (19 after round 1), the own rows #2060–#2067), `docs/decisions-index.md`, `scripts/docs/**` | byte equality with the sources; the place; each cell's text says what its row says; a cell the rows change and that was missed; the claims of #2060–#2067 against the tree |
| B | `docs/process.md`, `docs/orchestration.md`, `docs/templates/**`, `CLAUDE.md` | each changed sentence against its ruling (#1839, #1965 (4), #1844 (1), #1904, #1976, #1977, #1963 (8), #1966 (1), #1970); a contradiction left in the same file; the ≤ 10-line rule; the status-log entry holds the replaced lines word for word |
| C | `docs/walk-fixb3.md`, `docs/walk-launch.md`, `docs/release-readiness.md`, `docs/security-review-for-be-engineer.md`, `docs/quotebox2-mechanism.md`, `docs/lessons.md`, `docs/status-log.md`, the handoff, the contract | each fact against its source row (WALK counts, hashes, row numbers, fields of #1976); nothing invented (Q-5); the Voice fix text against #1995 and P103 |

## 4 · Non-negotiables and accepted dials
- Must hold: the main chat's rows byte for byte; old cell text kept (#215); no app file, no `src/**`, no test; rows and
  lessons only in #2060–#2069 · L327–L328; no raw log line in `DECISIONS.md` (#1976 gives fields only); the files of
  `imgurlfix` and `fixb6` untouched; no attribution lines; no `#` before a number and no model name in commit messages.
- Accepted (do not re-open): the addendum's cell texts (#2025, #2111, #2118, #2119, #2077 stays); the one table entry
  of the checker (#2060); #1825 (4) in the cell of #1798 (#2061).
- Severity: MAJOR = a wrong fact, a changed main-chat byte, a rule text that contradicts its ruling, a file outside the
  scope; MINOR = a missing pointer, a stale sentence near the change; NIT = wording.

## 4a · Round 1 (readers A, B, C; fresh Claude Opus, high effort) — MAJOR 0 · MINOR 15 · NIT 12; the fixes
| Finding | Fix |
|---|---|
| A-1 the `docsb` question cells #1891–#1893 and #1952 (and #1954) not extended | extended; the manifest has 19 cells (#2061) |
| A-2 the "walk owed" cells of batch rows, #1472, #1546 | not changed, with the reason in #2061 |
| A-3 the index line of #1904 without its cell | the cell of #1904 extended (ruled by #1844 (1)) |
| A-4 index lines of #2068, #2069 before the rows | the rows are written when the loop closes, before the push |
| A-5 … A-8 (NIT) the place rule #1950, the ledger lines, the wording of #2067, "the fix batch" in #2011 | fixed in #2060, #2067 and the #2011 cell |
| B-1 the model sheet predates three rules | a ⚠ line in the template names the cards |
| B-2 the template's HTML intro above the new section | marked "the older form; the next section wins" |
| B-3 `docs/process.md` step 5 example | points at `docs/walk-train2.md` |
| B-4 `CLAUDE.md` step 5 CSH 633 | CSH 967 at `e3d69266` first |
| B-5 … B-7 (NIT) the head cites #1839 (2) / #2062; R4 named; "up to 2026-11-28" | fixed |
| C-1 WK-1835, WK-1836 still OPEN | DONE by #1961, old text kept after "Before it:" |
| C-2 the S12w intro (W-3, E-W / E-A, the Texts list) | brought up to date |
| C-3 WK-QUOTEBOX2's compile half | the build evidence named |
| C-4 LW-APPCONFIRM not walkable | the package source is the main chat's step; P61's confirm-type commands named; "Copied as it is" and the group row fixed |
| C-5 the LW-DEF rows walked by #1840 | the group row says so |
| C-6, C-8 L328 | the wrong pointer and the second half removed |
| C-7 #2068, #2069 | as A-4 |
| C-9 … C-12 (NIT) the § 0 pointer, the WK-DEF pointer, the S12w index lists, "the one script line" | fixed |

## 4b · Round 2 (one fresh Claude Opus break-my-verdict reader) — MAJOR 0 · MINOR 6 · NIT 4; the fixes
| Finding | Fix |
|---|---|
| 1 the index lines of #1825, #1891–#1893, #1952, #1954 behind their cells | brought up to date; answered marks dropped; #2061 names them |
| 2 the index line of #2011 "the fix batch" | "the mechanism batch" |
| 3 #2064 / its index line / the handoff: "two" stale sentences | three (the § F step 5 example added) |
| 4 MG-338d30f4, MG-a7d83db7, MG-462ba3e4 point at open WK rows | " → … DONE by …" added; #2063 names them |
| 5 the brief named the old first commit `904cf41` | `5521836` |
| 6 the index area line "Platform: Windows" says F5 | Ctrl+F5 (#1844 (1)); #2066 names it |
| 7 … 10 (NIT) L327 "12 of 13", the template's "before 2026-11-27", `docs/walk-fixb3.md` F5, reader A's "13 cells" | fixed |

## 5 · Verdict
**CLEAN at r3.** Readers by #1606 (docs only: Claude Opus for every reader, the prompt), each fresh and read-only at high
effort: r1 A (records), B (rule texts), C (facts) · r2 one break-my-verdict reader over the round-1 fixes · r3 one
break-my-verdict reader over the round-2 fixes. MAJOR 0 · 0 · 0; MINOR 15 · 6 · 0; NIT 12 · 4 · 3.
- Every MINOR of r1 and r2 is fixed (§ 4a, § 4b); A-2 is recorded with its reason in #2061 (the "walk owed" cells of
  batch rows and the waivers of #1970 (1) / #1971 (2) are not cell changes).
- The three NITs of r3, fixed as doc corrections after the last reader (no further reader): the 🟡 of the index line
  #1868 dropped (answered by #1965 (2)); #2063 "the three MG rows whose WK row this batch closed" (MG-c9d6bf64 points at
  WK-1829, still open, and stays); the S12w intro names the source docs of the States of 2026-11-28.
- The proof: `compare-main-chat-rows.mjs` ALL EQUAL on all three manifests (14 rows · 19 cells; 8 · 13; 30 · 26); with
  `--base e3d69266` on the first commit `5521836`: the rest = the base (r2 and r3 reproduced it in their own copies).
