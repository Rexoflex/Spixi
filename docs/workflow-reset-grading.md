# Workflow reset — the two design choices, graded (DECISIONS #1097, #1098)

Session 0 (2026-10-01). Method: `docs/process.md` §G1 — three genuinely different options, scored 1–5, harsh,
then the winner's weaknesses fixed. Criteria set by Damir's session prompt:

| Criterion | Weight | Question |
|---|---|---|
| Cold start | ×3 | Can a new session (human or AI) start correctly from this, fast? |
| Nothing lost | ×3 | Does every rule, item and fact survive with its meaning? |
| Maintenance cost | ×2 | How much work per session to keep it true? How likely is it to go stale? |
| Fits the endgame | ×2 | Does it fit the freeze → sweep → strip (#933) → TestFlight (#916, #971) path? |

Max score = 50.

---

## Choice 1 — the shape of CLAUDE.md

### Option A — Bot-style card, rules inline

Sections: 1 What this is · 2 Ground rules (★ word for word, all other ground rules word for word) · 3 How a
session runs (FORGE in 5 lines, pointer to `docs/process.md`) · 4 Build · walk · commit loop (8 lines + the two
hard rules word for word) · 5 Doc index · 6 Conventions · 7 Where we are now (≤ 10 lines). History →
`docs/status-log.md`.

### Option B — one-line headlines + `docs/rules.md`

CLAUDE.md = one headline line per ★ rule, the doc index and "where we are now"; the full rule text moves word for
word to `docs/rules.md`. Exactly one screen.

### Option C — start sequence first, rules last

CLAUDE.md opens with "where we are now" + a numbered start sequence (read X, then Y, then paste prompt N), then the
loop, then the index, and the ★ rules at the end in full.

### Scores

| Criterion (weight) | A | B | C |
|---|---|---|---|
| Cold start (×3) | 4 — rules first, then where to go; ~2 screens | 3 — one screen, but the reader must open a second file to know the rules, and a skimming AI may not | 4 — fastest to "what next"; rules read last, the PARAMOUNT rule says "read first" and would sit at the bottom |
| Nothing lost (×3) | 5 — every rule in the file the tools always load | 4 — word for word, but in a file that is not auto-loaded; a rule that is not read is weakened in practice | 5 — all text present |
| Maintenance (×2) | 4 — one 10-line block changes per session | 4 — same | 3 — the start sequence duplicates the handoff and the prompt; three places to keep in step |
| Fits endgame (×2) | 5 — the strip removes only `status-log.md`; CLAUDE.md is already in its post-strip shape | 4 — `rules.md` is one more file the strip must keep | 4 — fine, but the start sequence is session plumbing the strip would delete |
| **Total /50** | **45** | **37** | **41** |

Damir ruled in the interview (round 1): rules in full, about two screens — this matches A and rules out B.

**Winner: A.** Weaknesses, and the fix applied:

1. *Two screens, not one.* → Every non-rule section is cut to a pointer; "where we are now" is capped at 10 lines and
   names the ONE file to read next.
2. *The PARAMOUNT rule order matters but a reader may still skim.* → Kept as the first ground rule, word for word.
3. *C's strength (fast "what next") is missing.* → "Where we are now" ends with the exact next step: the handoff, then
   `docs/prompts/session-<N>.md`.
4. *Some ground rules are stale in fact (Figma mirroring was retired by #316; "Vite" became custom scripts in #176).*
   → NOT edited (the rule was "keep their meaning word for word"). Listed in the handoff for Damir to rule on.

---

## Choice 2 — the format of the definition of done (`docs/release-readiness.md`)

### Option A — one table per area

Areas (security ours · BE · release blockers · crash · platform walks · features · endgame · dials · out-of-scope),
each row: ID · criterion · check · owner · state · evidence.

### Option B — the endgame path as the spine

Stages in the order Damir confirmed (#971 + #937): session-1 → office walk + fix round → L6 → sweep phases 1–2 →
Damir picks → freeze + `freeze-v1` tag → characterization → refactor picks → strip → gate re-run → merge →
TestFlight. Each stage = its exit criteria as rows; criteria that belong to no stage go in parallel tracks
(BE engineer, Damir decisions).

### Option C — machine-readable data + a generated page

A JSON/YAML list of criteria and a script that renders the markdown and counts states.

### Scores

| Criterion (weight) | A | B | C |
|---|---|---|---|
| Cold start (×3) | 3 — complete, but "what blocks the next step" is not visible | 5 — the next stage's open rows are the answer to "what now" | 3 — the page is fine; the source is not readable in a chat |
| Nothing lost (×3) | 5 — every row has a home | 4 — rows with no stage risk falling between stages | 5 |
| Maintenance (×2) | 4 — edit a cell | 4 — edit a cell; a row may move stage | 2 — a script to keep; it is a build-pipeline change (out of scope for this session) |
| Fits endgame (×2) | 3 — the order lives elsewhere | 5 — the page IS the endgame order | 3 |
| **Total /50** | **38** | **45** | **34** |

**Winner: B.** Weaknesses, and the fix applied:

1. *Rows with no stage.* → Two parallel tracks with their own tables: **T1 BE engineer** and **T2 Damir decisions**;
   each says which stage it blocks ("Blocks" column), so nothing floats.
2. *A row can move stage.* → Every row has a stable ID (A-n, B-n …) that never changes; the stage is a column/heading,
   the ID is the reference used by handoffs and walk sheets.
3. *Prose creeping back in (today's file is mostly prose).* → Rule at the top: a row without a check (walk row, pin,
   measurement, sign-off, doc check, decision row) is not allowed; prose lives only in the short intro (rules, rulings, smoke of record).
4. *A's completeness by area.* → An index table at the end lists every ID by area, so "all security rows" is still one look.
