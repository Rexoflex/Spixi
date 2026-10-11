/* THREAD page extras: the scene pairs, the panorama, the other slots, the before/after. Render only. */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const NAMES = { hero: 'Meet the new Spixi', reply: 'React, reply and edit', voice: 'Voice messages', photos: 'Photos and albums', privacy: 'Your privacy, your switches', apps: 'Mini apps, together' };
  const NOTE = {
    hero: 'Inverted onto brand indigo (the full-bleed card). The phone, four feature nodes on one thread; the spark runs through.',
    reply: 'The thread enters the received bubble; the sent bubble is the accent plane, like in the app. Heart and pencil pop; the last line re-writes.',
    voice: 'The thread itself becomes the voice: it swells into a waveform between the mic and play. The spark is the sound.',
    photos: 'Three frames fan out on the thread; the location pin is struck out in the accent and fades.',
    privacy: 'Three switches sit on the thread and go off one by one; the eye-off node drops in.',
    apps: 'You and your contact on one thread, the app grid between you; one tile is the game, the check is the accept.',
  };
  function panel(theme, html, cls) { const p = el('div', 'thpanel thx ' + (cls || '')); p.setAttribute('data-sxt', theme); p.innerHTML = html; return p; }
  function scenes() {
    const host = $('#thscenes'); host.innerHTML = '';
    DATA.slides.forEach((id, k) => {
      const card = el('figure', 'thcard');
      const pair = el('div', 'thpair');
      const paint = () => { pair.innerHTML = ''; ['light', 'dark'].forEach((t) => { const s = TH_ART.scene(id); pair.append(panel(t, s.bg + s.fg)); }); };
      paint();
      const cap = el('figcaption'); const h = el('div', 'artcard__h'); h.append(el('b', '', (k + 1) + ' · ' + NAMES[id]));
      const rp = el('button', 'pgbtn', 'Replay'); rp.type = 'button'; rp.addEventListener('click', paint); h.append(rp);
      cap.append(h, el('p', '', NOTE[id])); card.append(pair, cap); host.append(card);
    });
  }
  function panorama() {
    const host = $('#thpano'); host.innerHTML = '';
    ['light', 'dark'].forEach((t) => {
      const row = el('div', 'thpano__row');
      DATA.slides.forEach((id) => { const s = TH_ART.scene(id); row.append(panel(t, s.bg + s.fg, 'thpanel--pano')); });
      host.append(row);
    });
  }
  function slots() {
    const host = $('#thslots'); host.innerHTML = '';
    [['p2p', 'Welcome · private, peer to peer', 'Replaces the welcome slide 1 art: two phones on one thread, the server dashed and struck out.'],
     ['chatsEmpty', 'Chats · empty state', 'A sent bubble waiting on the thread; the other side types.'],
     ['backup', 'Backup nudge', 'The shield wraps the one backup file; the key sits on the thread.']].forEach(([n, title, note]) => {
      const card = el('figure', 'thcard thcard--slot'); const pair = el('div', 'thpair');
      const paint = () => { pair.innerHTML = ''; ['light', 'dark'].forEach((t) => pair.append(panel(t, '<div class="thg"></div>' + TH_ART.slot(n), 'thpanel--sq'))); };
      paint();
      const cap = el('figcaption'); const h = el('div', 'artcard__h'); h.append(el('b', '', title));
      const rp = el('button', 'pgbtn', 'Replay'); rp.type = 'button'; rp.addEventListener('click', paint); h.append(rp);
      cap.append(h, el('p', '', note)); card.append(pair, cap); host.append(card);
    });
  }
  function before() {
    const host = $('#thbefore'); host.innerHTML = '';
    const a = el('figure', 'thcard'); const pa = el('div', 'thpanel'); pa.style.background = '#120e3a';
    const s1 = WN_ART.scene('voice'); pa.innerHTML = s1.bg + s1.fg; a.append(pa, Object.assign(el('figcaption'), { innerHTML: '<b>Today · glossy tiles</b><p>Pseudo-3-D tiles with a side, gloss, drop shadows, glows, sparkles, on a fixed dark panel.</p>' }));
    const b = el('figure', 'thcard'); const s2 = TH_ART.scene('voice'); const pb = panel('light', s2.bg + s2.fg);
    b.append(pb, Object.assign(el('figcaption'), { innerHTML: '<b>Thread · one line, two planes</b><p>One drawn line, two flat off-register planes, one moving spark; light and dark from tokens.</p>' }));
    host.append(a, b);
  }
  function all() { scenes(); panorama(); slots(); before(); }
  document.getElementById('rm').addEventListener('change', all);
  all();
})();
