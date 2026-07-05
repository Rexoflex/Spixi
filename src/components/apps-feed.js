/**
 * apps-feed — the apps.spixi.io directory CONTRACT (DECISIONS #128④; endpoint confirmed
 * by Damir 2026-07-05): GET https://apps.spixi.io/data/apps.json — CORS `*`, max-age=600,
 * static GitHub Pages. Pure mapping, NO fetching here — the shell owns transport
 * (direct fetch where the WebView allows it; bridge proxy otherwise — the iOS WKWebView
 * http/https whitelist question is logged for BE, §9).
 *
 * Feed entry shape (site repo: ixian-platform/Spixi-Mini-Apps-Website):
 *   { id, name, publisher, description, category, featured, version,
 *     icon (png url), spixiUrl (install url), github, singleUser, multiUser }
 * Top level: { apps: [...], categories: ['All','AI','Games','IoT','Tools','Dev Tools'] }
 * (categories match c-apps-discover's built-in set — feed wins when present).
 *
 * Missing vs the details model — site-schema WISHLIST (Damir owns the repo):
 *   cover, screenshots[], related[], size, verified.
 *
 * feedEntryToApp(entry, state) → app (our model; `installed` resolved against state.apps
 *   so Discover can flag installed apps and route to the installed details, Damir ask)
 * parseAppsFeed(json, state) → { apps, categories } (json string or object; throws on
 *   malformed JSON — caller guards and falls back to the parked view)
 */

export const APPS_FEED_URL = 'https://apps.spixi.io/data/apps.json';

export function feedEntryToApp(entry, state) {
  if (!entry || typeof entry !== 'object' || entry.id == null) return null;
  const installed = !!(state && (state.apps || []).some((a) => a && a.id === entry.id));
  const caps = [];
  if (entry.multiUser) caps.push('MultiUser');
  return {
    id: entry.id,
    name: String(entry.name || ''),
    publisher: entry.publisher || '',
    description: entry.description || '',
    category: entry.category || '',
    featured: !!entry.featured,
    version: entry.version || '',
    icon: entry.icon || null,
    url: entry.spixiUrl || '',
    github: entry.github || '',
    capabilities: caps,
    installed,
  };
}

export function parseAppsFeed(json, state) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  const entries = data && Array.isArray(data.apps) ? data.apps : [];
  const cats = data && Array.isArray(data.categories) ? data.categories.filter(Boolean) : [];
  return {
    apps: entries.map((e) => feedEntryToApp(e, state)).filter(Boolean),
    categories: cats.length ? cats : undefined,
  };
}
