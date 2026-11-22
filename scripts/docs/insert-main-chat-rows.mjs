#!/usr/bin/env node
// Use: node scripts/docs/insert-main-chat-rows.mjs <folder with the project docs claude/talk-rulings-*.md> [manifest]
//
// Session docsb (DECISIONS 1890): inserts the main chat's rows into DECISIONS.md word for word and extends the
// status cells that the manifest lists. A row = the heading block "## #<n> ..." of its project doc, from the heading
// line up to the line before the next "## " heading (trailing empty lines dropped), byte for byte. A run of rows goes
// right after the highest TABLE row of the file with a lower number than the run's first row, with one empty line
// before the run, one between two rows and one after the run: the separation that a heading block needs between
// lines of the table (without it Markdown joins the next line to the block). Nothing else is added.
// A status cell is extended by " → <text>" before its closing " |" (the old text is kept, 215).
// The script refuses a tree that already holds one of the rows. Proof: compare-main-chat-rows.mjs.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const srcDir = process.argv[2];
const manifestPath = process.argv[3] || join(root, 'scripts', 'docs', 'main-chat-rows-2026-11-22.json');
if (!srcDir) { console.error('Use: node scripts/docs/insert-main-chat-rows.mjs <folder with the talk-rulings docs> [manifest]'); process.exit(2); }
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
const plan = m.runs.map((run) => {
  const below = lines.map((l, i) => [rowNum(l), i]).filter(([n]) => n !== null && n < run.first);
  const max = Math.max(...below.map(([n]) => n));
  const at = below.filter(([n]) => n === max).map(([, i]) => i);
  if (at.length !== 1) fail('run ' + run.first + ': ' + at.length + ' table rows ' + max);
  const next = lines[at[0] + 1];
  if (next !== undefined && rowNum(next) === null) fail('run ' + run.first + ': the line after row ' + max + ' is not a table row');
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
  const insert = [''];
  blocks.forEach((b, i) => { if (i) insert.push(''); insert.push(...b); });
  insert.push('');
  return { after: at[0], afterRow: max, first: run.first, insert };
}).sort((a, b) => b.after - a.after);
for (const p of plan) { lines.splice(p.after + 1, 0, ...p.insert); console.log('run ' + p.first + '…: after row ' + p.afterRow + ' (' + p.insert.length + ' lines)'); }

writeFileSync(decPath, lines.join('\n') + '\n');
console.log('inserted ' + m.runs.reduce((a, r) => a + r.rows.length, 0) + ' rows; extended ' + m.cells.length + ' cells and ' + (m.statusLines || []).length + ' status line(s)');
