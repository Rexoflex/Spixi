# PIN WORK ORDER — round 2. ONE owner again.

**LANGUAGE RULE: ASD-STE100 Simplified Technical English** in every message.

Round 2 changed code in three lanes and a fresh reviewer defeated three of round 1's own pins.
**19 pins are RED right now.** Every one asserts a shape that round 2 deliberately replaced.
Nothing here is a code defect — it is pin work.

**Target:** smoke back to `BASELINE OK` with **exactly the 3 KNOWN** (#136 · M5 · B3), bundle 275
exports, 18 shells, cs-syntax 142 + 1 gap, locales ALL CLEAN.

★★ **THE RULE THAT MATTERS: MUTATE BEFORE BELIEVING.** A fresh reviewer ran 42 mutations against
round 1's pins and **16 came back GREEN — 14 of them real holes.** Two of those were in the pin
written to enforce "pin the guarantee, not the text". Mutate on COPIES under /tmp. Restore after
each. A pin you have not turned red is a comment.

---

## ★★ 0. FIRST — THE THREE HOLES THE REVIEWER FOUND IN ROUND 1'S OWN PINS

### 0a. PIN-B misses TEN stacking-context properties
`.c-chat-canvas { rotate: 0.5deg }` passes the ENTIRE suite. Verified on the full run. So do
`scale`, `translate`, `position: sticky`, `position: fixed`, `clip-path`, `mask-image`,
`content-visibility`, `view-transition-name`, `-webkit-filter`.
★ `rotate` / `scale` / `translate` are the individual transform properties — what a designer
reaches for today instead of `transform`. `position: sticky` is a plausible edit on a scroll host.
**Extend the checker to all of them.** Fix agent F swept the code and confirms the tree is clean
against the wider list, so this is pin work only.

### 0b. PIN-B pins the scroller only by the literal selector `.c-chat-canvas > *`
Its real production classes are `.messages` / `#messages` / `.u-scroll`
(`Spixi/Resources/Raw/html/chat.html:4712`). Both of these passed the full suite:
`.c-chat-canvas .messages { transform: translateZ(0) }` and `.u-scroll { will-change: transform }`.
And `message-bubble.css:37-40` ALREADY carries `.c-chat-canvas .u-scroll:hover` rules, so this is
the selector an author is already editing near.
**Pin the real ancestors.** ⚠ Two false-positive traps fix agent F found — respect both:
* `chats-header.css:27` is `.u-scroll > .c-chats-header.is-pinned { position: sticky; z-index: 5 }`.
  Keyed on `.u-scroll`, safe only because that header never appears in the message log. A naive
  `.u-scroll` pin goes red on a correct tree.
* `chat-pattern.css:56` puts `mask-image` on `.c-chat-canvas::before` — a pseudo-element, correct
  where it is. **Skip pseudo-element SUBJECTS.** Round 1 filtered the whole selector string
  instead of the subject, so `.c-x::before + .c-chat-canvas { z-index: 0 }` slipped through. Test
  the SUBJECT.

### 0c. PIN-C's descendant half tests one descendant, and not the one MAJOR-3 is about
MAJOR-3's story is "tap Delete twice fast and you get Tip" — the element is a `.c-msgmenu` row.
PIN-C's fixture has a bare button and a `.c-wallet-receive__reqbox`. No `.c-msgmenu`. All three of
these re-opened the hole with PIN-C green:
`.c-msgmenu__row { pointer-events: auto !important }` · a (0,4,0) descendant selector · an id rule.
**Put a `.c-msgmenu` row in the fixture** and assert it too.

---

## 1. RED PINS AND NEW PINS — the app lock (fix agent L)

| # | assertion | mutation that must turn it red |
|---|---|---|
| **A** | **W-4.6 GUARANTEE — a blank lock is observable.** `notePresented("OnAppearing")` inside the `OnAppearing` slice AND `notePresented("onPresentedInPlace")` inside that slice; inside `notePresented`, `if (uiReady)` + `return` appears BEFORE `mark("lock/presented-blank"` | delete either call · invert the guard · rename the mark |
| **B** | **W-4.6 GUARANTEE — it repairs itself, bounded, and never comes down.** ① `armBlankUiWatchdog(` called from `notePresented`; ② `watchdogRepair` tests the budget BEFORE it increments; ③ **parse the two constants as NUMBERS** and assert `BLANK_LOCK_REPAIR_DELAY_MS > 1200` and `0 < BLANK_LOCK_MAX_REPAIRS <= 5`; ④ `issueReload` calls `reload()` and the file has no `loadPage(webView` outside the constructors; ⑤ the repair slice contains no `PopModalAsync`, no `authSucceeded`, no `isLockScreenActive` | `MAX_REPAIRS = 0` · delay `800` · `reload()` → `loadPage(...)` · delete the re-arm · delete the arm |
| **C** | **W-4.6 GUARANTEE — the hatch separates present from usable.** In `sweepStrandedCover`: ① a clause whose condition contains `screenLock.isBlankLock()`; ② that clause calls `repairBlankUi(` and contains neither `PopModalAsync` nor `isLockScreenActive = false`; ③ the ModalStack is read FROM THE TOP (`for (int i = modals.Count - 1; i >= 0; i--)`); ④ the clause is AFTER the relock block's `return`, i.e. reachable | drop `isBlankLock()` · add the latch clear · forward-iterate · move the clause above the relock return |
| **D** | count of `PopModalAsync(` in `LockPage.xaml.cs` **== 1**, and inside `popOwnModal` `ModalStack.LastOrDefault() == this` appears BEFORE it; both legs call `popOwnModal(` | restore an inline `Contains(this)` + `PopModalAsync()` · change `LastOrDefault() == this` → `Contains(this)` |
| **E** ⚠ RED NOW | `smoke-test.mjs:4617,4619` — the repaint moved into `popOwnModal`. leg 1 → contains `popOwnModal("cancel")` and the `popOwnModal` slice contains `repaintSystemBarsFor(null)`; leg 2 → `popOwnModal("unlock")` + same | delete the repaint from `popOwnModal` · delete either call |
| **F** ⚠ RED NOW | `smoke-test.mjs:10031` — `liveLockPage()` went public. Loosen to `(?:private\|public) static` — the accessibility keyword was never the guarantee; the ordering clause in the same `ok()` is | move the `liveLockPage()` call below the overlay check |
| **G** | `isLockStaging` references `lockPreloadPending` AND `age >= 0 && age <= LOCK_PRELOAD_PENDING_MAX_SECONDS`; inside `pushModalLoaded` the count of `lockPreloadPending = false` **equals** the count of `preloadPending = false` (3 each); the set is in the same `lock` block as `preloadPending = true` | delete one clear (count mismatch) · drop the age check · delete the stamp |
| **H** | in `presentAppLock`: a `catch (Exception` that returns `false`, and the slice contains **neither** `isLockScreenActive = false` **nor** `onLockPresentFailed` | add `onLockPresentFailed();` to the catch · delete the try/catch |
| **I** | in `hidePrivacyShield`: the drop contains `grid.Children.Contains(view)`, and `armPrivacyShieldSafety()` guarded by `privacyShieldPutBacks < PRIVACY_SHIELD_MAX_PUT_BACKS` | re-add only on throw · delete the arm · delete the budget guard |
| **J** | count of `presentAppLock("` **== 3**, each preceded within 400 chars by `SLockDiag.startCycle("` | add a fourth caller with no `startCycle` |
| **K** ★ STILL OWED FROM ROUND 1 | `lockOnIdle`'s first guard — `if (!isLockEnabled() \|\| isLockScreenActive \|\| pauseLock != null) return;` — has NO pin | delete that line: the app presents a new lock every 30 s with every other pin green |

## 2. RED PINS AND NEW PINS — notifications (fix agent N)

| # | assertion | mutation |
|---|---|---|
| **N-1** | in `decidePushUncached`: `Monitor.TryEnter(SPIXI.Meta.Node.pushFetchLock, SPIXI.Meta.Node.PUSH_FETCH_TRY_MS, ref fetchTaken)` — the **3-argument** form — plus `else if (OfflinePushMessages.fetchPushMessages(true, true))` | the 2-arg form · a plain `lock` |
| **N-2** | `finally { if (fetchTaken) { Monitor.Exit(...pushFetchLock); } }` | move Exit out of the finally |
| **N-3** ★ THE ONE THAT MATTERS | read `Node.cs`: `internal const int PUSH_FETCH_TRY_MS = 0;` and no `Timeout.Infinite`. **The whole 30-second-budget argument rests on this number** | set it to any non-zero value |
| **N-4** | `Node.cs`: `Monitor.TryEnter(pushFetchLock, PUSH_FETCH_TRY_MS, ref fetchTaken)`, the guarded call, `fireLocalNotification = false` INSIDE `if (fetchTaken)`, and `Monitor.Exit` in a `finally` | delete the node-side lock (the guarantee becomes fiction) · move `fireLocalNotification = false` outside the guard |
| **N-5/6** | the memo read is inside `lock (decidedPushes)` and the `if (hit)` early return exists | delete the early return · move `TryGetValue` outside the lock |
| **N-7** | the hit path fills `fa` from `seen.fa` when the caller's is empty | delete the fill-in |
| **N-8** ★ the item-3 fix | the `ShowRaw` upgrade block exists (`seen.action == ShowRaw && string.IsNullOrEmpty(seen.fa) && !string.IsNullOrEmpty(fa)` → `decideFromAddress`), and `decidePush` contains **no** `fetchPushMessages` | delete the upgrade · make it call `decidePushUncached` (that would re-run the fetch) |
| **N-9** | re-scope the `#495 no addressee` and `NOTIF-5 mute gate` pins from `decidePushUncached` to `decideFromAddress`; ADD: `shouldDisplayRawPush` appears **exactly once** in the file | add a second `shouldDisplayRawPush` call anywhere (the m12 duplication class) |
| **N-10** | `postOurPushRow`'s catch uses `ex.GetType().Name` + `logSafe(ex.Message)`; and `logSafe` exists with the CR/LF replace and the `Substring(0, LOG_SAFE_MAX)` | log `ex` directly · strip the `\n` replace |
| **N-11** | `logSafe(notificationId)` in the `already decided` line, and `logSafe(ex.Message)` in **both** read-failure warns | revert any one of the three |
| **N-12** ★ REWRITE ENTIRELY | the MAJOR-6 docblock no longer says `nuget.org`/403 — that reason is dead. Require `MAJOR-6`, `EXTERNAL_CALLBACKS_TIMEOUT` (or `30_000L`), `bounded`, `AndroidNotificationsManager`, `no boolean overload`. **Plus a BEHAVIOUR pin:** `if (action == PushAction.Suppress) { e.PreventDefault(); return;` and the `PostOurs`-success `PreventDefault(); return;` and **no** `e.Notification.display()` in `handleNotificationReceived` | move `PreventDefault()` back above the payload read · re-add `display()` |

## 3. RED PINS AND NEW PINS — sound and wallet (fix agent F)

| # | assertion | mutation |
|---|---|---|
| **D①** replaces the belt pin | `playEffect` contains `scheduleEffectBelt(beltMs, beltHandoff);` and `Task.Delay(delayMs).ContinueWith(_ => expire());` and NOT `Task.Delay(15000)` | `Task.Delay(delayMs)` → `Task.Delay(15000)` |
| **D①b** | the `expireBelt` closure contains `liveEffects.Remove(captured)`, `captured.Release()` and `closeFd();` | delete `closeFd();` |
| **D③** ceiling | `if (durationMs > 55000) { durationMs = 55000; }` exists AND precedes the `+ 5000` comparison | delete the clamp · `55000` → `int.MaxValue - 1` |
| **★★ E①** THE GUARANTEE | slice from after `captured.Start();` to `catch (Exception e)`, strip braces, split on `;` → **exactly two statements**, `fdHandedOff = true` then `beltHandoff = expireBelt` | insert ANY statement after `Start()` · **re-introduce round 1's inner `try`/`catch (Exception beltEx)` there** |
| **★★ E②** | `if (beltHandoff != null)` sits at brace depth 1 of `playEffect` and AFTER the `finally` | wrap the guard in a try/catch |
| **★★ E③** blind scheduler | the signature is exactly `private static void scheduleEffectBelt(int delayMs, Action expire)` and its body matches none of `filePath\|markMissing\|liveEffects\|captured\|player\|\bfd\b` | widen the signature with `, string filePath` |
| **★★ E④** the two defeats | the `catch (Exception beltEx)` slice contains **no `throw`** and **no `expire()`** | `catch (Exception beltEx) { throw; }` · `catch (Exception beltEx) { expire(); }` |
| **F(b)①** | `loadTransactions` opens with `if (MainThread.IsMainThread) { Task.Run(() =>` | delete the UI-thread guard |
| **F(b)②** | `lock (txPushLock)` is still first in the working body and the `!forceRefresh` early return is INSIDE it | move the early return above the lock · delete the guard |

⚠ Note from fix agent F: the `playEffect` slice now also contains `scheduleEffectBelt`, which is
what makes E③/E④ readable. **Do not narrow that slice.**

## 4. RULES

* **MUTATE BEFORE BELIEVING.** Every pin, every listed mutation. On copies under /tmp.
* **Scope every slice at BOTH ends.** An open-ended slice is how a pin went vacuous in round 1.
* **Strip comments before matching code.** The round-2 docblocks quote the code they describe.
* **Pin the GUARANTEE, not the shape.** Round 1's PIN-E was defeated twice by mutations that kept
  the shape and removed the guarantee. That is the standard for every pin here.
* **Parse numbers as numbers** where a bound matters (PIN-B ③, N-3, D③).
* **Do not delete a pin to make smoke green.** If one is genuinely obsolete, say so and say why the
  guarantee no longer exists.

## 5. FINISH

```
node scripts/generate-chat-pattern.mjs   # triangles 224x193.988 default
node scripts/build-demo-bundle.mjs       # 275 exports
node scripts/build-shells.mjs            # 18 shells
node scripts/smoke-test.mjs              # BASELINE OK / the 3 KNOWN (#136 · M5 · B3)
node scripts/cs-syntax-check.mjs         # 142 clean + 1 known gap
node scripts/verify-locales.mjs          # ALL LOCALES CLEAN
```
Report the new pass count and the full mutation table. **The 3 KNOWN must stay exactly 3.**
