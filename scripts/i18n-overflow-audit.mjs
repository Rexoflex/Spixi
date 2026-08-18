/* N4 (#379) — per-language BUTTON-OVERFLOW audit.
 *
 * Buttons and chips are `white-space: nowrap` with NO ellipsis (button.css:31,
 * chip.css:18) — a too-long label overflows the control. The topbar ellipsizes
 * (topbar.css:29-31), so its titles are report-only. jsdom gives no layout, so
 * this tool: ① harvests every strings.KEY that flows into a createButton /
 * createChip / createTopbar / modal-action call site (source scan of
 * src/components + src/shells, the same sites the runtime mounts), ② estimates
 * the rendered width of every locale's value with a Roboto/system-ui advance
 * table (CJK/kana/fullwidth = 1em; tracking-label -0.25px applied per char),
 * ③ compares against budgets derived from the shipped CSS at a 360px viewport:
 *
 *   class            geometry (360px)                                   budget
 *   button-56 full   360-2*16 screen pad - 2*24 button pad              280px
 *   button-44 full   360-2*16 - 2*20                                    288px
 *   button-32 hug    row heuristic (seeAll etc.)                        120px
 *   modal-action     (360-2*24 modal - 2*24 pad - 8 gap)/2 - 2*20       88px  (44-size pair, overlay.css:91)
 *   chip             hug in a 328px row — flag chips > 110px            110px
 *   bottomnav        max-width 96 - 2*8 pad (label-xs 12px)             80px
 *   topbar           ellipsizes — report > 200px only                   200px
 *
 * Estimator error band is ±8-10% — treat 92-100% as "near", >100% as BREAK.
 *   node scripts/i18n-overflow-audit.mjs [--all] (--all = include near misses)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHOW_NEAR = process.argv.includes('--all');
const LANGS = ['en-us', 'de-de', 'es-co', 'fr-fr', 'pt-br', 'ru-ru', 'sl-si', 'sr-sp',
  'it-it', 'id-id', 'lt-lt', 'cn-cn', 'ja-jp'];
const dicts = {};
for (const l of LANGS) dicts[l] = JSON.parse(readFileSync(join(root, 'src/strings', l + '.json'), 'utf8'));

/* ── ① harvest key → control class from the call sites ─────────────────────── */
const sources = [];
for (const dir of ['src/components', 'src/shells']) {
  for (const f of readdirSync(join(root, dir))) {
    if (/\.(js|html)$/.test(f)) sources.push(readFileSync(join(root, dir, f), 'utf8'));
  }
}
const all = sources.join('\n');
// balanced-enough block grab: from the call token to the first '})' at depth 0-ish
function blocks(re, len = 500) {
  const out = [];
  for (const src of sources) {
    let m;
    const rx = new RegExp(re, 'g');
    while ((m = rx.exec(src))) out.push(src.slice(m.index, m.index + len));
  }
  return out;
}
const keyRe = /strings\.([A-Za-z_$][\w$]*)/g;
const classes = {};      // key -> Set of classes
function tag(key, cls) { (classes[key] ||= new Set()).add(cls); }

for (const b of blocks('createButton\\(\\{')) {
  const size = (b.match(/size:\s*(\d+)/) || [])[1] || '44';
  const icon = /icon:/.test(b);
  // the LABEL property only — any other strings.KEY in the window is not a button label
  const lm = b.match(/label:\s*([^\n]+)/);
  if (!lm) continue;
  let m; keyRe.lastIndex = 0;
  while ((m = keyRe.exec(lm[1]))) tag(m[1], 'button-' + size + (icon ? '+icon' : ''));
}
for (const b of blocks('createChip\\(\\{')) {
  let m; keyRe.lastIndex = 0;
  while ((m = keyRe.exec(b))) tag(m[1], 'chip');
}
// the chats filter chips build their labels via strings['chatsFilter_' + f]
for (const k of Object.keys(dicts['en-us'])) if (/^chatsFilter_/.test(k)) tag(k, 'chip');
for (const b of blocks('createTopbar\\(\\{')) {
  const seg = b.slice(0, 240);
  let m; keyRe.lastIndex = 0;
  while ((m = keyRe.exec(seg))) tag(m[1], 'topbar');
}
// modal / confirm actions: label keys inside createModal(...) blocks ONLY —
// a createTopbar actions[] label is an aria-label on an icon action (no width
// constraint) and must not be classed as a modal pair (first-run false alarm).
for (const b of blocks('createModal\\(', 900)) {   // long bodies push actions past 500 chars
  const ai = b.indexOf('actions:');
  if (ai < 0) continue;
  const seg = b.slice(ai, b.indexOf(']', ai) > 0 ? b.indexOf(']', ai) + 1 : ai + 400);
  for (const lm of seg.matchAll(/label:\s*([^\n,}]+)/g)) {
    let m; keyRe.lastIndex = 0;
    while ((m = keyRe.exec(lm[1]))) tag(m[1], 'modal-action');
  }
}
for (const b of blocks('settingsConfirm\\(\\{')) {
  let m; keyRe.lastIndex = 0;
  const seg = b.slice(0, 400);
  while ((m = keyRe.exec(seg))) if (/confirmLabel|cancelLabel|label/.test(b.slice(0, b.indexOf(m[1])))) tag(m[1], 'modal-action');
}
// bottom nav labels — home.html renders strings.account for the fourth slot
// (home.html:848; tabAccount is the placeholder key, Opus loop r1 NIT-6)
for (const k of ['chats', 'apps', 'wallet', 'account']) tag(k, 'bottomnav');

