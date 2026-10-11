/* KIT page: the kit sheet — each composition in light and dark. Render only. */
(function () {
  'use strict';
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const ITEMS = [
    ['about', 'About · header background', 'Today’s band art on the new full-bleed ground (the app icon sits on the lower edge in the screen).'],
    ['hero', 'What’s new · card 1', 'The original hero: the new app and four glossy chips.'],
    ['reply', 'What’s new · react, reply, edit', 'The original scene on the theme ground.'],
    ['voice', 'What’s new · voice', 'The original scene on the theme ground.'],
    ['photos', 'What’s new · photos', 'The original scene on the theme ground.'],
    ['privacy', 'What’s new · privacy', 'The original scene on the theme ground.'],
    ['apps', 'What’s new · mini apps', 'The original scene on the theme ground.'],
  ];
  let seqOld = 0;
  const oldChest = () => { const o = KITDATA.oldChest; seqOld += 1; return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + o.vb + '" class="il chold" aria-hidden="true" focusable="false">' + o.b.split('@@').join('-old' + seqOld) + '</svg>'; };
  function chests() {
    const host = document.getElementById('chests'); host.innerHTML = '';
    ['light', 'dark'].forEach((t) => {
      const fig = el('figure', 'chrow'); const pair = el('div', 'chpair');
      const draw = () => { pair.innerHTML = '';
        [['Today', oldChest()], ['Redrawn', KIT.scene('chest').fg]].forEach(([lab, svg]) => { const c = el('div', 'chcell sx'); c.setAttribute('data-sxt', t); c.innerHTML = svg; const s = el('span', '', lab); c.append(s); pair.append(c); }); };
      draw();
      const cap = el('figcaption'); cap.append(el('span', '', t === 'light' ? 'Light' : 'Dark'));
      const rp = el('button', 'pgbtn', 'Replay'); rp.type = 'button'; rp.addEventListener('click', draw); cap.append(rp);
      fig.append(pair, cap); host.append(fig);
    });
  }
  function nudges() {
    const host = document.getElementById('nudges'); host.innerHTML = ''; const N = KITDATA.nudge;
    ['light', 'dark'].forEach((t) => {
      const fig = el('figure', 'stagefig'); const ph = el('div', 'nd sx'); ph.setAttribute('data-sxt', t);
      const gh = el('div', 'nd__ghost'); for (let k = 0; k < 6; k++) gh.append(el('i'));
      const sh = el('div', 'nd__sheet'); sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-label', N.backupNudgeTitle);
      const art = el('div', 'nd__art'); art.innerHTML = KIT.scene('chest').fg;
      const cta = el('button', 'nd__cta', N.backupNudgeCta); cta.type = 'button';
      const skip = el('button', 'nd__skip', N.backupNudgeSkip); skip.type = 'button';
      sh.append(el('div', 'nd__grab'), art, el('h3', 'nd__t', N.backupNudgeTitle), el('p', 'nd__b', N.backupNudgeBody), el('p', 'nd__n', N.backupNudgeNote), cta, skip);
      ph.append(gh, el('div', 'nd__scrim'), sh);
      fig.append(ph, el('figcaption', '', t)); host.append(fig);
    });
  }
  function paint() {
    const host = document.getElementById('kitsheet'); host.innerHTML = '';
    ITEMS.forEach(([id, title, note, tall]) => {
      const card = el('figure', 'kcard'); const pair = el('div', 'kpair');
      const draw = () => { pair.innerHTML = ''; ['light', 'dark'].forEach((t) => { const p = el('div', 'kpanel kx' + (tall ? ' kpanel--tall' : '')); p.setAttribute('data-sxt', t); const s = KIT.scene(id); p.innerHTML = s.bg + s.fg; pair.append(p); }); };
      draw();
      const cap = el('figcaption'); const h = el('div', 'artcard__h'); h.append(el('b', '', title));
      const rp = el('button', 'pgbtn', 'Replay'); rp.type = 'button'; rp.addEventListener('click', draw); h.append(rp);
      cap.append(h, el('p', '', note)); card.append(pair, cap); host.append(card);
    });
  }
  const DIRS = [
    ['aboutGlass', 'Glass · LOCKED', 'Depth: frosted glass tiles, discs and a pill in three planes; the far plane out of focus, the near one sharp with a light rim; a slow float.'],
    ['aboutRings', 'Rings', 'The five rings of the header grown into the art: signal rings round the icon, a light arc travels on each, peers sit on them as small glossy spheres; the rings sway a few degrees.'],
    ['aboutMesh', 'Mesh', 'The Ixian network: peers and links across the header, fading under the bar; a few hubs glow, and now and then a light runs down a link to the icon.'],
    ['aboutWaves', 'Waves', 'Silk: four translucent ribbons rise from low left to high right and settle behind the icon; each drifts on its own slow beat. No objects.'],
    ['about', 'Today', 'Today’s band art (heart, bubble, star, orbit) on the new full-bleed ground.'],
  ];
  function abdirs() {
    const host = document.getElementById('abdirs'); if (!host) return; host.innerHTML = '';
    DIRS.forEach(([id, name, note]) => {
      const fig = el('figure', 'abd'); const pair = el('div', 'abd__pair');
      ['light', 'dark'].forEach((t) => {
        const p = el('div', 'abd__p sx'); p.setAttribute('data-sxt', t);
        const h = el('div', 'abd__h about__hdr'); const s = KIT.scene(id); h.innerHTML = s.bg + s.fg;
        const i = el('div', 'abd__i'); const ic = el('span', 'ico'); ic.innerHTML = ICONS.logo || ''; i.append(ic);
        p.append(h, i); pair.append(p);
      });
      const cap = el('figcaption'); const hh = el('div', 'artcard__h'); hh.append(el('b', '', name));
      const pick = el('button', 'pgbtn', 'Show in About'); pick.type = 'button'; pick.addEventListener('click', () => setAb(id)); hh.append(pick);
      cap.append(hh, el('p', '', note)); fig.append(pair, cap); host.append(fig);
    });
  }
  const segs = (gid, cur) => document.querySelectorAll('#' + gid + ' .seg').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === cur)));
  function setAb(v) { window.WN_ABOUT_VAR = v; try { localStorage.setItem('kit-ab', v); } catch (e) { /* */ } segs('c-ab', v); if (window.WN_RENDER) window.WN_RENDER.about(); }
  function setPal(v) { if (v) document.documentElement.dataset.pal = v; else delete document.documentElement.dataset.pal; try { localStorage.setItem('kit-pal', v); } catch (e) { /* */ }
    segs('c-pal', v); if (window.WN_RENDER) window.WN_RENDER.stage(); paint(); }
  document.querySelectorAll('#c-ab .seg').forEach((b) => b.addEventListener('click', () => setAb(b.dataset.v)));
  document.querySelectorAll('#c-pal .seg').forEach((b) => b.addEventListener('click', () => setPal(b.dataset.v)));
  segs('c-ab', window.WN_ABOUT_VAR); segs('c-pal', document.documentElement.dataset.pal || '');
  const all = () => { paint(); chests(); nudges(); abdirs(); };
  document.getElementById('rm').addEventListener('change', all);
  document.getElementById('replay').addEventListener('click', () => { chests(); nudges(); abdirs(); if (window.WN_RENDER) window.WN_RENDER.about(); });
  all();
})();
