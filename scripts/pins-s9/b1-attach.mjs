/* ==== S9 B1 — #1244 P = B: the attach tiles (Photos + Camera, no GIF) and the paste-a-picture path, on the BUILT chat.html ====
 *   · media + camera caps in a 1:1 → Send file · Photos · Camera · Pay · Request · App invite (no GIF); Photos → ixian:sendmedia,
 *     Camera → ixian:camera; media without camera → no Camera tile; no media cap → neither (an old exe)
 *   · a paste whose clipboardData has an image type (types or items) and no text/plain → preventDefault + ixian:pasteImage;
 *     text beside it → an ordinary paste (no verb); no media cap → no verb
 * Deliberate breaks (S9 B1 hand-back): attach-sheet `camera:` flag forced true → noCameraWithoutCap · the `camera` leg of
 *   onAttachAction dropped → cameraVerb · clipboardHasImageType's text/plain test dropped → textWins */
import { b1Kit } from './b1-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = b1Kit(h);
  const { sleep } = K;
  const tilesOf = async (s) => {
    const d = s.d;
    const btn = d.querySelector('.c-composer__attach');
    if (btn) btn.click();
    await sleep(80);
    const labels = [...d.querySelectorAll('.c-attach-tray .c-attach__tile .c-attach__label')].map((x) => x.textContent);
    return labels;
  };
  const r = {};
  try {
    const s = await K.open({ caps: 'reply,media,camera' });
    const labels = await tilesOf(s);
    r.six = JSON.stringify(labels) === JSON.stringify(['Send file', 'Photos', 'Camera', 'Pay', 'Request', 'App invite']);
    r.noGif = !labels.includes('GIF');
    const tile = (name) => [...s.d.querySelectorAll('.c-attach-tray .c-attach__tile')].find((t) => t.textContent.trim() === name);
    const cam = tile('Camera');
    if (cam) cam.click();
    await sleep(60);
    r.cameraVerb = s.sent.includes('ixian:camera');
    await tilesOf(s);
    const ph = tile('Photos');
    if (ph) ph.click();
    await sleep(60);
    r.photosVerb = s.sent.includes('ixian:sendmedia');
    r.noErr = K.noErr(s.errs);
    s.W.close();
  } catch (e) { r.err = e.message; }
  try {
    const s = await K.open({ caps: 'reply,media' });
    const labels = await tilesOf(s);
    r.noCameraWithoutCap = labels.includes('Photos') && !labels.includes('Camera');
    s.W.close();
    const s2 = await K.open({ caps: 'reply' });
    const l2 = await tilesOf(s2);
    r.oldExeNoMedia = !l2.includes('Photos') && !l2.includes('Camera') && l2.includes('Send file');
    s2.W.close();
  } catch (e) { r.err2 = e.message; }
  ok(Object.values(r).every((x) => x === true),
    '★★ S9 B1 (#1244 P = B) on the built chat shell: the tray shows Send file · Photos · Camera · Pay · Request · App invite with media + camera (no GIF tile); Photos sends ixian:sendmedia and Camera ixian:camera; media alone = no Camera; an old exe (no media cap) = neither — ' + JSON.stringify(r));

  /* —— paste —— */
  const p = {};
  try {
    const paste = async (s, types, items) => {
      const inp = s.d.querySelector('.c-composer__input');
      const ev = new s.W.Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'clipboardData', { value: { types, items: items || [] } });
      inp.dispatchEvent(ev);
      await sleep(40);
      return ev.defaultPrevented;
    };
    const s = await K.open({ caps: 'reply,media' });
    const n0 = s.sent.length;
    p.typesTaken = (await paste(s, ['Files', 'image/png'], [])) === true && s.sent.slice(n0).filter((v) => v === 'ixian:pasteImage').length === 1;
    const n1 = s.sent.length;
    p.itemsTaken = (await paste(s, ['Files'], [{ kind: 'file', type: 'image/jpeg' }])) === true && s.sent.slice(n1).includes('ixian:pasteImage');
    const n2 = s.sent.length;
    p.textWins = (await paste(s, ['text/plain', 'text/html', 'Files'], [{ kind: 'file', type: 'image/png' }])) === false && s.sent.length === n2;
    p.plainText = (await paste(s, ['text/plain'], [{ kind: 'string', type: 'text/plain' }])) === false && s.sent.length === n2;
    s.W.close();
    const s2 = await K.open({ caps: 'reply' });
    const m0 = s2.sent.length;
    p.noCapNoVerb = (await paste(s2, ['image/png'], [])) === false && s2.sent.length === m0;
    s2.W.close();
  } catch (e) { p.err = e.message; }
  ok(Object.values(p).every((x) => x === true),
    '★★ S9 B1 (#1244 / #1156) paste on the built chat shell: an image TYPE in clipboardData (types or items) with no text/plain → the paste is taken and ixian:pasteImage goes once (the shell never reads bytes); text beside a picture or plain text = an ordinary paste; no media cap = nothing — ' + JSON.stringify(p));
}
