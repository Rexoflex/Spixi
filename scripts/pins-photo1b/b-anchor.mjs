/* ==== photo1b HV-3 (cap `olderAnchor1`, switch HistoryAnchorOneTask) + the HV-1 fix — the row under the reader keeps its place ====
 * Behaviour on the BUILT chat.html in jsdom with a STUBBED, deterministic layout (a-kit.mjs `geom`: fixed child heights, rects
 * from the flow minus scrollTop, scrollTop clamped like a browser). An open of 50 text rows, 2.3 s for the boot re-pin to end,
 * then the reader scrolls near the top (no scroll event is sent, so no load-more is asked) and three older pages land
 * (100 / 50 / 50 rows, addMessages(json, "prepend") + messagesDone(show_more)).
 *   (1) for each of the four cap sets (olderInsert + olderAnchor1 · olderAnchor1 · olderInsert · none): after EVERY page the
 *       first row that was visible before it sits at the same y (±1 px) — read SYNCHRONOUSLY when messagesDone returns (the fix
 *       ran in the task of the swap) — and no requestAnimationFrame callback ran inside the addMessages / messagesDone pushes;
 *   (2) a scroll BETWEEN addMessages and messagesDone (40 px up): with `olderAnchor1` (with and without `olderInsert`) the
 *       scroll is KEPT — the row first visible after the scroll keeps the y it had then; without it (today) the scroll is
 *       UNDONE — the row first visible at addMessages is back at the y it had then.
 * LIMITS: the layout is a model (no fonts, no margins, no wrapping); a browser's own scroll anchoring is absent here as in
 *   WKWebView. The Chromium harness (harness-history.mjs) runs the real engine but does not assert the position.
 * Deliberate breaks (#802), each in a full temp copy + build-shells, the pin run with --root (all observed, 2026-11-18):
 *   (1) addMessages `… && !bridge.cap('olderAnchor1')) prependAnchor = firstVisibleAnchor();` → the cap test removed (the anchor is
 *       taken at addMessages again) → GREEN — an EQUIVALENT mutation: messagesDone re-takes the anchor under the cap; with BOTH that
 *       cap test removed AND the messagesDone line `if (prependAnswer && bridge.cap('olderAnchor1')) prependAnchor = …` deleted →
 *       red `★ photo1b HV-3 b-anchor (2): …` (the scroll is undone under the cap);
 *   (2) renderOlderInsert `if (prependAnchor && restorePrependAnchor())` → `if (false && …)` → red `… b-anchor (1) caps
 *       {olderInsert,olderAnchor1}`, `… (1) caps {olderInsert}` and `… (2)` (the inserted rows push the reader down).
 * ★ fix r1 (R2): (3) the burst SAFETY TIMER paints the page before messagesDone — the anchor row keeps its y after that paint and
 *   after the late messagesDone, for all four cap sets. The anchor is now taken at addMessages under `olderAnchor1` too;
 *   messagesDone re-takes it while the page is not painted yet. Breaks (observed 2026-11-18): (a1) addMessages back to
 *   `… && !bridge.cap('olderAnchor1')` → red `★ photo1b HV-3 b-anchor (3) (fix r1 R2)`; (a4) the messagesDone re-take deleted →
 *   red `… b-anchor (2)` (the scroll between the pushes is undone under the cap — this replaces break (1) above, which is
 *   folded into a4 now); (a2) the `!olderPagePainted` guard dropped → GREEN, an EQUIVALENT mutation: the timer's paint consumes
 *   the addMessages anchor (restorePrependAnchor clears it), so the late messagesDone anchors only the top-affordance change,
 *   where a fresh anchor is the right one either way. */
