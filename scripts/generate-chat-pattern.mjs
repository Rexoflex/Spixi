#!/usr/bin/env node
/**
 * generate-chat-pattern.mjs — inline the chat background pattern TILES as
 * data-URI CSS masks so they can take per-theme token ink (CLAUDE.md "pattern
 * premium treatment"). A data-URI mask is CORS-clean even on file:// —
 * external mask URLs fail silently there (see message-bubble.css note).
 *
 * Emits TWO tiles (E1 — Damir 2026-08-29, the pattern rework):
 *   · Doodles    — the export, src/assets/images/chat-bg-doodles.svg  ★ default
 *   · Data matrix— synthesized here (no asset): faint grid + clustered dots
 * The third style, Live flow, is a CANVAS engine (chat-flow.js) with no tile.
 *
 * ★ E1 RETIRED two styles on Damir's explicit ruling (2026-08-29): the TRIANGLES
 * synth (default since 2026-08-22) and the LINE-ART export that preceded it. Both
 * are gone from the picker and from this file; a stored pref naming either is
 * migrated to 'doodles' in settings-screens.js, because retiring a style silently
 * re-skins whoever chose it and the migration is what makes that survivable.
 * The old line-art asset (chat-bg-pattern.svg) is left on disk, unreferenced.
 *
 * Reads  src/assets/images/chat-bg-doodles.svg  (source of truth, Damir export)
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
 * DOODLES DRIFT GUARD (#337 audit class): a changed export would silently RESKIN
 * the shipped chat background from inside an unrelated batch. The script refuses
 * to change the doodles tile SIZE unless `--accept-doodles-change` is passed.
 * ★ E1: unlike the line-art guard it replaces, this one starts in AGREEMENT —
 * asset and committed tile are both 610×610 — so it is dormant, not papering
 * over a known mismatch. If it ever fires, the export moved; find out why.
 *
 * Re-run: node scripts/generate-chat-pattern.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(root, 'src/assets/images/chat-bg-doodles.svg');
const OUT = resolve(root, 'src/styles/chat-pattern.css');
const ACCEPT_DOODLES_CHANGE = process.argv.includes('--accept-doodles-change');

/* ★ E1b (Damir 2026-08-29): the tile is RENDERED SMALLER than the asset is drawn.
 * At its natural 610px the motifs read as individual drawings; at 0.6 they read as
 * TEXTURE, which is what a chat background is for (his words: "the scale is too
 * [big]. Should probably be smaller by 40%"). 610 × 0.6 = 366.
 * ⚠ SCALING IS A CSS CONCERN, NOT AN ASSET ONE. The export is untouched — it stays
 * 610×610 and the mask is simply painted at 366. Re-exporting it smaller would have
 * thrown away resolution on high-DPI screens for nothing, and would have tripped the
 * drift guard for a change that is not a change to the artwork.
 * ★ Which is why the guard below still compares NATURAL sizes: it reads the natural
 * size back from the marker comment this script emits, so moving this dial can never
 * be mistaken for the export moving underneath us. */
const DOODLES_SCALE = 0.6875;
const scaled = (n) => Math.round(Number(n) * DOODLES_SCALE);

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

/* —— 1. Doodles (the Damir export — ★ E1 default) —————————————————————————— */
let doodlesSvg = readFileSync(SRC, 'utf8').trim();
if (!doodlesSvg.startsWith('<svg')) {
  console.error(`✖ ${SRC} does not look like an SVG (starts: ${doodlesSvg.slice(0, 30)}…)`);
  process.exit(1);
}
// tile size from the asset itself — fail loudly if the export changes shape
const m = doodlesSvg.match(/width="(\d+)"\s+height="(\d+)"/);
if (!m) {
  console.error('✖ could not read width/height from the SVG root — update this script');
  process.exit(1);
}
const [, lw, lh] = m;

/* Drift guard. If the committed tile and the on-disk asset ever disagree,
 * re-encoding would silently reskin every chat background as a side effect of
 * an unrelated batch. When the sizes disagree we CARRY THE COMMITTED doodles
 * URI THROUGH verbatim and shout; `--accept-doodles-change` re-encodes from the
 * asset deliberately. ★ E1: they agree today (610×610), so this is a tripwire,
 * not a workaround — do not pass the flag to silence an error. */
