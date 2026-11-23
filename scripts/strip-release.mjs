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
 * EVERY --out (plain and lean) refuses a folder that is Spixi/Resources (the whole folder: Raw, Fonts, Images, AppIcon, Splash) or
 * Spixi/Platforms or inside one of them (the build packs files there as assets), exit 1, nothing written; the one exception is the
 * source folder Raw/html itself together with --in-place (outFolderRefusal below; smoke-packaged strips its temp copy that way).
 * Round 2 (r2S-2): an out folder anywhere inside the project folder Spixi/ is refused too, except under Spixi/obj or Spixi/bin (the MAUI default items embed every
 * `**\*.css` of the project folder: read from the upstream targets, NOT proven by a MAUI build). Both writes (plain and lean) make a temp file with 'wx' and RENAME it over the
 * target, so a link of any kind (symlink, hard link) at a target is replaced, never written through. LIMIT (r2S-10b): the 'same folder under another name' tests that do not
 * need a link (letter case, device + inode) work only where the file system gives it: no inode (some exFAT / network drives on Windows) means the inode tests are blind there;
 * a case-insensitive file system is covered by the inode test, a case-insensitive one without inodes is not.
 * LIMIT (review round 4): a link planted inside obj or bin that points into the project folder (outside Resources / Platforms) is not refused — the exception is granted when any view says the folder is under obj or bin (a stricter test refused every build of a checkout reached through a linked folder, review round 4); a link into Resources/Raw, Resources or Platforms is still refused. Also recorded, not fixed: a linked checkout with a link inside Raw that points outside (as at the base for the lean path); a write that fails after its temp file was created can leave a partial temp (r4S-5).
 * --in-place is valid only with --out AND only for that source folder: any other out folder with --in-place is a usage error (exit 2).
 * A link anywhere in the out path is followed (the real path is tested too); a dangling link is refused; a link or a non-regular file
 * where a target would be written is refused by the pre-flight of the plain and of the lean write (outPreflight).
 *
 * The csproj runs `--out $(IntermediateOutputPath)spixi-strip/html` for Release builds and
 * swaps the allowlisted MauiAsset items for the stripped copies (Spixi.csproj, target
 * SpixiStripReleaseHtml). Set the MSBuild property SpixiStripHtml=false to ship the
 * committed files unchanged.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, realpathSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
/* ★ perflean (docs/contract-perflean.md § 3.3) — the LEAN strips (P-06 CSS, P-07 JS) live in
 * scripts/lib/lean-strip.mjs; the always-on gates (carrier multiset, line invariant) in
 * scripts/lib/lean-gates.mjs. With no lean flag and no SPIXI_PACKAGED_LEAN every mode below
 * runs exactly the code it ran before (the lean branch is taken first and exits), plus the
 * always-on gates inside --check, which pass on equal files. */
import { renameSync, unlinkSync, lstatSync, rmdirSync } from 'node:fs';
import { relative, isAbsolute, sep } from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolveLean, leanScope as leanScopeOf, stripCssLean, keepReason, lineOf } from './lib/lean-strip.mjs';
import { carrierDiff, formatCarrierDiff, lineInvariant, EXTERNAL_JS, JS_LINE_ANCHORS } from './lib/lean-gates.mjs';
export { stripJsComments, leanHtml, leanScope, stripCssLean, keepReason } from './lib/lean-strip.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(root, 'Spixi', 'Resources', 'Raw', 'html');

/** The allowlist. Add a file here ONLY with its gate-2 run recorded in DECISIONS. */
export const STRIP_ALLOWLIST = ['spixi.tokens.css'];
function listCssFiles(dir) {
  const out = [];
  const walk = (d, pre) => { for (const nme of readdirSync(d)) { const q = join(d, nme); if (statSync(q).isDirectory()) walk(q, pre + nme + '/'); else if (/\.css$/.test(nme)) out.push(pre + nme); } };
  if (existsSync(dir)) walk(dir, '');
  return out.sort();
}

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

/** CLI — only when run directly; the suite imports stripCssComments + STRIP_ALLOWLIST.
 *
 * ★★ 2026-09-07 (Damir, iOS walk R) — THIS GUARD SILENTLY DISABLED GATE 2 ON EVERY MAC,
 * AND IT HAD DONE SO SINCE THE FORK LANDED. The old form compared two strings:
 *     import.meta.url === pathToFileURL(process.argv[1]).href
 * Node resolves an ESM module to its REALPATH, but `process.argv[1]` is the path exactly
 * as the caller typed it. On macOS `/var` is a symlink to `/private/var`, and
 * `smoke-packaged.mjs` copies the tree into `tmpdir()` — which on macOS is always under
 * `/var/folders/…`. So the copy's script saw
 *     import.meta.url  = file:///private/var/folders/…/strip-release.mjs
 *     process.argv[1]  =         /var/folders/…/strip-release.mjs
 * the two never matched, THE ENTIRE CLI BLOCK BELOW WAS SKIPPED, and the process exited
 * 0 with no output and nothing written. Gate 2 then failed at its own gate-1 step with
 * "packaged ≠ strip(committed) (101683 vs 30688)" — the packaged file was simply never
 * stripped. Measured, not reasoned: status 0, stdout "", stderr "", file unchanged.
 * The Linux container never saw it because its tmpdir is a real path.
 * ⚠ It fails LOUD here only because gate 1 runs inside gate 2. A guard of this shape in
 * a script whose absence is not separately gated would fail SILENTLY. The MSBuild leg is
 * safe by luck and by one belt: it invokes an unsymlinked repo path, and Spixi.csproj
 * raises <Error> when the strip writes no file.
 * ★ THE FIX COMPARES REALPATHS ON BOTH SIDES, so a symlinked invocation — /var, /tmp, a
 * symlinked home, a worktree — resolves to the same file. try/catch because argv[1] may
 * name something unstatable, and a main-module test must never throw.
 * ⚠ OWED: a pin. The property is "the CLI runs when this file is invoked through a
 * SYMLINKED path", and no pin in the suite asserts it — which is exactly why a broken
 * gate went unnoticed. Build it with the batch, not as a comment. */
