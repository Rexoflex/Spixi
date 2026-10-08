Read CLAUDE.md, then the newest docs/handoff-*.md (FIRST — `docs/handoff-2026-10-08.md`), then DECISIONS #1262–#1264 (#1262 = the S11
interview, #1263 = Damir's picks, #1264 = the build + review). Next free DECISIONS number: the number in CLAUDE.md (#1265).
This is SESSION 12 (a new chat): the S11 walk fix round, THEN the FREEZE prep.
Already decided (do not re-open): every pick in #1261–#1263 · the recorded-not-fixed list of #1264 / handoff §5.

ORDER:
1. Precondition (below). Then the S11 walk: Damir pastes the results of the "Spixi Session 11 Walk" sheet → a `WALK #1265: n P · n F · n N/A`
   DECISIONS row with the PASS list, the FAIL list with first reads (not verified) and the unmarked rows.
2. Mechanism first for each S11 fail (#294), verified in the tree (#215). 11-FLASH decides V-26: read `[P1] hold release why= … ackf= stale=`
   and `[P1] hold frame` lines in `android-s11.txt` against the recording (line up by TWO opens). Keep the candidate if `why=paint` and no flat
   frames; if `why=cap` on normal opens, the ack arrives late — read the probe before any third guess (L104, skill §5e).
3. INTERVIEW (clickable): the S11 fails' fixes · About B + How to use A (design queue P3, renders on the built shell) · tips 1–4 URLs ·
   paste on the 2-step Send · the Android 12+ splash (#1249) · the cold-start main-thread stall · the desktop window-resize dark band.
4. Build after "go" (contract-first if > 1 area), #46 until CLEAN, ONE full smoke run ALONE (L108).
5. FREEZE PREP (`docs/release-readiness.md` endgame): every V row WALKED or OUT; T1 / T2 blockers with owner (B-28 … B-33, CORE-8/9/10 …);
   the freeze checklist for Damir (`spixi-finalization-checklists`); start the introduced-vs-inherited sweep (`docs/security-handover-gate.md`)
   with the S11 rows. No freeze tag without Damir.
6. END: patch + PowerShell commands + the walk sheet (fix rows + every N/A row of WALK #1265).

## 0 · Rules and precondition
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 (#931) · PowerShell repo commands with every delivery ·
★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with" line in any commit message, commit-message file or PR text ·
verify every claim in the tree (#215) · mechanism first (#294) · C# touches no risky parts · bridge protocol frozen (new verbs = 🟡 + BE ask + T1 row) ·
security handover gate · no Ixian-Core change. ★ MAC RE-SYNC: if Damir says he is on the Mac and pulled, give the CLAUDE.md re-sync steps FIRST.
Precondition (stop if it fails): the commit "Session 11: S10 walk fixes, design set, album, send flow" is in `git log` and HEAD =
origin/redesign/frontend (find commits by message, not by hash); smoke BASELINE OK 5664 / the 2 KNOWN (#136 · B3); `node scripts/run-csh.mjs`
→ CSH pass=336 fail=0. The device shell kills a > 3 min smoke → the cloud twin (clone + Ixian-Core @097341a + ONE
`npm i --no-save jsdom eslint globals tree-sitter tree-sitter-c-sharp` + `apt-get update` then `apt-get install dotnet-sdk-10.0`). ONE full smoke at a
time and nothing else running (L75, L108), DETACHED with `setsid`, ended with `echo SMOKEDONE rc=$?` (L95); never edit the tree while it runs; never
`pkill -f` a pattern your own command contains (L94). Logs: each walk log under a NEW name (`android-s12.txt`).

## Outcome (O)
For: Spixi users, Damir and the BE engineer. After this session every S11 fail has a measured mechanism and a fix, 10-FLASH is closed or has a
probe-backed next step, and the v1 list is ready for the FREEZE. We know it worked when: the S12 walk passes the S11 fail rows · every V row is
WALKED or OUT · the freeze checklist lists every remaining blocker with an owner.

## Generate, then grade (G) · Export (E)
Skills: `spixi-build-and-walk` · `spixi-finalization-checklists` · `adversarial-review-loop` · `contract-first-parallel-build`.
Export: DECISIONS rows · release-readiness · handoff · status log · CLAUDE.md "Where we are now" · lessons · `docs/commit-message-session12.txt`
(no attribution) · `docs/prompts/session-13.md` · skill proposals.
