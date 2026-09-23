/**
 * ★ #922 (Session AC) — PHONE-IN-LANDSCAPE, DECIDED FROM THE DEVICE, NOT THE VIEWPORT.
 *
 * The obvious query, `(orientation: landscape)`, reads the VIEWPORT — and the viewport is not
 * the device: when this was written `HomePage.OnPageSizeChanged` went two-pane at ≥ 700 DIP on
 * a landscape phone too, so the home shell lived in a ~400 × 412 column whose viewport reported
 * PORTRAIT while the phone was on its side (the #46 reviewer's MAJOR-1 on the first cut of
 * #922; #918's block had the same blind spot). #923 has since made a phone single-pane in every
 * posture (HomePage.isPhoneDisplay, the SAME 600 dp short-side rule as PHONE_SHORT_SIDE_MAX
 * below — a pin holds them equal), but the flag stays the DEVICE's: a keyboard, a split-screen
 * window or a pane can still shrink the viewport without turning the phone. `screen.orientation` reports the DEVICE, and
 * `screen.width/height` the device too, so the flag below is true exactly when the phone is
 * held landscape — inside a pane, full-window, keyboard up or down (a keyboard shrinks the
 * viewport, never the screen: the portrait-plus-keyboard case that the height-only query got
 * wrong can never match here). A tablet (short side ≥ 600) is not a phone and keeps its
 * bars; desktop is refused outright (`data-desktop`, #228). The one known blind spot is a
 * portrait split-screen window on a landscape-held phone — the device wins; accepted.
 *
 * Sets `data-landscape` on the root; the shells key their short-landscape rules on it
 * (#918 wallet/apps) and the rail (attachLandscapeRail) keys on it plus the platform flag.
 * `screen.orientation` is Chrome 38+ / WebKit 16.4+; the belt is `window.resize` with the
 * same predicate, so a WebView without the API still flips on rotation.
 */
export const PHONE_SHORT_SIDE_MAX = 600;   // Material: compact width class < 600 dp; a tablet is not a phone
export const LANDSCAPE_FLAG = 'data-landscape';

export function isPhoneLandscape(w = typeof window !== 'undefined' ? window : null) {
  if (!w || !w.screen) return false;
  const sw = Number(w.screen.width) || 0, sh = Number(w.screen.height) || 0;
  if (!sw || !sh) return false;
  if (Math.min(sw, sh) >= PHONE_SHORT_SIDE_MAX) return false;   // tablet / desktop-sized
  const o = w.screen.orientation && typeof w.screen.orientation.type === 'string' ? w.screen.orientation.type : '';
  if (o) return o.indexOf('landscape') === 0;
  // #926 (r-review MINOR-2): WKWebView before 16.4 has no screen.orientation AND reports
  // screen.width/height in portrait whatever the posture — the aspect fallback is always
  // false there. The deprecated window.orientation (±90 = landscape) is what those versions do have.
  if (typeof w.orientation === 'number') return Math.abs(w.orientation) === 90;
  return sw > sh;   // no orientation API at all: the screen's own aspect
}

/* #926 (r-review NIT-10): home attaches the flag once for the #918 rules and once more inside
 * attachLandscapeRail — a detach must not pull the flag from under the other attachment, so the
 * attribute is owned by a per-root COUNT and removed only when the last attachment goes. */
const flagRefs = new WeakMap();

export function attachPhoneLandscape({ root = typeof document !== 'undefined' ? document.documentElement : null, w = typeof window !== 'undefined' ? window : null, onChange } = {}) {
  if (!root || !w) return () => {};
  if (root.hasAttribute('data-desktop')) return () => {};
  flagRefs.set(root, (flagRefs.get(root) || 0) + 1);
  let last = null, detached = false;
  const apply = () => {
    const on = isPhoneLandscape(w);
    if (on) root.setAttribute(LANDSCAPE_FLAG, ''); else root.removeAttribute(LANDSCAPE_FLAG);
    if (on !== last) { last = on; if (typeof onChange === 'function') { try { onChange(on); } catch (e) { } } }
  };
  apply();
  const so = w.screen && w.screen.orientation;
  const hasSo = !!(so && typeof so.addEventListener === 'function');
  if (hasSo) so.addEventListener('change', apply);
  w.addEventListener('resize', apply);   // the belt: a WebView without screen.orientation still rotates
  return () => {
    if (detached) return;
    detached = true;
    if (hasSo) so.removeEventListener('change', apply);
    w.removeEventListener('resize', apply);
    const left = (flagRefs.get(root) || 1) - 1;
    flagRefs.set(root, left);
    if (left <= 0) root.removeAttribute(LANDSCAPE_FLAG);   // the last attachment clears the flag
  };
}
