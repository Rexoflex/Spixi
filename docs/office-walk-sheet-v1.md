# Office walk sheet — v1, iPhone + Mac

Created S13, 2026-10-09. Source: `docs/freeze-inventory-2026-10-08.md` §1 + §4 step 3, `docs/release-readiness.md` §V (V-31, V-32) / S2 / S3.
Updated S15 (§5), S16 (§6), **S20 (2026-10-14): the "Session 20 update" section below + §7–§13** (every iPhone / Mac row owed from S17 → S20 and ON-1).
This is the **first iOS + Mac compile of the C# from sessions 2–20** and the first I/M walk of any V row (the last office walk is #1114).
Platform: **I** = iPhone · **M** = Mac (Catalyst) · **both** = walk on each, write two results (e.g. "I P · M F").
Fill P / F / N/A. Paste the iPhone + Mac logs with the results. Each fail → mechanism first (#294), then the fix round, then `freeze-v1`.

**Set-up (before row B-1).** Peer devices on the S13 build: one Android phone + the Windows PC. One device with the LEGACY Spixi (store build, iOS)
for V-0. Test data: a chat with > 200 messages, a group you own, a photo with GPS in EXIF, a > 20 MB photo, a mini-app.
(S20: the peers run the S20 build now — see the set-up line in the Session 20 update.)

## Session 20 update (2026-10-14)

Damir (#1375, 2026-10-13 16:2x): "once we are done, all that remains is the macOS and iOS walks before the next pre-launch steps".
After the S20 Android + Windows walk round, **this sheet is the only walk left** before S21 (privacy levels) → the perf levers → the freeze.
Walk everything on ONE build: the S20 commit (after Damir's A + W walk round). Rows marked "superseded by #N" or "merged into <ID>" are kept for the record; do not walk them.

### Summary — rows to walk (superseded / merged / N/A rows not counted)

| Section | Session | Rows | I only | M only | both | I legs | M legs |
|---|---|---|---|---|---|---|---|
| S20-B | Session 20 BUILD | 3 | 0 | 1 | 2 | 2 | 3 |
| §0 | BUILD (S13) | 2 | 0 | 0 | 2 | 2 | 2 |
| §1 | Priority V rows (S5–S13) | 26 | 9 | 5 | 12 | 21 | 17 |
| §2 | Other V rows (S5–S13) | 17 | 0 | 0 | 17 | 17 | 17 |
| §3 | Session-2 rows | 12 | 4 | 5 | 3 | 7 | 8 |
| §4 | Security device tests (S3) | 8 | 4 | 1 | 3 | 7 | 4 |
| §5 | S14 / S15 (I / M legs only) | 2 | 1 | 0 | 1 | 2 | 1 |
| §6 | S16 (I / M legs only) | 3 | 0 | 1 | 2 | 2 | 3 |
| §7 | S17 | 19 | 4 | 0 | 15 | 19 | 15 |
| §8 | S18 | 13 | 2 | 4 | 7 | 9 | 11 |
| §9 | S19 | 9 | 1 | 2 | 6 | 7 | 8 |
| §10 | sq-al | 8 | 4 | 1 | 3 | 7 | 4 |
| §11 | DT-1 (+ r2) | 14 | 2 | 12 | 0 | 2 | 12 |
| §12 | S20 | 25 | 6 | 2 | 17 | 23 | 19 |
| §13 | ON-1 | 19 | 3 | 2 | 14 | 17 | 16 |
| | **Total** | **180** | **40** | **36** | **104** | **144** | **140** |

"I legs" = I only + both; "M legs" = M only + both (a "both" row = one result per platform). Of the 180 rows, 110 are new in S20 (S20-B + §7–§13); 70 were owed before (§0–§6).
Not counted: 6 rows superseded / merged on this sheet (B-0, B-1, V-15 A-13, V-16, the I / M legs of S15-BUILD and S16-BUILD) · 2 N/A rows (V-0b, V-32) · the A / W-only rows of §5 / §6 (kept as the A + W record).

### What changed since S16 that the office walk must cover

| Session | DECISIONS | What the walk covers on I / M | C# compiled on I / M for the first time |
|---|---|---|---|
| S17 | #1331–#1358 · V-33 | What's new card · About / Contributors header + status-bar ink (P26) · Chat appearance v3 (7 canvases, bubble colours, corners) · the S17 art · Downloads / Contributors / Delete data · the address card · the seven Moment sheets (P28) · sender name ON by default | `S17Rules.cs` · `S17MomentRules.cs` · `SMoments.cs` (new) · `HomePage` · `SettingsPage` · `SingleChatPage` · `ContactDetails` · `SpixiContentPage` · `SpixiFlags` · `DevPage` · `SNotificationPrefs` |
| S18 | #1359–#1367 | Add app · Add contact · New group · the S17 walk fixes (desktop pattern, peer address card, theme sync, Tips card, desktop About bar, heart, moment reset) | `SMoments` · `S17MomentRules` · `DevPage` |
| sq-al | #1368 | Albanian (14 languages), native confirm + amount grouping | `SpixiLocalization.cs` · `Utils.cs` |
| S19 | #1369–#1374 | The S18 walk fix round (pattern on the first chat, Add contact close, offline moment, language moment per language, install moment, link offline text, apps hover, reset toast, autodl flash, blind-group notice, picker pill, transfer line) | `SMoments` · `S17MomentRules` · `AppDetailsPage` · `SpixiContentPage` · `MiniAppManager` · `S19FetchRules.cs` (new) |
| DT-1 · r2 | #1380–#1394 · V-34 · V-35 | Desktop chat list on the Mac (Pinned / Chats sections, fold, hover buttons, inset rows, the 2 px gap + pinned hover, List density); the phone list unchanged + the swipe sides swapped. The Windows title bar is Windows only (N/A on M); the Mac title strip is v1.1 (#1382) | `App.xaml.cs` · `ThemeManager.cs` · `SpixiFlags` · `DevPage` · `DtTitleBarRules.cs` (shared) — `DtTitleBar.cs` + `Platforms/Windows/App.xaml.cs` are Windows only |
| S20 | #1374–#1379 · #1394–#1395 · #1400–#1404 · #1440–#1441 | A composer ↔ list motion (iOS keyboard, `--composer-lift`, the keyboard ↔ tray hand-off) · B sent meta 0.7 · C app tap = details, Run · D dark grounds + incoming bubbles · E file size (P29 flag) · F message formatting (iOS keyboard / IME, Cmd+B / I / Shift+X on the Mac) · G notice ink, one tab stop, install moment exempt · I hub toggle inset · J payment / file / app card layout + wallet faces and day groups · H5 title-bar ways deleted | `SingleChatPage` · `S11MediaRules` · `SpixiFlags` · `DevPage` · `SMoments` · `S17MomentRules` · `LinkRule` · `S20FormatRules.cs` (new, unwired) · `DtTitleBarRules` · `App.xaml.cs` · `ThemeManager` |
| ON-1 | #1420–#1422 | The launch flow: two-step create, restore on one screen, BG 2 / CARD 2, rings layer, pill P2, slide 3, Sora latin-ext (launch only), the welcome legal line, the iOS keyboard on both create steps + restore, the iOS swipe back from step 2, the desktop two columns ≥ 900 px on the Mac | none (step-2 back without C#, #1421) |

Not on this sheet (nothing to walk on I / M): the notification strip (`S20FormatRules.Strip` is unwired, review brief §1) · RTL "n / 10" (no RTL locale ships; pins only) · the Windows title bar rows DT-TB-* / DT2-TB-* and CLOSE-W (Windows only) · the #1441 C# asks (not built) · the S16 rows S16-F1 / F2 / F3 / F5 / M9 / RESTOREB / THEME / REARM / HOLD / STRIP / PSS / L8-FLAG / L8-RETRY (A / W by design, §6).

**Set-up (S20).** Peers on the S20 build: the Android phone + the Windows PC. Developer mode ON on the iPhone and the Mac (Account › Developer). Add the Japanese (Kana) keyboard on the iPhone (Settings › General › Keyboard › Keyboards). Extra test data: a 2–3 MB PDF on the peer · a link to a mini app that the iPhone / Mac does NOT have · a blind group · a contact with a very long name and one with no name · the Android peer with ≥ 1 IXI to send.
Logs: the Xcode console for the iPhone and the Mac. Grep `[FLAGS]`, `[L8]`, `[MO]`, `[THEME]`, `[KBTRAY]`, `refused`, `DENIED`.
Moment rows (`MO-*`): Developer › Reset moment sheets (the Release flags card), then restart the app, before EACH row (one moment per session).

**Walk order** (the account is deleted twice; chats do not come back from a backup, #1420):
1. S20-B0 → S20-B2. Do NOT delete the account before S20-B2: the first start of the S20 build is S16-L8-MIG.
2. On the existing account: §1–§4, the I / M legs of §5 / §6, then §7–§12.
3. Account › Backup: make a backup file. Keep it and its password (the restore rows need it).
4. Account › Delete data… › Delete account → §13 create rows (ON-C1 … ON-C4) → S16-L8-NEW → S17-WN · S17-NT-SENDER · S17-MO-IXI.
5. Delete the account again → §13 restore rows (ON-R1 … ON-R3) → A-17 (the zip-slip backup).

### S20 · BUILD

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| S20-B0 | M | 1) Run `git status --short`. 2) If it lists changes, run `git stash`. 3) Run `git fetch origin`. 4) Run `git log --format=%h --grep="Claude-Session" \| wc -l`. 5) If step 4 is above 0, or `git log --oneline -3` shows a merge commit, run `git reset --hard origin/redesign/frontend`. 6) Run step 4 again. 7) Run `git status -sb`. 8) If you stashed in step 2, run `git stash pop`. | 6: `0`. 7: `## redesign/frontend...origin/redesign/frontend`, no ahead / behind. Never `git push` from a clone with the old history. | | E-M2 · CLAUDE.md ★ MAC RE-SYNC (still open) · = B-0 · tell Claude when every clone is re-synced (the reminder is then removed) |
| S20-B1 | both | 1) Run `git pull --ff-only`. 2) Run `git log -1 --oneline`. 3) Delete `Spixi/obj`. 4) Delete `Spixi/bin`. 5) Do a plain build (not incremental) for the target. | 2: the S20 commit (after the A + W walk round). 5: the build succeeds; no new warning class. Paste any error with file:line. | | #320: an incremental build does not repackage Raw html · first I / M compile of the S2–S20 C# (table above) |
| S20-B2 | both | 1) Keep the existing account (do not delete it). 2) Start the app. 3) Read the first-start log. 4) Open a chat. 5) Open the Apps tab. | 3: one `[FLAGS] securepass=1 mediagate=1`, one `[FLAGS] s17bridge=1`, one `[FLAGS] s17moments=1`, one `[FLAGS] s20filesize=1`; `[L8] store=secure … migrated=1` (→ write it in S16-L8-MIG). 4: the composer has the "Aa" toggle (only this build, #1378). 5: each app tile has a round Run button, no ⋮ (only this build, #1377 C). | | replaces the I / M legs of S15-BUILD, S16-BUILD, S17-BUILD and the S18 / S19 / sq-al / DT-1 build rows · ⚠ Mac `migrated=0` + `migrate kept plaintext` = no keychain access (#1323) |

**Superseded / merged by this update (13):** B-0 → S20-B0 · B-1 → S20-B1 (#1375) · S15-BUILD (I M) → S20-B1 · S16-BUILD (I M) → S20-B1 / B2 · V-16 → ON-C1 / ON-C2 (#1420–#1422) · V-15 A-13 → ON-R2 (#1323, #1421) · the V-31 About half → S17-ABOUT-I / S18-DC-DESKTOP (#1332, #1362) · the S17 CA-CANVAS dark values + S19 DB-DARK → S20-D (#1377 D, #1403) · S17 NOTICE → S20-G1 (#1379) · S19 MO-APP-INSTALL → S20-G4 (#1379) · S19 NG-PILL → S18-NG-LIMITS · S19 AA-OFFLINE → S18-AA-LINK · DT-MOBILE-SAME + DT2-PHONE-SAME → DT-PHONE-SAME. (Only B-0, B-1, S15-BUILD, S16-BUILD, V-16, V-15 A-13 were rows on this sheet; the others were A / W rows that come here merged.)

## 0 · BUILD

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| B-0 | M | 1) Run `git log --format=%h --grep="Claude-Session" \| wc -l`. 2) Run `git status -sb`. | `0`; `## redesign/frontend...origin/redesign/frontend`, no ahead / behind (E-M2). | merged into S20-B0 | |
| B-1 | both | 1) Pull the S13 commit. 2) Delete `Spixi/obj` and `Spixi/bin`. 3) Do a plain build (no incremental). | Build succeeds; no new warning class. Paste any error with file:line. | superseded by #1375 → S20-B1 | the walk runs on the S20 build |
| B-2 | both | 1) Run the app. 2) Open Account › About › Why Spixi. 3) Look at the "End-to-end encrypted" row. | The row shows the title only — no second line "Only the person you write to…" (S13 only, #1269 (1)). | | still a valid check; it no longer proves a clean build (S20-B2 does) |
| B-3 | both | 1) Open a chat with a photo. 2) Look at Account › How to use Spixi. | Album mosaic and How to use A render (S12 shells packaged). | | |

