/* ==== S8 PICKS (P-G) — #1237 FOUR CHAT GROUNDS IN BOTH THEMES (Solid · Brand · Green · Blue), on the BUILT shells (jsdom).
 * A stored `spixi.chat.ground` (a Map-backed localStorage stub, installed before parse) is read by ALL THREE #690 ladders:
 *   · chat.html — the PRE-PAINT head script (the FIRST data-chat-ground write, recorded at setAttribute) and the live
 *     re-resolve (the attribute after the screen is up): 'blue' / 'green' survive both; an unknown or an s8x scratch id
 *     ('x-b1') lands on 'flat' in both
 *   · settings.html readChatPrefs → Settings → Chat appearance: FOUR dots in BOTH themes, in order flat · gradient ·
 *     green · blue, named Solid / Brand gradient / Green gradient / Blue gradient, the STORED one checked (blue, and green
 *     in dark — it used to be light-only and showed the flat dot), the preview stamped with it; a tap writes the pref
 *   · the BUILT token sheet paints each new ground with Damir's picked values: light blue = B1 Sky, dark green = DG1
 *     Forest, dark blue = DB1 Azure (each with its own ink and select-row gap); the dark-blue notice card gets the
 *     #1066 hairline; the two new dark dots paint their ground's top stop ==== */
