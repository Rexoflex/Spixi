# F5 VERDICT — 2026-08-22. Damir, BOTH platforms. Batch #507–#510.

**Windows: 13 pass · 1 fail · 5 n/a of 19.**
**Android: 12 pass · 0 fail · 3 n/a of 15.**
★ Written to disk at decision time (#459 ①). Counts reconciled against the row list.

---

> ## ⬆ UPDATED 2026-08-22, LATER THE SAME DAY — the notiflog arrived and **#503 IS CLOSED**.
> **A1.5 PASSES.** `[NOTIFDIAG] raw push suppressed by mute/global master **(service-extension)**`
> appears **three times**, and `where` is a parameter whose only producer of that string is
> `SNotificationServiceExtension.cs:89`. The background lane ran. Full reading, including what the
> log does **not** prove and one large unrequested finding:
> **`docs/f5-verdict-2026-08-22-notiflog-503.md`**. DECISIONS **#514**.
> ⚠ Still owed after the close: **A2.2** (no `(foreground)` line in the capture) and **A1.1's
> row-count note**, which is carried to **#495**, not to #503. §0 below is left as written at the
> time so the two states can be compared.

## 0. ★★ THE HEADLINE: the desktop lock model is verified, and the notification lane is NOT yet proven

**#505 is confirmed on hardware.** 1.1, 1.2, 1.3 and 1.4 all pass — including 1.3, the
30-second Win+L that deliberately does **not** lock. No lock on focus loss; ten minutes
untouched locks; a short screen-lock does not; a long one does. **The signal was the wrong
thing, not the grace period**, and the device agrees.

**#503 LOOKS fixed and is recorded 🟡, not closed.** A1.1–A1.4 all pass on a KILLED app —
one updating row, master OFF silent, muted 1:1 silent, two chats giving two rows. But the
evidence that would settle it is exactly what is outstanding:

| | |
|---|---|
| **A1.5** | n/a — the `(service-extension)` log line is still owed |
| **A1.1's note** | empty. The prompt asked "how many rows did you actually see?" |

⚠ **Last round 2.1 passed and was a FALSE PASS** — the "4" badge was Samsung's bundler, not
our row. A tick cannot distinguish one updating row from the platform collapsing four. One
log line closes this; nothing else should.

## 1. The one FAIL is not a defect — it is a collision with #268

**W-4.x** — *"conversation is not dimmed, there's a faint background row behind the
message."* #268 (2026-07-12, Damir) ruled that anchored contextual menus on desktop get
**no backdrop wash** — *"the menu + source-row highlight are the affordance; a full-viewport
dim reads modal"* — and the "faint background row" is `[data-dt-ctx-source]`, the very
highlight that ruling named. Nothing regressed.

★ **DAMIR'S CALL, taken 2026-08-22: #268 STANDS.** No wash on desktop. The complaint is the
HIGHLIGHT reading as stray background beside the newly lifted row, so the highlight is
retuned or dropped on desktop instead. **The batch therefore has zero real failures.**

## 2. ★ The dev-HUD probe answers #506③ — and half of what it says is "not that"

From Damir's screenshot: `rdy=117 flush=185 done=187 … wflush=11076 wdone=11081 aflush=27490`.

* **`wdone − wflush` = 5 ms.** Before this batch that gap was the 400 ms quiet window. The
  wallet gate now opens the instant C# finishes its burst. **That half is measurably fixed.**
* ⚠ **`wflush=11076` / `aflush=27490` are almost certainly just when the tabs were OPENED** —
  those flushes only run on tab entry. They are **not** evidence of a C# delay and are not
  recorded as one. Only a Wallet tab opened in the first second or two would make 11 s real.

★ The instrument did its job: it separated "our gate" from "C# reaching the flush" instead
of letting a third hypothesis get built.

## 3. Findings from the pass notes

| # | Where | What | Owner |
|---|---|---|---|
| **4.1** | Android | The lift WORKS, but the bottom SHEET hides messages near the bottom of the log when they are the pressed one. ★ **This is the fix's own miss**: the sheet was put at z-44 above the lifted message at z-42 so the menu could never be covered — solving one occlusion by creating another. Damir: *"we need a drop menu like telegram and whatsapp… I think we can use the same for chat row then?"* | ★ **NEXT BATCH — anchored dropdown, message menu AND chats row menu** (Damir's call). Anchoring removes the z-fight structurally: a menu that flips above the message when there is no room below can never cover it |
| **4.1** | Android | *"dim the conversation for another level"* — the lift reads, the scrim does not go deep enough | mobile `--surface-scrim` (0.6 today). Desktop stays washless per §1 |
| **3.1** | Android | Sounds now play FULL LENGTH — the #508 rooting fix holds. But Damir wants different assets, and ★ **reports random effects on an IDLE app** | see §4 |
| **5.3** | Windows | The dev HUD is clipped by the 72 px rail — `position:fixed; left: var(--spacing-8)` has no desktop offset | one line |
| **5.4** | Windows | Damir wants the QR to open a **full bottom sheet** — code at scan size + address + the explanation together — rather than expanding inline. ⚠ The `What is this address?` explainer sheet already exists beside it (#443/#453); the two should become ONE surface, not two | design, next |

## 4. ★ The idle-sound report, and why it cannot be diagnosed from the log we have

Damir: *"I have Spixi opened on Android, doing nothing, and I get random sound effects."*

Only four call sites play a sound:

* **message sent / received** (`Node.cs:1013/1018`) — heavily gated: `fire_local_notification
  && alert && App.isInForeground && getChatPage(friend) != null` and unmuted. Cannot fire
  with no chat open.
* **transaction sent / received** (`SpixiTransactionInclusionCallbacks.cs:37-45`) — fires on
  **every** `transactionVerified` callback with **no edge guard**. `updateStatus(…Final…)` is
  called unconditionally just above it, so a transaction re-verified for any reason chimes
  again with no user action. This fits "random, while idle" far better.

★★ **THE ACTUAL OBSTACLE: a sound that FIRES logs nothing.** #506/4.3 made a *missing asset*
observable and stopped there; the success path is silent, so no log can say which of the four
played or why. Four one-line `Logging.info` calls make the next report name its own cause in
one round. **Do that before touching the trigger** — this is the #294 rule and the #503 lesson
in one place.

## 5. Still open

| | |
|---|---|
| ~~**The notiflog**~~ | ✅ **ARRIVED AND READ** — `docs/f5-verdict-2026-08-22-notiflog-503.md`, DECISIONS #514. **A1.5 PASS → #503 CLOSED.** ⚠ **A2.2 stays open**: the capture has no `(foreground)` line, so it does not cover A2.1. `already decided` is absent, but for only three ids on a process 1.6 s old — recorded, not concluded |
| **`ixian.0.log`** | The FAILING W-4.6 session, if it survived the restart |
| **Privacy shield** | Windows deactivate: drop it (recommended) or keep it. Still unanswered |
| **W-3.1** | No mechanism found in the pane chain. A before/after screenshot and WHICH pane moves |
| **The sound picks** | Damir has better UI SFX candidates and asked to be interviewed |
| **A3.1** | The Release build was never produced — the commands given were Release for Android, so this may already be covered; confirm which configuration ran |
| **W-4.x note** | The note ends mid-sentence at "A" — the rest may carry the actual instruction |
