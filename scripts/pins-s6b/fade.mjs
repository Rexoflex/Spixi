/* ==== SESSION 6b — ★ #1201 A-FADE FIX (agent F): photos READY at open ====
 * Mechanism (measured, the #1181 probe + a 60 fps recording): the fade ran while the chat was still STAGED — `painted`
 * went at the first paint and the present dropped ~100 ms of frames, so the tile ground showed for 1–2 frames and the
 * picture then popped. Fix (Damir's pick): on the document's FIRST open, chat.html hands its `ixian:painted` send to
 * media-bubble.js holdOpenReveal, which holds it until the first paint's preview tiles have decoded, CAPPED at 60 ms;
 * a tile ready inside the cap is LOADED with no fade (data-seen), one that is not keeps today's fade; no tile → 0 ms.
 * Behaviour on the BUILT chat.html (jsdom): img.decode is stubbed per picture (fast / never), the img load event is
 * dispatched by the pin (jsdom loads no images), the send is timed through a wrapper on window.Spixi.holdOpenReveal
 * (the shell reads it at call time) and the real `ixian:painted` navigation is captured. One ok() per scenario. */
export default async function (h) {
  const { ok, root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const b64 = (v) => Buffer.from(String(v), 'utf8').toString('base64');
  const T0 = Math.floor(Date.now() / 1000) - 900;
  const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q';
  const pic = (k) => JPEG + k.repeat(4) + '==';   // distinct tails → distinct pictures (the shown-set key is the tail)
  const guard = async (name, fn) => { try { await fn(); } catch (e) { ok(false, name + ' — threw: ' + (e && e.stack || e)); } };

  const bootChat = async () => {
    const f = join(root, 'Spixi/Resources/Raw/html/chat.html');
    const errs = [];
    const warns = [];
    const painted = [];
    const decodeMode = new Map();   // src → 'never' | 'manual'; anything else decodes at once
    const manual = new Map();       // src → resolve
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
        /* blockCap: the hold's 60 ms cap timer (armed inside the holdOpenReveal call) never fires — a send then can only
           come from the hold's own "every tile landed" path (deterministic: no wall-clock bound on jsdom) */
        const st = w.setTimeout.bind(w);
        w.setTimeout = (fn, ms, ...a) => (w.__inHold && w.__blockCap && ms === 60 ? 0 : st(fn, ms, ...a));
        w.HTMLImageElement.prototype.decode = function () {
          const s = this.getAttribute('src') || '';
          const m = decodeMode.get(s);
          if (m === 'never') return new Promise(() => {});
          if (m === 'manual') return new Promise((res) => manual.set(s, res));
          return Promise.resolve();
        };
        const sym = Object.getOwnPropertySymbols(w.location).find((s) => s.description === 'impl');
        const impl = sym ? w.location[sym] : null;
        if (impl) Object.defineProperty(impl, 'href', { configurable: true, get() { return 'file://' + f; }, set(v) { if (String(v) === 'ixian:painted') painted.push(w.performance.now()); } });
      },
    });
    await sleep(1600);
    const W = dom.window;
    const S = W.Spixi;
    const hold = { calls: [], sent: [], onCall: null };
    const orig = S.holdOpenReveal;
    S.holdOpenReveal = (rootEl, send) => {
      const t = W.performance.now();
      hold.calls.push(t);
      if (hold.onCall) hold.onCall();
      W.__inHold = true;
      try { return orig(rootEl, () => { hold.sent.push(W.performance.now()); send(); }); } finally { W.__inHold = false; }
    };
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => (x == null ? null : b64(x))));
    const frames = (n = 3) => new Promise((res) => { let k = 0; const t = () => (++k >= n ? res() : W.requestAnimationFrame(t)); W.requestAnimationFrame(t); });
    push('onChatScreenReady', 'addrPeer');
    push('setChatMode', '0', '0', '', 'False');
    push('setPhotoPreviews', 'True');
    push('clearMessages', 'false');
    return { dom, W, d: W.document, S, push, frames, errs, warns, painted, hold, decodeMode, manual };
  };
  // addFile(id, address, nick, avatar, fileid, name, time, me, sent, read, progress, complete, paid, relaySent, transfer, local)
  const addPhoto = (s, id, t) => s.push('addFile', id, 'addrPeer', 'Bob', '', 'f' + id, 'IMG_' + id + '.jpg', String(T0 + t),
    'False', 'True', 'False', '100', 'True', 'False', 'True', '', '1');
  const tileOf = (s, id) => s.d.querySelector('#messages [data-msgid="' + id + '"] .c-mbubble');
  const imgOf = (s, id) => { const t = tileOf(s, id); return t ? t.querySelector('.c-mbubble__img') : null; };
  const fire = (s, id) => { const i = imgOf(s, id); if (i) i.dispatchEvent(new s.W.Event('load')); return !!i; };
  const holdLines = (s) => s.warns.filter((w) => /\[P1\] fade hold/.test(w));
  const flipLines = (s) => s.warns.filter((w) => /\[P1\] fade flip/.test(w));
  const noErr = (errs) => errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;
  const seenNoFade = (s, id) => {   // LOADED, data-seen, and the built css drops the img's transition for it
    const t = tileOf(s, id), i = imgOf(s, id);
    if (!t || !i) return false;
    const tr = String(s.W.getComputedStyle(i).getPropertyValue('transition') || s.W.getComputedStyle(i).getPropertyValue('transition-property') || '').trim();
    return t.dataset.state === 'loaded' && t.dataset.seen !== undefined && /^none\b/.test(tr);
  };
  const fades = (s, id) => { const t = tileOf(s, id); return !!t && t.dataset.state === 'loaded' && t.dataset.seen === undefined; };

  /* ——— A. two preview tiles that decode fast: one already decoded (its fade had begun, off screen) and one whose
     load lands 10 ms INTO the hold → painted waits for the second, both LOADED with no fade, ready=2 hit=0 ——— */
  let sA = null;
  await guard('#1201 A ready', async () => {
    const s = await bootChat();
    sA = s;
    addPhoto(s, 'a1', 0); addPhoto(s, 'a2', 10);
    s.push('setFileThumb', 'a1', pic('A')); s.push('setFileThumb', 'a2', pic('B'));
    s.push('messagesDone');
    await s.frames(3);   // the boot's own queued re-render (setChatMode before the burst) lands first — on a device the pushes are spread out
    const r = {};
    s.W.__blockCap = true;   // A: the send must come from "both tiles landed", never from the cap
    r.tilesBuilt = fire(s, 'a1') && !!imgOf(s, 'a2');
    let tLoad2 = 0;
    let atHold = '';
    s.hold.onCall = () => {
      atHold = [tileOf(s, 'a1'), tileOf(s, 'a2')].map((t) => (t ? t.dataset.state + (t.dataset.seen !== undefined ? '+seen' : '') : '-')).join(',');
      setTimeout(() => { tLoad2 = s.W.performance.now(); fire(s, 'a2'); }, 10);
    };
    s.push('onChatScreenLoaded');
    await sleep(300);
    const lines = holdLines(s);
    r.bothPaths = atHold === 'loaded,loading';   // a1 flipped (its fade begun, off screen) BEFORE the hold, a2 still loading
    r.heldOnce = s.hold.calls.length === 1 && s.hold.sent.length === 1;
    r.waited = tLoad2 > 0 && s.hold.sent[0] >= tLoad2;
    /* under the cap: decided by the hold itself (hit=0 in the probe below) — a wall-clock bound here would read jsdom's
       own event-loop stalls (seen: a 60 ms timer firing at 200 ms), not the shell */
    r.paintedOnce = s.painted.length === 1 && s.painted[0] >= s.hold.sent[0];
    r.a1NoFade = seenNoFade(s, 'a1');
    r.a2NoFade = seenNoFade(s, 'a2');
    r.probe = lines.length === 1 && /^\[P1\] fade hold ms=\d+ tiles=2 ready=2 hit=0$/.test(lines[0]);
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every(Boolean),
      '★ #1201 A-FADE (Damir pick "photos READY at open") on the BUILT chat shell: the first open\'s `painted` waits for the first paint\'s two preview tiles (one already decoded, one decoding 10 ms into the hold) and goes before the 60 ms cap (hit=0); both tiles are LOADED with data-seen (the built css: transition none — no fade); one probe line "fade hold ms tiles=2 ready=2 hit=0" — '
      + JSON.stringify(r) + ' ' + JSON.stringify(holdLines(s)) + ' dt=' + Math.round((s.hold.sent[0] || 0) - (s.hold.calls[0] || 0)) + ' ' + s.errs.slice(0, 2).join(' | '));
  });

  /* ——— D. later: a re-flush (channel switch) is never held, and a tile that arrives after the open still FADES ——— */
  await guard('#1201 D later', async () => {
    const s = sA;
    if (!s) throw new Error('scenario A did not boot');
    const r = {};
    s.push('onChatScreenLoaded');   // the second onChatScreenLoaded of this document
    await sleep(120);
    r.notHeldAgain = s.hold.calls.length === 1 && s.painted.length === 2;
    addPhoto(s, 'l1', 100);
    s.push('setFileThumb', 'l1', pic('C'));
    await s.frames(2);
    const flips0 = flipLines(s).length;
    r.built = fire(s, 'l1');
    await s.frames(4);
    r.lateFades = fades(s, 'l1');
    r.flipLogged = flipLines(s).length === flips0 + 1;
    r.oneProbe = holdLines(s).length === 1;
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every(Boolean),
      '★ #1201 on the BUILT chat shell: only the document\'s FIRST open is held — a second onChatScreenLoaded (channel switch / re-flush) sends `painted` at once with no hold; a photo that arrives after the open takes today\'s fade (loaded without data-seen, the #1181 "fade flip" line) — '
      + JSON.stringify(r) + ' ' + s.errs.slice(0, 2).join(' | '));
    s.dom.window.close();
  });

  /* ——— B. a tile whose decode never resolves → painted at the cap (≤ 60 ms + slack), the tile keeps the fade path ——— */
  await guard('#1201 B cap', async () => {
    const s = await bootChat();
    addPhoto(s, 'b1', 0);
    const P = pic('D');
    s.decodeMode.set(P, 'manual');
    s.push('setFileThumb', 'b1', P);
    s.push('messagesDone');
    await s.frames(3);   // the boot's own queued re-render (setChatMode before the burst) lands first — on a device the pushes are spread out
    const r = {};
    r.built = fire(s, 'b1');
    s.push('onChatScreenLoaded');
    await sleep(200);
    const dt = (s.hold.sent[0] || 0) - (s.hold.calls[0] || 0);
    r.capped = s.hold.sent.length === 1 && dt >= 55 && dt <= 60 + 190;   // the cap; the slack absorbs jsdom's timer stalls (a 600 ms cap still fails)
    r.painted = s.painted.length === 1;
    r.stillLoading = !!tileOf(s, 'b1') && tileOf(s, 'b1').dataset.state === 'loading' && tileOf(s, 'b1').dataset.seen === undefined;
    r.probe = holdLines(s).length === 1 && /^\[P1\] fade hold ms=\d+ tiles=1 ready=0 hit=1$/.test(holdLines(s)[0]);
    const res = s.manual.get(P);
    r.decodePending = typeof res === 'function';
    if (res) res();
    await s.frames(4);
    r.thenFades = fades(s, 'b1');
    r.flipLogged = flipLines(s).length === 1;
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every(Boolean),
      '★ #1201 cap on the BUILT chat shell: a preview tile whose decode has not resolved holds `painted` only to the 60 ms cap (+ timer slack) — probe "tiles=1 ready=0 hit=1" — and the tile is let go: when its decode lands later it takes TODAY\'s fade (loaded, no data-seen, the "fade flip" line), never a pop — '
      + JSON.stringify(r) + ' dt=' + Math.round(dt) + ' ' + JSON.stringify(holdLines(s)) + ' ' + s.errs.slice(0, 2).join(' | '));
    s.dom.window.close();
  });

  /* ——— C. no preview tile in the first paint → painted at once (a 0 ms hold) ——— */
  await guard('#1201 C none', async () => {
    const s = await bootChat();
    s.push('addThem', 't1', 'addrPeer', 'Bob', '', 'hello', String(T0));
    s.push('addThem', 't2', 'addrPeer', 'Bob', '', 'there', String(T0 + 5));
    s.push('messagesDone');
    s.push('onChatScreenLoaded');
    await sleep(150);
    const r = {};
    r.calledOnce = s.hold.calls.length === 1;
    r.sync = s.hold.sent.length === 1 && s.hold.sent[0] - s.hold.calls[0] < 2;
    r.painted = s.painted.length === 1;
    r.probe = holdLines(s).length === 1 && /^\[P1\] fade hold ms=[01] tiles=0 ready=0 hit=0$/.test(holdLines(s)[0]);
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every(Boolean),
      '★ #1201 on the BUILT chat shell: a first open with NO preview tile sends `painted` in the same frame the hold is asked (0 ms) — probe "fade hold ms=0 tiles=0 ready=0 hit=0" — '
      + JSON.stringify(r) + ' ' + JSON.stringify(holdLines(s)) + ' ' + s.errs.slice(0, 2).join(' | '));
    s.dom.window.close();
  });

  /* ——— F. an OFF-VIEW preview tile is not held (nobody sees it; its decode must not delay the present): one tile above
     the log's view whose decode never lands + one in view already decoded → tiles=1 ready=1 hit=0; the cap timer is
     blocked, so a held off-view tile would leave `painted` unsent; the off-view tile then fades as today ——— */
  await guard('#1201 F off-view', async () => {
    const s = await bootChat();
    addPhoto(s, 'f1', 0); addPhoto(s, 'f2', 10);
    const P1 = pic('E');
    s.decodeMode.set(P1, 'manual');
    s.push('setFileThumb', 'f1', P1); s.push('setFileThumb', 'f2', pic('F'));
    s.push('messagesDone');
    await s.frames(3);
    const r = {};
    const box = s.d.getElementById('messages');
    const rect = (top, bottom) => () => ({ top, bottom, left: 0, right: 300, width: 300, height: bottom - top, x: 0, y: top });
    box.getBoundingClientRect = rect(0, 600);
    const off = tileOf(s, 'f1');
    r.built = !!off && !!tileOf(s, 'f2');
    if (off) off.getBoundingClientRect = rect(-900, -600);   // scrolled out above the view
    r.loads = fire(s, 'f1') && fire(s, 'f2');
    s.W.__blockCap = true;
    s.push('onChatScreenLoaded');
    await sleep(250);
    r.paintedOnce = s.hold.sent.length === 1 && s.painted.length === 1;
    r.probe = holdLines(s).length === 1 && /^\[P1\] fade hold ms=\d+ tiles=1 ready=1 hit=0$/.test(holdLines(s)[0]);
    r.inViewNoFade = seenNoFade(s, 'f2');
    r.offNotHeld = tileOf(s, 'f1') === off && off.dataset.state === 'loading' && off.dataset.seen === undefined;
    const res = s.manual.get(P1);
    if (res) res();
    await s.frames(4);
    r.offFades = fades(s, 'f1');
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every(Boolean),
      '★ #1201 (#46 C S7) on the BUILT chat shell: a preview tile OUTSIDE the log\'s view is never held — `painted` goes on the in-view tile alone (tiles=1 ready=1 hit=0, the cap blocked), the off-view tile stays loading and later takes today\'s fade — '
      + JSON.stringify(r) + ' ' + JSON.stringify(holdLines(s)) + ' ' + s.errs.slice(0, 2).join(' | '));
    s.dom.window.close();
  });

  /* ——— G. a re-render DURING the hold (a live row → renderLogNow) re-builds the held tile: the new tile is NOT "seen"
     (it was never on screen) — it keeps today's fade; `painted` still goes ONCE, at the cap (the old held tile is gone
     and never lands) — the held-path twin of fix3's rebuiltNotSeen ——— */
  await guard('#1201 G rebuild', async () => {
    const s = await bootChat();
    addPhoto(s, 'g1', 0);
    const P = pic('G');
    s.decodeMode.set(P, 'manual');
    s.push('setFileThumb', 'g1', P);
    s.push('messagesDone');
    await s.frames(3);
    const r = {};
    const old = tileOf(s, 'g1');
    r.built = fire(s, 'g1');
    s.hold.onCall = () => setTimeout(() => s.push('addThem', 'g2', 'addrPeer', 'Bob', '', 'live line', String(T0 + 20)), 10);
    s.push('onChatScreenLoaded');
    await sleep(250);
    const cur = tileOf(s, 'g1');
    const dt = (s.hold.sent[0] || 0) - (s.hold.calls[0] || 0);
    r.rebuilt = !!cur && cur !== old && !old.isConnected;
    r.rebuiltNotSeen = !!cur && cur.dataset.seen === undefined && cur.dataset.state === 'loading';
    r.paintedOnce = s.hold.sent.length === 1 && s.painted.length === 1 && dt >= 55 && dt <= 60 + 190;
    r.probe = holdLines(s).length === 1 && /^\[P1\] fade hold ms=\d+ tiles=1 ready=0 hit=1$/.test(holdLines(s)[0]);
    if (cur) { fire(s, 'g1'); await Promise.resolve(); const res = s.manual.get(P); if (res) res(); }
    await s.frames(4);
    r.newTileFades = fades(s, 'g1');
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every(Boolean),
      '★ #1201 (#46 C) on the BUILT chat shell: a re-render during the open hold re-builds the held tile — the new tile is not "seen" and takes today\'s fade when its picture lands; `painted` still goes once, at the 60 ms cap (hit=1) — '
      + JSON.stringify(r) + ' dt=' + Math.round(dt) + ' ' + JSON.stringify(holdLines(s)) + ' ' + s.errs.slice(0, 2).join(' | '));
    s.dom.window.close();
  });

  /* ——— E. the probe is dev-only: without data-p1 the hold logs nothing (and still sends) ——— */
  await guard('#1201 E probe off', async () => {
    const f = join(root, 'Spixi/Resources/Raw/html/chat.html');
    const warns = [];
    let painted = 0;
    const vc = new VirtualConsole();
    vc.on('warn', (...a) => warns.push(a.join(' ')));
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.Element.prototype.scrollIntoView = function () {};
        const sym = Object.getOwnPropertySymbols(w.location).find((s) => s.description === 'impl');
        const impl = sym ? w.location[sym] : null;
        if (impl) Object.defineProperty(impl, 'href', { configurable: true, get() { return 'file://' + f; }, set(v) { if (String(v) === 'ixian:painted') painted++; } });
      },
    });
    await sleep(1600);
    const W = dom.window;
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map(b64));
    push('onChatScreenReady', 'addrPeer'); push('setChatMode', '0', '0', '', 'False'); push('clearMessages', 'false');
    push('addThem', 't1', 'addrPeer', 'Bob', '', 'hello', String(T0));
    push('messagesDone'); push('onChatScreenLoaded');
    await sleep(150);
    const r = { painted: painted === 1, silent: !warns.some((w) => /\[P1\]/.test(w)) };
    ok(Object.values(r).every(Boolean), '★ #1201 probe (the [P1] retire set): without data-p1 the open hold writes no line and `painted` still goes once — ' + JSON.stringify(r));
    dom.window.close();
  });
}
