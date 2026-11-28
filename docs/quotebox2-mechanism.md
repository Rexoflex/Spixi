# Quote box 2 — the mechanism of the REPLY C miss on Windows (session `quotebox2`, 2026-11-27)

Item 1 of `claude/session-quotebox2-prompt.md` (mechanism first, #294). Base `redesign/frontend` @ `ae7b8303` (it holds
pull request 30, `c211d7de`). Finding: WALK #1968 (main chat, 2026-11-26; `claude/talk-rulings-2026-11-26.md` — not in
`DECISIONS.md` of the base), Windows (Debug build of `0eda93f5`, Ctrl+F5, no wipe), open by open:
- **open 1** (Q-W1): REPLY B jumps. C was not looked at.
- **open 2** (Q-W2, Q-W3): REPLY B's look was noted before the scroll (its value is not in the record this session read);
  REPLY C shows no sender line, no hand pointer, the right-click menu opens, clicks do nothing; REPLY D jumps.
- **open 3** (Q-W4): REPLY C again: no jump. Nothing else was checked.
- **the log** (Q-W5, the sheet's line L — patterns `Cannot open chat file`, `Cannot read from chat file`, `reply match`,
  `ixian:quotejump:`, `shell older insert`, `[FLAGS] histcs`, `[FLAGS] photo1b`, over every kept log, then
  `Select-Object -Last 200`): only `shell older insert` lines.
- Android: B, C, D jump.
By § 5 of `docs/quotebox-mechanism.md` C's look is cause 1: C# pushed C as its fallback box (`replyTo` ""). App
`file:line` below are of `ae7b8303`; Core `file:line` of Ixian-Core `097341a`.

## 0 · Verdict

*This § 0 is the state before the device run, kept as history. The device answer of 2026-11-28 (way (a), the data) is
§ 6 at the end of this file.*

**Not proven off the device. No fix is built** (the prompt: a fix only with a proven cause). What holds:

1. The match is pure and right: over the whole chat each of the four replies finds exactly its target (CSH
   `QuoteBox2Tests` E1, `WalkTools2SeedTests`). A fallback box for C needs C's load to hold NO usable candidate with C's
   excerpt, or the match to throw.
2. **Neither the other replies nor the walk's log exclude a read fault** (#46 r1 O2 MAJOR-1, r2 MAJOR-1). The other
   replies: open 1 holds only B, open 2 only D — whose target a SHORT read keeps (it keeps the OLDEST rows; § 3 E4) — and
   open 3 nothing. The log: line L keeps only the LAST 200 matching lines, and its output held no `[FLAGS] photo1b` line,
   which every start writes (`SpixiFlags.cs:243`, from `SpixiFlags.init()` after `Logging.start`, `App.xaml.cs:264`), nor
   the `[FLAGS] histcs` line of the first older page: the paste does not reach back to the start of the walked process,
   so the absence of `Cannot open chat file.`, `Cannot read from chat file.`, `reply match: the deeper read failed (…)`
   (`:2383`) and `reply match failed (…)` (`:2527`) proves nothing.
