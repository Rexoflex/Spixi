/* ==== #1357 (Damir 2026-10-12 15:03) — the four-point SPARKLE is gone from the illustration set ====
 * Why: a white four-point star (in a violet tile) reads as the Gemini / generic "AI" mark, and the set drew it in 28
 * drawings (~90 uses) plus the Contributors chip-tap burst. Damir's pick on the render "Spixi Sparkle Swap"
 * (docs/renders/sparkle-swap): tile glyph = B Rocket · twinkles = 1 Bokeh dots · coin face = Shine bars. Ported into src
 * permanently (docs/renders/sparkle-swap/PORT.md). Reads SOURCE (the art table exactly as illustrations.js builds it:
 * IL_ART evaluated out of illustrations.js + S17_ART + momentAiEntry at several greeting lengths; settings-app.css):
 *  (a) no drawing carries the cubic sparkle path (M0-6.5C…) or a quadratic four-point star (4 Q segments around one
 *      centre — the old Contributors heart twinkles), and the chip burst is a round dot, not a clip-path star;
 *  (b) the 4 tile scenes draw the rocket (one, at the tile centre, no companion star) and the 6 coin scenes the shine bars;
 *  (c) every <use href> / url(#) resolves inside its own body, ids unique per body;
 *  (d) every decorative twinkle kept its motion class (il-tw / rn-tw / mo-tw / ct-tw) and its --i, per drawing count.
 * Deliberate breaks run (each on a scratch copy of the root, 0 fails unbroken): the old appsEmpty body back →
 * (a) + (b) + (d) fail naming appsEmpty; `class="il-tw"` dropped from one welcome2 twinkle → (d) fails
 * naming welcome2; the clip-path polygon back in .c-settings-contrib__spark → the spark check fails; a second rocket
 * <use> in welcome4 → (b) fails naming welcome4; moPay's coin <use> pointed at the old #mpaSp@@ → (b) + (c) fail naming moPay. */
