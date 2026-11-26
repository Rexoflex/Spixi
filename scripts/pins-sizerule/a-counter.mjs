/* ==== sizerule A — the line counter of scripts/size-lib.mjs on fixtures written in this file.
 *
 * WHAT THIS PIN IS: a behaviour pin. It imports scripts/size-lib.mjs and runs classifyCs / classifyWeb / physicalLines on small texts
 * held in this module, and countTree / countDelta on two commits of a temporary git repository (made with the git binary of the machine,
 * removed at the end). Each fixture line carries its expected kind and, for C#, its expected store flag; the rows compare them line by line.
 * Its limits: the fixtures are small and hand-written, so a real file can still hold a shape they do not (a preprocessor chain over a
 * partial class body, a string that nests an interpolation hole with a string inside, a script acorn cannot read); the real-tree numbers are
 * the size table the CI step prints, not this pin; the git rows need `git` on the PATH (without it they FAIL, never skip).
 * Rows: cs-kinds (kind per line) · cs-store (store flag per line) · cs-directives (the real directive lines) · cs-suspect (the `suspect`
 * list of the sample and one text per reason) · cs-cond (the condition grammar: == != ( ) true false, #elif / #else after a branch that is
 * definitely true, an unreadable condition) · cs-define (#define / #undef set a symbol from that line on, the // tail of a directive is a
 * comment) · cs-crlf-bom (CRLF, BOM, a last line without a newline give the same kinds) · lines (physicalLines) · js / css / html (kind per
 * line, the <script> types) · tree (countTree numbers) · delta (countDelta numbers) · over1500 (the real base and head counts of a file
 * that crosses 1,500 lines, in the tree and in the delta) · unreadable (a NUL, UTF-16, non-UTF-8 or symlink blob is listed, not counted) ·
 * generated (a linguist-generated file is left out of src).
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
/* a flat C# text of conditions: [text, store]; every line is code. A line `int aN;` sits inside the branch above it */
const COND = [
  ['#if DEBUG == false', true], ['int a1;', true], ['#endif', true],
  ['#if DEBUG != false', true], ['int a2;', false], ['#endif', true],
  ['#if (DEBUG || SPIXI_CSH) && ANDROID', true], ['int a3;', false], ['#endif', true],
  ['#if (DEBUG || ANDROID) && !SPIXI_CSH', true], ['int a4;', true], ['#endif', true],
  ['#if false', true], ['int a5;', false], ['#else', true], ['int a6;', true], ['#endif', true],
  ['#if true', true], ['int a7;', true], ['#else', true], ['int a8;', false], ['#endif', true],
  ['#if !DEBUG', true], ['int a9;', true], ['#elif ANDROID', true], ['int a10;', false], ['#else', true], ['int a11;', false], ['#endif', true],
  ['#if (DEBUG', true], ['int a12;', true], ['#endif', true],
  ['#if DEBUG ?? ANDROID', true], ['int a13;', true], ['#endif', true],
  ['#if ANDROID == ANDROID', true], ['int a14;', true], ['#endif', true],
  ['#if ANDROID != true', true], ['int a15;', true], ['#else', true], ['int a16;', true], ['#endif', true],
  ['#if DEBUG == SPIXI_CSH', true], ['int a17;', true], ['#else', true], ['int a18;', false], ['#endif', true],
  ['#if !(DEBUG || SPIXI_CSH)', true], ['int a19;', true], ['#else', true], ['int a20;', false], ['#endif', true],
];
/* #define / #undef at the top of a file set the symbol from that line on */
const DEFINES = [
  ['#define DEBUG', true], ['#if DEBUG', true], ['int a;', true], ['#else', true], ['int b;', false], ['#endif', true],
  ['#undef DEBUG', true], ['#if DEBUG', true], ['int c;', false], ['#endif', true],
  ['#define SPIXI_CSH // a tail', true], ['#if SPIXI_CSH', true], ['int d;', true], ['#endif', true],
  ['#undef ANDROID', true], ['#if ANDROID', true], ['int e;', false], ['#endif', true],
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
  ok(eq(cs.suspect, [{ line: 20, reason: 'string-over-directive' }]), 'SIZERULE-A cs-suspect: the sample holds one suspect, the `#if DEBUG` text at the start of line 20 inside a verbatim string (' + JSON.stringify(cs.suspect) + ')');
  ok(cs.parseErrors === 0, 'SIZERULE-A cs-parse: the C# fixture parses without an error node (' + cs.parseErrors + ')');
  const crlf = lib.classifyCs('﻿' + text(CS, '\r\n', ''));
  ok(eq(crlf.kinds, cs.kinds) && eq(crlf.store, cs.store) && eq(crlf.directives, cs.directives) && eq(crlf.suspect, cs.suspect), 'SIZERULE-A cs-crlf-bom: a BOM, CRLF line ends and no final newline give the same kinds, store flags, directives and suspects (CRLF is not a line-separator suspect)');

  /* ---- the suspect reasons: one text each; a plain text has none ---- */
  const wrap = (b) => 'namespace X\n{\nclass A\n{\nvoid F()\n{\n' + b + '\n}\n}\n}\n';   // the body starts on line 7
  const SUS = [
    ['comment-over-directive', wrap('/*\n#if DEBUG\n*/\nint q = 1;'), 8], ['string-over-directive', wrap('var s = @"\n#if DEBUG\n";'), 8],
    ['block-comment-on-directive', wrap('#if DEBUG /* x */\nint q = 1;\n#endif'), 7], ['directive-continuation', wrap('#if DEBUG \\\nint q = 1;\n#endif'), 7],
    ['define-name', '#define SPIXI_DEV\\u005FCOEXIST\n' + wrap('int q = 1;'), 1], ['line-separator', wrap('int q = 1;\rint r = 2;'), 7],
    ['line-separator', wrap('int q = 1; int r = 2;'), 7], ['define-name', '#define\n' + wrap('int q = 1;'), 1],
  ];
  const susGot = SUS.map(([, tx]) => lib.classifyCs(tx).suspect.map((s) => s.reason + '@' + s.line).join('+'));
  ok(SUS.every(([reason, , line], i) => susGot[i] === reason + '@' + line), 'SIZERULE-A cs-suspect: each reason (comment-over-directive, string-over-directive, block-comment-on-directive, directive-continuation, define-name, line-separator) is reported once with its line: ' + susGot.join(' '));
  const plain = wrap('int q = 1;\n#if DEBUG\nint w;\n#endif');
  ok(lib.classifyCs(plain).suspect.length === 0 && lib.classifyCs(plain.replace(/\n/g, '\r\n')).suspect.length === 0, 'SIZERULE-A cs-suspect: a plain text, LF or CRLF, has no suspect');
  ok(lib.classifyCs('#define SPIXI_DEV\\u005FCOEXIST\n#if SPIXI_DEV_COEXIST\nint x;\n#endif\n').store.every(Boolean) && lib.classifyCs('#if SPIXI_DEV_COEXIST\nint x;\n#endif\n').store[1] === false,
    'SIZERULE-A cs-suspect: a #define with an escaped name makes the store symbols unknown from that line on (store true everywhere); the same #if alone is false');

  /* ---- the condition grammar and #define / #undef ---- */
  const cond = lib.classifyCs(COND.map((r) => r[0]).join('\n') + '\n'); const wantCond = COND.map((r) => r[1]);
  ok(cond.store.length === COND.length && cond.store.every((s, i) => s === wantCond[i]), 'SIZERULE-A cs-cond: == != ( ) true false, #elif and #else after a branch that is definitely true, an unreadable condition is unknown and kept ' + diffAt(cond.store, wantCond, COND));
  const def = lib.classifyCs(DEFINES.map((r) => r[0]).join('\n') + '\n'); const wantDef = DEFINES.map((r) => r[1]);
  ok(def.store.length === DEFINES.length && def.store.every((s, i) => s === wantDef[i]) && def.suspect.length === 0, 'SIZERULE-A cs-define: #define sets a symbol from that line on, #undef clears it ' + diffAt(def.store, wantDef, DEFINES));
  ok(def.comments[10] === '// a tail' && def.kinds[10] === 'code' && !/tail/.test(def.codeText[10]) && def.codeText[10].length === DEFINES[10][0].length, 'SIZERULE-A cs-define: the // tail of a #define line is comment text, its code part is blanked with the columns kept: ' + JSON.stringify([def.comments[10], def.codeText[10]]));

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

  /* <script> is JavaScript when its type is absent, empty, module or a JavaScript MIME type (parameters and letter case ignored) */
  const scriptKinds = (ty) => lib.classifyWeb('<script' + ty + '>\n// c\nvar a = 1;\n</script>\n', '.html').kinds.join(',');
  const jsTypes = ['', ' type=""', ' type="module"', ' type="text/javascript; charset=utf-8"', ' type="TEXT/JavaScript"', ' type="application/ecmascript"'];
  ok(jsTypes.every((ty) => scriptKinds(ty) === 'code,comment,code,code') && scriptKinds(' type="text/babel"') === 'code,code,code,code' && scriptKinds(' type="application/json"') === 'code,code,code,code',
    'SIZERULE-A html: a <script> with no type, an empty type, module or a JavaScript MIME type is read as JavaScript (its // line is a comment); text/babel and application/json are data (code)');

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

  /* ---- a file that crosses 1,500 lines: the real base and head counts ---- */
  const dir2 = mkdtempSync(pjoin(tmpdir(), 'sizerule-a2-'));
  try {
    const g2 = (...a) => { const r = spawnSync('git', ['-C', dir2, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'commit.gpgsign=false', ...a], { encoding: 'utf8' }); if (r.status !== 0) throw new Error('git ' + a.join(' ') + ': ' + (r.stderr || r.error)); return r.stdout.trim(); };
    const bigFile = (lines) => 'class Big\n{\n' + Array.from({ length: lines - 3 }, (_, i) => '    int f' + i + ' = ' + i + ';\n').join('') + '}\n';
    mkdirSync(pjoin(dir2, 'Spixi'), { recursive: true });
    g2('init', '-q', '-b', 'main');
    writeFileSync(pjoin(dir2, 'Spixi/Big.cs'), bigFile(1400)); writeFileSync(pjoin(dir2, 'Spixi/Other.cs'), bigFile(1600)); writeFileSync(pjoin(dir2, 'Spixi/Small.cs'), bigFile(10));
    g2('add', '-A'); g2('commit', '-q', '-m', 'first');
    writeFileSync(pjoin(dir2, 'Spixi/Big.cs'), bigFile(1501)); writeFileSync(pjoin(dir2, 'Spixi/Other.cs'), bigFile(1550));
    g2('add', '-A'); g2('commit', '-q', '-m', 'second');
    const b1 = lib.countTree(dir2, 'HEAD^'); const b2 = lib.countTree(dir2, 'HEAD');
    ok(eq(b1.app.lines, { 'Spixi/Big.cs': 1400, 'Spixi/Other.cs': 1600, 'Spixi/Small.cs': 10 }) && eq(b2.app.lines, { 'Spixi/Big.cs': 1501, 'Spixi/Other.cs': 1550, 'Spixi/Small.cs': 10 }),
      'SIZERULE-A over1500: countTree keeps the physical line count of every app C# file (app.lines): ' + JSON.stringify(b2.app.lines));
    ok(eq(b1.app.over1500, [{ path: 'Spixi/Other.cs', lines: 1600 }]) && eq(b2.app.over1500, [{ path: 'Spixi/Big.cs', lines: 1501 }, { path: 'Spixi/Other.cs', lines: 1550 }].sort((x, y) => y.lines - x.lines)),
      'SIZERULE-A over1500: countTree lists the files over 1,500 lines, largest first: ' + JSON.stringify([b1.app.over1500, b2.app.over1500]));
    const dd = lib.countDelta(b1, b2); const rowOf = (pth) => dd.app.over1500.find((x) => x.path === pth);
    ok(eq(rowOf('Spixi/Big.cs'), { path: 'Spixi/Big.cs', lines: 101, base: 1400, head: 1501 }) && eq(rowOf('Spixi/Other.cs'), { path: 'Spixi/Other.cs', lines: -50, base: 1600, head: 1550 }) && dd.app.over1500.length === 2 && dd.app.over1500Count === 1,
      'SIZERULE-A over1500: countDelta gives the real base and head counts (a file under the limit on one side keeps its count, not 0) and the count of files over the limit +1: ' + JSON.stringify(dd.app.over1500));
  } finally { rmSync(dir2, { recursive: true, force: true }); }

  /* ---- blobs that cannot be read as text are listed with the reason and left out of the counts ---- */
  const dir3 = mkdtempSync(pjoin(tmpdir(), 'sizerule-a3-'));
  try {
    const g3 = (input, ...a) => { const r = spawnSync('git', ['-C', dir3, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'commit.gpgsign=false', ...a], { encoding: 'utf8', input }); if (r.status !== 0) throw new Error('git ' + a.join(' ') + ': ' + (r.stderr || r.error)); return r.stdout.trim(); };
    mkdirSync(pjoin(dir3, 'Spixi'), { recursive: true }); mkdirSync(pjoin(dir3, 'src'), { recursive: true });
    g3(undefined, 'init', '-q', '-b', 'main');
    writeFileSync(pjoin(dir3, 'Spixi/Ok.cs'), 'class Ok { }\n');
    writeFileSync(pjoin(dir3, 'Spixi/Nul.cs'), 'class N { }\n\u0000\n');
    writeFileSync(pjoin(dir3, 'Spixi/U16.cs'), Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('class U { }\n', 'utf16le')]));
    writeFileSync(pjoin(dir3, 'Spixi/Latin.cs'), Buffer.from([0x2f, 0x2f, 0x20, 0xe9, 0x0a]));
    writeFileSync(pjoin(dir3, 'src/ok.js'), 'var a = 1;\n');
    writeFileSync(pjoin(dir3, 'src/nul.js'), 'var a = 1;\u0000\n');
    g3(undefined, 'add', '-A');
    const blob = g3('../ok.cs', 'hash-object', '-w', '--stdin');   // a symlink is a blob of mode 120000 holding the target path
    g3(undefined, 'update-index', '--add', '--cacheinfo', '120000,' + blob + ',Spixi/Link.cs');
    g3(undefined, 'commit', '-q', '-m', 'only');
    const fs = lib.gitFiles(dir3, 'HEAD', () => true); const why = Object.fromEntries(fs.filter((f) => f.unreadable).map((f) => [f.path, f.unreadable]).sort());
    ok(eq(why, { 'Spixi/Latin.cs': 'not valid UTF-8', 'Spixi/Link.cs': 'symlink', 'Spixi/Nul.cs': 'NUL byte', 'Spixi/U16.cs': 'UTF-16 byte order mark', 'src/nul.js': 'NUL byte' }) && !fs.find((f) => f.path === 'Spixi/Ok.cs').unreadable,
      'SIZERULE-A unreadable: gitFiles marks a NUL, UTF-16, non-UTF-8 blob and a symlink with its reason, and leaves a plain file unmarked: ' + JSON.stringify(why));
    const tu = lib.countTree(dir3, 'HEAD');
    ok(tu.app.files === 1 && tu.app.code === 1 && tu.src.files === 1 && tu.app.unreadableFiles.length === 4 && tu.src.unreadableFiles.length === 1 && eq(Object.keys(tu.app.lines), ['Spixi/Ok.cs']),
      'SIZERULE-A unreadable: countTree counts the readable files only and lists the others (app ' + tu.app.unreadableFiles.length + ', src ' + tu.src.unreadableFiles.length + '): ' + JSON.stringify(tu.app.unreadableFiles.map((u) => u.path)));
  } finally { rmSync(dir3, { recursive: true, force: true }); }
}
