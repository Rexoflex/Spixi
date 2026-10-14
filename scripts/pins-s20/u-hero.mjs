/* ==== S20 U — the wallet HERO: action circles + the one colour token (J2 tweak 4 + the hero dial, DECISIONS #1440) ====
 * WHAT: on the BUILT index.html (jsdom, declared cascade — no layout) the three hero action circles (Send · Receive ·
 * Scan) carry a solid wash fill (--surface-wash-on-hero) and NO border, and all three resolve the SAME background,
 * border and colour (#135: no special Send). Hover steps to the -pressed wash, the press to the new -strong wash. The
 * hero background reads ONE token, --gradient-wallet-hero, and the shipped value of that token is today's
 * `var(--gradient-hero-overlay), var(--surface-hero)` (the navy candidate is a dial on the render, not shipped).
 * DELIBERATE BREAKS (each run once, the pin failed for exactly that reason, then restored — see the S20 U report):
 *   ① wallet-hero.css: put back `border: var(--outline-width-1) solid var(--text-on-hero-muted);` on __qacircle.
 *   ② wallet-hero.css: a Send-only fill `.c-wallet-hero__qa:first-child .c-wallet-hero__qacircle { background: var(--surface-wash-on-hero-pressed); }`.
 *   ③ wallet-hero.css: the hero `background:` back to `var(--gradient-hero-overlay), var(--surface-hero)` (two tokens). */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep, root, readFileSync, join, stripCssComments } = h;
  const K = aKit(h);
  let s = null;
  try {
    s = await K.boot('index.html');
    s.push('selectTab', 'tab2');
    await sleep(100);
    const W = s.W;
    const hero = s.d.querySelector('#wallet-hero .c-wallet-hero');
    const circles = [...s.d.querySelectorAll('#wallet-hero .c-wallet-hero__qacircle')];
    /* jsdom does not expand a shorthand that holds var() — read every matching rule's own declarations, in order */
    const rules = (el, extra = '') => {
      const out = [];
      for (const sh of s.d.styleSheets) {
        let rs = []; try { rs = sh.cssRules; } catch (e) {}
        const walk = (list, media) => { for (const r of list) {
          if (r.cssRules && !r.selectorText) { walk(r.cssRules, r.conditionText || (r.media && r.media.mediaText) || ''); continue; }
          if (!r.selectorText) continue;
          for (const sel of r.selectorText.split(',')) {
            const raw = sel.trim();
            const base = raw.replace(/:hover|:active/g, '');
            let hit = false; try { hit = el.matches(base); } catch (e) {}
            if (hit && (extra ? raw.includes(extra) : !/:hover|:active/.test(raw))) out.push(r.style.cssText);
          }
        } };
        walk(rs, '');
      }
      return out.join(' ');
    };
    const sig = (el) => rules(el).replace(/\s+/g, ' ');
    const r1 = {
      n: circles.length,
      fill: circles.length === 3 && circles.every((c) => /background: var\(--surface-wash-on-hero\);/.test(rules(c))),
      noBorder: circles.length === 3 && circles.every((c) => !/(^|[;\s])border(-(top|right|bottom|left|width|style|color|block|inline)[a-z-]*)?:/.test(rules(c))),
      identical: circles.length === 3 && new Set(circles.map(sig)).size === 1,
      hover: circles.length === 3 && /var\(--surface-wash-on-hero-pressed\)/.test(rules(circles[0], ':hover')),
      press: circles.length === 3 && /var\(--surface-wash-on-hero-strong\)/.test(rules(circles[0], ':active')),
    };
    ok(r1.n === 3 && r1.fill && r1.noBorder && r1.identical && r1.hover && r1.press,
      '★ S20 J2 (#1440): the three hero action circles wear a solid wash fill and NO border, all three identical (#135); hover → the -pressed wash, press → the -strong wash — ' + JSON.stringify(r1));
    const tok = stripCssComments(readFileSync(join(root, 'src/styles/tokens.css'), 'utf8'));
    const defs = tok.match(/--gradient-wallet-hero:\s*([^;]+);/g) || [];
    const r2 = {
      heroReadsOne: !!hero && /^background: var\(--gradient-wallet-hero\);$/.test(rules(hero).match(/background: [^;]+;/) ? rules(hero).match(/background: [^;]+;/)[0] : ''),
      oneDef: defs.length === 1,
      today: defs.length === 1 && /--gradient-wallet-hero:\s*var\(--gradient-hero-overlay\),\s*var\(--surface-hero\);/.test(defs[0]),
      strong: /--surface-wash-on-hero-strong:\s*rgba\(255, 255, 255, 0\.24\);/.test(tok),
    };
    ok(Object.values(r2).every(Boolean),
      '★ S20 J2 (#1440): the hero background reads ONE token (--gradient-wallet-hero), defined once, shipped as TODAY\'s overlay over --surface-hero (the navy is a render dial) — ' + JSON.stringify(r2));
    ok(K.noErr(s.errs), '★ S20 J2 (#1440): the hero pass raised no page error — ' + JSON.stringify(s.errs));
  } finally {
    if (s) s.close();
  }
}
