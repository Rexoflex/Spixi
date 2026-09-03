# F5 CHECKLIST — SESSION J (build recipe + the logcat capture that NOW works)

The walk sheet itself is `docs/walk-session-j.html` (open it on the phone or the PC — tap
P / F / N per row, add a note, **Copy results**, paste the text back to me). The rows are the
handoff's §2 (the seven fixes) + Damir's ten evening rulings + the two numbers rows.

## Build — PowerShell, paste in order

```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"
```

Regenerate + gates first (the bundle bakes the legal docs, so bundle BEFORE shells):
```
node scripts/build-demo-bundle.mjs
node scripts/build-shells.mjs
node scripts/smoke-test.mjs
```
Expect `BASELINE OK — 4003 / the 3 KNOWN` **with** the Ixian-Core sibling beside the repo
(4002 without it — the M1 hold-out gate is one ok richer with the sibling, #748).

Windows (never `-t:Run` on this target — #663; the copy is what VS's deploy would do):
```
Remove-Item -Recurse -Force Spixi\bin, Spixi\obj -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\Documents\Spixi\html" -ErrorAction SilentlyContinue
dotnet build Spixi\Spixi.csproj -c Debug -f net10.0-windows10.0.19041.0 -p:Platform=x64
$dir = "Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64"
Copy-Item -Recurse -Force "Spixi\Resources\Raw\*" $dir
Start-Process "$dir\Spixi.exe"
```

Android (the Release SpixiDevCoexist build, installs over Spixi Dev — same id, same key;
no wipe, no uninstall):
```
dotnet build Spixi\Spixi.csproj -c Release -f net10.0-android -p:SpixiDevCoexist=true -t:Run
```

## The logcat capture — what was wrong, what to run now

Session I saw nothing, and Session J's second capture (findstr again) saw nothing either.
**Neither findstr nor buffering was the cause (#751):**

0. On this phone the C# console lines carry the tag **`I/DOTNET`** (Session J capture), not `mono-stdout`.
1. `App.xaml.cs` started Ixian's Logging with **console output OFF** — every `[CDPERF]`,
   `[L14]` and `[DEVSEED]` line went to `files/Spixi/ixian.log` inside the app and never to
   logcat. The Android dev-coexist build mirrors to the console now (tag `mono-stdout`); Windows is untouched.
2. The shell's `[CDPERF] chat-shell` line was `console.info`, and the release WebView drops
   chromium INFO lines from logcat (your capture has W and E chromium lines, not one I line).
   It is `console.warn` now — and since this WebView forwards NO console level to logcat (the
   first capture proved it), the Android chrome client forwards every shell console line into
   Logging as `[WEBVIEW] …` in dev builds (#754). Grep `WEBVIEW` too.

Second PowerShell window, started BEFORE the phone action, left running:
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"
adb logcat -c
adb logcat -v time > walk.log
```
(nothing prints — it is writing to `walk.log`; leave it.) Do the phone actions:
open a chat at 3 contacts · tap the field (keyboard) · ⊕ (tray) · tap the field again · ⊕ again
(the [KBTRAY] stamps) · About → **Seed 50 · heavy** (wait for the status sentence — it
carries the ms) · open **Seed 01** (1000 messages) · open Seed 12 (40) · Account → Contacts.
Then `Ctrl+C` in that window, and:
```
Select-String -Path walk.log -Pattern "CDPERF","L14","DEVSEED","KBTRAY","WEBVIEW" | Select-Object -ExpandProperty Line
```
Paste what that prints. If it prints NOTHING, run this and paste its output — it tells
which tag .NET's Console goes to on this phone:
```
Select-String -Path walk.log -Pattern "mono-stdout|Spixi|DOTNET" | Select-Object -First 20 -ExpandProperty Line
```
`walk.log` is untracked; delete it after (`Remove-Item walk.log`).

## What the Session I capture DID say (#751)

`tile memory limits exceeded, some content may not draw` in pairs at every chat open, and
the renderer sandbox killed/restarted around it. Measured here: the built chat with 1000
messages is 7 compositor layers, 4 drawing — no per-bubble layer, the tail filter / pattern
mask / lift add none. The likelier home is two full-screen WebViews alive across the native
page transition — the security architecture, not a shell defect. Nothing to fix from CSS;
the chat-open stamps decide the L10 shape.
