/* ==== S20 F (#1378) · #46 F2 — the #235 link cap is decided ONCE per message, not per formatted run ====
 * On the BUILT chat.html (jsdom): a 12 KB message of runs split by ~x~ marks (each run < LINKIFY_MAX 4096, the whole
 * > 4096), with a URL and an @mention in it:
 *   · the parse really splits it into runs < 4096 (so a per-run check would pass every run to linkify)
 *   · NO link button is created, and the URL regex never runs on any of its runs (a String.prototype.matchAll spy:
 *     no call on a string carrying the "a.a.a." filler)
 *   · the mention pill and the strike formatting still render
 *   · a small formatted message `*https://ixian.io*` arriving after it still linkifies (inside the bold)
 * Deliberate break (S20 #46 F2 report): `big` computed per run (run.length > LINKIFY_MAX) in message-bubble.js →
 * link buttons appear and the spy sees the filler runs. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = b1Kit(h);
  const RUN = '@Me see https://ixian.io ' + 'a.'.repeat(1900) + '~x~.';
  const BIG = (RUN + ' ').repeat(3);
  const k = {};
  const spied = [];
  let s = null;
  try {
    s = await K.open({ group: true, rows: false,
      before: (s0) => {
        const SP = s0.W.String.prototype;
        const orig = SP.matchAll;
        SP.matchAll = function (re) { if (re instanceof s0.W.RegExp && /https\?/.test(re.source) && String(this).includes('a.a.a.a.')) spied.push(String(this).length); return orig.call(this, re); };
      },
      hist: (s0) => {
        s0.push('addThem', 'L1', 'addrAna', 'Ana', '', BIG, String(K.T0), 'True', 'True', 'True', 'False', 'False');
      } });
    const { d, W } = s;
    const runs = W.Spixi.parseFormat(BIG).filter((n) => typeof n === 'string');
    k.split = BIG.length > 4096 && runs.length >= 3 && runs.every((r) => r.length < 4096);
    const t = K.rowOf(d, 'L1') && K.rowOf(d, 'L1').querySelector('.c-bubble__text');
    k.noLink = !!t && !t.querySelector('.c-bubble__link') && t.textContent.includes('https://ixian.io');
    k.noRegex = spied.length === 0;
    k.mention = !!t && t.querySelectorAll('.c-bubble__mention').length === 3 && t.querySelectorAll('s.c-fmt-s').length === 3;
    s.push('addThem', 'L2', 'addrAna', 'Ana', '', '*https://ixian.io*', String(K.T0 + 60), 'True', 'True', 'True', 'False', 'False');
    await sleep(300);
    const t2 = K.rowOf(d, 'L2') && K.rowOf(d, 'L2').querySelector('.c-bubble__text');
    const l2 = t2 && t2.querySelector('strong.c-fmt-b > .c-bubble__link');
    k.smallLinks = !!l2 && l2.title === 'https://ixian.io';
    k.noErr = K.noErr(s.errs);
  } catch (e) { k.err = e.message; }
  finally { if (s) s.W.close(); }
  ok(Object.values(k).every((x) => x === true),
    '★ S20 #46 F2 (#235 · #1378): a > 4096-char formatted message (runs each < 4096) creates NO link button and never runs the URL regex on its runs — mentions + marks still render; a small formatted message still linkifies' +
    (Object.values(k).every((x) => x === true) ? '' : ' — ' + JSON.stringify(k) + ' spied=' + JSON.stringify(spied.slice(0, 5))));
}
