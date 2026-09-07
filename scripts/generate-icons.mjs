/**
 * Regenerates src/components/icons.js (ESM) and src/components/icons.iife.js
 * (classic script for file:// demos) from src/assets/icons/tabler-icon-*.svg.
 *
 * Pipeline (DECISIONS.md #32): Figma icons frame → bulk SVG export by Damir →
 * this script. Ink fills/strokes (#131415) become currentColor; brand fills/
 * strokes (#3050BD) become var(--icon-accent, #3050bd) so they theme.
 * logo.svg IS processed into the registry (DECISIONS #32/#36) — all its inks
 * (including brand #3050BD) become currentColor so it inherits its context
 * color (topbar title ink — works in both modes).
 *
 * Run: node scripts/generate-icons.mjs   (from repo root)
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(root, 'src/assets/icons');
const OUT_ESM = join(root, 'src/components/icons.js');
const OUT_IIFE = join(root, 'src/components/icons.iife.js');

/* ★★ THE CONTENT GATE (security sweep, row E-4).
 * The stored body of an icon is written into a LIVE document with
 * `svg.innerHTML = entry.b` (see iconFactory below), so this generator is the only
 * thing between a hostile .svg and script in the page. The documented pipeline is
 * "re-export the frame from Figma and re-run this script", which means the input is
 * a tool output that a human eyeballs as a picture — nobody reads the markup.
 * Nothing was wrong with the 90 shipped icons when this gate was written. The gate
 * exists so that stays true.
 * FAIL, NEVER STRIP. A silent strip would hide the fact that an asset was hostile,
 * and the asset would still be in the repo. The run stops, names the file and the
 * token, and writes nothing.
 *
 * THE ALLOW-LISTS ARE DERIVED, NOT GUESSED.
 * · Tags — the 90 registry bodies contain exactly one tag, `path`. The other seven
 *   are the shapes THIS FILE already declares it handles, in the fill-less
 *   normalisation below (`path|circle|rect|ellipse|polygon|polyline|line`), plus the
 *   `g` wrapper that the comment beside it names. Nothing else has ever appeared.
 * · Attributes — the bodies use `d`, `fill`, `fill-rule` and `clip-rule`. The rest
 *   are the geometry attributes those shapes cannot be drawn without, and the paint
 *   attributes this script itself writes or rewrites.
 * Everything dangerous is absent by construction rather than by a deny-list:
 * `script`, `foreignObject`, `image`, `use`, `a` and `style` are not tags here, and
 * no `on*`, `href` or `xlink:href` attribute is. */
const ALLOWED_TAGS = new Set(['path', 'circle', 'rect', 'ellipse', 'polygon', 'polyline', 'line', 'g']);
const ALLOWED_ATTRS = new Set([
  // used by the shipped set
  'd', 'fill', 'fill-rule', 'clip-rule',
  // geometry of the allowed shapes
  'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'points',
  // paint this script writes, rewrites or themes
  'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity',
  'fill-opacity', 'opacity', 'transform',
]);
/* The scanner is deliberately strict: the body must be nothing but allowed element
 * tags and whitespace between them. Text, a comment, a CDATA block, a processing
 * instruction or an UNQUOTED attribute value all fail, because none of them matches
 * the tag pattern and whatever the pattern does not consume is reported.
 * That is the fail-closed direction: an input this scanner cannot parse is rejected,
 * never admitted. */
