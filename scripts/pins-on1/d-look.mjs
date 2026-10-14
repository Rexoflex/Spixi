/* ==== ON-1 D (#1422, Decisions 5 · 6 · 8, Part C) — THE LOOK, read from the BUILT shell's computed styles ====
 * On the BUILT intro.html (jsdom, phone UA). Colours are the computed values (jsdom's cascade, var() resolved
 * through the element's custom properties) composited over every point the form backdrop can paint
 * (--gradient-launch-form: each linear stop, alone and under each radial centre — the worst point counts):
 *   (1) input field edge ≥ 3 : 1 (edge over fill, against the backdrop); every launch text ≥ 4.5 : 1 on what it
 *       sits on (field labels, sublines, the step label, checks, the mismatch line, the four strength labels, the
 *       banner, tags, notes, the honest line, the file card in both states, the welcome language caption).
 *   (2) NO OUTLINE on banners, cards or tags: no border, no outline, no spread ring in box-shadow (a 1 px TOP light
 *       is allowed); the input field DOES keep its ring (the control).
 *   (3) the primary button is the app's solid c-button: no gradient anywhere in its background, no coloured
 *       box-shadow — welcome Create, Continue, Create my account, Restore account.
 *   (4) the language pill: 44 px tall with a ≥ 48 px hit area (the ::before overhang), the caption reads the
 *       existing `language` key and is aria-hidden (the pill's own label says "Language: …").
 *   (6) ★ #46 r1: the ring guard per STROKE (both corners on a phone form view; see the block). ★ r2 (m2): the
 *       geometry fixture (ring-geometry.json) is captured by scripts/pins-on1/capture-rings.mjs (Playwright, the
 *       built intro.html) and carries hashes of the launch SOURCES that shape it (★ r4: kit.mjs RING_INPUTS — the launch
 *       component + sheets, base / button / topbar / avatar / lock-shell CSS, the Sora files, the tokens launch
 *       block, the en-us launch strings); a different hash
 *       FAILS "ring fixture stale — run node scripts/pins-on1/capture-rings.mjs".
 *   (5) the rings: ONE layer node for the whole shell — the SAME node before and after the welcome → create slide
 *       and back; static (no animation on the layer, its svgs or paths, under either motion setting); no pointer
 *       events.
 * Deliberate breaks (S20 T report): ① --launch-field-edge .34 → .14 → (1) edge fails; ② --launch-label .66 → .40 →
 *   (1) text fails; ③ a 1px outline ring on .c-launch__banner → (2) fails; ④ the CTA built with a gradient
 *   background-image → (3) fails; ⑤ the pill ::before inset -3px → -2px (46 px, the #46 r1 MINOR) → (4) fails; ⑥ the rings re-created in show()
 *   → (5) fails; ⑦ a spin animation on .c-launch__rings svg → (5) fails; ⑨ (#46 r4) an edit to launch-form.css → "ring fixture stale (src/styles/components/launch-form.css)"; an edit to
 *   composer.css (another owner's) → NOT stale; ⑧ launchRingQuiet back to the whole-set rule (every
 *   ring hidden when any box reaches the outer radius) → (6) fails (bl 0 / tr 0 at 390). */
