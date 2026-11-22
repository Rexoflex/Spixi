/* ==== photo1b · #1644 — THE CHAT-BACKGROUND TOKENS (Damir's picks: Iris C1/C1 · Spixi C1/C2 · Meadow, Aurora, Dusk, Ocean C2/C2 ·
 *      Mist light TODAY · dark Mist = Calmer 2 + the ground back at #0C0E10) + the ring of light Aurora ====
 * On the BUILT chat.html (jsdom, tokens read as the document COMPUTES them — the cascade decides, not a source regex) and on the BUILT
 * `spixi.tokens.css` (comment-stripped; which BLOCK holds a value). Contrast / OKLab computed here, never restated.
 *   (1) PICKED  — for every canvas × theme the exact picked string of the proposal (claude/chat-backgrounds-proposal-2026-11-17.md, copied into
 *       docs/photo1b-tokens.md): --gradient-chat, --chat-pattern-ink, --surface-bubble-sent, --gradient-bubble-sent, --surface-card-sent,
 *       --outline-card-sent(-selected), --surface-select-row-gap (+ the dark --surface-bubble-received / -quote), and the pattern alpha on the
 *       phone (:root) and on the DESKTOP (:root[data-desktop]) = 0.8 × phone;
 *   (2) BLOCK   — dark Mist's picks sit in the dark Mist rules (`[data-chat-ground='flat']`), NEVER in the shared dark defaults: the dark block
 *       still holds ink #C6CFFD · sent #1a4a96 · card #19253B · alpha 0.101, and so does an element outside any canvas (the dark defaults
 *       other surfaces share; Iris has its own ink, alpha and sent, and no tile reset exists since fix round 1); the Mist ROOT rule and the Mist descendant (tile) rule agree on the ground, sent and card;
 *   (3) MIST    — dark Mist ground #0C0E10 (= --chat-canvas-base); bubble : ground 1.35 ± 0.01 (the smallest 8-bit value ≥ 1.35 on the hue of
 *       #1A1D1F: #272B2D) and quote : bubble 1.25 ± 0.01 (the S19 rule recomputed here, ± 1 per channel); light Mist = TODAY (ground = canvas base,
 *       ink #2A3140, sent #2160c2, card #EAF0FC, gap none, alpha 0.1024 / 0.08192); the DEFAULT appearance unchanged (no stored key = Mist + contours,
 *       no data-chat-sent);
 *   (4) FLOORS  — on every changed cell: F1 message text ≥ 4.5 (dark ≥ 7); F2 white (#f9fafb as painted) on the Auto sent ≥ 4.6; F3 dark received bubble
 *       ≥ 1.15 off every ground stop; F4 dark meta ≥ 4.5 full ink AND as painted at 0.7; F4c quote 1.2 ≤ q < 1.3; F5 the sent meta ink ≥ 4.5; F6 sent
 *       ticks at 0.7 ≥ 3 : 1 or not lower than the old value of the same cell; F7 the select ring on its gap ≥ 3 (light Aurora ≥ 3 now);
 *   (5) RING    — light Aurora --outline-select-ring on the Calmer 2 gap #6EA2D5 ≥ 3.0 : 1 (measured 3.024: NOT re-set, #2B47A9 held) and darker-or-equal
 *       same hue as primary-600; the sent PICK colours ([data-chat-sent=…]) and the names / count / order of the appearances are untouched.
 *   (7) TILE    — (fix round 1, O2-1) an element with its OWN data-chat-ground (the Settings preview, the canvas dots, the Background swatches) computes the same pattern
 *       ink, pattern alpha, ground, Auto sent and sent card as a chat ROOT on that ground — 7 canvases × light / dark × phone (:root) / desktop (:root[data-desktop]) ×
 *       a plain root and every other canvas as the root (the S17 light tile resets, now narrowed to Mist's alpha and the tile-max, and the removed dark ink reset must not win over a pick; the Mist tile's select gap, which no preview paints, is not compared).
 * LIMITS (#1735; key 7 added in fix round 1): jsdom resolves the cascade but paints nothing — contrast is computed from the tokens, the picture is the render script
 *   (scripts/pins-photo1b/render-grounds.mjs, by hand). The expected strings are the proposal's, retyped here; the pin proves the build holds them,
 *   not that Damir's picks are good. The old values for F6 are retyped from the S20 build. A canvas rule that is MISSING falls back to the shared
 *   default and is caught only because the default differs from the pick.
 * Deliberate breaks (#802; one token in a full temp copy + build-shells; written in the photo1b report): see the end of the file. */
