/* ==== S20 F (#1378) — Copy = the text AS TYPED (the BUILT chat.html, jsdom) ====
 * A received row `*bold* _it_ `code`` renders formatted (strong / em / code), and the message menu's Copy hands the
 * clipboard the text with its marks — the native copy (window.__spixiNativeCopy, the #1028 first rung) receives exactly
 * the typed string, never the rendered textContent ("bold it code").
 * Deliberate break (S20 F report): the menu's copy action given stripFormat(rec.text) → the clause fails with
 * "bold it code". */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = b1Kit(h);
  const TYPED = '*bold* _it_ `code`';
  const c = {};
  let s = null;
  try {
    s = await K.open({ group: false, mobile: false, rows: false, hist: (s0) => {
      s0.push('addThem', 'c1', 'addrPeer', 'Ana', '', TYPED, String(K.NOW - 100), 'True', 'True', 'True', 'False', 'False');
    } });
    const { d, W } = s;
    const copied = [];
    W.__spixiNativeCopy = (t) => { copied.push(t); return Promise.resolve(true); };
    const row = K.rowOf(d, 'c1');
    const txt = row && row.querySelector('.c-bubble__text');
    c.rendered = !!txt && txt.textContent === 'bold it code' && !!txt.querySelector('strong') && !!txt.querySelector('code');
    row.querySelector('.c-bubble').dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(100);
    const copy = [...d.querySelectorAll('.c-msgmenu button')].find((b) => b.textContent.trim() === 'Copy');
    if (copy) copy.click();
    await sleep(150);
    c.copied = copied.length === 1 && copied[0] === TYPED;
    c.got = copied;
    c.noErr = K.noErr(s.errs);
  } catch (e) { c.err = e.message; }
  finally { if (s) s.W.close(); }
  ok(c.rendered === true && c.copied === true && c.noErr === true,
    '★ S20 F (#1378): the menu Copy of a formatted message copies the text as typed (the marks kept), the bubble shows it formatted — ' + JSON.stringify(c));
}
