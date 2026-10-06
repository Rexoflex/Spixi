Read CLAUDE.md, then docs/handoff-2026-10-05b.md (FIRST), then DECISIONS #1207–#1210 and #1197–#1206. Next free DECISIONS number: #1211.
This is SESSION 7b (a new chat): the walk record + fixes of 6b AND S7 (Damir walked both builds as ONE build, sheet "Spixi Session 7 Walk",
`docs/walk-artifact-session7-win-android.html`). No new feature in this session.

ORDER:
1. Precondition (below). Then ask Damir to paste the walk results + the logs (Windows `spixi-log-*.txt`, `Claude outputs/android-s7.txt`).
2. ONE DECISIONS row `WALK #N (6b + S7, Windows F5 + Android Release dev): n P · n F · n N/A` (PASS list, FAIL list with first reads, N/A).
3. A build error = the FIRST compile of the 6b + S7 C# (handoff §0 lists the files): mechanism first, fix it first.
4. Each F = mechanism first (skill `spixi-build-and-walk` step 5); each fix = a pin with a deliberate break; #46 over the fixes until CLEAN.
5. Data rows: #1201 A-FADE (`[P1] fade hold … hit=` + `open singlechatpage present ms`) · #1205 A-FLASH (logcat → H1 / H2 / H3) · #1194
   W-INFOCLOSE-REC · W-GROUPTILE ("missing encryption keys") · #1175 A-UNREAD · S7: `Voice: sent (inline|file)` + `Capability ask sent` lines.
   A refused OWN voice clip = the 20 ms TOC rule vs what Concentus emits (#1210 (11)) — read the logcat, then widen VoiceCodec's frame rule.
6. Ask Damir which #1210 residuals to fix now (clickable, ≤ 4 per call).
7. END: the patch + the PowerShell commands; a re-walk sheet (published artifact) with every FAIL + every data row that needs a second look.

## 0 · Rules and precondition
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 (#931) · PowerShell repo commands with every delivery ·
★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with" line in any commit message, commit-message file or PR text ·
verify every claim in the tree (#215) · mechanism first (#294) · C# touches no risky parts · bridge protocol frozen (new verbs = 🟡 + BE ask) ·
security handover gate · no Ixian-Core change. ★ MAC RE-SYNC: if Damir says he is on the Mac and pulled, give the CLAUDE.md re-sync steps FIRST.
Precondition (stop if it fails): the session-7 commit ("Session 7: voice messages and the capability ask") is in `git log` and HEAD =
origin/redesign/frontend; smoke BASELINE OK 5346 / the 2 KNOWN; `node scripts/run-csh.mjs` → CSH 190. The device shell kills a > 3 min smoke →
the cloud twin (clone + Ixian-Core @097341a + ONE `npm i --no-save jsdom eslint globals tree-sitter tree-sitter-c-sharp` + the .NET 10 SDK;
`apt-get update` first, then `apt-get install dotnet-sdk-10.0`). ONE full smoke at a time (L75), run detached (`setsid nohup`) — a background
job of a tool call dies with the call; single pin modules with a runner from the smoke prelude (lines 1–527) + the module; never edit the tree
while a full smoke runs. Deliver: the patch in the chat AND in Damir's PC folder `Claude outputs/`, with the PowerShell commands; on Windows
`git update-index --refresh` before `git apply --index`.

## Outcome (O)
For: Spixi users and Damir. After this session the 6b + S7 walk is recorded, the build compiles on every walked platform, and every FAIL is fixed
with a pin. We know it worked when: a WALK row · every F fixed (pin + deliberate break) · #46 CLEAN over the fixes · ONE full smoke · re-walk rows.

## Export (E)
DECISIONS rows · release-readiness · handoff · status log · CLAUDE.md "Where we are now" · lessons · `docs/commit-message-session7b.txt`
(no attribution) · next prompt = `docs/prompts/session-8.md` (already written; update its precondition numbers) · skill proposals.
