/* ==== S20 D (#1377 option 1, Damir 17:2x, the render "Spixi Session 20 Dials") — the DARK chat GROUNDS one step darker ====
 * On the BUILT chat.html (jsdom), DARK theme, each of the 7 canvases set on the live root; the ground (--gradient-chat) the chat
 * PAINTS is read as the document computes it; OKLab and WCAG computed here, never restated:
 *   · every ground stop is the S19 option B stop at OKLab L × 0.85 (± 0.004 in L, the 8-bit step near black) with its hue kept (± 12° where the stop has chroma,
 *     C ≥ 0.02) — Mist #07090B → #040607 included; the stop count and the angle are kept;
 *   · ★ #1403 (Damir 19:54, "more difference between incoming and outgoing"): each received bubble = the S19 B bubble at OKLCH
 *     C × 0.85 (± 0.004) and L + 0.015 (± 0.004), hue kept (± 8° where C ≥ 0.02); its quote = the S19 rule on the NEW bubble (darker,
 *     1.2 ≤ r < 1.3); it sits ≥ 1.34 : 1 off every stop and further off each stop than the S19 bubble did; text ≥ 7, the meta
 *     ink ≥ 4.5 : 1;
 *   · the select-row gap = the dark band rgba(118,157,255,.22) made opaque over the new middle (± 1 per channel);
 *   · the dark pattern keeps A's visibility on the deeper grounds (per canvas the mean ink-over-stop excess contrast at the
 *     computed alpha is 0.97–1.15 × A's at 0.0832 — the S19 rule; 0.0932 measured 0.90–0.96 on the S20 grounds, 0.101 1.02–1.08);
 *   · LIGHT is unchanged: every light ground = its S19 value.
 * Deliberate breaks (S20 R report): the Dusk bubble back to the S19 #3B224A → bubbles fails (#1403); the dark Ocean rule's stops back to the S19 #002633 / #031129 → grounds fails (Ocean L ratio 1);
 * the dark pattern alpha back to 0.0932 → pattern fails (Iris 0.895). */
