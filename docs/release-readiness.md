# Release readiness — the v1 definition of done

Rewritten 2026-10-01 (session 0, DECISIONS #1098; format graded in `docs/workflow-reset-grading.md`). Rows were
re-verified in the tree at HEAD "Mac re-sync reminder after the history rewrite"; every `file:line` cite on this page
was re-read against its target on 2026-10-01 (review r1-B and its fixer pass). The evidence column says where.
The previous text (2026-09-06/07 + addendum) is in git history; its closed rows are listed in §J.

**Rules of this page.** v1 is done when every row below is DONE or explicitly OUT (§I). A row without a check is not
allowed: each row names a walk row, a pin, a measurement, a sign-off, a doc check or a decision row. Row IDs are
stable (they never change when a row moves stage); handoffs, prompts and walk sheets cite them. Update the State and
Evidence cells in the session that changes them. States: **DONE · OPEN · PARTLY · UNKNOWN** (UNKNOWN names the one
check that decides it). Owners: **us** (an AI session) · **Damir** · **BE** (the BE engineer) · **counsel** · **Apple**.

**Scope rulings this page relies on (Damir, 2026-10-01):** the session-1 features are v1, before the freeze (#1098) ·
the Mac (Catalyst) ships in v1 (#1098) · v1 criteria from the pre-launch audit = the audit's "before any external build"
list (S-02, S-03, S-04, S-06, S-07, U-02; `prelaunch-audit-handoff.md:275`) + P-01 (named in Damir's interview) (#1098);
the other open audit rows are T1 rows (S-01 = B-18, C-06 = B-17), the G-3c seed R-02, or T2 decisions (H-15, H-22) · the endgame order is #971 + #937 (#1099) · the freeze tag is
`freeze-v1` (`audit-baseline` is the 2026-07-12 tag, #1099).

**Smoke of record:** `BASELINE OK — 5089 / the 2 KNOWN (#136 · B3)` WITH the Ixian-Core sibling @`097341a` (session 2,
#1122; 5075 after session 1, 5049 at #1095). **C# harness of record:** `node scripts/run-csh.mjs` → `CSH pass=26 fail=0` (#1122). The locked count (S6) is the with-sibling number.

---

## The path (stages in order — the spine of this page)

| Stage | Exit = all rows of the stage DONE | Rows |
|---|---|---|
| S1 | Session 1: carry-over + presence/read + shared items + Downloads, walked on Windows + Android | F-0b-a · F-0b-b · F-0b-d · F-1 · F-1b · F-2 · F-3 · F-4 · F-5a · F-5b · F-5c · F-5d · F-5-SEC · F-5b-a…e · F-6 |
| S2 | The office walk (Mac + iPhone) + its fix round; first iOS/Mac compile of #1086–#1095 | E-OW · D-9 · D-3 · E-M2 · E-I3 · E-I4 · E-I5 · E-I6 · E-I7 · E-A3 |
| S3 | Pre-freeze fixes: L6, the audit's "before any external build" items + P-01, the Mac WebView handler, the owed security device tests, the memory runs | A-13 · A-6 · A-7 · A-8 · A-9 · A-10 · A-11 · A-19 · A-14 · A-4 · D-4 · D-5 · A-18 · A-17 · A-1 · A-2 |
| V | The v1 build list (#1137 / #1138), sessions 5–9 in the #1145 order; then one walk + fix round → the FREEZE LINE | V-1 … V-19 |
| S4 | Read-only sweep phases 1–2 (`docs/audit-refactor-plan.md`) | G-3a · G-3b |
| S5 | Damir picks: inventory + stop rule; the open decisions that block the freeze | G-3c · G-3e |
| S6 | Freeze + `freeze-v1` tag | C-1 · C-2a · C-2b · C-2e · C-2f · C-2g · C-2h · C-2j · C-2k · H-10 · G-1 · G-1t |
| S7 | Characterization tests (phase 5) | G-3d |
| S8 | Refactor picks, one at a time | G-4 |
| S9 | The strip (#933) | G-5 · A-5.O-27 |
| S10 | Security gate re-run + the BE pack | G-6 · A-5 · A-5.O-08 · A-5.O-09 · A-5.O-11 · A-5.O-34/35 · A-5.O-32 · A-16 · A-3 · G-7 · G-7b · B-2 |
| S11 | Merge | G-8 | The Windows call-card corner | — | Damir | CLOSED — left as is (#1117: "the dark corner is ok") | #1117 |
| S12 | Release builds, store, TestFlight; the per-platform release-candidate walks | C-4 · E-W · E-A · E-I · E-M · E-W2 · E-A2 · E-I2 · E-M3 · E-M4 · E-RV · H-1 · A-15 · G-9a · G-9b · G-9c · G-9d · G-9e · G-9f · G-9g |
| T1 | Parallel: the BE engineer's rows (each says the stage it blocks) | B-1 · B-3 … B-9 · B-11 … B-22 · B-24 · B-25 · B-26 |
| T2 | Parallel: Damir's decisions (each says the stage it blocks) | H-2 … H-6 · H-8 · H-9 · H-11 … H-24 |

---

## S1 · Session 1 (`docs/prompts/session-1.md`)

Prompt part 0b(c) = the office walk = S2 (E-OW); it is not an S1 row.

| ID | Criterion — passes when … | Check | Owner | State | Evidence |
|---|---|---|---|---|---|
| F-0b-a | Android full ⇄ card ×3 is not "clunky": `[CALLSWAP]` bar reveal below today's 223–240 ms (target set in its DECISIONS row) and Damir's walk row passes | measurement + walk row | us → Damir | BUILT — probe + bar fade dropped on phones; 🟡 Android walk (paste [CALLSWAP]) | #1101; `CallPage.xaml.cs` showStage/revealSnaps/probeSwap |
| F-0b-b | Chat-open blank frames: Damir's decision recorded (GPU/memory cost of a drawn spare checked first); if built, a recording shows no blank frame on a row tap and a FAB open | decision row → walk row | Damir → us | FAILED at walk #1115 (worse: ≈35–40 ms blank) → fix in session 2 (hold the list, #1116) | #1101; `SpixiContentPage.cs` warmSpareChat/revealStage |
| F-0b-d | The three recorded Windows dials are ruled: compact ring hides the e2e chip · dim tap does not close the decline sheet · 4 px corner ground | decision row | Damir | DECIDED (#1101): e2e chip back + dim tap closes the sheet BUILT; corner colour = Damir's screenshot at the walk | #1101 |
| F-1 | Implied read (1:1): a `msgRead` for own message X marks every earlier own message in that chat + channel read, persists, pushes ONE batch; groups untouched (#658); a message with no later receipt stays "delivered"; executed pins pass the deliberate-break test; walk row with a legacy peer passes | pin + walk row | us → Damir | BUILT — MSTest 9 cases (cloud harness 9/9, 8/8 mutations killed); 🟡 MSTest on the PC + walk with a legacy peer | #1102; `Utils/ImpliedRead.cs`, `StreamProcessor.cs` msgRead |
| F-1b | Opening a chat sends a receipt for every unread message; the `lastMessage` pre-mark does not swallow its receipt | pin + walk row | us | DONE — the claim was wrong (#1101); pinned, no code change | #1101 pin F-1b |
| F-2 | "Online" only within ~2 min of `lastSeenTime` (value + ±2 min accuracy in DECISIONS); C# pushes last-seen (an older shell ignores it); header + chat info show a localized relative "last seen …"; both themes rendered; strings in all locales | pin + render + walk row | us | FAILED at walk #1115 (ONLINE + LAST) → session 2: per-contact probe + saved sighting (#1116) | #1103, #1109; `Utils/PresenceDisplay.cs` |
| F-3 | The "going offline" BE ask is a be-cutover row with a security-review F4 cross-reference (the build is v1.1, I-16) | doc check | us | DONE — be-cutover row PRESENCE-OFFLINE + security-review F4 update | #1104 |
| F-4 | "Hide online status" is a deferred DECISIONS row with its reason | decision row | us | DONE — deferred row | #1105 |
| F-5a | C# enumerates history off the UI thread, newest first, capped ~200: links / files / media; deleted/empty rows skipped | pin | us | BUILT — disk scan ≤ 200 items, off the UI thread, bots excluded | #1106; `Utils/SharedItems.cs` |
| F-5b | One push contract (`clearSharedItems` + `addSharedItem` + done); thumbs as data URIs only; recorded in ARCHITECTURE §4 | pin + doc check | us | BUILT — ONE push `setSharedItems(json)` (not clear+add+done: one eval); ARCHITECTURE §4; 🟡 BE approval (B-25) | #1106 |
| F-5c | Chat info preview per kind + "See all" with Media · Files · Links (desktop pane + mobile takeover); empty kinds hidden; both themes rendered | render + walk row | us → Damir | BUILT — "cards" picked from three renders (#1110); 🟡 walk | #1110 |
| F-5d | Tap: link → link-confirm; downloaded file → open verb; else jump to the message | walk row | Damir | BUILT — 🟡 walk | #1106; `ContactDetails` ixian:sharedOpen |
| F-5-SEC | The WebView sends back only a message id; links show address + domain, no preview fetch; no URL/name/address logged; a security-gate section exists | pin + gate section | us | BUILT — gate section "Session 1"; pins | `security-handover-gate.md` § Session 1 |
| F-5b-a…e | Downloads: newest first · size per row · sort date/name/size · "from <contact>" + filter (never guessed) · "Show in chat"; `resolveDownloadPath` kept, the WebView sends a name/id only | pin + walk row | us → Damir | BUILT — (a)(b)(d)(e); (c) sort DROPPED by Damir (#1111); sender filter = one From chip + sheet; 🟡 walk | #1107, #1111 |
| F-6 | Opus #46 loop CLEAN before delivery → FULL pipeline → smoke BASELINE OK → Windows + Android walk rows (legacy peer for F-1; links + files + images for F-5) | review + pin + walk row | us → Damir | OPEN | prompt item 6 |

## S2 · The office walk (Mac + iPhone) and its fix round

Sheet: `docs/walk-artifact-1086.html` — **26 rows** (the handoff's "23" predates the #1093 rows). Prerequisite: FULL
pipeline, wiped `obj/bin`, the first iOS + Mac compile of #1086–#1095 C#. Each row passes when its "Pass when" holds.

| ID | Criterion — passes when … | Check | Owner | State | Evidence |
|---|---|---|---|---|---|
| E-OW | A BUILD row is added first (walk-sheet template), then all 26 office rows pass (A1 · A1b · B1 · B1b · B2 · B3 · B4 · B5 · B6 · B7 · B8 · B9 · B10 · B11 · B12 · B13 · B14 · B15 · 1086 · 1087 · 1090 · 1088 · B6b · FAB · 1091 · 1091f), or each fail is fixed and re-walked | walk rows | Damir | PASSED (#1114: 25 P · 0 F · 1 N/A — B15 N/A treated as pass; the BUILD row was not added) | `walk-artifact-1086.html` `ROWS`; #1114 |
| D-9 | Mac calls run past 0:00 both ways and the Mac log has no "format mismatch" line (= rows A1/A1b) | walk row | Damir | PASSED (A1/A1b, #1114) — but see E-W1 (crash after calls) | `MacCatalyst/SAudioRecorder.cs:87-89`; #1084 |
| D-3 | iOS-67: FAB → contact ×3 on iPhone opens the chat (= row FAB). If it fails: `document.elementFromPoint(innerWidth/2, innerHeight/2)` in Safari Inspector BEFORE any fix (#215) | walk row | Damir | PASSED (row FAB, #1114) | `ios-sim-findings.md:142-166` |
| E-M2 | The Mac clone is re-synced: `git log --format=%h --grep="Claude-Session" \| wc -l` → 0, no ahead/behind | doc check | Damir | OPEN | CLAUDE.md ★ MAC RE-SYNC |
| E-I3 | C.17 call while locked (iPhone): rings, no call UI over the lock; after unlock the ring/card appears | walk row | Damir | OPEN | `walk-artifact-office-1083.html:251` (C.17) |
| E-I4 | C.18 lock during a call (iPhone): the lock covers all; after unlock the card is back and the call runs | walk row | Damir | OPEN | office-1083 `:252` (C.18) |
| E-I5 | X.10 the menu grows from the pressed item (iPhone) | walk row | Damir | OPEN — not marked | office-1083 `:206` (X.10) |
| E-I6 | F17 typing in a GROUP shows the dots — after CORE-12 (B-20), or the row is dropped by H-8 | walk row | Damir | OPEN — blocked on B-20 / H-8 | `walk-verdict-office-2026-09-30.md:34-41` |
| E-I7 | F17b / C.22 VoiceOver + TalkBack rows: walked, or ruled optional | walk row / decision row | Damir | OPEN | verdict `:32` |
| E-A3 | AND-28: an existing contact shows its avatar on Android | walk row | Damir | UNKNOWN — no result since it was listed | `walk-artifact-overnight-1028.html` OV.26 (`:340-342`) |
| E-W1 | Mac + iPhone: 6 calls (answer, talk, hang up) + 2 min idle → no crash. Fix: hold the AVAudio node wrappers (`OutputNode` / `MainMixerNode` / `InputNode`) in fields and dispose them BEFORE the engine in `stop()` (all 4 `Platforms/{MacCatalyst,iOS}/SAudio{Player,Recorder}.cs`); a source pin + a deliberate break | walk row + pin | us | PARTLY — built (#1118), walk owed | `docs/pending-1101-1102.md` "#1101"; SIGSEGV in `-[AVAudioNode dealloc]`; #1114 · session 2: the 4 files hold + dispose the IO nodes before the engine; pin E-W1 (+ failed-start); office walk row E-W1 |
| E-W2 | The OPEN chat's header avatar (and an open chat-info pane) updates when the contact changes its avatar (today only `onChatScreenReady` pushes it) | pin + walk row | us | PARTLY — Windows + Android P (#1123); office row owed | pending "#1102 (a)"; `StreamProcessor` `case SpixiMessageCode.avatar`; #1114 · `SingleChatPage.pushHeaderAvatar` + StreamProcessor re-push (#1118); pin E-W2; walk rows E-W2 |
| E-W3 | A nickname change is traceable: `[NICK] received … changed=yes/no` (receiver) and `[NICK] broadcast to N` (sender), no nick text; then Damir decides a re-send after reconnect | log lines + decision row | us + Damir | PARTLY — log lines P (#1123, broadcast to 18); the re-send decision in session 3 | pending "#1102 (b)"; #1114 · `[NICK] received cN len=` · `[NICK] broadcast to N`; pin E-W3; walk rows E-W3 |
| E-W4 | The Mac rings on an incoming call (check `SPlatformUtils.callRings` on MACCATALYST) + Damir's dial: a "Call ringtone" on/off switch in Notifications (default on, all platforms) | walk row + decision row | us + Damir | PARTLY — the switch P on Windows + Android (#1123); the Mac ring walk owed | pending walk note 1; #1114 · Mac `startRinging` (bundled mp3), 🟡 `ixian:callRingtone` (T1 B-27); pin E-W4 (executed through the built settings shell); walk rows |
| E-W5 | No square behind the BIG ring card on the Mac (WebKit does not clip the blurred `.c-callbg` backdrop to the card radius); rendered in Playwright WebKit before + after, both themes | render + walk row | us | PARTLY — built, Mac walk owed (the WebKit composited clip does not reproduce in Chromium/WebKitGTK here) | pending walk note 2; #1114 · `call-screen.css` desktop backdrop `clip-path`; pin E-W5; office row E-W5 |
| E-W6 | The unread time on a macOS chats row is blue (as on iOS, #1088) | walk row | us | UNKNOWN — the Mac walk with a CLEAN build decides | pending walk note 3; #1114 · no code: the #1088 rule renders blue in WebKitGTK on desktop + maccatalyst, both themes (session 2) — a stale Mac build suspected; office row E-W6 (Web Inspector line if grey) |
| E-W7 | The Mac title "Spixi IM" is readable in every app theme × macOS appearance (follow the app theme via `OverrideUserInterfaceStyle`, or hide the title — Damir's dial) | walk row + decision row | us + Damir | PARTLY — built (follow the app theme, #1118), walk owed | pending walk note 4; #1114 · `ThemeManager.applyMacWindowAppearance` + `window.Created`; pin E-W7; office row E-W7 (6 combinations) |

## S2b · Session-1 walk fails + Damir's requests (walk #1115, decisions #1116) — session 2

| ID | Criterion — passes when … | Check | Owner | State | Evidence |
|---|---|---|---|---|---|
| G-1 | Android chat open (row tap ×3, FAB ×2), recorded: NO frame without the chats list or the chat (no plain-ground or grey frame) | recording, frame by frame | us + Damir | PARTLY — the hold now gets its native WebView (A1 fix `nativeWebViewOf`, #1135); the recording + `why=vsc` owed (walk session 4) | #1115 frames `docs/sheets/walk-session1/`; #1116 · #1101 0.01 removed; transparent grounds + `PresentHold` (VSC + 1 frame, cap 250 ms); `[CDPERF] chat held frames= ms= why=`; pins G-1 + PresentHold; walk rows G-1, G-1b |
| G-2 | "last seen" shows for a contact not seen since the app started: the saved last sighting (C#, on this device) or their newest message time; never seen + no message → nothing | pin + walk row | us | PARTLY — Windows + Android P (#1123); office row owed | #1116, #1117 · `SSightingStore` (accepted 1:1 only, 5-min grain) + `noteInto` (MSTest + scripts/csh 26/26); gate row; walk rows G-2 |
| G-3 | `[PRESENCE]` lines carry an opaque per-contact number and a line when the displayed dot flips; Damir tests swipe-away vs Force stop → the 150 s rule judged on facts | log + walk row | us + Damir | PARTLY — probe P (#1123): keepalive ≈100 s, dot off at age 151 s; the 150 s decision in session 3 | #1116 · `[PRESENCE] cN keepalive` + `dot=on/off age= core=`; pin G-3; walk row G-3 |
| G-4 | "Show in chat" (Downloads, chat info) briefly highlights the target message | pin + walk row | us | PARTLY — picked option 3 with a 1 px ring (#1132) and built: row band + 1 px ring, 3 s, a per-jump token, survives re-renders (#1135); walk row owed | #1116 · mechanism: the pulse selector named `.c-bubble` only (files/media never lit, #1121); fixed in chat.html; pin G-4; walk rows G-4 |
| G-5 | The Downloads "From" chip: rendered options, Damir picks | render + decision row | Damir | PARTLY — A3 built (the chat file tile on every Downloads row, #1129); walk row BUILD | #1116 · section header; pin G-5; walk row G-5; renders `docs/sheets/session2/` |
| G-6 | Chat info shared items, Telegram style: chips Media · Files · Links switch in place, a well-placed "Show all", media previews, tap = open, long press = menu (Show in chat · Save/Share · Copy link · Delete from this device · Delete message) — rendered, Damir picks, built, walked | render + pins + walk | us + Damir | PARTLY — inset gallery picked + built (#1132, #1135); in-chat tiles #1124 built (#1135); walk rows owed | #1116, #1117 (Telegram reference, outside the repo) · chips in place, edge-to-edge grid, ≤ 60 + Show all, long press menu (Open · Show in chat · Copy link); 🟡 `ixian:sharedShow` (T1 B-27); real thumbnails G-6b (#1121); pins G-6, G-6b; walk rows G-6, G-6m, G-6b |
| G-7 | READ2 walked (implied read with a new-app peer) | walk row | Damir | DONE — walked P (#1123) | #1115 · walk row G-7 in `walk-artifact-session2-win-android.html` (4 numbered steps) |
| G-8 | The dark corner screenshot sent; the corner colour set | screenshot + decision row | Damir | DONE | #1115 · #1117 (2): closed, left as is |
| G-9 | The 0b(a) bar reveal: probe the shell's paint handshake in bar mode (≈240 ms, not the C# fade) | log | us | DONE — log (#1123): bar fit 212–223 ms via resize vs full 42 ms → the bar delay is the WebView resize (P-1 lead 3) | #1115 · `[CALLPAINT]` console line in call.html awaitPaint (no verb); pin G-9; walk row G-9 |
| P-1 | **Chat open under 100 ms, no flicker, on every platform** (tap → first chat frame), measured; the whole app's felt speed (every transition × platform), read-only first, then Damir picks | measurement + recordings | us | PARTLY — table filled (#1130) + ranked levers (`docs/p1-measurement.md`); picks built (#1132/#1133/#1135: levers 1 · 2 · 2b · 3 · 5 · 10 · 11); the re-measure walk (session 4 sheet) fills the §8 experiment log; iPhone / Mac owed | #1116 · #1122 · #1127 · #1129 |
| P-1a | A1: the G-1 hold gets its native WebView (`chat held … why=vsc frames≥1`) and a recording shows no plain/grey frame | probe log → fix → recording | us | DONE — walk #1146: every hold `why=vsc` (25/25, 3 / 4 frames); recordings P (Damir) | #1123 (1) |
| A5-1124 | Image files show as media tiles in the chat (local preview · transfer ring + "keep Spixi open" · offered glyph), Privacy switch "Show photo previews in chats" (OFF = file cards); a failed decode never blocks opening | pins + walk rows + BE ask (🟡 `setFileThumb` push, `ixian:photoPreviews` verb) | us + Damir + BE | PARTLY — built #1135, #46 CLEAN r5; walk + BE OK owed | #1124 · #1133 (3) · gate A5 (a)–(e) |
| VOICE-1 | Voice messages (#1136): capability check + dual path (inline Opus 1:1 / audio file otherwise), excerpt + notification text, the #64 mic slot | interview → design → build | Damir + us + BE | OPEN — input recorded with tree facts (#1136); session 5 interview | #64 · #1136 |
| P-1b | Lead 13: iOS `<UseInterpreter>true</UseInterpreter>` (`Spixi.csproj:135`, upstream 6e63a31f) — why it is set; the A/B on the iPhone | BE question + office walk row | BE + us | OPEN | #1127 (2) |
| A8 | File + app card stamps at 0.7 (READ/FAILED 1.0) | pin + walk row A8 | us | PARTLY — built (#1129), walk owed | #1126 |
| A10 | A delete makes no notification on the peer | pin + walk row A10 | us | PARTLY — built (#1128/#1129), walk owed; limit: an owner-relayed group delete still pushes (Core) | #1128 |
| A11 | Chats list: the sent tick has the delivered weight | pin + walk row A11 | us | PARTLY — built (#1129), walk owed | #1129 |
| A12 | The channel selector's dim covers the composer | pin + walk (timing) | us | PARTLY — built (#1129), walk owed | #1129 |
| A7 | A cancelled file stays "File" in the chats list — Core's lastMessage recompute picks the deleted fileHeader | BE row | BE | OPEN — BE ask only (Damir) | #1126 |

## S3 · Pre-freeze fixes (ours)

L6 opens this stage (#933, #937). The audit rows here are the ruled set in the header (`docs/prelaunch-audit-handoff.md`, #1054).

| ID | Criterion — passes when … | Check | Owner | State | Evidence |
|---|---|---|---|---|---|
| A-13 | L6: `onRestore` calls `verifyWallet` BEFORE any `Preferences` write; the `Remove("waletpass")` typo is gone; a wrong-password restore leaves `lockenabled` / `walletpass` untouched | pin + walk row | us | OPEN | `LaunchPage.xaml.cs:673-694` (`:675`, typo `:676`, `:686`, `:691`, `:693`); `verifyWallet` only at `:906`/`:1015`; ours per #927/#928 (be-cutover `:728` still lists it → G-7) |
| A-6 | S-02 (= S16 residual): `transfer.fileName` sanitised once at header time, every composed path through `resolveDownloadPath`, `provider_paths.xml` narrowed; pin + deliberate break | pin | us — owner conflict, see H-19 | OPEN | `TransferManager.cs:667`, `:810`; `Platforms/Android/Resources/xml/provider_paths.xml:3-17`; audit `:71-77` |
| A-7 | S-03: a received tip shows a count only (or an amount only when matched to a tx in the own activity store) | pin | us (+ H-18 wording) | OPEN | `chat.html:2589-2626`; audit `:79-84` |
| A-8 | S-04: `MiniAppPage.onNavigating` validates before `Substring(IndexOf('='))`, uses `TryFromBase64String`, the handler is wrapped in try | pin | us | OPEN | `MiniAppPage.xaml.cs:141-142`, `:165-170`; audit `:86-96` |
| A-9 | S-06: the accepted file size is capped, free space checked, no `SetLength` pre-allocation | pin | us | OPEN | `TransferManager.cs:813`; audit `:104-110` |
| A-10 | S-07: `slide1Copy`, `aboutBody`, `secureNoticeText` no longer imply at-rest encryption, in all locales | doc check + pin | us (+ H-18 wording) | OPEN | `en-us.json:3`, `:671`, `:719`; audit `:111-116` |
| A-11 | P-01: every platform's `ResizeImage` bounds-decodes with a pixel cap and disposes bitmaps | pin + measurement | us | OPEN | `Platforms/Android/SFilePicker.cs:73`; audit `:120-131` |
| A-19 | U-02: 12-hour times show no leading zero ("1:08 PM"); 24-hour locales keep "09:05" (`'numeric'` only when the resolved cycle is h12/h11) | pin | us | OPEN | `src/components/timestamp.js:30` (`hour:'2-digit'`); audit `:205-206` |
| A-14 | D25: MacCatalyst registers a WebView handler with the resource allow-list + the http/https navigation block (the Mac ships in v1) | pin + walk row (Mac) | us (C#) + BE review | OPEN | `MauiProgram.cs:45-56` (`#if IOS` only); `security-review-for-be-engineer.md:706-716` |
| A-4 | `spixi.draft.*` / O-03: on Windows AND Mac with a mini-app open, `localStorage.length + '\|' + localStorage.getItem('spixi.pins')` in its dev tools returns `0\|null` — or the partition is built | walk row (one dev-tools line per platform) | Damir (test) · us (fix if live) | PARTLY — Android + iOS contained | gate `:66`, `:1161`, `:1367`; `be-cutover-brief.md:775-778` |
| D-4 | Android: a 30+ min `dumpsys meminfo` capture shows no unbounded growth and no kill; the pass threshold is written into the DECISIONS row before the measurement | measurement | Damir (+ us to read) | OPEN | audit `:33`, `:124`, `:278` |
| D-5 | iOS: a 30-min Instruments run shows no kill (L7) | measurement | Damir | OPEN | #807 (L7 "genuinely untested") |
| A-18 | The one-test-each rows F-06 (iOS getUserMedia refusal), F-07 (WebKit url-filter), F-13 (nickname clamp) are run | walk rows | Damir | UNKNOWN — never reported run | gate `:1368` (F-07), `:1371` (F-06), `:1382` (F-13) |
| A-17 | F-12 zip-slip: restoring a backup with an extra `..\html\marker.txt` entry leaves no `html/marker.txt` | walk row | Damir | PARTLY — code fenced, device test owed | `LaunchPage.xaml.cs:838-903`; gate `:1124`, `:1369-1370` |
| A-1 | C15 link-open spoof: gate 16 pins stay green AND `ixian:openLink:javascript://x` from a dev build opens nothing on Android / iOS / Windows / Mac | pin + walk row | us (pins) · Damir (device) | PARTLY — code + pins DONE; the device test never run | gate `:64`, `:1121-1122`, `:1379` |
| A-2 | MAJOR #6(a): gate 7/8 pins stay green (`isTrustedHost` fail-closed, main frame only) | pin | us | DONE | `iOSWebViewHandler.cs:143-146`; gates green 2026-10-01 |

## S4 · Read-only sweep phases 1–2

| ID | Criterion — passes when … | Check | Owner | State | Evidence |
|---|---|---|---|---|---|
| G-3a | `docs/audit/architecture-map.md` exists and Damir approves it | doc check + decision row | us → Damir | OPEN — file absent | `audit-refactor-plan.md` §1 |
| G-3b | `docs/audit/security-verification.md` exists with `file:line` proof for each invariant | doc check | us | OPEN — file absent | `audit-refactor-plan.md` §2 |

## S5 · Damir picks

| ID | Criterion — passes when … | Check | Owner | State | Evidence |
|---|---|---|---|---|---|
| G-3c | `docs/audit/refactor-inventory.md` exists with priorities AND an agreed stop rule (pre-1.0 / post-launch / never), seeded with PRE-1, PRE-2, #1046 ①②, R-02, P-02…P-04, C-01 (P-02…P-04 and C-01 are decided with H-22) | doc check + decision row | us → Damir | OPEN | `audit-refactor-plan.md` §3–4, §6b; #1046 |
| G-3e | Every T2 row marked "blocks S5" or "blocks S6" has a decision row | decision rows | Damir | OPEN | §T2: S5 = H-5, H-15, H-16, H-20, H-22, H-23; S6 = H-3, H-13, H-14 |

## S6 · Freeze + `freeze-v1` tag

| ID | Criterion — passes when … | Check | Owner | State | Evidence |
|---|---|---|---|---|---|
| C-1 | `Config.cs` reads `maxLogCount = 1` AND the RELEASE BLOCKER marker is gone (gate 23 accepts only the legal pair) | pin (gate 23) | Damir (at the freeze) | OPEN | `Spixi/Meta/Config.cs:101` (= 5), marker `:82`; gate 23 `smoke-test.mjs:31772-31800` |
| C-2a | 0 `[CDPERF]` emitters in `Spixi/` + `src/` (the pin flips PRESENT → ABSENT) | pin | us | OPEN — still in use (#1095) | 8 C# files + `home.html`, `chat.html`, `settings.html`, `settings-app.js` |
| C-2b | 0 `[SCROLL]` | pin | us | OPEN | `chat.html:5938-5956` |
| C-2e | 0 `[EXCERPTDIAG]` | pin | us | OPEN | `HomePage.xaml.cs:138`, `:3158` |
| C-2f | 0 `[KBDIAG]` and 0 `[M5]` | pin | us | OPEN | `message-menu.js:200-205`; `ContactNewPage.xaml.cs:57-58`; `MacCatalyst/AppDelegate.cs:103-107` |
| C-2g | `[M6]` removed or kept by a decision row | pin / decision row | us | OPEN | `SpixiContentPage.cs:597`, `:605` |
| C-2h | 0 `[CALLSWAP]` (after F-0b-a is measured) | pin | us | OPEN | `CallPage.xaml.cs:131`, `:1046`, `:1130` |
| C-2j | `[LOCKDIAG]` and the dev-coexist symbol retired per #916, or kept by a decision row | pin / decision row | us + Damir | OPEN | `SLockDiag.cs:47`; `SPIXI_DEV_COEXIST` in 6 C# files |
| C-2k | Damir names the KEEP set of the other probe tags (`[NOTIFDIAG]` `[CRASHDIAG]` `[KBTRAY]` `[DEVSEED]` `[DIVIDER]` `[WALLETDIAG]` `[RESTOREDIAG]` `[L14]` `[APNSDIAG]` `[SCANDIAG]` `[MEMDIAG]` `[WV2]` `[WEBVIEW]` `[SPEAKER]`); one pin asserts the rest at 0 | decision row → pin | Damir + us | UNKNOWN — no list exists | grep over `Spixi/` + `src/`; #753, #825 |
| H-10 | The 2 KNOWN smoke failures (#136 · B3) are fixed or recorded as accepted for release | pin / decision row | Damir + us | OPEN | `smoke-test.mjs:40441-40455` |
| G-1 | The freeze: C-1 and the C-2 retire set done, the final smoke count locked (with the Core sibling), a DECISIONS freeze row, a full-app #46 loop CLEAN (Phase 4 items 1–3; item 4 = G-7b) | pin + decision row + review | Damir + us | OPEN — never scheduled | `finalization-roadmap.md:94-97`; #825 |
| G-1t | `git ls-remote --tags origin` shows `freeze-v1` and `pre-strip` are free; tag `freeze-v1` on the frozen commit; baseline artifacts recorded (bundle size + hash, shell hashes, smoke output, HEAD) | doc check | Damir | OPEN | `audit-refactor-plan.md` §0; #1099 (not `audit-baseline`, which is the 2026-07-12 tag) |

## S7 · Characterization

| ID | Criterion — passes when … | Check | Owner | State | Evidence |
|---|---|---|---|---|---|
| G-3d | `scripts/audit-baseline.mjs --record / --verify` exists and is green on `freeze-v1` | pin | us | OPEN — script absent | `audit-refactor-plan.md` §5 |

## S8 · Refactor picks

| ID | Criterion — passes when … | Check | Owner | State | Evidence |
|---|---|---|---|---|---|
| G-4 | Each picked item has a DECISIONS row, an unchanged characterization transcript, and a #46 review | review + pin | us on Damir's word | OPEN | `audit-refactor-plan.md` §6; PRE-2 (Account as a real tab) is a pick here or v1.1 (H-20) |

## S9 · The strip (#933)

| ID | Criterion — passes when … | Check | Owner | State | Evidence |
|---|---|---|---|---|---|
| G-5 | Tag `pre-strip`; tier-1 session-prose comments removed (scripted pass + a reading pass per site + the #46 loop; suite identical before and after); workshop material (handoffs, walk sheets, checklists, verdicts, sheets, `docs/status-log.md`, `Claude outputs/`) moved to the private `spixi-workshop` repo; DECISIONS rewritten by area (~80 entries; `docs/decisions-index.md` retires then); docs reduced to the #933 list; `strip-release.mjs` gates green | pin + doc check + review | us + Damir | OPEN | #933; `scripts/strip-release.mjs` exists; one branch, one cleanup (#933 supersedes #916's merge-branch strip) |
| A-5.O-27 | `crash-logcat.txt` (64.6 MB), `mem-chats.txt`, `mem-seed01.txt`, `f5repro.mjs`, `README-FIRST.txt`, `Claude outputs/` are out of the product repo (`git ls-files`) | doc check | Damir | OPEN | repo root; gate `:1173`, `:1376` |

## S10 · Security gate re-run and the BE pack

| ID | Criterion — passes when … | Check | Owner | State | Evidence |
|---|---|---|---|---|---|
| G-6 | The introduced-vs-inherited census is re-derived over the final delta from `0e85a4b8`; every OPEN row has an owner and a decision | gate re-run | us | OPEN | #916; the 65 / 38 / 27 census is the 2026-09-07 snapshot (gate `:1072`) |
| A-5 | Every OPEN "ours" gate row is FIXED, ACCEPTED in a DECISIONS row, or moved to the BE list — and G-6 agrees. Since #1074 these verbs/pushes/log lines have NO gate section yet: `ixian:callCardH`, `ixian:callPainted`, `callAwaitPaint`, `setCallCompact`, `onSettingsShown`, `onChatShown`, `[CALLSWAP]` | doc check + gate re-run | us + Damir | OPEN | gate `:1072`, table `:1152-1185`; last section #1074 (`:1608`) |
| A-5.O-08 | A smoke gate sweeps `src/components/**`, `src/shells/**` and the built output for `.innerHTML` (zero sinks) | pin | us | OPEN | gate `:1165` |
| A-5.O-09 | The build-injected `documentElement.innerHTML` in the 18 built shells is removed or accepted | pin / decision row | us | OPEN (NIT) | gate `:1166` |
| A-5.O-11 | The raw C#→JS arg path is removed or accepted | decision row | us | OPEN (NIT) | gate `:1167` |
| A-5.O-34/35 | The release pipeline refuses `SPIXI_DEV_COEXIST` in Release (or accepted) | pin / decision row | us + Damir | OPEN | gate `:1180-1181` |
| A-5.O-32 | A fresh Android install with onboarding unfinished sends no OneSignal request (proxy capture) | measurement | Damir | OPEN | gate `:1178`, `:1377` |
| A-16 | One Android/iOS restore and one Windows restore succeed without NU1100/NU1603 (nuget feed scoping, F-21) | measurement | Damir | PARTLY — fixed per the gate; restore test owed | gate `:1133` (F-21), `:1373` (its test) |
| A-3 | O-02: `ClassId="miniapp"` is read on Windows and MacCatalyst too, or accepted | pin / decision row | us + Damir | OPEN | gate `:1160`; readers only in Android + iOS |
| G-7 | The BE engineer's docs carry no closed or mis-owned row: `be-cutover-brief.md` § Blockers (C16 `:726`, W11 `:727`, #234 `:739` still "YES"; L6 `:728` listed as his, ours per #927/#928; the "still says 15" lines `:28` and `:719`; the 15→17 count), `android-findings.md` AND-25/27, `ios-sim-findings.md` re-verify rows; "MAJOR #8" split into two IDs (B-3, B-6) | doc check | us | OPEN | `be-cutover-brief.md:714-742`; `android-findings.md:50-52`; `ios-sim-findings.md:48`, `:139` |
| G-7b | The BE handoff doc (finalization-roadmap Phase 4 item 4) exists, lists every T1 row and the inherited gate rows, and Damir has sent it | doc check | us → Damir | OPEN — no such doc | `docs/finalization-roadmap.md:94-97`; today only `be-cutover-brief.md` + `security-review-for-be-engineer.md` |
| B-2 | A3: the BE security walkthrough with Damir is held and recorded in one DECISIONS row | BE sign-off | BE + Damir | OPEN — never held | `archive/handoff-post-freeze.md:119` |

## S11 · Merge

| ID | Criterion — passes when … | Check | Owner | State | Evidence |
|---|---|---|---|---|---|
| G-8 | The release branch carries the stripped tree and the suite is green on it | pin + doc check | Damir | OPEN | #916 |

## S12 · Release builds, store, TestFlight

| ID | Criterion — passes when … | Check | Owner | State | Evidence |
|---|---|---|---|---|---|
| C-4 | `ApplicationDisplayVersion` / `ApplicationVersion` / `Config.version` carry the release version (higher than the store build) | doc check | Damir | OPEN — still `0.9.22` / `160009220` / `spixi-0.9.22` | `Spixi.csproj:45-46`; `Config.cs:44`; #931④ says "v0.9.30" |
| E-W | Windows: the last walk of each batch has 0 F, ending with a 0-F walk of the release candidate | walk rows | Damir | DONE through #1095 (#1096); reopens with each batch | #1092, #1094, #1096 (9 P · 0 F) |
| E-A | Android: the last walk of each batch has 0 F, ending with a 0-F walk of the release candidate | walk rows | Damir | DONE through #1095 (#1096); reopens with each batch; the speed note → F-0b-a | #1096 |
| E-I | iPhone: the release-candidate walk (the office rows on that build) has 0 F — distinct from E-OW, which walks the current build | walk rows | Damir | OPEN — walked 09-24 (#972), 09-27 (#991), 09-28, 09-30 (#1084); #1086–#1095 C# not compiled on iOS | #972, #991, #1084 |
| E-M | Mac: the release-candidate walk (the office rows on that build) has 0 F — distinct from E-OW | walk rows | Damir | OPEN — first boot 09-24 (#972 iO.29), walked #991, 09-28, #1084; #1086–#1095 C# not compiled on Mac | same |
| E-W2 | A Windows Release build launches and a short walk passes | walk row | Damir | UNKNOWN — no Release walk found | #663 |
| E-A2 | An Android Release build (AC.2) runs a short walk that re-checks AND-25 (remove contact, no fatal) and AND-27 (mic denied → the call screen appears) | walk row | Damir | OPEN — AC.2 deferred | #924; AND-25/27 passed Walk T (#833) |
| E-I2 | An iOS Release/AOT build of the release candidate runs a short walk | walk row | Damir | OPEN — the last Release walk is #807 (Walk R, 09-07); every office walk since was Debug | #807; `walk-verdict-ios-office-2026-09-24.md:1` |
| E-M3 | OV.27: a clean `-c Release` Mac build launches via `open` (no -54) | walk row | Damir | OPEN | office-1083 `:188` (OV.27) |
| E-M4 | A universal (lipo) Mac Release build loads RocksDB | walk row | Damir | OPEN | iO.29 note |
| E-RV | The device re-verify rows pass on the release candidate: Q1 restore picker says "Replace file" once a file is set (J-17) · AND-37 Android back over an Account sheet closes the sheet first | walk rows | Damir | OPEN | Q1: built #1034, render only; AND-37: fixed by N51, no device result in DECISIONS after #826 (grep) |
| H-1 | iOS-32: a Release build, unplugged, side by side with legacy Spixi, shows comparable battery share and heat; the pass threshold is written into the DECISIONS row before the measurement | measurement | Damir | OPEN — never measured | `ios-launch-gaps.md:15` |
| A-15 | D24: `NSAllowsArbitraryLoads` is off (or the exception scoped) on iOS and Mac before App Store review, or accepted | BE sign-off / decision row | BE / Damir | OPEN | `Platforms/iOS/Info.plist:41-42`; `Platforms/MacCatalyst/Info.plist:7-8` |
| G-9a | The TestFlight/store build is signed with `aps-environment = production` (`codesign -d --entitlements`) | doc check | Damir | OPEN — file says `development`; nothing switches it | `Platforms/iOS/Entitlements.plist:21-22`; `Spixi.csproj:175-177` |
| G-9b | App Store distribution profiles exist for the app AND the push extension, both with App Group `group.com.ixilabs.spixi` | doc check | Damir (Apple portal) | OPEN — only development profiles regenerated | #932 |
| G-9c | The iOS push extension works in a distribution build | walk row | Damir | PARTLY — dev build works (#991 iO.5, iO.11) | #972, #991 |
| G-9d | A release runbook exists for every store in scope (Play · App Store · Mac + Windows per H-21): signing, version bump, metadata, privacy label / Data safety, screenshots, review notes | doc check | Damir + us | OPEN — none in the repo | only `privacy-workorder-2026-08-29.md:172-174` drafts the labels |
| G-9e | The Play build is an AAB signed with the release key | doc check | Damir | UNKNOWN — Release groups set `apk`; no signing properties (inference: Play needs AAB) | `Spixi.csproj:178-186` |
| G-9f | `PrivacyInfo.xcprivacy` is present, or Damir confirms it is not needed | doc check | Damir | UNKNOWN — no file (inference: App Store review asks for it) | `find Spixi -name PrivacyInfo.xcprivacy` → none |
| G-9g | TestFlight: a build is uploaded, installs and passes the S2 iPhone rows | walk row | Damir | OPEN | #916 |

---

## V · The v1 build list (#1137 / #1138 / #1145 — sessions 5–9; Core stays clean)

Every row is Spixi-side only. A new verb / push = a 🟡 DECISIONS row + a gate row + a BE-list entry. After this list the FREEZE LINE (#1137).

| ID | Criterion — passes when … | Check | Owner | Session | State | Evidence |
|---|---|---|---|---|---|---|
| V-1 | Speed: every built lever kept or discarded on measured numbers (§8 log) + P-03 (no full list rebuild) + P-04 (no base64 avatar per row) + lever 7 / 12 picks + chat info open / close (levers 7 + 8) | measurement + pins + walk | us + Damir | S5 | PARTLY — levers 1 · 2 · 2b · 3 · 5 · 10 · 11 built (#1135), measured #1146 (kept); spare warm 0 ms (#1147) owed on the re-walk | `docs/p1-measurement.md` |
| V-2 | Lazy history B2: load-more prepends only the older slice (no clearMessages, no unread reset); `attachLazyHistory` is the scroll trigger; B4 tried as one lever | pins + walk (iPhone momentum scroll) | us | S5 | OPEN | #1142 |
| V-3 | Media viewer: a tap on a media tile (chat + chat info) opens the in-app viewer with a viewer-size image from the local file | pins + walk + 🟡 verb/push | us + BE | S5 | OPEN | #1144, #1145 (1) |
| V-4 | Group cap: the picker stops at 10 with "n / 10"; C# refuses > 10 with an alert | pin (break) + walk | us | S5 | OPEN | #1141 |
| V-5 | Capability check: Spixi answers `getAppProtocols` with its feature ids and asks each contact (chat open + presence); the answer has an age | csh + walk (two new apps, one old) | us + BE | S6 | OPEN | #1136 |
| V-6 | Reply-to: the "> <name>: <excerpt>" quote, quote UI only on a real match, tap jumps; stripped from the list excerpt + the notification | pins + walk | us | S6 | OPEN | #1137 (3) |
| V-7 | Edit: chatStream replace (same id, higher sequence, IsStream=false) via `sendSpixiMessage`, push OFF, "edited" marker, order checked; text only | pins + csh + walk | us | S6 | OPEN | #1137 (4), #441 |
| V-8 | Voice messages: dual path (inline 1:1 to a confirmed app, a file otherwise), excerpt + notification "🎤 Voice message (0:12)", the mic slot ON | pins + csh + walk ×4 platforms | us + BE | S7 | OPEN | #1136, #1138 (11) |
| V-9 | Groups: "you were added" notice · owner-only avatar change · rename (createGroup with the full member list) | pins + walk | us | S8 | OPEN | #1137 (5) |
| V-10 | Reactions with any emoji (`like:<emoji>`, one per person) | pins + walk | us | S8 | OPEN | #1137 (6) |
| V-11 | Mini-app session accept / decline UI | pins + walk | us | S8 | OPEN | #1137 (7); supersedes §I I-5 |
| V-12 | Disappearing messages: per-chat timer (off / 1 h / 1 day / 1 week), a readable system line, local delete, honest text | csh + pins + walk | us | S8 | OPEN | #1138 (12) |
| V-13 | Privacy switches: read receipts off · typing off · "Hide my online status" courtesy flag (reciprocal, honest text) | pins + walk | us | S8 | OPEN | #1138 (14) |
| V-14 | Media picker: Photo tile ON, picker + camera, EXIF stripped, resize ≤ 2048 px JPEG ~80 %, videos as files under A-9 + warning | pins + walk ×4 | us | S9 | OPEN | #1138 (16) |
| V-15 | Audit fixes (ours) #1137 (9): C-01 · C-02 · C-03 · C-04 · C-05 · H-3 + H-13 · H-14 · A-13 · A-6 · A-7 · A-8 · A-9 · A-10 · A-11 · A-14 · A-19 | per-row checks (S3 rows) | us | S9 | OPEN | #1137 (9) |
| V-16 | Onboarding copy on the Create screen (#1139), §4 copy check passed | pin + render | us | S9 | OPEN | #1139 |
| V-17 | Language picker note + "Report a translation problem" link for every non-English language | pin + walk | us | S9 | OPEN | #1143 |
| V-18 | Polish picks H-15 / H-16, item by item (build or v1.1) | decision rows | Damir | S9 | OPEN | #1137 (10) |
| V-19 | Pre-freeze quality items: CodeQL · CI (smoke + csh) · isolation check · bridge contract file · property tests | CI runs | us (parallel session) | parallel | OPEN | #1140, `docs/quality-plan.md` |
| V-20 | The first release trains named: forward · search in chat · send contact; monthly cadence; the language queue | decision row | Damir | after v1 | DONE — #1143 | #1143 |

## T1 · The BE engineer's rows (inherited — his to fix, still unsafe until he does)

"Inherited" answers *whose*, not *whether it is safe*. Each row says which stage it blocks; a row he does not close
before that stage needs a Damir decision row (ship with it, or hold). **Owner of every T1 row: the BE engineer** (Damir where a
row says so); the Check column names the sign-off or measurement.

| ID | Criterion — passes when … | Check | Blocks | State | Evidence |
|---|---|---|---|---|---|
| B-1 | #232/#523 money-path review (W5/W6/PA1, `SPayments.cs`): the BE engineer signs off §1c, OR a cap gate removes `composeSend` from the tester build (#874) | BE sign-off | S12 | OPEN — `composeSend` pushed unconditionally | `HomePage.xaml.cs:2360`; `security-review-for-be-engineer.md:248-276` |
| B-3 | Android mini-app XHR reads `wallet.ixi` (the "MAJOR #8" on file access): `AllowFileAccessFromFileURLs` false for the mini-app WebView | BE sign-off + pin | S12 | OPEN | `Platforms/Android/WebViewRenderer.cs:451`; `be-cutover-brief.md:737` |
| B-4 | MAJOR #9: `OnPermissionRequest` refuses or prompts for mini-apps | BE sign-off | S12 | OPEN | `WebViewRenderer.cs:55`; `be-cutover-brief.md:738` |
| B-5 | A1/L8 cleartext `walletpass`: SecureStorage with verify-then-remove migration — OR a v1.1 decision (H-9) | BE sign-off / decision row | S12 | OPEN — no `SecureStorage` in `Spixi/` | `security-review-for-be-engineer.md:452-467` |
| B-6 | L2 (the other "MAJOR #8": `UrlDecode` turns `+` into a space in the wallet password): fixed with a migration that does not lock out `+` passwords | BE sign-off | S12 | OPEN | `security-review-for-be-engineer.md:485-545`; gate `:1238`, `:1241` |
| B-7 | MAJOR #10 + H-9: `app.id` validated once at install (delete path + 4 more sinks) | BE sign-off | S12 | OPEN | `MiniApp.cs:67`; `MiniAppManager.cs:302/324/365` |
| B-8 | H-6: the mini-app `t` field (`table`) validated as a plain name before `Path.Combine` | BE sign-off | S12 | OPEN | `MiniAppStorage.cs:99`, `:152`; `be-cutover-brief.md:740` |
| B-9 | H-7 / H-8 / H-10 / G/I-1: install filename from URL · Android picker name · FileProvider whole `files/` · one log line with text + address + path | BE sign-off | S12 | OPEN | `be-cutover-brief.md:766-770` (H-10 overlaps A-6) |
| B-11 | Q1-ESC bot-room sender identity: Core fix + an answer on stored rows | BE sign-off | S12 | OPEN | `be-cutover-brief.md:731` |
| B-12 | N57?: the written repro protocol is run and answered | BE sign-off (measurement) | S12 | OPEN | `be-cutover-brief.md:732` |
| B-13 | CORE-1 kick/ban empty cases: the Core half lands | BE sign-off | S12 | OPEN | `be-cutover-brief.md:733` |
| B-14 | CORE-4 hardcoded channel 0 in `onMessageExpired` | BE sign-off | S12 | OPEN | `be-cutover-brief.md:734` |
| B-15 | CORE-8 `getMessages` replaces the channel list | BE sign-off | S12 | OPEN | `be-cutover-brief.md:735` |
| B-16 | The membership question: does Core verify room membership on `addReaction`? | BE sign-off | S12 | OPEN | `be-cutover-brief.md:736` |
| B-17 | CORE-14 `sendData` dedup race: the local Core patch is built, Debug-run and merged by BE | BE sign-off | S12 | PARTLY — patched locally, uncompiled | `be-cutover-brief.md:741`; audit `:313-337` |
| B-18 | CORE-15: the two-node forged-message test runs; if it shows, the one-line return lands | BE sign-off (measurement) | S12 | OPEN | `be-cutover-brief.md:742`; audit S-01 `:63-69` |
| B-19 | CORE-13 / CORE-16 (null half) / #962 accept guard / presence snapshot: the local Core patches land in Core | BE sign-off | S12 | PARTLY — local only | `docs/core-patches/962-accept-null-guard.patch` |
| B-20 | CORE-12: Core relays `msgTyping` to group members — OR H-8 drops typing in groups | BE sign-off / decision row | S2 (E-I6) | OPEN | #1084 |
| B-21 | Server-side mute (iOS/macOS): the IPN server skips a muted pair | BE sign-off | H-24 (S12 if made a blocker; else I-12) | OPEN | #972 iO.7(b) |
| B-22 | F11b busy/reject reason flag on the wire (wording = Damir) | BE sign-off | H-24 (S12 if made a blocker; else I-12) | OPEN | #1081 |
| B-24 | Core "missing encryption keys" retry noise every 2.5 s | BE sign-off | S12 | OPEN | #991 finding (3) |
| B-25 | Session 1's new bridge surface (pushes `updateTicks` · `jumpToMessage` · `setSharedItems` · `setDownloadSenders`; verbs `ixian:sharedItems` · `ixian:sharedOpen` · `ixian:showDownloadInChat`; trailing args on `setOnlineStatus` / `showIndicator` / `addFile`) is approved | BE sign-off | S12 | OPEN — 🟡 ASK | `be-cutover-brief.md` SESSION1-API; #1102, #1103, #1106, #1107 |
| B-26 | The wallet fiat value is right again: `ixiprice.txt` is fed from the NonKYC IXI_USDT bid/ask midpoint (server side, no app change) | BE sign-off + measurement (the file vs NonKYC) | S12 | OPEN — 🟡 ASK | `be-cutover-brief.md` FIAT-FEED; #1108 |
| B-27 | Session 2's new bridge surface: verbs `ixian:sharedShow:<hex id>:<n>` (chat info → the existing jump) and `ixian:callRingtone:on\|off` + push `setCallRingtone` + cap `callRingtone` (#1118/#1120) — and the G-6b in-process thumbnail decode of contact images (#1121) | BE sign-off | S12 | OPEN — 🟡 ASK | `security-review-for-be-engineer.md` "Session 2 addenda"; gate "Session 2" |

## T2 · Damir's decisions (each passes when a DECISIONS row records the answer)

**Owner of every T2 row: Damir. Check: a DECISIONS row with the answer** (a row whose answer is "build it" then gets
its own criterion row in the stage it blocks).

| ID | Decision | Blocks | State | Evidence |
|---|---|---|---|---|
| H-2 | Translator pass: define "done" (per-locale sign-off) and run it — 694–773 keys per locale in `src/strings/draft/` | S12 | OPEN | `src/strings/draft/*.json` (not "~585" any more) |
| H-3 | R4 backup reminder: write the 30-day stamp on acknowledgement, not at push time? | S6 | PARTLY — renders now; the stamp still burns at push | `HomePage.xaml.cs:3931-3958`; `home.html:4378-4381` |
| H-4 | Q16 delete account purges: a walk row "delete account → welcome; no contacts, chats, mini-apps, prefs remain; create works" on the release candidate | S12 | PARTLY — built #545–#548, two defects fixed #585 | `f5-findings-2026-08-26-walkday.md:64-127` |
| H-5 | The old dials R3 media cap scope · R6 mobile tx depth · AND-24 native dialog styling · AND-39 tap-fill · M17 create-group · the privacy-shield-on-deactivate posture | S5 | UNKNOWN — no row after 2026-09-07 | no row after 2026-09-07 (grep) |
| H-6 | Gate dials O-01 (wallet balance in the chat document) · O-04/O-06 (restore inherits `spixi.*`; mute prefs never removed) · O-05 (follows A-4) · O-15 group roster · O-19 log share without a dialog on Windows · O-20 `[CRASHDIAG]` keep · O-22 console mirror · O-28…O-31 lock/APNs posture · O-33/O-41 DOM storage + scanner key · O-36 `-diff` on built shells · O-38/O-40 second hosts | S10 | OPEN | gate `:1159-1185`, `:1374`, `:1378` |
| H-8 | Group typing: wait for CORE-12 (B-20, then E-I6 is walked) or drop typing in groups for v1 (E-I6 and B-20 leave v1). The ONE decision for group typing | S2 | OPEN | verdict `:40` |
| H-9 | L8/A1 (B-5): v1 blocker or v1.1? (#927 amended said OUT this round; be-cutover § Blockers says YES) | S12 | OPEN | #927; `be-cutover-brief.md:729` |
| H-11 | (= F-0b-b) chat-open blank frames | S1 | DECIDED — the cheap test build (#1101) | #1095, #1101 |
| H-12 | (= F-0b-d) the three Windows call dials | S1 | DECIDED — all three change (#1101) | #1094, #1101 |
| H-13 | #930: the backup stamp counts a cancelled share sheet | S6 | OPEN | gate `:1521` |
| H-14 | #984: device backups carry declined addresses / the trace salt | S6 | OPEN | gate `:1581` |
| H-15 | Pre-launch U-01, U-03, U-05, U-06, D-04 haptics, D-06 dark canvas layers: fix or v1.1, each | S5 | OPEN | audit `:202-210`, `:220-224` |
| H-16 | Leftovers: pinned-vs-hover 1.01:1 · 8 dip click-dead card pad · group avatar 2 px shorter · P.18 dark sheet step · M3/M4 shades · code-tile hover contrast | S5 | UNKNOWN — some may be superseded by #1093/#1094 | `handoff-2026-09-30d.md` §2; `handoff-2026-09-29b.md:47-55` |
| H-17 | Terms of Use: counsel's read recorded, or "not needed" | S12 | UNKNOWN — #992 covers the Privacy Policy only | `docs/legal/terms-of-use.md:3` |
| H-18 | S-07 wording and the S-03 tip display (before A-7/A-10) | S3 | OPEN | audit `:79-84`, `:111-116` |
| H-19 | S-02 owner: ours (the audit: ~30 min, before any external build) or the BE engineer's (be-cutover § Blockers)? This page assumes ours (A-6) until ruled | S3 | OPEN | `prelaunch-audit-handoff.md:71-77`; `be-cutover-brief.md:730` |
| H-20 | PRE-2 (Account as a real tab): a v1 refactor pick (S8) or v1.1? | S5 | OPEN | `audit-refactor-plan.md` §6b |
| H-21 | Which stores ship v1: Play · App Store · Mac (App Store or direct) · Windows (Store or direct) — decides G-9d's scope | S12 | OPEN | #1098 (Mac ships; channel not decided) |
| H-22 | Pre-launch audit rows outside the ruled set: C-01 MAUI nav off the UI thread `:165-173` · C-02 typing timers `:174-179` (was D-6) · C-03 resume blocks the UI thread `:180-185` (was D-7) · C-04 mini-app downloads unbounded `:186-191` (was A-12) · C-05 reactions raise unread `:192-197` · P-02…P-04 `:133-153` · S-05 (Core) `:98-103` · R-01 xUnit project for C# logic `:264-268`: v1 or later, each. P-02…P-04 and C-01 are ALSO G-3c inventory seeds — one decision covers both | S5 | UNKNOWN | audit §4 step 3 `:278`; #1054 |
| H-23 | RR's "v1.1" visible gaps with no deferring row (group rename / re-avatar · "you were added to a group" · arbitrary emoji reactions · mini-app session accept UI): confirm OUT under #295 | S5 | OPEN | #295 umbrella only |
| H-24 | Do B-21 / B-22 become v1 blockers? (else they stay OUT under I-12). Group typing (B-20) is decided by H-8 alone | S12 | OPEN | I-12; #972, #1081 |

---

## §I · OUT of v1 (each with its row)

| ID | Item | Row / source |
|---|---|---|
| I-1 | The whole BE cutover | #295 |
| I-2 | ~~Reply-to (needs the Core carrier patch)~~ — SUPERSEDED by #1137 (3): the text-quote reply is v1 (V-6); only ReplyToId (#448) stays v1.1 | #295, #982, #1137 |
| I-3 | ~~Voice messages (VN-1/VN-2)~~ — SUPERSEDED by #1138 (11): the dual-path voice is v1 (V-8) | `be-cutover-brief.md:688`; #1136, #1138 |
| I-4 | C14 link previews | #931 ③ |
| I-5 | ~~C20 mini-app session requests~~ — SUPERSEDED by #1137 (7): accept / decline UI is v1 (V-11) | #931 ④, #1137 |
| I-6 | Hide online status (row to record = F-4) | session-1 item 4 |
| I-7 | #864 contact details in the home shell | #931 |
| I-8 | PV1 privacy toggles beyond media auto-load; C22 · A8 · FC1 · C12 · NT1(b) · C10 | #928 ("batch 4 … NOT REACHED") — confirm in H-23 |
| I-9 | Android system font | audit §7; #1069 |
| I-10 | Row-reorder animation (after P-03); background downloads | audit §7 |
| I-11 | CORE-11 history encryption at rest (after L8) | `security-review-for-be-engineer.md:465-467` |
| I-12 | Server-side mute, busy reason flag — unless H-24 makes them blockers (B-21, B-22). (Group typing is not here: it is v1 via E-I6 unless H-8 drops it) | #972, #1081 |
| I-13 | Group rename / re-avatar, "you were added to a group", arbitrary emoji reactions, mini-app session accept UI | #295 (confirm in H-23) |
| I-14 | CH3 mark-read persistence | #928 |
| I-15 | PRE-2 — unless picked in S8 (H-20) | `audit-refactor-plan.md` §6b |
| I-16 | The "going offline" announce, the build (was B-23; BE's; F-3 records the ask) | session-1 item 3 |
| I-17 | A contact-request decline the peer hears (a Core/protocol reject message, BE); v1 has the app-side ignore list (J-22) | #970, #978 |
| I-V1 | v1.1 (Core): remove / change a reaction · ReplyToId (#448) · group typing (B-20, H-8) · A7 lastMessage after a delete · the owner-relayed delete push (Core :857) · S-01 · S-05 · C-06 · B-21 / B-22 (H-24) · the group limit + channel cap in Core | #1137, #1141 |
| I-V2 | v1.1: GIF picker · archive chat · pinned messages · link previews (sender-made, off) · note to self · polls · video re-encoding / metadata stripping · real presence hiding · video calls · multi-device · offline files via relay storage · password-less start via the device key store · group add / remove members · RTL layout · reproducible Android build | #1138, #1139, #1140, #1143 |
| I-V3 | Release trains (v1.0.x, monthly): forward · search in chat · send contact · one new language per release (queue in #1143) · later: in-app payment notice · premium update notice · two-step send payment · L-4 (ask) | #1143 |

## §J · Closed since the 2026-09-07 version (left this page with evidence)

| ID | Old item | Evidence |
|---|---|---|
| J-1 | Privacy Policy | no markers; `build-legal-docs --check` green (19 420 chars); counsel approved the 22 Sept version (#992) |
| J-2 | #234 resume-lock Cancel | #458, #874 (`be-cutover-brief.md:739` still says YES → G-7) |
| J-3 | C15 / MAJOR #3, MAJOR #6(a) | gate `:64-65`, F-09 `:1121`, F-11 `:1123` (A-1 keeps the owed device test) |
| J-4 | "The security handover sweep never ran" | ran 2026-09-06; the re-run is G-6 |
| J-5 | W11 `requestFundsResponse` dropped | landed #928 (`StreamProcessor.cs:357-461`) |
| J-6 | C16 remote delete never persisted | refuted #928 |
| J-7 | AND-25 / AND-27 crash rows | passed Walk T (#833); the release-candidate re-check is in E-A2 |
| J-8 | AND-36 rotation highlight | closed #924 (AC.12) |
| J-9 | `[PAINTDIAG]`, `landtabprobe`, `[STARTDIAG]` | retired (comments only remain) |
| J-10 | Mac Catalyst "never ran" | first boot 09-24 (#972 iO.29); walked #991, 09-28, #1084 |
| J-11 | iOS "not walked since ~08-27" | #972, #991, 09-28, #1084 |
| J-12 | Windows "partially walked / an assertion" | #1092, #1094, #1096 |
| J-13 | iOS push "blocked on Apple", profile "expired" | #932; #991 iO.5/iO.11 (distribution profiles = G-9b) |
| J-14 | iOS-43 · iOS-44 · iOS-55 re-verify | iPhone walk #972 (not in its fail list — inferred pass) |
| J-15 | iOS-56b re-verify | office row OV.22 not in #1084's fails or N/A (inferred pass) |
| J-16 | iOS-18 multi-user picker | superseded: OV.23 → #1085 → office row B13 |
| J-17 | Q1 restore "Replace file" | built #1034; render `docs/sheets/overnight-1028/q1-restore-file.png`; the device check is E-RV |
| J-18 | S1 chat spare | #931 |
| J-19 | Tips "waiting on a C# row" | C6 built #928; #950 (the new problem is A-7) |
| J-20 | Pin / mute / favorites | CH4 LANDED #928 (`be-cutover-brief.md:822`): pin FE-local (`home.html:1717`), mute `HomePage.xaml.cs:1047`, favorites `:1131` |
| J-21 | Return-to-call from the bar | #1074; walked #1092–#1096 |
| J-22 | Contact-request tombstone, the app half | #970/#978 ignore list + un-block (walked #991 970.1–970.5); the protocol half is OUT (I-17) |
| J-23 | M13 i18n residual; Add contact / Add app stutter | #812/#821; #827 (GATE 54) |
| J-24 | "15 BE blockers" as a number | the rows are listed in T1 instead (be-cutover now says 17, with C16/W11 to come off → G-7) |
| J-25 | Mac call crash (missing mic/camera usage keys) | #1026 |
| J-26 | The history rewrite (attribution lines) | done 2026-10-01; the Mac re-sync is E-M2 |
| J-27 | H-7 Mac in v1 | ruled by #1098 (the channel = H-21) |
| J-28 | AND-30 "Add contact" offered for an existing contact | walked: #844 (row V1 PASS) and #839 |
| J-29 | AND-31 / 32 / 33 / 34 landscape rows | built #918; walked #922, #924 (AC.19 etc.) |
| J-30 | AND-35 | built Session U (#845) |
| J-31 | R7 share address | both legs: `home.html:2726`, `:2731` → `ixian:share`; `SettingsPage.xaml.cs:380` |
| J-32 | The wallet sync / block-height surface | built #444 (`setScanProgress`, `HomePage.xaml.cs:4330`) |
| J-33 | #532 additions "the menu batch · W10" | menu batch built #557 (Batch E); W10 legacy money pages: found #640, removed #642; #532's other items are C-1, B-1, G-6, H-2 |

## §K · Index by area

| Area | Rows |
|---|---|
| Security — ours | A-1 · A-2 · A-3 · A-4 · A-5 (+ O-08, O-09, O-11, O-27, O-32, O-34/35) · A-6 · A-7 · A-8 · A-9 · A-10 · A-11 · A-13 · A-14 · A-16 · A-17 · A-18 · F-5-SEC · G-6 |
| Security / money — BE | B-1 · B-2 · B-3 … B-9 · B-11 … B-22 · B-24 · A-15 |
| Release blockers in code | C-1 · C-2a · C-2b · C-2e · C-2f · C-2g · C-2h · C-2j · C-2k · C-4 · H-10 · A-19 |
| Crash-class and memory | D-3 · D-4 · D-5 · D-9 · A-8 · A-11 |
| Platform walks | E-OW · E-I · E-I2 … E-I7 · E-M · E-M2 · E-M3 · E-M4 · E-W · E-W2 · E-A · E-A2 · E-A3 · E-RV |
| v1 features | F-0b-a · F-0b-b · F-0b-d · F-1 · F-1b · F-2 · F-3 · F-4 · F-5a … F-5d · F-5-SEC · F-5b-a…e · F-6 |
| Endgame | G-1 · G-1t · G-3a … G-3e · G-4 · G-5 · G-7 · G-7b · G-8 · G-9a … G-9g |
| Decisions | H-2 … H-6 · H-8 · H-9 · H-11 … H-24 (H-1 = S12 measurement row; H-10 = S6 row; H-7 → J-27) |
| Retired IDs | A-12, D-6, D-7 → H-22 · B-23 → I-16 · F-0b-c → S2 (E-OW) |
