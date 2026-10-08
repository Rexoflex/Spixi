/* ==== S11 F (#1262) — the Apps tab pre-push: the C# CALL SITES (MAUI-bound, compiled nowhere here → pinned on
 * comment-stripped source, like pins-s10/b-wiring.mjs F6). The pure rules (S11AppsRules: appsPrePush · AppsPrePushDelayMs ·
 * reloadChatPages · the [P1] bodies; a second S10FixRules.PrePushGate) are EXECUTED in scripts/csh (S11AppsTests.cs). The shell
 * half (rows built while the Apps view is hidden, reused on the first visit) is f-apps.mjs.
 *   · ixian:bootDropped (every platform) and the END of onLoaded each call scheduleAppsPrePush — the M4 order rule of the
 *     wallet's: whichever comes second schedules, through the apps' OWN gate instance
 *   · AppsPrePushDelayMs later, on the main thread: same document generation, never fed, Apps not current → the burst runs
 *     on the POOL under appsPushLock, re-checked under the lock, flagged appsPrePushing, one loadApps(true)
 *   · TEMPORARY [P1] `apps prepush n= ms=` (P1Perf.enabled only); an exception → a warn with the exception TYPE only
 *   · tab3 entry: the fed latch is read INSIDE appsPushLock (no second full push behind a running pre-push)
 *   · loadApps: the pre-push of an UNCHANGED list reloads no chat page (S11AppsRules.reloadChatPages)
 *   · ★ S11 A2 (#1263, R1-n2): bootDropped schedules the apps pre-push AFTER the boot-hold release (and the wallet's);
 *     ★ R1-m2: loadApps reads the document generation BEFORE clearApps and latches through
 *     S11AppsRules.appsLatchAfterBurst(pageLoaded, genAtBurst, genNow) AFTER the addApp loop, before clearAppsDone
 * Deliberate breaks: see the S11 F / A2 reports. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join } = h;
  const rd = (p) => stripCode(readFileSync(join(root, p), 'utf8'));
  const guard = async (name, fn) => { try { await fn(); } catch (e) { ok(false, name + ' — threw: ' + (e && e.message)); } };
  const bodyOf = (sc, head, from = 0) => {
    const at = sc.indexOf(head, from);
    if (at < 0) return '';
    let i = sc.indexOf('{', at);
    if (i < 0) return '';
    const start = i;
    let depth = 0;
    for (; i < sc.length; i++) {
      const c = sc[i];
      if (c === '"' || c === "'") { for (i++; i < sc.length && sc[i] !== c; i++) { if (sc[i] === '\\') i++; } continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return sc.slice(start, i + 1); }
    }
    return '';
  };
  const count = (s, re) => (s.match(re) || []).length;
  const before = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b); return i >= 0 && j >= 0 && i < j; };
  const HOME = rd('Spixi/Pages/Home/HomePage.xaml.cs');

  await guard('S11 F apps pre-push wiring', async () => {
    const boot = HOME.slice(HOME.indexOf('if (current_url.Equals("ixian:bootDropped", StringComparison.Ordinal))'), HOME.indexOf('else if (current_url.Equals("ixian:onload", StringComparison.Ordinal))'));
    const ol = bodyOf(HOME, 'private void onLoaded()');
    const sp = bodyOf(HOME, 'private void scheduleAppsPrePush(bool fromOnLoad)');
    const run = sp.slice(sp.indexOf('Task.Run(() =>'));
    const locked = bodyOf(run, 'lock (appsPushLock)');
    const entry = bodyOf(HOME, 'private void enterAppsTab()');
    const tab = HOME.slice(HOME.indexOf('else if (currentTab == "tab3")'), HOME.indexOf('else if (current_url.Equals("ixian:downloads", StringComparison.Ordinal))'));
    const la = bodyOf(HOME, 'private void loadApps(bool forceRefresh)');
    const logs = sp.match(/Logging\.\w+\([^;]*;/g) || [];
    const r = {
      /* on every platform: OUTSIDE the #if ANDROID block; and at the END of onLoaded, after the generation bump */
      boot: /#if ANDROID\s*global::Spixi\.MainActivity\.releaseBootHold\("dropped"\);\s*#endif\s*scheduleWalletPrePush\(false\);\s*scheduleAppsPrePush\(false\);\s*\}$/.test(boot.trimEnd())   /* ★ S11 A2 re-base (#1263, R1-n2): after the release */
        && count(HOME, /scheduleAppsPrePush\((?:true|false)\);/g) === 2,
      onload: /scheduleAppsPrePush\(true\);\s*scheduleWalletPrePush\(true\);\s*\}$/.test(ol) && before(ol, 'Interlocked.Increment(ref txDocGen);', 'scheduleAppsPrePush(true);'),
      ownGate: /private readonly S10FixRules\.PrePushGate appsPrePushGate = new S10FixRules\.PrePushGate\(\);/.test(HOME)
        && /if \(!\(fromOnLoad \? appsPrePushGate\.onLoaded\(gen\) : appsPrePushGate\.onDropped\(gen\)\)\)\s*\{\s*return;\s*\}/.test(sp)
        && !/\bprePushGate\b/.test(sp),
      delayMain: /Task\.Delay\(S11AppsRules\.AppsPrePushDelayMs\)\.ContinueWith\(_ => MainThread\.BeginInvokeOnMainThread\(\(\) =>/.test(sp),
      gate: /if \(!running \|\| gen != System\.Threading\.Volatile\.Read\(ref txDocGen\) \|\| !S11AppsRules\.appsPrePush\(appsPushedToShell, currentTab\)\)\s*\{\s*return;\s*\}/.test(sp)
        && before(sp, 'S11AppsRules.appsPrePush(', 'Task.Run(() =>'),
      pool: /if \(gen != System\.Threading\.Volatile\.Read\(ref txDocGen\) \|\| appsPushedToShell\)\s*\{\s*return;\s*\}\s*appsPrePushing = true;\s*try\s*\{\s*loadApps\(true\);\s*\}\s*finally\s*\{\s*appsPrePushing = false;\s*\}/.test(locked)
        && count(sp, /loadApps\(/g) === 1 && count(HOME, /appsPrePushing = (?:true|false);/g) === 3,
      p1: /if \(P1Perf\.enabled\)\s*\{\s*P1Perf\.line\(S11AppsRules\.prePushLine\(installedAppCount\(\), P1Perf\.msSince\(t0\)\)\);\s*\}/.test(run)
        && before(run, 'loadApps(true);', 'S11AppsRules.prePushLine('),
      warn: logs.length === 2 && logs.every((l) => l === 'Logging.warn("apps prepush skipped (" + e.GetType().Name + ")");'),
      entry: /enterAppsTab\(\);\s*\}/.test(tab) && !/loadApps\(/.test(tab)
        && /long t0 = P1Perf\.now\(\);\s*lock \(appsPushLock\)\s*\{\s*loadApps\(!appsPushedToShell\);\s*\}\s*probeFirstAppsVisit\(t0\);/.test(entry),
      chatReload: /bool listChanged = UIHelpers\.shouldRefreshApps;\s*UIHelpers\.shouldRefreshApps = false;/.test(la)
        && /if \(S11AppsRules\.reloadChatPages\(listChanged, appsPrePushing\)\)\s*\{\s*foreach \(var p in Utils\.getChatPages\(\)\)\s*\{\s*p\.reloadScreen\(\);\s*\}\s*\}/.test(la)
        && count(la, /reloadScreen\(\)/g) === 1,
      /* ★ S11 A2 (#1263, R1-m2): the generation is read before clearApps and the latch rides appsLatchAfterBurst after the rows */
      latch: before(la, 'int appsGenAtPush = System.Threading.Volatile.Read(ref txDocGen);', 'Utils.sendUiCommand(this, "clearApps");')
        && /appsPushedToShell = S11AppsRules\.appsLatchAfterBurst\(pageLoaded, appsGenAtPush, System\.Threading\.Volatile\.Read\(ref txDocGen\)\);/.test(la)
        && before(la, '"addApp"', 'appsPushedToShell = S11AppsRules.appsLatchAfterBurst(') && before(la, 'S11AppsRules.appsLatchAfterBurst(', '"clearAppsDone"')
        && count(HOME, /appsPushedToShell = pageLoaded;/g) === 0,
      probe: /if \(!P1Perf\.enabled\)\s*\{\s*return;\s*\}/.test(bodyOf(HOME, 'private void probeFirstAppsVisit(long entryT0)'))
        && /P1Perf\.line\(S11AppsRules\.firstVisitLine\(appsPrePushRanGen == gen, installedAppCount\(\), ms, P1Perf\.msSince\(entryT0\)\)\);/.test(HOME),
    };
    ok(Object.values(r).every(Boolean),
      '★ S11 F (#1262) Apps pre-push wiring: bootDropped (every platform) + the end of onLoaded schedule ONE pre-push per document through the apps\' own PrePushGate; AppsPrePushDelayMs later on the main thread, if the document is the same, never fed, and Apps is not current → ONE loadApps(true) on the pool under appsPushLock (re-checked there, appsPrePushing set around it); [P1] `apps prepush n= ms=` only when P1Perf.enabled; an exception → a type-only warn; the tab3 entry reads the latch under appsPushLock; the pre-push of an unchanged list reloads no chat page — ' + JSON.stringify(r));
  });

  await guard('S11 F apps rules compiled', async () => {
    const proj = readFileSync(join(root, 'scripts/csh/csh.csproj'), 'utf8');
    const rules = stripCode(readFileSync(join(root, 'Spixi/Utils/S11AppsRules.cs'), 'utf8'));
    ok(/<Compile Include="\.\.\/\.\.\/Spixi\/Utils\/S11AppsRules\.cs" \/>/.test(proj)
      && /public const int AppsPrePushDelayMs = 2000;/.test(rules) && !/using Microsoft\.Maui/.test(rules),
      '★ S11 F (#1262): S11AppsRules is MAUI-free and compiled by the C# harness — executed by S11AppsTests (node scripts/run-csh.mjs)');
  });
}
