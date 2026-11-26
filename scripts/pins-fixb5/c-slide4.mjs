/* ==== The title of welcome slide 4 is "Play together." (ruling #1833) under the NEW key slide4Title3 ====
 * A title that names planning would promise the Split half, which does not ship. The key is new, not the old one with a
 * new value: a stale translation under the old key cannot ship — build-locales takes legacy -> draft -> English per key
 * of en-us, so a locale without a slide4Title3 draft shows the English title. The old key slide4Title2 is in no table:
 * no source reads it, so a value under it would be dead text.
 *
 * LIMITS (#1735):
 *   (a) (b) (c) read the GENERATED dictionaries src/strings/<code>.json and the drafts as TEXT: the shipped text, not
 *       that a device paints it — that is (e).
 *   (b) "no word for plan": per locale the stem that the old title used for "plan" (PLAN below) plus Split; a
 *       synonym the old title did not use is not caught. The claims lexicon (CLAIMS) is the one of pins-s20f/l-slides
 *       (money / servers / anonymous / forward secrecy, post-quantum), applied to this key only.
 *   (d) is a SOURCE row: the fallback literal in launch-shell.js. (f) EXECUTES it: the built page with the key taken
 *       out of every dictionary the page carries. It does not see a real WebView.
 *   (e) EXECUTED: the BUILT intro.html in jsdom (the pins-on1 kit), once per locale through ?lang=<code>; it reads the
 *       painted title of slide 4 only.
 * Deliberate break (#802): launch-shell.js reads strings.slide4Title2 again (the built page rebuilt) -> (d), (e) red. */
