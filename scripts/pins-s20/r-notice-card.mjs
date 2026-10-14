/* ==== S20 G (#1379, carried from #1354 / the S19 handoff) — the neutral DARK secure-notice card on the darker S20 grounds ====
 * On the BUILT chat.html (jsdom), DARK theme, a real system notice (W.Spixi.createSystemNotice) in the message list, each of
 * the 7 canvases on the live root; the card's paint is its computed background resolved through the token chain:
 *   · NOT the lightest neutral on screen: the card is darker than the composer pill (the other neutral surface, #1E2023) on
 *     every canvas, and darker than the Mist received bubble (the neutral canvas's bubble);
 *   · still a VISIBLE card: lighter than every ground stop on all 7 canvases, ≥ 1.15 : 1 on the Mist ground, the lift
 *     (box-shadow --elevation-2, not none) kept;
 *   · its inks hold ≥ 4.5 : 1 — the title (--text-neutral-01), the body (--text-neutral-02), the How it works link;
 *   · LIGHT is unchanged: the white card (#ffffff).
 * Deliberate break (S20 R report): --surface-notice-card back to var(--ink-750) → belowPill fails (the card equals the pill). */
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
  const resolveOn = (node, v, depth = 0) => {
    v = norm(v);
    const m = /^var\((--[\w-]+)(?:, *(.*))?\)$/.exec(v);
    return m && depth < 8 ? (resolveOn(node, W.getComputedStyle(node).getPropertyValue(m[1]), depth + 1) || m[2] || '') : v;
  };
  const hex = (v) => { const m = /^#([0-9a-f]{6})$/i.exec(v || ''); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; };
  const lin = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const cr = (a, b) => { const [p, q] = [lum(a), lum(b)].sort((u, v) => v - u); return (p + 0.05) / (q + 0.05); };
  const r2 = (x) => Math.round(x * 100) / 100;
  const r = {}, table = {};
  const fail = { belowPill: [], belowMist: [], visible: [], inks: [] };
  try {
    const notice = W.Spixi.createSystemNotice({ title: 'Encrypted', text: 'Messages are end-to-end encrypted.', linkLabel: 'How it works', onLink() {} });
    (d.getElementById('messages') || d.body).append(notice);
    const card = notice.querySelector('.c-sysnotice__card') || notice;
    const title = card.querySelector('.c-sysnotice__title'), text = card.querySelector('.c-sysnotice__text'), link = card.querySelector('.c-sysnotice__link');
    const paint = (node) => { const cs = W.getComputedStyle(node); return hex(resolveOn(node, cs.getPropertyValue('background-color') && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.getPropertyValue('background-color')) ? cs.getPropertyValue('background-color') : cs.getPropertyValue('background'))); };
    const ink = (node) => node ? hex(resolveOn(node, W.getComputedStyle(node).getPropertyValue('color'))) : null;
    el.setAttribute('data-theme', 'dark');
    for (const [g, name] of Object.entries({ flat: 'Mist', gradient: 'Iris', blue: 'Spixi', green: 'Meadow', aurora: 'Aurora', dusk: 'Dusk', ocean: 'Ocean' })) {
      el.setAttribute('data-chat-ground', g);
      const c = paint(card), pill = hex(resolveOn(el, 'var(--surface-composer-pill)')), bubble = hex(resolveOn(el, 'var(--surface-bubble-received)'));
      const stops = (resolveOn(el, 'var(--gradient-chat)').match(/#[0-9a-f]{6}/gi) || []).map(hex);
      const t = { card: c && '#' + c.map((x) => x.toString(16).padStart(2, '0')).join(''), vsStops: stops.map((s) => c ? r2(cr(c, s)) : 0) };
      if (!c || !pill || !(lum(c) < lum(pill))) fail.belowPill.push(name);
      if (g === 'flat' && !(c && bubble && lum(c) < lum(bubble))) fail.belowMist.push(name);
      const shadow = norm(W.getComputedStyle(card).getPropertyValue('box-shadow'));
      t.shadow = shadow;
      if (!c || !stops.length || stops.some((s) => !(lum(c) > lum(s))) || (g === 'flat' && cr(c, stops[0]) < 1.15) || !/elevation-2/.test(shadow)) fail.visible.push(name);
      t.inks = [title, text, link].map((n) => { const i = ink(n); return i && c ? r2(cr(i, c)) : 0; });
      if (t.inks.some((x) => x < 4.5)) fail.inks.push(name);
      table[name] = t;
    }
    for (const k of Object.keys(fail)) r[k] = Object.keys(table).length === 7 && fail[k].length === 0;
    el.setAttribute('data-theme', 'light'); el.setAttribute('data-chat-ground', 'flat');
    r.light = (paint(card) || []).join() === '255,255,255';
  } catch (e) { r.threw = e.message; }
  finally { try { W.close(); } catch (e) { /* */ } }
  r.noErr = errs.length === 0;
  const c = (k, m, extra) => ok(r[k] === true, m + ' — ' + JSON.stringify(r[k] === true ? (extra || { [k]: true }) : { [k]: r[k], threw: r.threw, fail: fail[k], table }).slice(0, 1400));
  c('belowPill', '★ S20 G (#1379): the dark secure-notice card is no longer the lightest neutral — darker than the composer pill (ink-750) on all 7 canvases', { card: table.Mist && table.Mist.card });
  c('belowMist', '★ S20 G: … and darker than the Mist received bubble (the neutral canvas)');
  c('visible', '★ S20 G: still a visible card — lighter than every ground stop on all 7 darker grounds (Mist ≥ 1.15 : 1) with --elevation-2', { vs: Object.fromEntries(Object.entries(table).map(([k, t]) => [k, t.vsStops])) });
  c('inks', '★ S20 G: the card\'s title, body and link each hold ≥ 4.5 : 1 on it', { inks: table.Mist && table.Mist.inks });
  c('light', '★ S20 G: LIGHT unchanged — the white card');
  c('noErr', '★ S20 G: no page error');
}
