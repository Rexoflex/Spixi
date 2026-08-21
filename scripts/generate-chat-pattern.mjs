#!/usr/bin/env node
/**
 * generate-chat-pattern.mjs — inline the chat background pattern TILES as
 * data-URI CSS masks so they can take per-theme token ink (CLAUDE.md "pattern
 * premium treatment"). A data-URI mask is CORS-clean even on file:// —
 * external mask URLs fail silently there (see message-bubble.css note).
 *
 * Emits TWO tiles (W5 — Damir 2026-08-12, pattern STYLE picker):
 *   · Line art   — the doodle export, src/assets/images/chat-bg-pattern.svg
 *   · Data matrix— synthesized here (no asset): faint grid + clustered dots
 * The third style, Live flow, is a CANVAS engine (chat-flow.js) with no tile.
 *
 * Reads  src/assets/images/chat-bg-pattern.svg  (source of truth, Damir export)
 * Writes src/styles/chat-pattern.css            (generated — do not edit)
 *
 * SELECTION CONTRACT (W5): the style rides the INHERITED custom properties
 * --chat-pattern-uri / --chat-pattern-size / --chat-pattern-tile, switched by
 * a `data-chat-pattern` attribute. Because they inherit, the SAME attribute
 * works on :root (the app-wide pref, set pre-paint) and on an individual
 * .c-chat-canvas (the settings swatch tiles, which must each show a different
 * style at once). Never key the styles off a descendant selector — the preview
 * swatches would be unreachable.
 *
 * The generated file owns the pattern PAINT (ink + mask); message-bubble.css
 * owns the layer structure (position/opacity). If this file is missing the
 * canvas fail-softs to gradient-only — never a solid ink rectangle.
 *
 * Encoding: URL-encoded utf-8 (not base64) — the path-data alphabet survives
 * encodeURIComponent nearly untouched, so the payload stays ≈1.05× the asset
 * vs 1.33× for base64. Double quotes become apostrophes (valid XML) so the
 * URI can sit inside url("…").
 *
 * LINE-ART DRIFT GUARD (#337 audit class): the committed tile is 314×314 while
 * the SVG currently on disk exports at 248×248 — a re-run would silently
 * RESKIN the shipped chat background. The script refuses to change the line-art
 * tile size unless `--accept-lineart-change` is passed, so extending this file
 * for Data matrix can never smuggle a visual change into an unrelated batch.
 *
 * Re-run: node scripts/generate-chat-pattern.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(root, 'src/assets/images/chat-bg-pattern.svg');
const OUT = resolve(root, 'src/styles/chat-pattern.css');
const ACCEPT_LINEART_CHANGE = process.argv.includes('--accept-lineart-change');

/* —— shared: SVG → CSS-url()-safe data URI ——————————————————————————————— */
function toDataUri(rawSvg) {
  const svg = rawSvg
    .replace(/"/g, "'")        // url("…") wrapper owns the double quotes
    .replace(/\s{2,}/g, ' ')   // collapse indentation runs
    .replace(/>\s+</g, '><');  // strip inter-tag whitespace
  const encoded = encodeURIComponent(svg)
    // revert characters that are legal inside a quoted CSS url() — keeps the
    // payload readable and ~28% smaller than base64
    .replace(/%20/g, ' ')
    .replace(/%3D/g, '=')
    .replace(/%3A/g, ':')
    .replace(/%2F/g, '/')
    .replace(/%27/g, "'");
  return `url("data:image/svg+xml,${encoded}")`;
}

/* —— 1. Line art (the Damir doodle export) ———————————————————————————————— */
let lineartSvg = readFileSync(SRC, 'utf8').trim();
if (!lineartSvg.startsWith('<svg')) {
  console.error(`✖ ${SRC} does not look like an SVG (starts: ${lineartSvg.slice(0, 30)}…)`);
  process.exit(1);
}
// tile size from the asset itself — fail loudly if the export changes shape
const m = lineartSvg.match(/width="(\d+)"\s+height="(\d+)"/);
if (!m) {
  console.error('✖ could not read width/height from the SVG root — update this script');
  process.exit(1);
}
const [, lw, lh] = m;

/* Drift guard. The committed tile and the on-disk asset disagree today
 * (314×314 shipped vs a 248×248 export) — re-encoding would silently reskin
 * every chat background as a side effect of an unrelated batch. When the sizes
 * disagree we CARRY THE COMMITTED line-art URI THROUGH verbatim and shout;
 * `--accept-lineart-change` re-encodes from the asset deliberately. */
let lineartUri = null;
let lineartW = lw, lineartH = lh;
if (existsSync(OUT) && !ACCEPT_LINEART_CHANGE) {
  const prev = readFileSync(OUT, 'utf8');
  const pm = prev.match(/--chat-pattern-size-lineart:\s*(\d+)px (\d+)px/)
    || prev.match(/mask-size:\s*(\d+)px (\d+)px/);   // pre-W5 single-tile format
  if (pm && (pm[1] !== lw || pm[2] !== lh)) {
    const carried = prev.match(/--chat-pattern-uri(?:-lineart)?:\s*(url\("data:image\/svg\+xml,[^"]*"\))/);
    if (!carried) {
      console.error(`✖ line-art drift detected (committed ${pm[1]}×${pm[2]} vs asset ${lw}×${lh})`
        + ` but the committed URI could not be recovered from ${OUT}. Refusing to guess.`);
      process.exit(1);
    }
    lineartUri = carried[1];
    lineartW = pm[1]; lineartH = pm[2];
    console.warn(
      `⚠ LINE-ART DRIFT — carrying the COMMITTED ${lineartW}×${lineartH} tile through unchanged.\n`
      + `  ${SRC} on disk exports ${lw}×${lh}; it is NOT the asset the shipped tile came from.\n`
      + `  Nothing about the Line-art look changes in this run (by design).\n`
      + `  To adopt the on-disk asset instead: node scripts/generate-chat-pattern.mjs --accept-lineart-change`);
  }
}
if (!lineartUri) lineartUri = toDataUri(lineartSvg);

/* —— 2. Data matrix (synthesized — Damir-approved look, W5) ————————————————
 * 24×24 cells at 12px → 288×288, seamless by construction. Faint grid at every
 * cell boundary; dots snapped to cell centres in two sizes, with a Markov row
 * bias so filled cells cluster into punch-card streaks instead of dissolving
 * into uniform noise. All alpha lives INSIDE the mask, so the grid reads far
 * fainter than the dots under one ink colour.
 */
const MATRIX = {
  cells: 24,
  cell: 12,
  gridWidth: 0.6,
  gridAlpha: 0.16,
  pFillAfterFilled: 0.62,   // Markov: left neighbour filled
  pFillAfterEmpty: 0.3,
  pBig: 0.45,
  rBig: 1.7,
  rSmall: 0.9,
  smallAlpha: 0.55,
  seed: 11,
};

// deterministic PRNG — the tile must be byte-identical on every machine
function mulberry32(a) {
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const num = (v) => String(Math.round(v * 1000) / 1000);   // trim float noise

function buildMatrixSvg() {
  const { cells, cell, gridWidth, gridAlpha } = MATRIX;
  const size = cells * cell;
  const rnd = mulberry32(MATRIX.seed);
  const half = gridWidth / 2;
  const parts = [];

  // grid — one rect per boundary. The i=0 boundary is drawn as TWO half-lines
  // (leading edge + trailing edge) so a repeated tile joins into one full-width
  // line instead of a half-width seam.
  const gridRects = [];
  for (let i = 0; i < cells; i++) {
    const p = i * cell;
    if (i === 0) {
      gridRects.push(`<rect x='0' y='0' width='${num(half)}' height='${size}'/>`);
      gridRects.push(`<rect x='${num(size - half)}' y='0' width='${num(half)}' height='${size}'/>`);
      gridRects.push(`<rect x='0' y='0' width='${size}' height='${num(half)}'/>`);
      gridRects.push(`<rect x='0' y='${num(size - half)}' width='${size}' height='${num(half)}'/>`);
    } else {
      gridRects.push(`<rect x='${num(p - half)}' y='0' width='${num(gridWidth)}' height='${size}'/>`);
      gridRects.push(`<rect x='0' y='${num(p - half)}' width='${size}' height='${num(gridWidth)}'/>`);
    }
  }
  parts.push(`<g fill='black' fill-opacity='${gridAlpha}'>${gridRects.join('')}</g>`);

  // dots — Markov run-bias per row (the punch-card streaks)
  const big = [];
  const small = [];
  for (let y = 0; y < cells; y++) {
    let prevFilled = false;
    for (let x = 0; x < cells; x++) {
      const p = prevFilled ? MATRIX.pFillAfterFilled : MATRIX.pFillAfterEmpty;
      const filled = rnd() < p;
      prevFilled = filled;
      if (!filled) continue;
      const cx = num(x * cell + cell / 2);
      const cy = num(y * cell + cell / 2);
      if (rnd() < MATRIX.pBig) big.push(`<circle cx='${cx}' cy='${cy}' r='${MATRIX.rBig}'/>`);
      else small.push(`<circle cx='${cx}' cy='${cy}' r='${MATRIX.rSmall}'/>`);
    }
  }
  parts.push(`<g fill='black'>${big.join('')}</g>`);
  parts.push(`<g fill='black' fill-opacity='${MATRIX.smallAlpha}'>${small.join('')}</g>`);

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" `
    + `fill="none" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`;
}

/* —— 3. Triangles (synthesized — Damir, 2026-08-22) ————————————————————————
 * ★ THE DEFAULT. Damir: "apply the triangle-pattern as a pattern on both modes,
 * replace the existing doodle pattern we have as default."
 *
 * ⚠ NO triangle ASSET exists in the repo — I checked before writing this, and I did not
 * invent artwork (the standing rule that kept the sound assets out of the last batch). A
 * triangle tessellation is not artwork though: it is geometry, fully described by a step
 * and a stroke, and the Data matrix tile above set the precedent for synthesising a tile
 * here rather than shipping an SVG. If Damir has a specific triangle EXPORT in mind, this
 * is a drop-in replacement — hand it over and it becomes another readSvg source.
 *
 * A half-drop isometric grid: verticals every `step`, plus both diagonals, which reads as
 * a field of equilateral triangles. Seamless by construction — the tile is exactly
 * `cols × step` wide and `rows × rowH` tall, and every stroke that leaves an edge re-enters
 * on the opposite one.
 *
 * Flat on BOTH themes by design: the tile carries ONE alpha and no shading, so it is inked
 * by --chat-pattern-ink per theme and cannot look heavier in dark than in light — which is
 * exactly the "it just sits flat on both modes" Damir asked for. Line weight is deliberately
 * below the line-art tile's: a repeating geometric field is far denser than a doodle, so an
 * equal stroke would read as a much louder pattern at the same opacity.
 */
const TRI = {
  step: 56,      // triangle base
  rows: 4,
  cols: 4,
  stroke: 1,
  alpha: 0.9,    // inside the mask; --chat-pattern-opacity still owns the real strength
};

function buildTriangleSvg() {
  const { step, rows, cols, stroke, alpha } = TRI;
  const rowH = num(step * Math.sqrt(3) / 2);   // equilateral height
  const w = cols * step;
  const h = Number(rowH) * rows;
  const d = [];

  for (let r = 0; r < rows; r++) {
    const y0 = Number(rowH) * r;
    const y1 = Number(rowH) * (r + 1);
    // Half-drop: alternate rows shift by half a base, which is what turns a set of
    // crossing diagonals into a true triangle tessellation rather than a diamond grid.
    const off = (r % 2) * (step / 2);
    // horizontal rule along the row baseline — drawn full width, so it tiles cleanly
    d.push(`M0 ${num(y0)}H${num(w)}`);
    for (let c = -1; c <= cols; c++) {
      const x = c * step + off;
      d.push(`M${num(x)} ${num(y1)}L${num(x + step / 2)} ${num(y0)}`);        // "/"
      d.push(`M${num(x + step / 2)} ${num(y0)}L${num(x + step)} ${num(y1)}`);  // "\\"
    }
  }
  d.push(`M0 ${num(h)}H${num(w)}`);   // close the bottom edge so the seam is invisible

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${num(h)}" viewBox="0 0 ${w} ${num(h)}">`
    + `<path d="${d.join('')}" fill="none" stroke="#fff" stroke-opacity="${alpha}"`
    + ` stroke-width="${stroke}" stroke-linecap="square"/></svg>`;
}

const triW = TRI.cols * TRI.step;
const triH = num(Number(num(TRI.step * Math.sqrt(3) / 2)) * TRI.rows);
const triUri = toDataUri(buildTriangleSvg());

const matrixSize = MATRIX.cells * MATRIX.cell;
const matrixUri = toDataUri(buildMatrixSvg());

/* —— 3. Emit ——————————————————————————————————————————————————————————————— */
const css = `/* GENERATED by scripts/generate-chat-pattern.mjs — DO NOT EDIT.
   Chat background pattern tiles as data-URI masks (CORS-clean on file://) so
   each takes token ink per theme: --chat-pattern-ink (tokens.css).

   W5 style contract — the active tile rides INHERITED custom properties, so
   one \`data-chat-pattern\` attribute works BOTH on :root (the app-wide pref,
   set pre-paint) and on a single .c-chat-canvas (the settings swatch tiles,
   which each show a different style simultaneously):
     --chat-pattern-uri   the mask image        (line art | data matrix)
     --chat-pattern-size  its tile size
     --chat-pattern-tile  block | none          (none = Live flow canvas paints)
   Live flow ("flow") has no tile: it hides ::before and lets chat-flow.js draw.

   Sources: line art  — src/assets/images/chat-bg-pattern.svg (${lineartW}×${lineartH}, Damir export)
            data matrix — synthesized in the generator (${matrixSize}×${matrixSize}, seed ${MATRIX.seed})
   Re-run: node scripts/generate-chat-pattern.mjs */
:root {
  --chat-pattern-uri-lineart: ${lineartUri};
  --chat-pattern-size-lineart: ${lineartW}px ${lineartH}px;
  --chat-pattern-uri-matrix: ${matrixUri};
  --chat-pattern-size-matrix: ${matrixSize}px ${matrixSize}px;
  --chat-pattern-uri-triangles: ${triUri};
  --chat-pattern-size-triangles: ${triW}px ${triH}px;

  /* ★ default style = TRIANGLES (Damir, 2026-08-22 — replaces the line-art doodle).
     An absent pref now resolves here, so an existing install with no stored style moves
     to the new default; anyone who explicitly picked a style keeps it, because that pref
     sets data-chat-pattern and wins over :root. */
  --chat-pattern-uri: var(--chat-pattern-uri-triangles);
  --chat-pattern-size: var(--chat-pattern-size-triangles);
  --chat-pattern-tile: block;
}
[data-chat-pattern='triangles'] {
  --chat-pattern-uri: var(--chat-pattern-uri-triangles);
  --chat-pattern-size: var(--chat-pattern-size-triangles);
  --chat-pattern-tile: block;
}
[data-chat-pattern='lineart'] {
  --chat-pattern-uri: var(--chat-pattern-uri-lineart);
  --chat-pattern-size: var(--chat-pattern-size-lineart);
  --chat-pattern-tile: block;
}
[data-chat-pattern='matrix'] {
  --chat-pattern-uri: var(--chat-pattern-uri-matrix);
  --chat-pattern-size: var(--chat-pattern-size-matrix);
  --chat-pattern-tile: block;
}
[data-chat-pattern='flow'] {
  /* the canvas engine paints instead; keep the URI resolvable so a failed
     flow mount (no canvas support) falls back to the line-art tile by simply
     flipping --chat-pattern-tile back to block. */
  --chat-pattern-uri: var(--chat-pattern-uri-lineart);
  --chat-pattern-size: var(--chat-pattern-size-lineart);
  --chat-pattern-tile: none;
}
.c-chat-canvas::before {
  display: var(--chat-pattern-tile, block);
  background-color: var(--chat-pattern-ink);
  -webkit-mask-image: var(--chat-pattern-uri);
  mask-image: var(--chat-pattern-uri);
  -webkit-mask-size: var(--chat-pattern-size);
  mask-size: var(--chat-pattern-size);
  -webkit-mask-repeat: repeat;
  mask-repeat: repeat;
}
`;

writeFileSync(OUT, css);
console.log(`✓ ${OUT} written (${(css.length / 1024).toFixed(1)} KB)`);
console.log(`  line art   ${lineartW}×${lineartH}   ${(lineartUri.length / 1024).toFixed(1)} KB`);
console.log(`  data matrix ${matrixSize}×${matrixSize}   ${(matrixUri.length / 1024).toFixed(1)} KB`);
console.log(`  triangles   ${triW}×${triH}   ${(triUri.length / 1024).toFixed(1)} KB   ★ default`);
