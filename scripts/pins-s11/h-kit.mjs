/* ==== SESSION 11 (H, #1263) — boot helper for the h-* pins: the BUILT home shell (index.html) in jsdom with the
 * wallet plumbing pushed the way HomePage pushes it (setCaps composeSend · setAddress · setBalance · addContact),
 * ixian: commands captured at the Location href setter (the pins-s11/a-kit.mjs model). Not a pin module. ==== */
export function hKit(h) {
  const { root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const boot = async ({ file = 'index.html', dir = join(root, 'Spixi/Resources/Raw/html'), wait = 1400, desktop = false, reduce = false, lang = '' } = {}) => {
    const f = join(dir, file);
    const errs = [];
    const sent = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    let text = readFileSync(f, 'utf8');
    if (lang) text = text.replace(/<html([^>]*)\blang="[^"]*"/, '<html$1lang="' + lang + '"');
    const dom = new JSDOM(text, {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
      url: 'file://' + f + (desktop ? '?desktop=1' : '?mobile=1'), virtualConsole: vc,
      beforeParse(w) {
        const mem = new Map();
        Object.defineProperty(w, 'localStorage', { configurable: true, value: { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } } });
        w.matchMedia = (q) => ({ matches: !!reduce && /prefers-reduced-motion:\s*reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
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
    if (lang) d.documentElement.lang = lang;   // the app language the money display reads (docLocale)
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => (x == null ? null : b64(x))));
    return { dom, W, d, push, errs, sent, close: () => { try { W.close(); } catch (e) {} } };
  };
  /* the wallet as HomePage leaves it after onLoaded: caps, own address, balance, two people */
  const ADA = 'ADAxQ7mW2pLk9sRt4vBn8cYh3jFz6dGe1u';
  const BOB = 'BOBy5nK8qWe2rTz7uIo4pAs1dFg9hJk3l';
  const wallet = (s, { balance = '100' } = {}) => {
    s.push('setCaps', 'composeSend');
    s.push('setAddress', 'OWNz8xC4vB7nM2qW5eR9tY3uI6oP1aS');
    s.push('setBalance', balance, '0', 'me');
    s.push('clearContacts');
    s.push('addContact', ADA, 'Ada', '', 'false', '0', 'contact', '');
    s.push('addContact', BOB, 'Bob', '', 'false', '0', 'contact', '');
  };
  const key = (root, k) => {
    const b = root.querySelector('.c-amount-pad__key[data-key="' + k + '"]');
    if (!b) throw new Error('no pad key ' + k);
    b.click();
  };
  const type = (root, str) => { for (const ch of String(str)) key(root, ch === '.' || ch === ',' ? 'dec' : ch); };
  const shown = (root, sel) => { const n = root.querySelector(sel + ' .c-amount__num'); return n ? n.textContent : ''; };
  const noErr = (errs) => errs.filter((m) => !/Could not load|ERR_FILE|net::|404/i.test(m)).length === 0;
  return { boot, wallet, key, type, shown, noErr, b64, sleep, ADA, BOB };
}
