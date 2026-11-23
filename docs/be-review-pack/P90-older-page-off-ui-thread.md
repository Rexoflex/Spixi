# P90 · AN OLDER PAGE OF CHAT HISTORY IS READ AND BUILT ON A POOL THREAD, NOT THE UI THREAD (batch histcs, P-28)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| MEDIUM (threading of the chat page; a page that would land in the wrong state is dropped) | none: the chat history path only; nothing signed, stored or sent | none: the same two pushes `addMessages(json,"prepend")` + `messagesDone(show_more)`, the same verb `ixian:loadmore`; 1 int pref | built · ⚠ uncompiled (CI compiles Windows) | 8 min |

**Look here first:** `SingleChatPage.loadMoreIn()` (directly after `onLoadMore()`) and `olderMayPush()`
(`Spixi/Pages/Chat/SingleChatPage.xaml.cs`); `OlderPushGate` at the end of `Spixi/Utils/SpixiFlags.cs`.

**DECISIONS:** #1742 (Damir, History 1, a main-chat row) · #294 · #1312 · #1478 · this batch: #1860, #1861.
**Mechanisms:** `docs/histcs-mechanisms.md` (the fields, their threads, the lock order, every case).

## What changed and why
- **Before:** `ixian:loadmore` (a WebView navigation, the UI thread) → `onLoadMore()` → `loadMessages()` synchronously: the P0
  write guard, the disk read (Core re-reads the whole messages file, CORE-17), the row build and the JSON ran on the UI
  thread — on the phone ≤ ~106 ms of UI-thread stall per page (`claude/history-research-2026-11-18.md` § 3), during a fling.
  The chat OPEN already runs the same `loadMessages()` on `Task.Run`.
- **Now (switch `LoadMoreOffUi`, pref `flagLoadMoreOffUi`, absent = ON, a stored 0 acts only in dev mode):** the UI thread
  takes the busy guard (`OlderBusy`: one older page at a time; busy → nothing). The guard is OWNER-aware: each page has its
  own token, and a leave names it, so a late leave of an old page never frees a newer one. The guard is freed at the
  page's pushes (`olderPushed`), not at the end of its media tail. The UI thread grows the window and records what the page
  must still match: the document (`thumbDoc`), the chat, the channel, the anchor reference and a ticket of the push gate.
  `Task.Run` binds the job to its pool thread and calls `loadMessages()`, which takes the job only on that thread (it IS
  the prepend).
- **Early drops, before the build:** `olderClosedEarly` (chat closed, or a channel that is not the job's, also the load's own
  read channel) and `olderFallbackDrop` (the page would take the full re-flush fallback while another load replaced the
  anchor) end the page before the read flags, receipts, unread zero and `fileRowsShown` wipe. Each frees the guard.
- **At the push site** the job enters the page's gate (`Monitor`) and asks `HistoryOlderRules.decide`: dropped when the page
  was disposed / reloaded into another document / is another chat, the channel changed, any other load started since the
  request or is still before its pushes, or the anchor changed. Kept → the anchor write and the pushes happen inside
  `lock (messages)` AND the gate; then the gate goes back; the media jobs as before. The page's file-row ids
  (`deferredFileRows`) enter `fileRowsShown` only at the keep, so a dropped page records no row. The task's `finally`
  releases the gate if still held, clears an untaken job, pushes the zeroed chat row of a dropped full flush, frees the
  guard; a throw is logged by TYPE only.
- **The jump rule:** a page pushes only the "show in chat" jump its own load saw at its start (`jumpSeen`); a jump armed
  later by a UI-thread widening load stays armed for that load. Every take of the armed jump is atomic.
- Every OTHER `loadMessages()` (the open, reloads, a channel switch, a history wipe, a widening jump) counts itself at the
  gate (`beginOther`): so another load's `clearMessages` comes either wholly after the older page's pushes (it re-draws
  everything) or the page drops.
