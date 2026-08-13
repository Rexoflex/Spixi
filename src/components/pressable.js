/**
 * pressable — one delegated press-feedback mechanism for every shell (#343).
 *
 * WHY THIS EXISTS. The gap the user notices is not the one between the tap and the
 * data; it is the one between the tap and ANY response. A row that stays inert for
 * 300 ms reads as broken, and the same row with a 90 ms tint reads as instant, even
 * when the data takes exactly as long. This buys perceived latency. It does not fix
 * real latency, and it is not a substitute for doing so.
 *
 * WHY DELEGATED, NOT PER-COMPONENT. Every component that wanted this would otherwise
 * grow its own listeners, its own cancel rules and its own drift. One document-level
 * listener plus one CSS block means a new component gets correct press behaviour by
 * adding its class to PRESSABLE_ROW or PRESSABLE_CONTROL below — nothing else.
 *
 * WHY pointerdown, NOT :active OR click.
 *   · `click` fires on RELEASE. Using it would add the very delay we are hiding.
 *   · CSS `:active` is unreliable on iOS: WebKit only applies it when a touch
 *     handler is bound, and it does not cancel on scroll — so dragging a list
 *     lights up every row the finger crosses.
 *   · `pointerdown` fires on contact, on every engine we ship to, with one API.
 *
 * ★ WHY `touchstart` IS ALSO BOUND (device fix, Damir on Android: "it tints, but it's
 * abrupt with delay"). On Android WebView, pointer events are SYNTHESISED from touch
 * events, and the synthesis waits on gesture disambiguation — so `pointerdown` can
 * arrive tens of milliseconds after the finger lands. `touchstart` fires on contact.
 * Both are bound; the second one to arrive finds the same element already pressed and
 * is a no-op, so there is no double work and no risk of divergence.
 *
 * ★ THE PART THAT MAKES IT FEEL NATIVE, NOT BROKEN: a press is CANCELLED as soon as
 * the finger moves past PRESS_MOVE_CANCEL_PX, or the pointer leaves, or a scroll starts.
 * Without that rule a flick down a chat list leaves a trail of highlighted rows —
 * which is worse than no feedback at all. Native list rows behave exactly this way.
 *
 * attachPressFeedback({ root, rows, controls }) → detach()
 *   Call ONCE per shell, after the first render. Idempotent per root.
 *   New shell? One line: attachPressFeedback().
 */

/* Rows take a background tint only. A list row that scales looks like a button and
   reads as a mistake on both platforms — iOS and Android both tint list rows. */
export const PRESSABLE_ROW = [
  '.c-chatlist-item',
  '.c-contacts__row',
  '.c-txlist-item',
  '.c-settings__row',
  '.c-app-item',
  '.c-apps-recents__item',
  '.c-wallet-receive__contact',
].join(',');

/* Controls take a tint AND a small scale — the press reads as a physical push. */
export const PRESSABLE_CONTROL = [
  '.c-button',
  '.c-chip',
  '.c-bottomnav__item',
  '.fab',
  '.c-topbar__dots',
].join(',');

const PRESS_MOVE_CANCEL_PX = 10;      // finger travel that turns a press into a scroll
const PRESS_SAFETY_MS = 1200;         // a pointerup we never saw must not strand a highlight

const pressAttached = new WeakSet();

export function attachPressFeedback({
  root = document, rows = PRESSABLE_ROW, controls = PRESSABLE_CONTROL,
} = {}) {
  const host = root === document ? document : root;
  if (pressAttached.has(host)) return () => {};
  pressAttached.add(host);

  const selector = rows + ',' + controls;
  let el = null, startX = 0, startY = 0, safety = 0;

  /* One reader for both event shapes — a TouchEvent carries coordinates on
     touches[0], a PointerEvent carries them on the event itself. */
  const pos = (e) => (e.touches && e.touches[0]) || e;

  const clear = () => {
    clearTimeout(safety); safety = 0;
    if (!el) return;
    delete el.dataset.pressed;
    el = null;
  };

  const onDown = (e) => {
    // Primary pointer only: a right-click, a second finger or a stylus barrel press
    // must not paint a press state the user did not ask for.
    if (e.button != null && e.button !== 0) return;
    // A multi-finger gesture (pinch, two-finger scroll) is not a tap.
    if (e.touches && e.touches.length > 1) { clear(); return; }
    // `=== false`, not `!`: an engine that does not populate isPrimary (or a
    // synthesised event) must still get feedback. Only an explicit secondary
    // pointer — a second finger mid-gesture — is rejected.
    if (e.isPrimary === false) return;
    clear();
    const t = e.target && e.target.closest ? e.target.closest(selector) : null;
    if (!t) return;
    // Disabled controls must look disabled, not pressable. aria-disabled covers the
    // components that stay focusable on purpose (a11y sweep #205).
    if (t.disabled || t.getAttribute('aria-disabled') === 'true') return;
    el = t;
    el.dataset.pressed = t.matches(controls) ? 'control' : 'row';
    const p0 = pos(e);
    startX = p0.clientX; startY = p0.clientY;
    safety = setTimeout(clear, PRESS_SAFETY_MS);
  };

  const onMove = (e) => {
    if (!el) return;
    const p = pos(e);
    // ★ The scroll rule. Past the threshold this gesture is a scroll, not a tap.
    if (Math.abs(p.clientX - startX) > PRESS_MOVE_CANCEL_PX
      || Math.abs(p.clientY - startY) > PRESS_MOVE_CANCEL_PX) clear();
  };

  // passive: these never call preventDefault, and saying so keeps scrolling on the
  // compositor. A non-passive listener here would cost the very smoothness we want.
  const opts = { passive: true };
  host.addEventListener('touchstart', onDown, opts);   // fires on contact (Android)
  host.addEventListener('touchmove', onMove, opts);
  host.addEventListener('touchend', clear, opts);
  host.addEventListener('touchcancel', clear, opts);
  host.addEventListener('pointerdown', onDown, opts);
  host.addEventListener('pointermove', onMove, opts);
  host.addEventListener('pointerup', clear, opts);
  host.addEventListener('pointercancel', clear, opts);
  host.addEventListener('dragstart', clear, opts);
  // Scroll can start without a pointermove that crosses the threshold (momentum,
  // a nested scroller, a keyboard-driven scroll). Capture catches every scroller.
  host.addEventListener('scroll', clear, { passive: true, capture: true });
  // A page hidden mid-press (app backgrounded, overlay opened) must not come back
  // with a row still lit.
  const onHide = () => clear();
  window.addEventListener('pagehide', onHide);
  document.addEventListener('visibilitychange', onHide);

  return function detach() {
    clear();
    pressAttached.delete(host);
    host.removeEventListener('touchstart', onDown, opts);
    host.removeEventListener('touchmove', onMove, opts);
    host.removeEventListener('touchend', clear, opts);
    host.removeEventListener('touchcancel', clear, opts);
    host.removeEventListener('pointerdown', onDown, opts);
    host.removeEventListener('pointermove', onMove, opts);
    host.removeEventListener('pointerup', clear, opts);
    host.removeEventListener('pointercancel', clear, opts);
    host.removeEventListener('dragstart', clear, opts);
    host.removeEventListener('scroll', clear, { capture: true });
    window.removeEventListener('pagehide', onHide);
    document.removeEventListener('visibilitychange', onHide);
  };
}
