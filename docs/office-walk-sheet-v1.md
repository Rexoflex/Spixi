# Office walk sheet — v1, iPhone + Mac

Created S13, 2026-10-09. Source: `docs/freeze-inventory-2026-10-08.md` §1 + §4 step 3, `docs/release-readiness.md` §V (V-31, V-32) / S2 / S3.
This is the **first iOS + Mac compile of the C# from sessions 2–13** and the first I/M walk of any V row (the last office walk is #1114).
Platform: **I** = iPhone · **M** = Mac (Catalyst) · **both** = walk on each, write two results (e.g. "I P · M F").
Fill P / F / N/A. Paste the iPhone + Mac logs with the results. Each fail → mechanism first (#294), then the fix round, then `freeze-v1`.

**Set-up (before row B-1).** Peer devices on the S13 build: one Android phone + the Windows PC. One device with the LEGACY Spixi (store build, iOS)
for V-0. Test data: a chat with > 200 messages, a group you own, a photo with GPS in EXIF, a > 20 MB photo, a mini-app.

## 0 · BUILD

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| B-0 | M | 1) Run `git log --format=%h --grep="Claude-Session" \| wc -l`. 2) Run `git status -sb`. | `0`; `## redesign/frontend...origin/redesign/frontend`, no ahead / behind (E-M2). | | |
| B-1 | both | 1) Pull the S13 commit. 2) Delete `Spixi/obj` and `Spixi/bin`. 3) Do a plain build (no incremental). | Build succeeds; no new warning class. Paste any error with file:line. | | first compile of S2–S13 C# |
| B-2 | both | 1) Run the app. 2) Open Account › About › Why Spixi. 3) Look at the "End-to-end encrypted" row. | The row shows the title only — no second line "Only the person you write to…" (S13 only, #1269 (1)). | | proves a clean build |
| B-3 | both | 1) Open a chat with a photo. 2) Look at Account › How to use Spixi. | Album mosaic and How to use A render (S12 shells packaged). | | |

