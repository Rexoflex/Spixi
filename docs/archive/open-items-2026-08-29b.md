# Open items — after the 2026-08-29 build session (#624–#637)

Supersedes `open-items-2026-08-29.md`. That document's queue is the source; this one
records what closed, what changed shape, and what is left.

**Baseline after this session** (every number verified in the container, all gates run):

```
bundle    299 exports        (298 → 299: attachAmountPreEdit)
shells    18
smoke     BASELINE OK — 3399 pass / the 3 known (#136 · M5 · B3)   (3302 → 3399)
locales   ALL CLEAN, 772     (773 → 772: three dead-end strings retired, two added)
cs-syntax 143 + 1 skipped    (144 → 143: WalletContactRequestPage deleted)
Ixian-Core 097341a
```

Every one of those four moves is deliberate and named. Anything else differing is a real
change.

---

## Closed this session

| Queue | What | Row |
|---|---|---|
| 1 · V-1 | The paste defect, all four surfaces, every locale | #624 |
| — | V-1(b), the foreign-convention half (fires on an EMPTY field too) | #625 🟡 |
| 2 · V-2 | The tip's native confirm | #626 |
| 3 · V-3 | The #620 pins read the bundle and are paired with behaviour | #627 |
| 4 · V-4 | `.5` enabled a Continue that did nothing | #628 |
| 5 · V-19/V-7 | The silent navigation drop — three reports, one mechanism | #629 |
| 6 | Chat info presents first, slides in, crossfades | #630 🟡 probe |
| 8 · V-5 | The 5-second task that outlives its page | #631 |
| 9 · V-8 | The bot-room "Owner" chip | #631 |
| 11 · V-10 | `messageQueue` → `ConcurrentQueue` | #631 |
| 13 · V-13 | The vacuous #623 pin | #632 |
| 14 · V-18 | Eight more weak pins | #632 |
| 16 | Decline on the card (supersedes #526) | #636 |
| 17 | The native payment page removed, properly | #635 |
| 20 | Kick/ban — Damir's option A | #637 |
| 23 · V-15 | The mini-app press residue | #633 |
| 24 · V-16 | The explore banner had no press feedback at all | #633 |
| 25 · V-14 | #618's row and the platform tap highlight | #633 |
| 26 | Remove contact — all four spec changes | #634 |
| 15 (half) | The unguarded `onViewPayment` lookup | #635 |

**Not built, deliberately:** V-11 / queue item 12 — a second `onLoad` spawning a second
`botReady` wait. Structurally true, not reachable on Windows or Android, and V-5's
`disposed` flag closes the outcome. Logged, not silently dropped.

---

## Damir's dials, open

1. **#625 — the foreign-convention paste.** It changes a settled heuristic on the money
   surface. The fence is pinned (nothing locally readable moves), but it is his call and
   backing it out is a two-line revert.
2. **#630 — the crossfade.** He asked to try the slide alone first. Both shipped; one look
   settles whether the crossfade earns its place.
3. **#633 — the explore banner's press grammar.** It takes the control scale (3%). A full
   width 84px card may want the row sweep instead, which needs a `::before` layer it does
   not have.
4. **#630 — the `[CDPERF]` probe comes out** once the number is read.

---

## New, from Damir's device run 2026-08-29 (evening)

**D1 · ★ CHAT INFO NEEDS A SLIDE-OUT ON CLOSE (Android).** Damir: *"I like the slide in
effect, it's great, makes it smoother — we just need a slide out when closing the chat
info on Android."* The slide-in landed in #630 (`slideStageIn`, trailing edge, 220 ms
CubicOut). Close is still an instant removal: `closeOverlay` drops the stage without a
reverse transform. ★ Do it as the mirror — translate to `+width` then remove — and reuse
the existing `#326` back-initiated close path, which already distinguishes a back-press
close from a programmatic one and already slides on iOS. ⚠ The teardown must not wait on
the animation: `closeOverlay` removes the stage from the host grid and Disposes the page,
and the overlay must leave `overlayStack` at the START, not 220 ms later, or back handling
and the same-tag sweep read a stale stack — the same rule that made the slide-IN
fire-and-forget.

**D2 · ★★ THE [CDPERF] MEASUREMENT IS IN — `docs/cdperf-2026-08-29-android.md`.**
Controlled run, one bot group / one private group / one 1:1. Three results:
· present-first is CONFIRMED working — present lands 7–18 ms after the document loads on a
  private group and a 1:1, where the old flat 120 ms hold put it 120 ms+ later;
