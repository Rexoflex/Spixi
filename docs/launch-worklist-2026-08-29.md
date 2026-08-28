# LAUNCH WORKLIST — everything left before this app ships

Written 2026-08-29, after the #624–#641 batch and Damir's F5 walk (37 pass / 3 fail, all
three fixed in session). **This is the single queue now.** It supersedes
`open-items-2026-08-29.md` and `open-items-2026-08-29b.md`, both archived.

Two sources are merged here: **Damir's own pre-launch list**, given in his words, and what
remains of the review queue. Where they overlap the row says so, because several of his
items already had a lead in the queue and the lead is the fast half of the work.

**Baseline** — ⚠ **UPDATED AFTER THE SESSION B WALK (2026-08-31). TWO MORE NUMBERS MOVED:**
```
bundle 301 · shells 18 · smoke BASELINE OK 3586 / the 3 known (#136 · M5 · B3)
· locales ALL CLEAN 776 · cs-syntax 140+1 · Ixian-Core 097341a, verified clean
```
* **locales 775 → 776** — the new key `noneSeenYet`, drafted into all 12 locales.
* **smoke 3582 → 3586** — the pins for the two walk fixes.
* Everything else is unchanged: bundle 301 · shells 18 · cs-syntax 140+1 · the 3 known
  pre-existers.

The session B build baseline was `bundle 301 · shells 18 · smoke 3582 · locales 775`.
* **bundle 299 → 301** — `attachTilesFor` and `hasAttachTiles`, so the composer ⊕ and the
  attach sheet share ONE predicate.
* **smoke 3496 → 3582** — new pins, the EXECUTING ones among them.
* ★ **locales stay 775, and that is a coincidence worth stating.** `readOf`,
  `downloadedOf`, `callBusy` and `callUnavailable` were added. `deliveredOf`,
  `downloadedBy`, `readBy` and `markRead` were dropped with the features that used them.
  english-fallback fell 54 → 50 per locale.
* ★ **Ixian-Core is verified at `097341a`, and `git diff --ignore-cr-at-eol` is EMPTY.**
  The 170 modified files are CRLF churn, not edits.

The session A baseline was `bundle 299 · shells 18 · smoke 3496 · locales 775 ·
cs-syntax 140+1`. The pre-session-A baseline was `bundle 299 · shells 18 · smoke 3402 ·
locales 772 · cs-syntax 143+1`.

---

# THE PLAN — three sessions, plus a fourth for polish

Agreed with Damir 2026-08-29. **Every session ends with him walking it on device; the walk
is the gate, not the suite.** A row is not done because the pins are green.

| | rows | why they go together |
|---|---|---|
| **A** ✅ | **L1 · L2 · L8** — BUILT 2026-08-29, DECISIONS #642–#645, awaiting Damir's walk | The two he named, plus the slide-out. L1 and L2 both live in the chat / contact-details surfaces, and L8 is the mirror of work already in the tree. All three are traced to the line, so the session is build-and-verify, not investigate. |
| **B** ✅ | **L7 · L11** — BUILT 2026-08-30, DECISIONS #657–#661, awaiting Damir's walk | ⚠ **The session was planned as L6 · L7 · L5 · L11 · L10 and it did not deliver five rows.** The #46 loop that #646 marked `🟡 re-review` ran first and found **22 MAJORs over five rounds**. It earned its time. **L6, L5 and L10 move to session C.** The `[RCPT]` probe is removed and the member-context check is folded into `cs-syntax-check`. |
| **C** | **L6 · L5 · L10 · L3 · L4 · L9 · L13 · L14 · L15 · L16 · L17 · L18** + the two flicker rows | ⚠ **This session is now large.** L3 and L4 are one subject — back semantics — and doing them apart would mean deciding the same rule twice. L6, L5 and L10 carry over from B. L13 is Damir's new leave-group row and it is VERIFY-FIRST. **L14 to L17 are new from the 2026-08-31 walk and three of the four are VERIFY-FIRST.** ★ L17 (launcher icon) and L18 (the dark-mode logotype ink) are both cheap and safe to do early. Split the session if it will not fit; L3 is the row that decides the size. |
| **D** | whatever his review yields | Damir: *"I am sure my review will yield a 4th one to polish some things."* Reserve, deliberately unplanned. |

## What could go wrong, and what it costs

* **L3 is the only genuinely large row on this list.** Swipe-back across every screen, sheet
  and dialog touches the whole overlay stack. If it slips it takes session C with it — so it
  is deliberately LAST, where a slip costs the least.
* **L7 may end in removal rather than a build.** *"worst case, we can remove the option."*
  That is Damir's ruling to make when the session reaches it, and it changes the size of B
  by a lot. Ask before building the C# verb.
* **L6 carries three symptoms** (rail, right pane, mobile flicker) that may or may not share
  a cause. ⚠ #294: measure the flicker before assuming it is the same defect as the rail.
