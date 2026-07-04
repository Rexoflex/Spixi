/**
 * c-apps-discover — the Discover view (spec §2.4), PARKED until the apps.spixi.io
 * directory feed is wired (Damir to source). Renders the category chip row and,
 * while parked, a "coming soon" placeholder; when `ready` flips true, it exposes a
 * grid container that the feed populates (icon · name · creator cards → details).
 *
 * createAppsDiscover({ strings, categories, ready, onCategory }) → view
 */
import { createChip } from './chip.js';
import { icon } from './icons.js';

const APP_CATEGORIES = ['All', 'AI', 'Games', 'IoT', 'Tools', 'Dev Tools'];

export function createAppsDiscover({ strings = {}, categories = APP_CATEGORIES, ready = false, onCategory } = {}) {
  const el = document.createElement('div');
  el.className = 'c-apps-discover';
  if (!ready) el.dataset.parked = '';

  const cats = document.createElement('div');
  cats.className = 'c-apps-discover__cats';
  cats.setAttribute('role', 'group');
  cats.setAttribute('aria-label', strings.categories || 'Categories');
  categories.filter(Boolean).forEach((cat, i) => {
    cats.append(createChip({ label: cat, selected: i === 0, onClick: () => { if (onCategory) onCategory(cat); }, strings }));
  });
  el.append(cats);

  if (ready) {
    const grid = document.createElement('div');       // fed by the directory once wired
    grid.className = 'c-apps-list';
    grid.dataset.layout = 'grid';
    el.append(grid);
  } else {
    const soon = document.createElement('div');
    soon.className = 'c-apps-discover__soon';
    soon.setAttribute('role', 'note');
    soon.append(icon('rocket', { size: 32 }));
    const t = document.createElement('p');
    t.textContent = strings.discoverSoon
      || 'The Spixi Mini App directory is coming soon — you’ll browse and install featured apps right here.';
    soon.append(t);
    el.append(soon);
  }
  return el;
}
