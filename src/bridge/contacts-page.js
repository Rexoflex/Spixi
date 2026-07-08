/**
 * contacts-page.js — the Contacts DIRECTORY / picker takeover, wired to the
 * frozen HomePage bridge (bridge-audit-A.md §5 HomePage + §3 ContactNewPage).
 *
 * Clean boundary (DECISIONS #167): the home shell owns the roster model (fed by
 * clearContacts/addContact/noContacts) and hands this module a bridge + a roster
 * accessor. This builds the full-viewport contacts takeover — createContactsPicker
 * — and translates its callbacks into EXISTING ixian: verbs. Nothing about
 * home.html's internals leaks in beyond { host, bridge, strings, getRoster,
 * onClose }, so a later standalone Contacts shell mounts the same call unchanged.
 *
 * Bridge mapping (HomePage — all existing verbs, ZERO C# change):
 *   Add contact   → ixian:newcontact        (push ContactNewPage; audit :248/:529)
 *   Create group  → ixian:newchat           (push WalletRecipientPage multi-picker;
 *                                             audit :247). The in-shell createGroupSetup
 *                                             multi-select is DEFERRED: its result verb
 *                                             ixian:select is a WalletRecipientPage verb,
 *                                             NOT a HomePage one (audit :530) — HomePage
 *                                             can't receive it, so group assembly stays
 *                                             with the native multi-picker for v1.
 *   Open chat     → ixian:chat:<address>     (start; audit :259)
 *   View contact  → ixian:details:<address>  (directory; audit :260 → ContactDetails)
 *
 * purpose 'start'  (FAB): Add contact + Create group actions; tap = open chat.
 * purpose 'directory' (topbar Contacts): Add contact only; tap = contact details.
 *
 * Takeover, not a page nav: the overlay is a fixed inset:0 panel (z below sheets)
 * mounted OVER the home shell and closed via its OWN back button — it NEVER emits
 * a navigation verb for back (the .chat-info-takeover pattern from chat.html).
 * Open chat / create group close the takeover first (opening a chat should not
 * leave the picker behind). Add contact AND view contact (directory) leave it open
 * UNDERNEATH the pushed C# page: back-from-ContactNewPage lands on the picker, and
 * back-from-ContactDetails lands on the DIRECTORY — not the chats list. Closing the
 * directory overlay before ixian:details would drop the user on tab1 on pop (the
 * bug this fixes). A successful add-request has C# chain pickSucceeded → the
 * conversation over the top.
 */
import { createContactsPicker, setPickerContacts } from '../components/contacts-shell.js';

export function mountContacts({
  host = document.body, bridge, strings, purpose = 'start', getRoster, onClose,
} = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'contacts-takeover';

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    overlay.remove();
    if (onClose) onClose();
  };

  const picker = createContactsPicker({
    contacts: getRoster ? getRoster() : [],
    purpose,
    strings,
    onBack: close,                         // close the takeover — never an ixian: nav verb
    // Add contact → ContactNewPage. Leave the takeover OPEN underneath (see docblock).
    onAddContact: () => bridge.send('ixian:newcontact'),
    // Create group → native multi-picker (in-shell group setup deferred, see docblock).
    // createContactsPicker flips to multi-select first; we close over it in the SAME
    // synchronous click (no paint between) so that transient mode never shows.
    onCreateGroup: () => { close(); bridge.send('ixian:newchat'); },
    // start: tap opens the 1:1 conversation.
    onOpenChat: (c) => { if (c && c.address) { close(); bridge.send('ixian:chat:' + c.address); } },
    // directory: tap opens contact details (accepted → chat-info; pending → minimal).
    // Do NOT close first — leave the directory overlay mounted UNDER the pushed
    // ContactDetails page so back (C# pop → home) returns to the DIRECTORY, not the
    // chats list. (home.js openContacts closes any prior overlay before a new open,
    // so returning + tapping another contact can't double-stack the takeover.)
    onViewContact: (c) => { if (c && c.address) bridge.send('ixian:details:' + c.address); },
  });
  overlay.append(picker);
  host.append(overlay);

  return {
    el: overlay,
    close,
    /** Refresh the roster while the takeover is open (bridge clearContacts/addContact re-flush). */
    setContacts(contacts) { setPickerContacts(picker, contacts); },
  };
}
