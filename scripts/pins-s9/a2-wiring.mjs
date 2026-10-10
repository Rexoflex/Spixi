/* ==== S9 · agent A2 — the V-15 AUDIT FIXES (#1245): the MAUI-bound CALL SITES ====
 * The pure rules (AuditRules.waitWhile / isHttpsUrl / packageTempName / copyCappedAsync / trySplitKeyValue / tryBase64 /
 * KeyedTimers, SLocalOnlyStore) are EXECUTED in scripts/csh (S9AuditTests.cs). The call sites are MAUI-bound and compile
 * nowhere in this container, so they are pinned on comment-stripped source (stripCode keeps string literals): each pin
 * names the seam and the failure it prevents.
 *   C-01  the UI tick + getChatPage / getChatPages never enumerate the live NavigationStack off the main thread
 *   C-02  one typing timer per peer (no Core List, no "remove the FIRST")
 *   C-03  the two resume waits are bounded; the F5-3 guards keep their order
 *   C-04  installFromUrl: https only, streamed with the cap, GUID temp name, awaited; the action POST is awaited
 *   A-8   onNavigating is fenced; protocolData / setStorageData / xa: validate before slicing / decoding
 *   A-13  a restore writes its preferences only after verifyWallet; the `waletpass` typo is gone
 *   A-14  the Mac registers the Apple WebView handler
 *   H-3   "Back up now" (ixian:backup after the nudge) stamps; the push-time stamp stays for "Not now"
 *   H-13  the backup stamp needs the user's "Yes" in a native alert, with C# strings in all 13 lang files
 *   H-14  ignored_requests + push_trace_salt live in SLocalOnlyStore; Android backups exclude its file
 * Deliberate breaks (#802) — each failed exactly the named pin, then restored (see the A2 report). */
import { readdirSync } from 'node:fs';

