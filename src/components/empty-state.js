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
 *   glyph,                 // icon name for the fallback tile (e.g. 'apps').
 *                          // ★ F5: omit BOTH and the illustration slot is not rendered
 *                          // at all — no empty placeholder tile (the wallet zero state)
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

/* ★ iOS-61 (Damir on device 2026-08-21): "the empty-state illustration and text are not
 * preloaded — they pop in about a second late."
 *
 * ⚠ VERIFY-FIRST CORRECTION, and it changes which half of the verdict's fix applies.
 * The verdict offered two levers — "preload OR reserve the box". **The box is already
 * reserved**: `.c-empty-state__illo` carries `width: clamp(140px,46vw,220px)` and
 * `aspect-ratio: 1/1` (empty-state.css:39-47), so the slot occupies its full space
 * before the image exists and the copy below it never moves. There is no layout jump to
 * remove, which leaves the other lever.
 *
 * The delay is the DEFERRAL. The <img> is `loading="lazy"` on purpose, so the fetch and
 * decode are kept out of boot; the picture only starts loading when the surface is
 * finally revealed — about a second before it paints.
 *
 * ⚠ AUDIT CORRECTION to the scope this claims. The lazy attribute's own comment says an
 * empty state is "built EAGERLY", and for the CHATS tab that is no longer true —
 * `chats-shell.js` returns null while `opts.zeroReady === false`, a gate added to stop
 * exactly that. Where the state is built at reveal, in the visible viewport, the lazy
 * <img> starts loading immediately and no warm can beat it. So the honest benefit is the
 * surfaces built while HIDDEN — a tab the user has not opened yet — which is where the
 * one-second pop-in actually lives.
 *
 * So: warm the file at IDLE, through a detached Image() that shares the same cache. The
 * lazy <img> then hits a warm cache on reveal and paints in the same frame, and boot is
 * still not blocked because nothing runs until the document is idle. The lazy attribute
 * and its documented trade-off are untouched.
 *
 * Deduped per document: the same art backs several surfaces and there is no reason to
 * ask for it twice. Fenced end to end — a warm that throws must never cost a caller its
 * empty state, and requestIdleCallback does not exist in every engine we ship to. */
const warmedIllustrations = new Set();
function warmIllustration(src) {
  if (!src || warmedIllustrations.has(src)) return;
  warmedIllustrations.add(src);
  const warm = () => {
    try {
      const pre = new Image();
      pre.decoding = 'async';
      pre.src = src;
    } catch { /* no cache warm is exactly today's behaviour */ }
  };
  /* ⚠ AUDIT MINOR, and it made the paragraph above false as first written. A
   * `requestIdleCallback` TIMEOUT fires the callback whether the engine ever idles or
   * not, and a `setTimeout(…, 0)` fallback runs on the NEXT TASK — i.e. squarely inside
   * boot, which is the cost this whole approach exists to avoid. WKWebView had no
   * requestIdleCallback before Safari 17.4, so on the iOS build iOS-61 was actually filed
   * against, that fallback is the LIVE path. No timeout, and the fallback waits: a warm
   * that lands late is still a warm, and a warm that lands during boot is the thing we
   * refused to ship. */
  try {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(warm);
    else setTimeout(warm, 1500);
  } catch {
    try { setTimeout(warm, 1500); } catch { /* nothing to do */ }
  }
}

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
  /* ★ F5 (Damir on device 2026-08-21): appended HERE, before the branch below, so
     drawGlyph() can drop it again. A `remove()` on a node that is not in the tree yet
     is a silent no-op, and the old order appended the slot AFTER the branch ran. */
  el.append(slot);
  const drawGlyph = () => {
    /* ★ F5: with NEITHER art NOR a glyph there is nothing to draw, and the placeholder
       is not free — `.c-empty-state__illo[data-placeholder]` paints a 96×96
       `--surface-neutral-02` tile at radius-24. Left standing that is an empty grey
       square, which is exactly what Damir asked to remove from the wallet zero state
       ("there's no glyph or illustration on wallet activity empty state"). So the whole
       slot goes, and the flex `gap` goes with it. Every other caller passes a glyph, so
       this is inert for chats / contacts / apps — including their art-failed path. */
    if (!glyph) { slot.remove(); return; }
    slot.dataset.placeholder = '';
    slot.append(icon(glyph, { size: 48 }));
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
    // ★ iOS-61: warm the SAME url at idle so the lazy load above finds it in cache.
    warmIllustration(illustration);
  } else {
    drawGlyph();
  }

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
