#!/usr/bin/env node
/* x-parser-crosscheck.mjs — the INDEPENDENT proof of the lean strips (docs/contract-perflean.md
 * § 3.4). NOT in the packaging path: it uses the parsers the pinned test line already installs
 * (`acorn`, a dependency of the pinned eslint, and `jsdom`) — never a new package. Not
 * resolvable = a loud failure, never a skip.
 *
 *   node scripts/pins-perflean/x-parser-crosscheck.mjs [--lean-css] [--lean-js]
 *        [--committed <html dir>] [--packaged <html dir>] [--corpus]
 *
 * With no --packaged it runs the strip itself, in memory, over --committed (default: this
 * tree's Spixi/Resources/Raw/html). With no lean flag both are checked. --corpus runs the
 * hostile-input corpus (scripts/pins-perflean/corpus/cases.mjs) instead.
 *
 * JS  — for the three external scripts and every inline classic <script> of every shell: the
 *       acorn token stream of the stripped text (type label + the exact source text of every
 *       token: strings, templates and regular expressions byte for byte) equals that of the
 *       source; AND (#46 r1 C-7 = S-1) acorn's SYNTAX TREE of the stripped text equals the source's,
 *       every property compared except the positions (start / end / loc / range) — so a line break
 *       that automatic semicolon insertion needed and the strip lost (`return /* ⏎ *\/ 1` →
 *       `return 1`, `a /* ⏎ *\/ ++⏎b` → `a ++⏎b`: equal tokens, other programs) is seen, and literal
 *       raw / regex / bigint and template raw / cooked are compared; the first differing path is
 *       printed. Comments, one-sided (#46 r2): every comment of the stripped text is a source comment at
 *       the same place (the next code token) and byte-identical, and every comment keepReason keeps (a
 *       `//` run counted as one) is there; the strip may keep MORE (its rule "after an uncertain slash"):
 *       counted, never a failure. External files: every token on the same line, and the stripped file
 *       compiles. A script acorn cannot read FAILS (never skipped).
 *       ⚠ KNOWN acorn 8.x MISREADS (#46 r2 S-4): acorn decides "regex or division" after a few tokens by a rule of its
 *       own, and V8 disagrees in these forms. Two kinds of effect:
 *         HIDE (both sides misread the same way, no error: a strip error inside that span could be invisible here —
 *         V8 and the in-build post-conditions still see it):
 *           `x?.of⏎/ --y.k/g` (a `/` on the line after `?.of`) · `var re=2,g=2,x = async function () {}⏎/re/g; x`
 *           (a `/` after the `}` of an async function EXPRESSION on the next line) — acorn reads a regular expression,
 *           V8 two divisions;
 *         FALSE ALARM (acorn rejects valid code — this check then FAILS loud, never passes):
 *           `x = b?.typeof /3/ 4` · `x = async function () {} / 2 / 1` · `x = a ? function(){} : function(){} /2/ 1` ·
 *           `function* g(){ yield function f() {} /2/ 1 }` · `async function g(){ await function(){}⏎/2/ 1 }` ·
 *           `async function h(){ ( await /=/ ) }`.
 *       Today's 199 shipped scripts hold none: their 396 regular-expression literals are the same (start, end) for acorn,
 *       the strip's scanner and TypeScript 6.0.3's parser (a probe of round 2, /opt/npm-tools/node_modules/typescript;
 *       not a dependency). The corpus checks `b?.typeof` with V8 (`acorn: false`).
 * HTML — for every shell, committed and packaged: the style / script bodies of the strip's
 *       walker equal jsdom's textContent of every <style> / <script> element, in order and in
 *       number; the packaged document with the committed bodies put back is the committed
 *       document byte for byte.
 * CSS — for every stylesheet (linked and inline): idempotent; one-sided (#46 r2), every comment left is
 *       a source comment at the same place, and every source comment THIS file's own rule keeps (carrier /
 *       licence words, not at a statement boundary, inside a custom-property value, spans lines with
 *       content — cssStructure) is left (the strip may keep more: a comment in a value block after `:`,
 *       one whose removal would join `/` and `*` — counted, never a failure); every custom-property value and
 *       every statement around a kept in-value comment is byte-identical;
 *       an independent CSS tokenizer (css-syntax-3 shapes, written here) sees the same token
 *       sequence in source and output (white space and comments aside); and (#46 r1, the rule of the
 *       lean CSS strip: it changes ONLY a removed comment and the white space that belonged to it) —
 *       cssDeletionProblems, from this file's own comment recogniser, never the strip's code:
 *       (i) with the comments removed from both texts (a removed one leaves a mark) and every white-
 *       space run collapsed to one space, the texts are equal, except that where the source's run
 *       touched a removed comment the output holds one space or — only after `{` `;` `}` or at the
 *       start — none; (ii) every comment of the output is byte-identical to a source comment, in
 *       order; (iii) every source line that holds no part of a comment is in the output unchanged, in
 *       order. (Until 2026-11-15 the last check compared with today's stripCssComments; the new rule
 *       keeps blank and trailing-blank lines that today's strip squeezes, so that claim was dropped.)
 * Every run starts with --selftest (the hand-made pairs, each with the REASON it must be reported for); a
 * failing selftest fails the run. --committed and --packaged naming the same folder → exit 2. Under each
 * active flag at least one file / body must differ and at least one comment must be removed, or the run
 * fails: a package byte-identical to the committed tree is not a lean package (#46 r2 C-2).
 * The run FAILS (exit 1) when a folder is missing or when it compared fewer than the flags imply
 * (#46 r1 C-6): every *.html of the committed folder as a shell (at least 1); with JS the 3 external
 * scripts and at least 1 inline script; with CSS at least 3 sheets and every in-scope *.css.
 * Prints one summary line; exit 0 / 1.
 */
import { readFileSync, readdirSync, statSync, existsSync, realpathSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const L = await import(new URL('../lib/lean-strip.mjs', import.meta.url));
/* #1478: with lean CSS OFF, spixi.tokens.css is packed by the no-flag strip — leanScope needs it injected, and the check
 * there is the legacy identity out === stripCssComments(src). Importing strip-release.mjs has no side effect here: its CLI
 * runs only when it is the main module, and its import-time read of SPIXI_PACKAGED_LEAN only extends ITS STRIP_ALLOWLIST
 * (a junk value gives { error } and changes nothing; this file never reads that list). */
const { stripCssComments } = await import(new URL('../strip-release.mjs', import.meta.url));

function need(name) {
  const req = createRequire(join(root, 'package.json'));
  try { return req(name); }
  catch (e) { throw new Error('x-parser-crosscheck: cannot resolve "' + name + '" from ' + root + '/node_modules — install the pinned test line (CLAUDE.md step 5); this check never skips'); }
}

/* ─────────────── JS: acorn ─────────────── */
let acorn = null;
const acornOf = () => (acorn ||= need('acorn'));

function acornRead(code, { allowReturn = false } = {}) {
  const tokens = [];
  const comments = [];
  const ast = acornOf().parse(code, {
    ecmaVersion: 'latest', sourceType: 'script', locations: true, allowReturnOutsideFunction: allowReturn,
    onToken: (t) => tokens.push(t),
    onComment: (block, text, start, end, ls) => comments.push({ block, start, end, line: ls.line }),
  });
  return { tokens, comments, ast };
}

/** #46 r1 C-7: compare two acorn trees, every own property except the positions. Iterative (a long `+` chain in
 *  the bundle is deep). → null when equal, else the first differing path, e.g.
 *  `Program.body[0]<FunctionDeclaration>.body<BlockStatement>.body[0]<ReturnStatement>.argument: null → Literal`. */
const AST_SKIP = new Set(['start', 'end', 'loc', 'range']);
export function astDiff(A, B) {
  const show = (v) => (v === null ? 'null' : typeof v === 'object' ? (v.type || (Array.isArray(v) ? 'array(' + v.length + ')' : 'object')) : typeof v === 'bigint' ? v + 'n' : JSON.stringify(v));
  const stack = [[A, B, 'Program']];
  while (stack.length) {
    const [a, b, path] = stack.pop();
    if (a === b) continue;
    if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') {
      if (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) continue;
      return path + ': ' + show(a) + ' → ' + show(b);
    }
    if ((a instanceof RegExp) || (b instanceof RegExp)) { if ((a instanceof RegExp) && (b instanceof RegExp) && String(a) === String(b)) continue; return path + ': ' + String(a) + ' → ' + String(b); }
    if (Array.isArray(a) !== Array.isArray(b)) return path + ': ' + show(a) + ' → ' + show(b);
    if (Array.isArray(a)) {
      if (a.length !== b.length) return path + ': ' + a.length + ' item(s) → ' + b.length;
      for (let k = a.length - 1; k >= 0; k--) stack.push([a[k], b[k], path + '[' + k + ']' + (a[k] && a[k].type ? '<' + a[k].type + '>' : '')]);
      continue;
    }
    if (a.type !== b.type) return path + ': ' + show(a) + ' → ' + show(b);
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => !AST_SKIP.has(k)).sort();
    for (let k = keys.length - 1; k >= 0; k--) {
      const key = keys[k];
      if (!(key in a) || !(key in b)) return path + '.' + key + ': ' + (key in a ? show(a[key]) : '(absent)') + ' → ' + (key in b ? show(b[key]) : '(absent)');
      const v = a[key];
      stack.push([v, b[key], path + '.' + key + (v && typeof v === 'object' && v.type ? '<' + v.type + '>' : '')]);
    }
  }
  return null;
}

