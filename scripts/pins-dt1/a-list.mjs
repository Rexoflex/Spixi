/* ==== DT-1 A (Damir 2026-10-12, the "Spixi v1 Desktop Additions" render) — THE DESKTOP CHAT LIST POLISH ====
 * On the BUILT index.html (jsdom; ?desktop=1 / ?mobile=1 are the shell's own preview overrides), real C# pushes:
 *   · SECTIONS: no section head with 0 pinned; with ≥ 1 pinned, "Pinned · n" then the pinned rows, then "Chats · n" then the
 *     rest (requests count in Chats); none while a search query is active;
 *   · FOLD: a click on a head folds it (aria-expanded, its rows not rendered) and writes spixi.chats.fold; the fold survives a
 *     re-flush (clearChats → addChat × n → clearChatsDone) and a reload (a new boot over the same store);
 *   · HOVER ACTIONS: each button routes to the SAME action as the row menu — pin toggles the pin and writes spixi.pins (the
 *     menu's Pin does the same), mute sends ixian:mutechat:<addr>:on (the menu's Mute sends the same), info sends
 *     ixian:chatinfo:<addr>, more opens the row menu with the same items as a right click; the buttons are tabIndex -1 and
 *     the row button stays the Tab stop; Shift F10 on the row still opens the menu;
 *   · CSS: every rule that SHOWS the bar (display: flex) or hides the time / badges sits inside (hover: hover) and
 *     (pointer: fine) and every selector of it starts with :root[data-desktop]; desktop rows are inset (margin-inline
 *     --spacing-8, radius-12), phone rows are not;
 *   · PATCH: with sections on, the one-row patch keeps working (true; only the named row is replaced; a row inside a folded
 *     section is not on screen → true, nothing replaced);
 *   · MOBILE: a phone boot with pinned chats has no section head and no row wrapper (today's list).
 * Deliberate breaks: docs/review-brief-dt1.md §5 (the DT-1 #46 verdict) — each clause broken once in a FULL copy. */
