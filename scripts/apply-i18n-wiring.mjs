/* Phase 3 item 3 — i18n wiring migration (DECISIONS #175, docs/i18n-wiring-spec.md).
 * RUN LOCALLY on a real machine (the sandbox mount corrupts file round-trips).
 * Idempotent: safe to re-run. Does three things across src/:
 *   1. component factory `strings = {}` defaults        -> `strings = getStrings()`
 *   2. shell `opts.strings || {}` / `ctx.strings || {}`  -> `... || getStrings()`
 *   3. ensure each touched component imports getStrings from ./strings-runtime.js
 *   4. wire the 9 demos: strings.iife.js tag + window.SL boot before the bundle
 *
 *   node scripts/apply-i18n-wiring.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const compDir = join(root, 'src', 'components');
const demoDir = join(root, 'src', 'demo');
const IMPORT = "import { getStrings } from './strings-runtime.js';";
const OPTS_RE = /(\b[A-Za-z_$][\w$]*)\.strings \|\| \{\}/g;

function ensureImport(src) {
  if (src.includes(IMPORT)) return src;
  const lines = src.split('\n');
  const firstImport = lines.findIndex((l) => /^import\s/.test(l));
  if (firstImport !== -1) { lines.splice(firstImport, 0, IMPORT); return lines.join('\n'); }
  let at = 0;
  if (lines[0].startsWith('/*')) { const e = lines.findIndex((l) => l.includes('*/')); at = e !== -1 ? e + 1 : 0; }
  lines.splice(at, 0, IMPORT);
  return lines.join('\n');
}

let comps = 0;
for (const name of readdirSync(compDir)) {
  if (!name.endsWith('.js') || name === 'strings-runtime.js') continue;
  const path = join(compDir, name);
  let src = readFileSync(path, 'utf8');
  const before = src;
  src = src.replace(/strings = \{\}/g, 'strings = getStrings()');
  OPTS_RE.lastIndex = 0;
  src = src.replace(OPTS_RE, '$1.strings || getStrings()');
  if (src !== before) { src = ensureImport(src); }
  if (src !== before) { writeFileSync(path, src); comps++; console.log(`  component: ${name}`); }
}

const TAG = '<script src="strings.iife.js"></script>';
const BOOT = `<script>window.SL = window.SpixiStrings.get(new URLSearchParams(location.search).get('lang') || 'en-us');</script>`;
const SPIXI = '<script src="spixi.iife.js"></script>';
const demos = ['apps', 'chat', 'chats', 'wallet', 'settings', 'launch', 'app-frame', 'components', 'desktop'];
let wired = 0;
for (const n of demos) {
  const path = join(demoDir, n + '.html');
  let src = readFileSync(path, 'utf8');
  if (src.includes('window.SL =')) { console.log(`  demo: ${n} already booted`); continue; }
  src = src.includes(TAG) ? src.replace(TAG, TAG + '\n' + BOOT) : src.replace(SPIXI, TAG + '\n' + BOOT + '\n' + SPIXI);
  writeFileSync(path, src);
  wired++; console.log(`  demo: ${n} wired`);
}
console.log(`\ni18n wiring applied: ${comps} components, ${wired} demos. Now: build-strings-iife -> build-demo-bundle -> smoke.`);
