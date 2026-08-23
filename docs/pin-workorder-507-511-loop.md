# PIN WORK ORDER — #46 loop on #507–#511. ONE owner, because pin quality is what failed.

**LANGUAGE RULE: ASD-STE100 Simplified Technical English** in every message you write.

Three fix owners changed code. None of them touched `scripts/smoke-test.mjs`, on purpose.
Every pin is written here, by one owner, so the cascade blindness that hid MAJOR-2 cannot come back.

**Baseline to reach:** bundle **275 exports** · **18 shells** · smoke **BASELINE OK 2580 pass** (the
number will rise as you add pins — that is expected; report the new number) **/ the 3 KNOWN**
(#136 · M5 · B3) · cs-syntax **142** + 1 known gap · verify-locales ALL CLEAN.

**13 pins are RED right now.** Every one asserts behaviour that a fix deliberately changed. Rewrite
them to assert the NEW guarantee. **Do not delete a pin to make smoke green.**

---

## ★★ 0. FIX THE PIN HELPER FIRST. It is the root cause of three vacuous pins AND of MAJOR-2.

`scripts/smoke-test.mjs`, the `rule()` helper (near line 11911):

```js
const rule = (css, sel) => {
  const i = css.indexOf(sel + ' {');
  return i < 0 ? '' : css.slice(i, css.indexOf('}', i));
};
```

**Three defects:**
1. `indexOf` returns only the **FIRST** match. A second rule for the same selector later in the
   same file is never read.
2. It takes **ONE** nominated file. A rule for the same selector in a **different** file is
   unreachable. `.c-chat-canvas` is styled in `message-bubble.css`, `chat-flow.css` **and**
   `settings-screens.css`. The pin read the first one only.
3. It does **not strip comments**. Declaration text inside `/* … */` satisfies the pin.

**These three defects are why MAJOR-2 was invisible for a whole batch.** A CSS pin that reads one
rule in one file cannot pin a cascade.

**Write instead:**
```js
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
// every *.css under src/styles/, by glob — not a nominated file
// returns [{ file, selector, body }] for EVERY rule whose selector list contains `sel`
const rulesFor = (sel) => …;
```
A "must not" pin then uses `.every(...)`; a "must exist" pin uses `.some(...)`.
⚠ Keep `rule()` working for the existing call sites, or update every call site. Do not leave a
half-migrated helper.

---

## 1. RED PINS — rewrite each to the NEW guarantee

| # | current message (search for it) | why it is red | assert instead |
|---|---|---|---|
| R1 | `W5 stacking: negative-z canvas inside a [data-flow]-scoped stacking context` | MAJOR-2: that recipe was the defect. The host stacking context and the `z-index: -1` are both gone | replaced by **PIN-B** below |
| R2 | `#506①: a belt closes the descriptor … Every effect is under 0.6 s, so 15 s can never clip one` | the belt is now the clip's own duration plus 5 s, floored at 15 s | replaced by **PIN-D** below |
| R3 | `★ #495: our formatting must never lose a push. Any throw returns FALSE, and both callers fall back to a row that does reach the user` | MAJOR-4/5: the `fa.GetHashCode()` fallback is DELETED. The guarantee is now stronger — we post BEFORE we discard, so a failed post keeps the SDK's row | **PIN-N1** |
| R4 | `★ #493: the Ixian fetch is attempted only when a node exists to serve it` | m10 put the fetch inside a `Monitor.TryEnter` block, so the old single-line regex no longer matches | **PIN-N4** — keep the `Node.isRunning` guarantee AND add the serialisation |
| R5 | `#503: the decision is one shared method` | `decidePush` now takes `ref string? fa` | update the signature in the regex |
| R6 | `★ #503: BOTH lanes go through it …` | both call sites now pass `ref fa` | update both |
| R7 | `★ #503: one notification is decided ONCE, keyed on OneSignal's id …` | the memo value is now `PushDecision`, not `PushAction` | **PIN-N2** |
| R8 | `#505: the lock presentation is one method` | `presentAppLock` is now `private bool` | `/private bool presentAppLock\(string cycleName\)/` and say WHY: the caller must know whether the present started (m1) |
| R9 | `★ #505: the idle lock refuses to stack on a STAGING or IN-PLACE lock …` | MAJOR-1: `hasModalOverlay()` was deliberately removed from `lockOnIdle` | **PIN-P1** |
| R10 | `#505: and not over an AUTHORISE lock already on the modal stack` | MAJOR-1: that walk was deliberately deleted — it WAS the bypass | **PIN-P1** |
| R11 | `★ #505 SELF-AUDIT: presentAppLock checks MainPage BEFORE touching any state` | the needle `'private void presentAppLock(string cycleName)'` returns −1, so the slice is one character and BOTH asserts in the block fail | change the needle to `'presentAppLock(string cycleName)'`. The two guarantees are unchanged and still hold |
| R12 | `#505: the in-flight stamp is taken before the present begins` | same needle defect as R11 | same fix |
| R13 | (the second assert in the R11 block) | same | same |

⚠ `lockOnPause` still carries the canonical guard and the ModalStack walk. Its pins stay GREEN and
must not be touched — those are about the pause path, which did not change.

## 2. NEW PINS — the lock (from fix agent 1)

**P1 — MAJOR-1: the idle lock outranks an authorise lock.**
Slice `Spixi/App.xaml.cs` (comments stripped) from `public void lockOnIdle()` to
`private void sweepStrandedCover`. On that slice assert all three: `isLockStaging()` is **present**;
`hasModalOverlay()` is **absent**; `nav.Navigation.ModalStack` is **absent**.
Mutations that must turn it red: re-insert the `hasModalOverlay()` guard; re-insert the ModalStack
walk; delete the `isLockStaging()` guard.
Message must carry the failure: park the app on a `new LockPage(true)` authorise lock on Windows,
walk away, press Cancel, and you are inside the account — `locksOnBackground` is false on Windows,
so the resume backstop is gone.

**P2 — m6: `lockOnIdle`'s first guard, which had no pin at all.** Same slice.
Assert `/if \(!isLockEnabled\(\) \|\| isLockScreenActive \|\| pauseLock != null\)[\s\S]{0,60}?return;/`.
Mutation: delete that line. The app then presents a new lock every 30 s with every other pin green.

**P3 — m1: the latch is cleared only after the present starts.** Slice `sweepStrandedCover`.
(a) `/else if \(!presentAppLock\("sweep-relock"\)\)/`.
(b) the only latch clear in the clause sits inside the lock-is-off arm.
(c) inside `presentAppLock`, `return false;` appears before `isLockScreenActive = true;`.
Mutations: move the latch clear back above the `if`; revert the signature to `void`; change the
early return to `return true;`.

**P4 — m3: a failed present re-asserts the call surface.** Slice `onLockPresentFailed` to the next
member. Assert `UIHelpers.refreshAppRequests = true;` **inside that slice**.
⚠ **The pin MUST be slice-scoped.** A whole-file regex stays green because `lockOnPause` and
`onUnlock` both carry the same line. That would be a vacuous pin of exactly the class this loop found.
Mutation: delete that one line from `onLockPresentFailed`.

**P5 — m5: every lock path starts its own cycle before its first mark.** Comment-stripped file.
Assert `startCycle` immediately precedes the first `mark` for `idle-lock`, `sweep-uncover`,
`sweep-relock` and `resume-lock`, **and** that `presentAppLock` does **not** call
`SLockDiag.startCycle(cycleName)` — a second banner would re-stamp the caller's clock.
Mutations: delete any one `startCycle`; restore `startCycle(cycleName)` inside `presentAppLock`.
⚠ Strip comments first. The new docblocks quote the cycle names.

**P6 — m2: the shield question is asked of the view tree.** In `Spixi/Utils/SpixiContentPage.cs`:
in `hasPrivacyShield()`, `grid.Children.Contains(view)` is present; in `hidePrivacyShield()`, the
entry is put back on a failed removal and `catch { }` is gone.
Mutations: revert to `return privacyShields.Count > 0;`; revert the drop catch to `catch { }`.

**P7 — Damir's dial: no privacy shield on Windows deactivate, and mobile keeps it.**
Assert the `#if !WINDOWS` / `#endif` pair around the `showPrivacyShield()` call in `OnSleep`.
Mutations: remove the `#if !WINDOWS` pair — Windows blacks out a visible window again; delete the
guarded block — mobile loses its #438 recents cover. Keep the existing inner-guard pin as well.

**P8 — a VACUOUS PIN found by fix agent 1, fix it.** The pin near `smoke-test.mjs:11681` slices from
`presentAppLock(string cycleName)` **to the end of the file**, so `showPrivacyShield(true)` and
`CallPage.hideSurface()` satisfy it from anywhere later in the file.
Proof mutation: move both statements out of `presentAppLock` into `lockOnIdle` — the pin stays green
while the extraction's whole guarantee is gone. Re-scope the slice to end at `public void lockOnIdle()`.

## 3. NEW PINS — the front end (from fix agent 2)

**PIN-B — replaces R1. THE CASCADE PIN. This is the most important pin in the batch.**
Read EVERY `*.css` under `src/styles/` by glob, comments stripped.
Assertion 1: for every rule whose selector subject is `.c-chat-canvas` (bare or with any attribute
or pseudo qualifier) or `.c-chat-canvas > *`, the body declares NONE of: a `z-index` other than
`auto`; `transform` other than `none`; `filter` other than `none`; `backdrop-filter`;
`isolation: isolate`; `contain` with `paint`/`layout`/`strict`/`content`; `perspective`;
`mix-blend-mode`; `will-change`; an `opacity` below 1.
Assertion 2: in `chat-flow.css`, the `.c-chat-canvas > .c-chat-flow` block declares
`position: absolute` and declares **no** `z-index` at all.
Mutations that MUST turn it red — each proves a hole the old pin had:
1. append `.c-chat-canvas[data-flow] { z-index: 0; }` to `chat-flow.css` — the literal MAJOR-2 defect;
2. append the same rule to `message-bubble.css` instead — **different file**, must still be red;
3. append `.c-chat-canvas { isolation: isolate; }` as a SECOND rule in `message-bubble.css` — was vacuous;
4. append `:root[data-desktop] .c-chat-canvas { transform: translateZ(0); }` to any file — was vacuous;
5. append `.c-chat-canvas > * { will-change: transform; }` — the scroller half;
6. re-add `z-index: -1` to `.c-chat-canvas > .c-chat-flow` — assertion 2;
7. **negative control:** put `.c-chat-canvas { isolation: isolate; }` inside a `/* … */` comment —
   must stay **GREEN**. This proves the comment strip works and did not turn the pin into a text matcher.

**PIN-C — MAJOR-3, the closing sheet. Behavioural, in jsdom, NOT a text match.**
Load `overlay.css` together with `wallet-receive.css`, in shell link order.
Fixture: a `.c-sheet` with no `data-open` that contains a button and a
`.c-wallet-receive__reqbox[data-open]` with its own button; plus a second `.c-sheet[data-open]` with
a button.
Assert `pointerEvents` is `none` for the closing sheet, its button, the reqbox and the reqbox's
button, and `auto` for the open sheet and its button.
Mutations that MUST turn it red: drop the ` *` half; delete the rule; strip the `html:root` prefix
(it loses a source-order tie to `wallet-receive.css`, which loads later); change `:not([data-open])`
to `[data-closing]`.
⚠ **Do not write this as a text match on the rule.** A text pin passes under the `html:root`
mutation, which is a real regression.

**PIN-D — replaces R2. The sound belt.** In `SPlatformUtils.cs`, `playEffect`:
the belt still closes the descriptor; and the body contains the duration read and the
`duration + 5000` comparison against a 15000 floor.
Mutations: replace the computed delay with a literal `15000`; delete the duration read; delete
`closeFd()` from the continuation.

**PIN-E — m13: the outer catch is unreachable once the sound has started.** In `playEffect`,
everything between `Start()` and the outer `catch (Exception e)` sits inside its own
`try`/`catch (Exception beltEx)`.
Mutation: delete the inner try/catch and leave the belt bare.

**PIN-F — m14: the wallet flush is serialised.** In `HomePage.xaml.cs`:
(a) the class declares `private readonly object txPushLock = new object();` as a **field** — a lock
object created inside the method locks nothing;
(b) the FIRST statement of `loadTransactions`'s body is `lock (txPushLock)`, so the `!forceRefresh`
early return is INSIDE the lock;
(c) `clearPaymentActivityDone` is pushed inside the lock.
Mutations: delete the lock; move the lock below the early return; move the done push outside the
closing brace; replace the field with a local.

**PIN-G — the QR numbers. LIVE, not textual.**
Half 1: in jsdom, `createQrSvg` on a 59-character payload gives `viewBox` `0 0 41 41`; assert the
derived `4.51` per cell and `18.05` quiet zone.
Half 2: the three comments carry `4.51`, `18.05`, `16.44` and `6.63`, and carry none of the old
wrong numbers. Also assert the two CSS comments are **byte-identical to each other** — #149③, the
two surfaces disagreeing about the same code is the recorded defect.
Geometry guard: `quiet = 4` in `qr.js`; the 16 px radius and the 185 px size on both surfaces,
**written cascade-wide with the new helper** so a later override rule cannot hide.
Mutations: `quiet = 2` (★ this one was VACUOUS before, because the old pin matched the comment text
where `quiet = 4` still appeared — Half 1 reads no text, so it cannot be fooled); re-add the 12 px
padding through a LATER override rule in any file; edit one comment and not the other; raise the
radius to 24.

## 4. NEW PINS — the notification lane (the loop owner's fixes)

**PIN-N1 — replaces R3. MAJOR-4 + MAJOR-5: post before discard, and no second id scheme.**
In `SNotificationServiceExtension.cs`, comments stripped:
(a) `postOurPushRow` appears **before** `PreventDefault(true)` in the method body;
(b) `GetHashCode` does **not** appear anywhere in the file — the second id scheme is gone;
(c) `showLocalNotification` does **not** appear anywhere in the file — the fallback is gone;
(d) a failed `postOurPushRow` returns without calling `PreventDefault`.
Mutations: swap the two statements back; re-add a `GetHashCode` fallback; make the failed post fall
through to `PreventDefault(true)`.
Message: `PreventDefault(true)` cannot be undone, so the row must exist before the SDK's row is
discarded. `String.GetHashCode` is randomised for each process, so a second id scheme stacks one row
per process life and `cancelNotification` can never reach it.

**PIN-N2 — replaces R7. MAJOR-7: the memo stores the address beside the action.**
In `SPushService.cs`: the `PushDecision` struct exists with an `action` and an `fa` field; the
dictionary is `Dictionary<string, PushDecision>`; `decidePush` takes `ref string? fa`; and on a memo
hit an empty `fa` is filled from the stored value.
Mutations: revert the dictionary to `Dictionary<string, PushAction>`; delete the fill-in on the hit
path; delete the fill-in on the raced path.

**PIN-N3 — MAJOR-7's belts, one for each lane.**
The extension returns early on `PostOurs` with an empty `fa` **before** any `PreventDefault`; the
foreground lane requires a non-empty `fa` before it calls `postOurPushRow`.
Mutations: delete either guard.

**PIN-N4 — replaces R4. m10: the fetch is serialised, and the `Node.isRunning` guarantee survives.**
In `decidePushUncached`: `Node.isRunning` still gates the fetch; the fetch runs under
`Monitor.TryEnter(fetchLock, FETCH_WAIT_MS)`; `Monitor.Exit` is in a `finally` guarded by the taken
flag; and `FETCH_WAIT_MS` is a bounded constant, not `Timeout.Infinite`.
Mutations: remove the `Node.isRunning` guard (the #493 guarantee); replace `TryEnter` with `lock`
(a push callback then waits on an HTTP timeout it does not own); remove the `finally`.

**PIN-N5 — m8: no raw exception object is logged where `fa` can reach it.**
In `postOurPushRow`'s catch, `Logging.error` is called with a flattened and truncated message and
with `ex.GetType().Name` — **not** with `ex` itself.
Mutation: restore `Logging.error("…: {0}", ex)`.
Message: `Address()` formats the offending string into its exception message, `Logging` adds a
newline with no escaping, so a newline in `fa` forges whole log lines in the artifact this project
uses as evidence.

**PIN-N6 — m11: the tap guard reads the value, not the literal.**
In `handleNotificationOpened`, `string.IsNullOrEmpty("fa")` must **not** appear.
Mutation: restore the literal.

**PIN-N7 — MAJOR-6 is KNOWN AND NOT FIXED. Pin the warning so nobody "fixes" it from reasoning.**
In `SPushService.cs`, the docblock above the foreground `e.PreventDefault();` names MAJOR-6, states
that `nuget.org` is unreachable, and states that the bytecode must be read first.
Mutation: delete the docblock.
★ This pin protects a DECISION, not a behaviour. #510's whole value came from reading the bytecode
instead of the documentation, and this is the place where that lesson is most likely to be lost.

## 5. RULES FOR EVERY PIN YOU WRITE

* **MUTATE BEFORE BELIEVING. A pin you have not turned red is not a pin.** Five of the builder's
  were vacuous on the first pass last session, and reading found none of them. This loop found four
  more. Mutate on a COPY under `/tmp`, never in the repo, and restore the repo after every mutation.
* **Scope every slice at BOTH ends.** An open-ended slice is how the `presentAppLock` pin became
  vacuous, and a whole-file regex is how the `refreshAppRequests` pin would.
* **Strip comments before matching code.** A docblock that quotes the code satisfies a naive pin.
* **Pin the GUARANTEE, not the text.** Where a behaviour can be resolved in jsdom, resolve it.
* Every message says what BREAKS if the pin goes red, in Simplified Technical English, and names
  the finding number.
* **Do not delete a pin to make smoke green.** If a pin is genuinely obsolete, say so in the report
  and explain why the guarantee no longer exists.

## 6. WHEN YOU FINISH

Run all of these and paste the numbers:
```
node scripts/generate-chat-pattern.mjs   # triangles 224x193.988 default
node scripts/build-demo-bundle.mjs       # 275 exports
node scripts/build-shells.mjs            # 18 shells
node scripts/smoke-test.mjs              # BASELINE OK / the 3 KNOWN (#136 · M5 · B3)
node scripts/cs-syntax-check.mjs         # 142 clean + 1 known gap
node scripts/verify-locales.mjs          # ALL LOCALES CLEAN
```
Report the new pass count. **The 3 KNOWN must still be exactly 3.** If any other pin is red, do not
hide it — report it.