· **#630's stated suspicion about `generatePage` was WRONG** — 37 ms cold, 17 ms warm, not
  the bottleneck, and a batch spent there would have bought nothing;
· ★ the real one — **the BOT ROOM presents at 250 ms against 111 ms for a private group and
  106 ms for a 1:1**, and reaches content at 541 ms against ~255 ms. `ContactDetails.onLoad`
  enumerates the roster and pushes one `addMember` per member, synchronously on the UI
  thread, before the present is even queued. It is a LARGE-roster cost, not a room cost —
  the private group's 7 ms says so.
★ NEXT ACTION: hoist `signalPreloadReady()` ahead of `onLoad()`'s roster work. Read the doc
for the ordering hazard — `webViewNavigating` presents after the page's own handler by
design, so it is not a one-line reorder. Keep the `[CDPERF]` probe until it is re-measured.

**D3 · ✅ CLOSED, no defect.** All seven opens in the first pass logged `group` and Damir
remembered three of them as 1:1s. The controlled run logged **`contact`** for the 1:1:
`isGroup` is correct and the first pass was simply seven room opens.

**D4 · ★★ A FALSE "Fatal exception" ON A LANGUAGE CHANGE — `docs/fatal-language-change-2026-08-29.md`.**
Damir, Android, mid-walk: a native **Fatal exception** dialog then a blank dark screen until
restart. **NOT from this batch** — the D-9 comment records the same symptom from
2026-08-15. Cause: `Node.start()` returns `false` BOTH for a real start failure AND for
*"it is already running"*, and `HomePage` treats both as fatal and returns before
`connectToNetwork()`. Proof: `safeFatalAlert` has three call sites and only this one spells
it **"Fatal exception"** (lowercase e); the others say "Fatal Exception", and the logcat
window carries the lowercase title. `running` in HomePage is an INSTANCE field, so a second
HomePage — which a language change creates — re-enters the start block.
★ Damir's call, 2026-08-29: **"it works, I'm using the app, but if you know what the issue
is we will fix it later so it doesn't happen again to other users."** So it is a row, not a
hotfix. Three fixes, in the doc:
· **F1** the false fatal — `Node.isRunning` already exists, so the distinction is available
  today. ⚠ Do NOT add a second `connectToNetwork()` call; that is not answerable from this
  tree and the node was already connected.
· **F2** `HomePage.OnUpdateUI:3257` calls `.Last()` on a possibly-empty navigation stack →
  `Sequence contains no elements`, logged in the same run. `LastOrDefault()` + a null check.
  Caught today, so it is noise — but noise in the exact window where real errors surface.
· **F3** `StreamProcessor.receiveData` — three unguarded `Encoding.UTF8.GetString(data)`
  call sites (the `ArgumentNullException` in the log) AND, in the `requestFundsResponse`
  case, a nullable `FriendMessage?` dereferenced unguarded on the NETWORK thread with the
  channel hardcoded to `0`. ⚠ **#636 WIDENED the path into F3**: before Decline, only a
  payment produced a `requestFundsResponse`. Partly ours to own despite the code being
  inherited — the same class as queue item 15, on the receive side.
⚠ Walking the money path meanwhile: set the language BEFORE starting a run and restart the
app between the German and English rows, rather than switching mid-session.

**D5 · ★★ MAJOR — THE LEGACY SEND AND RECEIVE SCREENS ARE STILL REACHABLE.**
Damir, device: *"When on chat info or contact details, and pressing SEND or RECEIVE it
fires the LEGACY SEND and RECEIVE SCREENS. Nothing legacy was supposed to exist in this
app anymore, we need to clean it out."* Confirmed at source — `contact_details.html:453-454`
emits `ixian:send` / `ixian:request` and `ContactDetails.xaml.cs:392-399` pushes
`WalletSendPage` / `WalletReceivePage`. ★ **`contact_details` is the ONLY live route**;
every other push site is an old-exe fallback the shipped shell never takes, or has no
emitter at all. The redesigned answer already exists and is proven in `chat.html`
(`openSendTakeover` / `openRequestForPeer`, the `composeSend` / `composeRequest` caps,
`ixian:signSend` and `ixian:sendrequest`). Full inventory and the two-part fix in
`docs/walk-results-2026-08-29.md`. ⚠ `WalletRecipientPage` STAYS — `AppDetailsPage` and
`HomePage` still push it.

