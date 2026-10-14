/* ==== S20F W-4 (#1426) — the welcome side fade ONLY while the track moves ====
 * On the BUILT intro.html (jsdom, phone UA):
 *   (1) at rest the carousel carries no data-moving; a dot tap (the track's transform changes) sets it; the track's
 *       own transitionend clears it; a transition that never ends is cleared by the belt (≤ 650 ms); a transitionend
 *       bubbling from a child does not clear it. Under prefers-reduced-motion a page turn never sets it.
 *   (2) the built CSS: the 24 px mask (both -webkit-mask-image and mask-image, "transparent, #000 24px, #000
 *       calc(100% - 24px), transparent") applies to the carousel WHILE moving and no mask rule matches it at rest.
 *       jsdom's CSSOM drops mask-image, so the rules are read from the BUILT file and applied with Element.matches
 *       (the pins-s11/b-launch grammar).
 * Deliberate breaks (S20F report): ① go() without the data-moving set → (1) fails; ② the transitionend clear removed
 *   → (1) clearedOnEnd fails; ③ the rule's selector without [data-moving] → (2) noneAtRest fails; ④ the -webkit- line
 *   removed → (2) fails. */
import { on1Kit } from '../pins-on1/kit.mjs';
export default async function (h) {
  const { ok, sleep, root, readFileSync, join, stripCssComments } = h;
  const { boot } = on1Kit(h);
  let s = null, r = null;
  try {
    s = await boot({ ua: 'phone' });
    const { d, W } = s;
    const car = d.querySelector('.c-launch__carousel');
    const track = d.querySelector('.c-launch__track');
    const dots = [...d.querySelectorAll('.c-launch__dot')];
    const mv = () => car.hasAttribute('data-moving');
    const r1 = { rest: !mv() };
    dots[1].click();
    r1.setOnTurn = mv();
    track.firstElementChild.dispatchEvent(new W.Event('transitionend', { bubbles: true }));
    r1.childEndIgnored = mv();
    track.dispatchEvent(new W.Event('transitionend', { bubbles: true }));
    r1.clearedOnEnd = !mv();
    dots[2].click();
    const set2 = mv();
    await sleep(650);
    r1.belt = set2 && !mv();
    dots[2].click();
    r1.sameSlideNoMove = !mv();
    r = await boot({ ua: 'phone', reduce: true });
    r.d.querySelectorAll('.c-launch__dot')[1].click();
    r1.reducedNever = !r.d.querySelector('.c-launch__carousel').hasAttribute('data-moving');
    r.close(); r = null;
    ok(Object.values(r1).every(Boolean),
      '★ S20F W-4 (#1426): the carousel is marked moving only while a page turn runs — set on the transform change, cleared on the track\'s transitionend or by the belt, never under reduced motion — ' + JSON.stringify(r1));

    /* (2) the built mask rules */
    const css = stripCssComments(readFileSync(join(root, 'Spixi/Resources/Raw/html/intro.html'), 'utf8'));
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*mask-image[^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }));
    const matches = (sel) => sel.split(',').some((x) => { try { return car.matches(x.trim()); } catch (e) { return false; } });
    const STOPS = /linear-gradient\(\s*to right,\s*transparent,\s*#000 24px,\s*#000 calc\(100% - 24px\),\s*transparent\s*\)/;
    car.setAttribute('data-moving', '');
    const onMove = rules.filter((x) => matches(x.sel));
    car.removeAttribute('data-moving');
    const atRest = rules.filter((x) => matches(x.sel));
    const r2 = {
      both: onMove.some((x) => /-webkit-mask-image:\s*[^;]*/.test(x.body) && STOPS.test(/-webkit-mask-image:\s*([^;]*)/.exec(x.body)[1])
        && /(^|[;\s])mask-image:\s*[^;]*/.test(x.body) && STOPS.test(/(?:^|[;\s])mask-image:\s*([^;]*)/.exec(x.body)[1])),
      noneAtRest: atRest.length === 0,
    };
    ok(r2.both && r2.noneAtRest,
      '★ S20F W-4 (#1426): the built 24 px side fade (-webkit-mask-image + mask-image) paints on the carousel while it moves, and no mask rule reaches it at rest — ' + JSON.stringify({ r2, onMove: onMove.map((x) => x.sel), atRest: atRest.map((x) => x.sel) }));
    ok(s.errs.length === 0, '★ S20F W-4: no page error — ' + JSON.stringify(s.errs.slice(0, 3)));
  } catch (e) {
    ok(false, '★ S20F W-4 l-fade threw: ' + (e && e.stack || e));
  } finally { if (s) s.close(); if (r) r.close(); }
}
