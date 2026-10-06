/* ==== SESSION 7b (S1) — the shared boot for strip / back / swipe: the BUILT chat.html in jsdom, C# pushes via
 * executeUiCommand, outgoing ixian: commands captured at the Location href setter (the pins-s6b/reply.mjs model).
 * Not a pin module (not in the loader list) — imported by strip.mjs, back.mjs, swipe.mjs. ==== */
export function s1Kit(h) {
  const { root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const T0 = Math.floor(Date.now() / 1000) - 3600;

  /* opts: desktop · android (an Android UA + a writable innerHeight, for the AND-16 resize stick) */
  const boot = async ({ desktop = false, android = false } = {}) => {
    const f = join(root, 'Spixi/Resources/Raw/html/chat.html');
    const errs = [];
    const sent = [];
    const ro = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    const geo = { innerHeight: 800 };
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f + (desktop ? '' : '?mobile=1'), virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { constructor(cb) { ro.push(cb); } observe() {} unobserve() {} disconnect() {} };
        w.Element.prototype.scrollIntoView = function () {};
        if (android) {
          Object.defineProperty(w.navigator, 'userAgent', { configurable: true, get: () => 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' });
          Object.defineProperty(w, 'innerHeight', { configurable: true, get: () => geo.innerHeight });
        }
        const sym = Object.getOwnPropertySymbols(w.location).find((s) => s.description === 'impl');
        const impl = sym ? w.location[sym] : null;
        if (impl) Object.defineProperty(impl, 'href', { configurable: true, get() { return 'file://' + f; }, set(v) { const c = String(v); if (/^ixian:/.test(c)) sent.push(c); } });
      },
    });
    await sleep(1600);
    const W = dom.window;
    const d = W.document;
    if (desktop) d.documentElement.setAttribute('data-desktop', ''); else d.documentElement.removeAttribute('data-desktop');
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => (x == null ? null : b64(x))));
    return { dom, W, d, push, errs, sent, ro, geo };
  };
  /* a 1:1 with Bob: a received text, my text, a received PDF card, a received payment request, a received text */
  const open = async (opts = {}) => {
    const s = await boot(opts);
    s.push('onChatScreenReady', 'addrPeer');
    s.push('setChatMode', '0', '0', '', 'False');
    s.push('setCaps', opts.caps || 'reply,edit');
    s.push('clearMessages', 'false');
    s.push('addThem', 'aa01', 'addrPeer', 'Bob', '', 'hello from Bob', String(T0), 'True', 'True', 'True', 'False', 'False');
    s.push('addMe', 'aa02', 'addrMe', 'Me', '', 'my own words', String(T0 + 60), 'True', 'True', 'True', 'False', 'False');
    s.push('addFile', 'aa03', 'addrPeer', 'Bob', '', 'f03', 'report.pdf', String(T0 + 120), 'False', 'True', 'False', '100', 'True', 'False', 'True', '', '1');
    s.push('addPaymentRequest', 'aa04', 'tx04', 'addrPeer', 'Bob', '', 'Payment', '10', 'Pending', '', String(T0 + 180), 'False', 'True', 'True', 'False', 'payment', '1', '', '');
    s.push('addThem', 'aa05', 'addrPeer', 'Bob', '', 'the newest words', String(T0 + 240), 'True', 'True', 'True', 'False', 'False');
    if (typeof s.W.messagesDone === 'function') s.push('messagesDone');
    s.push('onChatScreenLoaded');
    await sleep(350);
    return s;
  };
  const pev = (W, type, { x = 100, y = 200, kind = 'touch', button = 0, id = 7, primary = true } = {}) => {
    const init = { bubbles: true, cancelable: true, clientX: x, clientY: y, button, pointerType: kind, pointerId: id, isPrimary: primary };
    const e = typeof W.PointerEvent === 'function' ? new W.PointerEvent(type, init) : new W.MouseEvent(type, init);
    if (e.pointerType !== kind) Object.defineProperty(e, 'pointerType', { value: kind });
    if (e.pointerId !== id) Object.defineProperty(e, 'pointerId', { value: id });
    if (e.isPrimary !== primary) Object.defineProperty(e, 'isPrimary', { value: primary });
    return e;
  };
  const rowOf = (d, id) => d.querySelector('#messages [data-msgid="' + id + '"]');
  const strip = (d) => d.querySelector('.c-composer__ctx');
  const input = (d) => d.querySelector('.c-composer__input');
  const field = (d) => d.querySelector('.c-composer__field');
  const composer = (d) => d.querySelector('.c-composer');
  /* a touch swipe of dx px on a row's bubble (the phone reply gesture) */
  const swipe = async (W, d, id, dx, { release = true } = {}) => {
    const r = rowOf(d, id);
    const n = r.querySelector('.c-bubble, .c-tcard, .c-fbubble, .c-mbubble') || r;
    n.dispatchEvent(pev(W, 'pointerdown', { x: 100, y: 200 }));
    n.dispatchEvent(pev(W, 'pointermove', { x: 100 + Math.round(dx / 2), y: 200 }));
    n.dispatchEvent(pev(W, 'pointermove', { x: 100 + dx, y: 200 }));
    if (release) n.dispatchEvent(pev(W, 'pointerup', { x: 100 + dx, y: 200 }));
    await sleep(30);
    return n;
  };
  /* the menu item by its label (a mouse right click opens the same openMessageMenu) */
  const pick = async (W, d, id, label) => {
    const r = rowOf(d, id);
    const t = r && (r.querySelector('.c-bubble, .c-tcard, .c-fbubble, .c-mbubble') || r);
    t.dispatchEvent(pev(W, 'pointerdown', { kind: 'mouse', button: 2, id: 1 }));
    t.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(60);
    const m = [...d.querySelectorAll('.c-msgmenu')].pop();
    const it = m && [...m.querySelectorAll('.c-msgmenu__item')].find((b) => b.textContent.trim() === label);
    if (it) it.click();
    await sleep(60);
    for (let i = 0; i < 4; i++) { try { if (!W.Spixi.dismissTopOverlay()) break; } catch (e) { break; } }
    await sleep(20);
    return !!it;
  };
  const type = (W, d, v) => { const i = input(d); i.value = v; i.dispatchEvent(new W.Event('input', { bubbles: true })); };
  const noErr = (errs) => errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;
  const guard = async (label, fn) => { try { await fn(); } catch (e) { h.ok(false, label + ' THREW: ' + (e && e.stack || e)); } };
  return { boot, open, pev, rowOf, strip, input, field, composer, swipe, pick, type, noErr, guard, sleep };
}