* **L12 is not in any session** — it needs an admin account on the test set, which is
  Damir's to arrange, and it can be walked at any time.
* **The nine iOS rows** need the office Mac and are outside this plan.

---

# ★★ WHAT SESSION A CHANGED IN THIS DOCUMENT'S OWN FACTS

Two rows below state something that turned out not to be true. Both are corrected in
place, and both cost real time, so they are also listed here.

* **L1's inventory said `HomePage.onSendIxi/onReceiveIxi` have "no shell emitter at
  all".** True for `sendixi`. **False for `receiveixi`** — `home.html:2295` and `:2373`
  emitted it live whenever the wallet's own address had not arrived. Damir pushed back
  on the PREMISE rather than the fix — *"why wouldn't the address be ready, it never
  happened while testing"* — and the mechanism agrees: `setAddress` is pushed inside
  the `ixian:onload` handler, in the same turn as `selectTab`, and the shell emits
  `ixian:onload` only after its first paint. The branch cannot be reached. The guard
  stays and returns silently; no toast and no loading state were built.
* **L1 names two pages. It is THREE.** `WalletSend2Page` is reachable only from
  `WalletSendPage`, so deleting the parent orphans it. Damir: *"delete all legacy
  pages, why do we want anything to point to it."*
* **L2 said `setMessageSent` has zero callers.** It has one —
  `SpixiPendingMessageProcessor.onMessageSent` — but that override is reached ONLY on
  the offline push-server path, and in a group it is called with the MEMBER's `Friend`,
  which does not hold the group message. So there was no truthful trigger to wait for,
  and Damir ruled the optimistic hand-off with the cost stated.

# ★★ WHAT SESSION B CHANGED IN THIS DOCUMENT'S OWN FACTS

* ★ **L10 is not a one-line reorder.** The row said "hoist `signalPreloadReady()` ahead of
  it". The ordering hazard is real and the premise is probably wrong. Corrected in place.
* ★ **The session did not deliver five rows.** It delivered two, plus two chores, plus a
  five-round adversarial loop that found **22 MAJORs**. **When a review is owed, size the
  session around the review, not around the rows.**
* **L7 shrank to a deletion, exactly as this document predicted**, and that prediction is
  the reason session B still fitted anything at all.

# ★★ THE SESSION B WALK — 2026-08-31

Damir walked the batch on Windows. **22 pass · 0 real failures · 2 n/a (C2, F6).**

He marked two items "fail" only because the sheet gave him no way to record a pass with a
note. **Both were passes.** Both notes are now BUILT and shipped in the same batch.

## A2 — the composer placeholder lost its padding

`.c-composer__field` carries `padding-inline-start: var(--spacing-4)`, and its own comment
calls that value the "attach pill side". The 36 px attach pill supplied the rest of the
optical gap. `hidden` is `display: none !important`, so hiding the ⊕ took the pill out of
the row and the placeholder sat on the field edge.

★ **The guarantee this batch added — a bot room offers no ⊕ — created a defect one surface
over, and only the device walk found it.**

Fixed with `.c-composer__field[data-no-attach]` at `--spacing-12`, driven from the SAME
expression that hides the button. The padding and the pill cannot disagree.

## B3 — the empty receipt row now speaks

> *"the row should say - nobody has seen this yet"*

New key `noneSeenYet`, drafted into all 12 locales.

⚠ **This reverses the "no counts, no line" rule for ONE case only.** The other four empty
returns stay silent — an incoming message, a 1:1, a bot room, and a roster under 2 —
because in those four we have no honest answer. This case is different: we hold the roster,
the message is ours, and every member reported nothing.

## ★★ A BUILD TRAP THAT COST A WALK — build Windows with F5

On Windows the app reads its html from `AppDomain.CurrentDomain.BaseDirectory`, the folder
beside `Spixi.exe` (`SPlatformUtils.cs:30-33`).

