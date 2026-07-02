/**
 * c-search-field — search input, specialization of Figma text-field/large
 * (docs/chip-search-spec.md, DECISIONS #51). Leading search glyph, clear
 * button appears only while text is present; Esc clears.
 *
 * createSearchField({ placeholder = 'Search', value = '', onInput, onSubmit,
 *                     ariaLabel, strings })
 * Free fns (#44): setSearchValue(el, v) · getSearchValue(el)
 */
import { icon } from './icons.js';

export function createSearchField({
  placeholder = 'Search', value = '', onInput, onSubmit, ariaLabel, strings = {},
} = {}) {
  const el = document.createElement('div');
  el.className = 'c-search-field';

  const glyph = icon('search', { size: 18 });
  glyph.classList.add('c-search-field__icon');

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'c-search-field__input';
  input.placeholder = placeholder;
  input.value = value;
  input.setAttribute('aria-label', ariaLabel || placeholder);

  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'c-search-field__clear';
  clear.setAttribute('aria-label', strings.clear || 'Clear search');
  clear.hidden = !value;
  clear.append(icon('x', { size: 18 }));

  const sync = () => { clear.hidden = input.value.length === 0; };

  input.addEventListener('input', () => {
    sync();
    if (onInput) onInput(input.value);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && onSubmit) onSubmit(input.value);
    else if (e.key === 'Escape' && input.value) {
      e.stopPropagation(); // Esc consumed by the clear, not by overlays above
      setSearchValue(el, '');
      if (onInput) onInput('');
    }
  });
  clear.addEventListener('click', () => {
    setSearchValue(el, '');
    if (onInput) onInput('');
    input.focus();
  });

  el.append(glyph, input, clear);
  return el;
}

/** Set the field's value (updates clear-button visibility). */
export function setSearchValue(el, v) {
  v = v == null ? '' : String(v);
  const input = el.querySelector('.c-search-field__input');
  input.value = v;
  el.querySelector('.c-search-field__clear').hidden = v.length === 0;
}

/** Read the field's current value. */
export function getSearchValue(el) {
  return el.querySelector('.c-search-field__input').value;
}
