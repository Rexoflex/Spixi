# LAUNCH WORKLIST — everything left before this app ships

Written 2026-08-29, after the #624–#641 batch and Damir's F5 walk (37 pass / 3 fail, all
three fixed in session). **This is the single queue now.** It supersedes
`open-items-2026-08-29.md` and `open-items-2026-08-29b.md`, both archived.

Two sources are merged here: **Damir's own pre-launch list**, given in his words, and what
remains of the review queue. Where they overlap the row says so, because several of his
items already had a lead in the queue and the lead is the fast half of the work.

**Baseline** — ⚠ **THREE NUMBERS MOVED IN SESSION A, on purpose:**
```
bundle 299 · shells 18 · smoke BASELINE OK 3474 / the 3 known (#136 · M5 · B3)
· locales CLEAN 774 · cs-syntax 140+1 · Ixian-Core 097341a
```
* **cs-syntax 143 → 140** — L1 part B DELETED three C# pages.
* **locales 772 → 774** — two copy keys for the L2 read detail.
* **smoke 3402 → 3474** — 72 new pins, 22 of them from the adversarial loop.

The pre-session baseline was `bundle 299 · shells 18 · smoke 3402 · locales 772 ·
cs-syntax 143+1`. If you are reading this before session A lands, use that one.

---

# THE PLAN — three sessions, plus a fourth for polish

Agreed with Damir 2026-08-29. **Every session ends with him walking it on device; the walk
is the gate, not the suite.** A row is not done because the pins are green.

| | rows | why they go together |
|---|---|---|
| **A** ✅ | **L1 · L2 · L8** — BUILT 2026-08-29, DECISIONS #642–#645, awaiting Damir's walk | The two he named, plus the slide-out. L1 and L2 both live in the chat / contact-details surfaces, and L8 is the mirror of work already in the tree. All three are traced to the line, so the session is build-and-verify, not investigate. |
| **B** | **L6 · L7 · L5 · L11 · L10** | The Account and Chats defects plus the two logged ones. Smaller and more separable than A, so a slip here costs one row rather than the session. Ends by REMOVING the `[CDPERF]` probe once L10 is re-measured. |
| **C** | **L3 · L4 · L9** + the two flicker rows | The gesture batch. L3 and L4 are one subject — back semantics — and doing them apart would mean deciding the same rule twice. L9 and the flicker rows are the polish that fits alongside. |
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

## L5 · Launch sheets are light on a dark phone (queue 22)
> *"Welcome/Create — while the phone is in dark theme, the terms/languages/privacy sheet is
> in light mode. I think it should follow the phone theme."*

Launch is the one shell calling `ignorePushedTheme`. Likely consequence: it never adopts the
OS theme either. ⚠ #203/N73 made launch deliberately brand-dark in BOTH themes — so check
whether the SHEETS were meant to be exempt from that, or whether the exemption over-reached.

---

# P2 — Account and Chats

## L6 · Account → Contacts: the rail jumps, and the right pane opens a chat (queue 18)
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

## L7 · "Mark as read" — ✅ RULED BY DAMIR 2026-08-29: **REMOVE IT.** *"we decided to remove the mark as read from chat row menu, no need to force it."* No C# verb, no persisted count, no read receipts. Delete the row from the chats row menu. Small FE change, session B.
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

## L10 · The bot room presents 140 ms late (D2)
`docs/cdperf-2026-08-29-android.md`. Bot room 250 ms to present against 111 ms for a private
group and 106 ms for a 1:1, and 541 ms to content against ~255 ms. Cause:
`ContactDetails.onLoad` enumerates the roster and pushes one `addMember` per member,
synchronously on the UI thread, before the present is even queued. Hoist
`signalPreloadReady()` ahead of it. ⚠ Read the doc for the ordering hazard.
★ **Keep the `[CDPERF]` probe until this is re-measured**, then remove it.

## L11 · The false "Fatal exception" on a language change (D4)
`docs/fatal-language-change-2026-08-29.md`. `Node.start()` returns `false` for *"already
running"* as well as for a real failure and `HomePage` fatals on both, skipping
`connectToNetwork()`. Three fixes in the doc; F3 is partly ours because #636's Decline
widened the path into it. Damir: *"it works, I'm using the app, but if you know what the
issue is we will fix it later so it doesn't happen again to other users."*

## L12 · ⚠ UNVERIFIED — the bot-room half of kick/ban (#637/#638)
F5 6.1 came back n/a: *"i dont have admin rights with these test accounts, will test
another time."* **That is the half Damir asked to protect**, and a mistake there silently
removes a working feature. #637 is not done until someone walks it with real admin rights.

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
