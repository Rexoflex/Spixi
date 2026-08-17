/**
 * c-avatar — photo, or deterministic gradient placeholder (DECISIONS.md #34).
 * The identity color comes from the address hash → a stable anchor per contact.
 * Named contacts show initials; address-only contacts show the user glyph;
 * groups always show the `users` glyph (N1 — a group never looks like a person).
 *
 * createAvatar({ src, name, address, size = 48, online = false, group = false })
 */
import { icon } from './icons.js';

/* N1 (#364): the identity wheel is QUANTIZED to 12 curated hue anchors.
 * The old continuous hue was already uniform (#38 measured), but neighbours
 * inside the 60–180° band all read as the same olive/green. Anchors give a
 * guaranteed minimum hue distance and skip the illegible yellow band (50–80).
 * avatar.css carries one hand-tuned gradient per anchor (index = data-hue),
 * every pair computed ≥ 4.5:1 under white ink at BOTH stops (#364 table).
 * Order matters: index i = IDENTITY_HUES[i] = avatar.css [data-hue="i"]. */
export const IDENTITY_HUES = [0, 22, 40, 95, 135, 165, 190, 215, 245, 275, 305, 335];

function hashRaw(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  // avalanche mix (murmur3 finalizer) — plain h%N clustered similar Latin
  // names into one band (all-olive avatars); this scatters them (#38)
  h ^= h >>> 16;
  h = Math.imul(h, 0x45d9f3b);
  h = (h ^ (h >>> 16)) >>> 0;
  return h;
}

/** Anchor index 0..11 for an identity string (single source for avatar + label). */
export function identityIndex(str) {
  return hashRaw(String(str == null ? '' : str)) % IDENTITY_HUES.length;
}

export function hashHue(str) { // exported: sender labels reuse the identity hue (single source)
  return IDENTITY_HUES[identityIndex(str)];
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

/* D-19b (#370): detect an ADDRESS-BEARING "nick" on a blind-masked roster row.
   C# masks the address slot with '[Unknown]' but the NICK slot can still carry
   the address in TWO encodings (loop B-1): the legacy "x" + <base58> pseudo-key
   (SingleChatPage.loadContacts / ContactDetails.loadMembers — nameless member),
   and the RAW base58 echo (resolveNick falls back to senderAddress.ToString();
   ContactDetails falls back to local_fr.nickname, which IS the address for an
   unnamed contact — the #276/#279 echo class). Rendered verbatim either one IS
   the address a blind room hides (#369 amendment). Shells test roster names
   with this at INGEST — on '[Unknown]'-masked rows ONLY — and blank the DISPLAY
   name (the raw value stays usable as a key). Base58 alphabet, 30+ chars, with
   an optional leading x: a real nick of that shape is implausible, and the
   failure mode in a blind room is a placeholder instead of a strange name —
   the safe direction. */
export function isPseudoAddressNick(name) {
  return /^x?[1-9A-HJ-NP-Za-km-z]{30,}$/.test(String(name == null ? '' : name));
}

function initials(name) {
  const trimmed = name.trim();
  // must start with a letter (any script) — empty/whitespace-only and
  // address-like hex "names" get the glyph instead of initials
  if (!/^\p{L}/u.test(trimmed)) return null;
  // [...p] not p[0]: first char may be an astral-plane code point (CJK ext.)
  return trimmed.split(/\s+/).slice(0, 2).map(p => [...p][0].toLocaleUpperCase()).join('');
}

/** Render the deterministic gradient placeholder (anchor from address/name hash)
 *  + initials, the user glyph, or the group glyph — into `el`. Extracted so it's
 *  reusable as the fallback when a photo `src` fails to load. */
function renderPlaceholder(el, { name, address, size, group }) {
  // N1 (#364): JS supplies ONLY the deterministic anchor INDEX; the gradient
  // colors live in avatar.css per [data-hue] (the c-disc #170 grammar). The
  // supersedes-#37 note: one vivid palette + white ink serves BOTH themes.
  el.dataset.placeholder = '';
  el.dataset.hue = String(identityIndex(address || name));
  // N1: a GROUP placeholder always wears the `users` glyph — never initials,
  // never the person glyph — so a group is recognisable at a glance.
  const ini = (!group && name) ? initials(name) : null;
  if (ini) {
    const t = document.createElement('span');
    t.className = 'c-avatar__initials';
    t.setAttribute('aria-hidden', 'true'); // audit r2: SRs read "HS Han Solo"
    t.textContent = ini;
    el.append(t);
  } else {
    el.append(icon(group ? 'users' : 'user-circle', { size: Math.round(size * 0.55) }));
  }
}

export function createAvatar({ src = null, name = '', address = '', size = 48, online = false, group = false } = {}) {
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
      renderPlaceholder(el, { name, address, size, group });
    }, { once: true });
    img.src = src;
    el.append(img);
  } else {
    renderPlaceholder(el, { name, address, size, group });
  }

  if (online) {
    const dot = document.createElement('span');
    dot.className = 'c-avatar__dot';
    el.append(dot);
  }
  return el;
}
