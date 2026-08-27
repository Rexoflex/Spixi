#!/usr/bin/env node
/* ★ #459 — a REAL syntax gate for the C# half.
 *
 * Six batches have shipped C# that was verified by reading it and by counting braces
 * against HEAD, because the cloud container has no .NET toolchain. The handoff calls
 * that "the single biggest risk in this batch", and it is right: brace counting cannot
 * see a misplaced `}`, a dangling `else`, a half-applied edit that still balances, or a
 * missing semicolon.
 *
 * tree-sitter-c-sharp parses the real grammar and reports ERROR and MISSING nodes. That
 * catches the whole malformed-edit class in about a second.
 *
 * ⚠ WHAT THIS IS NOT: a type checker. It does not know about usings, namespaces,
 * overload resolution or nullability. A file can pass here and fail to compile. Damir's
 * build stays the compile gate — this one just stops a broken edit from ever reaching it.
 *
 *   npm install --no-save tree-sitter tree-sitter-c-sharp
 *   node scripts/cs-syntax-check.mjs                 # every .cs under Spixi/
 *   node scripts/cs-syntax-check.mjs <file> [...]    # named files
 *
 * Skips LOUDLY and exits 0 when the parser is absent (the jsdom pattern) — a gate that
 * fails the run because a dev tool is missing gets deleted, and then there is no gate.
 *
 * ⚠ ONE KNOWN GRAMMAR GAP, named rather than hidden. The parser predates C# 14, so it
 * rejects NULL-CONDITIONAL ASSIGNMENT (`a?.b = 0;`), which .NET 10 accepts and this tree
 * uses. Files that rely on it are listed in GRAMMAR_GAPS with the construct that trips
 * it. They are reported, not silently ignored — and if that list ever needs a file YOU
 * just edited, check the construct before adding it.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let Parser, CSharp;
try {
  Parser = (await import('tree-sitter')).default;
  CSharp = (await import('tree-sitter-c-sharp')).default;
} catch {
  console.log('cs-syntax-check: SKIPPED — tree-sitter not installed.');
  console.log('  npm install --no-save tree-sitter tree-sitter-c-sharp');
  process.exit(0);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'obj' || name === 'bin' || name === 'node_modules' || name === '.git') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.cs')) out.push(p);
  }
  return out;
}

const args = process.argv.slice(2);
const files = args.length ? args : walk(join(root, 'Spixi'));

const parser = new Parser();
parser.setLanguage(CSharp);

/* path suffix → the construct the parser cannot read. Verified minimally:
   `class A { void M() { o?.p = 0; } }` → 2 ERROR nodes; without the `?` → clean. */
const GRAMMAR_GAPS = {
  'Spixi/Meta/SpixiTransactionInclusionCallbacks.cs': 'C# 14 null-conditional assignment (`balances.TryGet(...)?.lastUpdate = 0`)',
};

let bad = 0;
const skipped = [];
for (const f of files) {
  let src;
  try { src = readFileSync(f, 'utf8'); } catch (e) { console.log(`? ${f} — ${e.message}`); bad++; continue; }
  if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);   // BOM: every file in this tree has one
  const errs = [];
  (function visit(n) {
    if (n.type === 'ERROR' || n.isMissing) {
      errs.push(`${n.isMissing ? 'MISSING ' : 'ERROR '}${n.type} at line ${n.startPosition.row + 1}`);
    }
    for (let i = 0; i < n.childCount; i++) visit(n.child(i));
  })(parser.parse(src).rootNode);
  if (errs.length) {
    const rel = relative(root, f).split('\\').join('/');
    const gap = Object.keys(GRAMMAR_GAPS).find((k) => rel.endsWith(k));
    if (gap) { skipped.push(`${rel} — ${GRAMMAR_GAPS[gap]}`); continue; }
    bad++;
    console.log(`✗ ${relative(root, f)}`);
    for (const e of errs.slice(0, 12)) console.log('    ' + e);
    if (errs.length > 12) console.log(`    … ${errs.length - 12} more`);
  }
}

