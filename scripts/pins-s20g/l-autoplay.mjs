/* ==== S20G F-2 — the welcome autoplay PAUSES on a manual nav and resumes after 15 s idle ====
 * On the BUILT intro.html (jsdom, phone UA), a fresh welcome shell built under FAKE timers (setInterval / setTimeout /
 * clear* recorded on the window; only the autoplay's own 7000 / 15000 ms timers are read):
 *   (1) boot: ONE 7000 ms interval, no resume timer.
 *   (2) a dot click → the interval is gone, ONE 15000 ms resume timer is live. ★ S20G C-F2 (WCAG 2.2.2) re-base: an arrow
 *       key on the dots puts KEYBOARD focus on a dot → the pause HOLDS with NO timer (a second arrow, a dot → dot focus move
 *       and a Tab keydown inside keep it held); focus leaving the carousel (focusout) re-arms ONE 15 s timer; ★ C-m2: a
 *       non-nav key (Tab) while paused re-arms it (a new id, still one); a swipe (pointerdown → pointerup 60 px left)
 *       → the same, and it pages; a plain touch on the welcome while paused re-arms it too.
 *   (3) the resume timer fires → the next slide is selected and ONE 7000 ms interval runs again (7 s per slide).
 *       ★ C-m2: while RUNNING a pointerdown (or a key) on the welcome pauses nothing; keyboard focus INTO the carousel
 *       (focusin) pauses with no timer, a blur re-arms the 15 s; a POINTER-made focus (pointerdown first) is no hold, and
 *       a tapped dot then arms the 15 s; on a fresh shell a focus with no input event at all (assistive tech) holds.
 *   (4) Create (a CTA) ends it for good: no interval, no resume timer, and a later dot click arms nothing; Restore the same.
 *   (5) reduced motion: no interval at boot, a dot click arms no resume timer, a focus in / out arms nothing.
 * Deliberate breaks (S20G report): ① the dot click back to stopAuto() → (2) dot fails (no resume timer);
 *   ② pauseAuto without clearTimeout(resumeT) → (2) one fails (two resume timers); ③ RESUME_MS 15000 → 10000 → (2) fails;
 *   ④ the resume callback without runAuto() → (3) fails; ⑤ stopAuto keeping autoOn → (4) fails (a later dot arms a timer).
 *   C-F2 / C-m2 (S20G r1): ⑥ the focusin listener removed → arrowHolds / focusinHolds / atFocusHolds fail; ⑦ focusout without
 *   pauseAuto() → focusoutRearms / blurRearms fail; ⑧ the bubbling keydown re-arm listener removed → tabRearms fails;
 *   ⑨ the pointerdown listener pausing unconditionally → ptrRunningNoPause fails; ⑩ focusin ignoring the pointer modality →
 *   pointerFocusNoHold fails; ⑪ focusout not checking relatedTarget → innerHolds fails (a 15 s timer armed and cleared on a dot → dot move). */
