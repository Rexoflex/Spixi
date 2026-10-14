/* ==== S20 F (#1378) — the composer's Aa format bar + the desktop shortcuts (the BUILT chat.html, jsdom) ====
 * PHONE (?mobile=1):
 *   · the Aa toggle sits INSIDE the pill (.c-composer__field), aria-pressed "false", labelled ("Text formatting"); one
 *     press opens the bar: role=toolbar, four labelled buttons (Bold · Italic · Strikethrough · Code), aria-pressed "true";
 *     the bar is a child of the composer root and position: absolute (cascade winner) — it never takes part in the
 *     composer's flow, so its height cannot change
 *   · Bold on "hello world" with "world" selected → "hello *world*" with "world" still selected; Bold again → unwrapped;
 *     nothing selected → "**" with the caret between; Italic / Strike / Code wrap in _ ~ `; Code over two lines → a ```
 *     block; a selection with outer spaces wraps the text only
 *   · a mouse / touch press on a bar button does not take focus from the field (mousedown is prevented)
 *   · Esc closes the bar (aria-pressed "false"), focus is back in the textarea, and the Esc does NOT cancel an open reply
 *   · Ctrl+B on the PHONE does nothing (the shortcuts are desktop-only)
 * DESKTOP: Ctrl+B / Ctrl+I / Ctrl+Shift+X wrap in * _ ~ (the bar can stay closed); the bar buttons carry the shortcut in
 *   aria-keyshortcuts.
 * Deliberate breaks (S20 F report): aria-pressed not written on open → the toggle clause fails · the unwrap branch
 * removed → the toggle-off clause fails · the desktop gate removed from the shortcut → the phone Ctrl+B clause fails ·
 * the Esc handler not stopping propagation → the reply-kept clause fails · `.c-fmtbar` position rule deleted → the
 * absolute clause fails. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
import { cascade } from '../pins-s19/r-cascade.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = b1Kit(h);
  const p = {};
  let s = null;
  const close = () => { if (s) { try { s.W.close(); } catch (_) {} s = null; } };
  const sel = (inp, v, a, b) => { inp.value = v; inp.focus(); inp.setSelectionRange(a, b); };
  try {
    s = await K.open({ group: false, mobile: true, caps: 'reply,edit' });
    const { d, W } = s;
    const field = d.querySelector('.c-composer__field');
    const comp = d.querySelector('.c-composer');
    const inp = d.querySelector('.c-composer__input');
    const aa = field && field.querySelector(':scope > .c-fmtbar-toggle');
    const bar = comp && comp.querySelector(':scope > .c-fmtbar');
    p.toggleIdle = !!aa && aa.getAttribute('aria-pressed') === 'false' && aa.getAttribute('aria-label') === 'Text formatting' && !!bar && bar.hidden;
    aa.click();
    await sleep(30);
    const btn = (k) => bar.querySelector('[data-fmt="' + k + '"]');
    p.open = !bar.hidden && aa.getAttribute('aria-pressed') === 'true' && bar.getAttribute('role') === 'toolbar'
      && ['bold', 'italic', 'strike', 'code'].map((k) => btn(k) && btn(k).getAttribute('aria-label')).join('|') === 'Bold|Italic|Strikethrough|Code';
    const C = cascade(W);
    p.absolute = C.win(bar, 'position') === 'absolute' && bar.parentNode === comp;
    /* mousedown is prevented → the field keeps focus */
    inp.focus();
    const md = new W.MouseEvent('mousedown', { bubbles: true, cancelable: true });
    btn('bold').dispatchEvent(md);
    p.keepFocus = md.defaultPrevented && d.activeElement === inp;
    sel(inp, 'hello world', 6, 11);
    btn('bold').click();
    p.wrap = inp.value === 'hello *world*' && inp.selectionStart === 7 && inp.selectionEnd === 12;
    btn('bold').click();
    p.unwrap = inp.value === 'hello world' && inp.selectionStart === 6 && inp.selectionEnd === 11;
    sel(inp, 'ab', 2, 2);
    btn('italic').click();
    p.pair = inp.value === 'ab__' && inp.selectionStart === 3 && inp.selectionEnd === 3;
    sel(inp, 'say  this ', 3, 10);
    btn('strike').click();
    p.spaces = inp.value === 'say  ~this~ ';
    sel(inp, 'x y', 2, 3);
    btn('code').click();
    p.code = inp.value === 'x `y`';
    sel(inp, 'a\nb', 0, 3);
    btn('code').click();
    p.block = inp.value === '```\na\nb\n```';
    /* the send state follows (the input event ran): a non-empty field → Send enabled */
    p.sendSync = !d.querySelector('.c-composer__action').disabled;
    /* Esc closes the bar, focus in the field, an open reply stays */
    const rb = K.rowOf(d, 'cc01');
    rb.querySelector('.c-bubble').dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(80);
    const reply = [...d.querySelectorAll('.c-msgmenu button')].find((b) => b.textContent.trim() === 'Reply');
    if (reply) reply.click();
    await sleep(150);
    if (bar.hidden) aa.click();
    const hadCtx = !!d.querySelector('.c-composer__ctx');
    btn('italic').focus();
    btn('italic').dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await sleep(50);
    p.esc = bar.hidden && aa.getAttribute('aria-pressed') === 'false' && d.activeElement === inp;
    aa.click(); await sleep(20);
    inp.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await sleep(500);
    p.replyKept = hadCtx && bar.hidden && !!d.querySelector('.c-composer__ctx');
    /* phone: no shortcut */
    sel(inp, 'word', 0, 4);
    const kb = new W.KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true, cancelable: true });
    inp.dispatchEvent(kb);
    p.phoneNoShortcut = inp.value === 'word' && !kb.defaultPrevented;
    p.noErr = K.noErr(s.errs);
    close();

    s = await K.open({ group: false, mobile: false });
    const d2 = s.d, W2 = s.W;
    const inp2 = d2.querySelector('.c-composer__input');
    const key = (k, o = {}) => { const e = new W2.KeyboardEvent('keydown', { key: k, ctrlKey: true, bubbles: true, cancelable: true, ...o }); inp2.dispatchEvent(e); return e; };
    sel(inp2, 'one two three', 0, 3);
    const e1 = key('b');
    sel(inp2, inp2.value, 6, 9);
    key('i');
    sel(inp2, inp2.value, 12, 17);
    key('X', { shiftKey: true });
    p.desktopKeys = e1.defaultPrevented && inp2.value === '*one* _two_ ~three~';
    const bar2 = d2.querySelector('.c-fmtbar');
    p.keyshortcuts = !!bar2 && bar2.querySelector('[data-fmt="bold"]').getAttribute('aria-keyshortcuts') === 'Control+B'
      && bar2.querySelector('[data-fmt="strike"]').getAttribute('aria-keyshortcuts') === 'Control+Shift+X';
    p.noErr2 = K.noErr(s.errs);
  } catch (e) { p.err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
  finally { close(); }
  ok(Object.values(p).every((x) => x === true),
    '★ S20 F (#1378): the Aa format bar — a pressed toggle in the pill, a labelled toolbar ABOVE the composer (absolute), wrap / unwrap / pair / per-line / ``` block, the field keeps focus, Esc closes it (focus back, the reply kept), Ctrl+B / Ctrl+I / Ctrl+Shift+X on desktop only' +
    (Object.values(p).every((x) => x === true) ? '' : ' — ' + JSON.stringify(p)));
}
