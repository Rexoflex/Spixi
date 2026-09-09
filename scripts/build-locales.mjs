/* Build per-language dictionaries (i18n batch — starter translations).
 *
 * For each target locale:
 *   1) REUSE the shipped legacy translation (Resources/Raw/lang/<code>.txt) for
 *      any key whose English matches a legacy id AND is placeholder-free (so a
 *      legacy {0}/{1} string can never land under a {n}/{q}/{date} key).
 *   2) Otherwise take the Claude-drafted value from src/strings/draft/<code>.json.
 *   3) Fall back to English (logged) so a locale is never missing a key.
 * Emits src/strings/<code>.json + <code>.js. With --todo, writes the per-locale
 * lists of keys still needing a draft translation (fed to the translators).
 *
 *   node scripts/build-locales.mjs [--todo] [--check] [--root <dir>]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
/* --root lets GATE 51 run this CLI against a FIXTURE tree. Without it the gate could
   only ever observe the green outcome, and a check broken into always-exit-0 would
   read as a pass — the shape GATE 44 exists to refuse. */
const rootArg = argv.includes('--root') ? argv[argv.indexOf('--root') + 1] : null;
const root = rootArg ? rootArg : join(dirname(fileURLToPath(import.meta.url)), '..');
const TODO = process.argv.includes('--todo');
const CHECK = process.argv.includes('--check');   // GATE 51: writes nothing, fails on a never-drafted key
const LANGS = ['de-de', 'es-co', 'fr-fr', 'sr-sp', 'sl-si', 'ru-ru', 'pt-br',
  // N4 (#379): the #360 residual — same legacy-reuse-first recipe, drafts in draft/<code>.json
  'it-it', 'id-id', 'lt-lt', 'cn-cn', 'ja-jp'];
const enUS = JSON.parse(readFileSync(join(root, 'src/strings/en-us.json'), 'utf8'));
const KEYS = Object.keys(enUS);
const PH = /\{[^}]+\}/;

