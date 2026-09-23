/**
 * ★ #922 (Session AC) — PHONE-IN-LANDSCAPE, DECIDED FROM THE DEVICE, NOT THE VIEWPORT.
 *
 * The obvious query, `(orientation: landscape)`, reads the VIEWPORT — and on an Android phone
 * in landscape the home WebView is not the window: `HomePage.OnPageSizeChanged` goes two-pane
 * at ≥ 700 DIP, so the home shell lives in a ~400 × 412 column and its viewport reports
 * PORTRAIT while the phone is on its side (the #46 reviewer's MAJOR-1 on the first cut of
 * #922; #918's block had the same blind spot). `screen.orientation` reports the DEVICE, and
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
  return sw > sh;   // no orientation API: the screen's own aspect
}

export function attachPhoneLandscape({ root = typeof document !== 'undefined' ? document.documentElement : null, w = typeof window !== 'undefined' ? window : null, onChange } = {}) {
  if (!root || !w) return () => {};
  if (root.hasAttribute('data-desktop')) return () => {};
  let last = null;
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
    if (hasSo) so.removeEventListener('change', apply);
    w.removeEventListener('resize', apply);
    root.removeAttribute(LANDSCAPE_FLAG);
  };
}
