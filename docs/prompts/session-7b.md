Read CLAUDE.md, then docs/handoff-2026-10-06.md (FIRST), then DECISIONS #1211–#1213 (walk #1211, Damir's notes, the A-FADE revert), #1207–#1210
(S7) and #1197–#1206 (6b), then docs/walk-findings-session7.md. Next free DECISIONS number: #1214.
This is SESSION 7b (a new chat): FIXES ONLY for walk #1211 (6b + S7 walked as one build). No new feature. The walk is already recorded (#1211).

ORDER:
1. Precondition (below). Ask Damir for the Windows log of walk #1211 (`Downloads\spixi-log-*.txt` → `Claude outputs\`) if it is not there.
2. THE 7b INTERVIEW, before any build (clickable questions, AskUserQuestion ≤ 4 per call; render options on the BUILT shell in BOTH themes and
   show them before asking — a render beats a description):
   a. #1212 (2) + (8) the reply / edit strip INSIDE the composer — 3 renders (the demo's look, WhatsApp-like, Telegram-like) with a TILE on the
      right for a GIF / photo / file target, a colour bar, the sender, good contrast and a clear ✕ (Damir: the WhatsApp / Telegram premium
      pattern; screenshots s7-walk-6 / -7); the same for Edit.
   b. #1212 (1) quotes: a thumbnail for a photo / image-file target and ALWAYS a sender line — in a 1:1 the name is drawn LOCALLY ("You" / the
      peer's shown name) and never put on the wire (#1198 privacy, L82); what to show when the target is not loaded (no thumbnail cached).
   c. #1212 (5) waveform (rounded, equal-width bars — renders) · #1212 (7) the hover reply button (subtle elevation — renders).
   d. #1212 (3) swipe: Back closes the reply / edit strip first (my take: yes) · #1212 (6) payment double-click (no double-click reply on cards
      with their own click, or a guard) · which #1210 residuals to fix now.
   Then build only after Damir says "go".
3. Mechanism first (#294, skill `spixi-build-and-walk` step 5) for the bugs: #1213 A-FADE (revert #1201 first: `holdOpenReveal`, its pins
   pins-s6b/fade + the pins-s4/fix3 re-base, the `[P1] fade hold` probe; then the fade itself from a recording + `[P1] fade flip / fade end` +
   `[CDPERF] chat held frames` of the SAME open — never delay the open) · #1212 (4) the unread badge under the top image bubble (screenshot
   `Claude outputs/s7-walk-1-unread-badge-on-image.png`) · #1212 (3) the swipe jump to the newest message · D1 (the phone's voice sends went as
   FILES: `android-s7.txt` has `Voice: sent (file)` ×2 and no inline — a group send, or the `spixi.voice.1` answer never stored? read the
   Windows log) · ★ FIRST: #1212 (10) the OFFLINE inline voice Windows → Android that never arrived (one tick; findings F10; the push size
   question of B-30) · #1212 (9) the chats-list excerpt "File" that is not the chat's newest bubble (screenshots s7-walk-8 / -9; findings F9).
4. Each fix = a pin with a deliberate break; #46 over the batch until CLEAN; ONE full smoke at the end.
5. END: the patch + the PowerShell commands + ONE walk sheet (published artifact) with the 7b rows + the re-walk rows (A-FADE, the #1212 items,
   A-FLASH data, A-VOICE-REC with the permission reset in Android settings first).

## 0 · Rules and precondition
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 (#931) · PowerShell repo commands with every delivery (run them in
the Spixi repo folder: `cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"` FIRST) ·
★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with" line in any commit message, commit-message file or PR text ·
verify every claim in the tree (#215) · mechanism first (#294) · C# touches no risky parts · bridge protocol frozen (new verbs = 🟡 + BE ask) ·
security handover gate · no Ixian-Core change. ★ MAC RE-SYNC: if Damir says he is on the Mac and pulled, give the CLAUDE.md re-sync steps FIRST.
Precondition (stop if it fails): the "Record walk #1211" commit is in `git log` and HEAD = origin/redesign/frontend; smoke BASELINE OK 5346 /
the 2 KNOWN; `node scripts/run-csh.mjs` → CSH 190. The device shell kills a > 3 min smoke → the cloud twin (clone + Ixian-Core @097341a + ONE
`npm i --no-save jsdom eslint globals tree-sitter tree-sitter-c-sharp` + `apt-get update` then `apt-get install dotnet-sdk-10.0`). ONE full smoke at a
time (L75), started DETACHED (`setsid nohup …; echo SMOKEDONE`), never edit the tree while it runs; single pin modules with a runner from the
smoke prelude (lines 1–527) + the module (absolute root); grep smoke-test.mjs for the tokens of every edited line before the merge smoke (L84).
Deliver: the patch in the chat AND in Damir's PC folder `Claude outputs/`; on Windows `git update-index --refresh` before `git apply --index`.

## Outcome (O)
For: Spixi users and Damir. After this session chats open without the 60 ms hold and photos fade in without a flash; replies and edits look
like a modern messenger (strip inside the composer, quotes with a thumbnail and the sender); swipe, Back and the unread badge behave; the
waveform and the hover button look finished. We know it worked when: every #1212 / #1213 item has a DECISIONS row (Damir's pick or a reason),
each fix has a pin + a deliberate break, #46 is CLEAN, ONE full smoke is green, and a walk sheet lists the re-walk rows.

## Generate, then grade (G) · Export (E)
Skills: `spixi-build-and-walk` · `spixi-finalization-checklists` §1 (a11y) + §3 (motion) + §8 (perf log) · `adversarial-review-loop` ·
`contract-first-parallel-build` when the work splits (own copy + scratch per agent, L74; fixes in a FRESH copy of the merged tree).
Export: DECISIONS rows · release-readiness · handoff · status log · CLAUDE.md "Where we are now" · lessons · `docs/commit-message-session7b.txt`
(no attribution) · the next prompt = `docs/prompts/session-8.md` (already written; update its precondition numbers) · skill proposals.
