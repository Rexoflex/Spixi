/**
 * c-seasonal — the seasonal top bar (★ S11 A, DECISIONS #1262; design "Spixi Halloween Top Bar", Damir's picks).
 *
 *   seasonFor(date) → 'halloween' | 'christmas' | null      PURE, on the device's LOCAL clock:
 *       halloween = [24 Oct 00:00, 1 Nov 03:00)   — through Halloween night, gone by morning
 *       christmas = [1 Dec 00:00, 2 Jan 00:00)    — through New Year's Day (the window spans the year end)
 *   applySeason(titleEl, season)   — dresses ONE logotype title (topbar.js `[data-logotype]`) for the season, or
 *                                    restores the plain mark (season null). Idempotent.
 *   attachSeasonal(topbarEl, { now, scroller }) → detach()
 *       checks on attach, on resume (visibilitychange → visible) and every 60 s — no network, no storage.
 *
 * C1 Halloween: the mark turns into a jack-o'-lantern (`c-seasonal__jack`) and a small lit pumpkin
 * (`c-seasonal__pumpkin`) stands AFTER the wordmark on the text baseline. X1 Christmas: a Santa hat
 * (`c-seasonal__hat`) sits tilted on the mark's top corner; its pom-pom twinkles about every 6 s.
 * Only light moves (candle flicker · pom twinkle), ~20 s per arming then the frame holds (★ S11 A2, #1263: re-armed at
 * most once per 10 min, held while the list scrolls); reduced motion = static (seasonal.css).
 *
 * ★ The art is decorative: every SVG is aria-hidden + focusable=false, and the title keeps its text (the wordmark /
 * the connecting state) exactly as before — the M16 title-state swap writes the WORD span, never the art.
 * ★ Unique SVG ids per instance (a gradient id shared by two bars would paint the second from the first's defs).
 * ★ Colours that ARE the art (orange, green, red, white) stay literal inside the SVG; the theme-dependent shadow
 * and halo are tokens (--seasonal-shadow / --seasonal-shadow-alpha / --seasonal-halo, tokens.css region A) applied
 * through CSS (topbar.css) — a var() inside an SVG presentation ATTRIBUTE is not resolved.
 * ★ The markup is built from STATIC strings only (the icon registry's own grammar) — nothing from a push or a peer.
 *
 * Test / demo hook: `Spixi.__seasonNow = () => Date` replaces the clock read (inert unless a page sets it; no verb,
 * no storage). The smoke pins set it on a built shell and fire `visibilitychange`.
 */
import { ICONS } from './icons.js';

/** PURE — the season for a LOCAL date, or null. */
export function seasonFor(date) {
  const d = date instanceof Date ? date : new Date(date);
  const t = d.getTime();
  if (!Number.isFinite(t)) return null;
  const m = d.getMonth();        // 0 = Jan
  const day = d.getDate();
  const h = d.getHours();
  if ((m === 9 && day >= 24) || (m === 10 && day === 1 && h < 3)) return 'halloween';
  if (m === 11 || (m === 0 && day === 1)) return 'christmas';
  return null;
}

let seasonalSeq = 0;
const logoParts = () => {
  const b = (ICONS.logo && ICONS.logo.b) || '';
  return [...b.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);   // [outer, eye, eye] — the registry's own logo paths
};
const SVGNS = 'http://www.w3.org/2000/svg';
function svgFrom(markup) {
  /* static strings only — the same sink the icon registry uses (icons.js iconFactory) */
  const host = document.createElementNS(SVGNS, 'svg');
  host.innerHTML = markup;
  return host.firstElementChild;
}
const shadowFilter = (id, blur, dy) =>
  '<filter id="' + id + '" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur in="SourceAlpha" stdDeviation="' + blur + '"/>'
  + '<feOffset dy="' + dy + '" result="o"/><feFlood class="c-seasonal__flood"/><feComposite operator="in" in2="o"/>'
  + '<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>';

