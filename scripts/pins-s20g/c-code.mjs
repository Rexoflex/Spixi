/* ==== S20G F-5 (a) (b) + Q-4 (#1413 ①): THE CODE LOOK, QUIETER ON THE SENT BUBBLE · THE BLOCK WRAPS · THE CHIP WRAP SPACE ====
 * On the BUILT chat.html (jsdom; the r-cascade winner per element) — a received and a sent row, each with a chip and a ``` block:
 *   (1) HERO RULE — --outline-on-hero is rgba(255, 255, 255, 0.30) in both themes (was 0.45), and the ONLY rules in the built
 *       sheets that read it are the code chip / block ones (.c-fmt-code / .c-fmt-pre) — the alpha change touches nothing else;
 *       the sent chip + block still take it as their --fmt-rule.
 *   (2) BLOCK WRAPS — on both sides the ``` block computes white-space: pre-wrap + overflow-wrap: anywhere, and NO
 *       overflow-x / overscroll-behavior-x / scrollbar-width winner is left (the sideways scroll is gone, not hidden); the
 *       3 px start rule, the 8 / 12 padding, the 8 margin and radius 8 stay.
 *   (3) CHIP — on both sides the inline chip computes white-space: break-spaces (a wrap space stays inside the line, so the
 *       cloned outline no longer hangs past the bubble), keeps box-decoration-break: clone, padding 1px 6px, overflow-wrap anywhere.
 *   Layout is not measurable in jsdom: the Chromium sweep (390 px, dpr 2.6, 224 bubbles, both themes) is in the S20G B1 report —
 *   the chip's worst fragment end vs the bubble edge +2.75 → −5.17 px, the block scrollWidth = clientWidth.
 * Deliberate breaks (S20G B1 report): tokens.css --outline-on-hero back to 0.45 → HERO · `.c-fmt-pre { white-space: pre }` →
 * BLOCK · `overflow-x: auto` put back on .c-fmt-pre → BLOCK · the chip's `white-space: break-spaces` deleted → CHIP. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
import { cascade } from '../pins-s19/r-cascade.mjs';
export default async function (h) {
  const { ok, readFileSync, join, root, stripCssComments } = h;
  const K = b1Kit(h);
  const r = {};
  const got = {};
  let s = null;
  try {
    s = await K.open({ rows: false, hist: (x) => {
      x.push('addThem', 'g1', 'addrPeer', 'Ana', '', 'run `npm install --save x` now\n```\nnode scripts/build-shells.mjs --check --root /home/claude/b-chat all\n```', String(K.T0), 'True', 'True', 'True', 'False', 'False');
      x.push('addMe', 'g2', 'addrMe', 'Me', '', 'run `npm install --save x` now\n```\nnode scripts/build-shells.mjs --check\n```', String(K.T0 + 60), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '');
    } });
    const { W, d } = s;
    const C = cascade(W);
    const de = d.documentElement;
    /* (1) */
    de.setAttribute('data-theme', 'light'); const hl = C.win(de, '--outline-on-hero');
    de.setAttribute('data-theme', 'dark'); const hd = C.win(de, '--outline-on-hero');
    de.setAttribute('data-theme', 'light');
    const readers = C.rules.filter(({ r: ru }) => /var\(--outline-on-hero\)/.test(ru.style.cssText)).map(({ r: ru }) => ru.selectorText);
    const sel = [];
    for (const t of readers) for (const one of t.split(',')) sel.push(one.trim());
    const rows = ['g1', 'g2'].map((id) => K.rowOf(d, id));
    const chips = rows.map((rw) => rw && rw.querySelector('code.c-fmt-code'));
    const pres = rows.map((rw) => rw && rw.querySelector('pre.c-fmt-pre'));
    got.hero = { hl, hd, readers: sel, sentRule: chips[1] && [C.win(chips[1], '--fmt-rule'), C.win(pres[1], '--fmt-rule')] };
    const a30 = (v) => /^rgba\(255, ?255, ?255, ?0?\.30?\)$/.test(v || '');
    r.hero = a30(hl) && (a30(hd) || hd === hl) && sel.length >= 1 && sel.every((x) => /\.c-fmt-(code|pre)$/.test(x))
      && !!got.hero.sentRule && got.hero.sentRule.every((v) => v === 'var(--outline-on-hero)');
    /* (2) */
    const css = stripCssComments(readFileSync(join(root, 'Spixi/Resources/Raw/html/chat.html'), 'utf8'));
    const preRules = [...css.matchAll(/(^|\})\s*\.c-fmt-pre\s*\{([^}]*)\}/g)].map((m) => m[2]);
    const startRule = preRules.some((b) => /border-inline-start:\s*3px solid var\(--fmt-rule\)/.test(b));
    got.block = pres.map((p) => p && { ws: C.win(p, 'white-space'), ow: C.win(p, 'overflow-wrap'), ox: C.win(p, 'overflow-x'), o: C.win(p, 'overflow'), osb: C.win(p, 'overscroll-behavior-x'), sbw: C.win(p, 'scrollbar-width'),
      pad: C.win(p, 'padding'), margin: C.win(p, 'margin'), radius: C.win(p, 'border-radius') });
    r.block = startRule && got.block.every((b) => !!b && b.ws === 'pre-wrap' && b.ow === 'anywhere' && !b.ox && !b.o && !b.osb && !b.sbw
      && b.pad === 'var(--spacing-8) var(--spacing-12)' && b.margin === 'var(--spacing-8) 0' && b.radius === 'var(--radius-8)');
    /* (3) */
    got.chip = chips.map((c) => c && { ws: C.win(c, 'white-space'), bdb: C.win(c, 'box-decoration-break'), pad: C.win(c, 'padding'), ow: C.win(c, 'overflow-wrap') });
    r.chip = got.chip.every((c) => !!c && c.ws === 'break-spaces' && c.bdb === 'clone' && c.pad === '1px 6px' && c.ow === 'anywhere');
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
  finally { if (s) s.W.close(); }
  ok(Object.values(r).every((v) => v === true),
    '★ S20G F-5 + Q-4 (#1413 ①): the sent code rule --outline-on-hero is white at 0.30 (was 0.45) and only the code chip / block read it; the ``` block WRAPS on both sides (pre-wrap + overflow-wrap anywhere, no sideways scroll left) with its 3 px start rule, padding, margin and radius kept; the chip wraps with white-space: break-spaces (box-decoration-break clone, 1px 6px kept) — '
    + JSON.stringify({ r, got }));
}
