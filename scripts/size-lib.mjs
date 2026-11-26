/* size-lib — the line classifier and tree counter behind the size rule.
 *
 * WHAT IT COUNTS
 *   Every line of a file gets one kind:
 *     'code'    — holds a non-white-space character that is not part of a comment
 *                 (a preprocessor directive line is code; a line inside a multi-line
 *                 string or template literal is code when it holds non-white-space text);
 *     'comment' — holds non-white-space comment text and no code character;
 *     'blank'   — neither (also a white-space-only line inside a multi-line string or a
 *                 block comment).
 *   The method is the same for every language: find the character ranges of the comments
 *   with a real parser, blank them out, and look at what is left on each line.
 *     C#    tree-sitter + tree-sitter-c-sharp (the `comment` nodes; strings are tokens of
 *           their own, so a `//` inside "…", @"…", """…""" or $"…" is never a comment).
 *     JS    acorn with onComment (ecmaVersion latest, module first, then script).
 *     CSS   a small scanner that knows "…", '…' and comments.
 *     HTML  parse5 with source locations: comment nodes are comments, <script> bodies go
 *           through the JS rule, <style> bodies through the CSS rule, the rest is code.
 *
 * LINES
 *   A leading BOM is dropped and CRLF is read as LF. A line ends at "\n"; a file that ends
 *   with "\n" has no extra empty line after it, and a last line without "\n" still counts
 *   (the `wc -l` count, plus one when the last line has no newline). A lone "\r" is
 *   white space, not a line break.
 *
 * THE STORE FLAG (C#)
 *   store[i] is false when line i + 1 sits in an #if / #elif / #else branch that is
 *   definitely false in a store build: DEBUG, SPIXI_DEV_COEXIST and SPIXI_CSH are false,
 *   every other symbol is unknown, and the logic is three-valued (an unknown branch is
 *   kept). A #define / #undef in the file sets its symbol from that line on, as the
 *   compiler does; one whose name is not a plain ASCII identifier makes the store-false
 *   symbols unknown from that line on (fail closed). Directive lines themselves are
 *   store = true. Only real directives
 *   count: a line that starts with `#` inside a string or a block comment is not one; the
 *   parse decides.
 *
 * LIMITS (each one a known edge, not a promise)
 *   - tree-sitter parses every #if branch. A branch that is not well-formed C# on its own
 *     gives ERROR nodes; their tokens still count as code and parseErrors reports them.
 *   - The #if evaluator reads the directive text itself; it does not need the parse tree
 *     to be free of errors.
 *   - JS that acorn cannot read falls back to a scanner that does not know regex literals
 *     (the result says fallback: true).
 *   - gitGenerated uses `git check-attr --source`, which reads the tree's .gitattributes
 *     and also the repository's own info/attributes (the global and system files are
 *     switched off). Without --source (git older than 2.40) the lib reads the tree's
 *     .gitattributes files itself with a matcher of the common gitignore-style patterns.
 *   - The git functions do not classify a file they cannot read as UTF-8 text (a UTF-16 byte
 *     order mark, a NUL byte, bytes that are not UTF-8, a symlink, a submodule): gitFiles
 *     marks it `unreadable`, and countTree lists it instead of counting it.
 *   - classifyCs lists in `suspect` the shapes where this classifier and the compiler may see the
 *     directives differently (see classifyCs); the store flags of such a file are not a proof.
 */
import { spawnSync } from 'node:child_process';
import * as acorn from 'acorn';
import { parse as parseHtml } from 'parse5';

let Parser = null;
let CSharp = null;
let csParser = null;
try {
  Parser = (await import('tree-sitter')).default;
  // The full entry path: the package's bare "main" makes Node print a deprecation warning.
  CSharp = (await import('tree-sitter-c-sharp/bindings/node/index.js')).default;
} catch {
  Parser = null;
}

function getCsParser() {
  if (!Parser) throw new Error('size-lib: tree-sitter / tree-sitter-c-sharp are not installed (npm ci)');
  if (!csParser) {
    csParser = new Parser();
    csParser.setLanguage(CSharp);
  }
  return csParser;
}

// ───────────────────────────── shared line logic ─────────────────────────────

/** Drops a BOM and reads CRLF as LF. */
export function normalizeText(text) {
  let t = String(text);
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
  if (t.indexOf('\r\n') !== -1) t = t.replace(/\r\n/g, '\n');
  return t;
}

/** [start, end) offsets of each line, without its "\n". */
function lineSpans(text) {
  const starts = [];
  const ends = [];
  if (text.length === 0) return { starts, ends };
  let s = 0;
  for (;;) {
    const nl = text.indexOf('\n', s);
    if (nl === -1) {
      starts.push(s);
      ends.push(text.length);
      break;
    }
    starts.push(s);
    ends.push(nl);
    s = nl + 1;
    if (s >= text.length) break;
  }
  return { starts, ends };
}

