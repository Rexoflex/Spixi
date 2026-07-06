/* Pseudo-locale render smoke (i18n batch §B④).
 * Loads the built demo globals, renders strings-heavy components under the
 * MARKER locale, and asserts (a) markers actually render (i18n is plumbed),
 * (b) no plain-English text leaks (hardcoded string), (c) the settings hub
 * exposes the STRUCTURAL data-setting-key hook the desktop router now uses.
 * Run: node scripts/pseudo-locale-smoke.mjs
 */
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><body></body>', { pretendToBeVisual: true });
const { window } = dom;
globalThis.window = window;
for (const k of ['document', 'HTMLElement', 'Node', 'NodeFilter', 'getComputedStyle', 'CustomEvent', 'DOMParser', 'navigator'])
  try { Object.defineProperty(globalThis, k, { value: window[k], configurable: true, writable: true }); } catch {}
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
window.requestAnimationFrame = (cb) => setTimeout(cb, 0);

for (const f of ['src/components/icons.iife.js', 'src/demo/strings.iife.js', 'src/demo/spixi.iife.js'])
  window.eval(readFileSync(f, 'utf8'));

const S = window.SpixiStrings;
const U = window.Spixi;
let fail = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fail++; console.log('  ✗ ' + m); } };

const strings = S.pseudo();
const MARK = /⟦[^⟧]*⟧/;               // ⟦key⟧
// dynamic data we feed in (never translated) + tokens conventionally left as-is
const ALLOW = /^[\s.,:·—–\-|/]*$|IXI|GIF|QR|0x|[0-9]|demo|Ixian|Spixi|English|Deutsch/;  // endonyms: language names aren't translated

function scan(node, name) {
  let leaked = 0, markers = 0;
  const walk = document.createTreeWalker(node, window.NodeFilter.SHOW_TEXT);
  let t;
  while ((t = walk.nextNode())) {
    const s = t.textContent.trim();
    if (!s) continue;
    if (MARK.test(s)) { markers++; continue; }
    if (ALLOW.test(s)) continue;
    leaked++;
    console.log(`  LEAK [${name}] "${s}"`);
  }
  ok(markers > 0, `${name}: renders markers (i18n plumbed)`);
  ok(leaked === 0, `${name}: no English leak`);
}

// 1) settings hub — also the structural-hook target
try {
  const hub = U.createSettingsHub({
    strings, nickname: '⟦nick⟧', address: 'AWN4v...9kP', theme: 0, language: 'en-us',
    languages: [{ code: 'en-us', label: 'English' }, { code: 'de-de', label: 'Deutsch' }],
    version: '1.0.0', capabilities: {},
    onTheme() {}, onLanguage() {}, onNickname() {}, onBackup() {}, onDanger() {},
  });
  document.body.append(hub);
  const themeRow = hub.querySelector('[data-setting-key="theme"]');
  const langRow = hub.querySelector('[data-setting-key="language"]');
  ok(!!themeRow, 'hub: theme row exposes data-setting-key="theme"');
  ok(!!langRow, 'hub: language row exposes data-setting-key="language"');
  ok(themeRow && !/Theme/.test(themeRow.textContent), 'hub: theme row shows marker not "Theme"');
  scan(hub, 'settings-hub');
} catch (e) { fail++; console.log('  ✗ settings-hub threw: ' + e.message); }

// 2) notifications screen (strings-heavy, few deps)
try {
  const scr = U.createNotificationsScreen({ strings, enabled: true, previews: true, sounds: true, capabilities: { notifications: true } });
  document.body.append(scr); scan(scr, 'notifications');
} catch (e) { fail++; console.log('  ✗ notifications threw: ' + e.message); }

// 3) scan view (permission copy)
try {
  const sc = U.createScanView({ strings, onResult() {}, onCancel() {} });
  document.body.append(sc); scan(sc, 'scan-view');
} catch (e) { fail++; console.log('  ✗ scan-view threw: ' + e.message); }

console.log(`\npseudo-locale-smoke: ${checks - fail}/${checks} checks passed`);
process.exitCode = fail ? 1 : 0;
