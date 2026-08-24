# Handover — the F5 fix session + Batch E + three fold-ins (2026-08-25)

**Everything the entry prompt ordered LANDED, plus four Damir-ordered fold-ins,
loop-CLEAN after THREE Opus rounds.** DECISIONS **#553–#563**. All UNCOMMITTED
on top of `0acd5ada`, delivered via the `_deliveries/` tarball + bridge.

## What landed

- **F5-3 (#553)** restore race: EnsureNodeRunning guards (wallet loaded +
  `Node.startCounter` ownership boundary; the wipe resets the counter) + the
  node-loop fetch wallet clause.
- **F5-1 (#554)** missed call — TWO mechanisms, both found by the loop:
  the VoIP session-check thread race (deferred ordering re-check, mini-app
  fall-through kept on its thread) AND ★ the `endVoIPSession` cancel predicate
  that made the "Missed call" re-post UNREACHABLE CODE (calleeAccepted latches
  at ring time). + R-2: a locally DECLINED call never reads back as missed.
  The cold-push kind gap stays BE (`security-review-for-be-engineer.md` §1e-5).
- **F5-2 (#555)** bot-removal crash: DIAGNOSTIC only (no logcat, no fix —
  #294). UnhandledExceptionRaiser hook + flushed [CRASHDIAG] breadcrumbs on all
  THREE leave paths. ⚠ Damir still owes `adb logcat -d` on repro.
- **F5-4→#560 / F5-5 (#556)**: address-sheet polish (QR at Account
  proportions · desktop persistent slim scrollbar · flat explainer glyph); the
  picker "flat" call was SUPERSEDED same-day by Damir's screenshots → the
  send picker + receive roster wear the CONTACTS-DIRECTORY card VERBATIM
  (parity-pinned), the 32→16 double side inset fixed, and **Receive lost its
  capped 5-row inner scroller** — full-length list, page scrolls, STICKY
  "Send request".
- **F5-6 (#558)** dial answered **B**: "Select a recipient to use Max." hint,
  localized ×13.
- **Batch E (#557)**: (a) mobile ANCHORED DROPDOWN for the message menu + the
  chats-row menu (`anchorSheetToRow` — above the pressed row, safe-area
  bounded, own scroller; the 4.1 fix structural; #519 z-order re-verified,
  no new z-index) · (b) mobile scrim 0.6→0.7 (`--surface-scrim-deep`) ·
  (c) #268 stands; `[data-dt-ctx-source]` retuned to the press wash,
  `:not([aria-current])` guarded · (d) Account QR + "What is this address?" =
  `openAddressSheet` REUSE (the hub's inline QR construction retired;
  chat-info keeps its own) + the dev-HUD rail offset rider.
- **#561** row swipe: OFF on desktop (mouse ≠ swipe, the stuck drawers);
  mobile commit-fire SETTLES before the action (transitionend filtered to the
  content's transform + 280 ms belt).
- **#562** outgoing request: **HIDE, don't destroy** (Damir's pick after his
  dead-chat repro — a revoked-then-accepted request could never deliver).
  Both surfaces (row menu "Hide request" + the chat waiting strip) open ONE
  explain-flow; NO verb is sent — the Friend record lives, so a later accept
  completes and the tombstone's evidence rule resurrects the chat. The hide is
  DURABLE (`spixi.hidereq.<addr>` IS the tombstone; boot-seeded; evidence
  clears it; arming is evidence-decided too — r3 MINOR-2).

## The loop (#559/#563)

`docs/opus-review-verdict-f5-batch-e.md` + three r1 reports beside it. Three
rounds, PASS. Headline catches: the unreachable re-post (A-1) · the NaN
safe-area read (R-1 — an unregistered custom property never computes to px;
measure through a probe element) · declined≠missed (R-2) · 5 vacuous rebased
pins (the moved-file class) rebuilt and mutation-proven. Carried lessons are
in DECISIONS #559.

## Pipeline at delivery (THE NEW BASELINE)

bundle **292 exports** · shells **18** · smoke **BASELINE OK 3040 / the 3
KNOWN (#136 · M5 · B3)** ⚠ was 2996 · cs-syntax **144 + 1** · locales
**CLEAN, 771 keys** (revoke*→hide* wash) · Ixian-Core `097341a` untouched.
⚠ C# changed in 7 files → **wipe `obj`/`bin` (#387)**.

## Damir's walk

The **"Menu Batch F5" artifact** (34 items, per-item notes) · offline twin
`docs/f5-checklist-2026-08-25-f5-batch-e.md`. The dials inside: **E-3** (chats
row under the deeper scrim has no lift — needs the #506② stacking check before
building) · item C10 still needs **the logcat** for F5-2.

## Queued (specified, not built)

1. **Recipient-side honest accept** (#562 ④): accepting a request should hold
   the #109 handshaking grammar until the sender's side actually responds —
   needs a small C#-side completion signal (ours). Rides with RC1's evidence.
2. **Privacy toggles** (Damir: v1.1+ pipeline): typing indicators = zero-C#
   (shell stops emitting `ixian:typing` + stops rendering the pill);
   read receipts = ~5 lines of OUR C# (`SingleChatPage.xaml.cs:2451` gates the
   `msgRead` send on a preference + one NOTIF-2-grammar verb). `createPrivacy`
   exists, gated. **v1.1 — stays OUT of the v1 worklist.**
3. F5-2's real fix — after the logcat names the site.
4. The F5-2 hook's verbatim exception log: RETIRE or logSafe-wrap when F5-2
   closes (gate row carries the condition).

## BE rows added

`security-review-for-be-engineer.md` §1e-5 (the push payload carries no
message KIND — the cold lane cannot classify call pushes). RC1 now carries the
dead-chat repro as evidence.

## Commit

Staging list + message: `docs/commit-2026-08-25.txt` /
`docs/commit-message-2026-08-25.txt`. Never `git add -A`. `git push` from your
own shell.

## §WALK-DAY (2026-08-25, appended live) — what landed after the batch delivery

Rounds #564–#571, all in the working tree (delta tarballs 1+2, hash-verified
on the desktop):

- **#564** empty restore alert → 4 keys ×13 lang files + `??` fallbacks. The
  ALERT is fixed; the PICKER failure underneath is **#568** (root-caused:
  WinUI FileOpenPicker throws E_FAIL inside MAUI — fallback build = next
  session, ask Damir about run-as-administrator first).
- **#565** backup/restore hardenings (forward-slash zip entries · stray
  rehoming · exists-guards). ② contacts-on-3rd-restart STAYS OPEN — the owed
  capture must cover HomePage boot through loadChats (#571 has the log
  verdict). History dial answered: excerpts stay (clearing lastMessage would
  break #219 request detection — not cheap).
- **#566/#567** the bot-leave crash: root cause = frozen-core getClient
  self-recursion (BE §1e-6); mitigation BUILT at all 4 leave sites (sendLeave
  → immediate removeFriend, pendingDeletion retired). Damir reports the crash
  reproduced on DESKTOP too — same core code, the mitigation covers both.
  ⚠ Damir must WIPE obj/bin + rebuild both platforms, then re-run C10: the
  bot row should disappear at once, NO crash, [CRASHDIAG] runs through
  "teardown dispatched".
- **#569/#570** logged only (his call): tip-sheet untruncated address
  (desktop, #211 miss) · heart+"Tipped" collide on short bubbles (both
  platforms).

Numbers after the walk-day rounds: smoke **3049 / the 3 KNOWN** · cs-syntax
144+1 · bundle 292 · shells 18 (FE artifacts unchanged since #563 — the
walk-day C# rounds need no bundle/shell rebuild).

Owed FROM Damir: the C10 re-test after rebuild · the admin-elevation answer
(#568) · the loadChats-window capture (#565 ②) · walk continues (artifact).

### Walk verdict (2026-08-25 evening): ALL PASS + 6 queued findings

Damir walked the whole artifact: every item PASS on both platforms. Four
pass-with-note findings logged as **#572** (hidden-request unread leak · one
QR entry not two · mobile pressed-row highlight = the E-3 dial, now called ·
declined-call bubble label) and one real crash as **#573** (headless incoming
call rings SILENTLY — null MainActivity.Instance at SSpixiPermissions.cs:20 +
SPlatformUtils.cs:60; fix = Application context). The checklist artifact now
has a "Copy findings" export button. #568–#570 unchanged in the queue.

Final walk export (the artifact's new Copy-findings button): **47 pass · 0
fail · 0 n/a · 0 unchecked.** Late additions: **#574** (phantom call overlay
from a missed-call notification after cold boot — real state bug, first in
the queue; + notification lacks the caller nickname) and **#575** (Damir's
full address-sheet polish spec + the ONE Account address row). Commit
message updated in `docs/commit-message-2026-08-25.txt`; the staging list in
`docs/commit-2026-08-25.txt` is still correct as written (walk-day changes
are all tracked-file modifications riding `git add -u`).
