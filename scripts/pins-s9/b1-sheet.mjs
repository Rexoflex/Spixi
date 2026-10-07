/* ==== S9 B1 — #1244 S = C: the photo preview sheet (mediaPicked → mediaSend / mediaCancel), mediaError, fileNotice ====
 * On the BUILT chat.html through C#'s pushes only:
 *   · mediaPicked(16-hex id, json) opens ONE sheet: a cell per valid item (bad key / duplicate key / non-JPEG thumb / not
 *     "photo" are dropped), the title "{n} photos", the note, a caption field; ✕ removes a photo (title follows); Send →
 *     ixian:mediaSend:<id>:<kept keys in order>:<caption base64url, UTF-8, padded> and closes; exactly ONE answer per batch
 *   · a bad batch id = nothing; nothing valid = mediaCancel at once; Escape = mediaCancel; ✕ on the last photo = mediaCancel;
 *     a newer batch while open = the older one's mediaCancel first
 *   · mediaError: each of the six codes (+ fileTooBig, the A-9 100 MB cap) → its toast; an unknown code → none · fileNotice videoLocation → its toast
 * #46 r1: a thumb-less item = a glyph tile (glyphKept / glyphSent) · a chat switch cancels (switchCancels) · a locked composer refuses (lockedRefuses) · fileTooBigIn.
 * Deliberate breaks (S9 B1 hand-back): parseMediaItems' FILE_THUMB_RE test dropped → dropsBad · the sheet's answer latch
 *   (answered) removed → oneAnswer · closeMediaSheetIfOpen() in mediaPicked dropped → newerCancelsOlder ·
 *   b64url's '-'/'_' mapping dropped → caption */
