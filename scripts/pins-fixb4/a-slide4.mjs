/* ==== fixb4 · item 1 — WELCOME SLIDE 4 names Blitz Chess only (Damir's ruling #1747 (1)) ====
 * The ruling: slide 4 reads "Mini apps like Blitz Chess open right in your chats." in all 14 locales and in the fallback of
 * src/components/launch-shell.js. Split does not ship in v0.9.30 and is not named; Tic-tac-toe neither.
 * The key was RENAMED slide4Copy2 -> slide4Copy3 (the precedent of a43dd4c5, Copy -> Copy2): a locale that missed the new
 * draft cannot keep the old Split value under the same key — it falls back to English and build-locales --check (GATE 51) /
 * row (b) below see it.
 *
 * LIMITS (#1735 — stated, not hidden):
 *   (a) (b) (e) read the GENERATED dictionaries src/strings/<code>.json and the built Spixi/Resources/Raw/html files as TEXT.
 *       They prove the text that is shipped, not that a device paints it: that is (d).
 *   (c) is a SOURCE row: it reads the text of launch-shell.js. It proves the fallback literal equals the en-us value; it does
 *       not execute the fallback (the built shell always has a dictionary, so the literal is the path for a missing key only).
 *       What it does not catch: the literal rewritten across a concatenation, or a second copy of the sentence elsewhere in
 *       launch-shell.js (the whole-file scan of (c2) looks for "Blitz Chess and Split" anywhere in it).
 *   (d) EXECUTED: the BUILT intro.html in jsdom (pins-on1 kit), once per locale through ?lang=<code>. It reads the painted
 *       slide texts. It does NOT see a real WebView, the autoplay or the carousel position, nor a locale a C# language file
 *       selects another way. The scan covers the four welcome slides + the version line, not the rest of the shell.
 *   (e) scans every locale dictionary value and the three built files for "Blitz Chess" within 24 characters of "Split"
 *       (any language's "and/und/y/…" between them); it cannot see a Split named with no Blitz Chess nearby — (b) and (d)
 *       cover slide 4 itself.
 * Deliberate breaks (fixb4 report): ① "and Split" put back into the de-de draft + rebuilt dictionary; ② the launch-shell.js
 *   fallback back to the old sentence; ③ the key back to slide4Copy2 in the shell; ④ ja-jp dictionary value given "Tic-tac-toe". */
