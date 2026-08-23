# #46 loop, #507–#511 — PASS 1 FINDINGS. Three disjoint read-only auditors.

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** Damir kept the rule on 2026-08-22.

Work order: `docs/opus-review-brief-507-511.md`. Batch `0088a3e9`, parent `35f58b01`.
Baseline held during the audit: bundle 275 exports · 18 shells · smoke 2580 pass / the 3 KNOWN ·
cs-syntax 142 + 1 gap · locales all clean.

**Result: 7 MAJOR · 11 MINOR · 4 QUESTION · 3 VACUOUS PINS.**
★ The loop was correct to be owed. The self-review did not find these.

---

## 0. ★★ THE HEADLINE: the batch contains an app-lock bypass, and it is the #500 shape again

**MAJOR-1 is a security-gate defect.** #500 was an app-lock bypass that the fix before it
introduced. This is the same class. The history in the brief said this step is where the MAJORs
are. It was correct.

★ **A second result is worth as much as the findings.** The pin helper `rule()` reads only the
**first** matching CSS rule, in **one** nominated file. This single defect makes three pins
vacuous. It is also the reason nobody saw **MAJOR-2**: a second `.c-chat-canvas` rule, in a
different file, breaks the precondition that the long-press lift needs. **The vacuous pin and the
MAJOR are the same bug.** Mutation found it. Reading did not.

---

## 1. MAJOR findings — all verified at source by the loop owner

### MAJOR-1 — Windows never locks while an authorise lock is on screen, and that lock has a Cancel
`Spixi/App.xaml.cs:797` · `Spixi/App.xaml.cs:815-821` · `Spixi/App.xaml.cs:1042` ·
`Spixi/Pages/Launch/LockPage.xaml.cs:223-234` · `Spixi/Pages/Settings/SettingsPage.xaml.cs:237,243,673`

**What the code does.** `lockOnIdle` returns early when a `LockPage` is on the ModalStack, or when
`hasModalOverlay()` is true. The comment gives the reason: do not make the user authenticate twice.
The settings delete flows create `new LockPage(true)`. That is a **justConfirm** lock, not an app
lock. It has a Cancel. The Cancel calls `authSucceeded(false)` and closes the lock. No password is
necessary.

**Why this is wrong.** On Android the resume branch at line 1042 is the backstop. It presents a
real app lock when the user comes back. #505 puts `locksOnBackground` in front of that branch, and
`locksOnBackground` is `false` on Windows. **The backstop is gone on Windows. The idle watcher is
the only trigger, and the idle watcher refuses to fire.**

**Failure scenario.**
1. The app lock is on. Windows. The user opens Account → Delete account. A justConfirm lock shows.
2. The user leaves the machine for three hours. `lockOnIdle` fires every 30 s and returns each time.
3. A different person sits down, clicks the window, and presses Cancel.
4. That person is in the account, unlocked, with the backup, the address and the delete flow.

At `35f58b01` step 3 gave an app lock with no Cancel.

**Confidence: high on the path.** Medium on how often a user parks the app on an authorise lock.
**One F5 settles it:** turn the app lock on, open Account → Delete account, leave the machine 11
minutes, come back, press Cancel.

### MAJOR-2 — the stacking-context precondition for the lift is ALREADY broken in the tree
`src/styles/components/chat-flow.css:17` · `src/styles/components/message-menu.css:126-131` ·
`scripts/smoke-test.mjs:11951-11957` · `src/components/chat-flow.js:109`

**Two comments in this tree contradict each other.**

* `message-menu.css:126` says: *"STACKING CONTEXT. Verified: `.c-chat-canvas` is position:relative
  with z-index auto"*, and warns *"Add a transform or a z-index here and the lift silently stops
  working"*.
* `chat-flow.css:17` is `.c-chat-canvas[data-flow] { z-index: 0; }`, and **its** comment says
  *"the host forms its own stacking context via `[data-flow] { z-index: 0 }`"*.

