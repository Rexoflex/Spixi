# F5 CHECKLIST — SESSION L (build recipe + the captures Session M needs)

The walk sheet is `docs/walk-artifact-session-l.html` (open it on the phone or the PC — tap
**P / F / N** per row, add a note, **Copy results**, paste the text back). Rows: **W** Windows
first (two of them are #768's regression test) · **A** chat open · **G** the alignment row ·
**K** keyboard → tray · **R** rotation + split-screen (new, #770) · **S** scroll · **M** memory
· **F** the three form pages (committed untested in Session K, still owed).

★★ **Read this before the build:** Session L fixed #768 so a missing asset folder **says so**
instead of rendering a stale page. The fix makes the failure visible; it does **not** stage the
assets. On Windows that means **F5 / Deploy in Visual Studio**, or the explicit copy below —
never a bare `dotnet build` and then `Spixi.exe`.

## Build — PowerShell, paste in order

```powershell
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"
```

Regenerate + gates first (**bundle BEFORE shells, always** — the bundle bakes the legal docs):
```powershell
node scripts/build-demo-bundle.mjs
node scripts/build-shells.mjs
node scripts/smoke-test.mjs
```
Expect `bundle written: … 321 exports` · `18 shell(s) written` ·
`BASELINE OK — 4067 pass / the 3 KNOWN` **with** the Ixian-Core sibling beside the repo
(one assertion fewer without it — the M1 hold-out gate, #748). If any number differs, stop and
say so before building.

C# changed this session (`SpixiContentPage` · `SpixiLocalization` · `App.xaml.cs` · `HomePage`)
— wipe `obj`/`bin` on both targets.

**Windows** (never `-t:Run` on this target — #663):
```powershell
Remove-Item -Recurse -Force Spixi\bin, Spixi\obj -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\Documents\Spixi\html" -ErrorAction SilentlyContinue
dotnet build Spixi\Spixi.csproj -c Debug -f net10.0-windows10.0.19041.0 -p:Platform=x64
$dir = "Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64"
Copy-Item -Recurse -Force "Spixi\Resources\Raw\*" $dir
Start-Process "$dir\Spixi.exe"
```

⚠ **The `Copy-Item` line is not optional and it is not a nicety** — it is what VS's Deploy step
does and what `dotnet build` does not. Without it `<exe>\html` is absent, and after #768 you now
get a page that NAMES the missing file instead of a 404 or a stale document. The
`Documents\Spixi\html` wipe guarantees the new shells are the ones served.

★ **W0 — prove the fix, once (30 seconds).** Before the copy, run the exe from a build with no
`html\` folder. Expected now: the app **starts** (it used to throw `DirectoryNotFoundException`
out of the `App()` constructor, uncaught), and a page appears **naming the missing file**.
`ixian.log` should carry `copyResources: the html asset folder is MISSING at …` — that line is
deferred past `Logging.start` on purpose, because Ixian-Core drops pre-start log calls. Then run
the copy and continue. If you would rather not, skip it and mark W0 **N**.

**Android** (the Release SpixiDevCoexist build, installs over Spixi Dev — same id, same key):
```powershell
dotnet build Spixi\Spixi.csproj -c Release -f net10.0-android -p:SpixiDevCoexist=true -t:Run
```

## The capture (cable) — second PowerShell window, started BEFORE the phone actions

```powershell
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"
adb logcat -c
adb logcat -v time | Out-File -FilePath walk.log -Encoding utf8
```

⚠ **Use `Out-File -Encoding utf8`, NOT `> walk.log`.** Windows PowerShell 5.1's `>` writes
**UTF-16LE with a BOM** — every character separated by a null byte. `Select-String` reads it back
fine, so the trap is invisible on this machine, but the file is unusable to anything else: a
`grep` finds zero matches in a log full of stamps, and pasting it anywhere non-Windows produces
`[ C D P E R F ]`. Walk L was captured this way and the log looked empty until it was converted
(`iconv -f UTF-16LE`). The data was all there.

★ The capture also dies if the cable is nudged — `adb logcat` exits on disconnect, and the phone
re-prompts for debugging authorization. Since the walk now involves **rotating the device and
entering split-screen**, consider capturing over Wi-Fi instead so nothing physical can break it:

```powershell
adb tcpip 5555
adb shell ip route            # read the phone's IP off the last field
adb connect <phone-ip>:5555
# unplug the cable, confirm with: adb devices
```

Phone actions, in this order:
1. open a chat at **3 contacts**, back out, open it **again**
   (A1/A3 → `[CDPERF] chat ctor / onload / chat-shell boot / load / drain / chat-shell / painted / present / frames`)
2. open **Seed 01** (1000 messages), scroll up and down for ten seconds (A2 + `[SCROLL]`)
3. in that chat: tap the field (keyboard) → **⊕** → tap the field → ⊕
   (K1 + `[KBTRAY] … reveal by=resize`)
4. ★ **NEW, #770 — the rotation row.** Still in that chat, with the keyboard **down**: rotate to
   landscape, tap **⊕**, look at the tray, rotate back, tap **⊕** again. Then repeat with the
   keyboard **up** when you rotate. Then, portrait, enter **split-screen** with any app and tap
   **⊕**. What the fix claims: the tray is the height of a real keyboard every time, it appears
   **immediately** (not after ~450 ms), and nothing is remembered from a rotation or a split.
5. Apps → **Add app**, back (F1 + `[CDPERF] appnew`)
6. Account → Contacts, back (`[L14]`)

Then `Ctrl+C` in that window, and:
```powershell
Select-String -Path walk.log -Pattern "CDPERF","SCROLL","KBTRAY","L14","WEBVIEW" | Select-Object -ExpandProperty Line
```
Paste what that prints. Then the memory split (app in the foreground, first on the chats list,
then inside Seed 01):
```powershell
adb shell dumpsys meminfo com.ixilabs.spixi.dev
```
Paste both tables. `walk.log` is untracked; delete it after (`Remove-Item walk.log`).

## What to read in the chat-open block — THIS DECIDES THE ROUTE (#764)

```
[CDPERF] chat ctor tap=…ms
[CDPERF] chat-shell boot nav=…ms dcl=…ms
[CDPERF] chat onload …  → load … → drain … → painted … → present …
```

- `nav` **small** + `dcl` **large** → the cost is the **parse**: warm WebView / code cache.
- `nav` **large** → the cost is **WebView creation**: warm WebView.
- Either way the batch transport (`docs/chat-transport-spec.md`) is the scroll-auto-load unlock.

**Write the BE work order on these numbers, not before.** And: a `backstop t=` line on ANY open
means the `ixian:painted` verb did not arrive — that is the #663 class, trace it before anything
else (the built `chat.html` on the device is the suspect).

## Windows — the `[WV2]` lines and the white pane (W1/W2)

`[WV2]` goes to `ixian.log` on Windows (not the console). If the white pane survives with
`DefaultBackgroundColor` applied at every pass, the ghost is the compositor re-attach (#248's
class) and the measurement says so — no third guess.

```powershell
Get-Content "$env:USERPROFILE\Documents\Spixi\ixian.log" -Tail 200 | Select-String "WV2","copyResources","localizeHtml","Localized shell"
```

## The alignment row (G1) — item ⑥, and the cheapest test first

The continuation bubble hanging left of the one above it. **Do W0 and the full F5 build first,
then look again** — the component is not the suspect (a probe of the shipped bundle shows the
gutter present on every grouped position, and the shell passes `showAvatar` for every received
row), so the first hypothesis is that the screenshot came from the same stale asset set as #768.
If it survives a clean build, that is a NEW finding: say so, and say whether the row above it
carried a **reaction** — that is the one thing distinguishing your screen from the case T1 was
built against.
