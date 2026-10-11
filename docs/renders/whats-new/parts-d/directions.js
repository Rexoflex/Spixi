/* SPIXI ART DIRECTION — three illustration + motion languages grown from the logo (render only).
   The mark: a CIRCLE and a speech-bubble LEAF (one sharp corner) overlap; the LENS between them holds TWO DOTS.
   Read: two people · the private space they share · the two of you in it. Every direction keeps that grammar.
     LENS  — liquid glass + light: the world is frosted; only where the two shapes overlap is it sharp.
     PRESS — riso print: two inks overprint; the overlap prints a third colour by itself. Grain, stop-motion.
     SPARK — the mark is alive: the two dots are eyes; it blinks, looks at you, hums, keeps a secret.
   Static strings only; themed colours ride CSS custom properties (style=, never attributes). */
const AD = (function () {
  'use strict';
  let seq = 0;
  const f = (n) => Math.round(n * 10) / 10;
  const U = () => '-' + (++seq).toString(36);
  const leaf = (x, y, w, h, R) => 'M' + (x + R) + ' ' + y + 'H' + (x + w) + 'V' + (y + h - R) + 'A' + R + ' ' + R + ' 0 0 1 ' + (x + w - R) + ' ' + (y + h)
    + 'H' + (x + R) + 'A' + R + ' ' + R + ' 0 0 1 ' + x + ' ' + (y + h - R) + 'V' + (y + R) + 'A' + R + ' ' + R + ' 0 0 1 ' + (x + R) + ' ' + y + 'Z';
  const circ = (cx, cy, r) => 'M' + (cx - r) + ' ' + cy + 'a' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0a' + r + ' ' + r + ' 0 1 0 ' + -2 * r + ' 0Z';
  const svg = (cls, body, vb) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (vb || '0 0 400 240') + '" class="ad-svg ' + cls + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' + body + '</svg>';
  /* the mark's geometry, shared by all three (circle bottom-left, leaf top-right, as in the logo) */
  const M = { cx: 168, cy: 148, r: 66, lx: 176, ly: 40, lw: 128, lh: 128, R: 64 };
  const LEAF = leaf(M.lx, M.ly, M.lw, M.lh, M.R), CIRC = circ(M.cx, M.cy, M.r);
  const EYE1 = { x: 196, y: 120, r: 6 }, EYE2 = { x: 214, y: 134, r: 8.5 };   // the logo's two dots, in the lens

  /* ======================================================================= LENS */
  function lens(kind) {
    const u = U();
    const blobs = [['--ln-b1', 90, 70, 150, 26, 18, 16], ['--ln-b2', 320, 60, 140, -30, 24, 19], ['--ln-b3', 250, 230, 170, -20, -26, 23], ['--ln-b4', 40, 230, 120, 24, -18, 21]];
    const grad = (id, v, a0) => '<radialGradient id="' + id + u + '" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:var(' + v + ');stop-opacity:' + a0 + '"/><stop offset=".6" style="stop-color:var(' + v + ');stop-opacity:' + a0 * .35 + '"/><stop offset="1" style="stop-color:var(' + v + ');stop-opacity:0"/></radialGradient>';
    const defs = '<defs>' + blobs.map(([v], k) => grad('g' + k, v, 1) + grad('s' + k, v, .75)).join('')
      + '<clipPath id="cc' + u + '"><path d="' + CIRC + '"/></clipPath><clipPath id="cl' + u + '"><path d="' + LEAF + '"/></clipPath>'
      + '<linearGradient id="rim' + u + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--ln-rim);stop-opacity:1"/><stop offset=".45" style="stop-color:var(--ln-rim);stop-opacity:.08"/><stop offset=".8" style="stop-color:var(--ln-rim);stop-opacity:.05"/><stop offset="1" style="stop-color:var(--ln-rim2);stop-opacity:.8"/></linearGradient>'
      + '<radialGradient id="ca' + u + '" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".25" style="stop-color:var(--ln-b2);stop-opacity:.8"/><stop offset="1" style="stop-color:var(--ln-b1);stop-opacity:0"/></radialGradient>'
      + '<filter id="gw' + u + '" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>'
      + '<linearGradient id="gl' + u + '" x1="0" y1="0" x2="1" y2=".3"><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset=".65" stop-color="#fff" stop-opacity="0"/>'
      + '<animateTransform attributeName="gradientTransform" type="translate" values="-1.2 0;1.2 0;1.2 0" keyTimes="0;.35;1" dur="6s" begin="1.4s" repeatCount="indefinite"/></linearGradient>'
      + '<radialGradient id="dot' + u + '" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:var(--ln-dot)"/><stop offset=".55" style="stop-color:var(--ln-dot)"/><stop offset="1" style="stop-color:var(--ln-dot);stop-opacity:0"/></radialGradient>'
      + '<filter id="fz' + u + '" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>'
      + '<radialGradient id="sh' + u + '" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:var(--ln-shadow);stop-opacity:.55"/><stop offset="1" style="stop-color:var(--ln-shadow);stop-opacity:0"/></radialGradient>'
      + '</defs>';
    const aur = (soft) => '<rect width="400" height="240" style="fill:var(--ln-ground)"/>' + blobs.map(([v, x, y, r, dx, dy, d], k) =>
      '<g class="ad-drift ad-loop" style="--dx:' + dx + 'px;--dy:' + dy + 'px;--d:' + d + 's"><circle cx="' + x + '" cy="' + y + '" r="' + (soft ? r * 1.3 : r) + '" fill="url(#' + (soft ? 's' : 'g') + k + u + ')"/></g>').join('');
    /* the content seen through the glass (sharp in the lens, frosted elsewhere) */
    let content = '', contentFront = '';
    if (kind === 'hero') {
      content = '<circle cx="' + EYE1.x + '" cy="' + EYE1.y + '" r="' + (EYE1.r + 7) + '" fill="url(#dot' + u + ')" opacity=".55"/><circle cx="' + EYE2.x + '" cy="' + EYE2.y + '" r="' + (EYE2.r + 9) + '" fill="url(#dot' + u + ')" opacity=".55"/>'
        + '<circle cx="' + EYE1.x + '" cy="' + EYE1.y + '" r="' + EYE1.r + '" style="fill:var(--ln-dot)"/><circle cx="' + EYE2.x + '" cy="' + EYE2.y + '" r="' + EYE2.r + '" style="fill:var(--ln-dot)"/>';
    } else if (kind === 'voice') {
      for (let i = 0; i < 40; i++) {
        const h = 16 + Math.round(64 * Math.abs(Math.sin(i * .5) * Math.cos(i * .17)));
        content += '<rect class="ad-bar ad-loop" style="--i:' + i + ';fill:var(--ln-ink)" x="' + f(14 + i * 9.4) + '" y="' + f(128 - h / 2) + '" width="4.4" height="' + h + '" rx="2.2"/>';
      }
    } else {
      // privacy: what the others would see — read ticks · typing · online — sit under the glass
      content = '<g style="stroke:var(--ln-ink);fill:none;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round"><path d="M126 150l7 7 13 -14M140 157l13 -14"/></g>'
        + '<g style="fill:var(--ln-ink)"><circle cx="196" cy="128" r="4.5"/><circle cx="208" cy="128" r="4.5"/><circle cx="220" cy="128" r="4.5"/></g>'
        + '<circle cx="262" cy="86" r="9" style="fill:var(--ln-on)"/><circle cx="262" cy="86" r="14" fill="none" style="stroke:var(--ln-on)" stroke-width="2" opacity=".5"/>';
    }
    const lcx = 205, lcy = 128;
    const glass = (clip, d, o, from) => '<g class="ad-glass" style="--o:' + o + 's;--from:' + from + '">'
      + '<g clip-path="url(#' + clip + u + ')">' + aur(true) + '<g filter="url(#fz' + u + ')" opacity=".75">' + content + '</g><rect width="400" height="240" style="fill:var(--ln-frost)"/></g>'
      + '<path d="' + d + '" fill="none" stroke="url(#rim' + u + ')" stroke-width="6" opacity=".45" filter="url(#gw' + u + ')"/>'
      + '<path d="' + d + '" fill="none" stroke="url(#rim' + u + ')" stroke-width="1.8"/>'
      + '<path d="' + d + '" fill="none" stroke="url(#gl' + u + ')" stroke-width="2.2" opacity=".85"/></g>';
    const lensBody = '<g clip-path="url(#cc' + u + ')"><g clip-path="url(#cl' + u + ')"><g class="ad-focus' + (kind === 'privacy' ? ' ad-frostover' : '') + '" style="--o:.9s">'
      + '<g transform="translate(' + lcx + ' ' + lcy + ') scale(1.22) translate(' + -lcx + ' ' + -lcy + ')">' + aur(false) + content + '</g>'
      + '<rect width="400" height="240" style="fill:var(--ln-lens)"/></g>'
      + (kind === 'privacy' ? '<g class="ad-frostin" style="--o:2.1s">' + aur(true) + '<g filter="url(#fz' + u + ')" opacity=".75">' + content + '</g><rect width="400" height="240" style="fill:var(--ln-frost)"/></g>' : '') + '</g></g>';
    /* where the two shapes meet, the glass bends light: a chromatic fringe on the lens edge, a caustic on the ground */
    const fringe = '<g class="ad-focus" style="--o:1.1s"><g clip-path="url(#cl' + u + ')"><path d="' + CIRC + '" fill="none" stroke="#ff5fb0" stroke-width="2" opacity=".75" transform="translate(1.6 .6)" style="mix-blend-mode:screen"/><path d="' + CIRC + '" fill="none" stroke="#4fc3ff" stroke-width="2" opacity=".75" transform="translate(-1.6 -.6)" style="mix-blend-mode:screen"/></g>'
      + '<g clip-path="url(#cc' + u + ')"><path d="' + LEAF + '" fill="none" stroke="#ff5fb0" stroke-width="2" opacity=".75" transform="translate(1.6 .6)" style="mix-blend-mode:screen"/><path d="' + LEAF + '" fill="none" stroke="#4fc3ff" stroke-width="2" opacity=".75" transform="translate(-1.6 -.6)" style="mix-blend-mode:screen"/></g></g>';
    const caustic = '<g class="ad-focus" style="--o:1.3s"><g class="ad-pulse ad-loop"><ellipse cx="214" cy="214" rx="46" ry="9" fill="url(#ca' + u + ')"/></g></g>';
    const pebble = (cx, cy, r, o, d) => { const pd = circ(cx, cy, r); return '<g class="ad-glass" style="--o:' + o + 's;--from:0px"><g class="ad-bob ad-loop" style="--d:' + d + 's"><clipPath id="pb' + cx + u + '"><path d="' + pd + '"/></clipPath>'
      + '<g clip-path="url(#pb' + cx + u + ')">' + aur(true) + '<rect width="400" height="240" style="fill:var(--ln-frost)"/></g><path d="' + pd + '" fill="none" stroke="url(#rim' + u + ')" stroke-width="1.6"/></g></g>'; };
    const body = defs + aur(false) + contentFront
      + '<ellipse cx="214" cy="216" rx="128" ry="15" fill="url(#sh' + u + ')"/>' + caustic
      + (kind === 'voice' ? content : '')
      + '<g transform="translate(205 128) scale(1.14) translate(-205 -128)">' + glass('cc', CIRC, .1, '-26px') + glass('cl', LEAF, .3, '26px') + lensBody + fringe + '</g>'
      + pebble(70, 62, 15, 1.5, 5.2) + pebble(352, 182, 10, 1.7, 4.4) + pebble(334, 40, 6, 1.9, 6);
    return svg('ad-lens', body);
  }

  /* ======================================================================= PRESS */
  function rnd(seed) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
  function boilPath(pts, amp, seed, closed) {
    const r = rnd(seed); const p = pts.map(([x, y]) => [x + (r() - .5) * amp, y + (r() - .5) * amp]);
    let d = 'M' + f(p[0][0]) + ' ' + f(p[0][1]);
    for (let i = 1; i < p.length; i++) { const [x0, y0] = p[i - 1], [x1, y1] = p[i]; d += 'Q' + f(x0) + ' ' + f(y0) + ' ' + f((x0 + x1) / 2) + ' ' + f((y0 + y1) / 2); }
    const L = p[p.length - 1]; d += 'T' + f(L[0]) + ' ' + f(L[1]);
    return d + (closed ? 'Z' : '');
  }
  /* three hand-drawn takes of one line, swapped every 120 ms — the "boil" of stop-motion */
  const boil = (pts, amp, seed, style, closed) => '<g class="pr-boil">' + [0, 1, 2].map((k) => '<path d="' + boilPath(pts, amp, seed + k * 17, closed) + '" style="' + style + ';animation-delay:' + (-k * .12) + 's"/>').join('') + '</g>';
  function press(kind) {
    const u = U();
    const defs = '<defs>'
      + '<filter id="gr' + u + '" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="4" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .45  0 0 0 0 .4  0 0 0 .9 -.3"/></filter>'
      + '<filter id="ro' + u + '" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="1" seed="7"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter>'
      + '<pattern id="ht' + u + '" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1.25" style="fill:var(--pr-blue)"/></pattern>'
      + '<pattern id="hp' + u + '" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-15)"><circle cx="2.5" cy="2.5" r="1.4" style="fill:var(--pr-pink)"/></pattern>'
      + '<clipPath id="pc' + u + '"><path d="' + CIRC + '"/></clipPath><clipPath id="pl' + u + '"><path d="' + LEAF + '"/></clipPath>'
      + '</defs>';
    const paper = '<rect width="400" height="240" style="fill:var(--pr-paper)"/>';
    const grain = '<rect width="400" height="240" filter="url(#gr' + u + ')" class="pr-grain"/>';
    const ink = (c) => 'class="pr-ink" style="fill:var(--pr-' + c + ')" filter="url(#ro' + u + ')"';
    const stamp = (inner, o, extra) => '<g class="pr-stamp" style="--o:' + o + 's' + (extra || '') + '">' + inner + '</g>';
    const line = 'fill:none;stroke:var(--pr-line);stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round';
    let body = '';
    if (kind === 'hero') {
      body = stamp('<path d="' + CIRC + '" ' + ink('pink') + '/><g clip-path="url(#pc' + u + ')"><rect x="96" y="160" width="150" height="60" fill="url(#ht' + u + ')" class="pr-ink"/></g>', .15, ';transform:translate(2px,1px)')
        + stamp('<path d="' + LEAF + '" ' + ink('blue') + '/><g clip-path="url(#pl' + u + ')"><rect x="240" y="36" width="80" height="60" fill="url(#hp' + u + ')" class="pr-ink"/></g>', .55)
        + stamp('<circle cx="' + EYE1.x + '" cy="' + EYE1.y + '" r="' + EYE1.r + '" style="fill:var(--pr-paper)"/><circle cx="' + EYE2.x + '" cy="' + EYE2.y + '" r="' + EYE2.r + '" style="fill:var(--pr-paper)"/>', 1.0)
        + '<g class="pr-late" style="--o:1.3s">' + boil([[322, 46], [334, 34], [350, 30]], 2.4, 3, line) + boil([[330, 62], [348, 58], [362, 52]], 2.4, 9, line)
        + boil([[60, 70], [66, 58], [60, 46], [72, 40]], 2.2, 5, line) + boil([[86, 202], [100, 212], [118, 210], [128, 222]], 2.2, 11, line) + '</g>';
    } else if (kind === 'voice') {
      let pts = []; for (let x = 120; x <= 360; x += 8) { const t = (x - 120) / 240; pts.push([x, 132 + Math.sin(x * .11) * 34 * Math.sin(t * Math.PI) * (.6 + .4 * Math.sin(x * .05))]); }
      body = stamp('<circle cx="96" cy="128" r="46" ' + ink('pink') + '/><circle cx="96" cy="128" r="46" fill="url(#ht' + u + ')" class="pr-ink" opacity=".9" clip-path="url(#pc' + u + ')"/>', .15)
        + stamp('<path d="' + leaf(70, 98, 52, 60, 26) + '" ' + ink('blue') + '/>', .45)
        + '<g class="pr-late" style="--o:.8s">' + boil(pts, 3.4, 21, 'fill:none;stroke:var(--pr-blue);stroke-width:7;stroke-linecap:round;mix-blend-mode:var(--pr-blend)') + '</g>'
        + '<g class="pr-late" style="--o:1.5s">' + boil([[150, 60], [160, 50], [174, 48]], 2, 2, line) + boil([[150, 200], [160, 210], [174, 212]], 2, 6, line) + boil([[372, 120], [380, 132], [372, 144]], 2, 8, line) + '</g>';
    } else {
      const ic = ['M-9 0l5 5 9 -10M1 5l9 -10', 'M-8 0h.01M0 0h.01M8 0h.01', null];
      [[110, 'blue'], [200, 'blue'], [290, 'blue']].forEach(([cx, c], k) => {
        body += stamp('<circle cx="' + cx + '" cy="126" r="34" ' + ink(c) + '/><g transform="translate(' + cx + ' 126)">' + (ic[k] ? '<path d="' + ic[k] + '" style="fill:none;stroke:var(--pr-paper);stroke-width:' + (k === 1 ? 7 : 4.2) + ';stroke-linecap:round;stroke-linejoin:round"/>' : '<circle r="9" style="fill:var(--pr-paper)"/>') + '</g>', .1 + k * .2)
          + stamp('<path d="M' + (cx - 46) + ' 112h92l-4 28h-92z" ' + ink('pink') + '/>', 1.3 + k * .45, ';--rot:' + (k % 2 ? 6 : -5) + 'deg');
      });
      body += '<g class="pr-late" style="--o:2.8s">' + boil([[60, 196], [120, 204], [200, 198], [280, 206], [340, 198]], 2.4, 31, line) + '</g>';
    }
    const reg = '<g class="pr-late" style="--o:.05s;fill:none;stroke:var(--pr-line);stroke-width:1" opacity=".55"><circle cx="378" cy="222" r="6"/><path d="M366 222h24M378 210v24"/></g>';
    return svg('ad-press', defs + paper + body + reg + grain);
  }

  /* ======================================================================= SPARK */
  function spark(kind) {
    const u = U();
    const defs = '<defs><linearGradient id="tb' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sk-tube-hi)"/><stop offset=".55" style="stop-color:var(--sk-tube)"/><stop offset="1" style="stop-color:var(--sk-tube-lo)"/></linearGradient>'
      + '<clipPath id="kc' + u + '"><path d="' + CIRC + '"/></clipPath><clipPath id="kl' + u + '"><path d="' + LEAF + '"/></clipPath>'
      + '<radialGradient id="ks' + u + '" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:var(--sk-shadow);stop-opacity:.5"/><stop offset="1" style="stop-color:var(--sk-shadow);stop-opacity:0"/></radialGradient>'
      + '<radialGradient id="kg' + u + '" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:var(--sk-glow);stop-opacity:.55"/><stop offset="1" style="stop-color:var(--sk-glow);stop-opacity:0"/></radialGradient></defs>';
    const tube = (d) => '<path d="' + d + '" fill="none" stroke="url(#tb' + u + ')" stroke-width="20" stroke-linejoin="round"/>'
      + '<path d="' + d + '" fill="none" style="stroke:var(--sk-gloss)" stroke-width="4" stroke-linecap="round" stroke-dasharray="40 260" stroke-dashoffset="-20" transform="translate(-3 -4)" opacity=".7"/>';
    const eye = (e, k) => '<g class="sk-eye" style="--k:' + k + '"><g class="sk-lid"><ellipse cx="' + e.x + '" cy="' + e.y + '" rx="' + e.r * 1.05 + '" ry="' + e.r * 1.2 + '" style="fill:var(--sk-eye)"/>'
      + '<g class="sk-pupil"><circle cx="' + f(e.x + e.r * .35) + '" cy="' + f(e.y - e.r * .4) + '" r="' + f(e.r * .32) + '" fill="#fff"/></g></g>'
      + '<path class="sk-happy" d="M' + f(e.x - e.r) + ' ' + f(e.y + 1) + 'q' + e.r + ' ' + -e.r * 1.4 + ' ' + 2 * e.r + ' 0" fill="none" style="stroke:var(--sk-eye)" stroke-width="3.2" stroke-linecap="round"/>'
      + '<path class="sk-calm" d="M' + f(e.x - e.r) + ' ' + f(e.y - 1) + 'q' + e.r + ' ' + e.r * 1.2 + ' ' + 2 * e.r + ' 0" fill="none" style="stroke:var(--sk-eye)" stroke-width="3.2" stroke-linecap="round"/></g>';
    const face = '<g clip-path="url(#kc' + u + ')"><path d="' + LEAF + '" style="fill:var(--sk-face)"/></g>'
      + '<circle cx="186" cy="146" r="5" style="fill:var(--sk-blush)" opacity=".55"/><circle cx="230" cy="152" r="5" style="fill:var(--sk-blush)" opacity=".55"/>'
      + eye(EYE1, 0) + eye(EYE2, 1);
    const char = '<g class="sk-char sk-' + kind + '"><g class="sk-body">' + tube(CIRC) + tube(LEAF) + face + '</g></g>';
    const ground = '<rect width="400" height="240" style="fill:var(--sk-ground)"/><circle cx="210" cy="118" r="130" fill="url(#kg' + u + ')"/>'
      + '<ellipse class="sk-shadow" cx="210" cy="222" rx="96" ry="10" fill="url(#ks' + u + ')"/>';
    const chip = (x, y, d, o, c) => '<g transform="translate(' + x + ' ' + y + ')"><g class="sk-chip" style="--o:' + o + 's"><g class="ad-bob ad-loop" style="--d:' + (3.6 + o) + 's"><rect x="-17" y="-17" width="34" height="34" rx="11" style="fill:var(--sk-' + (c || 'chip') + ')"/>'
      + '<path d="' + d + '" fill="none" style="stroke:var(--sk-chip-ink)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g></g></g>';
    let extra = '';
    if (kind === 'hero') {
      extra = chip(62, 70, 'M-2 -7l-6 6 6 6M-8 -1h9a6 6 0 0 1 6 6v3', 1.3) + chip(346, 82, 'M-4 -8h8v10a4 4 0 0 1 -8 0zM-7 1a7 7 0 0 0 14 0M0 8v3', 1.45, 'chip2')
        + chip(78, 190, 'M-8 -6h16v12h-16zM-8 3l5 -4 4 3 3 -2 4 3', 1.6, 'chip2') + chip(352, 196, 'M0 6C-10 -1 -6 -9 0 -4C6 -9 10 -1 0 6Z', 1.75);
    } else if (kind === 'voice') {
      extra = [0, 1, 2].map((k) => { const r = 22 + k * 16; return '<g transform="translate(318 58)"><path class="sk-ring" style="--o:' + (1 + k * .45) + 's" d="M' + f(r * Math.cos(-.75)) + ' ' + f(r * Math.sin(-.75)) + 'A' + r + ' ' + r + ' 0 0 1 ' + f(r * Math.cos(.75)) + ' ' + f(r * Math.sin(.75)) + '" fill="none" stroke-width="5" stroke-linecap="round"/></g>'; }).join('')
        + '<g class="sk-notes">' + chip(352, 164, 'M-3 6a3 3 0 1 1 0 -.1V-7l8 -2v11', 1.7, 'chip2') + '</g>';
    } else {
      extra = [0, 1, 2].map((k) => '<g transform="translate(' + (64 + k * 0) + ' ' + (78 + k * 44) + ')"><rect x="-24" y="-13" width="48" height="26" rx="13" style="fill:var(--sk-tog-off)"/>'
        + '<rect class="sk-togon" style="--o:' + (1.0 + k * .55) + 's;fill:var(--sk-tube)" x="-24" y="-13" width="48" height="26" rx="13"/>'
        + '<g class="sk-knob" style="--o:' + (1.0 + k * .55) + 's"><circle cx="11" r="9.5" fill="#fff"/></g></g>').join('');
    }
    return svg('ad-spark', defs + ground + extra + char);
  }

  return { lens, press, spark, geometry: { LEAF, CIRC } };
})();
