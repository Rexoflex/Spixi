/**
 * Chat-row context menu (step 4; spec §6). Long-press / right-click a chat row →
 * c-sheet with Pin/Mute/Mark read/Chat info/Delete. Reuses the c-msgmenu sheet
 * styling (message-menu.css) + the message-menu interaction pattern (long-press
 * ~500ms, cancel on >10px move = scroll intent; desktop right-click; Android
 * double-open guard). Delete routes through the c-modal confirm. Chat info fires
 * onAction('info') → the shell routes it (#247: home.html sends ixian:details:
 * for 1:1 — desktop pane / mobile takeover — and opens the chat for groups).
 *
 * Pin/Mute are CAPABILITY-GATED (parkable until BE persists them, #67/§8): shown
 * only when capabilities.pin / capabilities.mute are truthy. Mark-read / Chat
 * info / Delete are always present. A HANDSHAKING row (#109, still establishing)
 * gets a single "Cancel handshake" action instead — the row's only recovery path
 * (it has no swipe / open), so a stalled handshake is never an un-removable trap.
 *
 * openChatRowMenu({ chat, host, onAction, strings, capabilities, handshaking }) → sheet
 *   onAction(action) — 'pin' | 'mute' | 'markRead' | 'info' | 'delete' | 'cancelHandshake' | 'revokeRequest' (B1)
 * attachChatRowMenu(row, opts) — wires long-press + right-click on the row
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createAvatar } from './avatar.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';
import { createModal, openModal } from './modal.js';
import { createButton } from './button.js';
import { closeChatRowSwipe } from './chats-swipe.js';
import { isOverlayOpen } from './overlay.js';

const CHATMENU_LONG_PRESS_MS = 500;   // §5b
const CHATMENU_MOVE_CANCEL_PX = 10;   // §5b: >10px move = scroll intent

export function openChatRowMenu({ chat = {}, host, onAction, onNeedGroups, strings = getStrings(), capabilities = {}, handshaking = false } = {}) {
  closeChatRowSwipe();                              // any open swipe drawer closes when a sheet takes over (single-open invariant across row types)
  const content = document.createElement('div');
  content.className = 'c-msgmenu';                 // reuse the sheet-menu styling
  const list = document.createElement('div');
  list.className = 'c-msgmenu__list';

  const act = (action) => { closeSheet(sheet); if (onAction) onAction(action); };
  const item = (glyph, label, onClick, destructive = false) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-msgmenu__item';
    if (destructive) b.dataset.destructive = '';
    b.append(icon(glyph, { size: 20 }), document.createTextNode(label));
    b.addEventListener('click', onClick);
    list.append(b);
  };

  // #109: a handshaking row can ONLY be cancelled (its recovery path) — no
  // pin/mute/mark-read/info/open while the key exchange is still in flight.
  if (handshaking) {
    item('x', strings.cancelHandshake || 'Cancel handshake', () => {
      closeSheet(sheet);
      openModal(createModal({
        title: strings.cancelHandshakeTitle || 'Cancel handshake?',
        body: strings.cancelHandshakeBody || 'This stops establishing the secure connection and removes the chat.',
        role: 'alertdialog', host,
        actions: [
          { label: strings.keepWaiting || 'Keep waiting', type: 'text', autofocus: true },
          { label: strings.cancel || 'Cancel', type: 'fill', intent: 'destructive', onClick: () => { if (onAction) onAction('cancelHandshake'); } },
        ],
      }));
    }, true);
    content.append(list);
    const sheet = createSheet({ content, host, strings });
    openSheet(sheet);
    return sheet;
  }

  // toggles reflect what tapping DOES (glyph + label). Pin/Mute parkable (§8).
  if (capabilities.pin) {
    item(chat.pinned ? 'pinned-off' : 'pin',
         chat.pinned ? (strings.unpin || 'Unpin') : (strings.pin || 'Pin'),
         () => act('pin'));
  }
  if (capabilities.mute) {
    item(chat.muted ? 'bell' : 'bell-off',
         chat.muted ? (strings.unmute || 'Unmute') : (strings.mute || 'Mute'),
         () => act('mute'));
  }
  item('checks', strings.markRead || 'Mark as read', () => act('markRead'));
  item('info-circle', strings.chatInfo || 'Chat info', () => act('info'));
  // Delete — destructive last (§5b), CAPABILITY-GATED (CH3). Removing a chat or
  // wiping history needs BE verbs (`removehistory`/`remove` live on
  // SingleChatPage/ContactDetails, NOT on HomePage's dispatch), so a delete from
  // the chats list would drop the row visually but reappear on the next
  // loadChats re-flush. Parked behind capabilities.delete (built + ready) so it's
  // never shown broken (decided model) — flip on when the §8 verbs land. The
  // confirm is the TWO-STEP flow (Damir 2026-07-07): step 1 removes the row,
  // step 2 opts into wiping history + files + the contact.
  /* ★ B1 (Damir, Batch B 2026-08-24): an OUTGOING PENDING contact request row does
     not "delete" — it REVOKES, and only through a PROMPT (never silently). Verified at
     source: SingleChatPage's `ixian:undorequest` is `FriendList.removeFriend` with a
     "TODO: notify the other party" — the peer is NOT told and their copy of the request
     stays until they act on it; the copy says exactly that. */
  if (capabilities.delete && chat.request) {
    item('circle-x', strings.revokeRequest || 'Revoke request', () => {
      closeSheet(sheet);
      openRevokeRequestFlow({ chat, host, onAction, strings });
    }, true);
  } else if (capabilities.delete) {
    item('trash', strings.deleteChat || 'Delete chat', () => {
      closeSheet(sheet);
      openDeleteFlow({ chat, host, onAction, onNeedGroups, strings });
    }, true);
  }

  content.append(list);
  const sheet = createSheet({ content, host, strings });
  openSheet(sheet);
  return sheet;
}

