/**
 * c-chip — filter/input chip (docs/chip-search-spec.md, DECISIONS #50).
 * Mirrors Figma chip/{small,large}; selected + disabled states are code-first
 * additions (🟡 #50). Dismissible chips: the WHOLE chip is the dismiss trigger
 * (no nested button); the X glyph is decorative.
 *
 * createChip({ label, size = 'large', selected = false, icon = null,
 *              dismissible = false, disabled = false, readonly = false, onClick, strings })
 *   readonly — a non-interactive DISPLAY chip (e.g. capability/permission tags): a
 *   <span>, no toggle/pressed/hover, no hit-area expansion. Variant of the same chip.
 * Updates via free function (#44): setChipSelected(el, selected)
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';

const CHIP_ICON_SIZE = { large: 18, small: 14 };   // leading (Figma)
const CHIP_DISMISS_SIZE = { large: 16, small: 14 }; // trailing (Figma)

export function createChip({
  label = '', size = 'large', selected = false, icon: leading = null,
  dismissible = false, disabled = false, readonly = false, onClick, strings = getStrings(),
} = {}) {
  const el = document.createElement(readonly ? 'span' : 'button');
  if (!readonly) el.type = 'button';
  el.className = 'c-chip';
  el.dataset.size = size;
  if (readonly) el.dataset.readonly = '';
  else el.disabled = disabled;

  if (leading) {
    const glyph = icon(leading, { size: CHIP_ICON_SIZE[size] || 18 });
    glyph.classList.add('c-chip__icon');
    el.append(glyph);
  }

  const text = document.createElement('span');
  text.className = 'c-chip__label';
  text.textContent = label;
  el.append(text);

  if (readonly) return el;                          // display-only: no toggle/dismiss/click wiring

  if (dismissible) {
    // whole-chip trigger; glyph is decorative (aria-hidden via icon factory)
    el.dataset.dismissible = '';
    el.setAttribute('aria-label', label + ', ' + (strings.remove || 'remove'));
    const x = icon('x', { size: CHIP_DISMISS_SIZE[size] || 16 });
    x.classList.add('c-chip__dismiss');
    el.append(x);
  } else {
    // toggle (filter) semantics
    el.setAttribute('aria-pressed', String(!!selected));
  }

  if (onClick) el.addEventListener('click', onClick);
  return el;
}

/** Set a toggle chip's selected state (no-op on dismissible chips). */
export function setChipSelected(el, selected) {
  if (!el.hasAttribute('aria-pressed')) return;
  el.setAttribute('aria-pressed', String(!!selected));
}