/** acorn comments grouped by the keep rule's unit (a run of `//` on adjacent lines = one) — an
 *  implementation of its own over acorn's comment positions, not the strip's. */
function acornKeptTexts(code, comments) {
  const units = [];
  for (const c of comments) {
    const last = units[units.length - 1];
    if (last && !c.block && !last.block && /^[ \t]*(?:\r\n|\n|\r|\u2028|\u2029)[ \t]*$/.test(code.slice(last.end, c.start))) { last.end = c.end; continue; }
    units.push({ block: c.block, start: c.start, end: c.end });
  }
  return units.map((u) => code.slice(u.start, u.end));
}

/* An INDEPENDENT notice rule (not keepReason): a source comment that names a copyright or a
 * licence, or is a carrier, must survive word for word. Written here on purpose, so that a strip
 * whose keep rule lost a word fails this check even though it agrees with itself. */
const NOTICE_RE = /^\/\*!|copyright|licen[cs]e|\u00a9|spdx-license-identifier|@preserve|\*SL\{/i;   // ("SPDX" alone is not enough: a lint marker in the bundle says "an SPDX identifier")
const noticeProblems = (name, texts, out) => texts.filter((t) => NOTICE_RE.test(t) && !out.includes(t)).slice(0, 5).map((t) => name + ': a licence / carrier notice was REMOVED: ' + JSON.stringify(t.slice(0, 60)));

/** Compare one JS pair. Returns [] or problem lines. */
const placeOf = (starts, pos) => { let lo = 0, hi = starts.length; while (lo < hi) { const m = (lo + hi) >> 1; if (starts[m] < pos) lo = m + 1; else hi = m; } return lo; };   // index of the first token at or after pos

/** #46 r2 (one-sided comment rule) — match the comments of `out` to the comments of `src` at the SAME PLACE (the index of
 *  the next code token; the token streams are proven equal separately) and the same text, in order. → { unmatched:
 *  out comments with no source twin, matched: Set of matched source indexes }. */
function matchAtPlace(srcC, outC) {
  const matched = new Set(), unmatched = [];
  let k = 0;
  for (const c of outC) {
    while (k < srcC.length && (srcC[k].place < c.place || (srcC[k].place === c.place && srcC[k].text !== c.text))) k++;
    if (k < srcC.length && srcC[k].place === c.place && srcC[k].text === c.text) { matched.add(k); k++; }
    else unmatched.push(c);
  }
  return { matched, unmatched };
}

export function jsPairProblems(name, src, out, { lines = false, allowReturn = false, compile = false, stats = null } = {}) {
  const P = [];
  let a, b;
  try { a = acornRead(src, { allowReturn }); } catch (e) { return [name + ': acorn cannot read the SOURCE: ' + e.message]; }
  try { b = acornRead(out, { allowReturn }); } catch (e) { return [name + ': acorn cannot read the STRIPPED text: ' + e.message]; }
  if (a.tokens.length !== b.tokens.length) P.push(name + ': token count ' + a.tokens.length + ' → ' + b.tokens.length);
  // #46 r1 C-7: the PROGRAM, not only the tokens (a lost line break that ASI needs keeps the tokens equal)
  const ad = astDiff(a.ast, b.ast);
  if (ad) P.push(name + ': the syntax tree differs (positions aside) at ' + ad.slice(0, 300));
  const n = Math.min(a.tokens.length, b.tokens.length);
  for (let k = 0; k < n && P.length < 5; k++) {
    const x = a.tokens[k], y = b.tokens[k];
    const tx = src.slice(x.start, x.end), ty = out.slice(y.start, y.end);
    if (x.type.label !== y.type.label || tx !== ty) P.push(name + ': token ' + k + ' (source line ' + x.loc.start.line + ') ' + x.type.label + ' ' + JSON.stringify(tx.slice(0, 40)) + ' → ' + y.type.label + ' ' + JSON.stringify(ty.slice(0, 40)));
    else if (x.type.label === 'regexp' && (x.value.pattern !== y.value.pattern || x.value.flags !== y.value.flags)) P.push(name + ': regexp ' + k + ' changed');
    else if (lines && (x.loc.start.line !== y.loc.start.line || x.loc.end.line !== y.loc.end.line)) P.push(name + ': token ' + k + ' ' + JSON.stringify(tx.slice(0, 40)) + ' moved from line ' + x.loc.start.line + ' to ' + y.loc.start.line);
  }
  /* #46 r2 — the comments, ONE-SIDED (the strip may keep more than this file's model, e.g. its rule K "after an uncertain
   * slash"; which removable comment it keeps is not a safety property):
   *   · every comment of the output is a source comment at the SAME PLACE (next code token) and byte-identical;
   *   · every comment that MUST stay (keepReason of its unit — a `//` run is one unit) is in the output there.
   * Informational: a left comment that neither keepReason nor "a `/` or regex token starts earlier on its line" explains
   * is counted as kept beyond the model (stats.beyond). */
  const ts = a.tokens.map((t) => t.start), tsOut = b.tokens.map((t) => t.start);
  const cSrc = a.comments.map((c) => ({ text: src.slice(c.start, c.end), place: placeOf(ts, c.end), start: c.start, line: c.line }));
  const cOut = b.comments.map((c) => ({ text: out.slice(c.start, c.end), place: placeOf(tsOut, c.end) }));
  const mm = matchAtPlace(cSrc, cOut);
  for (const c of mm.unmatched.slice(0, 3)) P.push(name + ': a comment of the output is not a source comment at the same place: ' + JSON.stringify(c.text.slice(0, 60)));
  { // the keep units of the source (a `//` run on adjacent lines = one unit), each judged by keepReason
    const units = [];
    a.comments.forEach((c, k) => { const last = units[units.length - 1]; if (last && !c.block && !last.block && /^[ \t]*(?:\r\n|\n|\r|\u2028|\u2029)[ \t]*$/.test(src.slice(last.end, c.start))) { last.end = c.end; last.ks.push(k); } else units.push({ block: c.block, start: c.start, end: c.end, ks: [k] }); });
    let lost = 0, first = '';
    for (const u of units) if (L.keepReason(src.slice(u.start, u.end)) && u.ks.some((k) => !mm.matched.has(k))) { lost++; if (!first) first = src.slice(u.start, u.end); }
    if (lost) P.push(name + ': ' + lost + ' comment(s) that must stay (keepReason) were removed: ' + JSON.stringify(first.slice(0, 60)));
    if (stats) {
      const lineSlash = (line, before) => a.tokens.some((t) => t.loc.start.line === line && t.start < before && (t.type.label === 'regexp' || t.type.label === '/' || (t.type.label === '_=' && t.value === '/=')));
      // (r3 A-2) the strip's rule K also keeps a `//` unit whose FIRST line comment stands right after a line with a slash (only spaces /
      // tabs between that line's LF / CR and it): a true `//` comment in that line's tail would continue into it
      const afterSlashLine = (k0) => { const c = a.comments[k0]; if (c.block) return false; const ls = Math.max(src.lastIndexOf('\n', c.start - 1), src.lastIndexOf('\r', c.start - 1)); return ls >= 0 && /^[ \t]*$/.test(src.slice(ls + 1, c.start)) && lineSlash(cSrc[k0].line - 1, Infinity); };
      for (const k of mm.matched) { const u = units.find((x) => x.ks.includes(k)); if (!L.keepReason(src.slice(u.start, u.end)) && !lineSlash(cSrc[k].line, cSrc[k].start) && !afterSlashLine(u.ks[0])) stats.beyond = (stats.beyond || 0) + 1; }
      stats.removed = (stats.removed || 0) + (cSrc.length - mm.matched.size);
      if (src !== out) stats.changed = (stats.changed || 0) + 1;
    }
  }
  P.push(...noticeProblems(name, a.comments.map((c) => src.slice(c.start, c.end)), out));
  if (compile) { try { new vm.Script(out, { filename: name }); } catch (e) { P.push(name + ': does not compile: ' + e.message); } }
  return P;
}

/* ─────────────── HTML: jsdom ─────────────── */
let JSDOMc = null;
const HTML_NS = 'http://www.w3.org/1999/xhtml';
function jsdomBodies(html) {
  JSDOMc ||= need('jsdom').JSDOM;
  const dom = new JSDOMc(html);                     // no scripts run, no resources load
  const out = [];
  const walk = (node) => {
    for (const c of node.childNodes) {
      if (c.nodeType !== 1) continue;
      if ((c.localName === 'script' || c.localName === 'style') && c.namespaceURI === HTML_NS) out.push([c.localName, c.textContent]);
      if (c.localName === 'template' && c.content) walk(c.content);
      walk(c);
    }
  };
  walk(dom.window.document);
  dom.window.close();
  return out;
}
const nl = (t) => t.replace(/\r\n?/g, '\n');      // the HTML input stream normalises line breaks

export function htmlProblems(name, html) {
  const P = [];
  let mine;
  try { mine = L.walkHtml(html, { file: name }).parts.filter((p) => p.kind !== 'markup'); }
  catch (e) { return [name + ': the strip\'s walker throws: ' + e.message]; }
  const theirs = jsdomBodies(html);
  if (mine.length !== theirs.length) P.push(name + ': ' + mine.length + ' bodies by the walker, ' + theirs.length + ' <style>/<script> elements by jsdom');
  for (let k = 0; k < Math.min(mine.length, theirs.length) && P.length < 5; k++) {
    if (mine[k].kind !== theirs[k][0] || nl(mine[k].text) !== theirs[k][1]) P.push(name + ': body ' + k + ' (line ' + mine[k].line + ') differs from jsdom\'s <' + theirs[k][0] + '> text');
  }
  return P;
}

/* ─────────────── CSS: an independent tokenizer (css-syntax-3 shapes) ─────────────── */
const isNameStart = (c) => c !== undefined && (/[A-Za-z_]/.test(c) || c.charCodeAt(0) >= 0x80);
const isName = (c) => c !== undefined && (isNameStart(c) || /[0-9-]/.test(c));
const isDigit = (c) => c !== undefined && c >= '0' && c <= '9';
const isNl = (c) => c === '\n' || c === '\r' || c === '\f';
const isWs = (c) => c === ' ' || c === '\t' || isNl(c);
const validEsc = (s, i) => s[i] === '\\' && !isNl(s[i + 1]) && s[i + 1] !== undefined;
const isHexC = (c) => c !== undefined && /[0-9A-Fa-f]/.test(c);
/** The length of the escape that starts at s[i] === '\\' (css-syntax-3). A newline is LF, CR LF, CR or FF, and CR LF is ONE:
 *  `\\` + a newline (legal inside a string only) is 3 for CR LF, else 2; a hex escape is 1–6 hex digits plus ONE white space
 *  after them (CR LF counts as one, so it eats both); any other escape is `\\` + one code point (a surrogate pair is one).
 *  `\\` at the end of the input → 1. (#46 r2 pins: `\\` + CR LF inside a string used to end the string.) */
const escLen = (s, i) => {
  const d = s[i + 1];
  if (d === undefined) return 1;
  if (d === '\r' && s[i + 2] === '\n') return 3;
  if (isNl(d)) return 2;
  if (isHexC(d)) { let k = i + 1; while (k < i + 7 && isHexC(s[k])) k++; if (s[k] === '\r' && s[k + 1] === '\n') return k + 2 - i; return isWs(s[k]) ? k + 1 - i : k - i; }
  return s.codePointAt(i + 1) > 0xffff ? 3 : 2;
};
const startsIdent = (s, i) => {
  if (s[i] === '-') return isNameStart(s[i + 1]) || s[i + 1] === '-' || validEsc(s, i + 1);
  return isNameStart(s[i]) || validEsc(s, i);
};
const startsNumber = (s, i) => {
  if (s[i] === '+' || s[i] === '-') return isDigit(s[i + 1]) || (s[i + 1] === '.' && isDigit(s[i + 2]));
  if (s[i] === '.') return isDigit(s[i + 1]);
  return isDigit(s[i]);
};
/** → tokens [type, text] without white space and comments. Throws on an unterminated comment. */
export function cssTokens(s, comments) {
  const T = [];
  let i = 0;
  const n = s.length;
  const name = () => { const a = i; for (;;) { if (isName(s[i])) i++; else if (validEsc(s, i)) i += escLen(s, i); else break; } return s.slice(a, i); };
  // every token carries [type, text, start, end] (source offsets), set after the step that read it
  let st = 0, len0 = 0;
  const fix = () => { for (let k = len0; k < T.length; k++) { T[k][2] = st; T[k][3] = i; } };
  while (i < n) {
    fix(); st = i; len0 = T.length;
    const c = s[i];
    if (c === '/' && s[i + 1] === '*') { const e = s.indexOf('*/', i + 2); if (e < 0) throw new Error('unterminated comment'); if (comments) comments.push({ start: i, end: e + 2, text: s.slice(i, e + 2) }); i = e + 2; continue; }
    if (isWs(c)) { while (isWs(s[i])) i++; continue; }
    if (c === '"' || c === "'") {
      const a = i++;
      while (i < n && s[i] !== c && !isNl(s[i])) { if (s[i] === '\\') i += escLen(s, i); else i++; }
      if (s[i] === c) i++;
      T.push(['string', s.slice(a, i)]);
      continue;
    }
    if (c === '#' && (isName(s[i + 1]) || validEsc(s, i + 1))) { i++; T.push(['hash', '#' + name()]); continue; }
    if (startsNumber(s, i)) {
      const a = i;
      if (s[i] === '+' || s[i] === '-') i++;
      while (isDigit(s[i])) i++;
      if (s[i] === '.' && isDigit(s[i + 1])) { i++; while (isDigit(s[i])) i++; }
      if ((s[i] === 'e' || s[i] === 'E') && (isDigit(s[i + 1]) || ((s[i + 1] === '+' || s[i + 1] === '-') && isDigit(s[i + 2])))) { i += 2; while (isDigit(s[i])) i++; }
      const num = s.slice(a, i);
      if (startsIdent(s, i)) { T.push(['dimension', num + name()]); continue; }
      if (s[i] === '%') { i++; T.push(['percentage', num + '%']); continue; }
      T.push(['number', num]);
      continue;
    }
    if (c === '<' && s.startsWith('<!--', i)) { i += 4; T.push(['CDO', '<!--']); continue; }
    if (c === '-' && s.startsWith('-->', i)) { i += 3; T.push(['CDC', '-->']); continue; }
    if (startsIdent(s, i)) {
      const id = name();
      if (s[i] === '(') {
        i++;
        if (id.toLowerCase() === 'url') {
          let k = i; while (isWs(s[k])) k++;
          if (s[k] !== '"' && s[k] !== "'") {
            const a = i;
            while (i < n && s[i] !== ')') { if (s[i] === '\\') i += escLen(s, i); else i++; }
            const body = s.slice(a, i).replace(/^[ \t\n\r\f]+|[ \t\n\r\f]+$/g, '');
            i++;
            T.push(['url', body]);
            continue;
          }
        }
        T.push(['function', id + '(']);
        continue;
      }
      T.push(['ident', id]);
      continue;
    }
    if (c === '@' && startsIdent(s, i + 1)) { i++; T.push(['at', '@' + name()]); continue; }
    T.push([/[{}()[\],:;]/.test(c) ? c : 'delim', c]);
    i++;
  }
  fix();
  return T;
}

/* ★ F1 — the CSS keep rule, decided HERE from this file's own tokenizer (never by calling the
 * strip's scanner): a comment is REMOVABLE only when it sits at a statement boundary (the
 * previous token is `{`, `;`, `}` or none, at bracket depth 0 — #46 r1 B-3) and outside every custom-property value (from the
 * `:` of a `--name` declaration at a boundary to its `;` at depth 0 or the `}` that closes the
 * block), and no carrier / licence word keeps it (keepReason — the one shared word list). */
export function cssStructure(s) {
  const comments = [];
  const T = cssTokens(s, comments);
  const ext = [];
  for (let k = 0; k < T.length; k++) {
    const p = T[k - 1];
    const boundary = !p || p[0] === '{' || p[0] === ';' || p[0] === '}';
    if (T[k][0] === 'ident' && T[k][1].startsWith('--') && boundary && T[k + 1] && T[k + 1][0] === ':') {
      const start = T[k + 1][2];
      let depth = 0, end = s.length, m = k + 2;
      for (; m < T.length; m++) {
        const y = T[m][0];
        if (y === '(' || y === 'function' || y === '[' || y === '{') depth++;
        else if (y === ')' || y === ']') depth--;
        else if (y === '}') { if (depth === 0) { end = T[m][2]; break; } depth--; }
        else if (y === ';' && depth === 0) { end = T[m][2]; break; }
      }
      ext.push([start, end]);
      k = m - 1;
    }
  }
  // #46 r1 B-3 (X2's rule): a boundary needs bracket depth 0 — a `;` or `{` inside ( … ) / [ … ] is not one. depth[k] =
  // the open ( / function( / [ count before token k. (An escape is never a boundary: the tokenizer reads `\;` as an ident.)
  const depth = new Int32Array(T.length + 1);
  for (let k = 0, d = 0; k < T.length; k++) { depth[k] = d; const y = T[k][0]; if (y === '(' || y === 'function' || y === '[') d++; else if ((y === ')' || y === ']') && d > 0) d--; depth[k + 1] = d; }
  let t = 0;
  for (const c of comments) {
    while (t < T.length && T[t][3] <= c.start) t++;
    const p = T[t - 1];
    c.boundary = (!p || p[0] === '{' || p[0] === ';' || p[0] === '}') && depth[t] === 0;
    c.custom = ext.some(([a, b]) => a < c.start && c.start < b);
    c.removable = c.boundary && !c.custom && !L.keepReason(c.text);
    c.spans = false;
    // the statement it sits in: from the first token after the previous boundary token to the next boundary token
    let q = t - 1; while (q >= 0 && !/^[{};]$/.test(T[q][0])) q--;
    let r = t; while (r < T.length && !/^[{};]$/.test(T[r][0])) r++;
    c.stmt = [q + 1 < T.length ? Math.min(T[q + 1][2], c.start) : c.start, r < T.length ? T[r][2] : s.length];
  }
  /* the last keep rule ('value:spans-lines-with-content', after round 1), decided by THIS file's own walk: the candidates
   * are the comments the rules above remove. Cut every candidate out of the text; one that holds a line terminator
   * (\n, \r\n, \r, \f) leaves a mark. Split the result at its terminators (so a terminator inside a candidate never ends a
   * line, a terminator inside a KEPT comment does). A mark with content (a character that is not a space, a tab or a mark)
   * both before it and after it on its line stays. Stable: the candidate set is fixed, and keeping one comment only adds
   * content to its neighbours' lines — no second pass could change a decision of the first in the other direction. */
  const cand = comments.filter((c) => c.removable);
  const multi = cand.filter((c) => /[\n\r\f]/.test(c.text));
  if (multi.length) {
    const MK = '\uE001';
    let m = '', at = 0;
    for (const c of cand) { m += s.slice(at, c.start) + (/[\n\r\f]/.test(c.text) ? MK : ''); at = c.end; }
    m += s.slice(at);
    let k = 0;
    for (const line of m.split(/\r\n|[\n\r\f]/)) {
      for (let x = line.indexOf(MK); x >= 0; x = line.indexOf(MK, x + 1)) {
        const c = multi[k++];
        if (/[^ \t\uE001]/.test(line.slice(0, x)) && /[^ \t\uE001]/.test(line.slice(x + 1))) { c.removable = false; c.spans = true; }
      }
    }
    if (k !== multi.length) throw new Error('x-parser-crosscheck: internal — spans-lines marks ' + k + ' vs ' + multi.length + ' (a mark character in the text?)');
  }
  /* informational (#46 r2): the strip may also keep a comment inside a `{}` block that follows a `:` in its statement (a
   * block value / a nested rule with a pseudo-class), or one whose removal would join `/` and `*` */
  { const stack = []; let stmtColon = false, t2 = 0;
    const inVal = new Uint8Array(T.length + 1);
    for (let k = 0; k < T.length; k++) {
      inVal[k] = stack.some(Boolean) ? 1 : 0;
      const y = T[k][0];
      if (y === '{') { stack.push(stmtColon); stmtColon = false; }
      else if (y === '}') { stack.pop(); stmtColon = false; }
      else if (y === ';') stmtColon = false;
      else if (y === ':') stmtColon = true;
    }
    inVal[T.length] = 0;
    for (const c of comments) { while (t2 < T.length && T[t2][3] <= c.start) t2++; c.place = t2; c.inValueBlock = !!inVal[t2]; /* the block state between T[t2 - 1] and T[t2] */ c.wouldJoin = s[c.start - 1] === '/' && s[c.end] === '*'; } }
  return { tokens: T, comments, customValues: ext.map(([a, b]) => s.slice(a, b)) };
}

/** #46 r1 — the deletion rule of the lean CSS strip, checked from THIS file's own comment recogniser (cssTokens), never
 *  the strip's code: (i) comments out of both texts (a removed one leaves a mark), white-space runs collapsed — equal
 *  except at a removed comment, where the output has one space or, only after `{` `;` `}` / the start, none;
 *  (ii) the output's comments are source comments, byte for byte, in order; (iii) every source line that holds no part of
 *  a comment is in the output unchanged, in order. → [] or problem lines. */
export function cssDeletionProblems(name, src, out) {
  const P = [];
  const cs = [], co = [];
  let T, U;
  try { T = cssTokens(src, cs); U = cssTokens(out, co); } catch (e) { return [name + ': the independent tokenizer: ' + e.message]; }
  // (ii) — the output's comments are source comments, byte for byte, in order (a subsequence)
  { let m = 0; for (let k = 0; k < cs.length && m < co.length; k++) if (co[m].text === cs[k].text) m++;
    if (m !== co.length) P.push(name + ': (ii) a comment of the output is not a source comment in order: ' + JSON.stringify(co[m].text.slice(0, 60))); }
  // (i) — token by token: the raw text of every token is equal, and every GAP between two neighbouring tokens (white space
  //     and comments only) is compared by the rule. Gaps are aligned by the tokens, so a comment is matched only inside its
  //     own gap (a removed comment can never be "found" again in a later gap that holds a kept copy of the same text).
  if (T.length !== U.length) P.push(name + ': (i) ' + T.length + ' tokens in the source, ' + U.length + ' in the output');
  else {
    const MARK = '\uE000';
    const inGap = (list, a, b) => list.filter((c) => c.start >= a && c.end <= b);
    const view = (t, a, b, list, isRemoved) => { let r = '', at = a; for (const c of list) { r += t.slice(at, c.start) + (isRemoved(c) ? MARK : c.text); at = c.end; } return (r + t.slice(at, b)).replace(/[ \t\n\r\f]+/g, ' '); };
    let bad = null;
    for (let k = 0; k <= T.length && !bad; k++) {
      if (k < T.length && src.slice(T[k][2], T[k][3]) !== out.slice(U[k][2], U[k][3])) { bad = 'token ' + k + ' ' + JSON.stringify(src.slice(T[k][2], T[k][3]).slice(0, 60)) + ' → ' + JSON.stringify(out.slice(U[k][2], U[k][3]).slice(0, 60)); break; }
      const ga = k === 0 ? 0 : T[k - 1][3], gb = k < T.length ? T[k][2] : src.length;
      const ha = k === 0 ? 0 : U[k - 1][3], hb = k < U.length ? U[k][2] : out.length;
      const G = inGap(cs, ga, gb), H = inGap(co, ha, hb);
      const removed = new Set();
      { let m = 0; for (const c of G) { if (m < H.length && H[m].text === c.text) m++; else removed.add(c); } if (m !== H.length) { bad = 'a comment of the output is not one of its gap in the source: ' + JSON.stringify(H[m].text.slice(0, 60)); break; } }
      const vs = view(src, ga, gb, G, (c) => removed.has(c)), vo = view(out, ha, hb, H, () => false);
      if (!removed.size) { if (vs !== vo) bad = 'the white space between ' + (k ? JSON.stringify(T[k - 1][1]) : 'the start') + ' and ' + (k < T.length ? JSON.stringify(T[k][1]) : 'the end') + ' changed with no removed comment there: ' + JSON.stringify(vs.slice(0, 40)) + ' → ' + JSON.stringify(vo.slice(0, 40)); continue; }
      // a gap with a removed comment: equal except that each run of [space | removed comment] holding a removed comment
      // becomes one space in the output, or nothing — only after `{` `;` `}` or at the start
      let i = 0, j = 0;
      while (i < vs.length && !bad) {
        if (vs[i] === ' ' || vs[i] === MARK) {
          let e = i; while (e < vs.length && (vs[e] === ' ' || vs[e] === MARK)) e++;
          if (vs.slice(i, e).includes(MARK)) {
            if (vo[j] === ' ') j++;
            else {
              let q = j - 1; while (q >= 0 && vo[q] === ' ') q--;
              const prev = q >= 0 ? '' : k === 0 ? null : T[k - 1][0];     // a kept comment before it in the gap: not a boundary
              if (prev !== null && !(prev === '{' || prev === ';' || prev === '}')) bad = 'the separator at a removed comment is gone between ' + (k ? JSON.stringify(T[k - 1][1]) : 'the start') + ' and ' + (k < T.length ? JSON.stringify(T[k][1]) : 'the end');
            }
            i = e;
            continue;
          }
        }
        if (vs[i] !== vo[j]) bad = 'the gap between ' + (k ? JSON.stringify(T[k - 1][1]) : 'the start') + ' and ' + (k < T.length ? JSON.stringify(T[k][1]) : 'the end') + ': ' + JSON.stringify(vs.replace(/\uE000/g, '/*…*/').slice(0, 40)) + ' → ' + JSON.stringify(vo.slice(0, 40));
        i++; j++;
      }
      if (!bad && j < vo.length) bad = 'the gap between ' + (k ? JSON.stringify(T[k - 1][1]) : 'the start') + ' and ' + (k < T.length ? JSON.stringify(T[k][1]) : 'the end') + ' has more in the output: ' + JSON.stringify(vo.slice(j, j + 40));
    }
    if (bad) P.push(name + ': (i) beyond the removed comments and their white space: ' + bad);
  }
  // (iii) — every source line that holds no part of a comment is in the output unchanged, in order
  const lines = src.split('\n'), outLines = out.split('\n');
  const touched = new Uint8Array(lines.length);
  { const starts = [0]; for (let k = 0; k < src.length; k++) if (src[k] === '\n') starts.push(k + 1);
    const lineAt = (off) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const md = (lo + hi + 1) >> 1; if (starts[md] <= off) lo = md; else hi = md - 1; } return lo; };
    for (const c of cs) for (let x = lineAt(c.start), L1 = lineAt(Math.max(c.start, c.end - 1)); x <= L1; x++) touched[x] = 1; }
  let q = 0, lastK = -1, lastQ = -1;
  for (let k = 0; k < lines.length; k++) {
    if (touched[k]) continue;
    while (q < outLines.length && outLines[q] !== lines[k]) q++;
    if (q >= outLines.length) { P.push(name + ': (iii) source line ' + (k + 1) + ' holds no comment but is not in the output unchanged (in order): ' + JSON.stringify(lines[k].slice(0, 80)) + (lastK >= 0 ? ' (the comment-free line before it, source line ' + (lastK + 1) + ' ' + JSON.stringify(lines[lastK].slice(0, 30)) + ', matched output line ' + (lastQ + 1) + ')' : '')); break; }
    lastK = k; lastQ = q;
    q++;
  }
  return P;
}

