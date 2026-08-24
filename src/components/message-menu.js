/**
 * c-msgmenu — message context menu (batch 3). Spec: DESIGN_SYSTEM.md §5b,
 * wired SHEET-BASED per CLAUDE.md batch-3 note: quick-react row + action list
 * inside c-sheet (reuses overlay stack/scrim/focus/Esc — #56). The §5b
 * anchored-panel presentation is now PARTLY built: #506② promotes the pressed
 * message above the scrim (z-42, sheet moved to z-44), the menu itself stays a
 * sheet.
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
import { anchorSheetToRow } from './desktop-anchors.js';   // ★ Batch E (a) (#557): mobile anchored dropdown

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

/* ★ iOS-62 / #492 (Damir on device 2026-08-21, DECIDED: the cheap TINT).
 *
 * "Long-press should highlight the pressed message so it stays visible behind the
 * scrim — you cannot see what you are acting on." iMessage lifts the bubble above the
 * blur; WhatsApp tints it. Damir picked the tint, explicitly NOT auto-select: selection
 * would re-open the WKWebView native selection gesture #290 suppressed, and it puts the
 * user in a mode they then have to escape.
 *
 * ⚠ ONE resolver, used by BOTH the opener and the gesture wiring. attachMessageMenu
 * already computes this element to bind its listeners to; if the two ever disagreed the
 * tint would land on a different node than the one the user pressed. */
export function messageMenuTarget(row) {
  if (!row) return null;
  return (row.querySelector && row.querySelector('.c-bubble, .c-tcard, .c-fbubble, .c-mbubble')) || row;
}
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
  // multi-select entry (#139). NOT gated on `text` any more: selection now also
  // carries bulk DELETE, which a file/payment/app card supports just as well —
  // the copy action inside selection filters to the rows that have text.
  if (capabilities.select) item('checks', strings.select || 'Select', 'select');
  if (capabilities.tip !== false) item('heart-handshake', strings.tip || 'Tip', 'tip');
  // destructive group last (§5b)
  item('trash', strings.deleteMessage || 'Delete', 'delete', true);
  if (capabilities.report) item('alert-square-rounded', strings.report || 'Report', 'report', true);

  content.append(list);

  /* ★ #506② (iOS-62, Damir on device): the pressed message is PROMOTED ABOVE the
   * scrim for as long as the menu is up, and RINGED. #492 shipped only the ring and
   * left the node under the scrim; the device measured it at 2.01:1 against the
   * bubble versus 5.98:1 above, so no ring colour could ever have answered "you
   * cannot see what you are acting on". The layer was the defect, not the colour.
   *
   * ⚠ TWO nodes, deliberately. The RING goes on the bubble, which is the thing the
   * user pressed and the thing that carries the radius. The LIFT goes on the ROW,
   * because reactions overlap the bubble corner by design (#65) and the avatar and
   * sender label belong to the same message — lifting the bubble alone would strand
   * its own reactions behind the scrim.
   *
   * ⚠ Both cleared through onDismiss, which overlay.js raises on EVERY route out —
   * an action, the scrim, Esc, and the Android back button. Clearing them only in
   * act() would leave a permanently lifted, permanently ringed message behind any of
   * the other three, and a lifted row is pointer-events:none — i.e. a message the
   * user can no longer tap. */
  const tinted = messageMenuTarget(row);
  if (tinted && tinted.dataset) tinted.dataset.menuTarget = '';
  if (row && row.dataset) row.dataset.menuLift = '';
  const untint = () => {
    if (tinted && tinted.dataset) delete tinted.dataset.menuTarget;
    if (row && row.dataset) delete row.dataset.menuLift;
  };

  const sheet = createSheet({ content, host, strings, onDismiss: untint });
  openSheet(sheet);
  /* ★ Batch E (a) (#557, Damir 2026-08-22): on MOBILE the menu anchors to the
   * pressed message — ABOVE it when there is room, so it can never cover what it
   * acts on (the 4.1 fix, structural). Aligned with the BUBBLE (sent sits right,
   * received left). Desktop is untouched: the helper no-ops there and the #268
   * grammar (centered dialog / right-click dropdown) owns the presentation.
   * The lift (#506②) and the deeper mobile scrim ((b)) ride along unchanged. */
  anchorSheetToRow(sheet, row, { host, align: tinted });
  return sheet;
}

/** Long-press (touch) + right-click (desktop) wiring for one message row. */
export function attachMessageMenu(row, opts = {}) {
  const target = messageMenuTarget(row);   // ★ iOS-62: ONE resolver — see the note above
  let timer = null;
  let startX = 0;
  let startY = 0;
  let fired = false;

  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  /* While the log is in SELECTION mode every gesture belongs to the selection:
     a long-press or right-click must toggle the row, not open a second surface
     over the selection bar. Evaluated at fire time (rows are re-wired on every
     re-render, but the mode can start and end between two of them). */
  const selecting = () => !!(row.closest && row.closest('[data-selecting]'));

  target.addEventListener('pointerdown', (e) => {
    // ANY new gesture resets suppression — a right-click leaves fired=true
    // (no click event follows), which swallowed the next right-click (audit r4)
    fired = false;
    if (e.button !== 0) return; // right button → contextmenu path
    // #265 (Damir ①): long-press is a TOUCH gesture — on desktop a held MOUSE
    // button must not pop a menu (right-click is the one desktop path). A
    // touch-screen desktop keeps long-press (Opus review MINOR-7: gating on the
    // platform flag alone would strip the menu from a finger entirely).
    if (document.documentElement.hasAttribute('data-desktop') && e.pointerType !== 'touch') return;
    startX = e.clientX;
    startY = e.clientY;
    cancel();
    timer = setTimeout(() => {
      timer = null;
      if (selecting()) return;          // selection mode owns the gesture
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
    if (selecting()) return;            // selection mode owns the gesture
    // audit r3 MAJOR: Android fires contextmenu at long-press ≈ the same
    // moment the pointer timer fires — without this guard both paths opened
    // a sheet each (double scrim). Whichever path runs first wins.
    if (fired) return;
    cancel();
    fired = true;
    openMessageMenu({ row, ...opts });
  });
}
