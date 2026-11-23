# Walk histcs — History C#: older pages off the UI thread, the first page of 50 rows

Session `histcs`, 2026-11-22 (DECISIONS #1860–#1874; packets P90–P92). One build per platform from the branch
`work/histcs`. Only C# changed (no html): Windows = F5 (never `dotnet build`, #663); Android = the Release dev build.
The page with the same rows: the Artifact **"Spixi History C# — walk rows"** (https://claude.ai/artifact/HYrKSGo3ZPxViMoo1niwLP). Seed chats (the
developer seed, already on the walk phone and the walk PC): Seed 05 = a text chat of 1000 messages · Seed 56 = the photo
chat (100 messages, one older page). No row needs a new account. Rows W-3 / A-3 need a message from your other device
(the phone ↔ the PC: the two accounts you walk with).

## Set-up (PowerShell on the PC, one line at a time)
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/histcs
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull --ff-only
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; Remove-Item -Recurse -Force Spixi\obj, Spixi\bin
```
- Windows: open `SPIXI.sln` in Visual Studio, target Windows, **F5**.
- Android (the walk phone on USB; leaves your data in place — never `adb uninstall`, never `pm clear`):
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -p:SpixiDevCoexist=true
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; adb install -r Spixi\bin\Release\net10.0-android\com.ixilabs.spixi.dev-Signed.apk
```

## Part 1 · Windows

| Row | Steps | Pass when |
|---|---|---|
| W-BUILD | Start the app. Open Seed 05. Scroll up until the spinner shows once. Account › Developer › open the log. Find `[FLAGS] histcs`. | The log has `[FLAGS] histcs loadmoreoffui=1 firstpage50=1` (only this build writes it). |
| W-1 Fast to the top, Seed 05 | Open Seed 05. Scroll up FAST (mouse wheel or the scrollbar thumb) through at least five pages of older messages, without a stop. | The scroll does not stop when a page arrives; the message under the pointer does not move when a page lands; at each seam no message is missing or twice; the date pill shows once per day. |
| W-2 Fast to the top, Seed 56 | The same in Seed 56 (one older page). | As W-1; the photos of the older page appear on their squares. |
| W-3 A new message while a page loads | Open Seed 05 on the PC, or the chat with your other device. Scroll up so a page loads; at the same time send a text to THIS chat from your other device. Then scroll to the newest message. | The new message shows once, at the bottom, in order; the older page is complete; nothing is twice. |
| W-4 Leave while a page loads | Open Seed 05. Scroll up fast; when the spinner shows, at once go back to the chats list. Open Seed 05 again; scroll up again. | No error; the chat opens with its newest messages; older pages load again and nothing is twice. |
| W-5 The quote jump to an older message | In Seed 05 after three older pages, tap a reply's quote that points to an older message. | The jump lands on the quoted message and it pulses; the pages above and below it are complete. |

## Part 2 · Android

| Row | Steps | Pass when |
|---|---|---|
| A-BUILD | Force-stop Spixi. Start it. Open Seed 05; fling up until the spinner shows once. Account › Developer › the log. | The log has `[FLAGS] histcs loadmoreoffui=1 firstpage50=1`, and (this dev build) `[P1] chat older read … window=101` for the first page. |
| A-1 Fast flings to the top, Seed 05 | As W-1 with FAST finger flings, at least five pages. | The fling does not stop or stutter when a page arrives; the row under the finger stays; no missing or double message at a seam; the date pill once. |
| A-2 Fast flings, Seed 56 | As W-2 with flings. | As A-1. |
| A-3 A new message while a page loads | As W-3 (send from the PC). | As W-3. |
| A-4 Leave while a page loads | As W-4 (the system back while the spinner shows). | As W-4. |
| A-5 The quote jump | As W-5. | As W-5. |

## Apple phase (#1515)
Mac: W-1 … W-5; iPhone: A-1 … A-5 (on iPhone WebKit a `scrollTop` write during momentum is a known risk — A-1 watches it).
