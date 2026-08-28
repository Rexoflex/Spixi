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
export function flagGlyphAvailable() {
  if (glyphSupport !== null) return glyphSupport;
  glyphSupport = false;
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
    for (let i = 0; i < d.length; i += 4) {
      // opaque AND not grey — a letter drawn in #000 can never satisfy both
      if (d[i + 3] > 32 && (Math.abs(d[i] - d[i + 1]) > 24 || Math.abs(d[i + 1] - d[i + 2]) > 24)) {
        glyphSupport = true;
        break;
      }
    }
  } catch (e) {
    glyphSupport = false;   // see the docblock: the asset is the safe answer
  }
  return glyphSupport;
}

/** Test seam — the pins drive both paths without a real canvas. */
export function setFlagGlyphAvailable(v) {
  glyphSupport = v === null ? null : !!v;
}

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
  if (flagGlyphAvailable()) {
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
