/* lean-strip.mjs — the transforms of the Release LEAN packaging strips (P-06 CSS, P-07 JS),
 * docs/contract-perflean.md § 3.3. Node built-ins and repo files only: `strip-release.mjs`
 * runs this on Release machines that may have no node_modules. NO PARSER: the JS strip is a
 * hand-written scanner; its independent proof is scripts/pins-perflean/x-parser-crosscheck.mjs
 * (acorn + jsdom), which is NOT in the packaging path.
 *
 * THE ONE RULE OF EVERY TRANSFORM HERE: remove comments; the white space around a removed comment
 * changes only by each strip's own stated rule (CSS: the rule of the CSS section — deletions only,
 * and a line without a removed comment stays byte for byte; JS: the rule of stripJsComments). A string, a template
 * literal, a regular expression, a url(), markup, an HTML comment, a JSON / data block and every
 * `*SL{…}` carrier stay byte for byte. Where a scanner cannot read a character with certainty
 * (an unterminated literal, an HTML-like comment token in JS code, a NUL, a tag it does not
 * understand) it THROWS with the file and the line — the Release build stops. The JS scanner has
 * ONE decision that the grammar does not always fix from the previous token: division or regular
 * expression after `)`, `}`, `++` / `--`, a line break or a contextual word. There its classifier
 * decides, and rules K / H of the JavaScript section make a wrong decision harmless: nothing is
 * removed on the rest of that line, and what could carry a wrong reading to the next line is refused.
 *
 * KEPT COMMENTS (one rule, `keepReason`, used by the CSS strip, the JS strip, the gates and the
 * cross-check): a comment that holds `*SL{` (the carrier rule, contract § 3.1), names a licence
 * (the licence rule) or holds a source attribution (a URL, `@author`, `adapted from`, `ported
 * from`, `stackoverflow`) stays byte for byte. A RUN of `//` line comments on adjacent lines (only
 * white space and one line break between two of them) is ONE comment for these rules: the
 * vendored qrcode-generator banner in spixi.bundle.js is such a run.
 */
import vm from 'node:vm';
import { carrierDiff, formatCarrierDiff, lineInvariant, EXTERNAL_JS, JS_LINE_ANCHORS } from './lean-gates.mjs';

export { EXTERNAL_JS };

const NUL = String.fromCharCode(0);

/* ═══════════════════════════════ the keep rule ═══════════════════════════════ */

const LICENCE_WORDS_I = /@licen[cs]e|@preserve|@copyright|copyright|\u00a9|spdx-license-identifier|licen[cs]e|\bvendored\b/i;
const LICENCE_WORDS_CS = /\b(?:OFL|CC-BY|CC0|MIT|Apache|BSD)\b/;
/* a source attribution of copied / ported code (review S-4: a Stack Overflow URL in the vendored
 * qrcode-generator): a URL, or an attribution word. Its own reason, so statistics tell it from a licence. */
const SOURCE_URL_I = /https?:\/\//i;
const ATTRIBUTION_WORDS_I = /@author|adapted from|ported from|stackoverflow|tabler/i;   // tabler: the icon set (review r2 A-5)

/** null = the comment may be removed; else the reason it stays ('carrier', 'licence:<word>',
 *  'source-url', 'attribution:<word>'). Keeping more is safe: a kept comment stays byte for byte.
 *  (The JS strip has one more reason that is not about the text: 'after-uncertain-slash', rule K
 *  of the JavaScript section — see keepUnits.) */
export function keepReason(commentText) {
  const t = String(commentText);
  if (t.includes('*SL{')) return 'carrier';
  if (t.startsWith('/*!')) return 'licence:/*!';
  let m = LICENCE_WORDS_I.exec(t);
  if (m) return 'licence:' + m[0];
  m = LICENCE_WORDS_CS.exec(t);
  if (m) return 'licence:' + m[0];
  if (SOURCE_URL_I.test(t)) return 'source-url';
  m = ATTRIBUTION_WORDS_I.exec(t);
  if (m) return 'attribution:' + m[0].toLowerCase();
  return null;
}

/* ═══════════════════════════════ shared helpers ═══════════════════════════════ */

/** 1-based line of offset `at` (counts '\n'). Binary search over a per-text index (cached for the last text). */
let lineIdxText = null, lineIdx = null;
export function lineOf(text, at) {
  if (text !== lineIdxText) {
    lineIdx = [];
    for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) lineIdx.push(i);
    lineIdxText = text;
  }
  let lo = 0, hi = lineIdx.length;          // count of newlines with offset < at
  while (lo < hi) { const mid = (lo + hi) >> 1; if (lineIdx[mid] < at) lo = mid + 1; else hi = mid; }
  return lo + 1;
}

/* `file` may carry a line base: { name, lineBase } (an inline body reports the shell's line) */
function fail(file, text, at, what) {
  const name = file && typeof file === 'object' ? file.name : (file || '<input>');
  const base = file && typeof file === 'object' ? file.lineBase - 1 : 0;
  const e = new Error('lean-strip: ' + name + ':' + (base + lineOf(text, at)) + ' — ' + what + ' — refusing to strip');
  e.leanStrip = true;
  throw e;
}

/* ═══════════════════════════════ CSS ═══════════════════════════════
 * stripCssLean — THE RULE (lead, after review finding B-1): the lean CSS strip changes ONLY a
 * removed comment and the white space that belonged to it; every other byte of the sheet stays
 * byte for byte. In two steps:
 *   1 · scanCss decides, comment by comment, what may go (the keep rules below). It also THROWS
 *       where it cannot be certain: a NUL, an unterminated comment / string / url(, a string with
 *       an unescaped line break, an escaped name right before `(` (it could spell `url(`), an
 *       escape that could spell a custom-property name at a declaration position.
 *   2 · cssDeletions turns the removed comments into deletions, line by line. A "line" here is
 *       the text between two line terminators (LF, CRLF, CR, FF) that are NOT inside a removed
 *       comment (a multi-line comment joins its lines into one):
 *         (a) a line with no removed comment is NEVER changed (no trim, no squeeze);
 *         (b) a line that holds nothing but spaces / tabs once its removed comments are gone is
 *             deleted whole, with ITS OWN line terminator (the last line of the text has none:
 *             only its characters go). No terminator is ever added, so LF / CRLF stays as written;
 *         (c) a line with other content whose LAST removed comment has only spaces / tabs after
 *             it: that comment, the blanks after it up to the line end, and the run of blanks
 *             (and removed comments) directly before it go — `a: b; /* c *\/⏎` → `a: b;⏎`;
 *         (d) any other removed comment: only its own bytes go.
 *       No case merges two lines that both hold other content: a comment that would (it holds a
 *       line terminator, with content before it AND after it on its joined line) is KEPT by the
 *       last keep rule below, so a removed multi-line comment always has, on its joined line,
 *       content on one side at most (rule (b), (c) or (d) then applies).
 *       Token glue: the output character before a removed comment is never a name character —
 *       a removable comment sits at a statement boundary, so between it and the previous
 *       significant character (`{` `;` `}` or the start) stand only white space and comments,
 *       and a kept comment ends in `*\/`. No case needs an inserted space. A kept comment's
 *       final `/` followed by removed comments and then `*` WOULD join into `/*`: that run is kept
 *       (the keep rule 'value:would-join-slash-star', r2 B-4). A deletion that would still join two
 *       name characters, or `/` and `*`, THROWS (a defence, unreachable by the rules above).
 *
 * KEEP RULES — a comment STAYS byte for byte when:
 *   · keepReason(text) is truthy (the carrier `*SL{`, a licence word, any later reason);
 *   · ★ F1: it sits inside the value of a custom property (from the `:` of a `--name`
 *     declaration at a declaration position to the `;` at bracket depth 0 or the `}` that closes
 *     the block): a custom property's value is serialized exactly as written, comments included,
 *     and JS reads it with getPropertyValue;
 *   · ('value:spans-lines-with-content', lead's decision after round 1) it holds a line
 *     terminator, and its JOINED line (the physical lines joined by every comment that the other
 *     rules let go and that holds a terminator) has other content — a character that is not a
 *     space / tab and not inside such a comment, kept comments included — both before it AND
 *     after it. `.a { /* x⏎ y *\/ color: red }` stays as written; `  /* x⏎ y *\/ color: red`
 *     (blanks before) and `.a { /* x⏎ y *\/⏎` (blanks after) still go by (d) / (c). Keeping such
 *     a comment never creates a new case: the content on each side of the other comments of the
 *     joined line only shrinks;
 *   · it is NOT at a statement boundary. A boundary = bracket depth 0 (no `(` `[` — and no `{`
 *     opened inside them — is open; B-3) AND the previous significant character (not white space,
 *     not a comment) is `{` `;` `}` or the start. After an escape the previous character is a
 *     neutral name mark, so `\{` `\;` `\}` are never a boundary (B-4). A declaration that holds
 *     var() keeps its author text in the CSSOM (comments included), and a comment inside a
 *     selector / prelude / value can sit between two tokens: when in doubt, keep.
 *   · ★ r2 B-1 — BLOCK CONTEXTS: every block's inside is a list of RULES or of DECLARATIONS.
 *     The top level is 'rules'; a block is 'rules' only when its prelude is a grouping at-rule
 *     (CSS_GROUPING_RE: @media @supports @layer @container @document @starting-style, a
 *     vendor prefix allowed) AND its parent is 'rules'; every other block (a style rule,
 *     @font-face, @page, @property, @function, @keyframes and its keyframe blocks, @counter-style,
 *     @font-feature-values, an unknown or escaped at-rule, a grouping at-rule inside 'decls') is
 *     'decls'. In 'decls', a statement that is not an at-rule and holds a `:` at bracket depth 0
 *     before its `{` is AMBIGUOUS (a declaration with a `{}` value, or a nested rule like
 *     `&:hover {`): that `{` opens a VALUE block — kept whole, like a custom-property value — and
 *     after its `}` the previous character is a neutral mark (no boundary until the next `;`).
 *     Misreading 'rules' as 'decls' only keeps more. The reverse is the danger, so an at-rule is
 *     in the grouping list ONLY when the browser drops a bare declaration directly inside it:
 *     `@scope` is NOT in the list (#46 r3 B-1: Chromium accepts declarations directly in `@scope`
 *     and keeps a `{}` value there as text) — its block is 'decls';
 *   · (#46 r3 B-2) a statement that starts with `@charset` anywhere but at offset 0 of the sheet is
 *     REFUSED: the browser honours `@charset` only as the very first bytes of a linked sheet, so a
 *     removed comment before it would move it there and change how the sheet is decoded;
 *   · ('value:would-join-slash-star', r2 B-4) a run of removable comments that touch one another,
 *     right after a kept comment's `*\/` and right before a `*`;
 *   · a sheet holding `<!--` or `-->` (CDO / CDC) outside a string, url or comment is REFUSED (r2 B-3).
 * Escapes outside strings are content (`\/*` is not a comment opener); `url(` is a url token
 * only as a whole name (not `xurl(`, `#url(`, `@url(`, `\75rl(` — the last is refused).
 */
