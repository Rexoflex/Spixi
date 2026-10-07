/* ==== SESSION 10 (D) — boot helper for the d-* pins: the b2 kit's boot (a BUILT shell in jsdom, pushes via
 * executeUiCommand, ixian: commands captured at the Location href setter) + an in-memory localStorage installed
 * BEFORE the shell's head scripts run (jsdom gives a file:// page no usable storage — opaque origin; the
 * pins-s8/chat-app.mjs precedent). Not a pin module — imported by d-from / d-preview. ==== */
export function dKit(h) {
  const { root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const memStorage = (seed = {}) => {
    const m = new Map(Object.entries(seed));
    return {
      get length() { return m.size; },
      key(i) { return [...m.keys()][i] ?? null; },
      getItem(k) { return m.has(String(k)) ? m.get(String(k)) : null; },
      setItem(k, v) { m.set(String(k), String(v)); },
      removeItem(k) { m.delete(String(k)); },
      clear() { m.clear(); },
    };
  };
  const boot = async (file, { query = '', wait = 1400, storage = {}, desktop = false, noSegmenter = false } = {}) => {
    const f = join(root, 'Spixi/Resources/Raw/html', file);
    const errs = [];
    const sent = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    const ls = memStorage(storage);
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
      url: 'file://' + f + (query ? '?' + query : ''), virtualConsole: vc,
      userAgent: desktop ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) jsdom' : 'Mozilla/5.0 (Linux; Android 14) Mobile jsdom',
      beforeParse(w) {
        Object.defineProperty(w, 'localStorage', { configurable: true, value: ls });
        if (noSegmenter) { const I = Object.create(w.Intl || Intl); Object.defineProperty(I, 'Segmenter', { value: undefined }); w.Intl = I; }   // an engine without Intl.Segmenter
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.Element.prototype.scrollIntoView = function () {};
        const sym = Object.getOwnPropertySymbols(w.location).find((s) => s.description === 'impl');
        const impl = sym ? w.location[sym] : null;
        if (impl) Object.defineProperty(impl, 'href', { configurable: true, get() { return 'file://' + f; }, set(v) { const c = String(v); if (/^ixian:/.test(c)) sent.push(c); } });
      },
    });
    await sleep(wait);
    const W = dom.window;
    const d = W.document;
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => (x == null ? null : b64(x))));
    return { dom, W, d, push, errs, sent, ls };
  };
  return { boot, b64, memStorage };
}
