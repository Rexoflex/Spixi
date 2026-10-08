# Freeze-prep inventory — v1 (S12, 2026-10-08)

For Damir and the next session. Read-only cross-check of `docs/release-readiness.md` (§V, T1, T2, S6–S12, §I) against the DECISIONS walk rows
(#1084, #1114, #1146, #1172, #1200, #1211, #1227, #1243, #1252, #1260, #1266), the sheet summaries (`docs/walk-artifact-session5b-win-android.html`,
`docs/handoff-2026-10-07b.md` §2, `handoff-2026-10-07c.md` §2, `handoff-2026-10-08.md` §2) and the S12 rows #1265–#1267.

**Headline.** Windows + Android: almost every V row is walked; the page's "WALK owed" cells are stale for 15 rows.
**iPhone + Mac: no V row was ever walked.** The last office walk is **#1114** (recorded 2026-10-01: builds #1086 + #1093, 25 P · 0 F · 1 N/A),
before it #1084 (2026-09-30, 68 P · 11 F · 6 N/A; verdicts `docs/walk-verdict-office-2026-09-30.md`, `walk-verdict-mac-ios-2026-09-28.md`,
`walk-verdict-ios-office-2026-09-24.md`). The V list starts at #1137 → **the office walk will also be the first iOS + Mac compile of all C# from sessions 2–12**
(incl. the session-2 E-W1 AVAudio fix, S7 voice recorder, S9 `SClipboardImage` ×4 / camera / 4 photo encoders / A-14 Mac WebView handler, S11 `SHints` etc.).

Legend: **WALKED** = all its Win + Android sheet rows passed · **WALKED\*** = walked, named residual rows owed · **BUILT-owed** = no passing walk yet ·
**OPEN** = not built / not decided · **OUT** = moved out of v1. Platforms: W = Windows, A = Android, I = iPhone, M = Mac.

## 1 · V rows (36)

