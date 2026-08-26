# Testing the redesign on Android — the simple version

---

## ★★ STEP ZERO — GET `adb` WORKING. THIS COMES BEFORE ANY ANDROID BUILD.

⚠ **Written down 2026-08-29 because it costs time every single time.** Damir: *"this
happens a lot until you find a proper command that loads daemon — please log it, this
comes before any attempt at android build."*

On this machine the Android SDK is installed by the **Visual Studio MAUI workload**, and
it does **not** go where Android Studio puts it. `adb` is **not** on PATH out of the box.

| | |
|---|---|
| ✅ **Actual path here** | `C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe` |
| ❌ Do NOT guess | `%LOCALAPPDATA%\Android\Sdk\…` — that is **Android Studio's** location and it does not exist on this machine |

### The one-time fix — do this once and the problem is gone for good

```powershell
$sdk = "C:\Program Files (x86)\Android\android-sdk"
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdk, "User")
$u = [Environment]::GetEnvironmentVariable("Path", "User"); [Environment]::SetEnvironmentVariable("Path", "$u;$sdk\platform-tools", "User")
```

★★ **THOSE THREE LINES DO NOT AFFECT THE SHELL YOU ARE STANDING IN.**
`SetEnvironmentVariable(…, "User")` writes the registry; a running process keeps the
environment it started with. Immediately after running them, a bare `adb` in the SAME
window still fails — which reads exactly like the fix not working, and it caught us on
2026-08-29 with the phone already attached and answering.

Two ways out, pick either. **This window, right now — one line, nothing after it:**

```powershell
$env:Path += ";$sdk\platform-tools"
```

…or open a **new** terminal. From then on it is permanent, and the Android build also
gets a proper `ANDROID_HOME` — itself a likely cause of a build that dies in ~1 second.

★★ **ONE COMMAND PER BLOCK, AND NEVER A TRAILING COMMENT.** On 2026-08-29 three separate
attempts failed because pasted lines JOINED — `adb devices$env:Path += "…"` and
`& $adb devices$env:ANDROID_HOME` are both in the transcript. Every one of those was the
instruction's formatting, not the reader. A multi-line block invites a multi-line paste,
and a `# comment` on a command line invites the next line to ride along with it.

### Until then, or on a machine that has not been set up

```powershell
$adb = "C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe"
& $adb kill-server
& $adb devices
```

`kill-server` is the part that matters: `adb devices` alone starts the daemon but will
happily trust a stale device list. Killing it forces a re-enumeration of USB.

### If the SDK is somewhere else again

```powershell
Get-ChildItem -Path "C:\Program Files (x86)\Android","C:\Program Files\Android","$env:LOCALAPPDATA\Android","$env:ProgramData\Microsoft" -Filter adb.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 5 -ExpandProperty FullName
```

★ **For whoever writes the next set of instructions: give the REAL path, never a
`<placeholder>`, and one command per line.** A placeholder gets pasted literally and a
two-command line gets joined — both happened on 2026-08-29 and both cost a round trip.

### What SUCCESS looks like

```
* daemon not running; starting now at tcp:5037
* daemon started successfully
List of devices attached
R5CRB1MWPPZ     device
```

A serial with the state `device` is the goal. Anything else, read the table below.

### Reading the device list

| Output | What it means |
|---|---|
| empty | cable or port. Charge-only cables are the usual culprit; try a USB-2 port, not a hub |
| `unauthorized` | the RSA prompt is waiting on the phone. Unlock it, tap **Allow**, tick "always allow". No prompt? Developer options → **Revoke USB debugging authorisations**, replug |
| `offline` | `& $adb reconnect offline`, or toggle USB debugging off and on |
| appears then vanishes | USB mode fell back to charge-only. Notification shade → USB notification → **File transfer / MTP** |

⚠ If Android Studio, Visual Studio's device list or scrcpy is running, it holds the
daemon. `kill-server` takes it down under them and they may restart it with different
settings — close them first.

### Then, and only then, build

```powershell
& $adb devices                    # exactly one device, state "device"
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Debug
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Debug -t:Run
```

With more than one device attached, add `-p:AdbTarget=-s<serial>` (no space after `-s`).

---


Plain-English, click-by-click. First time through, the slow part is just installing tools (mostly downloads). After that a test run is a couple of minutes.

There are two levels. **Level 1** takes ~2 minutes and lets you *see* the screens on a phone-shaped view right now. **Level 2** is the real deal — the screens running inside the actual app on an Android phone. Do Level 1 first; it's instant gratification and confirms the files are good before you invest in Level 2.

---

## Level 1 — See it in 2 minutes (no installing anything)

