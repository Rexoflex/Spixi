/* ==== SESSION 4 fix batch — #46 r4 fixes (the #1151 A-FADE reveal + the ink-750 reply quote) ====
 * Behaviour first: the BUILT chat shell is booted in jsdom and driven through its real entry points (executeUiCommand),
 * with a DETERMINISTIC frame queue (requestAnimationFrame is replaced by a list this file flushes one frame at a time:
 * the callbacks queued before a flush run in that frame, the ones they queue run in the next — the browser's rule).
 *  M1  a picture counts as "shown" only once it was really on screen — at its fade's END (transitionend), or one frame
 *      after the flip when there is no fade: a re-render queued in the reveal's own frame (or mid-fade) re-builds the tile
 *      NOT seen (it fades from 0) — recorded in the reveal frame it popped (7–9/10 runs in Chromium).
 *  m3  a tile re-built away before its reveal records nothing (el.isConnected).
 *  m4  setMediaSrc(B) while A's reveal is pending: A's reveal is dropped, B flips only after ITS load + decode.
 *  m5  a tapped GIF (auto-load off) is remembered when it LOADS — a re-render before its reveal keeps it loading.
 *  m2  the dark reply quote reads as a surface on the ink-750 bubble again (computed ≈ 1.20:1), its inks ≥ 4.5:1.
 * Every pin was broken on purpose before it was believed (the breaks are in the fixer's report). */