export default async function (h) {
  const { ok, root, readFileSync, join, JSDOM, VirtualConsole, sleep, stripCssComments } = h;
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const boot = async (file, store, { wait = 1400 } = {}) => {
    const f = join(root, 'Spixi/Resources/Raw/html', file);
    const errs = [], writes = [], sent = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f + '?mobile=1', virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.Element.prototype.scrollIntoView = function () {};
        const m = new Map(Object.entries(store));
        const ls = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); }, clear: () => m.clear(), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; } };
        Object.defineProperty(w, 'localStorage', { configurable: true, get: () => ls });
        w.__store = m;
        const sa = w.Element.prototype.setAttribute;
        w.Element.prototype.setAttribute = function (n, v) { if (n === 'data-chat-ground' && this === w.document.documentElement) writes.push(String(v)); return sa.call(this, n, v); };
        const sym = Object.getOwnPropertySymbols(w.location).find((s) => s.description === 'impl');
        const impl = sym ? w.location[sym] : null;
        if (impl) Object.defineProperty(impl, 'href', { configurable: true, get() { return 'file://' + f; }, set(v) { const c = String(v); if (/^ixian:/.test(c)) sent.push(c); } });
      },
    });
    await sleep(wait);
    const W = dom.window;
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => (x == null ? null : b64(x))));
    return { dom, W, d: W.document, push, errs, writes, sent };
  };
  const noErr = (errs) => errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;

  /* —— 1. chat.html: the head script + the live re-resolve —— */
  try {
    const r = {};
    for (const [stored, want] of [['blue', 'blue'], ['green', 'green'], ['gradient', 'gradient'], ['x-b1', 'flat'], ['nope', 'flat']]) {
      const s = await boot('chat.html', { 'spixi.chat.ground': stored });
      s.push('onChatScreenReady', 'addrPeer');
      await sleep(150);
      const head = s.writes[0];
      const live = s.d.documentElement.getAttribute('data-chat-ground');
      r[stored] = head === want && live === want && s.writes.every((v) => v === want) && noErr(s.errs);
      if (!r[stored]) r[stored + '_got'] = JSON.stringify(s.writes) + ' live=' + live;
      s.dom.window.close();
    }
    /* the LIVE ladder on its own: a pick made in Settings while the chat is open (the storage / focus re-resolve) */
    {
      const s = await boot('chat.html', { 'spixi.chat.ground': 'flat' });
      s.push('onChatScreenReady', 'addrPeer');
      await sleep(100);
      const seq = [];
      for (const v of ['blue', 'green', 'x-db1', 'blue', 'nope']) {
        s.W.__store.set('spixi.chat.ground', v);
        s.W.dispatchEvent(new s.W.Event('focus'));
        await sleep(20);
        seq.push(s.d.documentElement.getAttribute('data-chat-ground'));
      }
      r.liveSeq = seq.join() === 'blue,green,flat,blue,flat';
      if (!r.liveSeq) r.liveSeq_got = seq.join();
      s.dom.window.close();
    }
    ok(Object.values(r).every((v) => v === true),
      '★ S8 picks (#1237) the BUILT chat.html admits the four grounds in BOTH of its ladders (the pre-paint head script — the first data-chat-ground write — and the live re-resolve): a stored blue / green / gradient paints as stored before first paint and stays; an unknown value or an s8x scratch id (x-b1) lands on flat; the live re-resolve (a Settings pick while the chat is open) follows blue → green → flat (x-db1) → blue → flat (unknown) — ' + JSON.stringify(r));
  } catch (e) { ok(false, 'S8 #1237 chat ladders THREW: ' + (e && e.stack || e)); }

  /* —— 2. settings.html: readChatPrefs → the Canvas row, both themes —— */
  try {
    const r = {};
    for (const theme of ['light', 'dark']) for (const stored of ['blue', 'green']) {
      const s = await boot('settings.html', { 'spixi.chat.ground': stored });
      const { d, push, W } = s;
      push('setTheme', theme);
      await sleep(120);
      const hub = [...d.querySelectorAll('button, [role="button"]')].find((x) => /^\s*Chat appearance/.test(x.textContent || ''));
      if (hub) hub.click();
      await sleep(250);
      const dots = [...d.querySelectorAll('.c-settings-appearance__dots [role="radio"]')];
      const prev = d.querySelector('.c-settings-appearance__preview');
      const key = theme + ':' + stored;
      const shape = dots.map((b) => b.dataset.value).join() === 'flat,gradient,green,blue'
        && dots.map((b) => b.getAttribute('aria-label')).join('|') === 'Solid|Brand gradient|Green gradient|Blue gradient'
        && dots.every((b) => b.querySelector('.c-settings-appearance__dot-face').getAttribute('data-chat-ground') === b.dataset.value);
      const checked = dots.filter((b) => b.getAttribute('aria-checked') === 'true').map((b) => b.dataset.value).join();
      let wrote = null;
      const other = dots.find((b) => b.dataset.value === (stored === 'blue' ? 'green' : 'blue'));
      if (other) { other.click(); await sleep(20); wrote = W.__store.get('spixi.chat.ground'); }
      r[key] = shape && checked === stored && !!prev && prev.getAttribute('data-chat-ground') === (other ? other.dataset.value : stored) && wrote === (stored === 'blue' ? 'green' : 'blue') && noErr(s.errs);
      if (!r[key]) r[key + '_got'] = JSON.stringify({ n: dots.length, checked, wrote, theme: d.documentElement.getAttribute('data-theme') });
      s.dom.window.close();
    }
    ok(Object.values(r).every((v) => v === true),
      '★ S8 picks (#1237) the BUILT settings.html (the third ladder, readChatPrefs) opens Chat appearance with FOUR canvas dots in BOTH themes — Solid · Brand gradient · Green gradient · Blue gradient, each face painting its own ground — the STORED one checked (green in dark too: it is no longer light-only), and a tap writes the new ground and re-stamps the preview — ' + JSON.stringify(r));
  } catch (e) { ok(false, 'S8 #1237 settings ladder THREW: ' + (e && e.stack || e)); }

  /* —— 3. the BUILT token sheet + the shells' inlined component css carry the picked values —— */
  {
    const html = join(root, 'Spixi/Resources/Raw/html');
    const tk = stripCssComments(readFileSync(join(html, 'spixi.tokens.css'), 'utf8'));
    const chatH = stripCssComments(readFileSync(join(html, 'chat.html'), 'utf8'));       // the component css is inlined per shell
    const setH = stripCssComments(readFileSync(join(html, 'settings.html'), 'utf8'));
    const rule = (css, sel) => {
      const esc = sel.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(',\\s*');
      const m = new RegExp(esc + '\\s*\\{([^}]*)\\}').exec(css);
      return m ? m[1] : '';
    };
    const L = (g) => [":root:not([data-theme='dark'])[data-chat-ground='" + g + "']", ":root:not([data-theme='dark']) [data-chat-ground='" + g + "']"];
    const D = (g) => [":root[data-theme='dark'][data-chat-ground='" + g + "']", ":root[data-theme='dark'] [data-chat-ground='" + g + "']"];
    const lb = rule(tk, L('blue')), dg = rule(tk, D('green')), db = rule(tk, D('blue'));
    const has = (body, decl) => body.replace(/\s+/g, ' ').includes(decl);
    const c = {
      lightBlue: has(lb, '--gradient-chat: linear-gradient(180deg, #C9DDF2 0%, #C5D6F1 50%, #C2CFEE 100%), var(--chat-canvas-base);') && has(lb, '--chat-pattern-ink: #1E3A66;') && has(lb, '--surface-select-row-gap: #ADC1E9;'),
      darkGreen: has(dg, '--gradient-chat: linear-gradient(180deg, #11231A 0%, #0E1A14 45%, var(--chat-canvas-base) 100%), var(--chat-canvas-base);') && has(dg, '--chat-pattern-ink: #BFE8CB;') && has(dg, '--surface-select-row-gap: #253748;'),
      darkBlue: has(db, '--gradient-chat: linear-gradient(180deg, #0D2238 0%, #0C1828 45%, var(--chat-canvas-base) 100%), var(--chat-canvas-base);') && has(db, '--chat-pattern-ink: #C2DDFB;') && has(db, '--surface-select-row-gap: #233557;'),
      noticeEdge: has(rule(chatH, D('blue').map((x) => x + ' .c-sysnotice__card')), 'box-shadow: var(--elevation-2), inset 0 0 0 1px rgba(118, 157, 255, 0.28);'),
      dotGreen: has(rule(setH, [":root[data-theme='dark'] .c-settings-appearance__dot-face[data-chat-ground='green']"]), 'background: linear-gradient(180deg, #1A3326 0%, #11231A 100%);'),
      dotBlue: has(rule(setH, [":root[data-theme='dark'] .c-settings-appearance__dot-face[data-chat-ground='blue']"]), 'background: linear-gradient(180deg, #173452 0%, #0D2238 100%);'),
      noScratch: !/data-chat-ground[=^]+'x-/.test(tk + chatH + setH) && !/__s8x/.test(chatH),
    };
    ok(Object.values(c).every(Boolean),
      '★ S8 picks (#1237) the BUILT sheets paint Damir\'s picks — light blue = B1 Sky (#C9DDF2 → #C5D6F1 → #C2CFEE, ink #1E3A66), dark green = DG1 Forest (#11231A → #0E1A14 → the canvas, ink #BFE8CB), dark blue = DB1 Azure (#0D2238 → #0C1828 → the canvas, ink #C2DDFB), each with its own select-row gap; the dark-blue notice card carries the #1066 hairline; the two new dark dots paint their ground\'s top; no s8x scratch ground (x-*) ships — ' + JSON.stringify(c));
  }
}
