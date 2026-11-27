/* ==== The gate diff (scripts/quality/gate-diff.mjs, interface I4 of docs/contract-qtools.md) — every change of the eight kinds
 * in a range needs an added row of docs/security-handover-gate.md that names it; exit 1 when one is MISSING, 2 when a commit
 * cannot be read; no skip token.
 * BEHAVIOUR PIN on a FIXTURE: a temp git repository (mkdtemp, `git init`, fixed author / committer / dates, the user's and the
 * system's git config switched off) with one base commit; per case a head commit on its own branch. The script runs as a CLI
 * (`node <root>/scripts/quality/gate-diff.mjs --root <fixture> --base … --head …`) and through its export `gateDiff`.
 * LIMITS (#1735): the fixture holds one short shape per kind (the shapes of the head comment of gate-diff.mjs, not every one);
 * the patterns' reach on the real tree is the calibration's (scripts/quality/gate-diff.md), not this pin's; the contract case
 * uses the I3 shape as written in the contract today (builder-c's file may add fields, which the script ignores); the pin
 * does not read the CI step (I6) or the base-copy rule of the runner. Each case reads the whole item list, so a second
 * item of another kind fails the case too ("exactly that kind").
 *   k0 clean       — the base itself and a docs-only change: exit 0, 0 items.
 *   k1…k9 kinds    — per kind a BREAK (the change, no row) → exit 1, the items are exactly [kind token]; the FIX (the same change
 *                    + a gate row that names it in a code span) → exit 0. Kinds: webview-setting, resource-path (a new Raw file;
 *                    a new C# path literal), verb (an added `ixian:` literal; a contract-only verb), file-write (named by its
 *                    member), network-call (fetch; a remote img src; a remote script src), storage-key, html-sink (named by its function),
 *                    check-changed (named by the workflow's `name:`).
 *   k10 no skip    — the webview break with "skip" and "[gate skip]" in the commit message and `// gate-diff: skip` in the file:
 *                    the same exit 1 and the same items.
 *   k11 row rule   — the token outside a code span, or only in docs/be-review-pack/: still MISSING (exit 1).
 *   k12 not new    — a moved existing verb, a comment-only `File.Delete(`, a changed built Raw/html file, an `<a href>` to a
 *                    remote page (a tap, not a fetch): exit 0, 0 items.
 *   k13 read error — an unknown 40-hex sha, an option-shaped revision, a missing --head: exit 2.
 * DELIBERATE BREAKS (#802; each must fail for exactly its reason): every BREAK commit of k1…k11 is one; and on a scratch copy
 * of the script (`node scripts/run-pins.mjs --root <copy> pins-qtools/d-gatediff`): delete the `.Settings\.([A-Z]\w*)\s*=`
 * pattern → k1 (the break lists nothing; k10, k11 and the I4 row reuse that change and go red with it); make `names()` ignore
 * code spans → k11 (plain) only; make the CLI return 0 on a read error → k13 (four rows); return no items when the head's
 * message says "gate skip" → k10 only; drop the merge-base filter of verbs → k12 only (`ixian:back` listed). */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync as rf } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as pj, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const ENV = {
  ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^GIT_/.test(k))),
  GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0',
  GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid', GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
  GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z', GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z', LC_ALL: 'C',
};
const GATE = 'docs/security-handover-gate.md';

const BASE_FILES = {
  [GATE]: '# gate\n\n## Session base\n\n| item | verb / key / sink / fetch / log? | verdict |\n|---|---|---|\n| base | none | ours, safe |\n',
  'Spixi/Platforms/Android/WebViewRenderer.cs': 'namespace Fx\n{\n    public class Renderer\n    {\n        void setup(Android.Webkit.WebView webView)\n        {\n            webView.Settings.JavaScriptEnabled = true;\n        }\n    }\n}\n',
  'Spixi/Utils/Store.cs': 'using System.IO;\nnamespace Fx\n{\n    public static class Store\n    {\n        public static string root(string dir)\n        {\n            return Path.Combine(dir, "Sent");\n        }\n\n        public static void saveIt(string p)\n        {\n            System.Console.WriteLine(p);\n        }\n    }\n}\n',
  'src/bridge/native.js': "export function send(v) { window.location.href = v; }\nexport function back() { send('ixian:back'); }\nexport function renderMsg(el, msg) {\n  el.textContent = msg;\n}\n",
  'src/shells/chat.html': '<!doctype html>\n<html><body>\n<div id="log"></div>\n<script>\n  var x = 1;\n</script>\n</body></html>\n',
  'Spixi/Resources/Raw/html/chat.html': '<!doctype html>\n<html><body><div id="log"></div></body></html>\n',
  '.github/workflows/ci.yml': 'name: fixture-ci\non: [push]\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo one\n',
  'docs/bridge-contract.json': JSON.stringify({ schema: 1, generator: 'scripts/quality/bridge-contract.mjs', verbs: { back: { senders: ['chat.html'], emitFiles: ['src/bridge/native.js'], handlers: [{ file: 'Spixi/Pages/Chat/SingleChatPage.xaml.cs', member: 'onNavigating' }], payload: '', marks: [] } }, parsers: [] }, null, 2) + '\n',
};

