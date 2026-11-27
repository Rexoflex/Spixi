/* ==== qtools — the CI runner scripts/quality/run-ci-checks.mjs: its ENFORCED switch, its order and its pass rule.
 * A BEHAVIOUR pin: it builds a temp git repository (a base commit with a stub gate diff, then a head commit with three STUB
 * checks and a copy of the real runner), and for each case writes a copy of the runner whose one `const ENFORCED = [ … ];` line
 * (matched by pattern, exactly once) is replaced, runs it with BASE_SHA / HEAD_SHA (not in GitHub Actions; --no-a11y) and reads
 * its exit code and output. A stub reads the state file of the head tree: "ok" = its OK line + exit 0, "red" = exit 1,
 * "silent" = exit 0 with NO OK line, "okred" = its OK line + exit 1. The base's stub gate diff prints the tag `base`, the head's `head`.
 * The fixture's git runs with every GIT_* name of the caller removed (but GIT_EXEC_PATH), no global or system config and no
 * template, each git call checked, and the fixture's top level checked before the first commit (DECISIONS #1777's rule).
 * Rows:
 *   r0  the caller's GIT_DIR / GIT_INDEX_FILE pointed at another repository leave that repository's HEAD and index unchanged
 *   r1  ENFORCED empty, a red check → exit 0, a ::warning, "REPORT, red: <check>"
 *   r2  ENFORCED with that check (and gate-diff) → exit 1, an ::error, "FAILED — <check>"
 *   r3  a name outside KNOWN → exit 2 before any check runs
 *   r4  'isolation' enforced without 'gate-diff' → exit 2 before any check runs
 *   r5  the gate diff runs before the two checks of the tree under test
 *   r6  all enforced, all green → exit 0
 *   r7  an enforced check that exits 0 with no OK line → exit 1
 *   r8  a BASE_SHA that git can resolve but that is not 40 hex (12 hex) → exit 2 with "not 40 hex"
 *   r9  ENFORCED ['gate-diff'] and a red gate diff → exit 1, "FAILED — gate-diff"
 *   r10 the BASE commit's copy of gate-diff.mjs runs (tag `base`, never `head`), and its temp folder is removed
 *   r11 an enforced check that prints its OK line but exits 1 → exit 1
 *   r12 ENFORCED ['gate-diff'] with a red isolation check and a green gate diff → exit 0, a ::warning, no ::error
 * DELIBERATE BREAKS (#802), each a one-place change of the runner's text in the copy: the KNOWN test removed → r3; the
 * gate-diff-subset test removed → r4; the pass rule reduced to the exit code → r7; ENFORCED ignored in the exit → r2; the gate
 * diff moved after the isolation check → r5; the 40-hex test removed → r8; the gate diff's fail entry removed → r9; the base
 * copy skipped → r10; the exit code read as 0 → r11; every red check counted as enforced → r12. By hand (it is the pin's own
 * code, not the runner's): the GIT_* filter of gitEnv removed in a copy of this file → r0 red (run on 2026-11-27).
 * LIMITS: it does not run in GitHub Actions (the event branch, the workflow step's base copy of the runner and the fetch are
 * not exercised here; the workflow text is held by pins-leanfollow/d-ci rows 12, 17, 18); the stubs stand in for the real
 * checks, whose own pins are c-isolation, c-contract and d-gatediff. */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const STUB = (check, okLine, tag) => `import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const a = process.argv.slice(2); const i = a.indexOf('--root'); const root = i >= 0 ? a[i + 1] : process.cwd();
const st = JSON.parse(readFileSync(join(root, 'stub-state.json'), 'utf8'))[${JSON.stringify(check)}] || 'ok';
console.log('stub ${check} ${tag} ' + st);
if (st === 'red') { console.log('x → row: MISSING'); process.exit(1); }
if (st === 'ok' || st === 'okred') console.log(${JSON.stringify(okLine)});
process.exit(st === 'okred' ? 1 : 0);
`;
const ENF_RE = /const ENFORCED = \[[^\]\n]*\];/g;

