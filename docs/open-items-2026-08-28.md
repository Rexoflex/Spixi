# Open items — from Damir's Android walk of #596–#616, 2026-08-28

**Walk result: 22 pass · 4 fail · 9 n/a (all iOS, deferred) of 35.**
Raw results and per-row notes live in the walk artifact. This is the queue that came out
of it, plus the items he listed separately. **Nothing below is built** unless it says so.

★ Four of his findings were fixed the same morning and are NOT in this queue — see
DECISIONS #620 (the tip auto-confirm), #621 (the call glyphs), #622 (the explore banner)
and #617/#618/#619 (the bot group, the row grammar, the freeze).

---

## P1 — money, and one of them is a design decision he has to take

**1. The tip has no confirmation step.** *"There is no confirmation dialog once I tap on
sheet confirm (if selecting presets)."*
The auto-confirm-on-Enter half is fixed (#620). What remains is that a preset tip is
**one deliberate tap and the money is gone** — no review, no undo. Wallet Send has
`openPaymentReview`; the tip sheet does not.
⚠ **This is a design decision, not a defect** — adding a step to a deliberate button is a
flow change, and the tip's whole appeal is that it is quick. Options to put to him: a
review sheet like Send · a hold-to-confirm · a short undo toast · leave it.
**Ask before building.**

## P2 — launch and onboarding (LAU2 failed)

**2. OS back from create/restore does not return to welcome.** *"Back button fails first
time and exits to home on second time when in create or restore screens."*
⚠ #614 fixed only the SHEET layer (an open Terms sheet now closes first, and that half
passed). The view-change half is still wrong on the device, and #399 believed it was
fixed. **Start with the log line, do not guess:** `LaunchPage.xaml.cs` logs
`"LaunchPage back: view=… overlay=…"` on every press. One run tells you whether the
handler is reached and what it thinks the current view is — which separates "the report
never lands" from "the handler never runs". That instrumentation exists precisely for
this and has never been read on a device.

**3. The Terms / language / privacy sheets render LIGHT while the phone is in dark theme.**
Launch is the one shell that calls `ignorePushedTheme` (`src/shells/launch.html`), because
C# pushes a theme it should not adopt before an account exists. The likely consequence is
that it never adopts the OS theme either. Check what sets `data-theme` on that document
and whether `prefers-color-scheme` reaches it at all.

## P3 — press feedback (APP1 failed)

**4. The mini-app press residue still shows.** #604 was shipped UNVERIFIED and his walk
says it did not work. ★ **He gave the lead: *"We had the same issue with the FAB residue
when in chats and pressing FAB and we solved it."*** Find that fix and apply its shape
here rather than iterating on the guard theory again. ⚠ And get the measurement first
(#294): one log line where the press arms, printing `el.className`, `e.type` and
`e.pointerType`, tells you whether a SECOND arm follows the click or whether the first
never clears.

## P3b — TIP in a bot room (Damir, 2026-08-28). The add-contact half is FIXED (#623).

**11. Tapping a sender in the Spixi bot group offers no Tip.**

★ The **add-contact** half of this report is fixed — see DECISIONS #623. It was mine: I
gated the member sheet on the wrong handler's guard and removed a feature that worked.

**Tip is a separate question and it needs Damir's call, because the evidence disagrees
with his memory and the disagreement is inside LEGACY itself.**

Legacy's tip lives only on the MESSAGE context menu (`0e85a4b8:chat.js:1456`,
`contextAction('tip', msgId)`), and legacy's handler opens with:

```csharp
case "tip":
    if (friend.bot || (friend.type == Group && hideParticipantAddresses)) {
        Logging.error("Send IXI is not supported in this chat."); return;   // :942
    }
    ...
    if (friend.bot || (friend.type == Group && !hideParticipantAddresses)) {
        sender_address = new ExtendedAddress(msg.senderAddress, ...);       // :951 — UNREACHABLE
    }
```

