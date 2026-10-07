Read CLAUDE.md, then the newest docs/handoff-*.md (FIRST), then the DECISIONS rows it names (and #1137 (9) (10), #1138 (16), #1139, #1143,
#1156, #1157, #1158, #1169, #1173 (8), #1179 (a), #1200, #1206 for S9). Next free DECISIONS number: the number in CLAUDE.md.
This is SESSION 9 (a new chat): FIRST the S8 walk record + the mailbox probe data; THEN the media picker family + the audit fixes + copy + the
language note (#1145 (2) S9).

ORDER:
1. Precondition (below). If Damir has NOT applied / committed the S8 patch yet: give him the apply + commit commands first (handoff §0).
2. S8 WALK RECORD: Damir pastes the "Spixi Session 8 Walk" results → a `WALK #N: n P · n F · n N/A` DECISIONS row; each F = mechanism
   first (read the logs before a fix). Then the open S8 dials, as clickable questions: the reaction DISPLAY allow-list (#1232 🟡) · the light
   sent-wave trade-off (#1240) · no "{n} s left" hint at 320 px (#1239).
3. MAILBOX: read `android-s8.txt` — the `[P1] push fetch got= new= rep= reid= fix= ran= codes=` lines after a long offline period. rep > 0
   on every pass = the server re-served the same entry (remove.php failed) · reid = a sender pushed again · ran=0 got=0 repeating = an empty entry
   stuck first. Write the BE row CORE-10 with the numbers (draft in #1229). Fixes stay Core / BE.
4. THE S9 INTERVIEW (ask "is each part worth doing in v1 as specified?" FIRST; #1143: if time is short, say which part moves out), then build
   only after "go". Topics: (a) V-14 media picker — the attach sheet's Photo tile ON, system picker (one or more), optional camera, photos:
   C# strips EXIF / location, resizes (max edge ~2048, bounded decode A-11), JPEG ~80 %, C# names its own temp file; videos = a normal file under
   the A-9 cap + a short location warning (#1138 (16)) · (b) V-14b paste image (#1156) · (c) V-14c multi-image send + the receiver grid (#1157) ·
   (d) V-14d photo privacy (#1158) · (e) #1200 my sent originals `missing` on Android (mechanism first) · (f) #1169 · #1179 (a) · #1173 (8)
   (read each row; verify in the tree) · (g) V-15 audit fixes (#1137 (9): C-01 · C-02 · C-03 · C-04 (mini-app download: await, timeout,
   stream with a cap, GUID temp names) · C-05 per-row check · H-3 + H-13 · H-14 · A-13 · A-6 · A-7 · A-8 · A-9 · A-10 · A-11 · A-14 · A-19)
   · (h) V-16 onboarding copy (#1139) · (i) V-17 the language-picker note + "Report a translation problem" (#1143) · (j) V-18 polish picks
   H-15 / H-16 item by item (build or v1.1) · (k) the a11y rows of #1206.
   Clickable questions (AskUserQuestion, ≤ 4 per call), three options where real alternatives exist; renders on the BUILT shell, both themes,
   for every visual dial. Verify each tree fact before you ask (#215); read the OLD app's behaviour at its tag before a fallback (L80).
5. END: the patch + the PowerShell commands + ONE walk sheet (published artifact) with the S9 rows + the re-walk rows (the S8 fails, 7B-REC,
   A-FLASH if Damir wants it).

## 0 · Rules and precondition
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 (#931) · PowerShell repo commands with every delivery ·
★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with" line in any commit message, commit-message file or PR text ·
verify every claim in the tree (#215) · mechanism first (#294) · C# touches no risky parts · bridge protocol frozen (new verbs = 🟡 + BE ask) ·
security handover gate · no Ixian-Core change. ★ MAC RE-SYNC: if Damir says he is on the Mac and pulled, give the CLAUDE.md re-sync steps FIRST.
Precondition (stop if it fails): the S8 commit ("Session 8: groups, reactions, mini-app decline, privacy, voice picks") is in `git log` and
HEAD = origin/redesign/frontend; smoke BASELINE OK (the number in CLAUDE.md) / the 2 KNOWN; `node scripts/run-csh.mjs` → the CSH number in
CLAUDE.md. The device shell kills a > 3 min smoke → the cloud twin (clone + Ixian-Core @097341a + ONE `npm i --no-save jsdom eslint globals
tree-sitter tree-sitter-c-sharp` + `apt-get update` then `apt-get install dotnet-sdk-10.0`). ONE full smoke at a time (L75), DETACHED, ended
with `echo SMOKEDONE rc=$?` (L95); never edit the tree while it runs; never `pkill -f` a pattern your own command contains (L94).

## Outcome (O)
For: Spixi users and Damir. After this session a user can pick photos (one or many) and the camera, paste an image on desktop, and send
photos without location data; the audit fixes and copy rows are closed. We know it worked when: the S8 walk is recorded (WALK row) and
CORE-10 carries the probe numbers · the interview is recorded as DECISIONS rows · after "go": S9 built per those rows with 🟡 rows + gate rows
for every new push / verb · #46 CLEAN before delivery · ONE full smoke · a walk sheet (DoD V-14, V-14b, V-14c, V-14d, V-15, V-16, V-17, V-18).

## Generate, then grade (G) · Export (E)
Skills: `spixi-build-and-walk` · `spixi-finalization-checklists` §3 + §4 + §8 · `adversarial-review-loop` (a stub in the REAL namespace, L89;
registration lines at top level, L90; a CSS pin reads the LAST declaration, L92; diff an auditor's copy before fixing its MAJOR, L93) ·
`contract-first-parallel-build` (own copy + scratch per agent, L74; ONE full smoke at a time, L75; grep the inline smoke pins your change re-bases, L84).
Export: DECISIONS rows · release-readiness · handoff · status log · CLAUDE.md "Where we are now" · lessons · `docs/commit-message-session9.txt`
(no attribution) · `docs/prompts/session-10.md` (S10 = the walk + fix round → FREEZE prep) · skill proposals.
