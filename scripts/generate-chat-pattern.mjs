#!/usr/bin/env node
/**
 * generate-chat-pattern.mjs — emit the chat background pattern TILE as a
 * data-URI CSS mask so it can take per-theme token ink (CLAUDE.md "pattern
 * premium treatment"). A data-URI mask is CORS-clean even on file:// —
 * external mask URLs fail silently there (see message-bubble.css note).
 *
 * Emits ONE tile:
 *   · Contours — synthesized here (no asset): four soft topographic lines per tile
 *
 * ★★ #997 (Damir 2026-09-28, the premium polish round): CONTOURS replace the data matrix —
 *   picked from three candidates rendered on Mist, the brand gradient and the dark canvas
 *   (constellation · fine lattice · contours). The matrix synth and its URI are RETIRED; a
 *   stored 'matrix' (or any retired style) falls through to 'contours' in all three pre-paint
 *   ladders (#690), the same fall-through every earlier retirement used.
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
 *   A stored pref naming ANY retired style falls through to 'contours' (was 'matrix' until #997) in all three
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

/* —— Contours (synthesized — #997, Damir's pick) ——————————————————————————————
 * 320×240. Four soft 0.6px lines per tile; each is a sum of two x-PERIODIC sines (period =
 * the tile width, so the tile is seamless horizontally) and stays inside its own 60px band
 * (amplitude ≤ 18 + 6.3 < 30, so no line crosses the top or bottom edge — seamless
 * vertically by construction). All alpha lives INSIDE the mask (stroke-opacity .7), so the
 * ink token alone decides the colour. Deterministic PRNG: byte-identical on every machine.
 */
const CONTOURS = { w: 320, h: 240, lines: 4, amp: 18, lineW: 0.6, lineAlpha: 0.7, step: 8, seed: 3 };

// deterministic PRNG — the tile must be byte-identical on every machine
function mulberry32(a) {
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const num = (v) => String(Math.round(v * 100) / 100);   // trim float noise

function buildContoursSvg() {
  const o = CONTOURS;
  const rnd = mulberry32(o.seed);
  const d = [];
  const band = o.h / o.lines;
  for (let i = 0; i < o.lines; i++) {
    const y0 = band * i + band / 2;
    const p1 = rnd() * Math.PI * 2, p2 = rnd() * Math.PI * 2;
    const a1 = o.amp * (0.55 + rnd() * 0.45), a2 = o.amp * 0.35 * rnd();
    let path = '';
    for (let x = 0; x <= o.w; x += o.step) {
      const y = y0 + a1 * Math.sin((2 * Math.PI * x) / o.w + p1) + a2 * Math.sin((4 * Math.PI * x) / o.w + p2);
      path += (x ? 'L' : 'M') + num(x) + ' ' + num(y);
    }
    d.push(path);
  }
  return `<svg width="${o.w}" height="${o.h}" viewBox="0 0 ${o.w} ${o.h}" fill="none" xmlns="http://www.w3.org/2000/svg">`
    + `<path d='${d.join('')}' stroke='black' stroke-opacity='${o.lineAlpha}' stroke-width='${o.lineW}' stroke-linejoin='round'/></svg>`;
}

const contoursSize = `${CONTOURS.w}px ${CONTOURS.h}px`;
const contoursUri = toDataUri(buildContoursSvg());

/* —— Emit ————————————————————————————————————————————————————————————————— */
const css = `/* GENERATED by scripts/generate-chat-pattern.mjs — DO NOT EDIT.
   Chat background pattern tile as a data-URI mask (CORS-clean on file://) so
   it takes token ink per theme: --chat-pattern-ink (tokens.css).

   W5 style contract — the active tile rides INHERITED custom properties, so
   one \`data-chat-pattern\` attribute works BOTH on :root (the app-wide pref,
   set pre-paint) and on a single .c-chat-canvas (the settings swatch tiles):
     --chat-pattern-uri   the mask image        (contours)
     --chat-pattern-size  its tile size
     --chat-pattern-tile  block | none

   Source: contours — synthesized in the generator (${CONTOURS.w}×${CONTOURS.h}, seed ${CONTOURS.seed})
   ★ RETIRED: triangles and line art (E1, 2026-08-29); doodles and Live flow (#835,
     2026-09-09); the doodles URI itself (#866, Session W — 233 KB nothing could select);
     the DATA MATRIX (#997, 2026-09-28 — replaced by contours, Damir's pick).
   Re-run: node scripts/generate-chat-pattern.mjs */
:root {
  --chat-pattern-uri-contours: ${contoursUri};
  --chat-pattern-size-contours: ${contoursSize};

  /* ★★ #997 default style = CONTOURS (Damir, 2026-09-28). An absent pref resolves HERE, and so
     does a pref naming any retired style — 'matrix' (#997), 'triangles' and 'lineart' (#690),
     'doodles' and 'flow' (#835) — because none of them matches a block below. That
     fall-through is what stops a device that stored a retired style from rendering nothing;
     all three pre-paint ladders (#690) also normalise the value on read, so the two
     mechanisms agree. */
  --chat-pattern-uri: var(--chat-pattern-uri-contours);
  --chat-pattern-size: var(--chat-pattern-size-contours);
  --chat-pattern-tile: block;
}
[data-chat-pattern='contours'] {
  --chat-pattern-uri: var(--chat-pattern-uri-contours);
  --chat-pattern-size: var(--chat-pattern-size-contours);
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
console.log(`  contours ${CONTOURS.w}×${CONTOURS.h}   ${(contoursUri.length / 1024).toFixed(1)} KB   ★ the one tile (#997)`);
