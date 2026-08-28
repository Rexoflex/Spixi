# #46 loop verdict — SESSION B, over session A's repairs. 2026-08-30

Ordered because **#646 still read `🟡 re-review`**. Session A shipped without its loop,
Damir asked, the loop then found seven MAJORs, a break-my-verdict pass found two more
inside the repairs, and **those repairs were never reviewed by anybody.**

Five rounds ran. Three independent read-only auditors with disjoint scopes, then fixes,
then a fresh break-my-verdict reviewer, then fixes, then a second fresh reviewer, then
fixes, then a focused fourth check, then fixes. A pin round closed each one.

**22 MAJORs. 10 in session A's repairs. 6 inside the fixes for those. 6 inside the fixes
for THOSE. 228 mutations. No pin was deleted in any round.**

DECISIONS **#657–#661**.

---

## Round 1 — three auditors, 10 MAJORs

Auditors A (the C# delivery and receipt path), B (the front-end surfaces) and C (the
overlay stack, back, and the L1 page deletions). Read-only. Disjoint scopes.

| # | What |
|---|---|
| **A1 · B1** | ★ **Three surfaces answered "was this group message delivered" with three different tests.** The bubble read `received` alone. The chats row and the expiry red read `received` OR `seen`. The long-press menu printed the two counts as unrelated numbers, so it could print **"0 of 3 delivered · 2 read"** — the sentence #647② quotes as the proof that the state is wrong, shipped as UI copy. **Two auditors found this independently, in disjoint scopes.** |
| **A2** | A `fileHeader` reached `updateMessage`'s TEXT path. An outgoing file message pushed as bubble text can paint a phantom bubble reading `uid:name:size`, stamped with the current time, at the bottom of an open conversation. |
| **A3** | `StreamProcessor.receiveData` declares `int channel = 0` and never reassigns it. Session A repaired ONE of its four users. The remote delete, the reaction push and three outgoing receipts kept the literal zero. ★ Damir's bot room has three channels. |
| **A4** | `forEachGroupHolding` resolved the group only when the pending hook's channel already matched, and it failed **silently**, so a device test could not tell "the guard declined" from "the lookup never matched". |
| **B2** | Contact details offered **Pay and Request to a contact who had not accepted**, and the sheet morphed to **"Requested"** for a request `SPayments` refuses with a native alert. Introduced by L1, on the surface L1 exists to fix. |
| **B3** | The sticky `.c-money-cta` sits UNDER the iOS soft keyboard, and `contact_details.html` publishes no `--kb-inset` at all. **Damir deferred it.** |
| **C1** | ★ **Back twice fast in chat info closed the conversation underneath.** The swallow sat AFTER `closeTopOverlay`, which returns false only on an EMPTY stack — and chat info never opens over an empty stack. The batch's own `popToRootAsync` guard refuses that exact state and explains why in its comment. **Two fixes in one batch disagreed.** |
| **C2** | The new `files` gate made the attach sheet **completely EMPTY in every bot room**, and nothing hid the ⊕. The row replaced a dead tile with a blank sheet. |
| **C3** | The iOS menu re-anchor runs on the FIRST resize only, and the rows keep moving for up to 280 ms after it. **Damir deferred it.** |

Auditor C also delivered the **L10 hazard report** that moved that row to session C. See
"What did not ship".

**Fixed in round 1** by three fix agents, plus **L7 deleted** as Damir ruled, plus the
`[RCPT]` probe removed with `getSelectedChannel()`, which had no other caller.

---

## Round 2 — the first break-my-verdict pass, 6 MAJORs, all inside the round-1 fixes

