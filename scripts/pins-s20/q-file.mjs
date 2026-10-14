/* ==== S20 Q — J3 (#1440, the v3 doc's I3): the file bubble — Cancel is a ✕ ON THE TILE, no "Open file" link ====
 * On the BUILT chat.html (jsdom):
 *   · my sending file (pre-accept, the shell wires onCancel) has NO Cancel button outside the bubble: the ✕ is a button
 *     paired with the card (.c-fbubble__pair), the x glyph with no text, today's name "Cancel sending <name>", placed
 *     absolutely on the tile corner (css), and a click calls the SAME onCancel once (the #268 one-shot latch);
 *   · the first packet tick (updateFile) drops the ✕ (pre-accept only, as before);
 *   · no "Open file" link on a complete card — built complete, or flipped complete by setFileProgress — while the whole
 *     card still opens the file (onOpen fires);
 *   · the #1190 "Not available on this device" card and the sent tick (#1028) are unchanged.
 * Deliberate breaks (S20 Q report): the ✕ appended to the ROW again (no pair) → noOutside · fileOpenLabel put back on
 * complete → noOpenLink · the click wired without oneShot → cancelOnce · (#46 r1) `inset-inline-start:` written as `left:` → rtl. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = b1Kit(h);
  const { T0 } = K;
  const r = {};
  const got = {};
  try {
    const s = await K.open({ rows: false, hist: (x) => {
      /* addFile(id, address, nick, avatar, fileid, name, time, me, sent, read, progress, complete, paid, relaySent, transfer, local, voice, group, played, size) */
      x.push('addFile', 'fs', 'addrMe', 'Me', '', 'ffs', 'Photos-Bled.zip', String(T0), 'True', 'False', 'False', '0', 'False', 'False', 'True', '', '1', '', '', '', '18874368');
      x.push('addFile', 'fc', 'addrMe', 'Me', '', 'ffc', 'Itinerary.docx', String(T0 + 10), 'True', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', '', '', '319488');
      x.push('addFile', 'fg', 'addrMe', 'Me', '', 'ffg', 'gone.pdf', String(T0 + 20), 'True', 'True', 'False', '100', 'True', 'False', 'True', '', '0', '', '', '', '');
    } });
    try {
      const { W, d, push } = s;
      const S = W.Spixi;
      await sleep(150);
      const row = K.rowOf(d, 'fs');
      const x = row && row.querySelector('.c-fbubble__cancel');
      got.shellPair = !!(x && x.parentElement.classList.contains('c-fbubble__pair') && x.parentElement.querySelector('.c-fbubble'));
      got.shellOutside = row ? row.querySelectorAll(':scope > .c-fbubble__cancel, :scope > button:not(.c-fbubble)').length : -1;
      const cx = x && W.getComputedStyle(x);
      got.shellPos = cx ? [cx.position, cx.insetInlineStart || cx.getPropertyValue('inset-inline-start'), cx.top].join(' ') : null;
      got.shellText = x ? x.textContent.trim() : null;
      /* (#46 r1 auditor C) RTL: the ✕ is placed by a LOGICAL inset (it follows the tile to the right edge under dir=rtl); no physical left / right */
      d.documentElement.setAttribute('dir', 'rtl');
      const cr2 = x && W.getComputedStyle(x);
      got.rtl = cr2 ? [cr2.getPropertyValue('inset-inline-start'), cr2.left, cr2.right] : null;
      d.documentElement.removeAttribute('dir');
      got.shellLabel = x ? x.getAttribute('aria-label') : null;
      got.complete = (K.rowOf(d, 'fc') || d).textContent;
      got.completeTick = !!(K.rowOf(d, 'fc') || d).querySelector('.c-fbubble__stamp .c-status-icon');
      got.gone = ((K.rowOf(d, 'fg') || d).querySelector('.c-fbubble__meta') || {}).textContent;
      push('updateFile', 'ffs', '3', 'False');
      await sleep(60);
      got.afterTick = !!(K.rowOf(d, 'fs') || d).querySelector('.c-fbubble__cancel');
      r.noOutside = got.shellPair && got.shellOutside === 0 && /^absolute /.test(got.shellPos || '') && got.shellText === ''
        && got.shellLabel === 'Cancel sending Photos-Bled.zip' && got.afterTick === false;
      r.rtl = !!got.rtl && /--fbubble-badge-x/.test(got.rtl[0]) && /^(auto)?$/.test(got.rtl[1]) && /^(auto)?$/.test(got.rtl[2]);
      /* the component: one click → onCancel once; the ✕ is the x glyph */
      let canceled = 0, opened = 0;
      const host = d.createElement('div'); d.body.append(host);
      const fr = S.createFileBubble({ direction: 'sent', name: 'a.zip', state: 'progress', progress: 0, size: 1000, status: 'sent', timestamp: Date.now(), strings: {}, onCancel: () => { canceled += 1; } });
      host.append(fr);
      const fx = fr.querySelector('.c-fbubble__pair > .c-fbubble__cancel[data-on-tile]');
      got.xGlyph = !!fx && fx.querySelector('svg') && fx.querySelector('svg').innerHTML === W.SpixiIcons.icon('x').innerHTML;
      if (fx) { fx.click(); fx.click(); }
      r.cancelOnce = canceled === 1 && got.xGlyph === true && !fr.querySelector(':scope > .c-fbubble__cancel');
      /* no Open link: built complete, flipped complete; the card still opens */
      const cr = S.createFileBubble({ direction: 'received', name: 'b.pdf', state: 'complete', size: 2000, timestamp: Date.now(), strings: {}, onOpen: () => { opened += 1; } });
      const pr = S.createFileBubble({ direction: 'received', name: 'c.pdf', state: 'progress', progress: 40, size: 2000, timestamp: Date.now(), strings: {}, onOpen: () => { opened += 1; } });
      host.append(cr, pr);
      S.setFileProgress(pr, 100);
      cr.querySelector('.c-fbubble').click();
      got.opened = opened;
      r.noOpenLink = !/Open file/.test(got.complete) && !cr.querySelector('.c-fbubble__open') && !/Open file/.test(cr.textContent)
        && !pr.querySelector('.c-fbubble__open') && !/Open file/.test(pr.textContent) && pr.querySelector('.c-fbubble').dataset.state === 'complete'
        && opened === 1;
      r.kept = got.completeTick && got.gone === 'Not available on this device';
      r.noErr = K.noErr(s.errs);
    } finally { s.W.close(); }
  } catch (e) { r.err = e.message; }
  ok(Object.values(r).every((v) => v === true),
    '★★ S20 Q J3 (#1440) the file bubble on the built chat shell: my sending file\'s Cancel is a ✕ on the tile (paired with the card, no button outside the bubble, the x glyph, today\'s name), one click calls onCancel once, the first tick drops it; no "Open file" link on a complete card (built or flipped) while the card still opens; the tick and "Not available" unchanged — '
    + JSON.stringify({ r, got }));
}
