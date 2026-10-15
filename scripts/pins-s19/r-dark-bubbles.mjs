/* ==== S19 F10 (#1371, Damir S18 walk: "the dark received bubble disappears on the coloured canvases") ====
 * ★★ RE-BASED to S19 OPTION B (Damir pick, render "Dark Bubble Options", 2026-10-12: "received bubbles darker, more saturated?
 * … the canvases slightly darker in dark mode"). Was option A (F10: canvas mid + 12 % white; Aurora / Dusk / Ocean L × 0.9 C × 0.9).
 * On the BUILT chat.html (jsdom), DARK theme, every canvas set on the live root (the head script's attribute), the tokens read
 * as the document COMPUTES them; contrast computed (WCAG 2.x), never restated.
 *   · each of the 7 canvases has its OWN received bubble, LIGHTER than every stop of the ground the chat PAINTS (its
 *     --gradient-chat; Mist = its own single stop #07090B, no longer the canvas-base) and ≥ 1.25 : 1 against each (B measured
 *     1.25–1.49; A was ≥ 1.2); the bubble text ≥ 7 : 1, the meta and link inks ≥ 4.5 : 1;
 *   · the reply quote inside it is one step DARKER (1.2 ≤ r < 1.3; B = 1.25 everywhere); the quote text and the 12 identity-hue
 *     quote labels ≥ 4.5;
 *   · the 12 identity-hue sender NAMES (group chats) ≥ 4.5 : 1 on every canvas bubble (and the no-hue fallback);
 *   · the composer pill stays NEUTRAL — ink-750 #1E2023 on every canvas (#46 S19 M1 re-base; was "follows the bubble", #1166);
 *     the played voice-note disc is the in-bubble quote step;
 *   · OPTION B (replaces F10's "tamed" clause): on all 7 canvases every ground stop is DARKER than its option-A value, and the
 *     bubble is DARKER and MORE SATURATED (OKLCH chroma) than its option-A bubble;
 *   · PATTERN: the dark pattern (the canvas ink at the computed --chat-pattern-alpha-1) keeps A's visibility on the deeper grounds —
 *     per canvas the mean ink-over-stop excess contrast (WCAG ratio − 1) is 0.97–1.15 × option A's (A's stops at 0.0832); B at
 *     0.0932 measures 1.005 (Iris) – 1.047 (Aurora), B at the old 0.0832 0.854 (Mist) – 0.90 (Ocean);
 *   · outside a canvas the dark bubble stays ink-750 #1E2023; LIGHT is unchanged (#ffffff on every canvas);
 *   · the settings tiles inherit nothing: under a dark Aurora root a Mist tile and an Iris tile keep their own bubble;
 *   · ★ #46 S19 M3: the file card's progress TRACK — on a RECEIVED card it reads --surface-bubble-received-quote and is
 *     ≥ 1.15 : 1 on its canvas bubble (all 7 dark canvases); on a SENT card (--surface-card-sent) it keeps neutral-04.
 * ★ re-based by S20 R (#1403, Damir 19:54): the dark bubbles moved to the S19 B bubble at OKLCH C × 0.85, L + 0.015 and the quotes
 *   were re-derived (values + numbers in tokens.css and pins-s20/r-dark-grounds); this pin holds RELATIONS, not values — every
 *   clause still holds on the S20 values (bubble vs stop 1.35–1.65, quote 1.25–1.26, still darker + more saturated than A).
 * ★ re-based by S20G N-1 (Damir 21:50 "even darker still, still too close to outgoing"): the bubbles moved OKLCH L −0.06 (Mist −0.04),
 *   so the bubble-vs-stop floor drops 1.25 → 1.15 (measured 1.158–1.32; r1 NIT: 1.10 → 1.15, just under the measured min); every other
 *   relation still holds (Mist's quote lands on #000, 1.24).
 * Deliberate breaks (S19 F10 report): the Ocean rule's bubble line deleted (canvas fails: Ocean falls back to #1E2023, darker
 * than its light stop) · hue 0's dark name lightness back to 60 % (names fails) · the dark quote rule back to
 * --surface-neutral-04 (quote fails) · the dark played voice disc back to --neutral-500 (voice fails) · #46 S19 M3: the track
 * rule unscoped again (`[data-theme="dark"] .c-fbubble__track` → the quote token for both directions) → track fails on `sent`;
 * the received-scoped rule deleted → track fails on the canvases where neutral-04 sits under 1.15 : 1.
 * Option B breaks (S19 B report): the Aurora ground back to A #072F2B / #0C2354 / #201358 → optionB fails (Aurora stops not
 * darker) · the Mist bubble back to A #292B2D → optionB fails (Mist bubble not darker) · the dark alpha back to 0.0832 →
 * pattern fails on every canvas · the Iris bubble at A's #312F52 on the B ground → optionB fails · the Mist root ground rule's
 * --gradient-chat dropped (ground falls back to #0C0E10) → canvas fails (Mist 1.22 < 1.25) + optionB + pattern (Mist 1.169 > 1.15). */