import { photo1bKit } from './a-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = photo1bKit(h);
  const { sleep, NOW } = K;
  const T = NOW - 5 * 86400;
  const all = [];
  for (let i = 0; i < 250; i++) all.push(K.txt('b' + i.toString(16).padStart(4, '0'), Math.floor(i / 2) % 2 === 0, T + i * 400, 'row ' + i));
  const parts = [all.slice(200), all.slice(100, 200), all.slice(50, 100), all.slice(0, 50)];

  const visibleFirst = (s, g) => {
    for (const el of s.box.children) {
      if (el.dataset.msgid === undefined) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom > 100) return { id: el.dataset.msgid, top: r.top };
    }
    return null;
  };
  const rowTop = (s, id) => { const el = s.W.__p1bRows.get(id); return el && el.isConnected ? el.getBoundingClientRect().top : NaN; };
  const withRafSpy = (s) => {
    const W = s.W;
    const raf = W.requestAnimationFrame.bind(W);
    s.rafRuns = 0;
    W.requestAnimationFrame = (cb) => raf((t) => { s.rafRuns += 1; return cb(t); });
  };

  async function boot(caps) {
    const s = await K.boot({ p1: true });
    withRafSpy(s);
    s.g = K.geom(s);
    K.open(s, { caps, items: parts[0] });
    await sleep(2300);   // the boot re-pin (bootRepin 2000 ms) is over
    return s;
  }

  /* (1) the anchor holds across three pages, synchronously, no frame inside the pushes */
  const sets = { both: 'olderInsert,olderAnchor1', anchor1: 'olderAnchor1', insert: 'olderInsert', none: '' };
  const r1 = {};
  for (const [name, caps] of Object.entries(sets)) {
    const s = await boot(caps);
    const out = [];
    try {
      for (let p = 1; p < parts.length; p++) {
        s.box.scrollTop = p === 2 ? 300 : 30;   // the anchor = the seam row itself (30) and a row further down (300)
        const a = visibleFirst(s);
        const runs0 = s.rafRuns;
        s.push('addMessages', JSON.stringify({ strs: [], items: parts[p] }), 'prepend');
        s.push('messagesDone', p === parts.length - 1 ? 'false' : 'true');
        const after = a ? rowTop(s, a.id) : NaN;
        out.push({ id: a && a.id, before: a && a.top, after, frames: s.rafRuns - runs0, scroll: s.box.scrollTop });
        await sleep(40);
      }
    } finally { s.close(); }
    r1[name] = out;
    ok(out.length === 3 && out.every((o) => o.id && Math.abs(o.after - o.before) <= 1 && o.frames === 0),
      '★ photo1b HV-3 b-anchor (1) caps {' + caps + '}: after each of three older pages the first visible row keeps its y (±1 px), read when messagesDone returns (the fix is in the task of the swap), and no requestAnimationFrame callback ran inside the pushes — ' + JSON.stringify(out));
  }

  /* (2) a scroll between addMessages and messagesDone: kept with olderAnchor1, undone without it */
  const r2 = {};
  for (const [name, caps] of Object.entries(sets)) {
    const s = await boot(caps);
    try {
      s.box.scrollTop = 200;
      const atAdd = visibleFirst(s);
      s.push('addMessages', JSON.stringify({ strs: [], items: parts[1] }), 'prepend');
      s.box.scrollTop = s.box.scrollTop - 40;   // the reader moves between the two pushes (the burst holds the render)
      const atDone = visibleFirst(s);
      s.push('messagesDone', 'true');
      r2[name] = { atAdd, atDone, addRowNow: rowTop(s, atAdd.id), doneRowNow: rowTop(s, atDone.id) };
    } finally { s.close(); }
  }
  const kept = (o) => Math.abs(o.doneRowNow - o.atDone.top) <= 1;
  const undone = (o) => Math.abs(o.addRowNow - o.atAdd.top) <= 1;
  ok(kept(r2.both) && kept(r2.anchor1) && undone(r2.insert) && undone(r2.none) && !kept(r2.none) && !undone(r2.both),
    '★ photo1b HV-3 b-anchor (2): a 40 px scroll between addMessages and messagesDone is KEPT with the cap `olderAnchor1` (the row first visible after the scroll keeps that y — with and without `olderInsert`) and UNDONE without it (today: the row first visible at addMessages is back at its y) — ' + JSON.stringify(r2));

  /* (3) ★ fix r1 (R2): the 250 ms burst SAFETY TIMER paints the page before messagesDone (a late signal) — the first visible
     row keeps its y after the timer's paint AND after messagesDone, for every cap set (with `olderAnchor1` the anchor is
     taken at addMessages too; messagesDone re-takes it only while the rows are not on glass yet) */
  const r3 = {};
  for (const [name, caps] of Object.entries(sets)) {
    const s = await boot(caps);
    try {
      s.box.scrollTop = 300;
      const a = visibleFirst(s);
      s.push('addMessages', JSON.stringify({ strs: [], items: parts[1] }), 'prepend');
      await sleep(450);   // > the 250 ms safety timer: the burst ends and the log paints without messagesDone
      const afterTimer = rowTop(s, a.id);
      s.push('messagesDone', 'true');
      r3[name] = { id: a.id, before: a.top, afterTimer, afterDone: rowTop(s, a.id), full: s.W.__p1bFull };
    } finally { s.close(); }
  }
  ok(Object.values(r3).every((o) => Math.abs(o.afterTimer - o.before) <= 1 && Math.abs(o.afterDone - o.before) <= 1),
    '★ photo1b HV-3 b-anchor (3) (fix r1 R2): when the burst safety timer paints an older page before messagesDone, the first visible row keeps its y (±1 px) after that paint and after the late messagesDone — with and without `olderAnchor1` / `olderInsert` — ' + JSON.stringify(r3));
}
