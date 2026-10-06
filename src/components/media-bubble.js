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
 *   width, height, alt, autoload = false, timestamp, gutter, onOpen, strings,
 *   ariaFor, sizeHint, onSrcError })   — ariaFor(state, el) (A5 #1124, #1133): the tile's accessible name
 *   when the tile is a FILE (typed-bubbles.js createImageFileBubble); default = mediaAria.
 *   sizeHint {w,h} (#46 r1 B-6): the picture's size known BEFORE it loads (a JPEG header) — the tile is sized
 *   from it at once instead of jumping from the 4:3 placeholder on load. onSrcError (#46 r1 B-1): given → a
 *   src that fails to decode is DROPPED (the tile returns to idle with no src — no retry loop) and the callback told.
 * setMediaSrc(row, src, sizeHint) — late-arriving media (file transfer completed)
 *
 * States (data-state): idle (tap to load) → loading → loaded | failed (tap
 * retries). Tap on loaded → onOpen (shell viewer). Inline aspect-ratio from
 * sender dims = sanctioned runtime geometry (like #29 morphWidth).
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { safeImageSrc } from './avatar.js';
import { docLocale, timeOpts } from './timestamp.js';
import { p1Log } from './p1.js';   // ★ #1181 A-FADE probe — TEMPORARY, retire with the [P1] set

const mediaCtl = new WeakMap(); // tile el → { setSrc } (audit r3: setMediaSrc must reuse the closure state machine)
/* #46 r3 R3-m1: the pictures this DOCUMENT has already shown (a fingerprint, not the URI — no second copy of a 60 K
   preview): a tile RE-BUILT with one (a re-render) shows it at once, no fade from 0; the first show keeps its fade.
   Bounded (oldest out). Only tiles that ask (instantIfShown — the image-file tile's local data: preview). */
const shownSrcs = new Set();
const SHOWN_KEEP = 256;
const shownKey = (s) => { s = String(s || ''); return s.length + ':' + s.slice(-64); };
function noteShown(s) {
  const k = shownKey(s);
  shownSrcs.delete(k); shownSrcs.add(k);
  while (shownSrcs.size > SHOWN_KEEP) shownSrcs.delete(shownSrcs.values().next().value);
}

/* ★ #1151 A-FADE (Android walk: "the photo flips from the solid ground to the photo, no fade"): a CSS transition runs
   only from a style the element already HAD. Android's spare chat WebView makes no frame while C# holds the stage, so
   the preview's load event landed BEFORE the tile's first style (and a rAF-queued re-render then re-built the tile
   with the r3 "seen" mark, shown at once) → the first painted style was already opacity 1: no fade. The reveal is
   now deferred: load → img.decode() (no fade over an undecoded picture) → the next animation frame, where the
   loading style (opacity 0) is put on record first and the tile then flips to loaded — the transition runs from 0
   whether the preview came before or after the row. ONE frame batch for every tile (read all, then write all: one
   style recalc). A picture counts as SHOWN only at the END of its fade (or one frame after the flip when there is no
   fade), on a tile still in the document (noteShown, #46 r4 M1) — a tile re-built before its picture was really on
   screen fades in, never pops. Reduced motion: --duration-200 = 0 ms → instant. */
const rafOf = () => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (f) => setTimeout(f, 16));
const revealQ = new Map();   // tile el → the reveal to run in the next frame
let revealArmed = false;
function queueReveal(el, run) {
  revealQ.set(el, run);
  if (revealArmed) return;
  revealArmed = true;
  rafOf()(() => {
    revealArmed = false;
    const due = Array.from(revealQ.entries());
    revealQ.clear();
    for (const [el] of due) {   // read: each tile's loading style (opacity 0) is computed BEFORE any flips
      const im = el.querySelector('.c-mbubble__img');
      if (im && el.isConnected) { try { void getComputedStyle(im).opacity; } catch (_) {} }
    }
    for (const [, run] of due) { try { run(); } catch (_) {} }   // write
  });
}

function mediaAria(state, kind, alt, strings) {
  const what = alt || (kind === 'gif' ? 'GIF' : (strings.image || 'Image'));
  if (state === 'idle') return (strings.tapToLoad || 'Tap to load') + ', ' + what;
  if (state === 'loading') return (strings.loading || 'Loading') + ', ' + what;
  if (state === 'failed') return (strings.retry || 'Retry') + ', ' + what;
  return (strings.open || 'Open') + ', ' + what;
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
  ariaFor = null,          // ★ A5 #1124 (#1133): (state, el) → label — an image FILE names its file state, not "Tap to load"
  sizeHint = null,         // #46 r1 B-6: { w, h } of a src not loaded yet (the shell read it from the JPEG header)
  onSrcError = null,       // #46 r1 B-1: a src that fails to decode is dropped (idle, no retry) and this is told
  instantIfShown = false,  // #46 r3 R3-m1: a src this document already showed appears at once on a re-built tile
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
  else if (sizeHint) fitTile(sizeHint.w, sizeHint.h);  // #46 r1 B-6: the picture's own size, known before it loads

  /* ★ Gate row O-13 (#46 loop B, MINOR-5) — the sender-embedded preview is the ONE sink in
   * this file that paints on RENDER. The tile's own `src` below waits for `load()`, which
   * the tap-to-load state machine and the shell's media-autoload preference both gate. The
   * preview waits for nothing. A remote value here would announce the reader's IP and the
   * moment they opened the message before they touched anything.
   * The docblock at the head of this file already states the rule — a `preview` is a
   * sender-embedded thumb data-URI, "P2P-safe". The rule is now enforced, not only stated
   * (#772). Only a `data:image/` URI is admitted; a refused value leaves the tile in its
   * idle state, which is what a message with no preview already shows. */
  const previewSrc = safeImageSrc(preview, { allowRemote: false });
  if (previewSrc) {
    const pv = document.createElement('img');
    pv.className = 'c-mbubble__preview';
    pv.src = previewSrc;
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
    el.setAttribute('aria-label', typeof ariaFor === 'function' ? ariaFor(s, el) : mediaAria(s, kind, alt, strings));
    overlay.textContent = '';
    if (s === 'idle') overlay.append(icon(kind === 'gif' ? 'player-play' : 'download', { size: 22 }));
    else if (s === 'loading') {
      const sp = document.createElement('span');
      sp.className = 'c-mbubble__spinner';
      overlay.append(sp);
    } else if (s === 'failed') overlay.append(icon('rotate-clockwise-2', { size: 22 }));
  };

  let currentSrc = src; // may be swapped by setMediaSrc (file-transfer path)
  let revealGen = 0;     // ★ #1151: a newer load (or a drop) cancels a pending reveal
  const pBorn = instantIfShown ? performance.now() : 0;   // ★ #1181 A-FADE probe — TEMPORARY
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
    // the tile just grew to full size — let the shell pull the log to the latest
    // so the whole GIF comes into view (only if it was already near the bottom).
    const landed = () => { if (onLoad) { try { onLoad(); } catch (_) {} } };
    /* #46 r3 R3-m1: the r3 "seen" re-show is loaded already (no fade by design) — it stays as it is */
    if (el.dataset.state === 'loaded') { landed(); return; }
    /* ★ #1151 A-FADE: decode, then flip in the next frame from a recorded opacity-0 style (queueReveal above) */
    const mine = ++revealGen;
    const shown = currentSrc;
    /* ★ #1181 A-FADE (WALK #1172, 3rd fail: "a white tile, then a sudden switch") — PROBE, not a fix (two fixes missed:
       #1151, #1152). Dev-only [P1] lines for a preview tile: load → decoded (dec) → the flip frame (wait), the page
       visibility at the flip, the age of the tile, then the fade's own end (or cancel / none) after the flip. Read with
       a 60 fps screen recording: did the fade run while the picture was on screen? TEMPORARY, retire with the [P1] set. */
    let pOn = false;
    try { pOn = instantIfShown && document.documentElement.hasAttribute('data-p1'); } catch (_) {}   // #46 r1 n1: release builds attach nothing
    const pT0 = pOn ? performance.now() : 0;
    let pT1 = 0;
    const decoded = typeof img.decode === 'function' ? img.decode().catch(() => {}) : Promise.resolve();
    decoded.then(() => { pT1 = pT0 ? performance.now() : 0; }).then(() => queueReveal(el, () => {
      if (mine !== revealGen || shown !== currentSrc || el.dataset.state !== 'loading') { if (pT0) p1Log('fade drop'); return; }   // superseded / dropped
      setState('loaded');
      if (pT0) {
        const pT2 = performance.now();
        let vis = 1;
        try { vis = document.visibilityState === 'hidden' ? 0 : 1; } catch (_) {}
        p1Log('fade flip dec=' + Math.round(pT1 - pT0) + ' wait=' + Math.round(pT2 - pT1) + ' age=' + Math.round(pT2 - pBorn) + ' vis=' + vis);
        const pEnd = (how) => (e) => { if (e.target !== img || e.propertyName !== 'opacity') return; img.removeEventListener('transitionend', pE); img.removeEventListener('transitioncancel', pC); p1Log('fade ' + how + ' ms=' + Math.round(performance.now() - pT2)); };
        const pE = pEnd('end');
        const pC = pEnd('cancel');
        img.addEventListener('transitionend', pE);
        img.addEventListener('transitioncancel', pC);
      }
      landed();
      /* #46 r4 M1: "shown" at the fade's END (or the next frame with no fade) — recorded in this frame, a re-render
         queued after it re-built the tile as seen → a pop. A tile re-built away / re-sourced first records nothing. */
      if (instantIfShown && shown) {
        const rec = () => { if (el.isConnected && el.dataset.state === 'loaded' && shown === currentSrc) noteShown(shown); };
        const off = () => { img.removeEventListener('transitionend', end); img.removeEventListener('transitioncancel', cancel); };
        const end = (e) => { if (e.target === img && e.propertyName === 'opacity') { off(); rec(); } };
        const cancel = (e) => { if (e.target === img && e.propertyName === 'opacity') off(); };
        img.addEventListener('transitionend', end);
        img.addEventListener('transitioncancel', cancel);
        rafOf()(() => {   // the loaded style painted: no fade at all → shown now
          let dur = 0;
          try { dur = Math.max(0, ...String(getComputedStyle(img).transitionDuration || '').split(',').map((v) => parseFloat(v) * (/ms\s*$/.test(v) ? 0.001 : 1)).filter((v) => v > 0)); } catch (_) {}
          if (!(dur > 0)) { off(); rec(); }
        });
      }
    }));
  });
  img.addEventListener('error', () => {
    revealGen++;                     // ★ #1151: no pending reveal survives an error
    if (typeof onSrcError !== 'function') { setState('failed'); return; }
    currentSrc = '';                 // #46 r1 B-1: drop it — idle with no src, so a tap is the owner's (load() is a no-op)
    img.removeAttribute('src');
    setState('idle');
    try { onSrcError(); } catch (_) {}
  });
  mediaCtl.set(el, { setSrc: (s, hint) => {
    if (!(width > 0 && height > 0) && hint) fitTile(hint.w, hint.h);   // #46 r1 B-6
    if (!shownSrcs.has(shownKey(s))) delete el.dataset.seen;            // #46 r3 R3-m1: a NEW picture keeps its first-show fade
    currentSrc = s; load();
  } });

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
      time.textContent = d.toLocaleTimeString(docLocale(), timeOpts());   // ★ Session I: the device's 12/24-hour setting
      el.append(time);
    }
  }

  setState('idle');
  if (autoload && src) {
    load();
    /* #46 r3 R3-m1: already shown here → decoded in this document's memory: loaded NOW, no fade (data-seen drops the
       transition). The img's own load event still lands (onLoad, sizing); a decode error still drops it (B-1). */
    if (instantIfShown && shownSrcs.has(shownKey(src))) { el.dataset.seen = ''; setState('loaded'); p1Log('fade seen'); }   // ★ #1181 probe: built as already shown (no fade by design)
  }

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
export function setMediaSrc(row, src, sizeHint = null) {
  const el = row.querySelector('.c-mbubble');
  if (!el || !src) return;
  const ctl = mediaCtl.get(el);
  if (ctl) ctl.setSrc(src, sizeHint);
}