**`dotnet build` for the Windows target does not stage the `MauiAsset` files there.** Only
the Visual Studio deploy step does. When the file is missing,
`SpixiLocalization.localizeHtml` logs an error and **returns without writing**, and
`generatePage` still returns the URL to `ll_chat.html` in `Documents\Spixi\html\` — the
user folder, which survives every wipe.

★ **So the app silently serves the previous build's shell and looks completely normal.**
Damir hit exactly this and reported a fixed defect as still live.

**THE RULE: build Windows with F5, or copy `Resources\Raw\*` into the output by hand.**
Android is unaffected — it reads assets from the APK and keeps no user-folder copy.

⚠ Also: `dotnet build -t:Run` does not work for the Windows target. It replaces the Build
target and exits 9009.

---

# P0 — the two Damir called out by name

## L1 · ★★ THE LEGACY SEND AND RECEIVE SCREENS (#640) — ✅ BUILT, session A (#642). 🟡 Damir F5

> *"When on chat info or contact details, and pressing SEND or RECEIVE it fires the LEGACY
> SEND and RECEIVE SCREENS. Nothing legacy was supposed to exist in this app anymore, we
> need to clean it out."*

**Confirmed at source, and smaller than it looks.**
`contact_details.html:453-454` → `ixian:send` / `ixian:request` →
`ContactDetails.xaml.cs:392-399` → `new WalletSendPage` / `new WalletReceivePage`.

★ **Contact details is the ONLY live route.** Everything else is an old-exe fallback the
shipped shell never takes, or has no emitter at all:

| site | live? |
|---|---|
| `contact_details.html:453-454` | ★ **YES — the defect** |
| `SingleChatPage:486,503` | no — `composeSend`/`composeRequest` are always declared (`:909`) |
| `HomePage.onSendIxi/onReceiveIxi` ← `ixian:sendixi`/`ixian:receiveixi` | no — **no shell emits either verb** |
| `HomePage.onSend/onReceive` | no — XAML handlers, no live binding |
| `WalletRecipientPage` ← `AppDetailsPage:346`, `HomePage:1486` | ★ **YES — this one STAYS** |

**A · the fix.** `chat.html` already has the proven replacement (`:2769-2770`):
```javascript
if (id === 'pay')     { if (bridge.cap('composeSend'))    openSendTakeover(); … }
if (id === 'request') { if (bridge.cap('composeRequest')) openRequestForPeer(); … }
```
Port it into `contact_details`: destructure `createWalletSend` / `openRequestSheet` /
`setSendQuote` / `setSendError`; link `wallet-send.css` + `contact-row.css` (the W-h gate
catches a miss); port the two openers and the `signSendResult` / `setSendQuote` handlers.
In `ContactDetails.xaml.cs`: route `ixian:signSend` → `SPayments.handleSignSend`,
`ixian:feeQuery` → `SPayments.handleFeeQuery`, `ixian:sendrequest` → SingleChatPage's
handler, declare `setCaps("composeSend,composeRequest")`, and DELETE the two legacy
branches.

**B · decision 4, properly.** Then delete `WalletSendPage`, `WalletReceivePage` and their
HTML exactly as #635 deleted `WalletContactRequestPage` — including the
`hasLegacyPageChrome` / `pageSurfaceColorFor` case labels and the `.csproj` entries.

## L2 · ★★ GROUP DELIVERY TICKS NEVER ADVANCE (#641) — ✅ BUILT, session A (#643). 🟡 Damir F5

> *"the outgoing bubble status — apparently it's a clock icon until it's delivered to all
> participants … if a member is long term offline or deleted account, the rest who are
> communicating will always see the 'sending' clock icon despite them all seeing the
> messages … it should at least be sent or delivered. So we can strikeout the read status,
> but always do the delivered as long as it's delivered to some."*

**Traced end to end, and the fix does NOT need Ixian-Core.**

In a group, a delivery receipt is never written to the message. `handleMsgReceived`
(`CoreStreamProcessor.cs:493-514`) stores it as a per-member REACTION and returns:

```csharp
if (friend.type == FriendType.Group)
    friend.addReaction(group_sender_address, new ReactionMessage(msg_id, "received:"), channel);
