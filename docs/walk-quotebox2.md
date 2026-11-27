# Walk — Quote box 2 (`quotebox2`, 2026-11-27)

The Artifact page: "Spixi walk — quotebox2", https://claude.ai/artifact/FbXGs4rXJAX6QyrFYJGypz (the same rows, Pass / Fail / N/A, a
note on every row, Copy results).

What this walk checks: on Windows, the quote box of my own "REPLY C — nine is fine for the green door." in chat
**Seed 57 Mojca Vrabec** is drawn as the plain fallback box (no sender line, no hand pointer; WALK #1968). The cause is
NOT proven off the device and NO fix is built (`docs/quotebox2-mechanism.md` § 0). This build adds ONE developer-build
log line, `[QB2] reply match …`, at every reply match; the rows read it, look for C's target row in the chat itself, and
try a fresh seed. The main chat reads the notes with `docs/quotebox2-mechanism.md` § 4. The three sent-sweep lines
(#1966 (3)) have no device row: their effect (an old sent copy of a removed chat deleted from disk) shows on no screen;
the pins `pins-quotebox2/a-sweep` and CSH `QuoteBox2Tests` hold them.

## Before you start (Windows, PowerShell; each line is complete as it stands)
1. Get the branch (the clone of your fork):
   `git -C "$HOME\Claude\Projects\Spixi Rework Of Frontend\Spixi" status -sb` (no uncommitted change; else save it first)
   `git -C "$HOME\Claude\Projects\Spixi Rework Of Frontend\Spixi" fetch origin`
   `git -C "$HOME\Claude\Projects\Spixi Rework Of Frontend\Spixi" switch work/quotebox2`
   `git -C "$HOME\Claude\Projects\Spixi Rework Of Frontend\Spixi" pull --ff-only`
   `git -C "$HOME\Claude\Projects\Spixi Rework Of Frontend\Spixi" rev-parse HEAD origin/work/quotebox2` (prints two
   hashes; W-BUILD needs them EQUAL: the build is the pushed head of `work/quotebox2`)
2. In Visual Studio select the **Debug** configuration. Only C# changed: **do not wipe** `Spixi\bin` or `Spixi\obj` (a wipe
   empties the page store and deletes `ixian.cfg`, L293). **Do not start Spixi yet:** row Q2-0 runs with Spixi closed.
3. The log line L (rows Q2-0, Q2-W7, Q2-S3; copy it whole). It puts its output on the CLIPBOARD (it can be long): paste it
   into the note with Ctrl+V; an empty clipboard = "no lines". It takes EVERY matching line of every kept log (no tail
   cut: the old sheet's `Select-Object -Last 200` cut off the start of the walked process). The pattern `reply match` (no
   colon) also copies `reply match failed (…)` and every `[QB2] reply match …` line; `[FLAGS] photo1b` is the line every
   start of Spixi writes, so the paste shows that it reaches back to the start. `shell older insert` (one line per older page) and
   Core's `Cannot write …` / `Cannot create …` lines are there for the readings of `docs/quotebox2-mechanism.md` § 4. It reads the logs oldest first, gives the file name and only
   the matching lines, and replaces quoted text (a file path) by `'<path>'`. "No lines" is an answer too:
   ```
   Get-ChildItem -Path (Join-Path ([Environment]::GetFolderPath('MyDocuments')) "Spixi") -Filter "ixian*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime | Select-String -Pattern "reply match","Cannot open chat file","Cannot read from chat file","Cannot write to chat file","Cannot create chat file","ixian:quotejump:","shell older insert","\[FLAGS\] photo1b","\[FLAGS\] histcs","\[DEVSEED\]" | ForEach-Object { $_.Filename + ": " + ($_.Line -replace "'.*'", "'<path>'") } | Set-Clipboard
   ```
4. The copy of the data folder (rows Q2-0 and Q2-S1; L149). It holds your wallet: it stays on this PC.
   `Copy-Item -Recurse (Join-Path ([Environment]::GetFolderPath('MyDocuments')) "Spixi") (Join-Path ([Environment]::GetFolderPath('MyDocuments')) ("Spixi-copy-quotebox2-" + (Get-Date -Format yyyyMMdd-HHmm)))`

## What the notes must say (every quote row)
Before you click: **name** = does the box show "Seed 57 Mojca Vrabec" (or "You") above the quote text — yes / no;
**hand** = is the pointer a hand over the box — yes / no. Then **click** = what happened, with the clock time (hh:mm:ss).
Write the clock time of each **open** of Seed 57. Wait 5 s after your last scroll before a click; keep the mouse and the
wheel still for 3 s after it.

## Rows

| Id | Where | Do | Pass when |
|---|---|---|---|
| Q2-0 | Windows, PowerShell, **Spixi closed** | First copy the data folder (item 4) — this is the **evidence copy**: the stored Seed 57 as it is before any open of this walk. Write down the folder name it made. Then run the log line L (if the logs of the walk of 2026-11-26 are still kept, it copies them too). | The copy exists (its name in the note); you pasted what L copied (or "no lines"). Information only: P when both are in the note |
| W-BUILD | Windows, **Ctrl+F5** | Run item 1's `rev-parse` line. Configuration **Debug**; start Spixi with **Ctrl+F5** (#1844 (1)). If Visual Studio asks whether to run the last successful build: answer **No** and note it (a build error — the four C# files of this batch are compiled here first). Open the chats list | The two hashes of item 1 are EQUAL (the build is the pushed head of `work/quotebox2`); Visual Studio's Output window shows the build with 0 errors (no "run the last successful build" question); the title bar does NOT say "(Debugging)"; **Seed 57 Mojca Vrabec** is in the list. (Row Q2-W7 also finds the `[QB2]` lines, which only this build writes) |
| Q2-W1 | Windows | Open Seed 57 (note the time). Do not scroll. The newest message is from Seed 57: "REPLY A — yes, I will be at the boat by noon." Note **name** and **hand** on its quote box; click once, keep still 3 s | It jumps to my "QUOTE TARGET A — the blue boat leaves at noon." (between rows 679 and 681) and it pulses |
| Q2-W2 | Windows | Close the chat (open another chat, then Seed 57 again; note the time). The second message from the bottom is mine: "REPLY B — found the key, thanks.". Name / hand; click once, keep still 3 s | It jumps to "QUOTE TARGET B — the red key is under the mat." (between rows 584 and 586) and it pulses |
| Q2-W3 | Windows | Close the chat and open Seed 57 again (note the time). **Before you scroll:** mouse onto the quote box of "REPLY B — …" and note its **name** and **hand** (do not click). Then scroll up to my "REPLY C — nine is fine for the green door." (between rows 829 and 831; it comes with the third older page). Wait 5 s. Name / hand; click once (note the time), keep still 3 s. If nothing happens: a right-click on the box — does the menu open? Esc | It jumps to "QUOTE TARGET C — the green door opens at nine." (between rows 514 and 516) and it pulses; the box shows the line "Seed 57 Mojca Vrabec" |
| Q2-W4 | Windows | Do NOT close the chat. Go to "REPLY D — I will buy the chain tomorrow." (between rows 769 and 771): DOWN if Q2-W3 jumped, else further UP. Wait 5 s. Name / hand; click once, keep still 3 s | It jumps to my "QUOTE TARGET D — the yellow bike needs a new chain." (between rows 359 and 361) |
| Q2-W5 | Windows | Close the chat and open Seed 57 again (note the time). **Before you scroll:** REPLY B's **name** and **hand** (no click). Then scroll up to "REPLY C — …" again. Name / hand; click once, keep still 3 s | As Q2-W3: it jumps, and the box shows the sender line. Note B's name / hand too |
| Q2-W6 | Windows | Without a click on any quote box: scroll up from where you are (REPLY C, or row 515 after a jump) until you see a plain message whose "(row …)" number is below 514. On the way, is there a message "QUOTE TARGET C — the green door opens at nine." from Seed 57 between "(row 516)" and "(row 514)"? Write what you see there; if numbers are missing, write the first number on each side of every gap | Information only (P when noted): **yes** = the row is in the chat · **no** = it is missing (with the gaps you saw) |
| Q2-W7 | Windows, PowerShell | Close Spixi (the log is complete after it ends). Run the log line L | You pasted ALL that L copied. It holds the `[FLAGS] photo1b` line of the W-BUILD start and, after it, `[QB2] reply match reply=… found=… cand=… deep=… idx=… via=… ui=…` lines (only this build writes them). P when pasted and both are there |
| Q2-S1 | Windows | **Only if Q2-W3 or Q2-W5 did NOT jump.** Close Spixi. Copy the data folder (item 4 above). Start Spixi with Ctrl+F5. Account › About › the dev card › "Remove seeded contacts", then "Seed 50 · heavy" | The card sentence ends with "Quote chat (Seed 57): 1 added, …". N/A when C jumped |
| Q2-S2 | Windows | After Q2-S1: open Seed 57, scroll up to "REPLY C — …", wait 5 s; name / hand; click once, keep still 3 s | It jumps to "QUOTE TARGET C — …". A FAIL here is an answer too: note name / hand / click. N/A when Q2-S1 is N/A |
| Q2-S3 | Windows, PowerShell | After Q2-S2: close Spixi; run the log line L | You pasted ALL that L copied, with the `[FLAGS] photo1b` line of the Q2-S1 start. N/A when Q2-S1 is N/A |
| A-BUILD | Android (A52s) | The dev build of `work/quotebox2` if you build one (Debug to the phone); else the dev build that is installed. Open the chats list | **Seed 57 Mojca Vrabec** is in the list. Note which build |
| A-1 | Android | Open Seed 57: tap the quote box of "REPLY A — …" and note **name**. Close, open again: "REPLY B — …" (name; tap). Close, open again, fling up to "REPLY C — …" (name; tap). Without closing, fling to "REPLY D — …" (down if C jumped, else up; name; tap) | Each tap jumps to its target (A → rows 679–681, B → 584–586, C → 514–516, D → 359–361) and it pulses; each box shows its sender line. A toast "This message is further back. Scroll up to find it." before a landing is a timing note, not a fail |

## How the notes are read
- Q2-W3 / Q2-W5 jump on this build → the miss did not come back; the `[QB2]` lines of REPLY C say `found=1`; the item stays
  open for one more walk (the cause is not known).
- C is a fallback box again → its `[QB2]` line (C's id is `5a68a0b3fbf20abcb919b3554f8f2a3e`, B's `93522be02a634dc9799ab7fdcbad48a6`,
  D's `d1d600aeb1c540b1fdf1abc7c3af2649`, A's `aad44f7b9711a1188892ba8482508f62`; the one near the time of C's page) is read with
  `docs/quotebox2-mechanism.md` § 4 (beside B's line of the SAME open), with Q2-W6 (is row 515 in the chat) and
  Q2-S2 (does a fresh seed match). The main chat writes the reading; it copies no raw log line into a DECISIONS row.
- Mark each row Pass / Fail / N/A with a note, then paste the results in the main chat.
