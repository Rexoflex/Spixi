# #46 loop — VERDICT on #596–#623

Run 2026-08-29, in a fresh session, against `ac5068cf`. Baseline verified before the loop
started: bundle 297 · shells 18 · smoke **BASELINE OK 3288** / the 3 known (#136 · M5 · B3)
· locales CLEAN 773 · cs-syntax 144+1 · Ixian-Core `097341a`.

★ The commit problem the entry prompt warned about is GONE. `feab1095` still carries three
files, but `f31c4c28` carries **97** and `ac5068cf` seven more. The tree is clean and
pushed. No action was needed.

★ Ixian-Core note: the sibling working copy shows 170 modified files, but `git diff -w` is
empty on every one of them. The tree was rewritten with different line endings and no BOM.
Content is pristine and the four hold-out files carry no reply field. The M1 gate passes.

## Protocol actually run

Three disjoint read-only auditors (A money+keyboard · B the C# reach · C shells+cascade+pins),
then a **fresh refutation pass** over every MAJOR and HIGH, with the instruction to assume
the auditor was wrong until the defect could be reproduced. Nothing was fixed before the
refutation ran, because #623 is the standing proof that acting on an unverified HIGH costs
a working feature.

**Every reproduction below was produced by the refuter, not by the auditor.**

---

## THE MONEY FINDING — CONFIRMED, and it is the worst one in the batch

### V-1 · MAJOR · a paste into a NON-EMPTY amount field sends the wrong amount
`src/components/money.js` — `amountInputToCanonical` (the router) and `amountEditToCanonical`.

`amountInputToCanonical` reads `ev.data` **only** when `inputType === 'insertText'`. For
every bulk insert — `insertFromPaste`, `insertFromDrop`, `insertReplacementText`,
`insertCompositionText` — it hard-codes `data = null` and routes to `amountEditToCanonical`,
whose contract is *"the separators in this string are OURS"*. After a select-all-and-paste
the separators belong to the PASTED string. The router keys on the wrong fact: *the field
was not empty* is not the same as *these separators are ours*.

Reproduced in jsdom against the SHIPPED bundle, mounting the real components, with a real
select-all paste. The values that reach the bridge:

| surface | locale | gesture | field shows | on the wire | intended |
|---|---|---|---|---|---|
| Wallet Send | de-de | `5` ⇒ paste `12.75` | `1.275` | `signSend:…:1275` — 127 500 000 000 u | 1 275 000 000 u |
| Chat Tip | de-de | `5` ⇒ paste `0.05` | `005` | `contextAction:tip:…:5` — 500 000 000 u | 5 000 000 u |
| Chat Request | de-de | `5` ⇒ paste `12.75` | `1.275` | `sendrequest:…:1275` | `…:12.75` |
| Wallet Receive | en-us | `5` ⇒ paste `12,75` | `1,275` | `{amount:"1275"}` | `12.75` |

Every shipped locale is affected in one direction or the other. `fr-fr`/`ru-ru`/`en-us`
pasting `1,234.56` go ×1000 **under**. Paste into an EMPTY field is correct; a
same-convention paste is correct. The precondition is exactly *non-empty field + text in a
different convention* — which includes the canonical `.`-decimal form this app itself puts
in QR payloads and on the wire.

⚠ **The fix is NOT "route every paste to the settled heuristic"** — that reintroduces the
r2 MAJOR-1 regression (`1,234` + pasted `5` → 1.2345). The router needs to know the
REPLACED RANGE: capture `value`/`selectionStart`/`selectionEnd` in a `beforeinput` listener
at the three call sites, and use the settled heuristic only when the edit replaced the whole
previous value (or the field was empty). Everything else keeps today's per-edit path.

### V-2 · MAJOR · the TIP path signs and broadcasts with no native confirm
Found while proving V-1. `SingleChatPage.xaml.cs:1605` takes the WebView-composed amount
straight into `new IxiNumber(data)` → `prepareTransactionFrom` → `addTransaction`. There is
no `displaySpixiAlert` and no `confirmAndAuth` anywhere in that block. Wallet Send has both.

This is independently a CLAUDE.md ground-rule breach — *sign or broadcast a transaction from
WebView-composed data without a native confirm* — and it is why V-1 is effectively silent on
the tip surface: the user's last look at the number is the button label.

★ Damir's answer of 2026-08-29 already settles the design half: **a preset tip gets a review
sheet, like Send.** V-2 is the reason that is the right answer and not merely the safe one.

### V-3 · MAJOR · the #620 pin cannot see what ships — PROVEN BY MUTATION
`scripts/smoke-test.mjs:16345-16357` reads `src/components/tip-sheet.js`. `rdf` reads from
the repo root; the comment three lines under its own definition states the rule it breaks —
*"the money helpers come from the BUILT bundle… testing src/ would prove the source right
and say nothing about what shipped."*

The refuter reintroduced the exact #620 defect **in `src/demo/spixi.iife.js` only**, and the
suite printed `BASELINE OK — 3288 pass`, with all three #620 pins green — while the poisoned
bundle SPENT 7 IXI on the Enter key. A tree that spends money on the keyboard's Done key
passes the baseline today.

Also: the negative is scoped to `tip-sheet.js`. `wallet-send.js` and `wallet-receive.js` are
clean today (verified: no `keydown`, no `Enter`, no `<form>`), but nothing forbids the next
author from adding there the handler that was just deleted here.

### V-4 · MEDIUM · a typed `.5` gives an enabled button that does nothing
`wallet-send.js`. `valid()` enables Continue for `".5"` and `"12."`, but `openPaymentReview`
gates on `/^\d+(\.\d+)?$/` and returns `null` for both. The user gets an enabled Continue
that silently does nothing, forever. `canonicalAmount()` at the two boundaries (`:113`
`onQuote`, `:530` the review payload) closes it. Leave `state.amount` un-canonical so the
field can still show a mid-typed `12.`.

---

## THE C# FINDINGS

### V-5 · MAJOR · #619 leaves a 5-second task that outlives its page
`SingleChatPage.xaml.cs:806` → `SpixiContentPage.popPageAsync:2998-3042`.

Before #619 the ceiling blocked the UI thread, so the user could not act and `popPageAsync`
always found the page staging or presented. Freeing the thread makes the third branch —
`Navigation.PopAsync` on a page that was never pushed and has already been `Dispose()`d —
reachable. `Dispose()` sets no flag `popPageAsync` consults, and there is no cancellation,
token or is-alive test on the path. This codebase has already ruled the same fall-through a
MAJOR once: the `#328` comment in `closeOverlay` describes it as the `#272` pop-the-top class.

Repro on Windows or Android: open a cold bot room, wait for the blank present at ~4s, press
back before 5s.

**Fix:** a `volatile bool disposed` on `SpixiContentPage`, set in `Dispose()`, checked at the
top of `popPageAsync`'s third branch. Two lines, and it closes the `#328` residual for every
caller rather than only this one.

### V-6 · HIGH · #619 does not fix the symptom Damir reported
`webView.Opacity = 0` at `:62`, `deferPreloadReady = true` at `:71`, and BOTH
`signalPreloadReady()` and `FadeTo(1, 90)` sit in the `finally` of the try whose first
statement is `if (!await botReady) return;`. Present and reveal are both downstream of the
wait. The only earlier present is the 4s failsafe — which presents a WebView at opacity 0.

What a cold bot room looks like: chats list at 0s and 1s; at 4.1s a blank themed rectangle;
at 5.0s the pop and the bot-not-ready alert. The skeletons DECISIONS #619 invokes are inside
the invisible WebView. **DECISIONS #619's claim "the page presents at once and the shell
shows the skeletons it already had" is false as built** and must be corrected in writing.

What #619 DID fix is real and stays: the UI thread is free, so the list, the tabs and the
info button respond during the wait. That was Damir's second report and it is closed.

**Fix:** inside `if (chat_type > 0)`, before starting the loader task, marshal
`FadeTo(1, 90)` + `signalPreloadReady()` onto the main thread. Leave the `finally` as an
idempotent belt. A 1:1 chat keeps today's behaviour exactly, so the "half a second of
darkness" fix is untouched.

### V-7 · HIGH · #612 misses the second drop vector its own rationale names
`HomePage.xaml.cs:2904` — `blocked = hasModalOverlay() || isLockStaging()`. `isLockStaging`
is lock-specific. `pushPageLoaded` also drops the target while `preloadPending ||
activePreload != null`, and nothing consults that.

The window is not contrived: `warmAccountAfterFirstPaint` fires on `clearChatsDone`, waits
900ms and warm-parks the Account page with a 6000ms budget — and the deep link becomes
deliverable on the same chats load. The link is consumed at `:2919` before `onChat` runs at
`:2930`, so the drop is silent and final. That is row C8, verbatim, after the fix.

**Fix:** `isPreloadStaging()` returning `preloadPending || activePreload != null` under
`preloadLock`, OR-ed into `blocked`. The bounded wait already handles it — the counter does
not burn while blocked, and `activePreload` is always cleared, so it cannot latch.

### V-8 · HIGH · a bot-room member still wears an "Owner" chip
`ContactDetails.xaml.cs:113-118` gates the owner push on `!blind` alone. Three lines later
`amOwner` IS gated on `friend.type == FriendType.Group`, with the reason written out: in a
bot room `getOwner()` degrades to the first roster entry we happened to learn, reshuffled by
the 500-cap eviction. #616 fixed exactly this in `SingleChatPage:721`. It fixed the surface
that `#249` records as **currently unreachable**, and left the live one.

★ #613 WIDENED it: the pre-#613 read here was the raw flag, so a *flagged* bot room used to
suppress the owner and now pushes one.

**Fix:** `if (friend.type == FriendType.Group && !blind)`, matching `SingleChatPage:721`
verbatim.

### V-9 · MEDIUM · `hidesParticipants` fails OPEN
`Utils.cs:42-49` returns `false` when `metaData` or `botInfo` is null; legacy dereferenced
and would have thrown. A privacy control's failure direction was reversed incidentally.
Reachability is a Core question and Core is frozen and absent, and the tree contradicts
itself about it: `SingleChatPage:755` dereferences the same chain unguarded for a Group,
while `ContactDetails:164-170` has an audit comment saying the null state is real.

Exposure is bounded — the local user's own UI showing a roster this device already stores.
The fail-CLOSED form is one line (`return true` for a Group with no `botInfo`) and is
strictly stricter than legacy, so it cannot introduce exposure. ⚠ Under #215 it wants an
on-device check first: if the null window is real and common, mask-on-unknown briefly shows
`[Unknown]` rows in a normal group, which is the regression #613 just fixed.

### V-10 · PARTLY · the `messageQueue` race is REAL but PRE-EXISTING
`SpixiContentPage.cs:44` is a plain `Queue<string>`, written from the loader thread and
drained on the main thread with no lock. `docs/bot-group-load-freeze.md` §3 records that
`loadMessages` already ran on a `Task.Run` before this batch, so #619 added no new thread
pair. Log it as a hazard — `ConcurrentQueue<string>` is a one-line change with no behaviour
delta — but do not gate the batch on it.

### V-11 · PARTLY · a second `onLoad` spawns a second wait
Structurally true — `botReady` is a local and `onLoad` has no single-flight latch, and the
file's own comment at `:900` asserts re-entry happens. But the two vectors are not reachable
on Windows or Android: `reloadAllPages` has no live call site (two comments only), and a
language pick calls `requestSettingsOverlayExit()` first. What remains is a desktop pane
re-home within 5s of opening a bot room, and an iOS WKWebView process reload. Optional if
V-5's `disposed` flag lands, because that closes the outcome.

---

## THE SHELL FINDINGS

### V-12 · MAJOR · #606's repaint is a no-op, and every flush destroys the ghost
`chats-shell.js:300` calls `repaintRowGhost(node)` BEFORE `listEl.append(node)` at `:302`,
and `listEl` was emptied at `:228`. `repaintRowGhost` removes every `[data-menu-ghost]`
unconditionally, then repaints — but a detached node measures an all-zero rect, so
`paintRowGhost`'s own guard `!(r.width > 0)` declines. The builder documented this exact
hazard 30 lines earlier and then wrote the call site that reproduces it.

Reproduced in jsdom against the shipped bundle, with `getBoundingClientRect` given real
browser semantics (connected → 360×64, detached → zeros): after a flush, `ghosts = 0`. Net
effect is strictly worse than never calling repaint: the removal is unconditional, the
repaint always fails.

⚠ The visible symptom is **iOS-only** — the ghost exists because the z-index lift does not
work there. On Android the hoist still works and it looks fine. The DOM state is provable on
Android through `chrome://inspect`.

**Fix:** move `repaintRowGhost(node)` below `listEl.append(node)`. Verified: `ghosts = 1`.

### V-13 · HIGH · the #623 pin is VACUOUS — and it is the pin holding the batch's most contested change
`scripts/smoke-test.mjs:10034`. `friend.bot` occurs **zero** times in
`SpixiContentPage.cs`; the helper's locals are `existing` and `new_friend`, so a real bot
guard could not even be spelled that way. The assertion reduces to *the method still exists*.

Mutation-proved: a genuine `if (existing != null && existing.bot) return;` inserted into the
helper → the pin PASSES. The alternative `/\.bot\b/` over the same slice → FAILS. The "17 of
17 mutations caught" figure was satisfied here by the sibling pin at `:10029`, which masked
that this one contributes nothing.

**Fix:** `/\.bot\b/` over the same slice.

### V-14 · HIGH · #618's new row is the only control on the screen with Android's native tap highlight
`chat-info.css:579`. Ten interactive rules in that file carry
`-webkit-tap-highlight-color: transparent`; the new `.c-chat-info__row--action` does not, it
is not in `PRESSABLE_ROW`/`PRESSABLE_CONTROL`, and no global reset exists (`base.css` and
`tokens.css` contain zero occurrences). The Account-hub row #618 says it copies DOES carry
the kill.

Result on Android: the row paints its own `:active` wash AND a square platform rectangle over
a `--radius-16` card — the exact artefact #622 removed from the explore banner, in the same
batch, reintroduced by #618.

### V-15 · HIGH · #604's guard cannot be reached by the gesture it was written for
`pressable.js:558`. The reported bug follows a COMMITTED tap, so `endGesture` has already set
`pointerDown = false` and the `else` branch runs — byte-identical to before #604. Reproduced
against the shipped bundle with the real late-synthesised Android `pointerdown`: the ghost
still paints. Reverting #604 to a bare `abortGesture()` gives identical output.

`killAllAfterlives()` and `clear()` still run in both branches, so the two guards #604's own
text says were being eaten are still disarmed. The change is a genuine improvement for a
teardown that lands with a finger truly down; it is not the reported bug.

**Fix:** latch `cancelled = true` regardless of `pointerDown`, with the existing safety
expiry. Safe because `onDown` already clears the latch on a real single-touch `touchstart`.
Verified both ways: ghost gone, a genuine new tap still paints.
★ This is the shape of the #589 FAB fix Damir pointed at, applied where it belongs.

### V-16 · MEDIUM · #622 left the explore banner with no press feedback at all
`apps-header.css:81` removed the platform highlight and handed ownership to `pressable.js`
in the comment only. `.c-apps-explore` is in neither press family, and the file declares no
`:hover`, no `:active` and no `transition` for it. Tapping the banner now does nothing at all
until the browser opens. Desktop gets nothing either — there is no hover rule.
**Fix:** add `.c-apps-explore` to `PRESSABLE_CONTROL`.

### V-17 · MEDIUM · ★ #621 SHIPPED THE CALL GLYPHS THE WRONG WAY ROUND — the auditor named the wrong side
Auditor C reported that the code was right and the comment wrong. **The refuter reversed
that, and the evidence is decisive.** Read out of the shipped registry by GEOMETRY, not by
name:

* `phone-off` draws one long diagonal stroke across the handset — **the crossed phone**
* `phone-x` draws two crossing 45° strokes beside the handset — **the phone with a small x**

Damir's ruling: crossed = unanswered · phone-with-x = refused. That means
`'call-missed': 'phone-off'` and `'call-declined': 'phone-x'`. `chatlist-item.js:80-81`
ships the inverse.

The decisive corroboration is `typed-bubbles.js:370` —
`icon(declined ? 'phone-x' : missed ? 'phone-off' : 'phone')` — which agrees with the comment
and DISAGREES with the chats list. **The same declined call shows one glyph in the
conversation and the other in the row above it, today.** Three artefacts (the comment, the
pin message, the call bubble) agree against one.

**Fix:** swap `chatlist-item.js:80-81`. The comment and the pin text then need no edit.
⚠ It is Damir's dial and it is visible on Android — one look confirms it before the swap.

### V-18 · the other weak pins, all mutation-proved on a copy
| pin | mutation that stayed GREEN |
|---|---|
| `:16916` #605 ring negative | a ring added to the bare `[data-menu-lift]` rule (`rulesFor` only matches the VALUED attribute) |
| `:16577` #603 | `truncateAddressMiddle` inserted in the unchecked tail — the window is 3600 chars, the function is 6256 |
| `:16602` #602 | the `phone-off` entry deleted from the registry; `createExcerpt` degrades silently and the excerpt lost its glyph |
| `:846` #596 hero | the fixture carries no avatar, so `heroImgs.length === 0` proves the fixture, not the property |
| `:16375` #619 | `popPageAsync()` AND the whole alert block deleted from the timeout branch (`popPageAsync();` occurs 4× in the file) |
| `:16439` #613 | the money guard swept to `Utils.hidesParticipants` — the one sweep the pin's comment forbids (both needles occur 3×) |
| `:16458` #612 order | the original bug restored (`indexOf` resolved into the `!usable` branch — the needle occurs 5×) |
| `:16472` #612 fall-through | a `return;` added under the comment — the pin asserts a COMMENT |

★★ **Nine pins. The batch's four newest C# pins ALL pass on the reverted bug**, so the suite
gave no evidence about #612, #613 or #619's failure path. And the #620 money pin passes on a
bundle that spends money on the Enter key. The "17 of 17 mutations caught" figure measured
the mutation harness, not the pins.

---

## The question nobody asked — #613's fork-point argument

**It holds.** Checked directly against `0e85a4b8`, not against the row's word for it.

The baseline qualifies the mask on `FriendType.Group` at the roster push, and chooses the
chat mode with `friend.bot` tested FIRST, so a bot room can never be type 2 whatever the wire
says. The legacy front end closes it: `setChatMode` type 3 sets `isGroup`/`isBot` and never
sets `isBlindGroup`, while every legacy mask reads `isBlindGroup`. A bot room at the fork
point rendered sender nicks and addresses and reached the direct verb.

So #613 removes a divergence the redesign introduced. It does not introduce an exposure that
was absent at the baseline. **It ships.**

The inverse was checked too: a blind PRIVATE group is still fully masked after the change —
roster push, group-info roster, owner, bubble sender label, member sheet, mini-app roster and
the money refusal. One honest caveat: the per-MESSAGE push has never masked the address slot,
in our tree or legacy. Blind groups stay private there because the protocol hands out derived
addresses, not because C# masks. Unchanged by this batch.

## The #623 adjudication — TWO independent auditors, same verdict

**#623 is CORRECT. The predecessor's HIGH-2 was wrong. No success toast for an unsent
request is back in the tree.**

1. The member sheet sends the DIRECT verb — `chat.html:2445`,
   `bridge.send('ixian:sendContactRequest:' + rec.senderAddress)`. Nothing on that surface
   calls `contextAction:sendContactRequest`.
2. The direct verb's handler is `sendContactRequestGuarded`, whose guards are unparseable
   address, own address, pending deletion and already-a-contact. **No bot guard.** The
   identifier `friend` does not appear in the method at all.
3. The message-menu route is the one with the bot guard. Different handler, same verb name.
4. Legacy matches on both counts at `0e85a4b8`.
5. A bot is `FriendType.Bot`, so the roster carries real addresses — the request has a target.
6. The toast cannot fire without one: the shell still requires `senderAddress`,
   `relation === 'none'` and `!mode.blind`.

★★ This is the carried lesson made concrete: **two verbs shared one name**, and the guard
found in one handler was not evidence about the other.

⚠ One thing the reversal broke, and it is PROSE: `chat.html:3665-3674` still defines
`hidesAddresses` as answering *"can this room's participants be PAID or ADDED"*, while
contact creation now gates on `blind`. The code is right and the paragraph is wrong. Left
as-is it is a standing invitation to re-apply the gate #623 just removed.

---

## What was checked and found CLEAN

* **#620's deletion is genuinely covered by absence, not by luck.** `openTipSheet` and
  `openRequestSheet` are both thin wrappers over one `openAmountSheet`, so there is one input
  and one confirm for both. No `<form>` anywhere, and `createButton` sets `type = 'button'`,
  so there is no implicit submit and no synthesised click. No `Enter`/`keydown` survives in
  `tip-sheet.js`, `wallet-send.js` or `wallet-receive.js`. The concern in the brief does not
  reproduce — the pin that guards it is the problem (V-3), not the code.
* **#607's caret fix itself.** 336 288 keystroke sequences driven through two oracles (a
  WYSIWYG oracle and an append-only intent oracle) across four locales: zero violations. The
  break is on the PASTE path, not the caret.
* **#611 (VoIP)**, **#597 (the deletion)**, **#617 (the sender-address restore)**, **#608's
  C# half**, **#614's core route**, **#598**, **#599**, **#600's mechanism**, **#596**,
  **#603**, **#618's cascade**, **#221 chat isolation**, and the **ghost's DOM hygiene**
  (ids stripped, no dangling ARIA, no global `[data-*]` query the clone would satisfy).
* **The `hidesAddresses` / `blind` split.** Every consumer in `chat.html` enumerated. No
  third consumer reads the wrong VALUE. One paragraph describes the wrong RULE — see above.
* **Bundle freshness.** `src/demo/spixi.iife.js` and the shipped
  `Spixi/Resources/Raw/html/spixi.bundle.js` both carry the batch. No staleness finding.

## Smaller, logged, not built

`#605`'s elevation-replaces-the-ring claim is close to the dead-altitude case (≈3–4 ΔL* under
a 0.7 scrim, against #605's own 9–10.7 ΔL* ground step) · `#600`'s extended tap area is still
clipped at the block-start edge, so the target is chip-height + 8px, not 44 · the ghost is
never re-homed on resize or rotation · the ghost puts a tabbable `<button>` inside
`aria-hidden` (bounced by `overlay.js`, so a focus bounce rather than a trap) · `#601`'s
reset is not ordered against `renderLayout`'s deferred restore (incidentally safe today) ·
`#617`'s null guard stops one line short at `Node.cs:1032` · the keyboard allow-list omits
four shells that have a commit button under a keyboard (inherited, not introduced) ·
`launch.html`'s tap-to-dismiss still blurs on `pointerdown` with no slop and no lift, which
is the shape #616 already fixed in `amount-keyboard.js` · the Contacts takeover does not
consume `--kb-inset` although the shell it lives in now publishes it.

---

## Order to fix, and who has to answer first

1. **V-1 + V-2 + V-3** — the money path. V-2's answer is already taken: a preset tip gets a
   review sheet like Send.
2. **V-17** — one line, but it is Damir's dial. **One look on Android confirms it.**
3. **V-12, V-14, V-15, V-16** — shells, all small, all provable on Android or Windows.
4. **V-5, V-7, V-8** — C#, all provable on Windows and Android, none need a Mac.
5. **V-6** — the reveal hoist. It changes the most-walked path in the app, and DECISIONS
   #619 has to be corrected in writing whatever happens.
6. **V-13, V-18** — the pins. Nine of them. Do these with the fixes, not after.
7. **V-9** — wants an on-device answer before it is touched (#215).

Nothing in this document has been built.

---

## V-19 · DEVICE EVIDENCE FOR V-7, from Damir on Windows, 2026-08-29

*"On desktop, if I click through the chats list too fast, it doesn't register my click."*
*"And sometimes the first click doesn't open the chat — no feedback fill on the row, but
the hover looks like it was clicked."*

**This is V-7's mechanism, seen from the other end.** `SpixiContentPage.pushPageLoaded`
opens with:

```csharp
if (preloadPending || activePreload != null)
{
    // A page is already staging (double-tap / competing nav) — drop this one.
    try { target.Dispose(); } catch { }
    return;
}
```

A **silent** drop. The shell has already sent `ixian:chat:<addr>` and gets no answer, no
error and no result push, so it cannot even fall back — which is exactly why the row shows
no state change while the pointer still reads as hovering.

Two everyday paths reach it:

1. **Click through the list quickly.** The first chat stages with a 4000 ms budget. Every
   click that lands inside that window is dropped.
2. **The first click after a cold start.** `warmAccountAfterFirstPaint` parks the Account
   page 900 ms after the first chats paint, with a **6000 ms** budget. A chat click inside
   that window is dropped — and it is the first click a user makes.

So one silent drop explains three separate reports: the lost deep link (V-7), the lost fast
click, and the lost first click.

⚠ The fix is NOT only to add a predicate to `#612`'s `blocked`. That makes the deep link
wait; it does nothing for a user click. A **user-initiated** navigation must WIN over an
in-flight stage rather than be discarded: cancel the in-flight preload (`cancelPreload`
already exists) and stage the new target, and let the warm-park always yield. Anything that
still drops must answer the shell so a row can un-arm instead of lying.

**Provable on Windows** — Damir has it in front of him. Almost certainly Android too.

## DECISIONS TAKEN BY DAMIR, 2026-08-29

* A preset **TIP gets a review sheet**, like Wallet Send. (V-2 is the reason it is the
  right answer and not merely the safe one.)
* **"Mark as read" gets wired properly** — persist the count AND send the read receipts —
  rather than removed.
* **Decline** lives on the CARD only, and the outcome shows on both sides. The native page
  is not a second home for it.
* **The native payment page is REMOVED, properly.** *"Nothing of legacy must exist in the
  new app. It shouldn't be in the code. If we are missing anything we will build newly."*
  That covers `WalletContactRequestPage`, its two push sites, and the `onViewPayment` route
  into it. The unguarded lookups go with it or before it.
* **The call glyphs: the EXCERPT is correct.** The chats row is the reference. Built and
  pinned — see below.
* **Kick and ban are hidden** for the owner; the capability may come later.
* **Blind-group status is not a defect** — Damir sees normal statuses now. The old
  permanently-pending clock was transient. The #275 rule still stands if it returns.

## BUILT IN THIS SESSION

* **V-17 — the call glyph disagreement.** `typed-bubbles.js` carried the pre-swap pair, so
  one declined call showed the crossed phone in the chats row and the phone-with-x in the
  conversation. The card now matches the row. The stale rationale beside the excerpt map is
  rewritten, and the pin message with it.
  ★ A new pin reads the BUILT bundle for the card and requires the two surfaces to agree —
  the invariant that was missing is "one event, one glyph", not "this map has this value".
  ★ A second new pin requires BOTH glyph keys in the registry; the first cut checked only
  `phone-x`, and `createExcerpt` degrades silently on a missing key.
  Suite: **BASELINE OK — 3290 pass** / the same 3 known pre-existers.
