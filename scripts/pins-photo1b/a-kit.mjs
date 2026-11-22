/* ==== photo1b — the shared boot for the `log` pins (a-insert, b-anchor, c-fade, d-lines). NOT a pin module: the pins import it. ====
 * The BUILT chat.html in jsdom, C# pushes through executeUiCommand (the pins-s8/ui-kit.mjs model). Three TEST-ONLY edits of the
 * built text, made in memory before the parse (each anchor must occur exactly once, else the kit throws — the pin then fails
 * loudly instead of reading a stale probe):
 *   · `p1: true` → the head carrier `'*SL{SpixiP1}'==='1'` reads `'1'==='1'` (a developer build: <html data-p1>);
 *   · `const rows = new Map();` → also published as `window.__p1bRows` (the shell's id → row map, read-only use);
 *   · `function renderLogNow() {` → counts its calls in `window.__p1bFull` (the full render = the old path).
 * The shipped file is not changed. `warns` = every console.warn line of the document (VirtualConsole). */
export function photo1bKit(h) {
  const { root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const NOW = Math.floor(Date.now() / 1000);
  const boot = async ({ p1 = false, tree = root, wait = 1500, beforeParse = null, storage = false } = {}) => {
    const f = join(tree, 'Spixi/Resources/Raw/html/chat.html');
    let html = readFileSync(f, 'utf8');
    const rep = (a, b) => {
      if (html.split(a).length !== 2) throw new Error('photo1b kit: the anchor is not unique in the built chat.html: ' + a);
      html = html.replace(a, () => b);
    };
    if (p1) rep("'*SL{SpixiP1}'==='1'", "'1'==='1'");
    rep('const rows = new Map();', 'const rows = window.__p1bRows = new Map();');
    rep('function renderLogNow() {', 'function renderLogNow() { window.__p1bFull = (window.__p1bFull || 0) + 1;');
    const errs = [];
    const warns = [];
    const sent = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    vc.on('warn', (...a) => warns.push(a.map(String).join(' ')));
    vc.on('error', (...a) => errs.push('console.error ' + a.map(String).join(' ')));
    const dom = new JSDOM(html, {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f + '?mobile=1', virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) { /* none */ }
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.Element.prototype.scrollIntoView = function () {};
        const sym = Object.getOwnPropertySymbols(w.location).find((s) => s.description === 'impl');
        const impl = sym ? w.location[sym] : null;
        if (impl) Object.defineProperty(impl, 'href', { configurable: true, get() { return 'file://' + f; }, set(v) { const c = String(v); if (/^ixian:/.test(c)) sent.push(c); } });
        /* `storage: true` — an in-memory localStorage (a file:// document has an opaque origin: jsdom refuses its storage) */
        if (storage) {
          const m = new Map();
          const st = { getItem: (k) => (m.has(String(k)) ? m.get(String(k)) : null), setItem: (k, v) => { m.set(String(k), String(v)); }, removeItem: (k) => { m.delete(String(k)); }, clear: () => m.clear(), key: (i) => [...m.keys()][i] || null, get length() { return m.size; } };
          Object.defineProperty(w, 'localStorage', { configurable: true, get: () => st });
        }
        if (beforeParse) beforeParse(w);
      },
    });
    await sleep(wait);
    const W = dom.window;
    const d = W.document;
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => (x == null ? null : b64(x))));
    const box = d.getElementById('messages');
    /* the rows map as [id, index of its row among #messages' children] in map order (a row must be ON the log) */
    const rowsSig = () => {
      const kids = [...box.children];
      return [...W.__p1bRows].map(([k, el]) => k + '@' + kids.indexOf(el)).join(',');
    };
    return { dom, W, d, push, errs, warns, sent, box, rowsSig, close: () => { try { dom.window.close(); } catch (e) { /* closed */ } } };
  };
  /* the open, as C# makes it: onChatScreenReady → setChatMode → setCaps → setPhotoPreviews → clearMessages → addMessages → messagesDone → onChatScreenLoaded */
  const open = (s, { group = false, caps = '', items = [], showMore = 'true', pre = null } = {}) => {
    s.push('onChatScreenReady', group ? 'addrGroup' : 'addrPeer');
    s.push('setChatMode', group ? '1' : '0', '0', '', 'False');
    s.push('setCaps', 'reply,edit,voice,media' + (caps ? ',' + caps : ''));
    s.push('setPhotoPreviews', 'True');
    if (pre) pre(s);   // pushes C# makes before the history (a lock, the call button)
    s.push('clearMessages', showMore);
    s.push('addMessages', JSON.stringify({ strs: [], items }), 'append');
    s.push('messagesDone');
    s.push('onChatScreenLoaded');
  };
  const page = (s, items, showMore = 'true') => {
    s.push('addMessages', JSON.stringify({ strs: [], items }), 'prepend');
    s.push('messagesDone', showMore);
  };
  /* row items (the addMessages item shape { f, a, r? }) */
  const txt = (id, me, ts, text, { nick = 'Ana', addr = me ? 'addrMe' : 'addrPeer', read = 'True', replyTo = '', r = null } = {}) => {
    const a = me
      ? [id, addr, 'Me', '', text, String(ts), 'True', 'True', read, 'False', 'False', '', replyTo, '', '', '', '', '']
      : [id, addr, nick, '', text, String(ts), 'True', 'True', read, 'False', 'False', '', replyTo, '', '', '', '', ''];
    const it = { f: me ? 'addMe' : 'addThem', a };
    if (r) it.r = r;
    return it;
  };
  /* addFile(id, address, nick, avatar, fileid, name, time, me, sent, read, progress, complete, paid, relaySent, transfer, local, voice, group, played, size) */
  const photo = (id, me, ts, name, group, { nick = 'Ana', addr = me ? 'addrMe' : 'addrPeer' } = {}) =>
    ({ f: 'addFile', a: [id, addr, me ? 'Me' : nick, '', 'fid' + id, name, String(ts), me ? 'True' : 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', group, '', '1000'] });
  /* addPaymentRequest(id, txid, address, nick, avatar, title, amount, status, statusIcon, time, localSender, confirmed, read, enableView, kind, statusEnum, fiat, insufficient) */
  const pay = (id, txid, kind, ts, { me = false, title = null, amount = '12', status = 'Completed', statusEnum = 'completed' } = {}) =>
    ({ f: 'addPaymentRequest', a: [id, txid, 'addrPeer', 'Ana', '', title != null ? title : (kind === 'request' ? 'Payment request' : 'Payment received'), amount, status, 'check', String(ts), me ? 'True' : 'False', 'True', 'True', 'True', kind, statusEnum, '', 'False'] });
  /* addCall(id, text, declined, time, outgoing, missed, durationSecs, declinedLocally, active, declinedRemotely) */
  const call = (id, ts, { active = false } = {}) => ({ f: 'addCall', a: [id, 'Voice call', 'False', String(ts), 'True', 'False', '65', 'False', active ? 'True' : 'False', 'False'] });
  /* a voice FILE (addFile arg 17 "1") */
  const voiceFile = (id, me, ts) => ({ f: 'addFile', a: [id, me ? 'addrMe' : 'addrPeer', me ? 'Me' : 'Ana', '', 'fid' + id, 'voice_' + id + '.m4a', String(ts), me ? 'True' : 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '1', '', '', '20000'] });
  /* A deterministic LAYOUT for jsdom (it has none): the log is a 412 × 800 column at y = 100; each child of #messages has a fixed
   * height (heightOf, default by kind; a child with style.display none or the `hidden` flag is ZERO-size, as in a browser);
   * a child's rect = its offset in the flow − scrollTop; a descendant reports its row's rect; box.scrollTop / scrollHeight /
   * clientHeight follow the flow (scrollTop clamped like a browser). `bar` = the composer's rect (else 0 × 0, as jsdom).
   * `reads` counts the rect reads of the log's children; `masks(el)` = the mask string the fade pass last wrote on it. */
  const geom = (s, { heightOf = null, bar = null } = {}) => {
    const { W, box } = s;
    const BOX = { top: 100, height: 800, width: 412 };
    const isZero = (n) => n.hidden || n.style.display === 'none';
    const hDefault = (n) => {
      if (n.dataset && n.dataset.msgid !== undefined) { let x = 0; for (const c of n.dataset.msgid) x = (x * 31 + c.charCodeAt(0)) >>> 0; return 40 + (x % 4) * 16; }
      if (n.classList.contains('c-datesep')) return 36;
      if (n.classList.contains('c-unread-divider')) return 32;
      if (n.classList.contains('c-sysnotice')) return 80;
      if (n.classList.contains('chat-older')) return 40;
      return 24;
    };
    const hOf = (n) => (isZero(n) ? 0 : (heightOf && heightOf(n)) || hDefault(n));
    const R = (top, h, w) => ({ top, bottom: top + h, left: 0, right: w, width: w, height: h, x: 0, y: top, toJSON() { return this; } });
    const Z = R(0, 0, 0);
    let st = 0;
    const g = { reads: 0, bar };
    const total = () => { let t = 0; for (let c = box.firstElementChild; c; c = c.nextElementSibling) t += hOf(c); return t; };
    Object.defineProperty(box, 'clientHeight', { configurable: true, get: () => BOX.height });
    Object.defineProperty(box, 'scrollHeight', { configurable: true, get: () => Math.max(BOX.height, total()) });
    Object.defineProperty(box, 'scrollTop', { configurable: true, get: () => st, set: (v) => { st = Math.max(0, Math.min(Math.max(0, total() - BOX.height), Math.round(Number(v) || 0))); } });
    const orig = W.Element.prototype.getBoundingClientRect;
    W.Element.prototype.getBoundingClientRect = function () {
      if (this === box) return R(BOX.top, BOX.height, BOX.width);
      if (g.bar && this.classList && this.classList.contains('c-composer')) return R(g.bar.top, g.bar.height, BOX.width);
      let n = this;
      while (n && n.parentElement !== box) n = n.parentElement;
      if (!n) return orig.call(this);
      if (n === this) g.reads += 1;
      if (isZero(n)) return Z;
      let off = 0;
      for (let c = box.firstElementChild; c && c !== n; c = c.nextElementSibling) off += hOf(c);
      return R(BOX.top + off - st, hOf(n), BOX.width);
    };
    /* the mask the pass writes: jsdom's style object does not keep mask-image — keep it per declaration */
    const SP = Object.getPrototypeOf(box.style);   // jsdom: CSSStyleProperties (not W.CSSStyleDeclaration.prototype)
    for (const [js, css, key] of [['maskImage', 'mask-image', '__p1bM'], ['webkitMaskImage', '-webkit-mask-image', '__p1bW']]) {
      Object.defineProperty(SP, js, { configurable: true, get() { return this[key] || ''; }, set(v) { this[key] = String(v); } });
      void css;
    }
    const rp = SP.removeProperty;
    SP.removeProperty = function (p) { if (p === 'mask-image') this.__p1bM = ''; else if (p === '-webkit-mask-image') this.__p1bW = ''; return rp.call(this, p); };
    g.masks = (el) => (el.style.__p1bM || '') + '|' + (el.style.__p1bW || '');
    g.hOf = hOf;
    g.topOf = (el) => el.getBoundingClientRect().top;
    return g;
  };
  return { b64, NOW, boot, open, page, txt, photo, pay, call, voiceFile, sleep, geom };
}