export default async function (h) {
  const { ok, root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const f = join(root, 'Spixi/Resources/Raw/html', 'chat.html');
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
  const dom = new JSDOM(readFileSync(f, 'utf8').replace("var n='*SL{SpixiThemeName}'", "var n='dark'"), {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f + '?mobile=1', virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.Element.prototype.scrollIntoView = function () {};
    },
  });
  await sleep(1200);
  const W = dom.window, d = W.document, el = d.documentElement;
  const norm = (v) => String(v || '').replace(/\s+/g, ' ').trim();
  const resolve = (name, depth = 0) => {
    const v = norm(W.getComputedStyle(el).getPropertyValue(name));
    const m = /^var\((--[\w-]+)(?:, *(.*))?\)$/.exec(v);
    return m && depth < 8 ? (resolve(m[1], depth + 1) || m[2] || '') : v;
  };
  const hex = (v) => { const m = /^#([0-9a-f]{6})$/i.exec(v || ''); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; };
  const lin = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const cr = (a, b) => { const [p, q] = [lum(a), lum(b)].sort((u, v) => v - u); return (p + 0.05) / (q + 0.05); };
  const lab = (c) => { const [R, G, B] = c.map(lin);
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s3 = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s3, a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s3, b = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s3;
    return { L, C: Math.hypot(a, b), h: Math.atan2(b, a) * 180 / Math.PI }; };
  const over = (g, i, a) => g.map((x, k) => Math.round(x * (1 - a) + i[k] * a));
  const r2 = (x) => Math.round(x * 1000) / 1000;
  /* S19 option B (the S19 build Damir walked, #1374) — the reference D deepens */
  const B = {
    flat: { name: 'Mist', stops: ['#07090B'], bubble: '#1F2326', quote: '#090A0C', A: ['#0C0E10'] },
    gradient: { name: 'Iris', stops: ['#140C3B', '#080928'], bubble: '#262263', quote: '#15123F', A: ['#1C1645', '#0D1030'] },
    blue: { name: 'Spixi', stops: ['#06193E', '#050D28'], bubble: '#122A5F', quote: '#08193D', A: ['#0F2349', '#0A1430'] },
    green: { name: 'Meadow', stops: ['#05221A', '#05130F'], bubble: '#11352B', quote: '#08221A', A: ['#0F2C23', '#0B1A16'] },
    aurora: { name: 'Aurora', stops: ['#002421', '#041848', '#18064D'], bubble: '#122D67', quote: '#091D46', A: ['#072F2B', '#0C2354', '#201358'] },
    dusk: { name: 'Dusk', stops: ['#281029', '#100921'], bubble: '#3B224A', quote: '#24132F', A: ['#321933', '#161028'] },
    ocean: { name: 'Ocean', stops: ['#002633', '#031129'], bubble: '#053655', quote: '#02243B', A: ['#08313F', '#081831'] },
  };
  const LIGHT = {
    gradient: 'linear-gradient(180deg, #CCD0EC 0%, #D0C9EB 50%, #D5C3EB 100%), var(--chat-canvas-base)',
    green: 'linear-gradient(160deg, #D6EBC6 0%, #D2EDA8 45%, #CFE9BD 100%), var(--chat-canvas-base)',
    blue: 'linear-gradient(180deg, #C9DDF2 0%, #C5D6F1 50%, #C2CFEE 100%), var(--chat-canvas-base)',
    aurora: 'linear-gradient(150deg, #7EE0C4 0%, #5FB4EE 48%, #8F80F2 100%), var(--chat-canvas-base)',
    dusk: 'linear-gradient(160deg, #FFD9C4 0%, #E9C9FF 100%), var(--chat-canvas-base)',
    ocean: 'linear-gradient(160deg, #BDEFFF 0%, #C9D6FF 100%), var(--chat-canvas-base)',
  };
  const BAND = [118, 157, 255];
  const fail = { grounds: [], bubbles: [], gap: [], pattern: [], light: [] };
  const table = {};
  const r = {};
  try {
    el.setAttribute('data-theme', 'dark');
    for (const [g, ref] of Object.entries(B)) {
      el.setAttribute('data-chat-ground', g);
      const raw = resolve('--gradient-chat');
      const got = (raw.match(/#[0-9a-f]{6}/gi) || []).map((x) => x.toUpperCase());
      const angle = (/linear-gradient\((\d+)deg/.exec(raw) || [])[1] || null;
      const refAngle = { gradient: '160', blue: '160', green: '160', aurora: '150', dusk: '160', ocean: '160' }[g] || null;
      const t = { got, ratios: [], dh: [] };
      const okStops = got.length === ref.stops.length && angle === refAngle && got.every((x, i) => {
        const n = lab(hex(x)), o = lab(hex(ref.stops[i]));
        const ratio = n.L / o.L; t.ratios.push(r2(ratio));
        let dh = Math.abs(n.h - o.h); if (dh > 180) dh = 360 - dh; t.dh.push(Math.round(dh));
        return Math.abs(n.L - 0.85 * o.L) <= 0.004 && (o.C < 0.02 || dh <= 12);   // ± 0.004 L ≈ half an 8-bit step near black
      });
      if (!okStops) fail.grounds.push(ref.name + JSON.stringify(t));
      const bub = resolve('--surface-bubble-received').toUpperCase(), q = resolve('--surface-bubble-received-quote').toUpperCase();
      const text = hex(resolve('--text-bubble-received')), meta = hex(resolve('--text-bubble-received-meta'));
      t.vs = got.map((x) => r2(cr(hex(bub), hex(x))));
      const nb = hex(bub) && lab(hex(bub)), ob = lab(hex(ref.bubble)), nq = hex(q);
      let dhB = nb ? Math.abs(nb.h - ob.h) : 999; if (dhB > 180) dhB = 360 - dhB;
      t.bubble = bub; t.quote = q; t.dL = nb && r2(nb.L - ob.L); t.cK = nb && r2(nb.C / ob.C); t.q = nq && hex(bub) ? r2(cr(nq, hex(bub))) : 0;
      t.vsS19 = got.map((x) => r2(cr(hex(ref.bubble), hex(x))));
      const shift = !!nb && Math.abs(nb.L - ob.L - 0.015) <= 0.004 && Math.abs(nb.C - 0.85 * ob.C) <= 0.004 && (ob.C < 0.02 || dhB <= 8);
      const quoteOk = !!nq && lum(nq) < lum(hex(bub)) && t.q >= 1.2 && t.q < 1.3;
      const rises = t.vs.every((v, i) => v >= 1.34 && v > t.vsS19[i]);   // Mist 1.347 is the lowest
      t.text = text && hex(bub) ? r2(cr(text, hex(bub))) : 0; t.meta = meta && hex(bub) ? r2(cr(meta, hex(bub))) : 0;
      if (!(shift && quoteOk && rises && t.text >= 7 && t.meta >= 4.5)) fail.bubbles.push(ref.name + JSON.stringify({ bub, q, dL: t.dL, cK: t.cK, dh: dhB, quote: t.q, vs: t.vs, was: t.vsS19, text: t.text, meta: t.meta }));
      if (g !== 'flat') {
        const s = got.map(hex);
        const mid = s.length === 3 ? s[1] : s[0].map((x, i) => (x + s[1][i]) / 2);
        const want = mid.map((m, i) => BAND[i] * 0.22 + m * 0.78);
        const gap = hex(resolve('--surface-select-row-gap'));
        if (!gap || gap.some((v, i) => Math.abs(v - want[i]) > 1)) fail.gap.push(ref.name + ':' + resolve('--surface-select-row-gap'));
      }
      const alpha = parseFloat(W.getComputedStyle(el).getPropertyValue('--chat-pattern-alpha-1')), ink = hex(resolve('--chat-pattern-ink'));
      const excess = (ss, a) => ss.reduce((acc, x) => acc + cr(over(x, ink, a), x) - 1, 0) / ss.length;
      t.pattern = ink && alpha > 0 ? r2(excess(got.map(hex), alpha) / excess(ref.A.map(hex), 0.0832)) : 0;
      if (!(t.pattern >= 0.97 && t.pattern <= 1.15)) fail.pattern.push(ref.name + ':' + t.pattern + '@' + alpha);
      table[ref.name] = t;
    }
    el.setAttribute('data-theme', 'light');
    for (const [g, v] of Object.entries(LIGHT)) { el.setAttribute('data-chat-ground', g); const got = resolve('--gradient-chat'); if (got.replace(/\s+/g, '') !== v.replace(/\s+/g, '')) fail.light.push(g + ':' + got); }
    for (const k of Object.keys(fail)) r[k] = Object.keys(table).length === 7 && fail[k].length === 0;
    r.noErr = errs.length === 0;
  } catch (e) { r.threw = e.message; }
  finally { try { W.close(); } catch (e) { /* */ } }
  const c = (k, m, extra) => ok(r[k] === true, m + ' — ' + JSON.stringify(r[k] === true ? (extra || { [k]: true }) : { [k]: r[k], threw: r.threw, fail: fail[k], table }).slice(0, 1600));
  c('grounds', '★ S20 D (#1377 option 1): DARK — every ground stop of all 7 canvases is the S19 B stop at OKLab L × 0.85 (± 0.004 L), hue kept, the same stops and angle (computed on the built chat)', { L: Object.fromEntries(Object.entries(table).map(([k, t]) => [k, t.got.join('/')])) });
  c('bubbles', '★ S20 #1403: each dark received bubble = the S19 bubble at C × 0.85, L + 0.015 (hue kept), its quote the S19 rule on it (1.2–1.3 darker); it sits ≥ 1.34 : 1 off every darker stop and further off than the S19 bubble; text ≥ 7, meta ink ≥ 4.5', { b: Object.fromEntries(Object.entries(table).map(([k, t]) => [k, [t.bubble, t.quote, t.vs, t.text, t.meta]])) });
  c('gap', '★ S20 D: each dark select-row gap = the 22 % band made opaque over the new middle (± 1)');
  c('pattern', '★ S20 D: the dark pattern keeps A\'s visibility on the darker grounds (0.97–1.15 × A per canvas, the S19 rule)', { pattern: Object.fromEntries(Object.entries(table).map(([k, t]) => [k, t.pattern])) });
  c('light', '★ S20 D: LIGHT unchanged — every light ground keeps its value');
  c('noErr', '★ S20 D: no page error');
}
