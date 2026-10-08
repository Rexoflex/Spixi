/* ==== S11 A — item 1 (#1262): the seasonal Chats top bar, on the BUILT home shell (index.html) ====
 *   · seasonFor on the device's LOCAL clock, the 8 boundary instants (Damir's windows: Halloween [24 Oct 00:00,
 *     1 Nov 03:00) · Christmas [1 Dec 00:00, 2 Jan 00:00), across the year end);
 *   · an injected "now" (Spixi.__seasonNow + the resume event) dresses the mobile Chats logotype: C1 = the lantern
 *     mark + the pumpkin right AFTER the wordmark; X1 = the hat on the plain mark; out of season = the plain mark back;
 *     unique SVG ids per dressing; every piece of art aria-hidden + focusable=false; the desktop bar (no logotype) stays plain;
 *   · THE ELLIPSIS RULE SURVIVES: while a season is on, the WORD span still computes min-width 0 / overflow hidden /
 *     ellipsis / nowrap and the "Connecting…" title state still writes the word (the art stays); the title's own clip
 *     is released ONLY while it wears a season;
 *   · the CSS as built: reduced motion stops every animated piece; the theme half (shadow / halo) is tokens, light + dark.
 * ★ S11 A2 (#1263, R3-MAJOR-3 / MINOR-2): EVERY boot pins the clock (a-kit `now`) — this module never reads the real
 *   date, so it passes on 24 Oct as on 8 Oct; + 31 Oct 23:59 → Halloween and 31 Dec 23:59 → Christmas; a July boot is plain
 *   and a 31 Oct boot is dressed BY THE BOOT CHECK; the 60 s check is proved by firing the recorded setInterval(…, 60000)
 *   after moving the pinned clock (in AND out of a season).
 * ★ S11 A2 (#1263, R2-m3): the light is BOUNDED — finite cycles (~20 s) on [data-season-live], armed at a dressing,
 *   re-armed on resume / the minute check at most once per 10 min, paused while the Chats list scrolls.
 * Deliberate breaks: see the S11 A / A2 reports. */
