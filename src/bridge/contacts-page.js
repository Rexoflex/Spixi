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
 * Bridge mapping (HomePage):
 *   Add contact   → ixian:newcontact        (push ContactNewPage; audit :248/:529)
 *   Create group  → IN-SHELL (#265, Damir ⑤): the picker flips to multi-select
 *                   (confirm = the TOPBAR action) → createGroupSetup (name / photo /
 *                   blind) → `ixian:creategroup:<blind><name>:|addr|addr…` + the
 *                   photo pick via `ixian:groupavatar`. Both are NEW HomePage verbs
 *                   (#265, small C#) feeding the SAME HandlePickSucceeded core the
 *                   legacy picker used — so the redesign NEVER drops a shell over
 *                   wallet_recipient.html (the page shared with the MONEY recipient
 *                   picker, #232/#256). The legacy multi-picker is no longer used
 *                   for groups; `ixian:newchat` stays available but unwired here.
 *   Open chat     → ixian:chat:<address>     (start; audit :259)
 *   View contact  → ixian:details:<address>  (directory; audit :260 → ContactDetails)
 *   Launch app    → ixian:startappwith:<appId>:|<addr>   (purpose 'app')
 *
 * purpose 'start'  (FAB): Add contact + Create group actions; tap = open chat.
 * purpose 'directory' (topbar Contacts): Add contact only; tap = contact details.
 * purpose 'app' + appId (mini-app launch target): the picker opens straight into
 *   the SAME select grammar group creation uses, but SINGLE-select (exactly one
 *   target, groups allowed), and the topbar ✓ emits
 *   `ixian:startappwith:<appId>:|<addr>`.
 *
 *   Why a NEW verb and not the shipped `ixian:startAppMulti:<appId>`: that verb
 *   carries NO target — HomePage.onStartAppMulti (HomePage.xaml.cs:2775) answers it
 *   by pushing the LEGACY WalletRecipientPage(false, false) and picking the target
 *   natively, which is exactly the screen Damir is complaining about. Its handler is
 *   also matched with StartsWith("ixian:startAppMulti") but sliced at
 *   "ixian:startAppMulti:".Length, so appending a target to it would land the whole
 *   "<appId>:<address>" tail in appId. The payload grammar mirrors
 *   `ixian:creategroup:` (HomePage.xaml.cs:447) 1:1 minus the blind+name prefix, and
 *   feeds the SAME HandlePickAppMultiUserSucceeded core (HomePage.xaml.cs:2789):
 *   onJoinApp + StreamProcessor.sendAppRequest for the target. That core consumes
 *   addresses.First() only — ONE target — which is also all MiniAppPage supports
 *   today (its session id is sha3(appId) and it relays to a single peer), so the
 *   payload carries exactly one address: a byte-for-byte behaviour match with the
 *   legacy page, with the redesigned picker in front of it. The list grammar is
 *   kept so a future multi-user MiniAppPage needs no new verb.
 *
 * Takeover, not a page nav: the overlay is a fixed inset:0 panel (z below sheets)
 * mounted OVER the home shell and closed via its OWN back button — it NEVER emits
 * a navigation verb for back (the .chat-info-takeover pattern from chat.html).
 * Open chat AND create group close the takeover (C# opens the conversation over
 * home; leaving the setup panel mounted underneath let a user back out onto a
 * re-armed Create → duplicate group, Opus review of #265). Add contact AND view contact (directory) leave it open
 * UNDERNEATH the pushed C# page: back-from-ContactNewPage lands on the picker, and
 * back-from-ContactDetails lands on the DIRECTORY — not the chats list. Closing the
 * directory overlay before ixian:details would drop the user on tab1 on pop (the
 * bug this fixes). A successful add-request has C# chain pickSucceeded → the
 * conversation over the top.
 */
// ⚠ build-demo-bundle strips imports with a SINGLE-LINE regex (/^import .*$/gm)
// and has no alias support — so every import here must be ONE line with plain
// names (a multi-line import leaves its tail behind; an `x as y` alias survives
// into the bundle → "Unexpected identifier 'as'"). Both fail the syntax gate.
import { createContactsPicker, setPickerContacts, createGroupSetup, setGroupAvatar, setPickerMode } from '../components/contacts-shell.js';
import { clearPressFeedback } from '../components/pressable.js';   // ★ #589: a press must not outlive the screen that owned it

// local handle so the returned controller can expose its own `setGroupAvatar`
// method without shadowing the component fn it delegates to.
const paintGroupAvatar = setGroupAvatar;

export function mountContacts({
  host = document.body, bridge, strings, purpose = 'start', appId = '', getRoster, onClose,
} = {}) {
  /* ★ #589 (Damir F5 2026-08-26): "a mini app that opens the contacts picker leaves
     a pressed-row rectangle over the new screen." A takeover COVERS the list, it does
     not hide the document — so neither `pagehide` nor `visibilitychange` fires, the
     pressed row stays connected, and its fill/fade timers keep running underneath
     this screen. Clearing here, in the screen being opened, covers every host that
     opens the picker — including a host written later. See pressable.js. */
  clearPressFeedback();

  const overlay = document.createElement('div');
  overlay.className = 'contacts-takeover';

  let closed = false;
  /* ★ C4 (#547): onClose carries the REASON — 'back' when the user pressed the
     takeover's own Back (the return-to-Account hop keys on it), anything else when
     the shell closed it programmatically (a tab tap, an app launch, a chat open). */
  const close = (reason) => {
    if (closed) return;
    closed = true;
    overlay.remove();
    if (onClose) onClose(reason === 'back' ? 'back' : 'auto');
  };

  /* #265 ⑤ — step 2: group setup (name / photo / blind) over the picker. The
   * avatar pick round-trips through C# (ixian:groupavatar → native picker →
   * loadGroupAvatar push, resolved by the shell's pending ctrl). Create emits
   * ixian:creategroup:… — C# builds the group and opens the conversation, which
   * tears this takeover down anyway; we close on the C# ack path via done(). */
  let groupCtrl = null;         // pending avatar-pick ctrl (one at a time)
  let groupPanel = null;
  const openGroupSetup = (members) => {
    // Opus MAJOR-6: a group needs ≥2 members — C# rejects a 1-member payload and
    // only LOGS, so Create would silently do nothing forever. Guard at the gate.
    if (!members || members.length < 2) return;
    bridge.send('ixian:groupreset');          // MAJOR-3: drop any abandoned temp photo
    groupPanel = createGroupSetup({
      members,
      strings,
      onBack: () => {                         // back to the multi-select, selection intact
        groupPanel.remove();
        groupPanel = null;
        if (groupCtrl) { groupCtrl.fail(); groupCtrl = null; }   // release a pending pick
        picker.hidden = false;
      },
      onPickAvatar: (ctrl) => { groupCtrl = ctrl; bridge.send('ixian:groupavatar'); },
      onCreate: ({ name, blind, addresses }, ctrl) => {
        if (addresses.length < 2) { ctrl.fail(strings.groupNeedsTwo || 'Pick at least two people.'); return; }
        // grammar mirrors the legacy ixian:select payload 1:1 (HomePage parses it)
        bridge.send('ixian:creategroup:' + (blind ? '1' : '0') + name + ':|' + addresses.join('|'));
        ctrl.done();
        // Opus MAJOR-5: close the takeover — C# opens the new conversation over the
        // home shell; leaving the setup panel mounted underneath let a user back out
        // of the chat onto a re-armed Create button (duplicate group).
        close();
      },
    });
    picker.hidden = true;                     // keep it mounted: back restores the selection
    overlay.append(groupPanel);
  };

  /* purpose 'app' — confirm the multi-user launch targets. Close FIRST, then send:
   * C# pushes the MiniAppPage over the home shell (onJoinApp), and leaving this
   * takeover mounted underneath would let a user back out of the app onto a
   * re-armed ✓ → a duplicate session (the same MAJOR-5 hazard as group create). */
  const startAppWith = (selected) => {
    // ONE target — the picker is single-select on this path and C# opens a single
    // session against a single friend/group; slice() is the belt-and-braces.
    const addresses = (selected || []).map((c) => c && c.address).filter(Boolean).slice(0, 1);
    // no appId = a mis-wired mount; no target = C# would only log and drop it.
    if (!appId || addresses.length < 1) return;
    close();
    bridge.send('ixian:startappwith:' + appId + ':|' + addresses.join('|'));
  };

  const picker = createContactsPicker({
    contacts: getRoster ? getRoster() : [],
    purpose,
    strings,
    onBack: () => close('back'),           // close the takeover — never an ixian: nav verb (C4: the user's own Back)
    // Add contact → ContactNewPage. Leave the takeover OPEN underneath (see docblock).
    onAddContact: () => bridge.send('ixian:newcontact'),
    // Create group → IN-SHELL multi-select (the picker flips itself; the topbar
    // action confirms) → onNext → the group setup panel above (#265).
    onCreateGroup: () => {},
    onNext: (selected) => {
      if (purpose === 'app') { startAppWith(selected); return; }
      openGroupSetup(selected);
    },
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
    /** C# loadGroupAvatar push (#265): resolve the pending avatar-pick ctrl. */
    setGroupAvatar(src) {
      if (groupPanel && src) paintGroupAvatar(groupPanel, src);
      if (groupCtrl) { groupCtrl.done(src); groupCtrl = null; }
    },
    /** Reset to browse mode (defensive; used if a flow is abandoned). */
    resetMode() { setPickerMode(picker, 'browse'); },
  };
}