## 1 · Priority V rows (inventory §4 step 3 order)

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| V-0 ×5 | I | 1) Put the iPhone app in the background. 2) Legacy-iOS peer sends 2 messages fast. 3) Tap the 2nd notification. 4) Look, go back, reopen. 5) Repeat 5 times. | Both messages shown every time, also after reopen. Paste `[P0]` lines. | | receiver = the S20 build |
| V-0-NEW | I | 1) Repeat V-0 once with the Mac (S20 build) as sender. | Both messages shown, also after reopen. | | |
| V-2 | I | 1) Open the > 200-message chat. 2) Scroll up slowly to the top. 3) Flick fast through 2 pages (momentum). | Older rows load before the top; small spinner; no jump; the row under the finger stays; unread not reset. | | iPhone momentum = the owed row |
| V-2 | M | 1) Open the > 200-message chat. 2) Scroll to the top with the trackpad. | Older rows prepend; no jump. | | |
| V-8 | both | 1) Hold the mic, record 5 s, send to an Android peer. 2) Play the peer's reply. 3) Slide to cancel once. | Live wave while recording; sending ring; clip plays; cancel sends nothing. No crash (AVAudio recorder first run). | | the mic moment may show first (S17-MO-MIC) |
| V-8 file | both | 1) Send a voice clip into a group. | Arrives as an audio file; excerpt "🎤 Voice message (0:0n)". | | dual path |
| V-8b | both | 1) Close the app on the peer. 2) Send a 25 s inline clip. 3) Open the peer app. | The clip arrives through the push mailbox; the tick claims only the hand-off. | | |
| V-14 | I | 1) Attach › Photos, pick 3 photos. 2) Attach › Camera, take one. 3) Send all. | Picker + camera open (camera permission text correct); preview sheet; photos arrive ≤ 2048 px. | | |
| V-14 | M | 1) Attach › Photos, pick 2 photos. 2) Attach a video. | Mac picker opens; photos send; the video goes as a file with the location note. | | |
| V-14c | both | 1) Pick 10 photos and send. 2) Look on the Android peer. | One album bubble on both sides; mosaic laid out right; > 10 refused. | | |
| V-14d | both | 1) Send the GPS photo as a photo. 2) Check EXIF on the peer's saved copy. 3) Send the > 20 MB photo. | No GPS / metadata; rotation right; the big photo decodes bounded (no crash, no memory kill). | | iOS + Mac encoders, ~100 MP cap |
| V-14b | M | 1) Copy an image in Preview. 2) Press Cmd+V in the composer. 3) Send. | Preview sheet opens; the image sends; no file named by the WebView. | | |
| V-14b | I | 1) Copy a photo in Photos. 2) Long-press the composer, Paste. 3) Send. | Preview sheet opens; the image sends. | | |
| V-15 A-14 | M | 1) Open a mini-app. 2) Scroll its page. 3) Tap an http link inside it. | Scroll works; the link does not navigate the mini-app WebView (A-14 handler, row 9-MAC). | | N/A ×4 on W/A |
| V-15 A-13 | both | 1) Restore a backup with a WRONG password. 2) Then restore with the right one. | Wrong password: error, lock setting untouched. Right password: restore works. | merged into ON-R2 / ON-R3 | #1323: both restore paths open the wallet BEFORE any write; the launch restore is ON-1 now (#1421) |
| V-24 | M | 1) Open the chat-info pane and a menu. 2) Click inside another pane. | The menu closes (light dismiss across WKWebView panes); no stuck dim. | | |
| V-25 | both | 1) Reply to a message, then Edit one. 2) Record a voice clip. 3) Look at chat grounds in both themes. | Composer grows on Reply / Edit; live wave; voice bubble face + mic badge; grounds match the theme. | | ×4 platforms · the grow is by transform now (S20-A2, #1378); the dark grounds changed (S20-D) |
| V-26 cold | I | 1) Force-quit. 2) Start the app, record the screen. 3) Repeat in dark theme. | No white frame at cold start. | | |
| V-26 open | I | 1) Record the screen. 2) Open 10 chats from the list. 3) Repeat in dark theme. | No blank or grey frame between the list and the chat. | | the S13 fix is Android-only; check iOS |
| V-29 viewer | both | 1) Open a photo in the viewer. 2) Pinch / scroll zoom, page left and right. 3) Tap Save. | Zoom + paging work; Save opens the system share sheet (I + M: C# `SFileOperations.share`, `SingleChatPage.xaml.cs:7792`); on I "Save Image" there adds it to Photos. | | S20: expected text corrected to the code (was "adds to Photos (I) / save dialog (M)") |
| V-29 hints | both | 1) Reset hints (Settings). 2) Restart. 3) Read the tips; tap "Learn more" on tip 1. | Tips 1 / 3 / 4 + 5–9 show once each; tip 1 opens https://www.ixian.io (`ixian:hintHelp`); no tip 2. | | V-31 too · the Tips switch is in Notifications now (#1362 (4)) |
| V-29 season | both | 1) Set the device date to 31 Oct. 2) Open the app. 3) Set 24 Dec. 4) Set the date back. | Seasonal top bar art on each date; the normal bar after reset. | | desktop N/A on W |
| V-29 update | both | 1) Open the update card (if a newer build is listed). | Glass card; the link opens `download.html`. | | N/A if no newer version |
| V-30 send | both | 1) Wallet › Send, 2-step amount. 2) Try Use max, then over balance. 3) Paste "1.5". 4) Review, cancel at native confirm. | Over-balance refused; paste fills 1.5; Review + native confirm shown; nothing sent. | | the first Review shows the Pay moment (S17-MO-PAY) |
| V-30 offer | I | 1) With auto-download Off, receive a photo offer from Android. | Blurred preview (≤ 8 KB) from a contact; tap downloads. | | the autodl moment may show (S19-MO-AUTODL) |
| V-18 | I | 1) Turn VoiceOver on. 2) Move through chats list, a chat, the composer. | Every control has a spoken name; no trap. (= E-I7) | | or ruled optional · S20: the Aa toggle + format bar, the Run button and ON-1 too |
| V-18 | both | 1) Check H-16 b / d / e and D-06 in dark theme: group avatar height, sheet step, canvas layers. | No visible defect. | | device checks, #1247 |

