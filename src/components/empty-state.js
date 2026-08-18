/**
 * c-empty-state — the house EMPTY STATE: illustration · headline · supporting line ·
 * one optional CTA. Deliberately surface-agnostic so Chats / Wallet / Contacts /
 * Apps all render the same shape from their own copy + their own `-es` art
 * (src/assets/images/<surface>-es.svg, shipped via src/demo/images → the shells'
 * `images/…` dir, build-shells.mjs:260-267 — the SAME mechanism as backup.png;
 * an external asset URL is what a file:// WebView refuses, a sibling file is fine).
 *
 * A missing/blocked illustration NEVER leaves a hole: the <img> onerror drops it and
 * (when `glyph` is given) draws a token-styled glyph tile instead — the c-app-icon /
 * c-launch illo precedent. Copy always carries the meaning, so the art is aria-hidden.
 *
 * createEmptyState({
 *   illustration,          // 'images/apps-es.png' — omit for the glyph-only shape
 *   glyph,                 // icon name for the fallback tile (e.g. 'apps')
 *   title, body,           // headline + supporting line (plain text — textContent)
 *   actionLabel, onAction, // the primary CTA (tonal by house grammar)
 *   actionIcon,            // optional leading glyph name for the CTA
 *   actionType = 'tonal', actionSize = 44,
 *   secondaryLabel, onSecondary, secondaryIcon,  // ★ N76: at most ONE further,
 *                          // lower-emphasis CTA under the first (text type) —
 *                          // the chats zero state carries "Start a chat" AND
 *                          // "Join the Spixi community". A third would turn an
 *                          // empty state into a menu; two is the cap.
 *   compact = false,       // tighter vertical rhythm (in-list, not full-screen)
 * }) → section.c-empty-state
 *
 * setEmptyStateCopy(el, { title, body }) — free fn (#44), for a live copy swap.
 */
import { createButton } from './button.js';
import { icon } from './icons.js';

export function createEmptyState({
  illustration = null,
  glyph = null,
  title = '',
  body = '',
  actionLabel = '',
  onAction = null,
  actionIcon = null,
  actionType = 'tonal',
  actionSize = 44,
  secondaryLabel = '',
  onSecondary = null,
  secondaryIcon = null,
  compact = false,
} = {}) {
  const el = document.createElement('section');
  el.className = 'c-empty-state';
  if (compact) el.dataset.compact = '';

  /* —— illustration (decorative; the copy below is the accessible content) —— */
  const slot = document.createElement('div');
  slot.className = 'c-empty-state__illo';
  slot.setAttribute('aria-hidden', 'true');
  const drawGlyph = () => {
    slot.dataset.placeholder = '';
    if (glyph) slot.append(icon(glyph, { size: 48 }));
  };
  if (illustration) {
    const img = document.createElement('img');
    img.className = 'c-empty-state__illo-img';
    img.alt = '';
    img.draggable = false;
    img.decoding = 'async';                      // never block the first paint of the copy
    // ~300-800 KB Figma exports. An empty state is usually built EAGERLY (the shell
    // renders the zero case before the bridge has pushed anything) and often lives in
    // a hidden tab — `lazy` keeps that fetch+decode out of boot until the state is
    // genuinely on screen. It is a hint: an engine that ignores it loads as before.
    img.loading = 'lazy';
    // handler BEFORE src so a synchronously-failed load still fires (c-app-icon precedent)
    img.addEventListener('error', () => { img.remove(); drawGlyph(); }, { once: true });
    img.src = illustration;
    slot.append(img);
  } else {
    drawGlyph();
  }
  el.append(slot);

  /* —— copy —— */
  const h = document.createElement('h2');
  h.className = 'c-empty-state__title';
  h.textContent = title;
  el.append(h);

  if (body) {
    const p = document.createElement('p');
    p.className = 'c-empty-state__body';
    p.textContent = body;
    el.append(p);
  }

  /* —— the CTAs (primary, then an optional lower-emphasis second) —— */
  if (actionLabel && onAction) {
    const wrap = document.createElement('div');
    wrap.className = 'c-empty-state__action';
    wrap.append(createButton({
      label: actionLabel,
      type: actionType,
      size: actionSize,
      icon: actionIcon ? icon(actionIcon, { size: 20 }) : null,
      onClick: onAction,
    }));
    el.append(wrap);
  }

  /* ★ N76: the second CTA renders on its own, even with no first one — a caller
     that only has the lower-emphasis action still gets a usable empty state. */
  if (secondaryLabel && onSecondary) {
    const wrap2 = document.createElement('div');
    wrap2.className = 'c-empty-state__action c-empty-state__action--secondary';
    wrap2.append(createButton({
      label: secondaryLabel,
      type: 'text',
      size: actionSize,
      icon: secondaryIcon ? icon(secondaryIcon, { size: 20 }) : null,
      onClick: onSecondary,
    }));
    el.append(wrap2);
  }

  return el;
}

/** Live copy swap (#44) — e.g. a filter-scoped empty state reusing one node. */
export function setEmptyStateCopy(el, { title, body } = {}) {
  if (!el) return el;
  const h = el.querySelector('.c-empty-state__title');
  const p = el.querySelector('.c-empty-state__body');
  if (h && title != null) h.textContent = title;
  if (p && body != null) p.textContent = body;
  return el;
}