return true;                                  // ← `confirmed` is never set
```

`Friend.addReaction` (`Friend.cs:1015-1030`) then advances the status **only at the full
count**:

```csharp
if (fm.reactions["received"].Count() + 1 >= users.count()) setMessageReceived(channel, fm.id);
if (fm.reactions["seen"].Count()     + 1 >= users.count()) setMessageRead(channel, fm.id);
```

★ **One absent member holds the clock for everyone, permanently.** That is his report,
exactly.

★★ **Why Core does not need to change:** the per-member reactions are already on the
message, and `SingleChatPage:2704` (C11) already re-pushes the status on every receipt. So
our own C# can derive the group answer before pushing. ⚠ Do not widen Core's threshold —
it is frozen, and the derivation is ours to make.

### THE SPEC — Damir ruled it, 2026-08-29

A group's outgoing bubble walks **clock → single check → double check, and STOPS**.

| state | when | private group | bot room |
|---|---|---|---|
| sending | still on OUR device | clock | clock |
| sent | the moment it leaves | single check | single check |
| **delivered** | private group: ≥1 member confirmed · bot room: the BOT confirmed | **double check** | **double check — ALREADY WORKS** |
| ~~read~~ | never in the bubble | — | — |
| long-press detail | who has it | "3 of 4 delivered · 2 read" | delivered only — no per-member receipts exist |

### ★★ CORRECTION — THE BOT ROOM NEEDS NO CHANGE (Damir, 2026-08-29)

> *"on legacy the bot group stops at double check, it never shows a green double check.
> That's the rule, since you send it to a known address, a bot."*

**He is right, and an earlier version of this row said the opposite.** That version claimed
delivery was "not knowable" in a bot room because `handleMsgReceived`'s reaction branch is
gated on `friend.type == FriendType.Group`. That branch is real, but it is not the only
path — and reading it without reading the FALL-THROUGH is what produced the wrong rule.

The end of the same method, reached when `group_sender_address` is **null**:

```csharp
friend.setMessageReceived(channel, msg_id);   // sets sent = true AND confirmed = true
return true;
```

A bot room's message is addressed to **one known address — the bot**. Its `msgReceived`
comes back from the bot itself, so `group_sender_address` is null, the group branch never
runs, and this tail does. → **double check.** The bot never reports reads → **never a green
double check.** Exactly the legacy rule, in shared Core code.

★ **So the stall is PRIVATE-GROUP-ONLY**, and it is exactly the branch split:

| | private group | bot room |
|---|---|---|
| the receipt comes from | **each member** → `group_sender_address` set → reaction only, early `return` | **the bot** → null → `setMessageReceived` |
| result | ✗ stalls at the all-members threshold in `Friend.addReaction` | ✓ already correct |

**What is left to build in L2:**
· the private-group derivation — delivered at ≥1 `received:` reaction;
· `setMessageSent` at the hand-off, so the single check exists at all (below);
· the read detail in the long-press menu;
· **nothing for bot rooms.**

* **★ THE CLOCK MEANS "STILL ON THIS DEVICE", AND NOTHING ELSE.** Damir, 2026-08-29:
  *"we should have clock only while the message is on our device, as soon as it's sent,
  its one check."* So the clock is not a fallback state any more — it is a positive claim
  about where the message is. The moment it is relayed, the single check appears.
  ⚠ **This settles the open question below rather than leaving it to investigation:** he
  sees a CLOCK, not a single check, which means `sent` is false in a group too. Whatever
  the cause, the ruling is that it must land on relay. Find out why it does not — it may
  be that `pendingMessageProcessor` behaves differently for a group send — and fix that as
  part of this row.

* **★ THE READ STATUS MOVES TO THE LONG-PRESS MENU** (he agreed, 2026-08-29). The bubble
  loses the read tick; the DETAIL goes where someone looks when they want more about one
  message. The menu already exists, already leads with the message, and costs no room in
  the bubble. The app can already answer it: `reactions["received"]` and `reactions["seen"]`
  each carry the member addresses, against `friend.users.count()`.
  🟡 The exact wording and shape inside the menu is still a dial — counts ("3 of 4
  delivered · 2 read") or a member list. Counts are the smaller build and read fine in a
  large room; a list is better in a room of four. Ask him before building it.
  ⚠ Do NOT put any of this under the bubble — that is the busiest surface in the app and a
  per-message caption there reads as noise.

---

# P1 — Damir's GUI/UX sweep

## L3 · Swipe-back on mobile, everywhere
> *"On mobile — swipe gestures for back for all screens, sheets, and dialogs (always one
> level down if sheet, closes sheet, next one goes back a level and so on)."*

One level per gesture, in the overlay stack's own order. `overlay.js` already owns that
stack and `dismissTopOverlay()` already implements "one level" for hardware back —
`docs/swipe-back-spec.md` exists. ★ Start there: the rule is written, the mechanism is the
same, and the work is the GESTURE, not the semantics.

## L4 · Welcome: OS back / swipe from create or restore (queue 21)
> *"On welcome screen on mobile OS back or swipe returns to welcome from create and/or
> restore screens."* and *"OS Back button fails first time and exits to home on second time
> when in create or restore screens."*

★ Two reports, one row. #614 fixed only the SHEET layer. **Start with the log line, which
has never been read on a device:** `LaunchPage.xaml.cs` logs
`"LaunchPage back: view=… overlay=…"` on every press. One walk with logcat answers what the
first press actually does.

## L5 · Launch sheets are light on a dark phone (queue 22) — ⏭ MOVED TO SESSION C
> *"Welcome/Create — while the phone is in dark theme, the terms/languages/privacy sheet is
> in light mode. I think it should follow the phone theme."*

Launch is the one shell calling `ignorePushedTheme`. Likely consequence: it never adopts the
OS theme either. ⚠ #203/N73 made launch deliberately brand-dark in BOTH themes — so check
whether the SHEETS were meant to be exempt from that, or whether the exemption over-reached.

---

# P2 — Account and Chats

## L6 · Account → Contacts: the rail jumps, and the right pane opens a chat (queue 18) — ⏭ MOVED TO SESSION C
> *"Contacts on mobile causes flickering, while on desktop it opens contacts, but the right
> pane jumps to an open chat. Right pane should stay in account empty state."*
> *"when clicking on contacts from account — the left rail jumps to CHATS, while it should
> stay on contacts."*

★ One function explains the rail half: `consumeLandTab` (`home.html:1249`) does
`activeNav = 'chats'`, `setNavActive('chats')`, `showView('chats')` and sends
`ixian:tab:chats` BEFORE mounting the takeover. That half is frontend-only.
The right-pane half needs a HomePage verb: drop the detail content, restore on close.
⚠ **The mobile FLICKER is a third symptom and may be the same cause or a different one —
measure before assuming** (#294).

## L7 · "Mark as read" — ✅ REMOVED, session B (#661). 🟡 Damir F5. RULED BY DAMIR 2026-08-29: **REMOVE IT.** *"we decided to remove the mark as read from chat row menu, no need to force it."* No C# verb, no persisted count, no read receipts. Delete the row from the chats row menu. Small FE change, session B.
> *"it removes the badge, but the badge returns, so it doesn't mark as read, and the
> counterpart doesn't get the green checks that it's read. Something to think about, and
> worst case, we can remove the option."*

There is **no backend verb at all** — `home.html:1354` records that pin, mute and markRead
are local-only. Decision 2 (2026-08-29) was *wire it properly*: the C# verb, a persisted
count, AND the read receipts. His fallback here is removal.
★ Damir's own ⑪ rule decides it if the verb is not affordable: a control that reports an
outcome it did not cause is a delivery lie, and removal beats a lie.

---

# P3 — polish and evaluation

## L8 · Chat info needs a SLIDE-OUT on close (D1) — ✅ BUILT, session A (#644). 🟡 Damir F5
> *"I like the slide in effect it's great makes it smoother, we just need a slide out, when
> closing the chat info on Android."*

The mirror of `slideStageIn` (#630): translate to `+width`, then remove. Reuse the `#326`
back-initiated close path, which already distinguishes a back-press close and already
slides on iOS. ⚠ The overlay must leave `overlayStack` at the START of the close, not
220 ms later — the same rule that made the slide-IN fire-and-forget.

