/**
 * c-msgmenu — message context menu (batch 3). Spec: DESIGN_SYSTEM.md §5b,
 * wired SHEET-BASED per CLAUDE.md batch-3 note: quick-react row + action list
 * inside c-sheet (reuses overlay stack/scrim/focus/Esc — #56). The §5b
 * anchored-panel presentation (scrim + promoted bubble at z-50) is NOT built
 * here — 🟡 decide sheet vs anchored panel after Damir feels this version.
 *
 * Actions ↔ bridge reality (§5b table): react/tip/delete via
 * ixian:contextAction:*; copy is JS-side; REPLY/EDIT render ONLY behind
 * capabilities (bridge §8 proposal, DECISIONS #25); report = bots only.
 *
 * attachMessageMenu(row, opts) — long-press ~500ms (cancel >10px move =
 *   scroll intent, §5b) + desktop right-click. Keyboard path (Shift+F10 on a
 *   focusable message) lands with the chat shell — messages aren't focusable
 *   as components yet (flagged).
 * openMessageMenu({ row, host, text, capabilities, onAction, strings })
 *   onAction(action, arg) — 'react' (arg=emoji) | 'reply' | 'copy' | 'tip' |
 *   'delete' | 'report'. Default copy falls back to the Clipboard API.
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
const LONG_PRESS_MS = 500;   // §5b
const MOVE_CANCEL_PX = 10;   // §5b: >10px move = scroll intent

export function openMessageMenu({
  row,
  host,
  text = '',
  capabilities = {},
  reactions = QUICK_REACTIONS,   // overridable: the native bridge only supports a
                                 // single "like" reaction today, so the shell passes
                                 // just ['❤️'] rather than 6 emojis that all map to like
  onAction,
  strings = getStrings(),
} = {}) {
  const content = document.createElement('div');
  content.className = 'c-msgmenu';

  const act = (action, arg) => {
    closeSheet(sheet);
    if (action === 'copy' && !onAction) {
      // JS-side default (§5b); shells may override via onAction
      if (navigator.clipboard && text) navigator.clipboard.writeText(text).catch(() => {});
      return;
    }
    if (onAction) onAction(action, arg);
  };

  // quick-react row (top, §5b: reactions attached above the actions)
  const reacts = document.createElement('div');
  reacts.className = 'c-msgmenu__reacts';
  reacts.setAttribute('role', 'group');
  reacts.setAttribute('aria-label', strings.react || 'React');
  for (const emoji of reactions) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-msgmenu__react';
    b.setAttribute('aria-label', (strings.reactWith || 'React with') + ' ' + emoji);
    const em = document.createElement('span');
    em.setAttribute('aria-hidden', 'true');
    em.textContent = emoji;
    b.append(em);
    b.addEventListener('click', () => act('react', emoji));
    reacts.append(b);
  }
  content.append(reacts);

  const list = document.createElement('div');
  list.className = 'c-msgmenu__list';
  const item = (glyph, label, action, destructive = false) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-msgmenu__item';
    if (destructive) b.dataset.destructive = '';
    b.append(icon(glyph, { size: 20 }), document.createTextNode(label));
    b.addEventListener('click', () => act(action));
    list.append(b);
  };

  // capability-gated first (#25: menu contents constrained by bridge reality)
  if (capabilities.reply) item('arrow-back-up', strings.reply || 'Reply', 'reply');
  if (capabilities.edit) item('pencil', strings.edit || 'Edit', 'edit'); // own messages only — shell/caller gates
  if (text) item('copy', strings.copy || 'Copy', 'copy');
  if (capabilities.select && text) item('checks', strings.select || 'Select', 'select');   // multi-select entry (#139)
  if (capabilities.tip !== false) item('heart-handshake', strings.tip || 'Tip', 'tip');
  // destructive group last (§5b)
  item('trash', strings.deleteMessage || 'Delete', 'delete', true);
  if (capabilities.report) item('alert-square-rounded', strings.report || 'Report', 'report', true);

  content.append(list);

  const sheet = createSheet({ content, host, strings });
  openSheet(sheet);
  return sheet;
}

/** Long-press (touch) + right-click (desktop) wiring for one message row. */
export function attachMessageMenu(row, opts = {}) {
  const target = row.querySelector('.c-bubble, .c-tcard, .c-fbubble, .c-mbubble') || row;
  let timer = null;
  let startX = 0;
  let startY = 0;
  let fired = false;

  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };

  target.addEventListener('pointerdown', (e) => {
    // ANY new gesture resets suppression — a right-click leaves fired=true
    // (no click event follows), which swallowed the next right-click (audit r4)
    fired = false;
    if (e.button !== 0) return; // right button → contextmenu path
    startX = e.clientX;
    startY = e.clientY;
    cancel();
    timer = setTimeout(() => {
      timer = null;
      fired = true;
      openMessageMenu({ row, ...opts });
    }, LONG_PRESS_MS);
  });
  target.addEventListener('pointermove', (e) => {
    if (timer && (Math.abs(e.clientX - startX) > MOVE_CANCEL_PX ||
                  Math.abs(e.clientY - startY) > MOVE_CANCEL_PX)) cancel();
  });
  target.addEventListener('pointerup', cancel);
  target.addEventListener('pointercancel', cancel);
  // long-press fired → the release click must not trigger bubble actions
  // (file open / card buttons); capture phase swallows it once
  target.addEventListener('click', (e) => {
    if (fired) {
      e.preventDefault();
      e.stopPropagation();
      fired = false;
    }
  }, true);

  target.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    // audit r3 MAJOR: Android fires contextmenu at long-press ≈ the same
    // moment the pointer timer fires — without this guard both paths opened
    // a sheet each (double scrim). Whichever path runs first wins.
    if (fired) return;
    cancel();
    fired = true;
    openMessageMenu({ row, ...opts });
  });
}
