/* ==== leanfollow item 3 — the PLAIN packaged smoke (scripts/smoke-packaged.mjs without a lean flag) ====
 *
 * What is pinned. The plain run copies the repo into a temp folder WITHOUT .git, node_modules, local-nuget and the Ixian-Core
 * sibling, so four rows of the suite were red in ANY copy (S15 D: no git work tree; #1101 F-1b, A10, S14: no ../Ixian-Core).
 * The fix: after the copy, `git init -q` in the copy (loud when git is missing); the Ixian-Core sibling linked next to the copy
 * when root/../Ixian-Core exists; every link recorded before it is made and removed by itself before the recursive delete of the
 * temp folder, also with --keep and on a failure; the copy's strip called with `--out <copyRaw> --in-place`; ONE printed line when
 * there is no sibling; the verdict line and the exit status stay the copy suite's. The lean path gets the same `git init -q`.
 *
 * How. BEHAVIOUR (#771 / #798): the REAL scripts/smoke-packaged.mjs is run as a child process in a FAKE tree (a scratch folder
 * holding the real script, a stand-in strip-release.mjs that logs its arguments, a stand-in scripts/smoke-test.mjs that logs what
 * the copy looks like from INSIDE the suite — git work tree or not, ../Ixian-Core readable or not, the link markers — and prints
 * the suite's own end lines, a fake Ixian-Core next to the tree, fake node_modules / local-nuget with marker files, a TMPDIR of its
 * own). A preload module (node --import) wraps fs.rmSync and records, at the moment of the recursive delete of the temp folder,
 * whether any symbolic link is still inside it: that proves the ORDER (the links go first) on every OS, which the final state alone
 * cannot (on Linux rmSync never follows a link, so a missing removeLinks leaves the same final state).
 *
 * Rows (each has its deliberate break; the break rows run a mutated copy of smoke-packaged.mjs through the SAME scenarios and
 * require that exactly the named row fails — a break whose anchor text is not found exactly once FAILS its row, never passes):
 *  A  the suite sees the copy as a git work tree at its top level (`git rev-parse --is-inside-work-tree` = true, `--show-prefix` empty)
 *  B  git missing (empty PATH): exit 1, the reason named ("git init -q failed"), the suite and the strip never ran, no temp folder left
 *  C  ../Ixian-Core is readable from the copy's cwd while the suite runs, and the "no Ixian-Core sibling" line is NOT printed then
 *  D  the copy's strip got exactly `--out <copyRaw> --in-place` (copyRaw = <temp>/Spixi/Spixi/Resources/Raw/html, the copy's own
 *     script), and GATE 1 is the committed tree's script with `--check <copyRaw>` (no new flag)
 *  E  no Core sibling: ONE line "no Ixian-Core sibling", exit 0, the suite still ran (and saw no Core)
 *  F1 a good run: at the recursive delete no link is left inside the temp folder; no temp folder is left afterwards
 *  F2 a failing run (the suite exits 1; the package strip exits 1): same two facts
 *  F3 --keep: the kept copy holds no link at all (a walk of it) and its files; the run names it; nothing else is left
 *  G  the linked folders (node_modules, local-nuget, the Core sibling) were readable through their links during the run and keep
 *     their marker files afterwards (the real folders were not touched)
 *  H1 the verdict line is the suite's own line, printed after "smoke-packaged: " (a count nothing else could invent)
 *  H2 the exit status is the suite's: 0 with "GATE 2 OK" when it exits 0; 1 with "GATE 2 FAILED" and its red row and stderr when it exits 1
 *  N  a caller's exported git variables (the six that redirect a repository, plus the config / template / ceiling ones: GIT_CONFIG_PARAMETERS, GIT_CONFIG_COUNT with
 *     KEY_0 / VALUE_0, GIT_CONFIG_GLOBAL / _SYSTEM / _NOSYSTEM, GIT_TEMPLATE_DIR, GIT_CEILING_DIRECTORIES, GIT_DISCOVERY_ACROSS_FILESYSTEM; a scratch repository) reach neither
 *     `git init -q` nor the copy's suite, plain and lean: the repository is unchanged (file list, sizes, mtimes), the suite sees no name that starts with GIT_ (GIT_EXEC_PATH
 *     is kept: where git itself lives), a leaked template dir does not reach the copy's .git, the suite's git dir is not the caller's. The script removes EVERY GIT_ name:
 *     a list goes stale, and `git init -q` and `check-ignore --no-index` need none of them.
 *  S  a stop signal still runs the clean-up (plain and lean): SIGINT to the PROCESS GROUP (what a terminal's Ctrl-C does; the suite sleeps) ends the run at once with exit 1 and no
 *     temp folder; a SIGTERM to the script ALONE (kill <pid>) is held until the suite has ended (here: it passes) and then the same clean-up runs and the exit is 1
 *  P  a stop while no child runs: cut short at the stop point of the phase, no suite, exit 1 (plain and lean): the strip and the cross-check sleep (SIGTERM to the script alone);
 *     after the copy / git init / the links / GATE 1 the script signals ITSELF (a preload hook) and the NEXT phase must not have started (no git init, no link, no strip, no suite)
 *  X  a closed output pipe (`| head -1`) is a stop: exit 1, "stopped by EPIPE", no suite, nothing left (plain and lean)
 *  Q  the plain suite gets SPIXI_PACKAGED_FROM = the committed Raw/html
 *  T  ONE line at the start of both paths names the real temp folder and says to remove the links in it first (node_modules, local-nuget, ../Ixian-Core), then the folder
 *  L  the LEAN path (--lean-css) makes the copy a git work tree too (same observation as A, from the lean run's suite)
 *
 * LIMITS (#1735 — stated, not hidden):
 *  - Linux / macOS: the real script makes 'junction' links, which on POSIX are symbolic links. This pin cannot prove that a Windows
 *    junction is made, found by lstat as a link, removed by unlink / rmdir WITHOUT reaching its target, or that `git` is found on the
 *    PC's PATH by a spawn without a shell (that is the PC run of the real script; it is the lead's / Damir's). On Windows the
 *    pin runs, but G's break (a delete of the linked folder's contents through the link) is written with fs calls that follow a link on every OS, but its effect on a junction was not run.
 *  - The strip and the suite are stand-ins: that the REAL strip-release.mjs accepts `--out <dir> --in-place` (another item) and that
 *    the REAL suite is green in the copy (S15 D green in a git work tree; the three Core rows green with the link; no other row
 *    reading .git or ../Ixian-Core) is proven only by the real plain run. This pin proves the wiring.
 *  - SIGNALS (row S). Proven: a terminal-style Ctrl-C (the group) and a kill to the script alone, on Linux / macOS only (no process groups on Windows: the row is
 *    reported SKIPPED there; the Windows Ctrl-C and console-close paths are not proven). NOT handled, by design of the platform: SIGUSR1 / SIGUSR2 (not stop keys; not handled), SIGKILL, a power loss, closing the
 *    terminal window on a shell that kills the group with SIGKILL — then the temp folder keeps its links and the start line says what to do by hand. A kill to the script
 *    ALONE cannot hurry the run: spawnSync blocks the event loop, so the signal is seen only when the suite has ended (up to ~45 minutes); then the clean-up runs and the exit is 1.
 *  - Signals pinned: SIGINT, SIGTERM, SIGQUIT, SIGHUP, SIGALRM (the other two of that family, SIGXCPU / SIGVTALRM, share the list entry that the SIGALRM break removes
 *    with them, but are not sent; SIGPROF is NOT handled: V8's CPU profiler (`node --cpu-prof`) samples with it); SIGBREAK exists on Windows only and is not pinned.
 *  - No fixed times: every wait is a handshake (a stand-in logs "started" and holds until the pin has acted and written the go file; a 20 s wait logs "timeout" and fails the
 *    fixture row). A mismatch is NOT re-run, so a first-run failure is always visible.
 *  - Row S's break rows (the handler removed; not noting the signal; no event-loop turn in either path) are the whole proof that each part is used. That no link is left at the
 *    delete after a signal is the same `finally` as rows F1 / F2 (their breaks), not asserted again here: the S row prints the link counts only.
 *  - The order proof relies on node's `--import` and `syncBuiltinESMExports` (Node >= 20.6); if the spy is not loaded the rows say so.
 *  - The fake Core is a folder with one marker file: that a symlink to the real Core cannot be written through is not tested.
 *  - rmSync is the one recursive delete the script uses; a different delete function would not be seen by the spy (F1 / F2 would then
 *    fail for "no delete seen", never pass).
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync as rfs, copyFileSync, readdirSync as rds, lstatSync, realpathSync, rmSync, existsSync as ex } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

export default async function ({ ok, root }) {
  const T = '★ leanfollow C (plain smoke-packaged)';
  const nz = (s) => String(s).replace(/\\/g, '/');
  const rp = (s) => { try { return nz(realpathSync(s)); } catch (_) { return nz(s); } };
  const W = (f, text) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, text); };
  const rd = (f) => { try { return rfs(f, 'utf8'); } catch (_) { return null; } };
  const J = JSON.stringify;
  const REAL = join(root, 'scripts', 'smoke-packaged.mjs');
  if (!ex(REAL)) { ok(false, T + ' scripts/smoke-packaged.mjs is missing in ' + root); return; }
  const realText = rfs(REAL, 'utf8').replace(/\r\n/g, '\n');
  const D = mkdtempSync(join(tmpdir(), 'pin-plainpk-'));

  /* ---------- the stand-ins ---------- */
  const STRIP = [
    "import { appendFileSync, existsSync } from 'node:fs';",
    "const hold = (w) => { if (!(process.env.FAKE_HOLD || '').split(',').includes(w)) return; const t0 = Date.now(); while (!existsSync(process.env.FAKE_GO)) { if (Date.now() - t0 > 20000) { appendFileSync(process.env.FAKE_LOG, JSON.stringify({ k: 'timeout', w }) + '\\n'); process.exit(99); } Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10); } };",
    "appendFileSync(process.env.FAKE_LOG, JSON.stringify({ k: 'strip', script: process.argv[1], args: process.argv.slice(2) }) + '\\n');",
    "if (!process.argv.includes('--check')) hold('strip');",   // the HANDSHAKE: "started" is the log line above; the pin signals, then writes the go file

    "if (process.env.FAKE_STRIP_FAIL && !process.argv.includes('--check')) { console.error('fake strip: failing on purpose'); process.exit(1); }",
  ].join('\n') + '\n';
  const SUITE = [
    "import { readFileSync, appendFileSync, existsSync } from 'node:fs';",
    "import { spawnSync } from 'node:child_process';",
    "const rd = (f) => { try { return readFileSync(f, 'utf8'); } catch (e) { return null; } };",
    "const g1 = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' });",
    "const g2 = spawnSync('git', ['rev-parse', '--show-prefix'], { encoding: 'utf8' });",
    "const git = { inside: g1.status === 0 && g1.stdout.trim() === 'true', prefix: g2.status === 0 ? g2.stdout.trim() : null, dotGit: existsSync('.git') };",
    "const g3 = spawnSync('git', ['rev-parse', '--absolute-git-dir'], { encoding: 'utf8' });",
    "const genv = Object.keys(process.env).filter((k) => /^GIT_/i.test(k) && k.toUpperCase() !== 'GIT_EXEC_PATH');",
    "const KNOWN_PREEXISTERS = [",
    "  'fake known pre-exister one',",
    "  'fake known pre-exister two',",
    "];",
    "appendFileSync(process.env.FAKE_LOG, JSON.stringify({ k: 'suite', cwd: process.cwd(), git, absGitDir: g3.status === 0 ? g3.stdout.trim() : null, genv, desc: rd('.git/description'), core: rd('../Ixian-Core/marker.txt'), nm: rd('node_modules/marker.txt'), ln: rd('local-nuget/marker.txt'), from: process.env.SPIXI_PACKAGED_FROM || '', lean: process.env.SPIXI_PACKAGED_LEAN || '' }) + '\\n');",
    "const hold = (w) => { if (!(process.env.FAKE_HOLD || '').split(',').includes(w)) return; const t0 = Date.now(); while (!existsSync(process.env.FAKE_GO)) { if (Date.now() - t0 > 20000) { appendFileSync(process.env.FAKE_LOG, JSON.stringify({ k: 'timeout', w }) + '\\n'); process.exit(99); } Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10); } };",
    "hold('suite');",
    "console.log('  ✓ fake row one'); console.log('  ✓ fake row two');",
    "if (process.env.FAKE_SUITE === 'fail') { console.log('  ✗ fake red row of the stand-in suite'); console.error('\\nFAILED:\\nfake red row of the stand-in suite'); process.exit(1); }",
    "if (process.env.FAKE_SUITE === 'nap') {",   // a passing suite (held by FAKE_HOLD until the pin has signalled) that takes a moment: lean judge ok too (the two KNOWN as ✗ rows, the summary of the 2 ✓ rows)
    "  for (const k of KNOWN_PREEXISTERS) console.log('  ✗ ' + k + ' — tail');",
    "  console.log('BASELINE OK — 2 pass / the 2 KNOWN pre-exister(s): ' + KNOWN_PREEXISTERS.join(', '));",
    "  process.exit(0);",
    "}",
    "console.log('BASELINE OK — 4711 pass / the 2 KNOWN pre-exister(s): fake one, fake two');",
    "process.exit(0);",
  ].join('\n') + '\n';
  // the preload: at the recursive delete of the temp folder, record the symbolic links still inside it (never following one)
  const SPY = [
    "import fs from 'node:fs';",
    "import { syncBuiltinESMExports } from 'node:module';",
    "const orig = fs.rmSync;",
    "const walk = (d, out) => { let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return out; } for (const e of es) { const p = d + '/' + e.name; if (e.isSymbolicLink()) out.push(p); else if (e.isDirectory()) walk(p, out); } return out; };",
    "fs.rmSync = function (p, o) { fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify({ k: 'rm', path: String(p), links: walk(String(p), []) }) + '\\n'); return orig.apply(this, arguments); };",
    "import cp from 'node:child_process';",
    "const KILL = process.env.FAKE_KILL, log = (o) => fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify(o) + '\\n'), self = () => process.kill(process.pid, 'SIGTERM');",   // a signal to itself, right after the named phase
    "const ocp = fs.cpSync; fs.cpSync = function () { const r = ocp.apply(this, arguments); if ((process.env.FAKE_HOLD || '').split(',').includes('copy')) { const t0 = Date.now(); while (!fs.existsSync(process.env.FAKE_GO)) { if (Date.now() - t0 > 20000) { log({ k: 'timeout', w: 'copy' }); process.exit(99); } Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10); } } if (KILL === 'copy') self(); return r; };",
    "const osl = fs.symlinkSync; fs.symlinkSync = function (t, p) { log({ k: 'sym' }); const r = osl.apply(this, arguments); if (KILL === 'links' && /local-nuget$/.test(String(p))) self(); return r; };",
    "const osp = cp.spawnSync; cp.spawnSync = function (c, a) { const gi = c === 'git' && a && a[0] === 'init'; if (gi) log({ k: 'init' }); const r = osp.apply(this, arguments); if (gi && KILL === 'init') self(); return r; };",
    "const oex = cp.execSync; cp.execSync = function (cmd) { const r = oex.apply(this, arguments); if (KILL === 'gate1' && /--check/.test(String(cmd))) self(); return r; };",
    "syncBuiltinESMExports();",
    "fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify({ k: 'spy' }) + '\\n');",
  ].join('\n') + '\n';
  const SPY_FILE = join(D, 'spy.mjs');
  W(SPY_FILE, SPY);
  const SRCS = { 'src/styles/tokens.css': 'a', 'src/styles/chat-pattern.css': 'b' };
  const BUILT = { 'spixi.tokens.css': 'a', 'spixi.chat-pattern.css': 'b' };
  const FAKE_LEAN = 'export const stripCssLean = (s) => s;\nexport const stripJsComments = (s) => s;\n';
  const FAKE_XC = ["import { appendFileSync, existsSync } from 'node:fs';", "const hold = (w) => { if (!(process.env.FAKE_HOLD || '').split(',').includes(w)) return; const t0 = Date.now(); while (!existsSync(process.env.FAKE_GO)) { if (Date.now() - t0 > 20000) { appendFileSync(process.env.FAKE_LOG, JSON.stringify({ k: 'timeout', w }) + '\\n'); process.exit(99); } Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10); } };", "appendFileSync(process.env.FAKE_LOG, JSON.stringify({ k: 'xc' }) + '\\n');", "hold('xc');", "if (process.env.FAKE_XC_ERR) process.stderr.write('cross-check noise\\n');", "process.exit(0);"].join('\n') + '\n';

  let counter = 0;
  /** one run of the script text `text` in a fresh fake tree. opts: { args, core (default true), noGit, env } */
  const run = (text, opts = {}) => new Promise((resolve) => {
    const n = ++counter;
    const S = join(D, 'r' + n), R = join(S, 'fake'), TM = join(S, 'tmp'), LOG = join(S, 'calls.log'), NOGIT = join(S, 'nogit');
    mkdirSync(TM, { recursive: true }); mkdirSync(NOGIT, { recursive: true });
    W(join(R, 'scripts', 'smoke-packaged.mjs'), text);
    W(join(R, 'scripts', 'strip-release.mjs'), STRIP); W(join(R, 'scripts', 'smoke-test.mjs'), SUITE);
    W(join(R, 'scripts', 'lib', 'lean-strip.mjs'), FAKE_LEAN); W(join(R, 'scripts', 'pins-perflean', 'x-parser-crosscheck.mjs'), FAKE_XC);
    W(join(R, 'scripts', 'pins-perflean', 'lean-expected-reds.json'), '{"copy":[],"css":[],"js":[]}\n');
    W(join(R, 'Spixi', 'Resources', 'Raw', 'html', 'index.txt'), 'a packaged file\n');
    for (const [f, t] of Object.entries(SRCS)) W(join(R, f), t);
    for (const [f, t] of Object.entries(BUILT)) W(join(R, 'Spixi', 'Resources', 'Raw', 'html', f), t);
    W(join(R, '.gitignore'), 'node_modules/\n');
    W(join(R, 'node_modules', 'marker.txt'), 'NM'); W(join(R, 'local-nuget', 'marker.txt'), 'LN');
    if (opts.core !== false) W(join(S, 'Ixian-Core', 'marker.txt'), 'IC');
    const env = { ...process.env, ...(opts.env || {}), FAKE_LOG: LOG, FAKE_GO: join(S, 'go'), TMPDIR: TM, TEMP: TM, TMP: TM };
    for (const k of Object.keys(env)) if (k === 'SPIXI_PACKAGED_FROM' || k === 'SPIXI_PACKAGED_LEAN' || /^GIT_/i.test(k)) delete env[k];
    let snap = null;
    if (opts.callerGit) {   // a caller that exported git variables which point at ITS OWN repository (git is the pin host's, not the child's PATH)
      const C = join(S, 'caller');
      mkdirSync(C, { recursive: true });
      const gi = spawnSync('git', ['init', '-q'], { cwd: C, env });
      if (gi.status !== 0) throw new Error('the pin needs git to make its scratch caller repository: ' + (gi.error ? gi.error.message : 'exit ' + gi.status));
      try { rmSync(join(C, '.git', 'description')); } catch (_) { /* the template file is absent */ }   // a re-init would write it back: the snapshot sees it
      snap = () => { const o = []; const w = (d) => { for (const e of rds(d, { withFileTypes: true })) { const q = d + '/' + e.name; if (e.isDirectory()) w(q); else { const st = lstatSync(q); o.push(q.slice(C.length) + ':' + st.size + ':' + st.mtimeMs); } } }; w(C); return o.sort().join('|'); };
      snap.before = snap();
      Object.assign(env, { GIT_DIR: join(C, '.git'), GIT_WORK_TREE: C, GIT_INDEX_FILE: join(C, '.git', 'index'), GIT_COMMON_DIR: join(C, '.git'), GIT_OBJECT_DIRECTORY: join(C, '.git', 'objects'), GIT_ALTERNATE_OBJECT_DIRECTORIES: join(S, 'nowhere') });
      W(join(S, 'tpl', 'description'), 'LEAKED');   // a template dir whose description a leaked GIT_TEMPLATE_DIR would copy into the copy's .git
      W(join(S, 'home', '.gitconfig'), '[init]\n\ttemplateDir = ' + nz(join(S, 'tpl')) + '\n');   // the user's own config names the template dir too
      Object.assign(env, { HOME: join(S, 'home'), USERPROFILE: join(S, 'home'), XDG_CONFIG_HOME: join(S, 'home', 'xdg'), GIT_TEMPLATE_DIR: join(S, 'tpl'), GIT_CONFIG_PARAMETERS: "'core.abbrev=12'", GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'core.abbrev', GIT_CONFIG_VALUE_0: '12', GIT_CONFIG_GLOBAL: join(S, 'nowhere.cfg'), GIT_CONFIG_SYSTEM: join(S, 'nowhere.cfg'), GIT_CONFIG_NOSYSTEM: '1', GIT_CEILING_DIRECTORIES: S, GIT_DISCOVERY_ACROSS_FILESYSTEM: '1' });
    }
    if (opts.noGit) { for (const k of Object.keys(env)) if (/^path$/i.test(k)) delete env[k]; env.PATH = NOGIT; }
    const child = spawn(process.execPath, ['--import', 'file://' + nz(SPY_FILE).replace(/^([A-Za-z]):/, '/$1:'), join(R, 'scripts', 'smoke-packaged.mjs'), ...(opts.args || [])], { cwd: S, env, detached: !!opts.signal && process.platform !== 'win32' });
    let out = '', err = '';
    const t0 = Date.now();
    const to = setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch (_) { child.kill('SIGKILL'); } }, 90000);
    // THE HANDSHAKE (no fixed times): the stand-in named in FAKE_HOLD logs "started" and WAITS for the go file; the pin waits for that log line, does its
    // act (a signal; closing a pipe), and only then writes the go file. A stand-in that waits 20 s for it logs "timeout" and exits 99: the row FAILS, never passes.
    const goFile = join(S, 'go');
    const go = () => { try { writeFileSync(goFile, 'go'); } catch (_) { /* the folder is gone */ } };
    const started = opts.signal ? (opts.signal.on === 'strip' ? '"k":"strip"' : opts.signal.on === 'xc' ? '"k":"xc"' : '"k":"suite"') : opts.closeErr ? '"k":"xc"' : null;
    let poll = null;
    if (started) poll = setInterval(() => {
      if (!((rd(LOG) || '').includes(started) || Date.now() - t0 > 30000)) return;
      clearInterval(poll);
      if (opts.signal) { try { process.kill(opts.signal.to === 'group' ? -child.pid : child.pid, opts.signal.sig); } catch (_) { /* gone already */ } }
      if (opts.closeErr) child.stderr.destroy();   // the reader of stderr goes away while the cross-check holds
      go();
    }, 10);
    child.stdout.on('data', (d) => { out += d; if (opts.closePipe) { child.stdout.destroy(); go(); } });   // closePipe: the reader goes away after the first chunk (`| head -1`), then the held copy goes on
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', (code, signal) => {
      clearTimeout(to); if (poll) clearInterval(poll);
      if (opts.signal && process.platform !== 'win32') { try { process.kill(-child.pid, 'SIGKILL'); } catch (_) { /* nothing left */ } }   // reap a sleeping suite
      const log = (rd(LOG) || '').replace(/\r/g, '');
      const calls = log.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (_) { return { k: '?', raw: l }; } });
      resolve({
        code, signal, out: out.replace(/\r/g, ''), err: err.replace(/\r/g, ''), calls, S, R, TM, spy: calls.some((c) => c.k === 'spy'),
        suite: calls.find((c) => c.k === 'suite') || null, strips: calls.filter((c) => c.k === 'strip'), rms: calls.filter((c) => c.k === 'rm'),
        ms: Date.now() - t0, tmpLeft: rds(TM), callerBefore: snap ? snap.before : null, callerAfter: snap ? snap() : null, markers: [rd(join(R, 'node_modules', 'marker.txt')), rd(join(R, 'local-nuget', 'marker.txt')), rd(join(S, 'Ixian-Core', 'marker.txt'))],
      });
    });
  });
  const linksIn = (d) => { const o = []; const w = (p) => { let es; try { es = rds(p, { withFileTypes: true }); } catch (_) { return; } for (const e of es) { const q = p + '/' + e.name; if (e.isSymbolicLink()) o.push(q); else if (e.isDirectory()) w(q); } }; w(d); return o; };
  const rmOfTmp = (r) => r.rms.filter((c) => /spixi-packaged-[^/\\]+$/.test(nz(c.path)));

  /* ---------- every scenario, as promises; evaluate() turns the results into the row verdicts ---------- */
  const scenarios = (text) => ({
    good: run(text), fail: run(text, { env: { FAKE_SUITE: 'fail' } }), stripFail: run(text, { env: { FAKE_STRIP_FAIL: '1' } }),
    keep: run(text, { args: ['--keep'] }), noCore: run(text, { core: false }), noGit: run(text, { noGit: true }), lean: run(text, { args: ['--lean-css'] }),
    envP: run(text, { callerGit: true }), envL: run(text, { callerGit: true, args: ['--lean-css'] }),
    ...(process.platform === 'win32' ? {} : {
      sigGP: run(text, { env: { FAKE_SUITE: 'nap', FAKE_HOLD: 'suite' }, signal: { to: 'group', sig: 'SIGINT' } }),
      sigGL: run(text, { env: { FAKE_SUITE: 'nap', FAKE_HOLD: 'suite' }, args: ['--lean-css'], signal: { to: 'group', sig: 'SIGINT' } }),
      sigPP: run(text, { env: { FAKE_SUITE: 'nap', FAKE_HOLD: 'suite' }, signal: { to: 'parent', sig: 'SIGTERM' } }),
      sigPL: run(text, { env: { FAKE_SUITE: 'nap', FAKE_HOLD: 'suite' }, args: ['--lean-css'], signal: { to: 'parent', sig: 'SIGTERM' } }),
      sigQ: run(text, { env: { FAKE_SUITE: 'nap', FAKE_HOLD: 'suite' }, signal: { to: 'group', sig: 'SIGQUIT' } }),
      sigSP: run(text, { env: { FAKE_HOLD: 'strip' }, signal: { to: 'parent', sig: 'SIGTERM', on: 'strip' } }),
      sigH: run(text, { env: { FAKE_SUITE: 'nap', FAKE_HOLD: 'suite' }, signal: { to: 'group', sig: 'SIGHUP' } }),
      sigA: run(text, { env: { FAKE_SUITE: 'nap', FAKE_HOLD: 'suite' }, signal: { to: 'group', sig: 'SIGALRM' } }),
      epP: run(text, { env: { FAKE_HOLD: 'copy' }, closePipe: true }),
      epL: run(text, { env: { FAKE_HOLD: 'copy' }, args: ['--lean-css'], closePipe: true }),
      epE: run(text, { env: { FAKE_HOLD: 'xc', FAKE_XC_ERR: '1' }, args: ['--lean-css'], closeErr: true }),
      xcL: run(text, { env: { FAKE_HOLD: 'xc' }, args: ['--lean-css'], signal: { to: 'parent', sig: 'SIGTERM', on: 'xc' } }),
      ...Object.fromEntries(['copy', 'init', 'links', 'gate1'].flatMap((ph) => [['k_' + ph + '_p', run(text, { env: { FAKE_KILL: ph } })], ['k_' + ph + '_l', run(text, { env: { FAKE_KILL: ph }, args: ['--lean-css'] })]])),
      sigSL: run(text, { env: { FAKE_HOLD: 'strip' }, args: ['--lean-css'], signal: { to: 'parent', sig: 'SIGTERM', on: 'strip' } }),
    }),
  });
  const evaluate = async (text) => {
    const s = scenarios(text);
    const [good, fail, stripFail, keep, noCore, noGit, lean, envP, envL] = await Promise.all([s.good, s.fail, s.stripFail, s.keep, s.noCore, s.noGit, s.lean, s.envP, s.envL]);
    const xr = {};
    await Promise.all(Object.keys(s).filter((k) => /^(sigH|sigA|epP|epL|epE|xcL|k_)/.test(k)).map(async (k) => { xr[k] = await s[k]; }));
    const [sigGP, sigGL, sigPP, sigPL, sigQ, sigSP, sigSL] = await Promise.all([s.sigGP, s.sigGL, s.sigPP, s.sigPL, s.sigQ, s.sigSP, s.sigSL]);   // (undefined on win32: no process groups)
    const R = {};
    const why = {};
    const row = (k, cond, text2) => { R[k] = !!cond; why[k] = text2; };
    const spyOk = [good, fail, stripFail, keep, noCore, noGit, lean, envP, envL, ...(sigGP ? [sigGP, sigGL, sigPP, sigPL, sigQ, sigSP, sigSL, ...Object.values(xr)] : [])].every((r) => r.spy);
    const timedOut = [good, fail, stripFail, keep, noCore, noGit, lean, envP, envL, ...(sigGP ? [sigGP, sigGL, sigPP, sigPL, sigQ, sigSP, sigSL, ...Object.values(xr)] : [])].filter((r) => r.calls.some((c) => c.k === 'timeout')).length;
    row('spy', spyOk && timedOut === 0, 'the rmSync spy was loaded in every run (node --import); no stand-in timed out waiting for the go file (' + timedOut + ' did)');
    // A
    const gs = good.suite;
    row('A', good.code === 0 && gs && gs.git.inside === true && gs.git.prefix === '' && gs.git.dotGit === true,
      'good run exit ' + good.code + ', the suite saw git ' + J(gs && gs.git));
    // B
    row('B', noGit.code === 1 && /git init -q failed/.test(noGit.err) && !noGit.suite && noGit.strips.length === 0 && noGit.tmpLeft.length === 0 && /^smoke-packaged: GATE 2 FAILED — git init -q failed/m.test(noGit.err),
      'no git: exit ' + noGit.code + ', suite ' + (noGit.suite ? 'RAN' : 'not run') + ', strips ' + noGit.strips.length + ', temp left ' + J(noGit.tmpLeft) + ', err ' + J(noGit.err.slice(0, 160)));
    // C
    row('C', good.code === 0 && gs && gs.core === 'IC' && !/no Ixian-Core sibling/.test(good.out),
      'the suite read ../Ixian-Core/marker.txt = ' + J(gs && gs.core) + (/no Ixian-Core sibling/.test(good.out) ? ' and the "no sibling" line was printed' : ''));
    // D
    const [s0, s1] = good.strips;
    const copyRawOk = s0 && s0.args.length === 3 && /\/spixi-packaged-[^/]+\/Spixi\/Spixi\/Resources\/Raw\/html$/.test(nz(s0.args[1]));
    row('D', good.strips.length === 2 && copyRawOk && s0.args[0] === '--out' && s0.args[2] === '--in-place'
      && /\/spixi-packaged-[^/]+\/Spixi\/scripts\/strip-release\.mjs$/.test(nz(s0.script))
      && s1 && J(s1.args) === J(['--check', s0.args[1]]) && rp(s1.script) === rp(join(good.R, 'scripts', 'strip-release.mjs')),
      'strip calls ' + J(good.strips.map((c) => [nz(c.script).split('/').slice(-3).join('/'), c.args.map((a) => nz(a).split('/').slice(-4).join('/'))])).slice(0, 400));
    // E
    const lines = noCore.out.split('\n').filter((l) => /no Ixian-Core sibling/.test(l));
    row('E', noCore.code === 0 && lines.length === 1 && /^smoke-packaged: no Ixian-Core sibling at .+ — the rows that read the Ixian-Core sibling \(three were red without it: #1101 F-1b, A10, S14\) will be red$/.test(lines[0]) && noCore.suite && noCore.suite.core === null && /GATE 2 OK/.test(noCore.out),
      'no Core: exit ' + noCore.code + ', the line ×' + lines.length + ' ' + J((lines[0] || '').slice(0, 140)) + ', suite ' + (noCore.suite ? 'ran, core=' + J(noCore.suite.core) : 'did NOT run'));
    // F1
    const rg = rmOfTmp(good);
    row('F1', good.code === 0 && rg.length === 1 && rg[0].links.length === 0 && good.tmpLeft.length === 0,
      'good run: recursive deletes of the temp folder ×' + rg.length + (rg[0] ? ', links still inside then: ' + J(rg[0].links.map((l) => nz(l).split('/').slice(-2).join('/'))) : '') + ', temp left ' + J(good.tmpLeft));
    // F2
    const fr = [fail, stripFail].map((r) => ({ r, rm: rmOfTmp(r) }));
    row('F2', fr.every(({ r, rm }) => rm.length === 1 && rm[0].links.length === 0 && r.tmpLeft.length === 0),
      fr.map(({ r, rm }, i) => ['suite fail', 'strip fail'][i] + ': exit ' + r.code + ', deletes ×' + rm.length + (rm[0] ? ' links inside ' + rm[0].links.length : '') + ', temp left ' + J(r.tmpLeft)).join(' · '));
    // F3
    const kept = keep.tmpLeft.length === 1 ? join(keep.TM, keep.tmpLeft[0]) : null;
    const keptLine = /smoke-packaged: copy kept at (.+?) \(/.exec(keep.out);
    row('F3', keep.code === 0 && kept && rmOfTmp(keep).length === 0 && linksIn(kept).length === 0 && ex(join(kept, 'Spixi', 'scripts', 'smoke-packaged.mjs')) && ex(join(kept, 'Spixi', 'Spixi', 'Resources', 'Raw', 'html', 'index.txt'))
      && keptLine && rp(keptLine[1]) === rp(kept) && !ex(join(kept, 'Ixian-Core')) && !ex(join(kept, 'Spixi', 'node_modules')) && !ex(join(kept, 'Spixi', 'local-nuget')),
      '--keep: exit ' + keep.code + ', folders left ' + J(keep.tmpLeft) + ', links in the kept copy ' + J(kept ? linksIn(kept).map((l) => nz(l).split('/').slice(-2).join('/')) : 'n/a') + ', "copy kept" line ' + (keptLine ? 'yes' : 'NO'));
    // G
    row('G', gs && gs.nm === 'NM' && gs.ln === 'LN' && J(good.markers) === J(['NM', 'LN', 'IC']) && J(keep.markers) === J(['NM', 'LN', 'IC']) && J(fail.markers) === J(['NM', 'LN', 'IC']),
      'node_modules / local-nuget markers read in the run ' + J(gs && [gs.nm, gs.ln]) + ' · after: good ' + J(good.markers) + ', keep ' + J(keep.markers) + ', fail ' + J(fail.markers));
    // H1
    row('H1', good.out.split('\n').includes('smoke-packaged: BASELINE OK — 4711 pass / the 2 KNOWN pre-exister(s): fake one, fake two'),
      'the verdict line of the stand-in suite is printed: ' + J(good.out.split('\n').filter((l) => /BASELINE|verdict/.test(l)).slice(-2)));
    // H2
    row('H2', good.code === 0 && /smoke-packaged: GATE 2 OK/.test(good.out) && fail.code === 1 && /smoke-packaged: GATE 2 FAILED — the packaged tree does not pass the suite/.test(fail.err)
      && /✗ fake red row of the stand-in suite/.test(fail.out) && /FAILED:/.test(fail.err) && /\(no verdict line — see FAILED below\)/.test(fail.out)
      && stripFail.code === 1 && /smoke-packaged: GATE 2 FAILED — Command failed/.test(stripFail.err) && !stripFail.suite,
      'suite 0 → exit ' + good.code + ' · suite 1 → exit ' + fail.code + ' · package strip fails → exit ' + stripFail.code + ' (suite ' + (stripFail.suite ? 'RAN' : 'not run') + '), err ' + J(fail.err.trim().split('\n').pop().slice(0, 100)));
    // L
    const ls = lean.suite;
    row('L', ls && ls.lean === 'css' && ls.git.inside === true && ls.git.prefix === '' && ls.git.dotGit === true,
      'lean run: suite ' + (ls ? 'ran, git ' + J(ls.git) + ', lean=' + J(ls.lean) : 'did NOT run — exit ' + lean.code + ' · ' + (lean.err.trim().split('\n').pop() || lean.out.trim().split('\n').pop() || '').slice(0, 160)));
    // S: a stop signal still runs the clean-up (plain and lean); T: the one line at the start
    if (sigGP) {
      // (that no link is left at the delete, and the markers, are rows F1 / F2 / G: the signal paths use the same finally, so those rows' breaks would also fail this one — the link counts are only printed)
      const clean = (r) => rmOfTmp(r).length === 1 && r.tmpLeft.length === 0;
      const g = [['plain', sigGP], ['lean', sigGL], ['plain Ctrl-\\ SIGQUIT', sigQ], ['plain SIGHUP', xr.sigH], ['plain SIGALRM', xr.sigA]].map(([n, r]) => ({ n, r, fine: r.code === 1 && !r.signal && r.ms < 25000 && clean(r) && !!r.suite }));
      const pa = [['plain', sigPP], ['lean', sigPL]].map(([n, r]) => ({ n, r, fine: r.code === 1 && !r.signal && clean(r) && /GATE 2 OK/.test(r.out) && !!r.suite }));
      row('S', g.every((x) => x.fine) && pa.every((x) => x.fine),
        'Ctrl-C (SIGINT to the group): ' + g.map((x) => x.n + ' exit ' + x.r.code + (x.r.signal ? ' ' + x.r.signal : '') + ' after ' + x.r.ms + ' ms, links at the delete ' + J(rmOfTmp(x.r).map((c) => c.links.length)) + ', temp left ' + J(x.r.tmpLeft)).join(' · ')
        + ' || kill (SIGTERM to the script alone, suite passes): ' + pa.map((x) => x.n + ' exit ' + x.r.code + (x.r.signal ? ' ' + x.r.signal : '') + ', ' + (/GATE 2 OK/.test(x.r.out) ? 'GATE 2 OK printed' : 'NO GATE 2 OK') + ', links at the delete ' + J(rmOfTmp(x.r).map((c) => c.links.length)) + ', temp left ' + J(x.r.tmpLeft)).join(' · '));
      // P: a stop while no child runs (the strip sleeps; SIGTERM to the script alone): cut short at the stop point after the strip — no GATE 1, no suite, exit 1, nothing left
      const ph = [['plain', sigSP], ['lean', sigSL]].map(([n, r]) => ({ n, r, fine: r.code === 1 && !r.signal && !r.suite && r.strips.length === 1 && r.tmpLeft.length === 0 && /stopped by SIGTERM/.test(r.err + r.out) }));
      ph.push({ n: 'lean after the cross-check', r: xr.xcL, fine: xr.xcL.code === 1 && !xr.xcL.suite && xr.xcL.strips.length === 2 && xr.xcL.tmpLeft.length === 0 && /stopped by SIGTERM/.test(xr.xcL.err + xr.xcL.out) });
      // a signal to itself right after each phase (the spy): the NEXT phase must not start
      const cnt = (r, k) => r.calls.filter((c) => c.k === k).length;
      const need = { copy: (r) => cnt(r, 'init') === 0 && cnt(r, 'sym') === 0 && r.strips.length === 0, init: (r) => r.strips.length === 0 && (r.tag === 'lean' || cnt(r, 'sym') === 0), links: (r) => r.strips.length === 0, gate1: (r) => r.strips.length === 2 };
      for (const phz of Object.keys(need)) for (const [w, tag] of [['p', 'plain'], ['l', 'lean']]) { const r = xr['k_' + phz + '_' + w]; r.tag = tag; ph.push({ n: tag + ' kill after ' + phz, r, fine: r.code === 1 && !r.signal && !r.suite && r.tmpLeft.length === 0 && /stopped by SIGTERM/.test(r.err + r.out) && need[phz](r) }); }
      row('P', ph.every((x) => x.fine), ph.filter((x) => !x.fine).map((x) => 'NOT FINE: ' + x.n + ' (strips ' + x.r.strips.length + ', inits ' + x.r.calls.filter((c) => c.k === 'init').length + ', syms ' + x.r.calls.filter((c) => c.k === 'sym').length + ')').join(' | ') + ' || ' + ph.slice(0, 2).map((x) => x.n + ': exit ' + x.r.code + ', strips ' + x.r.strips.length + ', suite ' + (x.r.suite ? 'RAN' : 'not run') + ', temp left ' + J(x.r.tmpLeft) + ', ' + (/stopped by SIGTERM/.test(x.r.err + x.r.out) ? 'stop line printed' : 'NO stop line')).join(' · '));
    } else { R.S = true; R.P = true; why.S = why.P = 'SKIPPED on win32: no process groups, no signal to send'; }
    const startLine = (r) => r.out.split('\n').filter((l) => /^smoke-packaged: temp folder /.test(l));
    const startOk = (r) => { const l = startLine(r); const m = l.length === 1 && /^smoke-packaged: temp folder (.+?) — if this run is stopped, remove the links in it first \(node_modules, local-nuget, \.\.\/Ixian-Core\), then the folder$/.exec(l[0]); return !!m && /\/spixi-packaged-[^/]+$/.test(nz(m[1])) && rp(dirname(m[1])) === rp(r.TM) && r.out.indexOf(l[0]) < r.out.indexOf('copying the tree'); };
    row('T', startOk(good) && startOk(lean), 'plain: ' + J(startLine(good).map((l) => l.slice(0, 150))) + ' · lean: ' + J(startLine(lean).map((l) => l.slice(0, 150))));
    // X: a closed output pipe (`| head -1`) is a stop, not a crash that leaves the links
    if (xr.epP) {
      const xs = [['plain', xr.epP], ['lean', xr.epL]].map(([n, r]) => ({ n, r, fine: r.code === 1 && !r.suite && r.tmpLeft.length === 0 && /stopped by EPIPE/.test(r.err) }));
      // stderr's reader goes away while the cross-check holds; its noise is the first write to the dead stderr (no stop line can be seen then: the proof is no crash, no suite, nothing left)
      xs.push({ n: 'lean, stderr closed', r: xr.epE, fine: xr.epE.code === 1 && !xr.epE.suite && xr.epE.tmpLeft.length === 0 && xr.epE.strips.length === 2 });
      row('X', xs.every((x) => x.fine), xs.map((x) => x.n + ': exit ' + x.r.code + ', suite ' + (x.r.suite ? 'RAN' : 'not run') + ', temp left ' + J(x.r.tmpLeft) + ', ' + (/stopped by EPIPE/.test(x.r.err) ? 'stop line printed' : 'NO stop line: ' + J(x.r.err.trim().split('\n').slice(0, 2).join(' / ').slice(0, 140)))).join(' · '));
    } else { R.X = true; why.X = 'SKIPPED on win32'; }
    // Q: the plain suite is told the COMMITTED tree's Raw/html
    row('Q', gs && rp(gs.from) === rp(join(good.R, 'Spixi', 'Resources', 'Raw', 'html')), 'SPIXI_PACKAGED_FROM seen by the suite: ' + J(gs && gs.from));
    // N: a caller's exported GIT_* variables reach neither `git init -q` nor the copy's suite (plain and lean)
    const envOk = (r, name) => {
      const su = r.suite;
      const fine = su && r.callerBefore && r.callerBefore === r.callerAfter && su.genv.length === 0 && su.desc !== 'LEAKED' && !(su.absGitDir && rp(su.absGitDir) === rp(join(r.S, 'caller', '.git')));   // (whether the copy IS a work tree is A / L, not this row)
      return { fine: !!fine, text: name + ': caller repo ' + (r.callerBefore === r.callerAfter ? 'unchanged' : 'CHANGED') + ', suite saw GIT_* ' + J(su && su.genv) + ', template description ' + J(su && su.desc && su.desc.slice(0, 20)) + ', its git dir (must not be the caller\'s) ' + J(su && su.absGitDir && nz(su.absGitDir).split('/').slice(-3).join('/')) };
    };
    const np = envOk(envP, 'plain'), nl = envOk(envL, 'lean');
    row('N', np.fine && nl.fine && envP.code === 0, np.text + ' · ' + nl.text);
    return { R, why };
  };

  /* ---------- the real rows ---------- */
  const real = await evaluate(realText);   // (no re-run of a mismatch: the stand-ins hold for a handshake, not for a time, so nothing here races)
  const LABEL = {
    A: 'A the suite sees the copy as a git work tree at its top level (`git init -q` in the copy)',
    B: 'B git missing (empty PATH): exit 1 with "git init -q failed", the strip and the suite never ran, no temp folder left',
    C: 'C ../Ixian-Core is readable from the copy while the suite runs (the Core sibling is linked next to the copy), and no "no sibling" line is printed',
    D: 'D the copy\'s strip got exactly `--out <copyRaw> --in-place` (its own script); GATE 1 is the committed tree\'s script with `--check <copyRaw>`',
    E: 'E without a Core sibling ONE line "no Ixian-Core sibling … the rows that read the Ixian-Core sibling (three were red without it) … will be red" is printed, the run still runs the suite (exit 0) and the suite sees no Core',
    F1: 'F1 a good run: no link is left inside the temp folder at its recursive delete (the order), and no temp folder is left',
    F2: 'F2 a failing run (the suite exits 1; the package strip exits 1): no link at the recursive delete, no temp folder left',
    F3: 'F3 --keep: the kept copy holds no link (walked) and holds the copied files, the run names it, nothing else is left',
    G: 'G node_modules, local-nuget and the Core sibling were readable through their links during the run and keep their markers after it (good, --keep, failing)',
    H1: 'H1 the verdict line printed is the stand-in suite\'s own line (BASELINE OK — 4711 pass …)',
    H2: 'H2 the exit status is the suite\'s: 0 + "GATE 2 OK" for a suite that exits 0; 1 + "GATE 2 FAILED", its red row and its FAILED block for one that exits 1',
    S: 'S a stop signal still runs the clean-up, plain and lean: Ctrl-C (SIGINT to the process group, the suite sleeping; also Ctrl-\\ = SIGQUIT, plain) ends the run at once with exit 1, no temp folder left; a SIGTERM to the script ALONE is held until the suite has ended (it passes, GATE 2 OK) and then the same clean-up runs and the exit is 1 (the links at the delete are printed; their removal is F1 / F2)',
    P: 'P a stop that comes while no child runs is noted and the run is cut short at the stop point of that phase, plain and lean: the strip sleeps (SIGTERM to the script alone), the cross-check sleeps (lean), and a signal the script sends to itself right after the copy, git init, the links and GATE 1 (the spy) — the NEXT phase never starts, no suite, exit 1, no temp folder left',
    X: 'X a closed output pipe (the reader goes away after the first line, like `| head -1`) is noted as a stop: exit 1, "stopped by EPIPE", no suite, no temp folder left (plain and lean)',
    Q: 'Q the plain suite gets SPIXI_PACKAGED_FROM = the COMMITTED tree\'s Spixi/Resources/Raw/html (not the copy\'s)',
    T: 'T ONE line at the start of both paths names the temp folder (the real one) and says to remove the links in it first (node_modules, local-nuget, ../Ixian-Core), then the folder',
    N: 'N a caller\'s exported GIT_DIR / GIT_WORK_TREE / GIT_INDEX_FILE / GIT_COMMON_DIR / GIT_OBJECT_DIRECTORY / GIT_ALTERNATE_OBJECT_DIRECTORIES (plain and lean): the caller\'s repository is byte-unchanged after the run, the stand-in suite sees no name that starts with GIT_ (also the config / template / ceiling ones; GIT_EXEC_PATH is kept) and a template dir does not reach the copy and does not take the caller\'s repository as its git dir',
    L: 'L the LEAN path (--lean-css) makes the copy a git work tree too (seen from the lean run\'s suite)',
  };
  ok(real.R.spy, T + ' the fixture: ' + real.why.spy);
  for (const k of Object.keys(LABEL)) ok(real.R[k] === true, T + ' ' + LABEL[k] + ' — ' + real.why[k]);

  /* ---------- the breaks: each mutated copy of the script must fail EXACTLY its row ---------- */
  const once = (text, from) => text.split(from).length - 1;
  const BREAKS = [
    ['A', 'git init runs in the PARENT of the copy (the copy is inside a work tree, not at its top)', [["  gitInitCopy(copy);\n  await stopPoint();   // plain: after git init", "  gitInitCopy(tmp);\n  await stopPoint();   // plain: after git init"]]],
    ['B', 'a failed `git init` (also a missing git) is swallowed', [["if (r.error || r.status !== 0) throw new Error('git init -q failed in the copy", "if (false) throw new Error('git init -q failed in the copy"]]],
    ['C', 'the Core sibling is never linked', [["if (existsSync(join(root, '..', 'Ixian-Core'))) plainLink(", "if (false) plainLink("]]],
    ['D', 'the copy\'s strip is called without --in-place', [["+ q(copyRaw) + ' --in-place', { stdio", "+ q(copyRaw), { stdio"]]],
    ['E', 'the "no Ixian-Core sibling" line is not printed', [["else console.log('smoke-packaged: no Ixian-Core sibling at '", "else void ('smoke-packaged: no Ixian-Core sibling at '"]]],
    ['F1', 'a SUCCESSFUL run (without --keep) deletes the folder before it removes the links', [["const stuck = removeLinks(plainLinks);", "const stuck = (plainCode === 0 && !keep ? [] : removeLinks(plainLinks));"]]],
    ['F2', 'a FAILING run deletes the folder before it removes the links', [["const stuck = removeLinks(plainLinks);", "const stuck = (plainCode !== 0 ? [] : removeLinks(plainLinks));"]]],
    ['F3', 'a --keep run leaves the links in the kept copy', [["const stuck = removeLinks(plainLinks);", "const stuck = (keep ? [] : removeLinks(plainLinks));"]]],
    ['G', 'the clean-up deletes the CONTENTS of each linked folder (through the link) before it removes the link', [["const stuck = removeLinks(plainLinks);", "const stuck = (await (async () => { const fsx = await import('node:fs'); for (const l of plainLinks) for (const f of fsx.readdirSync(l)) fsx.rmSync(join(l, f), { recursive: true, force: true }); })(), removeLinks(plainLinks));"]]],
    ['H1', 'the verdict line is not found in the suite output', [["/BASELINE OK|smoke test CLEAN/.test(l)", "/NEVER MATCHES HERE/.test(l)"]]],
    ['H2', 'a failing suite no longer sets the exit status', [["the packaged tree does not pass the suite'); plainCode = 1;", "the packaged tree does not pass the suite'); plainCode = 0;"]]],
    ['N', '`git init -q` keeps the caller\'s git variables', [["{ cwd: dir, encoding: 'utf8', env: gitFreeEnv(process.env) }", "{ cwd: dir, encoding: 'utf8', env: process.env }"]]],
    ['N', 'the PLAIN suite keeps the caller\'s git variables', [["env: gitFreeEnv({ ...process.env, SPIXI_PACKAGED_FROM: join(root, 'Spixi'", "env: ({ ...process.env, SPIXI_PACKAGED_FROM: join(root, 'Spixi'"]]],
    ['N', 'the LEAN suite keeps the caller\'s git variables', [["env: gitFreeEnv({ ...process.env, SPIXI_PACKAGED_FROM: rootRaw", "env: ({ ...process.env, SPIXI_PACKAGED_FROM: rootRaw"]]],
    ['N', 'one name (GIT_CONFIG_COUNT) is kept', [["k.toUpperCase() !== 'GIT_EXEC_PATH') delete", "k.toUpperCase() !== 'GIT_CONFIG_COUNT') delete"]]],
    ['N', 'only the first six names are removed (the config / template / ceiling ones stay)', [["if (/^GIT_/i.test(k) &&", "if (/^GIT_(DIR|WORK_TREE|INDEX_FILE|COMMON_DIR|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES)$/i.test(k) &&"]]],
    ['S+P', 'no stop-signal handler (the run dies with its links; the shared mechanism, so S and P both fail)', [["for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT', 'SIGBREAK', 'SIGALRM', 'SIGXCPU', 'SIGVTALRM']) process.on(sig, () => { stop.sig = sig; });", ""]]],
    ['S', 'a noted signal does not change the exit status of a finished run (plain and lean)', [["process.exitCode = stop.sig && plainCode === 0 ? 1 : plainCode;", "process.exitCode = plainCode;"], ["process.exit(stop.sig && leanCode === 0 ? 1 : leanCode);", "process.exit(leanCode);"]]],
    ['S', 'the PLAIN run does not give the event loop a turn before it sets its exit status', [["await new Promise((r) => setImmediate(r));   // one turn: ", "// no turn: "]]],
    ['S', 'the LEAN run does not give the event loop a turn before it exits', [["  await new Promise((r) => setImmediate(r));   // one turn of the event loop", "  // no turn of the event loop"]]],
    ['S', 'SIGQUIT is not handled (Ctrl-\\ ends the run with its links)', [["'SIGHUP', 'SIGQUIT', 'SIGBREAK', 'SIGALRM'", "'SIGHUP', 'SIGBREAK', 'SIGALRM'"]]],
    ['S', 'SIGHUP is not handled (a closed terminal ends the run with its links)', [["'SIGTERM', 'SIGHUP', 'SIGQUIT'", "'SIGTERM', 'SIGQUIT'"]]],
    ['S', 'SIGALRM and its family (SIGXCPU, SIGVTALRM) are not handled', [["'SIGBREAK', 'SIGALRM', 'SIGXCPU', 'SIGVTALRM']", "'SIGBREAK']"]]],
    ['X', 'the error handler is on stdout only (a closed stderr is not noted)', [["for (const st of [process.stdout, process.stderr]) st.on('error'", "for (const st of [process.stdout]) st.on('error'"]]],
    ['X', 'a closed output pipe is not noted (no stdout / stderr error handler)', [["for (const st of [process.stdout, process.stderr]) st.on('error', () => { stop.sig = stop.sig || 'EPIPE'; });", ""]]],
    ['P+X', 'no stop point after the cross-check (lean; the stderr-closed run of X ends at it too)', [["    await stopPoint();   // lean: after the cross-check", "    // no stop point"]]],
    ['P', 'no stop point after the copy (plain and lean)', [["  await stopPoint();   // plain: after the copy", "  // none"], ["    await stopPoint();   // lean: after the copy", "    // none"]]],
    ['P', 'no stop point after git init (plain)', [["  await stopPoint();   // plain: after git init", "  // none"]]],
    ['P', 'no stop point after the links (plain and lean)', [["  await stopPoint();   // plain: after the links", "  // none"], ["    await stopPoint();   // lean: after git init and the links", "    // none"]]],
    ['P', 'no stop point after GATE 1 (plain and lean)', [["  await stopPoint();   // plain: after GATE 1", "  // none"], ["    await stopPoint();   // lean: after GATE 1", "    // none"]]],
    ['P', 'no stop point after the strip (plain)', [["  await stopPoint();   // plain: after the strip", "  // no stop point"]]],
    ['P', 'no stop point after the strip (lean)', [["    await stopPoint();   // lean: after the strip", "    // no stop point"]]],
    ['N', '`git init -q` without the empty --template= (a user template reaches the copy)', [["['init', '-q', '--template=']", "['init', '-q']"]]],
    ['Q', 'the plain suite is not given SPIXI_PACKAGED_FROM', [["SPIXI_PACKAGED_FROM: join(root, 'Spixi', 'Resources', 'Raw', 'html') }),", "}),"]]],
    ['T', 'the PLAIN path prints no start line', [["const q = JSON.stringify;\nconsole.log(stopNote(tmp));", "const q = JSON.stringify;"]]],
    ['T', 'the LEAN path prints no start line', [["  console.log(stopNote(tmp));\n  const copy = join(tmp, 'Spixi');\n  const rootRaw", "  const copy = join(tmp, 'Spixi');\n  const rootRaw"]]],
    ['L', 'the lean path makes its git work tree in the PARENT of the copy', [["    gitInitCopy(copy);   // ★ leanfollow: a git work tree with no history, as in the plain run", "    gitInitCopy(tmp);   // ★ leanfollow: a git work tree with no history, as in the plain run"]]],
  ];
  const ROWS = Object.keys(LABEL);
  // the mutated scripts, one after another (each runs its seven scenarios in parallel)
  for (const [row, what, edits] of BREAKS) {
    let text = realText;
    const missing = [];
    for (const [from, to] of edits) { if (once(text, from) !== 1) missing.push(from.slice(0, 60) + ' ×' + once(text, from)); else text = text.replace(from, () => to); }
    if (missing.length) { ok(false, T + ' break ' + row + ' (' + what + '): its anchor text is not found exactly once in scripts/smoke-packaged.mjs — ' + missing.join(' | ')); continue; }
    const m = await evaluate(text);
    const red = ROWS.filter((k) => m.R[k] !== true);
    const want = row.split('+');
    ok(m.R.spy && red.length === want.length && want.every((w) => red.includes(w)),
      T + ' break ' + row + ' — ' + what + ' → exactly row ' + want.join(' + ') + ' fails (red rows: ' + J(red) + (m.R.spy ? '' : ', the spy was not loaded') + (red.length === want.length && want.every((w) => red.includes(w)) ? '; ' + m.why[want[0]].slice(0, 200) : '') + ')');
  }
  try { rmSync(D, { recursive: true, force: true }); } catch (_) { /* best effort */ }
}
