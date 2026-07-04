/**
 * Chat-row swipe accelerator (step 5, spec §6; Damir: option 1 = iOS-Mail reveal
 * + full-swipe). Pointer-only accelerator — the long-press sheet is the
 * accessible/keyboard path (the action buttons here are tabindex=-1 + aria-hidden
 * by design). Leading swipe = Pin/Unpin, trailing = Mute/Unmute, each shown ONLY
 * if its capability is enabled (parkable until BE persists them, #67/§8). Delete
 * stays menu-only; NON-destructive actions only.
 *
 *   wrapChatRowSwipe(rowEl, { chat, capabilities, strings, onAction, rtl }) → wrapper
 *     onAction('pin'|'mute') fires on full-swipe commit OR action-button tap.
 *   closeChatRowSwipe() — closes any currently-open drawer (call before a list
 *     re-render so the single-open invariant + GC hold).
 *
 * If neither pin nor mute is enabled, returns rowEl unwrapped (no swipe).
 * Behaviour: drag reveals the enabled side's labelled action; release past the
 * COMMIT ratio fires it; release past OPEN settles the button open (tap to fire);
 * otherwise springs back. Only one row open at a time. Tapping an open row (or
 * touching another row) closes the drawer.
 */
import { icon } from './icons.js';

const SWIPE_OPEN_PX = 76;         // settle offset that holds the action button open (== CSS min-width)
const SWIPE_COMMIT_RATIO = 0.4;   // drag past this fraction of the row width → fire
const SWIPE_DIRLOCK_PX = 8;       // travel before we decide horizontal vs vertical

let currentClose = null;          // close fn of the currently-open row (only one open)
function closeCurrent() { if (currentClose) { const c = currentClose; currentClose = null; c(); } }

/** Close any open drawer — call before a list re-render (detaches would orphan it). */
export function closeChatRowSwipe() { closeCurrent(); }

export function wrapChatRowSwipe(rowEl, { chat = {}, capabilities = {}, strings = {}, onAction, rtl } = {}) {
  const dir = rtl != null ? rtl
    : (typeof document !== 'undefined' && document.documentElement.getAttribute('dir') === 'rtl');
  // physical sides ↔ logical actions (RTL mirrors leading/trailing)
  const leftAction = dir ? 'mute' : 'pin';
  const rightAction = dir ? 'pin' : 'mute';
  const enabled = (a) => (a === 'pin' ? !!capabilities.pin : !!capabilities.mute);
  const leftEnabled = enabled(leftAction);
  const rightEnabled = enabled(rightAction);
  if (!leftEnabled && !rightEnabled) return rowEl;   // fully parked → no swipe wrapper

  const wrap = document.createElement('div');
  wrap.className = 'c-swipe';

  const actionBtn = (action, side) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-swipe__action c-swipe__action--' + side;
    b.dataset.action = action;
    b.tabIndex = -1;                          // pointer-only accelerator (sheet is the a11y path)
    b.setAttribute('aria-hidden', 'true');
    const label = action === 'pin'
      ? (chat.pinned ? (strings.unpin || 'Unpin') : (strings.pin || 'Pin'))
      : (chat.muted ? (strings.unmute || 'Unmute') : (strings.mute || 'Mute'));
    const glyph = action === 'pin'
      ? (chat.pinned ? 'pinned-off' : 'pin')
      : (chat.muted ? 'bell' : 'bell-off');
    b.append(icon(glyph, { size: 22 }));
    const t = document.createElement('span');
    t.className = 'c-swipe__label';
    t.textContent = label;
    b.append(t);
    b.setAttribute('aria-label', label);
    b.addEventListener('click', () => fire(action));
    return b;
  };
  if (leftEnabled) wrap.append(actionBtn(leftAction, 'left'));
  if (rightEnabled) wrap.append(actionBtn(rightAction, 'right'));

  const content = document.createElement('div');
  content.className = 'c-swipe__content';
  content.append(rowEl);
  wrap.append(content);

  let offset = 0;                 // current translateX (physical px)
  let startX = 0, startY = 0, startOffset = 0;
  let dragging = false, decided = false, horiz = false, swiped = false;

  const setX = (x, animate) => {
    content.style.transition = animate ? '' : 'none';   // '' = CSS transition (spring)
    content.style.transform = x ? 'translateX(' + x + 'px)' : '';
    offset = x;
  };
  const close = () => { setX(0, true); delete wrap.dataset.open; if (currentClose === close) currentClose = null; };
  const openTo = (x) => { closeCurrent(); setX(x, true); wrap.dataset.open = ''; currentClose = close; };
  const fire = (action) => { setX(0, true); delete wrap.dataset.open; if (currentClose === close) currentClose = null; if (onAction) onAction(action); };

  content.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    swiped = false;                                         // reset per gesture (#2: never suppress a fresh tap)
    if (currentClose && currentClose !== close) closeCurrent();   // touching another row closes the open one
    startX = e.clientX; startY = e.clientY; startOffset = offset;
    dragging = true; decided = false; horiz = false;
  });
  content.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (!decided) {
      if (Math.abs(dx) < SWIPE_DIRLOCK_PX && Math.abs(dy) < SWIPE_DIRLOCK_PX) return;
      decided = true;
      horiz = Math.abs(dx) > Math.abs(dy);
      if (horiz) {
        swiped = true;
        // cancel a pending long-press on the ROW without ending our own gesture
        // (non-bubbling so it doesn't reach content's pointercancel → end). #3
        try { rowEl.dispatchEvent(new Event('pointercancel', { bubbles: false })); } catch (_) {}
        if (content.setPointerCapture) { try { content.setPointerCapture(e.pointerId); } catch (_) {} }
      }
    }
    if (!horiz) return;            // vertical intent → let the list scroll, don't hijack
    e.preventDefault();
    let x = startOffset + dx;
    if (x > 0 && !leftEnabled) x = 0;      // can't reveal a parked side
    if (x < 0 && !rightEnabled) x = 0;
    const w = wrap.offsetWidth || 320;
    x = Math.max(-w, Math.min(w, x));
    setX(x, false);
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    if (!horiz) return;            // stationary / vertical gesture — nothing to settle
    const w = wrap.offsetWidth || 320;
    const commit = w * SWIPE_COMMIT_RATIO;
    if (offset >= commit && leftEnabled) return fire(leftAction);
    if (offset <= -commit && rightEnabled) return fire(rightAction);
    if (offset >= SWIPE_OPEN_PX && leftEnabled) return openTo(SWIPE_OPEN_PX);
    if (offset <= -SWIPE_OPEN_PX && rightEnabled) return openTo(-SWIPE_OPEN_PX);
    close();
  };
  content.addEventListener('pointerup', end);
  content.addEventListener('pointercancel', end);

  // a swipe must not also open the chat; and tapping an OPEN row closes the drawer
  content.addEventListener('click', (e) => {
    if (swiped) { e.preventDefault(); e.stopPropagation(); swiped = false; return; }
    if (wrap.dataset.open !== undefined) { e.preventDefault(); e.stopPropagation(); close(); }
  }, true);

  return wrap;
}
