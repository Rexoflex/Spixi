/* ==== SESSION 8 (S1) — ★ S8 (#1233) MINI-APP DECLINE, EXECUTED on the BUILT chat.html (jsdom, a 1:1; the s1Kit model).
 *   · an incoming invite's Decline sends ixian:appDecline:<msgIdHex> and the card shows "You declined this invite" AT ONCE
 *     (optimistic) — and nothing is written to localStorage (the C# pref is the truth)
 *   · C# app_state "Declined" → 'declined' on an INCOMING row ("You declined this invite", no Decline / Join) and on MY own
 *     invite ("Your invite was declined", no Cancel / Launch)
 *   · the legacy `spixi.app.declined.<peer>` set is no longer READ: an id in it still offers Decline
 * Deliberate breaks: see the S8 S1 hand-back. */
import { s1Kit } from '../pins-s7b/s1-boot.mjs';

export default async function (h) {
  const { ok } = h;
  const k = s1Kit(h);
  const { boot, rowOf, noErr, guard, sleep } = k;
  /* jsdom gives a file:// page no usable localStorage (opaque origin) — an in-memory Storage stands in, installed
     BEFORE the chat opens (onChatScreenReady is where the old build read the legacy set) */
  const memStorage = () => {
    const m = new Map();
    return {
      get length() { return m.size; },
      key(i) { return [...m.keys()][i] ?? null; },
      getItem(k2) { return m.has(String(k2)) ? m.get(String(k2)) : null; },
      setItem(k2, v) { m.set(String(k2), String(v)); },
      removeItem(k2) { m.delete(String(k2)); },
      clear() { m.clear(); },
    };
  };
  const open = async () => {
    const s = await boot();
    Object.defineProperty(s.W, 'localStorage', { configurable: true, value: memStorage() });
    s.W.localStorage.setItem('spixi.app.declined.addrPeer', JSON.stringify(['ap04']));   // a legacy set from an older build
    s.push('onChatScreenReady', 'addrPeer');
    s.push('setChatMode', '0', '0', '', 'False');
    s.push('clearMessages', 'false');
    return s;
  };
  const T = String(Math.floor(Date.now() / 1000) - 600);
  const btn = (row, label) => row && [...row.querySelectorAll('button')].find((b) => b.textContent.trim() === label);

  await guard('S8 #1233 app decline', async () => {
    const s = await open();
    const { W, d, push, sent, errs } = s;
    const r = {};
    r.lsWorks = W.localStorage.getItem('spixi.app.declined.addrPeer') === JSON.stringify(['ap04']);
    const inv = (id, own, status) => push('addAppRequest', id, 'app.' + id, 'Chess', '', own ? 'addrMe' : 'addrPeer', own ? 'Me' : 'Bob', '', T,
      own ? 'True' : 'False', 'True', 'False', status, '');
    inv('ap01', false, '');
    inv('ap02', false, 'Declined');
    inv('ap03', true, 'Declined');
    inv('ap04', false, '');
    push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(200);

    /* a. Decline → the verb with the row id + the declined card at once, nothing stored by the shell */
    const dec = btn(rowOf(d, 'ap01'), 'Decline');
    r.hasDecline = !!dec;
    const n0 = sent.length;
    if (dec) dec.click();
    await sleep(60);
    r.verb = sent.slice(n0).filter((x) => /^ixian:appDecline:/.test(x)).join('|') === 'ixian:appDecline:ap01';
    const a = rowOf(d, 'ap01');
    r.optimistic = !!a && /You declined this invite/.test(a.textContent) && !btn(a, 'Decline') && !btn(a, 'Join');
    let stored = '';
    try { stored = W.localStorage.getItem('spixi.app.declined.addrPeer') || ''; } catch (e) {}
    const declKeys = [];
    for (let i = 0; i < W.localStorage.length; i++) { const key = W.localStorage.key(i); if (/^spixi\.app\.declined\./.test(key)) declKeys.push(key); }
    r.noWrite = r.lsWorks && declKeys.length === 1 && stored === JSON.stringify(['ap04']);

    /* b. C#'s "Declined" on an incoming row and on my own invite */
    const b = rowOf(d, 'ap02');
    r.inDeclined = !!b && /You declined this invite/.test(b.textContent) && !btn(b, 'Decline') && !btn(b, 'Join');
    const c = rowOf(d, 'ap03');
    r.ownDeclined = !!c && /Your invite was declined/.test(c.textContent) && !/You declined/.test(c.textContent)
      && !btn(c, 'Cancel') && !btn(c, 'Launch app');

    /* c. the legacy localStorage set is not read */
    r.legacyNotRead = !!btn(rowOf(d, 'ap04'), 'Decline');
    r.noErr = noErr(errs);

    ok(r.hasDecline && r.verb && r.optimistic && r.noWrite,
      '★ S8 (#1233): Decline on an incoming app invite sends ixian:appDecline:<msgIdHex> and paints "You declined this invite" at once (optimistic); the shell writes no localStorage — C# stores the decline — ' + JSON.stringify(r));
    ok(r.inDeclined && r.ownDeclined,
      '★ S8 (#1233): C# app_state "Declined" → the declined card on an incoming row ("You declined this invite") AND on my own invite ("Your invite was declined", no Cancel / Launch) — ' + JSON.stringify(r));
    ok(r.lsWorks && r.legacyNotRead && r.noErr,
      '★ S8 (#1233): the legacy spixi.app.declined.<peer> set is no longer read — an id in it still offers Decline (C#\'s state is the one truth) — ' + JSON.stringify(r));
  });
}
