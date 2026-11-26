# Quote box — mechanism (session `quotebox`, 2026-11-25)

Item 1 of `claude/session-quotebox-prompt.md` (mechanism first, #294). Base `redesign/frontend` @ `0eda93f5`. Finding:
#1961 (2) / finding 1 of the walk of 2026-11-25 (Windows, Ctrl+F5; the main chat's record
`claude/talk-rulings-2026-11-25-walk.md` — the row is not in `DECISIONS.md` of the base): in chat "Seed 57", the quote box
of my own message "REPLY C — nine is fine for the green door." does not react to a click: no toast, no jump. REPLY A and
REPLY D jump on Windows; REPLY C jumps on Android. `chat.html:N` = `src/shells/chat.html` (the source, not the built file);
every other claim cites `file:line` of the base or a measured run.

## 0 · Verdict

**Not reproduced off the device. No fix is built** (the prompt: a fix only with a proven cause). In Chromium, with the
built shell, real mouse events at desktop widths, older pages and a fresh document per reply, a click on the quote box of
every one of the four replies sends `ixian:quotejump:<id>` and lands on its target when C# answers (§ 2). Three inputs
make the page show "no reaction, no toast" (§ 2 runs 3, 4, 7, 8, 9): (a) the row came as C#'s fallback box (`replyTo` "";
no tap at all); (b) the jump was sent, C# answered nothing, and an older page (or any `clearMessages`) landed within the
2 s wait, which cancels the toast; (c) an older page that repaints the WHOLE log landed inside the mouse press, so the
pressed box was replaced and the click went nowhere — with the mouse only; a touch keeps its tap (#46 r2 O MAJOR-1). So
four causes stay. The walk rows (`docs/walk-quotebox.md`) RECORD what each leaves behind and decide none: two rounds in a
row (#46 r3, r4) found a picture that a decision table in the sheet misread, so by rule 9 of the loop the table is parked
and § 5 keeps the expected signatures as reasoning for the main chat. The list is not closed.

| | Cause | For | Against |
|---|---|---|---|
| **1** | **C# drew REPLY C as its fallback box**: the ONE deeper read of the document came back empty or short, so no candidate held "QUOTE TARGET C" | the only push that gives a box with no tap (§ 2 run 3); for Seed 57 the deeper read happens at the OPEN and serves the whole document (§ 3); on Windows Core's chat-file read returns NOTHING for a file it cannot open (§ 3) | the same open's window read of the same file succeeded just before (a lock must be short); then REPLY A and B of that open are fallback boxes too — the walk record does not say how they looked in the second open; in the first open of the walk A jumped |
| **2** | **The box was matched and sent the jump, C# dropped it silently, and an older page cancelled the toast** | `onQuoteJump` and the later steps of the jump have silent returns (§ 3); the lazy loader asks for the next page within one screen of the top, where the reader stands after paging up to C (§ 3); harness run 7 shows exactly "no jump, no toast" | why C# would drop it on Windows only is the same open question as cause 1 (Core's read in `onQuoteJump` is the same file read) |
| **3** | **The click does not reach a matched box on Windows**: (a) a native layer over the right side of the pane, or (b) the WebView2 input path | REPLY C is the only SENT (right-side) reply the Windows walk clicked; A and D are received (left side) | Chromium with the mouse at three sizes and three scales sends the jump for the sent replies B and C (§ 2); no native element of `HomePage.xaml` lies over the chat column; the stages that code adds start hidden and input-transparent (their later life was not traced, § 4) |
| **4** | **An older page repainted the whole log during the mouse press** (`renderLogNow` replaces every row, `chat.html:5891`, `:5986`): the box under the pressed mouse is gone at the release | shown in Chromium: matched box, nothing sent, no toast, menu opens; the mouse only — the same race by touch jumps (§ 2 run 8), so Windows and not Android; it hits a reply reached while pages land (C), not one at the open (A) | a page paints in full only when its insert path is not taken: not armed on a log that is not clean (`chat.html:7324`), refused by one of `renderOlderInsert`'s tests (`:6122-6211`), or the cap `olderInsert` off (switch `HistoryInsertOnly`, a stored 0 in dev mode); with the insert path the same race jumps (§ 2 run 8); a race seldom repeats on every click |

## 1 · The four replies of Seed 57 (`Spixi/Utils/SDevSeedPlan.cs:835-849`; row number = 1000 − depth)

| Reply | Depth · row | Sent by | Target depth · row · sent by | Reached | The quote's sender line (matched) |
|---|---|---|---|---|---|
| A | 0 · 1000 | the peer | 320 · 680 · me | the open (window 51) | "You" |
| B | 1 · 999 | **me** | 415 · 585 · the peer | the open | "Seed 57 Mojca Vrabec" (the header name) |
| **C** | **170 · 830** | **me** | **485 · 515 · the peer** | the third older page (`FirstOlderPage50` ON: 50, 100, 150, 200) | "Seed 57 Mojca Vrabec" |
| D | 230 · 770 | the peer | 640 · 360 · me | the fourth older page | "You" |

What differs for C: it is sent by me (the right side; B too), its target is the peer's (B too), it arrives with an older
page (D too); the ids are one shape for all (16 bytes, `SDevSeedPlan.cs:921-927`). B was not walked on Windows
(`docs/walk-histcs.md` W-5 names A, C, D). The page numbers hold with `firstpage50=1` (the default; a stored 0 acts only
in dev mode, `Spixi/Utils/SpixiFlags.cs:466-477`).

## 2 · The page script in Chromium

Harness `scripts/pins-quotebox/harness-seed57.mjs` (by hand; not in smoke): the BUILT `chat.html` of the base, headless
Chromium (Playwright), a Seed-57 history (1000 text rows, the four replies and targets with the plan's times), and a C#
stand-in that answers the page's own sends (`ixian:loadmore` → the next 50 older rows as `addMessages(json, "prepend")` +
`messagesDone`; `ixian:quotejump:<id>` → a widening prepend to the target + `jumpToMessage`). Each row is pushed in the
shape of `SingleChatPage.insertMessage` (`SingleChatPage.xaml.cs:7160-7186`: arg 13 `replyTo` = the target id when C#
matched, "" when not; args 15 / 16 the quote's name and text). The reader's path: the wheel over the log until the row
exists, the row in view, the mouse onto the quote box, a click at its centre; the sends are read from the navigation
requests (CDP `Page.frameRequestedNavigation`); "landed" = the target carries the jump pulse (`data-mention-pulse`,
`chat.html:2484`) about 1.2 s after the click; the toast is read about 2.6 s after it (the wait is 2 s, `chat.html:2332`).

| Run | Set-up | A | B | C | D |
|---|---|---|---|---|---|
| 1 | desktop 1280 × 800, dpr 1, one document | jump | jump | jump | jump |
| 2 | desktop, a fresh document before each reply (the walk's "close and open again"), row at the top / centre; also 860 × 980 dpr 1.25 and 700 × 900 dpr 1.5 | jump | jump | jump | jump (one case placed under the top bar → `ixian:details`: the harness's placement, not a reader's) |
| 3 | C# reports **C as not matched** (`--match ABD`: `replyTo` "", `quoteName` "", the line's text) | jump | jump | **a `<div>`, no sender line, cursor `auto`, nothing sent, no toast** | jump |
| 4 | one full-form `updateMessage` for C with `replyTo` "" after its row is on screen (`--update C`) | jump | jump | **as run 3** | jump |
| 5 | phone 412 × 915, touch, fresh documents | jump | jump | jump | jump |
| 6 | a RIGHT-click on each box (`--context`), matched and `--match ABD` | menu opens | menu opens | menu opens (both kinds of box) | menu opens |
| 7 | C's jump left **unanswered** (`--drop C`) · and an older page lands ~700 ms after the click (`--drop C --drop-prepend`) | — | — | **the toast at 2 s** · **no jump, no toast** | — |
| 8 | an older page lands INSIDE C's press (`--press-prepend C`: down, the page, ~110 ms, up): with the caps of a default build · without `olderInsert` (`--caps reply,edit,voice,media,fadeBand`: every page repaints in full) · the same by touch (`--mode phone`) | — | — | jump · **matched box, nothing sent, no toast** · jump | — |
| 9 | C# sends the widened rows for C's jump but NOT `jumpToMessage` (`--nojump C`), then a SECOND click on the box | — | — | **no jump, no toast**, the target row loaded · the second click jumps inside the page (`chat.html:2324`; it sends only the lazy loader's `ixian:loadmore`) | — |

"jump" = `ixian:quotejump:<target id>` sent, the target loaded and pulsed, no toast. A matched box is a `<button>` with
cursor `pointer` (`src/styles/components/message-bubble.css:309`) and a sender line; the fallback box is a `<div>` with no sender line
(`message-bubble.js:431-437` the element, `:442-448` the sender line; `chat.html:2312-2314` an empty `quoteName` → no
sender; `chat.html:2318-2327` `quoteTapFor` gives no tap for `replyTo` ""). The toast's wait is cancelled by ANY
`clearMessages` (`chat.html:7244`) and by ANY prepend (`chat.html:7327`), not only by C#'s `jumpToMessage`. For runs 3 and
4 "no toast" also follows from the code: nothing is sent, so nothing waits.

## 3 · The C# side

- **The match** is pure and the same on every platform (`Spixi/Utils/ReplyQuote.cs:452-544`): the line "> QUOTE TARGET C —
  …" has no ": ", so only the no-name probe runs; any candidate with that excerpt and a time ≤ the reply's + 300 s wins
  (`:59`). CSH proves that all four replies find exactly their targets over the whole chat, and NOT over the newest 100
  rows (`scripts/csh/WalkTools2SeedTests.cs:154-192`, `:185-188`).
- **The candidates** of a load = the rows of its window + the ONE deeper read of `DeepSearchMax` = 1000 rows per document
  (`SingleChatPage.xaml.cs:2363-2390`, `:2467-2502`, `:5902-5905`, `:5974-5977`). For Seed 57 that read happens at the
  OPEN: the open's first load runs on a pool thread (`:2102`, `:2147`) and its 51-row window holds A and B, which are
  quote-shaped (`:5832`). A UI-thread load skips the read without a record (`:2372-2375`), and a later `updateMessage`
  re-match uses the cached read (`:2517` → `:2471`), so neither can empty it alone: **cause 1 needs the open's read to come
  back empty, short or failed**, and then it lasts for the whole document (no retry, `:2385-2389`). Two ways:
  1. Core's `readMessagesFile` opens each file with `new FileStream(path, FileMode.Open)` — read-WRITE access, share Read —
     and on any exception logs `Cannot open chat file. {0}` and returns an EMPTY list (Ixian-Core
     `Streaming/Storage/LocalStorage.cs:494-503`); `readLastMessages` goes on (`:584`). On Windows such an open fails while
     another process holds the file without write sharing (the search indexer, a backup or sync tool, a scanner that does not share); Android has no such
     lock. Seed 57 is expected to be ONE file (1000 rows ≤ `messagesPerFile` = 1000, `:62`; not shown on the device).
  2. A read that throws: `reply match: the deeper read failed (<Type>)` (`SingleChatPage.xaml.cs:2383`), cached as no read.
  3. A read error inside a file: Core logs `Cannot read from chat file. {0}` and keeps the rows read so far
     (`LocalStorage.cs:522-530`) — a SHORT read. Core writes a file oldest first (`receivedTimestamp` order,
     `LocalStorage.cs:675`, `:732`; the seed adds the rows oldest first), so the rows kept are the OLDEST: a short read
     that loses C's target (row 515) also loses B's (585) and A's (680); only D's (360) can survive (#46 r5 O MINOR-1).
- **Cause 2 — the jump's silent returns.** `onQuoteJump` (`:2756-2809`) returns with no line when an earlier jump's read
  still runs (`:2773-2776`) and when its own read of the newest `SharedItems.JumpCap` rows misses the id (`:2781-2786`) —
  the same Core file read as above. Later on the same path more outcomes are silent: `requestJump` only arms the jump for
  a page that is not loaded (`:5659`), `applyPendingJumpWindow` drops an expired or foreign jump (`:5674-5682`),
  `pushPendingJump` pushes nothing for a jump another load took (`:5727-5733`); and a widened answer reaches the page as a
  PREPEND (`:5704-5705`), which itself cancels the toast — a lost `jumpToMessage` after the rows arrived gives "no jump, no
  toast" even with the reader still; the target row is then loaded, so the NEXT click jumps inside the page (§ 2 run 9).
  Call a drop before any rows came 2a (`onQuoteJump`, `requestJump`, `applyPendingJumpWindow`; the page toasts after 2 s
  unless a page lands) and the lost `jumpToMessage` after the rows came 2b (no toast when the rows came within 2 s; a
  later click jumps). A widening that comes later than 2 s gives "a toast, then no jump" for 2b too (#46 r4 O MAJOR-1).
- **(b) covers C#'s own answer too:** the widened rows of a jump arrive as a prepend, so a lost `jumpToMessage` after them
  (2b, § 2 run 9) is input (b) with C#'s own page.
- **Not a sign by itself:** after a mouse click the quote button keeps focus; when the widened rows land, the row that
  holds it is re-quoted and the focus test refuses the insert path (`chat.html:6180-6187`, `:6208-6210`), so every
  answered jump paints the log in full (`[P1] shell older insert rows=<the widened rows> mode=full`, #46 r3 O MAJOR-2). The page then waits 2 s for `jumpToMessage`; the lazy loader asks for the next older
  page when the reader is within one screen of the top and nothing is in flight (`chat.html:6745-6750`), and that page's
  prepend cancels the wait (`chat.html:7327`). After paging up to REPLY C (it arrives with the third page, near the top)
  the next request is likely in flight when the reader clicks.
- **Cause 4 — the page side.** The page has one platform difference of its own that fits: a mouse click is lost when the
  pressed node is replaced before the release, a touch tap is not (§ 2 run 8). Core's file read is the one C# difference
  between Windows and Android; it can explain cause 1 and cause 2 alike. The evidence of both is in the log: Core's
  `Cannot open chat file.` line, and in a developer build the page's `[P1] shell older insert rows= mode=<insert|full>` line
  per older page (`chat.html:6465`) with the `[FLAGS] photo1b … olderinsert=<0|1>` line (`Spixi/Utils/SpixiFlags.cs:195-199`).
  Spixi keeps about 5 earlier logs (`Logging.setOptions(Config.maxLogSize, Config.maxLogCount, false)`, `Spixi/App.xaml.cs:263`;
  `maxLogCount = 5`, `Spixi/Meta/Config.cs:105`); every start rolls the log, so they are the logs of about the last 5
  starts, and the log of 2026-11-25 may be gone.

## 4 · Cause 3 in detail

On Windows the chat pane is a native WebView in `HomePage`'s `rightContent` (column 1, `Spixi/Pages/Home/HomePage.xaml:22`);
the two native boxes of the XAML sit on column 0's trailing edge (the pane divider, `:28`, `:33`). Code adds a stage to that
grid: the spare chat page's stage (`Spixi/Utils/SpixiContentPage.cs:1937-1942`) and a load-then-present page's stage
(`:4064-4068`) start at opacity 0, input-transparent, placed in their column (`:1989`, `:2028-2043`). How each stage leaves or turns
opaque after its present was NOT traced in this session: that is where 3a would live. No element was found over the right
side of the chat column; the cause stays open because the Windows walk clicked no other sent reply. A native layer over the pane would also take the hover: the
pointer would not turn to a hand (3a); an input-path fault inside WebView2 would leave the hover (3b).

## 5 · The signatures each cause is expected to leave (reasoning, not a measurement; for the main chat)

The walk records these; no single row decides a cause (rule 9, § 0). Match each log line to the nearest click time.

| What Damir records | 1 · fallback box | 2a · dropped before any rows | 2b · rows came, `jumpToMessage` lost | 4 · repaint in the press | 3a · layer over the pane | 3b · WebView2 input |
|---|---|---|---|---|---|---|
| The line "Seed 57 Mojca Vrabec" above REPLY C's quote | no | yes | yes | yes | yes | yes |
| The pointer over the box | not the hand (`auto`) | the hand | the hand | the hand | likely not the hand | the hand |
| A right-click on the box | the menu opens | opens | opens | opens | likely does NOT open | likely does NOT open |
| Clicks 5 s apart, each kept still 3 s | nothing | a toast after 2 s, each time | the first: no jump (a toast only if the rows took > 2 s); a later one jumps | most likely it jumps (no page in flight after 5 s still) | nothing | nothing |
| REPLY B of the same open | also a fallback box (an empty read, or a short read of the one file; D may still match) | the line, the hand | the line, the hand | the line, the hand | as C | as C |
| `ixian.log` near the click | `Cannot open chat file.`, `Cannot read from chat file.` or `reply match: …` near the OPEN | `Cannot open chat file.` near the click, or nothing | `shell older insert rows=<hundreds> mode=full` after the failed click, before the next | a `rows=50 … mode=full` page in the same second as a failed click, no larger line before the next click (a `mode=insert` page is not 4) | nothing | nothing |

Not a sign by itself: `mode=full` (every answered jump after a mouse click paints in full, § 3); a jump today (causes 2
and 4 can pass a still walk).

## 6 · Limits

- The harness's page has no `data-p1` and no `data-platform` (the built placeholders `*SL{SpixiP1}`, `*SL{SpixiPlatform}`
  stay unreplaced, `chat.html:21-22`), and its default caps leave out `photoTileLite` and `voiceWaveLite` (no effect on
  text rows).
- The harness is the shell of the base in Chromium; WebView2 is Chromium too, but the native host, its window and its
  input routing are not in the harness. The C# stand-in follows the push shapes of the base; the C# load, threads and
  Core's files did not run.
- The causes of § 3 are code paths, not observations; cause 4 is shown in Chromium only. The list is not closed (rounds 1
  and 2 of #46 each added a path): what fits none of them is written down as seen ("How the notes are read" in the sheet).
- The causes of § 3 were read in C#, not run. No Windows log of the walk of 2026-11-25 was available to this
  session (the walk record names the lines Damir sent; none is a `reply match` or `Cannot open chat file` line, and none
  of them was asked for).