/** The C1 lantern mark (28 px) — the logo's own outline, lit. */
function jackMark(p) {
  const [outer = '', eyeA = '', eyeB = ''] = logoParts();
  return svgFrom(
    '<svg xmlns="' + SVGNS + '" class="c-seasonal__jack" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" focusable="false" overflow="visible">'
    + '<defs><linearGradient id="' + p + 'b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB45A"/><stop offset=".5" stop-color="#F7801F"/><stop offset="1" stop-color="#C4520D"/></linearGradient>'
    + '<radialGradient id="' + p + 'g" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#FFF6CF"/><stop offset=".55" stop-color="#FFD25A"/><stop offset="1" stop-color="#FF9A1F"/></radialGradient>'
    + '<radialGradient id="' + p + 'h" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFC94A" stop-opacity=".85"/><stop offset="1" stop-color="#FF8A1F" stop-opacity="0"/></radialGradient></defs>'
    + '<ellipse class="c-seasonal__inner" cx="16.6" cy="16.2" rx="7" ry="5.5" fill="url(#' + p + 'h)"/>'
    + '<path fill-rule="evenodd" clip-rule="evenodd" d="' + outer + '" fill="url(#' + p + 'b)"/>'
    + '<path d="M24.8 1.6c.3-1.3 1-2.3 2.2-2.9" stroke="#4A6527" stroke-width="1.6" stroke-linecap="round" fill="none"/>'
    + '<path d="M26.2 -.4c1.2-.6 2.6-.4 3.3.4-1.1.7-2.4.7-3.3-.4z" fill="#6E9A3A"/>'
    + '<g class="c-seasonal__face"><path fill-rule="evenodd" clip-rule="evenodd" d="' + eyeA + '" fill="url(#' + p + 'g)"/><path fill-rule="evenodd" clip-rule="evenodd" d="' + eyeB + '" fill="url(#' + p + 'g)"/></g>'
    + '</svg>');
}

/** The C1 small pumpkin (18 px) that stands after the wordmark. */
function pumpkin(p) {
  return svgFrom(
    '<svg xmlns="' + SVGNS + '" class="c-seasonal__pumpkin" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">'
    + '<defs><radialGradient id="' + p + 'pb" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#FFC979"/><stop offset=".42" stop-color="#F98A2A"/><stop offset="1" stop-color="#B94A0B"/></radialGradient>'
    + '<linearGradient id="' + p + 'pl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F9A04A"/><stop offset="1" stop-color="#A9420A"/></linearGradient>'
    + '<radialGradient id="' + p + 'pg" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#FFF7D6"/><stop offset=".5" stop-color="#FFD866"/><stop offset="1" stop-color="#FF9A1F"/></radialGradient>'
    + '<radialGradient id="' + p + 'ph" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFD25A" stop-opacity=".9"/><stop offset="1" stop-color="#FF8A1F" stop-opacity="0"/></radialGradient>'
    + shadowFilter(p + 'ps', 1, 1)
    + '<clipPath id="' + p + 'pc"><ellipse cx="12" cy="14.3" rx="9.8" ry="7.6"/></clipPath></defs>'
    + '<ellipse class="c-seasonal__halo" cx="12" cy="15" rx="12" ry="9.5" fill="url(#' + p + 'ph)"/>'
    + '<g filter="url(#' + p + 'ps)">'
    + '<path d="M12.1 7c0-1.7.5-3.2 1.8-4.2" stroke="#4A6527" stroke-width="1.8" stroke-linecap="round" fill="none"/>'
    + '<path d="M13.5 4.6c1.3-1 3.1-1 4.1-.1-1.2 1-2.9 1.2-4.1.1z" fill="#6E9A3A"/>'
    + '<ellipse cx="7.3" cy="14.4" rx="5.4" ry="7" fill="url(#' + p + 'pl)"/>'
    + '<ellipse cx="16.7" cy="14.4" rx="5.4" ry="7" fill="url(#' + p + 'pl)"/>'
    + '<ellipse cx="12" cy="14.5" rx="6.3" ry="7.5" fill="url(#' + p + 'pb)"/>'
    + '<path d="M9.4 7.8c-1 2-1 11.4 0 13.4M14.6 7.8c1 2 1 11.4 0 13.4" stroke="#9A3C08" stroke-opacity=".4" stroke-width=".6" fill="none"/>'
    + '<g clip-path="url(#' + p + 'pc)"><ellipse class="c-seasonal__inner" cx="12" cy="15.4" rx="5.6" ry="4.4" fill="url(#' + p + 'ph)"/></g>'
    + '<ellipse cx="9.5" cy="10.1" rx="2.1" ry="1" fill="#fff" opacity=".35" transform="rotate(-25 9.5 10.1)"/>'
    + '<g class="c-seasonal__face"><path d="M7.7 13.5l1.8-2.4 1.1 2.6zM16.3 13.5l-1.8-2.4-1.1 2.6z" fill="url(#' + p + 'pg)"/>'
    + '<path d="M7.5 16.2c1.2 1.6 2.7 2.3 4.5 2.3s3.3-.7 4.5-2.3l-1.2.4-.7 1-1-.9-1.6.9-1.6-.9-1 .9-.7-1z" fill="url(#' + p + 'pg)"/></g>'
    + '</g></svg>');
}

