/* run-ci-checks — the ONE quality step of redesign-ci (docs/contract-qtools.md, interface I6).
 * Runs, in this order; a check PASSES only with exit 0 AND its own OK line:
 *   1. the security-gate diff (scripts/quality/gate-diff.mjs) for base..head — FIRST, so that its verdict is in this
 *      process before any script of the tree under test starts
 *   2. the isolation check (scripts/quality/isolation-check.mjs) on the tree at --root (the tree's own copy)
 *   3. the bridge contract check (scripts/quality/bridge-contract.mjs --check) (the tree's own copy)
 * ENFORCED (below) names the checks whose failure fails the step (an ::error annotation); every other check is a REPORT
 * (a ::warning annotation, the step stays green). In this batch ENFORCED is EMPTY: the #46 review of the three
 * hand-written scanners did not converge (docs/review-brief-qtools.md § 5; DECISIONS #2077), so they run as reports
 * until Damir rules; putting a name into ENFORCED is the whole change that makes that check fail the step (in CI the
 * BASE commit's copy of this file decides, so the change takes effect from the first run after its merge). A name
 * outside KNOWN, or a list that names 'isolation' or 'bridge-contract' without 'gate-diff', is a runner input error
 * (exit 2): those two run from the tree under test, and only the base's gate diff sees an edit of them.
 *      The copy of gate-diff.mjs that runs is the BASE commit's copy of scripts/quality/*.mjs when the base has one
 *      (extracted with `git show` into a temp folder); that copy lists every change to the checks (scripts/quality/**,
 *      .github/**, docs/bridge-contract.json and the other paths it names) as a `check-changed` item that needs a row in
 *      docs/security-handover-gate.md. Only when the base has no gate-diff.mjs does the tree's own copy run; the log says so.
 *   4. the accessibility scan (scripts/quality/a11y-scan.mjs), always a REPORT: its exit code never fails the step.
 * In CI the workflow step starts the BASE commit's copy of THIS file when the base has one, so a pull request that edits
 * this file does not change which copies judge it; a pull request that edits the workflow step itself is seen only in
 * review of the `.github/` diff and by the required checks of the branch rule (repo settings are Damir's). Against an
 * author who runs code in the same job (the `npm ci` before this step runs install scripts of the packages in the pull
 * request's lockfile), no check in this job holds: these checks guard against mistakes, and they make a weakened check
 * visible as a `check-changed` item; they are not a sandbox.
 * Inputs (environment):
 *   GITHUB_ACTIONS=true → GITHUB_EVENT_NAME, BASE_SHA (set by the step's `env:` from the event: the pull request's base, or
 *     the previous tip of a push) and GITHUB_SHA. pull_request / push with no base → exit 2; workflow_dispatch → the gate
 *     diff is NOT RUN and the summary says so.
 *   otherwise → BASE_SHA and HEAD_SHA (both optional; no base = the gate diff is NOT RUN).
 *   Every sha must be 40 hex; the head must equal `git rev-parse HEAD`; base = head → exit 2.
 * In a shallow checkout the base and the head are fetched (`git fetch --no-tags --depth=50 origin <base> <head>`, 2-minute
 * limit) so that their merge base can be read; no merge base → exit 2.
 * usage: node scripts/quality/run-ci-checks.mjs [--root <dir>] [--no-a11y]
 * exit: 0 every ENFORCED check passed · 1 an ENFORCED check failed · 2 an input of the runner could not be read (fail closed). */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, existsSync, realpathSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
let root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ri = argv.indexOf('--root');
if (ri >= 0) root = argv[ri + 1];
const noA11y = argv.includes('--no-a11y');
try { root = realpathSync(resolve(root)); } catch (e) { console.log('::error title=quality: root::cannot read ' + root); process.exit(2); }

const KNOWN = ['isolation', 'bridge-contract', 'gate-diff'];
const ENFORCED = [];   // a subset of KNOWN; 'gate-diff' must be in it whenever it is not empty
const HEX40 = /^[0-9a-f]{40}$/;
const ZERO = '0'.repeat(40);
const CHECK_LIMIT_MS = 2 * 60 * 1000;
const A11Y_LIMIT_MS = 9 * 60 * 1000;
const esc = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
const annotate = (title, text) => console.log('::error title=' + esc(title) + '::' + esc(String(text).slice(0, 900)));
const note = (check, title, text) => console.log('::' + (ENFORCED.includes(check) ? 'error' : 'warning') + ' title=' + esc(title + (ENFORCED.includes(check) ? '' : ' (REPORT)')) + '::' + esc(String(text).slice(0, 900)));
const git = (args, timeout = 60 * 1000) => spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout });
const run = (title, script, args, limit = CHECK_LIMIT_MS) => {
  console.log('\n== ' + title);
  const r = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: limit });
  process.stdout.write(r.stdout || '');
  process.stderr.write(r.stderr || '');
  const code = r.status === null ? 2 : r.status;
  console.log('-- ' + title + ': exit ' + code + (r.error ? ' (' + r.error.message + ')' : ''));
  return { code, out: (r.stdout || '') + (r.stderr || '') };
};
const passed = (r, okLine) => r.code === 0 && okLine.test(r.out);
let tmp = null;
const cleanup = () => { if (tmp) { rmSync(tmp, { recursive: true, force: true }); tmp = null; } };
const stop = (code) => { cleanup(); process.exit(code); };

if (ENFORCED.some((n) => !KNOWN.includes(n))) { annotate('quality: ENFORCED', 'a name outside ' + KNOWN.join(', ') + ': ' + JSON.stringify(ENFORCED)); stop(2); }
if (ENFORCED.length && !ENFORCED.includes('gate-diff')) { annotate('quality: ENFORCED', 'isolation / bridge-contract enforced without gate-diff: ' + JSON.stringify(ENFORCED)); stop(2); }

/* the inputs */
const inActions = process.env.GITHUB_ACTIONS === 'true';
const event = inActions ? (process.env.GITHUB_EVENT_NAME || '') : '';
const base = String(process.env.BASE_SHA || '').trim().toLowerCase();
const head = String((inActions ? process.env.GITHUB_SHA : process.env.HEAD_SHA) || '').trim().toLowerCase();
const actualHead = (git(['rev-parse', 'HEAD']).stdout || '').trim();
if (inActions && !head) { annotate('quality: head', 'GITHUB_SHA is not set'); stop(2); }
if (head && (!HEX40.test(head) || head !== actualHead)) { annotate('quality: head', 'the head sha is not 40 hex or is not the checked-out commit (' + actualHead + ')'); stop(2); }
if (base && !HEX40.test(base)) { annotate('quality: base', 'BASE_SHA is not 40 hex'); stop(2); }
const needBase = inActions && (event === 'pull_request' || event === 'push');
if (needBase && (!base || base === ZERO)) { annotate('quality: base', 'a ' + event + ' run without a base commit: the gate diff cannot run'); stop(2); }
if (base && base !== ZERO && base === (head || actualHead)) { annotate('quality: base', 'the base equals the head: an empty range'); stop(2); }

const fail = [];
const notRun = [];

