# Reply-to (M1) — carrier verification. NO BUILD.

**Question asked:** does a reply reference survive `StreamMessage` round-trip AND
persistence in Ixian-Core? **Answer: there is no reference to survive.**

Read at source against the pinned reference `097341a`, per the #232 gate. The BE
engineer's "zero-C#" claim is the same shape as the C8 claim that looked 🟢 in the
store and was disproven on hardware (#215) — so this is a source read that ends in a
device test, not a source read that ends in a build.

## 1. What exists today — all negative

| Layer | File | Reply field? |
|---|---|---|
| Wire envelope | `Streaming/StreamMessage.cs` (v0 and v1 serializers) | **No** |
| Wire payload | `Streaming/SpixiMessage.cs` — type · data · channel · groupAddress · groupSenderAddress | **No** |
| Message kinds | `SpixiMessageCode` (0–53) | **No reply code** |
| Chat payload | `SpixiMessageObjectMap`: `{ chat, UTF8Encoding.UTF8.GetString }` | raw text, no envelope |
| Persisted record | `Streaming/Friends/FriendMessage.cs` | **No** |
| Spixi app code | all of `Spixi/**/*.cs` | **zero** occurrences of "reply" |

A `chat` message is `Encoding.UTF8.GetBytes(str)` (`SingleChatPage.xaml.cs:834`).
There is nowhere to put a reference except inside the text itself, which would render
as visible junk on any client that does not strip it. **Not shippable.**

## 2. What the read DID find — the shape of the fix, and it is small

1. **The precedent already exists.** `msgReaction` carries "a reference to another
   message" through the same pipe:
   `new ReactionMessage(msg_id, reaction).getBytes()` (`CoreStreamProcessor.cs:2885`),
   a typed payload registered in `SpixiMessageObjectMap`. A reply is that shape.
2. **There is already a structured chat payload.** `SpixiMessageCode.chatStream` (53)
   maps to `ChatStreamMessage(MessageId, Message, Sequence, IsStream)`. The natural
   change is **one appended field there** — not a new message code.
3. **Appending degrades gracefully.** `ChatStreamMessage`'s constructor reads a fixed
   sequence and never asserts it consumed the buffer, so trailing bytes are ignored:
   an old client receiving a reply shows a plain message rather than failing.
4. **The persistence half is a well-worn path.** `FriendMessage`'s deserializer is
   explicitly append-tolerant (`if (m.Position < m.Length)`) — which is exactly how
   `transactionId`, `payableDataLen`, `reactions`, `sent`, `errorSending` and
   `sequence` were each added. A `replyToId` appended last follows five precedents.

⚠ **All of that is Ixian-Core, the repo we do not own.** So the claim is not merely
wrong about Spixi's C# — it is wrong about the scope. This is a Core ask.

## 3. The FE belief is wrong in the other direction too

Un-gating is **not** a one-line cap flip.

* **Built:** the quote bubble (`message-bubble.js` `reply: {sender, address, text,
  kind, thumb}`), the composer context strip (`setComposerContext`/`getComposerContext`),
  and the menu item (`message-menu.js`, `capabilities.reply`) — all from #79/#25.
* **Not built:** `chat.html` sets `reply: bridge.cap('reply')` and its handler branch
  is marked *"reply/edit are capability-gated off → never reached in v1"*. Nothing
  passes `reply` into `createMessageBubble`, nothing routes the menu action into the
  composer, and nothing sends a target id with the message.

So the shell wiring is real work, if modest. The demo shell (`src/demo/chat.html`)
already does all three, which is the reference to port.

## 4. What a 2-device F5 must show before any of it is trusted

Run in this order; (c) is the one that killed C8.

| | Test | Proves |
|---|---|---|
| a | A sends a reply → B renders the quote | the wire carries it |
| b | B force-quits, reopens the chat | **receiver** persistence |
| c | **A reopens the chat and looks at its OWN sent reply** | **sender** persistence — C8 rendered live and was dropped on re-enter, and that is exactly what this catches |
| d | An **old build** receives a reply from a new build | the additive claim — plain message, no junk, no crash |
| e | A reply inside a **group / bot channel** | the relay path differs (non-contact members relay through the creator), and reactions already behave differently there |
| f | A reply to a message that was later **deleted** | what the quote falls back to |

Until (a)–(c) pass on hardware, the capability stays gated OFF. That is the #215
rule, and it is the only reason this document is not a build.
