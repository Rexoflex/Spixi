/* ==== photo1b PO-4 — `photoTileLite` (agent `tile`): the lighter photo tile ====
 * Mechanism (docs/photo1b-mechanisms.md P1–P5): a COMPLETE LOCAL photo tile built, for every one of up to 48 photos in a chat,
 * the hidden file face (glyph tile, cap, CTA), the media tile's overlay icon (an `icon()` innerHTML parse) and spinner state,
 * a JPEG-head decode (`jpegSize`, atob of up to 4 KB) for a tile that is FIXED at 320 × 320, and `pinLogEnd` on every picture
 * load although a fixed tile never changes the log's height. With the cap `photoTileLite` (the shell passes `lite`): the face
 * is made WHEN NEEDED (the picture fails; the 600 ms quiet wait ends with no picture; a state flip), no overlay icon / spinner,
 * no `jpegSize`, no re-pin on load. This pin drives the BUILT chat.html in jsdom through the shell's own pushes — the open of a
 * Seed 56-like chat (50 rows, 48 photo `addFile` rows, complete + local, both directions), `setFileThumb` per photo with a small
 * valid base64 JPEG (after messagesDone, like C#), the picture's `load` / `error` dispatched on the <img> — in a document with
 * the cap ON and one without (the cap absent), and reads:
 *   (1) ON, quiet tile: no `.c-mbubble__file`, an EMPTY overlay (no svg, no spinner), `data-quiet`, state idle — 48 / 48 tiles;
 *   (2) ON, thumbs pushed: `jpegSize` NOT called (no atob of a JPEG body: 0; absent: 48), tiles loading → loaded with still no
 *       face; `pinLogEnd` NOT run on a tile's load (0 writes of #messages.scrollTop; absent: > 0 — the spy bites);
 *   (3) the FALLBACK: a picture that errors → the face appears (the SAME markup as the old path's), BEFORE `data-quiet` drops (the
 *       fade runs from opacity 0, a MutationObserver orders the two), state idle, a tap sends the OLD path's open verb; the quiet
 *       wait with no picture → no face at ~300 ms, the face after 600 ms (same markup as the old path's);
 *   (4) tiles that keep their face: my SENDING photo (ring on a scrim), an offer, a download, a file that is not a photo — their
 *       markup is byte-equal ON vs absent; the "gone" rows too;
 *   (5) the accessible name (`aria-label`, `data-aria-base`, every aria-label inside the row) is byte-equal ON vs absent at every
 *       checkpoint (complete received / sent, sent-progress, offer, downloading, gone, and after the fallback), plus at component
 *       level the five states incl. FAILED with and without a picture, after setFileProgress flips, and after the face fallback;
 *   (6) a tile re-built with a picture this document already showed (the r3 "seen" path) builds no face when lite, and does when not;
 *   (7) the cap ABSENT = the base: the DOM of every row (normalised: the clock text blanked) at six checkpoints equals the
 *       fingerprints captured from the BASE build (55feaddc) in e-tile-base.mjs — regenerate with
 *       `node scripts/pins-photo1b/e-tile-capture.mjs <base chat.html>`.
 * ZONE: the fingerprints do not depend on the running zone — the time-of-day text and the date pill's day are masked by the strings the
 * PAGE itself makes for the fixture timestamps (e-kit.mjs normRow). The fixture rows span 12:02 … 12:51 UTC on one day (T0 in e-kit.mjs):
 * no zone in use has its local midnight inside that window, so there is ONE date pill and the same rows at every offset −12 … +14. The
 * fixture was captured in seven zones (UTC, America/Los_Angeles, Europe/Ljubljana, Asia/Kolkata, Pacific/Chatham, Pacific/Kiritimati,
 * Etc/GMT+12) and the files are byte-identical.
 * LIMITS: jsdom lays nothing out and loads no image: the `load` / `error` events are dispatched by the pin (as the shell would
 * get them), the fade is read as the ORDER of two DOM mutations, not as a painted opacity; the quiet wait is real time (sleeps);
 * "no re-pin" is the absence of a `scrollTop` write on #messages (pinLogEnd's route when no reply row is held), not a measured
 * scroll position; the fixture proves the cap-absent DOM against the base build only for the rows this scenario builds.
 * Deliberate breaks (#802) — each ONE token in a full temp copy of the tree (+ build-demo-bundle + build-shells), the key goes red, the
 * copy is deleted (all KILLED; red keys listed — a break may redden more than its own key):
 *   typed-bubbles.js  lazyFace `state === 'complete'` → `'completeX'` ........................ (1) (2b) (2d) (4b) (3a) (3c) (3e) (3f) (5c)
 *   typed-bubbles.js  `lite: lite && state === 'complete'` (to createMediaBubble) → `lite: false` ... (1) (2b)   [the overlay icon is built]
 *   typed-bubbles.js  `lite: lite && state === 'complete'` → `lite` (an offer / sending tile goes lite) ... (4)
 *   typed-bubbles.js  setImageFileThumb `ctl && ctl.lite ? null : jpegSize(uri)` → `jpegSize(uri)` ... (2)
 *   chat.html         `onLoad: photoTile && !bridge.cap('photoTileLite') ?` → `onLoad: photoTile ?` ... (2c)
 *   chat.html         `lite: !!photoTile && !!bridge.cap('photoTileLite')` → `lite: !!photoTile` (cap ignored) ... (1b) (2) (2d) (4b) (7) (3f)
 *   typed-bubbles.js  unquiet `if (lite) ensureFace(); delete quiet` → the two swapped ............ (3c) only
 *   typed-bubbles.js  unquiet `if (lite) ensureFace()` → `if (false)` ........................... (3b) (3c) (3e)
 *   typed-bubbles.js  quiet timer `=== 'idle'` → `'idleX'` ....................................... (3e) (7)
 *   typed-bubbles.js  handlers `complete: reentryGuard(onOpen)` → `(onRetry)` ................... (3d) (3f)
 *   typed-bubbles.js  onLoad `dataset.file === 'progress'` → `'complete'` (a loaded complete tile makes its face) ... (2b) (2d) (3f) (7)
 *   typed-bubbles.js  `el.dataset.ariaBase = tileAria(…)` → `… + (lite ? '.' : '')` ............... (4) (5) (5b) (3f) (6)
 *   typed-bubbles.js  lazyFace `(state === 'complete' || state === 'progress')` (my sending photo goes lazy) ... (4) (4b) (5) (5c)
 *   typed-bubbles.js  lazyFace `(quiet || loaded)` → `true` ................................... (5d)
 *   typed-bubbles.js  lazyFace `|| el.dataset.state === 'loaded'` → `'loadedX'` ................ (6)
 *   typed-bubbles.js  setImageFileProgress `|| tile.dataset.file === finalState` dropped ......... (5f)
 *   typed-bubbles.js  setImageFileProgress `fileFace(finalState, …)` → `fileFace(ctl.lite ? 'offer' : finalState, …)` ... (5e)
 *   typed-bubbles.js  the image tile's sent tick `setAttribute('width', 14)` → 15 (the OLD path) ... (7)
 *   ★ #46 r1 fix round (O1-2 / O1-3): `ensureFace`'s insertBefore → `tileEl.append(f)` → (3g) red · the O1-3 ensureFace call in
 *   setImageFileThumb removed → (6b) red · its quiet guard dropped → (2b) (2d) (3f) (6c) red.
 * Keys (1b) is also reddened by the cap-ignored break above; (2d) by every break that makes ON = absent. */
