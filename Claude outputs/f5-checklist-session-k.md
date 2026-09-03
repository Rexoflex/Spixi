# F5 CHECKLIST — SESSION K (build recipe + the captures this batch needs)

The walk sheet is `docs/walk-session-k.html` (open it on the phone or the PC — tap P / F / N
per row, add a note, **Copy results**, paste the text back). Rows: A chat open · K keyboard
· T group chat · D dark buttons · P apps · L the logs · W Windows.

## Build — PowerShell, paste in order

```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"
```

Regenerate + gates first (bundle BEFORE shells, always — the bundle bakes the legal docs):
```
node scripts/build-demo-bundle.mjs
node scripts/build-shells.mjs
node scripts/smoke-test.mjs
```
Expect `bundle written: … 321 exports` · `18 shell(s) written` ·
`BASELINE OK — 4037 / the 3 KNOWN` **with** the Ixian-Core sibling beside the repo
(4036 without it — the M1 hold-out gate is one ok richer with the sibling, #748).

C# changed (SingleChatPage · HomePage · AppNewPage · SpixiContentPage · SpixiLocalization) —
wipe `obj`/`bin` on both targets.

Windows (never `-t:Run` on this target — #663; the copy is what VS's deploy would do):
```
Remove-Item -Recurse -Force Spixi\bin, Spixi\obj -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\Documents\Spixi\html" -ErrorAction SilentlyContinue
dotnet build Spixi\Spixi.csproj -c Debug -f net10.0-windows10.0.19041.0 -p:Platform=x64
$dir = "Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64"
Copy-Item -Recurse -Force "Spixi\Resources\Raw\*" $dir
Start-Process "$dir\Spixi.exe"
```
(⚠ `ll_*.html` is written ONCE per process now — the `Documents\Spixi\html` wipe above is
what guarantees the new shells are the ones served, #663 + #760.)

Android (the Release SpixiDevCoexist build, installs over Spixi Dev — same id, same key):
```
dotnet build Spixi\Spixi.csproj -c Release -f net10.0-android -p:SpixiDevCoexist=true -t:Run
```

## The capture (cable) — second PowerShell window, started BEFORE the phone actions

```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"
adb logcat -c
adb logcat -v time > walk.log
```
Phone actions, in this order:
1. open a chat at **3 contacts**, back out, open it **again** (A1/A3 → `[CDPERF] chat ctor / onload / chat-shell boot / load / drain / chat-shell / painted / present / frames`)
2. open **Seed 01** (1000 messages), scroll up and down for ten seconds (A2 + `[SCROLL]`)
3. in that chat: tap the field (keyboard) → **⊕** → tap the field → ⊕ (K1 + `[KBTRAY] … reveal by=resize`)
4. Apps → **Add app**, back (P3 + `[CDPERF] appnew`)
5. Account → Contacts, back (`[L14]`)

Then `Ctrl+C` in that window, and:
```
Select-String -Path walk.log -Pattern "CDPERF","SCROLL","KBTRAY","L14","WEBVIEW" | Select-Object -ExpandProperty Line
```
Paste what that prints. Then the memory split (the app in the foreground, first on the chats
list, then inside Seed 01):
```
adb shell dumpsys meminfo <package id>
```
Paste both tables. `walk.log` is untracked; delete it after (`Remove-Item walk.log`).

## What to read in the chat-open block (the #760 shape)

```
[CDPERF] chat ctor tap=Nms          ← row tap → constructor (new)
[CDPERF] chat onload t=A            ← the shell booted
[WEBVIEW] … [CDPERF] chat-shell boot nav=… dcl=…   ← A minus nav = WebView creation; dcl = the parse (new)
[CDPERF] chat load n=50 bg=…
[CDPERF] chat drain t=B
[WEBVIEW] … [CDPERF] chat-shell n=50 burst=… paint=… glass=…
[CDPERF] chat painted t=C           ← the shell's own signal (new)
[CDPERF] chat present t=D           ← expect D ≈ C, not B + 120
[CDPERF] chat frames n=… drop=… max=…
```
A `backstop t=` line means the verb did not arrive in 150 ms — say so, it is the #663 class.

## Windows — the [WV2] lines

`Documents\Spixi\ixian.log` (Windows logs to the file; the console mirror is Android-only):
```
Select-String -Path "$env:USERPROFILE\Documents\Spixi\ixian.log" -Pattern "WV2" | Select-Object -Last 30 -ExpandProperty Line
```
after an Account → Contacts and a chat-info open. Paste them with W1's verdict.
