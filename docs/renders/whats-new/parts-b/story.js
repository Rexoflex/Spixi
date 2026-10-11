/* DIRECTION B — LIVE UI STORIES (render JS). Each story builds a small live slice of the app from the Spixi tokens
   and plays the feature with a ghost finger on a virtual clock (hold = pause). Render only: no bridge, no fetch. */
(function () {
  'use strict';
  const D = DATA;
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rm = () => document.documentElement.classList.contains('rm') || (matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function icon(name, size) { const s = el('span', 'ico'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = ICONS[name] || ''; if (size) { s.style.width = s.style.height = size + 'px'; } return s; }
  function S(loc, k) { const t = D.str[loc] && D.str[loc][k]; return t != null ? t : D.str['en-us'][k]; }
  function button(label, { type = 'fill', size = 56, iconName = null, cls = '' } = {}) {
    const b = el('button', 'c-button ' + cls); b.type = 'button'; b.dataset.type = type; b.dataset.size = String(size);
    b.append(el('span', 'c-button__label', label)); if (iconName) { const i = icon(iconName); i.classList.add('c-button__icon'); b.append(i); }
    return b;
  }
  const PH = [['#9DB6FF', '#E3E4FE'], ['#A48DFF', '#F1EAFF'], ['#5A6CF2', '#B4D0FF'], ['#8466F2', '#CBCFFE'], ['#E9A7C8', '#F7E3EE'], ['#7DC9B4', '#DDF5EE']];
  const phBg = (k) => 'linear-gradient(160deg,' + PH[k % PH.length][0] + ',' + PH[k % PH.length][1] + ')';

  /* ---------- backdrops (as in direction A) ---------- */
  const ROWS = [
    { n: 'Ana Kovač', x: 'Did the payment arrive?', t: '10:42', u: 2, h: [212, 262] }, { n: 'Spixi Group Chat', x: 'Luka: The new build is out', t: '10:15', u: 0, h: [252, 292] },
    { n: 'Marko Petek', x: 'See you at 6', t: '09:58', u: 1, h: [18, 340] }, { n: 'Mia Horvat', x: 'Photo', t: 'Yesterday', u: 0, h: [160, 200] },
    { n: 'Tomaž', x: 'You sent 25 IXI', t: 'Yesterday', u: 0, h: [28, 8] }, { n: 'Eva Zupan', x: 'Thanks!', t: 'Mon', u: 0, h: [300, 330] }, { n: 'Jan', x: 'Ok', t: 'Sun', u: 0, h: [120, 170] },
  ];
  function rowEl(r, k) {
    const row = el('div', 'row'); if (k != null) row.style.setProperty('--k', k);
    const av = el('div', 'row__av', r.n.split(' ').map((w) => w[0]).join('').slice(0, 2));
    av.style.background = 'linear-gradient(140deg, hsl(' + r.h[0] + ' 72% 64%), hsl(' + r.h[1] + ' 62% 46%))';
    const mid = el('div', 'row__mid'); mid.append(el('div', 'row__name', r.n), el('div', 'row__ex', r.x));
    const meta = el('div', 'row__meta'); meta.append(el('span', '', r.t)); if (r.u) meta.append(el('span', 'row__badge', String(r.u)));
    row.append(av, mid, meta); return row;
  }
  function topbar(loc) { const top = el('div', 'home__top'); top.append(el('div', 'home__title', S(loc, 'chats'))); ['search', 'message-plus'].forEach((n) => { const b = el('span', 'home__iconbtn'); b.append(icon(n)); top.append(b); }); return top; }
  function homePhone(loc) {
    const h = el('div', 'home'); h.setAttribute('aria-hidden', 'true');
    const st = el('div', 'home__status'); st.append(el('span', '', '10:11'), el('span', '', '5G · 66%'));
    const l = el('div', 'home__list'); ROWS.forEach((r) => l.append(rowEl(r)));
    const nav = el('div', 'home__nav');
    [['messages', 'chats'], ['wallet', 'wallet'], ['apps', 'apps'], ['settings', 'account']].forEach(([ic, k], i) => { const it = el('div', 'home__navitem'); if (!i) it.dataset.on = ''; it.append(icon(ic), el('span', '', S(loc, k))); nav.append(it); });
    h.append(st, topbar(loc), l, nav); return h;
  }
  function homeDesktop(loc) {
    const h = el('div', 'homeD'); h.setAttribute('aria-hidden', 'true');
    const rail = el('div', 'homeD__rail'); const logo = icon('logo'); logo.classList.add('logo'); rail.append(logo);
    ['messages', 'wallet', 'apps', 'settings'].forEach((n, i) => { const b = el('div', 'homeD__railbtn'); if (!i) b.dataset.on = ''; b.append(icon(n)); rail.append(b); });
    const l = el('div', 'homeD__list'); const lst = el('div', 'home__list'); ROWS.forEach((r) => lst.append(rowEl(r))); l.append(topbar(loc), lst);
    h.append(rail, l, el('div', 'homeD__detail', 'Select a chat')); return h;
  }
  function aboutPhone(loc, onOpen) {
    const a = el('div', 'about');
    const st = el('div', 'home__status'); st.append(el('span', '', '10:11'), el('span', '', '5G · 66%'));
    const top = el('div', 'about__top'); top.append(icon('arrow-left'), el('b', '', S(loc, 'about')));
    const hero = el('div', 'about__hero'); const lg = el('div', 'about__logo'); lg.append(icon('logo'));
    hero.append(lg, el('div', 'about__name', 'Spixi'), el('div', 'about__ver', S(loc, 'aboutVersion') + ' ' + D.version + '.0'), el('div', 'about__tag', S(loc, 'aboutTagline2')));
    const card = el('div', 'about__card');
    const row = (ico, title, sub, isNew, click) => {
      const r = el('button', 'about__row'); r.type = 'button';
      const ic = el('span', 'about__rico' + (isNew ? ' about__rico--new' : '')); ic.append(icon(ico));
      const t = el('span', 'about__rt'); t.append(el('b', '', title), el('span', '', sub)); r.append(ic, t);
      if (isNew) r.append(el('span', 'about__new', S(loc, 'whatsNewBadge')));
      const ch = icon('chevron-right'); ch.classList.add('about__chev'); r.append(ch);
      if (click) r.addEventListener('click', click); else r.tabIndex = -1; card.append(r);
    };
    row('rocket', S(loc, 'whatsNew'), S(loc, 'whatsNewSub').replace('{0}', D.version), true, onOpen);
    row('info-circle', S(loc, 'howToUse'), S(loc, 'howToUseSub')); row('star', S(loc, 'aboutRate'), S(loc, 'aboutRateBody')); row('shield-lock', S(loc, 'aboutLegalSupport'), S(loc, 'aboutSub'));
    a.append(st, top, hero, card); return a;
  }

  /* ---------- the ghost finger + a virtual clock ---------- */
  function finger(stage) {
    const g = el('div', 'gf'); stage.append(g);
    const k = () => (stage.getBoundingClientRect().width / stage.offsetWidth) || 1;
    const xy = (node, fx = .5, fy = .5) => { const s = stage.getBoundingClientRect(), r = node.getBoundingClientRect(); return [(r.left - s.left + r.width * fx) / k(), (r.top - s.top + r.height * fy) / k()]; };
    return {
      to(node, fx, fy) { const [x, y] = xy(node, fx, fy); g.style.transform = 'translate(' + x + 'px,' + y + 'px)'; g.setAttribute('data-show', ''); },
      xy, press() { g.setAttribute('data-press', ''); }, up() { g.removeAttribute('data-press'); }, hide() { g.removeAttribute('data-show'); },
    };
  }
  function Clock(steps, onEnd, dur) {
    let t = 0, last = 0, i = 0, raf = 0, paused = false, alive = true;
    steps.sort((a, b) => a[0] - b[0]);
    const tick = (now) => {
      if (!alive) return;
      if (!last) last = now;
      if (!paused) t += now - last;
      last = now;
      while (i < steps.length && steps[i][0] <= t) { try { steps[i][1](); } catch (e) { /* a step on a removed node */ } i++; }
      if (t >= dur) { alive = false; onEnd(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return { pause(p) { paused = p; }, stop() { alive = false; cancelAnimationFrame(raf); }, finish() { while (i < steps.length) { try { steps[i][1](); } catch (e) { /* */ } i++; } } };
  }

  /* ---------- mini UI parts ---------- */
  function bubble(dir, text, meta) { const b = el('div', 'mb mb--' + dir); const t = el('span', 'mb__t', text); b.append(t); if (meta) b.append(el('span', 'mb__meta', meta)); return b; }
  function composer(loc) {
    const c = el('div', 'cmp'); const plus = el('span', 'cmp__btn cmp__btn--plain'); plus.append(icon('circle-plus'));
    const pill = el('div', 'cmp__pill'); pill.dataset.ph = 'Message'; const go = el('span', 'cmp__btn'); go.append(icon('microphone'));
    c.append(plus, pill, go); c._plus = plus; c._pill = pill; c._go = go;
    c.setGo = (name) => { go.innerHTML = ''; go.append(icon(name)); };
    return c;
  }
  function wave(n, seed) { const w = el('div', 'wave'); for (let k = 0; k < n; k++) { const i = el('i'); i.style.setProperty('--k', k); i.style.height = (25 + Math.round(70 * Math.abs(Math.sin(k * .7 + seed)))) + '%'; w.append(i); } return w; }
  function history(mc, lines) { const d = el('div', 'mday', 'Today'); mc.append(d); lines.forEach(([dir, t, m]) => mc.append(bubble(dir, t, m))); }

  /* ---------- the six stories ---------- */
  const STORIES = {
    hero(stage, F, loc) {
      const rows = el('div', 'rows'); ROWS.slice(0, 5).forEach((r, k) => rows.append(rowEl(r, k))); stage.append(rows);
      const mc = el('div', 'mc'); mc.style.transform = 'translateX(100%)';
      mc.append(bubble('in', 'Did the payment arrive?', '10:42'), bubble('out', 'Yes, just now. Thanks!', '10:43 ✓✓'), composer(loc)); stage.append(mc);
      const r0 = rows.children[0];
      return { dur: 4800, steps: [
        [1700, () => F.to(r0, .3, .5)], [2000, () => F.press()],
        [2150, () => { F.up(); r0.style.background = 'var(--surface-interactive-pressed, rgba(0,0,0,.06))'; }],
        [2350, () => { rows.style.transition = 'transform 300ms var(--easing-standard), opacity 300ms'; rows.style.transform = 'translateX(-30%)'; rows.style.opacity = '0'; mc.style.transform = 'none'; F.hide(); }],
      ] };
    },
    reply(stage, F, loc) {
      const mc = el('div', 'mc'); const inb = bubble('in', 'Dinner at 7?', '18:02'); const cmp = composer(loc);
      history(mc, [['out', 'Back in town tonight', '17:40 ✓✓'], ['in', 'Nice! Want to meet?', '17:58']]); mc.append(inb, cmp); stage.append(mc);
      let out = null; const text = 'Yes! See you'; const steps = [];
      steps.push([300, () => F.to(inb, .25, .5)], [600, () => F.press()], [650, () => { inb.style.transform = 'translateX(46px)'; F.to(inb, .6, .5); }],
        [1050, () => { F.up(); inb.style.transform = ''; const q = el('span', 'cmp__q'); q.append(el('b', '', 'Ana'), document.createTextNode('Dinner at 7?')); cmp._pill.textContent = ''; cmp._pill.append(q); cmp._pill._tx = document.createTextNode(''); cmp._pill.append(cmp._pill._tx); F.to(cmp._pill, .5, .7); }],
        [1250, () => F.hide()]);
      for (let k = 1; k <= text.length; k++) steps.push([1300 + k * 65, () => { cmp._pill._tx.data = text.slice(0, k); if (k === 1) cmp.setGo('send-2'); }]);
      steps.push([2250, () => F.to(cmp._go)], [2450, () => F.press()],
        [2550, () => { F.up(); out = bubble('out', '', '18:03 ✓✓'); const q = el('span', 'mb__q'); q.append(el('b', '', 'Ana'), document.createTextNode('Dinner at 7?'));
          out.insertBefore(q, out.firstChild); out.querySelector('.mb__t').textContent = text; mc.insertBefore(out, cmp); cmp._pill.textContent = ''; cmp.setGo('microphone'); }],
        [3050, () => F.to(inb, .4, .5)], [3150, () => { F.press(); inb.style.transform = 'scale(.97)'; }],
        [3450, () => { F.up(); inb.style.transform = ''; const [x, y] = F.xy(inb, 0, 0); const bar = el('div', 'rbar'); ['❤️', '😂', '👍', '😮', '😢', '🙏'].forEach((e) => bar.append(el('span', '', e))); bar.style.left = Math.max(6, x - 4) + 'px'; bar.style.top = Math.max(6, y - 50) + 'px'; stage.append(bar); stage._bar = bar; }],
        [3750, () => F.to(stage._bar.children[0])], [3900, () => { F.press(); stage._bar.children[0].dataset.hot = ''; }],
        [4050, () => { F.up(); stage._bar.remove(); inb.append(el('span', 'mb__react', '❤️')); }],
        [4500, () => F.to(out, .5, .5)], [4600, () => { F.press(); out.style.transform = 'scale(.97)'; }],
        [4900, () => { F.up(); out.style.transform = ''; const [x, y] = F.xy(out, 0, 0); const m = el('div', 'mmenu');
          [['arrow-back-up', 'Reply'], ['pencil', 'Edit'], ['copy', 'Copy']].forEach(([i, l]) => { const d = el('div'); d.append(icon(i), el('span', '', l)); m.append(d); });
          m.style.left = Math.max(6, x - 20) + 'px'; m.style.top = Math.max(6, y - 118) + 'px'; stage.append(m); stage._m = m; }],
        [5150, () => F.to(stage._m.children[1])], [5300, () => { F.press(); stage._m.children[1].dataset.hot = ''; }],
        [5450, () => { F.up(); stage._m.remove(); out.querySelector('.mb__t').textContent = 'Yes! See you at 7'; out.querySelector('.mb__meta').textContent = S(loc, 'edited') + ' · 18:03 ✓✓'; out.animate([{ transform: 'scale(1.04)' }, { transform: 'none' }], { duration: 260 }); }],
        [5900, () => F.hide()]);
      return { dur: 7200, steps };
    },
    voice(stage, F, loc) {
      const mc = el('div', 'mc'); const cmp = composer(loc); history(mc, [['out', 'I’m at the station', '17:16 ✓✓']]); mc.append(bubble('in', 'Can you tell me the way?', '17:20'), cmp); stage.append(mc);
      let rec = null, t = null, vb = null;
      const sec = (n) => '0:0' + n + ' / 0:30';
      return { dur: 7200, steps: [
        [400, () => F.to(cmp._go)], [650, () => F.press()],
        [750, () => { F.up(); rec = el('div', 'rec'); t = el('span', '', sec(0)); const bin = icon('trash', 18); bin.style.color = 'var(--text-neutral-02)';
          rec.append(bin, el('span', 'rec__dot'), t, wave(16, 1)); cmp._pill.replaceWith(rec); cmp._plus.style.visibility = 'hidden'; cmp.setGo('send-2'); }],
        [1100, () => F.hide()], [1750, () => { t.textContent = sec(1); }], [2750, () => { t.textContent = sec(2); }], [3750, () => { t.textContent = sec(3); }],
        [3700, () => F.to(cmp._go)], [3950, () => F.press()],
        [4050, () => { F.up(); rec.replaceWith(cmp._pill); cmp._plus.style.visibility = ''; cmp.setGo('microphone'); vb = bubble('out', '', '17:21 ✓✓'); vb.querySelector('.mb__t').remove();
          const row = el('div', 'vb'); const pl = el('span', 'vb__play'); pl.append(icon('player-play')); row.append(pl, wave(22, 2), el('span', '', '0:03')); vb.insertBefore(row, vb.firstChild); mc.insertBefore(vb, cmp); vb._pl = pl; }],
        [4500, () => F.to(vb._pl)], [4650, () => F.press()],
        [4800, () => { F.up(); vb._pl.innerHTML = ''; vb._pl.append(icon('player-pause')); const bars = vb.querySelectorAll('.wave i'); bars.forEach((b, k) => setTimeout(() => b.setAttribute('data-on', ''), rm() ? 0 : k * 70)); }],
        [5200, () => F.hide()], [6500, () => { vb._pl.innerHTML = ''; vb._pl.append(icon('player-play')); }],
      ] };
    },
    photos(stage, F, loc) {
      const mc = el('div', 'mc'); const cmp = composer(loc); history(mc, [['out', 'Home again!', '20:10 ✓✓']]); mc.append(bubble('in', 'How was the trip?', '20:14'), cmp); stage.append(mc);
      const pick = el('div', 'pick'); const bar = el('div', 'pick__bar'); const cnt = el('span', '', S(loc, 'photoStripCount').replace('{n}', '0')); const send = el('span', '', 'Send');
      send.style.color = 'var(--text-action-default)'; bar.append(el('span', '', S(loc, 'photos')), cnt, send);
      const grid = el('div', 'pick__grid'); const th = [];
      for (let k = 0; k < 8; k++) { const t = el('div', 'pick__t'); t.style.background = phBg(k); t.append(el('span', 'pick__n')); grid.append(t); th.push(t); }
      pick.append(bar, grid); stage.append(pick);
      const sel = [0, 1, 2, 4, 5, 7]; const steps = [[400, () => F.to(cmp._plus)], [600, () => F.press()], [700, () => { F.up(); pick.setAttribute('data-open', ''); }]];
      sel.forEach((k, n) => {
        const t0 = 1050 + n * 230;
        steps.push([t0, () => F.to(th[k], .5, .55)], [t0 + 110, () => F.press()], [t0 + 170, () => { F.up(); th[k].dataset.n = ''; th[k].querySelector('.pick__n').textContent = String(n + 1); cnt.textContent = S(loc, 'photoStripCount').replace('{n}', String(n + 1)); }]);
      });
      steps.push([2550, () => F.to(send)], [2700, () => F.press()],
        [2800, () => { F.up(); pick.removeAttribute('data-open'); F.hide(); const b = el('div', 'mb mb--out album');
          [0, 1, 2, 4].forEach((k, i) => { const d = el('div'); d.style.background = phBg(k); if (i === 3) d.append(el('span', 'album__more', '+2')); b.append(d); }); mc.insertBefore(b, cmp); }],
        [3400, () => { const c = el('div', 'chipnote'); c.append(icon('shield-lock'), el('span', '', S(loc, 'whatsNewLocationNote').replace('{n}', '6'))); stage.append(c); }]);
      return { dur: 5800, steps };
    },
    privacy(stage, F, loc) {
      const p = el('div', 'prv'); p.append(el('div', 'prv__title', S(loc, 'privacy')));
      const card = el('div', 'prv__card'); const sws = [];
      [['readReceipts', 'readReceiptsHint', true], ['typingIndicators', 'typingIndicatorsHint', true], ['hideOnlineTitle', 'hideOnlineHint', false]].forEach(([t, h, on]) => {
        const r = el('div', 'prv__row'); const tt = el('div', 'prv__t', S(loc, t)); const sm = el('small', '', S(loc, h)); sm.style.cssText = 'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden';
        tt.append(sm); const sw = el('span', 'sw'); if (on) sw.dataset.on = ''; r.append(tt, sw); card.append(r); sws.push(sw);
      });
      p.append(card); stage.append(p);
      const steps = [];
      sws.forEach((sw, k) => { const t0 = 500 + k * 850; steps.push([t0, () => F.to(sw)], [t0 + 220, () => F.press()], [t0 + 320, () => { F.up(); sw.toggleAttribute('data-on'); }]); });
      steps.push([3100, () => F.hide()]);
      return { dur: 4600, steps };
    },
    apps(stage, F, loc) {
      const mc = el('div', 'mc'); const inv = el('div', 'inv'); const top = el('div', 'inv__top'); const ic = el('div', 'inv__ic', '#');
      const tx = el('div'); tx.append(el('div', 'inv__name', 'Tic-tac-toe'), el('div', 'inv__sub', S(loc, 'whatsNewInvite')));
      top.append(ic, tx); const btns = el('div', 'inv__btns'); const no = el('span', '', 'Decline'); const yes = el('span', '', S(loc, 'accept')); yes.dataset.fill = '';
      btns.append(no, yes); inv.append(top, btns);
      history(mc, []); mc.append(bubble('in', 'Bored? Let’s play.', '19:05'), inv, composer(loc)); stage.append(mc);
      const app = el('div', 'app'); const ab = el('div', 'app__bar'); ab.append(el('span', '', 'Tic-tac-toe'), el('span', '', 'Ana · you'));
      const board = el('div', 'ttt'); const cells = []; for (let k = 0; k < 9; k++) { const c = el('i'); board.append(c); cells.push(c); }
      app.append(ab, board); stage.append(app);
      const put = (k, m) => { cells[k].textContent = m; if (m === 'O') cells[k].dataset.o = ''; };
      return { dur: 5600, steps: [
        [600, () => F.to(yes)], [800, () => F.press()], [900, () => { F.up(); yes.textContent = S(loc, 'accepting'); }],
        [1500, () => { const ok = el('div', 'inv__ok'); ok.append(icon('check'), el('span', '', S(loc, 'whatsNewJoined'))); btns.replaceWith(ok); F.hide(); }],
        [2000, () => app.setAttribute('data-open', '')], [2500, () => F.to(cells[4])], [2650, () => F.press()], [2750, () => { F.up(); put(4, '×'); }],
        [3000, () => F.hide()], [3300, () => put(0, 'O')], [3800, () => F.to(cells[8])], [3950, () => F.press()], [4050, () => { F.up(); put(8, '×'); }], [4300, () => F.hide()],
      ] };
    },
  };

  /* ---------- the story sheet ---------- */
  class Stories {
    constructor(host, cfg) { this.host = host; this.cfg = cfg; this.ids = D.slides; this.n = this.ids.length; this.i = -1; this.build(); this.go(cfg.start || 0); }
    build() {
      const c = this.cfg, loc = c.loc;
      const root = el('div', 'st'); root.dataset.kind = c.desktop ? 'desktop' : 'phone';
      root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', S(loc, 'whatsNew'));
      const sh = el('div', 'st__sheet');
      const prog = el('div', 'st__prog'); this.segs = this.ids.map(() => { const s = el('div', 'st__seg'); s.append(el('i')); prog.append(s); return s; });
      const head = el('div', 'st__head'); this.count = el('div', 'st__count');
      this.pb = el('button', 'st__icon'); this.pb.type = 'button'; this.pb.setAttribute('aria-label', 'Pause'); this.pb.append(icon('player-pause'));
      this.pb.addEventListener('click', (e) => { e.stopPropagation(); this.setPaused(!this.paused); });
      const x = el('button', 'st__icon'); x.type = 'button'; x.setAttribute('aria-label', S(loc, 'close')); x.append(icon('x'));
      x.addEventListener('click', (e) => { e.stopPropagation(); this.done('×'); });
      head.append(this.count, this.pb, x);
      const ts = el('div', 'st__textstack');
      this.texts = this.ids.map((id, k) => {
        const t = el('div', 'st__text'); t.setAttribute('aria-hidden', 'true');
        if (k === 0) t.append(el('p', 'st__kick', 'Spixi ' + D.version));
        const h = el('h2', 'st__h', S(loc, 'b' + id + 'Title')); h.id = 'st' + k + Math.random().toString(36).slice(2, 5); t._h = h;
        t.append(h, el('p', 'st__p', S(loc, 'b' + id + 'Body'))); ts.append(t); return t;
      });
      this.stage = el('div', 'st__stage'); this.stage.setAttribute('aria-hidden', 'true');
      const foot = el('div', 'st__foot'); this.foot = foot;
      const skip = button(S(loc, 'whatsNewSkip'), { type: 'text', size: 44, cls: 'st__skip' }); skip.addEventListener('click', (e) => { e.stopPropagation(); this.done('Skip'); });
      this.go2 = button(S(loc, 'whatsNewGotIt'), { size: 56, iconName: 'arrow-right', cls: 'st__go' }); this.go2.setAttribute('aria-label', S(loc, 'next'));
      this.go2.addEventListener('click', (e) => { e.stopPropagation(); if (this.i < this.n - 1) this.go(this.i + 1); else this.done(S(loc, 'whatsNewGotIt')); });
      foot.append(skip, this.go2);
      sh.append(prog, head, ts, this.stage, foot);
      // tap left third = back, elsewhere = next; hold = pause
      let t0 = 0, hold = 0;
      sh.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; t0 = Date.now(); hold = setTimeout(() => this.setPaused(true, true), 260); });
      sh.addEventListener('pointerup', (e) => {
        if (e.target.closest('button') || !t0) return; clearTimeout(hold);
        if (Date.now() - t0 > 260) { if (this.heldPause) this.setPaused(false); t0 = 0; return; }
        t0 = 0; const r = sh.getBoundingClientRect(); if (e.clientX - r.left < r.width * .3) this.go(this.i - 1); else if (this.i < this.n - 1) this.go(this.i + 1);
      });
      root.tabIndex = -1;
      root.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') this.go(this.i + 1); if (e.key === 'ArrowLeft') this.go(this.i - 1); if (e.key === 'Escape') this.done('Esc'); if (e.key === ' ') { e.preventDefault(); this.setPaused(!this.paused); } });
      root.append(sh); this.root = root; this.host.append(root);
    }
    setPaused(p, held) {
      this.paused = p; this.heldPause = !!(p && held);
      this.root.toggleAttribute('data-paused', p); if (this.clock) this.clock.pause(p);
      this.pb.innerHTML = ''; this.pb.append(icon(p ? 'player-play' : 'player-pause')); this.pb.setAttribute('aria-label', p ? 'Play' : 'Pause');
    }
    done(how) { if (this.cfg.toast) this.cfg.toast(how + ' → ixian:whatsnew:done'); if (this.cfg.onDone) this.cfg.onDone(); }
    go(i) {
      i = clamp(i, 0, this.n - 1);
      if (this.clock) this.clock.stop();
      this.i = i; const id = this.ids[i], last = i === this.n - 1;
      this.count.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(this.n).padStart(2, '0');
      this.texts.forEach((t, k) => { t.toggleAttribute('data-on', k === i); t.setAttribute('aria-hidden', String(k !== i)); });
      this.root.setAttribute('aria-labelledby', this.texts[i]._h.id);
      this.foot.toggleAttribute('data-last', last);
      this.stage.innerHTML = '';
      const F = finger(this.stage);
      const sc = STORIES[id](this.stage, F, this.cfg.loc);
      this.segs.forEach((s, k) => { s.toggleAttribute('data-done', k < i); s.removeAttribute('data-on'); });
      const seg = this.segs[i]; void seg.offsetWidth; seg.style.setProperty('--dur', sc.dur + 'ms'); seg.setAttribute('data-on', '');
      const end = () => { if (last || this.cfg.noAdvance) { this.go(i); } else this.go(i + 1); };
      if (rm() || this.cfg.still) { this.clock = Clock(sc.steps, () => {}, 1e9); this.clock.finish(); this.clock.stop(); F.hide(); seg.setAttribute('data-done', ''); return; }
      this.clock = Clock(sc.steps, end, sc.dur + 700);
      if (this.paused) this.clock.pause(true);
      if (this.cfg.onChange) this.cfg.onChange(i, this);
    }
  }

  /* ---------- frames + page ---------- */
  const PHONE = { w: 375, h: 812 }, SE = { w: 320, h: 568 }, DESK = { w: 1280, h: 800 };
  function frame(host, o) {
    const size = o.size || (o.desktop ? DESK : PHONE);
    const wrap = el('div', 'devwrap'), dev = el('div', 'dev sx');
    dev.dataset.kind = o.desktop ? 'desktop' : 'phone'; dev.setAttribute('data-sxt', o.theme); if (o.desktop) dev.setAttribute('data-desktop', '');
    dev.style.width = size.w + 'px'; dev.style.height = size.h + 'px';
    const sc = o.scale || 1; dev.style.transform = 'scale(' + sc + ')'; wrap.style.width = size.w * sc + 'px'; wrap.style.height = size.h * sc + 'px';
    wrap.append(dev); host.append(wrap);
    const res = { wrap, dev, size };
    const open = (start) => { const old = dev.querySelector('.st'); if (old) old.remove(); res.st = new Stories(dev, { loc: o.loc, desktop: o.desktop, start, toast, still: o.still, noAdvance: o.noAdvance,
      onDone: o.about ? () => { const w = dev.querySelector('.st'); if (w) w.remove(); if (res.st && res.st.clock) res.st.clock.stop(); res.st = null; } : null }); return res.st; };
    dev.append(o.about ? aboutPhone(o.loc, () => open(0)) : (o.desktop ? homeDesktop(o.loc) : homePhone(o.loc)));
    if (!o.closed) open(o.start || 0);
    return res;
  }
  let tt = 0; function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => { t.hidden = true; }, 2400); }
  const st = { loc: 'en-us', width: 'phone' };
  try { Object.assign(st, JSON.parse(localStorage.getItem('wnb-render') || '{}')); } catch (e) { /* */ }
  const save = () => { try { localStorage.setItem('wnb-render', JSON.stringify(st)); } catch (e) { /* */ } };
  let live = [];
  const stopAll = (list) => list.forEach((f) => { if (f.st && f.st.clock) f.st.clock.stop(); });
  function seg(id, key, opts) { const g = $('#' + id); g.innerHTML = ''; opts.forEach(([v, l]) => { const b = el('button', 'seg', l); b.type = 'button'; b.setAttribute('aria-pressed', String(st[key] === v)); b.addEventListener('click', () => { st[key] = v; save(); renderAll(); }); g.append(b); }); }
  function renderStage() {
    stopAll(live); live = [];
    const host = $('#stage'); host.innerHTML = ''; const desk = st.width === 'desktop'; host.dataset.width = st.width;
    ['light', 'dark'].forEach((theme) => {
      const fig = el('figure', 'stagefig'), inner = el('div', 'stagefig__dev'); fig.append(inner, el('figcaption', '', (theme === 'light' ? 'Light' : 'Dark') + ' · ' + (desk ? '1280 × 800' : '375 × 812'))); host.append(fig);
      const colW = desk ? host.clientWidth : Math.min(host.clientWidth, Math.max(240, (host.clientWidth - 24) / 2));
      live.push(frame(inner, { loc: st.loc, theme, desktop: desk, scale: Math.min(1, colW / (desk ? DESK.w : PHONE.w)) }));
    });
  }
  let strip = [];
  function renderStrip() {
    stopAll(strip); strip = [];
    const host = $('#strip'); host.innerHTML = '';
    D.slides.forEach((id, k) => {
      const fig = el('figure', 'stripfig'); const inner = el('div', ''); fig.append(inner);
      const cap = el('figcaption', ''); cap.append(el('b', '', String(k + 1).padStart(2, '0') + ' · ' + S(st.loc, 'b' + id + 'Title')), el('p', '', D.sheetB[id]));
      fig.append(cap); host.append(fig);
      strip.push(frame(inner, { loc: st.loc, theme: k % 2 ? 'dark' : 'light', start: k, scale: .62, noAdvance: true }));
    });
  }
  let about = [];
  function renderAbout() {
    stopAll(about); about = [];
    const host = $('#about'); host.innerHTML = '';
    ['light', 'dark'].forEach((theme) => { const fig = el('figure', 'stagefig'), inner = el('div', 'stagefig__dev'); fig.append(inner, el('figcaption', '', (theme === 'light' ? 'Light' : 'Dark') + ' · tap “What’s new”')); host.append(fig);
      const sc = Math.min(1, Math.min(host.clientWidth, Math.max(240, (host.clientWidth - 24) / 2)) / PHONE.w); about.push(frame(inner, { loc: st.loc, theme, about: true, closed: true, scale: sc })); });
  }
  function renderStress() {
    const host = $('#stress'); host.innerHTML = ''; const cells = []; const grid = el('div', 'stressrow');
    Object.keys(D.str).forEach((loc) => ['light', 'dark'].forEach((theme) => { const c = el('div', 'sg-cell'); c.append(el('div', 'sg-h', D.locName[loc] + ' · ' + theme)); const inner = el('div'), chips = el('div', 'chipline'); c.append(inner, chips); grid.append(c); cells.push({ loc, theme, inner, chips }); }));
    host.append(grid);
    requestAnimationFrame(() => {
      const fails = [];
      cells.forEach((c) => {
        const f = frame(c.inner, { loc: c.loc, theme: c.theme, size: SE, scale: .5, still: true }); const s = f.st;
        let tl = 0, bl = 0, stage = 1e9, btn = true, longest = 0, ll = -1;
        D.slides.forEach((id, k) => {
          s.go(k); const t = s.texts[k], h = t.querySelector('.st__h'), p = t.querySelector('.st__p');
          tl = Math.max(tl, Math.round(h.offsetHeight / parseFloat(getComputedStyle(h).lineHeight)));
          bl = Math.max(bl, Math.round(p.offsetHeight / parseFloat(getComputedStyle(p).lineHeight)));
          stage = Math.min(stage, s.stage.offsetHeight);
          const lab = s.go2.querySelector('.c-button__label'); if (lab.offsetParent && lab.scrollWidth > lab.clientWidth + 1) btn = false;
          const len = (S(c.loc, 'b' + id + 'Title') + S(c.loc, 'b' + id + 'Body')).length; if (len > ll) { ll = len; longest = k; }
        });
        s.go(longest);
        const mk = (ok, t) => c.chips.append(el('span', 'chip ' + (ok ? 'ok' : 'bad'), (ok ? '✓ ' : '✗ ') + t));
        mk(tl <= 3, 'headline ' + tl + ' ln'); mk(bl <= 5, 'body ' + bl + ' ln'); mk(stage >= 150, 'stage ' + stage + ' px'); mk(btn, 'button');
        if (!(tl <= 3 && bl <= 5 && stage >= 150 && btn)) fails.push(c.loc + ' ' + c.theme);
      });
      const sum = $('#stresssum'); sum.textContent = fails.length ? '✗ ' + fails.length + ' fail: ' + fails.join(', ') : '✓ All six stories fit a 320 × 568 phone: headline ≤ 3 lines, body ≤ 5 lines, the live stage keeps ≥ 150 px.';
      sum.className = 'stresssum ' + (fails.length ? 'bad' : 'ok');
    });
  }
  function renderAll() { seg('c-loc', 'loc', Object.keys(D.str).map((l) => [l, D.locName[l]])); seg('c-w', 'width', [['phone', 'Phone'], ['desktop', 'Desktop']]); renderStage(); renderStrip(); renderAbout(); renderStress(); }
  $('#replay').addEventListener('click', renderStage);
  $('#rm').addEventListener('change', (e) => { document.documentElement.classList.toggle('rm', e.target.checked); renderStage(); renderStrip(); });
  let rz = 0; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { renderStage(); renderAbout(); }, 200); });
  renderAll();
})();
