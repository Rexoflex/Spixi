/* ==== S20 F — the #46 round 1 fixes (#1378), on the BUILT chat.html (jsdom) ====
 * MINOR-1 URLS: formatting never splits a URL linkify would link — `…/blob/main/__init__.py` and `https://site.com/*promo*`
 *   are ONE link each whose target is the URL as written (no em / strong inside); `*https://ixian.io*` is still a bold link;
 *   the reply quote of the __init__.py row keeps the URL intact (strip = the same grammar).
 * NIT dir: code chips and ``` blocks carry dir="ltr" (an isolated LTR run inside an RTL message).
 * MINOR-2 UNWRAP: the Aa bar unwraps only a pair the grammar matched as ONE node of that kind — select all of
 *   `*a* and *b*` + Bold wraps (never `a* and *b`); `b` in `a*b*c` + Bold keeps both literal stars; Code on `x `y` z`
 *   makes a ``` block (never `` `x `y` z` ``); a real `*hi*` still unwraps (selection inside and outside the marks).
 * MINOR-3 IME: between compositionstart and compositionend a bar button and Ctrl+B (desktop) change nothing; after
 *   compositionend they work again.
 * Motion lens: the bar closes AT ONCE when focus moves to a control outside the composer (no settle timer) and stays
 *   when focus goes nowhere (relatedTarget null).
 * Deliberate breaks (S20 F #46 r1 report): the inUrl mask dropped from the emphasis scan → the URL clause fails · the
 *   `c.dir = 'ltr'` line removed → the dir clause fails · the isNode test replaced by the old char test → the unwrap
 *   clause fails · the `composing` guard removed from the click → the IME clause fails · the focusout close put back
 *   behind a timer → the focusout clause fails. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = b1Kit(h);
  const INIT = 'https://github.com/x/y/blob/main/__init__.py';
  const PROMO = 'https://site.com/*promo*';
  const r = {};
  let s = null;
  const close = () => { if (s) { try { s.W.close(); } catch (_) {} s = null; } };
  try {
    s = await K.open({ group: false, mobile: false, rows: false, caps: 'reply,edit', hist: (s0) => {
      s0.push('addThem', 'u1', 'addrPeer', 'Ana', '', 'see ' + INIT + ' now', String(K.NOW - 300), 'True', 'True', 'True', 'False', 'False');
      s0.push('addThem', 'u2', 'addrPeer', 'Ana', '', PROMO, String(K.NOW - 240), 'True', 'True', 'True', 'False', 'False');
      s0.push('addThem', 'u3', 'addrPeer', 'Ana', '', '*https://ixian.io* `x` and\n```\ncode\n```', String(K.NOW - 200), 'True', 'True', 'True', 'False', 'False');
      s0.push('addMe', 'u4', 'addrMe', 'Me', '', 'ok', String(K.NOW - 100), 'True', 'True', 'True', 'False', 'False', '', 'u1', '', '', '', '');
    } });
    const { d, W } = s;
    const txt = (id) => K.rowOf(d, id) && K.rowOf(d, id).querySelector('.c-bubble__text');
    const links = (id) => [...(txt(id) ? txt(id).querySelectorAll('.c-bubble__link') : [])].map((b) => b.title);
    const t3 = txt('u3');
    const bl = t3 && t3.querySelector('strong.c-fmt-b > .c-bubble__link');
    r.urls = JSON.stringify(links('u1')) === JSON.stringify([INIT]) && !txt('u1').querySelector('em, strong')
      && JSON.stringify(links('u2')) === JSON.stringify([PROMO]) && !txt('u2').querySelector('em, strong')
      && !!bl && bl.title === 'https://ixian.io';
    const q = K.rowOf(d, 'u4') && K.rowOf(d, 'u4').querySelector('.c-bubble__reply-text');
    r.quote = !!q && q.textContent === 'see ' + INIT + ' now';
    r.dir = !!t3 && (t3.querySelector('code.c-fmt-code') || {}).dir === 'ltr' && (t3.querySelector('pre.c-fmt-pre') || {}).dir === 'ltr';

    /* MINOR-2 — the bar's unwrap */
    const inp = d.querySelector('.c-composer__input');
    const aa = d.querySelector('.c-fmtbar-toggle');
    const bar = d.querySelector('.c-fmtbar');
    if (bar.hidden) aa.click();
    const btn = (k) => bar.querySelector('[data-fmt="' + k + '"]');
    const sel = (v, a, b) => { inp.value = v; inp.focus(); inp.setSelectionRange(a, b); };
    const u = {};
    sel('*a* and *b*', 0, 11); btn('bold').click(); u.two = inp.value;
    sel('a*b*c', 2, 3); btn('bold').click(); u.literal = inp.value;
    sel('x `y` z', 0, 7); btn('code').click(); u.code = inp.value;
    sel('say *hi* now', 5, 7); btn('bold').click(); u.outside = inp.value;
    sel('say *hi* now', 4, 8); btn('bold').click(); u.inside = inp.value;
    r.unwrap = u.two === '**a* and *b**' && u.literal === 'a**b**c' && u.code === '```\nx `y` z\n```'
      && u.outside === 'say hi now' && u.inside === 'say hi now';
    r._u = u;

    /* MINOR-3 — IME composition */
    const comp = (type) => inp.dispatchEvent(new W.CompositionEvent(type, { bubbles: true, data: 'wor' }));
    sel('hello wor', 6, 9);
    comp('compositionstart');
    btn('bold').click();
    const kb = new W.KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true, cancelable: true });
    inp.dispatchEvent(kb);
    const during = inp.value;
    comp('compositionend');
    inp.setSelectionRange(6, 9);
    btn('bold').click();
    r.ime = during === 'hello wor' && inp.value === 'hello *wor*';
    r._ime = [during, inp.value];

    /* motion lens — focusout closes at once when focus moves outside, keeps the bar when it goes nowhere */
    if (bar.hidden) aa.click();
    inp.dispatchEvent(new W.FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    const keptNowhere = !bar.hidden;
    const outside = d.createElement('button'); d.body.append(outside);
    inp.dispatchEvent(new W.FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
    r.focusout = keptNowhere && bar.hidden && aa.getAttribute('aria-pressed') === 'false';
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
  finally { close(); }
  const dbg = { u: r._u, ime: r._ime }; delete r._u; delete r._ime;
  ok(Object.values(r).every((x) => x === true),
    '★ S20 F #46 r1 (#1378): URLs are never split by formatting (__init__.py / *promo* = one link as written; *url* = a bold link; the quote keeps the URL), code is dir=ltr, the Aa bar unwraps only a real pair, does nothing mid-IME, and closes at once when focus moves out' +
    (Object.values(r).every((x) => x === true) ? '' : ' — ' + JSON.stringify(r) + ' ' + JSON.stringify(dbg)));
}
