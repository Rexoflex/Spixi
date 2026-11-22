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
 *   · LIGHT (re-based by photo1b #1644): every light ground = the PICKED value (Mist = today's S19 value).
 * ★ re-based by S20G N-1 (Damir 21:50 "even darker still, still too close to outgoing"): the bubble clause now expects the S20 bubble
 *   moved OKLCH L −0.06 (Mist −0.04) and ≥ 1.15 off every stop (r1 NIT: was 1.10; measured min 1.158) (was ≥ 1.34 and further off than S19); pins-s20g/c-n1 holds the N-1 relations.
 * ★ re-based by photo1b (#1644, Damir's picks "Calmer 1 / 2" + dark Mist ground back to #0C0E10): the RELATIONS of S20 (every stop L × 0.85, bubble = S19 bubble at C × 0.85 / L − 0.06) no longer hold — the calm step re-picked every ground, bubble and quote, and
 *   dark Mist's ground is back at A's #0C0E10 — so the clauses hold the PICKED values: `grounds` = every stop exactly the picked string (same stop count + angle; hue within 12° of the S20 stop where it has chroma), `bubbles` = the picked bubble + quote exactly,
 *   the quote 1.2 ≤ q < 1.3, ≥ 1.15 : 1 off every stop, text ≥ 7, meta ≥ 4.5; dark Mist bubble : ground 1.35 ± 0.01 and quote 1.25 ± 0.01; `gap` = the band over the new middle (unchanged rule); `pattern` = Mist 0.97–1.15 × A, the six coloured canvases ≥ 0.75 × A (lowering the pattern is the PURPOSE of the pick; measured 0.77–0.86); `light` = the picked light grounds.
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
  /* ★ photo1b (#1644): the S20 stops / bubbles (the build before the calm step) and the PICKED ones (exact strings of the proposal) */
  const S20 = { flat: { stops: ['#040607'], bubble: '#1A1D1F' }, gradient: { stops: ['#0E0433', '#050422'], bubble: '#1D194F' }, blue: { stops: ['#021135', '#020721'], bubble: '#0C1F4B' }, green: { stops: ['#001A12', '#020D0A'], bubble: '#0B2920' },
    aurora: { stops: ['#001B18', '#000F3E', '#120041'], bubble: '#0D2353' }, dusk: { stops: ['#200821', '#0B051B'], bubble: '#2E193A' }, ocean: { stops: ['#001C27', '#010B22'], bubble: '#032A43' } };
  const PICK = { flat: { stops: ['#0C0E10'], bubble: '#272B2D', quote: '#151819' }, gradient: { stops: ['#0E072E', '#05051E'], bubble: '#1D1C49', quote: '#07061B' }, blue: { stops: ['#07132B', '#04091A'], bubble: '#13213F', quote: '#040817' },
    green: { stops: ['#071913', '#040C0A'], bubble: '#142721', quote: '#050E0A' }, aurora: { stops: ['#081A17', '#051332', '#110A33'], bubble: '#152546', quote: '#071023' }, dusk: { stops: ['#1D0C1D', '#0A0716'], bubble: '#2B1D34', quote: '#0E0813' },
    ocean: { stops: ['#091B23', '#040C1C'], bubble: '#122A3B', quote: '#071520' } };
  const LIGHT = {
    gradient: 'linear-gradient(180deg, #CDD0E8 0%, #D0CAE7 50%, #D4C4E6 100%), var(--chat-canvas-base)',
    green: 'linear-gradient(160deg, #DAE9CF 0%, #D6EABA 45%, #D4E6C8 100%), var(--chat-canvas-base)',
    blue: 'linear-gradient(180deg, #CCDDEE 0%, #C7D6ED 50%, #C4CFE9 100%), var(--chat-canvas-base)',
    aurora: 'linear-gradient(150deg, #99DAC6 0%, #7AB2DA 48%, #8F88D7 100%), var(--chat-canvas-base)',
    dusk: 'linear-gradient(160deg, #F7DCCD 0%, #E4CEF3 100%), var(--chat-canvas-base)',
    ocean: 'linear-gradient(160deg, #CAECF7 0%, #CDD7F3 100%), var(--chat-canvas-base)',
  };   // ★ photo1b (#1644 Calmer 1 / 2): was #CCD0EC… / #D6EBC6… / #C9DDF2… / #7EE0C4… / #FFD9C4… / #BDEFFF…
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
        const n = lab(hex(x)), o = lab(hex(S20[g].stops[i]));
        const ratio = n.L / o.L; t.ratios.push(r2(ratio));
        let dh = Math.abs(n.h - o.h); if (dh > 180) dh = 360 - dh; t.dh.push(Math.round(dh));
        return x === PICK[g].stops[i] && (o.C < 0.02 || dh <= 12);   // ★ photo1b (#1644 RE-BASE): the PICKED stop exactly, hue within 12° of the S20 stop (was: L × 0.85 of the S19 B stop ± 0.004)
      });
      if (!okStops) fail.grounds.push(ref.name + JSON.stringify(t));
      const bub = resolve('--surface-bubble-received').toUpperCase(), q = resolve('--surface-bubble-received-quote').toUpperCase();
      const text = hex(resolve('--text-bubble-received')), meta = hex(resolve('--text-bubble-received-meta'));
      t.vs = got.map((x) => r2(cr(hex(bub), hex(x))));
      const nb = hex(bub) && lab(hex(bub)), ob = lab(hex(ref.bubble)), nq = hex(q);
      let dhB = nb ? Math.abs(nb.h - ob.h) : 999; if (dhB > 180) dhB = 360 - dhB;
      t.bubble = bub; t.quote = q; t.dL = nb && r2(nb.L - ob.L); t.cK = nb && r2(nb.C / ob.C); t.q = nq && hex(bub) ? r2(cr(nq, hex(bub))) : 0;
      t.vsS19 = got.map((x) => r2(cr(hex(ref.bubble), hex(x))));
      const dN1 = g === 'flat' ? -0.04 : -0.06;   // ★ S20G N-1 re-base (Damir 21:50 "even darker still"): the S20 bubble then OKLCH L −0.06 (Mist −0.04), C + h kept
      const shift = bub === PICK[g].bubble && q === PICK[g].quote;   // ★ photo1b (#1644 RE-BASE): the PICKED bubble + quote exactly (was: the S19 bubble at C × 0.85, L + 0.015 − 0.06 / Mist − 0.04; dN1 kept above for the record)
      if (g === 'flat') { t.vsGround = r2(cr(hex(bub), got.map(hex)[0])); if (!(Math.abs(t.vsGround - 1.35) <= 0.01 && Math.abs(t.q - 1.25) <= 0.01)) fail.bubbles.push('Mist-ratio' + JSON.stringify({ vsGround: t.vsGround, q: t.q })); }   // ★ photo1b (#1644): dark Mist bubble : ground 1.35 ± 0.01, quote : bubble 1.25 ± 0.01
      const quoteOk = !!nq && lum(nq) < lum(hex(bub)) && t.q >= 1.2 && t.q < 1.3;
      const rises = t.vs.every((v) => v >= 1.15);   // ★ S20G N-1 re-base (r1 NIT 1.10 → 1.15): ≥ 1.15 off every stop (measured 1.16–1.32; Spixi 1.158 the lowest). Was ≥ 1.34 and further off than the S19 bubble (S20 #1403)
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
      if (!(t.pattern >= (g === 'flat' ? 0.97 : 0.75) && t.pattern <= 1.15)) fail.pattern.push(ref.name + ':' + t.pattern + '@' + alpha);
      table[ref.name] = t;
    }
    el.setAttribute('data-theme', 'light');
    for (const [g, v] of Object.entries(LIGHT)) { el.setAttribute('data-chat-ground', g); const got = resolve('--gradient-chat'); if (got.replace(/\s+/g, '') !== v.replace(/\s+/g, '')) fail.light.push(g + ':' + got); }
    for (const k of Object.keys(fail)) r[k] = Object.keys(table).length === 7 && fail[k].length === 0;
    r.noErr = errs.length === 0;
  } catch (e) { r.threw = e.message; }
  finally { try { W.close(); } catch (e) { /* */ } }
  const c = (k, m, extra) => ok(r[k] === true, m + ' — ' + JSON.stringify(r[k] === true ? (extra || { [k]: true }) : { [k]: r[k], threw: r.threw, fail: fail[k], table }).slice(0, 1600));
  c('grounds', '★ S20 D (#1377 option 1), re-based by ★ photo1b (#1644): DARK — every ground stop of all 7 canvases is the PICKED stop (Calmer 1 / 2; dark Mist back at #0C0E10), hue within 12° of the S20 stop, the same stop count and angle (computed on the built chat)', { L: Object.fromEntries(Object.entries(table).map(([k, t]) => [k, t.got.join('/')])) });
  c('bubbles', '★ photo1b (#1644 re-base): each dark received bubble + quote is the PICKED value (the S20 relation — the S19 bubble at C × 0.85, L + 0.015 − 0.06, Mist − 0.04 — no longer holds); dark Mist bubble : ground 1.35 ± 0.01, quote 1.25 ± 0.01; each quote is the S19 rule on its bubble (1.2–1.3 darker); the bubble sits ≥ 1.15 : 1 off every darker stop; text ≥ 7, meta ink ≥ 4.5', { b: Object.fromEntries(Object.entries(table).map(([k, t]) => [k, [t.bubble, t.quote, t.vs, t.text, t.meta]])) });
  c('gap', '★ S20 D: each dark select-row gap = the 22 % band made opaque over the new middle (± 1)');
  c('pattern', '★ S20 D, re-based by ★ photo1b (#1644): the dark pattern keeps A\'s visibility (dark Mist 0.97–1.15 × A on its #0C0E10 ground, the six coloured canvases ≥ 0.75 × A at the calm alpha — lowering it is the pick; the S19 rule was 0.97–1.15 for all)', { pattern: Object.fromEntries(Object.entries(table).map(([k, t]) => [k, t.pattern])) });
  c('light', '★ S20 D, re-based by ★ photo1b (#1644): LIGHT — every light ground is the PICKED value (Mist = today; Iris / Spixi Calmer 1; Meadow / Aurora / Dusk / Ocean Calmer 2)');
  c('noErr', '★ S20 D: no page error');
}
