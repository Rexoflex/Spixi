#!/usr/bin/env node
// Use: node scripts/docs/compare-main-chat-rows.mjs [<folder with the project docs claude/talk-rulings-*.md>] [--manifest <path>] [--base <git rev>] [--own <a>-<b>]
//      (default manifest: scripts/docs/main-chat-rows-2026-11-22.json; the 2026-11-23 batch:
//       --manifest scripts/docs/main-chat-rows-2026-11-23.json --base 462ba3e4 --own 1950-1959; the 2026-11-28 batch
//       (session docsb3, DECISIONS 2060): --manifest scripts/docs/main-chat-rows-2026-11-28.json --base e3d69266)
//
// Session docsb (DECISIONS 1890), extended by session docsb2 (DECISIONS 1950): proves what insert-main-chat-rows.mjs
// did, with its own reading (no code shared).
// Per row: the block in DECISIONS.md = its heading line and the next (manifest `lines` − 1) lines; the line after it
// is empty. With the statusLines suffix of the manifest taken off, the block has the SHA-256 of the manifest and —
// when a folder is given — is byte-equal to its source block (a folder that does not exist = a miss). Then: the rows
// stand in number order; each run follows its predecessor = the highest row with a lower number among the TABLE rows
// ("| n |" / "| #n |") and the HEADING rows ("## #n ") of the file that are not in the manifest's own runs (scanned
// back from the empty line before the run to the nearest heading-row or table-row line: that line must be the
// predecessor's table line or heading line), with one empty line before the run, one between two rows and one after
// it, and then one empty line and a table row, OR a heading row "## #m " with m greater than the run's last row,
// OR the end of the file; every listed status cell ends with " → <text> |"; the file ends with one newline.
// With --base: DECISIONS.md minus the runs (and their empty lines), minus the cell suffixes and minus the table rows
// numbered in --own (this session's own rows) equals DECISIONS.md of that git revision — nothing else changed. On a
// tree merged with a newer base, give that base. With a folder: every "## #<n> " row of the docs in that folder with
// a number up to the manifest's highest row is either in the manifest, or a table row of the file, or a heading row
// of the file (a row that the main chat writes later than the manifest is not this batch's).
// The expected totals are fixed per manifest, by its file name: main-chat-rows-2026-11-22.json = 30 rows, 26 cells,
// 1 status line; main-chat-rows-2026-11-23.json = 8 rows, 13 cells, 0 status lines; main-chat-rows-2026-11-28.json =
// 14 rows, 19 cells, 0 status lines (docsb3: this table entry is its only code change); any other name: exit 2.
// The own rows of --own must be one block at the end of the file, each number once. Exit 1 on any miss; exit 2 on a
// wrong argument.
// LIMITS (stated in the first version that a reader can attack, #1735): it proves the bytes of the manifest's rows,
// their places, the listed cells and "the rest = the base"; it does NOT judge whether a cell's added text says what
// the newer row says (a reader does that), whether the manifest lists every row a prompt names (the totals fix only the COUNT of rows, cells and status lines;
// the folder check covers the rows of the docs in that folder up to the manifest's highest row), which rows carry the cells, the order of the own rows,
// --own without --base (then the own rows are not checked), or the content of the own rows (a reader reads them).
// New limits (docsb2): the scan back to the heading predecessor trusts that a body line of a row never starts like a
// table row ("| 12 |") or like a row heading ("## #12 "); the "rest = base" of the OLD manifest (2026-11-22) holds only
// against the base it was inserted on (ff5cd4d3) and a tree with nothing added since: on a later tree (the rows of
// 2026-11-23, own rows) that proof is not expected equal, and the old manifest is then run without --base.
// A run after a HEADING predecessor: the block of a heading row may hold empty lines, so a stray line between that
// block and the run counts as a part of the block; only --base (the rest = the base) catches it. After a TABLE
// predecessor the run must start two lines after it (review docsb2 r1, finding A-1).
// A cell of an older manifest that a later manifest extends again passes when its own suffix is followed by " → "
// (the later suffix is the later manifest's to prove); the old manifest's "rest = base" then does not hold (see above).
// That check looks for " → <add> → " ANYWHERE in the row's line (any column), for every manifest, and does not check
// that a later manifest names the cell: without --base (the old manifest on a later tree) a stray " → <add> → x" or a
// garbage text after the add passes; with --base it is red ("the rest … differs"). Review docsb2 r2 MINOR-1; by rule 9
// of the lead skill (a new class in two rounds) the checker got no third fix round: the limit is stated (#1735).
// A gap of these classes is a NIT, not a MAJOR (#1735).
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
let base = null, own = null, srcDir = null, manifestArg = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--base') { base = args[++i]; if (!base || base.startsWith('--')) { console.error('--base wants a git revision'); process.exit(2); } }
  else if (args[i] === '--manifest') { manifestArg = args[++i]; if (!manifestArg || manifestArg.startsWith('--')) { console.error('--manifest wants a path'); process.exit(2); } }
  else if (args[i] === '--own') { const r = /^(\d+)-(\d+)$/.exec(args[++i] || ''); if (!r) { console.error('--own wants <a>-<b>'); process.exit(2); } own = [+r[1], +r[2]]; }
  else if (srcDir === null) srcDir = args[i];
  else { console.error('one folder only'); process.exit(2); }
}
const manifestPath = manifestArg ? resolve(manifestArg) : join(root, 'scripts', 'docs', 'main-chat-rows-2026-11-22.json');
const EXPECTED = { 'main-chat-rows-2026-11-22.json': { rows: 30, cells: 26, statusLines: 1 }, 'main-chat-rows-2026-11-23.json': { rows: 8, cells: 13, statusLines: 0 }, 'main-chat-rows-2026-11-28.json': { rows: 14, cells: 19, statusLines: 0 } };
const EXPECT = EXPECTED[basename(manifestPath)];
if (!EXPECT) { console.error('unknown manifest ' + basename(manifestPath) + ': the expected totals are fixed per manifest name (' + Object.keys(EXPECTED).join(', ') + ')'); process.exit(2); }
const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
let bad = 0;
const miss = (msg) => { bad++; console.log('DIFFERENT  ' + msg); };
if (srcDir !== null && !(existsSync(srcDir) && statSync(srcDir).isDirectory())) miss('the folder ' + srcDir + ' does not exist');

