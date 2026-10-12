/**
 * ★ S17 A (#1338) — WHAT'S NEW: the spotlight carousel (kit-render.html § What's new, CLEAN BLUE, LOCKED 14:45;
 * PROPOSAL.md plan v2). One card, six slides; every slide = its scene in its own panel (illoWhatsNew: a background
 * and a foreground layer) over the title + body on the sheet; dots and Next / Got it in the foot; × on the panel.
 *
 *   createWhatsNew({ version, slides, host, desktop, onDone, strings }) → the overlay element (opened)
 *     version  the release digits ("0.9.22") — the eyebrow on slide 1 says "New in Spixi {0}"
 *     slides   the slide ids (whatsNewSlides(version) gives this release's set)
 *     onDone(how)  ONCE, on every close path: 'gotit' (the last Next) · 'close' (×) · 'dismiss' (Esc, back)
 *   whatsNewSlides(version) → the per-release table's ids, or null (a release with no table bumps `seen` silently, #1143)
 *
 * Motion (PROPOSAL §3): each scene plays its entrance once, the first time its slide shows (il-* / wn-* classes,
 * watchEntrance holds the end frame), then only its background loops run (≤ 0.5 Hz). ⚠ The render's lesson: every
 * scene is aria-hidden, so the loop pause is keyed on the OFF-SCREEN slide (.wn-paused), never on aria-hidden. While
 * the finger drags, the background layer moves at −0.42 × and the foreground at +0.16 × the slide offset (depth);
 * the ends rubber-band. Reduced motion = no transition, no parallax, every scene at its end frame (illo.css).
 * Security: copy = the string table (textContent only); the art = inline static SVG from the bundle; no fetch, no
 * storage — the host owns `seen` (C# SLocalOnlyStore through ixian:whatsnew:done).
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createButton } from './button.js';
import { openOverlay, dismissOverlay, setOverlayOpts, overlayId } from './overlay.js';
import { illoWhatsNew, WN_SCENE_IDS } from './illustrations.js';

/* THE PER-RELEASE TABLE: release digits → slide ids. ⚠ A version bump without a row here shows nothing and bumps
   `seen` silently — the pin compares this table with Config.version (the CSH / source pin "the table names this build"). */
export const WHATS_NEW_SETS = Object.freeze({
  '0.9.22': Object.freeze(['hero', 'reply', 'voice', 'photos', 'privacy', 'apps']),
});
export function whatsNewSlides(version) {
  const v = String(version == null ? '' : version);
  return Object.prototype.hasOwnProperty.call(WHATS_NEW_SETS, v) ? WHATS_NEW_SETS[v].slice() : null;
}

const DEPTH = { bg: -0.42, fg: 0.16 };
const SWIPE_MIN = 40;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* the copy per slide — a SWITCH, never strings['whatsNew' + id + 'Title']: extract-strings is a static sweep and a
   computed key ships English in every locale (the creditLabel rule, settings-app.js) */
function slideCopy(id, strings) {
  switch (id) {
    case 'hero': return [strings.whatsNewHeroTitle || 'Meet the new Spixi', strings.whatsNewHeroBody || 'Redesigned from top to bottom, with new ways to talk. Your chats, contacts and wallet are all still here.'];
    case 'reply': return [strings.whatsNewReplyTitle || 'React, reply and edit', strings.whatsNewReplyBody || 'Swipe a message to reply, react with one tap, or fix a typo after you send. Works best with contacts on the new Spixi.'];
    case 'voice': return [strings.whatsNewVoiceTitle || 'Voice messages', strings.whatsNewVoiceBody || 'Record a message instead of typing it. Contacts on an older Spixi get it as an audio file.'];
    case 'photos': return [strings.whatsNewPhotosTitle || 'Photos and albums', strings.whatsNewPhotosBody || 'Send up to 10 photos at once and open them full screen. Spixi removes the location from the photos you send.'];
    case 'privacy': return [strings.whatsNewPrivacyTitle || 'Your privacy, your switches', strings.whatsNewPrivacyBody || 'Hide read receipts, typing and your online status. You find all three in Settings › Privacy.'];
    case 'apps': return [strings.whatsNewAppsTitle || 'Mini apps, together', strings.whatsNewAppsBody || 'Invite a contact to a game or a tool. They join with one tap, right in the chat.'];
    default: return ['', ''];
  }
}

