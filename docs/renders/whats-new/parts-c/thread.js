/* "THREAD" — a proposed new illustration + motion language for Spixi (render only).
   One idea: Spixi has no server in the middle; a message goes along ONE direct line from you to them. So every
   drawing is made of that line. Rules:
   1 · ONE INK LINE (2.2 u, round caps/joins, the theme's ink) draws every object; the scene's thread enters at the
       left edge and leaves at the right edge at the SAME height (y 150), so scenes placed side by side join into
       one continuous line — swipe the spotlight and the thread runs across the seam.
   2 · TWO FLAT PLANES under the line, printed slightly OFF-REGISTER (+6 u right/down), like a two-colour riso
       print: a soft tint (p1) and one brand accent (p2). No gradients, no gloss, no shadows, no 3-D.
   3 · ONE SPARK: a small dot travels the thread every 5 s — the message on its way (the only loop).
   4 · Theme-native: ink, planes and ground are theme tokens, so one drawing serves light and dark.
   Motion: the line draws (0.9–1.2 s), the planes settle into their offset, small nodes pop, then it holds; the
   spark is the only thing that keeps moving. Reduced motion = the end frame, no spark.
   Static strings only; no user data. */
const TH_ART = (function () {
  'use strict';
  const f = (n) => Math.round(n * 10) / 10;
  const rr = (x, y, w, h, r) => 'M' + f(x + r) + ' ' + y + 'H' + f(x + w - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + w) + ' ' + f(y + r) + 'V' + f(y + h - r)
    + 'A' + r + ' ' + r + ' 0 0 1 ' + f(x + w - r) + ' ' + (y + h) + 'H' + f(x + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + x + ' ' + f(y + h - r) + 'V' + f(y + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + f(x + r) + ' ' + y + 'Z';
  const circ = (cx, cy, r) => 'M' + (cx - r) + ' ' + cy + 'a' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0a' + r + ' ' + r + ' 0 1 0 ' + -2 * r + ' 0Z';
  const L = (d, o, dur, extra) => '<path class="th-l th-draw" pathLength="1" d="' + d + '" style="--o:' + o + 's;--d:' + (dur || .7) + 's"' + (extra || '') + '/>';
  const Lon = (d, o, dur) => '<path class="th-l th-l--on th-draw" pathLength="1" d="' + d + '" style="--o:' + o + 's;--d:' + (dur || .5) + 's"/>';
  const A = (d, o, dur) => '<path class="th-l th-l--accent th-draw" pathLength="1" d="' + d + '" style="--o:' + o + 's;--d:' + (dur || .6) + 's"/>';
  const plane = (d, o, c, op) => '<path class="th-plane" d="' + d + '" fill="var(--th-' + (c || 'p1') + ')"' + (op ? ' opacity="' + op + '"' : '') + ' transform="translate(6 6)" style="--o:' + o + 's"/>';
  const mask = (d) => '<path d="' + d + '" fill="var(--th-ground)"/>';
  const pop = (cx, cy, inner, o) => '<g transform="translate(' + cx + ' ' + cy + ')"><g class="th-pop" style="--o:' + o + 's">' + inner + '</g></g>';
  /* glyphs drawn in the same line, centred on 0,0 (≈ 20 u) */
  const G = {
    reply: 'M-2 -8l-6 6 6 6M-8 -2h9a6 6 0 0 1 6 6v3',
    mic: rr(-4, -10, 8, 13, 4) + 'M-7 -1a7 7 0 0 0 14 0M0 6v4',
    photo: rr(-9, -7, 18, 14, 3) + 'M-9 4l5 -5 4 4 3 -3 6 6M4.5 -2.5h.01',
    eyeoff: 'M-9 0q9 -9 18 0q-9 9 -18 0M-8 -8l16 16M2.6 -.4a3 3 0 1 1 -3 -2.4',
    heart: 'M0 6C-11 -1 -6 -10 0 -4C6 -10 11 -1 0 6Z',
    pencil: 'M-6 6l1.6 -5.6 8.4 -8.4 4 4 -8.4 8.4ZM1.5 -5.5l4 4',
    check: 'M-6 0l4 4 8 -8',
    play: 'M-3 -6v12l9 -6Z',
    person: circ(0, -4, 5) + 'M-9 9a9 8 0 0 1 18 0',
    key: circ(-4, 0, 5) + 'M1 0h9M7 0v4M10 0v3',
  };
  const node = (cx, cy, r, g, o, c) => '<g>' + mask(circ(cx, cy, r)) + plane(circ(cx, cy, r), o + .35, c || 'p1')
    + L(circ(cx, cy, r), o, .5) + '<g transform="translate(' + cx + ' ' + cy + ')">' + L(G[g], o + .3, .5) + '</g></g>';
  /* the thread + its spark (the spark rides the visible part of the thread, every 5 s) */
  function thread(d, o) {
    const motion = d.replace(/^M-300 /, 'M-24 ').replace(/H700$/, 'H424');
    return L(d, o || 0, 1.15)
      + '<circle class="th-dot" r="4.2" fill="var(--th-dot)" opacity="0"><set attributeName="opacity" to="1" begin="2.2s"/>'
      + '<animateMotion dur="5s" begin="2.2s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keyPoints="0;1" keySplines=".45 0 .55 1" path="' + motion + '"/></circle>';
  }
  const svg = (vb, body, hero) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" class="wnL wnL--fg th' + (hero ? ' th--hero' : '') + '" aria-hidden="true" focusable="false">' + body + '</svg>';
  const ground = (hero) => '<div class="thg' + (hero ? ' thg--hero' : '') + '"></div>';

  /* ---------------- the six spotlight scenes (400 × 240; the thread is at y 150 on both edges) ---------------- */
  function hero() {
    const ph = rr(162, 34, 76, 152, 16);
    const wave = 'M176 152l4 -5 4 10 4 -13 4 15 4 -9 4 5 4 -3';
    const body = thread('M-300 150H28C58 150 66 96 96 96C126 96 138 116 162 116M238 116C262 116 274 96 304 96C334 96 342 150 372 150H700')
      + '<path class="th-l th-draw" pathLength="1" d="M200 186C200 202 160 204 128 204M200 186C200 202 240 204 272 204" style="--o:.8s;--d:.6s"/>'
      + mask(ph) + plane(ph, .7) + L(ph, .25, .9)
      + plane(rr(172, 104, 24, 24, 6), 1.1, 'p2') + plane(rr(200, 104, 24, 24, 6), 1.15, 'p2', .55)
      + L(rr(172, 56, 40, 13, 6.5), .7, .4) + L(rr(186, 77, 40, 13, 6.5), .8, .4) + L(rr(172, 104, 24, 24, 6), .9, .4) + L(rr(200, 104, 24, 24, 6), .95, .4)
      + L(wave, 1.05, .5) + L('M191 176H209', 1.1, .3)
      + node(96, 96, 22, 'reply', .5) + node(304, 96, 22, 'mic', .6) + node(106, 204, 20, 'photo', 1.0) + node(294, 204, 20, 'eyeoff', 1.1);
    return { bg: ground(true), fg: svg('0 0 400 240', body, true) };
  }
  function reply() {
    const rb = rr(64, 58, 150, 52, 18), sb = rr(176, 128, 184, 66, 18);
    const body = thread('M-300 150H18C40 150 46 84 64 84M214 84C246 84 262 108 262 128M360 160C380 160 384 150 400 150H700')
      + '<g class="wn-nudge" style="--o:1.25s">' + mask(rb) + plane(rb, .8) + L(rb, .2, .7) + L('M82 77H172M82 92H140', .6, .4) + '</g>'
      + mask(sb) + plane(sb, 1.0, 'p2') + L(sb, .55, .8)
      + Lon(rr(192, 142, 150, 20, 7), 1.2, .4) + Lon('M198 147V157', 1.3, .2) + Lon('M206 152H290', 1.35, .3)
      + Lon('M196 180H300', 1.45, .4) + Lon('M196 180H334', 2.2, .5)
      + pop(210, 112, mask(circ(0, 0, 14)) + '<path d="' + circ(0, 0, 14) + '" fill="var(--th-p2)"/>' + '<path class="th-l th-l--on" d="' + G.heart + '"/>', 1.7)
      + pop(360, 128, mask(circ(0, 0, 14)) + '<path d="' + circ(0, 0, 14) + '" class="th-l" fill="var(--th-ground)"/>' + '<path class="th-l" d="' + G.pencil + '" transform="scale(.8)"/>', 2.5);
    return { bg: ground(), fg: svg('0 0 400 240', body) };
  }
  function voice() {
    let w = 'M120 150';
    for (let x = 120; x < 300; x += 5) {
      const t = (x - 120) / 180, env = Math.sin(t * Math.PI) * (0.55 + 0.45 * Math.abs(Math.sin(x * .09)));
      const a = 34 * env * ((x / 5) % 2 ? 1 : -1);
      w += 'Q' + (x + 2.5) + ' ' + f(150 + a) + ' ' + (x + 5) + ' 150';
    }
    const pill = rr(110, 112, 204, 76, 38);
    const body = plane(pill, .5) + thread('M-300 150H58M102 150H120' + w.slice(8) + 'H318M362 150H700')
      + node(80, 150, 22, 'mic', .15) + node(340, 150, 22, 'play', 1.05);
    return { bg: ground(), fg: svg('0 0 400 240', body) };
  }
  function photos() {
    const back = rr(112, 74, 104, 80, 10), mid = rr(132, 82, 104, 80, 10), front = rr(150, 94, 110, 84, 10);
    const pin = 'M330 120C330 120 311 101 311 88a19 19 0 0 1 38 0C349 101 330 120 330 120Z';
    const body = thread('M-300 150H40C72 150 98 136 150 136M260 136C292 136 300 124 312 108M330 120C330 140 352 150 382 150H700')
      + '<g transform="rotate(-8 164 114)">' + mask(back) + L(back, .25, .5) + '</g>'
      + '<g transform="rotate(4 184 122)">' + mask(mid) + L(mid, .35, .5) + '</g>'
      + mask(front) + plane(front, .9) + L(front, .45, .6) + L('M160 166L188 132 208 152 224 138 250 166', .95, .5) + L(circ(234, 114, 7), 1.0, .3)
      + '<g class="th-dim" style="--o:2.4s">' + mask(pin) + plane(pin, 1.35, 'p1') + L(pin, 1.1, .5) + L(circ(330, 88, 6), 1.3, .3) + '</g>'
      + A('M310 66L352 112', 1.9, .4);
    return { bg: ground(), fg: svg('0 0 400 240', body) };
  }
  function privacy() {
    let sw = '';
    [100, 200, 300].forEach((cx, k) => {
      const tr = rr(cx - 28, 137, 56, 26, 13), o = .55 + k * .1, off = 1.4 + k * .45;
      sw += mask(tr) + '<g class="th-fadeout" style="--o:' + off + 's">' + plane(tr, o + .3, 'p2') + '</g>' + L(tr, o, .5)
        + '<g transform="translate(' + (cx + 14) + ' 150)"><g class="th-knob" style="--o:' + off + 's">' + pop(0, 0, mask(circ(0, 0, 8)) + '<path class="th-l" d="' + circ(0, 0, 8) + '"/>', o + .3) + '</g></g>';
    });
    const body = thread('M-300 150H700') + sw + L('M200 94V137', 2.6, .3) + pop(200, 72, mask(circ(0, 0, 22)) + '<path d="' + circ(0, 0, 22) + '" fill="var(--th-p1)" transform="translate(5 5)"/><path class="th-l" d="' + circ(0, 0, 22) + '"/><path class="th-l" d="' + G.eyeoff + '"/>', 2.75);
    return { bg: ground(), fg: svg('0 0 400 240', body) };
  }
  function apps() {
    const tiles = [[150, 94], [204, 94], [150, 160], [204, 160]];
    const tl = tiles.map(([x, y], k) => pop(x + 23, y + 23, mask(rr(-23, -23, 46, 46, 13)) + '<path d="' + rr(-23, -23, 46, 46, 13) + '" fill="var(--th-' + (k === 1 ? 'p2' : 'p1') + ')" transform="translate(5 5)"/><path class="th-l" d="' + rr(-23, -23, 46, 46, 13) + '"/>'
      + (k === 1 ? '<path class="th-l th-l--on" d="' + G.play + '" transform="translate(5 5)"/>' : k === 0 ? '<path class="th-l" d="M-8 0h16M0 -8v16"/>' : k === 2 ? '<path class="th-l" d="' + circ(0, 0, 8) + '"/>' : '<path class="th-l" d="M-8 -6h16M-8 0h10M-8 6h6"/>'), .7 + k * .14)).join('');
    const body = thread('M-300 150H40M84 150H316M360 150H700') + tl
      + node(62, 150, 22, 'person', .2) + node(338, 150, 22, 'person', .35)
      + L('M338 104V128', 1.6, .2) + pop(338, 92, mask(circ(0, 0, 13)) + '<path d="' + circ(0, 0, 13) + '" fill="var(--th-p2)"/><path class="th-l th-l--on" d="' + G.check + '"/>', 1.75);
    return { bg: ground(), fg: svg('0 0 400 240', body) };
  }

  /* ---------------- the same language on existing slots (240 × 240) ---------------- */
  function p2p() {
    const a = rr(30, 86, 54, 96, 12), b = rr(156, 86, 54, 96, 12);
    const cloud = 'M92 62a14 14 0 0 1 26 -8a18 18 0 0 1 32 8a12 12 0 0 1 -2 24H96a12 12 0 0 1 -4 -24Z';
    return svg('0 0 240 240', '<path class="th-l th-l--dash th-fadein" d="' + cloud + '" style="--o:.9s"/>' + A('M96 46L148 96', 1.5, .3)
      + thread('M-300 150H30M84 150H156M210 150H700') + mask(a) + plane(a, .6) + L(a, .1, .6) + mask(b) + plane(b, .7) + L(b, .3, .6)
      + L('M48 108H66M48 120H60M174 108H192M174 120H186', .7, .3));
  }
  function chatsEmpty() {
    const b1 = rr(36, 96, 76, 44, 16), b2 = rr(128, 128, 76, 44, 16);
    return svg('0 0 240 240', thread('M-300 150H20C30 150 30 118 36 118M204 150C214 150 222 150 230 150H700') + mask(b1) + plane(b1, .6, 'p2') + L(b1, .2, .5)
      + mask(b2) + L(b2, .4, .5) + L('M112 118C124 118 124 150 128 150', .6, .3) + L('M52 118h.01M66 118h.01M80 118h.01', .9, .2)
      + '<g class="th-dots">' + L('M144 150h.01M158 150h.01M172 150h.01', 1.1, .2) + '</g>');
  }
  function backup() {
    const shield = 'M120 50L172 68V116C172 150 148 172 120 186C92 172 68 150 68 116V68Z', file = rr(98, 86, 44, 56, 8);
    return svg('0 0 240 240', thread('M-300 150H52C60 150 68 140 68 128M172 128C172 140 180 150 188 150H700') + mask(shield) + plane(shield, .7) + L(shield, .1, .9)
      + mask(file) + plane(file, 1.0, 'p2') + L(file, .6, .5) + Lon('M112 108H136M112 120H130', 1.3, .3) + node(120, 154, 14, 'key', 1.2));
  }

  const SCENES = { hero, reply, voice, photos, privacy, apps };
  const SLOTS = { p2p, chatsEmpty, backup };
  return { scene: (n) => SCENES[n](), slot: (n) => SLOTS[n]() };
})();
