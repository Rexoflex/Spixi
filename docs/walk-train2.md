# Walk train2 — the merge train of 2026-11-27 / 28 (`qtools`, `quotebox2`)

Session `train2` (DECISIONS #2117–#2121, rulings #1971 (2), #1975). ONE build per platform from the branch `work/train2`; ONE walk sitting. The same rows are on the page "Spixi walk — train 2" (one card per row, numbered steps, a Copy button per command, Pass / Fail / N/A, a note, "Copy results").

In the train: `qtools` (CI and scripts, no walk rows) · `quotebox2` (the rows below, from `docs/walk-quotebox2.md`). NOT in the train: `imgurl` (#2118: qtools' isolation check does not know its iOS media view) — its rows, its seed check and its memory before / after are not on this sheet.

The rows are copied whole from `docs/walk-quotebox2.md`; each keeps its id and names its batch and its switch. The only changes: the branch `work/quotebox2` → `work/train2` (T-0, W-BUILD); the sheet's shared lines (the log line L, the data copy) are written into the cards that use them. New rows: the set-up T-0 … T-4 only. The wipe of T-2 is the train's (the quotebox2 sheet alone needs none: only C# changed); T-1 copies the data folder before it.

★ L149 — your test account and its data stay. Copy the data folder first. **Never** Delete account, never `adb uninstall`, never `pm clear`. The walk sends no IXI. ★ Windows = Ctrl+F5 (#1844 (1)), never `dotnet build` (#663).

How the notes are read: `docs/walk-quotebox2.md` § "How the notes are read" (the reply ids of A, B, C, D are there; the main chat reads the `[QB2]` lines of REPLY C with `docs/quotebox2-mechanism.md` § 4).

The sent sweep at three more sites (switch `SweepOnForget`) has no device row (its effect shows on no screen; `pins-quotebox2/a-sweep` and CSH `QuoteBox2Tests` hold it). Apple walk (later): no Mac or iPhone row in this train (neither `qtools` nor `quotebox2` has one; `apple-compile` compiles the Apple targets on the pull request).

## Set-up

### T-0 — Get the branch  (`train2` · switch: none)

Your fork clone switches to work/train2.

1. Run the first line (no uncommitted change may show; else save it first).
   ```
   cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git status -sb
   ```
   You should see: ## and the current branch, with no changed file listed.
2. Run the next line.
   ```
   cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
   ```
   You should see: It ends without an error.
3. Run the next line.
   ```
   cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/train2
   ```
   You should see: Switched to branch 'work/train2' (or: already on it).
4. Run the next line.
   ```
   cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull --ff-only
   ```
   You should see: It ends without an error.
5. Run the next line. It prints two hashes.
   ```
   cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git rev-parse HEAD origin/work/train2
   ```
   You should see: The two hashes are equal (the build is the pushed head of work/train2).

Result: Pass / Fail / N/A · note:

### T-1 — Copy the data folder (Windows, before the wipe)  (`train2` · switch: none)

L149: your test account and its data stay. The copy holds your wallet: it stays on this PC.

1. Close Spixi. Run this line.
   ```
   Copy-Item -Recurse "$env:USERPROFILE\Documents\Spixi" ("$env:USERPROFILE\Documents\Spixi-copy-train2-" + (Get-Date -Format yyyyMMdd-HHmm))
   ```
   You should see: A folder Spixi-copy-train2-… is in Documents.

Result: Pass / Fail / N/A · note:

### T-2 — The Windows build (wipe, then Ctrl+F5)  (`train2` · switch: none)

Never dotnet build for Windows (#663). The wipe empties the page store; T-3 copies the new one.

1. Close Visual Studio. Run this line.
   ```
   cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; Remove-Item -Recurse -Force Spixi\bin, Spixi\obj
   ```
   You should see: It ends without an error.
2. Open SPIXI.sln, select the Debug configuration and the Windows target. Press Ctrl+F5.
   You should see: Spixi starts with your test account. A build error: paste it in the main chat (the first Windows compile on the PC of the quotebox2 files SingleChatPage.xaml.cs, SingleChatPage.ReplyMatch.cs, ContactNewPage.xaml.cs, SpixiContentPage.cs, SentSweepOnForget.cs, SpixiFlags.cs; redesign-ci compiles them first on the pull request).
3. Do not open a chat. Close Spixi.
   You should see: Spixi is closed.

Result: Pass / Fail / N/A · note:

### T-3 — Copy the page store (Spixi closed)  (`train2` · switch: none)

The page store of the new build, after its first start: a copy for later (no row of this walk puts it back).

1. Run this line.
   ```
   $wv = "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64\Spixi.exe.WebView2\EBWebView"; $bk = "$env:USERPROFILE\Documents\Spixi-webview-copy-train2-" + (Get-Date -Format yyyyMMdd-HHmm); Copy-Item -Recurse $wv $bk -ErrorAction Stop; $bk
   ```
   You should see: It prints the path of the copy.

Result: Pass / Fail / N/A · note:

## Windows

### Q2-0 — The evidence copy, Spixi closed  (`quotebox2` · switch: none (information))

The stored Seed 57 as it is before any open of this walk. Information only.

1. Spixi stays closed. Copy the data folder: this is the evidence copy. Write down the folder name it makes.
   ```
   Copy-Item -Recurse (Join-Path ([Environment]::GetFolderPath('MyDocuments')) "Spixi") (Join-Path ([Environment]::GetFolderPath('MyDocuments')) ("Spixi-copy-quotebox2-" + (Get-Date -Format yyyyMMdd-HHmm)))
   ```
   You should see: A folder Spixi-copy-quotebox2-… is in Documents. Its name goes in the note.
2. Run the log line L. It puts its output on the clipboard. Paste it into the note with Ctrl+V. An empty clipboard = "no lines".
   ```
   Get-ChildItem -Path (Join-Path ([Environment]::GetFolderPath('MyDocuments')) "Spixi") -Filter "ixian*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime | Select-String -Pattern "reply match","Cannot open chat file","Cannot read from chat file","Cannot write to chat file","Cannot create chat file","ixian:quotejump:","shell older insert","\[FLAGS\] photo1b","\[FLAGS\] histcs","\[DEVSEED\]" | ForEach-Object { $_.Filename + ": " + ($_.Line -replace "'.*'", "'<path>'") } | Set-Clipboard
   ```
   You should see: You pasted what L copied (or wrote "no lines"). P when both are in the note.

Result: Pass / Fail / N/A · note:

### W-BUILD — Is this the new build?  (`quotebox2` · switch: none)

The build is the pushed head of work/train2 (T-0). Start with Ctrl+F5 (#1844 (1)).

1. T-0's last line printed two hashes. Check them.
   You should see: The two hashes are equal.
2. Configuration Debug; start Spixi with Ctrl+F5. If Visual Studio asks whether to run the last successful build: answer No and note it.
   You should see: Visual Studio's Output window shows the build with 0 errors (no "run the last successful build" question). The title bar does NOT say "(Debugging)".
3. Open the chats list.
   You should see: Seed 57 Mojca Vrabec is in the list. (Row Q2-W7 also finds the [QB2] lines, which only this build writes.)

Result: Pass / Fail / N/A · note:

### Q2-W1 — REPLY A jumps  (`quotebox2` · switch: none (dev line))

Before you click: name = does the box show "Seed 57 Mojca Vrabec" (or "You") above the quote text, yes / no; hand = is the pointer a hand over the box, yes / no. Then click = what happened, with the clock time (hh:mm:ss). Wait 5 s after your last scroll before a click; keep the mouse and the wheel still for 3 s after it.

1. Open Seed 57 (note the time). Do not scroll. The newest message is from Seed 57: "REPLY A — yes, I will be at the boat by noon."
   You should see: The chat shows REPLY A at the bottom.
2. Note name and hand on its quote box. Click once, keep still 3 s.
   You should see: It jumps to my "QUOTE TARGET A — the blue boat leaves at noon." (between rows 679 and 681) and it pulses.

Result: Pass / Fail / N/A · note:

### Q2-W2 — REPLY B jumps  (`quotebox2` · switch: none (dev line))

Before you click: name = does the box show "Seed 57 Mojca Vrabec" (or "You") above the quote text, yes / no; hand = is the pointer a hand over the box, yes / no. Then click = what happened, with the clock time (hh:mm:ss). Wait 5 s after your last scroll before a click; keep the mouse and the wheel still for 3 s after it.

1. Close the chat (open another chat, then Seed 57 again; note the time). The second message from the bottom is mine: "REPLY B — found the key, thanks.".
   You should see: REPLY B is the second message from the bottom.
2. Name / hand. Click once, keep still 3 s.
   You should see: It jumps to "QUOTE TARGET B — the red key is under the mat." (between rows 584 and 586) and it pulses.

Result: Pass / Fail / N/A · note:

### Q2-W3 — REPLY C jumps (the miss of WALK #1968)  (`quotebox2` · switch: none (dev line))

Before you click: name = does the box show "Seed 57 Mojca Vrabec" (or "You") above the quote text, yes / no; hand = is the pointer a hand over the box, yes / no. Then click = what happened, with the clock time (hh:mm:ss). Wait 5 s after your last scroll before a click; keep the mouse and the wheel still for 3 s after it.

1. Close the chat and open Seed 57 again (note the time). Before you scroll: mouse onto the quote box of "REPLY B — …" and note its name and hand (do not click).
   You should see: Name and hand of B are in the note.
2. Scroll up to my "REPLY C — nine is fine for the green door." (between rows 829 and 831; it comes with the third older page). Wait 5 s.
   You should see: REPLY C shows.
3. Name / hand. Click once (note the time), keep still 3 s. If nothing happens: a right-click on the box. Does the menu open? Esc.
   You should see: It jumps to "QUOTE TARGET C — the green door opens at nine." (between rows 514 and 516) and it pulses; the box shows the line "Seed 57 Mojca Vrabec".

Result: Pass / Fail / N/A · note:

### Q2-W4 — REPLY D jumps  (`quotebox2` · switch: none (dev line))

Before you click: name = does the box show "Seed 57 Mojca Vrabec" (or "You") above the quote text, yes / no; hand = is the pointer a hand over the box, yes / no. Then click = what happened, with the clock time (hh:mm:ss). Wait 5 s after your last scroll before a click; keep the mouse and the wheel still for 3 s after it.

1. Do NOT close the chat. Go to "REPLY D — I will buy the chain tomorrow." (between rows 769 and 771): DOWN if Q2-W3 jumped, else further UP. Wait 5 s.
   You should see: REPLY D shows.
2. Name / hand. Click once, keep still 3 s.
   You should see: It jumps to my "QUOTE TARGET D — the yellow bike needs a new chain." (between rows 359 and 361).

Result: Pass / Fail / N/A · note:

### Q2-W5 — REPLY C again  (`quotebox2` · switch: none (dev line))

Before you click: name = does the box show "Seed 57 Mojca Vrabec" (or "You") above the quote text, yes / no; hand = is the pointer a hand over the box, yes / no. Then click = what happened, with the clock time (hh:mm:ss). Wait 5 s after your last scroll before a click; keep the mouse and the wheel still for 3 s after it.

1. Close the chat and open Seed 57 again (note the time). Before you scroll: REPLY B's name and hand (no click).
   You should see: B's name / hand are in the note.
2. Scroll up to "REPLY C — …" again. Name / hand. Click once, keep still 3 s.
   You should see: As Q2-W3: it jumps, and the box shows the sender line.

Result: Pass / Fail / N/A · note:

### Q2-W6 — Is C's target row in the chat?  (`quotebox2` · switch: none (information))

Information only (P when noted).

1. Without a click on any quote box: scroll up from where you are (REPLY C, or row 515 after a jump) until you see a plain message whose "(row …)" number is below 514.
   You should see: A row below 514 shows.
2. On the way, is there a message "QUOTE TARGET C — the green door opens at nine." from Seed 57 between "(row 516)" and "(row 514)"? Write what you see there; if numbers are missing, write the first number on each side of every gap.
   You should see: yes = the row is in the chat · no = it is missing (with the gaps you saw).

Result: Pass / Fail / N/A · note:

### Q2-W7 — The [QB2] lines  (`quotebox2` · switch: none (dev line))

The log is complete only after Spixi ends.

1. Close Spixi. Run the log line L. Paste ALL that it copied into the note (Ctrl+V).
   ```
   Get-ChildItem -Path (Join-Path ([Environment]::GetFolderPath('MyDocuments')) "Spixi") -Filter "ixian*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime | Select-String -Pattern "reply match","Cannot open chat file","Cannot read from chat file","Cannot write to chat file","Cannot create chat file","ixian:quotejump:","shell older insert","\[FLAGS\] photo1b","\[FLAGS\] histcs","\[DEVSEED\]" | ForEach-Object { $_.Filename + ": " + ($_.Line -replace "'.*'", "'<path>'") } | Set-Clipboard
   ```
   You should see: It holds the [FLAGS] photo1b line of the W-BUILD start and, after it, [QB2] reply match reply=… found=… cand=… deep=… idx=… via=… ui=… lines (only this build writes them). P when pasted and both are there.

Result: Pass / Fail / N/A · note:

### Q2-S1 — A fresh seed (only if C did not jump)  (`quotebox2` · switch: none)

Only if Q2-W3 or Q2-W5 did NOT jump. Else mark N/A.

1. Close Spixi. Copy the data folder.
   ```
   Copy-Item -Recurse (Join-Path ([Environment]::GetFolderPath('MyDocuments')) "Spixi") (Join-Path ([Environment]::GetFolderPath('MyDocuments')) ("Spixi-copy-quotebox2-" + (Get-Date -Format yyyyMMdd-HHmm)))
   ```
   You should see: A new folder Spixi-copy-quotebox2-… is in Documents.
2. Start Spixi with Ctrl+F5. Account › About › the dev card › "Remove seeded contacts", then "Seed 50 · heavy".
   You should see: The card sentence ends with "Quote chat (Seed 57): 1 added, …".

Result: Pass / Fail / N/A · note:

### Q2-S2 — REPLY C on the fresh seed  (`quotebox2` · switch: none)

N/A when Q2-S1 is N/A. A FAIL here is an answer too: note name / hand / click.

1. Open Seed 57, scroll up to "REPLY C — …", wait 5 s. Name / hand. Click once, keep still 3 s.
   You should see: It jumps to "QUOTE TARGET C — …".

Result: Pass / Fail / N/A · note:

### Q2-S3 — The log after the fresh seed  (`quotebox2` · switch: none)

N/A when Q2-S1 is N/A.

1. Close Spixi. Run the log line L. Paste ALL that it copied.
   ```
   Get-ChildItem -Path (Join-Path ([Environment]::GetFolderPath('MyDocuments')) "Spixi") -Filter "ixian*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime | Select-String -Pattern "reply match","Cannot open chat file","Cannot read from chat file","Cannot write to chat file","Cannot create chat file","ixian:quotejump:","shell older insert","\[FLAGS\] photo1b","\[FLAGS\] histcs","\[DEVSEED\]" | ForEach-Object { $_.Filename + ": " + ($_.Line -replace "'.*'", "'<path>'") } | Set-Clipboard
   ```
   You should see: The paste holds the [FLAGS] photo1b line of the Q2-S1 start.

Result: Pass / Fail / N/A · note:

## Android

### T-4 — The Android build (the phone on USB)  (`train2` · switch: none)

Never uninstall, never clear data (L149). After the wipe of T-2: do not wipe again (the Windows build and its page store are in Spixi\bin).

1. On the phone: Account › Backup › save the backup file.
   You should see: The backup file is saved.
2. Run the build line. It takes several minutes.
   ```
   cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -p:SpixiDevCoexist=true
   ```
   You should see: The end of the output says 0 Error(s). An error: paste it in the main chat.
3. Run the install line.
   ```
   cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; adb -d install -r Spixi\bin\Release\net10.0-android\com.ixilabs.spixi.dev-Signed.apk
   ```
   You should see: It prints Success. Spixi starts with your test account.

Result: Pass / Fail / N/A · note:

### A-BUILD — Is Seed 57 there?  (`quotebox2` · switch: none)

The dev build of work/train2 (T-4).

1. Open the chats list. Note which build (T-4).
   You should see: Seed 57 Mojca Vrabec is in the list.

Result: Pass / Fail / N/A · note:

### A-1 — The four quote jumps on the phone  (`quotebox2` · switch: none (dev line))

A toast "This message is further back. Scroll up to find it." before a landing is a timing note, not a fail.

1. Open Seed 57: tap the quote box of "REPLY A — …" and note name.
   You should see: It jumps to rows 679–681 and pulses; the box shows its sender line.
2. Close, open again: "REPLY B — …" (name; tap).
   You should see: It jumps to rows 584–586 and pulses; the box shows its sender line.
3. Close, open again, fling up to "REPLY C — …" (name; tap).
   You should see: It jumps to rows 514–516 and pulses; the box shows its sender line.
4. Without closing, fling to "REPLY D — …" (down if C jumped, else up; name; tap).
   You should see: It jumps to rows 359–361 and pulses; the box shows its sender line.

Result: Pass / Fail / N/A · note:
