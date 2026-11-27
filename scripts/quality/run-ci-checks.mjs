/* run-ci-checks — the ONE quality step of redesign-ci (docs/contract-qtools.md, interface I6).
 * Runs, in this order, and prints one ::error annotation per failed check:
 *   1. the isolation check (scripts/quality/isolation-check.mjs) on this tree           → fails the step on exit ≠ 0
 *   2. the bridge contract check (scripts/quality/bridge-contract.mjs --check)         → fails the step on exit ≠ 0
 *   3. the security-gate diff (scripts/quality/gate-diff.mjs) for BASE_SHA..HEAD_SHA   → fails the step on exit ≠ 0
 *      The copy of gate-diff.mjs that runs is the BASE commit's copy when the base has one (extracted with `git show`
 *      into a temp folder), so a pull request cannot weaken the gate diff that judges it; that base copy lists every
 *      change to scripts/quality/**, .github/** and docs/bridge-contract.json as a `check-changed` item that needs a row
 *      in docs/security-handover-gate.md. Only when the base has no gate-diff.mjs (the pull request that adds it) does
 *      the tree's own copy run, and the log says so.
 *   4. the accessibility scan (scripts/quality/a11y-scan.mjs) as a REPORT: its exit code never fails the step.
 * Inputs: in GitHub Actions the runner's own GITHUB_EVENT_NAME, GITHUB_EVENT_PATH (the event JSON) and GITHUB_SHA; the
 * workflow step passes no value and holds no `${{ }}` expression. Outside Actions: BASE_SHA and HEAD_SHA from the environment.
 *   base  pull_request: `pull_request.base.sha`; push: `before`; any other event: none. Empty or 40 zeros (a new branch)
 *         → step 3 is not run and the log says so. Any other value that is not 40 hex → exit 2.
 *   head  GITHUB_SHA (or HEAD_SHA); must be 40 hex and equal `git rev-parse HEAD`, else exit 2.
 * In a shallow checkout the base and the head are fetched with `git fetch --no-tags --depth=50 origin <base> <head>`, so that
 * their merge base can be read; no merge base → exit 2.
 * What it cannot do: it cannot stop a pull request that edits the workflow file itself to remove this step; that rests
 * on the required checks of the branch rule and on review of every `.github/` change (repo settings are Damir's).
 * usage: node scripts/quality/run-ci-checks.mjs [--root <dir>] [--no-a11y]
 * exit: 0 all checks passed · 1 a check failed · 2 an input could not be read (fail closed). */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
let root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ri = argv.indexOf('--root');
if (ri >= 0) root = argv[ri + 1];
const noA11y = argv.includes('--no-a11y');

const HEX40 = /^[0-9a-f]{40}$/;
const ZERO = '0'.repeat(40);
const esc = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
const annotate = (title, text) => console.log('::error title=' + esc(title) + '::' + esc(String(text).slice(0, 900)));
const git = (args) => spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const run = (title, script, args, cwd = root) => {
  console.log('\n== ' + title);
  const r = spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 10 * 60 * 1000 });
  process.stdout.write(r.stdout || '');
  process.stderr.write(r.stderr || '');
  const code = r.status === null ? 2 : r.status;
  console.log('-- ' + title + ': exit ' + code + (r.error ? ' (' + r.error.message + ')' : ''));
  return { code, out: (r.stdout || '') + (r.stderr || '') };
};

const fail = [];
let inputError = false;

const fromEvent = () => {
  const name = process.env.GITHUB_EVENT_NAME || '';
  const path = process.env.GITHUB_EVENT_PATH || '';
  if (!name || !path) return null;
  let ev;
  try { ev = JSON.parse(readFileSync(path, 'utf8')); } catch (e) { annotate('quality: event', 'the event file cannot be read: ' + e.message); process.exit(2); }
  if (name === 'pull_request') return { base: ev && ev.pull_request && ev.pull_request.base ? ev.pull_request.base.sha : '', head: process.env.GITHUB_SHA || '' };
  if (name === 'push') return { base: ev ? ev.before : '', head: process.env.GITHUB_SHA || '' };
  return { base: '', head: process.env.GITHUB_SHA || '' };
};
const ev = fromEvent();
const base = String((ev ? ev.base : process.env.BASE_SHA) || '').trim().toLowerCase();
const head = String((ev ? ev.head : process.env.HEAD_SHA) || '').trim().toLowerCase();
const actualHead = (git(['rev-parse', 'HEAD']).stdout || '').trim();
if (head && (!HEX40.test(head) || head !== actualHead)) {
  annotate('quality: HEAD_SHA', 'HEAD_SHA is not 40 hex or is not the checked-out commit (' + actualHead + ')');
  inputError = true;
}
if (base && base !== ZERO && !HEX40.test(base)) {
  annotate('quality: BASE_SHA', 'BASE_SHA is not 40 hex');
  inputError = true;
}
if (inputError) process.exit(2);