import { aKit } from '../pins-s11/a-kit.mjs';
import { cascade } from '../pins-s19/r-cascade.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  const r = {}, n = {};
  const TS = Math.floor(Date.now() / 1000);
  const row = (a, name, ex, dt) => [a, name, String(TS - dt), 'img/spixiavatar.png', 'false', ex, '', '0', '', 'False', 'text', ''];
  const ROWS = [['A1', 'Mira', 'chess?', 60], ['A2', 'Falcon', 'trip', 600], ['B1', 'Jonas', 'thursday', 1200], ['B2', 'Lea', 'photo', 4000], ['B3', 'Sven', 'qr', 9000]];
  const flush = (push) => { push('clearChats'); for (const x of ROWS) push('addChat', ...row(...x)); push('clearChatsDone'); };
  const list = (d) => d.querySelector('.c-chats-list');
  const shape = (d) => Array.from(list(d).children).map((c) => c.classList.contains('c-chats-section')
    ? 'S:' + c.dataset.section + ':' + (c.querySelector('.c-chats-section__count') || {}).textContent + ':' + c.getAttribute('aria-expanded')
    : (c.dataset.rowAddress || (c.querySelector('.c-chatlist-item') || c).dataset.address || '?'));
  let s = null, s2 = null, s3 = null, s4 = null;
  try {
    /* —— 0 pinned: no heads —— */
    s = await K.boot('index.html', { desktop: true, wait: 1200 });
    flush(s.push); await sleep(300);
    n.zero = shape(s.d);
    r.zeroNoHeads = n.zero.length === 5 && !n.zero.some((x) => /^S:/.test(x));
    s.close(); s = null;

    /* —— 2 pinned —— */
    s = await K.boot('index.html', { desktop: true, wait: 1200, storage: { 'spixi.pins': JSON.stringify(['A1', 'A2']) } });
    const { W, d, push, sent } = s;
    flush(push); await sleep(300);
    n.sections = shape(d);
    r.sections = JSON.stringify(n.sections) === JSON.stringify(['S:pinned:2:true', 'A1', 'A2', 'S:chats:3:true', 'B1', 'B2', 'B3'])
      && (d.querySelector('.c-chats-section[data-section="pinned"] .c-chats-section__label') || {}).textContent === 'Pinned'
      && (d.querySelector('.c-chats-section[data-section="chats"] .c-chats-section__label') || {}).textContent === 'Chats';
    /* a query → flat */
    const q = d.querySelector('.c-chats-header input, input[type="search"]');
    if (q) { q.value = 'a'; q.dispatchEvent(new W.Event('input', { bubbles: true })); await sleep(200); n.query = shape(d); q.value = ''; q.dispatchEvent(new W.Event('input', { bubbles: true })); await sleep(200); }
    r.queryFlat = !!q && Array.isArray(n.query) && n.query.length > 0 && !n.query.some((x) => /^S:/.test(x));
    /* fold */
    d.querySelector('.c-chats-section[data-section="pinned"]').click(); await sleep(100);
    n.folded = shape(d);
    n.foldStore = W.localStorage.getItem('spixi.chats.fold');
    r.fold = JSON.stringify(n.folded) === JSON.stringify(['S:pinned:2:false', 'S:chats:3:true', 'B1', 'B2', 'B3'])
      && n.foldStore === '{"pinned":true,"chats":false}';
    flush(push); await sleep(300);
    n.reflush = shape(d);
    r.foldReflush = JSON.stringify(n.reflush) === JSON.stringify(n.folded);
    const store = { 'spixi.pins': W.localStorage.getItem('spixi.pins'), 'spixi.chats.fold': n.foldStore };
    d.querySelector('.c-chats-section[data-section="pinned"]').click(); await sleep(100);   // unfold for the rest

    /* hover actions: shape, tab order */
    const wrapOf = (a) => Array.from(d.querySelectorAll('.c-chatlist-row')).find((x) => x.dataset.rowAddress === a);
    const acts = (a) => Array.from(wrapOf(a).querySelectorAll('.c-chatlist-row__act')).map((b) => b.dataset.action + ':' + b.tabIndex + ':' + b.getAttribute('aria-label'));
    n.actsB1 = acts('B1'); n.actsA1 = acts('A1');
    r.actsShape = JSON.stringify(n.actsB1) === JSON.stringify(['pin:-1:Pin', 'mute:-1:Mute', 'info:-1:Chat info', 'more:-1:More options'])
      && n.actsA1[0] === 'pin:-1:Unpin' && wrapOf('B1').querySelector('.c-chatlist-item').tabIndex === 0
      && wrapOf('B1').dataset.acts === '4';
    /* pin from the bar — the same effect as the menu's Pin; the pointer is on B1, and the row MOVES: no hover is carried
       to its new slot (#46 r2 m-2) */
    const Ev = W.PointerEvent || W.MouseEvent;
    wrapOf('B1').querySelector('.c-chatlist-item').dispatchEvent(new Ev('pointerover', { bubbles: true, pointerType: 'mouse' }));
    wrapOf('B1').querySelector('[data-action="pin"]').click(); await sleep(100);
    n.hoverAfterPin = d.querySelectorAll('.c-chats-list [data-hover]').length;
    n.pinStore = JSON.parse(W.localStorage.getItem('spixi.pins') || '[]');
    n.afterPin = shape(d);
    r.pinBar = n.pinStore.includes('B1') && JSON.stringify(n.afterPin.slice(0, 4)) === JSON.stringify(['S:pinned:3:true', 'A1', 'A2', 'B1']);
    r.pinNoCarry = n.hoverAfterPin === 0;
    /* the menu's Pin on another row does the same */
    const itemsOf = () => Array.from(d.querySelectorAll('.c-sheet .c-msgmenu__item')).map((b) => b.textContent.trim());
    const closeSheets = async () => { for (const sh of Array.from(d.querySelectorAll('.c-sheet'))) sh.remove(); for (const sc of Array.from(d.querySelectorAll('.c-scrim, .c-overlay-scrim'))) sc.remove(); await sleep(50); };
    const rowEl = (a) => wrapOf(a).querySelector('.c-chatlist-item');
    rowEl('B2').dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true })); await sleep(150);
    n.menuB2 = itemsOf();
    const pinItem = Array.from(d.querySelectorAll('.c-sheet .c-msgmenu__item')).find((b) => b.textContent.trim() === 'Pin');
    if (pinItem) pinItem.click();
    await sleep(500); await closeSheets();
    n.pinStore2 = JSON.parse(W.localStorage.getItem('spixi.pins') || '[]');
    r.pinMenuSame = n.pinStore2.includes('B2') && n.pinStore2.includes('B1');
    /* mute: bar vs menu send the same verb shape */
    sent.length = 0;
    wrapOf('B3').querySelector('[data-action="mute"]').click(); await sleep(100);
    n.muteBar = sent.slice();
    sent.length = 0;
    rowEl('A2').dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true })); await sleep(150);
    const muteItem = Array.from(d.querySelectorAll('.c-sheet .c-msgmenu__item')).find((b) => b.textContent.trim() === 'Mute');
    if (muteItem) muteItem.click();
    await sleep(500); await closeSheets();
    n.muteMenu = sent.slice();
    r.muteSame = n.muteBar.includes('ixian:mutechat:B3:on') && n.muteMenu.includes('ixian:mutechat:A2:on');
    /* info */
    sent.length = 0;
    wrapOf('B1').querySelector('[data-action="info"]').click(); await sleep(100);
    n.info = sent.slice();
    r.info = n.info.includes('ixian:chatinfo:B1');
    /* more = the row menu (the same items as a right click) */
    rowEl('B1').dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true })); await sleep(150);
    n.menuRight = itemsOf(); await sleep(500); await closeSheets();
    wrapOf('B1').querySelector('[data-action="more"]').click(); await sleep(150);
    n.menuMore = itemsOf(); await sleep(500); await closeSheets();
    r.more = n.menuMore.length >= 3 && JSON.stringify(n.menuMore) === JSON.stringify(n.menuRight);
    /* Shift F10 on the focused row still opens the menu */
    rowEl('B2').focus();
    rowEl('B2').dispatchEvent(new W.KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true, cancelable: true })); await sleep(150);
    n.shiftF10 = itemsOf(); await sleep(500); await closeSheets();
    r.shiftF10 = n.shiftF10.length >= 3;

    /* the last pin gone → the stale fold goes with the sections (#46 r1 A-8) */
    d.querySelector('.c-chats-section[data-section="chats"]').click(); await sleep(100);   // fold Chats
    n.foldBeforeUnpin = W.localStorage.getItem('spixi.chats.fold');
    for (let k = 0; k < 8; k++) {
      const pinnedBtn = Array.from(d.querySelectorAll('.c-chatlist-row')).map((w) => w.querySelector('[data-action="pin"][aria-label="Unpin"]')).find(Boolean);
      if (!pinnedBtn) break;
      pinnedBtn.click(); await sleep(60);
    }
    n.foldAfterUnpin = W.localStorage.getItem('spixi.chats.fold');
    n.afterUnpin = shape(d);
    r.foldReset = n.foldBeforeUnpin === '{"pinned":false,"chats":true}' && n.foldAfterUnpin === '{"pinned":false,"chats":false}'
      && n.afterUnpin.length === 5 && !n.afterUnpin.some((x) => /^S:/.test(x));
    /* #46 r2 m-1: the same when the last pinned chat is DELETED (the row menu's Delete chat → its confirm) */
    wrapOf('B2').querySelector('[data-action="pin"]').click(); await sleep(80);
    d.querySelector('.c-chats-section[data-section="chats"]').click(); await sleep(80);
    n.foldBeforeDelete = W.localStorage.getItem('spixi.chats.fold');
    rowEl('B2').dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true })); await sleep(150);
    const del = Array.from(d.querySelectorAll('.c-sheet .c-msgmenu__item')).find((b) => b.textContent.trim() === 'Delete chat');
    if (del) del.click();
    await sleep(500);
    const confirm = Array.from(d.querySelectorAll('.c-modal .c-modal__actions .c-button')).pop();   // the destructive CTA (last)
    if (confirm) confirm.click();
    await sleep(500); await closeSheets();
    for (const m of Array.from(d.querySelectorAll('.c-modal'))) m.remove();
    n.delete = { del: !!del, confirm: !!confirm, pins: W.localStorage.getItem('spixi.pins'), fold: W.localStorage.getItem('spixi.chats.fold') };
    r.foldResetDelete = n.foldBeforeDelete === '{"pinned":false,"chats":true}' && !!del && !!confirm
      && n.delete.pins === '[]' && n.delete.fold === '{"pinned":false,"chats":false}';

    /* CSS gating + inset */
    const { win, rules } = cascade(W);
    const gated = rules.filter(({ r: rr }) => /c-chatlist-row__acts|c-chatlist-row[^_]/.test(rr.selectorText)
      && (rr.style.getPropertyValue('display') === 'flex' || (/c-chatlist-item__right/.test(rr.selectorText) && rr.style.getPropertyValue('display') === 'none')));
    n.gated = gated.map(({ r: rr, media }) => ({ sel: rr.selectorText.slice(0, 80), media }));
    r.cssGated = gated.length >= 1 && gated.every(({ r: rr, media }) => media.some((m) => /\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)/.test(m))
      && rr.selectorText.split(',').every((x) => x.trim().startsWith(':root[data-desktop]')));
    const item = d.querySelector('.c-chats-list .c-chatlist-row .c-chatlist-item');
    n.inset = { m: win(item, 'margin-inline'), rad: win(item, 'border-radius') };
    r.insetDesktop = n.inset.m === 'var(--spacing-8)' && n.inset.rad === 'var(--radius-12)';

    /* patch with sections on (the component API, the same plan) */
    const sp = W.Spixi;
    const st = { chats: [
      { address: 'P1', name: 'P one', pinned: true, timestamp: 9 },
      { address: 'C1', name: 'C one', timestamp: 8 },
      { address: 'C2', name: 'C two', timestamp: 7 },
    ], requests: [], filter: 'all', query: '' };
    const op = { sections: true, hoverActions: true, capabilities: { pin: true, mute: true }, host: d.body };
    const L = sp.createChatsList(st, op);
    d.body.append(L);
    const before = Array.from(L.children);
    st.chats[1].unread = 3;
    n.patch1 = sp.patchChatRows(L, st, ['C1'], op);
    const after = Array.from(L.children);
    n.patchKeep = after.map((c, i) => c === before[i]);
    st.fold = { pinned: true };
    sp.renderChatsList(L, st, op);
    const kept = Array.from(L.children);
    n.patch2 = sp.patchChatRows(L, st, ['P1'], op);
    r.patch = n.patch1 === true && JSON.stringify(n.patchKeep) === JSON.stringify([true, true, true, false, true])
      && n.patch2 === true && Array.from(L.children).every((c, i) => c === kept[i]);
    r.noErr = K.noErr(s.errs);
    s.close(); s = null;

    /* —— reload over the same store: the fold is still there —— */
    s2 = await K.boot('index.html', { desktop: true, wait: 1200, storage: store });
    flush(s2.push); await sleep(300);
    n.reload = shape(s2.d);
    r.foldReload = n.reload[0] === 'S:pinned:2:false' && n.reload[1] === 'S:chats:3:true';
    s2.close(); s2 = null;

    /* —— mobile: unchanged —— */
    s3 = await K.boot('index.html', { desktop: false, wait: 1200, storage: { 'spixi.pins': JSON.stringify(['A1', 'A2']) } });
    flush(s3.push); await sleep(300);
    n.mobile = { heads: s3.d.querySelectorAll('.c-chats-section').length, wraps: s3.d.querySelectorAll('.c-chatlist-row').length, acts: s3.d.querySelectorAll('.c-chatlist-row__act').length, rows: s3.d.querySelectorAll('.c-chatlist-item').length };
    const mItem = s3.d.querySelector('.c-chatlist-item');
    const mc = cascade(s3.W);
    n.mobileInset = mc.win(mItem, 'margin-inline');
    r.mobile = n.mobile.heads === 0 && n.mobile.wraps === 0 && n.mobile.acts === 0 && n.mobile.rows === 5 && n.mobileInset === '';
    r.noErrMobile = K.noErr(s3.errs);
  } catch (e) { r.threw = e.message + ' ' + (e.stack || '').split('\n').slice(1, 4).join(' | '); }
  finally { for (const x of [s, s2, s3, s4]) if (x) x.close(); }
  const c = (k, m) => ok(r[k] === true, m + ' — ' + JSON.stringify(r[k] === true ? { [k]: true } : { [k]: r[k], threw: r.threw, n }).slice(0, 1400));
  c('zeroNoHeads', '★ DT-1 A: desktop, no pinned chat → one flat list, no section head');
  c('sections', '★ DT-1 A: desktop, 2 pinned → "Pinned · 2", the pinned rows, "Chats · 3", the rest (labels from the strings)');
  c('queryFlat', '★ DT-1 A: a search query → the filtered list is flat (no section head)');
  c('fold', '★ DT-1 A: a click on "Pinned" folds it (aria-expanded false, its rows not rendered) and writes spixi.chats.fold {"pinned":true,"chats":false}');
  c('foldReflush', '★ DT-1 A: the fold survives a re-flush (clearChats → addChat × n → clearChatsDone)');
  c('foldReload', '★ DT-1 A: the fold survives a reload (a new boot over the same store)');
  c('actsShape', '★ DT-1 A: each row carries pin / mute / chat info / more (labels follow the state: Unpin on a pinned row), tabIndex -1; the row button stays the Tab stop; data-acts = 4');
  c('pinBar', '★ DT-1 A: the bar\'s pin pins the chat (spixi.pins written, the row moves into Pinned)');
  c('pinNoCarry', '★ DT-1 A (#46 r2 m-2): the bar\'s pin MOVES the row — the hover is not carried to its new slot (no [data-hover] after the re-render)');
  c('pinMenuSame', '★ DT-1 A: the row menu\'s Pin does the same (the same applyChatRowAction)');
  c('muteSame', '★ DT-1 A: the bar\'s mute sends ixian:mutechat:<addr>:on, as the row menu\'s Mute does (C# owns the mute)');
  c('info', '★ DT-1 A: the bar\'s chat info sends ixian:chatinfo:<addr> (the menu\'s route)');
  c('more', '★ DT-1 A: the bar\'s more opens the row menu with the same items as a right click');
  c('shiftF10', '★ DT-1 A: Shift F10 on the focused row still opens the row menu');
  c('foldReset', '★ DT-1 A (#46 r1): unpinning the last chat drops the sections AND resets a stale fold (the next pin opens with every chat visible)');
  c('foldResetDelete', '★ DT-1 A (#46 r2 m-1): deleting the LAST pinned chat resets a stale fold too (every pin drop goes through savePins)');
  c('cssGated', '★ DT-1 A: every rule that shows the bar or hides the time / badges is inside (hover: hover) and (pointer: fine) and starts with :root[data-desktop]');
  c('insetDesktop', '★ DT-1 A: a desktop row is inset (margin-inline --spacing-8) and rounded (--radius-12)');
  c('patch', '★ DT-1 A: with sections on, the one-row patch replaces only the named row; a row in a folded section is not on screen (true, nothing replaced)');
  c('mobile', '★ DT-1 A: a phone boot with pinned chats has no section head, no wrapper, no action and no inset — today\'s list');
  c('noErr', '★ DT-1 A: no page error (desktop)');
  c('noErrMobile', '★ DT-1 A: no page error (phone)');
}
