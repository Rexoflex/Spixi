# Walk defaultsb — the Defaults batch (App lock and Confirm payments On for new accounts, the lock delay of 1 minute)

Session `defaultsb`, 2026-11-18 (ruling #1750; DECISIONS #1790–#1809; packets P79–P81). One build per platform from the
branch `work/defaultsb`. C# only, no html changed. Windows = F5 (never `dotnet build`); wipe `Spixi\bin` + `Spixi\obj`
first. Android = the dev build (`com.ixilabs.spixi.dev`); wipe `Spixi/bin` + `Spixi/obj` first (#449). The page with the
same rows: the Artifact **"Spixi Defaults batch — walk rows"** (https://claude.ai/artifact/MMKhKreHViXk2MeTZPQFRe) — ⚠ the page is BEHIND this
sheet since 2026-11-23 (the `ixian.cfg` lines, the page-store copy, W-3): follow this sheet until the main chat updates the page.
**State (the walk of 2026-11-23, the doc of #1835–#1837, "The owed rows of `defaultsb`"): walked W-4 P, A-2 P, A-3 P, A-4 third leg P. Still owed: row W-3 (the idle lock on Windows), the one row; walk debt 1.**

★ **L149 — your test account and its data stay.** Copy the data folder first (Windows:
`Copy-Item -Recurse "$env:USERPROFILE\Documents\Spixi" ("$env:USERPROFILE\Documents\Spixi-copy-defaultsb-" + (Get-Date -Format yyyyMMdd-HHmm))`; Android:
Account › Backup). **Never** Delete account on the test account, **never** `adb uninstall`, **never** `pm clear`.
★ **The walk sends no IXI.** The send row ends at Cancel.

**How a new account is made without the test account (per platform):**
- **Windows:** Spixi reads `ixian.cfg` from its working folder = the folder of `Spixi.exe` (the F5 output folder; proven on
  Damir's PC, WALK #1835; `Spixi/Meta/Config.cs:112`, `:150-152`, `:258`):
  `C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\ixian.cfg`. A wipe of `Spixi\bin` deletes it (and empties the page store that lives in the same folder, item
  `n-20261123-win-webview-store-in-build-folder`), so after the wipe the file does not exist. Each line below is a full PowerShell line (nothing to fill in): it keeps
  every other line of the file and writes the ONE `spixiUserFolder` line; Spixi then opens a NEW empty folder; the test folder
  `Documents\Spixi` is not opened.
  - **cfgNew** (W-2; opens `Documents\SpixiWalkNew`): `$cfg = "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\ixian.cfg"; $old = @(); if (Test-Path $cfg) { $old = @(Get-Content $cfg | Where-Object { $_ -notmatch '^\s*spixiUserFolder' }) }; Set-Content $cfg ($old + "spixiUserFolder = SpixiWalkNew"); Get-Content $cfg`
  - **cfgRestore** (W-4; opens `Documents\SpixiWalkRestore`): `$cfg = "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\ixian.cfg"; $old = @(); if (Test-Path $cfg) { $old = @(Get-Content $cfg | Where-Object { $_ -notmatch '^\s*spixiUserFolder' }) }; Set-Content $cfg ($old + "spixiUserFolder = SpixiWalkRestore"); Get-Content $cfg`
  - **cfgOff** (W-9; it prints `False` when the file is gone, `True` when other lines of it stay): `$cfg = "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\ixian.cfg"; $old = @(Get-Content $cfg | Where-Object { $_ -notmatch '^\s*spixiUserFolder' }); if ($old.Count) { Set-Content $cfg $old } else { Remove-Item $cfg }; Test-Path $cfg`

  - **The page store** (WebView2) is ONE for both folders: the welcome screen of the empty folder in W-2 clears every
    `spixi.*` key of it (pinned contacts, unsent drafts, likes, hidden requests, chat appearance) for the test account too
    (the finding of `fixb4`, #46 r2 MAJOR-1, `docs/walk-fixb4.md`). Its place is fixed (WALK #1835): `C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\Spixi.exe.WebView2\EBWebView`.
    **S-STORE** (Spixi closed; AFTER the first start of the new build, i.e. after W-BUILD and W-1, before W-2; a new copy
    each time): `$wv = "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\Spixi.exe.WebView2\EBWebView"; $bk = "$env:USERPROFILE\Documents\Spixi-webview-copy-defaultsb-" + (Get-Date -Format yyyyMMdd-HHmm); Copy-Item -Recurse $wv $bk -ErrorAction Stop; $bk`
    (an error: Spixi was not started after the wipe — start it once, close it, run the line again).
    **R** (W-9; Spixi closed; it takes the newest copy and prints its path, then `True`; an error or `False`: stop, the copy
    is untouched, put the output into the W-9 note): `$wv = "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\Spixi.exe.WebView2\EBWebView"; $bk = (Get-ChildItem "$env:USERPROFILE\Documents" -Directory -Filter "Spixi-webview-copy-defaultsb-*" | Sort-Object Name | Select-Object -Last 1).FullName; if (-not $bk) { throw 'no copy of the page store' }; $bk; Remove-Item -Recurse -Force $wv -ErrorAction Stop; Copy-Item -Recurse $bk $wv -ErrorAction Stop; Test-Path (Join-Path $wv 'Default')`
    The wipe of `Spixi\bin` before the build has already emptied the store: the test account's `spixi.*` keys of before
    the wipe are gone either way; R puts back the store of the first start, not the one of the old build (there is no
    "old build first" after a wipe).
  - **A re-walk of W-3 only (the one row owed):** W-3 needs W-2's new account, so run W-BUILD, W-1, the clean-up line
    (folders of an earlier walk would open an existing account: no welcome screen), then W-2 (with S-STORE and cfgNew), W-3
    and W-9: `Remove-Item -Recurse -Force -ErrorAction SilentlyContinue "$env:USERPROFILE\Documents\SpixiWalkNew", "$env:USERPROFILE\Documents\SpixiWalkRestore"; Test-Path "$env:USERPROFILE\Documents\SpixiWalkNew", "$env:USERPROFILE\Documents\SpixiWalkRestore"` (it must print `False` twice)

  ⚠ The native preferences are SHARED by both folders: a create there also (a) turns App lock On for the test account, (b)
  replaces the stored password, so the test account asks its password once at the next start, (c) hides the blockchain-scan
  row on the test account's wallet tab (`walletCreatedHere`). Row W-9 puts (a) and (b) back; (c) stays until a restore (cosmetic).
- **Android (the test phone):** there is NO safe way. The test account lives in the only dev app; a new account needs
  Delete account or a data clear (both forbidden by L149), and the other app id (`com.ixilabs.spixi`) can hold your own
  account. → Rows A-2 and A-3 run on an **Android emulator** (Android Studio / Visual Studio Device Manager › a new virtual
  device; install the dev build there) or on a spare phone; else mark them N/A — they then go to the launch walk on a clean
  device.

## Part 1 · Windows

| Row | Steps | Pass when |
|---|---|---|
| W-BUILD | Start the app with your test account (no `spixiUserFolder` line yet: the wipe of `Spixi\bin` deleted `ixian.cfg`). Account › Developer › open the log. Find `[FLAGS] defaultsb`. | The log shows `[FLAGS] defaultsb applock=1 paydefault=1 lockdelay=60` (only this build writes it). |
| W-1 Existing account unchanged | Before anything else: note App lock in Account › Security & privacy (On or Off). Close Spixi, start it again. | App lock shows the SAME value as before this build — after a wipe of `Spixi\bin` the old build cannot be started, so compare with the test account's known setting. ⚠ Today W-1 cannot show the defect it tests (an existing account turned On): the test account started the walk of 2026-11-22 with `appLockMode=False` (`claude/talk-rulings-2026-11-22-walk.md`), and the create by "Delete account" in the MAIN folder that day wrote App lock On into the shared native preferences, so it now reads On (WALK #1835 W-1). In a re-walk W-1 is information only: note the value and mark P when it is noted (W-9 leaves App lock as W-1 saw it). If it was Off: no lock screen at the start. |
| W-2 A NEW account | Copy the data folder (above). Close Spixi. Run **S-STORE** (above), then **cfgNew** (above). Start Spixi (F5). Create a new account (any name, a password you note). Open Account › Security & privacy. Open the log. | The welcome screen shows (a new folder). After the create, **App lock is On**. The log shows `[DEFAULTS] new account: applock=1 pay=0` (Windows writes no payment default). No Confirm payments row (Windows has none). |
| W-3 The idle lock — **the ONE row still owed** (WALK of 2026-11-23: Damir marked N/A, "nothing happened, it could be that i waited 9 minutes or something"; walk it again with a clear 11 minutes) | With the new account open, do not touch the mouse or the keyboard for **11 minutes by the clock** (the idle lock is 10 minutes; there is no developer control for a shorter time; look at the clock when you start and when you move the mouse). Then move the mouse. | After the 11 minutes (the lock is due at 10) the lock screen is up; it asks for the password of the new account; a click into another window before that does not lock. |
| W-4 A RESTORED account | Still in the new account: Account › Backup › save the backup file. Close Spixi. Run **cfgRestore** (above). Start Spixi. Choose Restore, pick that file, enter its password. Open Account › Security & privacy and the log. | **App lock is On** after the restore. The log shows `[DEFAULTS] new account: applock=1 pay=0`. A wrong password first (try one) shows the error and writes no `[DEFAULTS]` line. |
| W-9 Back to the test account | Close Spixi. Run **cfgOff** (above). Run **R** (above; it must print `True`). Start Spixi. If it asks the password: enter the TEST account's password. If App lock was Off at W-1: Account › Security & privacy › App lock Off (it asks the password). Optional: delete `Documents\SpixiWalkNew` and `Documents\SpixiWalkRestore`. | Your test account opens with its chats; App lock shows what you noted at W-1. |

## Part 2 · Android

| Row | Steps | Pass when |
|---|---|---|
| A-BUILD | Force-stop Spixi Dev, start it, Account › Developer › the log. | The log shows `[FLAGS] defaultsb applock=1 paydefault=1 lockdelay=60`. |
| A-1 Existing account unchanged | Before anything else: note App lock and Confirm payments (Account › Security & privacy) on the test phone. Force-stop, start. | Both show the SAME value as before this build. |
| A-2 A NEW account (emulator or spare phone only) | On the emulator: install the dev build, start it, create an account. Open Account › Security & privacy and the log. | **App lock On** and **Confirm payments On**. The log shows `[DEFAULTS] new account: applock=1 pay=1`. If the phone asks a permission (notifications) right after the create: answer it; Spixi stays open with no lock. On the test phone: N/A. |
| A-3 A RESTORED account (emulator or spare phone only) | On the emulator: Account › Backup (save the file in Downloads). Account › Delete account (the EMULATOR account only). Restore from that file. Look at both rows and the log. | **App lock On** and **Confirm payments On** after the restore; the log shows `[DEFAULTS] new account: applock=1 pay=1`. On the test phone: N/A. |
| A-4 The lock after 1 minute, not after 30 seconds | On the test phone: turn App lock On (Account › Security & privacy). Press Home. Wait **30 seconds**, open Spixi. Then press Home, wait **70 seconds**, open Spixi and unlock. Then press Home again, wait **30 seconds**, open Spixi. | First 30 s: Spixi opens with no unlock (the lock may show for a moment and go). 70 s: the lock stays and asks the pattern (or the fingerprint). The 30 s AFTER that unlock: again no unlock (a build without the round-1 fix asks here). Optional: copy the `resume/pauseLock-held` lines (`sinceBackground=` and `withinGrace=`) into the note. |
| A-5 The lock screen flash (NOT fixed in this batch) | With App lock On: press Home, wait 70 s, open Spixi. Watch the screens until the chats show. Then open the log and copy the lines `pause/push-requested`, `lock/webview-onload`, `resume/deferred-auth-released`, `lock/auth-returned` of that cycle into the note. | Information row (mark P when the lines are copied): the batch did NOT fix the flash (it needs a lock.html change — the question is in the status doc). Note what you saw: password screen → pattern → password screen again, or something else. |
| A-6 A send asks for the PIN or the fingerprint | On the test phone: Confirm payments On (Account › Security & privacy). Wallet › Send to a Seed contact, a small amount, up to the confirm. Tap Send in the native confirm. | After the native confirm the phone asks for the pattern / PIN / fingerprint. **Cancel it.** Nothing is sent (no new transaction row, the balance is the same). Do not complete the prompt. |
| A-7 Back to the walk state | Account › Security & privacy: App lock **Off** (it asks the pattern or the password). Confirm payments back to what A-1 noted (Off costs one auth). | App lock is Off (the adb walk needs it); Confirm payments is as at A-1. |

## Apple phase (#1515)
iPhone: A-1, A-2, A-3 (a new account on a simulator or a spare device), A-4 (the lock after 1 minute on the resume), A-6.
Mac: W-1, W-2, W-4 (Confirm payments On too), A-4 (1 minute after the window loses the focus), A-6 (a send asks Touch ID or
the Mac password; cancel it — the plugin is unproven on the Mac, R1-3), and note whether a click into another window covers
Spixi at once (the privacy shield with App lock On, F-4). Owed to the Apple phase.
