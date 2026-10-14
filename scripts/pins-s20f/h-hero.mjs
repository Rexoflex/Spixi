/* ==== S20F W-10 (#1409) — the wallet hero collapse lays out ONCE ====
 * (1) On the BUILT index.html (jsdom CSSOM): every rule that targets the hero or its children (incl. ::before) declares
 *     a transition with NO layout property (height / max-height / min-height / padding* / margin* / top / bottom /
 *     inset* / width) — and the motion rules exist (the hero layer, the body), so a deleted rule cannot pass vacuously.
 *     The wallet rows compute `contain: content`; a row's photo decodes async.
 * (2) attachWalletScroll on a stubbed-layout fixture (the smoke oscillator fixture: hero 260 → 64, S 660, V 600; a
 *     ResizeObserver stub that fires only when told; `animate` stubbed on the band): one collapse = ONE data-compact
 *     write outside the probe, the deficit reserve (156 px) is ALREADY in place when the scroll event returns (same task
 *     as the flip — no later write), the hero RO's echo leaves it, and the band (the scroller) slides from +196 to 0.
 *     An expand holds the compact layout ([data-held]) while the band slides to +196 and lands it on the slide's end; a
 *     down-gesture INSIDE the hold does not collapse (#46 r1 survivor #8), the next one after the landing does.
 * (3) #46 r1 survivor #7: the one-layout flip itself — on the built index the hero body computes position: absolute under
 *     [data-compact] and under [data-held], static at rest. Survivor #9: the wallet list's own layer is phone-only
 *     (will-change: transform on a phone boot, not on a desktop boot).
 * DELIBERATE BREAKS (each run once, failed for exactly that reason, restored — see the S20F home report):
 *   ① wallet-hero.css: `.c-wallet-hero__main { transition: … }` + `max-height var(--duration-300) …` → (1) fails.
 *   ② wallet-shell.js: collapse back to `applyReserve(heroRO ? trackedReserve() : reserveTarget);` → (2) reserve fails (0px at the flip).
 *   ③ wallet-shell.js: drop the collapse `slide(…)` line → (2) band fails (no compensation).
 *   ④ wallet-hero.css: the `[data-compact] / [data-held] .c-wallet-hero__main { position: absolute; … }` rule deleted → oneLayout fails.
 *   ⑤ wallet-shell.js: collapse()'s `if (hero && 'held' in hero.dataset) return;` deleted → heldGuard fails.
 *   ⑥ wallet-shell.css: `:root:not([data-desktop]) .c-wallet-txlist` → `.c-wallet-txlist` → phoneLayer fails. */