**The second comment is correct and the first is stale.** `position: relative` plus `z-index: 0`
is a stacking context. When `data-flow` is on the canvas, the lifted row at z-42 cannot rise above
the scrim at z-40. The ring goes back to the measured 2.01:1 that #506② removed. It fails
**silently**, which is what the message-menu comment predicts.

**Failure scenario.** Desktop. Account → Chat appearance → **Live flow**. Open a chat. Use the
keyboard menu key, or a long press on a touchscreen. Those two paths present the sheet as a
centred dialog **with the wash**. The pressed message stays under the scrim. Right-click is not
affected, because #268 removes the wash there.

**Why the pin did not see it.** The pin reads the first `.c-chat-canvas {` rule in
`message-bubble.css` only. `chat-flow.css` is a different file. See §3.

**Confidence: high on the mechanism.** ★ **This one needs Damir's dial, not only a fix.** Two
answers are possible: enforce the precondition (drop the `z-index: 0` and give `.c-chat-flow` a
different ancestor), or turn the lift off under `[data-flow]`. The pin must change either way.

### MAJOR-3 — a sheet that is closing stays tappable above the next overlay, for up to 400 ms
`src/styles/components/overlay.css:9` (scrim z-40) · `:25` (sheet z-44) ·
`src/components/overlay.js:157-172` · `src/components/modal.js:24`

**What the code does.** #506② moved `.c-sheet` from z-40 to z-44. Scrims stay at z-40. Both are
children of `document.body`. A positioned element paints by z-index first and by tree order second.
**So every sheet now paints above every scrim, including a scrim that opens later.**
`dismissOverlay` does not remove the sheet at once. It starts the exit transition and removes the
sheet on `transitionend`, with a 400 ms timeout as the fallback. **No rule sets `pointer-events:
none` on the sheet while it closes.** `overlay.css` contains no `pointer-events` rule at all.

**Why this is wrong.** The house pattern is *close the sheet, then open the modal*. That pattern
was safe only because the new scrim covered the closing sheet. It does not cover it now.

**Failure scenario.** Open a chat. Long-press a message. Tap **Delete**. The confirm dialog opens
in the centre. The user taps again, quickly — an ordinary impatient double tap. The second tap
lands on the sheet, which is now sliding down. The item under the finger is no longer Delete. It is
**Tip**. A money sheet opens on top of an unconfirmed delete dialog. The chats row menu and the
apps menu have the same shape.

**Confidence: high on the mechanism, medium on how often.** A one-line fix keeps z-44:
`.c-sheet:not([data-open]) { pointer-events: none; }`.

### MAJOR-4 — a failed post loses the push completely, and the fallback cannot rescue it
`Spixi/Platforms/Android/SNotificationServiceExtension.cs:96` · `:100` · `:107-110` ·
`Spixi/Platforms/Android/SPushService.cs:491-509`

**What the code does.** The extension calls `PreventDefault(true)` **first**. By #510's own
bytecode reading, that discard is irreversible. It then calls `postOurPushRow(fa)`. When that
returns false, the fallback calls `SPushService.showLocalNotification(...)` — **the same method
that just threw inside `postOurPushRow`**.

**Why this is wrong.** `postOurPushRow` wraps two things in one `try`: the address parse, and the
whole poster. Only the address parse is rescued by the fallback. A throw inside
`showLocalNotification` — the channel create, the `Intent`, the `PendingIntent`, `manager.Notify` —
throws again on the second call. The SDK row is already discarded. **The user gets nothing.** The
docblock claims the opposite: *"rather than lose the message entirely"*.

**Failure scenario.** A killed-app push starts the process. `Node.isRunning` is false, so the fetch
is skipped. `fa` is present, so the action is `PostOurs`. `showLocalNotification` throws — the
process is seconds old and the channel is created for the first time. Both calls fail. The push is
lost. Before this batch the same push gave the OneSignal row.

★ **This path has never run on a device.** DECISIONS #514 records that `posted as a Spixi row`
appears zero times in the notiflog.