function isSpace(c) {
  return c <= 32 || c === 0xa0 || c === 0xfeff || c === 0x1680 || (c >= 0x2000 && c <= 0x200a) ||
    c === 0x2028 || c === 0x2029 || c === 0x202f || c === 0x205f || c === 0x3000 || c === 0x85;
}

/* A line is a comment line when it holds non-white-space comment text and no code
 * character; a white-space-only line inside a block comment is blank, as a white-space-only
 * line inside a multi-line string is. */
function kindsFromMask(text, mask, spans) {
  const n = spans.starts.length;
  const kinds = new Array(n);
  for (let i = 0; i < n; i++) {
    const s = spans.starts[i];
    const e = spans.ends[i];
    let code = false;
    let comment = false;
    for (let j = s; j < e; j++) {
      if (isSpace(text.charCodeAt(j))) continue;
      if (mask[j] === 1) { comment = true; continue; }
      code = true;
      break;
    }
    kinds[i] = code ? 'code' : comment ? 'comment' : 'blank';
  }
  return kinds;
}

function markRanges(mask, ranges, value) {
  for (const [s, e] of ranges) mask.fill(value, Math.max(0, s), Math.min(mask.length, e));
}

/* The text of each line split into its code part (comment characters turned into
 * spaces) and its comment part (only the comment characters). */
function lineParts(text, mask, spans) {
  const n = spans.starts.length;
  const code = new Array(n);
  const comments = new Array(n);
  for (let i = 0; i < n; i++) {
    const s = spans.starts[i];
    const e = spans.ends[i];
    let hasComment = false;
    for (let j = s; j < e; j++) if (mask[j] === 1) { hasComment = true; break; }
    if (!hasComment) {
      code[i] = text.slice(s, e);
      comments[i] = '';
      continue;
    }
    let c = '';
    let m = '';
    for (let j = s; j < e; j++) {
      const ch = text[j];
      if (mask[j] === 1) { c += ' '; m += ch; } else { c += ch; }
    }
    code[i] = c;
    comments[i] = m;
  }
  return { code, comments };
}

// ───────────────────────────────── C# ─────────────────────────────────

const CS_STRING_TYPES = [
  'string_literal', 'verbatim_string_literal', 'raw_string_literal',
  'interpolated_string_expression', 'character_literal',
];

/* The store build: these symbols are not defined; every other symbol is unknown. */
export const STORE_FALSE_SYMBOLS = Object.freeze(['DEBUG', 'SPIXI_DEV_COEXIST', 'SPIXI_CSH']);

// Three-valued values: 1 = true, 0 = false, null = unknown.
const not3 = (a) => (a === null ? null : a ? 0 : 1);
const and3 = (a, b) => (a === 0 || b === 0 ? 0 : a === 1 && b === 1 ? 1 : null);
const or3 = (a, b) => (a === 1 || b === 1 ? 1 : a === 0 && b === 0 ? 0 : null);
const eq3 = (a, b) => (a === null || b === null ? null : a === b ? 1 : 0);

/** Evaluates a C# preprocessor condition; `symbols` maps a name to 1 / 0 / null. Unknown
 * on a condition it cannot read. Precedence as in C#: ! > == != > && > ||. */
export function evalCondition(src, symbols) {
  const toks = [];
  const re = /\s*(\|\||&&|==|!=|!|\(|\)|[A-Za-z_\p{L}][\w\p{L}\p{Mn}\p{Nd}]*)/uy;
  let pos = 0;
  const s = src.replace(/\/\/.*$/, '').trim();
  while (pos < s.length) {
    re.lastIndex = pos;
    const m = re.exec(s);
    if (!m) return null;
    toks.push(m[1]);
    pos = re.lastIndex;
    while (pos < s.length && /\s/.test(s[pos])) pos++;
  }
  if (toks.length === 0) return null;
  let i = 0;
  const fail = {};
  const value = (name) => {
    if (name === 'true') return 1;
    if (name === 'false') return 0;
    if (Object.prototype.hasOwnProperty.call(symbols, name)) return symbols[name];
    return null;
  };
  const primary = () => {
    const t = toks[i++];
    if (t === undefined) throw fail;
    if (t === '(') {
      const v = orE();
      if (toks[i++] !== ')') throw fail;
      return v;
    }
    if (/^[A-Za-z_\p{L}]/u.test(t)) return value(t);
    throw fail;
  };
  const unary = () => {
    if (toks[i] === '!') { i++; return not3(unary()); }
    return primary();
  };
  const eqE = () => {
    let v = unary();
    while (toks[i] === '==' || toks[i] === '!=') {
      const op = toks[i++];
      const r = unary();
      v = op === '==' ? eq3(v, r) : not3(eq3(v, r));
    }
    return v;
  };
  const andE = () => {
    let v = eqE();
    while (toks[i] === '&&') { i++; v = and3(v, eqE()); }
    return v;
  };
  const orE = () => {
    let v = andE();
    while (toks[i] === '||') { i++; v = or3(v, andE()); }
    return v;
  };
  try {
    const v = orE();
    if (i !== toks.length) return null;
    return v;
  } catch (e) {
    if (e === fail) return null;
    throw e;
  }
}

