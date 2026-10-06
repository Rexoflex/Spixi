/* ==== SESSION 7b (S2) — ★ 7b (#1221) THE #1201 REVERT + THE GREY PENDING GROUND ====
 * On the BUILT chat.html (jsdom):
 *   · the revert: the document's FIRST open with a preview tile still decoding (decode never resolves) and every 60 ms
 *     timer blocked (the old hold's cap) still sends `ixian:painted` — once, two frames after onChatScreenLoaded, no
 *     hold; no holdOpenReveal / "[P1] fade hold" anywhere; the tile keeps today's fade (loaded WITHOUT data-seen)
 *   · the ground (#46 r2 m1+m2 re-base): --surface-neutral-02 on a ::before layer of the picture box, under the img,
 *     always present at opacity 0; a QUIET tile shows it (opacity 1) through loaded; a never-quiet tile (offer, live
 *     photo) never does — NOT the bubble's white in light, never lighter than the bubble in dark; the frame unchanged
 * Deliberate breaks: see the 7b hand-back. */
export default async function (h) {
  const { ok, root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const T0 = Math.floor(Date.now() / 1000) - 900;
  const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
  const guard = async (name, fn) => { try { await fn(); } catch (e) { ok(false, name + ' — threw: ' + (e && e.stack || e)); } };
  const noErr = (errs) => errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;
  const f = join(root, 'Spixi/Resources/Raw/html/chat.html');

  const boot = async () => {
    const errs = [];
    const warns = [];
    const painted = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    vc.on('warn', (...a) => warns.push(a.join(' ')));
    const dom = new JSDOM(readFileSync(f, 'utf8').replace(/<html\b/i, '<html data-p1'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.Element.prototype.scrollIntoView = function () {};
        const st = w.setTimeout.bind(w);
        w.setTimeout = (fn, ms, ...a) => (w.__blockCap && ms === 60 ? 0 : st(fn, ms, ...a));   // the old hold's cap never fires
        w.HTMLImageElement.prototype.decode = function () { return w.__decodeNever ? new Promise(() => {}) : Promise.resolve(); };
        const sym = Object.getOwnPropertySymbols(w.location).find((s) => s.description === 'impl');
        const impl = sym ? w.location[sym] : null;
        if (impl) Object.defineProperty(impl, 'href', { configurable: true, get() { return 'file://' + f; }, set(v) { if (String(v) === 'ixian:painted') painted.push(w.performance.now()); } });
      },
    });
    await sleep(1600);
    const W = dom.window;
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => (x == null ? null : b64(x))));
    const frames = (n) => new Promise((res) => { let k = 0; const t = () => (++k >= n ? res() : W.requestAnimationFrame(t)); W.requestAnimationFrame(t); });
    push('onChatScreenReady', 'addrPeer');
    push('setChatMode', '0', '0', '', 'False');
    push('setPhotoPreviews', 'True');
    push('clearMessages', 'false');
    return { dom, W, d: W.document, push, frames, errs, warns, painted };
  };
  const addPhoto = (s, id, t) => s.push('addFile', id, 'addrPeer', 'Bob', '', 'f' + id, 'IMG_' + id + '.jpg', String(T0 + t),
    'False', 'True', 'False', '100', 'True', 'False', 'True', '', '1');
  const tileOf = (s, id) => s.d.querySelector('#messages [data-msgid="' + id + '"] .c-mbubble');

  /* ——— A. the revert ——— */
  await guard('#1221 revert', async () => {
    const s = await boot();
    addPhoto(s, 'a1', 0);
    s.push('setFileThumb', 'a1', JPEG);
    s.push('messagesDone');
    await s.frames(3);
    const r = {};
    r.loadingAtOpen = !!tileOf(s, 'a1') && tileOf(s, 'a1').dataset.state === 'loading';
    s.W.__blockCap = true;
    s.W.__decodeNever = true;
    s.push('onChatScreenLoaded');
    await s.frames(4);
    await sleep(60);
    r.paintedOnce = s.painted.length === 1;
    r.noHoldInShell = !/holdOpenReveal|fadeHold/.test(readFileSync(f, 'utf8')) && typeof s.W.Spixi.holdOpenReveal === 'undefined';
    r.noHoldInBundle = !/holdOpenReveal|fade hold ms=/.test(readFileSync(join(root, 'Spixi/Resources/Raw/html/spixi.bundle.js'), 'utf8'));
    r.noHoldLine = !s.warns.some((w) => /\[P1\] fade hold/.test(w));
    /* the tile is on today's path: its load → the reveal with the first-show fade (no data-seen) */
    s.W.__decodeNever = false;
    const img = tileOf(s, 'a1').querySelector('.c-mbubble__img');
    img.dispatchEvent(new s.W.Event('load'));
    await s.frames(4);
    r.fades = tileOf(s, 'a1').dataset.state === 'loaded' && tileOf(s, 'a1').dataset.seen === undefined;
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every(Boolean),
      '★ 7b (#1221) #1201 REVERTED on the BUILT chat shell: the first open with a preview tile still decoding (decode never resolves, the 60 ms cap blocked) sends `ixian:painted` exactly once two frames after onChatScreenLoaded — no hold; no holdOpenReveal in the shell or the bundle, no "[P1] fade hold" line; the tile then takes today\'s first-show fade (loaded, no data-seen) — '
      + JSON.stringify(r) + ' painted=' + s.painted.length + ' ' + s.errs.slice(0, 2).join(' | '));
    s.dom.window.close();
  });

  /* ——— B. the grey ground — #46 r2 m1+m2 re-base: a layer of the PICTURE BOX under the img that ALWAYS exists at
     opacity 0; only a QUIET tile (the history / chat-open path) shows it, and keeps it through loaded ——— */
  await guard('#1221 ground', async () => {
    const s = await boot();
    const { W, d } = s;
    addPhoto(s, 'g1', 0);   // a history-load photo, no preview yet → QUIET
    /* g2: a real OFFER photo tile (incoming, progress 0, NOT complete, no transfer) — never quiet, never a picture */
    s.push('addFile', 'g2', 'addrPeer', 'Bob', '', 'fg2', 'IMG_g2.jpg', String(T0 + 30), 'False', 'True', 'False', '0', 'False', 'False', 'True', '', '');
    s.push('messagesDone');
    s.push('onChatScreenLoaded');
    await s.frames(2);
    await sleep(400);   // the load burst is over: the next row is a LIVE insert
    /* g3: a LIVE received complete photo (never quiet: #46 r1 B-m4) */
    addPhoto(s, 'g3', 60);
    await s.frames(2);
    const resolve = (v, depth = 0) => {
      const m = /var\((--[\w-]+)\s*(?:,\s*([^)]*))?\)/.exec(String(v));
      if (!m || depth > 8) return String(v).trim();
      const t = W.getComputedStyle(d.documentElement).getPropertyValue(m[1]).trim();
      return resolve(t || (m[2] || '').trim(), depth + 1);
    };
    /* jsdom computes no pseudo-elements: the ::before rules of the BUILT CSSOM that match the tile, in cascade order
       (source order = specificity order here — the last match wins) */
    const pseudo = [];
    const plain = [];
    const walk = (rules) => { for (const ru of Array.from(rules || [])) { if (ru.cssRules && !ru.selectorText) walk(ru.cssRules); else if (ru.selectorText) for (const sel of ru.selectorText.split(',')) { const m = /^(.*)::before\s*$/.exec(sel.trim()); if (m && /c-mbubble/.test(m[1])) pseudo.push({ base: m[1], st: ru.style }); else if (!/::/.test(sel) && /c-mbubble/.test(sel)) plain.push({ base: sel.trim(), st: ru.style }); } } };
    for (const sh of Array.from(d.styleSheets)) { try { walk(sh.cssRules); } catch (e) {} }
    const layer = (el) => {
      const hit = pseudo.filter((p) => { try { return el.matches(p.base); } catch (e) { return false; } });
      const get = (k) => { let v = ''; for (const p of hit) { const x = p.st.getPropertyValue(k); if (x) v = x; } return v; };
      return { n: hit.length, content: get('content'), pos: get('position'), inset: get('inset') || [get('top'), get('right'), get('bottom'), get('left')].join(' '), z: get('z-index'), bg: resolve(get('background') || get('background-color')), op: get('opacity').trim(), tr: get('transition') };
    };
    const frame = (el) => {
      const hit = plain.filter((p) => { try { return el.matches(p.base); } catch (e) { return false; } });
      const get = (k) => { let v = ''; for (const p of hit) { const x = p.st.getPropertyValue(k); if (x) v = x; } return v; };
      return resolve(get('border')) + '|' + resolve(get('background') || get('background-color'));
    };
    const lum = (hex) => {
      const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
      if (!m) return NaN;
      const n = parseInt(m[1], 16);
      return [n >> 16, (n >> 8) & 255, n & 255].map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; })
        .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
    };
    const r = {};
    const t = tileOf(s, 'g1');
    d.documentElement.setAttribute('data-theme', 'light');
    const grey = resolve('var(--surface-neutral-02)');
    const bubL = resolve('var(--surface-bubble-received)');
    /* (a) the QUIET tile: the layer shows, grey */
    r.quiet = !!t && t.hasAttribute('data-quiet') && t.dataset.state !== 'loaded';
    const pend = layer(t);
    const frameP = frame(t);
    r.layerBox = pend.n >= 1 && /^["']{2}$/.test(pend.content) && pend.pos === 'absolute' && /^0(px)?( 0(px)?){0,3}\s*$/.test(pend.inset.trim()) && (!pend.z || pend.z === 'auto' || Number(pend.z) < 1);
    r.quietShows = pend.op === '1';
    r.fades = /opacity/.test(pend.tr) && /--duration-200/.test(pend.tr);   // the expiry fades grey → white with the face
    r.lightGrey = pend.bg === grey && lum(grey) < lum(bubL) && /^#f{6}$/i.test(bubL);
    r.frameIsBubble = frameP.split('|').every((x) => x === bubL);
    d.documentElement.setAttribute('data-theme', 'dark');
    const pendD = layer(t).bg;
    const bubD = resolve('var(--surface-bubble-received)');
    r.darkNotLighter = !Number.isNaN(lum(pendD)) && lum(pendD) <= lum(bubD);
    d.documentElement.setAttribute('data-theme', 'light');
    /* (b) NEVER-quiet tiles: the layer exists but at opacity 0 in every state (#1133 (3) white) */
    const off = (el) => { const L = el ? layer(el) : null; return !!L && L.n >= 1 && !el.hasAttribute('data-quiet') && L.op === '0'; };
    const g2 = tileOf(s, 'g2');
    r.offerIsOffer = !!g2 && g2.dataset.file === 'offer';
    r.offerWhite = off(g2);
    const g3 = tileOf(s, 'g3');
    r.liveIsComplete = !!g3 && g3.dataset.file === 'complete';
    r.liveIdleWhite = off(g3);
    /* both pictures land: g1 (quiet) and g3 (live) */
    s.push('setFileThumb', 'g1', JPEG);
    s.push('setFileThumb', 'g3', JPEG);
    await s.frames(2);
    r.liveLoadingWhite = off(tileOf(s, 'g3'));
    for (const id of ['g1', 'g3']) { const im = tileOf(s, id).querySelector('.c-mbubble__img'); if (im) im.dispatchEvent(new W.Event('load')); }
    await s.frames(4);
    const t2 = tileOf(s, 'g1');
    const done = layer(t2);
    r.loaded = t2.dataset.state === 'loaded' && tileOf(s, 'g3').dataset.state === 'loaded';
    r.quietHeldAtLoaded = t2.hasAttribute('data-quiet');
    r.groundUnchanged = done.bg === pend.bg && done.op === '1';   // the grey under the fading picture never switches at loaded (the flash)
    r.frameUnchanged = frame(t2) === frameP;
    r.liveLoadedWhite = off(tileOf(s, 'g3'));
    const img = t2.querySelector('.c-mbubble__img');
    r.imgAbove = !!img && Number(resolve(W.getComputedStyle(img).getPropertyValue('z-index'))) >= 1;
    { const sp = d.createElement('div'); sp.className = 'c-mbubble'; sp.setAttribute('data-file', 'progress'); sp.setAttribute('data-state', 'loaded');
      r.sendingKeeps = layer(sp).op === '1'; }   // #46 r3: MY sending photo drops data-quiet at load — the ground stays under its fade
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every(Boolean),
      '★ 7b (#1221 · #46 r2 m1+m2) the PICTURE GROUND on the BUILT chat shell: a ::before layer of the picture box (absolute, inset 0) UNDER the img that ALWAYS exists at opacity 0 with an opacity --duration-200 transition; a QUIET tile (history / chat open) shows it at opacity 1 — grey (--surface-neutral-02, not the received white in light; never lighter than the bubble in dark) — and keeps data-quiet through loaded, so the ground under the fading picture never switches; a NEVER-quiet tile (a real OFFER, a LIVE complete photo idle → loading → loaded) keeps it at opacity 0 (#1133 (3) white); the frame stays the bubble ground — '
      + JSON.stringify(r) + ' light=' + pend.bg + '/' + bubL + ' dark=' + pendD + '/' + bubD + ' layer=' + JSON.stringify(pend) + ' frame=' + frameP + ' ' + s.errs.slice(0, 2).join(' | '));
    s.dom.window.close();
  });
}
