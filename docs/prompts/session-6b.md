Read CLAUDE.md, then docs/handoff-2026-10-04d.md (FIRST), then DECISIONS #1175–#1196 (and #1136, #1137 (3)/(4), #1145 for S6). Next free DECISIONS number: #1197.
This is SESSION 6b (a new chat; Damir walked 6a). It has two parts, in this order:

PART 1 — THE 6a WALK RECORD. I paste the walk-sheet results (`docs/walk-artifact-session6a-win-android.html` → Copy results), the two logs
(Windows `Claude outputs/spixi-log-*.txt`, Android `Claude outputs/android-s6a.txt`) and the recordings (A-FADE-REC, A-STUTTER-REC, W-INFOCLOSE-REC).
→ ONE DECISIONS row `WALK #N (6a, Windows F5 + Android Release dev): n P · n F · n N/A` (PASS list, FAIL list with first reads, unmarked rows).
→ Each F = mechanism first (skill `spixi-build-and-walk` step 5); each fix = a pin with a deliberate break.
→ The open mechanisms from the data rows: #1175 stuck unread (did going back clear it? the logcat), #1181 A-FADE (H1–H4 from the
  `[P1] fade` lines + the recording), #1187 Contacts → Message stutter, #1194 chat-info close flicker (`tiles= previews= shown=` + width vs push),
  #1190 (4) which case the `[P1] filelocal` lines show (cache-missing → the durable copy goes to S9 with #1158).
→ Known small items for this part (no "go" needed): #1190 the delete-during-load race (#46 r5 MINOR) · the Downloads-page delete and the contact
  purge refresh an open chat (TODO #1190) · #1191 BE ask (a plain group member's avatar is saved under the group).

PART 2 — THE S6 INTERVIEW (#1196: interview first; build ONLY after I say "go"). Topics: the capability check (`getAppProtocols` answer + ask,
#1136 facts: both peers online, nothing answers today) · reply-to (#1137 (3)) · edit (#1137 (4)). Start from my early answers in #1189 (answer now /
ask in S7 · reply from menu + swipe + hover + double-click · edit 24 h · ✏️ marker for an old app); first ask "is each item worth doing as
specified?"; verify in the tree what a LEGACY app does with a chatStream replace (same id) BEFORE asking about the old-app fallback. Clickable
questions (AskUserQuestion, ≤ 4 per call), three options where real alternatives exist.
Already decided (do not re-open): #1137–#1145 · #1160–#1167 · #1175–#1196 · Core stays clean (#1137) · voice + the capability ASK are S7.

## 0 · Rules and precondition
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 (#931) · PowerShell repo commands with every delivery ·
★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with" line in any commit message, commit-message file or PR text ·
verify every claim in the tree (#215) · mechanism first (#294) · C# touches no risky parts · bridge protocol frozen (new verbs = 🟡 + BE ask) ·
security handover gate · no Ixian-Core change. ★ MAC RE-SYNC: if I say I am on the Mac and pulled, give the CLAUDE.md re-sync steps FIRST.
Precondition (stop if it fails): the session-6a commit ("Session 6a: …") is in `git log` and HEAD = origin/redesign/frontend; smoke BASELINE OK
(the number in CLAUDE.md) / the 2 KNOWN; `node scripts/run-csh.mjs` → the CSH number in CLAUDE.md (the newest SDK). The device shell kills a > 3 min
smoke → the cloud twin (clone + Ixian-Core @097341a + ONE `npm i --no-save jsdom eslint globals tree-sitter tree-sitter-c-sharp` + the .NET 10
SDK). ONE full smoke at a time (L75); single pin modules with a runner that reuses the smoke prelude.

## Outcome (O)
For: Spixi users and Damir. After this session the 6a walk is recorded and its fails are fixed with pins; after "go", a reply and an edit work
between two new apps and an old app sees a readable fallback.
We know it worked when: a WALK row + every F fixed (pin + deliberate break) + re-walk rows · the S6 interview recorded as DECISIONS rows · after
"go": S6 built per those rows with 🟡 rows + gate rows for any new push · #46 CLEAN before delivery · ONE full smoke.

## Generate, then grade (G) · Export (E)
Skills: `spixi-build-and-walk` · `spixi-finalization-checklists` §3 + §4 + §8 · `adversarial-review-loop` · `contract-first-parallel-build` (own scratch
names per agent, L74; ONE full smoke at a time, L75). Export: DECISIONS rows · release-readiness · handoff · status log · CLAUDE.md "Where we are now" ·
lessons · `docs/commit-message-session6b.txt` (no attribution) · `docs/prompts/session-7.md` (S7 = voice + the capability ask, #1136) · skill proposals.
