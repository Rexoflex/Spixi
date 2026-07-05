/**
 * c-apps-recents — a horizontal "Recently used" strip above the installed list.
 * Reuses c-app-icon; each tile taps to LAUNCH (opts.onLaunch). Hidden when there are
 * no recents. Model lives in apps-shell (recordRecent / orderedRecents), in-memory
 * for now (persistence deferred, §7).
 *
 * createAppsRecents(state, opts) → section
 * renderAppsRecents(el, state, opts) — free-fn updater (#44): rebuilds the strip.
 */
import { createAppIcon } from './apps-icon.js';
import { orderedRecents } from './apps-shell.js';

export function renderAppsRecents(el, state, opts = {}) {
  const strings = opts.strings || {};
  el.textContent = '';
  const recents = orderedRecents(state, 8);
  if (!recents.length) { el.hidden = true; return el; }   // graceful — nothing launched yet
  el.hidden = false;

  const title = document.createElement('h2');
  title.className = 'c-apps-recents__title';
  title.textContent = strings.recentlyUsed || 'Recently used';
  el.append(title);

  const strip = document.createElement('div');
  strip.className = 'c-apps-recents__strip';
  for (const app of recents) {
    // plain buttons — role="listitem" would override button semantics for SRs (#106③ precedent)
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'c-apps-recents__item';
    tile.setAttribute('aria-label', app.name || strings.app || 'App');
    tile.append(createAppIcon({ src: app.icon, name: app.name, size: 56 }));
    const nm = document.createElement('span');
    nm.className = 'c-apps-recents__name';
    nm.textContent = app.name || '';
    tile.append(nm);
    if (opts.onLaunch) tile.addEventListener('click', () => opts.onLaunch(app));
    strip.append(tile);
  }
  el.append(strip);
  return el;
}

export function createAppsRecents(state, opts = {}) {
  const el = document.createElement('section');
  el.className = 'c-apps-recents';
  renderAppsRecents(el, state, opts);
  return el;
}
