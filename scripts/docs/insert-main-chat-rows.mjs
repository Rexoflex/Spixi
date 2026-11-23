#!/usr/bin/env node
// Use: node scripts/docs/insert-main-chat-rows.mjs <folder with the project docs claude/talk-rulings-*.md> [manifest] [--manifest <path>]
//      (default manifest: scripts/docs/main-chat-rows-2026-11-22.json; the 2026-11-23 batch: --manifest scripts/docs/main-chat-rows-2026-11-23.json)
//
// Session docsb (DECISIONS 1890), extended by session docsb2 (DECISIONS 1950): inserts the main chat's rows into
// DECISIONS.md word for word and extends the status cells that the manifest lists. A row = the heading block
// "## #<n> ..." of its project doc, from the heading line up to the line before the next "## " heading (trailing empty
// lines dropped), byte for byte. A run of rows goes right after the predecessor: the highest row with a lower number
// than the run's first row among the TABLE rows ("| n |" / "| #n |") AND the HEADING rows ("## #n ") of the file that
// are not in the manifest's own runs. After a table row the run follows at once; after a heading row it follows the
// last line of that row's block and its one empty line (a block ends at the line before the first empty line that is
// followed by a "## #" heading line, a table row or the end of the file). One empty line before the run, one between
// two rows and one after the run: the separation that a heading block needs between lines of the table (without it
// Markdown joins the next line to the block). Nothing else is added.
// A status cell is extended by " → <text>" before its closing " |" (the old text is kept, 215).
// The script refuses a tree that already holds one of the rows. Proof: compare-main-chat-rows.mjs.
// LIMIT: the end of a heading row's block is found by lines only: a body line of a row that starts like a table row
// ("| 12 |") or like a row heading ("## #12 ") would be taken for a row of the file.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pos = [];
let manifestArg = null;
{ const a = process.argv.slice(2); for (let i = 0; i < a.length; i++) { if (a[i] === '--manifest') { manifestArg = a[++i]; if (!manifestArg || manifestArg.startsWith('--')) { console.error('--manifest wants a path'); process.exit(2); } } else pos.push(a[i]); } }
const srcDir = pos[0];
const manifestPath = manifestArg ? resolve(manifestArg) : pos[1] ? resolve(pos[1]) : join(root, 'scripts', 'docs', 'main-chat-rows-2026-11-22.json');
if (!srcDir || pos.length > 2 || (manifestArg && pos.length > 1)) { console.error('Use: node scripts/docs/insert-main-chat-rows.mjs <folder with the talk-rulings docs> [manifest | --manifest <path>]'); process.exit(2); }
const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
const fail = (msg) => { console.error('REFUSED: ' + msg); process.exit(1); };

