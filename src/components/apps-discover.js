/**
 * c-apps-discover — the Discover view (spec §2.4), now LIVE-capable (DECISIONS #131):
 * `setDiscoverFeed(el, feed, opts)` renders a parsed apps.spixi.io feed (apps-feed.js) —
 * Featured strip + card grid, category chips filtering client-side, installed apps
 * badged and routed to the SAME onOpen (details resolves installed → Open pill).
 *
 * Without a feed it stays PARKED: chips + "coming soon" + the `onBrowseWeb` fallback
 * button (the web directory exists today, so Explore never dead-ends; shell routes the
 * tap through the external-link confirm, like every outbound link).
 *
 * The component never fetches — the SHELL owns transport (direct fetch where the WebView
 * allows it; bridge proxy otherwise — iOS WKWebView whitelist question, §9) and calls
 * setDiscoverFeed on success. Fetch failure → simply don't call it (parked view stands).
 *
 * createAppsDiscover({ strings, categories, ready, onCategory, onBrowseWeb, onOpen }) → view
 * setDiscoverFeed(el, feed, { strings, onCategory, onOpen }) — free fn (#44)
 */
import { getStrings } from './strings-runtime.js';
import { createChip, setChipSelected } from './chip.js';
import { createButton } from './button.js';
import { createBadge } from './badge.js';
import { createAppIcon } from './apps-icon.js';
import { icon } from './icons.js';

const APP_CATEGORIES = ['All', 'AI', 'Games', 'IoT', 'Tools', 'Dev Tools'];

/* Unlikely-separator for comparing label lists. Built with fromCharCode — this file
 * used to carry two LITERAL 0x00 bytes here, which made build-demo-bundle's #255
 * integrity gate fail every bundle build ("bundle contains a NUL byte", the gate's
 * one false positive). NO source file may contain a literal NUL byte (or a
 * backslash-u escape that an editor/tool might decode into one). */
const LIST_SEP = String.fromCharCode(0);

function chipRow(categories, strings, onPick) {
  const cats = document.createElement('div');
  cats.className = 'c-apps-discover__cats';
  cats.setAttribute('role', 'group');
  cats.setAttribute('aria-label', strings.categories || 'Categories');
  categories.filter(Boolean).forEach((cat, i) => {
    cats.append(createChip({
      label: cat, selected: i === 0,
      onClick: (e) => {
        for (const c of cats.children) setChipSelected(c, c === e.currentTarget);
        onPick(cat);
      },
      strings,
    }));
  });
  return cats;
}

/** One discover card — icon · name+publisher · Installed badge (when installed). */
function discoverCard(app, strings, onOpen) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'c-apps-discover__card';
  card.append(createAppIcon({ src: app.icon, name: app.name, size: 48 }));
  const text = document.createElement('span');
  text.className = 'c-apps-discover__cardtext';
  const nm = document.createElement('span');
  nm.className = 'c-apps-discover__cardname';
  nm.textContent = app.name || '';
  text.append(nm);
  if (app.publisher) {
    const pub = document.createElement('span');
    pub.className = 'c-apps-discover__cardpub';
    pub.textContent = app.publisher;
    text.append(pub);
  }
  card.append(text);
  if (app.installed) card.append(createBadge({ label: strings.installed || 'Installed', type: 'accent', icon: 'check' }));
  if (onOpen) card.addEventListener('click', () => onOpen(app));
  return card;
}

