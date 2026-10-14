/* ==== S20 Q — E (#1376 / #1377 E; the TEXT re-based by #1402, v3 Damir 18:02): the file SIZE on the file card's second line ====
 * On the BUILT chat.html (jsdom, previews ON). C#'s addFile arg 20 (`size`, bytes) → rec.size → the card:
 *   · offer      "PDF · 2.4 MB" (#1402: the type first, then the size — the tile's ↓ badge says download; no call-to-action
 *                ink); an offer with NO size keeps today's "Tap to download" (desktop "Click to download")
 *   · transfer   "11 / 24 MB" (done = size × the integer pct, the total's unit said once), live: updateFile 50 → "12 / 24 MB";
 *                my own sending file too ("94 / 312 KB"), and its in-place completion flip → "XLSX · 312 KB"
 *   · complete   "PDF · 1.8 MB" (the extension upper-case) · no extension → "512 B"
 *   · unknown    size "" / absent → today's text: "Tap to download" · "45%" · "" (complete)
 *   · not available on this device (#1190) → unchanged "Not available on this device"
 *   · the photo tile's offer line (no preview) → "1.2 MB · Tap to download"
 *   · the accessible name carries the size: "Download Trip-plan.pdf, 2.4 MB" (#1035 / #1166 labels kept: the sent tick
 *     still joins — "Open Contract.pdf, 1.8 MB, Delivered"); no size → today's label
 *   · the units come from the string keys (unitB / unitKB / unitMB / unitGB): window.SL.unitMB = "Mo" → "2,4 Mo"-style
 *     text uses "Mo"; en-us carries the four English units.
 * (#1402 re-base: the offer / complete clauses were "2.4 MB · Tap to download" / "1.8 MB · PDF" in the #1377 E build.)
 * Deliberate breaks (S20 Q report): buildFileRow drops `size: rec.size` → every sized clause fails · formatFileSize's units
 * back to the hard-coded ['B','KB','MB','GB'] → the localised-unit clause fails · fileAria ignores bytes → the aria clauses
 * fail · setFileProgress keeps the bare percentage (no fileSizeLine) → the live tick clause fails · (#1402) the size before the type ("2.4 MB · PDF") → offer / flip / complete / desktop / units fail · (#46 r1) the extension cap 8 → 20 → extRule. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  const { ok, sleep, readFileSync, join, root } = h;
  const K = b1Kit(h);
  const { T0 } = K;
  const r = {};
  const got = {};
  /* addFile(id, address, nick, avatar, fileid, name, time, me, sent, read, progress, complete, paid, relaySent, transfer, local, voice, group, played, size) */
  const rows = (x, sl) => {
    if (sl) sl(x);
    x.push('addFile', 'o1', 'addrPeer', 'Ana', '', 'fo1', 'Trip-plan.pdf', String(T0), 'False', 'True', 'True', '0', 'False', 'False', 'True', '', '1', '', '', '', '2516582');
    x.push('addFile', 'o0', 'addrPeer', 'Ana', '', 'fo0', 'notes.txt', String(T0 + 10), 'False', 'True', 'True', '0', 'False', 'False', 'True', '', '1', '', '', '', '');
    x.push('addFile', 'p1', 'addrPeer', 'Ana', '', 'fp1', 'Holiday-video.mp4', String(T0 + 20), 'False', 'True', 'True', '45', 'False', 'False', 'True', 'live:45', '1', '', '', '', '25165824');
    x.push('addFile', 'p0', 'addrPeer', 'Ana', '', 'fp0', 'blob.bin', String(T0 + 30), 'False', 'True', 'True', '45', 'False', 'False', 'True', 'live:45', '1', '', '', '');   // an old exe: no arg 20
    x.push('addFile', 's1', 'addrMe', 'Me', '', 'fs1', 'Budget-2026.xlsx', String(T0 + 40), 'True', 'False', 'False', '30', 'False', 'False', 'True', '', '1', '', '', '', '319488');
    x.push('addFile', 'c1', 'addrMe', 'Me', '', 'fc1', 'Contract.pdf', String(T0 + 50), 'True', 'True', 'False', '100', 'True', 'False', 'True', '', '1', '', '', '', '1887437');
    x.push('addFile', 'c2', 'addrPeer', 'Ana', '', 'fc2', 'README', String(T0 + 60), 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', '', '', '512');
    x.push('addFile', 'c0', 'addrPeer', 'Ana', '', 'fc0', 'old.pdf', String(T0 + 70), 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', '', '', '');
    x.push('addFile', 'g1', 'addrMe', 'Me', '', 'fg1', 'gone.pdf', String(T0 + 80), 'True', 'True', 'False', '100', 'True', 'False', 'True', '', '0', '', '', '', '2516582');
    x.push('addFile', 'e8', 'addrPeer', 'Ana', '', 'fe8', 'pack.abcdefgh', String(T0 + 100), 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', '', '', '2048');
    x.push('addFile', 'e9', 'addrPeer', 'Ana', '', 'fe9', 'pack.abcdefghi', String(T0 + 110), 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', '', '', '2048');
    x.push('addFile', 'i1', 'addrPeer', 'Ana', '', 'fi1', 'IMG_0001.jpg', String(T0 + 90), 'False', 'True', 'True', '0', 'False', 'False', 'True', '', '1', '', '', '', '1258291');
  };
  const card = (d, id) => { const row = K.rowOf(d, id); return row && row.querySelector('.c-fbubble'); };
  const metaT = (d, id) => { const c = card(d, id); const m = c && c.querySelector('.c-fbubble__meta'); return m ? m.textContent : null; };
  const aria = (d, id) => { const c = card(d, id); return c ? c.getAttribute('aria-label') : null; };
  try {
    /* phone */
    const s = await K.open({ rows: false, hist: (x) => rows(x) });
    try {
      const { d, push } = s;
      await sleep(150);
      for (const id of ['o1', 'o0', 'p1', 'p0', 's1', 'c1', 'c2', 'c0', 'g1', 'e8', 'e9']) got[id] = metaT(d, id);
      got.o1Cta = !!(card(d, 'o1') || d).querySelector('.c-fbubble__meta[data-cta]');   // a sized offer is information, not the action ink
      got.o0Cta = !!(card(d, 'o0') || d).querySelector('.c-fbubble__meta[data-cta]');
      got.ariaO1 = aria(d, 'o1'); got.ariaO0 = aria(d, 'o0'); got.ariaC1 = aria(d, 'c1'); got.ariaP1 = aria(d, 'p1');
      const tile = K.rowOf(d, 'i1') && K.rowOf(d, 'i1').querySelector('.c-mbubble[data-file]');
      got.tileCta = tile ? (tile.querySelector('.c-mbubble__cta') || {}).textContent : null;
      got.tileAria = tile ? tile.getAttribute('aria-label') : null;
      push('updateFile', 'fp1', '50', 'False');
      push('updateFile', 'fs1', '30', 'False');
      await sleep(80);
      got.p1Live = metaT(d, 'p1');
      got.s1Live = metaT(d, 's1');
      push('updateFile', 'fs1', '100', 'True');
      await sleep(80);
      got.s1Done = metaT(d, 's1');
      got.ariaS1Done = aria(d, 's1');
      r.offer = got.o1 === 'PDF · 2.4 MB' && got.o1Cta === false && got.o0Cta === true;
      r.offerUnknown = got.o0 === 'Tap to download';
      r.transfer = got.p1 === '11 / 24 MB' && got.s1 === '94 / 312 KB';
      r.transferUnknown = got.p0 === '45%';
      r.live = got.p1Live === '12 / 24 MB' && got.s1Live === '94 / 312 KB';
      r.flip = got.s1Done === 'XLSX · 312 KB';
      r.complete = got.c1 === 'PDF · 1.8 MB' && got.c2 === '512 B';
      r.completeUnknown = got.c0 === '';
      r.extRule = got.e8 === 'ABCDEFGH · 2 KB' && got.e9 === '2 KB';   // #46 r1 auditor C: #1005's rule — an 8-char extension shows, a 9-char tail is not one
      r.unavailable = got.g1 === 'Not available on this device';
      r.tile = got.tileCta === '1.2 MB · Tap to download' && /^Download IMG_0001\.jpg, 1\.2 MB/.test(got.tileAria || '');
      r.aria = got.ariaO1 === 'Download Trip-plan.pdf, 2.4 MB' && got.ariaO0 === 'Download notes.txt'
        && got.ariaC1 === 'Open Contract.pdf, 1.8 MB, Delivered' && got.ariaP1 === 'Downloading Holiday-video.mp4, 24 MB'
        && /^Open Budget-2026\.xlsx, 312 KB\b/.test(got.ariaS1Done || '');
      r.noErr = K.noErr(s.errs);
    } finally { s.W.close(); }
    /* desktop: the mouse word */
    const sd = await K.open({ rows: false, mobile: false, hist: (x) => rows(x) });
    try {
      await sleep(150);
      got.desk = metaT(sd.d, 'o1'); got.desk0 = metaT(sd.d, 'o0');
      r.desktop = got.desk === 'PDF · 2.4 MB' && got.desk0 === 'Click to download';
    } finally { sd.W.close(); }
    /* the units come from the string keys */
    const sl = await K.open({ rows: false, hist: (x) => rows(x, (y) => { y.W.SL = Object.assign({}, y.W.SL, { unitB: 'o', unitKB: 'Ko', unitMB: 'Mo', unitGB: 'Go' }); }) });
    try {
      await sleep(150);
      got.slOffer = metaT(sl.d, 'o1'); got.slTx = metaT(sl.d, 's1'); got.slB = metaT(sl.d, 'c2'); got.slAria = aria(sl.d, 'o1');
      r.units = got.slOffer === 'PDF · 2.4 Mo' && got.slTx === '94 / 312 Ko' && got.slB === '512 o' && got.slAria === 'Download Trip-plan.pdf, 2.4 Mo';
    } finally { sl.W.close(); }
    const en = JSON.parse(readFileSync(join(root, 'src/strings/en-us.json'), 'utf8'));
    r.enKeys = en.unitB === 'B' && en.unitKB === 'KB' && en.unitMB === 'MB' && en.unitGB === 'GB';
  } catch (e) { r.err = e.message; }
  ok(Object.values(r).every((v) => v === true),
    '★★ S20 Q E (#1376 / #1377 E) on the built chat shell: the file card\'s second line carries C#\'s size — offer "PDF · 2.4 MB" (#1402; no size → "Tap / Click to download"), transfer "11 / 24 MB" (live + my sending file), the completion flip and a complete file "PDF · 1.8 MB" / "512 B"; unknown size = today\'s text; "Not available" unchanged; the photo tile\'s offer line too; the accessible name carries the size (the tick still joins); the units come from unitB / unitKB / unitMB / unitGB — '
    + JSON.stringify({ r, got }));
}
