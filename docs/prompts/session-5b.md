Read CLAUDE.md, then docs/handoff-2026-10-04.md (FIRST), then DECISIONS #1155–#1163. Next free DECISIONS number: #1164.
This is SESSION 5 PART 2 (same scope as docs/prompts/session-5.md; part 1 = the P0 guard #1160 + the Windows white window #1161, #46 CLEAN #1162).
Already decided (do not re-open): everything in session-5.md "Already decided" · #1160–#1162 (the guard design, the Dispose rule, the [CRASH] line) · #1163 (#1102 → A: remove the implied read).
Open for the interview: handoff-2026-10-04.md §3 rows 2–13 (row 1 = #1102 is DECIDED, #1163). Voice (#1136) is SESSION 7 — do not design it here.

## 0 · Rules and precondition
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 (#931) · PowerShell repo commands with every delivery ·
★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with" line in any commit message,
commit-message file or PR text · verify every claim in the tree (#215) · mechanism first (#294) · C# touches no risky parts ·
bridge protocol frozen (new verbs = 🟡 + BE ask) · security handover gate · no Ixian-Core change.
★ MAC RE-SYNC: if I say I am on the Mac and pulled, give the CLAUDE.md re-sync steps FIRST.
Precondition (stop if it fails): the commit "Session 5 P0: no message lost on chat open; Windows white window" is in `git log` and
HEAD = origin/redesign/frontend; smoke BASELINE OK 5189 / the 2 KNOWN; `node scripts/run-csh.mjs` → CSH 93. If the device shell kills
the smoke (> 3 min), build the cloud twin (clone + Ixian-Core @097341a + `npm i --no-save jsdom eslint globals` + dotnet-sdk-8.0;
with SDK 10 also installed, put a global.json pinning 8.0.x ABOVE the repo).

## Step 1 · the walk (if Damir has walked; otherwise ask once, then go on to step 2)
Rows: handoff-2026-10-04.md §2 (V-0 ×5 + 1 new-app sender + speed, V-0b, the 4 #1152 rows). Record → a `WALK #N` DECISIONS row;
each F = mechanism first. V-0 Android lines: `adb logcat -v time` (UTF-16 → iconv); look for `[P0] reattach` / `[P0] write request
skipped`. V-0b: the `[CRASH] winui` line names the #1153 exception — if it is NOT the disposed WebView, a 2nd #1153 fix.

## Outcome (O)
For: Spixi users and Damir. After this session the open levers are decided on measured numbers, the rest of the speed work is built
(V-1, V-2), a media tile opens the in-app viewer with the chat-info menu rows (V-3, #1154) and a group cannot exceed Core's limit (V-4).
We know it worked when:
  - #1163 built FIRST (after the walk record, no "go" needed): ImpliedRead.cs + its StreamProcessor call + ImpliedReadTests.cs
    removed, its smoke pins retired / inverted (a pin that the call is gone, broken on purpose), a walk row.
  - Damir's picks for levers 4 · 7 · 8 · 9 · 12 · P-03 · P-04 · B4 are DECISIONS rows; the picked ones built with pins + walk rows.
  - V-2 lazy history B2 built (prepend only the older slice, `attachLazyHistory` as the trigger; walk rows #1142). ⚠ The #1160 guard
    lives in `loadMessages` (beforeReread · window growth for the same-second head · trim · afterReread): a load-more change keeps it.
  - V-3 media viewer: chat + chat-info tiles open `media-viewer.js` with a viewer-size image (🟡 verb + push, gate row, BE list) +
    the #1154 menu rows Delete from this device · Show in Downloads (🟡 verbs; C# resolves its own scan token, never a WebView path).
  - V-4 group cap (picker "n / 10" + the C# guard), a pin with a deliberate break.
  - T2 H-21 · H-2 · H-17 · H-9 answered as DECISIONS rows. #46 CLEAN before delivery.

## Reverse interview (R)
Before any build: handoff §3 in order, "is this worth doing at all?" first, three options where real alternatives exist
(AskUserQuestion, ≤ 4 per call). Do not start building until I say "go".

## Generate, then grade (G) · Export (E)
Skills: `spixi-finalization-checklists` §8 + §3 · `spixi-build-and-walk` · `adversarial-review-loop` (lessons L72: model the LOCK;
L73: test with the caller's REAL numbers) · `contract-first-parallel-build` for a multi-file build. Export: DECISIONS rows ·
release-readiness · handoff · status log · CLAUDE.md "Where we are now" · lessons · `docs/commit-message-session5b.txt` (no
attribution) · `docs/prompts/session-6.md` (S6 = the capability check + reply + edit, #1145) · skill proposals.
