/* ==== S9 B1 — U-03 (#1247): the sent time and the card's "Failed" badge ≥ 4.5:1 in BOTH themes, on the BUILT chat.html ====
 * Computed from the shell's OWN cascade in jsdom: the time element's opacity (getComputedStyle — the winning rule) and the
 * token chain (--text-bubble-sent-meta over --surface-bubble-sent; --text-error over --surface-error-inverse, 12 % toward
 * black on the card — the color-mix in typed-bubbles.css), light, then <html data-theme="dark">. WCAG 2 relative luminance.
 * Deliberate breaks (S9 B1 hand-back): the sent meta 0.92 → 0.7 → sentLight · the card badge rule's color-mix removed
 * (color: var(--text-error) only) → badgeLight
 * ★ RE-BASED by S20 Q (#1377 B, Damir's dial option 2 supersedes #1247's 0.92): the sent time is at the --bubble-meta-opacity-sent
 * token = 0.7 — Damir's knowing trade (the incoming #1041 one): measured 3.30:1 light · 4.41:1 dark on the default bubble, so
 * the time's floor here is 3:1 (the tick floor #1377 measured), no longer 4.5:1. The badge keeps 4.5:1.
 * S20 break: the token 0.7 → 0.92 → op false · → 0.5 → op + sentLight (2.20:1) · (#46 r1) a dark-only --text-bubble-sent-meta one
 * step dimmer → sentDark */
import { b1Kit } from './b1-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = b1Kit(h);
  const r = {};
  try {
    const s = await K.open({ caps: 'reply' });
    const { W, d } = s;
    const resolve = (name, depth = 0) => {
      const v = W.getComputedStyle(d.documentElement).getPropertyValue(name).trim();
      const m = /^var\((--[\w-]+)(?:,\s*([^)]+))?\)$/.exec(v);
      if (m && depth < 12) return resolve(m[1], depth + 1) || (m[2] || '').trim();
      return v;
    };
    const hex = (v) => { const m = /^#([0-9a-f]{6})$/i.exec(v); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; };
    const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const mix = (fg, bg, a) => fg.map((c, i) => c * a + bg[i] * (1 - a));
    const time = K.rowOf(d, 'cc02').querySelector('.c-bubble__meta time') || K.rowOf(d, 'cc02').querySelector('.c-bubble__meta > *');
    /* ★ re-based by S20 Q (#1377): the winning value is now a token — var() resolved through the root (jsdom does not) */
    const opRaw = W.getComputedStyle(time).opacity.trim();
    const opVar = /^var\((--[\w-]+)\)$/.exec(opRaw);
    const op = Number(opVar ? resolve(opVar[1]) : opRaw);
    /* the card badge: its winning colour declaration must be the color-mix toward black at 12 % */
    const badgeRule = [...d.styleSheets].flatMap((sh) => { try { return [...sh.cssRules]; } catch (e) { return []; } })
      .filter((ru) => ru.selectorText === '.c-tcard__badge .c-badge[data-weight="tonal"][data-type="error"]');
    const mixPct = badgeRule.length ? (/color-mix\(in srgb, var\(--text-error\) (\d+)%, #000\)/.exec(badgeRule[badgeRule.length - 1].cssText) || [])[1] : null;
    const k = mixPct ? Number(mixPct) / 100 : 1;
    const measure = () => {
      const fg = hex(resolve('--text-bubble-sent-meta'));
      const bg = hex(resolve('--surface-bubble-sent'));
      const ef = hex(resolve('--text-error'));
      const eb = hex(resolve('--surface-error-inverse'));
      return { sent: fg && bg ? ratio(mix(fg, bg, op), bg) : 0, badge: ef && eb ? ratio(ef.map((c) => c * k), eb) : 0 };
    };
    const light = measure();
    d.documentElement.setAttribute('data-theme', 'dark');
    const dark = measure();
    r.op = Math.abs(op - 0.7) < 1e-9;   // ★ re-based by S20 Q (#1377): was 0.92 (> 0.9)
    r.sentLight = light.sent >= 3.2;    // ★ re-based by S20 Q (#1377): was ≥ 4.5 — the 0.7 time is Damir's knowing trade (measured 3.30)
    r.sentDark = dark.sent >= 4.3;      // (measured 4.41) — #46 r1 auditor C: floors just under the measurement, so a step down is caught
    r.badgeLight = light.badge >= 4.5;
    r.badgeDark = dark.badge >= 4.5;
    r.values = [light.sent, dark.sent, light.badge, dark.badge].map((x) => x.toFixed(2)).join('/');
    s.W.close();
  } catch (e) { r.err = e.message; }
  const { values, ...flags } = r;
  ok(Object.values(flags).every((x) => x === true),
    '★ S9 B1 U-03 (#1247, re-based S20 Q #1377) on the built chat shell: the sent time sits at the 0.7 sent-meta opacity and still ≥ 3.2:1 light / 4.3:1 dark over the sent bubble, the card\'s "Failed" badge ≥ 4.5:1, in light AND dark (sent L/D · badge L/D = ' + values + ') — ' + JSON.stringify(flags));
}