/** Peer identity header (avatar + name) for the delete modals — "no mistake what
 *  will happen" (Damir 2026-07-07). Shared by both steps. */
function deletePeerHeader(chat, strings) {
  const h = document.createElement('div');
  h.className = 'c-delete-chat__peer';
  h.append(createAvatar({ src: chat.avatar, name: chat.name, address: chat.address, size: 40, group: chat.type === 'group', strings }));
  const nm = document.createElement('span');
  nm.className = 'c-delete-chat__name';
  nm.textContent = chat.name || chat.address || '';
  h.append(nm);
  return h;
}

/** One option row → { row, input }. ★ A7 (Damir, Batch A 2026-08-24): the GROUP-CREATION
 *  checkbox grammar (contacts-shell pickerRow: role=checkbox + aria-checked + the trailing
 *  select circle), not the off-brand native <input type=checkbox>. `input` keeps the old
 *  shape for callers (`.checked`) — it is the row itself now. */
function deleteCheckbox(label, { checked = false, disabled = false } = {}) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'c-delete-chat__opt';
  row.setAttribute('role', 'checkbox');
  row.setAttribute('aria-checked', String(!!checked));
  if (disabled) { row.disabled = true; row.setAttribute('aria-disabled', 'true'); }
  const txt = document.createElement('span');
  txt.className = 'c-delete-chat__opt-label';
  txt.textContent = label;
  const check = document.createElement('span');
  check.className = 'c-delete-chat__check';
  check.setAttribute('aria-hidden', 'true');
  check.append(icon('check', { size: 16 }));
  row.append(txt, check);
  const api = { row, get checked() { return row.getAttribute('aria-checked') === 'true'; } };
  row.addEventListener('click', () => {
    if (row.disabled) return;
    row.setAttribute('aria-checked', String(!api.checked));
  });
  return { row, input: api };
}

