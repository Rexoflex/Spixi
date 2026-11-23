# Walk fixb4 — Fix batch 4 (welcome slide 4, the protect-account fields, two new-account defaults, the Developer log)

Session `fixb4`, 2026-11-22 (rulings #1747 (1), #1748 (3), #1750; WALK #1829; DECISIONS #1845–#1859; packets P87–P88).
One build per platform from the branch `work/fixb4`. The html changed: **Windows = F5 after a wipe of `Spixi\bin` +
`Spixi\obj`** (never `dotnet build`; on Windows do the set-up S-1 … S-3 below FIRST; S-2 is the wipe and the build); **Android = wipe `Spixi/bin` + `Spixi/obj`, then the dev build**
(`com.ixilabs.spixi.dev`, #449). The page with the same rows and every command: the Artifact **"Spixi Fix batch 4 — walk
rows"** (https://claude.ai/artifact/WDmgPY77DTVJALQcevsYmH) — ⚠ the page is BEHIND this sheet since 2026-11-23 (it still has the
search for the page store and the old `ixian.cfg` steps): follow this sheet until the main chat updates the page.

★ **L149 — your test account and its data stay.** Copy the data folder first. **Never** Delete account on the test
account, **never** `adb uninstall`, **never** `pm clear`. ★ The walk sends no IXI.

**Windows set-up — in this order (PowerShell; each command below is a full line: copy it as it stands, nothing to fill in).**
Why: two stores are SHARED by the test account and the second data folder (#46 r2 MAJOR-1, r3): (1) the native
preferences — a create or restore there writes, for the test account too, App lock On, a new stored password, C#'s own
copy of "Load pictures" Off, the backup-reminder stamp and `walletCreatedHere`; (2) the app's ONE **WebView store**
(WebView2, folder `EBWebView`, NOT inside `Documents\Spixi`). **Its place is proven (WALK #1835, item
`n-20261123-win-webview-store-in-build-folder`):** it lives in the build folder beside `Spixi.exe`:
`C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\Spixi.exe.WebView2\EBWebView`. So the wipe of `Spixi\bin` in S-2 EMPTIES it (the search of `%LOCALAPPDATA%` finds
nothing), and it deletes `ixian.cfg`, which lives in the same `win-x64` folder (the app reads it from its working folder,
`Spixi/Meta/Config.cs:112`, `:150-152`, `:258`). The welcome screen of an EMPTY data folder clears every `spixi.*` key
(pinned contacts, unsent drafts, likes, hidden requests, chat appearance), and this batch then writes Load pictures Off and
List density Compact into the store. The kept thumbnails and waveforms of the app cache are cleared too (they come back on
the next open of a photo).
**W-4 is to be walked again** (WALK #1835: W-4 F, NOT CONFIRMED; the two default items stay open until it passes).

- **S-1 Copy the data folder** (before the wipe): `Copy-Item -Recurse "$env:USERPROFILE\Documents\Spixi" ("$env:USERPROFILE\Documents\Spixi-copy-fixb4-" + (Get-Date -Format yyyyMMdd-HHmm))`
- **S-2 The build:** close Visual Studio, delete `Spixi\bin` and `Spixi\obj`, open the solution, press F5. This is the FIRST
  start of the new build. **There is no "old build first":** after the wipe the old build cannot be started, and the wipe
  empties the page store. Instead, W-1 compares what you see now with what an existing account shows with an EMPTY page
  store (WALK #1835 W-1). Note now, for W-9 (the put-back): Account › Security & privacy › App lock (a native value: the
  wipe does not touch it, so this is the test account's own value); Account › Preferences › Theme. Close Spixi.
- **S-3 Copy the page store** (Spixi closed; AFTER the first start of S-2, so that the copy holds the store the new build
  made; a NEW folder each time, so a second walk never writes into the first copy; the place is fixed, nothing is searched):
  `$wv = "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\Spixi.exe.WebView2\EBWebView"; $bk = "$env:USERPROFILE\Documents\Spixi-webview-copy-fixb4-" + (Get-Date -Format yyyyMMdd-HHmm); Copy-Item -Recurse $wv $bk -ErrorAction Stop; $bk`
  It prints the copy's path. If it prints an error (the folder is not there: Spixi was not started after the wipe): start
  Spixi once, close it, run it again.
- **R — put the store back** (Spixi CLOSED; it takes the NEWEST `Spixi-webview-copy-fixb4-*` folder of `Documents`, stops at
  the first error and prints the copy's path, then `True` when the store is back):
  `$wv = "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\Spixi.exe.WebView2\EBWebView"; $bk = (Get-ChildItem "$env:USERPROFILE\Documents" -Directory -Filter "Spixi-webview-copy-fixb4-*" | Sort-Object Name | Select-Object -Last 1).FullName; if (-not $bk) { throw 'no copy of the page store' }; $bk; Remove-Item -Recurse -Force $wv -ErrorAction Stop; Copy-Item -Recurse $bk $wv -ErrorAction Stop; Test-Path (Join-Path $wv 'Default')`
  If it prints an error or `False`: stop; your copy is untouched; put the output into the W-9 note.
- **The second data folder** (W-3 / W-4). `ixian.cfg` is in the build folder (the folder of `Spixi.exe`):
  `C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\ixian.cfg`; after the wipe it does not exist. Each line keeps every other line of the file and writes the ONE
  `spixiUserFolder` line; Spixi then opens the new empty folder `Documents\SpixiWalkFixb4` (or `…R`).
  - **cfgNew** (W-3): `$cfg = "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\ixian.cfg"; $old = @(); if (Test-Path $cfg) { $old = @(Get-Content $cfg | Where-Object { $_ -notmatch '^\s*spixiUserFolder' }) }; Set-Content $cfg ($old + "spixiUserFolder = SpixiWalkFixb4"); Get-Content $cfg`
  - **cfgRestore** (W-4): `$cfg = "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\ixian.cfg"; $old = @(); if (Test-Path $cfg) { $old = @(Get-Content $cfg | Where-Object { $_ -notmatch '^\s*spixiUserFolder' }) }; Set-Content $cfg ($old + "spixiUserFolder = SpixiWalkFixb4R"); Get-Content $cfg`
  - **cfgOff** (W-9; it prints `False` when the file is gone, `True` when other lines of it stay): `$cfg = "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\ixian.cfg"; $old = @(Get-Content $cfg | Where-Object { $_ -notmatch '^\s*spixiUserFolder' }); if ($old.Count) { Set-Content $cfg $old } else { Remove-Item $cfg }; Test-Path $cfg`
- **The other way is dropped:** the page store is in the build folder beside `Spixi.exe` (WALK #1835), not under the
  Windows user, so a second Windows user that starts the same build would not get a store of its own (an inference from
  the proven place; not tested).
- **Clean-up (optional, after W-9):** `Remove-Item -Recurse "$env:USERPROFILE\Documents\SpixiWalkFixb4", "$env:USERPROFILE\Documents\SpixiWalkFixb4R"`
- **A re-walk of W-4 only (WALK #1835):** W-4 restores the backup that W-3's new account saves, so run S-1 … S-3, W-BUILD,
  then the clean-up line below (folders of an earlier walk would open an existing account: no welcome screen, no Restore),
  then W-3, W-4, W-9 (W-9 names what W-1 saw: Load pictures On, List density Comfortable): `Remove-Item -Recurse -Force -ErrorAction SilentlyContinue "$env:USERPROFILE\Documents\SpixiWalkFixb4", "$env:USERPROFILE\Documents\SpixiWalkFixb4R"; Test-Path "$env:USERPROFILE\Documents\SpixiWalkFixb4", "$env:USERPROFILE\Documents\SpixiWalkFixb4R"` (it must print `False` twice)

**Android:** the test phone has no safe way to make a new account (L149). Rows A-2 … A-5 run on an **Android emulator**
(Visual Studio / Android Studio Device Manager → a new phone device, e.g. Pixel 4a, 1080 × 2340; install the dev build
there) or on a spare phone; else mark them **N/A** (they go to the launch walk on a clean device).

## Part 1 · Windows

| Row | Steps | Pass when |
|---|---|---|
| W-BUILD | After S-1 … S-3: start Spixi again (F5): it runs with your test account (the wipe deleted `ixian.cfg`: no `spixiUserFolder` line yet). Account › Developer › open the log. Find `[FLAGS] fixb4`. | The log shows `[FLAGS] fixb4 mediatap=1 listcompact=1` (only this build writes it). |
| W-1 Existing account unchanged (after the wipe; WALK #1835 W-1) | Open Account › Security & privacy and Account › Chat appearance. | (This batch changes no native value of an EXISTING account — C#'s copy of Load pictures is written only at a new or restored account, #1846 — so W-1 has no old-build value to compare: the App lock note of S-2 serves W-9 only, review r1 B MINOR-1.) The page-store values show what an existing account shows with an EMPTY store (the wipe emptied it): "Load pictures and GIFs" **On** and "List density" **Comfortable** (not Compact, and not a change made by this batch). |
| W-2 The Developer log | Account › Developer. Scroll down to the log. Then switch the theme (Account › Preferences › Theme: Light, then Dark) and open the log again. Then set the theme back to what S-2 noted. | The log shows MANY lines (about 20 or more, not half a line) and scrolls by itself; the same in light and dark. |
| W-3 A NEW account: slide 4 and the two defaults | S-1 … S-3 are done (S-3 BEFORE this row: the store copy). Close Spixi. Run **cfgNew** (the second data folder, above). Start Spixi (F5). On the welcome screen go to slide 4 and read it. Create a new account (any name, a password you note). Open Account › Security & privacy, then Account › Chat appearance. Open the log. | Slide 4 reads "Mini apps like Blitz Chess open right in your chats." (no Split). After the create: **"Load pictures and GIFs" is Off** and **"List density" is Compact**; the chat list rows are compact. The log shows `[DEFAULTS] new account page: mediatap=1 compact=1`. (The line alone is not proof: the two screens are.) |
| W-4 A RESTORED account (to be walked again, WALK #1835) | In the new account: Account › Backup › save the backup file. Close Spixi. Run **cfgRestore** (the second data folder, above). Start Spixi. Restore from that file with its password (try a WRONG password first). Open the two screens and the log. | The wrong password shows the error and writes no `[DEFAULTS] new account page` line. After the restore: "Load pictures and GIFs" **Off**, "List density" **Compact**; the log shows `[DEFAULTS] new account page: mediatap=1 compact=1`. |
| W-5 Drag and drop (information only — not built) | In any account: open a chat. Drag a small **.txt** file from Explorer onto the chat. Start Spixi outside an elevated Visual Studio if you can. | Information row (P when noted): write what happens — (a) a "no" cursor and nothing, or (b) the chat changes to the text of the file. It answers question Q-DD. |
| W-9 Back to the test account | Close Spixi. Run **cfgOff** (the second data folder, above). Run **R** (Spixi closed; it must print `True`). Start Spixi. If it asks the password: enter the TEST account's password. If App lock was Off before: Account › Security & privacy › App lock Off (it asks the password). Then Account › Security & privacy › "Load pictures and GIFs": switch it Off and On again (this syncs C#'s copy) and leave it as W-1 saw it (On). Optional: the clean-up line "Clean-up (optional, after W-9)" of the set-up. (Not put back, cosmetic: the backup reminder starts a new 30-day period and the wallet tab may show the blockchain-scan row again.) | Your test account opens with its chats (pinned contacts and drafts are not expected: the wipe emptied the page store, WALK #1835); App lock shows what S-2 noted; "Load pictures and GIFs", "List density" and the chat appearance show what W-1 saw (the restored copy of the store). |

Optional (needs a second device with a REAL contact): the corrected row **W-2 of `docs/walk-photo1b.md`** ("A `.jpg` that is
not a picture", the PO-4 reopen face).

## Part 2 · Android

| Row | Steps | Pass when |
|---|---|---|
| A-BUILD | Force-stop Spixi Dev, start it, Account › Developer › the log. | The log shows `[FLAGS] fixb4 mediatap=1 listcompact=1`. |
| A-1 Existing account unchanged | On the test phone: note Account › Security & privacy › "Load pictures and GIFs". Force-stop, start. | The SAME value as before this build. |
| A-2 The Developer log | On the test phone: Account › Developer, scroll to the log. Then the other theme (Account › Preferences › Theme). | The log shows MANY lines (about 15 or more) and scrolls by itself, in light and dark. |
| A-3 The protect-account fields above the keyboard (emulator or spare phone, else N/A) | Start the dev build with no account. Welcome → Create. Type a nickname (the keyboard opens). Tap Continue. Look at the screen with the keyboard open. Tap the password field, type, tap the confirm field. Also try a small screen if the emulator has one (360 × 640 dp). | With the keyboard open, the FOCUSED password field (and then the confirm field) is fully visible, with its focus ring, and the button below the fields (Create / Continue) is visible above the keyboard. Nothing else jumps. |
| A-4 A NEW account: slide 4 and the default (emulator or spare phone, else N/A) | On the same device: read welcome slide 4; finish the create. Open Account › Security & privacy and the log. | Slide 4 reads "Mini apps like Blitz Chess open right in your chats." **"Load pictures and GIFs" is Off.** The log shows `[DEFAULTS] new account page: mediatap=1 compact=0` (the phone has no density). |
| A-5 A RESTORED account (emulator or spare phone, else N/A) | On that device: Account › Backup (save in Downloads). Account › Delete account (the EMULATOR account only). Restore from the file. Look at the screen and the log. | "Load pictures and GIFs" **Off** after the restore; the log shows `[DEFAULTS] new account page: mediatap=1 compact=0`. |

Optional (needs a second device with a REAL contact): the corrected row **A-2 of `docs/walk-photo1b.md`**.

## Apple phase (#1515)
iPhone: A-3 (the iPhone path is unchanged: the fields must still show above the keyboard), A-4, A-5 — on a simulator or a
spare device, else N/A (L149). Mac: W-1, W-3, W-4 (the Mac also gets the Compact list) and W-9 — the Mac shares ONE WebView
store too, so W-3 / W-4 run only under a second macOS user or on a spare Mac (else N/A). Owed to the Apple phase.
