/* SPIXI ILLUSTRATION KIT (v2, Damir 13:28: "the original, improved, something that sits across the apps").
   Built on the approved glossy-tile grammar of art.js / illustrations.js, with five upgrades: (1) theme-native grounds
   (a soft pink / violet / blue halo on light, the aurora on dark), (2) shadows and decoration from theme variables,
   (3) the About header as a full-bleed scene (the mark as a glossy object, tiles in depth), (4) the backup chest
   redrawn at a higher finish. (Round 2 dropped the disc cluster, Damir 13:39: it was a reference, not the brief.)
   Original header follows. */
/* What's-new spotlight ART — six scenes in the approved illustration grammar (illustrations.js: glossy tiles
   with an offset "side", a gloss sheet, a hairline highlight, a soft drop shadow, concentric rings, four-point
   sparkles). Each scene = a FULL-BLEED background layer (loops gently, paused off-screen) + a foreground layer
   (one entrance, then it holds). Panels are always dark, so colours are literal brand values, not --il-* tokens.
   Static strings only; no user data. ICONS is the Tabler map (currentColor). Render only. */
const KIT = (function () {
  'use strict';
  let seq = 0;
  const f = (n) => Math.round(n * 10) / 10;

  function defs(u) {
    const lg = (id, stops, x2 = 1, y2 = 1) => '<linearGradient id="' + id + u + '" x1="0" y1="0" x2="' + x2 + '" y2="' + y2 + '">'
      + stops.map(([o, c, a]) => '<stop offset="' + o + '" stop-color="' + c + '"' + (a != null ? ' stop-opacity="' + a + '"' : '') + '/>').join('') + '</linearGradient>';
    const rg = (id, c, a0, a1) => '<radialGradient id="' + id + u + '" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="' + c + '" stop-opacity="' + a0 + '"/><stop offset="1" stop-color="' + c + '" stop-opacity="' + a1 + '"/></radialGradient>';
    return '<defs>'
      + lg('bl', [[0, '#B4D0FF'], [.35, '#7DA6FF'], [.72, '#4E86FF'], [1, '#5A6CF2']])
      + lg('blS', [[0, '#3D63DA'], [1, '#2C44AE']])
      + lg('vi', [[0, '#D6C8FF'], [.4, '#A48DFF'], [.78, '#8466F2'], [1, '#9468F2']])
      + lg('viS', [[0, '#5C45CC'], [1, '#4632A8']])
      + lg('li', [[0, '#FFFFFF'], [.45, '#F1EAFF'], [1, '#CBB9FF']])
      + lg('liS', [[0, '#A891F0'], [1, '#7F68D8']])
      + lg('gn', [[0, '#8EF0C9'], [.5, '#3CC79A'], [1, '#2DB38B']])
      + lg('gnS', [[0, '#1F8E6C'], [1, '#17775A']])
      + lg('gl', [[0, '#fff', .3], [.3, '#fff', .05], [.45, '#fff', 0]], .3, 1)
      + lg('ph1', [[0, '#9DB6FF'], [1, '#E3E4FE']], 0, 1)
      + lg('ph2', [[0, '#A48DFF'], [1, '#F1EAFF']], 0, 1)
      + lg('ph3', [[0, '#5A6CF2'], [1, '#B4D0FF']], 0, 1)
      + lg('ph4', [[0, '#8466F2'], [1, '#CBCFFE']], 0, 1)
      + lg('w1', [[0, '#B48CFF'], [1, '#6E7BFF']]) + lg('w2', [[0, '#FF9ACB'], [1, '#9B6BFF']]) + lg('w3', [[0, '#7FD3FF'], [1, '#5A6CF2']]) + lg('w4', [[0, '#C7A6FF'], [1, '#FF8FB8']])
      + '<radialGradient id="gd' + u + '" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="#FFF3C2"/><stop offset=".5" stop-color="#FFD15C"/><stop offset="1" stop-color="#F2A93B"/></radialGradient>'
      + lg('gdS', [[0, '#D99530'], [1, '#B87418']])
      + rg('glow', '#7C6BFF', .5, 0)
      + rg('glowB', '#5A86FF', .45, 0)
      + '<radialGradient id="vc' + u + '" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="#B7D0FF"/><stop offset=".5" stop-color="#6F9BFF"/><stop offset="1" stop-color="#3A6CE0"/></radialGradient>'
      + '<filter id="sh' + u + '" x="-60%" y="-60%" width="220%" height="240%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="6"/><feOffset dy="6" result="o"/><feFlood style="flood-color:var(--k-shadow,#070A3A);flood-opacity:var(--k-shadow-a,.5)"/><feComposite in2="o" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      + '<filter id="shS' + u + '" x="-60%" y="-60%" width="220%" height="240%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="3"/><feOffset dy="3" result="o"/><feFlood style="flood-color:var(--k-shadow,#070A3A);flood-opacity:var(--k-shadow-a,.45)"/><feComposite in2="o" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      + '<path id="sp' + u + '" d="M0-6.5C.5-2.2 2.2-.5 6.5 0 2.2.5.5 2.2 0 6.5-.5 2.2-2.2.5-6.5 0-2.2-.5-.5-2.2 0-6.5Z"/>'
      + '</defs>';
  }
  /* a glossy tile: side (offset, darker) + face + gloss + hairline */
  function tile(u, x, y, w, h, r, face, o = {}) {
    const side = o.side || face + 'S', dx = o.dx != null ? o.dx : 2.5, dy = o.dy != null ? o.dy : 3.5, sh = o.sh || 'sh';
    return '<g filter="url(#' + sh + u + ')"><rect x="' + f(x + dx) + '" y="' + f(y + dy) + '" width="' + w + '" height="' + h + '" rx="' + r + '" fill="url(#' + side + u + ')"/>'
      + '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + r + '" fill="url(#' + face + u + ')"/></g>'
      + '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + r + '" fill="url(#gl' + u + ')"/>'
      + '<rect x="' + f(x + .4) + '" y="' + f(y + .4) + '" width="' + f(w - .8) + '" height="' + f(h - .8) + '" rx="' + r + '" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width=".8"/>';
  }
  /* animation wrapper: the motion class rides an inner <g>, positions ride the outer one */
  const A = (cls, style, inner) => '<g class="' + cls + '" style="' + (style || '') + '">' + inner + '</g>';
  function glyph(name, x, y, s, color, op) {
    const svg = (ICONS[name] || '').replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    return '<svg x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="currentColor" style="color:' + color + '"' + (op != null ? ' opacity="' + op + '"' : '') + '>' + svg + '</svg>';
  }
  const sparkle = (u, x, y, s, i, o) => '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' + A('il-tw', '--i:' + i + ';--o:' + (o || .8) + 's', '<use href="#sp' + u + '" style="fill:var(--k-spark,#fff)"/>') + '</g>';
  const line = (x, y, w, c, sw, op) => '<path d="M' + x + ' ' + y + 'h' + w + '" stroke="' + c + '" stroke-width="' + (sw || 4) + '" stroke-linecap="round"' + (op != null ? ' stroke-opacity="' + op + '"' : '') + '/>';
  const svgOpen = (vb, cls, par) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" class="' + cls + '" preserveAspectRatio="' + (par || 'xMidYMid meet') + '" aria-hidden="true" focusable="false">';
  /* the ground: per-scene dark hues by default; the light theme overrides --k-base-a/b with one soft ground, and a
     pink / violet / blue halo (Viber-grade softness) sits on it in both themes at --k-halo-op */
  const baseRect = (u, a, b, h) => { const H = h || 240; const hg = (id, v) => '<radialGradient id="' + id + u + '" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:var(' + v + ');stop-opacity:.9"/><stop offset=".6" style="stop-color:var(' + v + ');stop-opacity:.3"/><stop offset="1" style="stop-color:var(' + v + ');stop-opacity:0"/></radialGradient>';
    return '<linearGradient id="bg' + u + '" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" style="stop-color:var(--k-base-a,' + a + ')"/><stop offset="1" style="stop-color:var(--k-base-b,' + b + ')"/></linearGradient>'
      + hg('hA', '--k-halo1') + hg('hB', '--k-halo2') + hg('hC', '--k-halo3')
      + '<rect width="400" height="' + H + '" fill="url(#bg' + u + ')"/>'
      + '<g class="k-halo" style="opacity:var(--k-halo-op,.35)"><g class="wn-drift wn-loop" style="--dx:18px;--dy:10px;--d:15s"><circle cx="110" cy="' + f(H * .55) + '" r="' + f(H * .62) + '" fill="url(#hA' + u + ')"/></g>'
      + '<g class="wn-drift wn-loop" style="--dx:-20px;--dy:12px;--d:18s"><circle cx="300" cy="' + f(H * .4) + '" r="' + f(H * .6) + '" fill="url(#hB' + u + ')"/></g>'
      + '<g class="wn-drift wn-loop" style="--dx:10px;--dy:-14px;--d:21s"><circle cx="210" cy="' + f(H * .95) + '" r="' + f(H * .5) + '" fill="url(#hC' + u + ')"/></g></g>'; };
  const blob = (cx, cy, r, c, a, dx, dy, d) => '<g class="k-blob wn-drift wn-loop" style="--dx:' + dx + 'px;--dy:' + dy + 'px;--d:' + d + 's"><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + c + '" opacity="' + a + '"/></g>';
  function blobDefs(u, cols) {
    return cols.map((c, k) => '<radialGradient id="b' + k + u + '" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="' + c + '" stop-opacity=".75"/><stop offset=".55" stop-color="' + c + '" stop-opacity=".25"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></radialGradient>').join('');
  }
  function stars(n, w, h, seed) {
    let s = '', r = seed;
    const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
    for (let i = 0; i < n; i++) s += '<circle class="wn-tw wn-loop" style="--i:' + i + ';fill:var(--k-star,#fff)" cx="' + f(rnd() * w) + '" cy="' + f(rnd() * h) + '" r="' + f(.6 + rnd() * .9) + '"/>';
    return s;
  }

  /* ================= 1 · HERO — the whole card. A phone with the new UI; four chips orbit it,
     one per card that follows (reply · voice · album · privacy) — the hero is the table of contents ================= */
  function hero() {
    const u = '-h' + (++seq);
    const bg = svgOpen('0 0 400 640', 'wnL wnL--bg', 'xMidYMid slice') + defs(u) + '<defs>' + blobDefs(u, ['#7C58FF', '#4E6BFF', '#769DFF', '#E94EA8']) + '</defs>'
      + baseRect(u, '#1a1450', '#0b0a26', 640)
      + blob(80, 150, 230, 'url(#b0' + u + ')', 1, 46, 34, 14)
      + blob(340, 90, 210, 'url(#b1' + u + ')', 1, -54, 40, 17)
      + blob(270, 400, 260, 'url(#b2' + u + ')', .55, -36, -44, 19)
      + blob(60, 540, 220, 'url(#b3' + u + ')', .32, 34, -26, 23)
      + (() => { let w = ''; const kinds = 5;
          for (let row = 0; row < 14; row++) for (let col = 0; col < 6; col++) {
            const x = -24 + col * 76 + (row % 2) * 38, y = -10 + row * 48, g = 'url(#w' + (1 + ((row * 2 + col) % 4)) + u + ')', k = (row * 3 + col) % kinds;
            w += k === 0 ? '<rect x="' + x + '" y="' + y + '" width="58" height="26" rx="13" fill="' + g + '"/>'
              : k === 1 ? '<rect x="' + x + '" y="' + (y - 6) + '" width="44" height="38" rx="9" fill="' + g + '"/>'
              : k === 2 ? '<rect x="' + x + '" y="' + y + '" width="40" height="22" rx="11" fill="' + g + '"/><circle cx="' + (x + 29) + '" cy="' + (y + 11) + '" r="7.5" fill="#fff" fill-opacity=".45"/>'
              : k === 3 ? '<rect x="' + x + '" y="' + (y - 4) + '" width="32" height="32" rx="10" fill="' + g + '"/>'
              : '<rect x="' + x + '" y="' + y + '" width="64" height="24" rx="12" fill="' + g + '"/>';
          }
          return '<g opacity=".22" class="wn-pan wn-loop">' + w + '</g>'; })()
      + stars(26, 400, 640, 7) + '</svg>';
    const phone = (() => {
      const x = 152, y = 30, w = 96, h = 184;
      return '<ellipse cx="200" cy="214" rx="78" ry="12" fill="#05041a" opacity=".45"/>'
        + '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="20" fill="#0d0e26" stroke="#fff" stroke-opacity=".28" stroke-width="1"/>'
        + '<rect x="' + (x + 5) + '" y="' + (y + 5) + '" width="' + (w - 10) + '" height="' + (h - 10) + '" rx="15" fill="#f5f6fb"/>'
        + '<rect x="' + (x + 5) + '" y="' + (y + 5) + '" width="' + (w - 10) + '" height="26" rx="15" fill="#6C4CF2"/><rect x="' + (x + 5) + '" y="' + (y + 18) + '" width="' + (w - 10) + '" height="13" fill="#6C4CF2"/>'
        + line(x + 14, y + 20, 30, '#fff', 4, .85)
        + '<rect x="' + (x + 12) + '" y="' + (y + 40) + '" width="48" height="14" rx="7" fill="#e3e7f0"/>'
        + '<rect x="' + (x + 36) + '" y="' + (y + 60) + '" width="48" height="14" rx="7" fill="#6C4CF2"/>'
        + '<rect x="' + (x + 12) + '" y="' + (y + 80) + '" width="58" height="34" rx="9" fill="#cbcffe"/>'
        + '<rect x="' + (x + 15) + '" y="' + (y + 83) + '" width="25" height="28" rx="6" fill="url(#ph1' + u + ')"/><rect x="' + (x + 42) + '" y="' + (y + 83) + '" width="25" height="28" rx="6" fill="url(#ph2' + u + ')"/>'
        + '<rect x="' + (x + 30) + '" y="' + (y + 120) + '" width="54" height="16" rx="8" fill="#6C4CF2"/>'
        + [6, 10, 4, 12, 8, 6, 10].map((hh, k) => '<rect x="' + (x + 44 + k * 5) + '" y="' + (y + 128 - hh / 2) + '" width="2.4" height="' + hh + '" rx="1.2" fill="#fff" opacity=".85"/>').join('')
        + '<circle cx="' + (x + 37) + '" cy="' + (y + 128) + '" r="4.5" fill="#fff"/>'
        + '<rect x="' + (x + 12) + '" y="' + (y + 156) + '" width="72" height="14" rx="7" fill="#e3e7f0"/>';
    })();
    const chip = (cx, cy, inner, o, fx, fy, face) => '<g transform="translate(' + cx + ' ' + cy + ')">' + A('il-fly', '--o:' + o + 's;--fx:' + fx + 'px;--fy:' + fy + 'px', A('wn-bob wn-loop', '--d:' + (4 + o) + 's', tile(u, -24, -24, 48, 48, 15, face) + inner)) + '</g>';
    const fg = svgOpen('0 0 400 250', 'wnL wnL--fg') + defs(u)
      + '<ellipse class="k-glow" cx="200" cy="122" rx="170" ry="120" fill="url(#glow' + u + ')"/>'
      + A('il-ring wn-rings', '--to:50% 50%', [62, 100, 140].map((r) => '<circle cx="200" cy="122" r="' + r + '" fill="none" stroke="#B9B2FF" stroke-opacity=".22" stroke-width="1"/>').join(''))
      + A('il-rise', '--o:.05s', phone)
      + chip(92, 72, glyph('arrow-back-up', -12, -12, 24, '#fff'), .55, 60, 30, 'vi')
      + chip(310, 70, glyph('microphone', -12, -12, 24, '#fff'), .75, -60, 30, 'bl')
      + chip(96, 176, glyph('photo', -12, -12, 24, '#5C45CC'), .95, 60, -30, 'li')
      + chip(306, 178, glyph('eye-off', -12, -12, 24, '#fff'), 1.15, -60, -30, 'vi')
      + sparkle(u, 130, 30, 1, 0) + sparkle(u, 272, 222, .8, 1) + sparkle(u, 352, 128, .7, 2) + sparkle(u, 46, 126, .7, 3)
      + '</svg>';
    return { bg, fg };
  }

  /* ================= 2 · REACT, REPLY, EDIT — bg: outlined bubbles drifting up ================= */
  function reply() {
    const u = '-r' + (++seq);
    let bubbles = '';
    for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) {
      const w = 54 + ((row * 3 + col * 5) % 4) * 14, x = -30 + col * 96 + (row % 2) * 40, y = -20 + row * 44, right = (row + col) % 2;
      const tail = right ? 'M' + (x + w - 10) + ' ' + (y + 24) + 'l12 6l-4-10Z' : 'M' + (x + 10) + ' ' + (y + 24) + 'l-12 6l4-10Z';
      bubbles += '<g fill="url(#w' + (1 + ((row + col * 2) % 4)) + u + ')"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="28" rx="14"/><path d="' + tail + '"/></g>';
    }
    bubbles = '<g opacity=".24" class="wn-rise wn-loop" style="--d:22s">' + bubbles + '</g>';
    const bg = svgOpen('0 0 400 240', 'wnL wnL--bg', 'xMidYMid slice') + defs(u) + baseRect(u, '#231a63', '#120e3a') + '<circle class=\"k-blob\" cx="320" cy="40" r="160" fill="#7C58FF" opacity=".16"/>' + bubbles + stars(14, 400, 240, 3) + '</svg>';
    const emoji = [
      ['#FF6B8A', 'heart-filled'], ['#FFC94D', 'star'], ['#7DA6FF', 'checks'], ['#A48DFF', 'apps-filled'], ['#3CC79A', 'heart-filled'], ['#FF9F5A', 'star'],
    ].map(([c, g], k) => '<circle cx="' + (112 + k * 23) + '" cy="113" r="9.5" fill="' + c + '"/>' + glyph(g, 112 + k * 23 - 6, 107, 12, '#fff')).join('');
    const fg = svgOpen('0 0 400 240', 'wnL wnL--fg') + defs(u)
      + '<ellipse class="k-glow" cx="200" cy="124" rx="180" ry="110" fill="url(#glow' + u + ')"/>'
      + A('il-fade', '--o:.5s', '<circle cx="56" cy="70" r="15" style="fill:var(--k-chip,#fff)" fill-opacity=".14"/>' + glyph('arrow-back-up', 46, 60, 20, 'var(--k-chip-ink,#fff)'))
      + A('wn-nudge', '--o:.2s', tile(u, 84, 46, 176, 48, 18, 'li') + line(100, 63, 118, '#7F68D8', 4, .55) + line(100, 77, 74, '#7F68D8', 4, .4))
      + '<g transform="translate(0 0)">' + A('il-pop', '--o:1.5s;--to:50% 50%', '<rect x="98" y="98" width="144" height="30" rx="15" fill="#fff" filter="url(#shS' + u + ')"/>' + emoji) + '</g>'
      + A('il-rise', '--o:.75s', tile(u, 136, 140, 228, 72, 20, 'bl')
        + '<rect x="150" y="151" width="200" height="25" rx="8" fill="#fff" fill-opacity=".24"/><rect x="150" y="151" width="4" height="25" rx="2" fill="#fff"/>'
        + line(162, 163.5, 110, '#fff', 4, .75)
        + '<path class="il-draw" style="--len:150;--o:2.1s" d="M152 195h150" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/>')
      + A('il-pop', '--o:2.5s;--to:50% 50%', '<circle cx="360" cy="140" r="15" fill="url(#vi' + u + ')" filter="url(#shS' + u + ')"/>' + glyph('pencil', 351, 131, 18, '#fff'))
      + A('il-drop', '--o:2.0s;--dy:-30px', '<circle cx="250" cy="92" r="11" fill="#FF6B8A" stroke="#fff" stroke-width="2"/>' + glyph('heart-filled', 243, 85, 14, '#fff'))
      + sparkle(u, 70, 200, .8, 0, 2.6) + sparkle(u, 380, 96, .7, 1, 2.7) + sparkle(u, 280, 30, .9, 2, 1)
      + '</svg>';
    return { bg, fg };
  }

  /* ================= 3 · VOICE — bg: a full-bleed waveform breathing ================= */
  function voice() {
    const u = '-v' + (++seq);
    let bars = '';
    for (let i = 0; i < 44; i++) {
      const h = 26 + Math.round(80 * Math.abs(Math.sin(i * .55) * Math.cos(i * .21)));
      const H2 = h * 1.7;
      bars += '<rect class="wn-bar wn-loop" style="--i:' + i + '" x="' + f(4 + i * 9.2) + '" y="' + f(120 - H2 / 2) + '" width="6" height="' + f(H2) + '" rx="3" fill="url(#w' + (1 + (i % 4)) + u + ')" opacity=".3"/>';
    }
    const bg = svgOpen('0 0 400 240', 'wnL wnL--bg', 'xMidYMid slice') + defs(u) + baseRect(u, '#132063', '#0b1236') + '<circle class=\"k-blob\" cx="110" cy="120" r="150" fill="#4E86FF" opacity=".16"/>' + bars + '</svg>';
    const hs = [8, 14, 20, 12, 24, 18, 10, 22, 16, 26, 12, 18, 8, 14, 20, 10];
    const wave = (op, played) => hs.map((h, k) => played
      ? A('il-fade', '--o:' + f(1.5 + k * .09) + 's', '<rect x="' + (232 + k * 7) + '" y="' + (121 - h / 2) + '" width="3.6" height="' + h + '" rx="1.8" fill="#fff"/>')
      : '<rect x="' + (232 + k * 7) + '" y="' + (121 - h / 2) + '" width="3.6" height="' + h + '" rx="1.8" fill="#fff" opacity="' + op + '"/>').join('');
    const fg = svgOpen('0 0 400 240', 'wnL wnL--fg') + defs(u)
      + '<ellipse class="k-glow" cx="118" cy="120" rx="120" ry="100" fill="url(#glowB' + u + ')"/>'
      + [0, .8, 1.6].map((d) => '<circle class="wn-pulse" style="--o:' + f(.5 + d) + 's" cx="118" cy="120" r="34" fill="none" stroke="#BFD4FF" stroke-width="2"/>').join('')
      + A('il-pop', '--o:.1s;--to:50% 50%', '<circle cx="118" cy="120" r="36" fill="url(#vc' + u + ')" filter="url(#sh' + u + ')"/><circle cx="118" cy="120" r="35.5" fill="none" stroke="#fff" stroke-opacity=".35"/>' + glyph('microphone', 102, 104, 32, '#fff'))
      + A('il-in', '--o:.7s;--fx:-26px;--fy:0px', tile(u, 176, 92, 196, 58, 29, 'bl')
        + '<circle cx="206" cy="121" r="17" fill="#fff"/>' + glyph('player-play', 198, 113, 16, '#3050bd') + wave(.4, false) + wave(0, true)
        + A('il-pop', '--o:1.4s;--to:50% 50%', '<circle cx="232" cy="139" r="0" fill="#fff"/>'))
      + sparkle(u, 186, 60, .9, 0, 1.2) + sparkle(u, 360, 180, .7, 1, 1.8) + sparkle(u, 60, 40, .7, 2, .6)
      + '</svg>';
    return { bg, fg };
  }

  /* ================= 4 · PHOTOS — bg: a wall of photos panning; the location is struck out ================= */
  function photos() {
    const u = '-p' + (++seq);
    const photo = (x, y, w, h, r, g, op) => '<g opacity="' + (op == null ? 1 : op) + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + r + '" fill="url(#' + g + u + ')"/>'
      + '<circle cx="' + f(x + w * .74) + '" cy="' + f(y + h * .3) + '" r="' + f(h * .11) + '" fill="#fff" opacity=".85"/>'
      + '<path d="M' + x + ' ' + f(y + h * .86) + 'L' + f(x + w * .32) + ' ' + f(y + h * .48) + 'L' + f(x + w * .55) + ' ' + f(y + h * .74) + 'L' + f(x + w * .7) + ' ' + f(y + h * .58) + 'L' + (x + w) + ' ' + f(y + h * .9) + 'V' + f(y + h - r * .3) + 'Q' + (x + w) + ' ' + (y + h) + ' ' + f(x + w - r) + ' ' + (y + h) + 'H' + f(x + r) + 'Q' + x + ' ' + (y + h) + ' ' + x + ' ' + f(y + h - r) + 'Z" fill="#3E2FB5" opacity=".55"/></g>';
    let wall = '';
    for (let row = 0; row < 6; row++) for (let col = 0; col < 7; col++) {
      wall += photo(-40 + col * 84 + (row % 2) * 42, -30 + row * 64, 74, 54, 10, 'ph' + (1 + ((row + col) % 4)), .2);
    }
    const bg = svgOpen('0 0 400 240', 'wnL wnL--bg', 'xMidYMid slice') + defs(u) + baseRect(u, '#24196b', '#120d3c') + '<g class="wn-pan wn-loop">' + wall + '</g>'
      + '<rect class="k-glow" width="400" height="240" fill="url(#glow' + u + ')" opacity=".6"/></svg>';
    const grid = [[112, 52, 'ph1'], [188, 52, 'ph2'], [112, 120, 'ph3'], [188, 120, 'ph4']]
      .map(([x, y, g], k) => A('il-pop', '--o:' + f(.35 + k * .12) + 's;--to:50% 50%', photo(x, y, 70, 62, 10, g)
        + (k === 3 ? '<rect x="' + x + '" y="' + y + '" width="70" height="62" rx="10" fill="#2C1F8A" opacity=".55"/>' + glyph('photo', x + 23, y + 19, 24, '#fff') : ''))).join('');
    const pin = '<path d="M0 -26C-14 -26 -24 -15 -24 -2C-24 15 0 30 0 30C0 30 24 15 24 -2C24 -15 14 -26 0 -26Z" fill="url(#vi' + u + ')" filter="url(#sh' + u + ')"/><circle cx="0" cy="-3" r="8.5" fill="#fff"/>';
    const fg = svgOpen('0 0 400 240', 'wnL wnL--fg') + defs(u)
      + '<ellipse class="k-glow" cx="190" cy="124" rx="170" ry="110" fill="url(#glow' + u + ')"/>'
      + '<g transform="rotate(-4 186 124)">' + A('il-rise', '--o:.05s', tile(u, 98, 38, 176, 172, 22, 'li') + grid + line(114, 194, 56, '#7F68D8', 4, .45)) + '</g>'
      + '<g transform="translate(316 92)">' + A('il-drop', '--o:1.15s;--dy:-40px', A('wn-dim', '--o:2.5s', pin)) + '</g>'
      + '<path class="il-draw" style="--len:80;--o:2.05s" d="M290 62L342 124" stroke="#FF6B8A" stroke-width="5" stroke-linecap="round"/>'
      + '<path class="il-draw" style="--len:80;--o:2.05s" d="M290 62L342 124" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-opacity=".6"/>'
      + sparkle(u, 92, 30, .9, 0, 1) + sparkle(u, 296, 196, .8, 1, 2.6) + sparkle(u, 372, 50, .7, 2, 2.7)
      + '</svg>';
    return { bg, fg };
  }

  /* ================= 5 · PRIVACY — bg: a node grid with a slow ripple; three switches go off ================= */
  function privacy() {
    const u = '-y' + (++seq);
    let dots = '';
    for (let row = 0; row < 8; row++) for (let col = 0; col < 7; col++) {
      const x = -10 + col * 64 + (row % 2) * 32, y = 4 + row * 32, on = (row * 3 + col) % 3 !== 0;
      dots += '<rect x="' + x + '" y="' + y + '" width="44" height="22" rx="11" fill="url(#w' + (1 + ((row + col) % 4)) + u + ')" opacity="' + (on ? .32 : .16) + '"/>'
        + '<circle cx="' + (x + (on ? 33 : 11)) + '" cy="' + (y + 11) + '" r="8" fill="#fff" opacity="' + (on ? .4 : .22) + '"/>';
    }
    dots = '<g class="wn-pan wn-loop">' + dots + '</g>';
    const bg = svgOpen('0 0 400 240', 'wnL wnL--bg', 'xMidYMid slice') + defs(u) + baseRect(u, '#10215e', '#0a1235') + dots
      + [0, 2, 4].map((d) => '<circle class="wn-ripple wn-loop" style="--o:-' + d + 's" cx="200" cy="120" r="40" fill="none" stroke="#769DFF" stroke-width="1.5"/>').join('') + '</svg>';
    const rows = [['checks', .8], ['dots', 1.3], ['user-circle', 1.8]].map(([g, d], k) => {
      const cy = 78 + k * 46;
      return '<circle cx="122" cy="' + cy + '" r="14" fill="#EDE7FF"/>' + glyph(g, 112, cy - 10, 20, '#5C45CC')
        + line(146, cy - 5, 70, '#7F68D8', 4, .5) + line(146, cy + 6, 44, '#7F68D8', 3.4, .3)
        + '<rect x="240" y="' + (cy - 11) + '" width="46" height="22" rx="11" fill="#C9C2EA"/>'
        + A('wn-off', '--o:' + d + 's', '<rect x="240" y="' + (cy - 11) + '" width="46" height="22" rx="11" fill="#3050bd"/>')
        + A('wn-knob', '--o:' + d + 's', '<circle cx="275" cy="' + cy + '" r="8.5" fill="#fff" filter="url(#shS' + u + ')"/>');
    }).join('');
    const fg = svgOpen('0 0 400 240', 'wnL wnL--fg') + defs(u)
      + '<ellipse class="k-glow" cx="200" cy="124" rx="170" ry="110" fill="url(#glowB' + u + ')"/>'
      + A('il-rise', '--o:.05s', tile(u, 94, 44, 216, 160, 22, 'li') + rows)
      + '<g transform="translate(312 48)">' + A('il-pop', '--o:2.35s;--to:50% 50%', '<circle r="24" fill="url(#vc' + u + ')" filter="url(#sh' + u + ')"/><circle r="23.5" fill="none" stroke="#fff" stroke-opacity=".35"/>' + glyph('eye-off', -13, -13, 26, '#fff')) + '</g>'
      + sparkle(u, 70, 50, .8, 0, 2.6) + sparkle(u, 352, 190, .8, 1, 2.7) + sparkle(u, 58, 196, .6, 2, 1)
      + '</svg>';
    return { bg, fg };
  }

  /* ================= 6 · MINI APPS — bg: a slow orbit of app tiles; an invite is accepted, apps fly out ================= */
  function apps() {
    const u = '-a' + (++seq);
    const ring = (r, n, sz, op, ph) => { let s2 = ''; for (let k = 0; k < n; k++) { const an = (k / n) * Math.PI * 2 + ph; s2 += '<rect x="' + f(200 + Math.cos(an) * r - sz / 2) + '" y="' + f(120 + Math.sin(an) * r - sz / 2) + '" width="' + sz + '" height="' + sz + '" rx="' + f(sz * .3) + '" fill="url(#w' + (1 + (k % 4)) + u + ')" opacity="' + op + '"/>'; } return s2; };
    const bg = svgOpen('0 0 400 240', 'wnL wnL--bg', 'xMidYMid slice') + defs(u) + baseRect(u, '#2a1670', '#130b3c')
      + '<circle cx="200" cy="120" r="170" fill="none" style="stroke:var(--k-deco,#A48DFF)" stroke-opacity=".14"/><circle cx="200" cy="120" r="110" fill="none" style="stroke:var(--k-deco,#A48DFF)" stroke-opacity=".12" stroke-dasharray="3 6"/>'
      + '<g class="wn-orbit wn-loop">' + ring(170, 14, 30, .34, 0) + '</g><g class="wn-orbit wn-orbit--rev wn-loop">' + ring(118, 10, 22, .3, .4) + '</g><g class="wn-orbit wn-loop">' + ring(232, 18, 36, .26, .2) + '</g>' + stars(12, 400, 240, 11) + '</svg>';
    const out = [['rocket', 'bl', 300, 48, 2.0], ['code', 'vi', 330, 110, 2.15], ['star', 'li', 300, 172, 2.3]]
      .map(([g, face, x, y, o]) => '<g transform="translate(' + x + ' ' + y + ')">' + A('il-fly', '--o:' + o + 's;--fx:-110px;--fy:' + (110 - y) * .6 + 'px', A('wn-bob wn-loop', '--d:' + (4 + o) + 's', tile(u, -19, -19, 38, 38, 12, face) + glyph(g, -10, -10, 20, face === 'li' ? '#5C45CC' : '#fff'))) + '</g>').join('');
    const fg = svgOpen('0 0 400 240', 'wnL wnL--fg') + defs(u)
      + '<ellipse class="k-glow" cx="180" cy="124" rx="170" ry="110" fill="url(#glow' + u + ')"/>'
      + A('il-rise', '--o:.05s', tile(u, 56, 52, 214, 130, 24, 'li')
        + tile(u, 74, 70, 56, 56, 16, 'vi', { sh: 'shS', dx: 2, dy: 2.6 }) + glyph('apps-filled', 88, 84, 28, '#fff')
        + line(144, 86, 104, '#7F68D8', 4.4, .55) + line(144, 102, 70, '#7F68D8', 3.6, .35)
        + '<rect x="74" y="142" width="86" height="26" rx="13" fill="none" stroke="#9C8CE0" stroke-width="1.4"/>' + line(102, 155, 30, '#9C8CE0', 3, .8))
      + A('il-pop', '--o:1.35s;--to:50% 50%', tile(u, 168, 142, 86, 26, 13, 'gn', { sh: 'shS', dx: 1.6, dy: 2.4 }) + glyph('checks', 200, 146, 18, '#fff'))
      + '<circle class="wn-tap" style="--o:1.75s" cx="211" cy="155" r="20" fill="#fff"/>'
      + out
      + sparkle(u, 40, 40, .8, 0, 1) + sparkle(u, 260, 214, .8, 1, 2.5) + sparkle(u, 372, 214, .6, 2, 2.6)
      + '</svg>';
    return { bg, fg };
  }



  /* ================= ABOUT HEADER — today's About band, full bleed (Damir 13:50: "what we have today is good, I just
     wanted a high-quality background, like Viber's full bleed; don't touch the logo") =================
     The content is TODAY'S band (settings-app.js aboutHeroArt { tile: false }): the dotted orbit, the heart, the chat
     bubble with three dots, the gold star, the sparkles — same shapes, same --ab-* colours. The app icon stays the
     real launcher tile with the registry's own `logo` (an HTML element in the page, not part of this art). What is
     new is the ground: the launcher-blue band becomes a full-bleed header under the status bar and the top bar, in
     layers — the --ab-band pair, a deep third stop, three soft light fields that drift (15–21 s), a top-right sheen,
     and quiet rings that open around the icon. 400 × 240, the icon centre on the lower edge (200, 240). */
  function aboutGround(u, rings) {
    const H = 240;
    const rad = (id, c, a) => '<radialGradient id="' + id + u + '" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:' + c + ';stop-opacity:' + a + '"/><stop offset=".55" style="stop-color:' + c + ';stop-opacity:' + (a * .35).toFixed(3) + '"/><stop offset="1" style="stop-color:' + c + ';stop-opacity:0"/></radialGradient>';
    const field = (cx, cy, r, v, dx, dy, d) => '<g class="wn-drift wn-loop" style="--dx:' + dx + 'px;--dy:' + dy + 'px;--d:' + d + 's"><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#' + v + u + ')"/></g>';
    const bg = svgOpen('0 0 400 ' + H, 'wnL wnL--bg', 'xMidYMax slice') + '<defs>'
      + '<linearGradient id="g' + u + '" x1="0" y1="0" x2=".55" y2="1"><stop offset="0" style="stop-color:var(--ab-band-from,#9ccbff)"/><stop offset=".62" style="stop-color:var(--ab-band-to,#4f97f0)"/><stop offset="1" style="stop-color:var(--ab-band-deep,#2f7be3)"/></linearGradient>'
      + rad('fA', 'var(--ab-field-a,#d4f0ff)', .9) + rad('fB', 'var(--ab-field-b,#8fa6ff)', .55) + rad('fC', 'var(--ab-field-c,#3d8bff)', .7) + rad('sh', '#fff', .55)
      + '<linearGradient id="scr' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--ab-scrim,rgba(8,30,90,.28))"/><stop offset="1" style="stop-color:var(--ab-scrim,rgba(8,30,90,.28));stop-opacity:0"/></linearGradient>'
      + '</defs>'
      + '<rect width="400" height="' + H + '" fill="url(#g' + u + ')"/>'
      + field(312, 176, 120, 'fA', -18, 10, 17) + field(56, 196, 150, 'fB', 22, -10, 21) + field(200, 250, 110, 'fC', 14, -12, 15)
      + '<ellipse cx="350" cy="-10" rx="190" ry="120" fill="url(#sh' + u + ')" style="opacity:var(--ab-sheen-op,1)"/>'
      + '<rect width="400" height="96" fill="url(#scr' + u + ')"/>'
      + (rings ? '<g fill="none" style="stroke:#fff">' + [[64, .2], [104, .14], [148, .1], [196, .07], [248, .05]].map(([r, o]) => '<circle cx="200" cy="' + H + '" r="' + r + '" stroke-opacity="' + o + '" stroke-width="1.2"/>').join('') + '</g>' : '')
      + '</svg>';
    return bg;
  }
  function aboutToday() {
    const u = '-ab' + (++seq);
    const H = 240;
    const bg = aboutGround(u, true);
    const HEART = 'M0 8.5C-6.5-1.8-19-.2-19 10.2-19 18-6 25.5 0 29.5 6 25.5 19 18 19 10.2 19-.2 6.5-1.8 0 8.5Z';
    const STAR = 'M0-13.5 4-4.8 13.4-4.1 6.3 2.2 8.5 11.6 0 6.6-8.5 11.6-6.3 2.2-13.4-4.1-4-4.8Z';
    const spk = (x, y, r) => '<path d="M' + x + ' ' + (y - r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x - r) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y - r) + 'Z"/>';
    const field = (cx, cy, r, v, dx, dy, d) => '<g class="wn-drift wn-loop" style="--dx:' + dx + 'px;--dy:' + dy + 'px;--d:' + d + 's"><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#' + v + u + ')"/></g>';
    const rad = (id, c, a) => '<radialGradient id="' + id + u + '" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:' + c + ';stop-opacity:' + a + '"/><stop offset=".55" style="stop-color:' + c + ';stop-opacity:' + (a * .35).toFixed(3) + '"/><stop offset="1" style="stop-color:' + c + ';stop-opacity:0"/></radialGradient>';
    const fg = svgOpen('0 0 400 ' + H, 'wnL wnL--fg', 'xMidYMax meet') + '<defs>'
      + '<linearGradient id="b' + u + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--ab-bubble-a,#fff)"/><stop offset="1" style="stop-color:var(--ab-bubble-b,#e2edfc)"/></linearGradient>'
      + '<radialGradient id="hr' + u + '" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#FFB3C8"/><stop offset=".45" stop-color="#FF6F96"/><stop offset="1" stop-color="#E23A6A"/></radialGradient>'
      + '<radialGradient id="st' + u + '" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="#FFF1B8"/><stop offset=".5" stop-color="#FFD15C"/><stop offset="1" stop-color="#F2A93B"/></radialGradient>'
      + '</defs>'
      /* today's band art, the same table, scaled 1.3 round the icon so it fills the taller header */
      + '<g transform="translate(200 ' + H + ') scale(1.3) translate(-150 -146)">'
      + A('il-fade', '--o:.15s', '<ellipse cx="150" cy="84" rx="118" ry="34" fill="none" style="stroke:var(--ab-band-ink,rgba(255,255,255,.7))" stroke-width="1.4" stroke-linecap="round" stroke-dasharray="0.1 6"/>')
      + '<g transform="translate(58 50.5) scale(.84)">' + A('il-in', '--o:.3s;--fx:-10px;--fy:6px', A('wn-bob wn-loop', '--d:6s',
          '<path d="' + HEART + '" transform="translate(0 2.6)" fill="#0d2f6b" fill-opacity=".26"/><path d="' + HEART + '" fill="url(#hr' + u + ')"/><path d="M-12.5 5.2c2.6-1.6 5.6-.7 6.9 1" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.4" stroke-linecap="round"/>')) + '</g>'
      + A('il-in', '--o:.42s;--fx:10px;--fy:6px', A('wn-bob wn-loop', '--d:7s',
          '<path d="M214 39a9 9 0 0 1 9 -9h24a9 9 0 0 1 9 9v8a9 9 0 0 1 -9 9h-18l-7 6v-6.6a9 9 0 0 1 -8 -8.4z" transform="translate(0 2.4)" fill="#0d2f6b" fill-opacity=".2"/>'
          + '<path d="M214 39a9 9 0 0 1 9 -9h24a9 9 0 0 1 9 9v8a9 9 0 0 1 -9 9h-18l-7 6v-6.6a9 9 0 0 1 -8 -8.4z" fill="url(#b' + u + ')"/>'
          + '<g style="fill:var(--ab-bubble-dot,#0076e1)">' + [226, 235, 244].map((x) => '<circle cx="' + x + '" cy="43" r="2.4"/>').join('') + '</g>'))
      + '<g transform="translate(244 104)">' + A('il-in', '--o:.54s;--fx:8px;--fy:8px', A('wn-bob wn-loop', '--d:6.5s',
          '<path d="' + STAR + '" transform="translate(0 2.4)" fill="#0d2f6b" stroke="#0d2f6b" fill-opacity=".26" stroke-opacity=".26" stroke-width="3.2" stroke-linejoin="round"/>'
          + '<path d="' + STAR + '" fill="url(#st' + u + ')" stroke="url(#st' + u + ')" stroke-width="3.2" stroke-linejoin="round"/><ellipse cx="-3.2" cy="-4.2" rx="2.6" ry="1.4" fill="#fff" opacity=".65" transform="rotate(-35 -3.2 -4.2)"/>')) + '</g>'
      + '<g style="fill:var(--ab-band-ink,rgba(255,255,255,.7))">' + A('il-fade', '--o:.6s', spk(92, 22, 5) + spk(222, 14, 3.5) + spk(96, 106, 4.5) + spk(270, 74, 4)
          + '<circle cx="34" cy="96" r="1.6"/><circle cx="268" cy="40" r="1.4"/><circle cx="196" cy="121" r="1.5"/>') + '</g>'
      + '</g></svg>';
    return { bg, fg };
  }

  /* ---- the About header: four new art directions (Damir 14:04: "the heart, star, message are sub-par"). All four keep
     the same ground and the same app icon on the lower edge (200, 240); only the layer between them changes. ---- */
  const AB_C = 200, AB_Y = 240;
  const polar = (r, deg) => [AB_C + r * Math.cos(deg * Math.PI / 180), AB_Y + r * Math.sin(deg * Math.PI / 180)];
  const nodeDefs = (u) => '<radialGradient id="nd' + u + '" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#d4e8ff"/><stop offset="1" stop-color="#5d9cff"/></radialGradient>'
    + '<filter id="ns' + u + '" x="-80%" y="-80%" width="260%" height="260%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="2"/><feOffset dy="2" result="o"/><feFlood flood-color="#06205a" flood-opacity=".35"/><feComposite in2="o" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
    + '<radialGradient id="ng' + u + '" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>';
  const sphere = (u, x, y, r, glow) => (glow ? '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r * 3.2) + '" fill="url(#ng' + u + ')"/>' : '')
    + '<g filter="url(#ns' + u + ')"><circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + r + '" fill="url(#nd' + u + ')"/></g>'
    + '<ellipse cx="' + f(x - r * .32) + '" cy="' + f(y - r * .38) + '" rx="' + f(r * .38) + '" ry="' + f(r * .2) + '" fill="#fff" opacity=".85" transform="rotate(-30 ' + f(x - r * .32) + ' ' + f(y - r * .38) + ')"/>';

  /* RINGS — the five rings of the header grown into the art: signal rings round the icon, a light arc travelling on
     each, peers sitting on them as small glossy spheres; the rings sway a few degrees, slowly (≤ 0.02 Hz) */
  function aboutRings() {
    const u = '-ar' + (++seq);
    const R = [[68, .36, 14, 26], [104, .28, -10, 34], [142, .2, 8, 40], [184, .14, -7, 46], [230, .09, 6, 52]];
    const NODES = { 68: [[-58, 4.6, 0]], 104: [[-152, 6.4, 1], [-30, 3.4, 0]], 142: [[-40, 7.6, 1], [-128, 3.6, 0]], 184: [[-136, 5.4, 1], [-66, 3, 0], [-16, 4, 0]], 230: [[-150, 4.4, 0], [-34, 5.6, 1]] };
    const fg = svgOpen('0 0 400 ' + AB_Y, 'wnL wnL--fg', 'xMidYMax slice') + '<defs>' + nodeDefs(u)
      + '<linearGradient id="rs' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".55" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>'
      + '<mask id="rm' + u + '"><rect width="400" height="' + AB_Y + '" fill="url(#rs' + u + ')"/></mask></defs>'
      + '<g mask="url(#rm' + u + ')">'
      + R.map(([r, o, a, d], k) => {
          const ring = '<circle cx="' + AB_C + '" cy="' + AB_Y + '" r="' + r + '" fill="none" stroke="#fff" stroke-opacity="' + o + '" stroke-width="1.3"/>';
          const arc = '<circle cx="' + AB_C + '" cy="' + AB_Y + '" r="' + r + '" fill="none" stroke="#fff" stroke-opacity="' + Math.min(.9, o * 2.6).toFixed(2) + '" stroke-width="2" stroke-linecap="round" pathLength="100" stroke-dasharray="7 93" transform="rotate(' + (200 + k * 23) + ' ' + AB_C + ' ' + AB_Y + ')"/>';
          const peers = (NODES[r] || []).map(([deg, nr, gl]) => { const p = polar(r, deg); return sphere(u, p[0], p[1], nr, gl); }).join('');
          return A('il-ring', '--o:' + (.1 + k * .08) + 's', A('ab-sway wn-loop', '--a:' + a + 'deg;--d:' + d + 's', ring + arc + peers));
        }).join('')
      + '</g></svg>';
    return { bg: aboutGround(u, false), fg };
  }

  /* MESH — the Ixian network: peers and the links between them across the whole header, fading out under the bar; a
     few hubs glow, and now and then a light runs along a link down to the icon (one pulse per link, 7–11 s) */
  function aboutMesh() {
    const u = '-am' + (++seq);
    let r0 = 11; const rnd = () => { r0 = (r0 * 9301 + 49297) % 233280; return r0 / 233280; };
    const P = [];
    for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) {
      const x = 14 + col * 53 + (row % 2) * 24 + (rnd() - .5) * 30, y = 34 + row * 50 + (rnd() - .5) * 26;
      if (Math.hypot(x - AB_C, y - AB_Y) < 70 || x < -4 || x > 404) continue;
      P.push([x, y]);
    }
    const E = new Set(); const L = [];
    P.forEach((p, i) => { P.map((q, j) => [j, Math.hypot(p[0] - q[0], p[1] - q[1])]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 2)
      .forEach(([j, d]) => { const k = i < j ? i + '-' + j : j + '-' + i; if (!E.has(k) && d < 110) { E.add(k); L.push([P[i], P[j]]); } }); });
    const near = P.map((p, i) => [i, Math.hypot(p[0] - AB_C, p[1] - AB_Y)]).sort((a, b) => a[1] - b[1]).slice(0, 5).map(([i]) => P[i]);
    const hubs = [3, 9, 14, 20, 26].filter((i) => P[i]).map((i) => P[i]);
    const fg = svgOpen('0 0 400 ' + AB_Y, 'wnL wnL--fg', 'xMidYMax slice') + '<defs>' + nodeDefs(u)
      + '<linearGradient id="ms' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".15"/><stop offset=".45" stop-color="#fff" stop-opacity="1"/></linearGradient>'
      + '<mask id="mm' + u + '"><rect width="400" height="' + AB_Y + '" fill="url(#ms' + u + ')"/></mask></defs>'
      + '<g mask="url(#mm' + u + ')">' + A('il-fade', '--o:.1s',
          '<g stroke="#fff" stroke-opacity=".22" stroke-width="1">' + L.map(([p, q]) => '<path d="M' + f(p[0]) + ' ' + f(p[1]) + 'L' + f(q[0]) + ' ' + f(q[1]) + '"/>').join('') + '</g>'
          + '<g stroke="#fff" stroke-opacity=".3" stroke-width="1.2">' + near.map((p) => '<path d="M' + f(p[0]) + ' ' + f(p[1]) + 'L' + AB_C + ' ' + AB_Y + '"/>').join('') + '</g>'
          + '<g fill="#fff">' + P.map((p) => '<circle cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="' + f(1.4 + rnd() * 1.3) + '" opacity=".75"/>').join('') + '</g>')
      + near.slice(0, 3).map((p, k) => '<path d="M' + f(p[0]) + ' ' + f(p[1]) + 'L' + AB_C + ' ' + AB_Y + '" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" pathLength="100" class="ab-pulse wn-loop" style="--d:' + (7 + k * 2) + 's;--o:' + (1.2 + k * 2.1) + 's"/>').join('')
      + hubs.map((p, k) => A('il-pop', '--o:' + (.3 + k * .1) + 's;--to:50% 50%', sphere(u, p[0], p[1], 4 + (k % 3) * 1.4, true))).join('')
      + '</g></svg>';
    return { bg: aboutGround(u, false), fg };
  }

  /* WAVES — silk: four translucent ribbons cross the header from low left to high right and settle behind the icon;
     each one drifts sideways on its own slow beat (16–24 s). No objects at all. */
  function aboutWaves() {
    const u = '-aw' + (++seq);
    const band = (y0, amp, wl, ph, th, thA) => {
      const top = [], bot = [];
      for (let x = -80; x <= 480; x += 10) {
        const t = (x + 80) / 560, rise = -46 * t;
        const yA = y0 + rise + amp * Math.sin((x / wl) * 2 * Math.PI + ph);
        const tk = th + thA * Math.sin((x / (wl * .7)) * 2 * Math.PI + ph * 1.7);
        top.push([x, yA]); bot.push([x, yA + tk]);
      }
      return { d: 'M' + top.map((p) => f(p[0]) + ' ' + f(p[1])).join('L') + 'L' + bot.reverse().map((p) => f(p[0]) + ' ' + f(p[1])).join('L') + 'Z',
        crest: 'M' + top.map((p) => f(p[0]) + ' ' + f(p[1])).join('L') };
    };
    const B = [[150, 18, 360, .4, 16, 10, 'wa', .9, 22, 18], [178, 22, 420, 1.6, 26, 12, 'wb', .75, -26, 22], [126, 14, 300, 2.6, 10, 7, 'wc', .85, 18, 16], [206, 16, 380, 3.4, 30, 14, 'wa', .6, -20, 24]];
    const fg = svgOpen('0 0 400 ' + AB_Y, 'wnL wnL--fg', 'xMidYMax slice') + '<defs>'
      + '<linearGradient id="wa' + u + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".34"/><stop offset="1" stop-color="#fff" stop-opacity=".06"/></linearGradient>'
      + '<linearGradient id="wb' + u + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#bfe6ff" stop-opacity=".05"/><stop offset=".6" stop-color="#bfe6ff" stop-opacity=".3"/><stop offset="1" stop-color="#bfe6ff" stop-opacity="0"/></linearGradient>'
      + '<linearGradient id="wc' + u + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9d2ff" stop-opacity=".2"/><stop offset=".5" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity=".3"/></linearGradient>'
      + '</defs>'
      + B.map(([y0, amp, wl, ph, th, thA, g, op, dx, d], k) => { const w = band(y0, amp, wl, ph, th, thA); return A('il-in', '--o:' + (.1 + k * .1) + 's;--fx:' + (k % 2 ? 20 : -20) + 'px;--fy:0px', A('wn-drift wn-loop', '--dx:' + dx + 'px;--dy:0px;--d:' + d + 's',
          '<path d="' + w.d + '" fill="url(#' + g + u + ')" opacity="' + op + '"/><path d="' + w.crest + '" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="1"/>')); }).join('')
      + '</svg>';
    return { bg: aboutGround(u, false), fg };
  }

  /* GLASS — depth with meaning (Damir 14:15: "not an empty glass container"): three frosted glass objects, each with a
     coloured core of light refracted inside it and its symbol etched in white — a chat bubble (violet, messaging),
     a coin (gold, payments), an app tile (pink-violet, mini apps). (14:38: no padlock; the bubble is the welcome carousel's full pill.) Each one throws its colour
     on the ground under it as a soft caustic. Behind them, coloured bokeh out of focus. A slow float, one per object. */
  function aboutGlass() {
    const u = '-ag' + (++seq);
    const tints = { vi: ['#c9a6ff', '#7b4dff'], au: ['#ffe08a', '#f2a93b'], cy: ['#9be8ff', '#2fa6ff'], pk: ['#ffb3dc', '#b45cff'] };
    const tdefs = Object.keys(tints).map((k) => '<radialGradient id="t' + k + u + '" cx=".66" cy=".7" r=".8"><stop offset="0" stop-color="' + tints[k][1] + '"/><stop offset=".6" stop-color="' + tints[k][0] + '" stop-opacity=".85"/><stop offset="1" stop-color="' + tints[k][0] + '" stop-opacity=".35"/></radialGradient>'
      + '<radialGradient id="c' + k + u + '" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="' + tints[k][1] + '" stop-opacity=".55"/><stop offset="1" stop-color="' + tints[k][1] + '" stop-opacity="0"/></radialGradient>').join('');
    /* one glass object: caustic on the ground · coloured core · frost · rim · specular streak · etched symbol */
    const glass = (shape, tint, symbol, w, h) => '<ellipse cx="' + f(w * .06) + '" cy="' + f(h * .5 + 7) + '" rx="' + f(w * .5) + '" ry="' + f(h * .16 + 3) + '" fill="url(#c' + tint + u + ')" filter="url(#gb' + u + ')"/>'
      + '<g filter="url(#gsh' + u + ')">' + shape.replace('/>', ' fill="url(#t' + tint + u + ')"/>') + '</g>'
      + shape.replace('/>', ' fill="url(#gf' + u + ')"/>')
      + shape.replace('/>', ' fill="none" stroke="url(#gr' + u + ')" stroke-width="1.2"/>')
      + symbol;
    const far = (x, y, r, c, o) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + c + '" fill-opacity="' + o + '" filter="url(#gbF' + u + ')"/>';
    const at = (x, y, rot, inner, o, d, dy) => '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ')">' + A('il-in', '--o:' + o + 's;--fx:0px;--fy:14px', A('wn-drift wn-loop', '--dx:0px;--dy:' + dy + 'px;--d:' + d + 's', inner)) + '</g>';
    const BUB = 'M-22 -20H22A18 18 0 0 1 22 16H-14L-24 24L-22 15.2A18 18 0 0 1 -22 -20Z';
    const bubble = glass('<path d="' + BUB + '"/>', 'vi', [-14, 0, 14].map((x) => '<circle cx="' + x + '" cy="-2" r="4" fill="#fff" fill-opacity=".95"/>').join(''), 80, 46);
    const coin = glass('<circle r="25"/>', 'au', '<circle r="18" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.2"/><use href="#spG' + u + '" transform="scale(1.5)" fill="#fff"/>', 50, 50);
    const appTile = glass('<rect x="-16" y="-16" width="32" height="32" rx="10"/>', 'pk', glyph('apps-filled', -9, -9, 18, '#fff', .95), 32, 32);
    const fg = svgOpen('0 0 400 ' + AB_Y, 'wnL wnL--fg', 'xMidYMax slice') + '<defs>' + tdefs
      + '<linearGradient id="gf' + u + '" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".4" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
      + '<linearGradient id="gr' + u + '" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".5" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity=".4"/></linearGradient>'
      + '<filter id="gb' + u + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>'
      + '<filter id="gbF' + u + '" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="9"/></filter>'
      + '<filter id="gsh' + u + '" x="-60%" y="-60%" width="220%" height="240%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="5"/><feOffset dy="5" result="o"/><feFlood flood-color="#06134a" flood-opacity=".22"/><feComposite in2="o" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      + '<path id="spG' + u + '" d="M0-6.5C.5-2.2 2.2-.5 6.5 0 2.2.5.5 2.2 0 6.5-.5 2.2-2.2.5-6.5 0-2.2-.5-.5-2.2 0-6.5Z"/>'
      + '</defs>'
      /* far plane: coloured bokeh, out of focus */
      + A('il-fade', '--o:.05s', far(54, 96, 42, '#b98bff', .45) + far(362, 70, 36, '#7fe0ff', .4) + far(248, 120, 16, '#ff9fd2', .45) + far(150, 60, 12, '#ffe08a', .4))
      /* the three objects */
      /* one even arc round the icon (r ≈ 135 from its centre): the big pieces low and outside, the small ones high
         and inside — depth by size, nothing under the bar, nothing crowding the icon */
      + at(94, 162, -6, '<g transform="scale(1.1)">' + bubble + '</g>', .25, 14, -5)
      + at(236, 106, -10, appTile, .4, 13, 4)
      + at(314, 160, 0, coin, .5, 16, 5)
      + '</svg>';
    return { bg: aboutGround(u, false), fg };
  }

  /* ================= BACKUP — today's chest, made calm and clean (Damir 13:46: "a calm chest, not a treasure chest";
     the quality is in polished corners and a quiet motion, not in ornaments) =================
     Same shape, same place, same three things inside (identity, wallet, chats). What changes: every corner is
     rounded and the box has real thickness; one soft light from the top left (rim light on the top edges, a polished
     vertical edge where the front meets the side, soft occlusion at the base); the lid has an inner face and a rim;
     the lock is today's gold plate with a bevel. No straps, no rivets, no rays. Motion: the box settles in, the lid
     eases open (no overshoot), the three items rise one by one, then everything holds; a slow float (≤ .2 Hz). */
  function chest() {
    const u = '-ch' + (++seq);
    const g = (id, stops, x1, y1, x2, y2) => '<linearGradient id="' + id + u + '" x1="' + (x1 || 0) + '" y1="' + (y1 || 0) + '" x2="' + (x2 == null ? 0 : x2) + '" y2="' + (y2 == null ? 1 : y2) + '">' + stops.map(([o, c, a]) => '<stop offset="' + o + '" stop-color="' + c + '"' + (a != null ? ' stop-opacity="' + a + '"' : '') + '/>').join('') + '</linearGradient>';
    /* ONE body silhouette (front + side, one outline, rounded outer corners only); the front and the side are the
       same shape split on the shared vertical edge x = 163 by two clips, so the faces meet edge to edge */
    const BODY = 'M59 140.5Q59 137 62.5 137H163L185.4 123.9Q191 120.6 191 127V180.6Q191 185.6 186.8 188.2L168.4 199.6Q162.6 203 156 203H70Q59 203 59 192Z';
    const RIM = 'M62.5 137H163L185.4 123.9Q188.6 121.9 185 121H92Q88.6 121 85.8 122.6L61.4 134.6Q58.8 136.6 62.5 137Z';
    const LID_OUT = 'M88 121H188Q192 121 192.8 117L199.6 80Q200.8 73 194 73H104Q97.6 73 96.4 79.4L86 117Q85.2 121 88 121Z';
    const LID_IN = 'M93 117.4H184.6Q187.2 117.4 187.8 114.8L193.4 83Q194 79 190.2 79H107Q103.4 79 102.6 82.6L91.4 114.6Q90.6 117.4 93 117.4Z';
    const defsC = '<defs>'
      + g('fr', [[0, '#93A0FF'], [.55, '#7277F8'], [1, '#5C4EE2']], 0, 0, .25, 1)
      + g('sd', [[0, '#8E78F4'], [1, '#5E46D2']], 0, 0, .6, 1)
      + g('lo', [[0, '#8C78F2'], [1, '#6A55DC']], 0, 0, .2, 1)
      + g('lin', [[0, '#D9D2FF'], [1, '#B4A8FA']], 0, 0, .1, 1)
      + g('in', [[0, '#3A2C9E'], [1, '#5A4AD0']], 0, 1, 0, 0)
      + g('ao', [[0, '#2A1E8A', 0], [1, '#2A1E8A', .26]])
      + g('edge', [[0, '#fff', .75], [.5, '#fff', .25], [1, '#fff', 0]])
      + g('lk', [[0, '#FFE9A6'], [.5, '#FFD15C'], [1, '#EFA53A']], 0, 0, .35, 1)
      + '<radialGradient id="wm' + u + '" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#E9E4FF" stop-opacity=".75"/><stop offset="1" stop-color="#E9E4FF" stop-opacity="0"/></radialGradient>'
      + '<radialGradient id="glw' + u + '" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:var(--il-glow,#9aa8ff);stop-opacity:.4"/><stop offset=".6" style="stop-color:var(--il-glow,#9aa8ff);stop-opacity:.1"/><stop offset="1" style="stop-color:var(--il-glow,#9aa8ff);stop-opacity:0"/></radialGradient>'
      + '<clipPath id="fc' + u + '"><rect x="0" y="0" width="163" height="240"/></clipPath>'
      + '<clipPath id="sc' + u + '"><rect x="163" y="0" width="77" height="240"/></clipPath>'
      + g('jn', [[0, '#fff', .55], [1, '#fff', .12]])
      + '<filter id="bz' + u + '" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3"/></filter>'
      + '</defs>';
    /* the lid: outer shell (its side = thickness), the inner face, a soft rim light on the top edge */
    const lid = '<g class="ch-lid"><g filter="url(#shS' + u + ')"><path d="' + LID_OUT + '" fill="url(#lo' + u + ')"/></g>'
      + '<path d="' + LID_IN + '" fill="url(#lin' + u + ')"/>'
      + '<path d="M104 75.2H193.6" stroke="#fff" stroke-opacity=".55" stroke-width="1.2" stroke-linecap="round"/>'
      + '<path d="M93.4 116.6L102.8 83" stroke="#fff" stroke-opacity=".35" stroke-width="1" stroke-linecap="round"/></g>';
    /* the opening: a dark inside, a soft warm-white glow from within (no rays) */
    const mouth = '<path d="' + RIM + '" fill="url(#in' + u + ')"/>'
      + '<g class="il-glowin" style="--o:1s"><ellipse cx="125" cy="129" rx="44" ry="7.5" fill="url(#wm' + u + ')" filter="url(#bz' + u + ')"/></g>';
    const card = '<g transform="translate(64 92) rotate(-10 20 15)"><g filter="url(#shS' + u + ')"><rect x="1.8" y="2.6" width="40" height="30" rx="8" fill="url(#liS' + u + ')"/><rect width="40" height="30" rx="8" fill="url(#li' + u + ')"/></g>'
      + '<rect width="40" height="30" rx="8" fill="url(#gl' + u + ')"/><rect x=".4" y=".4" width="39.2" height="29.2" rx="7.6" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width=".8"/>'
      + '<g filter="url(#shS' + u + ')"><circle cx="12" cy="13" r="7" fill="url(#bl' + u + ')"/></g><circle cx="12" cy="13" r="7" fill="url(#gl' + u + ')"/>'
      + '<circle cx="12" cy="11.6" r="2.1" fill="#fff"/><path d="M8.4 17.3C8.4 14.4 10 14 12 14S15.6 14.4 15.6 17.3Z" fill="#fff"/>'
      + line(23, 10.5, 11, '#8E7AD9', 3, .75) + line(23, 16.5, 7, '#8E7AD9', 3, .5) + '</g>';
    const coin = '<g filter="url(#shS' + u + ')"><circle cx="127.6" cy="97.8" r="15" fill="url(#gdS' + u + ')"/><circle cx="126" cy="96" r="15" fill="url(#gd' + u + ')"/></g>'
      + '<circle cx="126" cy="96" r="10.8" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1"/>'
      + '<use href="#sp' + u + '" transform="translate(126 96)" fill="#fff" opacity=".92"/><ellipse cx="120.4" cy="89.8" rx="3.8" ry="1.8" fill="#fff" opacity=".6" transform="rotate(-35 120.4 89.8)"/>';
    const bub = '<g transform="translate(140 98) rotate(8 21 12)"><g filter="url(#shS' + u + ')"><rect x="1.6" y="2.4" width="42" height="24" rx="12" fill="url(#blS' + u + ')"/><rect width="42" height="24" rx="12" fill="url(#bl' + u + ')"/></g>'
      + '<rect width="42" height="24" rx="12" fill="url(#gl' + u + ')"/><rect x=".4" y=".4" width="41.2" height="23.2" rx="11.6" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".8"/>'
      + line(9, 9.6, 20, '#fff', 3.2, .95) + line(9, 16.2, 12, '#fff', 3.2, .7) + '</g>';
    const rise = (inner, o, d) => A('ch-rise', '--o:' + o + 's', A('ch-float wn-loop', '--d:' + d + 's', inner));
    const body = '<g filter="url(#sh' + u + ')"><path d="' + BODY + '" fill="url(#fr' + u + ')"/></g>'
      + '<g clip-path="url(#sc' + u + ')"><path d="' + BODY + '" fill="url(#sd' + u + ')"/></g>'
      + '<g clip-path="url(#fc' + u + ')"><path d="' + BODY + '" fill="url(#ao' + u + ')"/></g>'
      /* polished edges: one rim light along the whole top edge (front and side, one stroke), and the shared vertical
         edge as a soft light line that fades downwards — the corner of ONE box, not a joint */
      + '<path d="M63 137.7H163L185.2 124.6" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<path d="M163 138.4V201.2" stroke="url(#jn' + u + ')" stroke-width="1.2"/>'
      /* today's lock, bevelled */
      + '<g filter="url(#shS' + u + ')"><rect x="100" y="155" width="24" height="30" rx="8" fill="#D7922E"/><rect x="100" y="153.6" width="24" height="30" rx="8" fill="url(#lk' + u + ')"/></g>'
      + '<rect x="100.6" y="154.2" width="22.8" height="28.8" rx="7.4" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".9"/>'
      + '<circle cx="112" cy="165" r="3.4" fill="#7A4A0C"/><path d="M110.4 167H113.6L114.4 174H109.6Z" fill="#7A4A0C"/>';
    const fg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" class="il ch" aria-hidden="true" focusable="false">' + defs(u) + defsC
      + '<ellipse cx="124" cy="130" rx="108" ry="96" fill="url(#glw' + u + ')"/>'
      + '<ellipse class="il-ground" cx="125" cy="206" rx="66" ry="5.5" style="fill:var(--il-shadow,#3b3f9e)"/>'
      + A('ch-in', '--o:0s', lid + mouth)
      + rise(card, .9, 7) + rise(coin, 1.05, 6) + rise(bub, 1.2, 8)
      + A('ch-in', '--o:0s', body)
      + '<g style="fill:var(--il-spark,#7186ff)">' + [[210, 70, .75, 0], [36, 130, .6, 1], [72, 62, .5, 2]].map(([x, y, sc, i]) => '<g transform="translate(' + x + ' ' + y + ') scale(' + sc + ')"><use href="#sp' + u + '" class="il-tw" style="--i:' + i + ';--o:1.4s"/></g>').join('') + '</g>'
      + '</svg>';
    return { bg: '', fg };
  }

  const SCENES = { hero, reply, voice, photos, privacy, apps, about: aboutToday, aboutToday, aboutRings, aboutMesh, aboutWaves, aboutGlass, chest };

  /* the CLEAN BLUE palette (Damir 14:04 / 14:05: "less purple, more blue" · "too many gradients blending"): the
     carousel scenes' violets map to the launcher-blue family (one violet kept as an accent, where the pink was);
     the ground itself goes clean in kit.css (one gradient + the scene's own glow; no halo, no blobs) */
  const PAL = { '#7f68d8': '#6886d8', '#f1eaff': '#eaf2ff', '#e9e4ff': '#e4edff', '#9c8ce0': '#8ca4e0',
    '#8e7ad9': '#7a97d9', '#7c58ff': '#3f7bff', '#e94ea8': '#7a5cff', '#ede7ff': '#e5eeff', '#d9ccff': '#cfe0ff',
    '#cbb9ff': '#b9d2ff', '#c9c2ea': '#c2d2ea', '#b9b2ff': '#b2caff', '#b9a8ff': '#a8c4ff', '#b8a8ff': '#a8c4ff',
    '#a891f0': '#8fb0f0', '#8f7bff': '#6f9bff', '#7c6bff': '#4f86ff', '#5e45e0': '#3a6ce0', '#3e2fb5': '#2a4fb5', '#1a1450': '#0f2257', '#0b0a26': '#08122e', '#231a63': '#10265f', '#120e3a': '#0a1638', '#24196b': '#12296e',
    '#120d3c': '#0a173d', '#2a1670': '#14287a', '#130b3c': '#0a1540', '#4e6bff': '#2f86ff', '#769dff': '#5fb0ff' };
  const CAROUSEL = { hero: 1, reply: 1, voice: 1, photos: 1, privacy: 1, apps: 1 };
  const swap = (t) => t.replace(/#[0-9a-fA-F]{6}\b/g, (m) => PAL[m.toLowerCase()] || m);
  const blue = () => typeof document !== 'undefined' && document.documentElement.dataset.pal === 'blue';
  return { scene: (name) => { const sc = SCENES[name](); return blue() && CAROUSEL[name] ? { bg: swap(sc.bg), fg: swap(sc.fg) } : sc; } };
})();
