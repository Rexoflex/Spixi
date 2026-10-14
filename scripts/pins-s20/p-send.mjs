/* ==== S20 P — A3 A LONG SEND NEVER SCROLLS PAST THE END (#1375 A3 · #1378 · #1301 · CONTRACT-S20 "the A mechanism"),
 * on the BUILT chat.html (jsdom + the p-kit stub layout: while the box carries data-rise and a row data-rise-row, the
 * scrollable box is --rise-h taller — the space the rise's transform BORROWS; the observer fires after the frame's rAF
 * callbacks, like a browser's). Asserted, executed:
 *   fast   — a 2-line field (reserve 84) is sent and C#'s addMe lands in the SAME task: the row and the field's shrink land
 *            in ONE render, the rise is row − shrink (40 − 24 = 16), NO scrollTop write targets space beyond the final end,
 *            after the rise the log is exactly at its end
 *   echo   — (#46 r1 MINOR-5) the addMe 90 ms later: nothing moves before it (the shrink waits), then the --composer-h write
 *            and the pin land in the row's frame with the 16 px rise
 *   slow   — (#46 r2) an echo at 900 ms / none: the shrink waits 250 ms, then SLIDES (rows from −24 → 0, 200 ms) — never a
 *            snap; the late row rises by its own 40 px
 *   reply  — a 2-line REPLY send: the strip's close is held (150 ms) while the field's reset lands at once and the row
 *            rises; the strip's end shrinks the reserve DURING the rise — the clamp lands on the log's real end (never in
 *            the borrowed space), so when the rise ends there is nothing to snap; one --composer-h write for the reset,
 *            one for the strip's end
 * Deliberate breaks (S20 P): ① no syncLogReserve at the top of renderLogNow → `fastNoBeyond` (the render pins on the
 * 132 px reserve: 72 px past the end); ② the shrink clamp reads `box.scrollHeight - box.clientHeight` instead of
 * logEndTop() → `replyLanded` (the end stays in the borrowed space: the snap); ③ (#46 r1) no shrink wait in syncLogReserve
 * (`sendRowPending()` → false) → `echoNoDropFirst` (the 24 px drop before the row); ④ (#46 r1 NIT) bootRepin back on
 * `scrollHeight - clientHeight` → `bootRepinNoBeyond`; ⑤ (#46 r2) the fallback lands as a snap (no motion) →
 * `echoSlowSlides` + `echoNoneSlides`. ==== */
import { pKit } from './p-kit.mjs';

