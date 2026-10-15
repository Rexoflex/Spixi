# Walk S20H — Drop A (Windows F5 + Android Debug)

Added 2026-10-15 (Session 20H Drop A; DECISIONS #1453–#1455). Platforms: Android (A) · Windows (W) · A+W = both. iPhone + Mac rows: `docs/office-walk-sheet-v1.md` §16 phase 14 (the Artifact "Spixi Office Walk 2026-10-15"). Drop B rows are added when Drop B is delivered.

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
