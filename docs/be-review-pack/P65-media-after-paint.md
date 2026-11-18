# P65 · PO-1: A CHAT OPEN'S MEDIA PUSHES WAIT FOR THE FIRST PAINT; THE PUSH TEXT IS BUILT OFF THE MAIN THREAD (batch photo1a)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| LOW (an order change of existing pushes; no new data) | no | none: the same pushes `setFileThumb(id, uri)`, `voiceInfo(id, durMs, csv)`, `voiceState(id, …)`, `setOfferPreview(…)` with the same arguments | `SpixiFlags.PhotoMediaAfterPaint` (pref `flagPhotoMediaAfterPaint`, absent = ON; a stored 0 acts only in dev mode) | 3 min |

**Look here first:** `Spixi/Utils/PhotoOpenRules.cs` (`MediaHold`, `MediaGate`, `uiCommandText`) and in `Spixi/Pages/Chat/SingleChatPage.xaml.cs`: `mediaGate` / `holdMedia` / `runReleasedMedia` (after `onPainted`), the three loops after `messagesDone` in `loadMessages`, `processThumb`, `processVoiceInfo`.

**DECISIONS:** #1641 (Damir: "Photo open 1") · #1643 (the 150 ms budget) · this batch #1715.

## What and why
- **Why.** On the Galaxy A52s the 48 thumbnail pushes of a photo chat landed BEFORE the shell's first paint (`glass=` 45–49 ms against 5 ms for text; report `claude/photo-open-research-2026-11-17.md` § 2–§ 3); the chat showed about 75 ms later than a text chat.
- **What.** An OPEN (a non-prepend load of a new document) holds the thumbnail, waveform and offer-preview jobs its load batched until the shell's paint signal (`ixian:painted` → `onPainted`), the present's 400 ms backstop, or at once when the paint was already seen (a reload). Released on the main thread in the old order. A load-more and every load with no open in flight enqueue as before. The thumbnail / waveform push text is built on the drainer thread (byte-identical to `Utils.sendUiCommand`); the main thread only calls `sendMessage`, after the same disposed / document / pref checks.
- **OFF:** the hold never opens; every statement is the old one.

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| A picture never shows (a lost job) | one lock for hold / release; a release before the hold closes it (the rest enqueues at once); the backstop always arms in `onLoad`'s finally | csh `PhotoOpenTests` (the order, the backstop, a release before the hold, another document's items dropped) · pin `pins-photo1a/a-open` a4, a5 |
| A push goes to the wrong document | release only for `hold.doc == thumbDoc`; the drainers keep their doc checks | csh · a6 |
| The pushed text differs | `uiCommandText` = `sendUiCommand`'s exact text (null, non-ASCII, surrogates) | csh `ui_command_text_is_sendUiCommand_text` (also reads `Utils.cs`) |
| Memory peak when 48 jobs release at once | the closure keeps the URI only when no text was built (review round 1) | csh `r1_media_release_push_and_closure_sources` |

## NOT proven
⚠ C# UNCOMPILED here (`SingleChatPage.xaml.cs`; Windows compiles in `redesign-ci`, Android in the operator block). The device numbers (`present ms=`, `glass=`, `[P1] chat media pre=`) are owed to the operator block.
