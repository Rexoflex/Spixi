/* SPIXI · CHAT APPEARANCE (premium) — the screen, twice (light + dark), one shared state. Render only: no bridge, no
   storage key; every pick repaints both phones at once, the way the real screen applies a pick instantly. */
(function () {
  'use strict';
  const S = AP.str;
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const ico = (n) => { const s = el('span', 'ico'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = ICONS[n] || ''; return s; };
  /* the canvases: today's four (Solid, Brand, Blue, Green) + three new ones; light and dark grounds, the pattern ink,
     the sent bubble that suits each one */
  const GROUNDS = [
    { id: 'flat', key: 'groundFlat', l: '#ECEEF1', d: '#0C0E10', ink: ['#2A3140', '#C6CFFD'], sent: ['#2160c2', '#1a4a96'] },
    { id: 'brand', key: 'groundBrandGradient', l: 'linear-gradient(160deg,#E7E1FF,#DCE6FF)', d: 'linear-gradient(160deg,#1c1645,#0d1030)', ink: ['#3A2F66', '#C6CFFD'], sent: ['#5b4be0', '#3724d4'] },
    { id: 'blue', key: 'groundBlueGradient', l: 'linear-gradient(160deg,#D6E8FF,#EAF3FF)', d: 'linear-gradient(160deg,#0f2349,#0a1430)', ink: ['#1D3E7A', '#B9D2FF'], sent: ['#2160c2', '#1a4a96'] },
    { id: 'green', key: 'groundGreenGradient', l: 'linear-gradient(160deg,#DAF1E4,#EEF7E4)', d: 'linear-gradient(160deg,#0f2c23,#0b1a16)', ink: ['#1E5A43', '#A9E8CC'], sent: ['#0e8164', '#0c4f3f'] },
    { id: 'aurora', key: 'groundAurora', fresh: 1, l: 'linear-gradient(150deg,#7ee0c4 0%,#5fb4ee 48%,#8f80f2 100%)', d: 'linear-gradient(150deg,#0d5249 0%,#16418f 52%,#3a2592 100%)', ink: ['#ffffff', '#ffffff'], sent: ['#1f5bd6', '#1948a9'] },
    { id: 'dusk', key: 'groundDusk', fresh: 1, l: 'linear-gradient(160deg,#FFD9C4,#E9C9FF)', d: 'linear-gradient(160deg,#3b1f3c,#1b1430)', ink: ['#7A3F5E', '#FFC9E4'], sent: ['#d02b7d', '#a62264'] },
    { id: 'ocean', key: 'groundOcean', fresh: 1, l: 'linear-gradient(160deg,#BDEFFF,#C9D6FF)', d: 'linear-gradient(160deg,#0b3a4a,#0b1d3a)', ink: ['#0E5770', '#A6ECFF'], sent: ['#0d7aa7', '#0f5572'] },
  ];
  /* bubble colours: [light, dark]. Light = the lightest step that keeps white text ≥ 4.6 : 1; dark = one step deeper (−0.10 lightness, the
     #1055 step that took the default blue #2160c2 → #1a4a96; very saturated hues also lose 10 % saturation so they do not glow on the near-black
     canvas). Damir 15:15: every outgoing colour one step darker in dark mode. */
  const COLOURS = [['auto', null], ['blue', ['#2160c2', '#1a4a96']], ['violet', ['#6c4cf2', '#4b27e4']], ['teal', ['#0c7f73', '#0b4d46']], ['pink', ['#d02b7d', '#a62264']], ['orange', ['#b85414', '#844115']], ['graphite', ['#3c4352', '#262b35']]];
  const st = { ground: 'aurora', pattern: 'contours', colour: 'auto', size: 16, corners: 17, lines: '1', tips: true, theme: { light: 'light', dark: 'dark' } };

  /* the patterns, drawn once: Contours (an approximation of today's generated style) and Waves (NEW) */
  const PAT = (() => {
    let r0 = 7; const rnd = () => { r0 = (r0 * 9301 + 49297) % 233280; return r0 / 233280; };
    let c = '';
    [[60, 70], [300, 40], [200, 210], [360, 260], [40, 280]].forEach(([cx, cy]) => {
      for (let k = 1; k <= 7; k++) {
        const R = k * 16 + rnd() * 6; let d = '';
        for (let a = 0; a <= 360; a += 20) { const t = a * Math.PI / 180, rr = R * (1 + .12 * Math.sin(3 * t + k) + .06 * Math.cos(5 * t)); d += (a ? 'L' : 'M') + (cx + rr * Math.cos(t)).toFixed(1) + ' ' + (cy + rr * Math.sin(t)).toFixed(1); }
        c += '<path d="' + d + 'Z"/>';
      }
    });
    /* Waves (Damir 15:12, the About banner's waves, toned down for a chat): line-only, static, one ink. The wavelength (200) divides the
       tile width (400) and the line step (20) divides its height (320), so the tile repeats with no seam — the same mask pipeline as Contours */
    let w = '';
    for (let i = 0; i < 16; i++) {
      const y0 = 10 + i * 20, A = 5 + 4 * Math.sin(i * .9), ph = i * .55; let d = '';
      for (let x = 0; x <= 400; x += 8) { const y = y0 + A * Math.sin((x / 200) * 2 * Math.PI + ph); d += (x ? 'L' : 'M') + x + ' ' + y.toFixed(1); }
      w += '<path d="' + d + '"/>';
    }
    const svg = (inner, fill) => '<svg class="pt" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + inner + '</svg>';
    return {
      none: '',
      contours: svg('<g fill="none" stroke="currentColor" stroke-width="1.4">' + c + '</g>'),
      waves: svg('<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">' + w + '</g>'),
    };
  })();
  const PATTERNS = [['none', 'patternNone'], ['contours', 'patternStyleContours'], ['waves', 'patternWaves', 1]];

  const phones = [];
  function ground(g, t) { return t === 'dark' ? g.d : g.l; }
  function sentOf(g, t) { const c = COLOURS.find((x) => x[0] === st.colour); const v = c && c[1] ? c[1] : g.sent; return v[t === 'dark' ? 1 : 0]; }

  function build(slot) {
    const root = el('div', 'ap sx'); const sc = el('div', 'ap__scroll'); root.append(sc);
    const status = el('div', 'ap__status'); status.append(el('span', '', '14:26'), el('span', '', '5G · 38%'));
    const top = el('div', 'ap__top'); const back = el('span', 'ap__back'); back.append(ico('arrow-left')); top.append(back, el('b', '', S.chatAppearance));
    sc.append(status, top);

    /* 1 · the preview + the text size */
    const c1 = el('section', 'ap__card');
    const prev = el('div', 'ap__prev'); prev.setAttribute('aria-hidden', 'true');
    const pat = el('div', 'ap__pat'); const chip = el('span', 'ap__chip', S.today);
    const bin = el('div', 'ap__bub ap__bub--in'); const who = el('span', 'ap__who', 'Ana Kovač');
    const metaIn = el('span', 'ap__meta', '13:27'); bin.append(who, document.createTextNode(S.previewIncoming), metaIn);
    const bout = el('div', 'ap__bub ap__bub--out'); const metaOut = el('span', 'ap__meta', '13:42'); metaOut.append(ico('checks'));
    bout.append(document.createTextNode(S.previewOutgoing), metaOut);
    prev.append(pat, chip, bin, bout);
    const size = el('div', 'ap__size'); const rng = el('input', 'ap__range'); rng.type = 'range'; rng.min = 12; rng.max = 22; rng.step = 1; rng.setAttribute('aria-label', S.textSize);
    const val = el('span', 'ap__val');
    size.append(el('span', 'a a--s', 'A'), rng, el('span', 'a a--l', 'A'), val);
    rng.addEventListener('input', () => { st.size = +rng.value; paint(); });
    c1.append(el('h3', 'ap__label', S.textSize), prev, size);

    /* 2 · the canvas themes */
    const c2 = el('section', 'ap__card'); const row = el('div', 'ap__row'); row.setAttribute('role', 'radiogroup'); row.setAttribute('aria-label', S.chatGround);
    const thBtns = GROUNDS.map((g) => {
      const b = el('button', 'ap__th'); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', S[g.key]);
      b.innerHTML = PAT.contours; b.append(el('i', 'r'), el('i', 's'), el('i', 'r2'));
      const ok = el('b', 'ok'); ok.append(ico('check')); b.append(ok, el('span', '', S[g.key]));
      b.addEventListener('click', () => { st.ground = g.id; st.colour = 'auto'; paint(); });
      row.append(b); return [g, b];
    });
    c2.append(el('h3', 'ap__label', S.chatGround), row);

    /* 3 · background pattern + bubble colour + corners */
    const c3 = el('section', 'ap__card');
    const pats = el('div', 'ap__pats'); pats.setAttribute('role', 'radiogroup'); pats.setAttribute('aria-label', S.patternStyle);
    const ptBtns = PATTERNS.map(([id, key]) => {
      const b = el('button', 'ap__pt'); b.type = 'button'; b.setAttribute('role', 'radio'); if (id === 'none') b.dataset.off = '';
      b.innerHTML = PAT[id]; b.append(el('span', '', S[key])); b.addEventListener('click', () => { st.pattern = id; paint(); });
      pats.append(b); return [id, b];
    });
    const cols = el('div', 'ap__cols'); cols.setAttribute('role', 'radiogroup'); cols.setAttribute('aria-label', S.bubbleColour);
    const colBtns = COLOURS.map(([id, c]) => {
      const b = el('button', 'ap__col'); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', id === 'auto' ? S.bubbleColourAuto : id);
      b.addEventListener('click', () => { st.colour = id; paint(); }); cols.append(b); return [id, c, b];
    });
    const corners = el('div', 'ap__corners'); const cr = el('input', 'ap__range'); cr.type = 'range'; cr.min = 4; cr.max = 22; cr.step = 1; cr.setAttribute('aria-label', S.bubbleCorners);
    const cval = el('span', 'ap__val'); corners.append(el('span', 'ap__cn ap__cn--s'), cr, el('span', 'ap__cn ap__cn--l'), cval);
    cr.addEventListener('input', () => { st.corners = +cr.value; paint(); });
    const lab = (t, fresh) => { const h = el('h3', 'ap__label', t); if (fresh) h.append(el('span', 'new', 'NEW')); return h; };
    c3.append(lab(S.patternStyle), pats, lab(S.bubbleColour, 1), cols, lab(S.bubbleCorners, 1), corners);

    /* 4 · theme */
    const c4 = el('section', 'ap__card'); const tms = el('div', 'ap__themes'); tms.setAttribute('role', 'radiogroup'); tms.setAttribute('aria-label', S.theme);
    const tmBtns = [['system', 'themeSystem'], ['light', 'themeLight'], ['dark', 'themeDark']].map(([id, key]) => {
      const b = el('button', 'ap__tm'); b.type = 'button'; b.setAttribute('role', 'radio');
      const ph = el('span', 'ph'); const rd = el('span', 'rd'); b.append(ph, el('span', '', S[key]), rd);
      b.addEventListener('click', () => { st.theme[slot] = id; paint(); }); tms.append(b); return [id, b, ph];
    });
    c4.append(el('h3', 'ap__label', S.theme), tms);

    /* 5 · the chat list + tips */
    const c5 = el('section', 'ap__card'); const lines = el('div', 'ap__lines'); lines.setAttribute('role', 'radiogroup'); lines.setAttribute('aria-label', S.chatPreviewLines);
    const lnBtns = [['1', 'previewLinesOne'], ['2', 'previewLinesTwo']].map(([id, key]) => {
      const b = el('button', 'ap__ln'); b.type = 'button'; b.setAttribute('role', 'radio');
      ['', 'b'].forEach((k) => { const it = el('div', 'it'); const tx = el('div', 'tx'); tx.append(el('i', 't')); for (let n = 0; n < +id; n++) tx.append(el('i')); it.append(el('span', 'av ' + k), tx); b.append(it); });
      b.append(el('span', '', S[key])); b.addEventListener('click', () => { st.lines = id; paint(); }); lines.append(b); return [id, b];
    });
    const sw = el('div', 'ap__sw'); const tg = el('button', 'ap__tg'); tg.type = 'button'; tg.setAttribute('role', 'switch'); tg.setAttribute('aria-label', S.hintsSwitch);
    tg.addEventListener('click', () => { st.tips = !st.tips; paint(); }); sw.append(el('b', '', S.hintsSwitch), tg);
    c5.append(el('h3', 'ap__label', S.chatPreviewLines), lines, sw);

    sc.append(c1, c2, c3, c4, c5);
    return { slot, root, prev, pat, who, rng, val, thBtns, ptBtns, colBtns, cr, cval, tmBtns, lnBtns, tg };
  }

  function paint() {
    const sysDark = matchMedia('(prefers-color-scheme: dark)').matches;
    phones.forEach((p) => {
      const t = st.theme[p.slot] === 'system' ? (sysDark ? 'dark' : 'light') : st.theme[p.slot];
      p.root.setAttribute('data-sxt', t);
      const g = GROUNDS.find((x) => x.id === st.ground); const dk = t === 'dark';
      p.root.style.setProperty('--ap-ground', ground(g, t));
      p.root.style.setProperty('--ap-ink', g.ink[dk ? 1 : 0]);
      p.root.style.setProperty('--ap-pat-op', st.pattern === 'none' ? 0 : (g.id === 'aurora' ? (dk ? .14 : .3) : (dk ? .14 : .18)));
      p.root.style.setProperty('--ap-sent', sentOf(g, t));
      p.root.style.setProperty('--ap-fs', st.size); p.root.style.setProperty('--ap-r', st.corners);
      p.pat.innerHTML = PAT[st.pattern];
      p.rng.value = st.size; p.rng.style.setProperty('--p', ((st.size - 12) / 10 * 100) + '%'); p.val.textContent = st.size;
      p.cr.value = st.corners; p.cr.style.setProperty('--p', ((st.corners - 4) / 18 * 100) + '%'); p.cval.textContent = st.corners;
      p.thBtns.forEach(([gg, b]) => { b.style.setProperty('--th-ground', ground(gg, t)); b.style.setProperty('--th-ink', gg.ink[dk ? 1 : 0]); b.style.setProperty('--th-op', gg.id === 'aurora' ? .3 : .16); b.style.setProperty('--th-sent', gg.id === st.ground ? sentOf(gg, t) : gg.sent[dk ? 1 : 0]); b.setAttribute('aria-checked', String(gg.id === st.ground)); });
      p.ptBtns.forEach(([id, b]) => b.setAttribute('aria-checked', String(id === st.pattern)));
      p.colBtns.forEach(([id, c, b]) => { b.style.setProperty('--c', (c || g.sent)[dk ? 1 : 0]); b.setAttribute('aria-checked', String(id === st.colour)); });
      p.tmBtns.forEach(([id, b, ph]) => {
        b.setAttribute('aria-checked', String(id === st.theme[p.slot]));
        const L = { bg: ground(g, 'light'), r: '#fff', s: sentOf(g, 'light') }, D = { bg: ground(g, 'dark'), r: '#1E2023', s: sentOf(g, 'dark') };
        const half = (x, w) => '<i style="left:8px;top:14px;width:' + w + '%;background:' + x.r + '"></i><i style="right:8px;top:34px;width:' + (w - 14) + '%;background:' + x.s + '"></i><i style="left:8px;top:54px;width:' + (w - 20) + '%;background:' + x.r + '"></i>';
        ph.style.background = id === 'dark' ? D.bg : id === 'light' ? L.bg : 'linear-gradient(115deg, transparent 50%, transparent 50%)';
        ph.innerHTML = id === 'system' ? '<span style="position:absolute;inset:0;clip-path:polygon(0 0,62% 0,38% 100%,0 100%);background:' + L.bg + '">' + half(L, 62) + '</span><span style="position:absolute;inset:0;clip-path:polygon(62% 0,100% 0,100% 100%,38% 100%);background:' + D.bg + '">' + half(D, 62) + '</span>' : half(id === 'dark' ? D : L, 62);
      });
      p.lnBtns.forEach(([id, b]) => b.setAttribute('aria-checked', String(id === st.lines)));
      p.tg.setAttribute('aria-checked', String(st.tips));
    });
  }

  /* Aurora, three takes (Damir 15:51: "does Aurora look too much like Viber?") — the violet sent bubble on a violet ground is what reads as
     Viber; A keeps the ground and gives the bubble Spixi's indigo; B makes it a real aurora (teal → blue → violet) with a deep blue bubble */
  const TAKES = [
    ['Before', 'violet bubble on violet — reads as Viber', 'linear-gradient(140deg,#7FA8FF,#B48CFF 55%,#FF9ACB)', 'linear-gradient(140deg,#1d3f9e,#4a2390 55%,#6b1f6e)', ['#6c4cf2', '#4b27e4']],
    ['A · indigo bubble', 'same ground, Spixi indigo bubble (white text 7.0 / 9.5 : 1)', 'linear-gradient(140deg,#7FA8FF,#B48CFF 55%,#FF9ACB)', 'linear-gradient(140deg,#1d3f9e,#4a2390 55%,#6b1f6e)', ['#3b3fd8', '#2529bb']],
    ['B · real aurora — PICKED (Damir 15:55)', 'teal → blue → violet, deep blue bubble (5.7 / 7.9 : 1)', 'linear-gradient(150deg,#7ee0c4 0%,#5fb4ee 48%,#8f80f2 100%)', 'linear-gradient(150deg,#0d5249 0%,#16418f 52%,#3a2592 100%)', ['#1f5bd6', '#1948a9']],
  ];
  const cmp = document.getElementById('aucmp');
  if (cmp) ['light', 'dark'].forEach((t) => TAKES.forEach(([name, note, gl, gd, sent]) => {
    const f = el('figure', 'au'); const box = el('div', 'au__box sx'); box.setAttribute('data-sxt', t);
    box.style.background = t === 'dark' ? gd : gl; box.innerHTML = PAT.contours;
    box.querySelector('svg').style.cssText = 'position:absolute;inset:0;width:100%;height:100%;color:#fff;opacity:' + (t === 'dark' ? .14 : .3);
    const r = el('div', 'au__b au__b--in', S.previewIncoming); const s = el('div', 'au__b au__b--out', S.previewOutgoing); s.style.background = sent[t === 'dark' ? 1 : 0];
    box.append(r, s); const cap = el('figcaption'); cap.append(el('b', '', name + ' · ' + t), el('span', '', note)); f.append(box, cap); cmp.append(f);
  }));
  const host = document.getElementById('apstage');
  ['light', 'dark'].forEach((slot) => { const fig = el('figure', 'stagefig'); const p = build(slot); phones.push(p); fig.append(p.root, el('figcaption', '', slot === 'light' ? 'Light' : 'Dark')); host.append(fig); });
  paint();
  /* the picked canvas starts in view (the row scrolls, the page does not) */
  phones.forEach((p) => { const b = p.thBtns.find(([g]) => g.id === st.ground)[1]; b.parentNode.scrollLeft = Math.max(0, b.offsetLeft - 18); });
})();
