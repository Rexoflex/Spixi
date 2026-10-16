/* ==== Session Safety lane B — S-4 (H-10, P34): the Android share folders. NO runtime flag (a resource read at first use).
 *
 * The pure rule (SafetyRules.shareStagePath) is EXECUTED in the C# harness (scripts/csh/SafetyRulesTests.cs). This module:
 *   provider — provider_paths.xml publishes EXACTLY files Documents/Spixi/Downloads/ · files Documents/Spixi/Sent/ · their
 *              files Spixi/… twins · cache share/ · cache . (no external-*, no files-path "."). ★ #46 r1 (R3 M-1): on .NET 10
 *              Android SpecialFolder.Personal = getFilesDir()/Documents (S14 #1281) — r0 published Spixi/Downloads/ only, a
 *              folder that does not exist. The folder names are DERIVED from the C# (Config.spixiUserFolder,
 *              TransferManager.downloadsPath, PhotoRules.SentFolderName, SafetyRules.ShareFolderName) and the Personal
 *              leaf is the S14 runtime fact, cross-checked against backup_rules.xml (every file rule starts
 *              "Documents/Spixi/") and pins-s14/a1-backup-back.mjs (PERSONAL = FILES + '/Documents'), so none can drift;
 *              the roots are EXECUTED through a model of FileProvider's root match over the real runtime paths;
 *   share    — share() calls shareFile with no swallowing try; BackupPage awaits shareBackup and then recordBackupIfSaved
 *              inside its try (a staging failure skips the stamp); shareFile stages first, then the stamp, then ONE try
 *              that holds the intent build, GetUriForFile and StartActivity and clears the stamp on any throw (R3 n-1);
 *              stageForShare prunes, then makes share/<random>/, copies the leaf there, returns the copy (R3 m-1);
 *   prune    — only entries of share/ older than ShareKeepMinutes (60) go, each delete in its own try; once per process
 *              at start from MainActivity.OnCreate; never the folder just created (the prune runs before it exists);
 *   logs     — fixed words + the exception TYPE only; open() never stages; saveFile never touches the provider.
 * Deliberate breaks: see the lane B fix-round report (each key failed for its own reason, then restored). */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8');
  const rd = (f) => stripCode(raw(f));
  const blockFrom = (t, at) => {
    if (at < 0) return '';
    const o = t.indexOf('{', at); if (o < 0) return '';
    let d = 0;
    for (let k = o; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return t.slice(o, k + 1); }
    return '';
  };
  const body = (t, sig) => blockFrom(t, t.indexOf(sig));
  const order = (t, ...parts) => { let at = -1; for (const p of parts) { const i = t.indexOf(p, at + 1); if (i < 0 || i <= at) return false; at = i; } return true; };
  const count = (t, re) => (t.match(re) || []).length;
  const bad = (o) => Object.keys(o).filter((k) => o[k] !== true);

  /* ── provider: the exact roots, derived from the C# names + the S14 runtime fact ── */
  const XML_RAW = raw('Spixi/Platforms/Android/Resources/xml/provider_paths.xml');
  const XML = stripCode(XML_RAW);
  const roots = [...XML.matchAll(/<([a-z-]+)\s+name="([^"]*)"\s+path="([^"]*)"\s*\/>/g)].map((m) => ({ tag: m[1], name: m[2], path: m[3] }));
  const tags = [...XML.matchAll(/<([a-z][a-z-]*)\b/g)].map((m) => m[1]).filter((t) => t !== 'paths');
  const CONFIG = rd('Spixi/Meta/Config.cs');
  const TM = rd('Spixi/Data/TransferManager.cs');
  const PR = rd('Spixi/Utils/PhotoRules.cs');
  const SR = rd('Spixi/Utils/SafetyRules.cs');
  const userLeaf = (CONFIG.match(/public static string spixiUserFolder = Path\.Combine\(System\.Environment\.GetFolderPath\(System\.Environment\.SpecialFolder\.Personal\), "([^"]+)"\);/) || [])[1];
  const dlLeaf = (TM.match(/downloadsPath = Path\.Combine\(Config\.spixiUserFolder, "([^"]+)"\);/) || [])[1];
  const sentLeaf = (PR.match(/public const string SentFolderName = "([^"]+)";/) || [])[1];
  const shareLeaf = (SR.match(/public const string ShareFolderName = "([^"]+)";/) || [])[1];
  /* the S14 (#1281) runtime fact: SpecialFolder.Personal = getFilesDir()/Documents on .NET 10 Android (a device log, not a
     source string) — this module's ONE copy of it, cross-checked below against the two places that already rely on it */
  const PERSONAL_LEAF = 'Documents';
  const BR = stripCode(raw('Spixi/Platforms/Android/Resources/xml/backup_rules.xml'));
  const brFile = [...BR.matchAll(/<exclude domain="file" path="([^"]+)"\s*\/>/g)].map((m) => m[1]);
  const S14 = raw('scripts/pins-s14/a1-backup-back.mjs');
  const drift = {
    backupPrefix: brFile.length >= 5 && brFile.every((p) => p.startsWith(PERSONAL_LEAF + '/' + userLeaf + '/'))
      && brFile.includes(PERSONAL_LEAF + '/' + userLeaf + '/' + dlLeaf) && brFile.includes(PERSONAL_LEAF + '/' + userLeaf + '/' + sentLeaf),
    s14Personal: S14.includes("const PERSONAL = FILES + '/" + PERSONAL_LEAF + "';"),
  };
  const P = PERSONAL_LEAF + '/' + userLeaf + '/';
  const want = [
    { tag: 'files-path', name: 'downloads', path: P + dlLeaf + '/' },
    { tag: 'files-path', name: 'sent', path: P + sentLeaf + '/' },
    { tag: 'files-path', name: 'downloads_files', path: userLeaf + '/' + dlLeaf + '/' },
    { tag: 'files-path', name: 'sent_files', path: userLeaf + '/' + sentLeaf + '/' },
    { tag: 'cache-path', name: 'share', path: shareLeaf + '/' },
    { tag: 'cache-path', name: 'cache', path: '.' },
  ];
  const prov = {
    namesFound: !!(userLeaf && dlLeaf && sentLeaf && shareLeaf),
    ...drift,
    exactRoots: roots.length === want.length && tags.length === want.length
      && want.every((w) => roots.some((r) => r.tag === w.tag && r.name === w.name && r.path === w.path)),
    uniqueNames: new Set(roots.map((r) => r.name)).size === roots.length,
    noExternal: !/external-/.test(XML),
    noFilesDot: !roots.some((r) => r.tag !== 'cache-path' && (r.path === '.' || r.path === '' || r.path === './' || r.path === '/')),
    bom: XML_RAW.charCodeAt(0) === 0xfeff,
    manifest: /android:authorities="\$\{applicationId\}\.provider"[\s\S]{0,300}android:resource="@xml\/provider_paths"/.test(rd('Spixi/Platforms/Android/AndroidManifest.xml')),
  };
  ok(Object.values(prov).every((x) => x === true),
    '★ Session Safety S-4 (P34) + #46 r1 (R3 M-1): provider_paths.xml publishes EXACTLY files ' + P + dlLeaf + '/ · files ' + P + sentLeaf + '/ (Personal = files/' + PERSONAL_LEAF + ', the S14 #1281 fact, the same prefix as every backup_rules.xml file rule and the S14 pin) · their files ' + userLeaf + '/… twins · cache ' + shareLeaf + '/ · cache . — distinct names, no external-* root, no files-path "." — failing: ' + JSON.stringify(bad(prov)));

  /* ── provider, EXECUTED: FileProvider's SimplePathStrategy picks the most specific root whose canonical path prefixes
     the file's canonical path; no root → IllegalArgumentException. Modelled over the real roots and the RUNTIME paths. ── */
  const FILES = '/data/user/0/com.ixilabs.spixi/files', CACHE = '/data/user/0/com.ixilabs.spixi/cache';
  const PERSONAL = FILES + '/' + PERSONAL_LEAF;                 // .NET 10 Android (S14 #1281)
  const norm = (p) => { const out = []; for (const s of p.split('/')) { if (s === '' || s === '.') continue; if (s === '..') out.pop(); else out.push(s); } return '/' + out.join('/'); };
  const base = { 'files-path': FILES, 'cache-path': CACHE };
  const resolved = roots.filter((r) => base[r.tag]).map((r) => ({ name: r.name, dir: norm(base[r.tag] + '/' + r.path) }));
  const unknownTag = roots.some((r) => !base[r.tag]);   // an external-* root is not modelled: it fails `noExternal` above
  const grant = (p) => {
    const c = norm(p); let best = null;
    for (const r of resolved) { if ((c === r.dir || c.startsWith(r.dir === '/' ? '/' : r.dir + '/')) && (!best || r.dir.length > best.dir.length)) best = r; }
    return best ? best.name : null;
  };
  const U = PERSONAL + '/' + userLeaf;                           // Config.spixiUserFolder at runtime
  const UF = FILES + '/' + userLeaf;                             // the same on a runtime where Personal = files
  const SLOT = CACHE + '/' + shareLeaf + '/0123456789abcdef0123456789abcdef';
  const model = {
    modelled: !unknownTag && resolved.length === want.length,
    walletSourceRefused: grant(U + '/wallet.ixi') === null && grant(UF + '/wallet.ixi') === null,
    accountSourceRefused: grant(U + '/spixi.account.backup.ixi') === null,
    logSourceRefused: grant(U + '/spixi.log.zip') === null,
    accFolderRefused: grant(U + '/Acc/x.ixi') === null && grant(U + '/AppsStorage/a/main') === null && grant(PERSONAL + '/other') === null && grant(FILES + '/other') === null,
    dotDotRefused: grant(U + '/' + dlLeaf + '/../wallet.ixi') === null,
    walletStagedGranted: grant(SLOT + '/wallet.ixi') === 'share',
    accountStagedGranted: grant(SLOT + '/spixi.account.backup.ixi') === 'share',
    logStagedGranted: grant(SLOT + '/spixi.log.zip') === 'share',
    downloadsGranted: grant(U + '/' + dlLeaf + '/photo.jpg') === 'downloads',
    sentGranted: grant(U + '/' + sentLeaf + '/0123abcd.pdf') === 'sent',
    twinsGranted: grant(UF + '/' + dlLeaf + '/photo.jpg') === 'downloads_files' && grant(UF + '/' + sentLeaf + '/0123abcd.pdf') === 'sent_files',
    pickerCopyGranted: grant(CACHE + '/2203693cc04e0be7f4f024d5f9499e13/doc.pdf') === 'cache',
    externalRefused: grant('/storage/emulated/0/Download/x.pdf') === null,
  };
  ok(Object.values(model).every((x) => x === true),
    '★ Session Safety S-4 (P34) + #46 r1, EXECUTED: over a model of FileProvider\'s root match at the RUNTIME paths (spixiUserFolder = files/' + PERSONAL_LEAF + '/' + userLeaf + '), the wallet, the account backup and the log zip are NOT grantable at their source (nor Acc/, AppsStorage/, a `..` out of Downloads, external storage); their staged copies in cache/' + shareLeaf + '/<random>/ are, and so are Downloads and Sent (under Documents, and their files/' + userLeaf + ' twins) and a MAUI picker copy in the cache root — failing: ' + JSON.stringify(bad(model)));

  /* ── share: no swallowing, stage before stamp before grant, one try around the grant ── */
  const SFO = rd('Spixi/Platforms/Android/SFileOperations.cs');
  const shareAsync = body(SFO, 'public static async Task<bool> share(string filepath, string title)');
  const shareFile = body(SFO, 'public static void shareFile(string filepath, string title)');
  const sfTry = blockFrom(shareFile, shareFile.indexOf('try'));
  const sfAfterTry = shareFile.slice(shareFile.indexOf(sfTry) + sfTry.length);
  const BP = rd('Spixi/Pages/Settings/BackupPage.xaml.cs');
  const awaitedInTry = (sig) => {
    const m = body(BP, sig);
    const t = blockFrom(m, m.indexOf('try'));
    return /^\{\s*try\s*\{/.test(m) && /bool\? outcome = await shareBackup\([^;]*\);\s*await recordBackupIfSaved\(outcome\);/.test(t)
      && /^\s*catch \(Exception ex\)/.test(m.slice(m.indexOf(t) + t.length)) && count(m, /\btry\b/g) === 1;
  };
  const share = {
    found: shareAsync.length > 0 && shareFile.length > 0 && sfTry.length > 0,
    noSwallow: /shareFile\(filepath, title\);\s*return true;/.test(shareAsync) && !/\btry\b|\bcatch\b/.test(shareAsync),
    backupAwaits: awaitedInTry('public static async Task backupWallet()') && awaitedInTry('public static async Task<bool> backupAccount()')
      && /#elif ANDROID\s*return await SFileOperations\.share\(path, title\);/.test(body(BP, 'private static async Task<bool?> shareBackup(string path, string title)'))
      && !/\btry\b/.test(body(BP, 'private static async Task<bool?> shareBackup(string path, string title)')),
    stageFirst: /^\{\s*var context = MainActivity\.Instance;\s*string staged = stageForShare\(context, filepath\);\s*App\.noteOwnIntentRoundTrip\(\);\s*try\s*\{/.test(shareFile),
    grantInTry: order(sfTry, 'File file = new File(staged);', 'new Intent();', 'FileProvider.GetUriForFile(context, context.PackageName + ".provider", file);',
      'Intent.CreateChooser(shareIntent, title ?? string.Empty);', 'context.StartActivity(chooserIntent);')
      && /^\s*catch \(Exception\)\s*\{\s*App\.clearOwnIntentStamp\(\);\s*throw;\s*\}\s*\}$/.test(sfAfterTry),
    neverSource: !/new File\(filepath\)/.test(shareFile) && count(shareFile, /new File\(/g) === 1 && count(shareFile, /stageForShare\(/g) === 1,
    /* #734 + the OS-open census stay as they were */
    twoGrants: count(SFO, /GetUriForFile\(context, context\.PackageName \+ "\.provider"/g) === 2 && count(SFO, /Intent\.ActionView/g) === 1,
  };
  ok(Object.values(share).every((x) => x === true),
    '★ Session Safety S-4 (P34) + #46 r1 (R3 m-4, n-1): share() calls shareFile with no swallowing try and BackupPage awaits shareBackup then recordBackupIfSaved inside its try (a staging failure never stamps the backup); shareFile stages BEFORE the own-intent stamp, and ONE try holds new File(staged), the intent, GetUriForFile and StartActivity, clearing the stamp on any throw; the source is never granted — failing: ' + JSON.stringify(bad(share)));

  /* ── staging + prune ── */
  const stage = body(SFO, 'private static string stageForShare(Context? context, string filepath)');
  const stageTry = blockFrom(stage, stage.indexOf('try'));
  const stageCatch = body(stage, 'catch (Exception e)');
  const dirFn = body(SFO, 'private static string? shareDir(Context? context)');
  const prune = body(SFO, 'private static void pruneShareFolder(string dir)');
  const expired = body(SFO, 'private static bool shareEntryExpired(DateTime lastWriteUtc, DateTime nowUtc)');
  const st = {
    found: stage.length > 0 && dirFn.length > 0 && prune.length > 0 && expired.length > 0,
    stageOrder: order(stageTry, 'string? dir = shareDir(context);', 'SPIXI.SafetyRules.shareStagePath(context?.CacheDir?.AbsolutePath, filepath);',
      'string leaf = Path.GetFileName(flat) ?? "";', 'if (dir == null || flat == null || leaf.Length == 0)', 'throw new System.IO.DirectoryNotFoundException();',
      'if (SPIXI.SafetyRules.isInside(dir, filepath))', 'return filepath;',
      'pruneShareFolder(dir);', 'string slot = Path.Combine(dir, Guid.NewGuid().ToString("N"));', 'string staged = Path.Combine(slot, leaf);',
      'System.IO.Directory.CreateDirectory(slot);', 'System.IO.File.Copy(filepath, staged, false);', 'return staged;'),
    /* the prune runs BEFORE the new folder exists (never the folder just created), and staging deletes nothing itself */
    pruneBeforeSlot: stageTry.indexOf('pruneShareFolder(dir);') >= 0 && stageTry.indexOf('pruneShareFolder(dir);') < stageTry.indexOf('System.IO.Directory.CreateDirectory(slot);')
      && count(stage, /pruneShareFolder\(/g) === 1 && !/\.Delete\(/.test(stage),
    stageFails: /^\{\s*Logging\.error\("Share: staging failed \(" \+ e\.GetType\(\)\.Name \+ "\)"\);\s*throw new System\.IO\.IOException\(StageFailed\);\s*\}$/.test(stageCatch)
      && /private const string StageFailed = "Share: the file could not be staged";/.test(SFO) && !/throw;/.test(stage),
    cacheDir: /string\? cache = context\?\.CacheDir\?\.AbsolutePath;\s*return string\.IsNullOrEmpty\(cache\) \? null : Path\.Combine\(cache, SPIXI\.SafetyRules\.ShareFolderName\);/.test(dirFn)
      && /catch \(Exception\)\s*\{\s*return null;\s*\}/.test(dirFn),
    hourRule: /private const int ShareKeepMinutes = 60;/.test(SFO) && /^\{\s*return nowUtc - lastWriteUtc > TimeSpan\.FromMinutes\(ShareKeepMinutes\);\s*\}$/.test(expired),
    pruneOldOnly: /foreach \(string d in folders\)\s*\{\s*try\s*\{\s*if \(SPIXI\.SafetyRules\.isInside\(dir, d\) && shareEntryExpired\(System\.IO\.Directory\.GetLastWriteTimeUtc\(d\), now\)\)\s*\{\s*System\.IO\.Directory\.Delete\(d, true\);\s*\}\s*\}\s*catch \(Exception e\)\s*\{\s*Logging\.warn\("Share folder: a folder could not be deleted \(" \+ e\.GetType\(\)\.Name \+ "\)"\);\s*\}\s*\}/.test(prune)
      && /foreach \(string f in files\)\s*\{\s*try\s*\{\s*if \(shareEntryExpired\(System\.IO\.File\.GetLastWriteTimeUtc\(f\), now\)\)\s*\{\s*System\.IO\.File\.Delete\(f\);\s*\}\s*\}\s*catch \(Exception e\)\s*\{\s*Logging\.warn\("Share folder: a file could not be deleted \(" \+ e\.GetType\(\)\.Name \+ "\)"\);\s*\}\s*\}/.test(prune)
      && /folders = System\.IO\.Directory\.GetDirectories\(dir\);\s*files = System\.IO\.Directory\.GetFiles\(dir\);/.test(prune)
      && /if \(!System\.IO\.Directory\.Exists\(dir\)\)\s*\{\s*return;\s*\}/.test(prune)
      /* the only deletes in the file are these two, both behind the age test */
      && count(SFO, /\.Delete\(/g) === 2 && !/SearchOption\.AllDirectories|EnumerateFileSystemEntries/.test(SFO),
  };
  ok(Object.values(st).every((x) => x === true),
    '★ Session Safety S-4 (P34) + #46 r1 (R3 m-1): stageForShare prunes share/, THEN makes share/<random>/ and copies the source\'s leaf there (the receiver\'s file name), returns the copy, deletes nothing itself; the prune removes only share/ entries older than 60 min (folders inside share/, stray files), each delete in its own try; a staging failure logs the TYPE and throws a fixed-word IOException — failing: ' + JSON.stringify(bad(st)));

  /* ── the start sweep ── */
  const sweep = body(SFO, 'public static void sweepShareFolder(Context? context)');
  const MA = rd('Spixi/Platforms/Android/MainActivity.cs');
  const onCreate = body(MA, 'protected override void OnCreate(Bundle? bundle)');
  const callAt = MA.indexOf('SFileOperations.sweepShareFolder(this);');
  const ifsBefore = [...MA.slice(0, Math.max(0, callAt)).matchAll(/^[ \t]*#(if|endif)\b/gm)].reduce((d, m) => d + (m[1] === 'if' ? 1 : -1), 0);
  const sw = {
    found: sweep.length > 0 && onCreate.length > 0,
    oncePerProcess: /^\{\s*if \(shareSweepDone\)\s*\{\s*return;\s*\}\s*shareSweepDone = true;\s*try\s*\{\s*string\? dir = shareDir\(context\);\s*if \(dir != null\)\s*\{\s*pruneShareFolder\(dir\);\s*\}\s*\}\s*catch \(Exception e\)\s*\{\s*Logging\.warn\("Share folder: the start sweep failed \(" \+ e\.GetType\(\)\.Name \+ "\)"\);\s*\}\s*\}$/.test(sweep)
      && count(SFO, /shareSweepDone = true;/g) === 1,
    fromOnCreate: count(MA, /SFileOperations\.sweepShareFolder\(/g) === 1 && order(onCreate, 'base.OnCreate(bundle);', 'SFileOperations.sweepShareFolder(this);') && ifsBefore === 0,
  };
  ok(Object.values(sw).every((x) => x === true),
    '★ Session Safety S-4 (P34): sweepShareFolder prunes share/ ONCE per process and never throws; MainActivity.OnCreate calls it once, after base.OnCreate, outside any #if — failing: ' + JSON.stringify(bad(sw)));

  /* ── logs, open, save ── */
  const open = body(SFO, 'public static void open(string file_path)');
  const save = body(SFO, 'public static void saveFile(string filepath, string title, string mimeType = "application/octet-stream")');
  const logs = [...SFO.matchAll(/Logging\.(?:error|warn|info)\(([^;]*)\);/g)].map((m) => m[1]);
  const lg = {
    openTypeOnly: /catch \(Exception e\)\s*\{\s*Logging\.error\("Exception occured while trying to open file \(" \+ e\.GetType\(\)\.Name \+ "\)"\);\s*\}/.test(open),
    openNeverStages: open.length > 0 && !/stageForShare|pruneShareFolder|shareDir|Guid/.test(open),
    noRawException: !/\+ e\)|\+ e;|e\.Message|e\.ToString\(\)|ex\.Message/.test(SFO),
    /* every log line in the file = string literals + e.GetType().Name only (no path, no name) */
    fixedWords: logs.length === 6 && logs.every((a) => a.replace(/"(?:[^"\\]|\\.)*"/g, '').replace(/e\.GetType\(\)\.Name/g, '').replace(/[\s+]/g, '') === ''),
    saveNoProvider: save.length > 0 && !/FileProvider|GetUriForFile|stageForShare/.test(save) && /new Intent\(Intent\.ActionCreateDocument\)/.test(save),
  };
  ok(Object.values(lg).every((x) => x === true),
    '★ Session Safety S-4 (P34) + #46 r1 (R3 n-5): Android SFileOperations logs fixed words + the exception TYPE only (open() used to log `e`, which held the path); open() never stages a copy; saveFile (ACTION_CREATE_DOCUMENT + MainActivity\'s copy) never touches the provider — failing: ' + JSON.stringify(bad(lg)));
}
