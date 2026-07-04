/**
 * build-test-shells.mjs — package the redesigned demo shells into SELF-CONTAINED,
 * single-file HTML for a first MAUI integration test (docs/maui-integration-test-plan.md).
 *
 * Why single-file: a MAUI WebView loading local HTML resolves relative asset paths
 * differently per platform (Android file:///android_asset/html/, iOS a copied
 * file:// in app data). Inlining every CSS, JS, and font removes ALL path-resolution
 * risk, so the test measures WebView rendering + touch behaviour, not asset plumbing.
 *
 * Input : src/demo/{chats,chat}.html  (the real demos, mock data, no bridge needed)
 * Output: Spixi/Resources/Raw/html/{chats,chat}.test.html  (drop-in for the harness)
 *
 * Inlines: <link rel=stylesheet> → <style>, <script src> → <script>, and every
 * @font-face url(*.woff2/woff/ttf) → base64 data: URI. Strips <link rel=preload as=font>.
 *
 * Run on a REAL machine (not the sandbox): node scripts/build-test-shells.mjs
 * Re-run after any component/bundle/CSS change so the test files stay current.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');            // = Spixi Rework Of Frontend/Spixi
const OUT_DIR = join(root, '..', 'WebViewTest', 'WebViewTest', 'Resources', 'Raw');  // the throwaway WebViewTest app's raw assets
const SHELLS = [
  { in: 'src/demo/chats.html', out: 'chats.test.html' },
  { in: 'src/demo/chat.html',  out: 'chat.test.html' },
  { in: 'src/demo/apps.html',  out: 'apps.test.html' },
];

const FONT_MIME = { woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf' };

/** Inline @font-face url(...) references in a CSS string as base64 data: URIs. */
function inlineFonts(css, cssDir) {
  return css.replace(/url\(\s*(['"]?)([^'")]+\.(woff2|woff|ttf|otf))\1\s*\)/gi, (m, q, relPath, ext) => {
    try {
      const abs = resolve(cssDir, relPath);
      const b64 = readFileSync(abs).toString('base64');
      return `url(data:${FONT_MIME[ext.toLowerCase()]};base64,${b64})`;
    } catch (e) {
      console.warn(`  ! font not found, left as-is: ${relPath}`);
      return m;                                                              // leave original if missing
    }
  });
}

function buildOne(shell) {
  const inPath = join(root, shell.in);
  const htmlDir = dirname(inPath);
  let html = readFileSync(inPath, 'utf8');

  // 1. drop <link rel="preload" ... as="font" ...> (fonts get inlined into CSS)
  html = html.replace(/^[ \t]*<link\s+rel=["']preload["'][^>]*as=["']font["'][^>]*>\s*$/gim, '');

  // 2. <link rel="stylesheet" href="X"> → <style>…</style> (with fonts inlined)
  html = html.replace(/<link\s+rel=["']stylesheet["']\s+href=["']([^"']+)["']\s*\/?>/gi, (m, href) => {
    const cssPath = resolve(htmlDir, href);
    let css = readFileSync(cssPath, 'utf8');
    css = inlineFonts(css, dirname(cssPath));
    return `<style data-src="${href}">\n${css}\n</style>`;
  });

  // 3. <script src="Y"></script> → <script>…</script>
  html = html.replace(/<script\s+src=["']([^"']+)["']\s*>\s*<\/script>/gi, (m, src) => {
    const jsPath = resolve(htmlDir, src);
    const js = readFileSync(jsPath, 'utf8');
    return `<script data-src="${src}">\n${js}\n</script>`;
  });

  // 3b. device override: the demos wrap the shell in a fixed 419×860 "phone" mockup
  // for desktop viewing. On a real device we want the shell to fill the screen, so
  // neutralize the demo chrome (toolbar, caption, fake status bar, centered frame).
  const deviceCss =
    '<style data-device>' +
    'html,body{margin:0!important;padding:0!important;height:100%!important;overflow:hidden!important;background:var(--surface-screen)!important}' +
    '.demo-toolbar,.demo-caption,.statusbar{display:none!important}' +
    '.demo-frames{display:block!important;margin:0!important;gap:0!important;flex-wrap:nowrap!important}' +
    '.demo-phone{width:100vw!important;height:100vh!important;max-width:none!important;border:0!important;border-radius:0!important;box-shadow:none!important}' +
    '</style>';
  html = html.replace(/<\/head>/i, deviceCss + '\n</head>');

  // 4. sanity: no stray external/relative refs left (data: URIs are fine)
  const leftover = [...html.matchAll(/\b(?:href|src)=["'](?!data:|#|ixian:)([^"']+)["']/gi)]
    .map((x) => x[1]).filter((u) => !/^(https?:)?\/\//.test(u) || true);
  if (leftover.length) console.warn(`  ! ${shell.out}: unresolved refs remain →`, leftover);

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, shell.out);
  writeFileSync(outPath, html);
  console.log(`  ✓ ${shell.out}  (${(html.length / 1024).toFixed(0)} KB)  ← ${shell.in}`);
}

console.log('Packaging self-contained test shells →', OUT_DIR);
for (const s of SHELLS) buildOne(s);
console.log('Done. Add both *.test.html to the MAUI project as MauiAsset (they live under Resources/Raw, so they are included automatically), then point the test harness at them.');