import { aKit } from './a-kit.mjs';
export default async function (h) {
  const { ok, root, readFileSync, join, stripCssComments } = h;
  const K = aKit(h);
  let s = null;

  /* ── the pure rule: the 8 boundary instants ── */
  const JULY = new Date(2026, 6, 14, 12, 0).getTime();          // a plain day — the default pinned clock below
  const b = {};
  try {
    s = await K.boot('index.html', { now: JULY });
    const { W } = s;
    const at = (y, mo, d, hh, mm) => W.Spixi.seasonFor(new W.Date(y, mo, d, hh, mm));
    b.oct23_2359 = at(2026, 9, 23, 23, 59) === null;
    b.oct24_0000 = at(2026, 9, 24, 0, 0) === 'halloween';
    b.nov01_0259 = at(2026, 10, 1, 2, 59) === 'halloween';
    b.nov01_0300 = at(2026, 10, 1, 3, 0) === null;
    b.nov30_2359 = at(2026, 10, 30, 23, 59) === null;
    b.dec01_0000 = at(2026, 11, 1, 0, 0) === 'christmas';
    b.jan01_2359 = at(2027, 0, 1, 23, 59) === 'christmas';
    b.jan02_0000 = at(2027, 0, 2, 0, 0) === null;
    b.oct31_2359 = at(2026, 9, 31, 23, 59) === 'halloween';     // ★ S11 A2 (#1263)
    b.dec31_2359 = at(2026, 11, 31, 23, 59) === 'christmas';
    b.check60s = W.Spixi.SEASON_CHECK_MS === 60000;
  } catch (e) { b.err = e.message; }
  finally { if (s) { s.close(); s = null; } }
  ok(Object.values(b).every((x) => x === true),
    '★ S11 A item 1 (#1262): seasonFor on the LOCAL clock — 23 Oct 23:59 → none · 24 Oct 00:00 → Halloween · 31 Oct 23:59 → Halloween · 1 Nov 02:59 → Halloween · 1 Nov 03:00 → none · 30 Nov 23:59 → none · 1 Dec 00:00 → Christmas · 31 Dec 23:59 → Christmas · 1 Jan 23:59 → Christmas (the window spans the year end) · 2 Jan 00:00 → none; re-checked every 60 s — ' + JSON.stringify(b));

  /* ── the built shell: dress, connect, change season, undress ── */
  const r = {};
  try {
    s = await K.boot('index.html', { now: JULY });
    const { W, d } = s;
    const title = () => d.querySelector('#chats-topbar .c-topbar__title');
    const word = () => title().querySelector('.c-topbar__word');
    const cs = (el) => W.getComputedStyle(el);
    const artOk = (root) => [...root.querySelectorAll('.c-seasonal__mark, .c-seasonal__jack, .c-seasonal__hat, .c-seasonal__pumpkin')]
      .every((n) => n.getAttribute('aria-hidden') === 'true' && (n.tagName === 'DIV' || n.getAttribute('focusable') === 'false'));
    const ids = () => [...d.querySelectorAll('#chats-topbar [id]')].map((n) => n.id);
    r.bootPlain = !title().hasAttribute('data-season') && !!title().querySelector(':scope > .c-topbar__logo') && cs(title()).overflow === 'hidden';

    W.Spixi.__seasonNow = () => new W.Date(2026, 9, 31, 21, 0);   // Halloween night
    s.resume();
    const t = title();
    const kids = [...t.children];
    const wi = kids.indexOf(word());
    r.hwSeason = t.getAttribute('data-season') === 'halloween';
    r.hwMark = !!t.querySelector(':scope > div.c-seasonal__mark > svg.c-seasonal__jack') && !t.querySelector('.c-topbar__logo');
    r.hwPumpkinAfterWord = !!(wi > 0 && kids[wi + 1] && kids[wi + 1].classList.contains('c-seasonal__pumpkin') && kids[0].classList.contains('c-seasonal__mark'));
    r.hwArtHidden = artOk(t);
    const ids1 = ids();
    r.hwIdsUnique = ids1.length >= 7 && new Set(ids1).size === ids1.length && ids1.every((x) => /^sx\d+-/.test(x));
    r.hwRefsResolve = [...t.querySelectorAll('[fill^="url(#"], [filter^="url(#"], [clip-path^="url(#"]')]
      .every((n) => { const m = /url\(#([^)]+)\)/.exec(n.getAttribute('fill') || n.getAttribute('filter') || n.getAttribute('clip-path')); return m && t.querySelector('#' + m[1]); });
    /* the ellipsis rule, computed through the built cascade */
    const wcs = cs(word());
    r.wordClip = wcs.overflow === 'hidden' && wcs.textOverflow === 'ellipsis' && wcs.whiteSpace === 'nowrap' && wcs.minWidth === '0px';
    r.titleReleasedOnlyInSeason = cs(t).overflow === 'visible';
    r.markIsNotASpan = t.querySelector('.c-seasonal__mark').tagName === 'DIV';
    s.push('showWarning', 'Connecting to Ixian Platform...');
    await K.sleep(60);
    const wcs2 = cs(word());
    r.connWritesWord = t.hasAttribute('data-connecting') && /^Connecting/.test(word().textContent) && !!word().querySelector('.c-topbar__dots')
      && !!t.querySelector('.c-seasonal__jack') && !!t.querySelector('.c-seasonal__pumpkin');
    r.connStillClips = wcs2.overflow === 'hidden' && wcs2.textOverflow === 'ellipsis' && wcs2.whiteSpace === 'nowrap' && wcs2.minWidth === '0px';
    s.push('showWarning', '');
    await K.sleep(60);
    r.connCleared = !t.hasAttribute('data-connecting') && word().textContent === 'Spixi' && t.getAttribute('data-season') === 'halloween';

    /* two dressed bars in ONE document (a second root logotype bar, Halloween too): every id stays unique */
    const bar2 = W.Spixi.createTopbar({ variant: 'root', title: 'Spixi', logo: true });
    d.body.append(bar2);
    W.Spixi.applySeason(bar2.querySelector('.c-topbar__title'), 'halloween');
    const all = [...d.querySelectorAll('[id^="sx"]')].map((n) => n.id);
    r.twoBarsUnique = all.length >= 2 * ids1.length && new Set(all).size === all.length;
    bar2.remove();

    W.Spixi.__seasonNow = () => new W.Date(2026, 11, 24, 20, 0);   // Christmas Eve
    s.resume();
    r.xmSeason = t.getAttribute('data-season') === 'christmas';
    r.xmHatOnMark = !!t.querySelector(':scope > div.c-seasonal__mark > svg.c-topbar__logo + svg.c-seasonal__hat')
      && !t.querySelector('.c-seasonal__jack, .c-seasonal__pumpkin') && artOk(t);
    const ids2 = ids();
    r.xmIdsFresh = ids2.length > 0 && new Set(ids2).size === ids2.length && ids2.every((x) => !ids1.includes(x));

    W.Spixi.__seasonNow = () => new W.Date(2026, 6, 14, 12, 0);    // July
    s.resume();
    r.offPlain = !t.hasAttribute('data-season') && !!t.firstElementChild && t.firstElementChild.classList.contains('c-topbar__logo')
      && !t.querySelector('[class*="c-seasonal"]') && cs(t).overflow === 'hidden' && word().textContent === 'Spixi';
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = e.message; }
  finally { if (s) { s.close(); s = null; } }
  ok(Object.values(r).every((x) => x === true),
    '★ S11 A item 1 (#1262): the BUILT Chats bar follows an injected now on resume — Halloween = the lantern mark + the pumpkin right after the wordmark, Christmas = the hat on the plain mark, July = the plain mark back; SVG ids unique per dressing and every url(#…) resolves inside the bar; the art is aria-hidden; and the ELLIPSIS RULE SURVIVES: the word span keeps min-width 0 / overflow hidden / ellipsis / nowrap, "Connecting…" still writes the word with the art beside it, and the title\'s own clip is released only while a season is on — ' + JSON.stringify(r));

  /* ── the desktop bar: no logotype → no art ── */
  const dk = {};
  try {
    s = await K.boot('index.html', { desktop: true, now: new Date(2026, 9, 31, 21, 0).getTime() });
    const { W, d } = s;
    s.resume();
    const t = d.querySelector('#chats-topbar .c-topbar__title');
    dk.plain = !t.hasAttribute('data-logotype') && !t.hasAttribute('data-season') && !d.querySelector('#chats-topbar [class*="c-seasonal"]');
  } catch (e) { dk.err = e.message; }
  finally { if (s) { s.close(); s = null; } }
  ok(Object.values(dk).every((x) => x === true),
    '★ S11 A item 1 (#1262): the DESKTOP Chats bar (a plain "Chats" title — the brand mark lives on the rail) never wears the art — ' + JSON.stringify(dk));

  /* ── the CSS as built: reduced motion, the scoped release, the theme tokens ── */
  const c = {};
  const html = stripCssComments(readFileSync(join(root, 'Spixi/Resources/Raw/html/index.html'), 'utf8'));
  const tok = stripCssComments(readFileSync(join(root, 'Spixi/Resources/Raw/html/spixi.tokens.css'), 'utf8'));
  c.release = /\.c-topbar\[data-variant="root"\] \.c-topbar__title\[data-season\] \{ overflow: visible; \}/.test(html)
    && /\.c-topbar\[data-variant="root"\] \.c-topbar__title > span \{\s*min-width: 0;\s*overflow: hidden;\s*text-overflow: ellipsis;\s*white-space: nowrap;\s*\}/.test(html);
  /* ★ S11 A2 (#1263, R2-m3): reduced motion stops the four LIVE rules (same selectors, so it wins); every cycle count is
     finite (9 · 5 · 5 · 3 ≈ 20 s), `both` holds the last frame, the scroll pause rides animation-play-state */
  const P4 = ['face', 'inner', 'halo', 'pom'].map((n) => '\\.c-topbar__title\\[data-season-live\\] \\.c-seasonal__' + n);
  c.reduce = new RegExp('@media \\(prefers-reduced-motion: reduce\\) \\{\\s*' + P4.join(',\\s*') + ' \\{ animation: none; \\}\\s*\\}').test(html);
  const anims = html.match(/animation: seasonal-[a-z]+ [^;]*;/g) || [];
  c.onlyLightMoves = anims.length === 4 && !/@keyframes seasonal-[a-z]+ \{[^}]*(?:translate|rotate)/.test(html);
  c.bounded = anims.length === 4 && anims.every((a) => / (\d+) both;$/.test(a) && !/infinite/.test(a))
    && /seasonal-candle 2\.3s steps\(1, end\) 9 both;/.test(html) && /seasonal-inner 3\.7s ease-in-out 5 both;/.test(html)
    && /seasonal-halo 3\.7s ease-in-out 5 both;/.test(html) && /seasonal-twinkle 6s ease-in-out 3 both;/.test(html)
    && anims.every((a) => html.indexOf(a) > html.indexOf('.c-topbar__title[data-season-live]'));
  c.pause = /\.c-topbar__title\[data-season-pause\] \.c-seasonal__pom \{ animation-play-state: paused; \}/.test(html);
  c.innerRest = /\.c-seasonal__inner \{ opacity: 0\.35;/.test(html) && !/\.c-seasonal__jack \.c-seasonal__inner/.test(html);
  c.themeAsCss = /\.c-seasonal__flood \{ flood-color: var\(--seasonal-shadow\); flood-opacity: var\(--seasonal-shadow-alpha\); \}/.test(html)
    && /\.c-seasonal__halo \{ opacity: var\(--seasonal-halo\); \}/.test(html);
  const light = tok.slice(0, tok.indexOf('[data-theme="dark"] {'));
  const dark = tok.slice(tok.indexOf('[data-theme="dark"] {'));
  c.homeShellOnly = /\.c-seasonal__mark \{/.test(html) && !/c-seasonal__/.test(stripCssComments(readFileSync(join(root, 'Spixi/Resources/Raw/html/chat.html'), 'utf8')));
  c.tokens = /--seasonal-halo: 0;/.test(light) && /--seasonal-shadow: #8a3a00;/.test(light) && /--seasonal-halo: 0\.55;/.test(dark) && /--seasonal-shadow: #000000;/.test(dark);
  ok(Object.values(c).every((x) => x === true),
    '★ S11 A item 1 (#1262) + A2 (#1263): the built CSS — the title clip released ONLY under [data-season] while the word keeps its ellipsis; the four light pieces animate only under [data-season-live] with FINITE cycles (9·5·5·3, `both`), pause under [data-season-pause], and reduced motion stops all four (only light moves: no translate/rotate keyframes); one inner-glow rest value; the shadow + halo are CSS on tokens (light umber/no halo · dark black/lit halo); the art CSS ships in the home shell only — ' + JSON.stringify(c));

  /* ── ★ S11 A2 (#1263): the BOOT check and the 60 s check, on a pinned clock and a recorded setInterval ── */
  const k = {};
  try {
    s = await K.boot('index.html', { now: new Date(2026, 9, 31, 23, 58).getTime(), fakeIntervals: true });
    const { d } = s;
    const t = () => d.querySelector('#chats-topbar .c-topbar__title');
    k.bootDressed = t().getAttribute('data-season') === 'halloween' && !!t().querySelector('.c-seasonal__jack');   // no resume, no hook: the boot check
    const minute = s.intervals.filter((x) => x.ms === 60000);
    k.oneMinuteTimer = minute.length === 1;
    s.clock.set(new Date(2026, 10, 1, 2, 59).getTime());
    minute[0].fn();
    k.stillHalloween = t().getAttribute('data-season') === 'halloween';
    s.clock.set(new Date(2026, 10, 1, 3, 0).getTime());
    minute[0].fn();
    k.minuteUndresses = !t().hasAttribute('data-season') && !t().querySelector('[class*="c-seasonal"]') && !t().hasAttribute('data-season-live');
    s.clock.set(new Date(2026, 11, 1, 0, 0).getTime());
    minute[0].fn();
    k.minuteDressesChristmas = t().getAttribute('data-season') === 'christmas' && !!t().querySelector('.c-seasonal__hat');
    k.noErr = K.noErr(s.errs);
  } catch (e) { k.err = e.message; }
  finally { if (s) { s.close(); s = null; } }
  try {
    s = await K.boot('index.html', { now: JULY, fakeIntervals: true });
    const t = s.d.querySelector('#chats-topbar .c-topbar__title');
    k.julyBootPlain = !t.hasAttribute('data-season') && !!t.querySelector(':scope > .c-topbar__logo');
    s.clock.set(new Date(2026, 9, 24, 0, 0).getTime());
    const m = s.intervals.find((x) => x.ms === 60000);
    if (m) m.fn();
    k.minuteDressesHalloween = t.getAttribute('data-season') === 'halloween';
  } catch (e) { k.err2 = e.message; }
  finally { if (s) { s.close(); s = null; } }
  ok(Object.values(k).every((x) => x === true),
    '★ S11 A2 (#1263, R3-MAJOR-3): on a PINNED clock — a 31 Oct 23:58 boot is dressed by the boot check alone; ONE setInterval(…, 60000) re-checks: 1 Nov 02:59 still Halloween, 03:00 plain (art + live flag gone), 1 Dec 00:00 Christmas; a July boot is plain and the minute check dresses it on 24 Oct 00:00 — ' + JSON.stringify(k));

  /* ── ★ S11 A2 (#1263, R2-m3): the light is armed, re-armed at most once per 10 min, and pauses on scroll ── */
  const m = {};
  try {
    const T0 = new Date(2026, 9, 30, 20, 0).getTime();
    s = await K.boot('index.html', { now: T0, fakeIntervals: true });
    const { d, W } = s;
    const t = d.querySelector('#chats-topbar .c-topbar__title');
    let arms = 0;
    // an ARMING = the flag going from absent to present (a re-arm removes it, then adds it back)
    new W.MutationObserver((recs) => { for (const r0 of recs) if (r0.oldValue === null) arms += 1; })
      .observe(t, { attributes: true, attributeOldValue: true, attributeFilter: ['data-season-live'] });
    const minute = s.intervals.find((x) => x.ms === 60000);
    m.armedAtBoot = t.hasAttribute('data-season-live') && W.Spixi.SEASON_REARM_MS === 600000;
    s.clock.add(5 * 60 * 1000);
    s.resume();
    minute.fn();
    await K.sleep(10);
    m.noRearmInside10min = arms === 0 && t.hasAttribute('data-season-live');
    s.clock.add(5 * 60 * 1000 + 1);
    minute.fn();
    await K.sleep(10);
    m.rearmAfter10min = arms === 1;
    s.resume();
    await K.sleep(10);
    m.resumeRespectsFloor = arms === 1;
    s.clock.add(10 * 60 * 1000);
    s.resume();
    await K.sleep(10);
    m.resumeRearms = arms === 2;
    const sc = d.getElementById('chat-scroll');
    sc.dispatchEvent(new W.Event('scroll'));
    m.scrollPauses = t.hasAttribute('data-season-pause');
    await K.sleep(W.Spixi.SEASON_SCROLL_IDLE_MS + 80);
    m.scrollResumes = !t.hasAttribute('data-season-pause');
    s.clock.set(new Date(2026, 6, 1, 12, 0).getTime());
    minute.fn();
    sc.dispatchEvent(new W.Event('scroll'));
    m.plainNoLiveNoPause = !t.hasAttribute('data-season-live') && !t.hasAttribute('data-season-pause');
    m.noErr = K.noErr(s.errs);
  } catch (e) { m.err = e.message; }
  finally { if (s) { s.close(); s = null; } }
  ok(Object.values(m).every((x) => x === true),
    '★ S11 A2 (#1263, R2-m3): the seasonal light is BOUNDED — [data-season-live] is set when the art goes on; resume and the minute check re-arm it at most once per 10 min (5 min: nothing; 10 min + 1 ms: one re-arm; a resume inside the floor: nothing; another 10 min: the resume re-arms); a scroll of the Chats list sets [data-season-pause] and it clears after the scroll idles; out of season nothing is live or paused — ' + JSON.stringify(m));
}
