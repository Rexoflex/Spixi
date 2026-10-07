/* ==== S8 PICKS (P-G) — #1238 THE COMPOSER STRIP GROWS, on the BUILT chat shell (jsdom; the shared 7b boot kit).
 * jsdom has no WAAPI, so Element.prototype.animate is a RECORDING stub (the call, its keyframes, its options; finish /
 * cancel driven by the pin) and the strip reports a 40 px box. Asserted:
 *   · a FRESH Reply strip grows: ONE animate on the strip, duration = --duration-200, easing = --easing-standard, no
 *     fill; keyframes 0 → full (height / padding / margin / hairline from 0, opacity 0 held to 30 %, then 1)
 *   · Reply → Edit is a SWAP in place: no second animate, no closing strip, one strip in the pill
 *   · ✕ collapses it: animate 150 ms (0.75 ×) on --easing-accelerate, fill forwards, opacity 0 by 50 %; the strip is
 *     [data-closing] + inert and STILL in the pill, the context is gone at once (getComposerContext = null, the back
 *     mirror sends ixian:chatoverlay:0 before the end); onfinish removes it and the field's data-ctx
 *   · a reply while a strip is closing drops the closing one at once (its animation cancelled) and grows the new one
 *     FROM the closing strip's box as it is on screen (★ #46 r1 m-5 — break: fromBox not passed → reopenFromOnScreen)
 *   · a timeline that never ticks (no onfinish) still ends: the strip leaves after the duration + slack; a PAUSED one stays
 *   · reduced motion (--duration-200: 0ms): no animate, the close is immediate
 *   · the slot ResizeObserver pins the log IN its callback: a grow while at the bottom puts scrollTop at the end
 *     before any frame runs (the rAF stays as the belt) ==== */
import { s1Kit } from '../pins-s7b/s1-boot.mjs';

