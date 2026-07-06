/* Locale audit (automated gate for the #46 loop).
 * For every locale: key parity with en-us, per-key placeholder-set equality,
 * protected tokens preserved (IXI/GIF/QR/PIN/ID/Spixi/Ixian — leading word
 * boundary only, so inflected brand forms like "Spixiju" pass), no empty values
 * (except keys empty in en-us), and an untranslated-ratio note.
 *   node scripts/verify-locales.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['de-de','es-co','fr-fr','sr-sp','sl-si','ru-ru','pt-br'];
const en = JSON.parse(readFileSync(join(root,'src/strings/en-us.json'),'utf8'));
const KEYS = Object.keys(en);
const phSet = (s) => (String(s).match(/\{[^}]+\}/g) || []).sort().join(',');
const PROTECT = ['IXI','GIF','QR','PIN','ID','Spixi','Ixian'];
let hard = 0;
for (const code of LANGS) {
  const p = join(root,'src/strings',code+'.json');
  if (!existsSync(p)) { console.log(code+': MISSING FILE'); hard++; continue; }
  const loc = JSON.parse(readFileSync(p,'utf8'));
  const miss = KEYS.filter(k => !(k in loc));
  const extra = Object.keys(loc).filter(k => !(k in en));
  const phBad = [], empty = [], tokBad = [];
  let same = 0;
  for (const k of KEYS) {
    const e = en[k], v = loc[k] ?? '';
    if (phSet(e) !== phSet(v)) phBad.push(k);
    if (e.trim() && !String(v).trim()) empty.push(k);
    for (const t of PROTECT) {
      const re = new RegExp('\\b' + t);       // leading boundary only (inflected brands pass)
      if (re.test(e) && !re.test(String(v))) { tokBad.push(k + ':' + t); break; }
    }
    if (String(v) === e) same++;
  }
  const bad = miss.length + extra.length + phBad.length + empty.length + tokBad.length;
  if (bad) hard++;
  console.log(code+': '+(bad?'✗':'✓')+' parity(miss '+miss.length+', extra '+extra.length+') · placeholders '+phBad.length+' · empty '+empty.length+' · tokens '+tokBad.length+' · still-English '+same+'/'+KEYS.length);
  if (miss.length) console.log('   missing: '+miss.slice(0,8).join(', '));
  if (phBad.length) console.log('   placeholder mismatch: '+phBad.slice(0,12).join(', '));
  if (empty.length) console.log('   empty: '+empty.slice(0,12).join(', '));
  if (tokBad.length) console.log('   token dropped: '+tokBad.slice(0,12).join(', '));
}
console.log(hard ? '\nFAIL: '+hard+' locale(s) with hard issues' : '\nALL LOCALES CLEAN ✓');
process.exitCode = hard ? 1 : 0;
