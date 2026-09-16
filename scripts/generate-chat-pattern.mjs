#!/usr/bin/env node
/**
 * generate-chat-pattern.mjs — emit the chat background pattern TILE as a
 * data-URI CSS mask so it can take per-theme token ink (CLAUDE.md "pattern
 * premium treatment"). A data-URI mask is CORS-clean even on file:// —
 * external mask URLs fail silently there (see message-bubble.css note).
 *
 * Emits ONE tile:
 *   · Data matrix — synthesized here (no asset): faint grid + clustered dots
 *
 * ★ RETIREMENTS, each on Damir's explicit ruling:
 *   · TRIANGLES synth and the LINE-ART export — E1, 2026-08-29 (#690).
 *   · DOODLES export (src/assets/images/chat-bg-doodles.svg) and LIVE FLOW canvas —
 *     #835, 2026-09-09 ("we will remove the dodole and just keep matrix and no pattern
 *     canvas"). #835 retired the SELECTOR and left the doodles URI emitted, because the
 *     generator's drift guard owned the asset and gutting it was a pipeline change, not
 *     a dial. #857 then measured it: 233 KB of a 252 KB generated sheet — 94% — shipped
 *     in every shell that links chat-pattern.css and selectable by nothing. Session W
 *     (#866) is that pipeline change: the asset is no longer READ, the URI is no longer
 *     EMITTED, and the drift guard went with the asset it guarded. The three retired
 *     asset files (chat-bg-doodles.svg · chat-bg-pattern.svg · doodle-pattern-aug.svg)
 *     stay on disk unreferenced unless Damir removes them — deleting artwork is his call.
 *   A stored pref naming ANY retired style falls through to 'matrix' in all three
 *   pre-paint ladders (chat.html head script · chat.html live re-resolve ·
 *   settings.html readChatPrefs — the #690 three-ladder rule), because none of them
 *   matches a block below. Retiring a style silently re-skins whoever chose it, and
 *   the fall-through is what makes that survivable.
 *
 * Reads  nothing — the tile is synthesized (deterministic PRNG, byte-identical on every machine)
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
 * encodeURIComponent nearly untouched, so the payload stays ≈1.05× the SVG
 * vs 1.33× for base64. Double quotes become apostrophes (valid XML) so the
 * URI can sit inside url("…").
 *
 * Re-run: node scripts/generate-chat-pattern.mjs
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(root, 'src/styles/chat-pattern.css');

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

/* —— Data matrix (synthesized — Damir-approved look, W5) ———————————————————
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

/* —— Emit ————————————————————————————————————————————————————————————————— */
const css = `/* GENERATED by scripts/generate-chat-pattern.mjs — DO NOT EDIT.
   Chat background pattern tile as a data-URI mask (CORS-clean on file://) so
   it takes token ink per theme: --chat-pattern-ink (tokens.css).

   W5 style contract — the active tile rides INHERITED custom properties, so
   one \`data-chat-pattern\` attribute works BOTH on :root (the app-wide pref,
   set pre-paint) and on a single .c-chat-canvas (the settings swatch tiles):
     --chat-pattern-uri   the mask image        (data matrix)
     --chat-pattern-size  its tile size
     --chat-pattern-tile  block | none

   Source: data matrix — synthesized in the generator (${matrixSize}×${matrixSize}, seed ${MATRIX.seed})
   ★ RETIRED: triangles and line art (E1, 2026-08-29); doodles and Live flow (#835,
     2026-09-09); the doodles URI itself (#866, Session W — 233 KB nothing could select).
   Re-run: node scripts/generate-chat-pattern.mjs */
:root {
  --chat-pattern-uri-matrix: ${matrixUri};
  --chat-pattern-size-matrix: ${matrixSize}px ${matrixSize}px;

  /* ★★ #835 default style = DATA MATRIX (Damir, 2026-09-09: "we will remove the dodole and
     just keep matrix and no pattern canvas"). An absent pref resolves HERE, and so does a
     pref naming any retired style — 'triangles' and 'lineart' (#690), 'doodles' and 'flow'
     (#835) — because none of them matches a block below. That fall-through is what stops a
     device that stored a retired style from rendering nothing; all three pre-paint ladders
     (#690) also normalise the value on read, so the two mechanisms agree. */
  --chat-pattern-uri: var(--chat-pattern-uri-matrix);
  --chat-pattern-size: var(--chat-pattern-size-matrix);
  --chat-pattern-tile: block;
}
[data-chat-pattern='matrix'] {
  --chat-pattern-uri: var(--chat-pattern-uri-matrix);
  --chat-pattern-size: var(--chat-pattern-size-matrix);
  --chat-pattern-tile: block;
}
/* ★ #835 retired the [data-chat-pattern='doodles'] and ='flow' blocks with their styles;
   #866 retired the doodles URI variable that #835 had left emitted. One tile, one block. */
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
console.log(`  data matrix ${matrixSize}×${matrixSize}   ${(matrixUri.length / 1024).toFixed(1)} KB   ★ the one tile`);
