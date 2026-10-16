/* ==== Session Safety lane D — S-6 (CH3, P36, flag HistoryLock) + O-02 (P37, flag WinAppMarker).
 *
 * The pure rules (SafetyRules.needsLock, SafetyRules.isMiniAppMarker) are EXECUTED in the C# harness
 * (scripts/csh/SafetyRulesTests.cs). This module pins the MAUI / WebView2-bound call sites (comment-stripped C#,
 * brace-matched bodies, source ORDER):
 *   S-6 — SettingsPage `ixian:deleteh` / `ixian:deleted`: flag ON → deleteAllBehindLock (LockPage(true) + authSucceeded,
 *         pushModalLoaded — the deletea shape); flag OFF → the direct call, as before. In the helper: the double-tap latch
 *         returns before any LockPage; the success-only guard (`!e.Value` → return) comes before the act; the act is
 *         posted (two hops) and caught; pushModalLoaded is last; the delete-all bodies are reached from nowhere else;
 *         the new log lines are fixed words (+ a type name).
 *   O-02 — WindowsWebViewHandler: the flag first, then the marker from SafetyRules (no literal), then the four drops
 *         (DevTools off, host objects off, PermissionRequested → Deny, NewWindowRequested → Handled); scripts and web
 *         messages untouched; SpixiContentPage.webViewNavigating no longer turns DevTools back on for the marked WebView.
 * Deliberate breaks: each check was broken on purpose and failed for its own key (lane D report). */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8');
  const rd = (f) => stripCode(raw(f));
  const blockFrom = (t, at) => {
    if (at < 0) return { s: -1, e: -1, text: '' };
    const o = t.indexOf('{', at); if (o < 0) return { s: -1, e: -1, text: '' };
    let d = 0;
    for (let k = o; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return { s: o, e: k + 1, text: t.slice(o, k + 1) }; }
    return { s: -1, e: -1, text: '' };
  };
  const body = (t, sig) => blockFrom(t, t.indexOf(sig)).text;
  const before = (t, a, b) => { const i = t.indexOf(a), j = t.indexOf(b); return i >= 0 && j >= 0 && i < j; };
  const count = (t, re) => (t.match(re) || []).length;
  const RULES = rd('Spixi/Utils/SafetyRules.cs');

  /* ── S-6: the two verb branches ── */
  const SET = rd('Spixi/Pages/Settings/SettingsPage.xaml.cs');
  const brH = body(SET, 'else if (current_url.Equals("ixian:deleteh", StringComparison.Ordinal))');
  const brD = body(SET, 'else if (current_url.Equals("ixian:deleted", StringComparison.Ordinal))');
  const branch = (b, flagArg, direct) => new RegExp('^\\{\\s*if \\(SafetyRules\\.needsLock\\(SpixiFlags\\.HistoryLock\\)\\)\\s*\\{\\s*deleteAllBehindLock\\('
    + flagArg + '\\);\\s*\\}\\s*else\\s*\\{\\s*' + direct + '\\(\\);\\s*\\}\\s*\\}$').test(b);
  const s6branches = {
    found: brH.length > 0 && brD.length > 0,
    history: branch(brH, 'true', 'onDeleteHistory'),
    downloads: branch(brD, 'false', 'onDeleteDownloads'),
    rule: /public static bool needsLock\(bool flagOn\) => flagOn;/.test(RULES),
    flag: /public static bool HistoryLock \{ get; private set; \} = true;/.test(rd('Spixi/Utils/SpixiFlags.cs')),
  };
  ok(Object.values(s6branches).every(Boolean),
    '★ Safety S-6 (P36) branches: ixian:deleteh / ixian:deleted call deleteAllBehindLock(true / false) when SafetyRules.needsLock(SpixiFlags.HistoryLock), else the old direct onDeleteHistory() / onDeleteDownloads() (flag OFF = today) — ' + JSON.stringify(s6branches));

  /* ── S-6: the helper — latch, lock, success-only, posted act, present last ── */
  const hlp = body(SET, 'private void deleteAllBehindLock(bool history)');
  const lam = body(hlp, 'lockPage.authSucceeded += (s, e) =>');
  const afterLam = lam.length > 0 ? hlp.slice(hlp.indexOf(lam) + lam.length) : '';
  const s6latch = {
    found: hlp.length > 0,
    /* ★ #46 r1 (R2 MINOR-3) re-base: the latch is a TickCount64 stamp with a 2-minute bound, cleared on a present throw */
    first: /^\{\s*long upAt = history \? historyLockUp : downloadsLockUp;\s*if \(upAt != 0 && Environment\.TickCount64 - upAt < DeleteLockLatchMs\)\s*\{\s*Logging\.warn\("[^"+]*"\);\s*return;\s*\}/.test(hlp),
    setBeforeLock: before(hlp, 'if (history) { historyLockUp = Environment.TickCount64; } else { downloadsLockUp = Environment.TickCount64; }', 'new LockPage(true)'),
    resetInRaise: /^\{\s*if \(history\) \{ historyLockUp = 0; \} else \{ downloadsLockUp = 0; \}/.test(lam),
    fields: /private long historyLockUp = 0;/.test(SET) && /private long downloadsLockUp = 0;/.test(SET) && /private const long DeleteLockLatchMs = 120000;/.test(SET),
  };
  ok(Object.values(s6latch).every(Boolean),
    '★ Safety S-6 double tap: the helper\'s FIRST statement ignores a verb whose lock is up (fixed-word warn, return before any LockPage); the latch is set before the lock and dropped on either raise — ' + JSON.stringify(s6latch));

  const s6gate = {
    found: lam.length > 0,
    lockTrue: /var lockPage = new LockPage\(true\);\s*lockPage\.authSucceeded \+= \(s, e\) =>/.test(hlp),
    successOnly: /if \(e == null \|\| !e\.Value\)\s*\{\s*return;\s*\}/.test(lam)
      && before(lam, '!e.Value', 'onDeleteHistory();') && before(lam, '!e.Value', 'onDeleteDownloads();'),
    posted: /MainThread\.BeginInvokeOnMainThread\(\(\) =>\s*\{\s*MainThread\.BeginInvokeOnMainThread\(\(\) =>\s*\{\s*try\s*\{\s*if \(history\)\s*\{\s*onDeleteHistory\(\);\s*\}\s*else\s*\{\s*onDeleteDownloads\(\);\s*loadDownloads\(false\);\s*\}\s*\}\s*catch \(Exception ex\)\s*\{\s*Logging\.error\("[^"+]*\(" \+ ex\.GetType\(\)\.Name \+ "\)"\);\s*\}/.test(lam),
    presentLast: /^;\s*try\s*\{\s*pushModalLoaded\(lockPage\);\s*\}\s*catch \(Exception ex\)\s*\{\s*if \(history\) \{ historyLockUp = 0; \} else \{ downloadsLockUp = 0; \}\s*Logging\.error\("SettingsPage: the delete-all lock did not present \(" \+ ex\.GetType\(\)\.Name \+ "\)"\);\s*\}\s*\}$/.test(afterLam),
    noActOutside: !/onDelete(History|Downloads)\(\)/.test(hlp.replace(lam, '')),
    onlyCallers: count(SET, /onDeleteHistory\(\);/g) === 2 && count(SET, /onDeleteDownloads\(\);/g) === 2,
  };
  ok(Object.values(s6gate).every(Boolean),
    '★ Safety S-6 gate: new LockPage(true) + authSucceeded (the deletea shape); only EventArgs<bool>(true) acts (#1322 F1 rule — the !e.Value return comes before the act); the act is posted twice and caught (type only); pushModalLoaded(lockPage) is the last statement; the delete-all bodies have exactly two callers each (the OFF branch + the helper) — ' + JSON.stringify(s6gate));

  const deleteaRef = body(SET, 'else if (current_url.Equals("ixian:deletea", StringComparison.Ordinal)');
  ok(/var lockPage = new LockPage\(true\);\s*lockPage\.authSucceeded \+= onDeleteAccount;\s*pushModalLoaded\(lockPage\);/.test(deleteaRef)
    && /bool succeeded = e\.Value;\s*if \(!succeeded\)\s*\{\s*return;\s*\}/.test(body(SET, 'public void onDeleteAccount(object sender, EventArgs<bool> e)')),
    '★ Safety S-6 reference: ixian:deletea keeps its LockPage(true) gate and onDeleteAccount acts on true only (the shape S-6 copies)');

  /* ── O-02: the Windows handler ── */
  const WIN = rd('Spixi/Platforms/Windows/WindowsWebViewHandler.cs');
  const conn = body(WIN, 'protected override void ConnectHandler(WebView2 platformView)');
  const attach = body(conn, 'void AttachWebResourceRequested(CoreWebView2 core)');
  const drop = body(WIN, 'private void dropMiniAppPrivileges(CoreWebView2 core)');
  const perm = body(WIN, 'private void MiniApp_PermissionRequested(object? sender, CoreWebView2PermissionRequestedEventArgs args)');
  const neww = body(WIN, 'private void MiniApp_NewWindowRequested(object? sender, CoreWebView2NewWindowRequestedEventArgs args)');
  const markerAt = drop.indexOf('SafetyRules.isMiniAppMarker(element.ClassId)');
  const o2gate = {
    found: drop.length > 0 && attach.length > 0,
    called: /dropMiniAppPrivileges\(core\);/.test(attach),
    flagFirst: /^\{\s*if \(!SpixiFlags\.WinAppMarker\)\s*\{\s*return;\s*\}/.test(drop),
    marker: /var element = VirtualView as global::Microsoft\.Maui\.Controls\.WebView;\s*if \(element == null \|\| !SafetyRules\.isMiniAppMarker\(element\.ClassId\)\)\s*\{\s*return;\s*\}/.test(drop),
    noLiteral: !/"miniapp"/.test(WIN),
    literal: /public const string MiniAppMarker = "miniapp";/.test(RULES)
      && /isMiniAppMarker\(string\? classId\) => string\.Equals\(classId, MiniAppMarker, StringComparison\.Ordinal\);/.test(RULES),
    xaml: /<WebView x:Name="webView" ClassId="miniapp"/.test(raw('Spixi/Pages/MiniApps/MiniAppPage.xaml')),
  };
  ok(Object.values(o2gate).every(Boolean),
    '★ Safety O-02 (P37) gate: the handler calls dropMiniAppPrivileges when the CoreWebView2 exists; its FIRST statement is the WinAppMarker flag, then the marker off the VIRTUAL view through SafetyRules (the literal lives only in SafetyRules + MiniAppPage.xaml) — ' + JSON.stringify(o2gate));

  const tail = markerAt >= 0 ? drop.slice(markerAt) : '';
  const o2drops = {
    devtools: /core\.Settings\.AreDevToolsEnabled = false;/.test(tail),
    hostObjects: /core\.Settings\.AreHostObjectsAllowed = false;/.test(tail),
    permission: /core\.PermissionRequested -= MiniApp_PermissionRequested;\s*core\.PermissionRequested \+= MiniApp_PermissionRequested;/.test(tail)
      && /^\{\s*args\.State = CoreWebView2PermissionState\.Deny;\s*\}$/.test(perm),
    newWindow: /core\.NewWindowRequested -= MiniApp_NewWindowRequested;\s*core\.NewWindowRequested \+= MiniApp_NewWindowRequested;/.test(tail)
      && /^\{\s*args\.Handled = true;\s*\}$/.test(neww) && !/NewWindow\s*=/.test(neww),
    /* ★ #46 r1 (R2 MINOR-5): a mini-app download is cancelled (Android / iOS parity) */
    download: /core\.DownloadStarting -= MiniApp_DownloadStarting;\s*core\.DownloadStarting \+= MiniApp_DownloadStarting;/.test(tail)
      && /^\{\s*args\.Cancel = true;\s*\}$/.test(body(WIN, 'private void MiniApp_DownloadStarting(object? sender, CoreWebView2DownloadStartingEventArgs args)')),
    dropsOnly: !/= true;/.test(drop) && !/PermissionState\.Allow/.test(WIN),
    bridgeKept: !/IsWebMessageEnabled|IsScriptEnabled|AddHostObjectToScript/.test(WIN),
  };
  ok(Object.values(o2drops).every(Boolean),
    '★ Safety O-02 drops: after the marker check — DevTools off, host objects off, PermissionRequested → Deny, NewWindowRequested → Handled with no window; nothing is set true or Allow; scripts / web messages untouched (the mini-app bridge is Navigating + ExecuteScript) — ' + JSON.stringify(o2drops));

  /* ── O-02: SpixiContentPage must not turn DevTools back on for the marked WebView ── */
  const SCP = rd('Spixi/Utils/SpixiContentPage.cs');
  const nav = body(SCP, 'protected void webViewNavigating(object? sender, WebNavigatingEventArgs e)');
  const o2scp = {
    found: nav.length > 0,
    computed: /bool winMiniApp = SpixiFlags\.WinAppMarker\s*&& \(SafetyRules\.isMiniAppMarker\(\(sender as WebView\)\?\.ClassId\) \|\| SafetyRules\.isMiniAppMarker\(_webView\.ClassId\)\);\s*coreWebView2\.Settings\.AreDevToolsEnabled = !winMiniApp;/.test(nav),
    onlyAssign: count(SCP, /AreDevToolsEnabled\s*=/g) === 1 && !/AreDevToolsEnabled = true/.test(SCP),
    inWindows: before(nav, '#if WINDOWS', 'AreDevToolsEnabled'),
  };
  ok(Object.values(o2scp).every(Boolean),
    '★ Safety O-02 order: SpixiContentPage.webViewNavigating (every navigation) sets AreDevToolsEnabled = !winMiniApp — flag ON + the marker keeps the handler\'s OFF; flag OFF / every shell = true as before; no other assignment in the file — ' + JSON.stringify(o2scp));
}
