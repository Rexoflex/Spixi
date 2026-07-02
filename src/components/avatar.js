/**
 * c-avatar — photo, or deterministic gradient placeholder (DECISIONS.md #34).
 * Hue derives from the address hash → stable identity color per contact.
 * Named contacts show initials; address-only contacts show the user glyph.
 *
 * createAvatar({ src, name, address, size = 48, online = false })
 */
import { icon } from './icons.js';

function hashHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % 360;
}

function initials(name) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const chars = parts.map(p => p[0].toUpperCase()).join('');
  // address-like "names" (no real word boundary, hex-ish) don't get initials
  return /^[A-Za-z]/.test(name) ? chars : null;
}

export function createAvatar({ src = null, name = '', address = '', size = 48, online = false } = {}) {
  const el = document.createElement('span');
  el.className = 'c-avatar';
  el.style.width = size + 'px';
  el.style.height = size + 'px';

  if (src) {
    const img = document.createElement('img');
    img.className = 'c-avatar__img';
    img.src = src;
    img.alt = '';
    el.append(img);
  } else {
    const hue = hashHue(address || name);
    // runtime-computed identity color (sanctioned dynamic style, like #29 morph)
    el.style.backgroundImage =
      'linear-gradient(135deg, hsl(' + hue + ', 62%, 62%), hsl(' + ((hue + 40) % 360) + ', 58%, 45%))';
    const ini = name ? initials(name) : null;
    if (ini) {
      const t = document.createElement('span');
      t.className = 'c-avatar__initials';
      t.textContent = ini;
      t.style.fontSize = Math.round(size * 0.38) + 'px';
      el.append(t);
    } else {
      el.append(icon('user-circle', { size: Math.round(size * 0.55) }));
    }
  }

  if (online) {
    const dot = document.createElement('span');
    dot.className = 'c-avatar__dot';
    el.append(dot);
  }
  return el;
}
