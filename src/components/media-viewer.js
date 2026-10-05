/**
 * c-mviewer — full-screen media viewer (#86 last v1 gap): the c-mbubble
 * onOpen target. V1 = fit-to-screen + close (+ optional Save); pinch/zoom is
 * post-v1 (#86 note). Rides the overlay stack (#56): Esc, ✕ and
 * swipe-to-dismiss close it (the viewer covers the scrim, so scrim-tap is
 * unreachable — freeze audit); focus contained, back-hook via
 * dismissTopOverlay.
 *
 * openMediaViewer({ host, src, alt, kind, onSave, token, strings }) → el
 *   onSave — shell hook (P2P: saving = local file op via bridge); omitted =
 *   no Save button.
 *   ★ #1166 V-3 (#1144 / #1145 (1)) token — a string naming the picture C# is making (the chat: the message id hex;
 *   chat info: "<id hex>:<n>"). With a token the viewer opens in a LOADING state: it shows `src` (the tile's thumbnail,
 *   may be '') under a subtle spinner, aria-busy="true", until the shell calls
 *     el.setSrc(uri)  — the viewer-size picture arrived: only a `data:image/jpeg;base64,…` URI is taken (anything else
 *                       = setFailed); the busy state ends;
 *     el.setFailed()  — the picture could not be made: the busy state ends, the thumbnail stays. The SHELL shows the
 *                       `viewerFailed` toast (one place per shell — this component never toasts).
 *   A viewer still busy after VIEWER_WAIT_MS stops the spinner by itself (an older exe never answers) and keeps the thumbnail.
 *   findOpenViewer(token) → the OPEN viewer opened for exactly that token, or null (a closed one is never returned,
 *   so a late push lands nowhere). Without a token the viewer is today's: no loading state, src as given.
 *
 *   ★ #1180 (WALK #1172 W-VIEW, #1173 (1)) — the viewer's OWN motion and the click outside:
 *   · OPEN with no jump: the chat tile's preview is a SQUARE centre crop (SThumbnail.makeThumbnail, every platform), and
 *     the loading viewer stretched it to the stage, then swapped it for the real-aspect picture → the shape jumped. A
 *     loading viewer now keeps the thumbnail INVISIBLE (`data-pending` on the img: opacity 0) under the spinner; the
 *     viewer-size picture fades in once decoded (setSrc → load → decode → next frame). A failure / the wait end shows
 *     the thumbnail (better than nothing). A viewer without a token is unchanged (its src is the real picture).
 *   · CLOSE fast: the viewer had NO transition of its own, so dismissOverlay's removal waited for its 400 ms fallback
 *     timer (Windows log: overlay-close → chatoverlay 410 ms) while the scrim faded under a still-opaque viewer. The
 *     viewer now fades with [data-open] — open 200 ms decelerate, close 100 ms accelerate (close faster than open) —
 *     and its own scrim closes at the same 100 ms, so the transitionend removes both together.
 *   · A click / tap OUTSIDE the picture closes (the dim stage, the bar and the foot around the buttons); a press that
 *     became a swipe does not count as a click; the picture itself does not close.
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { openOverlay, dismissOverlay, setOverlayOpts, isOverlayOpen } from './overlay.js';

/** ★ #1166 V-3: the one data URI shape the viewer takes from C# (the contract regex). */
export const VIEWER_URI_RE = /^data:image\/jpeg;base64,[A-Za-z0-9+\/]+=*$/;
export const VIEWER_WAIT_MS = 20000;
const openViewers = new Set();   // ★ #1166 V-3: viewers opened WITH a token (pruned when closed)

/** ★ #1166 V-3: the open viewer opened for `token`, or null. */
export function findOpenViewer(token) {
  const t = String(token == null ? '' : token);
  if (!t) return null;
  let hit = null;
  for (const v of [...openViewers]) {
    if (!isOverlayOpen(v)) { openViewers.delete(v); continue; }   // closed (the stack entry goes at dismissal)
    if (v._viewerToken === t) hit = v;   // the NEWEST open one wins (a re-tap opens a second viewer on top)
  }
  return hit;
}