/** ★ A5 (Damir's shape, Batch A 2026-08-24) — REMOVE CONTACT is a BOTTOM SHEET.
 *  It leads with the peer, states what goes (your copy — they keep theirs), and shows
 *  the groups you are BOTH in (A4's data, asked through onNeedGroups → the shell's
 *  `ixian:sharedGroups:<addr>` → setRemoveSheetGroups). Verified at source:
 *  Core's FriendList.removeFriend REFUSES a contact who is in any of your groups
 *  (isFriendInGroup), so a shared group is a BLOCKER, not decoration — the sheet
 *  offers to leave those groups first (multi-select, the pickerRow grammar) behind an
 *  additional confirm, and Remove stays disabled until every blocker is ticked.
 *  Groups and bots: the same sheet reads "Leave group" (no blockers).
 *  onRemove({ leaveGroups: [addresses] }) fires ONCE, after the confirm.
 *  Alternatives explored for the handoff: (a) two modals (the old shape — no room for
 *  the group list, and the refusal came AFTER the tap); (b) block + explain only (honest
 *  but a dead end: the user has to find each group and leave it by hand); (c) THIS —
 *  explain + offer the fix in place. */
export function openRemoveContactSheet({ chat = {}, host, strings = getStrings(), onNeedGroups, onRemove, onKeep } = {}) {
  const isGroup = chat.type === 'group' || chat.type === 'bot' || chat.isGroup === true;
  const content = document.createElement('div');
  content.className = 'c-remove-contact';
  content.append(deletePeerHeader(chat, strings));

  const body = document.createElement('p');
  body.className = 'c-delete-chat__body';
  body.textContent = isGroup
    ? (strings.leaveGroupBody || 'Leave this group? You stop receiving its messages. Your copy of the chat is removed from this device.')
    : (strings.removeSheetBody || 'Remove this contact from your device? Their chat and files go with them. They keep their copy.');
  content.append(body);

  /* shared groups strip (1:1 only) */
  let groupsEl = null;
  let hint = null;
  const selected = new Set();
  let groups = null;                                     // null = loading
  if (!isGroup) {
    groupsEl = document.createElement('div');
    groupsEl.className = 'c-remove-contact__groups';
    const gTitle = document.createElement('h3');
    gTitle.className = 'c-remove-contact__title';
    gTitle.textContent = strings.sharedGroupsTitle || 'Groups you are both in';
    groupsEl.append(gTitle);
    hint = document.createElement('p');
    hint.className = 'c-remove-contact__hint';
    hint.setAttribute('role', 'status');
    hint.textContent = strings.sharedGroupsLoading || 'Checking your groups…';
    groupsEl.append(hint);
    content.append(groupsEl);
  }

  const err = document.createElement('p');
  err.className = 'c-remove-contact__error';
  err.setAttribute('role', 'alert');
  err.hidden = true;
  content.append(err);

  const actions = document.createElement('div');
  actions.className = 'c-remove-contact__actions';
  let sheet = null;
  const keep = createButton({ label: strings.keepContact || 'Keep contact', type: 'text', size: 44,
    onClick: () => { closeSheet(sheet); } });
  const remove = createButton({
    label: isGroup ? (strings.leaveGroup || 'Leave group') : (strings.removeContact || 'Remove contact'),
    type: 'fill', size: 44, intent: 'destructive',
    onClick: () => confirmRemove(),
  });
  remove.classList.add('c-remove-contact__cta');
  const removeLabel = remove.querySelector('.c-button__label');
  actions.append(keep, remove);
  content.append(actions);

  function blockersLeft() {
    if (!groups) return [];
    return groups.filter((g) => !selected.has(g.address));
  }
  function syncCta() {
    if (isGroup) { remove.disabled = false; return; }
    if (groups === null) { remove.disabled = true; return; }   // still loading → no blind remove
    const left = blockersLeft().length;
    remove.disabled = left > 0;
    if (removeLabel) {
      removeLabel.textContent = selected.size
        ? (strings.leaveAndRemove || 'Leave {n} & remove').split('{n}').join(String(selected.size))
        : (strings.removeContact || 'Remove contact');
    }
    if (hint) {
      hint.textContent = !groups.length
        ? (strings.noSharedGroupsRemovable || 'No shared groups. This contact can be removed.')
        : (left
          ? (strings.sharedGroupsBlock || 'A contact who is in one of your groups cannot be removed. Tick the groups to leave them first, or keep the contact.')
          : (strings.sharedGroupsReady || 'You will leave the ticked groups and their chats are removed from this device. Then the contact is removed.'));
    }
  }
  function renderGroups() {
    if (!groupsEl) return;
    for (const old of groupsEl.querySelectorAll('.c-remove-contact__row')) old.remove();
    for (const g of groups || []) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'c-remove-contact__row';
      row.setAttribute('role', 'checkbox');
      row.setAttribute('aria-checked', String(selected.has(g.address)));
      row.append(createAvatar({ name: g.name || '', address: g.address || '', size: 40, group: true }));
      const nm = document.createElement('span');
      nm.className = 'c-remove-contact__rowname';
      nm.textContent = g.name || g.address || '';
      const check = document.createElement('span');
      check.className = 'c-delete-chat__check';
      check.setAttribute('aria-hidden', 'true');
      check.append(icon('check', { size: 16 }));
      row.append(nm, check);
      row.addEventListener('click', () => {
        const on = !selected.has(g.address);
        if (on) selected.add(g.address); else selected.delete(g.address);
        row.setAttribute('aria-checked', String(on));
        syncCta();
      });
      groupsEl.insertBefore(row, hint);
    }
    syncCta();
  }
  let fired = false;                                     // loop r1 A-1: the destructive verb fires ONCE per sheet
  function confirmRemove() {
    if (remove.disabled || fired) return;
    const leaveGroups = [...selected];
    const fire = () => { if (fired) return; fired = true; if (onRemove) onRemove({ leaveGroups }); closeSheet(sheet); };
    if (!leaveGroups.length) { fire(); return; }
    // the additional confirm step — leaving groups is its own destructive act
    openModal(createModal({
      title: (strings.leaveGroupsConfirmTitle || 'Leave {n} groups and remove {name}?')
        .split('{n}').join(String(leaveGroups.length)).split('{name}').join(chat.name || chat.address || ''),
      // loop r1 A-4 (C#): leaving a group REMOVES that group's chat from this device
      // (Core removeFriend → deleteMessages) — the copy says so
      body: strings.leaveGroupsConfirmBody || 'You leave the ticked groups first. Their chats are removed from this device. Then the contact is removed.',
      role: 'alertdialog', host,
      actions: [
        { label: strings.cancel || 'Cancel', type: 'text', autofocus: true },
        { label: strings.leaveAndRemoveConfirm || 'Leave & remove', type: 'fill', intent: 'destructive', onClick: fire },
      ],
    }));
  }

  sheet = createSheet({ content, host, strings,
    title: isGroup ? (strings.leaveGroupTitle || 'Leave group?') : (strings.removeSheetTitle || 'Remove contact?'),
    onDismiss: () => { if (liveRemoveSheet === sheet) liveRemoveSheet = null; if (!sheet._removed && onKeep) onKeep(); } });
  sheet._removed = false;
  sheet._address = chat.address || '';
  liveRemoveSheet = sheet;
  sheet._setGroups = (list) => { groups = (list || []).filter((g) => g && g.address); renderGroups(); };
  sheet._setError = (msg) => { err.hidden = !msg; err.textContent = msg || ''; };
  const origFire = onRemove;
  onRemove = (p) => { sheet._removed = true; if (origFire) origFire(p); };
  syncCta();
  openSheet(sheet);
  if (!isGroup) {
    if (onNeedGroups) {
      onNeedGroups(chat.address);                          // the shell asks C#; the answer lands via setRemoveSheetGroups
      // loop r2 R2-3: a belt — an old exe answers NOTHING; after 4 s the hint says so.
      // Remove stays DISABLED (a blind remove would hit Core's refusal anyway), Keep is the exit.
      const belt = setTimeout(() => {
        if (groups !== null || !isOverlayOpen(sheet)) return;
        if (hint) hint.textContent = strings.sharedGroupsUnknown || 'Could not check your groups. Keep the contact and try again.';
      }, 4000);
      sheet.addEventListener('transitionend', () => { if (!isOverlayOpen(sheet)) clearTimeout(belt); }, { once: true });
    } else {
      sheet._setGroups(chat.sharedGroups || []);           // static hosts (demos): what the chat carries
    }
  }
  return sheet;
}

