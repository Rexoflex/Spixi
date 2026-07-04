/**
 * c-apps-header — the Apps screen header (spec §2.1): a search field, a self-syncing
 * list⇄grid layout toggle, and the blue "Explore Spixi Mini Apps" discover banner.
 * The toggle shows the layout you'll switch TO and reports the new layout via
 * onToggleLayout(next); the demo wires that to setAppsLayout.
 *
 * createAppsHeader({ layout, strings, discover, onQuery, onToggleLayout, onExplore }) → div
 */
import { createSearchField } from './search-field.js';
import { icon } from './icons.js';

export function createAppsHeader({ layout = 'list', strings = {}, discover = false, exploreImage = null, onQuery, onToggleLayout, onExplore } = {}) {
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

  /* explore / discover banner (parked until the feed lands, §2.4) */
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
  if (exploreImage) {
    const illo = document.createElement('img');
    illo.className = 'c-apps-explore__illo';
    illo.src = exploreImage;
    illo.alt = '';
    banner.append(illo);
  }
  banner.setAttribute('aria-label', bt1.textContent + ' ' + ctaText);
  banner.addEventListener('click', () => { if (onExplore) onExplore(); });
  el.append(banner);

  return el;
}
