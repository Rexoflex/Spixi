/* ==== S20G R-4 — the wallet hero collapse runs 380 ms, from ONE token (wallet-hero.css :root --wallet-hero-ms) ====
 * (1) On the BUILT index.html (jsdom CSSOM): `:root { --wallet-hero-ms: 380ms }` and, inside a prefers-reduced-motion:
 *     reduce block, `--wallet-hero-ms: 0ms`; every hero rule whose transition moves `transform` times it with
 *     var(--wallet-hero-ms), and no hero rule names --duration-300 any more (≥ 4 such rules, so a deleted rule cannot
 *     pass vacuously). The root computes 380ms.
 * (2) attachWalletScroll on the stubbed-layout fixture (h-hero.mjs, S20F): the band's WAAPI slide lasts exactly the
 *     token (380 at rest; 520 with the token overridden on <html> — proves the JS READS the token, not a literal), and
 *     with the token at 0ms (reduced motion) no animation runs (instant, the same end state).
 * (3) The flip window = token + 100: right after a collapse a no-range re-render (the valve) re-checks itself after
 *     window − elapsed + 16 ms, window = 620 with the token at 520 and 480 at rest (was a fixed 400).
 * (4) #46 r1 NIT: the fades end with the slide — `--wallet-hero-fade-ms: 280ms` on :root (0ms under reduce), fade + 100 =
 *     the slide token; every hero `__main` opacity fade = var(--wallet-hero-fade-ms) (≥ 2 rules) and the collapsed ::before
 *     opacity = var(--duration-100) delayed var(--wallet-hero-fade-ms) (it starts when the body is gone, ends at 380).
 * DELIBERATE BREAKS (S20G home report): ① wallet-hero.css `.c-wallet-hero__main` transition back to
 *   `transform var(--duration-300)` → (1) fails. ② wallet-shell.js slide(): `const ms = heroMs();` →
 *   `parseFloat(tok('--duration-300', '300ms'))` → (2) fails (300 / 300 / 0). ③ wallet-shell.js releaseIfMoot():
 *   `flipWindow()` → `400` → (3) fails (≈ 416). ④ (#46 r1) the ::before delay back to var(--duration-200) → (4) fails. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  const r = {}, n = {};
  let s = null;
  try {
    s = await K.boot('index.html');
    const { W, d } = s;
    /* (1) the CSSOM */
    const heroRules = [];
    let rootMs = null, reduceMs = null, rootFade = null, reduceFade = null;
    const walk = (list, inReduce) => {
      for (const ru of list) {
        if (ru.cssRules && !ru.selectorText) {
          const media = ru.media ? String(ru.media.mediaText || '') : '';
          walk(ru.cssRules, inReduce || /prefers-reduced-motion:\s*reduce/.test(media));
          continue;
        }
        if (!ru.selectorText) continue;
        if (/^:root$/.test(ru.selectorText.trim())) {
          const v = ru.style.getPropertyValue('--wallet-hero-ms').trim();
          if (v) { if (inReduce) reduceMs = v; else rootMs = v; }
          const f = ru.style.getPropertyValue('--wallet-hero-fade-ms').trim();
          if (f) { if (inReduce) reduceFade = f; else rootFade = f; }
        }
        if (/c-wallet-hero/.test(ru.selectorText)) {
          const t = ru.style.getPropertyValue('transition');
          if (t) heroRules.push([ru.selectorText, t]);
        }
      }
    };
    for (const sh of d.styleSheets) { try { walk(sh.cssRules, false); } catch (e) {} }
    const moving = heroRules.filter(([, t]) => /(^|,)\s*transform\s/.test(t));
    n.moving = moving.length;
    n.old = heroRules.filter(([, t]) => /--duration-300/.test(t)).map(([sel]) => sel);
    n.untokened = moving.filter(([, t]) => !/(^|,)\s*transform\s+var\(--wallet-hero-ms\)/.test(t)).map(([sel]) => sel);
    n.rootMs = rootMs; n.reduceMs = reduceMs;
    n.computed = W.getComputedStyle(d.documentElement).getPropertyValue('--wallet-hero-ms').trim();
    r.css = rootMs === '380ms' && reduceMs === '0ms' && n.computed === '380ms' && moving.length >= 4
      && n.old.length === 0 && n.untokened.length === 0;
    /* (4) the fades */
    const mainFades = heroRules.filter(([sel]) => /__main/.test(sel)).map(([, t]) => t);
    const beforeFade = heroRules.filter(([sel]) => /\[data-compact\]::before/.test(sel) && !/\[data-held\]/.test(sel)).map(([, t]) => t);
    n.fade = { rootFade, reduceFade, mainFades: mainFades.length, beforeFade };
    r.fade = rootFade === '280ms' && reduceFade === '0ms' && parseFloat(rootFade) + 100 === parseFloat(rootMs)
      && mainFades.length >= 2 && mainFades.every((t) => /(^|,)\s*opacity var\(--wallet-hero-fade-ms\) var\(--easing-standard\)/.test(t))
      && beforeFade.length === 1 && /(^|,)\s*opacity var\(--duration-100\) var\(--easing-standard\) var\(--wallet-hero-fade-ms\)\s*$/.test(beforeFade[0])
      && !heroRules.some(([sel, t]) => /opacity var\(--duration-200\)/.test(t) && !/compactbal/.test(sel));
    /* (2) + (3) the fixture */
    W.ResizeObserver = class { constructor(cb) { this.cb = cb; } observe() {} disconnect() {} };
    const timers = [];
    const realST = W.setTimeout.bind(W);
    W.setTimeout = (fn, ms, ...a) => { timers.push(ms); return realST(fn, ms, ...a); };
    const run = (token) => {
      if (token == null) d.documentElement.style.removeProperty('--wallet-hero-ms');
      else d.documentElement.style.setProperty('--wallet-hero-ms', token);
      const wrap = d.createElement('div');
      const heroEl = d.createElement('div'); heroEl.className = 'c-wallet-hero';
      const scrollEl = d.createElement('div');
      scrollEl.append(d.createElement('div'));
      wrap.append(heroEl, scrollEl); d.body.append(wrap);
      let S = 660, V = 600, TOP = 0;
      Object.defineProperty(scrollEl, 'scrollHeight', { get: () => S, configurable: true });
      Object.defineProperty(scrollEl, 'clientHeight', { get: () => V, configurable: true });
      Object.defineProperty(scrollEl, 'scrollTop', { get: () => TOP, set: (v) => { TOP = v; }, configurable: true });
      Object.defineProperty(heroEl, 'offsetHeight', { get: () => ('compact' in heroEl.dataset ? 64 : 260), configurable: true });
      const anims = [];
      scrollEl.animate = (kf, o) => { const a = { kf, o, cancel() {}, onfinish: null }; anims.push(a); return a; };
      const detach = W.Spixi.attachWalletScroll(scrollEl, { hero: heroEl });
      const scroll = (top, ns, nv) => { TOP = top; if (ns !== undefined) S = ns; if (nv !== undefined) V = nv; scrollEl.dispatchEvent(new W.Event('scroll')); };
      const t0 = W.performance.now();
      scroll(20);                                  // collapse
      const compact = 'compact' in heroEl.dataset;
      timers.length = 0;
      scroll(0, 600, 600);                         // a re-render leaves NO range, inside the flip window → the valve waits
      const valveWait = timers.length ? timers[timers.length - 1] : null;
      const spent = W.performance.now() - t0;      // ≥ the real flip → valve time, so wait + spent ≥ window + 16
      detach(); wrap.remove();
      return { compact, durations: anims.map((a) => a.o.duration), valveWait, spent: Math.round(spent) };
    };
    n.rest = run(null);
    n.over = run('520ms');
    n.zero = run('0ms');
    d.documentElement.style.removeProperty('--wallet-hero-ms');
    W.setTimeout = realST;
    r.duration = n.rest.compact && n.rest.durations.length === 1 && n.rest.durations[0] === 380
      && n.over.compact && n.over.durations.length === 1 && n.over.durations[0] === 520
      && n.zero.compact && n.zero.durations.length === 0;
    /* wait = window − elapsed + 16, and `spent` brackets the elapsed time from outside: wait ≤ window + 16 ≤ wait + spent */
    const inWindow = (x, win) => typeof x.valveWait === 'number' && x.valveWait <= win + 16 + 0.5 && x.valveWait + x.spent >= win + 16 - 0.5;
    r.window = inWindow(n.over, 620) && inWindow(n.rest, 480);
    await sleep(0);
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.threw = e.message + ' ' + (e.stack || '').split('\n')[1]; } finally { if (s) s.close(); }
  const c = (k, m) => ok(r[k] === true, '★ S20G R-4: ' + m + ' — ' + JSON.stringify({ [k]: r[k], threw: r.threw, n }).slice(0, 900));
  c('css', 'the built index declares --wallet-hero-ms 380ms on :root (0ms under reduced motion) and every moving hero transition uses it — no --duration-300 left in a hero rule');
  c('duration', 'the band slide lasts exactly the token (380 at rest, 520 when overridden) and does not run at 0ms (reduced motion)');
  c('window', 'the flip guard window is the token + 100 ms (the valve re-check = window − elapsed + 16: 620 at 520, 480 at rest; was a fixed 400)');
  c('fade', '(#46 r1) the hero fades end with the 380 ms slide — --wallet-hero-fade-ms 280ms (0 under reduced motion), the body fades over it and the collapsed ::before fades 100 ms after it (280 + 100 = 380)');
  c('noErr', 'no page error');
}