export default async function (h) {
  const { ok, readFileSync, join, root, JSDOM, VirtualConsole, sleep } = h;
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const T0 = Math.floor(Date.now() / 1000) - 600;
  const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  const JPEG_B = JPEG.slice(0, -1) + 'AAAA=';
  const micro = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
  const boot = async (ls = null) => {
    const f = join(root, 'Spixi/Resources/Raw/html', 'chat.html');
    const errs = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.Element.prototype.scrollIntoView = function () {};
        if (ls) {   // file:// is an opaque origin in jsdom (localStorage throws → the shell's default): a store the pin owns
          const store = new Map(Object.entries(ls));
          Object.defineProperty(w, 'localStorage', { configurable: true, value: {
            get length() { return store.size; }, key: (n) => [...store.keys()][n] ?? null,
            getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); },
          } });
        }
      },
    });
    await sleep(1800);
    const W = dom.window;
    let q = [];
    W.requestAnimationFrame = (fn) => { q.push(fn); return q.length; };
    W.cancelAnimationFrame = () => {};
    const frame = () => { const due = q; q = []; for (const fn of due) { try { fn(W.performance.now()); } catch (e) { errs.push('raf: ' + e.message); } } };
    const frames = (n) => { for (let i = 0; i < n; i++) frame(); };
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map(b64));
    const tileOf = (id) => W.document.querySelector('#messages [data-msgid="' + id + '"] .c-mbubble');
    const loadOf = (t) => t.querySelector('.c-mbubble__img').dispatchEvent(new W.Event('load'));
    const chat = () => {
      push('onChatScreenReady', 'addrPeer');
      push('setChatMode', '0', '0', '', 'False');
      push('setPhotoPreviews', 'True');
      push('clearMessages', 'false');
    };
    const done = () => { if (typeof W.messagesDone === 'function') push('messagesDone'); push('onChatScreenLoaded'); frames(4); };
    return { W, dom, push, errs, frame, frames, tileOf, loadOf, chat, done };
  };
  const st = (t) => t ? t.dataset.state + (t.hasAttribute('data-seen') ? '+seen' : '') : 'none';

  console.log('★ Session 4 fix batch — #46 r4 (A-FADE "shown" timing · ink-750 reply quote)');

  /* —— M1: a re-render queued in the reveal's own frame —— */
  {
    const S = await boot();
    S.chat();
    S.push('addFile', 'q1', 'addrPeer', 'Me', '', 'fq1', 'IMG_q1.jpg', String(T0), 'True', 'True', 'True', '100', 'True', 'False', 'True');
    S.done();
    S.push('setFileThumb', 'q1', JPEG);
    const t1 = S.tileOf('q1');
    const r = { t1: st(t1) === 'loading' };
    S.loadOf(t1); await micro();                                      // load + decode, no frame yet: the reveal is queued
    S.push('addThem', 'z1', 'addrPeer', 'Bob', '', 'late line', String(T0 + 50));   // its render rAF queues AFTER the reveal
    S.frame();                                                        // ONE frame: the reveal flips t1, then the render re-builds
    const t2 = S.tileOf('q1');
    r.rebuilt = !!t2 && t2 !== t1;
    r.rebuiltFades = st(t2) === 'loading';                            // not "seen": it starts from opacity 0
    S.frame();                                                        // the detached t1's "shown" frame: records nothing
    S.loadOf(t2); await micro(); S.frame();
    r.t2Loaded = st(t2) === 'loaded';
    S.frame();                                                        // t2 painted loaded → now it is "shown"
    S.push('addThem', 'z2', 'addrPeer', 'Bob', '', 'another', String(T0 + 60)); S.frame();
    r.reshowInstant = st(S.tileOf('q1')) === 'loaded+seen' && S.tileOf('q1') !== t2;   // the r3 re-show stays
    r.noErr = S.errs.length === 0;
    ok(Object.values(r).every(Boolean),
      '★★ #46 r4 M1 (A-FADE pop): with no fade (0 ms) a picture is "shown" only one frame AFTER its tile flipped to loaded — a re-render queued in the reveal\'s own frame re-builds the tile in LOADING (it fades from 0, no pop); once the loaded tile has painted, a re-render shows it at once (r3) — ' + JSON.stringify(r) + ' t2=' + st(t2) + (S.errs.length ? ' errs=' + S.errs.slice(0, 2).join(' | ') : ''));
    S.dom.window.close();
  }

  /* —— M1b: with a real fade (Chromium computes the 200 ms transition; jsdom does not — the tile picture's computed
     transitionDuration is given here), "shown" waits for the fade's END: a re-render mid-fade re-builds it fading —— */
  {
    const S = await boot();
    const W = S.W, gcs = W.getComputedStyle.bind(W);
    W.getComputedStyle = (el, ...a) => {
      const cs = gcs(el, ...a);
      if (!(el && el.classList && el.classList.contains('c-mbubble__img'))) return cs;
      return new Proxy(cs, { get: (t, k) => (k === 'transitionDuration' ? '0.2s' : (typeof t[k] === 'function' ? t[k].bind(t) : t[k])) });
    };
    S.chat();
    S.push('addFile', 'q4', 'addrPeer', 'Me', '', 'fq4', 'IMG_q4.jpg', String(T0), 'True', 'True', 'True', '100', 'True', 'False', 'True');
    S.done();
    S.push('setFileThumb', 'q4', JPEG);
    const t1 = S.tileOf('q4');
    S.loadOf(t1); await micro(); S.frame();                           // the flip: t1 loaded, its fade starts
    const r = { t1Loaded: st(t1) === 'loaded' };
    S.frames(3);                                                      // mid-fade (no transitionend yet)
    S.push('addThem', 'x1', 'addrPeer', 'Bob', '', 'mid-fade', String(T0 + 50)); S.frame();
    const t2 = S.tileOf('q4');
    r.midFadeRebuildFades = t2 !== t1 && st(t2) === 'loading';
    S.loadOf(t2); await micro(); S.frames(3);
    const tim = t2.querySelector('.c-mbubble__img');
    const te = (type, prop) => { const e = new W.Event(type); e.propertyName = prop; tim.dispatchEvent(e); };
    te('transitionend', 'visibility');                                // another property's end is not the picture's
    S.push('addThem', 'x2', 'addrPeer', 'Bob', '', 'still fading', String(T0 + 60)); S.frame();
    const t3 = S.tileOf('q4');
    r.otherPropIgnored = st(t3) === 'loading';
    S.loadOf(t3); await micro(); S.frames(2);
    const t3im = t3.querySelector('.c-mbubble__img');
    const e = new W.Event('transitionend'); e.propertyName = 'opacity'; t3im.dispatchEvent(e);   // the fade ended: on screen
    S.push('addThem', 'x3', 'addrPeer', 'Bob', '', 'after the fade', String(T0 + 70)); S.frame();
    r.afterEndInstant = st(S.tileOf('q4')) === 'loaded+seen';
    r.noErr = S.errs.length === 0;
    ok(Object.values(r).every(Boolean),
      '★ #46 r4 M1: with a real fade the picture counts as "shown" only at its opacity transitionend — a re-render mid-fade (frames after the flip, no end yet) re-builds the tile fading from 0; once the fade ENDED, a re-render shows it at once (r3) — ' + JSON.stringify(r));
    S.dom.window.close();
  }

  /* —— m3: two re-renders before a reveal — the detached tile records nothing —— */
  {
    const S = await boot();
    S.chat();
    S.push('addFile', 'q2', 'addrPeer', 'Me', '', 'fq2', 'IMG_q2.jpg', String(T0), 'True', 'True', 'True', '100', 'True', 'False', 'True');
    S.done();
    S.push('setFileThumb', 'q2', JPEG);
    const t1 = S.tileOf('q2');
    S.push('addThem', 'y1', 'addrPeer', 'Bob', '', 'one', String(T0 + 50));   // render 1 queued BEFORE the reveal
    S.loadOf(t1); await micro();                                      // t1's reveal queued after it
    S.frame();                                                        // render 1 re-builds (t1 detached), then t1's reveal runs
    S.frame();                                                        // t1's "shown" frame — t1 is not in the document
    S.push('addThem', 'y2', 'addrPeer', 'Bob', '', 'two', String(T0 + 60)); S.frame();   // render 2
    const t3 = S.tileOf('q2');
    const r = { detached: !t1.isConnected, t3Fades: st(t3) === 'loading', noErr: S.errs.length === 0 };
    ok(Object.values(r).every(Boolean),
      '★ #46 r4 m3: a tile re-built away before its reveal records NO "shown" (it is not in the document when its frame comes) — the next re-build still fades from 0 — ' + JSON.stringify(r) + ' t3=' + st(t3));
    S.dom.window.close();
  }

  /* —— m4: setMediaSrc(B) while A's reveal is pending —— */
  {
    const S = await boot();
    S.chat();
    S.push('addFile', 'q3', 'addrPeer', 'Me', '', 'fq3', 'IMG_q3.jpg', String(T0), 'True', 'True', 'True', '100', 'True', 'False', 'True');
    S.done();
    S.push('setFileThumb', 'q3', JPEG);
    const t = S.tileOf('q3');
    S.loadOf(t); await micro();                                       // A decoded: its reveal is queued
    S.push('setFileThumb', 'q3', JPEG_B);                             // B arrives before that frame
    const r = { sameTile: S.tileOf('q3') === t, srcB: t.querySelector('.c-mbubble__img').getAttribute('src') === JPEG_B };
    S.frame(); S.frame();
    r.aDropped = st(t) === 'loading';                                 // A's reveal must not flip the tile over B undecoded
    S.loadOf(t); await micro(); S.frame();
    r.bFlips = st(t) === 'loaded';
    r.noErr = S.errs.length === 0;
    ok(Object.values(r).every(Boolean),
      '★ #46 r4 m4: a new picture (setMediaSrc B) while A\'s reveal is pending drops A\'s reveal — the tile stays loading until B\'s OWN load + decode, then fades in — ' + JSON.stringify(r));
    S.dom.window.close();
  }

  /* —— m5: a tapped GIF (auto-load off) survives a re-render before its reveal —— */
  {
    const S = await boot({ 'spixi.media.autoload': 'off' });
    S.chat();
    const GIF = 'https://media1.giphy.com/media/xyz/giphy.gif';
    S.push('addThem', 'g1', 'addrPeer', 'Bob', '', GIF, String(T0));
    S.done();
    const g = S.tileOf('g1');
    const r = { idle: st(g) === 'idle' };
    g.click();
    r.tapLoads = st(g) === 'loading';
    S.loadOf(g);                                                      // the GIF arrived; decode + the reveal frame still ahead
    S.push('addThem', 'g2', 'addrPeer', 'Bob', '', 'and a line', String(T0 + 5)); S.frame();
    const g2 = S.tileOf('g1');
    r.rebuilt = !!g2 && g2 !== g;
    r.stillOpen = st(g2) === 'loading';                               // NOT back to "tap to load"
    r.noErr = S.errs.length === 0;
    ok(Object.values(r).every(Boolean),
      '★ #46 r4 m5: with auto-load OFF, a tapped GIF is remembered when it LOADS (not at the reveal, which waits for decode + a frame) — a re-render in that gap re-builds it loading, never back to "tap to load" — ' + JSON.stringify(r) + ' g2=' + st(g2));
    S.dom.window.close();
  }

  /* —— m2: the dark reply quote on the ink-750 bubble —— */
  {
    const S = await boot();
    const W = S.W, d = W.document, el = d.documentElement;
    const norm = (v) => String(v || '').replace(/\s+/g, ' ').trim();
    const resolve = (name, depth = 0) => {
      const v = norm(W.getComputedStyle(el).getPropertyValue(name));
      const m = /^var\((--[\w-]+)(?:, *(.*))?\)$/.exec(v);
      return m && depth < 8 ? (resolve(m[1], depth + 1) || m[2] || '') : v;
    };
    const resolveVal = (v) => { const m = /^var\((--[\w-]+)\)$/.exec(norm(v)); return m ? resolve(m[1]) : norm(v); };
    const hex = (v) => { const m = /^#([0-9a-f]{6})$/i.exec(v || ''); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; };
    const lum = (c) => { const g = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * g(c[0]) + 0.7152 * g(c[1]) + 0.0722 * g(c[2]); };
    const cr = (a, b) => { const [p, q] = [lum(a), lum(b)].sort((u, v) => v - u); return (p + 0.05) / (q + 0.05); };
    const hsl = (h0, s, l) => { s /= 100; l /= 100; const k = (n) => (n + h0 / 30) % 12, a = s * Math.min(l, 1 - l); const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))))); return [f(0), f(8), f(4)]; };
    el.setAttribute('data-theme', 'dark');
    S.chat();
    S.push('addThem', 'p1', 'addrPeer', 'Bob', '', 'the original', String(T0));
    S.push('addThem', 'p2', 'addrPeer', 'Bob', '', 'the reply', String(T0 + 5), 'False', 'True', 'True', 'False', 'False', '', 'p1');
    S.done();
    let quote = d.querySelector('#messages [data-direction="received"] .c-bubble__reply');
    const made = !quote;
    if (!quote) {   // the reply push signature differs on this build: a quote node in a received row is enough for the cascade
      const row = d.querySelector('#messages [data-msgid="p2"]');
      quote = d.createElement('button'); quote.className = 'c-bubble__reply';
      (row.querySelector('.c-bubble') || row).prepend(quote);
    }
    const fill = hex(resolveVal(W.getComputedStyle(quote).getPropertyValue('background')));   // the cascade's winner (specificity, not source order)
    const bubble = hex(resolve('--surface-bubble-received'));
    const textInk = hex(resolve('--text-neutral-02'));
    const r = {}, n = {};
    if (fill && bubble && textInk) {
      n.fill = fill.map((v) => v.toString(16).padStart(2, '0')).join('');
      n.vsBubble = Math.round(cr(fill, bubble) * 1000) / 1000;
      r.surface = n.vsBubble >= 1.19;                                  // the N81 target: reads as a surface on the bubble
      r.notLoud = n.vsBubble < 1.3;                                    // one step, not a jump
      n.text = Math.round(cr(textInk, fill) * 100) / 100;
      r.textAA = n.text >= 4.5;
      /* each identity hue's quote label (dark: s 70 %, its own --reply-label-l) on the quote fill */
      const hues = W.Spixi && W.Spixi.IDENTITY_HUES;
      const low = [];
      if (Array.isArray(hues)) {
        for (let i = 0; i < 12; i++) {
          quote.setAttribute('data-idhue', String(i));
          const l = parseFloat(W.getComputedStyle(quote).getPropertyValue('--reply-label-l'));
          const c = cr(hsl(hues[i], 70, l), fill);
          if (!(c >= 4.5)) low.push(i + ':' + c.toFixed(2));
        }
        r.labelsAA = low.length === 0;
      } else r.hues = false;
      n.low = low;
    } else r.resolved = false;
    r.noErr = S.errs.length === 0;
    ok(Object.values(r).every(Boolean),
      '★ #46 r4 m2: the DARK reply quote reads as a surface on the ink-750 received bubble again — its fill (the winning rule on a live quote, computed) is ≥ 1.19:1 against #1E2023 (was 1.063 on ink-700), one step only, and the quote text + all 12 identity-hue quote labels hold ≥ 4.5:1 on it — ' + JSON.stringify(r) + ' ' + JSON.stringify(n) + (made ? ' (quote node placed)' : ''));
    S.dom.window.close();
  }
}
