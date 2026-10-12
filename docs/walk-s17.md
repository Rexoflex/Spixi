# Walk S17 — What's new · About · Chat appearance (v3) · illustrations · settings screens · Moment sheets

Added S17 (2026-10-11, DECISIONS #1331–#1350). Walk on the S17 build, AFTER the S16 walk (`docs/office-walk-sheet-v1.md` §6). The S17 C# is UNCOMPILED (first compile = S17-BUILD). Platforms: Android (A) · Windows (W) · iPhone (I) · Mac (M).
Logs: grep for `[FLAGS]`, `SMoments`, `[THEME]`. The interactive sheet is the published Artifact "Spixi Session 17 Walk"; this file is its source.

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| S17-BUILD | A W I M | 1) Wipe `obj` / `bin` (the html changed). 2) Plain build (Windows = F5). 3) Open the app. | Build succeeds. Log has `[FLAGS] s17bridge=1` and `[FLAGS] s17moments=1`. Settings › Chat appearance shows SEVEN canvases (only this build). | | first compile of the S17 C# |
| WN-FRESH | A | 1) Delete account, create a new one. 2) Reach Home. | The "What's new" card opens once (6 slides, "New in Spixi <version>"). Got it closes it. Restart: it does not come back. | | #1338 · Damir 20:43 |
| WN-RESTORE | A | 1) Delete account, restore from a backup. | The card opens once after the restore too. | | #1338 |
| WN-CLOSE | W | 1) Fresh account. 2) Close the card with Esc (W) / back (A) / ×. 3) Restart. | Every close path counts as seen: no card after the restart. | | P26 |
| WN-ABOUT | A W | 1) Account › About › "What's new". | The same card opens; the row's "New" badge is gone after it closes. | | #1333 |
| AB-BAR | A | 1) Account › About. 2) Scroll. 3) Contributors. | The status bar ink is white on the blue header (violet on Contributors); back on the hub the bar follows the page again. | | #1339 · P26 |
| CA-CANVAS | A W | 1) Chat appearance › each of the 7 canvases, light and dark. 2) Open a chat. | Each canvas has its OWN flat bubble colour; the dark canvases keep their colour over the whole chat (no fade to black at the bottom). | | v3 21:50 |
| CA-TILES | A | 1) Background = None, then Contours, then Waves. 2) Pick another canvas. | The canvas tiles show the selected background; the background tiles show the selected canvas. | | v3 §6 |
| CA-PICK | A W | 1) Pick a bubble colour, then a canvas. | A picked colour overrides the canvas's own; a canvas pick resets to Auto. The theme / preview tiles show a rim + a check, no radio. | | #1334 · 20:21 |
| CA-CORNERS | A | 1) Corners slider to 4, 18, 22; open a chat. | 18 = today's bubbles; the small corners follow (4 → 2 px, 22 → 5 px). | | #1336 |
| CA-PATTERN | A W | 1) Compare the chat pattern with the S16 build. | The pattern is about 20 % lighter (Contours and Waves). | | v3 21:57 |
| DL-SCREEN | A | 1) Settings › Downloads with files. 2) Select mode, select 2, Delete. 3) Clear all. | Summary card, chips, day groups; select + delete confirm; Clear all empties the list. | | #1336 · #1349 |
| DC-SCREEN | A W | 1) About › Contributors. | Heart header with motion, contributor chips (tap = sparks), credits. | | #1336 |
| MO-LANG | A | 1) Settings › Language › Deutsch. 2) Then Français. 3) Then English. | 1: the sheet "Mit KI übersetzt", pills "Hello" + "Hallo", button "Verstanden". 2: no sheet now (one per session); restart the app, then Français again → the French sheet. 3: no sheet. | | #1340 · 1 |
| MO-AUTODL | A | 1) Privacy: auto-download Off, Load pictures On, Tips On. 2) In a chat, tap a received photo to download it. 3) Tap "Open Settings". 4) Set Wi-Fi only there. | 2: after the photo shows, the sheet "Download photos automatically?" with "Open Settings" + "Not now". 3: Settings opens on Privacy, scrolled to the auto-download row (the sheet does NOT change the setting itself). 4: a new photo on Wi-Fi downloads by itself. | | #1340 · 2 · #1347 security |
| MO-OFFLINE | A | 1) The sender closes Spixi. 2) Tap Download on a file they sent. 3) Wait 10 s in the chat. | The sheet "Waiting for <name>". When the sender opens Spixi, the download continues by itself. | | #1340 · 3 (heuristic) |
| MO-IXI | A | 1) New account (no backup). 2) Receive IXI. 3) Tap "Back up now". | The sheet "You received your first IXI"; Back up now opens Backup. With a backup: no sheet. | | #1340 · 4 safety |
| MO-MIC | A I W | 1) New install. 2) Tap the mic in a chat. 3) Continue. | 2: the sheet "Send voice messages" BEFORE the system dialog. 3: the system asks; recording starts. Windows exe (unpackaged): no sheet. | | #1340 · 5 |
| MO-APP | A | 1) Open a mini app from an invite, then another from Apps. | Each first open: "Before you open <app>", the app's own capability rows; the invite adds "<name> invited you to this app." Cancel stays; Open opens. Second open: no sheet. | | #1340 · 6 |
| MO-PAY | A W | 1) Wallet › Send, pick, amount, Review. | First time: "Before you pay" BEFORE the review; Continue → the review → the NATIVE confirm (unchanged). Second time: straight to the review. | | #1340 · 7 |
| NT-SENDER | A | 1) Fresh install. 2) Settings › Notifications. 3) Lock the phone; a contact sends a message. | "Show sender" is ON by default; the lock screen shows the contact's name (a long or odd nickname is cut / cleaned). | | #1346 |
| MO-ONCE | A | 1) After the rows above, restart twice. | No moment sheet comes back. | | seen is stored before it shows |
| MO-STACK | A | 1) A day with a hint card on Chats (or the update card). 2) Do a first action (e.g. the mic). | No moment sheet in that session (the mic goes straight to the system). Next session: the sheet. | | one per session |
| MO-FLAG | A | 1) Dev mode › Developer › "Moment sheets (S17)" OFF. 2) Restart. 3) Repeat MO-PAY on a fresh account. | `[FLAGS] s17moments=0`; no moment sheet anywhere. | | P28 flag |

**Result line for DECISIONS:** `WALK #n (S17 build, A / W / I / M): n P · n F · n N/A`.