import { on1Kit } from '../pins-on1/kit.mjs';
const LOCALES = ['en-us', 'de-de', 'es-co', 'fr-fr', 'sr-sp', 'sl-si', 'ru-ru', 'pt-br', 'it-it', 'id-id', 'lt-lt', 'cn-cn', 'ja-jp', 'sq-al'];
const KEY = 'slide4Title3';
const OLD = 'slide4Title2';
const RULING = 'Play together.';
/* the stem each locale's old title used for "plan" ("Play and plan together.", e.g. de "planen", es / fr / it "organiz-") */
const PLAN = {
  'en-us': /plan/i, 'de-de': /plan/i, 'es-co': /organiz|plan/i, 'fr-fr': /organis|plan/i, 'sr-sp': /planir/i,
  'sl-si': /načrt/i, 'ru-ru': /план/i, 'pt-br': /planej/i, 'it-it': /organizz|pianific/i, 'id-id': /rencana/i,
  'lt-lt': /planuo/i, 'cn-cn': /规划|计划/, 'ja-jp': /計画/, 'sq-al': /planifik/i,
};
const CLAIMS = {
  'en-us': /money|server|anonym|forward secrecy/i, 'de-de': /geld|server|anonym|forward secrecy|vorwärts/i,
  'es-co': /dinero|servidor|an[oó]nim|secreto/i, 'fr-fr': /argent|serveur|anonym|confidentialité persistante/i,
  'sr-sp': /nova[cč]|server|anonim|tajnost/i, 'sl-si': /denar|strežnik|server|anonim|tajnost/i,
  'ru-ru': /деньг|денег|сервер|аноним|секретност/i, 'pt-br': /dinheiro|servidor|an[oô]nim|sigilo/i,
  'it-it': /soldi|denaro|server|anonim|segretezza/i, 'id-id': /\buang\b|server|anonim|kerahasiaan/i,
  'lt-lt': /pinig|server|anonim|slaptum/i, 'cn-cn': /钱|服务器|匿名|前向/, 'ja-jp': /お金|サーバ|匿名|前方秘匿/,
  'sq-al': /\bpara\b|server|anonim|fshehtësi/i,
};
const PQ = /quant|quânt|cuánt|kvant|квант|kuant|量子/i;
const TITLE_KEYS = ['slide1Title2', 'slide2Title2', 'slide3Title'];
export default async function (h) {
  const { ok, root, readFileSync, existsSync, join } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const dict = {};
  for (const c of LOCALES) dict[c] = JSON.parse(rd(`src/strings/${c}.json`));
  const en = dict['en-us'];

  /* (a) en-us: the ruling's title, exactly; the old key is gone */
  ok(en[KEY] === RULING && !(OLD in en),
    `fixb5 slide4 (a): en-us ${KEY} === "${RULING}" and ${OLD} is gone from en-us — got ${JSON.stringify(en[KEY])}`);

  /* (b) every locale: the key, non-empty, a translation (unless the locale keeps English for the other slide titles),
     no word for plan, no Split, no claim, the old key gone from the dictionary AND from the draft */
  const bad = [];
  for (const c of LOCALES) {
    const v = dict[c][KEY];
    if (typeof v !== 'string' || !v.trim()) { bad.push(`${c}: missing/empty`); continue; }
    const keepsEnglish = c !== 'en-us' && TITLE_KEYS.some((k) => dict[c][k] === en[k]);
    if (c !== 'en-us' && v === RULING && !keepsEnglish) bad.push(`${c}: the English title (never drafted)`);
    if (PLAN[c].test(v)) bad.push(`${c}: a word for plan in ${JSON.stringify(v)}`);
    if (/split/i.test(v)) bad.push(`${c}: names Split in ${JSON.stringify(v)}`);
    if (CLAIMS[c].test(v) || PQ.test(v)) bad.push(`${c}: a claim word in ${JSON.stringify(v)}`);
    if (OLD in dict[c]) bad.push(`${c}: ${OLD} still in the dictionary`);
    const dp = `src/strings/draft/${c}.json`;
    if (c !== 'en-us' && existsSync(join(root, dp))) {
      const dr = JSON.parse(rd(dp));
      if (OLD in dr) bad.push(`${c}: ${OLD} still in the draft`);
      if (dr[KEY] !== v) bad.push(`${c}: the dictionary value is not the draft value (${JSON.stringify(dr[KEY])})`);
    }
  }
  ok(bad.length === 0, `fixb5 slide4 (b): 14 dictionaries carry ${KEY} — a translation, no plan word, no Split, no claim; ${OLD} gone from dictionaries and drafts — ${JSON.stringify(bad)}`);

  /* (c) the old title text is shipped nowhere: no dictionary value and no built file holds a slide-4 title with plan */
  const hits = Object.keys(en).filter((k) => /Play and plan together/.test(String(en[k])));
  for (const f of ['Spixi/Resources/Raw/html/intro.html', 'Spixi/Resources/Raw/html/spixi.strings.js', 'Spixi/Resources/Raw/html/spixi.bundle.js'])
    if (/Play and plan together/.test(rd(f)) || new RegExp('"' + OLD + '"').test(rd(f))) hits.push(f);
  ok(hits.length === 0, `fixb5 slide4 (c): "Play and plan together." and the key ${OLD} are in no dictionary and no built file — ${JSON.stringify(hits)}`);

  /* (d) SOURCE row: launch-shell.js has one slide-4 title reference, key slide4Title3, fallback === the en-us value */
  const src = rd('src/components/launch-shell.js');
  const titles = [...src.matchAll(/title:\s*strings\.(slide4Title\w*)\s*\|\|\s*'([^']*)'/g)].map((m) => [m[1], m[2]]);
  ok(titles.length === 1 && titles[0][0] === KEY && titles[0][1] === RULING && !src.includes(OLD),
    `fixb5 slide4 (d): launch-shell.js reads ${KEY} with the fallback "${RULING}" and names ${OLD} nowhere (SOURCE row) — ${JSON.stringify(titles)}`);

  /* (e) EXECUTED: the built launch shell per locale paints slide 4's title from slide4Title3 */
  const { boot } = on1Kit(h);
  const ebad = []; const painted = {};
  for (const c of LOCALES) {
    const s = await boot({ ua: 'phone', query: c === 'en-us' ? '' : 'lang=' + c, wait: c === 'en-us' ? 1400 : 900 });
    try {
      const slides = [...s.d.querySelectorAll('.c-launch__slide')];
      const t = slides[3] && (slides[3].querySelector('.c-launch__slide-title') || {}).textContent;
      painted[c] = t;
      if (t !== dict[c][KEY]) ebad.push(`${c}: paints ${JSON.stringify(t)}, ${KEY} is ${JSON.stringify(dict[c][KEY])}`);
      if (s.errs.length) ebad.push(`${c}: page errors ${JSON.stringify(s.errs.slice(0, 2))}`);
    } finally { s.close(); }
  }
  ok(ebad.length === 0 && painted['en-us'] === RULING,
    `fixb5 slide4 (e): EXECUTED — the BUILT intro.html, 14 locales via ?lang=: slide 4's title is the ${KEY} value — ${JSON.stringify({ ebad, en: painted['en-us'] })}`);

  /* (f) EXECUTED fallback: the key deleted from every dictionary of window.SpixiStrings (after spixi.strings.js, before
     the bundle builds the shell) -> slide 4 says "Play together." */
  const html = rd('Spixi/Resources/Raw/html/intro.html');
  const TAG = '<script src="spixi.bundle.js"';
  const drop = `<script>(function(){var S=window.SpixiStrings;delete S.enUS.${KEY};for(var c in S.locales)delete S.locales[c].${KEY};})();</script>`;
  const noKey = html.replace(TAG, drop + TAG);
  const s = await boot({ ua: 'phone', html: noKey });
  let fb = null;
  try {
    const slides = [...s.d.querySelectorAll('.c-launch__slide')];
    fb = slides[3] && (slides[3].querySelector('.c-launch__slide-title') || {}).textContent;
  } finally { s.close(); }
  ok(noKey !== html && fb === RULING,
    `fixb5 slide4 (f): EXECUTED — with ${KEY} taken out of the built page's dictionaries, slide 4 falls back to "${RULING}" — got ${JSON.stringify(fb)}`);
}
