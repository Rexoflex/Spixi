# Opus #46 loop — the WALK-DAY FIX BATCH (#576–#583)

**Verdict: PASS after two rounds.** Three independent reviewers, none of them the
builder. Round 1 ran in two disjoint halves (C# and FE); round 2 attacked THE FIXES,
which is where this project's defects usually live — and it found four more, two of
them reproduced empirically against the real components.

Every finding below was verified at source before it was fixed. Every fix carries a
smoke pin, and every pin in this batch was mutation-proven: two batched mutation runs
(7 mutations each) each turned exactly its own pins red and nothing else.

## Round 1 — the C# half: 3 MAJOR

| # | Finding | Mechanism | Fix |
|---|---|---|---|
| **M1** | **#572 ④ was INERT in the chats list.** The bubble said "Call declined", the row said "Missed call", and the row won after a restart. | `metaData.setLastMessage` stores `new FriendMessage(msg.getBytes())` — a DEEP COPY (Ixian-Core `Friend.cs`). Mutating the live message reaches the log and never the row, and the stale copy is what persists. | `endVoIPSession` refreshes `metaData` when the ended call IS the last message. Carries an ANSWERED call's duration across too, which never reached the row either. |
| **M2** | **#574 ① could suppress a REAL, live call.** | The gate compared the sender's network timestamp against the receiver's clock with ZERO margin. `Clock.networkTimeDifference` is 0 until a time-synced client connects — which on a cold boot is exactly when the gate runs. A receiver whose clock is fast refuses a call that is ringing now. | `STALE_CALL_MARGIN_SECONDS = 120` on top of the ring budget, and the gated call is ANNOUNCED rather than dropped in silence. |
| **M3** | **#565: one mistyped password made the CORRECT password fail forever.** | `File.WriteAllBytes(source_path, zipFileBytes)` destroyed the staged envelope BEFORE the inner wallet was verified. The retry then decrypted a raw zip, fell through to the bare-wallet path, and reported "wrong password" — with nothing on screen saying to pick the file again. | The zip goes to its own scratch file in a try/finally. The envelope survives every failure. |

MINORs taken: the picker catch widened past `COMException` (a broker refusal can arrive
as `UnauthorizedAccessException`, and MAUI may wrap either) · the media filter no longer
widens to All-files (the avatar consumers pass whatever comes back into `new Bitmap`) ·
no local path into `ixian.log` (it is shareable from DevPage) · `appContext()` throws a
named exception instead of returning a null its annotation hides · the #573 sweep
finished on `SAudioRecorder` and `SAudioPlayer` · `chat-call-declined` got its `??`
fallback · the "-1" justification was rewritten because it claimed a guard that does not
exist.

## Round 1 — the FE half: 2 MAJOR, both in #570

| # | Finding | Mechanism |
|---|---|---|
| **M1** | **The placement flip oscillated at 60 fps, on exactly the bubbles it was written for.** | `inside` is in-flow, so it GROWS the bubble to hold the pills, which makes the "too narrow" test false by construction, which flips it back to `overlap`, which shrinks the bubble again. The row's `margin-bottom` toggled with it, so the change also walked the scroll position of the whole log. |
| **M2** | **A ResizeObserver leaked per reaction EVENT, not per message.** | `addReactions` is replace-on-repeat on the SAME live row, and each call built a new observer. The only teardown was inside the callback — and in `overlap` the bubble never changes size, so a stale observer never fired and never disconnected. |

★ **The reviewer also found that two of my own pins were DEFENDING the defect**: one
asserted the literal oscillating expression, the other pinned the insufficient cleanup
line verbatim. The correct fix would have turned both red. Both were rewritten to assert
the property, and two of them now drive the real component with stubbed geometry.

The fix is Damir's OTHER candidate — a min-width floor, measured through
`width: max-content` so the reading cannot be contaminated by the box it changes.

## Round 2 — attacking the fixes: 4 MAJOR

| # | Finding | Mechanism |
|---|---|---|
| **M1** | **#572 ③: a chat row left un-tappable.** REPRODUCED. | `act()` closes the sheet and runs the action in the SAME tick; the action re-renders the list; `onDismiss` is deferred up to 400 ms. So the undo fired on a discarded node, and the REPLACEMENT node — lifted by `renderChatsList` — had no undo at all. A lifted row is `pointer-events: none`. Tapping "Mark as read" left that chat dead to taps. |
| **M2** | **#572 ③: a flush lifted the WRONG row.** REPRODUCED. | `document.querySelector` returns the first match in DOCUMENT ORDER, and a dismissing sheet is still in the DOM ahead of a newly opened one. A flush inside that window lifted the old row and left the new one under the scrim — Damir's F19 symptom, restored. |
| **M3** | **#574 ①: the new notification bypassed the mute and the global master.** | `showLocalNotification` is the raw poster and applies no policy. Every other notify site asks `SNotificationPrefs.shouldNotify` first. |
| **M4** | **#574 ①: with the margin, the gate no longer covered the reported repro.** | A hard gate at 165 s left every age under it ringing for a fresh 45 s, because `onReceivedCall` arms the budget from the HANDLE time. The 90-second-old request in Damir's own scenario fell straight through. |

Fixes: the live lift is now ONE module-scoped truth (no document order), released
SYNCHRONOUSLY at the action and DOM-WIDE · the push goes through `shouldNotify` and
never over a live call's notification id · and below the gate the ring budget is
SHORTENED by the age already burned, so a skewed clock costs nothing and a genuinely
late request rings only for what the caller has left.

MINORs taken: the `max-width` clamp was DEAD (`parseFloat` of `min(82%, 360px)` is NaN,
and a bare-percentage variant would have clamped the floor to 82px) — it reads the row's
used width now · a throw from the CLEANUP after a successful restore reported "could not
be restored" for an account already on disk · a killed process orphaned the DECRYPTED
account archive with no name anyone later knew · the #575 flex chain did not reach the
real flex item (`.c-sheet__content`), so a short host still overflowed.

★ And again: **five more pins were passing on live defects.** The convergence pin proved
nothing (the seed was wiped before it was read, and the fake observer never fired), one
pin defended dead code, and one asserted a COMMENT. All rewritten; the convergence pin
now fires the observer three times and asserts the value does not move.

## Numbers at verdict

smoke **BASELINE OK 3139 / the 3 KNOWN** (#136 · M5 · B3) · cs-syntax **144 + 1** ·
locales **ALL CLEAN, 772 keys** · i18n-lint ✓ · pseudo 9/9 · bundle **293 exports**
(+1: `liftedRowAddress`) · shells **18** · Ixian-Core `097341a` untouched.

## Carried lessons

1. **A store that hands you a copy will not tell you.** `setLastMessage` deep-copies, so
   a fix applied to the message can be invisible on the row it was written for. Two
   surfaces disagreeing is the symptom; one of them reading a snapshot is the cause.
2. **Never re-measure from a state your own write changed.** The #570 flip read a box it
   had just grown. Measure what the content WANTS (`max-content`), not what it currently
   gets.
3. **A deferred undo is not an undo.** `onDismiss` runs up to 400 ms late, and a
   synchronous re-render in between replaces the node it was going to clean.
4. **`querySelector` answers with document order, not with recency.** During any exit
   transition, two of the same thing exist.
5. **A raw poster applies no policy.** If every other call site asks a gate first, a new
   one that does not is a bug, not a shortcut.
6. **A pin written from the code defends the code.** Three separate times this batch, a
   pin asserted the exact line a correct fix would delete. Write the pin from the
   PROPERTY, and prove it by mutation — twice here, mutation was the only thing that
   showed a pin was worthless.