| ID | Criterion (≤ 12 words) | Page says | TRUE state (after the walk rows) | Owed on | Evidence |
|---|---|---|---|---|---|
| V-0 | P0: no message lost when a chat opens during Core write | BUILT, walk owed | **BUILT-owed** — rows V-0 (×5, legacy-iOS sender) + V-0-NEW were N/A at #1172 ("walk in the office"); never walked since | A (receiver) + legacy iPhone sender; I, M | #1160, #1162, #1172, #1173 (10) |
| V-0b | Windows modal under call ring keeps its WebView | BUILT, walk owed | **WALKED #1172** (row V-0b P, "#1161 closed") | — (Windows-only) | #1153, #1161, #1172 |
| V-1 | Speed levers kept/discarded on numbers; P-03, P-04, levers 7/12 | BUILT, WALK owed | **WALKED #1146 + #1172 + #1211** (W-PANE, W-PANE-CLOSE, W-SLIDE, W-CHATS, W-AVATAR, W-HIDE, A-OPEN, A-CALLBAR, A-CHATS; infopane 6B-W-INFOCLOSE-REC #1211); spare-after probe = data only (#1172: no fix) | I, M (P-1 "iPhone / Mac owed") | #1146, #1166, #1172, #1211 |
| V-2 | Lazy history: prepend older slice, no unread reset | BUILT, WALK owed (iPhone) | **BUILT-owed** on its named platform — A-LAZY, A-LAZY-UNREAD, A-LAZY-END P #1172 (Android); the iPhone momentum row never walked; B4 lever never decided | **I** (momentum scroll), M | #1142, #1166, #1172 |
| V-3 | Media tile opens the in-app viewer | BUILT, WALK owed | **WALKED #1172 + #1200** (W-VIEW F #1172 → P #1200; W-VIEW-NO, W-INFO-VIEW, A-VIEW, W-VIEW-OUT); BE B-28 | I, M | #1166, #1172, #1180, #1200 |
| V-4 | Group picker capped at 10; C# refuses > 10 | BUILT, WALK owed | **WALKED #1172** (W-GROUP P) | I, M (C# alert) | #1141, #1172 |
| V-5 | Capability answer + ask (getAppProtocols) | PARTLY, walk owed | **WALKED #1211 + #1227** (6B-A-OLDAPP, A-VOICE-OLD P; `cap answer rx n=3 voice=1` both sides #1227) | I, M | #1197, #1209, #1211, #1227 |
| V-6 | Reply-to quote, jump, swipe, hover, double-click | BUILT, WALK owed | **WALKED #1211** (6B-W-REPLY, -REPLY-OLD, -KEYS, 6B-A-SWIPE, 6B-A-OLDAPP) **+ #1227** (7B-STRIP, -QUOTE, -QUOTE-OLD, -DBL, -HOVER, -SWIPE, -BACK, -STRIP-A) | I, M | #1198, #1211, #1227 |
| V-7 | Edit own text: replace, "edited", old-app rules | BUILT, WALK owed | **WALKED #1211** (6B-W-EDIT, 6B-W-EDIT-RULES, 6B-A-EDIT, 6B-A-NOTIF-EDIT, 6B-A-OLDAPP) | I, M | #1199, #1211 |
| V-8 | Voice messages dual path, excerpt, mic slot | WALK #1211 PASS | **WALKED #1211 + #1227** (W-VOICE-*, A-VOICE-*, 7B-WAVE, A-VOICE-REC) | **I, M** (criterion says ×4; Mac/iOS AVAudio recorder never run) | #1209, #1211, #1227 |
| V-8b | Offline inline voice via push mailbox ≤ 30 s | WALK #1227 PASS | **WALKED #1227** (7B-F10, 7B-F10-REV) | I, M | #1225, #1227 |
| V-9 | Groups: "you were added", owner avatar, members position | WALKED #1243 (S9 walk owed) | **WALKED #1243 + #1252 + #1260** (8-GRP-*; 9-GRP-OWNER P, 10-OWNER P) | I, M | #1243, #1250, #1252, #1260 |
| V-10 | 6 quick reactions, allow-list display | WALKED (silent walk owed) | **WALKED #1243 + #1252** (8-REACT; silent = 9-REACT P) | I, M | #1243, #1248, #1252 |
| V-11 | Mini-app session accept / decline UI | WALKED (S9 walk owed) | **WALKED #1243 + #1252** (8-APP; 9-JOINED P) | I, M | #1243, #1250, #1252 |
| V-12 | Disappearing messages | OUT | **OUT** — #1230 (v1.1 with Core CORE-9) | — | #1230 |
| V-13 | Privacy: receipts off, typing off, hide online | WALKED #1243 | **WALKED #1243** (8-PRIV-RR, -TYPE, -ONLINE) | I, M | #1234, #1243 |
| V-14 | Photo picker + camera, EXIF strip, ≤ 2048 px, videos as files | WALKED #1252 (re-walk owed) | **WALKED #1252 + #1260 + #1266** (9-PICK-W, 9-PICK-A, 9-VIDEO, 9-BIG-SEND, 9-SENTCOPY; S10 10-STRIP-W/-A, 10-CAP; album 11-ALBUM) | **I, M** (×4: iOS camera text, Mac picker) | #1250, #1252, #1256, #1260, #1266 |
| V-14b | Paste image → C# reads clipboard → preview → send | BUILT, WALK owed | **WALKED\* (W)** — 9-PASTE P #1252, 10-STRIP-W P #1260 | **M** (desktop paste), I, A (criterion "all 4") | #1250, #1252, #1260 |
| V-14c | Multi-image ≤ 10, receiver groups into one bubble | BUILT, WALK owed | **WALKED\*** — 9-TEN, 9-PICK P #1252; 9-GRID-W F → 10-GRID F #1260 → **11-ALBUM P #1266**; old-app peer row (9-OLDAPP) not in any result list | old-app peer (A/W); I, M | #1250, #1252, #1260, #1266 |
| V-14d | Photo privacy: no GPS, bounded decode, rotation first | BUILT, WALK owed | **WALKED #1252** (9-EXIF P) for W/A encoders | **I, M** (their 2 encoders + ~100 MP cap never run) | #1250, #1251, #1252 |
| V-15 | Audit fixes (ours) C-01…C-04, H-3/H-13/H-14, A-6…A-14, A-19 | WALKED #1252 (re-walk owed) | **WALKED\*** — 9-BACKUP-W/-A, 9-MINIAPP, 9-BIG-SEND, 9-TIPS, 9-LANG (E2E / 12 h), 10-DL (A-6 part files) P; **9-MAC (A-14) N/A ×3** (#1252, #1260, #1266); A-13 (wrong-password restore) has no sheet row found | **M** (A-14 9-MAC); A-13 row on any platform | #1245, #1250, #1252, #1260, #1266 |
| V-16 | Onboarding copy on the Create screen | WALKED #1252 (re-walk owed) | **WALKED #1252** (9-CREATE, in the 9-LANG row group) | I, M (render) | #1246, #1250, #1252 |
| V-17 | Language note + "Report a translation problem" link | WALKED #1252 (re-walk owed) | **WALKED #1252** (9-LANG P) | I, M (mailto via MailCompose) | #1250, #1252 |
| V-18 | Polish picks H-15 / H-16 item by item | WALKED #1252 (re-walk owed) | **WALKED\*** — U-01/U-03/U-05/H-16 f P #1252; 9-HAPTIC F → 10-HAPTIC closed "works by design" #1260; **9-A11Y (TalkBack) N/A ×3** | A (9-A11Y TalkBack), I (VoiceOver, = E-I7), M | #1247, #1250, #1252, #1260, #1266 |
| V-19 | Quality: CodeQL, CI, isolation check, bridge contract, property tests | OPEN | **OPEN** — no row since #1140 | — | #1140 |
| V-20 | First release trains named | DONE | **DONE** (decision) | — | #1143 |
| V-21 | Session 6a fixes (viewer motion, tile heads, hover …) | WALKED #1200 1 F | **WALKED #1200 + #1211** (the 1 F W-GROUPTILE → 6B-W-GROUPTILE P #1211); W-BLIND N/A ×2 | I, M | #1200, #1211 |
| V-22 | Session 6 render picks + S9 part (Downloads dialog, caption, pane) | BUILT; WALK owed | **WALKED #1200 + #1211 + #1252** (W-AVATAR-LIVE, W-HEART, A-CARD, A-NOTAVAIL, A-DELETED; 6B-W-GRID9; 9-DL, 9-PANE, 9-PICK caption) | I, M | #1200, #1211, #1250, #1252 |
| V-23 | Contacts→Message stutter + chat-info close flicker | OPEN — recordings owed | **WALKED** (both REC rows P: A-STUTTER-REC #1200 with mechanism confirmed in logcat; 6B-W-INFOCLOSE-REC #1211) — no fix built; needs a DECISIONS row: close, or keep the #1187 hand-off fix as a candidate | — | #1187, #1194, #1200, #1211 |
| V-24 | Push-mailbox probe, light-dismiss across panes, reply excerpt | WALKED #1243 | **WALKED #1243** (8-PROBE, 8-BLUR, 8-BLUR-MODAL, 8-REPLY-ROW); 9-PROBE (30 min offline) N/A ×3 → CORE-10 draft stays | M (WKWebView blur across panes) | #1243, #1252, #1260, #1266 |
| V-25 | S8 picks: grounds, composer grow, recording wave, voice face | WALKED (8-GROW-A F) | **WALKED\*** — 8-GROW-A F → 9-GROW-A P #1252; 9-PLAYED P; **7B-REC N/A ×5** (#1227, #1243, #1252, #1260, #1266: needs another app's call) | A/W (7B-REC); I, M (×4) | #1243, #1250, #1252 |
| V-26 | A-FLASH: no white cold-start frame, no grey held-open frame | BUILT; walk 11-FLASH decides | **OPEN** — cold P #1252; 11-FLASH #1266: candidate holds, but 17 opens show ONE light-ground frame (21–34 ms); **Damir #1267: FIX it** (probe "Paint background at release" OFF, then fix; dark theme not recorded) | A (S12 walk) | #1252, #1260, #1266, #1267 |
| V-27 | S9 picks: privacy icons, silent reactions, photo excerpt, toggles | WALKED #1252 (re-walk owed) | **WALKED #1252 + #1260** (9-REACT, 9-TIPS, 9-PRIV; 9-EXCERPT F → 10-EXCERPT P) | I, M | #1248, #1252, #1260 |
| V-28 | S10 fix round + picks (strip, 50 MB cap, toasts, …) | WALKED #1260 13 P · 3 F | **WALKED #1260 + #1266** (10-GRID F → 11-ALBUM P; 10-FLASH → V-26; 10-HAPTIC closed by design #1260) | I, M | #1256, #1260, #1266 |
| V-29 | S11 fix round + design set | BUILT; WALK owed | **WALKED\* #1266** (18 P · 0 F) — owed: **11-VIEWER Save on Windows** (does nothing → S12 probe + candidate, #1267) · 11-UPDATE N/A (no newer version) · 11-LINE / 11-ART seasonal art on desktop N/A (date-driven) · 11-FLASH → V-26 | W (Save re-walk; seasonal art with the date set), I, M | #1264, #1266, #1267 |
| V-30 | #1263 picks: album, offer preview, viewer Save, P4, 2-step send | BUILT; WALK owed | **WALKED\* #1266** (11-SEND, -SEND-OVER, -SEND-SEP, -RECV, -SEND-A, 11-ALBUM, 11-AUTODL, 11-VIEWER) — owed: **11-OFFER** N/A ("auto load is not present on desktop" → walk phone↔phone) · keypad paste = new S12 build (#1267) | A (11-OFFER), W (paste), I, M | #1263, #1264, #1266, #1267 |

**Counts (36 rows):** WALKED **23** (V-0b · 1 · 3 · 4 · 5 · 6 · 7 · 8 · 8b · 9 · 10 · 11 · 13 · 14 · 14d · 16 · 17 · 21 · 22 · 23 · 24 · 27 · 28) ·
WALKED\* with residual rows **7** (V-14b · 14c · 15 · 18 · 25 · 29 · 30) · BUILT-owed **2** (V-0 · V-2) · OPEN **2** (V-19 · V-26) · OUT **1** (V-12) · DONE decision **1** (V-20).
**Page cells to correct (stale "walk owed"):** V-0b, V-1, V-3, V-4, V-5, V-6, V-7, V-9, V-10, V-11, V-14, V-16, V-17, V-22, V-23, V-27, V-28.
**iPhone + Mac:** 0 of 34 built rows walked on either. Rows that name ×4 platforms or one of them explicitly: V-0 (legacy iOS) · V-2 (iPhone) · V-8 · V-14 · V-14b · V-14c · V-14d · V-15 / A-14 (Mac) · V-25.

## 2 · T1 — the BE engineer's rows (+ CORE-n)

Formal "Blocks" on the page = **S12 (release)** for every row except B-20 (S2/E-I6). **None blocks the freeze tag (S6).** They block the
**handover / BE pack (S10: G-7, G-7b, B-2)** and release (S12). Risk note: an unapproved verb that BE later refuses changes frozen code — send group (a) before the tag if possible.

**(a) Approve our new bridge surface** (owner BE; 🟡 ASK; blocks handover S10 → release S12)
- B-25 — session 1: `jumpToMessage`, `setSharedItems`, `setDownloadSenders`, `ixian:sharedItems/sharedOpen/showDownloadInChat` (#1103–#1107).
- B-27 — session 2: `ixian:sharedShow`, `ixian:callRingtone` + `setCallRingtone`, G-6b thumbnail decode (#1118, #1121).
- A5-1124 — `setFileThumb` push + `ixian:photoPreviews` (#1124, #1135; S2b row, no B- number yet).
- B-28 — session 5b: viewer / shared-items verbs + pushes, prepend, 1600 px decode, local delete (#1166).
- B-29 — session 6b: `ixian:chatedit`, `ixian:quotejump`, reply/edit args, `getAppProtocols` answer, receive drop guard (#1197–#1199).
- B-30 — session 7: voice verbs/pushes, `getAppProtocols` ASK, inline voice text size (#1207–#1210).
- B-31 — session 9: camera / paste / media / haptic / reportTranslation / bootDropped, FileTransfer trailer, `localonly.json` + `Sent/`, A-14 handler, C-04 (#1248–#1250).
- B-32 — session 10: `ixian:mediaDrop`, `mediaDropped`, `setDownloadAvatars`, VIBRATE, `.partial`, 50 MB cap (#1256).
- B-33 — session 11: updateHelp / hint / hintsoff / photoAutoDl / devflash / savePhoto, `paintAck`, `setOfferPreview`, `FileTransfer.preview` ≤ 8 KB, auto-download limits 4 in flight / 50 MB per chat per day (#1262–#1264).
- **B-34 — NEW (S12, not yet on the page):** verb `ixian:hintHelp:<id>` + cap `hintHelp` (HomePage; C# whitelist {network} → Config URL `https://www.ixian.io`) · `ixian:rating:yes` on SettingsPage + cap `rate` (Android / iOS; the HomePage grammar, no new verb name) · log lines `[P1] savephoto r=<code>`, `[P1] winground`, the hold-grounds probe lines (codes only) (#1265, #1267).

**(b) Core patches** (owner BE; Core stays clean in v1, #1137)
- B-15 / **CORE-8** `getMessages` replaces the channel list (8a/8b/8c) — V-0 is our mitigation; Core fix blocks S12.
- **CORE-9** real row delete — v1.1 (I-V1, #1230); not a blocker.
- **CORE-10** ⚠ two meanings: (i) be-cutover `handleMsgDelete` authorship (OPEN, logged); (ii) the push-mailbox remove draft (#1229) — stays a DRAFT until a 30-min-offline capture (9-PROBE N/A ×3). Rename one before the BE pack.
- B-11 Q1-ESC bot-room sender identity · B-13 CORE-1 kick/ban · B-14 CORE-4 channel 0 · B-16 reaction membership check · B-24 "missing encryption keys" retry noise (seen again #1200, #1227) — all S12.
- B-17 CORE-14 `sendData` dedup race — PARTLY, local patch uncompiled · B-18 CORE-15 forged-message test — OPEN · B-19 CORE-13 / CORE-16 / #962 guard — PARTLY (local `docs/core-patches/962-accept-null-guard.patch`).
- B-20 CORE-12 group typing — **v1.1 by #1137** (page still shows OPEN / H-8 OPEN). A7 lastMessage after delete — v1.1 (#1137).

**(c) Legacy / decisions** (owner BE unless named)
- B-1 money-path review §1c or cap gate on `composeSend` — S12.
- B-3 Android mini-app `AllowFileAccessFromFileURLs` · B-4 `OnPermissionRequest` · B-6 L2 `UrlDecode` `+` · B-7 `app.id` validation · B-8 mini-app `t` field · B-9 H-7/H-8/H-10/G-I-1 (+ `provider_paths.xml` narrowing, BE per #1245/H-19) — S12.
- B-5 cleartext `walletpass` — CLOSED for v1 (v1.1, #1165).
- B-12 N57 repro protocol — S12 (measurement).
- B-21 server-side mute · B-22 busy-reason flag — **v1.1 by #1137** (H-24 stale).
- B-26 fiat feed from NonKYC midpoint — server side, S12.
- B-2 BE security walkthrough with Damir — S10 (never held). A-15 `NSAllowsArbitraryLoads` — BE/Damir, S12. P-1b iOS `UseInterpreter` — BE question + office A/B.

## 3 · T2 — Damir's rows still open

Page states corrected from DECISIONS where a later row decided them (page update owed in S13).
- **H-3 / H-13 / H-14** — page says PARTLY/OPEN; **decided #1245, built #1250, walked 9-BACKUP-W/-A #1252** → mark DONE.
- **H-8, H-24** — page OPEN; **decided v1.1 by #1137** → mark DECIDED (E-I6 + B-20/21/22 leave v1).
- **H-15, H-16** — decided #1247 (U-06, H-16 a/c → v1.1; D-06, H-16 b/d/e = device checks only) → DECIDED; device checks owed in the office walk.
- **H-18, H-19** — decided #1245 (A-10 "End-to-end encrypted"; A-6 ours, provider_paths → BE) → DECIDED.
- **H-22** — C-01…C-05 v1 (#1137, built #1250); P-02…P-04 = V-1 (#1166); S-05 v1.1 (#1137); **R-01 xUnit project still undecided**.
- **H-23** — superseded by #1137 / #1230–#1233 (V-9, V-10, V-11 in v1; rename + full picker v1.1) → close.
- Still OPEN, one line each:
  - H-4 — delete-account purge walk row on the release candidate (S12).
  - H-5 — old dials R3 / R6 / AND-24 / AND-39 / M17 / privacy shield (blocks S5; no row since 09-07).
  - H-6 — gate dials O-01…O-41 (blocks S10).
  - H-10 — the 2 KNOWN smoke failures (#136 · B3): fix or accept (blocks S6 freeze).
  - H-17 — counsel's Terms of Use read recorded (S12; #1165).
  - H-20 — PRE-2 Account as a real tab: refactor pick or v1.1 (S5).
  - C-2k — the KEEP set of probe tags (blocks S6).
  - S12 opens from #1265/#1267: tip 2 held until the new site has an E2E page · `docs/website-help-brief.md` for the new site · offer previews in memory only (persist = v1.1?) · E-M2 Mac clone re-sync confirmation.

## 4 · Path to the freeze (as agreed 2026-10-08) and after

1. **S12 walk (W + A)** — S12 build: V-26 probe → fix (one ground frame, light + dark recorded) · Windows Save probe + candidate · keypad paste A · tips 1/3/4 + `ixian:hintHelp` · About B + How to use A · desktop resize band candidate (light AND dark rows) · re-walk residuals: 11-OFFER (phone↔phone), 11-UPDATE (if a newer build exists), 11-ART desktop with the date set, 7B-REC, 9-A11Y (TalkBack), 9-OLDAPP / V-14c old-app peer.
2. **S13** — S12 fix round · the introduced-vs-inherited security sweep (`docs/security-handover-gate.md`, S11 + S12 rows first: B-33, B-34 verbs, auto-download, `FileTransfer.preview`, the new log lines) · page update (§1, §3 corrections; B-34 row) · freeze checklist sign-off (§5).
3. **Office walk iPhone + Mac** (wipe `obj`/`bin`; first iOS/Mac compile of sessions 2–12 C#). Must cover:
   - **Every V row** (all 34 built rows; none was walked on I/M) — priority: V-0 (×5 legacy-iOS sender + V-0-NEW) · V-2 (iPhone momentum) · V-8 / V-8b (AVAudio record + play, Mac + iPhone) · V-14 / 14c / 14d (iOS camera + picker, EXIF on the iOS/Mac encoders, ~100 MP cap) · V-14b (Mac paste) · V-15 A-14 (row 9-MAC: mini-app scroll + links) · V-24 (WKWebView blur across panes, Mac) · V-25 (×4) · V-26 cold start on iPhone · V-29 / V-30 (viewer zoom, Save to Photos, 2-step send, hints, seasonal bar) · V-18 VoiceOver.
   - Session-2 office rows never walked: E-W1 (6 calls + 2 min idle, no crash) · E-W2 / G-2 office rows · E-W4 Mac ring · E-W5 ring-card square · E-W6 blue unread time · E-W7 Mac title × 6 theme combos · E-I3 / E-I4 call + lock · E-I5 menu growth · E-I7 VoiceOver (or ruled optional) · D-9 re-check.
   - Security device tests: A-1 (`ixian:openLink:javascript://x` on iOS + Mac) · A-4 Mac dev-tools line · A-18 F-06 / F-07 · P-1 iPhone/Mac numbers · P-1b UseInterpreter A/B · D-5 30-min Instruments (or schedule).
4. **Fix round** for the office fails (mechanism first).
5. **Freeze tag** `freeze-v1` (G-1 + G-1t; Damir tags).
6. After the freeze: S7 characterization (G-3d `audit-baseline.mjs`; the cold-start stall probe, #1267) → S8 refactor picks (G-4) → S9 strip (G-5, A-5.O-27) → S10 gate re-run + BE pack (G-6, A-5, G-7, G-7b, B-2, T1 group a) → S11 merge (G-8) → S12 release builds, TestFlight / stores (C-4, E-*2, G-9a…g, H-1, A-15).

⚠ Order check vs the page: S4 (G-3a/G-3b sweep docs) and S5 (G-3c inventory + G-3e decisions) sit BEFORE S6 on the page and are all OPEN (`docs/audit/architecture-map.md`, `security-verification.md`, `refactor-inventory.md` absent). Damir must either run them in S13 or move them after the tag by a DECISIONS row.

## 5 · Freeze checklist (S6 rows + the pre-freeze gates; the skill `spixi-finalization-checklists` has no separate freeze section — its §1 UI audit (S4), §4 copy check and §5 delete audit (S5) feed it)

- [ ] **C-1** `maxLogCount = 1` + RELEASE BLOCKER marker gone — still `5` (`Spixi/Meta/Config.cs:103`, marker `:84`). Damir, at the tag.
- [ ] **C-2a** 0 `[CDPERF]` — 15 source files still emit (grep `Spixi/` + `src/`).
- [ ] **C-2b** 0 `[SCROLL]` — 8 files.
- [ ] **C-2e** 0 `[EXCERPTDIAG]` — 1 file.
- [ ] **C-2f** 0 `[KBDIAG]` / `[M5]` — 2 / 4 files.
- [ ] **C-2g** `[M6]` removed or kept by a row — 1 file.
- [ ] **C-2h** 0 `[CALLSWAP]` — 1 file (F-0b-a measured? no closing row found).
- [ ] **C-2j** `[LOCKDIAG]` + `SPIXI_DEV_COEXIST` retired or kept — 2 files.
- [ ] **C-2k** Damir's KEEP list of the other probe tags — no list.
- [ ] **C-2l** the `[P1]` set retired with its probes — 27 source files carry `[P1]` (S11/S12 added more: hold, savephoto, winground, haptic, push fetch); needs a KEEP/retire decision per probe (several are dev-gated).
- [ ] **H-10** the 2 KNOWN smoke failures fixed or accepted.
- [ ] **G-1** final smoke count locked WITH the Core sibling (now 5664 / CSH 336, S11) + a DECISIONS freeze row + a full-app #46 loop CLEAN.
- [ ] **G-1t** `freeze-v1` + `pre-strip` tags free on origin; tag + baseline artifacts (bundle size + hash, shell hashes, smoke output, HEAD).
- [ ] **Every V row WALKED or OUT** (§1: 11 rows still owe W/A work — V-0, V-2, V-14b, V-14c, V-15, V-18, V-19, V-25, V-26, V-29, V-30; all 34 built rows owe I/M).
- [ ] **V-19** quality items (CodeQL · CI · isolation check · bridge contract file · property tests) — OPEN.
- [ ] **G-6 / security sweep** introduced-vs-inherited over the delta from `0e85a4b8` (S13; the formal re-run is S10).
- [ ] **G-3e** every T2 row marked "blocks S5/S6" has a decision row — open: H-5, H-20, H-22 (R-01), H-10, C-2k (H-3/H-13/H-14 decided #1245).
- [ ] **G-3a / G-3b / G-3c** sweep docs + refactor inventory with stop rule — absent (or moved after the tag by Damir).
- [ ] Skill §4 copy and claims check over S11/S12 copy (hints, About, update card; the site's "No servers" / unconditional PQ claims stay out of the app, #1265).
- [ ] Skill §1 UI audit (both themes, a11y, 13 locales) — last full run not found; 9-A11Y never walked.
- [ ] Damir confirms E-M2 (Mac clone re-synced) before the office build.
- Note (not a freeze item): C-4 version bump is S12; still `0.9.22` (`Spixi.csproj:45`, `Config.cs:46`).
