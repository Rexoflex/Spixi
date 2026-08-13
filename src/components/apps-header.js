/**
 * c-apps-header — the Apps screen header (spec §2.1): a search field, a self-syncing
 * list⇄grid layout toggle, and the blue "Explore Spixi Mini Apps" discover banner.
 * The toggle shows the layout you'll switch TO and reports the new layout via
 * onToggleLayout(next); the demo wires that to setAppsLayout.
 *
 * createAppsHeader({ layout, strings, discover, onQuery, onToggleLayout, onExplore }) → div
 */
import { getStrings } from './strings-runtime.js';
import { createSearchField } from './search-field.js';
import { icon } from './icons.js';

export function createAppsHeader({ layout = 'list', strings = getStrings(), discover = false, exploreImage = null, onQuery, onToggleLayout, onExplore } = {}) {
  const el = document.createElement('div');
  el.className = 'c-apps-header';

  /* search + layout toggle */
  const row = document.createElement('div');
  row.className = 'c-apps-header__row';
  row.append(createSearchField({
    placeholder: strings.searchApps || 'Find installed apps',
    onInput: (v) => { if (onQuery) onQuery(v); },
    strings,
  }));

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'c-apps-header__toggle';
  let current = layout === 'grid' ? 'grid' : 'list';
  const applyToggle = (lay) => {
    current = lay;
    toggle.dataset.layout = lay;
    const target = lay === 'list' ? 'grid' : 'list';        // clicking switches to this
    toggle.textContent = '';
    toggle.append(icon(target === 'grid' ? 'apps' : 'menu-2', { size: 22 }));
    toggle.setAttribute('aria-label', target === 'grid'
      ? (strings.viewAsGrid || 'View as grid')
      : (strings.viewAsList || 'View as list'));
  };
  applyToggle(current);
  toggle.addEventListener('click', () => {
    const next = current === 'grid' ? 'list' : 'grid';
    applyToggle(next);
    if (onToggleLayout) onToggleLayout(next);
  });
  row.append(toggle);
  el.append(row);

  /* explore banner — a LINK OUT to the Spixi mini-apps WEBSITE (opens in the external
   * browser via onExplore, legacy parity). This is an outbound web link, NOT an in-app
   * app catalog, so it's fine to show; the app-store-like IN-APP Discover FEED
   * (apps-feed.js / the standalone shell's browsable catalog) stays parked (A2). */
  const banner = document.createElement('button');
  banner.type = 'button';
  banner.className = 'c-apps-explore';
  const btext = document.createElement('span');
  btext.className = 'c-apps-explore__text';
  const bt1 = document.createElement('span');
  bt1.className = 'c-apps-explore__title';
  bt1.textContent = strings.exploreTitle || 'Not sure where to start?';
  const bt2 = document.createElement('span');
  bt2.className = 'c-apps-explore__cta';
  const ctaText = strings.exploreCta || 'Explore Spixi Mini Apps';
  bt2.append(document.createTextNode(ctaText), icon('arrow-right', { size: 18 }));
  btext.append(bt1, bt2);
  banner.append(btext);
  // Illustration (Damir 2026-08-12): a FLEX SIBLING of the copy, pinned bottom-right
  // by apps-header.css. Sibling (not an absolute overlay) is what guarantees the copy
  // can never end up underneath the art at a narrow width. Decorative → alt="" and
  // the banner's own aria-label carries the meaning. A missing/blocked asset simply
  // removes itself — the banner is fully functional without it.
  if (exploreImage) {
    const illo = document.createElement('img');
    illo.className = 'c-apps-explore__illo';
    illo.alt = '';
    illo.draggable = false;
    illo.decoding = 'async';                 // ~800 KB export — never block the header's first paint
    // …and `decoding` only defers the DECODE. The Apps tab is HIDDEN at shell boot,
    // so without `lazy` the largest asset in the app is fetched + parsed for a
    // surface the user may never open (empty-state.js / apps-icon.js do the same).
    illo.loading = 'lazy';
    illo.addEventListener('error', () => illo.remove(), { once: true });
    illo.src = exploreImage;
    banner.append(illo);
  }
  banner.setAttribute('aria-label', bt1.textContent + ' ' + ctaText);
  banner.addEventListener('click', () => { if (onExplore) onExplore(); });
  el.append(banner);

  return el;
}

/** Free fn (#44): flag the header as "nothing installed" — hides the search + layout
 *  row (dead controls when there is nothing to search or re-lay-out) and leaves the
 *  Explore banner, which is the discovery route the empty state points at. */
export function setAppsHeaderEmpty(el, empty) {
  if (!el) return el;
  if (empty) el.dataset.empty = '';
  else delete el.dataset.empty;
  return el;
}
