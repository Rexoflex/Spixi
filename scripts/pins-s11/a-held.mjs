/* ==== ★ S11 A2 (#1263, R2-m2) — ONE ENTRANCE PER ELEMENT LIFETIME, on the BUILT home shell ====
 * A tab switch (display:none → shown) or a re-parent restarts every CSS animation, so the glass cards and the inline art
 * replayed their entrance. Now:
 *   · glass card: the card's OWN animationend (not a child's) sets [data-held]; a card whose entrance never runs is held
 *     by the 2.5 s backstop; held survives the #403 move between the tab slots; the built CSS drops the animation there;
 *   · illustration: [data-held] only once EVERY animated piece has ended (a piece that never ended — a cancelled run —
 *     keeps it un-held), or 12 s after the first animationstart; the built CSS pins every piece to its END frame
 *     (animation-delay -60s with the `both` fill — not animation:none); the ground shadow's token rides CSS.
 * jsdom runs no CSS animation: the events are dispatched by hand, the timers run at a-kit timeScale 20.
 * Deliberate breaks: see the S11 A2 report. */
import { aKit } from './a-kit.mjs';
export default async function (h) {
  const { ok, root, readFileSync, join, stripCssComments } = h;
  const K = aKit(h);
  let s = null;
  const r = {};
  try {
    s = await K.boot('index.html', { timeScale: 20 });
    const { d, W } = s;
    const ev = (el, type, target) => { const e = new W.Event(type, { bubbles: true }); (target || el).dispatchEvent(e); };
    s.push('setCaps', 'composeSend,hints,updateHelp');
    s.push('showWarning', 'New version of Spixi (0.9.31) is available. Please update for best experience.');
    await K.sleep(40);
    const card = d.querySelector('.c-glass-card[data-variant="update"]');
    r.freshNotHeld = !!card && !card.hasAttribute('data-held');
    ev(card, 'animationend', card.querySelector('.c-glass-card__title'));   // a CHILD's end is not the card's entrance
    r.childEndIgnored = !card.hasAttribute('data-held');
    ev(card, 'animationend');
    r.ownEndHolds = card.hasAttribute('data-held');
    d.querySelector('.c-bottomnav__item[data-id="wallet"]').dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
    await K.sleep(60);
    r.heldSurvivesTheMove = card.parentNode === d.getElementById('wallet-banner') && card.hasAttribute('data-held');
    /* the backstop: a card whose entrance never runs */
    const c2 = W.Spixi.createGlassCard({ title: 'x', text: 'y' });
    d.body.append(c2);
    await K.sleep(2500 / 20 + 60);
    r.backstopHolds = c2.hasAttribute('data-held') && W.Spixi.GLASS_HOLD_MS === 2500;
    c2.remove();

    /* the inline art */
    const svg = W.Spixi.illoBackup({ className: 'x' });
    d.body.append(svg);
    const pieces = [...svg.querySelectorAll('[class]')].filter((n) => String(n.getAttribute('class')).split(/\s+/).some((c) => /^(il|rn)-/.test(c) && !/^(il-ground|rn-illo|rn-once)$/.test(c)));
    r.hasPieces = pieces.length >= 5;
    pieces.slice(0, -1).forEach((p) => ev(svg, 'animationend', p));
    ev(svg, 'animationend', pieces[0]);                                        // the same piece twice is still one
    r.notHeldWhileOneRuns = !svg.hasAttribute('data-held');
    ev(svg, 'animationend', pieces[pieces.length - 1]);
    r.heldWhenAllEnded = svg.hasAttribute('data-held');
    const rn = W.Spixi.illoRating();
    d.body.append(rn);
    const rp = [...rn.querySelectorAll('[class]')].find((n) => /\brn-rise\b/.test(n.getAttribute('class')));
    ev(rn, 'animationstart', rp);
    await K.sleep(12000 / 20 - 200);
    r.backstopWaits = !rn.hasAttribute('data-held');
    await K.sleep(300);
    r.illoBackstopHolds = rn.hasAttribute('data-held') && W.Spixi.IL_HOLD_BACKSTOP_MS === 12000;
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = e.message; }
  finally { if (s) { s.close(); s = null; } }
  const html = stripCssComments(readFileSync(join(root, 'Spixi/Resources/Raw/html/index.html'), 'utf8'));
  r.cardCss = /\.c-glass-card\[data-held\] \{ animation: none; \}/.test(html);
  r.illoCss = /\.il\[data-held\] \*, \.rn-illo\[data-held\] \* \{ animation-delay: -60s !important; \}/.test(html)
    && !/\.il\[data-held\][^{]*\{[^}]*animation: none/.test(html);
  r.groundCss = /\.il-ground \{ opacity: var\(--il-ground-a\); \}/.test(html);
  ok(Object.values(r).every((x) => x === true),
    '★ S11 A2 (#1263, R2-m2): one entrance per lifetime — the glass card holds on ITS OWN animationend (a child\'s is ignored) or the 2.5 s backstop, and stays held through the #403 move; the inline art holds only when EVERY animated piece ended (or 12 s after the first start); the built CSS drops the card\'s animation when held and pins the art\'s pieces to their END frame (delay -60s, not animation:none); the ground shadow token rides CSS — ' + JSON.stringify(r));
}
