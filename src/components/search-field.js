/**
 * c-search-field — search input, specialization of Figma text-field/large
 * (docs/chip-search-spec.md, DECISIONS #51). Leading search glyph, clear
 * button appears only while text is present; Esc clears.
 *
 * createSearchField({ placeholder = 'Search', value = '', onInput, onSubmit,
 *                     ariaLabel, strings })
 * Free fns (#44): setSearchValue(el, v) · getSearchValue(el)
 *                 resetSearchField(el) · resetSearchFields({ keepWithin })
 *
 * ★ BUG-3 — A STALE FILTER MUST NEVER SILENTLY HIDE CONTENT (Damir F5 2026-08-13:
 * "the group was in list, I had active search bar stuff in, we need best ux so
 * that it resets after tapping out"; "the search bar needs to clear when we stop
 * using it"). He lost ten minutes and filed two phantom bug reports against the
 * chats list because a forgotten query was filtering a row out of it.
 *
 * THE RULE: a query is scoped to ONE VISIT to its surface — it survives scrolling,
 * blurring and drilling into a result, and it is dropped the moment the user LEAVES
 * the surface (tab switch, takeover, pane change); while it is live the field wears
 * the ACTION outline so "a filter is on" is legible at a glance.
 *
 * Why not clear on blur — the obvious reading: blur fires when you tap a RESULT, so
 * clearing there fights the click and throws away the query of a user who is acting
 * on it (Telegram/WhatsApp keep the query while you are inside the search context
 * and drop it when you leave it — the same line, drawn at the surface not the
 * control). Why not a pure affordance: Damir HAD a visible field with text in it and
 * still concluded the data was gone, so the state has to be self-cancelling, not
 * merely legible.
 *
 * Two halves, both here so every surface inherits them:
 *   · `data-active` on the wrapper whenever the field holds a query (→ CSS).
 *   · a registry of every live field + `resetSearchFields({ keepWithin })`, which
 *     clears each one AND notifies its `onInput('')` so the consumer's model goes
 *     back to unfiltered. Shells call it at their surface-exit chokepoints; a field
 *     that unmounts with its takeover (contacts, wallet send/receive, chat info)
 *     drops out of the registry on its own — see the isConnected sweep.
 * NOTE this touches the TEXT QUERY only. Chip filters (chats' all/unread/…, the
 * wallet's all/sent/received) are separate state with their own lifecycle — e.g.
 * home.html's leaveRequestsFilterIfEmpty — and are deliberately not touched here.
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';

/* Every field built by this module, so a shell can reset "whatever is out there"
 * without threading a handle through each surface. Entries whose element has been
 * detached (a takeover closing) are swept on the next reset — no leak, no
 * observer, and no dependency on the consumer remembering to unregister. */
const searchFieldRegistry = new Set();
/* field element → its onInput. Kept off the DOM node so a reset can put the
 * CONSUMER's model back to unfiltered, not just blank the input. */
const searchFieldNotify = new WeakMap();

/** Reflect the current value into the clear button + the active-filter state. */
function syncSearchField(el) {
  const input = el.querySelector('.c-search-field__input');
  const clear = el.querySelector('.c-search-field__clear');
  const on = !!(input && input.value.length);
  if (clear) clear.hidden = !on;
  el.toggleAttribute('data-active', on);   // BUG-3: "this field is filtering"
  return on;
}

export function createSearchField({
  placeholder = 'Search', value = '', onInput, onSubmit, ariaLabel, strings = getStrings(),
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

  const sync = () => syncSearchField(el);

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
  if (onInput) searchFieldNotify.set(el, onInput);
  searchFieldRegistry.add(el);           // BUG-3: visit-scoped reset
  syncSearchField(el);                   // a seeded `value` is already a live filter
  return el;
}

/** Set the field's value (updates clear-button visibility). */
export function setSearchValue(el, v) {
  v = v == null ? '' : String(v);
  const input = el.querySelector('.c-search-field__input');
  input.value = v;
  syncSearchField(el);
}

/** Read the field's current value. */
export function getSearchValue(el) {
  return el.querySelector('.c-search-field__input').value;
}

/**
 * BUG-3: clear ONE field and put its consumer back to unfiltered. Returns true only
 * if a query was actually dropped, so a caller can tell "nothing was filtered" from
 * "a filter was silently on" (and so a no-op costs no re-render).
 */
export function resetSearchField(el) {
  if (!el || !el.querySelector) return false;
  const input = el.querySelector('.c-search-field__input');
  if (!input || input.value === '') return false;
  input.value = '';
  syncSearchField(el);
  const notify = searchFieldNotify.get(el);
  if (notify) notify('');
  return true;
}

/**
 * BUG-3: the surface-exit reset. Clears every live field that holds a query —
 * except any inside `keepWithin`, which is the surface being ENTERED (its own
 * query is the one the user is looking at and must survive).
 * Detached fields are swept here rather than on unmount: a takeover that removes
 * its DOM has already destroyed its query, and asking every caller to unregister
 * is exactly the kind of bookkeeping that rots.
 * Returns how many fields were actually reset.
 */
export function resetSearchFields({ keepWithin = null } = {}) {
  let n = 0;
  for (const el of Array.from(searchFieldRegistry)) {
    if (!el.isConnected) { searchFieldRegistry.delete(el); continue; }
    if (keepWithin && keepWithin.contains && keepWithin.contains(el)) continue;
    if (resetSearchField(el)) n += 1;
  }
  return n;
}
