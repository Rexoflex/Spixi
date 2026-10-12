/* ==== S18 D1 (S17 walk DC-SCREEN-A, Damir 2026-10-12 17:17: "the Contributors heart motion is not noticeable") ====
 * On the BUILT settings.html (jsdom), through the real row (Account › Contributors):
 *   · the heart's float group (the .wn-bob in the .il.ct-l foreground layer) resolves to its OWN loop, ctBob, whose end frame
 *     travels TWICE today's shared wnBob (−10 px vs −5 px), at the heart's same 6 s (--d) and the same alternate loop;
 *   · the shared class is untouched elsewhere: a What's new scene's .wn-bob (illoWhatsNew 'hero') still resolves to wnBob,
 *     and wnBob still ends at −5 px;
 *   · reduced motion still stops it: the heart's group is a .wn-loop inside .il, and the built sheet's prefers-reduced-motion
 *     block holds `.il .wn-loop { animation: none !important }` (jsdom evaluates no media query, so the rule is read and the
 *     element is matched against it).
 * Deliberate break (S18 report): the .ct-l modifier dropped → the heart clause fails; the modifier written on bare .wn-bob →
 * the What's new clause fails. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  let s = null;
  const r = {};
  try {
    s = await K.boot('settings.html', { wait: 1200 });
    const { W, d } = s;
    const row = [...d.querySelectorAll('button')].find((x) => /^\s*Contributors/.test(x.textContent || ''));
    if (row) row.click();
    await sleep(300);
    const el = d.querySelector('.c-settings-contrib');
    const bob = el && [...el.querySelectorAll('svg.il.ct-l .wn-bob')];
    /* every keyframes / media rule of the built sheets */
    const rules = [];
    const walk = (list) => { for (const x of list) { rules.push(x); if (x.cssRules) walk(x.cssRules); } };
    for (const sh of d.styleSheets) { try { walk(sh.cssRules); } catch (e) { /* */ } }
    const kf = (n) => rules.find((x) => x.type === 7 && x.name === n);
    const endY = (n) => { const k = kf(n); const to = k && [...k.cssRules].find((x) => /^(to|100%)$/.test(x.keyText)); const m = to && /translateY\((-?[\d.]+)px\)/.exec(to.style.transform || to.cssText); return m ? Number(m[1]) : null; };
    const cs = (e) => W.getComputedStyle(e);
    const heart = bob && bob[0];
    const hc = heart ? cs(heart) : {};
    /* the tempo / loop come from the shared .wn-bob shorthand (jsdom expands no animation shorthand): the modifier may only
       swap the NAME — one declaration — so the heart keeps its 6 s (--d on the group), the easing, the delay and alternate */
    const base = rules.find((x) => x.type === 1 && x.selectorText === '.wn-bob');
    const mod = rules.find((x) => x.type === 1 && x.selectorText === '.il.ct-l .wn-bob');
    r.heart = !!heart && bob.length === 1 && hc.animationName === 'ctBob' && endY('ctBob') === -10
      && /--d:\s*6s/.test(heart.getAttribute('style') || '')
      && !!base && /wnBob var\(--d, ?5s\) ease-in-out var\(--ld\) infinite alternate/.test(base.style.animation || base.cssText)
      && !!mod && mod.style.length === 1 && mod.style.getPropertyValue('animation-name') === 'ctBob';
    r.heartDetail = r.heart || JSON.stringify({ n: bob && bob.length, name: hc.animationName, end: endY('ctBob'), base: base && base.cssText, mod: mod && mod.cssText });
    /* What's new keeps the shared loop */
    const wn = W.Spixi.illoWhatsNew('hero');
    const host = d.createElement('div'); host.append(wn.bg, wn.fg); d.body.append(host);
    const wb = host.querySelector('.wn-bob');
    /* jsdom resolves no animation SHORTHAND, so the cascade is matched by hand: NO rule that names another animation reaches
       the What's new group — only the shared .wn-bob shorthand (wnBob) does */
    const nameRules = rules.filter((x) => x.type === 1 && x.style && /\bwn-bob\b/.test(x.selectorText || '')
      && (x.style.getPropertyValue('animation-name') || /^\w+/.exec(x.style.animation || '') || [''])[0] && (() => { try { return wb.matches(x.selectorText); } catch (e) { return false; } })());
    const names = nameRules.map((x) => x.style.getPropertyValue('animation-name') || /^\w+/.exec(x.style.animation)[0]);
    r.whatsNew = !!wb && names.join() === 'wnBob' && cs(wb).animationName !== 'ctBob' && endY('wnBob') === -5;
    if (!r.whatsNew) r.wnDetail = JSON.stringify({ wb: !!wb, names, end: endY('wnBob') });
    /* reduced motion */
    const rm = rules.filter((x) => x.type === 4 && /prefers-reduced-motion:\s*reduce/.test(x.media && x.media.mediaText || x.conditionText || ''));
    const stop = rm.flatMap((m) => [...m.cssRules]).find((x) => x.selectorText === '.il .wn-loop' && /none/.test(x.style.animation || x.style.getPropertyValue('animation')) && x.style.getPropertyPriority('animation') === 'important');
    r.reduced = !!stop && !!heart && heart.matches('.il .wn-loop');
    if (r.heartDetail === true) delete r.heartDetail;
  } catch (e) { r.threw = e.message; }
  finally { if (s) s.close(); }
  ok(Object.values(r).every((v) => v === true),
    '★ S18 D1 (DC-SCREEN-A): the Contributors heart floats on its OWN loop (ctBob, −10 px = twice the shared wnBob −5 px, same 6 s, alternate) keyed on its .ct-l layer; What\'s new keeps wnBob (−5 px); reduced motion still stops it (.il .wn-loop → none !important) — ' + JSON.stringify(r));
}
