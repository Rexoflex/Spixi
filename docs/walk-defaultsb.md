# Walk defaultsb — the Defaults batch (App lock and Confirm payments On for new accounts, the lock delay of 1 minute)

Session `defaultsb`, 2026-11-18 (ruling #1750; DECISIONS #1790–#1809; packets P79–P81). One build per platform from the
branch `work/defaultsb`. C# only, no html changed. Windows = F5 (never `dotnet build`); wipe `Spixi\bin` + `Spixi\obj`
first. Android = the dev build (`com.ixilabs.spixi.dev`); wipe `Spixi/bin` + `Spixi/obj` first (#449). The page with the
same rows: the Artifact **"Spixi Defaults batch — walk rows"** (https://claude.ai/artifact/MMKhKreHViXk2MeTZPQFRe).

★ **L149 — your test account and its data stay.** Copy the data folder first (Windows:
`Copy-Item -Recurse "$env:USERPROFILE\Documents\Spixi" "$env:USERPROFILE\Documents\Spixi-copy-defaultsb"`; Android:
Account › Backup). **Never** Delete account on the test account, **never** `adb uninstall`, **never** `pm clear`.
★ **The walk sends no IXI.** The send row ends at Cancel.

**How a new account is made without the test account (per platform):**
- **Windows:** Spixi reads `ixian.cfg` next to `Spixi.exe` (the F5 output folder). One line `spixiUserFolder = SpixiWalkNew`
  points Spixi at a NEW empty folder `Documents\SpixiWalkNew`; the test folder `Documents\Spixi` is not opened. ⚠ The
  native preferences are SHARED by both folders: a create there also (a) turns App lock On for the test account, (b) replaces
  the stored password, so the test account asks its password once at the next start, (c) hides the blockchain-scan row
  on the test account's wallet tab (`walletCreatedHere`). Row W-9 puts (a) and (b) back; (c) stays until a restore (cosmetic).
- **Android (the test phone):** there is NO safe way. The test account lives in the only dev app; a new account needs
  Delete account or a data clear (both forbidden by L149), and the other app id (`com.ixilabs.spixi`) can hold your own
  account. → Rows A-2 and A-3 run on an **Android emulator** (Android Studio / Visual Studio Device Manager › a new virtual
  device; install the dev build there) or on a spare phone; else mark them N/A — they then go to the launch walk on a clean
  device.

## Part 1 · Windows

| Row | Steps | Pass when |
|---|---|---|
| W-BUILD | Start the app with your test account (no `ixian.cfg` line yet). Account › Developer › open the log. Find `[FLAGS] defaultsb`. | The log shows `[FLAGS] defaultsb applock=1 paydefault=1 lockdelay=60` (only this build writes it). |
| W-1 Existing account unchanged | Before anything else: note App lock in Account › Security & privacy (On or Off). Close Spixi, start it again. | App lock shows the SAME value as before this build. If it was Off: no lock screen at the start. |
| W-2 A NEW account | Copy the data folder (above). Close Spixi. In the F5 output folder open (or create) `ixian.cfg` and add the line `spixiUserFolder = SpixiWalkNew`. Start Spixi (F5). Create a new account (any name, a password you note). Open Account › Security & privacy. Open the log. | The welcome screen shows (a new folder). After the create, **App lock is On**. The log shows `[DEFAULTS] new account: applock=1 pay=0` (Windows writes no payment default). No Confirm payments row (Windows has none). |
| W-3 The idle lock | With the new account open, do not touch the mouse or the keyboard for 10 minutes (the default; there is no developer control for a shorter time). Then move the mouse. | After the 10 minutes the lock screen is up; it asks for the password of the new account; a click into another window before that does not lock. |
| W-4 A RESTORED account | Still in the new account: Account › Backup › save the backup file. Close Spixi. Change the `ixian.cfg` line to `spixiUserFolder = SpixiWalkRestore`. Start Spixi. Choose Restore, pick that file, enter its password. Open Account › Security & privacy and the log. | **App lock is On** after the restore. The log shows `[DEFAULTS] new account: applock=1 pay=0`. A wrong password first (try one) shows the error and writes no `[DEFAULTS]` line. |
| W-9 Back to the test account | Close Spixi. Remove the `spixiUserFolder` line from `ixian.cfg`. Start Spixi. If it asks the password: enter the TEST account's password. If App lock was Off at W-1: Account › Security & privacy › App lock Off (it asks the password). Optional: delete `Documents\SpixiWalkNew` and `Documents\SpixiWalkRestore`. | Your test account opens with its chats; App lock shows what you noted at W-1. |

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