## 2 · Other built V rows (one pass each)

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| V-0b | — | — | Windows-only. | N/A | |
| V-1 | both | 1) Open 5 chats from the list. 2) Open and close chat info. 3) Start a call, look at the call bar. | Chat open feels instant (< 100 ms); no full list rebuild flicker; avatars appear; pane opens / closes smoothly. Paste `[P1]` / `[CDPERF]` lines. | | P-1 numbers |
| V-3 | both | 1) Tap a media tile in a chat. 2) Tap one in chat info. 3) Click outside the viewer (M). | The in-app viewer opens with the local image; outside click closes (M). | | |
| V-4 | both | 1) New group, pick 10 contacts. 2) Try an 11th. 3) Untick one. | "n / 10"; at 10 the cap line, other rows dimmed; "9 / 10" after untick; C# alert if forced. | | the picker text is #1361 now (S18-NG-LIMITS); this row keeps the C# alert |
| V-5 | both | 1) Open a chat with an old-app peer. 2) Open a chat with a new-app peer. | Reply / edit / voice offered only to the new app; log `cap answer rx`. | | |
| V-6 | both | 1) Reply from the menu. 2) Swipe right (I) / hover button + double-click (M). 3) Tap the quote. | Quote box; jump to the original; strip closes on Back. | | |
| V-7 | both | 1) Edit an own text message. 2) Look on the peer. | Text replaced, "edited", original time kept; no push for the edit. | | |
| V-9 | both | 1) Add the iPhone to a group from the peer. 2) As owner, change the group avatar. | "You were added" notice; avatar changes; members position right. | | |
| V-10 | both | 1) React with each of the 6 quick emoji. 2) Look on the peer. | One reaction per person; silent (no push). | | |
| V-11 | both | 1) Receive a mini-app session invite. 2) Decline one, accept one. | Accept / decline UI; "Joined" + "Open again". | | the card has no header now (S20-J4) |
| V-13 | both | 1) Turn read receipts, typing, online status off. 2) Chat with the peer. | Peer sees no read tick, no typing, no online dot. | | |
| V-16 | both | 1) Start a fresh install to the Create screen. | Onboarding copy renders, no overflow, both themes. | superseded by #1420–#1422 → ON-C1 / ON-C2 | the create screen is the ON-1 two-step flow |
| V-17 | both | 1) Pick a non-English language. 2) Tap "Report a translation problem". | Note shown; mail compose opens (MailCompose). | | |
| V-21 | both | 1) Open a group media tile. 2) Scroll a chat while a menu is open. | Viewer motion smooth; no menu on scroll; hover kept (M). | | |
| V-22 | both | 1) Open Downloads (M: dialog). 2) Look at a deleted bubble and a heart count. | Downloads dialog B (M); deleted / not-available cards; heart beside count. | | |
| V-23 | both | 1) Contacts › a contact › Message. 2) Open and close chat info. | No stutter on Message; no flicker on close. | | |
| V-27 | both | 1) Look at privacy icons and toggle cards. 2) Send a photo; read the chats-list excerpt. | Icons A; toggles B; excerpt "Photo" / "{n} photos" / caption. | | |
| V-28 | both | 1) Attach strip; send > 50 MB file. 2) Download all in an album. 3) Trigger a toast. | Strip A; 50 MB cap message; Download all works; toast readable. | | |
| V-31 | both | 1) Open About (B) and How to use (A). 2) Tap Rate (I). | About hero card + rows render; How to use opens; Rate opens the store sheet (I). | | Rate N/A on M · the About header half is superseded by #1332 → S17-ABOUT-I (I) / S18-DC-DESKTOP (M); walk How to use + Rate here |
| V-32 | — | — | Windows resize band only. | N/A | #1272 |

## 3 · Session-2 office rows never walked (S2)

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| E-W1 | both | 1) Make 6 calls: answer, talk 10 s, hang up. 2) Leave the app idle 2 min. | No crash (no SIGSEGV in `AVAudioNode dealloc`). | | #1118 fix, first run |
| D-9 | M | 1) Call the Android peer, then let it call you. | Timer runs past 0:00 both ways; no "format mismatch" in the Mac log. | | re-check |
| E-W2 | both | 1) Open a chat. 2) The peer changes its avatar. | Header avatar (and open chat info) updates. | | |
| G-2 | both | 1) Restart the app. 2) Open a contact not seen since start. | "last seen …" from the saved sighting or the newest message; nothing if never seen. | | |
| E-W4 | M | 1) Let the peer call the Mac. 2) Turn "Call ringtone" off, repeat. | The Mac rings; no ring when off. | | |
| E-W5 | M | 1) Receive a call, look at the BIG ring card. | No square behind the card (blur clipped to the radius). | | |
| E-W6 | M | 1) Receive a message in a closed chat. 2) Look at the chats row. | The unread time is blue. | | Web Inspector line if grey |
| E-W7 | M | 1) Set app theme Light / Dark / System × macOS Light / Dark. 2) Read the title. | "Spixi IM" readable in all 6 combinations. | | re-check after #1395 (`ThemeManager.cs` changed in S20); the Mac title is still "Spixi IM" (`App.xaml.cs:1441`); the Mac title strip is v1.1 (#1382) |
| E-I3 | I | 1) Lock the iPhone. 2) Let the peer call. 3) Unlock. | Rings; no call UI over the lock; ring / card after unlock. | | C.17 |
| E-I4 | I | 1) Start a call. 2) Lock the iPhone. 3) Unlock. | Lock covers all; card back after unlock; call runs. | | C.18 |
| E-I5 | I | 1) Long-press a message. | The menu grows from the pressed item. | | X.10 |
| E-I7 | I | (= V-18 VoiceOver row) | Walked, or Damir rules it optional. | | |

## 4 · Security device tests (S3)

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| A-1 | both | 1) From a dev build, send `ixian:openLink:javascript://x`. | Nothing opens; no navigation. | | C15 spoof |
| A-4 | M | 1) Open a mini-app. 2) In Web Inspector run `localStorage.length + '\|' + localStorage.getItem('spixi.pins')`. | `0\|null` (storage partitioned). | | O-03 |
| A-18 F-06 | I | 1) Scan a QR once (grants camera). 2) Open a mini-app that calls `getUserMedia({video:true,audio:true})`. | Refused; the refusal word appears in the log. | | gate `:1375` |
| A-18 F-07 | I | 1) From a second account, send one message: `https://<your host>/x.gif?u=https://a.tenor.com/y`. 2) Watch that host's access log. | No tile renders; no request reaches the host. | | gate `:1371`, `:1376` |
| A-17 | both | 1) Restore a backup with an extra entry `..\html\marker.txt`, right password. 2) Check `<spixiUserFolder>/html/`. | `marker.txt` does not exist (zip-slip fenced). | | gate `:1374` · walk in order step 5 (after ON-R3) |
| P-1 | both | 1) Time 5 chat opens (tap → first chat frame). 2) Paste the `[P1]` lines. | < 100 ms per open; numbers into `docs/p1-measurement.md`. | | |
| P-1b | I | 1) Build with `UseInterpreter` true, time 5 opens. 2) Build false, repeat. | Numbers for both; BE answers why it is set. | | `Spixi.csproj:145` (S20: cite re-checked) |
| D-5 | I | 1) Run Instruments 30 min with normal use. | No kill; no unbounded memory growth. | | or schedule it |

## 5 · S14 / S15 rows (S15 build) — Android (A) · Windows (W) · iPhone (I) · Mac (M)

Refreshed S15 (2026-10-10, DECISIONS #1296–#1308). Walk these on the S15 build (the first compile of the S15 C#: 20+ files).
Android = the new phone (Android 16) unless the row says old Moto. Logs: Android `android-s15w.txt` (`adb logcat -d -v time`), Windows the newest `Documents\Spixi` log.
S20: only the I / M legs are owed (S15-RISE, S15-STRIP); walk them on the S20 build.

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| S15-BUILD | A W I M | 1) Wipe `obj` / `bin`. 2) Plain build. 3) Open a chat, send "hi". | Build succeeds (first compile of S15 C#); the sent bubble RISES from the composer (S15-RISE). | P | paste any error file:line · A W 2026-10-10 · I M legs merged into S20-B1 |
| S15-RESTORE | A | 1) Make a Spixi backup (Account › Backup). 2) Delete account. 3) Create an account. 4) Delete account. 5) Restore the backup, WRONG password. 6) Restore, right password. | 5: password error, nothing changed. 6: the account restores with contacts and YOUR avatar; no "free space" alert. | P | the S14 half-restore sequence (#1297) · A |
| S15-RESTORE-B | A | 1) With an account on the phone, Lock › "change" (forgot password) › Restore the backup. | "Account already on this device"; nothing changed; the old account still opens. | P | WalletConflict · UX: "use a different wallet" leads nowhere (#1311 b) |
| S15-GBACKUP | A | 1) `adb shell bmgr backupnow com.ixilabs.spixi.dev`. 2) `adb shell dumpsys backup \| findstr spixi`. 3) Optional: a new-phone restore. | The backup runs; after a restore the app asks the password ONCE (retry screen); settings start fresh; no chats. | N/A | #1300 (sharedpref out) · not run |
| S15-RISE | A W I M | 1) Send 3 texts, one reply, 3 photos from the strip. 2) Scroll up, send one. 3) Turn reduce motion on, send one. | Each new bubble rises from the composer, the older ones move up with it, no fade; scrolled up / reduce motion: no movement; history loads never move. | P | #1301 — record the screen on A · A W (I M owed) · walk with S20-A3 (the long send) |
| S15-STRIP | A I | 1) Pick 5 photos, tap Next. 2) Before the previews fill, try Send and "+". 3) ✕ one tile while it loads. 4) Wait, then Send. | The strip opens AT ONCE with 5 tiles; previews fill one by one; Send and "+" wait; the ✕ removes the tile; 4 photos send. Paste `[P1] media prepare`. | P | #1302 · A (I owed) |
| S15-WHITE | A | 1) Open a chat. 2) Lock 30 s, unlock. 3) Repeat with Account › Developer › container Shadow, then None. 4) Set Clip back. | No white chat surface after unlock (any mode). If white: note the mode, tap once, save logcat at once. | P | #1305 (2) — Clip suspect · not reproduced; #1305 stays open |
| S15-PSS | A | 1) Run the PSS loop (handoff §4). 2) Open 3 chats · pick + send 5 photos · album + viewer · chat info, noting the time of each. | Find the action that makes the jump to > 600 MB (#1295 / #1305). | P | paste pss-timeline.txt · quiet 500–550 MB; peaks = chat info + photo prepare during the header sync (#1309) |
| S15-TIP | A W | 1) Tip more than your balance in a chat. | "The amount plus the network fee is more than your available balance." — no number. | P | #1306 · A W |
| S15-LOG | W | 1) Account › Developer (dev mode ON) › Send log. 2) Turn dev mode off, try again (if the row still shows). | A save dialog asks where; nothing written silently to Downloads; with dev mode off nothing happens. | P | O-19 · W; the row hides with dev mode off |
| S15-LOCKWIN | A | 1) Lock on, pick a photo (own picker), come back within 60 s. 2) Repeat, come back after 90 s. | 60 s: no lock. 90 s: the lock shows. | P | O-29 · A |
| S15-LANG | A W | 1) Light theme. 2) Account › Language. 3) Screenshot the sheet with the scroll bar visible. | A light scroll indicator. If dark: send the screenshot (no fix before it). | F (A) · P (W) | #1306 · A: dark thumb in light, light thumb in dark = the native indicator follows the theme; the expected text was wrong (#1309) |
| S15-UNREAD | A | 1) With the old Moto off the account, leave the phone 30 min. 2) Look at the unread counts. | No count rises without a new message. | P | #1298 recheck · A |
| S14-OLD | A (old Moto) | 1) Back from every subscreen (Android ≤ 15). 2) Account → each tab. | Back = one level; the tab lands right. | P | the S14 rows not walked · old Moto |

