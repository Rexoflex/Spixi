# Walk — Quote box (`quotebox`, 2026-11-25)

The Artifact page: "Spixi walk — quotebox", https://claude.ai/artifact/9r32SVQYJDpMpbYC1XbeZu (the same rows, Pass / Fail /
N/A, a note on every row, Copy results).

What this walk checks: WHY the quote box of my own message "REPLY C — nine is fine for the green door." in chat
**Seed 57 Mojca Vrabec** does not react to a click on Windows (#1961 (2), finding 1). The cause was not reproduced off
the device and NO fix is built (`docs/quotebox-mechanism.md` § 0). These rows RECORD what the four likely causes leave
behind (the quote box's sender line and pointer, each click with its time, a toast, the right-click menu, the log lines):
(1) C# drew the box as its fallback box; (2) the box sent the jump and C# dropped it; (3) the click does not reach a
matched box on Windows; (4) an older page repainted the whole log while the mouse button was down. **The rows decide no
cause:** the main chat reads the notes with `docs/quotebox-mechanism.md` § 5 (#46 r3–r4, rule 9: a decision table here was
attacked twice in a row). This batch changes NO
app file: the build is the dev build of `redesign/frontend` @ `0eda93f5` that the PC and the phone already have (Seed 57
present), or any later one, in its Debug configuration (a developer build). **No new build is needed.**

## Before you start (Windows, PowerShell; each line is complete as it stands)
1. The tree the build came from (prints `0eda93f5 Merge pull request #28 from Rexoflex/work/walktools2` or a newer commit):
   `git -C "$HOME\Claude\Projects\Spixi Rework Of Frontend\Spixi" log -1 --format="%h %s"`
2. In Visual Studio select the **Debug** configuration. **Do not start Spixi yet:** run row Q-0 first, with Spixi closed
   (every start rolls the log, and Spixi keeps the logs of about the last 5 starts). Do not wipe `Spixi\bin` (nothing
   changed; a wipe empties the page store, L293). Spixi is started once, in W-BUILD, with **Ctrl+F5** (#1844 (1)).
3. If W-BUILD shows no **Seed 57 Mojca Vrabec**: close Spixi, copy the data folder (L149):
   `Copy-Item -Recurse (Join-Path ([Environment]::GetFolderPath('MyDocuments')) "Spixi") (Join-Path ([Environment]::GetFolderPath('MyDocuments')) ("Spixi-copy-quotebox-" + (Get-Date -Format yyyyMMdd-HHmm)))`,
   start Spixi again with Ctrl+F5, then Account › About › the dev card › "Remove seeded contacts", then "Seed 50 · heavy"
   (the card sentence must end with "Quote chat (Seed 57): 1 added, …").
4. The log line L of rows Q-0 and Q-W5 (copy it whole). It reads the logs oldest first, prints the file name and only the
   matching lines, and it replaces quoted text in them (a file path, which holds your user name and a contact's wallet
   address) by `'<path>'` on purpose; it hides only text between single quotes, and it may also hide a quoted word that is
   not a path. "No lines" is an answer too. If you ever moved the data folder with `spixiUserFolder` or `dataFolderPath`
   in `ixian.cfg`, it is still `Documents\Spixi` only when those lines are gone:
   ```
   Get-ChildItem -Path (Join-Path ([Environment]::GetFolderPath('MyDocuments')) "Spixi") -Filter "ixian*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime | Select-String -Pattern "Cannot open chat file","Cannot read from chat file","reply match","ixian:quotejump:","shell older insert","\[FLAGS\] histcs","\[FLAGS\] photo1b" | Select-Object -Last 200 | ForEach-Object { $_.Filename + ": " + ($_.Line -replace "'.*'", "'<path>'") }
   ```

## What the notes must say (every row)
For each quote box you look at, write three things BEFORE you click: **name** = does the box show the line
"Seed 57 Mojca Vrabec" (or "You") above the quote text — yes / no; **hand** = is the mouse pointer a hand over the box —
yes / no; then **click** = what happened, with the **clock time** of each click (hh:mm:ss, the Windows clock; the log
lines carry times). Write the clock time of each **open** of Seed 57 too. Before a click, wait 5 s after your last scroll; after a click keep the mouse AND the wheel still for
3 s (a toast may come after 2 s). Example note: `name no, hand no, 23:41:05 nothing, 23:41:13 nothing, 23:41:21 nothing,
no toast, menu opens`.

## Rows

| Id | Where | Do | Pass when |
|---|---|---|---|
| Q-0 | Windows, PowerShell, **Spixi closed** | Run the log line L (above, "Before you start" item 4). It reads the logs of the walk of 2026-11-25 (if still kept) and of today | You pasted what it printed (or "no lines") into the note. Information only: P when pasted |
| W-BUILD | Windows, Ctrl+F5 | Visual Studio's configuration box shows **Debug**. Start Spixi with Ctrl+F5 (the one start of this walk); open the chats list; open Account › About | The title bar of Visual Studio does NOT say "(Debugging)"; **Seed 57 Mojca Vrabec** is in the list; About shows the dev card (the developer build that writes the `[P1]` lines; this batch changes no app file, so no build-only mark exists) |
| Q-W1 | Windows | Open Seed 57 (note the time). Do not scroll. The second message from the bottom is mine: "REPLY B — found the key, thanks." under the quote "QUOTE TARGET B — the red key is under the mat.". Move the mouse onto that quote box; note **name** and **hand**. Click it once and keep still for 3 s | The chat jumps to the message from Seed 57 "QUOTE TARGET B — the red key is under the mat." (between rows 584 and 586) and it pulses. Note: name / hand / click |
| Q-W2 | Windows | Close the chat (open another chat, then Seed 57 again; write how you closed it and the time of the open). **Before you scroll:** move the mouse onto the quote box of REPLY B again and note its **name** and **hand** only (do not click). Then scroll up until my message "REPLY C — nine is fine for the green door." (between rows 829 and 831; with `firstpage50=1` it comes with the third older page). Stop scrolling and wait 5 s. Mouse onto its quote box; note **name** and **hand**. Click once (note the time), keep still for 3 s. **If nothing happens:** wait 5 s and click again, kept still; then a third time. Then right-click the same box — does the message menu open? Press Esc | The chat jumps to "QUOTE TARGET C — the green door opens at nine." (between rows 514 and 516) and it pulses. Note: B's name / hand · C's name / hand · each click with its time (jump / toast / nothing) · (if no jump) menu opens or not |
| Q-W3 | Windows | Do NOT close the chat after Q-W2. Go to "REPLY D — I will buy the chain tomorrow." (from Seed 57, between rows 769 and 771): if Q-W2 jumped (you are at row 515), scroll DOWN to it; if not, scroll further UP. Wait 5 s. Mouse onto its quote box; note **name** and **hand**. Click it once and keep still for 3 s | It jumps to my message "QUOTE TARGET D — the yellow bike needs a new chain." (between rows 359 and 361). Note: name / hand / click / toast |
| Q-W4 | Windows | Close the chat and open Seed 57 again (note the time). Scroll up to "REPLY C — …" again and wait 5 s. Note **name** and **hand**. Click it once and keep still for 3 s | It jumps to "QUOTE TARGET C — …" and it pulses. Note: name / hand / click / toast |
| Q-W5 | Windows, PowerShell | Run the log line L again | You pasted what it printed (or "no lines"). Information only: P when pasted |
| A-BUILD | Android (A52s), the dev build already installed | Open the chats list | **Seed 57 Mojca Vrabec** is in the list (the same build as the walk of 2026-11-25) |
| A-1 | Android | Open Seed 57: tap the quote box of "REPLY B — …" (note **name**). Close the chat, open it again, fling up to "REPLY C — …", tap its quote box (note **name**). Without closing, fling to "REPLY D — …" (down if C jumped, else up), tap its quote box (note **name**) | Each tap jumps to its target (B → between rows 584 and 586, C → 514 and 516, D → 359 and 361) and it pulses. A toast "This message is further back. Scroll up to find it." before a landing is a timing note, not a fail. Note: name for B, C, D |

## How the notes are read

The rows decide no cause and close nothing. The main chat reads each note with `docs/quotebox-mechanism.md` § 5 (the
signature each cause is expected to leave; reasoning, not a measurement) and matches each log line to the nearest click
time. A jump today does not close the item: causes 2 and 4 can pass a walk that keeps still. Anything that fits no
signature is written down as seen; it goes back to mechanism first.

The main chat copies no raw log line into a DECISIONS row.

Mark each row Pass / Fail / N/A with a note, then paste the results in the main chat.