import { aKit } from '../pins-s11/a-kit.mjs';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const LAYOUT = /(^|[\s,])(max-|min-)?(height|width)\b|(^|[\s,])(padding|margin|inset)(-[a-z-]+)?\b|(^|[\s,])(top|bottom|left|right)\b|(^|[\s,])all\b/;
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  const r = {}, n = {};
  let s = null;
  try {
    s = await K.boot('index.html');
    const { W, d } = s;
    /* (1) the transition lists */
    const hits = [];
    const walk = (list) => { for (const ru of list) { if (ru.cssRules && !ru.selectorText) { walk(ru.cssRules); continue; } if (!ru.selectorText || !/c-wallet-hero/.test(ru.selectorText)) continue; const t = [ru.style.getPropertyValue('transition'), ru.style.getPropertyValue('transition-property')].filter(Boolean).join(' | '); if (t) hits.push([ru.selectorText, t]); } };
    for (const sh of d.styleSheets) { try { walk(sh.cssRules); } catch (e) {} }
    n.rules = hits.length;
    n.bad = hits.filter(([, t]) => t.split(/,(?![^(]*\))/).some((part) => LAYOUT.test(part.trim().split(/\s+/)[0] || '')));
    r.noLayoutTransition = hits.length >= 4 && n.bad.length === 0
      && hits.some(([sel, t]) => /::before/.test(sel) && /transform/.test(t)) && hits.some(([sel, t]) => /__main/.test(sel) && /transform/.test(t) && /opacity/.test(t));
    /* (3) the one-layout flip: the body leaves the flow under compact / held */
    const realHero = d.querySelector('#wallet-hero .c-wallet-hero');
    const mainEl = realHero && realHero.querySelector('.c-wallet-hero__main');
    const pos = () => W.getComputedStyle(mainEl).position || 'static';
    n.posRest = mainEl && pos();
    realHero.dataset.compact = ''; n.posCompact = pos(); delete realHero.dataset.compact;
    realHero.dataset.held = ''; n.posHeld = pos(); delete realHero.dataset.held;
    r.oneLayout = !!mainEl && n.posRest === 'static' && n.posCompact === 'absolute' && n.posHeld === 'absolute';
    const wl = d.querySelector('#wallet-scroll .c-wallet-txlist');
    n.wcPhone = wl && W.getComputedStyle(wl).willChange;
    /* rows: contain + the photo decode */
    const list = W.Spixi.createWalletTxList({ txs: [{ txid: 'a', name: 'Ana', avatar: PNG, address: 'addrA', contact: true, direction: 'in', status: 'confirmed', amount: '1', timestamp: Math.floor(Date.now() / 1000) }], filter: 'all', query: '' }, {});
    d.body.append(list);
    const row = list.querySelector('.c-txlist-item');
    const img = row && row.querySelector('img');
    n.contain = row && W.getComputedStyle(row).contain;
    r.rows = !!row && n.contain === 'content' && !!img && img.decoding === 'async';
    list.remove();
    /* (2) the fixture */
    const ros = [];
    W.ResizeObserver = class { constructor(cb) { this.cb = cb; this.t = []; ros.push(this); } observe(x) { this.t.push(x); } disconnect() {} fire() { this.cb([], this); } };
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
    scrollEl.animate = (kf, o) => { const a = { kf, o, cancelled: false, cancel() { this.cancelled = true; }, onfinish: null }; anims.push(a); return a; };
    const flips = [];
    let probing = false;   // replayed IN ORDER from the records (delivery is async — the live dataset is too late)
    new W.MutationObserver((ms) => { for (const m of ms) {
      if (m.attributeName === 'data-measuring') probing = m.oldValue === null;
      else if (!probing) flips.push(m.oldValue === null);   // null → the attribute was ADDED (compact)
    } }).observe(heroEl, { attributes: true, attributeOldValue: true, attributeFilter: ['data-compact', 'data-measuring'] });
    const detach = W.Spixi.attachWalletScroll(scrollEl, { hero: heroEl });
    const reserve = scrollEl.querySelector('.c-wallet-reserve');
    const heroRO = ros.find((x) => x.t.includes(heroEl));
    const scroll = (top, ns, nv) => { TOP = top; if (ns !== undefined) S = ns; if (nv !== undefined) V = nv; scrollEl.dispatchEvent(new W.Event('scroll')); };
    scroll(20);
    n.atFlip = reserve.style.height;
    await sleep(0);
    n.flips = flips.slice();
    heroRO.fire();
    n.afterRO = reserve.style.height;
    r.reserve = 'compact' in heroEl.dataset && n.atFlip === '156px' && n.afterRO === '156px';
    r.oneFlip = n.flips.length === 1 && n.flips[0] === true;
    const ty = (a, i) => String(a.kf[i].transform);
    n.slide = anims.map((a) => ty(a, 0) + '→' + ty(a, 1) + ' fill=' + (a.o.fill || ''));
    r.band = anims.length === 1 && ty(anims[0], 0) === 'translateY(196px)' && ty(anims[0], 1) === 'translateY(0px)' && anims[0].o.fill === 'none' && anims[0].o.duration > 0;
    /* expand: real upward arrival at the top (stable geometry) */
    scroll(20, 816, 796);
    scroll(0);
    n.held = 'held' in heroEl.dataset;
    const ex = anims[anims.length - 1];
    n.expandSlide = ex && (ty(ex, 0) + '→' + ty(ex, 1) + ' fill=' + ex.o.fill);
    const heldOk = !('compact' in heroEl.dataset) && n.held && ex && ty(ex, 1) === 'translateY(196px)' && ex.o.fill === 'forwards';
    scroll(5); scroll(20);                        // a 20 px down-gesture inside the hold
    n.inHold = { compact: 'compact' in heroEl.dataset, held: 'held' in heroEl.dataset };
    if (ex && ex.onfinish) ex.onfinish();
    n.landed = !('held' in heroEl.dataset) && ex && ex.cancelled;
    r.expandHold = !!heldOk && !!n.landed && reserve.style.height === '0px';
    scroll(36);                                   // after the landing the gesture (now 36 px) collapses
    n.afterHold = 'compact' in heroEl.dataset;
    r.heldGuard = !n.inHold.compact && n.inHold.held && n.afterHold;
    detach(); wrap.remove();
    r.noErr = K.noErr(s.errs);
    s.close(); s = null;
    s = await K.boot('index.html', { desktop: true });
    s.push('selectTab', 'tab2'); await sleep(60);
    const wlD = s.d.querySelector('#wallet-scroll .c-wallet-txlist');
    n.wcDesk = wlD && (s.W.getComputedStyle(wlD).willChange || 'auto');
    r.phoneLayer = n.wcPhone === 'transform' && n.wcDesk === 'auto';
  } catch (e) { r.threw = e.message + ' ' + (e.stack || '').split('\n')[1]; } finally { if (s) s.close(); }
  const c = (k, m) => ok(r[k] === true, '★ S20F W-10 (#1409): ' + m + ' — ' + JSON.stringify({ [k]: r[k], threw: r.threw, n }).slice(0, 1100));
  c('noLayoutTransition', 'no transition of the hero or its children (::before included) names a layout property — the collapse moves by transform + opacity only');
  c('rows', 'a wallet row computes contain: content and its photo decodes async');
  c('reserve', 'the deficit reserve (156 px) is in place when the collapsing scroll event returns — the SAME task as the one hero flip; the hero RO only echoes it');
  c('oneFlip', 'one collapse writes data-compact ONCE outside the measurement probe (the hero height changes once)');
  c('band', 'the band (the scroller) slides from +delta (196) to 0 — the flip\'s jump is compensated, no row jumps');
  c('expandHold', 'an expand HOLDS the compact layout while the band slides to +196 (fill forwards) and lands the height on the slide\'s end (reserve released)');
  c('heldGuard', '#8: a down-gesture inside the expand hold does not collapse; the next one after the landing does');
  c('oneLayout', '#7: the hero body computes position: absolute under [data-compact] and [data-held], static at rest — the height changes in one step');
  c('phoneLayer', '#9: the wallet list\'s own layer is phone-only (will-change transform on a phone boot, auto on desktop)');
  c('noErr', 'no page error');
}