/** The shell's answer to onNeedGroups: the LIVE remove sheet for `address` takes
 *  [{ name, address }] (name/address pairs from C#). A late answer for another peer,
 *  or for a sheet already gone, is dropped. Returns true when applied. */
let liveRemoveSheet = null;
// loop r1 A-3: "live" = ON THE OVERLAY STACK (isOverlayOpen) — a sheet in its 400 ms
// exit is still connected but pointer-dead, and it must not swallow a late answer
export function setRemoveSheetGroups(address, groups) {
  const sh = liveRemoveSheet;
  if (!sh || !isOverlayOpen(sh) || String(sh._address || '') !== String(address || '')) return false;
  sh._setGroups(groups || []);
  return true;
}

/** The shell's report of the verb's outcome: 'blocked' re-opens the question with the
 *  blocking groups named; anything else is the shell's toast. Returns true when a live
 *  sheet took it. */
export function setRemoveSheetResult(address, status, groups, strings = getStrings()) {
  const sh = liveRemoveSheet;
  if (!sh || !isOverlayOpen(sh) || String(sh._address || '') !== String(address || '')) return false;
  if (status === 'blocked') {
    sh._setGroups(groups || []);
    sh._setError(strings.removeBlockedInline || 'Still a member of the groups above. Tick them to leave first.');
    return true;
  }
  return false;
}