export function createWhatsNew({
  version = '',
  slides = WN_SCENE_IDS,
  host,
  desktop = false,
  onDone,
  strings = getStrings(),
} = {}) {
  const ids = (slides || []).filter((id) => WN_SCENE_IDS.indexOf(id) >= 0);
  const n = ids.length;
  let i = 0;
  let finished = false;
  const uid = overlayId('c-whatsnew');

  const el = document.createElement('section');
  el.className = 'c-whatsnew';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  if (desktop) el.dataset.desktop = '';

  const card = document.createElement('div');
  card.className = 'c-whatsnew__card';
  /* the opening focus lands on the CARD (a C# push opens it before any input — overlay.js would otherwise put a ring on ×) */
  card.tabIndex = -1;
  card.dataset.autofocus = '';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'c-whatsnew__x';
  close.setAttribute('aria-label', strings.close || 'Close');
  close.append(icon('x', { size: 22 }));
  close.addEventListener('click', () => done('close'));

  const vp = document.createElement('div');
  vp.className = 'c-whatsnew__vp';
  const track = document.createElement('div');
  track.className = 'c-whatsnew__track';
  vp.append(track);

  const slideEls = ids.map((id, k) => {
    const s = document.createElement('div');
    s.className = 'c-whatsnew__slide';
    s.dataset.slide = id;
    s.setAttribute('role', 'group');
    s.setAttribute('aria-roledescription', 'slide');
    s.setAttribute('aria-label', (k + 1) + ' / ' + n);
    const art = document.createElement('div');
    art.className = 'c-whatsnew__art';
    art.setAttribute('aria-hidden', 'true');
    const text = document.createElement('div');
    text.className = 'c-whatsnew__text';
    if (k === 0) {
      const eb = document.createElement('p');
      eb.className = 'c-whatsnew__eyebrow';
      eb.textContent = (strings.whatsNewEyebrow || 'New in Spixi {0}').split('{0}').join(version);
      text.append(eb);
    }
    const [title, bodyText] = slideCopy(id, strings);
    const h = document.createElement('h2');
    h.className = 'c-whatsnew__title';
    h.id = uid + '-t' + k;
    h.textContent = title;
    const p = document.createElement('p');
    p.className = 'c-whatsnew__body';
    p.textContent = bodyText;
    text.append(h, p);
    s.append(art, text);
    track.append(s);
    return { s, art, id, built: false, layers: [] };
  });

  const foot = document.createElement('div');
  foot.className = 'c-whatsnew__foot';
  const dots = document.createElement('div');
  dots.className = 'c-whatsnew__dots';
  dots.setAttribute('role', 'tablist');
  dots.setAttribute('aria-label', strings.whatsNew || 'What’s new');
  const dotEls = ids.map((id, k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-whatsnew__dot';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', (k + 1) + ' / ' + n);
    b.addEventListener('click', () => go(k));
    dots.append(b);
    return b;
  });
  const primary = createButton({ label: strings.next || 'Next', size: 56, width: 'full' });
  primary.classList.add('c-whatsnew__primary');
  primary.addEventListener('click', () => { if (i < n - 1) go(i + 1); else done('gotit'); });
  foot.append(dots, primary);

  card.append(close, vp, foot);
  let prev = null, next = null;
  if (desktop) {
    /* desktop: side arrows beside the card (the keyboard has ← / →) */
    const row = document.createElement('div');
    row.className = 'c-whatsnew__row';
    prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'c-whatsnew__side';
    prev.setAttribute('aria-label', strings.previous || 'Previous');
    prev.append(icon('chevron-left', { size: 24 }));
    prev.addEventListener('click', () => go(i - 1));
    next = document.createElement('button');
    next.type = 'button';
    next.className = 'c-whatsnew__side';
    next.setAttribute('aria-label', strings.next || 'Next');
    next.append(icon('chevron-right', { size: 24 }));
    next.addEventListener('click', () => go(i + 1));
    row.append(prev, card, next);
    el.append(row);
  } else {
    el.append(card);
  }
  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
  });

  /* the scenes are built only when their slide is about to show (the current one and its neighbours) */
  function ensureArt(k) {
    const sl = slideEls[k];
    if (!sl || sl.built) return;
    sl.built = true;
    const sc = illoWhatsNew(sl.id);   // each layer is an `il wn-l wn-l--bg|fg` svg (the art table's own classes)
    if (!sc) return;
    for (const [svg, depth] of [[sc.bg, 'bg'], [sc.fg, 'fg']]) {
      const L = document.createElement('div');
      L.className = 'c-whatsnew__layer';
      L.dataset.depth = depth;
      L.append(svg);
      sl.art.append(L);
      sl.layers.push(L);
    }
  }
  const reduced = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
  /* pos = the fractional slide under the finger: the track, and the parallax of the neighbours' layers */
  function paint(pos) {
    const W = vp.clientWidth || 1;
    track.style.transform = 'translateX(' + (-pos * W * (document.documentElement.dir === 'rtl' ? -1 : 1)) + 'px)';
    const rm = reduced();
    slideEls.forEach((sl, k) => {
      const off = (k - pos) * W;
      for (const L of sl.layers) {
        const d = L.dataset.depth === 'bg' ? DEPTH.bg : DEPTH.fg;
        L.style.transform = (!rm && Math.abs(k - pos) < 1.5) ? 'translateX(' + (off * d).toFixed(1) + 'px)' : '';
      }
    });
  }
  function go(k) {
    if (!n) return;
    i = clamp(k, 0, n - 1);
    ensureArt(i);
    paint(i);
    const last = i === n - 1;
    const lab = primary.querySelector('.c-button__label');
    if (lab) lab.textContent = last ? (strings.whatsNewGotIt || 'Got it') : (strings.next || 'Next');
    dotEls.forEach((d, k2) => { d.setAttribute('aria-selected', String(k2 === i)); d.tabIndex = k2 === i ? 0 : -1; });
    slideEls.forEach((sl, k2) => {
      const on = k2 === i;
      sl.s.setAttribute('aria-hidden', String(!on));
      if (on) sl.s.removeAttribute('inert'); else sl.s.setAttribute('inert', '');
      sl.art.classList.toggle('wn-paused', !on);   // ⚠ the pause is keyed on the OFF-SCREEN slide, never on aria-hidden
    });
    el.setAttribute('aria-labelledby', uid + '-t' + i);
    if (prev) { prev.disabled = i === 0; next.disabled = last; }
  }

  /* the swipe: the finger drags the track; ≥ 40 px moves one slide; the ends rubber-band */
  let x0 = null, dx = 0, pid = null;
  vp.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    x0 = e.clientX; dx = 0; pid = e.pointerId;
    card.dataset.drag = '';
    ensureArt(i - 1); ensureArt(i + 1);
  });
  vp.addEventListener('pointermove', (e) => {
    if (x0 == null || e.pointerId !== pid) return;
    dx = (e.clientX - x0) * (document.documentElement.dir === 'rtl' ? -1 : 1);
    const W = vp.clientWidth || 1;
    let p = i - dx / W;
    if (p < 0) p = p / 3;
    if (p > n - 1) p = n - 1 + (p - n + 1) / 3;
    paint(p);
  });
  const end = (e) => {
    if (x0 == null || (e && e.pointerId !== pid)) return;
    x0 = null; pid = null;
    delete card.dataset.drag;
    if (Math.abs(dx) >= SWIPE_MIN) go(i + (dx < 0 ? 1 : -1)); else go(i);
  };
  for (const t of ['pointerup', 'pointercancel', 'pointerleave']) vp.addEventListener(t, end);

  /* #46 r1 m6: a rotation / window resize re-aligns the track (the offsets are px of the viewport width) */
  const onResize = () => { try { if (!finished) paint(i); } catch (e) {} };
  window.addEventListener('resize', onResize);
  function done(how) {
    if (finished) return;
    finished = true;
    window.removeEventListener('resize', onResize);
    dismissOverlay(el);
    try { if (onDone) onDone(how); } catch (e) { /* the host's verb must not break the close */ }
  }

  go(0);
  setOverlayOpts(el, { host, lightDismiss: false, escDismiss: true, onDismiss: () => done('dismiss') });
  openOverlay(el, { host, lightDismiss: false, escDismiss: true, onDismiss: () => done('dismiss') });
  /* its own scrim: tagged for the deeper dark dim; on desktop no dim at all (Damir's pick) — the scrim stays, clear, so
     the click-catcher and the stack still work */
  const scrim = el.previousElementSibling;
  if (scrim && scrim.classList.contains('c-scrim')) {
    scrim.dataset.wn = '';
    if (desktop) scrim.dataset.dtClear = '';
  }
  requestAnimationFrame(() => paint(i));   // the viewport has its width only once it is in the document
  return el;
}
