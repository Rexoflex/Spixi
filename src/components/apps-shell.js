/**
 * c-apps-shell — Apps flow shell: model + render pipeline (spec: docs/apps-shell-spec.md).
 * Holds the installed-apps MODEL and renders them as a list (rows) or grid (cards)
 * per state.layout. Search filters the MODEL, not the DOM (#52). Reuses createAppItem.
 * Update APIs are FREE FUNCTIONS operating on (listEl, state, …) per #44.
 *
 * Model:
 *   app:   { id, name, icon, creator }
 *   state: { apps:[], query:'', layout:'list'|'grid' }
 * opts:  { strings, host, onLaunch(app), onOpen(app), onUninstall(app), onModelChange,
 *          emptyIllustration, onAddApp }
 *         onLaunch = primary tap (launch the app + record recent); onOpen = open details
 *         (the ⋮ "App details" action). Recents model: recordRecent / orderedRecents.
 *         emptyIllustration + onAddApp drive the FULL empty state (c-empty-state) shown
 *         when nothing is installed; a search that matches nothing keeps the small note.
 *         zeroReady:false suppresses that full empty state entirely — the surface has
 *         not been given data yet, so it may not claim the account is empty (see ★).
 *
 * ★ ROW REUSE (perf). renderAppsList used to `textContent = ''` and rebuild every row,
 * which meant a brand-new <img> — and therefore a fresh resource lookup + decode of a
 * multi-hundred-KB `data:image/png` icon — on EVERY render. Renders are NOT rare:
 * HomePage.loadApps(true) re-pushes clearApps + addApp-per-app on every switch to the
 * Apps tab (HomePage.xaml.cs:636-638 → :2727), each addApp schedules a render, and
 * every search keystroke renders too. Rows are now KEYED BY APP ID and reused whenever
 * their visible fields are unchanged, so an identical re-push mutates ZERO DOM nodes
 * and re-decodes ZERO images. The cache survives the intermediate EMPTY render that
 * clearApps produces when C# dispatches its burst across frames — that is exactly the
 * "it reloads the app images every time" symptom.
 */
import { getStrings } from './strings-runtime.js';
import { createAppItem } from './apps-item.js';
import { openAppMenu } from './apps-menu.js';
import { createEmptyState } from './empty-state.js';

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

/* ————————————————————— row cache (keyed reuse, see docblock) —————————————————
 * Per-list, keyed by app id (index fallback for the id-less rows a demo may feed).
 * Entries survive an empty render on purpose — the clearApps → addApp×N burst would
 * otherwise throw every row (and every decoded icon) away mid-flight. Capped so an
 * install/uninstall churn can't grow it without bound.                             */
const listCaches = new WeakMap();
const ROW_CACHE_MAX = 64;

function cacheFor(listEl) {
  let c = listCaches.get(listEl);
  if (!c) { c = { rows: new Map(), live: new Map(), empty: null, emptyKind: null }; listCaches.set(listEl, c); }
  return c;
}
function rowKey(app, i) {
  return (app && app.id != null && app.id !== '') ? 'id:' + app.id : 'ix:' + i;
}
/** Cheap field-wise equality — deliberately NOT a joined signature string, which
 *  would copy the whole data-URI icon on every render (the cost we came to remove). */
function rowFresh(hit, a, layout, hasInfo, hasMenu) {
  return !!hit
    && hit.layout === layout
    && hit.name === (a.name || '')
    && hit.creator === (a.creator || '')
    && hit.icon === (a.icon || null)
    && hit.hasInfo === hasInfo
    && hit.hasMenu === hasMenu;
}

/** The empty node: a full c-empty-state when NOTHING is installed (illustration +
 *  headline + supporting line + the Add-app CTA), the quiet inline note when a
 *  SEARCH matched nothing (an illustration for "no results" reads as an error).
 *  Returns null when there is nothing to say yet (the LOAD WINDOW — see below). */