| # | What |
|---|---|
| **R2-1** | ★ **The L11 repair could have SILENCED A TRUE ALARM.** `Node.start()` sets `running = true` BEFORE its first failure return, and no failure path clears it. So `Node.isRunning` reads a FAILED start as "already running": the new branch showed no dialog, made no retry and never called `connectToNetwork()`. The tree already records that exact zombie from a device log. |
| **R2-2** | The already-running arm's comment made two statements that could not both be true. The stated cause of the error storm was **withdrawn**, not deleted, because nothing in this tree shows a HomePage rebuild dropping the stream session. |
| **R2-3** | The `LastOrDefault` repair reached **one of seven** identical sites. Six more sat in `UIHelpers`, on the network thread, on the very paths this batch re-routed — and two of them have no `try`/`catch` in our code at all. The family turned out to be **nine**. |
| **R2-4** | A **bot room's** expired message wrote its failed state to channel 0. The batch built the resolver for exactly this and pointed it at the one room type where it is inert. |
| **R2-5** | The FILE row printed the impossible sentence one field over: `fileReceived:` is the same class of evidence as `seen:` and was not folded in. **The suite PINNED the wrong answer as correct.** |
| **R2-6** | ★ **The 6-second belt restored the defect the latch was added to close.** On timeout it accepted the 1:1 defaults, so a bot room got Pay, Request, App invite and Send file six seconds after opening. **A belt that restores the defect is not a belt, it is a delay.** |

★ The reviewer also ran **9 mutations against a 142-pin harness. 8 stayed green.** His
diagnosis is the sharpest sentence of the session and became the next work order:

> *"Every pin asserts a NAMED LINE, or runs a PURE FUNCTION on hand-built inputs. **Not one
> asserts a WIRE — that the writer of the state calls the reader.**"*

---

## Round 3 — the second break-my-verdict pass, 6 MAJORs, all inside the round-2 fixes

| # | What |
|---|---|
| **R3-1** | ★ **`startCounter++` was on the WRONG SIDE of the recorded throw site.** Round 2 chose the counter over the latched flag and wrote that it is incremented "past the wallet read". It was not — it sat ABOVE it, and the wallet read is the exact statement the device log names. **The zombie satisfied both terms.** Third attempt: `startCounter++` is now the last statement before `return true`, and a new `Node.connectCounter` answers "did this process connect it". |
| **R3-2** | ★ **A link labelled "Call back" could END A LIVE CALL.** Every call card carries it and it sent `ixian:call`, whose first branch is an ungated hang-up. Round 2 had rewritten the gate and called it *"one rule, two homes"*. **It was three.** Neither belt tested audio codecs either, so a codec-less device could dial. |
| **R3-3** | ★ The delivered count now read THREE receipts and the three C# surfaces still read TWO — **and the suite pinned them at two**, so a fix agent who made them equal would turn a pin red. |
| **R3-4** | ★ `like:` and `tip:` are a fourth and fifth receipt on the same push. ⚠ **And the naive repair is wrong too:** we write our OWN like and our OWN tip, so `like:1` can name nobody but us. **The "one rule, all receipt keys" story could never be completed.** |
| **R3-5** | `cs-syntax-check` **failed a build gate on legal, compiling C#.** `using static` is live in this tree, and every page inherits from a base declared in another file. The gate broke its own "no false positives" rule, which is how a gate gets deleted. |
| **R3-6** | The grammar-gap neutraliser **printed a tick over a file that does not compile**, and the docblock said that could not happen. |

★ The reviewer ran **13 mutations against a 164-pin harness. 10 stayed green** — every one
of them a writer whose reader was pinned.

**This is the round where Damir ruled.** See below.

---

## ★★ DAMIR'S RULING — the most important thing in the session

> *"perhaps we don't need in the long press menu to show delivered. Just seen and downloaded
> if there's a file. do you agree? having delivered seems redundant."*

He was right, and the reason is that **the bubble tick already answers "did it arrive"**.
The menu was duplicating it, and the duplicate is what produced an impossible sentence in
three rounds running.

**The list was open-ended, so every reviewer found the next item on it.** `received`, then
`+ seen`, then `+ fileReceived`, then `like` and `tip`. Four homes. Every time the list
grew, the homes drifted. **The defect was the design, not any missing key.**

★ **The ruling made the fix SMALLER than any of the patches.** With the menu clause out,
the shell derives NOTHING about delivery — so **no bridge verb and no push argument were
needed**, and the bridge stayed frozen.

**What shipped:**

* **ONE C# home.** `UIHelpers.anyOtherMemberHasMessage`, asked by the bubble tick, the
  chats-row tick and the expiry red. Three private copies and their three copies of the
  lock discipline are deleted.
