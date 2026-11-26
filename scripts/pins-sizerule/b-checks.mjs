/* ==== sizerule B — the three checks R2 / R5 / R6 of scripts/size-check.mjs on temporary git repositories.
 *
 * WHAT THIS PIN IS: a behaviour pin. Each case builds a small git repository in os.tmpdir() (two commits, or a merge for the CI case; the
 * `git` binary of the machine, every commit with a fixed name, a fixed address and signing off), then runs runChecks({ repo, base, head })
 * and asserts the verdict of ALL THREE checks: the case is red for exactly its reason and the other two checks stay green. Cases 1, 2, 7, 12,
 * 17, 18, 19, 30 also run the command line (node scripts/size-check.mjs, by child_process) and read the exit code, the `FAIL R<n>` lines, the
 * printed text and the --summary file. Two groups are unit rows on the exported tables: one comment line per HISTORY_MARKERS id and one code
 * line per probe detector (the lists PROBE_TAGS and PROBE_CALLS are frozen here). The big files of the R6 cases are generated here; a symlink
 * is made in the index and a path that is not UTF-8 by git fast-import, so no case needs a file system that allows them. All repositories
 * are removed at the end.
 * Its limits: the cases are small shapes of each rule, not the real tree (the size table of the CI step shows the real numbers); the marker
 * and probe lines are the ones the regexes know today, so a new marker or detector needs its own line here (the id row fails until it has
 * one); the git rows need `git` on the PATH (without it they FAIL, never skip); the CI case builds the merge commit by hand, it does not
 * prove that GitHub makes the same shape (the first parent is the base branch: the workflow comment says so, the pull request run proves
 * it); the R5 timing detector and the fence logic are checked on one-line shapes only.
 * Cases: 1 clean · 2 R2 over the threshold · 3 R2 at the threshold · 4 R2 removed lines · 5 R2 in src · 6 R2 code token · 7 R5 outside the fence ·
 * 8 R5 fenced · 9 R5 `|| true` · 10 R5 probe class call · 11 R5 tag in a comment · 12-16 R6 (cross, grow, shrink, new, same length, boundary) ·
 * 17 fail closed · 18 --ci on a merge commit (and the `checked:` line) · 19 workflow-command safety of the printed text · 20 R2 credit for
 * moved lines · 21 history markers · 22 probe detectors · 23 R2 token credit, single decision number, batch names · 24 R5 old probe lines
 * taken out of a fence or a comment · 25 the vendored folder · 26 files that cannot be read · 27 suspect directive lines · 28 generated src
 * files · 29 R6 and git's rename detection · 30 notes, the summary file, a path that is not UTF-8.
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
  const gitInput = (dir, input, ...a) => {
    const r = spawnSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'commit.gpgsign=false', ...a], { encoding: 'utf8', input });
    if (r.status !== 0) throw new Error('git ' + a.join(' ') + ': ' + (r.stderr || r.error));
    return r.stdout.trim();
  };
  const write = (dir, files) => { for (const [rel, body] of Object.entries(files)) { if (body && body.symlink) continue; const p = pjoin(dir, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, body); } };
  /* a repository with a base commit and a head commit; a head value of null deletes the file, { symlink: 'target' } is a symlink (made in the index, so it works on any
   * file system), a Buffer is written as bytes. → { repo, base, head } */
  const mk = (base, head) => {
    const repo = pjoin(tmp, 'r' + (++n)); mkdirSync(repo);
    gitIn(repo, 'init', '-q', '-b', 'main', '--template=');
    write(repo, base); gitIn(repo, 'add', '-A'); gitIn(repo, 'commit', '-q', '-m', 'base');
    for (const [rel, body] of Object.entries(head)) { if (body === null) { gitIn(repo, 'rm', '-q', rel); } else write(repo, { [rel]: body }); }
    gitIn(repo, 'add', '-A');
    for (const [rel, body] of Object.entries(head)) {
      if (body && body.symlink) { const blob = gitInput(repo, body.symlink, 'hash-object', '-w', '--stdin'); gitIn(repo, 'update-index', '--add', '--cacheinfo', '120000,' + blob + ',' + rel); }
    }
    gitIn(repo, 'commit', '-q', '-m', 'head');
    return { repo, base: 'HEAD^', head: 'HEAD' };   // the two commits just made, by name: no rev-parse call per case
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
    const noScope = (s) => s.split('\n').filter((l) => !l.startsWith('checked: ')).join('\n');
    ok(k18b.code === k18.code && noScope(k18b.out) === noScope(k18.out), 'SIZERULE-B case 18 --ci is the same as --base HEAD^1 --head HEAD (the same output but for the `checked:` line)');
    ok(/^checked: the diff [0-9a-f]{12}\.\.[0-9a-f]{12} = HEAD\^1\.\.HEAD \(on a pull request: what it brings; on a push or a manual run: the last commit only\)$/m.test(k18.out) && /^checked: the diff [0-9a-f]{12}\.\.[0-9a-f]{12} \(the --base and --head given\)$/m.test(k18b.out),
      'SIZERULE-B case 18 the report says which diff it checked: --ci names HEAD^1..HEAD and what that is on a pull request and on a push; --base / --head names the pair given');
    const clone = pjoin(tmp, 'merge-shallow');
    const cl = spawnSync('git', ['clone', '-q', '--depth', '2', 'file://' + mr, clone], { encoding: 'utf8' });
    const k18c = cl.status === 0 ? cli(['--repo', clone, '--ci']) : { code: -1, out: '', fails: [] };
    ok(cl.status === 0 && k18c.code === 1 && failsAre(k18c, ['FAIL R5']) === true, 'SIZERULE-B case 18 --ci on a shallow clone of depth 2 (the CI checkout): the same verdict (exit ' + k18c.code + ')');
    const clone1 = pjoin(tmp, 'merge-shallow1');
    const cl1 = spawnSync('git', ['clone', '-q', '--depth', '1', 'file://' + mr, clone1], { encoding: 'utf8' });
    const k18d = cl1.status === 0 ? cli(['--repo', clone1, '--ci']) : { code: -1 };
    ok(cl1.status === 0 && k18d.code === 2, 'SIZERULE-B case 18 --ci on a shallow clone of depth 1: exit 2, never a pass (exit ' + k18d.code + ')');

    /* 19 workflow-command safety of the printed text: a comment line (a // line and a block comment line) that holds workflow commands, a CR, bidi controls, a backslash, | ` < */
    const evil = '        // round 2 (#1234) | `z` <b>q</b> ##[error]w ::error::x a\\b ‮evil‬\n';
    const evilBlock = '        /* round 2 (#1234) ::error::x\r::warning title=a::y */\n';
    const c19 = mk({ 'Spixi/A.cs': A0 }, { 'Spixi/A.cs': A('        int x = 1;\n' + evil), 'Spixi/pé q.cs': A('        int y = 1;\n' + evil) });
    const sum = pjoin(tmp, 'summary.md');
    const k19 = cli(['--repo', c19.repo, '--base', c19.base, '--head', c19.head, '--summary', sum]);
    const outLines = k19.out.split('\n'); let md = ''; try { md = rd(sum, 'utf8'); } catch (e) { md = ''; }
    const unsafe = (s) => /::error::|::warning|##\[|[‪-‮⁦-⁩‎‏؜]|\r/.test(s) || s.split('\n').some((l) => l.startsWith('::') || l.startsWith('##['));
    ok(k19.code === 0 && /round 2/.test(k19.out) && /R2 history markers in added comment lines: 2 /.test(k19.out), 'SIZERULE-B case 19 the evil // comment is reported as a marker line in both files (exit ' + k19.code + ')');
    ok(!unsafe(k19.out), 'SIZERULE-B case 19 safety: no printed line starts with "::" or "##[", none holds "::error::", "::warning" or "##[", no bidi control and no CR is printed');
    ok(md.includes('\\|') && md.includes('&lt;b&gt;') && md.includes('a\\\\b') && !md.includes('<b>') && !md.includes('`z`') && !unsafe(md),
      'SIZERULE-B case 19 safety: the Markdown summary escapes | ` < and the backslash (a\\\\b), and holds no bidi control, no CR, no line starting with "::"');
    const c19b = mk({ 'Spixi/A.cs': A0 }, { 'Spixi/A.cs': A('        int x = 1;\n' + evilBlock) });
    const sumB = pjoin(tmp, 'summary-b.md');
    const k19b = cli(['--repo', c19b.repo, '--base', c19b.base, '--head', c19b.head, '--summary', sumB]);
    let mdB = ''; try { mdB = rd(sumB, 'utf8'); } catch (e) { mdB = ''; }
    ok(k19b.code === 1 && failsAre(k19b, ['FAIL R5']) === true && /line-separator/.test(k19b.out), 'SIZERULE-B case 19 a CR inside a block comment line is read as unreadable text: exit 1, exactly FAIL R5 (line-separator) (exit ' + k19b.code + ')');
    ok(/round 2/.test(k19b.out) && !unsafe(k19b.out) && !unsafe(mdB), 'SIZERULE-B case 19 safety: the block comment line with "::error::", a CR and "::warning" is printed without any of them');
    ok(!sc.sanitizeLine('Spixi/p::error::x.cs :::: ##[x').includes('::') && !sc.sanitizeLine('##[error]x').includes('##[') && sc.markdownCell('a\\b|c`d<e>f[g]') === 'a\\\\b\\|c\\`d&lt;e&gt;f\\[g\\]',
      'SIZERULE-B case 19 unit: sanitizeLine breaks up "::" and "##[" (also in a path), markdownCell escapes \\ | ` < > [ ] (' + sc.markdownCell('a\\b|c`d<e>f[g]') + ')');

    /* 20 R2 token credit: history that moves or is reworded inside the diff is not new */
    const c20 = mk({ 'Spixi/A.cs': A('        int x = 1;\n' + markers(MAX + 3)), 'Spixi/B.cs': A0 }, { 'Spixi/A.cs': A0, 'Spixi/B.cs': A('        int x = 1;\n' + markers(MAX + 3)) });
    want('case 20 R2 credit: ' + (MAX + 3) + ' marker lines moved from one file to another are credited, not new', c20, PASS, (r) => (r.r2.count === 0 && r.r2.credited === MAX + 3) || 'count ' + r.r2.count + ' credited ' + r.r2.credited);
    /* 21 the history markers: one comment line per HISTORY_MARKERS id, and clean what / why lines */
    const MARK = {
      'decision-number': '// kept as in #1750', 'decisions-file': '// listed in DECISIONS', 'decision-word': '// as the ruling says', star: '// ★ new',
      'round-code': '// see r3 for details', 'round-word': '// from round 2', reader: '// a fresh reader found it', 'reader-code': '// reader B asked',
      finding: '// the finding was valid', 'review-grade': '// MINOR-1 left', 'finding-code': '// per S-1 we wait', packet: '// packet P12 holds it',
      lesson: '// lesson L45 applies', walk: '// the device walk showed it', 'walk-upper': '// WALK says so', date: '// changed on 2026-11-24',
      handoff: '// see docs/handoff-x', contract: '// per contract-sizerule', review: '// after review it stayed as it is', 'mechanisms-doc': '// mechanism-first design',
      session: '// session 12 did this', 'batch-word': '// the fix batch changed it', 'pull-request': '// pull request 28 did it', agent: '// builder-a wrote it', person: '// Damir wanted it',
    };
    const markerIds = sc.HISTORY_MARKERS.map((m) => m.id);
    ok(JSON.stringify(Object.keys(MARK).sort()) === JSON.stringify([...markerIds].sort()), 'SIZERULE-B markers: the table below holds one line for every HISTORY_MARKERS id (' + markerIds.length + '): a new marker needs its line here');
    for (const id of markerIds) {
      const got = sc.historyHits(MARK[id] || '', null);
      ok(JSON.stringify(got) === JSON.stringify([id]), 'SIZERULE-B markers ' + id + ': `' + (MARK[id] || '') + '` gives exactly [' + id + '] (got ' + JSON.stringify(got) + ')');
    }
    const CLEAN = ['// Doubles the count so the badge shows whole pairs.', '// the screen reader announces it', '// the StreamReader reads it; the reader thread waits', '// walk the tree and find the next node',
      '// 2026-01-01 06:00 UTC is the newest row', '// C#10 syntax, 1500 lines, a colour like #3f3', '// the payment review step shows the amount', '// keeps the list sorted so a lookup stays cheap'];
    ok(CLEAN.every((c) => sc.historyHits(c, null).length === 0), 'SIZERULE-B markers: clean what / why lines hold no marker: ' + CLEAN.map((c) => sc.historyHits(c, null).length).join(''));
    const names = sc.batchNames(['scripts/pins-oldbatch/a.mjs', 'docs/contract-sizerule.md', 'docs/handoff-2026-11-01-lockb.md', 'scripts/pins-safety/x.mjs', 'src/a.js']);
    const nameRe = sc.batchNameRe(names);
    ok(JSON.stringify(names) === JSON.stringify(['lockb', 'oldbatch', 'sizerule']) && JSON.stringify(sc.historyHits('// the oldbatch way', nameRe)) === '["batch-name"]' && sc.historyHits('// oldbatches and Sizerule-like', nameRe).length === 0 && sc.historyHits('// the Sizerule way', nameRe).length === 1 && sc.batchNameRe([]) === null,
      'SIZERULE-B markers batch-name: batchNames reads scripts/pins-<n>/, docs/handoff-<date>-<n>.md and docs/contract-<n>.md (a stop-list word like safety is left out); a whole word of a name is a marker, letter case ignored (' + JSON.stringify(names) + ')');
    ok(JSON.stringify(sc.markerTokens('// ★ #1750 r2', null)) === JSON.stringify(['decision-number:#1750', 'star:★', 'round-code:r2']) && sc.isSingleDecisionNumber(sc.markerTokens('// #1750 here', null)) && !sc.isSingleDecisionNumber(sc.markerTokens('// #1750 and #1751', null)) && !sc.isSingleDecisionNumber(sc.markerTokens('// ★ #1750', null)) && !sc.isSingleDecisionNumber([]),
      'SIZERULE-B markers: markerTokens gives one id:text token per hit; a line with exactly one decision number and nothing else is the single-decision case');

    /* 22 the probe detectors: the frozen lists and one line per detector */
    ok(JSON.stringify(sc.PROBE_TAGS) === '["APNSDIAG","CALLSWAP","CDPERF","CRASHDIAG","DIVIDER","DT","EXCERPTDIAG","KBTRAY","L14","L8","LANDTAB","LOCKDIAG","M5","M6","MEMDIAG","MO","NICK","NOTIFDIAG","P0","P1","PAINTDIAG","PRESENCE","RCPT","RESTOREDIAG","SCANDIAG","SPEAKER","STARTDIAG","THEME","WALLETDIAG","WV2","cam-perm"]' &&
      JSON.stringify(sc.PROBE_CALLS) === '["P1Perf","SLockDiag","PushFetchProbe","CdperfFrameProbe","S11FlashProbe","FrameProbe"]',
      'SIZERULE-B probes: PROBE_TAGS (31) and PROBE_CALLS (6) are the frozen lists (a change of the list is made with this row)');
    ok(sc.PROBE_TAGS.every((t) => sc.probeHits('Logging.info("[' + t + '] x");').length > 0) && sc.PROBE_CALLS.every((c) => sc.probeHits(c + '.line("x");').includes('call')),
      'SIZERULE-B probes: every tag of PROBE_TAGS in brackets and every class of PROBE_CALLS is a probe line');
    const PROBES = [
      ['tag list', 'Logging.info("[CDPERF] x");', 'tag'], ['tag list with a hyphen', 'Logging.info("[cam-perm] x");', 'tag'], ['short tag in brackets', 'Logging.info("[MO] x");', 'tag'],
      ['tag pattern ...DIAG', 'Logging.info("[FOODIAG] x");', 'tag-diag-perf'], ['tag pattern ...PERF', 'Logging.info("[BARPERF] x");', 'tag-diag-perf'], ['tag pattern ...PROBE', 'Logging.info("[X_PROBE] x");', 'tag-diag-perf'],
      ['tag pattern ...TIMING', 'Logging.info("[LOADTIMING] x");', 'tag-diag-perf'], ['tag pattern letter + number', 'Logging.info("[P7] x");', 'tag-letter-number'],
      ['call list', 'P1Perf.line("x");', 'call'], ['call list (a nested page class)', 'SLockDiag.Write("x");', 'call'],
      ['call pattern member', 'FooProbe.start(view);', 'call-diag-probe-perf'], ['call pattern call', 'MyDiag(x);', 'call-diag-probe-perf'],
      ['call pattern new', 'var p = new Foo.BarPerf();', 'new-diag-probe-perf'], ['call pattern using static', 'using static X.Y.NewPerf;', 'using-diag-probe-perf'], ['call pattern using alias', 'using T = X.NewProbe;', 'using-diag-probe-perf'],
      ['timing strong (a duration property)', 'Logging.info("t=" + sw.ElapsedMilliseconds);', 'timing'], ['timing strong (Stopwatch)', 'Logging.info(Stopwatch.GetTimestamp());', 'timing'],
      ['timing clock with a subtraction', 'Logging.info("t=" + (Environment.TickCount64 - t0));', 'timing'], ['timing DateTime.Now with a subtraction', 'Logging.info("t=" + (DateTime.Now - start));', 'timing'],
      ['timing weak with a subtraction', 'Logging.info("t=" + (a.TotalMilliseconds - b));', 'timing'], ['timing Elapsed with a subtraction', 'Logging.info("t=" + (sw.Elapsed - a));', 'timing'],
      ['strings joined', 'Logging.info("[" + "CDPERF] x");', 'tag-joined'], ['strings joined (pattern)', 'Logging.info("[" + "ZZDIAG" + "] x");', 'tag-diag-perf-joined'],
      ['escape \\u in a string', 'Logging.info("\\u005BCDPERF] x");', 'tag'], ['escape \\x in a string', 'Logging.info("\\x5BP1] x");', 'tag'], ['escape \\u in a class name', 'P1\\u0050erf.line("x");', 'call'],
      ['fullwidth brackets', 'Logging.info("［CDPERF］ x");', 'tag'], ['a Cyrillic letter in the tag', 'Logging.info("[СDPERF] x");', 'tag'], ['a zero-width character in the tag', 'Logging.info("[CD​PERF] x");', 'tag'],
      ['bare tag name in an interpolation hole', 'Logging.info($"[{"CDPERF"}] x");', 'tag-name'], ['bare tag name in string.Format', 'Logging.info(string.Format("[{0}] x", "CDPERF"));', 'tag-name'],
      ['bare tag name in nameof', 'Logging.info("[" + nameof(CDPERF) + "] x");', 'tag-name'], ["bare tag name after a char '['", "Logging.info('[' + \"CDPERF] x\");", 'tag-name'],
    ];
    for (const [name, code, id] of PROBES) { const h = sc.probeHits(code); ok(h.includes(id), 'SIZERULE-B probes ' + name + ': `' + code + '` hits ' + id + ' (got ' + JSON.stringify(h) + ')'); }
    const NOT_PROBES = [['a short tag name outside brackets', 'var p = P1 + DT;'], ['an indexer', 'var v = arr[P1] + m[i][DT];'], ['a subsystem tag', 'Logging.warn("[CONFIRM] x");'], ['a clock read alone', 'Logging.info("at " + DateTime.UtcNow);'],
      ['a duration alone', 'Logging.info("t=" + elapsed.TotalMilliseconds);'], ['the word Elapsed in a string', 'Logging.info("Elapsed time");'], ['a stopwatch value without a log call', 'var t = sw.ElapsedMilliseconds;'], ['a plain subtraction', 'int a = b - c;']];
    ok(NOT_PROBES.every(([, code]) => sc.probeHits(code).length === 0), 'SIZERULE-B probes: lines that are no probe stay clean: ' + NOT_PROBES.map(([n, code]) => n + '=' + sc.probeHits(code).length).join(', '));

    /* 23 R2 token credit */
    const own = (i) => '        int m' + i + ' = ' + i + ';';
    const member = (i, c) => own(i) + ' // ' + c + '\n';
    const six = (f) => Array.from({ length: 6 }, (_, i) => f(i)).join('');
    const baseHist = A(six((i) => member(i, '★ #1750 r2 MINOR-1: member ' + i + ' keeps its value')));
    const w23 = (name, headBody, expected, extra) => want(name, mk({ 'Spixi/A.cs': baseHist }, { 'Spixi/A.cs': A(headBody) }), expected, extra);
    w23('case 23 R2 credit: six members rewritten, one decision number kept per member', six((i) => member(i, '#1750: member ' + i + ' keeps its value')), PASS, (r) => (r.r2.count === 0 && r.r2.singleDecision === 6) || JSON.stringify([r.r2.count, r.r2.singleDecision, r.r2.credited]));
    w23('case 23 R2 credit: six members reworded with markers the diff removed (credited)', six((i) => member(i, '★ #1750: member ' + i + ' keeps its value')), PASS, (r) => (r.r2.count === 0 && r.r2.credited === 6) || JSON.stringify([r.r2.count, r.r2.singleDecision, r.r2.credited]));
    w23('case 23 R2 credit: six new history lines with new tokens next to the old lines fail', six((i) => member(i, '★ #1750 r2 MINOR-1: member ' + i + ' keeps its value') + '        // ★ #1915 r3 NIT-' + i + '\n'), 'R2 fail, R5 pass, R6 pass', (r) => r.r2.count === 6 || 'count ' + r.r2.count);
    w23('case 23 R2 credit: six members rewritten with a NEW marker word (a token the diff did not remove) fail', six((i) => member(i, '★ #1750 r2 MINOR-1 and a walk sheet W-' + i + ': member ' + i)), 'R2 fail, R5 pass, R6 pass', (r) => r.r2.count === 6 || 'count ' + r.r2.count);
    want('case 23 R2 single decision number: six lines with one decision number each do not count', mk({ 'Spixi/A.cs': A0 }, { 'Spixi/A.cs': A('        int x = 1;\n' + six((i) => '        // see #19' + i + '0\n')) }), PASS, (r) => (r.r2.count === 0 && r.r2.singleDecision === 6) || JSON.stringify([r.r2.count, r.r2.singleDecision]));
    want('case 23 R2 single decision number: six lines with TWO decision numbers each count', mk({ 'Spixi/A.cs': A0 }, { 'Spixi/A.cs': A('        int x = 1;\n' + six((i) => '        // see #19' + i + '0 and #20' + i + '0\n')) }), 'R2 fail, R5 pass, R6 pass', (r) => r.r2.count === 6 || 'count ' + r.r2.count);
    want('case 23 R2 batch name of the base tree only: a pins folder the diff deletes still names a batch', mk({ 'scripts/pins-oldbatch/a.mjs': 'x\n', 'Spixi/A.cs': A0 }, { 'scripts/pins-oldbatch/a.mjs': null, 'Spixi/A.cs': A('        int x = 1;\n' + six((i) => '        int a' + i + ' = ' + i + '; // the oldbatch way ' + i + '\n')) }), 'R2 fail, R5 pass, R6 pass', (r) => (r.r2.count === 6 && r.r2.names.includes('oldbatch')) || 'count ' + r.r2.count);

    /* 24 R5 fences: an old probe line that the diff takes out of its fence or out of a comment */
    const PR = '        Logging.info("[CDPERF] x");\n';
    const hit0 = (r, how) => (r.r5.lines.length >= 1 && r.r5.lines.some((l) => l.hits[0] === how)) || JSON.stringify(r.r5.lines.map((l) => l.hits));
    want('case 24 R5 unfenced: the #endif moves above an old probe line', mk({ 'Spixi/A.cs': A('        int a = 1;\n#if SPIXI_DEV_COEXIST\n        int b = 2;\n' + PR + '        int c = 3;\n        int d = 4;\n#endif\n') }, { 'Spixi/A.cs': A('        int a = 1;\n#if SPIXI_DEV_COEXIST\n        int b = 2;\n#endif\n' + PR + '        int c = 3;\n        int d = 4;\n') }), 'R2 pass, R5 fail, R6 pass', (r) => hit0(r, 'unfenced'));
    want('case 24 R5 unfenced: the #if and #endif lines around an old probe line are removed', mk({ 'Spixi/A.cs': A('        int a = 1;\n#if SPIXI_DEV_COEXIST\n' + PR + '#endif\n') }, { 'Spixi/A.cs': A('        int a = 1;\n' + PR) }), 'R2 pass, R5 fail, R6 pass', (r) => hit0(r, 'unfenced'));
    want('case 24 R5 unfenced: a #define DEBUG added in front of an `#if DEBUG` probe makes it ship', mk({ 'Spixi/A.cs': A('#if DEBUG\n' + PR + '#endif\n') }, { 'Spixi/A.cs': '#define DEBUG\n' + A('#if DEBUG\n' + PR + '#endif\n') }), 'R2 pass, R5 fail, R6 pass', (r) => hit0(r, 'unfenced'));
    want('case 24 R5 uncommented: an old probe line in a block comment is uncommented', mk({ 'Spixi/A.cs': A('        int a = 1;\n/*\n' + PR + '*/\n') }, { 'Spixi/A.cs': A('        int a = 1;\n\n' + PR + '\n') }), 'R2 pass, R5 fail, R6 pass', (r) => hit0(r, 'uncommented'));
    want('case 24 R5 stays fenced: a line inside the fence that the diff leaves in it passes', mk({ 'Spixi/A.cs': A('#if SPIXI_DEV_COEXIST\n' + PR + '#endif\n') }, { 'Spixi/A.cs': A('        int a = 1;\n#if SPIXI_DEV_COEXIST\n' + PR + '#endif\n') }), PASS);
    want('case 24 R5 moved: an existing probe line re-commented is not new', mk({ 'Spixi/A.cs': A('        Logging.info("[CDPERF] x"); // old\n') }, { 'Spixi/A.cs': A(PR) }), PASS, (r) => r.r5.moved === 1 || 'moved ' + r.r5.moved);

    /* 25 the vendored RocksDbSharp folder: R2 and R5 read it, R6 does not */
    const V = 'Spixi/Platforms/MacCatalyst/RocksDbSharp/V.cs';
    want('case 25 vendored: a probe line in the vendored folder fails R5', mk({ 'Spixi/A.cs': A0 }, { [V]: A(PR) }), 'R2 pass, R5 fail, R6 pass');
    want('case 25 vendored: ' + (MAX + 1) + ' history comment lines in the vendored folder fail R2', mk({ 'Spixi/A.cs': A0 }, { [V]: A('        int x = 1;\n' + markers(MAX + 1)) }), 'R2 fail, R5 pass, R6 pass', (r) => r.r2.count === MAX + 1 || 'count ' + r.r2.count);
    want('case 25 vendored: a 1,600-line vendored file passes R6', mk({ 'Spixi/A.cs': A0 }, { [V]: big(1600) }), PASS);

    /* 26 files that cannot be read */
    const why5 = (r) => (r.r5.lines.length === 1 && r.r5.lines[0].hits[0] === 'unreadable') || JSON.stringify(r.r5.lines.map((l) => l.hits));
    const why2 = (what) => (r) => (r.r2.unreadable.length === 1 && r.r2.unreadable[0].why === what && r.r2.count === 0) || JSON.stringify(r.r2.unreadable);
    const B0 = { README: 'x\n' };
    want('case 26 unreadable: a C# file with a NUL byte fails R5', mk(B0, { 'Spixi/N.cs': 'class N { }\n\u0000\n' }), 'R2 pass, R5 fail, R6 pass', why5);
    want('case 26 unreadable: a UTF-16 C# file fails R5', mk(B0, { 'Spixi/U.cs': Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(A(PR), 'utf16le')]) }), 'R2 pass, R5 fail, R6 pass', why5);
    want('case 26 unreadable: a symlink named .cs fails R5', mk(B0, { 'Spixi/L.cs': { symlink: '../README' } }), 'R2 pass, R5 fail, R6 pass', why5);
    want('case 26 unreadable: a src file with a NUL byte fails R2', mk(B0, { 'src/n.js': 'var a;\u0000\n' }), 'R2 fail, R5 pass, R6 pass', why2('NUL byte'));
    want('case 26 unreadable: a UTF-16 src file fails R2', mk(B0, { 'src/u.js': Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('// x\n', 'utf16le')]) }), 'R2 fail, R5 pass, R6 pass', why2('UTF-16 byte order mark'));
    want('case 26 unreadable: a src file that is not UTF-8 fails R2', mk(B0, { 'src/l1.js': Buffer.from([0x2f, 0x2f, 0x20, 0xe9, 0x0a]) }), 'R2 fail, R5 pass, R6 pass', why2('not valid UTF-8'));
    want('case 26 unreadable: a symlink src file fails R2', mk(B0, { 'src/l.js': { symlink: '../README' } }), 'R2 fail, R5 pass, R6 pass', why2('symlink'));

    /* 27 the classifier cannot trust the directive lines of a C# text: R5 unreadable, one case per reason */
    const SUSP = [
      ['comment-over-directive', A('/*\n#if DEBUG\n*/\n        int q = 1;\n')], ['string-over-directive', A('        var s = @"\n#if DEBUG\n";\n')],
      ['block-comment-on-directive', A('#if DEBUG /* x */\n        int q = 1;\n#endif\n')], ['directive-continuation', A('#if DEBUG \\\n        int q = 1;\n#endif\n')],
      ['define-name', '#define SPIXI_DEV\\u005FCOEXIST\n' + A('        int q = 1;\n')], ['line-separator', A('        int q = 1;\r        int r = 2;\n')],
    ];
    for (const [reason, text] of SUSP) {
      want('case 27 suspect ' + reason + ': R5 unreadable with that reason', mk({ 'Spixi/S.cs': A0 }, { 'Spixi/S.cs': text }), 'R2 pass, R5 fail, R6 pass', (r) => (r.r5.lines.length === 1 && r.r5.lines[0].hits[0] === 'unreadable' && r.r5.lines[0].hits[1] === reason) || JSON.stringify(r.r5.lines.map((l) => l.hits)));
    }
    want('case 27 suspect: a changed file that holds a suspect fails although the diff adds no suspect line', mk({ 'Spixi/S.cs': A('/*\n#if DEBUG\n*/\n') }, { 'Spixi/S.cs': A('/*\n#if DEBUG\n*/\n        int q = 1;\n') }), 'R2 pass, R5 fail, R6 pass', (r) => r.r5.lines.length === 1 && r.r5.lines[0].hits[1] === 'comment-over-directive');

    /* 28 src files and the generated set */
    const histJs = Array.from({ length: MAX + 1 }, (_, i) => '// ★ fixed in round ' + (i + 2) + ' (#' + (1230 + i) + ')\n').join('');
    const FAIL2 = 'R2 fail, R5 pass, R6 pass'; const cnt2 = (k) => (r) => r.r2.count === k || 'count ' + r.r2.count;
    const g1 = want('case 28 generated: a file marked generated only at the head is still read', mk({ 'src/gen.js': 'x();\n', README: 'x\n' }, { '.gitattributes': 'src/gen.js linguist-generated=true\n', 'src/gen.js': 'x();\n' + histJs }), FAIL2, cnt2(MAX + 1));
    ok(g1.notes.gitattributes.length === 1 && g1.notes.watched.includes('.gitattributes'), 'SIZERULE-B case 28 generated: a change of .gitattributes is noted (notes.gitattributes and notes.watched)');
    want('case 28 generated: a new file under a generated pattern is read', mk({ '.gitattributes': 'src/gen/*.js linguist-generated=true\n', 'src/gen/old.js': 'x();\n' }, { 'src/gen/new.js': histJs }), FAIL2, cnt2(MAX + 1));
    want('case 28 generated: an old file generated at base and head is skipped', mk({ '.gitattributes': 'src/gen/*.js linguist-generated=true\n', 'src/gen/old.js': 'x();\n' }, { 'src/gen/old.js': 'x();\n' + histJs }), PASS, cnt2(0));

    /* 29 R6 with git's rename detection */
    const bigC = (k) => Array.from({ length: k }, (_, i) => 'int v' + i + ' = ' + i + '; // value ' + i + '\n').join('');
    want('case 29 R6 rename: a 2,000-line file moved and edited so that it shrinks passes', mk({ 'Spixi/Big.cs': bigC(2000) }, { 'Spixi/Big.cs': null, 'Spixi/Moved.cs': bigC(1990) }), PASS);
    want('case 29 R6 rename: the same move that grows fails, naming the old path', mk({ 'Spixi/Big.cs': bigC(2000) }, { 'Spixi/Big.cs': null, 'Spixi/Moved.cs': bigC(2010) }), 'R2 pass, R5 pass, R6 fail', (r) => (r.r6.files.length === 1 && r.r6.files[0].renamedFrom === 'Spixi/Big.cs' && r.r6.files[0].base === 2000) || JSON.stringify(r.r6.files));
    want('case 29 R6 split: a 2,000-line file split into two of 1,000 lines passes', mk({ 'Spixi/Big.cs': bigC(2000) }, { 'Spixi/Big.cs': bigC(1000), 'Spixi/Part.cs': bigC(1000) }), PASS);
    want('case 29 R6 no final newline: a 1,500-line file without the last newline is 1,500 lines', mk({ 'Spixi/A.cs': A0 }, { 'Spixi/New.cs': big(1500).slice(0, -1) }), PASS);

    /* 30 the command line: a note for the checks' own files, the summary file, a path that is not UTF-8 */
    const c30 = mk({ 'Spixi/A.cs': A0 }, { 'scripts/size-check.mjs': 'x\n', 'package.json': '{}\n', '.github/workflows/w.yml': 'x\n' });
    const k30 = cliCase(c30);
    ok(k30.code === 0 && /^NOTE the pull request changes the size checks or their inputs: review that part by hand$/m.test(k30.out) && /^  \| scripts\/size-check\.mjs$/m.test(k30.out) && /^  \| package\.json$/m.test(k30.out) && /^  \| \.github\/workflows\/w\.yml$/m.test(k30.out), 'SIZERULE-B case 30 notes: a diff that changes the checks or their inputs prints a NOTE with the paths and stays exit 0 (exit ' + k30.code + ')');
    const sum1 = pjoin(tmp, 'summary-1.md');
    const s1 = cli(['--repo', c1.repo, '--base', c1.base, '--head', c1.head, '--summary', sum1]); const s1b = cli(['--repo', c1.repo, '--base', c1.base, '--head', c1.head, '--summary', sum1]);
    let md1 = ''; try { md1 = rd(sum1, 'utf8'); } catch (e) { md1 = ''; }
    ok(s1.code === 0 && s1b.code === 0 && md1.startsWith('## Size (R2 · R5 · R6) — pass') && md1.split('## Size (R2').length === 3 && /\| R2 history markers in added comments \(max 5\) \| pass \| 0 \|/.test(md1) && /\| app C# code lines \|/.test(md1),
      'SIZERULE-B case 30 summary: --summary writes the Markdown report (heading with the verdict, the size table, one row per check) and appends a second one on a second run');
    const badRepo = pjoin(tmp, 'badpath'); mkdirSync(badRepo); gitIn(badRepo, 'init', '-q', '-b', 'main'); write(badRepo, { 'Spixi/A.cs': A0 }); gitIn(badRepo, 'add', '-A'); gitIn(badRepo, 'commit', '-q', '-m', 'base');
    const badBase = gitIn(badRepo, 'rev-parse', 'HEAD');
    const dat = (b) => Buffer.concat([Buffer.from('data ' + b.length + '\n'), b, Buffer.from('\n')]);
    const fi = spawnSync('git', ['-C', badRepo, 'fast-import', '--quiet'], { input: Buffer.concat([Buffer.from('commit refs/heads/main\ncommitter t <t@example.invalid> 0 +0000\n'), dat(Buffer.from('badpath')), Buffer.from('from ' + badBase + '\nM 100644 inline Spixi/bad'), Buffer.from([0xff]), Buffer.from('.cs\n'), dat(Buffer.from(A('        int q = 1;\n'))), Buffer.from('\n')]) });
    const kBad = fi.status === 0 ? cli(['--repo', badRepo, '--base', badBase, '--head', gitIn(badRepo, 'rev-parse', 'refs/heads/main')]) : { code: -1, err: String(fi.stderr) };
    ok(fi.status === 0 && kBad.code === 2 && /not UTF-8/.test(kBad.err), 'SIZERULE-B case 30 fail closed: a path of the diff that is not UTF-8 gives exit 2 with a clear message (exit ' + kBad.code + ', ' + kBad.err.trim().slice(0, 120) + ')');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}
