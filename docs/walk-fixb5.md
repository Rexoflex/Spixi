# Walk fixb5 — the page batch (the password step above the keyboard, slide 4, the lock page, the chooser, the Opus decoder, the Home decline)

Session `fixb5`, 2026-11-26 (rulings #1837, #1833, #1877, #1924 + #1844 (6), #1905 + #1844 (3), #1963 (5); DECISIONS
#1990–#2009; packets P103–P105). One build per platform from the branch `work/fixb5`. The html changed and C# changed.
**Windows = Ctrl+F5 (Start Without Debugging, #1844 (1)) after a wipe of `Spixi\bin` + `Spixi\obj`** (never `dotnet build`;
do the set-up S-1 … S-3 below FIRST; S-2 is the wipe and the build). An end with `0xC000001D` or `ExecutionEngineException`
under F5 is run again with Ctrl+F5 before it counts. **Android = wipe `Spixi\bin` + `Spixi\obj`, then the dev Release build**
(`com.ixilabs.spixi.dev`; #449: an incremental build does not repackage the Raw html). The page with the same rows and every
command: the Artifact **"Spixi fixb5 — walk rows"** (https://claude.ai/artifact/35DrKKNoVhqFhXQ3Nn7xTF).
The first notice of #1825 (4) is NOT in this build (a question for Damir); so is the sweep after the undo and the two
re-adds of #1963 (5) (a question).

★ **L149 — your test account and its data stay.** Copy the data folder first. **Never** Delete account on the test
account, **never** `adb uninstall`, **never** `pm clear`. ★ The walk sends no IXI. ★ The Android rows END with App lock
**Off** again (the adb walk needs it).

## Before you start (PowerShell, one line at a time)
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/fixb5
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull --ff-only
```
- Android (the phone on USB; after the wipe of S-2):
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -p:SpixiDevCoexist=true
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; adb -d install -r Spixi\bin\Release\net10.0-android\com.ixilabs.spixi.dev-Signed.apk
```
  The same build on the emulator of A-3 / A-4 (the emulator running; `-e` = the emulator, `-d` = the phone on USB):
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; adb -e install -r Spixi\bin\Release\net10.0-android\com.ixilabs.spixi.dev-Signed.apk
```
- The smoke on this branch (optional on the PC): `npm ci` once, then `node scripts/smoke-test.mjs` →
  `BASELINE OK <n> / the 2 KNOWN` (n in the status doc).
- This is the first compile of `HomePage.xaml.cs`, `SpixiContentPage.cs`, `SpixiFlags.cs`, `OpusDecoder.cs`,
  `OpusEncoder.cs` on Windows and Android: a build error is this batch's bug — paste it.

**Windows set-up — in this order (each command is a full line: copy it as it stands, nothing to fill in).** Why: the new
account of W-3 is made in a SECOND data folder; two stores are shared with the test account: the native preferences (a
create writes App lock On, a new stored password, Load pictures Off and `walletCreatedHere`, and removes the backup-reminder stamp) and
the ONE WebView page store beside `Spixi.exe` (WALK #1835): `…\win-x64\Spixi.exe.WebView2\EBWebView`. The wipe of S-2
EMPTIES that store and DELETES `ixian.cfg` (same folder).
- **S-1 Copy the data folder** (before the wipe): `Copy-Item -Recurse "$env:USERPROFILE\Documents\Spixi" ("$env:USERPROFILE\Documents\Spixi-copy-fixb5-" + (Get-Date -Format yyyyMMdd-HHmm))`
- **S-2 The build:** close Visual Studio, then run
  `cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; Remove-Item -Recurse -Force Spixi\bin, Spixi\obj`
  then open `SPIXI.sln`, target Windows, press **Ctrl+F5**. This is the FIRST start of the new build. Note for W-9: Account ›
  Security & privacy › App lock (On or Off) and "Load pictures and GIFs" (On or Off); Account › Preferences › Theme.
  Close Spixi.
- **S-3 Copy the page store** (Spixi closed; AFTER the first start of S-2):
  `$wv = "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\Spixi.exe.WebView2\EBWebView"; $bk = "$env:USERPROFILE\Documents\Spixi-webview-copy-fixb5-" + (Get-Date -Format yyyyMMdd-HHmm); Copy-Item -Recurse $wv $bk -ErrorAction Stop; $bk`
  It prints the copy's path. An error (the folder is not there): start Spixi once with Ctrl+F5, close it, run it again.
- **R — put the store back** (Spixi CLOSED; the NEWEST copy; it prints the copy's path, then `True`):
  `$wv = "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\Spixi.exe.WebView2\EBWebView"; $bk = (Get-ChildItem "$env:USERPROFILE\Documents" -Directory -Filter "Spixi-webview-copy-fixb5-*" | Sort-Object Name | Select-Object -Last 1).FullName; if (-not $bk) { throw 'no copy of the page store' }; $bk; Remove-Item -Recurse -Force $wv -ErrorAction Stop; Copy-Item -Recurse $bk $wv -ErrorAction Stop; Test-Path (Join-Path $wv 'Default')`
- **cfgNew** (W-3; Spixi closed; Spixi then opens the new empty folder `Documents\SpixiWalkFixb5`):
  `$cfg = "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\ixian.cfg"; $old = @(); if (Test-Path $cfg) { $old = @(Get-Content $cfg | Where-Object { $_ -notmatch '^\s*spixiUserFolder' }) }; Set-Content $cfg ($old + "spixiUserFolder = SpixiWalkFixb5"); Get-Content $cfg`
- **cfgOff** (W-9; it prints `False` when the file is gone, `True` when other lines stay):
  `$cfg = "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\ixian.cfg"; $old = @(Get-Content $cfg | Where-Object { $_ -notmatch '^\s*spixiUserFolder' }); if ($old.Count) { Set-Content $cfg $old } else { Remove-Item $cfg }; Test-Path $cfg`
- **Clean-up (optional, after W-9):** `Remove-Item -Recurse "$env:USERPROFILE\Documents\SpixiWalkFixb5"`

**Android:** the test phone has no safe way to make a new account (L149). Rows A-3 and A-4 run on an **Android emulator**
(Android Studio or Visual Studio › Device Manager → a new virtual device, best a small one: 360 × 640 dp, e.g. "Small Phone", with an image of API 30 (Android 11) or newer, x86_64, which translates ARM code — the dev build holds only `android-arm64` and `android-arm` code, as `docs/walk-launch.md` set-up 7 says; install the dev build with the `-e` line above; a refused install `INSTALL_FAILED_NO_MATCHING_ABIS` = A-3 and A-4 N/A with that reason) or on a spare phone; else mark
them **N/A**. **Two settings before A-4 (emulator):** (1) the on-screen keyboard must open: Settings › System › Languages &
input › Physical keyboard (Android 14 and later: Settings › System › Keyboard › Physical keyboard) › "Use on-screen keyboard"
On — or, in the Device Manager, edit the device and turn "Enable keyboard input" Off; with a hardware keyboard and this Off no
keyboard opens and A-4 cannot be judged; (2) 3-button navigation: Settings › System › Gestures › System navigation ›
"3-button navigation" (the hard case: the bar takes 48 px under the keyboard).

## Part 1 · Windows

| Row | Steps | Pass when |
|---|---|---|
| W-BUILD | After S-1 … S-3: start Spixi with **Ctrl+F5** (the test account). Open a chat that holds a voice message from your contact (its waveform draws). Account › Developer › open the log; find `[FLAGS] fixb5`. | The log shows `[FLAGS] fixb5 opusmanaged=1 declineclears=1` (only this build writes it). |
| W-1 Voice plays (item 6) | In that chat tap play on the contact's voice message; let it play to the end. Record a short voice message and send it; play it on the other device. | Both play to the end; the app does not close; the waveform shows. With Spixi still open, this PowerShell line prints NOTHING (no native opus library is loaded into the process): `(Get-Process Spixi).Modules | Where-Object ModuleName -match 'opus' | Select-Object ModuleName, FileName` |
| W-2 The chooser (item 4) | Contacts › Add contact. Close the chooser (Esc). At once open it again and choose "Scan QR code"; then close the scanner. | The scanner opens and the chooser is gone; after the scanner closes no empty chooser stays over the page; Add contact opens again normally. |
| W-3 A new account: slide 4, the password step, the lock page (items 2, 1, 5, 8) | Close Spixi. Run **cfgNew**. Start Spixi (Ctrl+F5). On the welcome screen go to slide 4 and read its title. Create a new account (any name; a password you note). On "Protect your account" click into the first field and look at the step. Create the account. Close Spixi, start it again (Ctrl+F5): the lock page shows (App lock is On for a new account). Unlock. Account › Developer › the log. | Slide 4's title is **"Play together."** (no "plan"). "Protect your account" looks as before on Windows (the round picture and the big title stay; both fields and "Create my account" show; no keyboard state on the desktop). The lock page shows the **password form** (no endless spinner); the right password opens the chats. The log has **no** `Unknown localization key; …` line at the lock page. |
| W-4 The lock as before (`docs/walk-lockb.md` W-1) | Still in the new account (App lock On): close Spixi, start it (Ctrl+F5). | The lock shows the password form at once; a wrong password shows the error; the right one opens the chats. |
| W-9 Back to the test account | Close Spixi. Run **cfgOff**. Run **R** (it must print `True`). Start Spixi (Ctrl+F5). If it asks the password: the TEST account's password. If App lock was Off at S-2: Account › Security & privacy › App lock Off. Then Account › Security & privacy › "Load pictures and GIFs": switch it Off and On again (this syncs C#'s copy) and leave it as S-2 noted. Optional: the clean-up line. | Your test account opens with its chats (pinned contacts and drafts are not expected: the wipe emptied the page store, WALK #1835); App lock, "Load pictures and GIFs" and the theme show what S-2 noted. |

## Part 2 · Android

| Row | Steps | Pass when |
|---|---|---|
| A-BUILD | First: Account › Backup › save the backup file (L149). Install the build (`adb -d`). Open a chat and record a short voice message and send it (a recording makes the codec; a waveform kept by an earlier build is drawn without one). Account › Developer › the log; find `[FLAGS] fixb5`. | The log shows `[FLAGS] fixb5 opusmanaged=1 declineclears=1` (only this build writes it). |
| A-1 Voice plays (item 6) | Tap play on a voice message from your contact; let it play to the end. Play the message of A-BUILD on the other device. | Both play to the end; the app does not close; the waveform shows. |
| A-2 The chooser (item 4) | Contacts › Add contact. Close the chooser (back). At once open it again and tap "Scan QR code"; then go back. | The scanner opens; after back no empty chooser stays over the page; Add contact opens again normally. |
| A-3 Slide 4 (item 2; emulator or spare phone, else N/A) | Do it BEFORE A-4: on the welcome screen go to slide 4 in English; then pick Slovenščina (the language pill), read slide 4 again, and pick English again (A-4 uses the English labels). | English: **"Play together."** Slovenian: **"Igrajte skupaj."** Neither names planning. |
| A-4 The password step with the keyboard (item 1; same device as A-3) | On the welcome screen: Create, a name, Continue. On "Protect your account" tap the first password field (the keyboard opens). Look. Type a password, press the keyboard's Next key, type it again. With the keyboard STILL open, tap "Create my account". Note in the row: the navigation (3-button or gestures) and the keyboard's height (about how much of the screen it takes). | The on-screen keyboard is up (if not: the emulator settings above). With the keyboard open: the round picture is gone and the progress bar too; the title is small or scrolled out above the fields on a small screen (360 × 640); **both password fields and the "Create my account" button show above the keyboard** (the button is never hidden or cut). One limit, by design: at 360 × 640 with 3-button navigation the two fields fit with 1 px to spare (a keyboard of about 324 px at most); with a TALLER keyboard only the field you type in shows (with the button) — that is a P with the note "tall keyboard: one field", not an F. Next moves the cursor to the second field (not to the eye button), and nothing jumps. The tap on the button with the keyboard open creates the account ("Creating your account…"). With the keyboard closed the step looks as before. |
| A-5 The lock page (items 5, 8; `docs/walk-lockb.md` A-1) | Account › Security & privacy › App lock **On** (it asks). Press Home, wait **70 s**, open Spixi. Unlock with the pattern (or the fingerprint). Account › Developer › the log. Then App lock **Off** again. | The dark screen with the spinner, then the system prompt — not the Spixi password screen before it; the chats show after the unlock. The log has **no** `Unknown localization key; …` line. App lock is Off at the end. |
| A-6 The decline (item 7; optional, only if a contact request with a photo or voice message is waiting) | On Home decline an incoming contact request. | The card goes; the app does not close. (The kept media and the Sent sweep are not visible; the pins hold them.) |

## Owed to the Apple phase (not in this walk)
| Row | Steps | Pass when |
|---|---|---|
| I-1 The Return key of the password step (iPhone; item 1) | A new account on an iPhone (a second device or a fresh install, never the test account): Create, a name, Continue. On "Protect your account" type a password in the first field and press the keyboard's Return / next key. | The cursor moves to the second field and that field is in view above the keyboard (the page scrolls to it); typing goes into the second field. Without the keyboard the step looks as before. |
