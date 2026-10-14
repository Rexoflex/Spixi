/* ==== S20 F (#1378) — the STRIP: a message text shown outside its bubble drops the marks (the BUILT shells, jsdom) ====
 * chat.html (desktop 1:1):
 *   · the bubble's reply quote of a loaded target `*bold* and `x`` reads "bold and x" (replySourceFor)
 *   · C#'s quote line (no target: replyTo "", quoteText `*hey* `y``) reads "hey y" (replyFallbackQuote)
 *   · the composer's reply strip (the hover Reply button) reads "bold and x"
 *   · the edit strip's excerpt is stripped ("mine x") while the FIELD is prefilled as typed ("_mine_ ~x~")
 * index.html (phone): the chat-list excerpt of kinds text / reply / photo and a pending draft read stripped; the chats
 *   search matches the stripped text ("hi there" finds `*hi* there`; "*hi*" finds nothing — the index is what you see).
 * Deliberate breaks (S20 F report): stripFormat removed from replySourceFor → the quote + strip clauses fail · from
 * replyFallbackQuote → the C# quote clause fails · from startEdit → the edit clause fails · from excerptFromPush's text
 * branch → the preview + search clauses fail · from the draft → the draft clause fails. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = b1Kit(h);
  const c = {};
  let s = null;
  try {
    s = await K.open({ group: false, mobile: false, rows: false, caps: 'reply,edit', hist: (s0) => {
      s0.push('addThem', 'f1', 'addrPeer', 'Ana', '', '*bold* and `x`', String(K.NOW - 100), 'True', 'True', 'True', 'False', 'False');
      s0.push('addMe', 'f2', 'addrMe', 'Me', '', '_mine_ ~x~', String(K.NOW - 60), 'True', 'True', 'True', 'False', 'False', '', 'f1', '', '', '', '');
      s0.push('addThem', 'f3', 'addrPeer', 'Ana', '', 'reply', String(K.NOW - 30), 'True', 'True', 'True', 'False', 'False', '', '', '', 'Bob', '*hey* `y`');
    } });
    const { d, W } = s;
    const qt = (id) => { const r = K.rowOf(d, id); const q = r && r.querySelector('.c-bubble__reply-text'); return q ? q.textContent : null; };
    c.quote = qt('f2');
    c.csQuote = qt('f3');
    const rb = K.rowOf(d, 'f1') && K.rowOf(d, 'f1').querySelector('.c-bubble-row__reply');
    if (rb) rb.click();
    await sleep(100);
    const ctxText = () => { const t = d.querySelector('.c-composer__ctx-text'); return t ? t.textContent : (d.querySelector('.c-composer__ctx') || {}).textContent; };
    c.strip = ctxText();
    d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const inp = d.querySelector('.c-composer__input');
    inp.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(500);
    const b2 = K.rowOf(d, 'f2').querySelector('.c-bubble');
    b2.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(100);
    const edit = [...d.querySelectorAll('.c-msgmenu button')].find((b) => b.textContent.trim() === 'Edit');
    if (edit) edit.click();
    await sleep(150);
    c.editStrip = ctxText();
    c.editField = inp.value;
    c.noErr = K.noErr(s.errs);
  } catch (e) { c.err = e.message; }
  finally { if (s) s.W.close(); }
  ok(c.quote === 'bold and x' && c.csQuote === 'hey y' && /bold and x$/.test(c.strip || '') && !/[*`]/.test(c.strip || '')
    && /mine x$/.test(c.editStrip || '') && !/[_~]/.test(c.editStrip || '') && c.editField === '_mine_ ~x~' && c.noErr === true,
    '★ S20 F (#1378): the reply quote (a loaded target + C#\'s quote line), the reply strip and the edit strip excerpt drop the marks; the edit FIELD keeps them as typed' +
    ' — ' + JSON.stringify(c));

  /* —— index.html: the chat-list excerpt + the search —— */
  const A = aKit(h);
  const r = {};
  let t = null;
  try {
    const TS = Math.floor(Date.now() / 1000);
    t = await A.boot('index.html', { mobile: true, wait: 1200, storage: { 'spixi.draft.D1': '_draft_ `x`' } });
    const { d, W, push } = t;
    const row = (a, name, ex, kind, dt) => [a, name, String(TS - dt), 'img/spixiavatar.png', 'false', ex, '', '0', '', 'False', kind, ''];
    push('clearChats');
    push('addChat', ...row('T1', 'Mira', '*hi* there', 'text', 60));
    push('addChat', ...row('R1', 'Jonas', '_re_ ~ply~', 'reply', 120));
    push('addChat', ...row('P1', 'Lea', '*my* caption', 'photo', 180));
    push('addChat', ...row('D1', 'Sven', 'last', 'text', 240));
    push('clearChatsDone');
    await sleep(300);
    const ex = (a) => {
      const it = d.querySelector('.c-chatlist-item[data-address="' + a + '"]') || [...d.querySelectorAll('[data-address]')].find((n) => n.dataset.address === a);
      const e = it && it.querySelector('.c-excerpt__text');
      return e ? e.textContent : null;
    };
    r.text = ex('T1'); r.reply = ex('R1'); r.photo = ex('P1'); r.draft = ex('D1');
    const q = d.querySelector('.c-chats-header input, input[type="search"]');
    const find = async (needle) => {
      q.value = needle; q.dispatchEvent(new W.Event('input', { bubbles: true })); await sleep(200);
      const hits = [...d.querySelectorAll('.c-chatlist-item')].map((n) => n.dataset.address);
      q.value = ''; q.dispatchEvent(new W.Event('input', { bubbles: true })); await sleep(150);
      return hits;
    };
    r.searchPlain = q ? await find('hi there') : null;
    r.searchMarks = q ? await find('*hi*') : null;
    r.noErr = !(t.errs || []).some((e) => /ReferenceError|TypeError|SyntaxError/.test(e));
  } catch (e) { r.err = e.message; }
  finally { if (t) t.close(); }
  ok(r.text === 'hi there' && /re ply$/.test(r.reply || '') && r.photo === 'my caption' && /draft x$/.test(r.draft || '') && !/[_`]/.test(r.draft || '')
    && Array.isArray(r.searchPlain) && r.searchPlain.includes('T1') && Array.isArray(r.searchMarks) && !r.searchMarks.includes('T1') && r.noErr === true,
    '★ S20 F (#1378): the chat-list excerpt (text / reply / a photo caption / a draft) reads stripped and the chats search matches what you see ("hi there" finds *hi* there, "*hi*" does not) — ' + JSON.stringify(r));
}
