/* ==== S19 F3 (S18 walk MO-OFFLINE, proven on Android 21:13 / 21:15: no `[MO] ask id=offline`) ====
 * C#'s onAcceptFile pushes updateFile(uid, "0", false) at ONCE (SingleChatPage.xaml.cs:3660), sender online or not. That
 * echo latched transferStarted and the offline moment's 5 s timer always returned. On the BUILT chat.html (jsdom, phone,
 * moments ON, a named 1:1 peer not shown online), REAL timers (OFFLINE_MOMENT_MS = 5 000):
 *   (a) accept → the echo "0" → 5 s → the chat ASKS C# (ixian:moment:offline);
 *   (b) accept → the echo → a real tick ("1") → 5 s → no ask;
 *   (c) accept → the echo → a second "0" (a big file's floored first packet) → 5 s → no ask (only the FIRST 0 is the echo);
 *   (d) the echo still latches the transfer UI (the tile is in progress — the Cancel / re-render rules are unchanged).
 * Deliberate breaks (S19 report): armOfflineMoment reads rec.transferStarted again → (a) fails; updateFile never sets
 * peerTicked → (b) fails; the echo test without the flag (every 0 push = an echo) → (c) fails. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = b1Kit(h);
  const { sleep, T0 } = K;
  const run = async (after) => {
    const s = await K.open({ caps: 'reply,media,moments', rows: false, before: (x) => {
      x.push('setNickname', 'Ana');
      x.push('setMoments', JSON.stringify({ seen: [], apps: [], lang: '', session: false }));
    } });
    try {
      const { d, push, sent } = s;
      push('addFile', 'o1', 'addrPeer', 'Ana', '', 'x1', 'beach.jpg', String(T0 + 10), 'False', 'True', 'True', '0', 'False', 'False', 'True', '', '', '', '', '', '845312');
      await sleep(150);
      const row = K.rowOf(d, 'o1');
      const tile = row && row.querySelector('.c-mbubble[data-file]');
      const btn = tile && (tile.querySelector('button') || tile);
      if (btn) btn.click();
      const accepted = sent.some((c) => c === 'ixian:acceptfile:x1');
      push('updateFile', 'x1', '0', 'False');   // C#'s echo of the accept, at once
      await sleep(60);
      const t = K.rowOf(d, 'o1') && K.rowOf(d, 'o1').querySelector('.c-mbubble[data-file]');
      const ui = t ? t.dataset.file : '';
      for (const a of after) { push('updateFile', 'x1', a, 'False'); await sleep(40); }
      await sleep(5400);   // OFFLINE_MOMENT_MS + the pump
      return { accepted, ui, asked: sent.filter((c) => /^ixian:moment:offline/.test(c)).length };
    } finally { try { s.W.close(); } catch (e) { /* */ } }
  };
  const r = {};
  const det = {};
  try {
    const a = await run([]);
    r.echoThenAsk = a.accepted && a.asked === 1;
    r.echoKeepsUi = a.ui === 'progress';
    const b = await run(['1']);
    r.tickNoAsk = b.accepted && b.asked === 0;
    const c = await run(['0']);
    r.secondZeroNoAsk = c.accepted && c.asked === 0;
    Object.assign(det, { a, b, c });
  } catch (e) { r.threw = e.message; }
  const pass = Object.values(r).every((v) => v === true);
  ok(pass, '★ S19 F3 (MO-OFFLINE): C#\'s "0" echo of my accept is not the sender ticking — accept → echo → 5 s asks C# for the offline moment; a real tick (or a second 0) after the echo → no ask; the echo still shows the transfer in progress — ' + JSON.stringify(r) + (pass ? '' : ' ' + JSON.stringify(det)));
}
