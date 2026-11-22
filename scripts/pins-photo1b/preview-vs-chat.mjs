/* ==== photo1b · #1644 fix round 1 (O2-1) — THE SETTINGS PREVIEW = THE CHAT (NOT a pin module, NOT in smoke; by hand; Playwright + Chromium) ====
 * On the BUILT `settings.html` (Chat appearance screen open: the big preview, the 7 canvas dots, the Background swatches) and on the BUILT `chat.html`
 * of the same tree (`--root`): for every canvas × light / dark × desktop UA / phone UA, the elements that carry their OWN `data-chat-ground`
 * (the dot face of that canvas; the preview and the Background swatch group once that canvas is picked) must COMPUTE the same
 * `--chat-pattern-ink`, `--chat-pattern-alpha-1`, `--gradient-chat`, `--surface-bubble-sent` and `--surface-card-sent` as the chat's <html> on that ground.
 * (The jsdom twin of this check is pins-photo1b/g-tokens key `tile`; this one reads the REAL elements of the REAL shell in Chromium.)
 * USAGE: PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-photo1b/preview-vs-chat.mjs [--root <tree>]   → prints the cells that differ; exit 1 if any.
 * LIMITS: it compares computed tokens, not pixels; the theme is set as data-theme after load (the shells' own head scripts do the same from the host's name). */
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const argi = process.argv.indexOf('--root');
const root = resolve(argi > -1 ? process.argv[argi + 1] : join(here, '..', '..'));
const PWM = process.env.PLAYWRIGHT_MODULE || 'playwright';
let pw;
try { pw = await import(PWM.startsWith('/') ? pathToFileURL(PWM).href : PWM); }
catch (e) { console.error('preview-vs-chat: Playwright not found — set PLAYWRIGHT_MODULE to its index.mjs'); process.exit(2); }
const PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const DESK_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const GROUNDS = ['flat', 'gradient', 'green', 'blue', 'aurora', 'dusk', 'ocean'];
const PROPS = ['--chat-pattern-ink', '--chat-pattern-alpha-1', '--gradient-chat', '--surface-bubble-sent', '--surface-card-sent'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (v) => String(v || '').replace(/\s+/g, '').toLowerCase();
const READ = ([sel, props]) => {
  const el = sel === 'html' ? document.documentElement : document.querySelector(sel);
  if (!el) return null;
  const cs = getComputedStyle(el), out = {};
  for (const p of props) out[p] = cs.getPropertyValue(p).replace(/\s+/g, ' ').trim();
  return out;
};
const b = await pw.chromium.launch();
const bad = []; let cells = 0;
for (const [ua, dev, q] of [[DESK_UA, 'desktop', ''], [PHONE_UA, 'phone', '?mobile=1']]) {
  for (const theme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: dev === 'desktop' ? 1280 : 412, height: dev === 'desktop' ? 800 : 915 }, userAgent: ua, hasTouch: dev === 'phone', colorScheme: theme, reducedMotion: 'reduce' });
    /* the chat on each ground */
    const chat = {};
    for (const g of GROUNDS) {
      const pg = await ctx.newPage();
      await pg.addInitScript((v) => { try { localStorage.setItem('spixi.chat.ground', v); } catch (e) { /* */ } }, g);
      await pg.goto(pathToFileURL(join(root, 'Spixi/Resources/Raw/html/chat.html')).href + q); await sleep(500);
      await pg.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme); await sleep(100);
      chat[g] = await pg.evaluate(READ, ['html', PROPS]); await pg.close();
    }
    /* the settings shell: the dots (all 7 at once), then the preview + the Background swatches once each canvas is picked */
    const sp = await ctx.newPage();
    await sp.goto(pathToFileURL(join(root, 'Spixi/Resources/Raw/html/settings.html')).href); await sleep(900);
    await sp.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await sp.evaluate(() => { const r = [...document.querySelectorAll('button.c-settings__row')].find((x) => /Chat appearance/.test(x.textContent || '')); if (r) r.click(); });
    await sleep(900);
    for (const g of GROUNDS) {
      const dot = await sp.evaluate((args) => {
        const [g, props] = args;
        const face = document.querySelector('.c-settings-appearance__dot-face[data-chat-ground="' + g + '"]');
        if (!face) return null;
        const cs = getComputedStyle(face), o = {}; for (const p of props) o[p] = cs.getPropertyValue(p).replace(/\s+/g, ' ').trim(); return o;
      }, [g, PROPS]);
      /* pick the canvas through its dot, then read the preview and the swatch group */
      await sp.evaluate((g) => { const f = document.querySelector('.c-settings-appearance__dot-face[data-chat-ground="' + g + '"]'); const btn = f && f.closest('button'); if (btn) btn.click(); }, g);
      await sleep(250);
      const seen = await sp.evaluate((args) => {
        const [g, props] = args;
        const read = (el) => { if (!el) return null; const cs = getComputedStyle(el), o = {}; for (const p of props) o[p] = cs.getPropertyValue(p).replace(/\s+/g, ' ').trim(); return o; };
        const prev = document.querySelector('.c-settings-appearance__preview');
        const grp = [...document.querySelectorAll('[data-chat-ground="' + g + '"]')].find((e) => e !== prev && !e.classList.contains('c-settings-appearance__dot-face'));
        return { preview: prev && prev.getAttribute('data-chat-ground') === g ? read(prev) : null, swatches: read(grp) };
      }, [g, PROPS]);
      for (const [what, got] of [['dot', dot], ['preview', seen.preview], ['swatches', seen.swatches]]) {
        if (!got) { bad.push(dev + ' ' + theme + ' ' + g + ' ' + what + ': not found'); continue; }
        cells++;
        const diff = PROPS.filter((p) => norm(got[p]) !== norm(chat[g][p])).map((p) => [p, chat[g][p], got[p]]);
        if (diff.length) bad.push(dev + ' ' + theme + ' ' + g + ' ' + what + ' ' + JSON.stringify(diff));
      }
    }
    await ctx.close();
  }
}
await b.close();
console.log('preview-vs-chat (' + root + '): ' + cells + ' cells compared (dot · preview · Background swatches, 7 canvases × light / dark × desktop / phone), ' + bad.length + ' differ');
for (const x of bad) console.log('  ✗ ' + x);
process.exit(bad.length ? 1 : 0);