★★ **The `friend.bot` branch at :951 can never run, because the guard at :942 already
returned for a bot.** Dead code — and it is also the author's stated intent: *for a bot,
pay the message's sender*. So the most likely reading is that legacy's blind-group guard
swallowed bots by accident and tip has never worked in a bot room, in either tree.

**Two things to do, in order:**
1. **Ask Damir to re-check on his legacy build** — long-press a MESSAGE in the Spixi bot
   group and see whether Tip appears and completes. He has been right every time tonight
   and the code is not always the whole story; one device check settles it.
2. If it never worked, this is a **new capability on the money path**, not a repair.
   The fix is small and legacy wrote the intent for us — qualify the guard on group-ness
   the way `Utils.hidesParticipants` does (#613) and the dead branch comes alive — but
   #215 says the money path waits for an on-device answer, and the derived-vs-real address
   question for a flagged room is still open. **Do not build it without his word.**

⚠ Separately: the member sheet renders Pay / Request only when `relation === 'contact'`
(`member-sheet.js:157`, a deliberate round-10 dial). Even with the C# side fixed, Tip in
the SHEET is a different affordance from Tip on the message menu. Confirm which one he
means.

## P4 — desktop (all three are the same surface)

**5. Account → any rail item shows a CHAT in the right pane** instead of the Spixi empty
state.
**6. Contacts from Account: the left rail jumps to CHATS** instead of staying on Contacts.
**7. Contacts on mobile flickers.**
⚠ Related, and #1 of the standing queue is already the analysis for the neighbouring
defect: DESKTOP ACCOUNT → CONTACTS is **not frontend-fixable** — the detail column is a
native WebView, so no element in `home.html` can paint into it. It needs one small
HomePage verb (drop the detail content so the takeover shows there, restore it on close)
plus a close-audit at tab/chat/tx. **Its own batch.** Items 5 and 6 look like the same
root: the right pane and the rail are not being told what the takeover did.
★ He offered to answer questions here — take him up on it before building.

## P5 — groups

**8. Private groups: hide kick and ban for the OWNER.** They do nothing today, so they are
dead buttons. `chat-info.js` already hides the row for owner/admin TARGETS; this is the
mirror case — the acting user being the owner.

**9. Blind groups show no sent/read status, and the clock icon is misleading.** *"It only
shows a clock, which means 'not sent', which is misleading. If we can't show statuses we
need to discuss and remove the status icon entirely."*
⚠ Find out FIRST whether the status is unavailable in a blind room by design (receipts
would de-anonymise the reader) or merely unwired. Those are different fixes, and only one
of them is ours. **A permanently-pending clock is a delivery lie** — the #275 class — so
if the status cannot be known, the icon must go rather than sit at "sending" forever.

## P6 — chats

**10. "Mark as read" does not stick.** *"It removes the badge, but the badge returns, so it
doesn't mark as read, and the counterpart doesn't get the green checks."*
Two failures in one: the local unread count is not persisted (or is recomputed from
messages that are still unread), and no read receipt is sent. He has already said the
worst case is acceptable: **remove the action rather than ship one that lies.** Decide
after reading `applyChatRowAction`'s `read` path and what C# does with it.

---

## Retired rows

**BOT2** — *"this is a fail, the public room never hides addresses, and I can't test it at
all."* The row asked him to confirm that Tip and add-contact are suppressed in a room that
hides addresses; the Spixi room does not hide them, so the row was untestable as written.
The behaviour it guards is pinned in the suite (#613 r2). **Row retired, not a defect.**

## Specced separately

**Remove contact — one flow, four changes.** `docs/remove-contact-spec-2026-08-28.md`.
Damir's screenshots: the remove-contact checkbox, equal-width buttons, the sheet closing
before the confirm, and contact details using the same sheet as chats instead of the
dead-end "Cannot remove contact" modal.

## Carried, unchanged

`#565 ②`'s `[RESTOREDIAG]` lines from a restore-then-restart — still the only thing owed
by Damir from before.
