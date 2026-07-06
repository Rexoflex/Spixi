/**
 * Chat-row context menu (step 4; spec §6). Long-press / right-click a chat row →
 * c-sheet with Pin/Mute/Mark read/Chat info/Delete. Reuses the c-msgmenu sheet
 * styling (message-menu.css) + the message-menu interaction pattern (long-press
 * ~500ms, cancel on >10px move = scroll intent; desktop right-click; Android
 * double-open guard). Delete routes through the c-modal confirm. Chat info is a
 * stub (Damir: pane deferred) → fires onAction('info'), shell shows a toast.
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
  // destructive last (§5b) — confirm via c-modal
  item('trash', strings.deleteChat || 'Delete chat', () => {
    closeSheet(sheet);
    openModal(createModal({
      title: strings.deleteChatTitle || 'Delete chat?',
      body: strings.deleteChatBody || 'This removes the conversation from your device.',
      role: 'alertdialog', host,
      actions: [
        { label: strings.cancel || 'Cancel', type: 'text', autofocus: true },   // safe action focused (APG)
        { label: strings.delete || 'Delete', type: 'fill', intent: 'destructive', onClick: () => { if (onAction) onAction('delete'); } },
      ],
    }));
  }, true);

  content.append(list);
  const sheet = createSheet({ content, host, strings });
  openSheet(sheet);
  return sheet;
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
