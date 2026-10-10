Read CLAUDE.md, then the newest docs/handoff-*.md (FIRST — `docs/handoff-2026-10-10.md`), then DECISIONS #1296–#1312 and the
"Session 15" section of `docs/security-handover-gate.md`. Next free DECISIONS number: #1313.
This is SESSION 16 (a new chat): record the S15 + office walk, the fix round, the L8 unit (walletpass → SecureStorage), then the freeze steps.
Already decided (do not re-open): #1297 restore design (RestoreMoves, `own_avatar.jpg`) · #1300 sharedpref out of the backup, L8 = S16 own unit ·
#1301 the rise (200 ms decelerate, no fade, from the composer) · #1302 strip placeholders + Send gate · #1303 the 10 rows as built (O-11 always encode,
O-31 production only for a store build) · #1306 picks (dev switch stays until S15-WHITE closes; About bubble white; sync strip + hold taps after the walk).

## 0 · Rules and precondition
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 (#931) · PowerShell copy-paste blocks with every delivery ·
★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with" line in any commit message, commit-message file or PR text ·
verify every claim in the tree (#215) · mechanism first (#294) · C# touches no risky parts · bridge protocol frozen — ★ #1312: our-code changes are built behind a FLAG (old path kept), a security-only #46 at high effort, a review packet + 🟡 gate row each; BE reviews in ONE sitting at handover; Ixian-Core stays BE-only ·
security handover gate · no Ixian-Core change · never commit or push from the cloud (Damir applies the patch). ★ MAC RE-SYNC: if Damir says he is on the
Mac and pulled, give the CLAUDE.md re-sync steps FIRST.
Precondition (stop if it fails): `git log` has "Session 15: restore all-or-nothing, security rows, send rise, photo strip, backup prefs" on top of
"Session 14: …", HEAD = origin/redesign/frontend, and Damir ran the O-27 `git rm --cached` (handoff §3); smoke BASELINE OK 5730 / the 2 KNOWN
(#136 · B3); `node scripts/run-csh.mjs` → CSH pass=378 fail=0. Cloud twin: tar of the PC tree + Ixian-Core @097341a (sibling) + ONE
`npm i --no-save jsdom eslint globals tree-sitter tree-sitter-c-sharp` + `apt-get update` then `apt-get install -y dotnet-sdk-10.0` (+ ffmpeg, numpy).
ONE full smoke at a time, DETACHED with `setsid`, ended with `echo SMOKEDONE rc=$?`; never edit the tree while it runs; no other agent may run node
during the full smoke (S15: two timing flakes under load — gate 54, the d-backup-about boot). A single-module runner = the smoke prelude (lines 1 … before
`console.log('app-frame.html')`) + an import loop over `MODS`, written INSIDE `scripts/`, deleted before the patch (S15 used `scripts/_s15run.mjs`).
⚠ After a context reset: read the twin's `git log --oneline` and the scratch folder BEFORE acting (L125).

## Outcome (O)
For: Damir (freeze) and the Spixi user.
After this session: the office walk + the S15 rows are recorded, every fail has a mechanism and a fix, walletpass no longer lives in plaintext
Preferences, and the freeze checklist has only Damir's sign-off rows left.
We know it worked when:
  - WALK row for the office walk (iPhone + Mac) and the S15 rows (A / W) → `docs/office-walk-sheet-v1.md` filled  (DoD V rows, G-1)
  - S15-RESTORE, S15-STRIP, S15-RISE pass on Android (first compile of the S15 C#)  (#1297 / #1301 / #1302)
  - S15-WHITE: the A/B result names the container mode (or "not reproduced" ×3) → close or fix  (#1305)
  - S15-PSS: the action behind the > 600 MB peak is named  (#1295 / #1305)
  - L8: walletpass in SecureStorage with verify-then-remove migration, the retry screen on a lost key, pins + csh + a 4-platform walk row, BE sign-off asked  (B-5, #1300)

## Work items
1. Android + Windows are RECORDED (#1309). Record the iPhone + Mac walk (built from the tag `s15-walk`; §0–§4 + the I / M legs of §5). Each F → mechanism first.
   Merge the perf research's ranked list (`claude/session-16-perf-prompt.md`, #1310) with this session's items — Damir picks; optimization = one kind of change per batch.
   #1311: (a) the wrong theme on "System" (Android) — mechanism from a log first · (b) RESTORE-B copy / flow ("use a different wallet") · (c) the unfinished-sent-file re-arm once per transfer id.
2. The L8 unit (#1300 / #909 plan in `docs/security-review-for-be-engineer.md` §A1): SecureStorage is ASYNC and `Node.loadWallet` reads walletpass at
   cold start (App.xaml.cs:362-383) — design the read path first (interview); write → read back → compare → only then remove; a missing / unreadable
   key = `LaunchPage("retry")`, never a plaintext fallback; iOS Keychain survives an uninstall (stale value on reinstall); Android Keystore is lost on a
   new phone (the retry screen, #1300 already sends the user there); Windows unpackaged SecureStorage unverified → measure. Every write site:
   LaunchPage (create, restore, proceed), SettingsPage change-password, EncryptionPassword, BackupPage read. Own #46.
3. After the walk (Damir picked): the wallet sync strip (#1304, one string, from `setScanProgress`) · the hold-tap fall-through (#1294 (c)).
4. BE asks out: #1304 (baked height / fast sync / pause), #1298, #1302 `pending`, the S14 verbs.
5. Freeze prep: C-1 (`maxLogCount = 1` + marker), the C-2 retire set, the container dev switch (only if S15-WHITE closed), G-1 / G-1t.

## Reverse interview (R)
Before any build: read the code the scope touches. Ask "is this worth doing at all?" for every item not in "Already decided", then clickable
questions, a few per round. Do not start until Damir says "go".

## Generate, then grade (G)
Real design choices: three options, renders on the BUILT shell, both themes. Code: every gate in docs/process.md §G2; pins that pass the
deliberate-break test; smoke BASELINE OK / the 2 KNOWN. Review: docs/review-brief-s16.md; Opus #46 loop until CLEAN, BEFORE delivery.

## Export (E)
DECISIONS rows · docs/release-readiness.md rows · walk sheet · handoff · one status-log entry · CLAUDE.md "Where we are now" replaced · lessons ·
docs/commit-message-session16.txt (no attribution) · docs/prompts/session-17.md · skill proposals. Next walk log name: `android-s16.txt`.
