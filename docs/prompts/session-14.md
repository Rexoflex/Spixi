Read CLAUDE.md, then the newest docs/handoff-*.md (FIRST — `docs/handoff-2026-10-09.md`), then DECISIONS #1269–#1274 and
`docs/s13-flash-mechanism.md`. Next free DECISIONS number: #1275.
This is SESSION 14 (a new chat): the S13 walk (12-FLASH fix proof), Damir's picks (About card, layer removal, 12-BAND, the OURS-OPEN
security rows), then the office-walk prep. Already decided (do not re-open): #1269 (E2E line dropped, Help Center kept, paste kept, S4 / S5 order).

ORDER:
1. Precondition (below). Then the S13 walk: Damir pastes the "Spixi Session 13 Walk" results → `WALK #1275: n P · n F · n N/A` row.
2. 13-FLASH: frame scan of BOTH recordings (every frame, mid-band luma std-dev < 2.5 = blank; VIEW 8-frame tiles around every open — L114),
   line up with `android-s13.txt` by two opens; 0 blank frames on ≥ 20 opens (light + dark, warm + cold + chat → chat + back) = V-26 WALKED.
   A blank left → mechanism first (#294): which write lands in that frame (`[P1] hold frame` stamps), read the MAUI source (L115).
3. INTERVIEW (clickable, few questions): About card A / B / C (renders on the sheet) · remove `S12GroundWait` (recommended) · 12-BAND
   option (#1272) · the OURS-OPEN rows (#1273): which to fix before handover (aboutLink whitelist = new verb → BE ask) and which to accept.
4. Build after "go" (contract-first if > 1 area), #46 until CLEAN, ONE full smoke ALONE (L108, L112).
5. Office walk prep: refresh `docs/office-walk-sheet-v1.md` with the S14 rows; publish it as the "Spixi Office Walk v1" sheet; the freeze
   checklist (`docs/freeze-checklist-v1.md`) states.
6. END: patch + PowerShell commands + the walk sheet + handoff + `docs/prompts/session-15.md`.

## 0 · Rules and precondition
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 (#931) · PowerShell repo commands with every delivery ·
★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with" line in any commit message, commit-message file or PR text ·
verify every claim in the tree (#215) · mechanism first (#294) · C# touches no risky parts · bridge protocol frozen (new verbs = 🟡 + BE ask + T1 row) ·
security handover gate · no Ixian-Core change. ★ MAC RE-SYNC: if Damir says he is on the Mac and pulled, give the CLAUDE.md re-sync steps FIRST.
Precondition (stop if it fails): the commit "Session 13: chat-open flash fix, E2E line, sweep pre-run, freeze prep" is in `git log` and HEAD =
origin/redesign/frontend (find commits by message); smoke BASELINE OK 5687 / the 2 KNOWN (#136 · B3); `node scripts/run-csh.mjs` → CSH pass=344
fail=0. The device shell kills a > 3 min smoke → the cloud twin (clone + Ixian-Core @097341a + ONE `npm i --no-save jsdom eslint globals tree-sitter
tree-sitter-c-sharp` + `apt-get update` then `apt-get install -y dotnet-sdk-10.0`; ffmpeg + numpy for the recordings). ONE full smoke at a time,
DETACHED with `setsid`, ended with `echo SMOKEDONE rc=$?`; never edit the tree while it runs. A single pin-module runner = the smoke prelude
(lines 1 … before `console.log('app-frame.html')`) + an import loop, written INSIDE `scripts/` (delete it before the patch).
Logs: `android-s13.txt` (this walk), `android-s14.txt` next.

## Outcome (O)
For: Spixi users, Damir and the BE engineer. After this session the chat-open flash is proven gone on a recording (or has a measured next
step), Damir's About pick is built, the OURS-OPEN security rows each have a fix or an accept, and the office walk sheet is ready.
We know it worked when: the S13 recordings show 0 blank frames on ≥ 20 opens · the S14 walk passes the About + security rows · the gate doc
has 0 open "ours" rows without a decision.

## Generate, then grade (G) · Export (E)
Skills: `forge-engineering-session` · `spixi-build-and-walk` · `spixi-finalization-checklists` · `adversarial-review-loop` · `contract-first-parallel-build`.
Export: DECISIONS rows · release-readiness · handoff · status log · CLAUDE.md "Where we are now" · lessons · `docs/commit-message-session14.txt`
(no attribution) · `docs/prompts/session-15.md` · skill proposals.
