import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
const root = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..');
const { JSDOM, VirtualConsole } = await import('jsdom');
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => console.log('PAGE ERROR:', e.message, e.detail && e.detail.stack ? e.detail.stack.split('\n').slice(0,4).join(' | ') : ''));
vc.on('error', (...a) => console.log('console.error:', ...a));
const file = 'launch.html';
const dom = new JSDOM(readFileSync(join(root, 'src/demo', file), 'utf8'), {
  runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
  url: 'file://' + join(root, 'src/demo', file), virtualConsole: vc,
  beforeParse(w) { w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }); },
});
await new Promise(r => setTimeout(r, 3500));
const d = dom.window.document;
console.log('Spixi?', !!dom.window.Spixi, 'launch el:', !!d.querySelector('.c-launch'), 'host children:', d.getElementById('launch-host')?.childNodes.length);