import { on1Kit } from '../pins-on1/kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = on1Kit(h);
  let s = null;
  try {
    s = await boot({ ua: 'phone' });
    const { W, d } = s;
    /* the fake clock: every timer the shell makes is recorded, live until cleared; nothing runs by itself */
    const live = new Map();
    let seq = 1, made15 = 0;   // made15: every 15 s timer ever armed (a spurious arm + clear is caught too)
    const real = { si: W.setInterval, st: W.setTimeout, ci: W.clearInterval, ct: W.clearTimeout };
    const install = () => {
      W.setInterval = (fn, ms) => { const id = seq++; live.set(id, { fn, ms, kind: 'i' }); return id; };
      W.setTimeout = (fn, ms) => { const id = seq++; if (ms === 15000) made15++; live.set(id, { fn, ms, kind: 't' }); return id; };
      W.clearInterval = (id) => { live.delete(id); };
      W.clearTimeout = (id) => { live.delete(id); };
    };
    const restore = () => { W.setInterval = real.si; W.setTimeout = real.st; W.clearInterval = real.ci; W.clearTimeout = real.ct; };
    const auto = () => [...live.values()].filter((t) => t.kind === 'i' && t.ms === 7000).length;
    const resume = () => [...live.entries()].filter(([, t]) => t.kind === 't' && t.ms === 15000);
    const sel = (sh) => [...sh.querySelectorAll('.c-launch__dot')].findIndex((b) => b.getAttribute('aria-selected') === 'true');
    const realMM = W.matchMedia;
    const build = (reduce) => {
      W.matchMedia = (q) => ({ matches: !!reduce && /prefers-reduced-motion:\s*reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      const sh = W.Spixi.createLaunchShell({ view: 'welcome' });
      d.body.append(sh);
      W.matchMedia = realMM;
      return sh;
    };
    const ptr = (el, type, x) => { const e = new W.Event(type, { bubbles: true }); e.clientX = x; el.dispatchEvent(e); };
    let sh = null, shR = null, sh2 = null;
    const r = {};
    install();
    try {
      for (const old of d.querySelectorAll('.c-launch')) old.remove();   // the boot shell's own timers self-stop once detached
      live.clear();
      /* (1) */
      sh = build(false);
      r.boot = auto() === 1 && resume().length === 0;
      /* (2) */
      const dots = [...sh.querySelectorAll('.c-launch__dot')];
      dots[2].click();
      r.dot = auto() === 0 && resume().length === 1 && sel(sh) === 2;
      const rid0 = () => (resume()[0] || [])[0];   // the live resume timer's id (undefined when none)
      const key = (el, k) => el.dispatchEvent(new W.KeyboardEvent('keydown', { key: k, bubbles: true }));
      const welcome = sh.querySelector('.c-launch__welcome');
      const createBtn = sh.querySelectorAll('.c-launch__ctas .c-button')[0];
      const dotsBox = sh.querySelector('.c-launch__dots');
      const held = () => auto() === 0 && resume().length === 0;
      /* (2a) ★ C-F2: an arrow key moves keyboard focus onto a dot (the shell's own .focus()) → the pause HOLDS, no timer */
      key(dotsBox, 'ArrowLeft');
      r.arrowHolds = held() && sel(sh) === 1 && d.activeElement === dots[1];
      key(dotsBox, 'ArrowRight');
      r.arrowStillHeld = held() && sel(sh) === 2 && d.activeElement === dots[2];
      const made0 = made15;
      dots[0].focus();                               // focus moving dot → dot (relatedTarget inside) keeps the hold
      key(dots[0], 'Tab');                           // a key while held arms nothing
      r.innerHolds = held() && d.activeElement === dots[0] && made15 === made0;
      /* (2b) ★ C-F2 / C-m2: focus leaves the carousel → focusout re-arms ONE 15 s timer */
      createBtn.focus();
      r.focusoutRearms = auto() === 0 && resume().length === 1 && sel(sh) === 2;
      /* (2c) ★ C-m2: a non-nav key (Tab) while paused re-arms it (a new timer, still one) */
      const beforeTab = rid0();
      key(createBtn, 'Tab');
      r.tabRearms = auto() === 0 && resume().length === 1 && rid0() !== beforeTab;
      const car = sh.querySelector('.c-launch__carousel');
      const beforeSwipe = rid0();
      ptr(car, 'pointerdown', 200); ptr(car, 'pointerup', 140);
      r.swipe = auto() === 0 && resume().length === 1 && rid0() !== beforeSwipe && sel(sh) === 3;
      const beforeTouch = rid0();
      ptr(welcome, 'pointerdown', 10);
      r.touchRearms = resume().length === 1 && rid0() !== beforeTouch && sel(sh) === 3;
      /* (3) */
      const fire = () => { const [rid, rt] = resume()[0] || []; if (rt) { live.delete(rid); rt.fn(); } return !!rt; };
      r.resumes = fire() && sel(sh) === 0 && auto() === 1 && resume().length === 0;
      /* (3b) ★ C-m2: while RUNNING a pointerdown (and a key) pauses nothing */
      ptr(welcome, 'pointerdown', 10);
      key(createBtn, 'Tab');
      r.ptrRunningNoPause = auto() === 1 && resume().length === 0;
      /* (3c) ★ C-F2 / C-m2: keyboard focus INTO the carousel while running → paused, NO timer; blur → re-armed */
      dots[1].focus();
      r.focusinHolds = held() && sel(sh) === 0;
      dots[1].blur();
      r.blurRearms = auto() === 0 && resume().length === 1;
      r.resumes2 = fire() && auto() === 1;
      /* (3d) a POINTER-made focus is not a hold (a tapped dot pauses with the 15 s, like any click) */
      ptr(dots[2], 'pointerdown', 10);
      dots[2].focus();
      r.pointerFocusNoHold = auto() === 1 && resume().length === 0;
      dots[2].click();
      r.pointerClickArms = auto() === 0 && resume().length === 1 && sel(sh) === 2;
      createBtn.focus();
      /* (3d2) ★ r2 M-2: the pointer modality is time-boxed — an AT focus > 1 s after a pointerdown HOLDS again */
      r.resumes3 = fire() && auto() === 1;
      ptr(welcome, 'pointerdown', 10);
      await sleep(1100);
      dots[1].focus();
      r.lateFocusHolds = held();
      dots[1].blur();
      createBtn.focus();
      /* (3e) an assistive-tech focus with no input event at all (fresh shell) holds too */
      const ours = (t) => (t.kind === 'i' && t.ms === 7000) || (t.kind === 't' && t.ms === 15000);
      const idsBefore = new Set(live.keys());
      const sh3 = build(false);
      const mine = () => [...live.entries()].filter(([k, t]) => !idsBefore.has(k) && ours(t)).map(([, t]) => t.kind + t.ms);
      const runs3 = mine().join() === 'i7000';
      sh3.querySelectorAll('.c-launch__dot')[1].focus();
      r.atFocusHolds = runs3 && mine().length === 0;
      sh3.remove();
      /* (4) */
      dots[0].click();
      const ctas = sh.querySelectorAll('.c-launch__ctas .c-button');
      ctas[0].click();
      r.createEnds = auto() === 0 && resume().length === 0;
      dots[1].click();
      r.deadStaysDead = auto() === 0 && resume().length === 0;
      sh.remove();
      sh2 = build(false);
      sh2.querySelectorAll('.c-launch__ctas .c-button')[1].click();
      sh2.querySelectorAll('.c-launch__dot')[1].click();
      r.restoreEnds = auto() === 0 && resume().length === 0;
      sh2.remove();
      /* (5) */
      live.clear();
      shR = build(true);
      r.reducedNone = auto() === 0;
      shR.querySelectorAll('.c-launch__dot')[2].click();
      r.reducedNoResume = resume().length === 0 && auto() === 0;
      const rd = shR.querySelectorAll('.c-launch__dot')[1];
      rd.focus(); rd.blur();
      r.reducedFocusNone = resume().length === 0 && auto() === 0;
      shR.remove();
    } finally { restore(); W.matchMedia = realMM; }
    ok(Object.values(r).every(Boolean),
      '★ S20G F-2: a manual nav (dot / arrow / swipe) PAUSES the 7 s autoplay — ONE 15 s resume timer, re-armed by every further input; ★ C-F2: keyboard / AT focus inside the carousel holds it with NO timer, focusout re-arms; it resumes on the next slide with the 7 s interval; Create / Restore end it for good; reduced motion never starts it — ' + JSON.stringify(r));
    ok(s.errs.length === 0, '★ S20G F-2: no page error — ' + JSON.stringify(s.errs.slice(0, 3)));
  } catch (e) {
    ok(false, '★ S20G F-2 l-autoplay threw: ' + (e && e.stack || e));
  } finally { if (s) s.close(); }
}
