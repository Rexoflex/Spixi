# F5 CHECKLIST — SESSION J (build recipe + the logcat capture that works)

## Build — PowerShell, paste in order

```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"
```

Windows (never `-t:Run` on this target — #663; the copy is what VS's deploy would do):
```
Remove-Item -Recurse -Force Spixi\bin, Spixi\obj -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\Documents\Spixi\html" -ErrorAction SilentlyContinue
dotnet build Spixi\Spixi.csproj -c Debug -f net10.0-windows10.0.19041.0 -p:Platform=x64
$exe = Get-ChildItem -Path Spixi\bin -Recurse -Filter Spixi.exe | Where-Object { $_.FullName -like "*windows10.0.19041.0*" } | Select-Object -First 1
Copy-Item -Recurse -Force "Spixi\Resources\Raw\*" $exe.DirectoryName
Start-Process $exe.FullName
```

Android (installs over Spixi Dev — same id, same key; no wipe, no uninstall):
```
dotnet build Spixi\Spixi.csproj -c Release -f net10.0-android -p:SpixiDevCoexist=true -t:Run
```

## The logcat capture that WORKS (Session I's showed nothing)

Session I piped `adb logcat | findstr /C:"[CDPERF]" …` and saw nothing for the whole walk.
Two reasons, both avoided here: PowerShell block-buffers a native filter on an endless
stream, and `/C:"[CDPERF]"` is still a regex character class to findstr. So: write the
RAW log to a file, walk, then grep the file.

Second PowerShell window, started BEFORE the phone action, left running:
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"
adb logcat -c
adb logcat -v time > walk.log
```
(nothing prints — it is writing to `walk.log`; leave it.) After the walk, `Ctrl+C` in that
window, then:
```
Select-String -Path walk.log -Pattern "CDPERF","L14","DEVSEED" | Select-Object -ExpandProperty Line
```
Paste what that prints. If it prints NOTHING, run this and paste its output — it tells
which tag .NET's Console goes to on this phone:
```
Select-String -Path walk.log -Pattern "Spixi|mono-stdout|DOTNET" | Select-Object -First 20 -ExpandProperty Line
```
`walk.log` is untracked; delete it after (`Remove-Item walk.log`).

## The rows for Session J come from the handoff §2/§3 — the artifact carries them.
