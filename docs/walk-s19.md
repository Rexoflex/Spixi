# Walk S19 — the S18 walk fix round

**RESULT (Damir 2026-10-13 11:20, Windows F5 + Android Debug): 16 P · 0 F · 0 N/A.** Session 20 writes it as `WALK #1374`.

Added S19 (2026-10-13, DECISIONS #1369–#1373). Walk on the S18 build. The S19 C# (SMoments · S17MomentRules · AppDetailsPage · SpixiContentPage · MiniAppManager · S19FetchRules) is UNCOMPILED for MAUI: S19-BUILD is its first compile. Platforms: Android (A) · Windows (W). Logs: grep `[MO]`, `[FLAGS]`. Moment rows: Developer › Reset moment sheets + restart before EACH MO row. The interactive sheet is the published Artifact "Spixi Session 19 Walk"; this file is its source.

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| S19-BUILD-W | W | 1) F5. 2) Apps tab: hover an app tile (grid). | The build succeeds. The hovered grid tile darkens (only this build). | P | this build only |
| S19-BUILD-A | A | 1) Wipe obj / bin, Debug -t:Run. 2) New chat › Create group: pick 2. | The build succeeds. The top-bar button is a pill "Next ✓" (only this build). | P | this build only |
| PT-STALE | W | 1) Account › Chat appearance › Background: Waves. 2) Back to Chats. 3) Open ONE chat. | The first chat already shows Waves. Repeat with Contours. | P | #1371 F1 |
| AC-NOFLICKER | A | 1) New chat › Add contact › Enter or paste a Spixi address. | The sheet disappears at once; the keyboard opens on the form; no sheet jumps up. | P | #1371 F2 |
| MO-OFFLINE | A | 1) Developer › Reset moment sheets, restart. 2) The sender closes Spixi. 3) Tap Download on a file they sent. 4) Wait 5 s. | The sheet "Waiting for <name>"; log `[MO] ask id=offline d=grant why=ok`. | P | #1371 F3 |
| MO-LANG | A | 1) Developer › Reset moment sheets, restart. 2) Language › Deutsch. 3) Italiano. 4) Français. 5) Deutsch again. 6) English. | 2–4: each shows the AI sheet (`[MO] ask id=lang d=grant`). 5: no sheet (`d=refuse why=seen`). 6: no ask. Pay / Mic still show their sheets later in the same session. | P | #1370 · #1371 F4 |
| MO-APP-INSTALL | A | 1) Developer › Reset moment sheets, restart. 2) Apps › Add app › paste a link to an app you do not have › Get app. 3) Tap Install. | ONE sheet "Before you install <app>" with the app's permissions (no second "Install?" dialog). Install installs. Opening it later from Apps: no sheet. | P | #1370 · #1371 F5 |
| AA-OFFLINE | A | 1) Turn the network off. 2) Apps › Add app › Paste link › a valid link › Get app. | The text "The link did not respond. Check your connection and try again." with the alert glyph. | P | #1371 F6 |
| AA-HOVER | W | 1) Apps tab, grid layout, light and dark. 2) Hover a tile; press it. | The whole tile darkens on hover and a step more on press. List rows unchanged. | P | #1371 F7 · Damir: tap on an app opens its details first; replace the ⋮ with a run / launch icon? (S20 item, render first) |
| MO-RESET-TOAST | A | 1) Developer › Reset moment sheets. 2) Tap it 5 times fast. | A toast "Reset sent. Restart the app." Fast extra taps within 1 s do nothing (one log line). | P | #1371 F8 |
| MO-AUTODL-FLASH | A | 1) Privacy › auto-download OFF. 2) Reset moment sheets, restart. 3) A contact sends a new photo; download it. 4) Open Settings in the sheet. | Settings opens on Privacy; the auto-download row flashes once (no flash with Reduce motion). | P | #1371 F9 |
| DB-DARK-A | A | 1) Dark theme. 2) Open a chat on each of the 7 canvases. | Each canvas is a little darker; incoming bubbles are a deeper, more saturated tone of the canvas and stand out from the ground; the pattern is as visible as before; the reply title in the composer reads well. | P | #1370 option B · Damir: the incoming bubbles are maybe still too close to the background — a bit darker / not too saturated? (S20 item, render first) |
| DB-DARK-W | W | 1) Dark theme. 2) Mist, Aurora, Ocean, Dusk. | As on Android. Mist: the chat ground is slightly darker than the top bar — say if that looks wrong. | P | #1370 option B |
| BG-NOTICE | A | 1) Open a blind group. 2) Open a normal group. 3) In the blind group tap ⊕. | 1: under the secure notice a second card "Blind group" — "Members can't see each other's identity. Photos and files can't be sent in this group." (the two cards sit together). 2: no such card. 3: no Photos / Camera / File. | P | #1371 F11 |
| NG-PILL | A | 1) New chat › Create group: pick 0, 1, 2. 2) A chat › ⊕ › App invite: pick 1. | 1: the pill "Next ✓" is off at 0–1 and on at 2. 2: the pill "Start ✓". | P | #1371 F12 |
| KEEPOPEN | A | 1) Send a photo and a file. 2) Receive a photo and a file (the sender keeps Spixi open). | While sending: "Keep Spixi open until it's sent." While receiving: "Comes directly from the sender's device. Keep Spixi open." | P | #1371 F13 |
