/**
 * c-mbubble — media tile bubble: GIFs (Giphy keyboard/link) + images
 * (Damir 2026-07-03; #66 gap). P2P REALITY CHECK baked into the design:
 * · There is NO server to proxy media — loading a remote GIF/CDN URL reveals
 *   the reader's IP to that host. Default is therefore TAP-TO-LOAD: the tile
 *   renders from the sender-embedded `preview` (blurred) until the user opts
 *   in. `autoload: true` = future user setting ("auto-load media").
 * · Images: BE's "compress into a short message" standard (BlurHash/ThumbHash
 *   family) decodes to a tiny blurred thumb — pass the decoded data-URI as
 *   `preview`; the full image arrives via the file-transfer path, then the
 *   shell calls setMediaSrc(row, localUrl). Decoder choice = BE eval (§9).
 *
 * createMediaBubble({ direction, kind: 'gif'|'image', src, preview,
 *   width, height, alt, autoload = false, timestamp, gutter, onOpen, strings })
 * setMediaSrc(row, src) — late-arriving media (file transfer completed)
 *
 * States (data-state): idle (tap to load) → loading → loaded | failed (tap
 * retries). Tap on loaded → onOpen (shell viewer). Inline aspect-ratio from
 * sender dims = sanctioned runtime geometry (like #29 morphWidth).
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { docLocale } from './timestamp.js';

const mediaCtl = new WeakMap(); // tile el → { setSrc } (audit r3: setMediaSrc must reuse the closure state machine)

function mediaAria(state, kind, alt, strings) {
  const what = alt || (kind === 'gif' ? 'GIF' : (strings.image || 'Image'));
  if (state === 'idle') return (strings.tapToLoad || 'Tap to load') + ' — ' + what;
  if (state === 'loading') return (strings.loading || 'Loading') + ' — ' + what;
  if (state === 'failed') return (strings.retry || 'Retry') + ' — ' + what;
  return (strings.open || 'Open') + ' — ' + what;
}

export function createMediaBubble({
  direction = 'received',
  kind = 'image',
  src = '',
  preview = null,          // sender-embedded thumb (data-URI) — P2P-safe
  width = 0,
  height = 0,
  alt = '',
  autoload = false,
  timestamp = null,
  gutter = false,          // group chats: align with gutter-indented bubbles (C8)
  onOpen,
  onLoad,                  // fired after the full media loads + the tile is sized
                           // → the shell can scroll the log to the freshly-grown
                           //   tile if it was near the bottom (Damir F5 2026-07-08)
  strings = getStrings(),
} = {}) {
  const row = document.createElement('div');
  row.className = 'c-bubble-row';
  row.dataset.direction = direction;
  row.dataset.position = 'single';
  if (gutter && direction === 'received') {
    const g = document.createElement('span');
    g.className = 'c-bubble-row__gutter';
    row.append(g);
  }

  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'c-mbubble';
  el.dataset.kind = kind;

  /* iOS-17 (#283): size the tile to the MEDIA, not the rail. Two "extra space"
   * sources (Damir): a small GIF was upscaled to the full 320 bubble rail, and
   * height-capped media (CSS max-height min(320,45vh)) kept the full rail width
   * → object-fit:contain letterboxed the sides. Fix: alongside the aspect,
   * cap the tile's WIDTH at (a) the natural/sender width — never upscale past
   * 1:1 — and (b) the width the height cap allows at this aspect, so contain
   * fills the tile edge-to-edge. `min(100%, Npx)`: the % arm resolves against
   * the anchor's DEFINITE width (audit r4 — no cyclic %-vs-fit-content), the px
   * arm is the media cap. Floor at the 96px min-height's worth of width so a
   * tiny sticker still makes a tappable tile (CSS min-height parity). */
  const fitTile = (w, h) => {
    if (!(w > 0 && h > 0)) return;
    const ar = Math.max(w / h, 0.75);          // portrait clamp (Damir F5 2026-07-08)
    el.style.aspectRatio = String(ar);
    const maxH = Math.min(320, Math.round((window.innerHeight || 640) * 0.45));
    const wPx = Math.round(Math.min(Math.max(w, 96 * ar), maxH * ar));
    el.style.width = 'min(100%, ' + wPx + 'px)';
  };
  if (width > 0 && height > 0) fitTile(width, height); // sanctioned: runtime geometry from sender dims

  if (preview) {
    const pv = document.createElement('img');
    pv.className = 'c-mbubble__preview';
    pv.src = preview;
    pv.alt = '';
    pv.setAttribute('aria-hidden', 'true');
    el.append(pv);
  }

  // img lives in the DOM from creation (hidden until data-state=loaded) so its
  // load/error listeners are ALWAYS the ones in play — audit r3: setMediaSrc
  // used to fabricate a listener-less img → permanently dead tile
  const img = document.createElement('img');
  img.className = 'c-mbubble__img';
  img.alt = ''; // the button carries the accessible name
  el.append(img);

  const overlay = document.createElement('span');
  overlay.className = 'c-mbubble__overlay';
  overlay.setAttribute('aria-hidden', 'true');
  el.append(overlay);

  if (kind === 'gif') {
    const badge = document.createElement('span');
    badge.className = 'c-mbubble__badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = 'GIF';
    el.append(badge);
  }

  const setState = (s) => {
    el.dataset.state = s;
    el.setAttribute('aria-label', mediaAria(s, kind, alt, strings));
    overlay.textContent = '';
    if (s === 'idle') overlay.append(icon(kind === 'gif' ? 'player-play' : 'download', { size: 22 }));
    else if (s === 'loading') {
      const sp = document.createElement('span');
      sp.className = 'c-mbubble__spinner';
      overlay.append(sp);
    } else if (s === 'failed') overlay.append(icon('rotate-clockwise-2', { size: 22 }));
  };

  let currentSrc = src; // may be swapped by setMediaSrc (file-transfer path)
  const load = () => {
    if (!currentSrc) return;
    setState('loading');
    img.src = currentSrc;
  };
  img.addEventListener('load', () => {
    // No sender dimensions (remote GIF/image URL) → the tile starts at the CSS
    // default aspect (bubble-sized box). Once the real image loads, re-size the
    // tile to its NATURAL aspect so the whole frame shows uncropped (object-fit:
    // contain fills exactly, no crop; extreme portraits letterbox — the full
    // frame is one tap away in the viewer). CLAMP the portrait extreme (min 3:4):
    // an unbounded tall aspect-ratio can defeat the CSS max-height on device
    // WebViews (flex-item auto-min-size vs aspect-ratio) → the tile grew half
    // under the composer (Damir F5 2026-07-08).
    if (!(width > 0 && height > 0)) {
      fitTile(img.naturalWidth, img.naturalHeight);   // iOS-17 (#283): natural aspect + width cap in one place
    }
    setState('loaded');
    // the tile just grew to full size — let the shell pull the log to the latest
    // so the whole GIF comes into view (only if it was already near the bottom).
    if (onLoad) { try { onLoad(); } catch (_) {} }
  });
  img.addEventListener('error', () => setState('failed'));
  mediaCtl.set(el, { setSrc: (s) => { currentSrc = s; load(); } });

  el.addEventListener('click', () => {
    const s = el.dataset.state;
    if (s === 'idle' || s === 'failed') load();
    else if (s === 'loaded' && onOpen) onOpen();
  });

  if (timestamp != null) {
    const d = new Date(timestamp);
    if (!isNaN(d)) {
      const time = document.createElement('time');
      time.className = 'c-mbubble__time u-tabular';
      time.setAttribute('datetime', d.toISOString());
      time.textContent = d.toLocaleTimeString(docLocale(), { hour: '2-digit', minute: '2-digit' });
      el.append(time);
    }
  }

  setState('idle');
  if (autoload && src) load();

  // reactions overlap-anchor (audit r3): pills can't live INSIDE the tile —
  // overflow:hidden clips the -12px overhang — so the anchor wraps the tile
  const anchor = document.createElement('span');
  anchor.className = 'c-mbubble-anchor';
  anchor.append(el);
  row.append(anchor);
  return row;
}

/** Late-arriving media (file-transfer path completed): swap in the local
 *  source and load it through the tile's OWN state machine (audit r3 —
 *  aria-label/spinner/retry all stay correct). #44 free fn. */
export function setMediaSrc(row, src) {
  const el = row.querySelector('.c-mbubble');
  if (!el || !src) return;
  const ctl = mediaCtl.get(el);
  if (ctl) ctl.setSrc(src);
}
