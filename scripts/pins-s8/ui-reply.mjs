/* ==== SESSION 8 (S2) — ★ S8 (#1236) THE REPLY EXCERPT IN THE CHATS LIST ====
 * On the BUILT home shell (index.html, jsdom), fed by addChat (excerptKind = arg 11, excerptSender = arg 12):
 *   · excerptKind `reply` → the row's excerpt is type `reply`: the arrow-back-up glyph (aria-hidden) leads, the BODY
 *     shows, and a visually-hidden "Reply:" prefix sits inside the text so a screen reader says it
 *   · the body passes the B4 canon (an address-shaped token is truncated, never shown whole — like a `text` excerpt)
 *   · a group keeps its sender before the glyph; an unknown kind still falls through to `text` (no glyph, no prefix)
 * Deliberate breaks: see the S8 S2 hand-back. */
import { uiKit } from './ui-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = uiKit(h);
  const ADDR = 'Zzzz9999999999999999999999999999999999xyz';
  try {
    const s = await boot('index.html', { mobile: true, wait: 1200 });
    const { d, push } = s;
    const N = Math.floor(Date.now() / 1000);
    const row = (a, n, ex, dt, kind, sender) => [a, n, String(N - dt), '', 'True', ex, 'default', '0', '', 'False', kind, sender || '', 'False'];
    push('clearChats');
    push('addChat', ...row('Aaaa1111111111111111111111111111111111', 'Ana', 'Sure, 12:30 works', 60, 'reply'));
    push('addChat', ...row('Bbbb1111111111111111111111111111111111', 'Bor', 'pay ' + ADDR + ' please', 120, 'reply'));
    push('addChat', ...row('Cccc1111111111111111111111111111111111', 'Weekend trip', 'Booked the cabin', 180, 'reply', 'Cene'));
    push('addChat', ...row('Dddd1111111111111111111111111111111111', 'Dora', 'plain words', 240, 'replyish'));
    push('addChat', ...row('Eeee1111111111111111111111111111111111', 'Eva', 'https://media.tenor.com/abc123/party.gif', 300, 'reply'));   // ★ S8 r1
    push('clearChatsDone');
    await sleep(400);
    const ex = (addr) => d.querySelector('.c-chatlist-item[data-address="' + addr + '"] .c-excerpt');
    const a = ex('Aaaa1111111111111111111111111111111111');
    const svgA = a && a.querySelector(':scope > svg');
    const srA = a && a.querySelector('.c-excerpt__text .c-excerpt__sr');
    const r = {
      type: a && a.dataset.type,
      glyph: !!svgA && svgA.getAttribute('aria-hidden') === 'true' && !!svgA.querySelector('*') && svgA.outerHTML === s.W.SpixiIcons.icon('arrow-back-up', { size: 16 }).outerHTML,
      prefix: srA ? srA.textContent : null,
      text: a ? a.querySelector('.c-excerpt__text').textContent : '',
    };
    ok(r.type === 'reply' && r.glyph, '★ S8 #1236 reply excerpt: kind reply → type reply with the aria-hidden arrow-back-up glyph');
    ok(r.prefix === 'Reply: ' && r.text === 'Reply: Sure, 12:30 works', '★ S8 #1236 reply excerpt: the body shows after a visually-hidden "Reply:" prefix — ' + JSON.stringify(r.text));
    const b = ex('Bbbb1111111111111111111111111111111111');
    const bt = b ? b.textContent : '';
    ok(!!b && !bt.includes(ADDR) && bt.includes('pay '), '★ S8 #1236 reply excerpt: an address in the body is truncated (B4 canon) — ' + JSON.stringify(bt));
    const c = ex('Cccc1111111111111111111111111111111111');
    const kids = c ? [...c.children].map((e) => (e.tagName.toLowerCase() === 'svg' ? 'svg' : e.className)) : [];
    ok(kids.join(',') === 'c-excerpt__sender,svg,c-excerpt__text' && /^Cene/.test(c.textContent), '★ S8 #1236 reply excerpt: a group keeps its sender first, then the glyph, then the text — ' + kids.join(','));
    const dd = ex('Dddd1111111111111111111111111111111111');
    ok(!!dd && dd.dataset.type === 'text' && !dd.querySelector('svg') && !dd.querySelector('.c-excerpt__sr'), '★ S8 #1236 reply excerpt: an unknown kind still falls through to a plain text excerpt');
    /* ★ S8 r1 (B-NIT): a reply whose body is a lone GIF link → the reply glyph + "GIF" (the `text` kind's GIF mapping), never the URL */
    const e = ex('Eeee1111111111111111111111111111111111');
    const eSvg = e && e.querySelector(':scope > svg');
    const eText = e ? e.querySelector('.c-excerpt__text').textContent : '';
    ok(!!e && e.dataset.type === 'reply' && !!eSvg && eSvg.outerHTML === s.W.SpixiIcons.icon('arrow-back-up', { size: 16 }).outerHTML
      && eText === 'Reply: GIF' && !e.textContent.includes('tenor'),
    '★ S8 #1236 reply excerpt: a reply whose body is a GIF link shows the reply glyph + "GIF", not the link — ' + JSON.stringify(eText));
    s.dom.window.close();
  } catch (e) {
    ok(false, '★ S8 #1236 reply excerpt: pin threw — ' + (e && e.stack || e));
  }
}
