# Review brief — session 6 batch (the WALK #1172 fails + #1170 #1171 #1174 + Damir's #1175–#1178)

Repo (lead tree, uncommitted vs `00f292d6`): /home/claude/twin/Spixi · read-only copy for experiments: /home/claude/twin/wR/Spixi (mutate ONLY there).
Run one pin module: `node /home/claude/twin/tools/runpin.mjs <repoRoot> pins-s6/<mod>` (absolute root). NEVER run the full smoke.
Green: smoke BASELINE 5248 ✓ + the 2 KNOWN + 1 timing flake (#1147 (5), passes 3/3 alone) — 5224 + 25 new pins · CSH 113 (`node scripts/run-csh.mjs`, SDK 10.0.112) · every --check gate green. C# UNCOMPILED.

## What landed (git diff in the lead tree)
| Row | What | Files |
|---|---|---|
| #1180 W-VIEW | viewer: own opacity fade (in 200 decel / out 100 accel), its scrim closes at 100 ms, loading thumbnail (square crop) invisible → full picture fades in after load+decode, tap outside the picture closes | src/components/media-viewer.js, src/styles/components/media-viewer.css |
| #1181 A-FADE | dev-only [P1] probe lines on a preview tile's reveal (no fix: 2 fixes missed) | src/components/media-bubble.js (load handler) |
| #1170 | group head (name + avatar, D-19b ladder, W8 blind, #99 tap) on GIF / media / file / photo tiles; files never join runs (GATE 47 ③) | src/shells/chat.html (senderHeadOpts, tileHead), media-bubble.js setTileHead, media-bubble.css |
| #1174 | touch-press guard: a contextmenu after a move / cancel / scroll does nothing on touch | message-menu.js attachTouchPressGuard, shared-items.js, chats-row-menu.js |
| #1171 | hover carried across a row replace (data-hover), focus restored | chatlist-item.js, chats-shell.js, contacts-shell.js, wallet-shell.js, chatlist-item.css, txlist-item.css, contacts-shell.css |
| #1175 | defensive: the zeroed unread pushes the row at once (refreshChatRow) in loadMessages + updateMessagesReadStatus | SingleChatPage.xaml.cs |
| #1176 | Show in chat keeps the desktop BESIDE pane open (InfoPaneRules) | ContactDetails.xaml.cs, HomePage.xaml.cs, Utils/InfoPaneRules.cs |
| #1177 | addFile arg 15 "live:N"/"paused:N" for a known incoming transfer → progress tile ("Paused · N%"), never the offer | SingleChatPage.xaml.cs, Utils/FileRowRules.cs, chat.html fileStateFrom/markPausedTile, en-us.json + drafts |
| #1178 | file-offer notification copy: "Sent you a file/photo", group "<Member> sent a file/photo", "New file/photo" with sender names off; never the file name | Meta/Node.cs, Resources/Raw/lang/*.txt (13) |
| harness | csh targets the running SDK (net$(BundledNETCoreAppTargetFrameworkVersion)); run-csh names the SDK | scripts/csh/csh.csproj, scripts/run-csh.mjs |
| pins | scripts/pins-s6/{view,group,menu,hover,cs}.mjs + csh FileRowRulesTests / InfoPaneRulesTests + re-bases in smoke-test.mjs (addFile arg 15 ×3, showInChat ×2, KB ceilings 755/551) + pins-s4/chat.mjs R3-m1 timing (+2 frames) | |

## Must hold
- Chat stays in its own WebView; no new bridge verb; no spixi.* key; no HTML sink with peer data; no peer data in a log line (the [P1] grammar: fixed words + integers).
- C# touches no risky parts: no WebView path into a file op; C# names its own files.
- An OLDER shell ignores addFile arg 15; an older exe (14 args) renders exactly as before.
- Motion: close faster than open, no delayed close, motion tokens. Reduced motion = instant.
- D-19b ladder / W8 blind gate: a blind nameless member never shows an address, never taps.
- Nothing changes for 1:1 and sent tiles (no head).

## Accepted dials (do not re-open)
#1137–#1145 · #1160–#1167 · Core stays clean · the viewer token/verb design (#1166 V-3).

## Auditor scopes (disjoint)
1. C# correctness: SingleChatPage / ContactDetails / HomePage / Node.cs / Utils rules / lang files — compile-level (APIs, nullability, types), threading (UI thread vs background), lifetime, the iOS-31 literal-0 rule, the notification pref gating, all 13 locale key sets.
2. Shells + security + motion: media-viewer.js/css, media-bubble.js, chat.html (tileHead, markPausedTile, fileStateFrom), message-menu / shared-items / chats-row-menu, chatlist-item / chats-shell / contacts-shell / wallet-shell + css. Real-device behaviour (WebView2, Android WebView, iOS WKWebView): pointer capture, contextmenu order, hover, focus.
3. Tests: every pins-s6 module + csh tests + the re-bases: does each fail when its behaviour breaks? mutate in /home/claude/twin/wR/Spixi only (rebuild there: `node scripts/build-demo-bundle.mjs && node scripts/build-shells.mjs`); were re-based pins weakened? Budget: ≤ 12 mutations.

## 5 · Verdict — CLEAN at r3
| Round | Reader | MAJOR | MINOR | NIT |
|---|---|---|---|---|
| r1 | A1 C# | 0 | 3 | 3 |
| r1 | A2 shells / security / motion | 2 | 4 | 4 |
| r1 | A3 tests (7 mutations, 6 survivors) | 2 | 3 | 5 |
| r2 | fresh reader over the r1 fixes | 0 | 5 | 5 |
| r3 | fresh reader over the r2 fixes (read-only) | 0 | 1 | 3 |
- MAJORs (all fixed, `docs/review-r1-fixes-session6.md`): M1 the per-node press guard missed a row re-rendered mid-press → one document press record (L77) · M2 a double click opened and closed the viewer → no scrim light-dismiss, tap-close after 350 ms, never the 2nd press · T1 the wait-end path unpinned → view pin 1b · T2 the menu gesture tested a disjunction → split cases.
- r2 MINORs fixed: an ended press voids only 1 s (TalkBack) · the stage double press · Zl/Zp/Cf stripped from member nicks · lightDismiss + `.c-tile-col` width pinned. r3 MINOR fixed: `lastDownAt = openedAt`.
- Recorded, not fixed: iOS long press cancelled by a re-render during the hold (press again) · NIT 1:1 notification with an empty nickname · `getIncomingTransfer` Contains (safe direction) · tileHead builds a throwaway bubble per tile (perf NIT) · the timer-then-contextmenu double open across a replace (pre-existing NIT).
- Deliberate breaks: `docs/mutations-session6.md` + K1–K5, R1–R5 (all killed).
- Final: smoke BASELINE OK 5251 / the 2 KNOWN · CSH 114 · every --check gate green.

## 6 · Round 2 of the batch (Damir's 6a additions) — what landed after §5
| Row | What | Files |
|---|---|---|
| #1190 | #1173 (3)+(4): addFile arg 16 `fLocal` ("1"/"0"/""); my sent image whose file is gone → compact card "Not available on this device", no tap; a received file deleted from this device → italic "Photo/File deleted from this device", no tap; chat info drops it; live delete re-pushes the row; dev probe `[P1] filelocal sent-image <case>` | SingleChatPage addFile, SharedItems, FileRowRules (+csh), ContactDetails, chat.html file rows, typed-bubbles.js/.css, strings + drafts, pins-s6/rows.mjs |
| #1191 | #1173 (5): a member's new avatar reaches an OPEN group / bot chat in place (setAvatarFor, no re-render) | StreamProcessor avatar case, SingleChatPage.refreshMemberAvatar, chat.html setAvatarFor, pins-s6/live.mjs |
| #1192 | #1173 (6): the heart sits BESIDE the unread count (left of it) | chatlist-item.js createIndicators |
| #1193 | #1168 A: tokens --surface-scrim-strong 0.72 / --surface-wash-on-scrim-strong 0.28 on the sending card | tokens.css, media-bubble.css |
| #1194 | probe: `[P1] infopane close … from= tiles= previews=` | HomePage animateInfoColumn, ContactDetails p1NoteShared |
| #1195 | chat-info grid cap 9 in place (SHARED_INLINE_MAX), C# still 60 previews | shared-items.js, SharedItems.cs comment, pins-s6/probe.mjs |
Re-bases: smoke addFile args (16), inlineCap / sixtyInPlace / matchesInline (9), CHAT_KB_CEIL 760; pins-s6/cs pushLast; pins-s4/fix2 scrim + heart.
Green: CSH 116; all pins-s6 modules pass alone; full smoke after the loop.

## 7 · Verdict, round 2 — CLEAN at r5
| Round | Reader | MAJOR | MINOR | NIT |
|---|---|---|---|---|
| r4 | C# auditor | 1 | 3 | 5 |
| r4 | shells + tests auditor (6 mutations, 5 survivors) | 1 | 5 | 6 |
| r5 | fresh reader over the r4 fixes (read-only) | 0 | 1 | 4 |
- MAJORs fixed: M1 the chat-info delete re-pushed a row from OUTSIDE the chat's window (created as a new arrival + read side effects) → `refreshFileRow` re-pushes only a row the page holds, row push only (L79) · T1 the blind gate of the in-place avatar swap unpinned → blind / tile / size cases.
- MINORs fixed: per-row disk I/O on the UI thread (cache dir once, complete rows only) · probe counts what is shown (shown=, shownPreviews=) · accessible name / c-fbubble menu target / sent tick pinned · focus after a delete.
- Recorded: the Downloads-page delete + contact purge do not refresh an open chat (TODO #1190) · a delete during a load can repaint the stale row (r5 MINOR, 6b) · NITs: a failed batch keeps its ids · the set is not cleared with the per-document sets · a refresh hides the typing pill · probe fields not atomic as a group.
