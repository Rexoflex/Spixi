/* SPIXI · MOMENT SHEETS (Damir 17:12) — seven one-time sheets, each in light and dark. Render only: no bridge.
   Art = the glass grammar of the About header (frosted objects, a coloured core, an etched white symbol, a soft
   caustic) inside the What's new panel (vivid blue → violet). One entrance, then a slow float. */
(function () {
  'use strict';
  const S = MO.str, I = MO.icons;
  let seq = 0;
  const f = (n) => Math.round(n * 10) / 10;
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const ico = (n) => '<span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + I[n] + '</svg></span>';
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  /* ---------- the art ---------- */
  const TINT = { vi: ['#d2b8ff', '#7b4dff'], au: ['#ffe08a', '#f2a93b'], cy: ['#a6ecff', '#2fa6ff'], pk: ['#ffb3dc', '#b45cff'], gn: ['#a8f5d4', '#1fb488'], bl: ['#b7d0ff', '#3a6ce0'] };
  function artDefs(u) {
    return '<defs>' + Object.keys(TINT).map((k) => '<radialGradient id="t' + k + u + '" cx=".66" cy=".7" r=".8"><stop offset="0" stop-color="' + TINT[k][1] + '"/><stop offset=".6" stop-color="' + TINT[k][0] + '" stop-opacity=".88"/><stop offset="1" stop-color="' + TINT[k][0] + '" stop-opacity=".4"/></radialGradient>'
        + '<radialGradient id="c' + k + u + '" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="' + TINT[k][1] + '" stop-opacity=".55"/><stop offset="1" stop-color="' + TINT[k][1] + '" stop-opacity="0"/></radialGradient>').join('')
      + '<linearGradient id="gf' + u + '" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".4" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
      + '<linearGradient id="gr' + u + '" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".5" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity=".42"/></linearGradient>'
      + '<radialGradient id="lt' + u + '" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
      + '<filter id="gb' + u + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>'
      + '<filter id="gbF' + u + '" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="10"/></filter>'
      + '<filter id="gsh' + u + '" x="-60%" y="-60%" width="220%" height="240%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="5"/><feOffset dy="5" result="o"/><feFlood flood-color="#06134a" flood-opacity=".26"/><feComposite in2="o" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      + '<path id="sp' + u + '" d="M0-6.5C.5-2.2 2.2-.5 6.5 0 2.2.5.5 2.2 0 6.5-.5 2.2-2.2.5-6.5 0-2.2-.5-.5-2.2 0-6.5Z"/>'
      + '</defs>';
  }
  /* one glass object at the origin: caustic · coloured core · frost · rim · etched symbol (no specular streak, 14:38) */
  const glass = (u, shape, tint, symbol, w, h) => '<ellipse cx="' + f(w * .06) + '" cy="' + f(h * .5 + 7) + '" rx="' + f(w * .5) + '" ry="' + f(h * .16 + 3) + '" fill="url(#c' + tint + u + ')" filter="url(#gb' + u + ')"/>'
    + '<g filter="url(#gsh' + u + ')">' + shape.replace('/>', ' fill="url(#t' + tint + u + ')"/>') + '</g>'
    + shape.replace('/>', ' fill="url(#gf' + u + ')"/>')
    + shape.replace('/>', ' fill="none" stroke="url(#gr' + u + ')" stroke-width="1.2"/>')
    + (symbol || '');
  const sym = (n, s, sw) => '<svg x="' + (-s / 2) + '" y="' + (-s / 2) + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-opacity=".96" stroke-width="' + (sw || 2) + '" stroke-linecap="round" stroke-linejoin="round">' + I[n] + '</svg>';
  const word = (t, size, dy) => '<text y="' + (dy || 0) + '" text-anchor="middle" dominant-baseline="central" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-weight="700" font-size="' + size + '" fill="#fff" fill-opacity=".96">' + t + '</text>';
  const at = (x, y, rot, inner, o, d, dy, sc) => '<g transform="translate(' + x + ' ' + y + ') rotate(' + (rot || 0) + ')' + (sc ? ' scale(' + sc + ')' : '') + '"><g class="mo-in" style="--o:' + o + 's"><g class="mo-float" style="--d:' + d + 's;--dy:' + dy + 'px">' + inner + '</g></g></g>';
  const far = (u, x, y, r, c, o) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + c + '" fill-opacity="' + o + '" filter="url(#gbF' + u + ')"/>';
  const spark = (u, x, y, s, i) => '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><use href="#sp' + u + '" class="mo-tw" style="--i:' + i + '" fill="#fff"/></g>';
  const disc = (u, r, tint, inner) => glass(u, '<circle r="' + r + '"/>', tint, inner, r * 2, r * 2);
  const tile = (u, w, h, rx, tint, inner) => glass(u, '<rect x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="' + rx + '"/>', tint, inner, w, h);
  const BUB = '<path d="M-22 -20H22A18 18 0 0 1 22 16H-14L-24 24L-22 15.2A18 18 0 0 1 -22 -20Z"/>';
  const BUBR = '<path d="M22 -20H-22A18 18 0 0 0 -22 16H14L24 24L22 15.2A18 18 0 0 0 22 -20Z"/>';
  const pill = (u, tint, t, w) => tile(u, w, 44, 22, tint, word(t, t.length > 6 ? 16 : 18, 0));
  const phoneT = (u, tint, inner) => tile(u, 42, 70, 11, tint, '<rect x="-15" y="-27" width="30" height="48" rx="5" fill="#fff" fill-opacity=".12"/>' + inner + '<path d="M-5 29h10" stroke="#fff" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/>');
  const FILE = '<path d="M-24 -32H12L24 -20V28Q24 32 20 32H-20Q-24 32 -24 28V-28Q-24 -32 -20 -32Z"/>';
  const LAND = '<circle cx="11" cy="-10" r="5" fill="#fff" fill-opacity=".92"/><path d="M-22 17L-7 1L3 10L11 3L22 14" fill="none" stroke="#fff" stroke-opacity=".95" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"/>';
  const LANDs = '<circle cx="4.5" cy="-4" r="2.2" fill="#fff"/><path d="M-9 7L-3 0L1 4L5 1L9 6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>';
  const SHIELD = '<path d="M0 -30L25 -21V0C25 16 14 27 0 33C-14 27 -25 16 -25 0V-21Z"/>';
  const lines = (n, w) => Array.from({ length: n }, (_, k) => '<path d="M-14 ' + (-8 + k * 8) + 'h' + (k === n - 1 ? w * .6 : w) + '" stroke="#fff" stroke-opacity="' + (.95 - k * .2) + '" stroke-width="3.4" stroke-linecap="round"/>').join('');

  const ART = {
    lang: (u, o) => at(126, 68, -4, pill(u, 'cy', 'Hello', 92), .15, 13, -4)
      + at(234, 94, 4, pill(u, 'vi', (o && o.hello) || '你好', Math.max(92, ((o && o.hello) || '你好').length * 11 + 34)), .3, 15, 4)
      + spark(u, 186, 36, 1.5, 0) + spark(u, 284, 44, .9, 1) + spark(u, 82, 116, .8, 2),
    autodl: (u) => at(132, 80, -14, tile(u, 48, 48, 13, 'bl', ''), .1, 16, 3)
      + at(212, 74, 12, tile(u, 48, 48, 13, 'vi', ''), .2, 15, -3)
      + at(170, 72, -3, tile(u, 66, 66, 18, 'pk', LAND), .3, 14, -4)
      + at(206, 106, 0, disc(u, 20, 'cy', '<circle r="14.5" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="2.6"/><circle r="14.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" pathLength="100" stroke-dasharray="100" class="mo-ring" transform="rotate(-90)"/>' + sym('arrow-down', 15, 2.6)), .55, 12, 2)
      + spark(u, 92, 44, .8, 0) + spark(u, 282, 112, .9, 1),
    offline: (u) => at(108, 84, -6, phoneT(u, 'vi', '<g opacity=".55">' + sym('photo', 18) + '</g>'), .15, 15, -3)
      + at(88, 56, 0, disc(u, 13, 'au', sym('moon', 14)), .3, 12, 3)
      + '<path d="M128 70C150 30 210 30 232 70" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2.2" stroke-dasharray="2 7" stroke-linecap="round" class="mo-in" style="--o:.4s"/>'
      + at(180, 40, -8, tile(u, 26, 26, 8, 'pk', LANDs), .55, 9, -5)
      + at(252, 84, 6, phoneT(u, 'bl', '<rect x="-11" y="-11" width="22" height="22" rx="6" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.6" stroke-dasharray="3 3.4"/>'), .3, 14, 3)
      + at(272, 110, 0, disc(u, 13, 'cy', sym('clock-hour-4', 15)), .7, 12, -3),
    firstIxi: (u) => at(120, 82, -6, phoneT(u, 'vi', '<circle r="12" fill="#ffd15c" fill-opacity=".95"/><circle r="8.4" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1"/><use href="#sp' + u + '" transform="scale(.9)" fill="#fff"/>'), .15, 15, -3)
      + '<path d="M146 82H204" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2.2" stroke-dasharray="2 7" stroke-linecap="round" class="mo-in" style="--o:.4s"/><path d="M200 76L207 82L200 88" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="mo-in" style="--o:.45s"/>'
      + at(242, 80, 5, glass(u, FILE, 'gn', '<path d="M12 -32V-20H24" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.4" stroke-linejoin="round"/>' + sym('key', 22, 2.2), 48, 64), .55, 13, 4)
      + at(266, 108, 0, disc(u, 12, 'bl', sym('check', 13, 2.8)), .8, 12, -3)
      + spark(u, 84, 46, .9, 0) + spark(u, 286, 44, .9, 1),
    mic: (u) => at(156, 78, 0, disc(u, 32, 'bl', '<circle r="27.5" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/>' + sym('microphone', 30)), .15, 14, -4)
      + at(240, 84, 0, tile(u, 76, 32, 16, 'cy', [6, 12, 18, 10, 14, 7].map((h, k) => '<path d="M' + (-25 + k * 10) + ' ' + (-h / 2) + 'v' + h + '" stroke="#fff" stroke-opacity=".95" stroke-width="3.4" stroke-linecap="round"/>').join('')), .4, 13, 4)
      + spark(u, 98, 52, .9, 0) + spark(u, 282, 50, .8, 1),
    app: (u) => at(152, 78, -6, tile(u, 60, 60, 18, 'pk', sym('apps', 28)), .15, 14, -4)
      + at(218, 48, 0, disc(u, 16, 'vi', sym('key', 17)), .35, 12, 3)
      + at(240, 98, 0, disc(u, 16, 'cy', sym('database', 17)), .5, 13, -3)
      + at(96, 108, 0, disc(u, 14, 'bl', sym('users', 15)), .65, 15, 3)
      + spark(u, 278, 62, .8, 1),
    pay: (u) => at(146, 86, 0, disc(u, 28, 'au', '<circle r="20.5" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.2"/><use href="#sp' + u + '" transform="scale(1.7)" fill="#fff"/>'), .15, 15, -4)
      + at(204, 54, 0, disc(u, 19, 'bl', sym('arrow-up-right', 20, 2.4)), .35, 12, 3)
      + at(238, 102, 0, disc(u, 16, 'gn', sym('check', 18, 2.6)), .5, 13, -3)
      + spark(u, 96, 50, .8, 0) + spark(u, 276, 60, .9, 1),
  };
  function art(kind, o) {
    const u = '-m' + (++seq);
    return '<svg class="mo-art" viewBox="0 0 360 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' + artDefs(u)
      + '<ellipse cx="180" cy="70" rx="150" ry="70" fill="url(#lt' + u + ')"/>'
      + far(u, 40, 110, 34, '#c9a6ff', .26) + far(u, 330, 34, 30, '#8fe3ff', .26)
      + ART[kind](u, o) + '</svg>';
  }

  /* ---------- the screen under the sheet (dimmed) ---------- */
  const B = (side, w, h) => '<div class="cb cb--' + side + '" style="width:' + w + '%;height:' + (h || 40) + 'px"></div>';
  function under(m, L) {
    if (m.ctx === 'lang') {
      return '<div class="cx-top">' + ico('arrow-left') + '<b>' + esc(L.langTitle) + '</b></div><div class="cx-card">'
        + L.langs.map(([n, on]) => '<div class="cx-row"><span>' + n + '</span>' + (on ? '<i class="cx-on">' + ico('check') + '</i>' : '') + '</div>').join('') + '</div>';
    }
    if (m.ctx === 'wallet') {
      return '<div class="cx-top"><b>Wallet</b></div><div class="cx-bal"><small>Balance</small><strong>25.00 IXI</strong><span>≈ $0.09</span></div>'
        + '<div class="cx-card"><div class="cx-row"><span class="cx-in">' + ico('arrow-left') + '</span><span>Payment received · Ana Kovač</span><b>+25 IXI</b></div></div>';
    }
    const name = m.name || 'Ana Kovač';
    return '<div class="cx-top">' + ico('arrow-left') + '<span class="cx-av">' + name[0] + '</span><b>' + esc(name) + '</b>' + ico('dots-vertical') + '</div>'
      + '<div class="cx-msgs">' + (m.bubbles || [B('in', 62), B('out', 54), B('in', 46, 56)]).join('') + '</div>'
      + '<div class="cx-comp">' + (m.locked ? '<div class="cx-pill cx-pill--wait">' + esc(m.locked) + '</div>' : ico('plus') + '<div class="cx-pill">Message</div>' + ico('microphone')) + '</div>';
  }

  /* ---------- the seven ---------- */
  const M = [
    { id: 'lang', n: 1, h: 'AI translation notice', ctx: 'lang', art: 'lang', idea: 'Damir',
      when: 'After the new language is applied — so the sheet is already in that language. Once per language; never for English.',
      per: { light: 'de', dark: 'fr' } },
    { id: 'autodl', n: 2, h: 'Download photos automatically', ctx: 'chat', art: 'autodl', idea: 'Damir',
      bubbles: ['<div class="cb cb--in cb--photo"><i></i><span>Downloaded</span></div>', B('out', 50)],
      when: 'The first manual photo download has finished and the photo is on screen. Only while the setting is Off and “Load pictures and GIFs” is on.',
      t: S.autoTitle, b: S.autoBody, btn: [['fill', S.wifi], ['tonal', S.always], ['text', S.notNow]] },
    { id: 'offline', n: 3, h: 'File from an offline sender', ctx: 'chat', art: 'offline',
      bubbles: [B('out', 52), '<div class="cb cb--in cb--file">' + ico('file-text') + '<span>Ixian-whitepaper.pdf<small>' + esc(S.offWait) + '</small></span></div>'],
      when: 'The first download that waits because the sender’s app is offline. The download continues by itself when they come online.',
      t: S.offTitle, b: S.offBody, btn: [['fill', 'OK']] },
    { id: 'firstIxi', n: 4, h: 'First IXI received, no backup', ctx: 'wallet', art: 'firstIxi', safety: true,
      when: 'The first incoming payment while the backup status is “Not backed up yet” or has new contacts since the last backup. Shows even when another card showed.',
      t: S.ixiTitle, b: S.ixiBody, btn: [['fill', S.backupNow], ['text', S.later]] },
    { id: 'mic', n: 5, h: 'Microphone, before the system dialog', ctx: 'chat', art: 'mic',
      when: 'The first tap on the mic, before the system asks for permission. Android, iOS and macOS ask once. Windows: an unpackaged desktop app gets no dialog — check the Spixi build; no dialog = no sheet.',
      t: S.micTitle, b: S.micBody, btn: [['fill', S.cont], ['text', S.notNow]] },
    { id: 'app', n: 6, h: 'A mini app from an invite', ctx: 'chat', art: 'app',
      bubbles: [B('out', 40), '<div class="cb cb--in cb--app"><i>' + ico('apps') + '</i><span>Chess<small>App invite</small></span></div>'],
      when: 'The first time each mini app opens, from an invite or from Apps. Rows = the app’s own capabilities (cap_*); the first line names who invited you, when there is one.',
      t: S.appTitle, caps: true, b: S.appBody, btn: [['fill', S.open], ['text', S.cancel]] },
    { id: 'pay', n: 7, h: 'First payment', ctx: 'chat', art: 'pay',
      when: 'The first Pay or Send, before the review step. The native C# confirmation does not change.',
      t: S.payTitle, b: S.payBody, btn: [['fill', S.cont]] },
  ];

  function phone(m, theme) {
    const lg = m.per ? MO.lang[m.per[theme]] : null;
    const ph = el('div', 'ph sx'); ph.setAttribute('data-sxt', theme);
    ph.append(el('div', 'st', '<span>9:41</span><span>●●● ▮</span>'));
    const scr = el('div', 'scr', under(m, lg || MO.lang.de)); ph.append(scr);
    ph.append(el('div', 'scrim'));
    const t = lg ? lg.title : m.t, b = lg ? lg.body : m.b, btn = lg ? [['fill', lg.ok]] : m.btn;
    const sh = el('div', 'sheet' + (m.safety ? ' sheet--safe' : '') + (m.caps ? ' sheet--caps' : ''));
    sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-label', t);
    sh.innerHTML = '<i class="grab"></i><div class="panel">' + art(m.art, lg) + '</div>'
      + '<h3>' + esc(t) + '</h3>' + (m.caps ? '<div class="caps">' + MO.caps.map(([k, x, n]) => '<div class="cap"><i>' + ico(n) + '</i><span><b>' + esc(k) + '</b><small>' + esc(x) + '</small></span></div>').join('') + '</div>' : '')
      + '<p>' + esc(b) + '</p>'
      + '<div class="btns">' + btn.map(([ty, lab]) => '<button class="c-button" data-type="' + ty + '" data-size="56" data-width="full">' + esc(lab) + '</button>').join('') + '</div>';
    ph.append(sh);
    return ph;
  }

  const host = document.getElementById('moments');
  M.forEach((m) => {
    const sec = el('section', 'mo');
    sec.innerHTML = '<h2><span class="num">' + m.n + '</span>' + esc(m.h) + (m.idea ? '<em class="tag">Damir’s idea</em>' : '') + (m.safety ? '<em class="tag tag--s">safety · shows with tips off</em>' : '') + '</h2>'
      + '<p class="when"><b>When:</b> ' + esc(m.when) + (m.per ? ' Shown here in German (light) and French (dark).' : '') + '</p>';
    const row = el('div', 'pair');
    ['light', 'dark'].forEach((th) => { const w = el('div', 'pw'); w.append(phone(m, th)); w.append(el('div', 'pcap', th)); row.append(w); });
    sec.append(row); host.append(sec);
  });
  document.getElementById('replay').addEventListener('click', () => {
    document.querySelectorAll('.mo-art').forEach((s) => { const c = s.cloneNode(true); s.replaceWith(c); });
  });
})();