const CSS_GLUE = (c) => c !== undefined && (/[A-Za-z0-9\-_%.#@\\]/.test(c) || c.charCodeAt(0) >= 0x80);
const CSS_IDENT_CHAR = (c) => c !== undefined && (/[A-Za-z0-9\-_\\]/.test(c) || c.charCodeAt(0) >= 0x80);
const CSS_NL = (c) => c === '\n' || c === '\r' || c === '\f';
const CSS_WS = (c) => c === ' ' || c === '\t' || CSS_NL(c);
const CSS_HEX = (c) => c !== undefined && /[0-9A-Fa-f]/.test(c);
/* a character that continues a name token (an ident, a hash `#x`, an at-keyword `@x`, a dimension) */
const CSS_NAME_CHAR = (c) => c !== undefined && (/[A-Za-z0-9\-_]/.test(c) || c.charCodeAt(0) >= 0x80);
const CSS_CLOSER = { ')': '(', ']': '[', '}': '{' };
/* r2 B-1: the at-rules whose block holds a LIST OF RULES (when their parent holds rules too);
 * ASCII case-insensitive, with an optional vendor prefix (`@-moz-document`) */
const CSS_GROUPING_RE = /^(?:-[A-Za-z0-9]+-)?(?:media|supports|layer|container|document|starting-style)$/i;

/* The length of the escape that starts at `i` (css[i] === '\\'), or 0 when `\` is not an escape
 * (a line break or the end follows: then it is a lone delimiter). A hex escape takes up to six
 * hex digits and ONE white-space character after them (CRLF counts as one). */
function cssEscapeLen(css, i) {
  const d = css[i + 1];
  if (d === undefined || CSS_NL(d)) return 0;
  if (CSS_HEX(d)) {
    let j = i + 1;
    while (j < i + 7 && CSS_HEX(css[j])) j++;
    if (css[j] === '\r' && css[j + 1] === '\n') return j + 2 - i;
    if (CSS_WS(css[j])) return j + 1 - i;
    return j - i;
  }
  const cp = css.codePointAt(i + 1);
  return 1 + (cp > 0xffff ? 2 : 1);
}

/* scanCss — step 1. Returns { removed: [[start, end)…] } (source offsets, in order) and reports
 * every kept comment to onKept({ start, end, line, reason, text }). */
function scanCss(css, file, onKept) {
  if (css.indexOf(NUL) >= 0) fail(file, css, css.indexOf(NUL), 'a NUL character');
  const removed = [];
  const kept = [];
  const n = css.length;
  let i = 0;
  let prevSig = null;              // the last significant SOURCE character (escape → 'a', a neutral name mark)
  const stack = [];                // open ( [ — and every { opened inside them or inside a custom-property value
  let cpName = false;              // reading a `--name` at a declaration position
  let cp = false;                  // inside a custom-property value
  let cpNameDone = false;          // white space / a comment followed the `--name`: only `:` may come
  let inName = false;              // the previous source character continues a name token
  let nameEsc = false;             // … and that name token holds an escape
  // r2 B-1 — block contexts: the context of every open block ('rules' | 'decls'; the top level is
  // 'rules') and the facts of the current statement (since the last `{` `;` `}` at depth 0)
  const blocks = [];
  let stmtStarted = false, stmtAt = false, atName = null, stmtColon = false;
  const startStmt = (at) => {
    if (stmtStarted) return;
    stmtStarted = true;
    if (css[at] === '@') {
      stmtAt = true;
      const m = /^@([A-Za-z0-9\-_\u0080-\uffff]*)/.exec(css.slice(at, at + 80));
      atName = css[at + m[0].length] === '\\' ? null : m[1];    // an escaped name: unknown (→ 'decls')
      if (at !== 0 && atName !== null && atName.toLowerCase() === 'charset') fail(file, css, at, 'an `@charset` rule that is not at the very start of the sheet (the browser reads it only there; a removed comment before it would move it)');
    }
  };
  const endStmt = () => { stmtStarted = false; stmtAt = false; atName = null; stmtColon = false; };
  const atBoundary = () => stack.length === 0 && (prevSig === null || prevSig === '{' || prevSig === ';' || prevSig === '}');
  while (i < n) {
    const c = css[i];
    if (CSS_WS(c)) { inName = false; if (cpName) cpNameDone = true; i++; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      for (;;) {
        if (j >= n) fail(file, css, i, 'an unterminated CSS string');
        const d = css[j];
        if (d === c) break;
        if (d === '\\') { j += (css[j + 1] === '\r' && css[j + 2] === '\n') ? 3 : 2; continue; }
        if (CSS_NL(d)) fail(file, css, i, 'a CSS string with an unescaped line break');
        j++;
      }
      startStmt(i);
      i = j + 1;
      prevSig = c; cpName = false; inName = false;
      continue;
    }
    if (c === '\\') {
      const len = cssEscapeLen(css, i);
      startStmt(i);
      if (!len) { prevSig = c; cpName = false; inName = false; i++; continue; }   // a lone `\` (a delimiter)
      if (atBoundary()) fail(file, css, i, 'an escape at the start of a statement (it could spell a custom-property name)');
      if (cpNameDone) cpName = false;
      if (!inName) nameEsc = false;
      inName = true; nameEsc = true;
      prevSig = 'a';                 // B-4: an escaped character is a name character, never a boundary
      i += len;
      continue;
    }
    if ((c === 'u' || c === 'U') && !inName && /^[rR][lL]\($/.test(css.slice(i + 1, i + 4))) {
      let k = i + 4;
      while (k < n && CSS_WS(css[k])) k++;
      cpName = false;
      startStmt(i);
      if (css[k] !== '"' && css[k] !== "'") {
        let j = k;
        for (;;) {
          if (j >= n) fail(file, css, i, 'an unterminated url(');
          if (css[j] === '\\') { j += 2; continue; }
          if (css[j] === ')') break;
          j++;
        }
        i = j + 1;
        prevSig = ')'; inName = false;
        continue;
      }
      i = k;                         // quoted: the string branch takes the literal; `(` opens a bracket
      stack.push('(');
      prevSig = '('; inName = false;
      continue;
    }
    if (c === '/' && css[i + 1] === '*') {
      const j = css.indexOf('*/', i + 2);
      if (j < 0) fail(file, css, i, 'an unterminated CSS comment');
      const text = css.slice(i, j + 2);
      const why = keepReason(text) || (cp ? 'value:custom-property' : (!atBoundary() ? 'value:not-at-a-boundary' : null));
      if (why) kept.push({ start: i, end: j + 2, reason: why, text });
      else removed.push([i, j + 2]);
      if (cpName) cpNameDone = true;
      inName = false;
      i = j + 2;
      continue;
    }
    // a significant character
    if ((c === '<' && css.startsWith('<!--', i)) || (c === '-' && css.startsWith('-->', i))) fail(file, css, i, 'a CDO / CDC token ("<!--" / "-->") outside a string or comment (r2 B-3: not modelled)');
    startStmt(i);
    if (c === '(' && inName && nameEsc) fail(file, css, i, 'an escaped name right before "(" (it could spell url()');
    if (c === '-' && css[i + 1] === '\\' && atBoundary()) fail(file, css, i, 'an escape at the start of a statement (it could spell a custom-property name)');
    if (!cp) {
      // r2 B-6: a custom-property name is `--` + name characters directly; white space and
      // comments may follow it, then only `:` (anything else: not a custom property)
      if (cpName) {
        if (c === ':') { cp = true; cpName = false; }
        else if (cpNameDone || !CSS_IDENT_CHAR(c)) cpName = false;
      } else if (c === '-' && css[i + 1] === '-' && atBoundary()) { cpName = true; cpNameDone = false; }
    }
    let boundaryChar = false;
    let sig = c;
    if (c === '(' || c === '[') stack.push(c);
    else if (c === '{') {
      const ctx = blocks.length ? blocks[blocks.length - 1] : 'rules';
      if (cp || stack.length) stack.push(c);
      // r2 B-1: in a declaration list, a statement with a `:` at depth 0 (not an at-rule) before
      // its `{` is ambiguous (a declaration with a block value, or a nested rule): VALUE block
      else if (ctx === 'decls' && stmtColon && !stmtAt) stack.push(c);
      else { blocks.push(ctx === 'rules' && stmtAt && atName !== null && CSS_GROUPING_RE.test(atName) ? 'rules' : 'decls'); boundaryChar = true; }
    } else if (c === ')' || c === ']' || c === '}') {
      if (stack.length && stack[stack.length - 1] === CSS_CLOSER[c]) { stack.pop(); if (c === '}') sig = 'a'; }   // after a value block: not a boundary
      else if (c === '}' && !stack.length) { blocks.pop(); boundaryChar = true; }     // closes a block (a stray `)` `]` is a plain token)
    } else if (c === ';' && !stack.length) boundaryChar = true;
    else if (c === ':' && !stack.length && !cp) stmtColon = true;
    if (boundaryChar) { cp = false; cpName = false; endStmt(); }    // `;` / `}` at depth 0 ends a custom-property value
    if (CSS_NAME_CHAR(c) || c === '#' || c === '@') { if (!inName) nameEsc = false; inName = true; }
    else inName = false;
    prevSig = sig;
    i++;
  }
  // the two layout keep rules (r2 B-4: a run that would join `/` and `*`; a multi-line comment
  // with content before AND after it on its joined line), applied until nothing changes (each
  // only adds kept comments, so this ends; the checker computes the same least fixpoint)
  let out = removed;
  for (;;) {
    const slash = cssWouldJoinSlashStar(css, out);
    const spans = cssSpansLinesWithContent(css, out.filter((r) => !slash.has(r[0])));
    if (!slash.size && !spans.size) break;
    const next = [];
    for (const r of out) {
      const why = slash.has(r[0]) ? 'value:would-join-slash-star' : (spans.has(r[0]) ? 'value:spans-lines-with-content' : null);
      if (why) kept.push({ start: r[0], end: r[1], reason: why, text: css.slice(r[0], r[1]) });
      else next.push(r);
    }
    out = next;
  }
  kept.sort((x, y) => x.start - y.start);
  if (onKept) for (const k of kept) onKept({ start: k.start, end: k.end, line: lineOf(css, k.start), reason: k.reason, text: k.text });
  return { removed: out };
}

/* The starts of the comments of `removed` that the slash-star rule keeps: a run of removed
 * comments that touch one another, with a `/` right before the run (the end of a kept comment —
 * nothing else can stand there: a removable comment sits at a boundary) and a `*` right after it:
 * deleting the run would make `/*` (rule (d) deletes only comment bytes; (b) and (c) end at a line
 * terminator or begin after one, so only (d) can join two characters). */
function cssWouldJoinSlashStar(css, removed) {
  const keep = new Set();
  for (let a = 0; a < removed.length; ) {
    let b = a;
    while (b + 1 < removed.length && removed[b + 1][0] === removed[b][1]) b++;
    if (css[removed[a][0] - 1] === '/' && css[removed[b][1]] === '*') for (let k = a; k <= b; k++) keep.add(removed[k][0]);
    a = b + 1;
  }
  return keep;
}

/* The starts of the comments of `removed` (candidates) that the spans-lines rule keeps: walk the
 * joined lines (a terminator inside a candidate does not end a line), note the first and the last
 * content offset of each, and keep a candidate that holds a terminator with content on both sides. */
function cssSpansLinesWithContent(css, removed) {
  const keep = new Set();
  const n = css.length;
  let r = 0, a = 0;
  while (r < removed.length && a <= n) {
    let k = a, first = -1, last = -1;
    const rs = [];
    for (;;) {
      if (r < removed.length && removed[r][0] === k) { rs.push(removed[r]); k = removed[r][1]; r++; continue; }
      if (k >= n || cssTermLen(css, k)) break;
      if (!CSS_BLANK(css[k])) { if (first < 0) first = k; last = k; }
      k++;
    }
    for (const x of rs) {
      if (first < 0 || first >= x[0] || last < x[1]) continue;
      let multi = false;
      for (let y = x[0]; y < x[1]; y++) if (cssTermLen(css, y)) { multi = true; break; }
      if (multi) keep.add(x[0]);
    }
    if (k >= n) break;
    a = k + cssTermLen(css, k);
  }
  return keep;
}

/* cssDeletions — step 2: the removed comments → the deletions [[start, end)…] (merged, in order). */
const CSS_BLANK = (c) => c === ' ' || c === '\t';
function cssTermLen(css, k) {
  const c = css[k];
  if (c === '\r') return css[k + 1] === '\n' ? 2 : 1;
  return c === '\n' || c === '\f' ? 1 : 0;
}
function cssDeletions(css, removed, file) {
  const n = css.length;
  const dels = [];
  let r = 0;
  let a = 0;                                       // start of the current line
  while (r < removed.length) {
    // the line [a, b) holds every removed comment that starts in it; its terminator is not inside one
    let k = a;
    const rs = [];
    for (;;) {
      if (r < removed.length && removed[r][0] === k) { rs.push(removed[r]); k = removed[r][1]; r++; continue; }
      if (k >= n || cssTermLen(css, k)) break;
      k++;
    }
    const b = k, t = k < n ? cssTermLen(css, k) : 0;
    if (rs.length) {
      let blank = true;
      for (let p = a, q = 0; p < b && blank; ) {
        if (q < rs.length && rs[q][0] === p) { p = rs[q][1]; q++; continue; }
        if (!CSS_BLANK(css[p])) blank = false;
        p++;
      }
      if (blank) dels.push([a, b + t]);                                   // (b): the whole line, with its own terminator
      else {
        // (two lines that both hold other content are never joined here: scanCss kept every
        // comment that would join them — the spans-lines keep rule; checkCssStrip proves it)
        for (const x of rs) dels.push([x[0], x[1]]);                      // (d)
        const last = rs[rs.length - 1];
        let tail = true;
        for (let p = last[1]; p < b; p++) if (!CSS_BLANK(css[p])) { tail = false; break; }
        if (tail) {                                                        // (c)
          let j = last[0] - 1, q = rs.length - 2;
          for (;;) {
            if (j >= a && CSS_BLANK(css[j])) { j--; continue; }
            if (q >= 0 && rs[q][1] === j + 1) { j = rs[q][0] - 1; q--; continue; }
            break;
          }
          dels.push([j + 1, b]);
        }
      }
    }
    a = b + t;
    if (b >= n) break;
  }
  dels.sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const d of dels) {
    const m = merged[merged.length - 1];
    if (m && d[0] <= m[1]) { if (d[1] > m[1]) m[1] = d[1]; } else if (d[1] > d[0]) merged.push([d[0], d[1]]);
  }
  return merged;
}

/** The CSS lean transform. `opts.file` names the sheet in a throw; `opts.onKept(info)` sees every kept comment. */
export function stripCssLean(css, opts = {}) {
  const file = opts.file || '<css>';
  const src = String(css);
  const kept = [];
  const { removed } = scanCss(src, file, (k) => kept.push(k));
  let out = src;
  if (removed.length) {
    const dels = cssDeletions(src, removed, file);
    const buf = [];
    let p = 0;
    for (const [s, e] of dels) {
      const left = s > 0 ? src[s - 1] : undefined, right = src[e];
      if (CSS_GLUE(left) && CSS_GLUE(right)) fail(file, src, s, 'a removed comment would join two name characters (' + JSON.stringify(left + right) + ')');
      if (left === '/' && right === '*') fail(file, src, s, 'a removed comment would join "/" and "*"');
      buf.push(src.slice(p, s));
      p = e;
    }
    buf.push(src.slice(p));
    out = buf.join('');
  }
  if (opts.onKept) for (const k of kept) opts.onKept(k);
  return out;
}

/* The CSS view — a SECOND, coarse implementation (one regex pass, never a call into the scanner):
 * comments removed (all of them, kept ones too), strings / unquoted url() / escapes replaced by a
 * marker and collected, then every white-space character removed. It is blind to comments and to
 * white space; checkCssStrip uses it only as an extra opinion beside the exact check.
 * An unquoted url = `url(` whose next non-white-space character (CSS white space only) is not a
 * quote: the lookahead skips the white space first, so the match can never backtrack into it and
 * read `url( "a)b" )` as unquoted (round-2 false reject); not after a name character, `#` or `@`. */
const CSS_VIEW_RE = /(?<![A-Za-z0-9\-_\\#@\u0080-\uffff])[uU][rR][lL]\((?![ \t\n\r\f]*["'])(?:\\[\s\S]|[^)\\])*\)|\/\*[\s\S]*?\*\/|"(?:\\(?:\r\n|[\s\S])|[^"\\\n\r\f])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\n\r\f])*'|\\[\s\S]/g;
export function cssView(t) {
  const lits = [];
  const skel = String(t).replace(CSS_VIEW_RE, (m) => {
    if (m.startsWith('/*')) return ' ';
    lits.push(m);
    return '\u0001';
  }).replace(/\s+/g, '');
  return { skel, lits };
}

/* cssUnits — the CHECKER's own walk of a CSS text (it never calls scanCss, and it decides the
 * keep rules by another technique: a custom property is found by looking BACK over the text of
 * the statement at its `:`). Units, in order, covering the text:
 *   { k: 'ws', s, e }                 one white-space character (space, tab, LF, CR, FF)
 *   { k: 'cm', s, e, keep, reason }   a comment, with the keep rules' verdict
 *   { k: 'lit', s, e }                anything else: a string, an unquoted url(…), an escape (its
 *                                     hex digits and the white space that ends it included), one
 *                                     other character
 * Throws (fail) where the scanner throws. */
function cssUnits(css, file) {
  if (css.indexOf(NUL) >= 0) fail(file, css, css.indexOf(NUL), 'a NUL character');
  const n = css.length;
  const U = [];
  const depth = [];                 // open brackets (the same model: `{` is pushed only inside ( [ or a custom-property value)
  let inCp = false;
  let stmt = '';                    // the statement so far (lit text; white space and comments as one space)
  let prev = null;                  // the previous lit unit's text, or null at a boundary-free start
  let prevEsc = false;              // the previous lit unit is an escape
  let nameRun = false, nameRunEsc = false;   // the previous unit continues a name token (and holds an escape)
  const ctxs = [];                  // r2 B-1: the context of every open block, 'rules' | 'decls' (top level: rules)
  let colon0 = false;               // the statement holds a `:` at depth 0 (outside a custom-property value)
  const boundary = () => !depth.length && !prevEsc && (prev === null || prev === '{' || prev === ';' || prev === '}');
  const lit = (s, e, isEsc) => { U.push({ k: 'lit', s, e }); prev = css.slice(s, e); prevEsc = !!isEsc; };
  let i = 0;
  while (i < n) {
    const c = css[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f') { U.push({ k: 'ws', s: i, e: i + 1 }); if (stmt) stmt += ' '; nameRun = false; i++; continue; }
    if (c === '/' && css[i + 1] === '*') {
      const j = css.indexOf('*/', i + 2);
      if (j < 0) fail(file, css, i, 'an unterminated CSS comment');
      const text = css.slice(i, j + 2);
      const reason = keepReason(text) || (inCp ? 'value:custom-property' : (boundary() ? null : 'value:not-at-a-boundary'));
      U.push({ k: 'cm', s: i, e: j + 2, keep: !!reason, reason });
      if (stmt) stmt += ' ';
      nameRun = false;
      i = j + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (css[j] !== c) {
        if (j >= n) fail(file, css, i, 'an unterminated CSS string');
        if (css[j] === '\\') { j += css.startsWith('\r\n', j + 1) ? 3 : 2; continue; }
        if (css[j] === '\n' || css[j] === '\r' || css[j] === '\f') fail(file, css, i, 'a CSS string with an unescaped line break');
        j++;
      }
      lit(i, j + 1);
      stmt += '"';
      nameRun = false;
      i = j + 1;
      continue;
    }
    if (c === '\\') {
      const d = css[i + 1];
      if (d === undefined || d === '\n' || d === '\r' || d === '\f') { lit(i, i + 1); stmt += '!'; nameRun = false; i++; continue; }
      if (boundary()) fail(file, css, i, 'an escape at the start of a statement (it could spell a custom-property name)');
      let j = i + 1;
      const hex = /^[0-9A-Fa-f]{1,6}/.exec(css.slice(j, j + 6));
      if (hex) { j += hex[0].length; if (css.startsWith('\r\n', j)) j += 2; else if (/[ \t\n\r\f]/.test(css[j] || '')) j++; }
      else j += String.fromCodePoint(css.codePointAt(j)).length;
      lit(i, j, true);
      stmt += '\\';
      if (!nameRun) nameRunEsc = false;
      nameRun = true; nameRunEsc = true;
      i = j;
      continue;
    }
    if (!nameRun && /^url\(/i.test(css.slice(i, i + 4))) {
      let k = i + 4;
      while (/[ \t\n\r\f]/.test(css[k] || '')) k++;
      if (css[k] !== '"' && css[k] !== "'") {
        let j = k;
        while (css[j] !== ')') { if (j >= n) fail(file, css, i, 'an unterminated url('); j += css[j] === '\\' ? 2 : 1; }
        lit(i, j + 1);
        stmt += '~';
        nameRun = false;
        i = j + 1;
        continue;
      }
      // quoted: `url` and `(` are ordinary characters below (the `(` opens a bracket)
    }
    // one other character
    if (css.startsWith('<!--', i) || css.startsWith('-->', i)) fail(file, css, i, 'a CDO / CDC token ("<!--" / "-->") outside a string or comment (r2 B-3: not modelled)');
    if (c === '(' && nameRun && nameRunEsc) fail(file, css, i, 'an escaped name right before "(" (it could spell url()');
    if (c === '-' && css[i + 1] === '\\' && boundary()) fail(file, css, i, 'an escape at the start of a statement (it could spell a custom-property name)');
    let endsStmt = false, closedValue = false;
    if (c === '(' || c === '[') depth.push(c);
    else if (c === '{') {
      if (inCp || depth.length) depth.push(c);
      else {
        // r2 B-1, read from the statement text: an at-rule = it starts with `@`; a grouping one by its name
        const ctx = ctxs.length ? ctxs[ctxs.length - 1] : 'rules';
        const at = stmt.startsWith('@');
        if (ctx === 'decls' && !at && colon0) depth.push(c);                 // an ambiguous statement: a VALUE block
        else { ctxs.push(ctx === 'rules' && /^@(?:-[A-Za-z0-9]+-)?(?:media|supports|layer|container|document|starting-style)(?![A-Za-z0-9_\-\\\u0080-\uffff])/i.test(stmt) ? 'rules' : 'decls'); endsStmt = true; }
      }
    } else if (c === ')' || c === ']' || c === '}') {
      if (depth.length && depth[depth.length - 1] === CSS_CLOSER[c]) { depth.pop(); closedValue = c === '}'; }
      else if (c === '}' && !depth.length) { ctxs.pop(); endsStmt = true; }
    } else if (c === ';' && !depth.length) endsStmt = true;
    else if (c === ':' && !depth.length && !inCp) {
      // r2 B-6: `--` + name characters, then only white space / comments (one space each) before `:`
      if (/^--[A-Za-z0-9_\-\\\u0080-\uffff]* *$/.test(stmt)) inCp = true; else colon0 = true;
    }
    lit(i, i + 1);
    if (closedValue) prev = 'a';                                              // after a value block: not a boundary
    if (endsStmt) { inCp = false; colon0 = false; stmt = ''; } else stmt += c;
    if (/[A-Za-z0-9\-_#@]/.test(c) || c.charCodeAt(0) >= 0x80) { if (!nameRun) nameRunEsc = false; nameRun = true; }
    else nameRun = false;
    i++;
  }
  // the spans-lines keep rule, by another technique than the scanner's: every comment that the
  // rules above let go is cut out of the text — one that holds a line terminator leaves a NUL
  // mark (NUL cannot occur: refused above) — and the result is split at its line terminators;
  // a mark with a character other than space / tab / mark both before it and after it on its
  // line is a comment that would join two lines with content: it stays
  // r2 B-4, by the unit list: a run of candidate comments with no unit between them, a unit
  // ending in `/` before the run and a lit unit starting with `*` after it, stays. The two rules
  // run until nothing changes (the same least fixpoint as the scanner's).
  for (let changed = true; changed; ) {
    changed = false;
    for (let a = 0; a < U.length; a++) {
      if (!(U[a].k === 'cm' && !U[a].keep)) continue;
      let b = a;
      while (b + 1 < U.length && U[b + 1].k === 'cm' && !U[b + 1].keep) b++;
      if (a > 0 && css[U[a - 1].e - 1] === '/' && b + 1 < U.length && U[b + 1].k === 'lit' && css[U[b + 1].s] === '*') {
        for (let k = a; k <= b; k++) { U[k].keep = true; U[k].reason = 'value:would-join-slash-star'; }
        changed = true;
      }
      a = b;
    }
    if (cssUnitsSpans(css, U, file)) changed = true;
  }
  return U;
}

/* the checker's spans-lines pass over the units; true when it kept a comment */
function cssUnitsSpans(css, U, file) {
  let any = false;
  const cand = U.filter((u) => u.k === 'cm' && !u.keep);
  const isMulti = (u) => /[\n\r\f]/.test(css.slice(u.s, u.e));
  if (cand.some(isMulti)) {
    const marks = [];
    let m = '', p = 0;
    for (const u of cand) { m += css.slice(p, u.s); if (isMulti(u)) { m += NUL; marks.push(u); } p = u.e; }
    m += css.slice(p);
    let k = 0;
    for (const line of m.split(/\r\n|[\n\r\f]/)) {
      for (let x = line.indexOf(NUL); x >= 0; x = line.indexOf(NUL, x + 1)) {
        const u = marks[k++];
        if (/[^ \t\0]/.test(line.slice(0, x)) && /[^ \t\0]/.test(line.slice(x + 1))) { u.keep = true; u.reason = 'value:spans-lines-with-content'; any = true; }
      }
    }
    if (k !== marks.length) throw new Error('lean-strip: ' + file + ' — internal: spans-lines marks ' + k + ' vs ' + marks.length);
  }
  return any;
}

/* Can the white space `w` of a stretch of the source, cut by removed comments into
 * W0 R W1 R … R Wr, become `o` by deleting only characters that touch a removed comment through
 * deleted characters? = the kept part of W0 is a prefix, of Wr a suffix, of every middle Wi one
 * contiguous piece (r = 0: nothing may change). */
function cssWsFits(W, o) {
  if (W.length === 1) return W[0] === o;
  let reach = new Set();
  for (let L = 0; L <= W[0].length && L <= o.length && W[0].slice(0, L) === o.slice(0, L); L++) reach.add(L);
  for (let i = 1; i < W.length - 1; i++) {
    const w = W[i], next = new Set();
    for (const pos of reach) {
      next.add(pos);
      for (let a = 0; a < w.length; a++) {
        let m = 0;
        while (a + m < w.length && pos + m < o.length && w[a + m] === o[pos + m]) { m++; next.add(pos + m); }
      }
    }
    reach = next;
  }
  const last = W[W.length - 1];
  for (const pos of reach) if (last.endsWith(o.slice(pos))) return true;
  return false;
}

/** Post-conditions of one CSS text (a sheet or a style body) — the EXACT check of the rule
 *  (B-7), by cssUnits, independent of the scanner. Throws on the first problem:
 *   (i)  every lit unit of the source is in the output, in order, byte for byte, and nothing else
 *        is (the output is the source minus deletions);
 *   (ii) every deleted run is whole removable comments plus white space that touches a deleted
 *        comment through deleted characters only;
 *   (iii) every comment the keep rules keep is there, byte for byte, in its place;
 *   (iv) the strip is idempotent;  (v) no removable comment is left. */
export function checkCssStrip(src, out, file) {
  src = String(src); out = String(out);
  const bad = (what) => { throw new Error('lean-strip: ' + file + ' — ' + what); };
  if (out.indexOf(NUL) >= 0) bad('stripped CSS holds a NUL');
  const U = cssUnits(src, file), V = cssUnits(out, file + ' (stripped)');
  const T = (x, u) => x.slice(u.s, u.e);
  let p = 0, q = 0;
  for (;;) {
    const gu = [], gv = [];
    while (p < U.length && U[p].k !== 'lit') gu.push(U[p++]);
    while (q < V.length && V[q].k !== 'lit') gv.push(V[q++]);
    // (iii) + (v): the comments of the output gap are exactly the kept comments of the source gap
    const ku = gu.filter((u) => u.k === 'cm' && u.keep), cv = gv.filter((u) => u.k === 'cm');
    if (ku.length !== cv.length || ku.some((u, k) => T(src, u) !== T(out, cv[k]))) {
      const k = ku.findIndex((u, j) => !cv[j] || T(src, u) !== T(out, cv[j]));
      if (k >= 0) bad('a kept comment was removed or changed (line ' + lineOf(src, ku[k].s) + ': ' + JSON.stringify(T(src, ku[k]).slice(0, 50)) + ')');
      bad('a removable comment survived or a comment was added (output line ' + lineOf(out, cv[ku.length].s) + ': ' + JSON.stringify(T(out, cv[ku.length]).slice(0, 50)) + ')');
    }
    // (ii): between two kept comments, the white space fits the deletion rule
    let wu = [''], wv = '', iu = 0, iv = 0;
    const flush = (at) => { if (!cssWsFits(wu, wv)) bad('white space changed that does not belong to a removed comment (near source line ' + lineOf(src, at) + ')'); wu = ['']; wv = ''; };
    for (;;) {
      while (iu < gu.length && !(gu[iu].k === 'cm' && gu[iu].keep)) { const u = gu[iu++]; if (u.k === 'ws') wu[wu.length - 1] += src[u.s]; else wu.push(''); }
      while (iv < gv.length && gv[iv].k !== 'cm') wv += out[gv[iv++].s];
      flush(iu < gu.length ? gu[iu].s : (p < U.length ? U[p].s : src.length));
      if (iu >= gu.length) break;
      iu++; iv++;
    }
    if (p >= U.length || q >= V.length) {
      if (p < U.length) bad('the output lost text that is not a comment (source line ' + lineOf(src, U[p].s) + ': ' + JSON.stringify(src.slice(U[p].s, U[p].s + 40)) + ')');
      if (q < V.length) bad('the output holds text that is not in the source (output line ' + lineOf(out, V[q].s) + ')');
      break;
    }
    // (i)
    if (T(src, U[p]) !== T(out, V[q])) bad('the text outside comments and their white space changed (source line ' + lineOf(src, U[p].s) + ': ' + JSON.stringify(src.slice(Math.max(0, U[p].s - 20), U[p].s + 20)) + ')');
    p++; q++;
  }
  // a second, coarse opinion (a regex view; blind to comments and white space)
  const a = cssView(src), b = cssView(out);
  if (a.skel !== b.skel || a.lits.length !== b.lits.length || a.lits.some((x, k) => x !== b.lits[k])) bad('the CSS skeleton or a literal changed (regex view)');
  // (iv)
  if (stripCssLean(out, { file }) !== out) bad('the CSS strip is not idempotent');
}

/** Every comment of a CSS text (the checker's own walk, cssUnits; nothing removed):
 *  [{ start, end, line, text, keep, reason }] — keep / reason = the keep rules' verdict. */
export function cssComments(css, file = '<css>') {
  css = String(css);
  return cssUnits(css, file).filter((u) => u.k === 'cm').map((u) => ({ start: u.s, end: u.e, line: lineOf(css, u.s), text: css.slice(u.s, u.e), keep: u.keep, reason: u.reason }));
}

/* ═══════════════════════════════ JavaScript ═══════════════════════════════
 * scanJs — a lexer for CLASSIC scripts (no modules, no JSX, no hashbang) that knows just enough
 * syntax to decide the one hard question of a JS lexer: is this `/` a division or the start of a
 * regular expression? It tracks the previous significant token and a bracket stack in which
 * every `{` carries its kind (statement block, function-expression body, arrow body, method
 * body, object literal, class body, template substitution) and every `(` its kind (the condition
 * of if / while / for / with, parameters, a call / group). The classifier's decision:
 *   · after `)` of if / while / for / with → a statement starts → regular expression; any other `)` and `]` → division
 *   · after `}` → regular expression when the brace closed a statement block / declaration /
 *     arrow body; division when it closed an object literal, a function or class EXPRESSION
 *   · after a name, a number, a string, a template, a regular expression, `this` / `super` /
 *     `null` / `true` / `false`, a postfix `++` / `--` → division
 *   · after any other keyword, any other punctuator, or at the start → regular expression
 *   · after the label of `break L` / `continue L` → regular expression (the statement has ended)
 *   · after the contextual words `of`, `yield`, `await` (their role depends on context this
 *     lexer does not track) → THROW; also a `/` after a method body or at a class-member position.
 * Declaration or expression (`function` / `class` / `async function`, which decides the kind of
 * the `}` that ends them): a declaration at the start of a statement — after `;`, a block `{` /
 * `}`, a label, `else`, `do`, the `)` of if / while / for / with, `return` / `break` / `continue` /
 * `debugger` + a line break (ASI), or an expression end + a line break (ASI). After `await` + a
 * line break in a statement list it THROWS (an operand inside an async function, a new statement
 * outside one).
 * A `{` whose kind cannot be read from the grammar THROWS. Every `fail(…)` below is a refusal; most
 * fire only on invalid code. Those known to refuse VALID classic scripts: a `/` after `of` / `yield` / `await`, after a method body or at a class-member
 * position; `function` / `class` after `await` + a line break; an object literal as a class
 * heritage; a `{` at an object-key or class-member position it cannot read; `<!--` and `-->` in
 * code (also `n-->0`: write `n-- > 0`); a lone CR as a line terminator in code or in a comment
 * (CRLF is fine; a CR inside a literal is content); a NUL; a hashbang; a character it does not know;
 * `{` after `await` + a line break in a statement list; `++` / `--` right after `of` / `yield` /
 * `await`; a name after `,` + a line break + `/`; a number with a leading zero followed by a digit (the
 * legacy octal form `010`, also `08`, `09.5`: sloppy-only) and `0_1` (invalid); the rule-H refusals below.
 * `let` is a declaration only at a statement start in a statement list or in the head of a `for`; in a
 * single-statement position (after the `)` of if / while / for / with, after `else` / `do`, after a label
 * `L:`) it is the plain name (review r3 A-2).
 *
 * THE SLASH NET (review round 2: the classifier was wrong three rounds in a row, so a wrong decision
 * must be harmless, not only rare):
 *   S  A code-level `/` is STRONG when the grammar fixes its reading from the previous token alone:
 *      a regular expression at the start, after every punctuator except `)` `]` `}` `++` `--` `.`
 *      `?.` (and after `${`), after the words return typeof void delete in instanceof new throw case
 *      do else (judged by their text, not after `.` / `?.`, not escaped); a division after a number,
 *      a string, a regular expression, the end of a template, `]`, and — with NO line break before
 *      the `/` — after a name, a property name, a private name or this / super / null / true /
 *      false, unless the word is a keyword or contextual (of yield await let async static get set).
 *      After `.` / `?.` it THROWS. A strong slash is read the grammar's way; when the classifier
 *      disagrees (its bracket stack is wrong) it THROWS. Every other slash is WEAK, and so is every
 *      slash whose previous token lies in an uncertain tail.
 *   K  A weak slash opens an UNCERTAIN TAIL: from it to the end of its physical line (LF / CRLF).
 *      KEPT byte for byte (reason 'after-uncertain-slash', reported by jsKeptComments and onKept):
 *      (1) every comment that the SCANNER sees starting in a tail; (2) a `//` comment on the line
 *      right after a tail line (only spaces / tabs between the tail line's terminator and it): a TRUE
 *      `//` comment in the tail (tokens for a wrong reading) would make it part of one `//` run;
 *      (3) the rest of the `//` run of either (the run rule of keepUnits). The tail is never
 *      trimmed or changed: no trim at its line terminator or at the end of the input (its last
 *      blanks can belong to a true comment), and a U+2028 / U+2029 in it is never trimmed before or
 *      dropped. A comment removed on a tail line stands BEFORE the weak slash (where every reading
 *      agrees). So the strip changes nothing in a tail, under any reading of it.
 *   H  A tail must end in code state under EVERY reading. Refused: a weak slash inside a template
 *      substitution; a backtick in the tail; a `/*` in the tail that is not closed before the line end;
 *      a `\` as the last character before the line end (a string continued on the next line).
 *   Why that closes the class: before a weak slash every reading agrees (induction); after its line
 *   every reading is in code state with no template open (H). The bracket stack may differ, but the
 *   stack only feeds the classifier: token boundaries on a later line follow from code state, the
 *   strong readings (judged by token text) and template `}` matching — and no `${` frame can be
 *   open across a tail (H), while inside a later substitution every slash is strong, so its tokens,
 *   brackets and closing `}` are the true ones. A later slash whose reading the stack decides is
 *   weak again (K / H). What the net does NOT cover: a tokenizer mistake that is not at a slash — a
 *   number, a string, a name, a keyword read with the wrong length or kind (numbers were one: review
 *   r3 A-1, `010.in` read as `010.` + the keyword `in`, now refused) — and a wrong reading of a
 *   STRONG slash's previous token; the corpus and the acorn cross-check are the defence there.
 */
const KEYWORDS = new Set(['break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with']);
const VALUE_KEYWORDS = new Set(['this', 'super', 'null', 'true', 'false']);
const AMBIGUOUS_WORDS = new Set(['of', 'yield', 'await']);
const STMT_BRACES = new Set(['block', 'fexpr', 'arrow', 'method']);
/* the slash net (rules S / K / H in the section header) */
const REGEX_WORDS = new Set(['return', 'typeof', 'void', 'delete', 'in', 'instanceof', 'new', 'throw', 'case', 'do', 'else']);
const CONTEXTUAL_WORDS = new Set(['of', 'yield', 'await', 'let', 'async', 'static', 'get', 'set']);
const K_REASON = 'after-uncertain-slash';
const PUNCT = ['>>>=', '...', '===', '!==', '**=', '<<=', '>>=', '>>>', '&&=', '||=', '??=',
  '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--', '<<', '>>', '+=', '-=', '*=', '%=', '&=', '|=', '^=', '**',
  '{', '}', '(', ')', '[', ']', ';', ',', '<', '>', '+', '-', '*', '%', '&', '|', '^', '!', '~', '?', ':', '=', '.'];
const PUNCT_BY_CHAR = new Map();
for (const p of PUNCT) { if (!PUNCT_BY_CHAR.has(p[0])) PUNCT_BY_CHAR.set(p[0], []); PUNCT_BY_CHAR.get(p[0]).push(p); }   // PUNCT is longest-first
const ID_START_RE = /[$_\p{ID_Start}\\]/u;
const ID_RE = /(?:[$_\p{ID_Start}]|\\u(?:[0-9a-fA-F]{4}|\{[0-9a-fA-F]+\}))(?:[$\u200c\u200d\p{ID_Continue}]|\\u(?:[0-9a-fA-F]{4}|\{[0-9a-fA-F]+\}))*/uy;
const NUM_RE = /(?:0[xX][0-9a-fA-F_]+n?|0[oO][0-7_]+n?|0[bB][01_]+n?|(?:[0-9][0-9_]*\.?[0-9_]*|\.[0-9][0-9_]*)(?:[eE][+-]?[0-9][0-9_]*)?n?)/y;
const FLAGS_RE = /[$\u200c\u200d\p{ID_Continue}]*/uy;
const isLT = (c) => c === '\n' || c === '\r' || c === '\u2028' || c === '\u2029';
const isWS = (c) => c === ' ' || c === '\t' || c === '\v' || c === '\f' || c === '\u00a0' || c === '\ufeff' || (c > '\u007f' && /\p{Zs}/u.test(c));

/**
 * Lex a classic script. Returns {
 *   comments: [{ start, end, kind: 'line'|'block', line }],
 *   literalLT: Set<offset> — offsets of line terminators that are CONTENT (anywhere inside a string,
 *              a template's text parts or a regular expression); every other line terminator is in
 *              code state or in a comment,
 *   tokens:    [{ type, value, start, end, nl }] — significant tokens; `nl` = at least one line
 *              terminator (in code or inside a block comment) since the previous token: what
 *              automatic semicolon insertion sees. The text of a token is code.slice(start, end)
 *              (`value` of the last part of a template with substitutions is the whole template)
 * }. Throws (fail) on anything it cannot read with certainty.
 */
export function scanJs(code, { file = '<js>' } = {}) {
  code = String(code);
  const n = code.length;
  if (code.indexOf(NUL) >= 0) fail(file, code, code.indexOf(NUL), 'a NUL character');
  if (code.startsWith('#!')) fail(file, code, 0, 'a hashbang (not a classic script)');
  const comments = [];
  const literalLT = new Set();
  const tokens = [];
  const top = { t: 'top', kind: 'top', q: 0 };
  const stack = [top];
  const cur = () => stack[stack.length - 1];
  const isStmts = (ctx) => ctx.t === 'top' || (ctx.t === '{' && STMT_BRACES.has(ctx.kind));
  const isClass = (ctx) => ctx.t === '{' && (ctx.kind === 'classDecl' || ctx.kind === 'classExpr');
  let prev = null;          // last significant token: { type, value, nl, ...extra }
  let nl = false;           // a line terminator since prev
  let pendingFn = null;     // { depth, decl }
  const pendingClass = [];  // a stack of { depth, decl }: a class inside a class heritage (`extends M(class {})`) does not overwrite the outer one (review A-6)
  const topClass = () => pendingClass[pendingClass.length - 1];
  let i = 0;
  // the slash net: the current uncertain tail { start, end } (a WEAK slash to the end of its line), every tail, counts
  let tail = null;
  const tails = [];
  const slashes = { strong: 0, weak: 0 };
  const inTail = (at) => !!tail && at >= tail.start && at < tail.end;
  // review r3 A-2 (a): a `//` comment on the line right after a tail line (only spaces / tabs before it — the run test of
  // keepUnits) may continue a TRUE `//` run that starts in the tail (a comment the scanner read as tokens): rule K for it too
  const afterTail = (at) => {
    if (!tail || tail.end >= at) return false;
    let k = tail.end + (code[tail.end] === '\r' && code[tail.end + 1] === '\n' ? 2 : 1);   // tail.end is the LF / CR that ends the tail line
    while (k < at && (code[k] === ' ' || code[k] === '\t')) k++;                          // (a walk, not a slice: the tail may lie far back)
    return k === at;
  };

  const exprEnd = (p) => {
    if (!p) return false;
    switch (p.type) {
      case 'name': return true;
      case 'keyword': return VALUE_KEYWORDS.has(p.value);
      case 'num': case 'string': case 'template': case 'regex': case 'priv': return true;
      case 'punct':
        if (p.value === ')') return p.paren === 'expr';
        if (p.value === ']') return true;
        if (p.value === '}') return p.brace === 'object' || p.brace === 'fexpr' || p.brace === 'classExpr';
        if (p.value === '++' || p.value === '--') return !!p.postfix;
        return false;
      default: return false;
    }
  };
  /* is the token about to be read at the START of a statement? (for function / class decl-vs-expr)
   * true / false, or 'unknown' where the answer depends on context this lexer does not track:
   * `await` + a line break in a statement list (an operand inside an async function, an
   * identifier + ASI outside one). declStart() refuses 'unknown' where it decides something. */
  const atStmtStart = () => {
    const ctx = cur();
    const p = prev;
    if (!p) return true;
    // review A-2: `return` / `break` / `continue` / `debugger` + a line break end their statement by
    // ASI (restricted productions; `debugger` takes no operand), so the next token starts one
    if (p.type === 'keyword' && nl && (p.value === 'return' || p.value === 'break' || p.value === 'continue' || p.value === 'debugger')) return true;
    if (p.type === 'name' && p.label) return nl ? true : false;     // `break L` / `continue L` end their statement
    if (p.type === 'name' && p.value === 'await' && !p.prop && nl && isStmts(ctx)) return 'unknown';
    if (p.type === 'punct') {
      if (p.value === ';') return isStmts(ctx);
      if (p.value === '{') return isStmts(ctx) && p.opened === ctx;
      if (p.value === '}') return isStmts(ctx) && (p.brace === 'block' || p.brace === 'classDecl' || p.brace === 'method' || ((p.brace === 'arrow' || exprEnd(p)) && nl));
      if (p.value === ')') return p.paren === 'cond' || (exprEnd(p) && nl && isStmts(ctx));
      if (p.value === ':') return p.colon === 'label';
    }
    if (p.type === 'keyword' && (p.value === 'else' || p.value === 'do')) return true;
    return exprEnd(p) && nl && isStmts(ctx);
  };
  const declStart = (at, what) => {
    const s = atStmtStart();
    if (s === 'unknown') fail(file, code, at, 'a "' + what + '" after "await" and a line break — cannot tell a declaration from an operand of await');
    return s;
  };
  const regexAllowed = (at) => {
    const p = prev;
    if (!p) return true;
    if (p.type === 'name' && p.label) return true;                  // `break L` + `/`: the statement has ended (ASI), a regular expression starts one
    if (p.type === 'name' && p.binding && nl) return true;          // `var b` + a line break + `/`: the declarator has ended (ASI)
    if (p.type === 'name' && p.afterComma && nl) fail(file, code, at, 'a name after "," then a line break and a "/" — cannot tell the end of a declaration (a regular expression starts) from a division; put the "/" on the line of the name');
    if (p.type === 'punct') {
      if (p.value === ')') return p.paren === 'cond';
      if (p.value === ']') return false;
      if (p.value === '}') {
        if (p.brace === 'block' || p.brace === 'arrow' || p.brace === 'classDecl') return true;
        if (p.brace === 'object' || p.brace === 'fexpr' || p.brace === 'classExpr') return false;
        fail(file, code, at, 'a "/" after the "}" of a ' + p.brace + ' — cannot tell division from a regular expression');
      }
      if (p.value === '++' || p.value === '--') return !p.postfix;
      return true;
    }
    if (p.type === 'keyword') return !VALUE_KEYWORDS.has(p.value);
    if (p.type === 'name' && AMBIGUOUS_WORDS.has(p.value) && !p.prop) fail(file, code, at, 'a "/" after "' + p.value + '" — cannot tell division from a regular expression');
    return false;
  };
  /* rule S: is the reading of the "/" at `at` CERTAIN by the grammar from the previous token alone?
   * 'regex' / 'div' = STRONG (the reading is that one, whatever the classifier says); 'weak' = the
   * classifier decides and rules K / H bound what a wrong decision can do. Word tokens are judged by
   * their TEXT (a key name never stands before a "/" in valid code), not by the key detection of the
   * bracket stack (a stack that a mis-read tail corrupted must not change a strong reading). */
  const slashCertainty = (at) => {
    const p = prev;
    if (inTail(at) || (p && inTail(p.start))) return 'weak';
    if (!p) return 'regex';
    if (p.type === 'punct') {
      if (p.value === '.' || p.value === '?.') fail(file, code, at, 'a "/" right after "' + p.value + '" (a property name must follow)');
      if (p.value === ']') return 'div';
      if (p.value === ')' || p.value === '}' || p.value === '++' || p.value === '--') return 'weak';
      return 'regex';                                              // every other punctuator (and "${") leaves an expression to start
    }
    if (p.type === 'num' || p.type === 'string' || p.type === 'regex' || p.type === 'template') return 'div';
    if (p.type === 'name' || p.type === 'keyword' || p.type === 'priv') {
      const w = code.slice(p.start, p.end);
      if (w.indexOf('\\') >= 0) return 'weak';
      if (p.dot || p.type === 'priv') return nl ? 'weak' : 'div';   // a property name / a private name
      if (REGEX_WORDS.has(w)) return 'regex';
      if (VALUE_KEYWORDS.has(w)) return nl ? 'weak' : 'div';
      if (KEYWORDS.has(w) || CONTEXTUAL_WORDS.has(w)) return 'weak';
      return nl ? 'weak' : 'div';
    }
    return 'weak';
  };
  /* rule H: a WEAK slash opens an uncertain tail to the end of its physical line (LF / CRLF). Under
   * EVERY reading of the tail the scan must leave the line in code state, so refuse what could carry
   * a literal or a comment across the line end, and a tail inside a template substitution (its "}"
   * would close the substitution under one reading only). */
  const openTail = (at) => {
    if (inTail(at)) return;
    let e = at;
    while (e < n && code[e] !== '\n' && code[e] !== '\r') e++;
    const cure = ' — put the regular expression or the division in parentheses, or move it to a line without it';
    if (stack.some((o) => o.t === '${')) fail(file, code, at, 'a "/" whose reading the grammar does not fix (after "' + (prev ? code.slice(prev.start, prev.end).slice(0, 20) : '') + '"), inside a template substitution' + cure);
    const bt = code.indexOf('`', at);
    if (bt >= 0 && bt < e) fail(file, code, at, 'a "/" whose reading the grammar does not fix, then a backtick on the same line' + cure);
    const x = code.lastIndexOf('/*', e - 2);
    if (x >= at) { const y = code.indexOf('*/', x + 2); if (y < 0 || y + 2 > e) fail(file, code, at, 'a "/" whose reading the grammar does not fix, then a "/*" that does not end on the same line' + cure); }
    if (e < n && e > at && code[e - 1] === '\\') fail(file, code, at, 'a "/" whose reading the grammar does not fix, then a "\\" at the line end (a string continued on the next line)' + cure);
    tail = { start: at, end: e };
    tails.push(tail);
  };
  const classifyBrace = (at) => {
    const ctx = cur();
    const p = prev;
    const pc = topClass();
    // the body of a pending class at this depth — but not the body of a function EXPRESSION in its
    // heritage (`class A extends function () {} {}`: that `{` follows the function's parameters)
    if (pc && pc.depth === stack.length && !(p && p.type === 'punct' && p.value === ')' && p.paren === 'fparams')) {
      if (p && p.type === 'keyword' && p.value === 'extends') fail(file, code, at, 'an object literal as a class heritage (put the heritage in parentheses: "extends ({}).constructor")');
      pendingClass.pop();
      return pc.decl ? 'classDecl' : 'classExpr';
    }
    if (isClass(ctx) && !ctx.init) {
      if (p && p.type === 'punct' && p.value === ')' && p.paren === 'mparams') return 'method';
      if (p && p.type === 'name' && p.value === 'static' && p.key) return 'block';
      fail(file, code, at, 'a "{" at a class-member position this lexer cannot read');
    }
    if (ctx.t === '{' && ctx.kind === 'object' && ctx.atKey) {
      if (p && p.type === 'punct' && p.value === ')' && p.paren === 'mparams') return 'method';
      fail(file, code, at, 'a "{" at an object-literal key position');
    }
    if (!p) return 'block';
    const asiBlock = () => {
      if (nl && isStmts(ctx)) return 'block';
      fail(file, code, at, 'a "{" right after an expression on the same line');
    };
    if (p.type === 'punct') {
      switch (p.value) {
        case ')':
          if (p.paren === 'cond' || p.paren === 'catch' || p.paren === 'switch') return 'block';
          if (p.paren === 'fparams') return p.fnDecl ? 'block' : 'fexpr';
          if (p.paren === 'mparams') return 'method';
          return asiBlock();
        case '=>': return 'arrow';
        case ';': return isStmts(ctx) ? 'block' : (ctx.t === '(' ? 'object' : fail(file, code, at, 'a "{" after ";" here'));
        case '{': return isStmts(ctx) && p.opened === ctx ? 'block' : 'object';
        case '}':
          if (!isStmts(ctx)) return fail(file, code, at, 'a "{" right after a "}" outside a statement list');
          if (p.brace === 'block' || p.brace === 'classDecl' || p.brace === 'arrow' || p.brace === 'method') return 'block';
          return asiBlock();
        case ':': return p.colon === 'label' ? 'block' : 'object';
        case ']': return asiBlock();
        case '++': case '--': return p.postfix ? asiBlock() : 'object';
        default: return 'object';
      }
    }
    if (p.type === 'keyword') {
      if (p.value === 'else' || p.value === 'do' || p.value === 'try' || p.value === 'finally' || p.value === 'catch') return 'block';
      if (p.value === 'break' || p.value === 'continue' || p.value === 'debugger') return 'block';
      if (p.value === 'return') return nl ? 'block' : 'object';
      if (VALUE_KEYWORDS.has(p.value)) return asiBlock();
      return 'object';                // typeof, in, case, new, void, delete, throw, extends, var, const, default, …
    }
    if (p.type === 'name') {
      if (p.value === 'let' && !p.prop && p.letDecl) return 'object';          // let { a } = … (also after a line break: still a declaration)
      if (p.value === 'yield' && !p.prop) return nl ? 'block' : 'object';
      if (p.value === 'of' && !p.prop) {
        if (!nl) return 'object';
        if (isStmts(ctx)) return 'block';                              // `of` in a statement list is a plain name (ASI)
        if (ctx.t === '(') return 'object';                            // the head of `for (x of⏎{ … })`
        return asiBlock();
      }
      if (p.value === 'await' && !p.prop) {
        if (!nl) return 'object';
        // review r2 A-2 (a): an operand of await inside an async function (an object literal), a new statement outside one (a block)
        if (isStmts(ctx)) fail(file, code, at, 'a "{" after "await" and a line break — cannot tell an object literal (an operand of await) from a block; put the "{" on the line of "await"');
        return 'object';
      }
      return asiBlock();
    }
    return asiBlock();               // num, string, template, regex, priv
  };
  const parenKind = () => {
    const ctx = cur();
    const p = prev;
    if (pendingFn && pendingFn.depth === stack.length) return 'fparams';
    if (p && p.type === 'keyword') {
      if (p.value === 'if' || p.value === 'while' || p.value === 'for' || p.value === 'with') return 'cond';
      if (p.value === 'catch') return 'catch';
      if (p.value === 'switch') return 'switch';
    }
    if (p && p.type === 'name' && p.value === 'await' && p.afterFor) return 'cond';
    if (ctx.t === '{' && ctx.kind === 'object' && ctx.atKey) return 'mparams';
    if (isClass(ctx) && !ctx.init) return 'mparams';
    return 'expr';
  };
  const push = (tok) => { tok.nl = nl; tokens.push({ type: tok.type, value: tok.value, start: tok.start, end: tok.end, nl }); prev = tok; nl = false; };

  /* template literal body from `j` (just after "`" or after the "}" of a substitution) */
  const scanTemplate = (j, startAt) => {
    for (;;) {
      if (j >= n) fail(file, code, startAt, 'an unterminated template literal');
      const c = code[j];
      if (c === '\\') {
        if (j + 1 >= n) fail(file, code, startAt, 'an unterminated template literal');
        if (code[j + 1] === '\r' && code[j + 2] === '\n') { literalLT.add(j + 1); literalLT.add(j + 2); j += 3; continue; }
        if (isLT(code[j + 1])) literalLT.add(j + 1);
        j += 2;
        continue;
      }
      if (c === '`') return { end: j + 1, subst: false };
      if (c === '$' && code[j + 1] === '{') return { end: j + 2, subst: true };
      if (isLT(c)) literalLT.add(j);
      j++;
    }
  };

  while (i < n) {
    const c = code[i];
    if (isLT(c)) {
      if (c === '\r' && code[i + 1] !== '\n') fail(file, code, i, 'a lone CR (not followed by LF) as a line terminator in code — save the file with LF or CRLF line ends');
      nl = true; i++; continue;
    }
    if (isWS(c)) { i++; continue; }
    // ── comments
    if (c === '/' && code[i + 1] === '/') {
      let j = i + 2;
      while (j < n && !isLT(code[j])) j++;
      comments.push({ start: i, end: j, kind: 'line', uncertain: inTail(i) || afterTail(i) });
      i = j;
      continue;
    }
    if (c === '/' && code[i + 1] === '*') {
      const j = code.indexOf('*/', i + 2);
      if (j < 0) fail(file, code, i, 'an unterminated block comment');
      comments.push({ start: i, end: j + 2, kind: 'block', uncertain: inTail(i) });
      for (let k = i + 2; k < j; k++) {
        if (code[k] === '\r' && code[k + 1] !== '\n') fail(file, code, k, 'a lone CR (not followed by LF) as a line terminator in a comment — save the file with LF or CRLF line ends');
        if (isLT(code[k])) nl = true;
      }
      i = j + 2;
      continue;
    }
    // ── HTML-like comments in code position: refuse
    if (c === '<' && code.startsWith('<!--', i)) fail(file, code, i, 'an HTML-like comment "<!--" in code position');
    if (c === '-' && code.startsWith('-->', i)) fail(file, code, i, 'an HTML-like comment "-->" in code position (if it is a decrement and a comparison, write it with a space: "n-- > 0")');
    const ctx = cur();
    // class field initializer ends by ASI at a new member on a new line
    if (isClass(ctx) && ctx.init && nl && (exprEnd(prev) || (prev && prev.value === '}' && prev.brace === 'arrow')) && (c === '#' || c === '*' || c === '"' || c === "'" || /[\p{ID_Start}$_\\0-9]/u.test(c))) ctx.init = false;
    // ── strings
    if (c === '"' || c === "'") {
      let j = i + 1;
      for (;;) {
        if (j >= n) fail(file, code, i, 'an unterminated string');
        const d = code[j];
        if (d === c) break;
        if (d === '\\') {
          const e = code[j + 1];
          if (e === '\r' && code[j + 2] === '\n') { literalLT.add(j + 1); literalLT.add(j + 2); j += 3; continue; }
          if (isLT(e)) literalLT.add(j + 1);
          if (e === undefined) fail(file, code, i, 'an unterminated string');
          j += 2;
          continue;
        }
        if (d === '\n' || d === '\r') fail(file, code, i, 'a line break inside a string (unterminated string)');
        j++;
      }
      if (ctx.t === '{' && ctx.kind === 'object' && ctx.atKey) { /* a string key */ }
      push({ type: 'string', value: code.slice(i, j + 1), start: i, end: j + 1 });
      i = j + 1;
      continue;
    }
    // ── template literals
    if (c === '`') {
      const r = scanTemplate(i + 1, i);
      if (r.subst) {
        stack.push({ t: '${', kind: 'subst', q: 0, tplStart: i });
        push({ type: 'punct', value: '${', start: i, end: r.end });
      } else {
        push({ type: 'template', value: code.slice(i, r.end), start: i, end: r.end });
      }
      i = r.end;
      continue;
    }
    // ── numbers
    if ((c >= '0' && c <= '9') || (c === '.' && code[i + 1] >= '0' && code[i + 1] <= '9')) {
      // review r3 A-1: a legacy octal / non-octal decimal (`010`, `08`) cannot take a "." or an exponent the way NUM_RE
      // reads it (`010.in` is `010` `.` `in`), and `0_1` is a syntax error — refuse both forms (sloppy-only or invalid code)
      if (c === '0' && code[i + 1] >= '0' && code[i + 1] <= '9') fail(file, code, i, 'a number with a leading zero followed by a digit (the legacy octal form)');
      if (c === '0' && code[i + 1] === '_') fail(file, code, i, 'a numeric separator "_" right after a leading zero (a syntax error)');
      NUM_RE.lastIndex = i;
      const m = NUM_RE.exec(code);
      const end = i + m[0].length;
      push({ type: 'num', value: m[0], start: i, end });
      i = end;
      continue;
    }
    // ── names, keywords, private names
    if (c === '#') {
      ID_RE.lastIndex = i + 1;
      const m = ID_RE.exec(code);
      if (!m) fail(file, code, i, 'a "#" that is not a private name');
      push({ type: 'priv', value: '#' + m[0], start: i, end: i + 1 + m[0].length });
      i += 1 + m[0].length;
      continue;
    }
    ID_RE.lastIndex = i;
    const idm = (ID_START_RE.test(c) || (c >= '\ud800' && c <= '\udbff')) ? ID_RE.exec(code) : null;
    if (idm) {
      const word = idm[0];
      const end = i + word.length;
      const isProp = !!prev && prev.type === 'punct' && (prev.value === '.' || prev.value === '?.');
      const objKey = ctx.t === '{' && ctx.kind === 'object' && ctx.atKey;
      const classKey = isClass(ctx) && !ctx.init;
      const key = objKey || classKey;
      const escaped = word.indexOf('\\') >= 0;
      if (!isProp && !key && !escaped && KEYWORDS.has(word)) {
        const tok = { type: 'keyword', value: word, start: i, end };
        if (word === 'function') {
          const asyncPrev = prev && prev.type === 'name' && prev.value === 'async' && !prev.prop && !nl;
          if (asyncPrev && prev.stmtStart === 'unknown') fail(file, code, i, 'an "async function" after "await" and a line break — cannot tell a declaration from an operand of await');
          const decl = asyncPrev ? prev.stmtStart : declStart(i, 'function');
          pendingFn = { depth: stack.length, decl };
        } else if (word === 'class') {
          pendingClass.push({ depth: stack.length, decl: declStart(i, 'class') });
        }
        push(tok);
      } else {
        const tok = { type: 'name', value: word, start: i, end, prop: isProp || key, key, dot: isProp, stmtStart: atStmtStart() };
        if (!tok.prop && prev) {
          // review r2 A-1: a binding name of var / let / const (an initializer is optional: the declarator ends by ASI)
          if ((prev.type === 'keyword' && (prev.value === 'var' || prev.value === 'const')) || (prev.type === 'name' && prev.value === 'let' && prev.letDecl)) tok.binding = true;
          else if (prev.type === 'punct' && prev.value === ',' && isStmts(ctx)) tok.afterComma = true;   // (inside brackets no declaration can end)
        }
        // `let` that starts a declaration (a statement start or the head of a `for`), not `let` the plain name.
        // review r3 A-2: in a SINGLE-STATEMENT position (after the `)` of if / while / for / with, after `else` / `do`,
        // after a label) a declaration is not allowed, so `let` there is the plain name (`if (a) let⏎b⏎/ 2` = `let; b / 2`)
        const single = !!prev && ((prev.type === 'punct' && prev.value === ')' && prev.paren === 'cond') || (prev.type === 'keyword' && (prev.value === 'else' || prev.value === 'do')) || (prev.type === 'punct' && prev.value === ':' && prev.realLabel));
        if (word === 'let' && !tok.prop && ((tok.stmtStart === true && !single) || (prev && prev.type === 'punct' && prev.value === '(' && ctx.t === '(' && ctx.kind === 'cond'))) tok.letDecl = true;
        if (word === 'await' && prev && prev.type === 'keyword' && prev.value === 'for') tok.afterFor = true;
        // the label of `break` / `continue` (same line: a line break would have ended the statement)
        if (!nl && !tok.prop && prev && prev.type === 'keyword' && (prev.value === 'break' || prev.value === 'continue')) tok.label = true;
        push(tok);
      }
      i = end;
      continue;
    }
    // ── the slash
    if (c === '/') {
      if (isClass(ctx) && !ctx.init) fail(file, code, i, 'a "/" at a class-member position (if it continues a class field on the line before, put the field value in parentheses)');
      const cert = slashCertainty(i);
      let asRegex;
      if (cert === 'weak') {
        slashes.weak++;
        asRegex = regexAllowed(i);                                   // ← THE WEAK DECISION (the net test replaces it)
        openTail(i);
      } else {
        slashes.strong++;
        asRegex = cert === 'regex';
        if (regexAllowed(i) !== asRegex) fail(file, code, i, 'the lexer state disagrees with the grammar at this "/" (' + cert + ' by the token before it)');
      }
      if (asRegex) {
        let j = i + 1, inClass = false;
        for (;;) {
          if (j >= n || isLT(code[j])) fail(file, code, i, 'an unterminated regular expression');
          const d = code[j];
          if (d === '\\') { if (j + 1 >= n || isLT(code[j + 1])) fail(file, code, i, 'an unterminated regular expression'); j += 2; continue; }
          if (d === '[') inClass = true;
          else if (d === ']') inClass = false;
          else if (d === '/' && !inClass) break;
          j++;
        }
        FLAGS_RE.lastIndex = j + 1;
        const fl = FLAGS_RE.exec(code)[0];
        if (fl.indexOf('\\') >= 0) fail(file, code, i, 'an escape in regular-expression flags');
        const end = j + 1 + fl.length;
        push({ type: 'regex', value: code.slice(i, end), start: i, end });
        i = end;
        continue;
      }
      const v = code[i + 1] === '=' ? '/=' : '/';
      push({ type: 'punct', value: v, start: i, end: i + v.length });
      i += v.length;
      continue;
    }
    // ── punctuators
    let pv = null;
    for (const p of (PUNCT_BY_CHAR.get(c) || [])) if (code.startsWith(p, i)) { pv = p; break; }
    if (pv === '?.' && code[i + 2] >= '0' && code[i + 2] <= '9') pv = '?';
    if (!pv) fail(file, code, i, 'a character this lexer does not know (' + JSON.stringify(c) + ')');
    const tok = { type: 'punct', value: pv, start: i, end: i + pv.length };
    // a token at the depth of a pending `class` / `function` that cannot sit between the keyword and its body / parameters
    if (topClass() && topClass().depth === stack.length && (pv === ';' || pv === ',' || pv === '}' || pv === ')' || pv === ']' || pv === '=>' || pv === '=')) fail(file, code, i, 'a "' + pv + '" between "class" and its body');
    if (pendingFn && pendingFn.depth === stack.length && pv !== '*' && pv !== '(') fail(file, code, i, 'a "' + pv + '" between "function" and its parameters');
    switch (pv) {
      case '(': {
        const k = parenKind();
        if (k === 'fparams') { tok.fnDecl = pendingFn.decl; pendingFn = null; }
        stack.push({ t: '(', kind: k, q: 0, fnDecl: tok.fnDecl });
        break;
      }
      case ')': {
        const o = stack.pop();
        if (!o || o.t !== '(') fail(file, code, i, 'a ")" without its "("');
        tok.paren = o.kind; tok.fnDecl = o.fnDecl;
        break;
      }
      case '[': stack.push({ t: '[', kind: 'bracket', q: 0 }); break;
      case ']': {
        const o = stack.pop();
        if (!o || o.t !== '[') fail(file, code, i, 'a "]" without its "["');
        break;
      }
      case '{': {
        const k = classifyBrace(i);
        const o = { t: '{', kind: k, q: 0, atKey: k === 'object', init: false };
        stack.push(o);
        tok.opened = o;
        break;
      }
      case '}': {
        const o = cur();
        if (o.t === '${') {
          stack.pop();
          const r = scanTemplate(i + 1, o.tplStart);
          if (r.subst) {
            stack.push({ t: '${', kind: 'subst', q: 0, tplStart: o.tplStart });
            push({ type: 'punct', value: '${', start: i, end: r.end });
          } else {
            push({ type: 'template', value: code.slice(o.tplStart, r.end), start: i, end: r.end });
          }
          i = r.end;
          continue;
        }
        if (o.t !== '{') fail(file, code, i, 'a "}" without its "{"');
        stack.pop();
        tok.brace = o.kind;
        break;
      }
      case '?': ctx.q++; break;
      case ':': {
        if (ctx.q > 0) { ctx.q--; tok.colon = 'ternary'; }
        else if (ctx.t === '{' && ctx.kind === 'object') { tok.colon = 'prop'; ctx.atKey = false; }
        else if (isStmts(ctx)) { tok.colon = 'label'; tok.realLabel = !!prev && prev.type === 'name' && prev.stmtStart === true; }   // realLabel: `L:`, not `case x:` / `default:`
        else fail(file, code, i, 'a ":" this lexer cannot place (not a ternary, a property, a label or a case)');
        break;
      }
      case ',': if (ctx.t === '{' && ctx.kind === 'object') ctx.atKey = true; break;
      case '...': if (ctx.t === '{' && ctx.kind === 'object') ctx.atKey = false; break;
      case '=': if (ctx.t === '{' && ctx.kind === 'object') ctx.atKey = false; else if (isClass(ctx)) ctx.init = true; break;
      case ';': if (isClass(ctx)) ctx.init = false; break;
      case '++': case '--':
        // review r2 A-2 (b): after `of` / `yield` / `await` on the same line a "++" is a PREFIX operator when the word is the
        // keyword and a postfix one when it is a plain name — refuse
        if (!nl && prev && prev.type === 'name' && !prev.prop && (prev.value === 'of' || prev.value === 'yield' || prev.value === 'await')) fail(file, code, i, 'a "' + pv + '" right after "' + prev.value + '" — cannot tell a prefix from a postfix operator; put it in parentheses');
        tok.postfix = exprEnd(prev) && !nl;
        break;
      case '*': if (isClass(ctx) && !ctx.init) { /* generator method marker */ } break;
      default: break;
    }
    push(tok);
    i += pv.length;
  }
  if (stack.length !== 1) {
    const o = cur();
    fail(file, code, o.tplStart !== undefined ? o.tplStart : n, 'the input ends inside an open ' + (o.t === '${' ? 'template substitution' : '"' + o.t + '"'));
  }
  if (pendingFn) fail(file, code, n, 'the input ends after "function"');
  if (pendingClass.length) fail(file, code, n, 'the input ends after "class"');
  // review A-1: EVERY line terminator inside a literal token (a string — a raw U+2028 / U+2029 is
  // legal there —, the text parts of a template, a regular expression) is content, whatever it is,
  // not only the ones the literal scans above saw. The emit path never trims or drops at these.
  for (const t of tokens) {
    if (t.type !== 'string' && t.type !== 'template' && t.type !== 'regex' && t.value !== '${') continue;
    for (let k = t.start; k < t.end; k++) if (isLT(code[k])) literalLT.add(k);
  }
  for (const cm of comments) cm.line = lineOf(code, cm.start);
  return { comments, literalLT, tokens, tails, slashes };
}

/** Group comments into keep units: a run of `//` comments on adjacent lines is one unit. A unit is
 *  kept for its text (keepReason) or by rule K: one of its comments starts in an uncertain tail. */
function keepUnits(code, comments) {
  const units = [];
  for (const c of comments) {
    const last = units[units.length - 1];
    if (last && c.kind === 'line' && last.kind === 'line') {
      const between = code.slice(last.members[last.members.length - 1].end, c.start);
      if (/^[ \t]*(?:\r\n|\n|\r|\u2028|\u2029)[ \t]*$/.test(between)) { last.members.push(c); continue; }
    }
    units.push({ kind: c.kind, members: [c] });
  }
  for (const u of units) {
    u.text = code.slice(u.members[0].start, u.members[u.members.length - 1].end);
    u.reason = keepReason(u.text) || (u.members.some((m) => m.uncertain) ? K_REASON : null);
  }
  return units;
}

/** The kept comments of a JS text: [{ line, reason, text, start, end }] (a `//` run = one entry). */
export function jsKeptComments(code, opts = {}) {
  const { comments } = scanJs(code, opts);
  return keepUnits(code, comments).filter((u) => u.reason).map((u) => ({ line: lineOf(code, u.members[0].start), reason: u.reason, text: u.text, start: u.members[0].start, end: u.members[u.members.length - 1].end }));
}

const LT_RE = /\r\n|[\n\r\u2028\u2029]/g;

/**
 * Remove every removable comment of a classic script.
 *  keepLines: true  — line i of the output is line i of the input minus comment text (every
 *                     line terminator stays, inside comments too).
 *  keepLines: false — the same, then a line that held only removed comments and white space
 *                     is dropped with its line terminator (only in code state).
 * A block comment on one line between two non-space characters becomes one space; trailing
 * spaces and tabs on a line touched by a removal are trimmed (code state only).
 */
export function stripJsComments(code, opts = {}) {
  code = String(code);
  const keepLines = opts.keepLines !== false;
  const file = opts.file || '<js>';
  const { comments, literalLT, tails } = scanJs(code, { file });
  const units = keepUnits(code, comments);
  const removed = [];
  // line terminators that must never be trimmed before / dropped: literal content (strings,
  // templates) and the inside / the end of a KEPT comment (its bytes stay as they are)
  const protect = new Set(literalLT);
  // rule K's companion: a U+2028 / U+2029 inside an uncertain tail may be string content under the
  // true reading (a raw LS / PS is legal in a string), so the emit path never trims or drops there
  for (const t of tails) for (let k = t.start; k < t.end; k++) if (code[k] === '\u2028' || code[k] === '\u2029') protect.add(k);
  // review r3 A-2 (b): the end of a tail line is never trimmed — under another reading its last blanks can belong to a true
  // comment (`/* c */ / 2 // MIT /   `). A comment removed on that line stands BEFORE the weak slash (one in the tail is kept),
  // so the only trims that could reach the tail are the ones at its line terminator and at the end of the input: skip those
  const tailEnd = new Set(tails.map((t) => t.end));
  let eofProtected = false;
  for (const u of units) {
    if (u.reason) {
      if (opts.onKept) opts.onKept({ line: lineOf(code, u.members[0].start), reason: u.reason, text: u.text });
      for (const m of u.members) {
        if (m.kind === 'block') { for (let k = m.start; k < m.end; k++) if (isLT(code[k])) protect.add(k); }
        else if (m.end >= code.length) eofProtected = true;
        else { protect.add(m.end); if (code[m.end] === '\r' && code[m.end + 1] === '\n') protect.add(m.end + 1); }
      }
      continue;
    }
    for (const m of u.members) removed.push(m);
  }
  if (!removed.length) return code;
  const buf = [];                      // output chunks (never a string rebuilt per comment: O(n))
  const add = (t) => { if (t) buf.push(t); };
  const lastChar = () => { for (let b = buf.length - 1; b >= 0; b--) if (buf[b].length) return buf[b][buf[b].length - 1]; return ''; };
  let pos = 0;
  let pendingSep = false;
  let touched = false;                 // the current OUTPUT line was touched by a removal
  const lines = [];                    // output lines: { touched, termCode } (one per terminator)
  // trim spaces / tabs at the end of the output; a line terminator is neither, so this never crosses a line
  const trimTail = () => {
    while (buf.length) {
      const t = buf[buf.length - 1];
      let k = t.length;
      while (k > 0 && (t[k - 1] === ' ' || t[k - 1] === '\t')) k--;
      if (k === t.length) return;
      if (k > 0) { buf[buf.length - 1] = t.slice(0, k); return; }
      buf.pop();
    }
  };
  // every line terminator of the input, once (review r2 A-4: a search per removed comment to the NEXT
  // terminator was quadratic on one long line with many comments); emitText walks it with one cursor
  const lts = [];
  LT_RE.lastIndex = 0;
  for (let m = LT_RE.exec(code); m; m = LT_RE.exec(code)) lts.push(m.index, m[0].length);
  let lc = 0;
  const emitText = (from, to) => {
    if (from >= to) return;
    if (pendingSep) {
      const a = lastChar();
      const b = code[from];
      if (a && !/\s/.test(a) && !/\s/.test(b)) add(' ');
      pendingSep = false;
    }
    let k = from;
    while (lc < lts.length && lts[lc] < from) lc += 2;
    for (; lc < lts.length && lts[lc] < to; lc += 2) {
      const at = lts[lc], len = lts[lc + 1];
      const inLit = protect.has(at);
      add(code.slice(k, at));
      if (touched && !inLit && !tailEnd.has(at)) trimTail();
      add(code.slice(at, at + len));
      lines.push({ touched, termCode: !inLit });
      touched = false;
      k = at + len;
    }
    add(code.slice(k, to));
  };
  for (const c of removed) {
    emitText(pos, c.start);
    const body = code.slice(c.start, c.end);
    touched = true;
    if (c.kind === 'line') {
      trimTail();
      pendingSep = false;
      pos = c.end;
      continue;
    }
    const terms = body.match(LT_RE);
    if (!terms) {
      pendingSep = true;
    } else {
      trimTail();
      pendingSep = false;
      for (const t of terms) { add(t); lines.push({ touched: true, termCode: true }); }
    }
    pos = c.end;
  }
  emitText(pos, code.length);
  if (touched && !eofProtected && !tailEnd.has(code.length)) {
    // the last line was touched and has no terminator: trim its tail (code state: no literal can
    // be open at EOF, and a kept line comment that ends the file is protected)
    trimTail();
  }
  lines.push({ touched, termCode: true, last: true });
  const out = buf.join('');
  if (keepLines) return out;
  // drop lines that are empty after the strip and were touched by it, in code state only
  const parts = [];
  let k = 0, li = 0;
  LT_RE.lastIndex = 0;
  for (let m = LT_RE.exec(out); m; m = LT_RE.exec(out)) {
    parts.push({ text: out.slice(k, m.index), term: m[0], info: lines[li++] });
    k = m.index + m[0].length;
  }
  parts.push({ text: out.slice(k), term: '', info: lines[li++] });
  if (li !== lines.length) throw new Error('lean-strip: ' + file + ' — internal line bookkeeping mismatch (' + li + ' vs ' + lines.length + ')');
  const res = [];
  let prevTermCode = true;
  for (const p of parts) {
    const drop = p.info.touched && p.text === '' && p.info.termCode && prevTermCode && p.term !== '';
    if (!drop) res.push(p.text, p.term);
    prevTermCode = p.info.termCode;
  }
  return res.join('');
}

/**
 * Post-conditions of one stripped JS text (runs in the build, no parser). Throws on the first problem.
 * For EVERY script (external and inline):
 *   · no NUL; not stripped to nothing when the source holds code; it compiles (vm.Script, never run);
 *     idempotent; deletion only (a subsequence of the source, white space aside);
 *   · the same CODE: scanJs of the source and of the output give the same sequence of tokens — type
 *     and exact text, every string / template / regular-expression literal byte for byte — and the
 *     same "a line terminator since the previous token" flag on every token (what ASI sees);
 *   · the kept comments: every comment of a kept unit (keepReason) is in the output byte for byte,
 *     in the same order, and the output holds no other comment.
 * For the three EXTERNAL files only (external: true): the line count, the anchors on their lines and
 * every output line a subsequence of its source line (lineInvariant).
 * The limit, honestly: the token and comment checks use the SAME scanner on both sides, so they catch
 * every bug of the EMIT path (a changed literal, a deleted code line, a lost line break), but not a
 * bug of the SCAN itself (a `/` read the wrong way is read the same wrong way in the output). For the
 * slash class, rules K / H of the scanner are what bound such a mistake (nothing is removed after an
 * uncertain slash on its line, and nothing carries it to the next line); for any scanner mistake the
 * acorn cross-check outside the build is the independent proof (scripts/pins-perflean/x-parser-crosscheck.mjs).
 * A comment kept by rule K counts as a kept comment here (keepUnits gives it its reason on both sides).
 */
export function checkJsStrip(src, out, file, { keepLines, external }) {
  if (out.indexOf(NUL) >= 0) throw new Error('lean-strip: ' + file + ' — stripped JS holds a NUL');
  const a = scanJs(src, { file });
  if (out.trim() === '' && a.tokens.length) throw new Error('lean-strip: ' + file + ' — stripped to nothing although the source holds code');
  try { new vm.Script(out, { filename: file }); }   // compile only, never run
  catch (e) { throw new Error('lean-strip: ' + file + ' — the stripped script does not compile: ' + (e && e.message)); }
  // idempotent: strip(out) === out exactly when every comment unit of `out` is a kept one (a removal
  // always deletes at least two characters and adds at most one), so one scan of `out` serves this
  // check and the token check below
  const b = scanJs(out, { file: String(file) + ' (stripped)' });
  if (keepUnits(out, b.comments).some((u) => !u.reason)) throw new Error('lean-strip: ' + file + ' — the JS strip is not idempotent');
  if (!deletionOnly(src, out)) throw new Error('lean-strip: ' + file + ' — the strip ADDED or MOVED text (output is not a subsequence of the input, white space aside)');
  if (external) {
    const p = lineInvariant(src, out, { anchors: JS_LINE_ANCHORS[file.split('/').pop()] || [], subsequence: true });
    if (p.length) throw new Error('lean-strip: ' + file + ' — line invariant: ' + p.join(' · '));
  }
  sameJsCode(src, a, out, b, file);
}

/* the token and kept-comment post-condition of checkJsStrip (review A-1, M9, S-2) */
function sameJsCode(src, a, out, b, file) {
  const ta = a.tokens, tb = b.tokens;
  const show = (t) => JSON.stringify(t.length > 40 ? t.slice(0, 40) + '…' : t);
  const n = Math.min(ta.length, tb.length);
  for (let k = 0; k < n; k++) {
    const x = ta[k], y = tb[k];
    const sx = src.slice(x.start, x.end), sy = out.slice(y.start, y.end);
    if (x.type !== y.type || sx !== sy) fail(file, src, x.start, 'post-condition: code token ' + k + ' changed (' + x.type + ' ' + show(sx) + ' → ' + y.type + ' ' + show(sy) + ')');
    // (before the FIRST token a line break means nothing to ASI: an inline body may lose a leading comment line)
    if (k > 0 && x.nl !== y.nl) fail(file, src, x.start, 'post-condition: the line break before code token ' + k + ' ' + show(sx) + ' was ' + (x.nl ? 'lost' : 'added') + ' (automatic semicolon insertion sees it)');
  }
  if (ta.length !== tb.length) fail(file, src, ta.length > n ? ta[n].start : src.length, 'post-condition: ' + ta.length + ' code tokens in the source, ' + tb.length + ' in the output');
  const kept = [];
  for (const u of keepUnits(src, a.comments)) if (u.reason) for (const m of u.members) kept.push(m);
  const left = b.comments;
  const m = Math.min(kept.length, left.length);
  for (let k = 0; k < m; k++) {
    const sx = src.slice(kept[k].start, kept[k].end), sy = out.slice(left[k].start, left[k].end);
    if (sx !== sy) fail(file, src, kept[k].start, 'post-condition: a kept comment is not in the output byte for byte (' + show(sx) + ' → ' + show(sy) + ')');
  }
  if (kept.length !== left.length) fail(file, src, kept.length > m ? kept[m].start : src.length, 'post-condition: ' + kept.length + ' kept comments in the source, ' + left.length + ' comments in the output');
}

/** Is `out` a subsequence of `src`, every white-space character skipped on both sides? */
export function deletionOnly(src, out) {
  let i = 0;
  for (let j = 0; j < out.length; j++) {
    const c = out[j];
    if (/\s/.test(c)) continue;
    for (;;) {
      if (i >= src.length) return false;
      if (src[i++] === c) break;
    }
  }
  return true;
}

/* ═══════════════════════════════ HTML ═══════════════════════════════
 * walkHtml — a left-to-right walk that models the parts of the HTML tokenizer that decide where
 * a <style> / <script> body starts and ends, and the few tree-builder facts that decide whether
 * such a body is CSS / classic JavaScript at all. It is NOT a full parser; what it does not model
 * it REFUSES (the Release build stops) or leaves byte for byte:
 *   · modelled: data; start / end tags with their attributes (quoted values may hold ">"); HTML
 *     comments (with the abrupt `<!-->` / `<!--->` forms, ended by `-->` or `--!>`); DOCTYPE /
 *     bogus comments; the RCDATA bodies of <textarea> and <title> (skipped, untouched); the
 *     raw-text bodies of <style> and <script> (they end at the first `</style` / `</script`
 *     followed by white space, "/" or ">", ASCII case-insensitive); a STACK of open <svg> /
 *     <math> elements (foreign content); whether a <select> or a <frameset> is open;
 *   · the body is CSS only when the <style> has no `type`, an empty one, or exactly `text/css`
 *     (ASCII case-insensitive, NOT trimmed — Chromium applies nothing else); it is classic
 *     JavaScript only when the <script> has no `src` and no `type`, an empty `type`, or a `type`
 *     whose value, ASCII white space trimmed, is a JavaScript MIME type essence (HTML spec,
 *     "prepare the script element": `type=" "` trims to "" and is NOT JavaScript — a data block);
 *   · tag and attribute names are lower-cased for ASCII letters only (no other character changes);
 *   · REFUSED: an unterminated construct; `<![CDATA[`; a <style> / <script> / <title> /
 *     <textarea> inside <svg> / <math> (foreign content parses them as markup, and an HTML
 *     integration point inside it as HTML: the walk models neither); an end tag </svg> / </math>
 *     that does not match the innermost open one; every <style> / <script> AFTER the start tag
 *     of an integration point (foreignObject, desc, title, annotation-xml, mi, mo, mn, ms, mtext)
 *     seen inside foreign content (the parser may then ignore a </svg>, r2 B-2); a <style> /
 *     <script> while a <select> or a
 *     <frameset> is open (parsers disagree there); <xmp> <iframe> <noembed> <noframes>
 *     <noscript> <plaintext> (raw text this walk does not model); a `</script` / `</style`
 *     inside a body that is not its end; `<!--` inside a script body (the tokenizer's escape
 *     states); a <script> / <style> attribute it does not know, a duplicate one, or a `type` /
 *     `src` value with a character reference.
 */
const HTML_WS = (c) => c === ' ' || c === '\t' || c === '\n' || c === '\f' || c === '\r';
const SCRIPT_ATTRS = new Set(['src', 'type', 'async', 'defer', 'nomodule', 'nonce', 'id', 'crossorigin', 'integrity', 'referrerpolicy', 'fetchpriority', 'blocking', 'charset']);
const STYLE_ATTRS = new Set(['media', 'nonce', 'title', 'blocking', 'id', 'class', 'type']);
const JS_MIME = new Set(['application/ecmascript', 'application/javascript', 'application/x-ecmascript', 'application/x-javascript', 'text/ecmascript', 'text/javascript', 'text/javascript1.0', 'text/javascript1.1', 'text/javascript1.2', 'text/javascript1.3', 'text/javascript1.4', 'text/javascript1.5', 'text/jscript', 'text/livescript', 'text/x-ecmascript', 'text/x-javascript']);
const UNMODELLED_RAW = new Set(['xmp', 'iframe', 'noembed', 'noframes', 'noscript', 'plaintext']);
const HTML_INTEGRATION_POINTS = new Set(['foreignobject', 'desc', 'title', 'annotation-xml', 'mi', 'mo', 'mn', 'ms', 'mtext']);
/* B-8: lower case for ASCII letters only (String#toLowerCase changes other characters too, and
 * U+0130 even changes the text length) */
const asciiLower = (t) => t.replace(/[A-Z]+/g, (m) => m.toLowerCase());
const HTML_TRIM_RE = /^[\t\n\f\r ]+|[\t\n\f\r ]+$/g;      // ASCII white space (HTML spec)

function readTag(html, i, file) {
  // i at '<' (start tag) or at '<' of '</' (end tag); returns { name, attrs: [[k,v,quoted]], selfClosing, end }
  const n = html.length;
  let j = html[i + 1] === '/' ? i + 2 : i + 1;
  const ns = j;
  while (j < n && !HTML_WS(html[j]) && html[j] !== '/' && html[j] !== '>') j++;
  const name = asciiLower(html.slice(ns, j));
  const attrs = [];
  let selfClosing = false;
  for (;;) {
    while (j < n && HTML_WS(html[j])) j++;
    if (j >= n) fail(file, html, i, 'an unterminated tag');
    if (html[j] === '>') return { name, attrs, selfClosing, end: j + 1 };
    if (html[j] === '/') { j++; if (html[j] === '>') { selfClosing = true; return { name, attrs, selfClosing, end: j + 1 }; } continue; }
    const as = j;
    j++;                                            // the first character is always part of the name (even "=")
    while (j < n && !HTML_WS(html[j]) && html[j] !== '/' && html[j] !== '>' && html[j] !== '=') j++;
    const key = asciiLower(html.slice(as, j));
    while (j < n && HTML_WS(html[j])) j++;
    let val = '', quoted = false;
    if (html[j] === '=') {
      j++;
      while (j < n && HTML_WS(html[j])) j++;
      if (html[j] === '"' || html[j] === "'") {
        const q = html[j];
        const e = html.indexOf(q, j + 1);
        if (e < 0) fail(file, html, i, 'an unterminated attribute value');
        val = html.slice(j + 1, e); quoted = true; j = e + 1;
      } else {
        const vs = j;
        while (j < n && !HTML_WS(html[j]) && html[j] !== '>') j++;
        if (j >= n) fail(file, html, i, 'an unterminated tag');
        val = html.slice(vs, j);
      }
    }
    attrs.push([key, val, quoted]);
  }
}

function rawEnd(html, lower, from, name, file, openAt) {
  // `lower` = asciiLower(html), computed once per document: ASCII case-insensitive, and the
  // offsets are those of `html` (only A–Z change, one character for one)
  const needle = '</' + name;
  let k = lower.indexOf(needle, from);
  if (k < 0) fail(file, html, openAt, 'an unterminated <' + name + '> element');
  const after = html[k + needle.length];
  if (!(HTML_WS(after) || after === '/' || after === '>')) fail(file, html, k, 'a "' + html.slice(k, k + needle.length + 1) + '" inside a <' + name + '> body');
  return k;
}

/** Walk an HTML document. Returns { parts }: markup pieces and raw-text bodies, in order;
 *  parts.map(p => p.text).join('') === html. A body part: { kind: 'style'|'script', text,
 *  start, attrs, classicJs (script), css (style), line }. */
export function walkHtml(html, { file = '<html>' } = {}) {
  html = String(html);
  if (html.indexOf(NUL) >= 0) fail(file, html, html.indexOf(NUL), 'a NUL character');
  const n = html.length;
  const parts = [];
  let mk = 0;                 // start of the pending markup piece
  const foreign = [];         // the open <svg> / <math> elements, innermost last (B-5a)
  let select = 0;             // open <select> elements (an over-count only refuses more)
  let frameset = false;       // a <frameset> was opened
  let ipAt = -1;              // r2 B-2: offset of an integration-point start tag seen inside foreign content
  let i = 0;
  const lower = asciiLower(html);
  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt < 0) break;
    i = lt;
    if (html.startsWith('<!--', i)) {
      if (html[i + 4] === '>') { i += 5; continue; }
      if (html[i + 4] === '-' && html[i + 5] === '>') { i += 6; continue; }
      let e1 = html.indexOf('-->', i + 4), e2 = html.indexOf('--!>', i + 4);
      if (e1 < 0 && e2 < 0) fail(file, html, i, 'an unterminated HTML comment');
      if (e1 < 0 || (e2 >= 0 && e2 < e1)) i = e2 + 4; else i = e1 + 3;
      continue;
    }
    if (html.startsWith('<![CDATA[', i)) fail(file, html, i, 'a CDATA section');
    if (html[i + 1] === '!' || html[i + 1] === '?') {
      const e = html.indexOf('>', i + 2);
      if (e < 0) fail(file, html, i, 'an unterminated markup declaration');
      i = e + 1;
      continue;
    }
    if (html[i + 1] === '/') {
      if (/[A-Za-z]/.test(html[i + 2] || '')) {
        const t = readTag(html, i, file);
        if (t.name === 'svg' || t.name === 'math') {
          // a stray end tag with nothing open is ignored by the parser; one that does not match
          // the innermost open foreign element is refused (the parser may pop more than one)
          if (foreign.length && foreign[foreign.length - 1] !== t.name) fail(file, html, i, 'a </' + t.name + '> while <' + foreign[foreign.length - 1] + '> is the innermost open foreign element');
          foreign.pop();
        } else if (t.name === 'select' && select > 0) select--;      // (a </frameset> is not counted: refusing more is safe)
        i = t.end;
        continue;
      }
      if (html[i + 2] === '>') { i += 3; continue; }
      const e = html.indexOf('>', i + 2);
      if (e < 0) fail(file, html, i, 'an unterminated bogus comment');
      i = e + 1;
      continue;
    }
    if (!/[A-Za-z]/.test(html[i + 1] || '')) { i++; continue; }
    const t = readTag(html, i, file);
    // r2 B-2: inside an integration point the parser ignores a </svg> / </math> that closes no
    // foreign element on the current path; the walk cannot follow that, so once such a start tag
    // is seen inside foreign content, every later <style> / <script> is refused
    if (foreign.length && ipAt < 0 && HTML_INTEGRATION_POINTS.has(t.name)) ipAt = i;
    if ((t.name === 'svg' || t.name === 'math') && !t.selfClosing) foreign.push(t.name);
    if (t.name === 'select') select++;
    if (t.name === 'frameset') frameset = true;
    if (UNMODELLED_RAW.has(t.name)) fail(file, html, i, 'a <' + t.name + '> element (raw text this walker does not model)');
    if (foreign.length && (t.name === 'script' || t.name === 'style' || t.name === 'title' || t.name === 'textarea')) fail(file, html, i, 'a <' + t.name + '> inside <svg> / <math> (foreign content)');
    if (t.name === 'textarea' || t.name === 'title') {
      const k = rawEnd(html, lower, t.end, t.name, file, i);
      i = k;
      continue;
    }
    if (t.name === 'script' || t.name === 'style') {
      if (ipAt >= 0) fail(file, html, i, 'a <' + t.name + '> after an integration point inside <svg> / <math> (line ' + lineOf(html, ipAt) + '): the walk cannot tell where foreign content ends');
      if (select > 0 || frameset) fail(file, html, i, 'a <' + t.name + '> while a <' + (select > 0 ? 'select' : 'frameset') + '> is open (parsers disagree on its content)');
      const allowed = t.name === 'script' ? SCRIPT_ATTRS : STYLE_ATTRS;
      const seen = new Set();
      for (const [k, v] of t.attrs) {
        if (seen.has(k)) fail(file, html, i, 'a duplicate attribute "' + k + '" on <' + t.name + '>');
        seen.add(k);
        if (!allowed.has(k) && !/^data-[a-z0-9\-_.]*$/.test(k)) fail(file, html, i, 'an attribute this walker does not understand on <' + t.name + '>: "' + k + '"');
        if (v.indexOf('&') >= 0 && (k === 'type' || k === 'src')) fail(file, html, i, 'a character reference in the "' + k + '" attribute of <' + t.name + '>');
      }
      const bodyStart = t.end;
      const k = rawEnd(html, lower, bodyStart, t.name, file, i);
      const body = html.slice(bodyStart, k);
      if (t.name === 'script' && body.indexOf('<!--') >= 0) fail(file, html, bodyStart + body.indexOf('<!--'), 'a "<!--" inside a <script> body (the tokenizer\'s escape states)');
      const get = (name) => { const a = t.attrs.find((x) => x[0] === name); return a ? a[1] : null; };
      const part = { kind: t.name, text: body, start: bodyStart, line: lineOf(html, bodyStart), attrs: t.attrs };
      const type = get('type');
      if (t.name === 'script') {
        // B-5b: absent or exactly empty = classic; else the value, ASCII white space trimmed,
        // must be a JavaScript MIME type essence (" " trims to "", which is not one)
        part.classicJs = get('src') === null && (type === null || type === '' || JS_MIME.has(asciiLower(type.replace(HTML_TRIM_RE, ''))));
      } else {
        // B-5c: the style element's type is NOT trimmed
        part.css = type === null || type === '' || asciiLower(type) === 'text/css';
      }
      parts.push({ kind: 'markup', text: html.slice(mk, bodyStart) });
      parts.push(part);
      mk = k;
      i = k;
      continue;
    }
    i = t.end;
  }
  parts.push({ kind: 'markup', text: html.slice(mk) });
  return { parts };
}

/** The lean transform of one shell. css: every CSS <style> body → stripCssLean; js: every
 *  classic inline <script> body (no src; no type or a JavaScript MIME type) → stripJsComments
 *  (keepLines: false). Everything else stays byte for byte. */
export function leanHtml(html, { css = false, js = false, file = '<html>', onKept } = {}) {
  const { parts } = walkHtml(html, { file });
  let out = '';
  for (const p of parts) {
    if (p.kind === 'style' && css && p.css) {
      const where = { name: file, lineBase: p.line, toString() { return file + ':' + p.line + ' (<style>)'; } };
      out += stripCssLean(p.text, { file: where, onKept: onKept && ((k) => onKept({ ...k, line: p.line + k.line - 1, where: 'style' })) });
    } else if (p.kind === 'script' && js && p.classicJs) {
      const where = { name: file, lineBase: p.line, toString() { return file + ':' + p.line + ' (<script>)'; } };
      out += stripJsComments(p.text, { keepLines: false, file: where, onKept: onKept && ((k) => onKept({ ...k, line: p.line + k.line - 1, where: 'script' })) });
    } else {
      out += p.text;
    }
  }
  return out;
}

/** Post-conditions of a lean shell: the walk of source and output gives the same parts; every
 *  markup part and every body out of scope is byte-identical; every CSS <style> body pair passes
 *  the exact deletion check (checkCssStrip) and is \u2261 its transform; every classic script
 *  body \u2261 its transform and passes checkJsStrip. */
export function checkLeanHtml(src, out, file, { css, js }) {
  const a = walkHtml(src, { file }).parts, b = walkHtml(out, { file: file + ' (stripped)' }).parts;
  if (a.length !== b.length) throw new Error('lean-strip: ' + file + ' — the stripped shell has ' + b.length + ' parts, the source ' + a.length);
  for (let k = 0; k < a.length; k++) {
    const p = a[k], q = b[k];
    if (p.kind !== q.kind) throw new Error('lean-strip: ' + file + ' — part ' + k + ' changed kind');
    if (p.kind === 'markup') { if (p.text !== q.text) throw new Error('lean-strip: ' + file + ' — markup changed (part ' + k + ')'); continue; }
    const where = file + ' <' + p.kind + '> at line ' + p.line;
    if (p.kind === 'style' && css && p.css) {
      checkCssStrip(p.text, q.text, where);       // the exact deletion check first (independent of the scanner)
      if (q.text !== stripCssLean(p.text, { file: where })) throw new Error('lean-strip: ' + where + ' — body \u2262 strip(body)');
    } else if (p.kind === 'script' && js && p.classicJs) {
      if (q.text !== stripJsComments(p.text, { keepLines: false, file: where })) throw new Error('lean-strip: ' + where + ' — body \u2262 strip(body)');
      checkJsStrip(p.text, q.text, where, { keepLines: false, external: false });
    } else if (p.text !== q.text) {
      throw new Error('lean-strip: ' + where + ' — an out-of-scope body changed');
    }
  }
}

/* ═══════════════════════════════ scope ═══════════════════════════════ */

/** Resolve the lean mode. argv: CLI args; env: the SPIXI_PACKAGED_LEAN value.
 *  → { css, js, source: 'flags'|'env'|'off', label } or { error }. An explicit flag wins. */
export function resolveLean(argv = [], env) {
  const fc = argv.includes('--lean-css'), fj = argv.includes('--lean-js');
  if (fc || fj) return { css: fc, js: fj, source: 'flags', label: [fc && 'css', fj && 'js'].filter(Boolean).join(',') };
  if (env === undefined || env === '') return { css: false, js: false, source: 'off', label: 'off' };
  if (env === 'css') return { css: true, js: false, source: 'env', label: 'css' };
  if (env === 'js') return { css: false, js: true, source: 'env', label: 'js' };
  if (env === 'css,js') return { css: true, js: true, source: 'env', label: 'css,js' };
  return { error: 'SPIXI_PACKAGED_LEAN must be "css", "js" or "css,js" (got ' + JSON.stringify(env) + ')' };
}

/** The scope of a lean mode. flags = { css, js } (or a resolveLean result).
 *  inScope(rel) → true when the packaged bytes of `rel` are transform(committed), not a copy.
 *  opts.legacyTokensStrip(text) — the no-flag strip of spixi.tokens.css (strip-release.mjs passes
 *  its own stripCssComments; injected, no import cycle). With lean CSS OFF that file is packed
 *  exactly as a no-flag build packs it (one switch per change, DECISIONS #1478): transform =
 *  legacyTokensStrip, check = equality with it; without the function that transform THROWS. */
const TOKENS_CSS = 'spixi.tokens.css';
export function leanScope(flags = {}, { legacyTokensStrip } = {}) {
  const css = !!flags.css, js = !!flags.js;
  const legacy = (text) => {
    if (typeof legacyTokensStrip !== 'function') throw new Error('lean-strip: ' + TOKENS_CSS + ' — lean CSS is off, so it needs the no-flag strip (leanScope(flags, { legacyTokensStrip })) — refusing to pack another strip');
    return legacyTokensStrip(text);
  };
  const scope = {
    css, js,
    label: [css && 'css', js && 'js'].filter(Boolean).join(',') || 'off',
    inScope(rel) {
      if (rel === TOKENS_CSS) return true;              // always: the new rule with lean CSS, else today's strip
      if (!css && !js) return false;
      if (/\.html$/.test(rel)) return true;
      if (css && /\.css$/.test(rel)) return true;
      if (js && EXTERNAL_JS.includes(rel)) return true;
      return false;
    },
    /** transform(rel, text) — the packaged bytes of `rel` (identity when out of scope). */
    transform(rel, text, onKept) {
      if (!scope.inScope(rel)) return text;
      if (rel === TOKENS_CSS && !css) return legacy(text);
      if (/\.css$/.test(rel)) return stripCssLean(text, { file: rel, onKept });
      if (/\.html$/.test(rel)) return leanHtml(text, { css, js, file: rel, onKept });
      if (EXTERNAL_JS.includes(rel)) return stripJsComments(text, { keepLines: true, file: rel, onKept });
      return text;
    },
    /** post-conditions of one transformed file; throws on the first problem */
    check(rel, src, out) {
      if (out.indexOf(NUL) >= 0) throw new Error('lean-strip: ' + rel + ' — the output holds a NUL');
      // r2 B-4: a sheet of nothing but comments and white space may strip to nothing (decided by
      // this regex, not by the scanner); any other file stripped to nothing is refused
      if (src.length && !out.length && !(/\.css$/.test(rel) && /^(?:[ \t\n\r\f]|\/\*[\s\S]*?\*\/)*$/.test(src))) throw new Error('lean-strip: ' + rel + ' — stripped to nothing');
      const cd = carrierDiff(src, out);
      if (cd.length) throw new Error('lean-strip: ' + formatCarrierDiff(rel, cd).replace(/\n/g, ' · '));
      if (!scope.inScope(rel)) { if (src !== out) throw new Error('lean-strip: ' + rel + ' — out of scope but changed'); return; }
      if (rel === TOKENS_CSS && !css) { if (out !== legacy(src)) throw new Error('lean-strip: ' + rel + ' — lean CSS is off but the file is not the no-flag strip of the committed one'); return; }
      if (/\.css$/.test(rel)) checkCssStrip(src, out, rel);
      else if (/\.html$/.test(rel)) checkLeanHtml(src, out, rel, { css, js });
      else if (EXTERNAL_JS.includes(rel)) checkJsStrip(src, out, rel, { keepLines: true, external: true });
      if (scope.transform(rel, out) !== out) throw new Error('lean-strip: ' + rel + ' — the transform is not idempotent');
    },
  };
  return scope;
}
