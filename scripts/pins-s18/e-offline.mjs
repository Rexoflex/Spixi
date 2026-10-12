/* ==== S18 D1 (S17 walk MO-OFFLINE, Damir 2026-10-12 17:17: "10 s is too long; 5 s max") ====
 * On the BUILT chat.html (jsdom, phone, moments ON): a manual download of a photo offer from a named peer who is not shown
 * online ARMS the offline moment on a 5 000 ms timer (the delay the shell hands setTimeout — never 10 000), and when that
 * timer runs with no first tick the chat ASKS C# for it (ixian:moment:offline). A first tick before it runs = no ask.
 * Deliberate break (S18 report): OFFLINE_MOMENT_MS back to 10000 → the delay clause fails. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = b1Kit(h);
  const { sleep, T0 } = K;
  const r = {};
  const run = async (tick) => {
    const s = await K.open({ caps: 'reply,media,moments', rows: false, before: (x) => {
      x.push('setNickname', 'Ana');
      x.push('setMoments', JSON.stringify({ seen: [], apps: [], lang: '', session: false }));
    } });
    try {
      const { d, W, push, sent } = s;
      push('addFile', 'o1', 'addrPeer', 'Ana', '', 'x1', 'beach.jpg', String(T0 + 10), 'False', 'True', 'True', '0', 'False', 'False', 'True', '', '', '', '', '', '845312');
      await sleep(150);
      /* record every timer the shell arms from here on (the real timers still run) */
      const armed = [];
      const real = W.setTimeout.bind(W);
      W.setTimeout = (fn, ms, ...a) => { armed.push({ fn, ms }); return real(fn, ms, ...a); };
      const row = K.rowOf(d, 'o1');
      const tile = row && row.querySelector('.c-mbubble[data-file]');
      const btn = tile && (tile.querySelector('button') || tile);
      if (btn) btn.click();
      await sleep(80);
      W.setTimeout = real;
      const accepted = sent.some((c) => c === 'ixian:acceptfile:x1');
      const offline = armed.filter((t) => t.ms === 5000 || t.ms === 10000);
      if (tick) push('updateFile', 'x1', '1');   // a first tick: the transfer started
      await sleep(40);
      for (const t of offline) { try { t.fn(); } catch (e) { /* */ } }
      await sleep(120);
      return { accepted, delays: armed.map((t) => t.ms).filter((m) => m >= 1000), offline: offline.map((t) => t.ms), asked: sent.filter((c) => /^ixian:moment:offline/.test(c)).length };
    } finally { try { s.W.close(); } catch (e) { /* */ } }
  };
  try {
    const a = await run(false);
    r.delay = a.accepted && a.offline.length === 1 && a.offline[0] === 5000;
    r.asks = a.asked === 1;
    const b = await run(true);
    r.tickNoAsk = b.accepted && b.asked === 0;
    if (!(r.delay && r.asks && r.tickNoAsk)) r.detail = JSON.stringify({ a, b });
  } catch (e) { r.threw = e.message; }
  ok(Object.values(r).every((v) => v === true),
    '★ S18 D1 (MO-OFFLINE): a manual photo download from a named peer who is not online arms the offline moment at 5 s (was 10 s) and asks C# (ixian:moment:offline) when it runs with no first tick; a first tick before then = no ask — ' + JSON.stringify(r));
}
