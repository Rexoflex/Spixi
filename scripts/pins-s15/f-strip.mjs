/* ==== S15 F — #1302 (Damir 2026-10-10: "both"): the photo strip shows its TILES AT ONCE, and Android decodes each photo ONCE.
 *
 * The mechanism (read from the tree): after the system picker returned, SingleChatPage prepared EVERY photo (bounded copy,
 * sniff, the 2048 decode + encode, a SECOND full decode for the 320 strip thumb, 1–3 more for the S11 offer preview) and
 * only THEN pushed ONE mediaPicked — the strip stayed empty for the whole batch. Now onPickPhotos reserves the keys, puts a
 * PLACEHOLDER per photo into the batch (`"pending":"1"` — the 🟡 one-field contract delta of mediaPicked), makes it the open
 * batch and pushes BEFORE Task.Run; photoReady (main thread) replaces each placeholder in place and pushes an update while
 * placeholders remain; finishPick pushes the final list. A pending tile's ✕ drops its placeholder (the worker skips the key,
 * a photo already in the decode is discarded). Android's makeViewerJpeg hands the oriented bitmap to a `derive` hook — the
 * thumb and the offer preview are scaled from it (no decode of the prepared jpg).
 *
 *   strip   — on the BUILT chat shell: placeholders open the strip at once (N loading tiles, aria-busy), Send DISABLED (+ Enter
 *             sends nothing, the caption stays, "+" picks nothing); an update fills tiles IN PLACE (the same nodes, same
 *             order); a pending ✕ sends the existing mediaDrop verb and that key stays hidden even when C#'s next push has it
 *             READY; a failed photo's tile leaves with the next push; the final push enables Send → mediaSend; the loading
 *             wash is still under reduced motion.
 *   wiring  — (comment-stripped C#) the early push sits before Task.Run with mediaBatch set before it; the per-photo update
 *             is posted to the main thread (onMain → photoReady) and the worker pushes nothing itself; a pending ✕ uses
 *             S15MediaRules.dropPending + job.skip; an ended batch abandons its job; the [P1] line.
 *   decode  — Android: ONE makeViewerJpeg per photo (with derive), the thumb + preview from the in-memory bitmap; scaledJpeg
 *             never decodes; iOS / Mac / Windows keep their path (#else).
 * The pure rules (placeholder JSON, keys, update list, dropped-key filter, [P1] body) run in the C# harness: S15MediaTests.cs.
 * Deliberate breaks (S15 F): see the S15 F report — each fails its key. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join, sleep } = h;
  const K = b1Kit(h);
  const { JPG } = K;
  const JPG2 = JPG.replace(/AAAAAAAAAA==$/, 'AAAAAAAABA==');
  const BID = '0f0f0f0f0f0f0f0f';
  const P = (k) => ({ k: String(k), thumb: '', w: '0', h: '0', kb: '0', kind: 'photo', pending: '1' });
  const R = (k, t = JPG) => ({ k: String(k), thumb: t, w: '2048', h: '1536', kb: '400', kind: 'photo' });
  let s = null;
  const r = {};
  try {
    s = await K.open({ caps: 'reply,edit,voice,media' });
    const { d, push, W } = s;
    const strip = () => d.querySelector('#chat-composer > .c-mstrip');
    const tiles = () => [...d.querySelectorAll('.c-mstrip__tile')];
    const action = () => d.querySelector('.c-composer__action');
    const input = () => d.querySelector('.c-composer__input');
    const nSent = (v) => s.sent.filter((x) => x === v).length;
    const keys = () => tiles().map((t) => t.dataset.k).join();
    /* 1 — the early push: three placeholders */
    push('mediaPicked', BID, JSON.stringify([P(0), P(1), P(2)]));
    await sleep(80);
    r.atOnce = !!strip() && tiles().length === 3 && keys() === '0,1,2'
      && tiles().every((t) => t.hasAttribute('data-pending') && !!t.querySelector('.c-mstrip__pending') && !t.querySelector('img'))
      && tiles().every((t) => !!t.querySelector('.c-mstrip__remove')) && strip().getAttribute('aria-busy') === 'true';
    r.sendBlocked = action().dataset.mode === 'send' && action().disabled === true && action().getAttribute('aria-busy') === 'true';
    input().value = 'caption';
    input().dispatchEvent(new W.Event('input', { bubbles: true }));
    r.stillBlocked = action().disabled === true;
    W.matchMedia = (q) => ({ matches: /hover: hover/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    input().dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    action().click();
    await sleep(40);
    r.enterNothing = !s.sent.some((v) => v.startsWith('ixian:mediaSend:')) && input().value === 'caption' && !!strip();
    const before = s.sent.length;
    d.querySelector('.c-mstrip__add').click();
    r.plusWaits = !s.sent.slice(before).includes('ixian:sendmedia');
    r.plusDim = d.querySelector('.c-mstrip__add').getAttribute('aria-disabled') === 'true';   // ★ S15 #46 r1 m-4: it says it is off
    /* ★ S15 #46 r1 NIT F1: sendMediaStrip's OWN pending return — a stale composer state (busy:false, the disc enabled) still
       sends nothing while a tile is pending (the shell re-syncs busy with the next push) */
    W.Spixi.setComposerMedia(d.querySelector('.c-composer'), 3, { busy: false });
    const b1 = s.sent.length;
    r.fnPendingNoSend = action().disabled === false && (action().click(), true) && !s.sent.slice(b1).some((v) => v.startsWith('ixian:mediaSend:')) && !!strip();
    /* 2 — an update push: key 0 ready, 1 + 2 still pending → the SAME tile nodes, the same order, key 0's picture */
    const nodes = tiles();
    push('mediaPicked', BID, JSON.stringify([R(0), P(1), P(2)]));
    await sleep(60);
    r.inPlace = tiles().length === 3 && tiles().every((t, i) => t === nodes[i]) && keys() === '0,1,2'
      && !!tiles()[0].querySelector('img') && tiles()[0].querySelector('img').getAttribute('src') === JPG
      && !tiles()[0].hasAttribute('data-pending') && tiles()[1].hasAttribute('data-pending') && action().disabled === true;
    /* 3 — ✕ on the pending key 2 → the existing drop verb; C#'s next push (sent before it read the drop) has 2 READY → hidden */
    tiles()[2].querySelector('.c-mstrip__remove').click();
    await sleep(30);
    r.pendingDrop = nSent('ixian:mediaDrop:' + BID + ':2') === 1 && keys() === '0,1' && !s.sent.some((v) => v.startsWith('ixian:mediaCancel:'));
    push('mediaPicked', BID, JSON.stringify([R(0), P(1), R(2, JPG2)]));
    await sleep(60);
    r.droppedStaysOut = keys() === '0,1' && !d.querySelector('img[src="' + JPG2 + '"]') && action().disabled === true;
    push('mediaDropped', BID, '2');
    /* 4 — the final push: key 1 failed (gone), key 0 ready → Send enabled, no aria-busy */
    push('mediaPicked', BID, JSON.stringify([R(0)]));
    await sleep(60);
    r.failedGone = keys() === '0' && tiles()[0] === nodes[0];
    r.finalEnables = action().disabled === false && !action().hasAttribute('aria-busy') && !strip().hasAttribute('aria-busy')
      && !d.querySelector('.c-mstrip__add').hasAttribute('aria-disabled');   // ★ S15 #46 r1 m-4: "+" live again
    action().click();
    await sleep(60);
    const sends = s.sent.filter((v) => v.startsWith('ixian:mediaSend:'));
    r.sends = sends.length === 1 && sends[0].startsWith('ixian:mediaSend:' + BID + ':0:') && !strip();
    /* 5 — a pending ✕ on a batch whose OTHER tile is ready: the ready photo's own ✕ is the S10 path (sig compare) */
    const B2 = '1e1e1e1e1e1e1e1e';
    push('mediaPicked', B2, JSON.stringify([R(0), P(1)]));
    await sleep(60);
    r.mixedOpen = keys() === '0,1' && action().disabled === true;
    tiles()[1].querySelector('.c-mstrip__remove').click();   // the only pending tile goes → nothing pending
    await sleep(30);
    r.lastPendingX = nSent('ixian:mediaDrop:' + B2 + ':1') === 1 && keys() === '0' && action().disabled === false;
    push('chatBack');
    await sleep(40);
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = e.message; }
  finally { if (s) { try { s.W.close(); } catch (_) {} s = null; } }
  if (process.env.CDBG) console.log(JSON.stringify(r));
  ok(Object.values(r).length >= 16 && Object.values(r).every((x) => x === true),
    '★ S15 F (#1302) tiles at once on the BUILT chat shell: a mediaPicked of placeholders ("pending":"1") opens the strip at once with N loading tiles (aria-busy, ✕ kept), Send DISABLED (Enter / click send nothing, the caption stays, "+" picks nothing); an update fills tiles IN PLACE (same nodes, same order); a pending ✕ → ixian:mediaDrop and that key stays hidden when C# next pushes it READY; a failed photo leaves with the next push; the final push enables Send → one mediaSend — ' + JSON.stringify(r));

  /* the loading wash: the A8 skeleton grammar, STILL under reduced motion (built css) */
  const html = readFileSync(join(root, 'Spixi/Resources/Raw/html/chat.html'), 'utf8');
  const bundle = readFileSync(join(root, 'Spixi/Resources/Raw/html/spixi.bundle.js'), 'utf8');
  const allCss = html + bundle;
  const m = {
    wash: /\.c-mstrip__pending\s*\{[^}]*background:\s*var\(--surface-neutral-04\)[^}]*animation:\s*c-mstrip-pending/.test(allCss),
    plusDimCss: /\.c-mstrip__add\[aria-disabled="true"\]\s*\{\s*opacity:\s*var\(--opacity-disabled\);\s*cursor:\s*default;?\s*\}/.test(allCss)   /* ★ S15 #46 r1 m-4 */
      && /\.c-mstrip__add:not\(\[aria-disabled="true"\]\):hover/.test(allCss) && /\.c-mstrip__add:not\(\[aria-disabled="true"\]\):active/.test(allCss),
    still: /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.c-mstrip__pending\s*\{\s*animation:\s*none;?\s*\}\s*\}/.test(allCss),
  };
  ok(Object.values(m).every(Boolean), '★ S15 F (#1302): a pending tile is the neutral wash with a slow pulse (the chat-info A8 skeleton tokens) and stays still under reduced motion — ' + JSON.stringify(m));

  /* ———— wiring (comment-stripped C#) ———— */
  const rd = (f) => stripCode(readFileSync(join(root, f), 'utf8'));
  const SCP = rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs');
  const AND = rd('Spixi/Platforms/Android/SThumbnail.cs');
  const bodyOf = (t, sig) => {
    const i = t.indexOf(sig); if (i < 0) return '';
    const o = t.indexOf('{', i + sig.length - 1); let dd = 0;
    for (let k = o; k < t.length; k++) { if (t[k] === '{') dd++; else if (t[k] === '}' && --dd === 0) return t.slice(o, k + 1); }
    return '';
  };
  const pick = bodyOf(SCP, 'private async Task onPickPhotos(string route)');
  const prep = bodyOf(SCP, 'private static void prepareBatch(PrepJob job, List<SpixiImageData> picks, Action<int, MediaItem?, PhotoRules.PickedItem?> ready)');
  const one = bodyOf(SCP, 'private static MediaItem? prepareOne(PrepJob job, SpixiImageData p, int i, string dir, out PhotoRules.PickedItem? shown)');
  const ready = bodyOf(SCP, 'private void photoReady(MediaBatch live, PrepJob job, int i, MediaItem? item, PhotoRules.PickedItem? shown, int doc, Friend chat)');
  const fin = bodyOf(SCP, 'private void finishPick(MediaBatch live, PrepJob job, int doc, Friend chat)');
  const drop = bodyOf(SCP, 'private void onMediaDrop(string payload)');
  const dropB = bodyOf(SCP, 'private void dropMediaBatch()');
  const at = (t, x) => t.indexOf(x);
  const iPush = at(pick, 'Utils.sendUiCommand(this, "mediaPicked", live.id, PhotoRules.pickedJson(live.shown));');
  const w = {
    found: [pick, prep, one, ready, fin, drop, dropB].every((x) => x.length > 0),
    placeholdersFirst: at(pick, 'live.shown.Add(S15MediaRules.placeholder(k));') >= 0 && at(pick, 'live.shown.Add(S15MediaRules.placeholder(k));') < iPush
      && /keys = S15MediaRules\.reserveKeys\(S15MediaRules\.keysOf\(live\.shown\), Math\.Min\(picks\.Count, free\)\)/.test(pick),
    batchBeforePush: at(pick, 'mediaBatch = live;') >= 0 && at(pick, 'live.job = job;') >= 0 && at(pick, 'mediaBatch = live;') < iPush && at(pick, 'live.job = job;') < iPush,
    pushBeforeRun: iPush >= 0 && iPush < at(pick, '_ = Task.Run(') && (pick.match(/"mediaPicked"/g) || []).length === 1,
    readyOnMain: /prepareBatch\(job, picks, \(i, item, shown\) => onMain\(\(\) => photoReady\(live, job, i, item, shown, doc, chat\)\)\);/.test(pick)
      && /onMain\(\(\) => finishPick\(live, job, doc, chat\)\);/.test(pick),
    workerPushesNothing: !/sendUiCommand/.test(prep) && !/sendUiCommand/.test(one) && /ready\(i, item, shown\);/.test(prep),
    updateWhilePending: /S15MediaRules\.applyReady\(live\.shown, k, item != null \? shown : null\)/.test(ready)
      && /if \(S15MediaRules\.pendingCount\(live\.shown\) > 0\)\s*\{\s*Utils\.sendUiCommand\(this, "mediaPicked", live\.id, PhotoRules\.pickedJson\(live\.shown\)\);/.test(ready)
      /* ★ S15 #46 r1 M3: a dead batch / a refused photo — its prepared file is deleted (the reject branch, exactly) */
      && /if \(!prepAlive\(live, job, doc, chat\) \|\| !S15MediaRules\.applyReady\(live\.shown, k, item != null \? shown : null\)\)\s*\{\s*if \(item != null\)\s*\{\s*deleteOwnMediaFile\(item\.path\);\s*\}\s*return;\s*\}/.test(ready),
    finalPush: /if \(ReferenceEquals\(mediaBatch, live\) && ReferenceEquals\(live\.job, job\)\)\s*\{\s*S15MediaRules\.dropAllPending\(live\.shown\);\s*live\.job = null;\s*Utils\.sendUiCommand\(this, "mediaPicked", live\.id, PhotoRules\.pickedJson\(live\.shown\)\);/.test(fin)
      && /Interlocked\.Exchange\(ref mediaBusy, 0\)/.test(fin),
    skipDropped: /if \(job\.skip\.ContainsKey\(job\.keys\[i\]\)\)/.test(prep) && /if \(job\.abandoned\)\s*\{\s*break;/.test(prep),
    pendingX: /if \(b\.job != null && S15MediaRules\.dropPending\(b\.shown, k\)\)\s*\{\s*b\.job\.skip\.TryAdd\(k, 0\);\s*Utils\.sendUiCommand\(this, "mediaDropped", b\.id, key\);/.test(drop),
    abandon: /b\.job\.abandoned = true;/.test(dropB),
    p1: /P1Perf\.line\(S15MediaRules\.prepareLine\(job\.keys\.Count, P1Perf\.msSince\(job\.t0\), job\.firstMs\)\)/.test(fin) && /if \(P1Perf\.enabled\)/.test(fin),
  };
  ok(Object.values(w).every(Boolean),
    '★ S15 F (#1302) wiring: onPickPhotos reserves the keys, adds a placeholder per photo, makes the batch the open one (mediaBatch + its job) and pushes mediaPicked BEFORE Task.Run (its only push); the worker pushes nothing — each photo is posted to the main thread (onMain → photoReady), which replaces its placeholder in place and pushes while placeholders remain (a refused photo\'s file is deleted); finishPick drops the unreached placeholders and makes the final push; a ✕-ed pending key is skipped (job.skip) and an ended batch abandons its job; [P1] media prepare — ' + JSON.stringify(w));

  const andBranch = (() => { const a = one.indexOf('#if ANDROID'); const e = one.indexOf('#else', a); return a >= 0 && e > a ? one.slice(a, e) : ''; })();
  const elseBranch = (() => { const a = one.indexOf('#else'); const e = one.indexOf('#endif', a); return a >= 0 && e > a ? one.slice(a, e) : ''; })();
  const scaled = bodyOf(AND, 'private static byte[]? scaledJpeg(Bitmap bmp, int edge)');
  const viewer = bodyOf(AND, 'public static byte[]? makeViewerJpeg(string path, int maxEdge, Action<Func<int, byte[]?>>? derive)');
  const dc = {
    oneDecode: (andBranch.match(/makeViewerJpeg\(/g) || []).length === 1
      && /photo = Spixi\.SThumbnail\.makeViewerJpeg\(src, PhotoRules\.MaxEdge, \(scaled\) =>\s*\{\s*thumb = scaled\(PhotoRules\.ThumbEdge\);\s*offerPreview = S11MediaRules\.pickOfferPreview\(scaled\);\s*\}\);/.test(andBranch),
    otherPlatformsKept: /thumb = Spixi\.SThumbnail\.makeViewerJpeg\(jpg, PhotoRules\.ThumbEdge\);/.test(elseBranch)
      && /S11MediaRules\.pickOfferPreview\(\(edge\) => Spixi\.SThumbnail\.makeViewerJpeg\(prepared, edge\)\)/.test(elseBranch),
    insideGate: one.indexOf('mediaDecodeGate.Wait(60000)') >= 0 && one.indexOf('mediaDecodeGate.Wait(60000)') < one.indexOf('#if ANDROID'),
    deriveFromBitmap: /derive\(\(edge\) => scaledJpeg\(oriented, edge\)\);/.test(viewer) && viewer.indexOf('derive((edge)') > viewer.indexOf('oriented.Compress('),
    scaledNoDecode: scaled.length > 0 && !/BitmapFactory|DecodeFile|ExifInterface/.test(scaled) && /Compress\(Bitmap\.CompressFormat\.Jpeg!, 82, ms\)/.test(scaled)
      && /Math\.Min\(1\.0, \(double\)edge \/ Math\.Max\(w, h\)\)/.test(scaled),
    twoArgKept: /public static byte\[\]\? makeViewerJpeg\(string path, int maxEdge\)\s*\{\s*return makeViewerJpeg\(path, maxEdge, null\);\s*\}/.test(AND),
  };
  ok(Object.values(dc).every(Boolean),
    '★ S15 F (#1302) fewer decodes: on Android each picked photo is decoded ONCE (inside the one decode gate) — makeViewerJpeg(src, 2048, derive) and the 320 strip thumb + the S11 offer preview ladder are scaled from the oriented bitmap in memory (scaledJpeg: no decode, q82, never up-scaled); iOS / Mac / Windows keep their path (#else); the 2-argument makeViewerJpeg is unchanged for every other caller — ' + JSON.stringify(dc));
}
