/**
 * jsdom smoke test for the demo pages (#46 audit-loop step).
 * Run: npm i --no-save jsdom && node scripts/smoke-test.mjs
 * Optional arg: repo root (default = script's parent dir) — lets the script run
 * from a location where jsdom resolves, e.g. `node /x/smoke-test.mjs /repo`.
 * Asserts against COMPUTED styles where it matters ([hidden] vs author display).
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const root = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..');
let JSDOM, VirtualConsole;
try { ({ JSDOM, VirtualConsole } = await import('jsdom')); }
catch { console.error('jsdom not installed — run: npm i --no-save jsdom'); process.exit(2); }

const failures = [];
const ok = (cond, msg) => { if (!cond) failures.push(msg); console.log((cond ? '  ✓ ' : '  ✗ ') + msg); };

const load = (file) => new Promise((resolve) => {
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => failures.push(file + ' PAGE ERROR: ' + e.message));
  const dom = new JSDOM(readFileSync(join(root, 'src/demo', file), 'utf8'), {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    url: 'file://' + join(root, 'src/demo', file), virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    },
  });
  setTimeout(() => resolve(dom), 3000);
});

console.log('app-frame.html');
{
  const dom = await load('app-frame.html');
  const d = dom.window.document, W = dom.window;
  const disp = (el) => W.getComputedStyle(el).display;

  ok(d.querySelectorAll('.c-chatlist-item').length === 12, '12 chat rows render');
  ok(d.querySelectorAll('.c-txlist-item').length === 6, '6 tx rows render');
  ok([...d.querySelectorAll('.c-bottomnav__badge')].filter((b) => !b.hidden).length === 2, 'chats badges visible on both navs');

  // search: filter + highlight + clear (computed display, not attribute)
  const input = d.querySelector('.c-search-field__input');
  const clear = d.querySelector('.c-search-field__clear');
  ok(disp(clear) === 'none', 'clear button hidden while empty');
  input.value = 'money';
  input.dispatchEvent(new W.Event('input', { bubbles: true }));
  const chatRows = [...d.querySelectorAll('.c-chatlist-item')];
  ok(chatRows.filter((r) => disp(r) !== 'none').length === 1, 'excerpt search narrows to 1 row');
  ok(d.querySelectorAll('.c-highlight').length > 0, 'matches highlighted');
  clear.click();
  ok(chatRows.filter((r) => disp(r) !== 'none').length === 12, 'clear restores all rows');
  ok(d.querySelectorAll('.c-highlight').length === 0, 'highlights cleared');

  // tx filter chips
  const chips = [...d.querySelectorAll('.c-chip')];
  chips[1].click();
  const txRows = [...d.querySelectorAll('.c-txlist-item')];
  ok(txRows.filter((r) => disp(r) !== 'none').every((r) => r.dataset.direction === 'out'), 'Sent chip filters to outgoing');
  chips[0].click();
  ok(txRows.filter((r) => disp(r) !== 'none').length === 6, 'All chip restores tx rows');

  // muted chat: dual indicators
  const q = chatRows.find((r) => r.textContent.includes('QWERTZ'));
  const variants = [...q.querySelectorAll('.c-indicator')].map((i) => i.dataset.variant);
  ok(variants.join('+') === 'count-muted+muted', 'muted chat shows count-muted + bell-off');
}

console.log('components.html');
{
  const dom = await load('components.html');
  const d = dom.window.document;
  ok(d.querySelectorAll('.c-button').length > 20, 'button grid renders');
  ok(d.querySelectorAll('.c-badge').length === 10, 'badge matrix renders 10 variants');
}

if (failures.length) { console.error('\nFAILED:\n' + failures.join('\n')); process.exit(1); }
console.log('\nsmoke test CLEAN');
process.exit(0); // jsdom windows hold live timers (timestamp ticker) — exit explicitly
