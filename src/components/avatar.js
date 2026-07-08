/**
 * c-avatar — photo, or deterministic gradient placeholder (DECISIONS.md #34).
 * Hue derives from the address hash → stable identity color per contact.
 * Named contacts show initials; address-only contacts show the user glyph.
 *
 * createAvatar({ src, name, address, size = 48, online = false })
 */
import { icon } from './icons.js';

export function hashHue(str) { // exported: sender labels reuse the identity hue (single source)
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  // avalanche mix (murmur3 finalizer) — plain h%360 clustered similar Latin
  // names into a ~30° hue band (all-olive avatars); this scatters them (#38)
  h ^= h >>> 16;
  h = Math.imul(h, 0x45d9f3b);
  h = (h ^ (h >>> 16)) >>> 0;
  return h % 360;
}

/* Middle-truncate a wallet address (Damir 2026-07-07 · #211 canon): 6…6 keeps
   both ends recognisable. The ONE helper every chat surface uses — a raw address
   is never shown in full on a chat surface (topbar title, list row, sender label);
   the full address lives only in Contact details + payment/wallet surfaces. Lives
   in avatar.js (the shared identity/address module) so bubbles + list rows import
   it without a circular dependency. */
export function truncateAddressMiddle(s, head = 6, tail = 6) {
  s = String(s == null ? '' : s);
  return s.length <= head + tail + 1 ? s : s.slice(0, head) + '…' + s.slice(-tail);
}

function initials(name) {
  const trimmed = name.trim();
  // must start with a letter (any script) — empty/whitespace-only and
  // address-like hex "names" get the glyph instead of initials
  if (!/^\p{L}/u.test(trimmed)) return null;
  // [...p] not p[0]: first char may be an astral-plane code point (CJK ext.)
  return trimmed.split(/\s+/).slice(0, 2).map(p => [...p][0].toLocaleUpperCase()).join('');
}

/** Render the deterministic gradient placeholder (hue from address/name hash) +
 *  initials or the user glyph — into `el`. Extracted so it's reusable as the
 *  fallback when a photo `src` fails to load. */
function renderPlaceholder(el, { name, address, size }) {
  const hue = hashHue(address || name);
  // JS supplies ONLY the deterministic hues; saturation/lightness are themed
  // in avatar.css (--avatar-grad-*) so gradients adapt to light/dark (#37)
  el.dataset.placeholder = '';
  el.style.setProperty('--av-h1', hue);
  el.style.setProperty('--av-h2', (hue + 40) % 360);
  const ini = name ? initials(name) : null;
  if (ini) {
    const t = document.createElement('span');
    t.className = 'c-avatar__initials';
    t.setAttribute('aria-hidden', 'true'); // audit r2: SRs read "HS Han Solo"
    t.textContent = ini;
    el.append(t);
  } else {
    el.append(icon('user-circle', { size: Math.round(size * 0.55) }));
  }
}

export function createAvatar({ src = null, name = '', address = '', size = 48, online = false } = {}) {
  const el = document.createElement('span');
  el.className = 'c-avatar';
  el.dataset.size = String(size);
  if (size !== 24 && size !== 40 && size !== 48) {
    // known sizes (24/40/48) come from --size-avatar-* tokens in avatar.css;
    // anything else falls back to inline sizing until tokenized
    el.style.width = size + 'px';
    el.style.height = size + 'px';
  }

  if (src) {
    const img = document.createElement('img');
    img.className = 'c-avatar__img';
    img.alt = '';
    // Graceful fallback: a C# avatar path that doesn't resolve in a
    // self-contained shell (or a broken file) must NOT show a broken-image
    // glyph — drop the <img> and render the deterministic gradient instead
    // (worst case = today's behavior; best case = the real photo). Wire the
    // handler BEFORE setting src so a synchronously-cached error still fires.
    img.addEventListener('error', () => {
      img.remove();
      renderPlaceholder(el, { name, address, size });
    }, { once: true });
    img.src = src;
    el.append(img);
  } else {
    renderPlaceholder(el, { name, address, size });
  }

  if (online) {
    const dot = document.createElement('span');
    dot.className = 'c-avatar__dot';
    el.append(dot);
  }
  return el;
}
