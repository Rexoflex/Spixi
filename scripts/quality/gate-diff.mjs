#!/usr/bin/env node
/* gate-diff — every change in a commit range that needs a row in docs/security-handover-gate.md, and whether the range adds one.
 *
 * DEFECT CLASS (quality plan C4): a batch adds security surface (a WebView setting or hook, a packaged file or a file path, an
 * `ixian:` verb, a file write, a network call, a stored key, an HTML sink, a change to the checks themselves) and the gate doc
 * gets no row for it, so the handover sweep (CLAUDE.md ★ SECURITY HANDOVER GATE) has to find it later instead of reading it.
 *
 * READS: the file list from `git diff --name-status -z -M M head` with M = `git merge-base base head` (for a merge range
 * `first parent .. merge` M is the first parent; for a pull request the commits the base gained after the branch point do not
 * count), then the ADDED lines of the files that need them from one `git diff -U0 --text -M --no-ext-diff --no-textconv`
 * (`--text`: a `.gitattributes` `-diff` / `binary` or a NUL byte cannot turn a file into "Binary files differ"; a scanned file
 * with no readable section is a read error, exit 2). The lines are read from the head blob (`git cat-file blob`, no
 * attribute applies) with comments blanked (C#, JS, CSS: block and line comments; HTML and the project file: <!-- -->, and
 * the JS rules inside <script>); strings are kept. Scanned for the line kinds: `Spixi/**` and `src/**` files
 * `.cs .js .mjs .html .css` and `Spixi/*.csproj`, but NOT tests outside `Spixi/` (every file under `Spixi/` can ship, a
 * `SpeedTest.cs` too), NOT `src/demo/**` (the plain-browser demo, not packaged), NOT built files (`*.iife.js`,
 * `Spixi/Resources/Raw/html/**`: a NEW file there is scanned only when no `src/shells/` twin of the same name exists at head,
 * since the twin is scanned instead). `scripts/**`, `.github/**`, `docs/**`, `package*.json` and `.gitattributes` give
 * `check-changed` items only.
 *
 * KINDS (the six of I4 + two of the gate doc's own triggers; scripts/quality/gate-diff.md says why log lines are not one):
 *   webview-setting  C#: `.Settings.X =`, `.Settings.SetX(`, a WebView-level setter (SetWebViewClient, AddJavascriptInterface,
 *                    SetWebContentsDebuggingEnabled …), a WKWebViewConfiguration / WKPreferences property, a CoreWebView2
 *                    setter (AddWebResourceRequestedFilter, SetVirtualHostNameToFolderMapping …), an override of a WebView
 *                    client / delegate hook (ShouldOverrideUrlLoading, OnPageStarted, DecidePolicy …), a CoreWebView2 event
 *                    subscription (`.NewWindowRequested +=` …). token = the setting or hook name.
 *   resource-path    a NEW file under `Spixi/Resources/Raw/**` (the MauiAsset folder: in the package, readable by a page) or a
 *                    NEW `src/shells/*.html`; in C# a literal inside `Path.Combine(` / `OpenAppPackageFileAsync(` / `loadPage(`
 *                    / `generatePage(`, an `"<name>.html"` literal, or a path constant (`const string …FolderName|Dir|Path|
 *                    FileName|Extension|Prefix|Suffix = "…"`) whose `"literal"` is nowhere in `Spixi/**.cs` at M; in the
 *                    project file an asset item (`<MauiAsset Include=…>`, `LogicalName=` …) whose value is new. token = the
 *                    file / folder name or the literal.
 *   verb             an `ixian:<name>` that is new: a key of `docs/bridge-contract.json` (I3) at head and not at M, or a verb
 *                    that gained a sender shell or a handler file there, UNION an `ixian:<name>` literal on an added line
 *                    whose `ixian:<name>` appears nowhere in `src/**` / `Spixi/**` at M. token = `ixian:<name>`.
 *   file-write       C#: File.Write* / AppendAll* / Create* / Copy / Move / Delete / Replace / OpenWrite, File.Open and
 *                    `new FileStream(` with a write FileMode / FileAccess on the line, Directory.Create* / Delete / Move,
 *                    `new StreamWriter(` / `new BinaryWriter(` (not over a stream), ZipFile.ExtractToDirectory /
 *                    CreateFromDirectory, a FileInfo / DirectoryInfo `.Delete()` / `.MoveTo(` (not a numeric `MoveTo(x, y)`) /
 *                    `.CopyTo(` a path-like argument / `.Create()` / `.OpenWrite()` / `.CreateText()` / `.AppendText()` on an
 *                    instance; a type may be written with its namespace (`new System.IO.FileStream(`, `global::`). token =
 *                    the call (`File.Delete`, `FileSystemInfo.Delete`).
 *   network-call     JS: fetch( / new XMLHttpRequest / new WebSocket / sendBeacon( / new EventSource / import( / new Worker( /
 *                    importScripts(, a remote `.src =` literal; HTML and JS text: a remote URL in a src / srcset / href /
 *                    action / poster / data / background attribute (not the href of an <a> / <area>: a tap, not a fetch) or
 *                    a CSS `url(`, `setAttribute('src', 'https://…')`; CSS: a remote `url(` or `@import`; C#: new HttpClient /
 *                    WebClient / TcpClient / UdpClient / Socket / ClientWebSocket / HttpClientHandler / SocketsHttpHandler /
 *                    UriImageSource / UrlWebViewSource (with or without `System.…` / `global::`; also `T x = new()`),
 *                    ImageSource.FromUri(, `new Uri("https://…")` (token = the host), WebRequest.Create,
 *                    Dns.GetHost*, the request methods (PostAsync, GetStringAsync, DownloadString …, ConnectAsync; GetAsync /
 *                    DeleteAsync / SendAsync only on a receiver named …Http… / …Client… / …Web…). token = the API name, for
 *                    a URL the host.
 *   storage-key      JS: a quoted `spixi.<…>` literal (not a file name such as `spixi.bundle.js`) nowhere in `src/**` at M;
 *                    C#: a literal key of Preferences / SecureStorage / SLocalOnlyStore, a `…PrefKey|StoreKey|SecureKey|
 *                    StorageKey|SettingKey` constant or a constant `"flag…"` value, whose `"literal"` is nowhere in
 *                    `Spixi/**.cs` at M. token = the key as written (a prefix key keeps its trailing dot).
 *   html-sink        JS: `.innerHTML =` / `+=` and `.outerHTML =` (not `= ''`), insertAdjacentHTML( / createContextualFragment(
 *                    / parseFromString( / setHTML( / setHTMLUnsafe(, document.write(, new DOMParser, new Function, eval(,
 *                    `.srcdoc =`; HTML: a `srcdoc` attribute. token = the sink name.
 *   check-changed    any added, changed, renamed or deleted file the checks are or read: `scripts/quality/**`,
 *                    `scripts/lib/**`, `scripts/pins-qtools/**`, `.github/**`, `docs/bridge-contract.json`, `package.json`,
 *                    `package-lock.json`, a `.gitattributes` at any depth. NOT `scripts/smoke-test.mjs` (18 of the 30
 *                    calibration merges change it: every pull request would need the row). token = the path.
 *
 * A ROW THAT NAMES AN ITEM: an ADDED line of `docs/security-handover-gate.md` in the same diff whose nearest heading above it
 * (`#`…`######`, outside a code fence) is ALSO added by the diff — the batch's own section or subsection; an edit of an old
 * row or a line added to an old section names nothing — with, inside a code span (`…`), one of the item's names as written
 * (case-sensitive; no [A-Za-z0-9_] glued to either end). The names:
 *   - webview-setting, verb, storage-key: the token;
 *   - file-write, network-call, html-sink: NOT the API token (`fetch`, `innerHTML`, `File.Delete`, `HttpClient` would name
 *     every site of the batch) but the C# member / JS function that holds the line, the variable it declares (4 characters
 *     or more); a URL host token (network-call) names itself;
 *   - resource-path: the path, the path under `Raw/`, the folder as `Raw/<dir>/` or `Spixi/Resources/Raw/<dir>/`, the C#
 *     constant's name, the item tag and the MSBuild target of a project-file item;
 *   - check-changed: the path, the file name (not a README / index / package.json / config file), a workflow's `name:`;
 *   - the line kinds but verb and storage-key: a reference `<file name>:<n>` / `<file name>:<a>-<b>`, or a bare `:<n>` span
 *     on a line that names the file in a code span, within 3 lines of the item's line;
 *   - only in a TABLE ROW (a `|` line): a C# type (class / struct / record / interface) that holds the line and is NEW at M
 *     (declared nowhere in `Spixi/**.cs` there: a new partial file of an old class is not named by the class), so a new
 *     store's verdict row names its class, not each of its calls.
 * Only that file counts: a packet in `docs/be-review-pack/` names nothing here. There is NO skip token: no commit message,
 * pull request text, file marker or option turns a kind off (the script reads no message and no pull request); the answer
 * to a MISSING line is a row.
 *
 * EXIT: 0 every item is named · 1 an item is MISSING · 2 a commit, the merge base, a head file or the diff cannot be read, a
 * scanned file reads as binary, or the arguments are wrong (fail closed). The last line of a 0 / 1 run is exactly
 * `GATE-DIFF OK` / `GATE-DIFF FAIL` (not with --json). Run as a program it compares REAL paths (a symlinked folder).
 *
 * CANNOT SEE: a verb, key, path or URL composed at run time (`'ixian:' + v`, a variable host); a call spread over several
 * lines whose identifying token is not on an added line (a `new FileStream(` whose FileMode is on the next line); a key whose
 * constant name is not one of the shapes above (`PassKey = "walletpass"`); a setting set through reflection, a helper it
 * does not know, XAML or a platform manifest / plist / provider xml; a write or fetch through a Core or our own helper (only
 * the primitive call is a kind: a new call site of `ChatMediaStore.deleteChat` is not); C# → JS pushes and
 * `EvaluateJavaScriptAsync`; log lines (gate 18 of the smoke holds the ones that carry user data); changes outside
 * `Spixi/**` and `src/**` (Ixian-Core, the push service project); whether a row's verdict is right, or that the row that names
 * an item is about it (a row about a log line that names the member counts for a write in that member). A literal that
 * also appeared at M (anywhere in the scanned trees, comments included) is not new: code moved between files is not listed,
 * and neither is a new use of an old literal. */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const GATE_DOC = 'docs/security-handover-gate.md';
