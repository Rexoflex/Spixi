/* ==== leanfollow unit D — the two CI steps of .github/workflows/redesign-ci.yml (contract leanfollow § 3.5).
 *
 * WHAT THIS PIN IS: a SOURCE-TEXT pin. It reads the workflow file as text and cuts it at the indent of the steps. It does NOT run
 * GitHub Actions, it does not parse YAML (no YAML package is installed), and it cannot know that GitHub accepts the file or
 * that a step really runs (the proof of the commands is the run of the two step commands in a copy, and the pull request run).
 * Its limits, stated in its first version (#1735):
 *   - the cut is by line shape: `    - name:` at indent 4 starts a step of the `smoke` job (the job ends at the line `  windows-build:`);
 *     a re-indented file, a flow-style step (`- {name: …}`), a quoted key or a YAML anchor can confuse the line rows (review
 *     round 4 found quoted and flow-style keys that every line row let through); row 17 therefore holds the WHOLE file by
 *     SHA-256 with the batch's own pieces cut out, so such a change goes red there (a new base of the file = a new constant,
 *     after a look at the diff);
 *   - the `uses:` / `permissions:` / `on:` / job `if:` rows compare TEXT with the list frozen below (the base of this batch,
 *     work/leanfollow @ 55feaddc). A deliberate change of any of them is made together with this list, after a look at the diff;
 *   - "no secret / token" (row 10) has two scans. (1) The live lines (a full-line comment and a ` #` tail outside quotes are cut):
 *     the word `secrets` as a whole word, `github.token`, `GITHUB_TOKEN`, `pull_request_target`. (2) EVERY `${{ … }}` body of the
 *     file with NO comment cut and ignoring letter case (GitHub evaluates `${{ }}` in the whole `run:` string, a `#` line of a
 *     block scalar included): `secrets`, `github.token`, `GITHUB_TOKEN`.
 *     Row 14 freezes the `defaults:` blocks (the shell), row 15 forbids `continue-on-error`; step (a) and (b) carry `set -eo pipefail`
 *     themselves, so a second pipeline cannot be skipped after a red first one.
 *     Row 7 also needs exactly one live `permissions:` line (a job-level block is red); row 16 freezes the job keys, the `runs-on:`
 *     lines and the four `persist-credentials: false`. Unseen: `${{ github.event.* }}` text injected into a base `run:` line.
 *     Not frozen (named, #1735): the bodies of the annotation step (the awk / head / publish code) and of the other base steps.
 *     Still NOT seen: Still NOT seen: a name built by concatenation in an expression, `${{ github['token'] }}`,
 *     a token read by a script from a file or the git config of the runner, a YAML line folded so that the word is split;
 *   - the `env:` row (12) freezes every `env:` line of the file (`key: value` lines under an `env:` key at any indent): a new
 *     key, a changed value or a moved block is red. Not seen: a value set by `echo X >> $GITHUB_ENV` inside a `run:`, an `env:`
 *     written as a flow mapping (`env: { A: b }`);
 *   - "no network tool" (row 11) is checked in the text of the two new steps (the comment lines inside the step included, so they
 *     must not name them; a comment above a step belongs to the step before it): curl, wget, npm i / install / ci, npx, pip,
 *     dotnet tool, git clone; file-wide for curl / wget; the file holds exactly one live npm line (npm i / install / ci), and since walktools2 it is `npm ci`; row 17 holds its exact text. A fetch by `node -e`,
 *     `dotnet restore` or a repo script that opens a socket is NOT matched (the harness is proven offline by a run with the
 *     network blocked, in the builder's report);
 *   - the annotation and upload rows read the lines of those steps; they cannot know that `publish` really prints.
 * Rows (each has its deliberate break below, a mutated text in memory that makes exactly that row fail): see ROWS. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

/* ---- frozen from the base (work/leanfollow @ 55feaddc) ---- */
const FROZEN_USES = [
  'actions/checkout@v7', 'actions/checkout@v7', 'actions/setup-node@v7', 'actions/setup-dotnet@v6', 'actions/upload-artifact@v7',
  'actions/checkout@v7', 'actions/checkout@v7', 'actions/setup-dotnet@v6',
];
const FROZEN_PERMISSIONS = ['permissions:', '  contents: read'];
const FROZEN_ON = ['on:', '  push:', "    branches: [ 'redesign/frontend' ]", '  pull_request:', "    branches: [ 'redesign/frontend' ]", '  workflow_dispatch:'];
const FROZEN_JOB_IF = ["    if: github.repository == 'Rexoflex/Spixi'   # the fork only: a copy of this file in another repository does nothing", "    if: github.repository == 'Rexoflex/Spixi'"];

