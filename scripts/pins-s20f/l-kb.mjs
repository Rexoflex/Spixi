/* ==== S20F #46 r1 (MAJOR-2) — the iOS keyboard inset brings the focused launch field back into view ====
 * On the BUILT intro.html (jsdom, phone UA; the shell's launchKeyboardInset + window.__setKbInset — C#'s native
 * keyboard height push). Layout stubbed as a function of the WRITTEN inset (★ #46 r2, MINOR-5): the window is
 * 844 tall, the lifted footer 100, so the retry body spans 100 → 744 − --kb-inset (read from the root's inline
 * style at call time); its password field sits at 450–508.
 *   (1) no launch input focused → an inset push scrolls nothing;
 *   (2) the retry password focused → inset 336 (body bottom 408: the field fully below it) calls
 *       scrollIntoView({ block: 'nearest' }) on its .c-launch__field ONCE; the same inset again does nothing (once
 *       per inset change); 0 does nothing; 80 (bottom 664, the field fully inside) leaves it alone;
 *   (3) ★ r2: inset 280 (bottom 464: the field PARTLY visible, 14 of 58 px) scrolls too — partly visible = hidden.
 * The Chromium proof (an iPhone UA, focus, then __setKbInset: retry / restore / create step 2 at 390 × 844 kb 336,
 * 375 × 667 kb 260, 320 × 568 kb 253 → the field 58 / 58 visible; before the fix 13 / 0 / 0) is in the S20F r1 report.
 * Deliberate breaks (S20F reports): ① setInset without the revealFocused() call → (2) fails (0 calls); ② (r2, M2)
 *   revealFocused() called BEFORE --kb-inset is written → (2) fails (the field reads as visible); ③ (r2, M10) the
 *   visibility test "partly visible = visible" (r.bottom > lo.top && r.top < lo.bottom) → (3) fails. */
import { on1Kit } from '../pins-on1/kit.mjs';
export default async function (h) {
  const { ok } = h;
  const { boot } = on1Kit(h);
  let s = null;
  try {
    s = await boot({ ua: 'phone', query: 'view=retry' });
    const { d, W } = s;
    const v = d.querySelector('[data-launch-view="retry"]');
    const body = v.querySelector('.c-launch__body');
    const field = v.querySelector('.c-launch__field');
    const pw = v.querySelector('.c-lock__input');
    const calls = [];
    W.Element.prototype.scrollIntoView = function (o) { calls.push([this === field ? 'field' : (this.className || this.tagName), JSON.stringify(o)]); };
    const inset = () => parseFloat(d.documentElement.style.getPropertyValue('--kb-inset')) || 0;
    body.getBoundingClientRect = () => { const bottom = 744 - inset(); return { top: 100, bottom, left: 0, right: 390, width: 390, height: bottom - 100 }; };
    field.getBoundingClientRect = () => ({ top: 450, bottom: 508, left: 24, right: 366, width: 342, height: 58 });
    const r = { hasHook: typeof W.__setKbInset === 'function' };
    W.__setKbInset(300);
    r.noFocus = calls.length === 0;
    W.__setKbInset(0);
    pw.focus();
    r.focused = d.activeElement === pw;
    W.__setKbInset(336);
    r.once = calls.length === 1 && calls[0][0] === 'field' && calls[0][1] === '{"block":"nearest"}';
    W.__setKbInset(336);
    r.sameInsetNothing = calls.length === 1;
    W.__setKbInset(0);
    r.zeroNothing = calls.length === 1;
    W.__setKbInset(80);
    r.visibleLeftAlone = calls.length === 1;
    W.__setKbInset(280);
    r.partlyCounts = calls.length === 2;
    ok(Object.values(r).every(Boolean),
      '★ S20F #46 r1 (MAJOR-2): a keyboard inset push brings the focused launch field into the body\'s view — once per inset change, never without a focused launch input, never for a field already in view — ' + JSON.stringify({ r, calls }));
    ok(s.errs.length === 0, '★ S20F l-kb: no page error — ' + JSON.stringify(s.errs.slice(0, 3)));
  } catch (e) {
    ok(false, '★ S20F l-kb threw: ' + (e && e.stack || e));
  } finally { if (s) s.close(); }
}
