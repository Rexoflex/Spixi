/* ==== sizerule C — the size step of .github/workflows/redesign-ci.yml, as text.
 *
 * WHAT THIS PIN IS: a SOURCE-TEXT pin. It reads the workflow file as text and cuts it at the indent of the steps (`    - name:` at indent 4
 * starts a step of the `smoke` job; the job ends at the line `  windows-build:`). It does NOT run GitHub Actions and does not parse YAML (no
 * YAML package is installed), so it cannot know that GitHub accepts the file, that the checkout really holds two commits, or that the script
 * really runs there (the proof of that is the command run on a merge commit in pins-sizerule/b-checks and the pull request run itself).
 * Its limits:
 *   - the cut is by line shape: a re-indented file, a flow-style step (`- {name: …}`), a quoted key or a YAML anchor can confuse the rows;
 *     pins-leanfollow/d-ci row 17 holds the whole file by SHA-256 with the size pieces cut out, which is the net under these rows;
 *   - "the only environment value" (row 9) reads the text of the step: the `$NAME` words and the `${{ }}` expressions of its lines, a `#`
 *     line inside the run block included (GitHub evaluates `${{ }}` there); it does not see a value the script reads from a file;
 *   - "no network, no secret" (rows 14 and 15) are word checks on the step text and its comment block; a fetch hidden in a repo script is
 *     not seen (size-check.mjs reads git objects only: pins-sizerule/b-checks runs it with no network use);
 *   - the annotation and upload rows read lines; they cannot know that `publish` prints.
 * Rows: 1 one step of this name, in the smoke job only · 2 right after the MSBuild harness step and right before the annotation step ·
 * 3 id · 4 if · 5 timeout · 6 run block (pipefail, one command line) · 7 the command line (--ci, --summary "$GITHUB_STEP_SUMMARY", the tee
 * target, nothing else) · 8 no other key in the step (no env, with, shell, working-directory) · 9 the only environment value ·
 * 10 no `github.event` text in the file · 11 the annotation step publishes size · 12 the upload step lists size.log · 13 fetch-depth 2, once,
 * in the smoke checkout · 14 the comment block above the step · 15 no network tool or secret word in the step.
 * Each row has its deliberate break below: a mutated text in memory that makes exactly that row fail. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const NAME = 'Size (the counter and the R2 / R5 / R6 checks)';
const CMD = 'node scripts/size-check.mjs --ci --summary "$GITHUB_STEP_SUMMARY" 2>&1 | tee ../size.log';
const QTOOLS_EVENT_LINE = '        BASE_SHA: ${{ github.event.pull_request.base.sha || github.event.before }}\n';   // train2 re-base: the one github.event line of the qtools step (row 10)

const lines = (t) => t.replace(/\r\n/g, '\n').split('\n');
function smokeJob(t) {
  const L = lines(t); const a = L.findIndex((l) => l === '  smoke:'); const b = L.findIndex((l, i) => i > a && /^  windows-build:/.test(l));
  return a < 0 || b < 0 ? null : L.slice(a, b);
}
function steps(job) {  // [{ name, at, lines }]; a step ends before the next `    - name:` and drops the blank and indent-4 comment lines at its end
  const out = []; if (!job) return out;
  job.forEach((l, i) => { const m = /^    - name: (.*)$/.exec(l); if (m) out.push({ name: m[1].trim(), at: i, lines: [] }); });
  out.forEach((s, k) => {
    const end = k + 1 < out.length ? out[k + 1].at : job.length; const body = job.slice(s.at, end);
    while (body.length && (body[body.length - 1].trim() === '' || /^    #/.test(body[body.length - 1]))) body.pop();
    s.lines = body;
  });
  return out;
}
const live = (l) => l.trim() !== '' && !/^\s*#/.test(l);

function rows(t) {
  const R = {}; const L = lines(t); const job = smokeJob(t); const st = steps(job); const names = st.map((s) => s.name);
  const at = names.findIndex((n) => n.startsWith('Size ('));   // the rows below read this step; row 1 holds its exact name
  const S = at >= 0 ? st[at] : { lines: [], at: -1 }; const body = S.lines; const bl = body.filter(live);
  const ann = st.find((s) => s.name === 'Publish failure details as annotations'); const upl = st.find((s) => s.name === 'Upload the logs (on failure)');
  const msb = names.indexOf('MSBuild harness (the lean packaging targets)'); const annAt = names.indexOf('Publish failure details as annotations');
  const runAt = bl.indexOf('      run: |'); const runLines = runAt < 0 ? [] : bl.slice(runAt + 1);

  R['1 exactly one step named "' + NAME + '" in the file, and it is in the smoke job'] =
    names.filter((n) => n === NAME).length === 1 && L.filter((l) => /^\s*- name: Size \(/.test(l)).length === 1 && names.includes(NAME);
  R['2 it sits right after "MSBuild harness (the lean packaging targets)" and right before "Publish failure details as annotations"'] =
    msb >= 0 && at === msb + 1 && annAt === at + 1;
  R['3 its id is `size` (the line after the name), and no other line of the file sets that id'] =
    bl[1] === '      id: size' && L.filter((l) => /^\s*id: size\s*$/.test(l)).length === 1;
  R['4 its if: is `${{ !cancelled() }}`'] = bl.filter((l) => /^      if:/.test(l)).length === 1 && bl.includes('      if: ${{ !cancelled() }}');
  R['5 its timeout is 10 minutes'] = bl.filter((l) => /^      timeout-minutes:/.test(l)).length === 1 && bl.includes('      timeout-minutes: 10');
  R['6 its run block is `set -eo pipefail` and ONE command line'] = runLines.length === 2 && runLines[0] === '        set -eo pipefail' && /^        node /.test(runLines[1]);
  R['7 the command line is `' + CMD + '`: --ci and --summary "$GITHUB_STEP_SUMMARY" and nothing else'] = runLines.find((l) => /^\s+node /.test(l)) === '        ' + CMD;
  R['8 the step has no other key: no env, with, shell, working-directory, continue-on-error, uses'] =
    bl.filter((l) => /^      [A-Za-z_-]+:/.test(l)).map((l) => /^      ([A-Za-z_-]+):/.exec(l)[1]).every((k) => ['id', 'if', 'timeout-minutes', 'run'].includes(k)) && bl.filter((l) => /^    - /.test(l)).length === 1;
  const names9 = [...body.join('\n').matchAll(/\$\{?([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]); const exprs = [...body.join('\n').matchAll(/\$\{\{[\s\S]*?\}\}/g)].map((m) => m[0]);
  R['9 the only environment value in the step is GITHUB_STEP_SUMMARY: no other $NAME, and no `${{ }}` that reads a context value (a # line of the run block included)'] =
    S.at >= 0 && names9.every((n) => n === 'GITHUB_STEP_SUMMARY') && !exprs.some((e) => /\b(github|env|secrets|vars|inputs|matrix|steps|needs|runner|job|strategy)\s*[.[]/.test(e));
  /* train2 re-base (the merge of work/qtools): the qtools quality step brings ONE env line that reads the event's base commit (it is
   * checked as 40 hex before use; pins-leanfollow/d-ci rows 17 and 18 hold that step literally, once). Row 10 admits exactly that
   * line, byte for byte, when it is found exactly once; any other github.event text, or that line twice, stays red. */
  const tEv = t.split(QTOOLS_EVENT_LINE).length === 2 ? t.replace(QTOOLS_EVENT_LINE, '') : t;
  R['10 no github.event text anywhere in the file (comments included), except the ONE qtools BASE_SHA line'] = !/github\s*\.\s*event|github\s*\[\s*['"]event/i.test(tEv);
  const annL = ann ? ann.lines : []; const uplL = upl ? upl.lines : [];
  R['11 the annotation step publishes size: `O_SIZE: ${{ steps.size.outcome }}` and `publish size "$O_SIZE"`'] =
    annL.filter((l) => l === '        O_SIZE: ${{ steps.size.outcome }}').length === 1 && annL.filter((l) => l === '        publish size "$O_SIZE"').length === 1;
  R['12 the upload step lists size.log'] = uplL.filter((l) => l === '          size.log').length === 1 && uplL.includes('        path: |');
  const fetchAt = L.map((l, i) => (/^\s*fetch-depth:/.test(l) ? i : -1)).filter((i) => i >= 0);
  const first = job ? st.find((s) => s.name === 'Checkout Spixi') : null;
  R['13 `fetch-depth: 2` appears once in the file, in the smoke job\'s Spixi checkout (path: Spixi, persist-credentials: false stay)'] =
    fetchAt.length === 1 && L[fetchAt[0]] === '        fetch-depth: 2' && !!first && first.lines.includes('        fetch-depth: 2') && first.lines.includes('        path: Spixi') &&
    first.lines.includes('        persist-credentials: false') && st.filter((s) => s.name === 'Checkout Spixi').length === 1;
  const above = []; if (S.at >= 0) { for (let i = S.at - 1; i >= 0 && /^    #/.test(job[i]); i--) above.unshift(job[i]); }
  R['14 a comment block of at least four lines sits right above the step, and it says that the step needs no network and reads no secret'] =
    above.length >= 4 && /no network/i.test(above.join(' ')) && /no secret/i.test(above.join(' '));
  const wordText = above.concat(body).join('\n');
  R['15 no network tool, package install or secret word in the step (its comment block and run-block comments included)'] =
    S.at >= 0 && !/\b(curl|wget|npm|npx|pip3?|secrets|GITHUB_TOKEN|dotnet)\b|github\.token|git\s+(clone|fetch|pull|remote)/.test(wordText);
  return R;
}

export default async function ({ ok, root }) {
  const text = readFileSync(join(root, '.github', 'workflows', 'redesign-ci.yml'), 'utf8').replace(/\r\n/g, '\n');
  const base = rows(text); const keys = Object.keys(base);
  for (const k of keys) ok(base[k] === true, 'SIZERULE-C ' + k);

  const rep = (from, to) => (text.split(from).length !== 2 ? null : text.replace(from, () => to));   // null = the anchor of a break is gone (the break then reports it instead of running)
  const SZ = '    - name: ' + NAME + '\n'; const RUN = '        ' + CMD + '\n';
  const brk = [
    [0, 'the step renamed', rep(SZ, '    - name: Size (the counter and the R2 / R5 / R6 checks) now\n')],
    [0, 'the step copied into the Windows job', text + '    - name: ' + NAME + '\n      run: echo hi\n'],
    [1, 'the step moved before the MSBuild harness step', (() => {
      const a = text.indexOf('    # Proves, with MSBuild itself'); const b = text.indexOf('    # Prints the size table'); const c = text.indexOf('    # Only for a step that itself failed');
      return text.slice(0, a) + text.slice(b, c) + text.slice(a, b) + text.slice(c);
    })()],
    [1, 'another step between the size step and the annotation step', rep('    # Only for a step that itself failed', '    - name: Extra\n      run: echo hi\n\n    # Only for a step that itself failed')],
    [2, 'the id renamed', rep('      id: size\n', '      id: sizecheck\n')],
    [2, 'the id line removed', rep('      id: size\n', '')],
    [3, 'the if: changed to always()', rep('      id: size\n      if: ${{ !cancelled() }}', '      id: size\n      if: ${{ always() }}')],
    [3, 'the if: removed', rep('      id: size\n      if: ${{ !cancelled() }}\n', '      id: size\n')],
    [4, 'the timeout changed to 100', rep('      id: size\n      if: ${{ !cancelled() }}\n      timeout-minutes: 10\n', '      id: size\n      if: ${{ !cancelled() }}\n      timeout-minutes: 100\n')],
    [4, 'the timeout removed', rep('      id: size\n      if: ${{ !cancelled() }}\n      timeout-minutes: 10\n', '      id: size\n      if: ${{ !cancelled() }}\n')],
    [5, 'pipefail removed', rep('        set -eo pipefail\n' + RUN, RUN)],
    [5, 'a second command line', rep(RUN, RUN + '        node scripts/size-count.mjs\n')],
    [6, 'an extra argument on the command line', rep('--ci --summary "$GITHUB_STEP_SUMMARY" 2>&1', '--ci --summary "$GITHUB_STEP_SUMMARY" --base HEAD 2>&1')],
    [6, '--ci dropped', rep('size-check.mjs --ci --summary', 'size-check.mjs --summary')],
    [6, 'the tee target changed', rep('tee ../size.log\n', 'tee ../size.txt\n')],
    [7, 'an env key on the step', rep('      id: size\n      if: ${{ !cancelled() }}\n      timeout-minutes: 10\n', '      id: size\n      if: ${{ !cancelled() }}\n      timeout-minutes: 10\n      env:\n        X: 1\n')],
    [7, 'a shell key on the step', rep('      id: size\n      if: ${{ !cancelled() }}\n      timeout-minutes: 10\n', '      id: size\n      if: ${{ !cancelled() }}\n      timeout-minutes: 10\n      shell: bash {0}\n')],
    [8, 'a `${{ }}` expression in a # line of the run block', rep('        set -eo pipefail\n' + RUN, '        set -eo pipefail\n        # ${{ github.ref }}\n' + RUN)],
    [8, 'a second $NAME in a # line of the run block', rep('        set -eo pipefail\n' + RUN, '        set -eo pipefail\n        # $HOME\n' + RUN)],
    [9, 'github.event text in the annotation step', rep('        publish csh "$O_CSH"\n', '        publish csh "$O_CSH"\n        echo "${{ github.event.head_commit.message }}"\n')],
    [9, 'github.event named in a comment', rep('    # Only for a step that itself failed', '    # not ${{ github.event.pull_request.title }}\n    # Only for a step that itself failed')],
    [9, 'the qtools BASE_SHA line twice (train2 re-base: the line is admitted once only)', rep(QTOOLS_EVENT_LINE, QTOOLS_EVENT_LINE + QTOOLS_EVENT_LINE)],
    [10, 'the publish size line removed', rep('        publish size "$O_SIZE"\n', '')],
    [10, 'the O_SIZE env line points at the wrong step', rep('        O_SIZE: ${{ steps.size.outcome }}\n', '        O_SIZE: ${{ steps.smoke.outcome }}\n')],
    [11, 'the upload list loses size.log', rep('          size.log\n', '')],
    [12, 'fetch-depth removed', rep('        fetch-depth: 2\n', '')],
    [12, 'fetch-depth: 0', rep('        fetch-depth: 2\n', '        fetch-depth: 0\n')],
    [12, 'fetch-depth moved to the Core checkout', (() => { const m = rep('        fetch-depth: 2\n', ''); return m === null ? null : m.replace('        path: Ixian-Core\n', '        path: Ixian-Core\n        fetch-depth: 2\n'); })()],
    [12, 'a second fetch-depth on the Windows checkout', text.replace(/(    runs-on: windows-latest[\s\S]*?persist-credentials: false\n)/, '$1        fetch-depth: 2\n')],
    [13, 'the comment block above the step removed', (() => { const a = text.indexOf('    # Prints the size table'); const b = text.indexOf(SZ); return text.slice(0, a) + text.slice(b); })()],
    [13, 'the comment block no longer says "no network"', rep('needs no network;', 'needs a network;')],
    [14, 'a curl named in a # line of the run block', rep('        set -eo pipefail\n' + RUN, '        set -eo pipefail\n        # curl x\n' + RUN)],
    [14, 'the word secrets in the comment block', rep('reads no secret and no event text', 'reads no secret and no event text, no secrets')],
  ];
  for (const [i, what, mut] of brk) {
    if (mut === null || typeof mut !== 'string') { ok(false, 'SIZERULE-C BREAK ' + what + ' → cannot be made: its anchor text is missing or not unique in the workflow'); continue; }
    const r = rows(mut); const red = Object.keys(r).filter((k) => r[k] !== true);
    ok(red.length === 1 && red[0] === keys[i], 'SIZERULE-C BREAK ' + what + ' → only row "' + keys[i].slice(0, 40) + '…" goes red (got: ' + (red.map((k) => k.split(' ')[0]).join(',') || 'none') + ')');
  }
  ok(keys.every((k, i) => brk.some((b) => b[0] === i)), 'SIZERULE-C every row has at least one break (' + new Set(brk.map((b) => b[0])).size + ' / ' + keys.length + ' rows, ' + brk.length + ' breaks)');
}