## L9 · ★ SCOPE CHANGED — Damir 2026-08-29: ALL subscreens, not a per-surface evaluation
> *"Can we make all subscreens slide in from the right on mobile, and on leave slide out?
> does it make sense. on ios the chat conversation already slides in and out, i was
> thinking doing it for all subscreens, since sheets (eg. account-language) already slide
> in from the bottom."*

★ This is no longer "evaluate, do not sweep". He is proposing one rule: **sheets rise from
the bottom, subscreens come from the right**. That is a coherent grammar and the machinery
already exists — `slideIn` is per-op and L8 gave it a mirror on every platform (#644/#652).
⚠ It pairs with L3: he wants **fable** to take the two together, because a slide-in from
the right and a swipe-back to the right are the same gesture read in two directions.
🟡 Answer his "does it make sense" before building: it does, with one caveat worth raising —
a surface that is a PANE on desktop must not slide (the #328 column rule).

## L9-old · the original per-surface evaluation
> *"we should evaluate transitions if slide in is useful for any other sub-screen"*

Candidates, all on the same `presentPreload` machinery: contact details from the directory ·
the apps detail pane · wallet tx detail · settings sub-screens. ★ Evaluate, do not sweep:
#630's per-op `revealDelayMs` and `slideIn` are already per-navigation, so each surface is
an independent decision rather than one global switch.

## L10 · The bot room presents 140 ms late (D2) — ⏭ MOVED TO SESSION C

★★ **SESSION B CORRECTION: THIS IS NOT A ONE-LINE REORDER, AND THIS ROW SAID IT WAS.**
Auditor C read the ordering at source and reports a real hazard.

* `SpixiContentPage.webViewNavigating` calls `signalPreloadReady()` at
  `SpixiContentPage.cs:322-326`, and it runs **AFTER** the page's own handler by multicast
  subscription order. So `onLoad` has already issued `setPaneMode`, `setCaps` and one
  `addMember` per member when the present happens.
* A hoist keeps that issue order **only while it stays on the same synchronous turn**. Any
  `await` placed before `onLoad()` inverts it, and `setPaneMode` carries a documented
  invariant: pane layout FIRST, so the shell never paints a takeover layout that reflows.
* ⚠ **`deferPreloadReady` is the trap.** Setting it stops the base handler presenting, and
  the base handler is the belt that covers a skipped call. Hoist WITHOUT setting it —
  `presentPreload` is one-shot, so the second call is a no-op and the belt is kept.
* ★ **The premise is probably wrong.** A hoist moves the present earlier by ONE dispatcher
  turn. It cannot recover either candidate cost: the constructor, where `generatePage`
  re-localizes and rewrites a 168 KB shell to disk, or the WebView boot. **Read the probe
  before building.**

⚠ **The `[CDPERF]` probe therefore STAYS**, and its second measurement is still owed.
Remove it in L10 together with the shell's `ixian:cdpainted` emit and the four-line pin at
`smoke-test.mjs` — **in one batch, not in three files by three agents.**

The original entry follows.

`docs/cdperf-2026-08-29-android.md`. Bot room 250 ms to present against 111 ms for a private
group and 106 ms for a 1:1, and 541 ms to content against ~255 ms. Cause:
`ContactDetails.onLoad` enumerates the roster and pushes one `addMember` per member,
synchronously on the UI thread, before the present is even queued. Hoist
`signalPreloadReady()` ahead of it. ⚠ Read the doc for the ordering hazard.
★ **Keep the `[CDPERF]` probe until this is re-measured**, then remove it.

## L11 · The false "Fatal exception" on a language change (D4) — ✅ BUILT, session B (#657⑥). 🟡 Damir F5

★ **F1 TOOK THREE ATTEMPTS, and each one was found by the next review round.** The first
cut tested `Node.isRunning`, which reads a FAILED start as "already running" — it would have
silenced a true alarm. The second added `Node.startCounter`, and the third found that
`startCounter++` sat ABOVE the wallet read, which is the exact statement a device log names
as the observed zombie's throw site. `startCounter++` is now the last statement before
`return true`, and a new `Node.connectCounter` answers "did this process connect it".
The shipped guard is `Node.isRunning && Node.startCounter > 0 && Node.connectCounter > 0`.
F2 (`LastOrDefault`) shipped at seven sites; **two remain**, at
`Spixi/Pages/MiniApps/AppDetailsPage.xaml.cs:400` and
`Spixi/Platforms/Android/WebViewRenderer.cs:163`. F3 (`safeString`) shipped.
⚠ **Two BE rows came out of it: CORE-5 and CORE-6.** See `be-cutover-brief.md`.
The original entry follows.

`docs/fatal-language-change-2026-08-29.md`. `Node.start()` returns `false` for *"already
running"* as well as for a real failure and `HomePage` fatals on both, skipping
`connectToNetwork()`. Three fixes in the doc; F3 is partly ours because #636's Decline
widened the path into it. Damir: *"it works, I'm using the app, but if you know what the
issue is we will fix it later so it doesn't happen again to other users."*

## L12 · ⚠ UNVERIFIED — the bot-room half of kick/ban (#637/#638)
F5 6.1 came back n/a: *"i dont have admin rights with these test accounts, will test
another time."* **That is the half Damir asked to protect**, and a mistake there silently
removes a working feature. #637 is not done until someone walks it with real admin rights.

## L13 · ★ NEW, Damir 2026-08-30 — a "leave group" check box on Delete chat

> *"we need a 'leave group' check box when long press on a group in chats list and tap on
> delete chat. so similar to 1:1 where we offer to remove the contacts as well."*

The 1:1 shape already exists: `openRemoveContactSheet` offers "also remove the contact"
beside Delete chat, and `chats-row-menu.js:225` already answers "is this row a room" with
one `isRoomRow()` helper used by both destructive flows. So the FRONT END has the shape.

⚠ **VERIFY AT SOURCE BEFORE BUILDING. Leaving a group needs a REAL CORE VERB.**
**#253 already found that `undorequest` and `sendLeave` are not the same path.** Do not
assume one covers the other, and do not assume a verb exists because a name looks right.

★ **If no verb exists, do not build the check box.** A control that reports an outcome it
did not cause is a delivery lie — Damir's ⑪ rule — and it is worse than the missing option.
The honest order is: read the Core surface at `097341a`, answer whether a leave verb exists
and what it does to the roster on every other member's device, and then tell Damir what the
box can truthfully promise. If the verb is missing it becomes a BE row, not a build row.


## L14 · ★ NEW, Damir 2026-08-31 — a tab flickers into view before Wallet

> *"if i go to CHATS or APPS - then to account and then to Wallet - theres a brief flicker
> of either the chats or apps screen before wallet is shown. only in that order and only on
> wallet."*

The ordering is very specific, and that is the useful part of the report. The path is the
parked-Account re-present (#315) followed by the tab restore: Account is parked rather than
disposed, so the home shell comes back on the tab it left, paints it, and only then moves to
Wallet.

⚠ **VERIFY FIRST. MEASURE BEFORE ASSUMING** (#294). Two candidate mechanisms fit the words —
the re-present paints the old tab, or the tab restore runs one frame late — and they need
different fixes. This is the same rule that made L6 a three-symptom row.

★ Reproduce the ORDER exactly: Chats or Apps first, then Account, then Wallet. A flicker
that also appears without the Account step is a different defect.

★★ **PLATFORM, corrected by Damir 2026-08-31: ANDROID only so far. iOS is NOT checked.**
He rules it a MOBILE row until somebody looks at iOS.
⚠ **That reading agrees with the mechanism, which raises the confidence in it.** Account is
a parked PEER TAB on mobile only (#315). On desktop Account is a PANE (#245) and never
parks a tab, so the desktop path cannot produce this symptom. **A desktop repro would
therefore mean the mechanism above is wrong** — treat one as evidence against the theory,
not as a second bug.
🟡 **OWED: the iOS leg.** Walk the same order on iOS and record it here. Do not close the
row on Android alone.

## L15 · ★ NEW, Damir 2026-08-31 — the Windows language picker shows no flags

> *"Windows - Account - Language - no flags shown, just country abbreviations. on phone the
> flags are shown."*

⚠ **Same shell on both platforms.** So the difference is RENDERING, not logic — the picker
builds the same rows from the same dictionary on Windows and on Android.

★ **The leading suspect is flag emoji support in WebView2.** Windows ships no colour flag
glyph in its default emoji font, and a regional-indicator pair with no glyph falls back to
the two letters — which is exactly what Damir sees. Android's emoji font has the flags.

⚠ **VERIFY AT SOURCE FIRST.** Confirm the picker really emits regional-indicator pairs, and
confirm the fallback, before building anything. If it is confirmed, the fix is an ASSET or a
text treatment — a flag image set, or a deliberate two-letter style — **not a logic change**.

## L16 · ★ NEW, Damir 2026-08-31 — splash: a smaller logo, and no logo background in light mode

> *"Smaller logo on the splash screen and on light OS mode when splash is blue, remove the
> small logo background … small reduction in logo and light mode splash screen: #175595"*

⚠ **CORRECTION, Damir 2026-08-31.** An earlier draft of this row warned that the splash
*"cannot be theme-aware"*. **That was wrong.** He asked for a theme-aware splash and it was
built — **DECISIONS #534**, and the source says so. The claim is marked here rather than
deleted, because a wrong warning sends the next reader to the wrong file.

### Where each ground actually comes from — read at source

| OS theme | file | ground | icon |
|---|---|---|---|
| **light**, Android 12+ | `Platforms/Android/Resources/values-v31/styles.xml:15` | `windowSplashScreenBackground` = **#144576** | ★ **NONE declared** |
| **dark**, Android 12+ | `Platforms/Android/Resources/values-night-v31/styles.xml:18-19` | `#13171b` | `@drawable/spixi_splash_icon_night` |
| pre-31 | `Resources/layout/splash_screen.xml` · `layout-night/splash_screen.xml` | `#144576` gradient | the `@drawable/splash` bitmap |
| other platforms | `Spixi.csproj:145` `MauiSplashScreen` | `Color="#144576"` | `Resources\Splash\splash.svg` |

★★ **THE SQUIRCLE IS EXPLAINED, AND IT IS ONE MISSING LINE.** The light theme declares **no
`windowSplashScreenAnimatedIcon`**, so Android 12+ falls back to **the app launcher icon** —
and the launcher icon carries its own background layer, which the system draws inside the
splash mask. The dark theme supplies its OWN drawable and therefore has no background layer,
which is exactly what Damir's two screenshots show. The comment in `values-v31/styles.xml`
calls the launcher-icon fallback *"reads correctly"*; **this row reverses that judgment.**

### The work

1. **The blue, in three places:** `values-v31/styles.xml:15` · `layout/splash_screen.xml`
   (BOTH gradient stops) · `Spixi.csproj:145`. `#144576` → **#175595**.
2. **Remove the squircle:** add a LIGHT twin of `drawable/spixi_splash_icon_night.xml` and
   declare it as `windowSplashScreenAnimatedIcon` in `values-v31/styles.xml`. The system
   then draws our mark instead of the launcher icon, and the background layer is gone.
   ⚠ The night drawable is a WHITE mark; white also reads on `#175595`, so the twin can
   share the paths. Confirm the contrast before shipping it.
3. **A smaller mark:** the size is NOT `BaseSize`. It is the group transform inside the
   drawable — `<group translateX="26" translateY="26" scaleX="1.75" scaleY="1.75">` over a
   32-unit mark in a 108dp viewport, which fills about 52 % of it today. Lower the scale and
   re-centre the translate, in BOTH drawables so the two themes stay identical.
   ⚠ **Stay inside the 66 % safe circle.** #336 already shipped a mark that was too big and
   got clipped by the splash mask; the drawable's own comment records it.
4. **Pre-31 devices** read the `@drawable/splash` bitmap, a 140×283 tall lockup. A size
   change there is a different asset, not a transform. Decide whether it is in scope.

★ Verify on a device in BOTH OS themes. #534 records the standing limit: the OS splash
follows the **OS** theme, not Spixi's in-app override — a light OS with Spixi set to dark
still gets the light splash, and that is not a defect.

## L18 · ★ NEW, Damir 2026-08-31 — the logotype is blue in dark mode

> *"the Spixi logo and type on dark mode should be neutral01, and no longer blue, on light
> mode we keep it. its in the chats screen the title bar"*

★ **Traced to ONE declaration.** `src/styles/components/topbar.css:64`:

```css
.c-topbar[data-variant="root"] .c-topbar__title[data-logotype] { color: var(--text-action-default); }
```

That one line paints BOTH halves. The mark is an inline SVG on `currentColor`
(`topbar.css:67`) and the wordmark inherits the title ink, so the mark and the type can
never disagree. Built by the logotype branch at `topbar.js:73-84`.

`--text-action-default` is `--primary-600` in light (`tokens.css:541`) and `--primary-400`
in dark (`:765`). **Both are blue.** That is why dark shows blue.

### The fix, in this project's own grammar

⚠ **`tokens.css:435` states the rule: a component file NEVER carries a `[data-theme]`
selector.** So do NOT add a dark override to `topbar.css`.

1. Add ONE semantic token — a logotype ink role — to `tokens.css`.
2. Light block: point it at `--text-action-default`. **Light is unchanged, byte for byte.**
3. `[data-theme="dark"]` block: point it at the neutral-01 text role.
4. `topbar.css:64` consumes the new token. One word changes in the component.

★ **Why a token and not a second rule:** the theme answer lives in `tokens.css` in this
project, and #421 moved three JS copies of a per-theme derivation into CSS for the same
reason. A `[data-theme]` selector in a component file is the shape that decision retired.

⚠ **Check the other logotype homes before closing the row.** The root topbar is the chats
screen, but `data-logotype` is a flag any root variant can set. Grep for every consumer and
confirm each one wants the same ink. The desktop rail also shows a logo (`createBottomNav
logo:true`, #237) — verify whether it takes this rule or paints its own.

★ Cheap and low risk: one token plus one word. Safe to do early, like L17.

## L17 · ★ NEW, Damir 2026-08-31 — the launcher icon

> *"Fix the launcher icon - new logo svg used and better color- and smaller logo in the
> launcher (this can be done before we finalize work)"*

`Spixi.csproj:143` is `<MauiIcon Include="Resources\AppIcon\appicon.svg" Color="#000000" />`.

A smaller mark in the launcher means **more padding inside the SVG**, because every platform
masks the icon to its own shape and a mark drawn to the edge is cropped, not shrunk.

⚠ **Damir owes the NEW LOGO SVG.** That is his input, not ours. The colour and the padding
are ours once the asset lands.

★ **Damir marked this one safe to do early** — *"this can be done before we finalize work"*.
It touches no shell, no verb and no shared surface, so it can ride any session with room.

---

# Carried from the review queue, unchanged

* **Wallet tx rows shimmer on entry.** ★ Lead: `renderWalletTxList` (`wallet-shell.js:139`)
  empties and rebuilds every row and has **no avatar cache** — the chats list got
  `avatarCacheFor` (N58) for exactly this. Measure the flush cadence first (#294).
* **Avatars flicker in the chats rows "often."** That list HAS the cache, so either it
  misses a case or it is a different mechanism. One measurement first.
* **A group row's Delete has no confirmation** (F5 4.7): *"do we need it is the question.
  For now its ok."* 🟡 Open question.
* **Payment-request cancel** — the app half is closed (#635). F5 5.5 refines what is left:
  the CARD disappears correctly on both ends, in redesign AND legacy. Only the chats-list
  excerpt remains → CORE-2 in the cutover brief.
* **Tip in a bot room** — do not build; Damir wants to look at legacy first.
* **A delivery issue in a 6-member private group** — needs his repro.
* **The nine iOS rows**, on the office Mac.

# Ixian-Core rows (frozen — `be-cutover-brief.md`)

* **CORE-1 · kick/ban are empty cases.** Two changes: implement the handler, AND define who
  may send it. The frontend hides the rows until both land (#637).
* **CORE-2 · a receiver-side "Canceled"** for a payment request.
* **CORE-3 · the single check has no truthful trigger** (#649).
* **CORE-4 · `onMessageExpired` is called with a hardcoded 0** while the sibling
  `onMessageSent` passes the real channel. A bot room's expired message writes to the wrong
  channel. Mitigated on our side; the source fix is one word.
* **CORE-5 · is a repeat `connectToNetwork()` safe on a running node?** It decides whether
  the already-running arm may reconnect.
* **CORE-6 · `Node.start()` has no failure unwind.** `running` is latched before the first
  failure return and no path clears it.
* **The membership question** — the delivery walk answers *"any ADDRESS that reacted"*, not
  *"any MEMBER"*, because `Friend.addReaction` is frozen Core and absent. ⚠ Carried, not
  introduced.

---

# Deferred by Damir, carried into session C

* **The sticky `.c-money-cta` sits UNDER the iOS soft keyboard**, and
  `contact_details.html` publishes no `--kb-inset` at all. The one lever C# offers,
  `window.__setKbInset`, has no handler in that shell.
* **The iOS menu re-anchor runs on the FIRST resize only**, and the rows keep moving for up
  to 280 ms after it, because `--kb-inset` drives a composer margin with a 280 ms CSS
  transition and no resize event fires at the end of it. **The menu can point at one message
  and act on another.**
* ⚠ **CARRIED, not introduced: the blind-group same-nick roster collapse.** Two members with
  the same nick become ONE roster entry, so the denominator reads one short and the clamp
  turns an obvious `4 of 3` into a plausible lie.
