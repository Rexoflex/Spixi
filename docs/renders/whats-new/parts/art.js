/* What's-new spotlight ART — six scenes in the approved illustration grammar (illustrations.js: glossy tiles
   with an offset "side", a gloss sheet, a hairline highlight, a soft drop shadow, concentric rings, four-point
   sparkles). Each scene = a FULL-BLEED background layer (loops gently, paused off-screen) + a foreground layer
   (one entrance, then it holds). Panels are always dark, so colours are literal brand values, not --il-* tokens.
   Static strings only; no user data. ICONS is the Tabler map (currentColor). Render only. */
const WN_ART = (function () {
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
      + lg('gl', [[0, '#fff', .6], [.36, '#fff', .08], [.5, '#fff', 0]], .3, 1)
      + lg('ph1', [[0, '#9DB6FF'], [1, '#E3E4FE']], 0, 1)
      + lg('ph2', [[0, '#A48DFF'], [1, '#F1EAFF']], 0, 1)
      + lg('ph3', [[0, '#5A6CF2'], [1, '#B4D0FF']], 0, 1)
      + lg('ph4', [[0, '#8466F2'], [1, '#CBCFFE']], 0, 1)
      + rg('glow', '#7C6BFF', .5, 0)
      + rg('glowB', '#5A86FF', .45, 0)
      + '<radialGradient id="vc' + u + '" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="#D9CCFF"/><stop offset=".5" stop-color="#8F7BFF"/><stop offset="1" stop-color="#5E45E0"/></radialGradient>'
      + '<filter id="sh' + u + '" x="-60%" y="-60%" width="220%" height="240%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="6"/><feOffset dy="6" result="o"/><feFlood flood-color="#070A3A" flood-opacity=".5"/><feComposite in2="o" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      + '<filter id="shS' + u + '" x="-60%" y="-60%" width="220%" height="240%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="3"/><feOffset dy="3" result="o"/><feFlood flood-color="#070A3A" flood-opacity=".45"/><feComposite in2="o" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
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
  const sparkle = (u, x, y, s, i, o) => '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' + A('il-tw', '--i:' + i + ';--o:' + (o || .8) + 's', '<use href="#sp' + u + '" fill="#fff"/>') + '</g>';
  const line = (x, y, w, c, sw, op) => '<path d="M' + x + ' ' + y + 'h' + w + '" stroke="' + c + '" stroke-width="' + (sw || 4) + '" stroke-linecap="round"' + (op != null ? ' stroke-opacity="' + op + '"' : '') + '/>';
  const svgOpen = (vb, cls, par) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" class="' + cls + '" preserveAspectRatio="' + (par || 'xMidYMid meet') + '" aria-hidden="true" focusable="false">';
  const baseRect = (u, a, b, h) => '<linearGradient id="bg' + u + '" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient><rect width="400" height="' + (h || 240) + '" fill="url(#bg' + u + ')"/>';
  const blob = (cx, cy, r, c, a, dx, dy, d) => '<g class="wn-drift wn-loop" style="--dx:' + dx + 'px;--dy:' + dy + 'px;--d:' + d + 's"><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + c + '" opacity="' + a + '"/></g>';
  function blobDefs(u, cols) {
    return cols.map((c, k) => '<radialGradient id="b' + k + u + '" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="' + c + '" stop-opacity=".75"/><stop offset=".55" stop-color="' + c + '" stop-opacity=".25"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></radialGradient>').join('');
  }
  function stars(n, w, h, seed) {
    let s = '', r = seed;
    const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
    for (let i = 0; i < n; i++) s += '<circle class="wn-tw wn-loop" style="--i:' + i + '" cx="' + f(rnd() * w) + '" cy="' + f(rnd() * h) + '" r="' + f(.6 + rnd() * .9) + '" fill="#fff"/>';
    return s;
  }

  /* ================= 1 · HERO — the whole card. A phone with the new UI; four chips orbit it,
     one per card that follows (reply · voice · album · privacy) — the hero is the table of contents ================= */
  function hero() {
    const u = '-h' + (++seq);
    const bg = svgOpen('0 0 400 640', 'wnL wnL--bg', 'xMidYMid slice') + '<defs>' + blobDefs(u, ['#7C58FF', '#4E6BFF', '#769DFF', '#E94EA8']) + '</defs>'
      + baseRect(u, '#1a1450', '#0b0a26', 640)
      + blob(80, 150, 230, 'url(#b0' + u + ')', 1, 46, 34, 14)
      + blob(340, 90, 210, 'url(#b1' + u + ')', 1, -54, 40, 17)
      + blob(270, 400, 260, 'url(#b2' + u + ')', .55, -36, -44, 19)
      + blob(60, 540, 220, 'url(#b3' + u + ')', .32, 34, -26, 23)
      + stars(26, 400, 640, 7) + '</svg>';
    const phone = (() => {
      const x = 152, y = 30, w = 96, h = 184;
      return '<ellipse cx="200" cy="214" rx="78" ry="12" fill="#05041a" opacity=".45"/>'
        + '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="20" fill="#0d0e26" stroke="#fff" stroke-opacity=".28" stroke-width="1"/>'
        + '<rect x="' + (x + 5) + '" y="' + (y + 5) + '" width="' + (w - 10) + '" height="' + (h - 10) + '" rx="15" fill="#f5f6fb"/>'
        + '<rect x="' + (x + 5) + '" y="' + (y + 5) + '" width="' + (w - 10) + '" height="26" rx="15" fill="#3050bd"/><rect x="' + (x + 5) + '" y="' + (y + 18) + '" width="' + (w - 10) + '" height="13" fill="#3050bd"/>'
        + line(x + 14, y + 20, 30, '#fff', 4, .85)
        + '<rect x="' + (x + 12) + '" y="' + (y + 40) + '" width="48" height="14" rx="7" fill="#e3e7f0"/>'
        + '<rect x="' + (x + 36) + '" y="' + (y + 60) + '" width="48" height="14" rx="7" fill="#3050bd"/>'
        + '<rect x="' + (x + 12) + '" y="' + (y + 80) + '" width="58" height="34" rx="9" fill="#cbcffe"/>'
        + '<rect x="' + (x + 15) + '" y="' + (y + 83) + '" width="25" height="28" rx="6" fill="url(#ph1' + u + ')"/><rect x="' + (x + 42) + '" y="' + (y + 83) + '" width="25" height="28" rx="6" fill="url(#ph2' + u + ')"/>'
        + '<rect x="' + (x + 30) + '" y="' + (y + 120) + '" width="54" height="16" rx="8" fill="#3050bd"/>'
        + [6, 10, 4, 12, 8, 6, 10].map((hh, k) => '<rect x="' + (x + 44 + k * 5) + '" y="' + (y + 128 - hh / 2) + '" width="2.4" height="' + hh + '" rx="1.2" fill="#fff" opacity=".85"/>').join('')
        + '<circle cx="' + (x + 37) + '" cy="' + (y + 128) + '" r="4.5" fill="#fff"/>'
        + '<rect x="' + (x + 12) + '" y="' + (y + 156) + '" width="72" height="14" rx="7" fill="#e3e7f0"/>';
    })();
    const chip = (cx, cy, inner, o, fx, fy, face) => '<g transform="translate(' + cx + ' ' + cy + ')">' + A('il-fly', '--o:' + o + 's;--fx:' + fx + 'px;--fy:' + fy + 'px', A('wn-bob wn-loop', '--d:' + (4 + o) + 's', tile(u, -24, -24, 48, 48, 15, face) + inner)) + '</g>';
    const fg = svgOpen('0 0 400 250', 'wnL wnL--fg') + defs(u)
      + '<ellipse cx="200" cy="122" rx="170" ry="120" fill="url(#glow' + u + ')"/>'
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
    const bubbles = [[24, 40, 70, 30, 12], [300, 22, 84, 34, 16], [330, 150, 60, 26, 9], [14, 170, 90, 34, 14], [180, 196, 70, 28, 11], [210, 6, 54, 22, 13], [110, 110, 48, 20, 18]]
      .map(([x, y, w, h, d], i) => '<g class="wn-rise wn-loop" style="--d:' + d + 's"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + h / 2 + '" fill="none" stroke="#B8A8FF" stroke-opacity="' + (.12 + (i % 3) * .05) + '" stroke-width="1.4"/></g>').join('');
    const bg = svgOpen('0 0 400 240', 'wnL wnL--bg', 'xMidYMid slice') + baseRect(u, '#231a63', '#120e3a') + '<circle cx="320" cy="40" r="160" fill="#7C58FF" opacity=".16"/>' + bubbles + stars(14, 400, 240, 3) + '</svg>';
    const emoji = [
      ['#FF6B8A', 'heart-filled'], ['#FFC94D', 'star'], ['#7DA6FF', 'checks'], ['#A48DFF', 'apps-filled'], ['#3CC79A', 'heart-filled'], ['#FF9F5A', 'star'],
    ].map(([c, g], k) => '<circle cx="' + (112 + k * 23) + '" cy="113" r="9.5" fill="' + c + '"/>' + glyph(g, 112 + k * 23 - 6, 107, 12, '#fff')).join('');
    const fg = svgOpen('0 0 400 240', 'wnL wnL--fg') + defs(u)
      + '<ellipse cx="200" cy="124" rx="180" ry="110" fill="url(#glow' + u + ')"/>'
      + A('il-fade', '--o:.5s', '<circle cx="56" cy="70" r="15" fill="#fff" fill-opacity=".14"/>' + glyph('arrow-back-up', 46, 60, 20, '#fff'))
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
      bars += '<rect class="wn-bar wn-loop" style="--i:' + i + '" x="' + f(6 + i * 9) + '" y="' + (120 - h / 2) + '" width="4.5" height="' + h + '" rx="2.25" fill="#9DB6FF" opacity=".2"/>';
    }
    const bg = svgOpen('0 0 400 240', 'wnL wnL--bg', 'xMidYMid slice') + baseRect(u, '#132063', '#0b1236') + '<circle cx="110" cy="120" r="150" fill="#4E86FF" opacity=".16"/>' + bars + '</svg>';
    const hs = [8, 14, 20, 12, 24, 18, 10, 22, 16, 26, 12, 18, 8, 14, 20, 10];
    const wave = (op, played) => hs.map((h, k) => played
      ? A('il-fade', '--o:' + f(1.5 + k * .09) + 's', '<rect x="' + (232 + k * 7) + '" y="' + (121 - h / 2) + '" width="3.6" height="' + h + '" rx="1.8" fill="#fff"/>')
      : '<rect x="' + (232 + k * 7) + '" y="' + (121 - h / 2) + '" width="3.6" height="' + h + '" rx="1.8" fill="#fff" opacity="' + op + '"/>').join('');
    const fg = svgOpen('0 0 400 240', 'wnL wnL--fg') + defs(u)
      + '<ellipse cx="118" cy="120" rx="120" ry="100" fill="url(#glowB' + u + ')"/>'
      + [0, .8, 1.6].map((d) => '<circle class="wn-pulse" style="--o:' + f(.5 + d) + 's" cx="118" cy="120" r="34" fill="none" stroke="#B9A8FF" stroke-width="2"/>').join('')
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
      + '<rect width="400" height="240" fill="url(#glow' + u + ')" opacity=".6"/></svg>';
    const grid = [[112, 52, 'ph1'], [188, 52, 'ph2'], [112, 120, 'ph3'], [188, 120, 'ph4']]
      .map(([x, y, g], k) => A('il-pop', '--o:' + f(.35 + k * .12) + 's;--to:50% 50%', photo(x, y, 70, 62, 10, g)
        + (k === 3 ? '<rect x="' + x + '" y="' + y + '" width="70" height="62" rx="10" fill="#2C1F8A" opacity=".55"/>' + glyph('photo', x + 23, y + 19, 24, '#fff') : ''))).join('');
    const pin = '<path d="M0 -26C-14 -26 -24 -15 -24 -2C-24 15 0 30 0 30C0 30 24 15 24 -2C24 -15 14 -26 0 -26Z" fill="url(#vi' + u + ')" filter="url(#sh' + u + ')"/><circle cx="0" cy="-3" r="8.5" fill="#fff"/>';
    const fg = svgOpen('0 0 400 240', 'wnL wnL--fg') + defs(u)
      + '<ellipse cx="190" cy="124" rx="170" ry="110" fill="url(#glow' + u + ')"/>'
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
    for (let y = 10; y < 240; y += 20) for (let x = 10; x < 400; x += 20) dots += '<circle cx="' + x + '" cy="' + y + '" r="1.3" fill="#9DB6FF" opacity=".2"/>';
    const bg = svgOpen('0 0 400 240', 'wnL wnL--bg', 'xMidYMid slice') + baseRect(u, '#10215e', '#0a1235') + dots
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
      + '<ellipse cx="200" cy="124" rx="170" ry="110" fill="url(#glowB' + u + ')"/>'
      + A('il-rise', '--o:.05s', tile(u, 94, 44, 216, 160, 22, 'li') + rows)
      + '<g transform="translate(312 48)">' + A('il-pop', '--o:2.35s;--to:50% 50%', '<circle r="24" fill="url(#vc' + u + ')" filter="url(#sh' + u + ')"/><circle r="23.5" fill="none" stroke="#fff" stroke-opacity=".35"/>' + glyph('eye-off', -13, -13, 26, '#fff')) + '</g>'
      + sparkle(u, 70, 50, .8, 0, 2.6) + sparkle(u, 352, 190, .8, 1, 2.7) + sparkle(u, 58, 196, .6, 2, 1)
      + '</svg>';
    return { bg, fg };
  }

  /* ================= 6 · MINI APPS — bg: a slow orbit of app tiles; an invite is accepted, apps fly out ================= */
  function apps() {
    const u = '-a' + (++seq);
    const ring = (r, n, sz, op, ph) => { let s = ''; for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + ph; s += '<rect x="' + f(200 + Math.cos(a) * r - sz / 2) + '" y="' + f(120 + Math.sin(a) * r - sz / 2) + '" width="' + sz + '" height="' + sz + '" rx="' + f(sz * .3) + '" fill="' + (k % 2 ? '#A48DFF' : '#7DA6FF') + '" opacity="' + op + '"/>'; } return s; };
    const bg = svgOpen('0 0 400 240', 'wnL wnL--bg', 'xMidYMid slice') + baseRect(u, '#2a1670', '#130b3c')
      + '<circle cx="200" cy="120" r="170" fill="none" stroke="#A48DFF" stroke-opacity=".14"/><circle cx="200" cy="120" r="110" fill="none" stroke="#A48DFF" stroke-opacity=".12" stroke-dasharray="3 6"/>'
      + '<g class="wn-orbit wn-loop">' + ring(170, 10, 20, .3, 0) + '</g><g class="wn-orbit wn-orbit--rev wn-loop">' + ring(110, 7, 14, .25, .4) + '</g>' + stars(12, 400, 240, 11) + '</svg>';
    const out = [['rocket', 'bl', 300, 48, 2.0], ['code', 'vi', 330, 110, 2.15], ['star', 'li', 300, 172, 2.3]]
      .map(([g, face, x, y, o]) => '<g transform="translate(' + x + ' ' + y + ')">' + A('il-fly', '--o:' + o + 's;--fx:-110px;--fy:' + (110 - y) * .6 + 'px', A('wn-bob wn-loop', '--d:' + (4 + o) + 's', tile(u, -19, -19, 38, 38, 12, face) + glyph(g, -10, -10, 20, face === 'li' ? '#5C45CC' : '#fff'))) + '</g>').join('');
    const fg = svgOpen('0 0 400 240', 'wnL wnL--fg') + defs(u)
      + '<ellipse cx="180" cy="124" rx="170" ry="110" fill="url(#glow' + u + ')"/>'
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

  const SCENES = { hero, reply, voice, photos, privacy, apps };
  return { scene: (name) => SCENES[name]() };
})();