import { on1Kit, ringInputsHash, ringInputHashes } from './kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot, cascade, computed, parseColor, over, contrast, gradientPoints } = on1Kit(h);
  let s = null;
  try {
    s = await boot({ ua: 'phone' });
    const { d, W, push, typeIn } = s;
    const html = d.documentElement;
    const formPts = gradientPoints(computed(W, html, '--gradient-launch-form'));
    const welcomePts = gradientPoints(computed(W, html, '--gradient-launch'));
    const col = (el, prop) => parseColor(computed(W, el, prop));
    const ground = (el) => parseColor(computed(W, el, 'background') || computed(W, el, 'background-color'));
    const ringColor = (shadow) => { const m = /inset\s+0(?:px)?\s+0(?:px)?\s+0(?:px)?\s+[\d.]+px\s+(rgba?\([^)]*\)|#[0-9a-f]{3,8})/i.exec(shadow || ''); return m ? parseColor(m[1]) : null; };
    const worst = (fg, layers, pts) => Math.min(...pts.map((p) => { let g = p; for (const l of layers) g = over(l, g); return contrast(over(fg, g), g); }));

    /* drive the states */
    const goCreate = d.querySelectorAll('.c-launch__ctas .c-button')[0];
    const rings0 = d.querySelector('.c-launch__rings');
    goCreate.click();
    await sleep(600);
    const ringsAfterSlide = d.querySelector('.c-launch__rings');
    const v = d.querySelector('[data-launch-view="create"]');
    typeIn(v.querySelector('input[data-field="nick"]'), 'Ana');
    v.querySelector('[data-step="1"] .c-launch__footer .c-button').click();
    await sleep(30);
    const [pw, rp] = [...v.querySelectorAll('.c-lock__input')];
    typeIn(pw, 'correct horse'); typeIn(rp, 'correct horse x');   // as long as the password → the mismatch shouts
    const field = v.querySelector('.c-launch__field');
    const fill = ground(field);
    const edge = ringColor(computed(W, field, 'box-shadow'));
    const errField = v.querySelectorAll('.c-launch__field')[2];          // [nick, pw, confirm] — the confirm field is red now
    const errEdge = ringColor(computed(W, errField, 'box-shadow'));
    const r1 = {};
    /* the edge pixel (edge over the field fill over the backdrop) against the backdrop just outside the field */
    const edgeCr = (e, f) => Math.min(...formPts.map((p) => contrast(over(e, over(f, p)), p)));
    r1.edge = edge && fill ? +edgeCr(edge, fill).toFixed(2) : 0;
    r1.errorEdge = errEdge ? +edgeCr(errEdge, ground(errField)).toFixed(2) : 0;
    const texts = [];
    const t = (name, el, layers = []) => { if (!el) { texts.push([name, 0]); return; } const fg = col(el, 'color'); texts.push([name, fg ? +worst(fg, layers.filter(Boolean), formPts).toFixed(2) : 0]); };
    t('field label', v.querySelector('[data-step="2"] .c-launch__field-label'), [fill]);
    t('subline', v.querySelector('[data-step="2"] .c-launch__hero-copy'));
    t('step label', v.querySelector('.c-launch__head-step'));
    t('mismatch line', v.querySelector('.c-launch__mismatch'));
    const checks = [...v.querySelectorAll('.c-launch__check')];
    t('check idle', checks[0]);   // "correct horse" = 13 chars → the length check is ok; use the match check for "bad"
    t('check bad', checks[1]);
    typeIn(rp, 'correct horse');
    t('check ok', checks[1]);
    const meter = v.querySelector('.c-launch__meter');
    for (const lvl of ['1', '2', '3', '4']) { meter.dataset.level = lvl; t('strength ' + lvl, meter.querySelector('.c-launch__meter-label')); }
    const banner = v.querySelector('.c-launch__banner');
    t('banner title', banner.querySelector('.c-launch__banner-title'), [ground(banner)]);
    t('banner body', banner.querySelector('.c-launch__banner-body'), [ground(banner)]);
    const tag = v.querySelector('.c-launch__tag');
    t('tag', tag, [ground(tag)]);
    t('address note', v.querySelector('.c-launch__fnote'));
    t('honest line', v.querySelector('.c-launch__honest'));
    const rv = d.querySelector('[data-launch-view="restore"]');
    const fc = rv.querySelector('.c-launch__filecard');
    t('file card sub (empty)', fc.querySelector('.c-launch__filecard-sub'), [ground(fc)]);
    t('file card title (empty)', fc.querySelector('.c-launch__filecard-title'), [ground(fc)]);
    push('setUploadedFileName', 'spixi-backup.ixi');
    await sleep(20);
    t('file card name (chosen)', fc.querySelector('.c-launch__filecard-title'), [ground(fc)]);
    t('file card Change (chosen)', fc.querySelector('.c-launch__filecard-sub'), [ground(fc)]);
    t('restore honesty line', rv.querySelector('.c-launch__fnote'));
    const cap = d.querySelector('.c-launch__lang-caption');
    texts.push(['language caption (welcome)', +Math.min(...welcomePts.map((p) => contrast(over(col(cap, 'color'), p), p))).toFixed(2)]);
    const lowText = texts.filter(([, c]) => !(c >= 4.5));
    ok(r1.edge >= 3 && r1.errorEdge >= 3 && lowText.length === 0,
      '★ ON-1 D (#1422): the input field edge ≥ 3 : 1 on the form backdrop (normal ' + r1.edge + ', error ' + r1.errorEdge + ') and every launch text ≥ 4.5 : 1 on what it sits on — lowest ' + JSON.stringify(texts.slice().sort((a, b) => a[1] - b[1]).slice(0, 3)) + ' · below: ' + JSON.stringify(lowText));

    /* (2) no outline on banners / cards / tags — the field keeps its ring */
    const outlineOf = (el, pseudo) => {
      const get = (p) => (pseudo ? cascade(W, el, p, { pseudo, width: 1280 }) : computed(W, el, p)) || '';
      const bw = get('border-width') || get('border') || '';
      const bs = get('border-style') || get('border') || '';
      const border = /[1-9]/.test(bw) && !/none|hidden/.test(bs);
      const ol = get('outline');
      const outline = !!ol && !/none|^0(px)?\b/.test(ol);
      const sh = get('box-shadow');
      const ring = /(?:^|,)\s*(?:inset\s+)?0(?:px)?\s+0(?:px)?\s+0(?:px)?\s+[\d.]+px/.test(sh);
      return { border, outline, ring };
    };
    fc.removeAttribute('data-file-set');
    const plain = [['banner', banner], ['tag', tag], ['file card (empty)', fc]];
    const res2 = plain.map(([n, el]) => [n, outlineOf(el)]);
    push('setUploadedFileName', 'spixi-backup.ixi'); await sleep(20);
    res2.push(['file card (chosen)', outlineOf(fc)]);
    res2.push(['warning tile', outlineOf(banner.querySelector('.c-launch__tile'))]);
    const fieldRing = outlineOf(field).ring;
    const outlined = res2.filter(([, o]) => o.border || o.outline || o.ring);
    ok(outlined.length === 0 && fieldRing,
      '★ ON-1 D (Decision 5): NO outline on the banner, the tags or the file card (empty + chosen) — no border, no outline, no spread ring (a 1 px top light is fine); the input field keeps its ring — ' + JSON.stringify({ outlined, fieldRing }));

    /* (3) the primary button: solid, no gradient, no coloured glow */
    const btns = [
      ['welcome Create', d.querySelector('.c-launch__ctas .c-button')],
      ['Continue', v.querySelector('[data-step="1"] .c-launch__footer .c-button')],
      ['Create my account', v.querySelector('[data-step="2"] .c-launch__footer .c-button')],
      ['Restore account', rv.querySelector('.c-launch__footer .c-button')],
    ];
    const res3 = btns.map(([n, b]) => {
      const bg = computed(W, b, 'background') || computed(W, b, 'background-color');
      const img = computed(W, b, 'background-image');
      const sh = computed(W, b, 'box-shadow');
      const shColors = (sh.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/gi) || []).map(parseColor).filter(Boolean);
      const coloured = shColors.some((c) => Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) > 24);
      return [n, { solid: !!parseColor(bg) && !/gradient/i.test(bg), noImage: !img || img === 'none', noGlow: !coloured, type: b.dataset.type, size: b.dataset.size }];
    });
    ok(res3.every(([, r]) => r.solid && r.noImage && r.noGlow && r.size === '56') && res3[0][1].type === 'fill' && res3[2][1].type === 'fill',
      '★ ON-1 D (Decision 8): the primary buttons are the app\'s solid c-button (fill, 56) — no gradient background, no background-image, no coloured box-shadow — ' + JSON.stringify(res3));

    /* (4) the pill */
    const pill = d.querySelector('.c-launch__pill');
    const minH = parseFloat(cascade(W, pill, 'min-height'));
    const inset = cascade(W, pill, 'inset', { pseudo: '::before' });
    /* ★ #46 r1: a ::before inset is measured from the PADDING box — inside the pill's border */
    const borderW = parseFloat((/([\d.]+)px/.exec(cascade(W, pill, 'border') || cascade(W, pill, 'border-width') || '') || [])[1]) || 0;
    const hit = minH - 2 * borderW - 2 * (parseFloat(inset) || 0);
    ok(minH >= 44 && hit === 48 && cap && cap.getAttribute('aria-hidden') === 'true' && cap.textContent === 'Language' && /^Language: /.test(pill.getAttribute('aria-label') || ''),
      '★ ON-1 D (Part C, P2): the welcome pill is ' + minH + ' px tall with a ' + hit + ' px hit area (≥ 44 / 48); the caption under it reads the existing `language` key and is aria-hidden (the pill says "Language: …")');

    /* (5) the rings: one node, static */
    await sleep(20);
    s.W.Spixi.launchShellBack(s.shell); s.W.Spixi.launchShellBack(s.shell);
    await sleep(600);
    const ringsBack = d.querySelector('.c-launch__rings');
    const still = (el, reduce) => {
      const a = cascade(W, el, 'animation', { reduce }) || '';
      const an = cascade(W, el, 'animation-name', { reduce }) || '';
      const tf = cascade(W, el, 'transform', { reduce }) || '';
      return (!a || a === 'none') && (!an || an === 'none') && (!tf || tf === 'none');
    };
    const parts = [rings0, ...rings0.querySelectorAll('svg, path')];
    const r5 = {
      sameNode: !!rings0 && rings0 === ringsAfterSlide && rings0 === ringsBack && d.querySelectorAll('.c-launch__rings').length === 1 && rings0.parentElement === s.shell,
      twoSets: rings0.querySelectorAll('svg').length === 2 && rings0.getAttribute('aria-hidden') === 'true',
      static: parts.every((e) => still(e, false) && still(e, true)),
      noPointer: computed(W, rings0, 'pointer-events') === 'none',
      aboveViews: (() => { const z = cascade(W, rings0, 'z-index'); return /calc\(\s*30\s*\+\s*1\s*\)|^3[1-9]$/.test(String(z).replace(/\s+/g, ' ').trim()); })(),
    };
    ok(Object.values(r5).every(Boolean),
      '★ ON-1 D (#1422, Decision 6): the corner rings are ONE shared layer — the same node before and after the welcome → create slide and back, two corner sets, static (no animation / transform in either motion setting), no pointer events, above the sliding view — ' + JSON.stringify(r5));
    /* (6) ★ #46 r1 (auditor B): the guard hides single RINGS whose stroke crosses content — not whole sets.
       Fed the geometry the shipped guard read in Chromium (ring-geometry.json: the content boxes + the svg rects,
       window.Spixi.launchRingGeometry), the pure guard keeps BOTH corners on every phone form view at 390 × 844
       and a reduced set in each corner at 320 × 568; an independent stroke sampler confirms no kept ring crosses a
       box. Then the WIRING: in this document, one box stubbed onto ring k of the bottom-left set hides that ring
       and no other. */
    const geo = JSON.parse(h.readFileSync(h.join(h.root, 'scripts/pins-on1/ring-geometry.json'), 'utf8'));
    /* ★ #46 r2 (m2) → r4: the fixture must match the launch SOURCES that shape it (kit.mjs RING_INPUTS) */
    const hashNow = ringInputsHash(h.readFileSync, h.join, h.root);
    const inputsNow = ringInputHashes(h.readFileSync, h.join, h.root);
    const changed = Object.keys(inputsNow).filter((k) => !geo._inputs || geo._inputs[k] !== inputsNow[k]);
    ok(geo._hash === hashNow,
      geo._hash === hashNow ? '★ ON-1 D (#46 r4): the ring fixture matches the launch sources that shape it (' + Object.keys(inputsNow).length + ' inputs, hash ' + hashNow + ')'
        : 'ring fixture stale (' + (changed.join(', ') || 'the input list') + ') — needs Playwright + Chromium: npm i --no-save playwright && npx playwright install chromium (or PLAYWRIGHT_MODULE=…), then node scripts/pins-on1/capture-rings.mjs');
    const RQ = W.Spixi.launchRingQuiet;
    const RADII = { tr: { cx: 107.7, cy: -7.7, n: [18, 26, 34, 42, 50, 58, 66, 74, 82], a0: 84, a1: 186 }, bl: { cx: -8, cy: 108, n: [16, 24, 32, 40, 48, 56, 64, 72], a0: 264, a1: 366 } };
    const crossesSampled = (kind, rect, i, boxes) => {   // independent: sample the circle, 1° steps, inside the arc
      const g = RADII[kind], sx = rect.width / 100, cx = rect.left + g.cx * sx, cy = rect.top + g.cy * (rect.height / 100), R = g.n[i] * sx;
      for (let a = g.a0; a <= g.a1; a += 1) {
        const x = cx + R * Math.cos(a * Math.PI / 180), y = cy + R * Math.sin(a * Math.PI / 180);
        if (boxes.some((q) => q.width > 0 && x >= q.left - 2 && x <= q.right + 2 && y >= q.top - 2 && y <= q.bottom + 2)) return true;
      }
      return false;
    };
    const per = {}, unsafe = [];
    for (const [state, gm] of Object.entries(geo)) {
      if (state.startsWith('_')) continue;
      per[state] = {};
      for (const kind of ['tr', 'bl']) {
        const hide = RQ(kind, gm[kind], gm.boxes);
        per[state][kind] = RADII[kind].n.length - hide.length;
        RADII[kind].n.forEach((_, i) => { if (!hide.includes(i) && crossesSampled(kind, gm[kind], i, gm.boxes)) unsafe.push(state + ' ' + kind + ' ring ' + i); });
      }
    }
    const at390 = ['create1-390', 'create2-390', 'restore-390'].every((k) => per[k] && per[k].tr >= 7 && per[k].bl >= 6);
    const at320 = ['create1-320', 'create2-320', 'restore-320'].every((k) => per[k] && per[k].tr >= 2 && per[k].bl >= 1);
    const welcome390 = !!per['welcome-390'] && per['welcome-390'].tr >= 6;   // phone welcome: top-right only (bottom-left is off by CSS)
    /* the wiring in this document: stub the bl svg rect + ONE box crossing ring 5 of the bottom-left set */
    const blSvg = s.shell.querySelector('.c-launch__rings-bl');
    const blRect = { left: 0, top: 754, width: 90, height: 90, right: 90, bottom: 844, x: 0, y: 754 };
    const k = 5, Rk = RADII.bl.n[k] * 0.9, cxB = -7.2, cyB = 754 + 97.2;
    const px = cxB + Rk * Math.cos(315 * Math.PI / 180), py = cyB + Rk * Math.sin(315 * Math.PI / 180);
    const probe = rv.querySelector('.c-launch__footer .c-button');
    blSvg.getBoundingClientRect = () => blRect;
    probe.getBoundingClientRect = () => ({ left: px - 0.5, top: py - 0.5, right: px + 0.5, bottom: py + 0.5, width: 1, height: 1, x: px - 0.5, y: py - 0.5 });   // a 1 px box ON ring k (the rings are 7.2 px apart; the stroke tolerance is 5.4 px)
    push('setLaunchView', 'restore');
    await sleep(450);
    const blPaths = [...blSvg.querySelectorAll('path')];
    const quietIdx = blPaths.map((p, i) => (p.hasAttribute('data-quiet') ? i : -1)).filter((i) => i >= 0);
    const wired = JSON.stringify(quietIdx) === JSON.stringify([k]);
    ok(at390 && at320 && welcome390 && unsafe.length === 0 && wired,
      '★ ON-1 D (#46 r1, Decision 6): the ring guard works per RING STROKE — both corners stay on create step 1, step 2 and restore at 390 × 844 (tr ≥ 7 / 9, bl ≥ 6 / 8), welcome keeps its top-right set (≥ 6 / 9), and a reduced set in each corner at 320 × 568; no kept ring crosses a content box (independent 1° stroke sampler); in the document one box on ring ' + k + ' hides exactly that ring — ' + JSON.stringify({ per, unsafe, wired, quietIdx }));
    ok(s.errs.length === 0, '★ ON-1 D: no page error — ' + JSON.stringify(s.errs.slice(0, 3)));
  } catch (e) {
    ok(false, '★ ON-1 D d-look threw: ' + (e && e.stack || e));
  } finally { if (s) s.close(); }
}
