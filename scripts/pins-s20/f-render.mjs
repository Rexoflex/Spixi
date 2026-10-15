/* ==== S20 F (#1378) — formatted messages on the BUILT chat.html (jsdom, a group) ====
 * An INCOMING row `*bold @Me and https://ixian.io* _it_ ~st~ `code https://x.io` <img src=x onerror=…>` and an OUTGOING
 * row with a ``` block:
 *   · bold = strong.c-fmt-b and the mention pill + the link button still work INSIDE it (the format pass runs before
 *     mentions + linkify and hands them the plain runs); italic = em.c-fmt-i, strike = s.c-fmt-s
 *   · inline code = code.c-fmt-code holding the text as typed — no link button, no mention inside
 *   · the block = pre.c-fmt-pre "const a = *1*;" (no mark parsed inside), the text either side without blank lines
 *   · XSS: the `<img onerror>` stays TEXT — no img element in the bubble, the handler never ran, and no innerHTML /
 *     outerHTML / insertAdjacentHTML write carried the message text (a setter spy over the whole render)
 *   · the look (cascade winners on the built document): bold = var(--font-weight-semibold) (600); ★ S20F W-11 (#1409): the
 *     code chip has NO fill (an inset outline in var(--fmt-rule) = --outline-fmt-code on the received bubble); the block fill
 *     = var(--surface-wash-on-hero) on the sent one; the block
 *     = white-space pre-wrap + overflow-wrap anywhere + max-width 100%, no overflow-x (★ S20G F-5 (b) re-base: it WRAPS inside the
 *     bubble; was white-space pre + overflow-x auto, the sideways scroll)
 *   · markup INSIDE a mark / a code chip / a block (`*<b>x</b>*`, `<img onerror>` in backticks, `<i>` in a ```) stays text
 * Deliberate breaks (S20 F report): renderFormat writes the code chip with innerHTML → the XSS clauses fail · the bubble
 * back on the old linkifyInto(body, text…) → the bold / code clauses fail · onText called for code → the code clause fails ·
 * the sent background rule deleted → the look clause fails · (S20F re-base) the chip's quote fill put back → the look clause fails. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
import { cascade } from '../pins-s19/r-cascade.mjs';
export default async function (h) {
  const { ok } = h;
  const K = b1Kit(h);
  const IN = '*bold @Me and https://ixian.io* _it_ ~st~ `code https://x.io` <img src=x onerror="window.__fmtPwned=1">';
  const OUT = 'see:\n```\nconst a = *1*;\n```\nend';
  const HTML = '*<b>x</b>* `<img src=y onerror="window.__fmtPwned=2">`\n```\n<i>z</i>\n```';
  const k = {};
  let s = null;
  const html = [];
  try {
    s = await K.open({ group: true, rows: false,
      before: (s0) => {
        const W = s0.W;
        /* the innerHTML-class spy: any HTML-parsing write that carries the message text */
        const P = W.Element.prototype;
        for (const prop of ['innerHTML', 'outerHTML']) {
          const desc = Object.getOwnPropertyDescriptor(P, prop);
          if (!desc || !desc.set) continue;
          Object.defineProperty(P, prop, { configurable: true, get: desc.get, set(v) { if (/onerror|ixian\.io|const a/.test(String(v))) html.push(prop); return desc.set.call(this, v); } });
        }
        const iah = P.insertAdjacentHTML;
        P.insertAdjacentHTML = function (pos, v) { if (/onerror|ixian\.io|const a/.test(String(v))) html.push('insertAdjacentHTML'); return iah.call(this, pos, v); };
      },
      hist: (s0) => {
        s0.push('addThem', 'f1', 'addrAna', 'Ana', '', IN, String(K.T0), 'True', 'True', 'True', 'False', 'False');
        s0.push('addMe', 'f2', 'addrMe', 'Me', '', OUT, String(K.T0 + 60), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '');
        s0.push('addThem', 'f3', 'addrAna', 'Ana', '', HTML, String(K.T0 + 120), 'True', 'True', 'True', 'False', 'False');
      } });
    const { d, W } = s;
    const t1 = K.rowOf(d, 'f1') && K.rowOf(d, 'f1').querySelector('.c-bubble__text');
    const t2 = K.rowOf(d, 'f2') && K.rowOf(d, 'f2').querySelector('.c-bubble__text');
    const b = t1 && t1.querySelector(':scope > strong.c-fmt-b');
    const link = b && b.querySelector('.c-bubble__link');
    const men = b && b.querySelector('.c-bubble__mention');
    k.bold = !!b && /^bold @Me and /.test(b.textContent) && !!link && link.title === 'https://ixian.io' && !!men && men.textContent === '@Me';
    k.italicStrike = !!t1 && !!t1.querySelector(':scope > em.c-fmt-i') && t1.querySelector(':scope > em.c-fmt-i').textContent === 'it'
      && !!t1.querySelector(':scope > s.c-fmt-s') && t1.querySelector(':scope > s.c-fmt-s').textContent === 'st';
    const code = t1 && t1.querySelector(':scope > code.c-fmt-code');
    k.code = !!code && code.textContent === 'code https://x.io' && code.children.length === 0;
    const t3 = K.rowOf(d, 'f3') && K.rowOf(d, 'f3').querySelector('.c-bubble__text');
    /* markup INSIDE a mark, a code chip and a block stays text too */
    k.xssInside = !!t3 && !t3.querySelector('img, b, i') && (t3.querySelector('strong') || {}).textContent === '<b>x</b>'
      && (t3.querySelector('code') || {}).textContent === '<img src=y onerror="window.__fmtPwned=2">' && (t3.querySelector('pre') || {}).textContent === '<i>z</i>';
    k.xss = !!t1 && !t1.querySelector('img') && !d.querySelector('#messages img[src="x"]') && W.__fmtPwned === undefined
      && t1.textContent.endsWith('<img src=x onerror="window.__fmtPwned=1">') && html.length === 0;
    const pre = t2 && t2.querySelector(':scope > pre.c-fmt-pre');
    k.block = !!pre && pre.textContent === 'const a = *1*;' && !pre.querySelector('strong') && t2.textContent === 'see:const a = *1*;end';
    const C = cascade(W);
    const pre2 = pre;
    k.look = !!b && C.win(b, 'font-weight') === 'var(--font-weight-semibold)'
      && !!code && !C.win(code, 'background') && C.win(code, '--fmt-rule') === 'var(--outline-fmt-code)'   /* ★ S20F W-11 (#1409): NO fill — an inset outline (pins-s20f/c-code); was the quote fill */
      && /var\(--fmt-rule\)/.test(C.win(code, 'box-shadow'))
      && !!pre2 && C.win(pre2, 'background') === 'var(--surface-wash-on-hero)'
      && C.win(pre2, 'white-space') === 'pre-wrap' && C.win(pre2, 'overflow-wrap') === 'anywhere' && !C.win(pre2, 'overflow-x') && C.win(pre2, 'max-width') === '100%'   /* ★ S20G F-5 (b) re-base: the block WRAPS (was pre + overflow-x auto) */
      && C.win(code, 'font-family') === 'var(--font-mono)';
    k.noErr = K.noErr(s.errs);
    k._dbg = Object.entries(k).filter(([, v]) => v !== true).length ? (t1 && t1.outerHTML) + ' || ' + (t2 && t2.outerHTML) + ' || html=' + html.join(',') : '';
  } catch (e) { k.err = e.message; }
  finally { if (s) s.W.close(); }
  const dbg = k._dbg; delete k._dbg;
  ok(Object.values(k).every((x) => x === true),
    '★ S20 F (#1378): formatted rows on the BUILT chat.html — bold / italic / strike / code / a ``` block, a mention + a link INSIDE bold, nothing parsed inside code, the <img onerror> stays text (no HTML write), the outline chip (no fill, S20F W-11) + the block fill per direction' +
    (Object.values(k).every((x) => x === true) ? '' : ' — ' + JSON.stringify(k) + ' ' + dbg));
}
