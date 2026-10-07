/* ★ S10 #46 r2 MAJOR-2 (pin): ✕ a photo, C# confirms (a push WITHOUT that key), then the user re-adds the SAME photo — C# gives it the freed key
   with the same thumb/w/h/kb → does the strip show it? */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  const K = b1Kit(h); const { sleep, JPG } = K; let s = null; const r = {};
  const BID = '00112233aabbccdd';
  const items = (ks) => ks.map((k) => ({ k: String(k), thumb: JPG, w: '1600', h: '1200', kb: '300', kind: 'photo' }));
  try {
    s = await K.open({ caps: 'reply,edit,voice,media' });
    const { d, push } = s;
    const tiles = () => [...d.querySelectorAll('.c-mstrip__tile')].map((t) => t.dataset.k).join();
    push('mediaPicked', BID, JSON.stringify(items([0, 1, 2])));
    await sleep(80);
    d.querySelectorAll('.c-mstrip__tile')[1].querySelector('.c-mstrip__remove').click();
    await sleep(40);
    r.afterDrop = tiles();
    // C# processed the drop; the user pastes / picks again → finishPick pushes 0,2 + the new photo at the smallest free key 1
    push('mediaDropped', BID, '1');   // C# onMediaDrop confirms the drop (#46 r3)
    await sleep(40);
    push('mediaPicked', BID, JSON.stringify(items([0, 2, 1])));  // same photo re-added in slot 1
    await sleep(60);
    r.afterReadd = tiles();
    d.querySelector('.c-composer__action') && d.querySelector('.c-composer__action').click();
    await sleep(60);
    r.sent = s.sent.filter((v) => v.startsWith('ixian:mediaSend:')).join(' ');
  } catch (e) { r.err = e.message; } finally { if (s) { try { s.W.close(); } catch (_) {} } }
  h.ok(r.afterDrop === '0,2' && r.afterReadd === '0,2,1' && /^ixian:mediaSend:00112233aabbccdd:0,2,1:$/.test(r.sent) && !r.err,
    'S10 #46 r2 MAJOR-2: a ✕-ed key that C# CONFIRMED (mediaDropped) is forgotten — the same photo added back into the freed key is shown and sent, never hidden then deleted — ' + JSON.stringify(r));
}
