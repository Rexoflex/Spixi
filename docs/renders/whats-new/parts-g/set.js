/* SPIXI · THE ILLUSTRATION SET, ALIGNED — page wiring. Render only. */
(function () {
  'use strict';
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const ico = (n) => { const s = el('span', 'ico'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = ICONS[n] || ''; return s; };
  let seq = 0;
  /* today's drawing, exactly as illustrations.js builds it; `lessShine` halves every gloss sheet (the *Gl gradients) */
  function illo(name, lessShine) {
    const a = SET.il[name]; seq += 1;
    let b = a.b.split('@@').join('-s' + seq);
    if (lessShine) b = b.replace(/(<linearGradient id="[A-Za-z0-9]+Gl-s\d+"[^>]*>)(.*?)(<\/linearGradient>)/g, (m, o, inner, c) => o + inner.replace(/stop-opacity="([\d.]+)"/g, (mm, v) => 'stop-opacity="' + (+v * .5).toFixed(3).replace(/0+$/, '').replace(/\.$/, '') + '"') + c);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + a.vb + '" class="' + a.cls + '"' + (a.style ? ' style="' + a.style + '"' : '') + ' aria-hidden="true" focusable="false">' + b + '</svg>';
  }

  /* ---- welcome: A today, B on the panel ---- */
  const SL = [1, 2, 3, 4].map((n) => ({ art: 'welcome' + n, t: SET.str['slide' + n + 'Title'], c: SET.str[n === 1 ? 'slide1Copy2' : 'slide' + n + 'Copy'] }));
  /* the panel: the locked carousel's vivid ground (dark set, the launch flow is pinned dark), white sparkles, and a QUIET wall that
     names the slide — bubbles · ID cards · coins · app tiles — at half the What's new strength */
  function panel(n) {
    const W = [
      (x, y, g) => '<rect x="' + x + '" y="' + y + '" width="56" height="24" rx="12" fill="' + g + '"/>',
      (x, y, g) => '<rect x="' + x + '" y="' + (y - 6) + '" width="48" height="32" rx="7" fill="' + g + '"/><circle cx="' + (x + 13) + '" cy="' + (y + 10) + '" r="6" fill="#fff" fill-opacity=".35"/>',
      (x, y, g) => '<circle cx="' + (x + 16) + '" cy="' + (y + 12) + '" r="15" fill="' + g + '"/><circle cx="' + (x + 16) + '" cy="' + (y + 12) + '" r="10" fill="none" stroke="#fff" stroke-opacity=".35"/>',
      (x, y, g) => '<rect x="' + x + '" y="' + (y - 4) + '" width="32" height="32" rx="10" fill="' + g + '"/>',
    ][n - 1];
    const gr = ['#B48CFF', '#7FD3FF', '#FF9ACB', '#C7A6FF'];
    let wall = ''; for (let r = 0; r < 7; r++) for (let c = 0; c < 6; c++) wall += W(-20 + c * 62 + (r % 2) * 31, -6 + r * 40, gr[(r + c) % 4]);
    let st = ''; let s0 = n * 17; const rnd = () => { s0 = (s0 * 9301 + 49297) % 233280; return s0 / 233280; };
    for (let i = 0; i < 26; i++) st += '<circle cx="' + (rnd() * 300).toFixed(1) + '" cy="' + (rnd() * 250).toFixed(1) + '" r="' + (.6 + rnd()).toFixed(2) + '" fill="#fff" opacity="' + (.3 + rnd() * .5).toFixed(2) + '"/>';
    return '<svg class="wnL" viewBox="0 0 300 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="pg' + n + '-' + (++seq) + '" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#2c5fd8"/><stop offset="1" stop-color="#6a2fc8"/></linearGradient></defs>'
      + '<rect width="300" height="250" fill="url(#pg' + n + '-' + seq + ')"/><g opacity=".14" class="wn-pan wn-loop">' + wall + '</g>' + st + '</svg>';
  }
  const phones = [];
  function welcome(opt) {
    const w = el('div', 'wl sx' + (opt === 'b' ? ' wl--b' : '')); w.setAttribute('data-sxt', 'dark');
    const top = el('div', 'wl__top'); top.append(el('span', 'wl__pill', 'English'), el('span', 'wl__pill', '◐'));
    const logo = el('div', 'wl__logo'); logo.append(ico('logo'));
    const car = el('div', 'wl__car'); const tr = el('div', 'wl__track'); car.append(tr);
    SL.forEach((s, k) => { const sl = el('div', 'wl__slide'); sl.setAttribute('aria-hidden', String(k !== 0)); const art = el('div', 'wl__art');
      art.innerHTML = (opt === 'b' ? panel(k + 1) : '') + illo(s.art, false); sl.append(art, el('h3', '', s.t), el('p', '', s.c)); tr.append(sl); });
    const dots = el('div', 'wl__dots'); dots.setAttribute('role', 'tablist');
    const ds = SL.map((s, k) => { const d = el('button', 'wl__dot'); d.type = 'button'; d.setAttribute('role', 'tab'); d.setAttribute('aria-label', (k + 1) + ' / 4'); d.addEventListener('click', () => go(k)); dots.append(d); return d; });
    const cta = el('div', 'wl__cta'); const p = el('button', 'p', SET.str.createCta); const o = el('button', 'o', SET.str.restoreCta); p.type = o.type = 'button'; cta.append(p, o);
    w.append(top, logo, car, dots, cta);
    let x0 = null; car.addEventListener('pointerdown', (e) => { x0 = e.clientX; }); car.addEventListener('pointerup', (e) => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1)); });
    phones.push({ tr, ds, slides: tr.children });
    return w;
  }
  let cur = 0;
  function go(k) { cur = (k + 4) % 4; phones.forEach((p) => { p.tr.style.transform = 'translateX(' + (-100 * cur) + '%)'; p.ds.forEach((d, i) => d.setAttribute('aria-selected', String(i === cur))); Array.from(p.slides).forEach((s, i) => s.setAttribute('aria-hidden', String(i !== cur))); }); }
  const wh = document.getElementById('welc');
  [['a', 'A · today: the art on the launch ground'], ['b', 'B · the art on the carousel panel']].forEach(([o, cap]) => { const f = el('figure', ''); f.style.margin = '0'; f.append(welcome(o), el('figcaption', 'wl__cap', cap)); wh.append(f); });
  go(0);
  let auto = setInterval(() => go(cur + 1), 4200);
  wh.addEventListener('pointerdown', () => { clearInterval(auto); });

  /* ---- the set: today | less shine (backup: the calm chest) ---- */
  const NAMES = ['welcome1', 'welcome2', 'welcome3', 'welcome4', 'restore', 'chatsEmpty', 'contactsEmpty', 'addContact', 'appsEmpty', 'explore', 'backup', 'rating', 'walletEmptyA'];
  let theme = 'light';
  function grid() {
    const g = document.getElementById('setgrid'); g.innerHTML = '';
    NAMES.forEach((n) => {
      const f = el('figure', 'sg'); const pr = el('div', 'sg__pair');
      [['Today', illo(n, false)], [n === 'backup' ? 'Calm chest' : 'Less shine', n === 'backup' ? KIT.scene('chest').fg : illo(n, true)]].forEach(([lab, svg]) => { const c = el('div', 'sg__c sx'); c.setAttribute('data-sxt', theme); c.innerHTML = svg; c.append(el('span', '', lab)); pr.append(c); });
      const cap = el('figcaption'); cap.append(el('b', '', n)); f.append(pr, cap); g.append(f);
    });
    document.querySelectorAll('#c-th .seg').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === theme)));
  }
  document.querySelectorAll('#c-th .seg').forEach((b) => b.addEventListener('click', () => { theme = b.dataset.v; grid(); }));
  grid();
})();