export const CONTRACT = 'docs/bridge-contract.json';
export const KINDS = ['webview-setting', 'resource-path', 'verb', 'file-write', 'network-call', 'storage-key', 'html-sink', 'check-changed'];

/** a commit, file or diff that cannot be read: the CLI exits 2 (fail closed) */
export class GateDiffReadError extends Error {}

const SAFE_ENV = (() => {
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', LC_ALL: 'C' };
  for (const k of Object.keys(env)) if (/^GIT_(DIR|WORK_TREE|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|NAMESPACE|CONFIG\w*|EXTERNAL_DIFF|DIFF_OPTS|PAGER)$/.test(k)) delete env[k];
  return env;
})();
const GIT_C = ['-c', 'core.quotePath=false', '-c', 'diff.noprefix=false', '-c', 'diff.mnemonicPrefix=false', '-c', 'color.ui=never',
  '-c', 'diff.relative=false', '-c', 'diff.external=', '-c', 'core.pager=cat', '-c', 'core.attributesFile=/dev/null'];

function git(root, args, { okCodes = [0] } = {}) {
  try {
    return execFileSync('git', ['-C', root, ...GIT_C, ...args], { encoding: 'utf8', env: SAFE_ENV, maxBuffer: 1 << 29, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    if (typeof e.status === 'number' && okCodes.includes(e.status)) return e.stdout || '';
    throw new GateDiffReadError('git ' + args.slice(0, 3).join(' ') + ' failed: ' + String(e.stderr || e.message).trim().split('\n')[0]);
  }
}

/** a revision to a full commit id; a value that starts with '-' or does not name a commit is a read error */
export function resolveCommit(root, rev) {
  if (typeof rev !== 'string' || !rev || rev.startsWith('-') || /[\s\0]/.test(rev)) throw new GateDiffReadError('not a revision: ' + JSON.stringify(rev));
  let out;
  try { out = git(root, ['rev-parse', '--verify', '--quiet', '--end-of-options', rev + '^{commit}']).trim(); } catch { out = ''; }
  if (!/^[0-9a-f]{40}([0-9a-f]{24})?$/.test(out)) throw new GateDiffReadError('cannot read the commit ' + rev);
  return out;
}

/* ───────────────────────── comment blanking (newlines and string contents kept) ───────────────────────── */

/** C#: // and /* *\/ blanked; "…", @"…", $"…", """…""" and char literals kept */
export function blankCs(t, strings = false) {
  const o = t.split('');
  const n = t.length;
  const blank = (a, b) => { for (let k = a; k < b; k++) if (o[k] !== '\n' && o[k] !== '\r') o[k] = ' '; };
  for (let k = 0; k < n; k++) {
    const c = t[k], d = t[k + 1];
    if (c === '/' && d === '/') { let e = t.indexOf('\n', k); if (e < 0) e = n; blank(k, e); k = e - 1; continue; }
    if (c === '/' && d === '*') { let e = t.indexOf('*/', k + 2); e = e < 0 ? n : e + 2; blank(k, e); k = e - 1; continue; }
    if (c === '"' && t.startsWith('"""', k)) { const e = t.indexOf('"""', k + 3); const end = e < 0 ? n : e + 3; if (strings) blank(k + 3, end - 3); k = end - 1; continue; }
    if (c === '"') {
      const start = k;
      let p = k - 1, verbatim = false;
      while (p >= 0 && (t[p] === '@' || t[p] === '$')) { if (t[p] === '@') verbatim = true; p--; }
      k++;
      while (k < n) {
        if (verbatim) { if (t[k] === '"') { if (t[k + 1] === '"') { k += 2; continue; } break; } k++; continue; }
        if (t[k] === '\\') { k += 2; continue; }
        if (t[k] === '"' || t[k] === '\n') break;
        k++;
      }
      if (strings) blank(start + 1, k);
      continue;
    }
    if (c === '\'') { const m = /^'(?:\\.[^'\n]{0,8}|[^'\\\n])'/.exec(t.slice(k, k + 14)); if (m) { if (strings) blank(k + 1, k + m[0].length - 1); k += m[0].length - 1; } }
  }
  return o.join('');
}

/** JS: // and /* *\/ blanked; '…', "…", `…` (with ${} nesting) and regex literals kept */
export function blankJs(t, from = 0, to = t.length, o = t.split('')) {
  const blank = (a, b) => { for (let k = a; k < b; k++) if (o[k] !== '\n' && o[k] !== '\r') o[k] = ' '; };
  const stack = [];
  let prev = '';
  for (let k = from; k < to; k++) {
    const c = t[k], d = t[k + 1];
    if (stack.length && stack[stack.length - 1] === 0 && c === '`') { stack.pop(); stack.length && stack[stack.length - 1]++; }
    if (c === '/' && d === '/') { let e = t.indexOf('\n', k); if (e < 0 || e > to) e = to; blank(k, e); k = e - 1; continue; }
    if (c === '/' && d === '*') { let e = t.indexOf('*/', k + 2); e = e < 0 || e > to ? to : e + 2; blank(k, e); k = e - 1; continue; }
    if (c === '\'' || c === '"') { k++; while (k < to && t[k] !== c && t[k] !== '\n') { if (t[k] === '\\') k++; k++; } prev = 'a'; continue; }
    if (c === '`') {
      k++;
      while (k < to && t[k] !== '`') {
        if (t[k] === '\\') { k += 2; continue; }
        if (t[k] === '$' && t[k + 1] === '{') { const e = closeTemplateExpr(t, k + 2, to); blankJs(t, k + 2, e, o); k = e + 1; continue; }
        k++;
      }
      prev = 'a';
      continue;
    }
    if (c === '/' && (prev === '' || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev) || /\b(return|typeof|case|in|of|void|delete|throw)$/.test(t.slice(Math.max(0, k - 8), k).trimEnd()))) {
      let e = k + 1, cls = false;
      while (e < to && t[e] !== '\n') { if (t[e] === '\\') { e += 2; continue; } if (t[e] === '[') cls = true; else if (t[e] === ']') cls = false; else if (t[e] === '/' && !cls) break; e++; }
      if (t[e] === '/') { k = e; prev = 'a'; continue; }
    }
    if (!/\s/.test(c)) prev = c;
  }
  return o.join('');
}
function closeTemplateExpr(t, k, to) {
  let depth = 1;
  for (; k < to; k++) {
    const c = t[k];
    if (c === '\'' || c === '"') { k++; while (k < to && t[k] !== c && t[k] !== '\n') { if (t[k] === '\\') k++; k++; } continue; }
    if (c === '`') { k++; while (k < to && t[k] !== '`') { if (t[k] === '\\') k++; else if (t[k] === '$' && t[k + 1] === '{') k = closeTemplateExpr(t, k + 2, to); k++; } continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return k;
  }
  return to;
}

/** HTML: <!-- --> blanked; inside <script> the JS rules, inside <style> /* *\/ */
export function blankHtml(t) {
  const o = t.split('');
  const blank = (a, b) => { for (let k = a; k < b; k++) if (o[k] !== '\n' && o[k] !== '\r') o[k] = ' '; };
  const re = /<!--|<script\b[^>]*>|<style\b[^>]*>/gi;
  let m;
  while ((m = re.exec(t))) {
    if (m[0] === '<!--') { let e = t.indexOf('-->', m.index + 4); e = e < 0 ? t.length : e + 3; blank(m.index, e); re.lastIndex = e; continue; }
    const isScript = /^<script/i.test(m[0]);
    const start = m.index + m[0].length;
    let end = t.toLowerCase().indexOf(isScript ? '</script' : '</style', start);
    if (end < 0) end = t.length;
    if (isScript) blankJs(t, start, end, o);
    else { let k = start; while ((k = t.indexOf('/*', k)) >= 0 && k < end) { let e = t.indexOf('*/', k + 2); e = e < 0 || e > end ? end : e + 2; blank(k, e); k = e; } }
    re.lastIndex = end;
  }
  return o.join('');
}

/** CSS: /* *\/ blanked; '…' and "…" kept */
export function blankCss(t) {
  const o = t.split('');
  for (let k = 0; k < t.length; k++) {
    const c = t[k];
    if (c === '"' || c === '\'') { k++; while (k < t.length && t[k] !== c && t[k] !== '\n') { if (t[k] === '\\') k++; k++; } continue; }
    if (c === '/' && t[k + 1] === '*') { let e = t.indexOf('*/', k + 2); e = e < 0 ? t.length : e + 2; for (let j = k; j < e; j++) if (o[j] !== '\n') o[j] = ' '; k = e - 1; }
  }
  return o.join('');
}

/* ───────────────────────── the diff ───────────────────────── */

const unquote = (p) => (p.startsWith('"') ? JSON.parse(p.replace(/\\([0-7]{3})/g, (_, o) => '\\u00' + parseInt(o, 8).toString(16).padStart(2, '0'))) : p);

/** the files of `git diff -U0 base head`: { path, oldPath, status A|M|D|R, binary, added: [{ line, text }], hunks }.
 *  Hunk-aware: inside a hunk every line is content (its counts come from the `@@` header), so a content line that reads
 *  like a header (`++ b/x` added → `+++ b/x`) is never taken for one. */
export function parseDiff(text) {
  const files = [];
  let f = null, newLine = 0, oldLeft = 0, newLeft = 0;
  for (const raw of text.split('\n')) {
    if (oldLeft > 0 || newLeft > 0) {
      const c = raw[0];
      if (c === '+') { f.added.push({ line: newLine, text: raw.slice(1) }); newLine++; newLeft--; }
      else if (c === '-') oldLeft--;
      else if (c === ' ') { newLine++; oldLeft--; newLeft--; }
      else if (c === '\\') { /* "\ No newline at end of file" */ }
      else { oldLeft = 0; newLeft = 0; }
      if (oldLeft > 0 || newLeft > 0 || c === '+' || c === '-' || c === ' ' || c === '\\') continue;
    }
    if (raw.startsWith('diff --git ')) {
      f = { path: '', oldPath: '', status: 'M', binary: false, added: [], hunks: 0, header: raw.slice(11) };
      files.push(f);
      continue;
    }
    if (!f) continue;
    if (raw.startsWith('new file mode')) { f.status = 'A'; continue; }
    if (raw.startsWith('deleted file mode')) { f.status = 'D'; continue; }
    if (raw.startsWith('rename from ')) { f.status = 'R'; f.oldPath = unquote(raw.slice(12)); continue; }
    if (raw.startsWith('rename to ')) { f.path = unquote(raw.slice(10)); continue; }
    if (raw.startsWith('copy from ')) { f.status = 'A'; f.oldPath = unquote(raw.slice(10)); continue; }
    if (raw.startsWith('copy to ')) { f.path = unquote(raw.slice(8)); continue; }
    if (raw.startsWith('Binary files ') || raw.startsWith('GIT binary patch')) { f.binary = true; const m = / and (?:b\/(.*)|\/dev\/null) differ$/.exec(raw); if (m && m[1] && !f.path) f.path = unquote(m[1]); const a = /^Binary files (?:a\/(.*?)|\/dev\/null) and /.exec(raw); if (a && a[1] && !f.oldPath) f.oldPath = unquote(a[1]); continue; }
    if (raw.startsWith('--- ')) { const p = raw.slice(4); if (p !== '/dev/null') f.oldPath = f.oldPath || unquote(p).replace(/^a\//, ''); continue; }
    if (raw.startsWith('+++ ')) { const p = raw.slice(4); if (p !== '/dev/null') f.path = unquote(p).replace(/^b\//, ''); continue; }
    if (raw.startsWith('@@')) {
      const m = /^@@ -\d+(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(raw);
      if (!m) throw new GateDiffReadError('cannot read a hunk header: ' + raw.slice(0, 80));
      newLine = +m[2]; oldLeft = m[1] === undefined ? 1 : +m[1]; newLeft = m[3] === undefined ? 1 : +m[3]; f.hunks++;
      continue;
    }
  }
  for (const x of files) {
    if (!x.path && !x.oldPath) { const m = /^"?a\/(.*?)"? "?b\/(.*?)"?$/.exec(x.header); if (m) { x.oldPath = m[1]; x.path = m[2]; } }
    if (!x.path && x.status === 'D') x.path = x.oldPath;
    if (!x.path) x.path = x.oldPath;
    if (x.status !== 'R' && x.oldPath === x.path) x.oldPath = '';
    delete x.header;
  }
  return files;
}

/** `git diff --name-status -z -M`: [{ status A|M|D|R|T, path, oldPath }] — no content, so no attribute can hide a file */
export function parseNameStatus(text) {
  const parts = text.split('\0');
  const out = [];
  for (let k = 0; k < parts.length; k++) {
    const st = parts[k];
    if (!st) continue;
    const c = st[0];
    if (c === 'R' || c === 'C') { out.push({ status: c === 'R' ? 'R' : 'A', oldPath: parts[k + 1], path: parts[k + 2] }); k += 2; }
    else { out.push({ status: c === 'D' ? 'D' : c === 'A' ? 'A' : 'M', oldPath: '', path: parts[k + 1] }); k += 1; }
  }
  return out;
}

/* ───────────────────────── scope ───────────────────────── */

const EXT = (p) => (/\.([a-z0-9]+)$/i.exec(p) || [, ''])[1].toLowerCase();
/** the files the checks are, or depend on: a change to one needs a row (`scripts/smoke-test.mjs` is not one: 18 of the 30
 *  calibration merges change it, so every pull request would need the row; the smoke's own gates hold it) */
export const isCheckPath = (p) => /^scripts\/(quality|lib|pins-qtools)\//.test(p) || /^\.github\//.test(p) || p === CONTRACT
  || p === 'package.json' || p === 'package-lock.json' || /(^|\/)\.gitattributes$/.test(p);
/** a test file — only OUTSIDE `Spixi/`: every file under `Spixi/` can ship (`Spixi/Utils/SpeedTest.cs`) */
const isTest = (p) => !p.startsWith('Spixi/') && (/(^|\/)(tests?|__tests__|spec|specs)\//i.test(p) || /\.(test|spec)\.[cm]?js$/i.test(p) || /Tests?\.cs$/.test(p));
const RAW = 'Spixi/Resources/Raw/';
const RAW_HTML = RAW + 'html/';
export const SCANNED_EXT = ['cs', 'js', 'mjs', 'html', 'css'];
/** a file whose added lines are scanned for the line kinds (scope rules of the head comment); a binary diff is not a reason
 *  to skip one: the caller fails closed on it */
export function scansLines(f, headPaths) {
  const p = f.path;
  if (f.status === 'D') return false;
  if (/^Spixi\/[^/]+\.csproj$/.test(p)) return true;
  if (!/^(Spixi|src)\//.test(p) || !SCANNED_EXT.includes(EXT(p))) return false;
  if (isTest(p) || /^src\/demo\//.test(p) || /\.iife\.js$/.test(p)) return false;
  if (p.startsWith(RAW_HTML)) return f.status === 'A' && !headPaths.has('src/shells/' + p.slice(RAW_HTML.length));
  return true;
}

/* ───────────────────────── line patterns ───────────────────────── */

const WV_CS = [
  /\.Settings\.([A-Z]\w*)\s*=(?!=)/g,
  /\.Settings\.(Set[A-Z]\w*)\s*\(/g,
  /\bWebView\.(SetWebContentsDebuggingEnabled|SetDataDirectorySuffix|EnableSlowWholeDocumentDraw|DisableWebView|SetSafeBrowsingWhitelist|SetSafeBrowsingAllowlist|StartSafeBrowsing)\s*\(/g,
  /\.(SetWebViewClient|SetWebChromeClient|AddJavascriptInterface|RemoveJavascriptInterface|SetDownloadListener|SetAcceptThirdPartyCookies|SetAcceptCookie|SetAcceptFileSchemeCookies|SetRendererPriorityPolicy)\s*\(/g,
  /\.(WebsiteDataStore|ProcessPool|DataDetectorTypes|AllowsInlineMediaPlayback|MediaTypesRequiringUserActionForPlayback|AllowsAirPlayForMediaPlayback|AllowsPictureInPictureMediaPlayback|LimitsNavigationsToAppBoundDomains|UpgradeKnownHostsToHttps|SuppressesIncrementalRendering|ApplicationNameForUserAgent|CustomUserAgent|Inspectable|IsInspectable|AllowsBackForwardNavigationGestures|AllowsLinkPreview|AllowsMagnification|JavaScriptEnabled|JavaScriptCanOpenWindowsAutomatically|AllowsContentJavaScript|PreferredContentMode|IsFraudulentWebsiteWarningEnabled|NavigationDelegate|UIDelegate|UserDataFolder|ProfileName|AdditionalBrowserArguments|AllowSingleSignOnUsingOSPrimaryAccount|DefaultBackgroundColor)\s*=(?!=)/g,
  /\.Preferences\.([A-Z]\w*)\s*=(?!=)/g,
  /\.(SetValueForKey|SetValue)\s*\([^;]*\b(allowFileAccessFromFileURLs|allowUniversalAccessFromFileURLs|developerExtrasEnabled)\b/g,
  /\.UserContentController\.(Add\w+|Remove\w+)\s*\(/g,
  /\.(AddWebResourceRequestedFilter|RemoveWebResourceRequestedFilter|SetVirtualHostNameToFolderMapping|AddHostObjectToScript|AddScriptToExecuteOnDocumentCreatedAsync|CallDevToolsProtocolMethodAsync|OpenDevToolsWindow|SetPermissionState)\s*\(/g,
  /\bnew\s+(CoreWebView2EnvironmentOptions|WKWebViewConfiguration|WKPreferences|WKWebpagePreferences)\b/g,
  /\.(Set(?:MixedContentMode|EnableZoomControls|DisplayZoomControls|JavaScriptEnabled|IsJavaScriptAlertEnabled))\s*\(/g,
  /\boverride\s+[\w.<>?\s]*?\b(ShouldOverrideUrlLoading|ShouldInterceptRequest|OnPageStarted|OnPageFinished|OnLoadResource|OnReceivedSslError|OnReceivedHttpAuthRequest|OnReceivedClientCertRequest|OnRenderProcessGone|OnSafeBrowsingHit|OnPermissionRequest|OnShowFileChooser|OnCreateWindow|OnJsAlert|OnJsConfirm|OnJsPrompt|OnJsBeforeUnload|OnConsoleMessage|OnGeolocationPermissionsShowPrompt|OnDownloadStart|DecidePolicy|DidStartProvisionalNavigation|DidFinishNavigation|DidReceiveAuthenticationChallenge|DidReceiveServerRedirectForProvisionalNavigation|CreateWebView|RunJavaScriptAlertPanel|RunJavaScriptConfirmPanel|RunJavaScriptTextInputPanel|RequestMediaCapturePermission|DidReceiveScriptMessage|ShouldStartLoad)\s*\(/g,
  /\.(WebResourceRequested|NavigationStarting|NavigationCompleted|FrameNavigationStarting|NewWindowRequested|PermissionRequested|DownloadStarting|WebMessageReceived|ProcessFailed|ContextMenuRequested|ServerCertificateErrorDetected|BasicAuthenticationRequested|ClientCertificateRequested|SourceChanged|LaunchingExternalUriScheme)\s*\+=/g,
];
const FW_CS = [
  /\bFile\.(WriteAll\w*|AppendAll\w*|AppendText|Create\w*|Copy|Move|Delete|Replace|OpenWrite|SetAttributes|Encrypt|Decrypt|SetLastWriteTime\w*|SetCreationTime\w*)\s*\(/g,
  /\bDirectory\.(Create\w*|Delete|Move)\s*\(/g,
  /\bZipFile\.(ExtractToDirectory|CreateFromDirectory)\s*\(/g,
];
const FW_INFO = /\.(Delete\s*\(\s*(?:true|false)?\s*\)|MoveTo\s*\((?!\s*[-\d.]+\s*,)|CopyTo\s*\(\s*(?:@?\$?"|Path\.|\w*(?:[Pp]ath|[Dd]est|[Tt]arget|[Ff]ile|[Nn]ame)\w*\s*[,)]))/g;
/** FileInfo / DirectoryInfo writes with no argument, on an instance (a lower-case receiver or a `)`), not a type
 *  (`SHA256.Create()`) */
const FW_INFO0 = /(?:[a-z_]\w*|\))\.(Create|OpenWrite|CreateText|AppendText)\s*\(\s*\)/g;
/** an optional namespace before a type name: `new System.IO.FileStream(`, `new global::System.Net.Http.HttpClient()` */
const NS = String.raw`(?:global::)?(?:System(?:\.\w+)*\.)?`;
const WRITE_MODE = /\bFileMode\.(Create|CreateNew|Append|OpenOrCreate|Truncate)\b|\bFileAccess\.(Write|ReadWrite)\b/;
const NET_CS = [
  new RegExp(String.raw`\bnew\s+` + NS + String.raw`(HttpClient|WebClient|TcpClient|UdpClient|Socket|ClientWebSocket|HttpClientHandler|SocketsHttpHandler|TcpListener|Ping|SmtpClient|UriImageSource|UrlWebViewSource)\s*[({]`, 'g'),
  new RegExp(String.raw`(?:^|[^\w.])` + NS + String.raw`(HttpClient|WebClient|TcpClient|UdpClient|Socket|ClientWebSocket|HttpClientHandler|SocketsHttpHandler)\??\s+\w+\s*=\s*new\s*\(`, 'g'),
  /\b(ImageSource\.FromUri)\s*\(/g,
  /\b((?:Http|Ftp|File)?WebRequest)\.Create\w*\s*\(/g,
  /\bDns\.(GetHost\w*)\s*\(/g,
  /\.(PostAsync|PutAsync|PatchAsync|GetStringAsync|GetByteArrayAsync|GetStreamAsync|GetFromJsonAsync|PostAsJsonAsync|DownloadString\w*|DownloadData\w*|DownloadFile\w*|UploadString\w*|UploadData\w*|UploadFile\w*|OpenReadTaskAsync|ConnectAsync)\s*\(/g,
  /\b\w*(?:[Hh]ttp|[Cc]lient|[Ww]eb)\w*\.(GetAsync|DeleteAsync|SendAsync)\s*\(/g,
];
const NET_JS = [
  /(?:^|[^\w.$]|\b(?:window|globalThis|self)\.)(fetch)\s*\(/g,
  /\bnew\s+(XMLHttpRequest|WebSocket|EventSource|Worker|SharedWorker)\b/g,
  /\b(sendBeacon)\s*\(/g,
  /(?:^|[^\w.$])(import)\s*\(/g,
  /\b(importScripts)\s*\(/g,
];
const SINK_JS = [
  /\.(innerHTML|outerHTML)\s*\+?=(?!=)(?!\s*(?:''|""|``)\s*[;,)]?\s*$)/g,
  /\.(insertAdjacentHTML|createContextualFragment|parseFromString|setHTMLUnsafe|setHTML)\s*\(/g,
  /\bdocument\.(write|writeln)\s*\(/g,
  /\bnew\s+(DOMParser|Function)\b/g,
  /(?:^|[^\w.$])(eval)\s*\(/g,
  /\.(srcdoc)\s*=(?!=)/g,
];
const SINK_ATTR = /\s(srcdoc)\s*=/gi;
const REMOTE_URI_CS = /\bnew\s+(?:global::)?(?:System\.)?Uri\s*\(\s*@?\$?"(?:https?|wss?|ftp):\/\/([^"\/\s:]+)/g;
const REMOTE_SETATTR_JS = /\.setAttribute(?:NS)?\s*\((?:[^,]*,)?\s*['"`](?:src|srcset|href|action|poster|data|background|ping)['"`]\s*,\s*['"`]\s*((?:https?:)?\/\/[^'"`\s/]+)/g;
const IMPORT_CSS = /@import\s+(?:url\(\s*)?['"]?\s*((?:https?:)?\/\/[^\s'")/;]+)/gi;
const REMOTE_SRC_JS = /\.(src|href|srcset|poster|action|data)\s*=\s*['"`]\s*((?:https?:)?\/\/[^'"`\s/]+)/g;
const REMOTE_ATTR = /(?:^|[\s"'])(src|srcset|href|action|formaction|poster|data|background|ping|manifest)\s*=\s*["']?\s*((?:https?:)?\/\/[^\s"'>/]+)/gi;
const REMOTE_CSS = /\burl\(\s*['"]?\s*((?:https?:)?\/\/[^\s'")/]+)/gi;
const VERB = /ixian:([A-Za-z_][A-Za-z0-9_]*)/g;
const KEY = /['"`](spixi\.[A-Za-z0-9_.-]*)['"`]/g;
const KEY_FILE = /\.(js|mjs|css|html|json|map|txt|png|svg|woff2?)$/;
const ASSET_XML = /<(MauiAsset|MauiImage|MauiFont|MauiSplashScreen|MauiIcon|EmbeddedResource|Content|AndroidAsset|AndroidResource|BundleResource)\b[^>]*?\b(?:Include|Update|LogicalName)\s*=\s*"([^"]+)"/g;
const PATH_CALL = /\b(Path\.Combine|OpenAppPackageFileAsync|loadPage|generatePage)\s*\(/g;
const HTML_LIT = /"([\w.-]+\.html)"/g;
const PATH_CONST = /\b(?:const|static\s+readonly)\s+string\s+(\w*(?:Folder|Dir|Directory|Path|FileName|Extension|Ext|Prefix|Suffix)(?:Name)?)\s*=\s*"([^"]+)"/g;
const PREF_KEY = [
  /\b(?:Preferences|SecureStorage|SLocalOnlyStore)(?:\.Default|\.Current)?\.\w+\s*\(\s*"([^"]+)"/g,
  /\b(?:const|static\s+readonly)\s+string\s+\w*(?:Pref|Prefs|Store|Secure|Storage|Setting)Key\s*=\s*"([^"]+)"/g,
  /\b(?:const|static\s+readonly)\s+string\s+\w+\s*=\s*"(flag[A-Z0-9]\w*)"/g,
];

/** the string literals inside the parentheses that open at index `open` (same line) */
function literalsInCall(s, open) {
  const out = [];
  let depth = 0;
  for (let k = open; k < s.length; k++) {
    const c = s[k];
    if (c === '"') { const at = k; k++; let v = ''; while (k < s.length && s[k] !== '"') { if (s[k] === '\\') { v += s[k + 1] || ''; k += 2; continue; } v += s[k++]; } if (s[at - 1] !== '$') out.push(v); continue; }
    if (c === '(') depth++;
    else if (c === ')' && --depth === 0) break;
  }
  return out;
}

/** C# member / JS function that holds line n (1-based) of the blanked text lines; '' when none is found within 600 lines */
const CS_CTRL = /^(if|for|foreach|while|switch|catch|using|return|else|lock|new|await|throw|nameof|typeof|sizeof|default|when|base|this|get|set|fixed)$/;
export function enclosingCs(lines, n) {
  for (let k = n - 1; k >= 0 && k >= n - 600; k--) {
    const s = lines[k];
    const m = /^\s*(?:\[[^\]]*\]\s*)*(?:(?:public|private|protected|internal|static|async|override|virtual|sealed|extern|unsafe|new|partial|readonly|abstract)\s+)*(?:[\w.<>?,[\]()\s]+?\s+)?([A-Za-z_]\w*)\s*(?:<[^>()]*>)?\s*\(([^;=]*)$/.exec(s);
    if (m && !CS_CTRL.test(m[1]) && !/[=.]\s*$/.test(s.slice(0, s.indexOf(m[1])))) {
      if (/^\s*(?:public|private|protected|internal|static|async|override|virtual|void|[A-Z]\w*(?:<[^>]*>)?\??\s+\w)/.test(s) || /^\s*[a-z]\w*(?:<[^>]*>)?\??\s+[A-Za-z_]\w*\s*\(/.test(s)) return m[1];
    }
    const cls = /^\s*(?:(?:public|private|protected|internal|static|sealed|abstract|partial)\s+)*(?:class|struct|record|interface)\s+(\w+)/.exec(s);
    if (cls) return '';
  }
  return '';
}
/** per line (0-based) the C# types (class / struct / record / interface) whose body holds it, outermost first; braces are
 *  counted on the text with comments AND strings blanked */
export function typesByLine(raw) {
  const t = blankCs(raw, true);
  const out = [];
  const stack = [];
  let depth = 0, pending = '', line = 0;
  const decl = /\b(?:class|struct|interface|record(?:\s+(?:class|struct))?)\s+([A-Za-z_]\w*)/g;
  const lines = t.split('\n');
  for (; line < lines.length; line++) {
    const s = lines[line];
    out.push(stack.map((x) => x.name));
    decl.lastIndex = 0;
    let m, marks = [];
    while ((m = decl.exec(s))) marks.push({ at: m.index, name: m[1] });
    for (let k = 0; k < s.length; k++) {
      if (marks.length && marks[0].at === k) pending = marks.shift().name;
      const c = s[k];
      if (c === '{') { depth++; if (pending) { stack.push({ name: pending, depth }); pending = ''; } }
      else if (c === '}') { if (stack.length && stack[stack.length - 1].depth === depth) stack.pop(); depth--; }
      else if (c === ';' && pending) pending = '';
    }
    out[line] = [...new Set([...out[line], ...stack.map((x) => x.name)])];
  }
  return out;
}
/** the MSBuild <Target Name="…"> that holds line n of a project file ('' outside a target) */
export function enclosingTarget(lines, n) {
  for (let k = n - 1; k >= 0; k--) {
    if (/<\/Target\s*>/.test(lines[k]) && k < n - 1) return '';
    const m = /<Target\b[^>]*\bName\s*=\s*"([^"]+)"/.exec(lines[k]);
    if (m) return m[1];
  }
  return '';
}
const JS_CTRL = /^(if|for|while|switch|catch|return|function|typeof|await|new|import|super|with)$/;
export function enclosingJs(lines, n) {
  for (let k = n - 1; k >= 0 && k >= n - 600; k--) {
    const s = lines[k];
    let m = /\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/.exec(s)
      || /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/.exec(s)
      || /(?:^|[\s,{])([A-Za-z_$][\w$]*)\s*:\s*(?:async\s+)?(?:function\b|\([^)]*\)\s*=>)/.exec(s)
      || /^\s*(?:async\s+|static\s+|get\s+|set\s+)*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{\s*$/.exec(s);
    if (m && !JS_CTRL.test(m[1])) return m[1];
  }
  return '';
}

/** the items of one added line. ctx: { lang 'cs'|'js'|'html', inScript, enclosing() } */
function lineItems(text, ctx) {
  const out = [];
  const add = (kind, token, alsoMember, host = false) => out.push({ kind, token, alsoMember: !!alsoMember, host });
  const scan = (list, kind, alsoMember, group = 1) => { for (const re of list) { re.lastIndex = 0; let m; while ((m = re.exec(text))) add(kind, m[group], alsoMember); } };
  if (ctx.lang === 'xml') {
    ASSET_XML.lastIndex = 0;
    let m;
    while ((m = ASSET_XML.exec(text))) out.push({ kind: 'resource-path', token: m[2], alsoMember: false, constName: m[1], inTarget: true });
    return out;
  }
  if (ctx.lang === 'cs') {
    scan(WV_CS, 'webview-setting', false);
    for (const re of FW_CS) { re.lastIndex = 0; let m; while ((m = re.exec(text))) add('file-write', m[0].replace(/\s*\($/, '').replace(/^.*?\b(File|Directory|ZipFile)\./, '$1.'), true); }
    FW_INFO.lastIndex = 0;
    { let m; while ((m = FW_INFO.exec(text))) if (!/\b(File|Directory)\.$/.test(text.slice(0, m.index + 1))) add('file-write', 'FileSystemInfo.' + m[1].replace(/\s*\(.*$/s, ''), true); }
    if (/\bFile\.Open\s*\(/.test(text) && WRITE_MODE.test(text)) add('file-write', 'File.Open', true);
    if (new RegExp(String.raw`\bnew\s+` + NS + String.raw`FileStream\s*\(`).test(text) && WRITE_MODE.test(text)) add('file-write', 'FileStream', true);
    if (new RegExp(String.raw`\bnew\s+` + NS + String.raw`(StreamWriter|BinaryWriter)\s*\(\s*(?!\w*[Ss]tream\b|ms\b|new\s+` + NS + String.raw`MemoryStream)`).test(text)) add('file-write', 'StreamWriter', true);
    FW_INFO0.lastIndex = 0;
    { let m; while ((m = FW_INFO0.exec(text))) if (!/\b(File|Directory)\.$/.test(text.slice(0, m.index + m[0].indexOf('.') + 1))) add('file-write', 'FileSystemInfo.' + m[1], true); }
    REMOTE_URI_CS.lastIndex = 0;
    { let m; while ((m = REMOTE_URI_CS.exec(text))) add('network-call', m[1], true, true); }
    for (const re of NET_CS) { re.lastIndex = 0; let m; while ((m = re.exec(text))) add('network-call', m[1], true); }
    PATH_CALL.lastIndex = 0;
    let m;
    while ((m = PATH_CALL.exec(text))) for (const v of literalsInCall(text, m.index + m[0].length - 1)) if (v && !/^[\s./\\]*$/.test(v)) add('resource-path', v, false);
    HTML_LIT.lastIndex = 0;
    while ((m = HTML_LIT.exec(text))) add('resource-path', m[1], false);
    PATH_CONST.lastIndex = 0;
    while ((m = PATH_CONST.exec(text))) if (/[./\\]|^[A-Za-z][\w-]*$/.test(m[2])) out.push({ kind: 'resource-path', token: m[2], alsoMember: false, constName: m[1] });
    for (const re of PREF_KEY) { re.lastIndex = 0; while ((m = re.exec(text))) out.push({ kind: 'storage-key', token: m[1], alsoMember: false, pref: true }); }
  }
  const js = ctx.lang === 'js' || (ctx.lang === 'html' && ctx.inScript);
  if (js) {
    scan(SINK_JS, 'html-sink', true);
    scan(NET_JS, 'network-call', true);
    REMOTE_SRC_JS.lastIndex = 0;
    let m;
    while ((m = REMOTE_SRC_JS.exec(text))) add('network-call', m[2].replace(/^(https?:)?\/\//, ''), true, true);
    REMOTE_SETATTR_JS.lastIndex = 0;
    while ((m = REMOTE_SETATTR_JS.exec(text))) add('network-call', m[1].replace(/^(https?:)?\/\//, ''), true, true);
  }
  if (ctx.lang === 'css') {
    let m;
    for (const re of [REMOTE_CSS, IMPORT_CSS]) { re.lastIndex = 0; while ((m = re.exec(text))) add('network-call', m[1].replace(/^(https?:)?\/\//, ''), false, true); }
    return out;
  }
  if (ctx.lang === 'html' && !ctx.inScript) {
    let m;
    SINK_ATTR.lastIndex = 0;
    while ((m = SINK_ATTR.exec(text))) add('html-sink', m[1], false);
  }
  if (ctx.lang === 'html' || ctx.lang === 'js') {
    let m;
    REMOTE_ATTR.lastIndex = 0;
    while ((m = REMOTE_ATTR.exec(text))) {
      const tag = /<\s*([A-Za-z][\w-]*)[^<]*$/.exec(text.slice(0, m.index + 1));
      if (tag && /^(a|area)$/i.test(tag[1]) && /^href$/i.test(m[1])) continue;   /* a link opens on a tap through C#: not a fetch */
      add('network-call', m[2].replace(/^(https?:)?\/\//, ''), false, true);
    }
    REMOTE_CSS.lastIndex = 0;
    while ((m = REMOTE_CSS.exec(text))) add('network-call', m[1].replace(/^(https?:)?\/\//, ''), false, true);
  }
  VERB.lastIndex = 0;
  let v;
  while ((v = VERB.exec(text))) add('verb', 'ixian:' + v[1], false);
  if (js) { KEY.lastIndex = 0; let k; while ((k = KEY.exec(text))) if (!KEY_FILE.test(k[1]) && k[1] !== 'spixi.') add('storage-key', k[1], false); }
  return out;
}

/** script ranges of an html text, as a per-line flag: true when the line is inside <script> … </script> */
function scriptLines(t) {
  const flags = [];
  const lines = t.split('\n');
  let inside = false;
  for (const s of lines) {
    const lower = s.toLowerCase();
    let state = inside, any = inside;
    let k = 0;
    while (k < lower.length) {
      if (!state) { const o = lower.indexOf('<script', k); if (o < 0) break; const close = lower.indexOf('>', o); if (close < 0) { state = true; any = true; break; } state = true; any = true; k = close + 1; if (/\bsrc\s*=/.test(lower.slice(o, close))) { const e = lower.indexOf('</script', close); if (e >= 0) { state = false; k = e + 8; } } }
      else { const e = lower.indexOf('</script', k); if (e < 0) break; state = false; k = e + 8; }
    }
    flags.push(any);
    inside = state;
  }
  return flags;
}

/* ───────────────────────── the contract (I3) ───────────────────────── */

function readContract(root, commit) {
  let text;
  try { text = execFileSync('git', ['-C', root, ...GIT_C, 'show', commit + ':' + CONTRACT], { encoding: 'utf8', env: SAFE_ENV, maxBuffer: 1 << 27, stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; }
  try {
    const j = JSON.parse(text);
    if (!j || typeof j !== 'object' || !j.verbs || typeof j.verbs !== 'object' || Array.isArray(j.verbs)) return { bad: 'no verbs object' };
    const verbs = {};
    for (const [k, v] of Object.entries(j.verbs)) {
      const name = k.replace(/^ixian:/, '');
      const senders = Array.isArray(v && v.senders) ? v.senders.map(String) : [];
      const handlers = Array.isArray(v && v.handlers) ? v.handlers.map((h) => String(h && typeof h === 'object' ? h.file : h)) : [];
      verbs[name] = { senders, handlers };
    }
    return { verbs, text };
  } catch (e) { return { bad: 'not JSON (' + e.message.split('\n')[0] + ')' }; }
}

/** verbs new at head, or with a sender shell / handler file not there at base (both contracts readable) */
export function contractVerbs(base, head) {
  const out = [];
  for (const [name, h] of Object.entries(head.verbs)) {
    const b = base.verbs[name];
    if (!b) { out.push({ name, why: 'new verb' }); continue; }
    const s = h.senders.filter((x) => !b.senders.includes(x));
    const f = h.handlers.filter((x) => !b.handlers.includes(x));
    if (s.length || f.length) out.push({ name, why: [s.length ? 'new sender ' + s.join(', ') : '', f.length ? 'new handler file ' + f.join(', ') : ''].filter(Boolean).join('; ') });
  }
  return out.sort((a, b) => (a.name < b.name ? -1 : 1));
}

/* ───────────────────────── row matching ───────────────────────── */

const ID = /[A-Za-z0-9_]/;
/** a table row of the gate doc: a `|` line that is not the header separator */
const isTableRow = (line) => /^\s*\|/.test(line) && !/^\s*\|[\s|:-]*$/.test(line);
const REF_TOL = 3;
/** true when a code span of `line` refers to line n of `leaf` as `leaf:n` / `leaf:a-b`, or as a bare `:n` / `:a-b` on a line
 *  that names `leaf` in a code span; n may sit REF_TOL lines off (a row written a few lines before the last edit) */
export function refersTo(line, leaf, n) {
  const spans = codeSpans(line);
  const within = (a, b) => n >= a - REF_TOL && n <= (b || a) + REF_TOL;
  const esc = leaf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const full = new RegExp('(?:^|[^\\w.-])' + esc + ':(\\d+)(?:\\s*[-\u2013]\\s*:?(\\d+))?', 'g');
  let named = false;
  for (const s of spans) {
    full.lastIndex = 0;
    let m;
    while ((m = full.exec(s))) { named = true; if (within(+m[1], m[2] ? +m[2] : 0)) return true; }
    if (inSpan(s, leaf)) named = true;
  }
  if (!named) return false;
  return spans.some((s) => { const m = /^\s*:(\d+)(?:\s*[-\u2013]\s*:?(\d+))?\s*$/.exec(s); return m && within(+m[1], m[2] ? +m[2] : 0); });
}
/** the rule of the head comment: a name as written in a code span, a file:line reference (line kinds), or the C# type that
 *  holds the line (file-write, network-call, a C# resource-path) in a code span of a TABLE ROW */
export function rowNames(line, it) {
  if (it.names.some((n) => names(line, n))) return true;
  /* a file:line reference counts for the line kinds; the reference's own words are the file name and a number */
  if (it.ref && it.line > 0 && refersTo(line, it.file.split('/').pop(), it.line)) return true;
  return isTableRow(line) && it.typeNames.some((n) => names(line, n));
}
/** the code spans of a markdown line: the text between a pair of backticks (`a` or ``a``) */
export function codeSpans(line) {
  const out = [];
  const re = /(`+)([\s\S]*?[^`])\1(?!`)/g;
  let m;
  while ((m = re.exec(line))) out.push(m[2]);
  return out;
}
/** true when a code span of `line` holds `name` as written with no identifier character glued to either end */
export function names(line, name) {
  if (!name) return false;
  return codeSpans(line).some((span) => inSpan(span, name));
}
function inSpan(line, name) {
  let k = line.indexOf(name);
  while (k >= 0) {
    const before = k > 0 ? line[k - 1] : '';
    const after = line[k + name.length] || '';
    const headOk = !ID.test(name[0]) || !ID.test(before);
    const tailOk = !ID.test(name[name.length - 1]) || !ID.test(after);
    if (headOk && tailOk) return true;
    k = line.indexOf(name, k + 1);
  }
  return false;
}
const GENERIC_FILE = /^(README\.md|index\.(html|js|mjs)|package\.json|config\.ya?ml)$/i;

/* ───────────────────────── the check ───────────────────────── */

const DIFF_OPTS = ['-M', '--no-color', '--no-ext-diff', '--no-textconv', '--ignore-submodules'];
/** the file list from `--name-status` (content-free: no attribute can drop a file), then the added lines of the files that
 *  need them from ONE `-U0 --text` diff (`--text`: an attribute `-diff` / `binary` or a NUL byte cannot turn a file into
 *  "Binary files differ"). A scanned file that still has no readable section → GateDiffReadError (exit 2). */
export function readDiff(root, mb, H) {
  const list = parseNameStatus(git(root, ['diff', '--name-status', '-z', ...DIFF_OPTS, mb, H]));
  const headPaths = new Set(git(root, ['ls-tree', '-r', '--name-only', '-z', H]).split('\0').filter(Boolean));
  const files = list.map((x) => ({ ...x, binary: false, added: [], hunks: 0 }));
  const want = files.filter((f) => f.status !== 'D' && (f.path === GATE_DOC || isCheckPath(f.path) || scansLines(f, headPaths)));
  if (!want.length) return files;
  const spec = [...new Set(want.flatMap((f) => [f.path, f.oldPath].filter(Boolean)))].map((p) => ':(literal)' + p);
  const byPath = new Map(parseDiff(git(root, ['diff', '-U0', '--text', ...DIFF_OPTS, mb, H, '--', ...spec])).map((x) => [x.path, x]));
  for (const f of want) {
    const d = byPath.get(f.path);
    const scanned = f.path === GATE_DOC || scansLines(f, headPaths);
    if (!d) { if (scanned) throw new GateDiffReadError('no diff section for ' + f.path + ' (fail closed)'); continue; }
    if (d.binary && scanned) throw new GateDiffReadError(f.path + ' reads as binary in the diff (fail closed)');
    f.added = d.added; f.hunks = d.hunks; f.binary = d.binary;
  }
  return files;
}

/** I4: { base, head, mergeBase, items: [{ kind, file, line, token, names, row }], rows: [{ line, text }], missing, notes } */
export function gateDiff({ root = process.cwd(), base, head }) {
  root = resolve(root);
  const B = resolveCommit(root, base), H = resolveCommit(root, head);
  const mb = git(root, ['merge-base', B, H], { okCodes: [0, 1] }).trim();
  if (!/^[0-9a-f]{40}/.test(mb)) throw new GateDiffReadError('no merge base of ' + base + ' and ' + head);
  const notes = [];
  const files = readDiff(root, mb, H);
  const headPaths = new Set(git(root, ['ls-tree', '-r', '--name-only', '-z', H]).split('\0').filter(Boolean));
  const items = [];
  const push = (kind, file, line, token, nameList, extra = {}) => items.push({ kind, file, line, token, names: [...new Set(nameList.filter(Boolean))], typeNames: extra.typeNames || [], ref: !!extra.ref, row: null });

  /* check-changed */
  for (const f of files) {
    const hit = isCheckPath(f.path) ? f.path : (f.oldPath && isCheckPath(f.oldPath) ? f.oldPath : '');
    if (!hit) continue;
    const nm = [hit, f.path];
    const leaf = hit.split('/').pop();
    if (!GENERIC_FILE.test(leaf)) nm.push(leaf);
    if (/^\.github\/workflows\/[^/]+\.ya?ml$/.test(hit)) {
      const at = f.status === 'D' ? mb : H;
      const y = git(root, ['cat-file', 'blob', at + ':' + (f.status === 'D' ? hit : f.path)], { okCodes: [0, 128] });
      const w = /^name:\s*['"]?([^'"#\n]+?)['"]?\s*(?:#.*)?$/m.exec(y);
      if (w) nm.push(w[1].trim());
    }
    push('check-changed', hit, f.added.length ? f.added[0].line : 0, hit, nm);
  }

  /* resource-path: new packaged files and new shells */
  for (const f of files) {
    if (!(f.status === 'A' || f.status === 'R') || f.status === 'D') continue;
    const p = f.path;
    if (f.status === 'R' && f.oldPath && f.oldPath.startsWith(RAW) === p.startsWith(RAW) && f.oldPath.split('/').pop() === p.split('/').pop() && !p.startsWith(RAW)) continue;
    if (p.startsWith(RAW) || /^src\/shells\/[^/]+\.html$/.test(p)) {
      const leaf = p.split('/').pop();
      const under = p.startsWith(RAW) ? p.slice(RAW.length) : '';
      const dir = under.includes('/') ? under.slice(0, under.lastIndexOf('/') + 1) : '';
      push('resource-path', p, 0, leaf, [leaf, p, under, dir ? 'Raw/' + dir : '', dir ? RAW + dir : '']);
    }
  }

  /* line kinds */
  const lineHits = [];
  for (const f of files) {
    if (!f.added.length || !scansLines(f, headPaths)) continue;
    const ext = EXT(f.path);
    const lang = ext === 'cs' ? 'cs' : ext === 'html' ? 'html' : ext === 'csproj' ? 'xml' : ext === 'css' ? 'css' : 'js';
    let raw;
    try { raw = execFileSync('git', ['-C', root, ...GIT_C, 'cat-file', 'blob', H + ':' + f.path], { encoding: 'utf8', env: SAFE_ENV, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { throw new GateDiffReadError('cannot read ' + f.path + ' at ' + head); }
    raw = raw.replace(/^﻿/, '').replace(/\r\n?/g, (m) => (m === '\r\n' ? ' \n' : '\n'));
    const blanked = lang === 'cs' ? blankCs(raw) : lang === 'html' || lang === 'xml' ? blankHtml(raw) : lang === 'css' ? blankCss(raw) : blankJs(raw);
    const lines = blanked.split('\n');
    const inScript = lang === 'html' ? scriptLines(raw) : null;
    let encCache = new Map(), types = null;
    const enclosing = (n) => { if (!encCache.has(n)) encCache.set(n, lang === 'cs' ? enclosingCs(lines, n) : enclosingJs(lines, n)); return encCache.get(n); };
    for (const a of f.added) {
      const text = lines[a.line - 1];
      if (text === undefined || !text.trim()) continue;
      for (const it of lineItems(text, { lang, inScript: inScript ? inScript[a.line - 1] : false })) {
        const decl = /\b([A-Za-z_]\w*)\s*=\s*new\b/.exec(text);
        const typed = lang === 'cs' && (it.alsoMember || it.kind === 'resource-path');
        if (typed && !types) types = typesByLine(raw);
        if (it.inTarget) it.constName2 = enclosingTarget(lines, a.line);
        lineHits.push({ ...it, file: f.path, line: a.line, member: it.alsoMember ? enclosing(a.line) : '', decl: it.alsoMember && decl ? decl[1] : '', typeNames: typed ? types[a.line - 1] || [] : [] });
      }
    }
  }

  /* literals already at the merge base are not new */
  const baseHas = (pattern, paths, fixed) => {
    const args = ['grep', '-h', '-o', '-I', fixed ? '-F' : '-E'];
    for (const p of [].concat(pattern)) args.push('-e', p);
    const out = git(root, [...args, mb, '--', ...paths], { okCodes: [0, 1] });
    return new Set(out.split('\n').map((s) => s.replace(/^[0-9a-f]{40}:/, '')).filter(Boolean));
  };
  const baseVerbs = baseHas('ixian:[A-Za-z_][A-Za-z0-9_]*', ['src', 'Spixi'], false);
  const CS_GLOB = ':(glob)Spixi/**/*.cs';
  const uniq = (list) => [...new Set(list)];
  const keyHits = lineHits.filter((x) => x.kind === 'storage-key' && !x.pref);
  const baseKeys = keyHits.length ? baseHas(uniq(keyHits.map((x) => x.token)), ['src'], true) : new Set();
  const quoted = lineHits.filter((x) => x.kind === 'resource-path' || x.pref);
  const baseQuoted = quoted.length ? baseHas(uniq(quoted.map((x) => '"' + x.token + '"')), [CS_GLOB, ':(glob)Spixi/*.csproj'], true) : new Set();

  const typeCands = uniq(lineHits.flatMap((x) => x.typeNames || []));
  const baseTypes = typeCands.length
    ? new Set([...baseHas(typeCands.map((t) => String.raw`\b(class|struct|interface|record)\s+` + t + String.raw`\b`), [CS_GLOB], false)].map((m) => m.split(/\s+/).pop()))
    : new Set();
  /** API tokens (a call name) name no site on their own: `fetch` would name every fetch of the batch */
  const API_KINDS = new Set(['file-write', 'network-call', 'html-sink']);
  const seenLine = new Set();
  const verbSeen = new Map();
  for (const x of lineHits) {
    if (x.kind === 'verb') { if (baseVerbs.has(x.token) || verbSeen.has(x.token)) continue; verbSeen.set(x.token, x); push('verb', x.file, x.line, x.token, [x.token]); continue; }
    if (x.kind === 'storage-key' && !x.pref && baseKeys.has(x.token)) continue;
    if ((x.kind === 'resource-path' || x.pref) && baseQuoted.has('"' + x.token + '"')) continue;
    const key = x.kind + '\0' + (x.kind === 'storage-key' || x.kind === 'resource-path' ? '' : x.file + '\0' + x.line) + '\0' + x.token;
    if (seenLine.has(key)) continue;
    seenLine.add(key);
    const own = API_KINDS.has(x.kind) && !x.host ? [] : [x.token];
    const nm = x.kind === 'resource-path' ? [x.token, x.constName, x.constName2] : x.kind === 'storage-key' ? [x.token] : [...own, x.member, x.decl && x.decl.length >= 4 ? x.decl : ''];
    push(x.kind, x.file, x.line, x.token, nm, { typeNames: (x.typeNames || []).filter((t) => !baseTypes.has(t)), ref: x.kind !== 'storage-key' });
  }

  /* verbs from the contract (I3), when both ends have one */
  const cb = readContract(root, mb), ch = readContract(root, H);
  if (cb && ch && cb.verbs && ch.verbs) {
    for (const v of contractVerbs(cb, ch)) {
      const token = 'ixian:' + v.name;
      if (verbSeen.has(token)) continue;
      const k = ch.text.split('\n').findIndex((s) => s.includes('"' + v.name + '"') || s.includes('"' + token + '"'));
      verbSeen.set(token, true);
      push('verb', CONTRACT, k + 1, token, [token]);
      notes.push('contract: ' + token + ' — ' + v.why);
    }
  } else if (ch && ch.bad) notes.push('contract at head unreadable (' + ch.bad + '): verbs from the added lines only');
  else if (cb && cb.bad) notes.push('contract at base unreadable (' + cb.bad + '): verbs from the added lines only');
  else notes.push('contract not at both ends: verbs from the added lines only');

  /* rows: the added lines of the gate doc that sit under a heading the same diff adds (the batch's own section or
     subsection); an edit of an old row, or a line added to an old section, names nothing */
  const gate = files.find((f) => f.path === GATE_DOC && f.status !== 'D');
  let rows = [];
  if (gate && gate.added.length) {
    const doc = git(root, ['cat-file', 'blob', H + ':' + GATE_DOC]).split('\n');
    const addedAt = new Set(gate.added.map((a) => a.line));
    let fence = false;
    const headingOf = [];
    let cur = 0;
    doc.forEach((t, i) => { if (/^\s*(```|~~~)/.test(t)) fence = !fence; if (!fence && /^#{1,6}\s/.test(t)) cur = i + 1; headingOf[i + 1] = cur; });
    rows = gate.added.filter((a) => headingOf[a.line] > 0 && addedAt.has(headingOf[a.line])).map((a) => ({ line: a.line, text: a.text }));
  }
  for (const it of items) {
    const r = rows.find((row) => rowNames(row.text, it));
    it.row = r ? r.line : null;
  }
  const missing = items.filter((it) => it.row === null);
  return { base: B, head: H, mergeBase: mb, items, rows, missing, notes };
}

/* ───────────────────────── CLI ───────────────────────── */

export function format(r) {
  const out = [];
  for (const it of r.items) out.push(`${it.kind} ${it.file}:${it.line} ${it.token} → row: ${it.row === null ? 'MISSING' : 'found (' + GATE_DOC + ':' + it.row + ')'}`);
  for (const n of r.notes) out.push('note: ' + n);
  const per = KINDS.map((k) => [k, r.items.filter((i) => i.kind === k).length]).filter(([, n]) => n).map(([k, n]) => k + ' ' + n).join(' · ');
  out.push(`gate-diff ${r.mergeBase.slice(0, 8)}..${r.head.slice(0, 8)}: ${r.items.length} items${per ? ' (' + per + ')' : ''} · rows found ${r.items.length - r.missing.length} · MISSING ${r.missing.length}`);
  if (r.missing.length) out.push(r.missing.length + ' change(s) with no row in ' + GATE_DOC + ' that names them');
  out.push(r.missing.length ? 'GATE-DIFF FAIL' : 'GATE-DIFF OK');   /* the exact last line: the CI runner reads it */
  return out.join('\n');
}

function main(argv) {
  const a = { root: process.cwd(), base: '', head: '', json: false };
  for (let k = 0; k < argv.length; k++) {
    const s = argv[k];
    if (s === '--base' || s === '--head' || s === '--root') { if (k + 1 >= argv.length) return usage('missing value for ' + s); a[s.slice(2)] = argv[++k]; }
    else if (s === '--json') a.json = true;
    else return usage('unknown argument ' + s);
  }
  if (!a.base || !a.head) return usage('--base and --head are required');
  let r;
  try { r = gateDiff(a); } catch (e) {
    if (e instanceof GateDiffReadError) { console.error('gate-diff: ' + e.message + ' (exit 2, fail closed)'); return 2; }
    console.error('gate-diff: ' + (e && e.stack || e) + ' (exit 2, fail closed)');
    return 2;
  }
  console.log(a.json ? JSON.stringify(r, null, 2) : format(r));
  return r.missing.length ? 1 : 0;
}
function usage(msg) { console.error('gate-diff: ' + msg + '\nusage: node scripts/quality/gate-diff.mjs --base <sha> --head <sha> [--root <dir>] [--json]'); return 2; }

/** run as a program: compare REAL paths (a symlinked TMPDIR or checkout must not turn the CLI into a silent exit 0) */
const real = (p) => { try { return realpathSync(p); } catch { return resolve(p); } };
if (process.argv[1] && real(process.argv[1]) === real(fileURLToPath(import.meta.url))) process.exitCode = main(process.argv.slice(2));