/** the caller's environment with every GIT_* name removed but GIT_EXEC_PATH, a fixed identity and no global / system config */
const gitEnv = (from) => {
  const env = {};
  for (const [k, v] of Object.entries(from)) if (!/^GIT_/.test(k) || k === 'GIT_EXEC_PATH') env[k] = v;
  for (const k of ['GITHUB_ACTIONS', 'GITHUB_EVENT_NAME', 'GITHUB_EVENT_PATH', 'GITHUB_SHA', 'BASE_SHA', 'HEAD_SHA']) delete env[k];
  return { ...env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'pin', GIT_AUTHOR_EMAIL: 'pin@example.invalid',
    GIT_COMMITTER_NAME: 'pin', GIT_COMMITTER_EMAIL: 'pin@example.invalid', GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z', GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z' };
};
const gitIn = (dir, env) => (...a) => {
  const r = spawnSync('git', ['-C', dir, '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...a], { encoding: 'utf8', env });
  if (r.status !== 0) throw new Error('git ' + a.join(' ') + ' failed: ' + (r.stderr || r.error || '').toString().slice(0, 200));
  return r.stdout;
};

/** the fixture: a base commit (a stub gate diff tagged `base`) and a head commit (three stubs tagged `head` + the runner) */
function buildFixture(runnerText, callerEnv, dirs) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'qtools-runner-')));
  dirs.push(dir);
  const env = gitEnv(callerEnv);
  const g = gitIn(dir, env);
  g('init', '-q', '--template=');
  if (realpathSync(g('rev-parse', '--show-toplevel').trim()) !== dir) throw new Error('the fixture is not its own repository');
  mkdirSync(join(dir, 'scripts/quality'), { recursive: true });
  writeFileSync(join(dir, 'scripts/quality/gate-diff.mjs'), STUB('gate-diff', 'GATE-DIFF OK', 'base'));
  g('add', 'scripts/quality/gate-diff.mjs'); g('commit', '-q', '-m', 'base');
  const base = g('rev-parse', 'HEAD').trim();
  writeFileSync(join(dir, 'scripts/quality/gate-diff.mjs'), STUB('gate-diff', 'GATE-DIFF OK', 'head'));
  writeFileSync(join(dir, 'scripts/quality/isolation-check.mjs'), STUB('isolation', 'isolation-check: OK · stub', 'head'));
  writeFileSync(join(dir, 'scripts/quality/bridge-contract.mjs'), STUB('bridge-contract', 'bridge-contract: OK — stub', 'head'));
  writeFileSync(join(dir, 'scripts/quality/run-ci-checks.mjs'), runnerText);
  writeFileSync(join(dir, 'stub-state.json'), '{}');
  g('add', 'scripts', 'stub-state.json'); g('commit', '-q', '-m', 'head');
  return { dir, env, base, head: g('rev-parse', 'HEAD').trim() };
}

