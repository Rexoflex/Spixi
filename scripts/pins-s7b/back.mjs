/* ==== SESSION 7b — ★ 7b (#1219) BACK CLOSES THE STRIP, EXECUTED on the BUILT chat.html (jsdom, phone).
 *   · the strip's open re-syncs the back mirror (ixian:chatoverlay:1 — C# then routes hardware Back INTO the shell), its
 *     close sends ixian:chatoverlay:0
 *   · hardware Back (C# pushes chatBack) with a REPLY strip: the strip closes, the field is NOT focused (no keyboard after
 *     Back), no ixian:back; the mirror is 0 again, so the next Back pops the page natively
 *   · with an EDIT strip: the strip closes and the draft from before the edit is back in the field
 *   · the iOS edge swipe (touchstart ≤ 24 px, > 70 px right): the first closes the strip and sends NO ixian:back, the second
 *     sends ixian:back
 * Deliberate breaks: see the hand-back. */
import { s1Kit } from './s1-boot.mjs';

export default async function (h) {
  const { ok } = h;
  const k = s1Kit(h);
  const { open, strip, input, pick, swipe, type, noErr, guard, sleep } = k;
  const edge = (W, d, dx) => {
    const ev = (name, x) => {
      const e = new W.Event(name, { bubbles: true, cancelable: true });
      Object.defineProperty(e, 'touches', { value: name === 'touchend' ? [] : [{ clientX: x, clientY: 300 }] });
      d.dispatchEvent(e);
    };
    ev('touchstart', 8);
    ev('touchmove', 8 + Math.round(dx / 2));
    ev('touchmove', 8 + dx);
    ev('touchend', 8 + dx);
  };

  await guard('#1219 back', async () => {
    const s = await open({ caps: 'reply,edit' });
    const { W, d, push, sent } = s;
    const r = {};
    const since = (n) => sent.slice(n);
    /* a. a reply strip (the phone swipe — no menu, so the mirror's 1 is the strip's alone) → the mirror says 1 */
    let n0 = sent.length;
    await swipe(W, d, 'aa01', 90);
    await sleep(30);
    r.replyOpen = !!strip(d);
    r.mirrorOn = since(n0).filter((c) => /^ixian:chatoverlay:/.test(c)).pop() === 'ixian:chatoverlay:1';
    /* b. hardware Back → the strip closes, no focus, no ixian:back, the mirror 0 */
    n0 = sent.length;
    push('chatBack');
    await sleep(30);
    r.backClosed = !strip(d);
    r.backNoFocus = d.activeElement !== input(d);
    r.backNoPop = !since(n0).includes('ixian:back');
    r.mirrorOff = since(n0).filter((c) => /^ixian:chatoverlay:/.test(c)).pop() === 'ixian:chatoverlay:0';
    /* c. an EDIT strip: Back gives the draft back */
    type(W, d, 'my unsent draft');
    await pick(W, d, 'aa02', 'Edit');
    await sleep(700);   // the menu sheet's exit (its data-overlay-open) is over — the mirror is the strip's alone
    r.editOpen = !!strip(d) && input(d).value === 'my own words';
    n0 = sent.length;
    push('chatBack');
    await sleep(30);
    r.editBackDraft = !strip(d) && input(d).value === 'my unsent draft' && !since(n0).includes('ixian:back');
    type(W, d, '');
    /* d. the edge swipe: 1st = the strip, 2nd = ixian:back */
    await sleep(450);   // past the last swipe's click guard
    await swipe(W, d, 'aa01', 90);
    n0 = sent.length;
    edge(W, d, 100);
    await sleep(30);
    r.edgeClosed = !strip(d) && !since(n0).includes('ixian:back');
    r.edgeNoFocus = d.activeElement !== input(d);
    n0 = sent.length;
    edge(W, d, 100);
    await sleep(30);
    r.edgeSecondPops = since(n0).includes('ixian:back');
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★ 7b (#1219) BACK on the built chat shell (phone): the reply / edit strip re-syncs the back mirror (open → ixian:chatoverlay:1, close → :0); hardware Back (chatBack) closes the strip through the ✕ path with NO focus on the field and NO ixian:back (an edit gives the draft back), so the next Back pops natively; the iOS edge swipe closes the strip first (no ixian:back) and the second swipe sends ixian:back — ' + JSON.stringify(r));
    s.dom.window.close();
  });
}