/* ---- row 17: the whole file, held by SHA-256 (review round 4, r4S-4 / r4C-4: flow-style and quoted YAML keys beat the line rows).
 * The text with the batch's own pieces cut out (the two step blocks from their first comment line to the next step's comment,
 * the two O_* env lines, the two publish lines, the two upload lines; each piece must be found exactly once) must hash to the
 * base file `git show 55feaddc:.github/workflows/redesign-ci.yml` (CRLF → LF). Any other change of the file — a quoted key, a
 * flow-style job, a container / services block, a moved persist-credentials line, another repository or npm package — goes red
 * and needs an edit of this constant after a look at the diff (#1634). ---- */
const BASE_WORKFLOW_SHA256 = '45b8b1fd129e91d6a361fe584030f791ed3a762d8ec602e078d9a21c0d203167';
const CUT_PIECES = ['        O_XPARSER: ${{ steps.xparser.outcome }}\n', '        O_MSBUILDH: ${{ steps.msbuildh.outcome }}\n',
  '        publish xparser "$O_XPARSER"\n', '        publish msbuild-harness "$O_MSBUILDH"\n', '          xparser.log\n', '          msbuild-harness.log\n'];
/* ★ walktools2 re-base (2026-11-23; after a look at the diff, #1596 / #1634, ruling #1831): the install step is the ONE piece of the file that moved — its four
 * comment lines, its name and its run line (`npm i --no-save <five tools>` -> `npm ci`, the lockfile pins every tool). Row 17 puts the EXACT new block back to the
 * EXACT base block (each found once) before it hashes, so the file admits this block and nothing else: an extra argument (`npm ci --foo`), a changed name or a
 * second run line is red here. The base hash constant below is unchanged. */
const NEW_INSTALL = ['    # The committed package-lock.json pins every tool and every package under it (ruling #1831); package.json holds the five',
  '    # tools at exact versions. jsdom MUST stay pinned: jsdom 31.0.0 (2026-11-05) fails 6 smoke rows (#346 x5, N19) that pass',
  '    # on 29.1.1 on the same tree (docs/lessons.md L160); it stays 29.1.1. Move a pin only together with a full smoke run on',
  '    # the new version, and change package.json and the lock in the same commit.',
  '    - name: Install test tools (the lockfile pins every tool)', '      run: npm ci', ''].join('\n');
const BASE_INSTALL = ['    # Every version is pinned to what the 2026-11-11 run used. jsdom MUST stay pinned: jsdom 31.0.0 (2026-11-05) fails',
  '    # 6 smoke rows (#346 x5, N19) that pass on 29.1.1 on the same tree (docs/lessons.md L160). Move a pin only together',
  '    # with a full smoke run on the new version.',
  '    - name: Install test tools (the ONE npm line, versions pinned)',
  '      run: npm i --no-save jsdom@29.1.1 eslint@10.14.0 globals@17.14.0 tree-sitter@0.25.1 tree-sitter-c-sharp@0.23.5', ''].join('\n');
function baseShaOk(t) {
  const a = t.indexOf('    # Proves, with two parsers'); const b = t.indexOf('    # Only for a step that itself failed');
  if (a < 0 || b < a || t.indexOf('    # Proves, with two parsers', a + 1) >= 0) return false;
  let s = t.slice(0, a) + t.slice(b);
  for (const p of CUT_PIECES) { if (s.split(p).length !== 2) return false; s = s.replace(p, ''); }
  if (s.split(NEW_INSTALL).length !== 2) return false; s = s.replace(NEW_INSTALL, () => BASE_INSTALL);   // ★ walktools2 re-base: the new install block, found once, back to the base block
  if (s.split(QTOOLS_STEP).length !== 2) return false; s = s.replace(QTOOLS_STEP, () => '');   // the qtools step block (row 18), found once, cut
  return createHash('sha256').update(s).digest('hex') === BASE_WORKFLOW_SHA256;
}

