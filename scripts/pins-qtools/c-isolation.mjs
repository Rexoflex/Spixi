/* ==== qtools c-isolation — the isolation check (scripts/quality/isolation-check.mjs, I1) is clean on the tree, and each of
 * its rules fails for exactly its own reason on a deliberate break (#802, a permanent self-test).
 *
 * HOW. One mkdtemp tree holds a copy of exactly the files the check reads (`inputs(root)`); each break makes minimal edits
 * to one or two files of that copy (an anchor that must occur once, or at the occurrence named; an append; a new file),
 * runs `check(copy)`, asserts the finding set is EXACTLY its rule id (no other rule, no read error), and puts every file
 * back before the next break.
 * The temp tree is removed at the end, also on a throw.
 *
 * LIMITS (#1735). This pin proves the rules fire on the shapes below and stay silent on the tree; it does not prove a rule
 * fires on every spelling of its defect class (the check's head lists what it cannot see). The C# is never compiled: a
 * break only has to parse. The clean row needs every setting of the tree in the census table of
 * docs/security-handover-gate.md; a missing table fails closed (exit 2) and a missing row is ISO-10 — red at the first
 * row, by design, not a flake.
 *
 * BREAKS: the BREAKS table below — one row per detector: each ISO rule at least once, the wrapper of loadPage (ISO-1 and
 * ISO-2 through a base `loadShell`), a computed loadPage argument and a Raw/html file that is not a SHELLS output (ISO-3),
 * XAML `Source=`, a LoadRequest call and a Source on a variable declared as WebView (ISO-4), a HybridWebView, `new
 * WebView()` and a WebView subclass (ISO-6), File.WriteAllText with the URL in the base and `new Transaction` in the
 * chat page (ISO-8), a new base verb and a mini-app verb that reaches path (ISO-9), a platform-specific EnableZoomControls
 * call and a XAML property element (ISO-10), CallDevToolsProtocolMethodAsync (ISO-12), createElement('iframe') in a bundle
 * file (ISO-14); and two fail-closed rows: a listed unparsable file that gains a mark name, a NEW unparsable file that
 * names one (both a read error, exit 2). Every finding of a rule break must carry its real line (> 0).
 * Plus a fail-closed row: the census heading removed → a read error (exit 2), never a pass; and a row that every break was
 * written back (the copy is clean again at the end). */
