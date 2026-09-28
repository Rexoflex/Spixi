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
  for (const d of root.querySelectorAll('.c-disc')) {
    if (d.dataset.hue === 'error' || !d.dataset.grad) continue;
    d.dataset.grad = String(DISC_SEQUENCE[i % DISC_SEQUENCE.length]);
    i++;
  }
}
