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
 *   onAction(action) — 'pin' | 'mute' | 'markRead' | 'info' | 'delete' | 'cancelHandshake'
 * attachChatRowMenu(row, opts) — wires long-press + right-click on the row
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createAvatar } from './avatar.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';
import { createModal, openModal } from './modal.js';
import { closeChatRowSwipe } from './chats-swipe.js';

const CHATMENU_LONG_PRESS_MS = 500;   // §5b
const CHATMENU_MOVE_CANCEL_PX = 10;   // §5b: >10px move = scroll intent

export function openChatRowMenu({ chat = {}, host, onAction, strings = getStrings(), capabilities = {}, handshaking = false } = {}) {
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
  if (capabilities.delete) {
    item('trash', strings.deleteChat || 'Delete chat', () => {
      closeSheet(sheet);
      openDeleteFlow({ chat, host, onAction, strings });
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

/** One labelled checkbox row → { row, input }. */
function deleteCheckbox(label, { checked = false, disabled = false } = {}) {
  const row = document.createElement('label');
  row.className = 'c-delete-chat__opt';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  if (disabled) input.disabled = true;
  const txt = document.createElement('span');
  txt.textContent = label;
  row.append(input, txt);
  return { row, input };
}

/** Two-step delete confirm (CH3, Damir 2026-07-07, redesigned after F5). Step 1
 *  "Delete chat" leads with the peer avatar + name and CHECKBOXES so it's clear
 *  exactly what goes: the chat (fixed — that's the action) + optionally downloaded
 *  media & files. Confirming removes the row and opens step 2, an explicit "Delete
 *  contact?" escalation (the most destructive — the counterpart keeps their copy).
 *  Each terminal fires onAction(action, { media }) so the shell records the intent
 *  (row removal now via the session tombstone; the on-device wipe + contact removal
 *  land at the BE cutover, CH3). Overlay layer is a stack → opening step 2 from
 *  step 1's action is safe (step 2 takes focus; step 1 auto-dismisses). */
export function openDeleteFlow({ chat = {}, host, onAction, strings = getStrings() } = {}) {
  const content = document.createElement('div');
  content.className = 'c-delete-chat';
  content.append(deletePeerHeader(chat, strings));
  const optsWrap = document.createElement('div');
  optsWrap.className = 'c-delete-chat__opts';
  // "Delete chat" is fixed-on (you're in the delete-chat flow) — a checked+disabled
  // box states the outcome plainly; "media & files" is the real toggle.
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
          const media = cbMedia.input.checked;
          if (onAction) onAction('delete', { media });          // removes the row (+ media intent)
          const step2 = document.createElement('div');
          step2.className = 'c-delete-chat';
          step2.append(deletePeerHeader(chat, strings));         // avatar + name on top
          const body2 = document.createElement('p');
          body2.className = 'c-delete-chat__body';
          body2.textContent = strings.deleteContactBody || 'Also remove this contact from your device? They keep their copy of the chat.';
          step2.append(body2);
          openModal(createModal({
            title: strings.deleteContactTitle || 'Delete contact too?',
            content: step2,
            role: 'alertdialog', host,
            actions: [
              { label: strings.keepContact || 'Keep contact', type: 'text', autofocus: true },
              { label: strings.deleteContact || 'Delete contact', type: 'fill', intent: 'destructive',
                onClick: () => { if (onAction) onAction('deleteContact', { media }); } },
            ],
          }));
        } },
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