* ★ **It names NO reaction key.** Any reaction from an address that is not the local user
  is evidence, because you cannot read, download, like or tip a message you do not have.
  **It can never need a fourth patch, because there is nothing in it to add to.**
* It excludes **both** of our addresses — the primary, and the derived blind-group address
  — copied term for term from the writer, with the warning written at both ends.
* ⚠ **The fail-soft direction is a REQUIRED parameter with no default.** The bubble and the
  chats row pass `false` and must not claim a delivery they cannot see. `markGroupCopyFailed`
  passes `true`, because `errorSending` is written in one place in Ixian-Core and cleared
  NOWHERE, so a false red is permanent. #647② was that flag pointing the wrong way.
* **The shell:** `deliveryDetail` → `receiptDetail`. `deliveredCount` is deleted from the
  parser as well as from the line. Each clause carries its own denominator. The rule is
  **no counts, no line** — a zero is a claim about every member, a missing receipt is not.
  A bot room prints nothing.

---

## Round 4 — a focused check over the rework

Three MAJORs, one of them CARRIED rather than introduced.

| # | What |
|---|---|
| **R4-1** | ★ **The new menu line shipped ENGLISH in all 12 locales, and no gate could see it.** `readOf` and `downloadedOf` existed in no dictionary. `verify-locales` cannot check a key that does not exist, and `i18n-lint` accepts the inline `strings.KEY \|\| 'English'` fallback as the house pattern. **An inline fallback is invisible to every i18n gate we have.** |
| **R4-2** | The one walk was **O(n²) inside the reaction lock, on a 1 Hz chats-list tick**, to build a count **no caller ever read**. Deleted. The boolean answers at the FIRST sender that is not ours — exact, not an approximation, because de-duplication could only change the SIZE of a count, never whether it was zero. |
| **R4-3** | ⚠ **CARRIED, not introduced.** In a blind group two members with the same nick collapse into ONE roster entry. The denominator reads one short and the clamp turns an obvious `4 of 3` into a plausible lie. |

The strings pipeline has run. **All four new keys — `readOf`, `downloadedOf`, `callBusy`,
`callUnavailable` — are translated in all 12 locales**, and the pin now asserts the work is
done instead of reporting that it is owed.

---

## ★★ The pins and the gates

* **Eight vacuous pins were rewritten in round 1, and more in each round after it. NO PIN
  WAS DELETED IN FIVE ROUNDS.** Every one guarded a real guarantee; each was rewritten to
  assert the guarantee instead of the text.
* ★★ **EXECUTING PINS.** `receiptDetail` and the attach predicate are lifted and RUN — from
  the **shipped bundle, the way the WebView loads it**, not from the source module. That
  closes the gap #646 was opened by. A mutation that fixed the source and broke the shipped
  bundle stayed green until the pins read both homes and differenced them.
* ★ **The wire lesson.** Ten mutations beat a 164-pin harness because the READER of a piece
  of state was pinned and its WRITER was not. The repair was not more pins. **It was
  deleting the state**: five writers became one field, and six of the ten mutations became
  IMPOSSIBLE, because the code they cut no longer exists.
* ★★ **Five of the pin owner's own pins read PROSE, and mutation found them — reading did
  not.** The same defect he had rewritten four other pins to remove, hours earlier in the
  same session. **It is the most repeatable failure in this project.**
* ★ **One pin was RIGHT to go red.** The trio pin proved three C# sites carried the same
  LIST. It was the best pin available when it was written and still the wrong SHAPE,
  because a list can always grow.
* ★ **One pin was wrong while GREEN**, which no red list can show: `ok(inline || extracted, …)`
  named the owed strings step and was satisfied by the inline half alone. **A pin that
  reports a gap is not the same thing as a pin that can detect one.**