/* ---- the two new steps, literally ---- */
const NEW_STEPS = [
  { key: 'xparser', name: 'Parser cross-check (lean strips against acorn and jsdom)', id: 'xparser', log: 'xparser', env: 'O_XPARSER',
    run: ['set -eo pipefail', 'node scripts/pins-perflean/x-parser-crosscheck.mjs 2>&1 | tee ../xparser.log'] },
  { key: 'msbuildh', name: 'MSBuild harness (the lean packaging targets)', id: 'msbuildh', log: 'msbuild-harness', env: 'O_MSBUILDH',
    run: ['set -eo pipefail', 'node scripts/pins-perflean/msbuild-harness/run.mjs --fake 2>&1 | tee ../msbuild-harness.log',
      'node scripts/pins-perflean/msbuild-harness/run.mjs --real 2>&1 | tee -a ../msbuild-harness.log'] },
];
const FROZEN_DEFAULTS = ['defaults:', 'run:', '  working-directory: Spixi', '  shell: bash', 'defaults:', 'run:', '  working-directory: Spixi'];
const IF_LINE = '      if: ${{ !cancelled() }}';
const TIMEOUT_LINE = '      timeout-minutes: 10';
const FROZEN_ENV = ['IXIAN_CORE_REF: 097341acba9be1855383acf8215d779ca96efa02', 'BASE_SHA: ${{ github.event.pull_request.base.sha || github.event.before }}', 'O_GATE_SHELLS: ${{ steps.gate_shells.outcome }}', 'O_GATE_LOCALES: ${{ steps.gate_locales.outcome }}',
  'O_SMOKE: ${{ steps.smoke.outcome }}', 'O_CSH: ${{ steps.csh.outcome }}', 'O_XPARSER: ${{ steps.xparser.outcome }}', 'O_MSBUILDH: ${{ steps.msbuildh.outcome }}'];
const FROZEN_STEP_IF = ['      if: ${{ !cancelled() }}', '      if: ${{ !cancelled() }}', '      if: ${{ !cancelled() }}', '      if: ${{ failure() || cancelled() }}', '      if: ${{ failure() || cancelled() }}'];
/* ---- row 18: the qtools quality step (docs/contract-qtools.md, I6), right after the install step. Row 17 removes this block
 * (found exactly once, byte for byte) before it hashes the file, so any other change of the file stays red there; row 18 holds
 * the block's place (after "Install test tools", before "Gate - build-shells --check") and the names of the smoke job's steps
 * as a frozen multiset. Not seen: a step whose `- name:` line is not at indent 4 (row 17 sees it). ---- */
const QTOOLS_STEP = ["    # The quality checks of docs/contract-qtools.md: the isolation check, the bridge contract check and the security-gate",
  "    # diff fail the step; the accessibility scan is a report only. The step runs before any step that runs this tree's own",
  "    # code (only `npm ci` comes before it). BASE_SHA is the event's base commit (a pull request) or the previous tip (a",
  "    # push), checked as 40 hex here and in the script; the runner that starts is the BASE commit's copy of",
  "    # scripts/quality/run-ci-checks.mjs when the base has one, and it runs the base's copy of the gate diff. A failure",
  "    # here skips the steps after it (the smoke too); the script writes its own ::error annotations.",
  "    - name: Quality checks (isolation, bridge contract, gate diff; a11y report)",
  "      id: quality",
  "      timeout-minutes: 20",
  "      env:",
  "        BASE_SHA: ${{ github.event.pull_request.base.sha || github.event.before }}",
  "      run: |",
  "        set -eo pipefail",
  "        runner=scripts/quality/run-ci-checks.mjs",
  "        if printf '%s' \"$BASE_SHA\" | grep -qxE '[0-9a-f]{40}' && [ \"$BASE_SHA\" != 0000000000000000000000000000000000000000 ]; then",
  "          git fetch --no-tags --depth=50 origin \"$BASE_SHA\" \"$GITHUB_SHA\"",
  "          if git cat-file -e \"$BASE_SHA:scripts/quality/run-ci-checks.mjs\" 2>/dev/null; then",
  "            git show \"$BASE_SHA:scripts/quality/run-ci-checks.mjs\" > ../run-ci-checks.base.mjs",
  "            runner=../run-ci-checks.base.mjs",
  "          fi",
  "        fi",
  "        echo \"quality: runner = $runner\"",
  "        node \"$runner\" --root \"$PWD\" 2>&1 | tee ../quality.log",
  "", ''].join('\n');