import { b1Kit } from './b1-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = b1Kit(h);
  const { sleep, JPG } = K;
  const BID = '00112233aabbccdd';
  const items = (n) => Array.from({ length: n }, (_, i) => ({ k: String(i), thumb: JPG, w: '1600', h: '1200', kb: '300', kind: 'photo' }));
  const fromB64url = (t) => Buffer.from(t.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  const r = {};
  try {
    const s = await K.open({ caps: 'reply,media' });
    const { d, push } = s;
    const list = items(3).concat([
      { k: '1', thumb: JPG, kind: 'photo' },                              // duplicate key
      { k: '7', thumb: 'data:image/png;base64,AAAA', kind: 'photo' },     // not a JPEG
      { k: 'x', thumb: JPG, kind: 'photo' },                              // bad key
      { k: '8', thumb: JPG, kind: 'video' },                              // not a photo
      { k: '9', thumb: 'https://evil.example/a.jpg', kind: 'photo' },     // remote
    ]);
    push('mediaPicked', 'zz', JSON.stringify(items(2)));
    await sleep(60);
    r.badIdIgnored = !d.querySelector('.c-msend') && !s.sent.some((v) => /mediaCancel/.test(v));
    push('mediaPicked', BID, JSON.stringify(list));
    await sleep(120);
    const cells = () => [...d.querySelectorAll('.c-msend__cell')];
    r.dropsBad = cells().length === 3 && cells().every((c) => c.querySelector('img').getAttribute('src') === JPG);
    const title = () => (d.querySelector('.c-msend__title') || {}).textContent;
    r.title3 = title() === '3 photos' && (d.querySelector('.c-msend__note') || {}).textContent === 'Location removed · resized';
    cells()[1].querySelector('.c-msend__remove').click();
    await sleep(60);
    r.removed = cells().length === 2 && title() === '2 photos' && cells().map((c) => c.dataset.k).join() === '0,2';
    const cap = d.querySelector('.c-msend__caption');
    cap.value = '  Lake day ✓ ~~?? ';
    cap.dispatchEvent(new s.W.Event('input', { bubbles: true }));
    d.querySelector('.c-msend__send').click();
    await sleep(80);
    const sends = s.sent.filter((v) => v.startsWith('ixian:mediaSend:'));
    const m = sends.length === 1 ? /^ixian:mediaSend:([0-9a-f]{16}):([0-9,]+):([A-Za-z0-9_=-]*)$/.exec(sends[0]) : null;
    r.sendVerb = !!m && m[1] === BID && m[2] === '0,2';
    r.caption = !!m && fromB64url(m[3]) === 'Lake day ✓ ~~??' && !/[+/]/.test(m[3]);
    await sleep(400);
    r.closed = !d.querySelector('.c-msend') || !d.querySelector('.c-sheet--msend[data-open]');
    r.oneAnswer = !s.sent.some((v) => v === 'ixian:mediaCancel:' + BID);
    /* nothing valid → cancel at once */
    push('mediaPicked', 'aaaaaaaaaaaaaaaa', JSON.stringify([{ k: '0', thumb: 'x', kind: 'photo' }]));
    await sleep(60);
    r.emptyCancels = s.sent.includes('ixian:mediaCancel:aaaaaaaaaaaaaaaa');
    /* Escape → cancel */
    push('mediaPicked', 'bbbbbbbbbbbbbbbb', JSON.stringify(items(2)));
    await sleep(120);
    const sh = d.querySelector('.c-sheet--msend');
    sh.dispatchEvent(new s.W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(520);   // the answer goes when the sheet is gone (overlay.js: transitionend or the 400 ms fallback)
    r.escCancels = s.sent.filter((v) => v === 'ixian:mediaCancel:bbbbbbbbbbbbbbbb').length === 1;
    /* ✕ on the last photo → cancel */
    push('mediaPicked', 'cccccccccccccccc', JSON.stringify(items(1)));
    await sleep(120);
    const live = [...d.querySelectorAll('.c-sheet--msend')].pop();
    live.querySelector('.c-msend__remove').click();
    await sleep(520);
    r.lastXCancels = s.sent.filter((v) => v === 'ixian:mediaCancel:cccccccccccccccc').length === 1;
    /* a newer batch replaces the open one */
    push('mediaPicked', 'dddddddddddddddd', JSON.stringify(items(2)));
    await sleep(120);
    push('mediaPicked', 'eeeeeeeeeeeeeeee', JSON.stringify(items(4)));
    await sleep(520);
    r.newerCancelsOlder = s.sent.filter((v) => v === 'ixian:mediaCancel:dddddddddddddddd').length === 1
      && !s.sent.includes('ixian:mediaCancel:eeeeeeeeeeeeeeee')
      && [...d.querySelectorAll('.c-sheet--msend')].pop().querySelectorAll('.c-msend__cell').length === 4;
    /* ★ #46 M3: a thumb-less item ("" — C# made no preview) is KEPT as a glyph tile and its key is sent */
    push('mediaPicked', 'ffffffffffffffff', JSON.stringify([{ k: '0', thumb: '', kind: 'photo' }, { k: '1', thumb: JPG, kind: 'photo' }]));
    await sleep(150);
    const sh2 = [...d.querySelectorAll('.c-sheet--msend')].pop();
    r.glyphKept = sh2.querySelectorAll('.c-msend__cell').length === 2 && !!sh2.querySelector('.c-msend__cell .c-msend__glyph svg');
    sh2.querySelector('.c-msend__send').click();
    await sleep(520);
    r.glyphSent = s.sent.includes('ixian:mediaSend:ffffffffffffffff:0,1:') && !s.sent.includes('ixian:mediaCancel:ffffffffffffffff');
    /* ★ #46 S1: a chat switch (onChatScreenReady) cancels the open batch — it never reaches chat B */
    push('mediaPicked', '1212121212121212', JSON.stringify(items(2)));
    await sleep(150);
    push('onChatScreenReady', 'addrOther');
    await sleep(520);
    r.switchCancels = s.sent.filter((v) => v === 'ixian:mediaCancel:1212121212121212').length === 1 && !d.querySelector('.c-sheet--msend[data-open]');
    /* ★ #46 S2: a LOCKED composer (a pending request) refuses a batch at once */
    push('setChatMode', '0', '0', '', 'False');
    push('showRequestSentModal', '1');
    await sleep(80);
    push('mediaPicked', '3434343434343434', JSON.stringify(items(2)));
    await sleep(150);
    r.lockedRefuses = s.sent.includes('ixian:mediaCancel:3434343434343434') && !d.querySelector('.c-sheet--msend[data-open]');
    r.noErr = K.noErr(s.errs);
    s.W.close();
  } catch (e) { r.err = e.message; }
  if (process.env.B1DBG) console.log(JSON.stringify(r));
  ok(Object.values(r).every((x) => x === true),
    '★★ S9 B1 (#1244 S = C) the photo preview sheet on the built chat shell: mediaPicked validates every item (16-hex batch, key 0–9 unique, a base64 JPEG thumb only, kind photo), shows "{n} photos" + "Location removed · resized", ✕ removes, Send answers ONCE with ixian:mediaSend:<id>:<kept keys>:<base64url caption>; an empty pick, Escape, ✕ on the last photo and a newer batch answer ixian:mediaCancel — ' + JSON.stringify(r));

  const t = {};
  try {
    const want = {
      tooBig: 'Use Send file instead', decode: 'could not be read', clipboardEmpty: 'no picture to paste',
      cameraDenied: 'camera access', tooMany: 'up to 10 photos', fileTooBig: 'over 100 MB and can’t be sent', fileTooBigIn: 'over 100 MB and can’t be downloaded', storageDenied: 'storage access to save the camera photo', '<img src=x>': null,
    };
    for (const [code, frag] of Object.entries(want)) {   // a fresh document each (toasts queue one at a time)
      const s = await K.open({ caps: 'reply,media' });
      s.push('mediaError', code);
      await sleep(60);
      const txt = [...s.d.querySelectorAll('.c-toast')].map((x) => x.textContent).join(' | ');
      t[frag ? code : 'unknownIgnored'] = frag ? txt.includes(frag) : txt === '';
      if (code === 'tooBig') {
        const s2 = await K.open({ caps: 'reply,media' });
        s2.push('fileNotice', 'videoLocation');
        await sleep(60);
        t.videoNote = [...s2.d.querySelectorAll('.c-toast')].map((x) => x.textContent).join('').includes('Videos are sent as they are, with any location data inside.');
        s2.push('fileNotice', 'other');
        t.noErr = K.noErr(s.errs) && K.noErr(s2.errs);
        s2.W.close();
      }
      s.W.close();
    }
  } catch (e) { t.err = e.message; }
  ok(Object.values(t).every((x) => x === true),
    '★ S9 B1 mediaError → a fixed toast per code (tooBig · decode · clipboardEmpty · cameraDenied · tooMany · fileTooBig), an unknown code shows nothing; fileNotice videoLocation → "Videos are sent as they are, with any location data inside." — ' + JSON.stringify(t));
}
