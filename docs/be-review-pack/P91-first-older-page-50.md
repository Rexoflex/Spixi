# P91 · THE FIRST OLDER PAGE OF CHAT HISTORY HOLDS 50 ROWS, NOT 100 (batch histcs, HV-5)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (one arithmetic step; the Core cache rule it guarded is proven not to bite) | none | none; 1 int pref | built · ⚠ uncompiled | 3 min |

**Look here first:** `HistoryOlderRules.nextShow` (`Spixi/Utils/SpixiFlags.cs`, the histcs block) and its one caller in
`SingleChatPage.loadMoreIn()`.

**DECISIONS:** #354 (D-18) · #907 · #1742 · this batch: #1862.

## What changed and why
- **Before:** `onLoadMore()` grows the window by `Config.messagesToLoad` (50) and steps over exactly 100 (50 → 150), so the
  first older page holds 100 rows (page 1's insert on the phone: 67 ms against 37 ms for 50 rows,
  `claude/device-numbers-2026-11-22-photo1b.md`).
- **The D-18 check (#354):** Core `Streaming/Friends/Friend.cs:899` `getMessages(channel, msg_count = 100)` reads storage
  only when the channel is uncached or `msg_count != 100` (`:910`) — a request of exactly 100 returns the previous window.
  `loadMessages()` never sends `messagesToShow` to Core: it sends `window = want + 1` (#907), and the read loop steps over
  100 on every pass (`if (window == 100) window++;`) before `friend.getMessages(readChannel, window)`; the window only
  grows. So no read asks for 100, for any `want`. The step in `onLoadMore` predates #907; today it only doubles page 1.
- **Now (switch `FirstOlderPage50`, pref `flagFirstOlderPage50`, absent = ON, a stored 0 acts only in dev mode):**
  `nextShow(show, 50, true)` = `show + 50` (50 → 100 → 150). OFF = the old arithmetic exactly (csh: equal to the base
  formula for every show 0…400 and step 1…60).
- With P-28 OFF and HV-5 ON the load runs inline on the UI thread as before; only the window is new.

## Proof
csh `HistcsTests.next_show_*`, `uses_new_path_table`, `both_off_*`. On the phone: page 1's `[P1] chat older read …
window=101` (OFF: `window=151`), and the pill stays while older history remains.
