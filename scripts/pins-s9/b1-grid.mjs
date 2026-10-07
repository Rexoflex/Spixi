/* ==== S9 B1 — #1244 G = A (+ #1169): the photo GROUP bubble on the BUILT chat.html ====
 *   · 7 received photos tagged with one gid (addFile arg 18) + the caption text (id = the tag's caption id) → ONE row:
 *     a 2×2 grid (4 cells) with "+3" on the fourth, the caption under the grid in the same bubble, and the caption row and
 *     the other photos gone from the log; every member id finds the bubble (rows map) — the reply quote jump target
 *   · 3 sent photos, no caption → 3 cells (one tall + two); 2 → side by side; a single tagged photo with no caption stays an
 *     ordinary tile; an OLD exe (no arg 18) → seven ordinary tiles
 *   · per-cell states: an offered cell is the offer tile and its tap sends acceptfile for THAT file; a live updateFile on a
 *     member patches only its own cell; a late member joins the bubble
 *   · a tap on a complete cell → the viewer over the group's complete photos ("2 / 3"), its next page asks viewImage for that
 *     photo; a long-press menu Select selects the group; a bulk Delete deletes every photo + the caption
 * #46 r1: M2 one summed pill set on the bubble (groupPills) · M7 the viewer's focus stays on a button at the end (navFocus).
 * Deliberate breaks (S9 B1 hand-back): planPhotoGroups' `list.length < 2 && !caption` → `< 1` → single · the caption
 *   `inWindow` match → never → caption · liveRowOf → rows.get only → ownCell · groupViewerItems → null → viewer ·
 *   confirmBulkDelete's group expansion → the item alone → bulkAll */