3. Left are all the ways that give a fallback box, and nothing off the device decides between them:
   - **a read fault:** the one deeper read came back empty (Core `Cannot open chat file.`; `docs/quotebox-mechanism.md`
     § 3.1), short (`Cannot read from chat file.`; § 3.3) or failed (`reply match: the deeper read failed`). The open's
     window read and the deeper read parse the SAME file in the same load (Core `Friend.cs:910-913`, `readMessagesFile`
     always parses the whole file); a short or throwing read of the one-file chat would also cut the open's own window to
     its OLDEST rows, and B was on screen at the bottom in opens 1 and 2 — so a short or failed read fits the record only
     with a second chat file or a transient error (#46 r5 MINOR-1). Core's `Cannot …` line, not `deep`, tells it from (a);
   - **the match threw** for C (`reply match failed`);
   - **(a) the data:** row 515 ("QUOTE TARGET C — the green door opens at nine.") is not in the stored chat on the
     Windows PC, or not as the seed wrote it (its text or its time). One Core path known to drop stored rows is
     the same-second write boundary that `ArrivalGuard` (4) states as left open: Core's write drops every stored row with
     `receivedTimestamp` ≥ the written list's first one (Core `LocalStorage.cs:696`), the seed writes its 1000 rows within
     seconds (`receivedTimestamp` = whole seconds at the add, Core `FriendMessage.cs:81`; the guard orders by it,
     `CoreMessageWriter.cs:18`), and a window whose head run does not fit keeps its head inside a second (`:5838`,
     `ArrivalGuard.cs:338-362`). It needs a WRITE of the chat while Core's list starts inside such a run above row 515.
     A second Core path loses rows for good: a write that fails inside its try (`Cannot write to chat file.`, Core
     `LocalStorage.cs:755`) still replaces the stored file with a temp file whose row count is larger than the rows
     written (`:764-771`); every later read of it is short, and the next write rebuilds the file from that short read
     (`:694-698`; #46 r3 NIT-1).
     Looked at on the load path and found to write nothing for these rows: `beforeReread`'s flush (`:5810`, only a
     channel marked dirty), `healLastMessage` (`:5858`, only when the saved excerpt's row is missing), `insertMessage`'s
     read-status write (`:7294-7300`; the seed rows are read and sent, Core `FriendList.cs:330-339`). So (a) is a
     possibility, not a finding. A second read that differs from the first (a reset, `resetReplyDeep` `:1816`, then a new
     read) needs the stored data to change between the two reads: the class of (a).
   - **(c) a path with no read:** C's row was pushed (or pushed again with `updateMessage`, `:7721`) with an index that
     lacked the read — the live index at a moment the cache was empty (`:2346-2347`; a UI-thread load never reads,
     `:2372-2375`).
4. So the build is the prompt's other branch: ONE developer-build line at every reply match (`[QB2] reply match …`,
   § 4) that tells these ways apart on the next Windows walk, a log line L that copies every matching line (no tail cut)
   and must show the start line of the walked process, a walk row that looks for row 515 in the chat itself, a copy of
   the data folder BEFORE the first start (the stored chat is the evidence of (a)), and a fresh seed.

## 1 · The four replies (`Spixi/Utils/SDevSeedPlan.cs:835-849`; row = 1000 − depth = j + 1)

| Reply | Id (the first 16 bytes, hex; CSH asserts them) | Depth (row) | Its target: depth (row) | Pushed with |
|---|---|---|---|---|
| A | `aad44f7b9711a1188892ba8482508f62` | 0 (1000) | 320 (680) | the open |
| B | `93522be02a634dc9799ab7fdcbad48a6` | 1 (999) | 415 (585) | the open |
| **C** | `5a68a0b3fbf20abcb919b3554f8f2a3e` | **170 (830)** | **485 (515)** | the third older page (`FirstOlderPage50` ON) |
| D | `d1d600aeb1c540b1fdf1abc7c3af2649` | 230 (770) | 640 (360) | the fourth older page |

The candidates of a load = its WHOLE read window after the same-second head trim (`:5852`; not only the rows it pushes) + the cached deeper read
(`buildReplyIndex(readChannel, messages)`, `:5976`, `:2467-2502`; the live copy wins). A window is `want + 1` rows unless
Core's head run grows it (`:5822-5846`): the cap `window > 4 × want` is tested BEFORE the growth, so the last step can
double it (up to about 8 × want; `LOAD_WINDOW_MAX_PASSES` = 8, `:5596`). With the seed's same-second runs the open can
reach about 400 rows (B's target at depth 415 still needs the read) and the second to fourth older pages can reach depth
485 and 640: D's match may not have used the read at all. Each window depends on the stored data; the line's `idx` tells it.

## 2 · Against the record

| Way | The line it leaves | Against the record |
|---|---|---|
| an empty read | Core `Cannot open chat file.` | not excluded (L's output did not reach the process start) |
| a failed read | `reply match: the deeper read failed (…)` | not excluded |
| a short read, oldest kept | Core `Cannot read from chat file.` | not excluded; fits open 2 (D matched) only with a second chat file or a transient error (§ 0.3) |
| the match throws for C | `reply match failed (…)` | not excluded |
| (a) row 515 not stored as seeded | nothing | fits |
| (c) C pushed with no read in its index | nothing | fits |

Android: the same plan, seeded on the phone; it matches C. Under (a) the phone's stored chat holds row 515; under (c) the
phone's timing does not hit the empty cache. Neither is measured.

## 3 · The evidence table (CSH `QuoteBox2Tests`, over `SDevSeedPlan.quotePlan(56)`)

| Case | Index = | A | B | C | D |
|---|---|---|---|---|---|
| E1 | the whole chat | found | found | found | found |
| E2 | the whole chat without row 515 | found | found | **not found, cand 0** | found |
| E3 | the open's window of 51, no read | not found | not found | — | — |
| E4 | the open's window + a SHORT read (the oldest 500 rows) | not found | not found | not found | found |
| E5 | the whole chat, row 515's time moved past C's + 300 s | found | found | **not found, cand 1** | found |

E2 and E5 give the walk's picture with B found; E4 gives open 2's record too (C misses, D matches) and is not excluded
(§ 0.2). The windows of E3 and E4 are the open's 51 rows; a grown window (§ 1) holds more. `cand` is what the new
line prints, so the walk tells E2 (cand=0) from E5 (cand=1).

## 4 · The developer-build line (inside `#if SPIXI_DEV_COEXIST`, R5; packet P112)

`[QB2] reply match reply=<id hex> found=<0|1> cand=<n> deep=<n|-1> idx=<n> via=<load|live> ui=<0|1>` — once per match of
a reply-shaped row (`SingleChatPage.tryReplyMatch` in `SingleChatPage.ReplyMatch.cs`, called by `matchReply`), both outcomes, also for every `updateMessage` of such a row. What each
field is (#46 r1 O1 MINOR-1, r3 MINOR-1 / -2):
- `found` — the match found a target (`ReplyQuote.tryMatch`, the same call as the base's).
- `cand` — the candidates under the reply line's excerpt, no time filter.
- `idx` — the candidates of the index the match used: its window's rows after the head trim plus the read's rows the window
  lacks, counting only rows with an id and an excerpt (`ReplyQuote.cs:185-196`; a deleted or blanked row, a request row or a
  file header that does not parse has none).
- `deep` — the rows of the cached deeper read AT THE MOMENT OF THE LINE, every row counted: `-1` = nothing cached (no read
  made for this document, or the read FAILED — `prefetchReplyDeep` caches null after its catch, `:2383-2389`, with the line
  `reply match: the deeper read failed`); `0` = an EMPTY read (Core's `Cannot open chat file.` path returns an empty list).
  A reset (`:1816`) or another load's read can change it between the index and the line.
- `via` — `load` (a load's index) or `live` (an index built for this push); `ui` — the UI thread (a UI-thread load never
  reads, `:2372-2375`).
Expected for the seed as written: `deep=1000`, `cand=1` and `found=1` for each reply. The ids are in § 1.

What each way is expected to leave (reasoning, not a decision rule — two rounds in a row found a reading table here that
misread a case, so the main chat reads the lines with the fields above; the lines of C in an open are read in time order,
beside B's lines of the same open):

| Way | C's lines | B's lines, same open | Other lines in L's output |
|---|---|---|---|
| an empty read | `found=0 cand=0 deep=0` | `found=0` (B's target lies past the open's window) | Core `Cannot open chat file.` |
| a failed read | `found=0 cand=0 deep=-1` | `found=0`, `deep=-1` | `reply match: the deeper read failed` |
| a short read (oldest rows kept) | `found=0 cand=0`, `0 < deep < 1000` | `found=0` | Core `Cannot read from chat file.` |
| the match throws for C | no `[QB2]` line with C's id at that push | — | `reply match failed` |
| (a) row 515 missing / not as seeded | `found=0`; `cand=0` (missing or text differs; `deep` = 1000 minus the rows lost — a same-second drop loses the older part of a run, possibly many rows) or `cand=1` (its time differs) | `found=1`, unless B's target (row 585) was lost in the same run | none needed; Core `Cannot write to chat file.` / `Cannot read from chat file.` if a broken write lost it |
| (c) C pushed with no read in its index | `found=0 cand=0`, `idx` about the window's rows; `deep=-1` (no read yet) or a full `deep` (a read landed later) | `found=1` unless the open's load ran on the UI thread (`ui=1`, then `found=0` too) | no `reply match:` line |
| the push was right, the page lost it | the last line before the observation `found=1` | — | `shell older insert … mode=` lines near the click (`docs/quotebox-mechanism.md` § 5) |
| the dev line itself threw | no `[QB2]` line, and no `reply match failed` | — | — |

## 5 · Limits
- Nothing here ran on Windows; the causes are code paths. The Windows data folder and the full log of the walk were not
  available to this session (the walk record names only `shell older insert` lines).
- The same-second hazard of (a) is Core's (★ Ixian-Core stays BE-only); a fix of it, if the line points there, is a
  question for the main chat, not this batch.
- The line costs one log line per reply-shaped row per push in a developer build; store builds compile none of it.

## 6 · The device answer (2026-11-28)

Walk of train 2 on Windows (build `work/train2` @ `d0d09012`, Debug, Ctrl+F5 after a wipe), read by the main chat:
#1976 (`claude/talk-rulings-2026-11-28.md`), #1977 (`claude/talk-rulings-2026-11-28-b.md`). The fields of the `[QB2]`
lines only; no raw log line is copied here.

- **Way (a), the data.** The old stored chat Seed 57 held **951 rows, not 1000** (`deep=951` in every line of that
  process). **Rows 509–557 are missing** (49 rows; the screen shows row 508 and then row 558, Q2-W6), and row 515, the
  target of REPLY C, is one of them. REPLY C's lines read **`found=0 cand=0`** with that full read (`deep=951`,
  `idx=951`): case E2 of § 3. A, B and D read `found=1 cand=1`.
- No read fault and no throwing match: the log file holds no `Cannot open chat file`, `Cannot read from chat file`,
  `Cannot write to chat file`, `reply match: the deeper read failed` or `reply match failed` line.
- **The fresh seed** (Q2-S1): `deep=1000`; REPLY C reads **`found=1`** (`cand=1`, `idx=1000`) and jumps (Q2-S2). On
  Android it jumps too (A-1, #1977 (0)).
- So the quote box code is right, and a fallback box for a reply whose target is not stored is the right behaviour: no
  quote box fix is owed; the quote box item closes with the merge of train 2 (#1977 (3)).
- **Open: which write dropped the 49 rows** (item `n-20261128-seed57-stored-rows-lost`). The kept logs start
  2026-11-27 18:26 and hold no Core write error, so the loss is older than that.
- **A lead, a hypothesis and not proven (#1976 (4)):** in the 11:26 process the seed tool ran **three times at once**
  (its "1000 messages written" and "Seeded heavy" lines three times, from three threads, in the same minute; about 80
  "image message … skipped" warnings in the image chats). Three writers on the same chat files in the same seconds fit
  the Core same-second write boundary of § 0.3 (a). Damir pressed "Seed 50 · heavy" twice (#1977 (2)); why two presses
  gave three runs is not known. The fix line of #1977 (2): one seed run at a time and a "seeding…" text (the next
  small-fix batch); the Core boundary (`LocalStorage.cs:696`) goes into the BE ask as one line.
