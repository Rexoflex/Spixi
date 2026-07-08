/**
 * c-app-icon — a mini-app's icon as a rounded-SQUARE tile (the square sibling of
 * the round c-avatar). Shows the app image, or a deterministic gradient placeholder
 * (first letter, or the apps glyph) when no icon is available. Reuses the avatar
 * hue hash so a given app is always the same colour. Sizes: 48 (row) / 64 (card).
 *
 * createAppIcon({ src, name, size = 48 }) → span
 */
import { icon } from './icons.js';
import { hashHue } from './avatar.js';

/** First letter for the placeholder (any script); null for empty/non-letter names. */
function appInitial(name) {
  const s = String(name || '').trim();
  if (!/^\p{L}/u.test(s)) return null;
  return [...s][0].toLocaleUpperCase();   // [...s] not s[0] — first char may be astral-plane
}

/** Render the deterministic gradient tile (hue from name hash) + the initial or the
 *  apps glyph into `el`. Extracted so it's reusable as the onerror fallback when a
 *  photo `src` fails to load — mirrors c-avatar's renderPlaceholder. */
function renderAppPlaceholder(el, { name, size }) {
  const hue = hashHue(name || 'app');
  el.dataset.placeholder = '';
  el.style.setProperty('--ai-h1', hue);
  el.style.setProperty('--ai-h2', (hue + 40) % 360);
  const letter = appInitial(name);
  if (letter) {
    const t = document.createElement('span');
    t.className = 'c-app-icon__initial';
    t.setAttribute('aria-hidden', 'true');
    t.textContent = letter;
    el.append(t);
  } else {
    el.append(icon('apps', { size: Math.round(size * 0.5) }));
  }
}

export function createAppIcon({ src = null, name = '', size = 48 } = {}) {
  const el = document.createElement('span');
  el.className = 'c-app-icon';
  el.dataset.size = String(size);
  if (size !== 48 && size !== 64) { el.style.width = size + 'px'; el.style.height = size + 'px'; }

  if (src) {
    const img = document.createElement('img');
    img.className = 'c-app-icon__img';
    img.alt = '';                          // decorative — the name label carries meaning
    // Graceful fallback (mirrors c-avatar): a C# icon path that doesn't resolve in a
    // self-contained shell must NOT show a broken-image glyph — drop the <img> and
    // render the gradient tile. Handler BEFORE src so a sync-cached error still fires.
    img.addEventListener('error', () => { img.remove(); renderAppPlaceholder(el, { name, size }); }, { once: true });
    img.src = src;
    el.append(img);
  } else {
    renderAppPlaceholder(el, { name, size });
  }
  return el;
}
