/* ==== #1360 (Damir 2026-10-12, sheet A "Keep, colour the choices") — the Add contact chooser sheet ====
 * On the BUILT index.html (jsdom), through the real path: FAB → New chat picker → "Add contact" → the sheet.
 *   · the two medallions resolve to DIFFERENT hub fills — scan = --disc-hub-8 (violet), enter = --disc-hub-7 (blue) — and
 *     neither is the neutral --surface-neutral-04 tile they wore before; the glyph ink is white;
 *   · no rule tints the medallion on hover any more (the hub fill stays); the card's own hover pair is kept;
 *   · no chevron in either item.
 * Deliberate breaks (#1360 report): the scan fill → --disc-hub-7 (the "different" clause fails); the two kind rules deleted
 * (the "not neutral" clause fails); the old tonal hover rule put back (the hover clause fails). */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  const r = {};
  let s = null;
  try {
    s = await K.boot('index.html', { wait: 1200 });
    const { d, W } = s;
    d.getElementById('fab').click();
    await sleep(500);
    const row = [...d.querySelectorAll('.c-contacts .c-contacts__action')].find((x) => /Add contact/.test(x.textContent || ''));
    if (row) row.click();
    await sleep(300);
    const sheet = d.querySelector('.c-sheet--add-contact');
    const med = (k) => sheet && sheet.querySelector('.c-contacts-addsheet__item[data-kind="' + k + '"] .c-contacts-addsheet__medallion');
    const root = W.getComputedStyle(d.documentElement);
    const res = (v) => { let x = String(v || ''); for (let i = 0; i < 8 && /var\(/.test(x); i++) x = x.replace(/var\((--[\w-]+)\)/g, (_, n) => root.getPropertyValue(n).trim()); return x.trim(); };
    const fill = (el) => (el ? res(W.getComputedStyle(el).getPropertyValue('background')) : '');
    const scan = med('scan'), enter = med('enter');
    const fs = fill(scan), fe = fill(enter);
    const neutral = res('var(--surface-neutral-04)'), hub8 = res('var(--disc-hub-8)'), hub7 = res('var(--disc-hub-7)');
    r.path = !!sheet && !!scan && !!enter;
    r.different = !!fs && !!fe && fs !== fe && fs === hub8 && fe === hub7 && /gradient/.test(hub8) && /gradient/.test(hub7);
    r.notNeutral = !!fs && !!fe && fs !== neutral && fe !== neutral && !!neutral;
    r.whiteGlyph = !!scan && W.getComputedStyle(scan).color === 'rgb(255, 255, 255)' && W.getComputedStyle(enter).color === 'rgb(255, 255, 255)';
    /* hover: walk every rule (inside @media too) — none may repaint the medallion under :hover; the card's hover pair stays */
    const all = [];
    const walk = (rules) => { for (const x of rules) { if (x.selectorText) all.push(x); else if (x.cssRules) walk(x.cssRules); } };
    for (const sh of d.styleSheets) { try { walk(sh.cssRules); } catch (e) { /* cross-origin */ } }
    const medHover = all.filter((x) => /:hover[^,]*addsheet__medallion/.test(x.selectorText) && (x.style.getPropertyValue('background') || x.style.getPropertyValue('background-color') || x.style.getPropertyValue('color')));
    const cardHover = all.filter((x) => /\.c-contacts-addsheet__item:hover$/.test(x.selectorText.trim()) && /--surface-sheet-card-hover/.test(x.style.getPropertyValue('background')));
    r.hoverKeepsFill = medHover.length === 0 && cardHover.length === 1;
    r.noChevron = !!sheet && [...sheet.querySelectorAll('.c-contacts-addsheet__item')].every((it) => it.querySelectorAll('svg').length === (it.dataset.kind === 'scan' ? 2 : 1));
  } catch (e) { r.threw = e.message; }
  finally { if (s && s.close) s.close(); }
  const clause = (k, msg) => ok(r[k] === true, msg + ' — ' + JSON.stringify({ [k]: r[k], threw: r.threw }));
  clause('path', '★ #1360: the real path opens the chooser (FAB → New chat → Add contact)');
  clause('different', '★ #1360 (sheet A): the two medallions resolve to DIFFERENT hub fills — scan --disc-hub-8 (violet), enter --disc-hub-7 (blue)');
  clause('notNeutral', '★ #1360 (sheet A): neither medallion is the neutral --surface-neutral-04 tile any more');
  clause('whiteGlyph', '★ #1360 (sheet A): the medallion glyph ink is white on the hub fill');
  clause('hoverKeepsFill', '★ #1360 (sheet A): no rule repaints the medallion under :hover (the hub fill stays); the card keeps its --surface-sheet-card-hover pair');
  clause('noChevron', '★ #1360 (sheet A): no chevron — the scan medallion holds its two glyphs (frame + qrcode), the pencil one, and nothing else');
}