**WALK 2026-10-10 (Android + Windows, §5): 16 P · 1 F · 1 N/A — iPhone + Mac (§0–§4 and the I / M legs of §5) NOT walked yet → walk them on the tag `s15-walk` (#1310).** (S20: the tag idea is superseded by #1375 — walk on the S20 build.)

**Result line for DECISIONS:** `WALK #n (office, S15 build, iPhone + Mac + the §5 rows on Android / Windows): n P · n F · n N/A`.
## 6 · S16 rows (S16 build) — Android (A) · Windows (W) · iPhone (I) · Mac (M)

Added S16 (2026-10-11, DECISIONS #1321–#1326). The S16 C# is UNCOMPILED (first compile = S16-BUILD). Walk on the S16 build; keep §0–§5 for the office leg.
Logs: Android `android-s16.txt` (`adb logcat -d -v time`), Windows the newest `Documents\Spixi` log, iPhone / Mac the Xcode console. Grep the logs for `[L8]`, `[FLAGS]`, `[THEME]`, `refused`, `DENIED`.
Before S16-L8-MIG: keep the S15 account on each device (do NOT wipe) — the first S16 start is the migration.
S20: the A / W results below are from the S16 walk of 2026-10-11 (project note `claude/session-16-walk-notes.md`, "WALK #1327 — to write in S16b"; no DECISIONS row was written). The I / M legs (S16-L8-MIG, S16-L8-NEW, S16-F4) are owed on the S20 build; the first S20 start over the old account is the migration.

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| S16-BUILD | A W I M | 1) Wipe `obj` / `bin`. 2) Plain build (Windows = F5). 3) Open the app. | Build succeeds (first compile of the S16 C#: 20+ files, 5 new). Log has one `[FLAGS] securepass=1 mediagate=1`. | A W: P | paste any error file:line · I M legs merged into S20-B1 / S20-B2 |
| S16-L8-MIG | A W I M | 1) Start S16 over the S15 account (no wipe). 2) Note: password asked? 3) Close fully, start again. | 1: no password asked; log `[L8] store=secure … migrated=1`. 3: no password; `read=hit migrated=0`. ⚠ Mac: `migrated=0` + `migrate kept plaintext (…)` = no keychain access → note it (#1323 risk). | A W: P (I M owed) | #1323 · on I / M step 1 = S20-B2 |
| S16-L8-NEW | A I M | 1) Account › Delete data… › Delete account. 2) Create a new account. 3) Close fully, start again. | 3: no password asked; `[L8] … read=hit`. ⚠ Mac: a retry screen here = SecureStorage unusable on the Mac → F (mechanism: keychain entitlement). | A: P (I M owed) | #1323 · on I / M step 2 = ON-C1 … ON-C4 (walk order step 4) |
| S16-L8-CHANGE | A W | 1) Account › change password. 2) Close fully, start again. 3) Account › Backup → share. | 2: no password asked. 3: the backup file is made (share sheet / save dialog). | A W: P | P24 |
| S16-L8-RETRY | A | 1) On the retry screen (e.g. after S16-L8-NEW on a device that asks), type a WRONG password, then the right one. 2) Restart. | Wrong: error, nothing stored. Right: Home. 2: no password asked. | A: F | proceed verifies first · F = the APP LOCK's wrong-password alert is EMPTY (`LockPage.xaml.cs:491` reads keys deleted upstream before the fork = legacy); the retry screen was never reached |
| S16-L8-FLAG | A | 1) Dev mode ON › Developer › "Wallet password in secure storage" OFF. 2) Restart. 3) Switch ON, restart. | 2: `[FLAGS] securepass=0`, `[L8] store=legacy`, no password asked. 3: `migrated=1`, no password asked. | A: P | reverse copy |
| S16-F1 | W | 1) Turn the app lock on, let the idle lock show. 2) F12 on the lock (DevTools) → Console: `location.href='ixian:change'`. | The lock stays; log `LockPage: ixian:change refused (no Cancel on this lock)`. | | #1322 F1 · not in the 2026-10-11 notes |
| S16-F2 | W | 1) Set the idle lock to 1 min. 2) Open a chat, F12 → Console: `setInterval(()=>location.href='ixian:details',300)`. 3) Wait for the idle lock. | The lock presents and stays; log may show `pushPageLoaded: lock staging - dropped …`. Reload the chat after. | | #1322 F2 · not in the 2026-10-11 notes |
| S16-F3 | A W | 1) Record + send a voice note in a chat (normal use). 2) Phone: open chat info; `chrome://inspect` → the chat WebView console: `location.href='ixian:voicerec:start'`. 3) Windows: narrow the window below 700 with chat info open, same command in the chat's DevTools. | 1 works. 2 + 3: no recording; log `Voice: recording refused (hidden)`. | A W: P | #1322 F3 · r2/r3 |
| S16-F4 | W M | 1) Copy a screenshot, Ctrl/Cmd+V in a shown chat. 2) Minimize the window, run `location.href='ixian:pasteImage'` from the chat's DevTools (W). | 1: the preview sheet opens. 2: nothing; log `Media: paste refused (background)`. | W: P (M owed) | #1322 F4 · on M step 2 = Web Inspector console |
| S16-F5 | A | 1) Receive a contact request; Decline it on Home. | The request goes; an approved contact is never removed by Decline. | A: P | #1322 F5 |
| S16-M9 | A | 1) Home › Scan (quick scan) → camera. 2) Add contact › scan. 3) Open a mini-app that asks for the camera (if any). | 1 + 2: the camera opens and scans. 3: refused; log `WebView capture DENIED reason=…`. | A: P | #1313 · must not break the QR scan · there is no "Home › Scan" (sheet text wrong, 2026-10-11) |
| S16-RESTOREB | A | 1) Lock on, restart → the cold-start lock. 2) Tap "Use a different wallet…". | Sheet "One account per device", two paragraphs, OK closes it; nothing navigates. | A: P | #1324 (b) |
| S16-THEME | A | 1) Appearance = System. 2) Flip the phone's dark mode with Spixi open, then with Spixi in the background, then resume. | The right theme each time. Save the log either way (`[THEME] event / push / resume / gen-stale` lines). If wrong: screenshot + the time. | A: P | #1311 (a) mechanism · not reproduced |
| S16-REARM | W | 1) Use Windows 30 min with the chats that logged the 1 436 lines in S15. | "…prepare file transfer for an unfinished sent file" at most once per file (S15: 1 436 lines in 3.5 h). | W: N/A | #1324 (c) · early evidence: 18 lines in one burst, then 0 in 3 min; the 30-min run owed |
| S16-HOLD | A | 1) On the chats list, tap a chat and at once tap another row (during the ~250 ms open). | The second tap does not open the other chat. | A: P | #1294 (c) · Clickable on MAUI unproven |
| S16-STRIP | A | 1) After a restore (or any catch-up), open Wallet. 2) Wait 5+ min. | Row "Checking for your transactions · n%" + "Spixi may feel slower until this is done"; after 5 min "About N hr left · …". | A: P | #1304 pick A |
| S16-PSS | A | 1) Run the PSS loop (handoff-2026-10-10 §4) with BOTH PIDs (perf research §6: `adb shell ps -A \| findstr "spixi sandboxed"`, `dumpsys meminfo <pid>` each). 2) Same script: 3 chat opens · chat info ×3 · 5 photos · viewer. | Numbers for the perf track (no pass bar). Paste the timeline. | A: P | #1310 measure first · peaks 681–747 MB |

**WALK 2026-10-11 (Android + Windows, §6, from the project note): 14 P · 1 F · 1 N/A.** iPhone + Mac legs owed (S20 build).

**Result line for DECISIONS:** `WALK #n (S16 build, A / W / I / M): n P · n F · n N/A` (+ the office §0–§5 rows if walked on this build).

## 7 · S17 rows (V-33; DECISIONS #1331–#1358) — I / M

