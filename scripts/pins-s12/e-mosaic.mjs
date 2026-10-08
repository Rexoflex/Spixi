/* ==== S12 (Damir 2026-10-08 20:06, screenshot: 2 photos sent → the tiles filled only the top strip of the album box).
 * Mechanism: CSS grid gives flexible rows whose fr factors sum to LESS THAN 1 only that fraction of the free space, and
 * mosaicGeometry emitted '0.41fr' (2 photos), '0.647…' etc. Pin: for every album size 1–10 the row factors sum to at
 * least 1 (in fact ~1000), each row keeps its share of the height (within rounding), and the box ratio is unchanged.
 * Deliberate break: the old `Math.round(v * 1000) / 1000 + 'fr'` → this pin fails on n = 1–7 and 10. */
export default async function (h) {
  const { ok, root, join } = h;
  const m = await import(join(root, 'src/components/media-bubble.js'));
  const ROW_H = { 1: 0.75, 2: 0.41, 3: 1 / 3, 4: 0.25 };
  const bad = [];
  for (let n = 1; n <= 10; n++) {
    const g = m.mosaicGeometry(n);
    const fr = g.template.split(' ').map((t) => (/^\d+(\.\d+)?fr$/.test(t) ? parseFloat(t) : NaN));
    const sum = fr.reduce((a, b) => a + b, 0);
    const hs = g.rows.map((k) => ROW_H[k]);
    const hsum = hs.reduce((a, b) => a + b, 0);
    const shareOk = fr.every((f, i) => Math.abs(f / sum - hs[i] / hsum) < 0.002);
    const ratioOk = Math.abs(g.ratio - 1 / hsum) < 0.002;
    if (!(fr.length === g.rows.length && fr.every(Number.isFinite) && sum >= 1 && shareOk && ratioOk)) bad.push({ n, template: g.template, sum });
  }
  ok(bad.length === 0,
    '★ S12 (Damir 20:06): every album mosaic (1–10 photos) has row fr factors that sum to ≥ 1 — CSS grid gives rows whose factors sum below 1 only that share of the box (the 2-photo album filled 41 %) — each row keeps its share of the height and the box ratio is unchanged — ' + JSON.stringify(bad));
}