/** The X1 Santa hat (19 × 16) that sits tilted on the mark's top corner. */
function santaHat(p) {
  return svgFrom(
    '<svg xmlns="' + SVGNS + '" class="c-seasonal__hat" viewBox="0 0 24 20" width="19" height="16" aria-hidden="true" focusable="false" overflow="visible">'
    + '<defs><linearGradient id="' + p + 'hr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF5A5F"/><stop offset=".55" stop-color="#E0262F"/><stop offset="1" stop-color="#A3141D"/></linearGradient>'
    + '<linearGradient id="' + p + 'hf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#DCE2EE"/></linearGradient>'
    + '<radialGradient id="' + p + 'hp" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#D5DCEA"/></radialGradient>'
    + shadowFilter(p + 'hs', 0.8, 0.8) + '</defs>'
    + '<g filter="url(#' + p + 'hs)">'
    + '<path d="M3.5 15.5C4 9 8 3.2 14.5 2.6c3.6-.3 6.3 1.6 7.4 4.6-2.3-1.2-4.6-1-6 .4 1.6 2.5 2.1 5.5 1.9 8z" fill="url(#' + p + 'hr)"/>'
    + '<path d="M8 6.5c2-2 4.5-3 7-2.6" stroke="#fff" stroke-opacity=".35" stroke-width="1" stroke-linecap="round" fill="none"/>'
    + '<rect x="1.6" y="13.6" width="18.6" height="5" rx="2.5" fill="url(#' + p + 'hf)"/>'
    + '<g class="c-seasonal__pom"><circle cx="21.6" cy="8.4" r="2.6" fill="url(#' + p + 'hp)"/></g>'
    + '</g></svg>');
}

/* the plain logo node of each dressed title, kept while the season art stands in for it */
const plainMarks = new WeakMap();

/** Dress (or undress) ONE logotype title. Only a title topbar.js built as a logotype (`[data-logotype]`) is touched:
 *  the desktop bar's plain "Chats" title has no mark, so it never wears the art. Returns the season applied. */