Source `docs/walk-s17.md` (A + W walk #1364: 31 P · 5 F · 8 N/A) with the S18 D3 moment rewrites (#1366). The A / W-only rows that need no I / M pass: CA-TILES, CA-PATTERN (→ S18-PT-DESKTOP), MO-STACK, MO-FLAG.

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| S17-WN | both | 1) Finish ON-C4 (a new account). 2) Look at Home. 3) Go through the slides. 4) Close the card (I: Got it · M: press Esc). 5) Close Spixi fully. 6) Start it again. | 2: the "What's new" card opens once ("New in Spixi <version>", 6 slides). 4: it closes. 6: no card. | | #1338 · WN-FRESH + WN-CLOSE · walk order step 4 |
| S17-WN-ABOUT | both | 1) Account › About. 2) Tap "What's new". 3) Close the card. | 2: the same card opens. 3: the row's "New" badge is gone. | | #1333 |
| S17-ABOUT-I | I | 1) Account › About. 2) Scroll down. 3) Open Contributors. 4) Go back to the Account hub. 5) Repeat in dark theme. | 1: a full-bleed blue header under the status bar; the status-bar glyphs are white. 2: the top bar turns solid. 3: a violet header, white glyphs. 4: the bar follows the page again. | | #1332 · #1339 AB-BAR (P26 `ixian:topsurface`) |
| S17-CA | both | 1) Account › Chat appearance, light theme. 2) Pick each of the 7 canvases; open a chat each time. 3) Pick a bubble colour, then a canvas. 4) Background: None, Contours, Waves. | 2: each canvas has its OWN flat bubble colour. 3: a picked colour overrides the canvas colour; a canvas pick resets it to Auto. 4: the canvas tiles show the picked background. The tiles show a rim + a check, no radio. | | #1334 · #1335 · #1342 · the dark values are S20-D |
| S17-CORNERS | both | 1) Chat appearance › Corners: set 4, then 18, then 22. 2) Open a chat each time. | 18 = the default bubbles; the small corners follow (4 → 2 px, 22 → 5 px). | | #1336 |
| S17-ACCENT | both | 1) Pick the Dusk canvas. 2) Then Mist + a teal bubble colour. 3) In a chat look at: the send / mic disc, the ⊕ / ×, the attach tray (I) or popover (M), a received voice message, select mode. 4) Repeat in dark. | Everything on "your side" takes the bubble colour: send / mic disc, ⊕ / × glyph, tray discs, the voice play disc + unread mic badge, the selected-row wash + check. Read ticks and the wallet do not change. | | #1355 |
| S17-HUB | both | 1) Open the Account hub. 2) Look at the App group in light, then dark. | How to use = orange · About = blue · Downloads = green · Contributors = violet. Other rows keep their colours. | | #1352 |
| S17-TH | both | 1) Account › Theme. 2) Try Light, Dark, System. 3) Chat appearance › Theme. 4) Try the same. | One picker in both places: three tall mini chats, System split on the diagonal, a blue rim + a check on the picked one. The sheet stays open while you try. | | #1353 · M: in the pane |
| S17-ATTACH | both | 1) Open a 1:1 chat. 2) Tap ⊕. | I (tray): Photos · Camera · Send file / App invite · Pay · Request — the two payment tiles last. M (popover): the same order, no Camera (C# declares `camera` on Android + iOS only). | | #1355 AT-ORDER |
| S17-DD | both | 1) Account › Delete data. | "Delete account" and its line start exactly where "Delete all chat history" and its line start. | | #1356 · do not tap Delete here |
| S17-AD-CARD | both | 1) Account: tap the QR button under your name. 2) Tap the short address. 3) Tap it again. 4) Tap Copy. 5) Tap Share. | 1: ONE card — a colour band, your photo + name, one line about the address, the QR on white, the address as 8 … 8 with a "Copy" pill; a full-width blue Share; one safety line. 2: the full address. 3: it folds back. 4: the pill says "Copied". 5 (I): the share sheet. 5 (M): write what Share does. | | #1358 |
| S17-ART | both | 1) Look at the Apps empty state + the Explore banner. 2) Look at Wallet empty + the coins. 3) About › Contributors: tap a chip. 4) Turn Reduce motion on; look at the heart. | No four-point "AI" star anywhere; violet tiles hold a rocket; twinkles are round dots; coins have two shine bars; a chip tap sends round sparks. The heart floats visibly up and down; with Reduce motion it is still. | | #1357 · #1366 D1.5 (HEART) · DC-SCREEN |
| S17-SLIDE | I | 1) Account: scroll down to the App group. 2) Open About. 3) Go back. 4) Do the same for Downloads, Contributors, How to use Spixi. | Each page slides in and out over the WHOLE screen. No box under the "App" header; no jump to full screen at the end. | | #1351 SL-SLIDE |
| S17-DL | both | 1) Settings › Downloads with files (M: the dialog). 2) Select mode; select 2 files. 3) Tap Delete; confirm. 4) Look at a file from a contact with a very long name. 5) Long-press (I) / hover (M) its From chip. 6) Tap Clear all. | 1: summary card, chips, day groups. 3: the 2 files go. 4: the From chip ends with … inside the row. 5: the full name shows. 6: the list is empty. | | #1336 · #1349 · #1366 D1.3 DL-LONGNAME |
| S17-MO-MIC | both | 1) Reset moment sheets; restart. 2) Turn the microphone permission off in the system settings (I: Settings › Spixi › Microphone · M: System Settings › Privacy & Security › Microphone). 3) Tap the mic in a chat. 4) Optional (only after a reinstall, permission never asked): tap the mic. | 3: no sheet; log `[MO] ask id=mic d=consume why=ok` (iOS / macOS ask once; after a refusal the sheet would be false). 4: the sheet "Send voice messages" BEFORE the system dialog; `d=grant why=ok`; then the system asks. | | #1340 · #46 r1 MINOR-6 (`SMoments.cs:280`) · turn the permission on again for V-8 |
| S17-MO-PAY | both | 1) Reset moment sheets; restart. 2) Wallet › Send: pick a contact, an amount, Review. 3) Continue, then cancel at the native confirm. 4) Restart the app twice. 5) Do step 2 again. | 2: "Before you pay" BEFORE the review; `[MO] ask id=pay d=grant why=ok`. 3: the review, then the NATIVE confirm (unchanged). 5: straight to the review; `d=refuse why=seen`. | | #1340 · MO-ONCE |
| S17-MO-APP | both | 1) Reset moment sheets; restart. 2) Open a mini app from an invite. 3) Open the same app again. | 2: "Before you open <app>", the app's capability rows, "<name> invited you to this app."; Cancel stays, Open opens; `[MO] ask id=app d=grant why=ok`. 3: no sheet; `d=refuse why=seen`. | | #1340 |
| S17-MO-IXI | I | 1) After ON-C4 (no backup made), reset moment sheets; restart. 2) The Android peer sends 1 IXI to the new account. 3) Tap "Back up now". | 2: the sheet "You received your first IXI"; `[MO] ask id=firstixi d=grant why=ok`. 3: Backup opens. | | #1340 · N/A if the new wallet has not caught up (the header sync, project note S16 item 2) |
| S17-NT-SENDER | I | 1) After ON-C4: Settings › Notifications. 2) Put Spixi in the background (do not force-quit). 3) The peer sends a message. 4) The peer sends a file. | 1: "Show sender" is ON by default. 3: the banner shows the contact's name. 4: "<Name>: Sent you a file". If iOS shows a server push instead (app suspended), write its text. | | #1346 · local path `Node.cs` `fileOfferNotificationText` |

## 8 · S18 rows (DECISIONS #1359–#1367) — I / M

Source `docs/walk-s18.md` (A + W walk #1369: 26 P · 2 F). The moment rows of S18 are in §9 (S19 versions, #1370–#1371).

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| S18-AA-TILES | both | 1) Apps › Add app, light theme. 2) Repeat in dark. 3) M: hover a tile. | Grey ground; three white tiles (Paste link blue · Scan QR violet · From file pink, white glyphs); the lead "Add a mini app from a link, a QR code, or a file."; a shield line under the tiles; no Explore banner. 3: the tile stays white and lifts. | | #1359 · M: write if Scan QR shows |
| S18-AA-LINK | both | 1) Tap Paste link. 2) Tap Paste link again. 3) Type `apps.spixi.io/x`; tap Get app. 4) Turn the network off. 5) Paste a valid link; tap Get app; wait. | 1: a blue ring + blue label; a white card UNDER the tiles: "Mini app link", the link glyph, Get app. 2: the field stays open, the cursor in it. 3: a red ring + alert glyph + "That link or file isn't a valid mini app." 5: a spinner, then "The link did not respond. Check your connection and try again." with the glyph. I: the keyboard never covers the field or Get app. | | #1359 · #1362 · S19 AA-OFFLINE (#1371 F6) merged here |
| S18-AC-FIELD | both | 1) New chat › Add contact › Enter or paste a Spixi address. 2) Paste a valid address of a non-contact. 3) Clear it; type "abc def"; tap Send request. 4) Tap outside the field. | 1: one white card: label "Address", the field, the scan button INSIDE it after a thin line (I); the line "Enter their Spixi address to send a contact request."; Send request below. 2: a green ✓ disc + "Looks like a valid Spixi address". 3: a 2 px red border + "That doesn't look like a Spixi address." with an alert glyph. 4: the border stays red. | | #1360 · #1362 (6) |
| S18-AC-KNOWN | both | 1) Paste the address of a contact with a photo. 2) Paste the address of the contact with a very long name. | One row in the card: their photo (32 px), "<name> is already in your contacts.", "View contact". Send request is off. 2: the name wraps; it never runs under "View contact". | | #1360 |
| S18-AC-SHEET | M | 1) New chat › Add contact, light then dark. 2) Hover each choice. | Scan QR code = violet tile, Enter or paste = blue tile, white glyphs; no chevrons; "Enter or paste a Spixi address" on one line; the colour stays on hover. | | #1360 |
| S18-NG | I | 1) New chat › Create group; pick 2; tap "Next ✓". 2) Tap "Set group photo" (the text). 3) Pick a photo. 4) Add people up to 5. 5) Tap one chip. 6) Repeat 1–3 in dark. | 2–3: a card with the colour band, the round photo cut into it with a camera badge, "Set group photo" in blue, the name field in the card; after the pick: the photo, a pencil badge, "Change group photo". 4: "Members" + "5 / 10"; each chip = face, name, grey ×. 5: the chip goes. | | #1361 NG-HERO + NG-CHIPS |
| S18-NG-LIMITS | I | 1) Create group: pick 0, then 1, then 2. 2) Remove chips down to one. 3) Pick 10 people. 4) In a chat: ⊕ › App invite; pick 1. | 1: the pill "Next ✓" is off at 0–1, on at 2. 2: Create group is off; "Select at least 2 people to create a group." with an info glyph INSIDE the members card. 3: "10 / 10" + "A group can have up to 10 members besides you."; Create is on. 4: the pill "Start ✓". | | #1361 NG-ONE + NG-TEN · S19 NG-PILL (#1371 F12) merged here |
| S18-NG-BLIND | M | 1) Create group on a wide window, light then dark. 2) Turn Blind group on, then off. | The Blind group disc is violet with a white glyph; the switch has a visible border in dark; the cards and Create group are one 640 px column, centred. | | #1361 · #1362 (3) |
| S18-PT-DESKTOP | M | 1) Open a chat with Contours on Mist, on Aurora and on a dark canvas. 2) Open the same chat on the iPhone. | The Mac pattern is about 20 % lighter than the iPhone pattern (the desktop ×0.8). | | #1366 D1.1 · `:root[data-desktop]` |
| S18-AD-PEER | both | 1) A contact WITH a name › their address. 2) A contact with no name › their address. | 1: their photo + name; the heading "Ixian address"; no Share, no safety line. 2: no photo, no name. | | #1366 D1.2 |
| S18-TH-SYNC | both | 1) Account › Theme: pick Dark. 2) Chat appearance › Theme. 3) Pick System there. 4) Go back to Account › Theme. | 2: Dark is picked. 4: System is picked. After 1, the focus stays on the Theme row when the sheet closes. M: the Theme row in the column follows at once. | | #1366 D2 |
| S18-TIPS | both | 1) Settings › Notifications. 2) Chat appearance. | 1: a separate last card "Tips on the Chats screen" with its switch. 2: no Tips switch. | | #1362 (4) |
| S18-DC-DESKTOP | M | 1) Account › About in the pane, light then dark. 2) Open Contributors. | The normal pane bar: "About" / "Contributors" + the back arrow in the normal ink. The colour band is a rounded card in the column; the heart and the tile are not cut. | | #1362 (5) option B (the W fail of S17 DC-SCREEN) |

