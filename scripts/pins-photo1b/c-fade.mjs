/* ==== photo1b HV-4 (cap `fadeBand`, switch FadeFromBand) — the composer fade pass starts at the band and writes the old walk's masks ====
 * Behaviour on the BUILT chat.html in jsdom with a STUBBED layout (a-kit.mjs `geom`: the log 800 px at y = 100, the composer bar
 * 820–900 = the band; fixed child heights, some rows 220 px — taller than the band; some children display:none = zero-size).
 * Two documents with the SAME rows (an open of 50 + two older pages = 250 rows) and the SAME geometry: A with the cap `fadeBand`,
 * B without it (the old walk from the newest child). At ≥ 6 scroll positions — the top of history, the middle, a row ending
 * EXACTLY at the band's top, a row starting EXACTLY at its bottom, a 220 px row spanning the band, a zero-size child at the band,
 * the bottom — a scroll event runs the pass; then every child's mask string (mask-image | -webkit-mask-image) must be equal in A
 * and B, the band must hold ≥ 1 masked row (not vacuous), and the rect reads of the pass are counted: A reads O(log n + k)
 * (≤ 2·log2 n + k + 8, k = the rows it masks + 2), B (the old walk) reads every child from the end down to the band.
 * LIMITS: the layout is a model (monotonic tops by construction, like a browser's flow column); a transform in flight (rise, slide,
 *   pulse) takes the old walk by design and is not exercised here; the count includes any other scroll listener's reads of the
 *   log's children in that frame (both documents alike).
 * Deliberate breaks (#802), each in a full temp copy + build-shells, the pin run with --root (all observed red, 2026-11-18):
 *   (1) fadeBandStart `if (r.top < bandBottom)` → `if (r.top + 40 < bandBottom)` → red `★ photo1b HV-4 c-fade: …` (masks differ at top,
 *       middle, a row ending at the band top: a row inside the band is never reached);
 *   (2) the zero-size step `while (r.width === 0 && r.height === 0 && j > lo)` → `while (false && …)` → red at `zeroAtBand` (masked 0,
 *       the old walk masks a row there: the probe on a display:none child skips the half that holds the band);
 *   (3) fadeStartIndex `return fadeBandStart(kids, bandBottom);` → `… - 1;` → red (the newest child in the band loses its mask). */
import { photo1bKit } from './a-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = photo1bKit(h);
  const { sleep, NOW } = K;
  const T = NOW - 5 * 86400;
  const all = [];
  for (let i = 0; i < 250; i++) all.push(K.txt('c' + i.toString(16).padStart(4, '0'), Math.floor(i / 2) % 2 === 0, T + i * 400, 'row ' + i));
  const parts = [all.slice(200), all.slice(100, 200), all.slice(0, 100)];
  const TALL = (n) => (n.dataset && n.dataset.msgid !== undefined && /[7]$/.test(n.dataset.msgid) ? 220 : 0);
  const BAR = { top: 820, height: 80 };

  async function boot(caps) {
    const s = await K.boot({ p1: false });
    s.g = K.geom(s, { heightOf: TALL, bar: BAR });
    K.open(s, { caps, items: parts[0] });
    for (let p = 1; p < parts.length; p++) K.page(s, parts[p], p === parts.length - 1 ? 'false' : 'true');
    await sleep(2300);
    /* zero-size children: every 29th child (the same nodes by index in both documents) */
    [...s.box.children].forEach((c, i) => { if (i % 29 === 13) c.style.display = 'none'; });
    return s;
  }
  const A = await boot('fadeBand');
  const B = await boot('');
  const out = [];
  try {
    const kids = [...A.box.children];
    const n = kids.length;
    const offs = [];
    let acc = 0;
    for (const c of kids) { offs.push(acc); acc += A.g.hOf(c); }
    const maxSt = Math.max(0, acc - 800);
    const idxWhere = (pred, from) => { for (let i = from; i < n; i++) if (pred(i)) return i; return -1; };
    const mid = n >> 1;
    const tallI = idxWhere((i) => A.g.hOf(kids[i]) === 220, mid);
    const zeroI = idxWhere((i) => A.g.hOf(kids[i]) === 0, mid);
    const sized = idxWhere((i) => A.g.hOf(kids[i]) > 0, mid + 7);
    const positions = [
      ['top', 0],
      ['middle', Math.round(maxSt / 2)],
      ['rowEndsAtBandTop', offs[sized] + A.g.hOf(kids[sized]) - 720],
      ['rowStartsAtBandBottom', offs[sized] - 800],
      ['tallSpansBand', offs[tallI] - 700],
      ['zeroAtBand', offs[zeroI] - 800],
      ['zeroAtBandTop', offs[zeroI] - 720],
      ['bottom', maxSt],
    ];
    for (const [label, st] of positions) {
      const reads = {};
      for (const [name, s] of [['A', A], ['B', B]]) {
        s.box.scrollTop = st;
        await sleep(40);   // a pending frame of the previous position is spent
        s.g.reads = 0;
        s.box.dispatchEvent(new s.W.Event('scroll'));
        await sleep(60);
        reads[name] = s.g.reads;
      }
      const mA = [...A.box.children].map((c) => A.g.masks(c));
      const mB = [...B.box.children].map((c) => B.g.masks(c));
      const masked = mA.filter((m) => m !== '|').length;
      const firstDiff = mA.findIndex((m, i) => m !== mB[i]);
      out.push({ label, st: A.box.scrollTop, masked, eq: firstDiff < 0 && mA.length === mB.length, firstDiff, readsA: reads.A, readsB: reads.B,
        limA: Math.ceil(2 * Math.log2(n)) + masked + 2 + 8 });
    }
    const okAll = out.length >= 6 && out.every((o) => o.eq) && out.every((o) => o.masked >= 1) && out.every((o) => o.readsA <= o.limA)
      && out[0].readsB >= n - 20 && out[0].readsA * 5 < out[0].readsB;
    ok(okAll,
      '★ photo1b HV-4 c-fade: with the cap `fadeBand` the composer fade pass writes EXACTLY the old walk\'s mask strings on the same children at ' + out.length
      + ' scroll positions (top of history, middle, a row ending at the band top, a row starting at the band bottom, a 220 px row over the 80 px band, zero-size children at the band, the bottom), '
      + 'each with ≥ 1 masked row; it reads O(log n + k) rects while the old walk (cap absent) reads every child below the band — ' + JSON.stringify({ n, out }));
  } finally { A.close(); B.close(); }
}
