/* ==== S20G N-1 (Damir 21:50, "even darker still, still too close to outgoing") — THE DARK RECEIVED BUBBLES ONE STEP DARKER ====
 * On the BUILT chat.html (jsdom), DARK theme, each of the 7 canvases set on the live root; the tokens read as the document
 * computes them; OKLab and WCAG computed here, never restated:
 *   (1) SHIFT — each received bubble = the S20 bubble (#1403) at OKLCH L −0.06 (Mist, the flat canvas, −0.04) ± 0.004, chroma
 *       kept (± 0.004) and hue kept (± 3° where C ≥ 0.02);
 *   (2) QUOTE — each received quote = the S19 rule on the NEW bubble (the bubble scaled uniformly in OKLab until 1.25 : 1 darker;
 *       recomputed here, ± 1 per channel) and 1.2 ≤ quote : bubble < 1.3 (Mist's lands on #000 at 1.24 — the rule's floor);
 *   (3) GROUND — the bubble is lighter than every stop of the ground the chat paints and ≥ 1.10 : 1 against each;
 *   (4) INKS — text ≥ 7 : 1; the meta ink AS PAINTED (over the bubble at --bubble-meta-opacity-received) ≥ 4.5 : 1;
 *   (5) THE ASK — every bubble sits FURTHER from the canvas's own sent colour (Auto) than the S20 bubble did;
 *   (6) LIGHT unchanged — #ffffff on every canvas.
 * Deliberate breaks (S20G B1 report): the Ocean bubble back to the S20 #153A54 → SHIFT + THE ASK fail (Ocean) · the Spixi quote
 * back to #0F1E3F → QUOTE fails (Spixi) · the Meadow bubble one more step (#02221A) → GROUND fails (Meadow 1.06) · the meta opacity
 * token 0.7 → 0.5 → INKS fails. */
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
  const W = dom.window, el = W.document.documentElement;
  const norm = (v) => String(v || '').replace(/\s+/g, ' ').trim();
  const resolve = (name, depth = 0) => {
    const v = norm(W.getComputedStyle(el).getPropertyValue(name));
    const m = /^var\((--[\w-]+)(?:, *(.*))?\)$/.exec(v);
    return m && depth < 8 ? (resolve(m[1], depth + 1) || m[2] || '') : v;
  };
  const hex = (v) => { const m = /^#([0-9a-f]{6})$/i.exec(v || ''); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; };
  const lin = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  const gam = (x) => 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const cr = (a, b) => { const [p, q] = [lum(a), lum(b)].sort((u, v) => v - u); return (p + 0.05) / (q + 0.05); };
  const toLab = (c) => { const [R, G, B] = c.map(lin);
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s3 = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s3, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s3, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s3]; };
  const fromLab = ([L, a, b]) => { const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s3 = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s3, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s3, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s3].map(gam).map((x) => Math.max(0, Math.min(255, Math.round(x)))); };
  const lch = (c) => { const [L, a, b] = toLab(c); return { L, C: Math.hypot(a, b), h: (Math.atan2(b, a) * 180 / Math.PI + 360) % 360 }; };
  /* the S19 quote rule: scale the bubble's OKLab (L, a, b) by one k until the quote is 1.25 : 1 darker (bisection, as the S20 render did) */
  const quoteRule = (b) => { const lab = toLab(b); let lo = 0, hi = 1; for (let i = 0; i < 60; i++) { const k = (lo + hi) / 2; if (cr(fromLab(lab.map((x) => x * k)), b) > 1.25) lo = k; else hi = k; } return fromLab(lab.map((x) => x * (lo + hi) / 2)); };
  const r3 = (x) => Math.round(x * 1000) / 1000;
  /* the S20 bubbles (#1403, the build Damir walked) — the reference N-1 darkens */
  const S20 = { flat: ['Mist', '#232729'], gradient: ['Iris', '#2A2960'], blue: ['Spixi', '#1A2F5C'], green: ['Meadow', '#1B382F'], aurora: ['Aurora', '#1B3364'], dusk: ['Dusk', '#3D284A'], ocean: ['Ocean', '#153A54'] };
  const fail = { shift: [], quote: [], ground: [], inks: [], ask: [], light: [] };
  const table = {};
  const r = {};
  try {
    el.setAttribute('data-theme', 'dark');
    const alpha = parseFloat(W.getComputedStyle(el).getPropertyValue('--bubble-meta-opacity-received'));
    for (const [g, [name, was]] of Object.entries(S20)) {
      el.setAttribute('data-chat-ground', g);
      const bs = resolve('--surface-bubble-received').toUpperCase(), qs = resolve('--surface-bubble-received-quote').toUpperCase();
      const b = hex(bs), q = hex(qs), w = hex(was), sent = hex(resolve('--surface-bubble-sent'));
      const stops = (resolve('--gradient-chat').match(/#[0-9a-f]{6}/gi) || []).map(hex);
      const text = hex(resolve('--text-bubble-received')), meta = hex(resolve('--text-bubble-received-meta'));
      const t = { bubble: bs, quote: qs };
      if (!b || !q || !sent || !stops.length || !text || !meta || !(alpha > 0)) { fail.shift.push(name + ':unresolved'); table[name] = t; continue; }
      const n = lch(b), o = lch(w);
      let dh = Math.abs(n.h - o.h); if (dh > 180) dh = 360 - dh;
      const dWant = g === 'flat' ? -0.04 : -0.06;
      t.dL = r3(n.L - o.L); t.dC = r3(n.C - o.C); t.dh = Math.round(dh * 10) / 10;
      if (!(Math.abs(n.L - o.L - dWant) <= 0.004 && Math.abs(n.C - o.C) <= 0.004 && (o.C < 0.02 || dh <= 3))) fail.shift.push(name + JSON.stringify(t));
      const want = quoteRule(b);
      t.q = r3(cr(q, b)); t.qWant = want;
      if (!(want.every((x, i) => Math.abs(x - q[i]) <= 1) && lum(q) <= lum(b) && t.q >= 1.2 && t.q < 1.3)) fail.quote.push(name + JSON.stringify({ q: qs, want, ratio: t.q }));
      t.vs = stops.map((s) => r3(cr(b, s)));
      if (!(stops.every((s) => lum(b) > lum(s)) && t.vs.every((v) => v >= 1.10))) fail.ground.push(name + JSON.stringify(t.vs));
      const painted = meta.map((x, i) => Math.round(x * alpha + b[i] * (1 - alpha)));
      t.text = r3(cr(text, b)); t.meta = r3(cr(painted, b));
      if (!(t.text >= 7 && t.meta >= 4.5)) fail.inks.push(name + JSON.stringify({ text: t.text, meta: t.meta, alpha }));
      t.vsSent = r3(cr(b, sent)); t.vsSentS20 = r3(cr(w, sent));
      if (!(t.vsSent > t.vsSentS20)) fail.ask.push(name + JSON.stringify({ now: t.vsSent, s20: t.vsSentS20 }));
      table[name] = t;
    }
    el.setAttribute('data-theme', 'light');
    for (const g of Object.keys(S20)) { el.setAttribute('data-chat-ground', g); if (resolve('--surface-bubble-received').toLowerCase() !== '#ffffff') fail.light.push(g); }
    for (const k of Object.keys(fail)) r[k] = Object.keys(table).length === 7 && fail[k].length === 0;
    r.noErr = errs.length === 0;
  } catch (e) { r.threw = e.message; }
  finally { try { W.close(); } catch (e) { /* */ } }
  const c = (k, m, extra) => ok(r[k] === true, m + ' — ' + JSON.stringify(r[k] === true ? (extra || { [k]: true }) : { [k]: r[k], threw: r.threw, fail: fail[k], table }).slice(0, 1600));
  const pick = (f2) => Object.fromEntries(Object.entries(table).map(([k, t]) => [k, f2(t)]));
  c('shift', '★ S20G N-1: DARK — each received bubble is the S20 bubble at OKLCH L −0.06 (Mist −0.04), C and hue kept (computed on the built chat)', { b: pick((t) => [t.bubble, t.dL, t.dC]) });
  c('quote', '★ S20G N-1: each received quote = the S19 rule on the new bubble (OKLab scaled to 1.25 : 1 darker, ± 1), 1.2 ≤ r < 1.3 — Mist\'s lands on #000', { q: pick((t) => [t.quote, t.q]) });
  c('ground', '★ S20G N-1: each bubble is lighter than every stop of its painted ground and ≥ 1.10 : 1 against each', { vs: pick((t) => t.vs) });
  c('inks', '★ S20G N-1: on each bubble the text ≥ 7 : 1 and the meta ink as painted (at --bubble-meta-opacity-received) ≥ 4.5 : 1', { inks: pick((t) => [t.text, t.meta]) });
  c('ask', '★ S20G N-1 (Damir 21:50 "still too close to outgoing"): every received bubble sits further from its canvas\'s sent colour than the S20 bubble did', { sent: pick((t) => [t.vsSentS20, t.vsSent]) });
  c('light', '★ S20G N-1: LIGHT unchanged — #ffffff on every canvas');
  c('noErr', '★ S20G N-1: no page error');
}