### MAJOR-5 — the fallback row uses a SECOND id scheme, and that scheme is not stable
`Spixi/Platforms/Android/SNotificationServiceExtension.cs:108` ·
`Spixi/Meta/SNotificationPrefs.cs:265-273` · `Spixi/Platforms/Android/SPushService.cs:495`

**What the code does.** The fallback posts with `fa.GetHashCode()` as the notification id. Every
other poster in the app uses `notificationIdFor(Address, bool)`, which is a CRC32 of the address.

**Why this is wrong. Three results, and all three are bad.**

1. `String.GetHashCode` is randomised for each process in .NET 5 and later. Microsoft documents it
   as not stable across executions. **The same `fa` gives a different id in each process.** Two
   failed posts from one sender, in two process lifetimes, give **two stacked rows**. That is
   NOTIF-4 and #495 returning.
2. `cancelNotification(notificationIdFor(...))` can never reach this row. Only `CancelAll` removes
   it.
3. The two id spaces share the full `int` range. A fallback row can **replace an unrelated chat's
   row**.

**The pin says the opposite.** `scripts/smoke-test.mjs:11169-11170` asserts *"One id source, and
they cannot drift apart"*. It reads `postOurPushRow` only. **The claim is false and the pin cannot
see it.** `docs/security-handover-gate.md:385` also says `fa` reaches exactly two places. This is a
third.

**Failure scenario.** A push carries an `fa` that is not valid Base58, or that fails the checksum.
`new Address(fa)` throws. The fallback posts row H1. The process is killed. A second such push
posts row H2, and H2 is not H1. The user gets one row for each push, and the app can cancel none of
them.

### MAJOR-6 — the foreground lane still calls the no-argument `PreventDefault()`, then returns
`Spixi/Platforms/Android/SPushService.cs:522` with `:537-540` · same shape on iOS at
`Spixi/Platforms/iOS/SPushService.cs:348`

**What the code does.** `handleNotificationReceived` calls `e.PreventDefault()` — **no argument** —
before it decides anything. On `Suppress` it returns, and `e.Notification.display()` is never
reached.

**Why this is wrong.** This is the exact shape that #510's disassembly condemns. The no-argument
form sets `isPreventDefault` and then waits on the display waiter. That is the *"I will display it
myself later"* contract. A handler that suppresses and never displays parks a coroutine until it
times out. **#510 fixed the extension and did not revisit the foreground lane.** The smoke pin at
`:11610` reads the extension file only, so the foreground call is outside every gate.

**Failure scenario.** The app is open. The global master is off. Each suppressed push parks one
waiter. A muted busy chat parks one for each message.

⚠ **CONFIDENCE: MEDIUM, AND THE REASON MATTERS.** The shape is certain. What is **not** certain is
whether the managed `NotificationWillDisplayEventArgs.PreventDefault()` maps onto the native
no-argument form, and whether a discard overload exists on the managed surface at all.
**nuget.org answers 403 from this container** — verified, not assumed. `javap` and `java` are
present, so the read is ready the moment the artifact is. **Do not change this line on reasoning
alone. It is the same mistake #510 avoided by reading the bytecode.**

### MAJOR-7 — the memo stores the ACTION but not the `fa` that produced it
`Spixi/Platforms/Android/SPushService.cs:403-434` · `SNotificationServiceExtension.cs:98-100` ·
`SPushService.cs:541`

**What the code does.** `decidedPushes` maps a notification id to a `PushAction`. Each lane then
applies the action with **its own** `fa`. The two lanes read `fa` through different accessors:
`JSONObject.OptString` in the extension, `Convert.ToString` on a managed dictionary in the
foreground lane.

**Why this is wrong.** `PostOurs` has a meaning only together with the address that produced it.
A memo hit gives `PostOurs` to a lane whose `fa` may be null. Neither lane checks again.

* Extension side: `PostOurs` with an empty `fa` skips the post, but `PreventDefault(true)` has
  already discarded the SDK row. **The push disappears, and nothing is logged.**