## 9 · S19 rows (DECISIONS #1369–#1374) — I / M

Source `docs/walk-s19.md` (A + W walk #1374: 16 P · 0 F). Moment rows: reset moment sheets + restart before EACH row.

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| S19-PT-STALE | M | 1) Chat appearance › Background: Waves. 2) Go back to Chats. 3) Open ONE chat. 4) Repeat with Contours. | 3: the first chat already shows Waves. 4: the same for Contours. | | #1371 F1 · #1311 (d) |
| S19-AC-NOFLICKER | I | 1) New chat › Add contact › Enter or paste a Spixi address. | The sheet disappears at once; no sheet jumps up; the form shows. The keyboard opens on the field — if iOS does not open it without a tap, write it; the field must be in view. | | #1371 F2 |
| S19-MO-LANG | both | 1) Reset moment sheets; restart. 2) Language › Deutsch. 3) Close the sheet; Language › Italiano. 4) Language › Français. 5) Language › Deutsch again. 6) Language › English. | 2–4: each shows the AI sheet (`[MO] ask id=lang d=grant`). 5: no sheet (`d=refuse why=seen`). 6: no ask. Pay and Mic still show their sheets later in the same session. | | #1370 · #1371 F4 |
| S19-MO-OFFLINE | both | 1) Reset moment sheets; restart. 2) The sender closes Spixi. 3) Tap Download on a file they sent. 4) Wait 5 s in the chat. | The sheet "Waiting for <name>"; `[MO] ask id=offline d=grant why=ok`. When the sender opens Spixi, the download continues by itself. | | #1371 F3 · #1340 |
| S19-MO-AUTODL | both | 1) Privacy › auto-download OFF. 2) Reset moment sheets; restart. 3) A contact sends a NEW photo; tap it to download. 4) Tap "Open Settings" in the sheet. | 3: the sheet "Download photos automatically?"; `[MO] ask id=autodl d=grant why=ok`. 4: Settings opens on Privacy, scrolled to the auto-download row; the row flashes once (no flash with Reduce motion); the setting itself does not change. | | #1340 · #1371 F9 |
| S19-MO-RESET | both | 1) Developer › Reset moment sheets. 2) Tap it 5 times fast. | A toast "Reset sent. Restart the app." Extra taps within 1 s do nothing (one log line `[MO] dev reset: moment sheets cleared`). | | #1371 F8 |
| S19-AA-HOVER | M | 1) Apps tab, grid layout, light then dark. 2) Hover a tile. 3) Press it. | The whole tile darkens on hover and a step more on press. List rows unchanged. | | #1371 F7 · the press opens details now (S20-C) |
| S19-BG-NOTICE | both | 1) Open a blind group. 2) Open a normal group. 3) In the blind group tap ⊕. | 1: under the secure notice a second card "Blind group" — "Members can't see each other's identity. Photos and files can't be sent in this group." 2: no such card. 3: no Photos / Camera / File. | | #1371 F11 |
| S19-KEEPOPEN | both | 1) Send a photo and a file. 2) Receive a photo and a file (the sender keeps Spixi open). | While sending: "Keep Spixi open until it's sent." While receiving: "Comes directly from the sender's device. Keep Spixi open." | | #1371 F13 · I: if you put Spixi in the background during a send, write what happens |

## 10 · sq-al rows (DECISIONS #1368) — I / M

Source `docs/walk-sq-al.md` (A + W, results not in the tree). `SpixiLocalization.cs` (one list entry) + `Utils.cs` (one `case`) compile on I / M for the first time.

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| SQ-LIST | both | 1) Account › Language. 2) Scroll to the end. | The last row is the Albanian flag + "Shqip". | | SQ-BUILD |
| SQ-PICK | I | 1) Reset moment sheets; restart. 2) Pick Shqip. 3) Close the sheet; look at the tabs. 4) At the end of §10: Language › English. | 2: the sheet "Përkthyer me AI", pills "Hello" + "Përshëndetje", button "E kuptoj". 3: "Bisedat · Aplikacionet · Portofoli · Llogaria". 4: all text is English again; the AI note is gone. | | #1368 · SQ-BACK merged here |
| SQ-NOTE | both | 1) Account › Gjuha. 2) Tap "Raporto një problem përkthimi". | At the top: "Një pjesë e tekstit … është përkthyer me AI …" + the link. 2: a mail to support@spixi.io with "(sq-al)" in the subject (I: Mail compose · M: the mail app). | | #1246 · #1368 |
| SQ-NATIVE | I | 1) Send 1 IXI to a contact. 2) Read the native confirm. 3) Cancel. 4) Call a contact. | 2: "… <fee> IXI është tarifa e rrjetit, e përfshirë në pagesë." (the fee number reads into the sentence). 4: the call bar reads "Duke thirrur <name>...". | | legacy .txt · #1368 |
| SQ-AMOUNT | I | 1) Wallet with a balance ≥ 10 000 (else N/A). 2) Send: type 15555.5. 3) Review. | "15 555,5" in the shell AND in the native confirm. Known: a 4-digit amount shows "1555,5" in the shell and "1 555,5" in the native confirm. | | `Utils.cs` gate · iOS culture |
| SQ-DATES | both | 1) Look at the chats list with old chats. 2) Open a chat with old messages. | Weekdays / months in Albanian ("e hënë", "tetor"), 24-hour time. | | setDocLang |
| SQ-FIT | I | 1) Look at the Account hub, Privacy, Backup, Chat appearance, Wallet › Send, a group's chat info, light and dark. | No label is cut or overlaps; long titles ellipsize cleanly. Note any row that reads wrong. | | overflow audit 0 BREAKS |
| SQ-FIT-M | M | 1) The same screens in the desktop panes. 2) Make the window narrow. | As on the iPhone. Known: "Kopja rezervë" wraps beside the "Kërkon veprim" badge in a narrow pane. | | SQ-FIT-W |

## 11 · DT-1 rows (V-34 · V-35; DECISIONS #1380–#1394) — the Mac desktop list + the phone list

