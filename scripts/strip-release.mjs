#!/usr/bin/env node
/**
 * strip-release.mjs — the RELEASE PACKAGING STRIP (Session N, DECISIONS: the comment-strip fork).
 *
 * WHAT IT IS. A deterministic comment strip over an ALLOWLIST of shipped stylesheets,
 * run as a packaging step — never inside build-shells.mjs. The committed artifacts under
 * Spixi/Resources/Raw/html stay readable (the [WEBVIEW] console mirror reports line
 * numbers into the BUILT shell; dev builds keep them), every one of the ~4 000 pins keeps
 * reading the artifact it always read, and the repo diff is zero.
 *
 * WHY THE FORK MATTERS (handoff-2026-09-05b §6c). `build-shells --check` proves
 * committed ≡ fresh-build-of-source, and that ONE proof is the whole justification for
 * committing build output. A packaging strip breaks that chain:
 *     source → committed (proven) → PACKAGED (unproven) → store
 * so the same batch ships TWO gates, or the strip does not land:
 *   GATE 1  `--check`  packaged ≡ strip(committed): re-run the strip over the committed
 *           tree and byte-compare every file against the packaged tree. Proves the strip
 *           was deterministic and that nothing else changed on the way to the package.
 *   GATE 2  `scripts/smoke-packaged.mjs`: the smoke suite over the PACKAGED artifacts, at
 *           least once per release. Gate 1 only proves the strip was deterministic; gate 2
 *           proves it was harmless.
 *
 * SCOPE, deliberately small. CSS only, and only the allowlist below. CSS carries none of
 * the line-number risk that makes a JS strip delicate, and tokens.css is 69 % comments —
 * the highest ratio in the payload (perf-chat-open-brief §0 ④). The JS files are NOT on
 * the list: a JS strip moves the line numbers [WEBVIEW] traces by, and it needs the 55
 * built-artifact pin sources re-verified against a stripped tree first (§1 of the brief).
 *
 * THE STRIP. Remove every CSS comment, respecting string literals and url() tokens
 * (a "/*" inside a quoted string is content, not a comment), then collapse runs of blank
 * lines to one. Nothing else: no whitespace collapse, no reordering, no minification —
 * every declaration keeps its own line, so a diff of stripped vs committed is comments
 * only. Byte-for-byte deterministic for a given input (no timestamps, no paths).
 *
 * USAGE
 *   node scripts/strip-release.mjs --out <dir>            write the stripped allowlist into <dir>
 *   node scripts/strip-release.mjs --check <packagedDir>  GATE 1: <packagedDir>/<file> must equal
 *                                                         strip(committed <file>) for every allowlisted
 *                                                         file, and every other shipped html/css/js
 *                                                         file present there must be byte-identical
 *   node scripts/strip-release.mjs --stats                print sizes before/after, change nothing
 *   node scripts/strip-release.mjs --stdout <file>        print one stripped file (for a diff)
 *
 * The csproj runs `--out $(IntermediateOutputPath)spixi-strip/html` for Release builds and
 * swaps the allowlisted MauiAsset items for the stripped copies (Spixi.csproj, target
 * SpixiStripReleaseHtml). Set the MSBuild property SpixiStripHtml=false to ship the
 * committed files unchanged.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(root, 'Spixi', 'Resources', 'Raw', 'html');

/** The allowlist. Add a file here ONLY with its gate-2 run recorded in DECISIONS. */
export const STRIP_ALLOWLIST = ['spixi.tokens.css'];

