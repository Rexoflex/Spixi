# Remove contact — one flow, four changes. SPEC, not built.

Damir, 2026-08-28, with screenshots. **Nothing here is built.** Build it in the next
session; this document is what to build from.

## Where the flow lives today

| | |
|---|---|
| Chats row → long-press → Delete | `openDeleteFlow` — `src/components/chats-row-menu.js:568` |
| …which opens the group picker | `openRemoveContactSheet` — `chats-row-menu.js:378`, groups arrive via `onNeedGroups(address)` → `ixian:sharedGroups:<addr>` → `setRemoveSheetGroups` (`:538`) |
| Contact details → Remove contact | a DIFFERENT surface — the dead-end modal at `src/shells/contact_details.html:265-290` (`removeBlocked` push) |

★ That split is the root of items 1 and 4: two screens do the same job two ways, and only
one of them can actually get you out.

---

## 1 · "Remove contact" becomes a CHECKBOX, not a second sheet

**Today:** the "Delete chat?" sheet offers `Delete chat` ✓ and `Delete media & files` ○.
Removing the contact is a separate sheet reached another way.

**Wanted:** a third checkbox in that same sheet — `Remove contact` — so one sheet answers
the whole question. `openDeleteFlow` already owns this surface and already knows how to
escalate to the group picker (`:593`), so the escalation becomes conditional on the
checkbox rather than on a separate entry point.

⚠ Decide the tick order and defaults deliberately: `Delete chat` is currently pre-ticked.
`Remove contact` must default **off** — it is the irreversible one, and a pre-ticked
destructive box is how people remove contacts they meant to keep.

## 2 · Equal-width buttons in the group sheet

**Today:** `Keep contact` is a bare text link and `Leave 1 & remove` is a full-width pill.
They read as different KINDS of thing rather than two choices.

**Wanted:** equal width, side by side. The house pattern for a two-button footer is
already in `settingsConfirm` / `confirmAction` — reuse it rather than adding a third
button grammar. This is the same lesson as #618: one screen, one grammar.

## 3 · The sheet CLOSES before the confirm dialog

**Today (screenshot):** press `Leave 1 & remove` and the confirm dialog appears **stacked
on top of the still-open sheet** — you can see the sheet's title and its buttons behind
the dialog. Two destructive surfaces on screen at once, each with its own red button.

**Wanted:** the sheet closes, *then* the dialog appears. One decision on screen at a time.
⚠ Mind the ordering hazard the sheet machinery already documents: `closeSheet` is animated
and `onDismiss` is deferred, so the dialog must be opened from the CLOSE completion (or
the dismiss handler), not fired alongside it — otherwise the dialog's own dismissal can
race the sheet's and the light-dismiss lands on the wrong surface.

## 4 · Contact details must use the SAME sheet

**Today (screenshot):** `Cannot remove contact — this contact is a member of these
groups: • seengroup. Remove the contact from these groups, or leave the groups. Then
remove the contact again.` with a single **OK**.

★ That is a **dead end**: it names the obstacle and offers no way past it. The chats path
already has the actionable answer — tick the groups, leave them, remove the contact, in
one gesture.

**Wanted:** contact details opens `openRemoveContactSheet`, exactly as the chats row does.
The `removeBlocked` modal at `contact_details.html:265-290` is **retired**, and its
strings with it.

⚠ `contact_details.html` is its own document, so it needs the same three pieces the chats
shell has: the `onNeedGroups` verb out, the `setRemoveSheetGroups` handler in, and
`setRemoveSheetResult` for the failure case. Check what that shell already exposes before
assuming any of them are missing.

---

## Build order

1. **#4 first** — it is the biggest user-visible win and it forces the sheet to work from
   two hosts, which is what makes #1 clean rather than a special case.
2. **#3** — pure sequencing, and it makes #1 testable without two overlapping surfaces.
3. **#1** — the checkbox, once one sheet serves both entry points.
4. **#2** — the button grammar, last, because it is the only one that cannot break a flow.

## Pin it

The suite has fixtures for `openRemoveContactSheet` and the delete flow already. The pins
worth adding are the ones a later batch could quietly undo: that **both hosts open the
same component**, that the confirm is **not** open while the sheet is, and that the
`Remove contact` checkbox defaults **off**.