export function cssPairProblems(name, src, out, { stats = null, idempotent = true } = {}) {
  const P = [];
  if (idempotent && L.stripCssLean(out, { file: name }) !== out) P.push(name + ': not idempotent');   // (the selftest turns this off only where the pair is the STRIP's choice, not this file's)
  let a, b, A, B;
  try { A = cssStructure(src); B = cssStructure(out); a = A.tokens; b = B.tokens; } catch (e) { return [...P, name + ': the independent tokenizer: ' + e.message]; }
  P.push(...noticeProblems(name, A.comments.map((c) => c.text), out));
  // #46 r2 — the comments, ONE-SIDED: every comment of the output is a source comment at the same place (next token) and
  // byte-identical; every comment this file's model keeps (keepReason, a custom-property value, not at a boundary, spans
  // lines with content) is in the output there. A left comment the model would remove is allowed (counted when stats).
  const mm = matchAtPlace(A.comments, B.comments);
  for (const c of mm.unmatched.slice(0, 3)) P.push(name + ': a comment of the output is not a source comment at the same place: ' + JSON.stringify(c.text.slice(0, 60)));
  const lostK = A.comments.map((c, k) => k).filter((k) => !A.comments[k].removable && !mm.matched.has(k));
  if (lostK.length) P.push(name + ': ' + lostK.length + ' comment(s) that must stay (' + (A.comments[lostK[0]].spans ? 'spans lines with content' : L.keepReason(A.comments[lostK[0]].text) ? 'keepReason' : A.comments[lostK[0]].custom ? 'in a custom-property value' : 'not at a statement boundary') + ') were removed: ' + JSON.stringify(A.comments[lostK[0]].text.slice(0, 60)));
  { // a comment kept INSIDE a statement: its statement is byte-identical
    const bi = [...mm.matched].sort((x, y) => x - y);
    let j = 0;
    for (const k of bi) {
      const c = A.comments[k];
      while (j < B.comments.length && !(B.comments[j].place === c.place && B.comments[j].text === c.text)) j++;
      const d = B.comments[j++];
      if (!d || (c.boundary && !c.custom)) continue;
      if (src.slice(c.stmt[0], c.stmt[1]) !== out.slice(d.stmt[0], d.stmt[1])) { P.push(name + ': the statement around a kept in-value comment changed: ' + JSON.stringify(c.text.slice(0, 50))); break; }
    }
  }
  if (stats) {
    for (const k of mm.matched) { const c = A.comments[k]; if (c.removable && !c.inValueBlock && !c.wouldJoin) stats.beyond = (stats.beyond || 0) + 1; }
    stats.removed = (stats.removed || 0) + (A.comments.length - mm.matched.size);
    if (src !== out) stats.changed = (stats.changed || 0) + 1;
  }
  // every custom-property value is byte-identical
  if (A.customValues.length !== B.customValues.length || A.customValues.some((v, k) => v !== B.customValues[k])) {
    const k = A.customValues.findIndex((v, j) => v !== B.customValues[j]);
    P.push(name + ': a custom-property value changed: ' + JSON.stringify(String(A.customValues[k]).slice(0, 60)) + ' → ' + JSON.stringify(String(B.customValues[k]).slice(0, 60)));
  }
  if (a.length !== b.length) P.push(name + ': ' + a.length + ' tokens → ' + b.length);
  for (let k = 0; k < Math.min(a.length, b.length); k++) {
    if (a[k][0] !== b[k][0] || a[k][1] !== b[k][1]) { P.push(name + ': token ' + k + ' ' + JSON.stringify(a[k]) + ' → ' + JSON.stringify(b[k])); break; }
  }
  P.push(...cssDeletionProblems(name, src, out));
  return P;
}