export default async function (h) {
  const { ok, root } = h;
  const script = pj(root, 'scripts/quality/gate-diff.mjs');
  const fx = mkdtempSync(pj(tmpdir(), 'gatediff-fx-'));
  const git = (...a) => execFileSync('git', ['-C', fx, '-c', 'init.defaultBranch=main', '-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false', ...a], { env: ENV, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const put = (files) => { for (const [p, t] of Object.entries(files)) { mkdirSync(dirname(pj(fx, p)), { recursive: true }); writeFileSync(pj(fx, p), t); } };
  const read = (p) => rf(pj(fx, p), 'utf8');
  const commit = (msg) => { git('add', '-A'); git('commit', '-q', '--allow-empty', '-m', msg); return git('rev-parse', 'HEAD'); };
  const run = (base, head, extra = []) => {
    const r = spawnSync(process.execPath, [script, '--root', fx, '--base', base, '--head', head, ...extra], { encoding: 'utf8', env: ENV });
    const items = (r.stdout || '').split('\n').filter((l) => / → row: /.test(l)).map((l) => { const m = /^(\S+) (\S+):(\d+) (.+?) → row: (found|MISSING)/.exec(l); return m ? { kind: m[1], file: m[2], token: m[4], row: m[5] } : { kind: '?', token: l }; });
    return { code: r.status, items, out: (r.stdout || '') + (r.stderr || '') };
  };
  const show = (r) => 'exit ' + r.code + ' items ' + JSON.stringify(r.items.map((i) => i.kind + ' ' + i.token + ' ' + i.row));
  try {
    git('init', '-q');
    put(BASE_FILES);
    const base = commit('base');

    /* ── k0 · clean ── */
    const r0 = run(base, base);
    ok(r0.code === 0 && r0.items.length === 0 && /GATE-DIFF OK/.test(r0.out), 'k0 clean: base..base exit 0, 0 items — ' + show(r0));
    git('checkout', '-q', '-B', 'docs', base);
    put({ 'docs/notes.md': 'a note\n' });
    const d0 = commit('docs only');
    const r0b = run(base, d0);
    ok(r0b.code === 0 && r0b.items.length === 0, 'k0 clean: a docs-only change exit 0, 0 items — ' + show(r0b));

    /* one BREAK + one FIX per case; `edit` changes the work tree from the base state */
    const cases = [
      { id: 'k1 webview-setting', kind: 'webview-setting', token: 'AllowUniversalAccessFromFileURLs',
        edit: () => put({ 'Spixi/Platforms/Android/WebViewRenderer.cs': read('Spixi/Platforms/Android/WebViewRenderer.cs').replace('JavaScriptEnabled = true;', 'JavaScriptEnabled = true;\n            webView.Settings.AllowUniversalAccessFromFileURLs = true;') }),
        row: '| `webView.Settings.AllowUniversalAccessFromFileURLs = true` | WebView setting | ours |' },
      { id: 'k2 resource-path (new Raw file)', kind: 'resource-path', token: 'extra.html',
        edit: () => put({ 'Spixi/Resources/Raw/html/extra.html': '<!doctype html>\n<p>extra</p>\n' }),
        row: '| the new packaged page `Spixi/Resources/Raw/html/extra.html` | file in the package | ours |' },
      { id: 'k3 resource-path (C# path literal)', kind: 'resource-path', token: 'Thumbs2',
        edit: () => put({ 'Spixi/Utils/Store.cs': read('Spixi/Utils/Store.cs').replace('return Path.Combine(dir, "Sent");', 'return Path.Combine(dir, "Sent", "Thumbs2");') }),
        row: '| the folder `Thumbs2` under `Sent` | a path C# reads | ours |' },
      { id: 'k4 verb (added literal)', kind: 'verb', token: 'ixian:fixtureverb',
        edit: () => put({ 'src/bridge/native.js': read('src/bridge/native.js') + "export function extra() { send('ixian:fixtureverb'); }\n" }),
        row: '| `ixian:fixtureverb` (chat → C#) | a new verb | ours |' },
      { id: 'k5 verb (contract only)', kind: 'verb', token: 'ixian:contractonly', also: [['check-changed', 'docs/bridge-contract.json']],
        edit: () => { const c = JSON.parse(read('docs/bridge-contract.json')); c.verbs.contractonly = { senders: ['home.html'], emitFiles: [], handlers: [{ file: 'Spixi/Pages/Home/HomePage.xaml.cs', member: 'onNavigating' }], payload: '', marks: [] }; put({ 'docs/bridge-contract.json': JSON.stringify(c, null, 2) + '\n' }); },
        row: '| `ixian:contractonly` (home → C#), `docs/bridge-contract.json` regenerated | a new verb | ours |' },
      { id: 'k6 file-write', kind: 'file-write', token: 'File.WriteAllText',
        edit: () => put({ 'Spixi/Utils/Store.cs': read('Spixi/Utils/Store.cs').replace('System.Console.WriteLine(p);', 'File.WriteAllText(p, "x");') }),
        row: '| `Store.saveIt` writes one file of C#\'s own name | a file write | ours |' },
      { id: 'k7 network-call (fetch)', kind: 'network-call', token: 'fetch',
        edit: () => put({ 'src/bridge/native.js': read('src/bridge/native.js') + "export function ping() { return fetch('https://example.invalid/x'); }\n" }),
        row: '| `fetch` of the ping | a network call | ours |' },
      { id: 'k8 network-call (remote img)', kind: 'network-call', token: 'tracker.example',
        edit: () => put({ 'src/shells/chat.html': read('src/shells/chat.html').replace('<div id="log"></div>', '<div id="log"></div>\n<img src="https://tracker.example/p.gif" alt="">') }),
        row: '| the image from `tracker.example` | a remote fetch at load | ours |' },
      { id: 'k8b network-call (remote script src)', kind: 'network-call', token: 'cdn.example',
        edit: () => put({ 'src/shells/chat.html': read('src/shells/chat.html').replace('</body>', '<script src="https://cdn.example/lib.js"></script>\n</body>') }),
        row: '| the script from `cdn.example` | a remote fetch at load | ours |' },
      { id: 'k9 storage-key', kind: 'storage-key', token: 'spixi.fixture.key',
        edit: () => put({ 'src/bridge/native.js': read('src/bridge/native.js') + "export function mark() { localStorage.setItem('spixi.fixture.key', '1'); }\n" }),
        row: '| `spixi.fixture.key` | a new key | ours |' },
      { id: 'k9b html-sink', kind: 'html-sink', token: 'innerHTML',
        edit: () => put({ 'src/bridge/native.js': read('src/bridge/native.js').replace('el.textContent = msg;', 'el.innerHTML = msg;') }),
        row: '| `renderMsg` parses the text as HTML | a sink | ours |' },
      { id: 'k9c check-changed', kind: 'check-changed', token: '.github/workflows/ci.yml',
        edit: () => put({ '.github/workflows/ci.yml': read('.github/workflows/ci.yml') + '      - run: echo two\n' }),
        row: '| the `fixture-ci` step two | CI only | ours |' },
    ];
    const addRow = (row) => put({ [GATE]: read(GATE) + row + '\n' });
    for (const c of cases) {
      git('checkout', '-q', '-B', 'case', base);
      c.edit();
      const brk = commit('break: ' + c.id);
      const rb = run(base, brk);
      const want = [[c.kind, c.token], ...(c.also || [])].map(([k, t]) => k + ' ' + t).sort();
      const got = rb.items.map((i) => i.kind + ' ' + i.token).sort();
      ok(rb.code === 1 && JSON.stringify(got) === JSON.stringify(want) && rb.items.every((i) => i.row === 'MISSING'),
        c.id + ' BREAK (no row): exit 1 and exactly ' + JSON.stringify(want) + ' MISSING — ' + show(rb));
      addRow(c.row);
      const fix = commit('fix: ' + c.id);
      const rf2 = run(base, fix);
      ok(rf2.code === 0 && rf2.items.length === want.length && rf2.items.every((i) => i.row === 'found'), c.id + ' FIX (a row names it): exit 0, every item found — ' + show(rf2));
    }

    /* ── k10 · no skip token ── */
    git('checkout', '-q', '-B', 'skip', base);
    cases[0].edit();
    put({ 'Spixi/Platforms/Android/WebViewRenderer.cs': '// gate-diff: skip\n// [gate skip]\n' + read('Spixi/Platforms/Android/WebViewRenderer.cs') });
    const sk = commit('skip [gate skip] gate-diff: skip');
    const rs = run(base, sk);
    ok(rs.code === 1 && rs.items.length === 1 && rs.items[0].kind === 'webview-setting' && rs.items[0].row === 'MISSING',
      'k10 no skip: "skip" / "[gate skip]" in the message and a file marker change nothing — ' + show(rs));
    const rs2 = run(base, sk, ['--json']);
    ok(rs2.code === 1, 'k10 no skip: --json does not change the exit code — exit ' + rs2.code);

    /* ── k11 · the row rule ── */
    git('checkout', '-q', '-B', 'plain', base);
    cases[0].edit();
    addRow('| the setting AllowUniversalAccessFromFileURLs, written without a code span | WebView setting | ours |');
    const pl = commit('plain row');
    const rp = run(base, pl);
    ok(rp.code === 1 && rp.items.length === 1 && rp.items[0].row === 'MISSING', 'k11 row rule: a name outside a code span does not count — ' + show(rp));
    git('checkout', '-q', '-B', 'pack', base);
    cases[0].edit();
    put({ 'docs/be-review-pack/P1.md': '| `AllowUniversalAccessFromFileURLs` | a packet row |\n' });
    const pk = commit('pack row');
    const rk = run(base, pk);
    ok(rk.code === 1 && rk.items.length === 1 && rk.items[0].row === 'MISSING', 'k11 row rule: a row in docs/be-review-pack/ does not count — ' + show(rk));
    git('checkout', '-q', '-B', 'other', base);
    cases[0].edit();
    addRow('| `Settings.AllowUniversalAccessFromFileURLsX` (a longer identifier) · `AllowFileAccess` (another one) | WebView setting | ours |');
    const ot = commit('other name');
    const ro = run(base, ot);
    ok(ro.code === 1 && ro.items[0] && ro.items[0].row === 'MISSING', 'k11 row rule: a longer or other identifier does not count — ' + show(ro));

    /* ── k12 · not new ── */
    git('checkout', '-q', '-B', 'notnew', base);
    put({ 'src/bridge/moved.js': "export function back2(send) { send('ixian:back'); }\n" });
    put({ 'Spixi/Utils/Store.cs': read('Spixi/Utils/Store.cs').replace('System.Console.WriteLine(p);', 'System.Console.WriteLine(p);   // File.Delete(p) is never called here\n            /* Directory.Delete(p); */') });
    put({ 'src/shells/chat.html': read('src/shells/chat.html').replace('<div id="log"></div>', '<div id="log"></div>\n<a href="https://spixi.io/help">help</a>') });
    put({ 'Spixi/Resources/Raw/html/chat.html': read('Spixi/Resources/Raw/html/chat.html').replace('</body>', '<script>fetch("https://x.invalid")</script></body>') });
    const nn = commit('not new');
    const rn = run(base, nn);
    ok(rn.code === 0 && rn.items.length === 0, 'k12 not new: an existing verb, a comment-only write, a changed built page, an <a href> link: exit 0, 0 items — ' + show(rn));

    /* ── k13 · fail closed ── */
    const bad = 'f'.repeat(40);
    const r13a = run(base, bad);
    ok(r13a.code === 2 && /cannot read the commit/.test(r13a.out), 'k13 read error: an unknown head sha exit 2 — exit ' + r13a.code);
    const r13b = run(bad, base);
    ok(r13b.code === 2, 'k13 read error: an unknown base sha exit 2 — exit ' + r13b.code);
    const r13c = run('--output=/tmp/x', base);
    ok(r13c.code === 2, 'k13 read error: an option-shaped revision exit 2 — exit ' + r13c.code);
    const r13d = spawnSync(process.execPath, [script, '--root', fx, '--base', base], { encoding: 'utf8', env: ENV });
    ok(r13d.status === 2, 'k13 usage: a missing --head exit 2 — exit ' + r13d.status);
    const r13f = spawnSync(process.execPath, [script, '--root', pj(fx, 'no-such-dir'), '--base', base, '--head', base], { encoding: 'utf8', env: ENV });
    ok(r13f.status === 2, 'k13 read error: a root that is not a repository exit 2 — exit ' + r13f.status);

    /* ── the export (I4 shape) ── */
    const mod = await import(pathToFileURL(script).href);
    git('checkout', '-q', '-B', 'api', base);
    cases[0].edit();
    const ap = commit('api');
    const res = mod.gateDiff({ root: fx, base, head: ap });
    ok(Array.isArray(res.items) && Array.isArray(res.rows) && Array.isArray(res.missing) && res.missing.length === 1
      && ['kind', 'file', 'line', 'token'].every((k) => k in res.missing[0]) && res.missing[0].line === 8,
      'I4 shape: gateDiff → { items, rows, missing }, an item { kind, file, line, token } at the added line — ' + JSON.stringify(res.missing[0] && { kind: res.missing[0].kind, file: res.missing[0].file, line: res.missing[0].line, token: res.missing[0].token }));
    let threw = '';
    try { mod.gateDiff({ root: fx, base, head: bad }); } catch (e) { threw = e && e.constructor && e.constructor.name; }
    ok(threw === 'GateDiffReadError', 'I4 shape: an unreadable commit throws GateDiffReadError (the CLI exit 2) — ' + threw);
  } finally {
    rmSync(fx, { recursive: true, force: true });
  }
}