function readDoc(name) {
  for (const p of [join(srcDir, name), join(srcDir, 'claude_' + name), join(srcDir, 'claude', name)]) if (existsSync(p)) return readFileSync(p, 'utf8');
  fail('source doc not found: ' + name + ' in ' + srcDir);
}
function sourceBlock(n, doc) {
  const lines = readDoc(doc).split('\n');
  const starts = lines.map((l, i) => (l.startsWith('## #' + n + ' ') ? i : -1)).filter((i) => i >= 0);
  if (starts.length !== 1) fail('row ' + n + ': ' + starts.length + ' heading lines in ' + doc);
  let end = starts[0] + 1;
  while (end < lines.length && !lines[end].startsWith('## ')) end++;
  const block = lines.slice(starts[0], end);
  while (block.length && block[block.length - 1] === '') block.pop();
  if (block.some((l) => l.includes('\r'))) fail('row ' + n + ': a CR in the source');
  if (m.lines && m.lines[String(n)] !== block.length) fail('row ' + n + ': ' + block.length + ' lines, the manifest says ' + m.lines[String(n)]);
  return block;
}
const rowNum = (line) => { const r = /^\| #?(\d+) \|/.exec(line); return r ? Number(r[1]) : null; };
const headNum = (line) => { const r = /^## #(\d+) /.exec(line); return r ? Number(r[1]) : null; };

const decPath = join(root, 'DECISIONS.md');
const text = readFileSync(decPath, 'utf8');
if (!text.endsWith('\n')) fail('DECISIONS.md does not end with a newline');
const lines = text.slice(0, -1).split('\n');

for (const run of m.runs) for (const [n] of run.rows) {
  if (lines.some((l) => l.startsWith('## #' + n + ' '))) fail('row ' + n + ' is in DECISIONS.md already');
  if (lines.some((l) => rowNum(l) === n)) fail('a table row ' + n + ' is in DECISIONS.md already');
}

// The status cells (table rows of the base).
for (const c of m.cells) {
  const idx = lines.map((l, i) => (rowNum(l) === c.row ? i : -1)).filter((i) => i >= 0);
  if (idx.length !== 1) fail('cell ' + c.row + ': ' + idx.length + ' table rows');
  const l = lines[idx[0]];
  if (!l.endsWith(' |')) fail('cell ' + c.row + ': the row does not end with " |"');
  if (c.add.includes('|') || c.add.includes('\n')) fail('cell ' + c.row + ': the text holds a "|" or a newline');
  if (l.includes(' → ' + c.add + ' |')) fail('cell ' + c.row + ': already extended');
  lines[idx[0]] = l.slice(0, -2) + ' → ' + c.add + ' |';
}

// The places, found on the base lines; spliced from the bottom up so that the indexes stay right.
const own = new Set(m.runs.flatMap((r) => r.rows.map(([n]) => n)));
const plan = m.runs.map((run) => {
  const cand = lines.map((l, i) => { const t = rowNum(l); if (t !== null) return [t, i, 'table']; const h = headNum(l); return h !== null ? [h, i, 'heading'] : null; })
    .filter((x) => x && x[0] < run.first && !own.has(x[0]));
  const max = Math.max(...cand.map((x) => x[0]));
  const at = cand.filter((x) => x[0] === max);
  if (at.length !== 1) fail('run ' + run.first + ': ' + at.length + ' rows ' + max + ' (table or heading)');
  const [, idx, kind] = at[0];
  let pos, lead = [];
  if (kind === 'table') {
    const next = lines[idx + 1];
    if (next !== undefined && rowNum(next) === null) fail('run ' + run.first + ': the line after row ' + max + ' is not a table row');
    pos = idx + 1; lead = [''];
  } else {
    // the block of a heading row ends at the line before the first empty line that is followed by a "## #" heading, a table row or the end
    let end = idx;
    while (end + 1 < lines.length && !(lines[end + 1] === '' && (end + 2 >= lines.length || headNum(lines[end + 2]) !== null || rowNum(lines[end + 2]) !== null))) end++;
    if (end + 1 < lines.length) pos = end + 2; else { pos = lines.length; lead = ['']; }
  }
  const blocks = run.rows.map(([n, doc]) => {
    const b = sourceBlock(n, doc);
    const s = (m.statusLines || []).find((x) => x.row === n);
    if (s) {
      const k = b.map((l, i) => (l.startsWith('Status: ') ? i : -1)).filter((i) => i >= 0).pop();
      if (k === undefined) fail('row ' + n + ': no Status line');
      b[k] = b[k] + s.add;
    }
    return b;
  });
  const insert = [...lead];
  blocks.forEach((b, i) => { if (i) insert.push(''); insert.push(...b); });
  if (kind === 'table' || pos < lines.length) insert.push('');
  return { after: pos - 1, afterRow: max + ' (' + kind + ')', first: run.first, insert, pos };
}).sort((a, b) => b.pos - a.pos);
for (const p of plan) { lines.splice(p.pos, 0, ...p.insert); console.log('run ' + p.first + '…: after row ' + p.afterRow + ' (' + p.insert.length + ' lines)'); }

writeFileSync(decPath, lines.join('\n') + '\n');
console.log('inserted ' + m.runs.reduce((a, r) => a + r.rows.length, 0) + ' rows; extended ' + m.cells.length + ' cells and ' + (m.statusLines || []).length + ' status line(s)');