* **`cs-syntax-check`** now catches a member declared inside a method body (#593, #648), and
  it survived three review rounds of its own. **17 positive shapes, 25 negative shapes,
  1.7 s, SKIP-LOUD when tree-sitter is absent.** ★ Its promise is stated as **two separate
  promises** now, because the single absolute one was disproved in one line.

---

## ★★ Item 0 was based on a stale row

The session prompt opened with *"run the #46 adversarial loop that is still owed over
#507–#511"*. **It was not owed.** It ran on 2026-08-22 and **DECISIONS #515 records it CLEAN
after two rounds**. The artifacts are committed in `e1237928` and the fixes are in the tree
(`popOwnModal` at `LockPage.xaml.cs:558`, the cascade-aware `rulesFor` helper).

**The only thing missing was the verdict in §6 of `docs/opus-review-brief-507-511.md`, which
still read "(append here)".** Three handoffs read that empty section, concluded the loop was
owed, and copied the row forward.

★★ **A verdict that is not written back into its own brief is a verdict nobody can find.**
DECISIONS held the answer the whole time. Nobody looked, because the brief said the work was
unfinished, and a brief is what the next session reads first.

**The rule this sets: a loop is not finished until its verdict is written into the brief
that ordered it.** That is why this file exists.

---

## What did not ship

* **L6, L5 and L10 move to session C.** The loop earned the time it took. The queue paid.
* ★ **L10 is not a one-line reorder, and the worklist said it was.** Auditor C read the
  multicast ordering at `SpixiContentPage.cs:322-326` and reports a real hazard in hoisting
  `signalPreloadReady` inside `ContactDetails`: the base handler runs AFTER the page's own
  handler by subscription order, so the page has already issued `setPaneMode` and its
  `addMember` burst when the present happens. A hoist is safe only while it stays on the
  same synchronous turn, and `deferPreloadReady` would remove the 4-second belt that covers
  a skipped call. ★ And the premise is probably wrong: a hoist moves the present earlier by
  ONE dispatcher turn and cannot recover either candidate cost.
  ⚠ **The `[CDPERF]` probe therefore STAYS.**

---

## Deferred by Damir, and carried into session C

* The sticky `.c-money-cta` sits **UNDER the iOS soft keyboard**, and `contact_details.html`
  publishes no `--kb-inset` at all.
* The **iOS menu re-anchor** runs on the FIRST resize only, and the rows keep moving for up
  to 280 ms after it, so the menu can point at one message and act on another.
* ⚠ **CARRIED, not introduced:** the blind-group same-nick roster collapse (R4-3).

## BE rows added

**CORE-4**, **CORE-5**, **CORE-6** and **the membership question** — all in
`docs/be-cutover-brief.md`. The membership question is the one to read first: the delivery
walk answers *"any ADDRESS that reacted"*, not *"any MEMBER"*, and `Friend.addReaction` is
frozen Core and absent, so nothing in this checkout proves Core refuses a non-member.
**The old key list did not close this either. It is carried, not introduced.**

---

## Numbers

```
bundle 301 (was 299)  ·  shells 18  ·  smoke BASELINE OK 3582 (was 3496) / the 3 known (#136 · M5 · B3)
locales ALL CLEAN 775 (unchanged)  ·  cs-syntax 140 + 1  ·  Ixian-Core 097341a, verified clean
```

* **bundle 299 → 301** — `attachTilesFor` and `hasAttachTiles`, so the ⊕ and the attach
  sheet share ONE predicate.
* **smoke 3496 → 3582** — new pins, the executing ones among them.
* **locales stay 775, and that is a coincidence worth stating.** `readOf`, `downloadedOf`,
  `callBusy` and `callUnavailable` were added. `deliveredOf`, `downloadedBy`, `readBy` and
  `markRead` were dropped with the features that used them. english-fallback fell
  **54 → 50** per locale.
* ★ **Ixian-Core is verified at `097341a`, and `git diff --ignore-cr-at-eol` is EMPTY.** The
  170 modified files are CRLF churn, not edits.

---

## ★ The two honest lessons

1. **Three rounds were spent patching an enumerated list before anyone asked whether the
   list should exist.** Damir's one-sentence ruling made the fix smaller than any of the
   patches. **When a reviewer finds the same class of defect twice, stop fixing and question
   the design.**
2. **The session took about seven hours for what was planned as a review plus five small
   rows.** The loop earned its time. The three wasted rounds did not.
