# F5 findings — the overnight walk (Damir, 2026-08-24, 28/30 pass)

Report: 28 pass · 2 fail · 0 not run. Logs: `aftercrash.txt` (bot-group removal),
`fatalexception.txt` (restore race), `relaunched dark mode screen.txt` (decrypt loop).
**These fixes come FIRST next session, before Batch E** (the wallet-pass precedent).

## F5-1 ★ FAIL (item 29, D1) — the missed-call tray row still disappears

Damir: "notification from tray disappeared, but in chats I see it was a missed call."
VERIFIED at source before diagnosing: the re-post IS correct — `VoIPManager.endVoIPSession`
(VoIPManager.cs:220) posts "Missed call" with kind `"call"` → `SPushService.showLocalNotification`
tags it (`manager.Notify(CALL_TAG, id, …)`, Android SPushService.cs:392) → the sweep
(SPushService.cs:274) spares `Tag == CALL_TAG`. A tagged row CANNOT be swept.
So the row that vanished was posted WITHOUT the tag. Two candidate posters:

1. **The offline-push fetch** — Android SPushService.cs:739 posts EVERY offline push as
   kind `"message"` ("push posted as a Spixi row, id keyed on the sender, #495") — a
   call push arriving through this path becomes an UNTAGGED row the sweep rightly eats.
2. **The OneSignal SDK's own display path** (app backgrounded) — bypasses SPushService
   entirely, no tag.

Fix direction (1): the offline-fetch poster must route call-flavoured pushes with
kind `"call"`, or re-tag by id (`notificationIdFor(addr, true)` match → CALL_TAG).
Diagnostic if it survives the fix: repro once and capture `ixian.log` — a re-post
failure logs `endVoIPSession: could not update the call notification` (VoIPManager.cs:233).

## F5-2 ★ CRASH (item 14 note, A1) — removing a bot group crashed Android

`aftercrash.txt` starts AFTER the restart, so the crash itself is unlogged (an
unhandled/native crash never reaches ixian.log). The aftermath shows the leave WORKED:
the group is gone from FriendList and the server keeps streaming its messages
("Received message for group … is invalid" spam — a BE observation: the bot keeps
sending after leave). The leave path (`SContacts.leaveGroup`: pendingDeletion + save +
sendLeave) has no obvious crash site — suspect the UI teardown around the removed row.
**Diagnostic needed**: repro with `& $adb logcat -d > crash-logcat.txt` right after the
crash — logcat holds the stack that ixian.log cannot.

## F5-3 ★ (item 23 note, C1) — restore race: mechanism #4, pinned by the log

`fatalexception.txt` is a clean trace of a NEW mechanism (the three #545/#550 fixes
held — no balances.Add crash, no RocksDB crash):

1. Create-account flow ran, then Damir backed out to restore. The launch flow stopped
   the node (12:27:50 "Stopping node… Node stopped").
2. The restore FILE PICKER (IntermediateActivity) triggered MainActivity OnResume →
   `App.EnsureNodeRunning` (App.xaml.cs:1368) saw status=stopped and RESTARTED the node
   MID-TRANSITION with no wallet ("Cannot read account file") → `PresenceList.init` →
   `getWalletStorage` → KeyNotFoundException (12:28:00.7057) → a half-started zombie.
3. The real restore then ran: "Cannot start Node, it is already running" →
   `Node.start()` returned false (12:28:08.96) → `connectToNetwork` never ran → the
   header-request loop fires into zero clients → "Connecting…" forever. Restart heals.

Fix direction (ours, App.xaml.cs): `EnsureNodeRunning` must NOT restart the node while
the app is inside the launch/account-lifecycle flow — guard on "no wallet loaded"
(wallets empty) or a launch-flow flag; the launch flow owns the node lifecycle there.
Same guard family for `OfflinePushMessages.fetchPushMessages` on its timer (it threw
the same KeyNotFoundException at 12:28:06 with no wallet).

## F5-4 FAIL (item 3, W-j) — the send/receive picker rows, spacing + order

Damir: "a bit cramped, extra paddings on the side; not identical to the contacts list;
should be amount on top and below a straight contacts list. Low priority."
Amount IS on top (W-i); the gap is the LIST: the `.c-wallet-send__list` card adds its
own padding around the shared rows — the directory renders them flat. Fix: drop the
card chrome, render the picker as the directory does (flat rows, same insets).

## F5-5 (item 5 note, W-c) — the address sheet, three polish points

1. QR card padding too big — mimic the Account screen's QR proportions.
2. Desktop: no visible scrollbar when the sheet content overflows — style the
   overflow scrollbar as the contact list does (slim, themed).
3. "Icon within icon looks weird" (screenshot): the info-disc glyph sits inside a
   filled disc — flatten to ONE glyph level on the explainer row.

## F5-6 dial (item 2 note, W-i) — Max disabled until a recipient is picked

BY DESIGN under the #523 money rule: Max = balance − fee; the fee needs a quote; a
quote needs a recipient; no invented numbers. The alternative — an estimate-based Max
before the pick, corrected after — violates the no-invented-fee rule. DIAL for Damir:
keep the honest gate (recommended) or add a "pick a recipient to use Max" hint line so
the disabled state explains itself. The HINT is the cheap honest middle.

## F5-7 note (item 18, A8) — skeleton not noticed

Damir: "didn't notice it, but ok." Expected on a warm cache — the skeleton shows only
until the first commit (fast on-device). No action.

## Carried BE observations (not ours, logged again by these logs)

- The Android DECRYPT LOOP: `mac check in ChaCha20Poly1305 failed` → "Data length is
  negative" repeating for the same 4 payloads, every few seconds, across restarts
  (all three logs). Known carried observation — now with fresh evidence.
- After leaving a bot group, the server keeps streaming its messages ("Received
  message for group … that is invalid" spam) — BE row candidate.
- `SpixiMessage` negative-length payloads are retried forever (no poison-message
  drop) — BE row candidate.

## Priority order for the fix session

F5-3 (restore race — data-loss-adjacent) → F5-1 (missed call — the batch's headline)
→ F5-2 (crash diagnostic + fix) → F5-4/F5-5 (styling) → F5-6 (dial, one line either
way). Then Batch E.