/** Render/refresh the live sections (featured + grid) for a category. */
function renderLive(el, feed, category, { strings = getStrings(), onOpen } = {}) {
  const host = el.querySelector('.c-apps-discover__live');
  if (!host) return;
  host.textContent = '';
  const all = feed.apps || [];
  const inCat = (a) => category === 'All' || !category || a.category === category;

  const featured = all.filter((a) => a.featured && inCat(a));
  if (featured.length) {
    const ftitle = document.createElement('h3');
    ftitle.className = 'c-apps-discover__sectiontitle';
    ftitle.textContent = strings.featured || 'Featured';
    const strip = document.createElement('div');
    strip.className = 'c-apps-discover__featured';
    for (const app of featured) {
      // plain buttons — role="listitem" would override button semantics for SRs (#106③)
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'c-apps-discover__ftile';
      tile.append(createAppIcon({ src: app.icon, name: app.name, size: 56 }));
      const nm = document.createElement('span');
      nm.className = 'c-apps-discover__fname';
      nm.textContent = app.name || '';
      tile.append(nm);
      if (app.installed) tile.dataset.installed = '';
      if (onOpen) tile.addEventListener('click', () => onOpen(app));
      strip.append(tile);
    }
    host.append(ftitle, strip);
  }

  const rest = all.filter(inCat);
  if (rest.length) {
    const grid = document.createElement('div');
    grid.className = 'c-apps-discover__grid';
    for (const app of rest) grid.append(discoverCard(app, strings, onOpen));
    host.append(grid);
  } else {
    const empty = document.createElement('p');
    empty.className = 'c-apps-discover__empty';
    empty.setAttribute('role', 'note');
    empty.textContent = (strings.discoverEmptyCat || 'No {cat} apps yet. Check back soon.')
      .split('{cat}').join(category || '');
    host.append(empty);
  }
}

export function createAppsDiscover({ strings = getStrings(), categories = APP_CATEGORIES, ready = false, onCategory, onBrowseWeb, onOpen } = {}) {
  const el = document.createElement('div');
  el.className = 'c-apps-discover';
  if (!ready) el.dataset.parked = '';

  el.append(chipRow(categories, strings, (cat) => {
    if (el.dataset.parked === undefined) renderLive(el, el._feed || { apps: [] }, cat, { strings, onOpen: el._onOpen });
    el._category = cat;
    if (onCategory) onCategory(cat);
  }));
  el._category = categories[0] || 'All';

  if (ready) {
    const live = document.createElement('div');
    live.className = 'c-apps-discover__live';
    el.append(live);
  } else {
    const soon = document.createElement('div');
    soon.className = 'c-apps-discover__soon';
    soon.setAttribute('role', 'note');
    soon.append(icon('rocket', { size: 32 }));
    const t = document.createElement('p');
    t.textContent = strings.discoverSoon
      || 'The Spixi Mini App directory is coming soon. You’ll browse and install featured apps right here.';
    soon.append(t);
    if (onBrowseWeb) {                                   // fallback — the web directory exists today
      soon.append(createButton({
        label: strings.browseWeb || 'Browse on the web', type: 'outline', size: 44,
        icon: icon('arrow-right', { size: 18 }), iconPosition: 'trailing',
        onClick: onBrowseWeb,
      }));
    }
    el.append(soon);
  }
  return el;
}

/** Free fn (#44): feed arrived — flip a parked view live (or refresh a live one) and
 *  render. `feed` = parseAppsFeed output; its categories rebuild the chip row when they
 *  differ from what's shown. Keeps the current category selection when still present. */
export function setDiscoverFeed(el, feed, { strings = getStrings(), onCategory, onOpen } = {}) {
  if (!el || !feed) return el;
  el._feed = feed;
  el._onOpen = onOpen;
  delete el.dataset.parked;

  const soon = el.querySelector('.c-apps-discover__soon');
  if (soon) soon.remove();
  if (!el.querySelector('.c-apps-discover__live')) {
    const live = document.createElement('div');
    live.className = 'c-apps-discover__live';
    el.append(live);
  }
  if (feed.categories && feed.categories.length) {
    const current = el.querySelector('.c-apps-discover__cats');
    const shown = current ? [...current.querySelectorAll('.c-chip')].map((c) => c.textContent) : [];
    if (shown.join(LIST_SEP) !== feed.categories.join(LIST_SEP)) {
      const fresh = chipRow(feed.categories, strings, (cat) => {
        renderLive(el, el._feed, cat, { strings, onOpen });
        el._category = cat;
        if (onCategory) onCategory(cat);
      });
      if (current) current.replaceWith(fresh); else el.prepend(fresh);
      el._category = feed.categories[0];
    }
  }
  if (!feed.categories || !feed.categories.includes(el._category)) el._category = 'All';
  renderLive(el, feed, el._category, { strings, onOpen });
  return el;
}
