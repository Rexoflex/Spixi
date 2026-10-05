Read CLAUDE.md, then docs/handoff-2026-10-05.md (FIRST), then DECISIONS #1197–#1206 (and #1136, #1138 (11), #1143, #1145 for S7). Next free DECISIONS number: #1207.
This is SESSION 7 (a new chat). Damir walks 6b IN PARALLEL (sheet "Spixi Session 6b Walk", `docs/walk-artifact-session6b-win-android.html`).

ORDER:
1. FIRST: PART 2 — THE S7 INTERVIEW, then build only after Damir says "go".
2. When Damir pastes the 6b walk results: PART 1 — the 6b walk record + its fixes, in the SAME patch as S7.
3. END: ONE walk sheet (published artifact): the S7 rows + the 6b re-walk rows (every 6b FAIL and every data row that needs a second look).

PART 2 — THE S7 INTERVIEW (#1145: S7 = voice + the capability ASK). Topics: (a) the capability ASK + cache (#1136: `sendGetAppProtocols`
needs both peers online; when to ask — chat open / first message / presence change; how long an answer lives; a stale "yes" after a downgrade,
a restore or a second device → the voice fallback must still be readable) · (b) voice (#1136, #1138 (11)): a confirmed new app (1:1) gets ≤ ~30 s
Opus inline (marker + duration + base64 under 64 000 chars, arrives offline); an old / unknown app and every group get the recording as an audio
FILE (no Ogg muxer in the tree — decide the container); the mic slot (#64) ON; the notification + list excerpt "🎤 Voice message (0:12)"; record /
cancel / send UX on phone + desktop; playback (WKWebView Ogg); the in-process decode bounds; the size budget (≈ 36 s at 10 kbit/s). If time is
short, voice moves out first (#1143) — ask "is voice worth doing in v1 as specified?" FIRST. Clickable questions (AskUserQuestion, ≤ 4 per call),
three options where real alternatives exist. Verify each tree fact before you ask (#215).
Already decided (do not re-open): #1137–#1145 · #1160–#1167 · #1175–#1206 · Core stays clean (#1137) · S6 picks (#1197–#1199: plain replace for
old apps, edit 1:1 + private groups, original time, reply to any message everywhere, no-match = box without jump, no Up-arrow).

PART 1 — THE 6b WALK RECORD (when Damir pastes it): ONE DECISIONS row `WALK #N (6b, Windows F5 + Android Release dev): n P · n F · n N/A`.
A build error = the first compile of the 6b C# (handoff §0 lists the files): mechanism first, fix it in this patch. Each F = mechanism first
(skill `spixi-build-and-walk` step 5); each fix = a pin with a deliberate break. Open data rows: #1201 A-FADE (`[P1] fade hold … hit=` + `open
singlechatpage present ms` — the hold must not slow the open) · #1205 the reopen flash (logcat after a repeat → H1 renderer reclaimed / H2 full
re-push / H3 the lock page) · #1194 chat-info close flicker · W-GROUPTILE ("missing encryption keys" for two members) · #1175 unread.
Known small items (no "go" needed): the 🟡 rows of 6b that the walk confirms (B-29 BE ask) · #1204 members above the grid stays S8.

## 0 · Rules and precondition
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 (#931) · PowerShell repo commands with every delivery ·
★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with" line in any commit message, commit-message file or PR text ·
verify every claim in the tree (#215) · mechanism first (#294) · C# touches no risky parts · bridge protocol frozen (new verbs = 🟡 + BE ask) ·
security handover gate · no Ixian-Core change. ★ MAC RE-SYNC: if Damir says he is on the Mac and pulled, give the CLAUDE.md re-sync steps FIRST.
Precondition (stop if it fails): the session-6b commit ("Session 6b: …") is in `git log` and HEAD = origin/redesign/frontend; smoke BASELINE OK
(the number in CLAUDE.md) / the 2 KNOWN; `node scripts/run-csh.mjs` → the CSH number in CLAUDE.md. The device shell kills a > 3 min smoke → the
cloud twin (clone + Ixian-Core @097341a + ONE `npm i --no-save jsdom eslint globals tree-sitter tree-sitter-c-sharp` + the .NET 10 SDK; Ubuntu apt
has dotnet-sdk-10.0). ONE full smoke at a time (L75); single pin modules with a runner that reuses the smoke prelude (lines before the first
`{` block after line 400). Deliver: the patch in the chat AND in Damir's PC folder `Claude outputs/` (when his computer is on), with the
PowerShell commands; on Windows `git update-index --refresh` before `git apply --index`.

## Outcome (O)
For: Spixi users and Damir. After this session the 6b walk is recorded and its fails are fixed with pins; after "go", a new app asks its contacts
what they support, and (if voice stays in v1) a voice message plays between two new apps while an old app gets a playable file.
We know it worked when: a WALK row + every F fixed (pin + deliberate break) + re-walk rows · the S7 interview recorded as DECISIONS rows · after
"go": S7 built per those rows with 🟡 rows + gate rows for every new push / verb · #46 CLEAN before delivery · ONE full smoke.

## Generate, then grade (G) · Export (E)
Skills: `spixi-build-and-walk` · `spixi-finalization-checklists` §3 + §4 + §8 · `adversarial-review-loop` · `contract-first-parallel-build` (own copy +
scratch per agent, L74; ONE full smoke at a time, L75; fixes in a FRESH copy of the merged tree). Export: DECISIONS rows · release-readiness ·
handoff · status log · CLAUDE.md "Where we are now" · lessons · `docs/commit-message-session7.txt` (no attribution) · `docs/prompts/session-8.md`
(S8 = groups + reactions + mini-app accept + disappearing + privacy, #1145; + #1204) · skill proposals.
