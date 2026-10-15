/* ==== S20G R-2 · R-3 · F-4 — create step 2 (the nickname, the strength line) and the restore file card hover ====
 * On the BUILT intro.html (jsdom; the media-aware cascade of pins-on1/kit.mjs for the built CSS):
 *   (1) R-2: on step 2 the filled nickname is ONE <b class="c-launch__nick"> holding exactly the typed name — a name that
 *       looks like markup ("<img src=x onerror=alert(1)>Ana") stays text (no <img>, the <b> has no element child); the
 *       line still reads the whole create2Sub* sentence (textContent = the {name} fill); the built CSS gives the <b>
 *       font-weight 600 and colour = --text-neutral-01. de-de keeps the translation's {name} position (the <b> first,
 *       then the de text), ja-jp too ("{name} さん、…").
 *   (2) R-3: the strength label's line is reserved before the first character (min-height 18 px = its line-height),
 *       the progress segment + the strength bars FILL through an ::after (transform scaleX(0) → none, transition on
 *       transform AND background-color at --duration-200 = 200 ms), at level 2 bars 1–2 are filled and 3–4 are not;
 *       under reduced motion --duration-200 is 0 ms (instant) — ★ S20G C-m1: AND the ::after rule's own transition
 *       resolves (media-aware var(), the ::after → its ancestors) to 0 ms in every comma part under reduce, 200 ms without.
 *   (3) F-4: a hover rule under @media (hover: hover) and (pointer: fine) reaches the file card in BOTH states (empty and
 *       [data-file-set]) and not a disabled card; it paints a background-image wash (the fill of each state is kept).
 * Deliberate breaks (S20G report): ① the step-2 line back to `sub2.textContent = fillIn(…)` → (1) fails (no <b>);
 *   ② fillNodes building the slot with innerHTML → (1) markup fails; ③ the meter-label min-height removed → (2) reserved
 *   fails; ④ the ::after transition removed → (2) motion fails; ⑤ the hover media block removed → (3) fails;
 *   ⑥ the hover selector narrowed to :not([data-file-set]) → (3) set fails; ⑦ (C-m1) a literal 200ms in the ::after
 *   transition (either part) → (2) reducedAfterZero fails. Pixel contrast + the 0 px shift: the Chromium
 *   tool scripts/pins-s20g/l-sweep.mjs. */
