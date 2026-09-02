/**
 * ★ #733 — bake docs/legal/*.md → src/components/legal-docs.js (see scripts/lib/legal-docs.mjs).
 *   node scripts/build-legal-docs.mjs          writes the generated source (build-demo-bundle calls this first)
 *   node scripts/build-legal-docs.mjs --check  rebuilds in memory, exits 1 if the committed file drifted
 * A HELD document (editorial marker still in the markdown) is reported as a 🟡 line and
 * bakes as null — never as a failure; the failure is a stale generated file.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bakeLegalDocs, describeLegalDocs } from './lib/legal-docs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK_ONLY = process.argv.includes('--check');
const OUT = join(root, 'src/components/legal-docs.js');

const { docs, source } = bakeLegalDocs(root);
console.log(describeLegalDocs(docs));
if (CHECK_ONLY) {
  const cur = existsSync(OUT) ? readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
  if (cur !== source) {
    console.error('build-legal-docs --check: src/components/legal-docs.js is STALE vs docs/legal — run node scripts/build-legal-docs.mjs (then bundle → shells)');
    process.exit(1);
  }
  console.log('build-legal-docs --check: legal-docs.js matches a fresh bake ✓');
} else {
  writeFileSync(OUT, source);
  const back = readFileSync(OUT, 'utf8');
  if (back !== source) throw new Error('legal-docs.js WRITE corrupted (short write / mount) — re-run from a local terminal');
  console.log('legal-docs.js written: ' + Buffer.byteLength(source, 'utf8') + ' bytes');
}
