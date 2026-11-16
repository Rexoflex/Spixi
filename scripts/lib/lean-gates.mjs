/* lean-gates.mjs — the two artifact invariants of P-09 (docs/contract-perflean.md § 3.1).
 *
 * Pure functions, Node built-ins only, no I/O, no process exit. Consumers: build-shells --check
 * (source against built), strip-release --check (committed against packaged), the perflean pins.
 *
 * 1 · THE CARRIER MULTISET. C# localizes a shell line by line (SpixiLocalization.localizeHtml,
 *     Spixi/Lang/SpixiLocalization.cs:330-341): it replaces every `*SL{key}` on a line — in markup,
 *     strings and comments alike. A transform of shipped text that runs BEFORE that step (a
 *     minifier, a fold, a strip) can turn `'*SL{SpixiP1}' === '1'` into `false`, and the shell is
 *     then wrong on the device only (DECISIONS #248, research card R5-15). The multiset is taken
 *     over the RAW text, so the gate needs no lexer: equal multisets or a named carrier.
 *
 * 2 · THE LINE INVARIANT. The three external scripts never pass localizeHtml, and device logs cite
 *     them by line (`spixi.bundle.js:47` is the P1 log line). A transform of them may delete text
 *     inside a line, never move text to another line, and never add text OTHER THAN spaces and
 *     tabs: a removed comment may leave one space, so blanks of the OUTPUT are not counted
 *     (#46 r3 B-5: the gate does not see an added blank, also not inside a string — the byte
 *     compare of GATE 1 and the token post-condition of the JS strip see that).
 */

/** One carrier = `*SL{` up to the next `}` on the same line. The `g` flag is part of the
 *  contract shape; never use this object's lastIndex — every function below makes its own copy. */
export const CARRIER_RE = /\*SL\{([^}\r\n]*)\}/g;

/** The three files that never pass localizeHtml — the line invariant applies to them only. */
export const EXTERNAL_JS = ['spixi.bundle.js', 'spixi.strings.js', 'spixi.icons.js'];

/* Anchors: each string is ONE line of the file (unique in it, verified on the 2026-11-13 tree),
 * spread so that a lost newline anywhere before it moves it: the first line device logs cite, one
 * near the middle, one near the end. */
export const JS_LINE_ANCHORS = {
  'spixi.bundle.js': [
    "console.warn('[P1] ' + body);",                                  // line 47 (device logs: spixi.bundle.js:47)
    'function flashWalletTx(listEl, txid) {',                         // the middle (~line 18 886 of 37 785)
    'function mountEncPassPage({ host, bridge, strings } = {}) {',    // the end (~line 37 750)
  ],
  'spixi.strings.js': [
    'function setDocLang(code) {',                                    // line 24, after the two dictionary lines
    'window.SpixiStrings = {',                                        // line 38 of 50
  ],
  'spixi.icons.js': [
    'function iconFactory(ICONS) {',                                  // line 117 of 134, after every glyph line
    'window.SpixiIcons = { ICONS: ICONS, icon: iconFactory(ICONS) };', // line 133
  ],
};

/** The most per-line subsequence problems one lineInvariant call lists (a wholly wrong file
 *  must not print megabytes); the rest are counted in one closing line. */
const MAX_LINE_PROBLEMS = 20;

/** string → Map<key, count>, key = the text between the braces. */
export function carrierCounts(text) {
  const counts = new Map();
  const re = new RegExp(CARRIER_RE.source, 'g');   // own copy: no shared lastIndex
  for (const m of String(text).matchAll(re)) counts.set(m[1], (counts.get(m[1]) || 0) + 1);
  return counts;
}

/** [] when the two multisets are equal; else one entry per carrier whose count differs,
 *  sorted by name (code-unit order). */