/* ─────────────── the tree ─────────────── */
function listAll(dir) {
  const out = [];
  const walk = (d, pre) => { for (const x of readdirSync(d)) { const q = join(d, x); if (statSync(q).isDirectory()) walk(q, pre + x + '/'); else out.push(pre + x); } };
  if (existsSync(dir)) walk(dir, '');
  return out.sort();
}

const isDir = (d) => { try { return statSync(d).isDirectory(); } catch (_) { return false; } };

export function crosscheck({ committed, packaged = null, css = true, js = true }) {
  const scope = L.leanScope({ css, js }, { legacyTokensStrip: stripCssComments });
  const P = [];
  const n = { ext: 0, inline: 0, tokens: 0, shells: 0, bodies: 0, sheets: 0, kept: 0, legacy: 0 };
  const sj = {}, sc = {};   // per kind: changed (files / bodies that differ), removed (comments), beyond (kept beyond the model)
  // #46 r1 C-6: two folders that do not exist gave "OK — 0 scripts"
  if (!committed || !isDir(committed)) P.push('the committed folder is not a directory: ' + committed);
  if (packaged !== null && !isDir(packaged)) P.push('the packaged folder is not a directory: ' + packaged);
  if (P.length) return { problems: P, n };
  const files = listAll(committed).filter((f) => /\.(html|css|js)$/.test(f));
  const read = (d, f) => readFileSync(join(d, f), 'utf8');
  const pkg = (f) => (packaged ? read(packaged, f) : scope.transform(f, read(committed, f)));
  for (const f of files) {
    const src = read(committed, f);
    let out;
    try { out = pkg(f); } catch (e) { P.push(f + ': ' + e.message); continue; }
    if (js && L.EXTERNAL_JS.includes(f)) {
      n.ext++;
      P.push(...jsPairProblems(f, src, out, { lines: true, compile: true, stats: sj }));
      n.tokens += acornRead(src).tokens.length;
    }
    if (f === 'spixi.tokens.css' && !css) {   // #1478: lean CSS off → the no-flag strip, byte for byte; no new-rule check applies
      n.legacy++;
      let want = null;
      try { want = stripCssComments(src); } catch (e) { P.push(f + ': today\'s stripCssComments throws: ' + e.message); }
      if (want !== null && want !== out) P.push(f + ': lean CSS is off, so it must be today\'s no-flag strip (stripCssComments) byte for byte — it is not');
    } else if (/\.css$/.test(f) && scope.inScope(f)) { n.sheets++; P.push(...cssPairProblems(f, src, out, { stats: sc })); }
    if (/\.html$/.test(f)) {
      n.shells++;
      P.push(...htmlProblems(f, src));
      P.push(...htmlProblems(f + ' (packaged)', out));
      let a, b;
      try { a = L.walkHtml(src, { file: f }).parts; b = L.walkHtml(out, { file: f }).parts; } catch (e) { P.push(f + ': ' + e.message); continue; }
      if (a.length !== b.length) { P.push(f + ': part count ' + a.length + ' → ' + b.length); continue; }
      const back = b.map((p, k) => (p.kind === 'markup' ? p.text : a[k].text)).join('');
      if (back !== src) P.push(f + ': the packaged document with the committed bodies put back is NOT the committed document');
      for (let k = 0; k < a.length; k++) {
        const p = a[k], q = b[k];
        if (p.kind === 'markup') continue;
        n.bodies++;
        const where = f + ' <' + p.kind + '> line ' + p.line;
        if (p.kind === 'script' && p.classicJs && js) { n.inline++; n.tokens += acornRead(p.text).tokens.length; P.push(...jsPairProblems(where, p.text, q.text, { compile: true, stats: sj })); }
        else if (p.kind === 'style' && p.css && css) { n.sheets++; P.push(...cssPairProblems(where, p.text, q.text, { stats: sc })); }
        else if (p.text !== q.text) P.push(where + ': an out-of-scope body changed');
      }
    }
  }
  // #46 r1 C-6: the counts the flags imply, derived from the committed folder (never a hard-coded 18)
  const wantShells = files.filter((f) => /\.html$/.test(f)).length;
  const wantSheets = Math.max(3, files.filter((f) => /\.css$/.test(f) && scope.inScope(f)).length);
  if (!css && files.includes('spixi.tokens.css') && n.legacy !== 1) P.push('spixi.tokens.css was not compared with the no-flag strip (lean CSS off)');
  if (wantShells < 1 || n.shells !== wantShells) P.push('compared ' + n.shells + ' shell(s); the committed folder holds ' + wantShells + ' *.html (at least 1 needed)');
  if (js && n.ext !== L.EXTERNAL_JS.length) P.push('compared ' + n.ext + ' external script(s) of ' + L.EXTERNAL_JS.length + ' (' + L.EXTERNAL_JS.filter((f) => !files.includes(f)).join(', ') + (L.EXTERNAL_JS.some((f) => !files.includes(f)) ? ' not in the committed folder' : '') + ')');
  if (js && n.inline < 1) P.push('compared ' + n.inline + ' inline script(s) (at least 1 needed with --lean-js)');
  if (css && n.sheets < wantSheets) P.push('compared ' + n.sheets + ' sheet(s) (at least ' + wantSheets + ' needed with --lean-css)');
  // #46 r2 C-2: a package that equals the committed tree in its lean scope is not a lean package (a wiring fault that
  // passed the committed folder twice, or a no-flag package, would make every proof above vacuous)
  if (js && (!sj.changed || !sj.removed)) P.push('lean js: no script differs from the committed one and no comment was removed (' + (sj.changed || 0) + ' changed, ' + (sj.removed || 0) + ' removed) — a lean package that is byte-identical to the committed tree is not a lean package');
  if (css && (!sc.changed || !sc.removed)) P.push('lean css: no sheet differs from the committed one and no comment was removed (' + (sc.changed || 0) + ' changed, ' + (sc.removed || 0) + ' removed) — a lean package that is byte-identical to the committed tree is not a lean package');
  n.js = sj; n.css = sc;
  return { problems: P, n };
}

