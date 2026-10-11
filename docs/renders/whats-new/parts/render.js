/* What's new SPOTLIGHT — RENDER JS (v2). Builds the spotlight card in device frames that carry the real Spixi
   tokens. Render only: no bridge, no storage of app state, no fetch. DATA, ICONS, WN_ART injected by the build.
   A page can swap the art language: window.WN_PROVIDER (same scene(id) → {bg, fg} contract) and window.WN_DEPTH
   (the parallax factors; the Thread page sets 0 so its line stays continuous across the seam). */
(function () {
  'use strict';
  const D = DATA;
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ART = window.WN_PROVIDER || WN_ART;
  const DEPTH = window.WN_DEPTH || { bg: -0.42, fg: 0.16 };

  function icon(name, size) {
    const s = el('span', 'ico'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = ICONS[name] || '';
    if (size) { s.style.width = size + 'px'; s.style.height = size + 'px'; }
    return s;
  }
  function S(loc, key) { const t = D.str[loc] && D.str[loc][key]; return t != null ? t : D.str['en-us'][key]; }
  function button(label, { type = 'fill', size = 56, full = false } = {}) {
    const b = el('button', 'c-button'); b.type = 'button';
    b.dataset.type = type; b.dataset.size = String(size); if (full) b.dataset.width = 'full';
    b.append(el('span', 'c-button__label', label));
    return b;
  }

  /* ---------------- backdrops ---------------- */
  const ROWS = [
    { n: 'Ana Kovač', x: 'Did the payment arrive?', t: '10:42', u: 2, h: [212, 262] },
    { n: 'Spixi Group Chat', x: 'Luka: The new build is out', t: '10:15', u: 0, h: [252, 292] },
    { n: 'Marko Petek', x: 'See you at 6', t: '09:58', u: 1, h: [18, 340] },
    { n: 'Mia Horvat', x: 'Photo', t: 'Yesterday', u: 0, h: [160, 200] },
    { n: 'Tomaž', x: 'You sent 25 IXI', t: 'Yesterday', u: 0, h: [28, 8] },
    { n: 'Eva Zupan', x: 'Thanks!', t: 'Mon', u: 0, h: [300, 330] },
    { n: 'Jan', x: 'Ok', t: 'Sun', u: 0, h: [120, 170] },
  ];
  function rowEl(r) {
    const row = el('div', 'row');
    const av = el('div', 'row__av', r.n.split(' ').map((w) => w[0]).join('').slice(0, 2));
    av.style.background = 'linear-gradient(140deg, hsl(' + r.h[0] + ' 72% 64%), hsl(' + r.h[1] + ' 62% 46%))';
    const mid = el('div', 'row__mid'); mid.append(el('div', 'row__name', r.n), el('div', 'row__ex', r.x));
    const meta = el('div', 'row__meta'); meta.append(el('span', '', r.t)); if (r.u) meta.append(el('span', 'row__badge', String(r.u)));
    row.append(av, mid, meta); return row;
  }
  function list() { const l = el('div', 'home__list'); ROWS.forEach((r) => l.append(rowEl(r))); return l; }
  function topbar(loc) {
    const top = el('div', 'home__top'); top.append(el('div', 'home__title', S(loc, 'chats')));
    ['search', 'message-plus'].forEach((n) => { const b = el('span', 'home__iconbtn'); b.append(icon(n)); top.append(b); });
    return top;
  }
  function homePhone(loc) {
    const h = el('div', 'home'); h.setAttribute('aria-hidden', 'true');
    const st = el('div', 'home__status'); st.append(el('span', '', '10:11'), el('span', '', '5G · 66%'));
    const nav = el('div', 'home__nav');
    [['messages', 'chats'], ['wallet', 'wallet'], ['apps', 'apps'], ['settings', 'account']].forEach(([ic, k], i) => {
      const it = el('div', 'home__navitem'); if (!i) it.dataset.on = ''; it.append(icon(ic), el('span', '', S(loc, k))); nav.append(it);
    });
    h.append(st, topbar(loc), list(), nav); return h;
  }
  function homeDesktop(loc) {
    const h = el('div', 'homeD'); h.setAttribute('aria-hidden', 'true');
    const rail = el('div', 'homeD__rail'); const logo = icon('logo'); logo.classList.add('logo'); rail.append(logo);
    ['messages', 'wallet', 'apps', 'settings'].forEach((n, i) => { const b = el('div', 'homeD__railbtn'); if (!i) b.dataset.on = ''; b.append(icon(n)); rail.append(b); });
    const l = el('div', 'homeD__list'); l.append(topbar(loc), list());
    h.append(rail, l, el('div', 'homeD__detail', 'Select a chat')); return h;
  }
  function aboutPhone(loc, onOpen) {
    const a = el('div', 'about');
    const st = el('div', 'home__status'); st.append(el('span', '', '10:11'), el('span', '', '5G · 66%'));
    const top = el('div', 'about__top'); top.append(icon('arrow-left'), el('b', '', S(loc, 'about')));
    if (window.WN_ABOUT_HERO) {
      /* the kit's full-bleed About header (Damir 13:50): TODAY'S About — the band art, the launcher-blue app icon with
         the real logo overlapping the band's lower edge, the name, the tagline, the version chip — with the band grown
         into a full-bleed header under the status bar and the top bar */
      a.classList.add('about--hero');
      const hdr = el('div', 'about__hdr'); hdr.setAttribute('aria-hidden', 'true');
      const sc = ART.scene(window.WN_ABOUT_VAR || 'about'); hdr.innerHTML = sc.bg + sc.fg;
      const txt = el('div', 'about__hdrtext');
      const ai = el('div', 'about__appicon'); ai.setAttribute('aria-hidden', 'true'); ai.append(icon('logo'));
      const ver = el('div', 'about__chip'); ver.append(S(loc, 'aboutVersion') + ' '); ver.append(el('b', '', D.version + '.0'));
      txt.append(ai, el('div', 'about__name', 'Spixi'), el('div', 'about__tag', S(loc, 'aboutTagline2')), ver);
      a.append(hdr, st, top, txt);
      const card0 = el('div', 'about__card');
      const row0 = (ico, title, sub, tone, isNew, click) => {
        const r = el('button', 'about__row'); r.type = 'button';
        const ic = el('span', 'about__rico about__rico--' + tone); ic.append(icon(ico));
        const t = el('span', 'about__rt'); t.append(el('b', '', title), el('span', '', sub)); r.append(ic, t);
        if (isNew) r.append(el('span', 'about__new', S(loc, 'whatsNewBadge')));
        const ch = icon('chevron-right'); ch.classList.add('about__chev'); r.append(ch);
        if (click) r.addEventListener('click', click); else r.tabIndex = -1; card0.append(r);
      };
      row0('rocket', S(loc, 'whatsNew'), S(loc, 'whatsNewSub').replace('{0}', D.version), 'a', true, onOpen);
      row0('info-circle', S(loc, 'howToUse'), S(loc, 'howToUseSub'), 'b');
      row0('star', S(loc, 'aboutRate'), S(loc, 'aboutRateBody'), 'c');
      row0('shield-lock', S(loc, 'aboutLegalSupport'), S(loc, 'aboutSub'), 'd');
      a.append(card0);
      return a;
    }
    const hero = el('div', 'about__hero');
    const lg = el('div', 'about__logo'); lg.append(icon('logo')); hero.append(lg, el('div', 'about__name', 'Spixi'),
      el('div', 'about__ver', S(loc, 'aboutVersion') + ' ' + D.version + '.0'), el('div', 'about__tag', S(loc, 'aboutTagline2')));
    const card = el('div', 'about__card');
    const row = (ico, title, sub, isNew, click) => {
      const r = el('button', 'about__row'); r.type = 'button';
      const ic = el('span', 'about__rico' + (isNew ? ' about__rico--new' : '')); ic.append(icon(ico));
      const t = el('span', 'about__rt'); t.append(el('b', '', title), el('span', '', sub));
      r.append(ic, t); if (isNew) r.append(el('span', 'about__new', S(loc, 'whatsNewBadge')));
      const ch = icon('chevron-right'); ch.classList.add('about__chev'); r.append(ch);
      if (click) r.addEventListener('click', click); else r.tabIndex = -1;
      card.append(r);
    };
    row('rocket', S(loc, 'whatsNew'), S(loc, 'whatsNewSub').replace('{0}', D.version), true, onOpen);
    row('info-circle', S(loc, 'howToUse'), S(loc, 'howToUseSub'));
    row('star', S(loc, 'aboutRate'), S(loc, 'aboutRateBody'));
    row('shield-lock', S(loc, 'aboutLegalSupport'), S(loc, 'aboutSub'));
    a.append(st, top, hero, card); return a;
  }

  /* ---------------- the spotlight ---------------- */
  class Spotlight {
    constructor(host, cfg) {
      this.host = host; this.cfg = cfg; this.ids = D.slides; this.n = this.ids.length; this.i = 0; this.pos = 0;
      this.build(); this.go(cfg.start || 0, false);
    }
    text(i) {
      const loc = this.cfg.loc, id = this.ids[i], box = el('div', 'sp__text');
      if (i === 0) box.append(el('p', 'wt-eyebrow', S(loc, 'whatsNewEyebrow').replace('{0}', D.version)));
      const h = el('h2', 'wt-title', S(loc, 'whatsNew' + cap(id) + 'Title')); h.id = this.uid + '-t' + i;
      box.append(h, el('p', 'wt-body', S(loc, 'whatsNew' + cap(id) + 'Body'))); return box;
    }
    build() {
      const c = this.cfg; this.uid = 'sp' + Math.random().toString(36).slice(2, 7);
      const root = el('div', 'wt'); root.dataset.kind = c.desktop ? 'desktop' : 'phone';
      root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', S(c.loc, 'whatsNew'));
      const card = el('div', 'sp'); this.card = card;
      const aur = el('div', 'sp__aurora'); aur.setAttribute('aria-hidden', 'true'); card.append(aur); this.aur = aur;
      const x = el('button', 'sp__x'); x.type = 'button'; x.setAttribute('aria-label', S(c.loc, 'close')); x.append(icon('x'));
      x.addEventListener('click', () => this.done('×')); card.append(x);
      const vp = el('div', 'sp__vp'), track = el('div', 'sp__track'); this.track = track; this.vp = vp;
      this.slides = this.ids.map((id, i) => {
        const s = el('div', 'sp__slide'); if (i === 0) s.dataset.hero = '';
        s.setAttribute('role', 'group'); s.setAttribute('aria-roledescription', 'slide'); s.setAttribute('aria-label', (i + 1) + ' / ' + this.n);
        const art = el('div', 'sp__art'); art.setAttribute('aria-hidden', 'true');
        s.append(art, this.text(i)); track.append(s); s._art = art; return s;
      });
      vp.append(track);
      const foot = el('div', 'sp__foot');
      const dots = el('div', 'wt-dots'); dots.setAttribute('role', 'tablist'); dots.setAttribute('aria-label', S(c.loc, 'whatsNew'));
      this.dots = this.ids.map((id, k) => { const b = el('button', 'wt-dot'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', (k + 1) + ' / ' + this.n); b.addEventListener('click', () => this.go(k, true)); dots.append(b); return b; });
      this.primary = button('', { full: true });
      this.primary.addEventListener('click', () => (this.i < this.n - 1 ? this.go(this.i + 1, true) : this.done(S(c.loc, 'whatsNewGotIt'))));
      foot.append(dots, this.primary);
      card.append(vp, foot);
      this.swipe(vp);
      if (c.desktop) {
        const col = el('div', 'wt__col'), row = el('div', 'wt__row');
        this.prev = el('button', 'wt__side'); this.prev.type = 'button'; this.prev.setAttribute('aria-label', 'Previous'); this.prev.append(icon('chevron-left'));
        this.next = el('button', 'wt__side'); this.next.type = 'button'; this.next.setAttribute('aria-label', S(c.loc, 'next')); this.next.append(icon('chevron-right'));
        this.prev.addEventListener('click', () => this.go(this.i - 1, true)); this.next.addEventListener('click', () => this.go(this.i + 1, true));
        row.append(this.prev, card, this.next); col.append(row, el('div', 'wt__keys', '←  →  to move  ·  Esc to close')); root.append(col);
      } else root.append(card);
      root.tabIndex = -1;
      root.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') this.go(this.i + 1, true);
        if (e.key === 'ArrowLeft') this.go(this.i - 1, true);
        if (e.key === 'Escape') this.done('Esc');
      });
      this.root = root; this.host.append(root);
      // the hero's aurora is the card's own ground
      const h = ART.scene('hero'); aur.innerHTML = h.bg; this.heroFg = h.fg;
    }
    done(how) {
      if (this.cfg.toast) this.cfg.toast(how + ' → ixian:whatsnew:done (C# writes whatsnew.seen = Config.version)');
      if (this.cfg.onDone) this.cfg.onDone();
    }
    ensureArt(k) {
      const s = this.slides[k]; if (!s || s._built) return; s._built = true;
      const id = this.ids[k];
      if (id === 'hero') { const fg = el('div', 'sp__layer'); fg.dataset.depth = 'fg'; fg.innerHTML = this.heroFg; s._art.append(fg); return; }
      const sc = ART.scene(id);
      const bg = el('div', 'sp__layer'); bg.dataset.depth = 'bg'; bg.innerHTML = sc.bg;
      const fg = el('div', 'sp__layer'); fg.dataset.depth = 'fg'; fg.innerHTML = sc.fg;
      s._art.append(bg, fg);
    }
    /* pos = fractional card index under the finger; drives the track, the aurora, the parallax */
    paint(pos) {
      const W = this.vp.clientWidth || 1;
      this.track.style.transform = 'translateX(' + (-pos * W) + 'px)';
      const hero = clamp(1 - pos, 0, 1);
      this.card.style.setProperty('--hero', hero.toFixed(3));
      this.card.toggleAttribute('data-onhero', hero > .9);   // the foot is on the aurora only while the aurora still reaches it
      this.slides.forEach((s, k) => {
        const off = (k - pos) * W;
        s.querySelectorAll('.sp__layer').forEach((L) => {
          const d = L.dataset.depth === 'bg' ? DEPTH.bg : DEPTH.fg;
          L.style.transform = Math.abs(k - pos) < 1.5 ? 'translateX(' + (off * d).toFixed(1) + 'px)' : '';
        });
      });
    }
    swipe(t) {
      let x0 = null, dx = 0;
      t.addEventListener('pointerdown', (e) => { x0 = e.clientX; dx = 0; this.card.setAttribute('data-drag', ''); this.ensureArt(this.i - 1); this.ensureArt(this.i + 1); });
      t.addEventListener('pointermove', (e) => {
        if (x0 == null) return; dx = e.clientX - x0;
        const W = this.vp.clientWidth || 1; let p = this.i - dx / W;
        if (p < 0) p = p / 3; if (p > this.n - 1) p = this.n - 1 + (p - this.n + 1) / 3;   // rubber band at the ends
        this.paint(p);
      });
      const end = () => { if (x0 == null) return; x0 = null; this.card.removeAttribute('data-drag'); if (Math.abs(dx) >= 40) this.go(this.i + (dx < 0 ? 1 : -1), true); else this.go(this.i, false); };
      t.addEventListener('pointerup', end); t.addEventListener('pointerleave', end); t.addEventListener('pointercancel', end);
    }
    go(i, user) {
      this.i = clamp(i, 0, this.n - 1);
      const i2 = this.i, last = i2 === this.n - 1;
      this.ensureArt(i2);
      this.paint(i2);
      const lab = last ? S(this.cfg.loc, 'whatsNewGotIt') : S(this.cfg.loc, 'next');
      this.primary.querySelector('.c-button__label').textContent = lab;
      this.dots.forEach((d, k) => { d.setAttribute('aria-selected', String(k === i2)); d.tabIndex = k === i2 ? 0 : -1; });
      this.slides.forEach((s, k) => s.setAttribute('aria-hidden', String(k !== i2)));
      this.root.setAttribute('aria-labelledby', this.uid + '-t' + i2);
      if (this.prev) { this.prev.disabled = i2 === 0; this.next.disabled = last; }
      if (user && this.cfg.onChange) this.cfg.onChange(i2, this);
    }
  }

  /* ---------------- frames ---------------- */
  const PHONE = { w: 375, h: 812 }, SE = { w: 320, h: 568 }, DESK = { w: 1280, h: 800 };
  function frame(host, o) {
    const size = o.size || (o.desktop ? DESK : PHONE);
    const wrap = el('div', 'devwrap'), dev = el('div', 'dev sx');
    dev.dataset.kind = o.desktop ? 'desktop' : 'phone'; dev.setAttribute('data-sxt', o.theme);
    if (o.desktop) dev.setAttribute('data-desktop', '');
    dev.style.width = size.w + 'px'; dev.style.height = size.h + 'px';
    dev.style.setProperty('--art-h', Math.round(clamp(size.h * .27, 150, 228)) + 'px');
    const sc = o.scale || 1; dev.style.transform = 'scale(' + sc + ')';
    wrap.style.width = size.w * sc + 'px'; wrap.style.height = size.h * sc + 'px';
    wrap.append(dev); host.append(wrap);
    const res = { wrap, dev, size };
    const open = (start) => {
      const old = dev.querySelector('.wt'); if (old) old.remove();
      res.sp = new Spotlight(dev, { loc: o.loc, desktop: o.desktop, start: start || 0, toast, onChange: o.onChange,
        onDone: o.about ? () => { const w = dev.querySelector('.wt'); if (w) w.remove(); res.sp = null; } : null });
      return res.sp;
    };
    if (o.about) dev.append(aboutPhone(o.loc, () => open(0)));
    else dev.append(o.desktop ? homeDesktop(o.loc) : homePhone(o.loc));
    if (!o.closed) open(o.start);
    res.open = open;
    return res;
  }

  /* ---------------- fit check ---------------- */
  function check(f) {
    const t = f.sp, r = { title: 0, body: 0, btn: true, fits: true };
    for (let i = 0; i < t.n; i++) {
      t.go(i, false);
      const s = t.slides[i], ti = s.querySelector('.wt-title'), bo = s.querySelector('.wt-body');
      r.title = Math.max(r.title, ti.offsetHeight / parseFloat(getComputedStyle(ti).lineHeight));
      r.body = Math.max(r.body, bo.offsetHeight / parseFloat(getComputedStyle(bo).lineHeight));
      const lab = t.primary.querySelector('.c-button__label');
      if (lab.scrollWidth > lab.clientWidth + 1) r.btn = false;
      if (t.card.offsetHeight > f.size.h - 32) r.fits = false;
    }
    t.go(0, false);
    r.title = Math.round(r.title); r.body = Math.round(r.body); r.ok = r.title <= 3 && r.body <= 6 && r.btn && r.fits;
    return r;
  }

  /* ---------------- page ---------------- */
  const st = { loc: 'en-us', width: 'phone', idx: 0 };
  try { Object.assign(st, JSON.parse(localStorage.getItem('wn-render') || '{}'), { idx: 0 }); } catch (e) { /* storage may be blocked */ }
  const save = () => { try { localStorage.setItem('wn-render', JSON.stringify({ loc: st.loc, width: st.width })); } catch (e) { /* ignore */ } };
  let tt = 0;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => { t.hidden = true; }, 2600); }
  function seg(id, key, opts) {
    const g = $('#' + id); g.innerHTML = '';
    opts.forEach(([v, l]) => { const b = el('button', 'seg', l); b.type = 'button'; b.setAttribute('aria-pressed', String(st[key] === v)); b.addEventListener('click', () => { st[key] = v; st.idx = 0; save(); renderAll(); }); g.append(b); });
  }
  let stage = [];
  function renderStage() {
    const host = $('#stage'); host.innerHTML = ''; stage = [];
    const desk = st.width === 'desktop'; host.dataset.width = st.width;
    const sync = (i, src) => { st.idx = i; stage.forEach((f) => { if (f.sp && f.sp !== src) f.sp.go(i, false); }); };
    ['light', 'dark'].forEach((theme) => {
      const fig = el('figure', 'stagefig'), inner = el('div', 'stagefig__dev');
      fig.append(inner, el('figcaption', '', (theme === 'light' ? 'Light' : 'Dark') + ' · ' + (desk ? '1280 × 800' : '375 × 812')));
      host.append(fig);
      const colW = desk ? host.clientWidth : Math.min(host.clientWidth, Math.max(240, (host.clientWidth - 24) / 2));
      const sc = Math.min(1, colW / (desk ? DESK.w : PHONE.w));
      stage.push(frame(inner, { loc: st.loc, theme, desktop: desk, start: st.idx, scale: sc, onChange: sync }));
    });
  }
  function renderSheet() {
    const host = $('#sheet'); if (!host) return; host.innerHTML = '';
    D.slides.forEach((id, k) => {
      const card = el('figure', 'artcard');
      const box = el('div', 'artbox' + (id === 'hero' ? ' artbox--hero' : ''));
      const paint = () => { const sc = WN_ART.scene(id); box.innerHTML = id === 'hero' ? sc.bg + '<div class="artbox__fg">' + sc.fg + '</div>' : sc.bg + sc.fg; };
      paint();
      const meta = D.sheet[id];
      const cap2 = el('figcaption', '');
      const h = el('div', 'artcard__h'); h.append(el('b', '', (k + 1) + ' · ' + S('en-us', 'whatsNew' + cap(id) + 'Title')));
      const rp = el('button', 'pgbtn', 'Replay'); rp.type = 'button'; rp.addEventListener('click', paint); h.append(rp);
      cap2.append(h, el('p', '', meta.loop), el('p', '', meta.entrance));
      card.append(box, cap2); host.append(card);
    });
  }
  function renderAbout() {
    const host = $('#about'); if (!host) return; host.innerHTML = '';
    ['light', 'dark'].forEach((theme) => {
      const fig = el('figure', 'stagefig'), inner = el('div', 'stagefig__dev');
      fig.append(inner, el('figcaption', '', theme === 'light' ? 'Light · tap “What’s new”' : 'Dark · tap “What’s new”'));
      host.append(fig);
      const sc = Math.min(1, Math.min(host.clientWidth, Math.max(240, (host.clientWidth - 24) / 2)) / PHONE.w);
      frame(inner, { loc: st.loc, theme, about: true, closed: true, scale: sc });
    });
  }
  function renderStress() {
    const host = $('#stress'); if (!host) return; host.innerHTML = '';
    const locs = Object.keys(D.str), cells = [];
    const grid = el('div', 'stressrow');
    locs.forEach((loc) => {
      ['light', 'dark'].forEach((theme) => {
        const cell = el('div', 'sg-cell'); cell.append(el('div', 'sg-h', D.locName[loc] + ' · ' + theme));
        const inner = el('div', ''), chips = el('div', 'chipline'); cell.append(inner, chips); grid.append(cell);
        cells.push({ loc, theme, inner, chips });
      });
    });
    host.append(grid);
    requestAnimationFrame(() => {
      const fails = [];
      cells.forEach((c) => {
        const f = frame(c.inner, { loc: c.loc, theme: c.theme, size: SE, scale: .5 });
        const r = check(f);
        let longest = 0, bl = -1; D.slides.forEach((id, i) => { const l = S(c.loc, 'whatsNew' + cap(id) + 'Body').length; if (l > bl) { bl = l; longest = i; } });
        f.sp.go(longest, false);
        const mk = (ok, t) => c.chips.append(el('span', 'chip ' + (ok ? 'ok' : 'bad'), (ok ? '✓ ' : '✗ ') + t));
        mk(r.title <= 3, 'title ' + r.title + ' ln'); mk(r.body <= 6, 'body ' + r.body + ' ln'); mk(r.btn, 'button'); mk(r.fits, 'fits 568');
        if (!r.ok) fails.push(c.loc + ' ' + c.theme);
      });
      const sum = $('#stresssum');
      sum.textContent = fails.length ? '✗ ' + fails.length + ' fail: ' + fails.join(', ') : '✓ All six cards fit a 320 × 568 phone in every locale shown (the frame shows the longest card).';
      sum.className = 'stresssum ' + (fails.length ? 'bad' : 'ok');
    });
  }
  function renderAll() {
    seg('c-loc', 'loc', Object.keys(D.str).map((l) => [l, D.locName[l]]));
    seg('c-w', 'width', [['phone', 'Phone'], ['desktop', 'Desktop']]);
    renderStage(); renderSheet(); renderAbout(); renderStress();
  }
  $('#replay').addEventListener('click', renderStage);
  window.WN_RENDER = { all: renderAll, about: renderAbout, stage: renderStage };
  $('#rm').addEventListener('change', (e) => { document.documentElement.classList.toggle('rm', e.target.checked); renderStage(); renderSheet(); });
  let rz = 0; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { renderStage(); renderAbout(); }, 200); });
  renderAll();
})();
