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
 * openMessageMenu({ row, host, text, detail, capabilities, onAction, strings })
 *   detail — ★★ L2 (#641): a read-only line above the actions ("3 of 4 delivered").
 *   onAction(action, arg) — 'react' (arg=emoji) | 'reply' | 'copy' | 'tip' |
 *   'delete' | 'report'. Default copy falls back to the Clipboard API.
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';
import { setOverlayOpts, isEditableEl } from './overlay.js';   // ★ #1065 · #1071
import { copyText } from './clipboard.js';   // ★ #993: the shared copy with the file:// fallback
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
/* ★ #1071: the Blink long-press focus move (X.8) does not exist in WebKit — the guard skips iOS/Mac */
const WEBKIT_HOST = () => /^(ios|maccatalyst)$/.test(document.documentElement.getAttribute('data-platform') || '');
const MOVE_CANCEL_PX = 10;   // §5b: >10px move = scroll intent

/* ★★ #1174 (Damir, Android, the Official Group Chat: "while SCROLLING the long-press menu sometimes opens").
 * MECHANISM: a press opens the menu on TWO paths — our 500 ms timer (cancelled by a > 10 px move or pointercancel)
 * and the `contextmenu` event, which Android WebView raises from its OWN long-press detector. The contextmenu path
 * had no move / cancel / scroll test at all, so a finger that rested before the scroll took over opened the menu
 * mid-scroll. ONE press record, shared by every long-press surface (this file, shared-items.js, chats-row-menu.js):
 * a TOUCH press that moved past MOVE_CANCEL_PX, was cancelled (the scroll took the pointer) or saw a scroll of
 * anything it was pressed inside (or the document) VOIDS its contextmenu — and its timer.
 * ⚠ (#46 r1, F2) The record lives on the DOCUMENT, not on the pressed node: the chat log re-renders every row
 * (chat.html renderLogNow → box.replaceChildren) and patchChatRows replaces chats rows, so a message arriving
 * mid-press puts the finger over a REPLACEMENT node that never saw the pointerdown. A per-node record read "no
 * press" there and the Android contextmenu opened the menu mid-scroll. The ancestor path is captured at pointerdown,
 * so a scroll still matches after the pressed node was detached. Capture phase on the document: the record is
 * current before any surface's own handlers read it. Reset on the next pointerdown / keydown (the house grammar):
 * a mouse or pen right click has its own pointerdown (pointerType mouse / pen) → never voided; a keyboard
 * contextmenu (Shift+F10, the Menu key) starts with a keydown → never voided. Installed ONCE per document. */
const pressDocs = new WeakMap();   // document → { last: the current/last press record | null }
function pressStateOf(doc) {
  let st = pressDocs.get(doc);
  if (st) return st;
  st = { last: null, byId: new Map() };
  pressDocs.set(doc, st);
  const begin = (e) => {
    const rec = {
      id: e.pointerId, type: e.pointerType || '', x: e.clientX, y: e.clientY,
      path: typeof e.composedPath === 'function' ? e.composedPath() : [],
      moved: false, cancelled: false, scrolled: false, ended: false,
    };
    st.byId.clear();   // a new gesture: an older finger's record is history
    st.byId.set(rec.id, rec);
    st.last = rec;
  };
  const recOf = (e) => st.byId.get(e.pointerId) || null;
  doc.addEventListener('pointerdown', begin, true);
  doc.addEventListener('pointermove', (e) => {
    const r = recOf(e);
    if (r && !r.ended && (Math.abs(e.clientX - r.x) > MOVE_CANCEL_PX || Math.abs(e.clientY - r.y) > MOVE_CANCEL_PX)) r.moved = true;
  }, true);
  doc.addEventListener('pointercancel', (e) => { const r = recOf(e); if (r) { r.cancelled = true; r.ended = true; r.endedAt = Date.now(); } }, true);
  doc.addEventListener('pointerup', (e) => { const r = recOf(e); if (r) { r.ended = true; r.endedAt = Date.now(); } }, true);   // kept: Windows touch sends contextmenu on release
  doc.addEventListener('keydown', () => { st.last = null; st.byId.clear(); }, true);
  doc.addEventListener('scroll', (e) => {   // scroll does not bubble — the capture listener sees the list's
    const r = st.last;
    if (!r || r.ended || r.type !== 'touch') return;
    if (r.path.indexOf(e.target) !== -1) r.scrolled = true;   // the path ends …, document, window: a page scroll counts
  }, true);
  return st;
}
const PRESS_STALE_MS = 1000;   // > Windows touch's contextmenu-on-release gap; < any deliberate second press
export function attachTouchPressGuard(node) {
  const st = pressStateOf((node && node.ownerDocument) || document);
  return {
    /** true = the current / last press is a TOUCH press that became a scroll → its contextmenu (or timer) opens nothing. */
    /* #46 r2 (1): an ENDED press voids only for PRESS_STALE_MS — a contextmenu with no new press (TalkBack's long-press
       action raises one with no pointer events) must not stay blocked by an old scroll */
    voids() { const r = st.last; return !!r && r.type === 'touch' && (r.moved || r.cancelled || r.scrolled) && (!r.ended || Date.now() - (r.endedAt || 0) < PRESS_STALE_MS); },
  };
}

export function openMessageMenu({
  row,
  host,
  text = '',
  /* ★★ L2 (#641): a NON-INTERACTIVE detail line, above the actions. Damir ruled that
   * the read status leaves the bubble and the DETAIL goes here — the menu already
   * leads with the message, and it costs no room in the bubble. Empty = no line, so
   * a 1:1 chat and a room with no answer yet look exactly as they did. */
  detail = '',   // string, or a function evaluated at OPEN time (see below)
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
      copyText(text);   // ★ #993: was the async API alone — a no-op on a file:// WKWebView
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

  // ★★ L2 (#641): the delivery detail. A note, not a control — it is never focusable
  // and never in the action list, so keyboard order is unchanged.
  /* ★★ L2 (#641): `detail` may be a STRING or a FUNCTION. attachMessageMenu captures its
     options once, at row-wire time, and replays them on every long-press — so a caller
     whose value changes after the row is rendered (a delivery count that arrives later)
     must pass a function or it will show a frozen answer that contradicts the bubble. */
  const detailText = typeof detail === 'function' ? (() => {
    try { return detail(); } catch (e) { return ''; }
  })() : detail;
  if (detailText) {
    const d = document.createElement('p');
    d.className = 'c-msgmenu__detail';
    d.setAttribute('role', 'note');
    d.textContent = detailText;
    content.append(d);
  }

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
  // ★ Session AE (#934 b): Delete is CAPABILITY-gated like the rest — `false` hides it (a bot-room
  // member on another member's message, where C# does nothing); absent keeps the old default.
  if (capabilities.delete !== false) item('trash', strings.deleteMessage || 'Delete', 'delete', true);
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
  /* ★ #1065 (R.10, Damir): a long-press while typing must not drop the keyboard — the menu opens
     WITHOUT taking focus from the composer (overlay.js keepEditableFocus). */
  setOverlayOpts(sheet, { keepEditableFocus: true });
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
  const press = attachTouchPressGuard(target);   // ★ #1174: a touch press that became a scroll voids its contextmenu
  let timer = null;
  let startX = 0;
  let startY = 0;
  let fired = false;
  let guarded = false;   // ★ #1071: this press was canceled to keep a focused field (KBDIAG reads it)

  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  /* While the log is in SELECTION mode every gesture belongs to the selection:
     a long-press or right-click must toggle the row, not open a second surface
     over the selection bar. Evaluated at fire time (rows are re-wired on every
     re-render, but the mode can start and end between two of them). */
  const selecting = () => !!(row.closest && row.closest('[data-selecting]'));
  /* ★ #1071 [KBDIAG]: X.8 walk evidence — retire at the freeze with [M5] */
  const kbdiag = (via) => {
    try {
      const tag = (n) => (n ? n.tagName + (n.className && typeof n.className === 'string' ? '.' + n.className.split(' ')[0] : '') : 'null');
      console.log('[KBDIAG] open via=' + via + ' guarded=' + guarded + ' ae=' + tag(document.activeElement));
      setTimeout(() => { console.log('[KBDIAG] +400ms ae=' + tag(document.activeElement)); }, 400);
    } catch (err) { /* diagnostics never break the gesture */ }
  };

  target.addEventListener('pointerdown', (e) => {
    // ANY new gesture resets suppression — a right-click leaves fired=true
    // (no click event follows), which swallowed the next right-click (audit r4)
    fired = false;
    guarded = false;
    if (e.button !== 0) return; // right button → contextmenu path
    /* ★★ #1071 (X.8): Blink's long-press focuses the pressed node (HandleMouseFocus) with no DOM
       event — the bubble is not focusable, so the composer blurred and the keyboard went. A canceled
       touch pointerdown is Blink's one switch (suppress_mouse_events_from_gestures_); click and
       contextmenu still fire. Only while a field holds focus; selection mode keeps its grammar;
       WebKit (iOS/Mac) never took this path and is left alone. A TAP keeps its old blur (click). */
    guarded = (e.pointerType === 'touch' || e.pointerType === 'pen') && !selecting() && !WEBKIT_HOST()
      && isEditableEl(document.activeElement);
    if (guarded) e.preventDefault();
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
      /* ★ #1174 (#46 r1, F2): a re-render detached this node mid-press (renderLogNow replaces every row) → its timer
         opens nothing on a dead row; a press the document record saw move / cancel / scroll opens nothing either */
      if (!target.isConnected || press.voids()) return;
      if (selecting()) return;          // selection mode owns the gesture
      fired = true;
      kbdiag('timer');
      openMessageMenu({ row, ...opts });
    }, LONG_PRESS_MS);
  });
  target.addEventListener('pointermove', (e) => {
    if (timer && (Math.abs(e.clientX - startX) > MOVE_CANCEL_PX ||
                  Math.abs(e.clientY - startY) > MOVE_CANCEL_PX)) cancel();
  });
  target.addEventListener('pointerup', cancel);
  target.addEventListener('pointercancel', () => { cancel(); guarded = false; });   // ★ #1071 r2: a press that became a scroll
  // long-press fired → the release click must not trigger bubble actions
  // (file open / card buttons); capture phase swallows it once
  target.addEventListener('click', (e) => {
    if (fired) {
      e.preventDefault();
      e.stopPropagation();
      fired = false;
      return;
    }
    /* ★ #1071 r1: a guarded TAP gets the focus move Blink skipped (blur first — no ring) */
    if (guarded) {
      guarded = false;
      const f = document.activeElement;
      if (isEditableEl(f)) {
        f.blur();
        const to = e.target && e.target.closest && e.target.closest('button:not(:disabled), a[href], input:not(:disabled), select, textarea, [tabindex]');
        if (to instanceof HTMLElement) to.focus({ preventScroll: true });
      }
    }
  }, true);

  target.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (press.voids()) return;          // ★ #1174: Android's own long-press fired over a press that moved / scrolled
    if (selecting()) return;            // selection mode owns the gesture
    // audit r3 MAJOR: Android fires contextmenu at long-press ≈ the same
    // moment the pointer timer fires — without this guard both paths opened
    // a sheet each (double scrim). Whichever path runs first wins.
    if (fired) return;
    cancel();
    fired = true;
    kbdiag('contextmenu');
    openMessageMenu({ row, ...opts });
  });
}
