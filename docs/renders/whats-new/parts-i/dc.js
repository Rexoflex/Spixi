/* SPIXI · DOWNLOADS + CONTRIBUTORS (premium) — two live screens, light + dark. Render only: no bridge, no file access. */
(function () {
  'use strict';
  const S = DC.str, I = DC.icons;
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const ico = (n) => { const s = el('span', 'ico'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + I[n] + '</svg>'; return s; };
  const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m));
  let uid = 0;

  /* a stand-in "photo" (the real list shows the received photo itself, as a thumbnail by URL — Session 16 lever #1) */
  const PAL = [['#ffb26b', '#ff6f91', '#845ec2', '#2c2a4a'], ['#9be7ff', '#4fa3ff', '#2b4c9b', '#1a2547'], ['#ffe08a', '#ffb347', '#d2694a', '#5b2a3c'], ['#c6f6d5', '#68d391', '#2f855a', '#1c4532'],
    ['#fbc2eb', '#a18cd1', '#6a5acd', '#2d2a5a'], ['#ffd1a6', '#ff9a8b', '#e0607e', '#4a2545'], ['#b8f1ff', '#7fd3ff', '#3f8ff7', '#173a7c'], ['#fff1c1', '#f7c873', '#c58c4a', '#3d2a1e']];
  function photo(k) {
    const p = PAL[k % PAL.length], id = 'p' + (++uid), sx = 30 + (k * 37) % 50, sy = 26 + (k * 13) % 20;
    return '<svg class="ph-img" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p[0] + '"/><stop offset=".6" stop-color="' + p[1] + '"/></linearGradient></defs>'
      + '<rect width="100" height="100" fill="url(#' + id + ')"/><circle cx="' + sx + '" cy="' + sy + '" r="9" fill="#fff" opacity=".85"/>'
      + '<path d="M0 72L22 48L40 64L58 40L80 62L100 50V100H0Z" fill="' + p[2] + '"/><path d="M0 86L30 70L55 82L78 68L100 78V100H0Z" fill="' + p[3] + '" opacity=".9"/></svg>';
  }
  const KB = (n) => n >= 1024 ? (n / 1024).toFixed(1) + ' MB' : n + ' KB';
  const FILES = [
    { k: 'photo', n: 'photo-20261011-094112.jpg', kb: 184, from: 'Ana Kovač', t: '9:41 AM', day: 'today', img: 6 },
    { k: 'pdf', n: 'Ixian-whitepaper.pdf', kb: 1229, from: 'Ana Kovač', t: '9:38 AM', day: 'today' },
    { k: 'zip', n: 'mini-app-build.zip', kb: 340, from: 'Ana Kovač', t: '6:02 PM', day: 'yesterday' },
    ...[95, 66, 92, 49, 30, 163, 123].map((kb, i) => ({ k: 'photo', n: 'photo-20261010-181022-' + (i + 2) + '.jpg', kb, from: 'TempestNova777', t: '8:10 PM', day: 'Oct 10', img: i })),
  ];
  const KIND = { photo: ['photo', 'linear-gradient(160deg,#6aa8ff,#2160c2)', 'JPG', '#4f86ff'], pdf: ['file-text', 'linear-gradient(160deg,#ff8a80,#d63c3c)', 'PDF', '#e0524f'], zip: ['file-zip', 'linear-gradient(160deg,#ffcf70,#e08a1e)', 'ZIP', '#e8a33a'] };

  function downloads(theme) {
    const root = el('div', 'ph sx'); root.setAttribute('data-sxt', theme); const sc = el('div', 'sc'); root.append(sc);
    const st = { filter: 'all', select: false, sel: new Set() };
    const status = el('div', 'st'); status.append(el('span', '', '15:27'), el('span', '', '5G · 28%'));
    const tb = el('div', 'tb'); const back = ico('arrow-left'); const title = el('b', '', S.downloads); const selBtn = el('button', 'tbtn', S.select); selBtn.type = 'button'; tb.append(back, title, selBtn);
    const search = el('div', 'search'); search.append(ico('search'), el('span', '', S.searchDownloads));
    /* summary */
    const sum = el('section', 'sum'); const total = FILES.reduce((a, f) => a + f.kb, 0);
    const top = el('div', 'sum__top'); top.append(el('span', 'sum__n', fmt(S.downloadsCount, { n: FILES.length })), el('span', 'sum__s', '· ' + KB(total)));
    const bar = el('div', 'sum__bar'); const leg = el('div', 'sum__leg');
    [['photo', S.photos], ['pdf', 'PDF'], ['zip', 'ZIP']].forEach(([k, lab], i) => { const kb = FILES.filter((f) => f.k === k).reduce((a, f) => a + f.kb, 0); const seg = el('i'); seg.style.flex = String(kb); seg.style.background = KIND[k][3]; seg.style.animationDelay = (i * .12) + 's'; bar.append(seg);
      const l = el('span', '', lab + ' · ' + KB(kb)); l.style.setProperty('--c', KIND[k][3]); leg.append(l); });
    const del = el('button', 'sum__del', S.clearDownloads); del.type = 'button';
    sum.append(top, bar, leg, del);
    /* filters */
    const flt = el('div', 'flt'); const chips = [['all', S.all], ['photo', S.photos], ['file', S.sharedFiles]].map(([id, lab]) => { const c = el('button', 'chip', lab); c.type = 'button'; c.addEventListener('click', () => { st.filter = id; paint(); }); flt.append(c); return [id, c]; });
    const from = el('button', 'chip chip--from'); from.type = 'button'; from.append(el('span', '', fmt(S.downloadsFromChip, { name: S.downloadsAllSenders })), ico('chevron-down')); flt.append(from);
    const list = el('div');
    const selbar = el('div', 'selbar'); const selN = el('b'); const showIn = el('button', 'g'); showIn.type = 'button'; showIn.append(ico('message'), el('span', '', S.showInChat));
    const delSel = el('button', 'r'); delSel.type = 'button'; delSel.append(ico('trash'), el('span', '', S.delete)); selbar.append(selN, showIn, delSel);
    sc.append(status, tb, search, sum, flt, list); root.append(selbar);
    selBtn.addEventListener('click', () => { st.select = !st.select; st.sel.clear(); paint(); });
    function toggle(i) { if (!st.select) { st.select = true; } if (st.sel.has(i)) st.sel.delete(i); else st.sel.add(i); paint(); }
    function paint() {
      root.classList.toggle('selecting', st.select); selBtn.textContent = st.select ? S.cancel : S.select;
      chips.forEach(([id, c]) => c.setAttribute('aria-pressed', String(id === st.filter)));
      list.innerHTML = '';
      const shown = FILES.map((f, i) => [f, i]).filter(([f]) => st.filter === 'all' || (st.filter === 'photo' ? f.k === 'photo' : f.k !== 'photo'));
      ['today', 'yesterday', 'Oct 10'].forEach((day) => {
        const items = shown.filter(([f]) => f.day === day); if (!items.length) return;
        const h = el('div', 'day'); h.append(el('span', '', day === 'today' ? S.today : day === 'yesterday' ? S.yesterday : day), el('span', '', KB(items.reduce((a, [f]) => a + f.kb, 0)))); list.append(h);
        const ph = items.filter(([f]) => f.k === 'photo'), fl = items.filter(([f]) => f.k !== 'photo');
        if (ph.length) { const g = el('div', 'grid'); ph.forEach(([f, i], n) => { const b = el('button', 'th'); b.type = 'button'; b.setAttribute('aria-label', f.n + ', ' + KB(f.kb)); b.setAttribute('aria-selected', String(st.sel.has(i)));
          b.innerHTML = photo(f.img); b.firstChild.style.setProperty('--d', (n * .05) + 's'); const ck = el('span', 'ck'); ck.append(ico('check')); b.append(ck, el('span', 'sz', KB(f.kb)));
          b.addEventListener('click', () => { if (st.select) toggle(i); }); b.addEventListener('contextmenu', (e) => { e.preventDefault(); toggle(i); }); g.append(b); }); list.append(g); }
        if (fl.length) { if (ph.length) { const gap = el('div'); gap.style.height = '8px'; list.append(gap); } const box = el('div', 'files'); fl.forEach(([f, i]) => { const r = el('button', 'fr'); r.type = 'button'; r.setAttribute('aria-selected', String(st.sel.has(i)));
          const t = el('span', 'ft'); t.style.setProperty('--g', KIND[f.k][1]); t.append(ico(KIND[f.k][0]), el('em', '', KIND[f.k][2]));
          const tx = el('span', 'tx'); tx.append(el('b', '', f.n), el('span', '', fmt(S.downloadsFrom, { name: f.from }) + ' · ' + KB(f.kb) + ' · ' + f.t));
          const ck = el('span', 'ck'); ck.append(ico('check')); r.append(ck, t, tx); r.addEventListener('click', () => { if (st.select) toggle(i); }); r.addEventListener('contextmenu', (e) => { e.preventDefault(); toggle(i); }); box.append(r); }); list.append(box); }
      });
      selN.textContent = fmt(S.selectedCount, { n: st.sel.size }); selbar.classList.toggle('on', st.sel.size > 0); showIn.style.display = st.sel.size === 1 ? '' : 'none';
    }
    paint();
    return root;
  }

  /* ---------- Contributors ---------- */
  const AV = ['linear-gradient(150deg,#9ccbff,#2f7be3)', 'linear-gradient(150deg,#ffb3c8,#e23a6a)', 'linear-gradient(150deg,#c9a6ff,#7b4dff)', 'linear-gradient(150deg,#8ef0c9,#2db38b)', 'linear-gradient(150deg,#ffe08a,#f2a93b)', 'linear-gradient(150deg,#9be8ff,#2fa6ff)'];
  const CRI = { creditSounds: ['volume', 'linear-gradient(160deg,#c9a6ff,#7b4dff)'], creditIcons: ['icons', 'linear-gradient(160deg,#6aa8ff,#2160c2)'], creditFlags: ['flag', 'linear-gradient(160deg,#ffb3c8,#e23a6a)'] };
  /* the header: the About band's grammar in a warmer key (violet → pink, gratitude), a glass heart with the handshake etched, coloured bokeh */
  function header() {
    const u = 'h' + (++uid);
    return '<svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs>'
      + '<linearGradient id="g' + u + '" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="var(--dc-a)"/><stop offset=".6" stop-color="var(--dc-b)"/><stop offset="1" stop-color="var(--dc-c)"/></linearGradient>'
      + '<linearGradient id="s' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0630" stop-opacity=".25"/><stop offset="1" stop-color="#0b0630" stop-opacity="0"/></linearGradient>'
      + '<radialGradient id="c' + u + '" cx=".64" cy=".7" r=".8"><stop offset="0" stop-color="#ff5fa8"/><stop offset=".6" stop-color="#ffb3dc" stop-opacity=".85"/><stop offset="1" stop-color="#ffd9ee" stop-opacity=".4"/></radialGradient>'
      + '<linearGradient id="f' + u + '" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".45" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
      + '<linearGradient id="r' + u + '" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".5" stop-color="#fff" stop-opacity=".15"/><stop offset="1" stop-color="#fff" stop-opacity=".4"/></linearGradient>'
      + '<filter id="b' + u + '" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="9"/></filter>'
      + '<filter id="d' + u + '" x="-60%" y="-60%" width="220%" height="240%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="7"/><feOffset dy="8" result="o"/><feFlood flood-color="#4a0f5a" flood-opacity=".35"/><feComposite in2="o" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      + '</defs><rect width="400" height="250" fill="url(#g' + u + ')"/>'
      + '<g class="dc-drift"><circle cx="62" cy="96" r="44" fill="#9be8ff" fill-opacity=".35" filter="url(#b' + u + ')"/><circle cx="350" cy="70" r="40" fill="#ffe08a" fill-opacity=".35" filter="url(#b' + u + ')"/><circle cx="300" cy="190" r="26" fill="#ff9fd2" fill-opacity=".4" filter="url(#b' + u + ')"/><circle cx="110" cy="200" r="20" fill="#c9a6ff" fill-opacity=".45" filter="url(#b' + u + ')"/></g>'
      + '<rect width="400" height="96" fill="url(#s' + u + ')"/>'
      + [[90, 150, 4], [318, 128, 3], [146, 96, 2.6], [262, 82, 3.4], [56, 196, 2.2], [352, 206, 2.6]].map(([x, y, r], k) => '<path d="M' + x + ' ' + (y - r * 2) + 'Q' + x + ' ' + y + ' ' + (x + r * 2) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y + r * 2) + 'Q' + x + ' ' + y + ' ' + (x - r * 2) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y - r * 2) + 'Z" fill="#fff" class="dc-tw" style="--i:' + k + '"/>').join('')
      /* the glass heart */
      + '<g transform="translate(200 150) scale(1.22)"><g class="dc-float">'
      + '<ellipse cx="4" cy="58" rx="46" ry="9" fill="#ff5fa8" opacity=".45" filter="url(#b' + u + ')"/>'
      + '<g filter="url(#d' + u + ')"><path d="M0 46C-30 26-52 6-52-16-52-34-38-46-22-46-10-46-3-39 0-32 3-39 10-46 22-46 38-46 52-34 52-16 52 6 30 26 0 46Z" fill="url(#c' + u + ')"/></g>'
      + '<path d="M0 46C-30 26-52 6-52-16-52-34-38-46-22-46-10-46-3-39 0-32 3-39 10-46 22-46 38-46 52-34 52-16 52 6 30 26 0 46Z" fill="url(#f' + u + ')"/>'
      + '<path d="M0 46C-30 26-52 6-52-16-52-34-38-46-22-46-10-46-3-39 0-32 3-39 10-46 22-46 38-46 52-34 52-16 52 6 30 26 0 46Z" fill="none" stroke="url(#r' + u + ')" stroke-width="1.3"/>'
      + '<svg x="-20" y="-28" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + I['heart-handshake'] + '</svg>'
      + '</g></g></svg>';
  }
  function contributors(theme) {
    const root = el('div', 'ph sx cx'); root.setAttribute('data-sxt', theme); const sc = el('div', 'sc'); root.append(sc);
    const hdr = el('div', 'hdr'); hdr.innerHTML = header();
    const status = el('div', 'st'); status.append(el('span', '', '15:27'), el('span', '', '5G · 28%'));
    const tb = el('div', 'tb'); tb.append(ico('arrow-left'), el('b', '', S.contributors));
    const lead = el('div', 'cx__lead'); lead.append(el('h2', '', S.thanks), el('p', '', S.contributorsLead));
    const names = el('div', 'cx__names');
    DC.names.forEach((n, k) => { const b = el('button', 'nm'); b.type = 'button'; b.style.setProperty('--d', (.25 + k * .05) + 's');
      const a = el('i', '', (n.replace(/[^A-Za-z0-9]/g, '')[0] || n[0]).toUpperCase()); a.style.setProperty('--a', AV[k % AV.length]); b.append(a, el('span', '', n));
      b.addEventListener('click', () => { b.classList.remove('burst'); void b.offsetWidth; b.classList.add('burst');
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        for (let i = 0; i < 8; i++) { const s = el('span', 'spk'); const an = i / 8 * Math.PI * 2; s.style.setProperty('--x', Math.cos(an) * 34 + 'px'); s.style.setProperty('--y', Math.sin(an) * 24 + 'px');
          s.style.setProperty('--c', ['#ff5fa8', '#7b4dff', '#2fa6ff', '#f2a93b'][i % 4]); s.innerHTML = '<svg viewBox="-6.5 -6.5 13 13"><path d="M0-6.5C.5-2.2 2.2-.5 6.5 0 2.2.5.5 2.2 0 6.5-.5 2.2-2.2.5-6.5 0-2.2-.5-.5-2.2 0-6.5Z" fill="currentColor"/></svg>'; b.append(s); setTimeout(() => s.remove(), 750); } });
      names.append(b); });
    const cr = el('div', 'cr');
    DC.credits.forEach((c) => { const r = el('div', 'crr'); const t = el('span', 'ft'); t.style.setProperty('--g', CRI[c.key][1]); t.append(ico(CRI[c.key][0]));
      const tx = el('span', 'tx'); tx.append(el('b', '', S[c.key]), el('span', '', c.source), el('span', 'lic', c.licence)); r.append(t, tx, ico('external-link')); cr.append(r); });
    sc.append(hdr, status, tb, lead, names, el('div', 'cx__lab', S.creditsTitle), cr);
    return root;
  }

  const d = document.getElementById('dl'), c = document.getElementById('ct');
  ['light', 'dark'].forEach((t) => { const f1 = el('figure', ''); f1.style.margin = '0'; f1.append(downloads(t), el('figcaption', 'cap', t)); d.append(f1);
    const f2 = el('figure', ''); f2.style.margin = '0'; f2.append(contributors(t), el('figcaption', 'cap', t)); c.append(f2); });
})();