## 1 · Priority V rows (inventory §4 step 3 order)

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| V-0 ×5 | I | 1) Put the iPhone app in the background. 2) Legacy-iOS peer sends 2 messages fast. 3) Tap the 2nd notification. 4) Look, go back, reopen. 5) Repeat 5 times. | Both messages shown every time, also after reopen. Paste `[P0]` lines. | | receiver = S13 build |
| V-0-NEW | I | 1) Repeat V-0 once with the Mac (S13 build) as sender. | Both messages shown, also after reopen. | | |
| V-2 | I | 1) Open the > 200-message chat. 2) Scroll up slowly to the top. 3) Flick fast through 2 pages (momentum). | Older rows load before the top; small spinner; no jump; the row under the finger stays; unread not reset. | | iPhone momentum = the owed row |
| V-2 | M | 1) Open the > 200-message chat. 2) Scroll to the top with the trackpad. | Older rows prepend; no jump. | | |
| V-8 | both | 1) Hold the mic, record 5 s, send to an Android peer. 2) Play the peer's reply. 3) Slide to cancel once. | Live wave while recording; sending ring; clip plays; cancel sends nothing. No crash (AVAudio recorder first run). | | |
| V-8 file | both | 1) Send a voice clip into a group. | Arrives as an audio file; excerpt "🎤 Voice message (0:0n)". | | dual path |
| V-8b | both | 1) Close the app on the peer. 2) Send a 25 s inline clip. 3) Open the peer app. | The clip arrives through the push mailbox; the tick claims only the hand-off. | | |
| V-14 | I | 1) Attach › Photos, pick 3 photos. 2) Attach › Camera, take one. 3) Send all. | Picker + camera open (camera permission text correct); preview sheet; photos arrive ≤ 2048 px. | | |
| V-14 | M | 1) Attach › Photos, pick 2 photos. 2) Attach a video. | Mac picker opens; photos send; the video goes as a file with the location note. | | |
| V-14c | both | 1) Pick 10 photos and send. 2) Look on the Android peer. | One album bubble on both sides; mosaic laid out right; > 10 refused. | | |
| V-14d | both | 1) Send the GPS photo as a photo. 2) Check EXIF on the peer's saved copy. 3) Send the > 20 MB photo. | No GPS / metadata; rotation right; the big photo decodes bounded (no crash, no memory kill). | | iOS + Mac encoders, ~100 MP cap |
| V-14b | M | 1) Copy an image in Preview. 2) Press Cmd+V in the composer. 3) Send. | Preview sheet opens; the image sends; no file named by the WebView. | | |
| V-14b | I | 1) Copy a photo in Photos. 2) Long-press the composer, Paste. 3) Send. | Preview sheet opens; the image sends. | | |
| V-15 A-14 | M | 1) Open a mini-app. 2) Scroll its page. 3) Tap an http link inside it. | Scroll works; the link does not navigate the mini-app WebView (A-14 handler, row 9-MAC). | | N/A ×4 on W/A |
| V-15 A-13 | both | 1) Restore a backup with a WRONG password. 2) Then restore with the right one. | Wrong password: error, lock setting untouched. Right password: restore works. | | no sheet row before |
| V-24 | M | 1) Open the chat-info pane and a menu. 2) Click inside another pane. | The menu closes (light dismiss across WKWebView panes); no stuck dim. | | |
| V-25 | both | 1) Reply to a message, then Edit one. 2) Record a voice clip. 3) Look at chat grounds in both themes. | Composer grows on Reply / Edit; live wave; voice bubble face + mic badge; grounds match the theme. | | ×4 platforms |
| V-26 cold | I | 1) Force-quit. 2) Start the app, record the screen. 3) Repeat in dark theme. | No white frame at cold start. | | |
| V-26 open | I | 1) Record the screen. 2) Open 10 chats from the list. 3) Repeat in dark theme. | No blank or grey frame between the list and the chat. | | the S13 fix is Android-only; check iOS |
| V-29 viewer | both | 1) Open a photo in the viewer. 2) Pinch / scroll zoom, page left and right. 3) Tap Save. | Zoom + paging work; Save adds the photo to Photos (I) / opens a save dialog (M). | | |
| V-29 hints | both | 1) Reset hints (Settings). 2) Restart. 3) Read the tips; tap "Learn more" on tip 1. | Tips 1 / 3 / 4 + 5–9 show once each; tip 1 opens https://www.ixian.io (`ixian:hintHelp`); no tip 2. | | V-31 too |
| V-29 season | both | 1) Set the device date to 31 Oct. 2) Open the app. 3) Set 24 Dec. 4) Set the date back. | Seasonal top bar art on each date; the normal bar after reset. | | desktop N/A on W |
| V-29 update | both | 1) Open the update card (if a newer build is listed). | Glass card; the link opens `download.html`. | | N/A if no newer version |
| V-30 send | both | 1) Wallet › Send, 2-step amount. 2) Try Use max, then over balance. 3) Paste "1.5". 4) Review, cancel at native confirm. | Over-balance refused; paste fills 1.5; Review + native confirm shown; nothing sent. | | |
| V-30 offer | I | 1) With auto-download Off, receive a photo offer from Android. | Blurred preview (≤ 8 KB) from a contact; tap downloads. | | |
| V-18 | I | 1) Turn VoiceOver on. 2) Move through chats list, a chat, the composer. | Every control has a spoken name; no trap. (= E-I7) | | or ruled optional |
| V-18 | both | 1) Check H-16 b / d / e and D-06 in dark theme: group avatar height, sheet step, canvas layers. | No visible defect. | | device checks, #1247 |