const ICON_TAG = /<\/?([A-Za-z][A-Za-z0-9-]*)((?:\s+[A-Za-z_:][-A-Za-z0-9_:.]*\s*=\s*"[^"<>]*")*)\s*\/?>/g;
const ICON_ATTR = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*"([^"]*)"/g;
function iconBodyFaults(body) {
  const faults = [];
  ICON_TAG.lastIndex = 0;
  let cursor = 0;
  let m;
  while ((m = ICON_TAG.exec(body)) !== null) {
    const gap = body.slice(cursor, m.index).trim();
    if (gap) faults.push(`content outside an element tag: ${JSON.stringify(gap.slice(0, 60))}`);
    cursor = ICON_TAG.lastIndex;
    const tag = m[1].toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) faults.push(`tag <${m[1]}>`);
    ICON_ATTR.lastIndex = 0;
    let a;
    while ((a = ICON_ATTR.exec(m[2])) !== null) {
      const attr = a[1].toLowerCase();
      if (!ALLOWED_ATTRS.has(attr)) faults.push(`attribute ${a[1]}="…" on <${m[1]}>`);
      // a value is never markup and never a URL scheme, on any attribute
      if (/(?:javascript|vbscript|data)\s*:/i.test(a[2]) || a[2].indexOf('<') !== -1) {
        faults.push(`attribute value ${a[1]}=${JSON.stringify(a[2].slice(0, 60))}`);
      }
    }
  }
  const tail = body.slice(cursor).trim();
  if (tail) faults.push(`content outside an element tag: ${JSON.stringify(tail.slice(0, 60))}`);
  return faults;
}