* Foreground side: `PostOurs` with a null `fa` throws inside `new Address(null)`, returns false,
  and falls to `display()`. **A raw row appears beside the row the other lane already posted.**
  That is symptom 3.12 returning.

**The docblock disclaims exactly this.** It says the design *"is made not to care"* about the
ordering. It does care.

⚠ **This rides on a premise that is still open:** can both lanes fire for one notification?
DECISIONS #514 records that no `(foreground)` line and no `already decided` line has ever been
seen. **The memo has never been exercised.** Read it as never-run code.

---

## 2. MINOR findings — one line each, with the file

| # | Where | What |
|---|---|---|
| **m1** | `App.xaml.cs:891-896` | The sweep's relock clause clears the latch **before** it knows the re-present will happen. On the `MainPage is not NavigationPage` early return the result is fail **open**, and nothing retries. The docblock promises fail closed |
| **m2** | `SpixiContentPage.cs:822-838` | `hasPrivacyShield()` reports the bookkeeping list, not the view tree. The one failure the hatch exists to repair — a view that is still in the tree — makes it answer `false`, and log nothing |
| **m3** | `App.xaml.cs:762` + `:438-441` | The lock's failure path calls `CallPage.hideSurface()` and never re-asserts it. `lockOnPause` sets `refreshAppRequests` on its failure paths and says why. `presentAppLock` does not. #505 adds two new callers on Windows |
| **m4** | `App.xaml.cs:882-896` | The relock clause can stack a second lock when the lock took the plain-modal fallback and the 5 s stamp expired. Low probability, needs a > 5 s UI-thread stall |
| **m5** | `App.xaml.cs:826,875,890` | Every diagnostic line the hatch and the idle lock emit is attributed to the **wrong cycle**, with an elapsed time in hours. `SLockDiag.mark` runs before `startCycle`. The hatch's stated value is that a recurrence names its own mechanism in one screenshot. It does not |
| **m6** | `App.xaml.cs:795` | The most dangerous line in `lockOnIdle` — `if (!isLockEnabled() \|\| isLockScreenActive \|\| pauseLock != null) return;` — has **no pin**. Delete it and the app presents a new lock every 30 s, with every other pin green |
| **m7** | `SNotificationServiceExtension.cs:58` | `[Preserve]` is asserted as the Release-link protection, but nothing in the csproj pins the trim mode. The real protection today is a **default**, not the attribute. One `<TrimMode>full</TrimMode>` removes the lane silently |
| **m8** | `SPushService.cs:506` | A hostile `fa` reaches `ixian.log` through the exception message, and it can carry newlines. `Logging` does not escape. **Log forgery in the artifact this project uses as evidence.** `security-handover-gate.md:390` says no line carries an address. This one does |
| **m9** | `SPushService.cs:536` | `decidePush` is inside a `try` at one call site and outside every `try` at the other. `PreventDefault()` has already fired |
| **m10** | `SPushService.cs:415` → `:449` | Two entries for two **different** notifications run `fetchPushMessages` at the same time. The memo cannot help, because the keys differ. `OfflinePushMessages` mutates a static nonce with no lock. ★ The notiflog shows three pushes inside 0.5 s |
| **m11** | `SPushService.cs:562` | `if (!string.IsNullOrEmpty("fa"))` tests the **literal**. Always true. Pre-existing. iOS has the correct form |
| **m12** | `iOS/SPushService.cs:344-404` | The *"one decision, both lanes"* property is Android-only. iOS still carries its own copy of the gate, with no `Node.isRunning` guard and no `postOurPushRow`. **The drift the Android comment warns about has already happened** |
| **m13** | `SPlatformUtils.cs:275-297` | `fdHandedOff = true` is set before the 15 s belt is scheduled. A throw after `Start()` leaks the descriptor, cuts the sound, and marks the asset missing for the whole process |
| **m14** | `HomePage.xaml.cs:2355-2470` | `loadTransactions` has no lock. `loadApps` got one after #340 found this exact race. Two interleaved flushes let the first `clearPaymentActivityDone` open the zero gate mid-burst, and `open()` cancels the 400 ms belt that used to cover it |