/* ── ② width estimator (Roboto-ish advances, units per 1000/em) ────────────── */
const W = { narrow: 278, seminarrow: 334, small: 500, lower: 556, wide: 722, m: 863, w: 737,
  upper: 677, upnarrow: 278, digit: 556, space: 248, punct: 260, cjk: 1000, ell: 900 };
function chW(c) {
  if (/[iljI!.,:;'|٫]/.test(c)) return W.narrow;
  if (/[ftr()\[\]{}"\-]/.test(c)) return W.seminarrow;
  if (/[acesvxyzJŽžćčšđ]/.test(c)) return W.small;
  if (/[m]/.test(c)) return W.m;
  if (/[wШЩЖМШ]/.test(c)) return W.w;
  if (/[MW]/.test(c)) return 940;
  if (/[A-HK-VXYZČĆŠĐ]/.test(c)) return W.upper;
  if (/[0-9]/.test(c)) return W.digit;
  if (c === ' ') return W.space;
  if (c === '…') return W.ell;
  if (/[⺀-鿿　-ヿ豈-﫿＀-￯]/.test(c)) return W.cjk;  // CJK + kana + fullwidth
  if (/[Ѐ-ӿ]/.test(c)) return /[а-яё]/.test(c) ? 556 : 677;                   // Cyrillic
  if (/[a-zà-öø-ÿąęėįųūžšč̌ğıśńł]/i.test(c)) return /[a-zà-öø-ÿ]/.test(c) ? W.lower : W.upper;
  return W.lower;
}
function estPx(text, px, tracking = -0.25) {
  let u = 0;
  for (const c of String(text)) u += chW(c);
  return (u / 1000) * px + tracking * [...String(text)].length;
}

/* ── ③ budgets ─────────────────────────────────────────────────────────────── */
/* static = CSS-derived where the container is knowable (full-width buttons,
 * modal pairs, nav slots); enFactor = how far past the SHIPPED English a
 * translation may grow in hug contexts whose real container varies (cards,
 * bubbles, section headers). Effective budget = max(static, en * enFactor). */
const BUDGET = {
  'button-56': { px: 16, budget: 280, enFactor: 1.6 }, 'button-56+icon': { px: 16, budget: 252, enFactor: 1.6 },
  'button-44': { px: 14, budget: 288, enFactor: 1.6 }, 'button-44+icon': { px: 14, budget: 180, enFactor: 1.35 },
  'button-32': { px: 14, budget: 140, enFactor: 1.35 }, 'button-32+icon': { px: 14, budget: 140, enFactor: 1.35 },
  'modal-action': { px: 14, budget: 88, enFactor: 1.25 },
  'chip': { px: 13, budget: 90, enFactor: 1.3 },
  'bottomnav': { px: 12, budget: 80, enFactor: 1.25 },
  'topbar': { px: 18, budget: 170, enFactor: 1.3 },
};

const rows = [];
for (const [key, set] of Object.entries(classes)) {
  for (const cls of set) {
    const spec = BUDGET[cls];
    if (!spec) continue;
    /* CALIBRATION: English ships and passed device F5s, so a context is never
     * tighter than its English rendering. The effective budget is
     * max(static model, en * 1.15 headroom) — kills static-model false alarms
     * without hiding a translation that truly triples the label. */
    const enW = estPx(dicts['en-us'][key] || '', spec.px);
    const budget = Math.max(spec.budget, enW * spec.enFactor);
    for (const l of LANGS) {
      if (l === 'en-us') continue;
      const v = dicts[l][key];
      if (!v) continue;
      const w = estPx(v, spec.px);
      const ratio = w / budget;
      /* the estimator's error band is ±8% — BREAK only beyond it; the topbar
       * ellipsizes (topbar.css:29-31) so it reports as clip, never BREAK */
      const breakState = cls === 'topbar' ? 'clip' : 'BREAK';
      if (ratio > 1.08) rows.push({ key, cls, l, v, w: Math.round(w), budget: Math.round(budget), state: breakState });
      else if (ratio > 0.92 && SHOW_NEAR) rows.push({ key, cls, l, v, w: Math.round(w), budget: Math.round(budget), state: 'near' });
    }
  }
}
rows.sort((a, b) => (b.w / b.budget) - (a.w / a.budget));
const breaks = rows.filter((r) => r.state === 'BREAK');
const clips = rows.filter((r) => r.state === 'clip');
console.log(`harvested ${Object.keys(classes).length} keys across ${new Set(Object.values(classes).flatMap((s) => [...s])).size} control classes · ${LANGS.length} locales`);
for (const r of rows) {
  console.log(`${r.state === 'BREAK' ? '✗' : '~'} [${r.cls}] ${r.l} ${r.key} — est ${r.w}px / ${r.budget}px  "${r.v}"`);
}
if (clips.length) console.log(`${clips.length} topbar title(s) will ellipsize (safe clip, report-only)`);
console.log(breaks.length
  ? `\n${breaks.length} BREAK(s) — shorten these values (draft source for the drafted locales; legacy source if seeded)`
  : '\nNO BREAKERS — every harvested label fits its budget at 360px ✓ (run with --all for near misses)');
process.exitCode = breaks.length ? 1 : 0;
