/* run-pins — run selected pin modules with the smoke-test helpers, without the full suite (S20F, #1412).
 * The helpers are smoke-test.mjs lines 1–334 (readFileSync CRLF normalisation, ok, load, stripCode, stripCssComments);
 * the script copies them into a temp module next to smoke-test.mjs (so `jsdom` and the relative imports resolve),
 * imports each pin, prints RESULT pass=n fail=n and deletes the temp file on exit.
 * usage: node scripts/run-pins.mjs [--root <tree>] <dir/mod> [<dir/mod> …]
 *   e.g. node scripts/run-pins.mjs pins-s20f/c-code pins-s20/f-render
 * ⚠ One full smoke at a time (#1412): this is for a builder's own pins, not a replacement for the suite. */
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const argv = process.argv.slice(2);
let tree = join(dirname(fileURLToPath(import.meta.url)), '..');
if (argv[0] === '--root') { tree = argv[1]; argv.splice(0, 2); }
if (!argv.length) { console.error('usage: node scripts/run-pins.mjs [--root <tree>] <dir/mod> …'); process.exit(2); }
const head = readFileSync(join(tree, 'scripts/smoke-test.mjs'), 'utf8').split('\n').slice(0, 334).join('\n');
const ROOT_LINE = "const root = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..');";
if (!head.includes(ROOT_LINE) || !head.includes('const stripCssComments')) { console.error('run-pins: smoke-test.mjs lines 1–334 no longer hold the helpers — update the slice'); process.exit(2); }
const body = head.replace(ROOT_LINE, 'const root = ' + JSON.stringify(tree) + ';') + `
for (const m of ${JSON.stringify(argv)}) { console.log('== ' + m); await (await import(new URL('./' + m + '.mjs', import.meta.url))).default({ ok, root, load, stripCode, stripCssComments, readFileSync, readdirSync, existsSync, join, JSDOM, VirtualConsole, sleep }); }
console.log('\\nRESULT pass=' + passes + ' fail=' + failures.length); for (const f of failures) console.log('FAIL: ' + String(f).slice(0, 400));
process.exit(failures.length ? 1 : 0);
`;
const tmp = join(tree, 'scripts', '.run-pins-tmp.mjs');
writeFileSync(tmp, body);
process.on('exit', () => { try { if (existsSync(tmp)) unlinkSync(tmp); } catch (e) { /* best effort */ } });
await import(pathToFileURL(tmp).href);
