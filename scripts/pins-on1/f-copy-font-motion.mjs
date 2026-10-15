/* ==== ON-1 F (Part D · #1421 (4) · the reduced-motion rule) — slide 3, Sora latin-ext, the short fade ====
 * On the BUILT shells (jsdom):
 *   (1) Part D: the welcome slide 3 (English) says IXI and never "money", and promises no "instant" — the
 *       built intro.html as painted, and the en-us dictionary it reads. ★ S20F W-5 re-base (#1425): slide 3 keeps
 *       its place and its wallet art (welcome3) in the new order, and NO slide says "money" (the new copy included);
 *       the order itself is pinned by pins-s20f/l-slides.mjs.
 *   (2) Sora latin-ext reaches the LAUNCH shell only: intro.html carries a second 'Sora' @font-face (a woff2
 *       data: URI) whose unicode-range covers č š ž ć đ Đ ė ą į ų ū — "Ana Kovač · Gabija Kazlauskaitė · Đorđe" —
 *       and no other built shell carries that face (settings / index / chat).
 *   (3) reduced motion is a SHORT FADE, not nothing: the welcome → create slide layer and the step 1 → 2 pane
 *       animate opacity only (c-launch-fade-in, ≤ 200 ms) under prefers-reduced-motion on the phone; with motion
 *       on they slide (the subscreen keyframes / c-launch-step-fwd).
 *   (4) ★ #46 r2: the art flexes, the text does not; the art floor; the short-screen logo.
 *   (5) ★ #46 r3: the version line's room is reserved before setVersion. (6) ★ r3: one art size per carousel.
 *   (7) ★ #46 r4 → r5: the logo is part of the room; the ladder is monotonic in the window height (swept).
 * Deliberate breaks (S20 T report): ① slide3Title back to "Send money like you send a message." → (1) fails;
 *   ② launch-font.css linked from settings.html too → (2) fails; ③ the reduced-motion rule removed from
 *   launch-form.css → (3) fails (the layer gets animation: none); ④ (#46 r2) the slide copy `flex: none` removed →
 *   (4) copyFixed fails; ⑤ the art back to `width: min(58vw, 232px); height: auto` with no flex → (4) fails; ⑥ (#46 r3) `version.hidden = true`
 *   back in buildWelcome → (5) fails; ⑦ fitArt deciding per slide again → (6) fails;
 *   ⑧ (#46 r5) the r4 ladder restored (L1 whenever the art does
 *   not fit at L0; L2 only when the text does not fit at L1, art decided at the final level) → (7) l1OnlyWithArt /
 *   allFour fail (the reviewer's Chromium sweep showed its non-monotonic art); ⑨ art allowed at L2 → (7) monotonic / l2NoArt fail; ⑩ the fitKey skip removed →
 *   (7) unchangedNoWrites fails; ⑫ (#46 r6) the room key without the carousel box (the r5 key: the welcome box)
 *   → (7) insetRefits fails; ⑪ the data-compact logo rule removed → (7) cssLogo fails. */
