/* ==== S20I OW-X-SELECT — the CHROMIUM check (NOT a pin module, NOT in smoke; Playwright) ====
 * Real mouse drags on the BUILT shells with a DESKTOP UA (data-desktop set by the shell's own boot sniff), 1280 × 800:
 *   index.html  — drag from the rail across the chat list → window.getSelection() is EMPTY;
 *   intro.html  — drag across the welcome slide and its texts → EMPTY;
 *   settings.html — drag across the Account hub → EMPTY;
 *   chat.html   — a drag inside a message text (.c-bubble__text, injected) → NOT empty (message text stays selectable),
 *                 and an <input> still takes typed text.
 *   settings.html — (#46 r1 M5 · r2 M2) the "My address" row is label 1 line + sub 1 line (#1007: never three) in 14 locales,
 *   phone 320 and the desktop pane.
 * ⚠ Chromium only (#46 r1 M6): no WebKit engine is installed in the cloud twin — the Mac (WKWebView) leg is the walk row
 *   S20I-SEL-M in docs/walk-s20i.md.
 * Run after build-shells: PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-s20i/e-sweep.mjs
 * Deliberate break (S20I report): the `:root[data-desktop] body` rule removed (+ build-shells) → the intro drag selects
 *   "Private chat. No phone number. Sign up with a nickname…" (FAIL). index / settings in a bare browser boot have little
 *   text on the drag path (no pushed data), so intro is the decisive leg; the jsdom pin e-select covers every element. */
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PWM = process.env.PLAYWRIGHT_MODULE || 'playwright';
let pw;
try { pw = await import(PWM.startsWith('/') ? pathToFileURL(PWM).href : PWM); }
catch (e) { console.error('e-sweep: Playwright not found — set PLAYWRIGHT_MODULE to its index.mjs'); process.exit(2); }
const U = (f) => pathToFileURL(join(root, 'Spixi/Resources/Raw/html', f)).href;
const DESK_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
const b = await pw.chromium.launch();
const drag = async (p, x0, y0, x1, y1) => { await p.mouse.move(x0, y0); await p.mouse.down(); for (let i = 1; i <= 12; i++) await p.mouse.move(x0 + ((x1 - x0) * i) / 12, y0 + ((y1 - y0) * i) / 12); await p.mouse.up(); await sleep(80); return p.evaluate(() => String(window.getSelection())); };
for (const [file, path] of [['index.html', [20, 120, 900, 700]], ['intro.html', [100, 150, 1180, 700]], ['settings.html', [20, 120, 900, 700]]]) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, userAgent: DESK_UA });
  const p = await ctx.newPage();
  await p.goto(U(file)); await sleep(1200);
  const desk = await p.evaluate(() => document.documentElement.hasAttribute('data-desktop'));
  const sel = await drag(p, ...path);
  const okk = desk && sel.trim() === '';
  console.log((okk ? 'OK  ' : 'FAIL') + ` ${file} desktop=${desk} selected=${JSON.stringify(sel.slice(0, 60))}`);
  if (!okk) fails.push(file);
  await ctx.close();
}
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, userAgent: DESK_UA });
  const p = await ctx.newPage();
  await p.goto(U('chat.html')); await sleep(1200);
  await p.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:40px;top:200px;z-index:99999;background:#fff;color:#000;font:20px sans-serif;padding:8px'; d.innerHTML = '<div class="c-bubble"><p class="c-bubble__text" id="t">Select this message text please</p></div><input id="i" style="width:300px">'; document.body.appendChild(d); });
  const r = await p.evaluate(() => { const e = document.getElementById('t').getBoundingClientRect(); return [e.left + 4, e.top + e.height / 2, e.right - 4]; });
  const sel = await drag(p, r[0], r[1], r[2], r[1]);
  await p.click('#i'); await p.keyboard.type('abc');
  const typed = await p.evaluate(() => document.getElementById('i').value);
  const okk = sel.includes('message') && typed === 'abc';
  console.log((okk ? 'OK  ' : 'FAIL') + ` chat.html message text selected=${JSON.stringify(sel)} input=${JSON.stringify(typed)}`);
  if (!okk) fails.push('chat.html');
  await ctx.close();
}
/* #46 r1 M5 (L154): the NEW "My address" row may never wrap to three lines (#1007) — its sub-line in 14 locales, on the
   phone (320) and in the desktop pane (the Account master column) */
{
  const PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
  const bad = [];
  for (const lang of ['en-us', 'de-de', 'es-co', 'fr-fr', 'sr-sp', 'sl-si', 'ru-ru', 'pt-br', 'it-it', 'id-id', 'lt-lt', 'cn-cn', 'ja-jp', 'sq-al']) {
    for (const [ua, vw, q] of [[PHONE_UA, 320, '?lang=' + lang], [DESK_UA, 1100, '?pane=1&lang=' + lang]]) {
      const ctx = await b.newContext({ viewport: { width: vw, height: 800 }, userAgent: ua });
      const p = await ctx.newPage();
      await p.goto(U('settings.html') + q); await sleep(700);
      const r = await p.evaluate(() => {
        const b64 = (x) => btoa(unescape(encodeURIComponent(String(x))));
        const push = (fn, ...a) => window.executeUiCommand(window[fn], ...a.map(b64));
        push('setCaps', 'moments'); push('setNickname', 'Ana'); push('setAddress', '425HqzWpMkV3dTgJnS85CQenAbCdEf9XyZ12');
        return new Promise((res) => setTimeout(() => {
          const row = document.querySelector('.c-settings__row[data-setting-key="address"]');
          if (!row) return res({ err: 'no row' });
          /* #46 r2 M2: the WHOLE text — the label (a text node beside the disc) + the sub — counted as rendered lines */
          const lineCount = (node) => { const r = document.createRange(); r.selectNodeContents(node); const tops = new Set([...r.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top))); return tops.size; };
          const top = row.querySelector('.c-settings__row-top');
          const labelNode = top ? [...top.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim()) : null;
          const sub = row.querySelector('.c-settings__row-sub');
          const lines = [labelNode ? lineCount(labelNode) : 0, sub ? lineCount(sub) : 0];
          res({ max: lines[0] + lines[1], lines });
        }, 400));
      });
      if (r.err || r.max > 2 || r.lines[0] < 1 || r.lines[1] < 1) bad.push(lang + '@' + vw + ':' + JSON.stringify(r));
      await ctx.close();
    }
  }
  console.log((bad.length ? 'FAIL' : 'OK  ') + ' My address row = 2 lines in all (label 1 + sub 1) in 14 locales (phone 320 · desktop pane; #1007 never three)' + (bad.length ? ' — ' + bad.join(' ') : ''));
  if (bad.length) fails.push('address-row-lines');
}
await b.close();
console.log(fails.length ? 'e-sweep FAIL ' + fails.join(', ') : 'e-sweep OK');
process.exit(fails.length ? 1 : 0);