/** Two-step delete confirm (CH3, Damir 2026-07-07, redesigned after F5). Step 1
 *  "Delete chat" leads with the peer avatar + name and CHECKBOXES so it's clear
 *  exactly what goes: the chat (fixed — that's the action) + optionally downloaded
 *  media & files. Confirming removes the row and opens step 2 — ★ A5: the REMOVE-
 *  CONTACT SHEET (openRemoveContactSheet), no longer a second modal.
 *  Each terminal fires onAction(action, detail) so the shell emits the verb
 *  (★ A6: `ixian:removehistory:<addr>` / `ixian:removecontact:<addr>:<leave>` —
 *  before this batch nothing reached C#, and the contact stayed on disk).
 *  opts.onNeedGroups(addr) → the shell asks C# for the shared groups. */
export function openDeleteFlow({ chat = {}, host, onAction, onNeedGroups, strings = getStrings() } = {}) {
  const content = document.createElement('div');
  content.className = 'c-delete-chat';
  content.append(deletePeerHeader(chat, strings));
  const optsWrap = document.createElement('div');
  optsWrap.className = 'c-delete-chat__opts';
  // "Delete chat" is fixed-on (you're in the delete-chat flow) — a checked+disabled
  // box states the outcome plainly; "media & files" is the real toggle.
  let step1Fired = false;
  const cbChat = deleteCheckbox(strings.deleteChatOpt || 'Delete chat', { checked: true, disabled: true });
  const cbMedia = deleteCheckbox(strings.deleteMediaOpt || 'Delete media & files');
  optsWrap.append(cbChat.row, cbMedia.row);
  content.append(optsWrap);

  openModal(createModal({
    title: strings.deleteChatTitle || 'Delete chat?',
    content, role: 'alertdialog', host,
    actions: [
      { label: strings.cancel || 'Cancel', type: 'text', autofocus: true },   // safe action focused (APG)
      { label: strings.delete || 'Delete', type: 'fill', intent: 'destructive',
        onClick: () => {
          if (step1Fired) return;                              // loop r1 A-2: one shot (modal actions get no event)
          step1Fired = true;
          const media = cbMedia.input.checked;
          if (onAction) onAction('delete', { media });          // removes the row (+ media intent)
          openRemoveContactSheet({
            chat, host, strings, onNeedGroups,
            onRemove: ({ leaveGroups }) => { if (onAction) onAction('deleteContact', { media, leaveGroups }); },
          });
        } },
    ],
  }));
}

