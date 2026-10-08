/* ==== SESSION 11 (A) — boot helper for the a-* pins: a BUILT shell in jsdom (the pins-s10/d-kit.mjs model: pushes via
 * executeUiCommand, ixian: commands captured at the Location href setter, mobile or desktop through the shell's own
 * ?mobile=1 / ?desktop=1 preview override) + an optional
 * `html` transform that runs on the built text BEFORE the parse — the one way to stand in for C#'s *SL{} substitution
 * (SpixiLocalization.localizeHtml) in a pin. Not a pin module — imported by the a-* modules.
 * ★ S11 A2 (#1263, R3-MAJOR-3 / MINOR-2) three clock options, all installed in beforeParse (before any shell script runs):
 *   · now: <ms>          — w.Date is PINNED (new Date() / Date.now() read the pinned instant; `s.clock.set/add` move it).
 *                          A pin never reads the real clock.
 *   · fakeIntervals      — w.setInterval only RECORDS (s.intervals: [{ fn, ms }]); the pin fires them by hand.
 *   · timeScale: <n>     — every w.setTimeout of ≥ 1000 ms runs n× sooner (the hint SETTLE / STAND dials, the card
 *                          hold) — the order of the timers is kept, only the waiting shrinks. ==== */
export function aKit(h) {
  const { root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const boot = async (file, { wait = 1400, desktop = false, reduce = false, html = null, theme = '', now = null, fakeIntervals = false, timeScale = 1, storage = null } = {}) => {
    const f = join(root, 'Spixi/Resources/Raw/html', file);
    const errs = [];
    const sent = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    let text = readFileSync(f, 'utf8');
    let pinned = now;
    const intervals = [];
    if (html) text = html(text);
    if (theme) text = text.replace("var n='*SL{SpixiThemeName}'", "var n='" + theme + "'");
    const dom = new JSDOM(text, {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
      /* jsdom's UA is not a phone, so the shell's #228 boot flag reads desktop — `?mobile=1` / `?desktop=1` are the
         shell's own preview overrides (the pins-s4/chat.mjs precedent) */
      url: 'file://' + f + (desktop ? '?desktop=1' : '?mobile=1'), virtualConsole: vc,
      beforeParse(w) {
        if (pinned != null) {
          const RealDate = w.Date;
          class PinnedDate extends RealDate {
            constructor(...a) { if (a.length) super(...a); else super(pinned); }
            static now() { return pinned; }
          }
          w.Date = PinnedDate;
        }
        if (fakeIntervals) {
          w.setInterval = (fn, ms) => { intervals.push({ fn, ms }); return intervals.length; };
          w.clearInterval = () => {};
        }
        if (timeScale > 1) {
          const st = w.setTimeout.bind(w);
          w.setTimeout = (fn, ms, ...a) => st(fn, (ms >= 1000 ? ms / timeScale : ms), ...a);
        }
        const mem = new Map(Object.entries(storage || {}));   // ★ S11 A2: an optional seed (e.g. the rating open count)
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
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => (x == null ? null : b64(x))));
    const resume = () => d.dispatchEvent(new W.Event('visibilitychange'));
    const clock = { set: (v) => { pinned = v; }, add: (ms) => { pinned += ms; }, get: () => pinned };
    return { dom, W, d, push, errs, sent, resume, clock, intervals, close: () => { try { W.close(); } catch (e) {} } };
  };
  const noErr = (errs) => errs.filter((m) => !/Could not load|ERR_FILE|net::|404/i.test(m)).length === 0;
  return { boot, b64, noErr, sleep };
}
