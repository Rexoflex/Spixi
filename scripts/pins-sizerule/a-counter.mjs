/* ==== sizerule A — the line counter of scripts/size-lib.mjs on fixtures written in this file.
 *
 * WHAT THIS PIN IS: a behaviour pin. It imports scripts/size-lib.mjs and runs classifyCs / classifyWeb / physicalLines on small texts
 * held in this module, and countTree / countDelta on two commits of a temporary git repository (made with the git binary of the machine,
 * removed at the end). Each fixture line carries its expected kind and, for C#, its expected store flag; the rows compare them line by line.
 * Its limits: the fixtures are small and hand-written, so a real file can still hold a shape they do not (a preprocessor chain over a
 * partial class body, a string that nests an interpolation hole with a string inside, a script acorn cannot read); the real-tree numbers are
 * the size table the CI step prints, not this pin; the git rows need `git` on the PATH (without it they FAIL, never skip).
 * Rows: cs-kinds (kind per line) · cs-store (store flag per line) · cs-directives (the real directive lines) · cs-crlf-bom (CRLF, BOM,
 * a last line without a newline give the same kinds) · lines (physicalLines) · js / css / html (kind per line) · tree (countTree numbers) ·
 * delta (countDelta numbers) · generated (a linguist-generated file is left out of src).
 * Self-check: one token of size-lib.mjs changed in a copy of the tree (node scripts/run-pins.mjs --root <copy> pins-sizerule/a-counter) turns the row of that code red. */
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as pjoin, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/* one fixture line: [text, kind, store]; store defaults to true. kind: c = code, m = comment, b = blank */
const CS = [
  ['class T', 'c'], ['{', 'c'], ['    void M()', 'c'], ['    {', 'c'],
  ['        // a line comment', 'm'],
  ['        /// <summary>a doc comment</summary>', 'm'],
  ['        /* a block comment', 'm'],
  ['', 'b'],
  ['           still inside the block */', 'm'],
  ['        int a = 1; // code, then a trailing comment', 'c'],
  ['        int b = 2; /* code, then a block */', 'c'],
  ['        string s1 = "// not a comment";', 'c'],
  ['        string s2 = "/* not a comment */";', 'c'],
  ['        string s3 = @"// verbatim /* still text";', 'c'],
  ['        string s4 = """// raw /* text""";', 'c'],
  ['        string s5 = $"// {a} /* text";', 'c'],
  ['        string s6 = @"first line', 'c'],
  ['', 'b'],
  ['// text of the verbatim string, not a comment', 'c'],
  ['#if DEBUG inside the string, not a directive";', 'c'],
  ['        string s7 = """', 'c'],
  ['            // raw string body', 'c'],
  ['            """;', 'c'],
  ['#if DEBUG', 'c'],
  ['        int dbg = 1;', 'c', false],
  ['#elif SPIXI_DEV_COEXIST', 'c'],
  ['        int coexist = 1;', 'c', false],
  ['#else', 'c'],
  ['        int other = 1;', 'c'],
  ['#endif', 'c'],
  ['#if ANDROID', 'c'],
  ['        int android = 1;', 'c'],
  ['#else', 'c'],
  ['        int notAndroid = 1;', 'c'],
  ['#endif', 'c'],
  ['#if !DEBUG', 'c'],
  ['        int notDebug = 1;', 'c'],
  ['#else', 'c'],
  ['        int debugElse = 1;', 'c', false],
  ['#endif', 'c'],
  ['#if SPIXI_DEV_COEXIST || true', 'c'],
  ['        int orTrue = 1;', 'c'],
  ['#else', 'c'],
  ['        int orTrueElse = 1;', 'c', false],
  ['#endif', 'c'],
  ['#if SPIXI_CSH', 'c'],
  ['        int csh = 1;', 'c', false],
  ['#if ANDROID', 'c'],
  ['        int nestedInOff = 1;', 'c', false],
  ['#endif', 'c'],
  ['#endif', 'c'],
  ['#if DEBUG || ANDROID', 'c'],
  ['        int debugOrAndroid = 1;', 'c'],
  ['#endif', 'c'],
  ['#if DEBUG && ANDROID', 'c'],
  ['        int debugAndAndroid = 1;', 'c', false],
  ['#endif', 'c'],
  ['#if ANDROID', 'c'],
  ['#if DEBUG', 'c'],
  ['        int debugInAndroid = 1;', 'c', false],
  ['#else', 'c'],
  ['        int notDebugInAndroid = 1;', 'c'],
  ['#endif', 'c'],
  ['#endif', 'c'],
  ['#if SPIXI_CSH', 'c'],
  ['        int cshOnly = 1;', 'c', false],
  ['#elif ANDROID', 'c'],
  ['        int androidElif = 1;', 'c'],
  ['#else', 'c'],
  ['        int elseAfterUnknown = 1;', 'c'],
  ['#endif', 'c'],
  ['    }', 'c'], ['}', 'c'],
];
const REAL_DIRECTIVES = CS.map((l, i) => [l[0], i + 1]).filter(([t, n]) => /^#(if|elif|else|endif)\b/.test(t) && n !== 20).map(([, n]) => n);   // line 20 is text inside a string

const JS = [
  ['// a line comment', 'm'], ['/* a block', 'm'], ['', 'b'], ['   end */', 'm'],
  ['var a = 1; // trailing', 'c'], ['var s = "// not a comment";', 'c'], ["var t = '/* not */';", 'c'],
  ['var u = `template // text', 'c'], ['', 'b'], ['  /* still the template */ ${a}`;', 'c'],
  ['var re = /\\/\\/x/;', 'c'], ['function f() { return 1; }', 'c'],
];
const CSS = [
  ['/* a comment */', 'm'], ['.a { color: red; } /* trailing */', 'c'], ['/* block', 'm'], ['', 'b'], ['   end */', 'm'],
  ['.b::after { content: "/* not a comment */"; }', 'c'], ["  .c { background: url('//x/y.png'); }", 'c'], ['', 'b'],
];
const HTML = [
  ['<!DOCTYPE html>', 'c'], ['<!-- a comment -->', 'm'], ['<html>', 'c'], ['<head>', 'c'],
  ['<style>', 'c'], ['/* css comment */', 'm'], ['.a { color: red; }', 'c'], ['</style>', 'c'],
  ['<script>', 'c'], ['// js comment', 'm'], ['var x = 1; /* trailing */', 'c'], ['</script>', 'c'],
  ['</head>', 'c'], ['<body>', 'c'], ['<!-- multi', 'm'], ['', 'b'], ['line -->', 'm'], ['<p>text <!-- inline --></p>', 'c'], ['</body>', 'c'], ['</html>', 'c'],
];
const KIND = { c: 'code', m: 'comment', b: 'blank' };

export default async function ({ ok, root }) {
  const lib = await import(pathToFileURL(pjoin(root, 'scripts', 'size-lib.mjs')).href);
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const diffAt = (got, want, rows) => { const i = want.findIndex((w, k) => got[k] !== w); return i < 0 ? (got.length === want.length ? '' : 'length ' + got.length + ' / ' + want.length) : 'line ' + (i + 1) + ' (' + JSON.stringify(rows[i][0]).slice(0, 50) + '): got ' + got[i] + ', want ' + want[i]; };
  const text = (rows, nl = '\n', last = '\n') => rows.map((r) => r[0]).join(nl) + last;

  /* ---- C# ---- */
  const cs = lib.classifyCs(text(CS));
  const wantKinds = CS.map((r) => KIND[r[1]]); const wantStore = CS.map((r) => r[2] !== false);
  ok(cs.kinds.length === CS.length && cs.kinds.every((k, i) => k === wantKinds[i]), 'SIZERULE-A cs-kinds: every fixture line has its expected kind (' + CS.length + ' lines) ' + diffAt(cs.kinds, wantKinds, CS));
  ok(cs.store.length === CS.length && cs.store.every((s, i) => s === wantStore[i]), 'SIZERULE-A cs-store: every fixture line has its expected store flag (DEBUG / SPIXI_DEV_COEXIST / SPIXI_CSH false, ANDROID unknown) ' + diffAt(cs.store, wantStore, CS));
  ok(eq(cs.directives, REAL_DIRECTIVES) && cs.directives.length > 20, 'SIZERULE-A cs-directives: the real directive lines (' + REAL_DIRECTIVES.length + ' of them), not a `#if` inside a string: ' + cs.directives.length);
  ok(cs.parseErrors === 0, 'SIZERULE-A cs-parse: the C# fixture parses without an error node (' + cs.parseErrors + ')');
  const crlf = lib.classifyCs('﻿' + text(CS, '\r\n', ''));
  ok(eq(crlf.kinds, cs.kinds) && eq(crlf.store, cs.store) && eq(crlf.directives, cs.directives), 'SIZERULE-A cs-crlf-bom: a BOM, CRLF line ends and no final newline give the same kinds, store flags and directives');

  /* ---- physical lines ---- */
  const pl = lib.physicalLines;
  ok(pl('a\nb\nc\n') === 3 && pl('a\nb\nc') === 3 && pl('a\r\nb\r\nc\r\n') === 3 && pl('﻿a\r\nb') === 2 && pl('') === 0 && pl('\n') === 1 && pl('a\n\n') === 2,
    'SIZERULE-A lines: physicalLines counts "a\\nb\\nc\\n" and "a\\nb\\nc" as 3, CRLF as LF, drops a BOM, "" is 0, "\\n" is 1, "a\\n\\n" is 2 (' + [pl('a\nb\nc\n'), pl('a\nb\nc'), pl('a\r\nb\r\nc\r\n'), pl('﻿a\r\nb'), pl(''), pl('\n'), pl('a\n\n')].join(',') + ')');
  ok(cs.kinds.length === pl(text(CS)) && lib.classifyCs(text(CS, '\n', '')).kinds.length === CS.length, 'SIZERULE-A lines: the classifier length equals physicalLines, with and without the final newline');

  /* ---- web ---- */
  for (const [name, rows, ext] of [['js', JS, '.js'], ['css', CSS, '.css'], ['html', HTML, '.html']]) {
    const r = lib.classifyWeb(text(rows), ext); const want = rows.map((x) => KIND[x[1]]);
    ok(r.kinds.length === rows.length && r.kinds.every((k, i) => k === want[i]), 'SIZERULE-A ' + name + ': every fixture line has its expected kind (' + rows.length + ' lines) ' + diffAt(r.kinds, want, rows));
  }
  const mjs = lib.classifyWeb('// c\nexport const a = 1;\n', '.mjs');
  ok(eq(mjs.kinds, ['comment', 'code']) && mjs.fallback === false, 'SIZERULE-A js: an .mjs module is read by the parser (no fallback)');

  /* ---- a temp repository with two commits: countTree and countDelta ---- */
  const dir = mkdtempSync(pjoin(tmpdir(), 'sizerule-a-'));
  try {
    const git = (...a) => { const r = spawnSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'commit.gpgsign=false', ...a], { encoding: 'utf8' }); if (r.status !== 0) throw new Error('git ' + a.join(' ') + ': ' + (r.stderr || r.error)); return r.stdout.trim(); };
    const put = (rel, body) => { const p = pjoin(dir, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, body); };
    git('init', '-q', '-b', 'main');
    put('Spixi/One.cs', ['// comment', 'class One', '{', '', '    static string K = "x";', '#if DEBUG', '    int dbg = 1;', '#endif', '    string Key = "flagAlpha";', '}', ''].join('\n'));
    put('Spixi/Platforms/MacCatalyst/RocksDbSharp/Vendored.cs', 'class V { }\n');
    put('src/a.js', '// c\nvar a = 1;\n\nvar b = 2;\n');
    put('src/gen.js', 'var generated = 1;\nvar g2 = 2;\n');
    put('src/style.css', '/* c */\n.a { color: red; }\n');
    put('.gitattributes', 'src/gen.js linguist-generated\n');
    put('README.md', 'not counted\n');
    git('add', '-A'); git('commit', '-q', '-m', 'first');
    put('Spixi/One.cs', ['// comment', '// one more', 'class One', '{', '', '    static string K = "x";', '#if DEBUG', '    int dbg = 1;', '#endif', '    string Key = "flagAlpha";', '    string Key2 = "flagBeta";', '    string BetaKey = "flagBeta";', '    int more = 2;', '}', ''].join('\n'));
    put('Spixi/Two.cs', 'class Two { }\n');
    put('src/a.js', '// c\nvar a = 1;\nvar b = 2;\nvar c = 3;\n');
    git('add', '-A'); git('commit', '-q', '-m', 'second');
    const t1 = lib.countTree(dir, 'HEAD^'); const t2 = lib.countTree(dir, 'HEAD');
    const a1 = t1.app; const a2 = t2.app;
    ok(a1.files === 1 && a1.code === 8 && a1.comment === 1 && a1.blank === 1 && a1.store === 7 && a1.switches === 1 && a1.over1500.length === 0,
      'SIZERULE-A tree: the first commit counts 1 app C# file (the vendored RocksDbSharp file left out), 8 code, 1 comment, 1 blank lines, 7 in a store build, 1 switch: ' + JSON.stringify({ f: a1.files, c: a1.code, m: a1.comment, b: a1.blank, s: a1.store, sw: a1.switches }));
    ok(t1.src.files === 2 && t1.src.code === 3 && t1.src.comment === 2 && t1.src.blank === 1, 'SIZERULE-A tree: src counts the hand-written files only (gen.js is linguist-generated, README is no web file): 2 files, 3 code, 2 comment, 1 blank: ' + JSON.stringify(t1.src));
    ok(a2.files === 2 && a2.code === 12 && a2.comment === 2 && a2.blank === 1 && a2.store === 11 && a2.switches === 2,
      'SIZERULE-A tree: the second commit counts 2 app C# files, 12 code, 2 comment, 1 blank lines, 11 in a store build, 2 switches (`Key2 =` is not a switch key, `BetaKey =` is): ' + JSON.stringify({ f: a2.files, c: a2.code, m: a2.comment, b: a2.blank, s: a2.store, sw: a2.switches }));
    const d = lib.countDelta(t1, t2);
    ok(d.app.files === 1 && d.app.code === 4 && d.app.comment === 1 && d.app.blank === 0 && d.app.store === 4 && d.app.switches === 1 && d.app.over1500Count === 0 && d.src.files === 0 && d.src.code === 1 && d.src.comment === 0 && d.src.blank === -1,
      'SIZERULE-A delta: countDelta gives app +1 file, +4 code, +1 comment, +4 store, +1 switch and src +1 code, -1 blank: ' + JSON.stringify({ app: [d.app.files, d.app.code, d.app.comment, d.app.blank, d.app.store, d.app.switches], src: [d.src.files, d.src.code, d.src.comment, d.src.blank] }));
    const same = lib.countDelta(t2, t2);
    ok([same.app.files, same.app.code, same.app.comment, same.app.blank, same.app.store, same.app.switches, same.src.code, same.src.comment, same.src.blank].every((n) => n === 0), 'SIZERULE-A delta: a tree against itself is all zero');
    const gen = lib.gitGenerated(dir, 'HEAD', ['src/a.js', 'src/gen.js']);
    ok(gen.has('src/gen.js') && !gen.has('src/a.js'), 'SIZERULE-A generated: gitGenerated names the linguist-generated file only');
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
