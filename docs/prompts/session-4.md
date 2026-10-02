Read CLAUDE.md, then docs/handoff-2026-10-02b.md, then DECISIONS #1126–#1131. Next free DECISIONS number: #1132.
Already decided (do not re-open): #1101–#1131 · the [P1] stamp set stays until the fixes are measured (#1127) · A7 BE only · A10 Spixi C# only · G-3 150 s.
Open for the interview: the A2 / A4 / A5 picks (`docs/sheets/session3/`), the lever picks after the table. A9 is closed (P, #1130).

## 0 · Rules and precondition
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 (#931) · PowerShell repo commands with every
delivery · ★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with" line in any commit
message, commit-message file or PR text · verify every claim in the tree (#215) · mechanism first (#294) · C# touches no
risky parts · bridge protocol frozen · security handover gate · no Ixian-Core change.
★ MAC RE-SYNC: if I say I am on the Mac and pulled, give the CLAUDE.md re-sync steps FIRST.
Precondition (stop if it fails): the session-3 commit ("Session 3: P-1 stamps, Downloads tiles, silent deletes, tick + dim fixes")
is in `git log` and HEAD = origin/redesign/frontend; smoke BASELINE OK 5095 / the 2 KNOWN; `node scripts/run-csh.mjs` → CSH pass=44;
the session-3 walk is RECORDED (#1130: 6 P · 0 F; A1 mechanism found; the table in docs/p1-measurement.md) — start from it.

## Outcome (O)
For: Spixi users and Damir. After this session the app's slow paths are ranked by MEASURED numbers, the picked fixes are built,
and the A1 hold works.
We know it worked when:
  - `docs/p1-measurement.md` filled: every path × Android / Windows, median + p90 + drops, FELT/INTERNAL; iPhone / Mac owed.
  - A ranked lever list (ms gained × certainty ÷ risk), mechanism file:line, A/B vs parent where the question is "did we cause this".
  - A1: from the `[P1] a1 hold` line → the fix → `chat held … why=vsc frames≥1` + a recording with no plain/grey frame (G-1, P-1a).
  - Damir's picks as DECISIONS rows; A2 / A4 picks built with pins + walk rows; A5 (#1124) designed with his notes (white
    no-preview tile in light; the short "keep Spixi open" line on the transferring tile) → renders → build if picked.

## Scope
In: record the walk · the table · the levers · A1 · the picked levers · A2 / A4 / A5 picks · A9 only if its walk row failed.
Out: retiring the [P1] set (strip #933) · Core · cold start (lead 8, deferred).

## Method
A small parser (scratch, not committed) turns the pasted lines into the table. Android lines arrive as `[WEBVIEW] warn [P1] …`.
Read the table's "How to read a line" first; the reader notes (#46 r1) say what a number does NOT mean.

## Reverse interview (R)
Before any build: the table → for each lever "is this worth doing at all?" → three options where real alternatives exist → Damir picks.
Do not start building until I say "go".

## Generate, then grade (G) · Export (E)
Skills (#1131): the measurement work follows `spixi-finalization-checklists` §8 (perf experiment log — the session-3 table is the
baseline; one lever per try; a `try · lever · patch · median · p90 · keep/discard/crash · note` table in `docs/p1-measurement.md`;
Damir runs every device run); diagnosis by `spixi-build-and-walk` step 5; the #46 loop may add the over-engineering and motion lenses
(`adversarial-review-loop` step 5). The `[P1]` stamp set is listed for the S6 retire set (`spixi-build-and-walk` step 15) while it stays.
As session 3: gates (smoke + csh), pins with deliberate breaks, the #46 loop before delivery; DECISIONS rows · release-readiness ·
handoff · status log · CLAUDE.md "Where we are now" · lessons · `docs/commit-message-session4.txt` (no attribution) ·
`docs/prompts/session-5.md` · skill proposals.
