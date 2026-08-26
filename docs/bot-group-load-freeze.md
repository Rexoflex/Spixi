# The bot-group load freeze — evidence, not a fix

**Status: ★ §1 IS NOW FIXED (#619, 2026-08-28). §2 and §3 are still written, not built.**

> ⚠ UPDATE 2026-08-28. Damir read this doc and cut §1 himself: *"the 5 second delay when
> joining a group bot is useless … better it shows up immediately"*, and *"the group bot
> info takes 4 seconds to appear and feels broken. We added the skeletons for this
> purpose."* He was right on both counts, and on a third the doc missed: because the sleep
> parks the **UI thread**, the info screen was never slow — it was queued behind the freeze.
> The wait now runs on a background thread and the message loader awaits it, so the ordering
> `loadMessages` depends on survives. See DECISIONS #619. **What remains below — the
> per-message `EvaluateJavaScriptAsync` fan-out (§2) and the Core disk path (§3) — is
> untouched and still wants the instrument-first batch this doc describes.**
Raised by Damir on the 2026-08-27 iOS device pass (verdict §1, SEVERITY 1). Read
`docs/f5-verdict-2026-08-27-ios.md` §1 first for the report in his words.

| | |
|---|---|
| Repro | Join the Spixi bot group on iOS |
| Symptom | The group takes **minutes** to load all messages. ★ **The app FREEZES during the load.** |
| Android | The same group is **10 seconds max** and does not freeze |
| After a restart | The group chat **does not load to the final message** |

★ This needs its own batch. It is not a polish row, and the work order below is
deliberately separated from the diagnosis so that the diagnosis can be argued with.

---

## 1. ★★ The freeze has a name, and it only fires for groups and bots — ✅ FIXED (#619)

`Spixi/Pages/Chat/SingleChatPage.xaml.cs`, inside `onLoad`, guarded by `if (chat_type > 0)`
— i.e. **group or bot only, never a 1:1**:

```csharp
while (friend.metaData.botInfo == null
    || !friend.channels.hasChannel(friend.metaData.botInfo.defaultChannel))   // :757
{
    if (sleep_cnt >= 50) { popPageAsync(); … return; }                        // :759
    Thread.Sleep(100);                                                        // :779
    sleep_cnt++;
}
```

**Up to 5 seconds of synchronous `Thread.Sleep` on the UI thread.** `onLoad` is reached
from `onNavigating`, a `WebView.Navigating` handler, which runs on the main thread. The
loop exits instantly for a warm room and blocks for the whole window on a cold one —
which is exactly the shape of "it freezes, and after a restart it does not reach the
final message".

★ **This alone explains the platform split in kind, though not yet in size.** A 1:1 chat
never enters the loop, and Damir has never reported a 1:1 freeze.

## 2. The transport: one process-boundary crossing per message

There is no batching verb. `Utils.sendUiCommand` (`Spixi/Utils/Utils.cs`) →
`SpixiContentPage.sendMessage` → `evaluateJavascript`, which wraps **every single push**
in `MainThread.BeginInvokeOnMainThread` + `_webView.EvaluateJavaScriptAsync`.

`Spixi/Meta/Config.cs:58` says so in the source:

> *"Opening a chat pushes ONE EvaluateJavaScriptAsync per message … 100 messages
> therefore meant ~100 process-boundary crossings before anything appeared."*

Per chat open, with `Config.messagesToLoad = 50`:

| | count |
|---|---|
| `insertMessage`, one push per message | 50 |
| `updateReactions`, one push per message | 50 |
| `onLoad` fixed pushes (avatar, self-nick, owner, mode, channels…) | ~6 + one per channel |
| **…and opening chat INFO** (`ixian:loadContacts` → `addContact` per member) | **up to 500** |

Every one of those marshals back onto the UI thread, and the WebView is held at
`Opacity = 0` until the burst finishes (`SingleChatPage.xaml.cs:910`). Each `addContact`
in the shell also runs `invalidateMentions()` and schedules a chat-info refresh.

★ The batching design already exists on paper and is unbuilt: `docs/chat-transport-spec.md`
specifies `addMessages` (batch), a **prepend**, and `messagesDone`. `be-cutover-brief.md`
carries the row.

## 3. Disk cost, per open — a second, independent multiplier

`Ixian-Core/Streaming/Friends/Friend.cs:899-914` — `getMessages(channel, msg_count)`
short-circuits its cache **only when `msg_count == 100`**. `Config.messagesToLoad` is
**50**, so the cache is missed on every call and `LocalStorage.readLastMessages`
(`Streaming/Storage/LocalStorage.cs:540-614`) runs under the **global `messagesLock`**,
does `Directory.GetFiles(messages_path, "*.ixi")` and a full `OrderByDescending` over
every history file for that room — on every open and every load-more.

⚠ Core is frozen at `097341a`. This is a BE row, not something to change here. It is
recorded because it is a second reason a bot room with a long history is slow, and
fixing only the transport may not be enough.

`loadMessages` itself runs on a `Task.Run`, so the disk work is off the UI thread — but
its ~100 pushes marshal back onto it.

## 4. ★ What is NOT established, and must be measured before anyone codes

Per #294: no fix without a measurement.

1. **Why iOS is minutes and Android is ~10 s.** The obvious axis is the per-push marshal
   on WKWebView versus WebView2/Android WebView, but that is a hypothesis. It needs a
   number, not a guess.
2. **How many messages the Spixi room actually has**, and how many members. The 500-cap
   in `BotUsers.setUser` and the `userCount < 500` roster-fetch gate change the shape of
   the answer completely at either side of that line.
3. **Whether the 5-second sleep is actually being hit**, or exits on the first check. One
   log line at `:757` with `sleep_cnt` at exit answers it, and it is the difference
   between "the freeze is the sleep" and "the freeze is the burst".
4. **Whether the restart case is the same defect.** "Does not load to the final message"
   after a restart may be the sleep timing out and `popPageAsync` firing, which is a
   different failure from a slow load.

## 5. Suggested order of work — for the batch, not for this session

1. **Instrument first** (one build, no behaviour change): `sleep_cnt` at loop exit, a
   timestamp either side of the `loadMessages` burst, and the message count. That gives
   the three numbers §4 asks for.
2. **Un-block the UI thread.** The `while`/`Thread.Sleep` becomes an async wait, or the
   page presents in a loading state and fills when the channel arrives. This is the part
   that is a freeze rather than a slowness, and it is self-contained.
3. **Batch the transport** — `addMessages` + `messagesDone`, per `chat-transport-spec.md`.
   ~60% of the pill work in §A1 of the parity batch already carries over.
4. **Then re-measure.** If a bot room is still minutes with a batched transport and a
   non-blocking open, the remaining cost is the Core disk path in §3 and it is a BE row.

⚠ Do not fold any of this into a polish round. It touches chat open — the most-walked
path in the app — and the failure it fixes is a launch blocker.
