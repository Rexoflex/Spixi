# Chat message transport — BE work order (batching + prepend)

**Status:** proposed, not started. **Owner:** BE engineer. **Blocks:** scroll-triggered chat
history; chat-entry latency; deletion of the shell's burst gate.
**Written:** 2026-07-30, during parity batch A preflight. Evidence is file:line at
`71634557`.

This is a **self-contained BE work order**. It is not part of the v1.0 security bundle
(`docs/security-review-for-be-engineer.md`) and carries no wallet/key/path risk — it changes how
already-authorised message data crosses an existing bridge, nothing else. Reviewed against the
"★ C# touches no risky parts" rule in `CLAUDE.md`: no signing, no key movement, no
WebView-supplied filesystem paths, no cross-pane JS bridge, no password-over-URL, no remote
auto-fetch. It is a pure transport change.

---

## 1. Why this exists

Damir's ask: *"how can we approach the lazy load in chats, so that we can show entire history by
scrolling rather than pressing a button — this should also help with quick entering the chat,
which would reduce the need for the delay we added to remove flickering."*

All three of those are the **same root cause**, and one change fixes them together.

### 1a. There is no prepend

`onLoadMore` does not add messages. It grows a window and re-flushes the whole thing:

```
SingleChatPage.xaml.cs:371-376   onLoadMore()  →  messagesToShow += Config.messagesToLoad  (100, Config.cs:57)
                                                →  loadMessages()
SingleChatPage.xaml.cs:1234-1300 loadMessages() →  sendUiCommand("clearMessages", show_more)
                                                →  foreach message: insertMessage(...) + updateReactions(...)
```

So every "load more" is a **full teardown and rebuild of the entire grown window**. Page 4 = ~400
rows destroyed and re-created. Cost across k pages is O(n²).

This is why the shell can only offer a **button**. Scroll-triggered infinite history on top of a
re-flush transport is *worse* than a button, not better: the user is mid-scroll when the content
is torn out from under them. A button makes the jump expected; a scroll trigger makes it feel like
the app lost the page.

### 1b. Every message is its own WebView round trip

`insertMessage` → `Utils.sendUiCommand` (`Utils/Utils.cs:100-128`) → `SpixiContentPage.sendMessage`
(`Utils/SpixiContentPage.cs:179-189`) → `evaluateJavascript` (`:150-164`), which does its **own**
`MainThread.BeginInvokeOnMainThread` + `EvaluateJavaScriptAsync` per call.

Opening a chat at the default window pushes **100+ separate main-thread marshals and WebView
evaluations**, plus a `updateReactions` push per message (`:1288`). That is the actual cost of
chat entry — not rendering, not layout. Marshalling.

### 1c. The flicker delay is a symptom of 1b

The shell cannot tell when that stream of individual calls has stopped, because there is no
end-of-batch signal on the loadmore path — `onChatScreenLoaded` is pushed only from `onLoad`
(`:588`), never after `onLoadMore`. So `src/shells/chat.html` runs a burst gate terminated by a
**250 ms safety timer** (`:1986-1989`). A stream slower than 250 ms ends the burst early and the
log paints in visible chunks.

The delay is not a tuning problem. It is a missing signal.

---

## 2. The change (four parts, small)

### B1 — batch the push  ★ biggest single win

Add one command that carries many messages:

```
executeUiCommand(addMessages, '<json array>', '<position>')
```

- `position` = `"append"` (default, initial load + live messages) or `"prepend"` (older history).
- The JSON array element shape is **exactly the existing per-message arg set** — do not invent a
  new schema. Keep `insertMessage`'s current arg order, one object per message, so the shell's
  existing `upsertText` / `buildMediaRow` / typed-bubble dispatch is reused unchanged.
- Fold each message's reactions into its object (`reactions` key) rather than pushing
  `updateReactions` separately during a bulk load — that halves the crossings again.
- Keep the existing single-message `insertMessage` command alive for live arrivals. Do not remove
  it; the shell still needs a cheap one-message path.

