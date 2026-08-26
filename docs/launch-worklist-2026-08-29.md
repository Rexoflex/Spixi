# LAUNCH WORKLIST — everything left before this app ships

Written 2026-08-29, after the #624–#641 batch and Damir's F5 walk (37 pass / 3 fail, all
three fixed in session). **This is the single queue now.** It supersedes
`open-items-2026-08-29.md` and `open-items-2026-08-29b.md`, both archived.

Two sources are merged here: **Damir's own pre-launch list**, given in his words, and what
remains of the review queue. Where they overlap the row says so, because several of his
items already had a lead in the queue and the lead is the fast half of the work.

**Baseline** (verified in the container, all gates):
```
bundle 299 · shells 18 · smoke BASELINE OK 3402 / the 3 known (#136 · M5 · B3)
· locales CLEAN 772 · cs-syntax 143+1 · Ixian-Core 097341a
```

---

# P0 — the two Damir called out by name

## L1 · ★★ THE LEGACY SEND AND RECEIVE SCREENS (#640)

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

## L2 · ★★ GROUP DELIVERY TICKS NEVER ADVANCE (#641)

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
our own C# can derive the group answer before pushing:
· **delivered** when the `received` reaction set is non-empty — "delivered to some";
· **read** — Damir's ruling: **strike it in groups.** A tick that can never arrive is worse
  than no tick.
⚠ Do not widen Core's threshold. It is frozen, and the derivation is ours to make.

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

## L7 · "Mark as read" does not mark as read (queue 19)
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

## L8 · Chat info needs a SLIDE-OUT on close (D1)
> *"I like the slide in effect it's great makes it smoother, we just need a slide out, when
> closing the chat info on Android."*

The mirror of `slideStageIn` (#630): translate to `+width`, then remove. Reuse the `#326`
back-initiated close path, which already distinguishes a back-press close and already
slides on iOS. ⚠ The overlay must leave `overlayStack` at the START of the close, not
220 ms later — the same rule that made the slide-IN fire-and-forget.

## L9 · Where else does a slide-in earn its place?
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
