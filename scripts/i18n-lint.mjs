/* i18n leak lint (static pseudo-locale equivalent — DECISIONS §B④).
 *
 * Flags user-facing English string literals assigned to a DOM text/aria sink
 * that DON'T flow through `strings.KEY || '...'`. Any hit is a hardcoded string
 * that would survive translation (an English leak). Advisory report; exits 1 if
 * any hard leaks are found so CI/smoke can gate.
 *
 *   node scripts/i18n-lint.mjs [--root <dir>]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const ROOT = argv.includes('--root') ? argv[argv.indexOf('--root') + 1] : join(__dirname, '..');
const DIR = join(ROOT, 'src', 'components');
const SHELLS_DIR = join(ROOT, 'src', 'shells');   // A4: shells lint too (window.SL/s./sl. count as clean)
const SKIP = new Set(['icons.js', 'icons.iife.js']);
// Never-translated tokens: currency ticker, file-format labels, protocol names.
const ALLOW = new Set(['IXI', 'GIF', 'QR', 'URL', 'PIN', 'ID']);

// Direct DOM sinks: the RHS/argument is what actually reaches the user.
const SINKS = [
  { re: /\.textContent\s*=\s*(.+)$/, label: 'textContent' },
  { re: /\.(?:title|placeholder|ariaLabel)\s*=\s*(.+)$/, label: 'property' },
  { re: /setAttribute\(\s*['"](?:aria-label|title|placeholder|aria-description)['"]\s*,\s*(.+?)\)\s*;?\s*$/, label: 'setAttribute' },
];
// A user-facing literal = starts with a letter, has a space OR >1 word char,
// i.e. not a token/class/id/glyph name.
function isCopy(lit) {
  const v = lit.trim();
  if (!/^['"]/.test(v)) return false;                 // not a bare string literal
  const inner = v.slice(1, v.lastIndexOf(v[0]));
  if (!inner || ALLOW.has(inner.trim())) return false;
  if (/^[\w-]+$/.test(inner) && inner.length < 3) return false;  // 'x', 'ok' glyph-ish
  return /[A-Za-z]/.test(inner) && /\s|[.!?…]/.test(inner) || /^[A-Z]/.test(inner);
}

/* ★ #420: a NARROW, AUDITED opt-out for DEV-ONLY diagnostic surfaces.
 *
 * The dev HUD and the load probe render English deliberately — they are engineering
 * instruments, aria-hidden, and gated behind dev mode (the #301 precedent). They must
 * still not be able to hide: the marker has to be written on the sink line itself, and
 * every use is COUNTED and printed, so an exemption cannot accumulate quietly. A smoke
 * pin caps the total. Evading the linter by assembling the literal in a variable would
 * have been easier and strictly worse — this way the exemption is greppable. */
const DEV_MARK = 'i18n-lint-ok:dev';
let exempt = 0;

const hits = [];
function lintFile(dir, f) {
  const lines = readFileSync(join(dir, f), 'utf8').split('\n');
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith('*') || t.startsWith('//') || t.startsWith('/*')) return;
    if (line.includes(DEV_MARK)) { exempt += 1; return; }
    for (const s of SINKS) {
      const m = line.match(s.re);
      if (!m) continue;
      const rhs = m[1].trim();
      // clean = flows through the dictionary: components use `strings.*`; shells
      // use `s.* / sl.* / window.SL.*` (A4 — same channel, shell receiver names)
      if (/\bstrings\b|\bwindow\.SL\b|\bsl?\./.test(rhs)) return;
      // extract the leading string literal from the RHS
      const litm = rhs.match(/^['"](?:[^'"\\]|\\.)*['"]/);
      if (litm && isCopy(litm[0])) hits.push({ f, line: i + 1, sink: s.label, text: litm[0] });
    }
  });
}
for (const f of readdirSync(DIR).filter((x) => x.endsWith('.js') && !SKIP.has(x))) lintFile(DIR, f);
for (const f of readdirSync(SHELLS_DIR).filter((x) => x.endsWith('.html'))) lintFile(SHELLS_DIR, f);

if (!hits.length) {
  console.log('i18n-lint: no hardcoded user-facing strings in direct DOM sinks ✓'
    + (exempt ? ` (${exempt} dev-only line(s) exempted via ${DEV_MARK})` : ''));
  process.exit(0);
}
console.log(`i18n-lint: ${hits.length} possible hardcoded string(s):`);
for (const h of hits) console.log(`  ${h.f}:${h.line} [${h.sink}] ${h.text}`);
process.exitCode = 1;
