/* ==== SESSION 8 (S1) — ★ S8 (#1234, #46 r1 X5 / B-MAJOR-1) READ RECEIPTS OFF REACHES THE CHAT SHELL, EXECUTED on the
 * BUILT chat.html (jsdom, a group of 4 = 3 others; the s1Kit model).
 *   · C# pushes setReadReceipts('True'|'False') at load and on a Privacy toggle; never pushed = True (an older exe)
 *   · True: the long-press detail of my group message says "n of m read" / "Nobody has seen this yet" (the L2 line)
 *   · False: NO seen sentence at all — neither "n of m read" (even with a stale seen: count) nor "Nobody has seen this
 *     yet" (false: receipts are reciprocal, nobody reports). What is still true stays: a file's "n of m downloaded"
 *   · any other value is ignored; True again brings the sentences back (read at menu OPEN time — no re-render)
 * Deliberate breaks: see the S8 S1 hand-back. */
import { s1Kit } from '../pins-s7b/s1-boot.mjs';

export default async function (h) {
  const { ok } = h;
  const k = s1Kit(h);
  const { boot, pev, rowOf, noErr, guard, sleep } = k;
  const T0 = Math.floor(Date.now() / 1000) - 3600;

  /* the detail line of a row's long-press menu ('' = no line; null = no menu) */
  const detailOf = async (W, d, id) => {
    const r = rowOf(d, id);
    const t = r && (r.querySelector('.c-bubble, .c-tcard, .c-fbubble, .c-mbubble') || r);
    if (!t) return null;
    t.dispatchEvent(pev(W, 'pointerdown', { kind: 'mouse', button: 2, id: 1 }));
    t.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(60);
    const m = [...d.querySelectorAll('.c-sheet[data-open] .c-msgmenu')].pop();
    const det = m ? m.querySelector('.c-msgmenu__detail') : null;
    const out = m ? (det ? det.textContent.trim() : '') : null;
    for (let i = 0; i < 4; i++) { try { if (!W.Spixi.dismissTopOverlay()) break; } catch (e) { break; } }
    await sleep(30);
    return out;
  };

  await guard('S8 #1234 receipts off', async () => {
    const s = await boot();
    const { W, d, push, errs } = s;
    push('onChatScreenReady', 'addrGroup');
    push('setChatMode', '1', '0', '', 'False');
    for (const [a, n] of [['addrMe', 'Me'], ['addrA', 'Ann'], ['addrB', 'Ben'], ['addrC', 'Cy']]) push('addContact', a, n, '', '', '');
    push('clearMessages', 'false');
    push('addMe', 'bb01', 'addrMe', 'Me', '', 'read by two', String(T0), 'True', 'True', 'True', 'False', 'False');
    push('addMe', 'bb02', 'addrMe', 'Me', '', 'nobody yet', String(T0 + 60), 'True', 'True', 'True', 'False', 'False');
    push('addFile', 'bb03', 'addrMe', 'Me', '', 'f03', 'plan.pdf', String(T0 + 120), 'True', 'True', 'False', '100', 'True', 'False', 'True', '', '1');
    push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(300);
    push('addReactions', 'bb01', 'received:3;seen:2;', '', '');
    push('addReactions', 'bb03', 'received:3;fileReceived:2;', '', '');
    await sleep(40);
    const r = {};
    /* never pushed = True */
    r.def = [await detailOf(W, d, 'bb01'), await detailOf(W, d, 'bb02'), await detailOf(W, d, 'bb03')];
    push('setReadReceipts', 'False');
    await sleep(20);
    r.off = [await detailOf(W, d, 'bb01'), await detailOf(W, d, 'bb02'), await detailOf(W, d, 'bb03')];
    push('setReadReceipts', 'maybe');   // ignored — still off
    await sleep(20);
    r.junk = await detailOf(W, d, 'bb02');
    push('setReadReceipts', 'True');
    await sleep(20);
    r.on = [await detailOf(W, d, 'bb01'), await detailOf(W, d, 'bb02'), await detailOf(W, d, 'bb03')];
    r.noErr = noErr(errs);

    const NOBODY = 'Nobody has seen this yet';
    ok(r.def[0] === '2 of 3 read' && r.def[1] === NOBODY && r.def[2] === '2 of 3 downloaded' && r.on.join('|') === r.def.join('|'),
      '★ S8 (#1234, X5): read receipts ON (never pushed = True, and again after setReadReceipts("True")) — the group detail reads "2 of 3 read" / "Nobody has seen this yet" / "2 of 3 downloaded" — ' + JSON.stringify(r));
    ok(r.off[0] === '' && r.off[1] === '' && r.off[2] === '2 of 3 downloaded' && r.junk === '' && r.noErr,
      '★ S8 (#1234, #46 r1 X5 / B-MAJOR-1): read receipts OFF — no seen sentence at all (no "n of m read" from a stale seen: count, no "Nobody has seen this yet", which would be false), only the still-true download clause; an unknown value is ignored — ' + JSON.stringify(r));
  });
}
