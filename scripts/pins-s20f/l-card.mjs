/* ==== S20F W-7 (#1426 = a2) — the two-column card anchored where STEP 2 sits centred (0 px jump) ====
 * On the BUILT intro.html (jsdom, desktop UA, matchMedia "(min-width: 900px)" true). Layout is stubbed (the
 * pins-on1/f-copy (6) grammar) as a small grid model: the topbar's top is 100, row 4 (the fields) starts at 160
 * (rows 2–3 = 60), a fields / footer block is BASE px tall (create step 1 80 + 130, step 2 240 + 100; restore 140 +
 * 100) plus 42 px for each error / honest line in it that is not hidden (its 30 px box + margins + the 12 px flex
 * row gap — getComputedStyle(parent).rowGap is stubbed to 12px, jsdom has no gap); a block inside a hidden pane is
 * 0 tall, and a footer's bottom = 160 + its pane's fields + footer. ★ #46 r3 (N6): while both panes are laid out, an
 * in-flow block takes the shared row's height (the taller pane's block), as the grid would; only an absolute one
 * keeps its own — so a read of step 2 left in flow gets 60 + 240 + 130 = 430 (anchor 140, not 155).
 *   (1) create: --launch-card-top = floor((710 − 400) / 2) = 155 px — measured from STEP 2 while step 1 is on screen
 *       (out of flow), the same on step 2; a refit at a new WIDTH with the mismatch line up (712 tall) = 156.
 *   (2) restore: its own normal-state centre, floor((710 − 300) / 2) = 205; with the wrong-password line up a refit
 *       at a new width (714) = 207 — never the error-grown one.
 *   (3) the built CSS at 1280 px: grid-template-rows = "<the property> auto auto auto auto 1fr" (1fr without it);
 *       a phone-width window (matchMedia false) writes nothing.
 *   (4) ★ #46 r1 (MINOR-1): a refit never toggles `hidden` on a live region (0 mutations on the visible
 *       wrong-password line); step 2 on screen refits without touching the panes.
 *   (5) ★ #46 r2 (MINOR-4): 10 HEIGHT-only resizes on step 1 make 0 `hidden` changes on p1 AND on p2 (the rows are
 *       cached per width + fonts) while the anchor tracks the height; a new WIDTH on step 1 re-measures step 2 once
 *       without ever hiding p1 (the focused nickname).
 * The Chromium numbers (header top step 1 = step 2 at 1126 × 710 / 1280 × 800 / 1920 × 1080; step 2 centred ± 1;
 * restore / retry normal = wrong password; a drag-resize on step 1 → 0 p1 mutations) are in the S20F report.
 * Deliberate breaks (S20F reports): ① launch.html back to `1fr auto auto auto auto 1fr` → (3) fails; ② the step-1 read
 *   taking p1's own blocks → (1) step1 fails; ③ the quiet lines not subtracted → (1) / (2) fail; ④ the quiet lines
 *   toggled hidden for the measure → (4) lineMuts fails; ⑤ the rows cache ignored → (5) p2Muts fails; ⑥ the r1 pane
 *   swap (p1 hidden for the read) → (5) p1Muts fails; ⑦ (r2, M3) quietPx without the row gap → (1) refit 150 / (2)
 *   fail; ⑧ (r2) clientHeight back in the rows key → (5) p2Muts fails; ⑨ (r3, N6) the out-of-flow read without
 *   `position: absolute` → (1) step1 140 fails. */