function norm(s) {
  return s.toLowerCase().replace(/\{[^}]*\}/g, '').replace(/[’']/g, "'").replace(/[^a-z0-9]+/g, ' ').trim();
}
function parseLang(code) {
  const p = join(root, 'Spixi/Resources/Raw/lang', code + '.txt');
  const m = new Map();
  if (!existsSync(p)) return m;
  for (const raw of readFileSync(p, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith(';')) continue;
    const eq = line.indexOf('='); if (eq < 0) continue;
    const id = line.slice(0, eq).trim(); const val = line.slice(eq + 1).trim();
    if (id && id !== 'language-code' && id !== 'language') m.set(id, val);
  }
  return m;
}
// English value -> legacy id (placeholder-free only, so reuse is placeholder-safe)
const enLegacy = parseLang('en-us');
const valToId = new Map();
for (const [id, val] of enLegacy) { if (PH.test(val)) continue; const n = norm(val); if (n && !valToId.has(n)) valToId.set(n, id); }
// my key -> legacy id (placeholder-free English on my side too)
const keyToId = {};
for (const k of KEYS) { if (PH.test(enUS[k])) continue; const id = valToId.get(norm(enUS[k])); if (id) keyToId[k] = id; }

let draft = {};
const draftDir = join(root, 'src/strings/draft');

/* ★ #713 (Damir on device, 2026-08-30): a legacy translation that is WRONG must not win
   over a draft just because the English matched. `app-details-title` is "App details" in
   en-us but "Spixi App" / "Aplikacija Spixi" / "Spixi アプリ" in every other legacy file —
   a mistranslation the reuse-first recipe carried into the redesign's `appDetails` for
   twelve locales (the 3-dots sheet on an app row read "SPIXI APP" in German). Keys here
   skip the legacy lookup and take the draft. Add a key only with the wrong legacy value
   quoted beside it, so the reason travels with the exception. */
const NO_REUSE = new Set([
  'appDetails',   // legacy app-details-title: de "Spixi App", sl "Aplikacija Spixi", ja "Spixi アプリ" — a name, not "details"
]);

/* GATE 51 — see the tail of this file. */
const engAll = new Map();

for (const code of LANGS) {
  const legacy = parseLang(code);
  const draftFile = join(draftDir, code + '.json');
  const drafted = existsSync(draftFile) ? JSON.parse(readFileSync(draftFile, 'utf8')) : {};
  const out = {}, todo = {}, stats = { reused: 0, drafted: 0, english: 0 };
  for (const k of KEYS) {
    const id = NO_REUSE.has(k) ? null : keyToId[k];   // #713: a wrong legacy value never wins
    const leg = id ? legacy.get(id) : null;
    // #288 review: a legacy value byte-identical to the ENGLISH is not a translation. It
    // was shadowing a good draft AND counting itself as "reused", so the fill silently did
    // not land (#285 drafted "developer": "Entwickler"; de-de shipped "Developer") and the
    // english-fallback stat under-reported the real leak.
    if (leg && leg.trim() && norm(leg) !== norm(enUS[k])) { out[k] = leg; stats.reused++; continue; }
    if (drafted[k] && drafted[k].trim()) { out[k] = drafted[k]; stats.drafted++; continue; }
    out[k] = enUS[k]; stats.english++; todo[k] = enUS[k];         // needs a draft
  }
  for (const k of Object.keys(todo)) engAll.set(k, (engAll.get(k) || 0) + 1);
  if (CHECK) { console.log(`${code}: reuse ${stats.reused} · draft ${stats.drafted} · english-fallback ${stats.english}`); continue; }
  if (TODO) { mkdirSync(draftDir, { recursive: true }); writeFileSync(join(draftDir, code + '.todo.json'), JSON.stringify(todo, null, 2) + '\n'); }
  else {
    mkdirSync(join(root, 'src/strings'), { recursive: true });
    writeFileSync(join(root, 'src/strings', code + '.json'), JSON.stringify(out, null, 2) + '\n');
    const body = KEYS.map((k) => `  ${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${JSON.stringify(out[k])},`).join('\n');
    writeFileSync(join(root, 'src/strings', code + '.js'), `/* GENERATED by scripts/build-locales.mjs — starter translation, review before ship. */\nexport const ${code.replace('-', '')} = {\n${body}\n};\nexport default ${code.replace('-', '')};\n`);
  }
  console.log(`${code}: reuse ${stats.reused} · draft ${stats.drafted} · english-fallback ${stats.english}` + (TODO ? ` → ${Object.keys(todo).length} to translate` : ''));
}

/* ══ GATE 51 — A KEY NOBODY EVER DRAFTED ═══════════════════════════════════════════
   ★★ THE DEFECT THIS PAYS FOR. On 2026-09-08 Damir found the Account address line, the
   peer-address sheet and the remove-contact sheet reading English under a chosen locale.
   Six keys were the English string in ALL TWELVE locales. They had been added AFTER the
   last drafting round, so they were in no draft file, and the resolver above did exactly
   what its docblock promises — "fall back to English (logged)" — twelve times over, in
   silence. LOGGED IS NOT GATED (#772): the count was printed on every build and nothing
   read it.

   ★ THE PROPERTY, and it is deliberately narrow: a key whose English is non-empty and
   which falls to the English FALLBACK in EVERY ONE of the twelve locales. Partial gaps
   are the translators' ordinary backlog and are reported by --todo, not failed here.

   ⚠ AND WHAT IS NOT DONE HERE: `verify-locales`'s "still-English N" is NOT made a
   failure, and must not be. Most of that count is legitimate — "Apps", "Wallet" and
   "Status" are the same word in German. Conflating "identical" with "untranslated" is
   why this defect survived twelve languages.

   ★★ THERE IS NO ALLOW-LIST, and that is the design, not an omission (#798 — a list
   written by the author is not a pin). A key that SHOULD stay English in every language
   is recorded by a translator writing the English value into the draft file, which is
   the same evidence for every locale and travels with the key. `appUrlPlaceholder`
   ("https://…"), `gif` ("GIF") and `textM` ("M") all do exactly that today and pass
   here for free, with no entry anywhere. The exemption mechanism is the draft file; there
   is no other, and nothing in this file can grant one.

   ⚠ The one skip is DERIVED, not chosen: a key whose English is empty or whitespace has
   nothing to translate (`handshakeReady` is ""), and the resolver counts it as an
   English fallback because `drafted[k].trim()` is falsy for an empty draft value. */
if (CHECK) {
  const never = [...engAll.entries()]
    .filter(([k, n]) => n === LANGS.length && String(enUS[k] ?? '').trim())
    .map(([k]) => k)
    .sort();
  if (never.length) {
    console.error('\nbuild-locales --check: ' + never.length + ' key(s) fell back to English in ALL '
      + LANGS.length + ' locales — added after a drafting round and present in no src/strings/draft/*.json,'
      + ' so they ship English everywhere:');
    for (const k of never) console.error('  ' + k + ' = ' + JSON.stringify(enUS[k]));
    console.error('Fix: add the key to src/strings/draft/<code>.json for each locale (write the English value'
      + ' verbatim if it is genuinely the same word in that language — that is what records the decision).');
    process.exitCode = 1;
  } else {
    console.log('\nbuild-locales --check: every key is drafted or reused in at least one locale \u2713');
  }
}