const PLAIN_SYMBOL = /^[A-Za-z_][A-Za-z0-9_]*$/;

/* Goes through the real directive lines in order and gives each line its store flag. A
 * #define / #undef whose name is not a plain ASCII identifier may name a store-false symbol
 * in a form this classifier cannot see (an escape, a format character, a look-alike letter), so
 * from that line on the store-false symbols are unknown and the line is listed in `suspect`. */
function storeFlags(text, spans, directiveIdx, suspect) {
  const n = spans.starts.length;
  const store = new Array(n).fill(true);
  const symbols = {};
  for (const name of STORE_FALSE_SYMBOLS) symbols[name] = 0;
  // Each frame: the value of the enclosing region, the value of the current branch, and
  // "no earlier branch of this chain was taken".
  const stack = [];
  let active = 1; // value of the region the current line is in
  let next = 0;
  for (let i = 0; i < n; i++) {
    const isDirective = next < directiveIdx.length && directiveIdx[next] === i;
    if (!isDirective) {
      if (active === 0) store[i] = false;
      continue;
    }
    next++;
    const line = text.slice(spans.starts[i], spans.ends[i]);
    const m = /^\s*#\s*([A-Za-z]+)\b(.*)$/.exec(line);
    if (!m) continue;
    const kw = m[1];
    const rest = m[2];
    if (kw === 'if') {
      const c = evalCondition(rest, symbols);
      stack.push({ parent: active, none: not3(c) });
      active = and3(active, c);
    } else if (kw === 'elif') {
      const f = stack[stack.length - 1];
      if (!f) continue;
      const c = evalCondition(rest, symbols);
      active = and3(f.parent, and3(f.none, c));
      f.none = and3(f.none, not3(c));
    } else if (kw === 'else') {
      const f = stack[stack.length - 1];
      if (!f) continue;
      active = and3(f.parent, f.none);
      f.none = 0;
    } else if (kw === 'endif') {
      const f = stack.pop();
      if (!f) continue;
      active = f.parent;
    } else if (kw === 'define' || kw === 'undef') {
      const name = rest.replace(/\/\/.*$/, '').trim();
      if (!PLAIN_SYMBOL.test(name)) {
        suspect.push({ line: i + 1, reason: 'define-name' });
        for (const sym of STORE_FALSE_SYMBOLS) symbols[sym] = null;
        continue;
      }
      if (active === 0) continue;
      const v = kw === 'define' ? 1 : 0;
      symbols[name] = active === 1 ? v : symbols[name] === v ? v : null;
    }
  }
  return store;
}

function countErrors(root) {
  if (!root.hasError) return 0;
  let errors = 0;
  const cursor = root.walk();
  let descend = true;
  for (;;) {
    if (descend) {
      const t = cursor.nodeType;
      if (t === 'ERROR') errors++;
      else if (cursor.currentNode.isMissing) errors++;
    }
    if (descend && cursor.gotoFirstChild()) continue;
    if (cursor.gotoNextSibling()) { descend = true; continue; }
    if (!cursor.gotoParent()) break;
    descend = false;
  }
  return errors;
}

/** The full C# analysis; classifyCs returns it. */
function analyzeCs(rawText) {
  const text = normalizeText(rawText);
  const spans = lineSpans(text);
  const mask = new Uint8Array(text.length + 1);
  let parseErrors = 0;
  if (text.length > 0) {
    const tree = getCsParser().parse(text, null, { bufferSize: Math.max(32 * 1024, text.length * 2 + 16) });
    const root = tree.rootNode;
    const strings = root.descendantsOfType(CS_STRING_TYPES);
    markRanges(mask, strings.map((nd) => [nd.startIndex, nd.endIndex]), 2);
    const comments = root.descendantsOfType('comment');
    markRanges(mask, comments.map((nd) => [nd.startIndex, nd.endIndex]), 1);
    parseErrors = countErrors(root);
  }
  const directiveIdx = [];
  const suspect = [];
  const hasSeparator = /[\r\u0085\u2028\u2029]/.test(text);
  for (let i = 0; i < spans.starts.length; i++) {
    const s = spans.starts[i];
    const e = spans.ends[i];
    if (hasSeparator && /[\r\u0085\u2028\u2029]/.test(text.slice(s, e))) {
      suspect.push({ line: i + 1, reason: 'line-separator' });
    }
    let j = s;
    while (j < e && isSpace(text.charCodeAt(j))) j++;
    if (j >= e || text[j] !== '#') continue;
    if (mask[j] === 1) { suspect.push({ line: i + 1, reason: 'comment-over-directive' }); continue; }
    if (mask[j] === 2) { suspect.push({ line: i + 1, reason: 'string-over-directive' }); continue; }
    directiveIdx.push(i);
    const line = text.slice(j, e);
    const lineComment = line.indexOf('//');
    const block = line.indexOf('/*');
    if (block !== -1 && (lineComment === -1 || block < lineComment)) {
      suspect.push({ line: i + 1, reason: 'block-comment-on-directive' });
    }
    if (/\\\s*$/.test(line)) suspect.push({ line: i + 1, reason: 'directive-continuation' });
    markDirectiveTail(text, mask, j, e);
  }
  const kinds = kindsFromMask(text, mask, spans);
  const store = storeFlags(text, spans, directiveIdx, suspect);
  suspect.sort((a, b) => a.line - b.line || (a.reason < b.reason ? -1 : 1));
  const parts = lineParts(text, mask, spans);
  return {
    kinds,
    store,
    directives: directiveIdx.map((i) => i + 1),
    parseErrors,
    codeText: parts.code,
    comments: parts.comments,
    suspect,
  };
}

