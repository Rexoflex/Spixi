Read CLAUDE.md, then the newest docs/handoff-*.md (FIRST — `docs/handoff-2026-10-08b.md`), then DECISIONS #1265–#1268 (#1265 = Damir's answers,
#1266 = the S11 walk, #1267 = the S12 interview, #1268 = the S12 build + review) and `docs/freeze-inventory-2026-10-08.md`.
Next free DECISIONS number: the number in CLAUDE.md (#1269).
This is SESSION 13 (a new chat): the S12 walk fix round, the introduced-vs-inherited security sweep and the FREEZE checklist. It is the last
Windows + Android session before the office walk (iPhone + Mac) and the freeze (Damir, 2026-10-08 19:02).
Already decided (do not re-open): every pick in #1265–#1267 · the recorded-not-fixed list of #1268 / handoff §5.

ORDER:
1. Precondition (below). Then the S12 walk: Damir pastes the results of the "Spixi Session 12 Walk" sheet → a `WALK #1269: n P · n F · n N/A`
   DECISIONS row (PASS list, FAIL list with first reads, unmarked rows).
2. Mechanism first for each fail (#294), verified in the tree (#215). 12-FLASH decides V-26: read `[P1] hold grounds why= f= ms= rdy=` and
   `[P1] hold release` in `android-s12.txt` against the recording (line up by TWO opens; frame scan: std-dev of luma < 2 = flat, as #1266).
   Close V-26 if `why=drawn rdy=1` and no flat frame in light AND dark; if `why=cap`, read the probe before any change (L104, L110).
   12-SAVE-W: read `[P1] savephoto r=` in the Windows `ixian.log` (`Documents\Spixi`, the NEWEST file).
3. INTERVIEW (clickable, few questions): the S12 fails' fixes · the E2E copy line (singular) · keep the Help Center row · paste settled
   convention in de / en · S4 / S5 sweep docs before or after the tag (freeze inventory §7).
4. Build after "go" (contract-first if > 1 area), #46 until CLEAN, ONE full smoke run ALONE (L108, L112: `pgrep -fa smoke-test` first).
5. SECURITY SWEEP (`docs/security-handover-gate.md`): introduced-vs-inherited over the whole delta from `0e85a4b8`, the S9–S12 rows first;
   every "ours" finding is fixed before the handover (CLAUDE.md gate rule).
6. FREEZE PREP: update `docs/release-readiness.md` from the inventory (17 stale "walk owed" cells, the T2 rows already decided, V-31, B-34);
   the freeze checklist (`spixi-finalization-checklists`) as a tick list for Damir's sign-off; the office walk sheet (iPhone + Mac) for every
   V row (none was ever walked there), ready for Damir.
7. END: patch + PowerShell commands + the walk sheet (fix rows + every N/A row of WALK #1269) + handoff + `docs/prompts/session-14.md`.

## 0 · Rules and precondition
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 (#931) · PowerShell repo commands with every delivery ·
★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with" line in any commit message, commit-message file or PR text ·
verify every claim in the tree (#215) · mechanism first (#294) · C# touches no risky parts · bridge protocol frozen (new verbs = 🟡 + BE ask + T1 row) ·
security handover gate · no Ixian-Core change. ★ MAC RE-SYNC: if Damir says he is on the Mac and pulled, give the CLAUDE.md re-sync steps FIRST.
Precondition (stop if it fails): the commit "Session 12: S11 walk fixes, tips, About and How to use, paste, album rows" is in `git log` and HEAD =
origin/redesign/frontend (find commits by message, not by hash); smoke BASELINE OK 5686 / the 2 KNOWN (#136 · B3); `node scripts/run-csh.mjs`
→ CSH pass=344 fail=0. The device shell kills a > 3 min smoke → the cloud twin (clone + Ixian-Core @097341a + ONE
`npm i --no-save jsdom eslint globals tree-sitter tree-sitter-c-sharp` + `apt-get update` then `apt-get install -y dotnet-sdk-10.0`). ONE full smoke at a
time and nothing else running (L75, L108, L112), DETACHED with `setsid`, ended with `echo SMOKEDONE rc=$?` (L95); never edit the tree while it runs;
never `pkill -f` a pattern your own command contains (L94, L112). A single pin module runner: smoke prelude (lines 1 … before `console.log('app-frame.html')`)
+ an import loop, written INSIDE `scripts/` (jsdom resolves from there). Logs: each walk log under a NEW name (`android-s12.txt`, `android-s13.txt` next).

## Outcome (O)
For: Spixi users, Damir and the BE engineer. After this session the S12 walk fails have measured mechanisms and fixes, V-26 is closed or has a
probe-backed next step, the security sweep lists nothing of ours unfixed, and the freeze checklist is ready for Damir's sign-off. We know it worked when:
the S13 walk passes the S12 fail rows · `docs/security-handover-gate.md` has the sweep result with 0 open "ours" rows · the freeze checklist has an
owner and a state on every item · the office walk sheet covers every V row.

## Generate, then grade (G) · Export (E)
Skills: `spixi-build-and-walk` · `spixi-finalization-checklists` · `adversarial-review-loop` · `contract-first-parallel-build` · `forge-engineering-session`.
Export: DECISIONS rows · release-readiness · handoff · status log · CLAUDE.md "Where we are now" · lessons · `docs/commit-message-session13.txt`
(no attribution) · `docs/prompts/session-14.md` · skill proposals.
