# Walk V1A-M — the first-minute moments (Windows F5 + Android Debug)

Added 2026-10-15 (Session V1A-M Drop 2; DECISIONS #1447–#1452). Platforms: Android (A) · Windows (W) · A+W = both. Light + dark where the row says so. iPhone + Mac rows: `docs/office-walk-sheet-v1.md` §16 phase 13 (and the office Artifact). The Artifact "Spixi V1A-M Walk" carries the same rows with P / F / N/A buttons and saves the results for Claude.

## Set-up
- **(0) ★ COPY YOUR DATA FIRST (L149).** Before ANY row: close Spixi, then copy the whole data folder. Windows: `Copy-Item -Recurse "$env:USERPROFILE\Documents\Spixi" "$env:USERPROFILE\Documents\Spixi-copy-$(Get-Date -Format yyyyMMdd-HHmm)"`. Android: a test phone / a test account only. M2-EMPTY needs an account with NO chats: use set-up (d).
- **(a) Patch + commit:** apply `session-v1am-drop2.patch` on the Drop 1 commit and commit (commands in the delivery message). C# changed: `SpixiFlags` · `V1AMRules` (new) · `S17MomentRules` · `SMoments` · `SHints` (comment) · `S11HintRules` · `HomePage` · `DevPage` + 13 `lang/*.txt`.
- **(b) Windows:** F5 only, never `dotnet build` (#663). Close Visual Studio, wipe `Spixi\bin` (`cmd /c rd /s /q "\\?\<repo>\Spixi\bin"`) + `Spixi\obj` first (L139).
- **(c) Android:** close Visual Studio, wipe `Spixi\obj` + `Spixi\bin`, then `dotnet build Spixi\Spixi.csproj -f net10.0-android -c Debug -t:Run`.
- **(d) An empty account on Windows WITHOUT touching yours:** after (0), close Spixi, RENAME `Documents\Spixi` to `Documents\Spixi-mine`, F5 → create a test account. When done: close Spixi, rename the new `Documents\Spixi` to `Documents\Spixi-test`, rename `Spixi-mine` back to `Spixi`. Android: Settings › Apps › Spixi › Storage › Clear storage on a TEST phone.
- **(e) Developer mode ON** (Account › Developer). Moment rows: Developer › Reset moment sheets, then restart Spixi, before EACH M1 row.
- **(f) Logs:** Windows `Documents\Spixi\ixian.log`; Android `adb logcat -d -v time | Select-String "\[FLAGS\]|\[MO\]"`.
- A word tip shows about 4 s after Chats opens (it waits for the weekly tip card to decide first).

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| **BUILD · this build only** | | | | | |
| V1AM-BUILD | A+W | 1) Build (set-up b / c). 2) Account › Developer › the Release flags card. 3) Read the log. | 2: two new rows "What is IXI moment (V1A)" and "New-word tips (V1A)", both ON (only this build). 3: `[FLAGS] v1ixihelp=1` and `[FLAGS] v1hints=1` after the `s20g=1` line. | | this build only |
| **M1 · "What is IXI?"** | | | | | |
| M1-IXI | A+W | 1) Set-up (e). 2) Open the Wallet tab. 3) Read the sheet. 4) Tap "Show my address". 5) Close it. Restart Spixi; open the Wallet again. 6) Dark: repeat 1–3. | 2–3: a sheet with the coin art, "What is IXI?", "IXI is the Ixian network's token. Friends can send you IXI: share your address with them. Payments cannot be undone.", "Show my address" and "Got it". Log `[MO] ask id=ixihelp d=grant why=ok`. 4: the address sheet (QR + address). 5: no sheet. | | #1448 |
| M1-GOTIT | A+W | 1) Set-up (e). 2) Open Wallet. 3) Tap "Got it". | The sheet closes; nothing else opens. | | |
| M1-PAY | A+W | 1) Set-up (e). 2) Open Wallet; "Got it". 3) Wallet › Send: pick a contact, an amount, Review. | 3: "Before you pay" still shows (the IXI sheet does not use up the session, #1450). | | #1450 |
| M1-OFF | A+W | 1) Developer › "What is IXI moment (V1A)" OFF. 2) Restart. 3) Set-up (e). 4) Open Wallet. 5) Turn it ON again; restart. | 2: log `[FLAGS] v1ixihelp=0`. 4: no sheet; no `[MO] ask id=ixihelp` line. | | flag OFF = today |
| **M2 · word tips** | | | | | |
| M2-REQ | A+W | 1) A peer that is NOT your contact sends you a contact request. 2) Chats: look under the request card (light, then dark). 3) Windows: Tab to the tip's ✕, press Enter. Android: tap ✕. 4) Restart Spixi. | 2: a quiet card with an info icon: "A contact request means someone wants to chat with you. You choose: accept or decline." 3: the tip goes; the keyboard focus is on the request CARD, never on Accept / Decline. 4: no tip again. | | #1448 |
| M2-SEARCH | A+W | 1) With the tip of M2-REQ on screen (before ✕, or a second request on a test account): type in the chats search. 2) Clear the search. | 1: the tip hides. 2: it comes back. | | r1 B-NIT-3 |
| M2-EMPTY | A+W | 1) Set-up (d): a test account with no chats. 2) Look at Chats. 3) Tap ✕. | 2: under "No chats yet" and its text: "Spixi has no phone book. Add people with their Spixi address or QR code." 3: gone; the focus is on the "No chats yet" title, not on a button. | | #1448 |
| M2-TIPSOFF | A+W | 1) Settings › Notifications › "Tips on the Chats screen" OFF. 2) A request card on Chats. | No word tip. Turn it ON again. | | the user's switch |
| M2-OFF | A+W | 1) Developer › "New-word tips (V1A)" OFF. 2) Restart. 3) Chats with a request card. 4) ON again; restart. | 2: `[FLAGS] v1hints=0`. 3: no tip. | | flag OFF = today |
| **M3 · group emoji (Debug builds only)** | | | | | |
| M3-EMOJI | A+W | 1) New chat › Create group: "Weekend 🏔️". 2) Another: "🎸 Band". 3) Another: "Family". 4) Look at the chats list, the chat header and chat info (light + dark). 5) A contact whose nickname starts with an emoji. 6) Windows: a group "Trip 🇸🇮". | 4: Weekend shows 🏔️, Band shows 🎸, Family shows the people icon — on the list, the header and chat info. 5: the contact keeps its initials / person icon. 6: the Slovenian flag, not the letters "SI". | | #1448 · a Release build shows the people icon (#1449) |
| **M4 · the restore question in your language** | | | | | |
| M4-DE | W | Only if you walk S20G P0-ASK again (its set-up): Language › Deutsch first, then the restore. | The native question reads "Kontakte auf diesem Gerät ersetzen?" with "Abbrechen" / "Wiederherstellen" — the button text fits. | | optional |

**Result line for DECISIONS:** `WALK #n (V1A-M build, Windows F5 + Android Debug): n P · n F · n N/A` — list the F rows; each F = mechanism first (#294).
