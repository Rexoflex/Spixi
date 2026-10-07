/* ==== S9 B1 — #1244: the photo batch (mediaPicked → mediaSend / mediaCancel), mediaError, fileNotice ====
 * ★ S10 (#1254) REWRITTEN for the STRIP: the S9 preview sheet is gone (media-send-sheet.js deleted); the strip's own
 * contract lives in pins-s10/c-strip.mjs. What stays HERE (the S9 rows the strip inherits):
 *   · nothing valid → mediaCancel at once (emptyCancels — restored, S10 #46 R3-14)
 *   · #46 M3: a thumb-less item ("" — C# made no preview) is a GLYPH tile and its key is sent (glyphKept / glyphSent)
 *   · #46 S1: a chat switch (onChatScreenReady) cancels the open batch — it never reaches chat B (switchCancels)
 *   · #46 S2: a LOCKED composer (a pending request) refuses a batch at once (lockedRefuses); a lock arriving while the strip
 *     is open cancels it (lockCancelsOpen — S10)
 *   · mediaError: each code → its toast (fileTooBig = the S10 P2 50 MB text); an unknown code → none · fileNotice */
import { b1Kit } from './b1-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = b1Kit(h);
  const { sleep, JPG } = K;
  const items = (n) => Array.from({ length: n }, (_, i) => ({ k: String(i), thumb: JPG, w: '1600', h: '1200', kb: '300', kind: 'photo' }));
  const r = {};
  try {
    const s = await K.open({ caps: 'reply,media' });
    const { d, push } = s;
    const strip = () => d.querySelector('#chat-composer > .c-mstrip');
    /* ★ S10 #46 R3-14: nothing valid (bad key / not a photo) → mediaCancel at once, no strip */
    push('mediaPicked', 'aaaaaaaaaaaaaaaa', JSON.stringify([{ k: 'x', thumb: JPG, kind: 'photo' }, { k: '0', thumb: JPG, kind: 'video' }]));
    await sleep(60);
    r.emptyCancels = s.sent.filter((v) => v === 'ixian:mediaCancel:aaaaaaaaaaaaaaaa').length === 1 && !strip();
    push('mediaPicked', 'ffffffffffffffff', JSON.stringify([{ k: '0', thumb: '', kind: 'photo' }, { k: '1', thumb: JPG, kind: 'photo' }]));
    await sleep(100);
    r.glyphKept = !!strip() && strip().querySelectorAll('.c-mstrip__tile').length === 2 && !!strip().querySelector('.c-mstrip__tile .c-mstrip__glyph svg');
    d.querySelector('.c-composer__action').click();
    await sleep(80);
    r.glyphSent = s.sent.includes('ixian:mediaSend:ffffffffffffffff:0,1:') && !s.sent.includes('ixian:mediaCancel:ffffffffffffffff') && !strip();
    push('mediaPicked', '1212121212121212', JSON.stringify(items(2)));
    await sleep(100);
    push('onChatScreenReady', 'addrOther');
    await sleep(80);
    r.switchCancels = s.sent.filter((v) => v === 'ixian:mediaCancel:1212121212121212').length === 1 && !strip();
    push('setChatMode', '0', '0', '', 'False');
    push('mediaPicked', '5656565656565656', JSON.stringify(items(2)));
    await sleep(100);
    const openBefore = !!strip();
    push('showRequestSentModal', '1');
    await sleep(80);
    r.lockCancelsOpen = openBefore && s.sent.filter((v) => v === 'ixian:mediaCancel:5656565656565656').length === 1 && !strip();
    push('mediaPicked', '3434343434343434', JSON.stringify(items(2)));
    await sleep(100);
    r.lockedRefuses = s.sent.includes('ixian:mediaCancel:3434343434343434') && !strip();
    r.noErr = K.noErr(s.errs);
    s.W.close();
  } catch (e) { r.err = e.message; }
  if (process.env.B1DBG) console.log(JSON.stringify(r));
  ok(Object.values(r).every((x) => x === true),
    '★★ S9 B1 (#1244) → S10 strip: a thumb-less item is a glyph tile and is sent; a chat switch cancels the open batch; a locked composer refuses a batch and a lock cancels an open one — ' + JSON.stringify(r));

  const t = {};
  try {
    const want = {
      tooBig: 'Use Send file instead', decode: 'could not be read', clipboardEmpty: 'no picture to paste',
      cameraDenied: 'camera access', tooMany: 'up to 10 photos', fileTooBig: 'over 50 MB and can’t be sent', fileTooBigIn: 'over 100 MB and can’t be downloaded', storageDenied: 'storage access to save the camera photo', '<img src=x>': null,
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
    '★ S9 B1 mediaError → a fixed toast per code (tooBig · decode · clipboardEmpty · cameraDenied · tooMany · fileTooBig = the S10 50 MB text), an unknown code shows nothing; fileNotice videoLocation → "Videos are sent as they are, with any location data inside." — ' + JSON.stringify(t));
}