export function openMediaViewer({
  host,
  src = '',
  alt = '',
  kind = 'image',
  onSave,
  token = '',
  strings = getStrings(),
} = {}) {
  const el = document.createElement('section');
  el.className = 'c-mviewer';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', alt || (kind === 'gif' ? 'GIF' : (strings.image || 'Image')));
  el.tabIndex = -1;

  // #336 (Damir F5 iOS #1): the close ✕ used to live in a TOP bar with no
  // safe-area inset — on iOS edge-to-edge it sat UNDER the status bar and
  // wasn't tappable. The top bar now carries only the caption + optional Save
  // (with the top inset), and CLOSE moved to a prominent bottom-centered button
  // (below). A top bar renders only when there's something to show.
  if (alt || onSave) {
    const bar = document.createElement('div');
    bar.className = 'c-mviewer__bar';
    if (onSave) {
      const spacer = document.createElement('span');   // balance the Save button so the caption stays centered
      spacer.className = 'c-mviewer__spacer';
      spacer.setAttribute('aria-hidden', 'true');
      bar.append(spacer);
    }
    if (alt) {
      const cap = document.createElement('span');
      cap.className = 'c-mviewer__caption';
      cap.textContent = alt;
      bar.append(cap);
    }
    if (onSave) {
      const save = document.createElement('button');
      save.type = 'button';
      save.className = 'c-mviewer__btn';
      save.setAttribute('aria-label', strings.save || 'Save');
      save.append(icon('download', { size: 22 }));
      save.addEventListener('click', () => onSave());
      bar.append(save);
    }
    el.append(bar);
  }

  const stage = document.createElement('div');
  stage.className = 'c-mviewer__stage';
  const img = document.createElement('img');
  img.className = 'c-mviewer__img';
  if (src || !token) img.src = src;   // ★ #1166 V-3: a loading viewer with no thumbnail sets no src ('' would load the page URL)
  if (token) img.dataset.pending = '';   // ★ #1180: the square-crop thumbnail stays invisible until the real picture is decoded
  img.alt = ''; // the dialog carries the accessible name
  img.draggable = false; // mouse-drag fix: native image drag hijacked the pointer stream
  stage.append(img);
  el.append(stage);

  /* ★ #1166 V-3: the loading state — a subtle spinner on a scrim disc over the thumbnail (media-bubble's spinner
     grammar); prefers-reduced-motion = a static ring (css). setSrc / setFailed / the wait end it. */
  const tok = token == null ? '' : String(token);
  let waitT = 0;
  /* ★ #1180: show the picture — a fade from opacity 0 (the pending style was painted before: the flip runs a frame later) */
  const reveal = () => {
    if (img.dataset.pending === undefined) return;
    const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (f) => setTimeout(f, 16);
    raf(() => { delete img.dataset.pending; });
  };
  let fullSrc = '';
  const thumbSrc = src || '';
  /* ★ #1180 (#46 r1 m3): a picture that passes the URI shape but does not decode — back to the thumbnail, shown */
  img.addEventListener('error', () => {
    if (!fullSrc || img.getAttribute('src') !== fullSrc) return;
    fullSrc = '';
    if (thumbSrc) img.src = thumbSrc; else img.removeAttribute('src');
    el.setFailed();
  });
  img.addEventListener('load', () => {
    if (!fullSrc || img.getAttribute('src') !== fullSrc) return;   // the thumbnail's own load never reveals it
    const d = typeof img.decode === 'function' ? img.decode().catch(() => {}) : Promise.resolve();
    d.then(reveal);   // the src changes once (thumbnail → picture): the guard above is the whole test
  });
  const endBusy = () => {
    if (waitT) { clearTimeout(waitT); waitT = 0; }
    el.removeAttribute('aria-busy');
    delete el.dataset.loading;
    const sp = stage.querySelector('.c-mviewer__loading');
    if (sp) sp.remove();
  };
  el.setSrc = (uri) => {
    const u = String(uri == null ? '' : uri);
    if (!VIEWER_URI_RE.test(u)) { el.setFailed(); return false; }
    fullSrc = u;   // ★ #1180: revealed at its load (+ decode), never before
    img.src = u;
    delete el.dataset.failed;
    endBusy();
    return true;
  };
  el.setFailed = () => {
    endBusy();
    el.dataset.failed = '';
    if (!fullSrc) reveal();   // ★ #1180: no bigger picture → the thumbnail is better than an empty stage
  };
  if (tok) {
    el._viewerToken = tok;
    el.setAttribute('aria-busy', 'true');
    el.dataset.loading = '';
    const ld = document.createElement('div');
    ld.className = 'c-mviewer__loading';
    ld.setAttribute('aria-hidden', 'true');
    const sp = document.createElement('span');
    sp.className = 'c-mviewer__spinner';
    ld.append(sp);
    stage.append(ld);
    waitT = setTimeout(() => { waitT = 0; if (el.dataset.loading !== undefined) { endBusy(); if (!fullSrc) reveal(); } }, VIEWER_WAIT_MS);
    openViewers.add(el);
  }
  stage.addEventListener('dragstart', (e) => e.preventDefault());

  // #336 (Damir F5 iOS #1): prominent bottom-centered CLOSE — easy to spot + reach,
  // clear of the notch/status bar, with the home-indicator safe-area inset.
  const foot = document.createElement('div');
  foot.className = 'c-mviewer__foot';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'c-mviewer__close';
  close.setAttribute('aria-label', strings.close || 'Close');
  close.append(icon('x', { size: 24 }));
  close.addEventListener('click', () => dismissOverlay(el));
  foot.append(close);
  el.append(foot);

  // swipe-to-dismiss (Damir: intuitive close, no hunting the ✕): vertical
  // drag EITHER direction — the image rides the finger and the viewer fades;
  // past the threshold on release = dismiss, under it = spring back.
  const DISMISS_PX = 80;
  const TAP_PX = 10;   // ★ #1180: a press that moved less than this is a tap (click outside = close)
  /* ★ #1180 (#46 r1 M2): a DOUBLE click on a tile opened the viewer and its second press closed it at once (the stage
     tap / the scrim) — a tap-to-close counts only after the open fade (+ margin), and never a second click of a pair */
  const TAP_CLOSE_AFTER_MS = 350;
  const openedAt = performance.now();
  const tapCloseReady = () => performance.now() - openedAt >= TAP_CLOSE_AFTER_MS;
  let startY = 0;
  let dragY = null;
  let downOnImg = false;
  let lastDownAt = openedAt;   // #46 r3: the double click's FIRST press opened the viewer (the stage never saw it) — the next press within 500 ms is its second
  let secondOfPair = false;   // #46 r2 (3): the second press of a mouse double click (pointer events carry no click count)
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    startY = e.clientY;
    dragY = 0;
    downOnImg = e.target === img;   // ★ #1180: where the press began (the capture below retargets the later events)
    const now = performance.now();
    secondOfPair = now - lastDownAt < 500;
    lastDownAt = now;
    stage.setPointerCapture(e.pointerId);
    img.style.transition = 'none'; // finger-follow must not lag
  });
  stage.addEventListener('pointermove', (e) => {
    if (dragY === null) return;
    dragY = e.clientY - startY;
    if (Math.abs(dragY) >= TAP_PX) el.style.transition = 'none';  // ★ #1180: once the finger really MOVES, the fade must not lag it (jitter / a still press leave the open fade alone)
    img.style.transform = 'translateY(' + dragY + 'px)';
    el.style.opacity = String(Math.max(0.4, 1 - Math.abs(dragY) / 320));
  });
  const endDrag = (e) => {
    if (dragY === null) return;
    const past = Math.abs(dragY) > DISMISS_PX;
    /* ★ #1180: a TAP on the dim stage (not on the picture) closes — like the swipe; a cancelled press never does */
    const tapOutside = !!e && e.type === 'pointerup' && Math.abs(dragY) < TAP_PX && !downOnImg && !secondOfPair && tapCloseReady();
    img.style.transition = ''; // spring-back transition returns (css)
    el.style.transition = '';  // ★ #1180: the viewer's own fade returns — a swipe close fades from where the finger left it
    if (past || tapOutside) {
      dismissOverlay(el);
      el.style.opacity = '';   // ★ #1180: AFTER data-open went: the css close fade runs from the dragged opacity to 0
    } else {
      img.style.transform = '';
      el.style.opacity = '';
    }
    dragY = null;
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  /* ★ #1180: a click on the viewer's own dim ground around the bar / the foot / the caption (never on a button) closes
     too — not the second click of a double click, not during the open fade (#46 r1 M2 / n2) */
  el.addEventListener('click', (e) => {
    const t = e.target;
    if (!t || !t.closest || t.closest('button') || (e.detail || 0) > 1 || !tapCloseReady()) return;
    if (t === el || t.closest('.c-mviewer__bar') || t.closest('.c-mviewer__foot')) dismissOverlay(el);
  });

  /* ★ #1166 V-3 (#46 r1 C-N4): every close path (✕, swipe, Esc, back) clears the wait timer and drops the viewer from
     openViewers — a closed viewer is never found and holds nothing. */
  const onClosed = () => {
    if (waitT) { clearTimeout(waitT); waitT = 0; }
    openViewers.delete(el);
  };
  /* ★ #1180 (#46 r1 M2): no scrim light-dismiss — the viewer covers its scrim once open, and before data-open lands the
     click-through viewer let a double click's second press reach the scrim (open → closed at once). Outside taps close
     through the stage / ground handlers above. */
  setOverlayOpts(el, { host, lightDismiss: false, escDismiss: true, onDismiss: onClosed });
  openOverlay(el);
  /* ★ #1180: the viewer's own scrim closes at the viewer's speed (overlay.css), so the two leave in the same frame */
  const sc = el.previousElementSibling;
  if (sc && sc.classList && sc.classList.contains('c-scrim')) sc.dataset.mviewer = '';
  return el;
}
