/* ==== S19 F7 (#1371, Damir S18 walk: "the Apps grid has no hover") — the grid CARD hovers on the card pair ====
 * On the BUILT index.html (jsdom): real app items (W.Spixi.createAppItem, grid + list) under the shipped CSS; the winning
 * declaration per simulated state is computed by r-cascade.mjs (jsdom cannot hover).
 *   · grid, hovered: the WRAPPER (the whole card — the ⋮ / ⓘ sit inside it) wins --surface-card-hover; __open's own hover wash
 *     is transparent in grid; the card pair is a visible step on the grid card colour in BOTH themes (≥ 1.1 : 1);
 *   · grid, pressed (wrapper data-pressed / data-pressfade): the shared press layer (__open::before) wins
 *     --surface-card-pressed — at rest, under the pointer and under reduced motion; __open fills the card (wrapper padding 0,
 *     __open radius inherit) so the layer covers the card edge to edge; a SELECTED card keeps its tonal press;
 *   · list rows unchanged: __open hovers --surface-interactive-hover, presses --surface-press-row / -hover, the wrapper paints
 *     nothing on hover.
 * Deliberate breaks (S19 F7 report): the grid wrapper :hover rule deleted (gridHover fails) · the grid __open transparent
 * rule deleted (gridOpenClear fails) · the grid press rule deleted (gridPress fails). */
import { aKit } from '../pins-s11/a-kit.mjs';
import { cascade } from './r-cascade.mjs';
export default async function (h) {
  const { ok } = h;
  const K = aKit(h);
  const r = {}, n = {};
  let s = null;
  try {
    s = await K.boot('index.html', { wait: 1200 });
    const { W, d } = s;
    const mk = (layout) => { const el = W.Spixi.createAppItem({ id: 'a-' + layout, name: 'Demo', creator: 'Ixian', layout, onOpen() {}, onMenu() {} }); d.body.append(el); return el; };
    const grid = mk('grid'), list = mk('list');
    const gOpen = grid.querySelector('.c-app-item__open'), lOpen = list.querySelector('.c-app-item__open');
    const { win } = cascade(W);
    const bg = 'background-color';
    n.gridHover = win(grid, bg, { hover: true });
    n.gridRest = win(grid, bg);
    n.gridOpenHover = win(gOpen, bg, { hover: true });
    r.gridHover = n.gridHover === 'var(--surface-card-hover)' && n.gridRest === 'var(--surface-neutral-02)';
    r.gridOpenClear = n.gridOpenHover === 'transparent';
    /* the pair must be a VISIBLE step on the grid card, both themes */
    const R = d.documentElement;
    const res = (v) => { let x = String(v || ''); for (let i = 0; i < 8 && /var\(/.test(x); i++) x = x.replace(/var\((--[\w-]+)\)/g, (_, k) => W.getComputedStyle(R).getPropertyValue(k).trim()); return x.trim(); };
    const hex = (v) => { const m = /^#([0-9a-f]{6})$/i.exec(v); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; };
    const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const step = {};
    for (const th of ['light', 'dark']) {
      R.setAttribute('data-theme', th);
      const card = hex(res('var(--surface-neutral-02)')), hov = hex(res('var(--surface-card-hover)')), pr = hex(res('var(--surface-card-pressed)'));
      step[th] = card && hov && pr ? { hover: +cr(card, hov).toFixed(3), pressed: +cr(card, pr).toFixed(3) } : null;
    }
    n.step = step;
    r.visible = ['light', 'dark'].every((th) => step[th] && step[th].hover >= 1.1 && step[th].pressed > step[th].hover);
    /* pressed */
    const pressRow = (wrap, open, attr) => {
      wrap.setAttribute(attr[0], attr[1]);
      const o = { rest: win(open, 'background', { pseudo: true }), hover: win(open, 'background', { pseudo: true, hover: true }), reduce: win(open, 'background', { pseudo: true, reduce: true }) };
      wrap.removeAttribute(attr[0]);
      return o;
    };
    n.gridPressed = pressRow(grid, gOpen, ['data-pressed', 'row']);
    n.gridFade = pressRow(grid, gOpen, ['data-pressfade', 'hold']);
    r.gridPress = [n.gridPressed, n.gridFade].every((o) => o.rest === 'var(--surface-card-pressed)' && o.hover === 'var(--surface-card-pressed)' && o.reduce === 'var(--surface-card-pressed)');
    gOpen.setAttribute('aria-current', 'true');
    n.gridSelected = pressRow(grid, gOpen, ['data-pressed', 'row']);
    gOpen.removeAttribute('aria-current');
    r.gridSelectedTonal = n.gridSelected.rest === 'var(--surface-action-tonal-pressed)';
    n.fill = { wrapPad: win(grid, 'padding'), openPad: win(gOpen, 'padding'), openRadius: win(gOpen, 'border-radius') };
    r.fill = /^0(px)?$/.test(n.fill.wrapPad) && n.fill.openPad === 'var(--spacing-12)' && n.fill.openRadius === 'inherit';
    /* list rows: today's screen pair */
    n.list = { wrapHover: win(list, bg, { hover: true }), openHover: win(lOpen, bg, { hover: true }), press: pressRow(list, lOpen, ['data-pressed', 'row']) };
    r.listUnchanged = n.list.wrapHover === '' && n.list.openHover === 'var(--surface-interactive-hover)'
      && n.list.press.rest === 'var(--surface-press-row)' && n.list.press.hover === 'var(--surface-press-row-hover)';
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.threw = e.message; }
  finally { if (s) s.close(); }
  const c = (k, m) => ok(r[k] === true, m + ' — ' + JSON.stringify(r[k] === true ? { [k]: true } : { [k]: r[k], threw: r.threw, n }).slice(0, 1200));
  c('gridHover', '★ S19 F7 (#1371): a hovered GRID card paints --surface-card-hover on the WRAPPER (the whole card, ⋮ / ⓘ included); at rest it keeps --surface-neutral-02');
  c('gridOpenClear', '★ S19 F7: the grid __open paints NO hover wash of its own (transparent) — the old --surface-interactive-hover was the card\'s own colour (1.00 : 1)');
  c('visible', '★ S19 F7: the card pair is a visible step on the grid card in BOTH themes (hover ≥ 1.1 : 1, pressed beyond hover), computed');
  c('gridPress', '★ S19 F7: a pressed grid card (data-pressed / data-pressfade) wins --surface-card-pressed on the shared press layer — at rest, under the pointer and under reduced motion');
  c('gridSelectedTonal', '★ S19 F7: a SELECTED grid card ([aria-current]) keeps its tonal press');
  c('fill', '★ S19 F7: __open fills the grid card (wrapper padding 0, __open padding --spacing-12 = the old 4 + 8, radius inherit) — the press layer covers the card edge to edge');
  c('listUnchanged', '★ S19 F7: LIST rows unchanged — __open hovers --surface-interactive-hover, presses --surface-press-row (-hover under the pointer), the wrapper paints nothing');
  c('noErr', '★ S19 F7: no page error');
}