## 3. ★★ PIN MUTATION — three vacuous pins, and they share ONE cause

The auditor mutated 37 pins on copies under `/tmp`. The repo was not changed. **34 went red. Three
stayed green.**

| mutation | result |
|---|---|
| A second `.c-chat-canvas { isolation: isolate; }` rule in the **same** file | **GREEN — VACUOUS** |
| `:root[data-desktop] .c-chat-canvas { transform: translateZ(0); }` appended | **GREEN — VACUOUS** |
| QR padding re-added through a **later** override rule | **GREEN — VACUOUS** |
| `quiet = 2` with a comment that still contains `quiet = 4` | **GREEN — VACUOUS** |

★★ **All four are one defect.** The pin helper `rule()` reads only the **first** matching rule, in
**one** nominated file, and it does not strip comments. **This is exactly why MAJOR-2 was invisible.**
A CSS pin that reads one rule in one file cannot pin a cascade.

One further pin is weak: the `untint` pin matches by text position, not by reachability. Move the
clear into a dead function after it and the pin stays green. The mechanism itself is correct — it
was verified by reading — so this is a pin quality item, not a defect.

★ **The sound block and the `*Done` block are fully live.** All 14 mutations went red, including
the `closeFd` pin that was vacuous once before.

## 4. Checked and CLEAN — so the fixer does not walk them again

* **The `presentAppLock` extraction is verbatim.** Verified mechanically: comments and blank lines
  stripped from `35f58b01`'s inline block and from the new method body, then diffed. Statement order
  is identical. `showPrivacyShield(true)` and `CallPage.hideSurface()` are both present, in their
  original positions.
* **Mobile behaviour is byte-identical.** `locksOnBackground` is `true` off Windows, `sweepStrandedCover`
  is never called, `SDesktopIdle` is compile-excluded, `MauiProgram`'s change is inside the existing
  `#if WINDOWS` block.
* **The tick arithmetic is correct.** `unchecked((uint)Environment.TickCount)` and unsigned modular
  subtraction are right on both sides of the 49.7-day wrap. The `GetLastInputInfo` failure path fails
  safe. `slept` cannot false-fire at the poll rate, because `MIN_IDLE_MINUTES` clamps the window
  above `POLL_MS`. **That relationship is load-bearing and holds only because of the clamp.**
* **`static readonly` does avoid CS0162 on both branches.** A `static readonly` field is not a
  compile-time constant.
* **No lock can be dismissed without authentication by the new code.** The sweep never pops a page
  and never calls `authSucceeded`. `performUnlock` clears the latch **before** it removes the page,
  which matches neither sweep clause. The obvious relock-after-unlock race does not exist.
* **`[Register]` and the manifest agree byte for byte.** Compared as hex. The pin computes both sides
  from the files and went red for a change on either side. DECISIONS #514's device trace closes the
  remaining doubt about the meta-data **key**, which no pin covers.
* **The memo's lock discipline and the 64-entry cap are correct.** Every read and every write is
  inside the lock. The queue and the dictionary cannot drift. Both pins went red under mutation.
* **The logger is up before any push can be handled.** `MainApplication.OnCreate` → `base.OnCreate()`
  → the `App()` constructor → `Logging.start`. ★ This closes a way the notiflog could have been
  misread: a killed-app push **cannot** execute the extension before the logger exists, so a missing
  `(service-extension)` line would have been real evidence. **DECISIONS #514 survives the check.**
* **The lift clean-up has no stranded route.** `dismissOverlay` always reaches `remove()`, `remove()`
  is idempotent, and `setOverlayOpts` merges, so `onDismiss` cannot be dropped. No stranded
  `pointer-events: none` message could be constructed.
* **The rest of the z-band is clean.** Nothing sits between 40 and 44. Toast z-70 and call bar z-60
  stay above. Takeovers stay below. The call surface is a native page in its own WebView.
