# Session 20G — the walk record + fix round (S20F Windows / Android + the office walk iPhone / Mac) + the queued items

Paste this as the first message of a NEW chat in the project "Spixi Rework Of Frontend". Chat replies to Damir in ASD-STE100 (#931). PowerShell blocks with every delivery, each starting with the full `cd`.

**Exit criterion.** Both walks are recorded as WALK rows; every F is fixed (or parked by Damir) together with the queued items below; Damir re-walks the fix rows and they PASS; he commits the ONE patch. Then `docs/prompts/session-21.md` (privacy levels).

## 0 · Precondition (stop if it fails)
- Damir's clone `C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi`: `git --no-optional-locks log --oneline -3` → top = "Session 20F: the S20 walk fix round (W-1 … W-13)" = origin/redesign/frontend. (If Damir committed anything on top, re-base this prompt on it and say so.)
- Cloud twin: the repo + `ixian-platform/Ixian-Core` at `097341a` next to it; `apt-get install -y dotnet-sdk-8.0`; `npm i --no-save jsdom eslint globals tree-sitter tree-sitter-c-sharp` (ONE command). Playwright: `/opt/npm-tools/node_modules/playwright/index.mjs` (Chromium at `/opt/pw-browsers`, never `playwright install`).
- Baseline (re-measure): smoke **6148 / the 2 KNOWN (#136 · B3)** · CSH **451** · gates green except the pre-existing id-id `groundBlueGradient:Spixi`. Flakes: #1147 (5) photo fade · `pins-s15/e-send-enter` · `pins-s20/f-strip` (under load).
- Size: chat.html **978 538 / 979 968** (CHAT 957) · index.html **664 029 / 664 576** (INDEX 649 — 547 chars; trim comments first).
- Next free numbers: S line **#1415** · ON **#1428** · J **#1446** · DT **#1396** · lessons **L149**.
- One pin module without the full suite: `node scripts/run-pins.mjs pins-s20f/<mod> [pins-…/<mod>]` (`--root <tree>` for a worktree; S20F).

## 1 · Read (in order)
1. `CLAUDE.md` → `docs/handoff-2026-10-14b.md` → `docs/review-brief-session20f.md` §5 → DECISIONS #1407–#1414, #1424–#1427, #1443–#1445.
2. The walk results Damir pastes: `docs/walk-s20f.md` (the Artifact "Spixi Session 20F Walk") and the office sheet `docs/office-walk-sheet-v1.md` §7–§14 (+ the iPhone / Mac logs). This is the FIRST iOS + Mac compile of the C# from S2–S20 (S20F changed no C#).

## 2 · Record first (no code)
- `WALK #1415` (S20F, Windows F5 + Android Debug) and the office `WALK` row (I + M) — quote the counts, the F rows, the P-with-remark rows, the log summaries. ON-* rows on the ON line (#1428) if the numbering rule wants them apart.

## 3 · The work
| Item | What | Source |
|---|---|---|
| Walk F rows | every F from both walks — mechanism first (#294), then the fix | the walk results |
| Q-1 | Chat info › Files: the Downloads row look (type tile + ext badge, name, "size · date" sub line; the same component if it can be shared, else the same tokens) | #1414 (3), Damir 18:34 |
| Q-2 | Welcome slide copy: a smaller line height (more text under the art); re-run the 14-locale art-fit ladder (#1423) at 320 × 568 / 390 × 844 / 1126 × 710 + the desk check | #1414 (4), Damir 18:40 |
| Q-3 | The "Restore existing account" button overflow (de / ru at 320 px, the screenshot): shorten the label in the locales that overflow ("Konto wiederherstellen", «Восстановить аккаунт»; measure all 14 at 320 px) + a two-line safety net; NOT the outline (it does not fix the overflow) — interview to confirm | #1414 (5), Damir 18:40 |
| Q-4 | The code chip outline at a soft wrap: `.c-fmt-code { white-space: break-spaces }` (measured 0 px in all 16 cells, #46 r4) + re-base c-code (2) | #1413 ① |
| Q-5 | Records Damir still has to rule on: the 5 "directly" locales (#1413 ③), the gendered "Welcome back" (es / pt / it `restoreHeroTitle`), the settled-pill Details hover + the call-back disc on the accent (#1413 ⑥) | #1413 |

## 4 · Order
1. Precondition → record (§2).
2. Mechanism pass for every F (read + measure, no fix).
3. Interview — ONE Artifact "Spixi Session 20G Dials" (renders on the BUILT shells, light + dark, phone + desktop; ≤ 4 clickable questions per round). No build before Damir says "go".
4. Build contract-first (`contract-first-parallel-build`), disjoint files, each builder in its own git worktree; strings → the FULL pipeline once after the merge; re-capture the ring fixture if a launch input changes.
5. Pins with deliberate breaks; ONE full smoke alone (2 cores) → `BASELINE OK n / the 2 KNOWN`; CSH (+ #1312 if any C# of ours changes).
6. #46 loop (`adversarial-review-loop`) until CLEAN; create the "smoke done" marker file the readers wait on (L148).
7. Export (`session-handoff`): DECISIONS, walk sheet(s) for the fix rows, handoff, CLAUDE.md, commit message (no attribution), the ONE patch. `docs/prompts/session-21.md` stays (privacy levels) — update its precondition to the new HEAD.

## 5 · Rules (unchanged)
Cloud clone only; never commit / push from the cloud — deliver the .patch + the commit message, Damir commits. ★ COMMIT RULE: no attribution lines. `git --no-optional-locks` on the mounted repo. ONE full smoke at a time. Mechanism first (#294). Tokens, not literals. The PARAMOUNT invariant. C# touches no risky parts; #1312 for our C#. Claims: never "money", "no servers", "anonymous", "post-quantum forward secrecy" (the welcome PQ line is the one ruled exception, #1425); translations keep the English claim scope and each locale's own glossary term (L146).
