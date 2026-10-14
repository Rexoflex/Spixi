/* ==== S20 P — A1 THE ⊕ TRAY: ONE RESERVE MOVE, MOTION BY TRANSFORM (#1375 A1 · #1378 · CONTRACT-S20 "the A mechanism"),
 * on the BUILT chat.html (jsdom + the p-kit stub layout: a browser-like ResizeObserver, a recording WAAPI, logged
 * --composer-h and scrollTop writes with their frame). Asserted, executed:
 *   open  — the ⊕ tap puts data-tray-open on the bar AND data-open on the tray in the SAME task (no frame where the bar's
 *           foot dropped while the tray had no height — "the inset drop before every rise"); --composer-h is written
 *           EXACTLY ONCE (to the open slot), with ONE scrollTop write (the pin to the end), both in the tap's task, and
 *           NOTHING writes either in the 12 frames of the slide; the motion is transform only: the bar slides from where
 *           it was (+dy → 0), the tray from its height (T → 0), the on-screen rows from +dy → 0; no keyframe animates a
 *           height
 *   close — the ✕ tap keeps data-tray-open, the tray in the DOM and the reserve (no write) while the bar / tray / rows slide
 *           DOWN (fill forwards); the slide's end removes the tray, data-tray-open and writes the reserve ONCE, all in the
 *           same call, and the row transforms are dropped with it; the scrollTop it lands on is the new end (never past it)
 *   reduced motion (--duration-200: 0ms) — open / close are instant: no animate, still one write each.
 * Deliberate breaks (S20 P): ① data-open two rAFs after the mount again (the old rise path) → `sameTask` fails and
 * `oneWriteOpen` sees 2 writes (46 then 346); ② the S8 rAF belt back in publish (`requestAnimationFrame(() => pinLogEnd())`)
 * → `quietSlide` fails (a scrollTop write in a later frame); ③ removeAttribute('data-tray-open') at the START of the close
 * → `heldClose` fails; ④ (#46 r1) `grew && near` → `grew` in setLogReserve (a scrolled-up reader is pinned) → `readerKept`. ==== */
import { pKit } from './p-kit.mjs';

