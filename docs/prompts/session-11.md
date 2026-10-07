Read CLAUDE.md, then the newest docs/handoff-*.md (FIRST — `docs/handoff-2026-10-07c.md`), then DECISIONS #1252–#1259. Next free DECISIONS
number: the number in CLAUDE.md (#1260).
This is SESSION 11 (a new chat): FIRST the S10 walk record; THEN its fails (mechanism first); THEN FREEZE prep per the v1 plan.
Already decided (do not re-open): every pick in #1252–#1254 · the recorded-not-fixed list of #1257.

ORDER:
1. Precondition (below). If Damir has NOT applied / committed the S10 patch: give him the apply + commit commands first (handoff §0).
2. Record the S10 walk: Damir pastes the "Spixi Session 10 Walk" results → a `WALK #N (S10, …): n P · n F · n N/A` DECISIONS row (PASS list,
   FAIL list with first reads, unmarked rows). Read `Claude outputs/android-s10.txt` + the 10-FLASH recording: line them up by TWO events;
   `[P1] hold nbg pre= post= vg=` must be equal before / after and no flat frame on the "new added" opens (#1255); `[P1] haptic k= ok= hfe= sdk=`
   decides F4 (hfe=0 → working as designed); `[P1] wallet tab2 first prepushed=1`.
3. Each F = mechanism first (#294), verified in the tree (#215); interview before any visual change; build the fix round only after "go";
   #46 until CLEAN; ONE full smoke.
3b. #1258 PHOTO PREVIEW IN THE OFFER (Damir): the sender fills FileTransfer.preview (the field exists since 0e85a4b8;
   the old reader skips it length-prefixed — no version check needed, #1258); interview first (size cap ~8 KB / 96 px, blur until
   downloaded, grid cells + single tile, the "Load pictures" privacy switch OFF = no preview shown); render both themes; pins + csh;
   BE ask + gate row.
4. FREEZE PREP (`docs/release-readiness.md` endgame, S6 · Freeze): every V row WALKED or OUT with a row; T1 / T2 rows that block the freeze
   with owner (B-31, B-32, CORE-10 …); the freeze checklist for Damir (`spixi-finalization-checklists`). No freeze tag without Damir.
5. Open picks (clickable): Android 12+ splash (#1249) · cold-start main-thread stall (2.0–2.5 s, perf after the freeze?) · the desktop
   window-resize dark band (mechanism first).
6. END: patch (if code changed) + PowerShell commands + the walk sheet for the re-walk rows only.

## 0 · Rules and precondition
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 (#931) · PowerShell repo commands with every delivery ·
★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with" line in any commit message, commit-message file or PR text ·
verify every claim in the tree (#215) · mechanism first (#294) · C# touches no risky parts · bridge protocol frozen (new verbs = 🟡 + BE ask + T1 row) ·
security handover gate · no Ixian-Core change. ★ MAC RE-SYNC: if Damir says he is on the Mac and pulled, give the CLAUDE.md re-sync steps FIRST.
Precondition (stop if it fails): the commit "Session 10: S9 walk fix round, media strip, excerpt lines" is in `git log` and HEAD =
origin/redesign/frontend (find commits by message, not by hash); smoke BASELINE OK 5604 / the 2 KNOWN (#136 · B3); `node scripts/run-csh.mjs`
→ CSH pass=299 fail=0. The device shell kills a > 3 min smoke → the cloud twin (clone + Ixian-Core @097341a + ONE `npm i --no-save jsdom
eslint globals tree-sitter tree-sitter-c-sharp` + `apt-get update` then `apt-get install dotnet-sdk-10.0`). ONE full smoke at a time (L75),
DETACHED, ended with `echo SMOKEDONE rc=$?` (L95); never edit the tree while it runs; never `pkill -f` a pattern your own command contains (L94).
Logs: Damir saves each walk log under a NEW name (`android-s10.txt`, not an older name — the S9 log was overwritten on 2026-10-07).

## Outcome (O)
For: Spixi users, Damir and the BE engineer. After this session the S10 build is walked, every F has a mechanism and a fix, and the v1 list is
ready for the FREEZE. We know it worked when: the S10 WALK row is recorded · V-26 (A-FLASH) and V-28 (S10) WALKED · every V row WALKED or OUT ·
the freeze checklist lists every remaining blocker with owner.

## Generate, then grade (G) · Export (E)
Skills: `spixi-build-and-walk` · `spixi-finalization-checklists` · `adversarial-review-loop` · `contract-first-parallel-build`.
Export: DECISIONS rows · release-readiness · handoff · status log · CLAUDE.md "Where we are now" · lessons · `docs/commit-message-session11.txt`
(no attribution) · `docs/prompts/session-12.md` · skill proposals.
