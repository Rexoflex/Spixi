/* ==== SESSION 4 fix batch — Damir picks (2026-10-03): the dark received bubble one HALF step lighter ====
 * Behaviour first: the BUILT chat shell is booted in jsdom, the dark theme set on the live root, and the tokens read as
 * the document COMPUTES them (through their var() chains). Contrast is computed (WCAG 2.x relative luminance), never
 * restated. The fade curve (the other pick) is pinned in chat.mjs A2 TIMING.
 * Every pin was broken on purpose before it was believed (the breaks are in the fixer's report). */
export default async function (h) {
  const { ok, root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const norm = (v) => String(v || '').replace(/\s+/g, ' ').trim();
  const f = join(root, 'Spixi/Resources/Raw/html', 'chat.html');
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
  const dom = new JSDOM(readFileSync(f, 'utf8'), {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.Element.prototype.scrollIntoView = function () {};
    },
  });
  await sleep(1200);
  const W = dom.window, el = W.document.documentElement;
  const resolve = (name, depth = 0) => {
    const v = norm(W.getComputedStyle(el).getPropertyValue(name));
    const m = /^var\((--[\w-]+)(?:, *(.*))?\)$/.exec(v);
    return m && depth < 8 ? (resolve(m[1], depth + 1) || m[2] || '') : v;
  };
  const hex = (v) => { const m = /^#([0-9a-f]{6})$/i.exec(v || ''); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; };
  const lum = (c) => { const g = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * g(c[0]) + 0.7152 * g(c[1]) + 0.0722 * g(c[2]); };
  const cr = (a, b) => { const [p, q] = [lum(a), lum(b)].sort((u, v) => v - u); return (p + 0.05) / (q + 0.05); };
  const r2 = (x) => Math.round(x * 100) / 100;

  el.setAttribute('data-theme', 'dark');
  const [recv, text, meta, link, canvas, ink800, ink700] = ['--surface-bubble-received', '--text-bubble-received', '--text-bubble-received-meta',
    '--text-link', '--chat-canvas-base', '--ink-800', '--ink-700'].map((n) => hex(resolve(n)));
  el.setAttribute('data-theme', 'light');
  const lightRecv = resolve('--surface-bubble-received').toLowerCase();
  const r = {}, n = {};
  if (recv && text && meta && link && canvas && ink800 && ink700) {
    Object.assign(n, { text: r2(cr(text, recv)), meta: r2(cr(meta, recv)), link: r2(cr(link, recv)), offCanvas: r2(cr(recv, canvas)), offCanvasWas: r2(cr(ink800, canvas)) });
    r.value = recv.map((v) => v.toString(16).padStart(2, '0')).join('') === '1e2023';
    /* a HALF step: lighter than ink-800, darker than ink-700 */
    r.halfStep = lum(recv) > lum(ink800) && lum(recv) < lum(ink700);
    r.textAA = n.text >= 4.5 && n.meta >= 4.5 && n.link >= 4.5;
    r.liftsMore = n.offCanvas > n.offCanvasWas;
  } else r.resolved = false;
  r.lightWhite = lightRecv === '#ffffff';
  r.noErr = errs.length === 0;
  ok(Object.values(r).every(Boolean),
    '★ Damir pick (2026-10-03): the DARK received bubble is one half step lighter — --ink-750 #1E2023, between ink-800 #1A1C1F and ink-700 #232528 (light stays #ffffff); computed on the built chat shell, its text / meta / link ink each hold ≥ 4.5:1 and it lifts further off the ink-950 canvas than ink-800 did — ' + JSON.stringify(r) + ' ' + JSON.stringify(n) + (errs.length ? ' errs=' + errs.slice(0, 2).join(' | ') : ''));
  dom.window.close();
}
