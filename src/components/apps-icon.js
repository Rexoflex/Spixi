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

export function createAppIcon({ src = null, name = '', size = 48 } = {}) {
  const el = document.createElement('span');
  el.className = 'c-app-icon';
  el.dataset.size = String(size);
  if (size !== 48 && size !== 64) { el.style.width = size + 'px'; el.style.height = size + 'px'; }

  if (src) {
    const img = document.createElement('img');
    img.className = 'c-app-icon__img';
    img.src = src;
    img.alt = '';                          // decorative — the name label carries meaning
    el.append(img);
  } else {
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
  return el;
}