function appsEmptyNode(cache, state, opts, strings) {
  const q = (state.query || '').trim();
  // Kind carries the SHAPE, not just the branch: a surface that renders once without
  // art/CTA (a bare demo render, a bridge push that lands before opts are wired) must
  // not pin an art-less node for every later render — the cached node would silently
  // outlive the opts that were supposed to fill it.
  const kind = q ? 'search' : 'all:' + (opts.emptyIllustration ? 'i' : '-') + (opts.onAddApp ? 'a' : '-');
  // ★ LOAD WINDOW GATE. The illustrated state is a CLAIM about the account ("you
  // have no mini apps") — an EMPTY MODEL is not that claim while the surface is
  // still being filled. The shell builds this list synchronously at boot and
  // C#'s clearApps→addApp×N burst is NOT reliably same-frame, so an ungated
  // render paints the full zero state (art + CTA) over a list that is about to
  // fill. `zeroReady:false` renders NO empty node at all — a blank beat, not a
  // false claim; the host opens the gate once the surface has been given data
  // (or has gone quiet with nothing in it). A no-match SEARCH is a statement
  // about the QUERY, not the account, so it is never gated.
  if (kind !== 'search' && opts.zeroReady === false) return null;
  if (cache.empty && cache.emptyKind === kind) {
    if (kind === 'search') cache.empty.textContent = appsEmptyCopy(state, strings);
    return cache.empty;
  }
  let el;
  if (kind === 'search') {
    el = document.createElement('div');
    el.className = 'c-apps-empty';
    el.setAttribute('role', 'note');
    el.textContent = appsEmptyCopy(state, strings);
  } else {
    el = createEmptyState({
      illustration: opts.emptyIllustration || null,
      glyph: 'apps',
      title: strings.appsEmptyTitle || 'Mini apps, right inside Spixi',
      body: strings.appsEmptyBody
        || 'Games, tools and on-device AI that run inside a conversation. Add one from a link, a QR code, or a file. It takes seconds.',
      actionLabel: opts.onAddApp ? (strings.addApp || 'Add app') : '',
      actionIcon: 'circle-plus',
      onAction: opts.onAddApp || null,
    });
    el.classList.add('c-apps-empty-state');
  }
  cache.empty = el;
  cache.emptyKind = kind;
  return el;
}

/** (Re)render the whole list from the model. `state.layout` picks row vs card and
 *  sets `listEl[data-layout]` so the CSS switches between a column and a 2-up grid.
 *  Rows are REUSED by app id when nothing visible changed (docblock ★) — an identical
 *  re-push performs zero DOM mutations and zero image decodes. */
