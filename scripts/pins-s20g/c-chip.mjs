/* ==== S20G N-2 (Damir 22:49 "white font in the selected chips … premiumize it", pick C) + r1 B-3 / B-4 / NIT: THE SELECTED CHIP ====
 * On the BUILT index.html (the filter chip, Spixi.createChip) and contact_details.html (the chat-info kind chip
 * Spixi.createSharedSection + the See-all tab Spixi.createSharedList), light + dark — jsdom, the pins-s19/r-cascade winner per
 * element (every rule of the built document, @supports blocks included; :active = a local winner, as pins-s20g/c-accent):
 *   (1) INK — every selected chip resolves color to var(--text-chip-selected) at rest, on hover AND on press (the generic
 *       `.c-chip:…:hover / :active` ink must not win on the chat-info chip — r1 B-3 measured it 3.44 : 1 in dark); the token =
 *       --primary-800 in light and --text-neutral-on-action (#f9fafb, luminance ≥ 0.9) in dark.
 *   (2) LIGHT — the inset top highlight `inset 0 1px 0 var(--highlight-chip-selected)` at rest (a visible white alpha); a disabled
 *       selected chip drops it (`box-shadow: none`, r1 NIT).
 *   (3) SUPPORTS — the winning background is the @supports (color-mix) gradient (the 6 % --chip-lift-ink lift over the tonal fill)
 *       and the winning border the 60 % outline (rest + hover), every one of them inside the guard.
 *   (4) CONTRAST from the token values: the ink on the gradient's top AND bottom stop ≥ 4.5 at rest, hover and press, both themes;
 *       the 60 % outline composited over the fill vs the GROUND (r1 B-4: light on white, --surface-screen and --surface-card; dark on
 *       --surface-screen and --surface-card) ≥ 3 at rest (hover / press reported).
 *   (5) chip.css + shared-items.css carry no [data-theme] selector (the theme lives in tokens.css only).
 * Deliberate breaks (S20G r1 fixer, each on the rebuilt shells): shared-items.css hover `color: var(--text-chip-selected)` deleted →
 * ink-shared (the generic hover ink wins) · chip.css rest color → var(--text-action-default) → ink-chip · the chip.css rest
 * box-shadow deleted → light-chip · `.c-chip:disabled` box-shadow deleted → light-disabled (both shells) · the chip.css @supports
 * border → var(--outline-action-default) → sup-chip · tokens.css dark --text-chip-selected → var(--text-action-hover) → ink-*-dark
 * + contrast (dark hover 3.01 / 3.44) · the tab dropped from the shared-items.css rest selector → ink-tab + light-tab ·
 * `[data-theme="dark"] .c-chip[aria-pressed="true"] {…}` added to chip.css → noThemeSelector. */
