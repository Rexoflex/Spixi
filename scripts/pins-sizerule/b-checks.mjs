/* ==== sizerule B — the three checks R2 / R5 / R6 of scripts/size-check.mjs on temporary git repositories.
 *
 * WHAT THIS PIN IS: a behaviour pin. Each case builds a small git repository in os.tmpdir() (two commits, or a merge for the CI case; the
 * `git` binary of the machine, every commit with a fixed name, a fixed address and signing off), then runs runChecks({ repo, base, head })
 * and asserts the verdict of ALL THREE checks: the case is red for exactly its reason and the other two checks stay green. Cases 1, 2, 7, 12,
 * 17, 18 and 19 also run the command line (node scripts/size-check.mjs, by child_process) and read the exit code and the `FAIL R<n>` lines.
 * The big files of the R6 cases are generated here. All repositories are removed at the end.
 * Its limits: the cases are small shapes of each rule, not the real tree (the size table of the CI step shows the real numbers); the marker
 * words are the ones the regexes of HISTORY_MARKERS know, so a new marker category needs its own case; the git rows need `git` on the PATH
 * (without it they FAIL, never skip); the CI case builds the merge commit by hand, it does not prove that GitHub makes the same shape
 * (the first parent is the base branch: the workflow comment says so, the pull request run proves it).
 * Cases: 1 clean · 2 R2 over the threshold · 3 R2 at the threshold · 4 R2 removed lines · 5 R2 in src · 6 R2 code token · 7 R5 outside the fence ·
 * 8 R5 fenced (SPIXI_DEV_COEXIST, DEBUG) · 9 R5 `|| true` · 10 R5 probe class call · 11 R5 tag in a comment · 12-16 R6 (cross, grow, shrink,
 * new, same length) and the 1,500 boundary · 17 fail closed (unknown base, no parent) · 18 --ci on a merge commit · 19 workflow-command
 * safety of the printed text · 20 R2 moved lines.
 * Self-check: one token of size-check.mjs changed in a copy of the tree (node scripts/run-pins.mjs --root <copy> pins-sizerule/b-checks) turns the row of that code red. */
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync as rd } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as pjoin, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export default async function ({ ok, root }) {
  const sc = await import(pathToFileURL(pjoin(root, 'scripts', 'size-check.mjs')).href);
  const { runChecks, R2_MAX_MARKER_LINES: MAX, R6_LIMIT: LIMIT } = sc;
  const cliPath = pjoin(root, 'scripts', 'size-check.mjs');
  const tmp = mkdtempSync(pjoin(tmpdir(), 'sizerule-b-'));
  let n = 0;

  const gitIn = (dir, ...a) => {
    const r = spawnSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'commit.gpgsign=false', ...a], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error('git ' + a.join(' ') + ': ' + (r.stderr || r.error));
    return r.stdout.trim();
  };
  const write = (dir, files) => { for (const [rel, body] of Object.entries(files)) { const p = pjoin(dir, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, body); } };
  /* a repository with a base commit and a head commit; a head value of null deletes the file. → { repo, base, head } */
  const mk = (base, head) => {
    const repo = pjoin(tmp, 'r' + (++n)); mkdirSync(repo);
    gitIn(repo, 'init', '-q', '-b', 'main');
    write(repo, base); gitIn(repo, 'add', '-A'); gitIn(repo, 'commit', '-q', '-m', 'base');
    const b = gitIn(repo, 'rev-parse', 'HEAD');
    for (const [rel, body] of Object.entries(head)) { if (body === null) { gitIn(repo, 'rm', '-q', rel); } else write(repo, { [rel]: body }); }
    gitIn(repo, 'add', '-A'); gitIn(repo, 'commit', '-q', '-m', 'head');
    return { repo, base: b, head: gitIn(repo, 'rev-parse', 'HEAD') };
  };
  const cli = (args) => { const r = spawnSync(process.execPath, [cliPath, ...args], { encoding: 'utf8' }); return { code: r.status, out: r.stdout || '', err: r.stderr || '', fails: (r.stdout || '').split('\n').filter((l) => l.startsWith('FAIL ')) }; };
  const cliCase = (c) => cli(['--repo', c.repo, '--base', c.base, '--head', c.head]);
  const verdict = (r) => 'R2 ' + (r.r2.pass ? 'pass' : 'fail') + ', R5 ' + (r.r5.pass ? 'pass' : 'fail') + ', R6 ' + (r.r6.pass ? 'pass' : 'fail');
  const PASS = 'R2 pass, R5 pass, R6 pass';
  const want = (name, c, expected, extra) => {
    const r = runChecks({ repo: c.repo, base: c.base, head: c.head });
    const v = verdict(r); const more = extra ? extra(r) : true;
    ok(v === expected && more === true, 'SIZERULE-B ' + name + ': ' + expected + ' (got ' + v + (more === true ? '' : '; ' + more) + ')');
    return r;
  };
  const failsAre = (res, list) => (JSON.stringify(res.fails.map((l) => l.split(' ').slice(0, 2).join(' '))) === JSON.stringify(list) ? true : 'FAIL lines: ' + JSON.stringify(res.fails));
  const A = (body) => 'class A\n{\n    void M()\n    {\n' + body + '    }\n}\n';
  const A0 = A('        int x = 1;\n');
  const marker = (i) => '        // ★ fixed in round ' + (i + 2) + ' (#' + (1230 + i) + ')\n';
  const markers = (k) => Array.from({ length: k }, (_, i) => marker(i)).join('');
  const big = (lines, salt = 0) => 'class Big\n{\n' + Array.from({ length: lines - 3 }, (_, i) => '    int f' + i + ' = ' + (i + salt) + ';\n').join('') + '}\n';
  const lineCount = (t) => t.split('\n').length - 1;

  try {
    ok(MAX === 5 && LIMIT === 1500 && sc.R6_MODE === 'fail', 'SIZERULE-B constants: R2 allows 5 marker lines, R6 limit 1500 lines, R6 mode fail (a change of the rule is made with this row) (' + [MAX, LIMIT, sc.R6_MODE].join(', ') + ')');
    ok(lineCount(big(1501)) === 1501 && lineCount(big(1499)) === 1499, 'SIZERULE-B fixture: the generated big file has exactly the asked number of lines');

    /* 1 clean */
    const c1 = mk({ 'Spixi/A.cs': A0, 'src/a.js': 'var a = 1;\n' }, {
      'Spixi/A.cs': A('        int x = 1;\n        // Doubles the count so the badge shows whole pairs.\n        int Doubled(int n) { return n * 2; }\n'),
      'src/a.js': 'var a = 2; // keeps the badge in step with the list\n' });
    const r1 = want('case 1 clean (a new C# method with a what / why comment, a src change)', c1, PASS, (r) => (r.r2.count === 0 && r.r5.lines.length === 0 && r.r6.files.length === 0) || 'counts ' + r.r2.count);
    const k1 = cliCase(c1);
    ok(k1.code === 0 && k1.fails.length === 0 && /size-check: PASS/.test(k1.out), 'SIZERULE-B case 1 CLI: exit 0, no FAIL line, "size-check: PASS" (exit ' + k1.code + ')');

    /* 2 R2 over the threshold */
    const c2 = mk({ 'Spixi/A.cs': A0 }, { 'Spixi/A.cs': A('        int x = 1;\n' + markers(MAX + 1)) });
    want('case 2 R2: ' + (MAX + 1) + ' added C# comment lines with history markers', c2, 'R2 fail, R5 pass, R6 pass', (r) => (r.r2.count === MAX + 1 && r.r2.max === MAX) || 'count ' + r.r2.count);
    const k2 = cliCase(c2);
    ok(k2.code === 1 && failsAre(k2, ['FAIL R2']) === true, 'SIZERULE-B case 2 CLI: exit 1 and exactly one FAIL line, FAIL R2 (exit ' + k2.code + ', ' + JSON.stringify(k2.fails.map((l) => l.slice(0, 8))) + ')');

    /* 3 R2 at the threshold */
    const c3 = mk({ 'Spixi/A.cs': A0 }, { 'Spixi/A.cs': A('        int x = 1;\n' + markers(MAX)) });
    want('case 3 R2 at the threshold (' + MAX + ' marker lines: the limit is "above")', c3, PASS, (r) => r.r2.count === MAX || 'count ' + r.r2.count);

    /* 4 R2 removed lines */
    const c4 = mk({ 'Spixi/A.cs': A('        int x = 1;\n' + markers(20)) }, { 'Spixi/A.cs': A0 });
    want('case 4 R2 removed: the base holds 20 history comment lines, the head removes them (removed lines never count)', c4, PASS, (r) => r.r2.count === 0 || 'count ' + r.r2.count);

    /* 5 R2 in src */
    const jsMarkers = Array.from({ length: MAX + 1 }, (_, i) => '// ★ fixed in round ' + (i + 2) + ' (#' + (1230 + i) + ')\n').join('');
    const c5 = mk({ 'src/a.js': 'var a = 1;\n' }, { 'src/a.js': 'var a = 1;\n' + jsMarkers });
    want('case 5 R2 in src: ' + (MAX + 1) + ' marker lines in a src/*.js comment', c5, 'R2 fail, R5 pass, R6 pass', (r) => (r.r2.src === MAX + 1 && r.r2.app === 0) || 'src ' + r.r2.src + ' app ' + r.r2.app);
    const c5b = mk({ 'src/a.css': '.a { color: red; }\n' }, { 'src/a.css': '.a { color: red; }\n' + Array.from({ length: MAX + 1 }, (_, i) => '/* round ' + (i + 2) + ' (#' + (1230 + i) + ') */\n').join('') });
    want('case 5 R2 in src: marker lines in a src/*.css comment', c5b, 'R2 fail, R5 pass, R6 pass');

    /* 6 R2 code token */
    const c6 = mk({ 'Spixi/A.cs': A0, 'src/a.js': 'var a = 1;\n' }, {
      'Spixi/A.cs': A('        int x = 1;\n' + Array.from({ length: MAX + 3 }, (_, i) => '        string s' + i + ' = "#1234 round ' + (i + 2) + '";\n').join('')),
      'src/a.js': 'var a = 1;\n' + Array.from({ length: MAX + 3 }, (_, i) => 'var s' + i + ' = "#1234 round ' + (i + 2) + '";\n').join('') });
    want('case 6 R2 code token: a history-looking string in code (C# and JS), no comment', c6, PASS, (r) => r.r2.count === 0 || 'count ' + r.r2.count);

    /* 7 R5 outside the fence */
    const c7 = mk({ 'Spixi/A.cs': A0 }, { 'Spixi/A.cs': A('        int x = 1;\n        Logging.info("[CDPERF] x");\n') });
    const r7 = want('case 7 R5: one added `Logging.info("[CDPERF] x");` outside any #if', c7, 'R2 pass, R5 fail, R6 pass', (r) => (r.r5.lines.length === 1 && r.r5.lines[0].path === 'Spixi/A.cs' && r.r5.lines[0].line === 6) || JSON.stringify(r.r5.lines));
    const k7 = cliCase(c7);
    ok(k7.code === 1 && failsAre(k7, ['FAIL R5']) === true && /Spixi\/A\.cs:6 /.test(k7.out), 'SIZERULE-B case 7 CLI: exit 1, exactly one FAIL line (FAIL R5), the offending path:line is printed (exit ' + k7.code + ')');

    /* 8 R5 fenced */
    const fence = (sym, body) => A('        int x = 1;\n#if ' + sym + '\n' + body + '#endif\n');
    const probe = '        Logging.info("[CDPERF] x");\n';
    want('case 8 R5 fenced: the same line inside #if SPIXI_DEV_COEXIST … #endif', mk({ 'Spixi/A.cs': A0 }, { 'Spixi/A.cs': fence('SPIXI_DEV_COEXIST', probe) }), PASS);
    want('case 8 R5 fenced: inside #if DEBUG', mk({ 'Spixi/A.cs': A0 }, { 'Spixi/A.cs': fence('DEBUG', probe) }), PASS);
    want('case 8 R5 fenced: inside #if SPIXI_CSH', mk({ 'Spixi/A.cs': A0 }, { 'Spixi/A.cs': fence('SPIXI_CSH', probe) }), PASS);
    want('case 8 R5 not fenced: inside #if ANDROID (a store build may compile it)', mk({ 'Spixi/A.cs': A0 }, { 'Spixi/A.cs': fence('ANDROID', probe) }), 'R2 pass, R5 fail, R6 pass');
    want('case 8 R5 not fenced: inside the #else of #if DEBUG', mk({ 'Spixi/A.cs': A0 }, { 'Spixi/A.cs': A('        int x = 1;\n#if DEBUG\n        int d = 1;\n#else\n' + probe + '#endif\n') }), 'R2 pass, R5 fail, R6 pass');

    /* 9 R5 || true */
    want('case 9 R5: `#if SPIXI_DEV_COEXIST || true` does not fence the probe', mk({ 'Spixi/A.cs': A0 }, { 'Spixi/A.cs': fence('SPIXI_DEV_COEXIST || true', probe) }), 'R2 pass, R5 fail, R6 pass');

    /* 10 R5 probe class call */
    want('case 10 R5: a `P1Perf.line(...)` call outside the fence', mk({ 'Spixi/A.cs': A0 }, { 'Spixi/A.cs': A('        int x = 1;\n        P1Perf.line("open");\n') }), 'R2 pass, R5 fail, R6 pass');

    /* 11 R5 tag in a comment */
    want('case 11 R5: a probe tag only in a comment passes', mk({ 'Spixi/A.cs': A0 }, { 'Spixi/A.cs': A('        int x = 1;\n        // The dev build prints [CDPERF] lines; this call stays quiet.\n') }), PASS);

    /* 12-16 R6 */
    const f = (name, base, head, expected, extra) => want(name, mk({ 'Spixi/Big.cs': base }, { 'Spixi/Big.cs': head }), expected, extra);
    const c12 = mk({ 'Spixi/Big.cs': big(1499) }, { 'Spixi/Big.cs': big(1501) });
    want('case 12 R6 cross: 1,499 lines at the base, 1,501 at the head', c12, 'R2 pass, R5 pass, R6 fail', (r) => (r.r6.files.length === 1 && r.r6.files[0].base === 1499 && r.r6.files[0].head === 1501) || JSON.stringify(r.r6.files));
    const k12 = cliCase(c12);
    ok(k12.code === 1 && failsAre(k12, ['FAIL R6']) === true, 'SIZERULE-B case 12 CLI: exit 1, exactly one FAIL line, FAIL R6 (exit ' + k12.code + ')');
    f('case 12 R6 boundary: 1,500 lines at the base, 1,501 at the head', big(1500), big(1501), 'R2 pass, R5 pass, R6 fail');
    f('case 12 R6 boundary: 1,499 lines at the base, 1,500 at the head (at the limit is fine)', big(1499), big(1500), PASS);
    f('case 13 R6 grow: 1,600 lines grow to 1,601', big(1600), big(1601), 'R2 pass, R5 pass, R6 fail');
    f('case 14 R6 shrink: 1,600 lines shrink to 1,599', big(1600), big(1599), PASS);
    want('case 15 R6 new file of 1,501 lines', mk({ 'Spixi/A.cs': A0 }, { 'Spixi/New.cs': big(1501) }), 'R2 pass, R5 pass, R6 fail');
    want('case 15 R6 new file of 1,500 lines (at the limit is fine)', mk({ 'Spixi/A.cs': A0 }, { 'Spixi/New.cs': big(1500) }), PASS);
    f('case 16 R6 same length: a 1,600-line file changes lines and keeps 1,600', big(1600), big(1600, 7), PASS);
    f('case 16 R6 same length: a 1,500-line file changes lines and keeps 1,500', big(1500), big(1500, 7), PASS);
    want('case 16 R6 deleted: a 1,600-line file is deleted', mk({ 'Spixi/Big.cs': big(1600), 'Spixi/A.cs': A0 }, { 'Spixi/Big.cs': null }), PASS);
    want('case 16 R6 scope: a 1,600-line file under src or the vendored RocksDbSharp folder is not app C#', mk({ 'Spixi/A.cs': A0 }, { 'src/big.js': Array.from({ length: 1600 }, (_, i) => 'var v' + i + ' = 1;\n').join(''), 'Spixi/Platforms/MacCatalyst/RocksDbSharp/V.cs': big(1700) }), PASS);

    /* 17 fail closed */
    const c17 = mk({ 'Spixi/A.cs': A0 }, { 'Spixi/A.cs': A('        int x = 2;\n') });
    const k17 = cli(['--repo', c17.repo, '--base', 'no-such-rev-1234', '--head', c17.head]);
    ok(k17.code === 2 && k17.fails.length === 0 && !/size-check: PASS/.test(k17.out), 'SIZERULE-B case 17 fail closed: an unknown base rev gives exit 2, no FAIL line, no PASS (exit ' + k17.code + ')');
    let threw = false; try { runChecks({ repo: c17.repo, base: 'no-such-rev-1234', head: c17.head }); } catch (e) { threw = true; }
    ok(threw, 'SIZERULE-B case 17 fail closed: runChecks throws on an unknown base rev (it never returns a pass)');
    const k17b = cli(['--repo', c17.repo, '--base', c17.base]);
    ok(k17b.code === 2, 'SIZERULE-B case 17 usage: --base without --head is exit 2 (exit ' + k17b.code + ')');
    const k17c = cli(['--repo', c17.repo, '--ci', '--base', c17.base]);
    ok(k17c.code === 2, 'SIZERULE-B case 17 usage: --ci together with --base is exit 2 (exit ' + k17c.code + ')');
    const root1 = pjoin(tmp, 'single'); mkdirSync(root1); gitIn(root1, 'init', '-q', '-b', 'main'); write(root1, { 'Spixi/A.cs': A0 }); gitIn(root1, 'add', '-A'); gitIn(root1, 'commit', '-q', '-m', 'only');
    const k17d = cli(['--repo', root1, '--ci']);
    ok(k17d.code === 2 && k17d.fails.length === 0, 'SIZERULE-B case 17 fail closed: --ci on a commit without a parent is exit 2 (exit ' + k17d.code + ')');

    /* 18 --ci on a merge commit: the diff is the first parent .. the merge, i.e. what the branch brings */
    const mr = pjoin(tmp, 'merge'); mkdirSync(mr); gitIn(mr, 'init', '-q', '-b', 'main');
    write(mr, { 'Spixi/A.cs': A0 }); gitIn(mr, 'add', '-A'); gitIn(mr, 'commit', '-q', '-m', 'base');
    gitIn(mr, 'checkout', '-q', '-b', 'feature');
    write(mr, { 'Spixi/B.cs': A('        int y = 1;\n        P1Perf.line("open");\n') }); gitIn(mr, 'add', '-A'); gitIn(mr, 'commit', '-q', '-m', 'branch');
    gitIn(mr, 'checkout', '-q', 'main');
    write(mr, { 'Spixi/C.cs': A('        int z = 1;\n' + markers(MAX + 3)), 'Spixi/Big.cs': big(1600) }); gitIn(mr, 'add', '-A'); gitIn(mr, 'commit', '-q', '-m', 'main moves');
    gitIn(mr, 'merge', '-q', '--no-ff', 'feature', '-m', 'merge');
    const k18 = cli(['--repo', mr, '--ci']);
    ok(k18.code === 1 && failsAre(k18, ['FAIL R5']) === true && /Spixi\/B\.cs:6 /.test(k18.out) && !/Spixi\/C\.cs/.test(k18.out) && !/Big\.cs/.test(k18.out),
      'SIZERULE-B case 18 --ci on a merge commit: only the branch diff is checked (its probe is the one FAIL R5; the ' + (MAX + 3) + ' marker lines and the 1,600-line file that came from the other side are not) (exit ' + k18.code + ')');
    const first = gitIn(mr, 'rev-parse', 'HEAD^1');
    const k18b = cli(['--repo', mr, '--base', first, '--head', 'HEAD']);
    ok(k18b.code === k18.code && k18b.out === k18.out, 'SIZERULE-B case 18 --ci is the same as --base HEAD^1 --head HEAD (same output)');
    const clone = pjoin(tmp, 'merge-shallow');
    const cl = spawnSync('git', ['clone', '-q', '--depth', '2', 'file://' + mr, clone], { encoding: 'utf8' });
    const k18c = cl.status === 0 ? cli(['--repo', clone, '--ci']) : { code: -1, out: '', fails: [] };
    ok(cl.status === 0 && k18c.code === 1 && failsAre(k18c, ['FAIL R5']) === true, 'SIZERULE-B case 18 --ci on a shallow clone of depth 2 (the CI checkout): the same verdict (exit ' + k18c.code + ')');
    const clone1 = pjoin(tmp, 'merge-shallow1');
    const cl1 = spawnSync('git', ['clone', '-q', '--depth', '1', 'file://' + mr, clone1], { encoding: 'utf8' });
    const k18d = cl1.status === 0 ? cli(['--repo', clone1, '--ci']) : { code: -1 };
    ok(cl1.status === 0 && k18d.code === 2, 'SIZERULE-B case 18 --ci on a shallow clone of depth 1: exit 2, never a pass (exit ' + k18d.code + ')');

    /* 19 workflow-command safety of the printed text */
    const evil = '        // round 2 (#1234) | `z` <b>q</b> ##[error]w ::error::x\r::warning title=a::y\n';
    const c19 = mk({ 'Spixi/A.cs': A0 }, { 'Spixi/A.cs': A('        int x = 1;\n' + evil), 'Spixi/p::error::x.cs': A('        int y = 1;\n' + evil) });
    const sum = pjoin(tmp, 'summary.md');
    const k19 = cli(['--repo', c19.repo, '--base', c19.base, '--head', c19.head, '--summary', sum]);
    const outLines = k19.out.split('\n'); let md = ''; try { md = rd(sum, 'utf8'); } catch (e) { md = ''; }
    ok(k19.code === 0 && /round 2/.test(k19.out), 'SIZERULE-B case 19 the evil comment is reported as a marker line (exit ' + k19.code + ')');
    ok(!outLines.some((l) => l.startsWith('::') || l.startsWith('##[')) && !/::error::|::warning|##\[/.test(k19.out) && !k19.out.includes('\r'),
      'SIZERULE-B case 19 safety: no printed line starts with "::" or "##[", none holds "::error::" or "::warning", no CR is printed');
    ok(md.includes('\\|') && !md.includes('<b>') && !md.includes('`z`') && !/(^|\n)::/.test(md) && !md.includes('\r'),
      'SIZERULE-B case 19 safety: the Markdown summary escapes | ` < and holds no CR and no line starting with "::"');

    /* 20 R2 moved lines */
    const c20 = mk({ 'Spixi/A.cs': A('        int x = 1;\n' + markers(MAX + 3)), 'Spixi/B.cs': A0 }, { 'Spixi/A.cs': A0, 'Spixi/B.cs': A('        int x = 1;\n' + markers(MAX + 3)) });
    want('case 20 R2 moved: ' + (MAX + 3) + ' marker lines moved from one file to another are not new', c20, PASS, (r) => (r.r2.count === 0 && r.r2.moved === MAX + 3) || 'count ' + r.r2.count + ' moved ' + r.r2.moved);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}
