/**
 * flags — the language list, and the flag beside each row.
 *
 * ★ L15 (Damir, 2026-08-31): "Windows - Account - Language - no flags shown, just
 * country abbreviations. on phone the flags are shown."
 *
 * VERIFIED AT SOURCE. The rows were built from a REGIONAL-INDICATOR PAIR — 🇺🇸 is
 * U+1F1FA U+1F1F8, two letters a FONT is expected to substitute with one flag glyph.
 * Android and iOS ship those substitutions. Windows ships no colour flag glyph at all,
 * so WebView2 draws the two letters it was given: "US", "CO", "DE". Same shell, same
 * dictionary, same code path — the difference was never logic, it was a font.
 *
 * ★★ SO THE EMOJI STAYS WHERE IT WORKS. Damir, on seeing a drawn-SVG replacement:
 * "can we use damn emojis" · "do we keep the emojis on mobile right, as they are
 * perfect." They are, and they are the platform's own artwork — better than anything
 * we would ship, and free. The fallback is only for platforms that cannot draw one.
 *
 * ⚠ AND THE TEST IS NOT "IS THIS DESKTOP". macOS has colour flag emoji; only Windows
 * does not. `data-desktop` would have given a Mac the fallback for no reason and would
 * be wrong again the day a platform changes. `flagGlyphAvailable()` below asks the
 * question that actually matters — can this device paint one — once, on a canvas.
 *
 * ★ THE FALLBACK IS DAMIR'S OWN ASSET. `Spixi/Resources/Raw/html/img/flags/*.png` has
 * shipped with the app since the legacy build and nothing in the redesign referenced it.
 * Thirteen 40px PNGs, already in the APK, already his — no new dependency, no licence
 * question, and they are the flags this product has always used.
 * ⚠ The set had `gb.png` and no `us.png`; `us.png` was added at the same size so the
 * en-us row shows the SAME country on both paths. A row that is 🇺🇸 on a phone and a
 * Union Jack on Windows would be a worse bug than the one this row fixes.
 *
 * ★ ONE LIST. `launch-shell.js` used to carry a second copy of the same thirteen
 * languages, and its own comment admitted the hazard: "keep the two in sync BY HAND".
 * Both pickers, both demos and the welcome pill read LANGUAGES from here now, so a
 * language, a label or a flag is added once and cannot be added to only one of them.
 */

/* Where the fallback PNGs live, relative to the document. The shells are generated
 * INTO the folder that contains `img/`, so the default is right for every one of them.
 * The demos live in src/demo/ and call setFlagBase() once — they are the only reason
 * this is a variable rather than a constant. */
let FLAG_BASE = 'img/flags/';

/** Point the fallback at another folder (demo pages only). */
export function setFlagBase(path) {
  FLAG_BASE = String(path || '');
}

/**
 * The emoji for a two-letter country code, DERIVED rather than listed.
 *
 * A regional-indicator symbol is just the letter offset into U+1F1E6, so 'us' becomes
 * U+1F1FA U+1F1F8. ⚠ Deriving it is the point: a second hand-written table of thirteen
 * emoji would be one more place for a row to disagree with its own flag, which is the
 * defect that put the language list in two files in the first place.
 *
 * @param {string} code  'us', 'de', … (case-insensitive)
 * @returns {string} the two-code-point pair, or '' for anything that is not two letters
 */
export function flagEmoji(code) {
  const c = String(code || '').toLowerCase();
  if (!/^[a-z]{2}$/.test(c)) return '';
  return String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 97)
    + String.fromCodePoint(0x1F1E6 + c.charCodeAt(1) - 97);
}

let glyphSupport = null;   // null = not asked yet

/**
 * Can this device actually PAINT a flag emoji?
 *
 * Draws one on a 16px canvas and looks for colour. A real flag glyph paints red and
 * blue; a missing one paints two black letters in the fill colour, so every pixel is
 * neutral. That is the whole test, and it asks the device rather than guessing from a
 * user-agent string.
 *
 * ⚠ FAIL-SAFE IS THE PNG. No canvas, a blocked getImageData, a thrown anything — the
 * answer is false and the row gets the asset, which works everywhere. The failure mode
 * of a wrong `true` is Damir's original bug; the failure mode of a wrong `false` is a
 * correct flag from a slightly different set. Those are not the same size of mistake.
 *
 * Asked once and cached: it cannot change while the document is alive.
 */
/* ★ Session Z (#46 loop, auditor B-4): the PNG's fail-safe and the FONT's fail-safe point in
 * OPPOSITE directions. For the picker a `false` the probe could not earn (no canvas, a
 * blocked getImageData, a throw) is the safe side — a PNG works everywhere. For the font it
 * is the UNSAFE side: it would replace a phone's native flags with Twemoji, the one thing
 * Damir forbade. So the probe records whether it actually RAN and ANSWERED ('yes' | 'no'),
 * or could not ('unknown'), and installFlagFont installs only on a real 'no'. */