/** CSS comment strip that respects strings and url() — the whole transform. */
export function stripCssComments(css) {
  let out = '';
  let i = 0;
  const n = css.length;
  while (i < n) {
    const c = css[i];
    // string literal: copy verbatim (handles escaped quotes)
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && css[j] !== c) { if (css[j] === '\\') j++; j++; }
      out += css.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    // UNQUOTED url( … ): copy verbatim up to the closing paren. A QUOTED url( "…" ) — with
    // any whitespace before the quote, which CSS allows — is left to the string branch above
    // on its next character. #46 auditor B: taking a quoted url here stopped at a ')' INSIDE
    // the quotes and desynced the scanner; the break-my-verdict reviewer then found the
    // whitespace form `url( "i)m/*g.png" )` still took this branch and DESTROYED the value.
    if (css.startsWith('url(', i)) {
      let k = i + 4;
      while (k < n && (css[k] === ' ' || css[k] === '\t' || css[k] === '\n' || css[k] === '\r')) k++;
      if (css[k] !== '"' && css[k] !== "'") {
        const j = css.indexOf(')', k);
        const end = j < 0 ? n : j + 1;
        out += css.slice(i, end);
        i = end;
        continue;
      }
      // quoted: copy `url(` + the whitespace, and let the string branch take the literal
      out += css.slice(i, k);
      i = k;
      continue;
    }
    // comment: drop it entirely. ★ #46 auditor B MAJOR-1: an UNTERMINATED comment used to
    // swallow the rest of the file silently — and both gates compare against this same
    // function, so nothing downstream could see the loss. Throw instead.
    if (c === '/' && css[i + 1] === '*') {
      const j = css.indexOf('*/', i + 2);
      if (j < 0) throw new Error('strip-release: unterminated CSS comment at offset ' + i + ' — refusing to strip');
      i = j + 2;
      continue;
    }
    out += c;
    i++;
  }
  // collapse runs of blank lines (a stripped comment often leaves its own line) → one blank line,
  // and drop whitespace-only lines that a stripped trailing comment left behind
  return out
    .split('\n')
    .map((l) => (l.trim() === '' ? '' : l.replace(/[ \t]+$/, '')))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '');
}

/** CLI — only when run directly; the suite imports stripCssComments + STRIP_ALLOWLIST. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
const args = process.argv.slice(2);
const flag = (name) => { const k = args.indexOf(name); return k >= 0 ? (args[k + 1] ?? '') : null; };

function listShipped(dir) {
  const out = [];
  const walk = (d, pre) => {
    for (const nme of readdirSync(d)) {
      const q = join(d, nme);
      if (statSync(q).isDirectory()) walk(q, pre + nme + '/');
      else out.push(pre + nme);
    }
  };
  if (existsSync(dir)) walk(dir, '');
  return out.sort();
}

function stripped(file) {
  const src = readFileSync(join(RAW, file), 'utf8');
  // NUL spelled as a char code, never as an escape or a literal: a backslash-u escape
  // round-trips into a literal NUL through tool-param decoding (#257) and then the
  // bundle's own NUL gate trips on THIS file
  const NUL = String.fromCharCode(0);
  if (src.indexOf(NUL) >= 0) throw new Error('strip-release: ' + file + ' contains a NUL byte — refusing (the #255 class)');
  const out = stripCssComments(src);
  if (out.indexOf(NUL) >= 0 || out.length === 0) throw new Error('strip-release: ' + file + ' stripped to something unusable');
  // ★ #46 auditor B MAJOR-1 + the break-my-verdict reviewer — POST-CONDITIONS that do not
  // depend on the scanner above AND do not read comment text: both sides are viewed through
  // an INDEPENDENT regex masker (strings blanked to spaces, then /* … */ removed — a second
  // implementation, not a call into the scanner), so a "--font-display:" or a "{" that lives
  // only inside a comment cannot fail the check (base.css has both today), and a value lost
  // to a scanner desync is a property-name or brace difference the masker DOES see. Checked:
  // no comment opener survives, braces balance, every custom-property name declared in the
  // source is declared in the output. Names use the CSS ident shape (--[\w-]+, not [a-z0-9-]).
  const view = (t) => t
    .replace(/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g, (m) => ' '.repeat(m.length))
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const vs = view(src), vo = view(out);
  const props = (t) => new Set([...t.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
  const lost = [...props(vs)].filter((k) => !props(vo).has(k));
  const braces = (t) => (t.match(/\{/g) || []).length - (t.match(/\}/g) || []).length;
  if (vo.indexOf('/*') >= 0) throw new Error('strip-release: ' + file + ' — a "/*" survived the strip (outside any string)');
  if (braces(vs) !== 0 || braces(vo) !== 0) throw new Error('strip-release: ' + file + ' — unbalanced braces outside strings/comments (src ' + braces(vs) + ', out ' + braces(vo) + ')');
  if (lost.length) throw new Error('strip-release: ' + file + ' — custom properties LOST by the strip: ' + lost.join(', '));
  return out;
}

if (args.includes('--stats')) {
  let before = 0, after = 0;
  for (const f of STRIP_ALLOWLIST) {
    const a = readFileSync(join(RAW, f)).length, b = Buffer.byteLength(stripped(f), 'utf8');
    before += a; after += b;
    console.log(`  ${f}: ${a} → ${b} bytes (−${Math.round((1 - b / a) * 100)} %)`);
  }
  console.log(`strip-release --stats: ${before} → ${after} bytes over ${STRIP_ALLOWLIST.length} file(s)`);
  process.exit(0);
}

const one = flag('--stdout');
if (one !== null) {
  if (!STRIP_ALLOWLIST.includes(one)) { console.error('strip-release: ' + one + ' is not on the allowlist'); process.exit(2); }
  process.stdout.write(stripped(one));
  process.exit(0);
}

const outDir = flag('--out');
if (outDir !== null) {
  if (!outDir) { console.error('strip-release: --out needs a directory'); process.exit(2); }
  mkdirSync(outDir, { recursive: true });
  for (const f of STRIP_ALLOWLIST) {
    const s = stripped(f);
    const dest = join(outDir, f);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, s, 'utf8');
    const back = readFileSync(dest, 'utf8');
    if (back !== s) { console.error('strip-release: SHORT WRITE on ' + dest); process.exit(1); }
    console.log(`  ✓ ${f} → ${dest} (${Buffer.byteLength(s, 'utf8')} bytes)`);
  }
  console.log(`strip-release: ${STRIP_ALLOWLIST.length} file(s) written to ${resolve(outDir)}`);
  process.exit(0);
}