**Effect:** chat entry goes from 100+ round trips to 1.

> Size note: `Utils.sendUiCommand` escapes each arg with `escapeHtmlParameter` and wraps in single
> quotes (`Utils.cs:104-119`). A 100-message JSON blob is a large single argument — verify it
> survives that escaping (and consider base64 for the array arg, mirroring what the shell already
> does for inbound values via `b64ToUtf8`).

### B2 — prepend instead of re-flush

```
onLoadMore()  →  fetch ONLY the older slice not already on screen
              →  sendUiCommand("addMessages", json, "prepend")
              →  NO clearMessages
```

The shell inserts above the first row without touching what is already rendered. Growth becomes
O(n) total.

> **Unverified, needs BE confirmation:** `friend.getMessages(channel, count)` lives in Ixian-Core,
> outside this repo, so I could not check whether it can return a *slice* (skip/take) or only a
> "last N". If it's last-N only, C# can still compute the slice locally from the returned list —
> `loadMessages` already does exactly that with `skip_messages` (`:1253-1258`). Either way the
> work is small; please confirm which.

### B3 — explicit end-of-batch signal

```
executeUiCommand(messagesDone)
```

Pushed once after any bulk `addMessages`. With this the shell **deletes** its burst gate and the
250 ms safety timer outright — not tunes them, deletes them. That is the flicker fix, by
construction rather than by delay.

### B4 — smaller initial window

`Config.messagesToLoad` 100 → **~30** (`Config.cs:57`). A phone viewport shows 8–12 messages.
Load what's visible and let scroll fill the rest. One line, and it compounds with B1.

---

## 3. What the FE does once this lands

- Wire `attachLazyHistory` (`src/components/lazy-history.js`) — **already written, currently
  unwired**. It prepends a spinner and restores `scrollTop += scrollHeight - h0` (`:39-43`),
  which is precisely the prepend contract. It has been waiting for this transport.
- Replace the batch-A "Show older messages" pill with a scroll sentinel. The pill's emit,
  end-of-history handling and scroll anchoring all carry over — roughly 60% of the FE work
  survives; only the affordance is swapped.
- Delete the burst gate + 250 ms timer (`chat.html:1904-2001`).
- Keep the pill as the **end-of-history / retry** affordance and as the reduced-motion fallback.

## 4. Contract notes for whoever implements it

| Concern | Requirement |
|---|---|
| Ordering | Within one `addMessages` array, oldest → newest, same as `loadMessages` emits today. |
| `show_more` | Keep the existing end-of-history signal (`show_more="false"` when the returned count is below the window, `:1246-1249`) — the shell already relies on it and it is correct. Pass it on `messagesDone` or keep it on `clearMessages`; either is fine, just pick one. |
| Idempotence | Prepend must be safe to receive twice (a double-fired loadmore). The shell dedupes by message id, but C# should not resend a slice it already sent. |
| `clearMessages` | Stays, for its real jobs: channel switch, history wipe (the iOS-24/25 empty-state path at `:1239-1244`), and peer switch. It should no longer be part of load-more. |
| Reaction pushes | During bulk load fold into the message object; live reaction updates keep the existing `updateReactions` command. |
| Unread zeroing | The `unreadMessageCount = 0` + `setContactStatus` block (`:1260-1276`) belongs to *entering a chat*, not to loading older pages. Make sure a prepend does **not** re-run it. |
| Backwards compat | Keep every existing command working (bridge freeze, `ARCHITECTURE.md` §8). `addMessages` and `messagesDone` are additive. |

## 5. Sizing

Rough, for scheduling: B1 ~30-50 lines C# + a shell handler; B2 ~15-25 lines C#; B3 ~3 lines C#;
B4 one line. The FE side is a net **deletion** (burst gate + timer) plus wiring a component that
already exists.

This is, as far as the parity audit found, the **highest-leverage C# change available in the
cutover** — one change closes a UX gap (unreachable history), a performance problem (chat entry),
and a visual defect (load flicker).