let probeState = 'unknown';   // 'yes' | 'no' | 'unknown' — what the canvas actually said
export function flagGlyphAvailable() {
  if (glyphSupport !== null) return glyphSupport;
  glyphSupport = false;
  probeState = 'unknown';
  try {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const ctx = c.getContext && c.getContext('2d');
    if (!ctx) return glyphSupport;
    ctx.textBaseline = 'top';
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText(flagEmoji('us'), 0, 0);
    const d = ctx.getImageData(0, 0, 16, 16).data;
    /* ★ #46 loop (reviewer MINOR-5): an ANSWER needs paint. A buffer with no opaque pixel
       at all (nothing drawn — a neutered getImageData, a font not yet resolved) is 'unknown',
       not 'no': the letters a flagless font draws ARE opaque, so a real "no" always has ink. */
    let painted = false;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 32) painted = true;
      // opaque AND not grey — a letter drawn in #000 can never satisfy both
      if (d[i + 3] > 32 && (Math.abs(d[i] - d[i + 1]) > 24 || Math.abs(d[i + 1] - d[i + 2]) > 24)) {
        glyphSupport = true;
        probeState = 'yes';
        break;
      }
    }
    if (!glyphSupport) probeState = painted ? 'no' : 'unknown';
  } catch (e) {
    glyphSupport = false;   // see the docblock: the asset is the safe answer
    probeState = 'unknown';
  }
  return glyphSupport;
}

/** Test seam — the pins drive both paths without a real canvas. `null` re-arms the probe;
 * a boolean is an ANSWERED probe ('yes'/'no'); `'unknown'` is a probe that could not run. */
export function setFlagGlyphAvailable(v) {
  if (v === null) { glyphSupport = null; probeState = 'unknown'; return; }
  if (v === 'unknown') { glyphSupport = false; probeState = 'unknown'; return; }
  glyphSupport = !!v;
  probeState = glyphSupport ? 'yes' : 'no';
}

/* ★★ L15b / Session Z (Damir, Windows: "🇸🇮 renders as the letters SI, Slack shows the
 * flag" — `docs/flags-on-windows-brief.md`). THE FLAG FONT.
 *
 * Segoe UI Emoji ships NO flag glyphs (Microsoft's stance on disputed territories), and a
 * flag is two regional-indicator characters (U+1F1E6–1F1FF) a font is expected to
 * substitute with one glyph — so every Chromium app on Windows, WebView2 included, draws
 * the two letters. The picker already falls back to Damir's PNGs (createFlag); a flag in
 * a MESSAGE, a nick or a group name has no PNG to fall back to. The fix is the one Slack
 * and the TalkJS polyfill use: a flags-only subset of Twemoji as one woff2 (~78 KB,
 * CC-BY 4.0 — the notice is in docs/legal/third-party-notices.md + ASSET_CREDITS).
 *
 * ★ HOW IT STAYS OUT OF THE WAY, BY MECHANISM:
 *   · `unicode-range` is a hard filter — the browser consults this face ONLY for the 26
 *     regional-indicator code points. No face, hand, object or letter lives there, so
 *     every other emoji stays the platform's own. ⚠ The subset's cmap also carries
 *     U+1F3F4 (the black flag) and the tag characters the three sub-national flags are
 *     spelled with; they are deliberately NOT in the range (#46 loop, auditor B-2):
 *     U+1F3F4 is also the base of the pirate flag 🏴‍☠️ (U+1F3F4 ZWJ U+2620), and a face that
 *     owns the base but not the skull would split that sequence into two glyphs. England,
 *     Scotland and Wales therefore fall back WHOLE to the platform (the pre-existing
 *     behaviour), instead of half of them.
 *   · The family is prepended to the UI stack ONLY under `:root[data-flag-font]`
 *     (tokens.css), and that attribute is set ONLY when the canvas probe RAN and said this
 *     device cannot paint a flag — the SAME probe the picker's PNG fallback uses (#215: one
 *     question, one answer, two consumers), with one difference: a probe that could not
 *     run installs NOTHING (a phone keeps its native flags — the safe side for a font is
 *     the opposite of the safe side for a PNG). A phone or a Mac never carries the
 *     attribute, so the family is never in its stack and nothing is fetched.
 *   · ★★ THE PAYLOAD TRAVELS AS A SCRIPT, NOT AS A FONT URL (#46 loop, auditor B-1). The
 *     shells load from `file://` on every platform (Windows: `Documents\Spixi\html\ll_*`),
 *     and a `@font-face url()` fetch is a CORS request — Chromium serialises a file:
 *     document's origin as `null` and a file: response carries no ACAO header, so the
 *     fetch is REFUSED unless the embedder opts in (Android's `AllowFileAccessFromFileURLs`;
 *     WebView2 has no such switch in this app). A CLASSIC `<script src>` from file:// is not
 *     CORS-checked, and a `data:` URL is CORS-exempt on every engine: so build-shells emits
 *     `fonts/TwemojiCountryFlags.js` (the woff2 as `window.__spixiFlagFont = 'data:…'`),
 *     installFlagFont injects THAT script on demand, and the @font-face reads the data URL.
 *     Nothing is inlined into a shell (78 KB → 104 KB base64 would spend the #345 ceilings
 *     on two platforms that never use it) and nothing is fetched on a phone.
 *   · `font-display: swap` — a flag that lands late repaints; nothing waits on it.
 * ⚠ What a container cannot prove: that WebView2 honours a bundled @font-face for
 * regional-indicator pairs before falling back to Segoe. Chrome and Edge do (the
 * polyfill exists because they do) and WebView2 is the same engine; the walk row on
 * Damir's Windows machine is the verification (brief §5 step 1). */
