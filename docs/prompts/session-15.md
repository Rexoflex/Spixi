Read CLAUDE.md, then the newest docs/handoff-*.md (FIRST — `docs/handoff-2026-10-09b.md`), then DECISIONS #1278–#1295 and the
S14 rows of `docs/security-handover-gate.md`. Next free DECISIONS number: #1296.
This is SESSION 15 (a new chat): the S14 walk, the 10 security FIX rows, the two owed logs, then the office walk prep.

ORDER:
1. Precondition (below). Then Damir pastes the "Spixi Session 14 Walk" results → a `WALK #1296: n P · n F · n N/A` row
   (logs `android-s14.txt`, `android-s14-old.txt`, `android-s14-restore.txt`). S14-STUTTER: tabulate `[P1] frames open-contactdetails`
   per container mode (`[P1] open contactdetails present … container=<word>`); Clip passes at drop ≤ 1 / max ≤ 25 on 10 opens → remove the
   dev switch? (interview). Each fail → mechanism first (#294).
2. The owed logs (#1292): auto-download in the background (`android-s14-autodl.txt`) and Samsung stutter (`android-s14-samsung.txt`) —
   read before any fix. Memory peak (#1295) if S14-MEM confirms > 400 MB.
3. INTERVIEW (clickable, few questions): walletpass in backed-up Preferences (#1294) · tip fee hint (#1294) · the hold tap fall-through
   (#1294) · the About bubble colour (#1288) · anything the walk raised.
4. Build after "go": the 10 security FIX rows (#1293: O-04, O-06, O-08, O-09, O-11, O-19, O-27 = Damir's `git rm --cached`, O-29,
   O-30, O-31) + O-35 store-release gate (SpixiDevCoexist off) — contract-first if > 1 area; #46 until CLEAN; ONE full smoke ALONE.
5. Office walk prep: refresh `docs/office-walk-sheet-v1.md` with S13/S14 rows → publish "Spixi Office Walk v1"; freeze checklist states.
6. END: patch + PowerShell copy-paste blocks + the walk sheet + handoff + `docs/prompts/session-16.md`.

## Rules and precondition
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 (#931) · PowerShell copy-paste blocks with every delivery ·
★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with" line in any commit message, commit-message file or PR text ·
verify every claim in the tree (#215) · mechanism first (#294) · C# touches no risky parts · bridge protocol frozen (new verbs = 🟡 + BE ask + T1 row) ·
security handover gate · no Ixian-Core change · never commit or push from the cloud (Damir applies the patch). ★ MAC RE-SYNC: if Damir says he is on the
Mac and pulled, give the CLAUDE.md re-sync steps FIRST.
Precondition (stop if it fails): `git log` has "Session 14: back on Android 16, backup paths, chat info stutter and swap, tab hand-off, About, wallet"
on top of "Session 13c: …", and HEAD = origin/redesign/frontend; smoke BASELINE OK 5706 / the 2 KNOWN (#136 · B3); `node scripts/run-csh.mjs`
→ CSH pass=352 fail=0. Cloud twin: clone + Ixian-Core @097341a (sibling folder) + ONE `npm i --no-save jsdom eslint globals tree-sitter tree-sitter-c-sharp`
+ `apt-get update` then `apt-get install -y dotnet-sdk-10.0` (+ ffmpeg, numpy for recordings). ONE full smoke at a time, DETACHED with `setsid`, ended
with `echo SMOKEDONE rc=$?`; never edit the tree while it runs. Recordings: frame scan AND tiles (L114). Next walk log name: `android-s15.txt`.