1. On your PC, go to the folder `Spixi\src\demo\`.
2. **Double-click `chats.html`.** It opens in your web browser.
3. Press **F12** (opens developer tools), then click the little **phone/tablet icon** near the top-left of that panel (tooltip says "Toggle device toolbar"). The page snaps to a phone shape.
4. Pick a phone from the dropdown at the top (e.g. "iPhone 12 Pro" or "Pixel 7"). Now you're looking at the Chats screen at phone size, and you can click/drag to try scrolling, swiping a row, etc.
5. Do the same with **`chat.html`** for the conversation screen.

This is *not* the real Android engine — it's your desktop browser pretending to be a phone — but it's the fastest way to eyeball layout and clickable behaviour. When you want the honest test, do Level 2.

---

## Level 2 — Run it inside the app on an Android emulator

This is developer-level work, so it takes some setup the first time. I've broken it into small stages. Take them one at a time.

### Stage A — Install the tools (one time, ~30–60 min, mostly waiting on downloads)

1. **Visual Studio 2026 (Community edition — free).** Download from `https://visualstudio.microsoft.com/`. **It must be 2026, not 2022** — this project targets **.NET 10** (confirmed in `Spixi.csproj`), which only Visual Studio 2026 can build; 2022 would stop with a target-framework error. Pick **Community** (free), not Professional/Enterprise (paid). When the installer asks which "workloads" to install, tick **".NET Multi-platform App UI development"** (that's MAUI). This one checkbox also installs the Android SDK and a phone emulator. Let it finish.
   - **After installing, launch Visual Studio by right-clicking it → "Run as administrator."** VS 2026 has a known quirk where the Android emulator list shows up empty unless you run it as admin. Do this every time for now.
2. **Node.js** (only needed for Stage C's one command). Download the **LTS** version from `https://nodejs.org/`, run the installer, click Next → Next → Finish. Done.

> How to tell it worked: open the Start menu, type "Visual Studio 2022", and it launches. That's all you need for now.

### Stage B — Open the project

1. Launch **Visual Studio 2022**.
2. **Open a project or solution** → browse to the repo and open **`SPIXI.sln`**.
3. Give it a minute the first time — it downloads some packages in the background (a progress bar at the bottom). Wait until it goes quiet.

### Stage C — Package the two test screens (one command)

1. In Windows Explorer, open the project folder (the one that contains the `src` and `scripts` folders).
2. Hold **Shift**, **right-click** an empty spot in that folder, and choose **"Open PowerShell window here"** (or "Open in Terminal").
3. Type this and press Enter:
   ```
   node scripts/build-test-shells.mjs
   ```
4. You should see two green ✓ lines. This just created two self-contained files (`chats.test.html`, `chat.test.html`) inside the app so it can load them. If it complains "node is not recognized," Node.js didn't install — redo Stage A step 2 and reopen the terminal.

### Stage D — Add a little test screen (copy-paste, ~5 min)

This is the fiddliest bit. You're adding a tiny throwaway screen whose only job is to show our two test files. It changes nothing else.

1. In Visual Studio's **Solution Explorer** (the file tree on the right), find the **Spixi** project, right-click the **`Pages`** folder → **Add → Class…**, name it **`RedesignTestPage`**. Two files may appear; if only one appears, that's fine.
2. Replace the contents of **`RedesignTestPage.xaml.cs`** with the code in the main plan (`docs/maui-integration-test-plan.md`, section 4) — or ask me and I'll paste it here for you.
3. Create/replace **`RedesignTestPage.xaml`** with the XAML from that same section.
4. Tell the app to open this screen on launch: find **`App.xaml.cs`**, and right after the app sets up its first page, add the small `#if DEBUG` snippet from section 4 of the plan. (This is the one spot where, if you're unsure, send me a screenshot of your `App.xaml.cs` and I'll tell you the exact line to add.)

> Not comfortable editing code? Send me a screenshot of Solution Explorer and of `App.xaml.cs`, and I'll give you the exact copy-paste and where it goes.

### Stage E — Press play on an Android phone

1. At the top of Visual Studio there's a green **▶ play button** with a dropdown next to it. Click the dropdown and pick an **Android Emulator** (something like "Pixel 5 - API 34"). If none exists, click **"Android Emulators"** → **Create** → accept the defaults → let it download the phone image once.
2. Click the green **▶** (it says "Android Emulator"). First build takes a few minutes; a phone window opens and the app launches straight into the test screen.
3. Use your mouse like a finger: **scroll** the chat list, **swipe** a row left/right, **press-and-hold** a row for the menu, tap **Accept** on a contact request. Tap the **Chats / Chat** buttons at the top to switch between the two screens.

### Stage F — See what's happening under the hood (optional but handy)

While the emulator is running, open **Chrome on your PC** and go to **`chrome://inspect`**. Your emulator's screen appears in the list — click **inspect** to get a live view of the page and any error messages. Great for spotting why something looks off.

---

## What to look for

Walk the checklist in `docs/maui-integration-test-plan.md` section 7 — the short version: do the fonts look right, do all the icons show, does dark mode follow your phone, and does every gesture (scroll, swipe, long-press, the Accept→handshake animation, the composer keyboard on the chat screen) behave. **Record your screen** while you do it (the emulator has a record button in its side toolbar) and send it over with anything that looks wrong — that's all I need to fix things.

---

## If you get stuck

Any step that doesn't match what you see — screenshot it and send it. The two most common snags are Stage D (adding the test screen) and picking/creating the emulator in Stage E; both are quick for me to talk you through. And remember Level 1 always works as a fallback for a quick look while we sort out Level 2.
