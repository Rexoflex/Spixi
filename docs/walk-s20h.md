# Walk S20H — Drop A + Drop B (Windows F5 + Android Debug)

Added 2026-10-15 (Session 20H Drop A; DECISIONS #1453–#1455). Platforms: Android (A) · Windows (W) · A+W = both. iPhone + Mac rows: `docs/office-walk-sheet-v1.md` §16 phase 14 (the Artifact "Spixi Office Walk 2026-10-15"). Drop B rows: the second table (they need the Drop B patch on top of Drop A).

## Set-up
- **(0) ★ COPY YOUR DATA FIRST (L149).** These rows do not change account data (only the App lock switch). Still: close Spixi and copy the data folder before you start. Windows: `Copy-Item -Recurse "$env:USERPROFILE\Documents\Spixi" "$env:USERPROFILE\Documents\Spixi-copy-s20h"`.
- **(a) Patch + commit:** apply `session-s20h-dropA.patch` and commit (commands in the delivery message). C# changed: `LockPage.xaml.cs` (one line). Plist changed: iOS `Info.plist` (no effect on W / A).
- **(b) Windows:** F5 only, never `dotnet build` (#663). Close Visual Studio, wipe `Spixi\bin` (`cmd /c rd /s /q "\\?\<repo>\Spixi\bin"`) + `Spixi\obj` first (L139).
- **(c) Android:** close Visual Studio, wipe `Spixi\obj` + `Spixi\bin`, then `dotnet build Spixi\Spixi.csproj -f net10.0-android -c Debug -t:Run`.

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| **BUILD · this build only** | | | | | |
| S20H-A-BUILD | A+W | 1) Build (set-up b / c). 2) Account › App lock ON. 3) Close Spixi completely; start it (the lock screen). 4) Android with a fingerprint / pattern: CANCEL that prompt, tap OK on "Authentication Failed" (a different alert — it does not count). Windows has no such prompt. 5) Type a WRONG password; tap Unlock. | 5: an alert "Invalid Password" with the text "Cannot decrypt wallet, please try again." (before this build: an empty alert with only OK). | | X-1 · m009 · LockPage.xaml.cs:494 |
| S20H-A-LOCK | A+W | 1) Tap OK. 2) Type the RIGHT password. 3) Account › Language › Deutsch; close Spixi; start; cancel the prompt as in S20H-A-BUILD step 4; type a wrong password. 4) OK; unlock; Language back to English. 5) App lock back to how it was. | 2: Spixi opens. 3: "Ungültiges Passwort" + the German text. 5: as before. | | X-1 |
| **F-A · Chat appearance on a narrow window** | | | | | |
| S20H-A-APPEAR | W | 1) Make the Spixi window narrow (about 500 px, then the smallest Windows allows). 2) Account › Chat appearance. 3) Scroll the whole screen. 4) With the screen open, drag the window wide (over 900 px), then narrow again, then wide. | 2–3: nothing is cut at the right edge (the preview bubbles, the slider row with A and the number, the cards); the Canvas tiles scroll sideways inside their card. 4: wide = two columns (the preview on the left); narrow = one column; no reload; nothing cut at any size. | | F-A · Damir 12:01 screenshot · settings.html `#settings-root { min-width: 0 }` |
| S20H-A-PANE | W | 1) Wide window (Account in the pane). 2) Open each Account screen: Chat appearance, Notifications, Privacy, Backup, Downloads, About. 3) Make the window just wide enough for the pane, then a little narrower. | 2: every screen as before (no change on a wide window). 3: the list column and the screen both stay inside the window; nothing cut. | | F-A side effect (pane mode) |
| S20H-A-PHONE | A | 1) Account › Chat appearance in portrait, then landscape. | As before (phones are not changed). | | F-A control |

**Result line for DECISIONS:** `WALK #n (S20H Drop A, Windows F5 + Android Debug): n P · n F · n N/A`.

## Drop B (apply `session-s20h-dropB.patch` on the Drop A commit)