* **The QR clears its quiet zone.** ⚠ But three numbers in the safety comment are wrong — see below.
* **The `*Done` verbs hold.** Both handlers are defined unconditionally, reach only HomePage's own
  WebView, and survive an exception mid-flush.
* **The dev HUD cannot throw or leak.** A missing mark renders `-`. The probe text carries no
  address, nickname, amount or message text.

## 5. ⚠ The QR arithmetic — the verdict stands, the comment does not

The auditor re-derived the numbers by running the **shipped** encoder over payloads of 37–68
characters, rather than trusting #509's row.

| | row / comment says | measured |
|---|---|---|
| modules for a real address | ~41 | **33** (grid 41 with the quiet zone) for 44–62 characters |
| module size | 3.8 px, or 4.1 px | **4.51 px** |
| quiet zone | 16.4 px | **18.05 px** |
| diagonal depth a 16 px radius removes | `16 − 16/√2` = 4.69 px | **R(√2−1) = 6.63 px** |

★ **The verdict is still correct.** Along every edge, where ISO/IEC 18004 measures, the full quiet
zone survives. Even at the worst case the white lost above the first dark column is 0.03 px. And
`border-radius` with no `overflow: hidden` clips only the background, never the SVG.

⚠ **But the comment invites a future editor to compute headroom from 4.7 px instead of 6.6 px.**
That is a 41 % understatement, on the surface that renders a wallet address. **Correct the numbers.**

## 6. Open questions for Damir — not defects

1. **MacCatalyst is a desktop and keeps the signal #505 declared wrong.** The gate is `#if WINDOWS`,
   so MacCatalyst gets `locksOnBackground = true` and no idle watcher. If MacCatalyst raises
   `OnSleep` on window deactivation, W-4.7 reproduces there unchanged. One Mac run settles it.
2. **Minimise, then use the computer for two hours, then restore — Spixi never asks for a password.**
   This is **not** the accepted short-system-lock dial. At `35f58b01` that sequence locked. On a
   shared or office machine it is a real reduction. It follows from the model, but it does not look
   like a case Damir was shown.
3. **A forward NTP step of 10 minutes or more locks the app while the user types.** That is the
   class of defect #505 exists to remove. The trade-off is inherent, because the monotonic
   alternative cannot see sleep. Worth naming, so the first question after any *"it locked while I
   was working"* report is *"did the clock jump"*.
4. **The 15 s sound belt rests on a prose assumption.** *"Every effect is under 0.6 s."* Nothing
   enforces it, and Damir is about to choose new SFX. Gate the belt on the player duration instead.

## 7. What could not be checked

* **Nothing was compiled.** No .NET toolchain in this container.
* ⚠ **The OneSignal 6.1.9 artifact is unreachable. `nuget.org` answers 403 — verified, not assumed.**
  There is no binding, no AAR and no NuGet cache in either checkout. `javap` and `java` **are**
  present. **Two facts need that artifact**, and MAJOR-6 must not be changed without them:
  1. that the no-argument `preventDefault()` waits on the display waiter, and the boolean form
     discards — this is #510's load-bearing claim, and it is now applied to only one of two lanes;
  2. **whether `onNotificationReceived` and the foreground `onWillDisplay` can both run for one
     notification, and in which order.** That premise sits under MAJOR-7, m10 and the memo itself,
     and it is the single most valuable unread fact in this batch.
* **Painting and hit-testing were reasoned from the CSS specification, not observed.** jsdom has no
  layout and no browser was available. MAJOR-3's 400 ms window wants one device confirmation before
  anyone sizes the fix.
* **The escape hatch is still unexercised.** W-4.6 did not reproduce, so `sweepStrandedCover` has
  never run on hardware in either clause. A test hook that forces a latched-locked state with no
  lock would exercise it in about a minute.
* **The real Ixian address length.** No sample exists in the repo, so the QR was measured across the
  whole plausible range.
