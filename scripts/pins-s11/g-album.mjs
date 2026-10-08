/* ==== S11 G — ★★ #1263 (a) = A: the Telegram MOSAIC album on the BUILT chat.html ====
 *   · the row table (mosaicRows 1…10: 1 · 2 · 1+2 · 2+2 · 2+3 · 3+3 · 3+4 · 2+3+3 · 3+3+3 · 3+3+4) and the geometry the grid
 *     carries (aspect ratio + row fr = mosaicGeometry);
 *   · a received group of 7 shows ALL seven cells (rows 3 + 4: data-row 3,3,3,4,4,4,4), no "+N", "7 photos";
 *   · EVERY cell has its own menu — the 4th (S10's "+N" cell, walk #1260) and the 7th answer a right-click, and the menu's
 *     Reply on the 7th replies to THAT photo;
 *   · the FOOTER under the photos of a received group with offers: "Download all (2) · 1.6 MB" (addFile arg 20) + the time;
 *     the cells' own times hide (computed display none); one offer with no size (an old exe) → "Download all (2)";
 *   · past MOSAIC_MAX a passive "+N" LABEL (a span, aria-hidden, pointer-events none) — the last cell's tile and menu
 *     stay live;
 *   · DESKTOP: the hover Reply of a group row sits BESIDE the album (after the column on a received row, before it on a
 *     sent one; computed position relative — not the absolute --reply-btn-x geometry that put it over the second photo).
 * Deliberate breaks (G-brk): see the S11 G report. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = b1Kit(h);
  const { sleep, JPG, T0 } = K;
  const GID = '0123456789abcdef';
  let s = null;
  const r = {};
  try {
    s = await K.open({ caps: 'reply,edit,media', rows: false });
    const { d, push, W } = s;
    const S = W.Spixi;
    /* 1. the table + geometry */
    const table = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => S.mosaicRows(n).join('+')).join(' ');
    r.table = table === '1 2 1+2 2+2 2+3 3+3 3+4 2+3+3 3+3+3 3+3+4' && S.mosaicRows(0).join() === '1' && S.mosaicRows(99).join() === '3,3,4' && S.MOSAIC_MAX === 10;
    const g7 = S.mosaicGeometry(7);
    r.geometry = g7.template === '0.333fr 0.25fr' && Math.abs(g7.ratio - 1 / (1 / 3 + 0.25)) < 0.002;
    /* 2. seven received photos, two offers (f2, f5) with sizes, the rest complete */
    const t = (n) => String(T0 + n);
    for (let i = 0; i < 7; i++) {
      const offer = i === 2 || i === 5;
      push('addFile', 'f' + i, 'addrPeer', 'Ana', '', 'x' + i, 'lake' + i + '.jpg', t(30 + i), 'False', 'True', 'True', offer ? '0' : '100', offer ? 'False' : 'True', 'False', 'True', '', offer ? '' : '1', '', GID + '|' + i + '|7|', '', offer ? '838861' : '');
    }
    push('messagesDone');
    push('onChatScreenLoaded');
    for (let i = 0; i < 7; i++) if (i !== 2 && i !== 5) push('setFileThumb', 'f' + i, JPG);
    await sleep(300);
    const row = K.rowOf(d, 'f0');
    const grid = row && row.querySelector('.c-mgrid');
    const cells = grid ? [...grid.querySelectorAll(':scope > .c-mgrid__cell')] : [];
    r.allSeven = !!grid && grid.dataset.n === '7' && cells.length === 7 && !grid.querySelector('.c-mgrid__more') && grid.getAttribute('aria-label') === '7 photos';
    r.rows = cells.map((c) => c.dataset.row).join('') === '3334444';
    r.gridGeometry = !!grid && grid.style.getPropertyValue('--mosaic-rows') === '0.333fr 0.25fr' && Math.abs(Number(grid.style.getPropertyValue('--mosaic-ratio')) - g7.ratio) < 0.001;
    /* jsdom lays nothing out: the built css must turn the row length into the column span and read the geometry */
    const css = h.stripCssComments(h.readFileSync(h.join(h.root, 'Spixi/Resources/Raw/html/chat.html'), 'utf8'));
    r.spans = /\.c-mgrid \{[^}]*grid-template-columns: repeat\(12, minmax\(0, 1fr\)\);[^}]*grid-template-rows: var\(--mosaic-rows, 1fr\);[^}]*aspect-ratio: var\(--mosaic-ratio, 1\);/.test(css)
      && /\.c-mgrid > \.c-mgrid__cell\[data-row="2"\] \{ grid-column: span 6; \}/.test(css) && /\.c-mgrid > \.c-mgrid__cell\[data-row="3"\] \{ grid-column: span 4; \}/.test(css)
      && /\.c-mgrid > \.c-mgrid__cell\[data-row="4"\] \{ grid-column: span 3; \}/.test(css);
    /* 3. the footer */
    const foot = row && row.querySelector('.c-mgrid-box > .c-mgrid__foot');
    const dl = foot && foot.querySelector('.c-mgrid__dlall');
    r.footer = !!dl && dl.textContent.trim() === 'Download all (2) · 1.6 MB' && !!foot.querySelector('time.c-mgrid__time')
      && foot.lastElementChild.tagName === 'TIME' && row.querySelector('.c-mgrid-box').hasAttribute('data-dlall');
    const cellTime = cells[6] && cells[6].querySelector('.c-mbubble__time');
    r.cellTimeHidden = !!cellTime && W.getComputedStyle(cellTime).display === 'none';
    if (dl) dl.click();
    await sleep(60);
    r.acceptsBoth = s.sent.filter((v) => v.startsWith('ixian:acceptfile:')).join() === 'ixian:acceptfile:x2,ixian:acceptfile:x5';
    /* 4. EVERY cell its own menu — the 4th and the 7th; Reply on the 7th → that photo */
    const menuOn = async (cell) => {
      cell.querySelector('.c-mbubble').dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
      await sleep(150);
      const rep = [...d.querySelectorAll('[role="menuitem"], .c-menu__item, button')].find((b) => /^Reply$/.test((b.textContent || '').trim()));
      return rep || null;
    };
    const cellsNow = () => [...K.rowOf(d, 'f0').querySelectorAll('.c-mgrid > .c-mgrid__cell')];
    const rep4 = await menuOn(cellsNow()[3]);
    r.menu4th = !!rep4;
    if (rep4) rep4.click();
    await sleep(120);
    const comp = d.querySelector('.c-composer');
    r.reply4th = (S.getComposerContext(comp) || {}).replyId === 'f3';
    S.cancelComposerContext(comp);
    await sleep(450);
    const rep7 = await menuOn(cellsNow()[6]);
    if (rep7) rep7.click();
    await sleep(120);
    r.reply7th = !!rep7 && (S.getComposerContext(comp) || {}).replyId === 'f6';
    S.cancelComposerContext(comp);
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
  finally { if (s) { try { s.W.close(); } catch (_) {} s = null; } }
  if (process.env.GDBG) console.log(JSON.stringify(r));
  ok(Object.values(r).length > 10 && Object.values(r).every((x) => x === true),
    '★★ S11 G (#1263 a = A) the MOSAIC album on the built chat shell: the row table 1…10 + the grid geometry; seven received photos = seven cells in rows 3 + 4 (no "+N"); every cell has its own menu (the 4th and the 7th reply to THEIR photo); the footer says "Download all (2) · 1.6 MB" (addFile arg 20) beside the time, the cells\' own times hide, a tap accepts both offers — ' + JSON.stringify(r));

  /* —— an old exe (no arg 20) → no size; past MOSAIC_MAX a passive label; the desktop hover Reply beside the album —— */
  const o = {};
  try {
    s = await K.open({ caps: 'reply,media', rows: false, mobile: false });
    const { d, push, W } = s;
    for (let i = 0; i < 3; i++) {
      const offer = i > 0;
      push('addFile', 'a' + i, 'addrPeer', 'Ana', '', 'y' + i, 'hill' + i + '.jpg', String(T0 + 10 + i), 'False', 'True', 'True', offer ? '0' : '100', offer ? 'False' : 'True', 'False', 'True', '', offer ? '' : '1', '', 'aaaaaaaaaaaaaaa1|' + i + '|3|');
    }
    /* twelve members of one tag (a duplicate index past the tenth) → ten cells + "+2" */
    for (let i = 0; i < 12; i++) push('addFile', 'm' + i, 'addrMe', 'Me', '', 'z' + i, 'me' + i + '.jpg', String(T0 + 40 + i), 'True', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', 'bbbbbbbbbbbbbbb2|' + (i % 10) + '|10|');
    push('messagesDone');
    push('onChatScreenLoaded');
    for (let i = 0; i < 12; i++) push('setFileThumb', 'm' + i, JPG);
    await sleep(300);
    const ra = K.rowOf(d, 'a0');
    const dl = ra && ra.querySelector('.c-mgrid__dlall');
    o.noSize = !!dl && dl.textContent.trim() === 'Download all (2)';
    const rm = K.rowOf(d, 'm0');
    const gm = rm && rm.querySelector('.c-mgrid');
    const lastCell = gm && gm.querySelectorAll(':scope > .c-mgrid__cell')[9];
    const more = lastCell && lastCell.querySelector('.c-mgrid__more');
    o.passiveMore = !!gm && gm.querySelectorAll(':scope > .c-mgrid__cell').length === 10 && !!more && more.tagName === 'SPAN'
      && more.textContent === '+2' && more.getAttribute('aria-hidden') === 'true' && W.getComputedStyle(more).pointerEvents === 'none'
      && !rm.querySelector('button.c-mgrid__more') && lastCell.querySelector('.c-mbubble').tabIndex !== -1;
    o.desktop = d.documentElement.hasAttribute('data-desktop');
    /* hover → the Reply button BESIDE the album: after the column (received), before it (sent), a flex item (relative) */
    const hover = (rw) => rw.querySelector('.c-mbubble').dispatchEvent(new W.MouseEvent('pointerover', { bubbles: true }));
    hover(ra);
    await sleep(40);
    const bA = ra.querySelector(':scope > .c-bubble-row__reply');
    const at = (rw, el) => [...rw.children].indexOf(el);
    o.receivedBeside = !!bA && at(ra, bA) > at(ra, ra.querySelector(':scope > .c-mgrid-col')) && W.getComputedStyle(bA).position === 'relative';
    hover(rm);
    await sleep(40);
    const bM = rm.querySelector(':scope > .c-bubble-row__reply');
    o.sentBeside = !!bM && bM.nextElementSibling === rm.querySelector(':scope > .c-mgrid-col') && W.getComputedStyle(bM).position === 'relative';
    /* the group's hover Reply quotes the group (its lead), as the swipe does */
    if (bA) bA.click();
    await sleep(80);
    o.groupReply = (W.Spixi.getComposerContext(d.querySelector('.c-composer')) || {}).replyId === 'a0';
    o.noErr = K.noErr(s.errs);
  } catch (e) { o.err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
  finally { if (s) { try { s.W.close(); } catch (_) {} s = null; } }
  if (process.env.GDBG) console.log(JSON.stringify(o));
  ok(Object.values(o).length > 6 && Object.values(o).every((x) => x === true),
    '★ S11 G (#1263 a) an older exe (no size) keeps "Download all (n)"; past MOSAIC_MAX the "+N" is a passive LABEL (span, aria-hidden, pointer-events none; the tile stays live); on the desktop the hover Reply sits BESIDE the album (after it received, before it sent — a flex item, not the measured --reply-btn-x that put it over the photos) and quotes the group — ' + JSON.stringify(o));
}
