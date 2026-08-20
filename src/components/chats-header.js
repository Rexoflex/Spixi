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
import { getStrings } from './strings-runtime.js';
import { createSearchField } from './search-field.js';
import { createChip, setChipSelected } from './chip.js';

const CHATS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'favorites', label: 'Favorites' },   // BE-gated (§8) — hidden unless favorites:true
  { id: 'groups', label: 'Groups' },
  { id: 'requests', label: 'Requests' },
];

/** Set a chip's count (Damir 2026-07-09): a plain trailing NUMBER (not a badge pill).
 *  n<=0 removes it. The 'requests' chip additionally hides itself when 0 (only
 *  surfaced with active pending requests) — done by setChatsHeaderCounts. */
function setChipCount(chip, n) {
  let count = chip.querySelector('.c-chip__count');
  if (n > 0) {
    if (!count) {
      count = document.createElement('span');
      count.className = 'c-chip__count';
      count.setAttribute('aria-hidden', 'true');   // the SR reads the chip via its label; the number is decorative
      chip.append(count);
    }
    count.textContent = String(n);
  } else if (count) {
    count.remove();
  }
}

/** Update the chip count badges + Requests-chip visibility after a data change
 *  (Damir 2026-07-09). counts = { unread, groups, requests }. The Requests chip is
 *  HIDDEN unless there are pending requests; Groups shows a badge only when its
 *  unread count > 0; Unread shows its unread count. */
export function setChatsHeaderCounts(headerEl, { unread = 0, groups = 0, requests = 0 } = {}) {
  const q = (id) => headerEl.querySelector('.c-chip[data-filter="' + id + '"]');
  const u = q('unread'), g = q('groups'), r = q('requests');
  if (u) setChipCount(u, unread);
  if (g) setChipCount(g, groups);
  if (r) { setChipCount(r, requests); r.style.display = requests > 0 ? '' : 'none'; }
}

/** Build the header: search field + exclusive filter-chip group. */
export function createChatsHeader({ activeFilter = 'all', strings = getStrings(), favorites = false, counts = null, onFilter, onQuery } = {}) {
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

  // initial count badges + Requests visibility (Damir 2026-07-09). Requests starts
  // hidden (0) until the feed lands (CH2); Unread/Groups reflect current unread.
  setChatsHeaderCounts(el, counts || {});

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
  /* ★ N43 (#443, Damir): THE SEARCH BAR IS ALWAYS VISIBLE. His answer to "show the
   * search only when the content overflows" was the opposite — never hide it — and a
   * bar that vanishes on a downward scroll and returns at the top is the same defect
   * from the other side. It also explains the "flicker" he reported on Apps: the
   * flicker WAS the bar disappearing and reappearing.
   * Kept as a live attachment rather than deleted at the call sites so the behaviour
   * is one flag from returning (the R3 reversal-hook pattern) and so the a11y
   * teardown contract, the demo and the smoke pins all stay honest. */
  const N43_ALWAYS_VISIBLE = true;
  if (N43_ALWAYS_VISIBLE) {
    return function detachChatsCollapse() { /* nothing was attached */ };
  }
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

  // iOS rubber-band guard (Damir F5 2026-07-29: "scrolling to top or bottom has a
  // weird animation and looks like it bugs out"). WebKit lets scrollTop run NEGATIVE
  // past the top and past max at the bottom during a bounce, then springs back — which
  // fed this a rapid alternating delta and drove collapse/expand against each other,
  // mid-transition, every time you hit either end. Two fixes: ignore events while
  // overscrolled (a bounce is not a scroll intent), and require a real downward delta
  // so settle-jitter can't trip a collapse.
  const COLLAPSE_DELTA_PX = 4;
  const onScroll = () => {
    const max = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
    const raw = scrollEl.scrollTop;
    if (raw < 0 || raw > max) {                        // rubber-band overscroll — not a gesture
      lastTop = Math.min(max, Math.max(0, raw));       // resync so the spring-back reads delta 0
      if (raw < 0) setCollapsed(false);                // bouncing at the top still means "at the top"
      return;
    }
    const top = raw;
    const delta = top - lastTop;
    lastTop = top;
    /* #328 (audit MINOR, the wallet-shell toolsBusy precedent): NEVER collapse
     * while the user is SEARCHING — a mid-query collapse `inert`s the focused
     * input (Chromium blurs it) and hides the only way to see/clear the active
     * filter until the list is scrolled back to absolute top. Desktop is the
     * only production consumer since #327 (mobile mounts the header in-list). */
    const searching = headerEl.contains(document.activeElement)
      || (() => { const i = headerEl.querySelector('input'); return !!(i && i.value); })();
    if (top <= CHATS_REVEAL_AT) setCollapsed(false);   // reveal ONLY at the absolute top
    else if (delta > COLLAPSE_DELTA_PX && !searching) setCollapsed(true);   // collapse on real downward scroll
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