let doodlesUri = null;
let doodlesW = lw, doodlesH = lh;
if (existsSync(OUT) && !ACCEPT_DOODLES_CHANGE) {
  const prev = readFileSync(OUT, 'utf8');
  /* ★ E1b: read the NATURAL size out of the marker, not the emitted --chat-pattern-size,
     which is the SCALED one. Comparing the asset's 610 against a scaled 366 would fire the
     guard on every single run and train whoever hits it to pass the flag — which is the one
     thing the guard exists to prevent. */
  const pm = prev.match(/doodles-natural:\s*(\d+)x(\d+)/);
  if (pm && (pm[1] !== lw || pm[2] !== lh)) {
    const carried = prev.match(/--chat-pattern-uri(?:-doodles)?:\s*(url\("data:image\/svg\+xml,[^"]*"\))/);
    if (!carried) {
      console.error(`✖ doodles drift detected (committed ${pm[1]}×${pm[2]} vs asset ${lw}×${lh})`
        + ` but the committed URI could not be recovered from ${OUT}. Refusing to guess.`);
      process.exit(1);
    }
    doodlesUri = carried[1];
    doodlesW = pm[1]; doodlesH = pm[2];
    console.warn(
      `⚠ DOODLES DRIFT — carrying the COMMITTED ${doodlesW}×${doodlesH} tile through unchanged.\n`
      + `  ${SRC} on disk exports ${lw}×${lh}; it is NOT the asset the shipped tile came from.\n`
      + `  Nothing about the Doodles look changes in this run (by design).\n`
      + `  To adopt the on-disk asset instead: node scripts/generate-chat-pattern.mjs --accept-doodles-change`);
  }
}
if (!doodlesUri) doodlesUri = toDataUri(doodlesSvg);

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
     --chat-pattern-uri   the mask image        (doodles | data matrix)
     --chat-pattern-size  its tile size
     --chat-pattern-tile  block | none          (none = Live flow canvas paints)
   Live flow ("flow") has no tile: it hides ::before and lets chat-flow.js draw.

   doodles-natural: ${doodlesW}x${doodlesH}  scale: ${DOODLES_SCALE}   ← the drift guard reads THIS line

   Sources: doodles    — src/assets/images/chat-bg-doodles.svg (${doodlesW}×${doodlesH} natural,
                         painted at ${scaled(doodlesW)}×${scaled(doodlesH)} — see DOODLES_SCALE)
            data matrix — synthesized in the generator (${matrixSize}×${matrixSize}, seed ${MATRIX.seed})
   ★ E1 (2026-08-29): TRIANGLES and LINE ART are retired — see the file header.
   Re-run: node scripts/generate-chat-pattern.mjs */
:root {
  --chat-pattern-uri-doodles: ${doodlesUri};
  --chat-pattern-size-doodles: ${scaled(doodlesW)}px ${scaled(doodlesH)}px;
  --chat-pattern-uri-matrix: ${matrixUri};
  --chat-pattern-size-matrix: ${matrixSize}px ${matrixSize}px;

  /* ★ E1 default style = DOODLES (Damir, 2026-08-29 — replaces the triangles synth,
     which replaced the line art before it). An absent pref resolves here. A pref that
     names a RETIRED style ('triangles' / 'lineart') no longer matches any block below,
     so it would fall through to this default anyway — but settings-screens.js migrates
     it on read regardless, so the stored value stops naming a style that is gone. */
  --chat-pattern-uri: var(--chat-pattern-uri-doodles);
  --chat-pattern-size: var(--chat-pattern-size-doodles);
  --chat-pattern-tile: block;
}
[data-chat-pattern='doodles'] {
  --chat-pattern-uri: var(--chat-pattern-uri-doodles);
  --chat-pattern-size: var(--chat-pattern-size-doodles);
  --chat-pattern-tile: block;
}
[data-chat-pattern='matrix'] {
  --chat-pattern-uri: var(--chat-pattern-uri-matrix);
  --chat-pattern-size: var(--chat-pattern-size-matrix);
  --chat-pattern-tile: block;
}
[data-chat-pattern='flow'] {
  /* the canvas engine paints instead; keep the URI resolvable so a failed
     flow mount (no canvas support) falls back to the DOODLES tile by simply
     flipping --chat-pattern-tile back to block. ★ E1: this used to point at line
     art; that tile no longer exists, so an un-repointed fallback would have
     resolved to nothing and fail-softed to a bare gradient. */
  --chat-pattern-uri: var(--chat-pattern-uri-doodles);
  --chat-pattern-size: var(--chat-pattern-size-doodles);
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
console.log(`  doodles     ${doodlesW}×${doodlesH} natural → painted ${scaled(doodlesW)}×${scaled(doodlesH)} (scale ${DOODLES_SCALE})   ${(doodlesUri.length / 1024).toFixed(1)} KB   ★ default`);
console.log(`  data matrix ${matrixSize}×${matrixSize}   ${(matrixUri.length / 1024).toFixed(1)} KB`);