Source `docs/walk-dt1.md` (#1391: 17 P · 4 F — the title bar) + `docs/walk-dt1-r2.md` (#1394: 8 P · 0 F · 2 N/A). "The Mac list rows ride the next Mac walk" (`docs/handoff-2026-10-13-dt1-p1.md:37`). The DT-TB-* / DT2-TB-* rows are Windows only (N/A on M); after #1395 `off` (the Windows look) is the only way.

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| DT-LIST-SECT | M | 1) Pin 2 chats (right-click › Pin). 2) Unpin both. | 1: "Pinned 2" with the two chats, then "Chats n" with the rest. 2: the heads go; one flat list. | | #1385 |
| DT-LIST-FOLD | M | 1) Pin a chat. 2) Click "Pinned". 3) Restart Spixi. 4) Click "Chats". 5) Pick the Unread chip. 6) Go back to All. 7) Unpin the last chat; pin one again. | 2: the pinned rows hide. 3: still folded. 4: the other rows hide. 5: a flat list of unread chats (no heads). 6: folded again. 7: both heads open (fold reset). | | #1385 |
| DT-LIST-HOVER | M | 1) Hover a row. 2) Click pin. 3) Click mute; hover again. 4) Click info. 5) Click more. 6) Click the space between two buttons. | 1: the time and badge give way to pin · mute · info · more (each with a tooltip). 2: the row moves into Pinned. 3: bell-off; the button says Unmute. 4: chat info opens. 5: the row menu opens at the button. 6: the chat opens. | | #1385 |
| DT-LIST-KEYS | M | 1) Tab through the list. 2) On a row press fn+Shift+F10 (or right-click). 3) Tab to "Pinned"; press Return. | 1: Tab goes row to row (not into the small buttons). 2: the row menu opens. 3: the section folds; the focus ring stays on the head, a full ring. | | #1385 · Shift+F10 / ContextMenu (`chats-row-menu.js:874`) |
| DT-LIST-INSET | M | 1) Light and dark: look at the selected row, a pinned row, a hovered row, a contact request card. | All are rounded shapes inset from the list edges; the request card's avatar lines up with the rows' avatars. | | #1385 |
| DT-LIST-FOCUS | M | 1) Click the "Chats" head twice. 2) Open a chat; type in the composer. 3) A contact sends a message in ANOTHER chat. | The text cursor stays in the composer while the list updates. | | #1385 |
| DT-RAIL-LOGO | M | 1) Look at the top of the left rail. | The Spixi logo is in the rail. | | #1382 (Windows AND Mac) |
| DT2-PIN | M | 1) Pin 2 chats. 2) Look at the two pinned rows. 3) Hover a pinned row. 4) Hover an unpinned row. 5) Open a pinned chat; hover it. | 2: a thin gap between the rounded rows. 3: a clearly stronger blue tint. 4: grey. 5: the selected row keeps its own colour. | | #1393 |
| DT2-DENS-LIVE | M | 1) Chat appearance › List density › Compact. 2) Dense. 3) Comfortable. | 1: smaller avatars, two lines, about one more row. 2: one line per chat (name, preview, badge, time), about three more rows. 3: as before. Each change shows at once. | | #1390 |
| DT2-DENS-PREVIEW | M | 1) Message preview › 2 lines. 2) List density › Dense. 3) Compact. | 2: the Message preview control hides; one line. 3: the control comes back with "2 lines" still picked; 2-line previews. | | #1390 |
| DT2-DENS-RESTART | M | 1) Pick Dense. 2) Quit Spixi (Cmd+Q). 3) Start it. | The list opens dense (no flash of the big rows). | | #1390 |
| DT2-DENS-HOVER | M | 1) Pick Dense. 2) Hover a row with an unread badge. 3) Hover a pinned row. 4) Repeat in dark. | The four buttons fit inside the row; the name stays readable; the badge and time come back when the pointer leaves; rows stay one line. | | #1394 (unmarked on W; re-walk in S20) |
| DT-PHONE-SAME | I | 1) Account › Chat appearance. 2) Look at the chat list with 2 pinned chats. 3) Long-press a row. | 1: NO "List density" control. 2: full-width rows, no gaps, no "Pinned" / "Chats" heads, the same row height and avatars as before. 3: the menu as before. | | #1385 · #1390 · DT-MOBILE-SAME + DT2-PHONE-SAME merged |
| DT-SWIPE | I | 1) Swipe a chat row to the right. 2) Swipe it to the left. 3) Do each 5 times fast. | 1: the left panel is MUTE (grey). 2: the right panel is PIN (blue). 3: no wrong action. | | #1389 |

## 12 · S20 rows (DECISIONS #1374–#1379 · #1394–#1395 · #1400–#1404 · #1440–#1441) — I / M

Source: `docs/review-brief-session20.md` §1 + the DECISIONS rows (the S20 A + W sheet `docs/walk-s20.md` is written in S20; walk the same behaviour here). Record the screen for the A rows (I: Control Centre › Screen Recording · M: Cmd+Shift+5).

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| S20-A1 | I | 1) Open a chat with large images. Keep the keyboard down. 2) Start a screen recording. 3) Tap ⊕. 4) Tap × to close the tray. 5) Do 3–4 five times. | 3: the tray rises in one smooth motion; the messages ride up with it; no jump, no stutter. 4: the close is as smooth. | | #1375 A1 · #1378 (one reserve move, transform / clip) |
| S20-A1-KB | I | 1) Tap the text field (keyboard up). 2) Tap ⊕. 3) Tap the text field. 4) Do 2–3 three times. | 2: the keyboard drops and the tray takes its place; no flash; the composer does not jump high. 3: the keyboard comes back; the tray leaves in one frame; the composer never dips to the bottom. Paste the `[KBTRAY] hold` / `drop` lines. | | #721 · Session K · #46 r3 R3-5 (one hand-off at a time) |
| S20-A-LIFT | I | 1) Open a chat; scroll to the end. 2) Tap the text field. 3) Scroll up a little. 4) Close the keyboard (tap the list). | 2: the composer rides up on the keyboard curve; the last bubble stays visible above the composer (`--composer-lift` in the list reserve). 3: the "scroll to latest" button sits above the composer, not under the keyboard. 4: the composer is back above the home indicator; the list does not jump. | | `chat.html:231` · `:279` · `scroll-latest.css:18` |
| S20-A2 | both | 1) Reply to a message (I: swipe right · M: hover › Reply). 2) Close the strip with ✕. 3) Edit an own message. 4) Close it. 5) I: repeat 1–4 with the keyboard up. | The strip appears to grow (the #1238 look) in one smooth motion; the list rides with it, no stutter, no re-scroll; the last bubble stays in view; ✕ closes as smoothly. | | #1375 A2 · #1378 A2 |
| S20-A3 | both | 1) Type a message of 4 lines. 2) Send it. 3) Send a one-line message. 4) I: repeat 1–2 with the keyboard up. | 2: the field shrinks to one line while the new bubble rises; the list never scrolls up past the end and never snaps back. 3: as before. | | #1375 A3 · #46 r2 (the shrink waits 250 ms for the echo, then slides) · with S15-RISE |
| S20-A-RM | both | 1) Turn Reduce motion on (I: Settings › Accessibility › Motion · M: System Settings › Accessibility › Display). 2) Do S20-A1 (I), S20-A2 and S20-A3 once. 3) Turn it off. | No slide or rise; the same end state; nothing jumps. | | #1378 |
| S20-B | both | 1) Chat appearance › Bubble colour: Blue. 2) Look at your sent messages: sent, delivered, read, failed. 3) Repeat for Violet, Teal, Pink, Orange, Graphite, Green. 4) Repeat in dark. | The time, ✓ (sent) and ✓✓ (delivered) have the same strength (0.7); ✓✓ read and failed are at full strength. | | #1377 B (supersedes #1247 0.92, #692 0.571) |
| S20-C | both | 1) Apps tab, grid layout. 2) Tap an app tile. 3) Go back. 4) Tap the round Run button on a tile. 5) Switch to the list layout; repeat 2–4. 6) I: long-press a tile. | 2: the app's details open (M: as its own page). 4: the app opens. Uninstall and "Invite a contact" are on the details page only. 6: no menu. | | #1377 C |
| S20-D | both | 1) Dark theme. 2) Open a chat on each of the 7 canvases. 3) Look at an incoming bubble with a quote. | The grounds are one step darker than S19; incoming bubbles are a little less saturated and lighter, clearly apart from the ground; the quote reads; the pattern is visible. Known: the incoming time (0.7) is under 4.5 : 1 on all 7 canvases (#1403) — note only. | | #1377 D · #1403 · supersedes the S17 CA-CANVAS dark values + S19 DB-DARK |
| S20-E | both | 1) Auto-download OFF. 2) The peer sends a 2–3 MB PDF. 3) Read the file card. 4) Tap download; read it during the download. 5) Read it after. 6) Send a PDF to the peer; read it during and after. 7) Restart the app; read the sent card. 8) Language › Deutsch; read a card. | 3: "PDF · 2.4 MB" (the real size). 4: "1.1 / 2.4 MB". 5: "PDF · 2.4 MB". 6: the same on the sent card in both states. 7: the size is still there. 8: the decimal comma ("2,4 MB"). | | #1376 · #1402 · P29 · the C# reads one stat of the C#-resolved sent copy (#46 r1 S) |
| S20-E-FLAG | I | 1) Developer › "File size on sent files (S20)" OFF. 2) Restart. 3) Read a sent file card and a received offer. 4) Set it ON; restart. | 2: `[FLAGS] s20filesize=0`. 3: the sent card has no size; the received offer still has it. 4: `s20filesize=1`. | | #1376 flag (old `offerSizeArg` = fallback) |
| S20-DEV | both | 1) Account › Developer. 2) Look at the Release flags card. | No "Title bar" card (#1395). The card has "File size on sent files (S20)" and "Reset moment sheets". | | #1395 · DevPage compiles on I / M |
| S20-F1 | both | 1) Send: `` *bold* _italic_ ~strike~ `code` ``. 2) Send a code block: three backticks, 2 lines, three backticks. 3) Send: `snake_case_name 2*3*4`. 4) Send: `_see https://example.com/a_b_c_`. 5) Reply to message 1; look at the quote. 6) Look at the chats list excerpt. 7) Long-press message 1 › Copy; paste it in the field. | 1: bold, italic, struck, code. 2: a monospace block, left to right. 3: plain text. 4: italic text around a whole, working link. 5 + 6: no marks in the quote or excerpt. 7: the text exactly as typed. The Android peer shows the same. | | #1378 F · #1404 F2 (the link cap) |
| S20-LINK | both | 1) After S20-F1 step 4: open chat info. 2) Open Links. | `https://example.com/a_b_c` is listed once, whole (the C# `LinkRule`). | | `LinkRule.cs` changed in S20 (URLs opaque to the marks) |
| S20-F2 | I | 1) Type "hello world". 2) Select "world" with the iOS selection handles. 3) Tap Aa. 4) Tap Bold. 5) Tap Bold again. 6) Clear the selection; tap Italic. | 3: a small bar above the composer (Bold · Italic · Strike · Code); the list does not move. 4: `hello *world*`; the keyboard stays up; the selection is kept. 5: `hello world`. 6: `__` with the caret between. | | #1378 F (input A + C) |
| S20-F3 | I | 1) Switch to the Japanese (Kana) keyboard. 2) Type a word; do not commit it (underlined). 3) Tap Aa › Bold. 4) Commit the word. 5) Tap Bold. | 3: nothing changes. 4: the Return that commits does NOT send. 5: the word is wrapped. | | #46 r1 MINOR-3 (IME guard) · `composer.js:239` |
| S20-F4 | M | 1) Type "hello world"; select "world". 2) Press Cmd+B. 3) Press Cmd+I. 4) Press Cmd+Shift+X. 5) Press Ctrl+B. 6) Click Aa; press Esc. 7) Tab from the field. | 2: `*world*`. 3: italic marks added. 4: strike marks added. 5: nothing. 6: the bar closes; the focus is back in the field. 7: field → Aa → the bar buttons (if open) → send. | | #1378 F (Cmd on a Mac, `format-bar.js:96`) |
| S20-G1 | both | 1) Dark theme. 2) Open a chat on Mist, Dusk, Aurora, Iris. 3) Light theme; repeat. | The secure notice is a NEUTRAL card (dark grey in dark, white in light, no navy) and reads well on the darker grounds; its icon disc has the canvas's bubble colour. | | #1379 (ink-800) · supersedes the S17 NOTICE |
| S20-G2 | M | 1) New chat › Create group; pick 2; Next. 2) Press Tab from the top. | One tab stop on "Set group photo" (not two). | | #1379 |
| S20-G4 | both | 1) Reset moment sheets; restart. 2) Do S17-MO-PAY step 2 (the Pay sheet shows). 3) Apps › Add app › paste a link to an app you do not have › Get app. 4) Tap Install. 5) Open the app later from Apps. | 4: ONE sheet "Before you install <app>" with the app's permissions, even after the Pay sheet in this session; no second "Install?" dialog; the button shows a loading state until it is installed. 5: no sheet. | | #1379 (install moment exempt from the session rule) · S19 MO-APP-INSTALL (#1370, #1371 F5) merged here |
| S20-I | both | 1) Open the Account hub. 2) Compare the first row of the card with the App lock switch to the first row of the card with Theme. | The same top inset (icon and title the same distance from the card top); the subtitle stays on the line under the title + switch (layout B). | | #1401 (supersedes #1378 I) |
| S20-J1 | both | 1) Send 1 IXI to the peer. 2) The peer sends you 1 IXI. 3) The peer requests 1 IXI; decline it. 4) Request 1 IXI from the peer; cancel it. 5) Do 2 in a group. 6) Look with a balance lower than a request. | Stacked bubble: a 24 px medallion + label, the amount large + "IXI", a badge + time at the foot. Labels: "You sent" · "Sent you" · "Request declined" · "You canceled"; group: "<name> sent you". Received + completed shows "+". Declined / canceled: struck through + ✕; failed: ✕, no strike. 6: Pay is off. | | #1440 J1 · #1441 (1:1 labels have no name — open) |
| S20-J2 | both | 1) Open Wallet. 2) Look at the list. 3) Look at a pending or failed row. 4) Tap a row. | 2: 44 px contact faces with a 20 px direction badge; day headers (Today, Yesterday, a date), each once, newest first; amounts with "−" (U+2212) and "IXI"; action circles without a border. 3: it leads the list, with no day header, and shows its full date + time. 4: the tx sheet with the right contact. | | #1440 J2 · #46 r3 U MAJOR-1 · #1404 F1 spoof guard (pins) |
| S20-J3 | both | 1) Send a file. 2) Tap ✕ on the tile during the send. 3) Send it again; let it finish. 4) Tap the card. | 2: the send stops. No "Open file" link on the card. 4: the file opens. | | #1440 J3 |
| S20-J4 | both | 1) Receive a mini-app invite. 2) Accept it. 3) Look at a call card. | 1: no "App invite" header; a 48 px icon, a line, the app name, the time; Accept / Decline as before. 2: the compact "You joined". 3: unchanged. | | #1440 J4 |