import { on1Kit } from './kit.mjs';
export default async function (h) {
  const { ok, sleep, root, readFileSync, join } = h;
  const { boot, cascade } = on1Kit(h);
  let s = null;
  try {
    s = await boot({ ua: 'phone' });
    const { d, W } = s;
    /* (1) slide 3 */
    const slide3 = d.querySelectorAll('.c-launch__slide')[2];
    const t3 = slide3 ? slide3.textContent : '';
    const en = JSON.parse(readFileSync(join(root, 'src/strings/en-us.json'), 'utf8'));
    const welcomeText = [...d.querySelectorAll('.c-launch__slide')].map((x) => x.textContent).join(' ');
    const art3 = slide3 && slide3.querySelector('.c-launch__illo-img');
    ok(/\bIXI\b/.test(t3) && !/money/i.test(t3) && !/instant/i.test(t3) && !/money/i.test(welcomeText) && !!art3 && art3.getAttribute('data-illo') === 'welcome3'
       && en.slide3Title === 'Send IXI like a message.' && !/money|instant/i.test(en.slide3Title + ' ' + en.slide3Copy),
      '★ ON-1 F (Part D): welcome slide 3 says IXI and never "money", promises no "instant" (painted + en-us) — ' + JSON.stringify(t3));

    /* (2) the font face */
    /* jsdom's CSSOM keeps the two Sora faces but drops the src / unicode-range descriptors, so the descriptors are
       read from the BUILT file's own @font-face blocks (what ships) and the face count from the DOM */
    let soraFaces = 0;
    for (const sh of d.styleSheets) { try { for (const r of sh.cssRules) if (r.type === 5 && /Sora/.test(r.cssText)) soraFaces++; } catch (e) {} }
    const builtText = h.stripCssComments(readFileSync(join(root, 'Spixi/Resources/Raw/html/intro.html'), 'utf8'));
    const faces = builtText.match(/@font-face\s*\{[^}]*\}/g) || [];
    const ext = faces.find((f) => /Sora/.test(f) && /unicode-range/i.test(f));
    const covers = (cp) => !!ext && [...ext.matchAll(/U\+([0-9A-F]+)(?:-([0-9A-F]+))?/gi)].some((m) => { const a = parseInt(m[1], 16), b = parseInt(m[2] || m[1], 16); return cp >= a && cp <= b; });
    const sample = 'Ana Kovač · Gabija Kazlauskaitė · Đorđe ščćžąįųū';
    const need = [...new Set([...sample].filter((ch) => ch.codePointAt(0) > 0xff && ch !== '·'))];
    const others = ['settings.html', 'index.html', 'chat.html'].filter((f) => /U\+0100-02BA/i.test(readFileSync(join(root, 'Spixi/Resources/Raw/html', f), 'utf8')));
    const built = readFileSync(join(root, 'Spixi/Resources/Raw/html/intro.html'), 'utf8');
    ok(soraFaces === 2 && !!ext && /data:font\/woff2;base64,/.test(ext) && need.every((ch) => covers(ch.codePointAt(0))) && /U\+0100-02BA/i.test(built) && others.length === 0,
      '★ ON-1 F (#1421 (4)): intro.html carries the Sora latin-ext face (woff2, inlined) covering ' + need.join(' ') + ' — and no other shell carries it — ' + JSON.stringify({ others }));

    /* (3) reduced motion = a short fade */
    const layer = d.createElement('div');
    layer.className = 'c-launch__view c-launch__form c-subslide c-subslide--host c-subslide--in';
    s.shell.append(layer);
    const anim = (el, reduce) => (cascade(W, el, 'animation', { reduce }) || '').replace(/\s+/g, ' ');
    const short = (a) => /c-launch-fade-in/.test(a) && (+((/(\d+)ms/.exec(a) || [])[1]) <= 200);
    const pane = d.querySelector('[data-launch-view="create"] .c-launch__step[data-step="2"]');
    pane.dataset.enter = 'fwd';
    const r3 = {
      slideReduced: anim(layer, true), slideNormal: anim(layer, false),
      stepReduced: anim(pane, true), stepNormal: anim(pane, false),
    };
    delete pane.dataset.enter; layer.remove();
    ok(short(r3.slideReduced) && /c-subslide-in/.test(r3.slideNormal) && short(r3.stepReduced) && /c-launch-step-fwd/.test(r3.stepNormal),
      '★ ON-1 F (reduced motion): the welcome → create slide and the step 1 → 2 switch become a SHORT FADE under prefers-reduced-motion (they slide otherwise) — ' + JSON.stringify(r3));
    /* (4) ★ #46 r2 (M2, Damir 22:4x: the slide ART shrinks on short screens; the text never clips): in the built
       sheets the welcome art is the flexible item (flex-shrink > 0, min-height 0, the square aspect kept), the slide
       title + copy never shrink (flex-shrink 0), a slide below the art floor drops the art (data-art-off →
       display none), and a short screen (≤ 640 px tall) hides the logo. The full measure (0 px of text under the
       carousel clip, 14 locales × 390 / 360 / 320) is a Chromium run — S20 T #46 r2 report. */
    const slide = d.querySelector('.c-launch__slide');
    const art = slide.querySelector('.c-launch__illo-img');
    const fs = (el, p, o = {}) => cascade(W, el, p, o) || '';
    const shrink = (el) => { const v = fs(el, 'flex-shrink') || (/^\S+\s+(\S+)/.exec(fs(el, 'flex')) || [])[1] || (fs(el, 'flex') === 'none' ? '0' : ''); return parseFloat(v); };
    const r4 = {
      artShrinks: shrink(art) > 0 && fs(art, 'min-height') === '0px' || (shrink(art) > 0 && fs(art, 'min-height') === '0'),
      artSquare: /1\s*\/\s*1/.test(fs(art, 'aspect-ratio')) && fs(art, 'width') === 'auto',
      titleFixed: shrink(slide.querySelector('.c-launch__slide-title')) === 0,
      copyFixed: shrink(slide.querySelector('.c-launch__slide-copy')) === 0,
    };
    slide.setAttribute('data-art-off', '');
    r4.artOffHidden = fs(art, 'display') === 'none';
    slide.removeAttribute('data-art-off');
    r4.artOnShown = fs(art, 'display') !== 'none';
    /* ★ r4: the short-screen logo rule is no longer a height query — it is MEASURED (data-compact, clause (7)) */
    ok(Object.values(r4).every(Boolean),
      '★ ON-1 F (#46 r2, M2): the welcome ART is the flexible part — it shrinks whole (flex-shrink > 0, min-height 0, square), the title + copy never shrink, a slide under the art floor drops the art — ' + JSON.stringify({ r4, artFlex: fs(art, 'flex'), artMin: fs(art, 'min-height') }));
    /* (5) ★ #46 r3 (MINOR-A): the version line's room is reserved from the first paint — the box is never [hidden],
       its min-height holds padding + one line; setVersion fills it in place.
       ★ S20G F-3 re-base: the line is never empty now — "Open source" alone before setVersion (announced, not
       aria-hidden), "<version> · Open source" after (pins-s20g/l-version.mjs pins the format) */
    const ver = d.querySelector('.c-launch__version');
    const minH = fs(ver, 'min-height');
    const r5 = { neverHidden: !ver.hidden, reserved: /calc\(\s*8px\s*\+\s*16px\s*\)|^24px$/.test(minH.replace(/\s+/g, ' ')) || minH === 'calc(8px + 16px)', ossBefore: ver.textContent === 'Open source' && !ver.hasAttribute('aria-hidden') };
    s.push('setVersion', '0.9.20 (build 2601)'); await sleep(30);
    r5.filled = ver.textContent === '0.9.20 (build 2601) · Open source' && !ver.hidden && !ver.hasAttribute('aria-hidden');
    ok(Object.values(r5).every(Boolean),
      '★ ON-1 F (#46 r3, MINOR-A): the version line keeps a reserved box from the first paint (never hidden, min-height = padding + a line, ★ S20G F-3: "Open source" before setVersion) — setVersion fills it without moving the carousel — ' + JSON.stringify({ r5, minH }));

    /* (6) ★ #46 r3 (MINOR-B): ONE art size per carousel — the smallest slide room; under the floor every slide drops
       its art. Layout is stubbed (jsdom has none): four slides of one height, the text of slide 3 taller. */
    const slidesEl = [...d.querySelectorAll('.c-launch__slide')];
    const car = d.querySelector('.c-launch__carousel');
    const stubLayout = (textH) => slidesEl.forEach((sl, i) => {
      Object.defineProperty(sl, 'clientWidth', { configurable: true, get: () => 300 });   // ★ r4: a laid-out slide has a width
      Object.defineProperty(sl, 'clientHeight', { configurable: true, get: () => 300 });
      sl.querySelector('.c-launch__slide-title').getBoundingClientRect = () => ({ height: 40, top: 0, bottom: 40, left: 0, right: 10, width: 10 });
      sl.querySelector('.c-launch__slide-copy').getBoundingClientRect = () => ({ height: textH[i], top: 0, bottom: textH[i], left: 0, right: 10, width: 10 });
    });
    const refit = async () => { s.push('setLaunchView', 'retry'); await sleep(40); s.push('setLaunchView', 'welcome'); await sleep(450); };
    stubLayout([60, 60, 150, 80]);                                   // rooms ≈ 200 / 200 / 110 / 180 (minus the gaps)
    await refit();
    const room1 = parseFloat(car.style.getPropertyValue('--launch-art-room'));
    const r6 = { oneSize: room1 > 72 && room1 <= 110 && slidesEl.every((sl) => !sl.hasAttribute('data-art-off')) };
    stubLayout([60, 60, 230, 80]);                                   // slide 3 leaves ≈ 30 px: under the floor
    await refit();
    r6.allOff = slidesEl.every((sl) => sl.hasAttribute('data-art-off')) && !car.style.getPropertyValue('--launch-art-room');
    r6.cssUsesRoom = /var\(--launch-art-room/.test(W.getComputedStyle(slidesEl[0].querySelector('.c-launch__illo-img')).getPropertyValue('max-height'));   // the declared cap (jsdom keeps var() unresolved)
    ok(Object.values(r6).every(Boolean),
      '★ ON-1 F (#46 r3, MINOR-B): ONE art size for the whole carousel — the smallest slide room (--launch-art-room ' + room1 + ' px caps every slide\'s art); when that room is under the 72 px floor EVERY slide drops its art — ' + JSON.stringify(r6));
    /* (7) ★ #46 r4 → r5 (M1): the LOGO is part of the room, and the ladder is MONOTONIC in the window height.
       Layout stubbed: a "window height" H gives each compact level its slide height (L0 = H − 300, L1 = H − 240,
       L2 = H − 200; title 40 + copy 60, the art floor 72). Swept from tall to short through the shell's own fit
       (launchWelcomeFit), the state only moves DOWN the order {art + logo} > {art} > {logo} > {} — L1 only while
       it keeps the art, L0 without art while the text fits with the logo, L2 never with art — and all four
       states occur. A fit whose inputs did not move writes nothing. The built CSS: data-compact hides the logo;
       level 2 = 44 px buttons. */
    const wv = d.querySelector('.c-launch__welcome');
    let H = 600, INSET = 0;   // ★ r6: INSET = a safe-area padding pushed later (C#'s chrome pass) — it moves the room, not the welcome box
    Object.defineProperty(wv, 'clientWidth', { configurable: true, get: () => 360 });
    Object.defineProperty(wv, 'clientHeight', { configurable: true, get: () => H });
    const OFF = [300, 240, 200];
    slidesEl.forEach((sl) => {
      Object.defineProperty(sl, 'clientWidth', { configurable: true, get: () => 300 });
      Object.defineProperty(sl, 'clientHeight', { configurable: true, get: () => Math.max(0, H - INSET - OFF[+(wv.dataset.compact || 0)]) });
      sl.querySelector('.c-launch__slide-title').getBoundingClientRect = () => ({ height: 40, top: 0, bottom: 40, left: 0, right: 10, width: 10 });
      sl.querySelector('.c-launch__slide-copy').getBoundingClientRect = () => ({ height: 60, top: 0, bottom: 60, left: 0, right: 10, width: 10 });
    });
    Object.defineProperty(car, 'clientWidth', { configurable: true, get: () => 300 });
    Object.defineProperty(car, 'clientHeight', { configurable: true, get: () => Math.max(0, H - INSET - OFF[+(wv.dataset.compact || 0)]) });
    const rank = () => { const art = slidesEl.every((sl) => !sl.hasAttribute('data-art-off')); const logo = !wv.dataset.compact; return art && logo ? 3 : art ? 2 : logo ? 1 : 0; };
    const seq = [];
    for (H = 600; H >= 250; H -= 4) { W.Spixi.launchWelcomeFit(s.shell); seq.push([H, rank(), wv.dataset.compact || '0']); }
    const r7 = {};
    r7.monotonic = seq.every((x, i) => i === 0 || x[1] <= seq[i - 1][1]);
    r7.allFour = [3, 2, 1, 0].every((k) => seq.some((x) => x[1] === k));
    r7.l1OnlyWithArt = seq.every((x) => x[2] !== '1' || x[1] === 2);
    r7.l2NoArt = seq.every((x) => x[2] !== '2' || x[1] === 0);
    H = seq[seq.length - 1][0];                      // the last fitted height: nothing moved since
    let writes = 0;
    const recs = [];
    const mo = new W.MutationObserver((ms) => { writes += ms.length; for (const x of ms) recs.push(x.attributeName + '@' + x.target.className); });
    mo.observe(wv, { subtree: true, attributes: true, attributeFilter: ['data-compact', 'data-art-off'] });
    mo.observe(car, { attributes: true, attributeFilter: ['style'] });   // the art-room cap (the track's own transform is the autoplay, not the fit)
    W.Spixi.launchWelcomeFit(s.shell); W.Spixi.launchWelcomeFit(s.shell);
    await sleep(10);
    mo.disconnect();
    r7.unchangedNoWrites = writes === 0;
    /* ★ #46 r6 (MAJOR): an INSET push after the fit (the welcome box unchanged, the carousel room smaller) re-fits:
       H 480 → L0 + art (room 80); the same H with a 40 px inset → L1 + art (L0 room 40, L1 room 100) */
    H = 480; INSET = 0; W.Spixi.launchWelcomeFit(s.shell);
    const preInset = [wv.dataset.compact || '0', rank()];
    INSET = 40; W.Spixi.launchWelcomeFit(s.shell);
    const postInset = [wv.dataset.compact || '0', rank()];
    r7.insetRefits = preInset[0] === '0' && preInset[1] === 3 && postInset[0] === '1' && postInset[1] === 2;
    INSET = 0;
    const trans = seq.filter((x, i) => i === 0 || x[1] !== seq[i - 1][1]).map((x) => x[0] + ':' + ['{}', '{logo}', '{art}', '{art+logo}'][x[1]] + '/L' + x[2]);
    delete wv.dataset.compact;
    const logoEl = d.querySelector('.c-launch__logo');
    wv.dataset.compact = '1';
    r7.cssLogo = fs(logoEl, 'display') === 'none';
    wv.dataset.compact = '2';
    /* ★ S20G Q-3 re-base: level 2 = a 44 px FLOOR (min-height), the height is auto — the two-line CTA net grows the button */
    r7.cssButtons = fs(d.querySelector('.c-launch__ctas .c-button'), 'min-height') === '44px' && fs(d.querySelector('.c-launch__ctas .c-button'), 'height') === 'auto';
    delete wv.dataset.compact;
    r7.cssLogoBack = fs(logoEl, 'display') !== 'none';
    ok(Object.values(r7).every(Boolean),
      '★ ON-1 F (#46 r5): the welcome fit is MONOTONIC in the window height — tall to short it only steps down {art + logo} → {art} (L1, only while it keeps the art) → {logo} (L0, text fits with the logo) → {} (L2, never art); an unchanged fit writes nothing; ★ r6: an inset push (the room moves, the welcome box does not) re-fits — ' + JSON.stringify({ r7, trans, recs: recs.slice(0, 6), preInset, postInset }));
    ok(s.errs.length === 0, '★ ON-1 F: no page error — ' + JSON.stringify(s.errs.slice(0, 3)));
  } catch (e) {
    ok(false, '★ ON-1 F threw: ' + (e && e.stack || e));
  } finally { if (s) s.close(); }
}
