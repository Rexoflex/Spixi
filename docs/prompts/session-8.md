Read CLAUDE.md, then the newest docs/handoff-*.md (FIRST), then the DECISIONS rows it names (and #1137 (5)–(7), #1138 (12) + (14), #1141,
#1145, #1204 for S8). Next free DECISIONS number: the number in CLAUDE.md.
This is SESSION 8 (a new chat): groups + emoji reactions + mini-app accept / decline + disappearing messages + privacy switches (#1145).

ORDER:
1. Precondition (below).
2. THE S8 INTERVIEW, then build only after Damir says "go". Ask "is each part worth doing in v1 as specified?" FIRST (#1143: if time is short,
   say which part moves out). Topics: (a) groups (#1137 (5), #1141 group cap, #1204 members above the media grid — render (a) vs (b) on the
   BUILT shell, both themes) · (b) emoji reactions (#1137 (6); reaction remove / change needs Core = v1.1) · (c) mini-app accept / decline (#1137 (7)) ·
   (d) disappearing messages (#1138 (12): per-chat timer off / 1 h / 1 day / 1 week as a readable system line new apps parse; local delete;
   honest UI text; `Friend.deleteMessage` blank rows and file messages) · (e) privacy switches (#1138 (14): read receipts off, typing off,
   "Hide my online status" as a courtesy flag in the capability answer — the S7 ask/answer, #1207; honest text; real hiding = v1.1).
   Clickable questions (AskUserQuestion, ≤ 4 per call), three options where real alternatives exist. Verify each tree fact before you ask (#215);
   read the OLD app's behaviour at its tag before you design a fallback (L80).
3. END: the patch + the PowerShell commands + ONE walk sheet (published artifact) with the S8 rows + the re-walk rows of the last walk.

## 0 · Rules and precondition
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 (#931) · PowerShell repo commands with every delivery ·
★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with" line in any commit message, commit-message file or PR text ·
verify every claim in the tree (#215) · mechanism first (#294) · C# touches no risky parts · bridge protocol frozen (new verbs = 🟡 + BE ask) ·
security handover gate · no Ixian-Core change. ★ MAC RE-SYNC: if Damir says he is on the Mac and pulled, give the CLAUDE.md re-sync steps FIRST.
Precondition (stop if it fails): the last session's commit is in `git log` and HEAD = origin/redesign/frontend; smoke BASELINE OK (the number in
CLAUDE.md) / the 2 KNOWN; `node scripts/run-csh.mjs` → the CSH number in CLAUDE.md. Cloud twin as in `docs/prompts/session-7b.md` §0.

## Outcome (O)
For: Spixi users and Damir. After this session a user can manage a group's look (members, cap), react with an emoji, accept or decline a
mini-app, set a disappearing timer per chat, and turn read receipts, typing and the online dot off — each with honest text about what old
apps and the network still see. We know it worked when: the interview is recorded as DECISIONS rows · after "go": S8 built per those rows
with 🟡 rows + gate rows for every new push / verb · #46 CLEAN before delivery · ONE full smoke · a walk sheet.

## Generate, then grade (G) · Export (E)
Skills: `spixi-build-and-walk` · `spixi-finalization-checklists` §3 + §4 + §8 · `adversarial-review-loop` · `contract-first-parallel-build` (own copy +
scratch per agent, L74; ONE full smoke at a time, L75; fixes in a FRESH copy of the merged tree; grep the inline smoke pins your change re-bases, L84).
Export: DECISIONS rows · release-readiness · handoff · status log · CLAUDE.md "Where we are now" · lessons · `docs/commit-message-session8.txt`
(no attribution) · `docs/prompts/session-9.md` (S9 = media picker + paste / multi-image / photo privacy + #1169 + #1179 (a) + #1173 (8) + audit
fixes + copy + language note + the a11y rows of #1206) · skill proposals.