## 13 · ON-1 rows (DECISIONS #1420–#1422) — the launch flow, I / M

Source `docs/prompts/session-on1.md` §6 (row IDs) + #1421 (consent at the welcome tap, no slow restore screen, the honest create line) + #1422 (BG 2 · CARD 2 · P2 · rings). Walk in order step 4 (create) and step 5 (restore). Light AND dark for each row.

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| ON-LEGAL | both | 1) On welcome, read the line under the two buttons. 2) Tap "Terms of Use". 3) Close it. 4) Tap "Privacy Policy". 5) I: if you have a small iPhone (320 × 568), look again. | 1: "By continuing, you agree to the Terms of Use and Privacy Policy." 2 + 4: the in-app document sheet opens. 5: the art shrinks; the text and the legal line are not cut. | | #1421 (1) · #46 r2 T · VoiceOver reads the line with the buttons (`aria-describedby`) |
| ON-PILL | both | 1) Look at the top of welcome. 2) Tap the pill. 3) Pick Deutsch. 4) Pick English again. | 1: a 44 px pill "🌐 Language". 2: the language sheet. 3: welcome in German; the pill says "🌐 Sprache". | | #1422 P2 |
| ON-S3 | both | 1) Swipe the welcome slides to slide 3. | Title "Send IXI like a message."; text "A private IXI wallet lives inside every chat. Send and request IXI in a tap." | | ON-1 Part D |
| ON-BG | both | 1) On welcome, tap "Create new account". 2) Go back. 3) Tap "Restore existing account". | The navy backdrop (BG 2, no pink) slides in with no flash; the cards are slate (CARD 2), no outlines; the button is solid blue, no glow. | | #1422 |
| ON-RINGS | both | 1) Look at welcome. 2) Open create. 3) Open restore. 4) I: open the keyboard on each. | 1: rings in the top-right corner. 2 + 3: top-right + bottom-left. They never sit under text; they do not move on the slide; when content reaches a ring set it fades. | | #1422 (the shared rings layer) |
| ON-C1 | both | 1) Create new account. 2) Look at step 1. 3) Type a nickname. | 2: photo → "Who are you on Spixi?" → "Pick a nickname. A photo is optional." → tags "No email" · "No ID" → nickname; "1 of 2" under the header title; "Your Spixi address is made on this phone." (I) / "… on this device." (M); Continue off. 3: Continue on. | | #1420 · #1422 (one order everywhere) |
| ON-PHOTO | I | 1) On step 1 tap the photo. 2) Pick a photo in Photos. 3) Finish ON-C4. 4) Open the Account hub. | 2: the round preview shows it. 4: your photo is there. | | #1420 (C# writes the photo at pick time) |
| ON-KB | I | 1) On step 1 tap the nickname field. 2) Continue to step 2; tap the password field, then the confirm field. 3) On restore, tap the password field. 4) Tap an empty part of the page. | 1–3: the main button (Continue / Create my account / Restore account) stays visible above the keyboard. 4: the keyboard closes. | | #615 · `launch.html` launchKeyboardInset |
| ON-C2 | both | 1) On step 2 type a 6-character password. 2) Type a different confirm. 3) Tap outside the confirm field. 4) Type a strong 12+ character password and the same confirm. | 1: the strength bar (Weak / Fair / Good / Strong); "10+ characters" not checked. 2: no red yet while the confirm is shorter. 3: red, "The passwords don't match yet." 4: both checks green ("10+ characters", "Passwords match"); the banner "Write this password down"; "Create my account" on. | | ON-1 Part A |
| ON-C3 | both | 1) On step 2 tap the back arrow. 2) Tap back again. | 1: step 1 with the nickname and the photo kept. 2: welcome. | | #1421 · #1422 |
| ON-SWIPE | I | 1) On step 2 swipe from the left edge. 2) Swipe again. 3) Go to step 2; tap "Create my account"; swipe at once. | 1: step 1, values kept. 2: welcome. 3: nothing moves while "Creating your account…" shows. | | `launch-shell.js` createStepBack (no C# change) |
| ON-C4 | both | 1) Tap "Create my account". 2) Time from the tap to Chats. 3) Read the log. | The button shows a spinner + "Creating your account…"; after 2 s the line "Making your keys on this phone. This can take a few seconds." (I) / "… this device …" (M); no setup screen; Chats opens. Write the seconds. | | #1421 (2) · then S16-L8-NEW step 3, S17-WN |
| ON-R1 | both | 1) Delete the account (walk order step 5). 2) On welcome tap "Restore existing account". 3) Tap "Choose backup file". 4) Pick the backup from step 3 of the walk order. | 2: "Restore your account" + "Your backup file and password bring back your account, contacts and wallet." 3: I: the Files picker · M: the open dialog. 2 (M): the focus is in the password field. 4: the file card shows the file name + "Change". | | #1420 |
| ON-R2 | both | 1) Type a WRONG password. 2) Tap "Restore account". | "Restoring…" in the button, then "That password didn't open the backup."; the file stays chosen; no account opens; nothing is stored. | | #1420 · #1323 (verify before any write) · V-15 A-13 merged here |
| ON-R3 | both | 1) Type the right password. 2) Tap "Restore account". 3) Time it. 4) Look at Home. | "Restoring…" in the button (no slow screen); Chats opens with your contacts, wallet and YOUR photo; the "What's new" card opens once. Write the seconds. | | #1421 (3) · #1338 WN-RESTORE |
| ON-FONT | both | 1) Pill › Slovenščina. 2) Read slide 2 and the create step 2 title. 3) Pill › Lietuvių. 4) Read slides 3 + 4 and the restore title. 5) Pill › English. | 2: "Brez telefonske številke…", "Zaščitite svoj račun" — č / š / ž in the same font as the letters next to them. 4: "Siųskite IXI kaip žinutę.", "…programėlės…", "Sveiki sugrįžę" — the same. Take a screenshot of each. | | #1421 (4) · #1422 Sora latin-ext (launch shell only) |
| ON-RM | both | 1) Turn Reduce motion on. 2) Go welcome → create → step 2 → back → restore. | No slide; the rings are static; the same end states. | | ON-1 reduced motion |
| ON-DK1 | M | 1) Make the window 1280 × 800. 2) Open create, then restore. 3) Make the window narrower than 900 px. 4) Make it 800 × 600. | 1–2: two columns; the card (460 px) on the right; the traffic lights do not cover the back arrow or the card. 3–4: the phone layout, centred, max 460 px; the button is visible (the card scrolls inside if needed). | | ON-1 Part B · #1422 |
| ON-DK2 | M | 1) Open create. 2) Press Tab through the view. 3) On step 2 fill both fields; press Return on the confirm field. 4) Open restore. | 1: the focus starts in the nickname field. 2: back → fields → eye buttons → checks → button. 3: Return runs "Create my account" only when it is on. 4: the focus starts in the password field. | | ON-1 Part B (keyboard and focus) |

**Result line for DECISIONS:** `WALK #n (office, S20 build, iPhone + Mac): n P · n F · n N/A` — one row; list the F rows; each F = mechanism first (#294).
