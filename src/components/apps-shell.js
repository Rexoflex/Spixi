/**
 * c-apps-shell — Apps flow shell: model + render pipeline (spec: docs/apps-shell-spec.md).
 * Holds the installed-apps MODEL and renders them as a list (rows) or grid (cards)
 * per state.layout. Search filters the MODEL, not the DOM (#52). Reuses createAppItem.
 * Update APIs are FREE FUNCTIONS operating on (listEl, state, …) per #44.
 *
 * Model:
 *   app:   { id, name, icon, creator }
 *   state: { apps:[], query:'', layout:'list'|'grid' }
 * opts:  { strings, host, onLaunch(app), onOpen(app), onUninstall(app), onModelChange }
 *         onLaunch = primary tap (launch the app + record recent); onOpen = open details
 *         (the ⋮ "App details" action). Recents model: recordRecent / orderedRecents.
 */
import { getStrings } from './strings-runtime.js';
import { createAppItem } from './apps-item.js';
import { openAppMenu } from './apps-menu.js';

/* ————————————————————————— model (pure, DOM-free) ————————————————————————— */

/** Substring match over name (+ creator). Empty/whitespace needle matches all. */
export function appMatchesQuery(app, needle) {
  const q = (needle || '').trim().toLocaleLowerCase();
  if (!q) return true;
  if ((app.name || '').toLocaleLowerCase().includes(q)) return true;
  return (app.creator || '').toLocaleLowerCase().includes(q);
}

/** Visible apps: source order (install order, as the bridge appends), query-filtered.
 *  (Alphabetical sort is a logged enhancement — keeps parity with today's addApp.) */
export function orderedApps(state) {
  return (state.apps || [])
    .filter(Boolean)                                   // harden against null entries from a bridge feed
    .filter((a) => appMatchesQuery(a, state.query));
}

/** Recents model: `state.recents` is a most-recent-first list of app ids. Launching an
 *  app moves it to the front (deduped, capped). Resolved back to live app objects for
 *  render — uninstalled/unknown ids drop out automatically. In-memory (persistence §7). */
export function recordRecent(state, app) {
  if (!app || app.id == null) return state;
  const arr = (state.recents || []).filter((x) => x !== app.id);
  arr.unshift(app.id);
  state.recents = arr.slice(0, 12);
  return state;
}
export function orderedRecents(state, limit = 8) {
  const byId = new Map((state.apps || []).filter(Boolean).map((a) => [a.id, a]));
  return (state.recents || [])
    .map((id) => byId.get(id))
    .filter(Boolean)
    .slice(0, limit);
}

/* ————————————————————————————— render pipeline ————————————————————————————— */

function appsEmptyCopy(state, strings) {
  const q = (state.query || '').trim();
  if (q) return (strings.appsEmptySearch || 'No apps match “{q}”').split('{q}').join(q);
  return strings.appsEmptyAll || 'No mini apps yet';
}

function appsEmptyState(state, strings) {
  const el = document.createElement('div');
  el.className = 'c-apps-empty';
  el.setAttribute('role', 'note');
  el.textContent = appsEmptyCopy(state, strings);
  return el;
}

/** (Re)render the whole list from the model. `state.layout` picks row vs card and
 *  sets `listEl[data-layout]` so the CSS switches between a column and a 2-up grid. */
export function renderAppsList(listEl, state, opts = {}) {
  const strings = opts.strings || getStrings();
  const layout = state.layout === 'grid' ? 'grid' : 'list';
  listEl.dataset.layout = layout;
  listEl.textContent = '';                             // clear (detaches old rows + listeners for GC)

  const apps = orderedApps(state);
  for (const a of apps) {
    listEl.append(createAppItem({
      ...a, layout, strings,
      onOpen: opts.onLaunch ? () => opts.onLaunch(a) : undefined,   // tap → LAUNCH the app (⋮ → details/uninstall)
      onMenu: opts.appMenu === false ? undefined : () => openAppMenu({
        app: a, host: opts.host, strings,
        onAction: (action) => applyAppAction(listEl, state, a, action, opts),
      }),
    }));
  }
  if (!apps.length) listEl.append(appsEmptyState(state, strings));
  return listEl;
}

/** Apply an app ⋮-menu action (spec §2.1). 'open' launches (opts.onLaunch), 'details'
 *  opens the details view (opts.onOpen), 'uninstall' removes the app from the model,
 *  fires opts.onUninstall (bridge intent → `ixian:uninstall`, mock now), re-renders. */
export function applyAppAction(listEl, state, app, action, opts = {}) {
  switch (action) {
    case 'open': if (opts.onLaunch) opts.onLaunch(app); return;
    case 'details': if (opts.onOpen) opts.onOpen(app); return;
    case 'uninstall': state.apps = (state.apps || []).filter((a) => a !== app); break;
    default: return;
  }
  if (opts.onUninstall) opts.onUninstall(app);              // bridge intent (mock no-op)
  renderAppsList(listEl, state, opts);
  if (opts.onModelChange) opts.onModelChange(state);
}

/** Build the list container and render it. */
export function createAppsList(state, opts = {}) {
  const el = document.createElement('div');
  el.className = 'c-apps-list';
  renderAppsList(el, state, opts);
  return el;
}

/* update APIs — free functions (#44): mutate state, re-render, return listEl */

export function setAppsLayout(listEl, state, layout, opts) {
  state.layout = layout === 'grid' ? 'grid' : 'list';   // in-memory preference (persistence deferred, §7)
  return renderAppsList(listEl, state, opts);
}

export function setAppsQuery(listEl, state, query, opts) {
  state.query = query;
  return renderAppsList(listEl, state, opts);
}
