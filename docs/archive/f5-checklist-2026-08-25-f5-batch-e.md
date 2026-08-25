# F5 checklist — the F5 fix batch (#553–#556, #558) + Batch E (#557) · 2026-08-25

Offline twin of the "F5 + Menus" artifact. Walk on Android first (the findings
came from there), then Windows for the desktop items. Loop verdict:
`docs/opus-review-verdict-f5-batch-e.md` (CLEAN after 2 rounds).

Pipeline at delivery: bundle **292 exports** · shells **18** · smoke
**BASELINE OK 3032 / the 3 KNOWN (#136 · M5 · B3)** ⚠ new baseline (was 2996) ·
cs-syntax **144 + 1** · locales **CLEAN, 771 keys** · Ixian-Core `097341a`
untouched. ⚠ C# changed → **wipe `obj`/`bin` before the build (#387)**.

## A — F5-3, the restore race (#553)

1. Create an account → back out → Restore → pick a file with the system picker.
   The picker bounce must NOT wedge the app: restore completes, the app
   connects. `ixian.log` may show `EnsureNodeRunning: no wallet is loaded` or
   `the node has not started yet this run` — either line = the guard fired.
2. Delete account (full wipe) → welcome → Restore the same backup. Same
   expectation (the R-3 leg: the wipe resets the started-once marker).
3. Regression: background the app mid-use, screen off/on, return — the node
   resumes normally (the guards must not block a LEGITIMATE restart).

## B — F5-1, the missed call (#554 + loop A-1/R-2)

The loop found TWO mechanisms: the re-post was UNREACHABLE code (the cancel
predicate always won) AND a thread race lost the fetched hangup. Both fixed.

4. **App killed.** Have the second device call you; let it ring out; open the
   app. The tray must hold ONE "Missed call" row and it must SURVIVE opening
   and reading other chats. ⚠ The generic "New Message" row the cold push
   posts first may appear and be swept — that half is the BE row (§1e-5,
   the push payload carries no kind); the tagged row is the acceptance.
5. **App backgrounded (alive).** Same walk. Same expectation.
6. **Decline locally** while it rings → NO "Missed call" row appears (R-2 —
   you saw the call; a decline is not a miss). The incoming-call row goes.
7. **Answer, then hang up** → the call row goes (nothing was missed).
8. On the killed-app repro, `ixian.log` should carry
   `[NOTIFDIAG] app end-session re-check found the VoIP session` — that line =
   the race fired and the fix caught it. A row that still vanishes + the line
   `endVoIPSession: could not update the call notification` = the next suspect.
9. ⚠ Accepted residuals, do not fail them: a fetched stale call can BLIP the
   ring for one instant, and (pre-existing) may pop the mic-permission dialog
   for a call already over.

## C — F5-2, the bot-removal crash DIAGNOSTIC (#555)

No logcat = no fix (#294): this batch ships the instrument, not a guess.

10. Repro the crash (remove/leave a bot room — use the room's INFO surface,
    the item-14 walk) with the cable attached, then IMMEDIATELY:
    `& $adb logcat -d > crash-logcat.txt` — logcat is the true instrument.
11. `ixian.log` will carry `[CRASHDIAG]` crumbs. The LAST surviving line
    brackets the site. ⚠ Honesty rules: "teardown dispatched" does NOT mean
    the teardown completed (the nav work is async — a later crash lands in
    "first async nav turn drained" or after); a clean HomePage bracket does
    not exonerate that path (its body already had a catch-all); a crash with
    NO crumbs at all = native or pure-Java (only logcat sees it).

## D — F5-4 → #560, the styling calls

12. Send AND Receive lists: the CONTACTS-DIRECTORY card, exactly (same
    background, same 4px inset, same rows). Content sits at the SAME 16px side
    inset as Contacts (was 32 — the double padding is gone). The revealed
    "Send to an address" field aligns with the rows.
12b. **#560 Receive rework**: no more capped 5-row inner scroller — the list is
    full length and the PAGE scrolls. "Send request" is a STICKY bar at the
    bottom: always reachable, rows slide beneath it, clear of the home
    indicator; it enables when amount + at least one recipient are set.
13. Address sheet: the QR card has the Account proportions (no white ring
    beyond the code's own quiet zone), radius/elevation of the Account family.
14. Desktop: shrink the window so the address sheet overflows → a slim themed
    scrollbar is VISIBLE on the sheet body (one scroller, not two).
15. The explainer row leads with a flat tinted ⓘ — no filled disc behind it.

## E — F5-6 (#558, your call: B)

16. Wallet Send, no recipient picked: "Select a recipient to use Max." under
    the amount row; pick a recipient → the hint goes, Max arms once the quote
    lands. Check Deutsch (or any locale): the hint is translated.

## F — Batch E, the menu batch (#557)

17. **(a) mobile message menu**: long-press a message → the menu is an
    ANCHORED DROPDOWN, ABOVE the pressed bubble (below only when the message
    is at the top). The pressed message stays lifted + ringed above the scrim.
    Sent vs received: the menu follows the bubble's side.
18. **(a) near the notch / home indicator**: press the topmost and bottommost
    messages — the menu must never sit under the status area or the home
    indicator; a menu taller than the screen scrolls INSIDE itself.
19. **(a) chats row menu**: long-press a chat row → same dropdown grammar,
    anchored to the row. All actions work; swipe-open rows close first.
20. **(a) #519 z-order, on device**: with the menu up — lifted message ABOVE
    the scrim, menu above everything, press layers uncompromised.
21. **(b) the deeper scrim**: the ground behind a menu is one level darker
    than before (0.7). ⚠ **E-3 dial**: the chats ROW under the scrim has no
    lift (the message has one). If the row reads too dark, say so — the lift
    extension is specified but needs the #506② stacking verification first.
22. **(c) desktop**: right-click menus still carry NO wash (#268). The
    right-clicked row shows a subtle "held" wash — and right-clicking the
    OPEN conversation keeps its selected tonal (E-4).
23. **(d) Account → "Show QR"**: opens the SAME address sheet as the wallet
    (QR + address + copy + Share + the explainer). "What is this address?"
    opens the same sheet. Leave Account with the sheet open → next visit to
    Account is clean (the parked-document strand, C-8). Mobile + desktop pane.
24. Rider: desktop dev HUD (10-tap) sits right of the rail, not over it.

## H — the same-day fold-ins (#561 · #562)

29. **#561 desktop**: chat rows do NOT drag left/right any more (the drawers in
    your screenshot are gone); right-click + long-press sheet still work.
30. **#561 mobile**: swipe a row hard past the commit point — it SPRINGS back
    smoothly, THEN the action fires (no instant jump). Partial swipe still
    reveals/settles as before.
31. **#562 hide request (chats list)**: long-press a "Request sent" row →
    "Hide request" (plain ink, eye-off) → the prompt EXPLAINS ("they still see
    the request; if they accept it, the chat comes back") → Hide → the row goes.
    The money picker's "Request sent" pending badge STAYS (the request is
    still live).
32. **#562 hide request (in the chat)**: the waiting strip's action is now
    "Hide request" (same words, same prompt) → confirming leaves the chat and
    the row is gone from the list.
33. **★ #562 the repro that started it**: hide a request → have the peer ACCEPT
    it → the chat COMES BACK on your side ("Contact Accepted"), the handshake
    completes, and BOTH sides can message. (This was the dead-chat case —
    the Friend record now survives the hide.)
34. **#562 restart**: hide a request → restart the app → the row STAYS hidden
    (the hide is durable, unlike the session-only delete-chat tombstone) — and
    a later accept still brings it back.

## G — Regressions

25. Incoming call UI, answer path, call bar — unchanged (the StreamProcessor
    reshape kept the live-call fast path byte-identical).
26. Mini-app invite accept/reject/end — unchanged (the fall-through stayed on
    its thread; loop A-2).
27. Wallet send: quote gating, review sheet, native confirm — unchanged.
28. Chat-info (contact/group) QR reveal — unchanged (chat-info keeps its
    inline code; only the ACCOUNT hub moved to the sheet).
