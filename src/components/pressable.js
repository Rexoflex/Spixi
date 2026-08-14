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
 * Both are bound. The second one to arrive re-runs onDown on the same element, which
 * is harmless — but if the gesture has ALREADY been cancelled by then it must not
 * re-arm it. The `cancelled` latch below is what makes that true (#346); the original
 * comment here claimed it was a no-op, and it was not.
 *
 * ★ THE PART THAT MAKES IT FEEL NATIVE, NOT BROKEN: a press is CANCELLED as soon as
 * the finger moves past PRESS_MOVE_CANCEL_PX, or the pointer leaves, or a scroll starts.
 * Without that rule a flick down a chat list leaves a trail of highlighted rows —
 * which is worse than no feedback at all. Native list rows behave exactly this way.
 *
 * attachPressFeedback({ root, rows, controls }) → detach()
 *   Call ONCE per shell. Idempotent per root. Order does not matter — the listeners
 *   are delegated on the document, so calling before the first render is correct and
 *   is what all four shells do.
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

/* Controls take a tint AND a small scale — the press reads as a physical push.
   ★ #346: `.c-topbar__dots` was listed here and removed. It is the iOS-48/#314
   animated "Connecting…" ellipsis (topbar.css), built with aria-hidden="true" — a
   decorative inline node, not a control. Pressing it set data-pressed on a hidden
   element for no visible effect. The real topbar actions already match `.c-button`,
   because topbar.js builds them with createButton. */
export const PRESSABLE_CONTROL = [
  '.c-button',
  '.c-chip',
  '.c-bottomnav__item',
  '.fab',
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
  /* ★ #346 (review of #343). The header above claims the second event stream "finds
     the same element already pressed and is a no-op". It did not: onDown called
     clear() unconditionally, so a LATE synthesised pointerdown — exactly the Android
     lag the touchstart binding exists for — re-armed a press that touchmove had
     already cancelled, and restarted the travel threshold from the new origin. That is
     the trail-of-lit-rows-during-a-flick this module was written to prevent.
     `cancelled` latches from the moment a gesture becomes a scroll until the gesture
     genuinely ends. A real new tap is always preceded by an end event, so the latch
     costs nothing; the timer is only a backstop for an end event we never receive. */
  let cancelled = false, cancelExpiry = 0;
  /* ★ #346 review MAJOR-1: the latch may ONLY be armed while a gesture is in flight.
     The first cut latched on every `scroll`, and the capture listener sees momentum
     scrolling that continues long AFTER touchend — with no end event left to release
     it. Measured in Chromium: the first tap 100 / 500 / 900 / 1150 ms after the last
     momentum scroll got NO feedback, and only the 1400 ms one did. That is the same
     symptom this module was written to cure ("no feedback effect when tapping on chat
     row"), and it self-heals on the second tap, which would have made it miserable to
     diagnose on device. A programmatic scroll — scroll-to-newest-message, focus()
     pulling an input into view, the keyboard reflow — did it too, with no user gesture
     at all. `pointerDown` is the in-flight test. */
  let pointerDown = false;

  /* One reader for both event shapes — a TouchEvent carries coordinates on
     touches[0], a PointerEvent carries them on the event itself. */
  const pos = (e) => (e.touches && e.touches[0]) || e;

  const clear = () => {
    clearTimeout(safety); safety = 0;
    if (!el) return;
    delete el.dataset.pressed;
    el = null;
  };

  /* The gesture became a scroll/drag: drop the visual, and refuse re-arming for the
     REST OF THIS GESTURE only. With no finger down there is nothing to re-arm, so a
     momentum or programmatic scroll just clears — it must never latch. */
  const cancelGesture = () => {
    if (pointerDown) {
      cancelled = true;
      clearTimeout(cancelExpiry);
      // Backstop only, for an end event that never arrives. Not the normal release.
      cancelExpiry = setTimeout(() => { cancelled = false; }, PRESS_SAFETY_MS);
    }
    clear();
  };

  /* The finger genuinely lifted: drop the visual and let the next tap through. */
  const endGesture = () => {
    pointerDown = false;
    cancelled = false;
    clearTimeout(cancelExpiry); cancelExpiry = 0;
    clear();
  };

  const onDown = (e) => {
    // Primary pointer only: a right-click, a second finger or a stylus barrel press
    // must not paint a press state the user did not ask for.
    if (e.button != null && e.button !== 0) return;
    /* ★ #346 review r2 MINOR-4: a single-touch `touchstart` can only BEGIN a gesture,
       so it always releases the latch. This covers a gesture that ended without any
       end event — the WebView swallowed it, an overlay took the finger — which would
       otherwise leave `pointerDown` true, let the next scroll re-latch, and cost the
       following tap its feedback.
       It does NOT weaken the guard: the late re-arm the latch exists to block is
       always a synthesised PointerEvent, which carries no `touches`, and a second
       finger mid-gesture reports length 2. */
    if (e.touches && e.touches.length === 1) {
      cancelled = false;
      clearTimeout(cancelExpiry); cancelExpiry = 0;
    }
    // A gesture is in flight from here on. Set BEFORE the latch test, so the late
    // second-stream down of an ALREADY-cancelled gesture still counts as finger-down
    // and its end event releases the latch.
    pointerDown = true;
    // A cancelled gesture stays cancelled until it ends. Without this the second
    // event stream re-arms it mid-scroll.
    if (cancelled) return;
    // A multi-finger gesture (pinch, two-finger scroll) is not a tap.
    if (e.touches && e.touches.length > 1) { cancelGesture(); return; }
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
      || Math.abs(p.clientY - startY) > PRESS_MOVE_CANCEL_PX) cancelGesture();
  };

  // passive: these never call preventDefault, and saying so keeps scrolling on the
  // compositor. A non-passive listener here would cost the very smoothness we want.
  const opts = { passive: true };
  host.addEventListener('touchstart', onDown, opts);   // fires on contact (Android)
  host.addEventListener('touchmove', onMove, opts);
  host.addEventListener('touchend', endGesture, opts);
  host.addEventListener('touchcancel', endGesture, opts);
  host.addEventListener('pointerdown', onDown, opts);
  host.addEventListener('pointermove', onMove, opts);
  host.addEventListener('pointerup', endGesture, opts);
  host.addEventListener('pointercancel', endGesture, opts);
  host.addEventListener('dragstart', cancelGesture, opts);
  // Scroll can start without a pointermove that crosses the threshold (momentum,
  // a nested scroller, a keyboard-driven scroll). Capture catches every scroller.
  host.addEventListener('scroll', cancelGesture, { passive: true, capture: true });
  // A page hidden mid-press (app backgrounded, overlay opened) must not come back
  // with a row still lit.
  const onHide = () => endGesture();
  window.addEventListener('pagehide', onHide);
  document.addEventListener('visibilitychange', onHide);

  return function detach() {
    endGesture();
    pressAttached.delete(host);
    host.removeEventListener('touchstart', onDown, opts);
    host.removeEventListener('touchmove', onMove, opts);
    host.removeEventListener('touchend', endGesture, opts);
    host.removeEventListener('touchcancel', endGesture, opts);
    host.removeEventListener('pointerdown', onDown, opts);
    host.removeEventListener('pointermove', onMove, opts);
    host.removeEventListener('pointerup', endGesture, opts);
    host.removeEventListener('pointercancel', endGesture, opts);
    host.removeEventListener('dragstart', cancelGesture, opts);
    host.removeEventListener('scroll', cancelGesture, { capture: true });
    window.removeEventListener('pagehide', onHide);
    document.removeEventListener('visibilitychange', onHide);
  };
}