/* ─────────────── the corpus ─────────────── */
export async function runCorpus() {
  const { default: cases } = await import(new URL('./corpus/cases.mjs', import.meta.url));
  const P = [];
  let pass = 0, v8Cases = 0;
  for (const c of cases) {
    let out = null, err = null;
    try {
      if (c.kind === 'js') out = L.stripJsComments(c.input, { keepLines: c.keepLines !== false, file: c.id });
      else if (c.kind === 'css') out = L.stripCssLean(c.input, { file: c.id });
      else if (c.kind === 'html') out = L.leanHtml(c.input, { css: c.css !== false, js: c.js !== false, file: c.id });
      else throw new Error('unknown kind ' + c.kind);
    } catch (e) { err = e; }
    const bad = [];
    if (c.throws) {
      if (!err) bad.push('expected a throw matching /' + c.throws + '/, got ' + JSON.stringify(out));
      else if (!new RegExp(c.throws).test(err.message)) bad.push('threw, but not /' + c.throws + '/: ' + err.message);
    } else if (err) bad.push('threw: ' + err.message);
    else {
      if (out !== c.expect) bad.push('got ' + JSON.stringify(out) + ' — expected ' + JSON.stringify(c.expect));
      if (c.kind === 'js' && c.acorn !== false) bad.push(...jsPairProblems(c.id, c.input, out, { lines: c.keepLines !== false, allowReturn: true }).map((x) => 'token check: ' + x));
      if (c.kind === 'js' && c.acorn === false) {
        v8Cases++;
        // not acorn-readable (an acorn defect or a non-JS glue probe): V8 must compile input and output alike
        const v8 = (t) => { try { new vm.Script(t); return 'ok'; } catch (e) { return 'error'; } };
        if (v8(c.input) !== v8(out)) bad.push('V8 compiles the input ' + v8(c.input) + ' and the output ' + v8(out));
      }
      if (c.kind === 'css') bad.push(...cssPairProblems(c.id, c.input, out));   // (the case field `todayDiffers` is not read any more: the comparison with today's strip is gone)
      if (c.kind === 'html') {
        bad.push(...htmlProblems(c.id, c.input));
        try {
          const a = L.walkHtml(c.input).parts, b = L.walkHtml(out).parts;
          for (let k = 0; k < a.length; k++) if (a[k].kind === 'script' && a[k].classicJs && c.js !== false) bad.push(...jsPairProblems(c.id + ' script', a[k].text, b[k].text, { allowReturn: true }));
        } catch (e) { bad.push('re-walk: ' + e.message); }
      }
      if (c.kind !== 'html') {
        const again = c.kind === 'js' ? L.stripJsComments(out, { keepLines: c.keepLines !== false }) : L.stripCssLean(out);
        if (again !== out) bad.push('not idempotent');
      }
    }
    if (bad.length) P.push(c.id + ': ' + bad.join(' · ')); else pass++;
  }
  return { problems: P, pass, total: cases.length, v8Cases };
}

