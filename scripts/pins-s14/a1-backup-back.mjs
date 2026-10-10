/* ==== S14 unit A1 — #1281 Android backup rules on the RUNTIME path · #1280 one Android back path.
 *
 * #1281 (behavioural): the backup rules are applied the way Android applies them — domain root + path, a rule matches the
 * file itself or anything under it — to ABSOLUTE runtime paths built from the runtime fact (on .NET 10 Android
 * SpecialFolder.Personal = getFilesDir()/Documents; log: /data/user/0/com.ixilabs.spixi.dev/files/Documents/Spixi/MsgQueue/…)
 * + the folder / file names READ from the C# that creates them (Config.cs, Ixian-Core LocalStorage / PendingMessageProcessor /
 * Logging / PeerStorage, TransferManager, SingleChatPage, PhotoRules, SLocalOnlyStore, HomePage / DevPage log copies, LaunchPage).
 * Every sensitive path must be excluded in all three lists (≤11 · 12+ cloud · 12+ transfer); the wallet, Acc, the avatars,
 * peers and the preferences must NOT be. The log names come from a replay of Logging.cs's rotation, not from a list.
 * ⚠ LESSON: the #912 pin pinned the rule TEXT ("Spixi/Chats"), never the runtime path, so the rules excluded nothing for
 * months and the pin stayed green. The `matcherReal` key proves the matcher rejects exactly that S13 rule.
 *
 * #1280 (structural, MAUI-bound C# — nothing to execute): MainActivity adds ONE always-enabled AndroidX callback AFTER
 * base.OnCreate (after MAUI's own), which runs MAUI's AndroidLifecycle.OnBackPressed pipeline through the PUBLIC
 * ILifecycleEventService.InvokeEvents, backgrounds when nothing handled it (never Finish), guards re-entry, and the legacy
 * Activity.OnBackPressed goes to the dispatcher only (no double invoke). The csproj TargetSdkVersion comment says it is ignored.
 * #46 fix r1 (F2): the AddCallback sits in no #if region but ANDROID (an #else branch counts) · nothing disables / removes the
 * callback (no backCallback field, no .Remove(), the ONE Enabled pair is the bracket below) · a refused MoveTaskToBack → one
 * dispatch with the callback aside = the framework default (never a no-op on the Launch root), route=default.
 * Deliberate breaks (F2), each failed its key: AddCallback under #if DEBUG / in the #else of #if ANDROID (notInIf; under #if
 * ANDROID stays green) · `cb.Enabled = false` / `.Remove()` in OnCreate (neverOff) · the bracket's Enabled = false dropped
 * (neverOff + refusedDefault) · route word "Default" (logGrammar). */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, existsSync, join } = h;
  const rd = (f) => readFileSync(join(root, f), 'utf8');

  /* ———— #1281 backup ———— */
  const PKG_DATA = '/data/user/0/com.ixilabs.spixi.dev';
  const FILES = PKG_DATA + '/files';
  const PERSONAL = FILES + '/Documents';                       // the runtime fact (.NET 10 Android), not a source string
  const LOG_SEEN = PKG_DATA + '/files/Documents/Spixi/MsgQueue/';   // the path the device log printed
  const DOMAIN_ROOT = { file: FILES, root: PKG_DATA, sharedpref: PKG_DATA + '/shared_prefs', database: PKG_DATA + '/databases' };

  const listOf = (xml, section) => {
    const m = xml.replace(/<!--[\s\S]*?-->/g, '').match(new RegExp('<' + section + '>([\\s\\S]*?)</' + section + '>'));
    return m ? [...m[1].matchAll(/<exclude domain="(\w+)" path="([^"]+)"\s*\/>/g)].map((x) => ({ domain: x[1], path: x[2] })) : [];
  };
  const der = rd('Spixi/Platforms/Android/Resources/xml/data_extraction_rules.xml');
  const lists = {
    legacy: listOf(rd('Spixi/Platforms/Android/Resources/xml/backup_rules.xml'), 'full-backup-content'),
    cloud: listOf(der, 'cloud-backup'),
    transfer: listOf(der, 'device-transfer'),
  };
  // Android's rule: <domain root>/<path> is excluded together with everything under it.
  const excluded = (rules, abs) => rules.some((r) => {
    const base = DOMAIN_ROOT[r.domain];
    if (!base) return false;
    const p = base + '/' + r.path.replace(/^\/+|\/+$/g, '');
    return abs === p || abs.startsWith(p + '/');
  });

  // The names, read from the code that creates them.
  const cfg = stripCode(rd('Spixi/Meta/Config.cs'));
  const spixiName = (cfg.match(/public static string spixiUserFolder = Path\.Combine\(System\.Environment\.GetFolderPath\(System\.Environment\.SpecialFolder\.Personal\), "([^"]+)"\);/) || [])[1];
  const USER = PERSONAL + '/' + spixiName;
  const cfgFolders = [...cfg.matchAll(/(?:headers|activity)FolderPath = Path\.Combine\(spixiUserFolder, "([\w-]+)"\);/g)].map((m) => m[1]);
  const walletFile = (cfg.match(/public static string walletFile = "([^"]+)";/) || [])[1];
  const maxLogCount = +((cfg.match(/public static int maxLogCount = (\d+);/) || [])[1]);

  const core = join(root, '..', 'Ixian-Core');
  const coreThere = existsSync(join(core, 'Streaming/Storage/LocalStorage.cs'));
  const rdCore = (f) => stripCode(readFileSync(join(core, f), 'utf8'));
  const ls = coreThere ? rdCore('Streaming/Storage/LocalStorage.cs') : '';
  const lsFolders = [...new Set([...ls.matchAll(/Path\.Combine\(documentsPath, "(\w+)"\)/g)].map((m) => m[1]))];
  const lsTmp = (ls.match(/tmpPath = Path\.Combine\(path, "(\w+)"\);/) || [])[1];
  const avatars = (ls.match(/avatarsPath = Path\.Combine\(path, "(\w+)", "(\w+)"\);/) || []).slice(1).join('/');
  const queue = coreThere ? (rdCore('Streaming/PendingMessageProcessor.cs').match(/string storagePath = "(\w+)";/) || [])[1] : 'MsgQueue';
  const logSrc = coreThere ? rdCore('Meta/Logging.cs') : '';
  const logName = coreThere ? (logSrc.match(/private static string logfilename = "([^"]+)";/) || [])[1] : 'ixian.log';
  const peerNames = coreThere ? [...rdCore('Peer/PeerStorage.cs').matchAll(/filename = "([^"]+)";/g)].map((m) => m[1]) : ['peers.ixi'];

  const scp = stripCode(rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
  const voice = (scp.match(/return Path\.Combine\(Config\.spixiUserFolder, "(\w+)"\);/) || [])[1];
  const sent = (stripCode(rd('Spixi/Utils/PhotoRules.cs')).match(/public const string SentFolderName = "(\w+)";/) || [])[1];
  const downloads = (stripCode(rd('Spixi/Data/TransferManager.cs')).match(/downloadsPath = Path\.Combine\(Config\.spixiUserFolder, "(\w+)"\);/) || [])[1];
  const los = stripCode(rd('Spixi/Meta/SLocalOnlyStore.cs'));
  const localOnly = (los.match(/public const string FILE_NAME = "([^"]+)";/) || [])[1];
  const localOnlyTmp = /string tmp = p \+ "\.tmp";/.test(los) ? localOnly + '.tmp' : null;
  const tmpZip = (stripCode(rd('Spixi/Pages/Launch/LaunchPage.xaml.cs')).match(/string tmpDirectory = Path\.Combine\(Config\.spixiUserFolder, "(\w+)"\);/) || [])[1];
  const logCopies = [...new Set(['Spixi/Pages/Home/HomePage.xaml.cs', 'Spixi/Pages/Dev/DevPage.xaml.cs']
    .flatMap((f) => [...stripCode(rd(f)).matchAll(/Path\.Combine\(Config\.spixiUserFolder, "([^"]+\.(?:tmp|zip|txt))"\)/g)].map((m) => m[1])))];

  // Replay Logging.cs's roll (sort → delete while ≥ max → shift to .1..n → current to .0) and collect every name it makes.
  const rollNames = new Set([logName]);
  if (logName && maxLogCount > 0) {
    const stem = logName.replace(/\.[^.]+$/, ''), ext = logName.slice(stem.length);
    let files = new Set([logName]);
    for (let roll = 0; roll < maxLogCount + 3; roll++) {
      let rolled = [...files].filter((f) => f.startsWith(stem) && f.endsWith(ext) && f.length >= logName.length + 2).sort();
      while (rolled.length >= maxLogCount) { files.delete(rolled.pop()); }
      for (let i = rolled.length; i > 0; --i) { files.delete(rolled[i - 1]); files.add(stem + '.' + i + ext); }
      files.delete(logName); files.add(stem + '.0' + ext);
      files.add(logName);                                     // the next file opens
      for (const f of files) rollNames.add(f);
    }
  }

  const dirs = [...lsFolders, lsTmp, queue, downloads, voice, sent, tmpZip, ...cfgFolders];
  const fileNames = [...rollNames, ...logCopies, localOnly, localOnlyTmp];
  const sensitive = [
    ...dirs.map((d) => USER + '/' + d + '/x/item.bin'),
    ...dirs.map((d) => USER + '/' + d),
    ...fileNames.map((f) => USER + '/' + f),
    PKG_DATA + '/app_webview/Default/Local Storage/leveldb/000003.log',   // chat drafts (spixi.* keys, plaintext)
  ];
  const kept = [
    USER + '/' + walletFile, USER + '/Acc/1/0.dat', USER + '/' + avatars + '/a.jpg', USER + '/account.ixi', USER + '/avatar.jpg',
    ...peerNames.map((p) => USER + '/' + p), PKG_DATA + '/shared_prefs/com.ixilabs.spixi.dev_preferences.xml',
  ];
  const all = Object.values(lists);
  const key = (r) => r.domain + ':' + r.path;
  const missed = sensitive.filter((p) => !all.every((l) => excluded(l, p))).map((p) => p.slice(PKG_DATA.length));
  const leaked = kept.filter((p) => all.some((l) => excluded(l, p))).map((p) => p.slice(PKG_DATA.length));
  const b = {
    namesRead: !!spixiName && coreThere && lsFolders.includes('Chats') && lsFolders.includes('Downloads') && !!lsTmp && !!queue && !!voice
      && !!sent && !!downloads && !!localOnly && !!localOnlyTmp && !!tmpZip && cfgFolders.length === 4 && logCopies.length >= 3
      && !!walletFile && avatars === 'html/Avatars' && peerNames.length === 2 && maxLogCount > 0 && rollNames.size === maxLogCount + 1,
    logAgrees: LOG_SEEN.startsWith(USER + '/' + queue + '/'),
    matcherReal: !excluded([{ domain: 'file', path: 'Spixi/Chats' }], USER + '/Chats/x') && excluded([{ domain: 'file', path: 'Spixi/Chats' }], FILES + '/Spixi/Chats/x'),
    identical: lists.legacy.length > 0 && lists.legacy.map(key).join('|') === lists.cloud.map(key).join('|') && lists.legacy.map(key).join('|') === lists.transfer.map(key).join('|'),
    allExcluded: missed.length === 0,
    keptBackedUp: leaked.length === 0,
    allUnderUser: lists.legacy.filter((r) => r.domain === 'file').every((r) => r.path.startsWith('Documents/' + spixiName + '/')),
  };
  ok(Object.values(b).every((x) => x === true),
    '★ S14 (#1281): the Android backup rules, applied to the RUNTIME paths (Personal = files/Documents → ' + USER.slice(PKG_DATA.length) + '), exclude every folder/file the C# creates for chat, queue, downloads, voice, sent, tmp, headers, activity, the rotated logs (replayed: ' + [...rollNames].join(',') + ') and their share copies, localonly.json(.tmp) and the WebView storage, in all three identical lists; the wallet, Acc, avatars, peers and preferences stay backed up — ' + JSON.stringify(b) + ' missed=' + JSON.stringify(missed) + ' leaked=' + JSON.stringify(leaked));

  /* ———— #1280 back ———— */
  const MA = stripCode(rd('Spixi/Platforms/Android/MainActivity.cs'));
  const bodyOf = (src, sig) => { const i = src.indexOf(sig); if (i < 0) return ''; let d = 0; for (let k = src.indexOf('{', i); k >= 0 && k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) return src.slice(i, k + 1); } return ''; };
  const cls = bodyOf(MA, 'private sealed class SpixiBackCallback : AndroidX.Activity.OnBackPressedCallback');
  const handle = bodyOf(cls, 'public override void HandleOnBackPressed()');
  const onCreate = bodyOf(MA, 'protected override void OnCreate(Bundle? bundle)');
  const legacy = bodyOf(MA, 'public override void OnBackPressed()');
  const logM = handle.match(/SPIXI\.P1Perf\.line\("([^"]*)" \+ route\);/);
  const routes = [...handle.matchAll(/\broute = "([^"]*)";/g)].map((m) => m[1]);
  const P1_TOKEN = /^[a-z0-9_.=-]{1,40}$/;                    // P1Perf.cs grammar
  const logLine = (w) => (logM[1] + w).split(' ');
  /* #46 fix r1 (R3 MINOR-1): the preprocessor regions open at a position (stack of the #if conditions) — the AddCallback
     must sit in none, or only in `#if ANDROID` regions (an #else / #elif branch counts as a region of its own). */
  const regionsAt = (src, pos) => {
    const st = [];
    for (const m of src.slice(0, pos).matchAll(/^[ \t]*#(if|elif|else|endif)\b(.*)$/gm)) {
      if (m[1] === 'if') st.push(m[2].trim());
      else if (m[1] === 'endif') st.pop();
      else { st.pop(); st.push('#' + m[1] + ' ' + m[2].trim()); }
    }
    return st;
  };
  const addAt = MA.indexOf('OnBackPressedDispatcher.AddCallback(');
  const csproj = rd('Spixi/Spixi.csproj');
  const tsdk = csproj.match(/<!--((?:(?!-->)[\s\S])*)-->\s*<TargetSdkVersion>(\d+)<\/TargetSdkVersion>/);
  const k = {
    alwaysEnabled: /public SpixiBackCallback\(MainActivity a\) : base\(true\)/.test(cls),
    addedAfterMaui: onCreate.indexOf('OnBackPressedDispatcher.AddCallback(this, new SpixiBackCallback(this));') > onCreate.indexOf('base.OnCreate(bundle);')
      && onCreate.indexOf('base.OnCreate(bundle);') > 0 && (MA.match(/\.AddCallback\(/g) || []).length === 1,
    /* #46 fix r1 (R3 MINOR-1): never compiled out, never disabled / removed from outside; the ONE Enabled pair is the
       framework-default bracket inside the callback (below) */
    notInIf: addAt > 0 && regionsAt(MA, addAt).every((c) => c === 'ANDROID'),
    neverOff: !/backCallback/.test(MA) && !/\.Remove\(\s*\)/.test(MA) && (MA.match(/\bEnabled\s*=/g) || []).length === 2,
    mauiPipeline: /var life = IPlatformApplication\.Current\?\.Services\?\.GetService\(typeof\(Microsoft\.Maui\.LifecycleEvents\.ILifecycleEventService\)\)\s*as Microsoft\.Maui\.LifecycleEvents\.ILifecycleEventService;/.test(handle)
      && /LifecycleEventServiceExtensions\.InvokeEvents<Microsoft\.Maui\.LifecycleEvents\.AndroidLifecycle\.OnBackPressed>\(\s*life, nameof\(Microsoft\.Maui\.LifecycleEvents\.AndroidLifecycle\.OnBackPressed\), del => handled = del\(activity\) \|\| handled\);/.test(handle),
    elseBackground: /if \(!handled\)\s*\{\s*route = "background";\s*if \(!activity\.MoveTaskToBack\(true\)\)\s*\{/.test(handle),
    /* #46 fix r1 (R1 NIT-5): a refused MoveTaskToBack → the framework default (one dispatch with this callback aside) */
    refusedDefault: /if \(!activity\.MoveTaskToBack\(true\)\)\s*\{\s*route = "default";\s*Enabled = false;\s*try\s*\{\s*activity\.OnBackPressedDispatcher\.OnBackPressed\(\);\s*\}\s*finally\s*\{\s*Enabled = true;\s*\}\s*\}/.test(handle),
    neverFinish: !/\bFinish(?:Affinity|AndRemoveTask)?\(\)/.test(MA),
    guard: /if \(running\)\s*\{\s*return;\s*\}\s*running = true;\s*try/.test(handle) && /finally\s*\{\s*running = false;\s*\}/.test(handle),
    legacyOnce: /^public override void OnBackPressed\(\)\s*(?:#pragma warning restore 809\s*)?\{\s*OnBackPressedDispatcher\.OnBackPressed\(\);\s*\}$/.test(legacy) && !/base\.OnBackPressed\(\)/.test(MA),
    logGrammar: !!logM && routes.join() === 'handled,background,default' && /string route = "handled";/.test(handle)
      && routes.every((w) => logLine(w).every((t) => P1_TOKEN.test(t))) && /if \(SPIXI\.P1Perf\.enabled\)/.test(handle),
    csprojIgnored: !!tsdk && tsdk[2] === '35' && /IGNORED/.test(tsdk[1]) && /36/.test(tsdk[1]),
  };
  ok(Object.values(k).every((x) => x === true),
    '★ S14 (#1280): Android back has ONE path — an always-enabled AndroidX callback added after MAUI\'s runs MAUI\'s AndroidLifecycle.OnBackPressed delegates (public ILifecycleEventService.InvokeEvents), backgrounds when none handled it (never Finish), guards re-entry, a refused MoveTaskToBack falls to the framework default (never a no-op), the callback is never compiled out / disabled / removed, logs [P1] back route=handled|background|default; the legacy OnBackPressed goes to the dispatcher only; the csproj says TargetSdkVersion 35 is ignored (36) — ' + JSON.stringify(k));
}