const raw = readFileSync(join(root, 'DECISIONS.md'), 'utf8');
if (!raw.endsWith('\n') || raw.endsWith('\n\n\n')) miss('DECISIONS.md does not end with one newline (or one empty line after a run at the end)');
const dec = raw.replace(/\n$/, '').split('\n');
const isRowHead = (l) => /^## #\d+ /.test(l);
const tableNum = (l) => { const r = l.match(/^\| #?(\d+) \|/); return r ? +r[1] : null; };
const suffixOf = (n) => ((m.statusLines || []).find((s) => s.row === n) || {}).add || '';

function sourceText(n, doc) {
  const p = [join(srcDir, doc), join(srcDir, 'claude_' + doc), join(srcDir, 'claude', doc)].find(existsSync);
  if (!p) return null;
  const l = readFileSync(p, 'utf8').split('\n');
  const i = l.findIndex((x) => x.startsWith('## #' + n + ' '));
  if (i < 0) return null;
  let j = i + 1;
  while (j < l.length && !/^## /.test(l[j])) j++;
  const b = l.slice(i, j);
  while (b.length && b[b.length - 1] === '') b.pop();
  return b.join('\n');
}

const nRows = m.runs.reduce((a, r) => a + r.rows.length, 0);
if (nRows !== EXPECT.rows || m.cells.length !== EXPECT.cells || (m.statusLines || []).length !== EXPECT.statusLines)
  miss('the manifest holds ' + nRows + ' rows, ' + m.cells.length + ' cells, ' + (m.statusLines || []).length + ' status lines; expected ' + EXPECT.rows + ', ' + EXPECT.cells + ', ' + EXPECT.statusLines);
if (srcDir !== null && existsSync(srcDir)) {
  const inManifest = new Set(m.runs.flatMap((r) => r.rows.map(([n]) => n)));
  const maxRow = Math.max(...inManifest);
  for (const f of readdirSync(srcDir).filter((x) => /talk-rulings-.*\.md$/.test(x)))
    for (const l of readFileSync(join(srcDir, f), 'utf8').split('\n')) {
      const h = /^## #(\d+) /.exec(l);
      if (h && +h[1] <= maxRow && !inManifest.has(+h[1]) && !dec.some((x) => tableNum(x) === +h[1] || x.startsWith('## #' + h[1] + ' '))) miss('#' + h[1] + ' of ' + f + ' is neither in the manifest nor a table row nor a heading row of the file');
    }
}

// 1 · each row
const where = {};
for (const run of m.runs) for (const [n, doc] of run.rows) {
  const at = dec.map((l, i) => (l.startsWith('## #' + n + ' ') ? i : -1)).filter((i) => i >= 0);
  if (at.length !== 1) { miss('#' + n + ': ' + at.length + ' heading lines in DECISIONS.md'); continue; }
  const len = m.lines[String(n)];
  const b = dec.slice(at[0], at[0] + len);
  if (b.length !== len || dec[at[0] + len] !== '' && at[0] + len < dec.length) { miss('#' + n + ': the line after its ' + len + ' lines is not empty'); continue; }
  where[n] = at[0];
  const suf = suffixOf(n);
  if (suf) {
    const last = b.map((l, k) => (l.startsWith('Status: ') ? k : -1)).filter((k) => k >= 0).pop();
    if (last === undefined || !b[last].endsWith(suf)) { miss('#' + n + ': the Status line does not end with the manifest suffix'); continue; }
    b[last] = b[last].slice(0, -suf.length);
  }
  const t = b.join('\n');
  if (sha(t) !== m.sha256[String(n)]) { miss('#' + n + ': SHA-256 ' + sha(t).slice(0, 12) + ' ≠ manifest ' + m.sha256[String(n)].slice(0, 12)); continue; }
  if (srcDir !== null) {
    const s = sourceText(n, doc);
    if (s === null) { miss('#' + n + ': not found in ' + doc); continue; }
    if (s !== t) { const a = s.split('\n'), c = t.split('\n'); const k = a.findIndex((x, q) => x !== c[q]); miss('#' + n + ': first different line ' + (k + 1) + (k < 0 ? ' (length)' : '')); continue; }
  }
  console.log('equal      #' + n + (srcDir !== null ? '  (' + doc + ', byte for byte' : '  (SHA-256 of the manifest') + (suf ? '; + the status suffix' : '') + ')');
}

// 2 · places
const runSpan = [];
for (const run of m.runs) {
  const ns = run.rows.map(([n]) => n);
  if (ns.some((n) => where[n] === undefined)) continue;
  let ok = true;
  for (let k = 1; k < ns.length; k++) {
    const prevEnd = where[ns[k - 1]] + m.lines[String(ns[k - 1])];
    if (where[ns[k]] !== prevEnd + 1) { ok = false; miss('#' + ns[k] + ': not right after #' + ns[k - 1] + ' with one empty line'); }
  }
  const first = where[ns[0]];
  const own0 = new Set(m.runs.flatMap((r) => r.rows.map(([n]) => n)));
  const below = dec.map((l, i) => { const t = tableNum(l); if (t !== null) return [t, i, 'table row']; const h = /^## #(\d+) /.exec(l); return h ? [+h[1], i, 'heading row'] : null; })
    .filter((x) => x && x[0] < run.first && !own0.has(x[0]));
  const max = Math.max(...below.map((x) => x[0]));
  const at = below.filter((x) => x[0] === max);
  let k = first - 2;
  while (k >= 0 && tableNum(dec[k]) === null && !isRowHead(dec[k])) k--;
  // a table predecessor must stand right before the empty line (as in the first version); a heading predecessor is
  // found by the scan back (its block may hold empty lines, so a stray line inside it is caught only by --base: LIMITS)
  const tableHere = at.length === 1 && at[0][2] === 'table row';
  if (dec[first - 1] !== '' || (first >= 2 && dec[first - 2] === '') || at.length !== 1 || at[0][1] !== k || (tableHere && at[0][1] !== first - 2)) { ok = false; miss('run ' + run.first + ': not right after the ' + (at.length === 1 ? at[0][2] : 'row') + ' ' + max + ' (the highest lower number) with one empty line'); }
  const last = ns[ns.length - 1];
  const end = where[last] + m.lines[String(last)];   // the empty line after the run
  const afterOk = end >= dec.length || (dec[end] === '' && (end + 1 >= dec.length || tableNum(dec[end + 1]) !== null || (isRowHead(dec[end + 1]) && +dec[end + 1].match(/^## #(\d+) /)[1] > last)));
  if (!afterOk) { ok = false; miss('run ' + run.first + ': after #' + last + ' comes not one empty line and a table row or a later row heading (or the end)'); }
  // the span of the run for "the rest": after a table row it holds the empty line before the run too; after a heading row it holds the run and the empty line after it
  const hp = at.length === 1 && at[0][2] === 'heading row';
  runSpan.push(hp && end < dec.length ? [first, end] : [first - 1, Math.min(end, dec.length - 1)]);
  if (ok) console.log('place      run #' + ns[0] + '–#' + last + ': after ' + (at.length === 1 ? at[0][2] : 'row') + ' ' + max + '; one empty line before, between and after');
}
const heads = dec.filter(isRowHead).map((l) => +l.match(/^## #(\d+) /)[1]);
if (heads.some((n, i) => i && n <= heads[i - 1])) miss('the row headings are not in number order');

// 3 · status cells
for (const c of m.cells) {
  const l = dec.filter((x) => tableNum(x) === c.row);
  // a later batch may extend the same cell again (" → <older> → <newer> |", docsb2: #1796, #1798): the suffix of this
  // manifest is then followed by " → " instead of " |"
  if (l.length !== 1 || !(l[0].endsWith(' → ' + c.add + ' |') || l[0].includes(' → ' + c.add + ' → '))) miss('cell #' + c.row + ': not extended as the manifest says');
  else console.log('cell       #' + c.row + ' → ' + c.add.slice(0, 70) + (c.add.length > 70 ? '…' : ''));
}

// 4 · nothing else changed
if (base) {
  let rest = dec.filter((_, i) => !runSpan.some(([s, e]) => i >= s && i <= e));
  if (own) {
    const isOwn = (l) => { const n = tableNum(l); return n !== null && n >= own[0] && n <= own[1]; };
    const at = dec.map((l, i) => (isOwn(l) ? i : -1)).filter((i) => i >= 0);
    const nums = at.map((i) => tableNum(dec[i]));
    if (at.length && (at[at.length - 1] !== dec.length - 1 || at.some((i, k) => k && i !== at[k - 1] + 1) || new Set(nums).size !== nums.length))
      miss('the own rows ' + own.join('–') + ' are not one block at the end of the file with each number once');
    rest = rest.filter((l) => !isOwn(l));
  }
  for (const c of m.cells) rest = rest.map((l) => (tableNum(l) === c.row && l.endsWith(' → ' + c.add + ' |') ? l.slice(0, -(' → ' + c.add + ' |').length) + ' |' : l));
  const old = execFileSync('git', ['-C', root, 'show', base + ':DECISIONS.md'], { encoding: 'utf8', maxBuffer: 64 << 20 }).replace(/\n$/, '');
  if (rest.join('\n') !== old) { const o = old.split('\n'); const k = rest.findIndex((x, q) => x !== o[q]); miss('the rest of DECISIONS.md differs from ' + base + ' at line ' + (k + 1)); }
  else console.log('rest       DECISIONS.md minus the runs, the cell suffixes' + (own ? ' and the own rows ' + own.join('–') : '') + ' = ' + base + ':DECISIONS.md');
}

const total = m.runs.reduce((a, r) => a + r.rows.length, 0);
console.log(bad ? 'NOT EQUAL: ' + bad + ' miss(es)' : 'ALL EQUAL: ' + total + ' rows, ' + m.cells.length + ' cells' + (base ? ', the rest = ' + base : ''));
process.exit(bad ? 1 : 0);