/* ─────────────── the self-test: hand-made pairs that must be REPORTED or ACCEPTED (run by --selftest and first in --corpus) ─────────────── */
export function selfTest() {
  /* #46 r2 C-4: every REPORT case names the REASON it must be reported for (a pattern on the problem text), so switching
   * one check off fails the selftest even when another check still reports the pair. Each check below has at least one
   * pair that only it reports for that reason: CSS (i) the gap rule, (ii) the comment order, (iii) the line rule, the
   * token compare and the custom-property compare of cssPairProblems, the keep model (spans lines); JS the syntax tree,
   * the token compare, the line compare of the externals (`lines`), the comment rules. */
  const P = [];
  let total = 0;
  const judge = (kind, name, got, want) => {
    total++;
    if (want === null) { if (got.length) P.push(kind + ' ' + name + ': must be ACCEPTED, reported: ' + got.join(' | ').slice(0, 160)); return; }
    if (!got.some((x) => want.test(x))) P.push(kind + ' ' + name + ': must be reported for ' + want + ' — got ' + (got.length ? got.join(' | ').slice(0, 160) : 'nothing'));
  };
  const js = (name, src, out, want, o = {}) => judge('JS', name, jsPairProblems(name, src, out, { allowReturn: true, ...o }), want);
  const cssDel = (name, src, out, want) => judge('CSS', name, cssDeletionProblems(name, src, out), want);
  const cssPair = (name, src, out, want, o = {}) => { let r; try { r = cssPairProblems(name, src, out, o); } catch (e) { r = ['throws: ' + e.message]; } judge('CSS', name, r, want); };
  // JS — reported, each for its reason
  js('ASI return', 'function f(){\n  return /* why\n  */ 1;\n}', 'function f(){\n  return 1;\n}', /the syntax tree differs/);
  js('ASI ++', 'a /* x\n */ ++\nb', 'a  ++\nb', /the syntax tree differs/);
  js('string changed', 'x = "a"; /* c */', 'x = "b";', /: token \d+ .*string/);
  js('template changed', 'x = `a${1}b`; /* c */', 'x = `a${1}c`;', /: token \d+ .*template/);
  js('regex changed', 'x = /a+/g; /* c */', 'x = /a*/g;', /: token \d+ .*regexp/);
  js('a line moved (externals)', 'a = 1;\nb = 2; // c', 'a = 1; b = 2;\n', /moved from line 2 to 1/, { lines: true });
  js('must-stay comment removed', '/*! MIT */\nx = 1;', '\nx = 1;', /must stay \(keepReason\) were removed/);
  js('a comment invented', 'x = 1;', 'x = /* new */ 1;', /not a source comment at the same place/);
  js('a comment moved', 'x = 1; // c\ny = 2;', 'x = 1;\ny = 2; // c', /not a source comment at the same place/);
  // JS — accepted
  js('ASI return, right', 'function f(){\n  return /* why\n  */ 1;\n}', 'function f(){\n  return \n   1;\n}', null);
  js('ASI ++, right', 'a /* x\n */ ++\nb', 'a \n ++\nb', null);
  js('comment removed', 'function f(){\n  return 1; /* c */\n}', 'function f(){\n  return 1;\n}', null);
  js('literals kept', 'x = "a/*b*/" + `t${1}` + /r\\/\\*/g + 10n; // c', 'x = "a/*b*/" + `t${1}` + /r\\/\\*/g + 10n;', null);
  js('a removable comment kept at its place (allowed)', 'x = a / b; // c\ny = 1; /* d */', 'x = a / b; // c\ny = 1;', null, { lines: true });
  // CSS — reported, each for its reason
  cssDel('(i) only: descendant glued on a line with a comment', '.a .b { x: 1 } /* c */\n', '.a.b { x: 1 }\n', /\(i\) beyond the removed comments/);
  cssDel('(i): 1px2px', '.a { m: 1px 2px; }\n', '.a { m: 1px2px; }\n', /\(i\) /);
  cssDel('(ii) only: an invented comment where the tokens differ too', '.a{} /*! x */\n', '.a{} .b{} /*! y */\n', /\(ii\) a comment of the output is not a source comment/);
  cssDel('(iii): blank-line squeeze on a comment-free line', '.a {}\n\n\n\n.b {}\n/* c */\n', '.a {}\n\n.b {}\n', /\(iii\) source line 4/);
  cssDel('(iii): trailing-blank trim on a comment-free line', '.a {}   \n/* c */\n.b {}\n', '.a {}\n.b {}\n', /\(iii\) source line 1/);
  cssDel('(iii): B-1 hex-escape space trimmed', '.a\\3A \n.b {}\n/* c */\n', '.a\\3A\n.b {}\n', /\(iii\) source line 1/);
  cssDel('(i): B-1 nbsp line blanked', '.a {}\n \n.b {}\n', '.a {}\n\n.b {}\n', /\(i\) /);
  cssDel('(i): changed kept comment', '/*! MIT */\n.a {}\n', '/*! mit */\n.a {}\n', /\(i\) .*not one of its gap/);
  cssPair('token compare only: a value changed', '.a{color:red} /* c */', '.a{color:blue}', /: token \d+ \["ident","red"/);
  cssPair('custom-property compare only: white space inside a custom value', ':root{--a: 1px  2px;} /* c */', ':root{--a: 1px 2px;}', /a custom-property value changed/);
  cssPair('keep model: a spans-lines comment removed', '.a { /* x\n y */ color: red }', '.a {  color: red }', /must stay \(spans lines with content\) were removed/);
  cssPair('keep model: a spans-lines comment removed (CRLF)', '.a { /* x\r\n y */ color: red }', '.a {  color: red }', /must stay \(spans lines with content\) were removed/);
  cssPair('keep model: a licence comment removed', '/*! MIT */ .a{}', ' .a{}', /must stay \(keepReason\) were removed/);
  cssPair('an invented comment', '.a{}', '.a{} /* new */', /not a source comment at the same place/);
  // `\` + CR LF inside a string is ONE escaped newline: the string goes on. A tokenizer that ends it early sees the change
  // below as an ident, never as the string token
  cssPair('\\ + CRLF in a string: the text after it changed', '.a { content: "a\\\r\nb"; } /* c */', '.a { content: "a\\\r\nB"; }', /: token \d+ \["string","\\"a/);
  cssPair('\\ + CRLF in a single-quoted string: changed', ".a { content: 'a\\\r\nb'; } /* c */", ".a { content: 'a\\\r\nB'; }", /: token \d+ \["string","'a/);
  // CSS — accepted (good pairs, the spans-lines witnesses, a removable comment the strip chose to keep)
  for (const [n, a, b] of [
    ['own-line comment', '.a { color: red; }\n/* c */\n.b { color: blue; }\n', '.a { color: red; }\n.b { color: blue; }\n'],
    ['trailing comment + its blanks', '.a { color: red; }   /* c */\n\n\n.b {}\n', '.a { color: red; }\n\n\n.b {}\n'],
    ['boundary, no white space', '.a{color:red;}/* c */.b{}', '.a{color:red;}.b{}'],
    ['leading comment then code', '/* c */ .a {}\n', ' .a {}\n'],
    ['kept licence comment', '/*! MIT */\n.a {}\n/* x */\n', '/*! MIT */\n.a {}\n'],
    ['spans: content both sides → kept', '.a { /* x\n y */ color: red }', '.a { /* x\n y */ color: red }'],
    ['spans: blanks before → goes', '.a {\n  /* x\n y */ color: red }', '.a {\n   color: red }'],
    ['spans: blanks after → goes', '.a { /* x\n y */\n  color: red }', '.a {\n  color: red }'],
    ['spans: alone → its lines go', '.a {\n  /* x\n y */\n  color: red }', '.a {\n  color: red }'],
    ['spans: two in one joined line → both kept', 'X{} /*a\nb*/ /*c\nd*/ Y{}', 'X{} /*a\nb*/ /*c\nd*/ Y{}'],
    ['spans: second has no content after → goes', 'X{} /*a\nb*/ Y{} /*c\nd*/', 'X{} /*a\nb*/ Y{}'],
    ['spans: a kept comment is content', '.a{} /*MIT*/ /* x\n y */ .b{}', '.a{} /*MIT*/ /* x\n y */ .b{}'],
    ['spans: CRLF → kept', '.a { /* x\r\n y */ color: red }', '.a { /* x\r\n y */ color: red }'],
    ['\\ + CRLF in a string (one escaped newline)', '.a::before { content: "a\\\r\nb"; /* c */ quotes: "x" "y"; }', '.a::before { content: "a\\\r\nb"; quotes: "x" "y"; }'],
    ['a hex escape that eats CR LF', '.a\\3A\r\n.b { x: 1 } /* c */', '.a\\3A\r\n.b { x: 1 }'],
  ]) { cssDel(n, a, b, null); cssPair(n, a, b, null); }
  // a comment the model would remove but the STRIP keeps (its block-value rule): allowed by the one-sided check; the
  // idempotence of that output is the strip's own property, so it is not judged here
  cssDel('a value-block comment the strip keeps (allowed)', '.a { b: { /* c */ x: 1 } }\n/* d */\n', '.a { b: { /* c */ x: 1 } }\n', null);
  cssPair('a value-block comment the strip keeps (allowed)', '.a { b: { /* c */ x: 1 } }\n/* d */\n', '.a { b: { /* c */ x: 1 } }\n', null, { idempotent: false });
  return { problems: P, total };
}

/* ─────────────── CLI ─────────────── */
const isMainModule = (() => {
  if (!process.argv[1]) return false;
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch (_) { return false; }
})();
/* r2C-9: a failing run ends with a `FAILED:` block like the other harnesses (an empty line, the line `FAILED:`, every problem line, at most 50): the CI annotation step publishes the lines after it */
const failBlock = (lines) => { console.log('\nFAILED:'); for (const l of lines.slice(0, 50)) console.log('  ' + l); if (lines.length > 50) console.log('  … ' + (lines.length - 50) + ' more'); };
if (isMainModule) {
  const args = process.argv.slice(2);
  const val = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  try {
    { // #46 r2 C-4: the selftest runs first in EVERY run (--selftest, --corpus, a packaged and an in-memory run)
      const st = selfTest();
      for (const p of st.problems) console.log('  \u2717 selftest: ' + p);
      console.log('x-parser-crosscheck --selftest: ' + (st.problems.length ? 'FAILED' : 'OK') + ' — ' + (st.total - st.problems.length) + ' / ' + st.total + ' hand-made pairs judged as expected (JS: jsPairProblems; CSS: cssDeletionProblems + cssPairProblems)');
      if (st.problems.length) { failBlock(st.problems.map((p) => 'selftest: ' + p)); process.exit(1); }
      if (args.includes('--selftest')) process.exit(0);
    }
    if (args.includes('--corpus')) {
      const r = await runCorpus();
      for (const p of r.problems) console.log('  \u2717 ' + p);
      console.log('x-parser-crosscheck --corpus: ' + (r.problems.length ? 'FAILED' : 'OK') + ' — ' + r.pass + ' / ' + r.total + ' cases pass (expected output or expected throw; acorn token equality on every JS case that does not throw, except ' + r.v8Cases + ' marked acorn:false — V8 compiles input and output alike there)');
      if (r.problems.length) failBlock(r.problems);
      process.exit(r.problems.length ? 1 : 0);
    }
    let css = args.includes('--lean-css'), js = args.includes('--lean-js');
    if (!css && !js) css = js = true;
    const committed = val('--committed') || join(root, 'Spixi', 'Resources', 'Raw', 'html');
    const packaged = val('--packaged');
    // #46 r2 C-2: the same folder twice proves nothing (a wiring fault would make the only independent proof vacuous)
    if (packaged !== null) { let a = committed, b = packaged; try { a = realpathSync(committed); b = realpathSync(packaged); } catch (_) { /* crosscheck reports a missing folder */ } if (a === b) { console.log('x-parser-crosscheck: --committed and --packaged are the same folder (' + a + ') — refusing'); process.exit(2); } }
    const t0 = Date.now();
    const r = crosscheck({ committed, packaged, css, js });
    for (const p of r.problems.slice(0, 40)) console.log('  \u2717 ' + p);
    if (r.problems.length > 40) console.log('  … ' + (r.problems.length - 40) + ' more');
    if (!r.n || (js && !r.n.js) || (css && !r.n.css)) { console.log('x-parser-crosscheck: FAILED (' + r.problems.length + ' problem(s)) — stopped before the comparison'); failBlock(r.problems); process.exit(1); }
    const n = r.n;
    console.log('x-parser-crosscheck: ' + (r.problems.length ? 'FAILED (' + r.problems.length + ' problem(s))' : 'OK') + ' — lean ' + [css && 'css', js && 'js'].filter(Boolean).join(',')
      + (packaged ? ' (packaged ' + packaged + ')' : ' (stripped in memory)')
      + (js ? ' · js: ' + (n.ext + n.inline) + ' scripts (' + n.ext + ' external + ' + n.inline + ' inline), ' + n.tokens + ' acorn tokens equal, syntax trees equal, lines held in the externals, only kept comments left' : '')
      + ' · html: ' + n.shells + ' shells, ' + n.bodies + ' bodies = jsdom, put-back byte-identical'
      + (css ? ' · css: ' + n.sheets + ' sheets idempotent, independent tokens equal, only kept comments left, changed only at a removed comment and its white space' : (n.legacy ? ' · css: spixi.tokens.css \u2261 today\'s no-flag stripCssComments (lean CSS off, #1478)' : ''))
      + ' · lean difference: ' + [js && 'js ' + (n.js.changed || 0) + ' changed / ' + (n.js.removed || 0) + ' comments removed / ' + (n.js.beyond || 0) + ' kept beyond this file\'s model', css && 'css ' + (n.css.changed || 0) + ' changed / ' + (n.css.removed || 0) + ' comments removed / ' + (n.css.beyond || 0) + ' kept beyond this file\'s model'].filter(Boolean).join(', ')
      + ' · ' + Math.round((Date.now() - t0) / 100) / 10 + ' s');
    if (r.problems.length) failBlock(r.problems);
    process.exit(r.problems.length ? 1 : 0);
  } catch (e) {
    console.log('x-parser-crosscheck: FAILED — ' + (e && e.message));
    failBlock(['x-parser-crosscheck: ' + (e && e.message)]);
    process.exit(1);
  }
}
