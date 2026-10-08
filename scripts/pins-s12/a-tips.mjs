/* ==== S12 A (#1267) — hint tips 1, 3, 4 on the BUILT home shell ====
 *   · the list (the bundle's own HINT_IDS / pickHint): backup → wallet → apps → addcontact → tip → network → quantum →
 *     nophone; tip 2 (e2e) is HELD — not in the list, dropped from a push; the pick is still the FIRST tip not done in
 *     list order (a gap is filled before a later tip; all eight done → nothing);
 *   · network ("Decentralized" · "Spixi runs on the Ixian network of independent nodes.", topology-star art) on an exe
 *     WITH the `hintHelp` cap: Learn more → shown, done, then the fixed verb `ixian:hintHelp:network` (no URL, no
 *     openLink) — and nothing else; on an exe WITHOUT the cap the same card has NO Learn more (× still = done);
 *   · quantum ("Ready for quantum computers" · "Current Spixi apps use post-quantum encryption.") and nophone
 *     ("No phone number" · "Your account is a key on your device.") have no Learn more, cap or not;
 *   · the in-app targets are unchanged by the predicate: backup keeps its Learn more (→ ixian:backup) with AND without
 *     the `hintHelp` cap.
 *   Timers: a-kit timeScale 20 (SETTLE 4 s → 200 ms, STAND 3 s → 150 ms).
 * Deliberate breaks: see the S12 A report. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = aKit(h);
  const DAY = 24 * 60 * 60 * 1000;
  const TS = 20;
  const SETTLE = 4000 / TS, STAND = 3000 / TS;
  const OLD5 = ['backup', 'wallet', 'apps', 'addcontact', 'tip'];
  let s = null;

  /* ── the pure rules, from the bundle ── */
  const p = {};
  try {
    s = await K.boot('index.html', { now: Date.UTC(2026, 9, 20, 12) });
    const S = s.W.Spixi;
    const now = Date.UTC(2026, 9, 20, 12);
    const pick = (done) => S.pickHint({ firstSeen: now - 10 * DAY, lastShown: 0, done, off: false, now }, { now });
    p.order = JSON.stringify(S.HINT_IDS) === '["backup","wallet","apps","addcontact","tip","network","quantum","nophone"]';
    p.e2eHeld = S.HINT_IDS.indexOf('e2e') < 0 && S.hintCopy('e2e') === null;
    p.afterTip = pick(OLD5) === 'network';
    p.afterNetwork = pick([...OLD5, 'network']) === 'quantum';
    p.afterQuantum = pick([...OLD5, 'network', 'quantum']) === 'nophone';
    p.allEight = pick([...OLD5, 'network', 'quantum', 'nophone']) === null;
    p.firstNotDone = pick(['wallet', 'network']) === 'backup' && pick([...OLD5, 'quantum']) === 'network'
      && pick(['backup', 'wallet', 'apps', 'addcontact', 'network', 'quantum', 'nophone']) === 'tip';
    p.parseKeepsNewDropsE2e = JSON.stringify(S.parseHintsState('{"firstSeen":5,"done":["network","e2e","nophone","quantum"],"now":9}').done)
      === '["network","nophone","quantum"]';
    p.learnTargets = JSON.stringify(S.HINT_TIPS.slice(5).map((t) => [t.id, t.glyph, t.learn]))
      === '[["network","topology-star","web:network"],["quantum","shield-lock",""],["nophone","square-asterisk",""]]';
  } catch (e) { p.err = e.message; }
  finally { if (s) { s.close(); s = null; } }
  ok(Object.values(p).every((x) => x === true),
    '★ S12 A (#1267): HINT_IDS = backup → wallet → apps → addcontact → tip → network → quantum → nophone (e2e HELD: not listed, no copy, dropped from a push); pickHint is still the FIRST tip not done in list order (tip 9 done → network → quantum → nophone → nothing; a gap first) — ' + JSON.stringify(p));

  /* ── the cards on the built shell ── */
  const hint = (d) => d.querySelector('.c-glass-card[data-variant="hint"]');
  const state = (done) => JSON.stringify({ firstSeen: Date.now() - 10 * DAY, lastShown: 0, done, off: false, now: Date.now() });
  const flow = async (caps, done, check) => {
    s = await K.boot('index.html', { timeScale: TS });
    try {
      s.push('setCaps', caps);
      s.push('setHints', state(done));
      s.push('showWarning', '');
      await K.sleep(SETTLE + 80);
      return await check(s);
    } finally { s.close(); s = null; }
  };
  const txt = (c, sel) => { const e = c.querySelector(sel); return e ? e.textContent : null; };
  const click = (W, el) => el.dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
  const WITH = 'composeSend,hints,updateHelp,hintHelp';
  const WITHOUT = 'composeSend,hints,updateHelp';
  const n = {};
  try {
    n.networkWithCap = await flow(WITH, OLD5, async (S) => {
      const { d, W } = S;
      const c = hint(d);
      if (!c || c.dataset.tip !== 'network') return 'tip=' + (c && c.dataset.tip);
      const copy = txt(c, '.c-glass-card__title') === 'Decentralized'
        && txt(c, '.c-glass-card__text') === 'Spixi runs on the Ixian network of independent nodes.'
        && !!c.querySelector('.c-glass-card__tipart svg');
      const link = c.querySelector('.c-glass-card__link');
      if (!copy || !link || !/Learn more/.test(link.textContent)) return 'copy/link';
      await K.sleep(STAND + 80);
      S.sent.length = 0;
      click(W, link);
      await K.sleep(60);
      return JSON.stringify(S.sent) === '["ixian:hint:done:network","ixian:hintHelp:network"]' && !hint(d) ? true : JSON.stringify(S.sent);
    });
    n.networkWithoutCap = await flow(WITHOUT, OLD5, async (S) => {
      const { d, W } = S;
      const c = hint(d);
      if (!c || c.dataset.tip !== 'network') return 'tip=' + (c && c.dataset.tip);
      if (c.querySelector('.c-glass-card__link')) return 'a link without the cap';
      if (txt(c, '.c-glass-card__title') !== 'Decentralized') return 'copy';
      S.sent.length = 0;
      click(W, c.querySelector('.c-glass-card__close'));
      await K.sleep(40);
      return JSON.stringify(S.sent) === '["ixian:hint:shown:network","ixian:hint:done:network"]' ? true : JSON.stringify(S.sent);
    });
    n.quantum = await flow(WITH, [...OLD5, 'network'], async (S) => {
      const c = hint(S.d);
      return !!c && c.dataset.tip === 'quantum' && !c.querySelector('.c-glass-card__link')
        && txt(c, '.c-glass-card__title') === 'Ready for quantum computers'
        && txt(c, '.c-glass-card__text') === 'Current Spixi apps use post-quantum encryption.' ? true : 'quantum card';
    });
    n.nophone = await flow(WITH, [...OLD5, 'network', 'quantum'], async (S) => {
      const c = hint(S.d);
      return !!c && c.dataset.tip === 'nophone' && !c.querySelector('.c-glass-card__link')
        && txt(c, '.c-glass-card__title') === 'No phone number'
        && txt(c, '.c-glass-card__text') === 'Your account is a key on your device.'   // ★ S12 A2 (#1267, R2-m4): hintNoPhoneBody2, platform-neutral
        && !/server/i.test(c.textContent) && !!c.querySelector('.c-glass-card__tipart svg') ? true : 'nophone card';
    });
    n.allEightNoCard = await flow(WITH, [...OLD5, 'network', 'quantum', 'nophone'], async (S) => (!hint(S.d) ? true : 'a card'));
    n.backupKeepsLinkWithCap = await flow(WITH, [], async (S) => {
      const { d, W } = S;
      const c = hint(d);
      if (!c || c.dataset.tip !== 'backup' || !c.querySelector('.c-glass-card__link')) return 'backup link';
      await K.sleep(STAND + 80);
      S.sent.length = 0;
      click(W, c.querySelector('.c-glass-card__link'));
      await K.sleep(40);
      return JSON.stringify(S.sent) === '["ixian:hint:done:backup","ixian:backup"]' ? true : JSON.stringify(S.sent);
    });
    n.backupKeepsLinkWithoutCap = await flow(WITHOUT, [], async (S) => {
      const c = hint(S.d);
      return !!c && c.dataset.tip === 'backup' && !!c.querySelector('.c-glass-card__link') ? true : 'backup link (no cap)';
    });
  } catch (e) { n.err = e.message; }
  ok(Object.values(n).every((x) => x === true),
    '★ S12 A (#1267): tip 1 "Decentralized" · "Spixi runs on the Ixian network of independent nodes." — with the hintHelp cap Learn more sends done then the bare ixian:hintHelp:network (no URL); WITHOUT the cap the card has no Learn more (× = shown + done); tip 3 "Ready for quantum computers" and tip 4 "No phone number" · "Your account is a key on your device." have no link; all eight done = no card; backup keeps its in-app Learn more (ixian:backup) with and without the cap — ' + JSON.stringify(n));
}
