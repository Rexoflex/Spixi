# Review brief — session 6b (S6: capability answer · reply · edit + the 6a walk fixes)

Repo (cloud twin, merged): `/home/claude/s6b/M` (base `0fe068e1`; `../Ixian-Core` = `097341a`, read-only). READ-ONLY for auditors.
Contract the three build agents followed: `/home/claude/s6b/CONTRACT.md` (wire formats, bridge, ownership).
Rows: DECISIONS #1197 capability answer · #1198 reply · #1199 edit · #1200 the 6a walk record · #1201 A-FADE (photos ready at open) ·
#1202 small fixes (dark Show-all hairline, light chat thumb, #1190 Downloads/purge refresh + the delete-during-load race) · #1203 tall
chat-info tile.

## 1 · What landed
| Area | Files |
|---|---|
| C# pure rules (csh) | `Spixi/Utils/{ReplyQuote,EditRules,SpixiProtocols}.cs` · `scripts/csh/{ReplyQuote,EditRules,SpixiProtocols}Tests.cs` · `csh.csproj` |
| C# wiring (UNCOMPILED) | `Spixi/Network/StreamProcessor.cs` (getAppProtocols answer; drop an edit of an unknown id) · `Spixi/Meta/Node.cs` (no alert for an update; lastMessage re-copy) · `Spixi/Pages/Chat/SingleChatPage.xaml.cs` (setCaps; reply compose; `ixian:chatedit:` · `ixian:quotejump:`; addMe/addThem 16 args, updateMessage 11; #1190 recheck) · `Spixi/Pages/Home/HomePage.xaml.cs` (excerpt strip; purge refresh) · `Spixi/Pages/Settings/SettingsPage.xaml.cs` + `Spixi/Utils/SContacts.cs` (#1190 TODOs) |
| Shells | `src/shells/chat.html` · `src/components/{message-menu,composer,message-bubble,media-bubble}.js` · `src/styles/components/{message-bubble,composer,shared-items}.css` · `src/styles/tokens.css` · `src/shells/contact_details.html` · strings `editingMessage`, `saveEdit` (+12 drafts), `replyUnavailable` retired |
| Tests | `scripts/pins-s6b/{cs,reply,edit,fade,small,lead}.mjs` · re-bases in `scripts/smoke-test.mjs` (marked `★ #1198/#1199 re-base`, `★ #1198 re-base`) · `scripts/pins-s4/{main,fix3}.mjs` (`★ #1202` / `★ #1201 re-base`) · KB ceilings CHAT 790 / INDEX 560 (stated) |

Run: `node scripts/smoke-test.mjs` (the lead runs it — auditors DO NOT run the full suite; use `node /home/claude/s6b/run-pin.mjs $PWD scripts/pins-s6b/<mod>.mjs` then `rm -f scripts/.run-pin-*.mjs`, and `PATH=$PATH:/usr/lib/dotnet node scripts/run-csh.mjs` for C#). For any mutation, copy the tree first (`cp -a /home/claude/s6b/M /home/claude/s6b/rv-<you>`), never mutate M.

## 2 · Scopes (disjoint)
- **A — C# (compile-read + Core semantics + threading + security):** every changed C# line read like a compiler (types, nullability, usings, overload resolution, access modifiers, `lock` order, MainThread rules); the Core rules it depends on (`FriendList.addMessageWithType` replace / local-sender / sender-match / not-found = ADD, `sendSpixiMessage`, `sendAppProtocols`, `getMessages(channel, n)` cache replace) checked at source; the edit can never alter a PEER's message or a file / payment row; the quote parse of a PEER's text cannot inject anything (name sanitized, no address); the getAppProtocols answer cannot be used as an amplifier or a fingerprint beyond contacts; the #1190 race fix; the ★ C# rules of `CLAUDE.md`.
- **B — shells (behaviour + security + a11y + motion):** reply starts (menu / swipe / hover / double-click) vs the back-swipe, scroll, selection mode, the #1174 press record, the #1184 hover carry; edit mode (draft, Escape, Save, refused edit); the quote fallback + `quotejump` (only C#'s hex reaches the verb); every new DOM sink (textContent only); the edited marker intake (absent vs empty args); the #1201 open hold (never > 60 ms, never blocks without tiles, the cap path keeps today's fade, warm / spare / channel-switch paths); the #1202 hairline + thumb; the #1203 tile; motion tokens (close faster than open), reduced motion, aria.
- **C — tests + the seam between C and the shells:** does each new pin fail when its behaviour breaks (derive your own breaks; budget 15 mutations); are the re-based pins weaker than before (diff each re-base against base); the ARG ORDER C# sends (addMe/addThem 16, updateMessage 11, setCaps) vs what chat.html reads, at EVERY C# call site (the shell assumes the FULL updateMessage form always — confirm C# never sends a short form that would drop a quote); the wire format (CONTRACT §1a) identical between `ReplyQuote.cs` compose and parse and the shell's glyph reading.

## 3 · Must hold
No Ixian-Core change · the bridge additions are ONLY CONTRACT §2 · Core stays clean · chat isolation (§1) · no WebView-supplied id or text reaches a filesystem op · an older shell ignores the new args, an older exe (13 / 7 args) renders as before · the 2 KNOWN smoke pre-existers only.

## 4 · Accepted dials (do not re-open)
Damir's picks #1189 + the 6b interview: plain replace for old apps (no ✏️) · edit 1:1 + private groups, not bot rooms · edit time = Core's edit time · reply to any message, everywhere · C# searches the full stored history (bounded 1000) · no Up-arrow edit · the A-FADE hold (cap 60 ms) · keep two viewers on desktop · the light thumb = chat info's.

## 5 · Verdict — CLEAN (r3 fresh reader 0 MAJOR; r4 reader over the r3 fixes 0 MAJOR)
| Round | Reader | MAJOR | MINOR | NIT |
|---|---|---|---|---|
| r1 | A C# · B shells · C tests + seam | 2 · 1 · 3 | 7 · 8 · 6 | 4 · 9 · 4 |
| r2 | fresh reader over the r1 fixes | 2 | 7 | 7 |
| r3 | fresh reader over the r2 fixes | 0 | 3 | 7 |
| r4 | reader over the r3 fixes | 0 | 1 | 3 |
MAJORs (mechanism → fix): r1 A-1 the reply match was quadratic and unbounded under the list lock (4 s bench) → memo + excerpt index + bounded
excerpt + deep read before the lock, off the UI / network thread (0 ms) · r1 A-2 the quote name carried my PRIVATE alias (`Friend.nickname`) →
no name in 1:1, room = declared nicks only · r1 B-1 the hover Reply button covered the Retry circle → none on a failed row · r1 C M-1 newest-wins
picked the wrong twin → a ranking + the sender's remembered target · r1 C M-2 an edit broke every reply to it → original time for matching,
the P2 box · r1 C M-3 an edited row moved on reopen → Damir P1 · r2-1 P1 read the ARRIVAL clock for received messages → a replace keeps Core's
`timestamp` · r2-2 a C#-refused edit lost the text → the pending-edit answer. Lessons L80–L82.
Recorded, not fixed: the peer-side ambiguity of identical excerpts (🟡 #1198) · an old-body status tick in the UI-thread hop between Save and the
replace push reads as a refusal (text kept, toast) · a 1:1 streaming contact shows "edited" · row role / name + DOM order of the reply button
(S9 a11y sweep) · the edit-strip grapheme cut has no own pin. Final: smoke **BASELINE OK 5302** / the 2 KNOWN · CSH **154** · gates green.
