/**
 * c-chats-header — collapsing header for the Chats shell (step 2): search field
 * + filter chips as ONE unit, plus the scroll-collapse behavior (#67, Damir).
 * Search wires to setChatsQuery, chips to setChatsFilter (chats-shell.js).
 * Favorites is BE-gated (§8) → hidden unless opts.favorites.
 * Spec: docs/chats-shell-spec.md §3–4.
 *
 * Two exports:
 *   createChatsHeader(opts) → header element (search + chips)
 *   attachChatsCollapse(headerEl, scrollEl, opts) → detach()  [scroll behavior]
 */
import { createSearchField } from './search-field.js';
import { createChip, setChipSelected } from './chip.js';

const CHATS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'favorites', label: 'Favorites' },   // BE-gated (§8) — hidden unless favorites:true
  { id: 'groups', label: 'Groups' },
  { id: 'requests', label: 'Requests' },
];

/** Build the header: search field + exclusive filter-chip group. */
export function createChatsHeader({ activeFilter = 'all', strings = {}, favorites = false, onFilter, onQuery } = {}) {
  const el = document.createElement('div');
  el.className = 'c-chats-header';

  const searchWrap = document.createElement('div');
  searchWrap.className = 'c-chats-header__search';
  searchWrap.append(createSearchField({
    placeholder: strings.searchChats || 'Search chats',
    onInput: (q) => { if (onQuery) onQuery(q); },
  }));
  el.append(searchWrap);

  const chipsRow = document.createElement('div');
  chipsRow.className = 'c-chats-header__filters';
  chipsRow.setAttribute('role', 'group');
  chipsRow.setAttribute('aria-label', strings.filterChats || 'Filter chats');

  const chips = CHATS_FILTERS
    .filter((f) => f.id !== 'favorites' || favorites)      // Favorites hidden until BE (§8)
    .map((f) => {
      const chip = createChip({
        label: strings['chatsFilter_' + f.id] || f.label,
        selected: f.id === activeFilter,
        onClick: () => {
          for (const c of chips) setChipSelected(c, c === chip);   // exclusive group
          if (onFilter) onFilter(f.id);
        },
      });
      chip.dataset.filter = f.id;
      return chip;
    });
  chipsRow.append(...chips);
  el.append(chipsRow);

  return el;
}

// reveal ONLY within this many px of the absolute top (Damir: "appear only at
// absolute top"); 1px covers sub-pixel scroll rest positions.
const CHATS_REVEAL_AT = 1;

/**
 * Scroll-collapse (#67, Damir): binary, TRIGGERED CSS transition (smooth, not
 * finger-tracking). The header collapses on downward scroll and reveals ONLY
 * when the list is back at the absolute top — scrolling up partway does NOT
 * reveal it. Animates `max-height` + `opacity` (transition lives in
 * chats-header.css, --duration-300 --easing-standard; reduced-motion zeros it).
 *
 * a11y: collapsed header leaves the tab order via `inert` + `aria-hidden`, plus
 * a fallback (`data-collapsed` → pointer-events:none + `tabindex="-1"` on the
 * focusables) because `inert` needs a modern WebView (Chromium ≥102, #4). All
 * toggle only on collapse⇄reveal transitions.
 */
export function attachChatsCollapse(headerEl, scrollEl, { reducedMotion } = {}) {
  const rm = reducedMotion != null ? reducedMotion
    : (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

  let naturalH = headerEl.offsetHeight || 0;   // full height (re-captured at each collapse)
  let collapsed = false;
  let lastTop = scrollEl.scrollTop;

  const setFocusable = (on) => {
    for (const f of headerEl.querySelectorAll('input, button')) {
      if (on) f.removeAttribute('tabindex'); else f.setAttribute('tabindex', '-1');
    }
  };

  const onEnd = (e) => {
    // once fully expanded, release max-height to natural so a later collapse
    // re-measures fresh (handles font-load / orientation while collapsed)
    if (e.target === headerEl && e.propertyName === 'max-height' && !collapsed) {
      headerEl.style.maxHeight = '';
    }
  };
  headerEl.addEventListener('transitionend', onEnd);

  const setCollapsed = (want) => {
    if (want === collapsed) return;
    if (want) {
      const h = headerEl.offsetHeight || naturalH;      // capture current height
      if (!h) return;                                   // never collapse an UNMEASURED header (stay expanded)
      naturalH = h;
      collapsed = true;
      headerEl.style.maxHeight = naturalH + 'px';
      void headerEl.offsetHeight;                       // reflow so 0 transitions FROM naturalH
      headerEl.style.maxHeight = '0px';
      headerEl.style.opacity = '0';
      headerEl.setAttribute('inert', '');
      headerEl.setAttribute('aria-hidden', 'true');
      headerEl.dataset.collapsed = '';
      setFocusable(false);
    } else {
      collapsed = false;
      headerEl.style.maxHeight = naturalH + 'px';       // 0 → naturalH (transition)
      headerEl.style.opacity = '';                      // release to CSS default (1); animates 0→1
      if (rm) headerEl.style.maxHeight = '';            // instant → release immediately
      headerEl.removeAttribute('inert');
      headerEl.removeAttribute('aria-hidden');
      delete headerEl.dataset.collapsed;
      setFocusable(true);
    }
  };

  const onScroll = () => {
    const top = scrollEl.scrollTop;
    const delta = top - lastTop;
    lastTop = top;
    if (top <= CHATS_REVEAL_AT) setCollapsed(false);   // reveal ONLY at the absolute top
    else if (delta > 0) setCollapsed(true);            // collapse on downward scroll (stays collapsed on up)
  };

  const onResize = () => {                    // re-measure while expanded (can't while collapsed)
    if (!collapsed) { headerEl.style.maxHeight = ''; naturalH = headerEl.offsetHeight || naturalH; }
  };

  scrollEl.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);

  return function detachChatsCollapse() {
    scrollEl.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    headerEl.removeEventListener('transitionend', onEnd);
    headerEl.style.maxHeight = '';
    headerEl.style.opacity = '';
    headerEl.removeAttribute('inert');
    headerEl.removeAttribute('aria-hidden');
    delete headerEl.dataset.collapsed;
    setFocusable(true);
  };
}
