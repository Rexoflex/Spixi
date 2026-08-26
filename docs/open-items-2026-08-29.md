# Open items — after the #46 loop on #596–#623, 2026-08-29

Supersedes `open-items-2026-08-28.md`. The loop's evidence is in
`docs/opus-review-verdict-596-623.md` — read that for the reproductions; this is the queue.

**Baseline after this session** (all verified):
bundle **298** · shells 18 · smoke **BASELINE OK 3299** / the 3 known (#136 · M5 · B3)
· locales CLEAN 773 · cs-syntax 144+1 · Ixian-Core `097341a`
⚠ bundle 297 → 298 and smoke 3288 → 3299 are DELIBERATE: one new export
(`clearChatRowMenuTimers`) and eleven new pins. Anything else differing is a real change.

---

## Decisions Damir took, 2026-08-29 — these are settled

1. **A preset TIP gets a review sheet**, like Wallet Send.
2. **"Mark as read" is wired properly** — persist the count AND send the read receipts.
3. **Decline lives on the CARD only**, and the outcome shows on both sides.
4. **The native payment page is REMOVED, properly.** *"Nothing of legacy must exist in the
   new app. It shouldn't be in the code. If we are missing anything we will build newly."*
5. **The call glyphs: the chats-row excerpt is the reference.** ✅ built.
6. **Kick and ban are hidden** for the owner; the capability may come later.
7. **Blind-group status is not a defect** — he sees normal statuses now. Row retired.
8. **A cold bot room opens fast on his device** — so the #619 reveal hoist is NOT urgent for
   the chat. ★ **Chat info is the target instead**: *"ideally it slides from the right
   instantly with skeletons until we have data, and a nice transition to the content."*

---

## ✅ BUILT AND PINNED THIS SESSION

* **The call-glyph disagreement (V-17).** The chats row was right; the call CARD still
  carried the pre-swap pair, so one declined call showed two different glyphs on two
  surfaces. Fixed, the stale rationale rewritten, and a pin now reads the BUILT bundle and
  requires the two surfaces to agree. A second pin requires BOTH glyph keys in the registry.
* **The ghost repaint ran on a detached node (V-12).** `repaintRowGhost` sat above
  `listEl.append(node)`, so it removed the ghost unconditionally and then declined to paint
  (a detached node measures all zeros). Every flush killed the ghost for the life of the
  menu. Moved below the append; two order pins over the bundle.
  ⚠ Visible symptom is **iOS-only** — on Android the z-index lift still works.
* **The stray row menu (Damir, Android).** *"Sometimes when I get back to the chats list it
  lands with a row lifted, the background dimmed and the dropdown shown."* The 500 ms
  long-press timer is wall-clock and is cancelled only by a release ON THE SAME NODE.
  `renderChatsList` replaces every row on every flush — and opening a chat clears its unread,
  which is itself a flush — so the release goes to the new node and the old timer fires into
  a shell the user has left. `liftPressedRow` then re-finds the live row by address, which is
  why the stray menu looks fully formed. Fixed the #589 way: the SCREEN cancels
  (`clearChatRowMenuTimers`, called by `renderChatsList` before it detaches), plus
  `visibilitychange`/`pagehide`, plus a `document.hidden || !row.isConnected` belt at the
  fire. Six pins, three of them behavioural — including one that proves a NORMAL long press
  still opens the menu, because two negatives alone go green on a build with no feature.

---

## P1 — the money path. Nothing outranks this.

**1. V-1 · A paste into a non-empty amount field sends the wrong amount.** MAJOR,
reproduced against the shipped bundle on all four money surfaces, every shipped locale.
`de-de`, field `5`, select-all, paste `12.75` → **127 500 000 000 units** on the wire.
`src/components/money.js` — the router keys on *the field was not empty*, which is not the
same as *these separators are ours*.
⚠ The fix is NOT "route every paste to the settled heuristic" — that reintroduces the r2
MAJOR-1 regression. Capture `value`/`selectionStart`/`selectionEnd` in a `beforeinput`
listener at the three call sites and use the settled heuristic only when the edit replaced
the WHOLE previous value.
★ The pin must be behavioural, per locale, against the built bundle, asserting the value
delivered to `onQuote`/`onSend`/`onTip`/`onSendRequest`.

**2. V-2 · The TIP signs and broadcasts with no native confirm.** MAJOR.
`SingleChatPage.xaml.cs:1605` → `new IxiNumber(data)` → `addTransaction`, with no
`displaySpixiAlert` and no `confirmAndAuth`. A CLAUDE.md ground-rule breach on its own, and
the reason V-1 is silent on the tip. **Decision 1 above is the fix** — the review sheet.

**3. V-3 · The #620 pin cannot see what ships.** `scripts/smoke-test.mjs:16345` reads
`src/`. Proven: the money-spending Enter handler put back INTO THE BUNDLE ONLY leaves the
suite at `BASELINE OK` with all three #620 pins green. Read the bundle, and make the pin
behavioural over all three amount surfaces.

**4. V-4 · A typed `.5` gives an enabled Continue that does nothing.** `valid()` accepts it,
`openPaymentReview` rejects it and returns null. `canonicalAmount()` at both boundaries.

## P2 — the silent navigation drop. One mechanism, three reports.

**5. V-19 / V-7 · `pushPageLoaded` DISCARDS a navigation while another page is staging** —
silently, with no answer to the shell.
* Damir, Windows: *"click through the chats list too fast and it doesn't register"* (the
  previous chat stages with a 4000 ms budget).
* Damir, Windows: *"sometimes the first click doesn't open the chat"* (the Account page is
  warm-parked 900 ms after first paint, with a **6000 ms** budget).
* Row C8: the notification tap that never opens the chat.
★ A **user-initiated** navigation must WIN over an in-flight stage — cancel the preload
(`cancelPreload` exists) and stage what was asked for. The warm park always yields. Anything
that still drops must ANSWER the shell so the row can un-arm instead of lying.
⚠ `#612`'s `blocked` also needs `preloadPending || activePreload != null` — but that alone
only makes the deep link wait; it does nothing for a click.

## P3 — present-first, the thing Damir can feel

**6. Chat info opens instantly with skeletons, and transitions into the content.**
★ The skeletons already exist (`chat-info.js`, A8: skeleton avatar + line rows, giving up
after 2.5 s). They are never seen because the page is assembled off-stage and only slid in
when it is finished. Same rule as the chat: **show the frame, fill it as data lands.**
He wants the slide-from-the-right kept and the content to arrive with a transition, not a
snap. ⚠ C# presentation — `cs-syntax-check` PARSES, it does not COMPILE (#593). This needs
a real build before it is called done.

**7. The #619 reveal hoist — LOGGED, not urgent.** His bot room opens fast now. The wait is
for `botInfo` + the default channel, not for messages, and both are on disk after a first
sync. What remains slow for the Spixi room is measured and unbuilt:
`docs/bot-group-load-freeze.md` §2 (one process-boundary crossing per message, 100+ per
open) and §3 (a full directory scan per open).
⚠ DECISIONS #619 claims *"the page presents at once and the shell shows the skeletons"* and
that is **false as built** — correct it in writing whatever else happens.

## P4 — the C# findings from the loop

**8. V-5 · #619 leaves a 5-second task that outlives its page.** `popPageAsync` falls through
to `Navigation.PopAsync` on a disposed, never-pushed page. Fix: `volatile bool disposed`, set
in `Dispose()`, checked in the third branch — it also closes the #328 residual for every
caller. Provable on Windows and Android.

**9. V-8 · A bot-room member still wears an "Owner" chip.** `ContactDetails.xaml.cs:114`
gates on `!blind` alone; `amOwner` three lines down is correctly gated on `type == Group`.
#616 fixed the twin surface, which #249 records as unreachable, and left the live one.
★ #613 WIDENED it — a flagged bot room used to suppress the owner and now pushes one.
One-line fix, matching `SingleChatPage:721` verbatim.

**10. V-9 · `hidesParticipants` failed OPEN — ✅ ANSWERED ON DEVICE AND FIXED.**
Damir, Android, 2026-08-29, cold start into a private group as the first action: *"private
group is quite smooth, member list shows correct straight away, and the group conversation
loads fast."* The unknown window is not observable in practice, so masking on unknown costs
nothing. `Utils.hidesParticipants` now returns TRUE for a Group whose `metaData`/`botInfo`
has not arrived — stricter than legacy, so it cannot introduce an exposure; a bot room and a
1:1 are untouched. Three pins, one of them asserting the GROUP test still runs FIRST.
⚠ `cs-syntax-check` PARSES, it does not COMPILE (#593). This changes no call site, but it
still wants a real build before it is called done.

**11. V-10 · `messageQueue` is a plain `Queue<string>` written from two threads.** Real,
but PRE-EXISTING — `loadMessages` already ran on a `Task.Run` before this batch.
`ConcurrentQueue<string>` is a one-line change with no behaviour delta. Not a batch gate.

**12. V-11 · A second `onLoad` spawns a second `botReady` wait.** Structurally true, not
reachable on Windows or Android. Optional once V-5 lands.

## P5 — the pins. Do these WITH the fixes, not after.

**13. V-13 · The #623 pin is VACUOUS** — `friend.bot` occurs zero times in the file it
searches, so it asserts only that the method exists. It is the pin holding the batch's most
contested change. `/\.bot\b/` over the same slice; mutation-proven to trip.

**14. V-18 · Eight more weak pins, every one mutation-proved:**
`:16916` (#605 ring — only the VALUED attribute) · `:16577` (#603 — 3600-char window on a
6256-char function) · `:16602` (#602 — checks one glyph key of two; ✅ fixed this session) ·
`:846` (#596 hero — the fixture guarantees the assertion) · `:16375` (#619 — `popPageAsync();`
occurs 4×; the alert is not asserted at all) · `:16439` (#613 — two whole-file needles, each
occurring 3×) · `:16458` (#612 — `indexOf` lands in the wrong branch, needle occurs 5×) ·
`:16472` (#612 — asserts a COMMENT).
★★ The batch's four newest C# pins ALL pass on the reverted bug. The "17 of 17 mutations
caught" figure measured the mutation harness, not the pins.

## P6 — the rest of Damir's list, unchanged in substance

**15. Payment request CANCEL leaves ghosts on both trees.**
Cancel rides `msgDelete`. New counterpart: the card goes, the chats-list excerpt stays
("payment request received"). Legacy counterpart: the card survives a restart, and Pay then
hits `WalletContactRequestPage.onSend:139`, which dereferences a null `requestMsg` — the
white error page he sees. Our own `onViewPayment` has the same unguarded `Find`.
★ A receiver-side "Canceled" needs a protocol verb — a BE row. `#529` predicted it.

**16. Decline on the payment-request card.** The component already has the `onDecline` slot
and renders it only when a host wires it. `WalletContactRequestPage.onDecline` is the working
implementation to extract: `requestFundsResponse` with the msg id and no txid, local copy
prefixed `::`, `chat-payment-status-declined` pushed. It sends a message; it spends nothing.

**17. Remove the native payment page** (decision 4). `WalletContactRequestPage`, both push
sites (`SingleChatPage:1328`, `HomePage:1391`), and the `onViewPayment` route into it. The
four `canSheet === false` fallbacks need an honest answer instead. Null guards land anyway.

**18. Account → Contacts: the rail jumps to Chats, and the desktop right pane shows a chat.**
One function: `consumeLandTab` (`home.html:1249`) does `activeNav = 'chats'`,
`setNavActive('chats')`, `showView('chats')` and sends `ixian:tab:chats` BEFORE mounting the
takeover. The rail is frontend-only. ★ Damir: from Account the rail must STAY on Account, and
the desktop right pane must keep the **Account empty pane** — that half needs the HomePage
verb (drop the detail content, restore on close).

**19. "Mark as read" (decision 2).** There is no backend verb at all — `home.html:1354` says
pin, mute and markRead are local-only. Needs the C# verb, a persisted count, and receipts.

**20. Private groups: hide kick and ban for the OWNER** (decision 6). `chat-info.js` already
hides the row for owner/admin TARGETS; this is the mirror case.

**21. OS back from create/restore does not return to welcome.** #614 fixed only the SHEET
layer. ★ Start with the log line: `LaunchPage.xaml.cs` logs `"LaunchPage back: view=… overlay=…"`
on every press and it has never been read on a device.

**22. The Terms / language / privacy sheets render LIGHT in a dark phone.** Launch is the one
shell calling `ignorePushedTheme`; the likely consequence is that it never adopts the OS theme
either.

**23. The mini-app press residue.** V-15: **#604's guard is unreachable by the gesture it was
written for** — the reported bug follows a committed tap, so `pointerDown` is already false
and the `else` branch runs, byte-identical to before the fix. Reproduced against the shipped
bundle. Fix: latch `cancelled` regardless of `pointerDown`, with the existing safety expiry;
`onDown` already clears the latch on a real new tap. Android-only.

**24. #622 left the explore banner with NO press feedback at all.** It removed the platform
highlight and handed ownership to `pressable.js` in the comment only. `.c-apps-explore` is in
neither press family and has no `:hover`, `:active` or `transition`. Add it to
`PRESSABLE_CONTROL`. Desktop is affected too.

**25. #618's new chat-info row is the only control on that screen with Android's native tap
highlight.** Ten siblings in the same file carry the kill; the new rule does not, and no
global reset exists. One declaration.

**26. Remove contact — one flow, four changes.** `docs/remove-contact-spec-2026-08-28.md`,
unchanged. Build order 4 → 3 → 1 → 2.

## P7 — NEW, from Damir 2026-08-29, not previously logged

**27. Wallet: the tx rows shimmer or flicker on entering the screen.**
★ LEAD, and it is a strong one: `renderWalletTxList` (`wallet-shell.js:139`) does
`listEl.textContent = ''` and rebuilds every row, and — unlike the chats list — it has **no
avatar cache**. Chats got `avatarCacheFor` for exactly this (N58); the wallet list never did,
so every flush re-creates and re-decodes every avatar. Check the flush cadence on the wallet
tab first, then port N58's cache.

**28. Avatars flicker in the chats rows too, "often".** The chats list HAS the N58 cache, so
either the cache is missing a case or the flicker is a different mechanism. Needs one
measurement before any fix (#294).

**29. Tip in a bot room — still blocked, and now for a new reason.** Damir: *"apparently
legacy has issues too, need to see what the issue is."* Do not build it.

## Still owed by Damir

* The nine iOS rows, on the office Mac — they settle every UNVERIFIED row in the batch.
  ★ Two rows in THIS document are iOS-only and a clean Android walk will not clear them:
  the ghost repaint (built, item above) and anything in #606's family.
* `#565 ②`'s `[RESTOREDIAG]` lines from a restore-then-restart.
* The legacy check for item 29.

---

## Four more decisions, taken on the phone 2026-08-29 (later the same evening)

9. **Chat info: CROSSFADE over the skeletons.** The skeletons fade out as the real rows fade
   in, in place. Not a per-row swap as data trickles, and not a hold-then-swap.
10. **A user click ALWAYS WINS a staging page** (queue item 5). Cancel whatever is staging
    and open what was tapped; the background warm-park always yields. This settles the fix
    shape — it is not "make the deep link wait".
11. **The blind mask (queue item 10): CHECK ON DEVICE FIRST**, per #215. Do not change the
    direction blind.
    ★ THE CHECK, for Damir, on Android: restart the app cold, then open a normal PRIVATE
    group as the first thing you do. Watch the member list in Group info for the first
    second. If member rows are correct immediately, the unknown window is not real in
    practice and the one-line fail-closed fix is safe. If you ever see `[Unknown]` rows that
    then resolve into names, masking-on-unknown would make that WORSE and we need a
    different answer.
12. **Next session starts on the money path**, items 1–4. Confirmed.

## Logged, from the same evening

30. **A delivery issue in a 6-member private group.** Damir: *"I just noticed some delivery
    issue with 6 members, but that's probably a BE call."* Not investigated. Nothing in the
    frontend queue touches group delivery. Needs his repro before it is worth a row.