export function renderAppsList(listEl, state, opts = {}) {
  const strings = opts.strings || getStrings();
  const layout = state.layout === 'grid' ? 'grid' : 'list';
  listEl.dataset.layout = layout;

  const cache = cacheFor(listEl);
  const apps = orderedApps(state);
  const hasInfo = !!(opts.appMenu === false && opts.onOpen);
  const hasMenu = opts.appMenu !== false;

  // Cache keys, de-duplicated. A feed CAN hand us two entries sharing an id (a
  // double addApp for the same app, a malformed manifest): the shared key made
  // rowFresh return the SAME element twice, `nodes` held one node twice, and the
  // insert-before reconcile below simply MOVED it — rendering ONE row for two
  // model entries (a silently swallowed app). Every duplicate falls back to its
  // own index-scoped key, so the list never renders fewer rows than the model has.
  const seenKeys = new Set();
  const keys = apps.map((a, i) => {
    const k = rowKey(a, i);
    if (!seenKeys.has(k)) { seenKeys.add(k); return k; }
    return k + '#' + i;
  });

  // Live index FIRST: a REUSED row's handlers resolve their app THROUGH this map, so
  // a re-push (which hands us brand-new objects for the same apps) can never leave a
  // row holding a stale reference — the bug an identity-based uninstall would hit.
  cache.live.clear();
  apps.forEach((a, i) => cache.live.set(keys[i], a));

  const nodes = apps.map((a, i) => {
    const key = keys[i];
    const hit = cache.rows.get(key);
    if (rowFresh(hit, a, layout, hasInfo, hasMenu)) return hit.el;
    const cur = () => cache.live.get(key) || a;          // always the CURRENT model object
    const el = createAppItem({
      ...a, layout, strings,
      onOpen: opts.onLaunch ? () => opts.onLaunch(cur()) : undefined,   // tap → LAUNCH the app
      // ⓘ info → open details (launch-mode/uninstall live there). Mobile v1 uses this
      // INSTEAD of the ⋮ menu: wired only when the menu is off (appMenu:false) and a
      // details handler exists — so a menu-driven surface (demos) never doubles up.
      onInfo: hasInfo ? () => opts.onOpen(cur()) : undefined,
      onMenu: !hasMenu ? undefined : () => openAppMenu({
        app: cur(), host: opts.host, strings,
        allowInvite: !!opts.onLaunchMulti,   // A9: never render a row that no-ops (#184 class)
        onAction: (action) => applyAppAction(listEl, state, cur(), action, opts),
      }),
    });
    cache.rows.set(key, { el, layout, name: a.name || '', creator: a.creator || '', icon: a.icon || null, hasInfo, hasMenu });
    return el;
  });
  const emptyEl = apps.length ? null : appsEmptyNode(cache, state, opts, strings);
  if (emptyEl) nodes.push(emptyEl);
  // data-empty = "nothing installed at all" (the illustrated state) — the CSS grows the
  // list to fill the scroller and centres it. A no-match SEARCH is NOT this state, and
  // neither is the gated load window (no empty node at all → no [data-empty]).
  if (emptyEl && String(cache.emptyKind || '').startsWith('all')) listEl.dataset.empty = '';
  else delete listEl.dataset.empty;

  /* In-place reconcile: only nodes that actually MOVED are touched. A re-push of an
   * unchanged list walks the children and mutates nothing (replaceChildren would
   * detach + reattach every row instead). */
  let cursor = listEl.firstChild;
  for (const n of nodes) {
    if (cursor === n) { cursor = cursor.nextSibling; continue; }
    listEl.insertBefore(n, cursor);
  }
  while (cursor) { const next = cursor.nextSibling; listEl.removeChild(cursor); cursor = next; }

  /* N24 — two-pane selection (the chats selectChat precedent): the row whose
   * details pane is open carries aria-current. Stamped OUTSIDE the row cache on
   * every render — a selection flip must not dirty rowFresh (the reuse keys stay
   * selection-blind), and a reused row sheds a stale highlight here. Driven by
   * state.selectedId; '' / undefined clears every row.
   * ★ Loop B-MAJOR-1: the attribute lands on __open, NOT the wrapper. __open is
   * the box that PAINTS (the A5 split) and the focusable control (SRs announce
   * "current" with focus, the chatlist parity) — and a wrapper [aria-current]
   * would drag .c-app-item into base.css's selected press/fade variants, whose
   * :not(.c-app-item) guards exist precisely because the wrapper must never
   * carry press paint (the documented grid card blink). */
  const selId = state.selectedId == null ? '' : String(state.selectedId);
  for (const n of nodes) {
    if (!n || !n.dataset || n.dataset.appId == null) continue;
    const open = n.querySelector('.c-app-item__open');
    if (!open) continue;
    if (selId && n.dataset.appId === selId) open.setAttribute('aria-current', 'true');
    else open.removeAttribute('aria-current');
  }

  // trim the cache oldest-first, never dropping a row that is on screen right now
  if (cache.rows.size > ROW_CACHE_MAX) {
    const keep = new Set(keys);
    for (const k of [...cache.rows.keys()]) {
      if (cache.rows.size <= ROW_CACHE_MAX) break;
      if (!keep.has(k)) cache.rows.delete(k);
    }
  }
  return listEl;
}

/** Apply an app ⋮-menu action (spec §2.1). 'open' launches (opts.onLaunch), 'details'
 *  opens the details view (opts.onOpen), 'uninstall' removes the app from the model,
 *  fires opts.onUninstall (bridge intent → `ixian:uninstall`, mock now), re-renders. */
export function applyAppAction(listEl, state, app, action, opts = {}) {
  switch (action) {
    case 'open': if (opts.onLaunch) opts.onLaunch(app); return;
    case 'details': if (opts.onOpen) opts.onOpen(app); return;
    case 'invite': if (opts.onLaunchMulti) opts.onLaunchMulti(app); return;   // A9 (#302): dual-capability app
    // by ID, not by object identity: rows are reused across re-pushes, so the object
    // a handler hands back may be a different instance describing the same app.
    case 'uninstall':
      state.apps = (state.apps || []).filter((a) => {
        if (a === app) return false;
        return !(a && app && app.id != null && app.id !== '' && a.id === app.id);
      });
      break;
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
