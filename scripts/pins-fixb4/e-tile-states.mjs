/* ==== fixb4 item 5 (agent `tile`) — the states of a picture-named file that is NOT a picture (W-2 F, docs/fixb4-mechanisms.md § 5) ====
 * Finding: Damir sent a TEXT file named `broken.jpg` to a Seed contact. A Seed contact never takes a file (its address is a hash with
 * no key: Spixi/Utils/SDevSeed.cs:7-9), so no acceptFile comes back, C# never sends updateFile, and MY file stays in the `progress`
 * state for good: the JPG glyph, a 0 % ring, "0%", "Keep Spixi open until it's sent." and Cancel (chat.html fileStateFrom
 * `if (asBool(me)) return 'progress';`). The cap `photoTileLite` changes COMPLETE tiles only (typed-bubbles.js `lite: lite && state === 'complete'`),
 * so ON and OFF draw the same here. The fallback is not broken; the walk row was wrong. This pin holds the states, in the BUILT chat.html
 * in jsdom through the shell's own pushes (e-kit `open`: the C# order onChatScreenReady → setChatMode → setCaps → setPhotoPreviews True →
 * clearMessages → rows → messagesDone → onChatScreenLoaded), with the cap ON (`reply,photoTileLite`) and OFF (`reply`):
 *   (a) my unsent file (addFile me=True, progress 0, complete=False): the PROGRESS face — ring at 0, "0%", the keep-open hint, Cancel, no
 *       "Open file" — and the WHOLE row is byte-equal ON vs OFF (clock masked, e-kit normRow);
 *   (b) updateFile(fileid, '100', 'True'): Cancel is gone, the ring is gone, the tile shows the file card with "Open file", the row is
 *       byte-equal ON vs OFF, and a click sends `ixian:openfile:<fileid>`;
 *   (c) a reopen with the file complete and NO thumb — mine and one I RECEIVED — and a reopen where the picture is pushed but cannot be
 *       decoded (an `error` event on the <img>): ON = no face at 80 ms and the card after the quiet wait (+1000 ms), OFF = the card at once;
 *       at +1000 ms ON equals OFF (the overlay emptied by design: masked as in e-tile.mjs); a click sends `ixian:openfile:<fileid>`.
 * LIMITS: jsdom lays nothing out and decodes no image (the `error` event is dispatched by the pin, as the shell would get it); the quiet wait
 * is real time (sleeps; the kit freezes performance.now while the rows are built); this pin does not run C# — that a Seed peer never answers
 * is read from the source (SDevSeed.cs), not executed here; the "File sent" toast is outside the row and not read.
 * Deliberate breaks (#802) — each ONE token in a scratch copy of the BUILT html (chat.html / spixi.bundle.js, run with --root), red keys:
 *   chat.html  fileStateFrom `if (asBool(me)) return 'progress';` → 'complete' ............................ (a) (a2)
 *   bundle     `lite: lite && state === 'complete'` → `lite: lite` (a sending tile goes lite) .............. (a2)
 *   chat.html  updateFile `rec.fstate = done ? 'complete' : 'progress'` → `'progress'` .................... (b) (b2) (b3)
 *   chat.html  `'ixian:openfile:' + rec.fileid` → `rec.id` ................................................ (b3) (c4)
 *   bundle     unquiet `if (lite) ensureFace(); delete` → `if (false) …` ................................. (c2) (c3)
 *   bundle     setImageFileProgress `if (cancelBtn) cancelBtn.remove();` → `if (false) …` .................. (b) */