import { kit, photoScenario, logPrint, JPG, T0 } from './e-kit.mjs';
import BASE from './e-tile-base.mjs';
export default async function (h) {
  const { ok, root, join, sleep } = h;
  const K = kit(h);
  const html = join(root, 'Spixi/Resources/Raw/html/chat.html');
  const CAP = 'reply,photoTileLite';
  const NONE = 'reply';
  const ariaOf = (row) => row ? [...row.querySelectorAll('[aria-label], [data-aria-base]')].map((e) => (e.getAttribute('aria-label') || '') + '|' + (e.getAttribute('data-aria-base') || '')).join('\n') : '';
  /* the WHOLE row's markup with the overlay emptied (the lite complete tile builds no icon there, by design) and the clock masked */
  const masked = (row) => { const c = row.cloneNode(true); for (const o of c.querySelectorAll('.c-mbubble__overlay')) o.replaceChildren(); return K.normRow(c); };
  const tiles = (d) => [...d.querySelectorAll('#messages .c-mbubble[data-file]')];

  /* ── (1)(2)(7) the 50-row open, ON and absent, with the spies ── */
  const run = async (caps) => {
    const r = { atob: 0, scroll: 0, phase: {}, aria: {}, rowsHtml: {} };
    const out = await photoScenario(h, html, caps, {
      before: (s) => {
        const orig = s.W.atob.bind(s.W);
        s.W.atob = (x) => { if (String(x).startsWith('/9j/')) r.atob++; return orig(x); };
      },
      at: async (name, s) => {
        const d = s.d;
        const ts = tiles(d);
        const ph = r.phase[name] = {
          n: ts.length,
          faces: ts.filter((t) => t.querySelector(':scope > .c-mbubble__file')).length,
          svgOverlay: ts.filter((t) => t.querySelector('.c-mbubble__overlay').childElementCount > 0).length,   /* childElementCount: jsdom's selector engine answers `.a > *` wrongly for querySelector on 48 siblings */
          spinners: d.querySelectorAll('#messages .c-mbubble__spinner').length,
          quiet: ts.filter((t) => t.hasAttribute('data-quiet')).length,
          states: [...new Set(ts.map((t) => t.dataset.state))].join(','),
        };
        r.aria[name] = [...d.querySelectorAll('#messages [data-msgid]')].map((row) => ariaOf(row)).join('\n--\n');
        if (name === 'states0') { r.statesRows = {}; for (const id of ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']) r.statesRows[id] = K.normRow(K.rowOf(d, id)); }
        if (name === 'states2') { r.statesRows2 = {}; for (const id of ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']) r.statesRows2[id] = K.normRow(K.rowOf(d, id)); }
        if (name === 'loading') {
          /* arm the scroll spy for the loads that follow */
          const box = d.getElementById('messages');
          let v = box.scrollTop;
          Object.defineProperty(box, 'scrollTop', { configurable: true, get() { return v; }, set(x) { r.scroll++; v = x; } });
          r.scroll = 0;
        }
      },
    });
    r.fp = out;
    return r;
  };
  const on = await run(CAP);
  const off = await run(NONE);

  const P = on.phase;
  ok(P.quiet.n === 48 + 0 && P.quiet.faces === 0 && P.quiet.svgOverlay === 0 && P.quiet.spinners === 0 && P.quiet.quiet === 48 && P.quiet.states === 'idle',
    '★ photo1b PO-4 (1): with the cap ON a complete local photo tile (48 of 48, both directions) is built QUIET with no file face, an EMPTY overlay (no icon, no spinner element) — ' + JSON.stringify(P.quiet));
  ok(off.phase.quiet.n === 48 && off.phase.quiet.faces === 48 && off.phase.quiet.svgOverlay === 48 && off.phase.quiet.quiet === 48,
    '★ photo1b PO-4 (1b): with the cap absent the same 48 tiles carry the face (48) and the overlay icon (48) — the pin sees the difference it claims — ' + JSON.stringify(off.phase.quiet));
  ok(on.atob === 0 && off.atob === 51,
    '★ photo1b PO-4 (2): `jpegSize` is not called for a fixed tile — the JPEG head is not decoded (atob of a JPEG body) on 48 setFileThumb pushes: ON ' + on.atob + ' · absent ' + off.atob + ' (48 in the open + the 3 photos of the states document)');
  ok(P.loading.faces === 0 && P.loading.spinners === 0 && P.loading.states === 'loading' && P.loaded.faces === 0 && P.loaded.states === 'loaded' && P.loaded.spinners === 0 && P.loaded.svgOverlay === 0,
    '★ photo1b PO-4 (2b): with the cap ON the tiles go loading → loaded (the picture shows) and STILL carry no face, no spinner, no overlay icon — ' + JSON.stringify({ loading: P.loading, loaded: P.loaded }));
  ok(on.scroll === 0 && off.scroll > 0,
    '★ photo1b PO-4 (2c): a picture\'s load does not re-pin the log for a fixed tile — scrollTop writes on #messages during 48 loads: ON ' + on.scroll + ' · absent ' + off.scroll + ' (> 0 = the spy bites)');
  ok(on.fp.loaded.all !== off.fp.loaded.all && on.fp.quiet.all !== off.fp.quiet.all,
    '★ photo1b PO-4 (2d): the cap does change the built DOM (the fingerprints of ON and absent differ at the quiet and loaded checkpoints)');

  /* ── (4) the tiles that keep their face / the file card / gone rows ── */
  const KEEP = ['s3', 's4', 's5', 's6', 's7', 's8'];
  const sameKeep = KEEP.filter((id) => on.statesRows[id] !== off.statesRows[id] || on.statesRows2[id] !== off.statesRows2[id]);
  ok(sameKeep.length === 0 && /c-mbubble__ring/.test(on.statesRows.s3) && /c-mbubble__file/.test(on.statesRows.s4) && /c-mbubble__file/.test(on.statesRows.s5),
    '★ photo1b PO-4 (4): my SENDING photo (s3: ring on a scrim), a downloading tile (s4), an offer (s5), the two "gone" rows (s6 / s7) and a non-photo file (s8) are BYTE-EQUAL ON vs absent, before and after the thumbs — and the ring / the face are really there — ' + JSON.stringify({ differ: sameKeep }));
  ok(/c-mbubble__file/.test(on.statesRows.s3) && !/c-mbubble__file/.test(on.statesRows.s1) && !/c-mbubble__file/.test(on.statesRows.s2) && /c-mbubble__file/.test(off.statesRows.s1),
    '★ photo1b PO-4 (4b): of the two complete local tiles (s1 received, s2 sent) ON builds no face where the old path did');
  /* the face the late path makes = the face the old path made (after the 600 ms the no-picture rows had no thumb… the s-rows get a thumb, so read A2) */

  /* ── (5) the accessible name ── */
  const names = ['quiet', 'loading', 'loaded', 'face', 'states0', 'states1', 'states2'];
  const badAria = names.filter((n) => on.aria[n] !== off.aria[n]);
  ok(badAria.length === 0 && on.aria.quiet.length > 100,
    '★ photo1b PO-4 (5): every aria-label / data-aria-base in every row is byte-equal ON vs absent at 7 checkpoints (open, thumbs, loaded, the face after the quiet wait, and the 8 file states before / after the thumbs) — ' + JSON.stringify({ differ: badAria, bytes: on.aria.quiet.length }));

  /* ── (7) the cap ABSENT = the base build ── */
  const diff = Object.keys(BASE).filter((k) => !off.fp[k] || off.fp[k].all !== BASE[k].all);
  ok(diff.length === 0 && Object.keys(BASE).length === 7,
    '★ photo1b PO-4 (7): with the cap absent the DOM of every row of the 50-row open (quiet · thumbs pushed · loaded · the face after the wait) and of the 8 file states (before · after the thumbs · after the wait) equals the BASE build\'s (fingerprints from 55feaddc, e-tile-base.mjs) — ' + JSON.stringify({ differ: diff, checkpoints: Object.keys(BASE).length }));

  /* ── (3) the fallback, in a cap-ON document ── */
  const open2 = async (caps, n) => {
    const s = await K.open(html, { caps, rows: K.photoRows(n), settle: 250 });
    return s;
  };
  const faceOf = (s, id) => { const t = K.rowOf(s.d, id).querySelector('.c-mbubble[data-file]'); const f = t.querySelector(':scope > .c-mbubble__file'); return f ? f.outerHTML : null; };
  const tileOf = (s, id) => K.rowOf(s.d, id).querySelector('.c-mbubble[data-file]');
  const flow = async (caps) => {
    const s = await open2(caps, 4);
    const res = {};
    const t1 = tileOf(s, 'p1');   /* p1: no picture at all — the quiet wait (read FIRST: ~250 ms after the build, inside the 600 ms) */
    res.at300 = { face: faceOf(s, 'p1') !== null, quiet: t1.hasAttribute('data-quiet') };
    /* p2: a picture lands at once and loads (read at the end: loaded, no face on the lite path) */
    s.push('setFileThumb', 'p2', JPG);
    await sleep(40);
    const t2 = tileOf(s, 'p2');
    t2.querySelector('.c-mbubble__img').dispatchEvent(new s.W.Event('load'));
    await sleep(120);
    res.p2 = { state: t2.dataset.state, face: faceOf(s, 'p2') !== null };
    const b2 = s.sent.length;
    t2.click();
    await sleep(60);
    res.click2 = s.sent.slice(b2).filter((x) => /^ixian:(viewImage|openfile)/.test(x));
    /* p0: a picture that errors; the order of the face and the quiet drop is watched */
    const t0 = tileOf(s, 'p0');
    const order = [];
    const mo = new s.W.MutationObserver((recs) => { for (const m of recs) { if (m.type === 'childList' && [...m.addedNodes].some((n) => n.classList && n.classList.contains('c-mbubble__file'))) order.push('face'); if (m.type === 'attributes' && m.attributeName === 'data-quiet' && !t0.hasAttribute('data-quiet')) order.push('unquiet'); } });
    mo.observe(t0, { childList: true, attributes: true, attributeFilter: ['data-quiet'] });
    res.before = { face: faceOf(s, 'p0') !== null, quiet: t0.hasAttribute('data-quiet') };
    s.push('setFileThumb', 'p0', JPG);
    await sleep(60);
    res.loading = t0.dataset.state;
    t0.querySelector('.c-mbubble__img').dispatchEvent(new s.W.Event('error'));
    await sleep(60);
    mo.takeRecords();
    res.order = order.slice();
    res.state = t0.dataset.state;
    res.quietAfter = t0.hasAttribute('data-quiet');
    res.face = faceOf(s, 'p0');
    res.aria = [t0.getAttribute('aria-label'), t0.dataset.ariaBase].join('|');
    res.row0 = masked(K.rowOf(s.d, 'p0'));   // O1-2: the WHOLE row after the fallback — where the lazily made face sits is part of it
    res.src = t0.querySelector('.c-mbubble__img').hasAttribute('src');
    const before = s.sent.length;
    t0.click();
    await sleep(60);
    res.click = s.sent.slice(before).filter((x) => /^ixian:(viewImage|openfile)/.test(x));
    await sleep(750);
    res.at1000 = { face: faceOf(s, 'p1'), quiet: t1.hasAttribute('data-quiet'), state: t1.dataset.state };
    res.aria1 = [t1.getAttribute('aria-label'), t1.dataset.ariaBase].join('|');
    res.row1 = masked(K.rowOf(s.d, 'p1'));   // O1-2: the whole row after the quiet wait
    res.errs = s.errs.filter((e) => /TypeError|ReferenceError|dispatch failed/.test(e)).length;
    s.dom.window.close();
    return res;
  };
  const fon = await flow(CAP);
  const foff = await flow(NONE);
  ok(fon.before.face === false && fon.before.quiet === true && fon.loading === 'loading' && fon.state === 'idle' && fon.src === false && fon.quietAfter === false,
    '★ photo1b PO-4 (3a): ON — a quiet tile with no face; its picture (setFileThumb) loads, then ERRORS → the tile is idle with no src, the quiet is gone and the FACE is there — ' + JSON.stringify({ before: fon.before, loading: fon.loading, state: fon.state, quietAfter: fon.quietAfter, src: fon.src }));
  ok(fon.face !== null && fon.face === foff.face && /c-mbubble__cta/.test(fon.face) && /Open file/.test(fon.face),
    '★ photo1b PO-4 (3b): the face the fallback makes is the SAME markup the old path built (glyph tile, cap, "Open file") — ' + JSON.stringify({ lite: (fon.face || '').length, old: (foff.face || '').length }));
  ok(fon.row0 === foff.row0 && fon.row1 === foff.row1 && /c-mbubble__file/.test(fon.row0) && /c-mbubble__file/.test(fon.row1) && /c-mbubble__file.*c-mbubble__stamp/.test(fon.row1),
    '★ photo1b PO-4 (3g): after the fallback (p0: a picture that errored; p1: the quiet wait with no picture, a SENT row with a stamp) the WHOLE row — every node in its place, the face before the sent stamp — is the same markup cap ON as cap absent (overlay emptied, clock masked) — ' + JSON.stringify({ p0: fon.row0 === foff.row0, p1: fon.row1 === foff.row1, len: [fon.row0.length, foff.row0.length] }));
  ok(fon.order.join() === 'face,unquiet',
    '★ photo1b PO-4 (3c): the face goes into the tile BEFORE the quiet drops (so its opacity transition runs from 0, the old fade) — mutation order ' + JSON.stringify(fon.order));
  ok(fon.click.length === 1 && fon.click.join() === foff.click.join() && /^ixian:openfile:/.test(fon.click[0] || ''),
    '★ photo1b PO-4 (3d): a tap on the fallen-back tile opens the FILE with the old path\'s verb — ' + JSON.stringify({ on: fon.click, off: foff.click }));
  ok(fon.at300.face === false && fon.at300.quiet === true && fon.at1000.face !== null && fon.at1000.face === foff.at1000.face && fon.at1000.quiet === false && fon.at1000.state === 'idle',
    '★ photo1b PO-4 (3e): the quiet wait with no picture — no face at ~300 ms (quiet), the face after 600 ms and the quiet gone, the same markup as the old path — ' + JSON.stringify({ at300: fon.at300, quiet1000: fon.at1000.quiet, same: fon.at1000.face === foff.at1000.face }));
  ok(fon.aria === foff.aria && fon.aria1 === foff.aria1 && fon.p2.state === 'loaded' && fon.p2.face === false && foff.p2.state === 'loaded' && foff.p2.face === true && fon.click2.join() === foff.click2.join() && /viewImage/.test(fon.click2[0] || '') && fon.errs === 0,
    '★ photo1b PO-4 (3f): the name after the fallback is equal ON vs absent; a tile whose picture loaded opens by the same verb on both paths and has no face (ON; the old path built one under the picture) — ' + JSON.stringify({ aria: fon.aria === foff.aria, p2: fon.p2, click2: fon.click2, off: foff.click2, errs: fon.errs }));

  /* ── (5b)(6) the component level: every state, lite vs old; the in-place flips; the seen re-build ── */
  {
    const s = await K.open(html, { caps: CAP, rows: [], settle: 200 });
    const S = s.W.Spixi;
    const mk = (lite, o) => S.createImageFileBubble({ name: 'IMG_1.jpg', size: 2400000, status: null, ...o, lite });
    const tile = (row) => row.querySelector('.c-mbubble[data-file]');
    const nm = (row) => { const t = tile(row); return t.getAttribute('aria-label') + '|' + t.dataset.ariaBase; };
    const cases = [];
    for (const direction of ['received', 'sent']) for (const state of ['complete', 'progress', 'offer', 'failed']) for (const thumb of [null, JPG]) {
      const status = direction === 'sent' ? 'delivered' : null;
      cases.push({ direction, state, thumb, status, progress: 40, quietKey: 'k-' + direction + state + (thumb ? 't' : 'n') });
    }
    const bad = [];
    for (const c of cases) {
      const a = mk(true, c), b = mk(false, { ...c, quietKey: c.quietKey + 'b' });
      if (nm(a) !== nm(b)) bad.push(c.direction + '/' + c.state + (c.thumb ? '/pic' : ''));
    }
    ok(bad.length === 0 && cases.length === 16,
      '★ photo1b PO-4 (5b): at component level the accessible name (aria-label + data-aria-base) of a lite tile = the old tile\'s in all 16 combinations (received / sent × complete / progress / offer / failed × with / without a picture) — ' + JSON.stringify({ differ: bad }));
    /* faces: only the complete-and-quiet case drops it; every other state keeps the face markup byte-equal */
    const keep = [];
    for (const c of cases) {
      const a = mk(true, c), b = mk(false, { ...c, quietKey: c.quietKey + 'b' });
      const fa = tile(a).querySelector(':scope > .c-mbubble__file'), fb = tile(b).querySelector(':scope > .c-mbubble__file');
      const lazy = c.state === 'complete' && !!tile(a).hasAttribute('data-quiet');
      if (lazy ? fa !== null : (fa ? fa.outerHTML : null) !== (fb ? fb.outerHTML : null)) keep.push(c.direction + '/' + c.state + (c.thumb ? '/pic' : ''));
    }
    ok(keep.length === 0,
      '★ photo1b PO-4 (5c): of the 16 component states only a COMPLETE tile that waits quiet is without a face; offered / downloading / failed / my sending tile and a complete tile with no quiet wait (no quietKey) carry the identical face — ' + JSON.stringify({ differ: keep }));
    /* a complete tile with NO quiet key and no picture (a live insert) keeps its face at once (it is the only thing the tile shows) */
    const live = mk(true, { direction: 'received', state: 'complete', thumb: null });
    ok(!!tile(live).querySelector(':scope > .c-mbubble__file') && !tile(live).hasAttribute('data-quiet'),
      '★ photo1b PO-4 (5d): a complete tile that is not quiet and has no picture yet (a live insert, no quiet key) keeps its face at once — nothing hides it');
    /* the in-place flips: progress → complete, with and without a face, the name follows */
    const pr = mk(true, { direction: 'received', state: 'progress', thumb: null, progress: 30 });
    const pr0 = mk(false, { direction: 'received', state: 'progress', thumb: null, progress: 30 });
    S.setFileProgress(pr, 100, { state: 'complete' });
    S.setFileProgress(pr0, 100, { state: 'complete' });
    ok(nm(pr) === nm(pr0) && !!tile(pr).querySelector(':scope > .c-mbubble__file') && tile(pr).querySelector(':scope > .c-mbubble__file').outerHTML === tile(pr0).querySelector(':scope > .c-mbubble__file').outerHTML,
      '★ photo1b PO-4 (5e): a lite tile flipped progress → complete in place gets the same face and the same name as the old path\'s — ' + nm(pr));
    const q = mk(true, { direction: 'received', state: 'complete', thumb: null, quietKey: 'k-flip' });
    const nameBefore = nm(q);
    S.setFileProgress(q, 100, { state: 'complete' });
    ok(nm(q) === nameBefore && !tile(q).querySelector(':scope > .c-mbubble__file'), '★ photo1b PO-4 (5f): a progress tick on a complete lite tile changes nothing (no face made, same name)');
    /* (6) the seen re-build: build with a picture, let it load + show, then build the SAME picture again */
    const w = mk(true, { direction: 'received', state: 'complete', thumb: JPG, quietKey: 'k-seen-1' });
    s.d.body.append(w);
    tile(w).querySelector('.c-mbubble__img').dispatchEvent(new s.W.Event('load'));
    await sleep(200);
    const shown = tile(w).dataset.state;
    const again = mk(true, { direction: 'received', state: 'complete', thumb: JPG, quietKey: 'k-seen-2' });
    const againOld = mk(false, { direction: 'received', state: 'complete', thumb: JPG, quietKey: 'k-seen-3' });
    ok(shown === 'loaded' && tile(again).dataset.state === 'loaded' && tile(again).hasAttribute('data-seen') && !tile(again).querySelector(':scope > .c-mbubble__file')
       && tile(againOld).dataset.state === 'loaded' && !!tile(againOld).querySelector(':scope > .c-mbubble__file') && nm(again) === nm(againOld),
      '★ photo1b PO-4 (6): a tile re-built with a picture this document already showed is loaded at once; lite builds no face for it, the old path does; the name is equal — ' + JSON.stringify({ shown, again: tile(again).dataset.state, face: !!tile(again).querySelector(':scope > .c-mbubble__file') }));
    /* O1-3: that loaded, face-less, NOT quiet lite tile gets a DIFFERENT picture — while it decodes (loading) the old path shows its face
       (visibility hidden only at loaded), so the lite tile makes the face before the new src: same row, same face, in loading */
    const JPG2 = JPG.replace(/A=*$/, 'B==');
    S.setImageFileThumb(again, JPG2);
    S.setImageFileThumb(againOld, JPG2);
    const fa = tile(again).querySelector(':scope > .c-mbubble__file');
    ok(tile(again).dataset.state === 'loading' && tile(againOld).dataset.state === 'loading' && !!fa && !tile(again).hasAttribute('data-quiet')
       && fa.outerHTML === tile(againOld).querySelector(':scope > .c-mbubble__file').outerHTML && masked(again) === masked(againOld) && nm(again) === nm(againOld),
      '★ photo1b PO-4 (6b): a loaded lite tile with no face and no quiet that gets a DIFFERENT picture (setFileThumb again) HAS its face while the new one decodes — the same face and the same whole row as the old path\'s — ' + JSON.stringify({ state: tile(again).dataset.state, face: !!fa, row: masked(again) === masked(againOld) }));
    /* a quiet tile is left alone (its face is hidden by opacity; unquiet makes it) */
    const qt = mk(true, { direction: 'received', state: 'complete', thumb: null, quietKey: 'k-seen-q' });
    const quietBefore = tile(qt).hasAttribute('data-quiet');
    S.setImageFileThumb(qt, JPG.replace(/A=*$/, 'C=='));
    ok(quietBefore && tile(qt).hasAttribute('data-quiet') && !tile(qt).querySelector(':scope > .c-mbubble__file'),
      '★ photo1b PO-4 (6c): a QUIET lite tile that gets a picture still builds no face (nothing to show: the face is hidden while quiet)');
    s.dom.window.close();
  }
  void logPrint; void T0;
}