export default async function ({ ok, root }) {
  const T = 'QTOOLS runner';
  const runnerText = readFileSync(join(root, 'scripts/quality/run-ci-checks.mjs'), 'utf8');
  ok((runnerText.match(ENF_RE) || []).length === 1, T + ': the runner holds exactly one `const ENFORCED = [ … ];` line (the switch this pin turns)');
  const dirs = [];
  try {
    /* r0 · the caller's git variables cannot reach another repository */
    const other = realpathSync(mkdtempSync(join(tmpdir(), 'qtools-runner-other-'))); dirs.push(other);
    const go = gitIn(other, gitEnv(process.env));
    go('init', '-q', '--template='); writeFileSync(join(other, 'f'), 'x\n'); go('add', 'f'); go('commit', '-q', '-m', 'other');
    const before = go('rev-parse', 'HEAD') + readFileSync(join(other, '.git/index')).toString('base64');
    let r0 = false;
    try {
      const fx = buildFixture(runnerText, { ...process.env, GIT_DIR: join(other, '.git'), GIT_INDEX_FILE: join(other, '.git/index'), GIT_WORK_TREE: other }, dirs);
      r0 = go('rev-parse', 'HEAD') + readFileSync(join(other, '.git/index')).toString('base64') === before;
    } catch (e) { r0 = false; }
    ok(r0, T + ' r0: the caller\'s GIT_DIR / GIT_INDEX_FILE / GIT_WORK_TREE leave another repository\'s HEAD and index unchanged');

    const fx = buildFixture(runnerText, process.env, dirs);
    const { dir, env, base, head } = fx;
    const gdTemps = () => new Set(readdirSync(realpathSync(tmpdir())).filter((n) => n.startsWith('qtools-gatediff-')));
    const runCase = ({ enforced = [], state = {}, text = runnerText, baseSha = base }) => {
      const t = text.replace(ENF_RE, 'const ENFORCED = ' + JSON.stringify(enforced) + ';');
      writeFileSync(join(dir, 'case-runner.mjs'), t);
      writeFileSync(join(dir, 'stub-state.json'), JSON.stringify(state));
      const r = spawnSync(process.execPath, [join(dir, 'case-runner.mjs'), '--root', dir, '--no-a11y'],
        { encoding: 'utf8', env: { ...env, BASE_SHA: baseSha, HEAD_SHA: head }, timeout: 60000 });
      return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
    };
    const ALL = ['gate-diff', 'isolation', 'bridge-contract'];
    const rows = (text) => {
      const R = {};
      let r = runCase({ text, state: { 'bridge-contract': 'red' } });
      R.r1 = r.code === 0 && /::warning title=quality: bridge contract/.test(r.out) && /REPORT, red: bridge-contract/.test(r.out);
      r = runCase({ text, enforced: ['bridge-contract', 'gate-diff'], state: { 'bridge-contract': 'red' } });
      R.r2 = r.code === 1 && /::error title=quality: bridge contract/.test(r.out) && /FAILED — bridge-contract/.test(r.out);
      r = runCase({ text, enforced: ['bridge contract', 'gate-diff'] });
      R.r3 = r.code === 2 && !/stub /.test(r.out);
      r = runCase({ text, enforced: ['isolation'] });
      R.r4 = r.code === 2 && !/stub /.test(r.out);
      const pre = gdTemps();
      r = runCase({ text });
      const gi = r.out.indexOf('== gate diff'), ii = r.out.indexOf('== isolation check');
      R.r5 = r.code === 0 && gi >= 0 && ii > gi;
      const post = gdTemps();
      R.r10 = /stub gate-diff base ok/.test(r.out) && !/stub gate-diff head/.test(r.out) && [...post].every((n) => pre.has(n));
      r = runCase({ text, enforced: ALL });
      R.r6 = r.code === 0;
      r = runCase({ text, enforced: ALL, state: { isolation: 'silent' } });
      R.r7 = r.code === 1 && /FAILED — isolation/.test(r.out);
      r = runCase({ text, baseSha: base.slice(0, 12) });
      R.r8 = r.code === 2 && /not 40 hex/.test(r.out);
      r = runCase({ text, enforced: ['gate-diff'], state: { 'gate-diff': 'red' } });
      R.r9 = r.code === 1 && /::error title=quality: gate diff/.test(r.out) && /FAILED — gate-diff/.test(r.out);
      r = runCase({ text, enforced: ALL, state: { isolation: 'okred' } });
      R.r11 = r.code === 1 && /FAILED — isolation/.test(r.out);
      r = runCase({ text, enforced: ['gate-diff'], state: { isolation: 'red' } });
      R.r12 = r.code === 0 && /::warning title=quality: isolation/.test(r.out) && !/::error/.test(r.out);
      return R;
    };
    const LABEL = {
      r1: 'ENFORCED empty: a red check is a ::warning report and the step exits 0',
      r2: 'an enforced red check is an ::error and the step exits 1',
      r3: 'a name outside KNOWN in ENFORCED → exit 2 before any check runs',
      r4: 'isolation enforced without gate-diff → exit 2 before any check runs',
      r5: 'the gate diff runs before the checks of the tree under test',
      r6: 'all three enforced and green → exit 0',
      r7: 'an enforced check that exits 0 with no OK line fails the step',
      r8: 'a resolvable BASE_SHA that is not 40 hex → exit 2 "not 40 hex"',
      r9: 'an enforced red gate diff fails the step',
      r10: 'the BASE commit\'s copy of the gate diff runs, and its temp folder is removed',
      r11: 'an enforced check that prints its OK line but exits 1 fails the step',
      r12: 'only the enforced checks fail the step: a red isolation check beside ENFORCED [gate-diff] is a warning',
    };
    const real = rows(runnerText);
    for (const k of Object.keys(LABEL)) ok(real[k] === true, T + ' ' + k + ': ' + LABEL[k]);

    const mut = (from, to) => (runnerText.split(from).length === 2 ? runnerText.replace(from, to) : null);
    const BREAKS = [
      ['r3', 'the KNOWN test removed', mut('if (ENFORCED.some((n) => !KNOWN.includes(n)))', 'if (false)')],
      ['r4', 'the gate-diff-subset test removed', mut("if (ENFORCED.length && !ENFORCED.includes('gate-diff'))", 'if (false)')],
      ['r7', 'the pass rule reduced to the exit code', mut('const passed = (r, okLine) => r.code === 0 && okLine.test(r.out);', 'const passed = (r) => r.code === 0;')],
      ['r2', 'ENFORCED ignored in the exit', mut('stop(enforcedFail.length ? 1 : 0);', 'stop(0);')],
      ['r5', 'the gate diff moved after the isolation check', (() => {
        const a = runnerText.indexOf('/* 1 · gate diff */'), b = runnerText.indexOf('/* 2 · isolation */'), c = runnerText.indexOf('/* 3 · bridge contract */');
        return a >= 0 && b > a && c > b ? runnerText.slice(0, a) + runnerText.slice(b, c) + runnerText.slice(a, b) + runnerText.slice(c) : null;
      })()],
      ['r8', 'the 40-hex test removed', mut('if (base && !HEX40.test(base))', 'if (false)')],
      ['r9', 'the gate diff\'s fail entry removed', mut("fail.push('gate-diff');", '')],
      ['r10', 'the base copy skipped', mut('  if (baseHas) {', '  if (false) {')],
      ['r11', 'the exit code read as 0', mut('const code = r.status === null ? 2 : r.status;', 'const code = 0;')],
      ['r12', 'every red check counted as enforced', mut('const enforcedFail = fail.filter((f) => ENFORCED.includes(f));', 'const enforcedFail = ENFORCED.length ? fail : [];')],
    ];
    for (const [row, what, text] of BREAKS) {
      if (text === null) { ok(false, T + ' break ' + what + ': its anchor is not found exactly once'); continue; }
      const r = rows(text);
      ok(r[row] === false, T + ' break ' + what + ' → row ' + row + ' goes red (got ' + (r[row] === false ? 'red' : 'green') + ')');
    }
  } finally {
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
  }
}
