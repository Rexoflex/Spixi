/**
 * c-mviewer — full-screen media viewer (#86 last v1 gap): the c-mbubble
 * onOpen target. V1 = fit-to-screen + close (+ optional Save); pinch/zoom was
 * post-v1 (#86 note) — ★ S11 E (#1262) adds it (below). Rides the overlay stack (#56): Esc, ✕ and
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
 *   ★ S9 (#1244 G = A) items / index / onPage — a PHOTO GROUP: items = [{ src, token, alt }] in the group's order, the
 *   viewer opens on items[index] (its src / token / alt replace the single ones) and pages with ‹ › (the foot), the
 *   ArrowLeft / ArrowRight keys and a horizontal swipe; "2 / 7" says where it is. Each page starts the token's
 *   loading state again (the thumbnail invisible under the spinner) and calls onPage(i, item) — the shell asks C# for
 *   that picture (viewImage). One item (or none) = today's viewer, byte-identical.
 *   ★ S10 F2 (#1254) onReply(i, item) — a Reply button in the top bar (leading; Save keeps the trailing slot) — the viewer
 *   closes, then onReply(index, the item on screen) (the shell replies to THAT photo). canReplyItem(i, item) → false hides
 *   it on that page (#46 n-3); the glyph mirrors in RTL (#46 n-2).
 *   ★ S11 G (#1263 a — walk #1260 10-GRID: "opening the viewer there is no reply"): S10 offered Reply in a PAGED viewer
 *   only (`pages.length > 1`), and the chat opened every lone photo — a 1:1 photo, or a group's only photo on this
 *   device — as a single viewer with no onReply, so most opens had none, on every platform. Now EVERY viewer given
 *   onReply has it; a single viewer's item = { src, token, alt } as opened. onSave(i, item) gets the item on screen too.
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
 *
 *   ★ S11 E (#1262, Damir 23:48) — PINCH TO ZOOM + a smoother page swipe:
 *   · ZOOM (Pointer Events): two fingers scale around their midpoint, 1×–4× with a rubber band past the limits that
 *     settles back on release; when zoomed one finger PANS inside the picture's bounds and the page swipe + the
 *     swipe-to-dismiss are OFF; a double tap / double click on the picture toggles 1× ↔ 2.5× at that point; ctrl + wheel
 *     (a trackpad pinch) zooms around the pointer, a plain wheel pans a zoomed picture. Every page change resets to 1×
 *     (a new viewer always opens at 1×). Transform-only (translate3d + scale), writes in one rAF per frame, will-change
 *     only while a gesture runs; the stage is the one `touch-action: none` box (css).
 *   · PAGING (a paged viewer): the "picture moves dragX / 3, then swaps" swipe became a TRACK — prev / current / next
 *     slides side by side follow the finger 1:1; a flick (≥ 0.3 px/ms) or a drag past 35 % of the width turns the page,
 *     anything less snaps back; resistance past the first / last photo. The ‹ › buttons and ←/→ slide the same way. The
 *     page state commits at the release (counter, onPage, the #1180 loading state) and the track settles from where
 *     the picture stood (motion tokens; reduced motion = instant). A neighbour slide only shows a picture this viewer
 *     already holds — C#'s viewer-size picture for the pages next to the one on screen, or that page's thumbnail
 *     (★ S11 G R2-m6: no longer only one #1180 had shown) — no new fetch rule; the current picture stays the one
 *     `.c-mviewer__img`.
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
  items = null,
  index = 0,
  onPage = null,
  onReply = null,
  canReplyItem = null,   // ★ S10 #46 n-3: (i, item) → false hides Reply on that page
  strings = getStrings(),
} = {}) {
  const pages = Array.isArray(items) ? items.filter((it) => it && it.token) : [];
  const canReply = typeof onReply === 'function';   // ★ S10 F2 · ★ S11 G (#1263 a): every viewer, not only a paged one
  const single = { src, token: String(token == null ? '' : token), alt };   // ★ S11 G: a single viewer's item (Reply / Save)
  let at = pages.length > 1 ? Math.max(0, Math.min(pages.length - 1, Number(index) || 0)) : 0;
  if (pages.length > 1) { src = pages[at].src || ''; token = pages[at].token; alt = pages[at].alt || alt; }
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
  let capEl = null;
  let replyBtn = null;
  const itemNow = () => (pages.length > 1 ? pages[at] : single);   // ★ S11 G: the item on screen (a single viewer's own)
  const syncReply = () => {
    if (!replyBtn) return;
    let okR = true;
    if (typeof canReplyItem === 'function') { try { okR = !!canReplyItem(at, itemNow()); } catch (_) { okR = false; } }
    replyBtn.hidden = !okR;
  };
  if (alt || onSave || canReply) {
    const bar = document.createElement('div');
    bar.className = 'c-mviewer__bar';
    const spacer = () => {   // balance a one-sided button so the caption stays centered
      const sp = document.createElement('span');
      sp.className = 'c-mviewer__spacer';
      sp.setAttribute('aria-hidden', 'true');
      return sp;
    };
    if (canReply) {
      const rb = document.createElement('button');
      rb.type = 'button';
      rb.className = 'c-mviewer__btn c-mviewer__reply';
      rb.setAttribute('aria-label', strings.reply || 'Reply');
      const g = icon('arrow-back-up', { size: 22 });
      if (document.documentElement.dir === 'rtl') g.style.transform = 'scaleX(-1)';   // n-2: the arrow points inline-start
      rb.append(g);
      replyBtn = rb;
      /* the viewer closes FIRST (its focus restore is synchronous), so the shell's reply strip keeps the focus it gives */
      rb.addEventListener('click', () => { if (rb.hidden) return; const i = at; const it = itemNow(); dismissOverlay(el); try { onReply(i, it); } catch (_) {} });
      bar.append(rb);
    } else if (onSave) bar.append(spacer());
    if (alt) {
      const cap = document.createElement('span');
      cap.className = 'c-mviewer__caption';
      cap.textContent = alt;
      capEl = cap;
      bar.append(cap);
    }
    if (onSave) {
      const save = document.createElement('button');
      save.type = 'button';
      save.className = 'c-mviewer__btn';
      save.setAttribute('aria-label', strings.save || 'Save');
      save.append(icon('download', { size: 22 }));
      save.addEventListener('click', () => { try { onSave(at, itemNow()); } catch (_) {} });   // ★ S11 G: the photo on screen
      bar.append(save);
    } else if (canReply) bar.append(spacer());
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
  /* ★ S11 E (#1262): a PAGED viewer carries a TRACK — prev / current / next slides side by side, the finger moves the
     track 1:1. The current picture stays THE `.c-mviewer__img` (one per viewer: every pin and the #1180 rules read it);
     the neighbours are `.c-mviewer__peer` and only ever show a picture this viewer already holds (see peerSrc). One item
     (or none) = no track: the img sits in the stage as before. */
  let track = null;
  const peers = [];
  if (pages.length > 1) {
    track = document.createElement('div');
    track.className = 'c-mviewer__track';
    for (const side of [-1, 0, 1]) {
      const slide = document.createElement('div');
      slide.className = 'c-mviewer__slide';
      if (side === 0) slide.append(img);
      else {
        const p = document.createElement('img');
        p.className = 'c-mviewer__peer';
        p.alt = '';
        p.draggable = false;
        p.hidden = true;
        slide.setAttribute('aria-hidden', 'true');
        slide.append(p);
        peers.push({ side, slide, img: p });
      }
      track.append(slide);
    }
    stage.append(track);
  } else stage.append(img);
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
  let thumbSrc = src || '';
  /* ★ S11 E (#1262): what a neighbour slide may show — the viewer-size picture C# already gave THIS viewer for that page
     (kept for the pages next to the one on screen only: ≤ 3 data URIs held), else that page's own thumbnail.
     ★ S11 G (R2-m6): the thumbnail no longer waits for #1180 to have shown it — on a first pass every neighbour slide was
     EMPTY under the finger. The #1180 square-crop rule (keep the thumbnail invisible until the real picture lands) is
     about the CURRENT picture only (.c-mviewer__img); a peer slide is never stretched (contain, its own size). Nothing is
     fetched for a neighbour: no new fetch rule. */
  const fullOf = new Map();
  /* ★ #1180 (#46 r1 m3): a picture that passes the URI shape but does not decode — back to the thumbnail, shown */
  img.addEventListener('error', () => {
    if (!fullSrc || img.getAttribute('src') !== fullSrc) return;
    if (fullOf.get(at) === fullSrc) fullOf.delete(at);   // ★ S11 E: never offered to a neighbour slide again
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
    if (track) { fullOf.set(at, u); keepNear(); }   // ★ S11 E: a neighbour slide may show it later
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
  const startBusy = (t) => {
    el._viewerToken = t;
    el.setAttribute('aria-busy', 'true');
    el.dataset.loading = '';
    if (!stage.querySelector('.c-mviewer__loading')) {
      const ld = document.createElement('div');
      ld.className = 'c-mviewer__loading';
      ld.setAttribute('aria-hidden', 'true');
      const sp = document.createElement('span');
      sp.className = 'c-mviewer__spinner';
      ld.append(sp);
      stage.append(ld);
    }
    if (waitT) clearTimeout(waitT);
    waitT = setTimeout(() => { waitT = 0; if (el.dataset.loading !== undefined) { endBusy(); if (!fullSrc) reveal(); } }, VIEWER_WAIT_MS);
    openViewers.add(el);
  };
  if (tok) startBusy(tok);
  stage.addEventListener('dragstart', (e) => e.preventDefault());

  /* ★ S11 E (#1262): the zoom state of the picture on screen — scale s (1…4) and a pan (x, y) in px, written as ONE
     transform (translate3d + scale, centre origin; no layout per frame). Every page change and the close reset it. */
  const ZOOM_MAX = 4;
  const ZOOM_TAP = 2.5;   // double tap / double click: 1× ↔ 2.5× at the tap point
  const PAGE_GAP = 16;    // px between two slides (= --spacing-16; the js needs the number for the track offset)
  const z = { s: 1, x: 0, y: 0 };
  const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (f) => setTimeout(f, 16);
  const reducedMotion = () => { try { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };
  const rtl = () => document.documentElement.dir === 'rtl';
  const zoomed = () => z.s > 1.001;
  /* ★ S11 G (R3-MINOR-3): a pinch UNDER 1× (the rubber band, settling back on release) is painted too — the old test
     (zoomed() = above 1×) wrote '' there, so a centred pinch-in showed no give at all */
  const paintZoom = () => {
    img.style.transform = Math.abs(z.s - 1) > 0.001 || z.x || z.y ? 'translate3d(' + z.x.toFixed(1) + 'px, ' + z.y.toFixed(1) + 'px, 0) scale(' + z.s.toFixed(3) + ')' : '';
    if (zoomed()) stage.dataset.zoomed = ''; else delete stage.dataset.zoomed;
  };
  /* instant: no transition (a new page must never animate the old page's zoom away on the new picture) */
  const resetZoom = () => {
    if (!zoomed() && !z.x && !z.y && !img.style.transform) return;
    z.s = 1; z.x = 0; z.y = 0;
    img.style.transition = 'none';
    paintZoom();
    try { getComputedStyle(img).transform; } catch (_) {}   // commit the jump before the css transition returns
    img.style.transition = '';
    img.style.willChange = '';
  };
  /* the picture's UNTRANSFORMED box (its layout centre + size) and the stage box — read ONCE per gesture, never per frame */
  const geo = () => {
    const ir = img.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    return { cx: ir.left + ir.width / 2 - z.x, cy: ir.top + ir.height / 2 - z.y, w: ir.width / z.s, h: ir.height / z.s,
      l: sr.left, t: sr.top, r: sr.right, b: sr.bottom };
  };
  /* the pan range at scale s: a picture wider than the stage may move until an edge meets the stage edge; a narrower one
     stays centred (0). `give` > 0 = rubber band past the range (that fraction of the overshoot shows). */
  const bound = (v, s, c, size, lo, hi, give) => {
    const span = size * s;
    if (span <= hi - lo) return give ? v * give : 0;
    const min = hi - c - span / 2;
    const max = lo - c + span / 2;
    const k = Math.max(min, Math.min(max, v));
    return give ? k + (v - k) * give : k;
  };
  const rubberScale = (s) => (s > ZOOM_MAX ? ZOOM_MAX * Math.pow(s / ZOOM_MAX, 0.35) : s < 1 ? Math.pow(s, 0.35) : s);
  /* scale to s1 keeping the client point (px, py) still: t1 = (p − c) − (s1 / s0)·(p − c − t0) */
  const zoomAt = (g, s1, px, py, give) => {
    const k = s1 / z.s;
    const x = (px - g.cx) - k * (px - g.cx - z.x);
    const y = (py - g.cy) - k * (py - g.cy - z.y);
    z.s = s1;
    z.x = bound(x, s1, g.cx, g.w, g.l, g.r, give);
    z.y = bound(y, s1, g.cy, g.h, g.t, g.b, give);
  };
  /* back into range after a gesture (1…4, the pan clamped) — the img's css transition (motion tokens) carries it */
  const settleZoom = (g, px, py) => {
    const s1 = Math.max(1, Math.min(ZOOM_MAX, z.s));
    if (s1 <= 1.001) { z.s = 1; z.x = 0; z.y = 0; } else zoomAt(g, s1, px, py, 0);
    img.style.transition = '';
    paintZoom();
    img.style.willChange = '';   // the hint lives for the gesture only
  };

  /* ★ S11 E: the neighbour slides and the picture cache (the pages next to the one on screen only) */
  const keepNear = () => { for (const k of [...fullOf.keys()]) if (Math.abs(k - at) > 1) fullOf.delete(k); };
  const peerSrc = (i) => (i < 0 || i >= pages.length ? '' : fullOf.get(i) || pages[i].src || '');   // ★ S11 G (R2-m6): the known thumbnail
  const refreshPeers = () => {
    for (const p of peers) {
      /* the NEXT page sits on the inline-end side: right in LTR, left in RTL (the ←/→ keys and the swipe agree) */
      const pos = rtl() ? -p.side : p.side;
      p.slide.style.transform = 'translate3d(calc(' + (pos < 0 ? '-100% - ' : '100% + ') + PAGE_GAP + 'px), 0, 0)';
      const u = peerSrc(at + p.side);
      if ((p.img.getAttribute('src') || '') !== u) { if (u) p.img.src = u; else p.img.removeAttribute('src'); }
      p.img.hidden = !u;
    }
  };

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

  /* ★ S9 (#1244 G = A): paging through a photo group — ‹ ✕ › in the foot, a "2 / 7" counter, ←/→ keys, a horizontal swipe */
  let showPage = null;
  if (pages.length > 1) {
    const mk = (cls, glyph, label) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'c-mviewer__btn c-mviewer__nav ' + cls;
      b.setAttribute('aria-label', label);
      b.append(icon(glyph, { size: 24 }));
      return b;
    };
    const prev = mk('c-mviewer__prev', 'chevron-left', strings.previousPhoto || 'Previous photo');
    const next = mk('c-mviewer__next', 'chevron-right', strings.nextPhoto || 'Next photo');
    const count = document.createElement('span');
    count.className = 'c-mviewer__count';
    count.setAttribute('aria-live', 'polite');
    foot.prepend(prev);
    foot.append(next);
    foot.before(count);
    foot.dataset.paged = '';
    showPage = (i, quiet) => {
      if (i < 0 || i >= pages.length) return false;
      at = i;
      const it = pages[at];
      resetZoom();   // ★ S11 E (#1262): a new page always starts at 1×
      /* ★ S11 E: a page whose viewer-size picture this viewer already holds (the neighbour slide showed it) takes it at
         once — no spinner, no pending fade (the slide that moved in must not blink); onPage still runs (the shell's
         current item) and C#'s answer lands on the same picture. Every other page = the #1180 loading state as before. */
      const cached = fullOf.get(at) || '';
      fullSrc = cached;
      thumbSrc = it.src || '';
      if (cached) { delete img.dataset.pending; img.src = cached; }
      else {
        img.dataset.pending = '';
        if (thumbSrc) img.src = thumbSrc; else img.removeAttribute('src');
      }
      delete el.dataset.failed;
      if (cached) { el._viewerToken = String(it.token); openViewers.add(el); endBusy(); }
      else startBusy(String(it.token));
      keepNear();
      refreshPeers();
      if (capEl) capEl.textContent = it.alt || '';
      el.setAttribute('aria-label', it.alt || (strings.image || 'Image'));
      count.textContent = (strings.photoOfCount || '{i} / {n}').split('{i}').join(String(at + 1)).split('{n}').join(String(pages.length));
      prev.disabled = at === 0;
      next.disabled = at === pages.length - 1;
      /* ★ #46 M7: a disabled button drops its focus to BODY — hand it to the other arrow, else the close */
      const ae = document.activeElement;
      if ((ae === prev || ae === next) && ae.disabled) { const to = ae === prev ? next : prev; (to.disabled ? close : to).focus({ preventScroll: true }); }
      syncReply();
      if (!quiet && typeof onPage === 'function') { try { onPage(at, it); } catch (_) {} }
      return true;
    };
    prev.addEventListener('click', () => turnPage(at - 1));   // ★ S11 E (#1262): the track slides (reduced motion: instant)
    next.addEventListener('click', () => turnPage(at + 1));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        turnPage(at + ((e.key === 'ArrowRight') !== (document.documentElement.dir === 'rtl') ? 1 : -1));
      }
    });
    showPage(at, true);
  }
  el.showPage = (i) => (showPage ? showPage(i) : false);

  /* ★ S11 E (#1262): the TRACK's settle — the page state commits at once (counter, onPage, the picture), and the track
     then slides from where the old picture stood to rest: one transition on transform (motion tokens, css
     [data-settle]); reduced motion = no slide (an instant switch). A new press stops a running settle at its end. */
  let settleT = 0;
  const moveTrack = (px) => { if (track) track.style.transform = px ? 'translate3d(' + px.toFixed(1) + 'px, 0, 0)' : ''; };
  const endSettle = () => {
    if (settleT) { clearTimeout(settleT); settleT = 0; }
    if (track) { delete track.dataset.settle; track.style.willChange = ''; }
  };
  const settleTrack = (fromPx) => {
    if (!track) return;
    endSettle();
    if (!fromPx || reducedMotion()) { moveTrack(0); return; }
    moveTrack(fromPx);
    try { getComputedStyle(track).transform; } catch (_) {}   // the start offset is committed before the transition turns on
    track.style.willChange = 'transform';
    track.dataset.settle = '';
    moveTrack(0);
    settleT = setTimeout(endSettle, 600);   // transitionend backstop (a hidden page never fires it)
  };
  if (track) track.addEventListener('transitionend', (e) => { if (e.target === track) endSettle(); });
  const pageW = () => { const w = stage.getBoundingClientRect().width; return w > 0 ? w : (window.innerWidth || 0); };
  /* turn to page i from a track offset (0 = at rest: the ‹ › buttons and the keys; a drag hands its offset over) */
  const turnPage = (i, off = 0) => {
    const from = at;
    if (!showPage || !showPage(i)) { settleTrack(off); return false; }
    settleTrack(off + (i - from) * (rtl() ? -1 : 1) * (pageW() + PAGE_GAP));   // the same picture stays under the finger
    return true;
  };

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
  /* ★ S11 E (#1262): the gesture model. One pointer at 1× = a tap, a PAGE drag (sideways, a paged viewer: the track
     follows the finger 1:1) or a DISMISS drag (the #1180 swipe); one pointer when zoomed = a PAN (page swipe and
     swipe-to-dismiss are off); two pointers = a PINCH around their midpoint. The axis locks once the press moved
     TAP_PX. Moves only record — the writes run in ONE rAF per frame (transform / opacity only). */
  const FLICK_PX_MS = 0.3;   // a release faster than this (the last 100 ms) turns the page
  const PAGE_FRAC = 0.35;    // … or a drag past 35 % of the width
  const EDGE_GIVE = 0.3;     // resistance past the first / last photo (and the pan / zoom rubber band)
  const DOUBLE_TAP_MS = 350;
  const DOUBLE_TAP_PX = 30;
  let startY = 0;
  let startX = 0;
  let dragX = 0;
  let dragY = 0;
  let downOnImg = false;
  let lastDownAt = openedAt;   // #46 r3: the double click's FIRST press opened the viewer (the stage never saw it) — the next press within 500 ms is its second
  let secondOfPair = false;   // #46 r2 (3): the second press of a mouse double click (pointer events carry no click count)
  const pts = new Map();   // the pointers down on the stage → { x, y }
  let mode = '';           // '' · 'press' (not moved yet) · 'x' page drag · 'y' dismiss drag · 'pan' · 'pinch' · 'rest' (a pinch's last finger at 1×)
  let g0 = null;           // geo() at the gesture start (one layout read)
  let z0 = null;           // the zoom at the gesture start
  let pinch0 = null;       // { d, mx, my } at the pinch start
  let samples = [];        // [t, clientX] of a page drag (the flick speed)
  let lastTap = null;      // the last tap on the picture (a double tap / double click)
  let frameQ = false;
  const edgeOff = (dx) => {
    const t = at + (((dx < 0) !== rtl()) ? 1 : -1);
    return t < 0 || t >= pages.length ? dx * EDGE_GIVE : dx;
  };
  const midOf = () => { const [a, b] = [...pts.values()]; return { d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; };
  const paintDrag = () => {
    frameQ = false;
    if (mode === 'x') moveTrack(edgeOff(dragX));
    else if (mode === 'y') {
      if (Math.abs(dragY) >= TAP_PX) el.style.transition = 'none';  // ★ #1180: once the finger really MOVES, the fade must not lag it (jitter / a still press leave the open fade alone)
      img.style.transform = 'translate3d(0, ' + dragY + 'px, 0)';
      el.style.opacity = String(Math.max(0.4, 1 - Math.abs(dragY) / 320));
    } else if (mode === 'pan') {
      z.x = bound(z0.x + dragX, z.s, g0.cx, g0.w, g0.l, g0.r, EDGE_GIVE);
      z.y = bound(z0.y + dragY, z.s, g0.cy, g0.h, g0.t, g0.b, EDGE_GIVE);
      paintZoom();
    } else if (mode === 'pinch' && pts.size === 2) {
      const m = midOf();
      const s1 = rubberScale(z0.s * m.d / pinch0.d);
      const k = s1 / z0.s;
      z.s = s1;
      z.x = bound((m.mx - g0.cx) - k * (pinch0.mx - g0.cx - z0.x), s1, g0.cx, g0.w, g0.l, g0.r, EDGE_GIVE);
      z.y = bound((m.my - g0.cy) - k * (pinch0.my - g0.cy - z0.y), s1, g0.cy, g0.h, g0.t, g0.b, EDGE_GIVE);
      paintZoom();
    }
  };
  const queue = () => { if (!frameQ) { frameQ = true; raf(paintDrag); } };
  /* a second finger: a running page / dismiss drag gives way (springs back), the pinch takes the picture */
  const startPinch = () => {
    if (mode === 'x') settleTrack(edgeOff(dragX));
    if (mode === 'y') { el.style.transition = ''; el.style.opacity = ''; }
    mode = 'pinch';
    lastTap = null;
    img.style.transition = 'none';
    img.style.willChange = 'transform';
    paintZoom();
    g0 = geo();
    z0 = { s: z.s, x: z.x, y: z.y };
    pinch0 = midOf();
  };
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.isPrimary) pts.clear();   // a new touch sequence / a mouse press: no stale pointer survives
    if (pts.size >= 2) return;      // a third finger is ignored
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { stage.setPointerCapture(e.pointerId); } catch (_) {}
    if (pts.size === 2) { startPinch(); return; }
    startY = e.clientY;
    startX = e.clientX;
    dragX = 0;
    dragY = 0;
    downOnImg = e.target === img;   // ★ #1180: where the press began (the capture below retargets the later events)
    const now = performance.now();
    secondOfPair = now - lastDownAt < 500;
    lastDownAt = now;
    img.style.transition = 'none'; // finger-follow must not lag
    endSettle();
    moveTrack(0);
    mode = 'press';
    samples = [[now, e.clientX]];
  });
  stage.addEventListener('pointermove', (e) => {
    const p = mode ? pts.get(e.pointerId) : null;
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (mode === 'pinch') { queue(); return; }
    if (mode === 'rest') return;
    dragY = e.clientY - startY;
    dragX = e.clientX - startX;
    if (mode === 'press') {
      if (Math.hypot(dragX, dragY) < TAP_PX) return;
      lastTap = null;
      if (zoomed()) { mode = 'pan'; g0 = geo(); z0 = { s: z.s, x: z.x, y: z.y }; img.style.willChange = 'transform'; }
      else if (track && Math.abs(dragX) > Math.abs(dragY)) { mode = 'x'; track.style.willChange = 'transform'; }   // ★ S9: a page swipe, not a dismiss
      else { mode = 'y'; img.style.willChange = 'transform'; }
    }
    if (mode === 'x') { samples.push([performance.now(), e.clientX]); if (samples.length > 16) samples.shift(); }
    queue();
  });
  const endDrag = (e) => {
    if (!mode || !pts.has(e.pointerId)) return;
    if (frameQ) paintDrag();   // the last move lands before the release decides
    const up = e.type === 'pointerup';
    if (mode === 'pinch' || mode === 'rest') {
      if (mode === 'pinch') { const m = midOf(); settleZoom(g0, m.mx, m.my); }   // back into 1…4 around the fingers
      pts.delete(e.pointerId);
      lastTap = null;
      if (pts.size === 1 && zoomed()) {   // the finger left down keeps panning, from where it is
        const [p] = [...pts.values()];
        mode = 'pan'; startX = p.x; startY = p.y; dragX = 0; dragY = 0;
        img.style.transition = 'none';
        g0 = geo(); z0 = { s: z.s, x: z.x, y: z.y };
      } else mode = pts.size ? 'rest' : '';
      return;
    }
    pts.delete(e.pointerId);
    const m = mode;
    mode = '';
    if (m === 'pan') { settleZoom(g0, e.clientX, e.clientY); return; }   // the rubber band settles into the pan range
    img.style.willChange = '';
    if (m === 'x') {
      /* ★ S11 E: the page turns on a flick (≥ 0.3 px/ms over the last 100 ms, same direction) or past 35 % of the width;
         otherwise (and on a cancel, and past the first / last photo) the track snaps back */
      const now = performance.now();
      samples.push([now, e.clientX]);
      const win = samples.filter((s) => now - s[0] <= 100);
      const v = win.length >= 2 ? (win[win.length - 1][1] - win[0][1]) / Math.max(1, win[win.length - 1][0] - win[0][0]) : 0;
      const t = at + (((dragX < 0) !== rtl()) ? 1 : -1);
      const go = up && t >= 0 && t < pages.length
        && (Math.abs(dragX) > PAGE_FRAC * pageW() || (Math.abs(v) >= FLICK_PX_MS && Math.sign(v) === Math.sign(dragX)));
      img.style.transition = '';
      if (go) turnPage(t, edgeOff(dragX)); else settleTrack(edgeOff(dragX));
      return;
    }
    if (m === 'press') {
      img.style.transition = '';
      /* ★ S11 E: a DOUBLE tap / double click on the picture toggles 1× ↔ 2.5× at that point (the img's css transition —
         motion tokens — carries it; reduced motion = the tokens are 0 ms: instant) */
      if (up && downOnImg) {
        const now = performance.now();
        if (lastTap && now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < DOUBLE_TAP_PX) {
          lastTap = null;
          if (zoomed()) { z.s = 1; z.x = 0; z.y = 0; } else zoomAt(geo(), ZOOM_TAP, e.clientX, e.clientY, 0);
          paintZoom();
          return;
        }
        lastTap = { t: now, x: e.clientX, y: e.clientY };
      } else lastTap = null;
      /* ★ #1180: a TAP on the dim stage (not on the picture) closes — like the swipe; a cancelled press never does */
      if (up && !downOnImg && !secondOfPair && tapCloseReady()) dismissOverlay(el);
      return;
    }
    if (m === 'y') {
      const past = Math.abs(dragY) > DISMISS_PX && Math.abs(dragY) >= Math.abs(dragX);
      img.style.transition = ''; // spring-back transition returns (css)
      el.style.transition = '';  // ★ #1180: the viewer's own fade returns — a swipe close fades from where the finger left it
      if (past) {
        dismissOverlay(el);
        el.style.opacity = '';   // ★ #1180: AFTER data-open went: the css close fade runs from the dragged opacity to 0
      } else {
        img.style.transform = '';
        el.style.opacity = '';
      }
    }
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  /* ★ S11 E (#1262): Windows / Mac — ctrl + wheel (a trackpad pinch arrives as one) zooms around the pointer; a plain
     wheel / two-finger scroll pans a zoomed picture; at 1× a plain wheel is not the viewer's. One layout read per
     burst, the write in a rAF. */
  let wheelG = null;
  let wheelAt = 0;
  let wheelQ = false;
  let wheelT = 0;
  stage.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !zoomed()) return;
    e.preventDefault();
    if (mode) return;   // a pointer gesture owns the picture
    const now = performance.now();
    if (!wheelG || now - wheelAt > 200) wheelG = geo();
    wheelAt = now;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    img.style.transition = 'none';
    if (e.ctrlKey) {
      const s1 = Math.max(1, Math.min(ZOOM_MAX, z.s * Math.exp(-e.deltaY * unit * 0.01)));
      if (s1 <= 1.001) { z.s = 1; z.x = 0; z.y = 0; } else zoomAt(wheelG, s1, e.clientX, e.clientY, 0);
    } else {
      z.x = bound(z.x - e.deltaX * unit, z.s, wheelG.cx, wheelG.w, wheelG.l, wheelG.r, 0);
      z.y = bound(z.y - e.deltaY * unit, z.s, wheelG.cy, wheelG.h, wheelG.t, wheelG.b, 0);
    }
    if (!wheelQ) { wheelQ = true; raf(() => { wheelQ = false; paintZoom(); }); }
    if (wheelT) clearTimeout(wheelT);
    wheelT = setTimeout(() => { wheelT = 0; if (!mode) img.style.transition = ''; }, 200);
  }, { passive: false });
  /* ★ S11 E: a Mac trackpad pinch in WKWebView arrives as Safari's gesturestart / gesturechange (e.scale), not as a
     ctrl + wheel. Taken only while NO pointer is down (iOS fires these beside the touch pointers — the pinch above owns
     that case). Other engines never fire them. */
  let gest = null;
  stage.addEventListener('gesturestart', (e) => {
    e.preventDefault();
    if (mode || pts.size) return;
    img.style.transition = 'none';
    gest = { s: z.s, g: geo() };
  });
  stage.addEventListener('gesturechange', (e) => {
    e.preventDefault();
    if (!gest || mode || pts.size) return;
    const s1 = Math.max(1, Math.min(ZOOM_MAX, gest.s * (Number(e.scale) || 1)));
    if (s1 <= 1.001) { z.s = 1; z.x = 0; z.y = 0; } else zoomAt(gest.g, s1, e.clientX, e.clientY, 0);
    if (!wheelQ) { wheelQ = true; raf(() => { wheelQ = false; paintZoom(); }); }
  });
  stage.addEventListener('gestureend', (e) => {
    e.preventDefault();
    if (!gest) return;
    gest = null;
    img.style.transition = '';
  });
  /* ★ #1180: a click on the viewer's own dim ground around the bar / the foot / the caption (never on a button) closes
     too — not the second click of a double click, not during the open fade (#46 r1 M2 / n2) */
  el.addEventListener('click', (e) => {
    const t = e.target;
    if (!t || !t.closest || t.closest('button') || (e.detail || 0) > 1 || !tapCloseReady()) return;
    if (t === el || t.closest('.c-mviewer__bar') || t.closest('.c-mviewer__foot')) dismissOverlay(el);
  });

  /* ★ #1166 V-3 (#46 r1 C-N4): every close path (✕, swipe, Esc, back) clears the wait timer and drops the viewer from
     openViewers — a closed viewer is never found and holds nothing. ★ S11 E (#1262): the zoom / track state lives in
     this viewer's closure only — a zoomed picture fades out where it is (no jump to 1× inside the 100 ms close fade)
     and every open is a NEW viewer at 1×; the settle / wheel timers only clear inline styles (harmless after close). */
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
