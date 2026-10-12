/* ==== S17 C (#1334–#1336) — CHAT APPEARANCE, premium: the new canvases, bubble colours, corners, Waves / Contours ====
 * On the BUILT shells (jsdom):
 *   · DEFAULT UNCHANGED: chat.html with no stored key = Mist (flat) + the waves pattern at level 1, NO data-chat-sent, no
 *     --bubble-radius override — an update changes nobody's chat
 *   · EVERY NEW KEY, all three #690 ladders: the head script paints a stored ground (aurora), pattern (rings), colour
 *     (pink) and corners (10 px) BEFORE first paint; the live re-resolve follows a change (focus); garbage falls through
 *     (an unknown colour = Auto, corners clamped 4–22, an unknown ground = flat); settings.html reopens the screen on the
 *     stored values (ladder 3); a pick WRITES the key (Auto removes it)
 *   · RESET TO AUTO: a canvas tap with a colour picked writes Auto
 *   · RADIUS: the corners value drives the chat's bubble radius; the tail / group corners are 2/9 of it (18 → 4 px exact)
 *   · CONTRAST: white text ≥ 4.5 : 1 on EVERY sent colour (6 + the new canvases' own) in BOTH themes, and each dark step
 *     is DARKER than its light value (Damir 15:15)
 *   · TODAY'S LOOK: today's four grounds keep their exact values (Mist · Iris · Spixi · Meadow, both themes), the received
 *     glass edge tokens are untouched (dark 4.5 % hairline + 4 % top light, none in light)
 *   · THE TILES: Waves repeats with no seam (every line ends where it starts) and stays one small mask; Contours (rings)
 *     draws a wrapped copy of every ring that crosses an edge
 *   · NAMES: the seven canvas names + Waves / Contours in en-us; every locale has every new key, non-empty
 *   · THEME CARD: a tap sends the SAME commit as the hub's sheet (ixian:appearance:<v>)
 * Deliberate breaks (S17 report). */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep, readFileSync, readdirSync, join, root } = h;
  const K = aKit(h);
  const hex = (v) => { const m = String(v).trim().match(/^#([0-9a-f]{6})$/i); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; };
  const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const close = (s) => { try { s.close(); } catch (e) { /* */ } };
  const norm = (v) => String(v).replace(/\s+/g, '').trim();   // the BUILT css is minified (no space after a comma / around * /)

  /* —— chat.html: default + the head script + the live re-resolve —— */
  try {
    let s = await K.boot('chat.html', { wait: 900 });
    const R = s.d.documentElement;
    const def = R.getAttribute('data-chat-ground') === 'flat' && R.getAttribute('data-chat-pattern') === 'contours'
      && !R.hasAttribute('data-chat-sent') && !R.style.getPropertyValue('--bubble-radius')
      && R.style.getPropertyValue('--chat-pattern-opacity') === 'var(--chat-pattern-alpha-1)';
    close(s);
    s = await K.boot('chat.html', { wait: 900, storage: { 'spixi.chat.ground': 'aurora', 'spixi.chat.patternstyle': 'rings', 'spixi.chat.sentcolour': 'pink', 'spixi.chat.corners': '10', 'spixi.chat.textscale': '0.75' } });
    const R2 = s.d.documentElement;
    const head = R2.getAttribute('data-chat-ground') === 'aurora' && R2.getAttribute('data-chat-pattern') === 'rings'
      && R2.getAttribute('data-chat-sent') === 'pink' && R2.style.getPropertyValue('--bubble-radius') === '10px'
      && R2.style.getPropertyValue('--bubble-radius-group') === '2px' && R2.style.getPropertyValue('--bubble-radius-origin') === '2px'   /* max(2, round(10 × 0.22)) */
      && R2.style.getPropertyValue('--chat-text-scale') === '0.75';
    /* the live re-resolve (focus): garbage falls through */
    s.W.localStorage.setItem('spixi.chat.sentcolour', 'neon');
    s.W.localStorage.setItem('spixi.chat.corners', '99');
    s.W.localStorage.setItem('spixi.chat.ground', 'mesh');
    s.W.dispatchEvent(new s.W.Event('focus'));
    await sleep(30);
    const live = !R2.hasAttribute('data-chat-sent') && R2.style.getPropertyValue('--bubble-radius') === '22px' && R2.getAttribute('data-chat-ground') === 'flat';
    s.W.localStorage.setItem('spixi.chat.sentcolour', 'teal');
    s.W.localStorage.setItem('spixi.chat.corners', '1');
    s.W.dispatchEvent(new s.W.Event('focus'));
    await sleep(30);
    const live2a = R2.getAttribute('data-chat-sent') === 'teal' && R2.style.getPropertyValue('--bubble-radius') === '4px' && R2.style.getPropertyValue('--bubble-radius-group') === '2px';
    s.W.localStorage.setItem('spixi.chat.corners', '18');
    s.W.dispatchEvent(new s.W.Event('focus'));
    await sleep(30);
    /* 18 → exactly today's 18 / 4 / 4 (values file 21:24 §4) */
    const live2 = live2a && R2.style.getPropertyValue('--bubble-radius') === '18px' && R2.style.getPropertyValue('--bubble-radius-group') === '4px' && R2.style.getPropertyValue('--bubble-radius-origin') === '4px';
    s.W.localStorage.removeItem('spixi.chat.corners');
    s.W.dispatchEvent(new s.W.Event('focus'));
    await sleep(30);
    const live3 = !R2.style.getPropertyValue('--bubble-radius') && !R2.style.getPropertyValue('--bubble-radius-group') && !R2.style.getPropertyValue('--bubble-radius-origin');
    /* contrast + dark steps + today's grounds, read from the BUILT tokens through the cascade */
    const tok = (n) => s.W.getComputedStyle(R2).getPropertyValue(n).trim();
    const sentFor = (theme, id, ground) => {
      if (theme === 'dark') R2.setAttribute('data-theme', 'dark'); else R2.removeAttribute('data-theme');
      R2.setAttribute('data-chat-ground', ground || 'flat');
      if (id) R2.setAttribute('data-chat-sent', id); else R2.removeAttribute('data-chat-sent');
      return { bubble: tok('--surface-bubble-sent'), grad: tok('--gradient-bubble-sent'), card: tok('--surface-card-sent') };
    };
    /* #46 r1 m4: the text actually PAINTED on the bubble is --text-bubble-sent (#f9fafb), not #fff — measure against it */
    const white = hex(tok('--text-bubble-sent')) || [249, 250, 251];
    const pairs = {};
    let contrast = true, darker = true;
    const cases = [['blue'], ['violet'], ['teal'], ['pink'], ['orange'], ['graphite'], ['', 'flat'], ['', 'gradient'], ['', 'blue'], ['', 'green'], ['', 'aurora'], ['', 'dusk'], ['', 'ocean']];
    for (const [id, g] of cases) {
      const L = sentFor('light', id, g), D = sentFor('dark', id, g);
      const l = hex(L.bubble), d = hex(D.bubble);
      const k = id || g;
      pairs[k] = [L.bubble, D.bubble, l && d ? +cr(white, l).toFixed(2) : 0, l && d ? +cr(white, d).toFixed(2) : 0];
      if (!l || !d || cr(white, l) < 4.5 || cr(white, d) < 4.5 || L.grad !== L.bubble || D.grad !== D.bubble || !hex(L.card) || !hex(D.card)) contrast = false;
      if (!l || !d || !(lum(d) < lum(l))) darker = false;
    }
    /* ★ Damir's FINAL VALUES v3 (21:50, replaces the 21:24 file): EACH canvas its OWN flat bubble (Auto), both themes */
    const AUTO = { flat: ['#2160c2', '#1a4a96'], gradient: ['#6145d6', '#4b31b7'], blue: ['#3050bd', '#2d48a3'], green: ['#0e7a55', '#11603f'],
      aurora: ['#07666b', '#08626a'], dusk: ['#d02b7d', '#a62264'], ocean: ['#0d7aa7', '#13729a'] };
    const autoGot = {};
    const auto = Object.keys(AUTO).every((g) => {
      const L = sentFor('light', '', g), D = sentFor('dark', '', g);
      autoGot[g] = [L.bubble, D.bubble];
      return L.bubble.toLowerCase() === AUTO[g][0] && D.bubble.toLowerCase() === AUTO[g][1] && L.grad === L.bubble && D.grad === D.bubble;
    });
    /* the META ink (time + ticks) ≥ 4.5 : 1 on every sent colour in both themes — #f9fafb where today's #e9ecf3 fails */
    const res = (v) => { let x = String(v).trim(); for (let i = 0; i < 6 && /^var\(/.test(x); i++) x = tok(x.match(/^var\((--[\w-]+)/)[1]); return x; };
    const metaFor = (theme, id, g) => { sentFor(theme, id, g); return res(tok('--text-bubble-sent-meta')); };
    const metaPairs = {};
    let meta = true;
    for (const [id, g] of cases) for (const th of ['light', 'dark']) {
      const bub = hex(sentFor(th, id, g).bubble), m = hex(metaFor(th, id, g));
      const r = bub && m ? cr(m, bub) : 0;
      metaPairs[(id || g) + ':' + th] = +r.toFixed(2);
      if (r < 4.5) meta = false;
    }
    const metaSwap = ['violet', 'teal', 'pink', 'orange'].every((c) => metaFor('light', c).toLowerCase() === '#f9fafb') && ['ocean', 'dusk', 'green'].every((g) => metaFor('light', '', g).toLowerCase() === '#f9fafb')
      && ['flat', 'gradient', 'blue', 'aurora'].every((g) => metaFor('light', '', g).toLowerCase() === '#e9ecf3')
      && metaFor('light', 'blue').toLowerCase() === '#e9ecf3' && metaFor('dark', 'violet').toLowerCase() === '#e9ecf3';
    /* the grounds, v3: today's LIGHT four exact; every DARK canvas FULL COVERAGE (no canvas-base stop inside its gradient) */
    const gr = (theme, g) => { if (theme === 'dark') R2.setAttribute('data-theme', 'dark'); else R2.removeAttribute('data-theme'); R2.setAttribute('data-chat-ground', g); R2.removeAttribute('data-chat-sent'); return norm(tok('--gradient-chat')) + ' | ' + tok('--chat-pattern-ink'); };
    const TODAY = {
      'light:gradient': 'linear-gradient(180deg, #CCD0EC 0%, #D0C9EB 50%, #D5C3EB 100%), var(--chat-canvas-base) | #3A2F66',
      'dark:gradient': 'linear-gradient(160deg, #1C1645 0%, #0D1030 100%), var(--chat-canvas-base) | #C6CFFD',
      'light:green': 'linear-gradient(160deg, #D6EBC6 0%, #D2EDA8 45%, #CFE9BD 100%), var(--chat-canvas-base) | #2F5A1E',
      'light:blue': 'linear-gradient(180deg, #C9DDF2 0%, #C5D6F1 50%, #C2CFEE 100%), var(--chat-canvas-base) | #1E3A66',
      /* #46 r1 m5: the light new three too (v3 §1) */
      'light:aurora': 'linear-gradient(150deg, #7EE0C4 0%, #5FB4EE 48%, #8F80F2 100%), var(--chat-canvas-base) | #FFFFFF',
      'light:dusk': 'linear-gradient(160deg, #FFD9C4 0%, #E9C9FF 100%), var(--chat-canvas-base) | #7A3F5E',
      'light:ocean': 'linear-gradient(160deg, #BDEFFF 0%, #C9D6FF 100%), var(--chat-canvas-base) | #0E5770',
      'dark:green': 'linear-gradient(160deg, #0F2C23 0%, #0B1A16 100%), var(--chat-canvas-base) | #BFE8CB',
      'dark:blue': 'linear-gradient(160deg, #0F2349 0%, #0A1430 100%), var(--chat-canvas-base) | #C2DDFB',
      'dark:aurora': 'linear-gradient(150deg, #0A3833 0%, #102A62 52%, #261866 100%), var(--chat-canvas-base) | #FFFFFF',
      'dark:dusk': 'linear-gradient(160deg, #3B1F3C 0%, #1B1430 100%), var(--chat-canvas-base) | #FFC9E4',
      'dark:ocean': 'linear-gradient(160deg, #0B3A4A 0%, #0B1D3A 100%), var(--chat-canvas-base) | #A6ECFF',
    };
    const todayGot = Object.fromEntries(Object.keys(TODAY).map((k) => [k, gr(k.split(':')[0], k.split(':')[1])]));
    /* #46 r1 m5: every select-row gap of v3 (§1) — light Iris / Spixi / Meadow keep today's */
    const GAP = { 'light:gradient': '#B6B6E4', 'light:blue': '#ADC1E9', 'light:green': '#B8D4AB', 'light:aurora': '#57A4E6', 'light:dusk': '#D5BCDC', 'light:ocean': '#ABCBF4',
      'dark:gradient': '#2A3165', 'dark:blue': '#233867', 'dark:green': '#243E4E', 'dark:aurora': '#264385', 'dark:dusk': '#3C3762', 'dark:ocean': '#23456C' };
    const gapGot = {};
    const gaps = Object.keys(GAP).every((k) => { const [th, g] = k.split(':'); gr(th, g); gapGot[k] = tok('--surface-select-row-gap'); return gapGot[k].toUpperCase() === GAP[k]; });
    const chipCss = h.stripCssComments(readFileSync(join(root, 'src/styles/components/settings-screens.css'), 'utf8'));
    const chip = /\.c-settings-appearance__chip \{[^}]*background: var\(--surface-chat-glass\);[^}]*border: var\(--outline-width-1\) solid var\(--outline-chat-glass\);[^}]*color: var\(--text-neutral-02\);/.test(chipCss);
    const today = gaps && chip && Object.keys(TODAY).every((k) => todayGot[k] === norm(TODAY[k].split(' | ')[0]) + ' | ' + TODAY[k].split(' | ')[1])
      && ['gradient', 'blue', 'green', 'aurora', 'dusk', 'ocean'].every((g) => { const v = gr('dark', g).split(' | ')[0]; const inner = v.replace(/,\s*var\(--chat-canvas-base\)$/, ''); return v.indexOf('linear-gradient') === 0 && inner !== v && inner.indexOf('canvas-base') < 0; });
    R2.removeAttribute('data-theme');
    const edgeL = tok('--outline-hairline'), topL = tok('--highlight-top');
    R2.setAttribute('data-theme', 'dark');
    const edgeD = tok('--outline-hairline'), topD = tok('--highlight-top');
    const edge = /[,\s]0?\.045\)$/.test(norm(edgeD).replace(/,/g, ', ')) && /[,\s]0?\.04\)$/.test(norm(topD).replace(/,/g, ', ')) && /transparent|,0\)/.test(norm(edgeL) + ' ' + norm(topL));
    /* the radius: no stored key = today's tokens 18 / 4 / 4 */
    R2.removeAttribute('data-theme');
    const radius = tok('--bubble-radius-group') === '4px' && tok('--bubble-radius-origin') === '4px' && tok('--bubble-radius') === '18px';
    /* THE PREVIEW TILES INHERIT NOTHING (values file §6): a Mist / Iris tile under a light Aurora root keeps the :root pattern
       strength; under a dark Meadow root the Mist and Iris tiles keep the periwinkle ink */
    const tile = (g) => { const t = s.d.createElement('div'); t.setAttribute('data-chat-ground', g); s.d.body.append(t); return t; };
    const tv = (t, n) => s.W.getComputedStyle(t).getPropertyValue(n).trim();
    R2.removeAttribute('data-theme'); R2.setAttribute('data-chat-ground', 'flat');
    const rootAlpha = tok('--chat-pattern-alpha-1');
    R2.setAttribute('data-chat-ground', 'aurora');
    const tFlat = tile('flat'), tIris = tile('gradient'), tAur = tile('aurora');
    /* v3 (21:57): the pattern alpha −20 % — light 0.128 (Aurora 0.24), dark 0.104 */
    const resets = { light: tv(tFlat, '--chat-pattern-alpha-1') === rootAlpha && tv(tIris, '--chat-pattern-alpha-1') === rootAlpha && tv(tAur, '--chat-pattern-alpha-1') === '0.24' && tok('--chat-pattern-alpha-1') === '0.24' && rootAlpha === '0.128'
      && tv(tFlat, '--surface-bubble-sent').toLowerCase() === '#2160c2' && tv(tIris, '--surface-bubble-sent').toLowerCase() === '#6145d6' };
    R2.setAttribute('data-theme', 'dark'); R2.setAttribute('data-chat-ground', 'green');
    resets.dark = tv(tFlat, '--chat-pattern-ink') === '#C6CFFD' && tv(tIris, '--chat-pattern-ink') === '#C6CFFD' && tok('--chat-pattern-ink') === '#BFE8CB'   // the root keeps the dark Meadow ink
      && tv(tFlat, '--surface-bubble-sent').toLowerCase() === '#1a4a96' && tv(tIris, '--surface-bubble-sent').toLowerCase() === '#4b31b7'   // no Meadow green leaks into a tile
      && tok('--chat-pattern-alpha-1') === '0.104';
    R2.removeAttribute('data-theme');
    close(s);
    ok(def, '★ S17 C (#1334): DEFAULT UNCHANGED — a chat with no stored key paints Mist (flat) + the waves pattern at level 1, no bubble-colour attribute, no radius override (an update changes nobody\'s chat)');
    ok(head && live && live2 && live3, '★ S17 C (#1334): the NEW keys ride the chat ladders — the head script paints a stored aurora / rings / pink / 10 px / 0.75 BEFORE first paint; the live re-resolve follows a change; an unknown colour = Auto, corners clamp to 4–22, an unknown ground = flat, a removed corners key = the token default — ' + JSON.stringify({ head, live, live2, live3 }));
    ok(contrast && darker && auto, '★ S17 C (#1334): white text ≥ 4.5 : 1 on EVERY sent colour (6 picks + the new canvases\' own) in BOTH themes, each dark step DARKER than its light value, the gradient + card tint follow; Auto = EACH canvas its OWN flat colour (values v3 21:50) — ' + JSON.stringify({ pairs, autoGot }));
    ok(meta && metaSwap, '★ S17 C (values v3 §2–3): the sent META ink (time + ticks) holds ≥ 4.5 : 1 on every sent colour in both themes — #f9fafb on light violet / teal / pink / orange and the Meadow / Dusk / Ocean Auto (today\'s #e9ecf3 fails or sits too close there), today\'s ink everywhere else — ' + JSON.stringify(metaPairs));
    ok(resets.light && resets.dark, '★ S17 C (values v3 §1, §7): the preview tiles inherit nothing from another canvas — under a light Aurora root the Mist / Iris tiles keep the :root pattern strength (−20 %: 0.128, Aurora alone 0.24) and their own bubble; under a dark Meadow root (0.104) the Mist / Iris tiles keep the periwinkle ink and their own bubble — ' + JSON.stringify(resets));
    ok(today && edge, '★ S17 C (values v3 §1): the LIGHT grounds of Iris / Meadow / Spixi stay exactly today\'s; every DARK canvas has its v3 full-coverage ground + ink (no canvas-base stop inside the gradient — Mist alone is the plain ground); the received glass edge tokens are untouched (dark 4.5 % hairline + 4 % top light, none in light) — ' + JSON.stringify({ todayGot, gapGot, chip, edgeL, topL, edgeD, topD }));
    ok(radius, '★ S17 C (#1334, values file §4): no stored corners = today\'s 18 / 4 / 4 tokens; a stored r sets --bubble-radius = r and BOTH small corners = max(2, round(r × 0.22)) inline (asserted in the ladder clause: 10 → 2, 18 → 4)');
  } catch (e) { ok(false, '★ S17 C chat threw: ' + e.message); }

  /* —— the tiles —— */
  try {
    const css = readFileSync(join(root, 'src/styles/chat-pattern.css'), 'utf8');
    const uri = (name) => { const m = css.match(new RegExp('--chat-pattern-uri-' + name + ': url\\("data:image/svg\\+xml,([^"]*)"\\)')); return m ? decodeURIComponent(m[1]) : ''; };
    const waves = uri('contours'), rings = uri('rings');
    const wd = (waves.match(/ d='([^']*)'/) || [])[1] || '';
    const lines = wd.split('M').filter(Boolean).map((p) => p.split('L').map((q) => q.trim().split(/\s+/).map(Number)));
    const seamless = lines.length === 16 && lines.every((pts) => pts[0][0] === 0 && pts[pts.length - 1][0] === 400 && Math.abs(pts[0][1] - pts[pts.length - 1][1]) < 0.11);
    const rd = (rings.match(/ d='([^']*)'/) || [])[1] || '';
    const ringsN = rd.split('M').filter(Boolean).length;
    const crossers = rd.split('M').filter(Boolean).filter((p) => p.split(/[LZ]/).filter(Boolean).some((q) => { const [x, y] = q.trim().split(/\s+/).map(Number); return x < 0 || x > 400 || y < 0 || y > 320; })).length;
    ok(seamless && waves.length <= 8192 && waves.length <= rings.length && /stroke-width='1.3'/.test(waves) && ringsN > 35 && crossers > 0 && rings.length <= 18432
      && /\[data-chat-pattern='rings'\] \{[^}]*--chat-pattern-uri: var\(--chat-pattern-uri-rings\)/.test(css),
      '★ S17 C (#1334 / #1335): the tiles — Waves (the contours id) = 16 lines, each ending where it starts (no seam), 1.3 px, a point every 8 units (values file 21:24), ≤ 8 KB and ≤ the Contours tile; Contours (rings) = 35 rings + a wrapped copy of every ring that crosses an edge, 0.1 px points as the render (integers read angular), ≤ 18 KB (Damir was told 10–20 KB), its own style block — ' + JSON.stringify({ lines: lines.length, seamless, wavesB: waves.length, ringsN, crossers, ringsB: rings.length }));
  } catch (e) { ok(false, '★ S17 C tiles threw: ' + e.message); }

  /* —— names, every locale —— */
  try {
    const en = JSON.parse(readFileSync(join(root, 'src/strings/en-us.json'), 'utf8'));
    const NAMES = { groundFlat: 'Mist', groundBrandGradient: 'Iris', groundBlueGradient: 'Spixi', groundGreenGradient: 'Meadow', groundAurora: 'Aurora', groundDusk: 'Dusk', groundOcean: 'Ocean', patternStyleContours: 'Waves', patternRings: 'Contours' };
    const NEW = ['groundAurora', 'groundDusk', 'groundOcean', 'patternRings', 'bubbleColour', 'bubbleColourAuto', 'bubbleCorners', 'colourBlue', 'colourViolet', 'colourTeal', 'colourPink', 'colourOrange', 'colourGraphite', 'previewSender'];
    const enOK = Object.entries(NAMES).every(([k, v]) => en[k] === v);
    const locs = readdirSync(join(root, 'src/strings')).filter((f) => /^[a-z]{2}-[a-z]{2}\.json$/.test(f) && f !== 'en-us.json');
    const OLD = ['Solid', 'Brand gradient', 'Blue gradient', 'Green gradient'];
    const bad = [];
    for (const f of locs) {
      const j = JSON.parse(readFileSync(join(root, 'src/strings', f), 'utf8'));
      for (const k of NEW.concat(Object.keys(NAMES))) if (!j[k] || !String(j[k]).trim()) bad.push(f + ':' + k);
      for (const k of ['groundFlat', 'groundBrandGradient', 'groundBlueGradient', 'groundGreenGradient']) if (OLD.indexOf(j[k]) >= 0) bad.push(f + ':' + k + '=' + j[k]);
    }
    ok(enOK && locs.length >= 12 && bad.length === 0,
      '★ S17 C (Damir 15:55): the canvas NAMES — en-us Mist · Iris · Spixi · Meadow · Aurora · Dusk · Ocean + Waves / Contours; every locale (' + locs.length + ') carries every new key, and none still says the old English names — off: ' + JSON.stringify(bad.slice(0, 12)));
  } catch (e) { ok(false, '★ S17 C names threw: ' + e.message); }

  /* —— settings.html: ladder 3, the writes, reset-to-Auto, the theme card —— */
  try {
    const s = await K.boot('settings.html', { storage: { 'spixi.chat.ground': 'dusk', 'spixi.chat.sentcolour': 'orange', 'spixi.chat.corners': '9', 'spixi.chat.patternstyle': 'rings' } });
    const { d, W } = s;
    s.push('setTheme', '1');
    await sleep(100);
    const row = [...d.querySelectorAll('button.c-settings__row')].find((x) => /Chat appearance/.test(x.textContent || ''));
    if (row) row.click();
    await sleep(400);
    const el = d.querySelector('.c-settings-appearance');
    const q = (sel) => el && el.querySelector(sel);
    const checked = (sel) => { const b = el && [...el.querySelectorAll(sel)].find((x) => x.getAttribute('aria-checked') === 'true'); return b ? b.dataset.value : null; };
    const prev = q('.c-settings-appearance__preview');
    const r = {
      ground: checked('.c-settings-appearance__dot') === 'dusk',
      names: el ? [...el.querySelectorAll('.c-settings-appearance__dot')].map((b) => b.getAttribute('aria-label')).join(',') === 'Mist,Iris,Spixi,Meadow,Aurora,Dusk,Ocean' : false,
      colour: checked('.c-settings-appearance__colour') === 'orange',
      corners: !!q('.c-settings-appearance__corners input') && q('.c-settings-appearance__corners input').value === '9',
      bg: checked('.c-settings-swatch') === 'rings',
      preview: !!prev && prev.getAttribute('data-chat-ground') === 'dusk' && prev.getAttribute('data-chat-sent') === 'orange' && prev.style.getPropertyValue('--bubble-radius') === '9px' && prev.dataset.chatPattern === 'rings',
    };
    /* writes */
    const ls = W.localStorage;
    const tap = (sel, v) => { const b = el && [...el.querySelectorAll(sel)].find((x) => x.dataset.value === v); if (b) b.click(); };
    /* ★ values v3 §6 (Damir 21:56): the CANVAS tiles draw the SELECTED background (None / Contours / Waves), the BACKGROUND tiles
       sit on the SELECTED canvas */
    const faces = () => (el ? [...el.querySelectorAll('.c-settings-appearance__dot-face')] : []);
    const grp = q('.c-settings-swatches--style');
    r.tilesFollowPattern = faces().length === 7 && faces().every((f) => f.dataset.chatPattern === 'rings' && f.style.getPropertyValue('--chat-pattern-opacity') !== '0');
    tap('.c-settings-swatch', 'none');
    r.tilesFollowNone = faces().every((f) => f.style.getPropertyValue('--chat-pattern-opacity') === '0');
    tap('.c-settings-swatch', 'contours');
    r.tilesFollowWaves = faces().every((f) => f.dataset.chatPattern === 'contours' && f.style.getPropertyValue('--chat-pattern-opacity') !== '0');
    tap('.c-settings-swatch', 'rings');
    r.bgFollowsCanvas = !!grp && grp.getAttribute('data-chat-ground') === 'dusk' && ![...grp.querySelectorAll('[data-chat-ground]')].length;
    tap('.c-settings-appearance__colour', 'teal');
    r.writeColour = ls.getItem('spixi.chat.sentcolour') === 'teal';
    const cr2 = q('.c-settings-appearance__corners input');
    if (cr2) { cr2.value = '14'; cr2.dispatchEvent(new W.Event('input')); cr2.dispatchEvent(new W.Event('change')); }
    r.writeCorners = ls.getItem('spixi.chat.corners') === '14' && prev.style.getPropertyValue('--bubble-radius') === '14px';
    /* reset to Auto on a canvas pick (the key is REMOVED) */
    tap('.c-settings-appearance__dot', 'aurora');
    r.resetAuto = ls.getItem('spixi.chat.ground') === 'aurora' && ls.getItem('spixi.chat.sentcolour') === null && checked('.c-settings-appearance__colour') === 'auto'
      && !prev.hasAttribute('data-chat-sent');
    /* the text-size slider writes the SCALE (px / 16) */
    const sz = q('.c-settings-appearance__size input');
    if (sz) { sz.value = '20'; sz.dispatchEvent(new W.Event('input')); sz.dispatchEvent(new W.Event('change')); }
    r.textSize = ls.getItem('spixi.chat.textscale') === '1.25' && prev.style.getPropertyValue('--chat-text-scale') === '1.25';
    /* the theme card: the hub's commit */
    const b0 = s.sent.length;
    tap('.c-settings-appearance__theme', '2');
    await sleep(30);
    r.theme = s.sent.slice(b0).indexOf('ixian:appearance:2') >= 0;
    close(s);
    ok(Object.values(r).every(Boolean),
      '★ S17 C (#1334): settings.html (ladder 3) reopens Chat appearance on the STORED values (canvas, colour, corners, background) with the seven canvases named, a pick WRITES its key, a canvas pick RESETS the colour to Auto (the key removed), the slider writes the scale, and the Theme card sends the hub\'s commit (ixian:appearance:<v>) — ' + JSON.stringify(r));
  } catch (e) { ok(false, '★ S17 C settings threw: ' + e.message); }
}
