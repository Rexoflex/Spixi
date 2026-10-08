/* ══ SESSION 4 — agent CHAT pins (DECISIONS #1132 (4) A2 · #1132 A4 · #1133 (3) A5 / #1124) ══
 * Behaviour first (#771/#798): the BUILT chat and contact-details shells are booted in jsdom and driven through their
 * real C# entry points (executeUiCommand); CSS is read from the document's own CSSOM and matched against the live
 * elements (el.matches), not as source text. The C# guards of the new push are SOURCE pins — SingleChatPage is
 * MAUI-only (Preferences, MainThread, SThumbnail per platform) and cannot run here; each names the rule it guards.
 * Every pin was broken on purpose before it was believed (the breaks are listed in the agent report). */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const T0 = Math.floor(Date.now() / 1000) - 600;
  /* a real 1 × 1 JPEG (base64 alphabet only) — what C#'s SThumbnail would hand over */
  /* a JPEG HEADER run of 300 × 200 (SOI · APP0 · SOF0 · EOI): what jpegSize must read the size from (#46 r1 B-6) */
  const JPEG_300x200 = 'data:image/jpeg;base64,' + Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0xC8, 0x01, 0x2C, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xFF, 0xD9]).toString('base64');
  const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

  const boot = async (file) => {
    const f = join(root, 'Spixi/Resources/Raw/html', file);
    const errs = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.Element.prototype.scrollIntoView = function () {};   // jsdom has no layout: the jump's scroll is a no-op here
      },
    });
    await sleep(1800);
    const W = dom.window;
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map(b64));
    return { dom, W, push, errs };
  };
  /* every style rule of the document (through @media), with the media text it sits under */
  const rulesOf = (W) => {
    const out = [];
    const walk = (list, media) => {
      for (const r of Array.from(list || [])) {
        if (r.type === 1) out.push({ sel: r.selectorText, style: r.style, media });
        else if (r.cssRules) walk(r.cssRules, (r.media && r.media.mediaText) || r.conditionText || media);
      }
    };
    for (const sh of Array.from(W.document.styleSheets)) { try { walk(sh.cssRules, ''); } catch (e) {} }
    return out;
  };
  const matching = (rules, el, prop, mediaRe) => rules.filter((r) => {
    if (mediaRe ? !mediaRe.test(r.media || '') : !!r.media) return false;
    let m = false;
    try { m = el.matches(r.sel); } catch (e) { m = false; }
    return m && !!r.style.getPropertyValue(prop);
  }).map((r) => r.style.getPropertyValue(prop).trim());
  const RM = /prefers-reduced-motion:\s*reduce/;

  console.log('★ Session 4 — agent CHAT (A2 pulse · A4 grid · A5 #1124 photo tiles)');

  /* ———————————————————— A2 (#1132 (4)): the jump = a row BAND + a 1 px RING, 2 s (Damir walk: was 3 s), every bubble kind ———————————————————— */
  {
    const { dom, W, push, errs } = await boot('chat.html');
    const d = W.document;
    push('onChatScreenReady', 'addrPeer');
    push('setChatMode', '0', '0', '', 'False');
    push('setPhotoPreviews', 'True');   // the photo row below is a media tile on purpose (A5), whatever the default
    push('clearMessages', 'false');
    push('addThem', 'a1', 'addrPeer', 'Bob', '', 'Here is the report', String(T0));
    push('addFile', 'a2', 'addrPeer', 'Bob', '', 'fa2', 'report.pdf', String(T0 + 10), 'False', 'True', 'True', '100', 'True', 'False', 'True');
    push('addFile', 'a3', 'addrPeer', 'Bob', '', 'fa3', 'IMG_1.jpg', String(T0 + 20), 'False', 'True', 'True', '100', 'True', 'False', 'True');
    push('addPaymentRequest', 'a4', '', 'addrPeer', 'Bob', '', 'Payment request', '5', 'Pending', 'fa-clock', String(T0 + 30), '', 'False', 'False', 'True', 'request', 'pending', '', 'False');
    if (typeof W.messagesDone === 'function') push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(300);
    const rowOf = (id) => d.querySelector('#messages [data-msgid="' + id + '"]');
    /* jsdom has no layout: every row reads as IN VIEW, so the pulse starts on the next frame (as on a device once the scroll lands) */
    W.Element.prototype.getBoundingClientRect = function () { const b = this.id === 'messages' ? 1000 : 10; return { top: 0, bottom: b, left: 0, right: 0, width: 0, height: b, x: 0, y: 0 }; };
    const kinds = { a1: '.c-bubble', a2: '.c-fbubble', a3: '.c-mbubble', a4: '.c-tcard' };
    const ids = Object.keys(kinds);
    const lit = (id) => !!rowOf(id) && rowOf(id).hasAttribute('data-mention-pulse');
    const waitLit = async (id) => { const t = Date.now(); while (Date.now() - t < 2500 && !lit(id)) await sleep(20); return lit(id); };
    const rules = rulesOf(W);
    const r = { band: true, ring: true, oneAtATime: true, rmBand: true, rmRing: true };
    /* every kind, one after the other: the row band + the bubble ring, both on the ONE token; a new jump ends the old */
    let prev = null;
    for (const id of ids) {
      push('jumpToMessage', id);
      const on = await waitLit(id);
      r.band = r.band && on && matching(rules, rowOf(id), 'animation').some((v) => /^chat-jump-band var\(--duration-highlight\) var\(--easing-standard\) var\(--jump-delay, 0ms\) 1$/.test(v));
      const bub = rowOf(id).querySelector(kinds[id]);
      r.ring = r.ring && !!bub && matching(rules, bub, 'animation').some((v) => /^chat-jump-ring var\(--duration-highlight\) var\(--easing-standard\) var\(--jump-delay, 0ms\) 1$/.test(v));
      /* reduced motion: NO animation, the static band (and ring) */
      r.rmBand = r.rmBand && matching(rules, rowOf(id), 'animation', RM).includes('none') && matching(rules, rowOf(id), 'background-color', RM).includes('var(--surface-select-row)');
      r.rmRing = r.rmRing && !!bub && matching(rules, bub, 'animation', RM).includes('none') && matching(rules, bub, 'box-shadow', RM).includes('0 0 0 1px var(--surface-select-row-gap), 0 0 0 2px var(--outline-action-default), var(--jump-keep, 0 0 0 0 transparent)');   /* #46 r1 B-m1: gap + ring (the WINNING value is pinned in fixr1.mjs) */
      if (prev) r.oneAtATime = r.oneAtATime && !lit(prev);
      prev = id;
    }
    /* L-1: the length is ONE token in the document's :root (2000 ms — Damir walk, was 3000), and it is NOT zeroed under reduced motion */
    const rootVal = (mediaRe) => rules.filter((x) => x.sel === ':root' && (mediaRe ? mediaRe.test(x.media || '') : !x.media)).map((x) => x.style.getPropertyValue('--duration-highlight').trim()).filter(Boolean);
    r.token = rootVal().pop() === '2000ms' && rootVal(RM).length === 0;
    /* the keyframes: the band is the warning WASH, the ring 1 px of the SOLID warning role, held to 70 % —
       L-2 re-base (Damir walk: "the fade out is almost instant"): the exit fade = the last 30 % of 2000 ms = 600 ms,
       LINEAR since the Damir pick (2026-10-03; the 70 % stop's own timing function), the same hold on both */
    const kf = (name) => { for (const sh of Array.from(d.styleSheets)) for (const x of Array.from(sh.cssRules || [])) if (x.name === name) return x; return null; };
    const kb = kf('chat-jump-band'), kr = kf('chat-jump-ring');
    const kfText = (k) => (k ? Array.from(k.cssRules).map((x) => x.keyText + '{' + x.style.cssText + '}').join(' ') : '');
    const holdOf = (t) => { const m = /^0%, ?(\d+)%\{/.exec(t); return m ? Number(m[1]) : -1; };
    const bandT = kfText(kb).replace(/\s+/g, ' ').replace(/\{ /g, '{').replace(/ \}/g, '}');
    const ringT = kfText(kr).replace(/\{ /g, '{').replace(/ \}/g, '}');
    r.bandWash = /^0%, ?70%\{background-color: var\(--surface-select-row\); animation-timing-function: linear;?\}/.test(bandT);   /* #1147 (1): the selected-row look */
    r.ring1px = /^0%, ?70%\{box-shadow: 0 0 0 1px var\(--surface-select-row-gap\), 0 0 0 2px var\(--outline-action-default\), var\(--jump-keep, 0 0 0 0 transparent\); animation-timing-function: linear;?\}/.test(ringT);   /* #1147 (1): blue — #46 r1 B-m1: behind a 1 px band-coloured gap */
    r.exitFade600 = holdOf(bandT) >= 0 && Math.round((100 - holdOf(bandT)) / 100 * 2000) === 600 && holdOf(ringT) === holdOf(bandT);
    /* timing (a4 is lit): still lit past the OLD 1.6 s lifetime; a bubbling tick-fade animationend does not end it; the band's own end does */
    const fire = (el, name) => { const e = new W.Event('animationend', { bubbles: true }); Object.defineProperty(e, 'animationName', { value: name }); el.dispatchEvent(e); };
    push('jumpToMessage', 'a1'); await waitLit('a1');
    const tA = Date.now();
    await sleep(1700);
    r.heldPast16 = lit('a1');
    fire(rowOf('a1').querySelector('.c-bubble'), 'c-tick-in');
    r.childEndIgnored = lit('a1');
    fire(rowOf('a1'), 'chat-jump-band');
    r.bandEndClears = !lit('a1');
    /* B-3: a RE-RENDER mid-highlight keeps it — the rebuilt row gets it back, CONTINUED (a negative delay = the time
       already shown), and it still ends on the ORIGINAL schedule */
    push('jumpToMessage', 'a2'); await waitLit('a2');
    const tB = Date.now();
    const nodeB = rowOf('a2');
    await sleep(1000);
    push('addThem', 'a5', 'addrPeer', 'Bob', '', 'a later line', String(T0 + 40));   // a live row → renderLog rebuilds every row
    await sleep(120);
    const delayB = Number(String(rowOf('a2').style.getPropertyValue('--jump-delay')).replace('ms', ''));
    r.rerenderKeeps = rowOf('a2') !== nodeB && lit('a2') && delayB <= -(Date.now() - tB) + 300 && delayB >= -(Date.now() - tB) - 50;
    while (Date.now() - tB < 1900) await sleep(20);
    r.rerenderStillLit = lit('a2');
    while (Date.now() - tB < 2400) await sleep(20);
    r.rerenderEndsOnTime = !lit('a2');
    /* N-4: a SECOND jump to the same row restarts its 2 s (delay back to 0) — the first jump's timer does not end it */
    push('jumpToMessage', 'a3'); await waitLit('a3');
    const tC = Date.now();
    await sleep(1000);
    push('jumpToMessage', 'a3');
    await sleep(80);
    r.secondRestarts = lit('a3') && rowOf('a3').style.getPropertyValue('--jump-delay') === '0ms';
    while (Date.now() - tC < 2400) await sleep(20);
    r.secondHolds = lit('a3');                       // past the FIRST jump's 2.1 s end
    while (Date.now() - tC < 3400) await sleep(20);
    r.secondEnds = !lit('a3');
    /* L-1: the JS timer reads the token — a 600 ms token ends the highlight (reduced-motion path: the timer is the only end) by ~0.7 s */
    d.documentElement.style.setProperty('--duration-highlight', '600ms');
    push('jumpToMessage', 'a4'); await waitLit('a4');
    const tD = Date.now();
    await sleep(400);
    r.tokenTimerHolds = lit('a4');
    while (Date.now() - tD < 1100) await sleep(20);
    r.tokenTimerEnds = !lit('a4');
    void tA;
    r.noErr = errs.length === 0;
    /* #1147 (1): the band is ROUNDED like the selected row (--radius-12, chat-select.css) — on a lit row only, not on a quiet one */
    {
      const row = rowOf('a1');
      const quiet = matching(rules, row, 'border-radius');
      row.setAttribute('data-mention-pulse', '');
      const litR = matching(rules, row, 'border-radius');
      row.removeAttribute('data-mention-pulse');
      ok(litR.includes('var(--radius-12)') && !quiet.includes('var(--radius-12)'),
        '★ #1147 (1) A2 restyle: the jump band is rounded like the multi-select selected row (border-radius --radius-12 on the lit row; a quiet row stays square) — Damir W-A2: "rounded like selected" — ' + JSON.stringify({ quiet, litR }));
    }
    ok(Object.values(r).every(Boolean),
      '★ A2 (#1132 (4), G-4 option 3 + 1 px; #46 r1 B-3 · L-1 · L-2; #1147 (1) restyle): a jump lights the ROW (a full-width band, the selected-row tint --surface-select-row) and rings the BUBBLE (1 px, the blue --outline-action-default) on every kind — text · file card · media tile · typed card — ONE highlight at a time; its length is the --duration-highlight token (2000 ms, not zeroed under reduced motion) that the JS timer reads too; held to 70 % so the exit fade = 600 ms, linear (Damir walk; Damir pick 2026-10-03); reduced motion = the static band + ring; a child\'s animationend does not end it, the band\'s own end does; a re-render mid-way CONTINUES it on the rebuilt row (negative --jump-delay) and it ends on its original schedule; a second jump restarts it — ' + JSON.stringify(r) + (errs.length ? ' errs=' + errs.slice(0, 2).join(' | ') : ''));
    dom.window.close();
  }

  /* ———— A2 TIMING (Damir walk: "reduce the highlight to 2 seconds, then fade out smoothly — the fade is almost instant") ————
     BEHAVIOUR on the built chat shell: the lit row's OWN matched animation (name · duration · easing, every var() resolved
     against the shipped :root tokens) is played through its CSSOM keyframes (each stop's own timing function, a cubic-bezier
     solved here) — jsdom has no animation engine, so the model plays what Chromium plays (verified once in Chromium: same
     curve) — and the REAL JS end-timer runs. Band fully on at 1.3 s, already fading at 1.5 s, still visible at 1.7 s
     (gradual, not a snap), gone at 2 s; the attribute is off by 2.15 s. */
  {
    const { dom, W, push, errs } = await boot('chat.html');
    const d = W.document;
    push('onChatScreenReady', 'addrPeer');
    push('setChatMode', '0', '0', '', 'False');
    push('clearMessages', 'false');
    push('addThem', 't1', 'addrPeer', 'Bob', '', 'Here is the report', String(T0));
    if (typeof W.messagesDone === 'function') push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(300);
    W.Element.prototype.getBoundingClientRect = function () { const b = this.id === 'messages' ? 1000 : 10; return { top: 0, bottom: b, left: 0, right: 0, width: 0, height: b, x: 0, y: 0 }; };
    const row = () => d.querySelector('#messages [data-msgid="t1"]');
    const lit = () => !!row() && row().hasAttribute('data-mention-pulse');
    const rules = rulesOf(W);
    const tok = {};
    for (const x of rules) if (x.sel === ':root' && !x.media) for (let i = 0; i < x.style.length; i++) { const n = x.style[i]; if (n.startsWith('--')) tok[n] = x.style.getPropertyValue(n).trim(); }
    const res = (v) => { let s = String(v || '').trim(); for (let k = 0; k < 6 && /var\(/.test(s); k++) s = s.replace(/var\((--[\w-]+)(?:,\s*([^()]*))?\)/g, (_, n, fb) => (tok[n] != null ? tok[n] : (fb || ''))); return s.trim(); };
    const ms = (v) => { const m = /^(-?\d+(?:\.\d+)?)(ms|s)$/.exec(res(v)); return m ? Number(m[1]) * (m[2] === 's' ? 1000 : 1) : NaN; };
    const bez = (tf) => {
      if (res(tf) === 'linear') return (x) => x;
      tf = ({ ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)', 'ease-in': 'cubic-bezier(0.42, 0, 1, 1)', 'ease-out': 'cubic-bezier(0, 0, 0.58, 1)', 'ease-in-out': 'cubic-bezier(0.42, 0, 0.58, 1)' })[res(tf)] || tf;
      const m = /^cubic-bezier\(\s*([\d.]+),\s*(-?[\d.]+),\s*([\d.]+),\s*(-?[\d.]+)\s*\)$/.exec(res(tf));
      if (!m) return null;
      const [x1, y1, x2, y2] = m.slice(1).map(Number);
      const f = (a, b, t) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
      return (x) => { let lo = 0, hi = 1; for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (f(x1, x2, mid) < x) lo = mid; else hi = mid; } return f(y1, y2, (lo + hi) / 2); };
    };
    push('jumpToMessage', 't1');
    { const t = Date.now(); while (Date.now() - t < 2500 && !lit()) await sleep(10); }
    const tJ = Date.now();
    const r = { lit: lit() };
    /* the band animation the lit row actually matches: chat-jump-band <duration> <easing> <delay> 1 */
    const anim = (matching(rules, row(), 'animation').filter((v) => /^chat-jump-band /.test(v)).pop() || '').split(/ (?![^(]*\))/);
    const dur = ms(anim[1]);
    const kfr = (() => { for (const sh of Array.from(d.styleSheets)) for (const x of Array.from(sh.cssRules || [])) if (x.name === 'chat-jump-band') return x; return null; })();
    const stops = [];
    for (const k of Array.from((kfr && kfr.cssRules) || [])) for (const off of k.keyText.split(',')) stops.push({ o: parseFloat(off) / 100, on: res(k.style.getPropertyValue('background-color')) === res('var(--surface-select-row)'), tf: k.style.getPropertyValue('animation-timing-function') || anim[2] });
    stops.sort((a, b) => a.o - b.o);
    /* band strength at t ms: 1 = the full selected-row tint, 0 = none (after the end: fill none → none) */
    const strength = (t) => {
      const p = t / dur;
      if (!(p >= 0) || p >= 1) return 0;
      for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i], b = stops[i + 1];
        if (p < a.o || p > b.o) continue;
        if (a.on === b.on) return a.on ? 1 : 0;
        const e = bez(a.tf); if (!e) return NaN;
        const y = e((p - a.o) / (b.o - a.o));
        return a.on ? 1 - y : y;
      }
      return NaN;
    };
    const s = { 1300: strength(1300), 1500: strength(1500), 1700: strength(1700), 1900: strength(1900), 2000: strength(2000) };
    r.dur2000 = dur === 2000;
    r.fullAt13 = s[1300] === 1;
    r.fadingAt15 = s[1500] > 0 && s[1500] < 1;
    r.gradualAt17 = s[1700] > 0.05;
    /* Damir pick (2026-10-03): an EVEN fade — the tint left tracks the clock (linear: 0.833 / 0.500 / 0.167 at 1.5 / 1.7 / 1.9 s);
       decelerate (0.425 / 0.110 / 0.010) and ease-out (0.740 / 0.315 / 0.044) spend it in the first half */
    r.evenFade = [[1500, 5 / 6], [1700, 0.5], [1900, 1 / 6]].every(([t, v]) => Math.abs(s[t] - v) < 0.02);
    r.goneAt20 = s[2000] === 0;
    /* the ring keyframes share the band's hold and fade curve (one look, one clock) */
    const kText = (name) => { for (const sh of Array.from(d.styleSheets)) for (const x of Array.from(sh.cssRules || [])) if (x.name === name) return Array.from(x.cssRules).map((k) => k.keyText + '|' + k.style.getPropertyValue('animation-timing-function')).join(' '); return ''; };
    r.ringSameClock = kText('chat-jump-ring') === kText('chat-jump-band') && kText('chat-jump-band') !== '';
    /* the REAL end-timer: still lit at 1.3 s, off by 2.15 s (token + the 100 ms belt) */
    while (Date.now() - tJ < 1300) await sleep(10);
    r.jsLitAt13 = lit();
    while (Date.now() - tJ < 2150) await sleep(10);
    r.jsOffBy215 = !lit();
    r.noErr = errs.length === 0;
    ok(Object.values(r).every(Boolean),
      '★★ A2 TIMING (Damir walk: "reduce the highlight to 2 seconds, and then fade out smoothly — currently the fade out is almost instant"; the built chat shell, the lit row\'s own matched animation played through its CSSOM keyframes): 2 s in all — the band is FULLY on at 1.3 s, already fading at 1.5 s (the hold ends at 70 % = 1.4 s), an EVEN 600 ms linear fade (Damir pick 2026-10-03: 83 / 50 / 17 % of the tint left at 1.5 / 1.7 / 1.9 s, not a snap and not front-loaded), gone at 2 s; the ring keeps the band\'s clock; the JS end-timer (the token + 100 ms) clears the row by 2.15 s — ' + JSON.stringify(r) + ' ' + JSON.stringify(s) + (errs.length ? ' errs=' + errs.slice(0, 2).join(' | ') : ''));
    dom.window.close();
  }

  /* ———————————————————— A4 (#1132, G-6 option 3): the inset gallery ———————————————————— */
  {
    const { dom, W, errs } = await boot('contact_details.html');
    const d = W.document;
    const S = W.Spixi;
    const items = [];
    for (let i = 0; i < 9; i++) items.push({ id: (i + 16).toString(16), n: 0, kind: 'media', label: 'IMG_' + i + '.jpg', size: 10, ts: T0 - i, local: true, thumb: null });
    const body = d.createElement('div'); body.className = 'c-chat-info__body';
    const danger = d.createElement('div'); danger.className = 'c-chat-info__group c-chat-info__danger';
    const sec = S.createSharedSection({ items, strings: {}, onOpen() {}, onAll() {} });
    body.append(danger, sec);
    d.body.append(body);
    const grid = sec.querySelector('.c-shared__grid');
    const tile = sec.querySelector('.c-shared__tile');
    const rules = rulesOf(W);
    const r = {
      shape: !!grid && !!tile && sec.dataset.kind === 'media',
      gap4: !!grid && matching(rules, grid, 'gap').pop() === 'var(--spacing-4)',
      inset: !!grid && matching(rules, grid, 'margin-inline').length === 0,                 // no break-out of the body padding
      noGridClip: !!grid && !matching(rules, grid, 'border-radius').length,              // the grid's top-corner rounding is gone
      tileR8: !!tile && matching(rules, tile, 'border-radius').pop() === 'var(--radius-8)',   // each tile its own r8
      chips12: matching(rules, sec, 'margin-block-start').pop() === 'var(--spacing-12)',    // +12 px from the danger card
      noErr: errs.length === 0,
    };
    ok(Object.values(r).every(Boolean),
      '★ A4 (#1132, G-6 option 3 "inset gallery"): chat info\'s media grid is inset to the card column (no negative margin), 4 px gaps, every tile r8, and the chips sit +12 px below the danger card — ' + JSON.stringify(r));
    dom.window.close();
  }

  /* ———————————————————— A5 (#1133 (3) / #1124): image files on the media tile ———————————————————— */
  {
    const { dom, W, push, errs } = await boot('chat.html');
    const d = W.document;
    const rowOf = (id) => d.querySelector('#messages [data-msgid="' + id + '"]');
    const tileOf = (id) => { const row = rowOf(id); return row ? row.querySelector('.c-mbubble[data-file]') : null; };
    /* null-safe reads: a missing tile fails ITS check, never the whole run (a throw would hide which rule broke) */
    const blank = () => { const b = d.createElement('button'); b.innerHTML = '<span class="c-mbubble__img"></span><span class="c-mbubble__cap"></span><span class="c-mbubble__cta"></span><span class="c-mbubble__hint"></span><span class="c-mbubble__ring"></span><span class="c-mbubble__ring-fill"></span>'; return b; };
    const tl = (id) => tileOf(id) || blank();
    const rw = (id) => rowOf(id) || d.createElement('div');
    const raw0 = (id, uri) => W.executeUiCommand(W.setFileThumb, b64(id), uri);
    push('onChatScreenReady', 'addrPeer');
    push('setChatMode', '0', '0', '', 'False');
    const load = () => {
      push('clearMessages', 'false');
      push('addFile', 'iA', 'addrPeer', 'Bob', '', 'fA', 'IMG_A.jpg', String(T0), 'False', 'True', 'True', '100', 'True', 'False', 'True');        // A: received, downloaded
      push('addFile', 'iB', 'addrPeer', 'Bob', '', 'fB', 'IMG_B.png', String(T0 + 10), 'False', 'True', 'True', '0', 'False', 'False', 'True');      // C: an offer
      push('addFile', 'iS', '', '', '', 'fS', 'mine.heic', String(T0 + 20), 'True', 'True', 'False', '0', 'False', 'False', 'True');                // B: my own, in transfer
      push('addFile', 'iD', 'addrPeer', 'Bob', '', 'fD', 'report.pdf', String(T0 + 30), 'False', 'True', 'True', '100', 'True', 'False', 'True');   // not an image
      if (typeof W.messagesDone === 'function') push('messagesDone');
    };
    load();
    push('onChatScreenLoaded');
    await sleep(300);
    const r = {};
    /* #46 r1 B-2: OFF until told — an older exe never sends setPhotoPreviews, so every image stays the file card */
    r.defaultOff = !d.querySelector('#messages .c-mbubble[data-file]') && ['iA', 'iB', 'iS', 'iD'].every((id) => !!rw(id).querySelector('.c-fbubble'));
    raw0('iA', JPEG); r.offBeforeToldIgnored = !d.querySelector('#messages img[src^="data:image/jpeg"]');
    push('setPhotoPreviews', 'True');
    await sleep(100);
    /* told ON: image files are tiles, the PDF stays a card */
    r.toldOn = !!tileOf('iA') && !!tileOf('iB') && !!tileOf('iS') && !tileOf('iD') && !!rw('iD').querySelector('.c-fbubble')
      && !(tl('iA').querySelector('.c-mbubble__img').getAttribute('src') || '');   // the push taken while OFF was not kept
    r.states = tl('iA').dataset.file === 'complete' && tl('iB').dataset.file === 'offer' && tl('iS').dataset.file === 'progress';
    /* C (offer): glyph + name + "Tap to download"; no picture; label names the state + the file */
    const tB = tl('iB');
    r.offerFace = !!tB.querySelector('.c-mbubble__file .c-fbubble__icon[data-kind="image"]') && /IMG_B\.png/.test(tB.querySelector('.c-mbubble__cap').textContent)
      /* #1147 (3) re-base: jsdom's UA is not a phone → :root[data-desktop] → the desktop wording (the touch case: its own pin below) */
      && tB.querySelector('.c-mbubble__cta').textContent === (d.documentElement.hasAttribute('data-desktop') ? ((W.SL && W.SL.clickToDownload) || 'Click to download') : ((W.SL && W.SL.tapToDownload) || 'Tap to download')) && !tB.querySelector('.c-mbubble__img').getAttribute('src')
      && tB.getAttribute('aria-label') === ((W.SL && W.SL.download) || 'Download') + ' IMG_B.png';
    /* B (transferring): the ring (a progressbar), the percentage, the keepOpen line ON the tile, disabled, the pre-accept Cancel beside it */
    const tS = tl('iS');
    r.progressFace = !!tS.querySelector('.c-mbubble__ring[role="progressbar"] .c-fbubble__icon') && tS.disabled
      && tS.querySelector('.c-mbubble__hint').textContent === ((W.SL && W.SL.keepOpen) || 'Keep Spixi open until the transfer completes')
      && !!rw('iS').querySelector(':scope > .c-fbubble__cancel')
      /* #46 r1 B-N1: MY transfer is "Sending", not "Downloading" — the ring and the tile's name */
      && tS.querySelector('.c-mbubble__ring').getAttribute('aria-label') === ((W.SL && W.SL['status-sending']) || 'Sending')
      && (tS.getAttribute('aria-label') || '').startsWith(((W.SL && W.SL['status-sending']) || 'Sending') + ' mine.heic');
    /* updateFile drives the ring in place (the EXISTING push), and the first tick drops Cancel */
    push('updateFile', 'fS', '42', 'False');
    await sleep(50);
    const tS2 = tl('iS');
    r.ringTicks = tS2 === tS && tS.querySelector('.c-mbubble__ring').getAttribute('aria-valuenow') === '42' && tS.querySelector('.c-mbubble__cap').textContent === '42%'
      && Math.abs(Number(tS.querySelector('.c-mbubble__ring-fill').getAttribute('stroke-dashoffset')) - 2 * Math.PI * 32 * 0.58) < 0.1
      && !rw('iS').querySelector('.c-fbubble__cancel');
    /* the sent tick rides the tile's stamp — #46 r2 R2-N2: but NOT its name while the file is still sending (the tick is the
       message's "Sent"; "Sending mine.heic, Sent" contradicted itself) */
    const sendingName = ((W.SL && W.SL['status-sending']) || 'Sending') + ' mine.heic';
    /* #46 r4 MINOR-1 (#1035): …only a PLAIN sent tick stays out — this one is delivered (confirmed = True), so the name carries it */
    r.sentTick = !!tS.querySelector('.c-mbubble__stamp .c-status-icon') && tS.getAttribute('aria-label') === sendingName + ', ' + ((W.SL && W.SL['status-delivered']) || 'delivered');
    /* …and it changes LIVE through the one tick path (setMessageStatus → TICK_HOST_SEL), the tile's name with it */
    push('updateFileTicks', 'iS', 'True', 'True', 'True');
    await sleep(400);
    const liveTick = [...tl('iS').querySelectorAll('.c-mbubble__stamp .c-status-icon:not([data-exit])')].pop();
    const readLbl = (W.SL && W.SL['status-read']) || 'read';
    /* #46 r4 MINOR-1 (#1035): only the plain sent tick stays out of the name while it sends — a read tick joins it */
    r.tickLive = !!liveTick && liveTick.getAttribute('aria-label') === readLbl && tl('iS').getAttribute('aria-label') === sendingName + ', ' + readLbl;
    /* setFileThumb: only a base64 JPEG data: URI ≤ 90000 for a KNOWN image file row; everything else is ignored silently */
    const raw = (id, uri) => W.executeUiCommand(W.setFileThumb, b64(id), uri);   // C#'s raw data: transport (Utils.isTransportSafeDataUri)
    const srcA = () => tl('iA').querySelector('.c-mbubble__img').getAttribute('src') || '';
    raw('iA', 'data:image/png;base64,iVBORw0KGgo=');                     r.rejectPng = srcA() === '';
    raw('iA', 'data:image/svg+xml;base64,PHN2Zz4=');                     r.rejectSvg = srcA() === '';
    raw('iA', 'data:image/jpeg;base64,/9j/"><img src=x onerror=1>');    r.rejectJunk = srcA() === '';
    push('setFileThumb', 'iA', 'https://evil.example/a.jpg');           r.rejectRemote = srcA() === '';
    raw('iA', 'data:image/jpeg;base64,' + 'A'.repeat(90000));            r.rejectBig = srcA() === '';
    raw('ffff', JPEG); raw('iD', JPEG);                                  r.rejectUnknownAndPdf = !d.querySelector('#messages img[src^="data:image/jpeg"]');
    /* an id the shell has NOT rendered is refused, not parked: a later row with that id shows no picture */
    raw('iZ', JPEG);
    push('addFile', 'iZ', 'addrPeer', 'Bob', '', 'fZ', 'IMG_Z.jpg', String(T0 + 40), 'False', 'True', 'True', '100', 'True', 'False', 'True');
    await sleep(80);
    r.rejectNotYetRendered = !!tl('iZ') && !(tl('iZ').querySelector('.c-mbubble__img').getAttribute('src') || '');
    raw('iB', JPEG);                                                     r.offerNoPicture = !tl('iB').querySelector('.c-mbubble__img').getAttribute('src');   // C stays a glyph (kept until complete)
    raw('iA', JPEG);
    const imgA = tl('iA').querySelector('.c-mbubble__img');
    r.acceptA = imgA.getAttribute('src') === JPEG && tl('iA').dataset.state === 'loading';
    imgA.dispatchEvent(new W.Event('load'));
    await sleep(40);   /* ★ #1151 re-base: the reveal is one frame after load + decode */
    r.loadedA = tl('iA').dataset.state === 'loaded' && !!tl('iA').querySelector('.c-mbubble__time')
      && tl('iA').getAttribute('aria-label') === ((W.SL && W.SL.open) || 'Open') + ' IMG_A.jpg';
    /* #46 r2 R2-1 (was C-j9): MY photo is local from the first moment — its preview shows WHILE it is still sending
       (the ring stays), and the completing flip keeps the same picture (no reload) and names the tick again */
    raw('iS', JPEG);
    r.sendingShowsPicture = (tl('iS').querySelector('.c-mbubble__img').getAttribute('src') || '') === JPEG && tl('iS').dataset.file === 'progress';
    tl('iS').querySelector('.c-mbubble__img').dispatchEvent(new W.Event('load'));
    push('updateFile', 'fS', '100', 'True');
    await sleep(50);
    r.storedOnComplete = tl('iS').dataset.file === 'complete' && (tl('iS').querySelector('.c-mbubble__img').getAttribute('src') || '') === JPEG
      && tl('iS').dataset.state === 'loaded' && (tl('iS').getAttribute('aria-label') || '').endsWith(', ' + readLbl);
    /* B-1: a preview that will NOT decode is dropped — the tile is back on its file face (idle, no src) and the
       shell FORGETS it: the same push again is taken anew (were it kept, the "same preview" early return would skip it) */
    raw('iZ', JPEG);
    const imgZ = tl('iZ').querySelector('.c-mbubble__img');
    const zLoading = tl('iZ').dataset.state === 'loading';
    imgZ.dispatchEvent(new W.Event('error'));
    r.badThumbDropped = zLoading && tl('iZ').dataset.state === 'idle' && !imgZ.getAttribute('src')
      && tl('iZ').querySelector('.c-mbubble__cta').textContent === ((W.SL && W.SL.openFile) || 'Open file');
    raw('iZ', JPEG);
    r.badThumbForgotten = tl('iZ').dataset.state === 'loading' && imgZ.getAttribute('src') === JPEG;
    /* the preview survives a re-flush (C# sends it once per document) and renders at build — B-6: sized from the
       JPEG's own header BEFORE it loads (300 × 200 → aspect 1.5), so the rebuilt tile does not jump */
    raw('iA', JPEG_300x200);
    load();
    await sleep(300);
    r.keptAcrossReflush = (tl('iA').querySelector('.c-mbubble__img').getAttribute('src') || '') === JPEG_300x200;
    /* #46 r1 B-M2 supersedes the B-6 sizing for a LOCAL tile: it is the square C#'s crop is, whatever the JPEG header says */
    r.sizedFromJpeg = /aspect-ratio: 1( \/ 1)?;/.test(tl('iA').getAttribute('style') || '') && tl('iA').dataset.state === 'loading';
    /* C-j12: an OFFER never shows a picture, not even from a stored push across a re-flush */
    r.offerNoPictureAfterReflush = tl('iB').dataset.file === 'offer' && !(tl('iB').querySelector('.c-mbubble__img').getAttribute('src') || '');
    raw('iA', JPEG);
    /* OFF = today's file card for EVERY image, and a preview push is ignored while off */
    push('setPhotoPreviews', 'False');
    await sleep(100);
    r.offCards = !d.querySelector('#messages .c-mbubble[data-file]') && ['iA', 'iB', 'iS', 'iD'].every((id) => !!rw(id).querySelector('.c-fbubble'));
    raw('iA', JPEG.replace('A=', 'B='));
    push('setPhotoPreviews', 'junk');
    await sleep(100);
    r.junkIgnored = !d.querySelector('#messages .c-mbubble[data-file]');
    push('setPhotoPreviews', 'True');
    await sleep(100);
    r.backOn = (tl('iA').querySelector('.c-mbubble__img').getAttribute('src') || '') === JPEG;   // the OFF-time push was not taken
    /* a new peer (onChatScreenReady) drops the previews */
    push('onChatScreenReady', 'addrOther');
    load();
    await sleep(300);
    r.perPeerReset = !(tl('iA').querySelector('.c-mbubble__img').getAttribute('src') || '');
    /* the white ground: a tile with no picture stands on the INCOMING BUBBLE ground (white in light), not the grey neutral */
    const rules = rulesOf(W);
    const bg = matching(rules, tl('iB'), 'background');
    r.whiteGround = bg.pop() === 'var(--surface-bubble-received)' && /--surface-bubble-received:\s*#ffffff/i.test(rd('src/styles/tokens.css'));
    /* B-6: the face stays UNDER the fading picture (the img above it) and hides only at the fade's end — never display:none at load */
    const faceA = tl('iA').querySelector('.c-mbubble__file') || d.createElement('span');
    tl('iA').dataset.state = 'loaded';
    r.faceUnderFade = matching(rules, faceA, 'visibility').pop() === 'hidden' && matching(rules, faceA, 'transition').pop() === 'visibility 0s linear var(--duration-200)'
      && matching(rules, faceA, 'display').every((v) => v !== 'none') && matching(rules, tl('iA').querySelector('.c-mbubble__img'), 'z-index').pop() === '1';
    /* C-j20: no "tap to load" disc on a file tile, in any state */
    r.overlayHidden = ['iA', 'iB'].every((id) => matching(rules, tl(id).querySelector('.c-mbubble__overlay'), 'display').pop() === 'none');
    r.noErr = errs.length === 0;
    ok(Object.values(r).every(Boolean),
      '★★ A5 (#1133 (3) / #1124; #46 r1 B-1 · B-2 · B-6 · B-N1 · C-j9 · j12 · j20): OFF until C# tells (an older exe keeps the card); with setPhotoPreviews on an IMAGE file renders on the media tile — A local + a preview → the picture (time pill over it), B transferring → the ring driven by the existing updateFile + the % + the keepOpen line + the pre-accept Cancel, C offered → glyph + name + "Tap to download", no picture; a PDF stays a card; setFileThumb takes only a base64 JPEG data: URI ≤ 90000 for a known image-file row (png · svg · junk · remote · oversize · unknown id · a PDF row: ignored), keeps it across a re-flush (the tile sized from the JPEG header before it loads), lands a stored one when MY transfer completes, never on an offer, FORGETS one that fails to decode (the tile back on its file face, a tap opens the file), drops it per peer; my transfer says Sending; the face stays under the fading picture; no load disc on a file tile; OFF = every image a card and an OFF-time push ignored; the no-picture ground is the white incoming-bubble token — ' + JSON.stringify(r) + (errs.length ? ' errs=' + errs.slice(0, 2).join(' | ') : ''));
    dom.window.close();
  }

  /* ———— A5 (#46 r1 C-j10 · B-N3): the preview map is bounded TWICE — 200 entries AND 4 M characters, oldest first ———— */
  {
    const { dom, W, push, errs } = await boot('chat.html');
    const d = W.document;
    const raw = (id, uri) => W.executeUiCommand(W.setFileThumb, b64(id), uri);
    const srcOf = (id) => { const row = d.querySelector('#messages [data-msgid="' + id + '"]'); const im = row && row.querySelector('.c-mbubble[data-file] .c-mbubble__img'); return im ? (im.getAttribute('src') || '') : null; };
    const N = 210;
    const flush = () => {
      push('clearMessages', 'false');
      for (let i = 0; i < N; i++) push('addFile', 'e' + i, 'addrPeer', 'Bob', '', 'fe' + i, 'IMG_' + i + '.jpg', String(T0 + i), 'False', 'True', 'True', '100', 'True', 'False', 'True');
      if (typeof W.messagesDone === 'function') push('messagesDone');
    };
    push('onChatScreenReady', 'addrPeer');
    push('setChatMode', '0', '0', '', 'False');
    push('setPhotoPreviews', 'True');
    flush();
    push('onChatScreenLoaded');
    await sleep(400);
    /* the CHARACTER budget: 50 near-cap previews (88 997 chars each) — 44 fit in 4 000 000, the 6 oldest go */
    const BIG = 'data:image/jpeg;base64,/9j/' + 'A'.repeat(88970);
    for (let i = 0; i < 50; i++) raw('e' + i, BIG);
    flush();
    await sleep(400);
    const r = {};
    r.budget = srcOf('e0') === '' && srcOf('e5') === '' && srcOf('e6') === BIG && srcOf('e49') === BIG;
    /* the ENTRY cap: a new peer resets the map; 210 small previews — the 10 oldest go */
    push('onChatScreenReady', 'addrPeer2');
    flush();
    await sleep(400);
    for (let i = 0; i < N; i++) raw('e' + i, JPEG);
    flush();
    await sleep(400);
    r.keep = srcOf('e0') === '' && srcOf('e9') === '' && srcOf('e10') === JPEG && srcOf('e' + (N - 1)) === JPEG;
    r.noErr = errs.length === 0;
    ok(Object.values(r).every(Boolean),
      '★ A5 (#46 r1 C-j10 · B-N3): the shell\'s preview map is bounded by ENTRIES (FILE_THUMB_KEEP 200) AND by CHARACTERS (FILE_THUMB_BUDGET 4 000 000 — 200 full-size previews would be 18 M), the oldest dropped first; a dropped preview no longer renders after a re-flush — ' + JSON.stringify(r) + (errs.length ? ' errs=' + errs.slice(0, 2).join(' | ') : ''));
    dom.window.close();
  }

  /* ———— A5: the tile keeps the file card's ACTIONS (component, executed from the bundle) ———— */
  {
    const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', pretendToBeVisual: true });
    const W = dom.window;
    W.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    W.eval(rd('src/components/icons.iife.js')); W.eval(rd('src/demo/spixi.iife.js'));
    const S = W.Spixi;
    const got = [];
    const mk = (state, thumb, direction = 'received') => S.createImageFileBubble({ direction, name: 'IMG_9.jpg', state, thumb, timestamp: Date.now(), strings: {},
      onAccept: () => got.push('accept:' + state), onOpen: () => got.push('open:' + state), onRetry: () => got.push('retry:' + state),
      onThumbError: () => got.push('thumbError:' + state) });
    const offer = mk('offer'); W.document.body.append(offer);
    const tO = offer.querySelector('.c-mbubble'); tO.click(); tO.click();
    const done = mk('complete'); W.document.body.append(done);
    done.querySelector('.c-mbubble').click();
    const fail = mk('failed'); W.document.body.append(fail);
    fail.querySelector('.c-mbubble').click();
    /* C-j19: the failed face says what a tap does */
    const failedFace = fail.querySelector('.c-mbubble__cta').textContent === 'Transfer failed · Tap to retry' && fail.querySelector('.c-mbubble').getAttribute('aria-label') === 'Retry IMG_9.jpg';
    /* C-j13 + B-1: a tile with a picture LOADING does nothing on a tap; a picture that fails to decode is dropped
       (idle, no src, the owner told ONCE) and the next tap OPENS THE FILE — once, with no media reload */
    const pic = mk('complete', JPEG); W.document.body.append(pic);
    const tPic = pic.querySelector('.c-mbubble'), iPic = tPic.querySelector('.c-mbubble__img');
    const opens = () => got.filter((x) => x === 'open:complete').length;
    const opens0 = opens();
    const loadingNoTap = tPic.dataset.state === 'loading' && (tPic.click(), opens() === opens0);
    iPic.dispatchEvent(new W.Event('error'));
    const dropped = tPic.dataset.state === 'idle' && !iPic.getAttribute('src') && got.filter((x) => x === 'thumbError:complete').length === 1
      && tPic.querySelector('.c-mbubble__cta').textContent === 'Open file' && tPic.getAttribute('aria-label') === 'Open IMG_9.jpg';
    tPic.click();
    const openAfterBad = opens() === opens0 + 1 && tPic.dataset.state === 'idle' && !iPic.getAttribute('src');
    /* B-6: the size comes from the JPEG header (no decode) and sizes the tile BEFORE the picture loads */
    const sized = mk('complete', JPEG_300x200); W.document.body.append(sized);
    const tSized = sized.querySelector('.c-mbubble');
    const size = S.jpegSize(JPEG_300x200);
    const sizeHint = !!size && size.w === 300 && size.h === 200 && /aspect-ratio: 1( \/ 1)?;/.test(tSized.getAttribute('style') || '')   /* #46 r1 B-M2: square, not 1.5 */ && tSized.dataset.state === 'loading'
      && JSON.stringify(S.jpegSize(JPEG)) === '{"w":1,"h":1}' && S.jpegSize('data:image/jpeg;base64,AAAA') === null && S.jpegSize('nope') === null;
    /* B-N1: MY transfer says Sending; a download says Downloading (ring + name) */
    const sendP = mk('progress', null, 'sent'); W.document.body.append(sendP);
    const recvP = mk('progress', null, 'received'); W.document.body.append(recvP);
    const words = sendP.querySelector('.c-mbubble__ring').getAttribute('aria-label') === 'Sending' && sendP.querySelector('.c-mbubble').getAttribute('aria-label') === 'Sending IMG_9.jpg'
      && recvP.querySelector('.c-mbubble__ring').getAttribute('aria-label') === 'Downloading' && recvP.querySelector('.c-mbubble').getAttribute('aria-label') === 'Downloading IMG_9.jpg';
    const prog = mk('progress'); W.document.body.append(prog);
    const tP = prog.querySelector('.c-mbubble'); tP.click();
    const progressNoTap = tP.disabled && !got.some((x) => /:progress$/.test(x));
    S.setFileProgress(prog, 100, { state: 'complete' });
    const flipped = tP.dataset.file === 'complete' && !tP.disabled && !tP.querySelector('.c-mbubble__ring') && tP.getAttribute('aria-label') === 'Open IMG_9.jpg';
    await sleep(600);   // past the reentry guard of the open handler
    tP.click();
    const r = {
      acceptOnce: got.filter((x) => x === 'accept:offer').length === 1 && tO.disabled,     // the accept latches (oneShot), as on the card
      open: got.includes('open:complete'),
      retry: got.includes('retry:failed'),
      progressNoTap,
      flipped,
      openAfterFlip: got.includes('open:progress'),
      failedFace, loadingNoTap, dropped, openAfterBad, sizeHint, words,
      photoNames: S.isPhotoFileName('a.JPG') && S.isPhotoFileName('b.heic') && S.isPhotoFileName('c.avif') && !S.isPhotoFileName('d.svg') && !S.isPhotoFileName('e.tiff') && !S.isPhotoFileName('f.pdf') && !S.isPhotoFileName('jpg'),
    };
    /* the ONE call site hands the card's options to the tile (every action and verb is shared) */
    const src = stripCode(rd('src/shells/chat.html'));
    r.offUntilTold = /\blet photoPreviews = false;/.test(src);
    r.oneCallSite = /const photoTile = photoPreviews && isPhotoFileName\(rec\.name\);\s*const fileRow = \(photoTile \? createImageFileBubble : createFileBubble\)\(\{/.test(src)   /* ★ S11 G re-base (#1263 c): the row is kept to take the offer preview, then returned (behaviour: pins-s11/g-offer.mjs) */
      /* ★ #1166 V-3 re-base: onOpen goes through openFileOrViewer (a photo tile showing its preview → the viewer; everything else → the same ixian:openfile) — executed in pins-s5/media.mjs */
      && /onAccept: \(\) => askAccept\(rec\),\s*onOpen: \(\) => openFileOrViewer\(rec\),/.test(src) && /function askAccept\(rec\) \{[^}]*bridge\.send\('ixian:acceptfile:' \+ rec\.fileid\);/.test(src)   /* ★ S10 #46 m-6 re-base: the cell accept goes through the shared 3 s guard (behaviour: pins-s10/c-grid.mjs) */
      && /if \(!thumb\) \{ bridge\.send\('ixian:openfile:' \+ rec\.fileid\); return; \}/.test(src);
    /* the shell's accept rule, as source (the regex and the cap the behaviour pin above exercises) */
    r.shellRule = /const FILE_THUMB_MAX = 90000;/.test(src) && /const FILE_THUMB_RE = \/\^data:image\\\/jpeg;base64,\[A-Za-z0-9\+\/\]\+=\*\$\/;/.test(src);
    ok(Object.values(r).every(Boolean),
      '★ A5 (#1124; #46 r1 B-1 · B-6 · B-N1 · C-j13 · j19): the image tile keeps every file-card action — accept latches once, open and retry repeat (the failed face says so), a transferring tile does nothing on tap and opens after updateFile completes it in place; a tap while the picture LOADS does nothing; a picture that fails to decode is DROPPED (the owner told once) and the next tap opens the FILE, no reload loop; the tile is sized from the JPEG header before load; my transfer says Sending, a download Downloading; the tile is offered only for the names C# can preview (SharedItems.imageExts), and the shell hands the card\'s own options to it — ' + JSON.stringify(r));
    W.close();
  }

  /* ———— #46 r2 R2-1 · N3: MY photo shows its picture while SENDING (picture + the ring on a scrim) — what the user sees,
     from the BUILT shell's own CSSOM; a DOWNLOAD in flight never does; jpegSize decodes the JPEG's head only ———— */
  {
    const { W, push, errs } = await boot('chat.html');
    const d = W.document;
    const tileOf = (id) => { const row = d.querySelector('#messages [data-msgid="' + id + '"]'); return row ? row.querySelector('.c-mbubble[data-file]') : null; };
    const raw = (id, uri) => W.executeUiCommand(W.setFileThumb, b64(id), uri);
    push('onChatScreenReady', 'addrPeer');
    push('setChatMode', '0', '0', '', 'False');
    push('setPhotoPreviews', 'True');
    push('clearMessages', 'false');
    push('addFile', 'pS', '', '', '', 'fpS', 'IMG_2.jpg', String(T0), 'True', 'True', 'False', '30', 'False', 'False', 'True');          // mine, sending
    push('addFile', 'pR', 'addrPeer', 'Bob', '', 'fpR', 'IMG_3.jpg', String(T0 + 10), 'False', 'True', 'True', '30', 'False', 'False', 'True');   // a download in flight
    if (typeof W.messagesDone === 'function') push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(300);
    const r = {};
    const tS = tileOf('pS') || d.createElement('button'), tR = tileOf('pR') || d.createElement('button');
    r.states = tS.dataset.file === 'progress' && tR.dataset.file === 'progress';
    /* N3: spy the decoder — a 60 K-character preview is decoded by its HEAD (≤ 4096 chars), not whole */
    const big = 'data:image/jpeg;base64,' + Buffer.concat([Buffer.from(JPEG_300x200.slice(23), 'base64').subarray(0, -2), Buffer.alloc(45000, 0x11), Buffer.from([0xFF, 0xD9])]).toString('base64');
    const realAtob = W.atob; const seen = [];
    W.atob = (x) => { seen.push(String(x).length); return realAtob(x); };
    raw('pS', big);
    W.atob = realAtob;
    const imgS = tS.querySelector('.c-mbubble__img') || d.createElement('img');
    r.sendingTakesPicture = imgS.getAttribute('src') === big && tS.dataset.state === 'loading';
    r.headOnly = big.length > 60000 && seen.length >= 1 && Math.max(...seen) <= 4096;
    r.sizedFromHead = /aspect-ratio: 1( \/ 1)?;/.test(tS.getAttribute('style') || '');   /* #46 r1 B-M2: the square holds */
    raw('pR', JPEG);
    r.downloadNoPicture = !((tR.querySelector('.c-mbubble__img') || d.createElement('img')).getAttribute('src') || '') && tR.dataset.state !== 'loading';
    /* N3: a header run LONGER than the head (a 6 KB APP1 before the frame header) still sizes — the head doubles */
    const app1 = Buffer.alloc(6000, 0x22); app1[0] = 0xFF; app1[1] = 0xE1; app1[2] = (6000 - 2) >> 8; app1[3] = (6000 - 2) & 0xFF;
    const sof = Buffer.from([0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x64, 0x00, 0xC8, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xFF, 0xD9]);   // 200 × 100 (2:1 — not the 3:2 the tile already has)
    const longHead = 'data:image/jpeg;base64,' + Buffer.concat([Buffer.from([0xFF, 0xD8]), app1, sof]).toString('base64');
    raw('pS', longHead);
    r.longHeaderSized = /aspect-ratio: 1( \/ 1)?;/.test(tS.getAttribute('style') || '')   /* #46 r1 B-M2: a 2:1 header does not resize it */ && (tS.querySelector('.c-mbubble__img') || d.createElement('img')).getAttribute('src') === longHead;
    raw('pS', JPEG);
    (tS.querySelector('.c-mbubble__img') || d.createElement('img')).dispatchEvent(new W.Event('load'));
    await sleep(40);   /* ★ #1151 re-base: the reveal is one frame after load + decode */
    /* what the user SEES on the loaded sending tile: the face (ring + % + keep-open) stays VISIBLE above the picture on a
       scrim, in the on-scrim ink; the document glyph inside the ring hides; the ring still ticks */
    const rules = rulesOf(W);
    const face = tS.querySelector('.c-mbubble__file') || d.createElement('span');
    const pic = tS.querySelector('.c-mbubble__img') || d.createElement('img');
    const glyph = tS.querySelector('.c-mbubble__ring > .c-fbubble__icon') || d.createElement('span');
    const hint = tS.querySelector('.c-mbubble__hint') || d.createElement('span');
    r.loaded = tS.dataset.state === 'loaded' && !!tS.querySelector('.c-mbubble__ring[role="progressbar"]') && /30%/.test((tS.querySelector('.c-mbubble__cap') || {}).textContent || '');
    r.faceOnPicture = matching(rules, face, 'visibility').pop() === 'visible' && /^var\(--[\w-]+\)$/.test(matching(rules, face, 'background').pop() || '')   /* the scrim's CONTRAST is computed in the r3 block below */
      && matching(rules, face, 'color').pop() === 'var(--text-on-scrim)' && Number(matching(rules, face, 'z-index').pop()) >= Number(matching(rules, pic, 'z-index').pop())
      && Array.from(tS.children).indexOf(face) > Array.from(tS.children).indexOf(pic);   // same layer, later = on top
    r.glyphHidden = matching(rules, glyph, 'visibility').pop() === 'hidden';
    r.hintOnScrim = matching(rules, hint, 'color').pop() === 'var(--text-on-scrim)';
    push('updateFile', 'fpS', '64', 'False');
    await sleep(50);
    r.ringTicksOverPicture = tS.dataset.state === 'loaded' && (tS.querySelector('.c-mbubble__ring') || d.createElement('span')).getAttribute('aria-valuenow') === '64';
    /* the final flip: the same picture, the face hidden as on any loaded tile */
    push('updateFile', 'fpS', '100', 'True');
    await sleep(50);
    const face2 = tS.querySelector('.c-mbubble__file') || d.createElement('span');
    r.completeHidesFace = tS.dataset.file === 'complete' && tS.dataset.state === 'loaded' && pic.getAttribute('src') === JPEG && matching(rules, face2, 'visibility').pop() === 'hidden';
    r.noErr = errs.length === 0;
    ok(Object.values(r).every(Boolean),
      '★★ A5 (#46 r2 R2-1 · R2-N3): MY photo (local from the first moment) shows its preview WHILE it is sending — the picture with the ring, the percentage and the keep-open line ON it over a scrim (on-scrim ink, the document glyph hidden), the ring ticking over it, the completing flip keeping the same picture; a download in flight shows none; jpegSize decodes only the JPEG head (≤ 4096 chars of a 60 K preview) and doubles it for a longer header run — ' + JSON.stringify(r) + (errs.length ? ' errs=' + errs.slice(0, 2).join(' | ') : ''));
    W.close();
  }

  /* ———— #46 r3 R3-M1 · m1 · m2 · m3: the sending tile's inks are COMPUTED (contrast from the tokens, both themes, the
     scrim over a white and a black photo); a re-built tile keeps its picture and shows an already-shown one at once (no
     fade from 0), a first show keeps the fade; MY transfer is "Sending <name>" on the card AND the tile ———— */
  {
    const { W, push, errs } = await boot('chat.html');
    const d = W.document;
    const rowOf = (id) => d.querySelector('#messages [data-msgid="' + id + '"]');
    const tileOf = (id) => { const row = rowOf(id); return row ? row.querySelector('.c-mbubble[data-file]') : null; };
    const cardOf = (id) => { const row = rowOf(id); return row ? row.querySelector('.c-fbubble') : null; };
    const raw = (id, uri) => W.executeUiCommand(W.setFileThumb, b64(id), uri);
    const SND = (W.SL && W.SL['status-sending']) || 'Sending', DWN = (W.SL && W.SL.downloading) || 'Downloading';
    const DLV = ', ' + ((W.SL && W.SL['status-delivered']) || 'delivered');   // #46 r4 MINOR-1: qS / qC are DELIVERED while they send — the name keeps the tick
    push('onChatScreenReady', 'addrPeer');
    push('setChatMode', '0', '0', '', 'False');
    push('setPhotoPreviews', 'True');
    push('clearMessages', 'false');
    push('addFile', 'qS', '', '', '', 'fqS', 'IMG_5.jpg', String(T0), 'True', 'True', 'False', '30', 'False', 'False', 'True');          // mine, sending (tile)
    push('addFile', 'qN', '', '', '', 'fqN', 'IMG_6.jpg', String(T0 + 1), 'True', 'True', 'False', '30', 'False', 'False', 'True');      // mine, sending, its preview never shown
    push('addFile', 'qC', '', '', '', 'fqC', 'report.pdf', String(T0 + 2), 'True', 'True', 'False', '30', 'False', 'False', 'True');     // mine, sending (card)
    push('addFile', 'qR', 'addrPeer', 'Bob', '', 'fqR', 'IMG_7.jpg', String(T0 + 3), 'False', 'True', 'True', '30', 'False', 'False', 'True');   // a download (tile)
    push('addFile', 'qD', 'addrPeer', 'Bob', '', 'fqD', 'theirs.pdf', String(T0 + 4), 'False', 'True', 'True', '30', 'False', 'False', 'True');  // a download (card)
    if (typeof W.messagesDone === 'function') push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(300);
    const r = {};
    const lab = (el) => (el && el.getAttribute('aria-label')) || '';
    const bar = (el, sel) => lab(el && el.querySelector(sel));
    /* R3-m2: ONE label rule — mine "Sending <name>" (+ its delivered / read tick; a plain sent one stays out while it sends — r4 MINOR-1), a download "Downloading <name>"; the bar too */
    r.labels = lab(tileOf('qS')) === SND + ' IMG_5.jpg' + DLV && bar(tileOf('qS'), '.c-mbubble__ring') === SND
      && lab(cardOf('qC')) === SND + ' report.pdf' + DLV && bar(cardOf('qC'), '.c-fbubble__track') === SND
      && lab(tileOf('qR')) === DWN + ' IMG_7.jpg' && bar(tileOf('qR'), '.c-mbubble__ring') === DWN
      && lab(cardOf('qD')) === DWN + ' theirs.pdf' && bar(cardOf('qD'), '.c-fbubble__track') === DWN;
    /* the cascade winner for a property (specificity, then order) — the dark-track rule must lose to the on-scrim one */
    const rules = rulesOf(W);
    const spec = (s) => { const x = s.replace(/::[\w-]+/g, ''); return (x.match(/#[\w-]+/g) || []).length * 1e6 + (x.match(/\.[\w-]+|\[[^\]]*\]|:[\w-]+/g) || []).length * 1e3 + (x.replace(/\[[^\]]*\]/g, '').match(/(^|[\s>+~(])[a-z][\w-]*/gi) || []).length; };
    const win = (el, prop) => {
      let best = null, bs = -1;
      for (const ru of rules) {
        if (ru.media || !ru.style.getPropertyValue(prop)) continue;
        for (const part of String(ru.sel).split(',')) { let m = false; try { m = el.matches(part); } catch (e) {} if (m && spec(part) >= bs) { bs = spec(part); best = ru.style.getPropertyValue(prop).trim(); } }
      }
      return best;
    };
    /* the tokens, resolved per theme from tokens.css; WCAG 2.1 contrast; alpha compositing */
    const tv = (() => { const t = h.stripCssComments(rd('src/styles/tokens.css')); const light = {}, darkOnly = {};
      for (const m of t.matchAll(/^(:root|\[data-theme="dark"\]) \{([\s\S]*?)^\}/gm)) { const into = m[1] === ':root' ? light : darkOnly; for (const dd of m[2].matchAll(/(--[\w-]+):\s*([^;]+);/g)) into[dd[1]] = dd[2].trim(); }
      return { light, dark: { ...light, ...darkOnly } }; })();
    const tok = (th, v, k = 0) => { const m = /^var\((--[\w-]+)\)$/.exec(String(v || '').trim()); return !m ? v : k > 12 ? null : tok(th, tv[th][m[1]], k + 1); };
    const rgba = (c) => { c = String(c || '').trim(); let m = /^#([0-9a-f]{6})$/i.exec(c); if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
      m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(c); return m ? [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]] : null; };
    const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
    const lum = (c) => { const v = c.slice(0, 3).map((u) => u / 255).map((u) => (u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4))); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    /* R3-m1: the FIRST show fades (loading → the load event → loaded, the img's opacity transition in play) */
    raw('qS', JPEG);
    const tS0 = tileOf('qS') || d.createElement('button');
    const img0 = tS0.querySelector('.c-mbubble__img') || d.createElement('img');
    r.firstFades = tS0.dataset.state === 'loading' && !tS0.hasAttribute('data-seen') && /opacity/.test(win(img0, 'transition') || '');
    img0.dispatchEvent(new W.Event('load'));
    await sleep(40);   /* ★ #1151 re-base: the reveal is one frame after load + decode */
    r.firstLoaded = tS0.dataset.state === 'loaded';
    raw('qN', JPEG_300x200);   // handed over, never decoded (no load event): not "shown"
    /* R3-M1: what the user reads on the loaded sending tile, COMPUTED in both themes over a white and a black photo */
    const face = tS0.querySelector('.c-mbubble__file') || d.createElement('span');
    const cap = tS0.querySelector('.c-mbubble__cap') || d.createElement('span');
    const fillEl = tS0.querySelector('.c-mbubble__ring-fill'), trackEl = tS0.querySelector('.c-mbubble__ring-track');
    const ratios = [];
    for (const th of ['light', 'dark']) {
      if (th === 'dark') d.documentElement.setAttribute('data-theme', 'dark'); else d.documentElement.removeAttribute('data-theme');
      const scrim = rgba(tok(th, win(face, 'background')));
      const ink = rgba(tok(th, win(cap, 'color') || win(face, 'color')));
      const fill = rgba(tok(th, fillEl && win(fillEl, 'stroke'))), track = rgba(tok(th, trackEl && win(trackEl, 'stroke')));
      for (const photo of [[255, 255, 255, 1], [0, 0, 0, 1]]) {
        if (!scrim || !ink || !fill || !track) { ratios.push([th, 'unresolved', 0, 0, 0]); continue; }
        const ground = over(scrim, photo);
        ratios.push([th, photo[0] ? 'white' : 'black', +cr(over(ink, ground), ground).toFixed(2), +cr(over(fill, ground), ground).toFixed(2), +cr(over(fill, ground), over(track, ground)).toFixed(2)]);
      }
    }
    d.documentElement.removeAttribute('data-theme');
    r.textContrast = ratios.length === 4 && ratios.every((x) => x[2] >= 4.5);
    r.ringContrast = ratios.length === 4 && ratios.every((x) => x[3] >= 3 && x[4] >= 3);
    /* R3-m3 · m1: a RE-RENDER (an addThem push) while my photo SENDS — the tile is re-built, keeps its picture, and the
       picture this document already showed is loaded AT ONCE (no load event yet), no fade (img + face transitions off) */
    push('addThem', 'qT', 'addrPeer', 'Bob', '', 'hello', String(T0 + 100));
    await sleep(80);
    const tS1 = tileOf('qS') || d.createElement('button');
    const img1 = tS1.querySelector('.c-mbubble__img') || d.createElement('img');
    const face1 = tS1.querySelector('.c-mbubble__file') || d.createElement('span');
    r.rebuilt = !!tileOf('qS') && tS1 !== tS0;
    r.keepsPicture = img1.getAttribute('src') === JPEG && tS1.dataset.file === 'progress';
    r.instant = tS1.dataset.state === 'loaded' && tS1.hasAttribute('data-seen') && win(img1, 'transition') === 'none' && win(face1, 'transition') === 'none'
      && win(face1, 'visibility') === 'visible';
    /* …a picture NOT shown yet still fades on a re-built tile, and a NEW picture on a seen tile fades too */
    const tN1 = tileOf('qN') || d.createElement('button');
    r.unshownFades = tN1.dataset.state === 'loading' && !tN1.hasAttribute('data-seen');
    raw('qS', JPEG_300x200);
    r.newPictureFades = tS1.dataset.state === 'loading' && !tS1.hasAttribute('data-seen') && /opacity/.test(win(img1, 'transition') || '');
    push('updateFileTicks', 'qC', 'True', 'True', 'True');   // (read: a CHANGE) a live tick change while the card still sends
    /* #46 r4 MINOR-1 (#1035): the card's name takes the READ tick at once (only a plain sent tick stays out while it sends) */
    r.labelsAfter = lab(tS1) === SND + ' IMG_5.jpg' + DLV && lab(cardOf('qC')) === SND + ' report.pdf, ' + ((W.SL && W.SL['status-read']) || 'read')
      && (cardOf('qC') || d.body).querySelector('.c-fbubble__stamp .c-status-icon:not([data-exit])').dataset.tone === 'read';   // the tick DID change
    r.noErr = errs.length === 0;
    ok(Object.values(r).every(Boolean),
      '★★ A5 (#46 r3 R3-M1 · m1 · m2 · m3): the sending tile\'s scrim + inks hold their contrast COMPUTED from the tokens (text ≥ 4.5:1, the ring fill ≥ 3:1 on the scrim and on its track — light + dark, over a white and a black photo); a re-render while my photo sends re-builds the tile WITH its picture, shown at once when this document already showed it (no fade from 0) while a first show and a new picture keep the fade; MY transfer is "Sending <name>" on the card and the tile (bar too; a delivered / read tick stays in the name, r4 MINOR-1), a download "Downloading <name>" — ' + JSON.stringify(r) + ' cr=' + JSON.stringify(ratios) + (errs.length ? ' errs=' + errs.slice(0, 2).join(' | ') : ''));
    W.close();
  }

  /* ———— #46 r2 R2-2: a NEWER jump owns the highlight — an older jump's visibility loop (its 1.5 s fallback) stops ———— */
  {
    const { W, push, errs } = await boot('chat.html');
    const d = W.document;
    push('onChatScreenReady', 'addrPeer'); push('setChatMode', '0', '0', '', 'False'); push('clearMessages', 'false');
    for (let i = 0; i < 6; i++) push('addThem', 'j' + i, 'addrPeer', 'Bob', '', 'msg ' + i, String(T0 + i));
    if (typeof W.messagesDone === 'function') push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(300);
    /* j0 never comes into view (its loop runs to the 1.5 s fallback); j4 is in view at once */
    W.Element.prototype.getBoundingClientRect = function () {
      if (this.id === 'messages') return { top: 0, bottom: 1000, left: 0, right: 0, width: 0, height: 1000, x: 0, y: 0 };
      const off = this.dataset && this.dataset.msgid === 'j0';
      return off ? { top: 5000, bottom: 5010, left: 0, right: 0, width: 0, height: 10, x: 0, y: 0 } : { top: 10, bottom: 20, left: 0, right: 0, width: 0, height: 10, x: 0, y: 0 };
    };
    const lit = (id) => { const row = d.querySelector('#messages [data-msgid="' + id + '"]'); return !!row && row.hasAttribute('data-mention-pulse'); };
    push('jumpToMessage', 'j0');
    await sleep(100);
    push('jumpToMessage', 'j4');
    await sleep(200);
    const early = lit('j4') && !lit('j0');
    await sleep(1500);                      // past j0's 1.5 s fallback
    const late = lit('j4') && !lit('j0');
    ok(early && late && errs.length === 0,
      '★ A2 (#46 r2 R2-2): a jump token — a second jump (j4, in view) owns the highlight; the first jump\'s visibility loop (j0, never in view) stops instead of firing its 1.5 s fallback and stealing it — early=' + early + ' late=' + late + (errs.length ? ' errs=' + errs.slice(0, 2).join(' | ') : ''));
    W.close();
  }

  /* ———— A5 C#: the guards of the two pushes (SOURCE pins — SingleChatPage / SChatPrefs / SettingsPage are MAUI-only) ———— */
  {
    const sc = stripCode(rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
    const prefs = stripCode(rd('Spixi/Meta/SChatPrefs.cs'));
    const sp = stripCode(rd('Spixi/Pages/Settings/SettingsPage.xaml.cs'));
    const shared = stripCode(rd('Spixi/Utils/SharedItems.cs'));
    const bodyIn = (t, sig) => { const i = t.indexOf(sig); if (i < 0) return ''; let k = t.indexOf('{', i), depth = 0; for (let j = k; j < t.length; j++) { if (t[j] === '{') depth++; else if (t[j] === '}' && --depth === 0) return t.slice(i, j + 1); } return ''; };
    const body = (sig) => bodyIn(sc, sig);
    const proc = body('private void processThumb(ThumbJob job)');
    const thumbOf = body('private static string? chatThumbOf(FileInfo fi)');
    const cand = body('private void noteThumbCandidate(FriendMessage message, string name, UiBatch? batch)');
    const after = body('private void thumbAfterTransfer(string uid, int channel)');   /* ★ #1166 A-N4 re-base: + the transfer's channel */
    const enq = body('private void enqueueThumb(string id, FriendMessage fm)');
    const upd = body('public void updateFile(string uid, string progress, bool complete, int channel)');   /* ★ #1166 A-N4 re-base */
    const changed = body('public void onPhotoPreviewsChanged()');
    const onLoad = body('private void onLoad()');
    const appear = body('protected override void OnAppearing()');
    const loadM = body('public void loadMessages()');
    const prop = bodyIn(prefs, 'public static bool photoPreviews');
    const verb = bodyIn(sp, 'current_url.StartsWith("ixian:photoPreviews:"');   // the verb's branch body
    const r = {
      /* the pref: one fixed key, default TRUE, fail-soft — C-c9: the SETTER writes the SAME key the getter reads
         (a wrong key there = a switch that never changes anything) */
      pref: /private const string KEY_PHOTO_PREVIEWS = "chatPhotoPreviews";/.test(prefs) && /return Preferences\.Default\.Get\(KEY_PHOTO_PREVIEWS, true\);/.test(prop)
        && /catch \(Exception e\)\s*\{\s*Logging\.error\("SChatPrefs\.photoPreviews get failed: " \+ e\.GetType\(\)\.Name\);\s*return true;/.test(prop)
        && /set\s*\{\s*try\s*\{\s*Preferences\.Default\.Set\(KEY_PHOTO_PREVIEWS, value\);\s*\}/.test(prop)
        && (prop.match(/Preferences\.Default\.\w+\(/g) || []).length === 2 && (prop.match(/Preferences\.Default\.\w+\(KEY_PHOTO_PREVIEWS,/g) || []).length === 2
        && (prefs.match(/"chatPhotoPreviews"/g) || []).length === 1,
      /* the caps — A-M3: the source cap IS the G-6b cap (20 MB), not a wider one */
      caps: /public const long ChatThumbSourceMax = SharedItems\.ThumbSourceMax;/.test(sc) && /public const long ThumbSourceMax = 20L \* 1024 \* 1024;/.test(shared)
        && /public const int ChatThumbPx = 320;/.test(sc) && /public const long ChatThumbMaxBytes = 64 \* 1024;/.test(sc),
      /* candidates: an image file ON THIS DEVICE (completed, or MY OWN — A-M2), pref on; a burst defers to messagesDone,
         C-c7: a LIVE row (no batch) enqueues at once */
      candidate: /if \(message == null \|\| message\.id == null \|\| !\(message\.completed \|\| message\.localSender\) \|\| !SharedItems\.isImageName\(name\) \|\| !SChatPrefs\.photoPreviews\)\s*\{\s*return;\s*\}/.test(cand)
        && /if \(batch != null\)\s*\{\s*batch\.thumbs\.Add\(new KeyValuePair<string, FriendMessage>\(id, message\)\);\s*return;\s*\}\s*enqueueThumb\(id, message\);\s*\}$/.test(cand),
      afterPush: /push\(batch, "addFile", [^;]*\);\s*noteThumbCandidate\(message, name, batch\);/.test(sc),
      /* ★ #1166 B2 re-base: the full triple and the prepend branch both end before the thumb queue (a prepended photo gets its preview too) */
      afterDone: /Utils\.sendUiCommand\(this, "messagesDone"\);\s*pushPendingJump\(\);\s*\}\s*else\s*\{[^{}]*\{[^{}]*\}\s*Utils\.sendUiCommand\(this, "messagesDone", show_more\);\s*pushPendingJump\(\);\s*\}\s*foreach \(KeyValuePair<string, FriendMessage> t in batch\.thumbs\)\s*\{\s*enqueueThumb\(t\.Key, t\.Value\);/.test(loadM),
      /* C-c3: updateFile's COMPLETE tick is what asks for the preview of a finished transfer */
      updateFile: /^public void updateFile\(string uid, string progress, bool complete, int channel\)\s*\{\s*Utils\.sendUiCommand\(this, "updateFile", uid, progress, complete\.ToString\(\)\);\s*if \(complete\)\s*\{\s*thumbAfterTransfer\(uid, channel\);\s*voiceAfterTransfer\(uid, channel\);\s*\}\s*\}$/.test(upd),   /* ★ #1166 A-N4 re-base · ★ #1208 re-base: + the voice waveform / play-after-download */
      transfer: /if \(fm == null \|\| fm\.id == null \|\| fm\.type != FriendMessageType\.fileHeader \|\| !\(fm\.completed \|\| fm\.localSender\)\)/.test(after) && /!SharedItems\.isImageName\(name\)/.test(after)
        && /enqueueThumb\(Crypto\.hashToString\(fm\.id\), fm\);/.test(after),
      /* C-c4: the ENQUEUE starts the drainer (the copy in drainThumbs' finally only re-arms a running one) */
      enqueue: /^private void enqueueThumb\(string id, FriendMessage fm\)\s*\{\s*thumbQueue\.Enqueue\(new ThumbJob\(thumbDoc, id, fm\)\);\s*if \(Interlocked\.CompareExchange\(ref thumbWorker, 1, 0\) == 0\)\s*\{\s*Task\.Run\(drainThumbs\);\s*\}\s*\}$/.test(enq),
      /* local-only, C#'s own path rule; size cap; once per (DOCUMENT, message, version) — A-N1; a torn-down page decodes nothing — A-M3 */
      local: /string\? path = SharedItems\.localPathOf\(job\.fm\);\s*if \(path == null\)\s*\{\s*return;\s*\}/.test(proc)
        && /fi\.Length > ChatThumbSourceMax/.test(proc)
        && /string sentKey = job\.doc\.ToString\(System\.Globalization\.CultureInfo\.InvariantCulture\) \+ "\|" \+ job\.id \+ "\|" \+ version;\s*lock \(thumbsSent\)\s*\{\s*if \(!thumbsSent\.Add\(sentKey\)\)/.test(proc)
        && /^private void processThumb\(ThumbJob job\)\s*\{\s*if \(isDisposed \|\| job\.doc != thumbDoc \|\| friend == null \|\| !SChatPrefs\.photoPreviews\)\s*\{\s*return;/.test(proc),
      /* the decode: sniffed first bytes, capped source, the platform thumbnailer at 320, result ≤ 64 KB, JPEG only */
      decode: /fi\.Length > ChatThumbSourceMax \|\| !ImageSniff\.looksLikeImage\(readHead16\(fi\.FullName\)\)/.test(thumbOf)
        && /byte\[\]\? jpeg = Spixi\.SThumbnail\.makeJpeg\(fi\.FullName, ChatThumbPx\);/.test(thumbOf)
        && /jpeg != null && jpeg\.Length > 0 && jpeg\.Length <= ChatThumbMaxBytes\s*\? "data:image\/jpeg;base64," \+ Convert\.ToBase64String\(jpeg\)/.test(thumbOf)
        && thumbOf.indexOf('ImageSniff.looksLikeImage') < thumbOf.indexOf('SThumbnail.makeJpeg'),
      /* A-M3: the process cache evicts its OLDEST entry (FIFO), never a full reset */
      cache: /if \(!chatThumbCache\.ContainsKey\(key\)\)\s*\{\s*while \(chatThumbCache\.Count >= ChatThumbCacheMax && chatThumbOrder\.Count > 0\)\s*\{\s*chatThumbCache\.Remove\(chatThumbOrder\.Dequeue\(\)\);\s*\}\s*chatThumbOrder\.Enqueue\(key\);\s*\}\s*chatThumbCache\[key\] = uri;/.test(thumbOf)
        && !/chatThumbCache\.Clear\(\)/.test(sc),
      /* OFF the UI thread (one drainer), the push ON the main thread, re-checked there (a closed page pushes nothing); id + JPEG only;
         #46 r2 R2-N1: a preview the re-check DROPS gives its once-slot back (the OFF → ON re-flush must find it free) */
      threads: /MainThread\.BeginInvokeOnMainThread\(\(\) =>\s*\{\s*if \(isDisposed \|\| doc != thumbDoc \|\| friend == null \|\| !SChatPrefs\.photoPreviews\)\s*\{\s*lock \(thumbsSent\)\s*\{\s*thumbsSent\.Remove\(sentKey\);\s*\}\s*return;\s*\}\s*Utils\.sendUiCommand\(this, "setFileThumb", id, uri\);/.test(proc)
        && (sc.match(/thumbsSent\.Remove\(/g) || []).length === 1
        && (sc.match(/"setFileThumb"/g) || []).length === 1,
      /* setPhotoPreviews: told in onLoad BEFORE the history load, again on a re-appear, and only on a change */
      tell: /pushHeaderAvatar\(\);\s*thumbDoc\+\+;\s*lock \(thumbsSent\)\s*\{\s*thumbsSent\.Clear\(\);\s*\}\s*photoPreviewsPushed = null;\s*pushPhotoPreviews\(\);/.test(onLoad)
        && onLoad.indexOf('pushPhotoPreviews();') < onLoad.indexOf('loadMessages();')
        && /if \(friend != null && photoPreviewsPushed != null\)\s*\{\s*pushPhotoPreviews\(\);\s*\}\s*if \(presentedFromPreload\)/.test(appear)
        && /if \(photoPreviewsPushed == on\)\s*\{\s*return;\s*\}\s*photoPreviewsPushed = on;\s*Utils\.sendUiCommand\(this, "setPhotoPreviews", on \? "True" : "False"\);/.test(sc)
        && (sc.match(/"setPhotoPreviews"/g) || []).length === 1,
      /* A-M1: the Privacy verb tells EVERY live chat page after it stores; a page told before re-tells only a CHANGE,
         and ON re-flushes so the previews the OFF time never made are queued */
      liveTell: /SChatPrefs\.photoPreviews = status\.Equals\("on", StringComparison\.Ordinal\);\s*Utils\.sendUiCommand\(this, "setPhotoPreviews", SChatPrefs\.photoPreviews\.ToString\(\)\);\s*foreach \(var chat_page in Utils\.getChatPages\(\)\) chat_page\.onPhotoPreviewsChanged\(\);/.test(verb)
        && /if \(friend == null \|\| photoPreviewsPushed == null \|\| photoPreviewsPushed == SChatPrefs\.photoPreviews\)\s*\{\s*return;\s*\}\s*pushPhotoPreviews\(\);\s*if \(photoPreviewsPushed == true\)\s*\{\s*loadMessages\(\);\s*\}/.test(changed)
        && /catch \(Exception e\)\s*\{\s*Logging\.warn\("onPhotoPreviewsChanged failed: " \+ e\.GetType\(\)\.Name\);/.test(changed),
      /* no log line of the block names an id, a path or a name (the gate's log rule) */
      logs: (() => { const blk = sc.slice(sc.indexOf('public const long ChatThumbSourceMax'), sc.indexOf('private static string? chatThumbOf(FileInfo fi)') + thumbOf.length); const lines = blk.match(/Logging\.\w+\([^;]*;/g) || []; return lines.length === 3 && lines.every((l) => /e\.GetType\(\)\.Name\);$/.test(l)); })(),
    };
    ok(Object.values(r).every(Boolean),
      '★★ A5 C# (#1124, 🟡 new push setFileThumb; #46 r1 A-M1 · A-M2 · A-M3 · A-N1 · C-c3 · c4 · c7 · c9): a preview is made only for an image file ON THIS DEVICE (a completed download, or my own) whose path is C#\'s own (SharedItems.localPathOf), ≤ the G-6b 20 MB, first bytes sniffed before the platform decode (SThumbnail 320 px), ≤ 64 KB JPEG, off the UI thread (the enqueue starts the drainer), pushed on the main thread with the message id + the JPEG only, once per document + message + file version (a dropped push frees its slot — #46 r2 R2-N1), after the row\'s own push, a live row at once and a burst at messagesDone, a finished transfer from updateFile\'s complete tick; a torn-down page decodes and pushes nothing; the process cache drops its oldest; setPhotoPreviews (fixed key chatPhotoPreviews read AND written, default true) is told before the first history push, again on a re-appear with a changed value, and to every LIVE chat when the Privacy switch changes; the block logs exception TYPES only (SOURCE pins: MAUI-only C#) — ' + JSON.stringify(r));
  }

  /* ———— #1147 (2) A5-SEND: onSendFile re-queues the preview ONCE the real path is set (SOURCE pin — onSendFile is MAUI-only:
     the picker, TransferManager, StreamProcessor). Walk #1146: insertMessage queued it with the bare name, localPathOf refused it,
     nothing re-queued it until the transfer completed → my sent photo stayed a white glyph tile while sending. ———— */
  {
    const sc = stripCode(rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
    const bodyIn = (t, sig) => { const i = t.indexOf(sig); if (i < 0) return ''; let k = t.indexOf('{', i), depth = 0; for (let j = k; j < t.length; j++) { if (t[j] === '{') depth++; else if (t[j] === '}' && --depth === 0) return t.slice(i, j + 1); } return ''; };
    /* ★ #1208 re-base (session 7): the post-picker half moved, unchanged, into sendPreparedFile (shared with the voice FILE
       route); onSendFile calls it once — the pin reads the moved body and asserts the one call */
    const picker = bodyIn(sc, 'public async Task onSendFile(bool media = true)');
    const send = bodyIn(sc, 'private FriendMessage? sendPreparedFile(string fileName, Stream stream, string filePath)');
    const after = bodyIn(sc, 'private void thumbAfterTransfer(string uid, int channel)');   /* ★ #1166 A-N4 re-base */
    const r = {
      moved: (picker.match(/sendPreparedFile\(fileName, stream, filePath\);/g) || []).length === 1 && !/thumbAfterTransfer\(/.test(picker),
      /* the call sits RIGHT AFTER the path assignment (before the write), with the transfer's own uid */
      order: /friend_message\.transferId = transfer\.uid;\s*friend_message\.filePath = transfer\.filePath;\s*thumbAfterTransfer\(transfer\.uid, transfer\.channel\);\s*IxianHandler\.localStorage\.requestWriteMessages/.test(send),   /* ★ #1166 A-N4 re-base */
      once: (send.match(/thumbAfterTransfer\(/g) || []).length === 1,
      /* what it relies on: the row is found by its transferId, my own (localSender) image file qualifies before completion */
      finds: /fm = list\.Find\(x => x\.transferId == uid\);/.test(after) && /!\(fm\.completed \|\| fm\.localSender\)/.test(after),
      /* the race with insertMessage's own job is deduped per (document, message, file version) */
      dedupe: /if \(!thumbsSent\.Add\(sentKey\)\)\s*\{\s*return;/.test(bodyIn(sc, 'private void processThumb(ThumbJob job)')),
    };
    ok(Object.values(r).every(Boolean),
      '★ #1147 (2) A5-SEND: onSendFile queues the preview again right after it sets the real file path (thumbAfterTransfer(transfer.uid) → finds the row by transferId, my own image qualifies before it completes; thumbsSent dedupes the race) — my sent photo shows under the scrim WHILE it sends — ' + JSON.stringify(r));
  }

  /* ———— #46 r4 MINOR-2 · MINOR-3 (R3-m1, media-bubble.js shownSrcs): the shown-picture set is BOUNDED (256, oldest out) and its
     fingerprint carries the CONTENT tail — executed: a tile shows a picture (its load event), a re-built tile with it is instant ———— */
  {
    const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', pretendToBeVisual: true });
    const W = dom.window;
    W.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    W.eval(rd('src/components/icons.iife.js')); W.eval(rd('src/demo/spixi.iife.js'));
    const S = W.Spixi;
    const head = Buffer.from(JPEG.slice('data:image/jpeg;base64,'.length), 'base64');
    /* distinct pictures of ONE length: the JPEG bytes + a 48-byte tail (64 base64 chars) that differs only in its last digits */
    const pic = (tag) => 'data:image/jpeg;base64,' + Buffer.concat([head, Buffer.from(('#' + tag).padStart(48, 'x'))]).toString('base64');
    const build = (thumb) => { const row = S.createImageFileBubble({ direction: 'sent', name: 'IMG_1.jpg', state: 'complete', thumb, timestamp: Date.now(), strings: {} });
      W.document.body.append(row); return row.querySelector('.c-mbubble'); };
    const show = async (thumb) => { const t = build(thumb); const img = t.querySelector('.c-mbubble__img'); if (img) img.dispatchEvent(new W.Event('load')); await sleep(50); await new Promise((res) => W.requestAnimationFrame(() => W.requestAnimationFrame(res))); return t.dataset.state === 'loaded'; };   /* ★ session 6 (timing): + two frames before the body is cleared — "shown" is recorded a frame after the flip on a CONNECTED tile, and a loaded runner let 50 ms end first (red 1 run in 2 on an unchanged tree) */   /* ★ #1151 re-base: the reveal is one frame after load + decode · #46 r4 M1 re-base: "shown" one frame after that (no fade in jsdom) */
    const instant = (thumb) => { const t = build(thumb); return t.dataset.state === 'loaded' && t.hasAttribute('data-seen'); };
    const r = {};
    /* MINOR-3: two previews of the SAME length, different tails — showing one does not make the other instant */
    const pA = pic('tailA'), pB = pic('tailB');
    r.sameLength = pA.length === pB.length && pA !== pB && pA.slice(0, -64) === pB.slice(0, -64);
    r.shownA = await show(pA);
    r.aInstant = instant(pA);
    r.bNotInstant = !instant(pB);
    /* MINOR-2: 257 distinct pictures shown → the FIRST is out (no longer instant); the last ones are still in */
    W.document.body.textContent = '';
    const many = Array.from({ length: 257 }, (_, i) => pic('n' + String(i).padStart(4, '0')));
    r.allLengths = many.every((p) => p.length === many[0].length);
    let shownAll = true;
    for (const p of many) { if (!(await show(p))) shownAll = false; W.document.body.textContent = ''; }
    r.shownAll = shownAll;
    r.lastInstant = instant(many[256]) && instant(many[1]);   // (the 2nd is the oldest left: exactly 256 kept)
    r.firstEvicted = !instant(many[0]);
    ok(Object.values(r).every(Boolean),
      '★ #46 r4 MINOR-2 · MINOR-3 (R3-m1): the shown-picture set keeps 256 pictures (the 257th shown pushes the FIRST out — a re-built tile with it fades again) and its fingerprint tells two previews of the same length apart by their tail — ' + JSON.stringify(r));
    W.close();
  }

  /* ———— #1147 (3): "Click to download" on :root[data-desktop] (card + tile); touch keeps "Tap" — the BUILT shell, executed ———— */
  {
    /* jsdom's UA is not a phone → the shell's boot script sets data-desktop; ?mobile=1 is the shell's own override */
    const bootQ = async (q) => {
      const f = join(root, 'Spixi/Resources/Raw/html/chat.html');
      const errs = [];
      const vc = new VirtualConsole();
      vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
      const dom = new JSDOM(readFileSync(f, 'utf8'), {
        runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f + q, virtualConsole: vc,
        beforeParse(w) {
          w.matchMedia = (mq) => ({ matches: false, media: mq, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
          try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
          w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
          w.Element.prototype.scrollIntoView = function () {};
        },
      });
      await sleep(1800);
      const W = dom.window;
      const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map(b64));
      return { W, push, errs };
    };
    const lines = async (q) => {
      const { W, push, errs } = await bootQ(q);
      push('onChatScreenReady', 'addrPeer');
      push('setChatMode', '0', '0', '', 'False');
      push('setPhotoPreviews', 'True');
      push('clearMessages', 'false');
      push('addFile', 'd1', 'addrPeer', 'Bob', '', 'fd1', 'report.pdf', String(T0), 'False', 'False', 'False', '0', 'False', 'False', 'True');
      push('addFile', 'd2', 'addrPeer', 'Bob', '', 'fd2', 'IMG_9.jpg', String(T0 + 5), 'False', 'False', 'False', '0', 'False', 'False', 'True');
      if (typeof W.messagesDone === 'function') push('messagesDone');
      push('onChatScreenLoaded');
      await sleep(300);
      const d = W.document;
      const card = d.querySelector('#messages [data-msgid="d1"] .c-fbubble__meta');
      const tile = d.querySelector('#messages [data-msgid="d2"] .c-mbubble__cta');
      const out = { desktop: d.documentElement.hasAttribute('data-desktop'), card: card ? card.textContent : null, tile: tile ? tile.textContent : null, errs: errs.length };
      W.close();
      return out;
    };
    const dk = await lines('?desktop=1');
    const mb = await lines('?mobile=1');
    const en = JSON.parse(rd('src/strings/en-us.json'));
    const locs = ['de-de', 'es-co', 'fr-fr', 'sr-sp', 'sl-si', 'ru-ru', 'pt-br', 'it-it', 'id-id', 'lt-lt', 'cn-cn', 'ja-jp'];
    const tr = locs.map((c) => JSON.parse(rd('src/strings/' + c + '.json')).clickToDownload);
    ok(dk.desktop && dk.card === 'Click to download' && dk.tile === 'Click to download' && dk.errs === 0
      && !mb.desktop && mb.card === 'Tap to download' && mb.tile === 'Tap to download' && mb.errs === 0
      && en.clickToDownload === 'Click to download' && tr.every((v) => typeof v === 'string' && v && v !== 'Click to download'),
      '★ #1147 (3): an offered file says "Click to download" on desktop (:root[data-desktop], a mouse) on the file CARD and the photo TILE; a phone keeps "Tap to download"; the key clickToDownload is translated in all 12 locales — ' + JSON.stringify({ dk, mb, tr }));
  }

  /* ———— #1147 (5): photo fade on chat open — the BUILT shell, executed: a LOCAL photo tile waits QUIET (no face), the
     picture fades in when setFileThumb lands, the face fades in after PHOTO_QUIET_MS with no preview; an OFFERED /
     downloading received tile shows its face at once; the r3 "seen" re-show stays instant ———— */
  {
    const { dom, W, push, errs } = await boot('chat.html');
    const d = W.document;
    push('onChatScreenReady', 'addrPeer');
    push('setChatMode', '0', '0', '', 'False');
    push('setPhotoPreviews', 'True');
    push('clearMessages', 'false');
    /* ★ session 6 (timing): the stylesheet walk runs BEFORE the clock starts — the sheets are static, and under a loaded
       full run the walk inside the 600 ms quiet window pushed the "still quiet" checks past it (red 2 runs in 3) */
    const rules = rulesOf(W);
    const t0 = Date.now();
    push('addFile', 'q1', 'addrPeer', 'Me', '', 'fq1', 'IMG_q1.jpg', String(T0), 'True', 'True', 'True', '100', 'True', 'False', 'True');      // mine, complete
    push('addFile', 'q2', 'addrPeer', 'Bob', '', 'fq2', 'IMG_q2.jpg', String(T0 + 1), 'False', 'False', 'False', '100', 'True', 'False', 'True'); // downloaded
    push('addFile', 'q3', 'addrPeer', 'Bob', '', 'fq3', 'IMG_q3.jpg', String(T0 + 2), 'False', 'False', 'False', '0', 'False', 'False', 'True');  // offered
    push('addFile', 'q4', 'addrPeer', 'Bob', '', 'fq4', 'IMG_q4.jpg', String(T0 + 3), 'False', 'False', 'False', '40', 'False', 'False', 'True'); // downloading
    push('addFile', 'q5', 'addrPeer', 'Me', '', 'fq5', 'IMG_q5.jpg', String(T0 + 4), 'True', 'False', 'False', '30', 'False', 'False', 'True');   // mine, sending
    if (typeof W.messagesDone === 'function') push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(150);
    const tileOf = (id) => d.querySelector('#messages [data-msgid="' + id + '"] .c-mbubble');
    const faceOf = (id) => { const t = tileOf(id); return t && t.querySelector('.c-mbubble__file'); };
    const quiet = (id) => { const f = faceOf(id); return !!f && tileOf(id).hasAttribute('data-quiet') && matching(rules, f, 'opacity').pop() === '0'; };
    const faceShown = (id) => { const f = faceOf(id); return !!f && !tileOf(id).hasAttribute('data-quiet') && matching(rules, f, 'opacity').pop() !== '0'; };
    const fades = (el, prop) => matching(rules, el, 'transition').pop() === prop + ' var(--duration-200) var(--easing-standard)';
    const r = {};
    /* before: the local tiles are quiet (the ground, no glyph); the offered / downloading ones show the face at once */
    r.quietBefore = quiet('q1') && quiet('q2') && quiet('q5') && !!tileOf('q1') && tileOf('q1').dataset.state === 'idle';
    r.offerAtOnce = faceShown('q3') && faceShown('q4');
    r.faceFadesIn = fades(faceOf('q2'), 'opacity');
    const until = async (ms) => { while (Date.now() - t0 < ms) await sleep(10); };
    /* the preview lands (C# sends it within the wait): the picture fades in (the first-show fade) over the quiet ground;
       no face ever showed */
    await until(200);
    push('setFileThumb', 'q1', JPEG);
    await sleep(20);
    const img1 = tileOf('q1') && tileOf('q1').querySelector('.c-mbubble__img');
    r.loading = !!img1 && tileOf('q1').dataset.state === 'loading' && quiet('q1');
    if (img1) img1.dispatchEvent(new W.Event('load'));
    await sleep(40);   /* ★ #1151 re-base: the reveal is one frame after load + decode */
    r.pictureFades = tileOf('q1').dataset.state === 'loaded' && !tileOf('q1').hasAttribute('data-seen') && fades(img1, 'opacity')
      && matching(rules, img1, 'opacity').pop() === '1' && matching(rules, faceOf('q1'), 'opacity').pop() === '0';
    /* MY sending photo: its picture lands → its scrim face (ring, %) fades in WITH it */
    push('setFileThumb', 'q5', JPEG);
    await sleep(20);
    const img5 = tileOf('q5').querySelector('.c-mbubble__img');
    img5.dispatchEvent(new W.Event('load'));
    await sleep(40);   /* ★ #1151 re-base: the reveal is one frame after load + decode */
    r.sendingFaceWithPicture = tileOf('q5').dataset.state === 'loaded' && faceShown('q5') && fades(faceOf('q5'), 'opacity');
    /* a re-render inside the wait (a live row rebuilds every row) does NOT restart it */
    await until(350);
    push('addThem', 'q6', 'addrPeer', 'Bob', '', 'a live line', String(T0 + 9));
    await sleep(60);
    r.rebuiltStillQuiet = quiet('q2');
    /* no preview within the wait: the face fades in (no instant pop) — at ~600 ms from the FIRST build, not the rebuild */
    const tQuiet = Date.now() - t0;
    r.stillQuietLate = tQuiet < 560 && quiet('q2');
    await until(760);
    r.glyphAfter = faceShown('q2') && fades(faceOf('q2'), 'opacity');
    /* reduced motion: the fade token is 0 ms there (tokens.css) → no fades, instant */
    const rootRM = rules.filter((x) => x.sel === ':root' && RM.test(x.media || '')).map((x) => x.style.getPropertyValue('--duration-200').trim()).filter(Boolean);
    r.reducedInstant = rootRM.includes('0ms');
    /* the r3 "seen" re-show: a re-built q1 shows its picture at once (loaded + data-seen), never quiet */
    push('addThem', 'q7', 'addrPeer', 'Bob', '', 'another line', String(T0 + 10));
    await sleep(80);
    r.seenInstant = tileOf('q1').dataset.state === 'loaded' && tileOf('q1').hasAttribute('data-seen') && !tileOf('q1').hasAttribute('data-quiet');
    r.noErr = errs.length === 0;
    ok(Object.values(r).every(Boolean),
      '★ #1147 (5) photo fade on chat open (Damir): a LOCAL photo tile (mine, or downloaded) waits QUIET — the tile ground, no glyph — and the preview fades in over it (--duration-200, the first-show fade); with no preview in ~600 ms (from the first build — a re-render does not restart it) the face fades in; MY sending photo\'s scrim face fades in with its picture; an offered / downloading tile shows its face at once; reduced motion = 0 ms; the r3 re-show stays instant — ' + JSON.stringify(r) + (errs.length ? ' errs=' + errs.slice(0, 2).join(' | ') : ''));
    dom.window.close();
  }
}
