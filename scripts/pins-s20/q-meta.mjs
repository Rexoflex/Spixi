/* ==== S20 Q — B (#1377, Damir's dial option 2): the SENT bubble's meta is ONE quiet weight ====
 * On the BUILT chat.html (jsdom, phone): the computed opacity of the sent row's meta parts — the time, the ✓ (sent) tick
 * and the ✓✓ (delivered) tick — is 0.7 each; the READ tick stays 1; a failed message's tick (if it renders in the meta)
 * stays 1; the received time keeps its #1041 0.7. The winning value is read with getComputedStyle (the cascade decides),
 * and a var() is resolved through the root (jsdom keeps custom properties unresolved).
 * Supersedes #1247's 0.92 (time) and #692's 0.571 (delivered).
 * Deliberate breaks (S20 Q report): --bubble-meta-opacity-sent 0.7 → 0.92 → time + sent + delivered fail ·
 * the #692 rule put back (`[data-tone="delivered"] { opacity: 0.571; }`) → delivered fails ·
 * the read / failed opacity: 1 rule deleted → read fails ·
 * (#46 r1) a dark-only `[data-theme="dark"] .c-bubble-row[data-direction="sent"] .c-bubble__meta > * { opacity: 0.92; }` → dark fails. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = b1Kit(h);
  const { T0 } = K;
  const r = {};
  const got = {};
  try {
    const s = await K.open({ rows: false, hist: (x) => {
      /* addMe(id, address, nick, avatar, text, time, sent, confirmed, read, paid, errorSending) */
      x.push('addThem', 'qR', 'addrPeer', 'Ana', '', 'their words', String(T0), 'True', 'True', 'True', 'False', 'False');
      x.push('addMe', 'qS', 'addrMe', 'Me', '', 'sent only', String(T0 + 10), 'True', 'False', 'False', 'False', 'False');
      x.push('addMe', 'qD', 'addrMe', 'Me', '', 'delivered', String(T0 + 20), 'True', 'True', 'False', 'False', 'False');
      x.push('addMe', 'qRd', 'addrMe', 'Me', '', 'read', String(T0 + 30), 'True', 'True', 'True', 'False', 'False');
    } });
    try {
      const { W, d } = s;
      await sleep(150);
      const resolve = (name, depth = 0) => {
        const v = W.getComputedStyle(d.documentElement).getPropertyValue(name).trim();
        const m = /^var\((--[\w-]+)(?:,\s*([^)]+))?\)$/.exec(v);
        if (m && depth < 12) return resolve(m[1], depth + 1) || (m[2] || '').trim();
        return v;
      };
      const opOf = (el) => {
        if (!el) return NaN;
        const v = W.getComputedStyle(el).opacity.trim();
        const m = /^var\((--[\w-]+)(?:,\s*([^)]+))?\)$/.exec(v);
        return Number(m ? (resolve(m[1]) || (m[2] || '').trim()) : (v === '' ? '1' : v));
      };
      const meta = (id) => { const row = K.rowOf(d, id); return row && row.querySelector('.c-bubble__meta'); };
      const part = (id, sel) => { const m = meta(id); return m && m.querySelector(sel); };
      got.time = opOf(part('qS', 'time'));
      got.sent = opOf(part('qS', '.c-status-icon'));
      got.sentTone = (part('qS', '.c-status-icon') || { dataset: {} }).dataset.tone;
      got.dTime = opOf(part('qD', 'time'));
      got.delivered = opOf(part('qD', '.c-status-icon'));
      got.dTone = (part('qD', '.c-status-icon') || { dataset: {} }).dataset.tone;
      got.read = opOf(part('qRd', '.c-status-icon'));
      got.rTone = (part('qRd', '.c-status-icon') || { dataset: {} }).dataset.tone;
      got.rTime = opOf(part('qRd', 'time'));
      got.recvTime = opOf(part('qR', 'time'));
      const near = (a, b) => Math.abs(a - b) < 1e-6;
      r.tones = got.sentTone === 'neutral' && got.dTone === 'delivered' && got.rTone === 'read';
      r.time = near(got.time, 0.7) && near(got.dTime, 0.7) && near(got.rTime, 0.7);
      r.sentTick = near(got.sent, 0.7);
      r.deliveredTick = near(got.delivered, 0.7);
      r.readTick = near(got.read, 1);
      r.received = near(got.recvTime, 0.7);   // #1041 unchanged
      /* failed: the tick tone the bubble uses on a failed send, built through the same meta machinery */
      const row = K.rowOf(d, 'qS');
      const failedIcon = row && row.querySelector('.c-bubble__meta .c-status-icon');
      if (failedIcon) {
        failedIcon.dataset.tone = 'failed';
        got.failed = opOf(failedIcon);
        failedIcon.dataset.tone = 'neutral';
      }
      r.failedTick = near(got.failed, 1);
      /* ★ #46 r1 (auditor C): the SAME parts in DARK — a dark-only override (back to 0.92) survived a light-only pin */
      d.documentElement.setAttribute('data-theme', 'dark');
      got.dark = [opOf(part('qS', 'time')), opOf(part('qS', '.c-status-icon')), opOf(part('qD', '.c-status-icon')), opOf(part('qRd', '.c-status-icon')), opOf(part('qR', 'time'))];
      d.documentElement.removeAttribute('data-theme');
      r.dark = near(got.dark[0], 0.7) && near(got.dark[1], 0.7) && near(got.dark[2], 0.7) && near(got.dark[3], 1) && near(got.dark[4], 0.7);
      r.noErr = K.noErr(s.errs);
    } finally { s.W.close(); }
  } catch (e) { r.err = e.message; }
  ok(Object.values(r).every((v) => v === true),
    '★★ S20 Q B (#1377) on the built chat shell: a SENT row\'s time, ✓ sent and ✓✓ delivered tick all compute to opacity 0.7 (one quiet weight; #1247 0.92 and #692 0.571 superseded), the READ tick and a failed tick stay 1, the received time keeps its #1041 0.7 — in light AND dark — '
    + JSON.stringify({ r, got }));
}
