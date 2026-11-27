/* ==== qtools — the CI runner scripts/quality/run-ci-checks.mjs: its ENFORCED switch, its order and its pass rule.
 * A BEHAVIOUR pin: it builds a temp git repository (a base commit, then a head commit with three STUB checks and a copy of the
 * real runner whose one `const ENFORCED = [];` line is replaced per case), runs the runner with BASE_SHA / HEAD_SHA (not in
 * GitHub Actions; --no-a11y) and reads its exit code and its output. A stub prints its check's OK line and exits 0 when the
 * state file names it "ok", exits 1 when it names it "red", and exits 0 with NO OK line when it names it "silent".
 * Rows:
 *   r1 ENFORCED empty, a red check → exit 0, a ::warning, "REPORT, red: <check>"
 *   r2 ENFORCED with that check (and gate-diff) → exit 1, an ::error, "FAILED — <check>"
 *   r3 a name outside KNOWN → exit 2 before any check runs
 *   r4 'isolation' or 'bridge-contract' enforced without 'gate-diff' → exit 2
 *   r5 the gate diff runs before the two checks of the tree under test (its "== gate diff" line comes first)
 *   r6 all enforced, all green → exit 0
 *   r7 an enforced check that exits 0 with no OK line → exit 1
 *   r8 a BASE_SHA that is not 40 hex → exit 2
 * DELIBERATE BREAKS (#802), each a one-place change of the runner's text in the copy: the KNOWN test removed → r3 red; the
 * gate-diff-subset test removed → r4 red; the pass rule reduced to the exit code → r7 red; ENFORCED ignored in the summary
 * exit → r2 red; the gate diff moved after the isolation check → r5 red.
 * LIMITS: it does not run in GitHub Actions (the event branch, the base copy of the runner started by the workflow step and
 * the fetch are not exercised here; the workflow text is held by pins-leanfollow/d-ci rows 12, 17, 18); the stubs stand in
 * for the real checks, whose own pins are c-isolation, c-contract and d-gatediff. */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const STUB = (check, okLine) => `import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const a = process.argv.slice(2); const i = a.indexOf('--root'); const root = i >= 0 ? a[i + 1] : process.cwd();
const st = JSON.parse(readFileSync(join(root, 'stub-state.json'), 'utf8'))[${JSON.stringify(check)}] || 'ok';
console.log('stub ${check} ' + st);
if (st === 'red') { console.log('x → row: MISSING'); process.exit(1); }
if (st === 'ok') console.log(${JSON.stringify(okLine)});
process.exit(0);
`;

export default async function ({ ok, root }) {
  const T = 'QTOOLS runner';
  const runnerText = readFileSync(join(root, 'scripts/quality/run-ci-checks.mjs'), 'utf8');
  const ENF = 'const ENFORCED = [];';
  ok(runnerText.split(ENF).length === 2, T + ': the runner holds exactly one `' + ENF + '` line (the switch this pin turns)');
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'qtools-runner-')));
  const env = { ...process.env, GIT_AUTHOR_NAME: 'pin', GIT_AUTHOR_EMAIL: 'pin@example.invalid', GIT_COMMITTER_NAME: 'pin',
    GIT_COMMITTER_EMAIL: 'pin@example.invalid', GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z', GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z' };
  delete env.GITHUB_ACTIONS; delete env.GITHUB_EVENT_NAME; delete env.GITHUB_EVENT_PATH; delete env.GITHUB_SHA;
  const g = (...a) => spawnSync('git', ['-C', dir, '-c', 'commit.gpgsign=false', ...a], { encoding: 'utf8', env });
  try {
    g('init', '-q'); writeFileSync(join(dir, 'README'), 'base\n'); g('add', 'README'); g('commit', '-q', '-m', 'base');
    const base = g('rev-parse', 'HEAD').stdout.trim();
    mkdirSync(join(dir, 'scripts/quality'), { recursive: true });
    writeFileSync(join(dir, 'scripts/quality/gate-diff.mjs'), STUB('gate-diff', 'GATE-DIFF OK'));
    writeFileSync(join(dir, 'scripts/quality/isolation-check.mjs'), STUB('isolation', 'isolation-check: OK · stub'));
    writeFileSync(join(dir, 'scripts/quality/bridge-contract.mjs'), STUB('bridge-contract', 'bridge-contract: OK — stub'));
    writeFileSync(join(dir, 'scripts/quality/run-ci-checks.mjs'), runnerText);
    writeFileSync(join(dir, 'stub-state.json'), '{}');
    g('add', '-A'); g('commit', '-q', '-m', 'head');
    const head = g('rev-parse', 'HEAD').stdout.trim();

    const runCase = ({ enforced = [], state = {}, text = runnerText, baseSha = base }) => {
      const t = text.replace(ENF, 'const ENFORCED = ' + JSON.stringify(enforced) + ';');
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
      r = runCase({ text });
      const gi = r.out.indexOf('== gate diff'), ii = r.out.indexOf('== isolation check');
      R.r5 = r.code === 0 && gi >= 0 && ii > gi;
      r = runCase({ text, enforced: ALL });
      R.r6 = r.code === 0;
      r = runCase({ text, enforced: ALL, state: { isolation: 'silent' } });
      R.r7 = r.code === 1 && /FAILED — isolation/.test(r.out);
      r = runCase({ text, baseSha: 'zz' + base.slice(2) });
      R.r8 = r.code === 2;
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
      r8: 'a BASE_SHA that is not 40 hex → exit 2',
    };
    const real = rows(runnerText);
    for (const k of Object.keys(LABEL)) ok(real[k] === true, T + ' ' + k + ': ' + LABEL[k]);

    const mut = (from, to) => (runnerText.split(from).length === 2 ? runnerText.replace(from, to) : null);
    const BREAKS = [
      ['r3', 'the KNOWN test removed', mut("if (ENFORCED.some((n) => !KNOWN.includes(n)))", 'if (false)')],
      ['r4', 'the gate-diff-subset test removed', mut("if (ENFORCED.length && !ENFORCED.includes('gate-diff'))", 'if (false)')],
      ['r7', 'the pass rule reduced to the exit code', mut('const passed = (r, okLine) => r.code === 0 && okLine.test(r.out);', 'const passed = (r) => r.code === 0;')],
      ['r2', 'ENFORCED ignored in the exit', mut('stop(enforcedFail.length ? 1 : 0);', 'stop(0);')],
      ['r5', 'the gate diff moved after the isolation check', (() => {
        const a = runnerText.indexOf('/* 1 · gate diff */'), b = runnerText.indexOf('/* 2 · isolation */'), c = runnerText.indexOf('/* 3 · bridge contract */');
        return a >= 0 && b > a && c > b ? runnerText.slice(0, a) + runnerText.slice(b, c) + runnerText.slice(a, b) + runnerText.slice(c) : null;
      })()],
    ];
    for (const [row, what, text] of BREAKS) {
      if (text === null) { ok(false, T + ' break ' + what + ': its anchor is not found exactly once'); continue; }
      const r = rows(text);
      ok(r[row] === false, T + ' break ' + what + ' → row ' + row + ' goes red (got ' + (r[row] === false ? 'red' : 'green') + ')');
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
