/**
 * edge-back — the BACK SIGNAL iOS never raises (L3, DECISIONS #706).
 *
 * ★ docs/swipe-back-spec.md §1: every back mechanism in this app hangs off
 * `OnBackButtonPressed`, which is the ANDROID hardware-back hook. iOS raises nothing —
 * the navigation bar is hidden everywhere, which disables UIKit's pop gesture, and the
 * surfaces that matter most (chat, Account, contact details, the form pane) are
 * overlay-presented, never pushed, so a pop gesture could not see them anyway. Two
 * rounds of a native edge recogniser died in UIKit arbitration (iOS-56 r1/r2). The
 * touches provably DO reach the page, so the gesture is read HERE.
 *
 * This is the recogniser chat.html carried inline since iOS-56 r3 (#325/#328), lifted
 * into ONE component so every shell attaches it with one line — the house pattern
 * (`attachPressFeedback`). The numbers are the shipped ones, byte-for-byte:
 *   · touchstart within EDGE px of the left edge, ONE finger;
 *   · > TRAVEL px rightward inside MAX_MS, and the threshold SCALES with vertical drift
 *     (#328 r2: `dx > max(70, dy*2)` — a shallow swipe fires at 70, a 49px-drift diagonal
 *     needs 98) — the dominant-axis gate;
 *   · vertical scroll intent (dy > 50 and dy > dx) bails early;
 *   · an ACTIVE text selection means the user is dragging a selection handle
 *     (received bubbles sit left-aligned, so a start-handle drag from the edge IS this
 *     gesture's shape) — never steal it (#328 audit MINOR).
 *
 * ⚠ TOUCH SURFACES ONLY. `:root[data-desktop]` never attaches — a mouse has no edge
 *   swipe and desktop panes have their own back affordances.
 * ⚠ ANDROID: with gesture navigation the SYSTEM owns the edge and the WebView never sees
 *   these touches, so `OnBackButtonPressed` stays the one path there; with 3-button
 *   navigation the recogniser fires as a bonus. It cannot double-fire: a touch either
 *   reaches the page or it does not.
 * ⚠ WHAT `onBack` DOES IS THE SHELL'S DECISION — one level per gesture, in the shell's
 *   own order (chat: channel → stack → tray → cover → selection → ixian:back). This
 *   component raises the signal; it does not decide what "back" means. The four
 *   surfaces that must NOT unwind on a gesture (the lock, the call ring, a money sheet
 *   in flight, LaunchPage's in-place views) are the shells' rule too: lock.html and
 *   call.html never attach, `escDismiss:false` sheets consume through
 *   dismissTopOverlay, and launch routes through the same chain hardware back uses.
 *
 * attachEdgeBack({ onBack, target = document }) → detach()
 *   onBack() — called ONCE per completed gesture, on touchmove at the moment the
 *              threshold is crossed (not on touchend — the shipped behaviour).
 *   target   — the element to listen on (document by default; a shell that wants the
 *              gesture on one region only passes that region).
 */
const EDGE_PX = 24;
const TRAVEL_PX = 70;
const DRIFT_PX = 50;
const MAX_MS = 700;

export function attachEdgeBack({ onBack, target = document } = {}) {
  if (typeof onBack !== 'function') return () => {};
  if (typeof document === 'undefined' || document.documentElement.hasAttribute('data-desktop')) return () => {};
  let x0 = 0, y0 = 0, t0 = 0, tracking = false, fired = false;
  const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
  const onStart = (e) => {
    if (e.touches.length !== 1) { tracking = false; return; }
    const t = e.touches[0];
    tracking = t.clientX <= EDGE_PX;
    fired = false;
    x0 = t.clientX; y0 = t.clientY; t0 = now();
  };
  const onMove = (e) => {
    if (!tracking || fired || e.touches.length !== 1) return;
    if (now() - t0 > MAX_MS) { tracking = false; return; }
    const t = e.touches[0];
    const dx = t.clientX - x0;
    const dy = Math.abs(t.clientY - y0);
    if (dy > DRIFT_PX && dy > dx) { tracking = false; return; }   // vertical scroll intent
    if (dy < DRIFT_PX && dx > Math.max(TRAVEL_PX, dy * 2)) {
      const sel = document.getSelection && document.getSelection();
      if (sel && !sel.isCollapsed) { tracking = false; return; }   // a selection-handle drag, not a swipe
      fired = true; tracking = false;
      try { onBack(); } catch (_) { /* a throwing router must not break the next gesture */ }
    }
  };
  const onEnd = () => { tracking = false; };
  target.addEventListener('touchstart', onStart, { passive: true });
  target.addEventListener('touchmove', onMove, { passive: true });
  target.addEventListener('touchend', onEnd, { passive: true });
  target.addEventListener('touchcancel', onEnd, { passive: true });
  return () => {
    target.removeEventListener('touchstart', onStart);
    target.removeEventListener('touchmove', onMove);
    target.removeEventListener('touchend', onEnd);
    target.removeEventListener('touchcancel', onEnd);
  };
}