/* The directives after which C# reads a `//` tail as a comment. tree-sitter folds the tail
 * of some of them (#define, #undef) into the directive's argument; it is marked as comment
 * here so that its text reaches `comments`. #region, #endregion, #error and #warning carry a
 * message, not a comment, and stay as they are. The line stays code either way. */
const DIRECTIVES_WITH_COMMENT = new Set(['if', 'elif', 'else', 'endif', 'define', 'undef', 'line', 'pragma', 'nullable']);

function markDirectiveTail(text, mask, hash, end) {
  const m = /^#\s*([A-Za-z]+)/.exec(text.slice(hash, end));
  if (!m || !DIRECTIVES_WITH_COMMENT.has(m[1])) return;
  for (let k = hash + m[0].length; k + 1 < end; k++) {
    if (mask[k] === 1) return;
    if (mask[k] === 0 && text[k] === '/' && text[k + 1] === '/') {
      mask.fill(1, k, end);
      return;
    }
  }
}

/** C# file text → { kinds, store, directives, parseErrors, codeText, comments, suspect }.
 * codeText[i] is line i + 1 with each comment character turned into a space; comments[i] is
 * the comment characters of that line joined ('' when none). suspect lists the shapes where
 * this classifier and the compiler may see the directives differently: [{ line (1-based),
 * reason }] with reason one of 'comment-over-directive' (a comment covers a line that starts
 * with #), 'string-over-directive' (a string covers such a line), 'block-comment-on-directive'
 * (a /* on a real directive line), 'directive-continuation' (a real directive line ends in
 * a backslash), 'define-name' (a #define / #undef name that is not [A-Za-z_][A-Za-z0-9_]*),
 * 'line-separator' (a lone CR, U+0085, U+2028 or U+2029 on the line: a line break for the
 * compiler, white space here). Empty for a plain file. */
export function classifyCs(text) {
  return analyzeCs(text);
}

// ───────────────────────────────── web ─────────────────────────────────

function jsCommentRanges(text) {
  const tryParse = (sourceType) => {
    const ranges = [];
    acorn.parse(text, {
      ecmaVersion: 'latest',
      sourceType,
      allowHashBang: true,
      allowReturnOutsideFunction: sourceType === 'script',
      allowAwaitOutsideFunction: true,
      allowImportExportEverywhere: sourceType === 'module',
      onComment: (_block, _txt, start, end) => ranges.push([start, end]),
    });
    return ranges;
  };
  for (const st of ['module', 'script']) {
    try {
      return { ranges: tryParse(st), fallback: false };
    } catch {
      /* try the next mode, then the scanner */
    }
  }
  return { ranges: jsScanComments(text), fallback: true };
}

/* A plain scanner for JS that acorn cannot read: strings, template literals and
 * comments; a regex literal is not recognised. */
function jsScanComments(text) {
  const ranges = [];
  const n = text.length;
  let i = 0;
  const tpl = []; // brace depth at each open template hole
  let depth = 0;
  while (i < n) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '/') {
      const e = text.indexOf('\n', i);
      const end = e === -1 ? n : e;
      ranges.push([i, end]);
      i = end;
    } else if (c === '/' && text[i + 1] === '*') {
      const e = text.indexOf('*/', i + 2);
      const end = e === -1 ? n : e + 2;
      ranges.push([i, end]);
      i = end;
    } else if (c === '"' || c === "'") {
      i++;
      while (i < n && text[i] !== c && text[i] !== '\n') i += text[i] === '\\' ? 2 : 1;
      i++;
    } else if (c === '`' || (c === '}' && tpl.length && tpl[tpl.length - 1] === depth)) {
      if (c === '}') { tpl.pop(); depth--; }
      i++;
      while (i < n && text[i] !== '`' && !(text[i] === '$' && text[i + 1] === '{')) i += text[i] === '\\' ? 2 : 1;
      if (text[i] === '$') { depth++; tpl.push(depth); i += 2; } else i++;
    } else {
      if (c === '{') depth++;
      else if (c === '}') depth--;
      i++;
    }
  }
  return ranges;
}

function cssCommentRanges(text) {
  const ranges = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '*') {
      const e = text.indexOf('*/', i + 2);
      const end = e === -1 ? n : e + 2;
      ranges.push([i, end]);
      i = end;
    } else if (c === '"' || c === "'") {
      i++;
      while (i < n && text[i] !== c && text[i] !== '\n') i += text[i] === '\\' ? 2 : 1;
      i++;
    } else {
      i++;
    }
  }
  return ranges;
}

