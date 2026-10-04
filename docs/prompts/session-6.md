Read CLAUDE.md, then docs/handoff-2026-10-04c.md (FIRST), then DECISIONS #1137–#1145 (the v1 plan), #1165–#1168. Next free DECISIONS number: #1169.
This is SESSION 6. Part A = the session-5b walk record + fixes; part B = #1168; part C = S6 (#1145): the capability check
(`getAppProtocols` answer + ask, #1136 facts) + reply-to (#1137 (3)) + edit (#1137 (4)).
Already decided (do not re-open): everything in #1137–#1145 and #1160–#1167 · Core stays clean (#1137) · voice is SESSION 7.

## 0 · Rules and precondition
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 (#931) · PowerShell repo commands with every delivery ·
★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with" line in any commit message,
commit-message file or PR text · verify every claim in the tree (#215) · mechanism first (#294) · C# touches no risky parts ·
bridge protocol frozen (new verbs = 🟡 + BE ask) · security handover gate · no Ixian-Core change.
★ MAC RE-SYNC: if I say I am on the Mac and pulled, give the CLAUDE.md re-sync steps FIRST.
Precondition (stop if it fails): the session-5b commit ("Session 5b: …") is in `git log` and HEAD = origin/redesign/frontend;
smoke BASELINE OK (the number in CLAUDE.md) / the 2 KNOWN; `node scripts/run-csh.mjs` → CSH 107. The device shell kills a > 3 min
smoke → build the cloud twin (clone + Ixian-Core @097341a + ONE `npm i --no-save jsdom eslint globals tree-sitter tree-sitter-c-sharp`
+ dotnet-sdk-8.0). Run ONE full smoke at a time (L75).

## Step 1 · the walk (Part A)
Paste of `docs/walk-artifact-session5b-win-android.html` + the logs → a `WALK #N` DECISIONS row; each F = mechanism first
(skill `spixi-build-and-walk` step 5). A build error = the first compile of #1166 (handoff §5 lists the APIs relied on).
Lever 7: keep width or switch to push on the walk result. Lever 4: read the `[P1] spare-after` lines → a fix or nothing (one lever).
B4 (`messagesToLoad` 50 → 25) as ONE try in the §8 log only after the B2 numbers. Record kept / discarded in `docs/p1-measurement.md`.

## Outcome (O)
For: Spixi users and Damir. After this session the 5b walk is recorded and its fails are fixed; the transfer card reads well over
a light image (#1168); a reply and an edit work between two new apps, and a legacy peer sees a sensible fallback (capability check).
We know it worked when:
  - WALK row + every F fixed with a pin (deliberate break) and a re-walk row.
  - #1168: contrast computed on a white source (line ≥ 4.5:1, ring ≥ 3:1), renders both themes, Damir's pick built.
  - S6 items built per their DECISIONS rows after the interview and "go"; new verbs / pushes = 🟡 rows + gate rows + B-list rows.
  - #46 CLEAN before delivery.

## Reverse interview (R)
Before any S6 build: is each item worth doing as specified (#1137 (3)/(4), #1136)? Three options where real alternatives exist
(AskUserQuestion, ≤ 4 per call). The walk fixes and #1168 need no "go" beyond the render pick. Do not start S6 before I say "go".

## Generate, then grade (G) · Export (E)
Skills: `spixi-build-and-walk` · `spixi-finalization-checklists` §3 + §8 · `adversarial-review-loop` · `contract-first-parallel-build`
(one scratch namespace per agent, L74; ONE full smoke at a time, L75). Export: DECISIONS rows · release-readiness · handoff ·
status log · CLAUDE.md "Where we are now" · lessons · `docs/commit-message-session6.txt` (no attribution) ·
`docs/prompts/session-7.md` (S7 = voice, #1136) · skill proposals.