export function applySeason(titleEl, season) {
  if (!titleEl || !titleEl.hasAttribute || !titleEl.hasAttribute('data-logotype')) return null;
  const want = season === 'halloween' || season === 'christmas' ? season : null;
  if ((titleEl.getAttribute('data-season') || null) === want) return want;
  // undress: the season nodes go, the plain mark comes back in front of the wordmark
  const keep = plainMarks.get(titleEl);
  for (const n of Array.from(titleEl.querySelectorAll('.c-seasonal__mark, .c-seasonal__pumpkin'))) n.remove();
  if (keep) {
    keep.hidden = false;
    if (keep.parentNode !== titleEl) titleEl.insertBefore(keep, titleEl.firstChild);
  }
  titleEl.removeAttribute('data-season');
  if (!want) return null;
  const logo = keep || titleEl.querySelector('.c-topbar__logo');
  if (!logo) return null;
  plainMarks.set(titleEl, logo);
  const p = 'sx' + (++seasonalSeq) + '-';
  /* the mark slot is a DIV, never a span: topbar.css gives every `.c-topbar__title > span` overflow:hidden + an
     ellipsis (the M16 title state), which would clip the hat; and home.html's title-state swap writes a span. */
  const wrap = document.createElement('div');
  wrap.className = 'c-seasonal__mark';
  wrap.setAttribute('aria-hidden', 'true');
  if (want === 'halloween') {
    logo.remove();
    wrap.append(jackMark(p));
    titleEl.insertBefore(wrap, titleEl.firstChild);
    const word = titleEl.querySelector('.c-topbar__word');
    const pk = pumpkin(p);
    if (word && word.nextSibling) titleEl.insertBefore(pk, word.nextSibling);
    else titleEl.append(pk);
  } else {
    titleEl.insertBefore(wrap, logo);
    wrap.append(logo, santaHat(p));
  }
  titleEl.setAttribute('data-season', want);
  return want;
}

export const SEASON_CHECK_MS = 60000;
/* ★ S11 A2 (#1263, R2-m3): the light runs ~20 s per arming (seasonal.css: finite cycles, then the frame holds) and is
   re-armed at most once per this interval — on resume or the minute check. A NEW season arms at once. */
export const SEASON_REARM_MS = 10 * 60 * 1000;
export const SEASON_SCROLL_IDLE_MS = 200;

/** Keep a top bar's logotype in season: now, on resume and once a minute. `now` overrides the clock (tests).
 *  `scroller` (optional): the list under the bar — the light holds while it scrolls (★ S11 A2, #1263). */
export function attachSeasonal(topbarEl, { now, scroller } = {}) {
  const title = topbarEl && topbarEl.querySelector('.c-topbar__title[data-logotype]');
  if (!title) return () => {};
  const read = () => {
    try {
      const hook = typeof window === 'object' && window.Spixi && window.Spixi.__seasonNow;   // demo / pin hook only
      if (typeof hook === 'function') return hook();
    } catch (e) { /* fall through to the clock */ }
    return now ? now() : new Date();
  };
  /* the arming clock is the PLAIN clock (Date.now), never the season hook: a frozen demo "now" must not freeze the
     re-arm floor, and the floor is about the device's real minutes */
  let armedAt = 0;
  const arm = (fresh) => {
    if (!title.hasAttribute('data-season')) { title.removeAttribute('data-season-live'); return; }
    const t = Date.now();
    if (!fresh && armedAt && t - armedAt >= 0 && t - armedAt < SEASON_REARM_MS) return;
    armedAt = t;
    title.removeAttribute('data-season-live');
    void title.offsetWidth;            // one style pass without the rule, so re-adding it RESTARTS the cycles
    title.setAttribute('data-season-live', '');
  };
  const check = () => {
    try {
      const before = title.getAttribute('data-season');
      const after = applySeason(title, seasonFor(read()));
      arm(after !== before);
    } catch (e) { /* art must never break the bar */ }
  };
  const onVis = () => { if (!document.hidden) check(); };
  /* the light holds while the list under the bar scrolls (a passive listener; one attribute write per burst) */
  let scrollT = 0;
  const onScroll = () => {
    if (!title.hasAttribute('data-season-live')) return;
    if (!scrollT) title.setAttribute('data-season-pause', '');
    clearTimeout(scrollT);
    scrollT = setTimeout(() => { scrollT = 0; title.removeAttribute('data-season-pause'); }, SEASON_SCROLL_IDLE_MS);
  };
  check();
  document.addEventListener('visibilitychange', onVis);
  if (scroller && scroller.addEventListener) scroller.addEventListener('scroll', onScroll, { passive: true });
  const timer = setInterval(check, SEASON_CHECK_MS);
  return function detachSeasonal() {
    clearInterval(timer);
    clearTimeout(scrollT);
    document.removeEventListener('visibilitychange', onVis);
    if (scroller && scroller.removeEventListener) scroller.removeEventListener('scroll', onScroll);
  };
}