import { on1Kit } from '../pins-on1/kit.mjs';
const LOCALES = ['en-us', 'de-de', 'es-co', 'fr-fr', 'sr-sp', 'sl-si', 'ru-ru', 'pt-br', 'it-it', 'id-id', 'lt-lt', 'cn-cn', 'ja-jp', 'sq-al'];
const KEY = 'slide4Copy3';
const RULING = 'Mini apps like Blitz Chess open right in your chats.';
const NO_SPLIT = /Split/i;
const NO_TTT = /Tic-?\s?tac-?\s?toe/i;
const NEAR = /Blitz Chess[^.\n]{0,24}Split|Split[^.\n]{0,24}Blitz Chess/i;
export default async function (h) {
  const { ok, root, readFileSync, join } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const dict = {};
  for (const c of LOCALES) dict[c] = JSON.parse(rd(`src/strings/${c}.json`));

  /* (a) the en-us value is the ruling's sentence, exactly; the retired key is gone */
  ok(dict['en-us'][KEY] === RULING && !('slide4Copy2' in dict['en-us']),
    `fixb4 1 (a): en-us ${KEY} === the ruling's sentence "${RULING}" and the retired slide4Copy2 is gone from en-us — got ${JSON.stringify(dict['en-us'][KEY])}`);

  /* (b) all 14 locales: the key exists, non-empty, names Blitz Chess, no Split, no Tic-tac-toe; the retired key is gone */
  const bad = [];
  for (const c of LOCALES) {
    const v = dict[c][KEY];
    if (typeof v !== 'string' || !v.trim()) { bad.push(`${c}: missing/empty`); continue; }
    if (!v.includes('Blitz Chess')) bad.push(`${c}: no "Blitz Chess" in ${JSON.stringify(v)}`);
    if (NO_SPLIT.test(v)) bad.push(`${c}: names Split in ${JSON.stringify(v)}`);
    if (NO_TTT.test(v)) bad.push(`${c}: names Tic-tac-toe in ${JSON.stringify(v)}`);
    if ('slide4Copy2' in dict[c]) bad.push(`${c}: the retired slide4Copy2 is still in the dictionary`);
    if (c !== 'en-us' && v === RULING) bad.push(`${c}: still the English sentence (never drafted)`);
  }
  ok(bad.length === 0, `fixb4 1 (b): the 14 dictionaries all carry ${KEY}: non-empty, "Blitz Chess", no Split, no Tic-tac-toe, a translation (not the English) outside en-us — ${JSON.stringify(bad)}`);

  /* (c) source row: the fallback literal in launch-shell.js === the en-us value */
  const src = rd('src/components/launch-shell.js');
  const m = /copy:\s*strings\.(\w+)\s*\|\|\s*'([^']*)'/g;
  const copies = []; let mm;
  while ((mm = m.exec(src))) copies.push([mm[1], mm[2]]);
  const slide4 = copies.filter(([k]) => /^slide4Copy/.test(k));
  ok(slide4.length === 1 && slide4[0][0] === KEY && slide4[0][1] === dict['en-us'][KEY],
    `fixb4 1 (c): launch-shell.js has exactly one slide-4 copy reference, key ${KEY}, its fallback === the en-us value (SOURCE row, limits in the header) — got ${JSON.stringify(slide4)}`);
  ok(!/Blitz Chess and Split/.test(src) && !/slide4Copy2/.test(src),
    'fixb4 1 (c2): launch-shell.js holds no "Blitz Chess and Split" and no slide4Copy2 anywhere');

  /* (d) EXECUTED: the built launch shell, rendered per locale through ?lang=, slide 4 paints the dictionary value; nothing in the welcome slides names Split */
  const { boot } = on1Kit(h);
  const painted = {}; const dbad = [];
  for (const c of LOCALES) {
    const s = await boot({ ua: 'phone', query: c === 'en-us' ? '' : 'lang=' + c, wait: c === 'en-us' ? 1400 : 900 });
    try {
      const slides = [...s.d.querySelectorAll('.c-launch__slide')];
      const copy4 = slides[3] && (slides[3].querySelector('.c-launch__slide-copy') || {}).textContent;
      painted[c] = copy4;
      if (slides.length !== 4) dbad.push(`${c}: ${slides.length} slides`);
      if (copy4 !== dict[c][KEY]) dbad.push(`${c}: slide 4 paints ${JSON.stringify(copy4)}, dictionary says ${JSON.stringify(dict[c][KEY])}`);
      const all = (s.d.querySelector('.c-launch__welcome') || { textContent: '' }).textContent;
      if (NO_SPLIT.test(all)) dbad.push(`${c}: "Split" somewhere in the welcome text`);
      if (NO_TTT.test(all)) dbad.push(`${c}: Tic-tac-toe in the welcome text`);
      if (s.errs.length) dbad.push(`${c}: page errors ${JSON.stringify(s.errs.slice(0, 2))}`);
    } finally { s.close(); }
  }
  ok(dbad.length === 0 && painted['en-us'] === RULING,
    `fixb4 1 (d): EXECUTED — the BUILT intro.html in jsdom, 14 locales via ?lang=: slide 4 paints the dictionary value (en-us === the ruling's sentence) and no welcome text names Split / Tic-tac-toe — ${JSON.stringify({ dbad, en: painted['en-us'] })}`);

  /* (e) no shipped string names Blitz Chess next to Split: the 14 dictionaries (every key) and the built files */
  const hits = [];
  for (const c of LOCALES) for (const [k, v] of Object.entries(dict[c])) if (typeof v === 'string' && NEAR.test(v)) hits.push(`${c}.${k}`);
  for (const f of ['Spixi/Resources/Raw/html/intro.html', 'Spixi/Resources/Raw/html/spixi.strings.js', 'Spixi/Resources/Raw/html/spixi.bundle.js'])
    if (NEAR.test(rd(f))) hits.push(f);
  ok(hits.length === 0, `fixb4 1 (e): no dictionary value and no built file (intro.html, spixi.strings.js, spixi.bundle.js) names Split within 24 characters of "Blitz Chess" — ${JSON.stringify(hits)}`);
}
