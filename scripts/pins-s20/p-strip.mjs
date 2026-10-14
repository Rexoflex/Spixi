/* ==== S20 P — A2 THE REPLY / EDIT STRIP: THE GROW LOOK, SMOOTH (#1378 "keep the grow, it needs to be smooth" · #1238 ·
 * CONTRACT-S20 "the A mechanism"), on the BUILT chat.html (jsdom + the p-kit stub layout). Asserted, executed:
 *   open  — the menu's Reply puts the strip in the pill at its FULL size at once and writes --composer-h ONCE (60 → 100)
 *           in that task — nothing in the 12 frames after; the grow is a CLIP on the pill (inset(40px … round r) →
 *           inset(0px …), --duration-200 on --easing-standard), the strip's content hidden to 30 % then faded in, the cost
 *           line above the pill rides translateY(40 → 0), the on-screen rows ride their displacement → 0; NO keyframe
 *           animates height / padding / margin
 *   close — ✕: the strip is [data-closing] + inert and still in the pill, the context is gone at once (data-ctx
 *           'closing'), the reserve is HELD (no write) while the clip closes (150 ms accelerate, fill forwards) and the
 *           rows slide down; the clip's end removes the strip, data-ctx and writes the reserve ONCE (100 → 60) in the
 *           same call, the row slide dropped with it
 *   m-5   — a Reply while a strip is half-way closed opens FROM the pill's top as it is on screen (clip 20 px, not 40)
 *           and does not move the reserve (it never left 100)
 *   belt  — a close whose timeline never ticks still ends (reserve written); a PAUSED one stays
 *   reduced motion — instant both ways, one write each.
 * Deliberate breaks (S20 P): ① a height keyframe back on the pill's grow → `noHeightAnim`; ② the reserve re-read with the
 * strip out of the layout at the START of the close (the old drop-at-once) → `heldReserve` + `endOneCall`; ③ `vis` without
 * the running clip (a reopen from 0) → `reopenFromOnScreen`; ④ (#46 r1) the open's finish keyed on the STRIP again
 * (`if (r && r.strip === strip) stopCtxRun(el)`, no stop of the previous run) → `closeInsideOpen`; ⑤ (#46 r1) no
 * stopLogSlide() in the hold's belt → `beltDropsSlide`. ==== */
import { pKit } from './p-kit.mjs';