export default async function (h) {
  const { ok } = h;
  const k = pKit(h);
  const { open, stub, frames, pick, type, noErr, guard } = k;
  const NOW = Math.floor(Date.now() / 1000);
  const FOUR = 'one\ntwo\nthree\nfour';
  const TWO = 'one\ntwo';
  const me = (id, text) => ['addMe', id, 'addrMe', 'Me', '', text, String(NOW), 'False', 'False', 'False', 'False', 'False'];

  await guard('S20 P send', async () => {
    const s = await open({ caps: 'reply,edit' });
    const { W, d } = s;
    const L = stub(s, { rows: 60 });
    const { log, box } = L;
    await frames(W, 4);
    const r = {};
    /* FAST: C#'s row in the send's own task — a 2-line field (reserve 84): the row (40) and the shrink (24) land together,
       the rise is 40 − 24 = 16 px (★ #46 r1 MINOR-5: one Δ) */
    type(W, d, TWO);
    await frames(W, 3);
    r.grew = log.ch.length > 0 && log.ch[log.ch.length - 1].v === '84px' && box.scrollTop === L.maxTop();
    let st0 = log.st.length;
    d.querySelector('.c-composer__action').click();
    s.push(...me('n1', TWO));
    await frames(W, 3);
    r.rises = box.hasAttribute('data-rise') && box.style.getPropertyValue('--rise-h') === '16px' && !!d.querySelector('#messages [data-msgid="n1"][data-rise-row]');
    await new Promise((res) => setTimeout(res, 320));   // the rise is over
    const endFast = L.maxTop();
    r.fastNoBeyond = log.st.slice(st0).every((w) => w.v <= endFast);
    r.fastAtEnd = !box.hasAttribute('data-rise') && box.scrollTop === endFast;
    /* ★ #46 r1 MINOR-5 — the echo ~90 ms later: the shrink WAITS for the row (no drop first), then lands in the row's frame */
    type(W, d, TWO);
    await frames(W, 3);
    st0 = log.st.length;
    let chW = log.ch.length;
    d.querySelector('.c-composer__action').click();
    await new Promise((res) => setTimeout(res, 90));
    r.echoNoDropFirst = log.ch.length === chW && log.st.length === st0;
    s.push(...me('n3', TWO));
    await frames(W, 3);
    const lw = log.ch.slice(chW), sw = log.st.slice(st0);
    r.echoOneFrame = lw.length === 1 && lw[0].v === '60px' && sw.length > 0 && sw.every((w) => w.f === lw[0].f) && box.style.getPropertyValue('--rise-h') === '16px';
    await new Promise((res) => setTimeout(res, 320));
    /* ★ #46 r2: no echo / a SLOW echo (900 ms) — after the short wait (250 ms) the shrink SLIDES: the rows start where they
       were (−24) and ride down to their place (no single-frame jump); the late row then rises by its own height */
    const yOf = (fr) => parseFloat(String(fr.transform || fr.translate || '').replace(/^translateY\(|^0px\s+/, ''));
    for (const late of [900, 0]) {
      for (const a of log.anims) if (a.playState === 'running') a.finish();
      await new Promise((res) => setTimeout(res, 300));
      type(W, d, TWO);
      await frames(W, 3);
      chW = log.ch.length;
      const aS = log.anims.length;
      d.querySelector('.c-composer__action').click();
      await new Promise((res) => setTimeout(res, 150));
      const held = log.ch.length === chW;
      await new Promise((res) => setTimeout(res, 200));
      const slid = log.anims.slice(aS).filter((a) => a.el.parentNode === box);
      const ok1 = held && log.ch.slice(chW).map((x) => x.v).join() === '60px' && box.scrollTop === L.maxTop()
        && slid.length > 0 && slid.every((a) => yOf(a.frames[0]) === -24 && yOf(a.frames[1]) === 0 && a.opts.duration === 200);
      if (late) {
        await new Promise((res) => setTimeout(res, late - 350));
        s.push(...me('n5', TWO));
        await frames(W, 3);
        r.echoSlowSlides = ok1 && box.style.getPropertyValue('--rise-h') === '40px';
        await new Promise((res) => setTimeout(res, 320));
      } else r.echoNoneSlides = ok1;
    }
    /* REPLY: the strip's end lands inside the rise */
    await pick(W, d, 'aa05', 'Reply');
    for (const a of log.anims) if (a.playState === 'running') a.finish();
    type(W, d, TWO);
    await frames(W, 3);
    st0 = log.st.length;
    const ch0 = log.ch.length, a0 = log.anims.length;
    d.querySelector('.c-composer__action').click();
    s.push(...me('n2', TWO));
    await frames(W, 3);
    const rising = box.hasAttribute('data-rise');
    const clip = log.anims.slice(a0).find((a) => a.el.classList.contains('c-composer__field'));
    if (clip) clip.finish();   // the strip's end, while the rows still rise
    const midSt = box.scrollTop;
    await new Promise((res) => setTimeout(res, 320));
    const endReply = L.maxTop();
    r.replyRising = rising && !!clip;
    r.replyLanded = !box.hasAttribute('data-rise') && midSt === endReply && box.scrollTop === endReply;   // landed mid-rise on the end it keeps
    r.replyWrites = log.ch.slice(ch0).map((x) => x.v).join() === '100px,60px';
    /* ★ #46 r1 NIT: inside the open's 2 s boot re-pin window a rise never lets the re-pin into the borrowed space */
    for (const a of log.anims) if (a.playState === 'running') a.finish();
    s.push('onChatScreenLoaded');
    await frames(W, 2);
    type(W, d, TWO);
    await frames(W, 3);
    st0 = log.st.length;
    d.querySelector('.c-composer__action').click();
    s.push(...me('n4', TWO));
    await new Promise((res) => setTimeout(res, 320));
    const endBoot = L.maxTop();
    r.bootRepinNoBeyond = log.st.slice(st0).length > 0 && log.st.slice(st0).every((w) => w.v <= endBoot) && box.scrollTop === endBoot;
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((v) => v === true),
      '★★ S20 P A3 (#1378) a 4-line send on the BUILT chat shell never scrolls past the end: with C#\'s row landing before the observer\'s frame the render re-reserves for the reset field first, the row still rises, no scrollTop write targets space beyond the final end; a 4-line REPLY send whose strip ends DURING the rise clamps to the log\'s real end (never the space the rise borrows) — nothing to snap when the rise ends — ' + JSON.stringify(r));
    W.close();
  });
}