- **The delivery-order rule (round 3):** the gate orders the C# CALLS, not the DELIVERIES. A pool thread's pushes are
  POSTED to the main thread; a load on the main thread (e.g. "Delete history" → `SContacts.removeHistory` →
  `loadMessages()`) sends INLINE and would have been delivered FIRST, so the deleted page could be drawn again. Now a kept
  page counts itself in `olderPostsPending` under the gate before its pushes and posts its decrement behind them
  (`olderPostMarker`); a main-thread load (and a main-thread `pushPendingJump`) that sees the counter above zero re-runs
  from a post queued behind the page (`olderDeferBehindPage` / `olderPostBehind`). A deferred load is a full re-flush
  (correct; a prepend request is lost, the position may move). One new log line: the type of an exception of such a re-run.
  Round 4: a peer's delete / edit that lands while a page is in flight (`deleteMessage` / `updateMessage` on the network thread) is also queued as a REPEAT (`olderLatePushes`, while P-28 is ON and the guard is held) and sent by the page right after its own pushes (`olderDrainLate`), so it is posted BEHIND the page's rows and the delete / new text has the last word; the marker is now posted under the gate, before its exit. One more type-only warn line (P92).
  The order rests on one queue (Android: the main Looper; Windows / iOS: `MainThread.BeginInvokeOnMainThread` from a pool
  thread) — not proven on a device.
- Lock order: Core's list lock → the gate; nothing under the gate waits for the UI thread (the page's pushes run on a pool
  thread, where `evaluateJavascript` posts and returns). The new counter and the marker take no lock.
- **Switch OFF = `onLoadMore()`, the base method, byte for byte** (pinned by SHA-256), and every insertion in
  `loadMessages()` is inert (no job, no scope, no gate).

## Recorded, not changed
- A delete / edit from the network thread against a page in flight: recorded in round 3 as inherited, which was WRONG (at the
  base a load-more pushed inline on the UI thread, so its rows always came before a queued delete; P-28 extends the open's
  pool-load race to every load-more). Fixed in round 4 by the repeats above; what remains: an edit repeated while a guard
  is still held goes at the next drain, a repeat for a row the shell does not hold is a no-op. The walk cannot force it.
- A dropped page sends the shell no answer (the protocol is frozen): a drop is caused by a close, or by another load that
  answers with its own `messagesDone`; else the shell's 8 s timeout shows the retry pill.
- "Dropped → nothing pushed" has exceptions. A drop at the push site leaves the build's side effects: `setAvatarFor`
  (sent directly by `insertMessage`) and the read flags, receipts and unread zero of a close DURING the build (mechanisms § 5).
  A close BEFORE the build stops all of them.
- A page that fell back to the full re-flush (its anchor not in the window — the base fallback) and then drops has already
  run the base fallback's side effects before the push site (the unread zero, the reaction-flag clear, `fileRowsShown`
  emptied); mechanisms § 5.

## Open after the review (recorded, round 5)
A peer's edit / receipt / reaction on a row of the page in flight can land before the page's rows (the first push creates the row at
the bottom; a reaction is lost) — `docs/histcs-mechanisms.md` § "Round 5 records" R5-1 … R5-10; proposed follow-up #1868.

## Proof
csh `HistcsTests` (43): the busy guard (a 12-thread race), `schedule` (normal, the body / after / scheduler throws, a real
`Task.Run`), `decide` (each field, all 128 combinations), the gate with REAL threads (a load begun after the ticket, in
flight, before the ticket; a held gate blocks `beginOther` and its Dispose; double Dispose; OFF counts nothing), both
switches OFF = the base. Pins `scripts/pins-histcs/a-path.mjs` (the branch, `onLoadMore` = base, the order of
`loadMoreIn`, the members, the insertions, the name table, the rest of the file = base) and `b-lines.mjs`. Walk rows
W-1 … W-5 / A-1 … A-5 (`docs/walk-histcs.md`). Re-based: `pins-fixb1/g-sparekeep` (FLAGSFILE hash), `pins-photo1a/a-open`
(a2 count; ★ r4 a8 `deleteOnce`: admits the one repeat statement of `deleteMessage`), `pins-s4/chat` (A5 `afterDone`).