export default async function (h) {
  const { ok, readFileSync, join, root } = h;
  const s17 = await import('file://' + join(root, 'src/components/illustrations-s17.js'));
  const ilSrc = readFileSync(join(root, 'src/components/illustrations.js'), 'utf8');
  const a0 = ilSrc.indexOf('const IL_ART = {');
  const a1 = ilSrc.indexOf('\n};', a0);
  // eslint-disable-next-line no-eval
  const ART = (0, eval)('(' + ilSrc.slice(a0 + 15, a1 + 2) + ')');
  Object.assign(ART, s17.S17_ART);
  for (const n of [0, 4, 12, 40]) ART['moAi#' + n] = s17.momentAiEntry(n);
  const names = Object.keys(ART);

  /* (a) no four-point sparkle anywhere in the art, and none in the chip burst */
  const quadStar = (d) => {
    const q = [...d.matchAll(/Q(-?[\d.]+)[ ,](-?[\d.]+)/g)].map((m) => m[1] + ',' + m[2]);
    return q.length === 4 && new Set(q).size === 1;
  };
  const withSparkle = names.filter((k) => /M0-6\.5C/.test(ART[k].b) || [...ART[k].b.matchAll(/ d="([^"]*)"/g)].some((m) => quadStar(m[1])));
  ok(names.length >= 40 && withSparkle.length === 0,
    '★ #1357 (Damir 15:03): no drawing of the illustration set draws the four-point sparkle (the Gemini / AI mark) — ' + names.length + ' drawings · still there: ' + (withSparkle.join(', ') || 'none'));
  const css = readFileSync(join(root, 'src/styles/components/settings-app.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const spark = (/\.c-settings-contrib__spark\s*\{([^}]*)\}/.exec(css) || [, ''])[1];
  ok(/border-radius:\s*50%/.test(spark) && !/clip-path/.test(spark) && /animation:\s*ct-spark/.test(spark) && /width:\s*6px/.test(spark),
    '★ #1357: the Contributors chip-tap burst (.c-settings-contrib__spark) throws round dots — no clip-path star, same 6 px, same ct-spark motion');

  /* (b) the content glyphs: rocket in the violet tiles, shine bars on the gold coin */
  const ROCKET = 'M12 2.2C15.6 4.6 17.2 8.6 17.2 13.2V16.4H6.8V13.2C6.8 8.6 8.4 4.6 12 2.2Z';
  const SHINE = '<g transform="translate(-.9 0) rotate(-40)"><rect x="-1.6" y="-5.4" width="3.2" height="10.8" rx="1.6"/>';
  const glyphUses = (b, mark) => {
    const ids = [...b.matchAll(/<g id="([^"]+)"[^>]*>/g)].filter((m) => b.slice(m.index, m.index + 600).includes(mark)).map((m) => m[1]);
    return ids.length === 1 ? [...b.matchAll(new RegExp('<use href="#' + ids[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"([^>]*)/>', 'g'))].map((m) => m[1]) : null;
  };
  const TILE = { appsEmpty: 'translate(26 26) scale(2.2)', welcome4: 'translate(24 24) scale(1.9)', explore: 'translate(23 23) scale(2)', welcome3: 'translate(124 124) scale(1.27)' };
  const tileBad = Object.keys(TILE).filter((k) => { const u = glyphUses(ART[k].b, ROCKET); return !u || u.length !== 1 || u[0].indexOf('transform="' + TILE[k] + '" fill="#fff"') < 0; });
  ok(tileBad.length === 0, '★ #1357: the 4 violet tile / disc scenes (Apps empty, Welcome 4, Explore, Welcome 3) draw ONE white rocket at the tile centre, no companion star — wrong: ' + (tileBad.join(', ') || 'none'));
  const COIN = ['backup', 'walletEmptyA', 'walletEmptyB', 'aboutGlassFg', 'moFirstixi', 'moPay'];
  const coinBad = COIN.filter((k) => { const u = glyphUses(ART[k].b, SHINE); return !u || u.length !== 1 || !/transform="[^"]+"/.test(u[0]); });
  ok(coinBad.length === 0, '★ #1357: the 6 gold-coin scenes (Backup, Wallet A / B, About, First IXI, Pay) carry the shine bars as the coin face — wrong: ' + (coinBad.join(', ') || 'none'));
  const glyphElsewhere = names.filter((k) => !(k in TILE) && ART[k].b.includes(ROCKET));
  ok(glyphElsewhere.length === 0, '★ #1357: the tile rocket is only in the tile scenes — also in: ' + (glyphElsewhere.join(', ') || 'none'));

  /* (c) every reference resolves inside its own body (ids are per call: @@ → -i<n>) */
  const unresolved = [];
  for (const k of names) {
    const b = ART[k].b;
    const ids = [...b.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    if (new Set(ids).size !== ids.length) unresolved.push(k + ' (duplicate id)');
    for (const m of b.matchAll(/href="#([^"]+)"|url\(#([^)]+)\)/g)) { const id = m[1] || m[2]; if (ids.indexOf(id) < 0) unresolved.push(k + ' → #' + id); }
  }
  ok(unresolved.length === 0, '★ #1357: every <use href> / url(#) of the art resolves to an id in its own drawing, ids unique — broken: ' + (unresolved.slice(0, 6).join(', ') || 'none'));

  /* (d) every decorative dot twinkles: the motion class (+ its --i) on the <use> or on the <g> that wraps it */
  const DOTS = { welcome1: 2, welcome2: 3, welcome3: 2, welcome4: 3, restore: 3, chatsEmpty: 3, contactsEmpty: 3, addContact: 3, appsEmpty: 3, explore: 2,
    backup: 3, rating: 3, walletEmptyA: 4, walletEmptyB: 4, wnHeroFg: 4, wnReplyFg: 3, wnVoiceFg: 3, wnPhotosFg: 3, wnPrivacyFg: 3, wnAppsFg: 3,
    moAutodl: 2, moFirstixi: 2, moMic: 2, moApp: 1, moAddr: 1 /* ★ S20I: the moApp grammar */, moPay: 2, heartBg: 6, 'moAi#0': 3, 'moAi#4': 3, 'moAi#12': 3, 'moAi#40': 3 };
  const MOTION = /class="(?:il-tw|rn-tw|mo-tw wn-loop|ct-tw wn-loop)" (?:[^>]*?)?style="[^"]*--i:\d/;
  const twBad = [];
  for (const k of names) {
    const b = ART[k].b;
    const uses = [...b.matchAll(/<use href="#[^"]*Dot@@"([^>]*)\/>/g)];
    const moving = uses.filter((m) => MOTION.test(m[1]) || MOTION.test((/<g [^>]*>$/.exec(b.slice(Math.max(0, m.index - 160), m.index)) || [''])[0]));
    if (uses.length !== (DOTS[k] || 0) || moving.length !== uses.length) twBad.push(k + ' ' + moving.length + '/' + uses.length + ' (want ' + (DOTS[k] || 0) + ')');
  }
  ok(twBad.length === 0, '★ #1357: every decorative twinkle became a bokeh dot and kept its motion class + --i (79 dots in 28 drawings — ★ S20I + moAddr; il-tw · rn-tw · mo-tw · ct-tw) — off: ' + (twBad.join(', ') || 'none'));
}
