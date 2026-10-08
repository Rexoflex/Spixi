/* ==== S11 B (#1262) — THE LAUNCH ART: welcome 1–4 + restore, inline, dark set, one entrance per slide ====
 * On the BUILT intro.html (launch.html → LaunchPage; jsdom):
 *   · the four slides draw welcome1…welcome4 IN ORDER (W1 round 3 · W2 round 1 · W3 round 3 · W4 round 1) and the
 *     restore hero draws restore (round 3) — decorative svgs, no <img>, no images/onboarding path left in the bundle
 *   · the art sits under the launch dark pin (closest [data-theme] = dark) and the BUILT token sheet's dark block
 *     carries the dark --il-* set, so the pinned subtree resolves the dark drawing
 *   · one entrance per slide: the built rule `.c-launch__slide[aria-hidden="true"] .il * { animation-play-state:
 *     paused }` HOLDS an off-screen slide at frame 0 — it matches slide 3's animated parts at rest and stops matching
 *     once a dot click brings slide 3 on screen (the rule read from the built CSS, then applied with Element.matches)
 * Deliberate breaks: see the S11 B report. */
import { b2Kit } from '../pins-s9/b2-kit.mjs';
export default async function (h) {
  const { ok, sleep, root, readFileSync, join, stripCssComments } = h;
  const { boot } = b2Kit(h);
  let s = null;
  try {
    s = await boot('intro.html');
    const { d } = s;
    const deco = (x) => !!x && x.getAttribute('aria-hidden') === 'true' && x.getAttribute('focusable') === 'false' && x.children.length > 1;
    const slides = [...d.querySelectorAll('.c-launch__slide')];
    const arts = slides.map((sl) => sl.querySelector(':scope > svg.c-launch__illo-img'));
    const hero = d.querySelector('.c-launch__hero > svg.c-launch__hero-illo');
    const names = arts.map((a) => a && a.getAttribute('data-illo'));
    const bundle = readFileSync(join(root, 'Spixi/Resources/Raw/html/spixi.bundle.js'), 'utf8');
    const lsCode = h.stripCode(readFileSync(join(root, 'src/components/launch-shell.js'), 'utf8'));
    ok(slides.length === 4 && JSON.stringify(names) === '["welcome1","welcome2","welcome3","welcome4"]' && arts.every(deco)
       && !d.querySelector('.c-launch__carousel img') && deco(hero) && hero.getAttribute('data-illo') === 'restore'
       && !/images\/onboarding\//.test(lsCode) && !/base \+ '[\w-]+\.png'/.test(bundle),
      '★ S11 B (#1262): the welcome carousel draws welcome1–4 in order and the restore hero draws restore — inline, decorative, no <img>, no onboarding PNG path left — ' + JSON.stringify(names));

    const pin = (x) => { const t = x && x.closest('[data-theme]'); return t ? t.dataset.theme : null; };
    const tok = stripCssComments(readFileSync(join(root, 'Spixi/Resources/Raw/html/spixi.tokens.css'), 'utf8'));
    const darkBlocks = [...tok.matchAll(/(?:^|\})\s*\[data-theme="dark"\]\s*\{([^}]*)\}/g)].map((m) => m[1]).join('\n');
    ok([...arts, hero].every((x) => pin(x) === 'dark') && /--il-glow:\s*#6c63ff;/.test(darkBlocks) && /--il-screen:\s*#15171c;/.test(darkBlocks),
      '★ S11 B: the launch art lives under the launch DARK pin and the built dark token block carries the dark --il-* set — the pinned subtree draws the dark set in both app themes');

    const css = stripCssComments(readFileSync(join(root, 'Spixi/Resources/Raw/html/intro.html'), 'utf8'));
    const m = /([^{}]*\.c-launch__slide\[aria-hidden="true"\][^{}]*)\{\s*animation-play-state:\s*paused;\s*\}/.exec(css);
    const sel = m ? m[1].trim() : '';
    const part = arts[2] && arts[2].querySelector('[class*="il-"]');
    const restHeld = !!sel && !!part && part.matches(sel);
    const firstLive = !!sel && !!arts[0].querySelector('[class*="il-"]') && !arts[0].querySelector('[class*="il-"]').matches(sel);
    const dot = d.querySelectorAll('.c-launch__dot')[2];
    if (dot) dot.click();
    await sleep(50);
    const liveAfter = !!sel && !!part && !part.matches(sel);
    ok(restHeld && firstLive && liveAfter,
      '★ S11 B: ONE entrance per slide — the built paused rule holds an off-screen slide at frame 0 and releases it when the slide comes on screen (slide 3 held at rest, slide 1 live, slide 3 live after its dot) — ' + JSON.stringify({ sel, restHeld, firstLive, liveAfter }));
    ok(s.errs.length === 0, '★ S11 B: the launch shell raised no page error — ' + JSON.stringify(s.errs.slice(0, 3)));
  } catch (e) {
    ok(false, '★ S11 B b-launch threw: ' + e.message);
  } finally { if (s) { try { s.dom.window.close(); } catch (_) {} s = null; } }
}