export default async function (h) {
  const { ok, root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const f = join(root, 'Spixi/Resources/Raw/html', 'chat.html');
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
  const dom = new JSDOM(readFileSync(f, 'utf8').replace("var n='*SL{SpixiThemeName}'", "var n='dark'"), {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f + '?mobile=1', virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.Element.prototype.scrollIntoView = function () {};
    },
  });
  await sleep(1200);
  const W = dom.window, d = W.document, el = d.documentElement;
  const norm = (v) => String(v || '').replace(/\s+/g, ' ').trim();
  const resolveOn = (node, name, depth = 0) => {
    const v = norm(W.getComputedStyle(node).getPropertyValue(name));
    const m = /^var\((--[\w-]+)(?:, *(.*))?\)$/.exec(v);
    return m && depth < 8 ? (resolveOn(node, m[1], depth + 1) || m[2] || '') : v;
  };
  const resolve = (name) => resolveOn(el, name);
  const hex = (v) => { const m = /^#([0-9a-f]{6})$/i.exec(v || ''); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; };
  const lum = (c) => { const g = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * g(c[0]) + 0.7152 * g(c[1]) + 0.0722 * g(c[2]); };
  const cr = (a, b) => { const [p, q] = [lum(a), lum(b)].sort((u, v) => v - u); return (p + 0.05) / (q + 0.05); };
  const hsl = (h0, s, l) => { s /= 100; l /= 100; const k = (n) => (n + h0 / 30) % 12, a = s * Math.min(l, 1 - l); const fn = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))))); return [fn(0), fn(8), fn(4)]; };
  const okC = (c) => { const g = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; const [R, G, B] = c.map(g);
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s3 = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s3, b = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s3; return Math.hypot(a, b); };
  const over = (g, i, a) => g.map((x, k) => Math.round(x * (1 - a) + i[k] * a));
  const stops = (g) => (String(g).match(/#[0-9a-f]{6}/gi) || []);
  const r2 = (x) => Math.round(x * 100) / 100;
  const GROUNDS = { flat: 'Mist', gradient: 'Iris', green: 'Meadow', blue: 'Spixi', aurora: 'Aurora', dusk: 'Dusk', ocean: 'Ocean' };
  /* option A (the S19 F10 build Damir compared against) — the reference B must deepen, and whose pattern visibility B keeps */
  const A = {
    flat: { stops: ['#0C0E10'], bubble: '#292B2D' },
    gradient: { stops: ['#1C1645', '#0D1030'], bubble: '#312F52' },
    green: { stops: ['#0F2C23', '#0B1A16'], bubble: '#2A3D38' },
    blue: { stops: ['#0F2349', '#0A1430'], bubble: '#2A3754' },
    aurora: { stops: ['#072F2B', '#0C2354', '#201358'], bubble: '#2E3C5E' },
    dusk: { stops: ['#321933', '#161028'], bubble: '#3E3147' },
    ocean: { stops: ['#08313F', '#081831'], bubble: '#263F50' },
  };
  const A_ALPHA = 0.0832;
  const r = {}, table = {};
  const fail = { canvas: [], quote: [], names: [], optionB: [], pattern: [], pill: [], voice: [], track: [] };
  try {
    const hues = W.Spixi && W.Spixi.IDENTITY_HUES;
    /* a received row with a sender + a quote, for the per-hue label lightness the shipped CSS gives */
    const row = d.createElement('div'); row.className = 'c-bubble-row'; row.dataset.direction = 'received';
    const bub = d.createElement('div'); bub.className = 'c-bubble';
    const sender = d.createElement('span'); sender.className = 'c-bubble__sender';
    const quote = d.createElement('button'); quote.className = 'c-bubble__reply';
    const who = d.createElement('span'); who.className = 'c-voice__who';
    const badge = d.createElement('span'); badge.className = 'c-voice__badge'; who.append(badge);
    bub.append(sender, quote, who); row.append(bub); (d.getElementById('messages') || d.body).append(row);
    /* ★ #46 S19 M3: a received and a sent file card, each with its progress track */
    const card = (dir) => { const rw = d.createElement('div'); rw.className = 'c-bubble-row'; rw.dataset.direction = dir; const fb = d.createElement('div'); fb.className = 'c-fbubble'; const tr = d.createElement('div'); tr.className = 'c-fbubble__track'; fb.append(tr); rw.append(fb); (d.getElementById('messages') || d.body).append(rw); return tr; };
    const trackR = card('received'), trackS = card('sent');
    const bgRaw = (node) => norm(W.getComputedStyle(node).getPropertyValue('background') || W.getComputedStyle(node).getPropertyValue('background-color'));
    el.setAttribute('data-theme', 'dark');
    for (const [g, name] of Object.entries(GROUNDS)) {
      el.setAttribute('data-chat-ground', g);
      const b = hex(resolve('--surface-bubble-received'));
      const ground = stops(resolve('--gradient-chat'));   // ★ S19 option B RE-BASE: Mist's ground is its own --gradient-chat #07090B (was the canvas-base #0C0E10)
      const gs = ground.map(hex);
      const text = hex(resolve('--text-bubble-received')), meta = hex(resolve('--text-bubble-received-meta')), link = hex(resolve('--text-link'));
      const fillOf = (node) => { const bc = norm(resolveOn(node, 'background-color')); if (/^#/.test(bc)) return hex(bc); const v = norm(W.getComputedStyle(node).getPropertyValue('background')); const m = /var\((--[\w-]+)\)/.exec(v); return hex(m ? resolve(m[1]) : v); };
      const qFill = fillOf(quote);
      const vFill = fillOf(badge);
      const qText = hex(resolve('--text-neutral-02'));
      const t = { bubble: resolve('--surface-bubble-received'), stops: ground, vsStops: [], text: 0, meta: 0, link: 0 };
      if (!b || !gs.length || gs.some((x) => !x) || !text || !meta || !link || !qFill || !qText) { fail.canvas.push(name + ':unresolved'); table[name] = t; continue; }
      t.vsStops = gs.map((x) => r2(cr(b, x)));
      t.lighter = gs.every((x) => lum(b) > lum(x));
      t.text = r2(cr(text, b)); t.meta = r2(cr(meta, b)); t.link = r2(cr(link, b));
      if (!t.lighter || gs.some((x) => cr(b, x) < 1.15) || t.text < 7 || t.meta < 4.5 || t.link < 4.5) fail.canvas.push(name);   // ★ S20G N-1 re-base: ≥ 1.15 (r1 NIT; was 1.10) (the bubbles moved OKLCH L −0.06 / Mist −0.04 toward the ground; measured 1.16–1.32). Was ≥ 1.25 (S19 option B; A was ≥ 1.2 rounded)
      t.quote = r2(cr(qFill, b)); t.quoteText = r2(cr(qText, qFill));
      const qLow = [];
      for (let i = 0; i < 12; i++) { quote.setAttribute('data-idhue', String(i)); const l = parseFloat(W.getComputedStyle(quote).getPropertyValue('--reply-label-l')); if (!(cr(hsl(hues[i], 70, l), qFill) >= 4.5)) qLow.push(i); }
      quote.removeAttribute('data-idhue');
      if (!(lum(qFill) < lum(b) && cr(qFill, b) >= 1.2 && cr(qFill, b) < 1.3 && t.quoteText >= 4.5 && qLow.length === 0)) fail.quote.push(name + JSON.stringify({ q: t.quote, qLow }));   // ★ S19 option B: 1.2–1.3 (was 1.19–1.3)
      const nLow = [];
      for (let i = 0; i < 12; i++) { sender.setAttribute('data-idhue', String(i)); const l = parseFloat(W.getComputedStyle(sender).getPropertyValue('--sender-label-l')); const c = cr(hsl(hues[i], 70, l), b); if (!(c >= 4.5)) nLow.push(i + ':' + r2(c)); }
      sender.removeAttribute('data-idhue');
      const s0 = parseFloat(W.getComputedStyle(sender).getPropertyValue('--sender-label-s')), l0 = parseFloat(W.getComputedStyle(sender).getPropertyValue('--sender-label-l'));
      for (let hh = 0; hh < 360; hh += 6) if (!(cr(hsl(hh, s0, l0), b) >= 4.5)) { nLow.push('fallback@' + hh); break; }
      if (nLow.length) fail.names.push(name + JSON.stringify(nLow));
      t.pill = resolve('--surface-composer-pill');
      if (t.pill.toUpperCase() !== '#1E2023') fail.pill.push(name + ':' + t.pill);   // ★ #46 S19 M1: neutral, never the canvas bubble
      const tR = fillOf(trackR);
      t.track = tR ? r2(cr(tR, b)) : 0;
      if (!(/var\(--surface-bubble-received-quote\)/.test(bgRaw(trackR)) && tR && t.track >= 1.15)) fail.track.push(name + ':received:' + t.track);
      if (!(/^var\(--surface-neutral-04\)$/.test(bgRaw(trackS)) && hex(resolveOn(trackS, '--surface-neutral-04')))) fail.track.push(name + ':sent:' + bgRaw(trackS));
      t.voice = vFill ? r2(cr(vFill, b)) : 0;
      if (!(vFill && t.voice >= 1.19 && r2(cr(meta, vFill)) >= 4.5)) fail.voice.push(name + ':' + t.voice);
      /* ★ S19 option B: every stop darker than A's, the bubble darker AND more saturated than A's */
      const wasStops = A[g].stops.map(hex), wasB = hex(A[g].bubble);
      t.bubbleC = Math.round(okC(b) * 10000) / 10000; t.bubbleCWas = Math.round(okC(wasB) * 10000) / 10000;
      if (gs.length !== wasStops.length || gs.some((x, i) => !(lum(x) < lum(wasStops[i]))) || !(lum(b) < lum(wasB)) || !(okC(b) > okC(wasB))) fail.optionB.push(name + JSON.stringify({ ground, bubble: t.bubble, C: [t.bubbleCWas, t.bubbleC] }));
      /* ★ S19 option B: the pattern keeps A's visibility — mean (ink-over-stop contrast − 1), B at the computed alpha vs A at 0.0832 */
      const alpha = parseFloat(W.getComputedStyle(el).getPropertyValue('--chat-pattern-alpha-1')), ink = hex(resolve('--chat-pattern-ink'));
      const excess = (ss, a) => ss.reduce((acc, x) => acc + cr(over(x, ink, a), x) - 1, 0) / ss.length;
      t.alpha = alpha;
      t.patternVsA = ink && alpha > 0 ? Math.round(excess(gs, alpha) / excess(wasStops, A_ALPHA) * 1000) / 1000 : 0;
      if (!(t.patternVsA >= 0.97 && t.patternVsA <= 1.15)) fail.pattern.push(name + ':' + t.patternVsA + '@' + alpha);
      table[name] = t;
    }
    r.canvas = Object.keys(table).length === 7 && fail.canvas.length === 0 && new Set(Object.values(table).map((t) => t.bubble)).size === 7;
    r.quote = fail.quote.length === 0;
    r.names = fail.names.length === 0;
    r.pill = fail.pill.length === 0;
    r.voice = fail.voice.length === 0;
    r.optionB = fail.optionB.length === 0;
    r.pattern = fail.pattern.length === 0;
    r.track = fail.track.length === 0;
    /* outside a canvas · light · the tiles */
    el.removeAttribute('data-chat-ground');
    r.outside = resolve('--surface-bubble-received').toUpperCase() === '#1E2023';
    el.setAttribute('data-theme', 'light');
    const light = Object.keys(GROUNDS).map((g) => { el.setAttribute('data-chat-ground', g); return resolve('--surface-bubble-received').toLowerCase(); });
    r.lightSame = light.every((v) => v === '#ffffff');
    el.setAttribute('data-theme', 'dark'); el.setAttribute('data-chat-ground', 'aurora');
    const tile = (g) => { const t = d.createElement('div'); t.setAttribute('data-chat-ground', g); d.body.append(t); return t; };
    const tMist = tile('flat'), tIris = tile('gradient');
    r.tiles = resolveOn(tMist, '--surface-bubble-received') === table.Mist.bubble && resolveOn(tIris, '--surface-bubble-received') === table.Iris.bubble
      && resolve('--surface-bubble-received') === table.Aurora.bubble;
    r.noErr = errs.length === 0;
  } catch (e) { r.threw = e.message; }
  finally { try { W.close(); } catch (e) { /* */ } }
  const c = (k, m, extra) => ok(r[k] === true, m + ' — ' + JSON.stringify(r[k] === true ? (extra || { [k]: true }) : { [k]: r[k], threw: r.threw, fail, table }));
  c('canvas', '★ S19 F10 (#1371) → option B (re-based): DARK — each of the 7 canvases has its OWN received bubble, lighter than every stop of its painted ground (Mist #040607) and ≥ 1.15 : 1 against each (S20G N-1; was ≥ 1.25, ≥ 1.2); text ≥ 7, meta + link ≥ 4.5 (computed)', { table: Object.fromEntries(Object.entries(table).map(([k, t]) => [k, [t.bubble, t.vsStops, t.text]])) });
  c('quote', '★ S19 F10 → option B: the reply quote is one step DARKER than each canvas bubble (1.2 ≤ r < 1.3; B = 1.25); its text and all 12 identity-hue quote labels ≥ 4.5 : 1', { quote: Object.fromEntries(Object.entries(table).map(([k, t]) => [k, t.quote])) });
  c('names', '★ S19 F10: the 12 identity-hue sender names (and the no-hue fallback) hold ≥ 4.5 : 1 on every dark canvas bubble');
  c('pill', '★ S19 F10 → #46 S19 M1 (re-based): the dark composer pill stays NEUTRAL — ink-750 #1E2023 on all 7 canvases, not the canvas bubble (was "follows the bubble", #1166)');
  c('voice', '★ S19 F10: the played voice-note disc reads on every canvas bubble (≥ 1.19 : 1, the in-bubble quote step) and its glyph (the meta ink) ≥ 4.5 : 1 on it');
  c('optionB', '★ S19 option B (Damir pick, "Dark Bubble Options"; replaces F10\'s Aurora / Dusk / Ocean "tamed" clause): on all 7 dark canvases every ground stop is DARKER than option A\'s, and the received bubble is DARKER and MORE SATURATED (OKLCH chroma) than A\'s', { C: Object.fromEntries(Object.entries(table).map(([k, t]) => [k, [t.bubbleCWas, t.bubbleC]])) });
  c('pattern', '★ S19 option B: the dark pattern keeps A\'s visibility on the deeper grounds — per canvas the mean ink-over-stop excess contrast at the computed alpha is 0.97–1.15 × A\'s (A\'s stops at 0.0832)', { pattern: Object.fromEntries(Object.entries(table).map(([k, t]) => [k, [t.alpha, t.patternVsA]])) });
  c('track', '★ #46 S19 M3: the file card track — RECEIVED reads --surface-bubble-received-quote and holds ≥ 1.15 : 1 on its bubble on all 7 dark canvases; SENT keeps --surface-neutral-04 (the sent card is --surface-card-sent, not the received bubble)', { track: Object.fromEntries(Object.entries(table).map(([k, t]) => [k, t.track])) });
  c('outside', '★ S19 F10: outside a canvas the dark received bubble is still ink-750 #1E2023');
  c('lightSame', '★ S19 F10: LIGHT unchanged — #ffffff on every canvas');
  c('tiles', '★ S19 F10: the settings tiles inherit nothing — under a dark Aurora root the Mist and Iris tiles keep their own bubble');
  c('noErr', '★ S19 F10: no page error');
}
