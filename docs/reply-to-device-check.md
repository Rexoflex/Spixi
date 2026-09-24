# Reply-to (M1) — the on-device carrier check, PREPARED (2026-09-24, #982)

Nothing here is built. This is the work order for the ~1 h device session Damir asked for
(walk verdict 2026-09-24: "Reply-to on-device carrier check → in the fix round, before any build
for it"). It answers ONE question: does a reply reference survive the wire AND both stores?

Background: `docs/reply-to-carrier-verification.md` (the source read — there is no carrier in Core
at `097341a`) and `docs/be-cutover-ixian-core-reply-carrier.md` (the patch, three asks).

## 0 · What exists

| Part | State |
|---|---|
| Core carrier | `docs/ixian-core-reply-carrier.patch` — `ChatStreamMessage.ReplyToId` (appended last, only when set), `FriendMessage.replyToId` (append-tolerant deserialiser), `FriendList.addMessage` copies it, `sendChatStreamMessage` uses the chat message id as the stream id. **Verified tonight: `git apply --check` is CLEAN on `097341a`.** ⚠ Damir's PC carries the LOCAL #962 patch in Ixian-Core — run the check on THAT tree (`git apply --check`), and keep both on a scratch branch. |
| Spixi C# | `SingleChatPage.insertMessage` pushes a `reply_to` arg that is ALWAYS `""` (the seam; the one-line cutover is quoted in the comment there). Nothing SENDS a `chatStream` with a reply id. |
| Shell | the quote bubble, the composer context strip and the menu item are built and gated off (`bridge.cap('reply')`). |

## 1 · The one piece of harness the check needs (NOT built — build it only for this session, on a scratch branch)

A DEBUG-only, devMode-only verb on `SingleChatPage` — it is how a reply gets sent without the feature:

```csharp
// ⚠ needs `using IXICore.Streaming.Models;` at the top of SingleChatPage.xaml.cs (ImplicitUsings is off)
#if DEBUG
else if (current_url.StartsWith("ixian:devReply:", StringComparison.Ordinal) && Preferences.Default.Get("devMode", false))
{
    // ixian:devReply:<targetIdHex>:<text> — stores A's OWN row (as a normal send does) and sends ONE
    // chatStream carrying ReplyToId = the target id. ★ #985 (r3 MAJOR): without the store step there is
    // no sender row at all, and test (c) would record a false carrier failure.
    string rest = current_url.Substring("ixian:devReply:".Length);
    int c = rest.IndexOf(':');
    byte[] target = Crypto.stringToHash(rest.Substring(0, c));
    string text = rest.Substring(c + 1);
    byte[] id = Guid.NewGuid().ToByteArray();
    var csm = new ChatStreamMessage(id, text, 0, false, target);
    var stored = FriendList.addMessageWithType(FriendMessageType.standard, friend.walletAddress, selectedChannel, csm, true);
    if (stored.message != null) insertMessage(stored.message, selectedChannel);
    CoreStreamProcessor.sendChatStreamMessage(friend, csm, selectedChannel);
    Logging.info("[REPLYDIAG] sent bytes=" + csm.getBytes().Length + " hasReply=" + (target.Length > 0) + " stored=" + (stored.message != null));
}
#endif
```

Fire it from Safari/Edge dev tools on the chat WebView: `location.href = 'ixian:devReply:<hex of a message id>:hello'`
(the id hex is the `data-id` on a bubble row).

## 2 · What to log, and where (all `[REPLYDIAG]`, fixed vocabulary — lengths and booleans, never text)

| # | Where (after the patch) | Line |
|---|---|---|
| L1 | sender, the harness | `sent bytes=<n> hasReply=<bool> stored=<bool>` (the harness line above, word for word) |
| L2 | receiver, `CoreStreamProcessor.receiveData` `case SpixiMessageCode.chatStream` after the `ChatStreamMessage` parse | `recv hasReply=<ReplyToId != null> replyLen=<n>` |
| L3 | receiver, `FriendList.addMessage` after `friend_message.replyToId = …` | `stored hasReply=<bool>` |
| L4 | BOTH devices, `SingleChatPage.insertMessage` standard branch, before the push | `render id=<first 4 hex> hasReply=<message.replyToId != null && Length > 0>` |

## 3 · The order (from `reply-to-carrier-verification.md` §4 — (c) is the one that killed C8)

| | Test | Pass = |
|---|---|---|
| a | A sends a devReply → B | B: L2 `hasReply=True`, L3 `hasReply=True`, L4 `hasReply=True` |
| b | B force-quits, reopens the chat | B: L4 on the LOAD `hasReply=True` (receiver persistence) |
| c | **A reopens the chat** | **A: L4 on its OWN sent row `hasReply=True`** (sender persistence — the C8 failure mode) |
| d | an OLD build (without the patch) receives a devReply | plain message, no junk, no crash (L-lines absent there; the bubble shows the text) |
| e | the same in a GROUP and in a BOT channel | as a–c (the relay path differs: a non-contact member relays through the owner) |
| f | a devReply to a message later DELETED | the render line still says `hasReply=True`; the shell's quote falls back (when the feature is built) |

Only (a)–(c) passing un-gates any build. Record the verdict in DECISIONS; if (c) fails, the carrier
needs the SENDER side of the patch reviewed (the sender writes its own row through a different
path than `addMessage`).

## 4 · Not in scope tonight

The shell wiring (`reply:` into `createMessageBubble`, the menu → composer route, sending the id)
and the one-line seam are the FEATURE — built only after (a)–(c) pass on hardware (#215).