import { mkdtempSync, mkdirSync, copyFileSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { check, inputs, CENSUS_HEADING, GATE_DOC } from '../quality/isolation-check.mjs';

const CHAT = 'Spixi/Pages/Chat/SingleChatPage.xaml.cs', SET = 'Spixi/Pages/Settings/SettingsPage.xaml.cs',
  CONTRIB = 'Spixi/Pages/Contributors/ContributorsPage.xaml.cs', APPD = 'Spixi/Pages/MiniApps/AppDetailsPage.xaml.cs',
  MINI_X = 'Spixi/Pages/MiniApps/MiniAppPage.xaml', MINI = 'Spixi/Pages/MiniApps/MiniAppPage.xaml.cs',
  HOME_X = 'Spixi/Pages/Home/HomePage.xaml', HOME = 'Spixi/Pages/Home/HomePage.xaml.cs', BASE = 'Spixi/Utils/SpixiContentPage.cs',
  AND = 'Spixi/Platforms/Android/WebViewRenderer.cs', CHAT_SRC = 'src/shells/chat.html', SENT_BUILT = 'Spixi/Resources/Raw/html/wallet_sent.html';

const SET_X = 'Spixi/Pages/Settings/SettingsPage.xaml', EMPTY = 'Spixi/Pages/Home/EmptyDetail.xaml.cs', TXCB = 'Spixi/Meta/SpixiTransactionInclusionCallbacks.cs',
  GLASS = 'src/components/glass-card.js', SET_WV = '<WebView x:Name="webView" Navigating="onNavigating" Navigated="onNavigated" VerticalOptions="Fill" HorizontalOptions="Fill"/>';
const SET_LOAD = 'loadPage(webView, "settings.html");';
/* a break: { rule, why, edits: [{ file, from, to, nth } | { file, append } | { file, create }] }; rule '(read error)' = the
 * check must fail closed (exit 2) with `error` naming `names` */
export const BREAKS = [
  { rule: 'ISO-1', why: 'the chat page loads index.html', edits: [{ file: CHAT, from: 'loadPage(webView, "chat.html");', to: 'loadPage(webView, "index.html");', nth: 0 }] },
  { rule: 'ISO-1', why: 'the chat page loads index.html through a base wrapper', edits: [
    { file: BASE, from: 'public void loadPage(WebView web_view, string html_file_name)', to: 'public void loadShell(WebView w, string f) { loadPage(w, f); }\n        public void loadPage(WebView web_view, string html_file_name)' },
    { file: CHAT, from: 'loadPage(webView, "chat.html");', to: 'loadShell(webView, "index.html");', nth: 0 }] },
  { rule: 'ISO-2', why: 'SettingsPage loads chat.html', edits: [{ file: SET, from: SET_LOAD, to: 'loadPage(webView, "chat.html");' }] },
  { rule: 'ISO-2', why: 'SettingsPage loads chat.html through a base wrapper', edits: [
    { file: BASE, from: 'public void loadPage(WebView web_view, string html_file_name)', to: 'public void loadShell(WebView w, string f) { loadPage(w, f); }\n        public void loadPage(WebView web_view, string html_file_name)' },
    { file: SET, from: SET_LOAD, to: 'loadShell(webView, "chat.html");' }] },
  { rule: 'ISO-3', why: 'ContributorsPage loads dev.html (a shell two pages load)', edits: [{ file: CONTRIB, from: 'loadPage(webView, "contributors.html");', to: 'loadPage(webView, "dev.html");' }] },
  { rule: 'ISO-3', why: 'ContributorsPage loads a computed name', edits: [{ file: CONTRIB, from: 'loadPage(webView, "contributors.html");', to: 'string n = "contributors.html"; loadPage(webView, n);' }] },
  { rule: 'ISO-3', why: 'ContributorsPage loads a Raw/html file that is not a SHELLS output', edits: [
    { file: 'Spixi/Resources/Raw/html/zz_extra.html', create: '<!DOCTYPE html><html><body><p>x</p></body></html>\n' },
    { file: CONTRIB, from: 'loadPage(webView, "contributors.html");', to: 'loadPage(webView, "zz_extra.html");' }] },
  { rule: 'ISO-4', why: 'AppDetailsPage is given a UrlWebViewSource', edits: [{ file: APPD, from: 'loadPage(webView, "app_details.html");', to: 'webView.Source = new UrlWebViewSource { Url = "file://" + app_id };', nth: 0 }] },
  { rule: 'ISO-4', why: 'SettingsPage.xaml sets Source="https://example.com/"', edits: [{ file: SET_X, from: SET_WV, to: SET_WV.replace('<WebView x:Name="webView"', '<WebView x:Name="webView" Source="https://example.com/"') }] },
  { rule: 'ISO-4', why: 'SettingsPage calls webView.LoadRequest', edits: [{ file: SET, from: SET_LOAD, to: SET_LOAD + ' webView.LoadRequest(null);' }] },
  { rule: 'ISO-4', why: 'a Source set on a receiver declared as WebView', edits: [{ file: SET, from: SET_LOAD, to: SET_LOAD + ' WebView pane = webView; pane.Source = "https://example.com/";' }] },
  { rule: 'ISO-5', why: 'MiniAppPage.xaml ClassId "miniapp" → "miniap"', edits: [{ file: MINI_X, from: '<WebView x:Name="webView" ClassId="miniapp"', to: '<WebView x:Name="webView" ClassId="miniap"' }] },
  { rule: 'ISO-6', why: 'a second <WebView> in HomePage.xaml', edits: [{ file: HOME_X, from: '<ContentView x:Name="rightContent" Grid.Column="1"/>', to: '<WebView x:Name="rightContent" Grid.Column="1"/>' }] },
  { rule: 'ISO-6', why: 'a <HybridWebView> in HomePage.xaml', edits: [{ file: HOME_X, from: '<ContentView x:Name="rightContent" Grid.Column="1"/>', to: '<HybridWebView x:Name="rightContent" Grid.Column="1"/>' }] },
  { rule: 'ISO-6', why: '`new WebView()` in SettingsPage', edits: [{ file: SET, from: SET_LOAD, to: SET_LOAD + ' var extra = new WebView();' }] },
  { rule: 'ISO-6', why: 'a WebView subclass built in code', edits: [
    { file: EMPTY, append: '\nnamespace SPIXI { public class PaneWebView : Microsoft.Maui.Controls.WebView { } }\n' },
    { file: SET, from: SET_LOAD, to: SET_LOAD + ' var extra = new PaneWebView();' }] },
  { rule: 'ISO-7', why: 'HomePage tests the chat-only verb chatreply', edits: [{ file: HOME, from: 'current_url.StartsWith("ixian:chatinfo:"', to: 'current_url.StartsWith("ixian:chatreply:"' }] },
  { rule: 'ISO-8', why: 'addTransaction in the base cdping branch', edits: [{ file: BASE, from: 'Utils.sendUiCommand(this, "cdpong", token);', to: 'IxianHandler.addTransaction(null, true);' }] },
  { rule: 'ISO-8', why: 'File.WriteAllText with the URL in the base cdping branch (path)', edits: [{ file: BASE, from: 'Utils.sendUiCommand(this, "cdpong", token);', to: 'System.IO.File.WriteAllText(url, token);' }] },
  { rule: 'ISO-8', why: '`new Transaction(…)` in the chat typing branch', edits: [{ file: CHAT, from: 'else if (current_url.StartsWith("ixian:typing"))\n            {', to: 'else if (current_url.StartsWith("ixian:typing"))\n            {\n                var t = new Transaction(0, null, null);' }] },
  { rule: 'ISO-9', why: 'MiniAppPage tests getWalletData', edits: [{ file: MINI, from: 'current_url.StartsWith("ixian:getStorageData"', to: 'current_url.StartsWith("ixian:getWalletData"' }] },
  { rule: 'ISO-9', why: 'the mini-app verb back reaches path', edits: [{ file: MINI, from: 'else if (current_url.Equals("ixian:back", StringComparison.Ordinal))\n            {', to: 'else if (current_url.Equals("ixian:back", StringComparison.Ordinal))\n            {\n                File.Delete(current_url);' }] },
  { rule: 'ISO-9', why: 'the shared base answers a new verb (hapticx)', edits: [{ file: BASE, from: 'else if (url.StartsWith("ixian:haptic:", StringComparison.Ordinal))', to: 'else if (url.StartsWith("ixian:hapticx:", StringComparison.Ordinal))' }] },
  { rule: 'ISO-10', why: 'SetAllowUniversalAccessFromFileURLs(true) added', edits: [{ file: AND, from: 'webView.Settings.AllowFileAccessFromFileURLs = true;', to: 'webView.Settings.AllowFileAccessFromFileURLs = true; webView.Settings.SetAllowUniversalAccessFromFileURLs(true);' }] },
  { rule: 'ISO-10', why: 'a platform-specific EnableZoomControls(true) call', edits: [{ file: SET, from: SET_LOAD, to: SET_LOAD + ' webView.On<Microsoft.Maui.Controls.PlatformConfiguration.Android>().EnableZoomControls(true);' }] },
  { rule: 'ISO-10', why: 'a XAML property element <WebView.MixedContentMode>', edits: [{ file: SET_X, from: SET_WV, to: SET_WV.replace('/>', '><WebView.MixedContentMode>AlwaysAllow</WebView.MixedContentMode></WebView>') }] },
  { rule: 'ISO-11', why: 'DatabaseEnabled = false removed', edits: [{ file: AND, from: 'webView.Settings.DatabaseEnabled = false;', to: '' }] },
  { rule: 'ISO-12', why: 'EvaluateJavaScriptAsync in SettingsPage', edits: [{ file: SET, from: SET_LOAD, to: SET_LOAD + ' webView.EvaluateJavaScriptAsync("1");' }] },
  { rule: 'ISO-12', why: 'CallDevToolsProtocolMethodAsync outside its home', edits: [{ file: SET, from: SET_LOAD, to: SET_LOAD + ' core.CallDevToolsProtocolMethodAsync("Runtime.evaluate", "{}");' }] },
  { rule: 'ISO-13', why: 'Utils.executeUiCommandInPane', edits: [{ file: HOME, from: 'Utils.sendUiCommand(this, "selectTx", tx.getTxIdString());', to: 'Utils.executeUiCommandInPane(this, "selectTx", tx.getTxIdString());', nth: 0 }] },
  { rule: 'ISO-14', why: 'an <iframe> in src chat.html', edits: [{ file: CHAT_SRC, from: '</body>', to: '<iframe src="x.html"></iframe></body>' }] },
  { rule: 'ISO-14', why: "createElement('iframe') in a bundle file", edits: [{ file: GLASS, append: "\nexport function zzFrame() { return document.createElement('iframe'); }\n" }] },
  { rule: 'ISO-15', why: 'the BUILT wallet_sent.html sends viewexplorer2', edits: [{ file: SENT_BUILT, from: "bridge.send('ixian:viewexplorer')", to: "bridge.send('ixian:viewexplorer2')" }] },
  { rule: '(read error)', why: 'a listed unparsable file gains a rule name', names: 'addTransaction', edits: [{ file: TXCB, append: '\n// IxianHandler.addTransaction\n' }] },
  { rule: '(read error)', why: 'a NEW unparsable file names a rule name', names: 'addTransaction', edits: [{ file: EMPTY, append: '\nnamespace SPIXI { class Zz { void M(Zz o) { o?.p = 0; IxianHandler.addTransaction(null); } int p; } }\n' }] },
];

/** replace the nth occurrence (default: the anchor must occur exactly once) */
export function edit(text, from, to, nth) {
  const at = [];
  for (let i = text.indexOf(from); i >= 0; i = text.indexOf(from, i + 1)) at.push(i);
  if (nth === undefined ? at.length !== 1 : at.length <= nth) return null;
  const i = at[nth === undefined ? 0 : nth];
  return text.slice(0, i) + to + text.slice(i + from.length);
}

export function copyTree(root, prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  for (const rel of inputs(root)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    copyFileSync(join(root, rel), join(dir, rel));
  }
  return dir;
}

const ids = (res) => [...new Set(res.findings.map((f) => f.rule))].sort().join(',');

export default async function (h) {
  const { ok, root } = h;
  const t0 = Date.now();
  const clean = await check(root);
  ok(!clean.error && clean.ok, 'QTOOLS c-isolation: the isolation check is clean on the tree — '
    + (clean.error ? 'CANNOT READ: ' + clean.error : clean.findings.length + ' finding(s)' + (clean.findings[0] ? ': ' + clean.findings[0].rule + ' ' + clean.findings[0].text : '')));
  ok(clean.seen && clean.seen.pages >= 19 && clean.seen.verbs >= 150 && clean.seen.censusRows >= 1 && clean.seen.xamlWebViews >= 19,
    'QTOOLS c-isolation: the check read the tree (pages, verbs, census rows, XAML WebViews) — ' + JSON.stringify(clean.seen));
  let dir = null;
  try {
    dir = copyTree(root, 'qtools-iso-');
    const control = await check(dir);
    ok(!control.error && control.ok, 'QTOOLS c-isolation: the copied inputs are clean too (the copy holds every file the check reads) — ' + (control.error || ids(control) || 'clean'));
    for (const b of BREAKS) {
      const saved = [];
      let bad = '';
      for (const e of b.edits) {
        const p = join(dir, e.file);
        if (e.create !== undefined) { saved.push({ p, orig: null }); writeFileSync(p, e.create); continue; }
        const orig = readFileSync(p, 'utf8');
        const next = e.append !== undefined ? orig + e.append : edit(orig, e.from, e.to, e.nth);
        if (next === null) { bad = e.file; break; }
        saved.push({ p, orig });
        writeFileSync(p, next);
      }
      try {
        if (bad) { ok(false, 'QTOOLS c-isolation: break ' + b.rule + ' (' + b.why + ') — an anchor is not where the pin expects it in ' + bad); continue; }
        const res = await check(dir);
        const got = res.error ? 'CANNOT READ: ' + res.error : '[' + ids(res) + '] ' + (res.findings[0] ? res.findings[0].file.split('/').pop() + ':' + res.findings[0].line + ' ' + res.findings[0].text.slice(0, 140) : '');
        if (b.rule === '(read error)') ok(!!res.error && !res.ok && res.error.includes(b.names), 'QTOOLS c-isolation: break "' + b.why + '" fails closed (exit 2) naming ' + b.names + ' — got ' + got);
        else ok(!res.error && !res.ok && ids(res) === b.rule && res.findings.every((f) => f.line > 0), 'QTOOLS c-isolation: break ' + b.rule + ' (' + b.why + ') fails with exactly ' + b.rule + ', each finding with its line — got ' + got);
      } finally { for (const x of saved.reverse()) { if (x.orig === null) rmSync(x.p, { force: true }); else writeFileSync(x.p, x.orig); } }
    }
    /* fail closed: no census heading → a read error, never a pass */
    const gp = join(dir, GATE_DOC);
    const gate = readFileSync(gp, 'utf8');
    writeFileSync(gp, gate.split(CENSUS_HEADING).join('WebView settings list'));
    const noCensus = await check(dir);
    ok(!!noCensus.error && !noCensus.ok, 'QTOOLS c-isolation: without the census heading the check cannot read (exit 2), it does not pass — ' + (noCensus.error || 'no error'));
    writeFileSync(gp, gate);
    const restored = await check(dir);
    ok(!restored.error && restored.ok, 'QTOOLS c-isolation: every break was written back (the copy is clean again)');
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
  ok(Date.now() - t0 < 180000,   /* 180 s: 26–35 s measured alone on 2 cores, 61 s with three parallel runs; the CI smoke runs alone */ 'QTOOLS c-isolation: the module ran in ' + (Date.now() - t0) + ' ms');
}
