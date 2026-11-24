/* ==== walktools2 · C — `screens.home` of scripts/device/a52s.json takes the `sets` form: one set per theme (interface I-3 of docs/contract-walktools2.md; the form: #1878) ====
 * LIMITS (#1735, stated in the first version). Pure node, a SOURCE pin on the JSON FILE: it reads scripts/device/a52s.json and checks the SHAPE of `screens.home`, the LIGHT
 * values (byte-equal to the three probes of the base, held here as constants), the arithmetic of the two sets against each other, and that the rest of the file
 * is the base's (the text with the `"home": …` block cut out, SHA-256). It does NOT prove that the DARK values are what the phone paints: they are the render
 * tool's reading in Chromium (`node scripts/pins-walktools2/c-home-render.mjs`, by hand, the desktop engine, not the Android WebView) and the operator block's
 * calibrate corrects them; so the dark RGB values are NOT pinned — only that they are well formed, on the same points, and apart from the light set. It does
 * NOT prove that adb-walk.ps1 reads the sets form for `home` (builder-b, pins-walktools/b-screens k2 / k7 and the by-hand runner b-screens-run.mjs hold that).
 * NOT caught: a tol widened to cover both themes with a value that is still "apart" by the check below; a value moved inside the same tolerance band.
 *   h1 form      — screens.home is { sets } and nothing else; exactly two sets, in the order light, dark
 *   h2 light     — the light set = today's three probes (x, y, rgb, tol) and minMatch 3, byte for byte
 *   h3 minMatch  — each set's minMatch = its probe count (the operator block's rule, #1885 NIT-3)
 *   h4 dark      — the dark set is on the SAME three points; well formed (#RRGGBB upper case, tol an integer 0–255, as the script's rules); apart from the light set:
 *                  at the points whose colour follows the theme (1 and 2) the dark value is outside BOTH tols of the light value; the light values do not pass the dark
 *                  set and the dark values do not pass the light set (matched < minMatch, with the script's arithmetic: every channel within tol)
 *   h5 rest      — every byte of the file outside the `"home": …` block equals the base (the text from the start to `"home":` plus the text from `"chat":` to the end, SHA-256)
 * Deliberate breaks (#802): the builder's report, one one-token mutation per key in a COPY of the tree (`--root`-style scratch runner). */
import { createHash } from 'node:crypto';

const sha = (x) => createHash('sha256').update(x).digest('hex');
export const BASE_REST_SHA = 'bbba78d4140f719ec3eb1e41422503802b6dd56bd440771bfc4ab221e4368597';   // a52s.json of the base 462ba3e4 without the home block (length 4874)
export const LIGHT_TODAY = [   // screens.home of the base, the three probes and minMatch 3
  { x: 60, y: 2300, rgb: '#C9D5ED', tol: 28 },
  { x: 840, y: 318, rgb: '#EDF0F2', tol: 28 },
  { x: 912, y: 2020, rgb: '#3050BD', tol: 28 },
];
const rgbOf = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const within = (a, b, tol) => a.every((v, i) => Math.abs(v - b[i]) <= tol);
/* the script's arithmetic (Test-ProbeSetPixels): the colours read at the points of `probes` → how many match */
const matched = (probes, colours) => probes.reduce((n, p, i) => n + (within(rgbOf(colours[i]), rgbOf(p.rgb), p.tol) ? 1 : 0), 0);

