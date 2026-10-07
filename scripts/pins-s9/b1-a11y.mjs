/* ==== S9 B1 — a11y (#1206, 4 rows) on the BUILT chat.html ====
 *   · every message row is role="article" with a name "<sender>, <time>[, <status>]" ("You, 9:05 AM, Read" · "Ana, …");
 *     a live tick change renames it; an event chip carries no role; selection mode's exit gives the role back
 *   · desktop: on a SENT row the hover reply button comes BEFORE the bubble in the DOM (it sits left of it); received after
 *   · a control added IN PLACE into a row that is not the current one (a reaction pill) leaves the Tab order (tabindex -1);
 *     the current row's stays reachable
 *   · selection mode forgets the current row: after enter + exit the newest row is current again (not the one focused before)
 * Deliberate breaks (S9 B1 hand-back; #46 M1: aria-describedby → aria-label → roleName): labelRow call dropped → roleName · placeReplyBtnInDom → always append → replyOrder ·
 *   the in-place MutationObserver's setRowRove dropped → inPlace · `logFocusId = null` in the selecting observer dropped → focusReset */
import { b1Kit } from './b1-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = b1Kit(h);
  const { sleep } = K;
  const r = {};
  try {
    const s = await K.open({ caps: 'reply,edit', mobile: false });
    const { d, W, push } = s;
    const sent = K.rowOf(d, 'cc02');
    const recv = K.rowOf(d, 'cc01');
    const tm = (row) => (row.querySelector('time') || {}).textContent || '';
    /* ★ #46 M1: sender / time / status = the DESCRIPTION (aria-describedby → a hidden span), NO aria-label (the body stays the name) */
    const desc = (row) => { const id = row && row.getAttribute('aria-describedby'); const el = id && d.getElementById(id); return el && el.hidden ? el.textContent : null; };
    r.roleName = !!sent && sent.getAttribute('role') === 'article' && desc(sent) === 'You, ' + tm(sent) + ', Read' && !sent.hasAttribute('aria-label')
      && !!recv && recv.getAttribute('role') === 'article' && desc(recv) === 'Ana, ' + tm(recv) && !recv.hasAttribute('aria-label')
      && /their words/.test(recv.querySelector('.c-bubble').textContent);
    /* a live tick → the name follows */
    push('addMe', 'cc03', 'addrMe', 'Me', '', 'later', String(K.T0 + 200), 'True', 'False', 'False', 'False', 'False', '', '', '', '', '');
    await sleep(100);
    push('updateMessage', 'cc03', 'later', 'True', 'True', 'True', 'False', 'False');
    await sleep(100);
    const c3 = K.rowOf(d, 'cc03');
    r.relabel = !!c3 && / Read$/.test(desc(c3) || '');
    /* reply button DOM order (desktop) */
    const firstIsBtn = (row) => !!row && !!row.firstElementChild && row.firstElementChild.classList.contains('c-bubble-row__reply');
    const lastIsBtn = (row) => !!row && !!row.lastElementChild && row.lastElementChild.classList.contains('c-bubble-row__reply');
    r.replyOrder = firstIsBtn(K.rowOf(d, 'cc02')) && lastIsBtn(K.rowOf(d, 'cc01')) && !firstIsBtn(K.rowOf(d, 'cc01'));
    /* in place: a reaction pill into cc01 (not current: the newest row is) */
    const cur = () => [...d.querySelectorAll('#messages > [data-msgid]')].find((x) => x.tabIndex === 0);
    const curBefore = cur();
    push('addReactions', 'cc01', 'like:❤️:1;', '');
    await sleep(80);
    const pill = K.rowOf(d, 'cc01').querySelector('.c-reactions button, .c-reactions__pill');
    r.inPlace = !!curBefore && curBefore.dataset.msgid !== 'cc01' && !!pill && pill.tabIndex === -1;
    push('addReactions', curBefore.dataset.msgid, 'like:❤️:1;', '');
    await sleep(80);
    const pill2 = K.rowOf(d, curBefore.dataset.msgid).querySelector('.c-reactions button, .c-reactions__pill');
    r.currentKeeps = !!pill2 && pill2.tabIndex !== -1;
    /* the current row is forgotten by selection mode */
    K.rowOf(d, 'cc01').focus();
    await sleep(30);
    const focusedCur = cur() && cur().dataset.msgid === 'cc01';
    K.rowOf(d, 'cc01').querySelector('.c-bubble').dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(150);
    const sel = [...d.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Select');
    if (sel) sel.click();
    await sleep(200);
    const selecting = d.querySelector('#messages').hasAttribute('data-selecting');
    const cb = K.rowOf(d, 'cc01');
    r.selectName = cb.getAttribute('role') === 'checkbox' && !cb.hasAttribute('aria-label') && desc(cb) === 'Ana, ' + tm(cb);   // the checkbox is named by its body
    d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const cancel = [...d.querySelectorAll('button')].find((b) => /^Cancel$/.test(b.getAttribute('aria-label') || ''));
    if (cancel && d.querySelector('#messages').hasAttribute('data-selecting')) cancel.click();
    await sleep(300);
    const newest = [...d.querySelectorAll('#messages > [data-msgid]')].pop();
    r.focusReset = focusedCur && selecting && !d.querySelector('#messages').hasAttribute('data-selecting') && cur() === newest;
    r.roleBack = K.rowOf(d, 'cc01').getAttribute('role') === 'article';
    r.noErr = K.noErr(s.errs);
    if (process.env.B1DBG) console.log(JSON.stringify({ focusedCur, selecting, cur: cur() && cur().dataset.msgid, newest: newest && newest.dataset.msgid }));
    s.W.close();
  } catch (e) { r.err = e.message; }
  ok(Object.values(r).every((x) => x === true),
    '★★ S9 B1 a11y (#1206) on the built chat shell: rows are articles DESCRIBED by "<sender>, <time>[, <status>]" (no aria-label: the body is the name, also as a selection checkbox) (renamed on a live tick, the role back after selection mode); a sent row\'s reply button is FIRST in the DOM, a received row\'s last; a control added in place into a non-current row leaves the Tab order (the current row\'s stays); selection mode forgets the current row (the newest is current after it) — ' + JSON.stringify(r));
}
