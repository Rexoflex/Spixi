# Walk fixb4 — Fix batch 4 (welcome slide 4, the protect-account fields, two new-account defaults, the Developer log)

Session `fixb4`, 2026-11-22 (rulings #1747 (1), #1748 (3), #1750; WALK #1829; DECISIONS #1845–#1859; packets P87–P88).
One build per platform from the branch `work/fixb4`. The html changed: **Windows = F5 after a wipe of `Spixi\bin` +
`Spixi\obj`** (never `dotnet build`; on Windows do the set-up S-1 … S-4 below FIRST); **Android = wipe `Spixi/bin` + `Spixi/obj`, then the dev build**
(`com.ixilabs.spixi.dev`, #449). The page with the same rows and every command: the Artifact **"Spixi Fix batch 4 — walk
rows"** (https://claude.ai/artifact/WDmgPY77DTVJALQcevsYmH).

★ **L149 — your test account and its data stay.** Copy the data folder first. **Never** Delete account on the test
account, **never** `adb uninstall`, **never** `pm clear`. ★ The walk sends no IXI.

**Windows set-up — in this order (PowerShell; ONE window, keep it open until W-9: it holds `$wv` and `$bk`).**
Why: two stores are SHARED by the test account and the second data folder (#46 r2 MAJOR-1, r3): (1) the native
preferences — a create or restore there writes, for the test account too, App lock On, a new stored password, C#'s own
copy of "Load pictures" Off, the backup-reminder stamp and `walletCreatedHere`; (2) the app's ONE **WebView store**
(WebView2, folder `EBWebView`, NOT inside `Documents\Spixi`; its place is not proven — it may be under `Spixi\bin`) — the
welcome screen of an EMPTY folder clears every `spixi.*` key (pinned contacts, unsent drafts, likes, hidden requests, chat
appearance), and this batch then writes Load pictures Off and List density Compact into it. The kept thumbnails and
waveforms of the app cache are cleared too (they come back on the next open of a photo).

- **S-1 (the OLD build, BEFORE the bin / obj wipe).** Start Spixi on the old build. Note for W-1: Account › Security &
  privacy › "Load pictures and GIFs" and App lock, Account › Chat appearance › "List density", Account › Preferences ›
  Theme. Close Spixi.
- **S-2 Copy the data folder:** `Copy-Item -Recurse "$env:USERPROFILE\Documents\Spixi" ("$env:USERPROFILE\Documents\Spixi-copy-fixb4-" + (Get-Date -Format yyyyMMdd-HHmm))`
- **S-3 Find the WebView store** (Spixi closed; it searches all of `%LOCALAPPDATA%` and the build folder: it can take a few
  minutes; change `$repo` if your clone is elsewhere):
  `$repo = "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; $wv = @(Get-ChildItem -Path "$env:LOCALAPPDATA", "$repo\Spixi\bin" -Directory -Recurse -Filter EBWebView -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match 'Spixi' } | Select-Object -ExpandProperty FullName); $wv`
  It must print exactly ONE folder. Nothing or more than one: stop; mark W-3, W-4 and W-9 N/A; put the output into the W-3
  note (and if a printed folder is under `Spixi\bin`, tell the main chat before you wipe `bin`).
- **S-4 Copy the store** (a NEW folder each time, so a second walk never writes into the first copy):
  `$bk = "$env:USERPROFILE\Documents\Spixi-webview-copy-fixb4-" + (Get-Date -Format yyyyMMdd-HHmm); Copy-Item -Recurse $wv[0] $bk -ErrorAction Stop; $bk`
  (It prints the copy's path: note it. If this window is closed later: run S-3 again, then `$bk = "<the noted path>"`.)
- **S-5 The build:** close Visual Studio, delete `Spixi\bin` and `Spixi\obj`, open the solution, press F5.
- **S-6 Only if S-3 printed a folder under `Spixi\bin`** (the wipe deleted the store): close Spixi, run R (below), start
  Spixi again with F5.
- **R — put the store back** (Spixi CLOSED; it stops at the first error and prints `True` when the store is back):
  `Remove-Item -Recurse -Force $wv[0] -ErrorAction Stop; Copy-Item -Recurse $bk $wv[0] -ErrorAction Stop; Test-Path (Join-Path $wv[0] 'Default')`
  If it prints an error or `False`: stop; your copy `$bk` is untouched; put the output into the W-9 note.
- **The second data folder** (W-3 / W-4): in the F5 output folder (the folder of `Spixi.exe`) open or create the file
  `ixian.cfg` and add ONE line: `spixiUserFolder = SpixiWalkFixb4` (for W-4 change it to `spixiUserFolder = SpixiWalkFixb4R`).
  Spixi then opens the new empty folder `Documents\SpixiWalkFixb4`.
- **The other way:** run W-3 and W-4 under a second Windows user (its own preferences and WebView store); then S-3, S-4,
  S-6 and W-9's restore are not needed.
- **Clean-up (optional, after W-9):** `Remove-Item -Recurse "$env:USERPROFILE\Documents\SpixiWalkFixb4", "$env:USERPROFILE\Documents\SpixiWalkFixb4R"`

**Android:** the test phone has no safe way to make a new account (L149). Rows A-2 … A-5 run on an **Android emulator**
(Visual Studio / Android Studio Device Manager → a new phone device, e.g. Pixel 4a, 1080 × 2340; install the dev build
there) or on a spare phone; else mark them **N/A** (they go to the launch walk on a clean device).

## Part 1 · Windows

| Row | Steps | Pass when |
|---|---|---|
| W-BUILD | After S-1 … S-6: Spixi runs with your test account (no `spixiUserFolder` line yet). Account › Developer › open the log. Find `[FLAGS] fixb4`. | The log shows `[FLAGS] fixb4 mediatap=1 listcompact=1` (only this build writes it). |
| W-1 Existing account unchanged | Open Account › Security & privacy and Account › Chat appearance. | "Load pictures and GIFs", App lock and "List density" show the SAME values as you noted at S-1 on the old build. |
| W-2 The Developer log | Account › Developer. Scroll down to the log. Then switch the theme (Account › Preferences › Theme: Light, then Dark) and open the log again. Then set the theme back to what S-1 noted. | The log shows MANY lines (about 20 or more, not half a line) and scrolls by itself; the same in light and dark. |
| W-3 A NEW account: slide 4 and the two defaults | S-2 … S-4 are done. Close Spixi. Add the line `spixiUserFolder = SpixiWalkFixb4` to `ixian.cfg`. Start Spixi (F5). On the welcome screen go to slide 4 and read it. Create a new account (any name, a password you note). Open Account › Security & privacy, then Account › Chat appearance. Open the log. | Slide 4 reads "Mini apps like Blitz Chess open right in your chats." (no Split). After the create: **"Load pictures and GIFs" is Off** and **"List density" is Compact**; the chat list rows are compact. The log shows `[DEFAULTS] new account page: mediatap=1 compact=1`. (The line alone is not proof: the two screens are.) |
| W-4 A RESTORED account | In the new account: Account › Backup › save the backup file. Close Spixi. Change the `ixian.cfg` line to `spixiUserFolder = SpixiWalkFixb4R`. Start Spixi. Restore from that file with its password (try a WRONG password first). Open the two screens and the log. | The wrong password shows the error and writes no `[DEFAULTS] new account page` line. After the restore: "Load pictures and GIFs" **Off**, "List density" **Compact**; the log shows `[DEFAULTS] new account page: mediatap=1 compact=1`. |
| W-5 Drag and drop (information only — not built) | In any account: open a chat. Drag a small **.txt** file from Explorer onto the chat. Start Spixi outside an elevated Visual Studio if you can. | Information row (P when noted): write what happens — (a) a "no" cursor and nothing, or (b) the chat changes to the text of the file. It answers question Q-DD. |
| W-9 Back to the test account | Close Spixi. Remove the `spixiUserFolder` line from `ixian.cfg`. Run R (Spixi closed; it must print `True`). Start Spixi. If it asks the password: enter the TEST account's password. If App lock was Off before: Account › Security & privacy › App lock Off (it asks the password). Then Account › Security & privacy › "Load pictures and GIFs": switch it Off and On again (this syncs C#'s copy) and leave it as S-1 noted. Optional: the clean-up line above. (Not put back, cosmetic: the backup reminder starts a new 30-day period and the wallet tab may show the blockchain-scan row again.) | Your test account opens with its chats, its pinned contacts and its drafts; "Load pictures and GIFs", "List density", the chat appearance and App lock show what S-1 noted. |

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