/* ★★ #1170 (Damir, Windows: "in a GROUP a received GIF shows NO sender name and NO avatar"). Since the #82 tile
 * (2026-07-07) only TEXT rows carried the group head: the shell passed `sender` / `showAvatar` / `onSenderClick` to
 * createMessageBubble and nothing to the media / file tiles (an empty gutter only). The head nodes are NOT built here:
 * the shell builds them through createMessageBubble itself, with the SAME options a text row gets (the D-19b ladder,
 * the #99 tap, the W8 #348 blind gate, the N34 Owner chip) — one builder, so a tile's head cannot drift from a text
 * row's. This only PLACES them: the avatar in the row's gutter (made if the tile had none), the label above the tile
 * — inside the media anchor (its definite width keeps the audit-r4 rule), or in a `.c-tile-col` column around a file
 * card (a <button> card cannot hold the label's <button>). The row takes the run position (the in-run gap) and the
 * `data-gutter` inset a text row's gutter row takes (Session K) — same column as the text bubbles above it.
 * setTileHead(row, { position, label, avatar }) — label / avatar: nodes or null. Received rows only. */
export function setTileHead(row, { position = 'single', label = null, avatar = null } = {}) {
  if (!row || row.dataset.direction !== 'received') return row;
  row.dataset.position = position;
  let gutter = Array.from(row.children).find((c) => c.classList.contains('c-bubble-row__gutter')) || null;
  if (!gutter) {
    gutter = document.createElement('span');
    gutter.className = 'c-bubble-row__gutter';
    row.prepend(gutter);
  }
  row.dataset.gutter = '';
  if (avatar) gutter.replaceChildren(avatar);
  if (label) {
    let col = row.querySelector('.c-mbubble-anchor');
    if (!col) {
      const card = Array.from(row.children).find((c) => c !== gutter);
      if (!card) return row;
      col = document.createElement('div');
      col.className = 'c-tile-col';
      card.before(col);
      col.append(card);
    }
    label.classList.add('c-bubble__sender--tile');
    col.prepend(label);
  }
  return row;
}
