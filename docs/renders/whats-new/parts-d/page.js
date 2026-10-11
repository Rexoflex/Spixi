/* SPIXI ART DIRECTION — page wiring: the card mocks (swipe / dots / Next), the scene grids, the Spark eyes that
   follow the pointer, the theme switch for the art, replay. Render only. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const COPY = [
    { k: 'hero', eyebrow: 'New in Spixi 1.0', title: 'Meet the new Spixi', body: 'Redesigned from top to bottom, with new ways to talk. Your chats, contacts and wallet are all still here.' },
    { k: 'voice', title: 'Voice messages', body: 'Record a message instead of typing it. Contacts on an older Spixi get it as an audio file.' },
    { k: 'privacy', title: 'Your privacy, your switches', body: 'Hide read receipts, typing and your online status. You find all three in Settings › Privacy.' },
  ];
  const DIRS = ['lens', 'press', 'spark'];
  let artTheme = 'light';
  try { artTheme = localStorage.getItem('ad-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch (e) { /* storage may be blocked */ }

  /* ---------- the card mock ---------- */
  function card(dir, host) {
    host.innerHTML = '';
    const root = el('div', 'mc ad'); root.dataset.t = artTheme; root.dataset.dir = dir;
    const art = el('div', 'mc__art'); const txt = el('div', 'mc__text');
    const foot = el('div', 'mc__foot'); const dots = el('div', 'mc__dots'); dots.setAttribute('role', 'tablist');
    const next = el('button', 'mc__btn', 'Next'); next.type = 'button';
    let i = 0;
    const dotEls = COPY.map((c, k) => { const b = el('button', 'mc__dot'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', (k + 1) + ' / 3'); b.addEventListener('click', () => go(k)); dots.append(b); return b; });
    foot.append(dots, next);
    root.append(art, txt, foot); host.append(root);
    function go(k) {
      i = Math.max(0, Math.min(COPY.length - 1, k));
      const c = COPY[i];
      art.innerHTML = AD[dir](c.k);
      txt.innerHTML = '';
      if (c.eyebrow) txt.append(el('p', 'mc__eyebrow', c.eyebrow));
      txt.append(el('h3', 'mc__title', c.title), el('p', 'mc__body', c.body));
      txt.classList.remove('mc__text--in'); void txt.offsetWidth; txt.classList.add('mc__text--in');
      dotEls.forEach((d, n) => d.setAttribute('aria-selected', String(n === i)));
      next.textContent = i === COPY.length - 1 ? 'Got it' : 'Next';
      root.dataset.hero = i === 0 ? '1' : '0';
    }
    next.addEventListener('click', () => go(i < COPY.length - 1 ? i + 1 : 0));
    let x0 = null;
    root.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; x0 = e.clientX; });
    root.addEventListener('pointerup', (e) => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); });
    root.tabIndex = 0;
    root.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1); });
    go(0);
  }

  /* ---------- the scene grid: three moments × two themes ---------- */
  function grid(dir, host) {
    host.innerHTML = '';
    ['light', 'dark'].forEach((t) => COPY.forEach((c) => {
      const cell = el('figure', 'sg ad'); cell.dataset.t = t;
      const box = el('div', 'sg__box'); box.innerHTML = AD[dir](c.k);
      const cap = el('figcaption', '', c.title + ' · ' + t);
      cell.append(box, cap); host.append(cell);
    }));
  }

  /* ---------- the logo insight: the mark draws itself, the lens lights, the dots appear ---------- */
  function insight() {
    const g = AD.geometry;
    $('#mark').innerHTML = '<svg viewBox="86 10 256 226" class="mark" aria-hidden="true"><defs><clipPath id="mkc"><path d="' + g.CIRC + '"/></clipPath></defs>'
      + '<g clip-path="url(#mkc)"><path class="mark__lens" d="' + g.LEAF + '"/></g>'
      + '<path class="mark__l" pathLength="1" d="' + g.CIRC + '"/><path class="mark__l mark__l--2" pathLength="1" d="' + g.LEAF + '"/>'
      + '<circle class="mark__d" cx="196" cy="120" r="6"/><circle class="mark__d mark__d--2" cx="214" cy="134" r="8.5"/>'
      + '<g class="mark__lab"><text x="104" y="222">you</text><text x="300" y="26">them</text><text x="236" y="190">your space</text><path d="M232 186L214 160"/></g></svg>';
  }

  /* ---------- Spark: the eyes look at the pointer (and at the swipe) ---------- */
  let raf = 0, px = 0, py = 0;
  function look() {
    raf = 0;
    $$('.ad-spark').forEach((s) => {
      const r = s.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight) return;
      const k = r.width / 400, cx = r.left + 205 * k, cy = r.top + 128 * k * (r.height / (240 * k));
      const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy) || 1, m = Math.min(1, d / 260);
      s.style.setProperty('--ex', (dx / d * 3.2 * m).toFixed(2) + 'px'); s.style.setProperty('--ey', (dy / d * 3.2 * m).toFixed(2) + 'px');
    });
  }
  addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(look); }, { passive: true });

  /* ---------- page ---------- */
  function renderAll() {
    DIRS.forEach((d) => { card(d, $('#card-' + d)); grid(d, $('#grid-' + d)); });
    $$('.themeseg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === artTheme)));
  }
  $$('.themeseg button').forEach((b) => b.addEventListener('click', () => { artTheme = b.dataset.v; try { localStorage.setItem('ad-theme', artTheme); } catch (e) { /* */ } renderAll(); }));
  $('#replay').addEventListener('click', renderAll);
  $('#rm').addEventListener('change', (e) => { document.documentElement.classList.toggle('rm', e.target.checked); renderAll(); });
  insight(); renderAll();
})();