const packaged = flag('--check');
if (packaged !== null) {
  if (!packaged || !existsSync(packaged)) { console.error('strip-release --check: packaged dir not found: ' + packaged); process.exit(2); }
  const problems = [];
  // (a) every allowlisted file in the package ≡ strip(committed)
  for (const f of STRIP_ALLOWLIST) {
    const p = join(packaged, f);
    if (!existsSync(p)) { problems.push(f + ': MISSING from the package'); continue; }
    const want = stripped(f), got = readFileSync(p, 'utf8');
    if (want !== got) problems.push(f + ': packaged ≠ strip(committed) (' + got.length + ' vs ' + want.length + ' chars)');
  }
  // (b) every OTHER shipped html/css/js present in the package is byte-identical to the committed one —
  //     the strip must touch nothing but its allowlist, and nothing else may change on the way
  for (const f of listShipped(packaged).filter((x) => /\.(html|css|js)$/.test(x) && !STRIP_ALLOWLIST.includes(x))) {
    const c = join(RAW, f);
    if (!existsSync(c)) { problems.push(f + ': in the package but NOT in the committed tree'); continue; }
    if (!readFileSync(c).equals(readFileSync(join(packaged, f)))) problems.push(f + ': packaged ≠ committed (not on the allowlist)');
  }
  // (c) ★ #46 auditor B: and the OTHER direction — every committed html/css/js SHIPS. (a)+(b)
  //     alone proved package ⊆ committed; a packaging step that DROPPED settings.html passed.
  //     Only a package that holds the whole tree can pass; the obj strip dir (allowlist only)
  //     is not a package and fails here by design — point --check at the DEPLOYED folder.
  for (const f of listShipped(RAW).filter((x) => /\.(html|css|js)$/.test(x))) {
    if (!existsSync(join(packaged, f))) problems.push(f + ': committed but MISSING from the package');
  }
  if (problems.length) {
    console.error('strip-release --check: GATE 1 FAILED — packaged ≢ strip(committed)\n  ' + problems.join('\n  '));
    process.exit(1);
  }
  console.log('strip-release --check: GATE 1 OK — packaged ≡ strip(committed) for ' + STRIP_ALLOWLIST.length + ' allowlisted file(s); every other shipped html/css/js is byte-identical in both directions (nothing extra, nothing missing)');
  process.exit(0);
}

console.error('strip-release: one of --out <dir> · --check <packagedDir> · --stats · --stdout <file>');
process.exit(2);
}