/* 1 · gate diff */
if (!base || base === ZERO) {
  notRun.push('gate diff');
  console.log('\n== gate diff: NOT RUN — no base commit (' + (event || 'a local run') + '); the pull request run covers it');
} else {
  const tip = head || actualHead;
  const shallow = (git(['rev-parse', '--is-shallow-repository']).stdout || '').trim() === 'true';
  if (shallow || git(['cat-file', '-e', base + '^{commit}']).status !== 0) git(['fetch', '--no-tags', '--depth=50', 'origin', base, tip], 2 * 60 * 1000);
  if (git(['cat-file', '-e', base + '^{commit}']).status !== 0 || git(['merge-base', base, tip]).status !== 0) {
    annotate('quality: gate diff', 'the base commit ' + base + ' or its merge base with ' + tip + ' cannot be read');
    stop(2);
  }
  const baseHas = git(['cat-file', '-e', base + ':scripts/quality/gate-diff.mjs']).status === 0;
  let script = join(root, 'scripts/quality/gate-diff.mjs');
  if (baseHas) {
    tmp = mkdtempSync(join(realpathSync(tmpdir()), 'qtools-gatediff-'));
    const ls = git(['ls-tree', '-r', '--name-only', base, '--', 'scripts/quality/']);
    if (ls.status !== 0) { annotate('quality: gate diff', 'cannot list scripts/quality at the base'); stop(2); }
    for (const p of (ls.stdout || '').split('\n').filter((x) => /\.m?js$/.test(x))) {
      const blob = git(['show', base + ':' + p]);
      if (blob.status !== 0) { annotate('quality: gate diff', 'cannot read ' + p + ' at the base'); stop(2); }
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
  cleanup();
  if (!passed(gd, /^GATE-DIFF OK\b/m)) {
    fail.push('gate-diff');
    const miss = gd.out.split('\n').filter((l) => /→ row: MISSING/.test(l));
    for (const l of miss.slice(0, 8)) note('gate-diff', 'quality: gate diff — a change with no gate row', l.trim());
    if (!miss.length) note('gate-diff', 'quality: gate diff (exit ' + gd.code + ')', gd.out.split('\n').filter((l) => l.trim()).slice(-3).join(' | ') || 'no OK line');
  }
}

/* 2 · isolation */
const iso = run('isolation check', join(root, 'scripts/quality/isolation-check.mjs'), ['--root', root]);
if (!passed(iso, /^isolation-check: OK\b/m)) { fail.push('isolation'); note('isolation', 'quality: isolation check (exit ' + iso.code + ')', iso.out.split('\n').filter((l) => /ISO-\d|error|cannot/i.test(l)).slice(0, 5).join(' | ') || 'no OK line; see the log'); }

/* 3 · bridge contract */
const bc = run('bridge contract --check', join(root, 'scripts/quality/bridge-contract.mjs'), ['--root', root, '--check']);
if (!passed(bc, /^bridge-contract: OK\b/m)) { fail.push('bridge-contract'); note('bridge-contract', 'quality: bridge contract (exit ' + bc.code + ')', bc.out.split('\n').filter((l) => l.trim()).slice(-5).join(' | ') || 'no OK line'); }

/* 4 · accessibility (report only) */
if (!noA11y) {
  const a11yScript = join(root, 'scripts/quality/a11y-scan.mjs');
  if (existsSync(a11yScript)) {
    const out = join(process.env.RUNNER_TEMP || realpathSync(tmpdir()), 'a11y-report.json');
    const a = run('accessibility scan (REPORT — never fails this step)', a11yScript, ['--out', out], A11Y_LIMIT_MS);
    console.log('-- accessibility scan ' + (a.code === 0 ? 'ran (report: ' + out + ')' : 'could not run (exit ' + a.code + ')') + '; it is a report in this batch');
  }
}

const ran = (notRun.length ? [] : ['gate-diff']).concat(['isolation', 'bridge-contract']).join(', ');
const enforcedFail = fail.filter((f) => ENFORCED.includes(f));
const reportFail = fail.filter((f) => !ENFORCED.includes(f));
console.log('\nquality checks: ' + (enforcedFail.length ? 'FAILED — ' + enforcedFail.join(', ') : 'ran (' + ran + ')')
  + (reportFail.length ? ' · REPORT, red: ' + reportFail.join(', ') : '') + (notRun.length ? ' · NOT RUN: ' + notRun.join(', ') : '')
  + ' · enforced: ' + (ENFORCED.length ? ENFORCED.join(', ') : 'none'));
stop(enforcedFail.length ? 1 : 0);