/* A <script> is JS when its type is absent, empty, `module`, or a JavaScript MIME type of
 * the HTML standard (compared by its essence: the part before `;`, trimmed, lower case). */
const JS_MIME_ESSENCES = new Set([
  'application/ecmascript', 'application/javascript', 'application/x-ecmascript',
  'application/x-javascript', 'text/ecmascript', 'text/javascript', 'text/javascript1.0',
  'text/javascript1.1', 'text/javascript1.2', 'text/javascript1.3', 'text/javascript1.4',
  'text/javascript1.5', 'text/jscript', 'text/livescript', 'text/x-ecmascript',
  'text/x-javascript',
]);

function isJsScriptType(typeAttr) {
  if (typeAttr === undefined) return true;
  const raw = typeAttr.trim().toLowerCase();
  if (raw === '' || raw === 'module') return true;
  return JS_MIME_ESSENCES.has(raw.split(';')[0].trim());
}

function htmlCommentRanges(text) {
  const ranges = [];
  let fallback = false;
  const doc = parseHtml(text, { sourceCodeLocationInfo: true });
  const visit = (node) => {
    if (node.nodeName === '#comment') {
      const loc = node.sourceCodeLocation;
      if (loc) ranges.push([loc.startOffset, loc.endOffset]);
      return;
    }
    if (node.tagName === 'script' || node.tagName === 'style') {
      for (const ch of node.childNodes || []) {
        if (ch.nodeName !== '#text' || !ch.sourceCodeLocation) continue;
        const off = ch.sourceCodeLocation.startOffset;
        const body = text.slice(off, ch.sourceCodeLocation.endOffset);
        let inner = [];
        if (node.tagName === 'style') {
          inner = cssCommentRanges(body);
        } else {
          const typeAttr = (node.attrs || []).find((a) => a.name === 'type');
          if (!isJsScriptType(typeAttr ? typeAttr.value : undefined)) continue;
          const r = jsCommentRanges(body);
          if (r.fallback) fallback = true;
          inner = r.ranges;
        }
        for (const [s, e] of inner) ranges.push([s + off, e + off]);
      }
      return;
    }
    for (const ch of node.childNodes || []) visit(ch);
    if (node.content) visit(node.content);
  };
  visit(doc);
  return { ranges, fallback };
}

/** Web file text and its extension (.js .mjs .css .html) → { kinds, fallback, codeText, comments }
 * (codeText and comments as in classifyCs). */
export function classifyWeb(rawText, ext) {
  const x = String(ext || '').toLowerCase().replace(/^(?!\.)/, '.');
  const text = normalizeText(rawText);
  const spans = lineSpans(text);
  const mask = new Uint8Array(text.length + 1);
  let fallback = false;
  if (text.length > 0) {
    let ranges;
    if (x === '.js' || x === '.mjs') {
      const r = jsCommentRanges(text);
      ranges = r.ranges;
      fallback = r.fallback;
    } else if (x === '.css') {
      ranges = cssCommentRanges(text);
    } else if (x === '.html' || x === '.htm') {
      const r = htmlCommentRanges(text);
      ranges = r.ranges;
      fallback = r.fallback;
    } else {
      throw new Error(`size-lib: classifyWeb does not know the extension "${ext}"`);
    }
    markRanges(mask, ranges, 1);
  }
  const kinds = kindsFromMask(text, mask, spans);
  const parts = lineParts(text, mask, spans);
  return { kinds, fallback, codeText: parts.code, comments: parts.comments };
}

// ──────────────────────────────── paths ────────────────────────────────

const ROCKSDB_PREFIX = 'Spixi/Platforms/MacCatalyst/RocksDbSharp/';

/** App C#: Spixi/**\/*.cs without the vendored RocksDbSharp folder. */
export function isAppCs(path) {
  return path.startsWith('Spixi/') && /\.cs$/i.test(path) && !path.startsWith(ROCKSDB_PREFIX);
}

/** A web file under src/ (.js .mjs .css .html), generated or not. */
export function isSrcWeb(path) {
  return path.startsWith('src/') && /\.(js|mjs|css|html)$/i.test(path);
}

/** A hand-written web file under src/: not in generatedSet (linguist-generated / -vendored). */
export function isSrcHandWritten(path, generatedSet) {
  return isSrcWeb(path) && !(generatedSet && generatedSet.has(path));
}

// ───────────────────────────────── git ─────────────────────────────────

const GIT_MAX_BUFFER = 1024 * 1024 * 1024;

export class GitError extends Error {}

