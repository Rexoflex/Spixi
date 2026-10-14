/* ==== S20F W-6 (#1426) — 24 px above the header on the desktop launch views ====
 * On the BUILT intro.html (jsdom). jsdom cannot lay out, so the TOP OFFSET is read as the computed padding through
 * the kit's media-aware cascade over the BUILT sheets and evaluated (env() = 0 on a desktop window, var() resolved
 * through the element's custom properties, then max() / min() / calc()):
 *   (1) desktop below 900 px (700 / 800 / 899): create, restore and retry pad their top by ≥ 24 px; the welcome pads
 *       by ≥ 24 px — the header (topbar / the language pill row) starts ≥ 24 px down;
 *   (2) desktop ≥ 900 px: the two-column grid keeps its own 48 px (unchanged); ★ #46 r1 (NIT-1): the welcome at the
 *       L2 tight level (data-compact="2") keeps its 8 px on desktop too, L1 keeps the 24;
 *   (3) the PHONE shell is untouched: its form views add nothing above the topbar (the topbar pads by --safe-top
 *       itself) and its welcome keeps max(16 px, --safe-top).
 * The Chromium measure (header top at 700 × 890 / 800 × 600) is in the S20F report.
 * Deliberate breaks (S20F report): ① the desktop form rule removed from launch.html → (1) fails; ② its
 *   :root[data-desktop] dropped (phone-wide) → (3) fails; ③ the welcome rule removed → (1) welcome fails;
 *   ④ (r1) the desktop L2 rule removed → (2) welcomeL2 = 24 fails. */
import { on1Kit } from '../pins-on1/kit.mjs';
export default async function (h) {
  const { ok } = h;
  const { boot, cascade } = on1Kit(h);
  /* a px value of a resolved CSS length expression (env() → 0px; unitless 0 allowed) */
  const px = (expr) => {
    let e = String(expr || '').trim();
    if (!e) return 0;
    e = e.replace(/env\([^()]*\)/g, '0px').replace(/calc\(/g, '(').replace(/max\(/g, 'Math.max(').replace(/min\(/g, 'Math.min(').replace(/(-?[\d.]+)px/g, '$1');
    if (!/^[\d\s.+\-*/(),Mathaxmin]*$/.test(e)) return NaN;
    try { return Function('return (' + e + ')')(); } catch (x) { return NaN; }
  };
  let s = null, p = null;
  try {
    s = await boot({ ua: 'desktop' });
    const { d, W } = s;
    const views = ['create', 'restore', 'retry'].map((n) => [n, d.querySelector('[data-launch-view="' + n + '"]')]);
    const wv = d.querySelector('.c-launch__welcome');
    const top = (el, width) => px(cascade(W, el, 'padding-top', { width, height: 600 }));
    const r1 = {}, r2 = {};
    for (const width of [700, 800, 899]) {
      for (const [n, v] of views) r1[n + '@' + width] = top(v, width);
      r1['welcome@' + width] = top(wv, width);
    }
    for (const [n, v] of views) r2[n + '@1280'] = top(v, 1280);
    wv.dataset.compact = '2'; const l2 = top(wv, 800); wv.dataset.compact = '1'; const l1 = top(wv, 800); delete wv.dataset.compact;
    p = await boot({ ua: 'phone' });
    const r3 = {};
    for (const n of ['create', 'restore', 'retry']) r3[n] = top(p.d.querySelector('[data-launch-view="' + n + '"]'), 390);
    r3.welcome = top(p.d.querySelector('.c-launch__welcome'), 390);
    p.close(); p = null;
    ok(d.documentElement.hasAttribute('data-desktop') && Object.values(r1).every((x) => x >= 24) && Object.values(r2).every((x) => x === 48) && l2 === 8 && l1 === 24,
      '★ S20F W-6 (#1426): on a desktop window below 900 px create / restore / retry and the welcome start their header ≥ 24 px down (it was 0 for the forms); the ≥ 900 px grid keeps 48 px — ' + JSON.stringify({ r1, r2, welcomeL2: l2, welcomeL1: l1 }));
    ok(r3.create === 0 && r3.restore === 0 && r3.retry === 0 && r3.welcome === 16,
      '★ S20F W-6: the PHONE launch views are untouched — no pad above the topbar (it pads by --safe-top itself), the welcome keeps max(16 px, --safe-top) — ' + JSON.stringify(r3));
    ok(s.errs.length === 0, '★ S20F W-6: no page error — ' + JSON.stringify(s.errs.slice(0, 3)));
  } catch (e) {
    ok(false, '★ S20F W-6 l-inset threw: ' + (e && e.stack || e));
  } finally { if (s) s.close(); if (p) p.close(); }
}