export default async function (h) {
  const { ok } = h;
  const k = pKit(h);
  const { open, stub, frames, pick, strip, field, noErr, guard } = k;

  await guard('S20 P strip', async () => {
    const s = await open({ caps: 'reply,edit' });
    const { W, d } = s;
    const L = stub(s, { rows: 60 });
    const { log, box } = L;
    const comp = d.querySelector('.c-composer');
    W.Spixi.setComposerCost(comp, 'Sending messages costs 0.1 IXI per kB');
    await frames(W, 4);
    const r = {};
    const yOf = (fr) => parseFloat(String(fr.transform || fr.translate || '').replace(/^translateY\(|^0px\s+/, ''));
    const clipOf = (fr) => { const m = /^inset\(([\d.]+)px 0px 0px 0px round /.exec(String(fr.clipPath || '')); return m ? parseFloat(m[1]) : NaN; };
    /* OPEN */
    let ch0 = log.ch.length, a0 = log.anims.length, f0 = log.frame;
    r.picked = await pick(W, d, 'aa05', 'Reply');
    const st = strip(d);
    const chO = log.ch.slice(ch0);
    r.oneWriteOpen = chO.length === 1 && chO[0].v === '100px';
    const an = log.anims.slice(a0);
    const clipA = an.find((a) => a.el === field(d));
    const fadeA = an.find((a) => a.el === st);
    const costA = an.find((a) => a.el === d.querySelector('.c-composer__cost'));
    const rowsA = an.filter((a) => a.el.parentNode === box);
    r.clipGrow = !!clipA && clipOf(clipA.frames[0]) === 40 && clipOf(clipA.frames[1]) === 0 && clipA.opts.duration === 200
      && /cubic-bezier\(0\.2, ?0, ?0, ?1\)/.test(clipA.opts.easing) && (clipA.opts.fill || 'none') === 'none';
    r.fadeIn = !!fadeA && fadeA.frames.length === 3 && Number(fadeA.frames[0].opacity) === 0 && fadeA.frames[1].offset === 0.3 && Number(fadeA.frames[1].opacity) === 0 && Number(fadeA.frames[2].opacity) === 1;
    r.bandRides = !!costA && yOf(costA.frames[0]) === 40 && yOf(costA.frames[1]) === 0;
    r.rowsRide = rowsA.length > 0 && rowsA.every((a) => yOf(a.frames[0]) > 0 && yOf(a.frames[1]) === 0);
    r.noHeightAnim = an.every((a) => a.frames.every((fr) => !('height' in fr) && !('paddingTop' in fr) && !('marginTop' in fr) && !('borderBottomWidth' in fr)));
    await frames(W, 12);
    r.quietAfter = log.ch.length === ch0 + 1 && !!chO[0] && log.st.filter((w) => w.f > chO[0].f).length === 0;   // nothing after the Reply's own frame
    for (const a of an) a.finish();
    /* CLOSE */
    ch0 = log.ch.length; a0 = log.anims.length;
    d.querySelector('.c-composer__ctx-cancel').click();
    const closing = d.querySelector('.c-composer__ctx[data-closing]');
    r.closingInert = !!closing && closing.hasAttribute('inert') && closing.parentElement === field(d);
    r.ctxGoneAtOnce = W.Spixi.getComposerContext(comp) === null && field(d).dataset.ctx === 'closing';
    await frames(W, 4);
    r.heldReserve = log.ch.length === ch0;
    const cl = log.anims.slice(a0);
    const cClip = cl.find((a) => a.el === field(d));
    const cRows = cl.filter((a) => a.el.parentNode === box);
    r.clipClose = !!cClip && clipOf(cClip.frames[0]) === 0 && clipOf(cClip.frames[1]) === 40 && cClip.opts.duration === 150
      && /cubic-bezier\(0\.3, ?0, ?1, ?1\)/.test(cClip.opts.easing) && cClip.opts.fill === 'forwards'
      && cRows.length > 0 && cRows.every((a) => a.opts.fill === 'forwards' && yOf(a.frames[1]) > 0);
    const stBefore = box.scrollTop;
    cClip.finish();
    const chE = log.ch.slice(ch0);
    /* the rows slid down by exactly what the end's clamp moves them (7b: the held reply row sat 4 px off the end → 36) */
    r.endOneCall = !d.querySelector('.c-composer__ctx') && field(d).dataset.ctx === undefined && chE.length === 1 && chE[0].v === '60px'
      && cRows.every((a) => a.cancelled && yOf(a.frames[1]) === stBefore - box.scrollTop) && box.scrollTop <= L.maxTop();
    await frames(W, 3);
    /* m-5: a reply while a strip is HALF-WAY closed */
    await pick(W, d, 'aa05', 'Reply');
    for (const a of log.anims.slice(a0)) if (!a.cancelled) a.finish();
    ch0 = log.ch.length; a0 = log.anims.length;
    d.querySelector('.c-composer__ctx-cancel').click();
    const half = log.anims.slice(a0).find((a) => a.el === field(d));
    half.p = 0.5;   // the close is half-way on screen: 20 of the 40 px clipped
    const a1 = log.anims.length;
    await pick(W, d, 'aa01', 'Reply');
    const re = log.anims.slice(a1).find((a) => a.el === field(d) && clipOf(a.frames[1]) === 0);
    const reFade = log.anims.slice(a1).filter((a) => a.el === strip(d)).pop();
    r.reopenFromOnScreen = !!re && clipOf(re.frames[0]) === 20 && half.cancelled && d.querySelectorAll('.c-composer__ctx').length === 1
      && !!reFade && Number(reFade.frames[0].opacity) === 0   // the content still fades in (auditor C)
      && log.ch.length === ch0;
    for (const a of log.anims.slice(a1)) a.finish();
    /* ★ #46 r1 (MAJOR): a close INSIDE the open's 200 ms — the open's late finish must not end the close without its end
       (that left a ghost strip [data-closing] at opacity 1 and a held log slide that never let go) */
    for (const a of log.anims) if (a.playState === 'running') a.finish();
    d.querySelector('.c-composer__ctx-cancel').click();
    for (const a of log.anims) if (a.playState === 'running') a.finish();
    await frames(W, 2);
    a0 = log.anims.length;
    await pick(W, d, 'aa05', 'Reply');
    const openClip = log.anims.slice(a0).find((a) => a.el === field(d));
    ch0 = log.ch.length;
    openClip.p = 0.5;   // the open is half-way on screen
    const a4 = log.anims.length;
    d.querySelector('.c-composer__ctx-cancel').click();   // inside the open
    const closeClip = log.anims.slice(a4).find((a) => a.el === field(d));
    const closeRows = log.anims.slice(a4).filter((a) => a.el.parentNode === box);
    openClip.finish();   // the OPEN's onfinish fires late
    const alive = !!d.querySelector('.c-composer__ctx[data-closing]') && log.ch.length === ch0;
    closeClip.finish();
    r.closeInsideOpen = alive && openClip.cancelled && !d.querySelector('.c-composer__ctx') && field(d).dataset.ctx === undefined
      && log.ch.slice(ch0).map((x) => x.v).join() === '60px' && closeRows.every((a) => a.cancelled);
    /* the timer variant: nothing ticks — the close's own belt ends it, nothing is left held */
    a0 = log.anims.length;
    await pick(W, d, 'aa05', 'Reply');
    log.anims.slice(a0).find((a) => a.el === field(d)).p = 0.5;
    ch0 = log.ch.length;
    d.querySelector('.c-composer__ctx-cancel').click();
    await new Promise((res) => setTimeout(res, 450));
    r.closeInsideOpenTimer = !d.querySelector('.c-composer__ctx') && field(d).dataset.ctx === undefined && log.ch.slice(ch0).map((x) => x.v).join() === '60px';
    await pick(W, d, 'aa05', 'Reply');
    for (const a of log.anims) if (a.playState === 'running') a.finish();
    /* belt: a close that never ticks still ends; a paused one stays */
    ch0 = log.ch.length;
    d.querySelector('.c-composer__ctx-cancel').click();
    await new Promise((res) => setTimeout(res, 320));
    r.stalledEnds = !d.querySelector('.c-composer__ctx') && log.ch.length === ch0 + 1;
    await pick(W, d, 'aa05', 'Reply');
    for (const a of log.anims) if (a.playState === 'running') a.finish();
    a0 = log.anims.length;
    d.querySelector('.c-composer__ctx-cancel').click();
    log.anims.slice(a0).find((a) => a.el === field(d)).pause();
    await new Promise((res) => setTimeout(res, 320));
    r.pausedStays = !!d.querySelector('.c-composer__ctx[data-closing]');
    log.anims.slice(a0).find((a) => a.el === field(d)).finish();
    /* ★ #46 r1: a held close whose end never comes — the reserve belt lets go of the held row slide too (the height is
       unchanged, so this is the slide alone) */
    const a5 = log.anims.length;
    comp.dispatchEvent(new W.CustomEvent('c-composer-shift', { bubbles: true, detail: { phase: 'close', dy: 40, ms: 150, easing: 'linear' } }));
    const held = log.anims.slice(a5).filter((a) => a.el.parentNode === box);
    await new Promise((res) => setTimeout(res, 650));
    r.beltDropsSlide = held.length > 0 && held.every((a) => a.cancelled);
    /* reduced motion */
    d.documentElement.style.setProperty('--duration-200', '0ms');
    ch0 = log.ch.length; a0 = log.anims.length;
    await pick(W, d, 'aa05', 'Reply');
    d.querySelector('.c-composer__ctx-cancel').click();
    r.reducedInstant = log.anims.length === a0 && !d.querySelector('.c-composer__ctx') && log.ch.slice(ch0).map((x) => x.v).join() === '100px,60px';
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((v) => v === true),
      '★★ S20 P A2 (#1378 "keep the grow, it needs to be smooth") the reply strip on the BUILT chat shell: it lands at full size and the reserve moves ONCE (nothing in the next 12 frames); the GROW is a clip on the pill (40 → 0 px, 200 ms standard) with the content fading in after 30 %, the cost line and the rows riding a translateY; no height / padding / margin keyframe; ✕ holds the reserve (the strip [data-closing] + inert, the context gone at once) while the clip closes and the rows slide down, and the end removes the strip and writes the reserve once in the same call; a reopen half-way through a close starts from the on-screen clip; a stalled close ends, a paused one stays; reduced motion is instant — ' + JSON.stringify(r));
    W.close();
  });
}