import { uiKit } from '../pins-s8/ui-kit.mjs';
import { cascade } from '../pins-s19/r-cascade.mjs';
export default async function (h) {
  const { ok, root, readFileSync, join, stripCssComments } = h;
  const { boot } = uiKit(h);
  const r = {};
  const got = { ink: {}, light: {}, sup: {}, cr: {}, edge: {} };
  const low = [];
  const splitTop = (str) => { const out = []; let dep = 0, cur = ''; for (const ch of str) { if (ch === '(') dep++; if (ch === ')') dep--; if (ch === ',' && dep === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; };
  const spec = (sel0) => { let t = sel0; for (let i = 0; i < 5; i++) t = t.replace(/:not\(([^()]*)\)/g, ' $1'); let a = 0, b = 0, c = 0;
    t = t.replace(/::[\w-]+/g, () => { c++; return ' '; }); t = t.replace(/#[\w-]+/g, () => { a++; return ' '; }); t = t.replace(/\[[^\]]*\]/g, () => { b++; return ' '; });
    t = t.replace(/\.[\w-]+/g, () => { b++; return ' '; }); t = t.replace(/:[\w-]+(\([^)]*\))?/g, () => { b++; return ' '; }); (t.match(/(^|[\s>+~])[a-zA-Z][\w-]*/g) || []).forEach(() => c++); return a * 10000 + b * 100 + c; };
  const SUPP = /color:\s*color-mix\(in srgb,\s*red,\s*blue\)/;
  const inGuard = (ru) => { for (let p = ru.parentRule; p; p = p.parentRule) if (SUPP.test(p.conditionText || '')) return true; return false; };
  const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const over = (c, g) => (c[3] >= 1 ? c : [0, 1, 2].map((i) => c[i] * c[3] + g[i] * (1 - c[3])).concat(1));
  const note = (bag, k, v) => { bag[k] = Math.min(bag[k] == null ? 99 : bag[k], +v.toFixed(2)); };
  try {
    for (const file of ['index.html', 'contact_details.html']) {
      const s = await boot(file, { wait: 1200 });
      const { W, d } = s;
      const S = W.Spixi;
      const els = {};
      try {
        if (file === 'index.html') {
          const host = d.createElement('div'); d.body.append(host);
          els.chip = S.createChip({ label: 'Unread', size: 'small', selected: true });
          els.chipOff = S.createChip({ label: 'Off', size: 'small', selected: true, disabled: true });
          host.append(els.chip, els.chipOff);
        } else {
          const T = Math.floor(Date.now() / 1000);
          const items = [{ id: 'a1', n: 0, kind: 'file', label: 'a.pdf', size: 2400, ts: T, local: true, thumb: null }, { id: 'c1', n: 0, kind: 'link', label: 'https://www.ixian.io/x', size: 0, ts: T, local: false, thumb: null }];
          const sec = S.createSharedSection({ items, strings: {}, onOpen() {}, onAll() {}, onMenu() {} });
          const list = S.createSharedList({ items, tab: 'file', strings: {}, onOpen() {}, onBack() {}, onMenu() {} });
          d.body.append(sec, list);
          els.shared = sec.querySelector('.c-shared__chip[aria-selected="true"]');
          els.tab = list.querySelector('.c-shared-list__tab[aria-selected="true"]');
          els.sharedOff = sec.querySelector('.c-shared__chip[aria-selected="false"]');
          if (els.sharedOff) { els.sharedOff.setAttribute('aria-selected', 'true'); els.sharedOff.disabled = true; }
        }
        const C = cascade(W);
        const winActive = (el, prop) => { let best = null; C.rules.forEach(({ r: ru, media }, idx) => {
          if (media.some((m) => /prefers-|min-width|max-width/.test(m))) return;
          const v = ru.style.getPropertyValue(prop); if (!v) return;
          for (const sel0 of splitTop(ru.selectorText)) { if (/:hover|::|:focus/.test(sel0)) continue; const t = sel0.replace(/:active/g, ''); let m = false; try { m = el.matches(t.trim()); } catch (e) { m = false; }
            if (!m) continue; const sp = spec(sel0); if (!best || sp > best.sp || (sp === best.sp && idx >= best.idx)) best = { sp, idx, v: v.trim(), ru }; } });
          return best || { v: '' }; };
        const winRule = (el, prop, hover) => { let best = null; C.rules.forEach(({ r: ru, media }, idx) => {
          if (media.some((m) => /prefers-|min-width|max-width/.test(m))) return;
          const v = ru.style.getPropertyValue(prop); if (!v) return;
          for (const sel0 of splitTop(ru.selectorText)) { if (/::|:active|:focus/.test(sel0)) continue; if (/:hover/.test(sel0) && !hover) continue; const t = sel0.replace(/:hover/g, ''); let m = false; try { m = el.matches(t.trim()); } catch (e) { m = false; }
            if (!m) continue; const sp = spec(sel0); if (!best || sp > best.sp || (sp === best.sp && idx >= best.idx)) best = { sp, idx, v: v.trim(), ru }; } });
          return best || { v: '' }; };
        const rootEl = d.documentElement;
        const col = (v, k = 0) => {
          v = String(v || '').trim();
          if (k > 12) return null;
          let m = /^var\((--[\w-]+)(?:,\s*(.*))?\)$/.exec(v);
          if (m) { const x = C.win(rootEl, m[1]) || W.getComputedStyle(rootEl).getPropertyValue(m[1]).trim(); return col(x || m[2] || '', k + 1); }
          m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
          if (m) { const hx = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1]; return [0, 2, 4].map((i) => parseInt(hx.slice(i, i + 2), 16)).concat(1); }
          m = /^rgba?\(([^)]*)\)$/.exec(v);
          if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] == null ? 1 : p[3]]; }
          if (/^transparent$/.test(v)) return [0, 0, 0, 0];
          m = /^color-mix\(in srgb,\s*([\s\S]*)\)$/.exec(v);
          if (m) {
            const [a, b] = splitTop(m[1]).map((part) => { const pm = /^(.*?)\s+(\d+(?:\.\d+)?)%$/.exec(part); return pm ? { c: col(pm[1], k + 1), p: +pm[2] } : { c: col(part, k + 1), p: null }; });
            if (!a.c || !b.c) return null;
            let pa = a.p, pb = b.p; if (pa == null && pb == null) { pa = 50; pb = 50; } else if (pa == null) pa = 100 - pb; else if (pb == null) pb = 100 - pa;
            const A = a.c, B = b.c, wa = pa / (pa + pb), wb = pb / (pa + pb);
            const al = A[3] * wa + B[3] * wb;
            const ch = (i) => (al ? (A[i] * A[3] * wa + B[i] * B[3] * wb) / al : 0);
            return [ch(0), ch(1), ch(2), al];
          }
          return null;
        };
        const stops = (bg) => { const m = /^linear-gradient\(([\s\S]*)\)$/.exec(bg); return m ? splitTop(m[1]).filter((x) => !/^to /.test(x)) : [bg]; };
        const sel = Object.keys(els).filter((k) => !/Off$/.test(k));
        if (sel.some((k) => !els[k])) throw new Error(file + ': a chip was not built ' + JSON.stringify(sel.map((k) => k + ':' + !!els[k])));
        for (const k of sel) {
          const el = els[k];
          const st = {
            rest: { color: winRule(el, 'color').v, bg: winRule(el, 'background'), bd: winRule(el, 'border-color'), sh: winRule(el, 'box-shadow').v },
            hover: { color: winRule(el, 'color', true).v, bg: winRule(el, 'background', true), bd: winRule(el, 'border-color', true) },
            press: { color: winActive(el, 'color').v, bg: winActive(el, 'background'), bd: winActive(el, 'border-color') },
          };
          got.ink[k] = [st.rest.color, st.hover.color, st.press.color];
          r['ink-' + k] = got.ink[k].every((v) => v === 'var(--text-chip-selected)');
          got.light[k] = st.rest.sh;
          r['light-' + k] = /^inset 0 1px 0 var\(--highlight-chip-selected\)$/.test(st.rest.sh);
          got.sup[k] = { bg: [st.rest.bg, st.hover.bg, st.press.bg].map((x) => (x.ru && inGuard(x.ru)) && /^linear-gradient\(to bottom, color-mix\(in srgb, var\(--surface-action-tonal-(default|hover)\), var\(--chip-lift-ink\) 6%\), var\(--surface-action-tonal-\1\)\)$/.test(x.v)),
            bd: [st.rest.bd, st.hover.bd].map((x) => (x.ru && inGuard(x.ru)) && /^color-mix\(in srgb, var\(--outline-action-(default|hover)\) 60%, transparent\)$/.test(x.v)) };
          r['sup-' + k] = got.sup[k].bg.concat(got.sup[k].bd).every(Boolean);
          for (const theme of ['light', 'dark']) {
            rootEl.setAttribute('data-theme', theme);
            const ink = col('var(--text-chip-selected)');
            /* light = the deep action ink; dark = the on-action white (neutral-10 #f9fafb — "white" by luminance ≥ 0.9) */
            const want = theme === 'light' ? col('var(--primary-800)') : col('var(--text-neutral-on-action)');
            const same = ink && want && [0, 1, 2, 3].every((i) => Math.abs(ink[i] - want[i]) < 1.5) && (theme === 'light' || lum(ink) >= 0.9);
            r['ink-' + k + '-' + theme] = !!same;
            if (!same) low.push(file + ' ' + k + ' ' + theme + ' ink ' + JSON.stringify(ink));
            const hl = col('var(--highlight-chip-selected)');
            if (!(hl && hl[3] > 0.05 && lum(hl) > 0.9)) { r['light-' + k] = false; low.push(theme + ' highlight ' + JSON.stringify(hl)); }
            const grounds = theme === 'light' ? { white: [255, 255, 255, 1], screen: col('var(--surface-screen)'), card: col('var(--surface-card)') } : { screen: col('var(--surface-screen)'), card: col('var(--surface-card)') };
            for (const state of ['rest', 'hover', 'press']) {
              const fills = stops(st[state].bg.v).map((x) => col(x));
              const bd = col(st[state].bd.v);
              if (!ink || fills.some((f) => !f) || !bd) { low.push(file + ' ' + k + ' ' + theme + ' ' + state + ' unresolved'); r['cr-' + k] = false; continue; }
              for (const f of fills) {
                const v = cr(ink, over(f, grounds.screen));
                note(got.cr, theme + '-' + state, v);
                if (v < 4.5) low.push(file + ' ' + k + ' ' + theme + ' ' + state + ' ink ' + v.toFixed(2));
                for (const [gn, g] of Object.entries(grounds)) {
                  const e = cr(over(bd, over(f, g)), g);
                  note(got.edge, theme + '-' + state + '-' + gn, e);
                  if (state === 'rest' && e < 3) low.push(file + ' ' + k + ' ' + theme + ' edge/' + gn + ' ' + e.toFixed(2));
                }
              }
            }
          }
          rootEl.setAttribute('data-theme', 'light');
        }
        /* the disabled selected chip */
        const off = els.chipOff || els.sharedOff;
        got.light[file + '-disabled'] = off ? winRule(off, 'box-shadow').v : 'missing';
        r['light-disabled-' + file] = !!off && got.light[file + '-disabled'] === 'none';
        if (s.errs.some((e) => /ReferenceError|TypeError|SyntaxError/.test(e))) { r['noErr-' + file] = false; low.push(s.errs.slice(0, 2).join(' | ')); }
      } finally { W.close(); }
    }
    r.contrast = low.length === 0;
    /* (5) no theme selector in the component files */
    const noTheme = ['chip.css', 'shared-items.css'].map((f) => !/\[data-theme/.test(stripCssComments(readFileSync(join(root, 'src/styles/components', f), 'utf8'))));
    r.noThemeSelector = noTheme.every(Boolean);
  } catch (e) { r.err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
  ok(Object.values(r).length >= 12 && Object.values(r).every((v) => v === true),
    '★ S20G N-2 (+ r1 B-3 / B-4 / NIT): on the built index.html + contact_details.html, light + dark, the selected filter chip, chat-info kind chip and See-all tab paint --text-chip-selected (primary-800 light · the on-action white #f9fafb dark) at rest, hover and press, carry the top highlight (dropped when disabled), the @supports gradient + 60 % outline; ink MIN ' + JSON.stringify(got.cr)
    + ' (≥ 4.5) · outline-vs-ground MIN ' + JSON.stringify(got.edge) + ' (rest ≥ 3) — ' + JSON.stringify({ r, ink: got.ink, light: got.light, sup: got.sup }) + (low.length ? ' LOW(' + low.length + '): ' + low.slice(0, 8).join(' | ') : ''));
}
