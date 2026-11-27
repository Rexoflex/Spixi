# Walk imgurl — chat pictures by a local link, the Android trim hook

Session `imgurl`, 2026-11-27 (rulings #1642, #1738 (3), #1972; DECISIONS #2035–#2059; packets P113–P115). Items 3 (the
renderer-death handler) and 4 (the Windows page store) LEFT this batch (#1972): no row here is about them. One build per
platform from the branch `work/imgurl`. C# and the chat html changed. **Windows = Ctrl+F5 (#1844 (1)) after a wipe of
`Spixi\bin` + `Spixi\obj`** (never `dotnet build`). **Android = wipe ONLY `Spixi\bin\Release\net10.0-android` + `Spixi\obj` (keep `Spixi\bin\x64`: the Windows page store), then the dev Release build**
(`com.ixilabs.spixi.dev`; #449). This is the FIRST compile of the Android C# of this batch: a build error is this batch's
bug — paste it. The page with the same rows and every command: the Artifact **"Spixi imgurl — walk rows"** (published when the batch is delivered).

★ L149 — your test account and its data stay. Copy the data folder first (S-1 / A-0). **Never** Delete account, never
`adb uninstall`, never `pm clear`. ★ The walk sends no IXI. ★ The Android rows END with App lock **Off** (the adb walk needs it).
★ Three switches, all ON (`[FLAGS] imgurl mediaorigin=1 mediakeep=1 trimhook=1`). This build has no door to set them OFF
(no Developer-screen row; nothing in the app writes them). So the **before-number** (A-MEM-1) is taken on the build of the
base `redesign/frontend` @ `ae7b8303` = the old path that the switches OFF give; the after-number (A-MEM-2) on this build.

## Before you start (PowerShell, one line at a time)
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/imgurl
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull --ff-only
```
- The smoke on this branch (optional on the PC): `npm ci` once, then `node scripts/smoke-test.mjs` →
  `BASELINE OK — 7156 / the 2 KNOWN` (or the number in the status doc).

**Windows set-up** (the page store is still beside `Spixi.exe`; the wipe of S-3 empties it, so S-2 / S-4 keep it):
- **S-1 Copy the data folder:**
  `Copy-Item -Recurse "$env:USERPROFILE\Documents\Spixi" ("$env:USERPROFILE\Documents\Spixi-copy-imgurl-" + (Get-Date -Format yyyyMMdd-HHmm))`
- **S-2 Copy the page store** (Spixi closed; BEFORE the wipe):
  `$wv = "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\Spixi.exe.WebView2\EBWebView"; $bk = "$env:USERPROFILE\Documents\Spixi-webview-copy-imgurl-" + (Get-Date -Format yyyyMMdd-HHmm); Copy-Item -Recurse $wv $bk -ErrorAction Stop; $bk`
- **S-3 The build:** close Visual Studio, then
  `cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; Remove-Item -Recurse -Force Spixi\bin, Spixi\obj`
  then open `SPIXI.sln`, target Windows, press **Ctrl+F5**. Close Spixi after the first start.
- **S-4 Put the page store back** (Spixi closed; the same steps as R of `docs/walk-fixb5.md`):
  `$wv = "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\Spixi.exe.WebView2\EBWebView"; $bk = (Get-ChildItem "$env:USERPROFILE\Documents" -Directory -Filter "Spixi-webview-copy-imgurl-*" | Sort-Object Name | Select-Object -Last 1).FullName; if (-not $bk) { throw 'no copy of the page store' }; $bk; Remove-Item -Recurse -Force $wv -ErrorAction Stop; Copy-Item -Recurse $bk $wv -ErrorAction Stop; Test-Path (Join-Path $wv 'Default')`
  The last line must print `True`. If Remove-Item fails: close every `msedgewebview2` process (Task Manager) and run the line again.
  Without S-2 / S-4, pins, drafts and the "Load pictures and GIFs" switch show their defaults once: then set Account ›
  Privacy › "Load pictures and GIFs" as it was before W-1.
- **The log:** Account › Developer › the log (or `%USERPROFILE%\Documents\Spixi\ixian.log`).

## Part 1 · Windows
| Row | Steps | Pass when |
|---|---|---|
| W-BUILD | After S-1 … S-4: start (Ctrl+F5). Open a chat with photos. Account › Developer › the log. | The log shows `[FLAGS] imgurl mediaorigin=1 mediakeep=1 trimhook=1` (only this build has it). |
| W-1 Pictures in the chat | Open a chat with 10 or more local photos (sent or downloaded), or Seed 56. Scroll through them. | Every tile shows its picture; no broken-picture icon; no tile stays empty. |
| W-2 The viewer | Tap a photo; swipe to the next photo of an album and back; tap Save. | The full picture shows; the page back shows the thumbnail, then the picture; no "This image could not be opened" toast; Save works. |
| W-3 Live texts over pictures | With the photos on screen, let the contact send 5 texts. | No tile blinks or fades again. |
| W-4 A reply to a photo | Reply to a photo (long press › Reply); look at the reply strip; send; look at the quote in the bubble. | The strip and the quote show the photo's picture (no broken icon). |
| W-5 Isolation (optional, DevTools) | Developer mode ON. In the chat: F12 › Network › filter `spixi-media`; copy one URL (`https://spixi-media.invalid/m/<32 hex>`). Open another chat; F12 › Console: `var i=new Image(); i.onload=()=>console.log('LOADED'); i.onerror=()=>console.log('REFUSED'); i.src='<the URL>'` | In the first chat the URL loads; in the other chat the console prints `REFUSED` (a grant of one WebView does not answer in another). |
| W-6 No network for the media host | After W-1: PowerShell `ipconfig /displaydns \| Select-String spixi-media` | Nothing found. |
| W-END | Developer mode as before. | — |

## Part 2 · Android (dev Release build on the Galaxy A52s)
| Row | Steps | Pass when |
|---|---|---|
| A-0 | Account › Backup › save the backup file (L149). App lock Off. | — |
| A-MEM-0 The base build + the seed | Wipe ONLY `Spixi\bin\Release\net10.0-android` + `Spixi\obj` (keep the Windows page store in `Spixi\bin\x64`); `git fetch origin`; `git switch --detach ae7b8303`; `dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -p:SpixiDevCoexist=true`; `adb -d install -r Spixi\bin\Release\net10.0-android\com.ixilabs.spixi.dev-Signed.apk`. Open the app: Account › Developer › **Seed** (make the dev seed again). Open Seed 56. | `git log -1 --format=%h` prints `ae7b8303`. Seed 56 shows its photos (about 96). The log has NO `[FLAGS] imgurl` line (the base build). |
| A-MEM-1 The before-number (the old path) | `powershell -ExecutionPolicy Bypass -File scripts\device\adb-walk.ps1 -Steps mem-home,mem-end,scroll-photos,open-seed,mem-photos -SeedIndex 50,51,52,55 -Repeats 5` (no `viewer` step: it fails on the phone). Then A-VIEW below. | `summary.md` shows `read rows` > 0 and `media thumbs` > 0 for k=55 (Seed 56). Else the number does not count: make the seed again and repeat. Paste `summary.md` and the A-VIEW lines. |
| A-BUILD This build | Wipe ONLY `Spixi\bin\Release\net10.0-android` + `Spixi\obj`; `git switch work/imgurl`; the same `dotnet build` and `adb -d install -r` (the data stays). Open a chat with photos. Account › Developer › the log. | `[FLAGS] imgurl mediaorigin=1 mediakeep=1 trimhook=1`. |
| A-MEM-2 The after-number | The same adb line as A-MEM-1, then A-VIEW. | `read rows` > 0 and `media thumbs` > 0 for k=55, else repeat. Paste `summary.md` and the A-VIEW lines. |
| A-VIEW The viewer by hand (after A-MEM-1 and after A-MEM-2) | Force-stop: `adb shell am force-stop com.ixilabs.spixi.dev`; open the app; open Seed 56; tap the newest photo; swipe through 10 photos; close the viewer; wait 10 s; then `adb shell dumpsys meminfo com.ixilabs.spixi.dev \| findstr /c:"TOTAL PSS" /c:"Unknown" /c:"Native Heap"` and `adb shell "dumpsys meminfo \| grep -i sandboxed_process"` | Write down the four numbers (TOTAL PSS, Unknown, Native Heap, the renderer's PSS). The viewer showed each photo (no "This image could not be opened" toast). |
| A-1 Pictures, viewer, albums | W-1, W-2, W-4 on the phone. | As W-1 / W-2 / W-4. |
| A-6 No media link in the system log (optional, #46 r6 NIT) | After A-1, before A-5: `adb logcat -d \| findstr spixi-media` | Write down the count. Chromium may log a failed subresource with its URL; a token there is already revoked and works in one WebView only (`ixian.log` holds no media link). |
| A-2 Send and receive | Send 2 photos; let the contact send 2 photos (an album). | Each shows its picture as it lands; the album keeps its shape. |
| A-3 Delete and offline | Delete one photo message (Delete for me). Then airplane mode on; open the chat again; open the viewer on a photo. Airplane mode off. | The deleted row is gone; offline, the pictures and the viewer still show (they are local); no broken icon. |
| A-4 Trim: BACKGROUND | Open Account, go back (it parks); press Home; wait 1 minute; `adb logcat -d \| findstr /c:"[TRIM]"`; if no `level=40` line: `adb shell am send-trim-memory com.ixilabs.spixi.dev BACKGROUND` | `[TRIM] level=40 spare=<0\|1> parked=1`; back in the app, Account opens and works. |
| A-5 Trim: UI_HIDDEN | `adb logcat -c`; then press Home from the chats list; `adb logcat -d \| findstr /c:"[TRIM]"` | `[TRIM] level=20 spare=0 parked=0`; nothing else changes. |
| A-END | App lock Off; Developer mode as before. If `Spixi\bin\x64` was wiped anyway: build Windows (Ctrl+F5), start once, close Spixi, then run S-4 (the store folder exists only after the first start). | — |

A number counts only with `read rows` > 0 and `media thumbs` > 0 (the 2026-11-26 run had empty seed chats and is NOT a
before-number: `claude/device-numbers-2026-11-26-mem-before.md`). One sample per memory step; a change under about 30 MB is
noise (two runs differed by 23 MB at mem-home).

## Owed to the Apple phase (iPhone + Mac; not in this walk)
| Row | Steps | Pass when |
|---|---|---|
| I-1 / M-1 Pictures | W-1, W-2, W-3, W-4 on the iPhone and the Mac (a wipe of obj/bin, then a plain build). | As on Windows; `ixian.log` has no "Content blocking: … did not compile" line; the scan page and a mini app work as before. |
| I-2 / M-2 The keeper on WebKit | During W-3's five texts, watch the tiles, the quote tile and the reply strip. | No tile blinks empty (the keeper's proof on WebKit; the Chromium lab could not show it). |