const FROZEN_SMOKE_NAMES = ['Checkout Spixi', 'Checkout Ixian-Core (pinned)', 'Setup Node', 'Setup .NET', 'List the .NET SDKs (CSH uses the newest one)',
  'Install test tools (the lockfile pins every tool)', 'Gate - build-shells --check', 'Gate - build-locales --check', 'Smoke', 'CSH (C# harness)',
  'Parser cross-check (lean strips against acorn and jsdom)', 'MSBuild harness (the lean packaging targets)',
  'Quality checks (isolation, bridge contract, gate diff; a11y report)', 'Publish failure details as annotations', 'Upload the logs (on failure)'];

const lines = (t) => t.replace(/\r\n/g, '\n').split('\n');
const noComment = (l) => {  // a full-line comment is empty; a ` #` tail is cut only OUTSIDE single / double quotes
  if (/^\s*#/.test(l)) return '';
  let q = '';
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (q) { if (c === q) q = ''; } else if (c === '"' || c === "'") q = c; else if (c === '#' && i > 0 && /\s/.test(l[i - 1])) return l.slice(0, i).replace(/\s+$/, '');
  }
  return l;
};
function envLines(t) {  // every line under an `env:` key (any indent): `key: value`, comment tail cut, in file order
  const L = lines(t); const out = [];
  for (let i = 0; i < L.length; i++) {
    const m = /^(\s*)env:\s*$/.exec(noComment(L[i])); if (!m) continue;
    for (let j = i + 1; j < L.length; j++) {
      const c = noComment(L[j]); if (c === '') continue;
      if (c.search(/\S/) <= m[1].length) break;
      out.push(c.trim());
    }
  }
  return out;
}

