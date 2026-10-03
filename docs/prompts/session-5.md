Read CLAUDE.md, then docs/handoff-2026-10-03.md (its "Update" part first), then DECISIONS #1132–#1149. Next free DECISIONS number: #1151.
Already decided (do not re-open): #1101–#1135 · the v1 scope + the FREEZE LINE (#1137, #1138, SCOPE CLOSED) · the session plan (#1145) · the [P1] stamp set stays until the levers are measured (#1127) · A7 BE only ·
A10 Spixi C# only · G-3 150 s · the A2 / A4 / A5 picks (#1132) · `setFileThumb` + `ixian:photoPreviews` as 🟡 with a BE ask (#1133).
Open for the interview: the walk result per lever (keep / discard) · levers 4 · 7 · 8 · 9 · 12 · P-03 · P-04 · B4 · the media-viewer design (#1145 (1)) · the T2 quick choices H-21 · H-2 · H-17 · H-9 (#1137). Voice (#1136) is SESSION 7 (#1145) — do not design it here.

## 0 · Rules and precondition
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 (#931) · PowerShell repo commands with every
delivery · ★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with" line in any commit
message, commit-message file or PR text · verify every claim in the tree (#215) · mechanism first (#294) · C# touches no
risky parts · bridge protocol frozen (new verbs = 🟡 + BE ask) · security handover gate · no Ixian-Core change.
★ MAC RE-SYNC: if I say I am on the Mac and pulled, give the CLAUDE.md re-sync steps FIRST.
Precondition (stop if it fails): the session-4 commit ("Session 4: P-1 levers, photo tiles, jump highlight, dark chat thumb")
is in `git log` and HEAD = origin/redesign/frontend; smoke BASELINE OK 5171 / the 2 KNOWN; `node scripts/run-csh.mjs` → CSH 72;
the session-4 walk is RECORDED (#1146), the fix-batch commit ("Session 4 fixes: jump highlight, photo tiles, phantom unreads, chips") is in `git log`, and its re-walk is RECORDED (a WALK row #1151) — start from it. If the
device shell kills the smoke (> 3 min), build the cloud twin (clone + Ixian-Core @097341a + `npm i --no-save jsdom eslint globals`
+ `apt-get install dotnet-sdk-8.0`).

## Outcome (O)
For: Spixi users and Damir. After this session every built lever is KEPT or DISCARDED on measured numbers, the rest of the
speed work is built (V-1, V-2), a media tile opens the in-app viewer (V-3) and a group cannot exceed Core's limit (V-4).
We know it worked when:
  - The walk is a DECISIONS row; each F has its mechanism first (`spixi-build-and-walk` step 5).
  - `docs/p1-measurement.md`: the §8 experiment log has one row per lever (median · p90 · keep / discard) from the session-4
    lines (a small parser, scratch) vs the session-3 table; P-1a closed with `why=vsc frames≥1` + a recording (G-1).
  - Damir's picks for the open levers as DECISIONS rows; the picked ones built with pins + walk rows; #46 CLEAN.
  - V-2 lazy history B2 built (prepend only the older slice, `attachLazyHistory` as the trigger; walk rows #1142); B4 tried as ONE lever.
  - V-3 the media viewer: chat + chat info tiles open `media-viewer.js` with a viewer-size image (🟡 verb + push, gate row, BE list).
  - V-4 the group cap (picker "n / 10" + the C# guard), a pin with a deliberate break.
  - The T2 quick choices H-21 · H-2 · H-17 · H-9 answered as DECISIONS rows.

## Scope
In: record the walk · the experiment log · keep / discard · levers 4 (one-tag probe of what runs after a SPARE present — the
88 ms gap is on the spare path only) · 6 = lazy history B2 (#1142, V-2) · 7 + 12 (renders `docs/sheets/session4/lever7-*`,
`lever12-*`) · 8 (info / app-details spares) · 9 (call bar) · P-03 · P-04 · B4 · the media viewer (V-3) · the group cap (V-4).
Out: everything for sessions 6–9 (#1145) · the parallel quality session (V-19).
Also out: retiring the [P1] set (strip #933) · Core · cold start (lead 8).

## Work items
1. Walk record → DECISIONS. Android lines arrive as `[WEBVIEW] warn [P1] …`; logcat is UTF-16 (iconv).
2. Experiment log: per lever the path it targets (lever 5 → quick re-opens; 3 → desktop switches; 2 → wallet re-visits; 11 →
   close; 10 → Account → tab visual; 1 → `why=vsc` + recording).
3. Recorded, not fixed in session 4 (§5 of `docs/review-brief-session-4.md`): R3-N2 · R3-N3 · R3-N4 (no "failed" for a SENT
   file — a BE question) · A-N4 · r5 NIT-1 — ask "worth doing?" for each.
4. (For SESSION 7 — keep here so it is not lost; do NOT ask in session 5.) Voice messages — the tree facts are in #1136:
   - Quality vs length: ≈ 36 s at 10 kbit/s inline, or ≈ 23 s at 16 kbit/s? (the cap must be on encoded BYTES)
   - The capability check: `getAppProtocols` / `appProtocols` travel ONLY when both peers are online (send-to-server off,
     `CoreStreamProcessor.cs:3103/:3116`) and Spixi answers nothing today — ask on chat open AND on presence; how long is an
     answer fresh; a stale answer → the file path?
   - The inline marker: a first text line an OLD app shows ("🎤 Voice message — update Spixi"), or hidden?
   - Lock-screen text: today the type only ("New Message"); is "🎤 Voice message (0:12)" OK there?
   - Playback: native (Concentus decode in the key-holding process, bounded) or WebView (needs Ogg/WebM Opus; WKWebView Ogg is
     uncertain)?
   - A new message type, or text with a marker? (the reply-quote "voice" kind exists, `message-bubble.js:111`)
   - BE: the push server size limit (≈ 52 KB → 75–80 KB POST) · one identity on several devices (per-device protocols?) ·
     bringing `appProtocols` into use + a reserved `spixi.` namespace · `maxChatMessageSize` on plain `chat` receive · do bots
     relay file data to offline members · an Ogg Opus muxer preference.

## Reverse interview (R)
Before any build: the experiment log → for each lever keep / discard → for each open lever and each voice item "is this worth
doing at all?" → three options where real alternatives exist → Damir picks. Do not start building until I say "go".

## Generate, then grade (G) · Export (E)
Skills: `spixi-finalization-checklists` §8 (experiment log) and §3 (motion — levers 7 / 12) · `spixi-build-and-walk` · the #46
loop (`adversarial-review-loop`; pin the CALLER, compute contrast — lessons L67–L69) · `contract-first-parallel-build` for a
multi-file build. Export: DECISIONS rows · release-readiness (P-1, P-1a, A5-1124, VOICE-1) · handoff · status log · CLAUDE.md
"Where we are now" · lessons · `docs/commit-message-session5.txt` (no attribution) · `docs/prompts/session-6.md` (S6 = the capability check + reply + edit, #1145) · skill proposals.