import { b1Kit } from './b1-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = b1Kit(h);
  const { sleep, JPG, T0 } = K;
  const GID = '0123456789abcdef';
  const G2 = 'fedcba9876543210';
  const G3 = '1111111111111111';
  const r = {};
  try {
    const s = await K.open({ caps: 'reply,edit,media', rows: false });
    const { d, push } = s;
    const t = (n) => String(T0 + n);
    for (let i = 0; i < 7; i++) {
      const complete = i !== 2;
      push('addFile', 'f' + i, 'addrPeer', 'Ana', '', 'x' + i, 'lake' + i + '.jpg', t(30 + i), 'False', 'True', 'True', complete ? '100' : '0', complete ? 'True' : 'False', 'False', 'True', '', '1', '', GID + '|' + i + '|7|c0ffee01');
    }
    push('addThem', 'c0ffee01', 'addrPeer', 'Ana', '', 'Photos from the lake', t(40), 'True', 'True', 'True', 'False', 'False');
    for (let i = 0; i < 3; i++) push('addFile', 'e' + i, 'addrMe', 'Me', '', 'y' + i, 'me' + i + '.jpg', t(90 + i), 'True', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', G2 + '|' + i + '|3|');
    push('addFile', 'd0', 'addrMe', 'Me', '', 'z0', 'two0.jpg', t(120), 'True', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', G3 + '|0|2|');
    push('addFile', 'b0', 'addrMe', 'Me', '', 'w0', 'alone.jpg', t(130), 'True', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', '2222222222222222|0|1|');
    push('messagesDone');
    push('onChatScreenLoaded');
    for (let i = 0; i < 7; i++) if (i !== 2) push('setFileThumb', 'f' + i, JPG);
    for (let i = 0; i < 3; i++) push('setFileThumb', 'e' + i, JPG);
    await sleep(300);
    const logIds = () => [...d.querySelectorAll('#messages > [data-msgid]')].map((x) => x.dataset.msgid);
    const g1 = K.rowOf(d, 'f0');
    const grid1 = g1 && g1.querySelector('.c-mgrid');
    r.oneBubble = !!grid1 && grid1.dataset.n === '4' && grid1.querySelectorAll(':scope > .c-mgrid__cell').length === 4
      && (grid1.querySelector('.c-mgrid__more') || {}).textContent === '+3' && grid1.getAttribute('aria-label') === '7 photos';
    r.caption = !!g1 && (g1.querySelector('.c-mgrid__caption') || {}).textContent === 'Photos from the lake'
      && !logIds().includes('c0ffee01') && !logIds().some((x) => /^f[1-6]$/.test(x));
    const g2 = K.rowOf(d, 'e0');
    r.three = !!g2 && g2.querySelector('.c-mgrid').dataset.n === '3' && !g2.querySelector('.c-mgrid__caption') && !logIds().includes('e1');
    r.single = !!K.rowOf(d, 'b0') && !K.rowOf(d, 'b0').querySelector('.c-mgrid') && !!K.rowOf(d, 'b0').querySelector('.c-mbubble[data-file]')
      && !!K.rowOf(d, 'd0') && !K.rowOf(d, 'd0').querySelector('.c-mgrid');
    /* a late member joins: the second of the pair arrives live */
    push('addFile', 'd1', 'addrMe', 'Me', '', 'z1', 'two1.jpg', t(121), 'True', 'True', 'True', '40', 'False', 'False', 'True', '', '1', '', G3 + '|1|2|');
    await sleep(120);
    const g3 = K.rowOf(d, 'd0');
    r.lateJoins = !!g3 && !!g3.querySelector('.c-mgrid[data-n="2"]') && !logIds().includes('d1');
    /* the offered cell (f2, the third photo) → acceptfile for x2 */
    const cell2 = grid1 ? grid1.querySelectorAll(':scope > .c-mgrid__cell')[2] : null;
    const tile2 = cell2 && cell2.querySelector('.c-mbubble[data-file]');
    r.offerCell = !!tile2 && tile2.dataset.file === 'offer';
    if (tile2) tile2.click();
    await sleep(60);
    r.acceptThat = s.sent.includes('ixian:acceptfile:x2');
    /* a live tick on f2 patches ITS cell only */
    push('updateFile', 'x2', '50', 'False');
    await sleep(80);
    const g1b = K.rowOf(d, 'f0');
    const cells = g1b ? [...g1b.querySelectorAll('.c-mgrid > .c-mgrid__cell')] : [];
    /* the second tick is the IN-PLACE path (the cell is already "progress"): it must land on f2's ring, not the first cell */
    push('updateFile', 'x2', '60', 'False');
    await sleep(80);
    const ring2 = cells[2].querySelector('.c-mbubble__ring');
    r.ownCell = cells.length === 4 && K.rowOf(d, 'f0') === g1b && cells[2].isConnected && cells[2].querySelector('.c-mbubble').dataset.file === 'progress'
      && !!ring2 && ring2.getAttribute('aria-valuenow') === '60'
      && cells[0].querySelector('.c-mbubble').dataset.file === 'complete' && cells[1].querySelector('.c-mbubble').dataset.file === 'complete';
    /* the viewer pages through the group's COMPLETE photos (f0, f1, f3, f4, f5, f6 → 6) */
    const before = s.sent.length;
    for (const c of cells) { const im = c.querySelector('.c-mbubble__img'); if (im && im.getAttribute('src')) im.dispatchEvent(new s.W.Event('load')); }   // jsdom never loads an image
    await sleep(120);
    cells[1].querySelector('.c-mbubble').click();
    await sleep(120);
    const v = d.querySelector('.c-mviewer');
    r.viewer = !!v && (v.querySelector('.c-mviewer__count') || {}).textContent === '2 / 6' && s.sent.slice(before).includes('ixian:viewImage:f1');
    const next = v && v.querySelector('.c-mviewer__next');
    if (next) next.click();
    await sleep(60);
    r.page = !!v && v.querySelector('.c-mviewer__count').textContent === '3 / 6' && s.sent.includes('ixian:viewImage:f3');
    /* ★ #46 M7: paging to the END with focus on › hands focus to ‹ (a disabled button would drop it to BODY) */
    for (let i = 0; i < 6 && next && !next.disabled; i++) { next.focus(); next.click(); await sleep(20); }
    r.navFocus = !!next && next.disabled && d.activeElement === v.querySelector('.c-mviewer__prev');
    if (v) v.dispatchEvent(new s.W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(500);
    /* ★ #46 M2: ONE summed pill set on the bubble (photos + caption + photos past the fourth), none on a cell */
    push('addReactions', 'c0ffee01', 'like:❤️:1;', '');
    push('addReactions', 'f5', 'like:😂:2;', '');
    push('addReactions', 'f0', 'like:❤️:1;', '');
    await sleep(150);
    const gr = K.rowOf(d, 'f0');
    const sets = gr ? [...gr.querySelectorAll('.c-reactions')] : [];
    const txt = sets.length ? sets[0].textContent.replace(/\s+/g, '') : '';
    r.groupPills = sets.length === 1 && !sets[0].closest('.c-mgrid') && gr.dataset.reactions === 'overlap' && /❤️2/.test(txt) && /😂2/.test(txt);
    r.noErr = K.noErr(s.errs);
    s.W.close();
  } catch (e) { r.err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
  if (process.env.B1DBG) console.log(JSON.stringify(r));
  ok(Object.values(r).every((x) => x === true),
    '★★ S9 B1 (#1244 G = A, #1169) the photo group on the built chat shell: seven tagged photos + their caption = ONE bubble (2×2, "+3", "7 photos", the caption under the grid, the caption row and members gone from the log); three = one tall + two; a single tagged photo stays a tile; a late member joins; the offered cell accepts THAT file; a live tick patches its own cell; a tap opens the viewer over the group\'s complete photos and paging asks viewImage for each — ' + JSON.stringify(r));

  /* —— an old exe: no arg 18 → ordinary tiles; Select + bulk Delete takes the whole group —— */
  const o = {};
  try {
    const s = await K.open({ caps: 'reply,media', rows: false });
    const { d, push } = s;
    for (let i = 0; i < 3; i++) push('addFile', 'f' + i, 'addrPeer', 'Ana', '', 'x' + i, 'p' + i + '.jpg', String(T0 + 10 + i), 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '');
    push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(200);
    o.oldExeTiles = !d.querySelector('.c-mgrid') && d.querySelectorAll('#messages > [data-msgid] .c-mbubble[data-file]').length === 3;
    s.W.close();
    const s2 = await K.open({ caps: 'reply,media', rows: false });
    for (let i = 0; i < 2; i++) s2.push('addFile', 'a' + i, 'addrMe', 'Me', '', 'q' + i, 'm' + i + '.jpg', String(T0 + 10 + i), 'True', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', 'abcdefabcdefabcd|' + i + '|2|beef01');
    s2.push('addMe', 'beef01', 'addrMe', 'Me', '', 'two of us', String(T0 + 12), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '');
    s2.push('messagesDone');
    s2.push('onChatScreenLoaded');
    await sleep(200);
    const row = s2.d.querySelector('#messages > [data-msgid="a0"]');
    const cell = row && row.querySelector('.c-mgrid__cell');
    if (cell) cell.querySelector('.c-mbubble').dispatchEvent(new s2.W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(150);
    const sel = [...s2.d.querySelectorAll('.c-menu__item, [role="menuitem"], button')].find((b) => /^Select$/.test((b.textContent || '').trim()));
    if (sel) sel.click();
    await sleep(200);
    o.selectsGroup = s2.d.querySelector('#messages').hasAttribute('data-selecting') && !!row && row.dataset.selected !== undefined;
    const del = [...s2.d.querySelectorAll('.c-chatselect button, [class*="chatselect"] button')].find((b) => /delete/i.test(b.getAttribute('aria-label') || b.textContent || ''));
    if (del) del.click();
    await sleep(150);
    const conf = [...s2.d.querySelectorAll('.c-modal button')].find((b) => (b.textContent || '').trim() === 'Delete');
    if (conf) conf.click();
    await sleep(150);
    const dels = s2.sent.filter((v) => /delete/i.test(v));
    o.bulkAll = ['a0', 'a1', 'beef01'].every((id) => dels.some((v) => v.endsWith(':' + id))) && dels.length === 3;
    if (process.env.B1DBG) console.log(JSON.stringify({ dels, sel: !!sel, del: !!del, conf: !!conf }));
    o.noErr = K.noErr(s2.errs);
    s2.W.close();
  } catch (e) { o.err = e.message; }
  ok(Object.values(o).every((x) => x === true),
    '★ S9 B1 (#1244) an OLD exe (no addFile arg 18) keeps ordinary photo tiles; on a new one a cell\'s menu Select selects the GROUP and the bulk Delete deletes every photo and the caption (one message each) — ' + JSON.stringify(o));
}