import { JSDOM, VirtualConsole } from 'jsdom';
export default async function (h) {
  const { ok, root, readFileSync, join, sleep, stripCssComments } = h;
  const f = join(root, 'Spixi/Resources/Raw/html', 'chat.html');
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
  const boot = async (theme) => {
    const dom = new JSDOM(readFileSync(f, 'utf8').replace("var n='*SL{SpixiThemeName}'", "var n='" + theme + "'"), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f + '?mobile=1', virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) { /* */ }
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.Element.prototype.scrollIntoView = function () {};
      },
    });
    await sleep(1200);
    return dom;
  };
  const CB = ', var(--chat-canvas-base)';
  const lg = (a, st) => 'linear-gradient(' + a + 'deg, ' + st.join(', ') + ')' + CB;
  const rg = (c, al) => 'rgba(' + c.join(', ') + ', ' + al + ')';
  /* ---- THE PICKED STRINGS (proposal; Calmer 1 = c1, Calmer 2 = c2). light/dark: grad, ink, sent, card, o (rgb of the outline), gap, [bubble, quote], alpha phone ---- */
  const P = {
    gradient: {
      light: { grad: lg(180, ['#CDD0E8 0%', '#D0CAE7 50%', '#D4C4E6 100%']), ink: '#3A3160', sent: '#604DC5', card: '#EFEDF9', o: [96, 77, 197], gap: '#B6B6E0', a: '0.09216', ad: '0.073728' },
      dark: { grad: lg(160, ['#0E072E 0%', '#05051E 100%']), ink: '#C8D0F7', sent: '#4A3AA8', card: '#252140', o: [155, 147, 207], gap: '#212756', bub: '#1D1C49', quo: '#07061B', a: '0.0909', ad: '0.07272' },
    },
    blue: {
      light: { grad: lg(180, ['#CCDDEE 0%', '#C7D6ED 50%', '#C4CFE9 100%']), ink: '#233B60', sent: '#3653AE', card: '#EBEEF7', o: [54, 83, 174], gap: '#AFC1E5', a: '0.09216', ad: '0.073728' },
      dark: { grad: lg(160, ['#07132B 0%', '#04091A 100%']), ink: '#C9DCF1', sent: '#374D8A', card: '#212638', o: [145, 157, 191], gap: '#1E2D53', bub: '#13213F', quo: '#040817', a: '0.0808', ad: '0.06464' },
    },
    green: {
      light: { grad: lg(160, ['#DAE9CF 0%', '#D6EABA 45%', '#D4E6C8 100%']), ink: '#3A572F', sent: '#3A755B', card: '#EBF1EF', o: [58, 117, 91], gap: '#BBD1BA', a: '0.08192', ad: '0.065536' },
      dark: { grad: lg(160, ['#071913 0%', '#040C0A 100%']), ink: '#C8E4D0', sent: '#2E5C45', card: '#1E2A27', o: [140, 165, 153], gap: '#1E3143', bub: '#142721', quo: '#050E0A', a: '0.0808', ad: '0.06464' },
    },
    aurora: {
      light: { grad: lg(150, ['#99DAC6 0%', '#7AB2DA 48%', '#8F88D7 100%']), ink: '#FFFFFF', sent: '#316366', card: '#EAEFF0', o: [49, 99, 102], gap: '#6EA2D5', a: '0.1536', ad: '0.12288', ring: '#2B47A9' },
      dark: { grad: lg(150, ['#081A17 0%', '#051332 52%', '#110A33 100%']), ink: '#FFFFFF', sent: '#2F5F64', card: '#1F2B2F', o: [141, 167, 170], gap: '#1E315F', bub: '#152546', quo: '#071023', a: '0.0808', ad: '0.06464' },
    },
    dusk: {
      light: { grad: lg(160, ['#F7DCCD 0%', '#E4CEF3 100%']), ink: '#70475C', sent: '#B74C7A', card: '#F8EDF2', o: [183, 76, 122], gap: '#CFC0DA', a: '0.08192', ad: '0.065536' },
      dark: { grad: lg(160, ['#1D0C1D 0%', '#0A0716 100%']), ink: '#F5CFE1', sent: '#943E63', card: '#38222F', o: [196, 149, 169], gap: '#292A4C', bub: '#2B1D34', quo: '#0E0813', a: '0.0808', ad: '0.06464' },
    },
    ocean: {
      light: { grad: lg(160, ['#CAECF7 0%', '#CDD7F3 100%']), ink: '#2C5566', sent: '#3E7897', card: '#ECF2F5', o: [62, 120, 151], gap: '#B3CAEC', a: '0.08192', ad: '0.065536' },
      dark: { grad: lg(160, ['#091B23 0%', '#040C1C 100%']), ink: '#B9E8F5', sent: '#3B708C', card: '#222F39', o: [147, 176, 192], gap: '#1F3251', bub: '#122A3B', quo: '#071520', a: '0.0808', ad: '0.06464' },
    },
    /* dark Mist: ground #0C0E10; bubble / quote computed below (1.35 / 1.25), the picked strings of the proposal for the rest */
    flat: { dark: { grad: '#0C0E10', ink: '#C9D0F0', sent: '#2D4D81', card: '#1E2636', o: [118, 157, 255], bub: '#272B2D', quo: '#151819', a: '0.0808', ad: '0.06464' } },
  };
  /* the S20 build's Auto sent colours (F6: "not lower than today") */
  const OLD_SENT = { gradient: ['#6145D6', '#4B31B7'], blue: ['#3050BD', '#2D48A3'], green: ['#0E7A55', '#11603F'], aurora: ['#07666B', '#08626A'], dusk: ['#D02B7D', '#A62264'], ocean: ['#0D7AA7', '#13729A'], flat: ['#2160C2', '#1A4A96'] };
  const OLD_RING_GAP = '#57A4E6';
  const norm = (v) => String(v || '').replace(/\s+/g, '').toLowerCase();
  const hex = (v) => { const m = /^#([0-9a-f]{6})$/i.exec(String(v || '').trim()); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; };
  const lin = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  const gam = (x) => 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const cr = (a, b) => { const [p, q] = [lum(a), lum(b)].sort((u, v) => v - u); return (p + 0.05) / (q + 0.05); };
  const toLab = (c) => { const [R, G, B] = c.map(lin);
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s3 = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s3, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s3, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s3]; };
  const fromLab = ([L, a, b]) => { const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s3 = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s3, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s3, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s3].map(gam).map((x) => Math.max(0, Math.min(255, Math.round(x)))); };
  /* the S19 quote rule (as pins-s20g/c-n1): scale the bubble's OKLab (L, a, b) by one k until the quote is 1.25 : 1 darker */
  const quoteRule = (b) => { const lab = toLab(b); let lo = 0, hi = 1; for (let i = 0; i < 60; i++) { const k = (lo + hi) / 2; if (cr(fromLab(lab.map((x) => x * k)), b) > 1.25) lo = k; else hi = k; } return fromLab(lab.map((x) => x * (lo + hi) / 2)); };
  const r2 = (x) => Math.round(x * 1000) / 1000;
  const over = (b, i, a) => b.map((x, k) => Math.round(x * (1 - a) + i[k] * a));
  const bad = { picked: [], block: [], mist: [], floors: [], ring: [], tile: [], other: [] };
  const table = {};
  const darkDom = await boot('dark');
  const lightDom = await boot('light');
  try {
    for (const [theme, dom] of [['light', lightDom], ['dark', darkDom]]) {
      const W = dom.window, el = W.document.documentElement;
      const get = (n) => norm(W.getComputedStyle(el).getPropertyValue(n));
      const resolve = (n, d0 = 0) => { const v = String(W.getComputedStyle(el).getPropertyValue(n)).replace(/\s+/g, ' ').trim(); const m = /^var\((--[\w-]+)(?:, *(.*))?\)$/.exec(v); return m && d0 < 8 ? (resolve(m[1], d0 + 1) || m[2] || '') : v; };
      el.setAttribute('data-theme', theme);
      for (const g of Object.keys(P)) {
        const c = P[g][theme]; if (!c) continue;
        el.removeAttribute('data-desktop');
        el.setAttribute('data-chat-ground', g);
        const key = theme + ':' + g;
        const t = {};
        const exp = { '--gradient-chat': c.grad, '--chat-pattern-ink': c.ink, '--surface-bubble-sent': c.sent, '--gradient-bubble-sent': c.sent, '--surface-card-sent': c.card,
          '--outline-card-sent': rg(c.o, theme === 'light' ? '0.18' : '0.22'), '--outline-card-sent-selected': rg(c.o, theme === 'light' ? '0.45' : '0.55'),
          '--surface-select-row-gap': c.gap, '--chat-pattern-alpha-1': c.a };
        if (c.bub) { exp['--surface-bubble-received'] = c.bub; exp['--surface-bubble-received-quote'] = c.quo; }
        if (c.ring) exp['--outline-select-ring'] = c.ring;
        if (g === 'flat') delete exp['--surface-select-row-gap'];   // dark Mist has no band of its own (the shared dark default stays, the proposal: "—")
        const wrong = Object.entries(exp).filter(([n, v]) => (n === '--chat-pattern-ink' && g === 'aurora' ? resolve(n).toLowerCase() !== v.toLowerCase() : get(n) !== norm(v)));
        if (wrong.length) bad.picked.push(key + ' ' + JSON.stringify(wrong.map(([n, v]) => [n, v, get(n)])));
        el.setAttribute('data-desktop', '');
        const ad = get('--chat-pattern-alpha-1');
        if (!(ad === norm(c.ad) && Math.abs(parseFloat(ad) - 0.8 * parseFloat(c.a)) < 1e-9)) bad.picked.push(key + ' desktop alpha ' + ad + ' want ' + c.ad);
        el.removeAttribute('data-desktop');
        t.sent = c.sent; t.alpha = c.a + ' / ' + c.ad;
        /* ---- the floors on this cell, from the tokens as the cascade gives them ---- */
        const sent = hex(resolve('--surface-bubble-sent')), white = hex(resolve('--text-bubble-sent')), metaInk = hex(resolve('--text-bubble-sent-meta')), mop = parseFloat(resolve('--bubble-meta-opacity-sent'));
        const rec = hex(resolve('--surface-bubble-received')), text = hex(resolve('--text-bubble-received')), rmeta = hex(resolve('--text-bubble-received-meta')), rop = parseFloat(resolve('--bubble-meta-opacity-received'));
        const stops = (resolve('--gradient-chat').match(/#[0-9a-f]{6}/gi) || []).map(hex);
        const gap = hex(resolve('--surface-select-row-gap')), ring = hex(resolve('--outline-select-ring'));
        if (!sent || !white || !metaInk || !rec || !text || !rmeta) { bad.floors.push(key + ' unresolved'); table[key] = t; continue; }
        t.F1 = r2(cr(text, rec)); t.F2 = r2(cr(white, sent)); t.F5 = r2(cr(metaInk, sent));
        t.F6 = r2(cr(over(sent, metaInk, mop), sent));
        const oldSent = hex(OLD_SENT[g][theme === 'light' ? 0 : 1]); t.F6old = r2(cr(over(oldSent, metaInk, mop), oldSent));
        if (!(t.F1 >= 4.5 && t.F2 >= 4.6 && t.F5 >= 4.5 && (t.F6 >= 3 || t.F6 >= t.F6old))) bad.floors.push(key + ' ' + JSON.stringify({ F1: t.F1, F2: t.F2, F5: t.F5, F6: t.F6, F6old: t.F6old }));
        if (gap && ring) { t.F7 = r2(cr(ring, gap)); if (!(t.F7 >= 3)) bad.floors.push(key + ' F7 ' + t.F7); }
        if (theme === 'dark') {
          t.F1b = t.F1; if (!(t.F1 >= 7)) bad.floors.push(key + ' F1b ' + t.F1);
          t.F3 = stops.map((s) => r2(cr(rec, s)));
          const qt = hex(resolve('--surface-bubble-received-quote'));
          t.F4 = r2(cr(rmeta, rec)); t.F4b = r2(cr(over(rec, rmeta, rop), rec)); t.F4c = qt ? r2(cr(qt, rec)) : 0;
          if (!(stops.length && stops.every((s) => lum(rec) > lum(s) && cr(rec, s) >= 1.15) && t.F4 >= 4.5 && t.F4b >= 4.5 && t.F4c >= 1.2 && t.F4c < 1.3)) bad.floors.push(key + ' ' + JSON.stringify({ F3: t.F3, F4: t.F4, F4b: t.F4b, F4c: t.F4c }));
          const want = quoteRule(rec);
          if (!qt || want.some((x, i) => Math.abs(x - qt[i]) > 1)) bad.floors.push(key + ' quote ' + resolve('--surface-bubble-received-quote') + ' want ~' + want.join(','));
        } else {
          t.recLight = resolve('--surface-bubble-received').toLowerCase();
          if (t.recLight !== '#ffffff') bad.floors.push(key + ' light received bubble ' + t.recLight);
        }
        if (g === 'flat' && theme === 'dark') {
          const vg = cr(rec, stops[0]); t.mistBubbleGround = r2(vg); t.mistQuoteBubble = t.F4c;
          if (!(Math.abs(vg - 1.35) <= 0.01 && Math.abs(t.F4c - 1.25) <= 0.01 && stops.length === 1 && stops[0].join() === hex(resolve('--chat-canvas-base')).join())) bad.mist.push(JSON.stringify({ vg: r2(vg), q: t.F4c, ground: resolve('--gradient-chat') }));
        }
        table[key] = t;
      }
      /* ---- Mist light = TODAY; the default appearance; outside any canvas ---- */
      if (theme === 'light') {
        el.setAttribute('data-chat-ground', 'flat'); el.removeAttribute('data-chat-sent');
        const m = { grad: get('--gradient-chat'), ink: resolve('--chat-pattern-ink').toLowerCase(), sent: get('--surface-bubble-sent'), card: resolve('--surface-card-sent').toLowerCase(), a: get('--chat-pattern-alpha-1') };
        el.setAttribute('data-desktop', ''); m.ad = get('--chat-pattern-alpha-1'); el.removeAttribute('data-desktop');
        if (!(m.grad === norm('var(--chat-canvas-base)') && m.ink === '#2a3140' && m.sent === '#2160c2' && m.card === '#eaf0fc' && m.a === '0.1024' && m.ad === '0.08192')) bad.mist.push('light Mist moved ' + JSON.stringify(m));
      } else {
        el.removeAttribute('data-chat-ground');
        const o = { ink: get('--chat-pattern-ink'), sent: get('--surface-bubble-sent'), card: get('--surface-card-sent'), a: get('--chat-pattern-alpha-1'), rec: resolve('--surface-bubble-received').toLowerCase() };
        if (!(o.ink === '#c6cffd' && o.sent === '#1a4a96' && o.card === '#19253b' && o.a === '0.101' && o.rec === '#1e2023')) bad.block.push('the shared dark defaults moved: ' + JSON.stringify(o));
        /* the Mist TILE (a descendant) keeps the periwinkle ink reset; its sent + card are the picks (the tile and the chat agree) */
        const tile = W.document.createElement('div'); tile.setAttribute('data-chat-ground', 'flat'); W.document.body.append(tile);
        el.setAttribute('data-chat-ground', 'aurora');
        const tv = (n) => norm(W.getComputedStyle(tile).getPropertyValue(n));
        if (!(tv('--surface-bubble-sent') === '#2d4d81' && tv('--surface-card-sent') === '#1e2636' && tv('--gradient-chat') === '#0c0e10' && tv('--surface-bubble-received') === '#272b2d')) bad.block.push('Mist tile under a dark Aurora root: ' + JSON.stringify(['--surface-bubble-sent', '--surface-card-sent', '--gradient-chat', '--surface-bubble-received'].map(tv)));
        tile.remove();
      }
    }
    /* ---- (7) TILE = CHAT (fix round 1, O2-1): an element with its OWN data-chat-ground (the Settings preview, the canvas dots, the Background swatches) shows what the chat shows —
       for every canvas × theme × phone / desktop × root: the pattern ink, the pattern alpha, the ground, the Auto sent and the sent card of the tile equal those of a
       chat ROOT on that ground; the root is plain (the Settings shell) or another canvas (so nothing leaks) ---- */
    for (const [theme, dom] of [['light', lightDom], ['dark', darkDom]]) {
      const W = dom.window, el = W.document.documentElement; el.setAttribute('data-theme', theme); el.removeAttribute('data-chat-sent');
      const props = ['--chat-pattern-ink', '--chat-pattern-alpha-1', '--gradient-chat', '--surface-bubble-sent', '--surface-card-sent'];
      const val = (node, n, d0 = 0) => { const v = String(W.getComputedStyle(node).getPropertyValue(n)).replace(/\s+/g, ' ').trim(); const m = /^var\((--[\w-]+)(?:, *(.*))?\)$/.exec(v); return m && d0 < 8 && n !== '--gradient-chat' ? norm(val(node, m[1], d0 + 1) || m[2] || '') : norm(v); };
      for (const desk of [false, true]) {
        if (desk) el.setAttribute('data-desktop', ''); else el.removeAttribute('data-desktop');
        const chat = {};
        for (const T of Object.keys(P).concat(P.flat ? [] : ['flat'])) { el.setAttribute('data-chat-ground', T); chat[T] = props.map((n) => val(el, n)); }
        for (const R of [null, ...new Set(['flat', ...Object.keys(P)])]) {
          if (R) el.setAttribute('data-chat-ground', R); else el.removeAttribute('data-chat-ground');
          for (const T of Object.keys(chat)) {
            const tile = W.document.createElement('div'); tile.setAttribute('data-chat-ground', T); W.document.body.append(tile);
            const got = props.map((n) => val(tile, n)); tile.remove();
            const diff = props.map((n, i) => got[i] === chat[T][i] ? null : [n, chat[T][i], got[i]]).filter(Boolean);
            if (diff.length) bad.tile.push(theme + (desk ? ' desktop' : ' phone') + ' tile ' + T + ' under ' + (R || 'plain root') + ': ' + JSON.stringify(diff));
          }
        }
        table['tile:' + theme + (desk ? ':desktop' : ':phone')] = { cells: Object.keys(chat).length * (1 + new Set(['flat', ...Object.keys(P)]).size) };
      }
      el.removeAttribute('data-desktop'); el.removeAttribute('data-chat-ground');
    }
    /* ---- the BUILT sheet: dark Mist's picks sit in the Mist rule(s); the dark default block does not carry them ---- */
    const css = stripCssComments(readFileSync(join(root, 'Spixi/Resources/Raw/html/spixi.tokens.css'), 'utf8')).replace(/\s+/g, ' ');
    const blocks = []; { let stack = [], buf = ''; for (const ch of css) { if (ch === '{') { stack.push(buf.trim()); buf = ''; } else if (ch === '}') { blocks.push({ sel: stack[stack.length - 1] || '', body: buf.trim(), depth: stack.length }); stack.pop(); buf = ''; } else if (ch === ';' && stack.length === 0) buf = ''; else buf += ch; } }
    const flat1 = blocks.filter((b) => b.depth === 1);
    const mistRoot = flat1.filter((b) => /^:root\[data-theme='dark'\]\[data-chat-ground='flat'\], :root\[data-theme='dark'\] \[data-chat-ground='flat'\]$/.test(b.sel));
    const mistTile = flat1.filter((b) => b.sel === ":root[data-theme='dark'] [data-chat-ground='flat']");
    const has = (bs, d) => bs.length === 1 && bs[0].body.replace(/\s+/g, ' ').includes(d);
    const darkDefault = flat1.filter((b) => /^\[data-theme="dark"\]$/.test(b.sel));
    const defHas = (d) => darkDefault.some((b) => b.body.includes(d));
    const blockOk = has(mistRoot, '--gradient-chat: #0C0E10') && has(mistRoot, '--chat-pattern-ink: #C9D0F0') && has(mistRoot, '--chat-pattern-alpha-1: 0.0808') && has(mistRoot, '--surface-bubble-sent: #2D4D81') && has(mistRoot, '--gradient-bubble-sent: #2D4D81')
      && has(mistRoot, '--surface-card-sent: #1E2636') && has(mistRoot, '--surface-bubble-received: #272B2D') && has(mistRoot, '--surface-bubble-received-quote: #151819')
      && has(mistTile, '--gradient-chat: #0C0E10') && has(mistTile, '--surface-bubble-sent: #2D4D81') && has(mistTile, '--gradient-bubble-sent: #2D4D81') && has(mistTile, '--surface-card-sent: #1E2636')
      && defHas('--chat-pattern-ink: #C6CFFD') && defHas('--chat-pattern-alpha-1: 0.101') && defHas('--surface-bubble-sent: #1a4a96') && defHas('--surface-card-sent: #19253B')
      && !darkDefault.some((b) => /#C9D0F0|#2D4D81|#1E2636|#272B2D|0\.0808;/.test(b.body));
    if (!blockOk) bad.block.push('dark Mist picks not (only) in the Mist rules: root ' + mistRoot.length + ' tile ' + mistTile.length);
    /* ---- the ring ---- */
    const aurL = lightDom.window.document.documentElement; aurL.setAttribute('data-theme', 'light'); aurL.setAttribute('data-chat-ground', 'aurora');
    const csL = lightDom.window.getComputedStyle(aurL);
    const ring = hex(norm(csL.getPropertyValue('--outline-select-ring'))), gapL = hex(norm(csL.getPropertyValue('--surface-select-row-gap')));
    const resL = (n, k = 0) => { const v = String(csL.getPropertyValue(n)).replace(/\s+/g, ' ').trim(); const m = /^var\((--[\w-]+)(?:, *(.*))?\)$/.exec(v); return m && k < 8 ? (resL(m[1], k + 1) || m[2] || '') : v; };
    const p600 = hex(resL('--primary-600'));
    const rr = ring && gapL ? cr(ring, gapL) : 0;
    if (!(gapL && gapL.join() === hex('#6EA2D5').join() && rr >= 3.0 && norm(csL.getPropertyValue('--outline-select-ring')) === '#2b47a9' && p600 && lum(ring) < lum(p600))) bad.ring.push('light Aurora ring ' + csL.getPropertyValue('--outline-select-ring') + ' on ' + csL.getPropertyValue('--surface-select-row-gap') + ' = ' + r2(rr));
    table.ringLightAurora = r2(rr); table.oldRingGap = OLD_RING_GAP;
    /* ---- untouched: the sent PICK colours, names / count / order ---- */
    const PICK = { blue: ['#2160c2', '#1a4a96'], violet: ['#6c4cf2', '#4b27e4'], teal: ['#0c7f73', '#0b4d46'], pink: ['#d02b7d', '#a62264'], orange: ['#b85414', '#844115'], graphite: ['#3c4352', '#262b35'] };
    for (const [theme, dom] of [['light', lightDom], ['dark', darkDom]]) {
      const el = dom.window.document.documentElement; el.setAttribute('data-theme', theme); el.setAttribute('data-chat-ground', 'blue');
      for (const [k, v] of Object.entries(PICK)) { el.setAttribute('data-chat-sent', k); const got = norm(dom.window.getComputedStyle(el).getPropertyValue('--surface-bubble-sent')); if (got !== v[theme === 'light' ? 0 : 1]) bad.other.push('sent pick ' + k + ' ' + theme + ' ' + got); }
      el.removeAttribute('data-chat-sent');
    }
    const settingsJs = readFileSync(join(root, 'src/components/settings-screens.js'), 'utf8');
    const ids = /const CHAT_GROUNDS = \[([\s\S]*?)\];/.exec(settingsJs);
    const order = ids ? [...ids[1].matchAll(/id: '([a-z]+)'/g)].map((m) => m[1]).join() : '';
    if (order !== 'flat,gradient,green,blue,aurora,dusk,ocean' && order !== 'flat,gradient,blue,green,aurora,dusk,ocean') bad.other.push('appearance order ' + order);
    const defDom = await boot('light');
    { const d = defDom.window.document.documentElement; if (!(d.getAttribute('data-chat-ground') === 'flat' && d.getAttribute('data-chat-pattern') === 'contours' && !d.hasAttribute('data-chat-sent'))) bad.other.push('default appearance moved'); defDom.window.close(); }
    if (errs.length) bad.other.push('page errors ' + errs.length);
  } catch (e) { bad.other.push('threw ' + (e && e.stack || e)); }
  finally { try { darkDom.window.close(); lightDom.window.close(); } catch (e) { /* */ } }
  const c = (k, m, extra) => ok(bad[k].length === 0, m + ' — ' + JSON.stringify(bad[k].length === 0 ? (extra || { cells: Object.keys(table).length }) : { [k]: bad[k] }).slice(0, 6000));
  c('picked', '★ photo1b #1644 (1): every picked string of every canvas × theme (ground, ink, Auto sent + gradient, sent card + its two edges, select gap, dark bubble + quote, the phone alpha and the desktop alpha = 0.8 ×) is what the BUILT chat computes');
  c('block', '★ photo1b #1644 (2): dark Mist\'s picks sit in the dark Mist rules (root + tile), NEVER in the shared dark defaults (ink #C6CFFD · sent #1a4a96 · card #19253B · alpha 0.101 stay; an element outside a canvas keeps them)');
  c('mist', '★ photo1b #1644 (3): dark Mist ground = #0C0E10 = the canvas base, bubble : ground 1.35 ± 0.01, quote : bubble 1.25 ± 0.01; light Mist = TODAY');
  c('floors', '★ photo1b #1644 (4): F1–F7 hold on every cell — text ≥ 4.5 (dark ≥ 7), white on Auto sent ≥ 4.6, dark bubble ≥ 1.15 off every stop, dark meta ≥ 4.5 (full and as painted), quote 1.2–1.3, sent meta ≥ 4.5, sent ticks ≥ 3 or not lower than the S20 value, the select ring ≥ 3 on its gap', table);
  c('ring', '★ photo1b #1644 (5): the light Aurora ring #2B47A9 on the Calmer 2 gap #6EA2D5 is ≥ 3.0 : 1 (measured ' + table.ringLightAurora + ': not re-set), the same hue and darker than primary-600');
  c('tile', '★ photo1b #1644 (7), fix round 1 O2-1: TILE = CHAT — an element with its own data-chat-ground (the Settings preview, the canvas dots, the Background swatches) paints what the chat paints: pattern ink, pattern alpha, ground, Auto sent and sent card equal those of a chat root on that ground, for all 7 canvases × light / dark × phone / desktop, under a plain root and under every other canvas root (the select gap of the Mist tile, which no preview paints, inherits from another root: as in the base, not compared)');
  c('other', '★ photo1b #1644: the sent PICK colours, the order of the appearances and the default appearance (no stored key = Mist + contours) are untouched; no page error');
}
/* ==== DELIBERATE BREAKS (#802) — one token in a full temp copy of the tree + `node scripts/build-shells.mjs`, this pin run, red for that reason (2026-11-18) ====
 *   (1) picked : Spixi dark `--gradient-chat` first stop #07132B → #07132C ........ RESULT pass=5 fail=1 · red (1) "every picked string … is what the BUILT chat computes"
 *   (2) block  : dark Mist ROOT rule `--chat-pattern-ink` #C9D0F0 → #C6CFFD (the shared default) ... pass=4 fail=2 · red (1) and red (2) "dark Mist picks …"
 *   (3) mist   : dark Mist `--surface-bubble-received` #272B2D → #262A2C ........... pass=2 fail=4 · red (3) {"vg":1.335,"q":1.232,"ground":"#0C0E10"} (+ 1, 2, 4)
 *   (4) floors : dark Mist `--surface-bubble-received-quote` #151819 → #272B2D (quote = bubble) ... pass=2 fail=4 · red (4) (and (3) {"vg":1.353,"q":1})
 *   (5) ring   : light Aurora `--outline-select-ring` #2B47A9 → #2B47B9 ............. pass=3 fail=3 · red (5) "light Aurora ring #2B47B9 on #6EA2D5 = 2.881" (+ 1, 4)
 *   (6) other  : light violet sent pick `--surface-bubble-sent` #6C4CF2 → #6C4CF3 ... pass=5 fail=1 · red (6) {"other":["sent pick violet light #6c4cf3"]}
 *   (7) tile (fix round 1, O2-1), three breaks, each red for its own reason:
 *       A. the OLD light phone reset back (`--chat-pattern-alpha-1: 0.1024` on every non-Aurora tile) ............ g-tokens + pins-s17/c-appearance: pass=15 fail=2 · red (7) and the S17 resets clause
 *       B. the OLD light DESKTOP reset back (`--chat-pattern-alpha-1: 0.08192` on every non-Aurora tile) ........ g-tokens: pass=6 fail=1 · red (7)
 *       C. the OLD dark ink reset back (`--chat-pattern-ink: #C6CFFD` on the Mist and Iris tiles) ............... g-tokens + pins-s17/c-appearance: pass=15 fail=2 · red (7) and the S17 resets clause
 *       (before the fix the same check found 42 of 84 cells different on the real shell: scripts/pins-photo1b/preview-vs-chat.mjs, Chromium)
 * Keys 1–4 also go red together with a neighbour key (one value feeds several clauses); each is red for the reason named. */
