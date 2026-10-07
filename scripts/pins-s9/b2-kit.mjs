/* ==== SESSION 9 (B2) — the shared boot for the b2-* pins: a BUILT shell in jsdom, C# pushes via
 * executeUiCommand, outgoing ixian: commands captured at the Location href setter (the pins-s8/ui-kit.mjs
 * model) + a query string (`lang=de-de` → the shell's SL carrier picks that dictionary).
 * Not a pin module (not in the loader list) — imported by the b2-* modules. ==== */
export function b2Kit(h) {
  const { root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const boot = async (file, { query = '', wait = 1400, reduce = false, onSend = null } = {}) => {
    const f = join(root, 'Spixi/Resources/Raw/html', file);
    const errs = [];
    const sent = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
      url: 'file://' + f + (query ? '?' + query : ''), virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: !!reduce && /prefers-reduced-motion:\s*reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.Element.prototype.scrollIntoView = function () {};
        const sym = Object.getOwnPropertySymbols(w.location).find((s) => s.description === 'impl');
        const impl = sym ? w.location[sym] : null;
        if (impl) Object.defineProperty(impl, 'href', { configurable: true, get() { return 'file://' + f; }, set(v) { const c = String(v); if (/^ixian:/.test(c)) { sent.push(c); if (onSend) { try { onSend(c, w); } catch (e) {} } } } });
      },
    });
    await sleep(wait);
    const W = dom.window;
    const d = W.document;
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => (x == null ? null : b64(x))));
    return { dom, W, d, push, errs, sent };
  };
  /* WCAG 2.1 contrast from the BUILT token sheet (every `:root {` block, then every `[data-theme="dark"] {` over it) */
  const tokens = () => {
    const t = readFileSync(join(root, 'Spixi/Resources/Raw/html/spixi.tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
    const light = {}, darkOnly = {};
    for (const m of t.matchAll(/(?<=(?:^|\})\s*)(:root|\[data-theme="dark"\])\s*\{([^}]*)\}/g)) {
      const into = m[1] === ':root' ? light : darkOnly;
      for (const dd of m[2].matchAll(/(--[\w-]+):\s*([^;]+);/g)) into[dd[1]] = dd[2].trim();
    }
    const vars = { light, dark: { ...light, ...darkOnly } };
    const res = (th, n, k = 0) => { const v = vars[th][n]; if (!v || k > 12) return null; const m = /^var\((--[\w-]+)\)$/.exec(v); return m ? res(th, m[1], k + 1) : v; };
    const lum = (hex) => { const x = String(hex || '').replace('#', ''); if (!/^[0-9a-fA-F]{6}$/.test(x)) return NaN; const c = [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16) / 255).map((u) => (u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const cr = (a, b) => { const x = lum(a), y = lum(b); if (Number.isNaN(x) || Number.isNaN(y)) return 0; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    return { res, cr, vars };
  };
  return { boot, b64, tokens };
}