export function carrierDiff(srcText, outText) {
  const a = carrierCounts(srcText);
  const b = carrierCounts(outText);
  const names = new Set([...a.keys(), ...b.keys()]);
  const diff = [];
  for (const carrier of names) {
    const src = a.get(carrier) || 0;
    const out = b.get(carrier) || 0;
    if (src !== out) diff.push({ carrier, src, out });
  }
  diff.sort((x, y) => (x.carrier < y.carrier ? -1 : x.carrier > y.carrier ? 1 : 0));
  return diff;
}

/** One line per entry: `<file>: carrier *SL{<name>} <src> → <out>`; '' for an empty diff. */
export function formatCarrierDiff(file, diff) {
  return (diff || []).map((d) => file + ': carrier *SL{' + d.carrier + '} ' + d.src + ' → ' + d.out).join('\n');
}

/** text.split('\n').length */
export function lineCount(text) {
  return String(text).split('\n').length;
}

/* 1-based line of the FIRST line holding `needle`, or 0 when absent; `second` = the line of the
 * next DIFFERENT line holding it (0 when none) — an anchor on two lines proves nothing. Linear. */
function anchorLines(text, needle) {
  const at = text.indexOf(needle);
  if (at === -1) return { line: 0, second: 0 };
  let line = 1;
  for (let i = text.indexOf('\n'); i !== -1 && i < at; i = text.indexOf('\n', i + 1)) line++;
  const eol = text.indexOf('\n', at);
  const again = eol === -1 ? -1 : text.indexOf(needle, eol + 1);
  let second = 0;
  if (again !== -1) {
    second = line + 1;
    for (let i = text.indexOf('\n', eol + 1); i !== -1 && i < again; i = text.indexOf('\n', i + 1)) second++;
  }
  return { line, second };
}

/* Is `out` a subsequence of `src`, with the spaces and tabs of `out` not counted? Two pointers, linear. */
function isSubsequenceIgnoringBlanks(src, out) {
  let i = 0;
  for (let j = 0; j < out.length; j++) {
    const c = out.charCodeAt(j);
    if (c === 32 || c === 9) continue;
    for (;;) {
      if (i >= src.length) return false;
      const s = src.charCodeAt(i++);
      if (s === c) break;
    }
  }
  return true;
}

/** [] when ok, else every problem (the per-line list capped at MAX_LINE_PROBLEMS):
 *  `line count a → b` · `anchor "<x>": line n → m` (missing / not unique: said so) ·
 *  with `subsequence: true`: `line n: text added or moved`. */
export function lineInvariant(srcText, outText, opts = {}) {
  const src = String(srcText);
  const out = String(outText);
  const { anchors = [], subsequence = false } = opts || {};
  const problems = [];
  const a = lineCount(src);
  const b = lineCount(out);
  if (a !== b) problems.push('line count ' + a + ' → ' + b);
  for (const anchor of anchors) {
    const s = anchorLines(src, anchor);
    const o = anchorLines(out, anchor);
    const name = 'anchor ' + JSON.stringify(anchor) + ': ';
    if (!s.line || !o.line) {
      problems.push(name + 'line ' + (s.line || 'missing') + ' → ' + (o.line || 'missing'));
      continue;
    }
    if (s.second) {
      problems.push(name + 'not unique in the source (lines ' + s.line + ' and ' + s.second + ')');
      continue;
    }
    if (s.line !== o.line) problems.push(name + 'line ' + s.line + ' → ' + o.line);
  }
  if (subsequence) {
    const sl = src.split('\n');
    const ol = out.split('\n');
    let bad = 0;
    for (let i = 0; i < ol.length; i++) {
      // a line past the end of the source has nothing to be a subsequence of
      if (i < sl.length && isSubsequenceIgnoringBlanks(sl[i], ol[i])) continue;
      if (i >= sl.length && !/[^ \t]/.test(ol[i])) continue;   // blank extra line: the count line said it
      bad++;
      if (bad <= MAX_LINE_PROBLEMS) problems.push('line ' + (i + 1) + ': text added or moved');
    }
    if (bad > MAX_LINE_PROBLEMS) problems.push('… ' + (bad - MAX_LINE_PROBLEMS) + ' more lines with text added or moved (not listed)');
  }
  return problems;
}
