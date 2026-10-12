/* ==== S18 D4 (S17 walk DC-SCREEN-W, Damir picked B of the rendered 2-way, docs/renders/desktop-header) ====
 * MECHANISM (measured first on the BUILT shell, docs/renders/desktop-header/PORT.md): in the desktop PANE the About and
 * Contributors screens kept the phone header — the bar re-assigned to the on-hero WHITE ink and 22 px bold — but the band
 * sat in the 640 column under the opaque pane bar, so "About" / "Contributors" and the back arrow were white on the light
 * pane ground (1.05 : 1) and the band was cut. Option B: in the pane the bar is the NORMAL pane bar (theme ink), the band is
 * a ROUNDED CARD inside the column, the art is held at phone scale. The phone keeps its header exactly.
 * On the BUILT settings.html (jsdom), About AND Contributors, light AND dark:
 *   · PANE (?desktop=1 + setPaneMode 1, the Windows / Mac Account pane) — INK: the title ink and the back icon ink resolve
 *     (token chains followed to a colour) to the theme's own --text-topbar / --icon-topbar, and each holds ≥ 4.5 : 1 against
 *     the pane bar's ground (its resolved background); the same after the header has scrolled under the bar (data-solid);
 *   · PANE — CARD: the band's scroller is the 640 column (max-width 640px), the band has a radius (> 0 px), and its outer edge
 *     stays INSIDE the column's content box (its own margin + every inline padding / margin between it and the scroller
 *     ≥ 0 — no bleed);
 *   · PANE — ART: both art layers are the 430 px phone column (inline-size 430px, base.css's svg max-width: 100 % lifted),
 *     not the card's width;
 *   · PHONE (a phone UA, no pane) — UNCHANGED: the bar floats (absolute) on a transparent surface with the on-hero WHITE ink,
 *     22 px, and the band bleeds past the body's padding with no radius.
 * Deliberate breaks (S18 D4 report): the `inherit` ink reset dropped → the pane ink clause fails (light 1.05 : 1); the band
 * radius dropped → the card clause fails; the 640 column rule (settings.html `.sd-detail > :not(.sd-empty) > :not(.c-topbar)`)
 * dropped → the card clause fails; the contributors band's `margin-inline: 0` dropped → the card clause fails (offset −16);
 * the ink reset unscoped from body[data-pane] → the PHONE clause fails; the art's `max-width: none` dropped → the art clause
 * fails. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  const SCREENS = [
    { key: 'about', label: /^\s*About/, cls: 'c-settings-about', band: '.c-settings-about__band' },
    { key: 'contrib', label: /^\s*Contributors/, cls: 'c-settings-contrib', band: '.c-settings-contrib__band' },
  ];
  /* —— colour + contrast —— */
  const parse = (v) => {
    const s = String(v || '').trim();
    let m = s.match(/^#([0-9a-f]{3,8})$/i);
    if (m) {
      let x = m[1];
      if (x.length === 3 || x.length === 4) x = x.split('').map((c) => c + c).join('');
      return { c: [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)), a: x.length === 8 ? parseInt(x.slice(6, 8), 16) / 255 : 1 };
    }
    m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i);
    if (m) return { c: [+m[1], +m[2], +m[3]], a: m[4] == null ? 1 : (/%$/.test(m[4]) ? parseFloat(m[4]) / 100 : +m[4]) };
    if (/^(transparent|none)$/i.test(s)) return { c: [0, 0, 0], a: 0 };
    return null;
  };
  const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100; };

  const probe = (W, d) => {
    const cs = (x) => W.getComputedStyle(x);
    /* a custom property as element x SEES it (custom properties inherit; `inherit` / empty walk up) */
    const cp = (x, n) => { for (let e = x; e; e = e.parentElement) { const v = cs(e).getPropertyValue(n).trim(); if (v && !/^(inherit|unset)$/.test(v)) return v; } return ''; };
    /* follow every var() to its value (read on the element that uses it), innermost first */
    const res = (v, x) => {
      let s = String(v || '').trim();
      for (let i = 0; i < 24 && /var\(/.test(s); i++) {
        s = s.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/, (_, n, fb) => cp(x, n) || (fb || '').trim());
      }
      return s;
    };
    /* a resolved length → px (a calc of px terms and plain numbers) */
    const px = (v, x) => {
      let s = res(v, x).trim();
      if (s === '0' || s === '') return 0;
      if (/^-?[\d.]+px$/.test(s)) return parseFloat(s);
      s = s.replace(/calc\(/g, '(').replace(/(-?[\d.]+)px/g, '$1');
      if (!/^[\d\s.+\-*/()]+$/.test(s)) return NaN;
      try { return Function('return (' + s + ')')(); } catch (e) { return NaN; }
    };
    /* the CASCADED declaration of one inline-start box property (jsdom cannot expand a var() shorthand into its longhands, so
       the matching rules are read here: specificity, then order; the shorthand's 4th / 2nd / 1st part is the inline start) */
    const spec = (sel) => {
      let a = 0, b = 0, c = 0;
      let s = sel.replace(/::[\w-]+(\([^)]*\))?/g, ' ');
      s = s.replace(/:(not|is|has)\(([^()]*(\([^()]*\))?[^()]*)\)/g, (_, f, arg) => { const m = arg.split(',').map((x) => spec(x.trim())).sort((p, q) => (q[0] - p[0]) || (q[1] - p[1]) || (q[2] - p[2]))[0]; a += m[0]; b += m[1]; c += m[2]; return ' '; });
      s = s.replace(/:where\([^)]*\)/g, ' ');
      a += (s.match(/#[\w-]+/g) || []).length;
      b += (s.match(/\.[\w-]+|\[[^\]]*\]|:[\w-]+(\([^)]*\))?/g) || []).length;
      c += (s.replace(/#[\w-]+|\.[\w-]+|\[[^\]]*\]|:[\w-]+(\([^)]*\))?/g, ' ').match(/(^|[\s>+~])[a-z][\w-]*/gi) || []).length;
      return [a, b, c];
    };
    const rules = [];
    const walk = (list) => { for (const r of list) { if (r.cssRules && !r.selectorText) { if (!r.media || W.matchMedia(r.media.mediaText).matches || !/prefers|hover|pointer|width/.test(r.media.mediaText)) walk(r.cssRules); } else if (r.selectorText) rules.push(r); } };
    for (const sh of d.styleSheets) { try { walk(sh.cssRules); } catch (e) { /* cross-origin */ } }
    const startOf = (x, base) => {
      let best = null, bs = null, idx = -1;
      rules.forEach((r, i) => {
        for (const sel of r.selectorText.split(/,(?![^()]*\))/)) {
          let m = false; try { m = x.matches(sel.trim()); } catch (e) { m = false; }
          if (!m) continue;
          const sp = spec(sel.trim());
          for (const p of [base, base + '-inline', base + '-inline-start', base + '-left']) {
            const v = r.style.getPropertyValue(p);
            if (!v) continue;
            if (!bs || sp[0] > bs[0] || (sp[0] === bs[0] && (sp[1] > bs[1] || (sp[1] === bs[1] && (sp[2] > bs[2] || (sp[2] === bs[2] && i >= idx)))))) { best = { p, v }; bs = sp; idx = i; }
          }
        }
      });
      if (!best) return 0;
      const parts = []; let depth = 0, cur = '';   /* split at TOP-LEVEL spaces (a calc / var keeps its own) */
      for (const ch of best.v.trim()) { if (ch === '(') depth++; if (ch === ')') depth--; if (/\s/.test(ch) && depth === 0) { if (cur) parts.push(cur); cur = ''; } else cur += ch; }
      if (cur) parts.push(cur);
      const pick = best.p === base ? (parts[3] || parts[1] || parts[0]) : best.p === base + '-inline' ? parts[0] : parts[0];
      return px(pick, x);
    };
    return { cs, cp, res, px, startOf };
  };

  const open = async (s, sc) => {
    const row = [...s.d.querySelectorAll('button')].find((x) => sc.label.test(x.textContent || ''));
    if (row) row.click();
    await sleep(450);
    return s.d.querySelector('.' + sc.cls);
  };

  /* ═══ the PANE: both themes × both screens ═══ */
  const ink = {}, card = {}, art = {};
  for (const theme of ['light', 'dark']) {
    let s = null;
    try {
      s = await K.boot('settings.html', { wait: 900, desktop: true, theme });
      s.push('setPaneMode', '1');
      await sleep(300);
      const { W, d } = s;
      const P = probe(W, d);
      for (const sc of SCREENS) {
        const id = sc.key + '-' + theme;
        const el = await open(s, sc);
        const bar = el && el.querySelector(':scope > .c-topbar');
        const title = bar && bar.querySelector('.c-topbar__title');
        const btn = bar && bar.querySelector('.c-button');
        const body = el && el.querySelector(':scope > .c-settings__body');
        const band = el && el.querySelector(sc.band);
        if (!bar || !title || !btn || !body || !band || !d.body.hasAttribute('data-pane') || !el.closest('.sd-detail')) { ink[id] = card[id] = art[id] = { missing: true }; continue; }
        const theme1 = d.documentElement.getAttribute('data-theme') === theme;
        const want = { text: P.res('var(--text-topbar)', d.documentElement), icon: P.res('var(--icon-topbar)', d.documentElement) };
        const read = () => {
          const ground = parse(P.res(P.cs(bar).getPropertyValue('background') || P.cs(bar).getPropertyValue('background-color'), bar));
          const t = P.res(P.cs(title).color, title), i = P.res(P.cs(btn).color, btn);
          const tc = parse(t), ic = parse(i);
          return {
            title: t, icon: i, ground: ground ? (ground.a === 1 ? 'rgb(' + ground.c.join(',') + ')' : 'alpha ' + ground.a) : null,
            theme: t === want.text && i === want.icon,
            crT: tc && ground && ground.a === 1 ? cr(tc.c, ground.c) : 0, crI: ic && ground && ground.a === 1 ? cr(ic.c, ground.c) : 0,
          };
        };
        const top = read();
        body.scrollTop = 400; body.dispatchEvent(new W.Event('scroll'));
        const solidSet = bar.hasAttribute('data-solid');
        const solid = read();
        body.scrollTop = 0; body.dispatchEvent(new W.Event('scroll'));
        ink[id] = { theme1, top, solidSet, solid, sticky: P.cs(bar).position === 'sticky' };
        ink[id].pass = theme1 && ink[id].sticky && [top, solid].every((r) => r.theme && r.crT >= 4.5 && r.crI >= 4.5);
        /* the card: the column, the radius, no bleed past the column's content box */
        let off = P.startOf(band, 'margin');
        for (let e = band.parentElement; e && e !== body; e = e.parentElement) off += P.startOf(e, 'padding') + P.startOf(e, 'margin');
        const radius = P.px(P.cs(band).getPropertyValue('border-radius'), band);
        card[id] = { column: P.cs(body).getPropertyValue('max-width'), radius, off };
        card[id].pass = card[id].column === '640px' && radius > 0 && off >= 0;
        const layers = [...band.querySelectorAll(':scope > .il')];
        art[id] = layers.map((l) => [P.cs(l).getPropertyValue('inline-size'), P.cs(l).getPropertyValue('max-width'), P.cs(l).getPropertyValue('max-inline-size')]);
        art[id].pass = layers.length === 2 && layers.every((l) => P.px(P.cs(l).getPropertyValue('inline-size'), l) === 430
          && ['max-width', 'max-inline-size'].every((p) => /^(none|)$/.test(P.cs(l).getPropertyValue(p).trim())));   /* base.css caps an svg at 100 % */
      }
    } catch (e) {
      ink['threw-' + theme] = { pass: false, e: String(e && e.stack || e) };
    } finally { if (s) { try { s.close(); } catch (_) {} s = null; } }
  }
  const all = (o) => Object.keys(o).length >= 4 && Object.values(o).every((v) => v && v.pass);
  ok(all(ink),
    '★ S18 D4 (DC-SCREEN-W, Damir picked B): in the desktop PANE the About and Contributors bars take the THEME ink — the title and the back icon resolve to --text-topbar / --icon-topbar, and each holds ≥ 4.5 : 1 against the pane bar ground, light and dark, at the top and once the header has scrolled under it (data-solid); the bar is in the flow (sticky) — '
    + JSON.stringify(Object.fromEntries(Object.entries(ink).map(([k, v]) => [k, v.top ? { T: v.top.crT, I: v.top.crI, sT: v.solid.crT, sI: v.solid.crI, theme: v.top.theme && v.solid.theme, solid: v.solidSet, sticky: v.sticky } : v]))));
  ok(all(card),
    '★ S18 D4 (DC-SCREEN-W): in the PANE the header band is a ROUNDED CARD inside the 640 column — its scroller is the 640px column, the band has a radius, and its outer edge stays inside the column\'s content box (offset ≥ 0, no bleed), both screens, both themes — ' + JSON.stringify(card));
  ok(all(art),
    '★ S18 D4 (DC-SCREEN-W): in the PANE both header art layers are the 430 px PHONE column (no card-wide ×1.5–×2 slice that crops the heart / the app tile) — ' + JSON.stringify(art));

  /* ═══ the PHONE: unchanged ═══ */
  const phone = {};
  for (const theme of ['light', 'dark']) {
    let s = null;
    try {
      /* a phone UA stands in for the head's #228 test (jsdom's UA reads desktop) — the e-theme-sync.mjs boot */
      for (const sc of SCREENS) {
        if (s) { try { s.close(); } catch (_) {} s = null; }
        s = await K.boot('settings.html', { wait: 900, theme, html: (t) => t.split('var u=navigator.userAgent;').join("var u='Mozilla/5.0 (Linux; Android 14) Mobile';") });
        const { W, d } = s;
        const P = probe(W, d);
        const id = sc.key + '-' + theme;
        const el = await open(s, sc);
        const bar = el && el.querySelector(':scope > .c-topbar');
        const title = bar && bar.querySelector('.c-topbar__title');
        const btn = bar && bar.querySelector('.c-button');
        const body = el && el.querySelector(':scope > .c-settings__body');
        const band = el && el.querySelector(sc.band);
        if (!bar || !title || !btn || !body || !band) { phone[id] = { missing: true }; continue; }
        const white = P.res('var(--text-on-hero)', d.documentElement), whiteIcon = P.res('var(--icon-on-hero)', d.documentElement);
        let off = P.startOf(band, 'margin');
        for (let e = band.parentElement; e && e !== body; e = e.parentElement) off += P.startOf(e, 'padding') + P.startOf(e, 'margin');
        const r = {
          noPane: !d.body.hasAttribute('data-pane') && !d.documentElement.hasAttribute('data-desktop'),
          floats: P.cs(bar).position === 'absolute',
          clear: (parse(P.res(P.cs(bar).getPropertyValue('--surface-topbar'), bar)) || { a: 1 }).a === 0,
          white: P.res(P.cs(title).color, title) === white && P.res(P.cs(btn).color, btn) === whiteIcon
            && /^var\(--text-on-hero\)$/.test(P.cp(bar, '--text-topbar')) && /^var\(--icon-on-hero\)$/.test(P.cp(bar, '--icon-topbar')),
          size: P.px(P.cs(title).getPropertyValue('font-size'), title) === 22,
          bleeds: off < 0,
          square: !(P.px(P.cs(band).getPropertyValue('border-radius'), band) > 0),
        };
        r.pass = Object.values(r).every(Boolean);
        r.off = off;
        phone[id] = r;
      }
    } catch (e) {
      phone['threw-' + theme] = { pass: false, e: String(e && e.stack || e) };
    } finally { if (s) { try { s.close(); } catch (_) {} s = null; } }
  }
  ok(all(phone),
    '★ S18 D4 (DC-SCREEN-W): the PHONE header is UNCHANGED — no pane, the bar floats (absolute) on a transparent surface with the on-hero WHITE title + icon ink at 22 px, and the band bleeds past the body padding with no radius, About and Contributors, light and dark — ' + JSON.stringify(phone));
}