/* ═══ ★★ THE MEMBER-CONTEXT GATE (#648) ══════════════════════════════════════
 *
 * ⚠ WRITTEN BECAUSE THIS SCRIPT SAID "140 file(s) parse cleanly" ON A TREE THAT
 * DID NOT COMPILE. A helper was inserted INSIDE a method body instead of at class
 * level; tree-sitter accepted it, because a LOCAL FUNCTION is legal C# and this
 * grammar tolerates the illegal access modifier on one. `dotnet build` answered
 * with four CS1513/CS1519 errors and Damir's Android build died in nine seconds.
 *
 * That is #593 stated exactly — this gate PARSES, it does not COMPILE — and the
 * honest answer to a gate that cannot see a whole class of error is to add the
 * check it can do. This one tracks WHAT OPENED each enclosing brace, so an access
 * modifier is only legal when its parent is a type rather than a method body.
 * It is not a compiler. It closes one hole, and it is mutation-proven against the
 * exact file that broke. */
function memberContextCheck(fileList) {
  let bad = 0;
  const TYPE_OPENER = /\b(class|struct|interface|record|enum|namespace)\b/;
for (const f of fileList) {
  const src = readFileSync(f, 'utf8');
  const lines = src.split('\n');
  const stack = [];            // what opened each open brace
  let s = 0, ch = 0, lc = 0, bc = 0, vb = 0;
  for (let li = 0; li < lines.length; li++) {
    const raw = lines[li];
    // a member declaration is judged against the stack BEFORE this line's braces
    const m = /^\s*(?:\[[^\]]*\]\s*)?(public|private|protected|internal)\s+(.*)$/.exec(raw);
    if (m && !TYPE_OPENER.test(m[2]) && stack.length) {
      const parent = stack[stack.length - 1];
      if (!TYPE_OPENER.test(parent)) {
        console.log(`${relative(root, f)}:${li + 1}  ACCESS MODIFIER inside a non-type body — parent opened by: ${parent.trim().slice(0, 70)}`);
        console.log(`         ${raw.trim().slice(0, 90)}`);
        bad++;
      }
    }
    lc = 0;
    for (let k = 0; k < raw.length; k++) {
      const c = raw[k], n = raw[k + 1];
      if (lc) break;
      if (bc) { if (c === '*' && n === '/') { bc = 0; k++; } continue; }
      if (vb) { if (c === '"') { if (n === '"') k++; else vb = 0; } continue; }
      if (s) { if (c === '\\') k++; else if (c === '"') s = 0; continue; }
      if (ch) { if (c === '\\') k++; else if (c === "'") ch = 0; continue; }
      if (c === '/' && n === '/') { lc = 1; break; }
      if (c === '/' && n === '*') { bc = 1; k++; continue; }
      if (c === '@' && n === '"') { vb = 1; k++; continue; }
      if (c === '"') { s = 1; continue; }
      if (c === "'") { ch = 1; continue; }
      if (c === '{') {
        /* The opener is this line's head — but a type declaration can be SPLIT over
           several lines (`class X : Base,` / `    IInterface` / `{`), and taking only
           the nearest non-blank line lands on the continuation, which carries no
           `class` keyword. Walk back until a type keyword is found or a statement
           terminator proves this is not a declaration at all. */
        let o = raw.slice(0, k).trim();
        for (let b = li - 1; b >= 0 && b > li - 6; b--) {
          if (TYPE_OPENER.test(o)) break;
          const prev = lines[b].trim();
          if (!prev) { if (!o) continue; else break; }
          if (/[;}]$/.test(prev)) break;
          o = prev + ' ' + o;
        }
        stack.push(o);
      } else if (c === '}') stack.pop();
    }
  }
}
  return bad;
}

const misplaced = memberContextCheck(files);
if (misplaced) {
  console.error(`\ncs-syntax-check: ${misplaced} member(s) declared inside a non-type body — this PARSES but will NOT compile.`);
  process.exit(1);
}

for (const s of skipped) console.log(`~ ${s}`);
if (bad) {
  console.error(`\ncs-syntax-check: ${bad} file(s) do not parse.`);
  process.exit(1);
}
console.log(`cs-syntax-check: ${files.length - skipped.length} file(s) parse cleanly ✓`
  + (skipped.length ? ` · ${skipped.length} skipped for a known grammar gap` : ''));