function git(repo, args, opts = {}) {
  const r = spawnSync('git', ['-C', repo, ...args], {
    input: opts.input === undefined ? undefined : Buffer.from(opts.input, 'utf8'),
    maxBuffer: GIT_MAX_BUFFER,
    env: { ...process.env, GIT_ATTR_NOSYSTEM: '1', LC_ALL: 'C' },
    encoding: opts.encoding === undefined ? 'utf8' : opts.encoding,
  });
  if (r.error) throw new GitError(`git ${args[0]}: ${r.error.message}`);
  if (r.status !== 0 && !opts.allowFail) {
    const err = Buffer.isBuffer(r.stderr) ? r.stderr.toString('utf8') : String(r.stderr || '');
    throw new GitError(`git ${args.join(' ')}: exit ${r.status}: ${err.trim().split('\n')[0]}`);
  }
  return r;
}

/** The full commit id of `rev`; a GitError when it is not a commit. */
export function gitResolve(repo, rev) {
  if (typeof rev !== 'string' || rev === '' || rev.startsWith('-')) throw new GitError(`not a revision: ${rev}`);
  const r = git(repo, ['rev-parse', '--verify', '--quiet', '--end-of-options', `${rev}^{commit}`], { allowFail: true });
  if (r.status !== 0) throw new GitError(`not a commit in ${repo}: ${rev}`);
  return r.stdout.trim();
}

function lsTree(repo, rev) {
  const r = git(repo, ['ls-tree', '-r', '-z', '--full-tree', '--end-of-options', rev]);
  const out = [];
  for (const rec of r.stdout.split('\0')) {
    if (!rec) continue;
    const tab = rec.indexOf('\t');
    const [mode, type, sha] = rec.slice(0, tab).split(' ');
    out.push({ mode, type, sha, path: rec.slice(tab + 1) });
  }
  return out;
}

function catBlobs(repo, shas) {
  if (shas.length === 0) return [];
  const r = git(repo, ['cat-file', '--batch'], { input: shas.join('\n') + '\n', encoding: 'buffer' });
  const buf = r.stdout;
  const dec = new TextDecoder('utf-8');
  const strict = new TextDecoder('utf-8', { fatal: true });
  const out = [];
  let pos = 0;
  for (let k = 0; k < shas.length; k++) {
    const nl = buf.indexOf(10, pos);
    if (nl === -1) throw new GitError('git cat-file: short output');
    const header = buf.toString('utf8', pos, nl).split(' ');
    if (header[1] === 'missing') throw new GitError(`git cat-file: missing object ${header[0]}`);
    const size = Number(header[2]);
    const start = nl + 1;
    const bytes = buf.subarray(start, start + size);
    out.push({ text: dec.decode(bytes), unreadable: unreadableWhy(bytes, strict) });
    pos = start + size + 1;
  }
  return out;
}

/* Why a blob cannot be read as a UTF-8 text file, or undefined when it can. A UTF-16 file
 * or a file with a NUL byte would otherwise be classified as UTF-8 noise. */
function unreadableWhy(bytes, strict) {
  if (bytes.length >= 2 && ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff))) {
    return 'UTF-16 byte order mark';
  }
  if (bytes.indexOf(0) !== -1) return 'NUL byte';
  try {
    strict.decode(bytes);
  } catch {
    return 'not valid UTF-8';
  }
  return undefined;
}

/** Every file of the tree of `rev` → [{ path, text, unreadable? }]; no work-tree read.
 * `filter` (optional: a function of the path, or an array / Set of paths) limits which
 * entries are read — a tree holds binaries too, so pass one. `unreadable` is set (and the
 * entry must not be classified) for a blob with a UTF-16 byte order mark, a NUL byte or
 * bytes that are not UTF-8, and for a symlink or a submodule (text ''). */
export function gitFiles(repo, rev, filter) {
  let keep = () => true;
  if (typeof filter === 'function') keep = filter;
  else if (filter) {
    const set = filter instanceof Set ? filter : new Set(filter);
    keep = (p) => set.has(p);
  }
  const entries = lsTree(repo, rev).filter((e) => keep(e.path));
  const blobs = entries.filter((e) => e.type === 'blob' && e.mode !== '120000');
  const read = catBlobs(repo, blobs.map((e) => e.sha));
  const byEntry = new Map(blobs.map((e, i) => [e, read[i]]));
  return entries.map((e) => {
    const r = byEntry.get(e);
    if (r) return r.unreadable ? { path: e.path, text: r.text, unreadable: r.unreadable } : { path: e.path, text: r.text };
    return { path: e.path, text: '', unreadable: e.mode === '120000' ? 'symlink' : e.type === 'commit' ? 'submodule' : e.type };
  });
}

function attrIsSet(info) {
  return info !== 'unspecified' && info !== 'unset' && info !== 'false';
}

let checkAttrHasSource = null;

/** The paths of `paths` whose linguist-generated or linguist-vendored attribute is set by the
 * attributes of the tree of `rev` → Set. */
