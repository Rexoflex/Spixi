/* ==== S11 C (#1262) — the chat-shell half of agent C's items, EXECUTED on the BUILT chat.html (jsdom) ====
 *   · 10-FLASH: the `paintAck` push answers with ONE `ixian:painted`, two animation frames later (never synchronously)
 *   · keyboard after a quick reaction: a TOUCH-opened message menu (long-press while the composer holds focus) keeps the
 *     composer focused while open (#1065) and leaves NO field focused after a quick reaction; Escape keeps it (#1065);
 *     a MOUSE-opened menu keeps today's focus (the composer stays focused after the reaction)
 *   · 10-STRIP-ESC: an image paste during an EDIT is still refused (no ixian:pasteImage) and now shows the toast; an image
 *     paste outside an edit sends ixian:pasteImage and shows no toast
 *   · the group-created system line: a line with "\n" = title (the icon INSIDE it, before the text) + subtitle (the rest);
 *     the chip's text is C#'s exact line; a line without "\n" keeps today's DOM (icon + one span, no data-lines); text only
 *     (markup in the line stays text); the built CSS has the stack / inline-icon / muted-subtitle rules
 * ★ S11 C2 (#1263): the paintAck answer is counted in rAF TICKS (a stubbed requestAnimationFrame: none after one tick,
 *   exactly one after two — R3-N2 / M17); the keyboard rule is the REACTION only (R2-m1: a touch-opened Copy keeps the
 *   composer focused, #1065; Reply / Edit after a touch-open focus it) and survives Android's compatibility mousedown
 *   (touch pointerdown → mousedown < 1 s → contextmenu → reaction → no field; R3-MINOR-4 / M13).
 * Deliberate breaks: see the S11 C / C2 reports. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  const { ok, root, readFileSync, join, stripCode } = h;
  const K = b1Kit(h);
  const { sleep, T0 } = K;
  let s = null;
  const close = () => { if (s) { try { s.W.close(); } catch (_) {} s = null; } };
  const touchDown = (W, el) => {
    const pd = new W.Event('pointerdown', { bubbles: true, cancelable: true });
    Object.defineProperty(pd, 'pointerType', { value: 'touch' });
    Object.defineProperty(pd, 'button', { value: 0 });
    Object.defineProperty(pd, 'clientX', { value: 5 });
    Object.defineProperty(pd, 'clientY', { value: 5 });
    el.dispatchEvent(pd);
  };
  const mouseDown = (W, el) => {
    const pd = new W.Event('pointerdown', { bubbles: true, cancelable: true });
    Object.defineProperty(pd, 'pointerType', { value: 'mouse' });
    Object.defineProperty(pd, 'button', { value: 2 });
    el.dispatchEvent(pd);
  };
  const reactBtn = (d) => [...d.querySelectorAll('.c-msgmenu__react')].find((b) => !b.disabled);

  /* —— 10-FLASH: paintAck → ixian:painted after two frames (★ S11 C2: counted in rAF ticks) —— */
  const f = {};
  try {
    s = await K.open({ caps: 'reply,media' });
    const painted = () => s.sent.filter((v) => v === 'ixian:painted').length;
    const n0 = painted();
    f.handler = typeof s.W.paintAck === 'function';
    /* a manual frame clock: every rAF callback waits for an explicit tick() */
    let q = [];
    s.W.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
    const tick = () => { const run = q; q = []; for (const cb of run) { try { cb(0); } catch (e) {} } };
    s.push('paintAck');
    await sleep(30);
    f.notSync = painted() === n0;
    tick();
    await sleep(30);
    f.notAfterOneFrame = painted() === n0;
    tick();
    await sleep(30);
    f.afterTwoFrames = painted() === n0 + 1;
    tick(); tick();
    await sleep(30);
    f.exactlyOne = painted() === n0 + 1;
    f.noErr = K.noErr(s.errs);
  } catch (e) { f.err = e.message; }
  finally { close(); }
  ok(Object.values(f).every((x) => x === true),
    '★ S11 C 10-FLASH (#1262) candidate: the chat shell answers the `paintAck` push with exactly ONE ixian:painted, two frames later — ★ S11 C2 (#1263): counted in rAF ticks: none in the push\'s turn, none after ONE tick, one after TWO — ' + JSON.stringify(f));

  /* —— keyboard after a quick reaction —— */
  const k = {};
  try {
    s = await K.open({ caps: 'reply,media' });
    const { d, W } = s;
    const inp = d.querySelector('.c-composer__input');
    const bub = K.rowOf(d, 'cc01').querySelector('.c-bubble');
    /* touch long-press (Android: pointerdown touch, then the WebView's contextmenu) with the composer focused */
    inp.focus();
    touchDown(W, bub);
    bub.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(80);
    k.menuOpen = !!d.querySelector('.c-msgmenu');
    k.keptWhileOpen = d.activeElement === inp;   // #1065: the menu does not touch the field while it is open
    const rb = reactBtn(d);
    if (rb) rb.click();
    await sleep(60);
    k.reacted = s.sent.some((v) => v.startsWith('ixian:contextAction:react:cc01:'));
    k.touchNoField = d.activeElement !== inp && !(d.activeElement && /^(INPUT|TEXTAREA)$/.test(d.activeElement.tagName)) && !(d.activeElement && d.activeElement.isContentEditable);
    await sleep(450);
    /* touch-open, then Escape (no action) → the field keeps focus (#1065: a dismissal does not touch the keyboard) */
    const bub2 = K.rowOf(d, 'cc02').querySelector('.c-bubble');
    inp.focus();
    touchDown(W, bub2);
    bub2.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(80);
    d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(450);
    k.escKeeps = d.activeElement === inp;
    close();
    /* a MOUSE-opened menu (right click) keeps today's rule: the composer stays focused after a reaction */
    s = await K.open({ caps: 'reply,media', mobile: false });
    const d2 = s.d, W2 = s.W;
    const inp2 = d2.querySelector('.c-composer__input');
    const b2 = K.rowOf(d2, 'cc01').querySelector('.c-bubble');
    inp2.focus();
    mouseDown(W2, b2);
    b2.dispatchEvent(new W2.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(80);
    const rb2 = reactBtn(d2);
    if (rb2) rb2.click();
    await sleep(60);
    k.mouseKeeps = !!rb2 && d2.activeElement === inp2;
    k.noErr = K.noErr(s.errs);
  } catch (e) { k.err = e.message; }
  finally { close(); }
  ok(Object.values(k).every((x) => x === true),
    '★ S11 C (#1262, Android: no keyboard after a quick reaction): a TOUCH-opened message menu keeps the composer focused while open (#1065) and leaves NO text field focused after a quick reaction (the reaction is sent); Escape keeps the field (#1065); a MOUSE-opened menu keeps today\'s focus — ' + JSON.stringify(k));

  /* —— ★ S11 C2 (#1263): the reaction ONLY · the compatibility mousedown · Reply / Edit after a touch-open —— */
  const k2 = {};
  try {
    s = await K.open({ caps: 'reply,edit,media' });
    const { d, W } = s;
    const inp = d.querySelector('.c-composer__input');
    const field = () => d.activeElement && (/^(INPUT|TEXTAREA)$/.test(d.activeElement.tagName) || d.activeElement.isContentEditable);
    const touchOpen = (id, compat) => {
      const b = K.rowOf(d, id).querySelector('.c-bubble');
      touchDown(W, b);
      /* Android's compatibility mouse event after the touch (same press, < 1 s): it must not relabel the touch */
      if (compat) b.dispatchEvent(new W.MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
      b.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    };
    const item = (label) => [...d.querySelectorAll('.c-msgmenu__item')].find((b) => b.textContent.trim() === label);
    /* (a) R3-MINOR-4 / M13: touch pointerdown → compat mousedown → contextmenu → reaction → no field focused */
    inp.focus();
    touchOpen('cc01', true);
    await sleep(80);
    k2.compatMenu = !!d.querySelector('.c-msgmenu');
    const rb = reactBtn(d);
    if (rb) rb.click();
    await sleep(60);
    k2.compatReacted = s.sent.some((v) => v.startsWith('ixian:contextAction:react:cc01:'));
    k2.compatNoField = !!rb && !field();
    await sleep(450);
    /* (b) R2-m1: a touch-opened COPY keeps the composer focused (#1065: typing → long-press → Copy → paste) */
    inp.focus();
    touchOpen('cc01', false);
    await sleep(80);
    const copy = item('Copy');
    if (copy) copy.click();
    await sleep(60);
    k2.copyKeeps = !!copy && d.activeElement === inp;
    await sleep(450);
    /* (c) Reply after a touch-open (composer focused before) → the composer is focused, the reply context is on */
    inp.focus();
    touchOpen('cc01', false);
    await sleep(80);
    const reply = item('Reply');
    if (reply) reply.click();
    await sleep(150);
    const ctx = W.Spixi.getComposerContext(d.querySelector('.c-composer'));
    k2.replyFocus = !!reply && d.activeElement === inp && !!ctx && ctx.kind === 'reply';
    W.Spixi.setComposerContext(d.querySelector('.c-composer'), null);
    await sleep(450);
    /* (d) Edit (my row) after a touch-open WITHOUT a focused field → the composer is focused for the edit */
    inp.blur();
    touchOpen('cc02', false);
    await sleep(80);
    const edit = item('Edit');
    if (edit) edit.click();
    await sleep(150);
    const ctx2 = W.Spixi.getComposerContext(d.querySelector('.c-composer'));
    k2.editFocus = !!edit && d.activeElement === inp && !!ctx2 && ctx2.kind === 'edit';
    k2.noErr = K.noErr(s.errs);
  } catch (e) { k2.err = e.message; }
  finally { close(); }
  ok(Object.values(k2).every((x) => x === true),
    '★ S11 C2 (#1263, #46 r1 R2-m1 · R3-MINOR-4): the no-field close is the quick REACTION only and survives Android\'s compatibility mousedown (touch pointerdown → mousedown < 1 s → contextmenu → reaction → no field focused); a touch-opened Copy keeps the composer focused (#1065); Reply and Edit after a touch-open focus the composer — ' + JSON.stringify(k2));

  /* —— 10-STRIP-ESC: the edit-paste refusal toast —— */
  const t = {};
  try {
    s = await K.open({ caps: 'reply,edit,media' });
    const { d, W } = s;
    const inp = d.querySelector('.c-composer__input');
    const comp = d.querySelector('.c-composer');
    const paste = () => {
      const ev = new W.Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'clipboardData', { value: { types: ['image/png'], items: [] } });
      inp.dispatchEvent(ev);
      return ev;
    };
    const toastHas = () => [...d.querySelectorAll('.c-toast')].some((x) => x.textContent.includes('Finish editing to add photos.'));
    const b0 = s.sent.length;
    paste();
    await sleep(60);
    t.plainSends = s.sent.slice(b0).includes('ixian:pasteImage') && !toastHas();
    W.Spixi.setComposerContext(comp, { kind: 'edit', title: 'Edit', text: 'my words', prefillText: 'my words', editId: 'cc02' });
    const b1 = s.sent.length;
    const ev = paste();
    await sleep(60);
    t.editRefused = !s.sent.slice(b1).includes('ixian:pasteImage') && ev.defaultPrevented === true;
    t.toast = toastHas();
    t.editKept = !!W.Spixi.getComposerContext(comp) && W.Spixi.getComposerContext(comp).kind === 'edit';
    t.noErr = K.noErr(s.errs);
  } catch (e) { t.err = e.message; }
  finally { close(); }
  ok(Object.values(t).every((x) => x === true),
    '★ S11 C 10-STRIP-ESC (#1262): an image paste during an EDIT stays refused (no ixian:pasteImage, default prevented, the edit stays) and now shows "Finish editing to add photos."; outside an edit the paste sends ixian:pasteImage with no toast — ' + JSON.stringify(t));

  /* —— the created line: title + subtitle —— */
  const c = {};
  try {
    s = await K.open({ group: true, caps: 'reply,media', rows: false });
    const LINE = 'You created this group\nMembers can see the group now.';
    s.push('addThem', '07', 'addrMe', '', '', LINE, String(T0 + 5), 'True', 'True', 'True', 'False', 'False');
    s.push('messagesDone');
    s.push('onChatScreenLoaded');
    await sleep(200);
    const chip = s.d.querySelector('#messages .chat-event__chip');
    const title = chip && chip.querySelector(':scope > .chat-event__title');
    const sub = chip && chip.querySelector(':scope > .chat-event__sub');
    c.stack = !!chip && chip.classList.contains('chat-event__chip--stack') && chip.hasAttribute('data-lines');
    c.order = !!title && !!sub && chip.firstElementChild === title && title.nextElementSibling === sub;
    c.iconInline = !!title && !!title.firstElementChild && title.firstElementChild.tagName.toLowerCase() === 'svg'
      && !chip.querySelector(':scope > svg') && title.textContent === 'You created this group';
    c.subText = !!sub && sub.textContent.trim() === 'Members can see the group now.';
    c.exactText = !!chip && chip.textContent === LINE;
    close();
    /* a line WITHOUT "\n" keeps today's DOM; markup in a line stays text */
    s = await K.open({ group: true, caps: 'reply,media', rows: false });
    s.push('addThem', '07', 'addrPeer', 'Ana', '', 'Ana added you to the group', String(T0 + 5), 'True', 'True', 'True', 'False', 'False');
    s.push('messagesDone');
    s.push('onChatScreenLoaded');
    await sleep(200);
    const one = s.d.querySelector('#messages .chat-event__chip');
    c.oneLine = !!one && !one.hasAttribute('data-lines') && !one.classList.contains('chat-event__chip--stack')
      && !!one.querySelector(':scope > svg') && !!one.querySelector(':scope > span') && !one.querySelector('.chat-event__title, .chat-event__sub')
      && one.textContent === 'Ana added you to the group';
    close();
    s = await K.open({ group: true, caps: 'reply,media', rows: false });
    s.push('addThem', '07', 'addrMe', '', '', '<b>bold</b>\n<img src=x onerror=alert(1)>', String(T0 + 5), 'True', 'True', 'True', 'False', 'False');
    s.push('messagesDone');
    s.push('onChatScreenLoaded');
    await sleep(200);
    const x = s.d.querySelector('#messages .chat-event__chip');
    c.textOnly = !!x && !x.querySelector('b, img') && x.querySelector('.chat-event__sub').textContent.includes('<img src=x');
    const css = stripCode(readFileSync(join(root, 'Spixi/Resources/Raw/html/chat.html'), 'utf8'));
    c.css = /\.chat-event__chip--stack \{[^}]*flex-direction: column;[^}]*gap: var\(--spacing-2\);/.test(css)
      && /\.chat-event__title svg \{[^}]*display: inline-block;[^}]*width: 1\.15em;[^}]*height: 1\.15em;/.test(css)
      && /\.chat-event__sub \{[^}]*white-space: normal;[^}]*color: var\(--text-neutral-02\);[^}]*font-size: var\(--font-size-body-xs\);/.test(css)
      && /\.chat-event__chip\[data-lines\] \{[^}]*white-space: pre-line;/.test(css);
    c.noErr = K.noErr(s.errs);
  } catch (e) { c.err = e.message; }
  finally { close(); }
  ok(Object.values(c).every((x) => x === true),
    '★ S11 C (#1262, Damir 23:46): the group-created line with "\\n" renders as a TITLE (the icon inline inside it, before the text) + a muted, smaller SUBTITLE, the chip text still C#\'s exact line; a line without "\\n" keeps today\'s DOM; markup stays text; the built CSS stacks + inlines + mutes — ' + JSON.stringify(c));
}