export default async function (h) {
  const { ok, root, readFileSync, join } = h;
  const text = readFileSync(join(root, 'scripts/device/a52s.json'), 'utf8').replace(/\r\n/g, '\n');
  let map = null;
  try { map = JSON.parse(text); } catch (e) { /* h1 fails */ }
  const home = map && map.screens && map.screens.home;
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const sets = home && Array.isArray(home.sets) ? home.sets : [];
  const light = sets[0], dark = sets[1];
  const probesOf = (s) => (s && Array.isArray(s.probes) ? s.probes : []);

  /* ── h1 · the form ── */
  const h1 = {
    parses: map !== null && !!home,
    onlySets: !!home && Object.keys(home).join(',') === 'sets',
    two: sets.length === 2,
    names: sets.length === 2 && light.name === 'light' && dark.name === 'dark',
    setKeys: sets.length === 2 && sets.every((s) => Object.keys(s).sort().join(',') === 'minMatch,name,probes'),
  };
  ok(F(h1).length === 0,
    '★ walktools2 C (h1 form): scripts/device/a52s.json parses and screens.home is { "sets": [ … ] } and nothing else (no old-form probes / minMatch beside it), with exactly two sets, named light then dark, each holding only name, minMatch, probes — failing: ' + JSON.stringify(F(h1)));

  /* ── h2 · the light set = today's ── */
  const lp = probesOf(light);
  const h2 = {
    count: lp.length === LIGHT_TODAY.length,
    bytes: JSON.stringify(lp) === JSON.stringify(LIGHT_TODAY),
    min: !!light && light.minMatch === 3,
  };
  ok(F(h2).length === 0,
    '★ walktools2 C (h2 light): the light set is today\'s three probes of screens.home — (60,2300) #C9D5ED, (840,318) #EDF0F2, (912,2020) #3050BD, tol 28 each, key order x y rgb tol — and minMatch 3, byte for byte — failing: ' + JSON.stringify(F(h2)));

  /* ── h3 · minMatch = the probe count ── */
  const h3 = { n: sets.length === 2 && sets.every((s) => Number.isInteger(s.minMatch) && s.minMatch === probesOf(s).length && s.minMatch > 0) };
  ok(F(h3).length === 0,
    '★ walktools2 C (h3 minMatch): each set\'s minMatch equals its probe count (3 and 3; the operator block\'s rule, #1885 NIT-3) — failing: ' + JSON.stringify(F(h3)));

  /* ── h4 · the dark set ── */
  const dp = probesOf(dark);
  const form = (p) => p && Number.isInteger(p.x) && Number.isInteger(p.y) && /^#[0-9A-F]{6}$/.test(p.rgb) && Number.isInteger(p.tol) && p.tol >= 0 && p.tol <= 255 &&
    Object.keys(p).join(',') === 'x,y,rgb,tol';
  const same = dp.length === 3 && lp.length === 3 && dp.every((p, i) => p.x === lp[i].x && p.y === lp[i].y);
  const wellFormed = dp.length === 3 && dp.every(form);
  const themePoints = same && wellFormed ? [0, 1].every((i) => !within(rgbOf(dp[i].rgb), rgbOf(lp[i].rgb), Math.max(dp[i].tol, lp[i].tol))) : false;
  const h4 = {
    samePoints: same,
    wellFormed,
    apartAt1and2: themePoints,
    darkNotLight: same && wellFormed && lp.length === 3 && !!light && matched(lp, dp.map((p) => p.rgb)) < light.minMatch,
    lightNotDark: same && wellFormed && !!dark && matched(dp, lp.map((p) => p.rgb)) < dark.minMatch,
  };
  ok(F(h4).length === 0,
    '★ walktools2 C (h4 dark): the dark set is on the same three points as the light set, every probe well formed (#RRGGBB upper case, integer tol 0–255, keys x y rgb tol), the dark colour of points 1 and 2 (the tonal pill of the current tab, the neutral-02 surface) is outside the tolerance of the light colour, and each set fails the other (the dark colours match fewer than minMatch of the light probes and the light colours fewer than minMatch of the dark probes; the script\'s every-channel-within-tol arithmetic) — failing: ' + JSON.stringify(F(h4)));

  /* ── h5 · nothing else changed ── */
  const i = text.indexOf('"home":'), j = text.indexOf('"chat":');
  const rest = i > 0 && j > i ? text.slice(0, i) + text.slice(j) : '';
  const h5 = { cut: rest.length > 0, sha: rest.length > 0 && sha(rest) === BASE_REST_SHA };
  ok(F(h5).length === 0,
    '★ walktools2 C (h5 rest): every byte of scripts/device/a52s.json outside the `"home": …` block is the base\'s (the text before `"home":` joined to the text from `"chat":`, SHA-256 ' + BASE_REST_SHA.slice(0, 12) + '…) — device, timing, taps, swipes and the other screens are untouched — failing: ' + JSON.stringify(F(h5)));
}
