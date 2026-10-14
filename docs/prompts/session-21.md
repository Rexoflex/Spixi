# Session 21 — privacy levels (after the S20 walk and the office walk)

Paste this as the first message of a NEW chat. Chat replies in ASD-STE100 (#931). PowerShell blocks with every delivery, each starting with the full `cd`.

## 0 · Precondition (stop if it fails)
- `git --no-optional-locks log --oneline -3` on Damir's clone: the top is "Session 20F: the S20 walk fix round (W-1 … W-13)" — or the S20G commit (the office walk fix round, `docs/prompts/session-20g.md`) on top of it; HEAD = origin/redesign/frontend.
- The S20F walk (Windows + Android, `docs/walk-s20f.md`) and the office walk (iPhone + Mac, `docs/office-walk-sheet-v1.md` §7–§14) are recorded, and the S20G fix round is committed. The office walk (iPhone + Mac, `docs/office-walk-sheet-v1.md`) is done or scheduled — say which.
- Read: `CLAUDE.md` → the newest `docs/handoff-*.md` (S20G's, else `docs/handoff-2026-10-14b.md`) → DECISIONS #1412, #1413, #1414, #1441 → the privacy rows (grep "privacy levels", Damir 2026-10-11 23:33).
- Cloud twin: the repo + `ixian-platform/Ixian-Core` at `097341a` next to it; `apt-get install -y dotnet-sdk-8.0`; `npm i --no-save jsdom eslint globals tree-sitter tree-sitter-c-sharp` (ONE command). Baseline: smoke **6148** (S20F; S20G may move it — read its handoff) / the 2 KNOWN · CSH **451**. Next free: DECISIONS #1407 (S line) · lessons L145.

## 1 · Outcome
Damir can pick one privacy level in Settings › Privacy and see exactly what it changes.
- Option 1 (Damir 23:33, 2026-10-11): presets **Relaxed · Balanced · Private** over the EXISTING switches (read receipts, typing, online status, media auto-download, link previews if any — read the real list in the settings shell); "Custom" is computed by the shell when the switches do not match a preset; a "This changes" list before applying; one undo.
- No new bridge verb unless a switch has no verb today (then #1312: flag, packet, gate row, security-only #46 at HIGH).

## 2 · Order
1. Precondition + record the S20 / office walk rows if not yet recorded.
2. Mechanism: list every privacy switch, its verb, its storage key, its default, and what C# does with it.
3. Interview (clickable): is each switch in each preset right? Where does "Custom" show? Render the card on the BUILT settings shell, both themes, phone + desktop. **No build before "go".**
4. Build contract-first; pins with deliberate breaks; ONE full smoke alone; CSH; #46 to CLEAN.
5. Walk sheet + patch + handoff + `docs/prompts/session-22.md` (the perf levers and freeze prep).

## 3 · Rules (unchanged)
Cloud clone only; never commit / push from the cloud; ★ COMMIT RULE (no attribution lines); no Ixian-Core change; C# touches no risky parts; #1312 for our bridge / C# changes; `git --no-optional-locks` on the mounted repo; ONE full smoke at a time (2 cores); mechanism first (#294); tokens, not literals; parallel builders each get their own scratch folder (L140).