Set-up as above, plus **(d) an empty account on Windows WITHOUT touching yours** (for the create rows): after (0), close Spixi, RENAME `Documents\Spixi` to `Documents\Spixi-mine`, F5 → the welcome screen. When done: close Spixi, delete the test `Documents\Spixi`, rename `Spixi-mine` back. Android create rows: only on a phone / emulator WITHOUT your account, else N/A.

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| **BUILD · this build only** | | | | | |
| S20H-B-BUILD | A+W | 1) Build. 2) Account (the hub). | 2: Theme = a sun-and-moon icon, Change Spixi password = a key, Version = stacked cards (only this build). | | F-C |
| **F-C · Account icons** | | | | | |
| S20H-B-ICONS | A+W | 1) Account hub, light. 2) The same in dark. 3) Look at each icon in its coloured square. | All icons WHITE, centred, the same size (Confirm payments' wallet as big as the others; Declined requests' person not pushed to the right). No two rows share an icon. The square colours are the same as before; Delete data is red. Icons: Theme sun-moon · Chat appearance palette · Change password key · Declined requests person with a "no" sign · Backup file with an arrow · How to use a book · Contributors a ribbon · Developer `</>` · Version stacked cards. | | #1454 · Damir: today's colours |
| S20H-B-WARN | A+W | 1) New chat › Add contact › Enter or paste: type `abc def`; Send request. 2) Apps › Add app › Paste link: `apps.spixi.io/x`; Get app. 3) (W, set-up d) Create account: nickname `a:b`; Continue. | 1–3: the error line starts with the rounded-square "!" icon (not a bare "!" and not an "i"); the icon sits level with the text. | | one warning glyph |
| **F-B · Create account** | | | | | |
| S20H-B-JUMP | W (A: N/A unless no account) | Set-up d. 1) Create account; a nickname; Continue. 2) Password `abcdefghij1!`. 3) Confirm: `abcdefghij1?` (same length, wrong). 4) Fix the last character to `!`. 5) Repeat at a narrow window (about 500 px wide). | 3: NOTHING below the confirm field moves; the check line changes from an empty grey ring "Passwords match" to a red ✕ "Don't match yet"; the confirm field is red. 4: back to "Passwords match" with a green ✓; nothing moves. No separate red line under the confirm field any more. | | #1454 F-B option C · Damir R3-STEP2 remark |
| S20H-B-MOTION | W | Set-up d, a window wider than 900 px. 1) Welcome › Create account. 2) Type a nickname › Continue. 3) Back. 4) Windows Settings › Accessibility › Visual effects › Animation effects OFF; repeat 1–3; turn it back ON. | 1: the card fades in and its rows slide in from the right (no instant jump). 2: the card GROWS smoothly to the step-2 size while the content slides in (before: the card snapped to the new size). 3: the card shrinks smoothly. 4: a short fade only; the card size changes at once. | | #1454 step grammar · reduced motion = short fade |
| **⑦ ⑨ · small fixes** | | | | | |
| S20H-B-TIP | A+W | A fresh account (set-up d on W): the wallet tip card on Chats (it rotates in; Developer › reset tips if present). Also Language › Deutsch. | Title "Send IXI like a message"; text "Open a chat with a contact and pay from there." (no "Send IXI" twice). German: "Öffne einen Chat mit einem Kontakt und bezahle dort." | | #1423 ⑦ |
| S20H-B-CHIP | A+W | 1) Chats › the filter chips (All / Unread …), light. 2) Dark. | 1: the selected chip is a plain light-blue fill with a blue outline (no visible change from before). 2: dark keeps its soft top shine. | | #1423 ⑨ |

**Result line for DECISIONS:** `WALK #n (S20H Drop B, Windows F5 + Android Debug): n P · n F · n N/A`.

## Drop C (apply `session-s20h-dropC.patch` on the Drop B commit)

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| S20H-C-NOTE | A+W | 1) Wallet › Request (the receive screen). 2) Read the note under the amount. 3) Language › Deutsch, then Русский; read it again. 4) Back to English. | English: "A request is a message. Nothing moves until they pay." German: "… Nichts wird übertragen, bis bezahlt wird." Russian: "… Ничего не списывается, пока получатель не заплатит." No "Geld" / "Деньги" (no money word). | | #1458 · claims rule L146 |
