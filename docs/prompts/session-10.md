Read CLAUDE.md, then the newest docs/handoff-*.md (FIRST — `docs/handoff-2026-10-07b.md`), then DECISIONS #1243–#1251 (and #1205, #1228,
#1229 for A-FLASH and CORE-10). Next free DECISIONS number: the number in CLAUDE.md (#1252).
This is SESSION 10 (a new chat): FIRST the S9 walk record; THEN the fix round for its fails; THEN FREEZE prep per the v1 plan.
Already decided (do not re-open): every pick in #1243–#1248 · the A-FLASH fix shape (#1249) · the recorded-not-fixed list of #1251.

ORDER:
1. Precondition (below). If Damir has NOT applied / committed the S9 patch yet: give him the apply + commit commands first (handoff §0).
2. S9 WALK RECORD: Damir pastes the "Spixi Session 9 Walk" results → a `WALK #1252: n P · n F · n N/A` DECISIONS row; each F = mechanism
   FIRST (read `android-s9.txt` + the Windows log before a fix, #294). The ⚠ C# was UNCOMPILED: a compile error is an F with its file:line.
3. A-FLASH DATA (#1249): read the `[P1] boot hold ms= why=dropped|cap` lines (cap = the shell never sent `ixian:bootDropped` in time) and
   `[P1] hold release bg=kept|set` + `frames open … drop= max=` for 10 opens. Pass = no white at cold start, held opens drop 0, max ≈ 20 ms,
   no grey frame on the recording. Not passed → a probe, not a third fix.
4. RE-WALK data: 8-GROW-A with the `[P1] grow` lines (reply with focus vs without; the IME resize vs the 200 ms strip grow) → mechanism, then
   the fix · 7B-REC.
5. CORE-10: only if a long-offline capture came (phone offline > 30 min while others send): the `[P1] push fetch got= new= rep= reid= fix= ran=
   codes=` lines → write CORE-10 with the numbers (draft #1229). Fixes stay Core / BE.
6. OPEN PICKS (clickable questions, renders where visual): Android 12+ splash = keep the plain-colour cover vs keep the real SplashScreenView
   via `SplashScreen.SetOnExitAnimationListener` until bootDropped (#1249) · the old-app caption check result (#1244, L80).
7. Build the fix round (contract-first if > 1 area), #46 until CLEAN, ONE full smoke.
8. FREEZE PREP per the v1 plan (`docs/release-readiness.md` endgame, S6 · Freeze): every V row WALKED or OUT with a row; T1 / T2 rows that
   block the freeze listed with owner; the freeze checklist for Damir (`spixi-finalization-checklists`). No freeze tag without Damir.
9. END: patch + PowerShell commands + walk sheet for the fix rows (re-walk rows only).

## 0 · Rules and precondition
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 (#931) · PowerShell repo commands with every delivery ·
★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with" line in any commit message, commit-message file or PR text ·
verify every claim in the tree (#215) · mechanism first (#294) · C# touches no risky parts · bridge protocol frozen (new verbs = 🟡 + BE ask + T1 row) ·
security handover gate · no Ixian-Core change. ★ MAC RE-SYNC: if Damir says he is on the Mac and pulled, give the CLAUDE.md re-sync steps FIRST.
Precondition (stop if it fails): the commit "Session 9: media picker family, audit fixes, copy, S8 fixes" is in `git log` and
HEAD = origin/redesign/frontend (find commits by message, not by hash); smoke BASELINE OK 5567 / the 2 KNOWN (#136 · B3);
`node scripts/run-csh.mjs` → CSH pass=280 fail=0. The device shell kills a > 3 min smoke → the cloud twin (clone + Ixian-Core @097341a + ONE
`npm i --no-save jsdom eslint globals tree-sitter tree-sitter-c-sharp` + `apt-get update` then `apt-get install dotnet-sdk-10.0`). ONE full
smoke at a time (L75), DETACHED, ended with `echo SMOKEDONE rc=$?` (L95); never edit the tree while it runs; never `pkill -f` a pattern your
own command contains (L94).

## Outcome (O)
For: Spixi users, Damir and the BE engineer. After this session the S9 build is walked, every F has a mechanism and a fix, and the v1 list
is ready for the FREEZE. We know it worked when: WALK #1252 is recorded · A-FLASH passes on the recording + `[P1]` lines (DoD V-26) ·
8-GROW-A has a measured mechanism (V-25) · V-14 / V-14b / V-14c / V-14d / V-15 / V-16 / V-17 / V-18 / V-27 → WALKED · the fix rows #46 CLEAN ·
the freeze checklist lists every remaining blocker with owner.

## Generate, then grade (G) · Export (E)
Skills: `spixi-build-and-walk` · `spixi-finalization-checklists` · `adversarial-review-loop` (stubs in the REAL namespace, L89; trim whole
sentences, L96; exempt the API, not the file, L97; leaf names + re-root, L98) · `contract-first-parallel-build`.
Export: DECISIONS rows · release-readiness · handoff · status log · CLAUDE.md "Where we are now" · lessons · `docs/commit-message-session10.txt`
(no attribution) · `docs/prompts/session-11.md` (FREEZE) · skill proposals.
