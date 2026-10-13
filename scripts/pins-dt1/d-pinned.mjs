/* ==== #1393 (WALK DT-1, Damir 2026-10-13: "when pinned there's no space between and hover looks same as pinned") ====
 * On the BUILT index.html (jsdom, the cascade helper — jsdom cannot hover, so the winner is computed the browser's way):
 *   · GAP: a desktop row and a desktop request card take margin-block 1px (2 px between two rounded rows); a phone row
 *     takes none;
 *   · HOVER: under the pointer (the wrapper's :hover, and the #1171 [data-hover] carry) a PINNED row paints
 *     --surface-pinned-hover, an unpinned row --surface-interactive-hover, the SELECTED pinned row its own
 *     --surface-action-tonal-default (#353); at rest a pinned row keeps --surface-pinned;
 *   · TOKEN: --surface-pinned-hover is declared in the built stylesheet in BOTH themes (an undefined custom property
 *     computes to transparent — the #813 trap) and is stronger than --surface-pinned (a larger alpha, the same ink).
 * Deliberate breaks: docs/review-brief-dt1-r2.md §5. */
import { aKit } from '../pins-s11/a-kit.mjs';
import { cascade } from '../pins-s19/r-cascade.mjs';
export default async function (h) {
  const { ok, sleep, root, readFileSync, join } = h;
  const K = aKit(h);
  const r = {}, n = {};
  const TS = Math.floor(Date.now() / 1000);
  const row = (a, name, dt) => [a, name, String(TS - dt), 'img/spixiavatar.png', 'false', 'hi', '', '0', '', 'False', 'text', ''];
  const flush = (push) => { push('clearChats'); for (const [a, nm, dt] of [['A1', 'Mira', 60], ['A2', 'Falcon', 600], ['B1', 'Jonas', 1200]]) push('addChat', ...row(a, nm, dt)); push('clearChatsDone'); };
  let s = null;
  try {
    s = await K.boot('index.html', { desktop: true, wait: 1200, storage: { 'spixi.pins': JSON.stringify(['A1', 'A2']) } });
    flush(s.push); await sleep(300);
    const { win } = cascade(s.W);
    const item = (a) => s.d.querySelector('.c-chatlist-item[data-address="' + a + '"]');
    const wrap = (a) => s.d.querySelector('.c-chatlist-row[data-row-address="' + a + '"]');
    n.pinnedAttr = !!item('A1') && item('A1').hasAttribute('data-pinned') && !item('B1').hasAttribute('data-pinned');
    n.gap = win(item('B1'), 'margin-block');
    n.rest = { pin: win(item('A1'), 'background-color'), plain: win(item('B1'), 'background-color') };
    n.hover = { pin: win(item('A1'), 'background-color', { hover: true }), plain: win(item('B1'), 'background-color', { hover: true }) };
    /* the #1171 carry: [data-hover] on the wrapper, no :hover */
    wrap('A2').setAttribute('data-hover', '');
    n.carry = win(item('A2'), 'background-color');
    wrap('A2').removeAttribute('data-hover');
    /* the selected pinned row keeps its own paint under the pointer */
    item('A1').setAttribute('aria-current', 'true');
    n.selHover = win(item('A1'), 'background-color', { hover: true });
    item('A1').removeAttribute('aria-current');
    r.gap = n.gap === '1px';
    r.rest = n.rest.pin === 'var(--surface-pinned)' && n.rest.plain === 'transparent';
    r.hover = n.pinnedAttr && n.hover.pin === 'var(--surface-pinned-hover)' && n.hover.plain === 'var(--surface-interactive-hover)';
    r.carry = n.carry === 'var(--surface-pinned-hover)';
    r.selected = n.selHover === 'var(--surface-action-tonal-default)';
    /* a request card in the same list takes the same gap (the CSS rule, read from the built document) */
    const css = [...s.d.querySelectorAll('style')].map((x) => x.textContent).join('\n');
    r.requestGap = /:root\[data-desktop\] \.c-chats-list > \.c-contact-request \{[^}]*margin-block: 1px;/.test(css);
    s.close(); s = null;

    /* the phone: no gap */
    s = await K.boot('index.html', { desktop: false, wait: 1200, storage: { 'spixi.pins': JSON.stringify(['A1']) } });
    flush(s.push); await sleep(300);
    const c2 = cascade(s.W);
    n.phoneGap = c2.win(s.d.querySelector('.c-chatlist-item[data-address="B1"]'), 'margin-block');
    r.phone = !s.d.documentElement.hasAttribute('data-desktop') && n.phoneGap === '';
    s.close(); s = null;

    /* the token, both themes, in the BUILT stylesheet; stronger than the rest wash */
    const tok = readFileSync(join(root, 'Spixi/Resources/Raw/html/spixi.tokens.css'), 'utf8');
    const decl = [...tok.matchAll(/--surface-pinned-hover: rgba\((\d+), (\d+), (\d+), ([\d.]+)\);/g)].map((m) => m.slice(1).map(Number));
    const rest = [...tok.matchAll(/--surface-pinned: rgba\((\d+), (\d+), (\d+), ([\d.]+)\);/g)].map((m) => m.slice(1).map(Number));
    n.tok = { decl, rest };
    r.token = decl.length === 2 && rest.length === 2 && decl.every((d, i) => d[0] === rest[i][0] && d[1] === rest[i][1] && d[2] === rest[i][2] && d[3] > rest[i][3] && d[3] <= 0.12);
  } catch (e) {
    r.threw = false;
    n.err = String(e && e.stack || e).slice(0, 400);
  } finally {
    if (s) s.close();
  }
  ok(Object.values(r).length >= 7 && Object.values(r).every(Boolean),
    '★ #1393 (WALK DT-1): desktop rows have a 2 px gap (margin-block 1px; request cards too; the phone none) and a pinned row shows the pointer — --surface-pinned-hover under :hover and the [data-hover] carry, the selected row keeps its own paint, the rest wash unchanged; the token is in the built stylesheet in both themes, the same ink as the pinned wash with a larger alpha — ' + JSON.stringify({ r, n }));
}