## 2 · Other built V rows (one pass each)

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| V-0b | — | — | Windows-only. | N/A | |
| V-1 | both | 1) Open 5 chats from the list. 2) Open and close chat info. 3) Start a call, look at the call bar. | Chat open feels instant (< 100 ms); no full list rebuild flicker; avatars appear; pane opens / closes smoothly. Paste `[P1]` / `[CDPERF]` lines. | | P-1 numbers |
| V-3 | both | 1) Tap a media tile in a chat. 2) Tap one in chat info. 3) Click outside the viewer (M). | The in-app viewer opens with the local image; outside click closes (M). | | |
| V-4 | both | 1) New group, pick 10 contacts. 2) Try an 11th. 3) Untick one. | "n / 10"; at 10 the cap line, other rows dimmed; "9 / 10" after untick; C# alert if forced. | | |
| V-5 | both | 1) Open a chat with an old-app peer. 2) Open a chat with a new-app peer. | Reply / edit / voice offered only to the new app; log `cap answer rx`. | | |
| V-6 | both | 1) Reply from the menu. 2) Swipe right (I) / hover button + double-click (M). 3) Tap the quote. | Quote box; jump to the original; strip closes on Back. | | |
| V-7 | both | 1) Edit an own text message. 2) Look on the peer. | Text replaced, "edited", original time kept; no push for the edit. | | |
| V-9 | both | 1) Add the iPhone to a group from the peer. 2) As owner, change the group avatar. | "You were added" notice; avatar changes; members position right. | | |
| V-10 | both | 1) React with each of the 6 quick emoji. 2) Look on the peer. | One reaction per person; silent (no push). | | |
| V-11 | both | 1) Receive a mini-app session invite. 2) Decline one, accept one. | Accept / decline UI; "Joined" + "Open again". | | |
| V-13 | both | 1) Turn read receipts, typing, online status off. 2) Chat with the peer. | Peer sees no read tick, no typing, no online dot. | | |
| V-16 | both | 1) Start a fresh install to the Create screen. | Onboarding copy renders, no overflow, both themes. | | |
| V-17 | both | 1) Pick a non-English language. 2) Tap "Report a translation problem". | Note shown; mail compose opens (MailCompose). | | |
| V-21 | both | 1) Open a group media tile. 2) Scroll a chat while a menu is open. | Viewer motion smooth; no menu on scroll; hover kept (M). | | |
| V-22 | both | 1) Open Downloads (M: dialog). 2) Look at a deleted bubble and a heart count. | Downloads dialog B (M); deleted / not-available cards; heart beside count. | | |
| V-23 | both | 1) Contacts › a contact › Message. 2) Open and close chat info. | No stutter on Message; no flicker on close. | | |
| V-27 | both | 1) Look at privacy icons and toggle cards. 2) Send a photo; read the chats-list excerpt. | Icons A; toggles B; excerpt "Photo" / "{n} photos" / caption. | | |
| V-28 | both | 1) Attach strip; send > 50 MB file. 2) Download all in an album. 3) Trigger a toast. | Strip A; 50 MB cap message; Download all works; toast readable. | | |
| V-31 | both | 1) Open About (B) and How to use (A). 2) Tap Rate (I). | About hero card + rows render; How to use opens; Rate opens the store sheet (I). | | Rate N/A on M |
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
| E-W7 | M | 1) Set app theme Light / Dark / System × macOS Light / Dark. 2) Read the title. | "Spixi IM" readable in all 6 combinations. | | |
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
| A-17 | both | 1) Restore a backup with an extra entry `..\html\marker.txt`, right password. 2) Check `<spixiUserFolder>/html/`. | `marker.txt` does not exist (zip-slip fenced). | | gate `:1374` |
| P-1 | both | 1) Time 5 chat opens (tap → first chat frame). 2) Paste the `[P1]` lines. | < 100 ms per open; numbers into `docs/p1-measurement.md`. | | |
| P-1b | I | 1) Build with `UseInterpreter` true, time 5 opens. 2) Build false, repeat. | Numbers for both; BE answers why it is set. | | `Spixi.csproj:135` |
| D-5 | I | 1) Run Instruments 30 min with normal use. | No kill; no unbounded memory growth. | | or schedule it |

## 5 · S14 / S15 rows (S15 build) — Android (A) · Windows (W) · iPhone (I) · Mac (M)