export function gitGenerated(repo, rev, paths) {
  const list = [...paths];
  const set = new Set();
  if (list.length === 0) return set;
  if (checkAttrHasSource !== false) {
    const r = git(repo, ['-c', 'core.attributesFile=/dev/null', 'check-attr', '--source', rev, '-z', '--stdin',
      'linguist-generated', 'linguist-vendored'], { input: list.join('\0') + '\0', allowFail: true });
    if (r.status === 0) {
      checkAttrHasSource = true;
      const f = r.stdout.split('\0');
      for (let i = 0; i + 2 < f.length; i += 3) if (attrIsSet(f[i + 2])) set.add(f[i]);
      return set;
    }
    if (!/source|unknown option|usage/i.test(String(r.stderr))) {
      throw new GitError(`git check-attr: exit ${r.status}: ${String(r.stderr).trim().split('\n')[0]}`);
    }
    checkAttrHasSource = false;
  }
  return attrsByOwnReader(repo, rev, list);
}

/* gitignore-style pattern → RegExp for a path relative to the attributes file's folder. */
function attrPatternRe(pat) {
  let p = pat;
  const anchored = p.includes('/');
  if (p.startsWith('/')) p = p.slice(1);
  let re = '';
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === '*' && p[i + 1] === '*') {
      if (p[i + 2] === '/') { re += '(?:.*/)?'; i += 2; } else { re += '.*'; i += 1; }
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else if (c === '[') {
      const close = p.indexOf(']', i + 1);
      if (close === -1) re += '\\[';
      else {
        let cls = p.slice(i + 1, close);
        if (cls.startsWith('!')) cls = '^' + cls.slice(1);
        re += '[' + cls.replace(/\\/g, '\\\\') + ']';
        i = close;
      }
    } else if (c === '\\' && i + 1 < p.length) { re += '\\' + p[++i]; }
    else re += c.replace(/[.+^${}()|\\]/g, '\\$&');
  }
  return new RegExp(anchored ? `^${re}$` : `(?:^|/)${re}$`);
}

function attrsByOwnReader(repo, rev, list) {
  const files = gitFiles(repo, rev, (p) => p === '.gitattributes' || p.endsWith('/.gitattributes'))
    .filter((f) => !f.unreadable);
  const rules = [];
  files.sort((a, b) => a.path.split('/').length - b.path.split('/').length);
  for (const f of files) {
    const dir = f.path.slice(0, -'.gitattributes'.length);
    for (const raw of normalizeText(f.text).split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const parts = line.split(/\s+/);
      const pat = parts.shift();
      if (pat.endsWith('/')) continue;
      const attrs = {};
      for (const a of parts) {
        const m = /^([-!]?)([^=]+)(?:=(.*))?$/.exec(a);
        if (!m) continue;
        const name = m[2];
        if (name !== 'linguist-generated' && name !== 'linguist-vendored') continue;
        attrs[name] = m[1] === '-' ? 'unset' : m[1] === '!' ? 'unspecified' : m[3] === undefined ? 'set' : m[3];
      }
      if (Object.keys(attrs).length) rules.push({ dir, re: attrPatternRe(pat), attrs });
    }
  }
  const set = new Set();
  for (const path of list) {
    const st = { 'linguist-generated': 'unspecified', 'linguist-vendored': 'unspecified' };
    for (const r of rules) {
      if (!path.startsWith(r.dir)) continue;
      if (!r.re.test(path.slice(r.dir.length))) continue;
      Object.assign(st, r.attrs);
    }
    if (attrIsSet(st['linguist-generated']) || attrIsSet(st['linguist-vendored'])) set.add(path);
  }
  return set;
}

function unquoteGitPath(s) {
  if (!s.startsWith('"')) return s;
  const bytes = [];
  for (let i = 1; i < s.length - 1; i++) {
    const c = s[i];
    if (c !== '\\') { for (const b of Buffer.from(c, 'utf8')) bytes.push(b); continue; }
    const d = s[++i];
    if (/[0-7]/.test(d)) { bytes.push(parseInt(s.slice(i, i + 3), 8)); i += 2; continue; }
    const map = { n: 10, t: 9, r: 13, a: 7, b: 8, f: 12, v: 11, '\\': 92, '"': 34 };
    bytes.push(map[d] !== undefined ? map[d] : d.charCodeAt(0));
  }
  return Buffer.from(bytes).toString('utf8');
}

function diffSidePath(rest, prefix) {
  let s = rest.replace(/\t$/, '');
  if (s === '/dev/null') return null;
  s = unquoteGitPath(s);
  return s.startsWith(prefix) ? s.slice(prefix.length) : s;
}

/** The lines `head` adds against `base` → Map<path, { status: 'A'|'M'|'D', added: number[]
 * (1-based head lines), removed: number }>. `paths` (optional) are pathspecs. A deleted file
 * is keyed by its base path. A change with no hunk is not listed: a file whose only change
 * is its mode, a new empty file, a deleted empty file. */