import { on1Kit } from '../pins-on1/kit.mjs';
export default async function (h) {
  const { ok, sleep, root, readFileSync, join } = h;
  const { boot, cascade, resolve } = on1Kit(h);
  let s = null, g = null;
  const step2 = async (b, name) => {
    b.push('setLaunchView', 'create');
    await sleep(300);
    const v = b.d.querySelector('[data-launch-view="create"]');
    const nick = v.querySelector('input[data-field="nick"]');
    b.typeIn(nick, name);
    v.querySelector('.c-launch__step[data-step="1"] .c-launch__footer .c-button').click();
    await sleep(50);
    return v;
  };
  try {
    s = await boot({ ua: 'phone' });
    const { d, W } = s;
    const en = JSON.parse(readFileSync(join(root, 'src/strings/en-us.json'), 'utf8'));
    /* (1) R-2 */
    const evil = '<img src=x onerror=alert(1)>Ana';
    const v = await step2(s, evil);
    const p = v.querySelector('.c-launch__step[data-step="2"] .c-launch__hero-copy');
    const bs = p.querySelectorAll('.c-launch__nick');
    const b = bs[0];
    const r1 = {
      onStep2: !v.querySelector('.c-launch__step[data-step="2"]').hidden,
      oneB: bs.length === 1 && b.tagName === 'B' && p.children.length === 1,
      exact: !!b && b.textContent === evil && b.children.length === 0,
      markup: !p.querySelector('img'),
      sentence: p.textContent === en.create2SubPhone.replace('{name}', evil),
      weight: !!b && cascade(W, b, 'font-weight') === '600',
      color: !!b && /^#|^rgb/.test(cascade(W, b, 'color')) && cascade(W, b, 'color') === resolve(W, b, 'var(--text-neutral-01)').trim(),
    };
    const pos = {};
    for (const code of ['de-de', 'ja-jp']) {
      g = await boot({ ua: 'phone', query: 'lang=' + code });
      const dict = JSON.parse(readFileSync(join(root, 'src/strings', code + '.json'), 'utf8'));
      const gv = await step2(g, 'Ana');
      const gp = gv.querySelector('.c-launch__step[data-step="2"] .c-launch__hero-copy');
      const [before, after] = dict.create2SubPhone.split('{name}');
      const nodes = [...gp.childNodes];
      const bi = nodes.findIndex((n) => n.nodeType === 1 && n.classList.contains('c-launch__nick'));
      pos[code] = bi >= 0 && nodes.slice(0, bi).map((n) => n.textContent).join('') === before && nodes.slice(bi + 1).map((n) => n.textContent).join('') === after && nodes[bi].textContent === 'Ana';
      g.close(); g = null;
    }
    ok(Object.values(r1).every(Boolean) && Object.values(pos).every(Boolean),
      '★ S20G R-2: step 2 shows the nickname as ONE <b class="c-launch__nick"> (weight 600, --text-neutral-01), the exact typed text (markup stays text), inside the whole create2Sub* sentence; de-de / ja-jp keep their {name} position — ' + JSON.stringify({ r1, pos }));

    /* (2) R-3 */
    const meter = v.querySelector('.c-launch__meter');
    const label = meter.querySelector('.c-launch__meter-label');
    const bars = [...meter.querySelectorAll('i')];
    const seg = v.querySelector('.c-launch__progress i');
    const segs = [...v.querySelectorAll('.c-launch__progress i')];
    const tr = (el) => cascade(W, el, 'transition', { pseudo: '::after' });
    meter.dataset.level = '2';
    const r2 = {
      emptyLabel: label.textContent === '',
      reserved: cascade(W, label, 'min-height') === '18px' && cascade(W, label, 'line-height') === '18px',
      motionBar: /transform/.test(tr(bars[0])) && /background-color/.test(tr(bars[0])) && /200ms/.test(tr(bars[0])),
      motionSeg: /transform/.test(tr(seg)) && /background-color/.test(tr(seg)) && /200ms/.test(tr(seg)),
      filled2: ['none', 'none'].join() === bars.slice(0, 2).map((x) => cascade(W, x, 'transform', { pseudo: '::after' })).join()
        && bars.slice(2).every((x) => /scaleX\(0\)/.test(cascade(W, x, 'transform', { pseudo: '::after' }))),
      segOn: segs.every((x) => (x.hasAttribute('data-on') ? cascade(W, x, 'transform', { pseudo: '::after' }) === 'none' : true)) && segs.filter((x) => x.hasAttribute('data-on')).length === 2,
      reducedZero: cascade(W, d.documentElement, '--duration-200', { reduce: true }) === '0ms' && cascade(W, d.documentElement, '--duration-200') === '200ms',
    };
    /* ★ S20G C-m1: the ::after RULE itself under reduce — kit's cascade resolves var() through getComputedStyle (media-blind),
       so a media-aware window stands in: every var() in the winning value resolves through the same media-aware cascade on
       the ::after, then the element and its ancestors (custom-property inheritance). Each comma part's duration must be 0. */
    const mediaW = (opts) => {
      const RW = { document: W.document, getComputedStyle: (el) => ({ getPropertyValue: (n) => {
        for (let x = el; x; x = x.parentElement) { const got = cascade(RW, x, n, opts); if (got) return got; }
        return '';
      } }) };
      return RW;
    };
    const durs = (el, reduce) => {
      const opts = { reduce };
      const own = cascade(mediaW(opts), el, 'transition', { ...opts, pseudo: '::after' });
      const longhand = cascade(mediaW(opts), el, 'transition-duration', { ...opts, pseudo: '::after' });
      const parts = (longhand || own).replace(/\([^()]*\)/g, '').split(',').map((x) => (/(-?[\d.]+m?s)\b/.exec(x) || [])[1] || '');
      return { own, longhand, ms: parts.map((t) => (/ms$/.test(t) ? parseFloat(t) : /s$/.test(t) ? parseFloat(t) * 1000 : NaN)) };
    };
    const rm = { bar: durs(bars[0], true), seg: durs(seg, true), barRest: durs(bars[0], false) };
    r2.reducedAfterZero = rm.bar.ms.length >= 2 && rm.bar.ms.every((x) => x === 0) && rm.seg.ms.length >= 2 && rm.seg.ms.every((x) => x === 0)
      && rm.barRest.ms.length >= 2 && rm.barRest.ms.every((x) => x === 200);
    ok(Object.values(r2).every(Boolean),
      '★ S20G R-3: the strength line reserves its height before the first character (label min-height 18 px), the progress segment and the bars FILL (::after scaleX, transform + background-color at --duration-200), level 2 fills bars 1–2; reduced motion = 0 ms — ' + JSON.stringify({ r2, bar: tr(bars[0]), seg: tr(seg), reduce: { bar: rm.bar.own, seg: rm.seg.own, long: rm.bar.longhand } }));

    /* (3) F-4 */
    s.push('setLaunchView', 'restore');
    await sleep(200);
    const card = d.querySelector('.c-launch__filecard');
    const hoverRules = [];
    for (const sh of d.styleSheets) {
      let rules = []; try { rules = [...sh.cssRules]; } catch (e) {}
      for (const r of rules) {
        if (r.type !== 4 || !/\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)/.test(r.media.mediaText)) continue;
        for (const x of r.cssRules) if (x.type === 1 && /c-launch__filecard[^,]*:hover/.test(x.selectorText) && x.style.getPropertyValue('background-image')) hoverRules.push(x);
      }
    }
    const reaches = () => hoverRules.some((x) => x.selectorText.split(',').some((sel) => { try { return card.matches(sel.replace(/:hover/g, '')); } catch (e) { return false; } }));
    const r3 = { rules: hoverRules.length >= 1 };
    card.removeAttribute('data-file-set'); r3.empty = reaches();
    s.push('setUploadedFileName', 'spixi-backup.ixi'); await sleep(20);
    r3.set = card.hasAttribute('data-file-set') && reaches();
    card.disabled = true; r3.disabledNot = !reaches(); card.disabled = false;
    r3.washOnly = hoverRules.every((x) => !x.style.getPropertyValue('background-color') && !/^background$/m.test([...x.style].join('\n')));
    ok(Object.values(r3).every(Boolean),
      '★ S20G F-4: the restore file card has a pointer hover (hover: hover and pointer: fine) in BOTH states — empty and file set — and none while disabled; a background-image wash over the state fill — ' + JSON.stringify({ r3, sels: hoverRules.map((x) => x.selectorText) }));
    ok(s.errs.length === 0, '★ S20G R-2 / R-3 / F-4: no page error — ' + JSON.stringify(s.errs.slice(0, 3)));
  } catch (e) {
    ok(false, '★ S20G l-forms threw: ' + (e && e.stack || e));
  } finally { if (s) s.close(); if (g) g.close(); }
}