export default async function (h) {
  const { ok } = h;
  const k = pKit(h);
  const { open, stub, frames, onEl, noErr, guard, sleep } = k;

  await guard('S20 P tray', async () => {
    const s = await open({ caps: 'reply,edit' });
    const { W, d } = s;
    const L = stub(s, { rows: 60 });
    const { log, box } = L;
    await frames(W, 4);
    const r = {};
    const comp = d.querySelector('.c-composer');
    const attach = d.querySelector('.c-composer__attach');
    const muts = [];
    new W.MutationObserver((recs) => { muts.push(recs.map((x) => (x.target === comp ? 'bar:' : 'tray:') + x.attributeName)); })
      .observe(d.getElementById('chat-composer'), { subtree: true, attributes: true, attributeFilter: ['data-tray-open', 'data-open'] });
    r.atEndBefore = box.scrollTop === L.maxTop();
    /* OPEN */
    const ch0 = log.ch.length, st0 = log.st.length, a0 = log.anims.length;
    const f0 = log.frame;
    attach.click();
    const tray = d.querySelector('.c-attach-tray');
    r.sameTask = !!tray && comp.hasAttribute('data-tray-open') && tray.hasAttribute('data-open');
    await frames(W, 14);
    const chOpen = log.ch.slice(ch0), stOpen = log.st.slice(st0);
    r.oneWriteOpen = chOpen.length === 1 && chOpen[0].f === f0 && chOpen[0].v === '346px';
    r.mutOneBatch = muts.length === 1 && muts[0].includes('bar:data-tray-open') && muts[0].includes('tray:data-open');
    r.quietSlide = stOpen.length === 1 && stOpen[0].f === f0 && box.scrollTop === L.maxTop();
    const anims = log.anims.slice(a0);
    const barA = anims.find((a) => a.el === comp);
    const trayA = anims.find((a) => a.el === tray);
    const rowA = anims.filter((a) => a.el.parentNode === box);
    const y = (fr) => parseFloat(String(fr.transform || fr.translate || '').replace(/^translateY\(|^0px\s+/, ''));
    r.barSlides = !!barA && y(barA.frames[0]) === 286 && y(barA.frames[1]) === 0;   // 346 − 60: where the bar was
    r.traySlides = !!trayA && y(trayA.frames[0]) === 300 && y(trayA.frames[1]) === 0;
    r.rowsSlide = rowA.length > 0 && rowA.every((a) => y(a.frames[0]) === 286 && y(a.frames[1]) === 0);
    r.noHeightAnim = anims.every((a) => a.frames.every((fr) => !('height' in fr) && !('paddingTop' in fr) && !('marginTop' in fr)));
    for (const a of anims) a.finish();
    await frames(W, 3);
    /* CLOSE */
    const ch1 = log.ch.length, st1 = log.st.length, a1 = log.anims.length;
    attach.click();
    await frames(W, 6);
    r.heldClose = comp.hasAttribute('data-tray-open') && tray.isConnected && log.ch.length === ch1;
    const cl = log.anims.slice(a1);
    const cBar = cl.find((a) => a.el === comp), cTray = cl.find((a) => a.el === tray), cRows = cl.filter((a) => a.el.parentNode === box);
    r.slidesDown = !!cBar && !!cTray && cRows.length > 0 && y(cBar.frames[1]) === 286 && y(cTray.frames[1]) === 300 && cRows.every((a) => y(a.frames[1]) === 286)
      && [cBar, cTray, ...cRows].every((a) => a.opts.fill === 'forwards');
    cTray.finish();   // the slide's last frame
    const chEnd = log.ch.slice(ch1);
    r.endOneCall = !tray.isConnected && !comp.hasAttribute('data-tray-open') && chEnd.length === 1 && chEnd[0].v === '60px'
      && cRows.every((a) => a.cancelled) && cBar.cancelled;
    r.endAtEnd = box.scrollTop === L.maxTop() && log.st.slice(st1).every((w) => w.v <= L.maxTop());
    await frames(W, 4);
    r.noLateWrite = log.ch.length === ch1 + 1;
    /* ★ #46 r1 (auditor C): a reader scrolled UP keeps their place — the reserve still moves once, but no pin, no row slide */
    box.scrollTop = 200;
    const st3 = log.st.length, a3 = log.anims.length, c3 = log.ch.length;
    attach.click();
    await frames(W, 4);
    r.readerKept = box.scrollTop === 200 && log.st.length === st3 + 0 && log.ch.length === c3 + 1
      && log.anims.slice(a3).every((a) => a.el.parentNode !== box);
    for (const a of log.anims.slice(a3)) a.finish();
    attach.click();
    await frames(W, 2);
    for (const a of log.anims) if (a.playState === 'running') a.finish();
    await frames(W, 2);
    box.scrollTop = 1e9;
    /* reduced motion: instant, one write each way */
    d.documentElement.style.setProperty('--duration-200', '0ms');
    const ch2 = log.ch.length, a2 = log.anims.length;
    await frames(W, 2);
    attach.click();
    await frames(W, 3);
    const opened = !!d.querySelector('.c-attach-tray[data-open]') && comp.hasAttribute('data-tray-open');
    attach.click();
    await frames(W, 3);
    r.reducedInstant = opened && !d.querySelector('.c-attach-tray') && !comp.hasAttribute('data-tray-open')
      && log.anims.length === a2 && log.ch.slice(ch2).map((x) => x.v).join() === '346px,60px';
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((v) => v === true),
      '★★ S20 P A1 (#1378) the ⊕ tray on the BUILT chat shell: data-tray-open + data-open land in ONE task (no inset drop before the rise); the open writes --composer-h ONCE and scrollTop ONCE in the tap\'s task and nothing in the 12 frames of the slide; bar / tray / rows slide by transform (no height keyframe); the close HOLDS the attribute, the tray and the reserve while everything slides down, and its end removes the tray + the attribute + writes the reserve once in the same call, landing exactly at the end; reduced motion is instant — ' + JSON.stringify(r));
    W.close();
  });
}
