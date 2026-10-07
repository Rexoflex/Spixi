/* ==== SESSION 8 (S2) — the shared boot for the ui-* pins: a BUILT shell in jsdom, C# pushes via executeUiCommand,
 * outgoing ixian: commands captured at the Location href setter (the pins-s7b/s1-boot.mjs model).
 * Not a pin module (not in the loader list) — imported by ui-overlay / ui-groupinfo / ui-privacy / ui-reply. ==== */
export function uiKit(h) {
  const { root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  /* file = the built shell name · mobile → `?mobile=1` (the head carrier removes data-desktop before any module runs) */
  const boot = async (file, { mobile = false, wait = 1600 } = {}) => {
    const f = join(root, 'Spixi/Resources/Raw/html', file);
    const errs = [];
    const sent = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f + (mobile ? '?mobile=1' : ''), virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.__scrolled = [];
        w.Element.prototype.scrollIntoView = function () { w.__scrolled.push(this); };
        const sym = Object.getOwnPropertySymbols(w.location).find((s) => s.description === 'impl');
        const impl = sym ? w.location[sym] : null;
        if (impl) Object.defineProperty(impl, 'href', { configurable: true, get() { return 'file://' + f; }, set(v) { const c = String(v); if (/^ixian:/.test(c)) sent.push(c); } });
      },
    });
    await sleep(wait);
    const W = dom.window;
    const d = W.document;
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => (x == null ? null : b64(x))));
    return { dom, W, d, push, errs, sent };
  };
  return { boot, b64 };
}
