/* Deterministic gradient index (1..DISC_GRADS) for a tinted disc, derived from
 * its glyph name — so each icon gets a stable, non-repeating gradient that maps
 * to --disc-grad-<n> in CSS (base.css). DECISIONS #170. */
const DISC_GRADS = 14;
export function discGrad(glyph) {
  let h = 2166136261;
  const s = String(glyph || '');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % DISC_GRADS) + 1;
}
