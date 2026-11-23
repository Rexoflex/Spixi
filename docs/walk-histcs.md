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
| W-5 The quote jump to an older message | The chat: **Seed 57 Mojca Vrabec** (the dev seed's quote chat: 1000 text rows, each plain row ends with "(row n)", n = 1 for the oldest). It is new and exists only from a build of `work/walktools2` (or of `redesign/frontend` once that branch is merged) — a `work/histcs` build has no Seed 57. If the chats list has no Seed 57, Account › About › the dev card › "Remove seeded contacts", then "Seed 50 · heavy". The card then shows the sentence of the seed run; it must end with "Quote chat (Seed 57): 1 added, 0 present (0 with the newest row, skipped), 1000 texts written in N ms." (without that sentence the build is the wrong one). Close and reopen About: the status line then ends with "1 of 1 quote chat (Seed 57).". In the chats list it sits below Seed 56 Maja Debeljak (its newest message is the oldest of the seed chats). (a) Open Seed 57. Do not scroll. The newest message (from Seed 57) shows "REPLY A — yes, I will be at the boat by noon." under a quote box "QUOTE TARGET A — the blue boat leaves at noon." Tap the quote box. (b) Close the chat and open it again. Scroll up through three older pages (with `firstpage50=1`; the second older page with `=0`) until you see my message "REPLY C — nine is fine for the green door." (between rows 829 and 831; with `firstpage50=1` it comes with the third older page). Tap its quote box "QUOTE TARGET C — the green door opens at nine." (c) Optional, the same with "REPLY D — I will buy the chain tomorrow." (from Seed 57, between rows 769 and 771: the third older page with `firstpage50=0`, the fourth with `=1`) and its quote "QUOTE TARGET D — the yellow bike needs a new chain." | (a) The chat jumps to my message "QUOTE TARGET A — the blue boat leaves at noon." (between rows 679 and 681) and it pulses. (b) It jumps to the message from Seed 57 "QUOTE TARGET C — the green door opens at nine." (between rows 514 and 516) and it pulses. (c) It lands on my message "QUOTE TARGET D — the yellow bike needs a new chain." (between rows 359 and 361). Each time the pages above and below the target are complete: the row numbers run on with no gap (only the QUOTE TARGET and REPLY rows carry no row number) and none twice. The toast "This message is further back. Scroll up to find it." may show on the A52 if the jump takes more than 2 seconds: the jump landing on the target = pass; the toast before it = write down "toast, then landed" as a timing note, not a fail. The toast with no jump at all = fail. |

## Part 2 · Android

| Row | Steps | Pass when |
|---|---|---|
| A-BUILD | Force-stop Spixi. Start it. Open Seed 05; fling up until the spinner shows once. Account › Developer › the log. | The log has `[FLAGS] histcs loadmoreoffui=1 firstpage50=1`, and (this dev build) `[P1] chat older read … window=101` for the first page. |
| A-1 Fast flings to the top, Seed 05 | As W-1 with FAST finger flings, at least five pages. | The fling does not stop or stutter when a page arrives; the row under the finger stays; no missing or double message at a seam; the date pill once. |
| A-2 Fast flings, Seed 56 | As W-2 with flings. | As A-1. |
| A-3 A new message while a page loads | As W-3 (send from the PC). | As W-3. |
| A-4 Leave while a page loads | As W-4 (the system back while the spinner shows). | As W-4. |
| A-5 The quote jump | As W-5, in Seed 57 Mojca Vrabec on the phone (the same set-up line, the same build of `work/walktools2` and the same "Quote chat (Seed 57): 1 added, …" check if it has no Seed 57): (a) tap the quote box of the newest message "REPLY A — …"; (b) open the chat again, fling up three older pages (with `firstpage50=1`; the second with `=0`) to my "REPLY C — nine is fine for the green door." and tap its quote box; (c) optional: "REPLY D — …". | As W-5: (a) lands on "QUOTE TARGET A — the blue boat leaves at noon.", (b) on "QUOTE TARGET C — the green door opens at nine.", (c) on "QUOTE TARGET D — the yellow bike needs a new chain."; each pulses; the rows above and below are complete. If the toast "This message is further back. Scroll up to find it." shows and then the jump lands: pass, write it down as a timing note; the toast with no jump = fail. |

## Apple phase (#1515)
Mac: W-1 … W-5; iPhone: A-1 … A-5 (on iPhone WebKit a `scrollTop` write during momentum is a known risk — A-1 watches it).