const isMainModule = (() => {
  if (!process.argv[1]) return false;
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch (_) { return false; }
})();
/* ★ perflean: under a packaged LEAN-CSS run (SPIXI_PACKAGED_LEAN = css or css,js — set by
 * smoke-packaged.mjs) every linked stylesheet ships as strip(committed), so the list an IMPORTER
 * sees (the smoke's Session F row) names every *.css under Raw/html. Off (no env) = the one entry
 * above, unchanged.
 * WHERE THE ENV IS READ (#46 r1 C-8 — exactly two places, nowhere else):
 *   1. the line below, and only for an IMPORTER (not the CLI): the extended STRIP_ALLOWLIST;
 *   2. the CLI's LEAN_MODE line further down, and only when the run IS a --check: `--check` is an
 *      argument, no lean flag is given (a flag wins), and none of --out / --stats / --stdout is given
 *      (--out together with --check is refused before that line, exit 2).
 * So --out, --stats and --stdout never see the env (lead ruling 2026-11-13 — a developer shell that
 * exports it must not change what a Release build packs), and --check in lean mode uses leanScope(),
 * not this list. */
const LEAN_ENV = resolveLean([], process.env.SPIXI_PACKAGED_LEAN);
if (!isMainModule && LEAN_ENV.css) for (const f of listCssFiles(RAW)) if (!STRIP_ALLOWLIST.includes(f)) STRIP_ALLOWLIST.push(f);
if (isMainModule) {
const args = process.argv.slice(2);
const flag = (name) => { const k = args.indexOf(name); return k >= 0 ? (args[k + 1] ?? '') : null; };
// ★ perflean: an unknown --flag is a usage error (lead ruling 2026-11-13: a typo such as --lean-j
// must not produce a tokens-only output that looks like success). The one change of the no-flag CLI.
{
  const KNOWN = ['--out', '--check', '--stats', '--stdout', '--lean-css', '--lean-js', '--in-place'];
  const USAGE = 'strip-release: one of --out <dir> · --check <packagedDir> · --stats · --stdout <file>, optionally with --lean-css and / or --lean-js (and --in-place only with --out)';
  const modes = [], seenVal = {};
  for (let k = 0; k < args.length; k++) {
    if (args[k] === '--stats') modes.push('--stats');
    if (args[k] === '--out' || args[k] === '--check' || args[k] === '--stdout') { modes.push(args[k]); seenVal[args[k]] = (seenVal[args[k]] || 0) + 1; k++; continue; }
    if (args[k].startsWith('--') && !KNOWN.includes(args[k])) { console.error('strip-release: unknown flag ' + args[k] + '\n' + USAGE); process.exit(2); }
    // #46 r1 C-8: a token that is neither a known flag nor the value of --out / --check / --stdout (a one-dash
    // `-lean-css`, a stray `lean-css`) is a usage error too — it would otherwise be ignored and give a no-flag output
    if (!args[k].startsWith('--')) { console.error('strip-release: unexpected argument ' + JSON.stringify(args[k]) + ' (not a known flag, not the value of --out / --check / --stdout)\n' + USAGE); process.exit(2); }
  }
  // #46 r1 C-8: --out and --check are two runs; together they wrote and never checked
  if (args.includes('--out') && args.includes('--check')) { console.error('strip-release: --out and --check cannot be given together (write the package, then check it in a second call)\n' + USAGE); process.exit(2); }
  // #46 r2 C-3: one run = ONE mode, each value flag at most once — for EVERY invocation (no caller passes two: the csproj
  // passes `--out "<dir>."`, the suite and the pins one of --check / --out / --stats / --stdout, GATE 44 nothing). Before,
  // `--check X --stats` exited 0 without a check, `--check A --check B` checked A only, `--out A --out B` wrote A only.
  for (const [f, c] of Object.entries(seenVal)) if (c > 1) { console.error('strip-release: ' + f + ' given ' + c + ' times (each of --out / --check / --stdout at most once)\n' + USAGE); process.exit(2); }
  if (modes.length > 1) { console.error('strip-release: give exactly one of --out / --check / --stats / --stdout (got ' + modes.join(', ') + ')\n' + USAGE); process.exit(2); }
  // #46 r2 S-2: --in-place (strip the source folder itself) is an --out option only. Leanfollow R2: it is valid with ANY --out
  // (plain or lean), because the plain --out is refused for the source folder too (outFolderRefusal); with no --out it stays a usage error
  if (args.includes('--in-place') && modes[0] !== '--out') { console.error('strip-release: --in-place is valid only together with --out <dir>\n' + USAGE); process.exit(2); }
}
// ★ perflean: a lean mode takes its own branch and exits there. The flags select it; the env
// SPIXI_PACKAGED_LEAN only when the run IS a --check (the in-suite GATE 1 runs --check with no flag) —
// never with --stats / --stdout, which a --check argument would otherwise have let it reach (#46 r1 C-8)
const LEAN_MODE = resolveLean(args, args.includes('--check') && !args.includes('--stats') && !args.includes('--stdout') ? process.env.SPIXI_PACKAGED_LEAN : undefined);
if (LEAN_MODE.error) { console.error('strip-release: ' + LEAN_MODE.error); process.exit(2); }
if (LEAN_MODE.source !== 'off') leanCli(args, flag, LEAN_MODE);

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
  //
  // ★ Session O #46 (auditor C NIT-2, re-graded up by the verifier): THE ORDER WAS WRONG AND
  // IT THREW ON CORRECT INPUT. The masker used to blank strings FIRST and remove comments
  // second, so an apostrophe inside a comment opened a "string" that ran to the next
  // apostrophe in the NEXT comment and swallowed the code between them:
  //     /* Damir's */ .a { /* Bob's */ --k: 1; }
  // masked `'s */ .a { /* Bob'` to spaces, taking the `{` with it, and the brace check then
  // failed a file the scanner had stripped perfectly. Comments now win, because in CSS they
  // do: a `/*` outside a string starts a comment, and a quote inside a comment is text.
  // ONE left-to-right pass keeps that precedence honest — the regex engine advances a
  // position at a time, so whichever construct STARTS first consumes the other, whatever
  // order the alternation happens to be written in — and it is still a SECOND
  // implementation (a regex scanner, never a call into stripCssComments), which is the whole
  // point of the post-condition. Comments are removed; strings are blanked to equal-length
  // spaces so offsets and brace counts stay comparable between src and out.
  // ★ #46 r1 MINOR-1: THE PREVIOUS NOTE HERE WAS WRONG, AND IT WAS THE #772 CLASS — a
  // comment asserting a property the code did not have. It said an UNQUOTED `url(…)`
  // holding a literal `/*` was "harmless because src and out are viewed identically".
  // They are not. The scanner copies that url() verbatim to `out` and removes the REAL
  // comment after it, so `out` no longer holds the `*/` this view needs to close the
  // runaway match — the alternation then finds no comment at all, `/*` survives into `vo`,
  // and `stripped()` THROWS on correct input:
  //     .zz { background: url(x/*y); }   /* real */   .zz2 { --zz-k4: 1; }
  // So the view now HAS the scanner's own unquoted-url branch: an unquoted `url( … )` is
  // consumed as one unit (blanked to equal-length spaces, like a string) before any `/*`
  // inside it can open a comment. It is written first for readability only — its position
  // in the alternation is inert, because the url() starts earlier in the input than the
  // `/*` it contains and the earliest START wins. A url whose first non-space character is
  // a quote is deliberately NOT taken here — that is the string branch's job, as in the scanner.
  // ⚠ What this view still cannot do, stated honestly — two gaps, both of which FAIL LOUD
  // (a thrown post-condition on valid CSS), never silently:
  //   1. An unquoted `url(` with NO closing paren is not matched. The scanner copies it to
  //      end-of-file; the view falls through to the comment/string alternation.
  //   2. The view's string branches EXCLUDE newlines (`[^"\\\n]`) and the scanner's do not:
  //      it runs `while (j < n && css[j] !== c)` straight across line breaks. So a MULTI-LINE
  //      string containing a `/*` is one literal to the scanner (copied verbatim) and is not
  //      a string to the view at all — the `/*` inside it then opens a comment match in the
  //      view that reaches a `*/` in `src` and finds none in `out` (the real comment after it
  //      having been stripped), and the "a /* survived the strip" Error fires on correct CSS.
  //      Not fixed: the input is pathological, no stylesheet here has one, and the failure
  //      names itself. Fixing it means teaching the view multi-line strings — which is the
  //      third step toward being the CSS parser this deliberately is not.
  // The view is a REGEX CROSS-CHECK, not a CSS parser — it exists to catch a scanner desync
  // as a brace or property-name difference, not to be a second correct tokenizer.
  const view = (t) => t.replace(
    /url\(\s*(?!["'])[^)]*\)|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g,
    (m) => (m.startsWith('/*') ? '' : ' '.repeat(m.length)),
  );
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
  // leanfollow R2: the same refusal as the lean path (one function), BEFORE anything is created
  { const why = outFolderRefusal(outDir, { inPlace: args.includes('--in-place') }); if (why) { console.error(why.text); process.exit(why.code); } }
  // leanfollow round 1 (r1S-2): the same pre-flight as the lean path (one function): a target that is a link or not a regular file (a link to a file of
  // Resources/Raw would have been written THROUGH), a folder on the way that is a link or a file, an out folder that is a file: refused, nothing written
  { const pre = outPreflight(resolve(outDir), STRIP_ALLOWLIST); if (pre.length) { console.error(preflightText(pre)); process.exit(1); } }
  // leanfollow round 2 (r2S-1, r2S-4): the plain write is the lean write in small: resolve(outDir) once, a temp file made with 'wx' (it never existed) next to each target,
  // read back, then RENAMED over the target — a link of ANY kind at the target (a symlink, a hard link) is replaced, never written through
  const outAbs = resolve(outDir);
  mkdirSync(outAbs, { recursive: true });
  for (const f of STRIP_ALLOWLIST) {
    const s = stripped(f);
    const dest = join(outAbs, f);
    mkdirSync(dirname(dest), { recursive: true });
    const tmpName = dest + '.strip-tmp-' + process.pid + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    let made = false;   // r3S-5: only a temp file THIS run created is unlinked (an EEXIST of the 'wx' create leaves the other file alone)
    try {
      writeFileSync(tmpName, s, { encoding: 'utf8', flag: 'wx' });
      made = true;
      if (readFileSync(tmpName, 'utf8') !== s) throw new Error('SHORT WRITE on ' + tmpName);
      renameRetry(tmpName, dest);
    } catch (e) {
      if (made) { try { unlinkSync(tmpName); } catch (_) { /* gone */ } }
      console.error('strip-release: WRITE FAILED on ' + dest + ' — ' + (e && e.message)); process.exit(1);
    }
    if (readFileSync(dest, 'utf8') !== s) { console.error('strip-release: SHORT WRITE on ' + dest); process.exit(1); }
    console.log(`  ✓ ${f} → ${dest} (${Buffer.byteLength(s, 'utf8')} bytes)`);
  }
  console.log(`strip-release: ${STRIP_ALLOWLIST.length} file(s) written to ${outAbs}`);
  process.exit(0);
}

const packaged = flag('--check');
if (packaged !== null) {
  if (!packaged || !existsSync(packaged)) { console.error('strip-release --check: packaged dir not found: ' + packaged); process.exit(2); }
  const problems = [];
  // ★ #46 r2 C-8 (added before the base loops, which stay as they were): an entry of the package that is not a regular
  //   file or a directory (a FIFO, a socket, a dangling link, a link loop, a link to a directory) is reported and never
  //   opened — the loops below would hang on a FIFO or die on a dangling link with a bare stack
  { const bad = packageEntryProblems(packaged); if (bad.length) { console.error('strip-release --check: GATE 1 FAILED — the package holds entries that are not regular files (never opened)\n  ' + bad.join('\n  ')); process.exit(1); } }
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
  // ★ #46 r1 C-2: (c) above counts a DIRECTORY named like a shipped file as "there" (existsSync). Its lines stay
  //   as they were at the base commit; this loop adds the rule that the path must be a regular FILE in the package.
  for (const f of listShipped(RAW).filter((x) => /\.(html|css|js)$/.test(x))) {
    const pf = join(packaged, f);
    if (existsSync(pf) && !isFile(pf)) problems.push(f + ': in the package, but NOT a regular file (a directory or another kind of entry has its name)');
  }
  // ★ perflean: ALWAYS — the carrier multiset of every shipped file + the line invariant of the three external scripts
  problems.push(...alwaysOnGates(packaged));
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

/* ═══════════════════════ ★ perflean — the lean CLI and the always-on gates ═══════════════════════ */

function listShippedAll(dir) {
  const out = [];
  const walk = (d, pre) => { for (const nme of readdirSync(d)) { const q = join(d, nme); if (statSync(q).isDirectory()) walk(q, pre + nme + '/'); else out.push(pre + nme); } };
  if (existsSync(dir)) walk(dir, '');
  return out.sort();
}

/** #46 r2 C-8: walk the package with lstat; every entry must be a directory (not a link) or a regular file, or a link
 *  that resolves (stat, the kernel follows it) to a regular file. A dangling link, a link loop, a link to a directory, a
 *  FIFO, a socket or a device is a problem line; nothing here OPENS a file. → problem lines. */
function packageEntryProblems(dir) {
  const P = [];
  const walk = (d, pre) => {
    let names;
    try { names = readdirSync(d); } catch (e) { P.push((pre || '.') + ': cannot be listed (' + (e && e.code) + ')'); return; }
    for (const nme of names.sort()) {
      const q = join(d, nme), rel = pre + nme;
      let st;
      try { st = lstatSync(q); } catch (e) { P.push(rel + ': cannot be read (' + (e && e.code) + ')'); continue; }
      if (st.isDirectory()) { walk(q, rel + '/'); continue; }
      if (st.isFile()) continue;
      if (st.isSymbolicLink()) {
        let t;
        try { t = statSync(q); } catch (e) { P.push(rel + ': a ' + (e && e.code === 'ELOOP' ? 'link loop' : 'dangling link') + ' (' + (e && e.code) + ') — not a regular file'); continue; }
        if (!t.isFile()) P.push(rel + ': a link to ' + (t.isDirectory() ? 'a directory (not followed)' : 'something that is not a regular file'));
        continue;
      }
      P.push(rel + ': not a regular file (' + (st.isFIFO() ? 'a FIFO' : st.isSocket() ? 'a socket' : 'a device or another special file') + ')');
    }
  };
  walk(dir, '');
  return P;
}

/** A path counts as a shipped file only when it is a regular FILE (#46 r1 C-2: `existsSync` let a
 *  directory named `spixi.bundle.js` stand in for the script). A symlink to a regular file counts
 *  (stat follows it, as the packaging copy would). Never throws. */
function isFile(p) {
  try { return statSync(p).isFile(); } catch (_) { return false; }
}

/** The gates that run in EVERY --check (contract § 3.3), flags or not: for every shipped
 *  html / css / js that is a regular file on both sides, the carrier multiset of the packaged file
 *  equals the committed one (the message names the carrier); for the three external scripts, the
 *  line invariant (count + anchors + subsequence). Returns one problem line per finding.
 *  COUNT GUARD (#46 r1 C-2): each of the EXTERNAL_JS files must have been compared, or that is a
 *  problem too — so "the 3 external scripts keep their lines" is never said of fewer than 3.
 *  `seen` (optional) receives { ext: <the number of external scripts compared> }. */
function alwaysOnGates(packagedDir, seen = {}) {
  const problems = [];
  const compared = new Set();
  for (const f of listShippedAll(packagedDir).filter((x) => /\.(html|css|js)$/.test(x))) {
    const c = join(RAW, f), pf = join(packagedDir, f);
    if (!isFile(c) || !isFile(pf)) continue;         // (b) / the regular-file rules report it
    const a = readFileSync(c, 'utf8'), b = readFileSync(pf, 'utf8');
    const d = carrierDiff(a, b);
    if (d.length) problems.push(...formatCarrierDiff(f, d).split('\n'));
    if (EXTERNAL_JS.includes(f)) {
      compared.add(f);
      for (const p of lineInvariant(a, b, { anchors: JS_LINE_ANCHORS[f] || [], subsequence: true })) problems.push(f + ': line invariant — ' + p);
    }
  }
  for (const f of EXTERNAL_JS) if (!compared.has(f)) problems.push(f + ': line invariant compared NOTHING (not a regular file in the package and in the committed tree) — ' + compared.size + ' of ' + EXTERNAL_JS.length + ' external scripts compared');
  seen.ext = compared.size;
  return problems;
}

/** r3S-4 (UNPROVEN on Windows: written from the documented behaviour, not run there): a rename over a file that another process holds open (a virus scanner, a Visual Studio design-time
 *  build) can fail on Windows with EPERM / EACCES / EBUSY for a moment. On win32 the rename is tried up to 5 times, 100 ms apart, for those codes; every other platform and every other
 *  code fails at once. After the last try the original error goes up (the loud failure of the caller). */
function renameRetry(from, to) {
  for (let n = 1; ; n++) {
    try { renameSync(from, to); return; } catch (e) {
      if (process.platform !== 'win32' || n >= 5 || !e || !['EPERM', 'EACCES', 'EBUSY'].includes(e.code)) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
}

/** ★ leanfollow R2 (review round 5 of Speed lean, r5B-2; widened in round 1, r1S-4) — THE ONE RULE OF EVERY --out (plain and lean). Returns null (allowed) or
 *  { code, text }: code 1 = REFUSED (the caller prints the text, writes nothing, exits 1), code 2 = a usage error (--in-place with another folder).
 *  Why: the asset glob of Spixi.csproj is `Resources\Raw\**`, so every file under Spixi/Resources/Raw ships; the MAUI default globs pack Resources\Fonts,
 *  Resources\Images, Resources\AppIcon, Resources\Splash and, under Spixi/Platforms, the Android Assets and Resources. An out folder there puts extra files into
 *  the next package (and a lean out folder inside Raw/html is read as source by the next run).
 *  Refused: the out folder is Spixi/Resources (the WHOLE folder, Raw included) or Spixi/Platforms of the tree this script belongs to, or inside one of them — by
 *  three tests, each against Spixi/Resources/Raw, Raw/html, Spixi/Resources and Spixi/Platforms: (a) the REAL path (the nearest existing parent resolved, links
 *  followed: a link OUTSIDE the tree that points into it is caught here, on Linux by this test alone), (b) the path AS WRITTEN (lexical; a link inside the tree
 *  that points outside gives a real path outside, and the walkers and the glob follow it; the lexical "same" test is part of it), and (c) device + inode of the
 *  out folder and of every parent (a file system that ignores letter case: `Raw/HTML` is `Raw/html`). `..` counts only as a whole path segment (a folder named
 *  `..lean` is inside). A dangling link as the out folder or as a parent (lstat walk) is refused too (the mkdir through it would create its target).
 *  ONE exception: the out folder IS the source folder Raw/html (same tests) AND inPlace (--in-place) is true: smoke-packaged strips its temp COPY in place.
 *  Without --in-place the source folder is refused too (the gates would be blind afterwards: the stripped files become "the committed tree"). With --in-place
 *  and ANY OTHER out folder that passed every test above: code 2 (--in-place means "the source folder itself"; a typo must not look like success).
 *  `lean` only picks the wording of the old lean text. */
export function outFolderRefusal(outDir, { inPlace = false, lean = false } = {}) {
  const outAbs = resolve(outDir);
  const realish = (q) => { const rest = []; let x = q; while (!existsSync(x)) { const up = dirname(x); if (up === x) break; rest.unshift(x.slice(up.length).replace(/^[\\/]/, '')); x = up; } let r = x; try { r = realpathSync(x); } catch (_) { /* keep */ } return join(r, ...rest); };
  const realOf = (q) => { try { return realpathSync(q); } catch (_) { return q; } };
  const idOf = (q) => { try { const st = statSync(q, { bigint: true }); return st.ino ? st.dev + ':' + st.ino : null; } catch (_) { return null; } };   // r3S-6: BigInt dev + ino (a 64-bit inode loses bits as a JS number)
  const outReal = realish(outAbs);
  const outsideText = (rel) => rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel);
  // where does the out folder stand against `base` (a folder of this tree)? 'same' | 'inside' | 'outside'
  const standing = (base) => {
    const baseReal = realOf(base), baseId = idOf(baseReal);
    const relReal = relative(baseReal, outReal);
    if (relReal === '' || (baseId !== null && idOf(outReal) === baseId) || [base, baseReal].some((b) => relative(resolve(b), outAbs) === '')) return 'same';
    if (!outsideText(relReal)) return 'inside';
    if ([base, baseReal].some((b) => { const rel = relative(resolve(b), outAbs); return rel !== '' && !outsideText(rel); })) return 'inside';
    if (baseId !== null) for (let x = dirname(outReal); ; x = dirname(x)) { if (idOf(x) === baseId) return 'inside'; if (dirname(x) === x) break; }
    return 'outside';
  };
  const refuse = (text) => ({ code: 1, text });
  const assetRoot = join(root, 'Spixi', 'Resources', 'Raw');
  const html = standing(RAW), raw = standing(assetRoot);
  if (html === 'same') {
    if (inPlace) return null;
    return refuse('strip-release: REFUSED — the out folder ' + outAbs + ' is the source folder; a ' + (lean ? 'lean ' : '') + 'strip in place needs --in-place; nothing was written');
  }
  if (html === 'inside') return refuse('strip-release: REFUSED — the out folder ' + outAbs + ' is inside the source folder ' + realOf(RAW) + ' (it would be read as source by the next run, and every file under Resources/Raw ships as an asset); nothing was written');
  if (raw !== 'outside') return refuse('strip-release: REFUSED — the out folder ' + outAbs + ' is ' + (raw === 'same' ? '' : 'inside ') + 'the asset folder ' + realOf(assetRoot) + ' (the build packs every file under Resources/Raw as an asset: a file written there ships); nothing was written');
  // r1S-4: the other folders the build packs (MAUI default globs): the whole Resources folder (Fonts, Images, AppIcon, Splash, …) and Platforms (Android Assets / Resources, …)
  for (const [name, why] of [['Resources', 'Resources\\Fonts, Resources\\Images, Resources\\AppIcon and Resources\\Splash are packed'], ['Platforms', 'Platforms\\Android\\Assets and Platforms\\Android\\Resources are packed']]) {
    const base = join(root, 'Spixi', name), at = standing(base);
    if (at !== 'outside') return refuse('strip-release: REFUSED — the out folder ' + outAbs + ' is ' + (at === 'same' ? '' : 'inside ') + 'the packed folder ' + realOf(base) + ' (' + why + ' by the build: a file written there ships); nothing was written');
  }
  // round 2 (r2S-2): the MAUI default items also embed every `**\\*.css` of the project folder (MauiCss, minus bin and obj; read from the upstream targets, NOT proven by a MAUI build):
  // an out folder anywhere inside Spixi/ is refused unless it is under Spixi/obj or Spixi/bin (the exception Raw/html + --in-place came earlier and stays)
  {
    const proj = join(root, 'Spixi'), at = standing(proj);
    // LIMIT (review round 4): the exception is granted when ANY view (real path, path as written, inode) says the folder is under obj or bin. A link planted inside obj or bin that points into the project folder
    // (outside Resources / Platforms) is therefore not refused; a link into Resources/Raw, Resources or Platforms is still refused. A stricter test (real path AND path as written) refused EVERY build of a
    // checkout reached through a linked folder (macOS /var -> /private/var, a symlinked home, a Windows junction): `root` is the real path, MSBuild writes --out with the written spelling.
    if (at !== 'outside' && standing(join(proj, 'obj')) === 'outside' && standing(join(proj, 'bin')) === 'outside') return refuse('strip-release: REFUSED — the out folder ' + outAbs + ' is ' + (at === 'same' ? '' : 'inside ') + 'the project folder ' + realOf(proj) + ' outside obj and bin (the build embeds every .css file of the project folder, and packs the folders above: a file written there can ship); use a folder under Spixi/obj, Spixi/bin or outside the project; nothing was written');
  }
  // r1S-8: a dangling link as the out folder or as a parent: mkdir through it would create its target (maybe inside a refused folder)
  for (let x = outAbs; ; x = dirname(x)) {
    let st = null;
    try { st = lstatSync(x); } catch (_) { /* not there: look at the parent */ }
    if (st) { if (st.isSymbolicLink() && !existsSync(x)) return refuse('strip-release: REFUSED — the out folder ' + outAbs + ' has a link on its way (' + x + ') that points to nothing: the folder it would create cannot be tested; nothing was written'); break; }
    if (dirname(x) === x) break;
  }
  if (inPlace) return { code: 2, text: 'strip-release: --in-place is valid only when --out is the source folder Spixi/Resources/Raw/html of this tree; ' + outAbs + ' is not (a typo must not look like a success); nothing was written' };
  return null;
}

/** ★ leanfollow round 1 (r1S-2) — THE ONE PRE-FLIGHT of every --out write (plain and lean; nothing is written before it passes). Returns the problems (empty = fine):
 *  the out folder exists and is not a directory; a folder on the way up from the out folder to the first existing one is not a directory; a target that exists and
 *  is a link (a write would go THROUGH it, into a file of Resources/Raw for instance), a directory or another kind of entry; a folder between the out folder and
 *  a target that is a link or not a directory. `files` = the relative target names. */
export function outPreflight(outAbs, files) {
  const pre = [];
  const lst = (q) => { try { return lstatSync(q); } catch (e) { if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) return null; throw e; } };
  try {
    const st0 = existsSync(outAbs) ? statSync(outAbs) : null;
    if (st0 && !st0.isDirectory()) pre.push(outAbs + ': the out folder is not a directory');
    if (!st0) for (let x = dirname(outAbs); ; x = dirname(x)) { if (lst(x)) { if (!statSync(x).isDirectory()) pre.push(x + ': is not a directory (on the way to the out folder)'); break; } if (dirname(x) === x) break; }
    for (const f of files) {
      const dest = join(outAbs, f);
      const st = lst(dest);
      if (st && !st.isFile()) pre.push(f + ': the target is ' + (st.isDirectory() ? 'a directory' : st.isSymbolicLink() ? 'a link' : 'not a regular file'));
      for (let d = dirname(dest); d.length > outAbs.length; d = dirname(d)) { const sd = lst(d); if (sd && (!sd.isDirectory() || sd.isSymbolicLink())) { pre.push(f + ': ' + d + ' is not a real directory'); break; } }
    }
  } catch (e) { pre.push('pre-flight: ' + (e && e.message)); }
  return pre;
}
function preflightText(pre) { return 'strip-release: REFUSED — the out folder cannot take this package:\n  ' + pre.slice(0, 10).join('\n  ') + (pre.length > 10 ? '\n  … +' + (pre.length - 10) : '') + '\nstrip-release: nothing was written'; }

/** The lean branch of the CLI (--lean-css / --lean-js, else SPIXI_PACKAGED_LEAN). Exits. */
function leanCli(args, flag, mode) {
  const scope = leanScopeOf(mode, { legacyTokensStrip: stripCssComments });   // #1478: tokens.css as today unless lean CSS is on
  const modeLine = 'strip-release: lean mode ' + scope.label + ' (from ' + (mode.source === 'flags' ? 'the flags' : 'SPIXI_PACKAGED_LEAN') + ')';
  const shipped = listShippedAll(RAW).filter((x) => /\.(html|css|js)$/.test(x));
  const inScope = shipped.filter((x) => scope.inScope(x));
  const kept = [];
  const build = (rel, collect) => {
    const src = readFileSync(join(RAW, rel), 'utf8');
    const out = scope.transform(rel, src, collect ? (k) => kept.push({ file: rel, ...k }) : undefined);
    scope.check(rel, src, out);                      // post-conditions: throw on the first problem
    return { src, out };
  };
  const die = (code, msg) => { console.error(msg); process.exit(code); };
  const val = (name) => { const v = flag(name); if (v !== null && (v === '' || v.startsWith('--'))) die(2, 'strip-release: ' + name + ' needs a value'); return v; };

  if (args.includes('--stats')) {
    console.log(modeLine);
    const tot = { html: [0, 0], css: [0, 0], js: [0, 0] };
    for (const f of inScope) {
      let r;
      try { r = build(f, true); } catch (e) { die(1, 'strip-release: FAILED — ' + e.message); }
      const a = Buffer.byteLength(r.src, 'utf8'), b = Buffer.byteLength(r.out, 'utf8');
      const k = f.split('.').pop();
      tot[k][0] += a; tot[k][1] += b;
      console.log(`  ${f}: ${a} → ${b} bytes (−${a ? Math.round((1 - b / a) * 1000) / 10 : 0} %)`);
    }
    let A = 0, B = 0;
    for (const k of ['html', 'css', 'js']) { A += tot[k][0]; B += tot[k][1]; console.log(`  total ${k}: ${tot[k][0]} → ${tot[k][1]} bytes (−${tot[k][0] - tot[k][1]})`); }
    const byReason = {};
    let keptBytes = 0;
    for (const k of kept) { const r = k.reason.split(':')[0]; byReason[r] = (byReason[r] || 0) + 1; keptBytes += Buffer.byteLength(k.text, 'utf8'); }
    for (const k of kept) console.log(`  kept ${k.file}:${k.line} [${k.reason}] ${JSON.stringify(k.text.slice(0, 60))}`);
    console.log(`  kept comments: ${kept.length} (${Object.entries(byReason).map(([r, n]) => r + ' ' + n).join(', ') || 'none'}), ${keptBytes} bytes`);
    console.log(`strip-release --stats (lean ${scope.label}): ${A} → ${B} bytes over ${inScope.length} file(s)`);
    process.exit(0);
  }

  const one = flag('--stdout');
  if (one !== null) {
    console.error(modeLine);
    if (!inScope.includes(one)) die(2, 'strip-release: ' + one + ' is not in the lean ' + scope.label + ' scope');
    let r;
    try { r = build(one); } catch (e) { die(1, 'strip-release: FAILED — ' + e.message); }
    process.stdout.write(r.out);
    process.exit(0);
  }

  const outDir = val('--out');
  if (outDir !== null) {
    console.log(modeLine);
    const t0 = performance.now();
    // 0 · the out folder rule FIRST (leanfollow R2: the same function as the plain --out): a refused folder costs no transform and writes nothing
    const outAbs = resolve(outDir);
    { const why = outFolderRefusal(outDir, { inPlace: args.includes('--in-place'), lean: true }); if (why) die(why.code, why.text); }
    // 1 · every transform and every post-condition first, in memory: a failure writes NOTHING
    const plan = [];
    for (const f of inScope) {
      try { plan.push([f, build(f).out]); } catch (e) { die(1, 'strip-release: FAILED — ' + e.message + '\nstrip-release: nothing was written'); }
    }
    // #46 r1 C-4 — the write is two-phase, and a failure never deletes a file this run did not make:
    //   (b) pre-flight · (c) phase 1: every temp file written and read back · (d) phase 2: every rename.
    // (b) pre-flight: the out folder was already tested by outFolderRefusal (step 0: not Spixi/Resources/Raw or inside it; out == Raw/html only with
    //     --in-place: smoke-packaged strips its copy in place); outPreflight: it is a directory (or absent), every target is absent or a regular file; every
    //     folder on the way from the out folder to a target is absent or a real directory (never a file, never a link out of it).
    const pre = outPreflight(outAbs, plan.map(([f]) => f));
    if (pre.length) die(1, preflightText(pre));
    // (c) phase 1: a temp file next to each target, unique to this run (created with 'wx': it never existed), read back
    const tag = '.strip-tmp-' + process.pid + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    const temps = [];       // the temp files THIS run created — the only files a failure deletes
    const madeDirs = [];    // every folder THIS run created, outermost first (removed again on a phase-1 failure, when empty)
    const mk = (d) => { const miss = []; for (let x = d; !existsSync(x); x = dirname(x)) { miss.unshift(x); if (dirname(x) === x) break; } for (const x of miss) { mkdirSync(x); madeDirs.push(x); } };
    try {
      mk(outAbs);
      for (const [f, s] of plan) {
        const dest = join(outAbs, f);
        mk(dirname(dest));
        const t = dest + tag;
        writeFileSync(t, s, { encoding: 'utf8', flag: 'wx' });
        temps.push(t);
        if (readFileSync(t, 'utf8') !== s) throw new Error('SHORT WRITE on ' + t);
      }
    } catch (e) {
      const left = [];
      for (const t of temps) { try { unlinkSync(t); } catch (_) { left.push(t); } }
      for (const d of madeDirs.reverse()) { try { rmdirSync(d); } catch (_) { /* not empty: keep it */ } }   // rmdir removes an EMPTY folder only
      die(1, 'strip-release: WRITE FAILED — ' + (e && e.message) + '\nstrip-release: ' + (left.length ? 'nothing was replaced, but ' + left.length + ' temp file(s) could not be deleted: ' + left.join(' · ') : 'nothing in the out folder was changed (only this run\'s temp files were written, and they were deleted)'));
    }
    // (d) phase 2: every rename. The pre-flight makes a failure here practically impossible; if one still happens,
    //     no target is deleted: the remaining temp files go, and the replaced targets are named
    const replaced = [];
    try {
      for (const [f, s] of plan) {
        const dest = join(outAbs, f);
        renameRetry(dest + tag, dest);
        replaced.push(f);
        if (readFileSync(dest, 'utf8') !== s) throw new Error('read-back mismatch on ' + dest);
      }
    } catch (e) {
      for (const [f] of plan) { const t = join(outAbs, f) + tag; try { if (existsSync(t)) unlinkSync(t); } catch (_) { /* named below by the inconsistency line */ } }
      die(1, 'strip-release: WRITE FAILED in the rename phase — ' + (e && e.message) + '\nstrip-release: THE OUT FOLDER IS NOT CONSISTENT: ' + replaced.length + ' of ' + plan.length + ' target(s) were already replaced (' + (replaced.join(', ') || 'none') + '); no target was deleted; empty the folder and run again');
    }
    for (const [f, s] of plan) console.log(`  ✓ ${f} → ${join(outDir, f)} (${Buffer.byteLength(s, 'utf8')} bytes)`);
    console.log(`strip-release: ${plan.length} file(s) written to ${resolve(outDir)} (lean ${scope.label}, ${Math.round(performance.now() - t0)} ms)`);
    process.exit(0);
  }

  const packaged = val('--check');
  if (packaged !== null) {
    console.log(modeLine);
    if (!existsSync(packaged)) die(2, 'strip-release --check: packaged dir not found: ' + packaged);
    { const bad = packageEntryProblems(packaged); if (bad.length) die(1, 'strip-release --check: GATE 1 FAILED (lean ' + scope.label + ') — the package holds entries that are not regular files (never opened)\n  ' + bad.join('\n  ')); }
    const problems = [];
    // (a) every file in the lean scope: packaged ≡ lean(committed)
    for (const f of inScope) {
      const p = join(packaged, f);
      if (!isFile(p)) { problems.push(f + ': MISSING from the package' + (existsSync(p) ? ' (a directory or another kind of entry has its name, not a regular file)' : '')); continue; }
      let want;
      try { want = build(f).out; } catch (e) { problems.push(f + ': the strip of the committed file failed — ' + e.message); continue; }
      const got = readFileSync(p, 'utf8');
      if (want !== got) {
        let k = 0; while (k < want.length && want[k] === got[k]) k++;
        problems.push(f + ': packaged ≠ lean(committed) (' + got.length + ' vs ' + want.length + ' chars; first difference at line ' + lineOf(got, k) + ')');
      }
    }
    // (b) every other shipped html / css / js in the package is byte-identical to the committed one
    for (const f of listShippedAll(packaged).filter((x) => /\.(html|css|js)$/.test(x) && !inScope.includes(x))) {
      const c = join(RAW, f);
      if (!existsSync(c)) { problems.push(f + ': in the package but NOT in the committed tree'); continue; }
      if (!readFileSync(c).equals(readFileSync(join(packaged, f)))) problems.push(f + ': packaged ≠ committed (not in the lean ' + scope.label + ' scope)');
    }
    // (c) the other direction: every committed html / css / js ships
    //     (an in-scope file is reported once, by (a))
    //     a path counts only when it is a regular FILE (#46 r1 C-2)
    for (const f of shipped) if (!inScope.includes(f) && !isFile(join(packaged, f))) problems.push(f + ': committed but MISSING from the package' + (existsSync(join(packaged, f)) ? ' (a directory or another kind of entry has its name, not a regular file)' : ''));
    // ALWAYS: carriers + the line invariant (with its count guard)
    const seen = {};
    problems.push(...alwaysOnGates(packaged, seen));
    if (problems.length) {
      console.error('strip-release --check: GATE 1 FAILED (lean ' + scope.label + ') — packaged ≢ lean(committed)\n  ' + problems.join('\n  '));
      process.exit(1);
    }
    console.log('strip-release --check: GATE 1 OK — lean ' + scope.label + ': packaged ≡ lean(committed) for ' + inScope.length + ' file(s) in scope; every other shipped html/css/js is byte-identical in both directions (nothing extra, nothing missing); the carrier multiset of every file is unchanged; the ' + seen.ext + ' external scripts keep their lines');
    process.exit(0);
  }

  die(2, 'strip-release: one of --out <dir> · --check <packagedDir> · --stats · --stdout <file>');
}