import { on1Kit } from '../pins-on1/kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot, cascade } = on1Kit(h);
  let s = null;
  try {
    s = await boot({ ua: 'desktop' });
    const { d, W, push, typeIn } = s;
    let wide = true;
    W.matchMedia = (q) => ({ matches: /min-width:\s*900px/.test(q) ? wide : false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    const shown = (e) => { for (let x = e; x; x = x.parentElement) if (x.hidden) return false; return true; };
    const realGCS = W.getComputedStyle.bind(W);
    W.getComputedStyle = (el, ps) => {
      const cs = realGCS(el, ps);
      if (!el || !el.classList || !(el.classList.contains('c-launch__fields') || el.classList.contains('c-launch__footer'))) return cs;
      return new Proxy(cs, { get: (t, k) => (k === 'rowGap' ? '12px' : (typeof t[k] === 'function' ? t[k].bind(t) : t[k])) });
    };
    const QUIET = '.c-launch__ferr, .c-launch__honest';
    const stubView = (v, base) => {
      let H = 710, Wd = 1126;
      Object.defineProperty(v, 'clientHeight', { configurable: true, get: () => H });
      Object.defineProperty(v, 'clientWidth', { configurable: true, get: () => Wd });
      v.querySelector(':scope > .c-topbar').getBoundingClientRect = () => ({ top: 100, bottom: 144, left: 0, right: 400, width: 400, height: 44 });
      for (const e of v.querySelectorAll(QUIET)) {
        const cs = realGCS(e);
        const m = (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
        Object.defineProperty(e, 'offsetHeight', { configurable: true, get: () => (shown(e) ? 30 - m : 0) });
      }
      const ownH = (x) => base(x) + [...x.querySelectorAll(QUIET)].filter(shown).length * 42;
      /* ★ #46 r3 (N6): two panes laid out at once share grid rows 4 / 5 — an IN-FLOW block is stretched to the row,
         i.e. the taller of the two panes' blocks; only an out-of-flow (position: absolute) block keeps its own height */
      const blockH = (x) => {
        if (!shown(x)) return 0;
        const pane = x.closest('.c-launch__step');
        if (!pane || x.style.position === 'absolute') return ownH(x);
        const other = [...v.querySelectorAll('.c-launch__step')].find((q) => q !== pane);
        const twin = other && other.querySelector(x.classList.contains('c-launch__fields') ? '.c-launch__fields' : '.c-launch__footer');
        return twin && shown(twin) && twin.style.position !== 'absolute' ? Math.max(ownH(x), ownH(twin)) : ownH(x);
      };
      for (const x of v.querySelectorAll('.c-launch__fields, .c-launch__footer')) {
        Object.defineProperty(x, 'offsetHeight', { configurable: true, get: () => blockH(x) });
        x.getBoundingClientRect = () => {
          if (!shown(x)) return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 };
          const pane = x.closest('.c-launch__step') || v;
          const fh = blockH(pane.querySelector('.c-launch__fields'));
          const top = x.classList.contains('c-launch__fields') ? 160 : 160 + fh;
          const hgt = blockH(x);
          return { top, bottom: top + hgt, left: 0, right: 404, width: 404, height: hgt };
        };
      }
      return { setH: (x) => { H = x; }, setW: (x) => { Wd = x; } };
    };
    const takeAll = (mo, arr, fmt) => { for (const m of mo.takeRecords()) arr.push(fmt(m)); };
    const cv = d.querySelector('[data-launch-view="create"]');
    const C = stubView(cv, (x) => { const two = !!x.closest('[data-step="2"]'); return x.classList.contains('c-launch__fields') ? (two ? 240 : 80) : (two ? 100 : 130); });   // step 1's footer (address note + Continue) is the taller one, as in Chromium
    const prop = (v) => v.style.getPropertyValue('--launch-card-top');
    push('setLaunchView', 'create'); await sleep(450);
    const r1 = { step1: prop(cv), step1Shown: !cv.querySelector('[data-step="1"]').hidden };
    typeIn(cv.querySelector('input[data-field="nick"]'), 'Ana');
    cv.querySelector('[data-step="1"] .c-launch__footer .c-button').click(); await sleep(450);
    r1.step2 = prop(cv);
    const [pw, rp] = [...cv.querySelectorAll('.c-lock__input')];
    typeIn(pw, 'correct horse battery'); typeIn(rp, 'correct horse batterx');
    r1.mismatchUp = !cv.querySelector('.c-launch__mismatch').hidden;
    C.setW(1130); C.setH(712);
    cv.querySelector('.c-topbar .c-button').click(); await sleep(450);   // step 2 → step 1: a refit at a new width while step 1 is up
    r1.refit = prop(cv);
    r1.backOnStep1 = !cv.querySelector('[data-step="1"]').hidden && cv.querySelector('[data-step="2"]').hidden;
    ok(r1.step1 === '155px' && r1.step2 === '155px' && r1.refit === '156px' && r1.step1Shown && r1.mismatchUp && r1.backOnStep1,
      '★ S20F W-7 (#1426 = a2): the create card is anchored where STEP 2 sits centred — the same --launch-card-top on step 1 and step 2 (step 2 read out of flow from step 1), and an error line never moves the anchor — ' + JSON.stringify(r1));

    /* (2) restore — its own normal state */
    const rv = d.querySelector('[data-launch-view="restore"]');
    const R = stubView(rv, (x) => (x.classList.contains('c-launch__fields') ? 140 : 100));
    push('setLaunchView', 'welcome'); await sleep(40);
    push('setLaunchView', 'restore'); await sleep(450);
    const r2 = { normal: prop(rv) };
    push('setUploadedFileName', 'spixi-backup.ixi'); await sleep(20);
    typeIn(rv.querySelector('.c-lock__input'), 'nope');
    rv.querySelector('.c-launch__footer .c-button').click(); await sleep(20);
    push('showPasswordError'); push('removeLoadingOverlay'); await sleep(20);
    r2.errorUp = !rv.querySelector('.c-launch__ferr').hidden;
    R.setW(1140); R.setH(714);
    W.Spixi.launchWelcomeFit(s.shell);
    r2.refit = prop(rv);
    ok(r2.normal === '205px' && r2.refit === '207px' && r2.errorUp,
      '★ S20F W-7: restore anchors at its own normal-state centre — the wrong-password line grows the card downward, a refit with it up keeps the normal-state anchor — ' + JSON.stringify(r2));

    /* (4) ★ #46 r1: no live-region / pane toggles on a refit */
    const muts = [];
    const mfmt = (m) => (m.target.className || '') + '@' + m.attributeName;
    const mo = new W.MutationObserver((ms) => { for (const m of ms) muts.push(mfmt(m)); });
    const errLine = rv.querySelector('.c-launch__ferr');
    mo.observe(errLine, { attributes: true, attributeFilter: ['hidden'] });
    R.setW(1150); R.setH(716); W.Spixi.launchWelcomeFit(s.shell);
    takeAll(mo, muts, mfmt);   // records queue until the microtask — take them now
    const r4 = { errorUp: !errLine.hidden, refit: prop(rv), lineMuts: muts.length };
    mo.disconnect();
    push('setLaunchView', 'welcome'); await sleep(40);
    push('setLaunchView', 'create'); await sleep(450);
    cv.querySelector('[data-step="1"] .c-launch__footer .c-button').click(); await sleep(450);
    const [p1, p2] = [...cv.querySelectorAll('.c-launch__step')];
    const pm = [];
    const pfmt = (m) => m.target.dataset.step + '@' + m.attributeName;
    const mo2 = new W.MutationObserver((ms) => { for (const m of ms) pm.push(pfmt(m)); });
    [p1, p2].forEach((p) => mo2.observe(p, { attributes: true, attributeFilter: ['hidden'] }));
    C.setW(1160); C.setH(700); W.Spixi.launchWelcomeFit(s.shell);
    C.setH(720); W.Spixi.launchWelcomeFit(s.shell);
    takeAll(mo2, pm, pfmt);
    r4.step2NoSwap = pm.length === 0;
    r4.step2At720 = prop(cv);
    mo2.disconnect();
    ok(r4.errorUp && r4.refit === '208px' && r4.lineMuts === 0 && r4.step2NoSwap && r4.step2At720 === '160px',
      '★ S20F W-7 (#46 r1 MINOR-1): a refit toggles no live region — 0 `hidden` mutations on the visible wrong-password line (the anchor stays the normal-state one) and no pane change while step 2 is on screen — ' + JSON.stringify({ r4, muts, pm }));

    /* (5) ★ #46 r2 (MINOR-4): height-only resizes on step 1 measure nothing; a new width never hides p1 */
    cv.querySelector('.c-topbar .c-button').click(); await sleep(450);   // step 2 → step 1
    const m1 = [], m2 = [];
    const mo3 = new W.MutationObserver((ms) => { for (const m of ms) (m.target === p1 ? m1 : m2).push(pfmt(m)); });
    [p1, p2].forEach((p) => mo3.observe(p, { attributes: true, attributeFilter: ['hidden'] }));
    const anchors = [];
    for (let i = 1; i <= 10; i++) { C.setH(720 - i * 6); W.Spixi.launchWelcomeFit(s.shell); anchors.push(prop(cv)); }
    for (const m of mo3.takeRecords()) (m.target === p1 ? m1 : m2).push(pfmt(m));
    const r5 = { p1Muts: m1.length, p2Muts: m2.length, anchors: anchors.join(' ') };
    r5.tracks = anchors.every((a, i) => a === Math.floor((720 - (i + 1) * 6 - 400) / 2) + 'px');
    C.setW(1170); W.Spixi.launchWelcomeFit(s.shell);
    for (const m of mo3.takeRecords()) (m.target === p1 ? m1 : m2).push(pfmt(m));
    r5.widthP1Muts = m1.length;
    r5.widthP2Muts = m2.length;   // one out-of-flow read: p2 shown + hidden again
    r5.widthAnchor = prop(cv);
    r5.step1Up = !p1.hidden && p2.hidden;
    mo3.disconnect();
    ok(r5.p1Muts === 0 && r5.p2Muts === 0 && r5.tracks && r5.widthP1Muts === 0 && r5.widthP2Muts === 2 && r5.widthAnchor === '130px' && r5.step1Up,
      '★ S20F W-7 (#46 r2 MINOR-4): 10 height-only resizes on step 1 make 0 `hidden` changes on either pane (the rows are cached per width + fonts) while the anchor follows the height; a new width re-reads step 2 out of flow and never hides step 1 — ' + JSON.stringify(r5));

    /* (3) the CSS reads it; a narrow window writes nothing */
    const rows = (v) => cascade(W, v, 'grid-template-rows', { width: 1280 }).replace(/\s+/g, ' ').trim();
    const r3 = { withProp: rows(cv) };
    const fresh = W.Spixi.createLaunchShell({ view: 'create' });
    d.body.append(fresh);
    wide = false;
    const fv = fresh.querySelector('[data-launch-view="create"]');
    stubView(fv, () => 200);
    W.Spixi.setLaunchView(fresh, 'restore'); await sleep(40); W.Spixi.setLaunchView(fresh, 'create'); await sleep(450);
    r3.narrowNone = prop(fv) === '';
    r3.without = rows(fv);
    fresh.remove();
    ok(r3.withProp === '130px auto auto auto auto 1fr' && r3.without === '1fr auto auto auto auto 1fr' && r3.narrowNone,
      '★ S20F W-7: the ≥ 900 px grid\'s first row IS the anchor (1fr until it is measured); a window under 900 px writes none — ' + JSON.stringify(r3));
    ok(s.errs.length === 0, '★ S20F W-7: no page error — ' + JSON.stringify(s.errs.slice(0, 3)));
  } catch (e) {
    ok(false, '★ S20F W-7 l-card threw: ' + (e && e.stack || e));
  } finally { if (s) s.close(); }
}