function top(t, key) {  // the lines of a top-level block: `key:` up to the next top-level key (blank / comment lines at the end dropped)
  const L = lines(t); const i = L.findIndex((l) => l === key + ':'); if (i < 0) return null;
  let j = i + 1; while (j < L.length && (L[j] === '' || /^\s/.test(L[j]) || /^#/.test(L[j]))) j++;
  const out = L.slice(i, j); while (out.length && (out[out.length - 1] === '' || /^\s*#/.test(out[out.length - 1]))) out.pop();
  return out;
}
function smokeJob(t) {
  const L = lines(t); const a = L.findIndex((l) => l === '  smoke:'); const b = L.findIndex((l, i) => i > a && /^  windows-build:/.test(l));
  return a < 0 || b < 0 ? null : L.slice(a, b);
}
function steps(job) {  // [{ name, at, lines }] by `    - name:` at indent 4
  const out = []; if (!job) return out;
  job.forEach((l, i) => { const m = /^    - name: (.*)$/.exec(l); if (m) out.push({ name: m[1].trim(), at: i, lines: [] }); });
  out.forEach((s, k) => { const end = k + 1 < out.length ? out[k + 1].at : job.length; s.lines = job.slice(s.at, end); });
  return out;
}
const same = (a, b) => !!a && a.length === b.length && a.every((x, i) => x === b[i]);

function rows(t) {
  const R = {}; const job = smokeJob(t); const st = steps(job); const names = st.map((s) => s.name);
  const csh = names.indexOf('CSH (C# harness)'); const ann = names.indexOf('Publish failure details as annotations'); const upl = names.indexOf('Upload the logs (on failure)');
  const mine = NEW_STEPS.map((n) => ({ n, s: st.filter((x) => x.name === n.name) }));
  const stepOk = (m) => {  // exactly one step of this name, with id, the if line and the run lines (the first lines of the step, in order)
    if (m.s.length !== 1) return false; const b = m.s[0].lines.filter((l) => l.trim() !== '' && !/^\s*#/.test(l));
    const want = ['    - name: ' + m.n.name, '      id: ' + m.n.id, IF_LINE, TIMEOUT_LINE, '      run: |', ...m.n.run.map((r) => '        ' + r)];
    return same(b, want);
  };
  R['1 step (a) parser cross-check: name, id, if, timeout, pipefail, the run line'] = stepOk(mine[0]);
  R['2 step (b) MSBuild harness (--fake and --real): name, id, if, timeout, pipefail, the run lines'] = stepOk(mine[1]);
  const at = (m) => names.indexOf(m.n.name);
  R['3 both steps sit after "CSH (C# harness)" and before the annotation step, (a) before (b), in the smoke job'] =
    csh >= 0 && ann > csh && at(mine[0]) > csh && at(mine[1]) > at(mine[0]) && at(mine[1]) < ann && (upl < 0 || upl > ann);
  const annL = ann >= 0 ? st[ann].lines : []; const uplL = upl >= 0 ? st[upl].lines : [];
  R['4 the annotation step names both logs: an O_* env and a publish line each (the log name = the tee file)'] = NEW_STEPS.every((n) =>
    annL.includes('        ' + n.env + ': ${{ steps.' + n.id + '.outcome }}') && annL.includes('        publish ' + n.log + ' "$' + n.env + '"') &&
    n.run.slice(1).every((r) => r.endsWith('tee ' + (r.includes('--real') ? '-a ' : '') + '../' + n.log + '.log'))) && annL.filter((l) => /^\s+publish [a-z-]+ "\$O_/.test(l)).length === 6;
  R['5 the upload step lists both logs'] = NEW_STEPS.every((n) => uplL.includes('          ' + n.log + '.log')) && uplL.includes('        path: |');
  R['6 the set of uses: values equals the base (frozen list, in file order)'] = same(lines(t).filter((l) => /^\s*(- )?uses:/.test(l)).map((l) => l.replace(/^\s*(- )?uses:\s*/, '').replace(/\s#.*$/, '').trim()), FROZEN_USES);
  R['7 the permissions block equals the base, and it is the ONLY live permissions: line of the file (no job-level one)'] =
    same(top(t, 'permissions'), FROZEN_PERMISSIONS) && lines(t).map(noComment).filter((l) => /^\s*permissions:/.test(l)).length === 1;
  R['8 the on block equals the base'] = same(top(t, 'on'), FROZEN_ON);
  R['9 the job if: lines equal the base (job indent, in file order)'] = same(lines(t).filter((l) => /^    if: /.test(l)), FROZEN_JOB_IF);
  const live = lines(t).map(noComment).join('\n');
  const exprs = [...t.matchAll(/\$\{\{[\s\S]*?\}\}/g)].map((m) => m[0]);
  R['10 no secrets (any form), github.token, GITHUB_TOKEN or pull_request_target in a live line'] =
    !/\bsecrets\b/.test(live) && !/\bgithub\.token\b/.test(live) && !/GITHUB_TOKEN/.test(live) && !/pull_request_target/.test(live) &&
    !exprs.some((e) => /\bsecrets\b|\bgithub\.token\b|GITHUB_TOKEN|\bgithub\s*\[\s*['"]token['"]\s*\]/i.test(e));
  const newText = mine.map((m) => m.s.map((s) => s.lines.join('\n')).join('\n')).join('\n');
  R['11 no curl / wget / npm i / npx / pip / dotnet tool / git clone in a new step; no curl / wget in the file; exactly one live npm line in the file (npm ci)'] =
    newText.length > 0 && !/\b(curl|wget)\b/.test(newText) && !/\bnpm\s+(i|install|ci)\b/.test(newText) && !/\b(npx|pip3?)\b/.test(newText) && !/\bdotnet\s+tool\b/.test(newText) && !/\bgit\s+clone\b/.test(newText) && !/\b(curl|wget)\b/.test(live) &&
    lines(t).filter((l) => /\bnpm\s+(i|install|ci)\b/.test(noComment(l))).length === 1;   // ★ walktools2: the one npm line of the file is `npm ci` now (row 17 holds its exact text)
  R['12 every env: line of the file equals the frozen list (the base set + the two new O_* names)'] = same(envLines(t), FROZEN_ENV);
  R['13 the step-level if: lines equal the frozen list (the new steps, the annotation and upload steps)'] = same(lines(t).filter((l) => /^      if: /.test(l)), FROZEN_STEP_IF);
  const dl = lines(t); const dflt = [];
  dl.forEach((l, i) => { if (/^    defaults:\s*$/.test(l)) { dflt.push('defaults:'); for (let j = i + 1; j < dl.length && /^      /.test(dl[j]); j++) dflt.push(dl[j].slice(6)); } });
  R['14 the defaults: blocks of both jobs equal the base (working directory, shell: bash)'] = same(dflt, FROZEN_DEFAULTS);
  R['15 no continue-on-error in a live line'] = !/continue-on-error/.test(live);
  const jl = lines(t).map(noComment); const ji = jl.findIndex((l) => l === 'jobs:');
  const jobKeys = ji < 0 ? [] : jl.slice(ji + 1).filter((l) => /^  [A-Za-z0-9_-]+:\s*$/.test(l));
  R['16 the job keys, the runs-on: lines and the count of persist-credentials: false (4) equal the base'] =
    same(jobKeys, ['  smoke:', '  windows-build:']) && same(jl.filter((l) => /^\s*runs-on:/.test(l)), ['    runs-on: ubuntu-latest', '    runs-on: windows-latest']) &&
    jl.filter((l) => /^\s*persist-credentials:\s*false\s*$/.test(l)).length === 4 && jl.filter((l) => /persist-credentials/.test(l)).length === 4;
  R['17 the whole file minus the batch\'s own pieces equals the base file 55feaddc (SHA-256)'] = baseShaOk(t);
  const qi = names.indexOf('Quality checks (isolation, bridge contract, gate diff; a11y report)');
  R['18 the qtools step literally, once, right after the install step and before the first gate; the smoke job step names equal the frozen multiset'] =
    t.split(QTOOLS_STEP).length === 2 && qi > 0 && names[qi - 1] === 'Install test tools (the lockfile pins every tool)' && names[qi + 1] === 'Gate - build-shells --check' &&
    same([...names].sort(), [...FROZEN_SMOKE_NAMES].sort());
  return R;
}

export default async function ({ ok, root }) {
  const text = readFileSync(join(root, '.github', 'workflows', 'redesign-ci.yml'), 'utf8').replace(/\r\n/g, '\n');
  const base = rows(text); const keys = Object.keys(base);
  for (const k of keys) ok(base[k] === true, 'D-CI ' + k);

  /* the deliberate breaks: a mutated text in memory, ONE row must go red, every other row stays green */
  const rep = (from, to, all) => { if (!text.includes(from)) throw new Error('break anchor missing: ' + from); return all ? text.split(from).join(to) : text.replace(from, to); };
  const brk = [
    [keys[0], 'step (a) without pipefail', rep('        set -eo pipefail\n        node scripts/pins-perflean/x-parser', '        node scripts/pins-perflean/x-parser')],
    [keys[1], 'step (b) --fake gets a flag', rep('run.mjs --fake 2>&1', 'run.mjs --fake --keep 2>&1')],
    [keys[2], 'step (b) moved before step (a)', (() => {
      const a = text.indexOf('    # Proves, with two parsers'); const b = text.indexOf('    # Proves, with MSBuild itself'); const c = text.indexOf('    # Only for a step that itself failed');
      return text.slice(0, a) + text.slice(b, c) + text.slice(a, b) + text.slice(c);
    })()],
    [keys[3], 'no publish line for the harness log', rep('        publish msbuild-harness "$O_MSBUILDH"\n', '')],
    [keys[4], 'the upload list loses xparser.log', rep('          xparser.log\n', '')],
    [keys[5], 'a new uses: in a step', rep('    - name: List the .NET SDKs (CSH uses the newest one)\n', '    - uses: actions/cache@v4\n    - name: List the .NET SDKs (CSH uses the newest one)\n')],
    [keys[6], 'a new permission', rep('permissions:\n  contents: read\n', 'permissions:\n  contents: read\n  pull-requests: write\n')],
    [keys[7], 'a new trigger', rep("  workflow_dispatch:\n", "  workflow_dispatch:\n  schedule:\n")],
    [keys[8], 'the job if: removed', rep("    if: github.repository == 'Rexoflex/Spixi'   # the fork only", '    # the fork only')],
    [keys[9], 'secrets.GITHUB_TOKEN in the annotation run', rep('        publish csh "$O_CSH"\n', '        publish csh "$O_CSH"\n        echo "${{ secrets.GITHUB_TOKEN }}" > /dev/null\n')],
    [keys[9], "secrets['X'] in the annotation run", rep('        publish csh "$O_CSH"\n', '        publish csh "$O_CSH"\n        echo "${{ secrets[\'X\'] }}" > /dev/null\n')],
    [keys[9], 'toJSON(secrets) in the annotation run', rep('        publish csh "$O_CSH"\n', '        publish csh "$O_CSH"\n        echo "${{ toJSON(secrets) }}" > /dev/null\n')],
    [keys[9], 'github.token in the annotation run', rep('        publish csh "$O_CSH"\n', '        publish csh "$O_CSH"\n        echo "${{ github.token }}" > /dev/null\n')],
    [keys[9], 'a secret AFTER a quoted " #" (a tail cut that ignores quotes hides it)', rep('        publish csh "$O_CSH"\n', '        publish csh "$O_CSH"\n        echo "a #" ${{ secrets.X }}\n')],
    [keys[9], 'pull_request_target named in the annotation run', rep('        publish csh "$O_CSH"\n', '        publish csh "$O_CSH"\n        echo pull_request_target\n')],
    [keys[10], 'a curl named in a comment inside step (a)', rep('tee ../xparser.log\n', 'tee ../xparser.log\n      # curl\n')],
    [keys[10], 'npx in a comment inside step (a)', rep('tee ../xparser.log\n', 'tee ../xparser.log\n      # npx x\n')],
    [keys[10], 'pip in a comment inside step (b)', rep('tee -a ../msbuild-harness.log\n', 'tee -a ../msbuild-harness.log\n      # pip install x\n')],
    [keys[10], 'dotnet tool in a comment inside step (b)', rep('tee -a ../msbuild-harness.log\n', 'tee -a ../msbuild-harness.log\n      # dotnet tool install x\n')],
    [keys[11], 'a new env key in the annotation step', rep('        O_CSH: ${{ steps.csh.outcome }}\n', '        O_CSH: ${{ steps.csh.outcome }}\n        EXTRA: x\n')],
    [keys[11], 'the Core pin value changed', rep('IXIAN_CORE_REF: 097341acba', 'IXIAN_CORE_REF: 197341acba')],
    [keys[12], 'the annotation step if: changed', rep('    - name: Publish failure details as annotations\n      if: ${{ failure() || cancelled() }}', '    - name: Publish failure details as annotations\n      if: ${{ always() }}')],
    [keys[12], 'the upload step if: removed', rep('      if: ${{ failure() || cancelled() }}\n      uses: actions/upload-artifact@v7', '      uses: actions/upload-artifact@v7')],
    [keys[0], 'step (a) loses its timeout', rep('      id: xparser\n      if: ${{ !cancelled() }}\n      timeout-minutes: 10\n', '      id: xparser\n      if: ${{ !cancelled() }}\n')],
    [keys[1], 'step (b) timeout changed to 100', rep('      id: msbuildh\n      if: ${{ !cancelled() }}\n      timeout-minutes: 10\n', '      id: msbuildh\n      if: ${{ !cancelled() }}\n      timeout-minutes: 100\n')],
    [keys[9], 'a secret in a # comment line of the annotation run', rep('        publish csh "$O_CSH"\n', '        publish csh "$O_CSH"\n        # ${{ secrets.GITHUB_TOKEN }}\n')],
    [keys[9], 'a secret in a # comment line of step (b)', rep('tee -a ../msbuild-harness.log\n', 'tee -a ../msbuild-harness.log\n        # ${{ secrets.X }}\n')],
    [keys[9], '${{ SECRETS.X }} in the annotation run', rep('        publish csh "$O_CSH"\n', '        publish csh "$O_CSH"\n        echo ${{ SECRETS.X }}\n')],
    [keys[9], '${{ github.TOKEN }} in the annotation run', rep('        publish csh "$O_CSH"\n', '        publish csh "$O_CSH"\n        echo ${{ github.TOKEN }}\n')],
    [keys[13], 'the job shell changed to bash {0}', rep('        shell: bash\n', '        shell: bash {0}\n')],
    [keys[13], 'the shell removed', rep('        shell: bash\n', '')],
    [keys[14], 'continue-on-error on the annotation step', rep('      working-directory: .\n      env:', '      working-directory: .\n      continue-on-error: true\n      env:')],
    [keys[14], 'continue-on-error on the job', rep('    runs-on: ubuntu-latest\n', '    runs-on: ubuntu-latest\n    continue-on-error: true\n')],
    [keys[1], 'step (b) back to set -o pipefail', rep('        set -eo pipefail\n        node scripts/pins-perflean/msbuild', '        set -o pipefail\n        node scripts/pins-perflean/msbuild')],
    [keys[6], 'a job-level permissions: write-all', rep('    runs-on: ubuntu-latest\n', '    runs-on: ubuntu-latest\n    permissions: write-all\n')],
    [keys[15], 'a third job', text + '\n  extra:\n    runs-on: ubuntu-latest\n    steps:\n    - run: echo hi\n'],
    [keys[15], 'a persist-credentials: false removed', rep('        persist-credentials: false\n', '')],
    [keys[15], 'a runs-on changed', rep('    runs-on: windows-latest\n', '    runs-on: self-hosted\n')],
    [keys[9], "github['token'] in the annotation run", rep('        publish csh "$O_CSH"\n', `        publish csh "$O_CSH"\n        echo \${{ github['token'] }}\n`)],
    [keys[9], 'github["token"] in the annotation run', rep('        publish csh "$O_CSH"\n', `        publish csh "$O_CSH"\n        echo \${{ github["token"] }}\n`)],
  ];
  const k17 = keys[16];
  brk.push(
    [keys[17], 'a line after the qtools step that makes it unable to fail', rep('        node "$runner" --root "$PWD" 2>&1 | tee ../quality.log\n', '        node "$runner" --root "$PWD" 2>&1 | tee ../quality.log\n        true\n')],
    [keys[17], 'the qtools step gets one more argument', rep('node "$runner" --root "$PWD" 2>&1', 'node "$runner" --root "$PWD" --no-a11y 2>&1')],
    [keys[17], 'the qtools step moved after the first gate', (() => {
      const a = text.indexOf('    # The quality checks of docs/contract-qtools.md'); const b = text.indexOf('    - name: Gate - build-shells --check'); const c = text.indexOf('    - name: Gate - build-locales --check');
      return text.slice(0, a) + text.slice(b, c) + text.slice(a, b) + text.slice(c);
    })()],
    [keys[17], 'one more step in the stretch row 17 does not hash', rep('    - name: Publish failure details as annotations\n', '    - name: Extra\n      run: echo hi\n\n    - name: Publish failure details as annotations\n')],
  );
  brk.push(
    [k17, 'a quoted job-level "permissions": write-all', rep('    runs-on: ubuntu-latest\n', '    runs-on: ubuntu-latest\n    "permissions": write-all\n')],
    [k17, 'a flow-style third job', text + '  extra: { runs-on: ubuntu-latest, permissions: write-all, steps: [ { run: echo hi } ] }\n'],
    [k17, 'a container: image on the smoke job', rep('    runs-on: ubuntu-latest\n', '    runs-on: ubuntu-latest\n    container: ghcr.io/someone/image:latest\n')],
    [k17, 'persist-credentials: false moved to the upload step', (() => {
      const m = rep('        repository: ixian-platform/Ixian-Core\n        ref: ${{ env.IXIAN_CORE_REF }}\n        path: Ixian-Core\n        persist-credentials: false\n', '        repository: ixian-platform/Ixian-Core\n        ref: ${{ env.IXIAN_CORE_REF }}\n        path: Ixian-Core\n');
      return m.replace('        retention-days: 14\n', '        retention-days: 14\n        persist-credentials: false\n'); })()],
    [k17, 'another repository for the Core checkout', rep('        repository: ixian-platform/Ixian-Core\n', '        repository: someone/Ixian-Core\n')],
    // ★ walktools2 re-base (2026-11-23): the npm line is `npm ci` now (was `npm i --no-save <five tools>`); the break keeps its meaning (one more thing on the npm line) with the new anchor
    [k17, 'one more argument on the npm line', rep('      run: npm ci\n', '      run: npm ci left-pad@1.3.0\n')],
  );
  for (const [key, what, mut] of brk) {
    // row 17 holds the whole file, so every other break turns it red too: it is left out of the "only this row" test of the
    // other breaks; its own breaks above are changes that every OTHER row lets through (only row 17 may go red there)
    const r = rows(mut); const red = Object.keys(r).filter((k) => r[k] !== true && (key === k17 || k !== k17));
    ok(red.length === 1 && red[0] === key, 'D-CI BREAK ' + what + ' → only row "' + key.slice(0, 40) + '…" goes red (got: ' + (red.map((k) => k.split(' ')[0]).join(',') || 'none') + ')');
  }
  ok(keys.every((k) => brk.some((b) => b[0] === k)), 'D-CI every row has at least one break (' + new Set(brk.map((b) => b[0])).size + ' / ' + keys.length + ' rows, ' + brk.length + ' breaks)');
}
