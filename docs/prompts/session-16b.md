Read CLAUDE.md, then the newest docs/handoff-*.md (FIRST — `docs/handoff-2026-10-11b.md`), then DECISIONS #1321–#1326 and the
"Session 16" section of `docs/security-handover-gate.md`, then `docs/be-review-pack/P24-walletpass-l8.md` + `P25-media-input-gate.md`.
Next free DECISIONS number: #1327 (#1327–#1330 = S16's; #1331–#1350 = S17-early; #1314–#1319 = perf).
This is SESSION 16b (a new chat): record the S16 walk (+ the office leg if walked on this build), the fix round, the Mac L8 decision.
Already decided (do not re-open): #1321 picks (flags only L8 + F3/F4 · a1 gate · F2 drop + 5 s · MAJOR #9 Android only · L8 design ·
strip A · RESTORE-B sheet 2 · freeze + perf after this) · #1322–#1324 as built · #1326 the parallel-session rules.

## 0 · Rules and precondition
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 (#931) · PowerShell copy-paste blocks with every delivery ·
★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with" line in any commit message, commit-message file or PR text ·
verify every claim in the tree (#215) · mechanism first (#294) · C# touches no risky parts · #1312: our-code changes behind a flag where larger,
a security-only #46 at high effort, a packet (P24 / P25 updated; new = P28+, P26 = S17-early, P27 = desktop Hello) + a gate row · no Ixian-Core change ·
never commit or push from the cloud. ★ MAC RE-SYNC: if Damir says he is on the Mac and pulled, give the CLAUDE.md re-sync steps FIRST.
Precondition (stop if it fails): `git log` has "Session 16: …" (Damir committed the S16 patch with `docs/commit-message-session16.txt`) on top of
"Session 16 prompt: …"; HEAD = origin; smoke BASELINE OK 5756 / the 2 KNOWN (#136 · B3); `node scripts/run-csh.mjs` → CSH pass=423 fail=0.
Cloud twin: clone + Ixian-Core @097341a (sibling) + ONE `npm i --no-save jsdom eslint globals tree-sitter tree-sitter-c-sharp` + `apt-get update`
then `apt-get install -y dotnet-sdk-10.0` (+ ffmpeg, numpy). ONE full smoke at a time, DETACHED with `setsid`, ended with `echo SMOKEDONE rc=$?`;
never edit the tree while it runs. Single-module runner = the smoke prelude (lines 1 … before `console.log('app-frame.html')`) + an import loop over
`MODS`, written INSIDE `scripts/` (`_s16run.mjs` shape), deleted before the patch. ⚠ After a context reset: read the twin's `git log` and the scratch first (L125).

## Outcome (O)
For: Damir (the walk, the release road) and the Spixi user.
We know it worked when:
  - WALK row for §6 (S16 rows, A / W / I / M) → `docs/office-walk-sheet-v1.md` filled; the office §0–§5 too if walked on this build  (DoD V rows)
  - S16-BUILD passes on all 4 (first compile of the S16 C#)  (#1322–#1324)
  - L8: S16-L8-MIG / -NEW / -CHANGE / -RETRY / -FLAG pass on A W I; the Mac result named (store=secure or not) → keep, MACCATALYST default OFF,
    or a keychain entitlement (Damir picks)  (B-5, #1323)
  - S16-M9 (QR camera on Android) passes — a fail here is a release blocker (#1322)
  - #1311 (a): the `[THEME]` lines name the mechanism (or "not reproduced" ×3)  (#1324)
  - every F → mechanism → fix (+ its #46 at high effort if security)

## Work items
1. Record the walk (paste → P / F / N/A per row; logs `android-s16.txt`, the Windows log, the Xcode console). Each F → mechanism first.
2. The Mac L8 decision if S16-L8-NEW fails there.
3. #1311 (a) from the `[THEME]` lines; #1311 (d) (desktop pattern contour) if a log + recording exist.
4. Hand the S16-PSS numbers to the perf session (research §6 shape, both PIDs).

## Reverse interview (R)
Before any fix: read the walk logs and the code the fails touch. Ask "is this worth doing at all?" for every item not in "Already decided",
then clickable questions, a few per round. Do not start until Damir says "go".
★ REASONING SWITCHES: START on Medium (walk recording); a FAIL row or a security decision → print ">>> Set reasoning to High now." and stop.

## Generate, then grade (G)
Real design choices: three options, renders on the BUILT shell, both themes. Code: every gate in docs/process.md §G2; pins that pass the
deliberate-break test; smoke BASELINE OK / the 2 KNOWN. Security fixes: a security-only #46 at high effort until CLEAN, before delivery.

## Export (E)
DECISIONS rows · docs/release-readiness.md rows · walk sheet · handoff · one status-log entry · CLAUDE.md "Where we are now" replaced · lessons ·
docs/commit-message-session16b.txt (no attribution) · the next prompt (the perf session) · skill proposals. Next walk log name: `android-s16b.txt`.