Refreshed S15 (2026-10-10, DECISIONS #1296–#1308). Walk these on the S15 build (the first compile of the S15 C#: 20+ files).
Android = the new phone (Android 16) unless the row says old Moto. Logs: Android `android-s15w.txt` (`adb logcat -d -v time`), Windows the newest `Documents\Spixi` log.

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| S15-BUILD | A W I M | 1) Wipe `obj` / `bin`. 2) Plain build. 3) Open a chat, send "hi". | Build succeeds (first compile of S15 C#); the sent bubble RISES from the composer (S15-RISE). | P | paste any error file:line · A W 2026-10-10 (I M owed) |
| S15-RESTORE | A | 1) Make a Spixi backup (Account › Backup). 2) Delete account. 3) Create an account. 4) Delete account. 5) Restore the backup, WRONG password. 6) Restore, right password. | 5: password error, nothing changed. 6: the account restores with contacts and YOUR avatar; no "free space" alert. | P | the S14 half-restore sequence (#1297) · A |
| S15-RESTORE-B | A | 1) With an account on the phone, Lock › "change" (forgot password) › Restore the backup. | "Account already on this device"; nothing changed; the old account still opens. | P | WalletConflict · UX: "use a different wallet" leads nowhere (#1311 b) |
| S15-GBACKUP | A | 1) `adb shell bmgr backupnow com.ixilabs.spixi.dev`. 2) `adb shell dumpsys backup \| findstr spixi`. 3) Optional: a new-phone restore. | The backup runs; after a restore the app asks the password ONCE (retry screen); settings start fresh; no chats. | N/A | #1300 (sharedpref out) · not run |
| S15-RISE | A W I M | 1) Send 3 texts, one reply, 3 photos from the strip. 2) Scroll up, send one. 3) Turn reduce motion on, send one. | Each new bubble rises from the composer, the older ones move up with it, no fade; scrolled up / reduce motion: no movement; history loads never move. | P | #1301 — record the screen on A · A W (I M owed) |
| S15-STRIP | A I | 1) Pick 5 photos, tap Next. 2) Before the previews fill, try Send and "+". 3) ✕ one tile while it loads. 4) Wait, then Send. | The strip opens AT ONCE with 5 tiles; previews fill one by one; Send and "+" wait; the ✕ removes the tile; 4 photos send. Paste `[P1] media prepare`. | P | #1302 · A (I owed) |
| S15-WHITE | A | 1) Open a chat. 2) Lock 30 s, unlock. 3) Repeat with Account › Developer › container Shadow, then None. 4) Set Clip back. | No white chat surface after unlock (any mode). If white: note the mode, tap once, save logcat at once. | P | #1305 (2) — Clip suspect · not reproduced; #1305 stays open |
| S15-PSS | A | 1) Run the PSS loop (handoff §4). 2) Open 3 chats · pick + send 5 photos · album + viewer · chat info, noting the time of each. | Find the action that makes the jump to > 600 MB (#1295 / #1305). | P | paste pss-timeline.txt · quiet 500–550 MB; peaks = chat info + photo prepare during the header sync (#1309) |
| S15-TIP | A W | 1) Tip more than your balance in a chat. | "The amount plus the network fee is more than your available balance." — no number. | P | #1306 · A W |
| S15-LOG | W | 1) Account › Developer (dev mode ON) › Send log. 2) Turn dev mode off, try again (if the row still shows). | A save dialog asks where; nothing written silently to Downloads; with dev mode off nothing happens. | P | O-19 · W; the row hides with dev mode off |
| S15-LOCKWIN | A | 1) Lock on, pick a photo (own picker), come back within 60 s. 2) Repeat, come back after 90 s. | 60 s: no lock. 90 s: the lock shows. | P | O-29 · A |
| S15-LANG | A W | 1) Light theme. 2) Account › Language. 3) Screenshot the sheet with the scroll bar visible. | A light scroll indicator. If dark: send the screenshot (no fix before it). | F (A) · P (W) | #1306 · A: dark thumb in light, light thumb in dark = the native indicator follows the theme; the expected text was wrong (#1309) |
| S15-UNREAD | A | 1) With the old Moto off the account, leave the phone 30 min. 2) Look at the unread counts. | No count rises without a new message. | P | #1298 recheck · A |
| S14-OLD | A (old Moto) | 1) Back from every subscreen (Android ≤ 15). 2) Account → each tab. | Back = one level; the tab lands right. | P | the S14 rows not walked · old Moto |

**WALK 2026-10-10 (Android + Windows, §5): 16 P · 1 F · 1 N/A — iPhone + Mac (§0–§4 and the I / M legs of §5) NOT walked yet → walk them on the tag `s15-walk` (#1310).**

**Result line for DECISIONS:** `WALK #n (office, S15 build, iPhone + Mac + the §5 rows on Android / Windows): n P · n F · n N/A`.