export function gitDiffAdded(repo, base, head, paths) {
  const args = ['-c', 'core.quotePath=false', 'diff', '-U0', '--no-renames', '--text', '--no-ext-diff',
    '--no-textconv', '--no-color', '--src-prefix=a/', '--dst-prefix=b/', '--end-of-options', base, head];
  if (paths && [...paths].length) args.push('--', ...paths);
  const r = git(repo, args, { encoding: 'buffer' });
  const text = r.stdout.toString('utf8');
  const map = new Map();
  let cur = null;
  let minus = null;
  let inHunk = false;
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      cur = null;
      minus = null;
      inHunk = false;
      continue;
    }
    if (!inHunk || (cur === null && minus === null)) {
      if (line.startsWith('--- ')) { minus = diffSidePath(line.slice(4), 'a/'); continue; }
      if (line.startsWith('+++ ')) {
        const plus = diffSidePath(line.slice(4), 'b/');
        const key = plus === null ? minus : plus;
        const status = minus === null ? 'A' : plus === null ? 'D' : 'M';
        cur = { status, added: [], removed: 0 };
        map.set(key, cur);
        continue;
      }
    }
    const h = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (h && cur) {
      inHunk = true;
      const b = h[2] === undefined ? 1 : Number(h[2]);
      const c = Number(h[3]);
      const d = h[4] === undefined ? 1 : Number(h[4]);
      cur.removed += b;
      for (let k = 0; k < d; k++) cur.added.push(c + k);
    }
  }
  return map;
}

// ──────────────────────────────── counting ────────────────────────────────

/** A code line that defines a switch key: `…Key = "flag<Name>"` in its code part. */
export const SWITCH_RE = /Key\s*=\s*"flag[A-Za-z0-9_]+"/;

/** The physical line count of a file as the classifiers count it. */
export function physicalLines(text) {
  return lineSpans(normalizeText(text)).starts.length;
}

/** The size table of one tree. */
export function countTree(repo, rev) {
  const commit = gitResolve(repo, rev);
  const files = gitFiles(repo, commit, (p) => isAppCs(p) || isSrcWeb(p));
  const srcPaths = files.filter((f) => isSrcWeb(f.path)).map((f) => f.path);
  const generated = gitGenerated(repo, commit, srcPaths);
  const app = {
    files: 0, code: 0, comment: 0, blank: 0, store: 0, switches: 0, over1500: [], lines: {},
    parseErrors: 0, parseErrorFiles: [], suspectFiles: [], unreadableFiles: [],
  };
  const src = { files: 0, code: 0, comment: 0, blank: 0, fallbackFiles: [], unreadableFiles: [] };
  for (const f of files) {
    if (f.unreadable) {
      if (isAppCs(f.path)) app.unreadableFiles.push({ path: f.path, why: f.unreadable });
      else if (isSrcHandWritten(f.path, generated)) src.unreadableFiles.push({ path: f.path, why: f.unreadable });
      continue;
    }
    if (isAppCs(f.path)) {
      const r = analyzeCs(f.text);
      app.files++;
      for (let i = 0; i < r.kinds.length; i++) {
        const k = r.kinds[i];
        app[k]++;
        if (k === 'code') {
          if (r.store[i]) app.store++;
          if (SWITCH_RE.test(r.codeText[i])) app.switches++;
        }
      }
      app.lines[f.path] = r.kinds.length;
      if (r.kinds.length > 1500) app.over1500.push({ path: f.path, lines: r.kinds.length });
      if (r.suspect.length) app.suspectFiles.push({ path: f.path, suspect: r.suspect });
      if (r.parseErrors) {
        app.parseErrors += r.parseErrors;
        app.parseErrorFiles.push({ path: f.path, errors: r.parseErrors });
      }
    } else if (isSrcHandWritten(f.path, generated)) {
      const ext = f.path.slice(f.path.lastIndexOf('.'));
      const r = classifyWeb(f.text, ext);
      src.files++;
      for (const k of r.kinds) src[k]++;
      if (r.fallback) src.fallbackFiles.push(f.path);
    }
  }
  app.over1500.sort((a, b) => b.lines - a.lines || (a.path < b.path ? -1 : 1));
  return { rev, commit, app, src };
}

/** Two countTree results → the same shape with b − a for the numbers. over1500 lists every
 * file over the limit in a or b with lines = b − a and its real base / head line counts
 * (0 only when the file is absent on that side, or empty). */
export function countDelta(a, b) {
  const nums = (x, y, keys) => Object.fromEntries(keys.map((k) => [k, (y[k] || 0) - (x[k] || 0)]));
  const app = nums(a.app, b.app, ['files', 'code', 'comment', 'blank', 'store', 'switches', 'parseErrors']);
  const paths = new Set([...a.app.over1500, ...b.app.over1500].map((f) => f.path));
  const count = (t, p) => (Object.prototype.hasOwnProperty.call(t.app.lines, p) ? t.app.lines[p] : 0);
  app.over1500 = [...paths]
    .map((p) => ({ path: p, base: count(a, p), head: count(b, p) }))
    .map((e) => ({ path: e.path, lines: e.head - e.base, base: e.base, head: e.head }))
    .sort((x, y) => (x.path < y.path ? -1 : 1));
  app.over1500Count = b.app.over1500.length - a.app.over1500.length;
  const src = nums(a.src, b.src, ['files', 'code', 'comment', 'blank']);
  return { rev: `${a.rev}..${b.rev}`, base: a.commit, head: b.commit, app, src };
}