/* 1 · isolation */
const iso = run('isolation check', join(root, 'scripts/quality/isolation-check.mjs'), ['--root', root]);
if (iso.code !== 0) { fail.push('isolation'); annotate('quality: isolation check (exit ' + iso.code + ')', iso.out.split('\n').filter((l) => /ISO-\d|error|cannot/i.test(l)).slice(0, 5).join(' | ') || 'see the log'); }

/* 2 · bridge contract */
const bc = run('bridge contract --check', join(root, 'scripts/quality/bridge-contract.mjs'), ['--root', root, '--check']);
if (bc.code !== 0) { fail.push('bridge-contract'); annotate('quality: bridge contract (exit ' + bc.code + ')', bc.out.split('\n').filter((l) => l.trim()).slice(-5).join(' | ')); }

/* 3 · gate diff */
if (!base || base === ZERO) {
  console.log('\n== gate diff: NOT RUN — no base commit for this event (a new branch or a manual run); the pull request run holds it');
} else {
  const tip = head || actualHead;
  const shallow = (git(['rev-parse', '--is-shallow-repository']).stdout || '').trim() === 'true';
  if (shallow || git(['cat-file', '-e', base + '^{commit}']).status !== 0) {
    git(['fetch', '--no-tags', '--depth=50', 'origin', base, tip]);
  }
  if (git(['cat-file', '-e', base + '^{commit}']).status !== 0 || git(['merge-base', base, tip]).status !== 0) {
    annotate('quality: gate diff', 'the base commit ' + base + ' or its merge base with ' + tip + ' cannot be read');
    process.exit(2);
  }
  const baseHas = git(['cat-file', '-e', base + ':scripts/quality/gate-diff.mjs']).status === 0;
  let script = join(root, 'scripts/quality/gate-diff.mjs');
  let tmp = null;
  if (baseHas) {
    tmp = mkdtempSync(join(tmpdir(), 'qtools-gatediff-'));
    const ls = git(['ls-tree', '-r', '--name-only', base, '--', 'scripts/quality/']);
    for (const p of (ls.stdout || '').split('\n').filter((x) => /\.m?js$/.test(x))) {
      const blob = git(['show', base + ':' + p]);
      if (blob.status !== 0) { annotate('quality: gate diff', 'cannot read ' + p + ' at the base'); process.exit(2); }
      const dest = join(tmp, p);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, blob.stdout);
    }
    script = join(tmp, 'scripts/quality/gate-diff.mjs');
    console.log('\n(gate diff: the BASE commit\'s copy of scripts/quality/gate-diff.mjs runs)');
  } else {
    console.log('\n(gate diff: the base has no gate-diff.mjs — this tree\'s own copy runs)');
  }
  const gd = run('gate diff ' + base.slice(0, 12) + '..' + tip.slice(0, 12), script, ['--root', root, '--base', base, '--head', tip]);
  if (tmp) rmSync(tmp, { recursive: true, force: true });
  if (gd.code !== 0) {
    fail.push('gate-diff');
    const miss = gd.out.split('\n').filter((l) => /MISSING/.test(l));
    for (const l of miss.slice(0, 8)) annotate('quality: gate diff — a change with no gate row', l.trim());
    if (!miss.length) annotate('quality: gate diff (exit ' + gd.code + ')', gd.out.split('\n').filter((l) => l.trim()).slice(-3).join(' | '));
  }
}

/* 4 · accessibility (report only) */
if (!noA11y) {
  const a11yScript = join(root, 'scripts/quality/a11y-scan.mjs');
  if (existsSync(a11yScript)) {
    const a = run('accessibility scan (REPORT — never fails this step)', a11yScript, ['--out', join(root, '..', 'a11y-report.json')]);
    console.log('-- accessibility scan ' + (a.code === 0 ? 'ran' : 'could not run (exit ' + a.code + ')') + '; it is a report in this batch');
  }
}

console.log('\nquality checks: ' + (fail.length ? 'FAILED — ' + fail.join(', ') : 'all passed (isolation, bridge contract, gate diff)'));
process.exit(fail.length ? 1 : 0);
