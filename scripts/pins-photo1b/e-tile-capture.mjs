/* Regenerates scripts/pins-photo1b/e-tile-base.mjs — the DOM fingerprints of the photo scenario on a BASE build (cap absent).
 * The built shell loads its scripts from its own directory, so the BASE html must be extracted WITH its folder:
 *   mkdir /tmp/tile-base && git archive 55feaddc Spixi/Resources/Raw/html | tar -x -C /tmp/tile-base
 *   node scripts/pins-photo1b/e-tile-capture.mjs /tmp/tile-base/Spixi/Resources/Raw/html/chat.html > scripts/pins-photo1b/e-tile-base.mjs
 * (NOT a pin module; this tree's own build with the caps absent must reproduce the file — that is e-tile.mjs check (7).) */
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { photoScenario } from './e-kit.mjs';
const html = process.argv[2];
if (!html) { console.error('usage: node e-tile-capture.mjs <chat.html>'); process.exit(2); }
const h = { readFileSync, JSDOM, VirtualConsole, sleep: (ms) => new Promise((r) => setTimeout(r, ms)) };
const out = await photoScenario(h, html, 'reply');
process.stdout.write('/* e-tile fingerprints of the photo scenario on the BASE build 55feaddc (cap absent); regenerate with e-tile-capture.mjs — see e-tile.mjs (7) */\nexport default ' + JSON.stringify(out, null, 1) + ';\n');