const rejected = [];
const entries = {};
for (const file of readdirSync(ASSETS).sort()) {
  if (!file.endsWith('.svg')) continue;
  const isLogo = file === 'logo.svg';
  if (!isLogo && !file.startsWith('tabler-icon-')) continue;
  const name = isLogo ? 'logo' : file.replace('tabler-icon-', '').replace('.svg', '');
  const svg = readFileSync(join(ASSETS, file), 'utf8');
  const viewBox = (svg.match(/viewBox="([^"]+)"/) || [])[1];
  if (!viewBox) console.warn(`icons: ${file} has no viewBox — defaulting to "0 0 24 24" (a non-24 grid export would clip)`);
  let inner = svg
    .replace(/<\/?svg[^>]*>/g, '')
    // attribute-per-line exports: join with a space (NOT ''), then collapse
    // inter-tag whitespace for size
    .replace(/\s*\n\s*/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
  // raw Tabler downloads carry an invisible background stub — dead bytes
  inner = inner.replace(/<path\b[^>]*\bd="M0 0h24v24H0z"[^>]*\/?>(?:\s*<\/path>)?/g, '');
  // theme ink + brand colors (fills AND strokes)
  inner = inner
    .replace(/fill="#131415"/gi, 'fill="currentColor"')
    .replace(/stroke="#131415"/gi, 'stroke="currentColor"');
  // logo inherits its context color (topbar title ink — works in both modes);
  // other brand-colored glyphs keep themed accent
  inner = isLogo
    ? inner
        .replace(/fill="#3050BD"/gi, 'fill="currentColor"')
        .replace(/stroke="#3050BD"/gi, 'stroke="currentColor"')
    : inner
        .replace(/fill="#3050BD"/gi, 'fill="var(--icon-accent, #3050bd)"')
        .replace(/stroke="#3050BD"/gi, 'stroke="var(--icon-accent, #3050bd)"');
  // raw Tabler downloads carry fill="currentColor" on the ROOT <svg> (stripped
  // above) with bare inner shapes — the factory root uses fill="none", so bare
  // shapes went invisible (DECISIONS #40). Give any fill-less shape an explicit
  // currentColor. <g> wrappers are left alone: their fill-less children are
  // covered here, and hex fills on <g> were themed by the replaces above.
  inner = inner.replace(
    /<(path|circle|rect|ellipse|polygon|polyline|line)\b(?![^>]*\bfill=)/g,
    '<$1 fill="currentColor"'
  );
  // loud warnings for anything the pipeline can't theme
  for (const m of inner.matchAll(/style="[^"]*"/g)) {
    if (/(?:fill|stroke)\s*:/.test(m[0])) {
      console.warn(`icons: ${file} has inline ${m[0]} — style attributes are not themed, clean up the export manually`);
    }
  }
  for (const m of inner.matchAll(/(fill|stroke)="(#[0-9a-fA-F]{6})"/g)) {
    const hex = m[2].toLowerCase();
    if (hex !== '#131415' && hex !== '#3050bd') {
      console.warn(`icons: ${file} ships hardcoded ${m[1]}="${m[2]}" — not a known ink/brand color, will be wrong in dark mode`);
    }
  }
  /* the gate runs on the FINAL body — the exact string that is stored and later
     assigned to svg.innerHTML — so no transform above can slip anything past it */
  const faults = iconBodyFaults(inner);
  // the viewBox is set with setAttribute, not parsed as markup, but it comes from the
  // same file and it has never been anything but numbers
  if (viewBox && !/^[-+0-9.eE\s]+$/.test(viewBox)) faults.push(`viewBox=${JSON.stringify(viewBox)}`);
  if (faults.length) { rejected.push({ file, faults }); continue; }
  entries[name] = { v: viewBox || '0 0 24 24', b: inner };
}

if (rejected.length) {
  for (const r of rejected) {
    for (const f of r.faults) console.error(`generate-icons: REJECTED ${r.file} — ${f}`);
  }
  console.error(`generate-icons: ${rejected.length} icon(s) failed the content gate. Nothing was written.`);
  console.error('generate-icons: an icon body becomes svg.innerHTML in a live document. Fix the export, or widen ALLOWED_TAGS/ALLOWED_ATTRS deliberately.');
  process.exit(1);
}

const registry = JSON.stringify(entries, null, 0)
  .replace(/","/g, '",\n  "')
  .replace('{"', '{\n  "')
  .replace('"}', '"\n}');

const factory = `
/** Create an inline SVG icon element (filled Tabler set + logo from Figma). */
function iconFactory(ICONS) {
  return function icon(name, opts) {
    opts = opts || {};
    const entry = ICONS[name];
    if (!entry) console.warn('icons: unknown icon "' + name + '"');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', entry ? entry.v : '0 0 24 24');
    svg.setAttribute('width', opts.size || 24);
    svg.setAttribute('height', opts.size || 24);
    svg.setAttribute('fill', 'none');
    if (opts.label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', opts.label); }
    else svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = entry ? entry.b : ''; // static registry strings only — never user data
    return svg;
  };
}`;

const header = (kind) => `/* GENERATED by scripts/generate-icons.mjs from src/assets/icons/ (${Object.keys(entries).length} icons)
 * DO NOT EDIT — re-export from Figma + re-run the script instead. ${kind}
 */`;

writeFileSync(OUT_ESM, `${header('ESM module.')}
export const ICONS = ${registry};
${factory}
export const icon = iconFactory(ICONS);
`);

writeFileSync(OUT_IIFE, `${header('Classic script for file:// demos — exposes window.SpixiIcons.')}
(function () {
  var ICONS = ${registry};
  ${factory}
  window.SpixiIcons = { ICONS: ICONS, icon: iconFactory(ICONS) };
})();
`);

/* ★ Session H review (auditor C, MAJOR-2 belt): READ BOTH FILES BACK and require the
 * registry to appear byte-identically in each. The two writes come from one string, so
 * they can only drift when a write LANDS PARTIALLY or one file was stale at commit time
 * — Session G shipped exactly that (external-link in icons.js, absent from icons.iife.js,
 * so the #710 pin was red in every clean clone). Fail loud here; the suite carries the
 * structural equality gate as the second belt. */
{
  const backEsm = readFileSync(OUT_ESM, 'utf8');
  const backIife = readFileSync(OUT_IIFE, 'utf8');
  if (!backEsm.includes(registry) || !backIife.includes(registry)) {
    console.error('generate-icons: READ-BACK FAILED — a written registry does not match the generated string (IO/mount corruption class, #175). Re-run from a local terminal.');
    process.exit(1);
  }
}
console.log('generated', Object.keys(entries).length, 'icons →', OUT_ESM, '+', OUT_IIFE, '· read-back \u2713');
