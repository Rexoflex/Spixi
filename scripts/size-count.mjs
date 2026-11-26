#!/usr/bin/env node
/* size-count — the size table of a tree, and the delta of two trees.
 *
 *   node scripts/size-count.mjs [--repo <dir>] [--rev <rev>]             one tree (default HEAD)
 *   node scripts/size-count.mjs [--repo <dir>] --base <rev> --head <rev>  both trees and the delta
 *   add --json for one JSON object instead of the table
 *
 * Reads only git objects (no work-tree file). App C# = Spixi/**\/*.cs without the vendored
 * RocksDbSharp folder; src = the hand-written .js .mjs .css .html under src/ (the files the
 * tree's .gitattributes marks linguist-generated or linguist-vendored are left out). The line
 * kinds, the store flag and the switch pattern are those of scripts/size-lib.mjs.
 * The delta compares the two TREES, not a commit range: for the size of what a branch brings,
 * --base must be the merge base of the branch (in CI the first parent of the merge commit is).
 * The budget number of a pull request is the delta of app C# code lines.
 * A file the lib cannot read (a UTF-16 byte order mark, a NUL byte, not UTF-8, a symlink, a
 * submodule) is listed and not counted; a C# file with `suspect` directive shapes is listed.
 * Exit 0; exit 2 on a usage or git error.
 */
import { countTree, countDelta, GitError, SWITCH_RE } from './size-lib.mjs';

const USAGE = [
  'usage: node scripts/size-count.mjs [--repo <dir>] [--rev <rev> | --base <rev> --head <rev>] [--json]',
  '  --base / --head: the delta of the two trees; give the merge base as --base for what a branch brings',
].join('\n');

function fail(msg) {
  process.stderr.write(`size-count: ${msg}\n${USAGE}\n`);
  process.exit(2);
}

function parseArgs(argv) {
  const o = { repo: '.', rev: null, base: null, head: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) fail(`${a} needs a value`);
      return v;
    };
    if (a === '--repo') o.repo = val();
    else if (a === '--rev') o.rev = val();
    else if (a === '--base') o.base = val();
    else if (a === '--head') o.head = val();
    else if (a === '--json') o.json = true;
    else if (a === '--help' || a === '-h') { process.stdout.write(USAGE + '\n'); process.exit(0); }
    else fail(`unknown argument: ${a}`);
  }
  if ((o.base === null) !== (o.head === null)) fail('--base and --head go together');
  if (o.rev !== null && o.base !== null) fail('--rev does not go with --base / --head');
  return o;
}

const fmt = (n) => n.toLocaleString('en-US');
const sgn = (n) => (n > 0 ? '+' : n < 0 ? '-' : '±') + fmt(Math.abs(n));
const pad = (s, w) => String(s).padStart(w);

function treeLines(t) {
  const a = t.app;
  const s = t.src;
  const out = [];
  out.push(`size of ${t.rev} (${t.commit.slice(0, 12)})`);
  out.push(`  app C#            files ${pad(fmt(a.files), 6)}   code ${pad(fmt(a.code), 7)}   comment ${pad(fmt(a.comment), 7)}   blank ${pad(fmt(a.blank), 6)}`);
  out.push(`                    store-compiled code ${fmt(a.store)}   switches ${fmt(a.switches)}   parse errors ${fmt(a.parseErrors)}`);
  out.push(`                    files over 1,500 lines: ${a.over1500.length}`);
  for (const f of a.over1500) out.push(`                      ${pad(fmt(f.lines), 7)}  ${f.path}`);
  for (const f of a.unreadableFiles) out.push(`                    not counted (unreadable: ${f.why}): ${f.path}`);
  for (const f of a.suspectFiles) {
    const where = f.suspect.map((x) => `${x.reason} at line ${x.line}`).join(', ');
    out.push(`                    suspect directive shapes: ${f.path}: ${where}`);
  }
  out.push(`  src hand-written  files ${pad(fmt(s.files), 6)}   code ${pad(fmt(s.code), 7)}   comment ${pad(fmt(s.comment), 7)}   blank ${pad(fmt(s.blank), 6)}`);
  if (s.fallbackFiles.length) out.push(`                    read by the fallback scanner: ${s.fallbackFiles.join(', ')}`);
  for (const f of s.unreadableFiles) out.push(`                    not counted (unreadable: ${f.why}): ${f.path}`);
  return out;
}

function deltaLines(d) {
  const a = d.app;
  const s = d.src;
  const out = [];
  out.push(`delta ${d.rev}`);
  out.push(`  app C#            files ${pad(sgn(a.files), 6)}   code ${pad(sgn(a.code), 7)}   comment ${pad(sgn(a.comment), 7)}   blank ${pad(sgn(a.blank), 6)}`);
  out.push(`                    store-compiled code ${sgn(a.store)}   switches ${sgn(a.switches)}`);
  out.push(`                    number of files over 1,500 lines: ${sgn(a.over1500Count)}`);
  const moved = a.over1500.filter((f) => !(f.lines === 0 && f.base > 0 && f.head > 0));
  if (moved.length) out.push('                    files over 1,500 lines on either side whose length changed (base -> head):');
  for (const f of a.over1500) {
    if (f.lines === 0 && f.base > 0 && f.head > 0) continue;
    out.push(`                      ${pad(sgn(f.lines), 7)}  ${f.path} (${fmt(f.base)} -> ${fmt(f.head)})`);
  }
  out.push(`  src hand-written  files ${pad(sgn(s.files), 6)}   code ${pad(sgn(s.code), 7)}   comment ${pad(sgn(s.comment), 7)}   blank ${pad(sgn(s.blank), 6)}`);
  out.push(`  budget number (app C# code lines): ${sgn(a.code)}`);
  return out;
}

const o = parseArgs(process.argv.slice(2));
let result;
try {
  if (o.base !== null) {
    const base = countTree(o.repo, o.base);
    const head = countTree(o.repo, o.head);
    result = { base, head, delta: countDelta(base, head) };
  } else {
    result = { tree: countTree(o.repo, o.rev ?? 'HEAD') };
  }
} catch (e) {
  if (e instanceof GitError) fail(e.message);
  process.stderr.write(`size-count: ${e && e.message ? e.message : e}\n`);
  process.exit(2);
}

if (o.json) {
  process.stdout.write(JSON.stringify({ switchPattern: SWITCH_RE.source, ...result }, null, 2) + '\n');
} else {
  const lines = result.tree
    ? treeLines(result.tree)
    : [...treeLines(result.base), '', ...treeLines(result.head), '', ...deltaLines(result.delta)];
  process.stdout.write(lines.join('\n') + '\n');
}
