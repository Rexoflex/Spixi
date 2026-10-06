# #46 round 1 → fixes (session 7). Tree after fixes: /home/claude/s7M2
Round 1: A (C#): 0 MAJOR · 8 MINOR · 10 NIT · B (shell/seam): 1 MAJOR · 11 MINOR · 7 NIT · C (tests/wire): 0 MAJOR · 5 MINOR · 7 NIT, 37 survivors.
Contract amendments: /tmp/claude-0/s7/CONTRACT.md §7.
| Finding | Verdict | Claimed fix (owner) |
|---|---|---|
| B MAJOR-1 / A M2: voice file stuck on loading | real | C#: startVoiceDownload + incomingTransferOf → error; onAcceptFile hidesParticipants (null botInfo); voiceAfterTransfer pending first; checkPendingVoicePlay (1 Hz) → stopped on gone/paused/15 s; call → stopped. Shell: offer/paused settle; re-tap after 2 s (B, C) |
| A M1 call race | real | interruptAll after session id; isInitiated re-check under gate (B) |
| A M3 hidden-page play | real | OnDisappearing clears pendingVoicePlay (B) |
| A M4 deep-read row | real | findChannelMessageByTransfer (B) |
| A M5 voice-file notification | real | Node.voiceFileNotificationText (lead) |
| A M6 recording tail | real | voice-mode flush in 4 recorders + flushGen (B) |
| A M7 / C-5 non-20 ms packets | real | VoiceCodec: one 20 ms frame per packet (inline + demux), durMs = packets×20 (A) |
| A M8 overlapping players | real | play() one gate section; run thread joins prev + gen check (B) |
| A N1 / C MINOR-1 stream chunk → voice | real | combined-text guard (A) |
| A N2 / C N4 bot-room excerpt | real | rendersAsVoice gate (A) + bot room shows firstLine (lead) |
| A N4 orphan .ogg / C N7 size | real | delete on early throw; refuse > MaxOggBytes → sendfail (B) |
| A N5 voiceInfo failure | real | error once; dropped job not marked (B) |
| A N6, N7, N8, N10 | recorded | not fixed (B report) |
| B m-2 loading exclusive | real | only playing/paused exclusive (C) + C# stops current on download (B) |
| B m-3 ghost bar | real | isLiveRecording check on main thread (B) |
| B m-4 reply/edit while recording | real | hidden in menu; swipe/hover/dbl no-op (C) |
| B m-5 wrong toasts | real | `sendfail` state + toast; denied wording (B, C) |
| B m-6 id length | real | parseMessageIdHex rule (B) |
| B m-7 play double tap | real | 400 ms guard (C) |
| B m-8 quote renderings | real | voiceQuoteText everywhere (C); "🎤"-only text mislabel recorded |
| B m-9 file transfer state | partly | upload loading look, gone/missing disabled; no Retry (no failed state in tree) (C) |
| B m-10 delete while playing | real | voiceRowDeleted → stopIfCurrent (B) |
| B m-11 focus carry | real | play button carried (C) |
| B m-12 duplicate after store | real | stored flag / sendPreparedStage (B) |
| B NITs | fixed | monotonic timer, Escape, {0} templates, motion token, positioned ancestor, demo, dead reset removed (C) |
| C MINOR-2 untested demux refusals | real | tests (A) |
| C MINOR-3 page gates unpinned (SCP1 security) | real | 9 new pins, 28 breaks killed (B) |
| C MINOR-4 TOC table | moot | 20 ms rule (A) |
| C N3 line 1 unchecked | real | line 1 must equal humanLine(durMs) (A) |
| C N5 voice excerpt over cap | real | ReplyQuote size rule (A) |
| C N1, N2, N6 | fixed | test renamed; belts kept (unreachable); shell pins hardened (A, C) |
| Survivors | killed except: c6 (payload bound, unreachable), c7a, n6k (no-throw belt), SH2 (first-line belt, no screen shows it) | |
# #46 round 2 → fixes (session 7). Tree after fixes: /home/claude/s7M3 (round 2 read /home/claude/s7M2)
Round 2 fresh reader: 1 MAJOR · 5 MINOR · 8 NIT. Report: the r2 reader's findings are listed below with the claimed fix.
| Finding | Claimed fix |
|---|---|
| MAJOR-1 replaced pending play silent → bubble stuck loading | C#: clearPendingVoicePlay(keepId) pushes 'stopped' for the old id (tap on another row, call, OnDisappearing, catch, startVoiceDownload); voiceAfterTransfer decides on the main thread: call or not shown → 'stopped'. Shell: completed + loading → 1.2 s grace → idle; a later voiceState wins |
| r1 A M3 follow-up (covered overlay) | isShownChat() (top overlay / chat-info pane / nav top) gates the auto-play |
| MINOR-1 recorder publish race | reserve gen → start → publish under gate with isInitiated + gen re-check; lost race disposes |
| MINOR-2 sendfail locks ✕/➤ 4 s | releaseComposerRecording on sendfail |
| MINOR-3 stale rec.paused | updateFile clears paused; settle only on a real offer/paused; in-place repaint |
| MINOR-4 completion race | 'gone' must be seen on two consecutive ticks |
| MINOR-5 orphans (stage 1, FileStream outside try) | sendPreparedFile null-guard → removeOutgoingTransfer + return null (FriendMessage?); withdrawVoiceFile deletes the .ogg + transfer; stream open inside try |
| NIT-1 same-row replay flicker | sameRow → no 'stopped' |
| NIT-2 loadingAt on re-push | every loading push restarts the 2 s window |
| NIT-3 network-thread join on delete; stop before a known transfer | stop on a pool thread; stop only once a transfer runs |
| NIT-4 micDenied after permanent denial | new wording (13 languages) |
| NIT-5 hard-coded parentheses (cn/ja full-width) | lang key chat-voice-message-length + VoiceCodec.lengthLabel (safe format, csh) in HomePage + Node |
| NIT-5b row size rule vs header | isVoiceFileRow reads the header size first (ReplyQuote rule) |
| NIT-6 silent tap on a valid id with no row | voiceState error |
| NIT-7 Escape cancels reply + recording | possible (kept clip restored with a reply strip open) → the strip's Escape steps aside while the bar is up |
| NIT-8 comment line | moved back |
| Re-base | pins-s4/chat.mjs #1147: `FriendMessage?` signature |

# #46 round 3 (fresh reader) → CLEAN (0 MAJOR); the lead's fixes
| Finding | Fix |
|---|---|
| MINOR-1 a downloaded clip auto-played with the app in the background | gate `backgrounded` (phones only, `#if ANDROID \|\| IOS`) |
| MINOR-2 a finished download cut a running recording | `VoiceClips.isRecording` in the gate |
| MINOR-3 a focus loss in the recorder start window | recorded (#1210 (1)) |
| NIT-1 comment · NIT-2 grace flicker · NIT-3 call-path join | fixed · accepted · recorded (#1210 (2)) |
| (smoke) #1065 Escape regex | re-based: + `!composerRec.has(el)` |

# #46 round 4 (break my verdict) → CLEAN (0 MAJOR)
| Finding | Fix |
|---|---|
| MINOR-A desktop: a window without focus is still on screen (#505) | the foreground term is phone-only |
| NIT-A misplaced doc comment · NIT-B gate→play race (ms) · NIT-C dead `startingGen` term on the main thread | fixed · accepted · comment says so |