export const FLAG_FONT_FAMILY = 'Twemoji Country Flags';
export const FLAG_FONT_SCRIPT = 'fonts/TwemojiCountryFlags.js';   // built by build-shells from src/assets/fonts/TwemojiCountryFlags.woff2
export const FLAG_FONT_GLOBAL = '__spixiFlagFont';                 // the data: URL the script assigns
/* exactly the 26 regional indicators — see the docblock for why U+1F3F4 and the tag block are OUT */
export const FLAG_FONT_RANGE = 'U+1F1E6-1F1FF';
const FLAG_FONT_STYLE_ID = 'spixi-flag-font';
let flagFontInstalled = false;   // true once the face is in the document (createFlag reads it)

function injectFlagFace(dataUrl) {
  if (!document.getElementById(FLAG_FONT_STYLE_ID)) {
    const st = document.createElement('style');
    st.id = FLAG_FONT_STYLE_ID;
    st.textContent = '@font-face{font-family:"' + FLAG_FONT_FAMILY + '";unicode-range:' + FLAG_FONT_RANGE
      + ";src:url('" + dataUrl + "') format('woff2');font-display:swap;}";
    (document.head || document.documentElement).append(st);
  }
  document.documentElement.setAttribute('data-flag-font', '');
  flagFontInstalled = true;
  /* ★ #46 loop (reviewer MAJOR-1): ONE artwork per platform, from the FIRST screen. The
     install resolves a few ms after the shell's first synchronous render, so a picker or the
     welcome pill drawn in that window already holds a PNG; upgrade every one in place, so no
     document shows Damir's flat PNG on one row and Twemoji on the next. The code is the PNG's
     own filename (createFlag wrote `<base>/<code>.png`). Rows built after this point take the
     emoji path in createFlag directly. */
  try {
    for (const img of document.querySelectorAll('img.c-flag--img')) {
      const m = /([a-z]{2})\.png(?:[?#].*)?$/i.exec(img.getAttribute('src') || '');
      if (!m) continue;
      const span = createFlag(m[1].toLowerCase());
      if (span && span.classList.contains('c-flag--emoji')) img.replaceWith(span);
    }
  } catch (e) { /* an upgrade that fails leaves the PNG — never a hole */ }
}

/**
 * Install the flag font on a device whose probe RAN and said it cannot paint a flag; a
 * no-op everywhere else (a probe that could not run installs nothing). Idempotent: one
 * script, one style element, one attribute. Resolves true when the face is in the document.
 * Called once per shell right after the bundle loads, before the first paint that could
 * carry a flag (the picker, a nick, a message).
 */
export function installFlagFont() {
  try {
    if (typeof document === 'undefined' || !document.documentElement) return Promise.resolve(false);
    if (flagGlyphAvailable() || probeState !== 'no') return Promise.resolve(false);
    if (flagFontInstalled) return Promise.resolve(true);
    const w = typeof window !== 'undefined' ? window : globalThis;
    if (typeof w[FLAG_FONT_GLOBAL] === 'string' && w[FLAG_FONT_GLOBAL].startsWith('data:')) {
      injectFlagFace(w[FLAG_FONT_GLOBAL]);
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      /* ★ #46 loop (reviewer NIT-13): a script tag left by a call that did NOT yield the payload
         (loaded, but the global was absent/malformed) is removed and re-injected, so `load` can
         fire again and no promise waits on an event that already happened. */
      const stale = document.querySelector('script[data-spixi-flag-font]');
      if (stale) stale.remove();
      const sc = document.createElement('script');
      sc.setAttribute('data-spixi-flag-font', '');
      sc.src = FLAG_FONT_SCRIPT;
      const done = () => {
        try {
          const v = w[FLAG_FONT_GLOBAL];
          if (typeof v === 'string' && v.startsWith('data:')) { injectFlagFace(v); resolve(true); } else resolve(false);
        } catch (e) { resolve(false); }
      };
      sc.addEventListener('load', done, { once: true });
      sc.addEventListener('error', () => resolve(false), { once: true });   // a missing file leaves the platform's own rendering
      (document.head || document.documentElement).append(sc);
    });
  } catch (e) {
    return Promise.resolve(false);   // a probe or DOM failure leaves the platform's own rendering — the safe side
  }
}

/** Is the flag FONT in this document? (the picker reads it — one artwork per platform) */
export function isFlagFontInstalled() { return flagFontInstalled; }

/**
 * Build the flag for one row.
 *
 * ★ ONE function, so the emoji/asset decision exists in ONE place. The picker row and
 * the welcome pill both call it; an earlier cut had the pill rendering its flag its own
 * way, which is how it kept an emoji through a batch that was removing them.
 *
 * @param {string} code  a two-letter country code, or '' for "no flag"
 * @returns {HTMLElement|null}  null means DRAW NOTHING — the honest answer for the
 *   unknown-locale fallback row, which has no country. The caller still renders the
 *   slot so the row stays aligned.
 */
export function createFlag(code) {
  const c = String(code || '').toLowerCase();
  /* ⚠ Membership, NOT shape. A first cut tested /^[a-z]{2}$/ and happily built
   * `img/flags/zz.png` for any two letters — a broken image icon in the picker for a
   * country we do not ship an asset for. The emoji path would have drawn a real flag
   * for the same code, so the two paths would have disagreed about whether the row has
   * a flag at all. The list is the authority on both. */
  if (KNOWN.indexOf(c) < 0) return null;
  /* ★ Session Z (#46 loop, auditor B-3): ONE artwork per platform. Once the flag FONT is in
     the document (Windows), the picker draws the emoji span too, so a row in the picker and
     the same country in a message are the same Twemoji glyph; the PNG stays the path for a
     device with neither native flags nor the font (a probe that could not run, or a missing
     payload). Damir's PNGs are not retired — they are the last rung. */
  if (flagGlyphAvailable() || flagFontInstalled) {
    const s = document.createElement('span');
    s.className = 'c-flag c-flag--emoji';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = flagEmoji(c);
    return s;
  }
  const img = document.createElement('img');
  img.className = 'c-flag c-flag--img';
  img.setAttribute('aria-hidden', 'true');
  img.setAttribute('alt', '');
  /* Decorative and never blocking: if the asset is missing the row still reads, because
   * the LABEL is the name of the language, in that language. */
  img.setAttribute('loading', 'lazy');
  img.src = FLAG_BASE + c + '.png';
  return img;
}

/**
 * ★ THE ONE language list. Both pickers, both demos and the welcome pill read it.
 *
 * `flag` is a two-letter COUNTRY code — which is not always the locale's second half:
 * sr-sp is written with the rs flag, and the emoji and the PNG both derive from this
 * one field so the two paths can never show different countries.
 *
 * A locale whose dictionary has not landed is not listed here at all (build-locales.mjs
 * owns that gate, N4/#379) — hiding it is what stops a tap silently moving someone off
 * their own language.
 */
export const LANGUAGES = [
  { code: 'en-us', label: 'English', flag: 'us' },
  { code: 'es-co', label: 'Español', flag: 'co' },
  { code: 'de-de', label: 'Deutsch', flag: 'de' },
  { code: 'fr-fr', label: 'Français', flag: 'fr' },
  { code: 'pt-br', label: 'Português (Brasil)', flag: 'br' },
  { code: 'ru-ru', label: 'Русский', flag: 'ru' },
  { code: 'sl-si', label: 'Slovenščina', flag: 'si' },
  { code: 'sr-sp', label: 'Srpski', flag: 'rs' },   // ⚠ locale sr-sp, flag rs — they differ
  { code: 'it-it', label: 'Italiano', flag: 'it' },
  { code: 'id-id', label: 'Bahasa Indonesia', flag: 'id' },
  { code: 'lt-lt', label: 'Lietuvių', flag: 'lt' },
  { code: 'cn-cn', label: '中文', flag: 'cn' },
  { code: 'ja-jp', label: '日本語', flag: 'jp' },
];

/** Every country code the list uses — the pins enumerate this, never a hand list. */
export const FLAG_CODES = LANGUAGES.map((l) => l.flag);
/* The set createFlag is allowed to draw. Derived from the ONE list, so a code we do not
 * ship an asset for cannot be requested down either path. Declared after LANGUAGES and
 * read only at call time, which is why createFlag above can close over it. */
const KNOWN = FLAG_CODES;