/** ★ B1: the revoke prompt for an outgoing pending contact request. Honest copy —
 *  the withdrawal is LOCAL (removeFriend); the peer keeps their copy of the request
 *  (no protocol withdraw verb — RC1, BE). onAction('revokeRequest') fires ONCE. */
export function openRevokeRequestFlow({ chat = {}, host, onAction, strings = getStrings() } = {}) {
  const content = document.createElement('div');
  content.className = 'c-delete-chat';
  content.append(deletePeerHeader(chat, strings));
  const body = document.createElement('p');
  body.className = 'c-delete-chat__body';
  body.textContent = strings.revokeRequestBody
    || 'The request is withdrawn on this device and the chat is removed. They are not told: their copy of the request stays until they act on it.';
  content.append(body);
  let fired = false;
  openModal(createModal({
    title: strings.revokeRequestTitle || 'Revoke the contact request?',
    content, role: 'alertdialog', host,
    actions: [
      { label: strings.keepContactRequest || 'Keep request', type: 'text', autofocus: true },
      { label: strings.revokeRequestConfirm || 'Revoke', type: 'fill', intent: 'destructive',
        onClick: () => { if (fired) return; fired = true; if (onAction) onAction('revokeRequest'); } },
    ],
  }));
}

/** Long-press (touch) + right-click (desktop) wiring for one chat row. */
export function attachChatRowMenu(row, opts = {}) {
  let timer = null;
  let startX = 0;
  let startY = 0;
  let fired = false;

  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };

  row.addEventListener('pointerdown', (e) => {
    fired = false;                              // any new gesture resets suppression (audit r4)
    if (e.button !== 0) return;                 // right button → contextmenu path
    // #265 (Damir ①): long-press = TOUCH-only; a held MOUSE button never pops a
    // menu on desktop (right-click does). Touch-screen desktops keep it (MINOR-7).
    if (document.documentElement.hasAttribute('data-desktop') && e.pointerType !== 'touch') return;
    startX = e.clientX; startY = e.clientY;
    cancel();
    timer = setTimeout(() => {
      timer = null;
      fired = true;
      openChatRowMenu({ ...opts });
    }, CHATMENU_LONG_PRESS_MS);
  });
  row.addEventListener('pointermove', (e) => {
    if (timer && (Math.abs(e.clientX - startX) > CHATMENU_MOVE_CANCEL_PX ||
                  Math.abs(e.clientY - startY) > CHATMENU_MOVE_CANCEL_PX)) cancel();
  });
  row.addEventListener('pointerup', cancel);
  row.addEventListener('pointercancel', cancel);
  // long-press fired → the release click must not open the chat
  row.addEventListener('click', (e) => {
    if (fired) { e.preventDefault(); e.stopPropagation(); fired = false; }
  }, true);

  row.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (fired) return;                          // Android fires contextmenu ≈ long-press (audit r3)
    cancel();
    fired = true;
    openChatRowMenu({ ...opts });
  });

  // keyboard path to the context menu (a11y): the swipe accelerator is pointer-only,
  // so keyboard users reach Pin/Mute/Mark-read/Delete here. Shift+F10 and the
  // dedicated ContextMenu/Apps key are the standard "open context menu" bindings.
  row.addEventListener('keydown', (e) => {
    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      e.preventDefault();
      cancel();
      fired = false;                            // keyboard open ≠ a click to suppress
      openChatRowMenu({ ...opts });
    }
  });
}
