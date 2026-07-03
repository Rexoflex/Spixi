/**
 * Chat-row context menu (step 4; spec §6). Long-press / right-click a chat row →
 * c-sheet with Pin/Mute/Mark read/Chat info/Delete. Reuses the c-msgmenu sheet
 * styling (message-menu.css) + the message-menu interaction pattern (long-press
 * ~500ms, cancel on >10px move = scroll intent; desktop right-click; Android
 * double-open guard). Delete routes through the c-modal confirm. Chat info is a
 * stub (Damir: pane deferred) → fires onAction('info'), shell shows a toast.
 *
 * openChatRowMenu({ chat, host, onAction, strings }) → sheet
 *   onAction(action) — 'pin' | 'mute' | 'markRead' | 'info' | 'delete'
 * attachChatRowMenu(row, opts) — wires long-press + right-click on the row
 */
import { icon } from './icons.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';
import { createModal, openModal } from './modal.js';

const CHATMENU_LONG_PRESS_MS = 500;   // §5b
const CHATMENU_MOVE_CANCEL_PX = 10;   // §5b: >10px move = scroll intent

export function openChatRowMenu({ chat = {}, host, onAction, strings = {} } = {}) {
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

  // toggles reflect what tapping DOES (glyph + label describe the action)
  item(chat.pinned ? 'pinned-off' : 'pin',
       chat.pinned ? (strings.unpin || 'Unpin') : (strings.pin || 'Pin'),
       () => act('pin'));
  item(chat.muted ? 'bell' : 'bell-off',
       chat.muted ? (strings.unmute || 'Unmute') : (strings.mute || 'Mute'),
       () => act('mute'));
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
}
