/* ==== qtools c-isolation — the isolation check (scripts/quality/isolation-check.mjs, I1) is clean on the tree, and each of
 * its rules fails for exactly its own reason on a deliberate break (#802, a permanent self-test).
 *
 * HOW. One mkdtemp tree holds a copy of exactly the files the check reads (`inputs(root)`); each break writes ONE file of
 * that copy with a minimal edit (an anchor that must occur once, or at the occurrence named), runs `check(copy)`, asserts
 * the finding set is EXACTLY its rule id (no other rule, no read error), and writes the file back before the next break.
 * The temp tree is removed at the end, also on a throw.
 *
 * LIMITS (#1735). This pin proves the rules fire on the shapes below and stay silent on the tree; it does not prove a rule
 * fires on every spelling of its defect class (the check's head lists what it cannot see). The C# is never compiled: a
 * break only has to parse. The clean row needs the census table in docs/security-handover-gate.md (the lead adds it);
 * without it the check fails closed (exit 2) and this module is red at its first row — by design, not a flake.
 *
 * BREAKS (rule ← edit):
 *   ISO-1  SingleChatPage loads "index.html" (the first of its two loadPage calls)
 *   ISO-2  SettingsPage loads "chat.html"
 *   ISO-3  ContributorsPage loads "dev.html" (a shell two pages load)
 *   ISO-4  AppDetailsPage points its WebView at a UrlWebViewSource (untrusted content in a trusted page)
 *   ISO-5  MiniAppPage.xaml ClassId "miniapp" → "miniap"
 *   ISO-6  HomePage.xaml rightContent ContentView → a second <WebView>
 *   ISO-7  HomePage tests "ixian:chatreply:" (a chat-only verb) instead of "ixian:chatinfo:"
 *   ISO-8  onNavigatingGlobal's cdping branch calls IxianHandler.addTransaction (a money verb in the shared base)
 *   ISO-9  MiniAppPage tests "ixian:getWalletData" instead of "ixian:getStorageData"
 *   ISO-10 WebViewRenderer adds `webView.Settings.SetAllowUniversalAccessFromFileURLs(true);` (no census row)
 *   ISO-11 WebViewRenderer drops `webView.Settings.DatabaseEnabled = false;` (its census row names no site)
 *   ISO-12 SettingsPage runs `webView.EvaluateJavaScriptAsync("1")` after its loadPage
 *   ISO-13 HomePage calls `Utils.executeUiCommandInPane(…)` (the rejected hosted-pane name)
 *   ISO-14 src/shells/chat.html gets an <iframe> before </body>
 *   ISO-15 the BUILT wallet_sent.html sends 'ixian:viewexplorer2' (the build drifted from its source)
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

export const BREAKS = [
  { rule: 'ISO-1', file: CHAT, from: 'loadPage(webView, "chat.html");', to: 'loadPage(webView, "index.html");', nth: 0 },
  { rule: 'ISO-2', file: SET, from: 'loadPage(webView, "settings.html");', to: 'loadPage(webView, "chat.html");' },
  { rule: 'ISO-3', file: CONTRIB, from: 'loadPage(webView, "contributors.html");', to: 'loadPage(webView, "dev.html");' },
  { rule: 'ISO-4', file: APPD, from: 'loadPage(webView, "app_details.html");', to: 'webView.Source = new UrlWebViewSource { Url = "file://" + app_id };', nth: 0 },
  { rule: 'ISO-5', file: MINI_X, from: '<WebView x:Name="webView" ClassId="miniapp"', to: '<WebView x:Name="webView" ClassId="miniap"' },
  { rule: 'ISO-6', file: HOME_X, from: '<ContentView x:Name="rightContent" Grid.Column="1"/>', to: '<WebView x:Name="rightContent" Grid.Column="1"/>' },
  { rule: 'ISO-7', file: HOME, from: 'current_url.StartsWith("ixian:chatinfo:"', to: 'current_url.StartsWith("ixian:chatreply:"' },
  { rule: 'ISO-8', file: BASE, from: 'Utils.sendUiCommand(this, "cdpong", token);', to: 'IxianHandler.addTransaction(null, true);' },
  { rule: 'ISO-9', file: MINI, from: 'current_url.StartsWith("ixian:getStorageData"', to: 'current_url.StartsWith("ixian:getWalletData"' },
  { rule: 'ISO-10', file: AND, from: 'webView.Settings.AllowFileAccessFromFileURLs = true;', to: 'webView.Settings.AllowFileAccessFromFileURLs = true; webView.Settings.SetAllowUniversalAccessFromFileURLs(true);' },
  { rule: 'ISO-11', file: AND, from: 'webView.Settings.DatabaseEnabled = false;', to: '' },
  { rule: 'ISO-12', file: SET, from: 'loadPage(webView, "settings.html");', to: 'loadPage(webView, "settings.html"); webView.EvaluateJavaScriptAsync("1");' },
  { rule: 'ISO-13', file: HOME, from: 'Utils.sendUiCommand(this, "selectTx", tx.getTxIdString());', to: 'Utils.executeUiCommandInPane(this, "selectTx", tx.getTxIdString());', nth: 0 },
  { rule: 'ISO-14', file: CHAT_SRC, from: '</body>', to: '<iframe src="x.html"></iframe></body>' },
  { rule: 'ISO-15', file: SENT_BUILT, from: "bridge.send('ixian:viewexplorer')", to: "bridge.send('ixian:viewexplorer2')" },
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
      const p = join(dir, b.file);
      const orig = readFileSync(p, 'utf8');
      const next = edit(orig, b.from, b.to, b.nth);
      if (next === null) { ok(false, 'QTOOLS c-isolation: break ' + b.rule + ' — the anchor `' + b.from + '` is not where the pin expects it in ' + b.file); continue; }
      writeFileSync(p, next);
      try {
        const res = await check(dir);
        ok(!res.error && !res.ok && ids(res) === b.rule, 'QTOOLS c-isolation: break ' + b.rule + ' (' + b.file.split('/').pop() + ') fails with exactly ' + b.rule
          + ' — got ' + (res.error ? 'CANNOT READ: ' + res.error : '[' + ids(res) + '] ' + (res.findings[0] ? res.findings[0].text.slice(0, 160) : '')));
      } finally { writeFileSync(p, orig); }
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
  ok(Date.now() - t0 < 60000, 'QTOOLS c-isolation: the module ran in ' + (Date.now() - t0) + ' ms');
}
