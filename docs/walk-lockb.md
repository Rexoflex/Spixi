# Walk lockb — the lock batch (the Android lock flash, no alert with no screen lock, the second clock)

Session `lockb`, 2026-11-23 (ruling #1825 (1)–(3); DECISIONS #1915–#1934; packets P97–P99). One build per platform from the
branch `work/lockb`. The html changed (`lock.html`) and C# changed. Windows = **F5, never `dotnet build`** (#663); wipe
`Spixi\bin` + `Spixi\obj` first. Android = the Release dev build (`com.ixilabs.spixi.dev`); wipe `Spixi\bin` + `Spixi\obj`
first (#449: an incremental build does not repackage the Raw html). The page with the same rows: the Artifact
**"Spixi Lock batch — walk rows"** (https://claude.ai/artifact/SK86JZ3oEPx8NaKtP6bcmw).

★ **L149 — your test account and its data stay.** No row needs a new account on the test phone. **Never** Delete account,
**never** `adb uninstall`, **never** `pm clear`. ★ The Android rows END with App lock **Off** again (the adb walk needs it).
★ Row A-5 changes the phone's clock: it ends with "Set time automatically" On again.

## Before you start (PowerShell, one line at a time)
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/lockb
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull --ff-only
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; Remove-Item -Recurse -Force Spixi\bin, Spixi\obj
```
- Windows: open `SPIXI.sln` in Visual Studio, target Windows, **F5**.
- Android (the phone on USB; the same two lines as `docs/walk-histcs.md`):
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -p:SpixiDevCoexist=true
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; adb install -r Spixi\bin\Release\net10.0-android\com.ixilabs.spixi.dev-Signed.apk
```
- The smoke on this branch (optional on the PC): `node scripts/smoke-test.mjs` → `BASELINE OK <n> / the 2 KNOWN` (n in the status doc).
- This is the first compile of `App.xaml.cs`, `LockPage.xaml.cs`, `LockShellRules.cs`, `LockClockRules.cs` on Windows and
  Android: a build error is this batch's bug — paste it.

## Part 1 · Windows (the target: nothing changes)

| Row | Steps | Pass when |
|---|---|---|
| W-BUILD | Start Spixi (F5) with the test account. If App lock is On, unlock. Click into another window, click back into Spixi. Account › Developer › open the log; find `[FLAGS] lockb`. | The log shows `[FLAGS] lockb hold=1 noalert=1 clock=1` (only this build writes it). |
| W-1 The lock looks as before | Note App lock (Account › Security & privacy). Turn it On if it is Off (it asks the password). Close Spixi, start it (F5). | The lock shows the **password form at once** (no spinner that waits); a wrong password shows the error; the right one opens the chats. |
| W-2 The Settings password ask | Account › Security & privacy › App lock Off (or any row that asks the password). Then Cancel. Then do it again and enter the password. | The password form shows at once; Cancel goes back; the password turns App lock Off. |
| W-END | If App lock was On before W-1, turn it On again. | App lock is as you noted at W-1. |

## Part 2 · Android (the test phone: a pattern / PIN / fingerprint is set)

| Row | Steps | Pass when |
|---|---|---|
| A-BUILD | Force-stop Spixi Dev, start it. Account › Security & privacy › App lock **On** (it asks). Press Home, wait **70 s**, open Spixi, unlock. Account › Developer › the log. | The log shows `[FLAGS] lockb hold=1 noalert=1 clock=1`, and the line `resume/pauseLock-held …` of that return ends with ` mono=7<n>s` (about 70). |
| A-1 No password screen before the prompt (flash 1) | Press Home, wait **70 s**, open Spixi. Watch until the chats show. Unlock with the pattern (or the fingerprint). | You see the dark screen with the spinner, then the system prompt — **NOT the Spixi password screen before the prompt**. Copy the lines `pause/push-requested`, `lock/webview-onload`, `resume/deferred-auth-released`, `lock/auth-returned` of this cycle into the note. |
| A-2 No password screen after the prompt (flash 2) | The same as A-1; draw the pattern within 3 seconds. | After the pattern, the chats show at once — the password screen does not slide away (at most one frame). |
| A-3 Cancel the prompt | Press Home, wait 70 s, open Spixi. At the system prompt press **Back** (cancel). | The Spixi password form shows (the alert "Authentication Failed" may show, as before — the phone HAS a screen lock); the Spixi password opens the chats. |
| A-4 A short absence | Press Home, wait **30 s**, open Spixi. | Spixi opens with no unlock; no password screen shows on the way (the spinner may show for a moment). |
| A-5 A clock set back does not skip the lock | 1. Look at the status-bar clock. Right after the minute changes (within 10 s), press Home. Note that minute (M). 2. Wait **3 minutes**. 3. Phone Settings › General management › Date and time: **Automatic date and time Off**; Set time → the hour and the minute **M** (the same minute you pressed Home in). 4. Wait 10 s. 5. Open Spixi. 6. Afterwards: Automatic date and time **On** again. | The lock **stays and asks** the pattern (a build without this batch opens with no unlock here). The log line `resume/pauseLock-held …` reads `sinceBackground=` a small number (0–50 s), `withinGrace=False`, ` mono=1<n>s` (about 190). |
| A-7 A pause with no stop (a permission dialog) | 1. Phone Settings › Apps › Spixi Dev › Permissions › Microphone → **Ask every time**. 2. In Spixi (App lock On), open a chat and hold the microphone button: the permission dialog shows. 3. Wait **5 s**, then tap **Allow** (or "Only this time"). 4. Afterwards: Microphone back to **Allow**. | When the dialog goes, Spixi shows either the chat or the **Spixi password form within a second** — never a spinner that stays. If the form shows, the password opens the chat. Copy any `lock/hold-released` line into the note. |
| A-6 No alert with no screen lock (an emulator or a spare phone only) | On an Android emulator (or a spare phone) with NO screen lock and no fingerprint: install the dev build, create an account there, App lock On, press Home, wait 70 s, open Spixi. | The Spixi password form shows **with no "Authentication Failed" alert**; the password opens the chats. On the test phone: N/A (do NOT remove the phone's screen lock). |
| A-END | Account › Security & privacy › App lock **Off** (it asks). Check Settings › Date and time › Automatic On. | App lock is Off (the adb walk needs it); the phone's time is automatic. |

## Apple phase (#1515)
iPhone / Mac: the lock as before (no hold change; the wall clock alone). Item 2 is live there: with Face ID refused for Spixi
(iPhone Settings › Spixi › Face ID Off) the lock opens the password form with no alert. Owed to the Apple phase.
