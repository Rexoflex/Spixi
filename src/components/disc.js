/* Deterministic gradient index (1..DISC_GRADS) for a tinted disc, derived from
 * its glyph name — so each icon gets a stable, non-repeating gradient that maps
 * to --disc-grad-<n> in CSS (base.css). DECISIONS #170. */
const DISC_GRADS = 11;   // ★ #1017: the avatar pairs 1–11 (red is reserved for destructive)
export function discGrad(glyph) {
  let h = 2166136261;
  const s = String(glyph || '');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % DISC_GRADS) + 1;
}

/* ★ #1017 (Damir 2026-09-28: "randomize the colours so adjacent are not the same"): a screen
 * of discs is coloured by POSITION through a fixed hue-hopping sequence (blue · sunflower ·
 * purple · green · rose · cyan · orange · violet · lime · pink · teal) — consecutive entries sit
 * far apart on the wheel, so neighbours never match and a screen uses the whole palette. The
 * per-glyph hash alone clustered (the Account hub drew five oranges and purples). Deterministic:
 * the same rows give the same colours on every open. A destructive (error) disc keeps its red
 * and does not consume a slot; a hue-only disc (no data-grad) is left alone. */
export const DISC_SEQUENCE = [7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
export function spreadDiscs(root) {
  if (!root || !root.querySelectorAll) return;
  let i = 0;
  const walked = [];
  for (const d of root.querySelectorAll('.c-disc')) {
    if (d.dataset.hue === 'error' || !d.dataset.grad) continue;
    /* ★ #1352: a PINNED disc (data-grad-pin, a row that wears its own screen's colour) keeps its slot and still takes
       its turn in the walk, so every other row keeps the colour it had */
    if (!d.dataset.gradPin) d.dataset.grad = String(DISC_SEQUENCE[i % DISC_SEQUENCE.length]);
    walked.push(d);
    i++;
  }
  /* #1017 holds around a pin: a walked disc that lands on a pinned neighbour's colour moves to the next slot of the
     sequence that matches neither neighbour (the row order differs by platform — caps add and remove rows) */
  walked.forEach((d, k) => {
    if (d.dataset.gradPin) return;
    const prev = walked[k - 1], next = walked[k + 1];
    const clash = (g) => (prev && prev.dataset.grad === g) || (next && next.dataset.grad === g);
    if (!clash(d.dataset.grad)) return;
    let at = DISC_SEQUENCE.indexOf(Number(d.dataset.grad));
    for (let n = 0; n < DISC_SEQUENCE.length && clash(d.dataset.grad); n++) {
      at = (at + 1) % DISC_SEQUENCE.length;
      d.dataset.grad = String(DISC_SEQUENCE[at]);
    }
  });
}
