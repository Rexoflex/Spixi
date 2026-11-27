# Walk macfixa — Mac blockers part A (the Mac save, the mini-app icons, the first tap after a swipe, the rail at start, the address card)

Session `macfixa`, 2026-11-27 (DECISIONS #2080–#2099; packets P121, P122; prompt `claude/session-macfixa-prompt.md`). One
build per platform from the branch `work/macfixa`. The html changed and C# changed. **Windows = Ctrl+F5 (#1844 (1)) after
a wipe of `Spixi\bin` + `Spixi\obj`** (never `dotnet build`; do S-1 … S-3 below FIRST). **Android = wipe `Spixi\bin` +
`Spixi\obj`, then the dev Release build** (`com.ixilabs.spixi.dev`; #449). **The Mac rows (M-…) and the iPhone row belong
to the Apple walk** (wipe `obj` / `bin`, a plain build, then Run, #320). The page with the same rows and every command: the
Artifact **"Spixi macfixa — walk rows"** (https://claude.ai/artifact/CobspydbSctYkPnFm3xWwH).
Not in this build: the Mac camera, Mac Tab, the iPhone list anchor, the album P-22 (session `macfix`, after the Apple walk);
the chip overflow (a dial: the Artifact "Spixi — Chats filter chips in long languages (dial)").

★ **L149 — your test account and its data stay.** Copy the data folder first. **Never** Delete account on the test
account, **never** `adb uninstall`, **never** `pm clear`. The walk sends no IXI.

## Before you start (PowerShell, one line at a time)
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/macfixa
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull --ff-only
```
- Android (the phone on USB; after the wipe of S-2):
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -p:SpixiDevCoexist=true
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; adb -d install -r Spixi\bin\Release\net10.0-android\com.ixilabs.spixi.dev-Signed.apk
```
- This is the first compile of `HomePage.xaml.cs`, `SpixiFlags.cs`, `AppIconRules.cs`, `AppIconReencode.cs` (Windows,
  Android) and of `SFileOperations.cs` and `MacSaveRules.cs` (Mac): a build error is this batch's bug — paste it.
- S-1 **Copy the data folder** (before the wipe): `Copy-Item -Recurse "$env:USERPROFILE\Documents\Spixi" ("$env:USERPROFILE\Documents\Spixi-copy-macfixa-" + (Get-Date -Format yyyyMMdd-HHmm))`
- S-2 **The build:** close Visual Studio, then run
  `cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; Remove-Item -Recurse -Force Spixi\bin, Spixi\obj`
  then open `SPIXI.sln`, target Windows, press **Ctrl+F5**. Close Spixi after the first start.
- S-3 **Copy the page store** (Spixi closed; AFTER the first start of S-2; it prints the copy's path):
  `$wv = "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\Spixi.exe.WebView2\EBWebView"; $bk = "$env:USERPROFILE\Documents\Spixi-webview-copy-macfixa-" + (Get-Date -Format yyyyMMdd-HHmm); Copy-Item -Recurse $wv $bk -ErrorAction Stop; $bk`

The switches' OFF paths (the old code) are held by the pins (each OFF body = the base); no walk row sets a switch to 0.

## Part 1 · Windows (Ctrl+F5)
| Row | Steps | Pass when |
|---|---|---|
| W-BUILD | Start Spixi with **Ctrl+F5** (the test account). Account › Developer › open the log; find `[FLAGS] macfixa`. | The log shows `[FLAGS] macfixa macsave=1 iconreencode=1 swipelock=1` (only this build writes it). |
| W-1 The rail at start (item 4) | Open Account (the rail marks Account). Close the Spixi window with Account open. Start Spixi again (Ctrl+F5). Look at the rail. Tap Wallet. Change the Windows theme (Settings › Personalization › Colors › dark / light) and come back. Open Account; Account › Language → pick another language, then your language again. Leave Account by tapping Wallet. | After the restart the rail marks **Chats** (the Chats list shows). Wallet → the rail marks Wallet, and it still does after the theme change. In Account the rail marks Account, also after the language pick (#589). After Wallet → Wallet. |
| W-2 The address card (item 5) | Maximize the Spixi window first (Windows restores the last window size). Account › "My address" (the card with the QR). Then restore the window and make it short (drag the bottom edge up to about two thirds of the screen, then to the smallest height). Then Wallet › Receive › "Show my address" at the same sizes. | Maximized (any window about 700 px tall or more) the whole card shows: the band, your photo and name, the one line, the QR, the address with Copy, and the safety line under the card; nothing is cut and no scroll is needed. **There is no Share button on the desktop** (by design, W9). In a short window the card scrolls inside the dialog (a thin scrollbar) and a wheel scroll reaches the safety line; the QR gets smaller (in a very short window, below about 460 px, it can go under 185 px, as before this batch). The Wallet card: the same, without photo and name. |
| W-3 The mini-app icons (item 2) | Close Spixi. Start it (Ctrl+F5), wait 5 s, open Apps. Then in PowerShell: `Get-ChildItem "$env:USERPROFILE\Documents\Spixi\html\Apps\_icons" | Select-Object Name, Length`. | Every installed app shows its own icon, sharp (not blurred). At the very first start of this build an app may show the default icon for a few seconds, then its own. Note whether the icons still pop in after the tiles (expected: the same or shorter than before; a full fix of the pop-in is owed, DECISIONS #2087 ①). The list holds one `.png` per installed app that has an icon, each **≤ 22,482 bytes**; a `.png` of 0 bytes only for an app whose icon is broken. |
| W-9 Put the page store back (only if W-1 … W-3 changed something you want back) | Spixi CLOSED: `$wv = "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\Spixi.exe.WebView2\EBWebView"; $bk = (Get-ChildItem "$env:USERPROFILE\Documents" -Directory -Filter "Spixi-webview-copy-macfixa-*" | Sort-Object Name | Select-Object -Last 1).FullName; if (-not $bk) { throw 'no copy of the page store' }; $bk; Remove-Item -Recurse -Force $wv -ErrorAction Stop; Copy-Item -Recurse $bk $wv -ErrorAction Stop; Test-Path (Join-Path $wv 'Default')` | It prints the copy's path, then `True`. |

## Part 2 · Android (A52s, the dev Release build)
| Row | Steps | Pass when |
|---|---|---|
| A-BUILD | First: Account › Backup › save the backup file (L149). Install the build (`adb -d`). Account › Developer › the log; find `[FLAGS] macfixa`. | The log shows `[FLAGS] macfixa macsave=1 iconreencode=1 swipelock=1`. |
| A-1 Pin flicks (item 3) | Chats: 10 fast Pin flicks on rows (a quick, slightly diagonal flick released at speed; Pin is the right panel: flick the row to the LEFT). After EACH flick, at once, ONE tap: 4 × the bottom bar (Apps, then back to Chats), 3 × the new-chat button, 3 × a chat row (then back). Unpin the rows afterwards. | **Every first tap works** (10 of 10): the tab changes, the button opens, the chat opens. |
| A-2 Mute flicks (item 3) | The same with 10 Mute flicks (flick the row to the RIGHT), each followed by ONE tap. Unmute afterwards. | Every first tap works (10 of 10). |
| A-3 Half swipes (item 3) | 5 half swipes that leave the row open (the action button shows), each followed by ONE tap on the bottom bar. | The tap works (the tab changes). The open row may stay open, as before this batch. |
| A-4 The list still scrolls (item 3) | A fast vertical flick that starts on a row; a slow vertical drag that starts on a row; long press on a row; a tap on a row. | The list scrolls and flings as before (not jerky); the long press opens the row menu; the tap opens the chat. |
| A-5 The mini-app icons (item 2) | Close Spixi (swipe it away), start it, wait 5 s, open Apps. Then Home, wait 1 minute, come back, open Apps. | Every app shows its own icon, sharp (the very first start of this build may show the default icon for a few seconds). Note whether the icons still pop in after the tiles (expected: the same or shorter than before; the full fix is owed, #2087 ①). |

## Part 3 · The Apple walk (Mac; wipe `obj` / `bin`, a plain build, then Run)
| Row | Steps | Pass when |
|---|---|---|
| M-BUILD | Start Spixi on the Mac. Account › Developer › the log; find `[FLAGS] macfixa`. Then Account › Backup › Back up now. | The log shows `[FLAGS] macfixa` with `macsave=1` (it is written at the first use of a switch). The backup opens a small dialog **"Choose Action"** with Save File / Share File / Cancel (only this build). |
| M-1 Backup to a folder (item 1) | In that dialog: Save File → the save panel → pick the Desktop → Save. Answer the question that follows. | `spixi.account.backup.ixi` (or the wallet file) is on the Desktop; "Did you save the backup?" opens only AFTER the panel closed, never on top of it. Do it once more and press Cancel in the panel: the question still comes after it; answer No → no "Backed up" stamp. If no question comes within about 5 s after the panel closed, or no panel opens after Save File, it is an F: note which of the two (M-5 then shows no `[MACSAVE]` line for it). |
| M-2 A photo to Photos and to a folder (item 1) | Open a received JPEG photo › Save → **Add to Photos** (allow access the first time). Then Save → Save File → a folder → Save. | The photo is in the Photos app; the file is in the folder. |
| M-3 Share still works (item 1) | A received photo › Save → Share File; close the menu by a click outside. Then Back up now → Share File → **Mail** (or Messages) and send or cancel there. Then Back up now → Share File → click outside the menu. | The share menu shows (for the photo with "Add to Photos" / Photos); Mail (or Messages) opens with the file; after Mail and after the click outside, the backup question comes about 1 s after the menu closed (never on top of the menu, never missing; it may open while the Mail or Messages window is still open, as before this batch). |
| M-4 Cancel (item 1) | Back up now → Cancel (or Esc). | No file is saved outside Spixi (the backup file in Spixi's own folder is made before the choice, as before); the question still comes; No → no stamp. |
| M-5 The log | Read `ixian.log` after M-1 … M-4. | One `[MACSAVE] choice=… r=…` line per choice (M-1's Save: `choice=save r=done`; M-3: `choice=share`); no path, no file name. |
| M-6 The rail at start (item 4) | Open Account. Quit with **Cmd+Q**. Start again. Tap Wallet. Flip the macOS appearance (System Settings › Appearance). Open Account › Language → another language and back. Tap Wallet. | As W-1: Chats after the start, Wallet after the tap and the flip, Account during the language pick, Wallet at the end. |
| M-7 The address card (item 5) | As W-2 on the Mac: the window maximized (or about 700 px tall or more), then short. | As W-2 (no Share on the desktop; a trackpad scroll reaches the safety line in a short window). |
| I-1 The mini-app icons (iPhone) | As A-5 on the iPhone. | As A-5. |
| I-2 The swipe on the iPhone (item 3; the cap goes to every platform) | As A-1 and A-4 on the iPhone (5 Pin flicks, each followed by one tap; a vertical flick and a slow drag on a row). | Every first tap works; the list scrolls as before; a sideways swipe still reveals Pin / Mute; a tap on a row with a drift under about 8 px still opens the chat (a visible drift of 8 px or more that does not open the chat is expected — sideways it was so before this batch, diagonally it is the recorded limit #2087 ⑯: note it, not an F). |