export default async function (h) {
  const { ok } = h;
  const k = s1Kit(h);
  const { open, pick, strip, field, noErr, guard, sleep } = k;

  const arm = (W) => {
    const calls = [];
    W.Element.prototype.animate = function (frames, opts) {
      const a = { el: this, frames, opts, playState: 'running', cancelled: false, onfinish: null,
        cancel() { this.cancelled = true; this.playState = 'idle'; },
        pause() { this.playState = 'paused'; },
        finish() { this.playState = 'finished'; if (this.onfinish) this.onfinish(); } };
      calls.push(a);
      return a;
    };
    Object.defineProperty(W.HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return this.classList && this.classList.contains('c-composer__ctx') ? 40 : 0; } });
    return calls;
  };
  const onStrip = (calls) => calls.filter((c) => c.el.classList.contains('c-composer__ctx'));

  await guard('S8 #1238 grow', async () => {
    const s = await open({ caps: 'reply,edit' });
    const { W, d, sent } = s;
    const calls = arm(W);
    const r = {};
    const comp = d.querySelector('.c-composer');
    /* open */
    await pick(W, d, 'aa05', 'Reply');
    const o = onStrip(calls);
    const st = strip(d);
    r.oneOpen = o.length === 1 && o[0].el === st;
    const fr = o[0] ? o[0].frames : [];
    r.openTiming = !!o[0] && o[0].opts.duration === 200 && /cubic-bezier\(0\.2, ?0, ?0, ?1\)/.test(o[0].opts.easing) && (o[0].opts.fill || 'none') === 'none';
    r.openFrames = fr.length === 3 && fr[0].height === '0px' && fr[0].paddingTop === '0px' && fr[0].marginTop === '0px' && fr[0].borderBottomWidth === '0px'
      && Number(fr[0].opacity) === 0 && fr[1].offset === 0.3 && Number(fr[1].opacity) === 0 && fr[2].offset === 1 && Number(fr[2].opacity) === 1 && 'height' in fr[2];
    o[0] && o[0].finish();
    r.openSettled = !st.hasAttribute('data-closing') && st.style.overflow === '';
    /* swap */
    await pick(W, d, 'aa02', 'Edit');
    r.swap = onStrip(calls).length === 1 && d.querySelectorAll('.c-composer__ctx').length === 1 && strip(d).dataset.kind === 'edit' && !d.querySelector('[data-closing]');
    /* close — after the menu's own overlay sync has settled, so the only mirror line is the strip's */
    await sleep(500);
    const n0 = sent.length;
    d.querySelector('.c-composer__ctx-cancel').click();
    const c = onStrip(calls)[1];
    const closing = d.querySelector('.c-composer__ctx[data-closing]');
    r.closeTiming = !!c && c.opts.duration === 150 && /cubic-bezier\(0\.3, ?0, ?1, ?1\)/.test(c.opts.easing) && c.opts.fill === 'forwards'
      && c.frames.length === 3 && c.frames[1].offset === 0.5 && Number(c.frames[1].opacity) === 0 && c.frames[2].height === '0px';
    r.closingInert = !!closing && closing.hasAttribute('inert') && closing.parentElement === field(d);
    r.ctxGoneAtOnce = W.Spixi.getComposerContext(comp) === null && field(d).dataset.ctx === 'closing';
    await sleep(20);
    r.mirrorOffNow = sent.slice(n0).filter((x) => /^ixian:chatoverlay:/.test(x)).pop() === 'ixian:chatoverlay:0' && !!d.querySelector('[data-closing]');
    c && c.finish();
    r.removedAtEnd = !d.querySelector('.c-composer__ctx') && field(d).dataset.ctx === undefined;
    /* a reply while closing */
    await pick(W, d, 'aa05', 'Reply');
    await sleep(500);
    const n1 = sent.length;
    d.querySelector('.c-composer__ctx-cancel').click();
    const closingA = onStrip(calls).pop();
    await sleep(20);
    /* a REPLY close too (an edit's close also flips the send disc's data-ctx, which would sync the mirror on its own) */
    r.replyMirrorOffNow = sent.slice(n1).filter((x) => /^ixian:chatoverlay:/.test(x)).pop() === 'ixian:chatoverlay:0' && !!d.querySelector('[data-closing]');
    /* ★ #46 r1 (S8 picks m-5): the closing strip is part-way down (23 px on screen) — the new strip grows FROM that box,
       never from 0 (a close + reopen inside 150 ms dropped the slot 32 px in one frame) */
    closingA.el.style.height = '23px';
    await pick(W, d, 'aa01', 'Reply');
    const fresh = onStrip(calls).pop();
    r.closingDropped = closingA.cancelled && d.querySelectorAll('.c-composer__ctx').length === 1 && !d.querySelector('[data-closing]')
      && fresh !== closingA && field(d).dataset.ctx === 'reply';
    r.reopenFromOnScreen = !!fresh && fresh.frames[0].height === '23px' && Number(fresh.frames[0].opacity) === 0 && fresh.frames[2].offset === 1;
    fresh.finish();
    /* a timeline that never ticks: no onfinish → the strip still leaves (duration + slack); a paused one stays */
    d.querySelector('.c-composer__ctx-cancel').click();
    await sleep(320);
    r.stalledEnds = !d.querySelector('.c-composer__ctx') && field(d).dataset.ctx === undefined;
    await pick(W, d, 'aa05', 'Reply');
    onStrip(calls).pop().finish();
    d.querySelector('.c-composer__ctx-cancel').click();
    onStrip(calls).pop().pause();
    await sleep(320);
    r.pausedStays = !!d.querySelector('.c-composer__ctx[data-closing]');
    onStrip(calls).pop().finish();
    /* reduced motion: the token is 0 ms → no animate, immediate close */
    d.documentElement.style.setProperty('--duration-200', '0ms');
    const before = calls.length;
    await pick(W, d, 'aa05', 'Reply');
    d.querySelector('.c-composer__ctx-cancel').click();
    r.reducedInstant = calls.length === before && !d.querySelector('.c-composer__ctx');
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((v) => v === true),
      '★ S8 picks (#1238) THE STRIP GROWS on the built chat shell: a fresh Reply strip grows 0 → full on --duration-200 / --easing-standard (text hidden for the first 30 %), Reply → Edit swaps in place, ✕ collapses it in 150 ms on --easing-accelerate with the strip [data-closing] + inert and the context (and the back mirror) gone at once, the end removes it; a new reply drops a closing strip; a stalled timeline still ends (a paused one is left alone); reduced motion is instant — ' + JSON.stringify(r));
    W.close();
  });

  await guard('S8 #1238 RO pin', async () => {
    const s = await open({ caps: 'reply,edit' });
    const { W, d, ro } = s;
    const r = {};
    d.dispatchEvent(new W.Event('wheel', { bubbles: true }));   // a user input ends the boot re-pin window (as swipe.mjs)
    const box = d.getElementById('messages');
    const g = { sh: 3400, ch: 600, pill: 60 };
    let top = 2800;
    Object.defineProperty(box, 'scrollHeight', { configurable: true, get: () => g.sh });
    Object.defineProperty(box, 'clientHeight', { configurable: true, get: () => g.ch });
    Object.defineProperty(box, 'scrollTop', { configurable: true, get: () => top, set: (v) => { top = Math.max(0, Math.min(g.sh - g.ch, Number(v) || 0)); } });
    const slot = d.getElementById('chat-composer');
    Object.defineProperty(slot, 'offsetHeight', { configurable: true, get: () => g.pill });
    const fire = () => { for (const cb of ro) { try { cb([]); } catch (e) {} } };
    fire();   // baseline 60
    /* the pill grows 60 → 100 and the log's reserve with it: at the bottom before, at the end AFTER THE CALLBACK — no frame */
    g.pill = 100; g.sh = 3440;
    fire();
    r.pinnedInCallback = top === 2840;
    /* a reader scrolled up keeps their place */
    top = 1000; g.pill = 140; g.sh = 3480;
    fire();
    r.readerKept = top === 1000;
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((v) => v === true),
      '★ S8 picks (#1238) the composer slot ResizeObserver re-pins the log INSIDE its callback on the built chat shell — a ResizeObserver runs after layout and before paint, so the bubbles move in the SAME frame as the growing pill (the rAF-only pin trailed a frame: the s8x prototype measured −7 px reply / −9…−12 px edit); a reader scrolled up is left alone — ' + JSON.stringify(r));
    W.close();
  });
}