import { kit } from '../pins-photo1b/e-kit.mjs';
export default async function (h) {
  const { ok, root, join, sleep } = h;
  const K = kit(h);
  const html = join(root, 'Spixi/Resources/Raw/html/chat.html');
  const ON = 'reply,photoTileLite';
  const OFF = 'reply';
  const T0 = K.T0;
  /* addFile argument list: id, address, nick, avatar, fileid, name, time, me, sent, read, progress, complete, paid, relaySent, transfer, local, voice, group, played, size */
  const file = (id, me, progress, complete, name = 'broken.jpg') => ['addFile', id, me ? 'addrMe' : 'addrPeer', me ? 'Me' : 'Seed 01', '', 'x' + id, name, String(T0),
    me ? 'True' : 'False', me ? 'False' : 'True', me ? 'False' : 'True', progress, complete, 'False', me ? 'False' : 'True', '', '1', '', '', '', '23'];
  const tileOf = (s, id) => { const r = K.rowOf(s.d, id); return r && r.querySelector('.c-mbubble[data-file]'); };
  const faceOf = (s, id) => { const t = tileOf(s, id); return t && t.querySelector(':scope > .c-mbubble__file'); };
  /* the overlay of a complete lite tile is empty by design (e-tile.mjs `masked`) */
  const masked = (row) => { const c = row.cloneNode(true); for (const o of c.querySelectorAll('.c-mbubble__overlay')) o.replaceChildren(); return K.normRow(c); };
  const look = (s, id) => {
    const row = K.rowOf(s.d, id), t = tileOf(s, id), f = faceOf(s, id);
    const q = (sel, el = row) => (el ? el.querySelector(sel) : null);
    const ring = q('.c-mbubble__ring', f);
    const txt = (el) => (el ? el.textContent.trim() : null);
    return {
      state: t ? t.dataset.file : null,
      face: !!f,
      ring: !!ring,
      ringNow: ring ? ring.getAttribute('aria-valuenow') : null,
      cap: txt(q('.c-mbubble__cap', f)),
      hint: txt(q('.c-mbubble__hint', f)),
      cta: txt(q('.c-mbubble__cta', f)),
      cancel: txt(q('.c-fbubble__cancel')),
      glyph: txt(q('.c-mbubble__file .c-fbubble__ext, .c-mbubble__file [class*="ext"]', row)),
      quiet: t ? t.hasAttribute('data-quiet') : null,
    };
  };
  const opens = (s, from) => s.sent.slice(from).filter((x) => /^ixian:(viewImage|openfile)/.test(x));

  /* ── (a) + (b): my unsent file, then its completion ── */
  const sending = async (caps) => {
    const s = await K.open(html, { caps, rows: [file('u1', true, '0', 'False')], settle: 120 });
    const r = {};
    r.a = look(s, 'u1');
    r.aRow = K.normRow(K.rowOf(s.d, 'u1'));
    await sleep(800);   // the quiet wait is over: a progress tile does not change with it
    r.aLate = look(s, 'u1');
    r.aLateRow = K.normRow(K.rowOf(s.d, 'u1'));
    s.push('updateFile', 'xu1', '100', 'True');
    await sleep(250);
    r.b = look(s, 'u1');
    r.bRow = K.normRow(K.rowOf(s.d, 'u1'));
    r.bMasked = masked(K.rowOf(s.d, 'u1'));
    const n = s.sent.length;
    const t = tileOf(s, 'u1');
    if (t) t.click();
    await sleep(80);
    r.bClick = opens(s, n);
    r.errs = s.errs.filter((e) => /TypeError|ReferenceError|dispatch failed/.test(e)).length;
    s.dom.window.close();
    return r;
  };
  const sOn = await sending(ON);
  const sOff = await sending(OFF);
  const prog = (a) => a.state === 'progress' && a.face && a.ring && a.ringNow === '0' && a.cap === '0%' && /Keep Spixi open until it['’]s sent\./.test(a.hint || '') && a.cancel === 'Cancel' && a.cta === null;
  ok(prog(sOn.a) && prog(sOff.a),
    '★ fixb4 tile (a): my unsent file `broken.jpg` (me, progress 0, not complete) is the PROGRESS face — ring at 0, "0%", "Keep Spixi open until it\'s sent.", Cancel, no "Open file" — cap ON and OFF — ' + JSON.stringify({ on: sOn.a, off: sOff.a }));
  ok(sOn.aRow === sOff.aRow && sOn.aRow.length > 200 && sOn.aLateRow === sOff.aLateRow && prog(sOn.aLate) && prog(sOff.aLate),
    '★ fixb4 tile (a2): the WHOLE row of the unsent file is byte-equal cap ON vs OFF (at the open and after the quiet wait) and stays the progress face — the switch does not change a sending tile — ' + JSON.stringify({ len: sOn.aRow.length, open: sOn.aRow === sOff.aRow, late: sOn.aLateRow === sOff.aLateRow }));
  const card = (b) => b.state === 'complete' && b.face && !b.ring && b.cancel === null && b.cta === 'Open file' && b.hint === null;
  ok(card(sOn.b) && card(sOff.b),
    '★ fixb4 tile (b): after updateFile(fileid, 100, True) Cancel is gone, the ring is gone and the tile shows the file card with "Open file" — cap ON and OFF — ' + JSON.stringify({ on: sOn.b, off: sOff.b }));
  ok(sOn.bMasked === sOff.bMasked && sOn.b.cap === 'broken.jpg' && sOff.b.cap === 'broken.jpg',
    '★ fixb4 tile (b2): the card after the flip names the file (`broken.jpg`) and the row is the same markup cap ON as OFF (overlay emptied, clock masked) — ' + JSON.stringify({ capOn: sOn.b.cap, capOff: sOff.b.cap, same: sOn.bMasked === sOff.bMasked }));
  ok(sOn.bClick.join() === 'ixian:openfile:xu1' && sOff.bClick.join() === 'ixian:openfile:xu1' && sOn.errs === 0 && sOff.errs === 0,
    '★ fixb4 tile (b3): a click on the completed card sends the open-file verb `ixian:openfile:xu1` (not the picture viewer) — ' + JSON.stringify({ on: sOn.bClick, off: sOff.bClick, errs: [sOn.errs, sOff.errs] }));

  /* ── (c) the reopen: a complete broken file with no thumb / a picture that cannot be decoded ── */
  const reopen = async (caps) => {
    const rows = [file('m1', true, '100', 'True'), file('r1', false, '100', 'True'), file('m2', true, '100', 'True'), file('r2', false, '100', 'True')];
    const s = await K.open(html, {
      caps, rows, settle: 80,
      afterLoad: (x) => { x.push('setFileThumb', 'm2', K.JPG); x.push('setFileThumb', 'r2', K.JPG); },   // a picture is told for m2 / r2 and then fails to decode
    });
    const r = { early: {}, late: {}, lateRow: {}, click: {} };
    const ids = ['m1', 'r1', 'm2', 'r2'];
    for (const id of ['m2', 'r2']) { const im = tileOf(s, id).querySelector('.c-mbubble__img'); if (im) im.dispatchEvent(new s.W.Event('error')); }
    for (const id of ids) r.early[id] = look(s, id);
    await sleep(1000);
    for (const id of ids) { r.late[id] = look(s, id); r.lateRow[id] = masked(K.rowOf(s.d, id)); }
    for (const id of ids) { const n = s.sent.length; tileOf(s, id).click(); await sleep(60); r.click[id] = opens(s, n).join(); }
    r.errs = s.errs.filter((e) => /TypeError|ReferenceError|dispatch failed/.test(e)).length;
    s.dom.window.close();
    return r;
  };
  const rOn = await reopen(ON);
  const rOff = await reopen(OFF);
  const noThumb = ['m1', 'r1'];
  ok(noThumb.every((id) => rOn.early[id].face === false && rOn.early[id].quiet === true) && noThumb.every((id) => rOff.early[id].face === true && rOff.early[id].cta === 'Open file'),
    '★ fixb4 tile (c1): a reopen with the file complete and NO thumb (mine m1, received r1): cap ON = no face at 80 ms (the quiet tile), cap OFF = the card at once — ' + JSON.stringify({ on: noThumb.map((id) => [rOn.early[id].face, rOn.early[id].quiet]), off: noThumb.map((id) => [rOff.early[id].face, rOff.early[id].cta]) }));
  ok(noThumb.every((id) => rOn.late[id].face && rOn.late[id].cta === 'Open file' && rOn.late[id].cap === 'broken.jpg' && rOn.late[id].quiet === false && rOn.lateRow[id] === rOff.lateRow[id]),
    '★ fixb4 tile (c2): after the quiet wait (+1000 ms) cap ON shows the card (icon, `broken.jpg`, "Open file") and the row equals cap OFF\'s — mine and received — ' + JSON.stringify(noThumb.map((id) => [rOn.late[id].cta, rOn.late[id].quiet, rOn.lateRow[id] === rOff.lateRow[id]])));
  const decode = ['m2', 'r2'];
  ok(decode.every((id) => rOn.late[id].face && rOn.late[id].cta === 'Open file' && rOff.late[id].cta === 'Open file' && rOn.lateRow[id] === rOff.lateRow[id]) && decode.every((id) => rOn.early[id].face && rOn.early[id].cta === 'Open file'),
    '★ fixb4 tile (c3): a picture that is told but cannot be decoded (error event) → the card with "Open file" at once, cap ON and OFF, same row after the wait — ' + JSON.stringify({ early: decode.map((id) => [rOn.early[id].face, rOn.early[id].cta]), late: decode.map((id) => rOn.lateRow[id] === rOff.lateRow[id]) }));
  ok(ids4(rOn.click, 'xm1 xr1 xm2 xr2') && ids4(rOff.click, 'xm1 xr1 xm2 xr2') && rOn.errs === 0 && rOff.errs === 0,
    '★ fixb4 tile (c4): a click on each reopened card sends `ixian:openfile:<fileid>` (cap ON and OFF), never an empty square — ' + JSON.stringify({ on: rOn.click, off: rOff.click }));
  function ids4(click, list) { const ids = list.split(' '); return ['m1', 'r1', 'm2', 'r2'].every((id, i) => click[id] === 'ixian:openfile:' + ids[i]); }
}
