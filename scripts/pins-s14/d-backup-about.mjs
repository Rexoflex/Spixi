/* ==== S14 D — #1287 the sublevel art does not replay its entrance at the slide end · #1288 the About band wears the
 * launcher blue, the version chip is filled ====
 * #1287 MECHANISM (Playwright frame sample on the built settings.html): Account → Backup slid in with the art's
 * entrance running; at the slide end the swap ran `root.replaceChildren(root.lastElementChild)` — the live screen was
 * REMOVED and RE-INSERTED, which restarts every CSS animation inside it (anim currentTime 217 → 0, the art's opacity
 * 0.13 → 0, then a second entrance). Same for every Account sublevel (About's band/icon entrance too). Now the covered
 * views detach AROUND the screen. jsdom has no CSS animation, so the pin holds what the fix relies on: from the tap to
 * the settled state the entering screen (and its art) is inserted ONCE and never removed — first visit, second
 * visit, About, and the reduced-motion (synchronous) path.
 * #1288: on the BUILT settings.html (jsdom cascade; tokens read from the document, light + data-theme="dark"): the
 * chip carries no edge (no box-shadow / border / outline), a filled --ab-chip, text ≥ 4.5:1 on it in both themes; the
 * icon tile = appicon.svg's own ground + radial (values parsed from the SVG); the band = the --ab-band-* blue pair (no
 * hint-art violet), the tile stands off the band in both themes.
 * Deliberate breaks: see the S14 D report. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, root, readFileSync, join, sleep } = h;
  const K = aKit(h);
  const CAPS = 'backupInline,rate';

  /* —— #1287 —— */
  const r = {};
  const sublevel = async ({ reduce = false, rowRe, cls, visits = 1 }) => {
    const s = await K.boot('settings.html', { reduce });
    try {
      s.push('setCaps', CAPS);
      await sleep(200);
      const W = s.W, d = s.d;
      /* jsdom expands no `animation` shorthand, so grantsMotion (subscreen-slide.js) would always read "no motion";
         stand in for the stylesheet: the entering layer reports its slide animation (the swap then waits for the 2×
         backstop, the completes-never path). Reduced motion keeps the real read = the synchronous swap. */
      if (!reduce) {
        const real = W.getComputedStyle.bind(W);
        W.getComputedStyle = (el, ps) => {
          const c = real(el, ps);
          if (!el || !el.classList || !el.classList.contains('c-subslide--in')) return c;
          return new Proxy(c, { get: (t, k) => (k === 'animationName' ? 'c-subslide-in' : (typeof t[k] === 'function' ? t[k].bind(t) : t[k])) });
        };
      }
      const host = d.getElementById('settings-root');
      const res = [];
      for (let v = 0; v < visits; v++) {
        const row = [...d.querySelectorAll('button.c-settings__row')].find((x) => rowRe.test(x.textContent || ''));
        if (!row || !host) { res.push({ err: 'no row/host' }); break; }
        const log = [];
        const mo = new W.MutationObserver((recs) => { for (const m of recs) { for (const n of m.addedNodes) log.push(['+', n]); for (const n of m.removedNodes) log.push(['-', n]); } });
        mo.observe(host, { childList: true });
        row.click();
        const lifted = !!host.querySelector(':scope > .c-subslide--in');
        await sleep(700);   // past the 2× backstop (jsdom fires no animationend)
        log.push(...mo.takeRecords().flatMap((m) => [...[...m.addedNodes].map((n) => ['+', n]), ...[...m.removedNodes].map((n) => ['-', n])]));
        mo.disconnect();
        const scr = host.querySelector(':scope > .' + cls);
        const art = scr && scr.querySelector('svg');
        res.push({
          lifted,
          adds: scr ? log.filter(([k, n]) => k === '+' && n === scr).length : -1,
          removes: scr ? log.filter(([k, n]) => k === '-' && n === scr).length : -1,
          only: host.childElementCount === 1 && host.firstElementChild === scr,
          settled: !!scr && !scr.classList.contains('c-subslide') && d.body.hasAttribute('data-subview'),
          art: !!art && art.isConnected,
        });
        /* back to the hub for the next visit */
        const back = [...d.querySelectorAll('button')].find((x) => /Back/i.test(x.getAttribute('aria-label') || ''));
        if (back) back.click();
        await sleep(500);
      }
      return { res, errs: s.errs };
    } finally { s.close(); }
  };
  const good = (x) => !!x && !x.err && x.adds === 1 && x.removes === 0 && x.only && x.settled && x.art;
  const bk = await sublevel({ rowRe: /^\s*Backup/, cls: 'c-settings-backup', visits: 2 });
  r.backupFirst = good(bk.res[0]) && bk.res[0].lifted;      // the slide ran (lifted over the hub) AND the screen stayed put
  r.backupSecond = good(bk.res[1]) && bk.res[1].lifted;
  const ab = await sublevel({ rowRe: /^\s*About/, cls: 'c-settings-about' });
  r.aboutStill = good(ab.res[0]) && ab.res[0].lifted;
  const rm = await sublevel({ reduce: true, rowRe: /^\s*Backup/, cls: 'c-settings-backup' });
  r.reducedSync = good(rm.res[0]) && !rm.res[0].lifted;      // reduced motion: no lift, the plain swap, still inserted once
  ok(Object.values(r).every((x) => x === true),
    '★ S14 D (#1287) EXECUTED on the built settings.html: hub → Backup / About slides the screen in and the covered hub detaches AROUND it — the screen (and its art) is inserted ONCE and never removed (a re-insert restarted every CSS animation in it: the art replayed its entrance at the slide end); first + second visit, About, reduced motion. '
    + JSON.stringify({ r, bk: bk.res, ab: ab.res, rm: rm.res }));

  /* —— #1288 —— */
  const q = {};
  const hex = (c) => {
    const m = String(c).trim().match(/^#([0-9a-f]{6})$/i);
    if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
    const g = String(c).match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    return g ? [+g[1], +g[2], +g[3]] : null;
  };
  const alpha = (c) => { const g = String(c).match(/rgba\([^)]*,\s*([\d.]+)\s*\)/i); return g ? +g[1] : 1; };
  const lum = (c) => { const v = hex(c).map((x) => x / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hue = (c) => { const [R, G, B] = hex(c).map((x) => x / 255); const mx = Math.max(R, G, B), mn = Math.min(R, G, B); if (mx === mn) return -1; let hh; if (mx === R) hh = ((G - B) / (mx - mn)) % 6; else if (mx === G) hh = (B - R) / (mx - mn) + 2; else hh = (R - G) / (mx - mn) + 4; return (hh * 60 + 360) % 360; };
  const s = await K.boot('settings.html', { wait: 1200 });
  try {
    s.push('setVersion', 'spixi-0.9.22');
    await sleep(100);
    const d = s.d, W = s.W;
    const row = [...d.querySelectorAll('button.c-settings__row')].find((x) => /^\s*About/.test(x.textContent || ''));
    if (row) row.click();
    await sleep(700);
    const chip = d.querySelector('.c-settings-about__version');
    const tile = d.querySelector('.c-settings-about__appicon');
    const band = d.querySelector('.c-settings-about__band');
    const tok = (n) => W.getComputedStyle(d.documentElement).getPropertyValue(n).trim();
    const res = (v) => { let x = String(v).trim(); for (let i = 0; i < 6 && /^var\(/.test(x); i++) x = tok(x.match(/^var\((--[\w-]+)/)[1]); return x; };
    const cs = (el) => W.getComputedStyle(el);
    const none = (v) => { v = String(v || '').trim(); return v === '' || v === 'none' || v === 'hidden'; };   // a width without a style paints nothing
    const STYLED = /\b(?:solid|dashed|dotted|double|groove|ridge|inset|outset)\b/;   // jsdom keeps a shorthand unexpanded: a style keyword in it = a painted edge
    const noEdge = (st) => none(st.getPropertyValue('box-shadow'))
      && ['outline-style', 'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style'].every((p) => none(st.getPropertyValue(p)))
      && ['outline', 'border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-block', 'border-inline', 'border-style'].every((p) => !STYLED.test(String(st.getPropertyValue(p) || '')));
    /* jsdom drops a shorthand whose value holds a var() (`border: 1px solid var(--x)`), so the cascade read above
       cannot see that edge: also walk every rule the BUILT page loads (its <link> sheets + <style>s) whose selector
       matches the chip ELEMENT, and refuse any edge-painting declaration in it */
    const sheetText = [...d.querySelectorAll('link[rel="stylesheet"]')].map((l) => { try { return readFileSync(join(root, 'Spixi/Resources/Raw/html', l.getAttribute('href')), 'utf8'); } catch (e) { return ''; } })
      .concat([...d.querySelectorAll('style')].map((x) => x.textContent)).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
    const declaredEdges = (el) => {
      const hits = [];
      for (const m of sheetText.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const sel = m[1].trim();
        if (!sel || sel[0] === '@') continue;
        let hit = false;
        for (const one of sel.split(',')) { try { if (el.matches(one.trim())) { hit = true; break; } } catch (e) { /* a selector jsdom cannot parse */ } }
        if (!hit) continue;
        for (const dcl of m[2].split(';')) {
          const mm = dcl.match(/^\s*((?:border|outline|box-shadow)[\w-]*)\s*:\s*([^]*?)\s*(?:!important)?\s*$/);
          if (mm && !/radius/.test(mm[1]) && !/^(?:none|0|0px|hidden|initial|unset)$/.test(mm[2].trim())) hits.push(sel + ' { ' + dcl.trim() + ' }');
        }
      }
      return hits;
    };
    const appSvg = readFileSync(join(root, 'Spixi/Resources/AppIcon/appicon.svg'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    const ground = (appSvg.match(/<rect width="1024" height="1024" fill="(#[0-9A-Fa-f]{6})"\/>/) || [])[1];
    const stops = [...appSvg.matchAll(/<stop offset="([\d.]+)" stop-color="(#[0-9A-Fa-f]{6})" stop-opacity="([\d.]+)"\/>/g)].map((m) => ({ o: +m[1], c: m[2].toLowerCase(), a: +m[3] }));
    const rad = appSvg.match(/cx="1024" cy="0" r="([\d.]+)"/);
    const sameRgba = (v, c, a) => { const x = hex(res(v)), y = hex(c); return !!x && !!y && x.every((n, i) => Math.abs(n - y[i]) < 1) && Math.abs(alpha(res(v)) - a) < 0.005; };
    /* ★ #46 r3 (MINOR-5): the band ends per theme come from the BUILT spixi.tokens.css — the `:root` block and the
       `[data-theme="dark"]` block that declare --ab-band-from/-to (exactly one each); in dark the resolved ends must be
       the DARK tokens (not the light ones inherited) and stay dark (relative luminance < 0.12 at both ends) */
    const tokCss = readFileSync(join(root, 'Spixi/Resources/Raw/html/spixi.tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const bandDecl = (selRe) => {
      const hits = [...tokCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => selRe.test(m[1].trim()) && /--ab-band-from\s*:/.test(m[2]));
      if (hits.length !== 1) return null;
      const v = (n) => ((hits[0][2].match(new RegExp(n + '\\s*:\\s*([^;]+);')) || [])[1] || '').trim().toLowerCase();
      return { from: v('--ab-band-from'), to: v('--ab-band-to') };
    };
    const BAND = { light: bandDecl(/^:root$/), dark: bandDecl(/^\[data-theme="dark"\]$/) };
    const DARK_LUM = 0.12;
    const themes = {};
    for (const th of ['light', 'dark']) {
      if (th === 'dark') d.documentElement.setAttribute('data-theme', 'dark'); else d.documentElement.removeAttribute('data-theme');
      const c = cs(chip), t = cs(tile), b = cs(band);
      const bg = (st) => String(st.getPropertyValue('background') || '') + ' ' + String(st.getPropertyValue('background-image') || '');
      const fill = res(chip ? c.getPropertyValue('background') : '');
      const bandBg = bg(b), tileBg = bg(t);
      const from = res('var(--ab-band-from)'), to = res('var(--ab-band-to)'), g0 = res('var(--ab-icon-ground)');
      themes[th] = {
        chipNoEdge: !!chip && noEdge(c) && declaredEdges(chip).length === 0,
        chipFill: !!hex(fill) && alpha(fill) === 1 && cr(res('var(--text-neutral-02)'), fill) >= 4.5 && cr(res('var(--text-accent)'), fill) >= 4.5,
        tileLauncher: !!ground && stops.length === 2 && !!rad
          && res('var(--ab-icon-ground)').toLowerCase() === ground.toLowerCase()
          && sameRgba('var(--ab-icon-light)', stops[0].c, stops[0].a) && sameRgba('var(--ab-icon-deep)', stops[1].c, stops[1].a)
          && /radial-gradient\(\s*141\.42% 141\.42% at 100% 0%,\s*var\(--ab-icon-light\) 13\.13%,\s*var\(--ab-icon-deep\) 100%\s*\)/.test(tileBg)
          && /var\(--ab-icon-ground\)/.test(tileBg)
          && Math.abs(+rad[1] / 1024 * 100 - 141.42) < 0.01 && Math.abs(stops[0].o * 100 - 13.13) < 0.001
          && !/--ab-icon-sheen|--ab-tile-a/.test(tileBg),
        bandBlue: /linear-gradient\(\s*120deg,\s*var\(--ab-band-from\) 0%,\s*var\(--ab-band-to\) 100%\s*\)/.test(bandBg) && !/glass-card-art/.test(bandBg)
          && [from, to].every((x) => { const hh = hue(x); return hh >= 205 && hh <= 225; }),
        tileStandsOff: cr(g0, from) >= 1.4 && cr(g0, to) >= 1.4,   // the launcher ground vs both band ends (the surface ring comes on top)
        bandTokens: !!BAND.light && !!BAND.dark && !!hex(BAND[th].from) && !!hex(BAND[th].to)
          && from.toLowerCase() === BAND[th].from && to.toLowerCase() === BAND[th].to
          && (th === 'light' || (BAND.dark.from !== BAND.light.from && BAND.dark.to !== BAND.light.to && lum(from) < DARK_LUM && lum(to) < DARK_LUM)),
      };
    }
    q.light = Object.values(themes.light).every(Boolean);
    q.dark = Object.values(themes.dark).every(Boolean);
    ok(q.light && q.dark,
      '★ S14 D (#1288) on the built settings.html, light + dark: the version chip has NO edge (no box-shadow / border / outline) and a filled --ab-chip with its text ≥ 4.5:1; the icon tile IS the launcher ground (appicon.svg parsed: #0076E1 + the 141.42% radial, its two stops) with no gloss; the band is the --ab-band-* launcher-blue pair (hue 205–225, no hint-art violet) and the tile stands off it; each theme resolves the band ends to ITS OWN spixi.tokens.css pair — in dark the [data-theme="dark"] pair (not the light one inherited), both ends relative luminance < 0.12. '
      + JSON.stringify({ BAND }) + ' '
      + JSON.stringify(themes));
  } finally { s.close(); }
}
