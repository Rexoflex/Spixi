/* ==== S12 A2 (#1267, #46 R3-MINOR-4) — the two SHELL-side guards of home.html hintLearnMore, driven through the REAL
 * card on the BUILT home shell (nothing new is exposed) ====
 *   · the cap guard: a network card rendered WITH `hintHelp` whose cap is then withdrawn (the bridge reads its caps from
 *     window.SPIXI_ENV.capabilities — the pin seeds that object before the shell runs, so it can delete the cap) → the
 *     tap reports done and sends NO ixian:hintHelp:*;
 *   · the id guard: with the cap, a `web:` target whose id is not in HINT_IDS ('web:evil', 'web:e2e' — the pin rewrites
 *     the bundle's own HINT_TIPS row, the array createHintCard reads) → done, and NO ixian:hintHelp:*;
 *   · control: 'web:network' with the cap → exactly ixian:hintHelp:network (after the done).
 * Deliberate breaks: see the S12 A2 report. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = aKit(h);
  const DAY = 24 * 60 * 60 * 1000;
  const TS = 20;
  const SETTLE = 4000 / TS, STAND = 3000 / TS;
  const OLD5 = ['backup', 'wallet', 'apps', 'addcontact', 'tip'];
  const seedEnv = (t) => t.replace('<head>', '<head><script>window.SPIXI_ENV = { capabilities: {} };</script>');
  const hint = (d) => d.querySelector('.c-glass-card[data-variant="hint"]');
  /* learn = the network row's target for this run; mid = run between the card standing and the tap */
  const run = async (learn, mid) => {
    const s = await K.boot('index.html', { timeScale: TS, html: seedEnv });
    try {
      const { W, d } = s;
      const row = W.Spixi.HINT_TIPS.find((t) => t.id === 'network');
      if (!row) return 'no network row';
      row.learn = learn;
      s.push('setCaps', 'composeSend,hints,updateHelp,hintHelp');
      s.push('setHints', JSON.stringify({ firstSeen: Date.now() - 10 * DAY, lastShown: 0, done: OLD5, off: false, now: Date.now() }));
      s.push('showWarning', '');
      await K.sleep(SETTLE + STAND + 120);
      const c = hint(d);
      const link = c && c.querySelector('.c-glass-card__link');
      if (!c || c.dataset.tip !== 'network' || !link) return 'card/link ' + (c && c.dataset.tip);
      if (W.SPIXI_ENV.capabilities.hintHelp !== true) return 'the seeded caps object is not the bridge\'s';
      if (mid) mid(W);
      s.sent.length = 0;
      link.dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
      await K.sleep(60);
      return s.sent;
    } finally { s.close(); }
  };
  const r = {};
  const is = (v, want) => (Array.isArray(v) && JSON.stringify(v) === JSON.stringify(want)) || JSON.stringify(v);
  try {
    r.control = is(await run('web:network'), ['ixian:hint:done:network', 'ixian:hintHelp:network']);
    r.capWithdrawn = is(await run('web:network', (W) => { delete W.SPIXI_ENV.capabilities.hintHelp; }), ['ixian:hint:done:network']);
    r.unknownId = is(await run('web:evil'), ['ixian:hint:done:network']);
    r.heldId = is(await run('web:e2e'), ['ixian:hint:done:network']);
  } catch (e) { r.err = e.message; }
  ok(Object.values(r).every((x) => x === true),
    '★ S12 A2 (#1267, R3-MINOR-4): home.html hintLearnMore guards, through the real card — web:network with the hintHelp cap sends exactly done + ixian:hintHelp:network; the same tap after the cap is withdrawn sends only done; with the cap, web:evil and web:e2e (ids not in HINT_IDS) send only done — ' + JSON.stringify(r));
}