**D6 · ★★ THE F5 WALK RESULTS — `docs/walk-results-2026-08-29.md`. 37 pass, 3 fail.**
· **6.2 FAIL, fixed:** TWO member sheets offer Kick/Ban and option A gated only the
  chat-info one; the in-chat sender tap was open. V-8's pattern repeated on the day its
  lesson was pinned. Both gates now asserted in ONE pin.
· **7.3/7.4 FAIL, fixed:** V-15 fixed a real ghost but NOT the reported one. Damir's
  "native sharp rectangle blue tint" is the PLATFORM highlight — `.c-app-item__open` had
  no `-webkit-tap-highlight-color`. Third instance in one batch after V-14 and V-16, so
  the kill moved to the BODY, mirroring #322's identical move for user-select. V-15's
  pressable.js change stays; it is orthogonal.
· ⚠ **6.1 n/a — the BOT-ROOM half of option A is UNVERIFIED** (*"i dont have admin rights
  with these test accounts"*). That is the half he asked to protect. Needs a real admin
  account before the batch is called done.
· **5.5** refines queue item 15: the canceled CARD disappears correctly on both ends in
  redesign AND legacy. What is left of that row is the chats-list excerpt only.
· **4.7 🟡 open question:** a group row's Delete has no confirmation dialog. *"do we need
  it is the question. for now its ok."*
· **5.4** was written from a premise the app does not allow — a payment request cannot be
  sent to a group at all. The `canSheet` guard stays (one CAN arrive over the wire).
· Dials: crossfade KEEP (+ slide-out, D1) · explore banner KEEP · #625 KEEP.

## Still open, unchanged in substance

**7 · the #619 reveal hoist.** Logged, not urgent — his bot room opens fast. What remains
slow is measured and unbuilt in `docs/bot-group-load-freeze.md` §2/§3.
⚠ DECISIONS #619's claim *"the page presents at once and the shell shows the skeletons"*
is still FALSE as built and still owed a correction in writing.

**10 · V-9 `hidesParticipants`** — already fixed and pinned before this session.

**15 · the payment-request cancel ghosts.** The app half is closed (#635). The receiver-side
"Canceled" needs a protocol verb → **CORE-2** in the cutover brief.

**18 · Account → Contacts: the rail jumps to Chats.** `consumeLandTab` (`home.html:1249`)
sets the nav to chats before mounting the takeover. The rail half is frontend-only; the
desktop right pane needs a HomePage verb (drop the detail content, restore on close).
Untouched this session.

**19 · "Mark as read".** No backend verb at all. Needs the C# verb, a persisted count and
receipts. Untouched.

**21 · OS back from create/restore does not return to welcome.** ★ Start with the log line:
`LaunchPage.xaml.cs` logs `"LaunchPage back: view=… overlay=…"` on every press and it has
never been read on a device.

**22 · The Terms / language / privacy sheets render LIGHT in a dark phone.** Launch is the
one shell calling `ignorePushedTheme`; the likely consequence is that it never adopts the
OS theme either.

**27 · Wallet tx rows shimmer on entering the screen.** ★ Lead: `renderWalletTxList`
(`wallet-shell.js:139`) empties and rebuilds every row and has **no avatar cache** — the
chats list got `avatarCacheFor` (N58) for exactly this. Check the flush cadence first
(#294): one measurement before any fix.

**28 · Avatars flicker in the chats rows "often".** That list HAS the N58 cache, so either
the cache misses a case or it is a different mechanism. One measurement first.

**29 · Tip in a bot room.** Do not build — Damir wants to look at legacy first.

**30 · A delivery issue in a 6-member private group.** Needs his repro.

---

## New rows from this session

**CORE-1 · kick/ban** — Ixian-Core, two changes (implement the handler; define who may
send it). In `be-cutover-brief.md`. The frontend hides the rows until both land.

---

## Owed by Damir

* The nine iOS rows, on the office Mac. Two rows are iOS-only and a clean Android walk will
  not clear them (the ghost repaint, already built, and the #606 family).
* `#565 ②`'s `[RESTOREDIAG]` lines from a restore-then-restart.
* The `[CDPERF]` lines from two chat-info opens (§3.3 of the F5 checklist).
* The four dials above.
