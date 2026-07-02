/**
 * c-badge — status badge, mirrors Figma badge type×weight (docs/tx-row-spec.md,
 * DECISIONS #54). Static display component — no interaction states.
 *
 * createBadge({ label, type = 'warning', weight = 'tonal', icon = null,
 *               trailingIcon = null })
 * type: warning | error | info | success | accent
 */
import { icon } from './icons.js';

export function createBadge({
  label = '', type = 'warning', weight = 'tonal', icon: leading = null, trailingIcon = null,
} = {}) {
  const el = document.createElement('span');
  el.className = 'c-badge';
  el.dataset.type = type;
  el.dataset.weight = weight;

  if (leading) el.append(icon(leading, { size: 16 }));

  const text = document.createElement('span');
  text.className = 'c-badge__label';
  text.textContent = label;
  el.append(text);

  if (trailingIcon) el.append(icon(trailingIcon, { size: 16 }));
  return el;
}