export default async function (h) {
  const { ok, root, stripCode, readFileSync, join } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const cs = (p) => stripCode(rd(p));
  const guard = async (name, fn) => { try { await fn(); } catch (e) { ok(false, name + ' — threw: ' + (e && e.message)); } };
  /* the body of the FIRST member whose header matches `head`, by brace depth (string / char literals skipped) */
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

  const HP = cs('Spixi/Pages/Home/HomePage.xaml.cs');
  const UT = cs('Spixi/Utils/Utils.cs');
  const SP = cs('Spixi/Network/StreamProcessor.cs');
  const APP = cs('Spixi/App.xaml.cs');
  const MAM = cs('Spixi/MiniApps/MiniAppManager.cs');
  const MAP = cs('Spixi/Pages/MiniApps/MiniAppPage.xaml.cs');
  const LP = cs('Spixi/Pages/Launch/LaunchPage.xaml.cs');
  const MP = cs('Spixi/MauiProgram.cs');
  const BP = cs('Spixi/Pages/Settings/BackupPage.xaml.cs');
  const IGN = cs('Spixi/Meta/SRequestIgnore.cs');
  const PPS = cs('Spixi/Platforms/iOS/SPushPrefsShare.cs');
  const LOS = cs('Spixi/Meta/SLocalOnlyStore.cs');

  /* ———— C-01 ———— */
  await guard('S9 A2 C-01 navigation stack', async () => {
    const tick = bodyOf(HP, 'public void OnUpdateUI()');
    const snap = bodyOf(UT, 'public static Microsoft.Maui.Controls.Page[] navigationStackSnapshot()');
    const refresh = bodyOf(UT, 'private static Microsoft.Maui.Controls.Page[] refreshNavigationSnapshot()');
    const gcp = bodyOf(UT, 'public static SingleChatPage? getChatPage(Friend friend)');
    const gcps = bodyOf(UT, 'public static List<SingleChatPage> getChatPages()');
    const r = {
      tickReadsOnMain: /if \(MainThread\.IsMainThread\)\s*\{\s*navCopy = Utils\.navigationStackSnapshot\(\);\s*\}\s*else\s*\{\s*Task<Page\[\]> navRead = MainThread\.InvokeOnMainThreadAsync\(\(\) => Utils\.navigationStackSnapshot\(\)\);\s*navCopy = navRead\.Wait\((\d+)\) \? navRead\.Result : Utils\.navigationStackSnapshot\(\);\s*\}\s*Page\? page = navCopy\.LastOrDefault\(\);/.test(tick),
      tickNoLiveStack: !/NavigationStack/.test(tick),
      snapMainFresh: /^\{\s*if \(MainThread\.IsMainThread\)\s*\{\s*return refreshNavigationSnapshot\(\);\s*\}/.test(snap) && /return navSnapshot;\s*\}$/.test(snap),
      snapQueuesOne: /Interlocked\.Exchange\(ref navRefreshQueued, 1\) == 0/.test(snap) && /MainThread\.BeginInvokeOnMainThread\(/.test(snap),
      refreshCopies: /np\.Pushed \+= /.test(refresh) && /np\.Popped \+= /.test(refresh) && /np\.PoppedToRoot \+= /.test(refresh)
        && /copy\[i\] = stack!\[i\];/.test(refresh) && /navSnapshot = copy;/.test(refresh),
      chatPagesUseCopy: /foreach \(var item in navigationStackSnapshot\(\)\)/.test(gcp) && /foreach \(var item in navigationStackSnapshot\(\)\)/.test(gcps)
        && !/NavigationStack/.test(gcp) && !/NavigationStack/.test(gcps),
    };
    ok(Object.values(r).every(Boolean),
      '★ S9 C-01 (#1245): the 2 s UI tick (a POOL thread) reads the navigation stack as a MAIN-THREAD copy (InvokeOnMainThreadAsync, bounded, falling back to the last copy) and never touches the live NavigationStack; Utils.getChatPage / getChatPages (network threads) walk the copy, which the main thread refreshes on every read, every root push / pop and queues once from an off-thread read — ' + JSON.stringify(r));
  });

  /* ———— C-02 ———— */
  await guard('S9 A2 C-02 typing timers', async () => {
    const t = bodyOf(SP, 'protected void handleFriendIsTyping(Friend friend, Address? typist = null)');
    const r = {
      perPeer: /typingTimers\.restart\(typingKey, 5000, \(\) =>\s*\{\s*friend\.isTyping = false;\s*UIHelpers\.refreshChatRowLive\(friend\);\s*\}\);/.test(t),
      keyIsText: /typingKey = friend\.walletAddress\.ToString\(\);/.test(t),
      noCoreList: !/_typingTimers/.test(SP),
      field: /private static readonly AuditRules\.KeyedTimers typingTimers =\s*new AuditRules\.KeyedTimers\(e => Logging\.warn\("typing timer: the callback failed \(" \+ e\.GetType\(\)\.Name \+ "\)"\)\);/.test(SP),
      showsTyping: /Utils\.getChatPage\(friend\)\?\.showTyping\(typist\);/.test(t),
    };
    ok(Object.values(r).every(Boolean),
      '★ S9 C-02 (#1245): a typing burst restarts ONE timer per peer (keyed by the address TEXT — Core Address has no value equality) in AuditRules.KeyedTimers; the shared Core List and its "remove the FIRST timer" callback are gone; a callback failure is logged with a fixed word, never thrown on the timer thread — ' + JSON.stringify(r));
  });

  /* ———— C-03 ———— */
  await guard('S9 A2 C-03 bounded resume', async () => {
    const ctor = bodyOf(APP, 'public App()');
    const enr = bodyOf(APP, 'private static void ensureNodeRunning(bool isRetry)');
    const pub = bodyOf(APP, 'public static void EnsureNodeRunning()');
    const sched = bodyOf(APP, 'private static void scheduleEnsureRetry()');
    const waitRe = /AuditRules\.waitWhile\(\(\) => IxianHandler\.status == NodeStatus\.stopping, AuditRules\.NodeStopWaitMs\)/;
    const iG = enr.indexOf('if (IxianHandler.wallets.Count == 0)'), iB = enr.indexOf('if (Node.startCounter == 0)');
    const iW = enr.search(waitRe), iS = enr.indexOf('Node.preStart();');
    const r = {
      noSleepLoop: !/while \(IxianHandler\.status == NodeStatus\.stopping\)/.test(APP),
      ctorBounded: /if \(!AuditRules\.waitWhile\(\(\) => IxianHandler\.status == NodeStatus\.stopping, AuditRules\.NodeStopWaitMs\)\)\s*\{\s*Logging\.warn\("App: the node is still stopping after the wait - not restarting now"\);\s*\}\s*else if \(IxianHandler\.status == NodeStatus\.stopped\)/.test(ctor),
      ensureBounded: /if \(!AuditRules\.waitWhile\(\(\) => IxianHandler\.status == NodeStatus\.stopping, AuditRules\.NodeStopWaitMs\)\)\s*\{\s*Logging\.warn\("EnsureNodeRunning: the node is still stopping after the wait - not restarting now"\);\s*if \(!isRetry\)\s*\{\s*scheduleEnsureRetry\(\);\s*\}\s*return;\s*\}/.test(enr),
      publicDelegates: /^\{\s*ensureNodeRunning\(false\);\s*\}$/.test(pub),
      oneRetry: /if \(Interlocked\.CompareExchange\(ref ensureRetryPending, 1, 0\) != 0\)\s*\{\s*return;\s*\}/.test(sched)
        && /await Task\.Delay\(1000\);\s*MainThread\.BeginInvokeOnMainThread\(\(\) =>\s*\{\s*Interlocked\.Exchange\(ref ensureRetryPending, 0\);\s*if \(!isInForeground\)\s*\{[^}]*return;\s*\}\s*ensureNodeRunning\(true\);/.test(sched)
        && (APP.match(/ensureNodeRunning\(true\)/g) || []).length === 1 && (APP.match(/scheduleEnsureRetry\(\);/g) || []).length === 1,
      f53order: iG > 0 && iB > iG && iW > iB && iS > iW,
      noThrow: !/throw new Exception\("Error starting Node"\)/.test(APP),
    };
    ok(Object.values(r).every(Boolean),
      '★ S9 C-03 (#1245): both resume paths (the App constructor\'s stopped-node branch and EnsureNodeRunning) wait for a STOPPING node with AuditRules.waitWhile (bounded at NodeStopWaitMs, on the UI thread) and skip the restart when it is still stopping; the F5-3 guards (no wallet → return, startCounter == 0 → return) still come FIRST; a give-up in EnsureNodeRunning schedules ONE retry 1 s later on the main thread (foreground only; the retry runs the whole method, guards first, and never schedules another); a failed restart logs and returns instead of throwing out of the App lifecycle — ' + JSON.stringify(r));
  });

  /* ———— C-04 ———— */
  await guard('S9 A2 C-04 mini-app download + POST', async () => {
    const inst = bodyOf(MAM, 'public async Task<string?> installFromUrlAsync(MiniApp fetchedAppInfo)');
    const ADP = stripCode(readFileSync(join(root, 'Spixi/Pages/MiniApps/AppDetailsPage.xaml.cs'), 'utf8'));   // ★ lead merge: the stub is dropped, the caller awaits
    const act = bodyOf(MAP, 'private async void handleAction(string action)');
    const iHttps = inst.indexOf('AuditRules.isHttpsUrl(fetchedAppInfo.contentUrl)'), iSend = inst.indexOf('installClient.SendAsync(');
    const logs = [...inst.matchAll(/Logging\.\w+\(([^;]*)\);/g)].map((m) => m[1].replace(/"[^"]*"/g, '').replace(/declared\.Value|e\.GetType\(\)\.Name|[+\s()]/g, ''));
    const r = {
      httpsFirst: iHttps >= 0 && iSend > iHttps && /if \(!AuditRules\.isHttpsUrl\(fetchedAppInfo\.contentUrl\) \|\| !IxiUtils\.IsValidUrl\(fetchedAppInfo\.contentUrl\)\)\s*\{[^}]*return null;\s*\}/.test(inst),
      guidName: /string source_app_file_path = Path\.Combine\(tmpPath, AuditRules\.packageTempName\(\)\);/.test(inst) && !/contentUrl\.Split/.test(MAM),
      streamed: /installClient\.SendAsync\(request, HttpCompletionOption\.ResponseHeadersRead, deadline\.Token\)/.test(inst)
        && /AuditRules\.copyCappedAsync\(src, dst, AuditRules\.MaxMiniAppPackageBytes, deadline\.Token\)/.test(inst)
        && /if \(written < 0\)\s*\{[^}]*deleteQuietly\(source_app_file_path\);\s*return null;\s*\}/.test(inst)
        && /declared\.Value > AuditRules\.MaxMiniAppPackageBytes/.test(inst),
      bounded: /new CancellationTokenSource\(TimeSpan\.FromSeconds\(AuditRules\.MiniAppDownloadDeadlineSeconds\)\)/.test(inst)
        && /installClient = new HttpClient\(\) \{ Timeout = TimeSpan\.FromSeconds\(AuditRules\.MiniAppHeadersTimeoutSeconds\) \}/.test(MAM),
      noBlockingFetch: !/GetByteArrayAsync\(fetchedAppInfo/.test(MAM) && !/\.Result\b/.test(inst),
      checksum: /if \(file_checksum != fetchedAppInfo\.checksum\)\s*\{[^}]*deleteQuietly\(source_app_file_path\);\s*return null;\s*\}/.test(inst),
      logsFixed: logs.length >= 5 && logs.every((x) => x === ''),
      callerAwaits: !/public string\? installFromUrl\(/.test(MAM) && /Task\.Run\(async \(\) =>/.test(ADP) && /await Node\.MiniAppManager\.installFromUrlAsync\(fetchedApp\)/.test(ADP),
      postAwaited: /response = await client\.PostAsync\(jsonResult\.responseUrl, httpContent\);/.test(act) && !/PostAsync\([^;]*\)\.Result/.test(MAP)
        && /new HttpClient\(\) \{ Timeout = TimeSpan\.FromSeconds\(AuditRules\.MiniAppPostTimeoutSeconds\) \}/.test(act),
    };
    ok(Object.values(r).every(Boolean),
      '★ S9 C-04 (#1245): installFromUrlAsync refuses a non-https content URL BEFORE any request, streams the package (ResponseHeadersRead) to C#\'s own GUID temp name with the 100 MB cap counted on the bytes read (a declared length over it refuses early), bounds headers and the whole download, deletes the partial / mismatched file, logs fixed words + numbers only; the sync installFromUrl is gone and AppDetailsPage.onInstall awaits installFromUrlAsync; the mini-app action POST is awaited with a timeout — ' + JSON.stringify(r));
  });

  /* ———— A-8 ———— */
  await guard('S9 A2 A-8 mini-app verbs', async () => {
    const nav = bodyOf(MAP, 'private void onNavigating(object sender, WebNavigatingEventArgs e)');
    const g = bodyOf(MAP, 'private bool handleBridgeUrl(string current_url)');
    const r = {
      fenced: /^\{\s*string current_url = HttpUtility\.UrlDecode\(e\.Url\);\s*e\.Cancel = true;\s*bool handled;\s*try\s*\{\s*handled = handleBridgeUrl\(current_url\);\s*\}\s*catch \(Exception ex\)\s*\{\s*handled = true;\s*Logging\.warn\("MiniAppPage: a bridge verb was dropped \(" \+ ex\.GetType\(\)\.Name \+ "\)"\);\s*\}\s*if \(handled\)\s*\{\s*return;\s*\}\s*else if \(current_url\.Trim\(\)\.StartsWith\("file:", StringComparison\.OrdinalIgnoreCase\)\)/.test(nav),
      verbsOnly: !/e\.Cancel/.test(g) && /else\s*\{\s*return false;\s*\}\s*return true;\s*\}$/.test(g),
      protoSplit: /if \(!AuditRules\.trySplitKeyValue\(current_url\.Substring\("ixian:protocolData"\.Length\), out string protocolId, out string data\)\)\s*\{[^}]*return true;\s*\}/.test(g),
      storeSplit: /if \(!AuditRules\.trySplitKeyValue\(current_url\.Substring\("ixian:setStorageData"\.Length\), out string key, out string value\)\)\s*\{[^}]*return true;\s*\}/.test(g),
      storeB64: /valueToStore = AuditRules\.tryBase64\(value\);\s*if \(valueToStore == null\)\s*\{[^}]*return true;\s*\}/.test(g),
      xaB64: /byte\[\]\? actionBytes = AuditRules\.tryBase64\(current_url\.Substring\("xa:"\.Length\)\);\s*if \(actionBytes == null\)\s*\{[^}]*return true;\s*\}\s*handleAction\(UTF8Encoding\.UTF8\.GetString\(actionBytes\)\);/.test(g),
      noRawSlice: !/IndexOf\('='\)/.test(g) && !/Convert\.FromBase64String/.test(g),
    };
    ok(Object.values(r).every(Boolean),
      '★ S9 A-8 / S-04 (#1245): MiniAppPage.onNavigating cancels first, then fences the bridge verbs (handleBridgeUrl: a throw drops the verb with a fixed-word line, the navigation stays cancelled; only a non-verb reaches the one file: re-allow); protocolData / setStorageData split at "=" only when there is one (AuditRules.trySplitKeyValue), setStorageData and xa: decode with AuditRules.tryBase64 and drop bad input — no raw IndexOf(\'=\') slice, no FromBase64String left in the verb handler — ' + JSON.stringify(r));
  });

  /* ———— A-13 ———— */
  await guard('S9 A2 A-13 restore order', async () => {
    const onR = bodyOf(LP, 'private bool onRestore(string pass)');
    const prefs = bodyOf(LP, 'private static void applyRestorePrefs(string pass)');
    const acc = bodyOf(LP, 'private RestoreOutcome restoreAccountFile(string source_path, string pass)');
    const wal = bodyOf(LP, 'private bool restoreWalletFile(string source_path, string pass)');
    /* ★ #46 r1 (MAJOR, tests): positional order alone passed with the call moved INTO the wrong-password branch.
       Now: the verify-failure block (`if (!ws.verifyWallet(…)) { … }`) and every catch block hold NO applyRestorePrefs;
       the call's own enclosing block (nested blocks blanked) holds no failure return; it sits after the failure block
       and before Node.loadWallet. */
    const blockAt = (b, open) => { let d = 0; for (let k = open; k < b.length; k++) { if (b[k] === '{') d++; else if (b[k] === '}' && --d === 0) return [open, k + 1]; } return [open, -1]; };
    const enclosing = (b, idx) => { let d = 0; for (let k = idx; k >= 0; k--) { if (b[k] === '}') d++; else if (b[k] === '{') { if (d === 0) return blockAt(b, k); d--; } } return [-1, -1]; };
    const flat = (t) => { let out = '', d = 0; for (let k = 0; k < t.length; k++) { const c = t[k]; if (c === '{') { d++; if (d === 1) out += c; continue; } if (c === '}') { if (d === 1) out += c; d--; continue; } if (d <= 1) out += c; } return out; };
    const FAIL_RET = /return (false|RestoreOutcome\.(FailedReported|Failed|NotAnAccountBackup));/;
    const after = (b) => {
      const iv = b.indexOf('if (!ws.verifyWallet(');
      if (iv < 0) return false;
      const [fo, fc] = blockAt(b, b.indexOf('{', iv));
      const failBlock = fc > 0 ? b.slice(fo, fc) : '';
      const a = b.indexOf('applyRestorePrefs(pass);'), l = b.indexOf('Node.loadWallet();', a);
      const [eo, ec] = a >= 0 ? enclosing(b, a) : [-1, -1];
      const own = eo >= 0 && ec > 0 ? flat(b.slice(eo, ec)) : 'return false;';
      const catches = [...b.matchAll(/catch\s*(\([^)]*\))?\s*\{/g)].map((m) => { const [o, c] = blockAt(b, m.index + m[0].length - 1); return c > 0 ? b.slice(o, c) : ''; });
      return fc > 0 && FAIL_RET.test(failBlock) && !/applyRestorePrefs/.test(failBlock)
        && catches.every((c) => !/applyRestorePrefs/.test(c))
        && a > fc && l > a && !FAIL_RET.test(own) && count(b, /applyRestorePrefs\(pass\);/g) === 1;
    };
    const r = {
      onRestoreWritesNothing: onR.length > 0 && !/Preferences\.Default\./.test(onR),
      prefsBody: /Preferences\.Default\.Remove\("lockenabled"\);/.test(prefs) && /Preferences\.Default\.Set\("backupReminderTimestamp", Clock\.getTimestamp\(\)\.ToString\(\)\);/.test(prefs)
        && /Preferences\.Default\.Remove\("walletCreatedHere"\);/.test(prefs) && /Preferences\.Default\.Set\("walletpass", pass\);\s*\}$/.test(prefs),
      accountAfterVerify: after(acc),
      walletAfterVerify: after(wal),
      noTypo: !/waletpass/.test(LP),
    };
    ok(Object.values(r).every(Boolean),
      '★ S9 A-13 (#1245): a restore writes NO preference before the wallet verified — onRestore writes none; both restore paths call applyRestorePrefs (lockenabled · backupReminderTimestamp · walletCreatedHere · walletpass) once, AFTER ws.verifyWallet and BEFORE Node.loadWallet (which reads walletpass); a wrong password leaves lockenabled / walletpass untouched; the `waletpass` typo is gone — ' + JSON.stringify(r));
  });

  /* ———— A-14 ———— */
  await guard('S9 A2 A-14 Mac handler', async () => {
    const r = {
      both: /#if IOS \|\| MACCATALYST\s*handlers\.AddHandler\(typeof\(WebView\), typeof\(Spixi\.Platforms\.iOS\.iOSWebViewHandler\)\);\s*#endif/.test(MP),
      notIosOnly: !/#if IOS\s*\n\s*handlers\.AddHandler\(typeof\(WebView\)/.test(MP),
    };
    ok(Object.values(r).every(Boolean),
      '★ S9 A-14 / D25 (#1245): MacCatalyst registers the SAME WebView handler as iOS (the resource allow-list + the http/https navigation block) — ' + JSON.stringify(r));
  });

  /* ———— H-3 ———— */
  await guard('S9 A2 H-3 backup stamp', async () => {
    const rem = bodyOf(HP, 'private void displayBackupReminder()');
    const verb = HP.slice(HP.indexOf('else if (current_url.Equals("ixian:backup", StringComparison.Ordinal))'), HP.indexOf('else if (current_url.Equals("ixian:encpass", StringComparison.Ordinal))'));
    const r = {
      pushStampKept: /Utils\.sendUiCommand\(this, "toggleAnimatedSlider", "backup-prompt"\);\s*Preferences\.Default\.Set\("backupReminderTimestamp", Clock\.getTimestamp\(\)\.ToString\(\)\);\s*System\.Threading\.Interlocked\.Exchange\(ref backupNudgeOpen, 1\);\s*\}$/.test(rem),
      clickStamps: /if \(System\.Threading\.Interlocked\.Exchange\(ref backupNudgeOpen, 0\) == 1\)\s*\{\s*Preferences\.Default\.Set\("backupReminderTimestamp", Clock\.getTimestamp\(\)\.ToString\(\)\);\s*\}\s*pushPageLoaded\(new BackupPage\(\)\);/.test(verb),
      field: /private static int backupNudgeOpen;/.test(HP),
    };
    ok(Object.values(r).every(Boolean),
      '★ S9 H-3 (#1245, Damir): "Back up now" (ixian:backup while the nudge is open) stamps the reminder at the click; "Not now" sends nothing, so the push-time stamp stays — ' + JSON.stringify(r));
  });

  /* ———— H-13 ———— */
  await guard('S9 A2 H-13 backup confirm', async () => {
    const ask = bodyOf(BP, 'private static async Task recordBackupIfSaved(bool? outcome)');
    const shareB = bodyOf(BP, 'private static async Task<bool?> shareBackup(string path, string title)');
    const win = cs('Spixi/Platforms/Windows/SFileOperations.cs'), andr = cs('Spixi/Platforms/Android/SFileOperations.cs');
    const winShare = bodyOf(win, 'public static async Task<Task<bool>> share(string filepath, string title)');
    const andShare = bodyOf(andr, 'public static async Task<bool> share(string filepath, string title)');
    const appleWait = bodyOf(BP, 'private static async Task waitForAppleShareSheet(CancellationToken ct)');
    const langDir = join(root, 'Spixi/Resources/Raw/lang');
    const langs = readdirSync(langDir).filter((f) => /^[a-z]{2}-[a-z]{2}\.txt$/.test(f));
    const KEYS = ['settings-backup-saved-title', 'settings-backup-saved-text', 'settings-backup-saved-yes', 'settings-backup-saved-no'];
    const langBad = langs.filter((f) => { const t = readFileSync(join(langDir, f), 'utf8'); return !KEYS.every((k) => new RegExp('^' + k + ' = \\S.*$', 'm').test(t)); });
    const r = {
      bothPaths: count(BP, /bool\? outcome = await shareBackup\([^;]*\);\s*await recordBackupIfSaved\(outcome\);/g) === 2,
      outcomes: /#if WINDOWS\s*return await \(await SFileOperations\.share\(path, title\)\);\s*#elif ANDROID\s*return await SFileOperations\.share\(path, title\);\s*#else\s*await SFileOperations\.share\(path, title\);\s*return null;\s*#endif/.test(shareB)
        && /^\{\s*if \(outcome == false\)\s*\{[^}]*return;\s*\}\s*#if WINDOWS\s*if \(outcome == true\)\s*\{\s*recordBackup\(\);\s*return;\s*\}\s*#endif/.test(ask),
      /* ★ S12 D re-base (#1267): share delegates to saveAs (the Save probe needs ok · cancel · fail); the outcome is still
         FileSaver's own — saveOutcome(IsSuccessful, …) executed in csh (S12SaveTests) — and only SaveOk is true */
      winResult: /^\{\s*string outcome = await saveAs\(filepath\);\s*return Task\.FromResult\(outcome == S11MediaRules\.SaveOk\);\s*\}$/.test(winShare)
        && /string outcome = S11MediaRules\.saveOutcome\(fileSaverResult\.IsSuccessful, fileSaverResult\.Exception is OperationCanceledException\);/.test(bodyOf(win, 'public static async Task<string> saveAs(string filepath)'))
        && !/Task\.FromResult\(true\)/.test(win),
      androidResult: /shareFile\(filepath, title\);\s*return true;/.test(andShare) && /saveFile\(filepath, title\);\s*return true;\s*\}\s*return false;\s*\}$/.test(andShare),
      onePending: /lock \(askGate\)\s*\{\s*askCts\?\.Cancel\(\);\s*askCts = mine;\s*\}/.test(ask) && /ct\.ThrowIfCancellationRequested\(\);\s*saved = await MainThread/.test(ask)
        && /await Task\.Delay\(300, ct\);/.test(appleWait) && /await Task\.Delay\(500, ct\);/.test(appleWait),
      pageScoped: /protected override void OnDisappearing\(\)\s*\{\s*cancelPendingAsk\(\);\s*base\.OnDisappearing\(\);\s*\}/.test(BP),
      stampOnYesOnly: count(BP, /recordBackup\(\);/g) === 2 && count(ask, /recordBackup\(\);/g) === 2 && /if \(saved\)\s*\{\s*recordBackup\(\);\s*\}/.test(ask) && /bool saved = false;/.test(ask),
      nativeOnMain: /saved = await MainThread\.InvokeOnMainThreadAsync\(async \(\) =>\s*\{\s*Page\? host = Application\.Current\?\.MainPage;[\s\S]*?return await host\.DisplayAlert\(title, text, yes, no\);/.test(ask),
      localized: KEYS.every((k) => new RegExp('SpixiLocalization\\._SL\\("' + k + '"\\) \\?\\? "').test(ask)),
      appleWaits: /#if IOS \|\| MACCATALYST\s*await waitForAppleShareSheet\(ct\);\s*#endif/.test(ask),
      langs: langs.length >= 13 && langBad.length === 0,
    };
    ok(Object.values(r).every(Boolean),
      '★ S9 H-13 (#1245, Damir): BOTH backup paths take the platform outcome where it has one (Windows FileSaver: saved = stamp, cancelled = nothing; Android action sheet: Cancel = nothing) and otherwise ask "Did you save the backup?" in a NATIVE alert on the main thread, stamping on "Yes" only; ONE pending question (a new backup or BackupPage leaving cancels the previous wait / question); on iOS / Mac it waits for the activity sheet to close first; the four C# strings exist in every lang file (' + langs.length + ', bad: ' + (langBad.join(',') || 'none') + ') with ?? fallbacks — ' + JSON.stringify(r));
  });

  /* ———— H-14 ———— */
  await guard('S9 A2 H-14 local-only store', async () => {
    const load = bodyOf(IGN, 'private static List<string> load()');
    const store = bodyOf(IGN, 'private static void store(List<string> list)');
    const clear = bodyOf(IGN, 'public static void clear()');
    const salt = bodyOf(PPS, 'private static string traceSalt()');
    const listOf = (xml, section) => { const m = xml.match(new RegExp('<' + section + '>([\\s\\S]*?)</' + section + '>')); return m ? [...m[1].matchAll(/<exclude domain="(\w+)" path="([^"]+)"\s*\/>/g)].map((x) => x[1] + ':' + x[2]) : []; };
    const legacy = listOf(rd('Spixi/Platforms/Android/Resources/xml/backup_rules.xml'), 'full-backup-content');
    const der = rd('Spixi/Platforms/Android/Resources/xml/data_extraction_rules.xml');
    const lists = [legacy, listOf(der, 'cloud-backup'), listOf(der, 'device-transfer')];
    const r = {
      ignoreReads: /string raw = SLocalOnlyStore\.getMigrating\(KEY\);/.test(load) && !/Preferences\.Default\.Get\(KEY/.test(IGN),
      ignoreWrites: /SLocalOnlyStore\.set\(KEY, string\.Join\(",", list\)\);/.test(store) && !/Preferences\.Default\.Set\(KEY/.test(IGN),
      ignoreClears: /SLocalOnlyStore\.remove\(KEY\);/.test(clear),
      salt: /string salt = SPIXI\.Meta\.SLocalOnlyStore\.getMigrating\(KEY_TRACE_SALT\);/.test(salt) && /SPIXI\.Meta\.SLocalOnlyStore\.set\(KEY_TRACE_SALT, salt\);/.test(salt) && !/Preferences/.test(salt),
      fileName: /public const string FILE_NAME = "localonly\.json";/.test(LOS) && /public static Func<string> folder = \(\) => Config\.spixiUserFolder;/.test(LOS),
      appleExcluded: /#if IOS \|\| MACCATALYST\s*try\s*\{\s*using NSUrl url = NSUrl\.FromFilename\(p\);\s*if \(!url\.SetResource\(NSUrl\.IsExcludedFromBackupKey, NSNumber\.FromBoolean\(true\), out NSError err\)/.test(LOS)
        && /File\.Move\(tmp, p, true\);\s*excludeFromBackup\(p\);/.test(LOS),
      androidExcluded: lists.every((l) => l.includes('file:Documents/Spixi/localonly.json') && l.includes('file:Documents/Spixi/localonly.json.tmp')),   /* ★ S14 (#1281) re-based: Personal = files/Documents */
    };
    ok(Object.values(r).every(Boolean),
      '★ S9 H-14 (#1245, #984): the declined-request addresses (ignored_requests) and the push trace salt live in SLocalOnlyStore — <spixiUserFolder>/localonly.json, moved out of the backed-up Preferences on first read — which every Android backup list (≤11 · 12+ cloud · 12+ transfer) excludes and which iOS / Mac mark IsExcludedFromBackup on every write — ' + JSON.stringify(r));
  });
}
