/* Shared HTML inliner (factored from build-test-shells.mjs, DECISIONS #176).
 * Produces a SELF-CONTAINED single-file HTML: <link rel=stylesheet> → <style>,
 * <script src> → <script>, @font-face url() → base64 data: URI, and a device
 * override that neutralizes the demos' phone-frame chrome so the shell fills the
 * WebView. Used by build-shells.mjs (production shells) and build-test-shells.mjs.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const FONT_MIME = { woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf' };

/** Inline @font-face url(...) refs in a CSS string as base64 data: URIs. */
export function inlineFonts(css, cssDir) {
  return css.replace(/url\(\s*(['"]?)([^'")]+\.(woff2|woff|ttf|otf))\1\s*\)/gi, (m, q, relPath, ext) => {
    try {
      const abs = resolve(cssDir, relPath);
      const b64 = readFileSync(abs).toString('base64');
      return `url(data:${FONT_MIME[ext.toLowerCase()]};base64,${b64})`;
    } catch {
      console.warn(`  ! font not found, left as-is: ${relPath}`);
      return m;
    }
  });
}

/* Device override: the demos wrap the shell in a fixed phone mockup for desktop
 * viewing. On a real device we want it to fill the screen, so hide the demo
 * chrome and expand the (first) phone frame to the full viewport. */
const DEVICE_CSS =
  '<style data-device>' +
  'html,body{margin:0!important;padding:0!important;height:100%!important;overflow:hidden!important;background:var(--surface-screen)!important}' +
  '.demo-toolbar,.demo-caption,.statusbar{display:none!important}' +
  '.demo-frames{display:block!important;margin:0!important;gap:0!important;flex-wrap:nowrap!important}' +
  '.demo-phone{width:100vw!important;height:100vh!important;max-width:none!important;border:0!important;border-radius:0!important;box-shadow:none!important}' +
  '</style>';

/**
 * Inline one HTML file into a self-contained string.
 *
 * ★ #345 EXTERNALS. `opts.external` is a Map of source href → sibling filename.
 * A ref in that map is NOT inlined; it is rewritten to the sibling name and the
 * caller writes that file next to the shell. This exists because of a MEASURED
 * cost: on Android every screen open reads the whole shell, runs a localize pass
 * over it and base64-encodes it into a data: URL, and that cost is LINEAR in file
 * size (measured on a Galaxy A52: empty_detail 222 KB = 16 ms · index 1625 KB =
 * 114 ms · chat 2019 KB = 172 ms, i.e. ~0.08 ms/KB). The shared bundle, strings,
 * icons and base CSS are ~1.3 MB of that, duplicated into all 22 shells — 26 MB of
 * identical bytes re-read and re-encoded on every single navigation.
 * Relative refs resolve because Android loads the document with a BaseUrl
 * (loadDataWithBaseURL), and iOS/Windows load from a directory that already holds
 * sibling assets — the `images/` folder has shipped this way since #176.
 *
 * @param {string} inPath absolute path to the source HTML
 * @param {object} [opts] { device=true, strict=true, external=Map }
 * @returns {string} self-contained HTML
 */
export function inlineHtml(inPath, opts = {}) {
  const { device = true, strict = true, external = new Map() } = opts;
  const externalNames = new Set(external.values());
  const htmlDir = dirname(inPath);
  let html = readFileSync(inPath, 'utf8');

  // 1. drop <link rel="preload" ... as="font" ...> (fonts get inlined into CSS)
  html = html.replace(/^[ \t]*<link\s+rel=["']preload["'][^>]*as=["']font["'][^>]*>\s*$/gim, '');

  // 2. <link rel="stylesheet" href="X"> → <style>…</style> (fonts inlined)
  html = html.replace(/<link\s+rel=["']stylesheet["']\s+href=["']([^"']+)["']\s*\/?>/gi, (m, href) => {
    if (external.has(href)) return `<link rel="stylesheet" href="${external.get(href)}">`;
    const cssPath = resolve(htmlDir, href);
    let css = readFileSync(cssPath, 'utf8');
    css = inlineFonts(css, dirname(cssPath));
    return `<style data-src="${href}">\n${css}\n</style>`;
  });

  // 3. <script src="Y"></script> → <script>…</script>
  html = html.replace(/<script\s+src=["']([^"']+)["']\s*>\s*<\/script>/gi, (m, src) => {
    // An external stays a REAL <script src>. It must keep its document order and
    // must NOT be defer/async: the shells destructure window.Spixi in a following
    // inline script, so the bundle has to have executed by then.
    if (external.has(src)) return `<script src="${external.get(src)}"></script>`;
    const jsPath = resolve(htmlDir, src);
    const js = readFileSync(jsPath, 'utf8');
    return `<script data-src="${src}">\n${js}\n</script>`;
  });

  // 4. device override
  if (device) html = html.replace(/<\/head>/i, DEVICE_CSS + '\n</head>');

  // 5. hard gate: no stray external/relative refs may remain in the DOCUMENT
  // chrome. Scan with the inlined <script>/<style> blocks removed, so neither
  // the `data-src="…"` provenance attrs nor JS/CSS string literals can
  // false-positive — only genuine un-inlined tag refs (a missed <img>, <link>,
  // <a href="../…">) survive. data:/#/ixian:/http are fine.
  const chrome = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  const leftover = [...chrome.matchAll(/[\s"'<](?:href|src)=["']([^"']+)["']/gi)]
    .map((x) => x[1])
    .filter((u) => !/^(data:|#|ixian:|https?:|\/\/|mailto:|tel:)/.test(u))
    // #345: a declared external is an INTENDED sibling ref, not a missed inline.
    // The gate still catches everything else, which is the point of keeping it.
    .filter((u) => !externalNames.has(u));
  if (leftover.length) {
    const msg = `unresolved relative refs remain: ${JSON.stringify([...new Set(leftover)])}`;
    if (strict) throw new Error(msg);
    console.warn('  ! ' + msg);
  }

  return html;
}
